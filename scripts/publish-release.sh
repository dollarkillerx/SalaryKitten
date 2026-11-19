#!/usr/bin/env bash
# Collects the macOS build (from release-macos.sh) and the Windows build (from the GitHub Actions "Build" workflow),
# writes latest.json for the in-app updater and uploads everything to the GitHub release v<version>.
#
#   scripts/publish-release.sh <version>          e.g. 0.1.0
#
# Environment:
#   SK_WIN_RUN       GitHub Actions run id to take the Windows build from (default: the latest successful
#                    "Build" run for tag v<version>)
#   SK_RELEASE_OUT   folder with the macOS files (default: .work/release)
#   SK_DRAFT=1       create the release as a draft
set -euo pipefail
VERSION="${1:?usage: publish-release.sh <version>}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="${SK_RELEASE_OUT:-$ROOT/.work/release}"
REPO="dollarkillerx/SalaryKitten"
TAG="v$VERSION"
BASE="https://github.com/$REPO/releases/download/$TAG"
NOTES="$ROOT/docs/releases/$VERSION.md"
cd "$ROOT"

for f in SalaryKitten-mac.dmg SalaryKitten-mac.app.tar.gz SalaryKitten-mac.app.tar.gz.sig; do
  test -s "$OUT/$f" || { echo "missing $OUT/$f — run scripts/release-macos.sh $VERSION first" >&2; exit 1; }
done
test -f "$NOTES" || { echo "missing $NOTES" >&2; exit 1; }

echo "==> Windows build from GitHub Actions"
RUN="${SK_WIN_RUN:-$(gh run list -R "$REPO" -w Build -b "$TAG" -s success -L 1 --json databaseId -q '.[0].databaseId')}"
[ -n "$RUN" ] || { echo "no successful Build run for $TAG (push the tag and wait for Actions)" >&2; exit 1; }
rm -rf "$OUT/win" && mkdir -p "$OUT/win"
gh run download "$RUN" -R "$REPO" -n SalaryKitten-windows -D "$OUT/win"
SETUP="$(find "$OUT/win" -name '*-setup.exe' | head -1)"
test -s "$SETUP"
cp "$SETUP" "$OUT/SalaryKitten-win-Setup.exe"

echo "==> sign the Windows installer for the updater (key stays on this machine)"
KEY="${SK_UPDATER_KEY:-$HOME/.tauri/salarykitten.key}"
TAURI_SIGNING_PRIVATE_KEY="$(cat "$KEY")" \
TAURI_SIGNING_PRIVATE_KEY_PASSWORD="$(security find-generic-password -s salarykitten-updater -w)" \
  npx tauri signer sign "$OUT/SalaryKitten-win-Setup.exe" >/dev/null
test -s "$OUT/SalaryKitten-win-Setup.exe.sig"

echo "==> latest.json"
node - "$VERSION" "$BASE" "$OUT" "$NOTES" <<'JS'
const [, , version, base, out, notesFile] = process.argv;
const fs = require('fs');
const sig = (f) => fs.readFileSync(`${out}/${f}.sig`, 'utf8').trim();
const mac = { signature: sig('SalaryKitten-mac.app.tar.gz'), url: `${base}/SalaryKitten-mac.app.tar.gz` };
const notes = fs.readFileSync(notesFile, 'utf8').replace(/^# .*\n+/, '').split('\n## Install')[0].trim();
const latest = {
  version, notes, pub_date: new Date().toISOString(),
  platforms: {
    'darwin-aarch64': mac,
    'darwin-x86_64': mac, // universal app
    'windows-x86_64': { signature: sig('SalaryKitten-win-Setup.exe'), url: `${base}/SalaryKitten-win-Setup.exe` },
  },
};
fs.writeFileSync(`${out}/latest.json`, JSON.stringify(latest, null, 2) + '\n');
console.log('   platforms:', Object.keys(latest.platforms).join(', '));
JS

FILES=("$OUT/SalaryKitten-mac.dmg" "$OUT/SalaryKitten-mac.app.tar.gz" "$OUT/SalaryKitten-mac.app.tar.gz.sig"
       "$OUT/SalaryKitten-win-Setup.exe" "$OUT/SalaryKitten-win-Setup.exe.sig" "$OUT/latest.json")

echo "==> GitHub release $TAG"
if gh release view "$TAG" -R "$REPO" >/dev/null 2>&1; then
  gh release upload "$TAG" -R "$REPO" --clobber "${FILES[@]}"
else
  DRAFT=(); [ "${SK_DRAFT:-}" = "1" ] && DRAFT=(--draft)
  gh release create "$TAG" -R "$REPO" --title "SalaryKitten $VERSION" --notes-file "$NOTES" "${DRAFT[@]}" "${FILES[@]}"
fi
echo "done: https://github.com/$REPO/releases/tag/$TAG"
