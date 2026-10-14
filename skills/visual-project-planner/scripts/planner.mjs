#!/usr/bin/env node
import {validate,readJSON,render,difference,feedback,verifyVendor,digest,writeNew,fail} from './core.mjs';
const args=process.argv.slice(2),command=args.shift();
function parse(){const values=[],options={};for(let i=0;i<args.length;i++){if(args[i].startsWith('--')){if(!['--out','--root'].includes(args[i])||!args[i+1]||args[i+1].startsWith('--'))fail('INVALID_ARGUMENT','Unknown or incomplete option');options[args[i].slice(2)]=args[++i];}else values.push(args[i]);}return {values,options};}
try{
  if(!command||['--help','help'].includes(command)){console.log('planner.mjs validate FILE | hash FILE | render FILE --out NEW_DIR [--root ROOT] | revise OLD NEW --out NEW_DIR [--root ROOT] | review-feedback PLAN FEEDBACK | record-approval PLAN FEEDBACK --out NEW_FILE | doctor');process.exit(0);}
  const {values:v,options:o}=parse();let result;
  const counts={validate:1,hash:1,render:1,revise:2,'review-feedback':2,'record-approval':2,doctor:0};
  if(!(command in counts)||v.length!==counts[command])fail('INVALID_ARGUMENT','Wrong command or positional arguments');
  if(['render','revise','record-approval'].includes(command)&&!o.out)fail('INVALID_ARGUMENT','--out required');
  if(command==='doctor')result={node:process.versions.node,vendor:verifyVendor().commit};
  else {const p=validate(readJSON(v[0]));
    if(command==='validate')result={valid:true,content_hash:digest(p)};
    if(command==='hash')result={content_hash:digest(p)};
    if(command==='render')result=await render(p,o.out,o);
    if(command==='revise'){const next=validate(readJSON(v[1]));const delta=difference(p,next);result={...await render(next,o.out,{...o,delta}),delta};}
    if(command==='review-feedback'||command==='record-approval'){
      result=feedback(p,readJSON(v[1]));
      if(command==='record-approval'){
        if(result.feedback.verdict!=='approve'||result.needs_revision)fail('FEEDBACK_INVALID','Revise changed choices before recording approval of this exact source');
        const receipt={schema_version:'1.0.0',project_id:p.project_id,plan_id:p.plan_id,revision:p.revision,content_hash:digest(p),approved_claim_ids:p.claims.map(c=>c.id),feedback:result.feedback,recorded_at:new Date().toISOString(),authorization_scope:'The matching plan only. The caller must verify actual user confirmation in chat.'};
        writeNew(o.out,JSON.stringify(receipt,null,2)+'\n');result={receipt:o.out,content_hash:digest(p),execution_authorized_by_tool:false};
      }
    }
  }
  console.log(JSON.stringify({ok:true,...result},null,2));
}catch(e){console.error(JSON.stringify({ok:false,error:{code:e.code||'OPERATION_FAILED',message:e.message}}));process.exitCode=1;}
