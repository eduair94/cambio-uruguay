import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";
import { RENTAL_OPPORTUNITY_SELECT, rentalOpportunityListings } from "../../classes/propertyopportunities/rentalAdapter";
import type { RentalOffer, RentalProperty } from "../../classes/rentals/types";

type Tree = { [field: string]: Tree | true };

/** The selected dotted paths as a tree: { offers: { details: { description: true } } }. */
function selectTree(select: Record<string, 0 | 1>): Tree {
  const tree: Tree = {};
  for (const [path, on] of Object.entries(select)) {
    if (on !== 1) continue;
    const parts = path.split(".");
    let node = tree;
    for (const [index, part] of parts.entries()) {
      if (index === parts.length - 1) node[part] = true;
      else {
        const next = node[part];
        if (next === true) break;
        node = (node[part] = next ?? {}) as Tree;
      }
    }
  }
  return tree;
}

/** What Mongo hands back for `select`: only the selected paths, applied through arrays. */
function project(value: unknown, tree: Tree | true): unknown {
  if (tree === true) return value;
  if (Array.isArray(value)) return value.map(item => project(item, tree));
  if (!value || typeof value !== "object") return undefined;
  const out: Record<string, unknown> = {};
  for (const [field, subtree] of Object.entries(tree)) {
    if (!(field in value)) continue;
    const kept = project((value as Record<string, unknown>)[field], subtree);
    if (kept !== undefined) out[field] = kept;
  }
  return out;
}

const loaded = (properties: RentalProperty[]) =>
  project(properties, selectTree(RENTAL_OPPORTUNITY_SELECT)) as RentalProperty[];

describe("the rental opportunity loader selects what the adapter reads", () => {
  it("selects every field the adapter reads from the property, the offer, its identity and its details", () => {
    const file = readFileSync(join(__dirname, "../../classes/propertyopportunities/rentalAdapter.ts"), "utf8");
    // The whole file but the select literal: its own keys ("offers.details.x") would match the patterns
    // below, and a helper above the function can read the offer too.
    const selectStart = file.indexOf("export const RENTAL_OPPORTUNITY_SELECT");
    const selectEnd = file.indexOf("\n};", selectStart);
    expect(selectStart).toBeGreaterThanOrEqual(0);
    expect(selectEnd).toBeGreaterThan(selectStart);
    const body = file.slice(0, selectStart) + file.slice(selectEnd + 3);
    expect(body).toContain("export function rentalOpportunityListings");
    // The scan knows the adapter's two aliases by name: renaming one has to update this test too.
    expect(body).toContain("const own = offer.identity;");
    expect(body).toContain("const details = offer.details;");
    const selected = Object.keys(RENTAL_OPPORTUNITY_SELECT).filter(path => RENTAL_OPPORTUNITY_SELECT[path] === 1);
    // Reading a parent (`offer.details`, `property.offers`) is fine while its children are selected:
    // each child read is checked on its own below.
    const covered = (path: string) =>
      selected.some(other => path === other || path.startsWith(`${other}.`) || other.startsWith(`${path}.`));
    const receivers: [string, RegExp, string][] = [
      ["property", /\bproperty\??\.(\w+)/g, ""],
      ["offer", /\boffer\??\.(\w+)/g, "offers."],
      ["own", /\bown\??\.(\w+)/g, "offers.identity."],
      ["details", /\bdetails\??\.(\w+)/g, "offers.details."],
    ];
    const read = new Set<string>();
    for (const [name, pattern, prefix] of receivers) {
      const paths = [...body.matchAll(pattern)].map(([, field]) => `${prefix}${field}`);
      // Every receiver has to find the reads it guards: one that finds none has gone blind.
      expect(paths.length, name).toBeGreaterThan(0);
      for (const path of paths) read.add(path);
    }
    expect(read.size).toBeGreaterThan(30);
    expect([...read].filter(path => !covered(path))).toEqual([]);
  });

  it("keeps the guards that rest on a field only the select can deliver", () => {
    const own = {
      version: 1, department: "Montevideo", neighborhood: "Cordón", propertyType: "apartamento",
      bedrooms: 1, bathrooms: 1, area: 45, description: "Apartamento luminoso. Sin gastos comunes.",
    };
    const base = {
      source: "infocasas", listingId: "infocasas:1", title: "Apartamento 1 dormitorio", url: "https://www.infocasas.com.uy/1",
      identity: own, details: { description: own.description, builtArea: 45 }, price: 22_000, currency: "UYU",
      commonExpenses: null, commonExpensesCurrency: null, lastSeen: "2026-11-09", publishedAt: null,
      image: null, parkingSpaces: null, furnished: null,
    } as unknown as RentalOffer;
    // Measured in production on 2026-11-09: gastos comunes read from the description entered the rent
    // snapshot as the portal's figure (3 subjects, all zeros from "sin gastos comunes", and 11
    // comparables), because the select dropped the label.
    const fromText = { ...base, listingId: "infocasas:2", commonExpenses: 0, commonExpensesSource: "description" } as RentalOffer;
    const winterOnly = { ...base, listingId: "infocasas:3", terms: ["invernal"] } as RentalOffer;
    const rows = rentalOpportunityListings(loaded([{ key: "p", offers: [fromText, winterOnly] } as RentalProperty]));
    expect(rows.map(row => row.listingId)).toEqual(["infocasas:2"]);
    expect(rows[0]!.expenses).toBeNull();
  });

  it("still delivers a portal figure and the facts the comparison needs", () => {
    const offer = {
      source: "elpais", listingId: "elpais:9", title: "Apartamento", url: "https://inmuebles.elpais.com.uy/property/9",
      identity: { version: 1, department: "Montevideo", neighborhood: "Pocitos", propertyType: "apartamento", bedrooms: 2, bathrooms: 1, area: 70 },
      details: { description: "Gastos comunes $ 6.000", builtArea: 68, totalArea: 72, landArea: null, amenities: ["balcon"] },
      price: 30_000, currency: "UYU", commonExpenses: 6_000, commonExpensesCurrency: "UYU", lastSeen: "2026-11-09",
      publishedAt: "2026-11-01", image: null, parkingSpaces: 1, furnished: null, sellerName: "Inmobiliaria",
    } as unknown as RentalOffer;
    // An interior advert: its locality and its hidden address only reach the adapter through the identity.
    const interior = {
      ...offer, listingId: "elpais:10",
      identity: {
        version: 1, department: "Canelones", locality: "Ciudad de la Costa", neighborhood: "Solymar", propertyType: "casa",
        bedrooms: 3, bathrooms: 2, area: 120, address: "Calle aproximada 1234", addressHidden: true, description: "Texto propio",
      },
    } as unknown as RentalOffer;
    const [row, inland] = rentalOpportunityListings(loaded([{ key: "q", offers: [offer, interior] } as RentalProperty]));
    expect(row).toMatchObject({
      propertyKey: "q", expenses: { amount: 6_000, currency: "UYU" }, area: { value: 68, basis: "built" }, parkingSpaces: 1,
      amenities: ["balcon"], description: "Gastos comunes $ 6.000", sellerName: "Inmobiliaria", publishedAt: "2026-11-01",
    });
    expect(inland).toMatchObject({ propertyKey: "q", locality: "Ciudad de la Costa", description: "Texto propio", propertyType: "casa" });
    expect(inland!.address).toBeUndefined();
  });
});
