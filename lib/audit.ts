import { db } from "@/lib/db";

export async function recordAudit(input: {
  schoolId: string;
  actorUserId: string;
  action: string;
  entity: string;
  entityId: string;
  details?: Record<string, unknown>;
}) {
  await db.auditLog.create({
    data: {
      schoolId: input.schoolId,
      actorUserId: input.actorUserId,
      action: input.action,
      entity: input.entity,
      entityId: input.entityId,
      details: input.details ? JSON.stringify(input.details) : null,
    },
  });
}
