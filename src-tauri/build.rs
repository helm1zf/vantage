// Packs the Vantage kit (../kit + ../vantage.json) into OUT_DIR/kit.bin, embedded in the app, so the app can set up
// a new Vantage folder without any download. Format per file: u32 path length, path (UTF-8, '/'), u64 size, bytes.
use std::{fs, io::Write, path::Path};

fn walk(base: &Path, dir: &Path, out: &mut Vec<(String, Vec<u8>)>) {
    let mut entries: Vec<_> = fs::read_dir(dir).map(|r| r.flatten().collect()).unwrap_or_default();
    entries.sort_by_key(|e| e.file_name());
    for e in entries {
        let p = e.path();
        let name = e.file_name().to_string_lossy().to_string();
        if name == ".DS_Store" || name == "__pycache__" {
            continue;
        }
        if p.is_dir() {
            walk(base, &p, out);
        } else if let Ok(data) = fs::read(&p) {
            out.push((p.strip_prefix(base).unwrap().to_string_lossy().replace('\\', "/"), data));
        }
    }
}

fn main() {
    let kit = Path::new("../kit");
    let mut files = vec![];
    if kit.is_dir() {
        walk(kit, kit, &mut files);
    }
    if let Ok(v) = fs::read("../vantage.json") {
        files.push(("vantage.json".into(), v));
    }
    let out = Path::new(&std::env::var("OUT_DIR").unwrap()).join("kit.bin");
    let mut f = fs::File::create(&out).unwrap();
    for (p, d) in &files {
        f.write_all(&(p.len() as u32).to_le_bytes()).unwrap();
        f.write_all(p.as_bytes()).unwrap();
        f.write_all(&(d.len() as u64).to_le_bytes()).unwrap();
        f.write_all(d).unwrap();
    }
    println!("cargo:rerun-if-changed=../kit");
    println!("cargo:rerun-if-changed=../vantage.json");
    tauri_build::build()
}
