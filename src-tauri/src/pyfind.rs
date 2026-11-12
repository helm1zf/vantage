// The ONE place that finds Python. Everything that runs a script (the tracker, kit scripts started by buttons, the kit update, doctor)
// asks here, so a button never fails with "Python not found" while another feature finds it.
use std::{fs, process::Command};

// Order matters. Windows: the `py` launcher first (it exists even when "Add to PATH" was not ticked); `python3` there can be the Microsoft
// Store stub, so it is last. macOS: an app opened from Finder has a short PATH, so the usual install places are listed by full path.
pub fn candidates() -> Vec<String> {
    let mut c: Vec<String> = Vec::new();
    if cfg!(windows) {
        c.extend(["py", "python", "python3"].map(String::from));
    } else {
        c.extend(["/Library/Frameworks/Python.framework/Versions/Current/bin/python3", "/opt/homebrew/bin/python3", "/usr/local/bin/python3", "python3", "/usr/bin/python3", "python"].map(String::from));
        if let Ok(rd) = fs::read_dir("/Library/Frameworks/Python.framework/Versions") {
            let mut v: Vec<String> = rd.flatten().map(|e| e.path().join("bin").join("python3").to_string_lossy().to_string()).collect();
            v.sort();
            v.reverse();
            c.splice(1..1, v);
        }
    }
    c
}

pub enum Found { Ok(String), MissingModule, NoPython }

// The first candidate that is Python 3.8+ and, when `module` is given, can import it.
pub fn pick_from(cands: &[String], module: Option<&str>) -> Found {
    let mut any = false;
    let code = match module { Some(m) => format!("import {m}, sys; sys.exit(0 if sys.version_info >= (3, 8) else 1)"), None => "import sys; sys.exit(0 if sys.version_info >= (3, 8) else 1)".to_string() };
    for c in cands {
        let mut cmd = Command::new(c);
        cmd.args(["-c", &code]);
        match crate::quiet(&mut cmd).output() {
            Ok(o) if o.status.success() => return Found::Ok(c.clone()),
            Ok(_) => any = true,
            Err(_) => {}
        }
    }
    if any { Found::MissingModule } else { Found::NoPython }
}

// Python with `module` (openpyxl for the tracker).
pub fn with_module(module: &str) -> Result<String, String> {
    match pick_from(&candidates(), Some(module)) {
        Found::Ok(p) => Ok(p),
        Found::MissingModule => Err(format!("Python is installed but the {module} package is missing (run: pip3 install {module})")),
        Found::NoPython => Err("Python was not found on this computer".into()),
    }
}

// Any Python 3 (scripts that use only the standard library).
pub fn any() -> Result<String, String> {
    match pick_from(&candidates(), None) {
        Found::Ok(p) => Ok(p),
        _ => Err("Python is not installed or not found. Open Settings > System check to fix it.".into()),
    }
}

// For kit scripts started by a button: a Python that has the packages the scripts need if there is one, else any Python.
pub fn for_kit_scripts() -> Result<String, String> {
    with_module("openpyxl").or_else(|_| any())
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn the_windows_list_starts_with_the_launcher_and_ends_with_the_store_stub() {
        let c = candidates();
        assert!(c.iter().any(|x| x == "python3"));
        if cfg!(windows) { assert_eq!(c.first().map(String::as_str), Some("py")); assert_eq!(c.last().map(String::as_str), Some("python3")); }
        else { assert!(c.iter().any(|x| x.starts_with("/opt/homebrew/")) && c.iter().any(|x| x == "/usr/bin/python3")); }
    }
    #[test]
    fn a_missing_command_is_skipped_and_a_real_python_is_found() {
        let list: Vec<String> = ["definitely-not-a-python-123".to_string()].into_iter().chain(candidates()).collect();
        assert!(matches!(pick_from(&list, None), Found::Ok(p) if p != "definitely-not-a-python-123"), "this machine has Python 3.8+ (CI installs it)");
        assert!(matches!(pick_from(&["definitely-not-a-python-123".to_string()], None), Found::NoPython));
    }
    #[test]
    fn a_missing_package_is_told_apart_from_a_missing_python() {
        assert!(matches!(pick_from(&candidates(), Some("surely_no_such_module_xyz")), Found::MissingModule));
    }
}
