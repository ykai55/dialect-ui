#!/usr/bin/env bash
# 跑单个框架包的浏览器验收页。
# 约定：每个包在 test/fixture/ 下放一个 Vite 小应用（index.html + main.ts[x] +
# vite.config.ts），断言结果写进 <pre id="result">；构建产物在 test/fixture/dist/。
#
# 用法：bash tools/test-fixture.sh react|vue
set -euo pipefail
cd "$(dirname "$0")/.."
ROOT="$PWD"

FW="${1:?用法: bash tools/test-fixture.sh react|vue}"
case "$FW" in
  react | vue) ;;
  *) echo "未知框架包: $FW" >&2; exit 2 ;;
esac

CHROME="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
PROFILE="$(mktemp -d /tmp/dsh-chrome-fixture.XXXXXX)"
FIXTURE="packages/$FW/test/fixture"
PAGE="file://$ROOT/$FIXTURE/dist/index.html"

echo "== 构建 @dialect-ui/$FW"
npm run build -w "@dialect-ui/$FW"

echo "== 构建验收页 $FIXTURE"
# 直接调仓库根安装的 vite，不走 npx：npm 11 的 npx 会把 cwd 切到最近的
# package.json（packages/<fw>），Vite 就找不到 fixture 的 index.html。
(
  cd "$FIXTURE"
  "$ROOT/node_modules/.bin/vite" build --logLevel error
)

# 读 <pre id="result">；无头 Chrome 偶发启动失败时重试，断言失败不重试。
probe() {
  "$CHROME" --headless=new --no-sandbox --disable-gpu \
    --allow-file-access-from-files \
    --user-data-dir="$PROFILE" --virtual-time-budget=5000 \
    --dump-dom "$PAGE" 2>/dev/null |
    python3 -c "
import sys, re, html
d = sys.stdin.read()
m = re.search(r'<pre id=\"result\">(.*?)</pre>', d, re.S)
print(html.unescape(m.group(1)) if m else 'NO RESULT')
"
}

echo "== 跑浏览器断言"
OUT=""
for attempt in 1 2 3; do
  OUT="$(probe || true)"
  if [ -n "$OUT" ] && [ "$OUT" != "NO RESULT" ]; then
    break
  fi
  echo "   Chrome 没有拿到结果，重试 $attempt/3"
  sleep 1
done

echo "$OUT" | sed 's/^/   /'

if [ -z "$OUT" ] || [ "$OUT" = "NO RESULT" ]; then
  echo "FAIL 验收页没有产出结果（$PAGE）" >&2
  exit 1
fi

if echo "$OUT" | grep -q '^FAIL'; then
  exit 1
fi
