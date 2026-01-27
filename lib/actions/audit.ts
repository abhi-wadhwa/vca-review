'use server';

import { db, auditLogs } from '@/lib/db';
import { auth } from '@/lib/auth';
import { desc } from 'drizzle-orm';

export async function logAction(
  action: string,
  entityType?: string,
  entityId?: number,
  metadata?: Record<string, unknown>
) {
  const session = await auth();
  const userId = session?.user?.id ? parseInt(session.user.id) : null;

  await db.insert(auditLogs).values({
    userId,
    action,
    entityType: entityType || null,
    entityId: entityId || null,
    metadata: metadata || null,
  });
}

export async function getAuditLogs(limit: number = 100) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== 'admin') {
    return { error: 'Unauthorized' };
  }

  const logs = await db.query.auditLogs.findMany({
    with: {
      user: true,
    },
    orderBy: [desc(auditLogs.createdAt)],
    limit,
  });

  return { logs };
}
