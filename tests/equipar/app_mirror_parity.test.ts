import { describe, expect, it } from "vitest";
import { EQUIPAR_CATEGORIES } from "../../classes/equipar/registry";
import { EQUIPAR_CATEGORY_PAGES } from "../../app/utils/equiparCategoryPages";

/**
 * `app/utils/equiparCategoryPages.ts` is a hand-kept mirror of this registry: the app cannot
 * import from the repo root, so someone has to keep the two lists in step by hand. This test is
 * that someone. It only checks the fields the mirror actually needs (key, label, room, tier,
 * usedOk/usedNote, and the order, which is the published necessity order) — everything else in
 * `EquiparCategoryPage` (h1, description, guide, planRedondo, wattsExample) is editorial content
 * the registry has no opinion about.
 *
 * `usedOk`/`usedNote` matter enough to check on their own: the FAQ builder
 * (`equiparCategoryFaq`) reads them straight off this page object, never off today's items, so a
 * mirror that drifts from the registry here would make the app state a confident "no conviene
 * usado" for a category the backend actually says is fine second-hand.
 */
describe("app-registry parity: categorías de equipar", () => {
  it("el espejo del app declara las mismas claves, en el mismo orden", () => {
    expect(EQUIPAR_CATEGORY_PAGES.map((page) => page.key)).toEqual(
      EQUIPAR_CATEGORIES.map((category) => category.key)
    );
  });

  it("cada categoría coincide en tier, room, label, usedOk y usedNote", () => {
    const byKey = new Map(EQUIPAR_CATEGORIES.map((category) => [category.key, category]));
    for (const page of EQUIPAR_CATEGORY_PAGES) {
      const backend = byKey.get(page.key);
      expect(backend, `el app conoce "${page.key}" y el backend no`).toBeDefined();
      expect(page.tier, page.key).toBe(backend!.tier);
      expect(page.room, page.key).toBe(backend!.room);
      expect(page.label, page.key).toBe(backend!.label);
      expect(page.usedOk, page.key).toBe(backend!.usedOk);
      // El registro deja `usedNote` sin declarar cuando no hay nota; el espejo lo declara `null`.
      expect(page.usedNote, page.key).toBe(backend!.usedNote ?? null);
    }
  });

  it("no le sobran categorías al espejo que el backend ya no tenga", () => {
    const backendKeys = new Set(EQUIPAR_CATEGORIES.map((category) => category.key));
    for (const page of EQUIPAR_CATEGORY_PAGES) {
      expect(backendKeys.has(page.key), `"${page.key}" está en el app pero no en el registro`).toBe(true);
    }
  });
});
