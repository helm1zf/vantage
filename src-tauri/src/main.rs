// Vantage: a window onto the Vantage folder. The pages read it; Nova and the team work in it through the user's own
// Claude Code in the Nova tab (nova.rs).
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod nova;
mod sched;

use serde::Serialize;
use tauri::{AppHandle, Manager};
use std::{
    fs,
    path::{Path, PathBuf},
    process::Command,
    time::SystemTime,
};

#[derive(Serialize, Default, Clone)]
struct AppItem {
    id: String,
    name: String,
    company: String,
    role: String,
    #[serde(rename = "type")]
    kind: String,
    fit: f64,
    status: String,
    next: String,
    due: String,
    date: String,
    folder: String,
    prep: bool,
    stage: String,
    // Details for the application drawer.
    company_full: String,
    status_date: String,
    location: String,
    source: String,
    deadline: String,
    start: String,
    duration: String,
    link: String,
    notes: String,
    missing: bool, // the tracker points to a folder that no longer exists
}

// Read the "Applications" sheet of Application_Tracker.xlsx (read-only).
fn read_tracker(path: &Path) -> Vec<AppItem> {
    use calamine::{open_workbook, Reader, Xlsx};
    let Ok(mut wb): Result<Xlsx<_>, _> = open_workbook(path) else { return vec![] };
    let Ok(range) = wb.worksheet_range("Applications") else { return vec![] };
    let mut rows = range.rows();
    let Some(head) = rows.next() else { return vec![] };
    let names: Vec<String> = head.iter().map(|c| c.to_string().trim().to_lowercase()).collect();
    let col = |n: &str| names.iter().position(|x| x == n);
    let (ci, cc, cr, ct, cf, cs, cn, cd, cg) = (
        col("id"), col("perusahaan"), col("posisi"), col("tipe"), col("fit %"),
        col("status"), col("next action"), col("due"), col("tgl ketemu"),
    );
    let cfo = col("folder");
    let (csd, clo, csu, cdl, cst, cdu, cli, cno) = (
        col("tgl status"), col("lokasi"), col("sumber"), col("deadline"),
        col("mulai kerja"), col("durasi"), col("link jd"), col("catatan"),
    );
    let get = |r: &[calamine::Data], i: Option<usize>| -> String {
        i.and_then(|i| r.get(i)).map(|c| c.to_string()).unwrap_or_default().trim().to_string()
    };
    let mut out = Vec::new();
    for r in rows {
        let company = get(r, cc);
        if company.is_empty() { continue; }
        let company_full = company.clone();
        let company = company.split(" - ").next().unwrap_or(&company).trim().to_string();
        out.push(AppItem {
            company_full,
            status_date: get(r, csd),
            location: get(r, clo),
            source: get(r, csu),
            deadline: get(r, cdl),
            start: get(r, cst),
            duration: get(r, cdu),
            link: get(r, cli),
            notes: get(r, cno),
            missing: false,
            id: get(r, ci),
            name: company.clone(),
            company,
            role: get(r, cr),
            kind: get(r, ct),
            fit: get(r, cf).parse::<f64>().unwrap_or(0.0),
            status: get(r, cs),
            next: get(r, cn),
            due: get(r, cd),
            date: get(r, cg),
            folder: get(r, cfo),
            prep: false,
            stage: String::new(),
        });
    }
    out
}

// applications.json is the tracker's source of truth (sop/lamaran.md); the xlsx is generated from it.
fn read_apps_json(path: &Path) -> Vec<AppItem> {
    let Ok(t) = fs::read_to_string(path) else { return vec![] };
    let Ok(v) = serde_json::from_str::<serde_json::Value>(&t) else { return vec![] };
    let Some(list) = v["applications"].as_array() else { return vec![] };
    let s = |a: &serde_json::Value, k: &str| match &a[k] {
        serde_json::Value::String(x) => x.trim().to_string(),
        serde_json::Value::Number(n) => n.to_string(),
        _ => String::new(),
    };
    list.iter()
        .filter(|a| !s(a, "perusahaan").is_empty())
        .map(|a| {
            let full = s(a, "perusahaan");
            let company = full.split(" - ").next().unwrap_or(&full).trim().to_string();
            let fit = a["fit_score"].as_f64().unwrap_or(0.0);
            AppItem {
                id: s(a, "id"),
                name: company.clone(),
                company,
                company_full: full,
                role: s(a, "posisi"),
                kind: s(a, "tipe"),
                fit: if fit > 1.0 { fit / 100.0 } else { fit },
                status: s(a, "status"),
                next: s(a, "next_action"),
                due: s(a, "next_action_due"),
                date: s(a, "tanggal_ketemu"),
                folder: s(a, "folder"),
                status_date: s(a, "tanggal_status"),
                location: s(a, "lokasi"),
                source: s(a, "sumber"),
                deadline: s(a, "deadline"),
                start: s(a, "mulai_kerja"),
                duration: s(a, "durasi"),
                link: s(a, "link"),
                notes: s(a, "catatan"),
                ..Default::default()
            }
        })
        .collect()
}

#[derive(Serialize, Default)]
struct MatItem {
    name: String,
    kind: String,
    count: usize, // files inside (recursive) for folders
    kb: u64,
    modified: u64,
    // From the kupas table in materials/00_index.md (Raka keeps it):
    // "done" | "partly" | "todo" | "skip" (Relevan: tidak dibawa) | "unknown" (no status table in the index yet)
    // | "" (not a material to unpack, e.g. the photo).
    kupas: String,
    kupas_note: String,
    // Set for items inside a category folder (education/, research/, ...): the folder name. Empty for top-level materials.
    group: String,
}

// Rows of the kupas table in materials/00_index.md: (ID, File, status, note). None when the file has no such table at
// all (a folder made before status tracking existed): then nothing is known, which is not the same as "not discussed".
fn kupas_table(path: &Path) -> Option<Vec<(String, String, String, String)>> {
    let Ok(text) = fs::read_to_string(path) else { return None };
    let cells = |l: &str| l.trim().trim_matches('|').split('|').map(|c| c.trim().to_string()).collect::<Vec<_>>();
    let mut head: Option<Vec<String>> = None;
    let mut rows = vec![];
    for line in text.lines() {
        let t = line.trim();
        if !t.starts_with('|') {
            if head.is_some() { break; }
            continue;
        }
        let c = cells(t);
        let Some(h) = head.as_ref() else {
            if c.iter().any(|x| x.eq_ignore_ascii_case("ID")) && c.iter().any(|x| x.to_lowercase().contains("dibaca")) { head = Some(c); }
            continue;
        };
        if c.iter().all(|x| x.chars().all(|ch| ch == '-' || ch == ':' || ch == ' ')) { continue; }
        let get = |name: &str| h.iter().position(|x| x.to_lowercase().contains(name)).and_then(|i| c.get(i).cloned()).unwrap_or_default();
        let yes = |v: &str| { let v = v.to_lowercase(); !(v.is_empty() || ["-", "—", "belum", "tidak", "no", "x", "❌"].contains(&v.as_str())) };
        let steps = [get("dibaca"), get("fakta"), get("dikonfirmasi")];
        let done = steps.iter().filter(|v| yes(v)).count();
        let status = if get("relevan").to_lowercase().starts_with("tidak dibawa") { "skip" }
            else if done == 3 { "done" } else if done > 0 { "partly" } else { "todo" };
        let dash = |v: &str| if v.trim().is_empty() { "-".to_string() } else { v.trim().to_string() };
        let note = format!("Read: {} · Facts: {} · Confirmed: {}", dash(&steps[0]), dash(&steps[1]), dash(&steps[2]));
        rows.push((get("id"), get("file"), status.to_string(), note));
    }
    head.map(|_| rows)
}

// Files, total size (KB) and newest modification time under a folder (hidden files skipped).
// Category folders: Raka (or the user) may sort materials into education/, research/, workflow_import/ ... Such a folder is not one
// material, its sub-folders are: each project gets its own entry (named "research/RES2_x") grouped under the category.
const CATEGORY_NAMES: &[&str] = &[
    "education", "research", "projects", "project", "work", "experience", "organisations", "organizations", "org", "certificates",
    "certs", "skills", "courses", "publications", "languages", "language", "workflow_import", "imported", "import", "other", "misc", "archive",
];
fn is_category_dir(p: &Path) -> bool {
    let n = p.file_name().map(|s| s.to_string_lossy().to_string()).unwrap_or_default();
    if n.is_empty() || n.starts_with('.') { return false; }
    let (mut subdirs, mut files) = (0usize, 0usize);
    if let Ok(rd) = fs::read_dir(p) {
        for e in rd.flatten() {
            if e.file_name().to_string_lossy().starts_with('.') { continue; }
            if e.path().is_dir() { subdirs += 1 } else { files += 1 }
        }
    }
    if subdirs == 0 { return false; }
    if CATEGORY_NAMES.contains(&n.to_lowercase().as_str()) { return true; }
    // Any other plain lowercase folder with several sub-folders and few loose files reads as a category too.
    n == n.to_lowercase() && n.chars().all(|c| c.is_ascii_lowercase() || c == '_' || c == '-') && subdirs >= 2 && files <= subdirs
}
fn mat_item(p: &Path, name: String, group: &str) -> MatItem {
    if p.is_dir() {
        let (count, kb, modified) = dir_stats(p);
        MatItem { name, kind: "folder".into(), count, kb, modified, group: group.to_string(), ..Default::default() }
    } else {
        let kb = fs::metadata(p).map(|m| m.len() / 1024).unwrap_or(0);
        MatItem { name, kind: "file".into(), count: 1, kb, modified: mtime(p), group: group.to_string(), ..Default::default() }
    }
}
// Hidden files and the materials index (00_index.md) are not materials.
fn list_materials(mats: &Path) -> Vec<MatItem> {
    let mut items = Vec::new();
    let Ok(rd) = fs::read_dir(mats) else { return items };
    for e in rd.flatten() {
        let n = e.file_name().to_string_lossy().to_string();
        if n.starts_with('.') || n.to_lowercase().starts_with("00_index") { continue; }
        let p = e.path();
        if p.is_dir() && is_category_dir(&p) {
            if let Ok(inner) = fs::read_dir(&p) {
                for c in inner.flatten() {
                    let cn = c.file_name().to_string_lossy().to_string();
                    if cn.starts_with('.') || cn.starts_with('~') { continue; }
                    items.push(mat_item(&c.path(), format!("{n}/{cn}"), &n));
                }
            }
        } else {
            items.push(mat_item(&p, n, ""));
        }
    }
    items.sort_by(|a, b| a.name.cmp(&b.name));
    items
}

fn dir_stats(p: &Path) -> (usize, u64, u64) {
    let (mut n, mut bytes, mut newest) = (0usize, 0u64, 0u64);
    let mut stack = vec![p.to_path_buf()];
    while let Some(d) = stack.pop() {
        let Ok(rd) = fs::read_dir(&d) else { continue };
        for e in rd.flatten() {
            if e.file_name().to_string_lossy().starts_with('.') {
                continue;
            }
            let q = e.path();
            if q.is_dir() {
                stack.push(q);
            } else if let Ok(m) = e.metadata() {
                n += 1;
                bytes += m.len();
                let t = m.modified().ok().and_then(|t| t.duration_since(SystemTime::UNIX_EPOCH).ok()).map(|d| d.as_secs()).unwrap_or(0);
                newest = newest.max(t);
            }
        }
    }
    (n, bytes / 1024, newest)
}

#[derive(Serialize, Default)]
struct InboxItem {
    name: String,
    kb: u64,
    modified: u64,
    folder: bool,
}

#[derive(Serialize, Default)]
struct Report {
    date: String,
    text: String,
    // Laporan Pagi v2: the report's JSON (latest run of the day) and its PDF, relative to the user folder.
    data: Option<serde_json::Value>,
    pdf: String,
}

#[derive(Serialize, Default)]
struct Status {
    ok: bool,
    error: String,
    user: String,
    materials: usize,
    mat_items: Vec<MatItem>,
    raw_facts_kb: u64,
    pipeline: usize,
    sent: usize,
    interview: usize,
    tracker: bool,
    report_date: String,
    report_text: String,
    reports: Vec<Report>,
    full_name: String,
    inbox: Vec<InboxItem>,
    cv_modified: u64,
    raw_facts_modified: u64,
    tagline: String,
    apps: Vec<AppItem>,
}


// On Windows, helper processes must not flash a console window.
#[cfg(windows)]
fn quiet(cmd: &mut Command) -> &mut Command {
    use std::os::windows::process::CommandExt;
    cmd.creation_flags(0x0800_0000) // CREATE_NO_WINDOW
}
#[cfg(not(windows))]
fn quiet(cmd: &mut Command) -> &mut Command {
    cmd
}

fn is_app_dir(p: &Path) -> bool {
    p.join("01_Analisis").is_dir() || p.join("00_Draft").is_dir() || p.join("02_ready_to_send").is_dir()
}

fn collect_apps(dir: &Path, depth: u32, out: &mut Vec<PathBuf>) {
    if depth > 6 {
        return;
    }
    let Ok(rd) = fs::read_dir(dir) else { return };
    for e in rd.flatten() {
        let p = e.path();
        if !p.is_dir() {
            continue;
        }
        if is_app_dir(&p) {
            out.push(p);
        } else {
            collect_apps(&p, depth + 1, out);
        }
    }
}

fn modified(p: &Path) -> SystemTime {
    fs::metadata(p).and_then(|m| m.modified()).unwrap_or(SystemTime::UNIX_EPOCH)
}

fn scan_sync(path: String) -> Status {
    let root = PathBuf::from(&path);
    let wf = root.join("02_workflow");
    let mut st = Status::default();
    if !wf.is_dir() {
        st.error = "This is not a personal Vantage folder. Please select the folder that contains 02_workflow.".into();
        return st;
    }
    st.ok = true;
    st.user = root.file_name().map(|s| s.to_string_lossy().to_string()).unwrap_or_default();
    st.full_name = display_name(&root);
    if let Ok(rd) = fs::read_dir(root.join(INBOX)) {
        let mut items: Vec<InboxItem> = rd
            .flatten()
            .filter(|e| !e.file_name().to_string_lossy().starts_with('.'))
            .map(|e| {
                let m = e.metadata().ok();
                InboxItem {
                    name: e.file_name().to_string_lossy().to_string(),
                    kb: m.as_ref().map(|m| m.len() / 1024).unwrap_or(0),
                    modified: m
                        .and_then(|m| m.modified().ok())
                        .and_then(|t| t.duration_since(SystemTime::UNIX_EPOCH).ok())
                        .map(|d| d.as_secs())
                        .unwrap_or(0),
                    folder: e.path().is_dir(),
                }
            })
            .collect();
        items.sort_by_key(|a| std::cmp::Reverse(a.modified));
        st.inbox = items;
    }

    let mats = root.join("01_user_documents").join("materials");
    if mats.is_dir() {
        let mut items = list_materials(&mats);
        let table = kupas_table(&mats.join("00_index.md"));
        for it in items.iter_mut() {
            let base = it.name.rsplit('/').next().unwrap_or(&it.name).to_string();
            let n = base.to_lowercase();
            if n.contains("photo") || n.contains("foto") { continue; }
            let id = base.split('_').next().unwrap_or("").to_lowercase();
            let Some(rows) = table.as_ref() else {
                it.kupas = "unknown".into();
                it.kupas_note = "This folder has no status table yet (materials/00_index.md)".into();
                continue;
            };
            let row = rows.iter().find(|r| (!r.0.is_empty() && r.0.to_lowercase() == id) || (!r.1.is_empty() && r.1.trim_matches('`').to_lowercase().starts_with(&n)));
            match row {
                Some(r) => { it.kupas = r.2.clone(); it.kupas_note = r.3.clone(); }
                None => { it.kupas = "todo".into(); it.kupas_note = "Not in the kupas table (materials/00_index.md) yet".into(); }
            }
        }
        st.materials = items.len();
        st.mat_items = items;
    }
    st.raw_facts_kb = fs::metadata(root.join("01_user_documents").join("raw_facts_about_you.md"))
        .map(|m| m.len() / 1024)
        .unwrap_or(0);
    st.tracker = wf.join("03_Tracker").join("Application_Tracker.xlsx").is_file();
    let mc = master_cv(path.clone());
    st.cv_modified = mc.cv_modified;
    st.raw_facts_modified = mc.raw_facts_modified;
    // One-line headline for the profile page, from the Master CV source.
    st.tagline = fs::read_to_string(root.join("01_user_documents").join("Master_CV").join("master_cv_content.json"))
        .ok()
        .and_then(|t| serde_json::from_str::<serde_json::Value>(&t).ok())
        .and_then(|v| v["tagline"].as_str().map(|x| x.trim_start_matches("Master CV").trim_start_matches([' ', '·']).trim().to_string()))
        .filter(|t| !t.contains("<TAILOR"))
        .unwrap_or_default();

    let mut pipeline = Vec::new();
    collect_apps(&wf.join("01_Pipeline"), 0, &mut pipeline);
    let mut sent = Vec::new();
    collect_apps(&wf.join("02_Sent"), 0, &mut sent);
    st.pipeline = pipeline.len();
    st.sent = sent.len();
    st.interview = sent.iter().chain(pipeline.iter()).filter(|p| p.join("Interview_Prep").is_dir()).count();

    // Application folders by name, to find a folder the tracker points to after it was moved.
    let by_name: Vec<(String, PathBuf)> = pipeline
        .iter()
        .chain(sent.iter())
        .map(|p| (p.file_name().map(|s| s.to_string_lossy().to_string()).unwrap_or_default(), p.clone()))
        .collect();
    let rel = |p: &Path| p.strip_prefix(&wf).map(|r| r.to_string_lossy().replace('\\', "/")).unwrap_or_default();
    let mut all: Vec<(PathBuf, &str)> = pipeline.into_iter().map(|p| (p, "disiapkan")).collect();
    all.extend(sent.into_iter().map(|p| (p, "terkirim")));
    all.sort_by_key(|(p, _)| std::cmp::Reverse(modified(p)));
    let mut tracked = read_apps_json(&root.join("01_user_documents").join("--usersettings").join("applications.json"));
    if tracked.is_empty() {
        tracked = read_tracker(&wf.join("03_Tracker").join("Application_Tracker.xlsx"));
    }
    // All morning reports, newest first (read-only).
    let mut days: Vec<PathBuf> = fs::read_dir(wf.join("Laporan_Pagi"))
        .map(|rd| rd.flatten().map(|e| e.path()).filter(|p| p.is_dir()).collect())
        .unwrap_or_default();
    days.sort();
    days.reverse();
    for day in &days {
        let date = day.file_name().map(|s| s.to_string_lossy().to_string()).unwrap_or_default();
        let text: String = fs::read_to_string(day.join("00_README.md")).map(|t| t.chars().take(20000).collect()).unwrap_or_default();
        let mut files: Vec<String> = fs::read_dir(day)
            .map(|rd| rd.flatten().map(|e| e.file_name().to_string_lossy().to_string()).filter(|n| !n.starts_with('.')).collect())
            .unwrap_or_default();
        files.sort();
        // Latest run wins: YYYY-MM-DD_Laporan_Pagi.json, ..._run2.json, ...
        let json = files.iter().rfind(|n| n.contains("Laporan_Pagi") && n.ends_with(".json")).cloned();
        let data = json.as_ref().and_then(|n| fs::read_to_string(day.join(n)).ok()).and_then(|t| serde_json::from_str::<serde_json::Value>(&t).ok());
        let pdf_name = json
            .as_ref()
            .map(|n| n.trim_end_matches(".json").to_string() + ".pdf")
            .filter(|n| files.contains(n))
            .or_else(|| files.iter().find(|n| n.to_lowercase().ends_with(".pdf")).cloned());
        let pdf = pdf_name.map(|n| format!("02_workflow/Laporan_Pagi/{date}/{n}")).unwrap_or_default();
        if !text.is_empty() || data.is_some() {
            st.reports.push(Report { date, text, data, pdf });
        }
    }
    if let Some(r) = st.reports.first() {
        st.report_date = r.date.clone();
        st.report_text = r.text.clone();
    }
    if !tracked.is_empty() {
        st.apps = tracked
            .into_iter()
            .map(|mut a| {
                if !a.folder.is_empty() && !wf.join(&a.folder).is_dir() {
                    let last = a.folder.trim_end_matches('/').rsplit('/').next().unwrap_or("").to_string();
                    a.folder = by_name.iter().find(|(n, _)| *n == last).map(|(_, p)| rel(p)).unwrap_or_default();
                    a.missing = a.folder.is_empty();
                }
                a.prep = !a.folder.is_empty() && wf.join(&a.folder).join("Interview_Prep").is_dir();
                a
            })
            .collect();
        return st;
    }
    for (p, stage) in all.into_iter().take(8) {
        let name = p.file_name().map(|s| s.to_string_lossy().to_string()).unwrap_or_default();
        let parts: Vec<&str> = name.splitn(3, '_').collect();
        let company = if parts.len() >= 2 { parts[1].to_string() } else { name.clone() };
        st.apps.push(AppItem { name, company, folder: rel(&p), stage: stage.into(), status: if stage == "terkirim" { "Sent".into() } else { "Draft".into() }, ..Default::default() });
    }
    st
}

// The user's inbox folder, as named in the Vantage template.
const INBOX: &str = "--- I N B O X ---";

// A name in `dir` that does not exist yet: "file.pdf", "file (2).pdf", "file (3).pdf", ...
fn free_name(dir: &Path, name: &str) -> PathBuf {
    let p = dir.join(name);
    if !p.exists() {
        return p;
    }
    let (stem, ext) = match name.rfind('.') {
        Some(i) if i > 0 => (&name[..i], &name[i..]),
        _ => (name, ""),
    };
    (2..).map(|n| dir.join(format!("{stem} ({n}){ext}"))).find(|p| !p.exists()).unwrap()
}

// One Inbox copy at a time, so two drops never pick the same free name.
static INBOX_LOCK: std::sync::Mutex<()> = std::sync::Mutex::new(());
static INBOX_JOB: std::sync::atomic::AtomicU64 = std::sync::atomic::AtomicU64::new(0);

#[derive(Serialize, Clone, Default)]
struct InboxProgress {
    id: u64,
    phase: String, // "scan" | "download" (iCloud file not on this Mac yet) | "copy" | "done"
    current: String,
    done_items: usize,
    total_items: usize,
    done_bytes: u64,
    total_bytes: u64,
    added: Vec<String>,
    errors: Vec<String>,
}

struct Job {
    app: AppHandle,
    p: InboxProgress,
    last: std::time::Instant,
}

impl Job {
    fn emit(&mut self, force: bool) {
        use tauri::Emitter;
        if force || self.last.elapsed() >= std::time::Duration::from_millis(150) {
            self.last = std::time::Instant::now();
            let _ = self.app.emit_to("main", "inbox-progress", self.p.clone());
        }
    }
}

// Files and bytes below `p`; symlinks are skipped (a link to a folder could loop).
fn tally(p: &Path) -> (usize, u64) {
    let Ok(m) = fs::symlink_metadata(p) else { return (0, 0) };
    if m.file_type().is_symlink() {
        return (0, 0);
    }
    if !m.is_dir() {
        return (1, m.len());
    }
    fs::read_dir(p).map(|rd| rd.flatten().map(|e| tally(&e.path())).fold((0, 0), |a, b| (a.0 + b.0, a.1 + b.1))).unwrap_or((0, 0))
}

// iCloud Drive with "Optimise Mac Storage": the file is only a placeholder until it is downloaded.
// Reading it then blocks until macOS has fetched it, and can fail with "Operation timed out".
// Ask iCloud to download it first and wait (up to 15 minutes), showing "Downloading from iCloud".
#[cfg(target_os = "macos")]
fn ensure_local(src: &Path, job: &mut Job) {
    use std::os::macos::fs::MetadataExt;
    const SF_DATALESS: u32 = 0x4000_0000;
    let dataless = |p: &Path| fs::metadata(p).map(|m| m.st_flags() & SF_DATALESS != 0).unwrap_or(false);
    if !dataless(src) {
        return;
    }
    job.p.phase = "download".into();
    job.emit(true);
    let _ = Command::new("/usr/bin/brctl").arg("download").arg(src).stdout(std::process::Stdio::null()).stderr(std::process::Stdio::null()).status();
    let start = std::time::Instant::now();
    while dataless(src) && start.elapsed() < std::time::Duration::from_secs(900) {
        std::thread::sleep(std::time::Duration::from_millis(400));
        job.emit(false);
    }
    job.p.phase = "copy".into();
}
#[cfg(not(target_os = "macos"))]
fn ensure_local(_src: &Path, _job: &mut Job) {}

// APFS copy-on-write clone: instant for any size when source and Inbox are on the same disk.
#[cfg(target_os = "macos")]
fn clone_file(src: &Path, dst: &Path) -> bool {
    use std::ffi::CString;
    use std::os::unix::ffi::OsStrExt;
    extern "C" {
        fn clonefile(src: *const std::os::raw::c_char, dst: *const std::os::raw::c_char, flags: u32) -> std::os::raw::c_int;
    }
    let (Ok(s), Ok(d)) = (CString::new(src.as_os_str().as_bytes()), CString::new(dst.as_os_str().as_bytes())) else { return false };
    unsafe { clonefile(s.as_ptr(), d.as_ptr(), 0) == 0 }
}
#[cfg(not(target_os = "macos"))]
fn clone_file(_src: &Path, _dst: &Path) -> bool {
    false
}

// Streams the file in 8 MB pieces (never the whole file in memory) and reports progress.
fn stream_file(src: &Path, dst: &Path, job: &mut Job) -> std::io::Result<()> {
    use std::io::{Read, Write};
    let mut r = fs::File::open(src)?;
    let mut w = fs::OpenOptions::new().write(true).create_new(true).open(dst)?;
    let mut buf = vec![0u8; 8 * 1024 * 1024];
    loop {
        let n = match r.read(&mut buf) {
            Ok(0) => break,
            Ok(n) => n,
            Err(e) if e.kind() == std::io::ErrorKind::Interrupted => continue,
            Err(e) => return Err(e),
        };
        w.write_all(&buf[..n])?;
        job.p.done_bytes += n as u64;
        job.emit(false);
    }
    w.flush()?;
    if let Ok(m) = fs::metadata(src) {
        let _ = fs::set_permissions(dst, m.permissions());
    }
    Ok(())
}

fn copy_file(src: &Path, dst: &Path, job: &mut Job) -> std::io::Result<()> {
    ensure_local(src, job);
    let size = fs::metadata(src).map(|m| m.len()).unwrap_or(0);
    if clone_file(src, dst) {
        job.p.done_bytes += size;
        return Ok(());
    }
    // A placeholder that is still downloading can time out once; try again a few times.
    let before = job.p.done_bytes;
    let mut tries = 0;
    loop {
        match stream_file(src, dst, job) {
            Ok(()) => return Ok(()),
            Err(e) => {
                let _ = fs::remove_file(dst);
                job.p.done_bytes = before;
                tries += 1;
                if e.kind() != std::io::ErrorKind::TimedOut || tries >= 4 {
                    return Err(e);
                }
                std::thread::sleep(std::time::Duration::from_secs(2));
            }
        }
    }
}

fn copy_into(src: &Path, dst: &Path, job: &mut Job) -> std::io::Result<()> {
    let m = fs::symlink_metadata(src)?;
    if m.file_type().is_symlink() {
        return Ok(());
    }
    if m.is_dir() {
        fs::create_dir_all(dst)?;
        for e in fs::read_dir(src)?.flatten() {
            copy_into(&e.path(), &dst.join(e.file_name()), job)?;
        }
        Ok(())
    } else {
        job.p.current = src.file_name().map(|s| s.to_string_lossy().to_string()).unwrap_or_default();
        copy_file(src, dst, job)?;
        job.p.done_items += 1;
        job.emit(false);
        Ok(())
    }
}

fn inbox_run(mut job: Job, inbox: PathBuf, paths: Vec<String>) {
    let _guard = INBOX_LOCK.lock().unwrap_or_else(|e| e.into_inner());
    let srcs: Vec<PathBuf> = paths.iter().map(PathBuf::from).filter(|s| !s.starts_with(&inbox) && s.file_name().is_some()).collect();
    for s in &srcs {
        let (n, b) = tally(s);
        job.p.total_items += n;
        job.p.total_bytes += b;
    }
    job.p.phase = "copy".into();
    job.emit(true);
    for src in srcs {
        let name = src.file_name().unwrap().to_string_lossy().to_string();
        let dst = free_name(&inbox, &name);
        match copy_into(&src, &dst, &mut job) {
            Ok(()) => job.p.added.push(dst.file_name().unwrap().to_string_lossy().to_string()),
            Err(e) => {
                // Never leave a half-copied file or folder behind.
                let _ = if dst.is_dir() { fs::remove_dir_all(&dst) } else { fs::remove_file(&dst) };
                job.p.errors.push(format!("{name}: {e}"));
            }
        }
    }
    job.p.phase = "done".into();
    job.p.current.clear();
    job.emit(true);
}

// Moves Inbox items to the Trash / Recycle Bin (never deletes for good, so a mistake can be put back).
// Only plain names directly inside the Inbox are accepted.
#[allow(unused_variables)] // used on macOS and Windows only
fn to_trash(p: &Path) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        // macOS 15+: /usr/bin/trash uses the Finder's trash, so "Put Back" works (also for iCloud Drive).
        if Path::new("/usr/bin/trash").is_file() {
            let out = Command::new("/usr/bin/trash").arg(p).output().map_err(|e| e.to_string())?;
            return if out.status.success() { Ok(()) } else { Err(String::from_utf8_lossy(&out.stderr).trim().to_string()) };
        }
        let home = std::env::var("HOME").map_err(|e| e.to_string())?;
        let name = p.file_name().map(|s| s.to_string_lossy().to_string()).unwrap_or_default();
        return fs::rename(p, free_name(&Path::new(&home).join(".Trash"), &name)).map_err(|e| e.to_string());
    }
    #[cfg(target_os = "windows")]
    {
        let kind = if p.is_dir() { "DeleteDirectory" } else { "DeleteFile" };
        let ps = format!("Add-Type -AssemblyName Microsoft.VisualBasic; [Microsoft.VisualBasic.FileIO.FileSystem]::{kind}($env:VANTAGE_TRASH, 'OnlyErrorDialogs', 'SendToRecycleBin')");
        let st = Command::new("powershell").args(["-NoProfile", "-Command", &ps]).env("VANTAGE_TRASH", p).status().map_err(|e| e.to_string())?;
        return if st.success() { Ok(()) } else { Err("Could not move to the Recycle Bin.".into()) };
    }
    #[allow(unreachable_code)]
    Err("Moving to the trash is not supported on this system.".into())
}

#[tauri::command]
async fn inbox_trash(root: String, names: Vec<String>) -> Result<usize, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let inbox = PathBuf::from(&root).join(INBOX);
        let mut n = 0;
        let mut errs = vec![];
        for name in names {
            let bad = name.is_empty() || name == "." || name == ".." || name.contains('/') || name.contains('\\');
            let p = inbox.join(&name);
            if bad || fs::symlink_metadata(&p).is_err() {
                errs.push(format!("{name}: not in the Inbox"));
                continue;
            }
            match to_trash(&p) {
                Ok(()) => n += 1,
                Err(e) => errs.push(format!("{name}: {e}")),
            }
        }
        if errs.is_empty() { Ok(n) } else { Err(format!("{n} moved to the Trash. Not moved: {}", errs.join("; "))) }
    })
    .await
    .map_err(|e| e.to_string())?
}

// Copies files/folders (any type, any size) into the user's inbox. Returns at once with a job id;
// the copy runs on its own thread and reports "inbox-progress" events until phase "done".
// Never overwrites (name clash -> "file (2).pdf"), never touches the originals.
#[tauri::command]
fn inbox_add(app: AppHandle, root: String, paths: Vec<String>) -> Result<u64, String> {
    let root = PathBuf::from(root);
    if !root.join("02_workflow").is_dir() {
        return Err("Please select your Vantage folder first.".to_string());
    }
    let inbox = root.join(INBOX);
    fs::create_dir_all(&inbox).map_err(|e| e.to_string())?;
    let id = INBOX_JOB.fetch_add(1, std::sync::atomic::Ordering::Relaxed) + 1;
    let job = Job { app, p: InboxProgress { id, phase: "scan".into(), ..Default::default() }, last: std::time::Instant::now() };
    std::thread::spawn(move || inbox_run(job, inbox, paths));
    Ok(id)
}

fn b64(data: &[u8]) -> String {
    const T: &[u8; 64] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let mut out = String::with_capacity(data.len().div_ceil(3) * 4);
    for c in data.chunks(3) {
        let n = (c[0] as u32) << 16 | (*c.get(1).unwrap_or(&0) as u32) << 8 | *c.get(2).unwrap_or(&0) as u32;
        for i in 0..4 {
            out.push(if i <= c.len() { T[(n >> (18 - 6 * i) & 63) as usize] as char } else { '=' });
        }
    }
    out
}

// Per-user app settings (language, tutorial seen) in --usersettings/app_prefs.json, so they follow the folder.
fn prefs_path(root: &str) -> PathBuf {
    PathBuf::from(root).join("01_user_documents").join("--usersettings").join("app_prefs.json")
}
#[tauri::command]
fn prefs_get(root: String) -> serde_json::Value {
    fs::read_to_string(prefs_path(&root)).ok().and_then(|t| serde_json::from_str(&t).ok()).unwrap_or_else(|| serde_json::json!({}))
}
#[tauri::command]
fn prefs_set(root: String, key: String, value: serde_json::Value) -> Result<(), String> {
    let p = prefs_path(&root);
    if !p.parent().map(|d| d.is_dir()).unwrap_or(false) { return Err("This folder has no --usersettings.".into()); }
    // A damaged file is kept aside (app_prefs.corrupt.json) instead of being silently replaced by an empty one.
    let mut v = match fs::read_to_string(&p) {
        Ok(t) => match serde_json::from_str::<serde_json::Value>(&t) { Ok(x) => x, Err(_) => { let _ = fs::copy(&p, p.with_extension("corrupt.json")); serde_json::json!({}) } },
        Err(_) => serde_json::json!({}),
    };
    if !v.is_object() { v = serde_json::json!({}); }
    v[key] = value;
    write_atomic(&p, &(serde_json::to_string_pretty(&v).map_err(|e| e.to_string())? + "\n"))
}

// The notes and choices that only live in the app (contacts, practice scores, goals ...) are mirrored as readable text, so the agents can see them.
// The app rewrites the whole file; the agents only read it.
#[tauri::command]
fn write_ui_context(root: String, text: String) -> Result<(), String> {
    if text.len() > 200_000 { return Err("The context file is too large.".into()); }
    let dir = PathBuf::from(&root).join("01_user_documents").join("--usersettings");
    if !dir.is_dir() { return Err("This folder has no --usersettings.".into()); }
    write_atomic(&dir.join("ui_context.md"), &text)
}

// Updates. Two providers, tried in order:
//  1. local: a _TEMPLATE folder next to the user's folder (the developer's setup); log = its riwayat_migrasi.md entries
//     newer than the user's .vantage_version.
//  2. github: kit/_TEMPLATE in the GitHub repository set in vantage.json; log = its riwayat_migrasi.md entries.
//     Inert while github_repo is empty. The app itself updates separately (app_update_* below).
const VANTAGE_CFG: &str = include_str!("../../vantage.json");
fn repo() -> String {
    serde_json::from_str::<serde_json::Value>(VANTAGE_CFG).ok()
        .and_then(|v| v["github_repo"].as_str().map(|s| s.trim().to_string()))
        .filter(|r| r.split('/').count() == 2 && !r.contains(' '))
        .unwrap_or_default()
}
// curl ships with macOS and Windows 10+, so no HTTP library is needed for these small reads.
fn curl(url: &str, accept: &str) -> Option<Vec<u8>> {
    let mut cmd = Command::new("curl");
    cmd.args(["-fsSL", "-m", "8", "-H", &format!("Accept: {accept}"), url]);
    #[cfg(windows)]
    { use std::os::windows::process::CommandExt; cmd.creation_flags(0x0800_0000); }
    let out = cmd.output().ok()?;
    if out.status.success() { Some(out.stdout) } else { None }
}
#[derive(Serialize)]
struct UpdateEntry { date: String, title: String }
#[derive(Serialize, Default)]
struct UpdateInfo { source: String, current: String, latest: String, entries: Vec<UpdateEntry>, body: String, url: String }
fn read_trim(p: PathBuf) -> String { fs::read_to_string(p).map(|t| t.trim().to_string()).unwrap_or_default() }
fn local_update(root: &Path, current: &str) -> Option<UpdateInfo> {
    let tpl = root.parent()?.join("_TEMPLATE");
    if !tpl.is_dir() || tpl == root { return None; }
    let log = fs::read_to_string(tpl.join("--settings").join("docs").join("riwayat_migrasi.md")).unwrap_or_default();
    let mut latest = read_trim(tpl.join("01_user_documents").join("--usersettings").join(".vantage_version"));
    let mut entries = vec![];
    for line in log.lines() {
        // "### [2026-10-31] Title"
        let Some(rest) = line.strip_prefix("### [") else { continue };
        let Some((date, title)) = rest.split_once(']') else { continue };
        if date.len() != 10 { continue; }
        if date > latest.as_str() { latest = date.to_string(); }
        if current.is_empty() || date > current { entries.push(UpdateEntry { date: date.into(), title: title.trim().into() }); }
    }
    entries.sort_by(|a, b| b.date.cmp(&a.date));
    Some(UpdateInfo { source: "local".into(), current: current.into(), latest, entries, ..Default::default() })
}
fn parse_log(log: &str, current: &str) -> (String, Vec<UpdateEntry>) {
    let mut latest = String::new();
    let mut entries = vec![];
    for line in log.lines() {
        let Some(rest) = line.strip_prefix("### [") else { continue };
        let Some((date, title)) = rest.split_once(']') else { continue };
        if date.len() != 10 { continue; }
        if date > latest.as_str() { latest = date.to_string(); }
        if current.is_empty() || date > current { entries.push(UpdateEntry { date: date.into(), title: title.trim().into() }); }
    }
    entries.sort_by(|a, b| b.date.cmp(&a.date));
    (latest, entries)
}
// Vantage kit (system files in the user's folder): newer migration entries in the repository's kit/_TEMPLATE.
fn github_update(current: &str) -> Option<UpdateInfo> {
    let r = repo();
    if r.is_empty() { return None; }
    let raw = format!("https://raw.githubusercontent.com/{r}/HEAD/kit/_TEMPLATE/--settings/docs/riwayat_migrasi.md");
    let log = String::from_utf8(curl(&raw, "text/plain")?).ok()?;
    let (latest, entries) = parse_log(&log, current);
    Some(UpdateInfo { source: "github".into(), current: current.into(), latest, entries, url: format!("https://github.com/{r}") , ..Default::default() })
}
#[tauri::command]
async fn update_info(root: String) -> UpdateInfo {
    let root = PathBuf::from(root);
    let current = read_trim(root.join("01_user_documents").join("--usersettings").join(".vantage_version"));
    let cur = current.clone();
    // With a repository set, the published kit is the reference; the local _TEMPLATE is the developer fallback.
    tauri::async_runtime::spawn_blocking(move || github_update(&cur).or_else(|| local_update(&root, &cur)))
        .await.ok().flatten().unwrap_or(UpdateInfo { current, ..Default::default() })
}

// ---------------------------------------------------------------- app updates (GitHub Releases, signed)
// The release workflow builds Mac + Windows and publishes latest.json with a signature made by the private
// updater key (kept by the owner, in GitHub Secrets). The app checks on start, downloads in the background,
// and asks for one restart. macOS: installed right after download (the running app keeps working);
// Windows: installed on "Restart", because the installer closes the app.
static APP_UPDATE: std::sync::Mutex<Option<tauri_plugin_updater::Update>> = std::sync::Mutex::new(None);
static APP_UPDATE_BYTES: std::sync::Mutex<Option<Vec<u8>>> = std::sync::Mutex::new(None);

#[derive(Serialize, Default)]
struct AppUpdate { configured: bool, available: bool, current: String, version: String, notes: String, date: String, error: String }

#[tauri::command]
async fn app_update_check(app: AppHandle) -> AppUpdate {
    use tauri_plugin_updater::UpdaterExt;
    let current = app.package_info().version.to_string();
    let r = repo();
    // Test builds (debug) never offer an update: installing one would replace the build being tested.
    if r.is_empty() || cfg!(debug_assertions) { return AppUpdate { current, ..Default::default() }; }
    let mut out = AppUpdate { configured: true, current, ..Default::default() };
    let url = match tauri::Url::parse(&format!("https://github.com/{r}/releases/latest/download/latest.json")) { Ok(u) => u, Err(e) => { out.error = e.to_string(); return out; } };
    let updater = match app.updater_builder().endpoints(vec![url]).and_then(|b| b.build()) { Ok(u) => u, Err(e) => { out.error = e.to_string(); return out; } };
    match updater.check().await {
        Ok(Some(u)) => {
            out.available = true; out.version = u.version.clone(); out.notes = u.body.clone().unwrap_or_default();
            out.date = u.date.map(|d| d.to_string().chars().take(10).collect()).unwrap_or_default();
            *APP_UPDATE.lock().unwrap() = Some(u);
        }
        Ok(None) => {}
        Err(e) => out.error = e.to_string(),
    }
    out
}

// Downloads the update found by app_update_check ("app-update" events: {done, total}); returns when it is ready.
#[tauri::command]
async fn app_update_prepare(app: AppHandle) -> Result<(), String> {
    use tauri::Emitter;
    let u = APP_UPDATE.lock().unwrap().clone().ok_or("No update found.")?;
    let h = app.clone();
    let mut done: u64 = 0;
    let bytes = u.download(move |n, total| { done += n as u64; let _ = h.emit_to("main", "app-update", serde_json::json!({"done": done, "total": total})); }, || {})
        .await.map_err(|e| e.to_string())?;
    if cfg!(target_os = "windows") {
        *APP_UPDATE_BYTES.lock().unwrap() = Some(bytes);
    } else {
        u.install(bytes).map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
fn app_update_restart(app: AppHandle) -> Result<(), String> {
    if cfg!(target_os = "windows") {
        let u = APP_UPDATE.lock().unwrap().clone().ok_or("No update found.")?;
        let bytes = APP_UPDATE_BYTES.lock().unwrap().take().ok_or("The update is not downloaded yet.")?;
        u.install(bytes).map_err(|e| e.to_string())?;
    }
    app.restart();
}

// Release notes of the latest releases, for the "What's new" log in the app.
#[derive(Serialize)]
struct ReleaseNote { version: String, date: String, title: String, notes: String }
#[tauri::command]
async fn release_notes() -> Vec<ReleaseNote> {
    let r = repo();
    if r.is_empty() { return vec![]; }
    tauri::async_runtime::spawn_blocking(move || {
        let Some(b) = curl(&format!("https://api.github.com/repos/{r}/releases?per_page=10"), "application/vnd.github+json") else { return vec![] };
        let v: serde_json::Value = serde_json::from_slice(&b).unwrap_or_default();
        v.as_array().map(|a| a.iter().filter(|x| !x["draft"].as_bool().unwrap_or(false)).map(|x| ReleaseNote {
            version: x["tag_name"].as_str().unwrap_or("").trim_start_matches('v').into(),
            date: x["published_at"].as_str().unwrap_or("").chars().take(10).collect(),
            title: x["name"].as_str().unwrap_or("").into(),
            notes: x["body"].as_str().unwrap_or("").into(),
        }).collect()).unwrap_or_default()
    }).await.unwrap_or_default()
}

// First launch: personal Vantage folders in the Vantage data folder (folders next to _TEMPLATE that contain
// 02_workflow), newest first, plus whether the Vantage package itself exists yet.
#[derive(Serialize, Default)]
struct FoundUsers { package: String, users: Vec<String> }
#[tauri::command]
fn find_users() -> FoundUsers {
    let home = std::env::var("HOME").or_else(|_| std::env::var("USERPROFILE")).unwrap_or_default();
    if home.is_empty() { return FoundUsers::default(); }
    // macOS: ~/Documents/Vantage. Windows: %USERPROFILE%\Vantage (short path, outside OneDrive), older installs
    // may use Documents\Vantage. The first one that holds _TEMPLATE wins.
    let Some(pkg) = [PathBuf::from(&home).join("Vantage"), PathBuf::from(&home).join("Documents").join("Vantage")]
        .into_iter().filter(|p| cfg!(windows) || p.ends_with("Documents/Vantage")).find(|p| p.join("_TEMPLATE").is_dir()) else { return FoundUsers::default() };
    let mut users: Vec<(u64, String)> = fs::read_dir(&pkg).map(|rd| rd.flatten()
        .map(|e| e.path())
        .filter(|p| p.is_dir() && p.file_name().map(|n| n != "_TEMPLATE" && !n.to_string_lossy().starts_with('.')).unwrap_or(false) && p.join("02_workflow").is_dir())
        .map(|p| (mtime(&p), p.to_string_lossy().to_string())).collect()).unwrap_or_default();
    users.sort_by_key(|u| std::cmp::Reverse(u.0));
    FoundUsers { package: pkg.to_string_lossy().to_string(), users: users.into_iter().map(|x| x.1).collect() }
}

// The user's photo as a data URL (materials/00_Photo.*, else any photo/foto image in the user folder), or "".
#[tauri::command]
fn user_photo(root: String) -> String {
    let root = PathBuf::from(root);
    let is_img = |p: &Path| {
        let n = p.file_name().map(|s| s.to_string_lossy().to_lowercase()).unwrap_or_default();
        (n.contains("photo") || n.contains("foto")) && [".jpg", ".jpeg", ".png"].iter().any(|x| n.ends_with(x))
    };
    let dirs = [root.join("01_user_documents").join("materials"), root.join("01_user_documents"), root.clone()];
    let found = dirs.iter().find_map(|d| {
        let mut v: Vec<PathBuf> = fs::read_dir(d).ok()?.flatten().map(|e| e.path()).filter(|p| p.is_file() && is_img(p)).collect();
        v.sort();
        v.into_iter().next()
    });
    let Some(p) = found else { return String::new() };
    match fs::read(&p) {
        Ok(bytes) if bytes.len() < 8 * 1024 * 1024 => {
            let mime = if p.extension().map(|e| e.eq_ignore_ascii_case("png")).unwrap_or(false) { "image/png" } else { "image/jpeg" };
            format!("data:{mime};base64,{}", b64(&bytes))
        }
        _ => String::new(),
    }
}

// ---------------------------------------------------------------- application files + preview

#[derive(Serialize)]
struct FileItem {
    path: String, // relative to the application folder
    section: String,
    kb: u64,
    modified: u64,
}

fn mtime(p: &Path) -> u64 {
    fs::metadata(p)
        .and_then(|m| m.modified())
        .ok()
        .and_then(|t| t.duration_since(SystemTime::UNIX_EPOCH).ok())
        .map(|d| d.as_secs())
        .unwrap_or(0)
}

// A path inside the user's 02_workflow (or the user folder), refusing anything that escapes it.
fn inside(root: &Path, rel: &str) -> Result<PathBuf, String> {
    let base = fs::canonicalize(root).map_err(|_| "Folder not found.".to_string())?;
    let p = fs::canonicalize(root.join(rel)).map_err(|_| "File not found.".to_string())?;
    if p.starts_with(&base) { Ok(p) } else { Err("File not found.".into()) }
}

// Documents in one application folder (up to three levels deep), grouped by their top folder.
#[tauri::command]
fn app_files(root: String, folder: String) -> Result<Vec<FileItem>, String> {
    list_files(&inside(&PathBuf::from(&root).join("02_workflow"), &folder)?)
}

// Skill gaps from --usersettings/JD_Insights.md: the first table whose header starts with "Skill".
// Columns: skill | count | mentioned in | discussed with user? | recommendation. Read only.
#[derive(Serialize, Default)]
struct SkillGap {
    skill: String,
    count: u32,
    mentioned: Vec<String>,
    discussed: String,
    advice: String,
}

#[tauri::command]
fn skill_gaps(root: String) -> Vec<SkillGap> {
    let p = PathBuf::from(&root).join("01_user_documents").join("--usersettings").join("JD_Insights.md");
    let Ok(text) = fs::read_to_string(p) else { return vec![] };
    let clean = |c: &str| c.replace("**", "").trim().to_string();
    let mut out = vec![];
    let mut in_table = false;
    for line in text.lines() {
        let l = line.trim();
        if !l.starts_with('|') {
            if in_table {
                break;
            }
            continue;
        }
        let cells: Vec<String> = l.trim_matches('|').split('|').map(clean).collect();
        if !in_table {
            in_table = cells.first().map(|c| c.to_lowercase().starts_with("skill")).unwrap_or(false);
            continue;
        }
        if cells.iter().all(|c| c.chars().all(|ch| ch == '-' || ch == ':' || ch == ' ')) || cells.len() < 2 || cells[0].is_empty() {
            continue;
        }
        let count = cells[1].chars().filter(|c| c.is_ascii_digit()).collect::<String>().parse().unwrap_or(0);
        let mentioned = cells.get(2).map(|c| c.split(';').map(|x| x.trim().to_string()).filter(|x| !x.is_empty() && !x.starts_with('(')).collect()).unwrap_or_default();
        let get = |i: usize| cells.get(i).cloned().unwrap_or_default();
        out.push(SkillGap { skill: cells[0].clone(), count, mentioned, discussed: get(3), advice: get(4) });
    }
    out.sort_by_key(|a| std::cmp::Reverse(a.count));
    out
}

// Morning Report search settings: --usersettings/search_settings.json, read by Sinta before every search
// (scheduled or "Run now"). The app edits only this file; unknown keys (notes, future fields) are kept.
fn search_settings_path(root: &str) -> PathBuf {
    PathBuf::from(root).join("01_user_documents").join("--usersettings").join("search_settings.json")
}

#[tauri::command]
fn search_settings_get(root: String) -> serde_json::Value {
    fs::read_to_string(search_settings_path(&root)).ok().and_then(|t| serde_json::from_str(&t).ok()).unwrap_or(serde_json::Value::Null)
}

#[tauri::command]
fn search_settings_set(root: String, settings: serde_json::Value) -> Result<(), String> {
    if !PathBuf::from(&root).join("02_workflow").is_dir() {
        return Err("Please select your Vantage folder first.".into());
    }
    let obj = settings.as_object().ok_or("Settings must be an object.")?;
    for k in ["kata_kunci", "lokasi", "jenis_kontrak", "bahasa_lamaran", "kecualikan_perusahaan"] {
        if let Some(v) = obj.get(k) {
            if !v.as_array().map(|a| a.iter().all(|x| x.is_string())).unwrap_or(false) {
                return Err(format!("{k} must be a list of texts."));
            }
        }
    }
    if let Some(v) = obj.get("maks_rekomendasi") {
        if !v.as_u64().map(|n| (1..=50).contains(&n)).unwrap_or(false) {
            return Err("Max recommendations must be 1 to 50.".into());
        }
    }
    if let Some(v) = obj.get("ambang_skor") {
        if !v.as_u64().map(|n| (60..=95).contains(&n)).unwrap_or(false) {
            return Err("Match threshold must be 60 to 95.".into());
        }
    }
    let p = search_settings_path(&root);
    let text = serde_json::to_string_pretty(&settings).map_err(|e| e.to_string())? + "\n";
    // Write next to it, then rename: a crash never leaves half a file for Sinta to read.
    let tmp = p.with_extension("json.tmp");
    fs::write(&tmp, text).map_err(|e| e.to_string())?;
    fs::rename(&tmp, &p).map_err(|e| e.to_string())
}

// ---------------------------------------------------------------- setting up a Vantage folder from the bundled kit
// The kit (root CLAUDE.md, .claude/agents, _TEMPLATE, vantage.json) is embedded at build time (build.rs), so a new or
// empty folder can be set up without a download. Existing files are never overwritten.
// Maintainer files that stay in the kit and are not copied into a user's folder.
const NOT_FOR_USERS: &[&str] = &["--settings/docs", "--settings/scripts/generate_update.py"];
static KIT: &[u8] = include_bytes!(concat!(env!("OUT_DIR"), "/kit.bin"));

fn kit_files() -> Vec<(&'static str, &'static [u8])> {
    let mut out = vec![];
    let mut i = 0usize;
    while i + 4 <= KIT.len() {
        let pl = u32::from_le_bytes(KIT[i..i + 4].try_into().unwrap()) as usize;
        i += 4;
        let path = std::str::from_utf8(&KIT[i..i + pl]).unwrap_or("");
        i += pl;
        let dl = u64::from_le_bytes(KIT[i..i + 8].try_into().unwrap()) as usize;
        i += 8;
        out.push((path, &KIT[i..i + dl]));
        i += dl;
    }
    out
}

// Writes the kit files under `prefix` (e.g. "_TEMPLATE/") into `dst`, renamed to drop the prefix; skips files that exist.
fn extract_kit(dst: &Path, prefix: &str, skip: &[&str]) -> std::io::Result<usize> {
    let mut n = 0;
    for (path, data) in kit_files() {
        let Some(rel) = path.strip_prefix(prefix) else { continue };
        if rel.is_empty() || rel.split('/').any(|c| c == ".." || c.is_empty()) || skip.iter().any(|s| rel == *s || rel.starts_with(&format!("{s}/"))) {
            continue;
        }
        let target = dst.join(rel);
        if target.exists() {
            continue;
        }
        if let Some(parent) = target.parent() {
            fs::create_dir_all(parent)?;
        }
        fs::write(&target, data)?;
        n += 1;
    }
    Ok(n)
}

// Claude Code looks for the specialist agents (Raka, Laras, ...) in <work folder>/.claude/agents. A folder that was set up
// by hand or from an older kit may not have them ("--agent 'raka' not found"), so the bundled ones are copied in before a
// chat runs. Existing files are never overwritten.
// The agents are system files (personal rules belong in the user's CLAUDE.md), so a bundled agent that differs from the copy in the work
// folder replaces it, and the old copy is kept in .claude/agents_replaced/. Without this an updated app kept running the agents of the
// version it was first set up with. Not when the user's folder carries a NEWER kit version than this app (the kit update brought newer agents).
pub(crate) fn ensure_agents(work: &Path, root: &Path) {
    let _ = extract_kit(&work.join(".claude"), ".claude/", &[]);
    let ver = |b: &[u8]| String::from_utf8_lossy(b).trim().to_string();
    let bundled = kit_files().into_iter().find(|(p, _)| *p == "_TEMPLATE/01_user_documents/--usersettings/.vantage_version").map(|(_, d)| ver(d)).unwrap_or_default();
    let local = fs::read(root.join("01_user_documents").join("--usersettings").join(".vantage_version")).map(|d| ver(d.as_slice())).unwrap_or_default();
    if !bundled.is_empty() && !local.is_empty() && local > bundled { return; }
    let secs = SystemTime::now().duration_since(SystemTime::UNIX_EPOCH).map(|d| d.as_secs()).unwrap_or(0);
    for (path, data) in kit_files() {
        let Some(rel) = path.strip_prefix(".claude/agents/") else { continue };
        if rel.is_empty() || rel.contains('/') || rel.contains("..") || !rel.ends_with(".md") { continue; }
        let target = work.join(".claude").join("agents").join(rel);
        if let Ok(cur) = fs::read(&target) {
            if cur != data {
                let bak = work.join(".claude").join("agents_replaced");
                let _ = fs::create_dir_all(&bak);
                let _ = fs::write(bak.join(format!("{rel}.{secs}.bak")), &cur);
                let _ = fs::write(&target, data);
            }
        }
    }
}

// Folder name like Nova's first run (sop first_run.md): "<last>_<first+middle>", lower-case ASCII, umlauts spelled out,
// at most 20 characters.
fn user_slug(full: &str) -> String {
    let ascii = |w: &str| -> String {
        w.to_lowercase().replace('ä', "ae").replace('ö', "oe").replace('ü', "ue").replace('ß', "ss")
            .chars().filter(|c| c.is_ascii_alphanumeric()).collect()
    };
    let words: Vec<String> = full.split_whitespace().map(ascii).filter(|w| !w.is_empty()).collect();
    if words.is_empty() {
        return "user".into();
    }
    if words.len() == 1 {
        return words[0].chars().take(20).collect();
    }
    let last = words.last().unwrap().clone();
    let slug = format!("{last}_{}", words[..words.len() - 1].concat());
    if slug.len() <= 20 {
        return slug;
    }
    // Too long: first names become initials; still too long: the last name is shortened.
    let initials: String = words[..words.len() - 1].iter().filter_map(|w| w.chars().next()).collect();
    let keep = 20usize.saturating_sub(initials.len() + 1).max(1);
    format!("{}_{initials}", &last[..keep.min(last.len())])
}

#[derive(Serialize, Default)]
struct FolderInfo { kind: String, users: Vec<String>, path: String }

// What a chosen folder is: "user" (has 02_workflow), "package" (has _TEMPLATE; users = personal folders in it),
// "empty", "other" (has files but is not Vantage), or "missing".
#[tauri::command]
fn inspect_folder(dir: String) -> FolderInfo {
    let p = PathBuf::from(&dir);
    let path = dir.clone();
    if !p.is_dir() { return FolderInfo { kind: "missing".into(), path, ..Default::default() }; }
    if p.join("02_workflow").is_dir() || p.join("01_user_documents").is_dir() { return FolderInfo { kind: "user".into(), path, ..Default::default() }; }
    if p.join("_TEMPLATE").is_dir() {
        let users = fs::read_dir(&p).map(|rd| rd.flatten().map(|e| e.path())
            .filter(|q| q.is_dir() && q.join("02_workflow").is_dir() && q.file_name().map(|n| n != "_TEMPLATE").unwrap_or(false))
            .map(|q| q.to_string_lossy().to_string()).collect()).unwrap_or_default();
        return FolderInfo { kind: "package".into(), users, path };
    }
    let has_files = fs::read_dir(&p).map(|rd| rd.flatten().any(|e| { let n = e.file_name().to_string_lossy().to_string(); !n.starts_with('.') && n != "desktop.ini" })).unwrap_or(false);
    FolderInfo { kind: if has_files { "other".into() } else { "empty".into() }, path, ..Default::default() }
}

// Where a new Vantage folder goes by default: macOS ~/Documents/Vantage, Windows %USERPROFILE%\Vantage (outside OneDrive).
#[tauri::command]
fn default_vantage_dir() -> String {
    let home = std::env::var("HOME").or_else(|_| std::env::var("USERPROFILE")).unwrap_or_default();
    let p = if cfg!(windows) { PathBuf::from(&home).join("Vantage") } else { PathBuf::from(&home).join("Documents").join("Vantage") };
    p.to_string_lossy().to_string()
}

// Sets up `dir` and returns the personal folder to open:
//  - a personal folder (02_workflow or 01_user_documents): adds whatever system part is missing (e.g. --usersettings);
//  - a Vantage package or an empty/new folder: adds the package files (CLAUDE.md, .claude, _TEMPLATE, vantage.json),
//    then creates the personal folder "<last>_<first>" from the template, with the name in identity.json.
// Never overwrites or deletes anything.
#[tauri::command]
async fn vantage_setup(dir: String, full_name: String) -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let p = PathBuf::from(&dir);
        if p.join("02_workflow").is_dir() || p.join("01_user_documents").is_dir() {
            extract_kit(&p, "_TEMPLATE/", NOT_FOR_USERS).map_err(|e| e.to_string())?;
            return Ok(dir);
        }
        let name = full_name.trim().to_string();
        if name.is_empty() {
            return Err("Please enter your full name.".into());
        }
        fs::create_dir_all(&p).map_err(|e| e.to_string())?;
        extract_kit(&p, "", &[]).map_err(|e| e.to_string())?;
        let slug = user_slug(&name);
        let mut dst = p.join(&slug);
        let mut n = 2;
        while dst.exists() && !dst.join("02_workflow").is_dir() {
            dst = p.join(format!("{slug}{n}"));
            n += 1;
        }
        if dst.join("02_workflow").is_dir() {
            return Ok(dst.to_string_lossy().to_string());  // this person already has a folder here
        }
        fs::create_dir_all(&dst).map_err(|e| e.to_string())?;
        extract_kit(&dst, "_TEMPLATE/", NOT_FOR_USERS).map_err(|e| e.to_string())?;
        let id = dst.join("01_user_documents").join("--usersettings").join("identity.json");
        write_identity_name(&id, &name);
        Ok(dst.to_string_lossy().to_string())
    })
    .await
    .map_err(|e| e.to_string())?
}

// Files of any folder inside the user folder (e.g. one material). `rel` is relative to the user folder.
#[tauri::command]
fn dir_files(root: String, rel: String) -> Result<Vec<FileItem>, String> {
    let p = inside(Path::new(&root), &rel)?;
    if p.is_file() {
        let n = p.file_name().map(|s| s.to_string_lossy().to_string()).unwrap_or_default();
        return Ok(vec![FileItem { path: n, section: String::new(), kb: fs::metadata(&p).map(|m| m.len() / 1024).unwrap_or(0), modified: mtime(&p) }]);
    }
    list_files(&p)
}

// Opens a folder or file inside the user folder in Finder / File Explorer (files are revealed, not opened).
#[tauri::command]
fn reveal_path(root: String, rel: String) -> Result<(), String> {
    let p = inside(Path::new(&root), &rel)?;
    if p.is_dir() {
        return launch(&p.to_string_lossy());
    }
    let r = if cfg!(target_os = "macos") {
        Command::new("open").arg("-R").arg(&p).spawn()
    } else if cfg!(target_os = "windows") {
        Command::new("explorer").arg(format!("/select,{}", p.to_string_lossy())).spawn()
    } else {
        Command::new("xdg-open").arg(p.parent().unwrap_or(&p)).spawn()
    };
    r.map(|_| ()).map_err(|e| e.to_string())
}

fn list_files(dir: &Path) -> Result<Vec<FileItem>, String> {
    let dir = dir.to_path_buf();
    let mut out = Vec::new();
    fn walk(base: &Path, d: &Path, depth: u32, out: &mut Vec<FileItem>) {
        let Ok(rd) = fs::read_dir(d) else { return };
        for e in rd.flatten() {
            let n = e.file_name().to_string_lossy().to_string();
            if n.starts_with('.') || n.starts_with('~') {
                continue;
            }
            let p = e.path();
            if p.is_dir() {
                if depth < 3 {
                    walk(base, &p, depth + 1, out);
                }
            } else {
                let rel = p.strip_prefix(base).map(|r| r.to_string_lossy().replace('\\', "/")).unwrap_or(n);
                let section = if rel.contains('/') { rel.split('/').next().unwrap_or("").to_string() } else { String::new() };
                out.push(FileItem { path: rel, section, kb: fs::metadata(&p).map(|m| m.len() / 1024).unwrap_or(0), modified: mtime(&p) });
            }
        }
    }
    walk(&dir, &dir, 0, &mut out);
    out.sort_by(|a, b| a.path.cmp(&b.path));
    Ok(out)
}

// A file for the in-app viewer: PDFs and images as base64, text files as text. `rel` is relative to the user folder.
#[derive(Serialize)]
struct Preview {
    kind: String, // pdf | image | text | other
    mime: String,
    data: String,
}

#[tauri::command]
async fn preview_file(root: String, rel: String) -> Result<Preview, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let p = inside(Path::new(&root), &rel)?;
        let ext = p.extension().map(|e| e.to_string_lossy().to_lowercase()).unwrap_or_default();
        let (kind, mime) = match ext.as_str() {
            "pdf" => ("pdf", "application/pdf"),
            "png" => ("image", "image/png"),
            "jpg" | "jpeg" => ("image", "image/jpeg"),
            "gif" => ("image", "image/gif"),
            "webp" => ("image", "image/webp"),
            "md" | "txt" | "json" | "csv" | "log" => ("text", "text/plain"),
            _ => ("other", ""),
        };
        let size = fs::metadata(&p).map(|m| m.len()).unwrap_or(0);
        if kind == "other" || size > 25 * 1024 * 1024 {
            return Ok(Preview { kind: "other".into(), mime: String::new(), data: String::new() });
        }
        let bytes = fs::read(&p).map_err(|e| e.to_string())?;
        let data = if kind == "text" { String::from_utf8_lossy(&bytes).chars().take(200_000).collect() } else { b64(&bytes) };
        Ok(Preview { kind: kind.into(), mime: mime.into(), data })
    })
    .await
    .map_err(|e| e.to_string())?
}

// Opens a file with its default application. `rel` is relative to the user folder.
#[tauri::command]
fn open_file(root: String, rel: String) -> Result<(), String> {
    let p = inside(Path::new(&root), &rel)?;
    // Documents only: a program, script or shortcut that came in with an imported folder must never start from a click here.
    let ext = p.extension().map(|e| e.to_string_lossy().to_lowercase()).unwrap_or_default();
    const OK: &[&str] = &["pdf", "docx", "doc", "xlsx", "xls", "pptx", "odt", "ods", "png", "jpg", "jpeg", "gif", "webp", "md", "txt", "csv", "json", "html", "htm", "zip"];
    if !OK.contains(&ext.as_str()) { return Err("Vantage only opens documents, images and text files from here. Open this file from your file manager.".into()); }
    launch(&p.to_string_lossy())
}

// ---------------------------------------------------------------- Master CV

#[derive(Serialize, Default)]
struct MasterCv {
    files: Vec<FileItem>, // relative to the user folder
    raw_facts_modified: u64,
    cv_modified: u64,
}

#[tauri::command]
fn master_cv(root: String) -> MasterCv {
    let root = PathBuf::from(root);
    let dir = root.join("01_user_documents").join("Master_CV");
    let mut mc = MasterCv { raw_facts_modified: mtime(&root.join("01_user_documents").join("raw_facts_about_you.md")), ..Default::default() };
    if let Ok(rd) = fs::read_dir(&dir) {
        for e in rd.flatten() {
            let n = e.file_name().to_string_lossy().to_string();
            let lower = n.to_lowercase();
            if n.starts_with('.') || !(lower.ends_with(".pdf") || lower.ends_with(".docx")) {
                continue;
            }
            let m = mtime(&e.path());
            mc.cv_modified = mc.cv_modified.max(m);
            mc.files.push(FileItem {
                path: format!("01_user_documents/Master_CV/{n}"),
                section: if lower.ends_with(".pdf") { "pdf".into() } else { "docx".into() },
                kb: e.metadata().map(|m| m.len() / 1024).unwrap_or(0),
                modified: m,
            });
        }
    }
    mc.files.sort_by(|a, b| a.path.cmp(&b.path));
    mc
}

// ---------------------------------------------------------------- new user

// Creates a new user folder next to the current one by copying the Vantage _TEMPLATE, then fills in the name.
#[tauri::command]
async fn create_user(current: String, full_name: String) -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let name = full_name.trim().to_string();
        if name.is_empty() {
            return Err("Please enter a name.".to_string());
        }
        let parent = Path::new(&current).parent().ok_or("Vantage folder not found.")?.to_path_buf();
        let template = parent.join("_TEMPLATE");
        if !template.join("02_workflow").is_dir() {
            return Err("The Vantage template (_TEMPLATE) was not found next to your folder.".to_string());
        }
        // Folder name: first name in lower case, letters and digits only (like "budi").
        let first = name.split_whitespace().next().unwrap_or("user");
        let mut slug: String = first.to_lowercase().chars().filter(|c| c.is_alphanumeric()).collect();
        if slug.is_empty() {
            slug = "user".into();
        }
        let mut dst = parent.join(&slug);
        let mut n = 2;
        while dst.exists() {
            dst = parent.join(format!("{slug}{n}"));
            n += 1;
        }
        fn copy_tree(src: &Path, dst: &Path) -> std::io::Result<()> {
            fs::create_dir_all(dst)?;
            for e in fs::read_dir(src)?.flatten() {
                let n = e.file_name();
                if n.to_string_lossy() == ".DS_Store" {
                    continue;
                }
                let p = e.path();
                if p.is_dir() { copy_tree(&p, &dst.join(&n))? } else { fs::copy(&p, dst.join(&n)).map(|_| ())? }
            }
            Ok(())
        }
        copy_tree(&template, &dst).map_err(|e| e.to_string())?;
        // Fill name and surname in identity.json; everything else stays as in the template.
        let id = dst.join("01_user_documents").join("--usersettings").join("identity.json");
        write_identity_name(&id, &name);
        Ok(dst.to_string_lossy().to_string())
    })
    .await
    .map_err(|e| e.to_string())?
}

// ---------------------------------------------------------------- moving an application (pipeline drag & drop)
//
// Follows sop/lamaran.md: applications.json is the source of truth, the tracker xlsx is rebuilt from it by
// build_tracker.py. Active statuses (Draft, Screening, Interview, Assessment) live flat in 01_Pipeline/;
// Applied and closed ones (and finished offers) in 02_Sent/<type>/<year>/<month>/ with the "00_currentMonth_NN"
// marker on the current month.

fn in_pipeline(status: &str) -> bool {
    matches!(status, "Draft" | "Screening" | "Interview R1" | "Interview R2" | "Assessment")
}

fn today() -> (i64, u32, u32) {
    let days = SystemTime::now().duration_since(SystemTime::UNIX_EPOCH).map(|d| d.as_secs() as i64 / 86400).unwrap_or(0);
    // Civil date from days since 1970-01-01 (Howard Hinnant's algorithm).
    let z = days + 719468;
    let era = z.div_euclid(146097);
    let doe = z - era * 146097;
    let yoe = (doe - doe / 1460 + doe / 36524 - doe / 146096) / 365;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let d = (doy - (153 * mp + 2) / 5 + 1) as u32;
    let m = if mp < 10 { mp + 3 } else { mp - 9 } as u32;
    (yoe + era * 400 + if m <= 2 { 1 } else { 0 }, m, d)
}

// 02_Sent/<type>/<year>/: make sure only the current month carries the 00_ marker, return its folder.
fn sent_month_dir(wf: &Path, kind: &str) -> Result<PathBuf, String> {
    let (y, m, _) = today();
    let year = wf.join("02_Sent").join(if kind.is_empty() { "Other" } else { kind }).join(y.to_string());
    fs::create_dir_all(&year).map_err(|e| e.to_string())?;
    let cur = format!("00_currentMonth_{m:02}");
    for e in fs::read_dir(&year).map_err(|e| e.to_string())?.flatten() {
        let n = e.file_name().to_string_lossy().to_string();
        if let Some(mm) = n.strip_prefix("00_currentMonth_") {
            if n != cur && !year.join(format!("Month_{mm}")).exists() {
                fs::rename(e.path(), year.join(format!("Month_{mm}"))).map_err(|e| e.to_string())?;
            }
        }
    }
    let plain = year.join(format!("Month_{m:02}"));
    let target = year.join(&cur);
    if !target.exists() {
        if plain.exists() {
            fs::rename(&plain, &target).map_err(|e| e.to_string())?;
        } else {
            fs::create_dir_all(&target).map_err(|e| e.to_string())?;
        }
    }
    Ok(target)
}

#[derive(Serialize)]
struct MoveResult {
    old_status: String,
    old_folder: String,
    old_status_date: String,
    old_next: String,
    old_due: String,
    new_folder: String,
    tracker: String, // "ok" or the reason the xlsx could not be rebuilt
}

fn apps_json(root: &Path) -> PathBuf {
    root.join("01_user_documents").join("--usersettings").join("applications.json")
}

// ---- Safe writes. The files the app and the Claude agents both edit (applications.json, app_prefs.json) are written in one step
// (temp file, then rename), so a crash or a power cut never leaves half a file; and applications.json is only replaced if nobody
// else changed it since the app read it, so a move in the app and an edit by Nova can never silently wipe each other out.
fn write_atomic(p: &Path, text: &str) -> Result<(), String> {
    let tmp = p.with_extension("vtmp");
    fs::write(&tmp, text).map_err(|e| format!("Could not save {}: {e}", p.file_name().map(|n| n.to_string_lossy().to_string()).unwrap_or_default()))?;
    fs::rename(&tmp, p).map_err(|e| { let _ = fs::remove_file(&tmp); format!("Could not save {}: {e}", p.file_name().map(|n| n.to_string_lossy().to_string()).unwrap_or_default()) })
}
fn mtime_of(p: &Path) -> Option<SystemTime> { fs::metadata(p).and_then(|m| m.modified()).ok() }
fn save_apps(jp: &Path, v: &serde_json::Value, seen: Option<SystemTime>) -> Result<(), String> {
    if mtime_of(jp) != seen {
        return Err("applications.json was changed by another program while you were saving (Nova may be editing it). Nothing was overwritten: wait a moment and try again.".into());
    }
    write_atomic(jp, &(serde_json::to_string_pretty(v).map_err(|e| e.to_string())? + "\n"))
}
// One line per change made in the app, so Nova, Raka and Laras can see what happened outside the chat (read at the start of a conversation).
fn log_change(root: &Path, line: &str) {
    let p = root.join("01_user_documents").join("--usersettings").join("app_changes.log");
    let (y, m, d) = today();
    let mut lines: Vec<String> = fs::read_to_string(&p).ok().map(|t| t.lines().map(String::from).collect()).unwrap_or_default();
    lines.push(format!("[{y}-{m:02}-{d:02}] {line}"));
    let n = lines.len();
    if n > 200 { lines.drain(0..n - 200); }
    let _ = write_atomic(&p, &(lines.join("\n") + "\n"));
}
fn days_from_civil(y: i64, m: u32, d: u32) -> i64 {
    let y = if m <= 2 { y - 1 } else { y };
    let era = y.div_euclid(400);
    let yoe = y - era * 400;
    let doy = (153 * (if m > 2 { m - 3 } else { m + 9 }) as i64 + 2) / 5 + d as i64 - 1;
    era * 146097 + yoe * 365 + yoe / 4 - yoe / 100 + doy - 719468
}
fn civil_from_days(days: i64) -> (i64, u32, u32) {
    let z = days + 719468;
    let era = z.div_euclid(146097);
    let doe = z - era * 146097;
    let yoe = (doe - doe / 1460 + doe / 36524 - doe / 146096) / 365;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let d = (doy - (153 * mp + 2) / 5 + 1) as u32;
    let m = if mp < 10 { mp + 3 } else { mp - 9 } as u32;
    (yoe + era * 400 + if m <= 2 { 1 } else { 0 }, m, d)
}
fn plus_days(y: i64, m: u32, d: u32, n: i64) -> (i64, u32, u32) { civil_from_days(days_from_civil(y, m, d) + n) }

// A Python that can run the tracker script (needs openpyxl). Apps started from Finder get a minimal PATH,
// so the usual install locations are tried explicitly. Err = message for the user.
fn find_python() -> Result<String, String> {
    let mut cands: Vec<String> = Vec::new();
    if cfg!(windows) {
        cands.extend(["py", "python", "python3"].map(String::from));
    } else {
        cands.extend(
            [
                "/Library/Frameworks/Python.framework/Versions/Current/bin/python3",
                "/opt/homebrew/bin/python3",
                "/usr/local/bin/python3",
                "python3",
                "/usr/bin/python3",
                "python",
            ]
            .map(String::from),
        );
        if let Ok(rd) = fs::read_dir("/Library/Frameworks/Python.framework/Versions") {
            let mut v: Vec<String> = rd.flatten().map(|e| e.path().join("bin").join("python3").to_string_lossy().to_string()).collect();
            v.sort();
            v.reverse();
            cands.splice(1..1, v);
        }
    }
    let mut any = false;
    for c in cands {
        let mut cmd = Command::new(&c);
        cmd.args(["-c", "import openpyxl"]);
        match quiet(&mut cmd).output() {
            Ok(o) if o.status.success() => return Ok(c),
            Ok(_) => any = true,
            Err(_) => {}
        }
    }
    Err(if any {
        "Python is installed but the openpyxl package is missing (run: pip3 install openpyxl)".into()
    } else {
        "Python was not found on this computer".into()
    })
}

// Rebuild Application_Tracker.xlsx from applications.json with the user's own script. "ok" or a reason.
fn rebuild_tracker(root: &Path) -> String {
    let script = root.join("02_workflow").join("03_Tracker").join("build_tracker.py");
    if !script.is_file() {
        return "build_tracker.py was not found".into();
    }
    let py = match find_python() {
        Ok(p) => p,
        Err(e) => return e,
    };
    let json = apps_json(root);
    let out = root.join("02_workflow").join("03_Tracker").join("Application_Tracker.xlsx");
    let mut c = Command::new(py);
    c.arg(&script).arg("--json").arg(&json).arg("--out").arg(&out).current_dir(root);
    match quiet(&mut c).output() {
        Ok(o) if o.status.success() => "ok".into(),
        Ok(o) => {
            let err = String::from_utf8_lossy(&o.stderr);
            let line = err.lines().rev().find(|l| !l.trim().is_empty()).unwrap_or("build_tracker.py failed");
            format!("build_tracker.py: {}", line.trim())
        }
        Err(e) => e.to_string(),
    }
}

fn move_app_sync(root: &Path, id: &str, status: &str, force_folder: Option<&str>, force_date: Option<&str>, force_next: Option<(String, String)>) -> Result<MoveResult, String> {
    let wf = root.join("02_workflow");
    let jp = apps_json(root);
    let seen = mtime_of(&jp);
    let text = fs::read_to_string(&jp).map_err(|_| "applications.json not found.".to_string())?;
    let mut v: serde_json::Value = serde_json::from_str(&text).map_err(|e| format!("applications.json: {e}"))?;
    let vocab: Vec<String> = v["status_vocab"].as_array().map(|a| a.iter().filter_map(|x| x.as_str().map(String::from)).collect()).unwrap_or_default();
    if !vocab.is_empty() && !vocab.iter().any(|x| x == status) {
        return Err(format!("\"{status}\" is not a tracker status."));
    }
    let apps = v["applications"].as_array_mut().ok_or("applications.json has no applications.")?;
    let a = apps.iter_mut().find(|a| a["id"].as_str().map(|x| x == id).unwrap_or(false)).ok_or("Application not found in applications.json.")?;
    let old_status = a["status"].as_str().unwrap_or("").to_string();
    let old_folder = a["folder"].as_str().unwrap_or("").to_string();
    let old_status_date = a["tanggal_status"].as_str().unwrap_or("").to_string();
    let kind = a["tipe"].as_str().unwrap_or("").to_string();
    let old_next = a["next_action"].as_str().unwrap_or("").to_string();
    let old_due = a["next_action_due"].as_str().unwrap_or("").to_string();
    let who = a["perusahaan"].as_str().unwrap_or("").to_string();

    // Where the folder goes.
    let mut new_folder = old_folder.clone();
    let src = wf.join(&old_folder);
    if !old_folder.is_empty() && src.is_dir() {
        let name = src.file_name().map(|s| s.to_string_lossy().to_string()).unwrap_or_default();
        let dst = match force_folder {
            Some(f) => wf.join(f),
            None if in_pipeline(status) => wf.join("01_Pipeline").join(&name),
            None => sent_month_dir(&wf, &kind)?.join(&name),
        };
        if dst != src {
            if dst.exists() {
                return Err(format!("A folder named {name} already exists there. Nothing was moved."));
            }
            if let Some(p) = dst.parent() {
                fs::create_dir_all(p).map_err(|e| e.to_string())?;
            }
            fs::rename(&src, &dst).map_err(|e| format!("Could not move the folder (is it open in another app?): {e}"))?;
            new_folder = dst.strip_prefix(&wf).map(|r| r.to_string_lossy().replace('\\', "/")).unwrap_or(old_folder.clone());
        }
    }
    let (y, m, d) = today();
    a["status"] = serde_json::Value::String(status.to_string());
    a["tanggal_status"] = serde_json::Value::String(force_date.map(String::from).unwrap_or(format!("{y}-{m:02}-{d:02}")));
    a["folder"] = serde_json::Value::String(new_folder.clone());
    // The next step follows the status the way sop/follow_up.md has it when Nova moves an application: nothing is waiting once it is closed,
    // and a sent application gets its 14-day follow-up. Undo puts the old values back exactly.
    match &force_next {
        Some((n, dd)) => { a["next_action"] = serde_json::Value::String(n.clone()); a["next_action_due"] = serde_json::Value::String(dd.clone()); }
        None if matches!(status, "Rejected" | "Withdrawn" | "No Response") => { a["next_action"] = serde_json::Value::String(String::new()); a["next_action_due"] = serde_json::Value::String(String::new()); }
        None if status == "Applied" && old_status != "Applied" && (old_due.is_empty() || old_due.as_str() <= format!("{y}-{m:02}-{d:02}").as_str()) => {
            let (fy, fm, fd) = plus_days(y, m, d, 14);
            a["next_action"] = serde_json::Value::String("Follow up (14 days)".into());
            a["next_action_due"] = serde_json::Value::String(format!("{fy}-{fm:02}-{fd:02}"));
        }
        None => {}
    }
    v["meta"]["last_updated"] = serde_json::Value::String(format!("{y}-{m:02}-{d:02}"));
    if let Err(e) = save_apps(&jp, &v, seen) {
        // Put the folder back so folder and JSON stay in sync.
        if new_folder != old_folder {
            let _ = fs::rename(wf.join(&new_folder), wf.join(&old_folder));
        }
        return Err(e);
    }
    log_change(root, &format!("{who}: {old_status} -> {status} (changed in the app)"));
    let tracker = rebuild_tracker(root);
    Ok(MoveResult { old_status, old_folder, old_status_date, old_next, old_due, new_folder, tracker })
}

#[tauri::command]
async fn move_application(root: String, id: String, status: String) -> Result<MoveResult, String> {
    tauri::async_runtime::spawn_blocking(move || move_app_sync(Path::new(&root), &id, &status, None, None, None))
        .await
        .map_err(|e| e.to_string())?
}

// Undo: back to the exact previous status, folder and status date.
#[tauri::command]
async fn undo_move(root: String, id: String, status: String, folder: String, status_date: String, next_action: Option<String>, next_due: Option<String>) -> Result<MoveResult, String> {
    let next = match (next_action, next_due) { (Some(a), Some(b)) => Some((a, b)), _ => None };
    tauri::async_runtime::spawn_blocking(move || move_app_sync(Path::new(&root), &id, &status, Some(&folder), Some(&status_date), next))
        .await
        .map_err(|e| e.to_string())?
}

fn launch(target: &str) -> Result<(), String> {
    let r = if cfg!(target_os = "macos") {
        Command::new("open").arg(target).spawn()
    } else if cfg!(target_os = "windows") {
        if Path::new(target).is_dir() {
            Command::new("explorer").arg(target).spawn()
        } else {
            // No shell: `cmd /C start` would treat characters such as & or | in a link or file name as commands.
            // rundll32 opens a URL or file with its default app and receives `target` as one plain argument.
            quiet(Command::new("rundll32").args(["url.dll,FileProtocolHandler", target])).spawn()
        }
    } else {
        Command::new("xdg-open").arg(target).spawn()
    };
    r.map(|_| ()).map_err(|e| e.to_string())
}

// Folder names are lower-case slugs ("pengguna"). Shown to people they become "Pengguna".
fn nice_name(slug: &str) -> String {
    slug.split(|c: char| c == '_' || c == '-' || c.is_whitespace())
        .filter(|w| !w.is_empty())
        .map(|w| {
            let mut c = w.chars();
            match c.next() {
                Some(f) => f.to_uppercase().collect::<String>() + c.as_str(),
                None => String::new(),
            }
        })
        .collect::<Vec<_>>()
        .join(" ")
}

// The name to show for a user: the full name exactly as typed (identity.json "name"), unless it is empty or still the
// template placeholder ("<TAILOR: ...>"); then the folder name with capital letters.
fn display_name(root: &Path) -> String {
    let typed = fs::read_to_string(root.join("01_user_documents").join("--usersettings").join("identity.json"))
        .ok()
        .and_then(|t| serde_json::from_str::<serde_json::Value>(&t).ok())
        .and_then(|v| v.get("name").and_then(|n| n.as_str()).map(|n| n.trim().to_string()))
        .unwrap_or_default();
    if !typed.is_empty() && !typed.starts_with('<') {
        return typed;
    }
    nice_name(&root.file_name().map(|s| s.to_string_lossy().to_string()).unwrap_or_default())
}

// Stores the full name exactly as typed. Creates identity.json when the template has none or it cannot be read.
fn write_identity_name(id: &Path, name: &str) {
    let mut v: serde_json::Value = fs::read_to_string(id)
        .ok()
        .and_then(|t| serde_json::from_str::<serde_json::Value>(&t).ok())
        .filter(|v| v.is_object())
        .unwrap_or_else(|| serde_json::json!({}));
    v["name"] = serde_json::Value::String(name.to_string());
    v["surname"] = serde_json::Value::String(name.split_whitespace().last().unwrap_or("").to_string());
    if let Some(dir) = id.parent() {
        let _ = fs::create_dir_all(dir);
    }
    if let Ok(out) = serde_json::to_string_pretty(&v) {
        let _ = fs::write(id, out + "\n");
    }
}

// Changes the full name shown for this user (identity.json "name" and "surname"), e.g. when only a first name was typed.
#[tauri::command]
fn set_full_name(root: String, name: String) -> Result<String, String> {
    let name = name.split_whitespace().collect::<Vec<_>>().join(" ");
    if name.is_empty() || name.chars().count() > 80 || name.chars().any(|c| c.is_control()) || name.starts_with('<') {
        return Err("Please enter a name of up to 80 characters.".into());
    }
    let p = PathBuf::from(&root);
    if !p.join("01_user_documents").is_dir() { return Err("This is not a Vantage user folder.".into()); }
    write_identity_name(&p.join("01_user_documents").join("--usersettings").join("identity.json"), &name);
    Ok(name)
}

// Takes a user out of Vantage. Nothing is erased: the whole folder moves to "_Deleted_Users" next to it (same disk, so
// it is instant), and can be moved back by hand until that folder is emptied. Returns where it went.
#[tauri::command]
fn remove_user(root: String) -> Result<String, String> {
    let p = PathBuf::from(&root);
    if !p.join("01_user_documents").is_dir() { return Err("This is not a Vantage user folder.".into()); }
    let parent = p.parent().ok_or("The folder has no parent folder.")?;
    let name = p.file_name().map(|n| n.to_string_lossy().to_string()).unwrap_or_default();
    if name.is_empty() || name.starts_with('_') { return Err("This folder cannot be removed here.".into()); }
    let bin = parent.join("_Deleted_Users");
    fs::create_dir_all(&bin).map_err(|e| e.to_string())?;
    let (y, m, d) = today();
    let stamp = format!("{y:04}{m:02}{d:02}");
    let mut dst = bin.join(format!("{name}_{stamp}"));
    let mut n = 2;
    while dst.exists() { dst = bin.join(format!("{name}_{stamp}_{n}")); n += 1; }
    fs::rename(&p, &dst).map_err(|e| format!("The folder could not be moved ({e}). Close files from it that are open in other programs and try again."))?;
    Ok(dst.to_string_lossy().to_string())
}

// Names for a list of user folders (the user menu).
#[tauri::command]
fn user_labels(paths: Vec<String>) -> Vec<String> {
    paths.iter().map(|p| display_name(Path::new(p))).collect()
}

// Runs the folder scan on a worker thread so the window never freezes on large folders.
#[tauri::command]
async fn scan(path: String) -> Result<Status, String> {
    tauri::async_runtime::spawn_blocking(move || scan_sync(path))
        .await
        .map_err(|e| e.to_string())
}
#[tauri::command]
fn open_path(path: String) -> Result<(), String> {
    if !Path::new(&path).is_dir() {
        return Err("Folder not found. Please select your Vantage folder again.".into());
    }
    launch(&path)
}

// Opens one application's folder (relative to 02_workflow) in Finder / File Explorer.
#[tauri::command]
fn open_app_folder(root: String, folder: String) -> Result<(), String> {
    let wf = PathBuf::from(&root).join("02_workflow");
    let target = wf.join(&folder);
    let ok = match (fs::canonicalize(&wf), fs::canonicalize(&target)) {
        (Ok(w), Ok(t)) => t.starts_with(&w) && t.is_dir(),
        _ => false,
    };
    if folder.is_empty() || !ok {
        return Err("This application's folder was not found.".into());
    }
    launch(&target.to_string_lossy())
}

#[tauri::command]
fn open_url(url: String) -> Result<(), String> {
    // Parse first, so only a well-formed https address is passed on, in its normalised form.
    let parsed = tauri::Url::parse(url.trim()).map_err(|_| "This is not a valid web address.".to_string())?;
    if parsed.scheme() != "https" || parsed.host_str().unwrap_or("").is_empty() {
        return Err("Only https addresses are allowed.".into());
    }
    launch(parsed.as_str())
}

// Which of these folders still exist (the user list drops folders deleted in Finder).
#[tauri::command]
fn existing_dirs(paths: Vec<String>) -> Vec<String> {
    paths.into_iter().filter(|p| Path::new(p).join("02_workflow").is_dir()).collect()
}

// Cheap change detector: modification times of the files and folders the dashboard reads. The page only
// runs a full scan when this number changes, so an idle window costs almost nothing.
#[tauri::command]
fn fingerprint(root: String) -> u64 {
    let root = PathBuf::from(root);
    let mut acc: u64 = 1469598103934665603;
    let mut add = |p: &Path| {
        let m = fs::metadata(p).ok();
        let t = m.as_ref().and_then(|m| m.modified().ok()).and_then(|t| t.duration_since(SystemTime::UNIX_EPOCH).ok()).map(|d| d.as_nanos() as u64).unwrap_or(0);
        acc = (acc ^ t ^ m.map(|m| m.len()).unwrap_or(0)).wrapping_mul(1099511628211);
    };
    let ud = root.join("01_user_documents");
    for p in [ud.join("--usersettings").join("applications.json"), ud.join("--usersettings").join("identity.json"),
              ud.join("raw_facts_about_you.md"), ud.join("Master_CV"), ud.join("materials"), root.join(INBOX),
              root.join("02_workflow").join("03_Tracker").join("Application_Tracker.xlsx")] {
        add(&p);
    }
    for dir in [ud.join("materials"), root.join(INBOX)] {
        if let Ok(rd) = fs::read_dir(&dir) {
            for e in rd.flatten() {
                add(&e.path());
            }
        }
    }
    // Folders only (no files) under 02_workflow, 5 levels: catches moved/renamed/new application and report folders.
    fn dirs(p: &Path, depth: u32, add: &mut dyn FnMut(&Path)) {
        add(p);
        if depth == 0 { return; }
        if let Ok(rd) = fs::read_dir(p) {
            for e in rd.flatten() {
                if e.file_type().map(|t| t.is_dir()).unwrap_or(false) {
                    dirs(&e.path(), depth - 1, add);
                }
            }
        }
    }
    dirs(&root.join("02_workflow"), 5, &mut add);
    acc
}

// Remove one application from applications.json (its folder is already gone). Returns the removed entry and
// its position so the page can undo. The Excel tracker is rebuilt.
#[derive(Serialize)]
struct Removed { entry: serde_json::Value, index: usize, tracker: String }

#[tauri::command]
fn remove_application(root: String, id: String) -> Result<Removed, String> {
    let root = PathBuf::from(root);
    let jp = apps_json(&root);
    let seen = mtime_of(&jp);
    let mut v: serde_json::Value = serde_json::from_str(&fs::read_to_string(&jp).map_err(|e| e.to_string())?).map_err(|e| e.to_string())?;
    let apps = v["applications"].as_array_mut().ok_or("applications.json has no applications.")?;
    let index = apps.iter().position(|a| a["id"].as_str() == Some(id.as_str())).ok_or("Application not found.")?;
    let entry = apps.remove(index);
    save_apps(&jp, &v, seen)?;
    log_change(&root, &format!("{}: removed from the tracker (in the app)", entry["perusahaan"].as_str().unwrap_or("")));
    Ok(Removed { entry, index, tracker: rebuild_tracker(&root) })
}

#[tauri::command]
fn restore_application(root: String, entry: serde_json::Value, index: usize) -> Result<String, String> {
    let root = PathBuf::from(root);
    let jp = apps_json(&root);
    let seen = mtime_of(&jp);
    let mut v: serde_json::Value = serde_json::from_str(&fs::read_to_string(&jp).map_err(|e| e.to_string())?).map_err(|e| e.to_string())?;
    let apps = v["applications"].as_array_mut().ok_or("applications.json has no applications.")?;
    let i = index.min(apps.len());
    log_change(&root, &format!("{}: put back into the tracker (in the app)", entry["perusahaan"].as_str().unwrap_or("")));
    apps.insert(i, entry);
    save_apps(&jp, &v, seen)?;
    Ok(rebuild_tracker(&root))
}

fn main() {
    // Started by the operating system's daily task: no window, just the Morning Report run (see sched.rs).
    let args: Vec<String> = std::env::args().collect();
    if args.iter().any(|a| a == "--print-cli-args") { nova::print_cli_args(); std::process::exit(0); }
    if args.iter().any(|a| a == sched::FLAG) {
        std::process::exit(match sched::run_report_arg(&args) { Some(root) => sched::run_scheduled(&root), None => 2 });
    }
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .invoke_handler(tauri::generate_handler![update_info, prefs_get, prefs_set, write_ui_context, existing_dirs, fingerprint, remove_application, restore_application, scan, open_path, open_app_folder, dir_files, reveal_path, inbox_add, inbox_trash, skill_gaps, search_settings_get, search_settings_set, app_update_check, app_update_prepare, app_update_restart, release_notes, find_users, user_labels, set_full_name, remove_user, inspect_folder, default_vantage_dir, vantage_setup, user_photo, app_files, preview_file, open_file, master_cv, create_user, move_application, undo_move, open_url, nova::nova_status, nova::nova_install, nova::nova_login, nova::nova_send, nova::nova_stop, nova::nova_busy, nova::nova_chat_append, nova::nova_chat_load, nova::nova_quick, nova::nova_inbox_apply, nova::nova_inbox_last, nova::nova_inbox_undo, nova::save_text, nova::run_kit_script, sched::sched_status, sched::sched_set])
        .on_webview_event(|webview, event| {
            use tauri::Emitter;
            if webview.label() != "main" { return; }
            if let tauri::WebviewEvent::DragDrop(e) = event {
                let msg = match e {
                    tauri::DragDropEvent::Enter { .. } | tauri::DragDropEvent::Over { .. } => serde_json::json!({"type": "over"}),
                    tauri::DragDropEvent::Drop { paths, .. } => serde_json::json!({"type": "drop", "paths": paths}),
                    _ => serde_json::json!({"type": "leave"}),
                };
                let _ = webview.app_handle().emit_to("main", "vantage-drop", msg);
            }
        })
        .on_window_event(|window, event| {
            use tauri::Emitter;
            if let tauri::WindowEvent::DragDrop(e) = event {
                let msg = match e {
                    tauri::DragDropEvent::Enter { .. } | tauri::DragDropEvent::Over { .. } => serde_json::json!({"type": "over"}),
                    tauri::DragDropEvent::Drop { paths, .. } => serde_json::json!({"type": "drop", "paths": paths}),
                    _ => serde_json::json!({"type": "leave"}),
                };
                if window.label() == "main" {
                    let _ = window.app_handle().emit_to("main", "vantage-drop", msg);
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("gagal menjalankan Vantage");
}

#[cfg(test)]
mod tests {
    use super::*;

    fn scratch(name: &str) -> PathBuf {
        let d = std::env::temp_dir().join(format!("vantage_test_{name}_{}", std::process::id()));
        let _ = fs::remove_dir_all(&d);
        fs::create_dir_all(&d).unwrap();
        d
    }

    #[test]
    fn dates_add_across_months_years_and_leap_days() {
        assert_eq!(plus_days(2026, 11, 4, 14), (2026, 11, 18));
        assert_eq!(plus_days(2026, 12, 25, 14), (2027, 1, 8));
        assert_eq!(plus_days(2028, 2, 20, 14), (2028, 3, 5));
        assert_eq!(plus_days(2026, 3, 1, -1), (2026, 2, 28));
    }

    #[test]
    fn applications_json_is_not_overwritten_when_someone_else_changed_it() {
        let d = scratch("apps");
        let jp = d.join("applications.json");
        write_atomic(&jp, "{\"applications\":[]}\n").unwrap();
        let seen = mtime_of(&jp);
        let mine = serde_json::json!({"applications": [{"id": "a"}]});
        save_apps(&jp, &mine, seen).unwrap();
        let seen = mtime_of(&jp);
        std::thread::sleep(std::time::Duration::from_millis(30));
        fs::write(&jp, "{\"applications\":[{\"id\":\"nova\"}]}").unwrap();   // another program saves in between
        assert!(save_apps(&jp, &mine, seen).is_err());
        assert!(fs::read_to_string(&jp).unwrap().contains("nova"));
        assert!(!jp.with_extension("vtmp").exists(), "no temp file is left behind");
    }

    #[test]
    fn the_change_log_keeps_the_last_200_lines() {
        let d = scratch("log");
        fs::create_dir_all(d.join("01_user_documents/--usersettings")).unwrap();
        for i in 0..230 { log_change(&d, &format!("line {i}")); }
        let t = fs::read_to_string(d.join("01_user_documents/--usersettings/app_changes.log")).unwrap();
        assert_eq!(t.lines().count(), 200);
        assert!(t.contains("line 229") && !t.contains("line 20]") && !t.contains("] line 29\n"));
    }

    #[test]
    fn category_folders_list_each_project_on_its_own() {
        let m = scratch("mats");
        for p in ["research/RES1_a", "research/RES2_b", "education/EDU-01", "PROJ1_x"] { fs::create_dir_all(m.join(p)).unwrap(); }
        fs::write(m.join("research/RES1_a/f.pdf"), "x").unwrap();
        fs::write(m.join("00_Photo.jpg"), "x").unwrap();
        let names: Vec<String> = list_materials(&m).into_iter().map(|i| i.name).collect();
        for n in ["research/RES1_a", "research/RES2_b", "education/EDU-01", "PROJ1_x", "00_Photo.jpg"] { assert!(names.contains(&n.to_string()), "{n} in {names:?}"); }
        assert!(!names.contains(&"research".to_string()));
    }

    #[test]
    fn a_folder_name_comes_from_the_full_name() {
        assert_eq!(user_slug("Maria Sari"), "sari_maria");
        assert_eq!(user_slug("Maximilian Alexander Hohenberg"), "hohenberg_ma", "too long for 20 characters: the first names become initials");
        assert_eq!(user_slug("Müller"), "mueller");
        assert_eq!(user_slug("  "), "user");
        assert!(user_slug("Maximiliane Alexandra Hohenzollern-Sigmaringen").len() <= 20);
    }

    #[test]
    fn pipeline_statuses_are_the_active_ones() {
        for s in ["Draft", "Screening", "Interview R1", "Interview R2", "Assessment"] { assert!(in_pipeline(s)); }
        for s in ["Applied", "Offer", "Rejected", "Withdrawn", "No Response"] { assert!(!in_pipeline(s)); }
    }
}
