# Balance Mensual — contexto del proyecto

App web personal de Joaco para llevar gastos, ingresos y proyectos personales mes a mes.
Reemplaza un spreadsheet de Google ("Gastos mensuales") que tenía una hoja por mes.

Este archivo es el contexto para retomar el trabajo desde Claude Code en la terminal.
Se diseñó y armó en una sesión de Claude en el navegador; acá está todo lo decidido y lo que falta.

## Qué resuelve

Cada mes tiene: ingresos (sueldo en USD + freelance en pesos), gastos fijos, gastos variables,
ahorros, tarjeta Visa en pesos y en dólares con el corte entre dos personas y número de cuota,
alquiler compartido, y un balance que arrastra del mes anterior. Sumado a eso, algo que el
spreadsheet no tenía: **proyectos personales**, cada uno con sus propios ingresos y gastos,
cuya ganancia neta se suma al balance del mes.

## Stack y decisiones

- **Vanilla JS, sin build step.** Se sirve como archivos estáticos: anda igual en localhost,
  en GitHub Pages y abierto desde el disco. No hay npm, bundler ni framework a propósito —
  la app es chica y así el deploy es copiar archivos.
- **Scripts clásicos, no módulos ES**, para que también funcione con `file://`.
  Todo cuelga del namespace `window.BM`. El orden de carga importa:
  `data.js` → `store.js` → `table.js` → `app.js`.
- **Persistencia hoy: `localStorage`** (clave `balance-mensual:v1`), aislada en `js/store.js`.
- **Persistencia planeada: Firebase Firestore**, para sincronizar entre la compu y el celular.
  Ver "Próximos pasos".
- **PWA**: `manifest.webmanifest` + `sw.js`, para instalarla desde Chrome en el celular.
- Idioma de la UI, comentarios y nombres de variables: español. Formato de números es-AR.

## Estructura

```
index.html        shell para localhost / GitHub Pages (registra el service worker)
artifact.html     mismo shell sin <html>/<head>, solo para publicar como Artifact de Claude
css/styles.css    tokens de color (tema claro y oscuro) + componentes
js/data.js        utilidades de formato/parseo y datos de ejemplo (BM.seed)
js/store.js       estado, localStorage, CRUD de filas, cálculos derivados (BM.store)
js/table.js       componente de tabla editable reutilizable (BM.table.render)
js/app.js         shell, navegación y render de las 6 vistas
sw.js             service worker (red primero, cache de respaldo)
icons/            iconos PWA (192, 512, maskable)
```

## Ideas clave del código

- **Todas las tablas son el mismo componente** (`BM.table.render(mount, cfg)`): columnas
  declarativas con `type` (`text`, `money`, `usd`, `pct`, `cuota`, `moneda`, `calc`),
  edición in-place, agregar fila con Enter en la última, borrar con undo.
- **Los cálculos viven en un solo lugar**: `store.calc()` devuelve todos los totales del mes.
  Nada de totales calculados a mano en las vistas.
- **Re-render selectivo**: al tipear en un input NO se vuelve a dibujar la tabla (se perdería
  el foco). Se actualizan solo los nodos con `data-calc` vía `BM.refreshDerived()`.
  El re-render completo pasa al cambiar de vista, de mes, o al agregar/borrar filas.
- **Filas "auto"**: una fila de gasto con `auto: "tarjetaPesos"` o `"tarjetaDolares"` toma su
  monto del total de la sección Tarjetas (las de dólares se pesifican con el dólar del mes).
  Se muestran como solo lectura con un badge.
- **Personas configurables**: se guardan como `p1`/`p2` en `config.personas`; las columnas de
  tarjetas y el reparto usan esos nombres. No hay nombres hardcodeados en el código.

## Correrlo local

```bash
python3 -m http.server 5173      # o: npx serve .
# abrir http://localhost:5173
```
Hace falta un servidor (no abrir el archivo directo) para que funcionen el service worker
y la instalación como PWA.

## Estado actual

Funciona completo con datos locales: seis vistas (Resumen, Ingresos y proyectos, Gastos,
Tarjetas, Alquiler y balance, Ajustes), edición de todas las tablas, alta/baja de filas,
creación de meses nuevos copiando los gastos fijos y arrastrando el balance, export/import
de un JSON con todos los datos, tema claro y oscuro, y layout mobile con nav inferior.

Los datos que trae de fábrica son de ejemplo, con la estructura real del spreadsheet
(Agosto 2026). En Ajustes está "Volver a los datos de ejemplo" para reiniciar.

## Próximos pasos

1. **Firebase (Firestore) para sincronizar compu ↔ celular.** Joaco ya eligió esta opción.
   - Crear proyecto gratuito en console.firebase.google.com, habilitar Firestore y
     Authentication (Google, un solo usuario).
   - Agregar `js/firebase.js` con la config del proyecto (las claves web de Firebase son
     públicas por diseño; lo que protege los datos son las reglas de seguridad).
   - Reglas: que cada documento sea accesible solo por el `uid` dueño.
   - En `js/store.js` reemplazar `load()` y `persist()` por lectura/escritura en Firestore,
     manteniendo `localStorage` como cache offline. La interfaz del store no debería cambiar:
     el resto de la app no sabe de dónde vienen los datos.
2. **Repo en GitHub** (público) y deploy con **GitHub Pages** desde la rama `main`.
   Las rutas ya son relativas, así que anda en un subdirectorio `usuario.github.io/repo/`.
3. Importar los meses reales del spreadsheet (o cargarlos a mano desde la UI).
4. Ideas para después: gráfico de evolución por categoría, presupuesto por categoría con alerta,
   duplicar un consumo en cuotas hacia los meses siguientes automáticamente.

## Convenciones

- Nada de dependencias nuevas sin una razón concreta; la gracia es que no haya build.
- Cualquier lógica de plata va a `store.calc()`, no a las vistas.
- Los colores salen siempre de los tokens de `css/styles.css`, nunca hardcodeados,
  así el tema oscuro sigue funcionando.
- Al tocar archivos cacheados, subir la versión de `CACHE` en `sw.js`.
