import {defineConfig} from '@playwright/test';

const production=process.env.PLAYWRIGHT_TEST_PRODUCTION==='1';
const chromiumOptions=process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH}:{};

// WebKit is a Playwright engine build, never a Safari-device result.
export default defineConfig({
 testDir:'./tests/browser',testMatch:'**/*.spec.mjs',testIgnore:production?'**/native.spec.mjs':undefined,timeout:90000,
 expect:{timeout:20000},fullyParallel:false,workers:1,retries:0,
 outputDir:'test-results',
 reporter:[['list'],['json',{outputFile:process.env.PLAYWRIGHT_JSON_OUTPUT_FILE||'test-results/results.json'}]],
 use:{baseURL:process.env.PLAYWRIGHT_BASE_URL||'http://127.0.0.1:4186',
  viewport:{width:1280,height:900},trace:'retain-on-failure',screenshot:'only-on-failure'},
 webServer:process.env.PLAYWRIGHT_BASE_URL?undefined:{command:production?'node node_modules/vite/bin/vite.js preview --host 127.0.0.1 --port 4186 --strictPort':'node tests/browser/server.mjs',url:'http://127.0.0.1:4186',reuseExistingServer:!process.env.CI,timeout:60000},
 projects:[
  {name:'chromium',use:{browserName:'chromium',launchOptions:chromiumOptions}},
  {name:'chromium-touch',use:{browserName:'chromium',launchOptions:chromiumOptions,viewport:{width:390,height:844},isMobile:true,hasTouch:true}},
  {name:'chrome',use:{browserName:'chromium',channel:'chrome'}},
  {name:'edge',use:{browserName:'chromium',channel:'msedge'}},
  {name:'firefox',use:{browserName:'firefox'}},
  {name:'webkit',use:{browserName:'webkit'}},
  {name:'edge-native-branch',use:{browserName:'chromium',channel:'msedge'}},
  {name:'edge-touch',use:{browserName:'chromium',channel:'msedge',viewport:{width:390,height:844},isMobile:true,hasTouch:true}},
  {name:'webkit-touch',use:{browserName:'webkit',viewport:{width:390,height:844},isMobile:true,hasTouch:true}}
 ]
});
