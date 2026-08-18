/* ============================================================
   RUNNER DIALOG
   ============================================================ */
const D={node:null,ops:[],i:0,line:null,prog:0,popT:1,choices:null,sel:0,choiceT:0,duckT:false,elExpr:'neutral',arExpr:'neutral',arKind:'muda',ended:false};
const LOG=[]; // backlog dialog (30 terakhir) — buka dengan TAB/B
function startNode(id){const n=NODES[id];D.ops=(typeof n==='function')?n():n;D.i=0;D.node=id;SAVE.seen[id]=1;D.line=null;D.choices=null;
  D._poseBorn={}; // tiap node: pose fade dihitung ulang
  if(id==='paradox')markEnd('paradox');else if(id==='r3f')markEnd('rebut');else if(id==='true_end')markEnd('true'); // ending via node
  step();}
function step(){
  while(D.i<D.ops.length){
    const op=D.ops[D.i++];
    if(op.t==='say'){D.line=op;D.prog=0;D.popT=0;D.ffT=0;G.speak={who:op.who,t:0};
      SFX.flip(); // rustle kertas saat balon/panel baru muncul
      LOG.push({who:op.who,text:op.text});if(LOG.length>30)LOG.shift();
      if(op.who==='elena')D.elExpr=op.expr||'neutral';
      else if(op.who==='narrator'){}
      else D.arExpr=op.expr||'neutral';
      return;}
    if(op.t==='choice'){D.choices=op.opts;D.sel=0;D.line=null;D.choiceT=0;D.duckT=false;duckMusic(.5,.4);SFX.select();return;}
    if(op.t==='goto'){startNode(op.id);return;}
    if(op.t==='walk'){startWalk(op.era);return;}
    if(op.t==='fx'){if(op.kind==='boom'){SFX.boom();G.shakeT=OPTS.reduceMotion?0:.9;G.shakeA=9;G.whiteFlash=OPTS.reduceMotion?.25:1;}if(op.kind==='chime')SFX.chime();continue;}
    if(op.t==='vortex'){startVortex(op.to,false);return;}
    if(op.t==='ending'){if(op.kind==='loop')startGlitch();else startEndCard();return;}
  }
}
function dialogAdvance(){
  if(D.choices){const o=D.choices[D.sel];SFX.confirm();if(o.fx)o.fx();
    SAVE.chosen[o.label]=1;persistSave(); // penanda "pernah dipilih" lintas loop
    const tg=o.tag||'';
    G.pulse=tg.includes('EMPATI')?{txt:'♥ +EMPATI',col:'#A85550',t:0}:
            tg.includes('LOGIS')?{txt:'⚙ +LOGIKA',col:'#556B7F',t:0}:null;
    D.choices=null;startNode(o.goto);return;}
  if(D.line){if(D.prog<1){D.prog=1;return;}D.line=null;step();return;}
}
function updateDialog(dt,mx,my){
  // backlog: TAB/B buka-tutup; ↑↓ gulir; ESC/klik tutup (kunci semua input dialog lain)
  if(keyOnce('Tab')||keyOnce('b')||keyOnce('B')){G.logOpen=!G.logOpen;G.logScroll=0;SFX.select();return;}
  if(G.logOpen){
    if(keyOnce('ArrowUp')||keyOnce('w'))G.logScroll=(G.logScroll||0)+1;
    if(keyOnce('ArrowDown')||keyOnce('s'))G.logScroll=Math.max(0,(G.logScroll||0)-1);
    if(keyOnce('Escape')||ptr.tap){ptr.tap=false;G.logOpen=false;SFX.select();}
    return;}
  // fast-forward: tahan CTRL/F (atau tombol ⏩ sentuh) — teks yang sudah pernah
  // dilihat dilewati otomatis; teks baru hanya diketik instan
  const ffT=IS_TOUCH&&ptr.down&&Math.hypot(ptr.x-46,ptr.y-(H-44))<28;
  const ff=keys['Control']||keys['f']||keys['F']||ffT;
  if(D.line&&!D.choices){
    if(ff&&SAVE.seen[D.node]){D.prog=1;D.ffT=(D.ffT||0)+dt;
      if(D.ffT>.07){D.ffT=0;D.line=null;step();return;}}
    else if(ff)D.prog=1;
  }
  if(D.line&&D.prog<1){D.prog=Math.min(1,D.prog+dt*46*OPTS.textSpd/Math.max(24,D.line.text.length));if(Math.random()<.3)beep(900+Math.random()*500,.015,'square',.012);} // ketik per-karakter (46 hps × SPD)
  if(D.line)D.popT=Math.min(1,D.popT+dt*5.5);
  if(G.speak)G.speak.t+=dt;
  // ducking musik: turun saat teks mengetik, naik lagi setelah selesai
  if(D.line&&D.prog<1&&!D.duckT){D.duckT=true;duckMusic(.55,.3);}
  if((!D.line||D.prog>=1)&&D.duckT){D.duckT=false;duckMusic(.85,1.2);}
  if(D.choices){D.choiceT=Math.min(1,D.choiceT+dt*4.5);
    if(keyOnce('ArrowUp')||keyOnce('w')){D.sel=(D.sel+D.choices.length-1)%D.choices.length;SFX.select();}
    if(keyOnce('ArrowDown')||keyOnce('s')){D.sel=(D.sel+1)%D.choices.length;SFX.select();}
    if(keyOnce('1')){D.sel=0;dialogAdvance();return;}
    if(keyOnce('2')&&D.choices&&D.choices.length>1){D.sel=1;dialogAdvance();return;}
    if(!D.choices)return;
    // hover
    let hov=-1;const bw=560,bh=D.choices.length*58+22,bx=(W-bw)/2,by=H-bh-24;
    D.choices.forEach((o,i)=>{const oy=by+14+i*58;if(mx>bx+10&&mx<bx+bw-10&&my>oy&&my<oy+52)hov=i;});
    if(hov>=0&&hov!==D.sel){D.sel=hov;SFX.select();}
    if(ptr.tap&&hov>=0){dialogAdvance();ptr.tap=false;}
    if(advHit())dialogAdvance();
  } else if(advHit()||ptr.tap){ptr.tap=false;dialogAdvance();}
}

/* ============================================================
   STATE: VORTEX / GLITCH / WALK / TITLE / ENDING
   ============================================================ */
const ERA_CONF={
  '1944':{amb:'1944',ar:'muda',node:'n_b1',cap:'BABAK 1 — GARIS DEPAN, 1944',from:1944,len:1800,arX:1480}, // parit diperpanjang: pendekatan menegangkan di tengah gerimis
  '1968':{amb:'1968',ar:null,node:'n_b2',cap:'BABAK 2 — 1968',from:1968,len:1500,arX:1180},
  '1999':{amb:'1999',ar:'tua',node:'n_b3',cap:'BABAK 3 — RUANG OBSERVASI KAPSUL, 1999',from:1999,len:1300,arX:1000}}; // lab lebih rapat: kapsul jadi pusat
function startVortex(to,rewind){
  G.vortex={to,t:0,rewind,from:rewind?1999:(G.era==='2088'?2088:ERA_CONF[G.era].from)};
  G.state='vortex';setAmbience(null);rewind?SFX.vortexR():SFX.vortexF();
}
function startWarIntro(){
  G.era='1944';G.state='warintro';G.warIntro={t:0,reveal:0};parts.length=0;
  startNode('war_intro');setAmbience('1944');G.fadeIn=.42;
}
function startBunkerIntro(){
  G.era='1968';G.state='bunkerintro';G.bunkerIntro={t:0,reveal:0};parts.length=0;
  startNode('bunker_intro');setAmbience('1968');G.fadeIn=.42;
}
function startGlitch(){G.state='glitch';
  const CS={A1:'BERKAS KASUS A1 — misi ditinggalkan: penelitian tak pernah selesai',A2:'BERKAS KASUS A2 — obsesi & paradoks mengunci masa depan',B1:'BERKAS KASUS B1 — formula bocor, disalahgunakan jadi senjata',B2:'BERKAS KASUS B2 — kapsul terkunci oleh kebencian'};
  G.glitch={t:0,hint:loopHint(),kasus:CS[S.routeB2]||'BERKAS KASUS — timeline runtuh',emp:S.empathy,log:S.logic};
  markEnd(S.routeB2==='A1'?'A1':S.routeB2==='B1'?'B1':S.routeB2==='B2'?'B2lock':null); // rute A2 tercatat lewat node paradox/r3f
  S.loop++;SFX.glitch();setAmbience(null);stopAmb();
  S.empathy=0;S.logic=0;S.routeB1='';S.routeB2=''; // siklus baru = kepribadian Arthur ditentukan ulang oleh obrolan Babak 1 (sebelumnya bocor antar loop!)
  SAVE.game=null; // autosave siklus yg runtuh tak boleh di-Continue (akan mengembalikan kepribadian lama)
  persistSave();}
// remah roti: setiap kegagalan memberi tahu pemain mengapa loop pecah
function loopHint(){
  if(S.routeB2==='A1')return '⟩ Petunjuk: kabur membuat penelitian tak pernah selesai — jangan tinggalkan misinya.';
  if(S.routeB2==='A2')return '⟩ Petunjuk: memaksa atau membawa Arthur Tua ke 2088 memicu paradoks — ada pilihan yang lebih ikhlas.';
  if(S.routeB2==='B1')return '⟩ Petunjuk: data yang bocor ke publik justru disalahgunakan — formula perlu disimpan lebih aman.';
  if(S.routeB2==='B2')return '⟩ Petunjuk: Arthur hanya terbuka pada kenangan yang hangat — jawablah dengan empati sejak 1944.';
  return '⟩ Petunjuk: setiap pilihanmu di masa lalu membentuk takdir 2088.';
}
function startWalk(era){
  G.era=era;G.state='walk';const cfg=ERA_CONF[era];
  G.walk={era,len:cfg.len,arX:cfg.arX,ar:era==='1968'?(S.routeB1==='A'?'buron':'dewasa'):cfg.ar,node:cfg.node,hot:null,
    cap:era==='1968'?(S.routeB1==='A'?'BABAK 2 — BUNKER BAWAH TANAH, 1968':'BABAK 2 — LABORATORIUM MILITER, 1968'):cfg.cap};
  G.player.x=90;G.player.facingRight=true;G.player.vx=0;G.player.stride=0;G.player.turnT=0;G.player.acc=0;G.caption=G.walk.cap;G.captionT=3.2;parts.length=0;
  setAmbience(cfg.amb);
  SAVE.game={era,S:{empathy:S.empathy,logic:S.logic,routeB1:S.routeB1,routeB2:S.routeB2,loop:S.loop}};persistSave(); // autosave
}
function startEndCard(){G.state='endcard';G.endCard={t:0};SFX.chime();setAmbience('1999');setSong('end');duckMusic(1,1.2);SAVE.game=null;persistSave();}
function resetAll(){S.empathy=0;S.logic=0;S.routeB1='';S.routeB2='';S.loop=0;
  D.elExpr='neutral';D.arExpr='neutral';D.duckT=false;D.choiceT=0;D.popT=1;G.speak=null;G.prologueT=0;G.warIntro=null;G.bunkerIntro=null;parts.length=0;}

/* ---------- update per-state ---------- */
const SPD=[.5,1,2],SPD_N=['LAMBAT','NORMAL','CEPAT'];
const TSZ=[1,1.22],TSZ_N=['NORMAL','BESAR'];
function spdIdx(){const i=SPD.indexOf(OPTS.textSpd);return i<0?1:i;}
function tszIdx(){const i=TSZ.indexOf(OPTS.textScale);return i<0?0:i;}
// jeda: beku kan state + musik/ambience turun otomatis (naik lagi saat lanjut)
function setPaused(on){if(G.paused===on)return;G.paused=on;
  duckMusic(on?.12:.85,on?.3:.8);
  if(AU.ambBus&&AU.ctx){const t=AU.ctx.currentTime;AU.ambBus.gain.cancelScheduledValues(t);AU.ambBus.gain.setValueAtTime(AU.ambBus.gain.value,t);
    AU.ambBus.gain.linearRampToValueAtTime(on?.04:.9*vGain(OPTS.volSfx),t+.4);}}
function pauseItems(){return [
  {label:'▶ LANJUTKAN',act:()=>{setPaused(false);}},
  {label:'VOLUME MASTER  ‹ '+Math.round(OPTS.vol*100)+'% ›',adj:d=>{OPTS.vol=clamp(Math.round((OPTS.vol+d*.1)*10)/10,0,1);applyVol();saveOpts();}},
  {label:'MUSIK  ‹ '+Math.round((OPTS.volMus===undefined?1:OPTS.volMus)*100)+'% ›',adj:d=>{OPTS.volMus=clamp(Math.round(((OPTS.volMus===undefined?1:OPTS.volMus)+d*.1)*10)/10,0,1);applyVol();saveOpts();}},
  {label:'EFEK & AMBIENSI  ‹ '+Math.round((OPTS.volSfx===undefined?1:OPTS.volSfx)*100)+'% ›',adj:d=>{OPTS.volSfx=clamp(Math.round(((OPTS.volSfx===undefined?1:OPTS.volSfx)+d*.1)*10)/10,0,1);applyVol();saveOpts();}},
  {label:'KECEPATAN TEKS  ‹ '+SPD_N[spdIdx()]+' ›',adj:d=>{OPTS.textSpd=SPD[(spdIdx()+d+SPD.length)%SPD.length];saveOpts();}},
  {label:'UKURAN TEKS  ‹ '+TSZ_N[tszIdx()]+' ›',adj:d=>{OPTS.textScale=TSZ[(tszIdx()+d+TSZ.length)%TSZ.length];saveOpts();}},
  {label:'EFEK SINEMATIK  ‹ '+(OPTS.reduceMotion?'MATI':' ON')+' ›',adj:d=>{OPTS.reduceMotion=!OPTS.reduceMotion;saveOpts();}},
  {label:'ULANG DARI 1944',act:()=>{setPaused(false);resetAll();G.fadeIn=1;startVortex('1944',false);}},
  {label:'KEMBALI KE MENU UTAMA',act:()=>{setPaused(false);G.state='title';G.t=0;G.titleT=0;G.titleReady=false;setAmbience('title');}},
];}
function updatePause(){
  const items=pauseItems();
  if(keyOnce('Escape')){setPaused(false);SFX.select();return;}
  if(keyOnce('ArrowUp')||keyOnce('w')||keyOnce('W')){G.pSel=(G.pSel+items.length-1)%items.length;SFX.select();}
  if(keyOnce('ArrowDown')||keyOnce('s')||keyOnce('S')){G.pSel=(G.pSel+1)%items.length;SFX.select();}
  if(keyOnce('ArrowLeft')||keyOnce('-')||keyOnce('a')||keyOnce('A')){if(items[G.pSel].adj){items[G.pSel].adj(-1);SFX.select();}}
  if(keyOnce('ArrowRight')||keyOnce('+')||keyOnce('=')||keyOnce('d')||keyOnce('D')){if(items[G.pSel].adj){items[G.pSel].adj(1);SFX.select();}}
  if(keyOnce('Enter')||keyOnce(' ')){const it=items[G.pSel];SFX.confirm();if(it.act)it.act();}
  if(ptr.tap){const bw=460,bh=items.length*44+56,bx=(W-bw)/2,by=(H-bh)/2;
    items.forEach((it,i)=>{const iy=by+40+i*44;
      if(ptr.x>bx&&ptr.x<bx+bw&&ptr.y>iy&&ptr.y<iy+38){SFX.confirm();
        if(it.adj)it.adj(ptr.x>bx+bw/2?1:-1);else if(it.act)it.act();}});
    ptr.tap=false;}
}
function update(dt){
  T+=dt;G.t+=dt;
  if(G.pulse){G.pulse.t+=dt;if(G.pulse.t>1.5)G.pulse=null;}
  if(G.whiteFlash>0)G.whiteFlash-=dt*2.2;
  if(G.skyFlash>0)G.skyFlash-=dt*1.4;
  if(G.shakeT>0)G.shakeT-=dt;
  if(G.captionT>0)G.captionT-=dt;
  if(G.fadeIn>0)G.fadeIn=Math.max(0,G.fadeIn-dt*1.4); // transisi masuk dari hitam
  const mx=ptr.x,my=ptr.y;
  // hotspot UI pojok (mute/pause) via klik atau sentuhan — dicek DI SINI karena ptr.tap dibersihkan sebelum render()
  if(ptr.tap&&Math.hypot(ptr.x-(W-34),ptr.y-26)<20){toggleMute();ptr.tap=false;}
  else if(ptr.tap&&!G.paused&&(G.state==='walk'||G.state==='dialog'||G.state==='prologue'||G.state==='warintro'||G.state==='bunkerintro')&&Math.hypot(ptr.x-(W-72),ptr.y-26)<20){ptr.tap=false;setPaused(true);G.pSel=0;SFX.select();}
  if(G.paused){updatePause();}
  else if(keyOnce('Escape')&&!G.logOpen&&(G.state==='walk'||G.state==='dialog'||G.state==='prologue'||G.state==='warintro'||G.state==='bunkerintro')){setPaused(true);G.pSel=0;SFX.select();}
  else switch(G.state){
    case 'load':
      if(AS.ready){G.state='title';G.titleT=0;G.titleReady=false;}
      break;
    case 'title':
      setAmbOnce('title');
      G.titleT+=dt;G.titleReady=OPTS.reduceMotion||G.titleT>=8.4;
      if(!G.titleReady&&(advHit()||ptr.tap)){ptr.tap=false;G.titleT=8.4;G.titleReady=true;SFX.select();break;}
      if(G.titleReady&&SAVE.game&&(keyOnce('l')||keyOnce('L'))){SFX.confirm();Object.assign(S,SAVE.game.S);G.fadeIn=1;startWalk(SAVE.game.era);break;}
      if(G.titleReady&&(advHit()||ptr.tap)){ptr.tap=false;SFX.confirm();resetAll();G.state='prologue';G.fadeIn=1;startNode('prologue');setAmbience('2088');SFX.heart();}
      break;
    case 'prologue':
      G.prologueT+=dt;
      if((T%2.4)<dt)SFX.heart();
      updateDialog(dt,mx,my);break;
    case 'warintro':{
      const wi=G.warIntro;wi.t+=dt;
      if(wi.t<3.25){if(advHit()||ptr.tap){ptr.tap=false;wi.t=3.25;SFX.select();}}
      else{wi.reveal=Math.min(1,wi.reveal+dt*2.5);updateDialog(dt,mx,my);}
      break;}
    case 'bunkerintro':{
      const bi=G.bunkerIntro;bi.t+=dt;
      if(bi.t<4.6){if(advHit()||ptr.tap){ptr.tap=false;bi.t=4.6;SFX.select();}}
      else{bi.reveal=Math.min(1,bi.reveal+dt*2.2);updateDialog(dt,mx,my);}
      break;}
    case 'walk':{
      setAmbOnce(ERA_CONF[G.era].amb);
      if(G.lore){ // sedang membaca titik selidik: langkah berhenti halus; ENTER/↓/ketuk memajukan baris
        G.player.vx-=clamp(G.player.vx,-1400*dt,1400*dt);G.player.moving=false;
        G.lore.prog=Math.min(1,G.lore.prog+dt*2.4);G.lore.popT=Math.min(1,G.lore.popT+dt*5);
        if(advHit()||ptr.tap||keyOnce('ArrowDown')||keyOnce('s')||keyOnce('S')){ptr.tap=false;
          if(G.lore.prog<1)G.lore.prog=1;
          else{G.lore.i++;SFX.select();if(G.lore.i>=G.lore.lines.length)G.lore=null;else{G.lore.prog=0;G.lore.popT=0;}}}
        break;}
      const p=G.player;let dir=0;
      if(keys['ArrowRight']||keys['d']||keys['D'])dir+=1;
      if(keys['ArrowLeft']||keys['a']||keys['A'])dir-=1;
      // tombol sentuh: ◀ ▶ gerak (zona bawah), tombol ≫ = lari
      const touchRun=IS_TOUCH&&ptr.down&&Math.hypot(ptr.x-(W-36),ptr.y-(H-162))<30;
      if(IS_TOUCH&&ptr.down){if(ptr.x>W-140&&ptr.y>H-130)dir=1;else if(ptr.x<140&&ptr.y>H-130)dir=-1;}
      // model fisika: akselerasi menuju kecepatan target, gesekan saat lepas
      // loop > 0: lari jadi bawaan (Shift / tombol ≫ berbalik jadi jalan pelan)
      const sprint=keys['Shift']||touchRun,top=(S.loop>0?!sprint:sprint)?262:150,accel=900,fric=1400;
      const prevVx=p.vx;
      if(dir!==0){
        if(dir>0!==p.facingRight){p.facingRight=dir>0;p.turnT=.14;} // squash saat berbalik
        p.vx+=clamp(dir*top-p.vx,-accel*dt,accel*dt);
        if(Math.abs(prevVx)<10)parts.push({x:p.x-G.cam,y:GROUND-3,vx:-dir*24,vy:-14,grav:80,l:0,ml:.4,r:2.4,col:'rgba(170,150,120,.5)',shrink:1}); // debu awal langkah
      }else p.vx-=clamp(p.vx,-fric*dt,fric*dt);
      p.x=clamp(p.x+p.vx*dt,64,G.walk.len-40);
      if((p.x===64&&p.vx<0)||(p.x===G.walk.len-40&&p.vx>0))p.vx=0; // mentok dinding: nolkan dorongan
      p.acc=lerp(p.acc,(p.vx-prevVx)/Math.max(dt,1e-4),1-Math.pow(.01,dt)); // pitch badan saat akselerasi
      if(dir===0&&Math.abs(prevVx)>140&&Math.abs(p.vx)<10)for(let k=0;k<3;k++)parts.push({x:p.x-G.cam+(Math.random()-.5)*10,y:GROUND-3,vx:(p.facingRight?1:-1)*(14+Math.random()*22)+(Math.random()-.5)*10,vy:-8-Math.random()*16,grav:80,l:0,ml:.45+Math.random()*.2,r:2+Math.random()*2,col:'rgba(170,150,120,.5)',shrink:1}); // debu berhenti keras
      if(p.turnT>0)p.turnT-=dt;
      const old=p.phase;
      p.phase+=Math.abs(p.vx)*dt*.105; // irama dikunci longgar ke tanah: 1 siklus (2 langkah) ≈ 60px layar — anti-selip tanpa cadence panik (0 saat mentok dinding → tak moonwalk)
      p.moving=Math.abs(p.vx)>8;
      p.stride=clamp(Math.abs(p.vx)/262,0,1);
      if(p.moving&&Math.floor(old/Math.PI)!==Math.floor(p.phase/Math.PI)){SFX.step();
        for(let k=0;k<2;k++)parts.push({x:p.x-G.cam+(Math.random()-.5)*8,y:GROUND-3,vx:-(Math.sign(p.vx)||1)*(20+Math.random()*24),vy:-10-Math.random()*20,grav:80,l:0,ml:.45+Math.random()*.25,r:2+Math.random()*2,col:'rgba(170,150,120,.5)',shrink:1});}
      G.camTarget=clamp(p.x-300+clamp(p.vx*.22,-75,75),0,G.walk.len-W);G.cam=lerp(G.cam,G.camTarget,1-Math.pow(.001,dt)); // look-ahead 22% kecepatan (camera-systems) di atas exp-smoothing yg sudah ada
      spawnParts(G.era); // partikel mengikuti era aktif (1999: motes biru, bukan abu 1944)
      if(G.era==='1944'){AU.boomTimer-=dt;if(AU.boomTimer<=0){AU.boomTimer=6+Math.random()*7;G.skyFlash=1;noise(1.4,70,.14);}}
      // titik selidik: deteksi kedekatan + picu (↓ / S / ketuk penanda)
      const FEh=G.era==='1968'?'1968'+S.routeB1:G.era;
      const hs=(HOTSPOTS[FEh]||[]).find(h=>!SAVE.inspected[h.id]&&Math.abs(p.x-h.x)<52);
      G.walk.hot=hs||null;
      if(hs&&(keyOnce('ArrowDown')||keyOnce('s')||keyOnce('S')||(ptr.tap&&Math.hypot(ptr.x-(hs.x-G.cam),ptr.y-(GROUND-14))<40))){ptr.tap=false;
        SAVE.inspected[hs.id]=1;persistSave();SFX.select();G.lore={lines:LORE[hs.id],i:0,prog:0,popT:0};G.walk.hot=null;break;}
      if(p.x>G.walk.arX-175){G.state='dialog';G.camTarget=clamp(G.walk.arX-640,0,G.walk.len-W);
        D.arKind=G.walk.ar;D.arExpr='neutral';D.elExpr='neutral';startNode(G.walk.node);}
      break;}
    case 'dialog':
      if(G.cam!==G.camTarget)G.cam=lerp(G.cam,G.camTarget,1-Math.pow(.002,dt));
      spawnParts(G.era==='1968'?'1968':G.era);
      if(G.era==='1944'){AU.boomTimer-=dt;if(AU.boomTimer<=0){AU.boomTimer=6+Math.random()*7;G.skyFlash=1;noise(1.4,70,.12);}}
      updateDialog(dt,mx,my);break;
    case 'vortex':{
      G.vortex.t+=dt/2.4;
      for(let i=0;i<2;i++)parts.push({x:W/2,y:H/2,vx:(Math.random()-.5)*520,vy:(Math.random()-.5)*400,l:0,ml:.5,r:1.4+Math.random()*1.6,col:G.vortex.rewind?'rgba(255,120,90,.8)':'rgba(150,225,255,.8)',shrink:1});
      if(G.vortex.t>=1){const to=G.vortex.to;G.vortex=null;G.whiteFlash=1;
        if(to==='1944')startWarIntro();else if(to==='1968')startBunkerIntro();else startWalk('1999');}
      break;}
    case 'glitch':
      G.glitch.t+=dt;
      if(G.glitch.t>1.7){G.glitch=null;startVortex('1944',true);}
      break;
    case 'endcard':
      G.endCard.t+=dt;
      // sparkle hati merah muda & emas merayakan true ending
      if(Math.random()<.12)parts.push({x:Math.random()*W,y:H+10,vx:(Math.random()-.5)*16,vy:-22-Math.random()*26,l:0,ml:3.5+Math.random()*2,r:1+Math.random()*1.4,col:Math.random()<.6?'rgba(228,140,150,.85)':'rgba(240,205,130,.85)',pulse:1,heart:Math.random()<.45});
      if((G.endCard.t>2)&&(advHit()||ptr.tap)){ptr.tap=false;SFX.confirm();G.state='title';G.t=0;G.titleT=0;G.titleReady=false;setAmbience('title');}
      break;
  }
  ptr.tap=false;
  for(const k in pressed)pressed[k]=false;
}
let ambSet='';
function setAmbOnce(k){if(ambSet!==k){ambSet=k;setAmbience(k);}}
