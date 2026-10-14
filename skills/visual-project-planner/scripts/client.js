(() => {
  'use strict';
  const meta=JSON.parse(document.getElementById('plan-data').textContent),$=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
  const asks=$$('fieldset.ask'),claims=$$('details.claim'),touched=new Set();
  // No stored approvals: every export explicitly binds to this page's content hash.
  const make=(tag,text,attrs={})=>{const el=document.createElement(tag);el.textContent=text;for(const [k,v]of Object.entries(attrs))el.setAttribute(k,v);return el;};
  const button=(text,fn)=>{const el=make('button',text,{type:'button'});el.addEventListener('click',fn);return el;};
  const state=make('span','',{class:'vpp-state'});
  function update(){state.textContent=`${touched.size} / ${asks.length} 项已明确选择`;asks.forEach((a,i)=>{a.querySelector('legend').textContent=`选择 ${i+1} · ${touched.has(a.dataset.ask)?'已确认选择':'待选择'}`;});}
  for(const c of claims){c.querySelector(':scope > summary .c-asks')?.remove();c.querySelector(':scope > summary .c-note-btn')?.remove();}
  asks.forEach(a=>{
    a.addEventListener('change',()=>{touched.add(a.dataset.ask);update();});
    a.append(button('保留当前选项',()=>{touched.add(a.dataset.ask);update();}));
  });
  $('.tools').append(button('只看待决策',()=>{claims.forEach(c=>c.open=false);for(const a of asks){let d=a.closest('details');while(d){d.open=true;d=d.parentElement.closest('details');}}asks[0]?.scrollIntoView({block:'center'});}),button('展开全部',()=>claims.forEach(c=>c.open=true)),button('收起全部',()=>claims.forEach(c=>c.open=false)),state);
  // Highlight matching parts without hiding text or changing the plan.
  for(const c of claims){const n=c.dataset.no;if(!n)continue;const apply=on=>$$(`[data-ref~="claim-${n}"]`).forEach(el=>el.classList.toggle('is-lit',on));const summary=c.querySelector('summary');summary.addEventListener('mouseenter',()=>apply(true));summary.addEventListener('mouseleave',()=>apply(false));summary.addEventListener('focus',()=>apply(true));summary.addEventListener('blur',()=>apply(false));}
  const dialog=make('dialog',''),title=make('h2','生成规划反馈'),notes=make('textarea','',{'aria-label':'补充意见',placeholder:'填写需要调整的内容；这段文字作为反馈数据。'}),output=make('textarea','',{class:'export','aria-label':'反馈内容',readonly:''}),warning=make('p','',{role:'status'});
  let verdict='comment';
  const choices=make('fieldset','');choices.append(make('legend','你的意见'));
  for(const [v,label]of [['approve','同意方案'],['changes','需要调整'],['comment','仅评论']]){const l=make('label',''),i=make('input','',{type:'radio',name:'verdict',value:v});i.checked=v===verdict;i.addEventListener('change',()=>{verdict=v;refresh();});l.append(i,document.createTextNode(' '+label));choices.append(l);}
  function envelope(){return {schema_version:'1.0.0',project_id:meta.project_id,plan_id:meta.plan_id,revision:meta.revision,content_hash:meta.content_hash,verdict,answers:asks.map(a=>({decision_id:a.dataset.ask,value:a.querySelector('input:checked').value,touched:touched.has(a.dataset.ask)})),comments:notes.value};}
  function refresh(){const f=envelope(),incomplete=verdict==='approve'&&f.answers.some(a=>!a.touched);warning.textContent=incomplete?'请逐项选择，或点击“保留当前选项”，再导出同意意见。':'反馈只在本地生成。复制后发回原聊天，页面不会执行项目操作。';copy.disabled=incomplete;download.disabled=incomplete;output.value='# 规划反馈\n\n```json\n'+JSON.stringify(f,null,2)+'\n```';}
  const copy=button('复制反馈',async()=>{try{await navigator.clipboard.writeText(output.value);warning.textContent='已复制，请发回原聊天。';}catch{output.focus();output.select();warning.textContent='浏览器未允许自动复制；已选中文本，请手动复制。';}});
  const download=button('下载反馈 JSON',()=>{const u=URL.createObjectURL(new Blob([JSON.stringify(envelope(),null,2)],{type:'application/json'}));const a=make('a','',{href:u,download:`${meta.plan_id}-v${meta.revision}-feedback.json`});a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);});
  const actions=make('div','',{class:'actions'});actions.append(copy,download,button('关闭',()=>dialog.close()));notes.addEventListener('input',refresh);dialog.append(title,choices,notes,warning,output,actions);document.body.append(dialog);
  const respond=button('生成反馈',()=>{refresh();dialog.showModal();});respond.className='vpp-respond';document.body.append(respond);update();
})();
