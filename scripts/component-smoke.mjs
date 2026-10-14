import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {packageRoot,fresh} from '../src/environment.mjs';
const root=fs.mkdtempSync(path.join(os.tmpdir(),'component-smoke-')),entry=path.join(packageRoot,'bin/agent-workbench.mjs');
const operations=[];
for(const args of [['install','--yes'],['components','install','--name','@petercjl/npm-release-kit','--yes'],['components','run','--name','@petercjl/npm-release-kit','--','version'],['install','--yes'],['status']]){
 const index=args.indexOf('--'),actual=index<0?[...args,'--home',root]:[...args.slice(0,index),'--home',root,...args.slice(index)];
 const r=spawnSync(process.execPath,[entry,...actual],{encoding:'utf8',timeout:300000});
 if(r.status!==0)throw Error(r.stdout+r.stderr);
 const result=JSON.parse(r.stdout);operations.push({operation:args.slice(0,2).join(' '),ok:result.ok??true,version:result.version,componentCount:result.components?.length});
}
const report={ok:true,platform:process.platform,isolatedReceiver:true,operations};
if(process.argv[2])fresh(process.argv[2],JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));fs.rmSync(root,{recursive:true,force:true});
