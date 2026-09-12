/* =========================================================
   store.js — estado, persistencia y cálculos derivados
   Expone: window.BM.store
   Hoy guarda en localStorage. La capa está aislada a propósito:
   para sincronizar entre dispositivos solo hay que reemplazar
   load() / persist() por Firestore (ver CLAUDE.md).
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
    if (!st.config.personas) st.config.personas = { p1: "Persona 1", p2: "Persona 2" };
    if (!Array.isArray(st.config.presupuesto)) {
      st.config.presupuesto = JSON.parse(JSON.stringify(BM.seed.config.presupuesto));
    }
    Object.keys(st.meses).forEach(function (id) {
      if (!Array.isArray(st.meses[id].inversiones)) st.meses[id].inversiones = [];
    });
    return st;
  }

  function load() {
    var raw = null;
    try { raw = global.localStorage.getItem(KEY); } catch (e) { raw = null; }
    if (raw) {
      try {
        var parsed = JSON.parse(raw);
        if (parsed && parsed.meses) { state = normalizar(parsed); return state; }
      } catch (e) { /* datos corruptos: caemos al seed */ }
    }
    state = normalizar(JSON.parse(JSON.stringify(BM.seed)));
    return state;
  }

  function persist() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(function () {
      try { global.localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* modo privado, sin espacio */ }
    }, 250);
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

  function setPersona(slot, nombre) {
    state.config.personas[slot] = nombre || (slot === "p1" ? "Persona 1" : "Persona 2");
    emit();
  }

  /* ---------------- CRUD de filas ----------------
     listName: "ingresos" | "ahorros" | "inversiones" | "gastosFijos" | "gastosVariables"
               | "tarjetaPesos" | "tarjetaDolares" | "alquiler"
     Para proyectos: proyectoId + "ingresos" | "gastos"
     "presupuesto" no depende del mes: vive en config y vale para todos.
  ------------------------------------------------- */

  function getList(listName, proyectoId) {
    if (listName === "presupuesto") return state.config.presupuesto;
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
    var i = list.findIndex(function (x) { return x.id === rowId; });
    if (i !== -1) { list.splice(i, 1); emit(); }
  }

  /* ---------------- proyectos ---------------- */

  function addProyecto(nombre) {
    var mes = mesActual();
    if (!mes.proyectos) mes.proyectos = [];
    var p = { id: U.uid(), nombre: nombre || "Proyecto nuevo", ingresos: [], gastos: [] };
    mes.proyectos.push(p);
    emit();
    return p;
  }

  function updateProyecto(proyectoId, nombre) {
    var p = (mesActual().proyectos || []).find(function (x) { return x.id === proyectoId; });
    if (p) { p.nombre = nombre; emit(); }
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
      ingresos: [], ahorros: [], inversiones: [], proyectos: [],
      gastosFijos: [], gastosVariables: [],
      tarjetaPesos: [], tarjetaDolares: [], alquiler: []
    };

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
    if (opciones.copiarIngresos && base) {
      nuevo.ingresos = copiar(base.ingresos, false);
    }
    if (opciones.copiarEstructura && base) {
      nuevo.gastosVariables = copiar(base.gastosVariables, true);
      nuevo.tarjetaPesos = copiar(base.tarjetaPesos, true);
      nuevo.tarjetaDolares = copiar(base.tarjetaDolares, true);
      nuevo.proyectos = (base.proyectos || []).map(function (p) {
        return { id: U.uid(), nombre: p.nombre, ingresos: copiar(p.ingresos, true), gastos: copiar(p.gastos, true) };
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

  /* ---------------- cálculos ---------------- */

  function calc(mes) {
    mes = mes || mesActual();
    var dolar = Number(mes.dolar) || 0;

    var totalIngresos = (mes.ingresos || []).reduce(function (a, i) {
      var monto = Number(i.monto) || 0;
      return a + (i.moneda === "USD" ? monto * dolar : monto);
    }, 0);

    var tarjetaP1Pesos = U.sum(mes.tarjetaPesos, "p1");
    var tarjetaP2Pesos = U.sum(mes.tarjetaPesos, "p2");
    var tarjetaP1Usd = U.sum(mes.tarjetaDolares, "p1");
    var tarjetaP2Usd = U.sum(mes.tarjetaDolares, "p2");
    var totalTarjetaPesos = tarjetaP1Pesos + tarjetaP2Pesos;
    var totalTarjetaDolares = tarjetaP1Usd + tarjetaP2Usd;

    /* Las filas marcadas con "auto" toman su valor de los totales de tarjeta */
    function montoDeFila(row) {
      if (row.auto === "tarjetaPesos") return totalTarjetaPesos;
      if (row.auto === "tarjetaDolares") return totalTarjetaDolares * dolar;
      return Number(row.monto) || 0;
    }

    var totalFijos = (mes.gastosFijos || []).reduce(function (a, r) { return a + montoDeFila(r); }, 0);
    var totalVariables = (mes.gastosVariables || []).reduce(function (a, r) { return a + montoDeFila(r); }, 0);
    var totalGastos = totalFijos + totalVariables;

    var proyectos = (mes.proyectos || []).map(function (p) {
      var ing = U.sum(p.ingresos, "monto");
      var gas = U.sum(p.gastos, "monto");
      return { id: p.id, nombre: p.nombre, ingresos: ing, gastos: gas, neto: ing - gas };
    });
    var gananciaProyectos = proyectos.reduce(function (a, p) { return a + p.neto; }, 0);

    var totalAhorros = U.sum(mes.ahorros, "monto");
    var totalInversiones = U.sum(mes.inversiones, "monto");
    var balanceDelMes = totalIngresos + gananciaProyectos - totalGastos;
    var balanceFinal = (Number(mes.balanceAnterior) || 0) + balanceDelMes;

    /* Presupuesto: cada parte es un % de lo que entró en el mes (ingresos + proyectos).
       Las partes de gastos son un tope (pasarse es malo); ahorro e inversión son una meta. */
    var baseReparto = totalIngresos + gananciaProyectos;
    var realPorFuente = {
      gastosFijos: totalFijos, gastosVariables: totalVariables,
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
      baseReparto: baseReparto,
      presupuesto: presupuesto,
      pctPresupuesto: pctPresupuesto,
      balanceDelMes: balanceDelMes,
      balanceFinal: balanceFinal,
      tarjetaP1Pesos: tarjetaP1Pesos, tarjetaP2Pesos: tarjetaP2Pesos,
      tarjetaP1Usd: tarjetaP1Usd, tarjetaP2Usd: tarjetaP2Usd,
      totalTarjetaPesos: totalTarjetaPesos, totalTarjetaDolares: totalTarjetaDolares,
      montoDeFila: montoDeFila
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
    state = normalizar(JSON.parse(JSON.stringify(BM.seed)));
    emit();
  }

  BM.store = {
    load: load, subscribe: subscribe, emit: emit, getState: getState,
    mesActual: mesActual, mesesOrdenados: mesesOrdenados, setMesActivo: setMesActivo,
    personas: personas, setPersona: setPersona,
    setDolar: setDolar, setBalanceAnterior: setBalanceAnterior,
    getList: getList, updateRow: updateRow, addRow: addRow, deleteRow: deleteRow,
    addProyecto: addProyecto, updateProyecto: updateProyecto, deleteProyecto: deleteProyecto,
    crearMes: crearMes, borrarMes: borrarMes,
    calc: calc, historico: historico,
    exportJSON: exportJSON, importJSON: importJSON, resetear: resetear
  };
})(window);
