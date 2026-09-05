/** The audit document is retained in full; evidence and provenance participate in its caller's hash. */
export interface RentalConflictPair {
  left: string;
  right: string;
  reason: string;
  [field: string]: unknown;
}

export interface RentalConflictGroup {
  key: string;
  listingIds?: string[];
  allStoredListingIds?: string[];
  negativePairs: RentalConflictPair[];
  [field: string]: unknown;
}

export interface RentalConflictManifest {
  schemaVersion: 1;
  confirmedKeys: string[];
  groups: RentalConflictGroup[];
  [field: string]: unknown;
}

const record = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);
const identifier = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0 && value.trim() === value;
function invalid(reason: string): never {
  throw new Error(`[rentals] Invalid conflict manifest: ${reason}`);
}

/** Validate negative constraints without interpreting the remaining adverts as positive matches. */
export function validateRentalConflictManifest(value: unknown): RentalConflictManifest {
  if (!record(value) || value.schemaVersion !== 1) invalid("expected schemaVersion 1");
  if (
    !Array.isArray(value.confirmedKeys) ||
    !value.confirmedKeys.length ||
    !value.confirmedKeys.every(identifier)
  )
    invalid("confirmedKeys must contain nonempty identifiers");
  const keys = new Set(value.confirmedKeys as string[]);
  if (keys.size !== value.confirmedKeys.length) invalid("confirmedKeys contains duplicates");
  if (!Array.isArray(value.groups) || value.groups.length !== keys.size)
    invalid("groups must cover the selected keys exactly");
  const groupedKeys = new Set<string>();
  let pairCount = 0;
  for (const group of value.groups) {
    if (!record(group) || !identifier(group.key) || !keys.has(group.key))
      invalid("group key is not selected");
    if (groupedKeys.has(group.key)) invalid(`duplicate group ${group.key}`);
    groupedKeys.add(group.key);
    const ids = new Set<string>();
    let hasListingIds = false;
    for (const field of ["listingIds", "allStoredListingIds"]) {
      const declaredIds = group[field];
      if (declaredIds === undefined) continue;
      if (!Array.isArray(declaredIds) || !declaredIds.every(identifier))
        invalid(`${group.key}.${field} is not an identifier array`);
      hasListingIds = true;
      for (const id of declaredIds) ids.add(id);
    }
    if (!hasListingIds) invalid(`${group.key} has no listing identifier array`);
    if (!Array.isArray(group.negativePairs)) invalid(`${group.key}.negativePairs is not an array`);
    for (const pair of group.negativePairs) {
      if (
        !record(pair) ||
        !identifier(pair.left) ||
        !identifier(pair.right) ||
        typeof pair.reason !== "string" ||
        !pair.reason.trim()
      )
        invalid(`${group.key} has an invalid negative pair`);
      if (pair.left === pair.right) invalid(`${group.key} compares an advert with itself`);
      if (!ids.has(pair.left) || !ids.has(pair.right))
        invalid(`${group.key} negative pair references an unlisted advert`);
      pairCount++;
    }
  }
  if (!pairCount) invalid("at least one negative pair is required");
  // Return the original object: stripping extra evidence would weaken the reviewed plan's hash.
  return value as unknown as RentalConflictManifest;
}

/** Every audited incompatible pair must still exist, with different owners, before any write. */
export function assertRentalConflictSeparation(
  manifest: RentalConflictManifest,
  owners: ReadonlyMap<string, string>,
): number {
  let count = 0;
  for (const group of manifest.groups) {
    for (const pair of group.negativePairs) {
      const left = owners.get(pair.left);
      const right = owners.get(pair.right);
      if (!identifier(left) || !identifier(right)) {
        throw new Error(
          `[rentals] Audited pair has an unassigned advert: ${group.key} (${pair.left}, ${pair.right})`,
        );
      }
      if (left === right) {
        throw new Error(
          `[rentals] Audited incompatible adverts still share ${left}: ${pair.left}, ${pair.right}`,
        );
      }
      count++;
    }
  }
  return count;
}
