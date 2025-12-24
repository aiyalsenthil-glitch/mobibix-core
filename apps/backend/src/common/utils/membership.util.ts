export function isMembershipExpired(endAt: Date): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const endDate = new Date(endAt);
  endDate.setHours(0, 0, 0, 0);

  return endDate < today;
}
