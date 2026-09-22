// Que cada ruta declarada en el libro de cambios exista de verdad.
//
// POR QUÉ ESTE TEST. Una ruta mal tipeada en `docs/seo/experiments.json` no rompe nada: el job
// corre, no encuentra ninguna página que coincida, y publica "sin datos" para siempre. O sea que el
// modo de fallar del ledger es el MISMO síntoma que "todavía no hay suficiente historia", que es un
// estado normal y esperado durante las primeras cuatro semanas de cada fila. Nadie lo iba a notar.
//
// El cotejo es contra el árbol de páginas de Nuxt, que es la única fuente de qué rutas existen.
import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import { parseSpecs } from "../../classes/revenueplan/experiments";

const PAGES = path.join(__dirname, "..", "..", "app", "pages");
const EXPERIMENTS = path.join(__dirname, "..", "..", "docs", "seo", "experiments.json");

/**
 * ¿Existe una página de Nuxt para este path?
 *
 * Camina el árbol segmento por segmento. Un segmento concreto coincide con `<seg>.vue`, con
 * `<seg>/index.vue` o con el directorio `<seg>/`; si no hay ninguno, coincide con un archivo
 * dinámico del nivel (`[slug].vue`, `[origin]/`), que es como se sirven las 145 guías y las fichas
 * de casa. Lo que NO coincide con nada es una ruta inventada.
 */
function pageExists(route: string): boolean {
  const segments = route.split("/").filter(Boolean);
  let dir = PAGES;
  for (let i = 0; i < segments.length; i++) {
    if (!fs.existsSync(dir)) return false;
    const entries = fs.readdirSync(dir);
    const seg = segments[i];
    const last = i === segments.length - 1;

    if (last && entries.includes(`${seg}.vue`)) return true;
    if (entries.includes(seg) && fs.statSync(path.join(dir, seg)).isDirectory()) {
      // Un directorio alcanza aunque no tenga `index.vue`: `/casa/*` declara la familia entera y
      // `app/pages/casa/` sólo contiene `[origin]/`.
      if (last) return true;
      dir = path.join(dir, seg);
      continue;
    }
    // Segmento dinámico: `[slug].vue` para la hoja, `[origin]/` para seguir bajando.
    const dynamicFile = entries.find((e) => /^\[.+\]\.vue$/.test(e));
    const dynamicDir = entries.find((e) => /^\[.+\]$/.test(e) && fs.statSync(path.join(dir, e)).isDirectory());
    if (last && (dynamicFile || dynamicDir)) return true;
    if (dynamicDir) {
      dir = path.join(dir, dynamicDir);
      continue;
    }
    return false;
  }
  // La raíz `/`.
  return fs.existsSync(path.join(PAGES, "index.vue"));
}

describe("las rutas del libro de cambios existen", () => {
  const { specs } = parseSpecs(JSON.parse(fs.readFileSync(EXPERIMENTS, "utf8")));

  it("hay filas para verificar", () => {
    expect(specs.length).toBeGreaterThan(0);
  });

  it("ninguna fila apunta a una página que no existe", () => {
    const missing: string[] = [];
    for (const spec of specs) {
      for (const raw of spec.routes) {
        // Los espejos /en y /pt no tienen carpeta propia: @nuxtjs/i18n (`prefix_except_default`)
        // sirve TODA página bajo esos prefijos desde el mismo archivo. Una fila que mide un espejo
        // (`/en/historico/*`) declara una ruta real, y `routeMatches` ya la coteja tal cual contra
        // las URLs de Search Console; lo único que la rechazaba era este cotejo contra el árbol.
        const route =
          raw
            .replace(/^\/(?:en|pt)(?=\/|$)/, "")
            .replace(/[*]$/, "")
            .replace(/\/$/, "") || "/";
        if (!pageExists(route)) missing.push(`${spec.id} → ${raw}`);
      }
    }
    expect(missing).toEqual([]);
  });

  it("los identificadores son únicos", () => {
    const ids = specs.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("ninguna fila se declara con fecha futura", () => {
    // Una fecha futura deja la ventana anterior vacía y el veredicto congelado en "esperando".
    const today = new Date().toISOString().slice(0, 10);
    expect(specs.filter((s) => s.shippedOn > today).map((s) => s.id)).toEqual([]);
  });

  it("el detector de rutas inventadas funciona", () => {
    // Sin esto el test de arriba pasaría aunque `pageExists` devolviera siempre true.
    expect(pageExists("/esta-pagina-no-existe-en-ningun-lado")).toBe(false);
    expect(pageExists("/guias/cualquier-slug-de-guia")).toBe(true);
    expect(pageExists("/")).toBe(true);
  });
});
