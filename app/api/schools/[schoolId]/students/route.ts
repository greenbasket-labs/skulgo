import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { makeStudentId } from "@/lib/ids";

export async function GET(_:Request,{params}:{params:Promise<{schoolId:string}>}){
  const {schoolId}=await params;
  return NextResponse.json(await db.student.findMany({where:{schoolId},include:{class:true},orderBy:{lastName:"asc"}}));
}

export async function POST(request:Request,{params}:{params:Promise<{schoolId:string}>}){
  const {schoolId}=await params; const body=await request.json().catch(()=>null);
  const firstName=String(body?.firstName??"").trim(), lastName=String(body?.lastName??"").trim(), classId=String(body?.classId??"");
  if(!firstName||!lastName||!classId)return NextResponse.json({error:"firstName, lastName and classId are required"},{status:400});
  const school=await db.school.findUnique({where:{id:schoolId}});
  const schoolClass=await db.schoolClass.findFirst({where:{id:classId,schoolId},include:{section:true}});
  if(!school||!schoolClass)return NextResponse.json({error:"Class does not belong to this school"},{status:404});
  const existing=await db.student.findMany({where:{schoolId},select:{admissionId:true}});
  const admissionId=makeStudentId(school.abbr,new Date().getFullYear(),schoolClass.section.name,existing.map(x=>x.admissionId));
  const student=await db.student.create({data:{schoolId,firstName,lastName,classId,admissionId}});
  return NextResponse.json(student,{status:201});
}