/**
 * Soft Delete Helper
 * Provides reusable patterns for soft delete operations across services
 */

/**
 * Get WHERE clause to exclude soft-deleted records
 * Usage: findMany({ where: { ...filterWhere, ...excludeDeleted() } })
 */
export function excludeDeleted() {
  return {
    deletedAt: null,
  };
}

/**
 * Get WHERE clause to include deleted records
 * Usage: For recovery/restore operations
 */
export function includeDeleted() {
  return {}; // No filter = include all
}

/**
 * Get WHERE clause for only soft-deleted records
 * Usage: For viewing deleted items
 */
export function onlyDeleted() {
  return {
    deletedAt: { not: null },
  };
}

/**
 * Soft delete data (mark as deleted, don't hard delete)
 * Usage: await prisma.user.update({
 *   where: { id },
 *   data: softDeleteData(userId),
 * })
 */
export function softDeleteData(deletedById: string) {
  return {
    deletedAt: new Date(),
    deletedBy: deletedById,
  };
}

/**
 * Soft delete many records
 * Usage: await prisma.user.updateMany({
 *   where: { tenantId },
 *   data: softDeleteData(userId),
 * })
 */
export function softDeleteManyData(deletedById: string) {
  return {
    deletedAt: new Date(),
    deletedBy: deletedById,
  };
}

/**
 * Restore soft-deleted record
 * Usage: await prisma.user.update({
 *   where: { id },
 *   data: restoreData(),
 * })
 */
export function restoreData() {
  return {
    deletedAt: null,
    deletedBy: null,
  };
}

/**
 * Permanent delete (hard delete)
 * Only call this after soft delete if you really need to hard delete
 * For compliance/GDPR right to be forgotten
 */
export async function hardDelete<T>(model: any, where: any): Promise<T | null> {
  return model.delete({ where });
}

/**
 * Count active (non-deleted) records
 * Usage: const count = await countActive(prisma.user, { tenantId })
 */
export async function countActive(
  model: any,
  where: any = {},
): Promise<number> {
  return model.count({
    where: {
      ...where,
      ...excludeDeleted(),
    },
  });
}

/**
 * List active records with pagination
 * Usage: const users = await listActive(
 *   prisma.user,
 *   { tenantId },
 *   { skip: 0, take: 10 }
 * )
 */
export async function listActive(
  model: any,
  where: any = {},
  pagination?: { skip?: number; take?: number },
) {
  return model.findMany({
    where: {
      ...where,
      ...excludeDeleted(),
    },
    skip: pagination?.skip,
    take: pagination?.take,
  });
}

/**
 * Find active record by ID
 * Usage: const user = await findActiveById(prisma.user, id)
 */
export async function findActiveById(model: any, id: string) {
  return model.findFirst({
    where: {
      id,
      ...excludeDeleted(),
    },
  });
}
