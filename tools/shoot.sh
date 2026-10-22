#!/usr/bin/env bash
# 用本机 Chrome 的无头模式把各个主题 × 明暗截成图，方便和参考图比对。
# 用法：bash tools/shoot.sh [harness|corridor|all]
set -euo pipefail

cd "$(dirname "$0")/.."

CHROME="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
OUT="shots"
PROFILE="$(mktemp -d /tmp/dsh-chrome-shot.XXXXXX)"
WHAT="${1:-all}"
BASE="${BASE:-http://127.0.0.1:4173}"

mkdir -p "$OUT"

shot() {
  local url="$1" file="$2" w="$3" h="$4"
  "$CHROME" \
    --headless=new --no-sandbox --disable-gpu --hide-scrollbars \
    --force-device-scale-factor=2 \
    --window-size="${w},${h}" \
    --user-data-dir="$PROFILE" \
    --run-all-compositor-stages-before-draw \
    --virtual-time-budget=1500 \
    --screenshot="$OUT/$file" \
    "$BASE/$url" >/dev/null 2>&1
  echo "  $OUT/$file"
}

if [ "$WHAT" = "all" ] || [ "$WHAT" = "corridor" ]; then
  echo "corridor"
  for era in winxp win10 win11 macos15 macos gnome; do
    for mode in light dark; do
      shot "index.html?era=${era}&mode=${mode}" "corridor-${era}-${mode}.png" 1440 900
    done
  done
fi

if [ "$WHAT" = "all" ] || [ "$WHAT" = "harness" ]; then
  echo "harness"
  for theme in win11 win10 winxp macos macos15 gnome; do
    for mode in light dark; do
      shot "demo/harness.html?theme=${theme}&mode=${mode}" "matrix-${theme}-${mode}.png" 620 1060
    done
  done
  shot "demo/harness.html?mode=light" "matrix-all-light.png" 3000 1200
fi

echo "done"
