window.Legacy = (() => {
  const types = {news:'כתבה',redistribution:'הפצה או ריכוז',community:'פוסט וקהילה',biography:'רקע ביוגרפי',radio:'רדיו',television:'טלוויזיה',segment:'קטע משידור',music:'מוזיקה',film:'קולנוע והופעות',audit:'בדיקה שלילית',family:'משפחתי'};
  const statuses = {verified:'מאומת במקור',supported:'נתמך בתיעוד',partial:'מאומת חלקית',pending:'דורש בדיקה',identity_pending:'ממתין לאימות זהות'};
  const $ = id => document.getElementById(id);
  function node(tag,text='',cls='') {
    const e=document.createElement(tag);
    if(text)e.textContent=text;
    if(cls)e.className=cls;
    return e;
  }
  function url(value) {
    try {const u=new URL(value);return ['https:','http:'].includes(u.protocol)?u.href:'';} catch {return '';}
  }
  function local(value) {return /^media\/(?:[\w.-]+\/)*[\w.-]+$/i.test(value||'')&&!value.split('/').some(p=>p==='..'||p==='.') ? value:'';}
  function a(label,href,cls='',external=false) {
    const e=node('a',label,cls);
    e.href=href;
    if(external){e.target='_blank';e.rel='noopener noreferrer';}
    return e;
  }
  function b(label,fn,cls='') {
    const e=node('button',label,cls);e.type='button';e.addEventListener('click',fn);return e;
  }
  function elDate(value) {
    if(!value)return '';
    if(!/^\d{4}-\d\d-\d\d$/.test(value))return value;
    const [y,m,d]=value.split('-');
    return [d,m,y].join('.');
  }
  function textKey(value){return String(value||'').toLocaleLowerCase('he').replace(/[׳״'"`-]/g,'').trim();}
  function safeStore(key,value) {
    try {if(arguments.length===1)return JSON.parse(localStorage.getItem(key));localStorage.setItem(key,JSON.stringify(value));return true;}
    catch {return null;}
  }
  function reportError(message){const e=node('p',message,'shell');e.setAttribute('role','alert');document.body.prepend(e);}
  return {$,node,a,b,url,local,types,statuses,elDate,textKey,safeStore,reportError};
})();
