const {defineConfig}=require('@playwright/test');

module.exports=defineConfig({
  testDir:'./tests/legacy',timeout:45_000,fullyParallel:false,workers:1,
  reporter:[['line'],['html',{outputFolder:'qa/artifacts/legacy-report',open:'never'}]],
  use:{baseURL:'http://127.0.0.1:8777',viewport:{width:1280,height:720},trace:'retain-on-failure',video:'retain-on-failure',screenshot:'only-on-failure'},
  outputDir:'qa/artifacts/legacy-results',
  webServer:{command:'npm run dev',url:'http://127.0.0.1:8777/legacy/?qa=1',reuseExistingServer:!process.env.CI,timeout:30_000},
  projects:[{name:'chromium',use:{browserName:'chromium'}}]
});
