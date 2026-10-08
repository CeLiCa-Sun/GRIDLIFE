// Run with Node 22: node tests/integration.js
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const source=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
assert(source,'Inline script missing');new vm.Script(source);
const instrumented=source.replace(/render\(\);\}\)\(\);\s*$/,'render();return {act,get:()=>s,nextDay,setTab:t=>{tab=t;render()}};})();');
assert(instrumented.includes('return {act,get:'),'Harness hook missing');
function boot(data={}){
 const storage={...data},app={innerHTML:''},input={value:''};
 const document={querySelector:q=>q==='#app'?app:q==='#save-text'?input:null,querySelectorAll:()=>[],createElement:()=>({remove(){}}),body:{appendChild(){}}};
 const localStorage={getItem:k=>storage[k]||null,setItem:(k,v)=>storage[k]=v};
 const g=vm.runInNewContext(instrumented.trim(),{document,localStorage,requestAnimationFrame:()=>1,clearTimeout:()=>{},setTimeout:()=>1,confirm:()=>true,console});
 return {g,storage,app,input}
}
const legacy={day:41,hour:9,money:9000,car:{condition:84,engine:2},city:{garage:1}};
let b=boot({gridlife_alpha_1:JSON.stringify(legacy)});
assert.equal(b.g.get().day,41);assert.equal(b.g.get().car.engine,2);assert.equal(b.g.get().research.engine,0);
b=boot({gridlife_alpha_1:'CORRUPTED',gridlife_alpha_1_backup:JSON.stringify(legacy)});
assert.equal(b.g.get().day,41,'Backup recovery failed');
b=boot();for(const t of ['dashboard','finance','race','work','city','garage','loot','auto']){b.g.setTab(t);assert(b.app.innerHTML.length>300,'Blank page: '+t)}
const s=b.g.get();s.money=50000000;s.parts=50;s.energy=100;s.hour=8;
b.g.act('research','engine');assert.equal(s.research.engine,1);
b.g.act('marketBuy');b.g.act('marketSell');
b.g.act('plotSelect','5');b.g.act('build','cafe');assert.equal(s.plotMap[5],'cafe');
s.hour=8;s.energy=100;b.g.act('race');b.g.act('raceDecision','balanced');b.g.act('raceDecision','tires');
assert(s.raceSession?.live,'Race never started');b.g.act('batchLap');b.g.act('batchLap');assert.equal(s.raceSession.live.lap,2);
const resumed=boot(b.storage);assert.equal(resumed.g.get().raceSession.live.lap,2);assert.equal(resumed.g.get().raceSession.live.paused,true);
let st=resumed.g.get(),ticks=0;
while(st.raceSession&&ticks++<9){resumed.g.act('batchLap');if(st.raceSession?.live?.waiting)resumed.g.act('batchIncident','repair')}
assert.equal(st.races,1);assert.equal(st.raceSession,null,'Race stuck after 5 laps');
resumed.g.act('batchLap');assert.equal(st.races,1,'Duplicate reward');
const day=st.day;resumed.g.act('sleep');assert.equal(st.day,day+1);assert(Number.isFinite(st.money));
b=boot();const rich=b.g.get();rich.money=100000000;
for(let i=0;i<150;i++){rich.hour=8;rich.energy=100;b.g.act('race');b.g.act('raceDecision','balanced');b.g.act('raceDecision','tires');let guard=0;while(rich.raceSession&&guard++<9){b.g.act('batchLap');if(rich.raceSession?.live?.waiting)b.g.act('batchIncident','repair')}assert.equal(rich.raceSession,null,'Stuck race '+i);for(const key of Object.keys(rich.car.damage))rich.car.damage[key]=0;rich.car.condition=100}
for(let i=0;i<365;i++)b.g.nextDay();
assert.equal(rich.races,150);assert.equal(rich.day,366);assert(Number.isFinite(rich.money));
const empty=boot(),bankrupt=empty.g.get();bankrupt.money=0;for(let i=0;i<365;i++)empty.g.nextDay();
assert(Number.isFinite(bankrupt.money)&&Number.isFinite(bankrupt.debt));
console.log('PASS integration: pages, save migration, recovery, live restart, controls, 150 races, 365-day rich/low-cash simulations');
