# 013 — Spesifikasi Aset untuk Agy/Codex (Handoff)

## Status eksekusi (pass ini)

### A2 potret — ✅ SELESAI (8/8 di `assets/portrait_*.png`)
- Backend terpakai: OpenRouter Gemini **1 gambar lalu kredit habis (402)** → sisanya via DashScope WanX (`gen_image_ds.py`), gaya konsisten antar-set.
- 6/8 berhasil chroma-key magenta → cutout alpha bersih.
- 2/8 (`arthur_muda_shock`, `elena_neutral`) WanX membandel menggambar latar scene penuh (3× regen + validasi sudut tetap gagal di-key) → **diterima apa adanya** dan engine kini punya **mode kartu polaroid**: gambar tanpa alpha otomatis dirender sebagai kartu foto kertas miring berselotip (`drawPortrait`, deteksi alpha sekali per id). Justru cocok dg estetika buku harian.
- Review visual dev: `assets/gen/raw/portrait/_contact.png` (gitignored).

### A1 frame bicara — ⏳ MENUNGGU AGY/CODEX
- Input siap: `assets/gen/raw/talk/<char>_<expr>_srcmag.png` (sel F0 di atas magenta) + `_closed.png` (crop asli, tanpa edit). Baris target: elena neutral/sad/shock/warm, arthur_muda neutral/shock/warm.
- Butuh **image-edit** (inpaint mulut saja) — jalur WanX t2i lokal tak mendukung edit; kredit OpenRouter habis. Jalankan lewat agy/codex sesuai spesifikasi di bawah, ATAU top-up OPENROUTER_API_KEY lalu:
  `gen_image.py "<edit prompt A1>" --input assets/gen/raw/talk/<...>_srcmag.png --output ..._open_mag.png --max-tokens 1500`
- Setelah raw lengkap: `build_sheets.py cell --h 210` per open → SPEC JSON `cols:6` → `compose` (pipeline sudah mendukung).

---

Engine integration sudah **terpasang dan fallback-aman**: PNG absen → game identik seperti sekarang.
Tugas agen gambar: hasilkan raw di `assets/gen/raw/`, lalu dev/agen menjalankan pipeline offline
(`build_sheets.py` — tanpa API). Gaya resmi repo: **watercolor-storybook** (garis pensil grafit +
wash cat air muted, latar terang kertas) — samakan dengan `assets/elena_sheet.png` &
`assets/elenadialog1.png` sebagai referensi identitas.

---

## A1 — Frame Bicara (mulut buka/tutup)

**Penting — metode EDIT, bukan generate baru.** Identitas wajib harus persis sheet yang ada.
Crop sel sumber dari `<char>_sheet.png` (kolom F0, baris expr), lalu **edit area mulut saja**
(image-edit/inpaint), jangan regenerasi seluruh karakter.

### Target prioritas (time-boxed)
| Karakter | Baris ekspresi (`EXPR_ROWS`) |
|---|---|
| `elena` | neutral, sad, shock, warm |
| `arthur_muda` | neutral, shock, warm |

(Baris lain menyusul bila masih ada waktu; arthur_dewasa/buron/tua opsional.)

### Output per pasangan
- `<char>_<expr>_closed.png` — mulut tertutup, identik sel asli kecuali mulut
- `<char>_<expr>_open.png` — mulut terbuka sedang (bicara), mata/ramah tubuh TIDAK berubah
- Ukuran sel: **150×210 px**, RGBA transparan, jangkar **tengah-bawah** (kaki di tepi bawah)
- Simpan ke: `assets/gen/raw/talk/`

### Komposisi offline
Buat SPEC JSON 6 kolom (F0–F3 = salin dari sheet lama, F4=closed, F5=open):

```json
{"cols": 6, "rows": [
  ["elena_neutral.png","elena_w1.png","elena_w2.png","elena_w3.png","elena_neutral_closed.png","elena_neutral_open.png"],
  ["... enam sel per baris ... x8 baris (baris tanpa frame bicara: kosongkan F4/F5)"]
]}
```

```
.venv/bin/python scripts/build_sheets.py compose spec_elena.json assets/elena_sheet.png
```

Engine otomatis memakai kolom 4/5 saat baris dialog diketik (`drawCharSheet`, ±5 flap/dtk,
nonaktif saat `reduceMotion`). Sheet 4-kolom lama tetap valid (tanpa flap).

---

## A2 — Potret Bust Dialog

Ilustrasi setengah badan (waist-up) menghadap sedikit ke tengah layar, latar **transparan**.

### Daftar file → taruh langsung di `assets/`
| File | Karakter | Ekspresi |
|---|---|---|
| `portrait_elena_neutral.png` | Elena | tenang |
| `portrait_elena_sad.png` | Elena | sedih (mata berkaca halus) |
| `portrait_elena_shock.png` | Elena | terkejut |
| `portrait_elena_warm.png` | Elena | hangat/senyum lembut |
| `portrait_arthur_muda_shock.png` | Arthur muda (1944, helm medis) | terkejut |
| `portrait_arthur_muda_warm.png` | Arthur muda | hangat |
| `portrait_arthur_tua_warm.png` | Arthur tua (1999, kardigan+tongkat) | hangat tenang |
| `portrait_arthur_tua_sad.png` | Arthur tua | sedih lelah |

### Prompt dasar (per karakter, ganti bagian kurung)
```
Watercolor storybook illustration, waist-up portrait of [CHARACTER], [EXPRESSION],
facing slightly toward viewer, graphite sketch linework with muted watercolor wash,
warm cream paper texture visible in highlights, soft edges, 1940s wartime romance tone,
transparent background, clean alpha edges, no text, no border, no watermark
```
- Elena: "young woman, ash-blonde center-parted hair, white lab coat over dusty-rose dress"
- Arthur muda: "young man, olive military medic uniform, field cap, green serum vial at chest"
- Arthur tua: "elderly man, beige cardigan, kind tired eyes, cane"
- Ukuran disarankan **512×640 px** (engine menampilkan 290 px tinggi, jangkar bawah kiri/kanan layar)

### Pasca-proses
```
.venv/bin/python scripts/build_sheets.py key IN.png OUT.png   # buang residu magenta bila ada
```
Cek visual: tepi alpha bersih (tanpa halo putih/pink); potret muncul otomatis di tepi bawah
saat karakter tsb bicara (`drawPortrait`), fade-in mengikuti pop balon kata.

---

## Checklist penerimaan
1. Sel talk: hanya mulut berubah vs sel F0 asal — mata/rambut/pose identik piksel-demikianadanya.
2. Sheet komposit 900×1680 (6×8) dibuka benar; game tanpa PNG baru tidak berubah sama sekali.
3. Potret: proporsi wajah cocok referensi `elenadialog1.png`; tidak ada sisa chroma pink.
4. Semua lolos QA rute golden + failA tanpa console error / 404 baru.
