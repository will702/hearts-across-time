"use strict";
/* ============================================================
   HEARTS ACROSS TIME — Break The Loop
   2D Side-Scroller Narrative Puzzle / Psychological Time-Loop
   COMPFEST Indie Game Jam — berdasarkan GDD "FIKS IDE.md"
   Semua aset digambar prosedural (palet dari referensi).
   ============================================================ */

/* ---------- Konstanta & util ---------- */
const W=960, H=540, GROUND=444;
const cv=document.getElementById('game'), ctx=cv.getContext('2d');
const TAU=Math.PI*2;
const clamp=(v,a,b)=>v<a?a:v>b?b:v;
const lerp=(a,b,t)=>a+(b-a)*t;
const easeIO=t=>t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2;
const easeO=t=>1-Math.pow(1-t,3);
const easeOB=t=>1+2.70158*Math.pow(t-1,3)+1.70158*Math.pow(t-1,2); // overshoot spring
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;}}
function rr(c,x,y,w,h,r){r=Math.min(r,w/2,h/2);c.beginPath();c.moveTo(x+r,y);c.arcTo(x+w,y,x+w,y+h,r);c.arcTo(x+w,y+h,x,y+h,r);c.arcTo(x,y+h,x,y,r);c.arcTo(x,y,x+w,y,r);c.closePath();}
function fmt(n){return Math.round(n)}

/* ---------- Skala layar ---------- */
function fit(){const s=Math.min(innerWidth/W,innerHeight/H);cv.style.width=(W*s)+'px';cv.style.height=(H*s)+'px';}
addEventListener('resize',fit);fit();
const IS_TOUCH=('ontouchstart' in window)||navigator.maxTouchPoints>0;

/* ---------- Audio prosedural (WebAudio) ---------- */
const AU={ctx:null,master:null,muted:false,amb:[],boomTimer:0,heartTimer:0};
function ac(){if(!AU.ctx){AU.ctx=new (window.AudioContext||window.webkitAudioContext)();AU.master=AU.ctx.createGain();AU.master.gain.value=vGain(OPTS.vol);
    // graf bus: master -> limiter(kompressor) -> out ; sub-bus: SFX / Ambience / Musik
    const comp=AU.ctx.createDynamicsCompressor();comp.threshold.value=-14;comp.knee.value=18;comp.ratio.value=6;comp.attack.value=.004;comp.release.value=.24;comp.connect(AU.ctx.destination);AU.master.connect(comp);
    AU.sfxBus=AU.ctx.createGain();AU.sfxBus.connect(AU.master);
    AU.ambBus=AU.ctx.createGain();AU.ambBus.gain.value=.9*vGain(OPTS.volSfx);AU.ambBus.connect(AU.master);
    AU.musBus=AU.ctx.createGain();AU.musBus.gain.value=.8;AU.musBus.connect(AU.master);
    // reverb (impulse noise buatan) + feedback-delay hanya untuk musik
    AU.verb=AU.ctx.createConvolver();AU.verb.buffer=impulse(AU.ctx,2.6,2.4);const vout=AU.ctx.createGain();vout.gain.value=.5;AU.verb.connect(vout);vout.connect(AU.musBus);
    AU.dly=AU.ctx.createDelay(1);AU.dly.delayTime.value=.34;const dfb=AU.ctx.createGain();dfb.gain.value=.36;const dlp=AU.ctx.createBiquadFilter();dlp.type='lowpass';dlp.frequency.value=2400;AU.dly.connect(dlp);dlp.connect(dfb);dfb.connect(AU.dly);const dout=AU.ctx.createGain();dout.gain.value=.5;dlp.connect(dout);dout.connect(AU.musBus);
    AU.mIn=AU.ctx.createGain();AU.mIn.connect(AU.musBus);const sd=AU.ctx.createGain();sd.gain.value=.18;AU.mIn.connect(sd);sd.connect(AU.dly);const sv=AU.ctx.createGain();sv.gain.value=.32;AU.mIn.connect(sv);sv.connect(AU.verb);
  }if(AU.ctx.state==='suspended')AU.ctx.resume();return AU.ctx;}
function impulse(c,dur,decay){const n=c.sampleRate*dur,b=c.createBuffer(2,n,c.sampleRate);for(let ch=0;ch<2;ch++){const d=b.getChannelData(ch);for(let i=0;i<n;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/n,decay);}return b;}
function beep(f,d,type='sine',g=.15,slide=0,when=0){if(AU.muted)return;const c=ac(),t=c.currentTime+when,o=c.createOscillator(),v=c.createGain();o.type=type;o.frequency.setValueAtTime(f,t);if(slide)o.frequency.exponentialRampToValueAtTime(Math.max(30,f+slide),t+d);v.gain.setValueAtTime(g,t);v.gain.exponentialRampToValueAtTime(.0001,t+d);o.connect(v);v.connect(AU.sfxBus||AU.master);o.start(t);o.stop(t+d+.02);}
function noiseBuf(c,d){const n=Math.floor(c.sampleRate*d),b=c.createBuffer(1,n,c.sampleRate),ch=b.getChannelData(0);for(let i=0;i<n;i++)ch[i]=Math.random()*2-1;return b;}
function noise(d,fq,g=.1,type='lowpass',when=0){if(AU.muted)return;const c=ac(),t=c.currentTime+when,s=c.createBufferSource();s.buffer=noiseBuf(c,d);const f=c.createBiquadFilter();f.type=type;f.frequency.value=fq;const v=c.createGain();v.gain.setValueAtTime(g,t);v.gain.exponentialRampToValueAtTime(.0001,t+d);s.connect(f);f.connect(v);v.connect(AU.sfxBus||AU.master);s.start(t);s.stop(t+d);}
const SFX={
  select:()=>beep(620,.05,'square',.08),
  confirm:()=>{beep(760,.07,'square',.1);beep(1140,.09,'square',.09,0,.06);},
  step:()=>{ // langkah CC0 per-permukaan (filter per era) — fallback noise prosedural
    const fe=G.era==='1968'?(S.routeB1==='A'?'1968A':'1968B'):G.era; // permukaan mengikuti rute bunker/lab
    const f={'1944':['lowpass',460],'2088':['lowpass',950],'1968A':['bandpass',820],'1968B':['bandpass',1500],'1999':['highpass',1500]}[fe]||['highpass',900];
    if(!playSfxBuf(['step0','step1','step2','step3'],.4,1,f))noise(.05,420,.05+Math.random()*.02);},
  flip:()=>{if(T-((SFX._flipT===undefined)?-9:SFX._flipT)<.22)return;SFX._flipT=T; // throttle: jangan spam saat fast-forward
    if(!playSfxBuf(['flip','flip2'],.5,1))noise(.04,2400,.03,'highpass');}, // rustle kertas panel dialog
  heart:()=>{beep(52,.14,'sine',.5);beep(46,.16,'sine',.42,0,.22);},
  glitch:()=>{for(let i=0;i<5;i++){beep(200+Math.random()*1400,.04,'square',.07,600,i*.09);noise(.06,3000+Math.random()*3000,.08,'bandpass',i*.09);}},
  boom:()=>{noise(1.1,90,.5);beep(38,.9,'sine',.5,-14);noise(.25,500,.15,'lowpass',.02);},
  vortexF:()=>{if(AU.muted)return;beep(140,1.6,'sawtooth',.09,860);noise(1.6,900,.07,'bandpass');beep(880,.5,'sine',.08,500,1.2);},
  vortexR:()=>{if(AU.muted)return;beep(980,1.5,'sawtooth',.09,-820);noise(1.5,700,.08,'bandpass');beep(120,.5,'square',.09,-60,1.1);},
  chime:()=>{[440,554.4,659.3,880].forEach((f,i)=>beep(f,.9,'sine',.12,0,i*.16));},
  flash:()=>noise(.3,2500,.12,'highpass'),
};
function stopAmb(){AU.amb.forEach(n=>{try{n.g.gain.linearRampToValueAtTime(.0001,ac().currentTime+.6);n.s.forEach(s=>{try{s.stop(ac().currentTime+.7)}catch(e){}});}catch(e){}});AU.amb=[];}
function ambNode(make){if(AU.muted)return;const c=ac(),g=c.createGain();g.gain.value=0;g.connect(AU.ambBus||AU.master);const srcs=make(c,g);g.gain.linearRampToValueAtTime(1,c.currentTime+1.2);const nodes={g,s:srcs};AU.amb.push(nodes);srcs.forEach(s=>{try{s.start()}catch(e){}});}
function setAmbience(kind){stopAmb();ambSet=kind;setSong(kind?AMB_SONG[kind]||'':'');duckMusic(kind?1:0,kind?.8:.5);if(AU.muted||!AU.ctx||!kind)return;
  if(kind==='2088'||kind==='title'){ambNode((c,g)=>{const s=c.createBufferSource();s.buffer=noiseBuf(c,3);s.loop=true;const f=c.createBiquadFilter();f.type='lowpass';f.frequency.value=320;const l=c.createOscillator();l.frequency.value=.13;const lg=c.createGain();lg.gain.value=140;l.connect(lg);lg.connect(f.frequency);l.start();const v=c.createGain();v.gain.value=.05;s.connect(f);f.connect(v);v.connect(g);return[s,l];});}
  if(kind==='1944'){ambNode((c,g)=>{const s=c.createBufferSource();s.buffer=noiseBuf(c,3);s.loop=true;const f=c.createBiquadFilter();f.type='lowpass';f.frequency.value=130;const v=c.createGain();v.gain.value=.09;s.connect(f);f.connect(v);v.connect(g);return[s];});}
  if(kind==='1968'){ambNode((c,g)=>{const o=c.createOscillator();o.type='sine';o.frequency.value=55;const v=c.createGain();v.gain.value=.035;o.connect(v);v.connect(g);const s=c.createBufferSource();s.buffer=noiseBuf(c,2);s.loop=true;const f=c.createBiquadFilter();f.type='bandpass';f.frequency.value=780;const v2=c.createGain();v2.gain.value=.016;s.connect(f);f.connect(v2);v2.connect(g);return[o,s];});}
  if(kind==='1999'){ambNode((c,g)=>{const os=[220,329.6,440].map(fr=>{const o=c.createOscillator();o.type='triangle';o.frequency.value=fr*(1+(Math.random()-.5)*.004);const v=c.createGain();v.gain.value=.028;o.connect(v);v.connect(g);return o;});const l=c.createOscillator();l.frequency.value=.3;const lg=c.createGain();lg.gain.value=.012;l.connect(lg);lg.connect(g.gain);l.start();return[...os,l];});}
  (AMB_LAYER[kind]||[]).forEach(([id,v])=>ambBufLoop(id,v)); // loop rekaman CC0 berlapis
}

/* ============================================================
   MUSIK PROSEDURAL — sequencer leitmotif "Hearts Across Time"
   Track: pad / bass / musicbox / bell / tick, dijadwalkan lookahead.
   Lembar soal sama, aransemen beda per era (teknik leitmotif):
   title=kotak musik Am • 1944=drone tritone • 1968=pulse mata-mata
   1999=bel arpeggio Am9 • true end=motif yang sama → resolusi C mayor
   ============================================================ */
const NOTE={C:0,'C#':1,Db:1,D:2,'D#':3,Eb:3,E:4,F:5,'F#':6,Gb:6,G:7,'G#':8,Ab:8,A:9,'A#':10,Bb:10,B:11};
function NF(s){const m=s.match(/^([A-G][#b]?)(\d)$/);return 440*Math.pow(2,(NOTE[m[1]]+12*(+m[2]+1)-69)/12);}
function arpEv(start,notes,gap,dur,vel=.8){const seq=notes.concat(notes.slice(1,-1).reverse());return seq.map((n,i)=>[start+i*gap,n,dur,vel]);}
const MELODI=[ // leitmotif (16 langkah/bar, 8 bar)
  [0,'A4',6],[6,'C5',3],[10,'E5',6],[16,'D5',6],[22,'C5',3],[26,'B4',6],
  [32,'A4',4],[36,'B4',3],[40,'C5',3],[44,'D5',6],[48,'E5',12],
  [64,'F5',6],[70,'E5',3],[74,'D5',3],[78,'C5',6],[80,'D5',6],[86,'E5',3],[90,'C5',3],[94,'A4',6],
  [96,'B4',6],[102,'G4',3],[106,'E4',6],[112,'A4',16],[112,'A5',14,.7]];
const SONGS={
  theme:{bpm:74,len:128,tracks:[ // judul & 2088 — kotak musik melankolis
    {v:'pad',ev:[[0,['A3','C4','E4'],16],[16,['G3','B3','D4'],16],[32,['A3','C4','E4'],16],[48,['E3','G#3','B3'],16],[64,['F3','A3','C4'],16],[80,['C3','E3','G3'],16],[96,['E3','G#3','B3'],16],[112,['A3','C4','E4'],16]]},
    {v:'bass',ev:[[0,'A2',16],[16,'G2',16],[32,'A2',16],[48,'E2',16],[64,'F2',16],[80,'C3',16],[96,'E2',16],[112,'A2',16]]},
    {v:'musicbox',ev:MELODI}]},
  war:{bpm:62,len:128,tracks:[ // 1944 — drone rendah + tritone Eb (ketegangan)
    {v:'pad',ev:[[0,['A2','E3'],28],[32,['A2','E3'],28],[64,['F2','C3'],28],[96,['D#2','A#2'],30]]},
    {v:'bass',ev:[[0,'A1',24],[32,'A1',24],[64,'F1',24],[96,'D#2',26]]},
    {v:'bell',ev:[[16,'D5',8,.55],[48,'A4',8,.55],[80,'D#5',8,.6],[112,'E5',10,.65]]}]},
  spy:{bpm:92,len:128,tracks:[ // 1968 — pulse bass mata-mata + frasa motif
    {v:'bass',ev:(()=>{const roots=['A2','A2','F2','G2','A2','A2','F2','E2'],e=[];roots.forEach((r,i)=>{const b=i*16,r3=r.replace('2','3');e.push([b,r,2],[b+4,r,2],[b+8,r3,2],[b+12,r,2]);});return e;})()},
    {v:'pad',ev:[[0,['A3','C4','E4'],30],[32,['F3','A3','C4'],14],[48,['G3','B3','D4'],14],[64,['A3','C4','E4'],30],[96,['F3','A3','C4'],14],[112,['E3','G#3','B3'],14]]},
    {v:'tick',ev:(()=>{const e=[];for(let i=0;i<64;i++)e.push([i*2,'x',1,i%8===4?.8:.45]);return e;})()},
    {v:'musicbox',ev:[[32,'C5',4,.7],[38,'B4',4,.7],[96,'B4',6,.7],[104,'G#4',6,.7]]}]},
  cryo:{bpm:66,len:128,tracks:[ // 1999 — bel Am9 arpeggio berkilau
    {v:'bell',ev:[...arpEv(0,['A4','C5','E5','G5','B5'],2,4),...arpEv(16,['A4','C5','E5','G5','B5'],2,4),...arpEv(32,['F4','A4','C5','E5','G5'],2,4),...arpEv(48,['C4','E4','G4','B4','D5'],2,4),...arpEv(64,['A4','C5','E5','G5','B5'],2,4),...arpEv(80,['A4','C5','E5','G5','B5'],2,4),...arpEv(96,['F4','A4','C5','E5','G5'],2,4),...arpEv(112,['E4','G#4','B4','E5','G#5'],2,4)]},
    {v:'pad',ev:[[0,['A2','E3','B3'],30],[32,['F2','C3','A3'],30],[64,['A2','E3','B3'],30],[96,['E2','B2','G#3'],30]]},
    {v:'bass',ev:[[0,'A1',30],[32,'F2',30],[64,'A1',30],[96,'E2',30]]}]},
  end:{bpm:76,len:128,dbl:true,tracks:[ // true ending — motif yang sama, C mayor, hangat
    {v:'pad',ev:[[0,['A3','C4','E4'],16],[16,['F3','A3','C4'],16],[32,['C3','E3','G3'],16],[48,['G2','B2','D3'],16],[64,['F3','A3','C4'],16],[80,['C3','E3','G3'],16],[96,['G2','B2','D3'],16],[112,['C3','E3','G3'],16]]},
    {v:'bass',ev:[[0,'A2',16],[16,'F2',16],[32,'C3',16],[48,'G2',16],[64,'F2',16],[80,'C3',16],[96,'G2',16],[112,'C3',16]]},
    {v:'musicbox',ev:MELODI}]},
};
const AMB_SONG={'title':'theme','2088':'theme','1944':'war','1968':'spy','1999':'cryo'};
const MUS={name:'',song:null,map:null,step:0,nextT:0};
function buildMap(s){const m={};s.tracks.forEach(tr=>tr.ev.forEach(e=>{(m[e[0]]=m[e[0]]||[]).push({v:tr.v,notes:Array.isArray(e[1])?e[1]:[e[1]],dur:e[2]||6,vel:e[3]||1});}));return m;}
function setSong(nm){if(MUS.name===nm)return;MUS.name=nm;MUS.song=SONGS[nm]||null;MUS.map=MUS.song?buildMap(MUS.song):null;MUS.step=0;if(AU.ctx)MUS.nextT=AU.ctx.currentTime+.06;}
function duckMusic(level,rel){if(!AU.ctx||!AU.musBus)return;const t=AU.ctx.currentTime;try{AU.musBus.gain.cancelScheduledValues(t);AU.musBus.gain.setValueAtTime(AU.musBus.gain.value,t);AU.musBus.gain.linearRampToValueAtTime(.8*vGain(OPTS.volMus)*level,t+(rel||.4));}catch(e){}}
function vMusicbox(f,t,g){const c=AU.ctx;[[1,1],[3.98,.16],[6.1,.05]].forEach(([r,a])=>{const o=c.createOscillator();o.type='sine';o.frequency.value=f*r;const og=c.createGain();og.gain.setValueAtTime(g*a,t);og.gain.exponentialRampToValueAtTime(.0001,t+1.4/Math.sqrt(r));o.connect(og);og.connect(AU.mIn);o.start(t);o.stop(t+1.5);});}
function vBell(f,t,g){const c=AU.ctx;const car=c.createOscillator();car.type='sine';car.frequency.value=f;const mod=c.createOscillator();mod.type='sine';mod.frequency.value=f*2.4;const mg=c.createGain();mg.gain.setValueAtTime(f*1.6,t);mg.gain.exponentialRampToValueAtTime(f*.02,t+1.1);mod.connect(mg);mg.connect(car.frequency);const bg=c.createGain();bg.gain.setValueAtTime(g,t);bg.gain.exponentialRampToValueAtTime(.0001,t+2.2);car.connect(bg);bg.connect(AU.mIn);car.start(t);mod.start(t);car.stop(t+2.3);mod.stop(t+2.3);}
function vPad(f,t,dur,g){const c=AU.ctx;const lp=c.createBiquadFilter();lp.type='lowpass';lp.frequency.value=850;const vg=c.createGain();vg.gain.setValueAtTime(.0001,t);vg.gain.linearRampToValueAtTime(g,t+.5);vg.gain.setValueAtTime(g,t+dur*.6);vg.gain.linearRampToValueAtTime(.0001,t+dur);lp.connect(vg);vg.connect(AU.mIn);[-4,4].forEach(d2=>{const o=c.createOscillator();o.type='triangle';o.frequency.value=f;o.detune.value=d2;o.connect(lp);o.start(t);o.stop(t+dur+.1);});}
function vBass(f,t,dur,g){const c=AU.ctx;const o=c.createOscillator();o.type='triangle';o.frequency.value=f;const o2=c.createOscillator();o2.type='sine';o2.frequency.value=f*2;const g2=c.createGain();g2.gain.value=.35;const lp=c.createBiquadFilter();lp.type='lowpass';lp.frequency.value=420;const bg=c.createGain();bg.gain.setValueAtTime(.0001,t);bg.gain.linearRampToValueAtTime(g,t+.02);bg.gain.setValueAtTime(g*.7,t+dur*.7);bg.gain.linearRampToValueAtTime(.0001,t+dur);o.connect(lp);o2.connect(g2);g2.connect(lp);lp.connect(bg);bg.connect(AU.mIn);o.start(t);o.stop(t+dur+.05);o2.start(t);o2.stop(t+dur+.05);}
function vTick(t,g){const c=AU.ctx;const s=c.createBufferSource();s.buffer=noiseBuf(c,.02);const f=c.createBiquadFilter();f.type='highpass';f.frequency.value=6000;const tg=c.createGain();tg.gain.setValueAtTime(g,t);tg.gain.exponentialRampToValueAtTime(.0001,t+.03);s.connect(f);f.connect(tg);tg.connect(AU.mIn);s.start(t);}
function musTick(){const c=AU.ctx;if(!c||!MUS.song||AU.muted)return;if(!MUS.nextT||MUS.nextT<c.currentTime-.5)MUS.nextT=c.currentTime+.05;const s=MUS.song,spb=60/s.bpm/4;
  while(MUS.nextT<c.currentTime+.16){const evs=MUS.map[MUS.step];
    if(evs)evs.forEach(e=>{const t=MUS.nextT,spbDur=e.dur*spb,g=.26*e.vel;e.notes.forEach(n=>{
      if(e.v==='tick'){vTick(t,g*.5);return;}
      const f=NF(n);
      if(e.v==='pad')vPad(f,t,spbDur+.15,g*.5);
      else if(e.v==='bass')vBass(f,t,spbDur,g);
      else if(e.v==='bell')vBell(f,t,g);
      else if(e.v==='tick')vTick(t,g*.5);
      else{vMusicbox(f,t,g);if(s.dbl)vBell(f*2,t,g*.35);}});});
    MUS.step=(MUS.step+1)%s.len;MUS.nextT+=spb;}}
setInterval(musTick,42);

/* ---------- Input ---------- */
const keys={},pressed={};
addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown',' ','Enter','Tab'].includes(e.key))e.preventDefault();if(!keys[e.key])pressed[e.key]=true;keys[e.key]=true;initAudioOnce();});
addEventListener('keyup',e=>{keys[e.key]=false;});
let ptr={x:0,y:0,down:false,tap:false};
function cvXY(e){const r=cv.getBoundingClientRect();const cx=(e.touches?e.touches[0].clientX:e.clientX)-r.left,cy=(e.touches?e.touches[0].clientY:e.clientY)-r.top;return{x:cx/r.width*W,y:cy/r.height*H};}
function pdown(e){e.preventDefault();const p=cvXY(e);ptr.x=p.x;ptr.y=p.y;ptr.down=true;ptr.tap=true;initAudioOnce();}
function pmove(e){if(e.touches)e.preventDefault();const p=cvXY(e);ptr.x=p.x;ptr.y=p.y;}
function pup(){ptr.down=false;}
cv.addEventListener('mousedown',pdown);cv.addEventListener('mousemove',pmove);addEventListener('mouseup',pup);
cv.addEventListener('touchstart',pdown,{passive:false});cv.addEventListener('touchmove',pmove,{passive:false});addEventListener('touchend',pup);
let audioInited=false;
function initAudioOnce(){if(audioInited)return;audioInited=true;ac();loadAudioBufs();}
function keyOnce(k){if(pressed[k]){pressed[k]=false;return true;}return false;}
const advHit=()=>keyOnce(' ')||keyOnce('Enter')||keyOnce('Spacebar');

/* ---------- State global ---------- */
const S={empathy:0,logic:0,routeB1:'',routeB2:'',loop:0};
const G={state:'load',t:0,player:{x:90,phase:0,moving:false,face:1,facingRight:true,vx:0,stride:0,turnT:0,acc:0},
  walk:null,dialog:null,cam:0,camTarget:0,caption:'',captionT:0,
  vortex:null,glitch:null,flash:0,whiteFlash:0,skyFlash:0,
  era:'2088',shakeT:0,shakeA:0,endCard:null,fadeIn:0,prologueDone:false,
  paused:false,pSel:0,pulse:null,titleT:0,titleReady:false,prologueT:0};
let T=0; // waktu global detik

/* ---------- Opsi & penyimpanan (localStorage) ---------- */
const OPTS=Object.assign({vol:.9,textSpd:1},(()=>{try{return JSON.parse(localStorage.getItem('hat_opts')||'{}')}catch(e){return{}}})());
const vGain=v=>Math.pow(v===undefined?1:v,2.2); // kurva persepsi (audio-design): slider linier → gain; 0 tetap senyap
function saveOpts(){try{localStorage.setItem('hat_opts',JSON.stringify(OPTS));}catch(e){}}
const SAVE={seen:{},chosen:{},game:null,endings:{},inspected:{}}; // node terlihat / pilihan pernah dipilih / autosave siklus / ending terungkap / titik lore pernah dibuka
const END_TOTAL=['A1','B1','B2lock','rebut','paradox','true']; // 5 rute gagal + true ending
function markEnd(k){if(!k)return;if(!SAVE.endings)SAVE.endings={};if(!SAVE.endings[k]){SAVE.endings[k]=1;persistSave();}}
try{Object.assign(SAVE,JSON.parse(localStorage.getItem('hat_save')||'{}'));}catch(e){}
function persistSave(){try{localStorage.setItem('hat_save',JSON.stringify(SAVE));}catch(e){}}
function applyVol(){if(AU.master&&!AU.muted)AU.master.gain.value=vGain(OPTS.vol);
  if(AU.sfxBus)AU.sfxBus.gain.value=vGain(OPTS.volSfx); // slider EFEK
  if(AU.musBus)duckMusic(D&&D.duckT?.55:.85,.06); // slider MUSIK via duckMusic agar transisi halus
  if(AU.ctx&&AU.ambBus&&!G.paused){const t=AU.ctx.currentTime;AU.ambBus.gain.cancelScheduledValues(t);AU.ambBus.gain.setValueAtTime(AU.ambBus.gain.value,t);AU.ambBus.gain.linearRampToValueAtTime(.9*vGain(OPTS.volSfx),t+.15);}}
