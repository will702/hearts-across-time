"use strict";
class InteractionSystem{
  constructor(scene){this.scene=scene;this.objects=[];this.player=null;this.active=null;}
  makeSensor(o){const r=o.def.proximity,z=this.scene.add.zone(r.x+r.w/2,r.y+r.h/2,r.w,r.h);z.setData('id',o.id);z.setData('kind','sensor');this.scene.physics.add.existing(z,true);o.sensorZone=z;}
  load(objects,player){this.clear();this.objects=objects;this.player=player;for(const o of objects)if(o.def.proximity)this.makeSensor(o);}
  clear(){for(const o of this.objects)if(o.sensorZone){o.sensorZone.destroy();o.sensorZone=null;}this.objects=[];this.player=null;this.active=null;}
  overlaps(o){return o.sensorZone&&o.sensorZone.body.enable&&this.scene.physics.overlap(this.player.zone,o.sensorZone);}
  tapped(o){if(!ptr.tap||!o.def.tap)return false;const t=o.def.tap,wx=ptr.x+G.cam;return t.y===undefined?Math.abs(wx-o.def.x)<t.radius:Math.hypot(wx-o.def.x,ptr.y-t.y)<t.radius;}
  update(){const near=this.objects.filter(o=>o.refresh()&&this.overlaps(o));const auto=near.find(o=>o.def.auto);this.active=near.filter(o=>!o.def.auto).sort((a,b)=>(b.def.priority||0)-(a.def.priority||0)||Math.abs(G.player.x-a.def.x)-Math.abs(G.player.x-b.def.x))[0]||null;
    this.syncLegacy();if(auto)return auto.def.action;if(!this.active)return null;
    const act=keyOnce('ArrowDown')||keyOnce('s')||keyOnce('S')||advHit()||this.tapped(this.active)||touchActHit();
    if(!act)return null;ptr.tap=false;return this.active.def.action;}
  syncLegacy(){if(!G.walk)return;const o=this.active;G.walk.watchHot=!!o&&o.kind==='watch';G.walk.challengeHot=!!o&&o.kind==='challenge';G.walk.hot=o&&o.kind==='lore'?{id:o.id,x:o.def.x}:null;G.walk.prompt=o&&o.def.prompt||'';G.walk.promptTouch=o&&o.def.promptTouch||'';}
  destroy(){this.clear();this.scene=null;}
}
