#!/usr/bin/env bash
# 录一段原生控件的真实动画，抽成帧。
# 用法：bash tools/record-native.sh [check|switch] [light|dark]
# 依赖：屏幕录制权限（授予宿主 App）、ffmpeg。
set -euo pipefail
cd "$(dirname "$0")/.."

CONTROL="${1:-check}"
MODE="${2:-light}"
MANUAL="${3:-}"
WORK="/tmp/native-rec"
APP="/tmp/NativeAnim.app"
BIN="$APP/Contents/MacOS/NativeAnim"
CHROME_SRC="tools/native-anim.swift"

PYTHON="${PYTHON:-python3}"
if ! "$PYTHON" -c 'import PIL' >/dev/null 2>&1; then
  for cand in /Users/bytedance/.dsh/dsh-runtimes/dsh-primary-runtime/dependencies/python/bin/python3; do
    if [ -x "$cand" ] && "$cand" -c 'import PIL' >/dev/null 2>&1; then PYTHON="$cand"; break; fi
  done
fi
if ! "$PYTHON" -c 'import PIL' >/dev/null 2>&1; then
  echo "需要装了 Pillow 的 Python：PYTHON=/path/to/python3 bash tools/record-native.sh" >&2
  exit 1
fi

mkdir -p "$WORK"
rm -rf "$WORK/frames" "$WORK"/*.mov "$WORK"/wid.txt "$WORK"/state.txt

# 1. 编译并打包成 .app —— 裸二进制拿不到「key window」，控件会画成非激活的灰色
mkdir -p "$APP/Contents/MacOS"
TMPDIR=/tmp/ak/tmp CLANG_MODULE_CACHE_PATH=/tmp/ak/mc \
  swiftc -O -module-cache-path /tmp/ak/mc "$CHROME_SRC" -o "$BIN" 2>&1 | grep -v sandbox-exec || true
if [ ! -f "$APP/Contents/Info.plist" ]; then
  cat > "$APP/Contents/Info.plist" <<'PLIST'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>CFBundleExecutable</key><string>NativeAnim</string>
  <key>CFBundleIdentifier</key><string>local.platform-ui.nativeanim</string>
  <key>CFBundleName</key><string>NativeAnim</string>
  <key>CFBundlePackageType</key><string>APPL</string>
  <key>NSPrincipalClass</key><string>NSApplication</string>
  <key>LSUIElement</key><false/>
  <key>CFBundleVersion</key><string>1</string>
  <key>CFBundleShortVersionString</key><string>1.0</string>
</dict></plist>
PLIST
fi
codesign --force --deep --sign - "$APP" >/dev/null 2>&1 || true

# 2. 启动并拿到窗口号
pkill -f NativeAnim 2>/dev/null || true
# 直接跑 .app 里的二进制，而不是 open -a：
# 这样它是 DSH 的子进程，能继承辅助功能授权（合成鼠标事件需要）；
# 同时因为在 bundle 里，窗口仍然能成为 key window。
if [ "$MANUAL" = "manual" ]; then
  echo "手动模式：20 秒内自己点几下窗口里的控件"
  "$BIN" "$CONTROL" "$MODE" manual > "$WORK/app.log" 2>&1 &
else
  "$BIN" "$CONTROL" "$MODE" > "$WORK/app.log" 2>&1 &
fi
for _ in $(seq 1 100); do [ -f "$WORK/wid.txt" ] && break; sleep 0.03; done
WID="$(cat "$WORK/wid.txt" 2>/dev/null || true)"
if [ -z "$WID" ]; then echo "拿不到窗口号" >&2; exit 1; fi
echo "window=$WID $(cat "$WORK/state.txt" 2>/dev/null)"
sleep 0.6   # 等窗口真正上屏，否则按窗口录会扑空

# 3. 录
DUR=2.8; [ "$MANUAL" = "manual" ] && DUR=19
screencapture -x -v -l"$WID" -V "$DUR" "$WORK/$CONTROL-$MODE.mov"
for _ in $(seq 1 100); do pgrep -f NativeAnim >/dev/null || break; sleep 0.05; done

# 4. 抽帧
mkdir -p "$WORK/frames"
ffmpeg -v error -i "$WORK/$CONTROL-$MODE.mov" -fps_mode passthrough "$WORK/frames/%03d.png"
"${PYTHON:-python3}" tools/anim-strip.py "$WORK" "$CONTROL-$MODE"
echo "frames: $(ls "$WORK/frames" | wc -l | tr -d ' ')"
