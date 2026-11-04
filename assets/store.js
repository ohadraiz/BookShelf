/* BookShelf - Saving: local mode (localStorage), Claude db mode, memory mode. */
"use strict";
/* ---------- persistence ---------- */
const queues={};let inflight=0;
function setSave(state,txt){const d=document.getElementById('dot'),t=document.getElementById('savetxt');if(!d)return;d.className='dot'+(state?' '+state:'');t.textContent=txt||''}
function enqueue(key,fn){
  inflight++;setSave('busy','שומר...');
  queues[key]=(queues[key]||Promise.resolve()).then(fn).then(()=>{},onWriteError).finally(()=>{if(--inflight===0)setSave('','נשמר')});
  return queues[key];
}
function onWriteError(e){
  const c=e&&e.code;
  if(c==='invalid_argument'||c==='not_granted'){canWrite=false;document.body.classList.add('ro');toast('אין לך הרשאה לשנות את הארון - מצב צפייה');render()}
  else if(c==='quota_exceeded'){toast('האחסון של הארון מלא')}
  else{setSave('err','השמירה נכשלה');toast('השמירה נכשלה - נסה שוב')}
  throw e;
}
/* local mode: the whole library lives in this browser (localStorage), covers in IndexedDB */
let persistTimer=null;
function persistLocal(){
  clearTimeout(persistTimer);setSave('busy','שומר...');
  persistTimer=setTimeout(()=>{
    try{localStorage.setItem(LS_KEY,JSON.stringify({savedAt:new Date().toISOString(),library:libInfo,meta:{shelves:meta.shelves.map(s=>({id:s.id})),goal:meta.goal||0},books}));setSave('','נשמר במחשב')}
    catch(e){setSave('err','השמירה נכשלה');toast('השמירה במחשב נכשלה - כדאי לייצא גיבוי')}
  },150);
  return Promise.resolve();
}
function writeBook(id,data){ // full set
  const b=clean(data);
  const i=books.findIndex(x=>x.id===id);if(i<0)books.push(Object.assign({id},b));else books[i]=Object.assign({id},b);
  if(localMode)return persistLocal();
  if(memMode)return Promise.resolve();
  return enqueue('b/'+id,()=>db.collection('books').doc(id).set(b)).catch(()=>{});
}
function patchBook(id,patch){
  const b=byId(id);if(!b)return;Object.assign(b,patch);
  if(localMode)return persistLocal();
  if(memMode)return Promise.resolve();
  return enqueue('b/'+id,()=>db.collection('books').doc(id).update(patch)).catch(()=>{});
}
function removeBook(id){
  books=books.filter(b=>b.id!==id);
  if(localMode)return persistLocal();
  if(memMode)return Promise.resolve();
  return enqueue('b/'+id,()=>db.collection('books').doc(id).delete()).catch(()=>{});
}
function saveMeta(){
  if(localMode)return persistLocal();
  if(memMode)return Promise.resolve();
  const m={shelves:meta.shelves.map(s=>({id:s.id})),goal:meta.goal||0};
  return enqueue('meta',()=>db.doc('meta/main').set(m)).catch(()=>{});
}
function changed(){render()}
