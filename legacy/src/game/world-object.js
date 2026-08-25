"use strict";
class WorldObject{
  constructor(def){this.def=def;this.collisionZone=null;this.sensorZone=null;}
  get id(){return this.def.id;}
  get kind(){return this.def.kind;}
  get active(){return !this.def.enabled||!!this.def.enabled();}
  refresh(){const on=this.active;if(this.collisionZone&&this.collisionZone.body)this.collisionZone.body.enable=on;if(this.sensorZone&&this.sensorZone.body)this.sensorZone.body.enable=on;return on;}
  destroy(){if(this.collisionZone)this.collisionZone.destroy();if(this.sensorZone)this.sensorZone.destroy();this.collisionZone=this.sensorZone=null;}
}

