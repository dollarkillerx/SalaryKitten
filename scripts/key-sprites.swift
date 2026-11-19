// 绿幕抠图 + 去绿边 + 裁切居中输出 400x400 透明 PNG
// 用法: swift scripts/key-sprites.swift <角色id>
//   读 design/green-screen/<id>/*.png → 写 ui/assets/characters/<id>/*.png
//   角色 bluefish 的 idle 还会生成应用图标源 assets/icon-source.png
import AppKit

let args = CommandLine.arguments
let charId = args.count > 1 ? args[1] : "bluefish"
let inDir = "design/green-screen/\(charId)"
let outDir = "ui/assets/characters/\(charId)"
let SIZE = 400, MARGIN = 14  // 屏幕上显示 200pt，Retina 下 400px 刚好不糊

func process(_ inPath: String, _ outPath: String) throws {
    guard let src = NSImage(contentsOfFile: inPath),
          let cg = src.cgImage(forProposedRect: nil, context: nil, hints: nil) else { throw NSError(domain: "load", code: 1) }
    let w = cg.width, h = cg.height
    var px = [UInt8](repeating: 0, count: w * h * 4)
    let cs = CGColorSpace(name: CGColorSpace.sRGB)!
    let ctx = CGContext(data: &px, width: w, height: h, bitsPerComponent: 8, bytesPerRow: w * 4, space: cs,
                        bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)!
    ctx.draw(cg, in: CGRect(x: 0, y: 0, width: w, height: h))

    var minX = w, minY = h, maxX = -1, maxY = -1
    for y in 0..<h {
        for x in 0..<w {
            let i = (y * w + x) * 4
            let r = Double(px[i]), g = Double(px[i + 1]), b = Double(px[i + 2])
            let spill = g - max(r, b)               // 绿色程度
            // 绿幕约 (20,241,13) → spill≈220；白描边 spill≈0
            var a = 1.0 - (spill - 40.0) / 110.0
            a = min(1, max(0, a))
            if a <= 0.01 { px[i] = 0; px[i + 1] = 0; px[i + 2] = 0; px[i + 3] = 0; continue }
            // 去绿边：把 G 压到不超过 R/B 的较大者；半透明处按白底反推
            var nr = r, ng = min(g, max(r, b)), nb = b
            if a < 1 {
                // 边缘像素大多是 白描边 与 绿幕 的混合，直接趋向白色
                let t = 1 - a
                nr = min(255, nr + t * (255 - nr)); ng = min(255, ng + t * (255 - ng)); nb = min(255, nb + t * (255 - nb))
                ng = min(ng, max(nr, nb))
            }
            px[i] = UInt8(nr * a); px[i + 1] = UInt8(ng * a); px[i + 2] = UInt8(nb * a); px[i + 3] = UInt8(a * 255)
            if a > 0.1 { minX = min(minX, x); maxX = max(maxX, x); minY = min(minY, y); maxY = max(maxY, y) }
        }
    }
    guard maxX >= minX, maxY >= minY else { throw NSError(domain: "key: nothing left after removing the green background", code: 2) }
    let keyedCtx = CGContext(data: &px, width: w, height: h, bitsPerComponent: 8, bytesPerRow: w * 4, space: cs,
                             bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)!
    let keyed = keyedCtx.makeImage()!
    let crop = keyed.cropping(to: CGRect(x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1))!

    let out = CGContext(data: nil, width: SIZE, height: SIZE, bitsPerComponent: 8, bytesPerRow: SIZE * 4, space: cs,
                        bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)!
    out.interpolationQuality = .high
    let avail = Double(SIZE - MARGIN * 2)
    let s = min(avail / Double(crop.width), avail / Double(crop.height))
    let dw = Double(crop.width) * s, dh = Double(crop.height) * s
    // 水平居中，底部对齐（角色站在计数器上）
    out.draw(crop, in: CGRect(x: (Double(SIZE) - dw) / 2, y: Double(MARGIN), width: dw, height: dh))
    try writePNG(out.makeImage()!, outPath)

    // idle 顺便生成 1024 应用图标：取头部方块，放在圆角浅蓝底上
    if charId == "bluefish" && inPath.hasSuffix("/idle.png") {
        let side = Double(crop.width) * 0.86
        let head = crop.cropping(to: CGRect(x: (Double(crop.width) - side) / 2, y: 0, width: side, height: side))!
        let N = 1024
        let ic = CGContext(data: nil, width: N, height: N, bitsPerComponent: 8, bytesPerRow: N * 4, space: cs,
                           bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)!
        ic.interpolationQuality = .high
        let bg = CGPath(roundedRect: CGRect(x: 64, y: 64, width: 896, height: 896), cornerWidth: 200, cornerHeight: 200, transform: nil)
        ic.addPath(bg); ic.setFillColor(CGColor(red: 0.85, green: 0.91, blue: 1, alpha: 1)); ic.fillPath()
        ic.addPath(bg); ic.clip()
        ic.draw(head, in: CGRect(x: 80, y: 40, width: 864, height: 864))
        try writePNG(ic.makeImage()!, "assets/icon-source.png")
    }
}

func writePNG(_ img: CGImage, _ path: String) throws {
    try NSBitmapImageRep(cgImage: img).representation(using: .png, properties: [:])!.write(to: URL(fileURLWithPath: path))
}

let fm = FileManager.default
try fm.createDirectory(atPath: outDir, withIntermediateDirectories: true)
var outputs: [String] = []
for f in try fm.contentsOfDirectory(atPath: inDir).sorted() where f.hasSuffix(".png") {
    do { try process("\(inDir)/\(f)", "\(outDir)/\(f)"); outputs.append("\(outDir)/\(f)"); print("ok", f) } catch { print("FAIL", f, error) }
}

// 有 pngquant 就再压一遍（高质量调色板压缩，体积约减半；没有就跳过）
let pq = Process()
pq.executableURL = URL(fileURLWithPath: "/usr/bin/env")
pq.arguments = ["pngquant", "--quality=80-95", "--speed=1", "--skip-if-larger", "--force", "--ext", ".png"] + outputs
do { try pq.run(); pq.waitUntilExit(); print(pq.terminationStatus == 0 ? "pngquant ok" : "pngquant skipped (\(pq.terminationStatus))") }
catch { print("pngquant not found, skipped") }
