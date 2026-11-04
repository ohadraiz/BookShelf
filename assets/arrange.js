/* BookShelf - Arrange mode: moving books and shelves, sorting a shelf. */
"use strict";
/* ---------- arrange ---------- */
function setArrange(on){arrange=on;moving=null;if(on){view='shelves';q='';fStatus='';fShelf='';fTag='';$('q').value=''}render()}
function placeBook(id,beforeId,endShelf){
  const b=byId(id);if(!b)return;const old={shelf:b.shelf,pos:b.pos};let p;
  if(beforeId){const t=byId(beforeId);const l=onShelf(t.shelf).filter(x=>x.id!==id);const i=l.indexOf(t);const prev=l[i-1];p={shelf:t.shelf,pos:prev?(prev.pos+t.pos)/2:t.pos-1000};
    if(prev&&Math.abs(t.pos-prev.pos)<1e-6){renumber(t.shelf);return placeBook(id,beforeId)}}
  else{const l=onShelf(endShelf).filter(x=>x.id!==id);p={shelf:endShelf,pos:l.length?l[l.length-1].pos+1000:1000}}
  moving=null;patchBook(id,p);render();toast('הספר הועבר',()=>{patchBook(id,old);render()});
}
function renumber(sid){onShelf(sid).forEach((b,i)=>{const p=(i+1)*1000;if(b.pos!==p)patchBook(b.id,{pos:p})})}
function sortShelf(sid,key){
  const l=onShelf(sid);const old=l.map(b=>[b.id,b.pos]);
  [...l].sort((a,b)=>(a[key]||'').localeCompare(b[key]||'','he')||a.title.localeCompare(b.title,'he')).forEach((b,i)=>{const p=(i+1)*1000;if(b.pos!==p)patchBook(b.id,{pos:p})});
  render();toast(key==='author'?'המדף מוין לפי סופר':'המדף מוין לפי שם',()=>{old.forEach(([id,p])=>{const b=byId(id);if(b&&b.pos!==p)patchBook(id,{pos:p})});render()});
}
function moveShelf(i,d){const j=i+d;if(j<0||j>=meta.shelves.length)return;[meta.shelves[i],meta.shelves[j]]=[meta.shelves[j],meta.shelves[i]];saveMeta();render()}
