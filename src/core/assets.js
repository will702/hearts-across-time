/* ============================================================
   SPRITE CHIBI — palet dari referensi
   ============================================================ */
const PAL = {
  hairE: '#D2C49E', hairEs: '#ACA07E', skin: '#F0E4D8', skinS: '#E2D0BE',
  coat: '#FFFFFF', coatS: '#E6E1D6', dress: '#C4897F', dressS: '#AA766D', boot: '#EFE2D4', bootS: '#5C3A1E',
  eye: '#4A3226', line: '#1E1710', browE: '#8E8361',
  uniOlive: '#8B7355', uniOliveS: '#6E5A44', helmet: '#767468', helmetS: '#5C5A50',
  labBlue: '#5B7A99', pants: '#4A4A52', jacket: '#6E5A44', hairA: '#7A5B3A',
  gray: '#E4E2DA', cardigan: '#A89B82', shirtOld: '#C9C2B4', cane: '#8B4513',
  vialG: '#9FE670', vialB: '#6FD7FF'
};

/* ============================================================
   ASSET PIPELINE — PNG opsional, fallback otomatis ke prosedural
   • Karakter: spritesheet 4 kolom (frame jalan) × 8 baris (ekspresi,
     urutan EXPR_ROWS). Jangkar: tengah-bawah (kaki di y=0).
   • Latar: gambar tile horizontal seamless, jangkar bawah,
     faktor parallax sama dengan versi prosedural.
   • Semua aset OPSIONAL — file hilang/404 => game tetap jalan
     memakai gambar prosedural. Bisa mengganti sebagian saja.
   • Pixel art? tambahkan  pixel:true  pada entri manifest.
   ============================================================ */
const EXPR_ROWS = ['neutral', 'smile', 'sad', 'shock', 'angry', 'mad', 'warm', 'happy'];
/* huruf tulisan tangan ala komik perang (Patrick Hand, SIL OFL) — fallback mulus ke Trebuchet */
const F_UI = '"Patrick Hand","Trebuchet MS",sans-serif';
const F_TITLE = '"Cinzel",Georgia,serif';
const F_META = '"Poppins","Trebuchet MS",sans-serif';
const ASSET_MANIFEST = {
  elena: { src: 'assets/elena_sheet.png', fw: 150, fh: 210, h: 112 },
  arthur_muda: { src: 'assets/arthur_muda_sheet.png', fw: 150, fh: 210, h: 112 },
  arthur_dewasa: { src: 'assets/arthur_dewasa_sheet.png', fw: 150, fh: 210, h: 112 },
  arthur_buron: { src: 'assets/arthur_buron_sheet.png', fw: 150, fh: 210, h: 112 },
  arthur_tua: { src: 'assets/arthur_tua_sheet.png', fw: 150, fh: 210, h: 112 },
  bg2088_far: { src: 'assets/bg2088_far.png' }, bg2088_near: { src: 'assets/bg2088_near.png' },
  bg1944_far: { src: 'assets/bg1944_far.png', scale: 0.75, yOff: 2000 }, bg1944_mid: { src: 'assets/bg1944_mid.png', scale: 0.75, yOff: 300 },
  bg1968A_far: { src: 'assets/bg1968A_far.png', scale: 0.75, yOff: 50 }, bg1968A_mid: { src: 'assets/bg1968A_mid.png', scale: 0.75 },
  bg1968B_far: { src: 'assets/bg1968B_far.png' }, bg1968B_mid: { src: 'assets/bg1968B_mid.png', scale: 0.5 },
  bg1999_far: { src: 'assets/bg1999_far.png' }, bg1999_mid: { src: 'assets/bg1999_mid.png' },
  // lapisan foreground lukis (okluder dekat kamera; absen => fgSilhouette prosedural)
  bg2088_fg: { src: 'assets/bg2088_fg.png', h: 150 }, bg1944_fg: { src: 'assets/bg1944_fg.png', h: 200 },
  bg1968A_fg: { src: 'assets/bg1968A_fg.png', h: 150 }, bg1968B_fg: { src: 'assets/bg1968B_fg.png', h: 150 },
  bg1999_fg: { src: 'assets/bg1999_fg.png', h: 150 },
  // properti animasi strip 3 frame (sel 200px; h = tinggi tampil px)
  prop_flag1944: { src: 'assets/prop_flag1944.png', fw: 200, fh: 200, h: 132 },
  prop_barrel2088: { src: 'assets/prop_barrel2088.png', fw: 200, fh: 200, h: 86 },
  prop_lantern1944: { src: 'assets/prop_lantern1944.png', fw: 200, fh: 200, h: 94 },
  prop_beacon1968B: { src: 'assets/prop_beacon1968B.png', fw: 200, fh: 200, h: 82 },
  prop_steam1968B: { src: 'assets/prop_steam1968B.png', fw: 200, fh: 200, h: 104 },
  prop_bulb1968A: { src: 'assets/prop_bulb1968A.png', fw: 200, fh: 200, h: 108 },
  prop_radio1968A: { src: 'assets/prop_radio1968A.png', fw: 200, fh: 200, h: 74 },
  prop_consoleWave1999: { src: 'assets/prop_consoleWave1999.png', fw: 200, fh: 200, h: 82 },
  prop_poster2088: { src: 'assets/prop_poster2088.png', fw: 200, fh: 200, h: 100 },
  prop_flare1944: { src: 'assets/prop_flare1944.png', fw: 200, fh: 200, h: 104 },
  prop_frost1999: { src: 'assets/prop_frost1999.png', fw: 200, fh: 200, h: 88 },
  // pose lukis momen kunci (menggantikan sheet pada node tertentu; h = tinggi tampil px)
  pose_elena_hold: { src: 'assets/pose_elena_hold.png', h: 120 },
  pose_elena_kneel: { src: 'assets/pose_elena_kneel.png', h: 104 },
  pose_arthur_tua_reach: { src: 'assets/pose_arthur_tua_reach.png', h: 126 },
  pose_arthur_muda_vial: { src: 'assets/pose_arthur_muda_vial.png', h: 120 },
  pose_elena_resolve: { src: 'assets/pose_elena_resolve.png', h: 112 },
  // ilustrasi prolog 2088: latar narator + dua ekspresi Elena beresolusi tinggi
  bgnarator: { src: 'assets/bgnarator.png' },
  background_bawah_tanah: { src: 'assets/backgroundbawahtanah.jpg' },
  laboratorium_militer: { src: 'assets/labotariummiliter.jpg' },
  laboratorium_akhir: { src: 'assets/Labotariumakhir.jpg' },
  watch_repair_art: { src: 'assets/Arlogirusak.png' },
  rose_bottle_broken: { src: 'assets/botolmawar.png' },
  water_gem_art: { src: 'assets/permata.jpg' },
  elena_arthur_photo: { src: 'assets/fotoelenaathur.  Background.png' },
  bonus_city_complete: { src: 'assets/bonus_city_complete.jpg' },
  bonus_puzzle_board: { src: 'assets/bonus_puzzle_board.jpg' },
  title_cover_figma: { src: 'assets/title_cover_figJma.png' },
  title_start_plate: { src: 'assets/title_start_plate.png' },
  title_wordmark: { src: 'assets/llJUDULL.png' },
  time_vortex: { src: 'assets/time_vortex.png' }, // absen => pusaran ruang-waktu prosedural
  elena_dialog1: { src: 'assets/elenadialog1.png' },
  elena_dialog2_sedih: { src: 'assets/elenadialog2sedih.png' },
  // A2 potret bust dialog (opsional; absen => tak digambar, bubble tetap jalan)
  portrait_elena_neutral: { src: 'assets/portrait_elena_neutral.png', h: 290 },
  portrait_elena_sad: { src: 'assets/portrait_elena_sad.png', h: 290 },
  portrait_elena_shock: { src: 'assets/portrait_elena_shock.png', h: 290 },
  portrait_elena_warm: { src: 'assets/portrait_elena_warm.png', h: 290 },
  portrait_arthur_muda_shock: { src: 'assets/portrait_arthur_muda_shock.png', h: 290 },
  portrait_arthur_muda_warm: { src: 'assets/portrait_arthur_muda_warm.png', h: 290 },
  portrait_arthur_tua_warm: { src: 'assets/portrait_arthur_tua_warm.png', h: 290 },
  portrait_arthur_tua_sad: { src: 'assets/portrait_arthur_tua_sad.png', h: 290 },
  // bidang ilustrasi Figma untuk intro judul parallax (PNG transparan; absen => cover lama)
  intro01: { src: 'assets/onboarding/layer_01.png' }, intro02: { src: 'assets/onboarding/layer_02.png' }, intro03: { src: 'assets/onboarding/layer_03.png' },
  intro04: { src: 'assets/onboarding/layer_04.png' }, intro05: { src: 'assets/onboarding/layer_05.png' }, intro06: { src: 'assets/onboarding/layer_06.png' },
  intro07: { src: 'assets/onboarding/layer_07.png' }, intro08: { src: 'assets/onboarding/layer_08.png' }, intro09: { src: 'assets/onboarding/layer_09.png' },
  intro10: { src: 'assets/onboarding/layer_10.png' }, intro11: { src: 'assets/onboarding/layer_11.png' }, intro12: { src: 'assets/onboarding/layer_12.png' },
  intro13: { src: 'assets/onboarding/layer_13.png' }, intro14: { src: 'assets/onboarding/layer_14.png' }, intro15: { src: 'assets/onboarding/layer_15.png' },
  intro16: { src: 'assets/onboarding/layer_16.png' }, intro17: { src: 'assets/onboarding/layer_17.png' }, intro18: { src: 'assets/onboarding/layer_18.png' },
  intro19: { src: 'assets/onboarding/layer_19.png' }, intro20: { src: 'assets/onboarding/layer_20.png' },
};
// audio eksternal (CC0: Kenney RPG Audio + OpenGameArt) — absen => fitur terkait senyap, fallback prosedural
const AUDIO_MANIFEST = {
  step0: 'assets/audio/footstep00.wav', step1: 'assets/audio/footstep03.wav', step2: 'assets/audio/footstep05.wav', step3: 'assets/audio/footstep08.wav',
  flip: 'assets/audio/bookFlip1.wav', flip2: 'assets/audio/bookFlip2.wav', click: 'assets/audio/metalClick.wav', creak: 'assets/audio/creak2.wav',
  rain: 'assets/audio/rain.wav', wind: 'assets/audio/wind.wav', fire: 'assets/audio/fire.wav', hum: 'assets/audio/hum.wav'
};
const AMB_LAYER = { // loop rekaman per kind ambience: [idBuffer, volume]
  '1944': [['rain', .34], ['wind', .22]], '2088': [['wind', .26], ['fire', .24]], 'title': [['wind', .24]],
  '1968': [['hum', .15]], '1999': [['hum', .2]]
};
const AS = { imgs: {}, ok: {}, total: 0, done: 0, ready: false };
(function loadAssets() { // mulai dimuat saat halaman dibuka; layar 'load' menunggu
  const list = Object.entries(ASSET_MANIFEST); AS.total = list.length + 4; // Patrick Hand 2 subset + Cinzel + Poppins
  if (!list.length) { AS.ready = true; return; }
  let fin = 0; const end = () => { AS.done = ++fin; if (fin >= AS.total) AS.ready = true; };
  list.forEach(([id, cfg]) => {
    const im = new Image();
    im.onload = () => { AS.imgs[id] = im; AS.ok[id] = true; end(); };
    im.onerror = () => { AS.ok[id] = false; end(); }; // fallback prosedural
    im.src = cfg.src;
  });
  // font tangan (2 subset unicode-range ala Google Fonts) — gagal diblokir CORS file:// => senyap, fallback
  [['Patrick Hand','assets/fonts/patrick-hand.woff2','U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD'],
  ['Patrick Hand','assets/fonts/patrick-hand-ext.woff2','U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF'],
  ['Cinzel','assets/fonts/cinzel.ttf'],['Poppins','assets/fonts/poppins-regular.ttf']]
    .forEach(([name, src, ur]) => {
      try {
        const opt=ur?{unicodeRange:ur}:{};const f = new FontFace(name, `url('${src}')`, opt);
        f.load().then(ff => document.fonts.add(ff)).catch(() => { }).finally(end);
      } catch (e) { end(); }
    });
})();
AU.bufs = {};
function loadAudioBufs() { // unduh+dekode SFX/ambience eksternal sekali (butuh konteks audio aktif)
  Object.entries(AUDIO_MANIFEST).forEach(([id, src]) => {
    fetch(src).then(r => { if (!r.ok) throw 0; return r.arrayBuffer(); })
      .then(ab => ac().decodeAudioData(ab.slice(0)))
      .then(buf => {
        AU.bufs[id] = buf;
        const e = (AMB_LAYER[ambSet] || []).find(x => x[0] === id); if (e && !AU.muted) ambBufLoop(id, e[1]);
      }) // pasang loop yg era-nya sedang aktif
      .catch(() => { });
  });
}
function playSfxBuf(ids, vol = 1, rate = 1, filt) { // sampel CC0 (array => acak); false bila buffer belum siap
  if (AU.muted) return false; const id = Array.isArray(ids) ? ids[(Math.random() * ids.length) | 0] : ids; const b = AU.bufs[id]; if (!b) return false;
  const c = ac(), s = c.createBufferSource(); s.buffer = b; s.playbackRate.value = rate * (0.94 + Math.random() * .12);
  const v = c.createGain(); v.gain.value = vol;
  if (filt) { const f = c.createBiquadFilter(); f.type = filt[0]; f.frequency.value = filt[1]; s.connect(f); f.connect(v); } else s.connect(v);
  v.connect(AU.sfxBus || AU.master); s.start(c.currentTime); return true;
}
function ambBufLoop(id, vol) { // loop rekaman CC0 ke bus ambience (ikut stopAmb)
  const b = AU.bufs[id]; if (!b || AU.muted || !AU.ctx) return; const c = ac();
  ambNode((cc, g) => { const s = cc.createBufferSource(); s.buffer = b; s.loop = true; const v = c.createGain(); v.gain.value = vol; s.connect(v); v.connect(g); return [s]; });
}
function drawCharSheet(c, id, expr, phase, moving, opt = {}) { // false => pemanggil pakai prosedural
  const cfg = ASSET_MANIFEST[id], im = AS.imgs[id]; if (!im || !cfg || !im.width) return false;
  const cols = Math.max(1, Math.floor(im.width / cfg.fw)), rows = Math.max(1, Math.floor(im.height / cfg.fh));
  let row = EXPR_ROWS.indexOf(expr); if (row < 0 || row >= rows) row = 0;
  let col = 0, col2 = -1, blend = 0;
  if (moving && cols > 1) {
    const seq = cols > 3 ? [1, 2, 3, 2] : null, sub = phase / (Math.PI / 2), i0 = Math.floor(sub), a = sub - i0;
    const pick = k => seq ? seq[k % 4] : k % cols; col = pick(i0);
    blend = clamp((a - .7) / .3, 0, 1); if (blend > 0) col2 = pick(i0 + 1);
  } // siklus w1→w2→w3→w2 dgn cross-fade pada 30% akhir tiap substep (anti pop)
  else if (!moving && cols >= 6) { // A1 frame bicara F4/F5: mulut buka-tutup selama baris diketik
    const spk = G.speak && D.line && D.prog < 1 ? G.speak.who : null;
    const mine = id === 'elena' ? spk === 'elena'
      : !!spk && spk !== 'elena' && spk !== 'narrator' && id === 'arthur_' + (D.arKind || '');
    if (mine && !OPTS.reduceMotion) col = 4 + (Math.floor(T * 10) % 2); // ±5 flap/dtk
  }
  const s = (cfg.h || 112) / cfg.fh, dw = cfg.fw * s, dh = cfg.fh * s;
  if (opt.tremble) c.translate(Math.sin(T * 31) * .9, 0);
  else if (moving) { const st = opt.stride === undefined ? 1 : opt.stride; c.rotate(Math.sin(phase) * .03 * st); c.translate(Math.sin(phase * 2 - .4) * (0.6 + 0.5 * st), -Math.abs(Math.sin(phase)) * (1.6 + 1.4 * st)); } // bob langkah: counter-rock 1× + sway 2× melambai
  if (cfg.pixel) { c.save(); c.imageSmoothingEnabled = false; }
  if (col2 < 0) c.drawImage(im, col * cfg.fw, row * cfg.fh, cfg.fw, cfg.fh, -dw / 2, -dh, dw, dh);
  else { // lebur antar frame
    c.globalAlpha = 1 - blend; c.drawImage(im, col * cfg.fw, row * cfg.fh, cfg.fw, cfg.fh, -dw / 2, -dh, dw, dh);
    c.globalAlpha = blend; c.drawImage(im, col2 * cfg.fw, row * cfg.fh, cfg.fw, cfg.fh, -dw / 2, -dh, dw, dh); c.globalAlpha = 1;
  }
  if (cfg.pixel) c.restore();
  return true;
}
function drawVialOverlay(c, cfg) { // serum di tangan tetap digambar di atas sheet
  const s = (cfg.h || 112) / cfg.fh, dw = cfg.fw * s, dh = cfg.fh * s;
  c.save(); c.translate(dw * .13, -dh * .44); c.fillStyle = PAL.vialB; c.shadowColor = PAL.vialB; c.shadowBlur = 10; rr(c, -2.6, -7, 5.2, 10, 2.4); c.fill(); c.shadowBlur = 0; outline(c, 1.4); rr(c, -2.6, -7, 5.2, 10, 2.4); c.stroke(); c.restore();
}
function bgLayerImg(c, id, factor, camX) { // tile horizontal, jangkar bawah; false => prosedural
  const im = AS.imgs[id]; if (!im || !im.width) return false;
  const cfg = ASSET_MANIFEST[id] || {};
  const iw = im.width, ih = im.height;
  const s = cfg.scale || (cfg.h ? cfg.h / ih : (ih > H ? 0.75 : 1));
  const dw = iw * s, dh = ih * s, off = -((camX * factor) % dw);
  const posY = (H - dh) + (cfg.yOff || 0);
  for (let x = off; x < W; x += dw)c.drawImage(im, x, posY, dw, dh);
  return true;
}

function outline(c = ctx, w = 2.5) { c.strokeStyle = PAL.line; c.lineWidth = w; c.lineJoin = 'round'; c.lineCap = 'round'; }
// mata + ekspresi (pandangan 3/4 ke arah facing)
