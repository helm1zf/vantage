<p align="center">
  <img src="docs/assets/banner.svg" alt="Vantage" width="100%">
</p>

<p align="center">
  <a href="https://github.com/helm1zf/vantage/releases/latest"><img alt="Release" src="https://img.shields.io/github/v/release/helm1zf/vantage?style=flat-square&color=E4511F&labelColor=1B1A18"></a>
  <a href="https://github.com/helm1zf/vantage/actions/workflows/release.yml"><img alt="Build" src="https://img.shields.io/github/actions/workflow/status/helm1zf/vantage/release.yml?style=flat-square&labelColor=1B1A18"></a>
  <img alt="Platforms" src="https://img.shields.io/badge/platform-macOS%20%7C%20Windows-lightgrey?style=flat-square&labelColor=1B1A18">
  <a href="LICENSE"><img alt="License: MIT" src="https://img.shields.io/badge/license-MIT-lightgrey?style=flat-square&labelColor=1B1A18"></a>
</p>

<p align="center">
  <a href="#screenshots">Screenshots</a> &nbsp;/&nbsp;
  <a href="#installation">Installation</a> &nbsp;/&nbsp;
  <a href="#features">Features</a> &nbsp;/&nbsp;
  <a href="#how-it-works">How it works</a> &nbsp;/&nbsp;
  <a href="#privacy">Privacy</a> &nbsp;/&nbsp;
  <a href="#development">Development</a>
</p>

<p align="center"><sub>English &nbsp;|&nbsp; <a href="README.id.md">Bahasa Indonesia</a></sub></p>

---

Vantage is a desktop app for a job search, with a built-in team of assistants that run on your own Claude account. They find
job ads, score how well each one fits you, write a tailored CV and cover letter, and prepare you for the interview. The app
shows the result on one screen and keeps everything in a folder on your computer.

The app is available in English, German and Indonesian. The assistants are written for Indonesian-speaking applicants
looking for working-student, internship and entry-level positions in Germany; sections that do not apply to you, such as
work-permit topics, are skipped.

## Screenshots

<p align="center">
  <img src="docs/assets/screenshot-dashboard.png" alt="Vantage dashboard" width="100%">
</p>

<p align="center">
  <img src="docs/assets/screenshot-board.png" alt="Vantage applications board" width="100%">
</p>

<sub>Shown with the built-in sample data. No real applications or personal data are included in this repository.</sub>

## Installation

1. Download the installer from the [latest release](https://github.com/helm1zf/vantage/releases/latest): `Vantage_<version>_aarch64.dmg`
   (Mac with Apple Silicon), `Vantage_<version>_x64.dmg` (Intel Mac) or `Vantage_<version>_x64-setup.exe` (Windows).
2. Install and open it. On first start the app offers **Set up a new Vantage folder** (`~/Documents/Vantage`, on Windows
   `%USERPROFILE%\Vantage`) and asks for your full name. The files it needs are built into the app.
3. The **Nova** chat shows how to connect Claude Code (the app installs it and opens the sign-in page). A Claude Pro or Max
   account is required.

To let Claude do steps 1 and 2 for you, open **Code** in the Claude app and send
`Please install Vantage from this link: https://github.com/helm1zf/vantage`. The steps it follows are in [INSTALL.md](INSTALL.md).

**The app is not signed** by Apple or Microsoft, so the first launch is blocked. macOS: right-click the app, choose **Open**
(or run `xattr -dr com.apple.quarantine /Applications/Vantage.app`). Windows SmartScreen: **More info**, then **Run anyway**.
Building from source (see [Development](#development)) opens on macOS without a warning.

## Features

| Area | What it does |
|---|---|
| Dashboard | Status, response rate, what needs attention, today's tasks with a weekly goal, what changed since your last visit, and a card for anything that needs a look. Cards can be hidden. |
| Inbox | Drop any files or folders. **Tidy up** sorts them into your documents; parts of an old Vantage folder go back where they belong. |
| Morning report | Daily job ads with a match score. Runs on demand or by itself at a time you choose. |
| Applications | Board and list. Search, sort, minimum match, move several cards at once, add an application by hand, export to CSV and calendar (.ics). Details hold documents, a timeline of contacts and notes, and a follow-up draft in three languages. |
| Interview | Preparation per application with a checklist, practice log and the Laras chat. |
| Profile, Skills, Learn | Source materials, Master CV, skill gaps from the ads you analysed, study plans and a week-by-week tracker. |
| Offers | Compare offers with weights you set. |
| Your data | **Export account** writes one zip with a list of every file; **Import account** takes it back exactly and proves that nothing is missing. **Fix misplaced files** and **System check** repair the folder. |
| Chats | Nova (ask anything), Raka (your profile), the Applications group (Sinta, Arga, Bayu, Tari) and Laras (interview practice). Buttons start the right agent directly. Light and dark theme; keyboard search with Ctrl/Cmd+K. |

## How it works

The assistants run on your own Claude Code. Buttons in the app start the agent that owns the task; in the Applications group
you can address a member directly (`@Sinta`), and everything else goes to Nova, who calls the others.

<p align="center">
  <img src="docs/assets/flow.svg" alt="Nova routes work to Raka, Sinta, Arga, Bayu, Tari and Laras" width="100%">
</p>

| Agent | Responsibility |
|---|---|
| Raka | Interviews you about your experience, processes your materials, and is the only agent that writes your fact base. |
| Sinta | Searches for ads that match your profile and checks that links point to the employer's own live page. |
| Arga | Maps every requirement of an ad to evidence in your facts and scores the fit (default threshold 80). |
| Bayu | Writes the tailored CV and cover letter from that evidence and exports them as PDF. |
| Tari | Reviews each PDF and returns a pass or a numbered list of fixes, for up to three rounds. |
| Laras | Researches the company, runs practice interviews and debriefs. |

Documents are written from evidence in your own fact base, not from generic templates. Anything you note in the app (contacts,
practice scores, goals) is mirrored to a read-only text file (`ui_context.md`) so the agents know it without being told.

## Updates

The app updates itself: a banner offers a restart and *What's new* lists the changes. The agents and scripts in your folder
update when the app shows *Vantage update available* and you press **Update now**: system files are compared by hash and
replaced after a backup. Your materials, applications and reports are never overwritten.

## Privacy

- All data stays in your Vantage folder on your computer.
- The app itself writes your settings, Inbox copies and tracker changes (moving, adding or removing an application) and creates exports; every change it makes to the tracker is logged in `app_changes.log`.
- The agents read and write inside the Vantage folder only. Besides Python scripts, `ls` and `mkdir`, a shell command needs your approval in the chat, and commands that delete or change system settings are never allowed.
- Nothing is sent anywhere except your requests to Claude, the web pages the agents open for a search, and update checks on GitHub.

## Development

Vantage is built with [Tauri v2](https://tauri.app): a Rust shell in `src-tauri/` and a plain HTML, CSS and JavaScript
interface in `ui/`. The `kit/` directory is the template of the user's folder; it is built into the app and published as
`Vantage_Kit.zip`.

```text
.
├── ui/              interface (index.html, app.js, nova.js, chatdock.js, tour.js, features/)
├── src-tauri/       Rust shell, capabilities and the unit tests
├── kit/             agents, procedures, templates and the Python scripts the app runs
├── tools/           translation check, kit script tests (tests/), UI tests (ui-tests/)
├── docs/assets/     images used in this README
├── .github/         checks (ci.yml) and release (release.yml) workflows
├── INSTALL.md       installation steps for Claude
└── vantage.json     publishing setting (github_repo)
```

To run locally you need [Node.js](https://nodejs.org) and the [Rust toolchain](https://rustup.rs):

```bash
npm install
npx tauri icon app-icon.png   # icons are generated and not committed
npm run dev
```

Checks (also run by `ci.yml` on every push to main):

```bash
node tools/check_i18n.js                                   # every UI text has German and Indonesian
python3 -m unittest discover -s tools/tests                # export/import, move and add application, tracker export
node tools/ui-tests/run.js                                 # the UI with a mocked backend (needs playwright)
cd src-tauri && cargo clippy --all-targets && cargo test
```

### Releasing

1. Update `RELEASE_NOTES.md` and the version in `package.json`, `src-tauri/tauri.conf.json` and `src-tauri/Cargo.toml`.
   If the kit changed: add an entry to `kit/_TEMPLATE/--settings/docs/riwayat_migrasi.md`, set `.vantage_version` to its date and run
   `python3 kit/_TEMPLATE/--settings/scripts/generate_update.py`.
2. Push a tag such as `v0.9.0`.
3. The [release workflow](.github/workflows/release.yml) builds macOS (Apple Silicon and Intel) and Windows, signs the update
   files and publishes the release with `latest.json` and `Vantage_Kit.zip`. Installed apps pick it up on their next start.

The updater signing key is stored once as the repository secret `TAURI_SIGNING_PRIVATE_KEY` (Settings, Secrets and variables,
Actions). It has no password and is never committed.

## License

Released under the [MIT License](LICENSE). Copyright (c) 2026 punktepy.
