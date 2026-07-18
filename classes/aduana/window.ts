// The decree window: the stretch around the seller-registry enforcement date (2026-10-01) when a new
// resolución could land any day, so the weekly cadence is too slow and we run the sync daily too.
// Deliberately a plain date-string comparison (UTC), and deliberately hard-coded: after the window
// the daily runner simply no-ops, so there is nothing to turn off. Widen or move it by editing here.
export function inDecreeWindow(today: Date): boolean {
  const d = today.toISOString().slice(0, 10);
  return d >= "2026-09-01" && d <= "2026-11-01";
}
