const KEY='minimal_records_v1';
const $=s=>document.querySelector(s);
const form=$('#recordForm'), historyEl=$('#history');
let records=JSON.parse(localStorage.getItem(KEY)||'[]');
let monthlyChart=null;

$('#date').value=new Date().toISOString().slice(0,10);

function save(){ localStorage.setItem(KEY, JSON.stringify(records)); render(); }
function yen(n){ return new Intl.NumberFormat('ja-JP',{style:'currency',currency:'JPY',maximumFractionDigits:0}).format(n||0); }

function streakDays(){
  const days=[...new Set(records.map(r=>r.date))].sort().reverse();
  if(!days.length) return 0;
  let streak=0, d=new Date();
  for(;;){
    const key=d.toISOString().slice(0,10);
    if(days.includes(key)){ streak++; d.setDate(d.getDate()-1); }
    else if(streak===0){ d.setDate(d.getDate()-1); if(days.includes(d.toISOString().slice(0,10))) continue; return 0; }
    else break;
  }
  return streak;
}


function renderMonthlyChart(){
  const canvas=document.getElementById('monthlyChart');
  if(!canvas || typeof Chart==='undefined') return;
  const now=new Date();
  const months=[];
  for(let i=11;i>=0;i--){
    const d=new Date(now.getFullYear(), now.getMonth()-i, 1);
    const key=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
    months.push({key,label:`${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,'0')}`});
  }
  const data=months.map(m=>records.filter(r=>r.date && r.date.startsWith(m.key)).length);
  if(monthlyChart) monthlyChart.destroy();
  monthlyChart=new Chart(canvas,{
    type:'bar',
    data:{labels:months.map(m=>m.label),datasets:[{label:'手放した数',data}]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{callbacks:{label:(ctx)=>`${ctx.raw} 個`}}},scales:{y:{beginAtZero:true,ticks:{precision:0,stepSize:1}},x:{grid:{display:false}}}}
  });
}

function render(){
  const now=new Date(), ym=now.toISOString().slice(0,7);
  $('#totalCount').textContent=records.length;
  $('#monthCount').textContent=records.filter(r=>r.date.startsWith(ym)).length;
  $('#streakCount').textContent=streakDays();
  $('#salesTotal').textContent=yen(records.reduce((s,r)=>s+(Number(r.price)||0),0));
  renderMonthlyChart();

  const q=$('#search').value.trim().toLowerCase();
  const filtered=[...records].sort((a,b)=>b.date.localeCompare(a.date)||b.createdAt-a.createdAt)
    .filter(r=>[r.name,r.category,r.method,r.memo].join(' ').toLowerCase().includes(q));

  historyEl.innerHTML='';
  if(!filtered.length){ historyEl.innerHTML='<div class="empty">まだ記録がありません。</div>'; return; }
  for(const r of filtered){
    const node=$('#rowTemplate').content.cloneNode(true);
    node.querySelector('.rowTitle').textContent=r.name;
    node.querySelector('.rowMeta').textContent=`${r.date} ・ ${r.category} ・ ${r.method}`;
    node.querySelector('.rowMemo').textContent=r.memo||'';
    node.querySelector('.rowPrice').textContent=r.price?yen(r.price):'';
    node.querySelector('.deleteBtn').onclick=()=>{ if(confirm('この記録を削除しますか？')){ records=records.filter(x=>x.id!==r.id); save(); } };
    historyEl.appendChild(node);
  }
}

form.addEventListener('submit',e=>{
  e.preventDefault();
  records.push({
    id:crypto.randomUUID?crypto.randomUUID():String(Date.now()),
    name:$('#itemName').value.trim(),
    category:$('#category').value,
    method:$('#method').value,
    date:$('#date').value,
    price:Number($('#price').value||0),
    memo:$('#memo').value.trim(),
    createdAt:Date.now()
  });
  save();
  form.reset();
  $('#date').value=new Date().toISOString().slice(0,10);
  toast('記録しました');
});

$('#search').addEventListener('input',render);

$('#exportBtn').addEventListener('click',()=>{
  const blob=new Blob([JSON.stringify(records,null,2)],{type:'application/json'});
  const a=document.createElement('a'); a.href=URL.createObjectURL(blob);
  a.download=`minimal-backup-${new Date().toISOString().slice(0,10)}.json`; a.click();
  URL.revokeObjectURL(a.href);
});

function toast(msg){
  const d=document.createElement('div'); d.className='toast'; d.textContent=msg; document.body.appendChild(d);
  setTimeout(()=>d.remove(),1600);
}

if('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js');

let deferredPrompt;
window.addEventListener('beforeinstallprompt',e=>{
  e.preventDefault(); deferredPrompt=e; $('#installBtn').hidden=false;
});
$('#installBtn').addEventListener('click',async()=>{
  if(!deferredPrompt) return;
  deferredPrompt.prompt(); await deferredPrompt.userChoice; deferredPrompt=null; $('#installBtn').hidden=true;
});

render();
