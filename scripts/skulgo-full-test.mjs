#!/usr/bin/env node
import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";

const baseUrl=(process.env.TARGET_URL||"http://127.0.0.1:3000").replace(/\/$/,"");
const env={...process.env,TARGET_URL:baseUrl};

function run(command,args,extra={}) {
  return new Promise((resolve,reject)=>{
    const p=spawn(command,args,{stdio:"inherit",shell:process.platform==="win32",env:{...env,...extra}});
    p.on("error",reject);
    p.on("exit",code=>resolve(code??1));
  });
}

const e2e=await run("npx",["playwright","test"]);
if(e2e!==0)process.exit(e2e);

const server=spawn("npm",["run","dev"],{stdio:"inherit",shell:process.platform==="win32",env});
let ready=false;
try {
  for(let i=0;i<30;i++){
    try { const r=await fetch(baseUrl); if(r.status<500){ready=true;break;} } catch {}
    await sleep(1000);
  }
  if(!ready)throw new Error("Next.js server did not become ready for capacity test.");
  process.exitCode=await run("node",["scripts/skulgo-capacity-test.mjs"]);
} finally {
  server.kill();
}
