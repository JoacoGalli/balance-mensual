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
    tarjetas: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2.5" y="5" width="19" height="14" rx="2"/><path d="M2.5 10 H21.5"/><path d="M6 15 H10"/></svg>',
    balance: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2 V22"/><path d="M5 6 H19"/><path d="M5 6 L2.5 12 A2.5 3 0 0 0 7.5 12 Z"/><path d="M19 6 L16.5 12 A2.5 3 0 0 0 21.5 12 Z"/></svg>',
    ajustes: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 2.5v3M12 18.5v3M21.5 12h-3M5.5 12h-3M18.7 5.3l-2.1 2.1M7.4 16.6l-2.1 2.1M18.7 18.7l-2.1-2.1M7.4 7.4L5.3 5.3"/></svg>'
  };

  var VISTAS = [
    { id: "resumen",  label: "Resumen",  titulo: "Resumen",             sub: "La foto del mes: qué entró, qué salió y con cuánto cerrás." },
    { id: "ingresos", label: "Ingresos", titulo: "Ingresos y proyectos", sub: "Sueldo, freelance y el balance propio de cada proyecto personal." },
    { id: "gastos",   label: "Gastos",   titulo: "Gastos",               sub: "Separados en fijos y variables para ver qué es negociable." },
    { id: "tarjetas", label: "Tarjetas", titulo: "Tarjetas",             sub: "Visa en pesos y en dólares, con el corte por persona y las cuotas." },
    { id: "balance",  label: "Balance",  titulo: "Alquiler y balance",   sub: "El reparto del alquiler y cómo cierra el mes." },
    { id: "ajustes",  label: "Ajustes",  titulo: "Ajustes",              sub: "Personas, meses y copia de seguridad de tus datos." }
  ];

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
        h("div", {}, [h("h1", { text: "Balance" }), h("span", { text: "gastos y proyectos" })])
      ]),
      h("div", { class: "month-picker" }, [
        h("select", { id: "month-select", "aria-label": "Mes" }),
        h("div", { class: "dolar-row" }, [
          h("label", { for: "dolar-input", text: "Dólar del mes" }),
          h("input", { id: "dolar-input", type: "text", inputmode: "decimal" })
        ])
      ]),
      h("nav", { class: "primary-nav", id: "nav-desktop" }),
      h("div", { class: "sidebar-foot", id: "sidebar-foot" })
    ]);

    var main = h("main", { class: "content" }, [
      h("div", { class: "mobile-topbar" }, [
        h("div", { class: "brand" }, [h("span", { class: "brand-mark" }), h("h1", { text: "Balance", style: "font-size:1.05rem" })]),
        h("select", { id: "month-select-mobile", "aria-label": "Mes" })
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
    vistaActiva = id;
    document.querySelectorAll(".view").forEach(function (v) { v.classList.toggle("active", v.id === "view-" + id); });
    document.querySelectorAll(".nav-item").forEach(function (b) { b.classList.toggle("active", b.dataset.view === id); });
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
    cont.appendChild(encabezado(VISTAS[0]));

    var c = store.calc();
    var mes = store.mesActual();

    function tile(cls, label, valor, sub) {
      return h("div", { class: "tile " + cls }, [
        h("div", { class: "label", text: label }),
        h("div", { class: "value num", text: valor }),
        h("div", { class: "sub", text: sub })
      ]);
    }

    cont.appendChild(h("div", { class: "tiles" }, [
      tile("accent", "Ingresos", U.fmtARS(c.totalIngresos), "sueldo + freelance"),
      tile("", "Gastos", U.fmtARS(c.totalGastos), c.pctFijos + "% son fijos"),
      tile(c.gananciaProyectos >= 0 ? "positive" : "negative", "Proyectos", U.fmtARS(c.gananciaProyectos),
           c.proyectos.length + (c.proyectos.length === 1 ? " proyecto activo" : " proyectos activos")),
      tile(c.balanceDelMes >= 0 ? "positive" : "negative", "Balance del mes", U.fmtARS(c.balanceDelMes),
           "acumulado: " + U.fmtARS(c.balanceFinal))
    ]));

    /* --- gráfico de balance --- */
    var pChart = panel("Balance de los últimos meses");
    var chartBox = h("div", { id: "chart-balance" });
    pChart.appendChild(chartBox);
    pChart.appendChild(h("div", { class: "chart-caption" }, [
      h("span", { html: '<span class="dot" style="background:var(--positive)"></span>Mes a favor' }),
      h("span", { html: '<span class="dot" style="background:var(--negative)"></span>Mes en contra' })
    ]));

    /* --- fijos vs variables --- */
    var pSplit = panel("Fijos vs. variables", h("span", { class: "count", text: c.pctFijos + "% fijos" }));
    pSplit.appendChild(h("div", { class: "split-bar" }, [
      h("div", { style: "width:" + c.pctFijos + "%;background:var(--accent)" }),
      h("div", { style: "width:" + (100 - c.pctFijos) + "%;background:var(--warning)" })
    ]));
    pSplit.appendChild(h("div", { class: "split-legend" }, [
      h("span", { html: '<span class="dot" style="background:var(--accent)"></span>Fijos ' + U.fmtARS(c.totalFijos) }),
      h("span", { html: '<span class="dot" style="background:var(--warning)"></span>Variables ' + U.fmtARS(c.totalVariables) })
    ]));

    /* --- cuotas --- */
    var pCuotas = panel("Cuotas en curso");
    var conCuota = (mes.tarjetaPesos || []).filter(function (t) { return t.cuota; })
      .map(function (t) { return { desc: t.desc, cuota: t.cuota, monto: (Number(t.p1) || 0) + (Number(t.p2) || 0), moneda: "ARS" }; })
      .concat((mes.tarjetaDolares || []).filter(function (t) { return t.cuota; })
        .map(function (t) { return { desc: t.desc, cuota: t.cuota, monto: (Number(t.p1) || 0) + (Number(t.p2) || 0), moneda: "USD" }; }));

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
    var pProy = panel("Proyectos personales");
    if (!c.proyectos.length) {
      pProy.appendChild(h("p", { class: "panel-note", text: "Sin proyectos cargados este mes." }));
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
      var x = padL + i * bw + bw * 0.24;
      var ancho = bw * 0.52;
      var alto = Math.abs(d.valor) * escala;
      var y = d.valor >= 0 ? zeroY - alto : zeroY;
      var color = d.valor >= 0 ? "var(--positive)" : "var(--negative)";
      svg += '<rect x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + ancho.toFixed(1) +
             '" height="' + Math.max(alto, 2).toFixed(1) + '" rx="3" fill="' + color + '"/>';
      var etiquetaY = d.valor >= 0 ? y - 5 : y + Math.max(alto, 2) + 11;
      var texto = Math.abs(d.valor) >= 1000 ? Math.round(d.valor / 1000) + "k" : Math.round(d.valor);
      svg += '<text x="' + (x + ancho / 2).toFixed(1) + '" y="' + etiquetaY.toFixed(1) +
             '" text-anchor="middle" font-size="9" font-family="JetBrains Mono, monospace" fill="var(--ink-2)">' + texto + '</text>';
      svg += '<text x="' + (x + ancho / 2).toFixed(1) + '" y="' + (hgt - 5) +
             '" text-anchor="middle" font-size="9.5" font-family="Public Sans, sans-serif" fill="var(--ink-3)">' + d.label + '</text>';
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
    cont.appendChild(encabezado(VISTAS[1]));

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

    /* ahorros */
    var pAho = panel("Ahorros");
    var mountAho = h("div");
    pAho.appendChild(mountAho);
    BM.table.render(mountAho, {
      list: "ahorros",
      columns: [
        { key: "desc", label: "Descripción", type: "text", align: "left", placeholder: "A dónde va" },
        { key: "monto", label: "Monto", type: "money" }
      ],
      template: { desc: "", monto: 0 },
      addLabel: "+ Agregar ahorro",
      emptyText: "Sin ahorros cargados este mes.",
      totalId: "total-ahorros", totalLabel: "Total ahorrado",
      totalFn: function () { return U.fmtARS(store.calc().totalAhorros); }
    });

    cont.appendChild(h("div", { class: "panels" }, [h("div", {}, [pIng]), h("div", {}, [pAho])]));

    /* proyectos */
    var btnNuevo = h("button", {
      class: "btn", text: "+ Nuevo proyecto",
      onclick: function () { store.addProyecto("Proyecto nuevo"); renderIngresos(); BM.refreshDerived(); }
    });
    var pProy = panel("Proyectos personales", btnNuevo);
    pProy.appendChild(h("p", { class: "panel-note", text: "Cada proyecto lleva sus propios ingresos y gastos. La ganancia neta se suma al balance del mes." }));

    var proyectos = store.mesActual().proyectos || [];
    if (!proyectos.length) {
      pProy.appendChild(h("p", { class: "panel-note", text: "Todavía no agregaste ningún proyecto." }));
    }

    proyectos.forEach(function (p) {
      var card = h("div", { class: "project-card" });

      var inputNombre = h("input", { type: "text", value: p.nombre, "aria-label": "Nombre del proyecto" });
      inputNombre.addEventListener("input", function () { store.updateProyecto(p.id, inputNombre.value); BM.refreshDerived(); });

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
          renderIngresos(); BM.refreshDerived();
          toast("Proyecto borrado", "Deshacer", function () {
            store.mesActual().proyectos.push(copia); store.emit(); renderIngresos(); BM.refreshDerived();
          });
        }
      });

      card.appendChild(h("div", { class: "project-head" }, [inputNombre, neto, borrar]));

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
      pProy.appendChild(h("div", { class: "total-row" }, [h("span", { text: "Ganancia neta de proyectos" }), totalProy]));
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
    cont.appendChild(encabezado(VISTAS[2]));

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
     VISTA: TARJETAS
     ========================================================= */
  var tabTarjeta = "tarjetaPesos";

  function renderTarjetas() {
    var cont = document.getElementById("view-tarjetas");
    cont.innerHTML = "";
    cont.appendChild(encabezado(VISTAS[3]));

    var tabs = h("div", { class: "tabs" });
    [["tarjetaPesos", "Pesos"], ["tarjetaDolares", "Dólares"]].forEach(function (t) {
      tabs.appendChild(h("button", {
        class: "tab" + (tabTarjeta === t[0] ? " active" : ""), text: t[1],
        onclick: function () { tabTarjeta = t[0]; renderTarjetas(); }
      }));
    });
    cont.appendChild(tabs);

    var esPesos = tabTarjeta === "tarjetaPesos";
    var per = store.personas();
    var p = panel("Visa · " + (esPesos ? "Pesos" : "Dólares"));
    p.appendChild(h("p", { class: "panel-note", text: "Cargá cada consumo con el monto de cada uno. En “Cuota” escribí por ejemplo 2/6." }));

    var mount = h("div");
    p.appendChild(mount);
    BM.table.render(mount, {
      list: tabTarjeta,
      columns: [
        { key: "desc", label: "Descripción", type: "text", align: "left", placeholder: "Consumo" },
        { key: "p1", label: per.p1, type: esPesos ? "money" : "usd" },
        { key: "p2", label: per.p2, type: esPesos ? "money" : "usd" },
        { key: "cuota", label: "Cuota", type: "cuota", placeholder: "—", width: "78px" }
      ],
      template: { desc: "", p1: 0, p2: 0, cuota: "" },
      addLabel: "+ Agregar consumo",
      emptyText: "Sin consumos cargados.",
      totalId: "total-" + tabTarjeta, totalLabel: "Total",
      totalFn: function () {
        var c = store.calc();
        return esPesos ? U.fmtARS(c.totalTarjetaPesos) : U.fmtUSD(c.totalTarjetaDolares);
      }
    });
    cont.appendChild(p);

    var pTot = panel("Cómo se reparte");
    var fmt = esPesos ? U.fmtARS : U.fmtUSD;
    BM.calcs["tar-p1"] = function () { var c = store.calc(); return fmt(esPesos ? c.tarjetaP1Pesos : c.tarjetaP1Usd); };
    BM.calcs["tar-p2"] = function () { var c = store.calc(); return fmt(esPesos ? c.tarjetaP2Pesos : c.tarjetaP2Usd); };
    BM.calcs["tar-total"] = function () { var c = store.calc(); return fmt(esPesos ? c.totalTarjetaPesos : c.totalTarjetaDolares); };
    pTot.appendChild(h("div", { class: "line-item" }, [h("span", { text: per.p1 }), h("span", { class: "num amt", dataset: { calc: "tar-p1" } })]));
    pTot.appendChild(h("div", { class: "line-item" }, [h("span", { text: per.p2 }), h("span", { class: "num amt", dataset: { calc: "tar-p2" } })]));
    pTot.appendChild(h("div", { class: "total-row" }, [h("span", { text: "Total del resumen" }), h("span", { class: "num", dataset: { calc: "tar-total" } })]));
    if (!esPesos) {
      pTot.appendChild(h("p", { class: "panel-note", style: "margin-top:12px",
        text: "En Gastos podés tener una fila “auto” que pesifica este total con el dólar del mes." }));
    }
    cont.appendChild(pTot);
  }

  /* =========================================================
     VISTA: ALQUILER Y BALANCE
     ========================================================= */
  function renderBalance() {
    var cont = document.getElementById("view-balance");
    cont.innerHTML = "";
    cont.appendChild(encabezado(VISTAS[4]));

    var pAlq = panel("Alquiler compartido");
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

    pCierre.appendChild(h("div", { class: "line-item" }, [h("span", { text: "Ingresos + proyectos" }),
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
    cont.appendChild(encabezado(VISTAS[5]));

    var per = store.personas();

    var pPersonas = panel("Personas");
    pPersonas.appendChild(h("p", { class: "panel-note", text: "Los nombres que se usan en las columnas de tarjetas." }));
    ["p1", "p2"].forEach(function (slot, i) {
      var inp = h("input", { type: "text", value: per[slot], id: "persona-" + slot });
      inp.addEventListener("input", function () { store.setPersona(slot, inp.value); });
      inp.addEventListener("blur", function () { renderTarjetas(); });
      pPersonas.appendChild(h("div", { class: "field-row" }, [
        h("label", { for: "persona-" + slot, text: "Persona " + (i + 1) }), inp
      ]));
    });

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

    var pDatos = panel("Tus datos");
    pDatos.appendChild(h("p", { class: "panel-note",
      text: "Por ahora todo se guarda en este dispositivo. Exportá el archivo para pasarlo a otro o para tener respaldo." }));

    var fileInput = h("input", { type: "file", accept: "application/json", style: "display:none", id: "import-file" });
    fileInput.addEventListener("change", function () {
      var f = fileInput.files[0];
      if (!f) return;
      var reader = new FileReader();
      reader.onload = function () {
        try { store.importJSON(reader.result); renderTodo(); toast("Datos importados"); }
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
      h("button", { class: "btn ghost", text: "Volver a los datos de ejemplo", onclick: function () {
        var copia = JSON.stringify(store.getState());
        store.resetear(); renderTodo();
        toast("Volviste al ejemplo", "Deshacer", function () { store.importJSON(copia); renderTodo(); });
      } })
    ]));

    cont.appendChild(h("div", { class: "panels" }, [h("div", {}, [pPersonas, pDatos]), h("div", {}, [pMeses])]));
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
      h("label", { class: "check-row" }, [h("input", { type: "checkbox", id: "nm-ingresos", checked: "checked" }),
        h("span", { text: "Copiar los ingresos" })]),
      h("label", { class: "check-row" }, [h("input", { type: "checkbox", id: "nm-estructura", checked: "checked" }),
        h("span", { text: "Copiar la estructura de variables, tarjetas y proyectos, en cero" })]),
      h("label", { class: "check-row" }, [h("input", { type: "checkbox", id: "nm-balance", checked: "checked" }),
        h("span", { text: "Arrastrar el balance final de este mes" })]),
      h("div", { class: "dialog-actions" }, [
        h("button", { class: "btn ghost", text: "Cancelar", onclick: function () { dlg.close(); } }),
        h("button", { class: "btn primary", text: "Crear mes", onclick: function () {
          var id = U.monthId(parseInt(inpAnio.value, 10) || new Date().getFullYear(), parseInt(selMes.value, 10));
          store.crearMes(id, {
            copiarFijos: document.getElementById("nm-fijos").checked,
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
      var valor = tipo === "tarjetaPesos" ? c.totalTarjetaPesos : c.totalTarjetaDolares * c.dolar;
      inp.value = U.fmtNum(valor, 0);
    });
    document.querySelectorAll("input[data-calc-cell]").forEach(function (inp) {
      if (inp._compute && inp._row) inp.value = inp._compute(inp._row);
    });
    if (vistaActiva === "resumen") renderResumen();
  };

  function renderTodo() {
    sincronizarSelects();
    renderResumen();
    renderIngresos();
    renderGastos();
    renderTarjetas();
    renderBalance();
    renderAjustes();
    document.getElementById("sidebar-foot").textContent =
      "Guardado en este dispositivo · " + store.mesesOrdenados().length + " meses cargados";
    irA(vistaActiva);
  }

  /* ---------------- arranque ---------------- */
  function iniciar() {
    store.load();
    construirShell();
    renderTodo();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", iniciar);
  } else {
    iniciar();
  }
})(window);
