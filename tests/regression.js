// GRIDLIFE regression suite (Node 18+): node tests/regression.js
const fs=require('node:fs');const vm=require('node:vm');const assert=require('node:assert/strict');
const html=fs.readFileSync(require('node:path').join(__dirname,'..','index.html'),'utf8');
const source=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];assert(source,'Missing inline script');
new vm.Script(source,{filename:'index.html'});
const patched=source.replace(/render\(\);\}\)\(\);\s*$/,'render();return {act,get:()=>s,nextDay,render};})();');
assert(patched.includes('return {act,get:'),'Unable to expose simulation for testing');
function boot(data={}){
 const app={innerHTML:''};const storage={...data};let tick=0;
 const document={querySelector:q=>q==='#app'?app:null,querySelectorAll:()=>[],createElement:()=>({remove(){}}),body:{appendChild(){}}};
 const localStorage={getItem:k=>storage[k]||null,setItem:(k,v)=>storage[k]=v};
 const context={document,localStorage,requestAnimationFrame:()=>1,cancelAnimationFrame:()=>{},clearTimeout:()=>{},setTimeout:()=>++tick,confirm:()=>true,Math,Date,JSON,Number,String,Object,Array,console};
 const result=vm.runInNewContext(patched.trim(),context);
 assert(result,'Initialization returned no game interface');return {game:result,storage,app};
}
const legacy={day:43,hour:9,money:5000,car:{engine:2,handling:3,condition:77},city:{garage:1}};
let b=boot({gridlife_alpha_1:JSON.stringify(legacy)});
assert.equal(b.game.get().day,43);assert.equal(b.game.get().car.engine,2);assert.equal(b.game.get().car.damage.engine,0);
b=boot({gridlife_alpha_1:'INVALID',gridlife_alpha_1_backup:JSON.stringify(legacy)});assert.equal(b.game.get().day,43);
b=boot();const s=b.game.get();s.money=100000000;
let completed=0;
for(let i=0;i<250;i++){
 s.hour=8;s.energy=100;b.game.act('race');b.game.act('raceDecision','balanced');b.game.act('raceDecision','tires');assert(s.raceSession?.live,'Race failed to start');
 for(let tries=0;tries<8&&s.raceSession;tries++){b.game.act('batchLap');if(s.raceSession?.live?.waiting)b.game.act('batchIncident','continue')}
 assert.equal(s.raceSession,null,'Race stuck');completed++;
 for(let key of Object.keys(s.car.damage))s.car.damage[key]=0;s.car.condition=100;
}
for(let i=0;i<1100;i++)b.game.nextDay();
assert.equal(s.day,1101);assert(Number.isFinite(s.money));assert.equal(s.races,250);assert(b.storage.gridlife_alpha_1);
console.log('PASS: syntax, old-save migration, backup restoration, '+completed+' races, 1100 days');
