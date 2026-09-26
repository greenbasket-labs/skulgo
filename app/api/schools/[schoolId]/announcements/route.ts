import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";

async function access(user: Awaited<ReturnType<typeof getCurrentUser>>, schoolId: string) {
  if (!user?.membership || user.membership.schoolId !== schoolId || !user.membership.active) return null;
  return user.membership;
}

export async function GET(
  _: Request,
  { params }: { params: Promise<{ schoolId: string }> }
) {
  const user = await getCurrentUser();
  const { schoolId } = await params;
  if (!user) return NextResponse.json({ error: "Login required" }, { status: 401 });

  const membership = await access(user, schoolId);
  if (!membership?.active) {
    return NextResponse.json({ error: "School access required" }, { status: 403 });
  }

  const role = membership.role;
  const audienceWhere = role === "ADMIN"
    ? {}
    : {
        OR: [
          { audience: "SCHOOL" },
          { audience: role },
          ...(role === "TEACHER" || role === "CASHIER" ? [{ audience: "STAFF" }] : []),
        ],
      };

  return NextResponse.json(await db.announcement.findMany({
    where: { schoolId, ...audienceWhere },
    orderBy: { createdAt: "desc" },
  }));
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ schoolId: string }> }
) {
  const user = await getCurrentUser();
  const { schoolId } = await params;
  if (!user) return NextResponse.json({ error: "Login required" }, { status: 401 });

  const membership = await access(user.id, schoolId);
  if (!membership?.active || membership.role !== "ADMIN") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  const announcementBody = typeof body?.body === "string" ? body.body.trim() : "";
  const allowedAudiences = ["SCHOOL", "STAFF", "TEACHER", "STUDENT", "PARENT", "CASHIER"];
  const audience = typeof body?.audience === "string" && allowedAudiences.includes(body.audience)
    ? body.audience
    : "SCHOOL";

  if (!title || !announcementBody) {
    return NextResponse.json({ error: "Title and message are required" }, { status: 400 });
  }

  const announcement = await db.announcement.create({
    data: {
      schoolId,
      title,
      body: announcementBody,
      audience,
      createdById: user.id,
    },
  });

  await recordAudit({
    schoolId,
    actorUserId: user.id,
    action: "CREATE",
    entity: "ANNOUNCEMENT",
    entityId: announcement.id,
    details: { title, audience },
  });

  return NextResponse.json(announcement, { status: 201 });
}
