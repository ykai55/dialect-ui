#!/usr/bin/env bash
# 把 CSS 动效逐帧定格，出一张胶片图。
# 用法：bash tools/frames.sh [check] [macos] [light] [6]
set -euo pipefail
cd "$(dirname "$0")/.."

TARGET="${1:-check}"
THEME="${2:-macos}"
MODE="${3:-light}"
N="${4:-6}"
CHROME="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
BASE="${BASE:-http://127.0.0.1:4173}"
PROFILE="$(mktemp -d /tmp/dsh-chrome-frames.XXXXXX)"
OUT="shots/frames"

mkdir -p "$OUT"
"$CHROME" \
  --headless=new --no-sandbox --disable-gpu --hide-scrollbars \
  --force-device-scale-factor=2 \
  --window-size=220,$((64 * N)) \
  --user-data-dir="$PROFILE" \
  --virtual-time-budget=3000 \
  --screenshot="$OUT/${TARGET}-${THEME}-${MODE}.png" \
  "$BASE/demo/frames.html?target=${TARGET}&theme=${THEME}&mode=${MODE}&n=${N}&v=$(date +%s)" >/dev/null 2>&1
echo "$OUT/${TARGET}-${THEME}-${MODE}.png"
