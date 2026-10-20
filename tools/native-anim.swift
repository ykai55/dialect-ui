// 打开一个真实窗口，按时间线切换控件，并打印窗口号，供 screencapture 录屏。
// 关键点：必须让 NSApp 真正跑起来（app.run()），否则鼠标事件不会被派发，控件点不动。
// 用法：native-anim <check|switch> <light|dark> [manual]
import AppKit

let app = NSApplication.shared
app.setActivationPolicy(.regular)

let args = CommandLine.arguments
let control = args.count > 1 ? args[1] : "check"
let mode = args.count > 2 ? args[2] : "light"
let manual = args.count > 3 && args[3] == "manual"
let dark = mode == "dark"
let appearance = NSAppearance(named: dark ? .darkAqua : .aqua)!

final class KeyablePanel: NSPanel {
    override var canBecomeKey: Bool { true }
    override var canBecomeMain: Bool { true }
}

let panel = KeyablePanel(contentRect: NSRect(x: 260, y: 260, width: 360, height: 140),
                         styleMask: [.borderless, .nonactivatingPanel],
                         backing: .buffered, defer: false)
panel.appearance = appearance
panel.isFloatingPanel = true
panel.ignoresMouseEvents = false
panel.level = .floating
panel.hidesOnDeactivate = false

let content = NSView(frame: NSRect(x: 0, y: 0, width: 360, height: 140))
content.appearance = appearance
content.wantsLayer = true
let bg = dark ? NSColor(srgbRed: 0.12, green: 0.12, blue: 0.12, alpha: 1)
             : NSColor(srgbRed: 0.925, green: 0.925, blue: 0.925, alpha: 1)
content.layer?.backgroundColor = bg.cgColor
panel.contentView = content

var target: NSControl!
if control == "switch" {
    let sw = NSSwitch(frame: NSRect(x: 40, y: 57, width: 60, height: 26))
    content.addSubview(sw)
    target = sw
} else {
    let cb = NSButton(checkboxWithTitle: "Label", target: nil, action: nil)
    cb.font = .systemFont(ofSize: 13)
    cb.frame = NSRect(x: 40, y: 58, width: 200, height: 24)
    content.addSubview(cb)
    target = cb
}

let previousApp = NSWorkspace.shared.frontmostApplication
let savedMouse = NSEvent.mouseLocation
NSApp.activate(ignoringOtherApps: true)
panel.makeKeyAndOrderFront(nil)

print("IS_KEY=\(panel.isKeyWindow) APP_ACTIVE=\(NSApp.isActive) POST_ACCESS=\(CGPreflightPostEventAccess()) AX=\(AXIsProcessTrusted())")
print("WINDOW_ID=\(panel.windowNumber)")
fflush(stdout)
try? "\(panel.windowNumber)".write(toFile: "/tmp/native-rec/wid.txt", atomically: true, encoding: .utf8)
try? "active=\(NSApp.isActive) key=\(panel.isKeyWindow)".write(toFile: "/tmp/native-rec/state.txt", atomically: true, encoding: .utf8)

func log(_ s: String) {
    if let h = FileHandle(forWritingAtPath: "/tmp/native-rec/click.log") {
        h.seekToEndOfFile(); h.write((s + "\n").data(using: .utf8)!); h.closeFile()
    } else {
        try? (s + "\n").write(toFile: "/tmp/native-rec/click.log", atomically: true, encoding: .utf8)
    }
}

func click(at point: NSPoint) {
    // 合成一次点击（in-process，走 NSApp 的事件队列，不需要辅助功能权限）
    let t = ProcessInfo.processInfo.systemUptime
    guard let down = NSEvent.mouseEvent(with: .leftMouseDown, location: point, modifierFlags: [],
                                        timestamp: t, windowNumber: panel.windowNumber,
                                        context: nil, eventNumber: 0, clickCount: 1, pressure: 1),
          let up = NSEvent.mouseEvent(with: .leftMouseUp, location: point, modifierFlags: [],
                                      timestamp: t + 0.06, windowNumber: panel.windowNumber,
                                      context: nil, eventNumber: 0, clickCount: 1, pressure: 0)
    else { return }
    NSApp.postEvent(up, atStart: false)
    NSApp.postEvent(down, atStart: false)
}

func stateValue() -> Int {
    if let b = target as? NSButton { return b.state.rawValue }
    if let s = target as? NSSwitch { return s.state.rawValue }
    return -1
}

func finish() {
    panel.orderOut(nil)
    previousApp?.activate(options: [])
    DispatchQueue.main.asyncAfter(deadline: .now() + 0.2) { exit(0) }
}

DispatchQueue.main.asyncAfter(deadline: .now() + 0.30) {
    panel.makeKey()
    log("key=\(panel.isKeyWindow) active=\(NSApp.isActive)")
}

if manual {
    DispatchQueue.main.asyncAfter(deadline: .now() + 20.0) { finish() }
} else {
    let p = target.convert(NSPoint(x: target.bounds.midX, y: target.bounds.midY), to: nil)
    DispatchQueue.main.asyncAfter(deadline: .now() + 0.9) {
        click(at: p)
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) { log("after1 state=\(stateValue())") }
    }
    DispatchQueue.main.asyncAfter(deadline: .now() + 1.9) {
        click(at: p)
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) { log("after2 state=\(stateValue())") }
    }
    DispatchQueue.main.asyncAfter(deadline: .now() + 3.0) { finish() }
}

app.run()
