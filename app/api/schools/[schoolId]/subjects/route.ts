import { NextResponse } from "next/server";
import { db } from "@/lib/db";
export async function GET(_:Request,{params}:{params:Promise<{schoolId:string}>}){
  const {schoolId}=await params;
  return NextResponse.json(await db.subject.findMany({where:{schoolId},orderBy:{name:"asc"}}));
}
export async function POST(request:Request,{params}:{params:Promise<{schoolId:string}>}){
  const {schoolId}=await params; const body=await request.json().catch(()=>null);
  const name=typeof body?.name==="string"?body.name.trim():"";
  if(!name)return NextResponse.json({error:"Subject name is required"},{status:400});
  return NextResponse.json(await db.subject.create({data:{schoolId,name}}),{status:201});
}