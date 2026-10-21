const {JSDOM,VirtualConsole}=require('jsdom');
const fs=require('fs'),assert=require('node:assert/strict'),path=require('path');
const root=path.resolve(__dirname,'..');
const moduleSource=fs.readFileSync(path.join(root,'typography.js'),'utf8');
let html=fs.readFileSync(path.join(root,'index.html'),'utf8').replace(/<script src="typography.js[^>]*><\/script>/,`<script>${moduleSource.replace(/\$/g,'$$$$')}</script>`);
const logs=[];
async function create(saved){
 const vc=new VirtualConsole();vc.on('jsdomError',e=>{if(!/not implemented/i.test(e.message))logs.push(e.message)});
 const d=new JSDOM(html,{url:'https://example.test/',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){
  w.matchMedia=()=>({matches:false});w.confirm=()=>true;w.document.execCommand=()=>true;
  w.document.fonts={load:async()=>[{status:'loaded'}],ready:Promise.resolve()};
  if(saved)w.localStorage.setItem('wqzm_state',saved);
 }});
 await new Promise(r=>setTimeout(r,20));return d;
}
const fixture=`<p>  正文    第一段，保留<strong>重要观点</strong>。 </p><p><br></p><p>\u3000\u3000第二段。数字 1923–1924，中文标点：《书名》、“引号”、（括号）！？</p><ul><li>列表一<b>粗体</b></li><li>列表二</li></ul><ol start="3"><li>步骤三</li></ol><figure><img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='60'%3E%3Crect width='120' height='60' fill='%23bba577'/%3E%3C/svg%3E" alt="正文图片"><figcaption>图片说明</figcaption></figure><blockquote><p>引用内容</p></blockquote><hr><p><strong>一你没能抵达想要的人生</strong></p><p>最后一段。</p>`;
function signature(body){return ['strong','b','ul','ol','li','figure','img','figcaption','blockquote','hr'].map(s=>[s,body.querySelectorAll(s).length]);}
(async()=>{
 const dom=await create(),w=dom.window,d=w.document;const run=x=>w.eval(x),results=[];
 try{
 assert(!d.querySelector('.reference-card,.custom-title-font,.custom-body-font'));
 assert.equal(d.querySelector('#bookFontSelect').value,'');
 const original={bodySize:run('state.bodySize'),paper:run('state.paper'),cols:run('state.cols'),image:run('state.image')};
 for(const tab of ['news','side','write']){
  run(`state.tab='${tab}';render();isApplyingHistory=false`);
  const body=d.querySelector('.cols,#sideWriter,[data-edit="writerBody"]');body.innerHTML=fixture;
  w.BookTypesetting.capture(true);run('save()');
  const sig=signature(body),text=body.textContent.replace(/\s/g,'');
  assert.equal([...d.querySelector('#bookFontSelect').options].filter(o=>!o.disabled).length,2);
  for(const font of ['engraved','song']){
   w.BookTypesetting.selectFont(font);
   assert.equal(w.BookTypesetting.setting().bodyFont,font);assert.equal(w.BookTypesetting.setting().titleFont,font);
   const now=d.querySelector('.cols,#sideWriter,[data-edit="writerBody"]');assert.deepEqual(signature(now),sig);assert.equal(now.textContent.replace(/\s/g,''),text);
   w.BookTypesetting.formatCurrent();assert(d.querySelector('.reference-card'));
   assert.equal(w.BookTypesetting.setting().bodyFont,font);
   const formatted=d.querySelector('.cols,#sideWriter,[data-edit="writerBody"]');assert.deepEqual(signature(formatted),sig);assert.equal(formatted.textContent.replace(/\s/g,''),text);
   assert(!formatted.querySelector('p').textContent.includes('    '));
   assert(formatted.querySelector('p.reference-heading strong'));
   run('undo();isApplyingHistory=false');assert.equal(w.BookTypesetting.setting().bodyFont,font);
   assert.deepEqual(signature(d.querySelector('.cols,#sideWriter,[data-edit="writerBody"]')),sig);
  }
  w.BookTypesetting.selectTitle('engraved');w.BookTypesetting.formatCurrent();
  assert.equal(w.BookTypesetting.setting().bodyFont,'song');assert.equal(w.BookTypesetting.setting().titleFont,'engraved');
  // Plain-text editing after rich editing intentionally replaces only the current body.
  if(tab!=='side'){
   const key=tab==='news'?'article':'writerText';run(`state.${key}='新的正文';liveUpdate('${key}',state.${key});save();render()`);
   assert.equal(d.querySelector('.cols,[data-edit="writerBody"]').textContent.trim(),'新的正文');
   run(`state.${key}='甲段\\n\\n乙段';liveUpdate('${key}',state.${key});save();render()`);
   const textarea=d.querySelector(`textarea[data-k="${key}"]`);textarea.value='甲段乙段';textarea.dispatchEvent(new w.Event('input',{bubbles:true}));run('render()');
   assert.equal(d.querySelector('.cols,[data-edit="writerBody"]').querySelectorAll('p').length,1);
  }
  const weightedBody=d.querySelector('.cols,[data-edit="writerBody"],#sideWriter');
  weightedBody.insertAdjacentHTML('beforeend','<p style="font-weight:400!important">粘贴的常规正文<span style="font-weight:700">保留加粗</span></p>');
  w.BookTypesetting.decorate();
  assert(weightedBody.querySelector('.book-inline-emphasis'));
  assert.equal(weightedBody.lastElementChild.style.getPropertyPriority('font-weight'),'');
  w.BookTypesetting.selectWeight('title',200);
  assert.equal(w.BookTypesetting.setting().titleWeight,200);
  w.BookTypesetting.selectWeight('title',300);
  assert.equal(w.BookTypesetting.setting().titleWeight,300);
  w.BookTypesetting.selectWeight('body',700);
  assert.equal(w.BookTypesetting.setting().bodyWeight,700);
  w.BookTypesetting.selectWeight('title',600);
  assert.equal(w.BookTypesetting.setting().titleWeight,600);
  w.BookTypesetting.formatCurrent();
  assert.equal(w.BookTypesetting.setting().bodyWeight,700);
  assert.equal(w.BookTypesetting.setting().titleWeight,600);
  assert.equal(d.querySelector('article').style.getPropertyValue('--body-weight'),'700');
  w.BookTypesetting.selectWeight('body',200);
  run('undo()');
  assert.equal(w.BookTypesetting.setting().bodyWeight,700);
  results.push({section:tab,twoFontSwitches:'PASS',formatRetainsSelectedFont:'PASS',richStructure:'PASS',undo:'PASS',independentTitleFont:'PASS'});
 }
 assert.equal(run('state.bodySize'),original.bodySize);assert.equal(run('state.paper'),original.paper);assert.equal(run('state.cols'),original.cols);assert.equal(run('state.image'),original.image);
 const saved=run('JSON.stringify(state)');const lsKey=run('LS_KEY');
 const restored=await create(saved);
 for(const tab of ['news','side','write']){
  restored.window.eval(`state.tab='${tab}';render()`);
  assert.equal(restored.window.BookTypesetting.setting().bodyWeight,700);assert.equal(restored.window.BookTypesetting.setting().titleWeight,600);assert.equal(restored.window.BookTypesetting.setting().bodyFont,'song');assert.equal(restored.window.BookTypesetting.setting().titleFont,'engraved');
 }
 restored.window.close();
 assert(!w.BookTypesetting.safeHTML('<p onclick="bad()">正文</p><script>bad()</script><img src="javascript:bad()">').includes('bad'));
 // A saved reading page retains its own content and font choices, with no editable scripts.
 let exported,downloadName;
 w.fetch=async url=>({ok:true,text:async()=>fs.readFileSync(path.join(root,new URL(url).pathname.split('/').pop()),'utf8')});
 w.URL.createObjectURL=blob=>{exported=blob;return 'blob:test-reading'};
 w.URL.revokeObjectURL=()=>{};
 w.HTMLAnchorElement.prototype.click=function(){downloadName=this.download};
 const finalBody=d.querySelector('[data-edit="writerBody"]');finalBody.innerHTML=fixture;
 w.BookTypesetting.capture(true);run('save()');
 await w.BookTypesetting.downloadReading();
 const page=await new Promise((resolve,reject)=>{const r=new w.FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsText(exported)});
 assert(downloadName.endsWith('.html'));assert(page.includes('data-book-typesetting="v25"'));assert(page.includes('https://hehxxbdsjszjs.github.io/wuqiangzhimen-newsroom/fonts/mobile/engraved-0.woff2'));
 assert(page.includes('BookEngraved'));assert(page.includes('BookSong'));
 assert(page.includes('<strong>'));assert(page.includes('<ul>'));assert(page.includes('正文图片'));
 const readingDOM=new JSDOM(page);assert(!readingDOM.window.document.querySelector('[contenteditable]'));assert(!readingDOM.window.document.querySelector('script'));readingDOM.window.close();
 const originalLoad=w.document.fonts.load;
 w.document.fonts.load=async()=>{throw Error('模拟网络失败')};run('render()');
 await new Promise(resolve=>setTimeout(resolve,0));
 assert(d.querySelector('.book-load-status').textContent.includes('系统字体'));
 assert(d.querySelector('.book-load-status button'));
 w.document.fonts.load=originalLoad;run('render()');
 await new Promise(resolve=>setTimeout(resolve,0));
 assert(d.querySelector('.book-load-status').hidden);
 assert.deepEqual(logs,[]);
 console.log(JSON.stringify({results,localSaveReopen:'PASS',existingSettings:'PASS',safeRichHTML:'PASS',savedReadingPage:'PASS',errors:logs},null,2));
 }finally{dom.window.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
