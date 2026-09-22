import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
const COOKIE="skulgo_session", MAX_AGE=60*60*24*7;
function secret(){return process.env.SESSION_SECRET||"skulgo-dev-session-secret-change-me";}
export function hashPassword(password:string){const salt=randomBytes(16).toString("hex");return `scrypt:${salt}:${scryptSync(password,salt,64).toString("hex")}`;}
export function verifyPassword(password:string,stored:string){const[kind,salt,hex]=stored.split(":");if(kind!=="scrypt"||!salt||!hex)return false;const actual=scryptSync(password,salt,64),expected=Buffer.from(hex,"hex");return actual.length===expected.length&&timingSafeEqual(actual,expected);}
type Session={userId:string;schoolId:string|null;role:string|null;exp:number};
function sign(v:string){return createHmac("sha256",secret()).update(v).digest("base64url");}
function encode(s:Session){const body=Buffer.from(JSON.stringify(s)).toString("base64url");return `${body}.${sign(body)}`;}
function decode(token:string):Session|null{const[body,sig]=token.split(".");if(!body||!sig)return null;const a=Buffer.from(sig),b=Buffer.from(sign(body));if(a.length!==b.length||!timingSafeEqual(a,b))return null;try{const s=JSON.parse(Buffer.from(body,"base64url").toString("utf8")) as Session;return s.exp>Math.floor(Date.now()/1000)?s:null;}catch{return null;}}
export function setSession(response:Response,user:{id:string;schoolId?:string|null;role?:string|null}){const token=encode({userId:user.id,schoolId:user.schoolId??null,role:user.role??null,exp:Math.floor(Date.now()/1000)+MAX_AGE});response.headers.append("Set-Cookie",`${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${MAX_AGE}${process.env.NODE_ENV==="production"?"; Secure":""}`);}
export function clearSession(response:Response){response.headers.append("Set-Cookie",`${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`);}
export async function getSession(){const token=(await cookies()).get(COOKIE)?.value;return token?decode(token):null;}
export async function getCurrentUser(){const s=await getSession();if(!s)return null;return db.user.findUnique({where:{id:s.userId},select:{id:true,schoolId:true,name:true,email:true,role:true,teacher:{select:{id:true,teacherCode:true,approved:true}}}});}
