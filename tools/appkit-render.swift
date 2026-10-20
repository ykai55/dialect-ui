// 把真实的 AppKit 控件离屏渲染成 PNG，作为 CSS 复刻的参考像素。
// 用法：
//   cd tools
//   TMPDIR=/tmp/ak CLANG_MODULE_CACHE_PATH=/tmp/ak/mc \
//     swiftc -module-cache-path /tmp/ak/mc appkit-render.swift -o /tmp/ak/render && /tmp/ak/render
// 产物：reference/shots/macos/appkit/native-{light,dark}-{row}.png
import AppKit

let app = NSApplication.shared
app.setActivationPolicy(.prohibited)

let outDir = FileManager.default.currentDirectoryPath + "/../reference/shots/macos/appkit"
try? FileManager.default.createDirectory(atPath: outDir, withIntermediateDirectories: true)

let cellW: CGFloat = 324
let cellH: CGFloat = 48

struct Spec {
    let row: String
    let build: (Bool) -> NSView   // Bool = dark
}

func makeContainer(dark: Bool) -> (NSView, NSColor) {
    let bg = dark
        ? NSColor(srgbRed: 38/255, green: 38/255, blue: 40/255, alpha: 1)
        : NSColor(srgbRed: 236/255, green: 236/255, blue: 236/255, alpha: 1)
    let v = NSView(frame: NSRect(x: 0, y: 0, width: cellW, height: cellH))
    v.appearance = NSAppearance(named: dark ? .darkAqua : .aqua)
    v.wantsLayer = true
    v.layer?.backgroundColor = bg.cgColor
    return (v, bg)
}

func render(_ view: NSView, row: String, dark: Bool) {
    let (container, _) = makeContainer(dark: dark)
    var f = view.frame
    f.origin = NSPoint(x: 12, y: (cellH - f.height) / 2)
    view.frame = f
    container.addSubview(view)
    container.layoutSubtreeIfNeeded()
    guard let rep = container.bitmapImageRepForCachingDisplay(in: container.bounds) else { return }
    container.cacheDisplay(in: container.bounds, to: rep)
    guard let data = rep.representation(using: .png, properties: [:]) else { return }
    let name = "native-\(dark ? "dark" : "light")-\(row).png"
    try? data.write(to: URL(fileURLWithPath: outDir + "/" + name))
    print("\(name)  control=\(Int(view.frame.width))x\(Int(view.frame.height))")
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

let specs: [Spec] = [
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
]

for dark in [false, true] {
    for spec in specs {
        NSAppearance(named: dark ? .darkAqua : .aqua)!.performAsCurrentDrawingAppearance {
            render(spec.build(dark), row: spec.row, dark: dark)
        }
    }
}
