#!/usr/bin/env bash
# Levanta la app en localhost para ver los cambios mientras se desarrolla.
# Uso: ./dev.sh [puerto]        (por defecto 5173)
#
# No hay build: se sirven los archivos tal cual. Después de editar, recargá el navegador.
# El service worker es "red primero", así que la recarga normal ya trae lo nuevo.

set -euo pipefail

PUERTO="${1:-5173}"
cd "$(dirname "$0")"

if ! command -v python3 >/dev/null 2>&1; then
  echo "Falta python3 para servir los archivos." >&2
  exit 1
fi

# si el puerto está ocupado, probar los siguientes
while (echo >"/dev/tcp/127.0.0.1/$PUERTO") >/dev/null 2>&1; do
  echo "El puerto $PUERTO está ocupado, pruebo con $((PUERTO + 1))"
  PUERTO=$((PUERTO + 1))
done

URL="http://localhost:$PUERTO"
echo "Balance Mensual en $URL  (Ctrl+C para cortar)"

# abrir el navegador cuando el servidor ya responde
(
  for _ in $(seq 1 20); do
    if (echo >"/dev/tcp/127.0.0.1/$PUERTO") >/dev/null 2>&1; then
      if command -v xdg-open >/dev/null 2>&1; then xdg-open "$URL" >/dev/null 2>&1
      elif command -v open >/dev/null 2>&1; then open "$URL"
      fi
      break
    fi
    sleep 0.25
  done
) &

exec python3 -m http.server "$PUERTO" --bind 127.0.0.1
