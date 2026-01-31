export function endOfDayDate(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}
export function formatDateDDMMYYYY(date: Date): string {
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const y = date.getFullYear();
  return `${d}/${m}/${y}`;
}

export function getScheduledAtUTC({
  offsetDays = 0,
  localHour = 9,
  localMinute = 0,
  timezoneOffsetMinutes = 330, // IST default
}: {
  offsetDays?: number;
  localHour?: number;
  localMinute?: number;
  timezoneOffsetMinutes?: number;
}): Date {
  const now = new Date();

  // 1. Shift to "Pseudo-UTC" (UTC time that looks like Local Time)
  const pseudoUtc = new Date(now.getTime() + timezoneOffsetMinutes * 60 * 1000);

  // 2. Apply business rules using UTC methods on the Pseudo-UTC object
  //    (This avoids System Timezone interference)
  pseudoUtc.setUTCDate(pseudoUtc.getUTCDate() + offsetDays);
  pseudoUtc.setUTCHours(localHour, localMinute, 0, 0);

  // 3. Shift back to Real UTC
  return new Date(pseudoUtc.getTime() - timezoneOffsetMinutes * 60 * 1000);
}
