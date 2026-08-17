function drawFace(c,expr,blink,t,col=PAL.eye,blush=false,browCol=PAL.line){
  const eyeH=(expr==='shock'||expr==='mad')?5.2:expr==='closed'?0.6:3.4;
  const drawEye=(dx)=>{
    c.fillStyle='#FFF';rr(c,dx-4.4,-4.6,8.8,9.2,4.2);c.fill();
    c.fillStyle=col;
    if(blink||expr==='closed'){c.fillRect(dx-3.6,.2,7.2,1.4);}
    else if(expr==='happy'){c.beginPath();c.arc(dx,0,3.6,Math.PI,0);c.fill();}
    else{rr(c,dx-2.6,-eyeH*.4+1.6,5.2,eyeH+2,2.5);c.fill();
      c.fillStyle='#FFF';c.beginPath();c.arc(dx+1.1,-eyeH*.4+2,1.3,0,TAU);c.fill();}
    outline(c,1.6);rr(c,dx-4.4,-4.6,8.8,9.2,4.2);c.stroke();
  };
  drawEye(-7.4);drawEye(7.4);
  // alis
  c.strokeStyle=PAL.line;c.lineWidth=1.8;
  const brow=(dx,a)=>{c.save();c.translate(dx,-8.4);c.rotate(a);c.strokeStyle=browCol;c.beginPath();c.moveTo(-3.4,0);c.quadraticCurveTo(0,-1.6,3.4,0);c.stroke();c.restore();};
  if(expr==='angry'||expr==='mad'){brow(-7.4,.38);brow(7.4,-.38);}
  else if(expr==='sad'){brow(-7.4,-.3);brow(7.4,.3);}
  else{brow(-7.4,-.08);brow(7.4,.08);}
  // mulut
  c.strokeStyle=PAL.line;c.lineWidth=1.8;c.beginPath();
  const my=9.4;
  if(expr==='smile'||expr==='happy'||expr==='warm'){c.moveTo(-3,my-1.4);c.quadraticCurveTo(0,my+2.4,3,my-1.4);}
  else if(expr==='sad'){c.moveTo(-3,my+1.6);c.quadraticCurveTo(0,my-1.6,3,my+1.6);}
  else if(expr==='shock'){c.moveTo(-2.2,my-.4);c.arc(0,my-.4,2.3,0,TAU);}
  else if(expr==='mad'){c.moveTo(-3.6,my+1);for(let i=-2.4;i<=2.6;i+=1.6)c.lineTo(i,my+(i%3.2<1.6?-1:1));}
  else{c.moveTo(-2.4,my);c.lineTo(2.4,my);}
  c.stroke();
  if(blush){const a=blush==='soft'?.20:.4;c.fillStyle=`rgba(226,120,110,${a})`;c.beginPath();c.ellipse(-10.6,5.6,3,1.7,0,0,TAU);c.ellipse(10.6,5.6,3,1.7,0,0,TAU);c.fill();}
  if(expr==='sad'){const ty=6.5+((t*7)%6);c.fillStyle='rgba(150,200,235,.85)';c.beginPath();c.ellipse(11.6,ty,1.5,2.3,0,0,TAU);c.fill();}
  if(expr==='shock'){c.fillStyle='rgba(150,205,240,.9)';c.beginPath();c.ellipse(-12.4,-5.5+(t*5)%3,1.6,2.4,.3,0,TAU);c.fill();}
}
function limb(c,x1,y1,x2,y2,w,col){c.strokeStyle=col;c.lineWidth=w;c.lineCap='round';c.beginPath();c.moveTo(x1,y1);c.lineTo(x2,y2);c.stroke();outline(c,1.4);c.beginPath();c.moveTo(x1,y1);c.lineTo(x2,y2);c.stroke();}
function groundShadow(c,w=1,a=.28){const g=c.createRadialGradient(0,0,2,0,0,26);g.addColorStop(0,`rgba(10,8,6,${a})`);g.addColorStop(1,'rgba(10,8,6,0)');c.save();c.translate(0,4);c.scale(w,.3);c.fillStyle=g;c.beginPath();c.arc(0,0,26,0,TAU);c.fill();c.restore();}

/* --- ELENA (adaptasi GIF referensi: ash-blonde belah tengah, gaun dusty-rose, boot pucat strap gelap, proporsi 1:3) --- */
function drawElena(c,t,phase,moving,expr='neutral',opt={}){
  if(drawCharSheet(c,'elena',expr,phase,moving,opt)){if(opt.vial)drawVialOverlay(c,ASSET_MANIFEST.elena);return;}
  const st=opt.stride===undefined?1:opt.stride;
  const bob=moving?Math.abs(Math.sin(phase))*(1.6+1.4*st):Math.sin(t*2)*0.9;
  const sw=moving?Math.sin(phase)*(0.75+0.4*st):Math.sin(t*1.4)*.1;
  const sway=moving?Math.sin(phase-.9)*.05:Math.sin(t*1.3)*.018; // rambut: follow-through, tertinggal dari langkah
  c.save();c.translate(0,-bob);
  if(moving&&opt.lean)c.rotate(opt.lean);
  // rambut belakang: sepanjang tulang belikat, ujung ikal ke DALAM (referensi GIF)
  c.save();c.rotate(sway*.7);c.translate(0,-59);
  c.fillStyle=PAL.hairEs;c.beginPath();
  c.moveTo(-16,-14);
  c.quadraticCurveTo(-19,4,-18,20);
  c.quadraticCurveTo(-16,26,-11,22);c.quadraticCurveTo(-9,28,-4,23);c.quadraticCurveTo(-1,29,4,23);c.quadraticCurveTo(8,27,11,21);c.quadraticCurveTo(15,25,18,19);
  c.quadraticCurveTo(19,4,16,-14);
  c.quadraticCurveTo(14,-22,0,-22);c.quadraticCurveTo(-14,-22,-16,-14);c.closePath();c.fill();
  outline(c,2.2);c.stroke();
  c.strokeStyle=PAL.hairE;c.lineWidth=1.6;
  c.beginPath();c.moveTo(-13,2);c.quadraticCurveTo(-14,12,-12,20);c.moveTo(13,2);c.quadraticCurveTo(14,12,12,20);c.stroke();
  c.restore();
  // kaki: langkah elips ayun/tumpu — kaki ayun terangkat di tengah silang, kaki tumpu menapak penuh
  const stA=9*(0.75+0.4*st),stL=3.2*(0.5+0.7*st);
  const lx1=moving?stA*Math.sin(phase):sw*9,lx2=moving?stA*Math.sin(phase+Math.PI):-sw*9;
  const ly1=moving?stL*Math.max(0,Math.cos(phase)):0,ly2=moving?stL*Math.max(0,Math.cos(phase+Math.PI)):0;
  limb(c,-4,-27,-4+lx1,-3-ly1,6,PAL.skin);limb(c,4,-27,4+lx2,-3-ly2,6,PAL.skin);
  // boot kulit pucat mid-calf + strap gelap + sol rata (referensi)
  const boot=(lx,ly)=>{c.save();c.translate(lx,-(ly||0));c.fillStyle=PAL.boot;rr(c,-5.6,-17,11.2,17,3.4);c.fill();outline(c,2.2);rr(c,-5.6,-17,11.2,17,3.4);c.stroke();
    c.strokeStyle=PAL.bootS;c.lineWidth=1.7;c.beginPath();c.moveTo(-4.8,-10);c.lineTo(4.8,-10);c.stroke(); // satu strap tipis
    c.lineWidth=2.4;c.beginPath();c.moveTo(-5,-1.2);c.lineTo(5,-1.2);c.stroke(); // sol rata
    c.restore();};
  boot(-4+lx1,ly1);boot(4+lx2,ly2);
  // gaun dusty-rose A-line — hem mengintip di bawah jas
  const hsw=moving?Math.sin(phase-.6)*6*(0.75+0.4*st):sw*6; // hem gaun tertinggal sedikit dari langkah (kain mengekor)
  c.fillStyle=PAL.dress;c.beginPath();c.moveTo(-9,-55);c.lineTo(9,-55);c.lineTo(14+hsw,-22);c.lineTo(-14+hsw,-22);c.closePath();c.fill();
  c.fillStyle=PAL.dressS;c.beginPath();c.moveTo(3,-55);c.lineTo(9,-55);c.lineTo(14+hsw,-22);c.lineTo(6+hsw,-22);c.closePath();c.fill();
  outline(c,2.4);c.beginPath();c.moveTo(-9,-55);c.lineTo(9,-55);c.lineTo(14+hsw,-22);c.lineTo(-14+hsw,-22);c.closePath();c.stroke();
  // bayangan lembut bawah dagu (referensi: soft shading)
  c.fillStyle='rgba(160,110,100,.18)';c.beginPath();c.ellipse(0,-52,7.5,2.2,0,0,TAU);c.fill();
  // lengan belakang: bahu puffed -> pergelangan ramping, tangan keluar (referensi)
  c.fillStyle=PAL.coatS;c.beginPath();
  c.moveTo(-7.5,-53);c.quadraticCurveTo(-12,-47,-10.5-sw*3.5,-36);c.lineTo(-6-sw*3.5,-34);c.quadraticCurveTo(-8,-45,-3.5,-51.5);c.closePath();c.fill();
  outline(c,2);c.beginPath();c.moveTo(-7.5,-53);c.quadraticCurveTo(-12,-47,-10.5-sw*3.5,-36);c.lineTo(-6-sw*3.5,-34);c.quadraticCurveTo(-8,-45,-3.5,-51.5);c.closePath();c.stroke();
  c.fillStyle=PAL.skin;c.beginPath();c.arc(-8.3-sw*3.5,-32.4,3,0,TAU);c.fill();outline(c,1.6);c.stroke();
  // jas lab terbuka: dua panel menggantung longgar, gaun mengintip di tengah
  c.fillStyle=PAL.coat;
  c.beginPath();c.moveTo(-12,-59);c.lineTo(-3.5,-48);c.lineTo(-4.5,-26);c.lineTo(-14.5,-26);c.closePath();c.fill();
  c.beginPath();c.moveTo(12,-59);c.lineTo(3.5,-48);c.lineTo(4.5,-26);c.lineTo(14.5,-26);c.closePath();c.fill();
  outline(c,2.4);
  c.beginPath();c.moveTo(-12,-59);c.lineTo(-3.5,-48);c.lineTo(-4.5,-26);c.lineTo(-14.5,-26);c.closePath();c.stroke();
  c.beginPath();c.moveTo(12,-59);c.lineTo(3.5,-48);c.lineTo(4.5,-26);c.lineTo(14.5,-26);c.closePath();c.stroke();
  c.strokeStyle=PAL.coatS;c.lineWidth=1.4;
  c.beginPath();c.moveTo(-9.8,-52);c.lineTo(-11,-28);c.moveTo(9.8,-52);c.lineTo(11,-28);c.stroke();
  // kerah V kecil
  c.fillStyle=PAL.coatS;c.beginPath();c.moveTo(-6,-59);c.lineTo(0,-53);c.lineTo(-8.5,-55);c.closePath();c.fill();
  c.beginPath();c.moveTo(6,-59);c.lineTo(0,-53);c.lineTo(8.5,-55);c.closePath();c.fill();
  // lengan depan: puffed bahu -> ramping, tangan keluar
  const fx=8.3+sw*3.5;
  c.fillStyle=PAL.coat;c.beginPath();
  c.moveTo(7.5,-53);c.quadraticCurveTo(12,-47,fx+2.2,-36);c.lineTo(fx-2.2,-34);c.quadraticCurveTo(8,-45,3.5,-51.5);c.closePath();c.fill();
  outline(c,2);c.beginPath();c.moveTo(7.5,-53);c.quadraticCurveTo(12,-47,fx+2.2,-36);c.lineTo(fx-2.2,-34);c.quadraticCurveTo(8,-45,3.5,-51.5);c.closePath();c.stroke();
  c.fillStyle=PAL.skin;c.beginPath();c.arc(fx,-32.4,3,0,TAU);c.fill();outline(c,1.6);c.stroke();
  if(opt.vial){ // vial serum biru (ending)
    c.save();c.translate(fx,-30.2);
    c.fillStyle=PAL.vialB;c.shadowColor=PAL.vialB;c.shadowBlur=10;rr(c,-2.6,-7,5.2,10,2.4);c.fill();c.shadowBlur=0;outline(c,1.4);rr(c,-2.6,-7,5.2,10,2.4);c.stroke();c.restore();}
  // kepala
  c.save();c.translate(0,-59);c.rotate(moving?Math.sin(phase)*.02:Math.sin(t*1.6)*.012);
  // wajah
  c.fillStyle=PAL.skin;c.beginPath();c.ellipse(0,-5.5,15.5,14.5,0,0,TAU);c.fill();outline(c,2.4);c.stroke();
  // poni: belah tengah jelas — dua tirai rambut turun dari puncak tengah (referensi)
  c.fillStyle=PAL.hairE;c.beginPath();
  c.moveTo(-15.5,-6);
  c.quadraticCurveTo(-15,-20,-7,-21.5);
  c.quadraticCurveTo(-3,-19,-1.2,-13.2);
  c.lineTo(-1.2,-12.2);
  c.quadraticCurveTo(-4,-13.4,-8,-13);
  c.quadraticCurveTo(-13,-12,-15.5,-6);
  c.closePath();c.fill();outline(c,2);c.stroke();
  c.beginPath();
  c.moveTo(15.5,-6);
  c.quadraticCurveTo(15,-20,7,-21.5);
  c.quadraticCurveTo(3,-19,1.2,-13.2);
  c.lineTo(1.2,-12.2);
  c.quadraticCurveTo(4,-13.4,8,-13);
  c.quadraticCurveTo(13,-12,15.5,-6);
  c.closePath();c.fill();outline(c,2);c.stroke();
  c.fillStyle='rgba(255,252,240,.3)';c.beginPath();c.ellipse(-5,-16,5.5,1.8,-.2,0,TAU);c.fill(); // kilau lembut atas kepala
  // bayangan lembut bawah poni di dahi
  c.fillStyle='rgba(160,120,100,.14)';c.beginPath();c.ellipse(0,-10.6,10,1.8,0,0,TAU);c.fill();
  // side lock kurva S sampai rahang
  c.fillStyle=PAL.hairE;
  c.beginPath();c.moveTo(-15,-10);c.quadraticCurveTo(-18.5,-2,-15.5,7);c.quadraticCurveTo(-13.5,11.5,-12,7.5);c.quadraticCurveTo(-14.5,0,-13,-8);c.closePath();c.fill();outline(c,2);c.stroke();
  c.beginPath();c.moveTo(15,-10);c.quadraticCurveTo(18.5,-2,15.5,7);c.quadraticCurveTo(13.5,11.5,12,7.5);c.quadraticCurveTo(14.5,0,13,-8);c.closePath();c.fill();outline(c,2);c.stroke();
  c.save();c.translate(0,-5.5);c.scale(.8,.8);
  drawFace(c,expr,(T%3.7)<.12,t,PAL.eye,(expr==='warm'||expr==='happy')?true:'soft',PAL.browE);
  c.restore();
  c.restore();
  c.restore();
}

/* --- ARTHUR (muda 1944 / dewasa 1968 / buron / tua 1999) --- */
function drawArthur(c,kind,t,expr='neutral',opt={}){
  if(drawCharSheet(c,'arthur_'+kind,expr,0,false,opt))return;
  const tremble=(kind==='muda'||opt.tremble)?Math.sin(t*31)*.9:0;
  const bob=Math.sin(t*1.7)*.8;const old=kind==='tua';
  c.save();c.translate(tremble,-bob+(old?2:0));
  if(old){c.rotate(-.06);} // bungkuk
  // kaki
  c.strokeStyle=old?PAL.pants:(kind==='muda'?PAL.uniOliveS:PAL.pants);c.lineWidth=7;c.lineCap='round';
  c.beginPath();c.moveTo(-4,-24);c.lineTo(-4.6,-4);c.moveTo(4,-24);c.lineTo(4.6,-4);c.stroke();outline(c,1.5);c.beginPath();c.moveTo(-4,-24);c.lineTo(-4.6,-4);c.moveTo(4,-24);c.lineTo(4.6,-4);c.stroke();
  c.fillStyle='#3A3430';[[-4.6],[4.6]].forEach(([lx])=>{rr(c,lx-5.4,-7,10.8,7.6,2.6);c.fill();outline(c,1.6);rr(c,lx-5.4,-7,10.8,7.6,2.6);c.stroke();});
  if(kind==='muda'){c.strokeStyle='#7d6a4d';c.lineWidth=1.2;[-4.6,4.6].forEach(lx=>{c.beginPath();c.moveTo(lx-3,-14);c.lineTo(lx+3,-14);c.moveTo(lx-3,-10.6);c.lineTo(lx+3,-10.6);c.stroke();});}
  // badan
  const bodyCol=kind==='muda'?PAL.uniOlive:kind==='buron'?PAL.jacket:kind==='tua'?PAL.cardigan:PAL.coat;
  const bodyS  =kind==='muda'?PAL.uniOliveS:kind==='buron'?'#57462f':kind==='tua'?'#8E8168':PAL.coatS;
  c.fillStyle=bodyCol;rr(c,-11,-55,22,32,6);c.fill();outline(c,2.8);rr(c,-11,-55,22,32,6);c.stroke();
  c.fillStyle=bodyS;rr(c,2,-55,9,32,6);c.fill();
  if(kind==='dewasa'){c.fillStyle=PAL.labBlue;c.beginPath();c.moveTo(-3.6,-53);c.lineTo(3.6,-53);c.lineTo(3,-25);c.lineTo(-3,-25);c.closePath();c.fill();}
  if(kind==='tua'){c.fillStyle=PAL.shirtOld;c.beginPath();c.moveTo(-4,-53);c.lineTo(4,-53);c.lineTo(3,-25);c.lineTo(-3,-25);c.closePath();c.fill();}
  if(kind==='buron'){c.strokeStyle='#4a3b26';c.lineWidth=2.4;c.beginPath();c.moveTo(-9,-52);c.lineTo(9,-40);c.stroke();} // tali satchel
  // lengan belakang
  limb(c,-8,-50,-11,-35,5.6,bodyS);
  // detail lengan
  if(kind==='muda'){ // ban lengan medic palang merah
    c.save();c.translate(-10.4,-41);c.fillStyle='#FFF';rr(c,-4.6,-4,9.2,8,2);c.fill();outline(c,1.6);rr(c,-4.6,-4,9.2,8,2);c.stroke();c.fillStyle='#C23B3B';c.fillRect(-1.2,-3.4,2.4,6.8);c.fillRect(-3.4,-1.2,6.8,2.4);c.restore();}
  // lengan depan + tangan
  const armX=old?4:9;
  if(old){ // tongkat
    limb(c,8,-50,12,-38,5.6,PAL.cardigan);
    c.strokeStyle=PAL.cane;c.lineWidth=3.4;c.beginPath();c.moveTo(12,-38);c.lineTo(14,0);c.stroke();outline(c,1.4);c.beginPath();c.moveTo(12,-38);c.lineTo(14,0);c.stroke();}
  else if(kind==='muda'){ // memegang tabung racun (gemetar)
    limb(c,8,-50,7,-37,5.6,bodyCol);
    c.fillStyle=PAL.skin;c.beginPath();c.arc(7,-36,3,0,TAU);c.fill();outline(c,1.4);c.stroke();
    c.save();c.translate(9,-40);
    c.fillStyle='rgba(159,230,112,.18)';c.beginPath();c.arc(0,3,13,0,TAU);c.fill();
    c.fillStyle=PAL.vialG;c.shadowColor=PAL.vialG;c.shadowBlur=9;rr(c,-3,-9,6,12,2.6);c.fill();c.shadowBlur=0;outline(c,1.5);rr(c,-3,-9,6,12,2.6);c.stroke();
    c.fillStyle='#FFF';c.beginPath();c.arc(-1,-4,1.1,0,TAU);c.fill();c.restore();}
  else{const ax2=10+Math.sin(t*1.6)*1.4;limb(c,8,-50,ax2,-36,5.6,bodyCol);c.fillStyle=PAL.skin;c.beginPath();c.arc(ax2,-35,3,0,TAU);c.fill();outline(c,1.4);c.stroke();}
  // kepala
  c.save();c.translate(old?4:0,-56);if(old)c.rotate(.05);
  c.fillStyle=PAL.skin;c.beginPath();c.ellipse(0,-6,17,16,0,0,TAU);c.fill();outline(c,2.8);c.stroke();
  // rambut per kind
  if(kind==='muda'){c.fillStyle=PAL.hairA;c.beginPath();c.moveTo(-17,-9);c.quadraticCurveTo(-15,-24,0,-23.4);c.quadraticCurveTo(15,-24,17,-9);c.quadraticCurveTo(8,-17,0,-16.4);c.quadraticCurveTo(-8,-17,-17,-9);c.closePath();c.fill();outline(c,2);c.stroke();
    // helm baja
    c.fillStyle=PAL.helmet;c.beginPath();c.arc(0,-13,17.6,Math.PI*1.02,Math.PI*1.98);c.closePath();c.fill();outline();c.beginPath();c.arc(0,-13,17.6,Math.PI*1.02,Math.PI*1.98);c.closePath();c.stroke();
    c.fillStyle=PAL.helmetS;rr(c,-18.4,-14.4,36.8,3.4,1.6);c.fill();
    c.strokeStyle='#4c4a42';c.lineWidth=1.6;c.beginPath();c.moveTo(-15,-8);c.quadraticCurveTo(-13,2,-9,6);c.stroke();}
  else if(old){c.fillStyle=PAL.gray;c.beginPath();c.arc(0,-6,17,Math.PI*.94,Math.PI*2.06);c.closePath();c.fill();outline(c,2);c.stroke();
    c.fillStyle='#C9C4B8';c.beginPath();c.ellipse(-14,-4,3.6,7,0,0,TAU);c.ellipse(14,-4,3.6,7,0,0,TAU);c.fill();outline(c,1.6);c.beginPath();c.ellipse(-14,-4,3.6,7,0,0,TAU);c.ellipse(14,-4,3.6,7,0,0,TAU);c.stroke();
    // brew putih tebal
    c.strokeStyle='#EDEBE4';c.lineWidth=3;c.beginPath();c.moveTo(-11,-14);c.lineTo(-3.4,-13.4);c.moveTo(3.4,-13.4);c.lineTo(11,-14);c.stroke();}
  else{const messy=kind==='buron';c.fillStyle=kind==='buron'?'#5d452c':PAL.hairA;
    c.beginPath();c.moveTo(-17,-8);c.quadraticCurveTo(-16,-24,0,-23.6);c.quadraticCurveTo(16,-24,17,-8);
    if(messy){c.lineTo(13,-13);c.lineTo(10,-9);c.lineTo(5,-14);c.lineTo(0,-10);c.lineTo(-5,-14);c.lineTo(-10,-9);c.lineTo(-13,-13);}
    else c.quadraticCurveTo(8,-17.6,0,-17);c.quadraticCurveTo(-8,-17.6,-17,-8);c.closePath();c.fill();outline(c,2);c.stroke();
    if(kind==='buron'){c.fillStyle='rgba(90,66,44,.5)';c.beginPath();c.ellipse(0,6.4,10,4.4,0,0,TAU);c.fill();}}
  c.save();c.translate(0,-6);drawFace(c,expr,(T%4.3)<.12,t);
  // kacamata (ilmuwan resmi)
  if(kind==='dewasa'){c.strokeStyle='#33302B';c.lineWidth=1.8;c.beginPath();c.arc(-7,0,5.4,0,TAU);c.moveTo(-1.8,0);c.stroke();c.beginPath();c.arc(7,0,5.4,0,TAU);c.moveTo(-1.6,-1);c.lineTo(-1.6,1);c.stroke();
    c.fillStyle='rgba(255,255,255,.28)';c.beginPath();c.arc(-7,0,5,0,TAU);c.arc(7,0,5,0,TAU);c.fill();}
  c.restore();
  c.restore();c.restore();
}

