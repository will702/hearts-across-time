const {test,expect}=require('@playwright/test');
const fs=require('node:fs');

const ARTIFACTS='qa/artifacts/frames';
fs.mkdirSync(ARTIFACTS,{recursive:true});

async function openGame(page,save=null){
  const errors=[];
  page.on('pageerror',e=>errors.push('pageerror: '+e.message));
  page.on('console',m=>{if(m.type()==='error')errors.push('console: '+m.text());});
  page.on('requestfailed',r=>errors.push('request: '+r.url()+' '+(r.failure()?.errorText||'')));
  await page.addInitScript(({save})=>{
    let n=0x484154;
    Math.random=()=>{n|=0;n=n+0x6D2B79F5|0;let t=Math.imul(n^n>>>15,1|n);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};
    localStorage.clear();
    localStorage.setItem('hat_opts',JSON.stringify({reduceMotion:true,textSpd:2,vol:0}));
    if(save)localStorage.setItem('hat_save',JSON.stringify(save));
  },{save});
  await page.goto('/legacy.html?qa=1');
  await page.getByRole('button',{name:'LEWATI'}).click();
  await page.waitForFunction(()=>window.__HAT?.qa&&window.__HAT.qa.snapshot().assets.ready);
  return errors;
}

async function snap(page){return page.evaluate(()=>window.__HAT.qa.snapshot());}

test('@smoke boot, title, dan resource browser bersih',async({page})=>{
  const errors=await openGame(page);
  const state=await snap(page),canvas=page.locator('#game');
  expect(state.state).toBe('title');
  await expect(canvas).toHaveAttribute('width','960');
  await expect(canvas).toHaveAttribute('height','540');
  expect(errors).toEqual([]);
});

test('@smoke kontrol, pause, physics, dan snapshot konsisten',async({page})=>{
  const errors=await openGame(page);
  await page.evaluate(()=>window.__HAT.qa.scenario('walk','1944'));
  const before=await snap(page);
  await page.keyboard.down('ArrowRight');await page.waitForTimeout(450);await page.keyboard.up('ArrowRight');
  const moved=await snap(page);
  expect(moved.player.x).toBeGreaterThan(before.player.x);
  await page.keyboard.press('Escape');await expect.poll(async()=>(await snap(page)).paused).toBe(true);
  await page.keyboard.press('Escape');await expect.poll(async()=>(await snap(page)).paused).toBe(false);
  await page.evaluate(()=>window.__HAT.qa.freeze(4));
  const frozen=await snap(page);await page.waitForTimeout(150);
  expect((await snap(page)).t).toBe(frozen.t);
  expect(errors).toEqual([]);
});

test('@smoke save lama dinormalisasi saat Continue',async({page})=>{
  const save={introDone:true,seen:{},chosen:{},endings:{},inspected:{},tutorial:{},game:{era:'1944',S:{inventory:{watch:1},challenges:{}}}};
  const errors=await openGame(page,save);
  await page.keyboard.press('Enter');
  await expect.poll(async()=>(await snap(page)).state).toBe('walk');
  const state=await snap(page);
  expect(state.era).toBe('1944');
  expect(state.run.watchRepaired).toBe(false);
  expect(state.run.inventory.watch).toBeUndefined();
  expect(errors).toEqual([]);
});

test('@visual checkpoint deterministik untuk review AI',async({page})=>{
  const errors=await openGame(page);
  const scenarios=[
    ['title'],['walk','1944'],['dialog','1944'],['challenge','1944'],['watchrepair'],
    ['walk','1968'],['dialog','1968'],['challenge','1968'],['rosepuzzle'],
    ['walk','1999'],['dialog','1999'],['challenge','1999'],['gemalign'],['photopuzzle'],['glitch'],['endcard']
  ];
  for(const [name,era] of scenarios){
    await page.evaluate(({name,era})=>{window.__HAT.qa.scenario(name,era);window.__HAT.qa.freeze(4);},{name,era});
    const state=await snap(page);
    expect(state.state).toBe(name==='dialog'?'dialog':name);
    await page.locator('#game').screenshot({path:`${ARTIFACTS}/${name}${era?'-'+era:''}.png`});
    await test.info().attach(`${name}${era?'-'+era:''}`,{path:`${ARTIFACTS}/${name}${era?'-'+era:''}.png`,contentType:'image/png'});
  }
  expect(errors).toEqual([]);
});
