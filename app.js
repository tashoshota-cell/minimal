const STORAGE_KEY='minimal_records_v3';

function loadRecords(){
  const preferred=[STORAGE_KEY,'minimal_records','minimalRecords','minimal-v1-records','minimal_records_v1','minimal'];
  for(const key of preferred){
    try{
      const v=JSON.parse(localStorage.getItem(key)||'null');
      if(Array.isArray(v) && (v.length===0 || typeof v[0]==='object')) return {key,records:v};
    }catch(e){}
  }
  // v1/v2の保存キーが違っても、配列形式の記録データを自動検出する
  for(let i=0;i<localStorage.length;i++){
    const key=localStorage.key(i);
    try{
      const v=JSON.parse(localStorage.getItem(key));
      if(Array.isArray(v) && v.some(x=>x && typeof x==='object' && ('date' in x || 'name' in x))){
        return {key,records:v};
      }
    }catch(e){}
  }
  return {key:STORAGE_KEY,records:[]};
}
let loaded=loadRecords();
let records=loaded.records;
const $=s=>document.querySelector(s);
const yen=n=>'¥'+Number(n||0).toLocaleString('ja-JP');
const today=()=>new Date().toISOString().slice(0,10);
$('#date').value=today();

function save(){
  localStorage.setItem(loaded.key||STORAGE_KEY,JSON.stringify(records));
  localStorage.setItem(STORAGE_KEY,JSON.stringify(records)); // v3にも複製
}
function norm(r){
  return {
    id:r.id||crypto.randomUUID?.()||String(Date.now()+Math.random()),
    name:r.name||r.item||r.title||'名称なし',
    category:r.category||r.cat||'その他',
    method:r.method||r.how||'その他',
    date:r.date||r.createdAt?.slice?.(0,10)||today(),
    price:Number(r.price||r.amount||0),
    memo:r.memo||r.note||''
  };
}
records=records.map(norm);

function streak(){
  const dates=[...new Set(records.map(r=>r.date))].sort().reverse();
  if(!dates.length)return 0;
  let n=0,d=new Date();
  const fmt=x=>x.toISOString().slice(0,10);
  if(dates[0]!==fmt(d)){
    d.setDate(d.getDate()-1);
    if(dates[0]!==fmt(d))return 0;
  }
  for(const x of dates){
    if(x===fmt(d)){n++;d.setDate(d.getDate()-1)}else break;
  }
  return n;
}

function renderChart(){
  const root=$('#monthlyChart'); root.innerHTML='';
  const now=new Date(), months=[];
  for(let i=11;i>=0;i--){
    const d=new Date(now.getFullYear(),now.getMonth()-i,1);
    const key=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
    months.push({key,label:`${d.getMonth()+1}月`});
  }
  const vals=months.map(m=>records.filter(r=>String(r.date).startsWith(m.key)).length);
  const max=Math.max(1,...vals);
  const bars=document.createElement('div'); bars.className='chartBars';
  months.forEach((m,i)=>{
    const col=document.createElement('div'); col.className='chartCol';
    const value=document.createElement('div'); value.className='chartValue'; value.textContent=vals[i]||'';
    const track=document.createElement('div'); track.className='chartTrack';
    const bar=document.createElement('div'); bar.className='chartBar';
    bar.style.height=vals[i]?`${Math.max(8,vals[i]/max*100)}%`:'0';
    bar.title=`${m.key}: ${vals[i]}個`;
    const label=document.createElement('div'); label.className='chartLabel'; label.textContent=m.label;
    track.appendChild(bar); col.append(value,track,label); bars.appendChild(col);
  });
  root.appendChild(bars);
}

function render(){
  const ym=today().slice(0,7);
  $('#total').textContent=records.length;
  $('#month').textContent=records.filter(r=>r.date.startsWith(ym)).length;
  $('#streak').textContent=streak();
  $('#sales').textContent=yen(records.reduce((s,r)=>s+r.price,0));
  renderChart();
  const q=$('#search').value.trim().toLowerCase();
  const list=records.filter(r=>JSON.stringify(r).toLowerCase().includes(q)).sort((a,b)=>b.date.localeCompare(a.date));
  const h=$('#history'); h.innerHTML='';
  if(!list.length){h.innerHTML='<div class="empty">まだ記録がありません。</div>';return}
  list.forEach(r=>{
    const el=document.createElement('div'); el.className='row';
    el.innerHTML=`<div class="rowTop"><div><div class="rowName"></div><div class="meta"></div></div><button class="delete">削除</button></div>`;
    el.querySelector('.rowName').textContent=r.name;
    el.querySelector('.meta').textContent=[r.date,r.category,r.method,r.price?yen(r.price):''].filter(Boolean).join(' ・ ');
    el.querySelector('.delete').onclick=()=>{records=records.filter(x=>x.id!==r.id);save();render()};
    h.appendChild(el);
  });
}
$('#form').addEventListener('submit',e=>{
  e.preventDefault();
  records.push(norm({name:$('#name').value.trim(),category:$('#category').value,method:$('#method').value,date:$('#date').value,price:$('#price').value,memo:$('#memo').value}));
  save(); e.target.reset(); $('#date').value=today(); $('#price').value=0; render();
});
$('#search').addEventListener('input',render);
$('#exportBtn').onclick=()=>{
  const blob=new Blob([JSON.stringify(records,null,2)],{type:'application/json'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`minimal-${today()}.json`;a.click();URL.revokeObjectURL(a.href);
};
let deferredPrompt;
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredPrompt=e;$('#installBtn').hidden=false});
$('#installBtn').onclick=async()=>{if(deferredPrompt){deferredPrompt.prompt();deferredPrompt=null;$('#installBtn').hidden=true}};
if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js?v=3').catch(()=>{});
render();