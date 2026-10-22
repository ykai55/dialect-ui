#!/usr/bin/env bash
# 跑 React / Vue 框架包的浏览器验收页（先构建包，再构建 fixture，最后 headless Chrome）。
# 站点行为测试在 tools/test.sh，这里只管 packages/react、packages/vue。
set -euo pipefail
cd "$(dirname "$0")/.."

fail=0
for fw in react vue; do
  if ! bash tools/test-fixture.sh "$fw"; then
    fail=1
  fi
done

exit "$fail"
