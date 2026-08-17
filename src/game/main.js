"use strict";
/* Phaser menjadi pemilik lifecycle, timing, dan pause runtime. Renderer Canvas yang sudah
   teruji digambar pada POST_RENDER, sehingga seluruh rute tetap identik selama scene-scene
   visual dipindahkan bertahap ke display list Phaser. */
class HeartsGameScene extends Phaser.Scene{
  constructor(){super({key:'HeartsGame'});this.lastFrame=0;}
  create(){
    this.lastFrame=this.game.loop.now||performance.now();
    this.game.events.on(Phaser.Core.Events.POST_RENDER,this.drawGame,this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>this.game.events.off(Phaser.Core.Events.POST_RENDER,this.drawGame,this));
    window.__HAT={game:this.game,scene:this,state:G,run:S,dialog:D,assets:AS};
  }
  update(now,delta){
    const dt=Math.max(0,Math.min(.05,delta/1000));
    try{
      if(keyOnce('m')||keyOnce('M'))toggleMute();
      update(dt);
    }catch(e){if(!this.errOnce){this.errOnce=true;console.error(e);}}
  }
  drawGame(){
    try{render();}catch(e){if(!this.errOnce){this.errOnce=true;console.error(e);}}
  }
}

const PHASER_CONFIG={
  type:Phaser.CANVAS,
  width:W,height:H,
  canvas:cv,parent:'wrap',
  backgroundColor:'#0a0806',
  disableContextMenu:true,banner:false,
  render:{clearBeforeRender:true,antialias:true,pixelArt:false},
  scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH},
  scene:[HeartsGameScene]
};
const HAT_GAME=new Phaser.Game(PHASER_CONFIG);

// Hemat audio saat tab tidak terlihat; Phaser otomatis menghentikan tick rendernya.
document.addEventListener('visibilitychange',()=>{if(!AU.ctx)return;
  if(document.hidden)AU.ctx.suspend();else if(!G.paused)AU.ctx.resume();});
