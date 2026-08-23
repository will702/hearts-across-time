/* ============================================================
   RUNNER DIALOG
   ============================================================ */
const D = { node: null, ops: [], i: 0, line: null, prog: 0, popT: 1, choices: null, sel: 0, choiceT: 0, duckT: false, elExpr: 'neutral', arExpr: 'neutral', arKind: 'muda', ended: false };
const LOG = []; // backlog dialog (30 terakhir) — buka dengan TAB/B
function startNode(id) {
  const n = NODES[id]; D.ops = (typeof n === 'function') ? n() : n; D.i = 0; D.node = id; SAVE.seen[id] = 1; D.line = null; D.choices = null;
  D._poseBorn = {}; // tiap node: pose fade dihitung ulang
  step();
}
function step() {
  while (D.i < D.ops.length) {
    const op = D.ops[D.i++];
    if (op.t === 'say') {
      D.line = op; D.prog = 0; D.popT = 0; D.ffT = 0; G.speak = { who: op.who, t: 0 };
      // G1 kamera emosional: dorong mendekat ke pembicara saat ekspresi kuat / pose momen kunci
      if (G.state === 'dialog') {
        if (!OPTS.reduceMotion && op.who !== 'narrator' && ((op.expr && op.expr !== 'neutral') || POSES[D.node])) {
          G.zt = 1.12; G.zwx = op.who === 'elena' ? (G.walk ? G.walk.arX - 190 : W * .42) : (G.walk ? G.walk.arX : W * .62);
        }
        else if (op.who !== 'narrator') G.zt = 1;
      } // baris netral: kembali lega; narator: tahan framing
      SFX.flip(); // rustle kertas saat balon/panel baru muncul
      LOG.push({ who: op.who, text: op.text }); if (LOG.length > 30) LOG.shift();
      if (op.who === 'elena') D.elExpr = op.expr || 'neutral';
      else if (op.who === 'narrator') { }
      else D.arExpr = op.expr || 'neutral';
      return;
    }
    if (op.t === 'choice') { D.choices = op.opts; D.sel = 0; D.line = null; D.choiceT = 0; D.duckT = false; duckMusic(.5, .4); SFX.select(); return; }
    if (op.t === 'goto') { startNode(op.id); return; }
    if (op.t === 'walk') { startWalk(op.era); return; }
    if (op.t === 'item') { addStoryItem(op.id, op.label); continue; }
    if (op.t === 'fx') { if (op.kind === 'boom') { SFX.boom(); G.shakeT = OPTS.reduceMotion ? 0 : .9; G.shakeA = 9; G.whiteFlash = OPTS.reduceMotion ? .25 : 1; } if (op.kind === 'chime') SFX.chime(); continue; }
    if (op.t === 'vortex') { startVortex(op.to, false); return; }
    if (op.t === 'ending') { startPuzzleAward(op.kind); return; }
  }
}
function dialogAdvance() {
  if (D.choices) {
    const o = D.choices[D.sel]; SFX.confirm(); if (o.fx) o.fx();
    tutorialDone('dialog');
    SAVE.chosen[o.label] = 1; persistSave(); // penanda "pernah dipilih" lintas loop
    G.pulse = null; // nilai kepribadian tetap tersembunyi agar pemain memilih dari isi dialog
    G.zt = 1; D.choices = null; startNode(o.goto); return;
  }
  if (D.line) { if (D.prog < 1) { D.prog = 1; return; } D.line = null; step(); return; }
}
function updateDialog(dt, mx, my) {
  // backlog: TAB/B buka-tutup; ↑↓ gulir; ESC/klik tutup (kunci semua input dialog lain)
  if (keyOnce('Tab') || keyOnce('b') || keyOnce('B')) { G.logOpen = !G.logOpen; G.logScroll = 0; SFX.select(); return; }
  if (G.logOpen) {
    if (keyOnce('ArrowUp') || keyOnce('w')) G.logScroll = (G.logScroll || 0) + 1;
    if (keyOnce('ArrowDown') || keyOnce('s')) G.logScroll = Math.max(0, (G.logScroll || 0) - 1);
    if (keyOnce('Escape') || ptr.tap) { ptr.tap = false; G.logOpen = false; SFX.select(); }
    return;
  }
  // fast-forward: tahan CTRL/F (atau tombol ⏩ sentuh) — teks yang sudah pernah
  // dilihat dilewati otomatis; teks baru hanya diketik instan
  const ffT = IS_TOUCH && ptr.down && Math.hypot(ptr.x - 46, ptr.y - (H - 44)) < 28;
  const ff = keys['Control'] || keys['f'] || keys['F'] || ffT;
  if (D.line && !D.choices) {
    if (ff && SAVE.seen[D.node]) {
      D.prog = 1; D.ffT = (D.ffT || 0) + dt;
      if (D.ffT > .07) { D.ffT = 0; D.line = null; step(); return; }
    }
    else if (ff) D.prog = 1;
  }
  if (D.line && D.prog < 1) { D.prog = Math.min(1, D.prog + dt * 46 * OPTS.textSpd / Math.max(24, D.line.text.length)); if (Math.random() < .3) beep(900 + Math.random() * 500, .015, 'square', .012); } // ketik per-karakter (46 hps × SPD)
  if (D.line) D.popT = Math.min(1, D.popT + dt * 5.5);
  if (G.speak) G.speak.t += dt;
  // ducking musik: turun saat teks mengetik, naik lagi setelah selesai
  if (D.line && D.prog < 1 && !D.duckT) { D.duckT = true; duckMusic(.55, .3); }
  if ((!D.line || D.prog >= 1) && D.duckT) { D.duckT = false; duckMusic(.85, 1.2); }
  if (D.choices) {
    D.choiceT = Math.min(1, D.choiceT + dt * 4.5);
    if (keyOnce('ArrowUp') || keyOnce('w')) { D.sel = (D.sel + D.choices.length - 1) % D.choices.length; SFX.select(); }
    if (keyOnce('ArrowDown') || keyOnce('s')) { D.sel = (D.sel + 1) % D.choices.length; SFX.select(); }
    if (keyOnce('1')) { D.sel = 0; dialogAdvance(); return; }
    if (keyOnce('2') && D.choices && D.choices.length > 1) { D.sel = 1; dialogAdvance(); return; }
    if (keyOnce('3') && D.choices && D.choices.length > 2) { D.sel = 2; dialogAdvance(); return; }
    if (!D.choices) return;
    // hover
    let hov = -1; const bw = 560, bh = D.choices.length * 58 + 22, bx = (W - bw) / 2, by = H - bh - 24;
    D.choices.forEach((o, i) => { const oy = by + 14 + i * 58; if (mx > bx + 10 && mx < bx + bw - 10 && my > oy && my < oy + 52) hov = i; });
    if (hov >= 0 && hov !== D.sel) { D.sel = hov; SFX.select(); }
    if (ptr.tap && hov >= 0) { dialogAdvance(); ptr.tap = false; }
    if (advHit()) dialogAdvance();
  } else if (advHit() || ptr.tap) { ptr.tap = false; dialogAdvance(); }
}

/* ============================================================
   STATE: VORTEX / GLITCH / WALK / TITLE / ENDING
   ============================================================ */
const ECHO = { cur: {}, prev: {} }; // P2 gema loop: rekam jejak jalan per era; prev = siklus sebelumnya (sesi berjalan saja)
function echoKey() { return G.era === '1968' ? '1968' + S.routeB1 : G.era; }
const ERA_CONF = {
  '1944': { amb: '1944', ar: 'muda', node: 'n_b1', cap: 'BABAK 1 — GARIS DEPAN, 1944', from: 1944, len: 1450, arX: 1240 }, // tiga tableau rapat: arloji/lore → sorot → suar/Arthur
  '1968': { amb: '1968', ar: null, node: 'n_b2', cap: 'BABAK 2 — 1968', from: 1968, len: 1200, arX: 1000 },
  '1999': { amb: '1999', ar: 'tua', node: 'n_b3', cap: 'BABAK 3 — RUANG OBSERVASI KAPSUL, 1999', from: 1999, len: 1100, arX: 900 }
}; // perjalanan hanya menghubungkan temuan, challenge, dan dialog
function startVortex(to, rewind) {
  G.vortex = { to, t: 0, rewind, from: rewind ? 1999 : (G.era === '2088' ? 2088 : ERA_CONF[G.era].from) };
  G.state = 'vortex'; G.zoom = G.zt = 1; setAmbience(null); rewind ? SFX.vortexR() : SFX.vortexF();
}
function startWarIntro() {
  G.era = '1944'; G.state = 'warintro'; G.warIntro = { t: 0, reveal: 0 }; parts.length = 0;
  startNode('war_intro'); setAmbience('1944'); G.fadeIn = .42;
}
function startBunkerIntro() {
  G.era = '1968'; G.state = 'bunkerintro'; G.bunkerIntro = { t: 0, reveal: 0 }; parts.length = 0;
  startNode('bunker_intro'); setAmbience('1968'); G.fadeIn = .42;
}
function startLabIntro() {
  G.era = '1968'; G.state = 'labintro'; G.labIntro = { t: 0, reveal: 0 }; parts.length = 0;
  startNode('lab_intro'); setAmbience('1968'); G.fadeIn = .42;
}
function startFinalLabIntro() {
  G.era = '1999'; G.state = 'finallabintro'; G.finalLabIntro = { t: 0, reveal: 0 }; parts.length = 0;
  startNode('final_lab_intro'); setAmbience('1999'); G.fadeIn = .42;
}
function startGlitch() {
  G.state = 'glitch'; G.zoom = G.zt = 1;
  ECHO.prev = ECHO.cur; ECHO.cur = {}; // P2: arsipkan jejak siklus yang runtuh sebagai hantu loop berikutnya
  const CS = { A1: 'BERKAS KASUS A1 — misi ditinggalkan: penelitian tak pernah selesai', A2: 'BERKAS KASUS A2 — obsesi & paradoks mengunci masa depan', B1: 'BERKAS KASUS B1 — formula bocor, disalahgunakan jadi senjata', B2: 'BERKAS KASUS B2 — kapsul terkunci oleh kebencian' };
  G.glitch = { t: 0, hint: loopHint(), kasus: CS[S.routeB2] || 'BERKAS KASUS — timeline runtuh' };
  markEnd(S.routeB2 === 'A1' ? 'A1' : S.routeB2 === 'B1' ? 'B1' : S.routeB2 === 'B2' ? 'B2lock' : null); // rute A2 tercatat lewat node paradox/r3f
  S.loop++; SFX.glitch(); setAmbience(null); stopAmb();
  S.empathy = 0; S.logic = 0; S.routeB1 = ''; S.routeB2 = ''; S.challenges = freshChallenges(); S.inventory = {}; S.watchTargets = null; S.watchRepaired = false; S.roseRepaired = false; S.gemAligned = false; S.photoRepaired = false; // afinitas dan isi tas direset per siklus
  SAVE.game = null; // autosave siklus yg runtuh tak boleh di-Continue (akan mengembalikan kepribadian lama)
  persistSave();
}
// remah roti: setiap kegagalan memberi tahu pemain mengapa loop pecah
function loopHint() {
  if (S.routeB2 === 'A1') return '⟩ Petunjuk: kabur membuat penelitian tak pernah selesai — jangan tinggalkan misinya.';
  if (S.routeB2 === 'A2') return '⟩ Petunjuk: memaksa atau membawa Arthur Tua ke 2088 memicu paradoks — ada pilihan yang lebih ikhlas.';
  if (S.routeB2 === 'B1') return '⟩ Petunjuk: data yang bocor ke publik justru disalahgunakan — formula perlu disimpan lebih aman.';
  if (S.routeB2 === 'B2') return '⟩ Petunjuk: Arthur hanya terbuka pada kenangan yang hangat — jawablah dengan empati sejak 1944.';
  return '⟩ Petunjuk: setiap pilihanmu di masa lalu membentuk takdir 2088.';
}
const CHALLENGE_CONF = {
  // P1: mekanik berbeda per era — dodge sorot 1944 • tune sinyal 1968 • balance krio 1999
  '1944': { mode: 'dodge', x: 700, title: 'PENYEBERANGAN LAMPU SOROT', left: 'Alihkan sorot dari medis terluka', right: 'Putus daya dan menyeberang langsung', targets: [.24, .68, .43] },
  '1968': { mode: 'tune', x: 500, title: 'PENYETELAN SINYAL', left: 'Ikuti frekuensi panggilan Arthur', right: 'Isolasi pembawa data formula', targets: [.3, .72, .48] },
  '1999': { mode: 'balance', x: 590, title: 'STABILISASI KRIO', left: 'Dahulukan tanda vital Arthur', right: 'Dahulukan kemurnian serum', targets: [.66, .34, .58] }
};
const WATCH_X = 420, WATCH_START = [.68, .08, .39]; // arloji ditemukan saat traversal Babak 1, sebelum lampu sorot
function randomWatchTargets() { return WATCH_START.map(start => { let v = start; for (let n = 0; n < 12 && Math.min(Math.abs(v - start), 1 - Math.abs(v - start)) < .14; n++)v = Math.round((.04 + Math.random() * .92) * 48) / 48; return v; }); }
function watchTargets() { if (!Array.isArray(S.watchTargets) || S.watchTargets.length !== 3) S.watchTargets = randomWatchTargets(); return S.watchTargets; }
const ROSE_X = 285, ROSE_TARGET = { x: 355, y: 148, w: 250, h: 214 }; // botol pecah ditemukan sebelum penyetelan sinyal Babak 2
const GEM_X = 250, GEM_TARGET = { rx: .62, ry: -.86 }; // dua temuan wajib Babak 3, sebelum stabilisasi krio
function randomGemStart() { let p = null; for (let n = 0; n < 80; n++) { const q = { rx: -Math.PI + Math.random() * TAU, ry: -Math.PI + Math.random() * TAU }, dx = gemAngleDist(q.rx, GEM_TARGET.rx), dy = gemAngleDist(q.ry, GEM_TARGET.ry), sil = Math.abs(Math.abs(Math.cos(q.rx)) - Math.abs(Math.cos(GEM_TARGET.rx))) + Math.abs(Math.abs(Math.cos(q.ry)) - Math.abs(Math.cos(GEM_TARGET.ry))); if (dx > 1.05 && dy > 1.05 && sil > .48) { p = q; break; } } return p || { rx: GEM_TARGET.rx + 1.42, ry: GEM_TARGET.ry - 1.58 }; }
const PHOTO_X = 455, PHOTO_TARGET = { x: 270, y: 118, w: 420, h: 280 };
const PHOTO_SEAMS = [
  [[210, 0], [205, 18], [214, 34], [202, 52], [216, 70], [207, 88], [219, 107], [204, 126], [212, 140]],
  [[0, 140], [24, 136], [45, 146], [68, 137], [91, 147], [115, 135], [139, 145], [164, 137], [187, 148], [212, 140], [235, 147], [258, 136], [282, 146], [305, 137], [330, 149], [353, 139], [378, 147], [399, 136], [420, 140]],
  [[212, 140], [204, 160], [217, 180], [205, 201], [218, 222], [207, 242], [215, 261], [210, 280]]
];
const ROSE_PIECES = [
  // Delapan pecahan kaca: semua sisi retak berupa garis lurus dan berbagi titik yang sama.
  { poly: [[0, 0], [82, 0], [108, 48], [55, 73], [0, 54]], home: [-245, 15] },
  { poly: [[82, 0], [168, 0], [183, 72], [126, 108], [108, 48]], home: [-225, 115] },
  { poly: [[168, 0], [250, 0], [250, 66], [183, 72]], home: [210, 5] },
  { poly: [[250, 66], [250, 150], [178, 144], [112, 169], [126, 108], [183, 72]], home: [230, -20] },
  { poly: [[250, 150], [250, 214], [162, 214], [112, 169], [178, 144]], home: [210, 20] },
  { poly: [[162, 214], [72, 214], [58, 132], [126, 108], [112, 169]], home: [-240, 40] },
  { poly: [[72, 214], [0, 214], [0, 145], [58, 132]], home: [-250, -30] },
  { poly: [[0, 145], [0, 54], [55, 73], [108, 48], [126, 108], [58, 132]], home: [-220, -5] }];
function randomRoseHomes() {
  const order = ROSE_PIECES.map((_, i) => i); for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)), v = order[i]; order[i] = order[j]; order[j] = v; } const homes = [], used = [];
  order.forEach((idx, n) => {
    const poly = ROSE_PIECES[idx].poly, xs = poly.map(p => p[0]), ys = poly.map(p => p[1]), minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys), pw = maxX - minX, ph = maxY - minY, side = n < 4 ? 0 : 1, zx = side ? [630, 870] : [90, 330]; let box = null;
    for (let tries = 0; tries < 48; tries++) { const cx = zx[0] + pw / 2 + Math.random() * Math.max(1, zx[1] - zx[0] - pw), cy = 125 + ph / 2 + Math.random() * Math.max(1, 370 - 125 - ph), cand = { l: cx - pw / 2 - 7, r: cx + pw / 2 + 7, t: cy - ph / 2 - 7, b: cy + ph / 2 + 7, cx, cy }; if (!used.some(q => cand.l < q.r && cand.r > q.l && cand.t < q.b && cand.b > q.t)) { box = cand; break; } box = cand; }
    used.push(box); homes[idx] = [box.cx - ROSE_TARGET.x - (minX + maxX) / 2, box.cy - ROSE_TARGET.y - (minY + maxY) / 2];
  }); return homes;
}
const PHOTO_PIECES = [
  { poly: [[0, 0], [210, 0], [205, 18], [214, 34], [202, 52], [216, 70], [207, 88], [219, 107], [204, 126], [212, 140], [187, 148], [164, 137], [139, 145], [115, 135], [91, 147], [68, 137], [45, 146], [24, 136], [0, 140]], home: [-210, 30] },
  { poly: [[210, 0], [420, 0], [420, 140], [399, 136], [378, 147], [353, 139], [330, 149], [305, 137], [282, 146], [258, 136], [235, 147], [212, 140], [204, 126], [219, 107], [207, 88], [216, 70], [202, 52], [214, 34], [205, 18]], home: [210, 30] },
  { poly: [[0, 140], [24, 136], [45, 146], [68, 137], [91, 147], [115, 135], [139, 145], [164, 137], [187, 148], [212, 140], [204, 160], [217, 180], [205, 201], [218, 222], [207, 242], [215, 261], [210, 280], [0, 280]], home: [-210, 0] },
  { poly: [[212, 140], [235, 147], [258, 136], [282, 146], [305, 137], [330, 149], [353, 139], [378, 147], [399, 136], [420, 140], [420, 280], [210, 280], [215, 261], [207, 242], [218, 222], [205, 201], [217, 180], [204, 160]], home: [210, 0] }];
function addStoryItem(id, label) { S.inventory = S.inventory || {}; if (S.inventory[id]) return; S.inventory[id] = 1; G.itemToast = { id, label, t: 0 }; SFX.chime(); saveCycle(); }
function saveCycle() { SAVE.game = { era: G.era, S: { empathy: S.empathy, logic: S.logic, routeB1: S.routeB1, routeB2: S.routeB2, loop: S.loop, challenges: Object.assign({}, S.challenges), inventory: Object.assign({}, S.inventory || {}), watchTargets: Array.isArray(S.watchTargets) ? S.watchTargets.slice(0, 3) : null, watchRepaired: !!S.watchRepaired, roseRepaired: !!S.roseRepaired, gemAligned: !!S.gemAligned, photoRepaired: !!S.photoRepaired } }; persistSave(); }
function startChallenge() {
  const cfg = CHALLENGE_CONF[G.era]; if (!cfg || S.challenges[G.era]) return;
  G.state = 'challenge'; G.zoom = G.zt = 1; G.challenge = { era: G.era, stage: 'choose', sel: 0, band: 0, cursor: .5, t: 0, misses: 0, assist: false, feedback: '', feedbackT: 0, successT: 0 };
  if (cfg.mode === 'dodge') Object.assign(G.challenge, { px: 200, det: 0, bx: 484, bw: 112 });
  if (cfg.mode === 'balance') Object.assign(G.challenge, { vit: 0, vitDir: 1, ser: 0, serDir: 1, targetVit: .62, targetSer: .68, vitLocked: false, serLocked: false, step: 0 });
  G.player.vx = 0; tutorialDone('interact'); SFX.select();
}
function finishChallenge(ch) {
  if (S.challenges[ch.era]) return; const approach = ch.sel === 0 ? 'empathy' : 'logic'; S.challenges[ch.era] = approach; S[approach]++; ch.stage = 'success'; ch.successT = 0;
  for (let i = 0; i < 18; i++)parts.push({ x: W / 2 + (Math.random() - .5) * 180, y: H / 2 + 50, vx: (Math.random() - .5) * 120, vy: -35 - Math.random() * 80, grav: 55, l: 0, ml: 1.2 + Math.random(), r: 2 + Math.random() * 2, col: approach === 'empathy' ? 'rgba(240,160,170,.9)' : 'rgba(120,220,255,.9)', shrink: 1 });
  SFX.chime(); saveCycle(); tutorialDone('challenge');
}
function missChallenge(ch) {
  ch.misses++; ch.feedbackT = .9;
  ch.feedback = ch.era === '1944' ? 'TERDETEKSI — KEMBALI KE TITIK AWAL' : ch.era === '1999' ? 'GARIS BELUM PAS — KUNCI SAAT MENYENTUH AMBANG' : 'SINYAL LEPAS — COBA LAGI';
  if (ch.misses >= 3) ch.assist = true;
  if (ch.era === '1944') { ch.px = 200; ch.det = 0; }
  if (ch.era === '1999') { ch.vitLocked = false; ch.serLocked = false; ch.step = 0; }
  G.whiteFlash = OPTS.reduceMotion ? .18 : .55; G.shakeT = OPTS.reduceMotion ? 0 : .22; G.shakeA = 5; SFX.flash();
}
function updateChallenge(dt) {
  const ch = G.challenge, cfg = CHALLENGE_CONF[ch.era]; ch.t += dt; if (ch.feedbackT > 0) ch.feedbackT -= dt;
  if (ch.stage === 'success') { ch.successT += dt; if (ch.successT > 1.05) { G.state = 'walk'; G.player.x = cfg.x + 65; G.challenge = null; G.fadeIn = .28; } return; }
  if (ch.stage === 'choose') {
    if (keyOnce('ArrowLeft') || keyOnce('a') || keyOnce('A')) { ch.sel = 0; SFX.select(); }
    if (keyOnce('ArrowRight') || keyOnce('d') || keyOnce('D')) { ch.sel = 1; SFX.select(); }
    if (ptr.tap && ptr.y > 285 && ptr.y < 390) { ch.sel = ptr.x < W / 2 ? 0 : 1; ptr.tap = false; ch.stage = 'play'; ch.t = 0; SFX.confirm(); return; }
    if (advHit()) { ch.stage = 'play'; ch.t = 0; SFX.confirm(); } return;
  }
  // hold zona bawah layar (sentuh) untuk dodge/balance — sama dengan zona jalan
  const touchDir = (IS_TOUCH && ptr.down && ptr.y > H - 120) ? (ptr.x < W / 2 ? -1 : 1) : 0;
  if (cfg.mode === 'dodge') { // P1: lari antar karung; sekali tersapu sorot di ruang terbuka langsung kembali ke awal
    const spd = ch.assist ? 128 : 178, bx = 190 + ((Math.sin(ch.t * (ch.assist ? .6 : .92)) + 1) / 2) * 580, bw = ch.assist ? 150 : 112;
    let dir = 0; if (keys['ArrowLeft'] || keys['a'] || keys['A']) dir--; if (keys['ArrowRight'] || keys['d'] || keys['D']) dir++; dir += touchDir;
    ch.bx = bx; ch.bw = bw;
    ch.px = clamp(ch.px + dir * spd * dt, 190, 764);
    const inCover = [300, 480, 660].some(cx => Math.abs(ch.px - cx) < 36), inBeam = Math.abs(ch.px - bx) < bw / 2;
    ch.cover = inCover;
    if (inBeam && !inCover) { ch.det = .42; missChallenge(ch); return; } else ch.det = 0;
    if (ch.px >= 760) finishChallenge(ch);
    return;
  }
  if (cfg.mode === 'balance') { // 1999: tanda vital (merah) & serum (biru) bergerak cepat — kunci tepat di garis ambang target
    const spdMultiplier = ch.assist ? 0.7 : 1.0;
    if (!ch.vitLocked) {
      ch.vit += (ch.vitDir || 1) * dt * 1.6 * spdMultiplier;
      if (ch.vit >= 1) { ch.vit = 1; ch.vitDir = -1; }
      else if (ch.vit <= 0) { ch.vit = 0; ch.vitDir = 1; }
    }
    if (!ch.serLocked) {
      ch.ser += (ch.serDir || 1) * dt * 2.1 * spdMultiplier;
      if (ch.ser >= 1) { ch.ser = 1; ch.serDir = -1; }
      else if (ch.ser <= 0) { ch.ser = 0; ch.serDir = 1; }
    }
    const win = ch.assist ? 0.16 : 0.10;
    if (advHit() || ptr.tap) {
      ptr.tap = false;
      if (ch.step === 0) {
        if (Math.abs(ch.vit - (ch.targetVit || .62)) <= win) {
          ch.vitLocked = true; ch.step = 1; SFX.confirm();
          ch.feedback = 'VITAL MERAH TERKUNCI (1/2)'; ch.feedbackT = .7;
        } else missChallenge(ch);
      } else {
        if (Math.abs(ch.ser - (ch.targetSer || .68)) <= win) {
          ch.serLocked = true; SFX.confirm(); finishChallenge(ch);
        } else missChallenge(ch);
      }
    }
    return;
  }
  // tune (1968) — penanda otomatis bergerak bolak-balik (ping-pong) kiri-kanan
  const win = ch.assist ? .13 : .075, target = cfg.targets[ch.band];
  ch.dir = ch.dir || 1;
  ch.cursor += ch.dir * dt * (ch.assist ? .42 : .75);
  if (ch.cursor >= 1) { ch.cursor = 1; ch.dir = -1; }
  else if (ch.cursor <= 0) { ch.cursor = 0; ch.dir = 1; }
  let d = 0; if (keys['ArrowLeft'] || keys['a'] || keys['A']) d--; if (keys['ArrowRight'] || keys['d'] || keys['D']) d++;
  if (d) { ch.cursor = clamp(ch.cursor + d * dt * .5, 0, 1); if (d > 0) ch.dir = 1; else ch.dir = -1; }
  const touchLock = ptr.tap && ptr.y > 350; if (ptr.tap && ptr.y < 350) { ch.cursor = clamp((ptr.x - 190) / 580, 0, 1); ptr.tap = false; }
  if (advHit() || touchLock) { ptr.tap = false; if (Math.abs(ch.cursor - target) <= win) { ch.band++; SFX.confirm(); ch.feedback = 'TERKUNCI ' + ch.band + '/3'; ch.feedbackT = .65; if (ch.band >= 3) finishChallenge(ch); } else missChallenge(ch); }
}
function startWatchRepair() {
  if (S.watchRepaired) return; G.state = 'watchrepair'; G.zoom = G.zt = 1; G.player.vx = 0;
  G.watchRepair = { ring: 0, angles: WATCH_START.slice(), locked: [false, false, false], t: 0, misses: 0, assist: false, feedback: '', feedbackT: 0, stage: 'play', successT: 0 }; watchTargets(); tutorialDone('interact'); SFX.select();
}
function updateWatchRepair(dt) {
  const wr = G.watchRepair; if (!wr) return; wr.t += dt; if (wr.feedbackT > 0) wr.feedbackT -= dt;
  if (wr.stage === 'success') { wr.successT += dt; if (wr.successT > 1.15) { G.state = 'walk'; G.player.x = WATCH_X + 58; G.watchRepair = null; G.fadeIn = .24; } return; }
  let d = 0; if (keys['ArrowLeft'] || keys['a'] || keys['A']) d--; if (keys['ArrowRight'] || keys['d'] || keys['D']) d++;
  if (d) wr.angles[wr.ring] = (wr.angles[wr.ring] + d * dt * (wr.assist ? .28 : .42) + 1) % 1;
  let lock = advHit(), tapLock = false; if (ptr.tap) {
    const dx = ptr.x - W / 2, dy = ptr.y - 276, r = Math.hypot(dx, dy);
    if (r < 132 && r > 24) { wr.angles[wr.ring] = (Math.atan2(dy, dx) / TAU + .25 + 1) % 1; ptr.tap = false; }
    else if (ptr.y > 374) { tapLock = true; ptr.tap = false; }
  }
  lock = lock || tapLock; if (!lock) return;
  const a = wr.angles[wr.ring], target = watchTargets()[wr.ring], dist = Math.min(Math.abs(a - target), 1 - Math.abs(a - target)), win = wr.assist ? .11 : .06;
  if (dist <= win) {
    wr.locked[wr.ring] = true; wr.ring++; wr.feedback = 'RODA ' + wr.ring + '/3 SELARAS'; wr.feedbackT = .7; SFX.confirm();
    if (wr.ring >= 3) { wr.stage = 'success'; wr.successT = 0; S.watchRepaired = true; addStoryItem('watch', 'JAM ARLOJI YANG TELAH DIPERBAIKI'); }
  }
  else { wr.misses++; wr.feedback = 'GIGI RODA BELUM SELARAS'; wr.feedbackT = .85; if (wr.misses >= 3) wr.assist = true; G.shakeT = OPTS.reduceMotion ? 0 : .18; G.shakeA = 4; SFX.flash(); }
}
function rosePointIn(poly, x, y) { let inside = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const a = poly[i], b = poly[j]; if (((a[1] > y) !== (b[1] > y)) && (x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0])) inside = !inside; } return inside; }
function startRosePuzzle() {
  if (S.roseRepaired) return; G.state = 'rosepuzzle'; G.zoom = G.zt = 1; G.player.vx = 0;
  const homes = randomRoseHomes(); G.rosePuzzle = { pieces: ROSE_PIECES.map((d, i) => ({ ox: homes[i][0], oy: homes[i][1], homeX: homes[i][0], homeY: homes[i][1], placed: false, i })), drag: -1, dx: 0, dy: 0, sel: 0, wasDown: ptr.down, t: 0, stage: 'play', successT: 0, feedback: 'SUSUN KEMBALI BOTOL MAWAR', feedbackT: 0 }; tutorialDone('interact'); SFX.select();
}
function roseTryPlace(rp, i) {
  const p = rp.pieces[i]; if (!p || p.placed) return; const near = Math.hypot(p.ox, p.oy) < 22; if (near) {
    p.ox = 0; p.oy = 0; p.placed = true; rp.feedback = 'KEPINGAN ' + (rp.pieces.filter(q => q.placed).length) + ' / ' + rp.pieces.length + ' TERPASANG'; rp.feedbackT = .8; SFX.confirm();
    if (rp.pieces.every(q => q.placed)) { rp.stage = 'success'; rp.successT = 0; S.roseRepaired = true; addStoryItem('flower', 'BOTOL MAWAR ABADI'); }
  }
  else { p.ox = p.homeX; p.oy = p.homeY; rp.feedback = 'TEPINYA BELUM MENYATU'; rp.feedbackT = .8; G.shakeT = OPTS.reduceMotion ? 0 : .14; G.shakeA = 3; SFX.flash(); }
}
function updateRosePuzzle(dt) {
  const rp = G.rosePuzzle; if (!rp) return; rp.t += dt; if (rp.feedbackT > 0) rp.feedbackT -= dt;
  if (rp.stage === 'success') { rp.successT += dt; if (rp.successT > 1.2) { G.state = 'walk'; G.player.x = ROSE_X + 58; G.rosePuzzle = null; G.fadeIn = .24; } return; }
  for (let n = 0; n < ROSE_PIECES.length; n++)if (keyOnce(String(n + 1)) && !rp.pieces[n].placed) { rp.sel = n; SFX.select(); }
  let dx = 0, dy = 0; if (keys['ArrowLeft'] || keys['a'] || keys['A']) dx--; if (keys['ArrowRight'] || keys['d'] || keys['D']) dx++; if (keys['ArrowUp'] || keys['w'] || keys['W']) dy--; if (keys['ArrowDown'] || keys['s'] || keys['S']) dy++;
  const sp = rp.pieces[rp.sel]; if (sp && !sp.placed && (dx || dy)) { sp.ox += dx * dt * 165; sp.oy += dy * dt * 165; }
  if ((keyOnce(' ') || keyOnce('Spacebar') || keyOnce('Enter')) && sp && !sp.placed) roseTryPlace(rp, rp.sel);
  if (ptr.tap && rp.drag < 0) { for (let i = rp.pieces.length - 1; i >= 0; i--) { const p = rp.pieces[i]; if (p.placed) continue; const lx = ptr.x - ROSE_TARGET.x - p.ox, ly = ptr.y - ROSE_TARGET.y - p.oy; if (rosePointIn(ROSE_PIECES[i].poly, lx, ly)) { rp.drag = i; rp.sel = i; rp.dx = ptr.x - p.ox; rp.dy = ptr.y - p.oy; SFX.select(); break; } } ptr.tap = false; }
  if (ptr.down && rp.drag >= 0) { const p = rp.pieces[rp.drag]; p.ox = ptr.x - rp.dx; p.oy = ptr.y - rp.dy; }
  if (rp.wasDown && !ptr.down && rp.drag >= 0) { const i = rp.drag; rp.drag = -1; roseTryPlace(rp, i); } rp.wasDown = ptr.down;
}
function gemAngleDist(a, b) { return Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b))); }
function finishGemAlign(ga) { if (ga.stage === 'success') return; ga.stage = 'success'; ga.successT = 0; ga.feedback = 'BAYANGAN DAN PERMATA TELAH SELARAS'; S.gemAligned = true; addStoryItem('water_gem', 'PERMATA AIR'); }
function gemTryAlign(ga) { const dx = gemAngleDist(ga.rx, GEM_TARGET.rx), dy = gemAngleDist(ga.ry, GEM_TARGET.ry), win = ga.assist ? 1.45 : 2.75; if (dx < win && dy < win) finishGemAlign(ga); else { ga.misses++; ga.feedback = 'PANTULAN BELUM MENYATU DENGAN BAYANGAN'; ga.feedbackT = .9; if (ga.misses >= 3) ga.assist = true; G.shakeT = OPTS.reduceMotion ? 0 : .13; G.shakeA = 3; SFX.flash(); } }
function resetGemPosition(ga) { ga.rx = ga.startRx; ga.ry = ga.startRy; ga.drag = false; ga.feedback = 'POSISI PERMATA DIULANG'; ga.feedbackT = .85; SFX.select(); }
function startGemAlign() { if (S.gemAligned) return; const start = randomGemStart(); G.state = 'gemalign'; G.zoom = G.zt = 1; G.player.vx = 0; G.gemAlign = { rx: start.rx, ry: start.ry, startRx: start.rx, startRy: start.ry, drag: false, lastX: 0, lastY: 0, wasDown: ptr.down, t: 0, misses: 0, assist: false, feedback: 'PUTAR PERMATA HINGGA COCOK DENGAN BAYANGANNYA', feedbackT: 0, stage: 'play', successT: 0 }; tutorialDone('interact'); SFX.select(); }
function updateGemAlign(dt) {
  const ga = G.gemAlign; if (!ga) return; ga.t += dt; if (ga.feedbackT > 0) ga.feedbackT -= dt;
  if (ga.stage === 'success') { ga.successT += dt; if (ga.successT > 1.2) { G.state = 'walk'; G.player.x = GEM_X + 58; G.gemAlign = null; G.fadeIn = .24; } return; }
  if (keyOnce('r') || keyOnce('R') || (ptr.tap && ptr.x > 692 && ptr.x < 828 && ptr.y > 112 && ptr.y < 146)) { ptr.tap = false; resetGemPosition(ga); return; }
  let dx = 0, dy = 0; if (keys['ArrowLeft'] || keys['a'] || keys['A']) dx--; if (keys['ArrowRight'] || keys['d'] || keys['D']) dx++; if (keys['ArrowUp'] || keys['w'] || keys['W']) dy--; if (keys['ArrowDown'] || keys['s'] || keys['S']) dy++;
  if (dx || dy) { ga.ry += dx * dt * (ga.assist ? 1.25 : 1.65); ga.rx += dy * dt * (ga.assist ? 1.25 : 1.65); }
  if (ptr.tap && ptr.x > 270 && ptr.x < 690 && ptr.y > 135 && ptr.y < 380) { ga.drag = true; ga.lastX = ptr.x; ga.lastY = ptr.y; ptr.tap = false; SFX.select(); }
  if (ptr.down && ga.drag) { ga.ry += (ptr.x - ga.lastX) * .012; ga.rx += (ptr.y - ga.lastY) * .012; ga.lastX = ptr.x; ga.lastY = ptr.y; }
  if (ga.wasDown && !ptr.down && ga.drag) { ga.drag = false; gemTryAlign(ga); }
  ga.wasDown = ptr.down;
  if (advHit()) { gemTryAlign(ga); return; }
  if (ptr.tap && ptr.y > 400) { ptr.tap = false; gemTryAlign(ga); }
}
function photoPointIn(poly, x, y) { return rosePointIn(poly, x, y); }
function startPhotoPuzzle() { if (S.photoRepaired) return; G.state = 'photopuzzle'; G.zoom = G.zt = 1; G.player.vx = 0; G.photoPuzzle = { pieces: PHOTO_PIECES.map((d, i) => ({ ox: d.home[0], oy: d.home[1], placed: false, i })), drag: -1, dx: 0, dy: 0, sel: 0, wasDown: ptr.down, t: 0, stage: 'assemble', glue: [false, false, false], glueTrace: [0, 0, 0], glueSel: 0, successT: 0, feedback: 'RAPIKAN EMPAT ROBEKAN FOTO', feedbackT: 0 }; tutorialDone('interact'); SFX.select(); }
function photoTryPlace(pp, i) {
  const p = pp.pieces[i]; if (!p || p.placed) return; if (Math.hypot(p.ox, p.oy) < 42) { p.ox = 0; p.oy = 0; p.placed = true; pp.feedback = 'ROBEKAN ' + pp.pieces.filter(q => q.placed).length + ' / 4 TERPASANG'; pp.feedbackT = .75; SFX.confirm(); if (pp.pieces.every(q => q.placed)) { pp.stage = 'glue'; pp.feedback = 'FOTO TERSUSUN — REKATKAN TIGA GARIS ROBEKAN'; pp.feedbackT = 1.4; pp.drag = -1; } }
  else { const h = PHOTO_PIECES[i].home; p.ox = h[0]; p.oy = h[1]; pp.feedback = 'TEPI FOTO BELUM COCOK'; pp.feedbackT = .8; G.shakeT = OPTS.reduceMotion ? 0 : .13; G.shakeA = 3; SFX.flash(); }
}
function photoGlueLine(pp, hit) { if (hit < 0 || hit > 2 || pp.glue[hit]) return; pp.glue[hit] = true; pp.glueSel = hit; pp.feedback = 'GARIS ' + pp.glue.filter(Boolean).length + ' / 3 TEREKAT'; pp.feedbackT = .75; SFX.confirm(); if (pp.glue.every(Boolean)) { pp.stage = 'success'; pp.successT = 0; S.photoRepaired = true; addStoryItem('arthur_photo', 'FOTO ELENA & ARTHUR'); } }
function photoBitCount(v) { let n = 0; for (; v; v >>>= 1)n += v & 1; return n; }
function photoGluePoint(pp, x, y) { let hit = -1, best = 999, along = 0; PHOTO_SEAMS.forEach((s, i) => { if (pp.glue[i]) return; let total = 0; for (let n = 1; n < s.length; n++)total += Math.hypot(s[n][0] - s[n - 1][0], s[n][1] - s[n - 1][1]); let walked = 0; for (let n = 1; n < s.length; n++) { const a = s[n - 1], b = s[n], ax = PHOTO_TARGET.x + a[0], ay = PHOTO_TARGET.y + a[1], bx = PHOTO_TARGET.x + b[0], by = PHOTO_TARGET.y + b[1], vx = bx - ax, vy = by - ay, len = Math.hypot(vx, vy), t = clamp(((x - ax) * vx + (y - ay) * vy) / (len * len), 0, 1), d = Math.hypot(x - (ax + vx * t), y - (ay + vy * t)); if (d < best) { best = d; hit = i; along = (walked + len * t) / total; } walked += len; } }); if (hit < 0 || best > 28) return; const bit = 1 << clamp(Math.floor(along * 10), 0, 9); pp.glueTrace[hit] |= bit; pp.glueSel = hit; const done = photoBitCount(pp.glueTrace[hit]), pct = Math.round(done * 10); pp.feedback = 'GARIS ' + (hit + 1) + ' DILEM ' + pct + '%'; pp.feedbackT = .16; if (done >= 6) photoGlueLine(pp, hit); }
function updatePhotoPuzzle(dt) {
  const pp = G.photoPuzzle; if (!pp) return; pp.t += dt; if (pp.feedbackT > 0) pp.feedbackT -= dt;
  if (pp.stage === 'success') { pp.successT += dt; if (pp.successT > 1.25) { G.state = 'walk'; G.player.x = PHOTO_X + 58; G.photoPuzzle = null; G.fadeIn = .24; } return; }
  if (pp.stage === 'glue') { if (keyOnce('ArrowLeft') || keyOnce('ArrowUp')) pp.glueSel = (pp.glueSel + 2) % 3; if (keyOnce('ArrowRight') || keyOnce('ArrowDown')) pp.glueSel = (pp.glueSel + 1) % 3; if (advHit()) photoGlueLine(pp, pp.glueSel); if (ptr.down) photoGluePoint(pp, ptr.x, ptr.y); pp.wasDown = ptr.down; return; }
  for (let n = 0; n < 4; n++)if (keyOnce(String(n + 1)) && !pp.pieces[n].placed) { pp.sel = n; SFX.select(); }
  let dx = 0, dy = 0; if (keys['ArrowLeft'] || keys['a'] || keys['A']) dx--; if (keys['ArrowRight'] || keys['d'] || keys['D']) dx++; if (keys['ArrowUp'] || keys['w'] || keys['W']) dy--; if (keys['ArrowDown'] || keys['s'] || keys['S']) dy++; const sp = pp.pieces[pp.sel]; if (sp && !sp.placed && (dx || dy)) { sp.ox += dx * dt * 170; sp.oy += dy * dt * 170; } if (advHit() && sp && !sp.placed) photoTryPlace(pp, pp.sel);
  if (ptr.tap && pp.drag < 0) { for (let i = pp.pieces.length - 1; i >= 0; i--) { const p = pp.pieces[i]; if (p.placed) continue; const lx = ptr.x - PHOTO_TARGET.x - p.ox, ly = ptr.y - PHOTO_TARGET.y - p.oy; if (photoPointIn(PHOTO_PIECES[i].poly, lx, ly)) { pp.drag = i; pp.sel = i; pp.dx = ptr.x - p.ox; pp.dy = ptr.y - p.oy; SFX.select(); break; } } ptr.tap = false; }
  if (ptr.down && pp.drag >= 0) { const p = pp.pieces[pp.drag]; p.ox = ptr.x - pp.dx; p.oy = ptr.y - pp.dy; } if (pp.wasDown && !ptr.down && pp.drag >= 0) { const i = pp.drag; pp.drag = -1; photoTryPlace(pp, i); } pp.wasDown = ptr.down;
}
function startWalk(era) {
  G.era = era; G.state = 'walk'; G.zoom = G.zt = 1; const cfg = ERA_CONF[era];
  if (era === '1944') watchTargets(); // target baru dibuat saat Babak 1 dimulai, lalu dipertahankan oleh autosave siklus
  G.echoSeg = 0; G.echoT = 0; G.echoRec = []; // P2: mulai rekam jejak untuk gema loop berikutnya
  G.walk = {
    era, len: cfg.len, arX: cfg.arX, ar: era === '1968' ? (S.routeB1 === 'A' ? 'buron' : 'dewasa') : cfg.ar, node: cfg.node, hot: null, watchHot: false, roseHot: false, gemHot: false, photoHot: false, diaryHot: false, diaryRead: era !== '1968',
    cap: era === '1968' ? (S.routeB1 === 'A' ? 'BABAK 2 — BUNKER BAWAH TANAH, 1968' : 'BABAK 2 — LABORATORIUM MILITER, 1968') : cfg.cap
  };
  G.player.x = 90; G.player.facingRight = true; G.player.vx = 0; G.player.stride = 0; G.player.turnT = 0; G.player.acc = 0; G.diary = null; G.caption = G.walk.cap; G.captionT = 3.2; parts.length = 0;
  setAmbience(cfg.amb);
  saveCycle(); // autosave, termasuk hasil mini-game per siklus
}
function startEndCard() { G.state = 'endcard'; G.zoom = G.zt = 1; G.endCard = { t: 0 }; SFX.chime(); setAmbience('1999'); setSong('end'); duckMusic(1, 1.2); SAVE.game = null; persistSave(); }
function endingPuzzleKey(kind) { if (kind !== 'loop') return 'true'; if (D.node === 'r3f') return 'rebut'; if (D.node === 'paradox') return 'paradox'; return S.routeB2 === 'A1' ? 'A1' : S.routeB2 === 'B1' ? 'B1' : S.routeB2 === 'B2' ? 'B2lock' : null; }
function startPuzzleAward(kind) { const key = endingPuzzleKey(kind), fresh = key && !SAVE.endings[key]; markEnd(key); G.state = 'puzzleaward'; G.zoom = G.zt = 1; G.puzzleAward = { key, fresh, t: 0, next: kind, total: puzzleCount() }; SAVE.game = null; persistSave(); SFX.chime(); duckMusic(.72, .7); }
function finishPuzzleAward() { const pa = G.puzzleAward; if (!pa) return; const next = pa.next; G.puzzleAward = null; if (next === 'loop') startGlitch(); else startEndCard(); }
/* ============================================================
   BONUS EPILOG MINIGAMES (Simpul 1: Perbedaan, 2: Mawar, 3: Meja Makan, 4: Kucing, 5: Gelas Cinta)
   ============================================================ */
const BONUS_POPUP_CLOSE = { x: 840, y: 68, w: 68, h: 40 };
function bonusPopupCloseHit() { const b = BONUS_POPUP_CLOSE; return ptr.tap && ptr.x >= b.x - 6 && ptr.x <= b.x + b.w + 6 && ptr.y >= b.y - 6 && ptr.y <= b.y + b.h + 6; }
const BONUS_REWARDS = [
  { id: 'watch', icon: '◷', label: 'ARLOJI' },
  { id: 'flower', icon: '✿', label: 'BUNGA MAWAR' },
  { id: 'date_menu', icon: '▤', label: 'LIST MAKANAN NGEDATE' },
  { id: 'arthur_cat', icon: '♟', label: 'KUCING PELIHARAAN ARTHUR' },
  { id: 'love_potion', icon: '♥', label: 'RAMUAN CINTA' }
];
function completeBonusNode(index) { const reward = BONUS_REWARDS[index]; if (!reward || G.bonus.lit[index]) return; G.bonus.lit[index] = 1; addStoryItem(reward.id, reward.label); }
const DIFF_IMAGE_RECT = { x: 40, y: 56, w: 880, h: 400 };
// Koordinat dinormalisasi terhadap seluruh aset 2752×1536, bukan terhadap tiap panel.
// Setiap pasangan menunjuk objek yang sama pada panel A dan B.
const DIFF_SPOTS = [
  { a: [.251, .290], b: [.730, .290], r: 18 }, // pasangan bintang di langit atas
  { a: [.058, .462], b: [.534, .462], r: 20 }, // bintang di sisi kiri
  { a: [.293, .407], b: [.745, .407], r: 20 }, // lubang kunci / bintang biru
  { a: [.465, .391], b: [.905, .391], r: 22 }, // bintang besar / bulan sabit
  { a: [.432, .547], b: [.894, .547], r: 20 }, // jarum vertikal di sisi kanan
  { a: [.465, .544], b: [.945, .544], r: 21 }, // roda gigi / jam paling kanan
  { a: [.171, .706], b: [.632, .706], r: 19 }, // roda gigi kecil dekat meja
  { a: [.065, .785], b: [.541, .785], r: 22 }, // jarum jam sudut kiri bawah
  { a: [.185, .775], b: [.660, .775], r: 21 }, // roda gigi besar di tepi bawah
  { a: [.472, .703], b: [.952, .742], r: 22 }  // cahaya / bintang sudut kanan bawah
];

function startBonusDiff() {
  G.bonusDiff = G.bonus.drafts.diff || {
    found: new Array(10).fill(false),
    t: 0, done: false, successT: 0,
    feedback: 'CARI 10 PERBEDAAN DI ANTARA KEDUA GAMBAR', feedbackT: 0
  };
  delete G.bonus.drafts.diff;
  SFX.select();
}

function updateBonusDiff(dt) {
  const bd = G.bonusDiff; if (!bd) return;
  bd.t += dt; if (bd.feedbackT > 0) bd.feedbackT -= dt;
  if (bonusPopupCloseHit()) { ptr.tap = false; if (bd.done) completeBonusNode(0); else G.bonus.drafts.diff = bd; G.bonusDiff = null; SFX.select(); return; }
  if (bd.done) {
    bd.successT += dt;
    if ((advHit() || ptr.tap || bd.successT > 1.8) && bd.successT > 0.4) {
      ptr.tap = false;
      completeBonusNode(0);
      delete G.bonus.drafts.diff;
      G.bonusDiff = null;
      SFX.chime();
    }
    return;
  }
  if (keyOnce('Escape')) { G.bonusDiff = null; SFX.select(); return; }
  if (ptr.tap) {
    ptr.tap = false;
    const { x: imgX, y: imgY, w: imgW, h: imgH } = DIFF_IMAGE_RECT;
    if (ptr.x >= imgX && ptr.x <= imgX + imgW && ptr.y >= imgY && ptr.y <= imgY + imgH) {
      const rx = (ptr.x - imgX) / imgW, ry = (ptr.y - imgY) / imgH;
      let hit = -1;
      DIFF_SPOTS.forEach((spot, i) => {
        if (bd.found[i]) return;
        const da = Math.hypot((rx - spot.a[0]) * imgW, (ry - spot.a[1]) * imgH);
        const db = Math.hypot((rx - spot.b[0]) * imgW, (ry - spot.b[1]) * imgH);
        if (da < spot.r || db < spot.r) hit = i;
      });
      if (hit >= 0) {
        bd.found[hit] = true;
        const count = bd.found.filter(Boolean).length;
        bd.feedback = 'PERBEDAAN DITEMUKAN: ' + count + ' / 10';
        bd.feedbackT = .8;
        SFX.confirm();
        if (count >= 10) {
          bd.done = true; bd.successT = 0;
          bd.feedback = 'BERHASIL! 10 PERBEDAAN DITEMUKAN — JAM ARLOJI MASUK KE TAS!';
          SFX.chime();
        }
      }
    }
  }
}

const ROSE_HOMES = [{ x: 160, y: 180 }, { x: 190, y: 320 }, { x: 770, y: 180 }, { x: 740, y: 320 }, { x: 480, y: 380 }];
const ROSE_TARGET_BOUQUET = { x: 480, y: 250 };

function startBonusRose() {
  G.bonusRose = G.bonus.drafts.rose || {
    roses: ROSE_HOMES.map((h, i) => ({ x: h.x, y: h.y, placed: false, id: i })),
    drag: -1, dx: 0, dy: 0, stage: 'gather', hiddenNumber: '2088', inputStr: '',
    t: 0, done: false, successT: 0,
    feedback: 'SERET KELIMA KELOPAK MAWAR KE TENGAH BUKET', feedbackT: 0
  };
  delete G.bonus.drafts.rose;
  SFX.select();
}

function updateBonusRose(dt) {
  const br = G.bonusRose; if (!br) return;
  br.t += dt; if (br.feedbackT > 0) br.feedbackT -= dt;
  if (bonusPopupCloseHit()) { ptr.tap = false; if (br.done) completeBonusNode(1); else G.bonus.drafts.rose = br; G.bonusRose = null; SFX.select(); return; }
  if (br.done) {
    br.successT += dt;
    if ((advHit() || ptr.tap || br.successT > 1.8) && br.successT > 0.4) {
      ptr.tap = false;
      completeBonusNode(1);
      delete G.bonus.drafts.rose;
      G.bonusRose = null;
      SFX.chime();
    }
    return;
  }
  if (keyOnce('Escape')) { G.bonusRose = null; SFX.select(); return; }

  if (br.stage === 'gather') {
    if (ptr.tap && br.drag < 0) {
      br.roses.forEach((r, i) => {
        if (!r.placed && Math.hypot(ptr.x - r.x, ptr.y - r.y) < 40) {
          br.drag = i; br.dx = ptr.x - r.x; br.dy = ptr.y - r.y; SFX.select();
        }
      });
      ptr.tap = false;
    }
    if (ptr.down && br.drag >= 0) {
      const r = br.roses[br.drag]; r.x = ptr.x - br.dx; r.y = ptr.y - br.dy;
    }
    if (br.wasDown && !ptr.down && br.drag >= 0) {
      const r = br.roses[br.drag]; br.drag = -1;
      if (Math.hypot(r.x - ROSE_TARGET_BOUQUET.x, r.y - ROSE_TARGET_BOUQUET.y) < 95) {
        r.x = ROSE_TARGET_BOUQUET.x + (Math.random() - .5) * 30;
        r.y = ROSE_TARGET_BOUQUET.y + (Math.random() - .5) * 30;
        r.placed = true; SFX.confirm();
        const placed = br.roses.filter(q => q.placed).length;
        br.feedback = 'MAWAR DISATUKAN: ' + placed + ' / 5'; br.feedbackT = .8;
        if (placed >= 5) {
          br.stage = 'number';
          br.feedback = 'KETIK ANGKA TERSEMBUNYI PADA GAMBAR MAWAR2 (TEKAN ENTER)';
          br.feedbackT = 2.0; SFX.chime();
        }
      }
    }
    br.wasDown = ptr.down;
  } else if (br.stage === 'number') {
    for (let i = 0; i <= 9; i++) {
      if (keyOnce(String(i))) {
        if (br.inputStr.length < 6) { br.inputStr += String(i); SFX.select(); }
      }
    }
    if (keyOnce('Backspace')) {
      br.inputStr = br.inputStr.slice(0, -1); SFX.select();
    }

    const checkSubmit = () => {
      if (br.inputStr.trim() === br.hiddenNumber) {
        br.done = true; br.successT = 0;
        br.feedback = 'ANGKA TERSEMBUNYI ' + br.hiddenNumber + ' BENAR! BUKET MAWAR MASUK KE TAS!';
        SFX.chime();
      } else {
        br.feedback = br.inputStr.length > 0 ? 'ANGKA ' + br.inputStr + ' SALAH — PERHATIKAN MAWAR2' : 'KETIK ANGKA TERSEMBUNYI DAHULU';
        br.feedbackT = 1.1; SFX.flash();
      }
    };

    if (keyOnce('Enter')) { checkSubmit(); return; }

    if (ptr.tap) {
      ptr.tap = false;
      const keypad = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '⌫', '✓'];
      keypad.forEach((k, idx) => {
        const bx = W / 2 - 195 + (idx % 6) * 65;
        const by = idx < 6 ? 388 : 430;
        if (ptr.x > bx && ptr.x < bx + 55 && ptr.y > by && ptr.y < by + 36) {
          if (k === '⌫') {
            br.inputStr = br.inputStr.slice(0, -1); SFX.select();
          } else if (k === '✓') {
            checkSubmit();
          } else {
            if (br.inputStr.length < 6) { br.inputStr += k; SFX.select(); }
          }
        }
      });
    }
  }
}

const DINNER_PEOPLE = ['Adi', 'Budi', 'Citra', 'Dina'];
const DINNER_FOODS = [
  { id: 'steak', label: 'Steak', asset: 'food_steak' },
  { id: 'spaghetti', label: 'Spaghetti', asset: 'food_spaghetti' },
  { id: 'udang', label: 'Udang Keju', asset: 'food_udang' },
  { id: 'nasi', label: 'Nasi Goreng', asset: 'food_nasi' }
];
const DINNER_SEAT_X = [378, 529, 680, 836], DINNER_HEAD_Y = 125, DINNER_FOOD_Y = 340;
const DINNER_NAME_TRAY = [{ x: 28, y: 302 }, { x: 145, y: 302 }, { x: 28, y: 339 }, { x: 145, y: 339 }];
const DINNER_FOOD_TRAY = [{ x: 28, y: 390 }, { x: 145, y: 390 }, { x: 28, y: 452 }, { x: 145, y: 452 }];

function startBonusDinner() {
  G.bonusDinner = G.bonus.drafts.dinner || {
    people: new Array(4).fill(null), foods: new Array(4).fill(null),
    drag: null, wasDown: false, t: 0, done: false, successT: 0,
    feedback: 'SERET NAMA KE KEPALA DAN MAKANAN KE MEJA'
  };
  delete G.bonus.drafts.dinner;
  SFX.select();
}

function dinnerComplete(bd) { return bd.people.every(Boolean) && bd.foods.every(Boolean); }
function dinnerValid(bd) {
  const adi = bd.people.indexOf('Adi'), budi = bd.people.indexOf('Budi'), citra = bd.people.indexOf('Citra'), dina = bd.people.indexOf('Dina');
  const steak = bd.foods.indexOf('steak'), spaghetti = bd.foods.indexOf('spaghetti');
  return bd.foods[0] === 'nasi' && citra === 3 && (dina === 0 || dina === 3) && adi >= 0 && steak >= 0 && adi < steak &&
    Math.abs(spaghetti - budi) === 1 && bd.foods[adi] !== 'udang' && bd.foods[adi] !== 'nasi';
}
function dinnerCheck(bd) {
  if (!dinnerComplete(bd)) return;
  if (dinnerValid(bd)) {
    bd.done = true; bd.successT = 0;
    bd.feedback = 'SUSUNAN BENAR!'; SFX.chime();
  } else {
    bd.feedback = 'BELUM TEPAT — PERIKSA KEMBALI SEMUA PETUNJUK'; SFX.flash();
  }
}
function dinnerTakeAt(bd, x, y) {
  for (let i = 3; i >= 0; i--) {
    if (bd.people[i] && Math.abs(x - DINNER_SEAT_X[i]) < 54 && Math.abs(y - DINNER_HEAD_Y) < 25) {
      const id = bd.people[i]; bd.people[i] = null; return { kind: 'person', id, x, y };
    }
    if (bd.foods[i] && Math.abs(x - DINNER_SEAT_X[i]) < 54 && Math.abs(y - DINNER_FOOD_Y) < 36) {
      const id = bd.foods[i]; bd.foods[i] = null; return { kind: 'food', id, x, y };
    }
  }
  for (let i = 0; i < 4; i++) {
    const np = DINNER_NAME_TRAY[i];
    if (!bd.people.includes(DINNER_PEOPLE[i]) && x > np.x && x < np.x + 105 && y > np.y && y < np.y + 29) return { kind: 'person', id: DINNER_PEOPLE[i], x, y };
    const fp = DINNER_FOOD_TRAY[i];
    if (!bd.foods.includes(DINNER_FOODS[i].id) && x > fp.x && x < fp.x + 105 && y > fp.y && y < fp.y + 52) return { kind: 'food', id: DINNER_FOODS[i].id, x, y };
  }
  return null;
}
function dinnerDrop(bd) {
  const d = bd.drag; if (!d) return;
  const targetY = d.kind === 'person' ? DINNER_HEAD_Y : DINNER_FOOD_Y;
  let seat = -1, best = 1e9;
  DINNER_SEAT_X.forEach((x, i) => { const dist = Math.hypot(d.x - x, d.y - targetY); if (dist < best) { best = dist; seat = i; } });
  if (seat >= 0 && best < (d.kind === 'person' ? 70 : 78)) {
    const slots = d.kind === 'person' ? bd.people : bd.foods;
    slots[seat] = d.id; SFX.confirm();
  } else SFX.select();
  bd.drag = null; dinnerCheck(bd);
}
function updateBonusDinner(dt) {
  const bd = G.bonusDinner; if (!bd) return;
  bd.t += dt;
  if (bonusPopupCloseHit()) { ptr.tap = false; if (bd.done) completeBonusNode(2); else G.bonus.drafts.dinner = bd; G.bonusDinner = null; SFX.select(); return; }
  if (bd.done) {
    bd.successT += dt;
    if ((advHit() || ptr.tap) && bd.successT > .45) {
      ptr.tap = false; completeBonusNode(2); delete G.bonus.drafts.dinner; G.bonusDinner = null; SFX.chime();
    }
    return;
  }
  if (keyOnce('Escape')) { G.bonusDinner = null; SFX.select(); return; }
  if (ptr.tap && !bd.drag) {
    bd.drag = dinnerTakeAt(bd, ptr.x, ptr.y); ptr.tap = false;
    if (bd.drag) SFX.select();
  }
  if (ptr.down && bd.drag) { bd.drag.x = ptr.x; bd.drag.y = ptr.y; }
  if (bd.wasDown && !ptr.down && bd.drag) dinnerDrop(bd);
  bd.wasDown = ptr.down;
}

const CATS_IMAGE_RECT = { x: 24, y: 62, w: 690, h: 386 };
// Pusat kucing dikalibrasi terhadap bidang foto yang tampil; klik langsung menambah hitungan.
const CAT_SPOTS = [
  [.190, .215], [.180, .520], [.103, .655], [.294, .625], [.630, .300],
  [.765, .287], [.843, .323], [.815, .447], [.907, .505], [.699, .661],
  [.843, .629], [.923, .658], [.461, .730], [.564, .750],
  [.271, .816], [.340, .816], [.181, .835], [.840, .835]
];
function startBonusCats() {
  const saved = G.bonus.drafts.cats;
  G.bonusCats = saved && saved.marked.length === CAT_SPOTS.length ? saved : { marked: new Array(CAT_SPOTS.length).fill(false), t: 0, done: false, successT: 0, feedback: 'KLIK SETIAP KUCING UNTUK MENGHITUNG' };
  delete G.bonus.drafts.cats;
  SFX.select();
}
function updateBonusCats(dt) {
  const bc = G.bonusCats; if (!bc) return; bc.t += dt;
  if (bonusPopupCloseHit()) { ptr.tap = false; if (bc.done) completeBonusNode(3); else G.bonus.drafts.cats = bc; G.bonusCats = null; SFX.select(); return; }
  if (bc.done) {
    bc.successT += dt;
    if ((advHit() || ptr.tap) && bc.successT > .45) { ptr.tap = false; completeBonusNode(3); delete G.bonus.drafts.cats; G.bonusCats = null; SFX.chime(); }
    return;
  }
  if (keyOnce('Escape')) { G.bonusCats = null; SFX.select(); return; }
  if (!ptr.tap) return;
  const x = ptr.x, y = ptr.y; ptr.tap = false;
  const r = CATS_IMAGE_RECT;
  if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) {
    let hit = -1, best = 1e9;
    CAT_SPOTS.forEach((spot, i) => { const d = Math.hypot(x - (r.x + spot[0] * r.w), y - (r.y + spot[1] * r.h)); if (!bc.marked[i] && d < 25 && d < best) { hit = i; best = d; } });
    if (hit >= 0) {
      bc.marked[hit] = true; const n = bc.marked.filter(Boolean).length; bc.feedback = 'KUCING DITEMUKAN: ' + n + ' / ' + CAT_SPOTS.length; SFX.confirm();
      if (n === CAT_SPOTS.length) { bc.done = true; bc.successT = 0; bc.feedback = 'SEMUA KUCING BERHASIL DITEMUKAN!'; SFX.chime(); }
    }
    return;
  }
}

const CHEM_ITEMS = [
  { id: 'watch', label: 'ARLOJI', asset: 'watch_repair_art' },
  { id: 'rose', label: 'GELAS MAWAR', asset: 'rose_bottle_broken' },
  { id: 'gem', label: 'PECAHAN PERMATA', asset: 'water_gem_art' }
];
const CHEM_ITEM_RECTS = [{ x: 92, y: 414, w: 220, h: 72 }, { x: 370, y: 414, w: 220, h: 72 }, { x: 648, y: 414, w: 220, h: 72 }];
function startBonusChem() {
  G.bonusChem = G.bonus.drafts.chem || { order: [], t: 0, done: false, successT: 0, feedback: 'MASUKKAN BENDA DALAM URUTAN YANG TEPAT' };
  delete G.bonus.drafts.chem; SFX.select();
}
function chemChoose(bc, id) {
  if (bc.order.includes(id)) return;
  const expected = CHEM_ITEMS[bc.order.length].id;
  if (id !== expected) {
    bc.order = []; bc.feedback = 'URUTAN SALAH — MULAI LAGI DARI ARLOJI'; SFX.flash(); return;
  }
  bc.order.push(id); bc.feedback = CHEM_ITEMS[bc.order.length - 1].label + ' BERHASIL DIMASUKKAN'; SFX.confirm();
  if (bc.order.length === CHEM_ITEMS.length) { bc.done = true; bc.successT = 0; bc.feedback = 'GELAS CINTA BERHASIL DICIPTAKAN!'; SFX.chime(); }
}
function updateBonusChem(dt) {
  const bc = G.bonusChem; if (!bc) return; bc.t += dt;
  if (bonusPopupCloseHit()) { ptr.tap = false; if (bc.done) completeBonusNode(4); else G.bonus.drafts.chem = bc; G.bonusChem = null; SFX.select(); return; }
  if (bc.done) {
    bc.successT += dt;
    if ((advHit() || ptr.tap) && bc.successT > .45) { ptr.tap = false; completeBonusNode(4); delete G.bonus.drafts.chem; G.bonusChem = null; SFX.chime(); }
    return;
  }
  if (keyOnce('Escape')) { G.bonus.drafts.chem = bc; G.bonusChem = null; SFX.select(); return; }
  if (!ptr.tap) return;
  const x = ptr.x, y = ptr.y; ptr.tap = false;
  CHEM_ITEM_RECTS.forEach((r, i) => { if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) chemChoose(bc, CHEM_ITEMS[i].id); });
}

function startBonus() { if (!puzzleComplete()) return; resetAll(); G.state = 'bonus'; G.era = '2088'; G.zoom = G.zt = 1; G.fadeIn = .65; G.bonus = { x: 72, vx: 0, cam: 0, lit: {}, drafts: {}, near: -1, done: false, t: 0 }; G.player.facingRight = true; G.player.phase = 0; G.player.moving = false; G.player.stride = 0; setAmbience('2088'); setSong('end'); }
function updateBonus(dt) {
  if (G.bonusDiff) { updateBonusDiff(dt); return; }
  if (G.bonusRose) { updateBonusRose(dt); return; }
  if (G.bonusDinner) { updateBonusDinner(dt); return; }
  if (G.bonusCats) { updateBonusCats(dt); return; }
  if (G.bonusChem) { updateBonusChem(dt); return; }

  const b = G.bonus, WORLD = 1220; let dir = 0; if (keys['ArrowLeft'] || keys['a'] || keys['A']) dir--; if (keys['ArrowRight'] || keys['d'] || keys['D']) dir++;
  if (IS_TOUCH && ptr.down && ptr.y > H - 130) { if (ptr.x < 140) dir = -1; else if (ptr.x > W - 140) dir = 1; }
  const sprint = keys['Shift'], top = sprint ? 245 : 155; b.vx += clamp(dir * top - b.vx, -850 * dt, 850 * dt); if (!dir) b.vx -= clamp(b.vx, -1250 * dt, 1250 * dt);
  if (dir && dir > 0 !== G.player.facingRight) G.player.facingRight = dir > 0; b.x = clamp(b.x + b.vx * dt, 55, WORLD - 55); G.player.phase += Math.abs(b.vx) * dt * .105; G.player.moving = Math.abs(b.vx) > 8; G.player.stride = clamp(Math.abs(b.vx) / 245, 0, 1);
  b.cam = lerp(b.cam, clamp(b.x - 300, 0, WORLD - W), 1 - Math.pow(.002, dt)); b.t += dt;
  const nodes = [150, 365, 580, 795, 1010], near = nodes.findIndex((x, i) => !b.lit[i] && Math.abs(b.x - x) < 55); b.near = near;
  const act = keyOnce('ArrowDown') || keyOnce('s') || keyOnce('S') || advHit() || touchActHit();
  if (near >= 0 && act) {
    ptr.tap = false;
    if (near === 0 && !b.lit[0]) { startBonusDiff(); return; }
    if (near === 1 && !b.lit[1]) { startBonusRose(); return; }
    if (near === 2 && !b.lit[2]) { startBonusDinner(); return; }
    if (near === 3 && !b.lit[3]) { startBonusCats(); return; }
    if (near === 4 && !b.lit[4]) { startBonusChem(); return; }
    b.lit[near] = 1; SFX.chime(); G.whiteFlash = OPTS.reduceMotion ? .12 : .35;
  }
  const n = Object.keys(b.lit).length; b.done = n >= nodes.length;
  if (b.done && Math.abs(b.x - 1145) < 70 && act) { ptr.tap = false; G.state = 'bonusend'; G.bonusEnd = { t: 0, page: 0 }; SAVE.bonusSeen = true; persistSave(); SFX.chime(); return; }
  if (ptr.tap) ptr.tap = false;
}
function resetAll() {
  S.empathy = 0; S.logic = 0; S.routeB1 = ''; S.routeB2 = ''; S.loop = 0; S.challenges = freshChallenges(); S.inventory = {}; S.watchTargets = null; S.watchRepaired = false; S.roseRepaired = false; S.gemAligned = false; S.photoRepaired = false;
  D.elExpr = 'neutral'; D.arExpr = 'neutral'; D.duckT = false; D.choiceT = 0; D.popT = 1; G.speak = null; G.diary = null; G.challenge = null; G.watchRepair = null; G.rosePuzzle = null; G.gemAlign = null; G.photoPuzzle = null; G.itemToast = null; G.gameIntro = null; G.prologueT = 0; G.warIntro = null; G.bunkerIntro = null; G.labIntro = null; G.finalLabIntro = null; G.puzzleAward = null; G.bonus = null; G.bonusEnd = null; G.bonusDiff = null; G.bonusRose = null; G.bonusDinner = null; G.bonusCats = null; G.bonusChem = null; parts.length = 0;
}
function startPrologue() { G.gameIntro = null; G.state = 'prologue'; G.prologueT = 0; G.fadeIn = .55; startNode('prologue'); setAmbience('2088'); SFX.heart(); }
function beginNewCycle() { resetAll(); SAVE.game = null; persistSave(); G.state = 'gameintro'; G.gameIntro = { page: 0, t: 0, pageT: 0 }; G.fadeIn = .7; setAmbience('2088'); }
function gameIntroMove(d) { const gi = G.gameIntro, n = 3, np = clamp(gi.page + d, 0, n - 1); if (np === gi.page) { if (d > 0 && gi.page === n - 1) startPrologue(); return; } gi.page = np; gi.pageT = 0; }
function updateGameIntro(dt) {
  const gi = G.gameIntro; gi.t += dt; gi.pageT += dt;
  if (keyOnce('ArrowLeft') || keyOnce('ArrowUp') || keyOnce('a') || keyOnce('A')) { gameIntroMove(-1); SFX.select(); }
  else if (keyOnce('ArrowRight') || keyOnce('ArrowDown') || keyOnce('d') || keyOnce('D')) { gameIntroMove(1); SFX.select(); }
  else if (keyOnce('Escape')) { SFX.confirm(); startPrologue(); }
  else if (advHit()) { SFX.confirm(); gameIntroMove(1); }
  if (!G.gameIntro) return;
  if (ptr.tap) {
    const x = ptr.x, y = ptr.y; ptr.tap = false;
    if (x > 700 && x < 820 && y > 91 && y < 125) { SFX.confirm(); startPrologue(); return; }
    if (y > 416 && y < 459 && x > 180 && x < 390) { SFX.select(); gameIntroMove(-1); return; }
    if (y > 416 && y < 459 && x > 570 && x < 790) { SFX.confirm(); gameIntroMove(1); return; }
  }
}
function titleMenu() {
  return [{ label: 'LANJUTKAN', disabled: !SAVE.game, act: () => { Object.assign(S, SAVE.game.S || {}); normalizeRun(); G.fadeIn = 1; startWalk(SAVE.game.era || '1944'); } },
  { label: 'SIKLUS BARU', act: () => { if (SAVE.game) { G.titleConfirm = true; G.confirmSel = 0; } else beginNewCycle(); } },
  { label: 'PUTAR ULANG INTRO', act: () => { G.titleConfirm = false; playIntroVideo(); } },
  { label: puzzleComplete() ? 'GAMEPLAY TERAKHIR' : 'GAMEPLAY TERAKHIR  🔒 ' + puzzleCount() + '/' + END_TOTAL.length, disabled: !puzzleComplete(), act: startBonus }];
}
function updateTitle() {
  const items = titleMenu();
  if (G.titleConfirm) {
    if (keyOnce('ArrowLeft') || keyOnce('a') || keyOnce('A')) G.confirmSel = 0; if (keyOnce('ArrowRight') || keyOnce('d') || keyOnce('D')) G.confirmSel = 1;
    if (ptr.tap && ptr.y > 330 && ptr.y < 390) { G.confirmSel = ptr.x < W / 2 ? 0 : 1; ptr.tap = false; if (G.confirmSel === 0) beginNewCycle(); else G.titleConfirm = false; }
    if (advHit()) { if ((G.confirmSel || 0) === 0) beginNewCycle(); else G.titleConfirm = false; } return;
  }
  if (keyOnce('ArrowUp') || keyOnce('w') || keyOnce('W')) { do { G.titleSel = (G.titleSel + items.length - 1) % items.length; } while (items[G.titleSel].disabled); SFX.select(); }
  if (keyOnce('ArrowDown') || keyOnce('s') || keyOnce('S')) { do { G.titleSel = (G.titleSel + 1) % items.length; } while (items[G.titleSel].disabled); SFX.select(); }
  if (ptr.tap) { let i = -1; if (ptr.x > 132 && ptr.x < 382 && ptr.y > 320 && ptr.y < 432) i = Math.floor((ptr.y - 320) / 39); else if (ptr.x > 754 && ptr.x < 942 && ptr.y > 440 && ptr.y < 480) i = 3; if (i >= 0) { ptr.tap = false; if (items[i] && !items[i].disabled) { G.titleSel = i; SFX.confirm(); items[i].act(); } return; } }
  if (advHit()) { const it = items[G.titleSel]; if (it && !it.disabled) { SFX.confirm(); it.act(); } }
}

/* ---------- update per-state ---------- */
const SPD = [.5, 1, 2], SPD_N = ['LAMBAT', 'NORMAL', 'CEPAT'];
const TSZ = [1, 1.22], TSZ_N = ['NORMAL', 'BESAR'];
function spdIdx() { const i = SPD.indexOf(OPTS.textSpd); return i < 0 ? 1 : i; }
function tszIdx() { const i = TSZ.indexOf(OPTS.textScale); return i < 0 ? 0 : i; }
// jeda: beku kan state + musik/ambience turun otomatis (naik lagi saat lanjut)
function setPaused(on) {
  if (G.paused === on) return; G.paused = on;
  duckMusic(on ? .12 : .85, on ? .3 : .8);
  if (AU.ambBus && AU.ctx) {
    const t = AU.ctx.currentTime; AU.ambBus.gain.cancelScheduledValues(t); AU.ambBus.gain.setValueAtTime(AU.ambBus.gain.value, t);
    AU.ambBus.gain.linearRampToValueAtTime(on ? .04 : .9 * vGain(OPTS.volSfx), t + .4);
  }
}
function pauseItems() {
  return [
    { label: '▶ LANJUTKAN', act: () => { setPaused(false); } },
    { label: 'VOLUME MASTER  ‹ ' + Math.round(OPTS.vol * 100) + '% ›', adj: d => { OPTS.vol = clamp(Math.round((OPTS.vol + d * .1) * 10) / 10, 0, 1); applyVol(); saveOpts(); } },
    { label: 'MUSIK  ‹ ' + Math.round((OPTS.volMus === undefined ? 1 : OPTS.volMus) * 100) + '% ›', adj: d => { OPTS.volMus = clamp(Math.round(((OPTS.volMus === undefined ? 1 : OPTS.volMus) + d * .1) * 10) / 10, 0, 1); applyVol(); saveOpts(); } },
    { label: 'EFEK & AMBIENSI  ‹ ' + Math.round((OPTS.volSfx === undefined ? 1 : OPTS.volSfx) * 100) + '% ›', adj: d => { OPTS.volSfx = clamp(Math.round(((OPTS.volSfx === undefined ? 1 : OPTS.volSfx) + d * .1) * 10) / 10, 0, 1); applyVol(); saveOpts(); } },
    { label: 'KECEPATAN TEKS  ‹ ' + SPD_N[spdIdx()] + ' ›', adj: d => { OPTS.textSpd = SPD[(spdIdx() + d + SPD.length) % SPD.length]; saveOpts(); } },
    { label: 'UKURAN TEKS  ‹ ' + TSZ_N[tszIdx()] + ' ›', adj: d => { OPTS.textScale = TSZ[(tszIdx() + d + TSZ.length) % TSZ.length]; saveOpts(); } },
    { label: 'EFEK SINEMATIK  ‹ ' + (OPTS.reduceMotion ? 'MATI' : ' ON') + ' ›', adj: d => { OPTS.reduceMotion = !OPTS.reduceMotion; saveOpts(); } },
    { label: 'ULANG DARI 1944', act: () => { setPaused(false); resetAll(); G.fadeIn = 1; startVortex('1944', false); } },
    { label: 'KEMBALI KE MENU UTAMA', act: () => { setPaused(false); G.state = 'title'; G.t = 0; G.titleT = 8.4; G.titleReady = true; G.titleSel = SAVE.game ? 0 : 1; setAmbience('title'); } },
  ];
}
function updatePause() {
  const items = pauseItems();
  if (keyOnce('Escape')) { setPaused(false); SFX.select(); return; }
  if (keyOnce('ArrowUp') || keyOnce('w') || keyOnce('W')) { G.pSel = (G.pSel + items.length - 1) % items.length; SFX.select(); }
  if (keyOnce('ArrowDown') || keyOnce('s') || keyOnce('S')) { G.pSel = (G.pSel + 1) % items.length; SFX.select(); }
  if (keyOnce('ArrowLeft') || keyOnce('-') || keyOnce('a') || keyOnce('A')) { if (items[G.pSel].adj) { items[G.pSel].adj(-1); SFX.select(); } }
  if (keyOnce('ArrowRight') || keyOnce('+') || keyOnce('=') || keyOnce('d') || keyOnce('D')) { if (items[G.pSel].adj) { items[G.pSel].adj(1); SFX.select(); } }
  if (keyOnce('Enter') || keyOnce(' ')) { const it = items[G.pSel]; SFX.confirm(); if (it.act) it.act(); }
  if (ptr.tap) {
    const bw = 460, bh = items.length * 44 + 56, bx = (W - bw) / 2, by = (H - bh) / 2;
    items.forEach((it, i) => {
      const iy = by + 40 + i * 44;
      if (ptr.x > bx && ptr.x < bx + bw && ptr.y > iy && ptr.y < iy + 38) {
        SFX.confirm();
        if (it.adj) it.adj(ptr.x > bx + bw / 2 ? 1 : -1); else if (it.act) it.act();
      }
    });
    ptr.tap = false;
  }
}
function update(dt) {
  T += dt; G.t += dt;
  if (G.tutorialFade > 0) G.tutorialFade = Math.max(0, G.tutorialFade - dt * 1.4);
  if (G.itemToast) { G.itemToast.t += dt; if (G.itemToast.t > 3.2) G.itemToast = null; }
  if (G.pulse) { G.pulse.t += dt; if (G.pulse.t > 1.5) G.pulse = null; }
  if (G.whiteFlash > 0) G.whiteFlash -= dt * 2.2;
  if (G.skyFlash > 0) G.skyFlash -= dt * 1.4;
  if (G.shakeT > 0) G.shakeT -= dt;
  if (G.captionT > 0) G.captionT -= dt;
  if (G.fadeIn > 0) G.fadeIn = Math.max(0, G.fadeIn - dt * 1.4); // transisi masuk dari hitam
  G.zoom = lerp(G.zoom, G.zt, 1 - Math.pow(.0015, dt)); // G1: ease eksponensial dorongan kamera emosional
  const mx = ptr.x, my = ptr.y;
  // hotspot UI pojok (mute/pause) via klik atau sentuhan — dicek DI SINI karena ptr.tap dibersihkan sebelum render()
  if (ptr.tap && Math.hypot(ptr.x - (W - 34), ptr.y - 26) < 20) { toggleMute(); ptr.tap = false; }
  else if (ptr.tap && !G.paused && (G.state === 'walk' || G.state === 'challenge' || G.state === 'watchrepair' || G.state === 'rosepuzzle' || G.state === 'gemalign' || G.state === 'photopuzzle' || G.state === 'dialog' || G.state === 'prologue' || G.state === 'warintro' || G.state === 'bunkerintro' || G.state === 'labintro' || G.state === 'finallabintro' || G.state === 'bonus') && Math.hypot(ptr.x - (W - 72), ptr.y - 26) < 20) { ptr.tap = false; setPaused(true); G.pSel = 0; SFX.select(); }
  if (G.paused) { updatePause(); }
  else if (keyOnce('Escape') && !G.logOpen && (G.state === 'walk' || G.state === 'challenge' || G.state === 'watchrepair' || G.state === 'rosepuzzle' || G.state === 'gemalign' || G.state === 'photopuzzle' || G.state === 'dialog' || G.state === 'prologue' || G.state === 'warintro' || G.state === 'bunkerintro' || G.state === 'labintro' || G.state === 'finallabintro' || G.state === 'bonus')) { setPaused(true); G.pSel = 0; SFX.select(); }
  else switch (G.state) {
    case 'load':
      if (AS.ready) { G.state = 'title'; G.titleReady = !!SAVE.introDone || !!OPTS.reduceMotion; G.titleT = G.titleReady ? 8.4 : 0; G.titleSel = SAVE.game ? 0 : 1; }
      break;
    case 'title':
      setAmbOnce('title');
      if (!G.titleReady) {
        G.titleT += dt; if (OPTS.reduceMotion || G.titleT >= 8.4) { G.titleT = 8.4; G.titleReady = true; SAVE.introDone = true; persistSave(); }
        else if (advHit() || ptr.tap) { ptr.tap = false; G.titleT = 8.4; G.titleReady = true; SAVE.introDone = true; persistSave(); SFX.select(); } break;
      }
      updateTitle();
      break;
    case 'gameintro':
      updateGameIntro(dt); break;
    case 'prologue':
      G.prologueT += dt;
      if ((T % 2.4) < dt) SFX.heart();
      updateDialog(dt, mx, my); break;
    case 'warintro': {
      const wi = G.warIntro; wi.t += dt;
      if (wi.t < 3.25) { if (advHit() || ptr.tap) { ptr.tap = false; wi.t = 3.25; SFX.select(); } }
      else { wi.reveal = Math.min(1, wi.reveal + dt * 2.5); updateDialog(dt, mx, my); }
      break;
    }
    case 'bunkerintro': {
      const bi = G.bunkerIntro; bi.t += dt;
      if (bi.t < 4.6) { if (advHit() || ptr.tap) { ptr.tap = false; bi.t = 4.6; SFX.select(); } }
      else { bi.reveal = Math.min(1, bi.reveal + dt * 2.2); updateDialog(dt, mx, my); }
      break;
    }
    case 'labintro': {
      const li = G.labIntro; li.t += dt;
      if (li.t < 4.6) { if (advHit() || ptr.tap) { ptr.tap = false; li.t = 4.6; SFX.select(); } }
      else { li.reveal = Math.min(1, li.reveal + dt * 2.2); updateDialog(dt, mx, my); }
      break;
    }
    case 'finallabintro': {
      const fi = G.finalLabIntro; fi.t += dt;
      if (fi.t < 5.2) { if (advHit() || ptr.tap) { ptr.tap = false; fi.t = 5.2; SFX.select(); } }
      else { fi.reveal = Math.min(1, fi.reveal + dt * 2.2); updateDialog(dt, mx, my); }
      break;
    }
    case 'walk': {
      setAmbOnce(ERA_CONF[G.era].amb);
      if (G.diary) { // buku harian wajib: baca seluruh halaman sebelum gerak dibuka kembali
        G.player.vx -= clamp(G.player.vx, -1400 * dt, 1400 * dt); G.player.moving = false;
        G.diary.prog = Math.min(1, G.diary.prog + dt * 2.1); G.diary.popT = Math.min(1, G.diary.popT + dt * 5);
        if (advHit() || ptr.tap || keyOnce('ArrowDown') || keyOnce('s') || keyOnce('S')) {
          ptr.tap = false;
          if (G.diary.prog < 1) G.diary.prog = 1;
          else { G.diary.i++; SFX.select(); if (G.diary.i >= G.diary.pages.length) { G.walk.diaryRead = true; G.walk.diaryHot = false; G.diary = null; SFX.confirm(); } else { G.diary.prog = 0; G.diary.popT = 0; } }
        }
        break;
      }
      if (G.lore) { // sedang membaca titik selidik: langkah berhenti halus; ENTER/↓/ketuk memajukan baris
        G.player.vx -= clamp(G.player.vx, -1400 * dt, 1400 * dt); G.player.moving = false;
        G.lore.prog = Math.min(1, G.lore.prog + dt * 2.4); G.lore.popT = Math.min(1, G.lore.popT + dt * 5);
        if (advHit() || ptr.tap || keyOnce('ArrowDown') || keyOnce('s') || keyOnce('S')) {
          ptr.tap = false;
          if (G.lore.prog < 1) G.lore.prog = 1;
          else { G.lore.i++; SFX.select(); if (G.lore.i >= G.lore.lines.length) G.lore = null; else { G.lore.prog = 0; G.lore.popT = 0; } }
        }
        break;
      }
      const p = G.player; let dir = 0;
      if (keys['ArrowRight'] || keys['d'] || keys['D']) dir += 1;
      if (keys['ArrowLeft'] || keys['a'] || keys['A']) dir -= 1;
      // tombol sentuh: ◀ ▶ gerak (zona bawah), tombol ≫ = lari
      const touchRun = IS_TOUCH && ptr.down && Math.hypot(ptr.x - (W - 36), ptr.y - (H - 162)) < 30;
      if (IS_TOUCH && ptr.down) { if (ptr.x > W - 140 && ptr.y > H - 130) dir = 1; else if (ptr.x < 140 && ptr.y > H - 130) dir = -1; }
      // model fisika: akselerasi menuju kecepatan target, gesekan saat lepas
      // loop > 0: lari jadi bawaan (Shift / tombol ≫ berbalik jadi jalan pelan)
      const sprint = keys['Shift'] || touchRun, top = (S.loop > 0 ? !sprint : sprint) ? 262 : 150, accel = 900, fric = 1400;
      const prevVx = p.vx;
      if (dir !== 0) {
        if (dir > 0 !== p.facingRight) { p.facingRight = dir > 0; p.turnT = .14; } // squash saat berbalik
        p.vx += clamp(dir * top - p.vx, -accel * dt, accel * dt);
        if (Math.abs(prevVx) < 10) parts.push({ x: p.x - G.cam, y: GROUND - 3, vx: -dir * 24, vy: -14, grav: 80, l: 0, ml: .4, r: 2.4, col: 'rgba(170,150,120,.5)', shrink: 1 }); // debu awal langkah
      } else p.vx -= clamp(p.vx, -fric * dt, fric * dt);
      if (G.era === '1944' && S.loop === 0) { if (dir !== 0 && !SAVE.tutorial.move) tutorialDone('move'); if (sprint && !SAVE.tutorial.sprint) tutorialDone('sprint'); }
      p.x = clamp(p.x + p.vx * dt, 64, G.walk.len - 40);
      G.echoT += dt; G.segT = (G.segT || 0) + dt;
      if (G.echoT >= .12) { G.echoT -= .12; if (G.echoRec.length < 600) G.echoRec.push(p.x); } // P2: sampel jejak ±8/detik (maks 72 dtk)
      // arloji berada di dunia 1944, bukan pada monolog pembuka; wajib diperbaiki sebelum lanjut
      const needWatch = G.era === '1944' && !S.watchRepaired;
      if (needWatch && p.x > WATCH_X - 34) { p.x = WATCH_X - 34; if (p.vx > 0) p.vx = 0; }
      G.walk.watchHot = needWatch && Math.abs(p.x - (WATCH_X - 34)) < 66;
      if (G.walk.watchHot && (keyOnce('ArrowDown') || keyOnce('s') || keyOnce('S') || advHit() || (ptr.tap && Math.abs(ptr.x - (WATCH_X - G.cam)) < 75) || touchActHit())) { ptr.tap = false; startWatchRepair(); break; }
      // Botol mawar adalah temuan dunia Babak 2: perjalanan tertahan sampai kepingannya kembali utuh.
      const needRose = G.era === '1968' && !S.roseRepaired;
      if (needRose && p.x > ROSE_X - 34) { p.x = ROSE_X - 34; if (p.vx > 0) p.vx = 0; }
      G.walk.roseHot = needRose && Math.abs(p.x - (ROSE_X - 34)) < 66;
      if (G.walk.roseHot && (keyOnce('ArrowDown') || keyOnce('s') || keyOnce('S') || advHit() || (ptr.tap && Math.abs(ptr.x - (ROSE_X - G.cam)) < 82) || touchActHit())) { ptr.tap = false; startRosePuzzle(); break; }
      // Babak 3: permata air ditemukan lebih dahulu, lalu foto terakhir Elena dan Arthur.
      const needGem = G.era === '1999' && !S.gemAligned;
      if (needGem && p.x > GEM_X - 34) { p.x = GEM_X - 34; if (p.vx > 0) p.vx = 0; }
      G.walk.gemHot = needGem && Math.abs(p.x - (GEM_X - 34)) < 66;
      if (G.walk.gemHot && (keyOnce('ArrowDown') || keyOnce('s') || keyOnce('S') || advHit() || (ptr.tap && Math.abs(ptr.x - (GEM_X - G.cam)) < 82) || touchActHit())) { ptr.tap = false; startGemAlign(); break; }
      const needPhoto = G.era === '1999' && S.gemAligned && !S.photoRepaired;
      if (needPhoto && p.x > PHOTO_X - 34) { p.x = PHOTO_X - 34; if (p.vx > 0) p.vx = 0; }
      G.walk.photoHot = needPhoto && Math.abs(p.x - (PHOTO_X - 34)) < 66;
      if (G.walk.photoHot && (keyOnce('ArrowDown') || keyOnce('s') || keyOnce('S') || advHit() || (ptr.tap && Math.abs(ptr.x - (PHOTO_X - G.cam)) < 90) || touchActHit())) { ptr.tap = false; startPhotoPuzzle(); break; }
      const cc = CHALLENGE_CONF[G.era];
      if (cc && !S.challenges[G.era]) {
        if (p.x > cc.x - 42) { p.x = cc.x - 42; if (p.vx > 0) p.vx = 0; } G.walk.challengeHot = Math.abs(p.x - (cc.x - 42)) < 66;
        if (G.walk.challengeHot && (keyOnce('ArrowDown') || keyOnce('s') || keyOnce('S') || advHit() || (ptr.tap && Math.abs(ptr.x - (cc.x - G.cam)) < 80) || touchActHit())) { ptr.tap = false; startChallenge(); break; }
      }
      else G.walk.challengeHot = false;
      if (G.era === '1968' && !G.walk.diaryRead && p.x > DIARY_X - 34) { p.x = DIARY_X - 34; if (p.vx > 0) p.vx = 0; } // gerbang wajib sebelum Arthur
      if ((p.x === 64 && p.vx < 0) || (p.x === G.walk.len - 40 && p.vx > 0)) p.vx = 0; // mentok dinding: nolkan dorongan
      p.acc = lerp(p.acc, (p.vx - prevVx) / Math.max(dt, 1e-4), 1 - Math.pow(.01, dt)); // pitch badan saat akselerasi
      if (dir === 0 && Math.abs(prevVx) > 140 && Math.abs(p.vx) < 10) for (let k = 0; k < 3; k++)parts.push({ x: p.x - G.cam + (Math.random() - .5) * 10, y: GROUND - 3, vx: (p.facingRight ? 1 : -1) * (14 + Math.random() * 22) + (Math.random() - .5) * 10, vy: -8 - Math.random() * 16, grav: 80, l: 0, ml: .45 + Math.random() * .2, r: 2 + Math.random() * 2, col: 'rgba(170,150,120,.5)', shrink: 1 }); // debu berhenti keras
      if (p.turnT > 0) p.turnT -= dt;
      const old = p.phase;
      p.phase += Math.abs(p.vx) * dt * .105; // irama dikunci longgar ke tanah: 1 siklus (2 langkah) ≈ 60px layar — anti-selip tanpa cadence panik (0 saat mentok dinding → tak moonwalk)
      p.moving = Math.abs(p.vx) > 8;
      p.stride = clamp(Math.abs(p.vx) / 262, 0, 1);
      if (p.moving && Math.floor(old / Math.PI) !== Math.floor(p.phase / Math.PI)) {
        SFX.step();
        for (let k = 0; k < 2; k++)parts.push({ x: p.x - G.cam + (Math.random() - .5) * 8, y: GROUND - 3, vx: -(Math.sign(p.vx) || 1) * (20 + Math.random() * 24), vy: -10 - Math.random() * 20, grav: 80, l: 0, ml: .45 + Math.random() * .25, r: 2 + Math.random() * 2, col: 'rgba(170,150,120,.5)', shrink: 1 });
      }
      G.camTarget = clamp(p.x - 300 + clamp(p.vx * .22, -75, 75), 0, G.walk.len - W); G.cam = lerp(G.cam, G.camTarget, 1 - Math.pow(.001, dt)); // look-ahead 22% kecepatan (camera-systems) di atas exp-smoothing yg sudah ada
      spawnParts(G.era); // partikel mengikuti era aktif (1999: motes biru, bukan abu 1944)
      if (G.era === '1944') { AU.boomTimer -= dt; if (AU.boomTimer <= 0) { AU.boomTimer = 6 + Math.random() * 7; G.skyFlash = 1; noise(1.4, 70, .14); } }
      // buku harian Arthur: wajib diperiksa di setiap siklus, tidak memakai SAVE.inspected permanen
      G.walk.diaryHot = G.era === '1968' && !G.walk.diaryRead && Math.abs(p.x - DIARY_X) < 76;
      if (G.walk.diaryHot && (keyOnce('ArrowDown') || keyOnce('s') || keyOnce('S') || keyOnce(' ') || keyOnce('Spacebar') || (ptr.tap && Math.hypot(ptr.x - (DIARY_X - G.cam), ptr.y - (GROUND - 30)) < 55) || touchActHit())) {
        ptr.tap = false;
        SFX.select(); G.diary = arthurDiary(); G.diary.i = 0; G.diary.prog = 0; G.diary.popT = 0; break;
      }
      // titik selidik: deteksi kedekatan + picu (↓ / S / ketuk penanda)
      const FEh = G.era === '1968' ? '1968' + S.routeB1 : G.era;
      const hs = (HOTSPOTS[FEh] || []).find(h => !SAVE.inspected[h.id] && Math.abs(p.x - h.x) < 52);
      G.walk.hot = hs || null;
      if (hs && (keyOnce('ArrowDown') || keyOnce('s') || keyOnce('S') || advHit() || (ptr.tap && Math.hypot(ptr.x - (hs.x - G.cam), ptr.y - (GROUND - 14)) < 40) || touchActHit())) {
        ptr.tap = false;
        SAVE.inspected[hs.id] = 1;
        if (loreFoundCount() >= LORE_IDS.length && !SAVE.loreToastDone) { // P3: kelima jejak lengkap → hadiah naratif sekali seumur save
          SAVE.loreToastDone = 1; persistSave(); SFX.chime();
          G.lore = {
            lines: ['[ Kelima jejak kisah Arthur kini lengkap di ingatanmu — peti obat, suar, foto sobek, pita "АРТУР-1", log kapsul berembun. ]',
              '[ Ada getar halus di udara... seakan lingkaran waktu ini mulai mengenali dirimu sedikit lebih dalam. ]'], i: 0, prog: 0, popT: 0
          };
        }
        else { persistSave(); SFX.select(); G.lore = { lines: LORE[hs.id], i: 0, prog: 0, popT: 0 }; }
        G.walk.hot = null; break;
      }
      if (p.x > G.walk.arX - 175) {
        ECHO.cur[echoKey()] = G.echoRec; G.state = 'dialog'; G.camTarget = clamp(G.walk.arX - 640, 0, G.walk.len - W);
        D.arKind = G.walk.ar; D.arExpr = 'neutral'; D.elExpr = 'neutral'; startNode(G.walk.node);
      }
      break;
    }
    case 'challenge':
      updateChallenge(dt); break;
    case 'watchrepair':
      updateWatchRepair(dt); break;
    case 'rosepuzzle':
      updateRosePuzzle(dt); break;
    case 'gemalign':
      updateGemAlign(dt); break;
    case 'photopuzzle':
      updatePhotoPuzzle(dt); break;
    case 'dialog':
      if (G.cam !== G.camTarget) G.cam = lerp(G.cam, G.camTarget, 1 - Math.pow(.002, dt));
      spawnParts(G.era === '1968' ? '1968' : G.era);
      if (G.era === '1944') { AU.boomTimer -= dt; if (AU.boomTimer <= 0) { AU.boomTimer = 6 + Math.random() * 7; G.skyFlash = 1; noise(1.4, 70, .12); } }
      updateDialog(dt, mx, my); break;
    case 'vortex': {
      G.vortex.t += dt / 2.4;
      for (let i = 0; i < 2; i++)parts.push({ x: W / 2, y: H / 2, vx: (Math.random() - .5) * 520, vy: (Math.random() - .5) * 400, l: 0, ml: .5, r: 1.4 + Math.random() * 1.6, col: G.vortex.rewind ? 'rgba(255,120,90,.8)' : 'rgba(150,225,255,.8)', shrink: 1 });
      if (G.vortex.t >= 1) {
        const to = G.vortex.to; G.vortex = null; G.whiteFlash = 1;
        if (to === '1944') startWarIntro();
        else if (to === '1968') {
          if (S.routeB1 === 'B') startLabIntro(); else startBunkerIntro();
        } else startFinalLabIntro();
      }
      break;
    }
    case 'glitch':
      G.glitch.t += dt;
      if (G.glitch.t > 1.7) { G.glitch = null; startVortex('1944', true); }
      break;
    case 'puzzleaward':
      G.puzzleAward.t += dt; if (G.puzzleAward.t > .9 && (advHit() || ptr.tap)) { ptr.tap = false; SFX.confirm(); finishPuzzleAward(); } break;
    case 'bonus':
      updateBonus(dt); break;
    case 'bonusend':
      G.bonusEnd.t += dt; if (G.bonusEnd.t > 1 && (advHit() || ptr.tap)) { ptr.tap = false; SFX.confirm(); if (G.bonusEnd.page < 1) { G.bonusEnd.page++; G.bonusEnd.t = 0; } else { G.state = 'title'; G.titleReady = true; G.titleT = 8.4; G.titleSel = 3; G.bonusEnd = null; setAmbience('title'); } } break;
    case 'endcard':
      G.endCard.t += dt;
      // sparkle hati merah muda & emas merayakan true ending
      if (Math.random() < .12) parts.push({ x: Math.random() * W, y: H + 10, vx: (Math.random() - .5) * 16, vy: -22 - Math.random() * 26, l: 0, ml: 3.5 + Math.random() * 2, r: 1 + Math.random() * 1.4, col: Math.random() < .6 ? 'rgba(228,140,150,.85)' : 'rgba(240,205,130,.85)', pulse: 1, heart: Math.random() < .45 });
      if ((G.endCard.t > 2) && (advHit() || ptr.tap)) { ptr.tap = false; SFX.confirm(); G.state = 'title'; G.t = 0; G.titleT = 8.4; G.titleReady = true; G.titleSel = 1; setAmbience('title'); }
      break;
  }
  ptr.tap = false;
  for (const k in pressed) pressed[k] = false;
}
let ambSet = '';
function setAmbOnce(k) { if (ambSet !== k) { ambSet = k; setAmbience(k); } }
const touchActHit = () => IS_TOUCH && ptr.tap && Math.abs(ptr.x - TOUCH_ACT.x) < TOUCH_ACT.w / 2 && Math.abs(ptr.y - TOUCH_ACT.y) < TOUCH_ACT.h / 2; // P6 tombol ▼ PERIKSA
