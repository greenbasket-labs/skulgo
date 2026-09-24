#!/usr/bin/env node
const target=(process.env.TARGET_URL||"http://127.0.0.1:3000").replace(/\/$/,"");
const stageSeconds=Math.max(3,Number(process.env.STAGE_SECONDS||10));
const stages=(process.env.STAGES||"50,100,200,500,1000").split(",").map(Number).filter(Number.isFinite).filter(n=>n>0);
if(/skulgo\.com|skulgo\.onrender\.com/i.test(target)&&process.env.ALLOW_PRODUCTION_LOAD_TEST!=="YES"){console.error("Refusing production load test without ALLOW_PRODUCTION_LOAD_TEST=YES.");process.exit(2);}
let users=[];try{users=JSON.parse(process.env.TEST_USERS||"[]")}catch{console.error("TEST_USERS must be valid JSON.");process.exit(2)}
if(!Array.isArray(users)||!users.length){console.error('TEST_USERS is required. Example: TEST_USERS=\'[{"email":"admin@example.com","password":"..."}]\'');process.exit(2)}
function cookies(r){return typeof r.headers.getSetCookie==="function"?r.headers.getSetCookie().map(v=>v.split(";")[0]).join("; "):""}
async function login(u){
 const r=await fetch(target+"/api/auth/login",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({email:u.email,password:u.password})});
 const d=await r.json().catch(()=>({})); if(!r.ok)throw Error(`Login failed for ${u.email}: HTTP ${r.status} ${d.error||""}`);
 const ws=Array.isArray(d.workspaces)?d.workspaces:[]; if(!ws.length)throw Error(`No school workspace for ${u.email}`);
 const w=u.membershipId?ws.find(x=>x.membershipId===u.membershipId):ws[0]; if(!w)throw Error(`Membership not found for ${u.email}`);
 const c=cookies(r);
 const s=await fetch(target+"/api/workspaces/select",{method:"POST",headers:{"content-type":"application/json",...(c?{cookie:c}:{})},body:JSON.stringify({membershipId:w.membershipId})});
 if(!s.ok)throw Error(`Workspace selection failed for ${u.email}: HTTP ${s.status}`);
 return {email:u.email,role:w.role,schoolId:w.schoolId,cookie:[c,cookies(s)].filter(Boolean).join("; ")};
}
function routes(u){const s=encodeURIComponent(u.schoolId);const r=[["dashboard","/dashboard"],["results",`/api/schools/${s}/results?published=true`],["fees",`/api/schools/${s}/fees`]];if(u.role==="ADMIN")r.push(["settings",`/api/schools/${s}/settings`]);return r}
async function once(u,r){const t=performance.now();try{const x=await fetch(target+r[1],{headers:u.cookie?{cookie:u.cookie}:{}});return{ok:x.ok,status:x.status,ms:performance.now()-t,route:r[0]}}catch(e){return{ok:false,status:0,ms:performance.now()-t,route:r[0],error:String(e)}}}
async function stage(n,sessions){
 const started=performance.now(),deadline=started+stageSeconds*1000,all=[];let cursor=0;
 async function vu(i){const u=sessions[i%sessions.length],rs=routes(u);while(performance.now()<deadline)all.push(await once(u,rs[cursor++%rs.length]))}
 await Promise.all(Array.from({length:n},(_,i)=>vu(i)));
 const elapsed=(performance.now()-started)/1000,ok=all.filter(x=>x.ok),lat=ok.map(x=>x.ms).sort((a,b)=>a-b);
 const pct=p=>lat.length?lat[Math.min(lat.length-1,Math.floor(lat.length*p))]:0;
 const byRoute={};for(const x of all){byRoute[x.route]??={requests:0,errors:0,totalMs:0};byRoute[x.route].requests++;byRoute[x.route].totalMs+=x.ms;if(!x.ok)byRoute[x.route].errors++}
 return{concurrency:n,elapsed,requests:all.length,successful:ok.length,errors:all.length-ok.length,requestsPerSecond:all.length/elapsed,p50:pct(.5),p95:pct(.95),p99:pct(.99),byRoute,sampleErrors:all.filter(x=>!x.ok).slice(0,5)}
}
console.log("\nSkulGo capacity baseline");console.log("Target:",target);console.log("Stages:",stages.join(", "));console.log("Stage duration:",stageSeconds+"s");console.log("Test accounts:",users.length);
const sessions=[];try{for(const u of users)sessions.push(await login(u))}catch(e){console.error("SETUP FAILED:",e.message);process.exit(1)}
console.log("Authenticated:",sessions.map(x=>x.role+":"+x.email).join(", "));
for(const n of stages)console.log(JSON.stringify(await stage(n,sessions)));
console.log("\nRecord Render Web CPU/RAM and PostgreSQL CPU/RAM/connections for each stage. Do not convert this baseline directly into school limits until those metrics are reviewed.");
