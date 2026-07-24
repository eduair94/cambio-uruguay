export interface StoredLocation {
  id?: string;
  status?: number;
  closedSource?: string;
}

export interface LocationReconciliation {
  currentStatusById: Map<string, number>;
  idsToClose: string[];
}

/**
 * Preserve manually closed locations, while allowing a source-managed closure
 * to reopen if the same official source lists it again.
 */
export function reconcileLocationIds(
  existing: StoredLocation[],
  currentIds: Iterable<string>,
  source: string,
  managesId: (id: string) => boolean
): LocationReconciliation {
  const current = new Set(currentIds);
  const existingById = new Map(
    existing
      .filter((location) => typeof location.id === "string")
      .map((location) => [location.id as string, location])
  );
  const currentStatusById = new Map<string, number>();

  for (const id of current) {
    const stored = existingById.get(id);
    const manuallyClosed =
      stored?.status === 0 && stored.closedSource !== source;
    currentStatusById.set(id, manuallyClosed ? 0 : 1);
  }

  const idsToClose = existing
    .filter(
      (location) =>
        typeof location.id === "string" &&
        managesId(location.id) &&
        location.status !== 0 &&
        !current.has(location.id)
    )
    .map((location) => location.id as string);

  return { currentStatusById, idsToClose };
}

export function locationSlug(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
