#!/usr/bin/env bash
# 一条命令跑完 macOS 的「原生 vs 复刻」核对：
#   1. 编译 tools/appkit-render.swift，把真实 AppKit 控件渲染成 PNG
#   2. 用无头 Chrome 截 verify/verify.html 的同一组控件
#   3. 拼成 shots/verify-macos-{light,dark}.png
#
# 前置：本地静态服务已经在跑（python3 -m http.server 4173），见 README。
set -euo pipefail

cd "$(dirname "$0")/.."

CHROME="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
BASE="${BASE:-http://127.0.0.1:4173}"
WORK="${WORK:-/tmp/dialect-ui-probe-verify}"
PROFILE="$WORK/chrome-profile"

PYTHON="${PYTHON:-python3}"
if ! "$PYTHON" -c 'import PIL' >/dev/null 2>&1; then
  echo "需要 Pillow。指定一个装了 Pillow 的 Python：PYTHON=/path/to/python3 bash tools/verify-macos.sh" >&2
  exit 1
fi

mkdir -p "$WORK/mc" "$WORK/tmp" "$PROFILE"

echo "1/3 渲染 AppKit 控件"
(
  cd tools
  TMPDIR="$WORK/tmp" CLANG_MODULE_CACHE_PATH="$WORK/mc" \
    swiftc -O -module-cache-path "$WORK/mc" appkit-render.swift -o "$WORK/render" 2>&1 |
    grep -v sandbox-exec || true
)
"$WORK/render" --out "$(pwd)/reference/shots/macos/appkit" | sed 's/^/    /'

echo "2/3 截 HTML 版本"
for mode in light dark; do
  "$CHROME" \
    --headless=new --no-sandbox --disable-gpu --hide-scrollbars \
    --force-device-scale-factor=2 \
    --window-size=324,720 \
    --user-data-dir="$PROFILE" \
    --virtual-time-budget=1500 \
    --screenshot="$WORK/css-$mode.png" \
    "$BASE/verify/verify.html?mode=$mode&v=$(date +%s)" >/dev/null 2>&1
  echo "    $WORK/css-$mode.png"
done

echo "3/3 逐个控件拼对照图"
"$PYTHON" tools/compare-appkit.py "$WORK"
