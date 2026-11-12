#!/usr/bin/env bash
set -euo pipefail
python3 -m http.server 8767 --bind 127.0.0.1 >/tmp/condominio-brand-server.log 2>&1 &
pid=$!
trap 'kill "$pid" 2>/dev/null || true' EXIT
ready=false
for i in $(seq 1 25); do
  if curl --silent --fail http://127.0.0.1:8767/ >/dev/null; then ready=true; break; fi
  sleep 1
done
if [ "$ready" != true ]; then cat /tmp/condominio-brand-server.log; exit 1; fi
for path in assets/brand/condominio-mark.svg assets/brand/condominio-logo.svg src/styles.css; do curl --silent --fail "http://127.0.0.1:8767/$path" >/dev/null; done
chrome="$(command -v google-chrome || command -v google-chrome-stable || command -v chromium || true)"
if [ -z "$chrome" ]; then echo "Chromium no disponible" >&2; exit 1; fi
mkdir -p artifacts
"$chrome" --headless --no-sandbox --disable-gpu --disable-dev-shm-usage --no-first-run --virtual-time-budget=5500 --dump-dom http://127.0.0.1:8767/ >/tmp/condominio-brand-dom.html 2>/tmp/condominio-brand-chrome.log
grep -q "DigiCondominio" /tmp/condominio-brand-dom.html
grep -q "Tu comunidad" /tmp/condominio-brand-dom.html
grep -q "Datos simulados" /tmp/condominio-brand-dom.html
for dimensions in "1440,900" "390,844" "320,680"; do
  width="${dimensions%%,*}"
  "$chrome" --headless --no-sandbox --disable-gpu --disable-dev-shm-usage --no-first-run --hide-scrollbars --virtual-time-budget=5500 --window-size="$dimensions" --screenshot="artifacts/digicondominio-$width.png" http://127.0.0.1:8767/ >/dev/null 2>>/tmp/condominio-brand-chrome.log
  test -s "artifacts/digicondominio-$width.png"
done
echo "Brand preview OK: chromium 1440,390,320; local-only; no deployment."
