import { db } from "@/lib/db";

export async function schoolExists(schoolId:string){
  return Boolean(await db.school.findUnique({where:{id:schoolId},select:{id:true}}));
}
