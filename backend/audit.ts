import { prisma } from "./prisma";
import type { AuthUser } from "./auth-core";

export async function audit(
  user: AuthUser,
  action: string,
  entity: string,
  entityId: string,
  before?: unknown,
  after?: unknown,
) {
  await prisma.auditLog.create({
    data: {
      actorId: user.id,
      actorName: user.name,
      action,
      entity,
      entityId,
      before: before ? JSON.stringify(before) : "",
      after: after ? JSON.stringify(after) : "",
    },
  });
}

export async function notify(userId: string, title: string, body: string) {
  await prisma.notification.create({ data: { userId, title, body } });
}
