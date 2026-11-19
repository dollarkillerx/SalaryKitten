#!/usr/bin/env bash
# Builds a signed, notarized universal (Apple silicon + Intel) macOS release of SalaryKitten.
#
#   scripts/release-macos.sh <version>          e.g. 0.1.0
#
# Environment:
#   SK_SIGN_IDENTITY    codesign identity (default: the first "Developer ID Application" identity in the keychain;
#                       `security find-identity -v -p codesigning`)
#   SK_NOTARY_PROFILE   notarytool keychain profile (default: MySSH-notary, same Apple team as MySSH;
#                       create one with `xcrun notarytool store-credentials <name> --key AuthKey_XXXX.p8 --key-id XXXX --issuer <uuid>`).
#                       "-" = sign only, no notarization (dry run; not for publishing)
#   SK_UPDATER_KEY      updater private key (default: ~/.tauri/salarykitten.key); its password is read from the
#                       Keychain item "salarykitten-updater"
#   SK_RELEASE_OUT      output folder (default: .work/release)
#
# Output: SalaryKitten-mac.dmg, SalaryKitten-mac.app.tar.gz and .sig (updater archive). Then run
# scripts/publish-release.sh <version> to add the Windows build, write latest.json and upload to the GitHub release.
set -euo pipefail
VERSION="${1:?usage: release-macos.sh <version>}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="${SK_RELEASE_OUT:-$ROOT/.work/release}"
IDENTITY="${SK_SIGN_IDENTITY:-$(security find-identity -v -p codesigning | sed -n 's/.*"\(Developer ID Application:[^"]*\)".*/\1/p' | head -1)}"
[ -n "$IDENTITY" ] || { echo "no Developer ID Application identity found; set SK_SIGN_IDENTITY" >&2; exit 1; }
PROFILE="${SK_NOTARY_PROFILE:-MySSH-notary}"
KEY="${SK_UPDATER_KEY:-$HOME/.tauri/salarykitten.key}"
export PATH="$HOME/.cargo/bin:$PATH"
export TAURI_SIGNING_PRIVATE_KEY="$(cat "$KEY")"
export TAURI_SIGNING_PRIVATE_KEY_PASSWORD="$(security find-generic-password -s salarykitten-updater -w)"
cd "$ROOT"

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

echo "==> version $VERSION, tests"
node scripts/set-version.mjs "$VERSION"
npm test >/dev/null

echo "==> build universal app, sign ($IDENTITY)"
rustup target add aarch64-apple-darwin x86_64-apple-darwin >/dev/null
APPLE_SIGNING_IDENTITY="$IDENTITY" npx tauri build --target universal-apple-darwin --bundles app
BUNDLE="$ROOT/src-tauri/target/universal-apple-darwin/release/bundle/macos"
APP="$BUNDLE/SalaryKitten.app"
codesign --verify --deep --strict "$APP"

notarize() {  # $1 = file to submit
  [ "$PROFILE" = "-" ] && { echo "   notarization skipped"; return; }
  xcrun notarytool submit "$1" --keychain-profile "$PROFILE" --wait | tail -3
}

echo "==> notarize app (${PROFILE/#-/skipped})"
ditto -c -k --keepParent "$APP" "$WORK/app.zip"
notarize "$WORK/app.zip"
[ "$PROFILE" = "-" ] || xcrun stapler staple "$APP" >/dev/null

mkdir -p "$OUT"
rm -f "$OUT"/SalaryKitten-mac.*

echo "==> updater archive (stapled app)"
COPYFILE_DISABLE=1 tar -czf "$OUT/SalaryKitten-mac.app.tar.gz" -C "$BUNDLE" SalaryKitten.app
npx tauri signer sign "$OUT/SalaryKitten-mac.app.tar.gz" >/dev/null  # key + password come from the TAURI_SIGNING_* env
test -s "$OUT/SalaryKitten-mac.app.tar.gz.sig"

echo "==> dmg"
mkdir -p "$WORK/dmg"
ditto "$APP" "$WORK/dmg/SalaryKitten.app"
ln -s /Applications "$WORK/dmg/Applications"
hdiutil create -volname SalaryKitten -srcfolder "$WORK/dmg" -ov -format UDZO -quiet "$OUT/SalaryKitten-mac.dmg"
codesign --sign "$IDENTITY" --timestamp "$OUT/SalaryKitten-mac.dmg"
notarize "$OUT/SalaryKitten-mac.dmg"
[ "$PROFILE" = "-" ] || xcrun stapler staple "$OUT/SalaryKitten-mac.dmg" >/dev/null

echo "==> verify"
[ "$PROFILE" = "-" ] || xcrun stapler validate "$APP"
spctl --assess --type execute -vv "$APP" 2>&1 | sed 's/^/   /'
spctl --assess --type open --context context:primary-signature -vv "$OUT/SalaryKitten-mac.dmg" 2>&1 | sed 's/^/   /'
echo "done: $OUT"
ls -lh "$OUT"
