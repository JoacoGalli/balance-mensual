# Balance Mensual

App web para llevar gastos, ingresos y proyectos personales mes a mes. Sin backend, sin build:
son archivos estáticos que funcionan en el navegador y se pueden instalar como app en el celular.

## Qué tiene

- Un registro por mes, con el balance del mes anterior arrastrado.
- Ingresos en pesos o en dólares (se convierten con el dólar del mes).
- Gastos separados en fijos y variables.
- Proyectos personales, cada uno con sus ingresos y gastos; la ganancia neta suma al mes.
- Tarjeta en pesos y en dólares, con el corte entre dos personas y el número de cuota.
- Alquiler compartido y cierre del mes.
- Todas las tablas se editan a mano: nombres, montos, agregar y borrar filas.
- Tema claro y oscuro, y layout pensado para el celular.

## Correrlo

```bash
python3 -m http.server 5173
```

Y abrir <http://localhost:5173>.

## Dónde se guardan los datos

Por ahora en el navegador de cada dispositivo (`localStorage`). Desde **Ajustes** se puede
descargar un JSON con todo y volver a importarlo en otro dispositivo. El próximo paso es
sincronizar con Firebase; está explicado en [CLAUDE.md](CLAUDE.md).

## Deploy

GitHub Pages desde la rama `main`, carpeta raíz. Todas las rutas son relativas, así que
funciona igual servido desde un subdirectorio.
