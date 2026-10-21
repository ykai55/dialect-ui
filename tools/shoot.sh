#!/usr/bin/env bash
# 用本机 Chrome 的无头模式把各个主题 × 明暗截成图，方便和参考图比对。
# 用法：bash tools/shoot.sh [play|harness|all]
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

if [ "$WHAT" = "all" ] || [ "$WHAT" = "play" ]; then
  echo "playground"
  for theme in win11 win10 macos gnome; do
    for mode in light dark; do
      shot "index.html?theme=${theme}&mode=${mode}" "play-${theme}-${mode}.png" 860 1080
    done
  done
  shot "index.html?theme=macos&mode=light&compare=1" "play-compare-light.png" 2040 820
fi

if [ "$WHAT" = "all" ] || [ "$WHAT" = "harness" ]; then
  echo "harness"
  for theme in win11 win10 macos gnome; do
    for mode in light dark; do
      shot "harness.html?theme=${theme}&mode=${mode}" "matrix-${theme}-${mode}.png" 620 1060
    done
  done
  shot "harness.html?mode=light" "matrix-all-light.png" 2400 1200
fi

echo "done"
