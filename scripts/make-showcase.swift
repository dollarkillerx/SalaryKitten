// 把多张桌宠截图横向排在柔和渐变背景上，生成 README / 官网用的横幅：
//   swift scripts/make-showcase.swift <输出.png> <截图1.png> <截图2.png> ...
import AppKit
let files = Array(CommandLine.arguments.dropFirst(2))
let imgs = files.map { NSImage(contentsOfFile: $0)!.cgImage(forProposedRect: nil, context: nil, hints: nil)! }
let pad = 36, gap = 24
let h = imgs.map { $0.height }.max()! + pad * 2
let w = imgs.map { $0.width }.reduce(0, +) + gap * (imgs.count - 1) + pad * 2
let cs = CGColorSpace(name: CGColorSpace.sRGB)!
let ctx = CGContext(data: nil, width: w, height: h, bitsPerComponent: 8, bytesPerRow: w * 4, space: cs,
                    bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)!
let grad = CGGradient(colorsSpace: cs, colors: [
    CGColor(red: 0.85, green: 0.91, blue: 1.0, alpha: 1),
    CGColor(red: 1.0, green: 0.94, blue: 0.88, alpha: 1),
] as CFArray, locations: [0, 1])!
ctx.addPath(CGPath(roundedRect: CGRect(x: 0, y: 0, width: w, height: h), cornerWidth: 40, cornerHeight: 40, transform: nil))
ctx.clip()
ctx.drawLinearGradient(grad, start: CGPoint(x: 0, y: h), end: CGPoint(x: w, y: 0), options: [])
var x = pad
for i in imgs { ctx.draw(i, in: CGRect(x: x, y: pad, width: i.width, height: i.height)); x += i.width + gap }
try! NSBitmapImageRep(cgImage: ctx.makeImage()!).representation(using: .png, properties: [:])!
    .write(to: URL(fileURLWithPath: CommandLine.arguments[1]))
print("showcase \(w)x\(h)")
