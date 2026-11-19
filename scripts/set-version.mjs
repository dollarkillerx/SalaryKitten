// 统一修改版本号：node scripts/set-version.mjs 0.1.0
import { readFileSync, writeFileSync } from 'node:fs';
const v = process.argv[2];
if (!/^\d+\.\d+\.\d+$/.test(v || '')) { console.error('usage: set-version.mjs <x.y.z>'); process.exit(1); }
const json = (p, f) => { const o = JSON.parse(readFileSync(p, 'utf8')); f(o); writeFileSync(p, JSON.stringify(o, null, 2) + '\n'); };
json('package.json', (o) => { o.version = v; });
json('src-tauri/tauri.conf.json', (o) => { o.version = v; });
const cargo = 'src-tauri/Cargo.toml';
writeFileSync(cargo, readFileSync(cargo, 'utf8').replace(/^version = ".*"$/m, `version = "${v}"`));
console.log('version →', v);
