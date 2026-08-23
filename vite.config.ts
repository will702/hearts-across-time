import {cpSync, statSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {defineConfig} from 'vitest/config';

const root=fileURLToPath(new URL('.',import.meta.url));
const output=resolve(root,'dist');
const legacyDirs=['core','data','game','render','ui'];

function copyLegacyRuntime(){
  cpSync(resolve(root,'assets'),resolve(output,'assets'),{recursive:true});
  cpSync(resolve(root,'vendor'),resolve(output,'vendor'),{recursive:true});
  for(const dir of legacyDirs)cpSync(resolve(root,'src',dir),resolve(output,'src',dir),{
    recursive:true,
    filter:path=>statSync(path).isDirectory()||path.endsWith('.js')
  });
}

export default defineConfig({
  root,
  test:{include:['tests/unit/**/*.test.ts']},
  build:{
    rollupOptions:{
      input:{
        index:resolve(root,'index.html'),
        legacy:resolve(root,'legacy.html')
      }
    }
  },
  plugins:[{name:'copy-legacy-runtime',closeBundle:copyLegacyRuntime}]
});
