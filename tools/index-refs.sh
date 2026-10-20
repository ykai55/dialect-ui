#!/usr/bin/env bash
# 把 reference/shots 里收到的图片列进 reference/manifest.js，compare.html 直接读它。
set -euo pipefail
cd "$(dirname "$0")/.."

python3 - <<'PY'
import json
import pathlib

root = pathlib.Path("reference/shots")
data = {}
for plat in ("win11", "macos", "gnome"):
    folder = root / plat
    files = []
    if folder.is_dir():
        files = sorted(
            str(p) for p in folder.iterdir()
            if p.is_file() and p.suffix.lower() in (".png", ".jpg", ".jpeg", ".webp")
        )
    data[plat] = files

out = pathlib.Path("reference/manifest.js")
out.write_text(
    "/* 由 tools/index-refs.sh 生成，别手改 */\n"
    "window.REFERENCE = "
    + json.dumps(data, indent=2, ensure_ascii=False)
    + ";\n",
    encoding="utf-8",
)
print({k: len(v) for k, v in data.items()})
PY
