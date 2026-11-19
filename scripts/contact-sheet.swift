// 生成角色切图预览图：swift scripts/contact-sheet.swift <输出.png> <角色id>
import AppKit
let names = ["idle","working","happy","rest","bye","celebrate","hello","offwork","hungry"]
let cell = 300, cols = 3
let W = cell*cols, H = cell*3
let cs = CGColorSpace(name: CGColorSpace.sRGB)!
let ctx = CGContext(data: nil, width: W, height: H, bitsPerComponent: 8, bytesPerRow: W*4, space: cs, bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)!
for (i,n) in names.enumerated() {
  let x = (i % cols)*cell, y = H - (i/cols+1)*cell
  // 一半深色一半桌面风格背景，方便看边缘
  ctx.setFillColor(i % 2 == 0 ? CGColor(red:0.12,green:0.13,blue:0.2,alpha:1) : CGColor(red:0.55,green:0.42,blue:0.35,alpha:1))
  ctx.fill(CGRect(x:x,y:y,width:cell,height:cell))
  let img = NSImage(contentsOfFile: "ui/assets/characters/\(CommandLine.arguments[2])/\(n).png")!.cgImage(forProposedRect:nil,context:nil,hints:nil)!
  ctx.draw(img, in: CGRect(x:x+10,y:y+10,width:cell-20,height:cell-20))
}
try! NSBitmapImageRep(cgImage: ctx.makeImage()!).representation(using:.png,properties:[:])!.write(to: URL(fileURLWithPath: CommandLine.arguments[1]))
