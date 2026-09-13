# Balance Mensual — contexto del proyecto

App web personal de Joaco para llevar gastos, ingresos y proyectos personales mes a mes.
Reemplaza un spreadsheet de Google ("Gastos mensuales") que tenía una hoja por mes.

Este archivo es el contexto para retomar el trabajo desde Claude Code en la terminal.
Se diseñó y armó en una sesión de Claude en el navegador; acá está todo lo decidido y lo que falta.

## Qué resuelve

Cada mes tiene: ingresos (sueldo en USD o pesos), gastos fijos, gastos variables,
ahorros e inversiones (pesos o USD), consumos de tarjeta en pesos y en dólares (varias tarjetas,
corte entre dos personas, número de cuota y marca de "fijo"), alquiler compartido, y un balance
que arrastra del mes anterior. Sumado a eso:
- **Freelance**: proyectos (uno por cliente o trabajo), cada uno con sus propios ingresos y gastos,
  cuya ganancia neta se suma al balance del mes. En el código se llaman `proyectos`.
- **Presupuesto**: un reparto ideal de lo que entra (por defecto 60% fijos, 15% variables,
  10% inversiones, 15% ahorros) comparado contra lo real del mes. Vive en `config.presupuesto`,
  vale para todos los meses; cada parte tiene una `fuente` (la lista de la que sale el monto real).

A futuro la idea es venderla: cuentas con login de Google, cada usuario con sus datos.

## Stack y decisiones

- **Vanilla JS, sin build step.** Se sirve como archivos estáticos: anda igual en localhost,
  en GitHub Pages y abierto desde el disco. No hay npm, bundler ni framework a propósito —
  la app es chica y así el deploy es copiar archivos.
- **Scripts clásicos, no módulos ES**, para que también funcione con `file://`.
  Todo cuelga del namespace `window.BM`. El orden de carga importa:
  SDK de Firebase → `data.js` → `firebase-config.js` → `nube.js` → `store.js` → `table.js` → `app.js`.
- **Persistencia:** `localStorage` siempre (cache, abre al instante, anda offline) + **Firestore**
  cuando hay sesión. Sin config de Firebase (o con `file://`) la app funciona local, sin login.
- **Firebase** (proyecto `balance-mensual-joaco`, Firestore en `southamerica-east1`):
  - Auth con el SDK compat (`firebase-app-compat` + `firebase-auth-compat` desde gstatic),
    login con Google por popup (redirect si el popup está bloqueado).
  - Firestore **por REST, sin SDK** (`js/nube.js`): el SDK pesa ~550 KB. Documentos:
    `usuarios/{uid}` = `{json: "{version, config}"}` y `usuarios/{uid}/meses/{id}` = `{json: "{mes}"}`.
    Se suben solo los documentos que cambiaron, en un `:commit`. `mesActivo` no se sube (es de cada dispositivo).
  - Reglas en `firestore.rules`: cada uid lee/escribe solo lo suyo. Para cambiarlas, crear un
    ruleset nuevo y actualizar el release `cloud.firestore` (API firebaserules) o desde la consola.
  - Sync (`store.js`): cache local por uid (`balance-mensual:v1:<uid>`). Al abrir y al volver a la
    app: si hay cambios locales sin subir (`...:pendiente`) ganan ellos; si no, manda la nube.
    Cada edición sube con un debounce de 1,2 s. Último en escribir gana, por mes.
- **PWA**: `manifest.webmanifest` + `sw.js`, para instalarla desde Chrome en el celular.
- Idioma de la UI, comentarios y nombres de variables: español. Formato de números es-AR.

## Estructura

```
index.html        shell para localhost / GitHub Pages (registra el service worker, carga Firebase Auth)
artifact.html     mismo shell sin <html>/<head>, solo para publicar como Artifact de Claude
css/styles.css    tokens de color (tema claro y oscuro) + componentes
js/data.js        utilidades de formato/parseo, datos de ejemplo (BM.seed) y cuenta nueva (BM.estadoVacio)
js/firebase-config.js  config web de Firebase (pública por diseño; null = modo local)
js/nube.js        login con Google y lectura/escritura en Firestore por REST (BM.nube)
js/store.js       estado, cache local + sync, CRUD de filas, cálculos derivados (BM.store)
js/table.js       componente de tabla editable reutilizable (BM.table.render)
js/app.js         shell, navegación y render de las 8 vistas
dev.sh            levanta un servidor local y abre el navegador
sw.js             service worker (red primero, cache de respaldo; nunca cachea la API de Firestore)
firestore.rules   reglas de seguridad de Firestore
icons/            iconos PWA (192, 512, maskable)
```

## Ideas clave del código

- **Todas las tablas son el mismo componente** (`BM.table.render(mount, cfg)`): columnas
  declarativas con `type` (`text`, `money`, `usd`, `pct`, `cuota`, `moneda`, `opciones`, `check`, `calc`),
  edición in-place, agregar fila con Enter en la última, borrar con undo.
- **Los cálculos viven en un solo lugar**: `store.calc()` devuelve todos los totales del mes.
  Nada de totales calculados a mano en las vistas.
- **Re-render selectivo**: al tipear en un input NO se vuelve a dibujar la tabla (se perdería
  el foco). Se actualizan solo los nodos con `data-calc` vía `BM.refreshDerived()`.
  El re-render completo pasa al cambiar de vista, de mes, o al agregar/borrar filas.
- **Filas "auto"**: una fila de gasto con `auto: "tarjetaPesos"` o `"tarjetaDolares"` toma su
  monto de la **parte de la persona 1** (vos) en Tarjetas; la parte de la persona 2 la paga ella.
  Las de dólares se pesifican con el dólar del mes.
- **Tarjetas**: `config.tarjetas` = `[{id, nombre}]`; cada consumo tiene `tarjeta` (id) y `fijo`.
  La vista Tarjetas muestra una sección por tarjeta, con dos tablas (pesos y dólares) filtradas
  por esa tarjeta vía `cfg.filtro` en `BM.table.render` — la lista real (`mes.tarjetaPesos`)
  sigue siendo una sola, el filtro es solo de qué se ve en cada tabla.
- **Presupuesto por fila, no por lista** (`row.disfrute`, booleano): cada gasto de
  `gastosFijos`/`gastosVariables` y cada consumo de `tarjetaPesos`/`tarjetaDolares`/
  `tarjetasTerceros` se marca Fijo o Disfrute con una casilla propia, sin depender de en
  qué lista vive la fila. `calc()` arma `realFijo`/`realDisfrute` sumando por esa marca
  (usando "tu parte" en las tarjetas compartidas) y son los que alimentan las fuentes
  `gastosFijos`/`gastosVariables` de `config.presupuesto` — reemplazan a `totalFijos`/
  `totalVariables`, que siguen existiendo pero ahora son solo para "en qué lista está
  cada cosa" (Resumen, la vista Gastos), no para Presupuesto. Las filas "auto" no se
  cuentan acá (ya se cuentan a través de las filas de tarjeta que las originan).
- **Ahorro e inversión acumulados**: `mesActual().ahorroAnterior`/`inversionAnterior`
  siguen siendo editables a mano por mes (a diferencia de `balanceAnterior`, ahora
  `crearMes()` los arrastra siempre, sin depender del checkbox de arrastrar balance).
  `store.recalcularAcumulados()` (botón en Ajustes → Meses) recorre los meses en orden
  y deja el "antes de este mes" de cada uno igual al final del anterior — para arreglar
  cadenas cortadas, como los meses importados de un Excel que no tenía este campo.
- **Vivienda**: `config.viviendaTipo` ("alquiler" | "hipotecario") solo cambia las etiquetas de la
  vista Balance ("Alquiler compartido"/"Hipoteca compartida", etc.); la lista `alquiler` (persona,
  monto, %) es la misma para los dos casos. Se cambia con dos botones en Ajustes → Vivienda.
- **Freelance: reparto por proyecto** (`proyecto.pct`, 100 por defecto): para un proyecto con
  un socio, el gasto se resta primero del ingreso (`netoTotal`) y recién sobre eso se aplica el
  %. `calc().proyectos[].neto` ya es tu parte — es lo que se suma a `gananciaProyectos` y al
  balance del mes; `netoTotal` queda disponible para mostrar el neto completo del proyecto.
- **Tarjetas de otros** (`mes.tarjetasTerceros`): algo que se compró con la tarjeta de otra
  persona y se le paga en cuotas; no se reparte (es todo tuyo). Misma forma que un gasto simple
  (`desc, monto, cuota, fijo`); tiene su propio tipo de fila "auto" (`auto: "tarjetasTerceros"`).
- **Ahorros e inversiones acumulados**: `mes.ahorroAnterior`/`mes.inversionAnterior` son el total
  de antes de este mes (como `balanceAnterior`); las listas `ahorros`/`inversiones` son el
  *movimiento* del mes (puede ser negativo). `calc().ahorroFinal`/`inversionFinal` = anterior +
  movimiento. Al crear un mes con "arrastrar balance" también arrastran estos dos. Ojo:
  **Presupuesto sigue comparando el movimiento del mes** (`totalAhorros`/`totalInversiones`)
  contra el % de meta, no el acumulado — son cálculos distintos aunque compartan la lista.
- **Mes nuevo** (`store.crearMes`): copia gastos fijos y alquiler con monto; de tarjeta copia los
  consumos `fijo` y las cuotas que siguen, avanzando la cuota ("5/9" → "6/9"; la última no pasa).
  Se muestran como solo lectura con un badge.
- **Personas dinámicas**: `config.personas` es una lista `[{id, nombre}, ...]`, no hay tope de
  dos. La primera de la lista es "vos": su parte de la tarjeta es la que cuenta como gasto tuyo
  (`c.tuTarjetaPesos`/`tuTarjetaUsd` en `calc()`). Cada fila de tarjeta guarda el monto de cada
  persona en un campo con su `id` como nombre (`row[persona.id]`); por eso las dos primeras
  personas mantienen los ids fijos `"p1"`/`"p2"` en la migración, así los datos guardados antes
  de esta lista siguen sirviendo sin tocar cada fila. `BM.table.render` arma esas columnas al
  vuelo recorriendo `config.personas`. En Ajustes, "Personas" y "Tarjetas" son listas editables
  con `minRows: 1` (nunca se puede borrar la última).
- **`normalizar()` en store.js** completa lo que les falta a datos guardados con versiones
  anteriores (ej. `inversiones`, `config.presupuesto`). Todo campo nuevo del modelo pasa por ahí.
- **La vista va en la URL** (`#presupuesto`), así recargar o compartir el link abre la misma vista.

## Diseño

- Idea: contabilidad. A favor en tinta (`--positive` = `--ink`), en contra en rojo (`--negative`).
  El naranja (`--brand`) es marca e interacción, nunca un signo de plata.
- Barra lateral bordó (`--rail`), fondo casi neutro. Tipografía única: **Archivo** (Google Fonts)
  usando su eje de ancho: expandida y pesada en títulos y montos grandes, normal en el cuerpo,
  cifras tabulares (`.num`) en tablas.
- Lo único ruidoso es el hero del Resumen: naranja si el mes cierra a favor, rojo si cierra en
  contra, con la cuenta Ingresos + Freelance − Gastos = Balance debajo. El resto, sobrio.

## Correrlo local

```bash
./dev.sh          # sirve en http://localhost:5173 y abre el navegador (./dev.sh 8080 para otro puerto)
```
Hace falta un servidor (no abrir el archivo directo) para que funcionen el service worker
y la instalación como PWA.

## Estado actual

Publicada en GitHub Pages: https://joacogalli.github.io/balance-mensual/
(repo público `JoacoGalli/balance-mensual`, deploy automático desde `main`).

Con login de Google y datos en Firestore. Ocho vistas (Resumen, Ingresos, Freelance, Gastos,
Presupuesto, Tarjetas, Alquiler y balance, Ajustes), edición de todas las tablas, alta/baja de filas,
creación de meses nuevos copiando los gastos fijos y arrastrando el balance, export/import
de un JSON con todos los datos, tema claro y oscuro, y layout mobile con nav inferior.

Los datos que trae de fábrica son **ficticios** (Ana y Martín, Agosto 2026), con la estructura
del spreadsheet. **El repo es público: nunca poner datos reales en `js/data.js`.** Los datos reales
de Joaco van a Firebase; el Excel ("Gastos mensuales.xlsx") está en `.gitignore`.

**Import del Excel (hecho, 2026-09-12):** 29 meses, de mayo 2024 a septiembre 2026. Cada hoja se
llama por el mes en que se paga el resumen: la hoja "Octubre 2026" es septiembre 2026. El resultado
es `balance-mensual-historial.json` (ignorado por git), que se carga desde Ajustes → Importar archivo.
Validado: los gastos totales de cada mes coinciden con los del Excel. Detalles:
- De sep 2024 a oct 2025 el Excel no tiene ingresos cargados.
- Donde la fórmula "Tarjeta" del Excel no coincidía con la suma de consumos, hay una fila de gasto
  "Ajuste para cuadrar con el Excel".
- Los ingresos "Free-lance" quedaron en un proyecto "Freelance"; Joaco los reparte entre sus
  proyectos reales.
- Se generó **antes** de que existieran personas dinámicas, tarjetas de terceros y ahorro/inversión
  acumulados: al importarlo, `ahorroAnterior`/`inversionAnterior` arrancan en 0 en todos los meses
  (la migración no tiene de dónde sacar ese dato). Conviene poner el total real en el mes más
  reciente después de importar.

## Próximos pasos

1. Venderla: ya es multiusuario (cada cuenta de Google tiene sus datos y arranca vacía). Falta
   onboarding, planes/pagos, y una landing.
2. Ideas para después: gráfico de evolución por categoría, presupuesto por categoría con alerta,
   duplicar un consumo en cuotas hacia los meses siguientes automáticamente.

## Convenciones

- Nada de dependencias nuevas sin una razón concreta; la gracia es que no haya build.
- Cualquier lógica de plata va a `store.calc()`, no a las vistas.
- Los colores salen siempre de los tokens de `css/styles.css`, nunca hardcodeados,
  así el tema oscuro sigue funcionando.
- Al tocar archivos cacheados, subir la versión de `CACHE` en `sw.js`.
