import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {packageRoot} from '../src/environment.mjs';
if(process.platform!=='win32')throw Error('Windows-only smoke');
const r=spawnSync(process.execPath,['--test','test/environment.test.mjs'],{cwd:packageRoot,encoding:'utf8',timeout:120000});
process.stdout.write(r.stdout);process.stderr.write(r.stderr);if(r.status!==0)process.exit(r.status||1);
const cli=path.join(packageRoot,'bin/agent-workbench.mjs');
const home=fs.mkdtempSync(path.join(os.tmpdir(),'workbench-packed-smoke-'));
for(const args of [['install','--home',home,'--yes'],['doctor','--home',home,'--json'],['rollback','--home',home,'--yes']]){
 const p=spawnSync(process.execPath,[cli,...args],{encoding:'utf8',timeout:30000});
 const data=JSON.parse(p.stdout);process.stdout.write(JSON.stringify({operation:args[0],ok:data.ok,version:data.version,warnings:data.warnings})+'\n');if(p.status!==0)process.exit(p.status||1);
}
fs.rmSync(home,{recursive:true,force:true});
