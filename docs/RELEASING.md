# Releasing SalaryKitten

Same flow as MySSH: the macOS build is signed and notarized locally, the Windows build comes from GitHub Actions,
and both go to one GitHub release. The in-app updater reads `latest.json` from the latest release.

## One-time setup

- **Developer ID**: a "Developer ID Application" certificate in the login keychain (`security find-identity -v -p codesigning`).
- **Notarization**: a notarytool keychain profile. `scripts/release-macos.sh` uses `MySSH-notary` by default
  (same Apple team); override with `SK_NOTARY_PROFILE`.
- **Updater signing key**: `~/.tauri/salarykitten.key` with its password in the Keychain item `salarykitten-updater`
  (`npx tauri signer generate -w ~/.tauri/salarykitten.key`). The public key is in `src-tauri/tauri.conf.json`.
  **Back this key up** — without it, installed apps cannot verify (and so will not install) future updates.
- The updater key never goes to GitHub: Actions builds the Windows installer unsigned for the updater, and
  `scripts/publish-release.sh` signs the downloaded `setup.exe` locally.

## Each release

1. Write `docs/releases/<version>.md` (the GitHub release notes; the part above `## Install` is shown in the updater).
2. `node scripts/set-version.mjs <version>`, commit, `git tag v<version>`, `git push && git push --tags`
   → GitHub Actions builds the Windows installer.
3. `scripts/release-macos.sh <version>` → `.work/release/` (signed, notarized, stapled dmg + updater archive).
4. `scripts/publish-release.sh <version>` → downloads the Windows build, writes `latest.json`, creates the GitHub
   release with all files.
5. Website: `python3 website/build.py && npx wrangler pages deploy website/dist --project-name salarykitten`.

Release files (fixed names so `releases/latest/download/<name>` links keep working):
`SalaryKitten-mac.dmg`, `SalaryKitten-mac.app.tar.gz(.sig)`, `SalaryKitten-win-Setup.exe(.sig)`, `latest.json`.
