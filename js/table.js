/* =========================================================
   table.js — componente de tabla editable reutilizable
   Toda tabla de la app se arma con esto: nombres y valores
   se editan in-place, se agregan y borran filas.
   Expone: window.BM.table.render(mountEl, config)
   ========================================================= */
(function (global) {
  "use strict";

  var BM = global.BM;
  var U = BM.utils;
  var store = BM.store;

  /* Registro de valores calculados: id -> función que devuelve texto.
     app.js llama a BM.refreshDerived() después de cada cambio. */
  BM.calcs = BM.calcs || {};

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
  }

  function valorMostrado(row, col, cfg) {
    var raw = row[col.key];
    if (col.type === "money") return raw ? U.fmtNum(raw, 0) : "";
    if (col.type === "usd") return raw ? U.fmtNum(raw, 2) : "";
    if (col.type === "pct") return raw !== undefined && raw !== "" ? String(raw) : "";
    return raw === undefined || raw === null ? "" : String(raw);
  }

  function esNumerica(col) {
    return col.type === "money" || col.type === "usd" || col.type === "pct";
  }

  /* Al editar una celda numérica se ve la cuenta ("=20+23"), no el resultado —
     como en una planilla de cálculo. */
  function valorEdicion(row, col) {
    if (esNumerica(col) && row[col.key + "Formula"]) return row[col.key + "Formula"];
    var raw = row[col.key];
    if (esNumerica(col)) {
      if (!raw) return "";
      return String(raw).replace(".", ",");
    }
    return raw === undefined || raw === null ? "" : String(raw);
  }

  /* Calculadora de 4 operaciones para las celdas numéricas: "=20+23" -> 43.
     Sin eval ni Function: un parser chico que solo entiende +, -, *, /, paréntesis
     y números con coma o punto decimal. */
  function evaluarFormula(expr) {
    var i = 0;
    function saltarEspacios() { while (expr[i] === " ") i++; }
    function numero() {
      saltarEspacios();
      var inicio = i;
      while (i < expr.length && /[0-9.,]/.test(expr[i])) i++;
      if (i === inicio) throw new Error("número esperado");
      var texto = expr.slice(inicio, i).replace(",", ".");
      var n = parseFloat(texto);
      if (isNaN(n)) throw new Error("número inválido");
      return n;
    }
    function factor() {
      saltarEspacios();
      if (expr[i] === "(") {
        i++;
        var v = expresion();
        saltarEspacios();
        if (expr[i] !== ")") throw new Error("falta un paréntesis");
        i++;
        return v;
      }
      if (expr[i] === "-") { i++; return -factor(); }
      if (expr[i] === "+") { i++; return factor(); }
      return numero();
    }
    function termino() {
      var v = factor();
      for (;;) {
        saltarEspacios();
        if (expr[i] === "*") { i++; v *= factor(); }
        else if (expr[i] === "/") { i++; v /= factor(); }
        else break;
      }
      return v;
    }
    function expresion() {
      var v = termino();
      for (;;) {
        saltarEspacios();
        if (expr[i] === "+") { i++; v += termino(); }
        else if (expr[i] === "-") { i++; v -= termino(); }
        else break;
      }
      return v;
    }
    var resultado = expresion();
    saltarEspacios();
    if (i !== expr.length) throw new Error("sobran caracteres");
    if (!isFinite(resultado)) throw new Error("resultado inválido");
    return Math.round(resultado * 1e6) / 1e6;
  }

  function render(mount, cfg) {
    mount.innerHTML = "";

    var rows = store.getList(cfg.list, cfg.proyectoId);
    if (cfg.filtro) rows = rows.filter(cfg.filtro);
    /* algunas listas necesitan que siempre quede al menos una fila (ej. personas) */
    var puedeBorrar = !cfg.minRows || rows.length > cfg.minRows;
    var scroll = el("div", "table-scroll");
    var table = el("table", "etable");

    /* ---- encabezado ---- */
    var thead = el("thead");
    var trh = el("tr");
    cfg.columns.forEach(function (col) {
      var th = el("th", col.align === "left" ? "left" : "", col.label);
      if (col.width) th.style.width = col.width;
      trh.appendChild(th);
    });
    trh.appendChild(el("th", "", ""));
    thead.appendChild(trh);
    table.appendChild(thead);

    /* ---- cuerpo ---- */
    var tbody = el("tbody");
    table.appendChild(tbody);

    function pintarFila(row) {
      var tr = el("tr");
      tr.dataset.rowId = row.id;

      cfg.columns.forEach(function (col, colIndex) {
        var td = el("td", col.align === "left" ? "left" : "");

        /* select: moneda (ARS/USD) u "opciones" con col.options = [[valor, texto], ...] */
        if (col.type === "moneda" || col.type === "opciones") {
          var sel = document.createElement("select");
          sel.className = "cell-input" + (col.type === "opciones" ? " opciones" : "");
          sel.setAttribute("aria-label", col.label);
          var opciones = col.type === "moneda" ? [["ARS", "ARS"], ["USD", "USD"]]
            : (typeof col.options === "function" ? col.options() : col.options);
          var actual = row[col.key] || opciones[0][0];
          opciones.forEach(function (op) {
            var o = document.createElement("option");
            o.value = op[0]; o.textContent = op[1];
            if (actual === op[0]) o.selected = true;
            sel.appendChild(o);
          });
          sel.addEventListener("change", function () {
            store.updateRow(cfg.list, row.id, col.key, sel.value, cfg.proyectoId);
            BM.refreshDerived();
          });
          td.appendChild(sel);
          tr.appendChild(td);
          return;
        }

        /* tilde (ej. consumo fijo de tarjeta) */
        if (col.type === "check") {
          var chk = document.createElement("input");
          chk.type = "checkbox";
          chk.className = "cell-check";
          chk.checked = !!row[col.key];
          chk.setAttribute("aria-label", col.label + (row.desc ? ": " + row.desc : ""));
          if (col.title) chk.title = col.title;
          /* las filas "auto" no tienen plata propia (toman el monto de otro lado):
             no aplica marcarlas, así que la casilla queda deshabilitada */
          if (col.key !== "fijo" && row.auto) {
            chk.disabled = true;
            chk.title = "No aplica: el monto de esta fila sale de Tarjetas";
          }
          chk.addEventListener("change", function () {
            store.updateRow(cfg.list, row.id, col.key, chk.checked, cfg.proyectoId);
            BM.refreshDerived();
          });
          td.className = "col-check";
          td.appendChild(chk);
          tr.appendChild(td);
          return;
        }

        /* columna calculada de solo lectura (ej. el equivalente en pesos) */
        if (col.type === "calc") {
          var calcInput = document.createElement("input");
          calcInput.type = "text";
          calcInput.className = "cell-input money";
          calcInput.readOnly = true;
          calcInput.setAttribute("aria-label", col.label);
          calcInput.dataset.calcCell = "1";
          calcInput._compute = col.compute;
          calcInput._row = row;
          calcInput.value = col.compute(row);
          td.appendChild(calcInput);
          tr.appendChild(td);
          return;
        }

        var input = document.createElement("input");
        input.type = "text";
        input.className = "cell-input" + (col.type === "money" || col.type === "usd" || col.type === "pct" ? " money" : "") +
                          (col.type === "cuota" ? " cuota" : "");
        input.placeholder = col.placeholder || "";
        input.setAttribute("aria-label", col.label);

        /* Filas automáticas (totales de tarjeta): solo lectura */
        var esAuto = row.auto && (col.type === "money" || col.type === "usd");
        if (esAuto) {
          input.readOnly = true;
          input.dataset.auto = row.auto;
          input.value = U.fmtNum(store.calc().montoDeFila(row), 0);
        } else {
          input.value = valorMostrado(row, col, cfg);
        }

        if (col.type === "money" || col.type === "usd" || col.type === "pct") {
          input.inputMode = "decimal";
        }

        if (!esAuto) {
          input.addEventListener("focus", function () {
            input.value = valorEdicion(row, col);
            /* con una cuenta cargada, el cursor va al final para poder seguir sumando
               ("=20+23" -> "=20+23+10"); si no, se selecciona todo para reemplazar rápido */
            if (esNumerica(col) && row[col.key + "Formula"]) {
              var largo = input.value.length;
              input.setSelectionRange(largo, largo);
            } else {
              input.select();
            }
          });

          input.addEventListener("input", function () {
            if (esNumerica(col) && input.value.trim().charAt(0) === "=") {
              return; /* cuenta a medio escribir: se resuelve recién al confirmar */
            }
            var v = esNumerica(col) ? U.parseNum(input.value) : input.value;
            store.updateRow(cfg.list, row.id, col.key, v, cfg.proyectoId);
            BM.refreshDerived();
          });

          input.addEventListener("blur", function () {
            if (esNumerica(col)) {
              var texto = input.value.trim();
              if (texto.charAt(0) === "=") {
                try {
                  row[col.key] = evaluarFormula(texto.slice(1));
                  row[col.key + "Formula"] = texto;
                } catch (e) {
                  if (BM.ui && BM.ui.toast) BM.ui.toast("Esa cuenta no se entiende: “" + texto + "”");
                  /* se queda como estaba: no tocamos row[col.key] */
                }
              } else {
                row[col.key] = U.parseNum(texto);
                delete row[col.key + "Formula"];
              }
              store.emit();
              BM.refreshDerived();
            }
            input.value = valorMostrado(row, col, cfg);
          });

          input.addEventListener("keydown", function (e) {
            if (e.key !== "Enter") return;
            e.preventDefault();
            var filas = Array.prototype.slice.call(tbody.children);
            var idx = filas.indexOf(tr);
            if (idx === filas.length - 1) {
              agregarFila();
            } else {
              var sig = filas[idx + 1].querySelectorAll(".cell-input")[colIndex];
              if (sig) sig.focus();
            }
          });
        }

        td.appendChild(input);

        if (esAuto) {
          var badge = el("span", "badge auto", "auto");
          badge.title = "Se calcula solo desde la sección Tarjetas: tu parte de los consumos";
          badge.style.marginLeft = "6px";
          td.appendChild(badge);
        }

        tr.appendChild(td);
      });

      /* botón borrar */
      var tdDel = el("td", "col-del");
      var del = el("button", "row-del", "×");
      del.type = "button";
      del.title = "Borrar fila";
      del.setAttribute("aria-label", "Borrar fila");
      del.disabled = !puedeBorrar;
      if (!puedeBorrar) del.title = "Tiene que quedar al menos una fila";
      del.addEventListener("click", function () {
        var lista = store.getList(cfg.list, cfg.proyectoId);
        var indice = lista.findIndex(function (x) { return x.id === row.id; });
        var copia = JSON.parse(JSON.stringify(row));
        store.deleteRow(cfg.list, row.id, cfg.proyectoId);
        render(mount, cfg);
        BM.refreshDerived();
        if (BM.ui && BM.ui.toast) {
          BM.ui.toast("Fila borrada", "Deshacer", function () {
            var lista2 = store.getList(cfg.list, cfg.proyectoId);
            lista2.splice(Math.min(indice, lista2.length), 0, copia);
            store.emit();
            render(mount, cfg);
            BM.refreshDerived();
          });
        }
      });
      tdDel.appendChild(del);
      tr.appendChild(tdDel);

      tbody.appendChild(tr);
      return tr;
    }

    if (!rows.length) {
      var trEmpty = el("tr");
      var tdEmpty = el("td", "empty-row left", cfg.emptyText || "Todavía no hay filas. Agregá la primera.");
      tdEmpty.colSpan = cfg.columns.length + 1;
      trEmpty.appendChild(tdEmpty);
      tbody.appendChild(trEmpty);
    } else {
      rows.forEach(pintarFila);
    }

    scroll.appendChild(table);
    mount.appendChild(scroll);

    /* ---- pie: agregar + total ---- */
    function agregarFila() {
      var nueva = store.addRow(cfg.list, cfg.template || {}, cfg.proyectoId);
      render(mount, cfg);
      BM.refreshDerived();
      var tr = mount.querySelector('tr[data-row-id="' + nueva.id + '"]');
      if (tr) {
        var primero = tr.querySelector(".cell-input");
        if (primero) primero.focus();
      }
    }

    var foot = el("div", "table-foot");
    var addBtn = el("button", "add-row", cfg.addLabel || "+ Agregar fila");
    addBtn.type = "button";
    addBtn.addEventListener("click", agregarFila);
    foot.appendChild(addBtn);

    if (cfg.totalFn) {
      var totalWrap = el("div", "foot-total");
      totalWrap.appendChild(document.createTextNode(cfg.totalLabel || "Total"));
      var totalVal = el("span", "num");
      var calcId = cfg.totalId || ("total-" + cfg.list + (cfg.proyectoId || ""));
      totalVal.dataset.calc = calcId;
      BM.calcs[calcId] = cfg.totalFn;
      totalVal.textContent = cfg.totalFn();
      totalWrap.appendChild(totalVal);
      foot.appendChild(totalWrap);
    }

    mount.appendChild(foot);
  }

  BM.table = { render: render };
})(window);
