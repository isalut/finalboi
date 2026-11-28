const DENOMS = [2000,500,200,100,50,20,10,5].map((v)=>({id:"n"+v,value:v,type:"Note"}))
  .concat([20,10,5,2,1].map((v)=>({id:"c"+v,value:v,type:"Coin"})));
const IMG = {matched:"lakshmi-matched.jpg", short:"lakshmi-short.jpg", excess:"lakshmi-excess.jpg"};
const FACE = {matched:"center 22%", short:"center 42%", excess:"center 30%"};
const KEY = "boi-cashbook-v2";
const MON = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const $ = (id) => document.getElementById(id);
const inr = new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR",maximumFractionDigits:0});
const fmt = (n) => inr.format(n);
const sfmt = (n) => (n<0?"-":"")+fmt(Math.abs(n));
const L = (n) => n.toLocaleString("en-IN");
const num = (v) => { const d=String(v).replace(/[^0-9]/g,""); return d?parseInt(d,10):0; };
const pad = (n) => String(n).padStart(2,"0");
const todayISO = () => { const d=new Date(); return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`; };
const label = (iso) => { const [y,m,d]=iso.split("-"); return `${d}-${MON[m-1]}-${y}`; };
const blank = () => Object.fromEntries(DENOMS.map((d)=>[d.id,{i:0,s:0}]));
const newDay = (date) => ({date,opening:0,paid:0,recv:0,finacle:0,safe:blank(),counter:blank()});

/* Data lives in the phone's own storage (survives closing the app) */
let store = {days:{}}, storageOk = true;
try { store = JSON.parse(localStorage.getItem(KEY)) || {days:{}}; } catch (e) { storageOk = false; }
store.days = store.days || {};
const persist = () => { try { localStorage.setItem(KEY, JSON.stringify(store)); storageOk = true; } catch (e) { storageOk = false; } };
const load = (date) => store.days[date] ? JSON.parse(JSON.stringify(store.days[date])) : newDay(date);
let tab = (store.last && store.last.tab) || "safe";
let day = load((store.last && store.last.date) || todayISO());   // reopen exactly where you left off

function tot(c) {
  let issuable=0, soil=0, coins=0, pcs=0;
  for (const x of DENOMS) { const q=c[x.id]; pcs+=q.i+q.s; if (x.type==="Coin") coins+=q.i*x.value; else { issuable+=q.i*x.value; soil+=q.s*x.value; } }
  return {issuable,soil,coins,pcs,total:issuable+soil+coins};
}
function calc() {
  const s=tot(day.safe), c=tot(day.counter);
  return {s,c,hand:s.total+c.total,balance:day.opening+day.recv-day.paid};
}
function save() {
  const k=calc();
  if (day.opening||day.paid||day.recv||day.finacle||k.hand) store.days[day.date]=day; else delete store.days[day.date];
  store.last = {date:day.date, tab};
  persist();
}
window.addEventListener("pagehide", persist);
document.addEventListener("visibilitychange", () => { if (document.hidden) persist(); });

const fit = (el) => { const n=el.value.length;
  el.style.fontSize = el.classList.contains("cb-input") ? (n<=7?"1.4rem":n===8?"1.2rem":"1rem") : (n<=4?"1rem":n===5?"0.88rem":n===6?"0.76rem":"0.66rem"); };

/* Amount in words (Indian numbering) */
const ON=["","One","Two","Three","Four","Five","Six","Seven","Eight","Nine","Ten","Eleven","Twelve","Thirteen","Fourteen","Fifteen","Sixteen","Seventeen","Eighteen","Nineteen"];
const TN=["","","Twenty","Thirty","Forty","Fifty","Sixty","Seventy","Eighty","Ninety"];
const two = (n) => n<20 ? ON[n] : TN[Math.floor(n/10)]+(n%10?" "+ON[n%10]:"");
function words(n) {
  if (!n) return "Zero";
  const p=[], cr=Math.floor(n/1e7), lk=Math.floor(n%1e7/1e5), th=Math.floor(n%1e5/1e3), hu=Math.floor(n%1e3/100), r=n%100;
  if (cr) p.push(words(cr)+" Crore"); if (lk) p.push(two(lk)+" Lakh"); if (th) p.push(two(th)+" Thousand");
  if (hu) p.push(ON[hu]+" Hundred"); if (r) p.push(two(r)); return p.join(" ");
}

function renderCount() {
  const el=$("denomination-list"); el.innerHTML=""; if (tab==="book") return;
  const counts=day[tab]; let last=null;
  for (const x of DENOMS) {
    if (x.type!==last) { last=x.type; const t=document.createElement("div"); t.className="section-title";
      t.innerHTML = x.type==="Note" ? '<span>Notes</span><span>Issuable</span><span>Soil</span><span class="r">Amount</span>' : '<span>Coins</span><span class="w">Count</span><span class="r">Amount</span>';
      el.appendChild(t); }
    const row=document.createElement("div"); row.className="denom-row";
    row.innerHTML=`<div class="col-denom"><span class="denom-label">\u20B9${x.value}</span></div>`;
    const amt=document.createElement("div"); amt.className="col-amount line-total";
    const refresh=()=>{ const q=counts[x.id]; amt.innerHTML=`<span>${fmt((q.i+q.s)*x.value)}</span><span class="line-pcs">${q.i+q.s} pcs</span>`; };
    const mk=(f,cls)=>{ const i=document.createElement("input"); i.type="text"; i.inputMode="numeric"; i.className="qty-input "+cls; i.placeholder="0";
      i.value=counts[x.id][f]||""; fit(i);
      i.addEventListener("input",()=>{ const v=num(i.value); i.value=v||""; fit(i); counts[x.id][f]=v; save(); refresh(); render(); }); return i; };
    if (x.type==="Coin") row.append(mk("i","col-wide"), amt); else row.append(mk("i","col-count"), mk("s","col-count"), amt);
    refresh(); el.appendChild(row);
  }
}
function parts() { // totals across safe + counter
  const r={notes:[],coins:[],ni:0,ns:0,na:0,ca:0,cp:0};
  for (const x of DENOMS) { const a=day.safe[x.id], b=day.counter[x.id], iss=a.i+b.i, soil=a.s+b.s, amt=(iss+soil)*x.value;
    if (x.type==="Note") { r.notes.push({x,iss,soil,amt}); r.ni+=iss; r.ns+=soil; r.na+=amt; }
    else { r.coins.push({x,iss,soil:0,amt}); r.cp+=iss; r.ca+=amt; } }
  return r;
}
function renderTotals() {
  const p=parts(), k=calc(), d=(v)=>v?L(v):"\u2013";
  const line=(r)=>`<tr><td>\u20B9${r.x.value}</td><td>${d(r.iss)}</td><td>${d(r.soil)}</td><td>${L(r.iss+r.soil)}</td><td class="amt">${fmt(r.amt)}</td></tr>`;
  let rows='<tr class="sec"><td colspan="5">Notes</td></tr>'+p.notes.map(line).join("");
  rows+=`<tr class="sub"><td>Total Notes</td><td>${L(p.ni)}</td><td>${L(p.ns)}</td><td>${L(p.ni+p.ns)}</td><td class="amt">${fmt(p.na)}</td></tr>`;
  rows+='<tr class="sec"><td colspan="5">Coins</td></tr>'+p.coins.map(line).join("");
  rows+=`<tr class="sub"><td>Total Coins</td><td>${L(p.cp)}</td><td>\u2013</td><td>${L(p.cp)}</td><td class="amt">${fmt(p.ca)}</td></tr>`;
  $("tot-table").innerHTML=`<div class="tbl-wrap"><table class="pro-table"><thead><tr><th>Denom</th><th>Issuable</th><th>Soiled</th><th>Total</th><th class="amt">Amount</th></tr></thead><tbody>${rows}</tbody>
    <tfoot><tr><td>Total Cash</td><td>${L(p.ni+p.cp)}</td><td>${L(p.ns)}</td><td>${L(p.ni+p.ns+p.cp)}</td><td class="amt">${fmt(k.hand)}</td></tr></tfoot></table></div>
    <div class="chips"><div><span>Safe</span><strong>${fmt(k.s.total)}</strong></div><div><span>Counter</span><strong>${fmt(k.c.total)}</strong></div></div>`;
}
function render() {
  const k=calc(), isBook=tab==="book", t=isBook?null:(tab==="safe"?k.s:k.c);
  for (const n of ["safe","counter","book"]) $("tab-"+n).classList.toggle("active", tab===n);
  $("book-section").classList.toggle("hidden", !isBook); $("count-section").classList.toggle("hidden", isBook);
  $("split-row").classList.toggle("hidden", isBook);
  $("hdr-date").textContent=label(day.date);
  $("session-label").textContent = isBook ? "CASH IN HAND" : tab==="safe" ? "CASH IN SAFE" : "CASH AT COUNTER";
  $("session-total").textContent = fmt(isBook ? k.hand : t.total);
  $("session-pieces").textContent = isBook ? "Cash balance "+sfmt(k.balance) : t.pcs+" pcs";
  if (t) { $("sum-issuable").textContent=fmt(t.issuable); $("sum-soil").textContent=fmt(t.soil); $("sum-coins").textContent=fmt(t.coins); }
  $("cb-hand").textContent=fmt(k.hand); $("cb-balance").textContent=sfmt(k.balance);
  if (isBook) renderTotals();
}
const BOOKF = [["cb-opening","opening"],["cb-paid","paid"],["cb-recv","recv"],["cb-finacle","finacle"]];
function syncInputs() {
  $("cb-date").value=day.date;
  for (const [id,key] of BOOKF) { $(id).value=day[key]||""; fit($(id)); }
  renderCount();
}
function confirmBox(title,text,ok){ $("confirm-title").textContent=title; $("confirm-text").textContent=text; $("confirm-modal").classList.remove("hidden");
  $("confirm-ok").onclick=()=>{ $("confirm-modal").classList.add("hidden"); ok(); }; }
function clearDay() { const date=day.date; delete store.days[date]; day=newDay(date); save(); syncInputs(); render(); }

/* Check cash */
let busy=false, result=null;
function checkCash() {
  const k=calc(), hand=k.hand, bal=k.balance, fin=day.finacle, card=$("result-modal-card");
  let ok=false, kind, badge, head, msg;
  if (hand===fin && hand===bal) { ok=true; kind="matched"; badge="Tally OK"; head="WELL DONE!"; msg="You have done a good job. Cash in Finacle, Cash in Hand and Cash Balance all match."; }
  else if (hand<bal) { kind="short"; badge="Cash Short"; head="RECHECK THE CASH"; msg=`Your tally is short of ${fmt(bal-hand)}.`; }
  else if (hand>bal) { kind="excess"; badge="Cash Excess"; head="RECHECK THE CASH"; msg=`Your tally is excess of ${fmt(hand-bal)}.`; }
  else { kind=hand>fin?"excess":"short"; badge="Finacle Differs"; head="RECHECK FINACLE"; msg=`Cash in Hand matches the Cash Balance, but is ${hand>fin?"more":"less"} than Cash in Finacle by ${fmt(Math.abs(hand-fin))}.`; }
  result={ok,badge,msg};
  card.classList.remove("matched","short","excess"); card.classList.add(kind);
  $("result-modal-badge").textContent=badge; $("result-modal-heading").textContent=head; $("result-modal-statement").textContent=msg;
  $("modal-finacle-val").textContent=fmt(fin); $("modal-hand-val").textContent=fmt(hand); $("modal-balance-val").textContent=sfmt(bal);
  $("result-modal-img").src = IMG[kind]; $("result-modal-img").style.objectPosition = FACE[kind];
  if (busy) return; busy=true;
  const ov=$("emoji-overlay"); $("emoji-img").src = IMG[kind]; $("emoji-img").style.objectPosition = FACE[kind]; ov.className="emoji-overlay "+(ok?"happy":"sad");
  setTimeout(()=>{ ov.className="emoji-overlay hidden"; busy=false; $("result-modal").classList.remove("hidden"); }, 1700);
}

/* PDF report (laid out like the bank's cash book page) - built without any library */
function buildPdf() {
  const W=595, H=842, ops=[], k=calc(), p=parts();
  const FN={h:1,hb:2,tb:3,ti:4,cb:5};   // Helvetica, Helvetica-Bold, Times-Bold, Times-Italic, Courier-Bold
  const wid=(s,z,f)=>{ let w=0; for (const ch of s) { const dg=/[0-9]/.test(ch), pu=/[,. ]/.test(ch);
    if (f==="cb") w+=.6; else if (f==="tb"||f==="ti") w+= dg?.5: pu?.25: ch==="-"?.333: /[A-Z]/.test(ch)?.7: .45;
    else w+= dg?.556: pu?.278: ch==="-"?.333: /[A-Z]/.test(ch)?.68: .5; } return w*z; };
  const esc=(s)=>String(s).replace(/[\\()]/g,"\\$&");
  const T=(x,y,s,z=9,f="h",al="l",c="0 g")=>{ s=String(s); const w=wid(s,z,f); if(al==="r")x-=w; if(al==="c")x-=w/2;
    ops.push(`${c} BT /F${FN[f]} ${z} Tf ${x.toFixed(1)} ${(H-y).toFixed(1)} Td (${esc(s)}) Tj ET`); };
  const R=(x,y,w,h,c)=>ops.push(`${c} rg ${x} ${H-y-h} ${w} ${h} re f`);
  const B=(x,y,w,h)=>ops.push(`0.4 w 0.25 0.3 0.4 RG ${x} ${H-y-h} ${w} ${h} re S`);
  const Rs=(n)=>"Rs. "+L(n), dash=(n)=>n?L(n):"-";
  const NAVY="0.03 0.14 0.27", dt=new Date(), stamp=`${pad(dt.getDate())}-${MON[dt.getMonth()]}-${dt.getFullYear()} ${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
  // header
  T(36,54,"CASH BOOK",13,"tb"); T(W/2+10,58,"Bank of India",25,"tb","c",NAVY+" rg"); T(559,54,"Date: "+label(day.date),11,"tb","r");
  T(W/2+10,72,"Teller Desk  -  Daily Cash Position Report",9.5,"ti","c","0.35 0.4 0.5 rg");
  ops.push("0.97 0.55 0.1 RG 2.2 w 36 "+(H-82)+" m 559 "+(H-82)+" l S");
  // summary grid
  const sum=[["Last Day's Balance",Rs(day.opening)],["Received To-day - Cheques","-"],["Received To-day - Cash",Rs(day.recv)],["Paid To-day - Cheques","-"],["Paid To-day - Cash",Rs(day.paid)],
    ["Cash Balance (Last Day + Received - Paid)",Rs(k.balance)],["Cash in Finacle",Rs(day.finacle)],["Cash in Hand (Counter + Safe)",Rs(k.hand)]];
  let y=94; sum.forEach((r,i)=>{ if (i>=5) R(36,y,523,20,"0.93 0.96 0.99"); B(36,y,330,20); B(366,y,193,20);
    T(44,y+14,r[0],9.5,i>=5?"hb":"h"); T(551,y+14,r[1],10,"cb","r",i>=5?NAVY+" rg":"0 g"); y+=20; });
  // particulars
  y+=18; T(W/2,y,"PARTICULARS  -  RESERVE BANK OF INDIA NOTES",12,"tb","c",NAVY+" rg"); y+=8;
  const cx=[36,126,216,306,416,559];
  const cell=(i,txt,yy,h,al,f,z,c)=>{ B(cx[i],yy,cx[i+1]-cx[i],h); const xx=al==="r"?cx[i+1]-8:al==="c"?(cx[i]+cx[i+1])/2:cx[i]+8; T(xx,yy+h-6,txt,z||9.5,f,al,c||"0 g"); };
  R(36,y,523,20,NAVY); ["Issuable","Soil","Total","Denomination","Amount"].forEach((t,i)=>cell(i,t,y,20,i===3?"c":"r","hb",9,"1 g")); y+=20;
  const line=(r)=>{ cell(0,dash(r.iss),y,18,"r","cb"); cell(1,dash(r.soil),y,18,"r","cb"); cell(2,L(r.iss+r.soil),y,18,"r","cb");
    cell(3,"Rs. "+r.x.value,y,18,"c","tb",10.5); cell(4,L(r.amt),y,18,"r","cb"); y+=18; };
  p.notes.forEach(line);
  const sub=(name,a,b,c,amt)=>{ R(36,y,523,21,"0.85 0.91 0.97"); cell(0,a,y,21,"r","cb"); cell(1,b,y,21,"r","cb"); cell(2,c,y,21,"r","cb"); cell(3,name,y,21,"c","tb",10.5); cell(4,L(amt),y,21,"r","cb"); y+=21; };
  sub("Rupee-Notes",L(p.ni),L(p.ns),L(p.ni+p.ns),p.na);
  R(36,y,523,16,"0.97 0.55 0.1"); T(44,y+12,"COINS  (count)",9,"hb","l","1 g"); y+=16;
  p.coins.forEach(line);
  sub("Rupee-Coins",L(p.cp),"-",L(p.cp),p.ca);
  R(36,y,523,28,NAVY); T(44,y+19,"TOTAL CASH BALANCE",13,"tb","l","1 g"); T(551,y+19,Rs(k.hand),13,"cb","r","1 g"); y+=28;
  // words, remark
  y+=24; T(36,y,"Rupees "+words(k.hand)+" Only",11.5,"ti","l",NAVY+" rg");
  y+=20; T(36,y,"Remark: "+(result?result.msg:"Not checked yet"),10,"ti");
  y+=18; T(36,y,"Safe: "+Rs(k.s.total)+"     Counter: "+Rs(k.c.total)+"     Issuable: "+Rs(k.s.issuable+k.c.issuable)+"     Soil: "+Rs(k.s.soil+k.c.soil),9,"h");
  y=Math.max(y+56,730); T(36,y,"No. of Coin Bags: ____________",10,"tb");
  ops.push(`0.3 w 0 G 380 ${H-y} m 559 ${H-y} l S`); T(469,y+13,"Cashier",10,"tb","c");
  T(36,H-24,"Generated "+stamp+"  -  BOI Teller Desk",8,"ti","l","0.4 g");
  const o=[]; o[1]="<< /Type /Catalog /Pages 2 0 R >>"; o[2]="<< /Type /Pages /Kids [3 0 R] /Count 1 >>";
  o[3]=`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /Font << /F1 4 0 R /F2 5 0 R /F3 6 0 R /F4 7 0 R /F5 8 0 R >> >> /Contents 9 0 R >>`;
  ["Helvetica","Helvetica-Bold","Times-Bold","Times-Italic","Courier-Bold"].forEach((n,i)=>{ o[4+i]=`<< /Type /Font /Subtype /Type1 /BaseFont /${n} /Encoding /WinAnsiEncoding >>`; });
  const cs=ops.join("\n"); o[9]=`<< /Length ${cs.length} >>\nstream\n${cs}\nendstream`;
  let out="%PDF-1.4\n"; const off=[]; for (let i=1;i<=9;i++){ off[i]=out.length; out+=`${i} 0 obj\n${o[i]}\nendobj\n`; }
  const xr=out.length; out+="xref\n0 10\n0000000000 65535 f \n"; for (let i=1;i<=9;i++) out+=String(off[i]).padStart(10,"0")+" 00000 n \n";
  out+=`trailer\n<< /Size 10 /Root 1 0 R >>\nstartxref\n${xr}\n%%EOF`;
  return out;
}
async function sharePdf() {
  const b64=btoa(buildPdf()), name=`BOI-Cash-Book-${label(day.date)}.pdf`, P=window.Capacitor && window.Capacitor.Plugins;
  try {
    if (P && P.Filesystem && P.Share) { const r=await P.Filesystem.writeFile({path:name,data:b64,directory:"CACHE"});
      await P.Share.share({title:name,url:r.uri,dialogTitle:"Save or share the report"}); return; }
  } catch (e) { if (/cancel/i.test(String(e))) return; }
  const a=document.createElement("a"); a.href="data:application/pdf;base64,"+b64; a.download=name; document.body.appendChild(a); a.click(); a.remove();
}

const setHeaderH = () => { const t=document.querySelector(".top-bar"); if (t) document.documentElement.style.setProperty("--hdr-h", t.offsetHeight+"px"); };
window.addEventListener("resize", setHeaderH); window.addEventListener("load", setHeaderH);
document.addEventListener("DOMContentLoaded",()=>{
  setHeaderH();
  for (const n of ["safe","counter","book"]) $("tab-"+n).addEventListener("click",()=>{ tab=n; renderCount(); render(); save(); });
  $("cb-date").addEventListener("change",(e)=>{ if (e.target.value) { day=load(e.target.value); store.last={date:day.date,tab}; persist(); syncInputs(); render(); } });
  for (const [id,key] of BOOKF) $(id).addEventListener("input",(e)=>{ const v=num(e.target.value); e.target.value=v||""; fit(e.target); day[key]=v; save(); render(); });
  $("btn-check").addEventListener("click",checkCash);
  $("btn-pdf").addEventListener("click",sharePdf);
  $("result-modal-close").addEventListener("click",()=>$("result-modal").classList.add("hidden"));
  $("confirm-cancel").addEventListener("click",()=>$("confirm-modal").classList.add("hidden"));
  $("btn-reset").addEventListener("click",()=>confirmBox("Clear this day?","All entries for "+label(day.date)+" will be removed.",clearDay));
  Object.values(IMG).forEach((s)=>{ new Image().src=s; });
  syncInputs(); render();
});
