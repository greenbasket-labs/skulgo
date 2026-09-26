import { db } from "@/lib/db";
import { verifyPin } from "@/lib/auth";

export type ResultCheckerAccess = {
  schoolId: string;
  schoolName: string;
  schoolAbbr: string;
  membershipId: string;
  userId: string;
  email: string;
  studentIds: string[];
  children: { id: string; name: string }[];
};

export async function resultCheckerEnabled() {
  const setting = await db.platformSetting.findUnique({ where: { key: "resultCheckerEnabled" } });
  return setting?.value === "true";
}

export async function resolveResultCheckerAccess(id: string, pin: string): Promise<ResultCheckerAccess | null> {
  const accessId = id.trim();
  if (!accessId || !/^[0-9]{4,6}$/.test(pin)) return null;

  const student = await db.student.findUnique({
    where: { admissionId: accessId },
    include: {
      school: { select: { id: true, name: true, abbr: true } },
      user: { select: { id: true, email: true, pinHash: true, pinFailedAttempts: true, pinLockedUntil: true } },
    },
  });

  if (student?.user) {
    const user = student.user;
    if (user.pinLockedUntil && user.pinLockedUntil > new Date()) return null;
    if (!user.pinHash || !verifyPin(pin, user.pinHash)) {
      await recordPinFailure(user.id, user.pinFailedAttempts);
      return null;
    }

    await clearPinFailures(user.id);
    const membership = await db.schoolMembership.findFirst({
      where: { schoolId: student.schoolId, userId: user.id, role: "STUDENT", active: true },
      select: { id: true },
    });
    if (!membership) return null;

    return {
      schoolId: student.school.id,
      schoolName: student.school.name,
      schoolAbbr: student.school.abbr,
      membershipId: membership.id,
      userId: user.id,
      email: user.email,
      studentIds: [student.id],
      children: [{ id: student.id, name: student.firstName + " " + student.lastName }],
    };
  }

  const parentMembership = await db.schoolMembership.findFirst({
    where: { workspaceCode: accessId, role: "PARENT", active: true },
    include: {
      school: { select: { id: true, name: true, abbr: true } },
      user: { select: { id: true, email: true, pinHash: true, pinFailedAttempts: true, pinLockedUntil: true, parent: { select: { id: true } } } },
    },
  });

  if (!parentMembership) return null;
  const parentId = parentMembership.user.parent?.id;
  if (!parentId) return null;
  const user = parentMembership.user;
  if (user.pinLockedUntil && user.pinLockedUntil > new Date()) return null;
  if (!user.pinHash || !verifyPin(pin, user.pinHash)) {
    await recordPinFailure(user.id, user.pinFailedAttempts);
    return null;
  }

  const links = await db.parentStudent.findMany({
    where: { parentId, approved: true, student: { schoolId: parentMembership.schoolId } },
    select: { student: { select: { id: true, firstName: true, lastName: true } } },
    orderBy: { student: { lastName: "asc" } },
  });

  await clearPinFailures(user.id);

  return {
    schoolId: parentMembership.school.id,
    schoolName: parentMembership.school.name,
    schoolAbbr: parentMembership.school.abbr,
    membershipId: parentMembership.id,
    userId: user.id,
    email: user.email,
    studentIds: links.map(link => link.student.id),
    children: links.map(link => ({ id: link.student.id, name: link.student.firstName + " " + link.student.lastName })),
  };
}

async function recordPinFailure(userId: string, attempts: number) {
  const next = attempts + 1;
  await db.user.update({
    where: { id: userId },
    data: {
      pinFailedAttempts: next >= 5 ? 0 : next,
      pinLockedUntil: next >= 5 ? new Date(Date.now() + 15 * 60 * 1000) : null,
    },
  });
}

async function clearPinFailures(userId: string) {
  await db.user.update({ where: { id: userId }, data: { pinFailedAttempts: 0, pinLockedUntil: null } });
}
