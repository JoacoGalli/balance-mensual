# Balance Mensual — contexto del proyecto

App web personal de Joaco para llevar gastos, ingresos y proyectos personales mes a mes.
Reemplaza un spreadsheet de Google ("Gastos mensuales") que tenía una hoja por mes.

Este archivo es el contexto para retomar el trabajo desde Claude Code en la terminal.
Se diseñó y armó en una sesión de Claude en el navegador; acá está todo lo decidido y lo que falta.

## Qué resuelve

Cada mes tiene: ingresos (sueldo en USD o pesos), gastos fijos, gastos variables,
ahorros, inversiones, tarjeta Visa en pesos y en dólares con el corte entre dos personas y número
de cuota, alquiler compartido, y un balance que arrastra del mes anterior. Sumado a eso:
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
js/app.js         shell, navegación y render de las 8 vistas
dev.sh            levanta un servidor local y abre el navegador
sw.js             service worker (red primero, cache de respaldo)
icons/            iconos PWA (192, 512, maskable)
```

## Ideas clave del código

- **Todas las tablas son el mismo componente** (`BM.table.render(mount, cfg)`): columnas
  declarativas con `type` (`text`, `money`, `usd`, `pct`, `cuota`, `moneda`, `opciones`, `calc`),
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

Funciona completo con datos locales: ocho vistas (Resumen, Ingresos, Freelance, Gastos,
Presupuesto, Tarjetas, Alquiler y balance, Ajustes), edición de todas las tablas, alta/baja de filas,
creación de meses nuevos copiando los gastos fijos y arrastrando el balance, export/import
de un JSON con todos los datos, tema claro y oscuro, y layout mobile con nav inferior.

Los datos que trae de fábrica son **ficticios** (Ana y Martín, Agosto 2026), con la estructura
del spreadsheet. **El repo es público: nunca poner datos reales en `js/data.js`.** Los datos reales
de Joaco van a Firebase; el Excel ("Gastosmensuales") está en `.gitignore`.

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
   - Agregar el dominio `joacogalli.github.io` a los dominios autorizados de Authentication.
2. Importar los meses reales del Excel "Gastosmensuales" (Joaco lo deja en la carpeta, ignorado
   por git). Sus proyectos freelance reales son dos; se crean desde la vista Freelance.
3. Hacerla multiusuario para venderla: login con Google, datos por `uid`, onboarding sin datos
   de ejemplo.
4. Ideas para después: gráfico de evolución por categoría, presupuesto por categoría con alerta,
   duplicar un consumo en cuotas hacia los meses siguientes automáticamente.

## Convenciones

- Nada de dependencias nuevas sin una razón concreta; la gracia es que no haya build.
- Cualquier lógica de plata va a `store.calc()`, no a las vistas.
- Los colores salen siempre de los tokens de `css/styles.css`, nunca hardcodeados,
  así el tema oscuro sigue funcionando.
- Al tocar archivos cacheados, subir la versión de `CACHE` en `sw.js`.
