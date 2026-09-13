/* =========================================================
   store.js — estado, persistencia y cálculos derivados
   Expone: window.BM.store
   Guarda siempre en localStorage (abre al instante y anda sin conexión).
   Con sesión iniciada, además sincroniza con Firestore vía BM.nube:
   cada usuario tiene su propia cache local, y los cambios hechos sin
   conexión quedan marcados como pendientes hasta que se suben.
   ========================================================= */
(function (global) {
  "use strict";

  var BM = global.BM;
  var U = BM.utils;
  var KEY = "balance-mensual:v1";

  var state = null;
  var listeners = [];
  var saveTimer = null;

  /* ---------------- persistencia ---------------- */

  /* Completa lo que les falta a datos guardados con versiones anteriores de la app */
  function normalizar(st) {
    st.config = st.config || {};
    /* personas: antes era {p1,p2}; ahora es una lista, así se puede agregar más de dos.
       Los ids "p1"/"p2" se mantienen para que las filas de tarjeta guardadas sigan sirviendo. */
    if (!Array.isArray(st.config.personas)) {
      var p = st.config.personas || { p1: "Persona 1", p2: "Persona 2" };
      st.config.personas = [{ id: "p1", nombre: p.p1 || "Persona 1" }];
      if (p.p2) st.config.personas.push({ id: "p2", nombre: p.p2 });
    }
    if (!st.config.personas.length) st.config.personas = [{ id: "p1", nombre: "Vos" }];
    if (st.config.viviendaTipo !== "hipotecario") st.config.viviendaTipo = "alquiler";
    if (!Array.isArray(st.config.presupuesto)) {
      st.config.presupuesto = JSON.parse(JSON.stringify(BM.seed.config.presupuesto));
    }
    if (!Array.isArray(st.config.tarjetas) || !st.config.tarjetas.length) {
      st.config.tarjetas = [{ id: "visa", nombre: "Visa" }];
    }
    var primeraTarjeta = st.config.tarjetas[0].id;
    Object.keys(st.meses).forEach(function (id) {
      var mes = st.meses[id];
      ["ingresos", "ahorros", "inversiones", "proyectos", "gastosFijos", "gastosVariables",
       "tarjetaPesos", "tarjetaDolares", "tarjetasTerceros", "alquiler"].forEach(function (lista) {
        if (!Array.isArray(mes[lista])) mes[lista] = [];
      });
      mes.tarjetaPesos.concat(mes.tarjetaDolares).forEach(function (row) {
        if (!row.tarjeta) row.tarjeta = primeraTarjeta;
      });
      mes.ahorros.concat(mes.inversiones).forEach(function (row) {
        if (!row.moneda) row.moneda = "ARS";
      });
      /* categoría de presupuesto (fijo/disfrute) por fila, en toda tabla de gastos.
         Migración: lo que ya vivía en "gastos fijos" arranca como fijo; el resto
         (variables, tarjetas, terceros) arranca como disfrute, que es como contaba
         antes de que existiera esta marca. */
      mes.gastosFijos.forEach(function (row) { if (row.disfrute === undefined) row.disfrute = false; });
      mes.gastosVariables.concat(mes.tarjetaPesos, mes.tarjetaDolares, mes.tarjetasTerceros).forEach(function (row) {
        if (row.disfrute === undefined) row.disfrute = true;
      });
      if (typeof mes.ahorroAnterior !== "number") mes.ahorroAnterior = 0;
      if (typeof mes.inversionAnterior !== "number") mes.inversionAnterior = 0;
      if (mes.ahorroAnteriorMoneda !== "USD") mes.ahorroAnteriorMoneda = "ARS";
      if (mes.inversionAnteriorMoneda !== "USD") mes.inversionAnteriorMoneda = "ARS";
    });
    if (!st.meses[st.mesActivo]) st.mesActivo = Object.keys(st.meses).sort().pop();
    return st;
  }

  var uid = null;              /* con sesión: la cache y la nube son de este usuario */
  var syncTimer = null;
  var cambiosSinSubir = 0;      /* cuántas ediciones hubo desde la última subida exitosa */
  var estadoSync = "local";     /* local | guardando | guardado | sin-conexion | error */
  var errorSync = "";

  function clave(sufijo) { return KEY + (uid ? ":" + uid : "") + (sufijo || ""); }
  function leer(k) { try { return global.localStorage.getItem(k); } catch (e) { return null; } }
  function escribir(k, v) {
    try { if (v === null) global.localStorage.removeItem(k); else global.localStorage.setItem(k, v); } catch (e) { /* modo privado, sin espacio */ }
  }

  function desdeCache() {
    var raw = leer(clave());
    if (raw) {
      try {
        var parsed = JSON.parse(raw);
        if (parsed && parsed.meses) return normalizar(parsed);
      } catch (e) { /* datos corruptos */ }
    }
    return null;
  }

  /* Sin login: datos de este dispositivo, o los de ejemplo la primera vez */
  function load() {
    uid = null;
    state = desdeCache() || normalizar(JSON.parse(JSON.stringify(BM.seed)));
    return state;
  }

  /* Con login: la cache de ese usuario, o un estado vacío si es la primera vez en este dispositivo */
  function abrirUsuario(nuevoUid) {
    uid = nuevoUid;
    escribir(KEY + ":ultimo-uid", uid);
    state = desdeCache() || normalizar(BM.estadoVacio());
    cambiosSinSubir = leer(clave(":pendiente")) ? 1 : 0;
    setSync(cambiosSinSubir ? "sin-conexion" : "guardando");
    return state;
  }

  function cerrarUsuario() {
    uid = null;
    clearTimeout(syncTimer);
    setSync("local");
  }

  function setSync(nuevo, detalle) {
    estadoSync = nuevo;
    errorSync = detalle || "";
    if (BM.alCambiarSync) BM.alCambiarSync(estadoSync, errorSync);
  }
  function getSync() { return { estado: estadoSync, error: errorSync, pendiente: cambiosSinSubir > 0 }; }

  function subir() {
    if (!uid || !BM.nube || !BM.nube.usuario) return Promise.resolve();
    if (global.navigator && global.navigator.onLine === false) { setSync("sin-conexion"); return Promise.resolve(); }
    var hasta = cambiosSinSubir;
    setSync("guardando");
    return BM.nube.subir(state).then(function () {
      cambiosSinSubir -= hasta;
      if (cambiosSinSubir <= 0) { cambiosSinSubir = 0; escribir(clave(":pendiente"), null); }
      setSync("guardado");
    }, function (err) {
      var offline = global.navigator && global.navigator.onLine === false;
      setSync(offline ? "sin-conexion" : "error", err && err.message);
    });
  }

  /* Al abrir la app o volver a ella. Si hay cambios locales sin subir, ganan ellos;
     si no, manda lo que está en la nube. Devuelve true si cambiaron los datos en pantalla. */
  function sincronizar() {
    if (!uid || !BM.nube || !BM.nube.usuario) return Promise.resolve(false);
    if (cambiosSinSubir > 0) return subir().then(function () { return false; });
    setSync("guardando");
    return BM.nube.bajar().then(function (remoto) {
      if (!remoto) {
        /* primera vez de esta cuenta: lo que haya en este dispositivo pasa a la nube */
        cambiosSinSubir = 1;
        return subir().then(function () { return false; });
      }
      remoto.mesActivo = state.mesActivo;
      remoto = normalizar(remoto);
      var antes = JSON.stringify({ c: state.config, m: state.meses });
      var despues = JSON.stringify({ c: remoto.config, m: remoto.meses });
      setSync("guardado");
      if (antes === despues) return false;
      state = remoto;
      escribir(clave(), JSON.stringify(state));
      return true;
    }, function (err) {
      var offline = global.navigator && global.navigator.onLine === false;
      setSync(offline ? "sin-conexion" : "error", err && err.message);
      return false;
    });
  }

  function persist() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(function () { escribir(clave(), JSON.stringify(state)); }, 250);
    if (uid) {
      cambiosSinSubir++;
      escribir(clave(":pendiente"), "1");
      clearTimeout(syncTimer);
      syncTimer = setTimeout(subir, 1200);
    }
  }

  function emit() {
    persist();
    listeners.forEach(function (fn) { fn(state); });
  }

  function subscribe(fn) { listeners.push(fn); }

  /* ---------------- accesos ---------------- */

  function getState() { return state; }
  function mesActual() { return state.meses[state.mesActivo]; }
  function personas() { return state.config.personas; }

  function mesesOrdenados() {
    return Object.keys(state.meses).sort();
  }

  function setMesActivo(id) {
    if (state.meses[id]) { state.mesActivo = id; emit(); }
  }

  function setDolar(valor) {
    mesActual().dolar = valor || 0;
    emit();
  }

  function setBalanceAnterior(valor) {
    mesActual().balanceAnterior = valor || 0;
    emit();
  }

  function setAhorroAnterior(valor) {
    mesActual().ahorroAnterior = valor || 0;
    emit();
  }

  function setInversionAnterior(valor) {
    mesActual().inversionAnterior = valor || 0;
    emit();
  }

  function setAhorroAnteriorMoneda(moneda) {
    mesActual().ahorroAnteriorMoneda = moneda === "USD" ? "USD" : "ARS";
    emit();
  }

  function setInversionAnteriorMoneda(moneda) {
    mesActual().inversionAnteriorMoneda = moneda === "USD" ? "USD" : "ARS";
    emit();
  }

  function setViviendaTipo(tipo) {
    state.config.viviendaTipo = tipo === "hipotecario" ? "hipotecario" : "alquiler";
    emit();
  }

  /* ---------------- CRUD de filas ----------------
     listName: "ingresos" | "ahorros" | "inversiones" | "gastosFijos" | "gastosVariables"
               | "tarjetaPesos" | "tarjetaDolares" | "tarjetasTerceros" | "alquiler"
     Para proyectos: proyectoId + "ingresos" | "gastos"
     "presupuesto", "tarjetas" y "personas" no dependen del mes: viven en config y valen para todos.
  ------------------------------------------------- */

  function getList(listName, proyectoId) {
    if (listName === "presupuesto" || listName === "tarjetas" || listName === "personas") return state.config[listName];
    var mes = mesActual();
    if (proyectoId) {
      var p = (mes.proyectos || []).find(function (x) { return x.id === proyectoId; });
      return p ? p[listName] : [];
    }
    return mes[listName] || [];
  }

  function updateRow(listName, rowId, key, value, proyectoId) {
    var list = getList(listName, proyectoId);
    var row = list.find(function (x) { return x.id === rowId; });
    if (!row) return;
    row[key] = value;
    emit();
  }

  function addRow(listName, template, proyectoId) {
    var list = getList(listName, proyectoId);
    var row = Object.assign({ id: U.uid() }, template || {});
    list.push(row);
    emit();
    return row;
  }

  function deleteRow(listName, rowId, proyectoId) {
    var list = getList(listName, proyectoId);
    if (listName === "personas" && list.length <= 1) return; /* siempre tiene que quedar al menos vos */
    var i = list.findIndex(function (x) { return x.id === rowId; });
    if (i !== -1) { list.splice(i, 1); emit(); }
  }

  /* ---------------- proyectos ---------------- */

  function addProyecto(nombre) {
    var mes = mesActual();
    if (!mes.proyectos) mes.proyectos = [];
    var p = { id: U.uid(), nombre: nombre || "Proyecto nuevo", pct: 100, ingresos: [], gastos: [] };
    mes.proyectos.push(p);
    emit();
    return p;
  }

  /* campo: "nombre" | "pct" (tu parte del neto, en %; 100 = todo tuyo) */
  function updateProyecto(proyectoId, campo, valor) {
    var p = (mesActual().proyectos || []).find(function (x) { return x.id === proyectoId; });
    if (p) { p[campo] = valor; emit(); }
  }

  function deleteProyecto(proyectoId) {
    var mes = mesActual();
    var i = (mes.proyectos || []).findIndex(function (x) { return x.id === proyectoId; });
    if (i !== -1) { mes.proyectos.splice(i, 1); emit(); }
  }

  /* ---------------- meses ---------------- */

  function crearMes(id, opciones) {
    if (state.meses[id]) { state.mesActivo = id; emit(); return state.meses[id]; }
    opciones = opciones || {};
    var base = mesActual();
    var nuevo = {
      id: id,
      dolar: base ? base.dolar : 1000,
      balanceAnterior: opciones.arrastrarBalance && base ? calc(base).balanceFinal : 0,
      /* el ahorro y la inversión acumulados siempre siguen del mes anterior: a diferencia
         del balance, no tiene sentido "cortar" la cuenta al crear un mes nuevo */
      ahorroAnterior: base ? calc(base).ahorroFinal : 0,
      inversionAnterior: base ? calc(base).inversionFinal : 0,
      ahorroAnteriorMoneda: "ARS", inversionAnteriorMoneda: "ARS",
      ingresos: [], ahorros: [], inversiones: [], proyectos: [],
      gastosFijos: [], gastosVariables: [],
      tarjetaPesos: [], tarjetaDolares: [], tarjetasTerceros: [], alquiler: []
    };

    /* "3/6" -> "4/6"; null si la cuota ya era la última (o no es una cuota) */
    function siguienteCuota(cuota) {
      var m = String(cuota || "").match(/^\s*(\d+)\s*\/\s*(\d+)\s*$/);
      if (!m) return null;
      var n = parseInt(m[1], 10), total = parseInt(m[2], 10);
      return n < total ? (n + 1) + "/" + total : null;
    }

    /* De la tarjeta pasan al mes siguiente los consumos fijos (con su monto)
       y las cuotas que no terminaron (con la cuota avanzada) */
    function copiarTarjeta(lista) {
      return (lista || []).reduce(function (acc, row) {
        var tieneCuota = String(row.cuota || "").trim() !== "";
        var sig = tieneCuota ? siguienteCuota(row.cuota) : null;
        if (tieneCuota && sig) acc.push(Object.assign({}, row, { id: U.uid(), cuota: sig }));
        else if (!tieneCuota && row.fijo) acc.push(Object.assign({}, row, { id: U.uid() }));
        return acc;
      }, []);
    }

    function copiar(lista, limpiarMontos) {
      return (lista || []).map(function (row) {
        var copia = Object.assign({}, row, { id: U.uid() });
        if (limpiarMontos) {
          if ("monto" in copia) copia.monto = 0;
          if ("p1" in copia) copia.p1 = 0;
          if ("p2" in copia) copia.p2 = 0;
        }
        return copia;
      });
    }

    if (opciones.copiarFijos && base) {
      nuevo.gastosFijos = copiar(base.gastosFijos, false);
      nuevo.alquiler = copiar(base.alquiler, false);
    }
    if (opciones.copiarTarjetas && base) {
      nuevo.tarjetaPesos = copiarTarjeta(base.tarjetaPesos);
      nuevo.tarjetaDolares = copiarTarjeta(base.tarjetaDolares);
      nuevo.tarjetasTerceros = copiarTarjeta(base.tarjetasTerceros);
    }
    if (opciones.copiarIngresos && base) {
      nuevo.ingresos = copiar(base.ingresos, false);
    }
    if (opciones.copiarEstructura && base) {
      nuevo.gastosVariables = copiar(base.gastosVariables, true);
      nuevo.proyectos = (base.proyectos || []).map(function (p) {
        return { id: U.uid(), nombre: p.nombre, pct: p.pct === undefined ? 100 : p.pct,
                 ingresos: copiar(p.ingresos, true), gastos: copiar(p.gastos, true) };
      });
    }

    state.meses[id] = nuevo;
    state.mesActivo = id;
    emit();
    return nuevo;
  }

  function borrarMes(id) {
    if (Object.keys(state.meses).length <= 1) return false;
    delete state.meses[id];
    if (state.mesActivo === id) state.mesActivo = mesesOrdenados().pop();
    emit();
    return true;
  }

  /* Recorre los meses en orden y hace que el ahorro y la inversión "de antes de este mes"
     de cada uno sea el acumulado final del mes anterior. Sirve para arreglar la cadena
     cuando quedó cortada (ej. meses importados de un Excel que no tenía este dato) o
     cuando se editó "antes de este mes" a mano en algún mes intermedio. El primero de
     todos no se toca: ahí vive el punto de partida. */
  function recalcularAcumulados() {
    var ids = mesesOrdenados();
    for (var i = 1; i < ids.length; i++) {
      var anterior = calc(state.meses[ids[i - 1]]);
      var actual = state.meses[ids[i]];
      actual.ahorroAnterior = anterior.ahorroFinal;
      actual.inversionAnterior = anterior.inversionFinal;
      actual.ahorroAnteriorMoneda = "ARS";
      actual.inversionAnteriorMoneda = "ARS";
    }
    emit();
  }

  /* ---------------- cálculos ---------------- */

  function calc(mes) {
    mes = mes || mesActual();
    var dolar = Number(mes.dolar) || 0;

    function enPesos(row) {
      var monto = Number(row.monto) || 0;
      return row.moneda === "USD" ? monto * dolar : monto;
    }
    function sumaEnPesos(lista) {
      return (lista || []).reduce(function (a, row) { return a + enPesos(row); }, 0);
    }

    var totalIngresos = sumaEnPesos(mes.ingresos);

    /* Personas: cada una tiene una columna en las tablas de tarjeta, con su id como
       nombre de campo (row[persona.id]). La primera de la lista sos vos. */
    var personasConfig = (state && state.config.personas) || [];
    function sumaPersona(lista, personaId) { return U.sum(lista, personaId); }
    function sumaFila(row) {
      return personasConfig.reduce(function (a, p) { return a + (Number(row[p.id]) || 0); }, 0);
    }
    var porPersona = personasConfig.map(function (p) {
      return { id: p.id, nombre: p.nombre, pesos: sumaPersona(mes.tarjetaPesos, p.id), usd: sumaPersona(mes.tarjetaDolares, p.id) };
    });
    var tuId = personasConfig[0] && personasConfig[0].id;
    var tuTarjetaPesos = tuId ? sumaPersona(mes.tarjetaPesos, tuId) : 0;
    var tuTarjetaUsd = tuId ? sumaPersona(mes.tarjetaDolares, tuId) : 0;
    var totalTarjetaPesos = (mes.tarjetaPesos || []).reduce(function (a, r) { return a + sumaFila(r); }, 0);
    var totalTarjetaDolares = (mes.tarjetaDolares || []).reduce(function (a, r) { return a + sumaFila(r); }, 0);
    var totalTerceros = U.sum(mes.tarjetasTerceros, "monto");

    /* Las filas marcadas con "auto" toman su valor de la tarjeta. De tus tarjetas cuenta
       solo tu parte: la de la otra persona la paga ella. Lo de terceros es todo tuyo. */
    function montoDeFila(row) {
      if (row.auto === "tarjetaPesos") return tuTarjetaPesos;
      if (row.auto === "tarjetaDolares") return tuTarjetaUsd * dolar;
      if (row.auto === "tarjetasTerceros") return totalTerceros;
      return Number(row.monto) || 0;
    }

    var tarjetasConfig = (state && state.config.tarjetas) || [];
    var porTarjeta = tarjetasConfig.map(function (t, i) {
      function deEsta(row) { return (row.tarjeta || (tarjetasConfig[0] && tarjetasConfig[0].id)) === t.id; }
      var pesos = (mes.tarjetaPesos || []).filter(deEsta);
      var usd = (mes.tarjetaDolares || []).filter(deEsta);
      return {
        id: t.id, nombre: t.nombre || ("Tarjeta " + (i + 1)),
        pesos: pesos.reduce(function (a, r) { return a + sumaFila(r); }, 0),
        usd: usd.reduce(function (a, r) { return a + sumaFila(r); }, 0)
      };
    });

    var totalFijos = (mes.gastosFijos || []).reduce(function (a, r) { return a + montoDeFila(r); }, 0);
    var totalVariables = (mes.gastosVariables || []).reduce(function (a, r) { return a + montoDeFila(r); }, 0);
    var totalGastos = totalFijos + totalVariables;

    /* Presupuesto mide "fijo" vs "disfrute" por la marca de cada fila, no por en qué lista
       vive: un gasto de la lista "fijos" puede marcarse disfrute, y viceversa. Las filas
       "auto" se saltean acá porque su plata ya se cuenta desde las filas de tarjeta que
       las originan (si no, se contaría dos veces). */
    function categorizar(lista, montoDeLaFila) {
      return (lista || []).reduce(function (acc, r) {
        if (r.auto) return acc;
        var m = montoDeLaFila ? montoDeLaFila(r) : (Number(r.monto) || 0);
        if (r.disfrute) acc.disfrute += m; else acc.fijo += m;
        return acc;
      }, { fijo: 0, disfrute: 0 });
    }
    var catFijos = categorizar(mes.gastosFijos);
    var catVariables = categorizar(mes.gastosVariables);
    var catTarjPesos = categorizar(mes.tarjetaPesos, sumaFila);
    var catTarjUsd = categorizar(mes.tarjetaDolares, sumaFila);
    var catTerceros = categorizar(mes.tarjetasTerceros);
    var realFijo = catFijos.fijo + catVariables.fijo + catTarjPesos.fijo + catTarjUsd.fijo * dolar + catTerceros.fijo;
    var realDisfrute = catFijos.disfrute + catVariables.disfrute + catTarjPesos.disfrute + catTarjUsd.disfrute * dolar + catTerceros.disfrute;

    var proyectos = (mes.proyectos || []).map(function (p) {
      var ing = U.sum(p.ingresos, "monto");
      var gas = U.sum(p.gastos, "monto");
      var netoTotal = ing - gas;
      var pct = (p.pct === undefined || p.pct === null || p.pct === "") ? 100 : Number(p.pct);
      /* el gasto se resta primero del total del proyecto; recién sobre eso se aplica tu parte
         (para proyectos que se reparten con otra persona, ej. un socio) */
      return { id: p.id, nombre: p.nombre, pct: pct, ingresos: ing, gastos: gas, netoTotal: netoTotal, neto: netoTotal * pct / 100 };
    });
    var gananciaProyectos = proyectos.reduce(function (a, p) { return a + p.neto; }, 0);

    var totalAhorros = sumaEnPesos(mes.ahorros);
    var totalInversiones = sumaEnPesos(mes.inversiones);
    var ahorroAnteriorPesos = enPesos({ monto: mes.ahorroAnterior, moneda: mes.ahorroAnteriorMoneda });
    var inversionAnteriorPesos = enPesos({ monto: mes.inversionAnterior, moneda: mes.inversionAnteriorMoneda });
    var ahorroFinal = ahorroAnteriorPesos + totalAhorros;
    var inversionFinal = inversionAnteriorPesos + totalInversiones;
    var balanceDelMes = totalIngresos + gananciaProyectos - totalGastos;
    var balanceFinal = (Number(mes.balanceAnterior) || 0) + balanceDelMes;

    /* Presupuesto: cada parte es un % de lo que entró en el mes (ingresos + proyectos).
       Las partes de gastos son un tope (pasarse es malo); ahorro e inversión son una meta. */
    var baseReparto = totalIngresos + gananciaProyectos;
    var realPorFuente = {
      gastosFijos: realFijo, gastosVariables: realDisfrute,
      ahorros: totalAhorros, inversiones: totalInversiones
    };
    var presupuesto = ((state && state.config.presupuesto) || []).map(function (parte) {
      var pct = Number(parte.pct) || 0;
      var objetivo = baseReparto * pct / 100;
      var real = realPorFuente[parte.fuente] || 0;
      var tipo = parte.fuente === "ahorros" || parte.fuente === "inversiones" ? "meta" : "tope";
      return {
        id: parte.id, nombre: parte.nombre, fuente: parte.fuente, tipo: tipo,
        pct: pct, objetivo: objetivo, real: real, diferencia: objetivo - real,
        pctReal: baseReparto ? (real / baseReparto) * 100 : 0,
        avance: objetivo ? real / objetivo : 0
      };
    });
    var pctPresupuesto = presupuesto.reduce(function (a, p) { return a + p.pct; }, 0);

    return {
      dolar: dolar,
      totalIngresos: totalIngresos,
      totalFijos: totalFijos,
      totalVariables: totalVariables,
      totalGastos: totalGastos,
      pctFijos: totalGastos ? Math.round((totalFijos / totalGastos) * 100) : 0,
      proyectos: proyectos,
      gananciaProyectos: gananciaProyectos,
      totalAhorros: totalAhorros,
      totalInversiones: totalInversiones,
      ahorroFinal: ahorroFinal,
      inversionFinal: inversionFinal,
      baseReparto: baseReparto,
      presupuesto: presupuesto,
      pctPresupuesto: pctPresupuesto,
      balanceDelMes: balanceDelMes,
      balanceFinal: balanceFinal,
      totalTarjetaPesos: totalTarjetaPesos, totalTarjetaDolares: totalTarjetaDolares,
      totalTerceros: totalTerceros,
      porPersona: porPersona, tuTarjetaPesos: tuTarjetaPesos, tuTarjetaUsd: tuTarjetaUsd,
      porTarjeta: porTarjeta,
      montoDeFila: montoDeFila, enPesos: enPesos
    };
  }

  function historico(cantidad) {
    var ids = mesesOrdenados().slice(-(cantidad || 6));
    return ids.map(function (id) {
      return { id: id, label: U.monthShort(id), valor: calc(state.meses[id]).balanceDelMes };
    });
  }

  /* ---------------- export / import ---------------- */

  function exportJSON() {
    return JSON.stringify(state, null, 2);
  }

  function importJSON(texto) {
    var parsed = JSON.parse(texto);
    if (!parsed || !parsed.meses) throw new Error("El archivo no tiene el formato esperado");
    state = normalizar(parsed);
    if (!state.meses[state.mesActivo]) state.mesActivo = mesesOrdenados().pop();
    emit();
  }

  function resetear() {
    var activo = state && state.mesActivo;
    state = normalizar(JSON.parse(JSON.stringify(BM.seed)));
    if (activo && state.meses[activo]) state.mesActivo = activo;
    emit();
  }

  BM.store = {
    load: load, subscribe: subscribe, emit: emit, getState: getState,
    abrirUsuario: abrirUsuario, cerrarUsuario: cerrarUsuario, sincronizar: sincronizar, subir: subir, getSync: getSync,
    mesActual: mesActual, mesesOrdenados: mesesOrdenados, setMesActivo: setMesActivo,
    personas: personas,
    setDolar: setDolar, setBalanceAnterior: setBalanceAnterior,
    setAhorroAnterior: setAhorroAnterior, setInversionAnterior: setInversionAnterior,
    setAhorroAnteriorMoneda: setAhorroAnteriorMoneda, setInversionAnteriorMoneda: setInversionAnteriorMoneda,
    setViviendaTipo: setViviendaTipo,
    getList: getList, updateRow: updateRow, addRow: addRow, deleteRow: deleteRow,
    addProyecto: addProyecto, updateProyecto: updateProyecto, deleteProyecto: deleteProyecto,
    crearMes: crearMes, borrarMes: borrarMes,
    calc: calc, historico: historico, recalcularAcumulados: recalcularAcumulados,
    exportJSON: exportJSON, importJSON: importJSON, resetear: resetear
  };
})(window);
