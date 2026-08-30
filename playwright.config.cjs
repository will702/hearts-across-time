const {defineConfig}=require('@playwright/test');

module.exports=defineConfig({
  testDir:'./tests/e2e',timeout:30_000,fullyParallel:false,workers:1,
  reporter:[['line'],['html',{outputFolder:'qa/artifacts/report',open:'never'}]],
  use:{
    baseURL:'http://127.0.0.1:8777',viewport:{width:1280,height:720},trace:'retain-on-failure',video:'retain-on-failure',screenshot:'only-on-failure',
    permissions:['camera'],
    launchOptions:{args:['--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream']},
  },
  outputDir:'qa/artifacts/results',
  webServer:{command:'npm run build && npm run preview',url:'http://127.0.0.1:8777',reuseExistingServer:!process.env.CI,timeout:30_000},
  projects:[{name:'chromium',use:{browserName:'chromium'}}]
});
