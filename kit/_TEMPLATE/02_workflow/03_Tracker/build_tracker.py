#!/usr/bin/env python3
"""
Generator tracker lamaran kerja.

Sumber kebenaran = applications.json, di 01_user_documents/--usersettings/ (BUKAN di folder
script ini — dipindah ke situ 2026-09-24 biar satu folder 01_user_documents/ = semua
data personal, gampang di-copy/ekspor sekaligus).
Script ini membaca JSON itu dan menulis ulang Application_Tracker.xlsx dari nol,
di folder yang sama dengan script ini (biar gampang dibuka user tiap hari).

Cara pakai:
    python build_tracker.py                    # baca ../../01_user_documents/--usersettings/applications.json -> ./Application_Tracker.xlsx
    python build_tracker.py --json PATH --out PATH

Kenapa JSON jadi sumber kebenaran, bukan Excel-nya langsung:
Excel gampang rusak kalau diedit program (formula ilang, format berantakan, merge cell
nyangkut). Dengan JSON sebagai sumber, tiap update cuma nambah/ubah satu record, lalu
seluruh workbook dibangun ulang secara deterministik. Hasilnya selalu konsisten dan
gak pernah drift.
"""

import argparse
import json
import os
import sys
from datetime import date, datetime

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "--settings", "scripts"))
import lib_schema  # noqa: E402

from openpyxl import Workbook
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.datavalidation import DataValidation

# ---------------------------------------------------------------- palet & gaya

NAVY = "1F3864"
ICE = "DCE6F1"
GOLD = "BF9000"
GREY = "F2F2F2"
WHITE = "FFFFFF"

FONT = "Arial"

# Status yang dianggap "masih hidup" (masih perlu ditindaklanjuti)
AKTIF = {"Draft", "Applied", "Screening", "Interview R1", "Interview R2", "Assessment"}
# Status yang membuktikan lamaran lolos screening manusia
LOLOS_SCREENING = ["Screening", "Interview R1", "Interview R2", "Assessment", "Offer", "Accepted"]
# Status yang sudah selesai
TERMINAL = {"Offer", "Accepted", "Rejected", "Withdrawn", "No Response"}

WARNA_STATUS = {
    "Draft": "BFBFBF",
    "Applied": "9DC3E6",
    "No Response": "D9D9D9",
    "Screening": "FFE699",
    "Interview R1": "FFD966",
    "Interview R2": "F4B183",
    "Assessment": "F4B183",
    "Offer": "A9D08E",
    "Accepted": "70AD47",
    "Rejected": "FF9999",
    "Withdrawn": "D9D9D9",
}

KOLOM = [
    ("ID", "id", 8),
    ("Perusahaan", "perusahaan", 22),
    ("Posisi", "posisi", 46),
    ("Tipe", "tipe", 13),
    ("Lokasi", "lokasi", 15),
    ("Bhs", "bahasa", 6),
    ("Sumber", "sumber", 18),
    ("Tgl Ketemu", "tanggal_ketemu", 12),
    ("Deadline", "deadline", 12),
    ("Mulai Kerja", "mulai_kerja", 12),
    ("Durasi", "durasi", 10),
    ("Fit %", "fit_score", 7),
    ("Status", "status", 14),
    ("Tgl Status", "tanggal_status", 12),
    ("Next Action", "next_action", 44),
    ("Due", "next_action_due", 12),
    ("Folder", "folder", 34),
    ("Link JD", "link", 30),
    ("Catatan", "catatan", 52),
]

thin = Side(style="thin", color="B0B0B0")
BORDER = Border(left=thin, right=thin, top=thin, bottom=thin)


def gaya_header(cell):
    cell.font = Font(name=FONT, bold=True, color=WHITE, size=10)
    cell.fill = PatternFill("solid", fgColor=NAVY)
    cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
    cell.border = BORDER


def gaya_judul(cell, size=14):
    cell.font = Font(name=FONT, bold=True, color=NAVY, size=size)


def gaya_sub(cell):
    cell.font = Font(name=FONT, bold=True, color=WHITE, size=10)
    cell.fill = PatternFill("solid", fgColor=GOLD)
    cell.alignment = Alignment(horizontal="left", vertical="center")


# ---------------------------------------------------------------- sheet: data

def sheet_applications(wb, apps, status_vocab):
    ws = wb.create_sheet("Applications")
    ws.sheet_properties.tabColor = NAVY

    for i, (judul, _, lebar) in enumerate(KOLOM, start=1):
        c = ws.cell(row=1, column=i, value=judul)
        gaya_header(c)
        ws.column_dimensions[get_column_letter(i)].width = lebar
    ws.row_dimensions[1].height = 30

    for r, app in enumerate(apps, start=2):
        for i, (_, key, _) in enumerate(KOLOM, start=1):
            val = app.get(key, "")
            if key == "fit_score":
                val = (val or 0) / 100.0
            c = ws.cell(row=r, column=i, value=val)
            c.font = Font(name=FONT, size=10)
            c.alignment = Alignment(vertical="top", wrap_text=(key in ("posisi", "next_action", "catatan", "folder")))
            c.border = BORDER
            if key == "fit_score":
                c.number_format = "0%"
                c.alignment = Alignment(horizontal="center", vertical="top")
            if key == "status":
                warna = WARNA_STATUS.get(val, WHITE)
                c.fill = PatternFill("solid", fgColor=warna)
                c.alignment = Alignment(horizontal="center", vertical="top")
                c.font = Font(name=FONT, size=10, bold=True)
        ws.row_dimensions[r].height = 30

    last = max(len(apps) + 1, 2)
    ws.auto_filter.ref = f"A1:{get_column_letter(len(KOLOM))}{last}"
    ws.freeze_panes = "C2"

    # dropdown status supaya edit manual di Excel tetap valid
    dv = DataValidation(
        type="list",
        formula1='"' + ",".join(status_vocab) + '"',
        allow_blank=False,
        showDropDown=False,
    )
    ws.add_data_validation(dv)
    dv.add(f"M2:M500")

    return ws


# ---------------------------------------------------------------- sheet: dashboard

def sheet_dashboard(wb, apps, status_vocab, meta):
    ws = wb.create_sheet("Dashboard", 0)
    ws.sheet_properties.tabColor = GOLD
    ws.sheet_view.showGridLines = False

    ws.column_dimensions["A"].width = 3
    ws.column_dimensions["B"].width = 30
    ws.column_dimensions["C"].width = 14
    ws.column_dimensions["D"].width = 12
    ws.column_dimensions["E"].width = 4
    ws.column_dimensions["F"].width = 30
    ws.column_dimensions["G"].width = 60

    gaya_judul(ws["B2"], 16)
    ws["B2"] = f"Tracker Lamaran Kerja — {meta.get('owner_name', '<TAILOR: Nama Kamu>')}"
    ws["B3"] = f"Digenerate ulang otomatis dari applications.json · terakhir: {meta.get('last_updated', '')}"
    ws["B3"].font = Font(name=FONT, size=9, italic=True, color="808080")

    # --- KPI ---
    ws["B5"] = "RINGKASAN"
    gaya_sub(ws["B5"])
    ws.merge_cells("B5:D5")

    n = max(len(apps), 1)
    rng = f"Applications!$M$2:$M${len(apps) + 1}"
    lolos = "+".join([f'COUNTIF({rng},"{s}")' for s in LOLOS_SCREENING])

    kpi = [
        ("Total tercatat di tracker", f"=COUNTA(Applications!$A$2:$A${len(apps) + 1})", "0"),
        ("Sudah dikirim", f'=COUNTA(Applications!$A$2:$A${len(apps) + 1})-COUNTIF({rng},"Draft")', "0"),
        ("Masih draft", f'=COUNTIF({rng},"Draft")', "0"),
        ("Lolos screening", f"={lolos}", "0"),
        ("Response rate", f"=IFERROR(({lolos})/MAX(1,C7),0)", "0.0%"),
        ("Offer", f'=COUNTIF({rng},"Offer")', "0"),
    ]
    r = 6
    for label, formula, fmt in kpi:
        ws.cell(row=r, column=2, value=label).font = Font(name=FONT, size=10)
        c = ws.cell(row=r, column=3, value=formula)
        c.font = Font(name=FONT, size=11, bold=True, color=NAVY)
        c.number_format = fmt
        c.alignment = Alignment(horizontal="center")
        c.fill = PatternFill("solid", fgColor=ICE)
        c.border = BORDER
        r += 1

    ws["B12"] = "Catatan: response rate dihitung dari lamaran yang tercatat di tracker ini saja."
    ws["B12"].font = Font(name=FONT, size=8, italic=True, color="808080")
    ws.merge_cells("B12:D12")

    # --- breakdown status ---
    ws["B14"] = "STATUS BREAKDOWN"
    gaya_sub(ws["B14"])
    ws.merge_cells("B14:D14")

    for i, h in enumerate(["Status", "Jumlah", "% dari total"], start=2):
        c = ws.cell(row=15, column=i, value=h)
        gaya_header(c)

    r = 16
    for s in status_vocab:
        ws.cell(row=r, column=2, value=s).font = Font(name=FONT, size=10)
        ws.cell(row=r, column=2).fill = PatternFill("solid", fgColor=WARNA_STATUS.get(s, WHITE))
        ws.cell(row=r, column=2).border = BORDER

        c = ws.cell(row=r, column=3, value=f'=COUNTIF({rng},$B{r})')
        c.font = Font(name=FONT, size=10)
        c.alignment = Alignment(horizontal="center")
        c.border = BORDER

        p = ws.cell(row=r, column=4, value=f"=IFERROR($C{r}/MAX(1,$C$6),0)")
        p.font = Font(name=FONT, size=10)
        p.number_format = "0.0%"
        p.alignment = Alignment(horizontal="center")
        p.border = BORDER
        r += 1

    # --- konteks historis ---
    ws["F5"] = "KONTEKS"
    gaya_sub(ws["F5"])
    ws.merge_cells("F5:G5")
    ws["F6"] = meta.get("catatan_historis", "")
    ws["F6"].font = Font(name=FONT, size=9)
    ws["F6"].alignment = Alignment(wrap_text=True, vertical="top")
    ws.merge_cells("F6:G11")

    ws["F13"] = "CARA UPDATE"
    gaya_sub(ws["F13"])
    ws.merge_cells("F13:G13")
    langkah = (
        "1. Jangan edit file .xlsx ini langsung — perubahannya bakal ketimpa.\n"
        "2. Edit applications.json (atau minta Nova yang edit).\n"
        "3. Jalankan: python build_tracker.py\n"
        "4. Workbook ini dibangun ulang dari nol, formula & format selalu konsisten.\n\n"
        "Kalau lagi kerja bareng Nova, cukup bilang statusnya berubah — "
        "Nova yang urus JSON-nya dan regenerate file ini."
    )
    ws["F14"] = langkah
    ws["F14"].font = Font(name=FONT, size=9)
    ws["F14"].alignment = Alignment(wrap_text=True, vertical="top")
    ws.merge_cells("F14:G22")

    return ws


# ---------------------------------------------------------------- sheet: action board

def _parse(d):
    for fmt in ("%Y-%m-%d", "%Y-%m", "%d.%m.%Y"):
        try:
            return datetime.strptime(str(d), fmt).date()
        except (ValueError, TypeError):
            continue
    return None


def sheet_action(wb, apps):
    ws = wb.create_sheet("Action Board")
    ws.sheet_properties.tabColor = "C00000"
    ws.sheet_view.showGridLines = False

    gaya_judul(ws["B2"], 14)
    ws["B2"] = "Yang Harus Dikerjain — diurut dari yang paling mepet"
    ws["B3"] = "Sheet ini statis: digenerate ulang tiap kali build_tracker.py dijalankan."
    ws["B3"].font = Font(name=FONT, size=9, italic=True, color="808080")

    kol = [("Due", 12), ("Sisa Hari", 10), ("Perusahaan", 22), ("Posisi", 42), ("Status", 14), ("Next Action", 60)]
    for i, (h, w) in enumerate(kol, start=2):
        c = ws.cell(row=5, column=i, value=h)
        gaya_header(c)
        ws.column_dimensions[get_column_letter(i)].width = w
    ws.column_dimensions["A"].width = 3
    ws.row_dimensions[5].height = 24

    hari_ini = date.today()
    todo = [a for a in apps if a.get("next_action") and a.get("status") in AKTIF]
    todo.sort(key=lambda a: (_parse(a.get("next_action_due")) or date(2099, 12, 31)))

    r = 6
    for a in todo:
        due = _parse(a.get("next_action_due"))
        sisa = (due - hari_ini).days if due else ""
        baris = [
            a.get("next_action_due", ""),
            sisa,
            a.get("perusahaan", ""),
            a.get("posisi", ""),
            a.get("status", ""),
            a.get("next_action", ""),
        ]
        for i, v in enumerate(baris, start=2):
            c = ws.cell(row=r, column=i, value=v)
            c.font = Font(name=FONT, size=10)
            c.alignment = Alignment(vertical="top", wrap_text=(i in (5, 7)))
            c.border = BORDER
            if i == 3 and isinstance(sisa, int):
                c.alignment = Alignment(horizontal="center", vertical="top")
                if sisa < 0:
                    c.fill = PatternFill("solid", fgColor="FF9999")
                elif sisa <= 3:
                    c.fill = PatternFill("solid", fgColor="FFE699")
            if i == 6:
                c.fill = PatternFill("solid", fgColor=WARNA_STATUS.get(a.get("status"), WHITE))
                c.alignment = Alignment(horizontal="center", vertical="top")
        ws.row_dimensions[r].height = 30
        r += 1

    if not todo:
        ws.cell(row=6, column=2, value="Kosong — gak ada action item aktif.").font = Font(
            name=FONT, size=10, italic=True, color="808080"
        )

    ws.freeze_panes = "B6"
    return ws


# ---------------------------------------------------------------- sheet: legenda

def sheet_legenda(wb, status_vocab):
    ws = wb.create_sheet("Legenda")
    ws.sheet_view.showGridLines = False
    ws.column_dimensions["A"].width = 3
    ws.column_dimensions["B"].width = 18
    ws.column_dimensions["C"].width = 82

    gaya_judul(ws["B2"], 14)
    ws["B2"] = "Legenda & Aturan Main"

    ws["B4"] = "ARTI STATUS"
    gaya_sub(ws["B4"])
    ws.merge_cells("B4:C4")

    arti = {
        "Draft": "Dokumen lagi disiapin, belum dikirim.",
        "Applied": "Sudah dikirim, belum ada kabar apa-apa.",
        "No Response": "Lewat 6 minggu tanpa kabar. Dianggap mati, tapi tetap dicatat buat statistik.",
        "Screening": "HR sudah kontak — telepon singkat, form tambahan, atau tes online.",
        "Interview R1": "Wawancara pertama (biasanya HR).",
        "Interview R2": "Wawancara kedua (biasanya hiring manager / user). Ini titik gagal historis — siapkan ekstra.",
        "Assessment": "Assessment center, studi kasus, atau tes teknis.",
        "Offer": "Dapat tawaran.",
        "Accepted": "Tawaran diterima.",
        "Rejected": "Ditolak. Catat di kolom Catatan di tahap mana dan alasannya kalau tahu.",
        "Withdrawn": "Ditarik sendiri.",
    }
    r = 5
    for s in status_vocab:
        ws.cell(row=r, column=2, value=s).font = Font(name=FONT, size=10, bold=True)
        ws.cell(row=r, column=2).fill = PatternFill("solid", fgColor=WARNA_STATUS.get(s, WHITE))
        ws.cell(row=r, column=2).border = BORDER
        c = ws.cell(row=r, column=3, value=arti.get(s, ""))
        c.font = Font(name=FONT, size=10)
        c.alignment = Alignment(wrap_text=True, vertical="top")
        c.border = BORDER
        ws.row_dimensions[r].height = 26
        r += 1

    r += 1
    ws.cell(row=r, column=2, value="KOLOM PENTING")
    gaya_sub(ws.cell(row=r, column=2))
    ws.merge_cells(start_row=r, start_column=2, end_row=r, end_column=3)
    r += 1

    kol_arti = [
        ("Fit %", "Perkiraan kecocokan sama JD. Di bawah 50% biasanya nggak worth waktu — kecuali ada alasan khusus."),
        ("Tgl Ketemu", "Kapan lowongannya ditemukan, bukan kapan dilamar. Berguna buat ngukur seberapa cepat gerak."),
        ("Due", "Deadline internal buat next action. Merah = lewat, kuning = 3 hari lagi."),
        ("Folder", "Path relatif ke folder lowongan (isi CV, cover letter, analisis JD)."),
    ]
    for nama, ket in kol_arti:
        ws.cell(row=r, column=2, value=nama).font = Font(name=FONT, size=10, bold=True)
        ws.cell(row=r, column=2).border = BORDER
        c = ws.cell(row=r, column=3, value=ket)
        c.font = Font(name=FONT, size=10)
        c.alignment = Alignment(wrap_text=True, vertical="top")
        c.border = BORDER
        ws.row_dimensions[r].height = 26
        r += 1

    return ws


# ---------------------------------------------------------------- main

def main():
    p = argparse.ArgumentParser()
    here = os.path.dirname(os.path.abspath(__file__))
    p.add_argument("--json", default=os.path.join(here, "..", "..", "01_user_documents", "--usersettings", "applications.json"))
    p.add_argument("--out", default=os.path.join(here, "Application_Tracker.xlsx"))
    args = p.parse_args()

    try:
        with open(args.json, encoding="utf-8") as f:
            data = json.load(f)
    except json.JSONDecodeError as e:
        sys.exit(f"! {args.json} bukan JSON valid: {e}")

    lib_schema.exit_if_invalid(lib_schema.validate_applications(data, args.json), sys)

    apps = data.get("applications", [])
    meta = data.get("meta", {})
    status_vocab = data.get("status_vocab", list(WARNA_STATUS.keys()))

    wb = Workbook()
    wb.remove(wb.active)

    sheet_applications(wb, apps, status_vocab)
    sheet_dashboard(wb, apps, status_vocab, meta)
    sheet_action(wb, apps)
    sheet_legenda(wb, status_vocab)

    wb.move_sheet("Dashboard", offset=-wb.sheetnames.index("Dashboard"))
    wb.save(args.out)
    print(f"OK: {args.out} ({len(apps)} lamaran)")


if __name__ == "__main__":
    main()
