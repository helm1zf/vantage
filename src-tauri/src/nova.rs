// Nova chat (prototype): the Nova tab talks to the user's own, unmodified Claude Code, installed with
// Anthropic's official installer and signed in through Claude Code's own login. Vantage never sees or stores
// the account: it only starts `claude -p` in the Vantage folder and shows its streamed reply.
use serde::Serialize;
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

fn find_claude() -> Option<PathBuf> {
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
            quiet(&mut Command::new("powershell").args(["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", "irm https://claude.ai/install.ps1 | iex"])).output()
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
fn work_dir(root: &Path) -> PathBuf {
    match root.parent() {
        Some(p) if p.join("CLAUDE.md").is_file() => p.to_path_buf(),
        _ => root.to_path_buf(),
    }
}

// What Nova may do without asking: edits inside the Vantage folder (acceptEdits), reading, web search, the
// specialist agents and the kit's Python scripts. Anything else is refused automatically and reported.
const ALLOWED: &[&str] = &[
    "Read", "Write", "Edit", "Glob", "Grep", "Task", "Agent", "TodoWrite", "WebSearch", "WebFetch",
    "Bash(python3 *)", "Bash(python *)", "Bash(ls *)", "Bash(mkdir *)",
];

// Commands the user approved in a chat card ("Allow once / Always allow"), passed on as exact `Bash(<command>)` rules.
// Only single shell commands; anything that deletes, formats or needs admin rights is never allowed this way
// (deleting goes through the app's own Trash).
const NEVER_ALLOW: &[&str] = &["rm", "rmdir", "del", "erase", "rd", "format", "sudo", "su", "dd", "mkfs", "shutdown", "reboot", "diskpart", "chmod", "chown", "reg", "sc", "net", "powershell", "pwsh", "cmd"];
fn extra_rule_ok(p: &str) -> bool {
    let Some(inner) = p.strip_prefix("Bash(").and_then(|x| x.strip_suffix(')')) else { return false };
    let inner = inner.trim();
    if inner.is_empty() || inner.len() > 300 || inner.contains('\n') || inner.contains('\r') || inner.contains('\0') { return false; }
    let first = inner.split_whitespace().next().unwrap_or("").to_lowercase();
    let first = first.rsplit(['/', '\\']).next().unwrap_or("").trim_end_matches(".exe").to_string();
    !NEVER_ALLOW.contains(&first.as_str())
}

// One reply in one chat. `agent` runs the session as that Vantage agent (Raka, Laras); empty = Nova. `context` comes
// from the page: the chat's own rules and, for the first message of a fresh session, the end of the earlier conversation.
const TOOLS: &[&str] = &["Read", "Write", "Edit", "Glob", "Grep", "Task", "Bash", "WebSearch", "WebFetch", "TodoWrite"];

#[tauri::command]
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
refused, tell the user in plain words what you could not do. Shell: only a single `python3 ...` or `python ...` call (the kit scripts, by path; no `cd`, no `&&`, no pipes or redirects), `ls ...` and `mkdir ...` are allowed, anything else is refused. \
Read and search with the Read, Grep and Glob tools and change files with Edit or Write, never with a shell. The user's facts live in ONE file, 01_user_documents/raw_facts_about_you.md: \
when asked to check or change raw facts, open and edit that file, not the about-item files or the project folders in materials/."
    );
    if !context.trim().is_empty() {
        note.push_str("\n\n");
        note.push_str(&context);
    }
    // A fresh session gets the files every conversation starts with already in its instructions, so it does not
    // spend a round trip (which re-sends the whole conversation) reading them. The opening flow is for claude.ai only.
    if preload {
        note.push_str("\n\nThe opening flow in onboarding/project_mode.md does not apply in this app: the user's folder exists, so do not read \
that file. The two files every conversation starts with are below; do not read them again in this session unless they may have changed.");
        for (label, p) in [("status.md", root.join("01_user_documents/--usersettings/status.md")), ("the user's CLAUDE.md", root.join("CLAUDE.md"))] {
            if let Ok(t) = std::fs::read_to_string(&p) {
                note.push_str(&format!("\n\n----- {label} ({}) -----\n{t}", p.display()));
            }
        }
    }
    let work = work_dir(&root);
    crate::ensure_agents(&work);
    let mut cmd = claude_cmd(&bin);
    cmd.current_dir(&work)
        .args(["-p", "--output-format", "stream-json", "--verbose", "--include-partial-messages"])
        .args(["--permission-mode", "acceptEdits", "--permission-prompts", "none", "--append-system-prompt", &note])
        // No MCP connectors from the user's own Claude setup (Gmail, Canva, …): Vantage does not use them, and their
        // tool lists alone add tens of thousands of tokens to every session.
        .arg("--strict-mcp-config")
        // Only the tools Vantage uses, and none of the user's own plugins and skills: together they halve what every
        // step of a reply has to carry (about 33k to 15k tokens measured).
        .arg("--tools").args(TOOLS)
        .args(["--setting-sources", "project,local"])
        .args(["--model", &model])
        .arg("--allowedTools").args(ALLOWED)
        .args(extra_allowed.iter().filter(|p| extra_rule_ok(p)).take(40));
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
        let out = c.arg(&path).args(args.iter().take(4)).arg(&root).output().map_err(|e| e.to_string())?;
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

#[derive(Serialize, Default)]
pub struct Tidy { moved: Vec<(String, String)>, trashed: Vec<String>, skipped: Vec<(String, String)> }

#[tauri::command]
pub async fn nova_inbox_apply(root: String) -> Result<Tidy, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let root = PathBuf::from(root);
        let plan_path = root.join(INBOX_PLAN);
        let plan: serde_json::Value = serde_json::from_str(&std::fs::read_to_string(&plan_path).map_err(|_| "Raka did not write a plan.".to_string())?)
            .map_err(|e| format!("The plan could not be read: {e}"))?;
        let inbox = root.join(crate::INBOX);
        let docs = root.join("01_user_documents");
        let clean = |rel: &str| !rel.is_empty() && !Path::new(rel).is_absolute() && !rel.split(['/', '\\']).any(|c| c == ".." );
        let mut out = Tidy::default();
        for it in plan["items"].as_array().cloned().unwrap_or_default() {
            let from = it["from"].as_str().unwrap_or("").trim().trim_start_matches(&format!("{}/", crate::INBOX)).to_string();
            let to = it["to"].as_str().unwrap_or("").trim().to_string();
            let src = inbox.join(&from);
            if !clean(&from) || !src.exists() { out.skipped.push((from, "not in the Inbox".into())); continue; }
            if it["action"].as_str() == Some("trash") {
                match crate::to_trash(&src) { Ok(()) => out.trashed.push(from), Err(e) => out.skipped.push((from, e)) }
                continue;
            }
            let dst = root.join(&to);
            if !clean(&to) || !dst.starts_with(&docs) { out.skipped.push((from, "destination outside your documents".into())); continue; }
            if dst.exists() { out.skipped.push((from, "a file with that name already exists".into())); continue; }
            if let Some(d) = dst.parent() { let _ = std::fs::create_dir_all(d); }
            match std::fs::rename(&src, &dst) { Ok(()) => out.moved.push((from, to)), Err(e) => out.skipped.push((from, e.to_string())) }
        }
        // Done once: keep the plan as a record, but never carry it out twice.
        let _ = std::fs::rename(&plan_path, plan_path.with_extension("applied.json"));
        Ok(out)
    }).await.map_err(|e| e.to_string())?
}
