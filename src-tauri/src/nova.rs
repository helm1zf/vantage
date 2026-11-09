// Nova chat (prototype): the Nova tab talks to the user's own, unmodified Claude Code, installed with
// Anthropic's official installer and signed in through Claude Code's own login. Vantage never sees or stores
// the account: it only starts `claude -p` in the Vantage folder and shows its streamed reply.
use serde::{Deserialize, Serialize};
use std::{
    collections::HashMap,
    io::{BufRead, BufReader, Read},
    path::{Path, PathBuf},
    process::{Child, Command, Stdio},
    sync::Mutex,
};
use tauri::{AppHandle, Emitter};

use crate::quiet;

// Where the chat is kept, inside the user's folder (so it moves with the folder, like the rest of Nova's memory).
const CHAT_DIR: &str = "01_user_documents/--usersettings/nova_chat";

// Running replies, one per thread, so Stop can end them.
static RUNS: Mutex<Option<HashMap<String, Child>>> = Mutex::new(None);

fn home() -> PathBuf {
    std::env::var_os(if cfg!(windows) { "USERPROFILE" } else { "HOME" }).map(PathBuf::from).unwrap_or_default()
}

// Apps started from Finder get a short PATH; add the places Claude Code, Homebrew and Python live.
fn path_env() -> String {
    let h = home();
    let mut v: Vec<String> = Vec::new();
    if !cfg!(windows) {
        v.extend([h.join(".local/bin").to_string_lossy().to_string(), "/opt/homebrew/bin".into(), "/usr/local/bin".into()]);
    } else {
        v.push(h.join(".local").join("bin").to_string_lossy().to_string());
    }
    if let Ok(p) = std::env::var("PATH") {
        v.push(p);
    }
    v.join(if cfg!(windows) { ";" } else { ":" })
}

pub(crate) fn find_claude() -> Option<PathBuf> {
    let h = home();
    let cands: Vec<PathBuf> = if cfg!(windows) {
        vec![h.join(".local").join("bin").join("claude.exe")]
    } else {
        vec![h.join(".local/bin/claude"), h.join(".claude/local/claude"), "/opt/homebrew/bin/claude".into(), "/usr/local/bin/claude".into()]
    };
    if let Some(p) = cands.into_iter().find(|p| p.is_file()) {
        return Some(p);
    }
    // Last resort: ask a login shell, which knows the user's own PATH.
    if cfg!(target_os = "macos") {
        let o = Command::new("/bin/zsh").args(["-lc", "command -v claude"]).output().ok()?;
        let p = PathBuf::from(String::from_utf8_lossy(&o.stdout).trim());
        if p.is_file() { return Some(p); }
    }
    None
}

fn claude_cmd(bin: &Path) -> Command {
    let mut c = Command::new(bin);
    c.env("PATH", path_env());
    // Always the user's own Claude login: no API keys or Claude settings leaking in from wherever Vantage was started.
    for (k, _) in std::env::vars_os() {
        let k = k.to_string_lossy();
        if k.starts_with("CLAUDE") || k.starts_with("ANTHROPIC_") { c.env_remove(k.as_ref()); }
    }
    quiet(&mut c);
    c
}

#[derive(Serialize)]
pub struct CliStatus { installed: bool, version: String, logged_in: bool, method: String, plan: String }

#[tauri::command]
pub async fn nova_status() -> CliStatus {
    tauri::async_runtime::spawn_blocking(|| {
        let Some(bin) = find_claude() else { return CliStatus { installed: false, version: String::new(), logged_in: false, method: String::new(), plan: String::new() } };
        let version = claude_cmd(&bin).arg("--version").output().map(|o| String::from_utf8_lossy(&o.stdout).trim().to_string()).unwrap_or_default();
        let auth: serde_json::Value = claude_cmd(&bin).args(["auth", "status"]).output().ok()
            .and_then(|o| serde_json::from_slice(&o.stdout).ok()).unwrap_or_default();
        CliStatus {
            installed: true,
            version,
            logged_in: auth["loggedIn"].as_bool().unwrap_or(false),
            method: auth["authMethod"].as_str().unwrap_or("").to_string(),
            plan: auth["subscriptionType"].as_str().unwrap_or("").to_string(),
        }
    }).await.unwrap_or(CliStatus { installed: false, version: String::new(), logged_in: false, method: String::new(), plan: String::new() })
}

// Anthropic's official installer, exactly as published in the Claude Code docs.
#[tauri::command]
pub async fn nova_install() -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(|| {
        let o = if cfg!(windows) {
            quiet(Command::new("powershell").args(["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", "irm https://claude.ai/install.ps1 | iex"])).output()
        } else {
            Command::new("/bin/bash").args(["-c", "curl -fsSL https://claude.ai/install.sh | bash"]).env("PATH", path_env()).output()
        }.map_err(|e| e.to_string())?;
        let out = format!("{}{}", String::from_utf8_lossy(&o.stdout), String::from_utf8_lossy(&o.stderr));
        if o.status.success() && find_claude().is_some() { Ok(out) } else { Err(if out.trim().is_empty() { "The installer did not finish.".into() } else { out }) }
    }).await.map_err(|e| e.to_string())?
}

// Claude Code's own sign-in (it opens the Claude login page in the browser). Its messages are forwarded as
// "nova-login" events so the page can show a link if the browser does not open by itself.
#[tauri::command]
pub fn nova_login(app: AppHandle) -> Result<(), String> {
    let bin = find_claude().ok_or("Claude Code is not installed yet.")?;
    let mut child = claude_cmd(&bin).args(["auth", "login", "--claudeai"])
        .stdin(Stdio::null()).stdout(Stdio::piped()).stderr(Stdio::piped())
        .spawn().map_err(|e| e.to_string())?;
    for pipe in [child.stdout.take().map(|p| Box::new(p) as Box<dyn Read + Send>), child.stderr.take().map(|p| Box::new(p) as Box<dyn Read + Send>)].into_iter().flatten() {
        let app = app.clone();
        std::thread::spawn(move || {
            for line in BufReader::new(pipe).lines().map_while(Result::ok) {
                let _ = app.emit_to("main", "nova-login", line);
            }
        });
    }
    std::thread::spawn(move || { let _ = child.wait(); });
    Ok(())
}

// Claude Code runs in the Vantage package folder (the one with CLAUDE.md and .claude/agents) when the user's
// folder sits inside one, otherwise in the user's folder itself.
pub(crate) fn work_dir(root: &Path) -> PathBuf {
    match root.parent() {
        Some(p) if p.join("CLAUDE.md").is_file() => p.to_path_buf(),
        _ => root.to_path_buf(),
    }
}

// What the agents may do without asking. Inside the Vantage folder everything they need is free: Claude Code reads there by itself and
// acceptEdits lets them write there. The file tools are NOT listed by their bare name, because a bare name means "anywhere on this
// computer" (tested: with it an agent read and wrote files outside the folder). Outside the folder a request is refused automatically
// and reported, and the user is told to put the file in the Inbox. Python only runs the kit's own scripts, never code typed into the
// command line (`python -c`) or scripts from elsewhere. Written once here; src-tauri/src/nova.rs tests keep it that way.
const ALLOWED: &[&str] = &[
    "Task", "Agent", "TodoWrite", "WebSearch", "WebFetch", "Bash(ls *)", "Bash(mkdir *)",
    "Bash(python3 ./--settings/scripts/*)", "Bash(python3 --settings/scripts/*)", "Bash(python ./--settings/scripts/*)", "Bash(python --settings/scripts/*)",
    "Bash(python3 ./02_workflow/03_Tracker/build_tracker.py*)", "Bash(python3 02_workflow/03_Tracker/build_tracker.py*)",
    "Bash(python ./02_workflow/03_Tracker/build_tracker.py*)", "Bash(python 02_workflow/03_Tracker/build_tracker.py*)",
];
// Never, even inside the folder: deleting (it goes through the app's own Trash, which can be undone) and changing the scripts
// that the allowed python calls run (otherwise an agent could write its own "kit script" and run it).
const DENIED: &[&str] = &["Bash(rm *)", "Bash(rmdir *)", "Edit(./--settings/scripts/**)", "Write(./--settings/scripts/**)"];

// Commands the user approved in a chat card ("Allow once / Always allow"), passed on as exact `Bash(<command>)` rules.
// Only single shell commands; anything that deletes, formats or needs admin rights is never allowed this way
// (deleting goes through the app's own Trash).
const NEVER_ALLOW: &[&str] = &["rm", "rmdir", "del", "erase", "rd", "format", "sudo", "su", "dd", "mkfs", "shutdown", "reboot", "diskpart", "chmod", "chown", "reg", "sc", "net", "powershell", "pwsh", "cmd"];
fn extra_rule_ok(p: &str) -> bool {
    let Some(inner) = p.strip_prefix("Bash(").and_then(|x| x.strip_suffix(')')) else { return false };
    let inner = inner.trim();
    if inner.is_empty() || inner.len() > 300 || inner.contains('\n') || inner.contains('\r') || inner.contains('\0') { return false; }
    // One plain command: no chaining, pipes, redirects or substitution (a rule for `ls` must not also run `rm`).
    if ["&&", "||", ";", "|", ">", "<", "`", "$(", "&"].iter().any(|op| inner.contains(op)) { return false; }
    let words: Vec<String> = inner.split_whitespace().map(|w| w.to_lowercase()).collect();
    let first = words.first().cloned().unwrap_or_default();
    let first = first.rsplit(['/', '\\']).next().unwrap_or("").trim_end_matches(".exe").to_string();
    if NEVER_ALLOW.contains(&first.as_str()) { return false; }
    // Code typed into the command line is never approved.
    !(first.starts_with("python") && words.iter().skip(1).any(|w| w == "-c"))
}

// The one place that decides how Vantage starts Claude Code, for chat replies and for the scheduled Morning Report.
pub(crate) fn cli_command(bin: &Path, work: &Path, note: &str, model: &str, extra_allowed: &[String]) -> Command {
    let mut cmd = claude_cmd(bin);
    cmd.current_dir(work)
        .args(["-p", "--output-format", "stream-json", "--verbose", "--include-partial-messages"])
        .args(["--permission-mode", "acceptEdits", "--permission-prompts", "none", "--append-system-prompt", note])
        // No MCP connectors from the user's own Claude setup (Gmail, Canva, …): Vantage does not use them, and their
        // tool lists alone add tens of thousands of tokens to every session.
        .arg("--strict-mcp-config")
        // Only the tools Vantage uses, and none of the user's own plugins and skills: together they halve what every
        // step of a reply has to carry (about 33k to 15k tokens measured).
        .arg("--tools").args(TOOLS)
        .args(["--setting-sources", "project,local"])
        .args(["--model", model])
        .arg("--allowedTools").args(ALLOWED)
        .args(extra_allowed.iter().filter(|p| extra_rule_ok(p)).take(40))
        .arg("--disallowedTools").args(DENIED);
    cmd
}

// `vantage-app --print-cli-args`: the exact arguments the app gives Claude Code, as JSON. tools/permission_probe.py runs the real CLI with them,
// so the permission check never drifts from what the app really does.
pub fn print_cli_args() {
    let c = cli_command(Path::new("claude"), Path::new("."), "note", "haiku", &[]);
    let args: Vec<String> = c.get_args().map(|a| a.to_string_lossy().to_string()).collect();
    println!("{}", serde_json::to_string(&args).unwrap_or_default());
}

// One reply in one chat. `agent` runs the session as that Vantage agent (Raka, Laras); empty = Nova. `context` comes
// from the page: the chat's own rules and, for the first message of a fresh session, the end of the earlier conversation.
const TOOLS: &[&str] = &["Read", "Write", "Edit", "Glob", "Grep", "Task", "Bash", "WebSearch", "WebFetch", "TodoWrite"];

#[tauri::command]
#[allow(clippy::too_many_arguments)] // the page passes each setting separately
pub fn nova_send(app: AppHandle, root: String, thread: String, session: String, context: String, text: String, agent: String, model: String, preload: bool, effort: String, budget: f64, extra_allowed: Vec<String>) -> Result<(), String> {
    let bin = find_claude().ok_or("Claude Code is not installed yet.")?;
    if !chat_ok(&thread) || !(agent.is_empty() || chat_ok(&agent)) || !chat_ok(&model) { return Err("Unknown chat.".into()); }
    let root = PathBuf::from(root);
    if !root.is_dir() { return Err("The Vantage folder was not found.".into()); }
    let mut guard = RUNS.lock().unwrap();
    let runs = guard.get_or_insert_with(HashMap::new);
    if runs.contains_key(&thread) { return Err("Still answering in this chat.".into()); }
    let user = root.file_name().map(|n| n.to_string_lossy().to_string()).unwrap_or_default();
    let mut note = format!(
        "You are talking to the user in a chat inside the Vantage desktop app (not claude.ai). The app has four chats in a corner dock, like a messenger, plus the user's own chats with Nova: \
Nova (manager / assistant), Raka (profile), the Lamaran group (job search and applications) and Laras (interview practice). The user's \
personal Vantage folder is \"{user}\". This chat is saved day by day in {user}/{CHAT_DIR}/{thread}/YYYY-MM-DD.jsonl; read older days there \
when the user refers to something you do not see. Keep status.md up to date as the SOPs say, because later sessions rely on it. Keep chat \
replies short (two or three sentences, six at most when it matters): results are files, so name the file instead of repeating its content. There are no permission cards here: if a tool is \
refused, tell the user in plain words what you could not do. Shell: only a single `python3 ./--settings/scripts/<name>.py ...` call (a kit script, by that path; no `cd`, no `&&`, no pipes or redirects), `ls ...` and `mkdir ...` are allowed, anything else is refused. Files outside the Vantage folder cannot be read or written: if the user points to one, ask them to drop it into the Inbox. \
Read and search with the Read, Grep and Glob tools and change files with Edit or Write, never with a shell. Never write your own scripts or conversion tools, never type code into the command line (no python -c, no here-documents) and never use Word, COM, LibreOffice or any other program to convert or check files: use only the kit scripts. If a check cannot be done with them (for example a PDF cannot be opened), say so in one sentence and continue; do not look for another way. The user's facts live in ONE file, 01_user_documents/raw_facts_about_you.md: \
when asked to check or change raw facts, open and edit that file, not the about-item files or the project folders in materials/."
    );
    if !context.trim().is_empty() {
        note.push_str("\n\n");
        note.push_str(&context);
    }
    // A fresh session gets the files every conversation starts with already in its instructions, so it does not
    // spend a round trip (which re-sends the whole conversation) reading them. The opening flow is for claude.ai only.
    if preload {
        note.push_str("\n\nThe two files every conversation starts with are below; do not read them again in this session unless they may have changed.");
        for (label, p) in [("status.md", root.join("01_user_documents/--usersettings/status.md")), ("the user's CLAUDE.md", root.join("CLAUDE.md"))] {
            if let Ok(t) = std::fs::read_to_string(&p) {
                note.push_str(&format!("\n\n----- {label} ({}) -----\n{t}", p.display()));
            }
        }
    }
    let work = work_dir(&root);
    crate::ensure_agents(&work, &root);
    let mut cmd = cli_command(&bin, &work, &note, &model, &extra_allowed);
    if !agent.is_empty() {
        cmd.args(["--agent", &agent]);
    }
    // How hard the model thinks (thinking is billed as output): low for plain conversation, default for real work.
    if chat_ok(&effort) {
        cmd.args(["--effort", &effort]);
    }
    // Emergency brake: a reply that would cost more than this stops instead of draining the user's plan.
    if budget > 0.0 {
        cmd.args(["--max-budget-usd", &format!("{budget:.2}")]);
    }
    if !session.is_empty() {
        cmd.args(["--resume", &session]);
    }
    // The message goes in on stdin, so nothing the user types can be read as a command-line option.
    let mut child = cmd.stdin(Stdio::piped()).stdout(Stdio::piped()).stderr(Stdio::piped()).spawn().map_err(|e| e.to_string())?;
    if let Some(mut stdin) = child.stdin.take() {
        use std::io::Write;
        stdin.write_all(text.as_bytes()).map_err(|e| e.to_string())?;
    }
    let out = child.stdout.take().ok_or("No output from Claude Code.")?;
    let mut err = child.stderr.take().ok_or("No output from Claude Code.")?;
    runs.insert(thread.clone(), child);
    std::thread::spawn(move || {
        let errs = std::thread::spawn(move || { let mut s = String::new(); let _ = err.read_to_string(&mut s); s });
        for line in BufReader::new(out).lines().map_while(Result::ok) {
            if let Ok(ev) = serde_json::from_str::<serde_json::Value>(&line) {
                let _ = app.emit_to("main", "nova-event", serde_json::json!({"thread": thread, "ev": ev}));
            }
        }
        let child = RUNS.lock().unwrap().as_mut().and_then(|m| m.remove(&thread));
        let code = child.and_then(|mut c| c.wait().ok()).and_then(|s| s.code());
        let stderr = errs.join().unwrap_or_default();
        let _ = app.emit_to("main", "nova-done", serde_json::json!({"thread": thread, "code": code, "stderr": stderr.trim()}));
    });
    Ok(())
}

// Whether a reply is still running in this chat (the page asks when its own record of it was lost).
#[tauri::command]
pub fn nova_busy(thread: String) -> bool {
    RUNS.lock().unwrap().as_ref().map(|m| m.contains_key(&thread)).unwrap_or(false)
}

#[tauri::command]
pub fn nova_stop(thread: String) -> Result<(), String> {
    if let Some(c) = RUNS.lock().unwrap().as_mut().and_then(|m| m.get_mut(&thread)) {
        c.kill().map_err(|e| e.to_string())?;
    }
    Ok(())
}

// Chat ids, agent names and model aliases: short lowercase words only (they end up in paths and arguments).
fn chat_ok(s: &str) -> bool {
    !s.is_empty() && s.len() <= 20 && s.chars().all(|c| c.is_ascii_lowercase() || c.is_ascii_digit() || c == '-')
}

// Tauri command: run one of the kit's own scripts (by name, from <user>/--settings/scripts) and return its stdout.
// Only plain file names are accepted, so the page cannot run anything else. Add to nova.rs and to generate_handler!.
#[tauri::command]
pub async fn run_kit_script(root: String, script: String, args: Vec<String>) -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(move || {
        if script.is_empty() || !script.ends_with(".py") || script.contains('/') || script.contains('\\') || script.contains("..") {
            return Err("Unknown script.".to_string());
        }
        let path = PathBuf::from(&root).join("--settings").join("scripts").join(&script);
        if !path.is_file() { return Err("This script is not part of your Vantage files yet. Update Vantage first.".to_string()); }
        let py = if cfg!(windows) { "python" } else { "python3" };
        let mut c = std::process::Command::new(py);
        crate::quiet(&mut c);
        let out = c.arg(&path).args(args.iter().take(4)).arg(&root).output().map_err(|e| if e.kind() == std::io::ErrorKind::NotFound { "Python is not installed or not found. Open Profile > System check to fix it.".to_string() } else { e.to_string() })?;
        if !out.status.success() && out.stdout.is_empty() {
            let msg = String::from_utf8_lossy(&out.stderr).trim().chars().take(400).collect::<String>();
            return Err(if msg.is_empty() { "The script stopped without a message.".to_string() } else { msg });
        }
        if out.stdout.len() > 200_000 { return Err("Too much output.".to_string()); }
        Ok(String::from_utf8_lossy(&out.stdout).to_string())
    }).await.map_err(|e| e.to_string())?
}

// Writes an exported chat to the file the user chose in the system "Save as" window (JSON only, bounded size).
#[tauri::command]
pub fn save_text(path: String, text: String) -> Result<(), String> {
    let p = PathBuf::from(&path);
    if p.extension().and_then(|e| e.to_str()).map(|e| e.eq_ignore_ascii_case("json")) != Some(true) { return Err("Only .json files can be saved here.".into()); }
    if text.len() > 50_000_000 { return Err("The file is too large.".into()); }
    std::fs::write(&p, text).map_err(|e| e.to_string())
}

// The chat log: one JSON line per message, one file per day, one folder per chat.
fn day_ok(day: &str) -> bool {
    day.len() == 10 && day.chars().enumerate().all(|(i, c)| if i == 4 || i == 7 { c == '-' } else { c.is_ascii_digit() })
}

#[tauri::command]
pub fn nova_chat_append(root: String, chat: String, day: String, msg: serde_json::Value) -> Result<(), String> {
    use std::io::Write;
    if !day_ok(&day) || !chat_ok(&chat) { return Err("Bad day.".into()); }
    let dir = PathBuf::from(root).join(CHAT_DIR).join(chat);
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let mut f = std::fs::OpenOptions::new().create(true).append(true).open(dir.join(format!("{day}.jsonl"))).map_err(|e| e.to_string())?;
    writeln!(f, "{}", serde_json::to_string(&msg).map_err(|e| e.to_string())?).map_err(|e| e.to_string())
}

// The last `limit` messages, oldest first, from the newest day files.
#[tauri::command]
pub fn nova_chat_load(root: String, chat: String, limit: usize) -> Vec<serde_json::Value> {
    if !chat_ok(&chat) { return Vec::new(); }
    let dir = PathBuf::from(root).join(CHAT_DIR).join(chat);
    let mut days: Vec<PathBuf> = std::fs::read_dir(&dir).map(|rd| rd.flatten().map(|e| e.path())
        .filter(|p| p.extension().map(|x| x == "jsonl").unwrap_or(false) && p.file_stem().map(|s| day_ok(&s.to_string_lossy())).unwrap_or(false)).collect())
        .unwrap_or_default();
    days.sort();
    let mut out: Vec<serde_json::Value> = Vec::new();
    for p in days.iter().rev() {
        let mut msgs: Vec<serde_json::Value> = std::fs::read_to_string(p).unwrap_or_default().lines()
            .filter_map(|l| serde_json::from_str(l).ok()).collect();
        msgs.append(&mut out);
        out = msgs;
        if out.len() >= limit { break; }
    }
    let n = out.len().saturating_sub(limit);
    out.split_off(n)
}

// Small talk ("oke", "bentar gua kirim") gets a short Haiku answer instead of waking a full working session.
// Haiku also decides: it answers exactly WORK when the message needs real work, and the page then starts the
// working session. No tools, no folder access, nothing saved by Claude Code; runs in an empty folder.
#[tauri::command]
pub async fn nova_quick(prompt: String, system: String) -> Result<serde_json::Value, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let bin = find_claude().ok_or("Claude Code is not installed yet.")?;
        let dir = std::env::temp_dir().join("vantage-quick");
        std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
        let mut child = claude_cmd(&bin).current_dir(&dir)
            .args(["-p", "--model", "haiku", "--output-format", "stream-json", "--verbose", "--no-session-persistence", "--tools", "", "--strict-mcp-config", "--max-budget-usd", "0.05", "--system-prompt", &system])
            .stdin(Stdio::piped()).stdout(Stdio::piped()).stderr(Stdio::piped())
            .spawn().map_err(|e| e.to_string())?;
        if let Some(mut stdin) = child.stdin.take() {
            use std::io::Write;
            stdin.write_all(prompt.as_bytes()).map_err(|e| e.to_string())?;
        }
        let o = child.wait_with_output().map_err(|e| e.to_string())?;
        // The result line, plus the plan usage (5-hour and weekly limits) Claude Code reports along the way.
        let mut v = serde_json::Value::Null;
        let mut limits = serde_json::Value::Null;
        for line in String::from_utf8_lossy(&o.stdout).lines() {
            let Ok(ev) = serde_json::from_str::<serde_json::Value>(line) else { continue };
            match ev["type"].as_str() {
                Some("result") => v = ev,
                Some("rate_limit_event") => limits = ev["rate_limit_info"].clone(),
                _ => {}
            }
        }
        if v.is_null() { return Err(String::from_utf8_lossy(&o.stderr).trim().to_string()); }
        if v["is_error"].as_bool().unwrap_or(false) { return Err(v["result"].as_str().unwrap_or("error").to_string()); }
        v["rate_limit_info"] = limits;
        // The whole result: the answer plus usage and cost, which the page shows under the reply.
        Ok(v)
    }).await.map_err(|e| e.to_string())?
}

// Tidying the Inbox: Raka decides where each file goes and writes the plan; the app checks and carries it out, so
// Claude never moves files itself. Plan: {"items": [{"from": "<path inside the Inbox>", "to": "01_user_documents/…",
// "action": "move" | "trash"}]}. Destinations must stay inside 01_user_documents and never replace an existing file.
pub const INBOX_PLAN: &str = "01_user_documents/--usersettings/inbox_plan.json";

// What a tidy-up did. `duplicates` are Inbox files whose content was already at the destination (they went to the Trash).
#[derive(Serialize, Deserialize, Default, Clone)]
pub struct Tidy { moved: Vec<(String, String)>, trashed: Vec<String>, skipped: Vec<(String, String)>, #[serde(default)] duplicates: Vec<(String, String)> }
#[derive(Serialize, Default)]
pub struct Undo { restored: Vec<(String, String)>, skipped: Vec<(String, String)> }
const INBOX_LAST: &str = "01_user_documents/--usersettings/inbox_last.json";

// Where a tidy-up may put things (never anywhere else, never over an existing file): the materials, the Master CV, the reference
// CVs, the experience notes, the study plans, the two main text files, and loose morning reports.
const TIDY_DIRS: &[&str] = &["01_user_documents/materials", "01_user_documents/Master_CV", "01_user_documents/00_other_cv_as_role_model",
    "01_user_documents/your_recalling_journey", "01_user_documents/recommended_skill_for_you", "02_workflow/Laporan_Pagi"];
const TIDY_FILES: &[&str] = &["01_user_documents/raw_facts_about_you.md", "01_user_documents/interview_stories.md"];
fn tidy_target_ok(root: &Path, dst: &Path) -> bool {
    let Ok(rel) = dst.strip_prefix(root) else { return false };
    let r = rel.to_string_lossy().replace('\\', "/");
    TIDY_FILES.contains(&r.as_str()) || TIDY_DIRS.iter().any(|d| r == *d || r.starts_with(&format!("{d}/")))
}
// Plain words for the errors people meet on Windows (5 = access denied, 32/33 = file in use) and elsewhere.
fn friendly_io(e: &std::io::Error) -> String {
    match e.raw_os_error() {
        Some(5) | Some(32) | Some(33) | Some(13) => "another program is using it (Explorer, Word, a PDF reader...): close it and press Tidy up again".into(),
        Some(3) | Some(2) => "it was moved or renamed while the tidy-up ran".into(),
        _ => e.to_string(),
    }
}
// A name for something that would land on an existing one: "report.pdf" -> "report_from_inbox.pdf" (-> "_from_inbox_2" ...). Nothing is overwritten.
fn kept_both_name(dst: &Path) -> PathBuf {
    let dir = dst.parent().map(Path::to_path_buf).unwrap_or_default();
    let name = dst.file_name().map(|s| s.to_string_lossy().to_string()).unwrap_or_default();
    let (stem, ext) = match (dst.is_dir(), name.rfind('.')) { (false, Some(i)) if i > 0 => (name[..i].to_string(), name[i..].to_string()), _ => (name.clone(), String::new()) };
    let mut n = 1;
    loop {
        let cand = dir.join(if n == 1 { format!("{stem}_from_inbox{ext}") } else { format!("{stem}_from_inbox_{n}{ext}") });
        if !cand.exists() { return cand; }
        n += 1;
    }
}
fn copy_tree(src: &Path, dst: &Path) -> std::io::Result<()> {
    if src.is_dir() {
        std::fs::create_dir_all(dst)?;
        for e in std::fs::read_dir(src)? { let e = e?; copy_tree(&e.path(), &dst.join(e.file_name()))?; }
        Ok(())
    } else { std::fs::copy(src, dst).map(|_| ()) }
}
// Rename; when that is refused (another drive, a locked file) copy and then remove the original. If part of the original cannot be
// removed the copy stays and the user is told, so nothing is ever lost and nothing is half moved without a word.
fn move_path(src: &Path, dst: &Path) -> Result<Option<String>, String> {
    if std::fs::rename(src, dst).is_ok() { return Ok(None); }
    copy_tree(src, dst).map_err(|e| { let _ = if dst.is_dir() { std::fs::remove_dir_all(dst) } else { std::fs::remove_file(dst) }; friendly_io(&e) })?;
    let gone = if src.is_dir() { std::fs::remove_dir_all(src) } else { std::fs::remove_file(src) };
    match gone { Ok(()) => Ok(None), Err(e) => Ok(Some(format!("copied, but the original is still in the Inbox ({}): delete it by hand", friendly_io(&e)))) }
}

// Two files with exactly the same bytes (sizes first, then the content in chunks).
fn same_file(a: &Path, b: &Path) -> bool {
    use std::io::Read;
    let (Ok(ma), Ok(mb)) = (std::fs::metadata(a), std::fs::metadata(b)) else { return false };
    if !ma.is_file() || !mb.is_file() || ma.len() != mb.len() { return false; }
    let (Ok(mut fa), Ok(mut fb)) = (std::fs::File::open(a), std::fs::File::open(b)) else { return false };
    let (mut ba, mut bb) = (vec![0u8; 65536], vec![0u8; 65536]);
    loop {
        let (Ok(na), Ok(nb)) = (fa.read(&mut ba), fb.read(&mut bb)) else { return false };
        if na != nb || ba[..na] != bb[..nb] { return false; }
        if na == 0 { return true; }
    }
}

pub fn apply_plan(root: &Path, plan: &serde_json::Value) -> Tidy { apply_plan_with(root, plan, &crate::to_trash) }

pub fn apply_plan_with(root: &Path, plan: &serde_json::Value, trash: &dyn Fn(&Path) -> Result<(), String>) -> Tidy {
    let inbox = root.join(crate::INBOX);
    let clean = |rel: &str| !rel.is_empty() && !Path::new(rel).is_absolute() && !rel.split(['/', '\\']).any(|c| c == "..");
    let mut out = Tidy::default();
    for it in plan["items"].as_array().cloned().unwrap_or_default() {
        let from = it["from"].as_str().unwrap_or("").trim().trim_start_matches(&format!("{}/", crate::INBOX)).to_string();
        let to = it["to"].as_str().unwrap_or("").trim().replace('\\', "/");
        let src = inbox.join(&from);
        if !clean(&from) || !src.exists() { out.skipped.push((from, "not in the Inbox".into())); continue; }
        if it["action"].as_str() == Some("trash") {
            match trash(&src) { Ok(()) => out.trashed.push(from), Err(e) => out.skipped.push((from, e)) }
            continue;
        }
        let mut dst = root.join(&to);
        if !clean(&to) || !tidy_target_ok(root, &dst) { out.skipped.push((from, "that place is not one a tidy-up may use (materials, Master CV, reference CVs, notes, plans, raw facts)".into())); continue; }
        let mut to = to;
        if dst.exists() && same_file(&src, &dst) {
            // The very same file is already in place: there is no second copy to keep. The Inbox copy goes to the Trash.
            match trash(&src) { Ok(()) => out.duplicates.push((from, to)), Err(e) => out.skipped.push((from, e)) }
            continue;
        }
        if dst.exists() {
            // Already there (typically an older copy of raw facts or a CV): keep both, the user or Raka compares them afterwards.
            dst = kept_both_name(&dst);
            to = dst.strip_prefix(root).map(|r| r.to_string_lossy().replace('\\', "/")).unwrap_or(to);
        }
        if let Some(d) = dst.parent() { let _ = std::fs::create_dir_all(d); }
        match move_path(&src, &dst) {
            Ok(None) => out.moved.push((from, to)),
            Ok(Some(note)) => out.skipped.push((from, note)),
            Err(e) => out.skipped.push((from, e)),
        }
    }
    out
}

// The last tidy-up is kept so it can be undone from the Inbox page (moves only: the Trash has its own way back).
fn save_last(root: &Path, t: &Tidy) {
    if t.moved.is_empty() && t.trashed.is_empty() && t.duplicates.is_empty() { return; }
    if let Ok(j) = serde_json::to_string_pretty(t) { let _ = std::fs::create_dir_all(root.join(INBOX_LAST).parent().unwrap()); let _ = std::fs::write(root.join(INBOX_LAST), j); }
}
fn load_last(root: &Path) -> Option<Tidy> {
    serde_json::from_str(&std::fs::read_to_string(root.join(INBOX_LAST)).ok()?).ok()
}
// Puts every moved item back into the Inbox. Never overwrites: a taken name gets "_restored". Done once.
fn undo_last(root: &Path) -> Undo {
    let mut u = Undo::default();
    let Some(t) = load_last(root) else { return u };
    let inbox = root.join(crate::INBOX);
    let clean = |rel: &str| !rel.is_empty() && !Path::new(rel).is_absolute() && !rel.split(['/', '\\']).any(|c| c == "..");
    for (from, to) in t.moved {
        let placed = root.join(&to);
        if !clean(&from) || !clean(&to) || !tidy_target_ok(root, &placed) { u.skipped.push((to, "not a place Vantage moved it to".into())); continue; }
        if !placed.exists() { u.skipped.push((to, "it is no longer there".into())); continue; }
        let mut back = inbox.join(&from);
        if back.exists() {
            let name = back.file_name().map(|n| n.to_string_lossy().to_string()).unwrap_or_default();
            let (stem, ext) = match (placed.is_dir(), name.rfind('.')) { (false, Some(i)) if i > 0 => (name[..i].to_string(), name[i..].to_string()), _ => (name.clone(), String::new()) };
            let mut n = 1;
            loop { let c = back.with_file_name(if n == 1 { format!("{stem}_restored{ext}") } else { format!("{stem}_restored_{n}{ext}") }); if !c.exists() { back = c; break; } n += 1; }
        }
        if let Some(d) = back.parent() { let _ = std::fs::create_dir_all(d); }
        match move_path(&placed, &back) {
            Ok(_) => u.restored.push((to, back.strip_prefix(&inbox).map(|r| r.to_string_lossy().replace('\\', "/")).unwrap_or(from))),
            Err(e) => u.skipped.push((to, e)),
        }
    }
    let _ = std::fs::remove_file(root.join(INBOX_LAST));
    u
}

#[tauri::command]
pub async fn nova_inbox_last(root: String) -> Option<Tidy> { load_last(Path::new(&root)) }

#[tauri::command]
pub async fn nova_inbox_undo(root: String) -> Result<Undo, String> {
    tauri::async_runtime::spawn_blocking(move || undo_last(Path::new(&root))).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn nova_inbox_apply(root: String) -> Result<Tidy, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let root = PathBuf::from(root);
        let plan_path = root.join(INBOX_PLAN);
        let plan: serde_json::Value = serde_json::from_str(&std::fs::read_to_string(&plan_path).map_err(|_| "Raka did not write a plan.".to_string())?)
            .map_err(|e| format!("The plan could not be read: {e}"))?;
        let out = apply_plan(&root, &plan);
        save_last(&root, &out);
        // Done once: keep the plan as a record, but never carry it out twice.
        let _ = std::fs::rename(&plan_path, plan_path.with_extension("applied.json"));
        Ok(out)
    }).await.map_err(|e| e.to_string())?
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    fn scratch(name: &str) -> PathBuf {
        let d = std::env::temp_dir().join(format!("vantage_test_{name}_{}", std::process::id()));
        let _ = fs::remove_dir_all(&d);
        fs::create_dir_all(&d).unwrap();
        d
    }
    fn user_folder(name: &str) -> PathBuf {
        let root = scratch(name);
        for d in ["--- I N B O X ---", "01_user_documents/materials", "02_workflow/Laporan_Pagi"] {
            fs::create_dir_all(root.join(d)).unwrap();
        }
        root
    }

    #[test]
    fn approval_rules_refuse_destructive_commands() {
        assert!(extra_rule_ok("Bash(python3 ./--settings/scripts/doctor.py)"));
        assert!(extra_rule_ok("Bash(cd ./Master_CV)"));
        for bad in ["Bash(rm -rf x)", "Bash(sudo ls)", "Bash(C:\\Windows\\System32\\cmd.exe /c dir)", "Bash(powershell -c x)", "Bash()", "python3 x"] {
            assert!(!extra_rule_ok(bad), "{bad}");
        }
        assert!(!extra_rule_ok(&format!("Bash({})", "x".repeat(301))));
        assert!(!extra_rule_ok("Bash(ls\nrm x)"));
    }

    #[test]
    fn a_name_that_exists_is_never_overwritten() {
        let d = scratch("kept");
        let f = d.join("raw_facts_about_you.md");
        fs::write(&f, "a").unwrap();
        assert_eq!(kept_both_name(&f), d.join("raw_facts_about_you_from_inbox.md"));
        fs::write(d.join("raw_facts_about_you_from_inbox.md"), "b").unwrap();
        assert_eq!(kept_both_name(&f), d.join("raw_facts_about_you_from_inbox_2.md"));
    }

    #[test]
    fn tidy_moves_only_where_allowed_and_keeps_both_on_a_clash() {
        let root = user_folder("tidy");
        let inbox = root.join("--- I N B O X ---");
        fs::create_dir_all(inbox.join("EDU-01/sub")).unwrap();
        fs::write(inbox.join("EDU-01/sub/t.pdf"), "x").unwrap();
        fs::write(inbox.join("raw_facts_about_you.md"), "new").unwrap();
        fs::write(inbox.join("evil.txt"), "x").unwrap();
        fs::write(root.join("01_user_documents/raw_facts_about_you.md"), "old").unwrap();
        let plan = serde_json::json!({"items": [
            {"from": "EDU-01", "to": "01_user_documents/materials/education/EDU-01", "action": "move"},
            {"from": "raw_facts_about_you.md", "to": "01_user_documents/raw_facts_about_you.md", "action": "move"},
            {"from": "evil.txt", "to": "02_workflow/01_Pipeline/evil.txt", "action": "move"},
            {"from": "missing.txt", "to": "01_user_documents/materials/m.txt", "action": "move"},
            {"from": "../escape.txt", "to": "01_user_documents/materials/e.txt", "action": "move"},
        ]});
        let out = apply_plan(&root, &plan);
        assert_eq!(out.moved.len(), 2, "{:?}", out.skipped);
        assert!(root.join("01_user_documents/materials/education/EDU-01/sub/t.pdf").is_file());
        assert_eq!(fs::read_to_string(root.join("01_user_documents/raw_facts_about_you.md")).unwrap(), "old");
        assert_eq!(fs::read_to_string(root.join("01_user_documents/raw_facts_about_you_from_inbox.md")).unwrap(), "new");
        assert!(inbox.join("evil.txt").is_file(), "a destination outside the allowed places is refused");
        assert_eq!(out.skipped.len(), 3);
    }

    // A fake Trash for tests: moves the file into a folder instead of the user's real Trash.
    fn fake_trash(dir: &Path) -> impl Fn(&Path) -> Result<(), String> + '_ {
        move |p: &Path| { fs::create_dir_all(dir).map_err(|e| e.to_string())?; fs::rename(p, dir.join(p.file_name().unwrap())).map_err(|e| e.to_string()) }
    }

    #[test]
    fn a_file_that_is_already_there_is_not_kept_twice() {
        let root = user_folder("dup");
        let inbox = root.join("--- I N B O X ---");
        let tr = scratch("dup_trash");
        fs::create_dir_all(root.join("01_user_documents/materials/education/EDU1_UniX")).unwrap();
        fs::write(root.join("01_user_documents/materials/education/EDU1_UniX/EDU1_transkrip.txt"), "same text").unwrap();
        fs::write(inbox.join("transkrip.txt"), "same text").unwrap();
        fs::write(inbox.join("transkrip2.txt"), "other text").unwrap();
        let plan = serde_json::json!({"items": [
            {"from": "transkrip.txt", "to": "01_user_documents/materials/education/EDU1_UniX/EDU1_transkrip.txt", "action": "move"},
            {"from": "transkrip2.txt", "to": "01_user_documents/materials/education/EDU1_UniX/EDU1_transkrip.txt", "action": "move"},
        ]});
        let out = apply_plan_with(&root, &plan, &fake_trash(&tr));
        assert_eq!(out.duplicates.len(), 1, "identical content is a duplicate: {:?}", out.skipped);
        assert!(!inbox.join("transkrip.txt").exists() && tr.join("transkrip.txt").is_file(), "the duplicate goes to the Trash, not deleted for good");
        assert_eq!(out.moved.len(), 1, "a different file with the same destination is kept, under a new name");
        assert!(root.join("01_user_documents/materials/education/EDU1_UniX/EDU1_transkrip_from_inbox.txt").is_file());
    }

    #[test]
    fn a_tidy_up_can_be_undone_and_never_overwrites() {
        let root = user_folder("undo");
        let inbox = root.join("--- I N B O X ---");
        let tr = scratch("undo_trash");
        fs::create_dir_all(inbox.join("EDU1")).unwrap();
        fs::write(inbox.join("EDU1/t.pdf"), "x").unwrap();
        fs::write(inbox.join("cv.docx"), "c").unwrap();
        let plan = serde_json::json!({"items": [
            {"from": "EDU1", "to": "01_user_documents/materials/education/EDU1_UniX", "action": "move"},
            {"from": "cv.docx", "to": "01_user_documents/materials/00_Original_CV.docx", "action": "move"},
        ]});
        let out = apply_plan_with(&root, &plan, &fake_trash(&tr));
        assert_eq!(out.moved.len(), 2);
        save_last(&root, &out);
        assert_eq!(load_last(&root).unwrap().moved.len(), 2, "the last tidy-up is remembered");
        // Someone put a new file where the first one used to be: undo must not overwrite it.
        fs::write(inbox.join("cv.docx"), "new one").unwrap();
        let u = undo_last(&root);
        assert_eq!(u.restored.len(), 2, "{:?}", u.skipped);
        assert_eq!(fs::read_to_string(inbox.join("cv.docx")).unwrap(), "new one", "nothing in the Inbox is overwritten");
        assert!(inbox.join("EDU1/t.pdf").is_file() && !root.join("01_user_documents/materials/education/EDU1_UniX").exists());
        assert!(!root.join("01_user_documents/materials/00_Original_CV.docx").exists());
        assert!(inbox.join("cv_restored.docx").is_file(), "the restored file takes a new name when the old one is taken");
        assert!(load_last(&root).is_none(), "an undo is done once");
        let again = undo_last(&root);
        assert!(again.restored.is_empty(), "a second undo does nothing");
    }

    #[test]
    fn undo_skips_what_is_gone_and_stays_inside_the_folder() {
        let root = user_folder("undo2");
        save_last(&root, &Tidy { moved: vec![("a.txt".into(), "01_user_documents/materials/a.txt".into()), ("b.txt".into(), "../../etc/passwd".into()), ("../x".into(), "01_user_documents/materials/a.txt".into())], ..Default::default() });
        let u = undo_last(&root);
        assert!(u.restored.is_empty());
        assert_eq!(u.skipped.len(), 3, "{:?}", u.skipped);
    }

    fn cli_args(extra: &[String]) -> Vec<String> {
        cli_command(Path::new("claude"), Path::new("/w"), "note", "haiku", extra).get_args().map(|a| a.to_string_lossy().to_string()).collect()
    }
    // The values after a flag, up to the next flag.
    fn after(args: &[String], flag: &str) -> Vec<String> {
        args.iter().skip_while(|a| *a != flag).skip(1).take_while(|a| !a.starts_with("--")).cloned().collect()
    }

    #[test]
    fn the_permissions_keep_the_agent_inside_the_vantage_folder() {
        let args = cli_args(&[]);
        let allowed = after(&args, "--allowedTools");
        for bare in ["Read", "Write", "Edit", "Glob", "Grep"] {
            assert!(!allowed.contains(&bare.to_string()), "{bare} without a path rule lets the agent read and write anywhere on the computer");
        }
        assert!(!allowed.iter().any(|a| a == "Bash(python3 *)" || a == "Bash(python *)"), "free python can run any code and read any file");
        assert!(allowed.contains(&"Bash(python3 ./--settings/scripts/*)".to_string()), "the kit scripts must stay allowed");
        assert!(allowed.contains(&"Bash(python3 ./02_workflow/03_Tracker/build_tracker.py*)".to_string()), "the tracker script must stay allowed");
        let denied = after(&args, "--disallowedTools");
        for d in ["Bash(rm *)", "Bash(rmdir *)", "Edit(./--settings/scripts/**)", "Write(./--settings/scripts/**)"] {
            assert!(denied.contains(&d.to_string()), "{d} must be refused");
        }
        // The tools themselves stay available (inside the folder they need no approval).
        let tools = after(&args, "--tools");
        for t in ["Read", "Write", "Edit", "Glob", "Grep", "Bash"] { assert!(tools.contains(&t.to_string()), "{t} must be available"); }
    }

    #[test]
    fn an_approved_command_is_one_plain_command() {
        assert!(extra_rule_ok("Bash(ls Master_CV)"));
        for bad in ["Bash(ls && rm x)", "Bash(ls; rm x)", "Bash(ls | head -3)", "Bash(cat a > b)", "Bash(ls $(rm x))", "Bash(ls `rm x`)", "Bash(python3 -c print(1))", "Bash(python -c x)", "Bash(ls || rm x)", "Bash(ls\nrm x)"] {
            assert!(!extra_rule_ok(bad), "{bad}");
        }
    }
}
