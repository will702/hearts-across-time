"use strict";
class SurfaceSystem{
  constructor(scene){this.scene=scene;this.zones=[];this.colliders=[];this.objects=[];}
  makeZone(rect,id,kind){const z=this.scene.add.zone(rect.x+rect.w/2,rect.y+rect.h/2,rect.w,rect.h);z.setData('id',id);z.setData('kind',kind);this.scene.physics.add.existing(z,true);this.zones.push(z);return z;}
  load(def,objects,player){this.clear();this.objects=objects;for(const s of def.surfaces){const z=this.makeZone(s.rect,s.id,s.kind);this.colliders.push(this.scene.physics.add.collider(player.zone,z));}
    for(const o of objects){if(!o.def.collision)continue;o.collisionZone=this.makeZone(o.def.collision,o.id,'blocker');this.colliders.push(this.scene.physics.add.collider(player.zone,o.collisionZone));}}
  clear(){for(const c of this.colliders)c.destroy();for(const z of this.zones)z.destroy();for(const o of this.objects)o.collisionZone=null;this.colliders.length=this.zones.length=0;this.objects=[];}
  destroy(){this.clear();this.scene=null;}
}
