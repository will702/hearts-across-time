# 011 — Onboarding, Interactive Cover, and Playable Timeline

## Selesai

- Intro 8,4 detik hanya wajib pada peluncuran pertama; cover berikutnya menyediakan **Lanjutkan**, **Siklus Baru**, dan **Putar Ulang Intro** dengan fokus keyboard/sentuh dan konfirmasi autosave.
- Peta waktu prosedural 1944 → 1968 → 1999 → 2088 menampilkan segel ending yang sudah ditemukan tanpa spoiler ending lain.
- Tutorial kontekstual 1944 tersimpan permanen untuk gerak, sprint, interaksi, mini-game, dan pilihan dialog.
- Tiga tantangan wajib: lampu sorot 1944, penyetelan tiga band 1968, dan tiga pulsa stabilisasi 1999. Dua pendekatan memberi tepat satu poin Empati/Logika per era; tiga miss mengaktifkan assist.
- Hasil challenge ikut autosave dan dimigrasikan aman untuk save lama; seluruh hasil direset ketika loop runtuh.
- Prop interaktif dipisahkan dari lore/buku harian, karakter traversal diperbesar, close-up dialog ditambah, dan stale request `bg2088_mid`/wordmark 404 diperbaiki.

## Verifikasi

- `qa/route.cjs golden`, `failA`, dan `mixed`: lolos melalui kontrol nyata, ketiga challenge selesai, tanpa console/page error atau 404.
- `qa/pass011.cjs`: first launch, skip/return/replay intro, Continue save lama, konfirmasi Siklus Baru, deteksi 1944, assist tiga miss, touch 1968, dan `reduceMotion` lolos.
- Seluruh `src/**/*.js` dan QA lolos `node --check`; `git diff --check` bersih.
