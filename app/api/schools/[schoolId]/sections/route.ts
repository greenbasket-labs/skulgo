import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(_:Request,{params}:{params:Promise<{schoolId:string}>}){
  const {schoolId}=await params;
  return NextResponse.json(await db.section.findMany({where:{schoolId},include:{classes:true},orderBy:{name:"asc"}}));
}
export async function POST(request:Request,{params}:{params:Promise<{schoolId:string}>}){
  const {schoolId}=await params; const body=await request.json().catch(()=>null);
  const name=typeof body?.name==="string"?body.name.trim():"";
  if(!name)return NextResponse.json({error:"Section name is required"},{status:400});
  return NextResponse.json(await db.section.create({data:{schoolId,name}}),{status:201});
}