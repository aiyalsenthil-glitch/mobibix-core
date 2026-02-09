/**
 * Audit Context Helper
 * Provides utilities to automatically track who created/updated records
 */

/**
 * Get create audit data (createdBy field)
 * Usage: await prisma.user.create({
 *   data: { email, fullName, ...getCreateAudit(userId) }
 * })
 */
export function getCreateAudit(userId?: string) {
  return {
    createdBy: userId || null,
  };
}

/**
 * Get update audit data (updatedBy field)
 * Usage: await prisma.user.update({
 *   where: { id },
 *   data: { email, ...getUpdateAudit(userId) }
 * })
 */
export function getUpdateAudit(userId?: string) {
  return {
    updatedBy: userId || null,
  };
}

/**
 * Get both create and update audit data
 * Usage: For initial create with both fields set
 */
export function getAuditData(userId?: string) {
  return {
    createdBy: userId || null,
    updatedBy: userId || null,
  };
}

/**
 * Extract audit info from record
 * Usage: const audit = getAuditInfo(user);
 * Returns: { createdAt, createdBy, updatedAt, updatedBy }
 */
export function getAuditInfo(record: any) {
  return {
    createdAt: record.createdAt,
    createdBy: record.createdBy,
    updatedAt: record.updatedAt,
    updatedBy: record.updatedBy,
  };
}

/**
 * Format audit trail for display
 * Usage: console.log(formatAuditTrail(user));
 */
export function formatAuditTrail(record: any) {
  return {
    created: {
      date: record.createdAt?.toISOString(),
      by: record.createdBy,
    },
    lastModified: {
      date: record.updatedAt?.toISOString(),
      by: record.updatedBy,
    },
  };
}

/**
 * Create an audit query to show who changed what
 * Useful for audit dashboards
 */
export function auditSelect() {
  return {
    id: true,
    createdAt: true,
    createdBy: true,
    updatedAt: true,
    updatedBy: true,
    deletedAt: true,
    deletedBy: true,
  };
}

/**
 * Get audit trail for an entity with user details
 * Usage: const trail = await getAuditTrailWithUsers(prisma, userId, 'User');
 */
export async function getAuditTrailWithUsers(
  prisma: any,
  entityId: string,
  entityType: 'User' | 'Tenant' | 'Member' | 'Shop' | 'Invoice',
) {
  const record = await prisma[entityType.toLowerCase()].findUnique({
    where: { id: entityId },
    select: auditSelect(),
  });

  if (!record) return null;

  // Fetch user info for creators/updaters
  const creators = new Set(
    [record.createdBy, record.updatedBy, record.deletedBy].filter(Boolean),
  );
  const users = await Promise.all(
    Array.from(creators).map((userId: any) =>
      prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, fullName: true },
      }),
    ),
  );

  const userMap = Object.fromEntries(users.map((u: any) => [u?.id, u]));

  return {
    entity: {
      type: entityType,
      id: entityId,
    },
    created: {
      at: record.createdAt,
      by: userMap[record.createdBy],
    },
    lastModified: {
      at: record.updatedAt,
      by: userMap[record.updatedBy],
    },
    deleted: record.deletedAt
      ? {
          at: record.deletedAt,
          by: userMap[record.deletedBy],
        }
      : null,
  };
}
