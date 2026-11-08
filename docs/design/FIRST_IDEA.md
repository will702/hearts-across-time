# ⏳ Game Design Document & Dialogue Script: Hearts Across Time

## 1. Overview & Mechanics
* **Genre:** 2D Side-Scroller Narrative Puzzle / Psychological Time-Loop
* **Platform:** WebGL (Itch.io - Compfest Indie Game Jam)
* **Visual Style:** 2D Chibi Side-Scroller, Balon Kata (*Speech Bubble* di atas kepala), Parallax Background 3-Layer.
* **Core Logic:**
  * **Sistem Kepribadian (Hidden Affinity):** Obrolan kecil di Babak 1 mengumpulkan poin `Empathy` (hangat/cinta) atau `Logic` (dingin/fokus misi). Ini menentukan kepribadian Arthur di masa depan (Hangat vs Sinis).
  * **Percabangan Pohon Waktu:** $2 \rightarrow 4 \rightarrow 8$ kemungkinan alur cerita.
  * **Looping System:** Setiap kali kondisi gagal atau pemain memilih opsi egois, layar *glitch* dan melempar Elena kembali ke Babak 1 dengan nomor loop yang bertambah (`loop_count++`).
  * **True Ending Condition:** Mengumpulkan poin Empati tinggi $\rightarrow$ Rute B (Militer) $\rightarrow$ Rute B2 (Kapsul Kriogenik) $\rightarrow$ Memilih untuk ikhlas merelakan Arthur bereinkarnasi.

---

## 2. Minimalist Asset Manifest

| Asset ID | Tipe | Deskripsi & Pemanfaatan |
| :--- | :--- | :--- |
| `chibi_elena` | Sprite 2D | 1 sprite tampak samping (jalan cukup pakai skrip bouncing). |
| `chibi_arthur_young` | Sprite 2D | Arthur muda berseragam medis parit (1944). |
| `chibi_arthur_adult` | Sprite 2D | Arthur dewasa berjas lab / buron (1968). |
| `chibi_arthur_old` | Sprite 2D | Arthur tua renta di samping kapsul (1999). |
| `bg_war_street` | Parallax | Latar parit & medan perang PD II (1944). |
| `bg_coldwar_lab` | Parallax | Latar laboratorium/bunker Perang Dingin (1968). |
| `bg_time_chamber` | Parallax | Latar ruang observasi kriogenik & kapsul waktu (1999). |
| `ui_speech_bubble` | UI Prefab | Balon kata mengambang di atas karakter (*7 Days style*). |

---

## 3. Full Yarn Spinner Script (`HeartsAcrossTime.yarn`)

```yarn
title: Start_Game
---
<<set $empathy = 0>>
<<set $logic = 0>> <<set$route_b1 = "">>
<<set $route_b2 = "">>
<<set $loop_count = 0>>
<<jump Prologue>>
===

title: Prologue
---
// Narasi pembuka di layar hitam
Narrator: "Tahun 2088. Virus Crimson menyapu 99% populasi bumi."
Narrator: "Arthur—kekasihku—menghembuskan napas terakhir di pelukanku pagi ini."
Narrator: "Satu-satunya petunjuk penawar berasal dari sebuah berkas militer era Perang Dunia II..."
Narrator: "Aku memicu kapsul waktu darurat. Aku harus mengubah masa lalu sebelum racun itu diciptakan."

<<jump Scene_Babak1_1944>>
===

title: Scene_Babak1_1944
---
// Visual: bg_war_street. Elena berjalan ke kanan dan menemukan Arthur Muda di parit.
<<if $loop_count > 0>>
    Elena: "Parit ini lagi... Aku terlempar kembali ke 1944!"
    Elena: "Aku tidak boleh mengulangi kesalahan di siklus sebelumnya."
<<endif>>

Arthur_Muda: "S-siapa kau?! Tolong jangan tembak! Aku bukan tentara tempur... aku cuma asisten lab medis!"

// DIALOG SIKAP 1: arah skor tersembunyi; UI hanya memperlihatkan isi ucapan
Arthur_Muda: "Tanganku gemetar... Di luar sana bom berjatuhan, dan komandan menyuruhku membawa tabung racun ini ke garis depan."
-> (Genggam tangannya) "Tanganmu ini yang akan menyelamatkan jutaan orang nanti. Tenang, aku bersamamu."
    <<set $empathy =$empathy + 1>>
    Arthur_Muda: "Kau... begitu hangat. Terima kasih, nona..."
-> "Kepanikan tidak akan menghentikan bom. Berdiri dan amankan tabung itu sekarang."
    <<set $logic =$logic + 1>>
    Arthur_Muda: "B-baik... maafkan kelemahanku."

// DIALOG SIKAP 2
Arthur_Muda: "Nona... jika kita selamat dari perang mengerikan ini, apakah ada masa depan yang bahagia untuk orang sepertiku?"
-> "Ada. Di masa depanku, kau adalah orang paling berharga yang sangat kucintai."
    <<set $empathy =$empathy + 1>>
    Arthur_Muda: "Dicintai...? Aku akan mengingat kata-katamu, Elena."
-> "Masa depan itu hancur total kalau sampel ini lepas. Berhenti berkhayal."
    <<set $logic =$logic + 1>>
    Arthur_Muda: "Benar juga... dunia ini memang kejam."

// PILIHAN FATAL BABAK 1
Arthur_Muda: "Komandan menunggu di seberang barikade. Apa yang harus kulakukan dengan tabung patogen ini?"
-> [PILIHAN 1A: Membangkang & Kabur] "Buang seragammu, bawa lari tabung itu dan sembunyi dari militer!"
    <<set $route_b1 = "A">>
    Arthur_Muda: "Baik! Aku akan kabur malam ini dan menelitinya di tempat tersembunyi!"
    <<jump Scene_Babak2_1968>>
-> [PILIHAN 1B: Bertahan di Militer] "Tetaplah di pangkalan resmi. Gunakan fasilitas mereka untuk mengubah racun ini jadi penawar!"
    <<set $route_b1 = "B">>
    Arthur_Muda: "Kupahami misiku. Aku akan menyusup dan menyempurnakannya dari dalam sistem!"
    <<jump Scene_Babak2_1968>>
===

title: Scene_Babak2_1968
---
// Visual: bg_coldwar_lab. Elena melompat ke 24 tahun berikutnya dan berjalan ke kanan.
// GERBANG WAJIB: sebelum bertemu Arthur, Elena berhenti di buku harian. Pemain harus memilih PERIKSA
// dan membaca semua halaman sebelum bisa berjalan lagi. Isi berubah menurut route_b1, skor sikap Babak 1,
// dan loop_count. Pada siklus ketiga dan seterusnya, header berbunyi "Terasa sedikit nostalgia".

<<if $empathy >$logic>>
    // Tipe Arthur: Lembut & Hangat
    Arthur_Dewasa: "Elena...? Liontin itu... kau benar-benar datang kembali setelah 24 tahun!"
    Arthur_Dewasa: "Setiap malam aku bertahan meneliti, hanya kenangan kehangatanmu yang menjagaku tetap waras."
<<else>>
    // Tipe Arthur: Sinis & Dingin
    Arthur_Dewasa: "Hahaha! Sang 'penyelamat masa depan' akhirnya menampakkan diri."
    Arthur_Dewasa: "Dulu kau bilang aku cuma alat untuk misimu, kan? Sekarang lihat, aku sudah menguasai seluruh rahasia formula ini."
<<endif>>

// Percabangan dari Pilihan Babak 1
<<if $route_b1 == "A">>
    // Status: Arthur adalah buronan
    Arthur_Dewasa: "Hidup sebagai buronan sangat menyiksa. Polisi rahasia mengepung area ini! Penelitianku baru setengah jalan."
    Arthur_Dewasa: "Elena... setelah semua yang kulalui, apakah kau masih melihatku sebagai manusia—atau hanya sebagai jalan menuju penawar?"
    -> "Aku melihatmu, Arthur. Bukan formulanya—dirimu. Kita hadapi ketakutan ini bersama."
        <<set $empathy = $empathy + 1>>
        Arthur_Dewasa: "Untuk pertama kalinya sejak perang... aku merasa tidak sendirian. Terima kasih, Elena."
    -> "Perasaan kita tidak akan menghentikan pengepungan. Kendalikan dirimu dan selesaikan formulanya."
        <<set $logic = $logic + 1>>
        Arthur_Dewasa: "Jadi bahkan sekarang, yang kau butuhkan tetap hanya hasil penelitianku... Baiklah."
    Arthur_Dewasa: "Polisi rahasia semakin dekat. Kita harus menentukan langkah sebelum pintu ini dijebol."
    -> [PILIHAN 2A1: Desak Kabur] "Tinggalkan bunker ini sekarang, nyawamu lebih berharga daripada formula ini!"
        <<set $route_b2 = "A1">>
        Arthur_Dewasa: "Akan kutinggalkan semuanya... demi bertahan hidup bersamamu!"
        <<jump Scene_Babak3_1999>>
    -> [PILIHAN 2A2: Kunci Diri di Bunker Bawah Tanah] "Kunci pintu baja dari dalam! Jangan keluar sampai formulanya selesai, apapun yang terjadi!"
        <<set $route_b2 = "A2">>
        Arthur_Dewasa: "Mengurung diri dalam kegelapan...? Baik, akan kulakukan demi janjiku padamu!"
        <<jump Scene_Babak3_1999>>
<<else>>
    // Status: Arthur adalah kepala ilmuwan resmi
    Arthur_Dewasa: "Fasilitas pemerintah ini memberikanku sumber daya melimpah. Formula antibodinya hampir stabil sempurna."
    Arthur_Dewasa: "Tapi dewan militer mulai mencurigai tujuanku. Mereka ingin merebutnya sebagai amunisi baru."
    Arthur_Dewasa: "Jika mereka datang malam ini... apakah kau akan tetap di sisiku, atau hanya memastikan formula itu selamat?"
    -> "Aku tetap di sisimu. Penawar ini berarti karena kaulah yang memperjuangkannya, bukan karena hasil akhirnya saja."
        <<set $empathy = $empathy + 1>>
        Arthur_Dewasa: "Kata-katamu mengingatkanku mengapa aku bertahan selama ini. Kita akan melindunginya bersama."
    -> "Yang utama adalah formula. Singkirkan keraguanmu dan pastikan hasil penelitian ini tidak jatuh ke tangan mereka."
        <<set $logic = $logic + 1>>
        Arthur_Dewasa: "Kupahami. Tidak ada ruang untuk diriku di antara kau dan masa depan yang ingin kau selamatkan."
    Arthur_Dewasa: "Dewan militer bisa tiba kapan saja. Sekarang kita harus menentukan nasib formula ini."
    -> [PILIHAN 2B1: Publikasikan ke Dunia] "Bocorkan datanya ke pers dan publik sekarang agar militer tidak bisa memonopolinya!"
        <<set $route_b2 = "B1">>
        Arthur_Dewasa: "Akan kusiarkan transmisi ini ke seluruh jaringan stasiun radio dunia!"
        <<jump Scene_Babak3_1999>>
    -> [PILIHAN 2B2: Kunci di Kapsul Kriogenik Rahasia] "Kunci formula murni ini di ruang isolasi beku sub-zero sampai tahun 1999!"
        <<set $route_b2 = "B2">>
        Arthur_Dewasa: "Ruang kriogenik... ide brilian. Tak ada seorang pun yang bisa menyentuhnya di sana."
        <<jump Scene_Babak3_1999>>
<<endif>>
===

title: Scene_Babak3_1999
---
// Visual: bg_time_chamber. Elena bertemu Arthur Tua di samping kapsul waktu.

Arthur_Tua: "Elena... sebelum kita menentukan apa pun, jawab aku. Kau menemukan buku harianku di tahun 1968, bukan?"
Arthur_Tua: "Setelah membaca semua halaman itu—apa yang sebenarnya kau lihat di dalam diriku?"
-> "Aku melihat seseorang yang terus bertahan meski ketakutan dan kesepian. Aku melihatmu, Arthur—bukan sekadar penawarnya."
    <<set $empathy = $empathy + 1>>
    Arthur_Tua: "Jadi... setidaknya sekali, seluruh hidupku benar-benar dibaca sebagai kehidupan. Terima kasih, Elena."
-> "Aku melihat catatan penelitian yang membuktikan formulanya bisa diselamatkan. Itulah yang paling penting sekarang."
    <<set $logic = $logic + 1>>
    Arthur_Tua: "Begitu rupanya. Bahkan isi hatiku masih kau baca seperti laporan laboratorium."

<<if $route_b2 == "A1">>
    // KASUS 1: FORMULA GAGAL
    Arthur_Tua: "Batuk... Elena... Maafkan aku. 55 tahun hidupku habis hanya untuk bersembunyi dari kejaran pembunuh bayaran."
    Arthur_Tua: "Aku... tidak pernah sempat menyelesaikan penawar itu..."
    Elena: "Tidak... jika tidak ada penawar, lalu bagaimana dengan 2088?!"
    Narrator: "[ TIMELINE COLLAPSE: Masa depan musnah tanpa penawar. ]"
    <<jump Trigger_Loop>>

<<elseif $route_b2 == "A2">>
    // KASUS 2: ARTHUR OBSESIF / TRAUMA
    Arthur_Tua: "31 tahun di bunker bawah tanah yang gelap... satu-satunya yang membuatku hidup adalah obsesi untuk bertemu denganmu lagi."
    Arthur_Tua: "Aku punya penawarnya! Tapi aku tidak akan memberikannya padamu kecuali kau membawaku ikut ke mesin waktumu!"
    -> [Tolak & Rebut Paksa]
        Arthur_Tua: "Kalau aku tidak bisa memilikimu, tak seorang pun di masa depan yang boleh hidup!"
        Narrator: "[ TIMELINE COLLAPSE: Formula hancur oleh dendam. ]"
        <<jump Trigger_Loop>>
    -> [Bawa Arthur Tua Ikut ke 2088]
        <<jump Loop_Paradox_Ending>>

<<elseif $route_b2 == "B1">>
    // KASUS 3: FORMULA DICURI & JADI SENJATA
    Arthur_Tua: "Elena... aku membuat kesalahan fatal di 1968..."
    Arthur_Tua: "Data yang kusebarkan ke publik justru disempurnakan oleh korporasi gelap menjadi racun pemusnah massal..."
    Arthur_Tua: "Bukan perang yang membunuh masa depanmu... tapi kelalaianku."
    Narrator: "[ CORRUPTED TIMELINE: Virus 2088 justru tercipta lebih awal. ]"
    <<jump Trigger_Loop>>

<<elseif $route_b2 == "B2">>
    // KASUS 4: RUTE KUNCI TERBUKA
    <<if $logic >$empathy>>
        // Kasus Arthur Sinis di Rute B2
        Arthur_Tua: "Formula murni ada di dalam bilik beku ini, Elena."
        Arthur_Tua: "Tapi sepanjang hidupku, kau hanya memandangku sebagai pion alat laboratorium. Aku mengunci katupnya dengan DNA-ku sendiri."
        Arthur_Tua: "Masa depanmu yang dingin tidak layak untuk diselamatkan."
        Narrator: "[ TRAGIC FAILURE: Kebencian mengunci pintu keselamatan. ]"
        <<jump Trigger_Loop>>
    <<else>>
        // TRUE GOLDEN ROUTE (HIGH EMPATHY + B2)
        Arthur_Tua: "Elena... kekasihku yang datang dari masa depan..."
        Arthur_Tua: "Selama 55 tahun menjaga formula di bilik kriogenik ini, cintaku padamu tak pernah pudar satu detik pun."
        Arthur_Tua: "Formula penawar murni 'Arthur Project' telah rampung 100%."
        
        -> [PILIHAN EGOIS: Ajak Arthur Tua Ikut ke 2088]
            <<jump Loop_Paradox_Ending>>
        -> [PILIHAN IKHLAS: Terima Serum & Lepaskan Arthur Bereinkarnasi]
            <<jump True_Ending>>
    <<endif>>
<<endif>>
===

title: Loop_Paradox_Ending
---
Elena: "Aku tidak bisa meninggalkanmu sendirian di era ini, Arthur! Masuklah ke kapsul bersamaku!"
Arthur_Tua: "Elena, tunggu! Dua kesadaran jiwa yang sama di masa depan akan memicu—"
// SFX: Ledakan distorsi waktu + Efek layar putih
Elena: "Mesin waktunya... menolak dua anomali biologis sekaligus?!"
Arthur_Tua: "Kita... terjebak dalam paradoks waktu selamanya..."
<<jump Trigger_Loop>>
===

title: Trigger_Loop
---
// Reset dan loop balik ke awal
<<set $loop_count =$loop_count + 1>>
Narrator: "Realitas terpecah. Kesadaran Elena ditarik kembali melewati pusaran waktu..."
<<jump Scene_Babak1_1944>>
===

title: True_Ending
---
Elena: "Arthur... terima kasih untuk seluruh hidup yang kau korbankan demi masa depanku."
Arthur_Tua: "(Tersenyum tenang) Jangan menangis, Elena. Jiwa ini akan terlelap damai..."
Arthur_Tua: "Dan suatu hari nanti, di tahun 2088... kita akan bertemu lagi sebagai dua orang biasa yang saling jatuh cinta."

// Elena mengambil serum biru
Elena: "Selamat tinggal, Arthur... Sampai bertemu di masa depan."

Narrator: "Elena melompat kembali ke tahun 2088."
Narrator: "Vial antibodi murni disuntikkan ke tubuh Arthur yang terbaring di ruang isolasi."
Narrator: "Detak jantungnya kembali berdegup. Lingkaran kutukan waktu telah resmi terputus."
Narrator: "[ THE END - HEARTS ACROSS TIME: BREAK THE LOOP ]"
===
