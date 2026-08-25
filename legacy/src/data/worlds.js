"use strict";
/* Definisi geometri traversal. Koordinat rect memakai x/y kiri-atas agar data dapat
   dipindahkan ke authoring eksternal tanpa mengubah kontrak runtime. */
const WORLD_DEFS={
  '1944':{
    width:1450,spawn:{x:90,y:GROUND},
    surfaces:[
      {id:'ground',kind:'ground',rect:{x:0,y:GROUND,w:1450,h:H-GROUND+64}},
      {id:'left-bound',kind:'obstacle',rect:{x:-52,y:0,w:104,h:GROUND}},
      {id:'right-bound',kind:'obstacle',rect:{x:1422,y:0,w:104,h:GROUND}}
    ],
    objects:[
      {id:'watch',kind:'watch',x:420,priority:100,enabled:()=>!S.watchRepaired,
        collision:{x:398,y:GROUND-60,w:44,h:60},proximity:{x:332,y:GROUND-50,w:108,h:100},
        prompt:'SPACE — PERIKSA ARLOJI',promptTouch:'SPACE — ARLOJI',tap:{radius:75},action:{type:'watchrepair'},resumeX:478},
      {id:'spotlight',kind:'challenge',x:700,priority:90,enabled:()=>!S.challenges['1944'],
        collision:{x:670,y:GROUND-74,w:60,h:74},proximity:{x:604,y:GROUND-50,w:108,h:100},
        prompt:'▼ AKTIFKAN',promptTouch:'▼ AKTIFKAN',tap:{radius:80},action:{type:'challenge'},resumeX:765},
      {id:'lore_crate',kind:'lore',x:480,priority:20,enabled:()=>!SAVE.inspected.lore_crate,
        proximity:{x:440,y:GROUND-50,w:80,h:100},prompt:'▼ periksa',promptTouch:'SPACE — PERIKSA',
        tap:{radius:40,y:GROUND-14},action:{type:'lore',id:'lore_crate'}},
      {id:'lore_flare',kind:'lore',x:1000,priority:20,enabled:()=>!SAVE.inspected.lore_flare,
        proximity:{x:960,y:GROUND-50,w:80,h:100},prompt:'▼ periksa',promptTouch:'SPACE — PERIKSA',
        tap:{radius:40,y:GROUND-14},action:{type:'lore',id:'lore_flare'}},
      {id:'arthur',kind:'exit',x:1240,priority:10,auto:true,enabled:()=>S.watchRepaired&&!!S.challenges['1944'],
        proximity:{x:1077,y:GROUND-50,w:373,h:100},action:{type:'dialog'}}
    ]
  }
};
function worldObjectDef(era,id){const w=WORLD_DEFS[era];return w&&w.objects.find(o=>o.id===id);}

