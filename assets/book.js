/* BookShelf - Book card dialog, add/edit, photo identify, pick-a-book, shelves dialog. */
"use strict";
/* ---------- book dialog ---------- */
function openBook(id,preset){
  const isNew=!id;
  // draft holds edits for a new book; for an existing book we patch live
  const draft=isNew?Object.assign(clean({}),{shelf:fShelf||(meta.shelves[0]||{}).id||'',status:'shelf'},preset||{}):null;
  const newAssets=[];let editing=false,dupOk=false;
  const B=()=>isNew?draft:byId(id);
  const set=(patch,redraw)=>{if(isNew)Object.assign(draft,patch);else patchBook(id,patch);if(redraw!==false)draw();if(!isNew)render()};
  const ro=canWrite?'':' disabled';
  const draw=()=>{
    const b=B();if(!b){close();return}
    const c=colorOf(b);let ctx='';
    if(b.status==='reading')ctx=`<div class="box"><div class="row2"><div class="field"><label for="fPage">עמוד נוכחי</label><input type="number" min="0" id="fPage" value="${b.page||''}"${ro}></div><div class="field"><label for="fPages">סה"כ עמודים</label><input type="number" min="0" id="fPages" value="${b.pages||''}"${ro}></div></div>${b.pages?`<div class="bar"><div style="width:${Math.min(100,Math.round(100*(b.page||0)/b.pages))}%"></div></div>`:''}<div style="margin-top:6px;color:var(--muted);font-size:13px">${b.started?'התחלתי ב-'+fmtDate(b.started):''}</div></div>`;
    if(b.status==='read'&&b.finished)ctx=`<div class="box" style="font-size:13px;color:var(--muted)">סיימתי ב-${fmtDate(b.finished)}${b.started?' (התחלתי ב-'+fmtDate(b.started)+')':''}</div>`;
    if(OUT.includes(b.status))ctx=`<div class="box"><div class="row2"><div class="field"><label for="fPerson">${b.status==='borrowed'?'ממי שאלתי':b.status==='lent'?'למי השאלתי':'למי מסרתי'}</label><input id="fPerson" value="${esc(b.person)}"${ro}></div>${b.status!=='given'?`<div class="field"><label for="fDue">להחזרה עד</label><input type="date" id="fDue" value="${b.due||''}"${ro}></div>`:''}</div>${overdue(b)?'<div class="alert">ההחזרה באיחור</div>':''}</div>`;
    const showEdit=isNew||editing;
    $('dlg').innerHTML=`<div class="dhead${LIGHT.has(c)?' light':''}" style="background:${c}">${b.front?`<img class="thumb" src="${coverUrl(b.front)}" alt="">`:''}<div class="ht"><h3>${isNew?'ספר חדש':esc(b.title)}</h3><div>${isNew?'':esc(b.author)+(b.status==='want'?'':' · '+esc(shelfName(b.shelf)))}</div></div>${!isNew&&canWrite?`<button class="eb" id="eToggle">${editing?'סיום עריכה':'עריכה'}</button>`:''}</div>
    <div class="dbody">
    ${isNew&&sample?`<button id="aiBtn" style="width:100%;margin-bottom:10px">צילום כריכה וזיהוי אוטומטי של הספר</button>`:''}
    ${showEdit?`<div class="editbox" id="editbox">${editFields(b,ro)}</div>`:''}
    <div id="dupWarn"></div>
    <div class="lbl">מה המצב עם הספר?</div>
    <div class="status">${Object.entries(ST).map(([k,v])=>`<button data-s="${k}" class="${b.status===k?'sel':''}" style="${b.status===k?'background:'+v.c:''}"${ro}><i style="background:${b.status===k?'#fff':v.c}"></i>${v.l}</button>`).join('')}</div>
    ${ctx}
    <div class="lbl">הדירוג שלי</div>
    <div class="stars">${[5,4,3,2,1].map(n=>`<button data-r="${n}" class="${b.rating>=n?'lit':''}" aria-label="${n} כוכבים"${ro}>★</button>`).join('')}</div>
    <div class="field" style="margin-top:8px"><label for="fReview">מה חשבתי על הספר</label><textarea id="fReview" rows="3" placeholder="כמה מילים על הספר, ציטוט שאהבתי, למי הייתי ממליץ..."${ro}>${esc(b.review||'')}</textarea></div>
    <div class="lbl">תמונות הכריכה</div>
    <div class="covers">${['front','back'].map(k=>`<button class="cov${b[k]?' has':''}" data-cov="${k}"${!b[k]&&!canWrite?' disabled':''}>${b[k]?`<img src="${coverUrl(b[k])}" alt=""><span class="cap">${k==='front'?'כריכה קדמית':'כריכה אחורית'}</span>`:`<span class="plus">+</span>${k==='front'?'כריכה קדמית':'כריכה אחורית'}`}</button>`).join('')}</div>
    <div class="actions">${!isNew&&canWrite?'<button class="danger" id="del">מחיקה</button>':''}<span class="grow"></span>${isNew?'<button id="cancel">ביטול</button><button class="primary" id="ok">הוספה לארון</button>':'<button class="primary" id="cancel">סגירה</button>'}</div>
    </div>`;
    wire(b);
  };
  const wire=b=>{
    $('dlg').querySelectorAll('[data-s]').forEach(bt=>bt.onclick=()=>{
      const k=bt.dataset.s;if(k===b.status)return;const prev=b.status,p={status:k};
      if(k==='reading'&&!b.started)p.started=today();
      if(k==='read'){p.finished=today();if(b.pages)p.page=b.pages}
      if(!OUT.includes(k)&&OUT.includes(prev)){p.person='';p.due=''}
      if(prev==='want'&&k!=='want'&&shelfIdx(b.shelf)<0&&meta.shelves.length){p.shelf=meta.shelves[0].id;p.pos=nextPos(meta.shelves[0].id)}
      set(p);
      if(!isNew){if(k==='read'){confetti();toast('כל הכבוד! עכשיו אפשר לדרג אותו')}else toast(ST[k].l)}
    });
    $('dlg').querySelectorAll('[data-r]').forEach(bt=>bt.onclick=()=>{const n=+bt.dataset.r,p={rating:b.rating===n?0:n};if(p.rating&&(b.status==='shelf'||b.status==='reading')){p.status='read';p.finished=b.finished||today()}set(p)});
    const bind=(elId,key,kind,redraw)=>{const el=$(elId);if(!el)return;el.onchange=()=>{let v=el.value;if(kind==='num')v=+v||0;else if(kind==='tags')v=[...new Set(v.split(/[,،]/).map(s=>s.trim()).filter(Boolean))];else v=v.trim();if(JSON.stringify(v)===JSON.stringify(b[key]))return;const p={[key]:v};if(key==='shelf'&&!isNew)p.pos=nextPos(v);set(p,redraw)}};
    bind('fPage','page','num',true);bind('fPages','pages','num',true);bind('fPerson','person','',false);bind('fDue','due','',true);bind('fReview','review','',false);
    bind('eT','title','',!isNew);bind('eA','author','',!isNew);bind('eS','shelf','',!isNew);bind('eN','notes','',false);bind('eG','tags','tags',false);
    const ec=$('eC');if(ec)ec.onchange=()=>set({check:ec.checked},false);
    if($('eT')&&isNew)$('eT').oninput=()=>{dupOk=false;$('dupWarn').innerHTML=''};
    if($('eToggle'))$('eToggle').onclick=()=>{editing=!editing;draw();if(editing)$('eT').focus()};
    $('dlg').querySelectorAll('[data-cov]').forEach(bt=>bt.onclick=()=>{const k=bt.dataset.cov;if(b[k])showCover(b,k,removeCover,uploadCover);else if(canWrite)uploadCover(k)});
    if($('aiBtn'))$('aiBtn').onclick=identify;
    $('cancel').onclick=()=>{if(isNew)newAssets.forEach(dropAsset);close()};
    if($('ok'))$('ok').onclick=()=>{
      syncNewFields();
      if(!draft.title){$('eT').focus();return}
      const dup=books.find(x=>norm(x.title)===norm(draft.title));
      if(dup&&!dupOk){dupOk=true;$('dupWarn').innerHTML=`<div class="warnbox">כבר יש בארון ספר בשם הזה (${esc(dup.author)}, ${dup.status==='want'?'ברשימת רוצה לקרוא':esc(shelfName(dup.shelf))}). ללחוץ שוב על "הוספה לארון" כדי להוסיף בכל זאת.</div>`;return}
      draft.author=draft.author||'לא ידוע';draft.pos=nextPos(draft.shelf);
      const nid='b'+uid();writeBook(nid,draft);close();render();toast('הספר נוסף לארון',()=>{removeBook(nid);newAssets.forEach(dropAsset);render()});
    };
    if($('del'))$('del').onclick=()=>{const snap=Object.assign({},b);removeBook(id);close();render();
      toast(`"${b.title}" נמחק`,()=>{writeBook(id,snap);render()});
      setTimeout(()=>{if(!byId(id)){dropAsset(snap.front);dropAsset(snap.back)}},8000)};
  };
  const syncNewFields=()=>{if(!isNew)return;const g=i=>$(i)?$(i).value.trim():'';if($('eT'))Object.assign(draft,{title:g('eT'),author:g('eA'),shelf:$('eS')?$('eS').value:draft.shelf,notes:g('eN'),tags:[...new Set(g('eG').split(/[,،]/).map(s=>s.trim()).filter(Boolean))],check:$('eC')?$('eC').checked:false});if($('fReview'))draft.review=$('fReview').value.trim()};
  async function uploadCover(k){
    const f=await pickImage();if(!f)return;syncNewFields();
    const slot=$('dlg').querySelector(`[data-cov="${k}"]`);if(slot){slot.classList.add('busy-over');slot.dataset.busy='מעלה...'}
    try{const blob=await shrink(f);const aid=await uploadBlob(blob);const old=B()[k];if(isNew)newAssets.push(aid);set({[k]:aid});if(old)dropAsset(old);toast(assets||localMode?'התמונה נשמרה':'בתצוגה הזו התמונה לא תישמר')}
    catch(err){if(slot)slot.classList.remove('busy-over');toast('העלאת התמונה נכשלה')}
  }
  function removeCover(k){const old=B()[k];set({[k]:''});if(isNew)dropAsset(old);else toast('התמונה הוסרה',()=>{set({[k]:old})});if(!isNew)setTimeout(()=>{const cur=B();if(cur&&cur[k]!==old)dropAsset(old)},8000)}
  async function identify(){
    const f=await pickImage();if(!f)return;syncNewFields();
    const bt=$('aiBtn');bt.disabled=true;bt.textContent='מזהה את הספר...';
    try{
      const blob=await shrink(f);
      const lim=sample.limits?await sample.limits():{images:true};
      let res={};
      if(lim&&lim.images){
        res=await sample.json('זו תמונה של כריכת ספר (קדמית או שדרה). זהה את שם הספר ואת שם הסופר כפי שהם כתובים על הכריכה, בשפה המקורית שעל הכריכה (בדרך כלל עברית). אל תנחש: אם משהו לא קריא, השאר מחרוזת ריקה. החזר JSON בלבד בצורה {"title":"...","author":"...","confident":true|false}.',{images:[blob],modelTier:'default'});
      }
      const aid=await uploadBlob(blob);newAssets.push(aid);
      const p={front:aid};
      if(res&&res.title)p.title=String(res.title).trim();
      if(res&&res.author)p.author=String(res.author).trim();
      if(res&&res.title&&res.confident===false)p.check=true;
      set(p);
      toast(res&&res.title?'זיהיתי את הספר - כדאי לוודא שהפרטים נכונים':'לא הצלחתי לזהות, אפשר להקליד ידנית');
    }catch(e){bt.disabled=false;bt.textContent='צילום כריכה וזיהוי אוטומטי של הספר';toast(e&&e.code==='rate_limited'?'יותר מדי בקשות, נסה שוב בעוד רגע':'הזיהוי לא הצליח, אפשר להקליד ידנית')}
  }
  draw();$('ov').classList.add('open');
  if(isNew&&$('eT'))$('eT').focus();
}
function editFields(b,ro){
  return `<div class="field"><label for="eT">שם הספר</label><input id="eT" value="${esc(b.title)}"${ro}></div>
  <div class="field"><label for="eA">סופר/ת</label><input id="eA" value="${esc(b.author)}" list="authors"${ro}><datalist id="authors">${[...new Set(books.map(x=>x.author))].sort().map(a=>`<option value="${esc(a)}">`).join('')}</datalist></div>
  <div class="row2"><div class="field"><label for="eS">מדף</label><select id="eS"${ro}>${meta.shelves.map((s,i)=>`<option value="${s.id}"${s.id===b.shelf?' selected':''}>מדף ${i+1}</option>`).join('')}</select></div>
  <div class="field"><label for="eG">תגיות (מופרדות בפסיק)</label><input id="eG" value="${esc((b.tags||[]).join(', '))}" placeholder="היסטוריה, מתנה"${ro}></div></div>
  <div class="field"><label for="eN">הערות</label><input id="eN" value="${esc(b.notes||'')}"${ro}></div>
  <label style="display:flex;gap:8px;align-items:center;font-size:14px"><input type="checkbox" id="eC"${b.check?' checked':''}${ro}> לבדיקה (הזיהוי לא ודאי)</label>`;
}

/* ---------- pick a book ---------- */
function openPick(){
  const pool=books.filter(b=>b.status==='shelf'&&(!fShelf||b.shelf===fShelf));
  if(!pool.length){toast('אין ספרים שעוד לא נקראו');return}
  $('dlg').innerHTML=`<div class="pick"><div class="lbl">הארון בוחר בשבילך...</div><div class="big" id="pT"></div><div class="who" id="pA"></div><div class="actions" style="justify-content:center"><button id="again">ספר אחר</button><button class="primary edit-only" id="start" disabled>להתחיל לקרוא</button><button id="cancel">סגירה</button></div></div>`;
  $('ov').classList.add('open');
  let chosen;
  const spin=()=>{$('start').disabled=true;let i=0;const tick=()=>{chosen=pool[Math.floor(Math.random()*pool.length)];$('pT').textContent=chosen.title;$('pA').textContent=chosen.author;if(++i<14)setTimeout(tick,40+i*i*2);else{$('pA').textContent=chosen.author+' · '+shelfName(chosen.shelf);$('start').disabled=false}};tick()};
  $('again').onclick=spin;$('cancel').onclick=close;
  $('start').onclick=()=>{patchBook(chosen.id,{status:'reading',started:chosen.started||today()});render();toast('קריאה מהנה!');openBook(chosen.id)};
  spin();
}

/* ---------- shelves dialog ---------- */
function openShelves(){
  const draw=()=>{$('dlg').innerHTML=`<div class="dbody"><h3>ניהול מדפים</h3>${meta.shelves.map((s,i)=>`<div class="shelfrow"><span class="grow">מדף ${i+1} <small style="color:var(--muted)">${onShelf(s.id).length} ספרים</small></span><button data-up="${i}" aria-label="העברה למעלה"${i===0?' disabled':''}>▲</button><button data-dn="${i}" aria-label="העברה למטה"${i===meta.shelves.length-1?' disabled':''}>▼</button><button class="danger" data-rm="${i}" aria-label="מחיקת המדף">✕</button></div>`).join('')}
  <button id="addShelf">מדף חדש</button><div class="actions"><span class="grow"></span><button class="primary" id="done">סיום</button></div></div>`;
  const swap=(i,j)=>{[meta.shelves[i],meta.shelves[j]]=[meta.shelves[j],meta.shelves[i]];saveMeta();draw();render()};
  $('dlg').querySelectorAll('[data-up]').forEach(bt=>bt.onclick=()=>swap(+bt.dataset.up,+bt.dataset.up-1));
  $('dlg').querySelectorAll('[data-dn]').forEach(bt=>bt.onclick=()=>swap(+bt.dataset.dn,+bt.dataset.dn+1));
  $('dlg').querySelectorAll('[data-rm]').forEach(bt=>bt.onclick=()=>{const i=+bt.dataset.rm,s=meta.shelves[i],n=onShelf(s.id).length;
    if(n&&!bt.dataset.sure){bt.dataset.sure=1;bt.textContent=`${n} ספרים יעברו ל"ללא מדף" - שוב לאישור`;return}
    meta.shelves.splice(i,1);saveMeta();draw();render();toast('המדף נמחק',()=>{meta.shelves.splice(i,0,s);saveMeta();render()})});
  $('addShelf').onclick=()=>{meta.shelves.push({id:'s'+uid()});saveMeta();draw();render()};
  $('done').onclick=close;};
  draw();$('ov').classList.add('open');
}
function close(){$('ov').classList.remove('open');render()}
