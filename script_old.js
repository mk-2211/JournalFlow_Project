/* ============ ACCOUNTS & TYPES ============ */
const ACCOUNTS = {
  "Cash":"asset","Bank":"asset","Debtors":"asset","Furniture":"asset","Machinery":"asset","Building":"asset",
  "Creditors":"liability","Bank Loan":"liability",
  "Capital":"capital","Drawings":"drawings",
  "Sales":"sales",
  "Purchases":"directExp","Wages":"directExp","Carriage Inwards":"directExp",
  "Rent":"indirectExp","Salaries":"indirectExp","Electricity":"indirectExp","Interest Paid":"indirectExp",
  "Telephone":"indirectExp","Insurance":"indirectExp","Repairs":"indirectExp","Travel":"indirectExp","Groceries":"indirectExp",
  "Commission Received":"indirectInc","Interest Received":"indirectInc","Other Income":"indirectInc"
};
const TYPE_INFO = {
  asset:["Asset","Something you own. Debit to increase. Shown on the Balance Sheet (right side)."],
  liability:["Liability","Something you owe. Credit to increase. Shown on the Balance Sheet (left side)."],
  capital:["Capital","Owner's investment in the business. Credit to increase."],
  drawings:["Drawings","Owner's personal withdrawals. Debit to increase. Reduces capital."],
  sales:["Sales (income)","Revenue from selling goods. Credit to increase. Goes to the Trading Account."],
  directExp:["Direct expense","Cost of making or buying what you sell. Debit to increase. Trading Account."],
  indirectExp:["Indirect expense","Running costs. Debit to increase. Profit & Loss Account."],
  indirectInc:["Other income","Income apart from sales. Credit to increase. Profit & Loss Account."]
};
const TEMPLATES = [
  ["Owner invests cash","Cash","Capital"],["Buy goods for cash","Purchases","Cash"],["Buy goods on credit","Purchases","Creditors"],
  ["Cash sale","Cash","Sales"],["Credit sale","Debtors","Sales"],["Pay rent","Rent","Cash"],["Pay salary","Salaries","Cash"],
  ["Pay electricity bill","Electricity","Cash"],["Buy furniture","Furniture","Cash"],["Owner withdraws cash","Drawings","Cash"],
  ["Deposit cash in bank","Bank","Cash"],["Take bank loan","Bank","Bank Loan"],["Groceries (personal budget)","Groceries","Cash"]
];

/* ============ DATA ============ */
let entries=[], budgets={};
try{entries=JSON.parse(localStorage.getItem("journalflow"))||[]}catch(e){entries=[]}
try{budgets=JSON.parse(localStorage.getItem("journalflow_budgets"))||{}}catch(e){budgets={}}
const save=()=>{try{localStorage.setItem("journalflow",JSON.stringify(entries));localStorage.setItem("journalflow_budgets",JSON.stringify(budgets))}catch(e){}};

const $=id=>document.getElementById(id);
const money=n=>"₹"+n.toLocaleString("en-IN",{minimumFractionDigits:2,maximumFractionDigits:2});
const plain=n=>n.toLocaleString("en-IN",{minimumFractionDigits:2,maximumFractionDigits:2});
const esc=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const sum=l=>l.reduce((t,x)=>t+x,0);
const today=()=>new Date().toISOString().slice(0,10);

let toastTimer;
function toast(msg,err){const t=$("toast");t.textContent=msg;t.className="toast show"+(err?" err":"");clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.className="toast",2800)}

/* ============ LEDGER ENGINE ============ */
function buildLedgers(){
  const L={};const get=n=>L[n]||(L[n]={lines:[],dr:0,cr:0});
  for(const e of entries){
    const d=get(e.debit),c=get(e.credit);
    d.dr+=e.amount;d.lines.push({date:e.date,other:e.credit,dr:e.amount,cr:0});
    c.cr+=e.amount;c.lines.push({date:e.date,other:e.debit,dr:0,cr:e.amount});
  }
  return L;
}
const net=l=>l.dr-l.cr;
const totalOfType=(L,t,s)=>sum(Object.keys(L).filter(n=>ACCOUNTS[n]===t).map(n=>s*net(L[n])));
const listOfType=(L,t,s)=>Object.keys(L).filter(n=>ACCOUNTS[n]===t).map(n=>[n,s*net(L[n])]);
const rowsHtml=l=>l.map(([n,v])=>`<tr><td>${esc(n)}</td><td class="num">${plain(v)}</td></tr>`).join("");

function figures(L){
  const sales=totalOfType(L,"sales",-1),direct=totalOfType(L,"directExp",1),gp=sales-direct;
  const inc=totalOfType(L,"indirectInc",-1),exp=totalOfType(L,"indirectExp",1),np=gp+inc-exp;
  const capital=totalOfType(L,"capital",-1)-totalOfType(L,"drawings",1)+np;
  const liabs=listOfType(L,"liability",-1),assets=listOfType(L,"asset",1);
  return {sales,direct,gp,inc,exp,np,capital,liabs,assets,totalA:sum(assets.map(x=>x[1])),totalL:capital+sum(liabs.map(x=>x[1]))};
}

/* ============ RENDERERS ============ */
function renderJournal(){
  const q=($("jsearch").value||"").toLowerCase();
  const list=entries.map((e,i)=>({e,i})).filter(({e})=>!q||(e.narration||"").toLowerCase().includes(q)||e.debit.toLowerCase().includes(q)||e.credit.toLowerCase().includes(q));
  if(!list.length){$("journalOut").innerHTML=`<p class="empty">${entries.length?"No entries match your search.":"No entries yet. Go to Add Entry or load the sample data."}</p>`;return}
  $("journalOut").innerHTML=`<table><thead><tr><th>#</th><th>Date</th><th>Particulars</th><th class="num">Debit</th><th class="num">Credit</th><th>Narration</th><th class="no-print"></th></tr></thead><tbody>`+
  list.map(({e,i})=>`<tr><td>${i+1}</td><td>${esc(e.date)}</td>
   <td>${esc(e.debit)} A/c &nbsp;<b>Dr</b><br>&nbsp;&nbsp;&nbsp;&nbsp;To ${esc(e.credit)} A/c</td>
   <td class="num">${plain(e.amount)}<br>&nbsp;</td><td class="num">&nbsp;<br>${plain(e.amount)}</td>
   <td>${esc(e.narration||"")}</td><td class="no-print"><button class="btn danger sm" data-del="${i}" aria-label="Delete entry ${i+1}">Delete</button></td></tr>`).join("")+`</tbody></table>`;
}

function renderLedgers(L){
  const names=Object.keys(L),f=$("ledgerFilter");
  const cur=f.value;f.innerHTML=`<option value="">All accounts</option>`+names.map(n=>`<option ${n===cur?"selected":""}>${esc(n)}</option>`).join("");
  if(!names.length){$("ledgerOut").innerHTML='<div class="card"><p class="empty">Ledgers appear here after your first entry.</p></div>';return}
  const show=f.value?[f.value]:names;
  $("ledgerOut").innerHTML=show.map(name=>{
    let run=0;
    const rows=L[name].lines.map(l=>{run+=l.dr-l.cr;
      return `<tr><td>${esc(l.date)}</td><td>${l.dr?"To":"By"} ${esc(l.other)}</td><td class="num">${l.dr?plain(l.dr):""}</td><td class="num">${l.cr?plain(l.cr):""}</td><td class="num">${plain(Math.abs(run))} ${run>=0?"Dr":"Cr"}</td></tr>`}).join("");
    return `<div class="card ledger hover"><h3>${esc(name)} Account <span class="pill">${TYPE_INFO[ACCOUNTS[name]][0]}</span></h3><div class="scroll"><table><thead><tr><th>Date</th><th>Particulars</th><th class="num">Debit</th><th class="num">Credit</th><th class="num">Balance</th></tr></thead><tbody>${rows}</tbody></table></div></div>`}).join("");
}

function renderTrial(L){
  const names=Object.keys(L);
  if(!names.length){$("trialOut").innerHTML='<p class="empty">The trial balance appears after your first entry.</p>';return}
  let dr=0,cr=0;
  const rows=names.map(n=>{const b=net(L[n]);if(b>=0)dr+=b;else cr+=-b;
    return `<tr><td>${esc(n)}</td><td class="num">${b>0?plain(b):""}</td><td class="num">${b<0?plain(-b):""}</td></tr>`}).join("");
  const ok=Math.abs(dr-cr)<0.005;
  $("trialOut").innerHTML=`<table><thead><tr><th>Account</th><th class="num">Debit</th><th class="num">Credit</th></tr></thead><tbody>${rows}<tr class="total"><td>Total</td><td class="num">${plain(dr)}</td><td class="num">${plain(cr)}</td></tr></tbody></table>
  <div class="status ${ok?"ok":"err"}">${ok?"✔ Trial balance tallies: debit equals credit.":"✖ Trial balance does not tally."}</div>`;
}

function renderPL(L,F){
  $("plOut").innerHTML=`<div class="grid two">
   <div class="card hover"><h3>Trading Account</h3><div class="scroll"><table><tbody>
    ${rowsHtml(listOfType(L,"sales",-1))}
    ${rowsHtml(listOfType(L,"directExp",1).map(([n,v])=>["Less: "+n,v]))}
    <tr class="total"><td>${F.gp>=0?"Gross profit":"Gross loss"}</td><td class="num">${plain(Math.abs(F.gp))}</td></tr></tbody></table></div></div>
   <div class="card hover"><h3>Profit &amp; Loss Account</h3><div class="scroll"><table><tbody>
    <tr><td>Gross profit brought down</td><td class="num">${plain(F.gp)}</td></tr>
    ${rowsHtml(listOfType(L,"indirectInc",-1).map(([n,v])=>["Add: "+n,v]))}
    ${rowsHtml(listOfType(L,"indirectExp",1).map(([n,v])=>["Less: "+n,v]))}
    <tr class="total"><td>${F.np>=0?"Net profit":"Net loss"}</td><td class="num">${plain(Math.abs(F.np))}</td></tr></tbody></table></div></div></div>`;
}

function renderBS(F){
  const ok=Math.abs(F.totalL-F.totalA)<0.005;
  $("bsOut").innerHTML=`<div class="grid two">
   <div class="card hover"><h3>Liabilities &amp; Capital</h3><div class="scroll"><table><tbody>
    <tr><td>Capital (after profit and drawings)</td><td class="num">${plain(F.capital)}</td></tr>${rowsHtml(F.liabs)}
    <tr class="total"><td>Total</td><td class="num">${plain(F.totalL)}</td></tr></tbody></table></div></div>
   <div class="card hover"><h3>Assets</h3><div class="scroll"><table><tbody>${rowsHtml(F.assets)}
    <tr class="total"><td>Total</td><td class="num">${plain(F.totalA)}</td></tr></tbody></table></div></div></div>
   <div class="status ${ok?"ok":"err"}">${ok?"✔ Balance sheet tallies: assets equal liabilities plus capital.":"✖ Balance sheet does not tally. Check that each account is placed in the right type."}</div>`;
}

/* ---- Dashboard ---- */
const COLORS=["#e6b450","#4c8dff","#3ecf8e","#ff6b6b","#b58cff","#4dd0e1","#f5a524","#ff8fd0"];
function renderDashboard(L,F){
  const cashBank=sum(F.assets.filter(([n])=>n==="Cash"||n==="Bank").map(x=>x[1]));
  const k=[["Total sales",F.sales,"💰","Revenue earned from sales",""],
           [F.np>=0?"Net profit":"Net loss",F.np,"📈","After all expenses",F.np>=0?"pos":"neg"],
           ["Cash &amp; bank",cashBank,"💵","Money you can use now",""],
           ["Total assets",F.totalA,"🏢","Everything you own",""],
           ["Total liabilities",sum(F.liabs.map(x=>x[1])),"📉","Everything you owe",""]];
  $("kpis").innerHTML=k.map(([l,v,ic,s,c])=>`<div class="card hover kpi"><div class="lbl"><span>${l}</span><span>${ic}</span></div><div class="val ${c}" data-count="${v}">${money(0)}</div><div class="sub">${s}</div></div>`).join("");
  document.querySelectorAll("[data-count]").forEach(el=>{const to=parseFloat(el.dataset.count),t0=performance.now();
    (function step(t){const p=Math.min(1,(t-t0)/900),e=1-Math.pow(1-p,3);el.textContent=money(to*e);if(p<1)requestAnimationFrame(step)})(t0)});

  const items=[["Sales",F.sales,"#3ecf8e"],["Other income",F.inc,"#4c8dff"],["Direct costs",F.direct,"#f5a524"],["Other expenses",F.exp,"#ff6b6b"]];
  const mx=Math.max(1,...items.map(i=>Math.abs(i[1])));
  $("chartBars").innerHTML=entries.length?`<div class="bars">${items.map(([n,v,c])=>`<div class="bar"><span>${plain(v)}</span><i style="height:${Math.max(2,Math.abs(v)/mx*160)}px;background:linear-gradient(180deg,${c},${c}88)"></i></div>`).join("")}</div><div class="bar-names">${items.map(i=>`<div>${i[0]}</div>`).join("")}</div>`:'<p class="empty">Add entries to see this chart.</p>';

  const ex=[...listOfType(L,"directExp",1),...listOfType(L,"indirectExp",1)].filter(x=>x[1]>0);
  const tot=sum(ex.map(x=>x[1]));
  if(!tot){$("chartDonut").innerHTML='<p class="empty">No expenses recorded yet.</p>'}
  else{let off=0;const R=60,C=2*Math.PI*R;
    const arcs=ex.map(([n,v],i)=>{const len=v/tot*C;const s=`<circle r="${R}" cx="80" cy="80" fill="none" stroke="${COLORS[i%8]}" stroke-width="26" stroke-dasharray="${len} ${C-len}" stroke-dashoffset="${-off}" transform="rotate(-90 80 80)"><animate attributeName="stroke-dasharray" from="0 ${C}" to="${len} ${C-len}" dur="1s" fill="freeze"/></circle>`;off+=len;return s}).join("");
    $("chartDonut").innerHTML=`<div class="donut-wrap"><svg width="170" height="170" viewBox="0 0 160 160" role="img" aria-label="Expense breakdown">${arcs}<text x="80" y="76" text-anchor="middle" fill="#8fa0b8" font-size="10">Total</text><text x="80" y="94" text-anchor="middle" fill="#fff" font-size="13" font-weight="700">${plain(tot)}</text></svg>
    <div class="legend">${ex.map(([n,v],i)=>`<div><b style="background:${COLORS[i%8]}"></b>${esc(n)} · ${(v/tot*100).toFixed(0)}%</div>`).join("")}</div></div>`}

  const as=F.assets.filter(x=>x[1]>0),am=Math.max(1,...as.map(x=>x[1]));
  $("chartAssets").innerHTML=as.length?as.map(([n,v],i)=>`<div class="bud"><div class="top"><span>${esc(n)}</span><b>${money(v)}</b></div><div class="prog"><i style="width:${v/am*100}%;background:${COLORS[i%8]}"></i></div></div>`).join(""):'<p class="empty">No assets yet.</p>';

  $("recent").innerHTML=entries.length?`<div class="scroll"><table><tbody>${entries.slice(-5).reverse().map(e=>`<tr><td>${esc(e.date)}</td><td>${esc(e.debit)} → ${esc(e.credit)}</td><td class="num">${plain(e.amount)}</td></tr>`).join("")}</tbody></table></div>`:'<p class="empty">Nothing here yet.</p>';
}

/* ---- Budget ---- */
function renderBudget(){
  const exp=Object.keys(ACCOUNTS).filter(n=>["directExp","indirectExp"].includes(ACCOUNTS[n]));
  const sel=$("bAcc");if(!sel.options.length)sel.innerHTML=exp.map(n=>`<option>${n}</option>`).join("");
  const m=$("bMonth").value||today().slice(0,7);
  const keys=Object.keys(budgets);
  if(!keys.length){$("budgetOut").innerHTML='<p class="empty">No budgets yet. Set one on the left.</p>';return}
  $("budgetOut").innerHTML=keys.map(n=>{
    const spent=sum(entries.filter(e=>e.date.slice(0,7)===m).map(e=>(e.debit===n?e.amount:0)-(e.credit===n?e.amount:0)));
    const pct=spent/budgets[n]*100,c=pct>=100?"var(--bad)":pct>=80?"var(--warn)":"var(--good)";
    return `<div class="bud"><div class="top"><b>${esc(n)}</b><span>${money(spent)} of ${money(budgets[n])} <span style="color:${c}">(${pct.toFixed(0)}%)</span></span></div>
      <div class="prog"><i style="width:${Math.min(100,pct)}%;background:${c}"></i></div>
      <div class="row" style="justify-content:space-between;margin-top:6px"><span class="tip">${pct>=100?"Over budget by "+money(spent-budgets[n]):"Remaining "+money(budgets[n]-spent)}</span><button class="btn danger sm no-print" data-delbud="${esc(n)}">Remove</button></div></div>`}).join("");
}

function render(){
  const L=buildLedgers(),F=figures(L);
  renderJournal();renderLedgers(L);renderTrial(L);renderPL(L,F);renderBS(F);renderBudget();renderDashboard(L,F);
}

/* ============ NAVIGATION ============ */
const PAGES=[...document.querySelectorAll(".page")].map(p=>p.id.replace("page-",""));
function showPage(p){
  if(!PAGES.includes(p))p="dashboard";
  document.querySelectorAll(".page").forEach(s=>s.classList.toggle("active",s.id==="page-"+p));
  document.querySelectorAll(".sidebar a").forEach(a=>a.classList.toggle("active",a.dataset.page===p));
  $("sidebar").classList.remove("open");window.scrollTo(0,0);
  if(p==="dashboard")render();
  try{history.replaceState(null,"","#"+p)}catch(e){}
}
function go(){showPage(location.hash.slice(1))}
document.querySelectorAll(".sidebar a").forEach(a=>a.addEventListener("click",ev=>{ev.preventDefault();showPage(a.dataset.page)}));
window.addEventListener("hashchange",go);
$("burger").onclick=()=>$("sidebar").classList.toggle("open");

/* ============ ENTRY FORM ============ */
function fillDropdowns(){
  const o=Object.keys(ACCOUNTS).map(n=>`<option>${n}</option>`).join("");
  $("debit").innerHTML=o;$("credit").innerHTML=o;$("credit").selectedIndex=1;hints();
  $("templates").innerHTML=TEMPLATES.map((t,i)=>`<button type="button" class="chip" data-tpl="${i}">${t[0]}</button>`).join("");
  $("typeGlossary").innerHTML=Object.entries(TYPE_INFO).map(([k,[n,d]])=>`<dt>${n}</dt><dd>${d}<br><span class="tip">Examples: ${Object.keys(ACCOUNTS).filter(a=>ACCOUNTS[a]===k).join(", ")}</span></dd>`).join("");
}
function hints(){
  $("debitHint").textContent=TYPE_INFO[ACCOUNTS[$("debit").value]][1];
  $("creditHint").textContent=TYPE_INFO[ACCOUNTS[$("credit").value]][1];
}
$("debit").onchange=$("credit").onchange=hints;
$("templates").addEventListener("click",ev=>{const i=ev.target.dataset.tpl;if(i===undefined)return;
  $("debit").value=TEMPLATES[i][1];$("credit").value=TEMPLATES[i][2];$("narration").value=TEMPLATES[i][0];hints();$("amount").focus()});

$("entryForm").addEventListener("submit",ev=>{ev.preventDefault();
  const debit=$("debit").value,credit=$("credit").value,amount=parseFloat($("amount").value);
  if(debit===credit)return toast("Debit and credit accounts must be different.",true);
  if(!(amount>0))return toast("Enter an amount greater than zero.",true);
  entries.push({date:$("date").value,debit,credit,amount,narration:$("narration").value.trim()});
  save();render();$("amount").value="";$("narration").value="";toast("Entry saved. All reports updated ✔");
});
$("journalOut").addEventListener("click",ev=>{const i=ev.target.dataset.del;
  if(i!==undefined){entries.splice(Number(i),1);save();render();toast("Entry deleted.")}});
$("jsearch").addEventListener("input",renderJournal);
$("ledgerFilter").addEventListener("change",()=>renderLedgers(buildLedgers()));

$("sampleBtn").onclick=()=>{const d=today();
  entries=[
    {date:d,debit:"Cash",credit:"Capital",amount:100000,narration:"Started business"},
    {date:d,debit:"Furniture",credit:"Cash",amount:20000,narration:"Bought furniture"},
    {date:d,debit:"Purchases",credit:"Cash",amount:30000,narration:"Bought goods"},
    {date:d,debit:"Cash",credit:"Sales",amount:50000,narration:"Cash sales"},
    {date:d,debit:"Rent",credit:"Cash",amount:5000,narration:"Paid shop rent"},
    {date:d,debit:"Wages",credit:"Cash",amount:3000,narration:"Paid wages"},
    {date:d,debit:"Purchases",credit:"Creditors",amount:10000,narration:"Goods on credit"},
    {date:d,debit:"Electricity",credit:"Cash",amount:2000,narration:"Electricity bill"}];
  budgets={"Rent":6000,"Electricity":1500,"Wages":4000};
  save();render();toast("Sample data loaded.");showPage("dashboard")};
$("clearBtn").onclick=()=>{if(confirm("Delete all journal entries and budgets?")){entries=[];budgets={};save();render();toast("All data cleared.")}};

/* ============ BUDGET FORM ============ */
$("budgetForm").addEventListener("submit",ev=>{ev.preventDefault();
  budgets[$("bAcc").value]=parseFloat($("bAmt").value);save();$("bAmt").value="";render();toast("Budget set ✔")});
$("budgetOut").addEventListener("click",ev=>{const n=ev.target.dataset.delbud;if(n){delete budgets[n];save();render()}});
$("bMonth").addEventListener("change",renderBudget);

/* ============ EXPORT ============ */
function download(name,text,type){const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([text],{type}));a.download=name;a.click();URL.revokeObjectURL(a.href)}
$("expCsv").onclick=()=>{if(!entries.length)return toast("No entries to export.",true);
  const q=s=>'"'+String(s).replace(/"/g,'""')+'"';
  download("journal.csv",["Date,Debit,Credit,Amount,Narration",...entries.map(e=>[e.date,q(e.debit),q(e.credit),e.amount,q(e.narration||"")].join(","))].join("\n"),"text/csv");toast("CSV downloaded.")};
$("expJson").onclick=()=>{download("journalflow-backup.json",JSON.stringify({entries,budgets},null,2),"application/json");toast("Backup downloaded.")};
$("impBtn").onclick=()=>$("impFile").click();
$("impFile").onchange=ev=>{const f=ev.target.files[0];if(!f)return;const r=new FileReader();
  r.onload=()=>{try{const d=JSON.parse(r.result);if(!Array.isArray(d.entries))throw 0;entries=d.entries;budgets=d.budgets||{};save();render();toast("Backup restored ✔")}catch(e){toast("That file is not a valid backup.",true)}};r.readAsText(f);ev.target.value=""};
document.querySelectorAll("[data-print]").forEach(b=>b.onclick=()=>{showPage(b.dataset.print);setTimeout(()=>window.print(),400)});

/* ============ START ============ */
$("date").value=today();$("bMonth").value=today().slice(0,7);
fillDropdowns();render();go();
