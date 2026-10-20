#!/usr/bin/env bash
# 跑交互测试：无头 Chrome 打开 test/*.test.html，读页面里写出的结果。
# 不依赖本地服务，直接用 file://。
set -euo pipefail
cd "$(dirname "$0")/.."

CHROME="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
PROFILE="$(mktemp -d /tmp/dsh-chrome-test.XXXXXX)"

fail=0
for f in test/*.test.html; do
  echo "== $f"
  out="$("$CHROME" --headless=new --no-sandbox --disable-gpu \
    --user-data-dir="$PROFILE" --virtual-time-budget=4000 \
    --dump-dom "file://$PWD/$f" 2>/dev/null |
    python3 -c "
import sys, re, html
d = sys.stdin.read()
m = re.search(r'<pre id=\"result\">(.*?)</pre>', d, re.S)
print(html.unescape(m.group(1)) if m else 'NO RESULT')
")"
  echo "$out" | sed 's/^/   /'
  if echo "$out" | grep -q '^FAIL'; then fail=1; fi
done

exit $fail
