// The owner a lease claim actually wrote, whatever the driver version returned.
//
// `collection.findOneAndUpdate` changed shape under us: driver 4 (mongoose 6) answered
// `{ value: doc, ok }`, driver 6+ (mongoose 8/9) answers the document itself. The leases read
// `claim.value?.owner`, which after the 2026-09-30 upgrade was ALWAYS undefined, so every run
// declared the lease "unavailable" and quit — `currency-property-zones` stopped publishing on 1/10
// while its hourly sibling kept reporting "daily refresh running".
export function leaseOwner(claim: unknown): string | undefined {
  if (!claim || typeof claim !== "object") return undefined;
  const record = claim as { owner?: unknown; value?: unknown; ok?: unknown };
  // Old shape: `{ value, ok }` (also what `includeResultMetadata: true` returns today).
  if ("ok" in record && "value" in record) return leaseOwner(record.value);
  return typeof record.owner === "string" ? record.owner : undefined;
}
