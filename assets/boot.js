/* BookShelf - Loading data and starting the app. Must be the last script. */
"use strict";
/* ---------- data wiring ---------- */
function applyBooks(snap){
  books=snap.docs.map(d=>Object.assign({id:d.id},clean(d.data()||{})));
  loaded.books=true;dataArrived();
}
function applyMeta(snap){
  const d=snap.exists?snap.data():null;
  meta={shelves:(d&&Array.isArray(d.shelves)?d.shelves:[]).map(s=>({id:String(s.id)})),goal:(d&&d.goal)||0};
  loaded.meta=true;dataArrived();
}
let loadTimer=null;
function dataArrived(){
  if(loadTimer&&loaded.books&&loaded.meta){clearTimeout(loadTimer);loadTimer=null}
  render();
  if(splashLine)splashLine();
}
function startMemory(seed){
  memMode=true;books=seed.books.map(b=>Object.assign({id:b.id},clean(b)));meta=seed.meta;loaded.books=loaded.meta=true;setSave('off','תצוגה מקדימה - שינויים לא נשמרים');render();if(splashLine)splashLine();
}
async function startLocal(){
  localMode=true;$('resetBtn').hidden=false;
  let saved=null;try{saved=JSON.parse(localStorage.getItem(LS_KEY)||'null')}catch(e){}
  if(saved&&Array.isArray(saved.books)&&saved.meta){libInfo=saved.library||null;meta={shelves:(saved.meta.shelves||[]).map(s=>({id:String(s.id)})),goal:saved.meta.goal||0};books=saved.books.map(b=>Object.assign({id:String(b.id)},clean(b)))}
  else if(window.BOOKSHELF_BASELINE&&window.BookFormat){loadLibrary(window.BOOKSHELF_BASELINE);persistLocal()}
  else{$('main').innerHTML='<div class="empty">לא נמצאו נתוני הארון (data/library.js). הריצו: python tools/convert.py to-js data/library.json -o data/library.js</div>';setSave('err','אין נתונים');return}
  await loadLocalCovers();
  loaded.books=loaded.meta=true;setSave('','נשמר במחשב');render();if(splashLine)splashLine();
}
async function boot(){
  const demo=document.getElementById('demo');
  if(!(window.claude&&window.claude.use)){if(demo)startMemory(JSON.parse(demo.textContent));else startLocal();return}
  claude.use('assets').then(a=>{assets=a}).catch(()=>{});
  claude.use('downloads').then(d=>{downloads=d}).catch(()=>{});
  claude.use('sample').then(s=>{sample=s}).catch(()=>{});
  claude.use('user').then(async u=>{if(!u)return;try{const w=await u.can('data.write');if(w===false){canWrite=false;document.body.classList.add('ro');render()}}catch(e){}}).catch(()=>{});
  db=await claude.use('db').catch(()=>null);
  if(!db){if(demo)return startMemory(JSON.parse(demo.textContent));$('main').innerHTML='<div class="empty">אי אפשר לטעון את הארון בתצוגה הזו. פתח אותו מהקישור שלו ובחשבון מחובר.</div>';setSave('off','');return}
  setSave('','מחובר');
  loadTimer=setTimeout(()=>{if(!loaded.books)$('main').innerHTML='<div class="empty">אי אפשר להגיע לנתונים כרגע. בדוק את החיבור לאינטרנט, הארון ימשיך לנסות.</div>';else toast('ייתכן שהנתונים אינם מעודכנים')},10000);
  const err=e=>{if(e&&e.code==='revoked'){$('main').innerHTML='<div class="empty">הגישה לארון הסתיימה.</div>'}else toast('החיבור לנתונים נקטע. רענן את העמוד.')};
  db.collection('books').onSnapshot(applyBooks,err);
  db.doc('meta/main').onSnapshot(applyMeta,err);
}
boot();
