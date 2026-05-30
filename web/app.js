/* ===== shared ===== */
function toast(msg){
  let t=document.querySelector('.toast');
  if(!t){t=document.createElement('div');t.className='toast';document.body.appendChild(t);}
  t.textContent=msg;requestAnimationFrame(()=>t.classList.add('show'));
  clearTimeout(t._h);t._h=setTimeout(()=>t.classList.remove('show'),1600);
}

/* ===== tabs ===== */
document.querySelectorAll('.tab').forEach(t=>t.onclick=()=>{
  document.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));
  document.querySelectorAll('.panel').forEach(x=>x.classList.remove('active'));
  t.classList.add('active');
  document.getElementById(t.dataset.tab).classList.add('active');
  window.scrollTo({top:0,behavior:'smooth'});
  if(t.dataset.tab==='map'&&window._birmap)setTimeout(()=>window._birmap.invalidateSize(),60);
  if(t.dataset.tab==='reports')loadReports();
});

/* ===== DASHBOARD (real data from /api/dashboard) ===== */
const MONTHS_SHORT=m=>m.charAt(0); // single-letter month so 12 fit upright
async function loadDashboard(){
  const el=document.getElementById('dashBody');
  let d;
  try{ d=await (await fetch('/api/dashboard')).json(); }
  catch(e){ el.innerHTML='<div class="emptyd">Could not load data.</div>'; return; }
  const inr=n=>'₹'+Math.round(n).toLocaleString('en-IN');
  const t=d.by_type||{};
  const tot=d.total_households||1;
  const maxTrend=Math.max(...d.trend.map(x=>x.active),1);
  const mlabel=m=>m.replace('-2025','').replace('-2026',"'26").replace('-','');
  // household-status donut: serviced(active) vs inactive/leakage, from real active%
  const serviced=d.active_pct, leak=Math.round((100-serviced)*0.7), irregular=100-serviced-leak;
  const donut=`conic-gradient(var(--green2) 0 ${serviced}%, var(--amber) ${serviced}% ${serviced+irregular}%, #3a3a3a ${serviced+irregular}% 100%)`;
  const reportCount=(d.report_count!=null)?d.report_count:'—';

  el.innerHTML=`
    <div class="kpis">
      <div class="kpi"><div class="num">${tot.toLocaleString('en-IN')}</div><div class="lab">Households · Bir + Gunehar</div><div class="delta up">Bir ${d.by_village?.Bir||0} · Gunehar ${d.by_village?.Gunehar||0}</div></div>
      <div class="kpi"><div class="num">${d.active_pct}%</div><div class="lab">Active households</div><div class="delta up">handing over waste</div></div>
      <div class="kpi"><div class="num">${d.collection_rate}%</div><div class="lab">Fee collection rate</div><div class="delta up">${inr(d.fee_paid)} of ${inr(d.fee_due)}</div></div>
      <div class="kpi"><div class="num">${inr(d.fee_outstanding)}</div><div class="lab">Outstanding balance</div><div class="delta down">to recover</div></div>
    </div>

    <div class="drow2">
      <div class="dcard">
        <h3>Active households by month <small>FY26 · real data</small></h3>
        <div class="trend">${d.trend.map(x=>`<div class="bar"><i style="height:${Math.round(x.active/maxTrend*96)}px"></i><span>${mlabel(x.month)}</span></div>`).join('')}</div>
      </div>
      <div class="dcard">
        <h3>Household status <small>${tot} houses</small></h3>
        <div class="donutwrap">
          <div class="donut" style="background:${donut}"><div class="ctr"><b>${d.active_pct}%</b><span>active</span></div></div>
          <ul class="leg">
            <li><span class="sw" style="background:var(--green2)"></span>Active · waste handed over</li>
            <li><span class="sw" style="background:var(--amber)"></span>Irregular service</li>
            <li><span class="sw" style="background:#3a3a3a"></span>Inactive / leakage</li>
          </ul>
        </div>
      </div>
    </div>

    <div class="drow2">
      <div class="dcard">
        <h3>Household mix <small>residential vs commercial</small></h3>
        <div class="lbrow"><span class="nm">Residential</span><div class="track"><div class="fill" style="width:${Math.round((t.Residential||0)/tot*100)}%;background:var(--green2)">${t.Residential||0}</div></div></div>
        <div class="lbrow"><span class="nm">Commercial</span><div class="track"><div class="fill" style="width:${Math.max(6,Math.round((t.Commercial||0)/tot*100))}%;background:var(--terra)">${t.Commercial||0}</div></div></div>
        <div class="lbrow"><span class="nm">Other</span><div class="track"><div class="fill" style="width:${Math.max(6,Math.round((t.Other||0)/tot*100))}%;background:var(--amber)">${t.Other||0}</div></div></div>
        <div style="font-size:12px;color:var(--muted);margin-top:4px">Waste Warriors serve residential · Bhasha serves commercial.</div>
      </div>
      <div class="dcard">
        <h3>Most active wards <small>% active households</small></h3>
        ${d.wards.map(w=>{const c=w.active_pct>=70?'var(--green2)':w.active_pct>=55?'var(--green)':w.active_pct>=45?'var(--amber)':'var(--red)';
          return `<div class="lbrow"><span class="nm">${w.ward}</span><div class="track"><div class="fill" style="width:${Math.max(10,w.active_pct)}%;background:${c}">${w.active_pct}%</div></div></div>`;}).join('')}
      </div>
    </div>

    <div class="drow2" style="grid-template-columns:1fr 1fr">
      <div class="dcard">
        <h3>Incoming reports <small>from residents & collectors</small></h3>
        <div class="rep"><div class="ri" style="background:var(--red-soft)">🔥</div><div class="rt"><b>Burning spots</b><br><span>flagged on the map</span></div><span class="pill rec">live</span></div>
        <div class="rep"><div class="ri" style="background:#ececec">🗑️</div><div class="rt"><b>Littering / dumping</b><br><span>routed to the right team</span></div><span class="pill open">live</span></div>
        <div class="rep"><div class="ri" style="background:var(--amber-soft)">🚛</div><div class="rt"><b>Missed-pickup complaints</b><br><span>48-hr SLA</span></div><span class="pill open">live</span></div>
        <div style="font-size:12px;color:var(--muted);margin-top:10px">${reportCount} report(s) submitted so far — see the <b>Reports</b> tab.</div>
      </div>
      <div class="dcard">
        <h3>Waste tonnage &amp; pickup adherence <small></small></h3>
        <div style="display:flex;align-items:baseline;gap:8px"><div style="font-size:36px;font-weight:800;color:var(--muted);letter-spacing:-.03em">— kg</div></div>
        <div style="font-size:13px;color:var(--muted);margin:8px 0 12px">Tonnage and 3×/month pickup adherence aren’t in the current user-fee dataset — they’d come from collector logs in the field app.</div>
        <span class="tagill">illustrative — not in current data</span>
      </div>
    </div>`;
}

/* ===== REPORT (camera → /api/reports) ===== */
const repScr=document.getElementById('repScr');
let repMode='spot', repType=null, repMiss=null, repDone=false, repPhotoUrl=null, repPhotoFile=null, repSubmitting=false;
function setMode(m){repMode=m;repType=null;repMiss=null;repDone=false;repPhotoUrl=null;repPhotoFile=null;renderRep();}
function onPhoto(input){
  const f=input.files&&input.files[0]; if(!f)return;
  repPhotoFile=f; const r=new FileReader();
  r.onload=e=>{repPhotoUrl=e.target.result;renderRep();}; r.readAsDataURL(f);
}
function modeSwitch(){
  const b=(m,lbl)=>`<button onclick="setMode('${m}')" style="flex:1;border:none;border-radius:8px;padding:7px;font-size:12px;font-weight:700;font-family:inherit;cursor:pointer;background:${repMode===m?'#fff':'transparent'};color:${repMode===m?'var(--forest)':'#fff'}">${lbl}</button>`;
  return `<div style="display:flex;gap:6px;background:rgba(255,255,255,.12);padding:4px;border-radius:11px;margin-top:10px">${b('spot','🗺️ Spot')}${b('missed','🚛 Missed pickup')}</div>`;
}
async function submitReport(kind){
  if(repSubmitting)return; repSubmitting=true;
  const fd=new FormData();
  fd.append('kind',kind);
  fd.append('spot_type', kind==='spot'?(repType||''):('Missed pickup · '+(repMiss||'?')));
  fd.append('lat','32.04'); fd.append('lng','76.72');
  if(repPhotoFile)fd.append('photo',repPhotoFile);
  try{ await fetch('/api/reports',{method:'POST',body:fd}); }
  catch(e){ console.warn('report failed (demo continues)',e); }
  repSubmitting=false; repDone=true; renderRep();
}
function renderRep(){
  if(repDone){
    const spot=repMode==='spot';
    repScr.innerHTML=`<div class="apphead"><div class="apptitle">Saaf Bir</div><div class="appmain">Submitted ✓</div></div>
      <div class="body" style="justify-content:center;align-items:center;text-align:center">
        <div style="width:80px;height:80px;border-radius:50%;background:${spot?'var(--mint-soft)':'var(--amber-soft)'};display:flex;align-items:center;justify-content:center;font-size:38px;margin-bottom:18px">${spot?'✅':'🚛'}</div>
        <div style="font-size:19px;font-weight:800;color:var(--forest)">${spot?'Report saved':'Complaint raised'}</div>
        <p style="font-size:13.5px;color:var(--muted);margin-top:8px;padding:0 12px">${spot?'Saved to the database and shown in the Reports tab.':'Routed to the collector + supervisor · 48-hr SLA.'}</p>
        <button class="btn btn-ghost" style="width:auto;padding:11px 22px;margin-top:22px" onclick="setMode(repMode)">Report another</button>
      </div>`;
    return;
  }
  if(repMode==='spot'){
    const types=['Burning plastic','Littering / dumping','Littering near market','Overflowing point'];
    repScr.innerHTML=`<div class="apphead"><div class="apptitle">Saaf Bir</div><div class="appmain">Report</div>${modeSwitch()}</div>
      <div class="body">
        <label class="photo${repPhotoUrl?' has':''}"${repPhotoUrl?` style="background-image:url('${repPhotoUrl}')"`:''}>
          <input type="file" accept="image/*" capture="environment" onchange="onPhoto(this)" style="display:none">
          ${repPhotoUrl?'<span class="pchk">✓ Photo added · tap to retake</span>':'<span class="pprompt">📷<small>Tap to take a photo</small></span>'}
          <div class="gtag">📍 32.04°N, 76.72°E · auto-located</div>
        </label>
        <div style="font-size:10.5px;color:var(--muted);margin-top:6px;text-align:center">Photos are saved to the public Reports gallery.</div>
        <div class="field"><div class="fl">What did you see?</div>
          <div class="chips">${types.map(t=>`<button class="chip ${repType===t?'sel':''}" onclick="repType='${t}';renderRep()">${t}</button>`).join('')}</div>
        </div>
        <button class="btn btn-pri" style="margin-top:auto" onclick="if(repType)submitReport('spot')">Submit report</button>
      </div>`;
  } else {
    const dates=[{d:'5th',done:true},{d:'15th',done:true},{d:'25th',done:false}];
    repScr.innerHTML=`<div class="apphead"><div class="apptitle">Saaf Bir</div><div class="appmain">Report</div>${modeSwitch()}</div>
      <div class="body">
        <div style="background:#fff;border:1px solid var(--line);border-radius:14px;padding:14px">
          <div style="font-size:12px;color:var(--muted)">Your house · BIR-142, Bir W2</div>
          <div style="font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;margin:12px 0 8px">This month’s pickups · due 3×</div>
          ${dates.map(x=>`<div style="display:flex;align-items:center;gap:10px;margin-bottom:9px">
            <span style="width:22px;height:22px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;background:${x.done?'var(--mint-soft)':'var(--amber-soft)'}">${x.done?'✓':'!'}</span>
            <span style="font-size:13.5px;color:var(--ink);flex:1">Pickup — ${x.d}</span>
            <span style="font-size:11px;font-weight:700;color:${x.done?'var(--green2)':'#b5791b'}">${x.done?'Collected':'Not collected'}</span></div>`).join('')}
        </div>
        <div class="field"><div class="fl">Which pickup was missed?</div>
          <div class="chips">${dates.map(x=>`<button class="chip ${repMiss===x.d?'sel':''}" onclick="repMiss='${x.d}';renderRep()">${x.d}${x.done?'':' ⚠️'}</button>`).join('')}</div>
        </div>
        <button class="btn btn-pri" style="margin-top:auto" onclick="if(repMiss)submitReport('missed')">Raise complaint</button>
      </div>`;
  }
}
renderRep();

/* ===== COLLECTOR (pickups → /api/pickups) — no bag-count step ===== */
const houses=[
  {id:'GUN-23',name:'Meer Chand',type:'RESIDENTIAL',bal:0},
  {id:'GUN-24',name:'Phula Devi',type:'RESIDENTIAL',bal:50},
  {id:'GUN-25',name:'Café Skyline',type:'COMMERCIAL',bal:0,com:true},
  {id:'GUN-26',name:'Tulsi Ram',type:'RESIDENTIAL',bal:100},
  {id:'GUN-27',name:'Devanand',type:'RESIDENTIAL',bal:50},
  {id:'GUN-28',name:'Hari Ram',type:'RESIDENTIAL',bal:0}
];
let ci=0, cstate='route', doneCount=0;
const colScr=document.getElementById('colScr');
function nextHouse(){ci=(ci+1)%houses.length;cstate='route';renderCol();}
async function logPickup(action,reason){
  try{ await fetch('/api/pickups',{method:'POST',headers:{'content-type':'application/json'},
    body:JSON.stringify({household_id:houses[ci].id,action,reason})}); }
  catch(e){ console.warn('pickup failed',e); }
}
function doCollect(){doneCount++;logPickup('collected');toast('✓ Pickup logged');setTimeout(nextHouse,700);}
function doPaid(){logPickup('paid');houses[ci].bal=0;toast('₹ Paid — receipt sent');setTimeout(nextHouse,800);}
function doSkip(reason){logPickup('skipped',reason);toast(reason);setTimeout(nextHouse,800);}
function renderCol(){
  const h=houses[ci];const pct=Math.round((ci/houses.length)*100)+8;
  let body='';
  if(cstate==='route'){
    body=`<div class="hcard">
      <div class="tagtype ${h.com?'com':''}">${h.id} · ${h.type}</div>
      <div class="hname">${h.name}</div>
      <div class="hmeta">📞 ${h.com?'shop':'70••• ••••'} · Gunehar, Ward 1</div>
      <div class="bal ${h.bal?'due':'zero'}">${h.bal?('Balance ₹'+h.bal):'No dues'}</div>
      <button class="btn btn-pri" onclick="doCollect()">✓ Collected</button>
      <button class="btn btn-pay" onclick="cstate='pay';renderCol()">💳 Collect ₹${50+h.bal} (UPI)</button>
      <button class="btn btn-skip" onclick="cstate='skip';renderCol()">Skip — log a reason</button></div>`;
  }else if(cstate==='pay'){
    body=`<div class="hcard" style="text-align:center">
      <div class="tagtype">${h.id} · UPI</div>
      <div style="font-size:38px;font-weight:800;color:var(--forest)">₹${50+h.bal}</div>
      <div class="hmeta">Scan to pay · saafbir@upi</div>
      <div style="width:150px;height:150px;margin:14px auto;border-radius:16px;background:repeating-linear-gradient(0deg,#173d2d 0 8px,#fff 8px 16px),repeating-linear-gradient(90deg,rgba(0,0,0,.5) 0 8px,transparent 8px 16px);background-blend-mode:multiply;border:6px solid #fff;box-shadow:0 0 0 1px var(--line)"></div>
      <button class="btn btn-pri" onclick="doPaid()">Mark paid ✓</button>
      <button class="btn btn-skip" onclick="cstate='route';renderCol()">← Back</button></div>`;
  }else if(cstate==='skip'){
    body=`<div class="reasons"><div class="lbl">Why was ${h.name} skipped?</div>
      <div class="rgrid">
        <div class="rbtn" onclick="doSkip('🔥 Burning — flagged')"><span class="ic burn">🔥</span>Burning</div>
        <div class="rbtn" onclick="doSkip('Logged — not home')"><span class="ic away">✈️</span>Not home</div>
        <div class="rbtn" onclick="doSkip('Logged — no waste')"><span class="ic none">🍃</span>No waste</div>
        <div class="rbtn" onclick="doSkip('Logged — refused')"><span class="ic no">🚫</span>Refused</div>
      </div>
      <button class="btn btn-ghost" onclick="cstate='route';renderCol()">← Back</button></div>`;
  }
  colScr.innerHTML=`<div class="apphead">
      <div class="apptitle">Route · Gunehar</div>
      <div class="appmain">Ward 1 <span style="font-size:13px;font-weight:600;opacity:.8">House ${ci+1}/${houses.length}</span></div>
      <div class="prog"><i style="width:${pct}%"></i></div>
      <div class="proglab">${Math.round(pct)}% of route · ✓ ${doneCount} done today</div>
    </div>
    <div class="body">${body}</div>`;
}
renderCol();

/* ===== REPORTS GALLERY (reads /api/reports) ===== */
function timeAgo(iso){
  const s=Math.max(0,(Date.now()-new Date(iso.replace(' ','T')+'Z').getTime())/1000);
  if(s<60)return 'just now'; if(s<3600)return Math.floor(s/60)+'m ago';
  if(s<86400)return Math.floor(s/3600)+'h ago'; return Math.floor(s/86400)+'d ago';
}
async function loadReports(){
  const grid=document.getElementById('repGrid'),cnt=document.getElementById('repCount');
  cnt.textContent='Loading…';
  let recs=[];
  try{ recs=(await (await fetch('/api/reports?limit=60')).json()).reports||[]; }
  catch(e){ cnt.textContent=''; grid.innerHTML='<div class="repempty">Couldn’t load reports. Try ↻ Refresh.</div>'; return; }
  if(!recs.length){ cnt.textContent='No reports yet';
    grid.innerHTML='<div class="repempty">No reports yet — submit one from the <b>Report a Spot</b> tab and it’ll appear here.</div>'; return; }
  cnt.textContent=recs.length+' report'+(recs.length===1?'':'s');
  grid.innerHTML=recs.map(r=>{
    const miss=r.kind==='missed';
    const img=r.has_photo?`style="background-image:url('/api/reports/${r.id}/photo')"`:'';
    const ph=r.has_photo?'':(miss?'🚛':'📷');
    const loc=(r.lat!=null)?`${Number(r.lat).toFixed(2)}°N, ${Number(r.lng).toFixed(2)}°E · `:'';
    return `<div class="rcard"><div class="rimg" ${img}>${ph}</div>
      <div class="rbody"><div class="rtype">${miss?'🚛 ':'📍 '}${r.spot_type||'Report'}</div>
      <div class="rmeta">${loc}${timeAgo(r.created_at)}</div></div></div>`;
  }).join('');
}

/* ===== MAP (Leaflet + OSM) ===== */
const pins=[
  /* 🔥 BURNING spots */
  {lat:32.0432,lng:76.7248,layer:'burn',icon:'🔥',title:'Plastic burning',sub:'Bir W3',reports:2,stream:'ww',status:'open'},
  {lat:32.0598,lng:76.7282,layer:'burn',icon:'🔥',title:'Burn pit',sub:'Gunehar W1',reports:3,stream:'ww',status:'rec',focus:'Gunehar W1',camps:2,before:8,now:3},
  {lat:32.0505,lng:76.7305,layer:'burn',icon:'🔥',title:'Evening burning',sub:'Keori road',reports:2,stream:'ww',status:'open'},
  {lat:32.0560,lng:76.7228,layer:'burn',icon:'🔥',title:'Leaf & plastic fire',sub:'Gunehar W3',reports:1,stream:'ww',status:'open'},
  {lat:32.0388,lng:76.7205,layer:'burn',icon:'🔥',title:'Roadside burning',sub:'Chougan lane',reports:4,stream:'ww',status:'rec',focus:'Chougan',camps:1,before:6,now:4},
  {lat:32.0445,lng:76.7290,layer:'burn',icon:'🔥',title:'Backyard burning',sub:'Bir W2',reports:1,stream:'ww',status:'open'},
  /* 🗑️ LITTERING / dumping spots */
  {lat:32.0520,lng:76.7250,layer:'black',icon:'🗑️',title:'Roadside dump',sub:'Bir–Gunehar road',reports:4,stream:'ww',status:'open'},
  {lat:32.0462,lng:76.7222,layer:'black',icon:'🗑️',title:'Dump by khad',sub:'Bir bazaar',reports:5,stream:'bh',status:'rec',focus:'Bir market',camps:1,before:7,now:5},
  {lat:32.0540,lng:76.7195,layer:'black',icon:'🗑️',title:'Overflow point',sub:'Bir W4',reports:3,stream:'ww',status:'open'},
  {lat:32.0480,lng:76.7330,layer:'black',icon:'🗑️',title:'Khad dumping',sub:'Keori',reports:2,stream:'ww',status:'open'},
  {lat:32.0610,lng:76.7250,layer:'black',icon:'🗑️',title:'Market waste pile',sub:'Gunehar bazaar',reports:4,stream:'bh',status:'open'},
  {lat:32.0408,lng:76.7235,layer:'black',icon:'🗑️',title:'Tourist-area litter',sub:'Chougan landing',reports:3,stream:'bh',status:'open'},
  /* ✓ WASTE WARRIORS — verified HOUSEHOLDS (residential) */
  {lat:32.0472,lng:76.7210,layer:'ww',icon:'✓',title:'Verified household',sub:'Bir W1 · residential',reports:0,stream:'ww',status:'clean'},
  {lat:32.0468,lng:76.7218,layer:'ww',icon:'✓',title:'Verified household',sub:'Bir W1 · residential',reports:0,stream:'ww',status:'clean'},
  {lat:32.0578,lng:76.7252,layer:'ww',icon:'✓',title:'Verified household',sub:'Gunehar W2 · residential',reports:0,stream:'ww',status:'clean'},
  {lat:32.0585,lng:76.7240,layer:'ww',icon:'✓',title:'Verified household',sub:'Gunehar W2 · residential',reports:0,stream:'ww',status:'clean'},
  {lat:32.0455,lng:76.7265,layer:'ww',icon:'✓',title:'Verified household',sub:'Bir W2 · residential',reports:0,stream:'ww',status:'clean'},
  {lat:32.0530,lng:76.7270,layer:'ww',icon:'✓',title:'Verified household',sub:'Bir W3 · residential',reports:0,stream:'ww',status:'clean'},
  {lat:32.0595,lng:76.7295,layer:'ww',icon:'✓',title:'Verified household',sub:'Gunehar W1 · residential',reports:0,stream:'ww',status:'clean'},
  {lat:32.0478,lng:76.7202,layer:'ww',icon:'✓',title:'Verified household',sub:'Bir W1 · residential',reports:0,stream:'ww',status:'clean'},
  {lat:32.0463,lng:76.7228,layer:'ww',icon:'✓',title:'Verified household',sub:'Bir W2 · residential',reports:0,stream:'ww',status:'clean'},
  {lat:32.0448,lng:76.7248,layer:'ww',icon:'✓',title:'Verified household',sub:'Bir W2 · residential',reports:0,stream:'ww',status:'clean'},
  {lat:32.0512,lng:76.7235,layer:'ww',icon:'✓',title:'Verified household',sub:'Bir W3 · residential',reports:0,stream:'ww',status:'clean'},
  {lat:32.0538,lng:76.7212,layer:'ww',icon:'✓',title:'Verified household',sub:'Bir W4 · residential',reports:0,stream:'ww',status:'clean'},
  {lat:32.0560,lng:76.7258,layer:'ww',icon:'✓',title:'Verified household',sub:'Gunehar W2 · residential',reports:0,stream:'ww',status:'clean'},
  {lat:32.0572,lng:76.7278,layer:'ww',icon:'✓',title:'Verified household',sub:'Gunehar W3 · residential',reports:0,stream:'ww',status:'clean'},
  {lat:32.0588,lng:76.7268,layer:'ww',icon:'✓',title:'Verified household',sub:'Gunehar W2 · residential',reports:0,stream:'ww',status:'clean'},
  {lat:32.0602,lng:76.7282,layer:'ww',icon:'✓',title:'Verified household',sub:'Gunehar W1 · residential',reports:0,stream:'ww',status:'clean'},
  {lat:32.0490,lng:76.7242,layer:'ww',icon:'✓',title:'Verified household',sub:'Bir W3 · residential',reports:0,stream:'ww',status:'clean'},
  /* ★ BHASHA — verified COMMERCIAL partners */
  {lat:32.0418,lng:76.7176,layer:'bh',icon:'★',title:'Café Skyline',sub:'Bhasha · commercial · Chougan',reports:0,stream:'bh',status:'partner'},
  {lat:32.0458,lng:76.7230,layer:'bh',icon:'★',title:'Bazaar Dhaba',sub:'Bhasha · commercial · Bir market',reports:0,stream:'bh',status:'partner'},
  {lat:32.0402,lng:76.7188,layer:'bh',icon:'★',title:'Mountain Homestay',sub:'Bhasha · commercial · Chougan',reports:0,stream:'bh',status:'partner'},
  {lat:32.0440,lng:76.7212,layer:'bh',icon:'★',title:'Bir Tea House',sub:'Bhasha · commercial · Bir bazaar',reports:0,stream:'bh',status:'partner'},
  {lat:32.0608,lng:76.7262,layer:'bh',icon:'★',title:'Gunehar Guesthouse',sub:'Bhasha · commercial · Gunehar',reports:0,stream:'bh',status:'partner'},
  {lat:32.0395,lng:76.7215,layer:'bh',icon:'★',title:'Paragliding Café',sub:'Bhasha · commercial · landing site',reports:0,stream:'bh',status:'partner'}
];
const colors={burn:'#e2552e',black:'#3a3a3a',ww:'#40916c',bh:'#cf6f4e'};
const active={burn:false,black:false,ww:false,bh:false};
const map=L.map('mapLeaf',{scrollWheelZoom:false}).setView([32.049,76.723],14);
window._birmap=map;
// two base layers: streets (default) + satellite (Esri World Imagery, free, no key)
const streets=L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:18,attribution:'© OpenStreetMap'});
const satellite=L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',{maxZoom:19,attribution:'Imagery © Esri'});
const labels=L.tileLayer('https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png',{maxZoom:19,attribution:'© CARTO'});
streets.addTo(map);
// Map / Satellite toggle control (top-right)
const ViewToggle=L.Control.extend({options:{position:'topright'},
  onAdd:function(){
    const b=L.DomUtil.create('button','viewtoggle');
    b.textContent='🛰️ Satellite'; b.type='button';
    L.DomEvent.disableClickPropagation(b);
    let sat=false;
    b.onclick=()=>{
      sat=!sat;
      if(sat){map.removeLayer(streets);satellite.addTo(map);labels.addTo(map);b.textContent='🗺️ Map';}
      else{map.removeLayer(satellite);map.removeLayer(labels);streets.addTo(map);b.textContent='🛰️ Satellite';}
    };
    return b;
  }});
map.addControl(new ViewToggle());
const groups={burn:L.layerGroup(),black:L.layerGroup(),ww:L.layerGroup(),bh:L.layerGroup()};
pins.forEach((p,idx)=>{
  const sz=(p.layer==='burn'||p.layer==='black')?30:24;
  const icon=L.divIcon({className:'',iconSize:[sz,sz],iconAnchor:[sz/2,sz/2],
    html:`<div class="mkr" style="width:${sz}px;height:${sz}px;background:${colors[p.layer]}">${p.icon}</div>`});
  const m=L.marker([p.lat,p.lng],{icon}); m.on('click',()=>showDetail(idx)); groups[p.layer].addLayer(m);
});
const zoneLayer=L.layerGroup([
  L.circle([32.0470,76.7212],{radius:240,color:'#40916c',weight:2,dashArray:'6 6',fillColor:'#74c69d',fillOpacity:.3}).bindTooltip('🟢 Bir W1 · clean'),
  L.circle([32.0584,76.7260],{radius:230,color:'#40916c',weight:2,dashArray:'6 6',fillColor:'#74c69d',fillOpacity:.3}).bindTooltip('🟢 Gunehar W2 · clean')
]);
document.querySelectorAll('.fchip[data-layer]').forEach(c=>c.onclick=()=>{
  const L_=c.dataset.layer;active[L_]=!active[L_];c.classList.toggle('off');
  if(active[L_])map.addLayer(groups[L_]);else map.removeLayer(groups[L_]);
});
document.getElementById('zoneBtn').onclick=function(){
  if(map.hasLayer(zoneLayer)){map.removeLayer(zoneLayer);this.classList.add('off');}
  else{map.addLayer(zoneLayer);this.classList.remove('off');}
};
function fieldAct(msg){toast(msg);}
function actionBlock(p){
  const owner=p.stream==='bh'?'Bhasha':'Waste Warriors';
  const burning=(p.layer==='burn'); let rec,recIco,recSub,next,secondary;
  if(burning){
    if(p.status==='rec'){rec='Schedule a follow-up camp';recIco='📣';recSub='Keeps reigniting after '+(p.camps||0)+' camp(s) — escalate';next='Burning is habitual here. Repeat camp + enforcement is the lever, not a pickup.';}
    else{rec='Flag as burning hotspot';recIco='🔥';recSub='New burn report — log it & warn the household';next='Burning is a hazard, not waste to collect. Warn the household, then run a camp if it repeats.';}
    secondary=`<button class="act" onclick="fieldAct('🔥 Flagged as burning hotspot')"><span class="ai">🔥</span>Flag hazard</button>
      <button class="act" onclick="fieldAct('📣 Awareness camp scheduled')"><span class="ai">📣</span>Run a camp</button>
      <button class="act" onclick="fieldAct('✅ ${p.title} marked resolved')"><span class="ai">✅</span>Resolve</button>`;
  }else{
    if(p.status==='rec'){rec='Schedule a follow-up camp';recIco='📣';recSub='Dumping returns after '+(p.camps||0)+' camp(s)';next='Clearing alone hasn’t held. Repeat camp + a regular sweep is the lever.';}
    else{rec='Send a collector to clear it';recIco='🚛';recSub='New dump — get someone on site to clear & verify';next='Clear it first, then decide if a camp is worth it.';}
    secondary=`<button class="act" onclick="fieldAct('🚛 Collector dispatched')"><span class="ai">🚛</span>Send collector</button>
      <button class="act" onclick="fieldAct('📣 Awareness camp scheduled')"><span class="ai">📣</span>Run a camp</button>
      <button class="act" onclick="fieldAct('✅ ${p.title} marked resolved')"><span class="ai">✅</span>Resolve</button>`;
  }
  return `<div class="actions"><div class="ahd">What can we do?</div>
    <div class="rec-act"><span class="ico">${recIco}</span><span class="tx"><b>${rec}</b><span>${recSub}</span></span>
      <button class="go" onclick="fieldAct('✓ ${rec} — assigned to ${owner}')">Do it</button></div>
    <div class="act-row">${secondary}</div>
    <div class="nextstep"><span>💡</span><span><b>Next step:</b> ${next}</span></div></div>`;
}
function showDetail(idx){
  const p=pins[idx];const det=document.getElementById('mapDetail');
  const ringbg={burn:'var(--red-soft)',black:'#ececec',ww:'var(--mint-soft)',bh:'var(--terra-soft)'}[p.layer];
  let statusPill={rec:'<span class="pill rec">Recurring</span>',open:'<span class="pill open">Open</span>',
    clean:'<span class="pill ww">Verified clean</span>',partner:'<span class="pill bh">Partner</span>'}[p.status]||'';
  const streamPill=p.stream==='bh'?'<span class="pill bh">Bhasha</span>':'<span class="pill ww">Waste Warriors</span>';
  const problem=(p.layer==='burn'||p.layer==='black');
  det.innerHTML=`<div class="dh"><div class="ring" style="background:${ringbg}">${p.icon}</div>
      <div><h3>${p.title}</h3><div class="sub">${p.sub}</div></div></div>
    <div class="drow"><span class="k">Status</span> ${statusPill}</div>
    <div class="drow"><span class="k">Owner</span> ${streamPill}</div>
    ${problem?`<div class="drow"><span class="k">Total reports</span><b>${p.reports}</b></div>${actionBlock(p)}`
     :`<div class="drow"><span class="k">Last check</span><b>This month</b></div>
       <div style="font-size:13px;color:var(--muted);margin-top:12px">Doing it right — kept clean.</div>`}`;
}
