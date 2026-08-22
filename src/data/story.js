/* ============================================================
   SCRIPT DIALOG (dari Yarn GDD — verbatim)
   ============================================================ */
// Arah kepribadian sengaja disembunyikan: pemain menilai isi ucapan, bukan label statistik.
function tagEmp(l){return{label:l}}
function tagLog(l){return{label:l}}
function tagR(l){return{tag:'RUTE',tagCol:'#55614C',label:l}}
const NODES={};
function N(id,ops){NODES[id]=ops;}
const say=(who,text,expr)=>({t:'say',who,text,expr});

N('prologue',[
  say('narrator','Tahun 2088. Virus Crimson menyapu 99% populasi bumi.'),
  say('narrator','Arthur—kekasihku—menghembuskan napas terakhir di pelukanku pagi ini.'),
  say('narrator','Satu-satunya petunjuk penawar berasal dari sebuah berkas militer era Perang Dunia II...'),
  say('narrator','Aku memicu kapsul waktu darurat. Aku harus mengubah masa lalu sebelum racun itu diciptakan.'),
  {t:'vortex',to:'1944'},
]);
N('war_intro',[
  say('elena','Semuanya bermula di sini—tahun 1944. Di tengah hujan, api, dan suara bom... kali ini aku akan menyelamatkan Arthur. Apa pun harga yang harus kubayar.','angry'),
  {t:'walk',era:'1944'},
]);
N('bunker_intro',[
  say('elena','Arthur berjuang di bunker bawah tanah yang seperti ini... Karena itulah aku selalu mencintainya.','sad'),
  say('elena','Ia tak pernah menyerah, bahkan ketika dunia melupakannya.','sad'),
  say('elena','Aku akan segera menyelamatkannya... dan membalas seluruh perjuangannya!','sad'),
  {t:'walk',era:'1968'},
]);
N('lab_intro',[
  say('elena','Semoga dengan seluruh fasilitas ini, Arthur akhirnya berhasil menemukan formulanya...','angry'),
  say('elena','Formula yang mampu menebus dua puluh empat tahun penantiannya—dan menyelamatkan masa depan kami.','angry'),
  say('elena','Kali ini, aku tidak akan membiarkan siapa pun merebut harapan itu darinya!','angry'),
  {t:'walk',era:'1968'},
]);
N('final_lab_intro',[
  say('elena','Akhirnya... tahun 1999. Di ruangan inilah seluruh hidup Arthur bermuara pada satu formula terakhir.','sad'),
  say('elena','Semoga penantiannya tidak sia-sia—semoga ia telah menyelesaikan penawar yang kelak menyelamatkan dunia.','sad'),
  say('elena','Arthur... bertahanlah sedikit lagi. Jika harapan itu masih hidup, aku akan membawanya sampai ke masa depan.','sad'),
  {t:'walk',era:'1999'},
]);
N('n_b1',()=>{
  const ops=[];
  if(S.loop>0){ // déjà-vu bertingkat mengikuti jumlah loop (C4)
    if(S.loop===1){ops.push(say('elena','Parit ini lagi... Aku terlempar kembali ke 1944!','shock'));
      ops.push(say('elena','Aku tidak boleh mengulangi kesalahan di siklus sebelumnya.','sad'));}
    else if(S.loop===2){ops.push(say('elena','Siklus ketiga... aku mulai menghafal setiap batu dan lubang di parit ini.','sad'));
      ops.push(say('elena','Dan kau... selalu menungguku di titik yang sama, Arthur.','neutral'));}
    else{ops.push(say('elena','Loop ke-'+S.loop+'. Dunia di luar sini memudar seperti mimpi yang salah sambung.','sad'));
      ops.push(say('elena','Kali ini aku yang MEMUTUS lingkaran ini. Apapun taruhannya.','angry'));}
    if(S.loop>=2)ops.push(say('muda','A-aneh... rasanya aku pernah memimpikanmu menatapku persis begitu, nona...','shock'));}
  ops.push(say('muda','S-siapa kau?! Tolong jangan tembak! Aku bukan tentara tempur... aku cuma asisten lab medis!','shock'));
  ops.push(say('muda','Tanganku gemetar... Di luar sana bom berjatuhan, dan komandan menyuruhku membawa tabung racun ini ke garis depan.','sad'));
  ops.push({t:'choice',opts:[
    {...tagEmp('(Genggam tangannya) "Tanganmu ini yang akan menyelamatkan jutaan orang nanti. Tenang, aku bersamamu."'),fx:()=>S.empathy++,goto:'c1e'},
    {...tagLog('"Kepanikan tidak akan menghentikan bom. Berdiri dan amankan tabung itu sekarang."'),fx:()=>S.logic++,goto:'c1l'}]});
  return ops;});
N('c1e',[say('muda','Kau... begitu hangat. Terima kasih, nona...','warm'),{t:'goto',id:'n_b1q2'}]);
N('c1l',[say('muda','B-baik... maafkan kelemahanku.','sad'),{t:'goto',id:'n_b1q2'}]);
N('n_b1q2',[
  say('muda','Nona... jika kita selamat dari perang mengerikan ini, apakah ada masa depan yang bahagia untuk orang sepertiku?','neutral'),
  {t:'choice',opts:[
    {...tagEmp('"Ada. Di masa depanku, kau adalah orang paling berharga yang sangat kucintai."'),fx:()=>S.empathy++,goto:'c2e'},
    {...tagLog('"Masa depan itu hancur total kalau sampel ini lepas. Berhenti berkhayal."'),fx:()=>S.logic++,goto:'c2l'}]}]);
N('c2e',[say('muda','Dicintai...? Aku akan mengingat kata-katamu, Elena.','warm'),{t:'goto',id:'n_b1f'}]);
N('c2l',[say('muda','Benar juga... dunia ini memang kejam.','sad'),{t:'goto',id:'n_b1f'}]);
N('n_b1f',[
  say('muda','Komandan menunggu di seberang barikade. Apa yang harus kulakukan dengan tabung patogen ini?','neutral'),
  {t:'choice',opts:[
    {...tagR('1A — MEMBANGKANG & KABUR'),'label':'"Buang seragammu, bawa lari tabung itu dan sembunyi dari militer!"',fx:()=>S.routeB1='A',goto:'r1a'},
    {...tagR('1B — BERTAHAN DI MILITER'),'label':'"Tetaplah di pangkalan resmi. Gunakan fasilitas mereka untuk mengubah racun ini jadi penawar!"',fx:()=>S.routeB1='B',goto:'r1b'}]}]);
N('r1a',[say('muda','Baik! Aku akan kabur malam ini dan menelitinya di tempat tersembunyi!','warm'),{t:'vortex',to:'1968'}]);
N('r1b',[say('muda','Kupahami misiku. Aku akan menyusup dan menyempurnakannya dari dalam sistem!','neutral'),{t:'vortex',to:'1968'}]);

N('n_b2',()=>{
  const warm=S.empathy>S.logic;const ops=[];
  if(S.loop===1)ops.push(say(warm?'dewasa':'buron','Tatapanmu... seolah kita pernah bercakap begini, bertahun-tahun lalu. Aneh sekali.','shock')); // gema loop awal
  else if(S.loop===2)ops.push(say(warm?'dewasa':'buron','Tatapanmu itu... seperti sudah menyaksikan semua ini berulang kali.','shock')); // déjà-vu loop (C4)
  else if(S.loop>=3)ops.push(say(warm?'dewasa':'buron','Déjà vu lagi... mimpiku tiap malam persis menit ini — kau, aku, dan ruangan ini.','sad')); // makin pahit tiap siklus
  if(warm){ops.push(say('dewasa','Elena...? Liontin itu... kau benar-benar datang kembali setelah 24 tahun!','shock'));
    ops.push(say('dewasa','Setiap malam aku bertahan meneliti, hanya kenangan kehangatanmu yang menjagaku tetap waras.','warm'));}
  else{ops.push(say('buron','Hahaha! Sang \'penyelamat masa depan\' akhirnya menampakkan diri.','angry'));
    ops.push(say('buron','Dulu kau bilang aku cuma alat untuk misimu, kan? Sekarang lihat, aku sudah menguasai seluruh rahasia formula ini.','angry'));}
  if(S.routeB1==='A'){
    ops.push(say('buron','Hidup sebagai buronan sangat menyiksa. Polisi rahasia mengepung area ini! Penelitianku baru setengah jalan.','sad'));
    ops.push(say('buron','Elena... setelah semua yang kulalui, apakah kau masih melihatku sebagai manusia—atau hanya sebagai jalan menuju penawar?','sad'));
    ops.push({t:'choice',opts:[
      {...tagEmp('"Aku melihatmu, Arthur. Bukan formulanya—dirimu. Kita hadapi ketakutan ini bersama."'),fx:()=>S.empathy++,goto:'b2a_emp'},
      {...tagLog('"Perasaan kita tidak akan menghentikan pengepungan. Kendalikan dirimu dan selesaikan formulanya."'),fx:()=>S.logic++,goto:'b2a_log'}]});
  }else{
    ops.push(say('dewasa','Fasilitas pemerintah ini memberikanku sumber daya melimpah. Formula antibodinya hampir stabil sempurna.','neutral'));
    ops.push(say('dewasa','Tapi dewan militer mulai mencurigai tujuanku. Mereka ingin merebutnya sebagai amunisi baru.','sad'));
    ops.push(say('dewasa','Jika mereka datang malam ini... apakah kau akan tetap di sisiku, atau hanya memastikan formula itu selamat?','sad'));
    ops.push({t:'choice',opts:[
      {...tagEmp('"Aku tetap di sisimu. Penawar ini berarti karena kaulah yang memperjuangkannya, bukan karena hasil akhirnya saja."'),fx:()=>S.empathy++,goto:'b2b_emp'},
      {...tagLog('"Yang utama adalah formula. Singkirkan keraguanmu dan pastikan hasil penelitian ini tidak jatuh ke tangan mereka."'),fx:()=>S.logic++,goto:'b2b_log'}]});
  }
  return ops;});
N('b2a_emp',[say('buron','Untuk pertama kalinya sejak perang... aku merasa tidak sendirian. Terima kasih, Elena.','warm'),{t:'goto',id:'b2a_route'}]);
N('b2a_log',[say('buron','Jadi bahkan sekarang, yang kau butuhkan tetap hanya hasil penelitianku... Baiklah.','sad'),{t:'goto',id:'b2a_route'}]);
N('b2a_route',[
  say('buron','Polisi rahasia semakin dekat. Kita harus menentukan langkah sebelum pintu ini dijebol.','shock'),
  {t:'choice',opts:[
    {...tagR('2A1 — DESAK KABUR'),'label':'"Tinggalkan bunker ini sekarang, nyawamu lebih berharga daripada formula ini!"',fx:()=>S.routeB2='A1',goto:'r2a1'},
    {...tagR('2A2 — KUNCI DIRI DI BUNKER'),'label':'"Kunci pintu baja dari dalam! Jangan keluar sampai formulanya selesai, apa pun yang terjadi!"',fx:()=>S.routeB2='A2',goto:'r2a2'}]}]);
N('b2b_emp',[say('dewasa','Kata-katamu mengingatkanku mengapa aku bertahan selama ini. Kita akan melindunginya bersama.','warm'),{t:'goto',id:'b2b_route'}]);
N('b2b_log',[say('dewasa','Kupahami. Tidak ada ruang untuk diriku di antara kau dan masa depan yang ingin kau selamatkan.','sad'),{t:'goto',id:'b2b_route'}]);
N('b2b_route',[
  say('dewasa','Dewan militer bisa tiba kapan saja. Sekarang kita harus menentukan nasib formula ini.','shock'),
  {t:'choice',opts:[
    {...tagR('2B1 — PUBLIKASIKAN KE DUNIA'),'label':'"Bocorkan datanya ke pers dan publik sekarang agar militer tidak bisa memonopolinya!"',fx:()=>S.routeB2='B1',goto:'r2b1'},
    {...tagR('2B2 — KUNCI DI KAPSUL KRIOGENIK'),'label':'"Kunci formula murni ini di ruang isolasi beku sub-zero sampai tahun 1999!"',fx:()=>S.routeB2='B2',goto:'r2b2'}]}]);
N('r2a1',[say('buron','Akan kutinggalkan semuanya... demi bertahan hidup bersamamu!','warm'),{t:'vortex',to:'1999'}]);
N('r2a2',[say('buron','Mengurung diri dalam kegelapan...? Baik, akan kulakukan demi janjiku padamu!','neutral'),{t:'vortex',to:'1999'}]);
N('r2b1',[say('dewasa','Akan kusiarkan transmisi ini ke seluruh jaringan stasiun radio dunia!','neutral'),{t:'vortex',to:'1999'}]);
N('r2b2',[say('dewasa','Ruang kriogenik... ide brilian. Tak ada seorang pun yang bisa menyentuhnya di sana.','warm'),{t:'vortex',to:'1999'}]);

function arthurDiary(){
  const warm=S.empathy>S.logic,escaped=S.routeB1==='A';let pages;
  if(escaped&&warm)pages=[
    '3 Oktober 1968. Sudah 8.741 malam aku hidup dengan nama palsu. Polisi menyebutku buronan; aku lebih suka menganggap diriku penjaga satu kemungkinan kecil agar dunia tetap hidup.',
    'Aku masih mengingat tangan Elena di parit—hangat, meski hujan membekukan tulang. Kalau aku menyelesaikan penawar ini, mungkin suatu hari aku pantas menggenggam tangan itu lagi.',
    'Formula bereaksi pada sampel terakhir. Aneh: semakin dekat jawabannya, semakin takut aku lupa suara orang yang membuatku bertahan.'
  ];
  else if(escaped)pages=[
    '3 Oktober 1968. Bunker ini tidak mengenal pagi. Aku menghitung waktu dari bunyi pipa dan langkah polisi rahasia di atas langit-langit.',
    'Elena pernah menyuruhku berhenti gemetar dan menyelesaikan tugas. Jadi kutulis semua rasa takut di sini, lalu kubuang kelemahannya ke dalam angka-angka.',
    'Jika ia kembali, mungkin yang dicari bukan diriku—hanya formula. Tidak apa-apa. Sebuah alat tetap berguna meski tak pernah dicintai.'
  ];
  else if(warm)pages=[
    '3 Oktober 1968. Mereka memberiku laboratorium, seragam, dan jabatan. Namun hanya kenangan tentang Elena yang membuat ruangan steril ini terasa seperti tempat manusia bisa pulang.',
    'Dewan meminta formula sebagai senjata. Aku tersenyum, mengangguk, lalu menyembunyikan satu salinan murni di balik panel pendingin. Untuk pertama kalinya aku berbohong tanpa merasa bersalah.',
    'Elena percaya tanganku dapat menyelamatkan jutaan orang. Semoga saat ia kembali, tangan ini masih cukup hangat untuk dikenali.'
  ];
  else pages=[
    '3 Oktober 1968. Fasilitas ini sempurna: pendingin stabil, kultur bersih, komputasi tanpa henti. Seharusnya itu cukup. Anehnya, ruangan tetap terasa kosong.',
    'Dewan menginginkan senjata. Elena menginginkan penawar. Tak seorang pun bertanya apa yang kuinginkan—mungkin karena ilmuwan yang baik memang tidak membutuhkan keinginan.',
    'Aku akan menyelesaikan formula. Jika namaku hilang dari sejarah, setidaknya hasil kerjaku tidak ikut mati.'
  ];
  if(S.loop===1)pages[2]='Tadi malam aku bermimpi Elena membaca halaman ini, lalu semuanya kembali ke awal. Saat bangun, tintanya masih basah—padahal aku menulisnya bertahun-tahun lalu.';
  else if(S.loop>=2)pages[2]='Aku tahu kalimat berikut sebelum penaku menyentuh kertas: Elena akan datang, membaca ini, menatapku, lalu waktu akan retak lagi. Anehnya, pengetahuan itu terasa sedikit seperti pulang.';
  return{pages,meta:(escaped?'BUNKER BAWAH TANAH':'LABORATORIUM MILITER')+' • CATATAN PRIBADI, 1968',nostalgia:S.loop>=2};
}

N('n_b3',()=>{
  const pre=[];
  if(S.loop===1)pre.push(say('elena','Ruang kriogenik ini lagi... aku bahkan mengingat bau esnya. Kali ini harus berbeda.','sad'));
  else if(S.loop>=2)pre.push(say('elena','Berapa kali lagi harus kulihat kau menua menungguku, Arthur... bertahanlah, aku hampir sampai.','sad'));
  pre.push(say('tua','Elena... sebelum kita menentukan apa pun, jawab aku. Kau menemukan buku harianku di tahun 1968, bukan?','neutral'));
  pre.push(say('tua','Setelah membaca semua halaman itu—apa yang sebenarnya kau lihat di dalam diriku?','sad'));
  pre.push({t:'choice',opts:[
    {...tagEmp('"Aku melihat seseorang yang terus bertahan meski ketakutan dan kesepian. Aku melihatmu, Arthur—bukan sekadar penawarnya."'),fx:()=>S.empathy++,goto:'b3_diary_emp'},
    {...tagLog('"Aku melihat catatan penelitian yang membuktikan formulanya bisa diselamatkan. Itulah yang paling penting sekarang."'),fx:()=>S.logic++,goto:'b3_diary_log'}]});
  return pre;});
N('b3_diary_emp',[say('tua','Jadi... setidaknya sekali, seluruh hidupku benar-benar dibaca sebagai kehidupan. Terima kasih, Elena.','warm'),{t:'goto',id:'n_b3_final'}]);
N('b3_diary_log',[say('tua','Begitu rupanya. Bahkan isi hatiku masih kau baca seperti laporan laboratorium.','sad'),{t:'goto',id:'n_b3_final'}]);
N('n_b3_final',()=>{
  let ops=[];
  if(S.routeB2==='A1'){
    ops=[say('tua','Batuk... Elena... Maafkan aku. 55 tahun hidupku habis hanya untuk bersembunyi dari kejaran pembunuh bayaran.','sad'),
      say('tua','Aku... tidak pernah sempat menyelesaikan penawar itu...','sad'),
      say('elena','Tidak... jika tidak ada penawar, lalu bagaimana dengan 2088?!','shock'),
      say('narrator','[ TIMELINE COLLAPSE: Masa depan musnah tanpa penawar. ]'),
      {t:'ending',kind:'loop'}];
  }else if(S.routeB2==='A2'){
    ops=[say('tua','31 tahun di bunker bawah tanah yang gelap... satu-satunya yang membuatku hidup adalah obsesi untuk bertemu denganmu lagi.','mad'),
      say('tua','Aku punya penawarnya! Tapi aku tidak akan memberikannya padamu kecuali kau membawaku ikut ke mesin waktumu!','mad'),
      {t:'choice',opts:[
        {...tagR('TOLAK & REBUT PAKSA'),label:'Rebut vial penawar itu dengan kekerasan!',goto:'r3f'},
        {...tagR('BAWA ARTHUR TUA IKUT KE 2088'),label:'Ajak Arthur Tua naik ke kapsul waktu bersamamu.',goto:'paradox'}]}];
  }else if(S.routeB2==='B1'){
    ops=[say('tua','Elena... aku membuat kesalahan fatal di 1968...','sad'),
      say('tua','Data yang kusebarkan ke publik justru disempurnakan oleh korporasi gelap menjadi racun pemusnah massal...','sad'),
      say('tua','Bukan perang yang membunuh masa depanmu... tapi kelalaianku.','sad'),
      say('narrator','[ CORRUPTED TIMELINE: Virus 2088 justru tercipta lebih awal. ]'),
      {t:'ending',kind:'loop'}];
  }else if(S.routeB2==='B2'){
    if(S.logic>S.empathy){
      ops=[say('tua','Formula murni ada di dalam bilik beku ini, Elena.','neutral'),
        say('tua','Tapi sepanjang hidupku, kau hanya memandangku sebagai pion alat laboratorium. Aku mengunci katupnya dengan DNA-ku sendiri.','mad'),
        say('tua','Masa depanmu yang dingin tidak layak untuk diselamatkan.','mad'),
        say('narrator','[ TRAGIC FAILURE: Kebencian mengunci pintu keselamatan. ]'),
        {t:'ending',kind:'loop'}];
    }else{
      ops=[say('tua','Elena... kekasihku yang datang dari masa depan...','warm'),
        say('tua','Selama 55 tahun menjaga formula di bilik kriogenik ini, cintaku padamu tak pernah pudar satu detik pun.','warm'),
        say('tua','Formula penawar murni \'Arthur Project\' telah rampung 100%.','happy'),
        {t:'choice',opts:[
          {...tagR('PILIHAN EGOIS'),label:'Ajak Arthur Tua ikut ke 2088 — tidak ada yang akan ditinggalkan.',goto:'paradox'},
          {...tagR('PILIHAN IKHLAS'),label:'Terima serum & lepaskan Arthur bereinkarnasi.',goto:'true_end'}]}];
    }
  }
  return ops;});
N('r3f',[say('tua','Kalau aku tidak bisa memilikimu, tak seorang pun di masa depan yang boleh hidup!','mad'),
  say('narrator','[ TIMELINE COLLAPSE: Formula hancur oleh dendam. ]'),{t:'ending',kind:'loop'}]);
N('paradox',[
  say('elena','Aku tidak bisa meninggalkanmu sendirian di era ini, Arthur! Masuklah ke kapsul bersamaku!','shock'),
  say('tua','Elena, tunggu! Dua kesadaran jiwa yang sama di masa depan akan memicu—','shock'),
  {t:'fx',kind:'boom'},
  say('elena','Mesin waktunya... menolak dua anomali biologis sekaligus?!','shock'),
  say('tua','Kita... terjebak dalam paradoks waktu selamanya...','sad'),
  {t:'ending',kind:'loop'}]);
N('true_end',[
  say('elena','Arthur... terima kasih untuk seluruh hidup yang kau korbankan demi masa depanku.','sad'),
  say('tua','(Tersenyum tenang) Jangan menangis, Elena. Jiwa ini akan terlelap damai...','warm'),
  say('tua','Dan suatu hari nanti, di tahun 2088... kita akan bertemu lagi sebagai dua orang biasa yang saling jatuh cinta.','happy'),
  say('elena','Selamat tinggal, Arthur... Sampai bertemu di masa depan.','warm'),
  say('narrator','Elena melompat kembali ke tahun 2088.'),
  say('narrator','Vial antibodi murni disuntikkan ke tubuh Arthur yang terbaring di ruang isolasi.'),
  say('narrator','Detak jantungnya kembali berdegup. Lingkaran kutukan waktu telah resmi terputus.'),
  {t:'fx',kind:'chime'},
  say('narrator','[ THE END - HEARTS ACROSS TIME: BREAK THE LOOP ]'),
  {t:'ending',kind:'true'}]);
