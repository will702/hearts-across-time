/* ---------- render ---------- */
function drawScene(c, cam) {
  if (cam === undefined) cam = G.cam; const t = T;
  if (G.era === '1944') bg1944(c, cam, t);
  else if (G.era === '1968') bg1968(c, cam, t, S.routeB1 === 'A');
  else if (G.era === '1999') bg1999(c, cam, t);
  else bg2088(c, cam, t);
  drawProps(c, G.era === '1968' ? (S.routeB1 === 'A' ? '1968A' : '1968B') : G.era, cam); // properti animasi era
  drawParts(c, 1 / 60);
}
function drawChars(c, mode, cam) {
  if (cam === undefined) cam = G.cam; // mode: 'walk' (dunia) | 'dialog' | 'prologue'
  const t = T, p = G.player;
  const speaking = G.speak && D.line && D.prog < 1 ? G.speak.who : null; // pantul saat bicara: prog hidup di D, bukan G
  const bnc = w => speaking === w ? Math.exp(-4.5 * G.speak.t) * Math.sin(13 * G.speak.t) * 3.5 : 0; // pantul halus karakter yang bicara
  const breathE = (mode !== 'walk' || !p.moving) ? Math.sin(T * 1.6) * 1.1 : 0; // tarikan napas idle
  const elScreenX = mode === 'walk' ? p.x - cam : (mode === 'prologue' ? W * 0.42 : (G.walk ? G.walk.arX - 190 - cam : W * 0.42));
  c.save(); c.translate(elScreenX, GROUND - bnc('elena') + breathE);c.scale(mode==='dialog'?1.16:1.1,mode==='dialog'?1.16:1.1); groundShadow(c, p.moving && mode === 'walk' ? .82 : 1);
  if (mode === 'walk' && p.turnT > 0) c.scale(1 - .18 * Math.sin(Math.PI * (1 - clamp(p.turnT / .14, 0, 1))), 1); // squash berganti arah
  if (!p.facingRight && mode === 'walk') c.scale(-1, 1);
  const pz = POSES[D.node];
  const posE = (mode === 'dialog' && pz && pz.side === 'elena' && (!pz.expr || pz.expr === D.elExpr)) ? pz.id : null; // pose lukis momen kunci (filter ekspresi opsional)
  if (posE) {
    c.save(); c.globalAlpha = poseFade(posE); const okPose = drawPoseImage(c, posE); c.restore();
    if (!okPose) drawElena(c, t, p.phase, p.moving && mode === 'walk', D.elExpr, { vial: G.state === 'endcard' || (G.state === 'dialog' && D.node === 'true_end' && D.i > 4), lean: 0, stride: 1 });
  }
  else drawElena(c, t, p.phase, p.moving && mode === 'walk', D.elExpr, { vial: G.state === 'endcard' || (G.state === 'dialog' && D.node === 'true_end' && D.i > 4), lean: mode === 'walk' ? ((p.vx / 262) * .11 + clamp((p.acc || 0) / 900, -1, 1) * .03) * (p.facingRight ? 1 : -1) : 0, stride: mode === 'walk' ? p.stride : 1 });
  c.restore();
  if (G.walk && G.walk.ar && (mode === 'walk' || mode === 'dialog') && !(mode === 'walk' && G.era === '1968' && !G.walk.diaryRead)) {
    const ax = G.walk.arX - cam;
    const ab = speaking && speaking !== 'elena' && speaking !== 'narrator' ? Math.exp(-4.5 * G.speak.t) * Math.sin(13 * G.speak.t) * 3.5 : 0;
    const breathA = Math.sin(T * 1.6 + 2.2) * 1.0; // napas idle Arthur (beda fase)
    c.save(); c.translate(ax, GROUND - ab + breathA);c.scale(mode==='dialog'?1.16:1.1,mode==='dialog'?1.16:1.1); groundShadow(c); c.scale(-1, 1); // menghadap kiri (ke Elena)
    const posA = (mode === 'dialog' && pz && pz.side === 'arthur' && (!pz.expr || pz.expr === D.arExpr)) ? pz.id :
      ((mode === 'dialog' && D.node === 'n_b3' && D.line && D.line.who === 'tua' && (D.arExpr === 'warm' || D.arExpr === 'happy')) ? 'pose_arthur_tua_reach' : null);
    if (posA) { c.globalAlpha = poseFade(posA); if (!drawPoseImage(c, posA)) { c.globalAlpha = 1; drawArthur(c, D.arKind, t, D.arExpr, { tremble: D.arKind === 'tua' && D.arExpr === 'mad' }); } c.globalAlpha = 1; }
    else drawArthur(c, D.arKind, t, D.arExpr, { tremble: D.arKind === 'tua' && D.arExpr === 'mad' });
    c.restore();
  }
}
/* ============================================================
   PROLOG 2088 — panel sinematik berdasarkan frame Figma 66:40.
   Latar bergerak dari close-up ke framing akhir; reduceMotion
   membekukan kamera tanpa mengubah komposisi dan keterbacaan.
   ============================================================ */
function drawCoverImage(c, im, zoom = 1, panX = 0, panY = 0) {
  if (!im || !im.width) return false;
  const base = Math.max(W / im.width, H / im.height), dw = im.width * base * zoom, dh = im.height * base * zoom;
  c.drawImage(im, (W - dw) / 2 + panX, (H - dh) / 2 + panY, dw, dh); return true;
}
function drawPrologueElena(c) {
  const sad = D.i <= 2, front = AS.imgs[sad ? 'elena_dialog2_sedih' : 'elena_dialog1'];
  const back = AS.imgs[sad ? 'elena_dialog1' : 'elena_dialog2_sedih'];
  if (!front || !front.width) { c.save(); c.translate(W * .5, GROUND + 2); groundShadow(c); drawElena(c, T, 0, false, sad ? 'sad' : 'neutral'); c.restore(); return; }
  // Dua file menyimpan karakter di kanvas transparan; crop ini mengambil setengah badan (waist-up).
  const sx = front.width * .345, sy = front.height * .03, sw = front.width * .31, sh = front.height * .48;
  const dh = 270, dw = dh * (sw / sh), x = W * .5 - dw * .5, y = GROUND - dh + 20;
  const born = easeO(clamp(G.prologueT / .85, 0, 1)), breath = OPTS.reduceMotion ? 0 : Math.sin(G.prologueT * 1.55) * 1.4;
  c.save(); c.globalAlpha = .25 * born; c.fillStyle = '#090706'; c.filter = 'blur(9px)'; c.beginPath(); c.ellipse(W * .5, GROUND + 2, dw * .42, 9, 0, 0, TAU); c.fill(); c.filter = 'none';
  c.globalAlpha = born; c.translate(0, breath);
  if (back && back.width && D.popT < .22) { const a = clamp(D.popT / .22, 0, 1); c.globalAlpha = born * (1 - a); c.drawImage(back, sx, sy, sw, sh, x, y, dw, dh); c.globalAlpha = born * a; }
  c.drawImage(front, sx, sy, sw, sh, x, y, dw, dh); c.restore();
}
function drawPrologueScene(c) {
  const im = AS.imgs.bgnarator, mot = OPTS.reduceMotion ? 0 : 1, p = easeO(clamp(G.prologueT / 7.5, 0, 1));
  // Kamera dimulai besar, lalu perlahan mundur untuk memperlihatkan luasnya kehancuran.
  const zoom = 1 + mot * .16 * (1 - p), panX = mot * lerp(-18, 0, p), panY = mot * lerp(12, 0, p);
  if (!drawCoverImage(c, im, zoom, panX, panY)) { bg2088(c, 0, T, .25); drawProps(c, '2088', 0); }
  // Abu di bidang dekat memberi pemisahan kedalaman terhadap ilustrasi statis.
  spawnParts('2088'); drawParts(c, 1 / 60);
  const lower = c.createLinearGradient(0, H * .56, 0, H); lower.addColorStop(0, 'rgba(8,7,6,0)'); lower.addColorStop(1, 'rgba(8,6,5,.64)'); c.fillStyle = lower; c.fillRect(0, H * .5, W, H * .5);
  drawPrologueElena(c);
  // Top Gaussian blur & smooth gradient vignette connecting seamlessly into background
  c.save();
  const topGrad = c.createLinearGradient(0, 0, 0, 210);
  topGrad.addColorStop(0, 'rgba(4,4,5,0.82)');
  topGrad.addColorStop(0.35, 'rgba(5,5,6,0.50)');
  topGrad.addColorStop(0.70, 'rgba(6,5,6,0.18)');
  topGrad.addColorStop(1, 'rgba(7,6,6,0)');
  c.fillStyle = topGrad;
  c.filter = OPTS.reduceMotion ? 'none' : 'blur(12px)';
  c.fillRect(-20, -20, W + 40, 230);
  c.restore();
}
/* ============================================================
   INTRO 1944 — empat beat kamera dari frame Figma 63:6, 64:18,
   64:20, dan 68:54 sebelum kontrol pemain diaktifkan.
   ============================================================ */
const WAR_CAM = [
  { z: 3.25, fx: .34, fy: .76 }, // detail puing, helm, dan korban
  { z: 1.86, fx: .50, fy: .43 }, // parit terbuka, ledakan mulai terungkap
  { z: 1.68, fx: .60, fy: .44 }, // ledakan menjadi pusat komposisi
  { z: 1.68, fx: .60, fy: .44 }, // tahan framing untuk kemunculan Elena
];
function warCamAt(t) {
  const q = clamp(t / 3.25, 0, 1) * (WAR_CAM.length - 1), i = Math.min(WAR_CAM.length - 2, Math.floor(q)), u = easeIO(q - i), a = WAR_CAM[i], b = WAR_CAM[i + 1];
  return { z: lerp(a.z, b.z, u), fx: lerp(a.fx, b.fx, u), fy: lerp(a.fy, b.fy, u) };
}
function drawWarIntroBg(c) {
  const im = AS.imgs.bg1944_mid; if (!im || !im.width) { bg1944(c, 0, T); return; }
  const k = OPTS.reduceMotion ? WAR_CAM[WAR_CAM.length - 1] : warCamAt(G.warIntro.t);
  const base = Math.max(W / im.width, H / im.height), dw = im.width * base * k.z, dh = im.height * base * k.z;
  c.drawImage(im, W * .5 - k.fx * dw, H * .5 - k.fy * dh, dw, dh);
  spawnParts('1944'); drawParts(c, 1 / 60);
  const vg = c.createRadialGradient(W * .5, H * .45, H * .18, W * .5, H * .45, H * .82); vg.addColorStop(0, 'rgba(12,8,6,0)'); vg.addColorStop(1, 'rgba(8,6,5,.42)'); c.fillStyle = vg; c.fillRect(0, 0, W, H);
}
function drawWarIntroElena(c) {
  const im = AS.imgs.elena_dialog1, a = easeO(G.warIntro.reveal); if (!im || !im.width) { c.save(); c.globalAlpha = a; c.translate(W * .5, GROUND + 26); c.scale(1.85, 1.85); drawElena(c, T, 0, false, 'angry'); c.restore(); return; }
  const sx = im.width * .345, sy = im.height * .03, sw = im.width * .31, sh = im.height * .48, dh = 318, dw = dh * (sw / sh);
  const y = H - dh + 18 + (1 - a) * 26, bob = OPTS.reduceMotion ? 0 : Math.sin(T * 1.45) * 1.2;
  c.save(); c.globalAlpha = a; c.translate(0, bob); c.shadowColor = 'rgba(20,8,4,.72)'; c.shadowBlur = 18; c.drawImage(im, sx, sy, sw, sh, W * .5 - dw * .5, y, dw, dh); c.restore();
}
function drawWarIntro(c) {
  drawWarIntroBg(c);
  const top = c.createLinearGradient(0, 0, 0, 190); top.addColorStop(0, 'rgba(7,5,5,.68)'); top.addColorStop(1, 'rgba(7,5,5,0)'); c.fillStyle = top; c.fillRect(0, 0, W, 190);
  if (G.warIntro.t >= 3.25) { drawWarIntroElena(c); if (D.line && G.warIntro.reveal > .15) drawNarr(c, D.line.text, D.prog, D.popT); if (D.line && D.prog >= 1) hintAdvance(c); }
  else { const p = clamp(G.warIntro.t / 3.25, 0, 1); c.textAlign = 'center'; c.fillStyle = `rgba(245,240,232,${.36 + .28 * Math.sin(T * 3)})`; c.font = 'italic 14px Georgia,serif'; c.fillText('1944 — GARIS DEPAN', W / 2, H - 30); c.fillStyle = 'rgba(245,240,232,.2)'; rr(c, W / 2 - 105, H - 19, 210, 3, 2); c.fill(); c.fillStyle = '#A85550'; rr(c, W / 2 - 105, H - 19, 210 * p, 3, 2); c.fill(); }
}
/* ============================================================
   INTRO BUNKER 1968 — frame Figma 72:124 → 72:126 → 72:135
   → 72:128. Kamera turun dari tangga lalu membuka seluruh ruang.
   ============================================================ */
const BUNKER_CAM = [
  { z: 3.25, fx: .80, fy: .28 }, // tangga spiral dan lampu bunker
  { z: 3.25, fx: .75, fy: .69 }, // turun mengikuti pipa ke lantai
  { z: 1.22, fx: .45, fy: .49 }, // ruangan bawah tanah terungkap penuh
  { z: 1.22, fx: .45, fy: .49 }, // tahan framing saat Elena masuk
];
function bunkerCamAt(t) {
  const q = clamp(t / 4.6, 0, 1) * (BUNKER_CAM.length - 1), i = Math.min(BUNKER_CAM.length - 2, Math.floor(q)), u = easeIO(q - i), a = BUNKER_CAM[i], b = BUNKER_CAM[i + 1];
  return { z: lerp(a.z, b.z, u), fx: lerp(a.fx, b.fx, u), fy: lerp(a.fy, b.fy, u) };
}
function drawBunkerIntroBg(c) {
  const im = AS.imgs.background_bawah_tanah; if (!im || !im.width) { bg1968(c, 0, T, true); return; }
  const k = OPTS.reduceMotion ? BUNKER_CAM[BUNKER_CAM.length - 1] : bunkerCamAt(G.bunkerIntro.t);
  const base = Math.max(W / im.width, H / im.height), dw = im.width * base * k.z, dh = im.height * base * k.z;
  c.drawImage(im, W * .5 - k.fx * dw, H * .5 - k.fy * dh, dw, dh);
  spawnParts('1968'); drawParts(c, 1 / 60);
  const cold = c.createLinearGradient(0, 0, W, H); cold.addColorStop(0, 'rgba(20,14,12,.25)'); cold.addColorStop(.72, 'rgba(20,48,67,.10)'); cold.addColorStop(1, 'rgba(5,12,18,.34)'); c.fillStyle = cold; c.fillRect(0, 0, W, H);
  const vg = c.createRadialGradient(W * .52, H * .46, H * .22, W * .52, H * .46, H * .8); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(5,6,8,.48)'); c.fillStyle = vg; c.fillRect(0, 0, W, H);
}
function drawBunkerIntroElena(c) {
  const im = AS.imgs.elena_dialog2_sedih, a = easeO(G.bunkerIntro.reveal); if (!im || !im.width) { c.save(); c.globalAlpha = a; c.translate(W * .5, GROUND + 18); c.scale(1.75, 1.75); drawElena(c, T, 0, false, 'sad'); c.restore(); return; }
  const sx = im.width * .345, sy = im.height * .03, sw = im.width * .31, sh = im.height * .48, dh = 292, dw = dh * (sw / sh);
  const y = H - dh + 20 + (1 - a) * 24, bob = OPTS.reduceMotion ? 0 : Math.sin(T * 1.35) * 1.1;
  c.save(); c.globalAlpha = a; c.translate(0, bob); c.shadowColor = 'rgba(2,8,14,.78)'; c.shadowBlur = 20; c.drawImage(im, sx, sy, sw, sh, W * .5 - dw * .5, y, dw, dh); c.restore();
}
function drawBunkerIntro(c) {
  drawBunkerIntroBg(c);
  const top = c.createLinearGradient(0, 0, 0, 190); top.addColorStop(0, 'rgba(4,7,10,.72)'); top.addColorStop(1, 'rgba(4,7,10,0)'); c.fillStyle = top; c.fillRect(0, 0, W, 190);
  if (G.bunkerIntro.t >= 4.6) { drawBunkerIntroElena(c); if (D.line && G.bunkerIntro.reveal > .15) drawNarr(c, D.line.text, D.prog, D.popT); if (D.line && D.prog >= 1) hintAdvance(c); }
  else { const p = clamp(G.bunkerIntro.t / 4.6, 0, 1); c.textAlign = 'center'; c.fillStyle = `rgba(216,232,239,${.34 + .22 * Math.sin(T * 2.2)})`; c.font = 'italic 14px Georgia,serif'; c.fillText('1968 — BUNKER BAWAH TANAH', W / 2, H - 30); c.fillStyle = 'rgba(216,232,239,.17)'; rr(c, W / 2 - 112, H - 19, 224, 3, 2); c.fill(); c.fillStyle = '#6B91A8'; rr(c, W / 2 - 112, H - 19, 224 * p, 3, 2); c.fill(); }
}
/* ============================================================
   INTRO LAB MILITER 1968 — rute B saja. Empat crop Figma
   73:143 → 73:149 → 73:151 → 74:153 menjadi dolly-out lambat.
   ============================================================ */
const LAB_CAM = [
  { z: 2.18, fx: .30, fy: .30 }, // pipa tembaga dan panel mesin
  { z: 2.04, fx: .53, fy: .56 }, // layar formula dan meja kontrol
  { z: 1.10, fx: .50, fy: .50 }, // seluruh fasilitas militer terungkap
  { z: 1.10, fx: .50, fy: .50 }, // tahan framing untuk Elena
];
function labCamAt(t) {
  const q = clamp(t / 4.6, 0, 1) * (LAB_CAM.length - 1), i = Math.min(LAB_CAM.length - 2, Math.floor(q)), u = easeIO(q - i), a = LAB_CAM[i], b = LAB_CAM[i + 1];
  return { z: lerp(a.z, b.z, u), fx: lerp(a.fx, b.fx, u), fy: lerp(a.fy, b.fy, u) };
}
function drawLabIntroBg(c) {
  const im = AS.imgs.laboratorium_militer; if (!im || !im.width) { bg1968(c, 0, T, false); return; }
  const k = OPTS.reduceMotion ? LAB_CAM[LAB_CAM.length - 1] : labCamAt(G.labIntro.t);
  const base = Math.max(W / im.width, H / im.height), dw = im.width * base * k.z, dh = im.height * base * k.z;
  c.drawImage(im, W * .5 - k.fx * dw, H * .5 - k.fy * dh, dw, dh);
  spawnParts('1968'); drawParts(c, 1 / 60);
  const cool = c.createLinearGradient(0, 0, W, H); cool.addColorStop(0, 'rgba(17,35,47,.12)'); cool.addColorStop(.62, 'rgba(24,55,72,.05)'); cool.addColorStop(1, 'rgba(4,12,18,.30)'); c.fillStyle = cool; c.fillRect(0, 0, W, H);
  const vg = c.createRadialGradient(W * .5, H * .46, H * .22, W * .5, H * .46, H * .82); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(3,8,12,.44)'); c.fillStyle = vg; c.fillRect(0, 0, W, H);
}
function drawLabIntroElena(c) {
  const im = AS.imgs.elena_dialog1, a = easeO(G.labIntro.reveal); if (!im || !im.width) { c.save(); c.globalAlpha = a; c.translate(W * .5, GROUND + 26); c.scale(1.85, 1.85); drawElena(c, T, 0, false, 'angry'); c.restore(); return; }
  const sx = im.width * .345, sy = im.height * .03, sw = im.width * .31, sh = im.height * .48, dh = 318, dw = dh * (sw / sh);
  const y = H - dh + 18 + (1 - a) * 26, bob = OPTS.reduceMotion ? 0 : Math.sin(T * 1.45) * 1.2;
  c.save(); c.globalAlpha = a; c.translate(0, bob); c.shadowColor = 'rgba(3,10,16,.78)'; c.shadowBlur = 20; c.drawImage(im, sx, sy, sw, sh, W * .5 - dw * .5, y, dw, dh); c.restore();
}
function drawLabIntro(c) {
  drawLabIntroBg(c);
  const top = c.createLinearGradient(0, 0, 0, 190); top.addColorStop(0, 'rgba(3,9,14,.72)'); top.addColorStop(1, 'rgba(3,9,14,0)'); c.fillStyle = top; c.fillRect(0, 0, W, 190);
  if (G.labIntro.t >= 4.6) { drawLabIntroElena(c); if (D.line && G.labIntro.reveal > .15) drawNarr(c, D.line.text, D.prog, D.popT); if (D.line && D.prog >= 1) hintAdvance(c); }
  else { const p = clamp(G.labIntro.t / 4.6, 0, 1); c.textAlign = 'center'; c.fillStyle = `rgba(220,238,247,${.36 + .24 * Math.sin(T * 2.2)})`; c.font = 'italic 14px Georgia,serif'; c.fillText('1968 — LABORATORIUM MILITER', W / 2, H - 30); c.fillStyle = 'rgba(220,238,247,.18)'; rr(c, W / 2 - 112, H - 19, 224, 3, 2); c.fill(); c.fillStyle = '#5D91A9'; rr(c, W / 2 - 112, H - 19, 224 * p, 3, 2); c.fill(); }
}
/* ============================================================
   COVER / LAYAR JUDUL — poster sinematik: emblem jam pasir
   bercahaya + cincin waktu, ensemble Arthur lintas era
   mengapit Elena, judul berhierarki, pil MULAI berdenyut
   ============================================================ */
function drawHourglass(c, x, y, s, t) {
  const mot = OPTS.reduceMotion ? 0 : 1;
  c.save(); c.translate(x, y); c.scale(s, s); c.lineJoin = 'round'; c.lineCap = 'round';
  c.shadowColor = 'rgba(226,90,70,.8)'; c.shadowBlur = 9 + 4 * mot * Math.sin(t * 2.2);
  c.strokeStyle = '#F5F0E8'; c.lineWidth = 2.2;
  c.beginPath(); c.moveTo(-12, -16); c.lineTo(12, -16); c.moveTo(-12, 16); c.lineTo(12, 16); c.stroke(); // palang atas-bawah
  c.beginPath(); c.moveTo(-9, -16); c.lineTo(9, -16); c.lineTo(1.7, -1.6); c.lineTo(-1.7, -1.6); c.closePath(); // rongga atas
  c.moveTo(-9, 16); c.lineTo(9, 16); c.lineTo(1.7, 1.6); c.lineTo(-1.7, 1.6); c.closePath(); c.stroke(); // rongga bawah
  // pasir merah: arus terus menetes, timbunan naik-turun mengikuti siklus (motif loop)
  const ph = mot ? 1 - Math.abs((t * .36) % 2 - 1) : .5;
  c.fillStyle = '#E05555'; c.shadowColor = '#E05555'; c.shadowBlur = 7;
  const hp = 2.5 + 9 * ph; c.beginPath(); c.moveTo(-hp * .6, 15); c.lineTo(hp * .6, 15); c.lineTo(0, 15 - hp); c.closePath(); c.fill();
  c.globalAlpha = .85; c.fillRect(-.9, -1.6, 1.8, 14);
  for (let i = 0; i < 3; i++) { const yy = -1 + ((t * (8 + 2 * i) + i * 5.3) % 15); c.beginPath(); c.arc((i - 1) * 1.1, yy, 1, 0, TAU); c.fill(); }
  c.restore();
}
function drawTimeRing(c, x, y, r, t) {
  const mot = OPTS.reduceMotion ? 0 : 1;
  c.save(); c.translate(x, y);
  c.strokeStyle = 'rgba(245,240,232,.16)'; c.lineWidth = 1.2;
  c.setLineDash([3, 7]); c.lineDashOffset = -t * 9 * mot; c.beginPath(); c.arc(0, 0, r, 0, TAU); c.stroke();
  c.strokeStyle = 'rgba(224,85,85,.26)'; c.setLineDash([2, 12]); c.lineDashOffset = t * 13 * mot; c.beginPath(); c.arc(0, 0, r - 22, 0, TAU); c.stroke();
  c.setLineDash([]);
  const a = t * .5 * mot; // dua spark mengorbit saling berlawanan arah
  c.fillStyle = '#F0CD82'; c.shadowColor = '#F0CD82'; c.shadowBlur = 8; c.beginPath(); c.arc(Math.cos(a) * r, Math.sin(a) * r, 2.4, 0, TAU); c.fill();
  c.fillStyle = '#E05555'; c.shadowColor = '#E05555'; c.shadowBlur = 7; c.beginPath(); c.arc(-Math.cos(a) * (r - 22), -Math.sin(a) * (r - 22), 1.9, 0, TAU); c.fill();
  c.restore();
}
const INTRO_LAYERS = [
  ['intro12', .05, -8], ['intro03', .08, 4], ['intro04', .11, 8], ['intro17', .14, -4],
  ['intro05', .22, 5], ['intro07', .28, -2], ['intro08', .34, 7], ['intro09', .4, 2],
  ['intro01', .48, -6], ['intro02', .54, 5], ['intro19', .58, 0], ['intro10', .64, -4],
  ['intro11', .72, 6], ['intro13', .78, -5], ['intro14', .84, 4], ['intro15', .9, 1], ['intro16', .94, -3], ['intro18', .97, 5], ['intro20', 1, -2]];
function drawIntroLayer(c, id, x, y, w, h) { const im = AS.imgs[id]; if (!im || !im.width) return false; c.drawImage(im, x, y, w, h); return true; }
function drawTitleIntro(c) {
  const t = G.titleT, p = clamp(t / 8.4, 0, 1), mot = OPTS.reduceMotion ? 0 : 1;
  const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#eee6dd'); g.addColorStop(.52, '#aa9b8b'); g.addColorStop(1, '#44392f'); c.fillStyle = g; c.fillRect(0, 0, W, H);
  // tujuh komposisi Figma dibaca sebagai tujuh key pose kamera; interpolasi menjaga gerak tetap sinematik.
  const poses = [[-170, -80, 1.02], [-105, -42, 1.06], [-38, -8, 1.1], [24, 42, 1.14], [82, 94, 1.18], [138, 142, 1.22], [195, 184, 1.26]];
  const q = p * (poses.length - 1), i = Math.min(poses.length - 2, Math.floor(q)), u = easeIO(q - i);
  const kx = lerp(poses[i][0], poses[i + 1][0], u) * mot, ky = lerp(poses[i][1], poses[i + 1][1], u) * mot, z = lerp(poses[i][2], poses[i + 1][2], u);
  let any = false;
  for (const [id, f, j] of INTRO_LAYERS) {
    const im = AS.imgs[id]; if (!im || !im.width) continue; any = true;
    const dw = 1240 * z, dh = dw * im.height / im.width, xx = (W - dw) / 2 - kx * f + j * Math.sin(t * .24 + f * 5) * mot, yy = (H - dh) / 2 - ky * f + (1 - f) * 22;
    c.globalAlpha = .56 + .44 * f; drawIntroLayer(c, id, xx, yy, dw, dh);
  }
  c.globalAlpha = 1;
  if (!any) { drawCover(c); return; }
  const fog = c.createLinearGradient(0, 0, 0, H); fog.addColorStop(0, 'rgba(240,232,222,.2)'); fog.addColorStop(.65, 'rgba(40,32,26,0)'); fog.addColorStop(1, 'rgba(12,9,7,.55)'); c.fillStyle = fog; c.fillRect(0, 0, W, H);
  // identitas muncul bertahap sementara kamera menembus reruntuhan.
  const a = clamp((t - 1.2) / 1.3, 0, 1) * (1 - clamp((t - 6.8) / 1.1, 0, 1)); c.globalAlpha = a; c.textAlign = 'center'; c.fillStyle = '#f7f1e8'; c.font = '15px Georgia,serif'; c.fillText('H E A R T S', W / 2, 76);
  c.font = 'bold 48px Georgia,serif'; c.fillText('ACROSS TIME', W / 2, 130); c.fillStyle = '#c85855'; c.font = 'bold 18px ' + F_UI; c.fillText('— BREAK THE LOOP —', W / 2, 160); c.globalAlpha = 1;
  c.textAlign = 'center'; c.fillStyle = 'rgba(248,242,232,.66)'; c.font = '13px ' + F_UI; c.fillText('TEKAN ENTER / SENTUH UNTUK MELEWATI INTRO', W / 2, H - 28);
  c.fillStyle = 'rgba(248,242,232,.2)'; rr(c, W / 2 - 120, H - 18, 240, 3, 2); c.fill(); c.fillStyle = '#c85855'; rr(c, W / 2 - 120, H - 18, 240 * p, 3, 2); c.fill();
  // dissolve ke cover interaktif; tombol mulai baru aktif setelah transisi selesai.
  const fade = clamp((t - 7) / 1.4, 0, 1); if (fade > 0) { c.globalAlpha = easeIO(fade); drawCover(c); c.globalAlpha = 1; }
}
function goldTitle(c, text, x, y, size) {
  c.save(); c.textAlign = 'center'; c.textBaseline = 'alphabetic'; c.font = `400 ${size}px ${F_TITLE}`;
  const g = c.createLinearGradient(0, y - size, 0, y + 5); g.addColorStop(0, '#FFF5BD'); g.addColorStop(.28, '#D8AD4E'); g.addColorStop(.6, '#FFF0A0'); g.addColorStop(1, '#8B5A18');
  c.shadowColor = 'rgba(73,152,132,.72)'; c.shadowBlur = 8; c.lineJoin = 'round'; c.lineWidth = Math.max(1.2, size * .028); c.strokeStyle = '#6D4310'; c.strokeText(text, x, y); c.fillStyle = g; c.fillText(text, x, y); c.restore();
}
function spacedText(c, text, x, y, spacing) {
  const chars = [...text], width = chars.reduce((n, ch) => n + c.measureText(ch).width, 0) + spacing * (chars.length - 1); let px = x - width / 2;
  for (const ch of chars) { const w = c.measureText(ch).width; if (c.lineWidth > 0) c.strokeText(ch, px + w / 2, y); c.fillText(ch, px + w / 2, y); px += w + spacing; }
}
function drawCover(c) {
  const mot = OPTS.reduceMotion ? 0 : 1, t = T, pul = mot ? .5 + .5 * Math.sin(t * 1.6) : .5, im = AS.imgs.title_cover_figma;
  const zoom = 1.015 + mot * .012 * Math.sin(t * .18), panX = mot * Math.sin(t * .13) * 5, panY = mot * Math.cos(t * .16) * 3;
  if (!drawCoverImage(c, im, zoom, panX, panY)) { bg2088(c, 0, t, 0); drawProps(c, '2088', 0); }
  else { c.save(); c.globalAlpha = .22; c.globalCompositeOperation = 'overlay'; drawCoverImage(c, im, zoom, panX, panY); c.restore(); }
  // Lapisan gelap Figma: judul tetap kontras dan footer menyatu dengan ruang angkasa.
  let g = c.createLinearGradient(0, 0, 0, 210); g.addColorStop(0, 'rgba(2,5,13,.72)'); g.addColorStop(.6, 'rgba(2,5,13,.12)'); g.addColorStop(1, 'rgba(2,5,13,0)'); c.fillStyle = g; c.fillRect(0, 0, W, 210);
  g = c.createLinearGradient(0, 330, 0, H); g.addColorStop(0, 'rgba(2,4,10,0)'); g.addColorStop(.45, 'rgba(2,4,10,.7)'); g.addColorStop(1, 'rgba(1,2,7,.96)'); c.fillStyle = g; c.fillRect(0, 330, W, H - 330);
  const glow = c.createRadialGradient(W * .5, 142, 10, W * .5, 142, 210); glow.addColorStop(0, `rgba(255,215,110,${.12 + .06 * pul})`); glow.addColorStop(1, 'rgba(255,215,110,0)'); c.fillStyle = glow; c.fillRect(255, 0, 450, 310);
  // Wordmark resmi dari aset gambar yang tersedia di repo.
  const mark = AS.imgs.title_wordmark;
  if (mark && mark.width) { const dw = 510, dh = dw * (mark.height / mark.width); c.save(); c.shadowColor = `rgba(255,223,135,${.35 + .22 * pul})`; c.shadowBlur = 13; c.drawImage(mark, 0, 0, mark.width, mark.height, W / 2 - dw / 2, 55, dw, dh); c.restore(); }
  // Kode teks prosedural di-comment out karena diganti gambar:
  // else{goldTitle(c,'HE',W/2-86,132,66);goldTitle(c,'RT',W/2+84,132,66);c.save();c.shadowColor=`rgba(255,223,135,${.55+.3*pul})`;c.shadowBlur=16+8*pul;drawHourglass(c,W/2,101,1.72,t);c.restore();goldTitle(c,'ACROSS TIME',W/2,191,43);}
  // c.save();c.textAlign='center';c.font='400 14px '+F_META;c.fillStyle='#FFFDF4';c.strokeStyle='rgba(7,8,18,.78)';c.lineWidth=3;c.shadowColor='rgba(245,255,196,.8)';c.shadowBlur=7;spacedText(c,'BREAK THE LOOP',W/2,225,7);c.restore();
  // Peta waktu prosedural: hasil yang belum ditemukan tetap berupa segel tanpa spoiler.
  const years=['1944','1968','1999','2088'],xs=[250,403,557,710],my=242;c.save();c.strokeStyle='rgba(242,210,125,.55)';c.lineWidth=2;c.beginPath();c.moveTo(xs[0],my);for(let i=1;i<xs.length;i++){c.quadraticCurveTo((xs[i-1]+xs[i])/2,my+(i%2?14:-14),xs[i],my);}c.stroke();
  years.forEach((y,i)=>{c.fillStyle=i===0||SAVE.game&&+SAVE.game.era>=+y?'#F1D58B':'rgba(245,240,232,.5)';c.beginPath();c.arc(xs[i],my,7,0,TAU);c.fill();c.font='11px '+F_META;c.textAlign='center';c.fillText(y,xs[i],my+23);});
  const found=END_TOTAL.filter(k=>SAVE.endings&&SAVE.endings[k]).length;c.font='11px '+F_META;END_TOTAL.forEach((k,i)=>{const x=345+i*54,on=!!(SAVE.endings&&SAVE.endings[k]);c.fillStyle=on?'#F1D58B':'rgba(245,240,232,.28)';c.fillText(on?'✦':'◇',x,277);});c.restore();
  if(loreFoundCount()>=LORE_IDS.length){ // P3: segel kisah lengkap — kelima jejak selidik ditemukan
    c.save();c.textAlign='left';c.font='400 12px '+F_META;c.fillStyle='#F1D58B';c.shadowColor='rgba(241,213,139,.55)';c.shadowBlur=6;
    c.fillText('✦ KISAH LENKAP '+LORE_IDS.length+'/'+LORE_IDS.length,24,464);c.restore();}
  const items=titleMenu(),bx=350,by=300,bw=260,bh=36;c.save();c.textAlign='center';c.textBaseline='middle';items.forEach((it,i)=>{const y=by+i*42,on=i===G.titleSel&&!it.disabled,hov=ptr.x>bx&&ptr.x<bx+bw&&ptr.y>y&&ptr.y<y+bh;
    c.fillStyle=on||hov?'rgba(211,168,72,.9)':'rgba(8,10,18,.72)';rr(c,bx,y,bw,bh,4);c.fill();c.strokeStyle=on?'#FFF0A0':'rgba(241,213,139,.48)';c.lineWidth=on?2:1;rr(c,bx,y,bw,bh,4);c.stroke();c.fillStyle=it.disabled?'rgba(245,240,232,.3)':'#FFFDF2';c.font=(on?'bold ':'')+'16px '+F_TITLE;c.fillText((on?'▶ ':'')+it.label,W/2,y+bh/2);});c.restore();
  if(G.titleConfirm){c.fillStyle='rgba(2,3,8,.82)';c.fillRect(0,0,W,H);sketchRR(c,250,235,460,170,8);c.textAlign='center';c.fillStyle='#94342E';c.font='bold 20px '+F_UI;c.fillText('TIMPA AUTOSAVE SIKLUS AKTIF?',W/2,278);c.fillStyle='#2B211A';c.font='15px '+F_UI;c.fillText('Progres siklus saat ini akan dimulai ulang dari 1944.',W/2,308);['YA, MULAI BARU','BATAL'].forEach((s,i)=>{const x=320+i*210,on=(G.confirmSel||0)===i;c.fillStyle=on?'#94342E':'#6A5B4B';rr(c,x,338,160,38,5);c.fill();c.fillStyle='#FFF8EA';c.fillText(s,x+80,363);});}
  // Informasi progres dan save dipertahankan sesuai permintaan.
  const nE = found, iy = 445;
  c.textBaseline = 'middle'; c.textAlign = 'left'; c.font = '400 13px ' + F_META; c.fillStyle = nE >= END_TOTAL.length ? '#F7D984' : 'rgba(247,242,226,.76)';
  c.fillText('⏳  ENDING ' + nE + '/' + END_TOTAL.length + (SAVE.endings && SAVE.endings.true ? '  ★ SEJATI' : ''), 24, iy);
  if (SAVE.game) { c.textAlign = 'right'; c.fillStyle = '#F1D58B'; c.fillText('AUTOSAVE • '+SAVE.game.era, W - 24, iy); }
  c.textAlign = 'center'; c.fillStyle = 'rgba(247,242,226,.72)'; c.font = '400 12px ' + F_META;
  c.fillText(IS_TOUCH ? 'KETUK MENU UNTUK MEMILIH' : '↑ ↓ pilih  •  ENTER konfirmasi', W / 2, 500);
  c.textBaseline = 'alphabetic';
}
function drawTutorial(c,kind){let text='';
  if(kind==='walk'&&G.era==='1944'&&S.loop===0){if(!SAVE.tutorial.move)text=IS_TOUCH?'Tahan ◀ / ▶ untuk bergerak':'Gerak dengan ← → atau A D';else if(!SAVE.tutorial.sprint)text=IS_TOUCH?'Tahan ≫ untuk berlari':'Tahan SHIFT untuk berlari';else if(G.walk&&G.walk.challengeHot&&!SAVE.tutorial.interact)text=IS_TOUCH?'Ketuk penanda untuk berinteraksi':'Tekan ↓ / S / ENTER untuk berinteraksi';}
  else if(kind==='dialog'&&D.choices&&!SAVE.tutorial.dialog)text=IS_TOUCH?'Ketuk jawaban yang terasa tepat':'Pilih dengan ↑ ↓, lalu ENTER (atau 1 / 2)';
  if(!text&&G.tutorialFade>0)text='✓ Dipahami';if(!text)return;
  const a=text[0]==='✓'?G.tutorialFade:1;c.save();c.globalAlpha=clamp(a,0,1);c.textAlign='center';c.font='bold 15px '+F_UI;const tw=c.measureText(text).width;sketchRR(c,W/2-tw/2-20,92,tw+40,38,5,{shadow:false});c.fillStyle=text[0]==='✓'?'#567A61':'#94342E';c.fillText(text,W/2,117);c.restore();}
function drawChallenge(c){const ch=G.challenge,cfg=CHALLENGE_CONF[ch.era];c.fillStyle='rgba(4,6,10,.72)';c.fillRect(0,0,W,H);sketchRR(c,135,82,690,390,9);c.textAlign='center';c.fillStyle='#94342E';c.font='bold 23px '+F_UI;c.fillText(cfg.title,W/2,122);
  c.fillStyle='#5A4A3C';c.font='13px '+F_META;c.fillText(ch.era+' • PILIH PENDEKATAN TANPA LABEL',W/2,146);
  if(ch.stage==='choose'){
    [cfg.left,cfg.right].forEach((s,i)=>{const x=170+i*330,on=ch.sel===i;c.fillStyle=on?'rgba(148,52,46,.13)':'rgba(90,74,60,.06)';rr(c,x,205,290,130,7);c.fill();c.strokeStyle=on?'#94342E':'rgba(43,33,26,.4)';c.lineWidth=on?3:1.5;rr(c,x,205,290,130,7);c.stroke();c.fillStyle='#2B211A';c.font=(on?'bold ':'')+'17px '+F_UI;wrap(c,s,250).forEach((ln,k)=>c.fillText(ln,x+145,250+k*23));});
    c.fillStyle='#6A5B4B';c.font='14px '+F_UI;c.fillText(IS_TOUCH?'Ketuk pilihan':'← → pilih  •  ENTER konfirmasi',W/2,398);return;}
  if(cfg.mode==='dodge'){ // P1: koridor parit top-down + kerucut sorot menyapu
    const bx=ch.bx||484,bw=ch.bw||112;
    c.fillStyle='#241b13';rr(c,190,232,580,100,8);c.fill();outline(c,1.6);rr(c,190,232,580,100,8);c.stroke();
    const g=c.createLinearGradient(0,206,0,332);g.addColorStop(0,'rgba(255,236,180,.34)');g.addColorStop(1,'rgba(255,214,140,.10)');
    c.fillStyle=g;c.beginPath();c.moveTo(bx-bw*.16,206);c.lineTo(bx+bw*.16,206);c.lineTo(bx+bw/2,332);c.lineTo(bx-bw/2,332);c.closePath();c.fill();
    c.strokeStyle='rgba(255,220,150,.45)';c.lineWidth=1.2;c.stroke();
    c.fillStyle='#3a2f24';c.fillRect(bx-3,194,6,14); // beacon sorot
    [300,480,660].forEach(cx=>{ // karung pasir = zona aman
      c.fillStyle='#6a5a45';rr(c,cx-27,297,54,15,5);c.fill();rr(c,cx-27,313,54,15,5);c.fill();
      outline(c,1.4);rr(c,cx-27,297,54,31,5);c.stroke();
      c.strokeStyle='rgba(46,40,32,.55)';c.lineWidth=1.2;c.beginPath();c.moveTo(cx-27,313);c.lineTo(cx+27,313);c.stroke();});
    c.strokeStyle='rgba(241,213,139,.85)';c.lineWidth=2;c.setLineDash([4,4]);c.beginPath();c.moveTo(752,238);c.lineTo(752,330);c.stroke();c.setLineDash([]); // garis goal
    c.save();c.translate(ch.px,320); // Elena mini
    c.fillStyle='rgba(10,8,6,.32)';c.beginPath();c.ellipse(0,3,11,3.4,0,0,TAU);c.fill();
    c.fillStyle=PAL.dress;rr(c,-7,-18,14,18,4);c.fill();outline(c,1.5);rr(c,-7,-18,14,18,4);c.stroke();
    c.fillStyle=PAL.skin;c.beginPath();c.arc(0,-24,6,0,TAU);c.fill();outline(c,1.5);c.beginPath();c.arc(0,-24,6,0,TAU);c.stroke();
    c.fillStyle=PAL.hairEs;c.beginPath();c.arc(0,-27,6,Math.PI,0);c.fill();c.restore();
    const dv=(ch.det||0)/.42; // vignette merah mengikuti deteksi
    if(dv>0){const vg=c.createRadialGradient(W/2,H/2,H*.22,W/2,H/2,H*.62);vg.addColorStop(0,'rgba(170,30,30,0)');vg.addColorStop(1,`rgba(190,30,30,${.42*dv})`);c.fillStyle=vg;c.fillRect(0,0,W,H);}
    c.fillStyle='#2B211A';c.font='bold 15px '+F_UI;c.fillText('LUNCUR ANTARA KARUNG SAMPAI GARIS — JANGAN TERTANGKAP SOROT',W/2,214);
    c.fillStyle='#6A5B4B';c.font='13px '+F_UI;c.fillText(IS_TOUCH?'tahan ◀ / ▶ di bawah layar untuk berlari':'← → lari antara karung',W/2,352);
  } else if(cfg.mode==='balance'){ // P1: dua meter krio saling tarik
    const meter=(v,col,lbl,y)=>{
      c.fillStyle='rgba(245,240,232,.13)';rr(c,W/2-186,y,400,20,9);c.fill();
      c.fillStyle=col;rr(c,W/2-186,y,400*clamp(v,0,1),20,9);c.fill();
      c.strokeStyle='#2B211A';c.lineWidth=1.5;rr(c,W/2-186,y,400,20,9);c.stroke();
      c.strokeStyle='rgba(148,52,46,.85)';c.lineWidth=2;c.beginPath();c.moveTo(W/2-186+400*.22,y-3);c.lineTo(W/2-186+400*.22,y+23);c.stroke(); // ambang aman
      c.font='bold 11.5px '+F_UI;c.fillStyle='#F3EADA';c.textAlign='right';c.fillText(lbl,W/2-194,y+15);c.textAlign='center';};
    meter(ch.vit,'rgba(168,85,80,.95)','VITAL',250);
    meter(ch.ser,'rgba(90,150,180,.95)','SERUM',280);
    c.fillStyle='rgba(245,240,232,.13)';rr(c,W/2-160,314,320,12,6);c.fill();
    c.fillStyle='#567A61';rr(c,W/2-160,314,320*clamp((ch.stable||0)/5,0,1),12,6);c.fill(); // progres stabilisasi 5 dtk
    c.fillStyle='#2B211A';c.font='bold 15px '+F_UI;c.fillText('SEIMBANGKAN KEDUA GARIS DI ATAS AMBANG MERAH',W/2,214);
    c.fillStyle='#6A5B4B';c.font='13px '+F_UI;c.fillText(IS_TOUCH?'tahan sisi kiri / kanan bawah layar':'tahan ← = VITAL naik • tahan → = SERUM naik • stabil 5 detik',W/2,346);
    if(!ch.ok&&(ch.vit<.32||ch.ser<.32)){c.fillStyle=`rgba(168,62,56,${.55+.45*Math.sin(T*11)})`;c.font='bold 14px '+F_UI;c.fillText('KRITIS',W/2,372);}
  } else { // tune (1968): bar setelan asli
    const target=cfg.targets[Math.min(ch.band,2)],win=ch.assist?.13:.075,tx=190+target*580,rawX=190+ch.cursor*580,cx=OPTS.reduceMotion?190+Math.round(ch.cursor*10)/10*580:rawX;
    c.fillStyle='#D8CDB9';rr(c,190,244,580,28,7);c.fill();c.fillStyle=ch.assist?'rgba(82,129,98,.45)':'rgba(194,90,90,.4)';rr(c,tx-win*580,244,win*1160,28,6);c.fill();c.strokeStyle='#2B211A';c.lineWidth=2;c.beginPath();c.moveTo(cx,232);c.lineTo(cx,284);c.stroke();c.fillStyle='#94342E';c.beginPath();c.moveTo(cx-7,231);c.lineTo(cx+7,231);c.lineTo(cx,241);c.closePath();c.fill();
    c.fillStyle='#2B211A';c.font='bold 16px '+F_UI;c.fillText('Selaraskan penanda dengan gelombang, lalu kunci',W/2,202);
    for(let i=0;i<3;i++){c.fillStyle=i<ch.band?'#5F9270':'#B7AA95';c.beginPath();c.arc(W/2-34+i*34,318,9,0,TAU);c.fill();}
    c.fillStyle='#6A5B4B';c.font='14px '+F_UI;c.fillText(IS_TOUCH?'Ketuk jalur untuk menyetel • ketuk bawah untuk kunci':'← → setel  •  ENTER kunci',W/2,365);
  }
  if(ch.assist){c.fillStyle='#567A61';c.font='bold 14px '+F_UI;c.fillText('BANTUAN AKTIF — tempo melambat, zona diperlebar',W/2,398);}
  if(ch.feedbackT>0){c.fillStyle=ch.feedback.startsWith('TERKUNCI')?'#567A61':'#A83E38';c.font='bold 16px '+F_UI;c.fillText(ch.feedback,W/2,428);}
  if(ch.stage==='success'){c.fillStyle='rgba(243,234,218,.95)';c.fillRect(150,180,660,210);c.fillStyle='#567A61';c.font='bold 28px '+F_UI;c.fillText('JALUR STABIL',W/2,260);c.fillStyle='#2B211A';c.font='16px '+F_UI;c.fillText('Pilihanmu meninggalkan jejak pada siklus ini.',W/2,300);}
}
const PORTRAIT_CARD={}; // cache deteksi: true = gambar tanpa alpha (ilustrasi penuh) -> dirender kartu polaroid
function drawPortrait(c) { // A2: potret bust pembicara di tepi bawah — file absen => skip senyap
  if (!D.line || D.choices) return;
  const who = D.line.who; if (who === 'narrator') return;
  const el = who === 'elena';
  const id = el ? 'portrait_elena_' + (D.elExpr || 'neutral')
    : 'portrait_arthur_' + (D.arKind || 'muda') + '_' + (D.arExpr || 'neutral');
  const im = AS.imgs[id]; if (!im || !im.width) return;
  let card = PORTRAIT_CARD[id];
  if (card === undefined) { // deteksi sekali: sampel alpha 32x32
    try {
      const t = document.createElement('canvas'); t.width = t.height = 32;
      const tc = t.getContext('2d'); tc.drawImage(im, 0, 0, 32, 32);
      const d = tc.getImageData(0, 0, 32, 32).data; let op = 0;
      for (let i = 3; i < d.length; i += 4) if (d[i] > 40) op++;
      card = PORTRAIT_CARD[id] = op / 1024 > .9;
    } catch (e) { card = PORTRAIT_CARD[id] = false; }
  }
  const dw0 = im.width * 290 / im.height, x0 = el ? 16 : (W - Math.abs(dw0) - 16);
  const y0 = H - 290 - 84 + (OPTS.reduceMotion ? 0 : Math.sin(T * 1.4) * 2);
  c.save(); c.globalAlpha = Math.min(.96, .1 + D.popT * .9);
  if (card) { // ilustrasi penuh: bingkai kertas + kemiringan + selotip ala foto tempel buku harian
    const s = 290 / im.height, dw = im.width * s, rot = (el ? -1 : 1) * .045, bw = dw + 24, bh = 290 + 34;
    c.translate(x0 + dw / 2, y0 + 145); c.rotate(OPTS.reduceMotion ? 0 : rot);
    c.shadowColor = 'rgba(6,4,2,.5)'; c.shadowBlur = 18; c.shadowOffsetY = 6;
    c.fillStyle = '#F7F2E6'; rr(c, -bw / 2, -bh / 2, bw, bh, 4); c.fill();
    c.shadowColor = 'transparent';
    c.strokeStyle = 'rgba(30,23,16,.28)'; c.lineWidth = 1.2; rr(c, -bw / 2, -bh / 2, bw, bh, 4); c.stroke();
    c.drawImage(im, -dw / 2, -bh / 2 + 9, dw, 290);
    c.rotate(-.05); c.fillStyle = 'rgba(232,222,192,.88)'; rr(c, -36, -bh / 2 - 11, 72, 21, 2); c.fill();
    c.strokeStyle = 'rgba(43,33,26,.25)'; c.lineWidth = 1; rr(c, -36, -bh / 2 - 11, 72, 21, 2); c.stroke();
  } else {
    c.shadowColor = 'rgba(6,4,2,.5)'; c.shadowBlur = 18; c.shadowOffsetY = 6;
    c.drawImage(im, x0, y0, dw0, 290);
  }
  c.restore();
}
function render() {
  ctx.save();
  if (G.shakeT > 0 && !OPTS.reduceMotion) { const a = G.shakeA * G.shakeT; ctx.translate((Math.random() - .5) * a, (Math.random() - .5) * a); }
  ctx.fillStyle = '#0a0806'; ctx.fillRect(-20, -20, W + 40, H + 40);
  if (G.state === 'load') {
    ctx.fillStyle = '#0a0806'; ctx.fillRect(0, 0, W, H);
    const pr = AS.total ? AS.done / AS.total : 1;
    ctx.textAlign = 'center'; ctx.fillStyle = '#F5F0E8'; ctx.font = 'bold 26px Georgia,serif';
    ctx.fillText('HEARTS ACROSS TIME', W / 2, H / 2 - 64);
    ctx.fillStyle = '#A85550'; ctx.font = 'italic 16px ' + F_UI; ctx.fillText('— Break The Loop —', W / 2, H / 2 - 38);
    ctx.font = '13px ' + F_UI; ctx.fillStyle = 'rgba(245,240,232,.6)';
    ctx.fillText(AS.ready ? '' : 'MEMUAT ASET…', W / 2, H / 2 + 14);
    ctx.fillStyle = '#241d18'; rr(ctx, W / 2 - 160, H / 2 + 38, 320, 14, 7); ctx.fill();
    if (pr > 0) { ctx.fillStyle = '#C25A5A'; rr(ctx, W / 2 - 160, H / 2 + 38, Math.max(14, 320 * pr), 14, 7); ctx.fill(); }
  }
  else if (G.state === 'title') {
    if (G.titleReady) drawCover(ctx); else drawTitleIntro(ctx);
  }
  else if (G.state === 'prologue') {
    drawPrologueScene(ctx);
    // denyut vignette merah menyala sinkron dengan SFX detak jantung (dimatikan oleh reduceMotion)
    { const hb = T % 2.4; if (!OPTS.reduceMotion && hb < .6) { const a = Math.sin(hb / .6 * Math.PI) * .22; const vg = ctx.createRadialGradient(W / 2, H / 2, H * .3, W / 2, H / 2, H * .78); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, `rgba(140,20,20,${a})`); ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H); } }
    if (D.line) drawNarr(ctx, D.line.text, D.prog, D.popT);
    if (!D.choices && D.line && D.prog >= 1) hintAdvance(ctx);
    drawFFBtn(ctx);
  }
  else if (G.state === 'warintro') {
    drawWarIntro(ctx);
    drawFFBtn(ctx);
  }
  else if (G.state === 'bunkerintro') {
    drawBunkerIntro(ctx);
    drawFFBtn(ctx);
  }
  else if (G.state === 'labintro') {
    drawLabIntro(ctx);
    drawFFBtn(ctx);
  }
  else if (G.state === 'walk' || G.state === 'dialog') {
    const camDrift = G.cam + (OPTS.reduceMotion ? 0 : Math.sin(T * .4) * .9); // nafas kamera halus (nonaktif saat reduceMotion)
    const FE2 = G.era === '1968' ? (S.routeB1 === 'A' ? '1968A' : '1968B') : G.era;
    const zOn = G.state === 'dialog' && !OPTS.reduceMotion && G.zoom > 1.004; // G1: dunia di-zoom mendekat ke pembicara, UI tetap datar
    ctx.save();
    if (zOn) { const fx = G.zwx - camDrift, fy = GROUND - 72; ctx.translate(fx, fy); ctx.scale(G.zoom, G.zoom); ctx.translate(-fx, -fy); }
    drawScene(ctx, camDrift); drawChars(ctx, G.state, camDrift);
    drawEchoGhost(ctx, camDrift); // P2: hantu siklus sebelumnya (di bawah okluder depan)
    if (!bgFgImg(ctx, 'bg' + FE2 + '_fg', camDrift)) fgSilhouette(ctx, FE2, camDrift); // okluder depan: lukis menang, siluet prosedural sbg fallback
    grade(ctx, FE2); eraPostFX(ctx, FE2);
    ctx.restore();
    if (G.state === 'walk') {drawHotspots(ctx);drawTutorial(ctx,'walk');} // indikator interaksi harus berada di atas foreground dan color grade
    if (G.lore) drawNarr(ctx, G.lore.lines[G.lore.i], G.lore.prog, G.lore.popT); // strip lore titik selidik
    if (G.diary) drawDiaryPopup(ctx, G.diary); // catatan wajib Babak 2 di atas seluruh adegan
    if (G.skyFlash > 0 && !OPTS.reduceMotion) { const a = G.skyFlash; const g = ctx.createLinearGradient(0, 0, 0, H * .8); g.addColorStop(0, `rgba(255,190,120,${.34 * a})`); g.addColorStop(.55, `rgba(255,150,80,${.16 * a})`); g.addColorStop(1, 'rgba(255,150,80,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H * .8); ctx.fillStyle = `rgba(255,214,150,${.08 * a})`; ctx.fillRect(0, 0, W, H); }
    // caption babak — kotak caption komik di kiri atas (ala panel komik perang)
    if (G.captionT > 0 && G.state === 'walk') {
      const a = Math.min(1, G.captionT) * Math.min(1, (3.2 - G.captionT) * 2);
      ctx.save(); ctx.globalAlpha = a;
      ctx.font = 'bold 21px ' + F_UI;
      const tw = ctx.measureText(G.caption).width, cx0 = 22, cy0 = 56, cw2 = tw + 36, chh = 38;
      sketchRR(ctx, cx0, cy0, cw2, chh, 4, { shadow: false });
      ctx.strokeStyle = '#94342E'; ctx.lineWidth = 2; ctx.lineCap = 'round'; // aksen goresan tinta merah
      ctx.beginPath(); ctx.moveTo(cx0 + 14, cy0 + chh - 8); ctx.quadraticCurveTo(cx0 + cw2 / 2, cy0 + chh - 5.5, cx0 + cw2 - 14, cy0 + chh - 8); ctx.stroke();
      ctx.fillStyle = '#2B211A'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.fillText(G.caption, cx0 + 18, cy0 + chh / 2 - 2);
      ctx.restore(); ctx.textBaseline = 'alphabetic';
    }
    if (G.state === 'dialog') {
      drawPortrait(ctx); // potret bust pembicara (opsional)
      // bubble aktif
      if (D.line) {
        if (D.line.who === 'narrator') drawNarr(ctx, D.line.text, D.prog, D.popT);
        else {
          const isE = D.line.who === 'elena';
          let bx2 = isE ? (G.walk.arX - 190 - camDrift) : (G.walk.arX - camDrift), hy2 = GROUND - 140;
          if (zOn) { const fx = G.zwx - camDrift, fy = GROUND - 72; bx2 = fx + (bx2 - fx) * G.zoom; hy2 = fy + (hy2 - fy) * G.zoom; } // jangkar bubble ikut zoom agar ekor menunjuk mulut
          drawBubble(ctx, bx2, hy2, D.line.text, D.line.who, D.prog, false, D.popT);
        }
        if (!D.choices && D.prog >= 1 && G.state === 'dialog') hintAdvance(ctx);
      }
      if (D.choices) drawChoices(ctx, D.choices, D.sel, ptr.x, ptr.y, D.choiceT);
      drawTutorial(ctx,'dialog');
      drawFFBtn(ctx);
    }
    // HUD loop
    if (S.loop > 0) {
      ctx.save(); ctx.font = 'bold 13px monospace'; const j = S.loop > 0 && G.state === 'walk' && G.captionT > 0 ? 2 : 0;
      ctx.fillStyle = `rgba(194,59,59,.9)`; ctx.textAlign = 'left';
      ctx.fillText('⟲ LOOP ' + S.loop, 18 + j * (Math.random() - .5), 26 + j * (Math.random() - .5));
      if (G.state === 'walk') {
        ctx.globalAlpha = .62; ctx.font = '12px ' + F_UI;
        ctx.fillText('lari otomatis — tahan ' + (IS_TOUCH ? '≫' : 'SHIFT') + ' untuk jalan pelan', 18, 42);
      }
      ctx.restore();
    }
    // kontrol sentuh
    if (IS_TOUCH && G.state === 'walk') { // P6: pad kertas-tinta terlihat + umpan balik tekan
      const zoneL = ptr.down && ptr.x < 140 && ptr.y > H - 130, zoneR = ptr.down && ptr.x > W - 140 && ptr.y > H - 130;
      const rOn = ptr.down && Math.hypot(ptr.x - (W - 36), ptr.y - (H - 162)) < 30;
      const pad = (x, y, r, icon, on) => {
        ctx.save(); ctx.translate(x, y); if (on) ctx.scale(.93, .93);
        ctx.globalAlpha = on ? .8 : .45;
        ctx.fillStyle = '#0a0806'; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill();
        ctx.strokeStyle = on ? '#E8C88A' : 'rgba(245,240,232,.8)'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.stroke();
        ctx.strokeStyle = 'rgba(245,240,232,.22)'; ctx.lineWidth = .8; ctx.beginPath(); ctx.arc(0, 0, r - 3.5, 0, TAU); ctx.stroke(); // bingkai ganda ala tinta
        ctx.globalAlpha = on ? 1 : .85; ctx.fillStyle = on ? '#FFE2AC' : '#F5F0E8';
        ctx.font = 'bold 20px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(icon, 0, 1);
        ctx.restore(); ctx.textBaseline = 'alphabetic';
      };
      pad(70, H - 65, 31, '◀', zoneL); pad(W - 70, H - 65, 31, '▶', zoneR); pad(W - 36, H - 162, 27, '≫', rOn);
      // tombol ▼ kontekstual — interaksi tanpa harus menembak penanda kecil
      if (G.walk.hot || G.walk.diaryHot || G.walk.challengeHot) {
        const pu = OPTS.reduceMotion ? 1 : .94 + .06 * Math.sin(T * 3);
        sketchRR(ctx, TOUCH_ACT.x - TOUCH_ACT.w / 2, TOUCH_ACT.y - TOUCH_ACT.h / 2, TOUCH_ACT.w, TOUCH_ACT.h, 9, { shadow: false });
        ctx.save(); ctx.translate(TOUCH_ACT.x, TOUCH_ACT.y); ctx.scale(pu, pu);
        ctx.fillStyle = '#94342E'; ctx.font = 'bold 13px ' + F_UI; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(G.walk.challengeHot ? '▼ AKTIFKAN' : G.walk.diaryHot ? '▼ BUKU' : '▼ PERIKSA', 0, 1);
        ctx.restore(); ctx.textBaseline = 'alphabetic';
      }
    }
  }
  else if(G.state==='challenge'){
    const camDrift=G.cam+(OPTS.reduceMotion?0:Math.sin(T*.4)*.5);drawScene(ctx,camDrift);drawChars(ctx,'walk',camDrift);
    const FE=G.era==='1968'?(S.routeB1==='A'?'1968A':'1968B'):G.era;if(!bgFgImg(ctx,'bg'+FE+'_fg',camDrift))fgSilhouette(ctx,FE,camDrift);grade(ctx,FE);eraPostFX(ctx,FE);drawChallenge(ctx);
  }
  else if (G.state === 'vortex') {
    const v = G.vortex, pr = easeIO(clamp(v.t, 0, 1));
    ctx.fillStyle = '#050508'; ctx.fillRect(0, 0, W, H);
    const vortexBg = AS.imgs.time_vortex; if (vortexBg && vortexBg.width) ctx.drawImage(vortexBg, 0, 0, W, H);
    ctx.save(); ctx.translate(W / 2, H / 2);
    const rot = (v.rewind ? -1 : 1) * pr * TAU * 2.2;
    ctx.rotate(rot * .25);
    for (let i = 0; i < 46; i++) {
      const ang = i / 46 * TAU + rot * (i % 3 === 0 ? 1.6 : .7);
      const rad = 30 + ((i * 97) % 420) * (0.3 + pr * 1.4) * (.4 + ((i * 31) % 100) / 80);
      const x = Math.cos(ang) * rad, y = Math.sin(ang) * rad * .55;
      const hue = v.rewind ? `rgba(226,80,60,` : `rgba(80,200,255,`;
      ctx.fillStyle = hue + (.25 + .55 * Math.abs(Math.sin(i + T * 3))) + ')';
      ctx.fillRect(x, y, 2 + ((i % 4)), 2 + ((i % 3)));
    }
    ctx.rotate(-rot * .25);
    for (let r = 40; r < 430; r += 34) {
      ctx.strokeStyle = v.rewind ? `rgba(226,80,60,${.34 - (r / 430) * .28})` : `rgba(90,205,255,${.34 - (r / 430) * .28})`; ctx.lineWidth = 2.2;
      ctx.beginPath(); ctx.ellipse(0, 0, r, r * .5, rot * .13, 0, TAU); ctx.stroke();
    }
    const gl = .6 + .4 * Math.sin(T * 10);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 120); g.addColorStop(0, v.rewind ? `rgba(255,120,90,${.5 * gl})` : `rgba(140,225,255,${.5 * gl})`); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 120, 0, TAU); ctx.fill();
    ctx.restore();
    drawParts(ctx, 1 / 60); // jejak energi terbang di pusaran
    // angka tahun menghitung (RGB split saat distorsi)
    const y = Math.round(lerp(v.from, ERA_CONF[v.to].from, pr));
    ctx.textAlign = 'center'; ctx.font = 'bold 64px monospace';
    const yr = String(y), roff = OPTS.reduceMotion ? 0 : 3 + pr * 5; // RGB-split nonaktif saat reduceMotion
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = 'rgba(255,60,60,.8)'; ctx.fillText(yr, W / 2 - roff, H / 2 + 16);
    ctx.fillStyle = 'rgba(60,200,255,.8)'; ctx.fillText(yr, W / 2 + roff, H / 2 + 16);
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = v.rewind ? `rgba(255,110,80,.95)` : 'rgba(180,235,255,.95)';
    ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = 24; ctx.fillText(yr, W / 2, H / 2 + 16); ctx.shadowBlur = 0;
    ctx.font = '15px ' + F_UI; ctx.fillStyle = 'rgba(245,240,232,.6)';
    ctx.fillText(v.rewind ? 'SINYAL REALITAS TERPUTUS — MENGULANG SIKLUS' : 'MELOMPAT MENEMBUS ARUS WAKTU', W / 2, H - 64);
    if (pr > .82 && !OPTS.reduceMotion) { ctx.fillStyle = `rgba(255,255,255,${(pr - .82) / .18})`; ctx.fillRect(0, 0, W, H); }
  }
  else if (G.state === 'glitch') {
    drawScene(ctx); drawChars(ctx, 'dialog');
    {
      const FE = G.era === '1968' ? (S.routeB1 === 'A' ? '1968A' : '1968B') : G.era;
      if (!bgFgImg(ctx, 'bg' + FE + '_fg', G.cam)) fgSilhouette(ctx, FE, G.cam);
    }
    grade(ctx, G.era); eraPostFX(ctx, G.era === '1968' ? (S.routeB1 === 'A' ? '1968A' : '1968B') : G.era);
    // efek glitch strip (dimatikan oleh reduceMotion — sisakan teks LOOP & petunjuk)
    const gt = G.glitch.t;
    if (!OPTS.reduceMotion) {
      for (let i = 0; i < 14; i++) {
        const sy = Math.random() * H, sh = 6 + Math.random() * 36, off = (Math.random() - .5) * 90 * (1 - gt / 2);
        try { ctx.drawImage(cv, 0, sy, W, sh, off, sy, W, sh); } catch (e) { }
      }
      // ghosting RGB layar penuh
      ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = .2;
      try { const o2 = 3 * (1 - Math.min(gt, 1.4) / 1.4); ctx.drawImage(cv, o2, 0); ctx.drawImage(cv, -o2, 0); } catch (e) { }
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      if (Math.random() < .5) { ctx.globalCompositeOperation = 'difference'; ctx.fillStyle = `rgba(${Math.random() * 255 | 0},40,60,.5)`; ctx.fillRect(0, Math.random() * H, W, 20 + Math.random() * 80); ctx.globalCompositeOperation = 'source-over'; }
      for (let i = 0; i < 26; i++) { ctx.fillStyle = `rgba(245,240,232,${Math.random() * .5})`; ctx.fillRect(Math.random() * W, Math.random() * H, 30 + Math.random() * 80, 1.6); }
    }
    if (gt > .3 && gt < 1.2 && Math.floor(gt * 14) % 2 === 0) {
      ctx.textAlign = 'center'; ctx.font = 'bold 84px monospace'; ctx.fillStyle = '#E2503C';
      ctx.shadowColor = '#E2503C'; ctx.shadowBlur = 30; ctx.fillText('⟲ LOOP ' + S.loop, W / 2, H / 2); ctx.shadowBlur = 0;
      ctx.font = 'bold 20px monospace'; ctx.fillStyle = '#F5F0E8'; ctx.fillText('REALITAS TERPECAH — TIMELINE DI-RESET', W / 2, H / 2 + 44);
    }
    if (gt > .7) {
      const a = clamp((gt - .7) / .5, 0, 1);
      ctx.font = 'italic 15px Georgia,serif'; ctx.fillStyle = `rgba(245,240,232,${.8 * a})`;
      ctx.fillText(G.glitch.hint, W / 2, H / 2 + 86);
      ctx.font = '12.5px ' + F_UI; ctx.fillStyle = `rgba(226,90,70,${.8 * a})`;
      ctx.fillText('⟨ ' + G.glitch.kasus + ' ⟩', W / 2, H / 2 + 110);
    }
  }
  else if (G.state === 'endcard') {
    bg1999(ctx, 120, T); spawnParts('1999');
    ctx.save(); ctx.translate(W * 0.5 - 60, GROUND); groundShadow(ctx); // pose berlutut di kartu akhir (fallback sheet)
    if (!drawPoseImage(ctx, 'pose_elena_kneel')) drawElena(ctx, T, 0, false, 'warm', { vial: true });
    ctx.restore();
    if (!bgFgImg(ctx, 'bg1999_fg', 120)) fgSilhouette(ctx, '1999', 120); // okluder depan sama seperti walk/dialog
    grade(ctx, '1999'); eraPostFX(ctx, '1999');
    const a = clamp(G.endCard.t / 2, 0, 1);
    ctx.fillStyle = `rgba(10,8,6,${.55 * a})`; ctx.fillRect(0, 0, W, H);
    drawParts(ctx, 1 / 60); // partikel di atas overlay agar sparkle terlihat
    ctx.textAlign = 'center';
    ctx.fillStyle = `rgba(245,240,232,${a})`; ctx.font = 'italic 26px Georgia,serif'; ctx.fillText('THE END', W / 2, 168);
    ctx.fillStyle = `rgba(194,59,59,${a})`; ctx.font = 'bold 30px Georgia,serif'; ctx.fillText('HEARTS ACROSS TIME: BREAK THE LOOP', W / 2, 208);
    // statistik hidden affinity terungkap + rekap siklus (P4)
    if (G.endCard.t > 1.6) {
      const a2 = clamp((G.endCard.t - 1.6) / 1.4, 0, 1);
      ctx.fillStyle = `rgba(245,240,232,${.85 * a2})`; ctx.font = '16px ' + F_UI;
      ctx.fillText(`Siklus ditempuh : ${S.loop}× loop`, W / 2, 286);
      const eG = OPTS.reduceMotion ? 1 : easeO(clamp((G.endCard.t - 1.9) / .9, 0, 1)), tot = Math.max(1, S.empathy + S.logic);
      const bar = (lbl, val, col, y) => { // batang afinitas tumbuh pelan ala tinta
        ctx.font = '13px ' + F_UI; ctx.textAlign = 'right'; ctx.fillStyle = `rgba(245,240,232,${.85 * a2})`; ctx.fillText(lbl, W / 2 - 172, y + 4);
        ctx.fillStyle = 'rgba(245,240,232,.13)'; rr(ctx, W / 2 - 160, y - 9, 300, 17, 8); ctx.fill();
        ctx.strokeStyle = `rgba(22,16,10,${.5 * a2})`; ctx.lineWidth = 1.2; rr(ctx, W / 2 - 160, y - 9, 300, 17, 8); ctx.stroke();
        const w = val > 0 ? Math.max(7, 300 * (val / tot) * eG) : 0;
        if (w > 0) { ctx.fillStyle = col; rr(ctx, W / 2 - 160, y - 9, w, 17, 8); ctx.fill(); }
        ctx.font = '11px ' + F_META; ctx.textAlign = 'left'; ctx.fillStyle = `rgba(245,240,232,${.75 * a2})`;
        ctx.fillText(String(val), W / 2 - 152 + Math.min(w, 284), y + 3.5); };
      bar('♥ Empati', S.empathy, 'rgba(168,85,80,.92)', 315);
      bar('⚙ Logika', S.logic, 'rgba(85,107,127,.92)', 341);
      if (G.endCard.t > 2.2) { // chip pendekatan tantangan + rute yang ditempuh siklus ini
        const a3 = clamp((G.endCard.t - 2.2) / .8, 0, 1), chips = [];
        if (S.routeB1) chips.push('RUTE 1' + S.routeB1);
        if (S.routeB2) chips.push('RUTE 2' + S.routeB2);
        Object.keys(S.challenges).sort().forEach(e => { const v = S.challenges[e]; if (v) chips.push(e + ' ' + (v === 'empathy' ? '♥' : '⚙')); });
        ctx.font = '10.5px ' + F_UI;
        const cws = chips.map(s => ctx.measureText(s).width + 20), tw = cws.reduce((a, b) => a + b, 0) + Math.max(0, chips.length - 1) * 8;
        let cx = W / 2 - tw / 2;
        chips.forEach((s, i) => {
          ctx.save(); ctx.globalAlpha = a3;
          inkTag(ctx, cx, 360, cws[i], 19, s.includes('♥') ? '#7E4A46' : s.includes('⚙') ? '#48596B' : '#55614C', 0);
          ctx.fillStyle = '#F3EADA'; ctx.font = 'bold 10.5px ' + F_UI; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText(s, cx + cws[i] / 2, 370);
          ctx.restore(); ctx.textBaseline = 'alphabetic';
          cx += cws[i] + 8;
        });
      }
      if (loreFoundCount() >= LORE_IDS.length && G.endCard.t > 2.5) { // hadiah P3: pengakuan pembaca sejati
        ctx.save(); ctx.globalAlpha = clamp((G.endCard.t - 2.5) / .9, 0, 1);
        ctx.fillStyle = '#F1D58B'; ctx.font = 'italic 13.5px Georgia,serif'; ctx.textAlign = 'center';
        ctx.fillText('✦ Kelima jejak kisah ditemukan — kau membaca hidup Arthur sampai habis.', W / 2, 397);
        ctx.restore();
      }
      ctx.fillStyle = `rgba(245,240,232,${.55 * a2})`; ctx.font = 'italic 14px Georgia,serif';
      ctx.fillText('"...di tahun 2088, kita akan bertemu lagi sebagai dua orang biasa yang saling jatuh cinta."', W / 2, 420);
    }
    if (G.endCard.t > 2.6 && Math.floor(T * 2) % 2 === 0) { ctx.fillStyle = 'rgba(245,240,232,.75)'; ctx.font = '15.5px ' + F_UI; ctx.fillText('▶ MAIN LAGI (ENTER / SENTUH)', W / 2, 452); }
    // bingkai ganda kartu komik penutup
    ctx.strokeStyle = 'rgba(22,16,10,.6)'; ctx.lineWidth = 2.6; rr(ctx, 10, 10, W - 20, H - 20, 6); ctx.stroke();
    ctx.strokeStyle = 'rgba(22,16,10,.35)'; ctx.lineWidth = 1; rr(ctx, 16, 16, W - 32, H - 32, 4); ctx.stroke();
  }
  // backlog dialog di atas UI, di bawah transisi
  if (G.logOpen && !G.paused) drawLog(ctx);
  // transisi fade-in dari hitam (set G.fadeIn=1 saat berganti adegan besar)
  if (G.fadeIn > 0) { ctx.fillStyle = `rgba(10,8,6,${clamp(G.fadeIn, 0, 1)})`; ctx.fillRect(0, 0, W, H); }
  // white flash di atas segalanya (dibatasi 30% saat reduceMotion)
  if (G.whiteFlash > 0) { ctx.fillStyle = `rgba(255,255,255,${clamp(G.whiteFlash, 0, OPTS.reduceMotion ? .3 : 1)})`; ctx.fillRect(0, 0, W, H); }
  ctx.restore();
  if (G.paused) drawPause(ctx);
  drawMuteBtn(ctx);
  drawPauseBtn(ctx);
}
function drawFFBtn(c) { // tombol lewati (hanya jika node ini pernah dilihat)
  if (!(D.line && SAVE.seen[D.node] && !D.choices)) return;
  const x = 46, y = H - 44; c.save(); c.globalAlpha = .55;
  c.fillStyle = '#0a0806'; c.beginPath(); c.arc(x, y, 22, 0, TAU); c.fill();
  c.strokeStyle = '#F5F0E8'; c.lineWidth = 1.6; c.stroke();
  c.fillStyle = '#F5F0E8'; c.font = '13px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillText('⏩', x, y + 1); c.restore(); c.textBaseline = 'alphabetic';
  c.globalAlpha = 1;
}
function drawPauseBtn(c) {
  if (G.paused || !(G.state === 'walk' || G.state === 'challenge' || G.state === 'dialog' || G.state === 'prologue' || G.state === 'warintro' || G.state === 'bunkerintro' || G.state === 'labintro')) return;
  const x = W - 72, y = 26; c.save(); c.globalAlpha = .65; c.fillStyle = '#0a0806'; c.beginPath(); c.arc(x, y, 15, 0, TAU); c.fill();
  c.strokeStyle = '#F5F0E8'; c.lineWidth = 1.6; c.beginPath(); c.arc(x, y, 15, 0, TAU); c.stroke();
  c.fillStyle = '#F5F0E8'; c.font = '13px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillText('⏸', x, y + 1); c.restore(); c.textBaseline = 'alphabetic'; // logika tap pindah ke update() (ptr.tap tak pernah hidup di render)
}
function drawPause(c) { // panel jeda kertas + tinta
  c.fillStyle = 'rgba(6,5,4,.74)'; c.fillRect(0, 0, W, H);
  const items = pauseItems(), bw = 460, bh = items.length * 44 + 56, bx = (W - bw) / 2, by = (H - bh) / 2;
  c.save();
  sketchRR(c, bx, by, bw, bh, 8);
  c.textAlign = 'center'; c.fillStyle = '#94342E'; c.font = 'bold 19px ' + F_UI; c.fillText('— JEDA —', W / 2, by + 28);
  items.forEach((it, i) => {
    const iy = by + 40 + i * 44, on = i === G.pSel;
    if (on) {
      c.fillStyle = 'rgba(148,52,46,.10)'; rr(c, bx + 10, iy, bw - 20, 38, 6); c.fill();
      c.strokeStyle = '#94342E'; c.lineWidth = 2.6; c.lineCap = 'round'; c.beginPath(); c.moveTo(bx + 16, iy + 8); c.quadraticCurveTo(bx + 14, iy + 19, bx + 16, iy + 30); c.stroke();
    }
    c.fillStyle = on ? '#94342E' : '#2B211A'; c.font = (on ? 'bold ' : '') + '16px ' + F_UI;
    c.fillText((on ? '▶ ' : '') + it.label, W / 2, iy + 24);
  });
  c.restore();
  c.fillStyle = 'rgba(243,234,218,.5)'; c.font = '12.5px ' + F_UI; c.textAlign = 'center';
  c.fillText('ESC: lanjut  •  ↑↓: pilih  •  ←→: ubah  •  ENTER: oke', W / 2, by + bh + 24);
}
function hintAdvance(c) { const bob = OPTS.reduceMotion ? 0 : Math.sin(T * 2.4) * 1.6; c.save(); c.translate(0, bob); c.fillStyle = `rgba(245,240,232,${.4 + .3 * Math.sin(T * 5)})`; c.font = '13.5px ' + F_UI; c.textAlign = 'center'; c.fillText('▼ ENTER / KLIK', W / 2, H - 10); c.restore(); } // napas alfa + bob halus (missed-opportunity motion)
function drawLog(c) { // overlay backlog — TAB/B; riwayat 30 dialog terakhir (halaman buku catatan)
  const boxW = 720, pad = 22, bx = (W - boxW) / 2, by = 48, bh = H - 96, lineH = 18;
  c.save(); c.fillStyle = 'rgba(6,5,4,.82)'; c.fillRect(0, 0, W, H);
  sketchRR(c, bx, by, boxW, bh, 8);
  c.textAlign = 'left'; c.textBaseline = 'top';
  c.fillStyle = '#94342E'; c.font = 'bold 15px ' + F_UI; c.fillText('— CATATAN DIALOG —', bx + pad, by + 13);
  // rakit baris terbungkus dari riwayat (yang terbaru di bawah)
  const rows = [];
  c.font = '15px ' + F_UI;
  LOG.forEach(e => {
    const nm = e.who === 'narrator' ? '' : (WHO[e.who] ? WHO[e.who].name : String(e.who).toUpperCase());
    wrap(c, e.text, boxW - pad * 2 - 94).forEach((ln, k) => rows.push({ nm: k ? '' : nm, txt: ln, narr: e.who === 'narrator' }));
  });
  const maxRows = Math.floor((bh - 58) / lineH);
  G.logScroll = clamp(G.logScroll || 0, 0, Math.max(0, rows.length - maxRows));
  const end = rows.length - G.logScroll, start = Math.max(0, end - maxRows);
  let y = by + 40;
  for (let i = start; i < end && y < by + bh - 30; i++) {
    const r = rows[i];
    if (r.nm) { c.fillStyle = '#94342E'; c.font = 'bold 11px ' + F_UI; c.fillText(r.nm, bx + pad, y + 3); c.font = '15px ' + F_UI; }
    c.fillStyle = r.narr ? 'rgba(43,33,26,.62)' : '#2B211A'; c.fillText(r.txt, bx + pad + 88, y); y += lineH;
  }
  if (!rows.length) { c.fillStyle = 'rgba(43,33,26,.55)'; c.fillText('Belum ada dialog terekam.', bx + pad, y); }
  c.fillStyle = 'rgba(43,33,26,.5)'; c.font = '12px ' + F_UI; c.textAlign = 'center';
  c.fillText('↑↓: gulir  •  TAB / ESC / KLIK: tutup', bx + boxW / 2, by + bh - 16);
  c.restore(); c.textBaseline = 'alphabetic';
}
function drawMuteBtn(c) {
  const x = W - 34, y = 26; c.save(); c.globalAlpha = .65; c.fillStyle = '#0a0806'; c.beginPath(); c.arc(x, y, 15, 0, TAU); c.fill();
  c.strokeStyle = '#F5F0E8'; c.lineWidth = 1.6; c.beginPath(); c.arc(x, y, 15, 0, TAU); c.stroke();
  c.fillStyle = '#F5F0E8'; c.font = '13px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillText(AU.muted ? '🔇' : '🔊', x, y + 1); c.restore(); c.textBaseline = 'alphabetic'; // logika tap pindah ke update()
}
function toggleMute() {
  AU.muted = !AU.muted; if (AU.master) AU.master.gain.value = AU.muted ? 0 : vGain(OPTS.vol);
  if (!AU.muted) { setAmbience(G.state === 'title' ? 'title' : (ERA_CONF[G.era] ? ERA_CONF[G.era].amb : '2088')); }
}
