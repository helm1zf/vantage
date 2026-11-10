# Installing Vantage (instructions for Claude)

The user asked you to install Vantage from this link. Do everything below yourself; the user only taps **Allow** on
permission cards and **Yes** on Windows prompts. The user is not an IT professional.

**Rules**
- Never ask the user to open a terminal, type a command or pick a folder. Never ask for, view or store a password.
- Every step is safe to run again: check first, skip what is already done. Never delete or overwrite a Vantage folder.
- Keep messages short and in plain words, at most one progress message per step.
- If a step fails, read the error, fix it once in the smallest way, and try again. If it still fails, say in one or two
  sentences what failed and what you will do instead (see "When something fails").

Start with one message: "I'm installing the Vantage app for your job applications. It takes about 10 minutes; tap
Allow / Yes when asked."

## 1. Download the installer

Download into a short folder that is not cloud-synced (`~/Developer/VantageApp` on macOS, `%USERPROFILE%\VantageApp` on
Windows): long paths break Windows. Read `https://api.github.com/repos/<owner>/<repo>/releases/latest` (owner/repo from the
link) and take the asset for the system:

| System | Asset |
|---|---|
| macOS Apple Silicon (`uname -m` = arm64) | `Vantage_<version>_aarch64.dmg` |
| macOS Intel (x86_64) | `Vantage_<version>_x64.dmg` |
| Windows | `Vantage_<version>_x64-setup.exe` |

No release, or the installer fails twice: build from source (last section).

## 2. Install the app

- **macOS:** quit Vantage if it runs; `hdiutil attach -nobrowse -quiet <dmg>`, copy `Vantage.app` to `/Applications` with
  `ditto`, `hdiutil detach`. The app is not signed by Apple, so remove the download mark
  (`xattr -dr com.apple.quarantine /Applications/Vantage.app`) and tell the user in one sentence that you did and why.
- **Windows:** `Unblock-File <exe>`, then `Start-Process <exe> -ArgumentList '/S' -Wait`. If a blue SmartScreen window
  still appears, tell the user: **More info**, then **Run anyway**.

Then delete the downloaded installer (only that file).

## 3. Python (optional, can be done later)

Vantage's scripts (PDFs, Excel tracker, import and export) need Python 3: `python3 --version` (macOS) or `py --version`
(Windows). Missing: macOS `xcode-select --install`; Windows `winget install -e --id Python.Python.3.12 --silent`. Then
`python3 -m pip install --user python-docx openpyxl markdown pypdf Pillow` (Windows: `py -m pip ...`). If this fails,
continue and mention it once: **Profile > System check** in the app finds and fixes what is missing.

## 4. Open the app

`open -a Vantage` (macOS) or the Start menu shortcut (Windows). The app does the rest by itself; tell the user what to
expect:
1. It offers **Set up a new Vantage folder** (default `~/Documents/Vantage`, on Windows `%USERPROFILE%\Vantage`, outside
   OneDrive) and asks for the full name. The files come built into the app; nothing else is downloaded.
2. The **Nova** chat shows how to connect Claude Code (the app installs it and opens the sign-in page; a Claude Pro or Max
   account is needed).
3. After the sign-in the user says hi to Nova in the chat; Nova then starts the first-run questions (she does not start on her own).

Tell the user in one message that Vantage is installed and that everything continues inside the app.

## Updates

- **The app** checks the latest release on every start, downloads a new version in the background and shows "Vantage x.y
  is ready, Restart to update" with "What's new".
- **The files in the Vantage folder** (agents, procedures, scripts) are updated when the app shows "Vantage update
  available" and the user presses **Update now**: `scripts/apply_update.py` compares hashes and replaces system files after
  a backup. Personal data is never touched.

## When something fails

| Problem | What you do and say |
|---|---|
| No internet / GitHub not reachable | Wait a minute, try twice more. Then: "I can't reach GitHub right now. I'll try again when you're back online." |
| Disk full | Free space only in the build folder (`src-tauri/target`); then: "Your disk is almost full; I need about 4 GB free to finish." |
| A tool needs an administrator the user is not | Use the per-user option above. If there is none: name the tool in one sentence and stop there. |
| Installer cannot run | Try once more after `Unblock-File` / removing the quarantine mark; then build from source. |
| Build from source keeps failing | Say it failed and show the last 5 lines of the error. |
| `Documents/Vantage` cannot be written | Say so in one sentence and ask the user to tap Allow if a permission card appears; never choose another location silently. |

## Build from source (fallback only)

Use this only when no release installer is available or it failed. It needs more tools and time (Windows: about
25 minutes and 6-8 GB for the C++ build tools).
- macOS: Command Line Tools (`xcode-select --install`), Node.js LTS (official archive into `~/.vantage-tools/node`,
  no admin), Rust (`curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y`).
- Windows (each `winget` may show a prompt: **Yes**): `Git.Git`, `OpenJS.NodeJS.LTS`, `Rustlang.Rustup` (then
  `rustup default stable-msvc`), `Microsoft.VisualStudio.2022.BuildTools` with
  `--override "--wait --passive --add Microsoft.VisualStudio.Workload.VCTools --includeRecommended"`.
- In the source folder: `npm install`, `npx tauri icon app-icon.png`, then `npx tauri build --bundles app` (macOS) or
  `npx tauri build --bundles nsis` (Windows). Install `src-tauri/target/release/bundle/macos/Vantage.app` with `ditto`
  (a local build opens without a warning) or run the NSIS installer in `src-tauri\target\release\bundle\nsis\` with `/S`.

## For the maintainer

- The one setting: `vantage.json` → `"github_repo": "owner/repo"` (public repository). Empty = no update checks.
- Release: update `RELEASE_NOTES.md`, bump the version in `src-tauri/tauri.conf.json` and `src-tauri/Cargo.toml`, push a
  tag `vX.Y.Z`. `.github/workflows/release.yml` builds, signs the update files and publishes the release.
- Secret (GitHub > Settings > Secrets and variables > Actions): `TAURI_SIGNING_PRIVATE_KEY` (the private updater key,
  which has no password). The public key is in `src-tauri/tauri.conf.json`. Never
  commit the private key.
- `kit/` is the Vantage package without personal data (root `CLAUDE.md`, `.claude/agents/`, `_TEMPLATE/`). It is built into the app and also published as `Vantage_Kit.zip`, the source of "Update now".
