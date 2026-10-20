#!/usr/bin/env bash
# Compile + run the uxtheme renderer on box-win (Win10 22H2) and fetch artifacts.
# Requires: ssh/scp to box-win (key auth). The renderer MUST run in the interactive
# session (session 2) via schtasks /IT; session 0 has no theme (OpenThemeData -> NULL).
set -euo pipefail
HOST="${HOST:-box-win}"
REMOTE='C:\probe\win32'
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
LOCAL_SRC="$ROOT/tools/win32-render.cs"
LOCAL_MAN="$ROOT/tools/win32-app.manifest"
LOCAL_RUN2="$ROOT/tools/win32-run2.ps1"
DEST="$ROOT/reference/shots/windows/win10-uxtheme"

ssh "$HOST" 'powershell.exe -NoProfile -Command "New-Item -ItemType Directory -Force -Path C:\probe\win32 | Out-Null"'
scp -q "$LOCAL_SRC" "$LOCAL_MAN" "$LOCAL_RUN2" "$HOST:C:/probe/win32/"
ssh "$HOST" 'powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "& C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe /nologo /target:exe /win32manifest:C:\probe\win32\win32-app.manifest /out:C:\probe\win32\win32render.exe /r:System.Drawing.dll /r:System.Windows.Forms.dll C:\probe\win32\win32-render.cs"'

run2() {  # $1 = exe args
  local tag="w32_$(date +%s)_$RANDOM"
  ssh "$HOST" "powershell.exe -NoProfile -ExecutionPolicy Bypass -File C:\\probe\\win32\\run2.ps1 -Name $tag -Cmd '$1' -Marker 'C:\\probe\\win32\\out\\DONE.txt'"
}
run2 "C:\\probe\\win32\\win32render.exe facts $REMOTE\\out light"
run2 "C:\\probe\\win32\\win32render.exe dump $REMOTE\\out light"
run2 "C:\\probe\\win32\\win32render.exe matrix $REMOTE\\out light"
run2 "C:\\probe\\win32\\win32render.exe matrix $REMOTE\\out dark"
run2 "C:\\probe\\win32\\win32render.exe darkprobe $REMOTE\\out C"
run2 "C:\\probe\\win32\\win32render.exe capture $REMOTE\\out light"
run2 "C:\\probe\\win32\\win32render.exe rawcapture $REMOTE\\out light"

mkdir -p "$DEST"
scp -q -r "$HOST:C:/probe/win32/out/*" "$DEST/"
echo "artifacts -> $DEST"
