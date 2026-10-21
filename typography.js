/* Shared, opt-in typography for news / write / side. No storage key migration. */
window.BookTypesetting = (() => {
  'use strict';
  const config = {
    news: {card:'#news-card', body:'.cols', text:'article', title:'title'},
    write: {card:'#story-card', body:'[data-edit="writerBody"]', text:'writerText', title:'writerTitle'},
    side: {card:'#sideproject-card', body:'#sideWriter', text:'sideArticle', title:'sideSection'}
  };
  const fonts = {
    engraved:{family:'BookEngraved',name:'古籍雕版字体',actual:'汇文明朝体·简体可调版'},
    song:{family:'BookSong',name:'传统书籍宋体',actual:'Noto Serif SC'}
  };
  let observer, mounting=false, restoring=false;
  const normalized = text => String(text||'').replace(/\r\n?/g,'\n').replace(/\n{3,}/g,'\n\n').trim();
  function setting(tab=state.tab) {
    const value=Object.assign({titleFont:'engraved',bodyFont:'song',bodyWeight:400,titleWeight:400,layout:'original'},(state.typography||{})[tab]);
    // Earlier explicit font choices continue to select the corresponding traditional style.
    if(value.titleFont==='xiaowei')value.titleFont='engraved';
    if(value.bodyFont==='xiaowei')value.bodyFont='engraved';
    if(value.layout==='paper'||value.layout==='white')value.layout='book';
    return value;
  }
  function active() {
    for(const [tab,c] of Object.entries(config)){
      const card=document.querySelector(c.card);
      if(card)return {tab,c,card,body:card.querySelector(c.body)};
    }
    return null;
  }
  function safeHTML(html) {
    const template=document.createElement('template');template.innerHTML=html||'';
    template.content.querySelectorAll('script,iframe,object,embed,link,meta,style').forEach(e=>e.remove());
    template.content.querySelectorAll('*').forEach(e=>{
      Array.from(e.attributes).forEach(a=>{
        if(/^on/i.test(a.name)||a.name==='srcdoc'||(/^(href|src|xlink:href)$/i.test(a.name)&&/^\s*javascript:/i.test(a.value)))e.removeAttribute(a.name);
      });
    });
    return template.innerHTML;
  }
  function source(body,tab) {
    if(tab==='side')return body.innerHTML;
    return serializeContent(body);
  }
  function capture(force=false) {
    if(mounting||restoring)return;
    const a=active();if(!a||!a.body)return;
    const text=source(a.body,a.tab);
    // A textarea updates state before its DOM preview. Never capture that stale preview.
    if(!force && a.tab!=='side' && normalized(text)!==normalized(state[a.c.text]))return;
    if(force)state[a.c.text]=text;
    if(a.tab==='side'){state.sideArticle=safeHTML(a.body.innerHTML);return;}
    state.typographyDocuments=Object.assign({},state.typographyDocuments,{
      [a.tab]:{html:safeHTML(a.body.innerHTML),source:state[a.c.text]}
    });
  }
  function restore() {
    const a=active();if(!a||!a.body)return;
    const rich=(state.typographyDocuments||{})[a.tab];
    if(rich && rich.source===state[a.c.text]){
      restoring=true;a.body.innerHTML=safeHTML(rich.html);restoring=false;
    }
    // Rich lists, images and paragraphs remain editable in the news body as well.
    if(a.tab==='news' && (rich || setting().layout!=='original'))a.body.contentEditable='true';
  }
  function options(value) {
    return Object.entries(fonts).map(([key,font])=>`<option value="${key}" ${value===key?'selected':''}>${font.name}</option>`).join('');
  }
  function weightOptions(font,value) {
    const levels=font==='song'?[[200,'纤细'],[400,'常规'],[500,'中等'],[700,'粗体'],[900,'特粗']]:[[200,'细'],[300,'较细'],[400,'原版'],[500,'略粗'],[600,'中粗'],[700,'粗'],[900,'特粗']];
    const selected=levels.some(([n])=>n===Number(value))?Number(value):400;
    return levels.map(([n,label])=>`<option value="${n}" ${n===selected?'selected':''}>${label}${font==='song'?' · '+n:''}</option>`).join('');
  }
  function selectWeight(scope,value) {
    if(!['body','title'].includes(scope))return;
    const font=setting()[scope+'Font'];
    const allowed=font==='song'?[200,400,500,700,900]:[200,300,400,500,600,700,900];
    if(!allowed.includes(Number(value)))return;
    capture(true);pushHistory();
    patch({[scope+'Weight']:Number(value),[scope+'Font']:font});save();render();
  }
  function controls() {
    const s=setting(),chosen=(state.typography||{})[state.tab];
    return `<b>字体与一键排版</b>
      <label class="label">字体选择<select id="bookFontSelect" onchange="BookTypesetting.selectFont(this.value)">${!chosen?'<option value="" selected disabled>保持原有字体 · 请选择</option>':''}${options(!chosen?'':s.bodyFont)}</select></label>
      <label class="label">正文字重／笔画粗细<select id="bookBodyWeight" onchange="BookTypesetting.selectWeight('body',this.value)">${weightOptions(s.bodyFont,s.bodyWeight)}</select></label>
      <p class="note">${s.bodyFont==='song'?'宋体使用字库自带的真实字重。':'古籍字体支持收细和加粗；使用简体字形，原版为400。'}</p>
      <button class="panel-btn book-format-button" onclick="BookTypesetting.formatCurrent()">一键排版</button>
      <button class="panel-btn dark" onclick="BookTypesetting.original()">恢复原有版式</button>
      <button class="panel-btn dark" onclick="BookTypesetting.downloadReading()">保存阅读页</button>
      <p class="note" id="bookFontStatus" aria-live="polite">${chosen?'字体将在编辑区域加载':'未选择时，保留原有字体与设置。'}</p>
      <details class="book-details"><summary>标题字体与全文粘贴</summary>
        <label class="label">标题字体<select id="bookTitleFont" onchange="BookTypesetting.selectTitle(this.value)">${options(s.titleFont)}</select></label>
        <label class="label">标题字重／笔画粗细<select id="bookTitleWeight" onchange="BookTypesetting.selectWeight('title',this.value)">${weightOptions(s.titleFont,s.titleWeight)}</select></label>
        <p class="note">标题、正文可分别选择两种字体。一键排版保留当前选择。</p>
        <label class="label">粘贴全文<textarea id="referenceImport" class="reference-import" placeholder="粘贴后点击应用全文；当前内容不会因误粘贴立即被替换。"></textarea></label>
        <label class="note"><input id="referenceFirstTitle" type="checkbox" checked> 首个段落作为标题</label>
        <button class="panel-btn dark" onclick="importReferenceText()">应用全文</button>
      </details>`;
  }
  function patch(value) {
    state.typography=Object.assign({},state.typography,{[state.tab]:Object.assign({},(state.typography||{})[state.tab],value)});
  }
  async function loadedFont(key) {
    if(!document.fonts)throw Error('浏览器不支持网页字体，请更新浏览器');
    const f=fonts[key]||fonts.song;
    const loaded=await document.fonts.load(`400 24px ${f.family}`,'第一个进入拉萨的欧洲女性，。！？门阅读');
    if(!loaded.length||loaded.some(face=>face.status!=='loaded'))throw Error(`${f.actual} 加载失败，请检查网络后重试`);
    return f;
  }
  async function updateStatus() {
    const a=active();if(!a)return;
    const chosen=(state.typography||{})[a.tab];
    if(!chosen && setting().layout==='original')return;
    const status=document.getElementById('bookFontStatus'),tab=a.tab;
    if(status)status.textContent='正在加载字体…';
    try {
      const s=setting();
      await Promise.all([loadedFont(s.bodyFont),loadedFont(s.titleFont)]);
      if(state.tab!==tab)return;
      if(status)status.textContent=`正文：${fonts[s.bodyFont].actual} · 标题：${fonts[s.titleFont].actual} · 已加载`;
    }catch(error){if(status&&state.tab===tab)status.textContent=error.message;}
  }
  function selectFont(value) {
    if(!fonts[value])return;
    capture(true);pushHistory();patch({bodyFont:value,titleFont:value,bodyWeight:400,titleWeight:400});save();render();
  }
  function selectTitle(value) {
    if(!fonts[value])return;
    capture(true);pushHistory();patch({titleFont:value,titleWeight:400});save();render();
  }
  function cleanBody(body) {
    const walker=document.createTreeWalker(body,NodeFilter.SHOW_TEXT);
    const texts=[];while(walker.nextNode())texts.push(walker.currentNode);
    texts.forEach(node=>{
      if(node.parentElement.closest('pre,code'))return;
      node.nodeValue=node.nodeValue.replace(/[\u200b\ufeff]/g,'').replace(/[ \t\u00a0\u3000]{2,}/g,' ').replace(/\n[ \t]*\n(?:[ \t]*\n)+/g,'\n\n');
    });
    body.querySelectorAll('*').forEach(el=>{
      // Keep semantic weight, images, links, captions and list structure.
      ['font-family','font-size','letter-spacing','word-spacing','line-height','text-indent','white-space','width','min-width','max-width','height','position','left','right','transform'].forEach(p=>el.style.removeProperty(p));
      if(!el.getAttribute('style'))el.removeAttribute('style');
    });
    body.querySelectorAll('p,div').forEach(el=>{
      if(!el.textContent.trim()&&!el.querySelector('img,video,audio,svg,canvas,hr,table,ul,ol,input'))el.remove();
    });
    Array.from(body.childNodes).forEach(node=>{
      if(node.nodeType===3 && node.textContent.trim()){
        const fragments=node.textContent.split(/\n\s*\n|\n/).filter(t=>t.trim());
        const fragment=document.createDocumentFragment();
        fragments.forEach(text=>{const p=document.createElement('p');p.textContent=text.trim();fragment.appendChild(p);});
        node.replaceWith(fragment);
      }
    });
  }
  function formatCurrent() {
    const a=active();if(!a||!a.body)return;
    capture(true);pushHistory();
    cleanBody(a.body);
    patch({layout:'book'}); // Never change either selected font here.
    capture(true);save();render();showToast('已按书籍格式排版，可返回上一步');
  }
  function original() {
    capture(true);pushHistory();
    const next=Object.assign({},state.typography);delete next[state.tab];state.typography=next;
    save();render();showToast('已恢复原有字体与版式，正文内容保留');
  }
  async function downloadReading() {
    const a=active();if(!a)return;
    capture(true);save();
    const s=setting();
    try { await Promise.all([loadedFont(s.bodyFont),loadedFont(s.titleFont)]); }
    catch(error){showToast(error.message);return;}
    const clone=a.card.cloneNode(true);
    clone.querySelectorAll('.hero.empty,.hero-del,input[type="file"]').forEach(el=>el.remove());
    clone.querySelectorAll('[contenteditable]').forEach(el=>el.removeAttribute('contenteditable'));
    clone.querySelectorAll('img').forEach(img=>{if(img.getAttribute('src'))img.src=new URL(img.getAttribute('src'),location.href).href;});
    const base='https://hehxxbdsjszjs.github.io/wuqiangzhimen-newsroom/';
    let bookCSS;
    try {
      const response=await fetch(new URL('typography.css',location.href));
      if(!response.ok)throw Error('排版样式读取失败');
      bookCSS=(await response.text()).replace(/url\((['"]?)(fonts\/[^)'"]+)\1\)/g,(_,q,file)=>'url("'+base+file+'")');
    }catch(error){showToast('阅读页保存失败：'+error.message);return;}
    const legacy=Array.from(document.querySelectorAll('head style')).map(el=>el.textContent).join('\n');
    const title=a.card.querySelector('h1').textContent;
    const escaped=title.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    const page='<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+escaped+'</title><style>'+legacy+'</style><style data-book-typesetting="v23">'+bookCSS+'</style><style>:root{'+document.documentElement.style.cssText+'}body{margin:0}.edit{border-color:transparent!important;background:transparent!important;box-shadow:none!important}article{margin-inline:auto!important}</style><body>'+safeHTML(clone.outerHTML)+'</body></html>';
    const url=URL.createObjectURL(new Blob([page],{type:'text/html;charset=utf-8'}));
    const link=document.createElement('a');link.href=url;link.download=(title.replace(/[\\/:*?"<>|]/g,'').slice(0,60)||'无墙之门')+'.html';link.click();
    setTimeout(()=>URL.revokeObjectURL(url),10000);showToast('阅读页已保存，字体选择与内容保留');
  }
  function decorate() {
    const a=active();if(!a||!a.body)return;
    const s=setting(a.tab),chosen=(state.typography||{})[a.tab]||{};
    a.card.classList.toggle('custom-title-font',!!chosen.titleFont);
    a.card.classList.toggle('custom-body-font',!!chosen.bodyFont);
    a.card.classList.toggle('reference-card',s.layout==='book');
    a.card.dataset.layout=s.layout;
    a.card.style.setProperty('--reading-font',`${fonts[s.bodyFont].family}, BookSong, serif`);
    a.card.style.setProperty('--heading-font',`${fonts[s.titleFont].family}, BookSong, serif`);
    a.card.style.setProperty('--book-size',`${Number(s.bodySize)||28}px`);
    for(const scope of ['body','title']){
      const weight=Number(s[scope+'Weight'])||400;
      a.card.style.setProperty('--'+scope+'-weight',weight);
      a.card.style.setProperty('--'+scope+'-stroke','0px');
      a.card.style.setProperty('--'+scope+'-bold-weight',Math.min(900,weight+300));
      a.card.style.setProperty('--'+scope+'-bold-stroke','0px');
    }
    if(s.layout!=='book')return;
    a.body.querySelectorAll('p').forEach(p=>{
      const t=p.textContent.trim();
      const emphasis=p.querySelector('strong,b');
      const fullEmphasis=!!emphasis && emphasis.textContent.trim()===t;
      p.classList.toggle('reference-heading',t.length<=80 && (fullEmphasis || /^(?:#{1,6}\s+|[一二三四五六七八九十百]+[、.．：:]|[0-9]+[、.．）)]\s*|[（(][一二三四五六七八九十0-9]+[)）])/.test(t)));
    });
    let meta=a.card.querySelector('.reference-meta');
    if(!meta){meta=document.createElement('div');meta.className='reference-meta';meta.setAttribute('aria-live','polite');a.card.querySelector('h1').after(meta);}
    const count=Array.from(a.body.textContent.replace(/\s/g,'')).length;
    const text=`全文${count}字 | 阅读需${Math.max(1,Math.ceil(count/450))}分钟`;
    if(meta.textContent!==text)meta.textContent=text;
  }
  function mount() {
    mounting=true;if(observer)observer.disconnect();
    restore();decorate();mounting=false;
    const a=active();
    observer=new MutationObserver(()=>{if(!mounting)decorate();});
    if(a&&a.body)observer.observe(a.body,{childList:true,subtree:true,characterData:true});
    updateStatus();
  }
  document.addEventListener('input',event=>{
    const a=active();if(!a||!a.body||!a.body.contains(event.target))return;
    capture(true);save();decorate();
  });
  document.addEventListener('focusout',event=>{
    const a=active();if(a&&a.body&&a.body.contains(event.target)){capture(true);save();}
  });
  return {setting,controls,selectFont,selectTitle,selectWeight,formatCurrent,original,downloadReading,capture,restore,mount,decorate,loadedFont,safeHTML,fonts};
})();
