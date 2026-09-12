/* =========================================================
   data.js — utilidades de formato y datos iniciales
   Expone: window.BM.utils, window.BM.seed
   ========================================================= */
(function (global) {
  "use strict";

  var BM = global.BM || (global.BM = {});

  var MESES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio",
               "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

  function uid() {
    return Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-3);
  }

  /* Formato de plata en pesos: $1.234.567 (sin decimales, como en la planilla) */
  function fmtARS(n) {
    if (n === null || n === undefined || isNaN(n)) n = 0;
    var neg = n < 0;
    var s = "$" + Math.round(Math.abs(n)).toLocaleString("es-AR");
    return neg ? "−" + s : s;
  }

  /* Formato en dólares: US$1.234,56 */
  function fmtUSD(n) {
    if (n === null || n === undefined || isNaN(n)) n = 0;
    var neg = n < 0;
    var s = "US$" + Math.abs(n).toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return neg ? "−" + s : s;
  }

  /* Número suelto para mostrar dentro de un input cuando no está enfocado */
  function fmtNum(n, decimals) {
    if (n === null || n === undefined || isNaN(n) || n === 0) return n === 0 ? "0" : "";
    return Number(n).toLocaleString("es-AR", {
      minimumFractionDigits: decimals || 0,
      maximumFractionDigits: decimals === undefined ? 2 : decimals
    });
  }

  /* Acepta "1.234,56", "1234.56", "$ 1.234", "1234" */
  function parseNum(str) {
    if (typeof str === "number") return str;
    if (!str) return 0;
    var s = String(str).replace(/[^\d.,\-]/g, "").trim();
    if (!s) return 0;
    if (s.indexOf(",") !== -1) {
      s = s.replace(/\./g, "").replace(",", ".");
    } else if ((s.match(/\./g) || []).length > 1) {
      s = s.replace(/\./g, "");
    }
    var n = parseFloat(s);
    return isNaN(n) ? 0 : n;
  }

  function monthId(year, monthIndex) {
    return year + "-" + String(monthIndex + 1).padStart(2, "0");
  }

  function monthLabel(id) {
    var parts = id.split("-");
    return MESES[parseInt(parts[1], 10) - 1] + " " + parts[0];
  }

  function monthShort(id) {
    var parts = id.split("-");
    return MESES[parseInt(parts[1], 10) - 1].slice(0, 3);
  }

  function sum(arr, key) {
    return (arr || []).reduce(function (a, b) { return a + (Number(b[key]) || 0); }, 0);
  }

  BM.utils = {
    MESES: MESES, uid: uid, fmtARS: fmtARS, fmtUSD: fmtUSD, fmtNum: fmtNum,
    parseNum: parseNum, monthId: monthId, monthLabel: monthLabel, monthShort: monthShort, sum: sum
  };

  /* ---------------------------------------------------------
     Datos de arranque — reflejan la estructura del spreadsheet.
     Se usan solo la primera vez; después manda lo guardado.
     --------------------------------------------------------- */
  function r(obj) { obj.id = uid(); return obj; }

  BM.seed = {
    version: 1,
    config: {
      personas: { p1: "Ana", p2: "Martín" },
      /* Reparto ideal de lo que entra cada mes. fuente: de qué lista sale el monto real */
      presupuesto: [
        { id: "pres-fijos", nombre: "Gastos fijos", pct: 60, fuente: "gastosFijos" },
        { id: "pres-variables", nombre: "Gastos variables", pct: 15, fuente: "gastosVariables" },
        { id: "pres-inversiones", nombre: "Inversiones", pct: 10, fuente: "inversiones" },
        { id: "pres-ahorros", nombre: "Ahorros", pct: 15, fuente: "ahorros" }
      ]
    },
    mesActivo: "2026-08",
    meses: {
      "2026-06": {
        id: "2026-06", dolar: 1410, balanceAnterior: 120000,
        ingresos: [r({ fuente: "Sueldo", monto: 1800, moneda: "USD" })],
        ahorros: [], inversiones: [],
        proyectos: [{ id: uid(), nombre: "Estudio web", ingresos: [r({ desc: "Sitio para cliente", monto: 95000 })], gastos: [] }],
        gastosFijos: [r({ desc: "Alquiler", monto: 380000 }), r({ desc: "Monotributo", monto: 120000 }),
                      r({ desc: "Servicios", monto: 78000 })],
        gastosVariables: [r({ desc: "Supermercado", monto: 138000 }),
                          r({ desc: "Resumen tarjeta (pesos)", monto: 0, auto: "tarjetaPesos" })],
        tarjetaPesos: [r({ desc: "Varios", p1: 95000, p2: 41000, cuota: "" })],
        tarjetaDolares: [r({ desc: "Suscripciones", p1: 25, p2: 0, cuota: "" })],
        alquiler: [r({ persona: "Ana", monto: 190000, pct: 50 }), r({ persona: "Martín", monto: 190000, pct: 50 })]
      },
      "2026-07": {
        id: "2026-07", dolar: 1480, balanceAnterior: 198000,
        ingresos: [r({ fuente: "Sueldo", monto: 1800, moneda: "USD" })],
        ahorros: [], inversiones: [],
        proyectos: [{ id: uid(), nombre: "Estudio web", ingresos: [r({ desc: "Mantenimiento mensual", monto: 104000 })], gastos: [] }],
        gastosFijos: [r({ desc: "Alquiler", monto: 400000 }), r({ desc: "Monotributo", monto: 125000 }),
                      r({ desc: "Servicios", monto: 82000 })],
        gastosVariables: [r({ desc: "Supermercado", monto: 152000 }),
                          r({ desc: "Resumen tarjeta (pesos)", monto: 0, auto: "tarjetaPesos" })],
        tarjetaPesos: [r({ desc: "Varios", p1: 110000, p2: 52000, cuota: "" })],
        tarjetaDolares: [r({ desc: "Suscripciones", p1: 25, p2: 0, cuota: "" })],
        alquiler: [r({ persona: "Ana", monto: 200000, pct: 50 }), r({ persona: "Martín", monto: 200000, pct: 50 })]
      },
      "2026-08": {
        id: "2026-08",
        dolar: 1526,
        balanceAnterior: 245300,
        ingresos: [
          r({ fuente: "Sueldo", monto: 1800, moneda: "USD" })
        ],
        ahorros: [
          r({ desc: "Caja de ahorro en dólares", monto: 250000 }),
          r({ desc: "Fondo de emergencia", monto: 120000 })
        ],
        inversiones: [
          r({ desc: "Plazo fijo", monto: 150000 }),
          r({ desc: "Fondo común de inversión", monto: 80000 })
        ],
        proyectos: [
          {
            id: uid(), nombre: "Estudio web",
            ingresos: [r({ desc: "Mantenimiento mensual", monto: 112500 }), r({ desc: "Landing para cliente nuevo", monto: 82000 })],
            gastos: [r({ desc: "Hosting y dominio", monto: 8200 }), r({ desc: "Plantilla premium", monto: 12400 })]
          },
          {
            id: uid(), nombre: "Consultoría",
            ingresos: [r({ desc: "Horas de asesoría", monto: 48000 })],
            gastos: [r({ desc: "Licencia de software", monto: 6000 })]
          }
        ],
        gastosFijos: [
          r({ desc: "Alquiler", monto: 400000 }),
          r({ desc: "Expensas", monto: 65000 }),
          r({ desc: "Seguro del auto", monto: 34000 }),
          r({ desc: "Luz", monto: 28500 }),
          r({ desc: "Agua", monto: 11000 }),
          r({ desc: "Gas", monto: 9300 }),
          r({ desc: "Monotributo", monto: 125000 }),
          r({ desc: "Internet", monto: 35000 }),
          r({ desc: "Streaming", monto: 18900 })
        ],
        gastosVariables: [
          r({ desc: "Resumen tarjeta (pesos)", monto: 0, auto: "tarjetaPesos" }),
          r({ desc: "Resumen tarjeta (dólares)", monto: 0, auto: "tarjetaDolares" }),
          r({ desc: "Supermercado", monto: 145300 }),
          r({ desc: "Gimnasio", monto: 42000 }),
          r({ desc: "Salidas", monto: 60000 })
        ],
        tarjetaPesos: [
          r({ desc: "Farmacia", p1: 18500, p2: 0, cuota: "" }),
          r({ desc: "Zapatillas", p1: 41000, p2: 0, cuota: "1/6" }),
          r({ desc: "Peaje", p1: 3400, p2: 3400, cuota: "" }),
          r({ desc: "Hotel de vacaciones", p1: 54900, p2: 54900, cuota: "2/3" }),
          r({ desc: "Celular", p1: 12500, p2: 0, cuota: "" })
        ],
        tarjetaDolares: [
          r({ desc: "Música", p1: 4.99, p2: 0, cuota: "" }),
          r({ desc: "Almacenamiento en la nube", p1: 2.99, p2: 0, cuota: "" }),
          r({ desc: "Curso online", p1: 15, p2: 0, cuota: "" })
        ],
        alquiler: [
          r({ persona: "Ana", monto: 200000, pct: 50 }),
          r({ persona: "Martín", monto: 200000, pct: 50 })
        ]
      }
    }
  };
})(window);
