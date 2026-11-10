(() => {
  'use strict';
  const { $,node,a,b,url,local,types,statuses,elDate,textKey,safeStore,reportError }=Legacy;
  const data=window.LEGACY_CATALOG;
  if(!data){reportError('מאגר הרשומות לא נטען. יש לחלץ את כל תיקיית הארכיון.');return;}
  const byId=new Map(data.records.map(x=>[x.id,x]));
  const media=new Map(data.media.map(x=>[x.id,x]));
  const trackMap=new Map(data.tracks.map(x=>[x.id,x]));
  let playlists=safeStore('mh-playlists-v1')||structuredClone(data.playlists);
  let activeList=playlists[0]?.id||'';
  let current=null, pending=null, activeControl=null, trigger=null;
  function external(label,href,cls=''){
    const target=url(href);return target?a(label,target,cls,true):null;
  }
  function add(parent,children){children.filter(Boolean).forEach(c=>parent.append(c));return parent;}
  function notice(text,cls='muted'){return node('p',text,cls);}
  function sourceLinks(refs){
    return add(node('div','','actions'),refs.map(ref=>external(ref.label||'מקור',ref.url)));
  }
  function jump(label,seconds,title,mediaId='M04'){
    return b(label,event=>play(mediaId,seconds,title,event.currentTarget));
  }
  const player=$('player');
  function saveTime(){
    if(current&&activeControl&&Number.isFinite(activeControl.currentTime)){
      safeStore('mh-position-'+current.id,activeControl.currentTime);
    }
  }
  for(const c of [$('audio'),$('video')]){
    c.addEventListener('pause',saveTime);
    c.addEventListener('loadedmetadata',()=>{
      if(c!==activeControl||pending===null)return;
      c.currentTime=Math.min(pending,Math.max(0,c.duration-0.1));
      pending=null;c.play().catch(()=>{});
    });
    c.addEventListener('error',()=>{if(c===activeControl)$('playing-source').textContent='קובץ המדיה לא נטען. ודאו שכל החבילה חולצה.';});
  }
  window.addEventListener('pagehide',saveTime);
  $('close-player').addEventListener('click',()=>{saveTime();activeControl?.pause();player.hidden=true;trigger?.focus();});
  function play(mid,seconds,title,from){
    const item=media.get(mid);if(!item)return;
    const path=local(item.path);if(!path)return;
    const c=item.kind==='video'?$('video'):$('audio');
    if(activeControl&&(activeControl!==c||current?.id!==mid)){saveTime();activeControl.pause();if(activeControl!==c)activeControl.hidden=true;}
    const same=current?.id===mid&&c.getAttribute('src')===path;
    current=item;activeControl=c;trigger=from||trigger;c.hidden=false;player.hidden=false;
    $('playing').textContent=title||item.title;
    $('playing-source').textContent=item.credit||item.source||'';
    const target=seconds??(same?c.currentTime:safeStore('mh-position-'+mid))??0;
    if(!same){pending=target;c.src=path;c.load();}
    else if(c.readyState){pending=null;c.currentTime=target;c.play().catch(()=>{});}
    else pending=target;
  }
  function card(title,info,body,extras=[],id=''){
    const item=node('article','','card');
    if(id)item.id=id;
    if(info)item.append(node('small',info));
    item.append(node('h3',title));if(body)item.append(notice(body));
    if(extras.length)item.append(add(node('div','','actions'),extras));
    return item;
  }
  function eventCard(e){
    return card(e.title,e.displayDate,e.summary,e.sourceIds.map(id=>a(id,'#r-'+id)),'e-'+e.id);
  }
  for(const [label,detail,href] of [['1970–1973','מן הפסטיבלים אל המסך','#screen'],['08.11.2026','שידור המחווה בגלי צה״ל','#radio'],['ארכיון חי','מקורות ומראי מקום','#sources']]){
    $('overview').append(add(a('','#'+href.split('#').at(-1)),[node('b',label),node('span',detail)]));
  }
  const portrait=data.media.find(m=>m.hero&&m.kind==='image'&&local(m.path)&&m.credit&&m.rights);
  if(portrait&&data.edition!=='repository'){
    const img=$('portrait').querySelector('img');
    img.src=local(portrait.path);img.alt=portrait.title;
    img.removeAttribute('width');img.removeAttribute('height');
    $('portrait').querySelector('figcaption').textContent=portrait.credit;
  }
  const featured=$('featured-list');
  for(const [id,title,credit] of [
    ['V04','אהבה בעשן','מאוצר הסרטיה והתקליטיה'],
    ['V06','אל תירא ישראל (יעקב התמים)','ערוץ מוזיקה ישראלית'],
    ['V05','לזכרו בפסטיבל ״השיר הבא״','ערוץ אלי ניסמן מיוזיק']
  ]){
    const item=media.get(id);
    if(!item)continue;
    const action=item.kind==='external'?external('לצפייה במקור',item.url,'button')
      :(['audio','video'].includes(item.kind)&&local(item.path)&&b('לניגון',e=>play(item.id,null,item.title,e.currentTarget)));
    if(!action)continue;
    action.setAttribute('aria-label',title+' · '+(item.kind==='external'?'פתיחה במקור בחלון חדש':'לניגון'));
    const sourceRecord=data.records.find(r=>r.type==='music'&&r.links.some(l=>l.url===item.url));
    const service=item.kind==='external'?'YouTube':'מתוך הארכיון';
    const note=sourceRecord?service+' · '+statuses[sourceRecord.status]:service;
    const row=card(title,credit,note,[action]);
    row.classList.add('listening-card');
    featured.append(row);
  }
  if(!featured.children.length)featured.append(a('לרשימת השירים והביצועים','#music','button'));
  const tribute=byId.get('N28');
  if(tribute)add($('tribute-actions'),[external('להאזנה למחווה המלאה',tribute.links[0]?.url,'button solid'),a('מקור ופרטי המחווה','#r-N28')]);
  const rareIds=new Set(['N39','N37','N38']);
  const rareTitles={'N39':'לא הבל היופי','N37':'שיר שבת — משה הלל','N38':'משה הלל — חג לי'};
  for(const id of rareIds){
    const r=byId.get(id);if(!r)continue;
    const description=id==='N39'?'לפי תיאור המעלה, דודי פטימר, זו הופעה בפני חיילים בתקופת מלחמת יום הכיפורים. מקום ההקלטה ומועדה המדויק לא אומתו עצמאית.':r.summary;
    const item=card(rareTitles[id],r.source+' · הועלה ב־'+r.date.slice(0,4),description,[external('לצפייה ב־YouTube',r.links[0]?.url,'button'),a('קרדיטים ומקור','#r-'+id)]);
    item.classList.add('rare-card');
    item.prepend(node('span','ארכיון / '+r.date.slice(0,4),'archive-year'));
    item.append(notice('פרטי הפרסום אומתו · ההשמעה באתר המקור','source-note'));
    $('rare-list').append(item);
  }
  const broadcastLocal=Boolean(local(media.get('M04')?.path));
  if(!broadcastLocal)document.querySelector('.radio-copy .badge').textContent='קישור לעמוד ההקלטה אצל המפרסם';
  add($('radio-actions'),[
    broadcastLocal&&b('האזנה מההתחלה',event=>play('M04',0,null,event.currentTarget),'solid'),
    broadcastLocal&&b('המשך האזנה',event=>play('M04',null,null,event.currentTarget)),
    broadcastLocal&&jump('06:37 · ההקדשה',397,'הקדשת התוכנית'),
    external('עמוד הפרק בגל״צ',byId.get('N25')?.links[0]?.url)
  ]);
  if(data.edition==='repository'){
    document.querySelector('#radio .transcript').hidden=!data.markers.length;
    for(const item of document.querySelectorAll('[data-local-only]'))item.hidden=true;
  }
  for(const marker of data.markers){
    const row=node('div','','marker');
    add(row,[jump(marker.time,marker.seconds,marker.title,marker.mediaId),
      add(node('div'),[node('strong',marker.title),notice(marker.summary),node('small','תמלול אוטומטי מהמקור המצורף','muted')])]);
    $('markers').append(row);
  }
  for(const r of data.records.filter(x=>['segment','television'].includes(x.type))){
    $('radio-list').append(card(r.title,[elDate(r.date),r.source].filter(Boolean).join(' · '),r.summary,
      [r.mediaId&&jump('האזנה לקטע',r.seconds,r.title,r.mediaId),a('לרשומה','#r-'+r.id)]));
  }
  if(!data.records.some(r=>r.type==='television'))$('radio-list').append(card('אזכורים בטלוויזיה','עדיין באיסוף','קטעי הטלוויזיה שנשלחו למשפחה עדיין בתהליך זיהוי המקורות.'));
  for(const e of data.timeline)$('events').append(eventCard(e));
  for(const e of data.timeline.filter(x=>/קזבלן|פסטיבל השיר הבא|אות הוקרה/.test(x.title))){
    const c=eventCard(e);
    c.removeAttribute('id');
    const clips=node('ul');
    for(const id of e.sourceIds){
      const record=byId.get(id);
      if(record?.type!=='film'||!record.time)continue;
      const source=record.links.find(link=>link.role==='source');
      const watch=external(source?.label,source?.url);
      if(!watch)continue;
      watch.setAttribute('aria-label',source.label+' · YouTube, נפתח בחלון חדש');
      const time=node('bdi',record.time);
      const detail=add(node('small',' · '),[time]);
      clips.append(add(node('li'),[watch,detail]));
    }
    if(clips.children.length)c.append(notice('קטעים לצפייה לפי זיהוי המשפחה'),clips);
    $('screen-list').append(c);
  }
  function ensurePlaylist(){
    if(playlists.length===0)playlists.push({id:'P-local',title:'הרשימה שלי',trackIds:[]});
    return playlists.find(p=>p.id===activeList)||playlists[0];
  }
  function savePlaylists(){
    const ok=safeStore('mh-playlists-v1',playlists);
    renderPlaylists();
    if(!ok)$('playlist-list').prepend(notice('שמירה בדפדפן אינה זמינה כרגע. הרשימה נשמרת כל עוד הדף פתוח.'));
  }
  function appendPlaylist(id,from){
    const p=ensurePlaylist();
    if(!p.trackIds.includes(id))p.trackIds.push(id);
    savePlaylists();
    if(from){from.textContent='נוסף';from.setAttribute('aria-label','נוסף לפלייליסט '+p.title);}
  }
  function renderPlaylists(){
    const dst=$('playlist-list');dst.replaceChildren();
    for(const p of playlists){
      const detail=node('details','','playlist');detail.open=p.id===activeList;
      const select=b('בחירת הרשימה להוספה',()=>{activeList=p.id;renderPlaylists();$('playlist-list').querySelector('details[open] summary')?.focus();});
      add(detail,[node('summary',p.title+' · '+p.trackIds.length),select]);
      if(p.id===activeList)select.disabled=true;
      const list=node('ol');
      for(const id of p.trackIds){
        const t=trackMap.get(id), m=media.get(id);
        if(!t&&!m)continue;
        const li=node('li');
        add(li,[t?jump(t.title,t.seconds,t.title,t.mediaId):external(m.title,m.url),b('הסרה',()=>{p.trackIds=p.trackIds.filter(x=>x!==id);savePlaylists();})]);
        list.append(li);
      }
      detail.append(list);dst.append(detail);
    }
  }
  $('playlist-form').addEventListener('submit',e=>{
    e.preventDefault();const input=$('playlist-name');const title=input.value.trim();if(!title)return;
    activeList='P-'+Date.now().toString(36);playlists.push({id:activeList,title,trackIds:[]});input.value='';savePlaylists();
  });
  function renderTracks(){
    const match=textKey($('track-query').value);const dst=$('tracks');dst.replaceChildren();
    for(const t of data.tracks.filter(x=>textKey(x.title).includes(match))){
      const playButton=jump(t.time,t.seconds,t.title,t.mediaId);
      playButton.setAttribute('aria-label','האזנה ל'+t.title+' בזמן '+t.time);
      const plus=b('הוספה',e=>appendPlaylist(t.id,e.currentTarget));plus.setAttribute('aria-label','הוספת '+t.title+' לפלייליסט');
      add(dst,[add(node('div','','track'),[playButton,add(node('div'),[node('strong',t.title),node('span','ודאות '+t.confidence,'muted')]),plus])]);
    }
    if(!dst.children.length)dst.append(notice('אין שירים שתואמים לחיפוש.'));
  }
  if(data.tracks.length){
    $('track-query').addEventListener('input',renderTracks);
    renderTracks();
  }else{
    $('track-search').hidden=true;
    $('tracks').append(notice('הקלטות וביצועים זמינים בקישורים שבהמשך העמוד.'));
  }
  renderPlaylists();
  for(const r of data.records.filter(x=>x.type==='music'&&!rareIds.has(x.id)&&x.links.length&&!data.media.some(m=>x.links.some(l=>l.url===m.url)))){
    $('music-list').append(card(r.title,r.source,r.summary,[a('לרשומה','#r-'+r.id)]));
  }
  const album=byId.get('B-NLI');
  if(album)$('music-list').append(card(album.title,album.source,album.summary,[a('לפרטי התקליט','#r-'+album.id)]));
  for(const m of data.media.filter(x=>(x.kind==='external'&&!['V04','V06','V05'].includes(x.id)) || (['audio','video'].includes(x.kind)&&x.id!=='M04'))){
    const watch=m.kind==='external'?external('פתיחה במקור',m.url):b('ניגון',e=>play(m.id,null,m.title,e.currentTarget));
    $('music-list').append(card(m.title,m.credit||m.source,m.notes,[watch,m.kind==='external'&&b('הוספה לפלייליסט',e=>appendPlaylist(m.id,e.currentTarget))]));
  }
  if(data.edition!=='repository'){
    const family=$('family-list');
    for(const note of data.familyNotes)family.append(card(note.title,note.date?elDate(note.date):'הקדשה משפחתית',note.text));
    for(const m of data.media.filter(x=>['image','document'].includes(x.kind)&&local(x.path))){
      const c=card(m.title,m.credit||m.source,m.notes,[a('פתיחת הקובץ',local(m.path),'',true)]);
      if(m.kind==='image'){const img=node('img');img.src=local(m.path);img.alt=m.title;img.loading='lazy';c.append(img);}
      family.append(c);
    }
    if(family.children.length){
      family.closest('details').hidden=false;
      $('family-empty').hidden=true;
    }
  }
  for(const [value,label] of Object.entries(types))$('type-filter').append(new Option(label,value));
  for(const [value,label] of Object.entries(statuses))$('status-filter').append(new Option(label,value));
  function recordCard(r){
    const item=node('article','','record');item.id='r-'+r.id;
    const title=node('h3',r.title);title.dir='auto';
    add(item,[node('small',[r.id,elDate(r.date),r.time,r.source,types[r.type]].filter(Boolean).join(' · ')),title,node('span',statuses[r.status]||r.status,'badge'),notice(r.summary)]);
    if(r.people)item.append(node('small',r.people));
    if(r.links.length)item.append(sourceLinks(r.links));
    if(r.parentId)item.append(a('רשומת האב','#r-'+r.parentId));
    if(r.evidence?.length||r.versions?.length||r.sourceVariants?.length){
      const details=node('details');details.append(node('summary','ראיות, קרדיטים וגרסאות'));
      for(const ev of r.evidence||[])details.append(notice(ev));
      for(const v of r.sourceVariants||[])details.append(add(node('div'),[node('small',[v.id,v.source,v.time].filter(Boolean).join(' · ')),notice(v.summary)]));
      for(const v of r.versions||[])details.append(card(v.title,[v.id,v.source,v.time].filter(Boolean).join(' · '),v.summary,[sourceLinks(v.links),...(v.evidence||[]).map(x=>node('small',x))]));
      item.append(details);
    }
    return item;
  }
  function renderRecords(){
    const q=textKey($('record-query').value);const ty=$('type-filter').value;const st=$('status-filter').value;
    const rows=[...data.records].sort((a,b)=>(b.date||'').localeCompare(a.date||'')||a.id.localeCompare(b.id))
      .filter(r=>(!ty||r.type===ty)&&(!st||r.status===st)&&(!q||textKey(JSON.stringify(r)).includes(q)));
    $('record-count').textContent=rows.length+' רשומות';
    $('records').replaceChildren(...rows.map(recordCard));
  }
  for(const k of ['record-query','type-filter','status-filter'])$(k).addEventListener('input',renderRecords);
  renderRecords();
  function revealHash(){
    const hash=location.hash.slice(1);
    if(hash.startsWith('r-')&&!$(hash)&&byId.has(hash.slice(2))){
      for(const id of ['record-query','type-filter','status-filter'])$(id).value='';
      renderRecords();$(hash)?.scrollIntoView();
    }
  }
  window.addEventListener('hashchange',revealHash);revealHash();
})();
