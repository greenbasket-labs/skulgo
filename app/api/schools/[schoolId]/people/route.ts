"use strict";

import { randomInt } from "node:crypto";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser, hashPassword } from "@/lib/auth";
import { createOtp, createRawToken, hashToken } from "@/lib/email-tokens";
import { createReferralCode } from "@/lib/referrals";
import { sendPasswordResetEmail, sendVerificationEmail } from "@/lib/email";
import { makeStudentId, makeTeacherId } from "@/lib/ids";
import { recordAudit } from "@/lib/audit";

const ROLES = ["TEACHER", "STUDENT", "PARENT"] as const;
type AddRole = typeof ROLES[number];

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function randomTemporaryPassword() {
  return `SkulGo-${randomInt(10000000, 99999999)}`;
}

function splitName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] || name.trim(),
    lastName: parts.slice(1).join(" ") || "Student",
  };
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ schoolId: string }> }
) {
  const admin = await getCurrentUser();
  const { schoolId } = await params;

  if (!admin?.membership || admin.membership.schoolId !== schoolId || admin.membership.role !== "ADMIN") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const role = clean(body?.role).toUpperCase() as AddRole;
  const accountId = clean(body?.accountId).toUpperCase();
  const name = clean(body?.name);
  const email = clean(body?.email).toLowerCase();
  const phone = clean(body?.phone);
  const gender = clean(body?.gender);
  const guardianName = clean(body?.guardianName);
  const guardianPhone = clean(body?.guardianPhone);
  const relationship = clean(body?.relationship);
  const classId = clean(body?.classId);
  const studentAdmissionId = clean(body?.studentAdmissionId);

  if (!ROLES.includes(role)) {
    return NextResponse.json({ error: "Choose Teacher, Student or Parent." }, { status: 400 });
  }

  if (!accountId && (!name || !email)) {
    return NextResponse.json({ error: "Name and email are required for a new account." }, { status: 400 });
  }

  const school = await db.school.findUnique({
    where: { id: schoolId },
    select: { id: true, abbr: true },
  });
  if (!school) return NextResponse.json({ error: "School not found." }, { status: 404 });

  let existingUser = accountId
    ? await db.user.findUnique({ where: { referralCode: accountId } })
    : null;

  if (accountId && !existingUser) {
    return NextResponse.json({ error: "SkulGo Account ID not found." }, { status: 404 });
  }

  if (!existingUser && email) {
    existingUser = await db.user.findUnique({ where: { email } });
  }

  let user = existingUser;
  let setupToken: string | null = null;
  let verificationToken: string | null = null;
  let verificationOtp: string | null = null;
  let createdAccount = false;

  if (!user) {
    const temporaryPassword = randomTemporaryPassword();
    verificationToken = createRawToken();
    verificationOtp = createOtp();
    setupToken = createRawToken();

    let referralCode = createReferralCode();
    while (await db.user.findUnique({ where: { referralCode }, select: { id: true } })) {
      referralCode = createReferralCode();
    }

    const setupHash = hashToken(setupToken);

    user = await db.user.create({
      data: {
        name,
        email,
        phone: phone || null,
        gender: gender || null,
        passwordHash: hashPassword(temporaryPassword),
        referralCode,
        emailVerificationTokenHash: hashToken(verificationToken),
        emailVerificationExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        emailVerificationOtpHash: hashToken(verificationOtp),
        emailVerificationOtpExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
        passwordResetTokenHash: setupHash,
        passwordResetExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });
    createdAccount = true;
  }

  const existingMembership = await db.schoolMembership.findUnique({
    where: { schoolId_userId: { schoolId, userId: user.id } },
  });

  if (existingMembership?.active && existingMembership.role !== role) {
    return NextResponse.json(
      { error: "This person is already connected to this school with another role." },
      { status: 409 }
    );
  }

  if (role === "STUDENT") {
    if (!classId) return NextResponse.json({ error: "Choose a class for the student." }, { status: 400 });

    const validClass = await db.schoolClass.findFirst({
      where: { id: classId, schoolId },
      include: { section: true },
    });
    if (!validClass) return NextResponse.json({ error: "Class does not belong to this school." }, { status: 400 });

    const existingStudent = await db.student.findUnique({ where: { userId: user.id } });
    if (existingStudent && existingStudent.schoolId !== schoolId) {
      return NextResponse.json(
        { error: "This account already has a Student record in another school." },
        { status: 409 }
      );
    }
  }

  if (role === "PARENT") {
    if (!studentAdmissionId) {
      return NextResponse.json({ error: "Enter the child's Admission ID." }, { status: 400 });
    }
    const child = await db.student.findFirst({
      where: { schoolId, admissionId: studentAdmissionId },
      select: { id: true },
    });
    if (!child) return NextResponse.json({ error: "Student not found with that Admission ID." }, { status: 404 });
  }

  await db.$transaction(async tx => {
    await tx.user.update({
      where: { id: user!.id },
      data: {
        ...(phone ? { phone } : {}),
        ...(gender ? { gender } : {}),
      },
    });

    await tx.schoolMembership.upsert({
      where: { schoolId_userId: { schoolId, userId: user!.id } },
      update: {
        active: true,
        role,
        endedAt: null,
        endReason: null,
      },
      create: {
        schoolId,
        userId: user!.id,
        role,
      },
    });

    if (role === "TEACHER") {
      const existingTeacher = await tx.teacher.findUnique({ where: { userId: user!.id } });
      if (!existingTeacher) {
        const ids = await tx.teacher.findMany({ select: { teacherCode: true } });
        await tx.teacher.create({
          data: {
            userId: user!.id,
            teacherCode: makeTeacherId(school.abbr, new Date().getFullYear(), ids.map(item => item.teacherCode)),
            approved: true,
          },
        });
      } else if (!existingTeacher.approved) {
        await tx.teacher.update({ where: { id: existingTeacher.id }, data: { approved: true } });
      }
    }

    if (role === "STUDENT") {
      const validClass = await tx.schoolClass.findFirst({
        where: { id: classId, schoolId },
        include: { section: true },
      });
      if (!validClass) throw new Error("Class does not belong to this school.");

      const existingStudent = await tx.student.findUnique({ where: { userId: user!.id } });
      if (!existingStudent) {
        const ids = await tx.student.findMany({ where: { schoolId }, select: { admissionId: true } });
        const admissionId = makeStudentId(
          school.abbr,
          new Date().getFullYear(),
          validClass.section.name,
          ids.map(item => item.admissionId)
        );
        const names = splitName(user!.name);
        await tx.student.create({
          data: {
            schoolId,
            userId: user!.id,
            firstName: names.firstName,
            lastName: names.lastName,
            classId,
            admissionId,
            gender: gender || null,
            guardianName: guardianName || null,
            guardianPhone: guardianPhone || null,
          },
        });
      } else {
        await tx.student.update({
          where: { id: existingStudent.id },
          data: {
            classId,
            ...(gender ? { gender } : {}),
            ...(guardianName ? { guardianName } : {}),
            ...(guardianPhone ? { guardianPhone } : {}),
          },
        });
      }
    }

    if (role === "PARENT") {
      const child = await tx.student.findFirst({
        where: { schoolId, admissionId: studentAdmissionId },
        select: { id: true },
      });
      if (!child) throw new Error("Student not found with that Admission ID.");

      const parent = await tx.parent.findUnique({ where: { userId: user!.id } });
      const parentRecord = parent ?? await tx.parent.create({ data: { userId: user!.id } });

      await tx.parentStudent.upsert({
        where: { parentId_studentId: { parentId: parentRecord.id, studentId: child.id } },
        update: { approved: true, relationship: relationship || null },
        create: { parentId: parentRecord.id, studentId: child.id, approved: true, relationship: relationship || null },
      });
    }

    await tx.auditLog.create({
      data: {
        schoolId,
        actorUserId: admin!.id,
        action: "ADD_PERSON",
        entity: "SCHOOL_MEMBERSHIP",
        entityId: existingMembership?.id ?? user!.id,
        details: JSON.stringify({
          role,
          userId: user!.id,
          accountId: user!.referralCode,
          createdAccount,
          studentAdmissionId: role === "PARENT" ? studentAdmissionId : undefined,
          classId: role === "STUDENT" ? classId : undefined,
        }),
      },
    });
  });

  if (createdAccount && setupToken && verificationToken && verificationOtp) {
    let setupEmailSent = true;
    try {
      await sendVerificationEmail(user.email, user.name, verificationToken, verificationOtp);
      await sendPasswordResetEmail(user.email, user.name, setupToken);
    } catch {
      setupEmailSent = false;
    }

    return NextResponse.json({
      ok: true,
      createdAccount: true,
      setupEmailSent,
      accountId: user.referralCode,
      message: setupEmailSent
        ? "Person added. SkulGo sent an email to verify the account and finish setting the password."
        : "Person added, but the setup email could not be sent.",
    }, { status: 201 });
  }

  return NextResponse.json({
    ok: true,
    createdAccount: false,
    accountId: user.referralCode,
    message: "Person added to this school.",
  }, { status: 201 });
}
