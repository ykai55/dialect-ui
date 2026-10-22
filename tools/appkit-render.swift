// 把真实的 AppKit 控件离屏渲染成 PNG，作为 CSS 复刻的参考像素。
//
// 两种模式：
//
// 1) 默认（当前系统外观 = macOS 26 Tahoe）：不建窗口，控件直接放进离屏 NSView 渲染。
//    cd tools
//    TMPDIR=/tmp/ak CLANG_MODULE_CACHE_PATH=/tmp/ak/mc \
//      swiftc -module-cache-path /tmp/ak/mc appkit-render.swift -o /tmp/ak/render && /tmp/ak/render
//    产物：reference/shots/macos/appkit/native-{light,dark}-{row}.png
//    这条路径是 tools/verify-macos.sh 用的，行为保持不变。
//
// 2) legacy（macOS 11 Big Sur – 15 Sequoia 的旧版外观）：
//    /tmp/ak/render15 --legacy --out <输出目录>
//    三个必须知道的点：
//    - AppKit 按二进制的 LC_BUILD_VERSION sdk 字段挑外观，不是按二进制跑在哪版系统上。
//      所以渲染前要用 vtool 把 sdk 改成 15.0（见 tools/render-macos-legacy.sh）：
//        xcrun vtool -set-build-version macos 15.0 15.0 -replace -output /tmp/ak/render15 /tmp/ak/render
//    - 下拉框必须放进真实 NSWindow 的 contentView 再 cacheDisplay（窗口不用显示、不用
//      orderFront）。离屏（不进窗口）时 legacy NSPopUpButton 会画出蓝色强调箭头格
//      （key/活跃窗口样式）；进窗口后是白底 + 灰色 chevron（非活跃/离屏样式）。
//    - 别把「所有」控件都塞进那个窗口：本机这个进程不是前台应用（NSApp.isActive=false），
//      非活跃窗口里的控件会把强调色画成灰的（主按钮变白、勾选变灰勾），而离屏路径按活跃状态画。
//      所以 legacy 默认只把 select 放进窗口，其余离屏；想复现「非活跃窗口」那套灰强调色时加
//      --host-all。两边的像素差见 docs/macos15-native-notes.md。
//    - 位图 rep 显式建成 2x 的 calibratedRGB（Generic RGB）：窗口承载时 AppKit 默认会按显示器
//      色彩空间建 rep，同一台机器接不同显示器出的 PNG 颜色值会变；自己建 rep 后产物稳定，
//      颜色按内嵌 profile 转到 sRGB 再读（tools/render-macos-legacy.sh 的采样就是这么做）。
//    另外多输出一张 native-{mode}-window-bg.png（空窗口底色），用来采样系统窗口灰。
//
// 参数：
//   --legacy        旧版外观：窗口承载 select、2x 固定 rep、额外采样窗口底色
//   --host-all      配合 --legacy：所有控件都进真实窗口（诊断非活跃窗口的灰强调色用）
//   --out <dir>     输出目录（默认 ../reference/shots/macos/appkit，相对当前目录）
import AppKit

let app = NSApplication.shared
app.setActivationPolicy(.prohibited)

// ---------------- 参数 ----------------
var legacy = false
var hostAll = false
var outDir = FileManager.default.currentDirectoryPath + "/../reference/shots/macos/appkit"
let argv = CommandLine.arguments
var argi = 1
while argi < argv.count {
    switch argv[argi] {
    case "--legacy":
        legacy = true
        argi += 1
    case "--host-all":
        hostAll = true
        argi += 1
    case "--out":
        guard argi + 1 < argv.count else {
            FileHandle.standardError.write("--out 需要一个目录\n".data(using: .utf8)!)
            exit(2)
        }
        let raw = (argv[argi + 1] as NSString).expandingTildeInPath
        outDir = raw.hasPrefix("/")
            ? raw
            : FileManager.default.currentDirectoryPath + "/" + raw
        argi += 2
    default:
        FileHandle.standardError.write("未知参数：\(argv[argi])\n".data(using: .utf8)!)
        exit(2)
    }
}

try? FileManager.default.createDirectory(atPath: outDir, withIntermediateDirectories: true)

let cellW: CGFloat = 324
let cellH: CGFloat = 48
let legacyScale: CGFloat = 2   // legacy 固定 2x，不跟显示器 backingScaleFactor 走

struct Spec {
    let row: String
    let build: (Bool) -> NSView   // Bool = dark
}

func containerBackground(dark: Bool) -> NSColor {
    if legacy {
        // 动态色：在下面 performAsCurrentDrawingAppearance 的作用域里解析成 aqua / darkAqua 的值
        return NSColor.windowBackgroundColor
    }
    return dark
        ? NSColor(srgbRed: 38/255, green: 38/255, blue: 40/255, alpha: 1)
        : NSColor(srgbRed: 236/255, green: 236/255, blue: 236/255, alpha: 1)
}

// 默认路径：离屏 NSView，不建窗口（macOS 26 的现有链路）
func makeContainer(dark: Bool) -> (NSView, NSColor) {
    let bg = containerBackground(dark: dark)
    let v = NSView(frame: NSRect(x: 0, y: 0, width: cellW, height: cellH))
    v.appearance = NSAppearance(named: dark ? .darkAqua : .aqua)
    v.wantsLayer = true
    v.layer?.backgroundColor = bg.cgColor
    return (v, bg)
}

// legacy 的窗口承载路径。窗口不显示、不 orderFront，只借它的 contentView 画。
// 返回的 window 必须活到渲染结束（cacheDisplay 之前不能被释放）。
func makeWindowContainer(dark: Bool) -> (NSWindow, NSView) {
    let bg = containerBackground(dark: dark)
    let window = NSWindow(
        contentRect: NSRect(x: -4000, y: -4000, width: cellW, height: cellH),
        styleMask: .borderless,
        backing: .buffered,
        defer: false
    )
    window.isReleasedWhenClosed = false
    window.appearance = NSAppearance(named: dark ? .darkAqua : .aqua)
    window.backgroundColor = bg
    window.isOpaque = true

    let v = NSView(frame: NSRect(x: 0, y: 0, width: cellW, height: cellH))
    v.appearance = window.appearance
    v.wantsLayer = true
    v.layer?.backgroundColor = bg.cgColor
    window.contentView = v
    return (window, v)
}

// legacy 用自己建的 2x calibratedRGB rep：产物和显示器无关，颜色空间固定。
func makeLegacyRep(for view: NSView) -> NSBitmapImageRep? {
    guard let rep = NSBitmapImageRep(
        bitmapDataPlanes: nil,
        pixelsWide: Int(view.bounds.width * legacyScale),
        pixelsHigh: Int(view.bounds.height * legacyScale),
        bitsPerSample: 8,
        samplesPerPixel: 4,
        hasAlpha: true,
        isPlanar: false,
        colorSpaceName: .calibratedRGB,
        bytesPerRow: 0,
        bitsPerPixel: 0
    ) else { return nil }
    rep.size = view.bounds.size
    return rep
}

func render(_ view: NSView, row: String, dark: Bool, hostInWindow: Bool) {
    // 窗口是局部强引用，函数返回后 ARC 释放；渲染期间它一直在
    let window: NSWindow?
    let container: NSView
    if hostInWindow {
        let (w, v) = makeWindowContainer(dark: dark)
        window = w
        container = v
    } else {
        let (v, _) = makeContainer(dark: dark)
        window = nil
        container = v
    }

    var f = view.frame
    f.origin = NSPoint(x: 12, y: (cellH - f.height) / 2)
    view.frame = f
    container.addSubview(view)
    container.layoutSubtreeIfNeeded()

    let rep: NSBitmapImageRep?
    if legacy {
        rep = makeLegacyRep(for: container)
    } else {
        rep = container.bitmapImageRepForCachingDisplay(in: container.bounds)
    }
    guard let rep else { return }
    // withExtendedLifetime 让窗口活到画完（写完 PNG 之后才允许释放）
    withExtendedLifetime(window) {
        container.cacheDisplay(in: container.bounds, to: rep)
    }
    guard let data = rep.representation(using: .png, properties: [:]) else { return }
    let name = "native-\(dark ? "dark" : "light")-\(row).png"
    try? data.write(to: URL(fileURLWithPath: outDir + "/" + name))
    let how = legacy ? (hostInWindow ? "window" : "offscreen") : "offscreen"
    print("\(name)  control=\(Int(view.frame.width))x\(Int(view.frame.height))  image=\(rep.pixelsWide)x\(rep.pixelsHigh)  host=\(how)")
}

func pushButton(_ title: String, width: CGFloat = 200, enabled: Bool = true) -> NSButton {
    let b = NSButton(title: title, target: nil, action: nil)
    b.bezelStyle = .rounded
    b.controlSize = .regular
    b.font = .systemFont(ofSize: 13)
    b.sizeToFit()
    b.frame.size = NSSize(width: width, height: b.frame.height)
    b.isEnabled = enabled
    return b
}

func accentButton(_ title: String, width: CGFloat = 200) -> NSButton {
    let b = pushButton(title, width: width)
    b.bezelColor = .controlAccentColor
    return b
}

func textField(_ text: String) -> NSTextField {
    let f = NSTextField(frame: NSRect(x: 0, y: 0, width: 300, height: 24))
    f.isBezeled = true
    f.bezelStyle = .roundedBezel
    f.font = .systemFont(ofSize: 13)
    if legacy {
        // 旧版 regular 尺寸的 rounded bezel 输入框实测高 22（默认那套链路固定 24，保持不动）
        f.sizeToFit()
        f.frame.size = NSSize(width: 300, height: f.frame.height)
    }
    if text.isEmpty { f.placeholderString = "name@example.com" } else { f.stringValue = text }
    return f
}

func checkbox(_ state: NSControl.StateValue, enabled: Bool = true) -> NSButton {
    let b = NSButton(checkboxWithTitle: "Label", target: nil, action: nil)
    b.state = state
    b.font = .systemFont(ofSize: 13)
    b.isEnabled = enabled
    b.sizeToFit()
    return b
}

func radio(_ state: NSControl.StateValue) -> NSButton {
    let b = NSButton(radioButtonWithTitle: "Label", target: nil, action: nil)
    b.state = state
    b.font = .systemFont(ofSize: 13)
    b.sizeToFit()
    return b
}

func popup() -> NSPopUpButton {
    let p = NSPopUpButton(frame: .zero, pullsDown: false)
    p.addItems(withTitles: ["Option A", "Option B", "Option C"])
    p.font = .systemFont(ofSize: 13)
    p.sizeToFit()
    p.frame.size = NSSize(width: 180, height: p.frame.height)
    return p
}

func slider() -> NSSlider {
    let s = NSSlider(value: 0.4, minValue: 0, maxValue: 1, target: nil, action: nil)
    s.frame = NSRect(x: 0, y: 0, width: 220, height: 24)
    return s
}

func toggle(_ state: NSControl.StateValue) -> NSView {
    let s = NSSwitch()
    s.state = state
    s.sizeToFit()
    return s
}

// 分段控件：默认 rounded 样式，中间段选中。imagePosition 保持默认，让 AppKit
// 按当前外观（26 或 legacy）自己画；这里只固定段数和选中项。
func segmented() -> NSSegmentedControl {
    let labels = ["Day", "Week", "Month"]
    let s = NSSegmentedControl(labels: labels, trackingMode: .selectOne, target: nil, action: nil)
    s.segmentStyle = .rounded
    s.selectedSegment = 1
    s.controlSize = .regular
    s.sizeToFit()
    return s
}

// 进度条：bar 样式、确定进度 40%。AppKit 的 bar 是 6pt 高；这里固定宽 200。
func progress() -> NSProgressIndicator {
    let p = NSProgressIndicator(frame: NSRect(x: 0, y: 0, width: 200, height: 6))
    p.style = .bar
    p.isIndeterminate = false
    p.minValue = 0
    p.maxValue = 100
    p.doubleValue = 40
    p.controlSize = .regular
    return p
}

var specs: [Spec] = [
    Spec(row: "button") { _ in pushButton("Save changes") },
    Spec(row: "button-accent") { _ in accentButton("Save changes") },
    Spec(row: "button-disabled") { _ in pushButton("Save changes", enabled: false) },
    Spec(row: "field-placeholder") { _ in textField("") },
    Spec(row: "field-value") { _ in textField("name@example.com") },
    Spec(row: "check-off") { _ in checkbox(.off) },
    Spec(row: "check-on") { _ in checkbox(.on) },
    Spec(row: "check-disabled") { _ in checkbox(.on, enabled: false) },
    Spec(row: "radio-off") { _ in radio(.off) },
    Spec(row: "radio-on") { _ in radio(.on) },
    Spec(row: "switch-off") { _ in toggle(.off) },
    Spec(row: "switch-on") { _ in toggle(.on) },
    Spec(row: "select") { _ in popup() },
    Spec(row: "slider") { _ in slider() },
    Spec(row: "segmented") { _ in segmented() },
    Spec(row: "progress") { _ in progress() },
]

if legacy {
    // 空窗口：只留系统窗口底色，给 metrics 采样 --ui-surface
    specs.append(Spec(row: "window-bg") { _ in NSView(frame: NSRect(x: 0, y: 0, width: 1, height: 1)) })
}

print("mode=\(legacy ? "legacy(window-hosted select)" : "default(offscreen)")  hostAll=\(hostAll)  out=\(outDir)")

for dark in [false, true] {
    for spec in specs {
        // legacy 默认只把下拉框放进窗口（离屏下拉框的箭头格是错的），其余走离屏
        let host = legacy && (hostAll || spec.row == "select")
        NSAppearance(named: dark ? .darkAqua : .aqua)!.performAsCurrentDrawingAppearance {
            render(spec.build(dark), row: spec.row, dark: dark, hostInWindow: host)
        }
    }
}
