import { randomInt } from "node:crypto";

export function makeStudentId(abbr:string, year:number, section:string, used:string[]=[]){
  const prefix=abbr.toUpperCase()+"/"+year+"/"+section.toUpperCase()+"/";
  let id="";
  do { id=prefix+randomInt(0,10000).toString().padStart(4,"0"); } while(used.includes(id));
  return id;
}

export function makeTeacherId(abbr:string, year:number, used:string[]=[]){
  const prefix=abbr.toUpperCase()+"/AC/"+year+"/";
  let id="";
  do { id=prefix+randomInt(0,10000).toString().padStart(4,"0"); } while(used.includes(id));
  return id;
}
