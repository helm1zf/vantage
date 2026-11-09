// The daily Morning Report as a real task of the operating system: a launchd agent on macOS, a Task Scheduler task on Windows.
// The OS starts this same program with `--run-report <folder>` at the chosen time, even when the Vantage window is closed.
// That run has no window: it starts Claude Code as Sinta (the same way the chat does), waits for the report, and records
// the outcome in --usersettings/report_run.json, which the Morning report page shows ("Next", "Last", or why it failed).
use chrono::{Local, NaiveDate, NaiveDateTime, TimeZone};
use serde::{Deserialize, Serialize};
use std::{
    fs,
    io::{BufRead, BufReader},
    path::{Path, PathBuf},
    process::{Command, Stdio},
    time::{Duration, Instant, SystemTime},
};

pub const FLAG: &str = "--run-report";
const LABEL: &str = "app.vantage.morning-report";
#[cfg_attr(not(windows), allow(dead_code))]
const TASK: &str = "VantageMorningReport";
// What the run asks Sinta to do. Must say the same as the "Find jobs now" button (ui/i18n.js, `runreport`); a test checks it.
const PROMPT: &str = "Run the Morning Report now with my search settings (--usersettings/search_settings.json), following sop/laporan_pagi.md.";
const NOTE: &str = "You are running unattended: the daily scheduled Morning Report of the Vantage desktop app. Nobody is reading this chat. \
Do the whole Morning Report (search, check the fit, write the report files) as the SOP says, then stop. If something is missing, write what you could not do into the report instead of asking a question. \
There are no permission cards here: if a tool is refused, say so in the report. Shell: only a single `python3 ./--settings/scripts/<name>.py ...` call (a kit script, by that path; no `cd`, no `&&`, no pipes), `ls ...` and `mkdir ...`. Files outside the Vantage folder cannot be read or written. \
Read and search with the Read, Grep and Glob tools and change files with Edit or Write, never with a shell.";
const ATTEMPTS: u32 = 3;
const RETRY_WAIT: Duration = Duration::from_secs(10 * 60);
const RUN_LIMIT: Duration = Duration::from_secs(45 * 60);
// Longer than the worst case (every attempt at its limit plus the waits between them): a live run is never taken for a dead one.
const LOCK_STALE: Duration = Duration::from_secs(4 * 3600);

fn settings_dir(root: &Path) -> PathBuf {
    root.join("01_user_documents").join("--usersettings")
}
fn state_path(root: &Path) -> PathBuf {
    settings_dir(root).join("report_run.json")
}
fn lock_path(root: &Path) -> PathBuf {
    settings_dir(root).join("report_run.lock")
}

// "07:30" -> (7, 30)
pub fn parse_time(t: &str) -> Option<(u32, u32)> {
    let (h, m) = t.trim().split_once(':')?;
    let (h, m): (u32, u32) = (h.parse().ok()?, m.parse().ok()?);
    (h < 24 && m < 60 && t.trim().len() == 5).then_some((h, m))
}

fn xml_escape(s: &str) -> String {
    s.replace('&', "&amp;").replace('<', "&lt;").replace('>', "&gt;").replace('"', "&quot;").replace('\'', "&apos;")
}

// ---- What the page shows: the state of the last run, kept next to the user's other settings.
#[derive(Serialize, Deserialize, Default, Clone, Debug, PartialEq)]
pub struct RunState {
    pub start: i64,
    pub end: i64,
    pub ok: bool,
    pub error: String,
}
pub fn read_state(root: &Path) -> RunState {
    fs::read_to_string(state_path(root)).ok().and_then(|t| serde_json::from_str(&t).ok()).unwrap_or_default()
}
fn write_state(root: &Path, s: &RunState) {
    let _ = fs::create_dir_all(settings_dir(root));
    if let Ok(t) = serde_json::to_string_pretty(s) {
        let _ = fs::write(state_path(root), t);
    }
}
fn now_ts() -> i64 {
    SystemTime::now().duration_since(SystemTime::UNIX_EPOCH).map(|d| d.as_secs() as i64).unwrap_or(0)
}

// The next time the task fires, as a unix timestamp.
pub fn next_run(now: NaiveDateTime, h: u32, m: u32) -> NaiveDateTime {
    let t = now.date().and_hms_opt(h, m, 0).unwrap_or(now);
    if t > now { t } else { t + chrono::Duration::days(1) }
}
fn local_ts(n: NaiveDateTime) -> i64 {
    Local.from_local_datetime(&n).earliest().map(|d| d.timestamp()).unwrap_or(0)
}

// Whether today already has a Morning Report with its JSON (a manual run counts: the day is not searched twice).
pub fn report_exists_on(root: &Path, day: NaiveDate) -> bool {
    let dir = root.join("02_workflow").join("Laporan_Pagi").join(day.format("%Y-%m-%d").to_string());
    fs::read_dir(dir)
        .map(|rd| rd.flatten().any(|e| { let n = e.file_name().to_string_lossy().to_string(); n.contains("Laporan_Pagi") && n.ends_with(".json") }))
        .unwrap_or(false)
}
fn keywords_set(root: &Path) -> bool {
    fs::read_to_string(settings_dir(root).join("search_settings.json")).ok()
        .and_then(|t| serde_json::from_str::<serde_json::Value>(&t).ok())
        .and_then(|v| v["kata_kunci"].as_array().map(|a| a.iter().any(|k| k.as_str().map(|s| !s.trim().is_empty()).unwrap_or(false))))
        .unwrap_or(false)
}

// ---- macOS: ~/Library/LaunchAgents/app.vantage.morning-report.plist
#[cfg_attr(not(target_os = "macos"), allow(dead_code))]
pub fn plist_xml(exe: &str, root: &str, h: u32, m: u32, log: &str) -> String {
    format!(
        "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<!DOCTYPE plist PUBLIC \"-//Apple//DTD PLIST 1.0//EN\" \"http://www.apple.com/DTDs/PropertyList-1.0.dtd\">\n<plist version=\"1.0\">\n<dict>\n  <key>Label</key><string>{LABEL}</string>\n  <key>ProgramArguments</key>\n  <array>\n    <string>{}</string>\n    <string>{FLAG}</string>\n    <string>{}</string>\n  </array>\n  <key>StartCalendarInterval</key>\n  <dict><key>Hour</key><integer>{h}</integer><key>Minute</key><integer>{m}</integer></dict>\n  <key>StandardOutPath</key><string>{}</string>\n  <key>StandardErrorPath</key><string>{}</string>\n</dict>\n</plist>\n",
        xml_escape(exe), xml_escape(root), xml_escape(log), xml_escape(log)
    )
}
// The time and folder an existing plist is set to (None when it is another folder's or unreadable).
#[cfg_attr(not(target_os = "macos"), allow(dead_code))]
pub fn plist_time(text: &str, root: &str) -> Option<(u32, u32)> {
    if !text.contains(&format!("<string>{}</string>", xml_escape(root))) { return None; }
    let num = |key: &str| -> Option<u32> {
        let i = text.find(&format!("<key>{key}</key><integer>"))? + key.len() + 20;
        text[i..].split("</integer>").next()?.trim().parse().ok()
    };
    Some((num("Hour")?, num("Minute")?))
}
#[cfg_attr(not(target_os = "macos"), allow(dead_code))]
fn agents_dir() -> PathBuf {
    PathBuf::from(std::env::var_os("HOME").unwrap_or_default()).join("Library").join("LaunchAgents")
}

// ---- Windows: a Task Scheduler task from XML (so a run missed while the PC was off starts when it is back).
#[cfg_attr(not(windows), allow(dead_code))]
pub fn task_xml(exe: &str, root: &str, h: u32, m: u32) -> String {
    format!(
        "<?xml version=\"1.0\" encoding=\"UTF-16\"?>\n<Task version=\"1.2\" xmlns=\"http://schemas.microsoft.com/windows/2004/02/mit/task\">\n  <Triggers><CalendarTrigger><StartBoundary>2026-01-01T{h:02}:{m:02}:00</StartBoundary><Enabled>true</Enabled><ScheduleByDay><DaysInterval>1</DaysInterval></ScheduleByDay></CalendarTrigger></Triggers>\n  <Principals><Principal id=\"Author\"><LogonType>InteractiveToken</LogonType><RunLevel>LeastPrivilege</RunLevel></Principal></Principals>\n  <Settings><StartWhenAvailable>true</StartWhenAvailable><DisallowStartIfOnBatteries>false</DisallowStartIfOnBatteries><StopIfGoingOnBatteries>false</StopIfGoingOnBatteries><ExecutionTimeLimit>PT3H</ExecutionTimeLimit></Settings>\n  <Actions Context=\"Author\"><Exec><Command>{}</Command><Arguments>{FLAG} \"{}\"</Arguments></Exec></Actions>\n</Task>\n",
        xml_escape(exe), xml_escape(root)
    )
}

#[derive(Serialize, Default)]
pub struct SchedStatus {
    supported: bool,
    registered: bool,
    time: String,
    next: i64,
    last_end: i64,
    last_ok: bool,
    last_error: String,
}

#[cfg_attr(not(any(target_os = "macos", windows)), allow(dead_code))]
fn run(cmd: &str, args: &[&str]) -> Result<String, String> {
    let mut c = Command::new(cmd);
    c.args(args);
    crate::quiet(&mut c);
    let o = c.output().map_err(|e| e.to_string())?;
    if o.status.success() { Ok(String::from_utf8_lossy(&o.stdout).to_string()) } else { Err(String::from_utf8_lossy(&o.stderr).trim().to_string()) }
}

#[cfg(target_os = "macos")]
fn registered_time(root: &str) -> Option<(u32, u32)> {
    plist_time(&fs::read_to_string(agents_dir().join(format!("{LABEL}.plist"))).ok()?, root)
}
#[cfg(target_os = "macos")]
fn register(root: &str, h: u32, m: u32) -> Result<(), String> {
    let exe = std::env::current_exe().map_err(|e| e.to_string())?;
    let log = settings_dir(Path::new(root)).join("report_run.log");
    let dir = agents_dir();
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let p = dir.join(format!("{LABEL}.plist"));
    fs::write(&p, plist_xml(&exe.to_string_lossy(), root, h, m, &log.to_string_lossy())).map_err(|e| e.to_string())?;
    let uid = run("id", &["-u"])?.trim().to_string();
    let domain = format!("gui/{uid}");
    let _ = run("launchctl", &["bootout", &format!("{domain}/{LABEL}")]);
    run("launchctl", &["bootstrap", &domain, &p.to_string_lossy()]).map(|_| ()).map_err(|e| format!("The system refused the daily task: {e}"))
}
#[cfg(target_os = "macos")]
fn unregister(root: &str) -> Result<(), String> {
    if registered_time(root).is_none() { return Ok(()); }   // another folder's task: leave it alone
    let uid = run("id", &["-u"])?.trim().to_string();
    let _ = run("launchctl", &["bootout", &format!("gui/{uid}/{LABEL}")]);
    let _ = fs::remove_file(agents_dir().join(format!("{LABEL}.plist")));
    Ok(())
}
#[cfg(target_os = "macos")]
fn loaded() -> bool {
    run("id", &["-u"]).ok().map(|u| run("launchctl", &["print", &format!("gui/{}/{LABEL}", u.trim())]).is_ok()).unwrap_or(false)
}

#[cfg(windows)]
fn registered_time(root: &str) -> Option<(u32, u32)> {
    let x = run("schtasks", &["/Query", "/TN", TASK, "/XML"]).ok()?;
    if !x.contains(&xml_escape(root)) { return None; }
    let i = x.find("<StartBoundary>")? + 15;
    let t = &x[i..].split("</StartBoundary>").next()?;
    parse_time(t.split('T').nth(1)?.get(0..5)?)
}
#[cfg(windows)]
fn register(root: &str, h: u32, m: u32) -> Result<(), String> {
    let exe = std::env::current_exe().map_err(|e| e.to_string())?;
    let xml = task_xml(&exe.to_string_lossy(), root, h, m);
    let mut bytes: Vec<u8> = vec![0xFF, 0xFE];
    for u in xml.encode_utf16() { bytes.extend_from_slice(&u.to_le_bytes()); }
    let f = std::env::temp_dir().join("vantage_morning_report_task.xml");
    fs::write(&f, bytes).map_err(|e| e.to_string())?;
    let r = run("schtasks", &["/Create", "/F", "/TN", TASK, "/XML", &f.to_string_lossy()]).map(|_| ()).map_err(|e| format!("The system refused the daily task: {e}"));
    let _ = fs::remove_file(&f);
    r
}
#[cfg(windows)]
fn unregister(root: &str) -> Result<(), String> {
    if registered_time(root).is_none() { return Ok(()); }
    run("schtasks", &["/Delete", "/F", "/TN", TASK]).map(|_| ())
}
#[cfg(windows)]
fn loaded() -> bool { true }

#[cfg(not(any(target_os = "macos", windows)))]
fn registered_time(_: &str) -> Option<(u32, u32)> { None }
#[cfg(not(any(target_os = "macos", windows)))]
fn register(_: &str, _: u32, _: u32) -> Result<(), String> { Err("A daily search needs macOS or Windows.".into()) }
#[cfg(not(any(target_os = "macos", windows)))]
fn unregister(_: &str) -> Result<(), String> { Ok(()) }
#[cfg(not(any(target_os = "macos", windows)))]
fn loaded() -> bool { false }

fn supported() -> bool { cfg!(any(target_os = "macos", windows)) }

fn status_for(root: &str) -> SchedStatus {
    let st = read_state(Path::new(root));
    let mut s = SchedStatus { supported: supported(), last_end: st.end, last_ok: st.ok, last_error: st.error, ..Default::default() };
    if let Some((h, m)) = registered_time(root) {
        // Repair a task that points at an old program path or is no longer loaded (the app was moved or updated).
        let exe_ok = std::env::current_exe().ok().map(|e| plist_matches_exe(&e, root)).unwrap_or(true);
        if (!exe_ok || !loaded()) && register(root, h, m).is_err() { s.last_error = "The daily task could not be repaired.".into(); }
        s.registered = true;
        s.time = format!("{h:02}:{m:02}");
        s.next = local_ts(next_run(Local::now().naive_local(), h, m));
    }
    s
}
#[cfg(target_os = "macos")]
fn plist_matches_exe(exe: &Path, _root: &str) -> bool {
    fs::read_to_string(agents_dir().join(format!("{LABEL}.plist"))).map(|t| t.contains(&format!("<string>{}</string>", xml_escape(&exe.to_string_lossy())))).unwrap_or(false)
}
#[cfg(not(target_os = "macos"))]
fn plist_matches_exe(_: &Path, _: &str) -> bool { true }

#[tauri::command]
pub fn sched_status(root: String) -> SchedStatus {
    status_for(&root)
}

#[tauri::command]
pub fn sched_set(root: String, on: bool, time: String) -> Result<SchedStatus, String> {
    if !supported() { return Err("A daily search needs macOS or Windows.".into()); }
    if !Path::new(&root).join("02_workflow").is_dir() { return Err("Please select your Vantage folder first.".into()); }
    if on {
        let (h, m) = parse_time(&time).ok_or("Please choose a time like 07:00.")?;
        register(&root, h, m)?;
    } else {
        unregister(&root)?;
    }
    Ok(status_for(&root))
}

// "--run-report <folder>" from the command line, if present.
pub fn run_report_arg(args: &[String]) -> Option<String> {
    let i = args.iter().position(|a| a == FLAG)?;
    args.get(i + 1).filter(|p| !p.starts_with("--")).cloned()
}

fn notify(text: &str) {
    #[cfg(target_os = "macos")]
    {
        let esc = text.replace('\\', "\\\\").replace('"', "'");
        let _ = run("osascript", &["-e", &format!("display notification \"{esc}\" with title \"Vantage\"")]);
    }
    #[cfg(not(target_os = "macos"))]
    let _ = text;
}

// One attempt: Sinta runs the whole report. Returns an error text when Claude Code failed or no report appeared.
fn attempt(root: &Path) -> Result<(), String> {
    let bin = crate::nova::find_claude().ok_or("Claude Code is not installed.")?;
    let work = crate::nova::work_dir(root);
    crate::ensure_agents(&work, root);
    let mut cmd = crate::nova::cli_command(&bin, &work, NOTE, "sonnet", &[]);
    cmd.args(["--agent", "sinta", "--max-budget-usd", "8.00"]).stdin(Stdio::piped()).stdout(Stdio::piped()).stderr(Stdio::piped());
    let mut child = cmd.spawn().map_err(|e| e.to_string())?;
    if let Some(mut si) = child.stdin.take() { use std::io::Write; let _ = si.write_all(PROMPT.as_bytes()); }
    let out = child.stdout.take().ok_or("No output from Claude Code.")?;
    let mut err = child.stderr.take().ok_or("No output from Claude Code.")?;
    let errs = std::thread::spawn(move || { let mut s = String::new(); let _ = std::io::Read::read_to_string(&mut err, &mut s); s });
    let reader = std::thread::spawn(move || {
        let mut last = String::new();
        for line in BufReader::new(out).lines().map_while(Result::ok) {
            if let Ok(v) = serde_json::from_str::<serde_json::Value>(&line) {
                if v["type"] == "result" && v["is_error"] == true { last = v["result"].as_str().unwrap_or("").to_string(); }
            }
        }
        last
    });
    let t0 = Instant::now();
    let code = loop {
        match child.try_wait() {
            Ok(Some(s)) => break s.code(),
            Ok(None) if t0.elapsed() > RUN_LIMIT => { let _ = child.kill(); let _ = child.wait(); return Err("The search took longer than 45 minutes and was stopped.".into()); }
            Ok(None) => std::thread::sleep(Duration::from_secs(3)),
            Err(e) => return Err(e.to_string()),
        }
    };
    let said = reader.join().unwrap_or_default();
    let stderr = errs.join().unwrap_or_default();
    if report_exists_on(root, Local::now().date_naive()) { return Ok(()); }
    let text = if !said.trim().is_empty() { said } else { stderr };
    Err(friendly_error(&text, code))
}
pub fn friendly_error(text: &str, code: Option<i32>) -> String {
    let l = text.to_lowercase();
    if l.contains("not logged in") || l.contains("/login") || l.contains("authentication") || l.contains("invalid api key") { return "Claude Code is not logged in.".into(); }
    if l.contains("budget") { return "The search stopped at its cost limit.".into(); }
    if l.contains("network") || l.contains("enotfound") || l.contains("fetch failed") || l.contains("offline") { return "No internet connection.".into(); }
    let t: String = text.trim().chars().take(160).collect();
    if t.is_empty() { format!("No report was written (exit code {}).", code.map(|c| c.to_string()).unwrap_or_else(|| "none".into())) } else { t }
}

// The whole unattended run. Returns the exit code.
pub fn run_scheduled(root: &str) -> i32 {
    let root = PathBuf::from(root);
    let start = now_ts();
    let finish = |ok: bool, error: &str| {
        write_state(&root, &RunState { start, end: now_ts(), ok, error: error.to_string() });
        notify(&if ok { "Your Morning Report is ready.".to_string() } else { format!("Morning Report failed: {error}") });
        if ok { 0 } else { 1 }
    };
    if !root.join("02_workflow").is_dir() { return finish(false, "The Vantage folder was not found."); }
    if let Ok(m) = fs::metadata(lock_path(&root)).and_then(|m| m.modified()) {
        if m.elapsed().map(|e| e < LOCK_STALE).unwrap_or(false) { return 0; }   // another run is going on
    }
    let _ = fs::create_dir_all(settings_dir(&root));
    let _ = fs::write(lock_path(&root), now_ts().to_string());
    let result = (|| {
        if report_exists_on(&root, Local::now().date_naive()) { return Ok(()); }
        if !keywords_set(&root) { return Err("Add at least one keyword in Search settings.".to_string()); }
        let mut last = String::new();
        for n in 1..=ATTEMPTS {
            match attempt(&root) {
                Ok(()) => return Ok(()),
                Err(e) => { last = e; }
            }
            // Not logged in or not installed will not fix itself in ten minutes; a network hiccup might.
            if n < ATTEMPTS && !last.contains("logged in") && !last.contains("not installed") { std::thread::sleep(RETRY_WAIT); } else { break; }
        }
        Err(last)
    })();
    let _ = fs::remove_file(lock_path(&root));
    match result { Ok(()) => finish(true, ""), Err(e) => finish(false, &e) }
}

#[cfg(test)]
mod tests {
    use super::*;
    fn tmp(name: &str) -> PathBuf {
        let p = std::env::temp_dir().join(format!("vantage_sched_{name}_{}", std::process::id()));
        let _ = fs::remove_dir_all(&p);
        fs::create_dir_all(&p).unwrap();
        p
    }
    fn dt(s: &str) -> NaiveDateTime { NaiveDateTime::parse_from_str(s, "%Y-%m-%d %H:%M").unwrap() }

    #[test]
    fn times_are_parsed_strictly() {
        assert_eq!(parse_time("07:00"), Some((7, 0)));
        assert_eq!(parse_time("23:59"), Some((23, 59)));
        for bad in ["", "7:00", "24:00", "07:60", "0700", "07:0", "ab:cd", "07:00:00"] { assert_eq!(parse_time(bad), None, "{bad}"); }
    }
    #[test]
    fn launchd_plist_starts_this_program_with_the_flag_and_the_time() {
        let x = plist_xml("/Applications/Vantage.app/Contents/MacOS/vantage-app", "/Users/a/Vantage/Helmi", 7, 5, "/tmp/log");
        assert!(x.contains("<string>/Applications/Vantage.app/Contents/MacOS/vantage-app</string>"));
        assert!(x.contains(&format!("<string>{FLAG}</string>")) && x.contains("<string>/Users/a/Vantage/Helmi</string>"));
        assert!(x.contains("<key>Hour</key><integer>7</integer><key>Minute</key><integer>5</integer>"));
        assert!(x.contains(&format!("<key>Label</key><string>{LABEL}</string>")));
    }
    #[cfg(target_os = "macos")]
    #[test]
    fn the_plist_is_accepted_by_macos() {
        let root = tmp("plutil");
        let f = root.join("t.plist");
        fs::write(&f, plist_xml("/A & B/app", "/Users/o'neil/<x>/Vantage", 7, 0, "/tmp/l")).unwrap();
        let o = Command::new("plutil").args(["-lint", &f.to_string_lossy()]).output().unwrap();
        assert!(o.status.success(), "{}", String::from_utf8_lossy(&o.stdout));
    }
    // Touches the real launchd of this Mac (label app.vantage.morning-report), so it only runs on request:
    //   cargo test -- --ignored the_daily_task_is_registered_and_removed_on_this_mac
    #[cfg(target_os = "macos")]
    #[test]
    #[ignore]
    fn the_daily_task_is_registered_and_removed_on_this_mac() {
        let root = tmp("reg");
        fs::create_dir_all(root.join("02_workflow")).unwrap();
        let r = root.to_string_lossy().to_string();
        assert!(!sched_status(r.clone()).registered);
        let on = sched_set(r.clone(), true, "07:30".into()).unwrap();
        assert!(on.registered && on.time == "07:30" && on.next > now_ts(), "{}", on.time);
        assert!(agents_dir().join(format!("{LABEL}.plist")).is_file() && loaded());
        let moved = sched_set(r.clone(), true, "08:15".into()).unwrap();
        assert_eq!(moved.time, "08:15", "changing the time replaces the task");
        assert!(sched_set(r.clone(), true, "25:00".into()).is_err(), "a bad time is refused");
        let off = sched_set(r.clone(), false, "08:15".into()).unwrap();
        assert!(!off.registered && !agents_dir().join(format!("{LABEL}.plist")).exists() && !loaded());
    }
    // The same on Windows: the real Task Scheduler of the machine (task name VantageMorningReport). CI runs it on a Windows runner:
    //   cargo test -- --ignored the_daily_task_is_registered_and_removed_on_windows
    #[cfg(windows)]
    #[test]
    #[ignore]
    fn the_daily_task_is_registered_and_removed_on_windows() {
        let root = tmp("regwin");
        fs::create_dir_all(root.join("02_workflow")).unwrap();
        let r = root.to_string_lossy().to_string();
        assert!(!sched_status(r.clone()).registered);
        let on = sched_set(r.clone(), true, "07:30".into()).expect("Task Scheduler accepts the task");
        assert!(on.registered && on.time == "07:30" && on.next > now_ts(), "registered={} time={}", on.registered, on.time);
        let q = run("schtasks", &["/Query", "/TN", TASK, "/XML"]).expect("the task can be queried");
        assert!(q.contains("--run-report") && q.contains("StartWhenAvailable"), "{q}");
        let moved = sched_set(r.clone(), true, "08:15".into()).unwrap();
        assert_eq!(moved.time, "08:15", "changing the time replaces the task");
        assert!(sched_set(r.clone(), true, "25:00".into()).is_err(), "a bad time is refused");
        let off = sched_set(r.clone(), false, "08:15".into()).unwrap();
        assert!(!off.registered && run("schtasks", &["/Query", "/TN", TASK]).is_err(), "the task is gone");
    }
    #[test]
    fn paths_with_special_characters_stay_valid_xml() {
        let x = plist_xml("/A & B/app", "/Users/o'neil/<x>", 7, 0, "/l");
        assert!(x.contains("/A &amp; B/app") && x.contains("o&apos;neil/&lt;x&gt;"));
        assert!(!x.contains("A & B"));
        let w = task_xml("C:\\Program Files\\Vantage\\v.exe", "C:\\Users\\a & b\\Vantage", 7, 0);
        assert!(w.contains("a &amp; b"));
    }
    #[test]
    fn the_plist_time_is_read_back_only_for_the_same_folder() {
        let x = plist_xml("/e", "/Users/a/V", 6, 45, "/l");
        assert_eq!(plist_time(&x, "/Users/a/V"), Some((6, 45)));
        assert_eq!(plist_time(&x, "/Users/b/V"), None);
        assert_eq!(plist_time("garbage", "/Users/a/V"), None);
    }
    #[test]
    fn windows_task_catches_up_after_the_pc_was_off() {
        let w = task_xml("C:\\v.exe", "C:\\Users\\a\\V", 7, 30);
        assert!(w.contains("<StartWhenAvailable>true</StartWhenAvailable>"));
        assert!(w.contains("T07:30:00") && w.contains(&format!("{FLAG} \"C:\\Users\\a\\V\"")));
    }
    #[test]
    fn next_run_is_today_before_the_time_and_tomorrow_after_it() {
        assert_eq!(next_run(dt("2026-11-09 06:00"), 7, 0), dt("2026-11-09 07:00"));
        assert_eq!(next_run(dt("2026-11-09 07:00"), 7, 0), dt("2026-11-10 07:00"));
        assert_eq!(next_run(dt("2026-11-09 23:59"), 7, 0), dt("2026-11-10 07:00"));
        assert_eq!(next_run(dt("2026-12-31 08:00"), 7, 0), dt("2027-01-01 07:00"));
    }
    #[test]
    fn the_command_line_flag_needs_a_folder() {
        let a = |v: &[&str]| v.iter().map(|s| s.to_string()).collect::<Vec<_>>();
        assert_eq!(run_report_arg(&a(&["app", "--run-report", "/x/y"])), Some("/x/y".into()));
        assert_eq!(run_report_arg(&a(&["app", "--run-report"])), None);
        assert_eq!(run_report_arg(&a(&["app", "--run-report", "--other"])), None);
        assert_eq!(run_report_arg(&a(&["app"])), None);
    }
    #[test]
    fn a_report_of_today_is_found_and_other_days_are_not() {
        let root = tmp("rep");
        let day = NaiveDate::from_ymd_opt(2026, 11, 9).unwrap();
        assert!(!report_exists_on(&root, day));
        let d = root.join("02_workflow/Laporan_Pagi/2026-11-09");
        fs::create_dir_all(&d).unwrap();
        fs::write(d.join("00_README.md"), "x").unwrap();
        assert!(!report_exists_on(&root, day), "a README alone is not a finished report");
        fs::write(d.join("2026-11-09_Laporan_Pagi.json"), "{}").unwrap();
        assert!(report_exists_on(&root, day));
        assert!(!report_exists_on(&root, NaiveDate::from_ymd_opt(2026, 11, 10).unwrap()));
    }
    #[test]
    fn keywords_are_required_before_a_run() {
        let root = tmp("kw");
        assert!(!keywords_set(&root));
        let s = settings_dir(&root);
        fs::create_dir_all(&s).unwrap();
        fs::write(s.join("search_settings.json"), r#"{"kata_kunci":[" "]}"#).unwrap();
        assert!(!keywords_set(&root));
        fs::write(s.join("search_settings.json"), r#"{"kata_kunci":["Werkstudent SAP"]}"#).unwrap();
        assert!(keywords_set(&root));
    }
    #[test]
    fn the_run_state_survives_and_defaults_to_nothing() {
        let root = tmp("state");
        assert_eq!(read_state(&root), RunState::default());
        let s = RunState { start: 10, end: 20, ok: false, error: "Claude Code is not logged in.".into() };
        write_state(&root, &s);
        assert_eq!(read_state(&root), s);
    }
    #[test]
    fn failures_get_a_plain_reason() {
        assert_eq!(friendly_error("Not logged in · Please run /login", Some(1)), "Claude Code is not logged in.");
        assert_eq!(friendly_error("Reached the maximum budget", Some(1)), "The search stopped at its cost limit.");
        assert_eq!(friendly_error("fetch failed ENOTFOUND", Some(1)), "No internet connection.");
        assert!(friendly_error("", Some(2)).contains("exit code 2"));
        assert!(friendly_error(&"x".repeat(500), None).len() <= 160);
    }
    #[test]
    fn the_scheduled_request_is_the_one_of_the_find_jobs_button() {
        // One wording for both: the button (ui/i18n.js) and the unattended run.
        assert!(include_str!("../../ui/i18n.js").contains(PROMPT), "ui/i18n.js `runreport` (en) must say the same as PROMPT in sched.rs");
    }
    #[test]
    fn a_run_that_is_still_working_is_never_taken_for_a_dead_one() {
        // Worst case: every attempt runs to its limit and waits before the next. The lock and the Windows time limit must outlast that.
        let worst = RUN_LIMIT * ATTEMPTS + RETRY_WAIT * (ATTEMPTS - 1);
        assert!(LOCK_STALE > worst, "lock goes stale after {:?} but a run can take {:?}", LOCK_STALE, worst);
        let w = task_xml("C:\\v.exe", "C:\\V", 7, 0);
        let hours: u64 = w.split("<ExecutionTimeLimit>PT").nth(1).and_then(|s| s.split('H').next()).and_then(|h| h.parse().ok()).expect("a limit in hours");
        assert!(Duration::from_secs(hours * 3600) > worst, "Windows would stop the task after {hours} h");
    }
    #[test]
    fn the_windows_task_names_its_principal() {
        // Actions Context="Author" refers to a principal with that id; the exported form of every Task Scheduler task has both.
        let w = task_xml("C:\\v.exe", "C:\\V", 7, 0);
        assert!(w.contains("<Principal id=\"Author\">") && w.contains("Context=\"Author\""));
        assert!(w.contains("<LogonType>InteractiveToken</LogonType>"));
    }
    #[test]
    fn the_unattended_note_keeps_the_chat_shell_rules() {
        assert!(NOTE.contains("only a single `python3") && NOTE.contains("never with a shell"));
    }
}
