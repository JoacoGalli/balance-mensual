/* =========================================================
   app.js — shell, navegación y render de todas las vistas
   ========================================================= */
(function (global) {
  "use strict";

  var BM = global.BM;
  var U = BM.utils;
  var store = BM.store;

  var ICONS = {
    resumen: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="3" width="8" height="8" rx="1.5"/><rect x="13" y="3" width="8" height="5" rx="1.5"/><rect x="13" y="10" width="8" height="11" rx="1.5"/><rect x="3" y="13" width="8" height="8" rx="1.5"/></svg>',
    ingresos: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 17 L10 11 L14 15 L20 7"/><path d="M14 7 H20 V13"/></svg>',
    gastos: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7 L10 13 L14 9 L20 17"/><path d="M20 11 V17 H14"/></svg>',
    freelance: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7 V5 a1.5 1.5 0 0 1 1.5 -1.5 h3 A1.5 1.5 0 0 1 15 5 V7"/><path d="M3 13 H21"/></svg>',
    presupuesto: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3 A9 9 0 1 0 21 12 H12 Z"/><path d="M15 3.5 A9 9 0 0 1 20.5 9 H15 Z"/></svg>',
    tarjetas: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2.5" y="5" width="19" height="14" rx="2"/><path d="M2.5 10 H21.5"/><path d="M6 15 H10"/></svg>',
    balance: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2 V22"/><path d="M5 6 H19"/><path d="M5 6 L2.5 12 A2.5 3 0 0 0 7.5 12 Z"/><path d="M19 6 L16.5 12 A2.5 3 0 0 0 21.5 12 Z"/></svg>',
    ajustes: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 2.5v3M12 18.5v3M21.5 12h-3M5.5 12h-3M18.7 5.3l-2.1 2.1M7.4 16.6l-2.1 2.1M18.7 18.7l-2.1-2.1M7.4 7.4L5.3 5.3"/></svg>'
  };

  var VISTAS = [
    { id: "resumen",  label: "Resumen",  titulo: "Resumen",             sub: "La foto del mes: qué entró, qué salió y con cuánto cerrás." },
    { id: "ingresos", label: "Ingresos", titulo: "Ingresos",             sub: "Lo que cobrás en el mes, y lo que separás para ahorrar e invertir." },
    { id: "freelance", label: "Freelance", titulo: "Freelance",          sub: "Cada proyecto con sus ingresos y sus gastos. Lo que ganás neto se suma al mes." },
    { id: "gastos",   label: "Gastos",   titulo: "Gastos",               sub: "Separados en fijos y variables para ver qué es negociable." },
    { id: "presupuesto", label: "Presupuesto", titulo: "Presupuesto",   sub: "Qué parte de lo que entra va a cada cosa, y cómo vas este mes." },
    { id: "tarjetas", label: "Tarjetas", titulo: "Tarjetas",             sub: "Tus tarjetas en pesos y en dólares, con el corte por persona, las cuotas y lo fijo." },
    { id: "balance",  label: "Balance",  titulo: "Alquiler y balance",   sub: "El reparto del alquiler y cómo cierra el mes." },
    { id: "ajustes",  label: "Ajustes",  titulo: "Ajustes",              sub: "Personas, meses y copia de seguridad de tus datos." }
  ];
  function vista(id) { return VISTAS.find(function (v) { return v.id === id; }); }

  var vistaActiva = "resumen";

  /* ---------------- helpers de DOM ---------------- */
  function h(tag, attrs, hijos) {
    var n = document.createElement(tag);
    attrs = attrs || {};
    Object.keys(attrs).forEach(function (k) {
      if (k === "class") n.className = attrs[k];
      else if (k === "html") n.innerHTML = attrs[k];
      else if (k === "text") n.textContent = attrs[k];
      else if (k.slice(0, 2) === "on") n.addEventListener(k.slice(2).toLowerCase(), attrs[k]);
      else if (k === "dataset") Object.assign(n.dataset, attrs[k]);
      else n.setAttribute(k, attrs[k]);
    });
    (hijos || []).forEach(function (c) { if (c) n.appendChild(c); });
    return n;
  }
  function panel(titulo, extra) {
    var head = h("div", { class: "panel-head" }, [h("h3", { text: titulo })]);
    if (extra) head.appendChild(extra);
    return h("div", { class: "panel" }, [head]);
  }

  /* ---------------- toast con acción ---------------- */
  var toastTimer = null;
  function toast(msg, actionLabel, actionFn) {
    var t = document.getElementById("toast");
    t.innerHTML = "";
    t.appendChild(document.createTextNode(msg));
    if (actionLabel) {
      var b = h("button", {
        class: "btn small ghost", text: actionLabel,
        style: "margin-left:12px;background:transparent;color:inherit;border-color:currentColor",
        onclick: function () { t.classList.remove("show"); actionFn(); }
      });
      t.appendChild(b);
      t.style.pointerEvents = "auto";
    } else {
      t.style.pointerEvents = "none";
    }
    t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove("show"); t.style.pointerEvents = "none"; }, actionLabel ? 5000 : 2400);
  }
  BM.ui = { toast: toast };

  /* ---------------- shell ---------------- */
  function construirShell() {
    var app = document.getElementById("app");
    app.innerHTML = "";

    var sidebar = h("aside", { class: "sidebar" }, [
      h("div", { class: "brand" }, [
        h("span", { class: "brand-mark" }),
        h("div", {}, [h("h1", { text: "Balance" }), h("span", { text: "tu plata, mes a mes" })])
      ]),
      h("div", { class: "month-picker" }, [
        h("select", { id: "month-select", "aria-label": "Mes" }),
        h("div", { class: "dolar-row" }, [
          h("label", { for: "dolar-input", text: "Dólar del mes" }),
          h("input", { id: "dolar-input", type: "text", inputmode: "decimal" })
        ])
      ]),
      h("nav", { class: "primary-nav", id: "nav-desktop" }),
      h("div", { class: "sidebar-foot" }, [
        h("div", { class: "sync", id: "sync-desktop", role: "status" }),
        h("div", { id: "sidebar-foot" })
      ])
    ]);

    var main = h("main", { class: "content" }, [
      h("div", { class: "mobile-topbar" }, [
        h("div", { class: "brand" }, [h("span", { class: "brand-mark" }), h("h1", { text: "Balance", style: "font-size:1.1rem" })]),
        h("div", { class: "mobile-topbar-der" }, [
          h("span", { class: "sync sync-punto", id: "sync-mobile", role: "status" }),
          h("select", { id: "month-select-mobile", "aria-label": "Mes" })
        ])
      ])
    ]);

    VISTAS.forEach(function (v) {
      main.appendChild(h("section", { class: "view", id: "view-" + v.id }));
    });

    app.appendChild(h("div", { class: "app" }, [sidebar, main, h("nav", { class: "bottom-nav", id: "nav-mobile" })]));
    app.appendChild(h("div", { class: "toast", id: "toast" }));
    app.appendChild(construirDialogMes());

    ["nav-desktop", "nav-mobile"].forEach(function (id) {
      var cont = document.getElementById(id);
      VISTAS.forEach(function (v) {
        cont.appendChild(h("button", {
          class: "nav-item" + (v.id === vistaActiva ? " active" : ""),
          dataset: { view: v.id },
          html: ICONS[v.id] + "<span>" + v.label + "</span>",
          onclick: function () { irA(v.id); }
        }));
      });
    });

    document.getElementById("month-select").addEventListener("change", function (e) {
      cambiarMes(e.target.value);
    });
    document.getElementById("month-select-mobile").addEventListener("change", function (e) {
      cambiarMes(e.target.value);
    });

    var dolarInput = document.getElementById("dolar-input");
    dolarInput.addEventListener("focus", function () { dolarInput.value = String(store.mesActual().dolar || ""); dolarInput.select(); });
    dolarInput.addEventListener("input", function () { store.setDolar(U.parseNum(dolarInput.value)); BM.refreshDerived(); });
    dolarInput.addEventListener("blur", function () { dolarInput.value = "$" + U.fmtNum(store.mesActual().dolar, 0); });
  }

  function cambiarMes(valor) {
    if (valor === "__nuevo__") {
      abrirDialogMes();
      sincronizarSelects();
      return;
    }
    store.setMesActivo(valor);
    renderTodo();
  }

  function sincronizarSelects() {
    var ids = store.mesesOrdenados();
    ["month-select", "month-select-mobile"].forEach(function (selId) {
      var sel = document.getElementById(selId);
      if (!sel) return;
      sel.innerHTML = "";
      ids.forEach(function (id) {
        sel.appendChild(h("option", { value: id, text: U.monthLabel(id) }));
      });
      sel.appendChild(h("option", { value: "__nuevo__", text: "＋ Nuevo mes…" }));
      sel.value = store.getState().mesActivo;
    });
    var dolarInput = document.getElementById("dolar-input");
    if (dolarInput && document.activeElement !== dolarInput) {
      dolarInput.value = "$" + U.fmtNum(store.mesActual().dolar, 0);
    }
  }

  function irA(id) {
    if (!vista(id)) id = "resumen";
    vistaActiva = id;
    /* la vista queda en la URL: sirve para recargar, favoritos y el botón atrás */
    if (location.hash !== "#" + id) {
      try { history.replaceState(null, "", "#" + id); } catch (e) { /* file:// en algunos navegadores */ }
    }
    document.querySelectorAll(".view").forEach(function (v) { v.classList.toggle("active", v.id === "view-" + id); });
    document.querySelectorAll(".nav-item").forEach(function (b) { b.classList.toggle("active", b.dataset.view === id); });
    /* en el celu la barra de abajo scrollea: que la vista activa quede a la vista */
    var activoMobile = document.querySelector("#nav-mobile .nav-item.active");
    if (activoMobile && activoMobile.scrollIntoView) activoMobile.scrollIntoView({ block: "nearest", inline: "nearest" });
    global.scrollTo(0, 0);
  }

  /* ---------------- encabezado de vista ---------------- */
  function encabezado(vista, accion) {
    var izq = h("div", {}, [h("h2", { text: vista.titulo }), h("p", { text: vista.sub })]);
    var head = h("div", { class: "content-header" }, [izq]);
    if (accion) head.appendChild(accion);
    return head;
  }

  /* =========================================================
     VISTA: RESUMEN
     ========================================================= */
  function renderResumen() {
    var cont = document.getElementById("view-resumen");
    cont.innerHTML = "";
    cont.appendChild(encabezado(vista("resumen")));

    var c = store.calc();
    var mes = store.mesActual();

    /* --- hero: cómo cierra el mes, y la cuenta que lo explica --- */
    var aFavor = c.balanceDelMes >= 0;
    var nombreMes = U.MESES[parseInt(mes.id.split("-")[1], 10) - 1];

    function termino(op, label, valor, cls) {
      return h("div", { class: "eq-term" + (cls ? " " + cls : "") }, [
        h("span", { class: "eq-op", text: op || "", "aria-hidden": "true" }),
        h("div", { class: "eq-body" }, [
          h("span", { class: "eq-label", text: label }),
          h("span", { class: "eq-valor num", text: valor })
        ])
      ]);
    }

    cont.appendChild(h("section", { class: "hero" + (aFavor ? "" : " rojo"), "aria-label": "Cierre del mes" }, [
      h("p", { class: "hero-estado", text: nombreMes + (aFavor ? " cierra a favor" : " cierra en rojo") }),
      h("p", { class: "hero-monto num", text: U.fmtARS(c.balanceDelMes) }),
      h("p", { class: "hero-acumulado", html: "Con lo que venías arrastrando, quedás en <strong>" + U.fmtARS(c.balanceFinal) + "</strong>." }),
      h("div", { class: "ecuacion" }, [
        termino(null, "Ingresos", U.fmtARS(c.totalIngresos)),
        termino("+", "Freelance", U.fmtARS(c.gananciaProyectos)),
        termino("−", "Gastos", U.fmtARS(c.totalGastos)),
        termino("=", "Balance del mes", U.fmtARS(c.balanceDelMes), "resultado")
      ])
    ]));

    /* --- gráfico de balance --- */
    var pChart = panel("Balance de los últimos meses");
    var chartBox = h("div", { id: "chart-balance" });
    pChart.appendChild(chartBox);
    pChart.appendChild(h("div", { class: "chart-caption" }, [
      h("span", { html: '<span class="dot" style="background:var(--positive)"></span>Mes a favor' }),
      h("span", { html: '<span class="dot" style="background:var(--negative)"></span>Mes en rojo' })
    ]));

    /* --- fijos vs variables --- */
    var pSplit = panel("Fijos vs. variables", h("span", { class: "count", text: c.pctFijos + "% fijos" }));
    pSplit.appendChild(h("div", { class: "split-bar" }, [
      h("div", { style: "width:" + c.pctFijos + "%;background:var(--ink)" }),
      h("div", { style: "width:" + (100 - c.pctFijos) + "%;background:var(--brand)" })
    ]));
    pSplit.appendChild(h("div", { class: "split-legend" }, [
      h("span", { html: '<span class="dot" style="background:var(--ink)"></span>Fijos ' + U.fmtARS(c.totalFijos) }),
      h("span", { html: '<span class="dot" style="background:var(--brand)"></span>Variables ' + U.fmtARS(c.totalVariables) })
    ]));

    /* --- cuotas --- */
    var pCuotas = panel("Cuotas en curso");
    var personasResumen = store.getState().config.personas || [];
    function totalPersonas(row) {
      return personasResumen.reduce(function (a, p) { return a + (Number(row[p.id]) || 0); }, 0);
    }
    var conCuota = (mes.tarjetaPesos || []).filter(function (t) { return t.cuota; })
      .map(function (t) { return { desc: t.desc, cuota: t.cuota, monto: totalPersonas(t), moneda: "ARS" }; })
      .concat((mes.tarjetaDolares || []).filter(function (t) { return t.cuota; })
        .map(function (t) { return { desc: t.desc, cuota: t.cuota, monto: totalPersonas(t), moneda: "USD" }; }))
      .concat((mes.tarjetasTerceros || []).filter(function (t) { return t.cuota; })
        .map(function (t) { return { desc: t.desc, cuota: t.cuota, monto: Number(t.monto) || 0, moneda: "ARS" }; }));

    if (!conCuota.length) {
      pCuotas.appendChild(h("p", { class: "panel-note", text: "No tenés cuotas marcadas este mes." }));
    } else {
      conCuota.forEach(function (t) {
        pCuotas.appendChild(h("div", { class: "line-item" }, [
          h("span", { text: t.desc }),
          h("span", { html: '<span class="badge warning">cuota ' + t.cuota + '</span> <span class="num amt">' +
            (t.moneda === "USD" ? U.fmtUSD(t.monto) : U.fmtARS(t.monto)) + '</span>' })
        ]));
      });
    }

    /* --- proyectos --- */
    var pProy = panel("Freelance por proyecto");
    if (!c.proyectos.length) {
      pProy.appendChild(h("p", { class: "panel-note", text: "Sin proyectos freelance este mes." }));
    } else {
      c.proyectos.forEach(function (p) {
        pProy.appendChild(h("div", { class: "line-item" }, [
          h("span", { text: p.nombre }),
          h("span", { class: "num amt", text: U.fmtARS(p.neto), style: "color:" + (p.neto >= 0 ? "var(--positive)" : "var(--negative)") })
        ]));
      });
      pProy.appendChild(h("div", { class: "total-row" }, [
        h("span", { text: "Ganancia neta" }),
        h("span", { class: "num", text: U.fmtARS(c.gananciaProyectos) })
      ]));
    }

    cont.appendChild(h("div", { class: "panels" }, [
      h("div", {}, [pChart, pSplit]),
      h("div", {}, [pCuotas, pProy])
    ]));

    dibujarChart();
  }

  function dibujarChart() {
    var datos = store.historico(6);
    var box = document.getElementById("chart-balance");
    if (!box) return;

    var w = 480, hgt = 178, padL = 8, padR = 8, padT = 16, padB = 22;
    var valores = datos.map(function (d) { return d.valor; });
    /* El cero siempre está en el gráfico, pero la escala usa el rango real:
       si todos los meses cerraron a favor, no desperdiciamos media altura. */
    var maxV = Math.max.apply(null, valores.concat([0])) * 1.12;
    var minV = Math.min.apply(null, valores.concat([0])) * 1.12;
    var rango = (maxV - minV) || 1;
    var innerW = w - padL - padR;
    var alturaUtil = hgt - padT - padB;
    var bw = innerW / Math.max(datos.length, 1);
    var zeroY = padT + (maxV / rango) * alturaUtil;
    var escala = alturaUtil / rango;

    var svg = '<svg viewBox="0 0 ' + w + ' ' + hgt + '" style="width:100%;height:auto;max-height:190px" role="img" aria-label="Balance por mes">';
    svg += '<line x1="' + padL + '" y1="' + zeroY + '" x2="' + (w - padR) + '" y2="' + zeroY + '" stroke="var(--border-strong)" stroke-width="1"/>';

    datos.forEach(function (d, i) {
      var ancho = Math.min(bw * 0.4, 56);
      var x = padL + i * bw + (bw - ancho) / 2;
      var alto = Math.abs(d.valor) * escala;
      var y = d.valor >= 0 ? zeroY - alto : zeroY;
      var color = d.valor >= 0 ? "var(--positive)" : "var(--negative)";
      svg += '<rect x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + ancho.toFixed(1) +
             '" height="' + Math.max(alto, 2).toFixed(1) + '" rx="5" fill="' + color + '"/>';
      var etiquetaY = d.valor >= 0 ? y - 5 : y + Math.max(alto, 2) + 11;
      var texto = Math.abs(d.valor) >= 1000 ? Math.round(d.valor / 1000) + "k" : Math.round(d.valor);
      svg += '<text x="' + (x + ancho / 2).toFixed(1) + '" y="' + etiquetaY.toFixed(1) +
             '" text-anchor="middle" font-size="10" font-weight="600" font-family="Archivo, sans-serif" fill="var(--ink-2)">' + texto + '</text>';
      svg += '<text x="' + (x + ancho / 2).toFixed(1) + '" y="' + (hgt - 5) +
             '" text-anchor="middle" font-size="10" font-family="Archivo, sans-serif" fill="var(--ink-3)">' + d.label + '</text>';
    });
    svg += "</svg>";
    box.innerHTML = svg;
  }

  /* =========================================================
     VISTA: INGRESOS Y PROYECTOS
     ========================================================= */
  function renderIngresos() {
    var cont = document.getElementById("view-ingresos");
    cont.innerHTML = "";
    cont.appendChild(encabezado(vista("ingresos")));

    /* ingresos */
    var pIng = panel("Ingresos del mes");
    pIng.appendChild(h("p", { class: "panel-note", text: "Poné el monto en la moneda en que cobrás; si es USD se convierte con el dólar del mes." }));
    var mountIng = h("div");
    pIng.appendChild(mountIng);
    BM.table.render(mountIng, {
      list: "ingresos",
      columns: [
        { key: "fuente", label: "Fuente", type: "text", align: "left", placeholder: "De dónde viene" },
        { key: "monto", label: "Monto", type: "money" },
        { key: "moneda", label: "Moneda", type: "moneda", width: "86px" },
        { key: "_ars", label: "En pesos", type: "calc", compute: function (row) {
            var m = Number(row.monto) || 0;
            return U.fmtNum(row.moneda === "USD" ? m * (store.mesActual().dolar || 0) : m, 0);
          } }
      ],
      template: { fuente: "", monto: 0, moneda: "ARS" },
      addLabel: "+ Agregar ingreso",
      emptyText: "Todavía no cargaste ingresos este mes.",
      totalId: "total-ingresos", totalLabel: "Total ingresos",
      totalFn: function () { return U.fmtARS(store.calc().totalIngresos); }
    });

    /* Campo de "antes de este mes" + total acumulado, reutilizado para ahorros e inversiones */
    function campoAcumulado(panelDestino, id, label, valor, onInput) {
      var inp = h("input", { type: "text", inputmode: "decimal", id: id, value: U.fmtNum(valor, 0) });
      inp.addEventListener("focus", function () { inp.value = String(valor || ""); inp.select(); });
      inp.addEventListener("input", function () { onInput(U.parseNum(inp.value)); BM.refreshDerived(); });
      inp.addEventListener("blur", function () { inp.value = U.fmtNum(valor, 0); });
      panelDestino.appendChild(h("div", { class: "field-row" }, [h("label", { for: id, text: label }), inp]));
    }

    /* ahorros */
    var pAho = panel("Ahorros");
    pAho.appendChild(h("p", { class: "panel-note",
      text: "Cargá lo que sumaste o sacaste este mes (podés poner un número negativo). El total de abajo arrastra solo de un mes al siguiente." }));
    campoAcumulado(pAho, "ahorro-anterior", "Antes de este mes", store.mesActual().ahorroAnterior, store.setAhorroAnterior);
    var mountAho = h("div");
    pAho.appendChild(mountAho);
    BM.table.render(mountAho, {
      list: "ahorros",
      columns: [
        { key: "desc", label: "Descripción", type: "text", align: "left", placeholder: "A dónde va" },
        { key: "monto", label: "Monto", type: "money" },
        { key: "moneda", label: "Moneda", type: "moneda", width: "86px" }
      ],
      template: { desc: "", monto: 0, moneda: "ARS" },
      addLabel: "+ Agregar movimiento",
      emptyText: "Sin movimientos este mes.",
      totalId: "total-ahorros", totalLabel: "Sumaste este mes",
      totalFn: function () { return U.fmtARS(store.calc().totalAhorros); }
    });
    BM.calcs["ahorro-final"] = function () { return U.fmtARS(store.calc().ahorroFinal); };
    pAho.appendChild(h("div", { class: "total-row" }, [h("span", { text: "Total ahorrado" }),
      h("span", { class: "num", dataset: { calc: "ahorro-final" }, text: BM.calcs["ahorro-final"]() })]));

    /* inversiones */
    var pInv = panel("Inversiones");
    pInv.appendChild(h("p", { class: "panel-note",
      text: "Igual que Ahorros: cargá el movimiento de este mes, y el total acumulado arrastra solo." }));
    campoAcumulado(pInv, "inversion-anterior", "Antes de este mes", store.mesActual().inversionAnterior, store.setInversionAnterior);
    var mountInv = h("div");
    pInv.appendChild(mountInv);
    BM.table.render(mountInv, {
      list: "inversiones",
      columns: [
        { key: "desc", label: "Descripción", type: "text", align: "left", placeholder: "Plazo fijo, fondo, acciones…" },
        { key: "monto", label: "Monto", type: "money" },
        { key: "moneda", label: "Moneda", type: "moneda", width: "86px" }
      ],
      template: { desc: "", monto: 0, moneda: "ARS" },
      addLabel: "+ Agregar movimiento",
      emptyText: "Sin movimientos este mes.",
      totalId: "total-inversiones", totalLabel: "Sumaste este mes",
      totalFn: function () { return U.fmtARS(store.calc().totalInversiones); }
    });
    BM.calcs["inversion-final"] = function () { return U.fmtARS(store.calc().inversionFinal); };
    pInv.appendChild(h("div", { class: "total-row" }, [h("span", { text: "Total invertido" }),
      h("span", { class: "num", dataset: { calc: "inversion-final" }, text: BM.calcs["inversion-final"]() })]));

    pIng.appendChild(h("p", { class: "panel-note", style: "margin:14px 0 0",
      text: "Lo que cobrás por proyectos freelance se carga aparte, en Freelance." }));

    cont.appendChild(h("div", { class: "panels" }, [h("div", {}, [pIng]), h("div", {}, [pAho, pInv])]));
  }

  /* =========================================================
     VISTA: FREELANCE (proyectos, cada uno con ingresos y gastos)
     ========================================================= */
  function renderFreelance() {
    var cont = document.getElementById("view-freelance");
    cont.innerHTML = "";

    var btnNuevo = h("button", {
      class: "btn primary", text: "+ Nuevo proyecto",
      onclick: function () { store.addProyecto("Proyecto nuevo"); renderFreelance(); BM.refreshDerived(); }
    });
    cont.appendChild(encabezado(vista("freelance"), btnNuevo));

    var pProy = h("div");
    var proyectos = store.mesActual().proyectos || [];
    if (!proyectos.length) {
      var vacio = panel("Todavía no hay proyectos este mes");
      vacio.appendChild(h("p", { class: "panel-note", text: "Creá uno por cliente o por trabajo, y cargale lo que cobraste y lo que gastaste para hacerlo." }));
      pProy.appendChild(vacio);
    }

    proyectos.forEach(function (p) {
      var card = h("div", { class: "project-card panel" });

      var inputNombre = h("input", { type: "text", value: p.nombre, "aria-label": "Nombre del proyecto" });
      inputNombre.addEventListener("input", function () { store.updateProyecto(p.id, "nombre", inputNombre.value); BM.refreshDerived(); });

      var neto = h("span", { class: "project-neto num", dataset: { calc: "proy-" + p.id } });
      BM.calcs["proy-" + p.id] = function () {
        var found = store.calc().proyectos.find(function (x) { return x.id === p.id; });
        return found ? U.fmtARS(found.neto) : U.fmtARS(0);
      };
      neto.textContent = BM.calcs["proy-" + p.id]();

      var borrar = h("button", {
        class: "row-del", text: "×", title: "Borrar proyecto", style: "opacity:.6",
        onclick: function () {
          var copia = JSON.parse(JSON.stringify(p));
          store.deleteProyecto(p.id);
          renderFreelance(); BM.refreshDerived();
          toast("Proyecto borrado", "Deshacer", function () {
            store.mesActual().proyectos.push(copia); store.emit(); renderFreelance(); BM.refreshDerived();
          });
        }
      });

      card.appendChild(h("div", { class: "project-head" }, [inputNombre, neto, borrar]));

      /* si el proyecto se reparte con alguien más (ej. un socio), acá se define qué parte
         del neto (ingresos menos gastos) es la tuya; por defecto el 100% */
      var pctActual = p.pct === undefined || p.pct === null || p.pct === "" ? 100 : p.pct;
      var inputPct = h("input", { type: "text", inputmode: "decimal", value: String(pctActual),
        id: "pct-" + p.id, "aria-label": "Tu parte de " + p.nombre + ", en porcentaje" });
      inputPct.addEventListener("focus", function () { inputPct.select(); });
      inputPct.addEventListener("input", function () {
        store.updateProyecto(p.id, "pct", U.parseNum(inputPct.value));
        BM.refreshDerived();
      });
      inputPct.addEventListener("blur", function () {
        var f = store.calc().proyectos.find(function (x) { return x.id === p.id; });
        inputPct.value = String(f ? f.pct : 100);
      });

      var notaPct = h("span", { class: "project-split-nota num", dataset: { calc: "proy-nota-" + p.id } });
      BM.calcs["proy-nota-" + p.id] = function () {
        var f = store.calc().proyectos.find(function (x) { return x.id === p.id; });
        if (!f || f.pct === 100) return "";
        return "de " + U.fmtARS(f.netoTotal) + " netos del proyecto";
      };
      notaPct.textContent = BM.calcs["proy-nota-" + p.id]();

      card.appendChild(h("div", { class: "project-split" }, [
        h("label", { for: "pct-" + p.id, text: "Tu parte de este proyecto" }), inputPct,
        h("span", { text: "%" }), notaPct
      ]));

      var colIng = h("div", {}, [h("h4", { text: "Ingresos" })]);
      var mountPI = h("div"); colIng.appendChild(mountPI);
      BM.table.render(mountPI, {
        list: "ingresos", proyectoId: p.id,
        columns: [
          { key: "desc", label: "Concepto", type: "text", align: "left", placeholder: "Concepto" },
          { key: "monto", label: "Monto", type: "money" }
        ],
        template: { desc: "", monto: 0 },
        addLabel: "+ Ingreso", emptyText: "Sin ingresos.",
        totalId: "proy-ing-" + p.id, totalLabel: "Total",
        totalFn: function () {
          var f = store.calc().proyectos.find(function (x) { return x.id === p.id; });
          return U.fmtARS(f ? f.ingresos : 0);
        }
      });

      var colGas = h("div", {}, [h("h4", { text: "Gastos" })]);
      var mountPG = h("div"); colGas.appendChild(mountPG);
      BM.table.render(mountPG, {
        list: "gastos", proyectoId: p.id,
        columns: [
          { key: "desc", label: "Concepto", type: "text", align: "left", placeholder: "Concepto" },
          { key: "monto", label: "Monto", type: "money" }
        ],
        template: { desc: "", monto: 0 },
        addLabel: "+ Gasto", emptyText: "Sin gastos.",
        totalId: "proy-gas-" + p.id, totalLabel: "Total",
        totalFn: function () {
          var f = store.calc().proyectos.find(function (x) { return x.id === p.id; });
          return U.fmtARS(f ? f.gastos : 0);
        }
      });

      card.appendChild(h("div", { class: "project-grid" }, [colIng, colGas]));
      pProy.appendChild(card);
    });

    if (proyectos.length) {
      var totalProy = h("span", { class: "num", dataset: { calc: "total-proyectos" } });
      BM.calcs["total-proyectos"] = function () { return U.fmtARS(store.calc().gananciaProyectos); };
      totalProy.textContent = BM.calcs["total-proyectos"]();
      var pTotal = h("div", { class: "panel" }, [
        h("div", { class: "total-row freelance-total" }, [h("span", { text: "Ganancia neta de freelance" }), totalProy])
      ]);
      pProy.appendChild(pTotal);
    }

    cont.appendChild(pProy);
  }

  /* =========================================================
     VISTA: GASTOS
     ========================================================= */
  var tabGastos = "gastosFijos";

  function renderGastos() {
    var cont = document.getElementById("view-gastos");
    cont.innerHTML = "";
    cont.appendChild(encabezado(vista("gastos")));

    var tabs = h("div", { class: "tabs" });
    [["gastosFijos", "Fijos"], ["gastosVariables", "Variables"]].forEach(function (t) {
      tabs.appendChild(h("button", {
        class: "tab" + (tabGastos === t[0] ? " active" : ""), text: t[1],
        onclick: function () { tabGastos = t[0]; renderGastos(); }
      }));
    });
    cont.appendChild(tabs);

    var esFijos = tabGastos === "gastosFijos";
    var p = panel(esFijos ? "Gastos fijos" : "Gastos variables");
    p.appendChild(h("p", { class: "panel-note", text: esFijos
      ? "Los que se repiten todos los meses: alquiler, servicios, impuestos, suscripciones."
      : "Los que cambian mes a mes. Las filas marcadas como “auto” se completan solas con el total de tarjetas." }));

    var mount = h("div");
    p.appendChild(mount);
    BM.table.render(mount, {
      list: tabGastos,
      columns: [
        { key: "desc", label: "Descripción", type: "text", align: "left", placeholder: "En qué se va" },
        { key: "monto", label: "Monto", type: "money" }
      ],
      template: { desc: "", monto: 0 },
      addLabel: "+ Agregar gasto",
      emptyText: "Sin gastos cargados.",
      totalId: "total-" + tabGastos, totalLabel: esFijos ? "Total fijos" : "Total variables",
      totalFn: function () { var c = store.calc(); return U.fmtARS(esFijos ? c.totalFijos : c.totalVariables); }
    });
    cont.appendChild(p);

    var resumen = panel("Total de gastos del mes");
    var filaF = h("div", { class: "line-item" }, [h("span", { text: "Fijos" }),
      h("span", { class: "num amt", dataset: { calc: "g-fijos" } })]);
    var filaV = h("div", { class: "line-item" }, [h("span", { text: "Variables" }),
      h("span", { class: "num amt", dataset: { calc: "g-variables" } })]);
    var filaT = h("div", { class: "total-row" }, [h("span", { text: "Total" }),
      h("span", { class: "num", dataset: { calc: "g-total" } })]);
    BM.calcs["g-fijos"] = function () { return U.fmtARS(store.calc().totalFijos); };
    BM.calcs["g-variables"] = function () { return U.fmtARS(store.calc().totalVariables); };
    BM.calcs["g-total"] = function () { return U.fmtARS(store.calc().totalGastos); };
    resumen.appendChild(filaF); resumen.appendChild(filaV); resumen.appendChild(filaT);
    cont.appendChild(resumen);
  }

  /* =========================================================
     VISTA: PRESUPUESTO
     ========================================================= */
  var FUENTES = [
    ["gastosFijos", "Fijos"], ["gastosVariables", "Variables"],
    ["inversiones", "Inversiones"], ["ahorros", "Ahorros"]
  ];

  function renderPresupuesto() {
    var cont = document.getElementById("view-presupuesto");
    cont.innerHTML = "";
    cont.appendChild(encabezado(vista("presupuesto")));

    var pComo = panel("Cómo vas este mes");
    pComo.appendChild(h("div", { id: "presupuesto-barras" }));

    var pPlan = panel("Tu reparto");
    pPlan.appendChild(h("p", { class: "panel-note",
      text: "Poné qué porcentaje de lo que entra va a cada parte y de dónde sale lo real. Vale para todos los meses." }));
    var mount = h("div");
    pPlan.appendChild(mount);
    BM.table.render(mount, {
      list: "presupuesto",
      columns: [
        { key: "nombre", label: "Parte", type: "text", align: "left", placeholder: "Nombre" },
        { key: "pct", label: "%", type: "pct", width: "70px" },
        { key: "fuente", label: "Se mide con", type: "opciones", options: FUENTES }
      ],
      template: { nombre: "", pct: 0, fuente: "gastosVariables" },
      addLabel: "+ Agregar parte",
      emptyText: "Sin partes. Agregá la primera.",
      totalId: "total-presupuesto", totalLabel: "Total",
      totalFn: function () { return U.fmtNum(store.calc().pctPresupuesto, 0) + "%"; }
    });

    cont.appendChild(h("div", { class: "panels" }, [h("div", {}, [pComo]), h("div", {}, [pPlan])]));
    dibujarPresupuesto();
  }

  /* Se redibuja entero en cada cambio: no tiene inputs, así que no se pierde el foco */
  function dibujarPresupuesto() {
    var box = document.getElementById("presupuesto-barras");
    if (!box) return;
    var c = store.calc();
    box.innerHTML = "";

    box.appendChild(h("p", { class: "panel-note", html: "Sobre <strong class=\"num\">" + U.fmtARS(c.baseReparto) +
      "</strong> que entraron este mes, sumando ingresos y freelance." }));
    if (c.pctPresupuesto !== 100) {
      box.appendChild(h("p", { class: "aviso", text: "Tu reparto suma " + U.fmtNum(c.pctPresupuesto, 0) +
        "%. Ajustá los porcentajes para que den 100%." }));
    }

    c.presupuesto.forEach(function (p) {
      var pasado = p.tipo === "tope" && p.diferencia < 0;
      var cumplida = p.tipo === "meta" && p.diferencia <= 0;
      var estado;
      if (p.tipo === "tope") estado = pasado ? "Te pasaste " + U.fmtARS(-p.diferencia) : "Te quedan " + U.fmtARS(p.diferencia);
      else estado = cumplida ? "Meta cumplida" : "Te faltan " + U.fmtARS(p.diferencia);

      var ancho = Math.max(0, Math.min(p.avance, 1)) * 100;
      box.appendChild(h("div", { class: "parte" + (pasado ? " pasado" : "") + (cumplida ? " cumplida" : "") + " " + p.tipo }, [
        h("div", { class: "parte-head" }, [
          h("span", { class: "parte-nombre", text: p.nombre || "Sin nombre" }),
          h("span", { class: "parte-pct num", text: U.fmtNum(p.pctReal, 0) + "% de " + U.fmtNum(p.pct, 0) + "%" })
        ]),
        h("div", { class: "parte-barra", role: "img",
          "aria-label": p.nombre + ": " + U.fmtARS(p.real) + " de " + U.fmtARS(p.objetivo) }, [
          h("div", { class: "parte-fill", style: "width:" + ancho.toFixed(1) + "%" })
        ]),
        h("div", { class: "parte-foot" }, [
          h("span", { class: "num", text: U.fmtARS(p.real) + " de " + U.fmtARS(p.objetivo) }),
          h("span", { class: "parte-estado", text: estado })
        ])
      ]));
    });
  }

  /* =========================================================
     VISTA: TARJETAS
     ========================================================= */
  function renderTarjetas() {
    var cont = document.getElementById("view-tarjetas");
    cont.innerHTML = "";
    cont.appendChild(encabezado(vista("tarjetas")));

    var personas = store.getState().config.personas;
    var tarjetas = store.getState().config.tarjetas;

    /* una columna de monto por persona, con su nombre como rótulo */
    function columnasPersonas(esUsd) {
      return personas.map(function (per) { return { key: per.id, label: per.nombre || "Sin nombre", type: esUsd ? "usd" : "money" }; });
    }
    function templatePersonas() {
      var t = {};
      personas.forEach(function (per) { t[per.id] = 0; });
      return t;
    }
    var columnasFinales = [
      { key: "cuota", label: "Cuota", type: "cuota", placeholder: "—", width: "78px" },
      { key: "fijo", label: "Fijo", type: "check", title: "Se repite todos los meses" }
    ];

    /* --- una sección por tarjeta propia, con sus consumos en pesos y en dólares --- */
    tarjetas.forEach(function (tarj) {
      var pTarj = panel(tarjetas.length > 1 ? tarj.nombre || "Sin nombre" : "Consumos de tarjeta");
      pTarj.appendChild(h("p", { class: "panel-note", text: "Cargá cada consumo con el monto de cada uno. En “Cuota” escribí por ejemplo 2/6. " +
        "Tildá “Fijo” en lo que se repite todos los meses: al crear el mes siguiente se copia solo, igual que las cuotas." }));

      function colMoneda(lista, titulo, esUsd) {
        var col = h("div", {}, [h("h4", { text: titulo })]);
        var mount = h("div"); col.appendChild(mount);
        BM.table.render(mount, {
          list: lista,
          columns: [{ key: "desc", label: "Descripción", type: "text", align: "left", placeholder: "Consumo" }]
            .concat(columnasPersonas(esUsd)).concat(columnasFinales),
          template: Object.assign({ desc: "", tarjeta: tarj.id, cuota: "", fijo: false }, templatePersonas()),
          filtro: function (row) { return (row.tarjeta || tarjetas[0].id) === tarj.id; },
          addLabel: "+ Agregar consumo",
          emptyText: "Sin consumos.",
          totalId: "tar-" + tarj.id + (esUsd ? "-usd" : "-ars"), totalLabel: "Total",
          totalFn: function () {
            var f = store.calc().porTarjeta.find(function (x) { return x.id === tarj.id; });
            return esUsd ? U.fmtUSD(f ? f.usd : 0) : U.fmtARS(f ? f.pesos : 0);
          }
        });
        return col;
      }

      pTarj.appendChild(h("div", { class: "project-grid" }, [
        colMoneda("tarjetaPesos", "Pesos", false),
        colMoneda("tarjetaDolares", "Dólares", true)
      ]));
      cont.appendChild(pTarj);
    });

    /* --- tarjetas de otros: cuotas que le pagás a alguien por algo que compró con su tarjeta --- */
    var pTerceros = panel("Tarjetas de otros");
    pTerceros.appendChild(h("p", { class: "panel-note",
      text: "Algo que compraste con la tarjeta de otra persona y le pagás en cuotas, aparte de tus propias tarjetas." }));
    var mountTerceros = h("div");
    pTerceros.appendChild(mountTerceros);
    BM.table.render(mountTerceros, {
      list: "tarjetasTerceros",
      columns: [
        { key: "desc", label: "Descripción", type: "text", align: "left", placeholder: "Qué compraste" },
        { key: "monto", label: "Monto", type: "money" },
        { key: "cuota", label: "Cuota", type: "cuota", placeholder: "—", width: "78px" },
        { key: "fijo", label: "Fijo", type: "check", title: "Se repite todos los meses" }
      ],
      template: { desc: "", monto: 0, cuota: "", fijo: false },
      addLabel: "+ Agregar cuota",
      emptyText: "Sin cuotas de tarjetas de otros.",
      totalId: "total-terceros", totalLabel: "Total",
      totalFn: function () { return U.fmtARS(store.calc().totalTerceros); }
    });
    cont.appendChild(pTerceros);

    /* --- resumen: cómo se reparte entre las personas, y el total por tarjeta --- */
    var pTot = panel("Cómo se reparte");
    personas.forEach(function (per, i) {
      var calcId = "tar-persona-" + per.id;
      BM.calcs[calcId] = function () {
        var f = store.calc().porPersona.find(function (x) { return x.id === per.id; });
        if (!f) return U.fmtARS(0);
        return U.fmtARS(f.pesos) + (f.usd ? " + " + U.fmtUSD(f.usd) : "");
      };
      pTot.appendChild(h("div", { class: "line-item" }, [
        h("span", { text: (per.nombre || "Sin nombre") + (i === 0 ? " (cuenta como gasto tuyo)" : "") }),
        h("span", { class: "num amt", dataset: { calc: calcId } })
      ]));
    });
    BM.calcs["tar-total"] = function () {
      var c = store.calc();
      return U.fmtARS(c.totalTarjetaPesos) + (c.totalTarjetaDolares ? " + " + U.fmtUSD(c.totalTarjetaDolares) : "");
    };
    pTot.appendChild(h("div", { class: "total-row" }, [h("span", { text: "Total de tus tarjetas" }), h("span", { class: "num", dataset: { calc: "tar-total" } })]));
    pTot.appendChild(h("p", { class: "panel-note", style: "margin-top:12px",
      text: "En Gastos podés tener filas “auto” que traen tu parte de las tarjetas y el total de Tarjetas de otros." }));

    var pPorTarjeta = null;
    if (tarjetas.length > 1) {
      pPorTarjeta = panel("Total por tarjeta");
      tarjetas.forEach(function (t) {
        var calcId = "tar-total-" + t.id;
        BM.calcs[calcId] = function () {
          var f = store.calc().porTarjeta.find(function (x) { return x.id === t.id; });
          if (!f) return U.fmtARS(0);
          return U.fmtARS(f.pesos) + (f.usd ? " + " + U.fmtUSD(f.usd) : "");
        };
        pPorTarjeta.appendChild(h("div", { class: "line-item" }, [h("span", { text: t.nombre || "Sin nombre" }),
          h("span", { class: "num amt", dataset: { calc: calcId } })]));
      });
    }
    cont.appendChild(h("div", { class: "panels" }, [h("div", {}, [pTot]), h("div", {}, [pPorTarjeta])]));
  }

  /* =========================================================
     VISTA: ALQUILER Y BALANCE
     ========================================================= */
  function renderBalance() {
    var cont = document.getElementById("view-balance");
    cont.innerHTML = "";
    var esHipoteca = store.getState().config.viviendaTipo === "hipotecario";
    cont.appendChild(encabezado(Object.assign({}, vista("balance"), {
      titulo: esHipoteca ? "Hipoteca y balance" : "Alquiler y balance",
      sub: esHipoteca ? "La cuota de la hipoteca y cómo cierra el mes." : "El reparto del alquiler y cómo cierra el mes."
    })));

    var pAlq = panel(esHipoteca ? "Hipoteca compartida" : "Alquiler compartido");
    pAlq.appendChild(h("p", { class: "panel-note",
      text: esHipoteca ? "Cómo se reparte la cuota de la hipoteca entre las personas." : "Cómo se reparte el alquiler entre las personas." }));
    var mount = h("div");
    pAlq.appendChild(mount);
    BM.table.render(mount, {
      list: "alquiler",
      columns: [
        { key: "persona", label: "Persona", type: "text", align: "left", placeholder: "Nombre" },
        { key: "monto", label: "Aporte", type: "money" },
        { key: "pct", label: "%", type: "pct", width: "70px" }
      ],
      template: { persona: "", monto: 0, pct: 50 },
      addLabel: "+ Agregar persona",
      emptyText: "Sin aportes cargados.",
      totalId: "total-alquiler", totalLabel: "Total",
      totalFn: function () { return U.fmtARS(U.sum(store.mesActual().alquiler, "monto")); }
    });

    var pCierre = panel("Cierre del mes");

    var inputBalAnt = h("input", { type: "text", inputmode: "decimal", id: "balance-anterior",
      value: U.fmtNum(store.mesActual().balanceAnterior, 0) });
    inputBalAnt.addEventListener("focus", function () { inputBalAnt.value = String(store.mesActual().balanceAnterior || ""); inputBalAnt.select(); });
    inputBalAnt.addEventListener("input", function () { store.setBalanceAnterior(U.parseNum(inputBalAnt.value)); BM.refreshDerived(); });
    inputBalAnt.addEventListener("blur", function () { inputBalAnt.value = U.fmtNum(store.mesActual().balanceAnterior, 0); });

    pCierre.appendChild(h("div", { class: "field-row" }, [
      h("label", { for: "balance-anterior", text: "Balance del mes anterior" }), inputBalAnt
    ]));

    BM.calcs["b-ingresos"] = function () { var c = store.calc(); return U.fmtARS(c.totalIngresos + c.gananciaProyectos); };
    BM.calcs["b-gastos"] = function () { return "−" + U.fmtARS(store.calc().totalGastos).replace("−", ""); };
    BM.calcs["b-mes"] = function () { return U.fmtARS(store.calc().balanceDelMes); };
    BM.calcs["b-final"] = function () { return U.fmtARS(store.calc().balanceFinal); };

    pCierre.appendChild(h("div", { class: "line-item" }, [h("span", { text: "Ingresos + freelance" }),
      h("span", { class: "num amt", dataset: { calc: "b-ingresos" } })]));
    pCierre.appendChild(h("div", { class: "line-item" }, [h("span", { text: "Gastos totales" }),
      h("span", { class: "num amt", style: "color:var(--negative)", dataset: { calc: "b-gastos" } })]));
    pCierre.appendChild(h("div", { class: "line-item" }, [h("span", { text: "Balance del mes" }),
      h("span", { class: "num amt", dataset: { calc: "b-mes" } })]));
    pCierre.appendChild(h("div", { class: "total-row" }, [h("span", { text: "Balance final" }),
      h("span", { class: "num", dataset: { calc: "b-final" } })]));

    cont.appendChild(h("div", { class: "panels" }, [h("div", {}, [pAlq]), h("div", {}, [pCierre])]));
  }

  /* =========================================================
     VISTA: AJUSTES
     ========================================================= */
  function renderAjustes() {
    var cont = document.getElementById("view-ajustes");
    cont.innerHTML = "";
    cont.appendChild(encabezado(vista("ajustes")));

    var pPersonas = panel("Personas");
    pPersonas.appendChild(h("p", { class: "panel-note",
      text: "Cada una tiene su columna en Tarjetas, para cargar cuánto puso cada quien. La primera de la lista sos vos: tu parte cuenta como gasto tuyo." }));
    var mountPer = h("div");
    pPersonas.appendChild(mountPer);
    BM.table.render(mountPer, {
      list: "personas",
      columns: [{ key: "nombre", label: "Nombre", type: "text", align: "left", placeholder: "Nombre" }],
      template: { nombre: "" },
      minRows: 1,
      addLabel: "+ Agregar persona",
      emptyText: "Agregá al menos una persona."
    });
    mountPer.addEventListener("focusout", function () { renderTarjetas(); });
    mountPer.addEventListener("click", function () { renderTarjetas(); });

    var pVivienda = panel("Vivienda");
    pVivienda.appendChild(h("p", { class: "panel-note",
      text: "Si vivís de alquiler o pagás una hipoteca, para que la vista Balance use el nombre correcto." }));
    var tabsVivienda = h("div", { class: "tabs" });
    [["alquiler", "Alquiler"], ["hipotecario", "Hipoteca"]].forEach(function (t) {
      tabsVivienda.appendChild(h("button", {
        class: "tab" + (store.getState().config.viviendaTipo === t[0] ? " active" : ""), text: t[1],
        onclick: function () { store.setViviendaTipo(t[0]); renderAjustes(); renderBalance(); }
      }));
    });
    pVivienda.appendChild(tabsVivienda);

    var pTarjetas = panel("Tarjetas");
    pTarjetas.appendChild(h("p", { class: "panel-note", text: "Cada una tiene su propia sección en Tarjetas, con sus consumos en pesos y en dólares." }));
    var mountTar = h("div");
    pTarjetas.appendChild(mountTar);
    BM.table.render(mountTar, {
      list: "tarjetas",
      columns: [{ key: "nombre", label: "Nombre", type: "text", align: "left", placeholder: "Visa, Mastercard…" }],
      template: { nombre: "" },
      minRows: 1,
      addLabel: "+ Agregar tarjeta",
      emptyText: "Agregá al menos una tarjeta."
    });
    mountTar.addEventListener("focusout", function () { renderTarjetas(); });
    mountTar.addEventListener("click", function () { renderTarjetas(); });

    var pMeses = panel("Meses");
    pMeses.appendChild(h("p", { class: "panel-note",
      text: "Al crear un mes nuevo podés copiar los gastos fijos y arrastrar el balance final del mes actual." }));
    pMeses.appendChild(h("div", { class: "btn-row" }, [
      h("button", { class: "btn primary", text: "+ Nuevo mes", onclick: abrirDialogMes }),
      h("button", { class: "btn", text: "Borrar el mes actual", onclick: function () {
        var id = store.getState().mesActivo;
        if (store.mesesOrdenados().length <= 1) { toast("Tiene que quedar al menos un mes"); return; }
        var copia = JSON.parse(JSON.stringify(store.mesActual()));
        store.borrarMes(id);
        renderTodo();
        toast("Borraste " + U.monthLabel(id), "Deshacer", function () {
          store.getState().meses[id] = copia; store.setMesActivo(id); renderTodo();
        });
      } })
    ]));

    var usuario = BM.nube && BM.nube.usuario;
    var pCuenta = null;
    if (usuario) {
      pCuenta = panel("Tu cuenta");
      pCuenta.appendChild(h("p", { class: "panel-note",
        text: "Entraste como " + (usuario.email || usuario.displayName) + ". Tus datos se guardan en la nube y los ves igual en la compu y en el celular." }));
      pCuenta.appendChild(h("div", { class: "btn-row" }, [
        h("button", { class: "btn", text: "Cerrar sesión", onclick: function () { BM.nube.salir(); } })
      ]));
    }

    var pDatos = panel("Tus datos");
    pDatos.appendChild(h("p", { class: "panel-note", text: usuario
      ? "Bajá una copia para tener respaldo, o importá un archivo: reemplaza todos tus datos por los del archivo."
      : "Todo se guarda en este dispositivo. Exportá el archivo para pasarlo a otro o para tener respaldo." }));

    var fileInput = h("input", { type: "file", accept: "application/json", style: "display:none", id: "import-file" });
    fileInput.addEventListener("change", function () {
      var f = fileInput.files[0];
      if (!f) return;
      var reader = new FileReader();
      reader.onload = function () {
        try {
          var copia = JSON.stringify(store.getState());
          store.importJSON(reader.result); renderTodo();
          toast("Datos importados: " + store.mesesOrdenados().length + " meses", "Deshacer", function () { store.importJSON(copia); renderTodo(); });
        }
        catch (err) { toast("No pude leer ese archivo"); }
      };
      reader.readAsText(f);
      fileInput.value = "";
    });

    pDatos.appendChild(h("div", { class: "btn-row" }, [
      h("button", { class: "btn", text: "Descargar copia (JSON)", onclick: function () {
        try {
          var blob = new Blob([store.exportJSON()], { type: "application/json" });
          var a = document.createElement("a");
          a.href = URL.createObjectURL(blob);
          a.download = "balance-mensual-" + new Date().toISOString().slice(0, 10) + ".json";
          document.body.appendChild(a); a.click(); document.body.removeChild(a);
          setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
        } catch (e) { toast("La descarga no está disponible acá; usá “Copiar”"); }
      } }),
      h("button", { class: "btn", text: "Copiar al portapapeles", onclick: function () {
        var texto = store.exportJSON();
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(texto).then(function () { toast("JSON copiado"); },
            function () { toast("No pude copiar"); });
        } else { toast("No pude copiar"); }
      } }),
      h("button", { class: "btn", text: "Importar archivo", onclick: function () { fileInput.click(); } }),
      fileInput,
      usuario ? null : h("button", { class: "btn ghost", text: "Volver a los datos de ejemplo", onclick: function () {
        var copia = JSON.stringify(store.getState());
        store.resetear(); renderTodo();
        toast("Volviste al ejemplo", "Deshacer", function () { store.importJSON(copia); renderTodo(); });
      } })
    ]));

    cont.appendChild(h("div", { class: "panels" }, [h("div", {}, [pCuenta, pPersonas, pDatos]), h("div", {}, [pTarjetas, pVivienda, pMeses])]));
  }

  /* =========================================================
     DIALOG: nuevo mes
     ========================================================= */
  function construirDialogMes() {
    var dlg = h("dialog", { id: "dlg-mes" });
    var selMes = h("select", { id: "nm-mes" });
    U.MESES.forEach(function (m, i) { selMes.appendChild(h("option", { value: String(i), text: m })); });
    var inpAnio = h("input", { type: "number", id: "nm-anio", min: "2020", max: "2100", style: "width:100px" });

    var inner = h("div", { class: "dialog-inner" }, [
      h("h3", { text: "Nuevo mes" }),
      h("p", { text: "Elegí el mes y qué querés traer del mes actual." }),
      h("div", { class: "field-row" }, [h("label", { for: "nm-mes", text: "Mes" }), selMes]),
      h("div", { class: "field-row" }, [h("label", { for: "nm-anio", text: "Año" }), inpAnio]),
      h("label", { class: "check-row" }, [h("input", { type: "checkbox", id: "nm-fijos", checked: "checked" }),
        h("span", { text: "Copiar gastos fijos y alquiler (con sus montos)" })]),
      h("label", { class: "check-row" }, [h("input", { type: "checkbox", id: "nm-tarjetas", checked: "checked" }),
        h("span", { text: "Copiar los consumos fijos de tarjeta (propia y de otros) y las cuotas que siguen (avanzando la cuota)" })]),
      h("label", { class: "check-row" }, [h("input", { type: "checkbox", id: "nm-ingresos", checked: "checked" }),
        h("span", { text: "Copiar los ingresos" })]),
      h("label", { class: "check-row" }, [h("input", { type: "checkbox", id: "nm-estructura", checked: "checked" }),
        h("span", { text: "Copiar la lista de gastos variables y proyectos, en cero" })]),
      h("label", { class: "check-row" }, [h("input", { type: "checkbox", id: "nm-balance", checked: "checked" }),
        h("span", { text: "Arrastrar el balance, el ahorro y la inversión acumulados de este mes" })]),
      h("div", { class: "dialog-actions" }, [
        h("button", { class: "btn ghost", text: "Cancelar", onclick: function () { dlg.close(); } }),
        h("button", { class: "btn primary", text: "Crear mes", onclick: function () {
          var id = U.monthId(parseInt(inpAnio.value, 10) || new Date().getFullYear(), parseInt(selMes.value, 10));
          store.crearMes(id, {
            copiarFijos: document.getElementById("nm-fijos").checked,
            copiarTarjetas: document.getElementById("nm-tarjetas").checked,
            copiarIngresos: document.getElementById("nm-ingresos").checked,
            copiarEstructura: document.getElementById("nm-estructura").checked,
            arrastrarBalance: document.getElementById("nm-balance").checked
          });
          dlg.close();
          renderTodo();
          toast(U.monthLabel(id) + " creado");
        } })
      ])
    ]);
    dlg.appendChild(inner);
    return dlg;
  }

  function abrirDialogMes() {
    var actual = store.getState().mesActivo.split("-");
    var mesIdx = parseInt(actual[1], 10);           /* siguiente mes por defecto */
    var anio = parseInt(actual[0], 10);
    if (mesIdx > 11) { mesIdx = 0; anio += 1; }
    document.getElementById("nm-mes").value = String(mesIdx);
    document.getElementById("nm-anio").value = String(anio);
    document.getElementById("dlg-mes").showModal();
  }

  /* =========================================================
     Recalculo de todo lo derivado, sin re-render de inputs
     ========================================================= */
  BM.refreshDerived = function () {
    document.querySelectorAll("[data-calc]").forEach(function (nodo) {
      var fn = BM.calcs[nodo.dataset.calc];
      if (fn) nodo.textContent = fn();
    });
    var c = store.calc();
    document.querySelectorAll("input[data-auto]").forEach(function (inp) {
      var tipo = inp.dataset.auto;
      inp.value = U.fmtNum(c.montoDeFila({ auto: tipo }), 0);
    });
    document.querySelectorAll("input[data-calc-cell]").forEach(function (inp) {
      if (inp._compute && inp._row) inp.value = inp._compute(inp._row);
    });
    if (vistaActiva === "resumen") renderResumen();
    if (vistaActiva === "presupuesto") dibujarPresupuesto();
  };

  function renderTodo() {
    sincronizarSelects();
    renderResumen();
    renderIngresos();
    renderFreelance();
    renderGastos();
    renderPresupuesto();
    renderTarjetas();
    renderBalance();
    renderAjustes();
    var cantMeses = store.mesesOrdenados().length;
    var usuario = BM.nube && BM.nube.usuario;
    document.getElementById("sidebar-foot").textContent =
      cantMeses + (cantMeses === 1 ? " mes cargado" : " meses cargados") +
      (usuario ? ". " + (usuario.email || "") : ", guardados en este dispositivo.");
    pintarSync();
    irA(vistaActiva);
    /* los totales con data-calc nacen vacíos: se llenan acá y en cada cambio */
    BM.refreshDerived();
  }

  /* ---------------- estado de guardado ---------------- */
  var TEXTO_SYNC = {
    local: "",
    guardando: "Guardando…",
    guardado: "Guardado en la nube",
    "sin-conexion": "Sin conexión: se guarda cuando vuelva",
    error: "No se pudo guardar"
  };
  function pintarSync() {
    var sync = store.getSync();
    ["sync-desktop", "sync-mobile"].forEach(function (id) {
      var n = document.getElementById(id);
      if (!n) return;
      n.dataset.estado = sync.estado;
      n.textContent = id === "sync-desktop" ? TEXTO_SYNC[sync.estado] : "";
      n.title = TEXTO_SYNC[sync.estado] + (sync.error ? " (" + sync.error + ")" : "");
      n.setAttribute("aria-label", n.title);
    });
  }
  BM.alCambiarSync = pintarSync;

  /* ---------------- login ---------------- */
  function pantallaLogin(mensaje) {
    var app = document.getElementById("app");
    app.innerHTML = "";
    var error = h("p", { class: "login-error", role: "alert", text: mensaje || "" });
    var boton = h("button", { class: "btn primary login-btn", html:
      '<svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>' +
      "<span>Entrar con Google</span>",
      onclick: function () {
        boton.disabled = true;
        error.textContent = "";
        BM.nube.entrar().catch(function (err) {
          boton.disabled = false;
          if (err && err.code === "auth/popup-closed-by-user") return;
          error.textContent = "No se pudo entrar: " + ((err && err.message) || "probá de nuevo");
        });
      } });
    app.appendChild(h("main", { class: "login" }, [
      h("div", { class: "login-caja" }, [
        h("span", { class: "brand-mark login-mark" }),
        h("h1", { text: "Balance" }),
        h("p", { class: "login-bajada", text: "Tus ingresos, gastos, tarjetas y freelance, mes a mes. En la compu y en el celular." }),
        boton,
        error
      ])
    ]));
  }

  function pantallaCargando() {
    document.getElementById("app").innerHTML = '<main class="login" aria-busy="true"><div class="login-caja"><span class="brand-mark login-mark"></span></div></main>';
  }

  /* ---------------- arranque ---------------- */
  function abrirApp() {
    var desdeUrl = location.hash.slice(1);
    if (vista(desdeUrl)) vistaActiva = desdeUrl;
    construirShell();
    renderTodo();
  }

  function sincronizarYPintar() {
    store.sincronizar().then(function (cambio) {
      /* no redibujar mientras se está escribiendo en un campo */
      var editando = document.activeElement && /INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName);
      if (cambio && !editando) renderTodo();
    });
  }

  function iniciar() {
    var nube = BM.nube;
    if (!nube || !nube.configurada) {
      /* sin Firebase (o abierto como archivo): todo local, como siempre */
      store.load();
      abrirApp();
      return;
    }
    if (!nube.disponible) {
      /* sin conexión y sin el SDK en cache: se abre la cache de la última cuenta y se sube después */
      var ultimo = null;
      try { ultimo = localStorage.getItem("balance-mensual:v1:ultimo-uid"); } catch (e) { /* nada */ }
      if (ultimo) { store.abrirUsuario(ultimo); abrirApp(); }
      else pantallaLogin("Hace falta conexión para entrar la primera vez.");
      return;
    }
    pantallaCargando();
    var uidAbierto = null;
    nube.iniciar(function (usuario) {
      if (!usuario) {
        uidAbierto = null;
        store.cerrarUsuario();
        pantallaLogin();
        return;
      }
      if (usuario.uid === uidAbierto) return;
      uidAbierto = usuario.uid;
      store.abrirUsuario(usuario.uid);
      abrirApp();
      sincronizarYPintar();
    });
    document.addEventListener("visibilitychange", function () {
      if (document.visibilityState === "visible" && nube.usuario) sincronizarYPintar();
    });
    global.addEventListener("online", function () { if (nube.usuario) sincronizarYPintar(); });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", iniciar);
  } else {
    iniciar();
  }
})(window);
