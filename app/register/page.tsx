"use client";

import {FormEvent,useState} from "react";

export default function RegisterPage(){
  const [message,setMessage]=useState("");
  async function submit(e:FormEvent<HTMLFormElement>){
    e.preventDefault(); setMessage("School registration will be connected to the database in the next core step.");
  }
  return <main className="shell"><div className="card" style={{maxWidth:600,margin:"40px auto"}}>
    <h1>Register your school</h1>
    <p className="muted">Keep setup small. SkulGo will create the basic structure automatically.</p>
    <form onSubmit={submit} className="grid">
      <input required name="schoolName" placeholder="School name"/>
      <input required name="abbr" placeholder="School abbreviation"/>
      <input required name="address" placeholder="Address"/>
      <input required name="phone" placeholder="Phone"/>
      <input required type="email" name="email" placeholder="School email"/>
      <input required name="adminName" placeholder="Principal/Admin name"/>
      <input required type="email" name="adminEmail" placeholder="Principal/Admin email"/>
      <input required type="password" name="password" placeholder="Password"/>
      <button className="button" type="submit">Create school</button>
    </form>
    {message&&<p className="muted">{message}</p>}
  </div></main>;
}
