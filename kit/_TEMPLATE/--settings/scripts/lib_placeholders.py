"""Jaring pengaman: cegah placeholder template ikut ter-render ke dokumen kiriman.

Masalah nyatanya: field opsional yang tidak diisi (mis. `context`) nilainya masih
`<TAILOR opsional>`, dan builder menulisnya apa adanya ke .docx. Isinya baru ketahuan
setelah PDF-nya dibaca — kalau dibaca. Kalau tidak, teks itu ikut terkirim ke recruiter.

Aturannya: nilai yang masih mengandung `<TAILOR` dianggap BELUM DIISI, jadi dikosongkan
(builder sudah melewati field kosong) lalu dilaporkan sebagai peringatan.
"""

MARKER = "<TAILOR"


def scrub(node, path="", found=None):
    """Kosongkan semua string yang masih placeholder. Mengembalikan daftar lokasinya.

    Key berawalan underscore dilewati — itu catatan untuk manusia, bukan isi dokumen.
    """
    if found is None:
        found = []

    if isinstance(node, dict):
        items = ((k, v) for k, v in node.items() if not str(k).startswith("_"))
        for key, val in items:
            sub = f"{path}.{key}" if path else str(key)
            if isinstance(val, str):
                if MARKER in val:
                    node[key] = ""
                    found.append(sub)
            else:
                scrub(val, sub, found)

    elif isinstance(node, list):
        for i, val in enumerate(node):
            sub = f"{path}[{i}]"
            if isinstance(val, str):
                if MARKER in val:
                    node[i] = ""
                    found.append(sub)
            else:
                scrub(val, sub, found)

    return found


def cek_nama_output(output):
    """Nama file yang masih berisi <...> tidak valid di Windows dan pasti salah isi."""
    if "<" in output or ">" in output:
        raise SystemExit(
            f'! "output": "{output}" masih placeholder.\n'
            "  Ganti dulu jadi nama file betulan, mis. \"CV_Santoso_Beispiel-AG.docx\"."
        )
