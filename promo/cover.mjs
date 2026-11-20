// 生成 B 站封面：out/cover-16x10.png（1920×1200）和 out/cover-16x9.png（1920×1080）
import puppeteer from 'puppeteer-core';
import { execFileSync } from 'node:child_process';
const here = (p) => new URL(p, import.meta.url).pathname;
const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, args: ['--allow-file-access-from-files'] });
const page = await browser.newPage();
await page.setViewport({ width: 1920, height: 1200 });
await page.goto('file://' + here('./cover.html'), { waitUntil: 'networkidle0' });
await page.evaluate(() => document.fonts.ready);
await page.screenshot({ path: here('./out/cover-16x10.png') });
await browser.close();
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', here('./out/cover-16x10.png'), '-vf', 'crop=1920:1080:0:55', here('./out/cover-16x9.png')]);
console.log('cover → out/cover-16x10.png, out/cover-16x9.png');
