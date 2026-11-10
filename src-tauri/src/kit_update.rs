// "Update now" for the kit (the system files in the user's Vantage folder: SOPs, agents, scripts, templates), done by the app itself.
// The app downloads the published kit, runs the kit's own apply_update.py (hash comparison, a backup of every file it replaces) and then
// hands Nova ONE message for the part that needs judgement: the data migrations. Nothing here needs an agent to run a shell.
use serde::Serialize;
use std::{fs, path::{Path, PathBuf}, process::Command};

#[derive(Serialize, Default, Debug)]
pub struct KitUpdate {
    pub new: usize,
    pub changed: usize,
    pub obsolete: usize,
    pub backup: String,
    pub from: String,
    pub version: String,
    pub pending: Vec<String>,   // titles of the data migrations Nova still has to look at
    pub stamped: bool,          // the new version is written down (only when there is nothing left for Nova)
    pub source: String,         // absolute path where the new kit is kept until Nova has stamped (empty when nothing is pending)
}

fn plain_python() -> Result<String, String> { crate::pyfind::any() }
fn run_python(script: &Path, args: &[&str]) -> Result<std::process::Output, String> {
    let python = plain_python()?;
    let mut c = Command::new(python);
    crate::quiet(&mut c);
    c.arg(script).args(args);
    c.output().map_err(|e| e.to_string())
}
fn plan(script: &Path, source: &Path, root: &Path, flags: &[&str]) -> Result<serde_json::Value, String> {
    let (s, r) = (source.to_string_lossy().to_string(), root.to_string_lossy().to_string());
    let mut args = vec!["--source", s.as_str(), "--user", r.as_str()];
    args.extend_from_slice(flags);
    let o = run_python(script, &args)?;
    if !o.status.success() {
        let m = String::from_utf8_lossy(&o.stderr).trim().chars().take(300).collect::<String>();
        return Err(if m.is_empty() { "The update script stopped without a message.".into() } else { m });
    }
    serde_json::from_slice(&o.stdout).map_err(|e| format!("The update script printed something unexpected: {e}"))
}

// The update itself, from a kit that is already on disk (a folder with _TEMPLATE/ and CLAUDE.md). Separate from the download so it can be tested.
pub fn kit_update_from(root: &Path, source: &Path) -> Result<KitUpdate, String> {
    let script = source.join("_TEMPLATE").join("--settings").join("scripts").join("apply_update.py");
    if !script.is_file() { return Err("The downloaded kit has no apply_update.py (it is not a Vantage kit).".into()); }
    let p = plan(&script, source, root, &[])?;
    let pending: Vec<String> = p["pending_migrations"].as_array().map(|a| a.iter().filter_map(|m| m["title"].as_str().map(String::from)).collect()).unwrap_or_default();
    let n = |k: &str| p[k].as_array().map(|a| a.len()).unwrap_or(0);
    let mut out = KitUpdate { new: n("new"), changed: n("changed"), obsolete: n("obsolete"), from: p["from"].as_str().unwrap_or("").into(), version: p["version"].as_str().unwrap_or("").into(), pending, ..Default::default() };
    let applied = plan(&script, source, root, &["--apply"])?;
    out.backup = applied["backup"].as_str().unwrap_or("").into();
    if out.pending.is_empty() {
        plan(&script, source, root, &["--stamp"])?;
        out.stamped = true;
    } else {
        // Nova needs the same kit again to stamp when the migrations are done: keep it next to the user's settings.
        let keep = root.join("01_user_documents").join("--usersettings").join("update_source");
        let _ = fs::remove_dir_all(&keep);
        copy_dir(source, &keep).map_err(|e| format!("The update was applied but its source could not be kept: {e}"))?;
        out.source = keep.to_string_lossy().to_string();
    }
    Ok(out)
}

fn copy_dir(src: &Path, dst: &Path) -> std::io::Result<()> {
    fs::create_dir_all(dst)?;
    for e in fs::read_dir(src)? {
        let e = e?;
        let t = dst.join(e.file_name());
        if e.file_type()?.is_dir() { copy_dir(&e.path(), &t)?; } else { fs::copy(e.path(), &t)?; }
    }
    Ok(())
}

// Download the published kit (Vantage_Kit.zip of the latest release) into a temporary folder and unpack it.
fn download_kit(repo: &str, tmp: &Path) -> Result<PathBuf, String> {
    fs::create_dir_all(tmp).map_err(|e| e.to_string())?;
    let zip = tmp.join("Vantage_Kit.zip");
    let url = format!("https://github.com/{repo}/releases/latest/download/Vantage_Kit.zip");
    let mut c = Command::new("curl");
    crate::quiet(&mut c);
    c.args(["-fsSL", "-m", "180", "-o"]).arg(&zip).arg(&url);
    let ok = c.output().map(|o| o.status.success()).unwrap_or(false);
    if !ok || !zip.is_file() { return Err("The update could not be downloaded. Check your internet connection and try again.".into()); }
    let out = tmp.join("kit");
    let helper = tmp.join("unzip.py");
    fs::write(&helper, "import sys, zipfile\nzipfile.ZipFile(sys.argv[1]).extractall(sys.argv[2])\n").map_err(|e| e.to_string())?;
    let o = run_python(&helper, &[&zip.to_string_lossy(), &out.to_string_lossy()])?;
    if !o.status.success() { return Err("The downloaded update is damaged. Try again in a moment.".into()); }
    Ok(out)
}

#[tauri::command]
pub async fn kit_update_apply(root: String) -> Result<KitUpdate, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let root = PathBuf::from(root);
        if !root.join("--settings").is_dir() { return Err("Please select your Vantage folder first.".to_string()); }
        let repo = crate::repo();
        if repo.is_empty() { return Err("No update source is set up for this copy of Vantage.".into()); }
        let tmp = std::env::temp_dir().join(format!("vantage_kit_update_{}", std::process::id()));
        let _ = fs::remove_dir_all(&tmp);
        let r = download_kit(&repo, &tmp).and_then(|src| kit_update_from(&root, &src));
        let _ = fs::remove_dir_all(&tmp);
        r
    }).await.map_err(|e| e.to_string())?
}

#[cfg(test)]
mod tests {
    use super::*;
    fn kit_dir() -> PathBuf { Path::new(env!("CARGO_MANIFEST_DIR")).join("..").join("kit") }
    fn user_copy(name: &str) -> PathBuf {
        let d = std::env::temp_dir().join(format!("vantage_kitupd_{name}_{}", std::process::id()));
        let _ = fs::remove_dir_all(&d);
        copy_dir(&kit_dir().join("_TEMPLATE"), &d).unwrap();
        d
    }
    fn sha(p: &Path) -> Vec<u8> { fs::read(p).unwrap() }

    #[test]
    fn the_app_replaces_changed_system_files_with_a_backup_and_leaves_the_data_alone() {
        let user = user_copy("a");
        let sop = user.join("--settings").join("sop").join("update.md");
        let good = sha(&sop);
        fs::write(&sop, "someone edited this system file").unwrap();
        fs::remove_file(user.join("--settings").join("scripts").join("_utf8.py")).unwrap();
        let mine = user.join("01_user_documents").join("raw_facts_about_you.md");
        fs::write(&mine, "my own facts").unwrap();
        let r = kit_update_from(&user, &kit_dir()).expect("update");
        assert!(r.changed >= 1 && r.new >= 1, "{r:?}");
        assert_eq!(sha(&sop), good, "the system file is back to the published one");
        assert!(user.join("--settings").join("scripts").join("_utf8.py").is_file(), "a missing system file is added");
        assert_eq!(fs::read_to_string(&mine).unwrap(), "my own facts", "the user's own data is never touched");
        assert!(!r.backup.is_empty() && Path::new(&r.backup).join("--settings").join("sop").join("update.md").is_file(), "the replaced file was backed up first: {}", r.backup);
        assert_eq!(fs::read_to_string(Path::new(&r.backup).join("--settings").join("sop").join("update.md")).unwrap(), "someone edited this system file");
        assert_eq!(r.stamped, r.pending.is_empty(), "the version is written down only when nothing is left for Nova: {r:?}");
        if !r.pending.is_empty() { assert!(user.join("01_user_documents/--usersettings/update_source/_TEMPLATE/system_manifest.json").is_file(), "the kit is kept so Nova can stamp later"); }
    }

    #[test]
    fn an_up_to_date_folder_changes_nothing_and_is_stamped() {
        let user = user_copy("b");
        let ver = serde_json::from_str::<serde_json::Value>(&fs::read_to_string(user.join("system_manifest.json")).unwrap()).unwrap()["version"].as_str().unwrap().to_string();
        let st = user.join("01_user_documents").join("--usersettings");
        fs::create_dir_all(&st).unwrap();
        fs::write(st.join(".vantage_version"), format!("{ver}\n")).unwrap();
        let r = kit_update_from(&user, &kit_dir()).expect("update");
        assert_eq!((r.changed, r.new, r.obsolete), (0, 0, 0), "{r:?}");
        assert!(r.pending.is_empty() && r.stamped, "{r:?}");
        assert!(r.backup.is_empty(), "nothing replaced, so no backup folder");
    }

    #[test]
    fn something_that_is_not_a_kit_is_refused_with_a_plain_message() {
        let user = user_copy("c");
        let junk = std::env::temp_dir().join(format!("vantage_notakit_{}", std::process::id()));
        fs::create_dir_all(&junk).unwrap();
        let e = kit_update_from(&user, &junk).unwrap_err();
        assert!(e.contains("not a Vantage kit"), "{e}");
    }

    // Needs the internet: it downloads the REAL published kit from GitHub (what "Update now" does for a user) and applies it. Run on every platform in CI.
    #[test]
    #[ignore]
    fn the_published_kit_downloads_unpacks_and_updates_a_folder() {
        let tmp = std::env::temp_dir().join(format!("vantage_kitnet_{}", std::process::id()));
        let _ = fs::remove_dir_all(&tmp);
        let src = download_kit("helm1zf/vantage", &tmp).expect("download + unpack");
        let user = user_copy("net");
        let sop = user.join("--settings").join("sop").join("update.md");
        fs::write(&sop, "edited").unwrap();
        let mine = user.join("01_user_documents").join("raw_facts_about_you.md");
        fs::write(&mine, "my own facts").unwrap();
        let r = kit_update_from(&user, &src).expect("update from the published kit");
        assert!(r.changed >= 1, "{r:?}");
        assert!(!fs::read_to_string(&sop).unwrap().eq("edited"), "the system file was replaced");
        assert_eq!(fs::read_to_string(&mine).unwrap(), "my own facts");
        assert!(!r.version.is_empty(), "{r:?}");
        let _ = fs::remove_dir_all(&tmp);
    }
}
