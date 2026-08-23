"use strict";
class PlayerController{
  constructor(scene){this.scene=scene;this.zone=scene.add.zone(90,GROUND-6,24,12);this.zone.setData('id','player-foot');scene.physics.add.existing(this.zone);this.body=this.zone.body;this.body.setSize(24,12);this.body.setAllowGravity(true);this.body.setMaxVelocity(262,600);this.body.setBounce(0);this.body.enable=false;this.suspended=true;}
  enter(p){this.body.enable=true;this.zone.setActive(true);this.body.reset(p.x,(p.y||GROUND)-6);this.body.setVelocity(p.vx||0,0);this.suspended=false;this.sync(p);}
  suspend(){if(this.suspended)return;this.sync(G.player);this.body.stop();this.body.enable=false;this.suspended=true;}
  resume(p){if(!this.suspended)return;this.enter(p);}
  sync(p){if(!this.body.enable)return;p.x=this.body.center.x;p.y=this.body.bottom;p.vx=this.body.velocity.x;}
  update(dt){this.sync(G.player);const p=G.player,prevVx=p.vx;let dir=0;if(keys['ArrowRight']||keys.d||keys.D)dir++;if(keys['ArrowLeft']||keys.a||keys.A)dir--;
    const touchRun=IS_TOUCH&&ptr.down&&Math.hypot(ptr.x-(W-36),ptr.y-(H-162))<30;if(IS_TOUCH&&ptr.down){if(ptr.x>W-140&&ptr.y>H-130)dir=1;else if(ptr.x<140&&ptr.y>H-130)dir=-1;}
    const sprint=keys.Shift||touchRun,top=(S.loop>0?!sprint:sprint)?262:150,next=dir?prevVx+clamp(dir*top-prevVx,-900*dt,900*dt):prevVx-clamp(prevVx,-1400*dt,1400*dt);
    if(dir&&dir>0!==p.facingRight){p.facingRight=dir>0;p.turnT=.14;}this.body.setMaxVelocity(262,600);this.body.setVelocityX(next);
    if(dir&&Math.abs(prevVx)<10)parts.push({x:p.x-G.cam,y:p.y-3,vx:-dir*24,vy:-14,grav:80,l:0,ml:.4,r:2.4,col:'rgba(170,150,120,.5)',shrink:1});
    if(S.loop===0){if(dir&&!SAVE.tutorial.move)tutorialDone('move');if(sprint&&!SAVE.tutorial.sprint)tutorialDone('sprint');}
    p.vx=next;p.acc=lerp(p.acc,(next-prevVx)/Math.max(dt,1e-4),1-Math.pow(.01,dt));if(!dir&&Math.abs(prevVx)>140&&Math.abs(next)<10)for(let k=0;k<3;k++)parts.push({x:p.x-G.cam+(Math.random()-.5)*10,y:p.y-3,vx:(p.facingRight?1:-1)*(14+Math.random()*22)+(Math.random()-.5)*10,vy:-8-Math.random()*16,grav:80,l:0,ml:.45+Math.random()*.2,r:2+Math.random()*2,col:'rgba(170,150,120,.5)',shrink:1});
    if(p.turnT>0)p.turnT-=dt;const old=p.phase;p.phase+=Math.abs(next)*dt*.105;p.moving=Math.abs(next)>8;p.stride=clamp(Math.abs(next)/262,0,1);
    if(p.moving&&Math.floor(old/Math.PI)!==Math.floor(p.phase/Math.PI)){SFX.step();for(let k=0;k<2;k++)parts.push({x:p.x-G.cam+(Math.random()-.5)*8,y:p.y-3,vx:-(Math.sign(next)||1)*(20+Math.random()*24),vy:-10-Math.random()*20,grav:80,l:0,ml:.45+Math.random()*.25,r:2+Math.random()*2,col:'rgba(170,150,120,.5)',shrink:1});}}
  destroy(){this.zone.destroy();this.scene=this.zone=this.body=null;}
}

const HAT_WORLD={scene:null,def:null,objects:[],player:null,surfaces:null,interactions:null,debug:new URLSearchParams(location.search).get('physicsDebug')==='1',
  init(scene){this.scene=scene;this.player=new PlayerController(scene);this.surfaces=new SurfaceSystem(scene);this.interactions=new InteractionSystem(scene);},
  enter(era){if(!this.scene)return false;if(era!=='1944'){this.leave();return false;}if(this.def)this.leave();this.def=WORLD_DEFS[era];this.objects=this.def.objects.map(d=>new WorldObject(d));this.player.enter(G.player);this.surfaces.load(this.def,this.objects,this.player);this.interactions.load(this.objects,this.player);return true;},
  leave(){if(this.interactions)this.interactions.clear();if(this.surfaces)this.surfaces.clear();for(const o of this.objects)o.destroy();this.objects=[];this.def=null;if(this.player)this.player.suspend();},
  update(dt){if(!this.def)this.enter('1944');this.player.resume(G.player);this.player.update(dt);return this.interactions.update();},
  afterUpdate(){if(!this.def)return;if(G.paused||G.state!=='walk'||G.era!=='1944'||G.lore||G.diary)this.player.suspend();},
  setPaused(on){if(!this.scene)return;on?this.scene.physics.world.pause():this.scene.physics.world.resume();},
  drawDebug(c){if(!this.debug||!this.def||G.era!=='1944'||!['walk','dialog','watchrepair','challenge'].includes(G.state))return;const draw=(z,col)=>{if(!z||!z.body)return;const b=z.body;c.strokeStyle=col;c.strokeRect(b.x-G.cam,b.y,b.width,b.height);const id=z.getData('id');if(id){c.fillStyle=col;c.font='10px monospace';c.fillText(id,b.x-G.cam+2,b.y-3);}};c.save();c.lineWidth=1.5;for(const z of this.surfaces.zones)draw(z,z.getData('kind')==='ground'?'#4695ff':z.getData('kind')==='blocker'?'#ff5d55':'#5f7dff');for(const o of this.objects)draw(o.sensorZone,'#35e6df');draw(this.player.zone,'#63ff78');c.restore();},
  destroy(){this.leave();if(this.interactions)this.interactions.destroy();if(this.surfaces)this.surfaces.destroy();if(this.player)this.player.destroy();this.scene=this.player=this.surfaces=this.interactions=null;}
};
