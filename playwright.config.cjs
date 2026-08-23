const {defineConfig}=require('@playwright/test');

module.exports=defineConfig({
  testDir:'./qa',timeout:45_000,fullyParallel:false,workers:1,
  reporter:[['line'],['html',{outputFolder:'qa/artifacts/report',open:'never'}]],
  use:{baseURL:'http://127.0.0.1:8777',viewport:{width:1280,height:720},trace:'retain-on-failure',video:'retain-on-failure',screenshot:'only-on-failure'},
  outputDir:'qa/artifacts/results',
  webServer:{command:'python3 -m http.server 8777',url:'http://127.0.0.1:8777/index.html',reuseExistingServer:!process.env.CI,timeout:15_000},
  projects:[{name:'chromium',use:{browserName:'chromium'}}]
});
