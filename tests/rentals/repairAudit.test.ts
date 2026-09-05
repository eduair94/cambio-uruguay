import { describe, expect, it } from "vitest";
import {
  assertRentalConflictSeparation,
  validateRentalConflictManifest,
} from "../../classes/rentals/repairAudit";

const manifest = () => ({
  schemaVersion: 1,
  confirmedKeys: ["reviewed-property"],
  snapshotSha256: "reviewed-provenance",
  groups: [
    {
      key: "reviewed-property",
      listingIds: ["infocasas:a", "infocasas:b"],
      negativePairs: [
        {
          left: "infocasas:a",
          right: "infocasas:b",
          reason: "different_explicit_units",
          evidence: [{ url: "https://www.infocasas.com.uy/original/a", facts: { unit: "601" } }],
        },
      ],
      unresolvedListingIds: [],
    },
  ],
});

describe("validateRentalConflictManifest", () => {
  it("retains the complete original document and evidence for the caller's review hash", () => {
    const input = manifest();
    const before = JSON.stringify(input);
    const output = validateRentalConflictManifest(input);
    expect(output).toBe(input);
    expect(JSON.stringify(output)).toBe(before);
    expect(output.groups[0]!.negativePairs[0]!.evidence).toEqual(input.groups[0]!.negativePairs[0]!.evidence);
  });

  it.each([
    null,
    undefined,
    [],
    {},
    { ...manifest(), schemaVersion: 2 },
    { ...manifest(), schemaVersion: "1" },
  ])("rejects missing or unsupported schema: %j", (value) => {
    expect(() => validateRentalConflictManifest(value)).toThrow("schemaVersion 1");
  });

  it.each([undefined, [], "reviewed-property", [""], ["   "], [" key "], [7], ["same", "same"]])(
    "rejects invalid or repeated selected identifiers: %j",
    (confirmedKeys) => {
      expect(() => validateRentalConflictManifest({ ...manifest(), confirmedKeys })).toThrow("confirmedKeys");
    },
  );

  it("requires one group per selected key without missing, extra or duplicated groups", () => {
    const input = manifest();
    expect(() => validateRentalConflictManifest({ ...input, groups: [] })).toThrow();
    expect(() =>
      validateRentalConflictManifest({ ...input, groups: [{ ...input.groups[0], key: "unselected" }] }),
    ).toThrow();
    expect(() =>
      validateRentalConflictManifest({
        ...input,
        confirmedKeys: ["reviewed-property", "second"],
        groups: [input.groups[0], input.groups[0]],
      }),
    ).toThrow("duplicate group");
    expect(() => validateRentalConflictManifest({ ...input, groups: [null] })).toThrow();
  });

  it.each([
    null,
    { left: "", right: "infocasas:b", reason: "different_units" },
    { left: "infocasas:a", right: "infocasas:a", reason: "different_units" },
    { left: "infocasas:a", right: "unlisted", reason: "different_units" },
    { left: "infocasas:a", right: "infocasas:b", reason: " " },
    { left: "infocasas:a", right: "infocasas:b", reason: 1 },
  ])("rejects invalid, self-referencing or unlisted negative pairs: %j", (pair) => {
    const input = manifest();
    expect(() =>
      validateRentalConflictManifest({ ...input, groups: [{ ...input.groups[0], negativePairs: [pair] }] }),
    ).toThrow();
  });

  it("requires an identifier array and at least one actual constraint", () => {
    const input = manifest();
    for (const changes of [
      { listingIds: undefined },
      { listingIds: null },
      { listingIds: [null] },
      { negativePairs: undefined },
      { negativePairs: [] },
    ]) {
      expect(() =>
        validateRentalConflictManifest({ ...input, groups: [{ ...input.groups[0], ...changes }] }),
      ).toThrow();
    }
  });

  it("accepts pair endpoints from allStoredListingIds or the union of both declared arrays", () => {
    const input = manifest();
    const group = {
      ...input.groups[0],
      listingIds: ["infocasas:a"],
      allStoredListingIds: ["infocasas:b", "unresolved"],
    };
    expect(validateRentalConflictManifest({ ...input, groups: [group] }).groups[0]).toBe(group);
    expect(
      validateRentalConflictManifest({
        ...input,
        groups: [{ ...group, listingIds: undefined, allStoredListingIds: ["infocasas:a", "infocasas:b"] }],
      }),
    ).toBeDefined();
  });
});

describe("assertRentalConflictSeparation", () => {
  it("requires both audited adverts to have owners and rejects a shared owner", () => {
    const input = validateRentalConflictManifest(manifest());
    expect(
      assertRentalConflictSeparation(
        input,
        new Map([
          ["infocasas:a", "unit-601"],
          ["infocasas:b", "unit-801"],
        ]),
      ),
    ).toBe(1);
    expect(() =>
      assertRentalConflictSeparation(
        input,
        new Map([
          ["infocasas:a", "same"],
          ["infocasas:b", "same"],
        ]),
      ),
    ).toThrow("still share");
    expect(() => assertRentalConflictSeparation(input, new Map([["infocasas:a", "unit-601"]]))).toThrow(
      "unassigned",
    );
    expect(() =>
      assertRentalConflictSeparation(
        input,
        new Map([
          ["infocasas:a", ""],
          ["infocasas:b", "unit-801"],
        ]),
      ),
    ).toThrow("unassigned");
  });

  it("checks all nine independently audited edges across seven groups", () => {
    // Minimal public facts from the 2026-09-05 audit; no ignored runtime file is needed in CI.
    const edges = [
      ["gabriel-pereira", "infocasas:194066177", "infocasas:194059333"],
      ["gabriel-pereira", "infocasas:194066177", "infocasas:194066060"],
      ["gabriel-pereira", "infocasas:194059333", "infocasas:194066060"],
      ["plutarco", "infocasas:194129875", "infocasas:194102925"],
      ["americas-torre-c", "infocasas:194103037", "infocasas:194103272"],
      ["americas-ventura", "infocasas:194096563", "infocasas:194096221"],
      ["gaboto", "infocasas:193873743", "infocasas:193999061"],
      ["18-de-julio", "infocasas:194176247", "infocasas:193991315"],
      ["legacy-casa", "facebook:1104398742024145", "facebook:1903878930997839"],
    ];
    const keys = [...new Set(edges.map(([key]) => key!))];
    const groups = keys.map((key) => ({
      key,
      listingIds: [
        ...new Set(edges.filter(([group]) => group === key).flatMap(([, left, right]) => [left!, right!])),
      ],
      negativePairs: edges
        .filter(([group]) => group === key)
        .map(([, left, right]) => ({ left, right, reason: "audited_incompatibility" })),
    }));
    const input = validateRentalConflictManifest({ schemaVersion: 1, confirmedKeys: keys, groups });
    const owners = new Map(
      groups.flatMap((group) => group.listingIds.map((id) => [id, `property-for-${id}`] as const)),
    );
    expect(input.groups).toHaveLength(7);
    expect(assertRentalConflictSeparation(input, owners)).toBe(9);
    // The last group matters too: a check of only the first pair would miss this regression.
    owners.set("facebook:1903878930997839", owners.get("facebook:1104398742024145")!);
    expect(() => assertRentalConflictSeparation(input, owners)).toThrow("still share");
    owners.delete("facebook:1903878930997839");
    expect(() => assertRentalConflictSeparation(input, owners)).toThrow("unassigned");
  });

  it("does not treat unresolved adverts as positive matches or require them to share an owner", () => {
    const input = manifest();
    input.groups[0]!.listingIds.push("infocasas:unresolved");
    const validated = validateRentalConflictManifest(input);
    expect(
      assertRentalConflictSeparation(
        validated,
        new Map([
          ["infocasas:a", "a"],
          ["infocasas:b", "b"],
        ]),
      ),
    ).toBe(1);
  });
});
