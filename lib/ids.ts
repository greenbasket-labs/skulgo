import { randomInt } from "node:crypto";

export function sectionCode(section: string) {
  const normalized = section.trim().toUpperCase().replace(/\s+/g, " ");

  const standard: Record<string, string> = {
    "SENIOR SECONDARY": "SS",
    "SENIOR SECONDARY SCHOOL": "SS",
    "SS": "SS",
    "JUNIOR SECONDARY": "JS",
    "JUNIOR SECONDARY SCHOOL": "JS",
    "JS": "JS",
    "PRIMARY": "PRI",
    "PRIMARY SCHOOL": "PRI",
    "PRI": "PRI",
    "NURSERY": "NUR",
    "NURSERY SCHOOL": "NUR",
    "NUR": "NUR",
  };

  if (standard[normalized]) return standard[normalized];

  const custom = normalized
    .replace(/[^A-Z0-9 ]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map(word => word[0])
    .join("")
    .slice(0, 6);

  return custom || "SCH";
}

export function makeStudentId(abbr:string, year:number, section:string, used:string[]=[]){
  const prefix=abbr.toUpperCase()+"/"+year+"/"+sectionCode(section)+"/";
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

export function makeNonAcademicStaffId(abbr:string, year:number, used:string[]=[]){
  const prefix=abbr.toUpperCase()+"/NA/"+year+"/";
  let id="";
  do { id=prefix+randomInt(0,10000).toString().padStart(4,"0"); } while(used.includes(id));
  return id;
}
