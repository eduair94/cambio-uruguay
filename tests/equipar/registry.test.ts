import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import { EQUIPAR_CATEGORIES, NOT_A_PRODUCT, TIER_LABEL } from "../../classes/equipar/registry";
import { equiparSpecs } from "../../classes/equipar/classify";
import { EQUIPAR_STORE_QUERIES } from "../../classes/equipar/budget";

/**
 * The registry is data, and data with no test rots quietly: a category added without a fallback
 * variant silently drops every listing that does not state a size, and a tier with no reason
 * publishes a letter with nothing behind it.
 */
describe("registro de categorías", () => {
  it("no repite claves", () => {
    const keys = EQUIPAR_CATEGORIES.map((category) => category.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("toda categoría declara exactamente una variante por defecto", () => {
    for (const category of EQUIPAR_CATEGORIES) {
      const fallbacks = category.variants.filter((variant) => variant.fallback);
      expect(fallbacks.length, `${category.key} tiene ${fallbacks.length} variantes por defecto`).toBe(1);
    }
  });

  it("toda categoría explica por qué está en su tier", () => {
    for (const category of EQUIPAR_CATEGORIES) {
      expect(TIER_LABEL[category.tier], `${category.key} tiene un tier desconocido`).toBeTruthy();
      // Un tier sin motivo escrito es una opinión con una letra adelante.
      expect(category.reason.length, `${category.key} no explica su tier`).toBeGreaterThan(40);
    }
  });

  it("toda categoría trae consultas para las tres fuentes que las necesitan", () => {
    for (const category of EQUIPAR_CATEGORIES) {
      expect(category.storeQueries.length, `${category.key} sin storeQueries`).toBeGreaterThan(0);
      expect(category.mlQueries.length, `${category.key} sin mlQueries`).toBeGreaterThan(0);
      expect(category.fbQueries.length, `${category.key} sin fbQueries`).toBeGreaterThan(0);
    }
  });

  it("las variantes no repiten clave dentro de una categoría", () => {
    for (const category of EQUIPAR_CATEGORIES) {
      const keys = category.variants.map((variant) => variant.key);
      expect(new Set(keys).size, `${category.key} repite una variante`).toBe(keys.length);
    }
  });

  it("el colchón es la única categoría donde el usado se desaconseja con motivo", () => {
    const colchon = EQUIPAR_CATEGORIES.find((category) => category.key === "colchon")!;
    expect(colchon.usedOk).toBe(false);
    expect(colchon.usedNote).toMatch(/chinche|acaro|ácaro/i);
  });

  it("las specs salen en el orden del registro, que es el orden del presupuesto", () => {
    const specs = equiparSpecs();
    expect(specs.map((spec) => spec.key)).toEqual(EQUIPAR_CATEGORIES.map((category) => category.key));
    // Lo caro primero: un corte de presupuesto tiene que costarle la cola barata, no la heladera.
    expect(specs[0]!.key).toBe("heladera");
  });

  it("la corrida diaria manda TODAS las búsquedas de tienda a VTEX y WooCommerce, por código", () => {
    // Esos dos adaptadores mandan las storeQueries deduplicadas EN ORDEN DEL REGISTRO y cortan en un
    // tope, 24 por defecto. Con 24 llegaba hasta "olla": sartén, cubiertos, vajilla, vasos, sábanas,
    // toallas, limpieza y tacho —casi todo el tier S— nunca se buscaban en El Dorado ni en las cinco
    // tiendas WooCommerce. Medido en la Task 3: sumar "aire portatil" arriba de la olla le sacó las
    // ollas a El Dorado (198 -> 138 productos revisados) y a TYT (149 -> 95 aceptados).
    const deduplicated = [...new Set(EQUIPAR_CATEGORIES.flatMap((category) => category.storeQueries))];
    expect(EQUIPAR_STORE_QUERIES.daily).toBe(80);
    expect(deduplicated.slice(0, EQUIPAR_STORE_QUERIES.daily)).toEqual(deduplicated);

    // La horaria busca 24: corre 23 veces por día contra tiendas chicas. Lo que no alcanza a buscar
    // NO se pierde: sale de la foto de avisos de tienda que guarda la diaria (storeSnapshot.ts).
    expect(EQUIPAR_STORE_QUERIES.fast).toBe(24);

    // sync_equipar.ts es un entrypoint (correr main al importarlo), así que se fija por su texto.
    const job = fs.readFileSync(path.join(__dirname, "..", "..", "sync_equipar.ts"), "utf8");
    expect(job).toMatch(/maxStoreQueries:\s*fast\s*\?\s*EQUIPAR_STORE_QUERIES\.fast\s*:\s*EQUIPAR_STORE_QUERIES\.daily/);
  });

  it("el tope NO vive en el env de pm2, donde el deploy nunca lo reaplicaría", () => {
    // scripts/deploy-backend.sh sólo recrea una app registrada cuando cambia su cron: un env nuevo
    // en ecosystem.config.js no llega nunca al VPS y el tope quedaba en 24 sin que nada lo dijera.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const apps = require(path.join(__dirname, "..", "..", "ecosystem.config.js")).apps as Array<{
      name: string;
      env?: Record<string, string>;
    }>;
    for (const name of ["currency-equipar", "currency-equipar-hourly"]) {
      const app = apps.find((entry) => entry.name === name)!;
      expect(app.env?.RETAIL_WOO_MAX_QUERIES, name).toBeUndefined();
      expect(app.env?.RETAIL_VTEX_MAX_QUERIES, name).toBeUndefined();
    }
  });

  it("la horaria completa con la foto de la diaria y la diaria la guarda", () => {
    const job = fs.readFileSync(path.join(__dirname, "..", "..", "sync_equipar.ts"), "utf8");
    expect(job).toContain("mergeStoreSnapshot(");
    expect(job).toContain("saveStoreSnapshot(");
    expect(job).toContain("loadStoreSnapshot(");
  });

  it("el aire portátil vuelve a buscarse en las tiendas", () => {
    const aire = EQUIPAR_CATEGORIES.find((category) => category.key === "aire-acondicionado")!;
    expect(aire.storeQueries).toContain("aire portatil");
  });

  it("ningún filtro lleva acentos ni ñ, porque corren sobre el título normalizado", () => {
    // `norm` saca los diacríticos antes de probar el filtro: una palabra escrita con ñ o tilde en
    // el registro nunca coincide con nada y el filtro queda muerto sin que ningún test lo note. Así
    // estuvo el "caño" del aire acondicionado.
    const nonAscii = /[^\x00-\x7f]/;
    const patterns: Array<[string, RegExp]> = [["NOT_A_PRODUCT", NOT_A_PRODUCT]];
    for (const category of EQUIPAR_CATEGORIES) {
      patterns.push([`${category.key}.include`, category.include]);
      if (category.exclude) patterns.push([`${category.key}.exclude`, category.exclude]);
      for (const variant of category.variants) {
        if (variant.match) patterns.push([`${category.key}:${variant.key}.match`, variant.match]);
      }
    }
    for (const [name, pattern] of patterns) {
      expect(nonAscii.test(pattern.source), `${name} tiene un carácter que norm() ya sacó`).toBe(false);
    }
  });

  it("el filtro de accesorios saca repuestos, fundas y publicaciones rotas", () => {
    for (const title of [
      "funda para sofa 3 cuerpos",
      "filtro de repuesto aspiradora",
      "heladera no funciona para repuesto",
      "goma de puerta heladera",
      "control remoto aire acondicionado",
    ]) {
      expect(NOT_A_PRODUCT.test(title), title).toBe(true);
    }
  });
});
