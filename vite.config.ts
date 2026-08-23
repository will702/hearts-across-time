import {cpSync,mkdirSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {defineConfig} from 'vitest/config';
import {STATIC_ASSETS} from './src/game/assetManifest.ts';

const root=fileURLToPath(new URL('.',import.meta.url));
const output=resolve(root,'dist');
function copyNativeAssets(){
  for(const asset of STATIC_ASSETS){
    const destination=resolve(output,asset);
    mkdirSync(dirname(destination),{recursive:true});
    cpSync(resolve(root,asset),destination);
  }
}

export default defineConfig({
  root,
  base:'./',
  test:{include:['tests/unit/**/*.test.ts']},
  build:{
    rollupOptions:{input:resolve(root,'index.html')}
  },
  plugins:[{name:'copy-native-assets',closeBundle:copyNativeAssets}]
});
