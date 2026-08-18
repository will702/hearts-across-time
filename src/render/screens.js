/* ---------- render ---------- */
function drawScene(c,cam){if(cam===undefined)cam=G.cam;const t=T;
  if(G.era==='1944')bg1944(c,cam,t);
  else if(G.era==='1968')bg1968(c,cam,t,S.routeB1==='A');
  else if(G.era==='1999')bg1999(c,cam,t);
  else bg2088(c,cam,t);
  drawProps(c,G.era==='1968'?(S.routeB1==='A'?'1968A':'1968B'):G.era,cam); // properti animasi era
  drawParts(c,1/60);
}
function drawChars(c,mode,cam){if(cam===undefined)cam=G.cam; // mode: 'walk' (dunia) | 'dialog' | 'prologue'
  const t=T,p=G.player;
  const speaking=G.speak&&D.line&&D.prog<1?G.speak.who:null; // pantul saat bicara: prog hidup di D, bukan G
  const bnc=w=>speaking===w?Math.exp(-4.5*G.speak.t)*Math.sin(13*G.speak.t)*3.5:0; // pantul halus karakter yang bicara
  const breathE=(mode!=='walk'||!p.moving)?Math.sin(T*1.6)*1.1:0; // tarikan napas idle
  const elScreenX = mode==='walk' ? p.x-cam : (mode==='prologue'? W*0.42 : (G.walk? G.walk.arX-190-cam : W*0.42));
  c.save();c.translate(elScreenX,GROUND-bnc('elena')+breathE);groundShadow(c,p.moving&&mode==='walk'?.82:1);
  if(mode==='walk'&&p.turnT>0)c.scale(1-.18*Math.sin(Math.PI*(1-clamp(p.turnT/.14,0,1))),1); // squash berganti arah
  if(!p.facingRight&&mode==='walk')c.scale(-1,1);
  const pz=POSES[D.node];
  const posE=(mode==='dialog'&&pz&&pz.side==='elena'&&(!pz.expr||pz.expr===D.elExpr))?pz.id:null; // pose lukis momen kunci (filter ekspresi opsional)
  if(posE){c.save();c.globalAlpha=poseFade(posE);const okPose=drawPoseImage(c,posE);c.restore();
    if(!okPose)drawElena(c,t,p.phase,p.moving&&mode==='walk',D.elExpr,{vial:G.state==='endcard'||(G.state==='dialog'&&D.node==='true_end'&&D.i>4),lean:0,stride:1});}
  else drawElena(c,t,p.phase,p.moving&&mode==='walk',D.elExpr,{vial:G.state==='endcard'||(G.state==='dialog'&&D.node==='true_end'&&D.i>4),lean:mode==='walk'?((p.vx/262)*.11+clamp((p.acc||0)/900,-1,1)*.03)*(p.facingRight?1:-1):0,stride:mode==='walk'?p.stride:1});
  c.restore();
  if(G.walk&&G.walk.ar&&(mode==='walk'||mode==='dialog')){
    const ax=G.walk.arX-cam;
    const ab=speaking&&speaking!=='elena'&&speaking!=='narrator'?Math.exp(-4.5*G.speak.t)*Math.sin(13*G.speak.t)*3.5:0;
    const breathA=Math.sin(T*1.6+2.2)*1.0; // napas idle Arthur (beda fase)
    c.save();c.translate(ax,GROUND-ab+breathA);groundShadow(c);c.scale(-1,1); // menghadap kiri (ke Elena)
    const posA=(mode==='dialog'&&pz&&pz.side==='arthur'&&(!pz.expr||pz.expr===D.arExpr))?pz.id:
      ((mode==='dialog'&&D.node==='n_b3'&&D.line&&D.line.who==='tua'&&(D.arExpr==='warm'||D.arExpr==='happy'))?'pose_arthur_tua_reach':null);
    if(posA){c.globalAlpha=poseFade(posA);if(!drawPoseImage(c,posA)){c.globalAlpha=1;drawArthur(c,D.arKind,t,D.arExpr,{tremble:D.arKind==='tua'&&D.arExpr==='mad'});}c.globalAlpha=1;}
    else drawArthur(c,D.arKind,t,D.arExpr,{tremble:D.arKind==='tua'&&D.arExpr==='mad'});
    c.restore();
  }
}
/* ============================================================
   PROLOG 2088 — panel sinematik berdasarkan frame Figma 66:40.
   Latar bergerak dari close-up ke framing akhir; reduceMotion
   membekukan kamera tanpa mengubah komposisi dan keterbacaan.
   ============================================================ */
function drawCoverImage(c,im,zoom=1,panX=0,panY=0){
  if(!im||!im.width)return false;
  const base=Math.max(W/im.width,H/im.height),dw=im.width*base*zoom,dh=im.height*base*zoom;
  c.drawImage(im,(W-dw)/2+panX,(H-dh)/2+panY,dw,dh);return true;
}
function drawPrologueElena(c){
  const sad=D.i<=2,front=AS.imgs[sad?'elena_dialog2_sedih':'elena_dialog1'];
  const back=AS.imgs[sad?'elena_dialog1':'elena_dialog2_sedih'];
  if(!front||!front.width){c.save();c.translate(W*.5,GROUND+2);groundShadow(c);drawElena(c,T,0,false,sad?'sad':'neutral');c.restore();return;}
  // Dua file menyimpan karakter di kanvas transparan; crop ini mengambil setengah badan (waist-up).
  const sx=front.width*.345,sy=front.height*.03,sw=front.width*.31,sh=front.height*.48;
  const dh=270,dw=dh*(sw/sh),x=W*.5-dw*.5,y=GROUND-dh+20;
  const born=easeO(clamp(G.prologueT/.85,0,1)),breath=OPTS.reduceMotion?0:Math.sin(G.prologueT*1.55)*1.4;
  c.save();c.globalAlpha=.25*born;c.fillStyle='#090706';c.filter='blur(9px)';c.beginPath();c.ellipse(W*.5,GROUND+2,dw*.42,9,0,0,TAU);c.fill();c.filter='none';
  c.globalAlpha=born;c.translate(0,breath);
  if(back&&back.width&&D.popT<.22){const a=clamp(D.popT/.22,0,1);c.globalAlpha=born*(1-a);c.drawImage(back,sx,sy,sw,sh,x,y,dw,dh);c.globalAlpha=born*a;}
  c.drawImage(front,sx,sy,sw,sh,x,y,dw,dh);c.restore();
}
function drawPrologueScene(c){
  const im=AS.imgs.bgnarator,mot=OPTS.reduceMotion?0:1,p=easeO(clamp(G.prologueT/7.5,0,1));
  // Kamera dimulai besar, lalu perlahan mundur untuk memperlihatkan luasnya kehancuran.
  const zoom=1+mot*.16*(1-p),panX=mot*lerp(-18,0,p),panY=mot*lerp(12,0,p);
  if(!drawCoverImage(c,im,zoom,panX,panY)){bg2088(c,0,T,.25);drawProps(c,'2088',0);}
  // Abu di bidang dekat memberi pemisahan kedalaman terhadap ilustrasi statis.
  spawnParts('2088');drawParts(c,1/60);
  const lower=c.createLinearGradient(0,H*.56,0,H);lower.addColorStop(0,'rgba(8,7,6,0)');lower.addColorStop(1,'rgba(8,6,5,.64)');c.fillStyle=lower;c.fillRect(0,H*.5,W,H*.5);
  drawPrologueElena(c);
  // Top Gaussian blur & smooth gradient vignette connecting seamlessly into background
  c.save();
  const topGrad=c.createLinearGradient(0,0,0,210);
  topGrad.addColorStop(0,'rgba(4,4,5,0.82)');
  topGrad.addColorStop(0.35,'rgba(5,5,6,0.50)');
  topGrad.addColorStop(0.70,'rgba(6,5,6,0.18)');
  topGrad.addColorStop(1,'rgba(7,6,6,0)');
  c.fillStyle=topGrad;
  c.filter=OPTS.reduceMotion?'none':'blur(12px)';
  c.fillRect(-20,-20,W+40,230);
  c.restore();
}
/* ============================================================
   INTRO 1944 — empat beat kamera dari frame Figma 63:6, 64:18,
   64:20, dan 68:54 sebelum kontrol pemain diaktifkan.
   ============================================================ */
const WAR_CAM=[
  {z:3.25,fx:.34,fy:.76}, // detail puing, helm, dan korban
  {z:1.86,fx:.50,fy:.43}, // parit terbuka, ledakan mulai terungkap
  {z:1.68,fx:.60,fy:.44}, // ledakan menjadi pusat komposisi
  {z:1.68,fx:.60,fy:.44}, // tahan framing untuk kemunculan Elena
];
function warCamAt(t){
  const q=clamp(t/3.25,0,1)*(WAR_CAM.length-1),i=Math.min(WAR_CAM.length-2,Math.floor(q)),u=easeIO(q-i),a=WAR_CAM[i],b=WAR_CAM[i+1];
  return{z:lerp(a.z,b.z,u),fx:lerp(a.fx,b.fx,u),fy:lerp(a.fy,b.fy,u)};
}
function drawWarIntroBg(c){
  const im=AS.imgs.bg1944_mid;if(!im||!im.width){bg1944(c,0,T);return;}
  const k=OPTS.reduceMotion?WAR_CAM[WAR_CAM.length-1]:warCamAt(G.warIntro.t);
  const base=Math.max(W/im.width,H/im.height),dw=im.width*base*k.z,dh=im.height*base*k.z;
  c.drawImage(im,W*.5-k.fx*dw,H*.5-k.fy*dh,dw,dh);
  spawnParts('1944');drawParts(c,1/60);
  const vg=c.createRadialGradient(W*.5,H*.45,H*.18,W*.5,H*.45,H*.82);vg.addColorStop(0,'rgba(12,8,6,0)');vg.addColorStop(1,'rgba(8,6,5,.42)');c.fillStyle=vg;c.fillRect(0,0,W,H);
}
function drawWarIntroElena(c){
  const im=AS.imgs.elena_dialog1,a=easeO(G.warIntro.reveal);if(!im||!im.width){c.save();c.globalAlpha=a;c.translate(W*.5,GROUND+26);c.scale(1.85,1.85);drawElena(c,T,0,false,'angry');c.restore();return;}
  const sx=im.width*.345,sy=im.height*.03,sw=im.width*.31,sh=im.height*.48,dh=318,dw=dh*(sw/sh);
  const y=H-dh+18+(1-a)*26,bob=OPTS.reduceMotion?0:Math.sin(T*1.45)*1.2;
  c.save();c.globalAlpha=a;c.translate(0,bob);c.shadowColor='rgba(20,8,4,.72)';c.shadowBlur=18;c.drawImage(im,sx,sy,sw,sh,W*.5-dw*.5,y,dw,dh);c.restore();
}
function drawWarIntro(c){
  drawWarIntroBg(c);
  const top=c.createLinearGradient(0,0,0,190);top.addColorStop(0,'rgba(7,5,5,.68)');top.addColorStop(1,'rgba(7,5,5,0)');c.fillStyle=top;c.fillRect(0,0,W,190);
  if(G.warIntro.t>=3.25){drawWarIntroElena(c);if(D.line&&G.warIntro.reveal>.15)drawNarr(c,D.line.text,D.prog,D.popT);if(D.line&&D.prog>=1)hintAdvance(c);}
  else{const p=clamp(G.warIntro.t/3.25,0,1);c.textAlign='center';c.fillStyle=`rgba(245,240,232,${.36+.28*Math.sin(T*3)})`;c.font='italic 14px Georgia,serif';c.fillText('1944 — GARIS DEPAN',W/2,H-30);c.fillStyle='rgba(245,240,232,.2)';rr(c,W/2-105,H-19,210,3,2);c.fill();c.fillStyle='#A85550';rr(c,W/2-105,H-19,210*p,3,2);c.fill();}
}
/* ============================================================
   INTRO BUNKER 1968 — frame Figma 72:124 → 72:126 → 72:135
   → 72:128. Kamera turun dari tangga lalu membuka seluruh ruang.
   ============================================================ */
const BUNKER_CAM=[
  {z:3.25,fx:.80,fy:.28}, // tangga spiral dan lampu bunker
  {z:3.25,fx:.75,fy:.69}, // turun mengikuti pipa ke lantai
  {z:1.22,fx:.45,fy:.49}, // ruangan bawah tanah terungkap penuh
  {z:1.22,fx:.45,fy:.49}, // tahan framing saat Elena masuk
];
function bunkerCamAt(t){
  const q=clamp(t/4.6,0,1)*(BUNKER_CAM.length-1),i=Math.min(BUNKER_CAM.length-2,Math.floor(q)),u=easeIO(q-i),a=BUNKER_CAM[i],b=BUNKER_CAM[i+1];
  return{z:lerp(a.z,b.z,u),fx:lerp(a.fx,b.fx,u),fy:lerp(a.fy,b.fy,u)};
}
function drawBunkerIntroBg(c){
  const im=AS.imgs.background_bawah_tanah;if(!im||!im.width){bg1968(c,0,T,true);return;}
  const k=OPTS.reduceMotion?BUNKER_CAM[BUNKER_CAM.length-1]:bunkerCamAt(G.bunkerIntro.t);
  const base=Math.max(W/im.width,H/im.height),dw=im.width*base*k.z,dh=im.height*base*k.z;
  c.drawImage(im,W*.5-k.fx*dw,H*.5-k.fy*dh,dw,dh);
  spawnParts('1968');drawParts(c,1/60);
  const cold=c.createLinearGradient(0,0,W,H);cold.addColorStop(0,'rgba(20,14,12,.25)');cold.addColorStop(.72,'rgba(20,48,67,.10)');cold.addColorStop(1,'rgba(5,12,18,.34)');c.fillStyle=cold;c.fillRect(0,0,W,H);
  const vg=c.createRadialGradient(W*.52,H*.46,H*.22,W*.52,H*.46,H*.8);vg.addColorStop(0,'rgba(0,0,0,0)');vg.addColorStop(1,'rgba(5,6,8,.48)');c.fillStyle=vg;c.fillRect(0,0,W,H);
}
function drawBunkerIntroElena(c){
  const im=AS.imgs.elena_dialog2_sedih,a=easeO(G.bunkerIntro.reveal);if(!im||!im.width){c.save();c.globalAlpha=a;c.translate(W*.5,GROUND+18);c.scale(1.75,1.75);drawElena(c,T,0,false,'sad');c.restore();return;}
  const sx=im.width*.345,sy=im.height*.03,sw=im.width*.31,sh=im.height*.48,dh=292,dw=dh*(sw/sh);
  const y=H-dh+20+(1-a)*24,bob=OPTS.reduceMotion?0:Math.sin(T*1.35)*1.1;
  c.save();c.globalAlpha=a;c.translate(0,bob);c.shadowColor='rgba(2,8,14,.78)';c.shadowBlur=20;c.drawImage(im,sx,sy,sw,sh,W*.5-dw*.5,y,dw,dh);c.restore();
}
function drawBunkerIntro(c){
  drawBunkerIntroBg(c);
  const top=c.createLinearGradient(0,0,0,190);top.addColorStop(0,'rgba(4,7,10,.72)');top.addColorStop(1,'rgba(4,7,10,0)');c.fillStyle=top;c.fillRect(0,0,W,190);
  if(G.bunkerIntro.t>=4.6){drawBunkerIntroElena(c);if(D.line&&G.bunkerIntro.reveal>.15)drawNarr(c,D.line.text,D.prog,D.popT);if(D.line&&D.prog>=1)hintAdvance(c);}
  else{const p=clamp(G.bunkerIntro.t/4.6,0,1);c.textAlign='center';c.fillStyle=`rgba(216,232,239,${.34+.22*Math.sin(T*2.2)})`;c.font='italic 14px Georgia,serif';c.fillText('1968 — BUNKER BAWAH TANAH',W/2,H-30);c.fillStyle='rgba(216,232,239,.17)';rr(c,W/2-112,H-19,224,3,2);c.fill();c.fillStyle='#6B91A8';rr(c,W/2-112,H-19,224*p,3,2);c.fill();}
}
/* ============================================================
   INTRO LAB MILITER 1968 — rute B saja. Empat crop Figma
   73:143 → 73:149 → 73:151 → 74:153 menjadi dolly-out lambat.
   ============================================================ */
const LAB_CAM=[
  {z:2.18,fx:.30,fy:.30}, // pipa tembaga dan panel mesin
  {z:2.04,fx:.53,fy:.56}, // layar formula dan meja kontrol
  {z:1.10,fx:.50,fy:.50}, // seluruh fasilitas militer terungkap
  {z:1.10,fx:.50,fy:.50}, // tahan framing untuk Elena
];
function labCamAt(t){
  const q=clamp(t/4.6,0,1)*(LAB_CAM.length-1),i=Math.min(LAB_CAM.length-2,Math.floor(q)),u=easeIO(q-i),a=LAB_CAM[i],b=LAB_CAM[i+1];
  return{z:lerp(a.z,b.z,u),fx:lerp(a.fx,b.fx,u),fy:lerp(a.fy,b.fy,u)};
}
function drawLabIntroBg(c){
  const im=AS.imgs.laboratorium_militer;if(!im||!im.width){bg1968(c,0,T,false);return;}
  const k=OPTS.reduceMotion?LAB_CAM[LAB_CAM.length-1]:labCamAt(G.labIntro.t);
  const base=Math.max(W/im.width,H/im.height),dw=im.width*base*k.z,dh=im.height*base*k.z;
  c.drawImage(im,W*.5-k.fx*dw,H*.5-k.fy*dh,dw,dh);
  spawnParts('1968');drawParts(c,1/60);
  const cool=c.createLinearGradient(0,0,W,H);cool.addColorStop(0,'rgba(17,35,47,.12)');cool.addColorStop(.62,'rgba(24,55,72,.05)');cool.addColorStop(1,'rgba(4,12,18,.30)');c.fillStyle=cool;c.fillRect(0,0,W,H);
  const vg=c.createRadialGradient(W*.5,H*.46,H*.22,W*.5,H*.46,H*.82);vg.addColorStop(0,'rgba(0,0,0,0)');vg.addColorStop(1,'rgba(3,8,12,.44)');c.fillStyle=vg;c.fillRect(0,0,W,H);
}
function drawLabIntroElena(c){
  const im=AS.imgs.elena_dialog1,a=easeO(G.labIntro.reveal);if(!im||!im.width){c.save();c.globalAlpha=a;c.translate(W*.5,GROUND+26);c.scale(1.85,1.85);drawElena(c,T,0,false,'angry');c.restore();return;}
  const sx=im.width*.345,sy=im.height*.03,sw=im.width*.31,sh=im.height*.48,dh=318,dw=dh*(sw/sh);
  const y=H-dh+18+(1-a)*26,bob=OPTS.reduceMotion?0:Math.sin(T*1.45)*1.2;
  c.save();c.globalAlpha=a;c.translate(0,bob);c.shadowColor='rgba(3,10,16,.78)';c.shadowBlur=20;c.drawImage(im,sx,sy,sw,sh,W*.5-dw*.5,y,dw,dh);c.restore();
}
function drawLabIntro(c){
  drawLabIntroBg(c);
  const top=c.createLinearGradient(0,0,0,190);top.addColorStop(0,'rgba(3,9,14,.72)');top.addColorStop(1,'rgba(3,9,14,0)');c.fillStyle=top;c.fillRect(0,0,W,190);
  if(G.labIntro.t>=4.6){drawLabIntroElena(c);if(D.line&&G.labIntro.reveal>.15)drawNarr(c,D.line.text,D.prog,D.popT);if(D.line&&D.prog>=1)hintAdvance(c);}
  else{const p=clamp(G.labIntro.t/4.6,0,1);c.textAlign='center';c.fillStyle=`rgba(220,238,247,${.36+.24*Math.sin(T*2.2)})`;c.font='italic 14px Georgia,serif';c.fillText('1968 — LABORATORIUM MILITER',W/2,H-30);c.fillStyle='rgba(220,238,247,.18)';rr(c,W/2-112,H-19,224,3,2);c.fill();c.fillStyle='#5D91A9';rr(c,W/2-112,H-19,224*p,3,2);c.fill();}
}
/* ============================================================
   COVER / LAYAR JUDUL — poster sinematik: emblem jam pasir
   bercahaya + cincin waktu, ensemble Arthur lintas era
   mengapit Elena, judul berhierarki, pil MULAI berdenyut
   ============================================================ */
function drawHourglass(c,x,y,s,t){
  const mot=OPTS.reduceMotion?0:1;
  c.save();c.translate(x,y);c.scale(s,s);c.lineJoin='round';c.lineCap='round';
  c.shadowColor='rgba(226,90,70,.8)';c.shadowBlur=9+4*mot*Math.sin(t*2.2);
  c.strokeStyle='#F5F0E8';c.lineWidth=2.2;
  c.beginPath();c.moveTo(-12,-16);c.lineTo(12,-16);c.moveTo(-12,16);c.lineTo(12,16);c.stroke(); // palang atas-bawah
  c.beginPath();c.moveTo(-9,-16);c.lineTo(9,-16);c.lineTo(1.7,-1.6);c.lineTo(-1.7,-1.6);c.closePath(); // rongga atas
  c.moveTo(-9,16);c.lineTo(9,16);c.lineTo(1.7,1.6);c.lineTo(-1.7,1.6);c.closePath();c.stroke(); // rongga bawah
  // pasir merah: arus terus menetes, timbunan naik-turun mengikuti siklus (motif loop)
  const ph=mot?1-Math.abs((t*.36)%2-1):.5;
  c.fillStyle='#E05555';c.shadowColor='#E05555';c.shadowBlur=7;
  const hp=2.5+9*ph;c.beginPath();c.moveTo(-hp*.6,15);c.lineTo(hp*.6,15);c.lineTo(0,15-hp);c.closePath();c.fill();
  c.globalAlpha=.85;c.fillRect(-.9,-1.6,1.8,14);
  for(let i=0;i<3;i++){const yy=-1+((t*(8+2*i)+i*5.3)%15);c.beginPath();c.arc((i-1)*1.1,yy,1,0,TAU);c.fill();}
  c.restore();
}
function drawTimeRing(c,x,y,r,t){
  const mot=OPTS.reduceMotion?0:1;
  c.save();c.translate(x,y);
  c.strokeStyle='rgba(245,240,232,.16)';c.lineWidth=1.2;
  c.setLineDash([3,7]);c.lineDashOffset=-t*9*mot;c.beginPath();c.arc(0,0,r,0,TAU);c.stroke();
  c.strokeStyle='rgba(224,85,85,.26)';c.setLineDash([2,12]);c.lineDashOffset=t*13*mot;c.beginPath();c.arc(0,0,r-22,0,TAU);c.stroke();
  c.setLineDash([]);
  const a=t*.5*mot; // dua spark mengorbit saling berlawanan arah
  c.fillStyle='#F0CD82';c.shadowColor='#F0CD82';c.shadowBlur=8;c.beginPath();c.arc(Math.cos(a)*r,Math.sin(a)*r,2.4,0,TAU);c.fill();
  c.fillStyle='#E05555';c.shadowColor='#E05555';c.shadowBlur=7;c.beginPath();c.arc(-Math.cos(a)*(r-22),-Math.sin(a)*(r-22),1.9,0,TAU);c.fill();
  c.restore();
}
const INTRO_LAYERS=[
  ['intro12',.05,-8],['intro03',.08,4],['intro04',.11,8],['intro17',.14,-4],
  ['intro05',.22,5],['intro07',.28,-2],['intro08',.34,7],['intro09',.4,2],
  ['intro01',.48,-6],['intro02',.54,5],['intro19',.58,0],['intro10',.64,-4],
  ['intro11',.72,6],['intro13',.78,-5],['intro14',.84,4],['intro15',.9,1],['intro16',.94,-3],['intro18',.97,5],['intro20',1,-2]];
function drawIntroLayer(c,id,x,y,w,h){const im=AS.imgs[id];if(!im||!im.width)return false;c.drawImage(im,x,y,w,h);return true;}
function drawTitleIntro(c){
  const t=G.titleT,p=clamp(t/8.4,0,1),mot=OPTS.reduceMotion?0:1;
  const g=c.createLinearGradient(0,0,0,H);g.addColorStop(0,'#eee6dd');g.addColorStop(.52,'#aa9b8b');g.addColorStop(1,'#44392f');c.fillStyle=g;c.fillRect(0,0,W,H);
  // tujuh komposisi Figma dibaca sebagai tujuh key pose kamera; interpolasi menjaga gerak tetap sinematik.
  const poses=[[-170,-80,1.02],[-105,-42,1.06],[-38,-8,1.1],[24,42,1.14],[82,94,1.18],[138,142,1.22],[195,184,1.26]];
  const q=p*(poses.length-1),i=Math.min(poses.length-2,Math.floor(q)),u=easeIO(q-i);
  const kx=lerp(poses[i][0],poses[i+1][0],u)*mot,ky=lerp(poses[i][1],poses[i+1][1],u)*mot,z=lerp(poses[i][2],poses[i+1][2],u);
  let any=false;
  for(const [id,f,j] of INTRO_LAYERS){const im=AS.imgs[id];if(!im||!im.width)continue;any=true;
    const dw=1240*z,dh=dw*im.height/im.width,xx=(W-dw)/2-kx*f+j*Math.sin(t*.24+f*5)*mot,yy=(H-dh)/2-ky*f+(1-f)*22;
    c.globalAlpha=.56+.44*f;drawIntroLayer(c,id,xx,yy,dw,dh);}
  c.globalAlpha=1;
  if(!any){drawCover(c);return;}
  const fog=c.createLinearGradient(0,0,0,H);fog.addColorStop(0,'rgba(240,232,222,.2)');fog.addColorStop(.65,'rgba(40,32,26,0)');fog.addColorStop(1,'rgba(12,9,7,.55)');c.fillStyle=fog;c.fillRect(0,0,W,H);
  // identitas muncul bertahap sementara kamera menembus reruntuhan.
  const a=clamp((t-1.2)/1.3,0,1)*(1-clamp((t-6.8)/1.1,0,1));c.globalAlpha=a;c.textAlign='center';c.fillStyle='#f7f1e8';c.font='15px Georgia,serif';c.fillText('H E A R T S',W/2,76);
  c.font='bold 48px Georgia,serif';c.fillText('ACROSS TIME',W/2,130);c.fillStyle='#c85855';c.font='bold 18px '+F_UI;c.fillText('— BREAK THE LOOP —',W/2,160);c.globalAlpha=1;
  c.textAlign='center';c.fillStyle='rgba(248,242,232,.66)';c.font='13px '+F_UI;c.fillText('TEKAN ENTER / SENTUH UNTUK MELEWATI INTRO',W/2,H-28);
  c.fillStyle='rgba(248,242,232,.2)';rr(c,W/2-120,H-18,240,3,2);c.fill();c.fillStyle='#c85855';rr(c,W/2-120,H-18,240*p,3,2);c.fill();
  // dissolve ke cover interaktif; tombol mulai baru aktif setelah transisi selesai.
  const fade=clamp((t-7)/1.4,0,1);if(fade>0){c.globalAlpha=easeIO(fade);drawCover(c);c.globalAlpha=1;}
}
function drawCover(c){
  const mot=OPTS.reduceMotion?0:1,t=T;
  // latar 2088 bergeser pelan + hujan abu + motes emas/merah naik dari bawah
  bg2088(c,mot?t*9:0,t,0);
  drawProps(c,'2088',mot?t*9:0); // tong api & poster di sampul
  spawnParts('2088');
  if(Math.random()<.05)parts.push({x:Math.random()*W,y:H+8,vx:(Math.random()-.5)*10,vy:-15-Math.random()*22,l:0,ml:6+Math.random()*4,r:1+Math.random()*1.6,col:Math.random()<.5?'rgba(240,205,130,.85)':'rgba(224,85,85,.8)',pulse:1});
  drawParts(c,1/60);
  // backlight emas di balik Elena (dia pusat komposisi)
  const bl=c.createRadialGradient(W/2,404,10,W/2,404,160);bl.addColorStop(0,'rgba(240,205,130,.20)');bl.addColorStop(1,'rgba(240,205,130,0)');
  c.fillStyle=bl;c.beginPath();c.arc(W/2,404,160,0,TAU);c.fill();
  // ensemble: Arthur dari tiap era (muda 1944, buron & dewasa 1968, tua 1999) menoleh ke Elena
  const row=[{k:'muda',x:150,s:.80,f:1,e:'neutral'},{k:'buron',x:298,s:.90,f:1,e:'angry'},
             {k:'dewasa',x:662,s:.90,f:-1,e:'neutral'},{k:'tua',x:810,s:.76,f:-1,e:'warm'}];
  for(const a of row){c.save();c.translate(a.x,GROUND);c.scale(a.s*a.f,a.s);groundShadow(c,1,.32);drawArthur(c,a.k,t+a.x*.01,a.e);c.restore();}
  c.save();c.translate(W/2,GROUND);groundShadow(c,1.1,.4);drawElena(c,t,0,false,'neutral',{vial:true});c.restore();
  // tirai gelap sinematik atas & bawah (teks tetap terbaca, kaki ensemble menyatu ke gelap)
  let g=c.createLinearGradient(0,0,0,250);g.addColorStop(0,'rgba(10,8,6,.9)');g.addColorStop(.6,'rgba(10,8,6,.42)');g.addColorStop(1,'rgba(10,8,6,0)');c.fillStyle=g;c.fillRect(0,0,W,250);
  g=c.createLinearGradient(0,392,0,H);g.addColorStop(0,'rgba(10,8,6,0)');g.addColorStop(.4,'rgba(10,8,6,.74)');g.addColorStop(1,'rgba(10,8,6,.92)');c.fillStyle=g;c.fillRect(0,392,W,H-392);
  grade(c,'2088');
  // bingkai ganda sampul komik
  c.strokeStyle='rgba(22,16,10,.6)';c.lineWidth=2.6;rr(c,10,10,W-20,H-20,6);c.stroke();
  c.strokeStyle='rgba(22,16,10,.35)';c.lineWidth=1;rr(c,16,16,W-32,H-32,4);c.stroke();
  // emblem + cincin waktu + blok judul
  drawTimeRing(c,W/2,150,84,t);
  drawHourglass(c,W/2,58,1,t);
  c.textAlign='center';
  const pul=mot?.5+.5*Math.sin(t*1.6):.5;
  c.fillStyle='rgba(245,240,232,.82)';c.font='16px Georgia,serif';c.fillText('H E A R T S',W/2,120);
  c.save();c.shadowColor=`rgba(194,59,59,${.45+.35*pul})`;c.shadowBlur=22+10*pul;
  const tg=c.createLinearGradient(0,132,0,188);tg.addColorStop(0,'#F8F3E9');tg.addColorStop(1,'#D9A28F');c.fillStyle=tg;
  c.font='bold 54px Georgia,serif';c.fillText('ACROSS TIME',W/2,182);c.restore();
  c.fillStyle='#E05555';c.font='bold 19px '+F_UI;c.fillText('— BREAK THE LOOP —',W/2,214);
  c.fillStyle='rgba(240,205,130,.6)';c.font='13px '+F_UI;
  c.fillText('1944  ▸  1968  ▸  1999  ▸  2088  ⟲',W/2,244);
  // pil MULAI berdenyut + info pojok bawah (penghitung ending kiri, lanjut siklus kanan)
  const bw=322,bh=40,bx=W/2-bw/2,by=452,py=by+bh/2+1;
  c.save();c.shadowColor=`rgba(194,59,59,${.3+.3*pul})`;c.shadowBlur=16+10*pul;
  c.fillStyle='rgba(20,14,12,.74)';rr(c,bx,by,bw,bh,20);c.fill();c.restore();
  c.strokeStyle=`rgba(245,240,232,${.3+.28*pul})`;c.lineWidth=1.6;rr(c,bx,by,bw,bh,20);c.stroke();
  c.textBaseline='middle';c.fillStyle='#F5F0E8';c.font='bold 16px '+F_UI;
  const s0='TEKAN ENTER / SENTUH UNTUK MULAI';c.fillText(s0,W/2,py);
  c.globalAlpha=.4+.5*pul;c.fillStyle='#E05555';c.fillText('▶',W/2-c.measureText(s0).width/2-16,py);c.globalAlpha=1;
  const nE=END_TOTAL.filter(k=>SAVE.endings&&SAVE.endings[k]).length;
  c.textAlign='left';c.font='13px '+F_UI;
  c.fillStyle=nE>=END_TOTAL.length?'rgba(240,205,130,.95)':'rgba(245,240,232,.55)';
  c.fillText('⏳ ENDING '+nE+'/'+END_TOTAL.length+(SAVE.endings&&SAVE.endings.true?'  ★ SEJATI':''),26,py);
  if(SAVE.game){c.textAlign='right';c.fillStyle='rgba(255,217,168,.9)';c.fillText('⟲ LANJUT SIKLUS — tekan L ('+SAVE.game.era+')',W-26,py);}
  c.textAlign='center';c.fillStyle='rgba(245,240,232,.48)';c.font='12.5px '+F_UI;
  c.fillText('← → / A D gerak  •  ENTER dialog  •  tahan CTRL lewati teks  •  ESC jeda',W/2,510);
  c.fillStyle='rgba(245,240,232,.32)';c.font='11.5px '+F_UI;
  c.fillText('2D Narrative Puzzle • Psychological Time-Loop • COMPFEST Indie Game Jam • berdasarkan GDD “FIKS IDE”',W/2,527);
  c.textBaseline='alphabetic';
}
function render(){
  ctx.save();
  if(G.shakeT>0&&!OPTS.reduceMotion){const a=G.shakeA*G.shakeT;ctx.translate((Math.random()-.5)*a,(Math.random()-.5)*a);}
  ctx.fillStyle='#0a0806';ctx.fillRect(-20,-20,W+40,H+40);
  if(G.state==='load'){
    ctx.fillStyle='#0a0806';ctx.fillRect(0,0,W,H);
    const pr=AS.total?AS.done/AS.total:1;
    ctx.textAlign='center';ctx.fillStyle='#F5F0E8';ctx.font='bold 26px Georgia,serif';
    ctx.fillText('HEARTS ACROSS TIME',W/2,H/2-64);
    ctx.fillStyle='#A85550';ctx.font='italic 16px '+F_UI;ctx.fillText('— Break The Loop —',W/2,H/2-38);
    ctx.font='13px '+F_UI;ctx.fillStyle='rgba(245,240,232,.6)';
    ctx.fillText(AS.ready?'':'MEMUAT ASET…',W/2,H/2+14);
    ctx.fillStyle='#241d18';rr(ctx,W/2-160,H/2+38,320,14,7);ctx.fill();
    if(pr>0){ctx.fillStyle='#C25A5A';rr(ctx,W/2-160,H/2+38,Math.max(14,320*pr),14,7);ctx.fill();}
  }
  else if(G.state==='title'){
    if(G.titleReady)drawCover(ctx);else drawTitleIntro(ctx);
  }
  else if(G.state==='prologue'){
    drawPrologueScene(ctx);
    // denyut vignette merah menyala sinkron dengan SFX detak jantung (dimatikan oleh reduceMotion)
    {const hb=T%2.4;if(!OPTS.reduceMotion&&hb<.6){const a=Math.sin(hb/.6*Math.PI)*.22;const vg=ctx.createRadialGradient(W/2,H/2,H*.3,W/2,H/2,H*.78);vg.addColorStop(0,'rgba(0,0,0,0)');vg.addColorStop(1,`rgba(140,20,20,${a})`);ctx.fillStyle=vg;ctx.fillRect(0,0,W,H);}}
    if(D.line)drawNarr(ctx,D.line.text,D.prog,D.popT);
    if(!D.choices&&D.line&&D.prog>=1)hintAdvance(ctx);
    drawFFBtn(ctx);
  }
  else if(G.state==='warintro'){
    drawWarIntro(ctx);
    drawFFBtn(ctx);
  }
  else if(G.state==='bunkerintro'){
    drawBunkerIntro(ctx);
    drawFFBtn(ctx);
  }
  else if(G.state==='labintro'){
    drawLabIntro(ctx);
    drawFFBtn(ctx);
  }
  else if(G.state==='walk'||G.state==='dialog'){
    const camDrift=G.cam+(OPTS.reduceMotion?0:Math.sin(T*.4)*.9); // nafas kamera halus (nonaktif saat reduceMotion)
    drawScene(ctx,camDrift);drawChars(ctx,G.state,camDrift);
    if(G.state==='walk')drawHotspots(ctx);
    {const FE=G.era==='1968'?(S.routeB1==='A'?'1968A':'1968B'):G.era; // okluder depan: lukis menang, siluet prosedural sbg fallback
      if(!bgFgImg(ctx,'bg'+FE+'_fg',camDrift))fgSilhouette(ctx,FE,camDrift);}
    grade(ctx,G.era==='1968'?(S.routeB1==='A'?'1968A':'1968B'):G.era);
    if(G.lore)drawNarr(ctx,G.lore.lines[G.lore.i],G.lore.prog,G.lore.popT); // strip lore titik selidik
    if(G.skyFlash>0&&!OPTS.reduceMotion){const a=G.skyFlash;const g=ctx.createLinearGradient(0,0,0,H*.8);g.addColorStop(0,`rgba(255,190,120,${.34*a})`);g.addColorStop(.55,`rgba(255,150,80,${.16*a})`);g.addColorStop(1,'rgba(255,150,80,0)');ctx.fillStyle=g;ctx.fillRect(0,0,W,H*.8);ctx.fillStyle=`rgba(255,214,150,${.08*a})`;ctx.fillRect(0,0,W,H);}
    // caption babak — kotak caption komik di kiri atas (ala panel komik perang)
    if(G.captionT>0&&G.state==='walk'){
      const a=Math.min(1,G.captionT)*Math.min(1,(3.2-G.captionT)*2);
      ctx.save();ctx.globalAlpha=a;
      ctx.font='bold 21px '+F_UI;
      const tw=ctx.measureText(G.caption).width,cx0=22,cy0=56,cw2=tw+36,chh=38;
      sketchRR(ctx,cx0,cy0,cw2,chh,4,{shadow:false});
      ctx.strokeStyle='#94342E';ctx.lineWidth=2;ctx.lineCap='round'; // aksen goresan tinta merah
      ctx.beginPath();ctx.moveTo(cx0+14,cy0+chh-8);ctx.quadraticCurveTo(cx0+cw2/2,cy0+chh-5.5,cx0+cw2-14,cy0+chh-8);ctx.stroke();
      ctx.fillStyle='#2B211A';ctx.textAlign='left';ctx.textBaseline='middle';
      ctx.fillText(G.caption,cx0+18,cy0+chh/2-2);
      ctx.restore();ctx.textBaseline='alphabetic';
    }
    if(G.state==='dialog'){
      // bubble aktif
      if(D.line){
        if(D.line.who==='narrator')drawNarr(ctx,D.line.text,D.prog,D.popT);
        else{
          const isE=D.line.who==='elena';
          const x=isE?(G.walk.arX-190-G.cam):(G.walk.arX-G.cam);
          const headY=GROUND-124;
          drawBubble(ctx,x,headY,D.line.text,D.line.who,D.prog,false,D.popT);
        }
        if(!D.choices&&D.prog>=1&&G.state==='dialog')hintAdvance(ctx);
      }
      if(D.choices)drawChoices(ctx,D.choices,D.sel,ptr.x,ptr.y,D.choiceT);
      drawFFBtn(ctx);
    }
    // umpan balik pilihan: chip empati/logika berdenyut
    if(G.pulse){const p=G.pulse,a=p.t<.12?p.t/.12:clamp(1-(p.t-.9)/.6,0,1);
      ctx.save();ctx.globalAlpha=a;ctx.font='bold 13.5px '+F_UI;
      const tw=ctx.measureText(p.txt).width+22;
      ctx.fillStyle=p.col;rr(ctx,W/2-tw/2,14,tw,22,10);ctx.fill();
      ctx.fillStyle='#FFF';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(p.txt,W/2,25);
      ctx.textBaseline='alphabetic';ctx.restore();}
    // HUD loop
    if(S.loop>0){ctx.save();ctx.font='bold 13px monospace';const j=S.loop>0&&G.state==='walk'&&G.captionT>0?2:0;
      ctx.fillStyle=`rgba(194,59,59,.9)`;ctx.textAlign='left';
      ctx.fillText('⟲ LOOP '+S.loop,18+j*(Math.random()-.5),26+j*(Math.random()-.5));
      if(G.state==='walk'){ctx.globalAlpha=.62;ctx.font='12px '+F_UI;
        ctx.fillText('lari otomatis — tahan '+(IS_TOUCH?'≫':'SHIFT')+' untuk jalan pelan',18,42);}
      ctx.restore();}
    // kontrol sentuh
    if(IS_TOUCH&&G.state==='walk'){ctx.fillStyle='rgba(245,240,232,.25)';
      [[36,'◀'],[W-36,'▶']].forEach(([x,s])=>{ctx.beginPath();ctx.arc(x,H-70,30,0,TAU);ctx.fill();ctx.fillStyle='rgba(30,23,16,.8)';ctx.font='bold 22px sans-serif';ctx.textAlign='center';ctx.fillText(s,x,H-62);ctx.fillStyle='rgba(245,240,232,.25)';});
      // tombol lari ≫ (hold) — di atas tombol ▶
      const rOn=ptr.down&&Math.hypot(ptr.x-(W-36),ptr.y-(H-162))<30;
      ctx.fillStyle=rOn?'rgba(255,217,168,.5)':'rgba(245,240,232,.25)';ctx.beginPath();ctx.arc(W-36,H-162,28,0,TAU);ctx.fill();
      ctx.fillStyle='rgba(30,23,16,.85)';ctx.font='bold 19px sans-serif';ctx.textAlign='center';ctx.fillText('≫',W-36,H-155);}
  }
  else if(G.state==='vortex'){
    const v=G.vortex,pr=easeIO(clamp(v.t,0,1));
    ctx.fillStyle='#050508';ctx.fillRect(0,0,W,H);
    ctx.save();ctx.translate(W/2,H/2);
    const rot=(v.rewind?-1:1)*pr*TAU*2.2;
    ctx.rotate(rot*.25);
    for(let i=0;i<46;i++){
      const ang=i/46*TAU+rot*(i%3===0?1.6:.7);
      const rad=30+((i*97)%420)*(0.3+pr*1.4)*(.4+((i*31)%100)/80);
      const x=Math.cos(ang)*rad,y=Math.sin(ang)*rad*.55;
      const hue=v.rewind?`rgba(226,80,60,`:`rgba(80,200,255,`;
      ctx.fillStyle=hue+(.25+.55*Math.abs(Math.sin(i+T*3)))+')';
      ctx.fillRect(x,y,2+((i%4)),2+((i%3)));
    }
    ctx.rotate(-rot*.25);
    for(let r=40;r<430;r+=34){ctx.strokeStyle=v.rewind?`rgba(226,80,60,${.34-(r/430)*.28})`:`rgba(90,205,255,${.34-(r/430)*.28})`;ctx.lineWidth=2.2;
      ctx.beginPath();ctx.ellipse(0,0,r,r*.5,rot*.13,0,TAU);ctx.stroke();}
    const gl=.6+.4*Math.sin(T*10);
    const g=ctx.createRadialGradient(0,0,0,0,0,120);g.addColorStop(0,v.rewind?`rgba(255,120,90,${.5*gl})`:`rgba(140,225,255,${.5*gl})`);g.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=g;ctx.beginPath();ctx.arc(0,0,120,0,TAU);ctx.fill();
    ctx.restore();
    drawParts(ctx,1/60); // jejak energi terbang di pusaran
    // angka tahun menghitung (RGB split saat distorsi)
    const y=Math.round(lerp(v.from,ERA_CONF[v.to].from,pr));
    ctx.textAlign='center';ctx.font='bold 64px monospace';
    const yr=String(y),roff=OPTS.reduceMotion?0:3+pr*5; // RGB-split nonaktif saat reduceMotion
    ctx.globalCompositeOperation='screen';
    ctx.fillStyle='rgba(255,60,60,.8)';ctx.fillText(yr,W/2-roff,H/2+16);
    ctx.fillStyle='rgba(60,200,255,.8)';ctx.fillText(yr,W/2+roff,H/2+16);
    ctx.globalCompositeOperation='source-over';
    ctx.fillStyle=v.rewind?`rgba(255,110,80,.95)`:'rgba(180,235,255,.95)';
    ctx.shadowColor=ctx.fillStyle;ctx.shadowBlur=24;ctx.fillText(yr,W/2,H/2+16);ctx.shadowBlur=0;
    ctx.font='15px '+F_UI;ctx.fillStyle='rgba(245,240,232,.6)';
    ctx.fillText(v.rewind?'SINYAL REALITAS TERPUTUS — MENGULANG SIKLUS':'MELOMPAT MENEMBUS ARUS WAKTU',W/2,H-64);
    if(pr>.82&&!OPTS.reduceMotion){ctx.fillStyle=`rgba(255,255,255,${(pr-.82)/.18})`;ctx.fillRect(0,0,W,H);}
  }
  else if(G.state==='glitch'){
    drawScene(ctx);drawChars(ctx,'dialog');
    {const FE=G.era==='1968'?(S.routeB1==='A'?'1968A':'1968B'):G.era;
      if(!bgFgImg(ctx,'bg'+FE+'_fg',G.cam))fgSilhouette(ctx,FE,G.cam);}
    grade(ctx,G.era);
    // efek glitch strip (dimatikan oleh reduceMotion — sisakan teks LOOP & petunjuk)
    const gt=G.glitch.t;
    if(!OPTS.reduceMotion){
      for(let i=0;i<14;i++){
        const sy=Math.random()*H,sh=6+Math.random()*36,off=(Math.random()-.5)*90*(1-gt/2);
        try{ctx.drawImage(cv,0,sy,W,sh,off,sy,W,sh);}catch(e){}
      }
      // ghosting RGB layar penuh
      ctx.globalCompositeOperation='screen';ctx.globalAlpha=.2;
      try{const o2=3*(1-Math.min(gt,1.4)/1.4);ctx.drawImage(cv,o2,0);ctx.drawImage(cv,-o2,0);}catch(e){}
      ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';
      if(Math.random()<.5){ctx.globalCompositeOperation='difference';ctx.fillStyle=`rgba(${Math.random()*255|0},40,60,.5)`;ctx.fillRect(0,Math.random()*H,W,20+Math.random()*80);ctx.globalCompositeOperation='source-over';}
      for(let i=0;i<26;i++){ctx.fillStyle=`rgba(245,240,232,${Math.random()*.5})`;ctx.fillRect(Math.random()*W,Math.random()*H,30+Math.random()*80,1.6);}
    }
    if(gt>.3&&gt<1.2&&Math.floor(gt*14)%2===0){
      ctx.textAlign='center';ctx.font='bold 84px monospace';ctx.fillStyle='#E2503C';
      ctx.shadowColor='#E2503C';ctx.shadowBlur=30;ctx.fillText('⟲ LOOP '+S.loop,W/2,H/2);ctx.shadowBlur=0;
      ctx.font='bold 20px monospace';ctx.fillStyle='#F5F0E8';ctx.fillText('REALITAS TERPECAH — TIMELINE DI-RESET',W/2,H/2+44);
    }
    if(gt>.7){const a=clamp((gt-.7)/.5,0,1);
      ctx.font='italic 15px Georgia,serif';ctx.fillStyle=`rgba(245,240,232,${.8*a})`;
      ctx.fillText(G.glitch.hint,W/2,H/2+86);
      ctx.font='12.5px '+F_UI;ctx.fillStyle=`rgba(226,90,70,${.8*a})`;
      ctx.fillText('⟨ '+G.glitch.kasus+' ⟩',W/2,H/2+110);
      ctx.fillStyle=`rgba(245,240,232,${.5*a})`;
      ctx.fillText(`siklus ini: ♥ empati ${G.glitch.emp} × ⚙ logika ${G.glitch.log}`,W/2,H/2+130);}
  }
  else if(G.state==='endcard'){
    bg1999(ctx,120,T);spawnParts('1999');
    ctx.save();ctx.translate(W*0.5-60,GROUND);groundShadow(ctx); // pose berlutut di kartu akhir (fallback sheet)
    if(!drawPoseImage(ctx,'pose_elena_kneel'))drawElena(ctx,T,0,false,'warm',{vial:true});
    ctx.restore();
    if(!bgFgImg(ctx,'bg1999_fg',120))fgSilhouette(ctx,'1999',120); // okluder depan sama seperti walk/dialog
    grade(ctx,'1999');
    const a=clamp(G.endCard.t/2,0,1);
    ctx.fillStyle=`rgba(10,8,6,${.55*a})`;ctx.fillRect(0,0,W,H);
    drawParts(ctx,1/60); // partikel di atas overlay agar sparkle terlihat
    ctx.textAlign='center';
    ctx.fillStyle=`rgba(245,240,232,${a})`;ctx.font='italic 26px Georgia,serif';ctx.fillText('THE END',W/2,168);
    ctx.fillStyle=`rgba(194,59,59,${a})`;ctx.font='bold 30px Georgia,serif';ctx.fillText('HEARTS ACROSS TIME: BREAK THE LOOP',W/2,208);
    // statistik hidden affinity terungkap
    if(G.endCard.t>1.6){
      const a2=clamp((G.endCard.t-1.6)/1.4,0,1);
      ctx.fillStyle=`rgba(245,240,232,${.85*a2})`;ctx.font='16px '+F_UI;
      ctx.fillText(`Siklus ditempuh : ${S.loop}× loop`,W/2,286);
      ctx.fillStyle=`rgba(168,85,80,${.9*a2})`;ctx.fillText(`♥ Empati : ${S.empathy}`,W/2-120,316);
      ctx.fillStyle=`rgba(85,107,127,${.9*a2})`;ctx.fillText(`⚙ Logika : ${S.logic}`,W/2+120,316);
      ctx.fillStyle=`rgba(245,240,232,${.55*a2})`;ctx.font='italic 14px Georgia,serif';
      ctx.fillText('"...di tahun 2088, kita akan bertemu lagi sebagai dua orang biasa yang saling jatuh cinta."',W/2,364);
    }
    if(G.endCard.t>2.6&&Math.floor(T*2)%2===0){ctx.fillStyle='rgba(245,240,232,.75)';ctx.font='15.5px '+F_UI;ctx.fillText('▶ MAIN LAGI (ENTER / SENTUH)',W/2,452);}
    // bingkai ganda kartu komik penutup
    ctx.strokeStyle='rgba(22,16,10,.6)';ctx.lineWidth=2.6;rr(ctx,10,10,W-20,H-20,6);ctx.stroke();
    ctx.strokeStyle='rgba(22,16,10,.35)';ctx.lineWidth=1;rr(ctx,16,16,W-32,H-32,4);ctx.stroke();
  }
  // backlog dialog di atas UI, di bawah transisi
  if(G.logOpen&&!G.paused)drawLog(ctx);
  // transisi fade-in dari hitam (set G.fadeIn=1 saat berganti adegan besar)
  if(G.fadeIn>0){ctx.fillStyle=`rgba(10,8,6,${clamp(G.fadeIn,0,1)})`;ctx.fillRect(0,0,W,H);}
  // white flash di atas segalanya (dibatasi 30% saat reduceMotion)
  if(G.whiteFlash>0){ctx.fillStyle=`rgba(255,255,255,${clamp(G.whiteFlash,0,OPTS.reduceMotion?.3:1)})`;ctx.fillRect(0,0,W,H);}
  ctx.restore();
  if(G.paused)drawPause(ctx);
  drawMuteBtn(ctx);
  drawPauseBtn(ctx);
}
function drawFFBtn(c){ // tombol lewati (hanya jika node ini pernah dilihat)
  if(!(D.line&&SAVE.seen[D.node]&&!D.choices))return;
  const x=46,y=H-44;c.save();c.globalAlpha=.55;
  c.fillStyle='#0a0806';c.beginPath();c.arc(x,y,22,0,TAU);c.fill();
  c.strokeStyle='#F5F0E8';c.lineWidth=1.6;c.stroke();
  c.fillStyle='#F5F0E8';c.font='13px sans-serif';c.textAlign='center';c.textBaseline='middle';
  c.fillText('⏩',x,y+1);c.restore();c.textBaseline='alphabetic';
  c.globalAlpha=1;
}
function drawPauseBtn(c){
  if(G.paused||!(G.state==='walk'||G.state==='dialog'||G.state==='prologue'||G.state==='warintro'||G.state==='bunkerintro'||G.state==='labintro'))return;
  const x=W-72,y=26;c.save();c.globalAlpha=.65;c.fillStyle='#0a0806';c.beginPath();c.arc(x,y,15,0,TAU);c.fill();
  c.strokeStyle='#F5F0E8';c.lineWidth=1.6;c.beginPath();c.arc(x,y,15,0,TAU);c.stroke();
  c.fillStyle='#F5F0E8';c.font='13px sans-serif';c.textAlign='center';c.textBaseline='middle';
  c.fillText('⏸',x,y+1);c.restore();c.textBaseline='alphabetic'; // logika tap pindah ke update() (ptr.tap tak pernah hidup di render)
}
function drawPause(c){ // panel jeda kertas + tinta
  c.fillStyle='rgba(6,5,4,.74)';c.fillRect(0,0,W,H);
  const items=pauseItems(),bw=460,bh=items.length*44+56,bx=(W-bw)/2,by=(H-bh)/2;
  c.save();
  sketchRR(c,bx,by,bw,bh,8);
  c.textAlign='center';c.fillStyle='#94342E';c.font='bold 19px '+F_UI;c.fillText('— JEDA —',W/2,by+28);
  items.forEach((it,i)=>{const iy=by+40+i*44,on=i===G.pSel;
    if(on){c.fillStyle='rgba(148,52,46,.10)';rr(c,bx+10,iy,bw-20,38,6);c.fill();
      c.strokeStyle='#94342E';c.lineWidth=2.6;c.lineCap='round';c.beginPath();c.moveTo(bx+16,iy+8);c.quadraticCurveTo(bx+14,iy+19,bx+16,iy+30);c.stroke();}
    c.fillStyle=on?'#94342E':'#2B211A';c.font=(on?'bold ':'')+'16px '+F_UI;
    c.fillText((on?'▶ ':'')+it.label,W/2,iy+24);});
  c.restore();
  c.fillStyle='rgba(243,234,218,.5)';c.font='12.5px '+F_UI;c.textAlign='center';
  c.fillText('ESC: lanjut  •  ↑↓: pilih  •  ←→: ubah  •  ENTER: oke',W/2,by+bh+24);
}
function hintAdvance(c){const bob=OPTS.reduceMotion?0:Math.sin(T*2.4)*1.6;c.save();c.translate(0,bob);c.fillStyle=`rgba(245,240,232,${.4+.3*Math.sin(T*5)})`;c.font='13.5px '+F_UI;c.textAlign='center';c.fillText('▼ ENTER / KLIK',W/2,H-10);c.restore();} // napas alfa + bob halus (missed-opportunity motion)
function drawLog(c){ // overlay backlog — TAB/B; riwayat 30 dialog terakhir (halaman buku catatan)
  const boxW=720,pad=22,bx=(W-boxW)/2,by=48,bh=H-96,lineH=18;
  c.save();c.fillStyle='rgba(6,5,4,.82)';c.fillRect(0,0,W,H);
  sketchRR(c,bx,by,boxW,bh,8);
  c.textAlign='left';c.textBaseline='top';
  c.fillStyle='#94342E';c.font='bold 15px '+F_UI;c.fillText('— CATATAN DIALOG —',bx+pad,by+13);
  // rakit baris terbungkus dari riwayat (yang terbaru di bawah)
  const rows=[];
  c.font='15px '+F_UI;
  LOG.forEach(e=>{const nm=e.who==='narrator'?'':(WHO[e.who]?WHO[e.who].name:String(e.who).toUpperCase());
    wrap(c,e.text,boxW-pad*2-94).forEach((ln,k)=>rows.push({nm:k?'':nm,txt:ln,narr:e.who==='narrator'}));});
  const maxRows=Math.floor((bh-58)/lineH);
  G.logScroll=clamp(G.logScroll||0,0,Math.max(0,rows.length-maxRows));
  const end=rows.length-G.logScroll,start=Math.max(0,end-maxRows);
  let y=by+40;
  for(let i=start;i<end&&y<by+bh-30;i++){const r=rows[i];
    if(r.nm){c.fillStyle='#94342E';c.font='bold 11px '+F_UI;c.fillText(r.nm,bx+pad,y+3);c.font='15px '+F_UI;}
    c.fillStyle=r.narr?'rgba(43,33,26,.62)':'#2B211A';c.fillText(r.txt,bx+pad+88,y);y+=lineH;}
  if(!rows.length){c.fillStyle='rgba(43,33,26,.55)';c.fillText('Belum ada dialog terekam.',bx+pad,y);}
  c.fillStyle='rgba(43,33,26,.5)';c.font='12px '+F_UI;c.textAlign='center';
  c.fillText('↑↓: gulir  •  TAB / ESC / KLIK: tutup',bx+boxW/2,by+bh-16);
  c.restore();c.textBaseline='alphabetic';
}
function drawMuteBtn(c){
  const x=W-34,y=26;c.save();c.globalAlpha=.65;c.fillStyle='#0a0806';c.beginPath();c.arc(x,y,15,0,TAU);c.fill();
  c.strokeStyle='#F5F0E8';c.lineWidth=1.6;c.beginPath();c.arc(x,y,15,0,TAU);c.stroke();
  c.fillStyle='#F5F0E8';c.font='13px sans-serif';c.textAlign='center';c.textBaseline='middle';
  c.fillText(AU.muted?'🔇':'🔊',x,y+1);c.restore();c.textBaseline='alphabetic'; // logika tap pindah ke update()
}
function toggleMute(){AU.muted=!AU.muted;if(AU.master)AU.master.gain.value=AU.muted?0:vGain(OPTS.vol);
  if(!AU.muted){setAmbience(G.state==='title'?'title':(ERA_CONF[G.era]?ERA_CONF[G.era].amb:'2088'));}}
