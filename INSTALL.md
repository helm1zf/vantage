# Installing Vantage (instructions for Claude)

The user said something like *"please install Vantage from this link"*. Do **everything** below yourself, from start to
finish, in this chat. The user only taps **Allow** on permission cards (and, on Windows, **Yes** on system prompts).
The user is not an IT professional.

**Rules**
- Never ask the user to open a terminal, type a command, pick a folder or start a new chat.
- Never ask for, view or store a password. If the system itself asks for one, the user types it there, not in the chat.
- Every step is safe to run again: check first, skip what is already done. Never delete or overwrite a personal
  folder inside `Documents/Vantage` (anything next to `_TEMPLATE`).
- Keep messages short and in plain words. Report progress at most once per step.
- If a step fails: read the error, fix it once in the smallest way (missing tool, network hiccup, full disk), and try
  again. If it still fails, tell the user in one or two sentences what failed and what you will do instead (see
  "When something fails"). Never leave a half-finished install without saying so.

**Before you start**, you may look through this repository first (README, this file, the app code): that is welcome.
Then tell the user in one short message what will happen, and start:
> I'm installing Vantage now: a desktop app for your job applications, plus the files Nova (your Vantage assistant in
> Claude) works with. It takes about 10 minutes. When a permission card or a Windows prompt appears, tap Allow / Yes.

## Paths

| | macOS | Windows |
|---|---|---|
| Download / source folder (short, not cloud-synced) | `~/Developer/VantageApp` | `%USERPROFILE%\VantageApp` |
| App | `/Applications/Vantage.app` | installed by the setup program (Start menu + desktop shortcut) |
| Vantage data folder | `~/Documents/Vantage` | `%USERPROFILE%\Vantage` |

On Windows the data folder is **not** in Documents: Documents is often inside OneDrive (e.g. `OneDrive\Dokumente`),
which syncs every file and makes paths too long for Windows. The app looks for the data folder exactly at these paths.
Below, `Documents/Vantage` means this data folder.

## 1. Check what is already there

- App installed and `Documents/Vantage/_TEMPLATE` exists → re-run: install the latest app (step 2), refresh the source
  folder (step 3), in step 4 only copy `vantage.json`, then continue with step 5.
- Otherwise do every step.

## 2. Install the app (prebuilt installer from the latest release)

Read `https://api.github.com/repos/<owner>/<repo>/releases/latest` (owner/repo from the link) and pick the asset:

| System | Asset |
|---|---|
| macOS Apple Silicon (`uname -m` = arm64) | `Vantage_<version>_aarch64.dmg` |
| macOS Intel (x86_64) | `Vantage_<version>_x64.dmg` |
| Windows | `Vantage_<version>_x64-setup.exe` |

Download it into the short folder above, then:
- **macOS:** quit Vantage if it is running; `hdiutil attach -nobrowse -quiet <dmg>`, copy `Vantage.app` from the mounted
  volume to `/Applications` with `ditto`, `hdiutil detach` the volume. The app is not signed by Apple, so macOS would
  block it on first open ("cannot be opened"); because the user asked for this install, remove the download mark:
  `xattr -dr com.apple.quarantine /Applications/Vantage.app`. Tell the user in one sentence that you did this and why.
- **Windows:** `Unblock-File <exe>`, then run it silently: `Start-Process <exe> -ArgumentList '/S' -Wait`. The app is
  not signed by Microsoft; run this way, SmartScreen does not stop it. If Windows still shows a blue SmartScreen
  window, tell the user: click **More info**, then **Run anyway**.

No release, or the installer fails twice → build from source instead (section "Build from source" at the end).

## 3. Get the Vantage files (needed for the data folder)

Never download or extract into your own working, scratchpad, temporary or OneDrive folder: their long names break the
260-character path limit of Windows ("path too long", files missing). Use the short folder from the table.
- Preferred, no git needed: download `Vantage_Kit.zip` from the same latest release and extract it into
  `<source folder>\kit` (Windows: `Expand-Archive <zip> -DestinationPath $env:USERPROFILE\VantageApp\kit -Force`;
  macOS: `ditto -x -k <zip> ~/Developer/VantageApp/kit`). It contains `CLAUDE.md`, `.claude/`, `_TEMPLATE/` and
  `vantage.json`.
- Only if the release has no `Vantage_Kit.zip`: `git -c core.longpaths=true clone --depth 1 <link> <source folder>`
  (or download `<link>/archive/HEAD.zip` and extract it into the short source folder), then use its `kit/` folder and
  the `vantage.json` next to it.
- Python 3 (Nova uses it to make PDFs and the Excel tracker): `python3 --version` (macOS) / `py --version` (Windows).
  Missing → macOS: comes with the Command Line Tools (`xcode-select --install`, the user clicks Install); Windows:
  `winget install -e --id Python.Python.3.12 --silent`. Then
  `python3 -m pip install --user python-docx openpyxl markdown pypdf Pillow` (Windows: `py -m pip ...`).
  If this fails, continue anyway and mention it once; Nova installs what is missing later.

## 4. Create the Vantage data folder

Create `Documents/Vantage` if it does not exist, then copy from the source folder:
- `kit/CLAUDE.md` → `Documents/Vantage/CLAUDE.md`
- `kit/.claude/` → `Documents/Vantage/.claude/`
- `kit/_TEMPLATE/` → `Documents/Vantage/_TEMPLATE/`
- `vantage.json` (in the kit zip, or next to `kit/` in a clone) → `Documents/Vantage/vantage.json` (lets Nova fetch
  updates of these files later)

On a re-run, only copy `vantage.json`. The other files are updated by Nova ("update", `sop/update.md`), never by this
installer, and personal folders are never touched.

After a successful setup, delete the downloaded installer, `Vantage_Kit.zip` and the extracted `kit` folder in the short
download folder (only those, never anything in `Documents/Vantage`), so no second copy of the Vantage files stays
behind. Tell the user in one line: "I removed the temporary download files; your Vantage folder is <path>."

If anything above was skipped, the app also helps on its own: when it cannot find a Vantage folder it offers "Set up a
new Vantage folder" (from a template built into the app) or "Choose my existing folder", and it completes an empty or
incomplete folder instead of showing an error.

## 5. Open the app

`open -a Vantage` (macOS) or start it from the Start menu shortcut (Windows). It finds `Documents/Vantage` by itself
and shows "Almost there: Nova is setting up your personal folder". As soon as Nova has created the personal folder
(step 6), the app opens it on its own. Nothing to pick.

## 6. Hand over to Nova, in this same chat

Nova is the Vantage assistant: the files in `Documents/Vantage` describe how Claude helps with job applications
(it reads and writes only inside that folder). Ask the user one clear yes/no question: *"Vantage is installed.
Shall I start Nova, your Vantage assistant, here now? (You can also say no and start later.)"* On yes, continue
right here as **Nova**, without asking them to open anything. On no, finish with step 7 and explain how to start later:
1. Read, with absolute paths: `Documents/Vantage/CLAUDE.md`, then
   `Documents/Vantage/_TEMPLATE/--settings/onboarding/project_mode.md` ("Pembukaan") and
   `Documents/Vantage/_TEMPLATE/--settings/onboarding/first_run.md`.
2. From now on follow those files as Nova. Every relative path in them means "inside `Documents/Vantage`". Where they
   hand work to a specialist agent (`.claude/agents/`), read that agent's card in `--settings/agents/<name>.md` and do
   the work yourself in this chat.
3. Start with Nova's greeting as written there (short, asks for the user's name). Ask for folder access only when a
   tool needs it; the user taps Allow.

First-run step 3 creates the personal folder next to `_TEMPLATE`; the app picks it up within a few seconds.

## 7. Ready

When the personal folder exists and the app shows it, tell the user in one short message that Vantage is ready and
that they can keep talking to Nova here. Mention once, honestly: in a **new** Claude Code chat, Nova starts on its own
when that chat is opened in the `Documents/Vantage` folder; in any other chat, "Nova, open my Vantage folder" is
enough for Claude to read it.

## Updates

- **The app updates itself.** On every start it checks the latest GitHub release of this repository (set in
  `vantage.json`), downloads a new version in the background and shows "Vantage x.y is ready, Restart to update" with
  "What's new". If the user does not restart, the update is used at the next start.
- **The files in `Documents/Vantage`** are updated by Nova: the app shows "Vantage update available"; Nova follows
  `sop/update.md` (it downloads `kit/` from this repository; personal data stays untouched, with a backup first).

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
- `kit/` is the Vantage package without personal data (root `CLAUDE.md`, `.claude/agents/`, `_TEMPLATE/`).
