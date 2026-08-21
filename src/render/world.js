/* ============================================================
   BACKGROUND PARALLAX 3-LAYER (prosedural)
   ============================================================ */
function layerFill(c,col,factor,worldX,fn){const off=-(worldX*factor)%960;c.save();c.translate(off,0);fn(c,-0);fn(c,960);c.restore();}
function hazeBand(c,rgb,y0,y1,a){ // kabut tipis antar-lapisan — kedalaman perspektif udara ala lukisan
  const g=c.createLinearGradient(0,y0,0,y1);g.addColorStop(0,`rgba(${rgb},0)`);g.addColorStop(.5,`rgba(${rgb},${a})`);g.addColorStop(1,`rgba(${rgb},0)`);c.fillStyle=g;c.fillRect(0,y0,W,y1-y0);}
function bg2088(c,camX,t,dim=0){ // kota rusuh 2088 (referensi komik)
  const g=c.createLinearGradient(0,0,0,H);g.addColorStop(0,'#c9bda9');g.addColorStop(.62,'#b1a48f');g.addColorStop(1,'#8b7f6c');c.fillStyle=g;c.fillRect(0,0,W,H);
  const sg=c.createRadialGradient(700,140,10,700,140,150);sg.addColorStop(0,'rgba(226,80,60,.5)');sg.addColorStop(.4,'rgba(226,80,60,.18)');sg.addColorStop(1,'rgba(226,80,60,0)');c.fillStyle=sg;c.beginPath();c.arc(700,140,150,0,TAU);c.fill();
  c.fillStyle='rgba(230,90,64,.55)';c.beginPath();c.arc(700,140,46,0,TAU);c.fill(); // matahari Crimson + kabut raksasa
  if(!bgLayerImg(c,'bg2088_far',.1,camX))layerFill(c,0,.1,camX,(cc)=>{const r=mulberry32(7);for(let i=0;i<9;i++){const x=i*110+r()*40,h=120+r()*130,w=54+r()*36;cc.fillStyle='rgba(107,101,90,.75)';cc.fillRect(x,290-h,w,h+30);cc.fillStyle='rgba(107,101,90,.5)';cc.fillRect(x+w*.28,290-h-14-r()*26,w*.4,20);}});
  hazeBand(c,'214,198,170',150,330,.12); // kabut abu di depan gedung jauh
  if(!bgLayerImg(c,'bg2088_mid',.3,camX))layerFill(c,0,.3,camX,(cc)=>{const r=mulberry32(21);for(let i=0;i<8;i++){const x=i*130+r()*50,h=90+r()*150,w=70+r()*40;cc.fillStyle='rgba(80,71,60,.85)';cc.beginPath();cc.moveTo(x,330);cc.lineTo(x,330-h);cc.lineTo(x+w*.5,330-h-r()*46-16);cc.lineTo(x+w,330-h+10);cc.lineTo(x+w,330);cc.closePath();cc.fill();
    cc.fillStyle='rgba(40,34,28,.5)';for(let k=0;k<4;k++)cc.fillRect(x+8+r()*(w-18),340-h+r()*h*.6,7,9);
    if(i%3===1){cc.fillStyle=`rgba(255,120,40,${.10+.07*Math.sin(t*9+i*3)})`;cc.beginPath();cc.arc(x+w*.5,328,24+r()*10,0,TAU);cc.fill();} // api gentar jauh
  }});
  if(!bgLayerImg(c,'bg2088_near',.85,camX))layerFill(c,0,.85,camX,(cc)=>{ // puing depan
    const r=mulberry32(33);cc.fillStyle='#5c5142';cc.fillRect(0,404,960,136);
    for(let i=0;i<16;i++){const x=r()*960,w2=20+r()*46,h2=8+r()*26;cc.fillStyle=r()>.5?'#6b5f4e':'#4e4437';cc.save();cc.translate(x,404);cc.rotate((r()-.5)*.5);cc.fillRect(-w2/2,-h2,w2,h2);cc.restore();}
    cc.strokeStyle='#3d362d';cc.lineWidth=6;cc.beginPath();cc.moveTo(180,404);cc.lineTo(196,306);cc.stroke(); // tiang miring
    cc.strokeStyle='rgba(61,54,45,.8)';cc.lineWidth=2;cc.beginPath();cc.moveTo(196,312);cc.quadraticCurveTo(260,330,330,318);cc.stroke();});
  if(dim>0){c.fillStyle=`rgba(10,8,6,${dim})`;c.fillRect(0,0,W,H);}
}
function bg1944(c,camX,t){
  // langit mendung senja: kelabu-zaitun ke cakrawala oker — bukan lingkaran keras
  const g=c.createLinearGradient(0,0,0,H);g.addColorStop(0,'#3A322B');g.addColorStop(.5,'#57452F');g.addColorStop(.78,'#7A5B3A');g.addColorStop(1,'#453425');c.fillStyle=g;c.fillRect(0,0,W,H);
  const sg=c.createRadialGradient(720,168,8,720,168,120);sg.addColorStop(0,'rgba(230,155,80,.5)');sg.addColorStop(.35,'rgba(226,140,70,.20)');sg.addColorStop(1,'rgba(226,140,70,0)');c.fillStyle=sg;c.beginPath();c.arc(720,168,120,0,TAU);c.fill(); // matahari tembus asap
  c.fillStyle='rgba(238,175,95,.5)';c.beginPath();c.arc(720,168,33,0,TAU);c.fill();
  // asap tipis melayang — sedikit, besar, lembut (bukan gumpalan keras)
  for(let i=0;i<4;i++){const x=((i*330-camX*.06-t*8)%1300+1300)%1300-180;drawSmoke(c,x,70+i*34,86+((i*41)%34),.085);}
  // lampu sorot penjaga menyapu langit
  for(let k=0;k<2;k++){const ang=Math.sin(t*.35+k*2.6)*.5,bx=k?250:700;
    c.save();c.translate(bx,332);c.rotate(-Math.PI/2+ang);const lg=c.createLinearGradient(0,0,0,-330);lg.addColorStop(0,'rgba(255,240,200,.22)');lg.addColorStop(1,'rgba(255,240,200,0)');c.fillStyle=lg;c.beginPath();c.moveTo(0,0);c.lineTo(-56,-330);c.lineTo(56,-330);c.closePath();c.fill();c.restore();}
  if(!bgLayerImg(c,'bg1944_far',.14,camX))layerFill(c,0,.14,camX,(cc)=>{const r=mulberry32(11);for(let i=0;i<8;i++){const x=i*128+r()*30,h=110+r()*120;cc.fillStyle='rgba(43,33,28,.8)';cc.beginPath();cc.moveTo(x,320);cc.lineTo(x+8,320-h);cc.lineTo(x+40+r()*30,320-h-20-r()*30);cc.lineTo(x+86,320-h+16);cc.lineTo(x+96,320);cc.closePath();cc.fill();}});
  hazeBand(c,'220,190,150',230,360,.12); // debu perang menggantung di atas kaki bukit
  if(!bgLayerImg(c,'bg1944_mid',.45,camX))layerFill(c,0,.45,camX,(cc)=>{ // tembok parit + karung pasir + kawat
    cc.fillStyle='#57493a';cc.fillRect(0,296,960,150);cc.fillStyle='#4c3f31';for(let i=0;i<12;i++)cc.fillRect(i*80+((i%2)*40),296+((i%3)*34),76,5);
    const r=mulberry32(5);for(let i=0;i<30;i++){const x=i*34+(r()*8),y=306+(i%4)*17+(r()*4);cc.fillStyle=i%2?'#6a5a45':'#5f5040';rr(cc,x,y,30,14,6);cc.fill();outline(cc,1.2);rr(cc,x,y,30,14,6);cc.stroke();}
    cc.strokeStyle='#2e2820';cc.lineWidth=2;
    for(let k=0;k<3;k++){const y=280-k*16;cc.beginPath();for(let x=0;x<=960;x+=24)cc.quadraticCurveTo(x+12,y+((x/24+k)%2)*7,x+24,y);cc.stroke();
      for(let x=12;x<960;x+=48){cc.beginPath();cc.moveTo(x-4,y-4);cc.lineTo(x+4,y+4);cc.moveTo(x+4,y-4);cc.lineTo(x-4,y+4);cc.stroke();}}
    cc.fillStyle='#3a2f24';cc.fillRect(140,332,10,74);cc.fillRect(800,340,10,66);});
  // tanah + papan (dibingkai tinta agar duduk dengan lapisan lukis)
  c.fillStyle='#4a3b2c';c.fillRect(0,404,W,136);c.fillStyle='#3e3123';
  for(let i=0;i<14;i++){const x=i*76-((camX)%76);rr(c,x-30,412+(i%2)*52,64,10,4);c.fill();}
  c.strokeStyle='rgba(24,17,11,.55)';c.lineWidth=1.4; // sisi papan
  for(let i=0;i<14;i++){const x=i*76-((camX)%76);rr(c,x-30,412+(i%2)*52,64,10,4);c.stroke();}
  c.fillStyle='rgba(120,60,40,.35)';const r2=mulberry32(9);for(let i=0;i<6;i++){const x=((i*210-camX)%1260+1260)%1260-100;c.beginPath();c.ellipse(x,470+r2()*40,34+r2()*20,7,0,0,TAU);c.fill();
    c.strokeStyle='rgba(58,29,17,.45)';c.stroke();} // bibir genangan
  // serpih puing bertitik (deterministik, ikut gulir dunia)
  const r3=mulberry32(31);c.strokeStyle='rgba(24,17,12,.5)';c.lineWidth=1.2;
  for(let i=0;i<26;i++){const x=((r3()*2000-camX)%2000+2000)%2000-160,y=428+r3()*100,a=r3()*TAU,l=2+r3()*5;
    c.beginPath();c.moveTo(x,y);c.lineTo(x+Math.cos(a)*l,y+Math.sin(a)*l*.4);c.stroke();}
  // kabut tanah melayang
  c.fillStyle='rgba(70,60,45,.20)';for(let i=0;i<3;i++){const fx=((i*380-camX*.7-t*14)%1150+1150)%1150-95;c.beginPath();c.ellipse(fx,468+i*13,130,13,0,0,TAU);c.fill();}
}
function drawSmoke(c,x,y,r,a){
  c.fillStyle=`rgba(46,37,30,${a*.5})`;c.beginPath();c.ellipse(x,y,r*1.35,r*.62,0,0,TAU);c.fill(); // halo luar lembut
  c.fillStyle=`rgba(40,32,26,${a})`;c.beginPath();c.ellipse(x,y,r,r*.5,0,0,TAU);c.ellipse(x+r*.7,y+8,r*.7,r*.36,0,0,TAU);c.fill();}
/* --- siluet latar depan: occluder dekat kamera, parallax >1 (ciri khas komik perang) --- */
function fgSilhouette(c,era,camX){
  const F=1.18,seed0={'1944':71,'2088':72,'1968A':73,'1968B':74,'1999':75}[era]||76;
  const ink='rgba(16,12,8,.94)';
  c.save();
  const off=-((camX*F)%1920);c.translate(off,0);
  for(const ox of [0,1920]){
    c.save();c.translate(ox,0);const r=mulberry32(seed0); // petak identik => tile mulus
    // bibir tanah depan tak rata (puncak 472-484 — di bawah kaki 444)
    c.fillStyle=ink;c.beginPath();c.moveTo(-4,542);
    for(let x=0;x<=1924;x+=56)c.lineTo(x,472+r()*12);
    c.lineTo(1924,542);c.closePath();c.fill();
    c.fillStyle=ink;c.strokeStyle=ink;
    if(era==='1944'){ // gulungan kawat berduri, tunggul patah, rumpai parit
      for(let x=60;x<1920;x+=180+r()*120){
        if(r()<.55){const wx=x+r()*60,wy=486+r()*10;c.lineWidth=1.8;
          for(let k=0;k<3;k++){c.beginPath();c.arc(wx+k*16,wy,9,0,TAU);c.stroke();}
          for(let k=0;k<4;k++){const px2=wx-8+k*12;c.beginPath();c.moveTo(px2,wy-4);c.lineTo(px2+4,wy+4);c.moveTo(px2+4,wy-4);c.lineTo(px2,wy+4);c.stroke();}
        }else{const lean=(r()-.5)*.5,h=60+r()*70;c.save();c.translate(x,502);c.rotate(lean);rr(c,-4,-h,8,h+12,2);c.fill();c.restore();}}
      for(let x=20;x<1920;x+=90+r()*70){const h2=10+r()*22;c.beginPath();c.moveTo(x,490);c.lineTo(x+3,466-h2*.4);c.lineTo(x+6,490);c.fill();}
    }else if(era==='2088'){ // lempeng beton retak + besi tulangan bengkok
      for(let x=40;x<1920;x+=220+r()*140){
        if(r()<.6){c.save();c.translate(x,506);c.rotate((r()-.5)*.42);rr(c,-34-r()*20,-12-r()*16,68+r()*44,16+r()*14,3);c.fill();c.restore();}
        else{c.lineWidth=3;c.beginPath();const h=64+r()*60;c.moveTo(x,510);c.quadraticCurveTo(x+6,510-h*.6,x+18+(r()-.5)*22,506-h);c.stroke();}}
    }else if(era==='1968A'){ // rantai bergelantungan dari atas + peti di bawah
      for(let x=120;x<1920;x+=300+r()*220){const d=44+r()*72;c.lineWidth=2;
        for(let yy=0;yy<d;yy+=9){c.beginPath();c.ellipse(x,yy+4,3.4,4.6,0,0,TAU);c.stroke();}
        c.beginPath();c.arc(x,d+3,3.2,0,TAU);c.fill();}
      for(let x=200;x<1920;x+=420+r()*180){rr(c,x,492,90+r()*60,48,4);c.fill();}
    }else if(era==='1968B'){ // pipa bawah + katup; kabel melengkung dari langit-langit
      for(let x=-40;x<1920;x+=320){rr(c,x,496,240+r()*80,12,6);c.fill();}
      for(let x=140;x<1920;x+=360+r()*160){c.beginPath();c.arc(x,496,10,0,TAU);c.fill();c.fillRect(x-2,476,4,20);}
      c.lineWidth=2.6;for(let x=220;x<1920;x+=430+r()*160){const d=24+r()*30;c.beginPath();c.moveTo(x,0);c.quadraticCurveTo(x+50,d*1.6,x+100,0);c.stroke();}
    }else if(era==='1999'){ // pilar silo vertikal gelap + sisa kabel langit-langit
      for(let x=90;x<1920;x+=700+r()*260){c.fillRect(x,315+r()*40,20,225);}
      c.lineWidth=2.4;for(let x=300;x<1920;x+=520+r()*200){const d=30+r()*46;c.beginPath();c.moveTo(x,0);c.quadraticCurveTo(x+36,d,x+64,r()<.5?6:0);c.stroke();}
    }
    c.restore();
  }
  c.restore();
}
/* --- properti animasi per era (strip 3 frame AI; file absen => tak digambar) --- */
const PROPS={
  '1944':[{id:'prop_flag1944',x:390,y:444,fps:5},{id:'prop_lantern1944',x:650,y:436,fps:3.2},{id:'prop_flare1944',x:1215,y:422,fps:4}],
  '2088':[{id:'prop_barrel2088',x:380,y:444,fps:4.5},{id:'prop_poster2088',x:1240,y:392,fps:3}],
  '1968A':[{id:'prop_bulb1968A',x:1040,y:200,fps:3},{id:'prop_radio1968A',x:500,y:444,fps:2.5}], // radio challenge terpisah dari buku/lore
  '1968B':[{id:'prop_beacon1968B',x:500,y:444,fps:2.2},{id:'prop_steam1968B',x:1080,y:330,fps:4}],
  '1999':[{id:'prop_consoleWave1999',x:690,y:444,fps:3.5},{id:'prop_frost1999',x:470,y:444,fps:2.5}]};
function drawPropFrame(c,id,sx,y,frame){ // satu frame strip di (sx,y) jangkar tengah-bawah
  const cfg=ASSET_MANIFEST[id],im=AS.imgs[id];if(!cfg||!im||!im.width)return false;
  const s=cfg.h/cfg.fh,dw=cfg.fw*s,dh=cfg.fh*s;
  c.drawImage(im,frame*cfg.fw,0,cfg.fw,cfg.fh,sx-dw/2,y-dh,dw,dh);return true;}
function drawProps(c,era,camX){ // frame deterministik dari T; reduceMotion => frame 0
  const list=PROPS[era]||[],mot=OPTS.reduceMotion?0:1;
  for(const p of list){const sx=p.x-camX;if(sx<-130||sx>W+130)continue;
    drawPropFrame(c,p.id,sx,p.y,mot?Math.floor(T*p.fps)%3:0);}}
const DIARY_X=760; // gerbang naratif wajib Babak 2, cukup jauh sebelum Arthur di x=1180
function drawDiaryBook(c,cam){const x=DIARY_X-cam;if(x<-70||x>W+70)return;const hot=G.walk&&G.walk.diaryHot,read=G.walk&&G.walk.diaryRead;
  c.save();c.translate(x,GROUND-9);c.rotate(-.07);c.fillStyle='#4A2525';rr(c,-22,-15,44,24,3);c.fill();c.strokeStyle='#C99A62';c.lineWidth=2;rr(c,-22,-15,44,24,3);c.stroke();
  c.fillStyle='#E7D7B3';c.fillRect(-17,-12,34,17);c.strokeStyle='rgba(75,45,34,.5)';c.lineWidth=1;c.beginPath();c.moveTo(0,-12);c.lineTo(0,5);c.stroke();c.restore();
  if(!read){const pu=OPTS.reduceMotion?1:.5+.5*Math.sin(T*3.1);c.save();c.globalAlpha=.45+.35*pu;const g=c.createRadialGradient(x,GROUND-19,1,x,GROUND-19,28);g.addColorStop(0,'rgba(255,204,125,.9)');g.addColorStop(1,'rgba(255,204,125,0)');c.fillStyle=g;c.beginPath();c.arc(x,GROUND-19,28,0,TAU);c.fill();c.restore();}
  if(hot){c.save();c.fillStyle='#F5F0E8';c.font='bold 13px '+F_UI;c.textAlign='center';c.fillText('▼ PERIKSA BUKU HARIAN',x,GROUND-58-(OPTS.reduceMotion?0:Math.sin(T*2.6)*3));c.restore();}}
function drawHotspots(c){ // penanda titik selidik: titik cahaya hangat berdenyut + petunjuk ▼ saat dekat
  if(!G.walk)return;const FE=G.era==='1968'?'1968'+S.routeB1:G.era;const cam=G.cam,mot=OPTS.reduceMotion?0:1;
  if(G.era==='1968')drawDiaryBook(c,cam);
  for(const h of (HOTSPOTS[FE]||[])){if(SAVE.inspected[h.id])continue;const sx=h.x-cam;if(sx<-40||sx>W+40)continue;
    const pu=mot?(.5+.5*Math.sin(T*3.2+h.x)):1;
    c.save();c.globalAlpha=.55+.35*pu;
    const g=c.createRadialGradient(sx,GROUND-6,1,sx,GROUND-6,16+6*pu);g.addColorStop(0,'rgba(255,214,140,.85)');g.addColorStop(1,'rgba(255,214,140,0)');
    c.fillStyle=g;c.beginPath();c.arc(sx,GROUND-6,16+6*pu,0,TAU);c.fill();
    c.globalAlpha=1;c.fillStyle='#F5E6C0';c.font='bold 15px '+F_UI;c.textAlign='center';
    c.fillText('✦',sx,GROUND-20-mot*Math.sin(T*2.6+h.x)*4);c.restore();}
  const hot=G.walk.hot;if(hot){const sx=hot.x-cam;c.save();c.globalAlpha=.9;c.fillStyle='#F5F0E8';c.font='12px '+F_UI;c.textAlign='center';
    c.fillText('▼ periksa',sx,GROUND-44-mot*Math.sin(T*2.6)*3);c.restore();}
  if(G.walk.challengeHot){const cfg=CHALLENGE_CONF[G.era],sx=cfg.x-cam;c.save();c.fillStyle='#F5E6C0';c.font='bold 14px '+F_UI;c.textAlign='center';c.fillText('▼ AKTIFKAN',sx,GROUND-78-mot*Math.sin(T*2.6)*3);c.strokeStyle='#F1D58B';c.lineWidth=2;c.beginPath();c.arc(sx,GROUND-42,18,0,TAU);c.stroke();c.restore();}}
function bgFgImg(c,id,camX){ // lapisan foreground lukis (parallax 1.18); false => pemanggil pakai fgSilhouette
  const cfg=ASSET_MANIFEST[id],im=AS.imgs[id];if(!cfg||!im||!im.width)return false;
  const dh=cfg.h||150,dw=Math.round(im.width*dh/im.height),off=-((camX*1.18)%dw);
  for(let x=off-dw;x<W;x+=dw)c.drawImage(im,0,0,im.width,im.height,x,H-dh,dw,dh);
  return true;}
function drawPoseImage(c,id){ // gambar pose lukis momen kunci, jangkar tengah-bawah di titik saat ini
  const cfg=ASSET_MANIFEST[id],im=AS.imgs[id];if(!cfg||!im||!im.width)return false;
  const s=cfg.h/im.height,dw=im.width*s,dh=im.height*s;
  c.drawImage(im,-dw/2,-dh,dw,dh);return true;}
function poseFade(id){const m=D._poseBorn||(D._poseBorn={});if(m[id]===undefined)m[id]=T;return clamp((T-m[id])*4,0,1);} // pose lukis fade-in 250ms per-id (bukan pop antar node)
/* --- POSE momen kunci: node dialog -> pose menggantikan sheet --- */
const POSES={c1e:{side:'elena',id:'pose_elena_hold'},c2e:{side:'elena',id:'pose_elena_hold'},
  true_end:{side:'elena',id:'pose_elena_kneel'},
  n_b1:{side:'elena',id:'pose_elena_resolve',expr:'angry'},r1b:{side:'arthur',id:'pose_arthur_muda_vial'}};
/* --- TITIK SELIDIK (lore hotspot) per era — ↓ ketika dekat; sekali seumur save (SAVE.inspected) --- */
const HOTSPOTS={
  '1944':[{x:480,id:'lore_crate'},{x:1235,id:'lore_flare'}],
  '1968A':[{x:560,id:'lore_photo'},{x:940,id:'lore_tape'}],
  '1968B':[{x:560,id:'lore_photo'},{x:940,id:'lore_tape'}],
  '1999':[{x:420,id:'lore_clip'}]};
const LORE={
  lore_crate:['[ Peti obat tergeletak — morfin habis, perban berlumpur, satu ampul tanpa label. ]',
    '[ Goresan pensil di tutupnya: "untuk asisten lab — jangan sampai kau pakai sendiri." ]'],
  lore_flare:['[ Sisa suar Jerman — pemantiknya masih hangat. Parit ini bicara lewat cahaya merah tiap malam. ]',
    '[ Elena menghitung: suar bertahan 40 detik. Cukup untuk satu doa — tidak cukup untuk pulang. ]'],
  lore_tape:['[ Pita mainframe berlabel "АРТУР-1": empat belas ribu jam data kriobiologi. ]',
    '[ Catatan tangan di selotipnya: "impedansi katup kuperbaiki tahun \'72 — demi dia." ]'],
  lore_photo:['[ Foto sobek di bawah mug enamel: dua sosok muda di parit — hanya separuh wajah tersisa. ]',
    '[ Di baliknya, tinta pudar: "Andai waktu bisa kuputar... aku akan memilih kalimat yang lebih hangat." ]'],
  lore_clip:['[ Papan jepit berembun: log pemeriksaan kapsul, 1999. Kolom KONDISI diisi tangan yang sama selama 31 tahun: STABIL. ]',
    '[ Baris terbawah, tinta yang lebih baru: "Dia datang lagi. Hari ini." ]']};
const LORE_IDS=Object.values(HOTSPOTS).flat().map(h=>h.id); // P3: hadiah kelima jejak kisah
const loreFoundCount=()=>LORE_IDS.filter(id=>SAVE.inspected[id]).length;
const TOUCH_ACT={x:W/2,y:H-64,w:138,h:44}; // tombol sentuh ▼ PERIKSA (P6) — dipakai flow (hit-test) & screens (gambar)
function drawEchoGhost(c,cam){ // P2+G5 gema loop: Elena siklus sebelumnya mengulang jejaknya, tembus cahaya
  if(G.state!=='walk'||!G.walk||G.diary||G.lore||OPTS.reduceMotion)return;
  const rec=ECHO.prev&&ECHO.prev[G.era==='1968'?'1968'+S.routeB1:G.era];
  if(!rec||rec.length<8)return;
  const N=rec.length,f=((G.segT||0)/.12)%N,i0=Math.floor(f),a=f-i0;
  const gx=lerp(rec[i0],rec[(i0+1)%N],a)-cam;
  if(gx<-70||gx>W+70)return;
  c.save();c.globalAlpha=.24+.07*Math.sin(T*2.3);
  c.translate(gx,GROUND+Math.sin(T*1.7)*1.2);c.scale(1.05,1.05);
  drawElena(c,T,f*2.4,true,'neutral',{stride:.7});
  c.restore();
}
function bg1968(c,camX,t,routeA){
  if(routeA){ // bunker persembunyian
    const g=c.createLinearGradient(0,0,0,H);g.addColorStop(0,'#241d18');g.addColorStop(1,'#372c22');c.fillStyle=g;c.fillRect(0,0,W,H);
    if(!bgLayerImg(c,'bg1968A_far',.2,camX))layerFill(c,0,.2,camX,(cc)=>{const r=mulberry32(15);cc.fillStyle='#2e251d';for(let i=0;i<10;i++){const x=i*100+wob(r()*30);cc.fillRect(x,60,86,270);cc.strokeStyle='#241d15';cc.lineWidth=2;for(let k=0;k<5;k++){cc.beginPath();cc.moveTo(x,90+k*50);cc.lineTo(x+86,90+k*50);cc.stroke();}}
      function wob(v){return v}cc.fillStyle='#181310';cc.fillRect(300,110,120,80);cc.strokeStyle='#4c5a66';cc.lineWidth=3;for(let k=0;k<4;k++){cc.beginPath();cc.moveTo(300,118+k*20);cc.lineTo(420,122+k*20);cc.stroke();}});
    hazeBand(c,'190,165,130',180,340,.09); // debu bunker menggantung
    if(!bgLayerImg(c,'bg1968A_mid',.5,camX))layerFill(c,0,.5,camX,(cc)=>{ // peti + tong + jendela papan + lampu
      const r=mulberry32(23);
      cc.fillStyle='rgba(111,215,255,.10)';cc.beginPath();cc.moveTo(690,120);cc.lineTo(760,340);cc.lineTo(560,340);cc.closePath();cc.fill();
      cc.strokeStyle='#584433';cc.lineWidth=8;cc.beginPath();cc.moveTo(690,120);cc.lineTo(690,344);cc.stroke();
      for(let i=0;i<3;i++){const x=i*280+90;cc.fillStyle='#5c4832';rr(cc,x,308,86,44,4);cc.fill();outline(cc,2);rr(cc,x,308,86,44,4);cc.stroke();cc.strokeStyle='#3e2f1f';cc.lineWidth=3;cc.beginPath();cc.moveTo(x+8,326);cc.lineTo(x+78,326);cc.stroke();}
      for(let i=0;i<2;i++){const x=i*430+180;cc.fillStyle='#4a4a42';rr(cc,x,300,40,54,9);cc.fill();outline(cc,2);rr(cc,x,300,40,54,9);cc.stroke();cc.fillStyle='#5f5f55';rr(cc,x-4,292,48,12,4);cc.fill();}
      // lampu bohlam ayun
      const sx=480+Math.sin(t*.9)*14;cc.strokeStyle='#241d15';cc.lineWidth=2.4;cc.beginPath();cc.moveTo(480,40);cc.lineTo(sx,96);cc.stroke();
      const flick=(Math.sin(t*23)>-0.85)?1:.35;cc.fillStyle=`rgba(255,214,150,${.9*flick})`;c.save();c.shadowColor='#ffd696';c.shadowBlur=16*flick;cc.beginPath();cc.arc(sx,102,7,0,TAU);cc.fill();cc.restore();
      cc.fillStyle=`rgba(255,200,120,${.07*flick})`;cc.beginPath();cc.moveTo(sx,102);cc.lineTo(sx+120,410);cc.lineTo(sx-120,410);cc.closePath();cc.fill();});
  } else { // laboratorium militer
    const g=c.createLinearGradient(0,0,0,H);g.addColorStop(0,'#333c42');g.addColorStop(1,'#3f474d');c.fillStyle=g;c.fillRect(0,0,W,H);
    if(!bgLayerImg(c,'bg1968B_far',.2,camX))layerFill(c,0,.2,camX,(cc)=>{cc.fillStyle='#39424a';for(let i=0;i<10;i++)cc.fillRect(i*104,40,96,300);cc.strokeStyle='#2c343a';cc.lineWidth=3;
      for(let i=0;i<10;i++)for(let k=0;k<4;k++){cc.strokeRect(i*104+14,70+k*64,68,40);}
      cc.strokeStyle='#596470';cc.lineWidth=7;cc.beginPath();cc.moveTo(0,32);cc.lineTo(1920,32);cc.moveTo(0,46);cc.lineTo(1920,46);cc.stroke();
      for(let i=0;i<12;i++){cc.fillStyle='#7c2b26';rr(cc,i*160+60,18,14,20,4);cc.fill();}
      // strip lampu neon + kerucut cahaya berkedip halus
      for(let i=0;i<6;i++){const lx=i*170+44;cc.fillStyle='#c9d6de';rr(cc,lx,52,92,7,3);cc.fill();cc.fillStyle=`rgba(200,228,242,${.045+.02*Math.sin(t*2.6+i)})`;cc.beginPath();cc.moveTo(lx,59);cc.lineTo(lx+92,59);cc.lineTo(lx+134,330);cc.lineTo(lx-42,330);cc.closePath();cc.fill();}});
    hazeBand(c,'175,200,215',150,340,.10); // hawa dingin laboratorium
    if(!bgLayerImg(c,'bg1968B_mid',.5,camX))layerFill(c,0,.5,camX,(cc)=>{ // mainframe + lampu berkedip
      const r=mulberry32(29);
      for(let i=0;i<12;i++){const x=i*84+6;cc.fillStyle=i%2?'#4a5158':'#454c53';rr(cc,x,208,74,140,5);cc.fill();outline(cc,2);rr(cc,x,208,74,140,5);cc.stroke();
        for(let k=0;k<8;k++){const on=((i*7+k*13+Math.floor(T*2.2))%5)<2;const gy=(k%2)?'rgba(111,231,140,': 'rgba(255,180,84,';cc.fillStyle=gy+(on?'.95)':'.18)');cc.beginPath();cc.arc(x+14+(k%2)*44,224+Math.floor(k/2)*24,4.6,0,TAU);cc.fill();}
        cc.fillStyle='#2c343a';cc.beginPath();cc.arc(x+37,276,13,0,TAU);cc.fill();cc.strokeStyle='#5c646d';cc.lineWidth=2;cc.beginPath();cc.arc(x+37,276,9,0,TAU);cc.stroke();
        cc.beginPath();cc.moveTo(x+37,276);cc.lineTo(x+37+7*Math.cos(T*3+i),276+7*Math.sin(T*3+i));cc.stroke();}
      cc.strokeStyle='#20262b';cc.lineWidth=4;for(let i=0;i<24;i++){cc.beginPath();cc.moveTo(i*40+20,348);cc.quadraticCurveTo(i*40+34,378,i*40+10,404);cc.stroke();}});
  }
  // lantai (sambungan tinta agar senada garis lukis)
  c.fillStyle=routeA?'#3a2f24':'#4c5256';c.fillRect(0,404,W,136);
  if(!routeA){c.fillStyle='#43494d';for(let i=0;i<12;i++){const x=i*84-((camX*.5)%84);c.fillRect(x,404,42,136);}c.fillStyle='rgba(255,255,255,.05)';c.fillRect(0,404,W,4);
    c.strokeStyle='rgba(12,14,16,.5)';c.lineWidth=1.4;for(let i=0;i<12;i++){const x=i*84-((camX*.5)%84);c.beginPath();c.moveTo(x,404);c.lineTo(x,540);c.stroke();}}
  else{c.fillStyle='#332a20';for(let i=0;i<10;i++){const x=i*104-((camX*.5)%104);c.fillRect(x,404,52,136);}
    c.strokeStyle='rgba(14,10,7,.5)';c.lineWidth=1.4;for(let i=0;i<10;i++){const x=i*104-((camX*.5)%104);c.beginPath();c.moveTo(x+52,404);c.lineTo(x+52,540);c.stroke();}}
}
function bg1999(c,camX,t){
  const g=c.createLinearGradient(0,0,0,H);g.addColorStop(0,'#10151c');g.addColorStop(.6,'#182029');g.addColorStop(1,'#0d1117');c.fillStyle=g;c.fillRect(0,0,W,H);
  if(!bgLayerImg(c,'bg1999_far',.12,camX))layerFill(c,0,.12,camX,(cc)=>{const r=mulberry32(41);for(let i=0;i<70;i++){const x=r()*960,y=r()*300,a=.25+r()*.6;cc.fillStyle=`rgba(200,225,255,${a})`;cc.fillRect(x,y,r()>.9?2:1.3,r()>.9?2:1.3);}
    cc.fillStyle='rgba(53,224,255,.06)';cc.beginPath();cc.ellipse(300,130,180,60,-.4,0,TAU);cc.fill();});
  hazeBand(c,'120,170,210',120,340,.08); // kabut dingin ruang observasi
  // berkas cahaya dewa dari langit-langit (god rays) berayun pelan
  c.save();c.globalCompositeOperation='screen';
  for(let i=0;i<3;i++){const bx=220+i*260,sw2=Math.sin(t*.12+i*2)*30;
    const rg=c.createLinearGradient(0,0,sw2,320);rg.addColorStop(0,'rgba(120,210,255,.17)');rg.addColorStop(1,'rgba(120,210,255,0)');c.fillStyle=rg;
    c.beginPath();c.moveTo(bx-26,0);c.lineTo(bx+26,0);c.lineTo(bx+sw2+70,320);c.lineTo(bx+sw2-70,320);c.closePath();c.fill();}
  c.restore();
  if(!bgLayerImg(c,'bg1999_mid',.45,camX))layerFill(c,0,.45,camX,(cc)=>{ // kapsul kriogenik + konsol
    const px=((680-0))%1920;
    [[px],[px+960],[px-960]].forEach(([x])=>{ if(x<-160||x>1040)return;
      c.save();c.translate(x,0);
      cc=c;
      // glow
      const gl=.5+.28*Math.sin(t*1.6);
      cc.fillStyle=`rgba(53,224,255,${.10+gl*.06})`;cc.beginPath();cc.ellipse(0,272,120,168,0,0,TAU);cc.fill();
      // rangka
      cc.fillStyle='#39424c';rr(cc,-46,364,92,26,6);cc.fill();outline(cc,2.4);rr(cc,-46,364,92,26,6);cc.stroke();
      rr(cc,-38,120,76,30,8);cc.fill();outline(cc,2.4);rr(cc,-38,120,76,30,8);cc.stroke();
      // kaca & cairan
      cc.fillStyle='rgba(140,215,240,.20)';rr(cc,-32,146,64,220,26);cc.fill();
      const lv=326+Math.sin(t*.8)*3;cc.fillStyle='rgba(53,182,255,.52)';cc.beginPath();rr(cc,-32,lv,64,364-lv,24);cc.fill();
      cc.strokeStyle='rgba(160,230,255,.75)';cc.lineWidth=2.4;rr(cc,-32,146,64,220,26);cc.stroke();
      cc.strokeStyle='rgba(53,182,255,.7)';cc.beginPath();cc.moveTo(-32,lv);cc.lineTo(32,lv);cc.stroke();
      // bubble
      for(let i=0;i<5;i++){const by=368-((t*26+i*67)%215);cc.fillStyle='rgba(190,235,255,.5)';cc.beginPath();cc.arc(-18+((i*29)%40),by,2+(i%3),0,TAU);cc.fill();}
      // es beku di dasar
      cc.strokeStyle='rgba(200,240,255,.5)';cc.lineWidth=1.6;for(let i=0;i<6;i++){cc.beginPath();cc.moveTo(-30+i*11,356);cc.lineTo(-27+i*11,344-(i%3)*5);cc.stroke();}
      // label panel
      cc.fillStyle='#232a31';rr(cc,44,180,58,66,5);cc.fill();outline(cc,2);rr(cc,44,180,58,66,5);cc.stroke();
      cc.strokeStyle='#35e0ff';cc.lineWidth=1.6;cc.beginPath();for(let i=0;i<=54;i+=3){const y=210+Math.sin(i*.32+t*3)*7;i===0?cc.moveTo(46+i,y):cc.lineTo(46+i,y);}cc.stroke();
      cc.fillStyle=`rgba(53,224,255,${.6+.4*Math.sin(t*4)})`;cc.beginPath();cc.arc(73,238,3.4,0,TAU);cc.fill();
      cc.fillStyle='#8fa3b5';cc.font='bold 9px monospace';cc.fillText('ARTHUR PROJECT',-36,382);
      cc.restore();});
  });
  // lantai grate: biru-kelabu bertinta, bukan neon
  c.fillStyle='#12181F';c.fillRect(0,404,W,136);c.strokeStyle='rgba(130,160,180,.16)';c.lineWidth=1.6;
  for(let i=0;i<16;i++){const x=i*64-((camX)%64);c.strokeRect(x+6,414,52,112);}
  c.strokeStyle='rgba(8,11,15,.6)';c.lineWidth=2; // sambungan pelat
  for(let i=0;i<8;i++){const x=i*128-((camX)%128);c.beginPath();c.moveTo(x,404);c.lineTo(x-14,540);c.stroke();}
  c.fillStyle='rgba(120,180,220,.06)';c.fillRect(0,404,W,3);
  // kilau lantai reflektif dingin
  const fr=c.createLinearGradient(0,404,0,464);fr.addColorStop(0,'rgba(80,180,230,.10)');fr.addColorStop(1,'rgba(80,180,230,0)');c.fillStyle=fr;c.fillRect(0,404,W,60);
}
/* --- partikel per era (fade + gravitasi + shrink) --- */
const parts=[];
function spawnParts(era){
  if(era==='1944'&&Math.random()<.45&&!OPTS.reduceMotion)parts.push({x:Math.random()*(W+80),y:-14,vx:-40,vy:430,l:0,ml:1.2,r:1.2,col:'rgba(195,208,222,.34)',line:1,rain:1}); // gerimis parit
  if(era==='1944'&&Math.random()<.3)parts.push({x:Math.random()*W,y:-10,vx:10+Math.random()*20,vy:26+Math.random()*36,l:0,ml:9,r:Math.random()<.3?2.4:1.4,col:Math.random()<.35?'rgba(255,140,60,.9)':'rgba(190,180,170,.55)',pulse:1});
  if(era==='2088'&&Math.random()<.2)parts.push({x:Math.random()*W,y:-10,vx:8,vy:20+Math.random()*22,ml:28,l:0,r:1.5,col:'rgba(210,200,190,.4)'});
  if(era==='1999'&&Math.random()<.18)parts.push({x:Math.random()*W,y:H, vx:(Math.random()-.5)*8,vy:-14-Math.random()*18,l:0,ml:30,r:1.8,col:'rgba(120,220,255,.55)',pulse:1});
  if(era==='1968'&&Math.random()<.1)parts.push({x:Math.random()*W,y:Math.random()*300,vx:4,vy:2,l:0,ml:12,r:1.2,col:'rgba(230,220,190,.30)'});
  if(era==='1968'&&S.routeB1==='B'&&Math.random()<.03)parts.push({x:Math.random()*W,y:220+Math.random()*120,vx:(Math.random()-.5)*40,vy:30+Math.random()*40,grav:160,l:0,ml:.5,r:1.3,col:'rgba(255,220,120,.9)',pulse:1,shrink:1}); // percikan listrik mainframe
  if(era==='1944'&&Math.random()<.06)parts.push({x:Math.random()*W,y:GROUND-8,vx:(Math.random()-.5)*14,vy:-16-Math.random()*14,grav:-6,l:0,ml:1.6,r:1.4,col:'rgba(255,150,50,.8)',pulse:1}); // bara api naik;
}
function drawParts(c,dt){for(let i=parts.length-1;i>=0;i--){const p=parts[i];p.x+=p.vx*dt;p.y+=p.vy*dt;if(p.grav)p.vy+=p.grav*dt;p.l+=dt;
  if(p.y>H+12||p.y<-12||p.x>W+12||p.x<-12||(p.ml>0&&p.l>p.ml)){ // mati: tetes hujan pecah jadi riak
    if(p.rain&&!OPTS.reduceMotion&&p.y>300)parts.push({x:p.x,y:GROUND+16+Math.random()*34,vx:0,vy:0,l:0,ml:.3,r:1.6,col:'rgba(195,208,222,.4)',ring:1});
    parts.splice(i,1);continue;}
  let a=1;if(p.ml>0)a=clamp(1-p.l/p.ml,0,1);if(p.pulse)a*= .6+.4*Math.sin(p.l*6+p.x*.1);
  c.globalAlpha=a;
  if(p.line){c.strokeStyle=p.col;c.lineWidth=1.3;c.beginPath();c.moveTo(p.x,p.y);c.lineTo(p.x-p.vx*.028,p.y-p.vy*.028);c.stroke();}
  else if(p.ring){c.strokeStyle=p.col;c.lineWidth=1.1;const rr2=2+p.l*26;c.beginPath();c.ellipse(p.x,p.y,rr2,rr2*.32,0,0,TAU);c.stroke();}
  else if(p.heart){c.fillStyle=p.col;c.font=`bold ${Math.round(p.r*7)}px sans-serif`;c.textAlign='center';c.textBaseline='middle';c.fillText('♥',p.x,p.y);c.textBaseline='alphabetic';}
  else{c.fillStyle=p.col;c.beginPath();c.arc(p.x,p.y,p.r*(p.shrink?1-(p.l/(p.ml||1))*.5:1),0,TAU);c.fill();}}c.globalAlpha=1;}
/* --- kit kertas & tinta (gaya komik perang): panel sketsa + tekstur serat --- */
const PAPER_COL='#F3EADA'; // kertas krem umur
const paperCvs=document.createElement('canvas');paperCvs.width=paperCvs.height=256;
(function buildPaper(){const px=paperCvs.getContext('2d'),r=mulberry32(77);
  px.fillStyle='#FFFFFF';px.fillRect(0,0,256,256);
  for(let i=0;i<2200;i++){const v=222+(r()*33|0);px.fillStyle=`rgb(${v},${Math.max(0,v-5-(r()*9|0))},${Math.max(0,v-14-(r()*16|0))})`;px.fillRect(r()*256|0,r()*256|0,1,1);} // butir
  for(let i=0;i<140;i++){px.strokeStyle=`rgba(120,100,70,${.025+r()*.045})`;px.lineWidth=.8;const x=r()*256,y=r()*256,a=r()*TAU,l=3+r()*9;px.beginPath();px.moveTo(x,y);px.lineTo(x+Math.cos(a)*l,y+Math.sin(a)*l);px.stroke();} // serat
  for(let i=0;i<7;i++){const x=r()*256,y=r()*256,rad=10+r()*28,g=px.createRadialGradient(x,y,0,x,y,rad);g.addColorStop(0,`rgba(146,116,74,${.04+r()*.03})`);g.addColorStop(1,'rgba(146,116,74,0)');px.fillStyle=g;px.beginPath();px.arc(x,y,rad,0,TAU);px.fill();}})(); // noda pudar
let paperPat=null;
function getPaper(c){if(!paperPat)paperPat=c.createPattern(paperCvs,'repeat');return paperPat;}
function rrPathPts(x,y,w,h,r,step=13){ // sampel jalur rounded-rect utk goresan tinta tangan
  const pts=[],seg=(x0,y0,x1,y1)=>{const n=Math.max(1,Math.round(Math.hypot(x1-x0,y1-y0)/step));for(let i=0;i<n;i++)pts.push([lerp(x0,x1,i/n),lerp(y0,y1,i/n)]);};
  const arc=(cx,cy,a0,a1)=>{const n=Math.max(2,Math.ceil(Math.abs(a1-a0)*r/step)+1);for(let i=0;i<n;i++){const a=lerp(a0,a1,i/n);pts.push([cx+r*Math.cos(a),cy+r*Math.sin(a)]);}};
  seg(x+r,y,x+w-r,y);arc(x+w-r,y+r,-Math.PI/2,0);seg(x+w,y+r,x+w,y+h-r);arc(x+w-r,y+h-r,0,Math.PI/2);seg(x+w-r,y+h,x+r,y+h);arc(x+r,y+h-r,Math.PI/2,Math.PI);seg(x,y+h-r,x,y+r);arc(x+r,y+r,Math.PI,Math.PI*1.5);
  return pts;}
function sketchRR(c,x,y,w,h,r,opt={}){ // panel kertas + goresan tinta ganda (garis tak sempurna, khas tangan)
  const ink=opt.ink||PAL.line,base=opt.fill||PAPER_COL;
  c.save();
  if(opt.shadow!==false){c.shadowColor='rgba(0,0,0,.32)';c.shadowBlur=11;c.shadowOffsetY=3;}
  c.fillStyle=base;rr(c,x,y,w,h,r);c.fill();c.shadowColor='transparent';
  c.save();rr(c,x,y,w,h,r);c.clip();c.globalCompositeOperation='multiply';c.fillStyle=getPaper(c);c.fillRect(x-2,y-2,w+4,h+4);c.restore();
  const seed=mulberry32((((Math.round(x)*71)^(Math.round(y)*193)^(Math.round(w)*389)^(Math.round(h)*997))>>>0)||5); // jitter deterministik (tak berdesir antar frame)
  const pts=rrPathPts(x,y,w,h,Math.min(r,w/2,h/2));
  for(let k=0;k<2;k++){ // pass 0 garis utama; pass 1 goresan ikutan tipis — rasa digambar tangan
    c.strokeStyle=k?'rgba(30,23,16,.45)':ink;c.lineWidth=k?1:2.1;c.lineJoin='round';c.lineCap='round';
    const dx=k?.9:0,dy=k?-.7:0,j=k?2.8:1.7;
    c.beginPath();pts.forEach(([qx,qy],i)=>{const sx=qx+(seed()-.5)*j+dx,sy=qy+(seed()-.5)*j+dy;i?c.lineTo(sx,sy):c.moveTo(sx,sy);});
    c.closePath();c.stroke();}
  c.restore();
}
function inkTag(c,x,y,w,h,fill,rot=-.028){ // label nama kecil miring ala cap tinta
  c.save();c.translate(x,y);c.rotate(rot);c.fillStyle=fill;rr(c,0,0,w,h,4);c.fill();
  c.strokeStyle=PAL.line;c.lineWidth=1.4;rr(c,0,0,w,h,4);c.stroke();
  c.strokeStyle='rgba(30,23,16,.4)';c.lineWidth=.8;rr(c,.9,.9,w,h,4);c.stroke();c.restore();}

/* --- grading + vignette + grain --- */
const grainCvs=[];for(let g=0;g<3;g++){const gc=document.createElement('canvas');gc.width=160;gc.height=160;const gx=gc.getContext('2d');const id=gx.createImageData(160,160);for(let i=0;i<id.data.length;i+=4){const v=110+Math.random()*80;id.data[i]=id.data[i+1]=id.data[i+2]=v;id.data[i+3]=26;}gx.putImageData(id,0,0);grainCvs.push(gc);}
function grade(c,era){ // "cetakan buku harian perang": tint era + kertas + lift hangat + sudut panel cetak
  const tints={'1944':'rgba(140,70,30,.10)','1968A':'rgba(50,38,26,.22)','1968B':'rgba(28,58,70,.12)','1999':'rgba(26,60,96,.14)','2088':'rgba(96,74,52,.14)'};
  const col=tints[era]||'rgba(0,0,0,.1)';c.save();c.globalCompositeOperation='multiply';c.fillStyle=col;c.fillRect(0,0,W,H);c.restore();
  c.save();c.globalAlpha=.09;c.globalCompositeOperation='multiply';c.fillStyle=getPaper(c);c.fillRect(0,0,W,H);c.restore(); // serat kertas
  c.save();c.globalAlpha=.07;c.globalCompositeOperation='overlay';c.fillStyle='#E9DABC';c.fillRect(0,0,W,H);c.restore(); // angkat hitam ke arah kertas
  const vg=c.createRadialGradient(W/2,H/2,H*.42,W/2,H/2,H*.85);vg.addColorStop(0,'rgba(0,0,0,0)');vg.addColorStop(1,'rgba(0,0,0,.38)');c.fillStyle=vg;c.fillRect(0,0,W,H);
  const cr=215;for(const [cx,cy] of [[0,0],[W,0],[0,H],[W,H]]){ // sudut gelap panel cetak komik
    const g2=c.createRadialGradient(cx,cy,0,cx,cy,cr);g2.addColorStop(0,'rgba(8,5,3,.30)');g2.addColorStop(1,'rgba(8,5,3,0)');c.fillStyle=g2;c.beginPath();c.arc(cx,cy,cr,0,TAU);c.fill();}
  c.save();c.globalAlpha=.05;c.globalCompositeOperation='overlay';const gi=((Math.floor(T*10)%3)+3)%3;const gp=c.createPattern(grainCvs[gi],'repeat');c.fillStyle=gp;c.fillRect(0,0,W,H);c.restore();
}

/* --- G2: lapisan atmosfer layar-penuh per era — di atas grade, di bawah UI ---
   1999 = selaput beku tepi layar (statis, aman utk reduceMotion) •
   1968B = shimmer scanline CRT + band fosfor jalan •
   1944 = tetes hujan merayap di "lensa" kamera */
let frostCvs=null;
function getFrost(){if(frostCvs)return frostCvs;frostCvs=document.createElement('canvas');frostCvs.width=W;frostCvs.height=H;
  const c=frostCvs.getContext('2d'),r=mulberry32(199);
  for(let i=0;i<96;i++){ // kristal ranting dari tepi layar (deterministik)
    const edge=r()*4|0;let x,y,a;
    if(edge===0){x=-4;y=r()*H;a=(r()-.5)*.9;}
    else if(edge===1){x=W+4;y=r()*H;a=Math.PI+(r()-.5)*.9;}
    else if(edge===2){x=r()*W;y=-4;a=Math.PI/2+(r()-.5)*.9;}
    else{x=r()*W;y=H+4;a=-Math.PI/2+(r()-.5)*.9;}
    const len=14+r()*46;c.save();c.translate(x,y);c.rotate(a);c.globalAlpha=.18+r()*.4;
    c.strokeStyle='rgba(208,233,252,.75)';c.lineWidth=.8+r();c.lineCap='round';
    c.beginPath();c.moveTo(0,0);c.lineTo(len,0);
    for(let k=1;k<=3;k++){const bx=len*k/3,bl=(4-k)*(2.5+r()*3);c.moveTo(bx,-bl);c.lineTo(bx,bl);}
    c.stroke();c.restore();}
  const g=c.createRadialGradient(W/2,H/2,H*.44,W/2,H/2,H*.92);
  g.addColorStop(0,'rgba(180,220,250,0)');g.addColorStop(.72,'rgba(190,225,252,.05)');g.addColorStop(1,'rgba(205,235,255,.17)');
  c.fillStyle=g;c.fillRect(0,0,W,H);return frostCvs;}
let scanPat=null;
function getScanPat(c){if(scanPat)return scanPat;const pc=document.createElement('canvas');pc.width=4;pc.height=3;
  const p=pc.getContext('2d');p.fillStyle='rgba(6,12,16,.15)';p.fillRect(0,2,4,1);p.fillStyle='rgba(165,222,242,.05)';p.fillRect(0,0,4,1);
  scanPat=c.createPattern(pc,'repeat');return scanPat;}
const lensDrops=[];for(let i=0;i<4;i++)lensDrops.push({x:70+i*230+((i*97)%80),y:(i*137)%H,v:7+((i*53)%12),r:1.5+((i*29)%10)/6});
function drawLensRain(c){ // tetesan pelan di kaca "lensa" 1944 — tipis agar tak mengganggu baca
  const dt=1/60;
  for(const d of lensDrops){
    d.y+=d.v*dt;d.x+=Math.sin(T*.7+d.y*.01)*.16;
    if(d.y>H+22){d.y=-22;d.x=40+Math.random()*(W-80);}
    c.strokeStyle='rgba(222,233,240,.055)';c.lineWidth=d.r*.9;c.beginPath();c.moveTo(d.x,d.y-d.r*6);c.lineTo(d.x,d.y-d.r);c.stroke();
    c.fillStyle='rgba(222,233,240,.10)';c.beginPath();c.ellipse(d.x,d.y,d.r,d.r*2.2,0,0,TAU);c.fill();}
}
function eraPostFX(c,FE){
  if(FE==='1999'){c.save();c.globalAlpha=OPTS.reduceMotion?.55:.42+.1*Math.sin(T*.8);c.drawImage(getFrost(),0,0);c.restore();return;} // beku: bukan animasi, boleh tetap
  if(OPTS.reduceMotion)return;
  if(FE==='1968B'){ // CRT laboratorium: garis pindai jalan + sesekali band fosfor
    const off=(T*14)%3;c.save();c.translate(0,off);c.fillStyle=getScanPat(c);c.fillRect(-off,0,W,H+3);c.restore();
    if(((T*7|0)%11)===0){c.save();c.globalAlpha=.055;c.fillStyle='#cfe8f4';c.fillRect(0,(T*260)%H,W,26);c.restore();}
  }else if(FE==='1944')drawLensRain(c);
}
