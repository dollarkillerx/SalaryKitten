// 截取 SalaryKitten 的某个窗口（保留透明背景）：
//   swift scripts/capture-window.swift <pet|settings> <输出.png>
import AppKit
import CoreGraphics

let which = CommandLine.arguments[1]
let out = CommandLine.arguments[2]
let list = CGWindowListCopyWindowInfo([.optionOnScreenOnly], kCGNullWindowID) as! [[String: Any]]
let wins = list.filter { ($0[kCGWindowOwnerName as String] as? String)?.lowercased().contains("salary") == true }
func size(_ w: [String: Any]) -> CGSize {
    let b = w[kCGWindowBounds as String] as! [String: CGFloat]
    return CGSize(width: b["Width"]!, height: b["Height"]!)
}
// 桌宠窗口 260 宽；设置窗口更宽
guard let w = wins.first(where: { which == "pet" ? size($0).width < 300 : size($0).width >= 400 }),
      let id = w[kCGWindowNumber as String] as? Int else {
    print("window not found:", wins.map { size($0) }); exit(1)
}
let task = Process()
task.executableURL = URL(fileURLWithPath: "/usr/sbin/screencapture")
task.arguments = ["-x", "-o", "-l", String(id), out]
try task.run(); task.waitUntilExit()
print("captured", which, size(w), "→", out)
