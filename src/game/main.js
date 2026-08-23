"use strict";
/* Phaser menjadi pemilik lifecycle, timing, dan pause runtime. Renderer Canvas yang sudah
   teruji digambar pada POST_RENDER, sehingga seluruh rute tetap identik selama scene-scene
   visual dipindahkan bertahap ke display list Phaser. */
class HeartsGameScene extends Phaser.Scene{
  constructor(){super({key:'HeartsGame'});this.lastFrame=0;this.qaFrozen=false;}
  create(){
    this.lastFrame=this.game.loop.now||performance.now();
    HAT_WORLD.init(this);
    this.game.events.on(Phaser.Core.Events.POST_RENDER,this.drawGame,this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>{this.game.events.off(Phaser.Core.Events.POST_RENDER,this.drawGame,this);HAT_WORLD.destroy();});
    const hat={game:this.game,scene:this,state:G,run:S,dialog:D,assets:AS,world:HAT_WORLD};
    if(new URLSearchParams(location.search).get('qa')==='1')hat.qa={
      get frozen(){return !!hat.scene.qaFrozen;},
      snapshot:()=>JSON.parse(JSON.stringify({state:G.state,era:G.era,paused:G.paused,t:T,player:G.player,walk:G.walk,challenge:G.challenge,dialog:{node:D.node,i:D.i,choices:!!D.choices},run:S,save:SAVE,opts:OPTS,assets:{ready:AS.ready,done:AS.done,total:AS.total}})),
      freeze:(time=4)=>{this.qaFrozen=true;T=time;G.t=time;HAT_WORLD.setPaused(true);},
      resume:()=>{this.qaFrozen=false;HAT_WORLD.setPaused(G.paused);},
      setOption:(name,value)=>{if(!['reduceMotion','textScale','textSpd'].includes(name))throw new Error('Opsi QA tidak diizinkan: '+name);OPTS[name]=value;saveOpts();},
      scenario:(name,era)=>{this.qaFrozen=false;resetAll();if(name==='title'){G.state='title';G.titleReady=true;G.titleT=8.4;}
        else if(name==='walk')startWalk(era);
        else if(name==='dialog'){startWalk(era);startEraDialog();}
        else if(name==='challenge'){startWalk(era);startChallenge();}
        else if(name==='watchrepair'){startWalk('1944');startWatchRepair();}
        else if(name==='rosepuzzle'){startWalk('1968');startRosePuzzle();}
        else if(name==='gemalign'){startWalk('1999');startGemAlign();}
        else if(name==='photopuzzle'){startWalk('1999');startPhotoPuzzle();}
        else if(name==='glitch')startGlitch();else if(name==='endcard')startEndCard();else throw new Error('Skenario QA tidak dikenal: '+name);}
    };
    window.__HAT=hat;
  }
  update(now,delta){
    if(this.qaFrozen)return;
    const dt=Math.max(0,Math.min(.05,delta/1000));
    try{
      if(keyOnce('m')||keyOnce('M'))toggleMute();
      update(dt);
      HAT_WORLD.afterUpdate();
    }catch(e){if(!this.errOnce){this.errOnce=true;console.error(e);}}
  }
  drawGame(){
    try{render();HAT_WORLD.drawDebug(ctx);}catch(e){if(!this.errOnce){this.errOnce=true;console.error(e);}}
  }
}

const PHASER_CONFIG={
  type:Phaser.CANVAS,
  width:W,height:H,
  canvas:cv,parent:'wrap',
  backgroundColor:'#0a0806',
  disableContextMenu:true,banner:false,
  physics:{default:'arcade',arcade:{gravity:{x:0,y:1600},fps:60,fixedStep:true,debug:false}},
  render:{clearBeforeRender:true,antialias:true,pixelArt:false},
  scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH},
  scene:[HeartsGameScene]
};
const HAT_GAME=new Phaser.Game(PHASER_CONFIG);

/* Intro MP4 memakai elemen native agar audio/video tetap sinkron. Tombol mulai diperlukan
   karena browser memblokir autoplay bersuara; onboarding Canvas tetap menjadi fallback. */
const introShell=document.getElementById('cinematic'),introVideo=document.getElementById('intro-video'),introStart=document.getElementById('intro-start'),introSkip=document.getElementById('intro-skip');
let introResumeAudio=false;
function finishIntroVideo(done=true){introVideo.pause();introShell.hidden=true;introStart.hidden=false;pressed[' ']=pressed.Enter=ptr.tap=false;
  if(introResumeAudio&&AU.ctx)AU.ctx.resume();introResumeAudio=false;if(done){SAVE.introDone=true;persistSave();G.titleT=8.4;G.titleReady=true;}if(G.state==='title')setAmbience('title');}
function playIntroVideo(){setAmbience(null);introResumeAudio=introResumeAudio||!!AU.ctx&&AU.ctx.state==='running';if(AU.ctx&&AU.ctx.state==='running')AU.ctx.suspend();introShell.hidden=false;introStart.hidden=false;introVideo.currentTime=0;introVideo.muted=AU.muted;introVideo.volume=vGain(OPTS.vol);
  introVideo.play().then(()=>{introStart.hidden=true;introSkip.focus();}).catch(()=>{introStart.focus();});}
introStart.addEventListener('click',()=>playIntroVideo());
introSkip.addEventListener('click',()=>finishIntroVideo());
introVideo.addEventListener('ended',()=>finishIntroVideo());
introVideo.addEventListener('error',()=>finishIntroVideo(false));
playIntroVideo();

// Hemat audio saat tab tidak terlihat; Phaser otomatis menghentikan tick rendernya.
document.addEventListener('visibilitychange',()=>{if(!AU.ctx)return;
  if(document.hidden)AU.ctx.suspend();else if(!G.paused)AU.ctx.resume();});
