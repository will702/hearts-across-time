/* ============================================================
   UI DIALOG: bubble 7-Days style + panel narator + pilihan
   ============================================================ */
const WHO={elena:{name:'ELENA',chip:'#A85550'},arthur:{name:'ARTHUR',chip:'#556B7F'},
  muda:{name:'ARTHUR',chip:'#6B7547'},dewasa:{name:'ARTHUR',chip:'#556B7F'},buron:{name:'ARTHUR',chip:'#7E6247'},tua:{name:'ARTHUR TUA',chip:'#77715F'},narrator:{name:'',chip:'#000'}};
function wrap(c,text,maxW){const words=text.split(' ');const lines=[];let cur='';for(const w of words){const test=cur?cur+' '+w:w;if(c.measureText(test).width>maxW&&cur){lines.push(cur);cur=w;}else cur=test;}if(cur)lines.push(cur);return lines;}
function drawBubble(c,x,headY,text,who,prog,nameless,pop=1){
  const ts=OPTS.textScale||1,lh=Math.round(21*ts);
  c.font=Math.round(16.5*ts)+'px '+F_UI;
  const full=who==='narrator'?text:text.slice(0,Math.ceil(text.length*prog));
  const lines=wrap(c,full,340);
  const bw=Math.max(...lines.map(l=>c.measureText(l).width),60)+30, bh=lines.length*lh+18;
  let bx=clamp(x-bw/2,14,W-bw-14), by=headY-bh-30;if(by<54)by=headY+64;
  c.save();
  const s=easeOB(pop);c.translate(bx+bw/2,by+bh/2);c.scale(s,s);c.translate(-(bx+bw/2),-(by+bh/2));
  sketchRR(c,bx,by,bw,bh,7); // balon kata kertas + tinta
  if(who!=='narrator'){ // ekor bubble bergaya goresan pena
    const tx=clamp(x,bx+26,bx+bw-26);
    c.fillStyle=PAPER_COL;c.beginPath();c.moveTo(tx-9,by+bh-1.5);c.lineTo(tx+9,by+bh-1.5);c.lineTo(tx,by+bh+14);c.closePath();c.fill();
    for(let k=0;k<2;k++){c.strokeStyle=k?'rgba(30,23,16,.5)':PAL.line;c.lineWidth=k?1:2;c.lineJoin='round';
      c.beginPath();c.moveTo(tx-9+k,by+bh+(k?-.6:0));c.lineTo(tx+k*1.2,by+bh+13+k);c.lineTo(tx+9+k*1.6,by+bh+(k?.4:0));c.stroke();}
    // label nama — cap tinta miring kecil di tepi atas bubble
    const wd=WHO[who];c.font='bold 12px '+F_UI;const tw2=c.measureText(wd.name).width+16;
    inkTag(c,bx+12,by-9,tw2,19,wd.chip);
    c.fillStyle=PAPER_COL;c.textAlign='center';c.textBaseline='middle';c.fillText(wd.name,bx+12+tw2/2,by+1);c.textBaseline='alphabetic';}
  c.fillStyle='#2B211A';c.textAlign='left';c.textBaseline='top';
  lines.forEach((l,i)=>c.fillText(l,bx+15,by+10+i*lh));
  if(prog<1&&who!=='narrator'){const lx=bx+15+c.measureText(lines[lines.length-1]).width+6;c.fillStyle='#94342E';c.fillRect(lx,by+bh-13,5,8);}
  c.restore();
}
function drawNarr(c,text,prog,pop=1){ // strip caption komik untuk narator
  const ts=OPTS.textScale||1,lh=Math.round(23*ts);
  c.font=Math.round(17.5*ts)+'px '+F_UI;const shown=text.slice(0,Math.ceil(text.length*prog));
  const lines=wrap(c,shown,640);const bh=lines.length*lh+32;const by=H-bh-24,bx=(W-700)/2;
  c.save();
  const s=easeOB(pop);c.translate(W/2,by+bh/2);c.scale(s,s);c.translate(-W/2,-(by+bh/2));
  sketchRR(c,bx,by,700,bh,6);c.restore();
  c.fillStyle='#2B211A';c.textAlign='center';c.textBaseline='top';
  const isBracket=/^\[/.test(shown);
  c.font=(isBracket?'bold ':'')+Math.round((isBracket?18.5:17.5)*ts)+'px '+F_UI;
  if(isBracket)c.fillStyle='#94342E';
  lines.forEach((l,i)=>c.fillText(l,W/2,by+15+i*lh));
}
function drawChoices(c,opts,sel,mx,my,pr=1){ // panel pilihan kertas: opsi tinta, pilihan aktif bergaris spidol merah
  c.font='16px '+F_UI;
  const bw=560,bh=opts.length*58+22;const bx=(W-bw)/2,by=H-bh-24;
  const eob=1+2.70158*Math.pow(pr-1,3)+1.70158*Math.pow(pr-1,2); // pop masuk spring
  c.save();c.globalAlpha=pr;c.translate(bx+bw/2,by+bh/2);c.scale(eob,eob);c.translate(-(bx+bw/2),-(by+bh/2));
  sketchRR(c,bx,by,bw,bh,8);
  opts.forEach((o,i)=>{const oy=by+14+i*58;const hov=mx>bx+10&&mx<bx+bw-10&&my>oy&&my<oy+52;const on=i===sel||hov;
    if(on){c.fillStyle='rgba(148,52,46,.10)';rr(c,bx+8,oy,bw-16,52,6);c.fill();
      c.strokeStyle='#94342E';c.lineWidth=3;c.lineCap='round';
      c.beginPath();c.moveTo(bx+15,oy+9);c.quadraticCurveTo(bx+13,oy+26,bx+15,oy+43);c.stroke(); // gores margin merah
      c.strokeStyle='rgba(148,52,46,.4)';c.lineWidth=1.2;
      c.beginPath();c.moveTo(bx+17.6,oy+10);c.quadraticCurveTo(bx+16,oy+26,bx+17.2,oy+42);c.stroke();}
    c.textAlign='left';c.textBaseline='middle';
    if(o.tag){c.font='bold 11.5px '+F_UI;const tw=c.measureText(o.tag).width+14;
      c.fillStyle=o.tagCol||'#556B7F';rr(c,bx+26,oy+6,tw,17,4);c.fill();
      c.strokeStyle=PAL.line;c.lineWidth=1.2;rr(c,bx+26,oy+6,tw,17,4);c.stroke();
      c.fillStyle=PAPER_COL;c.fillText(o.tag,bx+26+7,oy+15);
      c.font='15px '+F_UI;c.fillStyle='#2B211A';
      const ls=wrap(c,o.label,bw-64);ls.slice(0,2).forEach((l,k)=>c.fillText(l,bx+26,oy+33+k*16));}
    else{c.fillStyle=on?'#94342E':'#2B211A';c.font=(on?'bold ':'')+'16px '+F_UI;c.fillText((on?'▶ ':'  ')+o.label,bx+28,oy+26);}
    if(SAVE.chosen[o.label]){c.font='12px '+F_UI;c.fillStyle='rgba(43,33,26,.55)';c.textAlign='right';c.fillText('⟲ pernah dipilih',bx+bw-16,oy+14);c.textAlign='left';}
    if(on){c.font='12px '+F_UI;c.fillStyle='rgba(43,33,26,.6)';c.textAlign='right';c.fillText('[ENTER]',bx+bw-16,oy+42);c.textAlign='left';}});
  c.restore();c.textBaseline='alphabetic';
}

