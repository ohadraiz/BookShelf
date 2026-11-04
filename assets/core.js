/* BookShelf - Constants, helpers and app state shared by every other file. */
"use strict";
/* ---------- constants & helpers ---------- */
const ST={shelf:{l:'על המדף',c:'#8a7f73'},reading:{l:'בקריאה',c:'#2f7fbf'},read:{l:'קראתי',c:'#3d8a3a'},want:{l:'רוצה לקרוא',c:'#b5547a'},lent:{l:'השאלתי',c:'#d08a12'},borrowed:{l:'שאול - להחזיר',c:'#c0442f'},given:{l:'מסרתי',c:'#7b6b9a'}};
const OUT=['lent','borrowed','given'];
const PALETTE=['#7a2e2a','#2f4f6f','#3d5c3a','#5b3b6b','#8a5a1f','#1f5e5e','#6b2f45','#3f3f3f','#9c4a1a','#24476b','#5e6b2a','#7d6b55','#e8dcc4','#d9c7a0','#c9d6c8','#a33a2c'];
const LIGHT=new Set(['#e8dcc4','#d9c7a0','#c9d6c8']);
const MONTHS=['ינו','פבר','מרץ','אפר','מאי','יוני','יולי','אוג','ספט','אוק','נוב','דצמ'];
const hash=s=>{let h=0;for(const c of String(s))h=(h*31+c.charCodeAt(0))|0;return Math.abs(h)};
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,7);
const today=()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
const fmtDate=d=>d?d.split('-').reverse().join('.'):'';
const starsTxt=n=>n?'★'.repeat(n):'';
// search normalization: niqqud, geresh/quotes, double yod/vav, punctuation
const norm=s=>String(s||'').toLowerCase().replace(/[֑-ׇ]/g,'').replace(/["'`׳״.,:;!?()\[\]\-–—_\/]/g,' ').replace(/יי/g,'י').replace(/וו/g,'ו').replace(/\s+/g,' ').trim();
const FIELDS={title:'',author:'',shelf:'',pos:0,notes:'',check:false,status:'shelf',person:'',due:'',rating:0,review:'',page:0,pages:0,started:'',finished:'',front:'',back:'',tags:[]};
const clean=o=>{const r={};for(const k in FIELDS)r[k]=o[k]===undefined?(Array.isArray(FIELDS[k])?[]:FIELDS[k]):o[k];return r};

/* ---------- state ---------- */
let books=[],meta={shelves:[],goal:0},loaded={books:false,meta:false};
let view='shelves',q='',fShelf='',fStatus='',fTag='',sortKey='author',sortDir=1,arrange=false,moving=null;
let db=null,assets=null,sample=null,downloads=null,canWrite=true,memMode=false,firstPaint=true;
let localMode=false,libInfo=null;
const LS_KEY='bookshelf-local-v1';

const byId=id=>books.find(b=>b.id===id);
const shelfIdx=id=>meta.shelves.findIndex(s=>s.id===id);
const shelfName=id=>{const i=shelfIdx(id);return i<0?'ללא מדף':'מדף '+(i+1)};
const colorOf=b=>PALETTE[hash(b.author+'|'+b.shelf)%PALETTE.length];
const onShelf=id=>books.filter(b=>b.shelf===id&&b.status!=='want').sort((a,b)=>a.pos-b.pos);
const overdue=b=>b.due&&(b.status==='borrowed'||b.status==='lent')&&b.due<today();
const nextPos=sid=>{const l=onShelf(sid);return l.length?l[l.length-1].pos+1000:1000};
