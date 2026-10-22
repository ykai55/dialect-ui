#!/usr/bin/env bash
# 一条命令跑完 Win10 的「原生 vs 复刻」核对：
#   1. 确认本地静态服务（默认 http://127.0.0.1:4173），没起就自己在别的端口起一个
#   2. 用无头 Chrome 2x 截 verify/verify-win10.html 的 light / dark 两张
#   3. 调 tools/compare-win10.py，一个控件一张对照图，输出 shots/verify/win10/
#
# 原生图不用现渲染：已经在 reference/shots/windows/win10-uxtheme/matrix/ 里了
# （uxtheme 离屏渲染，1x + 最近邻 2x，见 docs/windows-win10-notes.md）。
#
# 用法：
#   bash tools/verify-win10.sh
#   PYTHON=/Users/bytedance/.dsh/dsh-runtimes/dsh-primary-runtime/dependencies/python/bin/python3 \
#     bash tools/verify-win10.sh
#
# 可用环境变量：CHROME / BASE / WORK / PYTHON
set -euo pipefail

cd "$(dirname "$0")/.."
ROOT="$(pwd)"

CHROME="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
BASE="${BASE:-http://127.0.0.1:4173}"
WORK="${WORK:-/tmp/dialect-ui-probe-verify-win10}"
PROFILE="$WORK/chrome-profile"

# 页面行数：39 行 × 48 + 3 行 textarea × 120 = 2232（1x 逻辑像素），截图 2x = 648×4464。
PAGE_W=324
PAGE_H=2232

PYTHON="${PYTHON:-python3}"
if ! "$PYTHON" -c 'import PIL' >/dev/null 2>&1; then
  echo "需要 Pillow。指定一个装了 Pillow 的 Python：" >&2
  echo "  PYTHON=/path/to/python3 bash tools/verify-win10.sh" >&2
  exit 1
fi

if [ ! -x "$CHROME" ]; then
  echo "找不到 Chrome：$CHROME（可以用 CHROME=/path/to/chrome 覆盖）" >&2
  exit 1
fi

mkdir -p "$WORK" "$PROFILE"

# ---------- 静态服务：先探测，没起才自己起；别人的服务不关 ----------
SERVER_PID=""
cleanup() {
  if [ -n "$SERVER_PID" ]; then
    kill "$SERVER_PID" 2>/dev/null || true
    wait "$SERVER_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT INT TERM

if curl -sf -o /dev/null "$BASE/verify/verify-win10.html"; then
  echo "1/3 用已有静态服务 ${BASE}"
else
  for port in 4174 4175 4176 4177 4178 4179 4180; do
    if curl -sf -o /dev/null --max-time 0.3 "http://127.0.0.1:$port/"; then
      continue
    fi
    ( cd "$ROOT" && exec python3 -m http.server "$port" --bind 127.0.0.1 >"$WORK/http-$port.log" 2>&1 ) &
    SERVER_PID=$!
    BASE="http://127.0.0.1:$port"
    for _ in $(seq 1 50); do
      if curl -sf -o /dev/null "$BASE/verify/verify-win10.html"; then
        break
      fi
      sleep 0.1
    done
    if curl -sf -o /dev/null "$BASE/verify/verify-win10.html"; then
      echo "1/3 自己起了静态服务 ${BASE}（pid ${SERVER_PID}，结束会关掉）"
      break
    fi
    kill "$SERVER_PID" 2>/dev/null || true
    SERVER_PID=""
  done
  if [ -z "$SERVER_PID" ]; then
    echo "起不来静态服务，也没有现成的 ${BASE}。先手动跑：python3 -m http.server 4173 --bind 127.0.0.1" >&2
    exit 1
  fi
fi

# ---------- 截图 ----------
# 每次清空 Chrome profile：python3 -m http.server 不支持条件请求，
# 复用 profile 时 Chrome 可能直接拿上一次缓存的 css/components.css，
# 改完 CSS 再跑就会看到旧样式（这个坑在滑块 thumb 上踩到过一次）。
rm -rf "$PROFILE"
mkdir -p "$PROFILE"
echo "2/3 截 CSS 版本（${PAGE_W}×${PAGE_H} @2x）"
for mode in light dark; do
  "$CHROME" \
    --headless=new --no-sandbox --disable-gpu --hide-scrollbars \
    --force-device-scale-factor=2 \
    --window-size="$PAGE_W,$PAGE_H" \
    --user-data-dir="$PROFILE" \
    --virtual-time-budget=1500 \
    --screenshot="$WORK/css-$mode.png" \
    "$BASE/verify/verify-win10.html?mode=$mode&v=$(date +%s)" >/dev/null 2>&1
  echo "    $WORK/css-$mode.png"
done

# ---------- 拼图 ----------
echo "3/3 逐个控件拼对照图"
"$PYTHON" tools/compare-win10.py "$WORK"
echo "完成：shots/verify/win10/{row}-{light,dark}.png"
