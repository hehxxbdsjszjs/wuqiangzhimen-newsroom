/* Shared, opt-in typography for news / write / side. No storage key migration. */
window.BookTypesetting = (() => {
  'use strict';
  const config = {
    news: {card:'#news-card', body:'.cols', text:'article', title:'title'},
    write: {card:'#story-card', body:'[data-edit="writerBody"]', text:'writerText', title:'writerTitle'},
    side: {card:'#sideproject-card', body:'#sideWriter', text:'sideArticle', title:'sideSection'}
  };
  const fonts = {
    engraved:{family:'BookEngraved28',name:'古籍雕版字体',actual:'汇文明朝体·简体可调版'},
    song:{family:'BookSong28',name:'传统书籍宋体',actual:'Noto Serif SC'}
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
      <details class="book-details" open><summary>标题位置与文字编辑</summary>
        <label class="label">标题对齐<select onchange="BookTypesetting.editHeader('titleAlign',this.value)">${[['left','居左'],['center','居中'],['right','居右']].map(([v,t])=>`<option value="${v}" ${(s.titleAlign||'left')===v?'selected':''}>${t}</option>`).join('')}</select></label>
        <label class="label">标题左侧位置（%）<input type="number" min="0" max="40" value="${s.titleInset||0}" onchange="BookTypesetting.editHeader('titleInset',this.value)"></label>
        <label class="label">标题上方间距（像素）<input type="number" min="0" max="200" value="${s.titleBefore??26}" onchange="BookTypesetting.editHeader('titleBefore',this.value)"></label>
        <label class="label">标题下方间距（像素）<input type="number" min="0" max="200" value="${s.titleAfter??24}" onchange="BookTypesetting.editHeader('titleAfter',this.value)"></label>
        <button class="panel-btn dark" onclick="BookTypesetting.editHeader('deleteTitle')">删除主标题</button>
        <label class="note"><input type="checkbox" ${s.metaVisible?'checked':''} onchange="BookTypesetting.editHeader('metaVisible',this.checked)"> 显示字数与阅读时间（可直接编辑或删除）</label>
      </details>
      <details class="book-details"><summary>标题字体与全文粘贴</summary>
        <label class="label">标题字体<select id="bookTitleFont" onchange="BookTypesetting.selectTitle(this.value)">${options(s.titleFont)}</select></label>
        <label class="label">标题字重／笔画粗细<select id="bookTitleWeight" onchange="BookTypesetting.selectWeight('title',this.value)">${weightOptions(s.titleFont,s.titleWeight)}</select></label>
        <p class="note">标题、正文可分别选择两种字体。一键排版保留当前选择。</p>
        <label class="label">粘贴全文<textarea id="referenceImport" class="reference-import" placeholder="粘贴后点击应用全文；当前内容不会因误粘贴立即被替换。"></textarea></label>
        <label class="note"><input id="referenceFirstTitle" type="checkbox" checked> 首个段落作为标题</label>
        <button class="panel-btn dark" onclick="importReferenceText()">应用全文</button>
      </details>`;
  }
  function editHeader(key,value) {
    capture(true);pushHistory();
    const a=active();if(!a)return;
    if(key==='deleteTitle'){state[a.c.title]='';if(a.tab==='side')state.sideTitle='';}
    else if(key==='metaVisible'){
      const count=Array.from(a.body.textContent.replace(/\s/g,'')).length;
      patch({metaVisible:!!value,metaText:setting().metaText??`全文${count}字 | 阅读需${Math.max(1,Math.ceil(count/450))}分钟`});
    }else if(key==='titleAlign'&&['left','center','right'].includes(value))patch({titleAlign:value});
    else if(['titleBefore','titleAfter','titleInset'].includes(key))patch({[key]:Math.max(0,Math.min(key==='titleInset'?40:200,Number(value)||0))});
    save();render();
  }
  function patch(value) {
    state.typography=Object.assign({},state.typography,{[state.tab]:Object.assign({},(state.typography||{})[state.tab],value)});
  }
  async function loadedFont(key) {
    if(!document.fonts)throw Error('浏览器不支持网页字体，请更新浏览器');
    const f=fonts[key]||fonts.song;
    const a=active(),s=setting(),chosen=(state.typography||{})[state.tab]||{};let text='无墙之门。';
    if(a){
      const chunks=[];
      if(key===s.bodyFont&&(chosen.bodyFont||s.layout==='book'))chunks.push(a.body.textContent);
      if(key===s.titleFont&&(chosen.titleFont||s.layout==='book'))chunks.push(a.card.querySelector('h1')?.textContent||'');
      if(chunks.length)text=Array.from(new Set(Array.from(chunks.join('')+'0123456789字分钟，。'))).join('');
    }
    const loaded=await document.fonts.load(`400 24px ${f.family}`,text);
    if(!loaded.length||loaded.some(face=>face.status!=='loaded'))throw Error(`${f.actual} 加载失败，请检查网络后重试`);
    return f;
  }
  async function updateStatus() {
    const a=active();if(!a)return;
    const chosen=(state.typography||{})[a.tab];
    if(!chosen && setting().layout==='original')return;
    const status=document.getElementById('bookFontStatus'),tab=a.tab;
    if(status)status.textContent='正在加载字体…';
    let notice=a.card.querySelector('.book-load-status');
    if(!notice){notice=document.createElement('div');notice.className='book-load-status';notice.setAttribute('role','status');a.card.prepend(notice);}
    notice.hidden=false;notice.textContent='字体加载中，完成后自动应用…';
    try {
      const s=setting();
      const bodyActive=s.layout==='book'||!!chosen.bodyFont,titleActive=s.layout==='book'||!!chosen.titleFont;
      const keys=new Set([...(bodyActive?[s.bodyFont]:[]),...(titleActive?[s.titleFont]:[])]);
      await Promise.all(Array.from(keys,key=>loadedFont(key)));
      if(state.tab!==tab)return;
      if(status)status.textContent=`正文：${bodyActive?fonts[s.bodyFont].actual:'原有字体'} · 标题：${titleActive?fonts[s.titleFont].actual:'原有字体'} · 已加载`;
      notice.hidden=true;
    }catch(error){if(state.tab===tab){
      if(status)status.textContent=error.message;
      notice.textContent='字体加载失败，当前显示系统字体。';
      const retry=document.createElement('button');retry.type='button';retry.textContent='重新加载字体';retry.onclick=retryFonts;notice.append(retry);
    }}
  }
  async function retryFonts(){
    capture(true);await saveNow();const url=new URL(location.href);url.searchParams.set('fontReload',Date.now());location.replace(url.href);

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
    clone.querySelectorAll('.hero.empty,.hero-del,.book-load-status,input[type="file"]').forEach(el=>el.remove());
    clone.querySelectorAll('[contenteditable]').forEach(el=>el.removeAttribute('contenteditable'));
    clone.querySelectorAll('img').forEach(img=>{if(img.getAttribute('src'))img.src=new URL(img.getAttribute('src'),location.href).href;});
    const base='https://hehxxbdsjszjs.github.io/wuqiangzhimen-newsroom/';
    let bookCSS;
    try {
      const chunks=await Promise.all(['mobile-fonts.css','typography.css'].map(async file=>{
        const link=Array.from(document.querySelectorAll('link[rel=stylesheet]')).find(el=>new URL(el.href,location.href).pathname.endsWith('/'+file));
        const response=await fetch(new URL(link?link.href:file,location.href),{cache:'no-cache'});
        if(!response.ok)throw Error('排版样式读取失败');
        return response.text();
      }));
      bookCSS=chunks.join('\n').replace(/url\((['"]?)(fonts\/[^)'"]+)\1\)/g,(_,q,file)=>'url("'+base+file+'")');
    }catch(error){showToast('阅读页保存失败：'+error.message);return;}
    const legacy=Array.from(document.querySelectorAll('head style')).map(el=>el.textContent).join('\n');
    const title=a.card.querySelector('h1').textContent;
    const escaped=title.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    const page='<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+escaped+'</title><style>'+legacy+'</style><style data-book-typesetting="v28">'+bookCSS+'</style><style>:root{'+document.documentElement.style.cssText+'}body{margin:0}.edit{border-color:transparent!important;background:transparent!important;box-shadow:none!important}article{margin-inline:auto!important}</style><body>'+safeHTML(clone.outerHTML)+'</body></html>';
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
    a.card.style.setProperty('--reading-font',`${fonts[s.bodyFont].family}, BookSong28, serif`);
    a.card.style.setProperty('--heading-font',`${fonts[s.titleFont].family}, BookSong28, serif`);
    a.card.style.setProperty('--book-size',`${Number(s.bodySize)||28}px`);
    for(const scope of ['body','title']){
      const weight=Number(s[scope+'Weight'])||400;
      a.card.style.setProperty('--'+scope+'-weight',weight);
      a.card.style.setProperty('--'+scope+'-stroke','0px');
      a.card.style.setProperty('--'+scope+'-bold-weight',Math.min(900,weight+300));
      a.card.style.setProperty('--'+scope+'-bold-stroke','0px');
    }
    // Clipboard HTML often pins each paragraph/span to font-weight:400.
    // Preserve its emphasis while allowing the selected reading weight to win.
    if(chosen.bodyFont||s.layout==='book')a.body.querySelectorAll('[style],.book-inline-emphasis').forEach(el=>{
      const value=el.style.fontWeight;
      el.classList.toggle('book-inline-emphasis',/^(bold|bolder)$/i.test(value)||Number(value)>=600);
      ['font-weight','font-family','font-variation-settings',...(s.layout==='book'?['color','-webkit-text-fill-color','opacity']:[])].forEach(prop=>{
        const current=el.style.getPropertyValue(prop);
        if(current&&el.style.getPropertyPriority(prop))el.style.setProperty(prop,current);
      });
    });
    if(chosen.titleFont||s.layout==='book')a.card.querySelectorAll('h1[style],h1 [style],.sp-title-edit[style],.sp-title-edit [style]').forEach(el=>{
      ['font-family','font-weight','font-variation-settings',...(s.layout==='book'?['color','-webkit-text-fill-color','opacity','height','max-height','overflow','white-space']:[])].forEach(prop=>{
        const value=el.style.getPropertyValue(prop);
        if(value&&el.style.getPropertyPriority(prop))el.style.setProperty(prop,value);
      });
    });
    const title=a.card.querySelector('h1');
    if(title){
      title.classList.toggle('book-positioned-title',s.layout==='book'||s.titleAlign!==undefined||s.titleBefore!==undefined||s.titleAfter!==undefined||s.titleInset!==undefined);
      a.card.style.setProperty('--title-align',s.titleAlign||'left');
      const titleLength=Array.from(title.textContent.replace(/\s/g,'')).length;
      // Keep short Chinese titles together at phone widths; longer titles retain natural wrapping.
      const units=Math.max(8,Math.min(12,titleLength));
      a.card.style.setProperty('--mobile-title-size',`clamp(22px,calc((100vw - 84px) / ${units}),40px)`);
      a.card.style.setProperty('--title-before',(s.titleBefore??26)+'px');
      a.card.style.setProperty('--title-after',(s.titleAfter??24)+'px');
      a.card.style.setProperty('--title-inset',(s.titleInset||0)+'%');
    }
    if(s.layout!=='book'){a.card.querySelector('.reference-meta')?.remove();return;}
    a.body.querySelectorAll('p').forEach(p=>{
      const t=p.textContent.trim();
      const emphasis=p.querySelector('strong,b');
      const fullEmphasis=!!emphasis && emphasis.textContent.trim()===t;
      p.classList.toggle('reference-heading',t.length<=80 && (fullEmphasis || /^(?:#{1,6}\s+|[一二三四五六七八九十百]+[、.．：:]|[0-9]+[、.．）)]\s*|[（(][一二三四五六七八九十0-9]+[)）])/.test(t)));
    });
    let meta=a.card.querySelector('.reference-meta');
    if(!s.metaVisible){if(meta)meta.remove();return;}
    if(!meta){
      meta=document.createElement('div');meta.className='reference-meta edit';
      meta.contentEditable='true';meta.setAttribute('aria-label','字数与阅读时间，可编辑或删除');
      meta.textContent=s.metaText??'';a.card.querySelector('h1').after(meta);
      meta.addEventListener('focus',()=>pushHistory());
      meta.addEventListener('input',()=>{patch({metaText:meta.textContent});save();});
    }
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
  return {editHeader,setting,controls,selectFont,selectTitle,selectWeight,formatCurrent,original,downloadReading,capture,restore,mount,decorate,loadedFont,safeHTML,fonts};
})();
