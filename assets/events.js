/* BookShelf - Event wiring for the header, menu and main area, and the splash screen. */
"use strict";
/* ---------- events ---------- */
$('q').oninput=e=>{q=e.target.value;render()};
$('fShelf').onchange=e=>{fShelf=e.target.value;render()};
document.querySelectorAll('.tabs button').forEach(b=>b.onclick=()=>{view=b.dataset.v;if(arrange&&view!=='shelves')arrange=false;render()});
$('add').onclick=()=>openBook(null);
$('pick').onclick=openPick;
$('menuBtn').onclick=e=>{e.stopPropagation();$('menu').classList.toggle('open')};
document.addEventListener('click',e=>{if(!e.target.closest('.menuwrap'))$('menu').classList.remove('open')});
$('menu').onclick=e=>{const m=e.target.closest('[data-m]');if(!m)return;$('menu').classList.remove('open');
  const k=m.dataset.m;
  if(k==='arrange')setArrange(!arrange);
  else if(k==='shelves')openShelves();
  else if(k==='export')exportBackup();
  else if(k==='import')importBackup();
  else if(k==='exportLib')exportLibrary();
  else if(k==='reset')resetToBaseline();
  else if(k==='dark'){const on=document.body.classList.toggle('dark');$('darkBtn').textContent=on?'מצב בהיר':'מצב כהה';try{localStorage.setItem('shelf-dark',on?'1':'0')}catch(err){}}};
$('ov').onclick=e=>{if(e.target.id==='ov')close()};
document.addEventListener('keydown',e=>{if(e.key!=='Escape')return;const v=document.querySelector('.viewer');if(v){v.remove();return}if($('ov').classList.contains('open'))close();else if(arrange)setArrange(false)});
$('main').addEventListener('change',e=>{if(e.target.id==='goalIn'){meta.goal=Math.max(0,+e.target.value||0);saveMeta();render()}});
$('main').onclick=e=>{
  const t=e.target;
  if(t.id==='arrDone'){setArrange(false);toast('הסידור נשמר');return}
  const f=t.closest('[data-f]');if(f){fStatus=fStatus===f.dataset.f&&f.dataset.f?'':f.dataset.f;render();return}
  const tg=t.closest('[data-tag]');if(tg){fTag=fTag===tg.dataset.tag?'':tg.dataset.tag;render();return}
  const sh=t.closest('[data-sh]');if(sh){moveShelf(+sh.dataset.sh,+sh.dataset.d);return}
  const so=t.closest('[data-sort]');if(so){sortShelf(so.dataset.sort,so.dataset.k);return}
  const en=t.closest('[data-end]');if(en){if(moving)placeBook(moving,null,en.dataset.end);else toast('קודם בחר ספר');return}
  const th=t.closest('th[data-col]');if(th){if(sortKey===th.dataset.col)sortDir*=-1;else{sortKey=th.dataset.col;sortDir=1}render();return}
  const sp=t.closest('[data-id]');if(!sp)return;
  if(arrange&&sp.classList.contains('spine')){const id=sp.dataset.id;if(!moving)moving=id;else if(moving===id)moving=null;else{placeBook(moving,id);return}render();return}
  openBook(sp.dataset.id);
};

/* ---------- splash ---------- */
let splashLine=null,introShown=false;
(function splash(){
  let seen=false;try{seen=sessionStorage.getItem('shelf-splash')==='1'}catch(e){}
  if(seen)return;
  const cols=['#7a2e2a','#2f4f6f','#e8dcc4','#3d5c3a','#8a5a1f','#5b3b6b','#c9d6c8','#a33a2c','#1f5e5e'];
  const bk=cols.map((c,i)=>`<i style="background:${c};height:${70+(i*37)%50}px;animation-delay:${i*90}ms"></i>`).join('');
  document.body.insertAdjacentHTML('beforeend',`<div id="splash"><div class="door dl"></div><div class="door dr"></div><div class="sp-in"><div class="sp-books">${bk}</div><h2>ארון הספרים שלי</h2><p id="spA">פותח את הארון...</p><p id="spB"></p><button id="enter">לפתוח את הארון</button></div></div>`);
  let done=false;
  const open=()=>{if(done)return;done=true;try{sessionStorage.setItem('shelf-splash','1')}catch(e){}
    $('splash').classList.add('open');$('main').classList.add('intro');setTimeout(()=>{introShown=true},50);
    setTimeout(()=>{const s=$('splash');if(s)s.remove()},1200);setTimeout(()=>$('main').classList.remove('intro'),4000)};
  $('enter').onclick=open;
  document.addEventListener('keydown',function k(e){if(e.key==='Enter'||e.key===' '){if($('splash')&&!done){e.preventDefault();open()}document.removeEventListener('keydown',k)}});
  splashLine=()=>{if(!$('spA'))return;const h=new Date().getHours();
    const greet=h>=5&&h<12?'בוקר טוב':h>=12&&h<17?'צהריים טובים':h>=17&&h<21?'ערב טוב':'לילה טוב';
    const owned=books.filter(b=>b.status!=='want').length,reading=books.filter(b=>b.status==='reading'),waiting=books.filter(b=>b.status==='shelf').length,late=books.filter(overdue).length;
    $('spA').textContent=`${greet}. ${owned} ספרים בארון.`;
    let line=reading.length?`אתה באמצע "${reading[0].title}"${reading.length>1?` ועוד ${reading.length-1}`:''}`:`${waiting} ספרים מחכים לך על המדפים`;
    if(late)line+=` · ${late===1?'ספר אחד מחכה':late+' ספרים מחכים'} להחזרה`;
    $('spB').textContent=line};
})();
