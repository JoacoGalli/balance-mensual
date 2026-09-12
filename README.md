# Balance Mensual

App web para llevar gastos, ingresos y proyectos personales mes a mes. Sin backend, sin build:
son archivos estáticos que funcionan en el navegador y se pueden instalar como app en el celular.

## Qué tiene

- Un registro por mes, con el balance del mes anterior arrastrado.
- Ingresos en pesos o en dólares (se convierten con el dólar del mes), ahorros e inversiones.
- Gastos separados en fijos y variables.
- Freelance por proyecto, cada uno con sus ingresos y gastos; la ganancia neta suma al mes.
- Presupuesto: qué porcentaje de lo que entra va a cada cosa (60/15/10/15 por defecto) y cómo vas.
- Varias tarjetas, en pesos y en dólares, con el corte entre dos personas, cuotas y consumos fijos
  que pasan solos al mes siguiente.
- Alquiler compartido y cierre del mes.
- Todas las tablas se editan a mano: nombres, montos, agregar y borrar filas.
- Tema claro y oscuro, y layout pensado para el celular.

## Correrlo

```bash
./dev.sh
```

Levanta <http://localhost:5173> y abre el navegador. Después de editar, recargá.

## Dónde se guardan los datos

Se entra con Google y los datos quedan en Firebase (Firestore), así que se ven igual en la compu
y en el celular. Cada cuenta ve solo lo suyo (`firestore.rules`). La app guarda además una copia
en el dispositivo: abre al instante y funciona sin conexión. Desde **Ajustes** se puede
descargar un JSON con todo o importar uno. Detalles en [CLAUDE.md](CLAUDE.md).

## Deploy

Publicada en <https://joacogalli.github.io/balance-mensual/>, con GitHub Pages desde la rama `main`, carpeta raíz. Todas las rutas son relativas, así que
funciona igual servido desde un subdirectorio.
