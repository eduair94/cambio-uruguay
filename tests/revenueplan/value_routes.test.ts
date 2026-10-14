// Que cada ruta de la tabla de tramos exista, y que cada directorio del sitio esté en la tabla.
//
// POR QUÉ ESTE TEST. `classes/revenueplan/value.ts` decide cuánto vale un clic por familia de
// página, y el 99 % de ese archivo son CADENAS escritas a mano que se comparan por igualdad o por
// prefijo contra las URLs que trae Search Console. Una cadena que no coincide con ninguna ruta no
// falla: simplemente no clasifica, la familia cae en `otro` y vale 1× (el promedio del sitio). O
// sea que el modo de fallar es el MISMO síntoma que «esta familia todavía no se clasificó», que es
// un estado normal y esperado para toda página nueva. Es el mismo razonamiento, y el mismo
// remedio, que `experiments_routes.test.ts` para el libro de cambios.
//
// Lo que había el 2026-10-14, con las dos listas de directorios cotejadas por primera vez contra
// el árbol de páginas de Nuxt:
//
//   - `/sillas-de-escritorio-uruguay` no es una ruta de este sitio (la de las sillas es
//     `/sillas-escritorio-uruguay`, sin el «de»), así que la entrada no clasificaba nada.
//   - cuatro de los seis prefijos —`/autos/`, `/celulares/`, `/equipar/`, `/tiendas/`— no coinciden
//     con ninguna ruta y nunca coincidieron: las fichas de esos directorios viven en
//     `/autos-usados-uruguay/<key>`, `/celulares-uruguay/<modelo>`, `/equipar-casa-uruguay/<categoria>`
//     y `/tiendas-online-uruguay/<tienda>`.
//
// En las dos la consecuencia es la misma y es la que este archivo entero existe para evitar: valuar
// al promedio del sitio lo que las familias de directorio midieron en 0,09× y 0,18×, y ordenar la
// cola de trabajo con esa cifra.
//
// La otra mitad del cotejo —que cada directorio declarado en el registro del propio sitio esté
// valuado— vive en `app/tests/unit/directoriosTramoParity.test.ts`, y no acá por dos razones: el
// vitest de la raíz no puede IMPORTAR un archivo de `app/` (ver `storeConstantsParity.test.ts`), y
// el job de CI que corre esta suite no se dispara con un push que sólo toca `app/`, que es
// justamente cuando nace un directorio.
import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import { bucketOf } from "../../classes/gsc/opportunities";
import {
  CONTENIDO_PATHS,
  DATO_VIVO_BUCKETS,
  DIRECTORIO_PATHS,
  DIRECTORIO_PREFIXES,
  TIER_DIRECTORIO,
  tierOf,
} from "../../classes/revenueplan/value";

const PAGES = path.join(__dirname, "..", "..", "app", "pages");

/**
 * ¿Existe una página de Nuxt para este path? Mismo recorrido que `experiments_routes.test.ts`.
 *
 * Un segmento concreto coincide con `<seg>.vue`, con `<seg>/index.vue` o con el directorio
 * `<seg>/`; si no hay ninguno, coincide con un archivo dinámico del nivel (`[slug].vue`,
 * `[origin]/`). Lo que NO coincide con nada es una ruta inventada.
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
    if (entries.includes(seg!) && fs.statSync(path.join(dir, seg!)).isDirectory()) {
      if (last) return true;
      dir = path.join(dir, seg!);
      continue;
    }
    const dynamicFile = entries.find((e) => /^\[.+\]\.vue$/.test(e));
    const dynamicDir = entries.find((e) => /^\[.+\]$/.test(e) && fs.statSync(path.join(dir, e)).isDirectory());
    if (last && (dynamicFile || dynamicDir)) return true;
    if (dynamicDir) {
      dir = path.join(dir, dynamicDir);
      continue;
    }
    return false;
  }
  return fs.existsSync(path.join(PAGES, "index.vue"));
}

/** Todas las rutas que el árbol de páginas publica, con el segmento dinámico resuelto a `x`. */
function rutasDelSitio(dir: string = PAGES, prefijo = ""): string[] {
  const out: string[] = [];
  for (const entrada of fs.readdirSync(dir)) {
    const completo = path.join(dir, entrada);
    if (fs.statSync(completo).isDirectory()) {
      out.push(...rutasDelSitio(completo, `${prefijo}/${entrada.replace(/^\[.+\]$/, "x")}`));
      continue;
    }
    if (!entrada.endsWith(".vue")) continue;
    const nombre = entrada.slice(0, -4).replace(/^\[.+\]$/, "x");
    out.push(nombre === "index" ? prefijo || "/" : `${prefijo}/${nombre}`);
  }
  return out;
}

const RUTAS = [...new Set(rutasDelSitio())].sort();

/**
 * Las cadenas de la tabla que NO tienen que existir como ruta, con el motivo.
 *
 * Sumar una acá es declarar que el informe de ingreso trae esa familia aunque el router no la
 * resuelva. Es lo contrario de un escape: sin esta lista el test de abajo sería imposible de pasar
 * sin borrar una familia que GA4 sí mide.
 */
const SIN_RUTA_PROPIA = new Map([
  [
    "/oportunidades",
    "medida por GA4 el 2026-09-16 (0,18× el promedio del sitio) y sin archivo de página que la sirva hoy",
  ],
]);

/** Las cadenas de bucket que `bucketOf` produce para una familia plegada, sin el `/*`. */
const comoRuta = (bucket: string) => bucket.replace(/\/\*$/, "") || "/";

describe("las rutas de la tabla de tramos existen", () => {
  it("hay tablas para verificar", () => {
    expect(DIRECTORIO_PATHS.size).toBeGreaterThan(10);
    expect(CONTENIDO_PATHS.size).toBeGreaterThan(10);
    expect(DATO_VIVO_BUCKETS.size).toBeGreaterThan(10);
    expect(DIRECTORIO_PREFIXES.length).toBeGreaterThan(5);
    expect(RUTAS.length).toBeGreaterThan(200);
  });

  it.each([
    ["directorio", [...DIRECTORIO_PATHS]],
    ["contenido", [...CONTENIDO_PATHS]],
    ["dato vivo", [...DATO_VIVO_BUCKETS].map(comoRuta)],
  ])("ninguna ruta suelta del tramo %s apunta a una página que no existe", (_tramo, rutas) => {
    const faltan = rutas.filter((ruta) => !SIN_RUTA_PROPIA.has(ruta) && !pageExists(ruta));
    expect(faltan).toEqual([]);
  });

  /**
   * Un prefijo muerto es peor que un prefijo que falta: parece cobertura y no clasifica nada. Los
   * cuatro que había el 2026-10-14 dejaban en `otro` justo a las fichas, que son las URLs más
   * numerosas del sitio.
   */
  it("cada prefijo de directorio coincide con alguna ruta real del sitio", () => {
    const muertos = DIRECTORIO_PREFIXES.filter((prefijo) => !RUTAS.some((ruta) => ruta.startsWith(prefijo)));
    expect(muertos).toEqual([]);
  });

  it("las fichas de cada directorio heredan el tramo de su directorio", () => {
    // El caso concreto que los prefijos muertos dejaban en `otro`: la ficha de un aviso, el modelo
    // de un celular, la categoría de equipar, la ficha de una tienda y la página por barrio.
    for (const ruta of [
      "/autos-usados-uruguay/alguna-ficha",
      "/autos-usados-uruguay/precios/algun-modelo",
      "/celulares-uruguay/algun-modelo",
      "/equipar-casa-uruguay/alguna-categoria",
      "/tiendas-online-uruguay/alguna-tienda",
      "/venta-viviendas-uruguay/alguna-ficha",
      "/inmobiliarias-uruguay/alguna-inmobiliaria",
      "/motos-usadas-uruguay/alguna-ficha",
      "/sillas-escritorio-uruguay/algun-modelo",
      "/precio/algun-articulo",
      "/alquiler/montevideo/centro",
      "/alquileres/alguna-ficha",
    ])
      expect(tierOf(bucketOf(ruta)), ruta).toBe(TIER_DIRECTORIO);
  });

  it("el detector de rutas inventadas funciona", () => {
    // Sin esto los tests de arriba pasarían aunque `pageExists` devolviera siempre true.
    expect(pageExists("/esta-pagina-no-existe-en-ningun-lado")).toBe(false);
    expect(pageExists("/sillas-escritorio-uruguay")).toBe(true);
    expect(pageExists("/sillas-de-escritorio-uruguay")).toBe(false);
    expect(pageExists("/")).toBe(true);
  });
});
