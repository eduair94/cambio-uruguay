/** Public wire type mirrored from the self-contained app; reports are owned and read by the app. */
export interface RentalAvailabilitySummary {
  count: number;
  lastReportedAt: string | null;
  status: "unconfirmed";
}
