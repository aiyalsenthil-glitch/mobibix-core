import { BillingCycle } from '@prisma/client';

/** Tenant codes excluded from all admin analytics queries. */
export const TEST_TENANT_CODES = [
  'TEST_FREE',
  'TEST_SUB_ACTIVE',
  'TEST_EXPIRED',
];

/** Convert a price (paise) from any billing cycle to monthly equivalent. */
export function toMonthlyPaise(
  paise: number,
  cycle: BillingCycle | null | undefined,
): number {
  if (!paise) return 0;
  if (!cycle || cycle === BillingCycle.MONTHLY) return paise;
  if (cycle === BillingCycle.QUARTERLY) return Math.round(paise / 3);
  if (cycle === BillingCycle.YEARLY) return Math.round(paise / 12);
  return paise;
}
