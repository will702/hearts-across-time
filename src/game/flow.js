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
      // G1 kamera emosional: dorong mendekat ke pembicara saat ekspresi kuat / pose momen kunci
      if(G.state==='dialog'){
        if(!OPTS.reduceMotion&&op.who!=='narrator'&&((op.expr&&op.expr!=='neutral')||POSES[D.node])){
          G.zt=1.12;G.zwx=op.who==='elena'?(G.walk?G.walk.arX-190:W*.42):(G.walk?G.walk.arX:W*.62);}
        else if(op.who!=='narrator')G.zt=1;} // baris netral: kembali lega; narator: tahan framing
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
    tutorialDone('dialog');
    SAVE.chosen[o.label]=1;persistSave(); // penanda "pernah dipilih" lintas loop
    G.pulse=null; // nilai kepribadian tetap tersembunyi agar pemain memilih dari isi dialog
    G.zt=1;D.choices=null;startNode(o.goto);return;}
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
const ECHO={cur:{},prev:{}}; // P2 gema loop: rekam jejak jalan per era; prev = siklus sebelumnya (sesi berjalan saja)
function echoKey(){return G.era==='1968'?'1968'+S.routeB1:G.era;}
const ERA_CONF={
  '1944':{amb:'1944',ar:'muda',node:'n_b1',cap:'BABAK 1 — GARIS DEPAN, 1944',from:1944,len:1800,arX:1480}, // parit diperpanjang: pendekatan menegangkan di tengah gerimis
  '1968':{amb:'1968',ar:null,node:'n_b2',cap:'BABAK 2 — 1968',from:1968,len:1500,arX:1180},
  '1999':{amb:'1999',ar:'tua',node:'n_b3',cap:'BABAK 3 — RUANG OBSERVASI KAPSUL, 1999',from:1999,len:1300,arX:1000}}; // lab lebih rapat: kapsul jadi pusat
function startVortex(to,rewind){
  G.vortex={to,t:0,rewind,from:rewind?1999:(G.era==='2088'?2088:ERA_CONF[G.era].from)};
  G.state='vortex';G.zoom=G.zt=1;setAmbience(null);rewind?SFX.vortexR():SFX.vortexF();
}
function startWarIntro(){
  G.era='1944';G.state='warintro';G.warIntro={t:0,reveal:0};parts.length=0;
  startNode('war_intro');setAmbience('1944');G.fadeIn=.42;
}
function startBunkerIntro(){
  G.era='1968';G.state='bunkerintro';G.bunkerIntro={t:0,reveal:0};parts.length=0;
  startNode('bunker_intro');setAmbience('1968');G.fadeIn=.42;
}
function startLabIntro(){
  G.era='1968';G.state='labintro';G.labIntro={t:0,reveal:0};parts.length=0;
  startNode('lab_intro');setAmbience('1968');G.fadeIn=.42;
}
function startGlitch(){G.state='glitch';G.zoom=G.zt=1;
  ECHO.prev=ECHO.cur;ECHO.cur={}; // P2: arsipkan jejak siklus yang runtuh sebagai hantu loop berikutnya
  const CS={A1:'BERKAS KASUS A1 — misi ditinggalkan: penelitian tak pernah selesai',A2:'BERKAS KASUS A2 — obsesi & paradoks mengunci masa depan',B1:'BERKAS KASUS B1 — formula bocor, disalahgunakan jadi senjata',B2:'BERKAS KASUS B2 — kapsul terkunci oleh kebencian'};
  G.glitch={t:0,hint:loopHint(),kasus:CS[S.routeB2]||'BERKAS KASUS — timeline runtuh'};
  markEnd(S.routeB2==='A1'?'A1':S.routeB2==='B1'?'B1':S.routeB2==='B2'?'B2lock':null); // rute A2 tercatat lewat node paradox/r3f
  S.loop++;SFX.glitch();setAmbience(null);stopAmb();
  S.empathy=0;S.logic=0;S.routeB1='';S.routeB2='';S.challenges=freshChallenges(); // seluruh afinitas, termasuk gameplay, direset per siklus
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
const CHALLENGE_CONF={
  // P1: mekanik berbeda per era — dodge sorot 1944 • tune sinyal 1968 • balance krio 1999
  '1944':{mode:'dodge',x:760,title:'PENYEBERANGAN LAMPU SOROT',left:'Alihkan sorot dari medis terluka',right:'Putus daya dan menyeberang langsung',targets:[.24,.68,.43]},
  '1968':{mode:'tune',x:500,title:'PENYETELAN SINYAL',left:'Ikuti frekuensi panggilan Arthur',right:'Isolasi pembawa data formula',targets:[.3,.72,.48]},
  '1999':{mode:'balance',x:690,title:'STABILISASI KRIO',left:'Dahulukan tanda vital Arthur',right:'Dahulukan kemurnian serum',targets:[.66,.34,.58]}};
function saveCycle(){SAVE.game={era:G.era,S:{empathy:S.empathy,logic:S.logic,routeB1:S.routeB1,routeB2:S.routeB2,loop:S.loop,challenges:Object.assign({},S.challenges)}};persistSave();}
function startChallenge(){const cfg=CHALLENGE_CONF[G.era];if(!cfg||S.challenges[G.era])return;
  G.state='challenge';G.zoom=G.zt=1;G.challenge={era:G.era,stage:'choose',sel:0,band:0,cursor:.5,t:0,misses:0,assist:false,feedback:'',feedbackT:0,successT:0};
  if(cfg.mode==='dodge')Object.assign(G.challenge,{px:200,det:0,bx:484,bw:112});
  if(cfg.mode==='balance')Object.assign(G.challenge,{vit:.55,ser:.55,stable:0,ok:true});
  G.player.vx=0;tutorialDone('interact');SFX.select();}
function finishChallenge(ch){if(S.challenges[ch.era])return;const approach=ch.sel===0?'empathy':'logic';S.challenges[ch.era]=approach;S[approach]++;ch.stage='success';ch.successT=0;
  for(let i=0;i<18;i++)parts.push({x:W/2+(Math.random()-.5)*180,y:H/2+50,vx:(Math.random()-.5)*120,vy:-35-Math.random()*80,grav:55,l:0,ml:1.2+Math.random(),r:2+Math.random()*2,col:approach==='empathy'?'rgba(240,160,170,.9)':'rgba(120,220,255,.9)',shrink:1});
  SFX.chime();saveCycle();tutorialDone('challenge');}
function missChallenge(ch){ch.misses++;ch.feedbackT=.9;
  ch.feedback=ch.era==='1944'?'TERDETEKSI — KEMBALI KE PENDEKIR AWAL':ch.era==='1999'?'KRIO TIDAK STABIL — ULANGI DARI TENGAH':'SINYAL LEPAS — COBA LAGI';
  if(ch.misses>=3)ch.assist=true;
  if(ch.era==='1944'){ch.px=200;ch.det=0;}
  if(ch.era==='1999'){ch.vit=.55;ch.ser=.55;ch.ok=true;}
  G.whiteFlash=OPTS.reduceMotion?.18:.55;G.shakeT=OPTS.reduceMotion?0:.22;G.shakeA=5;SFX.flash();}
function updateChallenge(dt){const ch=G.challenge,cfg=CHALLENGE_CONF[ch.era];ch.t+=dt;if(ch.feedbackT>0)ch.feedbackT-=dt;
  if(ch.stage==='success'){ch.successT+=dt;if(ch.successT>1.05){G.state='walk';G.player.x=cfg.x+65;G.challenge=null;G.fadeIn=.28;}return;}
  if(ch.stage==='choose'){
    if(keyOnce('ArrowLeft')||keyOnce('a')||keyOnce('A')){ch.sel=0;SFX.select();}
    if(keyOnce('ArrowRight')||keyOnce('d')||keyOnce('D')){ch.sel=1;SFX.select();}
    if(ptr.tap&&ptr.y>285&&ptr.y<390){ch.sel=ptr.x<W/2?0:1;ptr.tap=false;ch.stage='play';ch.t=0;SFX.confirm();return;}
    if(advHit()){ch.stage='play';ch.t=0;SFX.confirm();}return;}
  // hold zona bawah layar (sentuh) untuk dodge/balance — sama dengan zona jalan
  const touchDir=(IS_TOUCH&&ptr.down&&ptr.y>H-120)?(ptr.x<W/2?-1:1):0;
  if(cfg.mode==='dodge'){ // P1: lari antar karung, sorot menyapu — deteksi naik saat tertangkap di ruang terbuka
    const spd=ch.assist?128:178,bx=190+((Math.sin(ch.t*(ch.assist?.6:.92))+1)/2)*580,bw=ch.assist?150:112;
    let dir=0;if(keys['ArrowLeft']||keys['a']||keys['A'])dir--;if(keys['ArrowRight']||keys['d']||keys['D'])dir++;dir+=touchDir;
    ch.bx=bx;ch.bw=bw;
    ch.px=clamp(ch.px+dir*spd*dt,190,764);
    const inCover=[300,480,660].some(cx=>Math.abs(ch.px-cx)<36),inBeam=Math.abs(ch.px-bx)<bw/2;
    ch.cover=inCover;
    if(inBeam&&!inCover)ch.det=Math.min(.42,ch.det+dt*(ch.assist?.8:1.15));else ch.det=Math.max(0,ch.det-dt*1.8);
    if(ch.det>=.42){missChallenge(ch);return;}
    if(ch.px>=760)finishChallenge(ch);
    return;}
  if(cfg.mode==='balance'){ // P1: dua meter saling tarik-menarik — tahan kiri/kanan, keduanya meluruh perlahan
    const k=ch.assist?.04:.075,rate=.52;
    let dir=0;if(keys['ArrowLeft']||keys['a']||keys['A'])dir--;if(keys['ArrowRight']||keys['d']||keys['D'])dir++;
    if(!dir)dir=touchDir;
    if(dir<0){ch.vit+=dt*rate;ch.ser-=dt*rate*.35;}
    else if(dir>0){ch.ser+=dt*rate;ch.vit-=dt*rate*.35;}
    ch.vit=clamp(ch.vit-dt*k,0,1);ch.ser=clamp(ch.ser-dt*k,0,1);
    if(ch.vit<=0||ch.ser<=0){missChallenge(ch);return;}
    ch.ok=ch.vit>.22&&ch.ser>.22;
    if(ch.ok)ch.stable+=dt;
    if(ch.stable>=5)finishChallenge(ch);
    return;}
  // tune (1968) — logika setelan manual asli, utuh
  const win=ch.assist?.13:.075,target=cfg.targets[ch.band];
  let d=0;if(keys['ArrowLeft']||keys['a']||keys['A'])d--;if(keys['ArrowRight']||keys['d']||keys['D'])d++;ch.cursor=clamp(ch.cursor+d*dt*(ch.assist?.45:.72),0,1);
  const touchLock=ptr.tap&&ptr.y>350;if(ptr.tap&&ptr.y<350){ch.cursor=clamp((ptr.x-190)/580,0,1);ptr.tap=false;}
  if(advHit()||touchLock){ptr.tap=false;if(Math.abs(ch.cursor-target)<=win){ch.band++;SFX.confirm();ch.feedback='TERKUNCI '+ch.band+'/3';ch.feedbackT=.65;if(ch.band>=3)finishChallenge(ch);}else missChallenge(ch);}
}
function startWalk(era){
  G.era=era;G.state='walk';G.zoom=G.zt=1;const cfg=ERA_CONF[era];
  G.echoSeg=0;G.echoT=0;G.echoRec=[]; // P2: mulai rekam jejak untuk gema loop berikutnya
  G.walk={era,len:cfg.len,arX:cfg.arX,ar:era==='1968'?(S.routeB1==='A'?'buron':'dewasa'):cfg.ar,node:cfg.node,hot:null,diaryHot:false,diaryRead:era!=='1968',
    cap:era==='1968'?(S.routeB1==='A'?'BABAK 2 — BUNKER BAWAH TANAH, 1968':'BABAK 2 — LABORATORIUM MILITER, 1968'):cfg.cap};
  G.player.x=90;G.player.facingRight=true;G.player.vx=0;G.player.stride=0;G.player.turnT=0;G.player.acc=0;G.diary=null;G.caption=G.walk.cap;G.captionT=3.2;parts.length=0;
  setAmbience(cfg.amb);
  saveCycle(); // autosave, termasuk hasil mini-game per siklus
}
function startEndCard(){G.state='endcard';G.zoom=G.zt=1;G.endCard={t:0};SFX.chime();setAmbience('1999');setSong('end');duckMusic(1,1.2);SAVE.game=null;persistSave();}
function resetAll(){S.empathy=0;S.logic=0;S.routeB1='';S.routeB2='';S.loop=0;S.challenges=freshChallenges();
  D.elExpr='neutral';D.arExpr='neutral';D.duckT=false;D.choiceT=0;D.popT=1;G.speak=null;G.diary=null;G.challenge=null;G.prologueT=0;G.warIntro=null;G.bunkerIntro=null;G.labIntro=null;parts.length=0;}
function beginNewCycle(){resetAll();SAVE.game=null;persistSave();G.state='prologue';G.fadeIn=1;startNode('prologue');setAmbience('2088');SFX.heart();}
function titleMenu(){return[{label:'LANJUTKAN',disabled:!SAVE.game,act:()=>{Object.assign(S,SAVE.game.S||{});normalizeRun();G.fadeIn=1;startWalk(SAVE.game.era||'1944');}},
  {label:'SIKLUS BARU',act:()=>{if(SAVE.game){G.titleConfirm=true;G.confirmSel=0;}else beginNewCycle();}},
  {label:'PUTAR ULANG INTRO',act:()=>{G.titleConfirm=false;playIntroVideo();}}];}
function updateTitle(){const items=titleMenu();
  if(G.titleConfirm){if(keyOnce('ArrowLeft')||keyOnce('a')||keyOnce('A'))G.confirmSel=0;if(keyOnce('ArrowRight')||keyOnce('d')||keyOnce('D'))G.confirmSel=1;
    if(ptr.tap&&ptr.y>330&&ptr.y<390){G.confirmSel=ptr.x<W/2?0:1;ptr.tap=false;if(G.confirmSel===0)beginNewCycle();else G.titleConfirm=false;}
    if(advHit()){if((G.confirmSel||0)===0)beginNewCycle();else G.titleConfirm=false;}return;}
  if(keyOnce('ArrowUp')||keyOnce('w')||keyOnce('W')){do{G.titleSel=(G.titleSel+items.length-1)%items.length;}while(items[G.titleSel].disabled);SFX.select();}
  if(keyOnce('ArrowDown')||keyOnce('s')||keyOnce('S')){do{G.titleSel=(G.titleSel+1)%items.length;}while(items[G.titleSel].disabled);SFX.select();}
  if(ptr.tap&&ptr.x>350&&ptr.x<610&&ptr.y>300&&ptr.y<426){const i=Math.floor((ptr.y-300)/42);ptr.tap=false;if(items[i]&&!items[i].disabled){G.titleSel=i;SFX.confirm();items[i].act();}return;}
  if(advHit()){const it=items[G.titleSel];if(it&&!it.disabled){SFX.confirm();it.act();}}}

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
  {label:'KEMBALI KE MENU UTAMA',act:()=>{setPaused(false);G.state='title';G.t=0;G.titleT=8.4;G.titleReady=true;G.titleSel=SAVE.game?0:1;setAmbience('title');}},
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
  if(G.tutorialFade>0)G.tutorialFade=Math.max(0,G.tutorialFade-dt*1.4);
  if(G.pulse){G.pulse.t+=dt;if(G.pulse.t>1.5)G.pulse=null;}
  if(G.whiteFlash>0)G.whiteFlash-=dt*2.2;
  if(G.skyFlash>0)G.skyFlash-=dt*1.4;
  if(G.shakeT>0)G.shakeT-=dt;
  if(G.captionT>0)G.captionT-=dt;
  if(G.fadeIn>0)G.fadeIn=Math.max(0,G.fadeIn-dt*1.4); // transisi masuk dari hitam
  G.zoom=lerp(G.zoom,G.zt,1-Math.pow(.0015,dt)); // G1: ease eksponensial dorongan kamera emosional
  const mx=ptr.x,my=ptr.y;
  // hotspot UI pojok (mute/pause) via klik atau sentuhan — dicek DI SINI karena ptr.tap dibersihkan sebelum render()
  if(ptr.tap&&Math.hypot(ptr.x-(W-34),ptr.y-26)<20){toggleMute();ptr.tap=false;}
  else if(ptr.tap&&!G.paused&&(G.state==='walk'||G.state==='challenge'||G.state==='dialog'||G.state==='prologue'||G.state==='warintro'||G.state==='bunkerintro'||G.state==='labintro')&&Math.hypot(ptr.x-(W-72),ptr.y-26)<20){ptr.tap=false;setPaused(true);G.pSel=0;SFX.select();}
  if(G.paused){updatePause();}
  else if(keyOnce('Escape')&&!G.logOpen&&(G.state==='walk'||G.state==='challenge'||G.state==='dialog'||G.state==='prologue'||G.state==='warintro'||G.state==='bunkerintro'||G.state==='labintro')){setPaused(true);G.pSel=0;SFX.select();}
  else switch(G.state){
    case 'load':
      if(AS.ready){G.state='title';G.titleReady=!!SAVE.introDone||!!OPTS.reduceMotion;G.titleT=G.titleReady?8.4:0;G.titleSel=SAVE.game?0:1;}
      break;
    case 'title':
      setAmbOnce('title');
      if(!G.titleReady){G.titleT+=dt;if(OPTS.reduceMotion||G.titleT>=8.4){G.titleT=8.4;G.titleReady=true;SAVE.introDone=true;persistSave();}
        else if(advHit()||ptr.tap){ptr.tap=false;G.titleT=8.4;G.titleReady=true;SAVE.introDone=true;persistSave();SFX.select();}break;}
      updateTitle();
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
    case 'labintro':{
      const li=G.labIntro;li.t+=dt;
      if(li.t<4.6){if(advHit()||ptr.tap){ptr.tap=false;li.t=4.6;SFX.select();}}
      else{li.reveal=Math.min(1,li.reveal+dt*2.2);updateDialog(dt,mx,my);}
      break;}
    case 'walk':{
      setAmbOnce(ERA_CONF[G.era].amb);
      if(G.diary){ // buku harian wajib: baca seluruh halaman sebelum gerak dibuka kembali
        G.player.vx-=clamp(G.player.vx,-1400*dt,1400*dt);G.player.moving=false;
        G.diary.prog=Math.min(1,G.diary.prog+dt*2.1);G.diary.popT=Math.min(1,G.diary.popT+dt*5);
        if(advHit()||ptr.tap||keyOnce('ArrowDown')||keyOnce('s')||keyOnce('S')){ptr.tap=false;
          if(G.diary.prog<1)G.diary.prog=1;
          else{G.diary.i++;SFX.select();if(G.diary.i>=G.diary.pages.length){G.walk.diaryRead=true;G.walk.diaryHot=false;G.diary=null;SFX.confirm();}else{G.diary.prog=0;G.diary.popT=0;}}}
        break;}
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
      if(G.era==='1944'&&S.loop===0){if(dir!==0&&!SAVE.tutorial.move)tutorialDone('move');if(sprint&&!SAVE.tutorial.sprint)tutorialDone('sprint');}
      p.x=clamp(p.x+p.vx*dt,64,G.walk.len-40);
      G.echoT+=dt;G.segT=(G.segT||0)+dt;
      if(G.echoT>=.12){G.echoT-=.12;if(G.echoRec.length<600)G.echoRec.push(p.x);} // P2: sampel jejak ±8/detik (maks 72 dtk)
      const cc=CHALLENGE_CONF[G.era];
      if(cc&&!S.challenges[G.era]){if(p.x>cc.x-42){p.x=cc.x-42;if(p.vx>0)p.vx=0;}G.walk.challengeHot=Math.abs(p.x-(cc.x-42))<66;
        if(G.walk.challengeHot&&(keyOnce('ArrowDown')||keyOnce('s')||keyOnce('S')||advHit()||(ptr.tap&&Math.abs(ptr.x-(cc.x-G.cam))<80)||touchActHit())){ptr.tap=false;startChallenge();break;}}
      else G.walk.challengeHot=false;
      if(G.era==='1968'&&!G.walk.diaryRead&&p.x>DIARY_X-34){p.x=DIARY_X-34;if(p.vx>0)p.vx=0;} // gerbang wajib sebelum Arthur
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
      // buku harian Arthur: wajib diperiksa di setiap siklus, tidak memakai SAVE.inspected permanen
      G.walk.diaryHot=G.era==='1968'&&!G.walk.diaryRead&&Math.abs(p.x-DIARY_X)<76;
      if(G.walk.diaryHot&&(keyOnce('ArrowDown')||keyOnce('s')||keyOnce('S')||(ptr.tap&&Math.hypot(ptr.x-(DIARY_X-G.cam),ptr.y-(GROUND-30))<55)||touchActHit())){ptr.tap=false;
        SFX.select();G.diary=arthurDiary();G.diary.i=0;G.diary.prog=0;G.diary.popT=0;break;}
      // titik selidik: deteksi kedekatan + picu (↓ / S / ketuk penanda)
      const FEh=G.era==='1968'?'1968'+S.routeB1:G.era;
      const hs=(HOTSPOTS[FEh]||[]).find(h=>!SAVE.inspected[h.id]&&Math.abs(p.x-h.x)<52);
      G.walk.hot=hs||null;
      if(hs&&(keyOnce('ArrowDown')||keyOnce('s')||keyOnce('S')||(ptr.tap&&Math.hypot(ptr.x-(hs.x-G.cam),ptr.y-(GROUND-14))<40)||touchActHit())){ptr.tap=false;
        SAVE.inspected[hs.id]=1;
        if(loreFoundCount()>=LORE_IDS.length&&!SAVE.loreToastDone){ // P3: kelima jejak lengkap → hadiah naratif sekali seumur save
          SAVE.loreToastDone=1;persistSave();SFX.chime();
          G.lore={lines:['[ Kelima jejak kisah Arthur kini lengkap di ingatanmu — peti obat, suar, foto sobek, pita "АРТУР-1", log kapsul berembun. ]',
            '[ Ada getar halus di udara... seakan lingkaran waktu ini mulai mengenali dirimu sedikit lebih dalam. ]'],i:0,prog:0,popT:0};}
        else{persistSave();SFX.select();G.lore={lines:LORE[hs.id],i:0,prog:0,popT:0};}
        G.walk.hot=null;break;}
      if(p.x>G.walk.arX-175){ECHO.cur[echoKey()]=G.echoRec;G.state='dialog';G.camTarget=clamp(G.walk.arX-640,0,G.walk.len-W);
        D.arKind=G.walk.ar;D.arExpr='neutral';D.elExpr='neutral';startNode(G.walk.node);}
      break;}
    case 'challenge':
      updateChallenge(dt);break;
    case 'dialog':
      if(G.cam!==G.camTarget)G.cam=lerp(G.cam,G.camTarget,1-Math.pow(.002,dt));
      spawnParts(G.era==='1968'?'1968':G.era);
      if(G.era==='1944'){AU.boomTimer-=dt;if(AU.boomTimer<=0){AU.boomTimer=6+Math.random()*7;G.skyFlash=1;noise(1.4,70,.12);}}
      updateDialog(dt,mx,my);break;
    case 'vortex':{
      G.vortex.t+=dt/2.4;
      for(let i=0;i<2;i++)parts.push({x:W/2,y:H/2,vx:(Math.random()-.5)*520,vy:(Math.random()-.5)*400,l:0,ml:.5,r:1.4+Math.random()*1.6,col:G.vortex.rewind?'rgba(255,120,90,.8)':'rgba(150,225,255,.8)',shrink:1});
      if(G.vortex.t>=1){const to=G.vortex.to;G.vortex=null;G.whiteFlash=1;
        if(to==='1944')startWarIntro();
        else if(to==='1968'){
          if(S.routeB1==='B')startLabIntro();else startBunkerIntro();
        }else startWalk('1999');}
      break;}
    case 'glitch':
      G.glitch.t+=dt;
      if(G.glitch.t>1.7){G.glitch=null;startVortex('1944',true);}
      break;
    case 'endcard':
      G.endCard.t+=dt;
      // sparkle hati merah muda & emas merayakan true ending
      if(Math.random()<.12)parts.push({x:Math.random()*W,y:H+10,vx:(Math.random()-.5)*16,vy:-22-Math.random()*26,l:0,ml:3.5+Math.random()*2,r:1+Math.random()*1.4,col:Math.random()<.6?'rgba(228,140,150,.85)':'rgba(240,205,130,.85)',pulse:1,heart:Math.random()<.45});
      if((G.endCard.t>2)&&(advHit()||ptr.tap)){ptr.tap=false;SFX.confirm();G.state='title';G.t=0;G.titleT=8.4;G.titleReady=true;G.titleSel=1;setAmbience('title');}
      break;
  }
  ptr.tap=false;
  for(const k in pressed)pressed[k]=false;
}
let ambSet='';
function setAmbOnce(k){if(ambSet!==k){ambSet=k;setAmbience(k);}}
const touchActHit=()=>IS_TOUCH&&ptr.tap&&Math.abs(ptr.x-TOUCH_ACT.x)<TOUCH_ACT.w/2&&Math.abs(ptr.y-TOUCH_ACT.y)<TOUCH_ACT.h/2; // P6 tombol ▼ PERIKSA
