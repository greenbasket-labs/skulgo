import { NextResponse } from "next/server";
import { db } from "@/lib/db";
export async function GET(_:Request,{params}:{params:Promise<{schoolId:string}>}){
  const {schoolId}=await params;
  return NextResponse.json(await db.schoolClass.findMany({where:{schoolId},include:{section:true,students:true},orderBy:{name:"asc"}}));
}
export async function POST(request:Request,{params}:{params:Promise<{schoolId:string}>}){
  const {schoolId}=await params; const body=await request.json().catch(()=>null);
  if(!body?.sectionId||!body?.name)return NextResponse.json({error:"sectionId and name are required"},{status:400});
  const section=await db.section.findFirst({where:{id:body.sectionId,schoolId}});
  if(!section)return NextResponse.json({error:"Section not found in this school"},{status:404});
  return NextResponse.json(await db.schoolClass.create({data:{schoolId,sectionId:body.sectionId,name:String(body.name).trim(),arm:body.arm?String(body.arm).trim():null}}),{status:201});
}