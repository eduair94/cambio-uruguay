# Pipeline de precios SIPC — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ingestar todos los días los precios oficiales del SIPC, guardar el histórico que el Estado no guarda, y publicarlo con guardas que impidan que un error de carga o una góndola vieja encabece un ranking de "más barato".

**Architecture:** Job pm2 de instancia única (`currency-precios`, cron `12 3 * * *` UTC) que barre 215 × `compararArticulo` con bbox nacional, aplica tres guardas (plausibilidad por fila, frescura por la `fecha` del origen, auditoría al cierre) y escribe seis colecciones en la Mongo del root. La API del root las sirve con Redis; la app Nuxt las consume por rutas proxy cacheadas y publica un hub más 215 páginas programáticas.

**Tech Stack:** TypeScript 4.9 CommonJS, mongoose vía `MongooseServer`, Express (`server.getJson`), `redisCache.getOrSet`, vitest (root), Nuxt 4 + Vuetify 4.1.5 (app), vitest (app).

**Spec:** `docs/superpowers/specs/2026-09-07-precios-sipc-pipeline-design.md`

## Global Constraints

- **`compararCanasta` está prohibido.** Imputa: 694 de 722 celdas con precio y sin fecha, el mismo `$509.32 (*)` en 722 locales para un artículo con 28 observaciones reales. Ningún módulo puede referenciarlo; hay tripwire en tests (Task 9).
- **Se rechaza toda fila cuyo precio contenga `(*)` o que no traiga `fecha`.** Es la regla que generaliza el hallazgo anterior.
- Base URL: `https://www.precios.uy/sipc2Web/recursos/sipc`.
- Bbox nacional: `v1=-58.5, v2=-35.2, v3=-53.0, v4=-30.0` (West, South, East, North).
- UA: `CambioUruguayBot/1.0 (+https://cambio-uruguay.com/precios-de-supermercado-uruguay; SIPC price index; contact via site)`, override por `PRECIOS_USER_AGENT`.
- Umbrales, exactos: cobertura de canasta por local **≥ 0,70**; agregado por departamento o cadena **≥ 5 locales calificados**; `noindex` en la página de artículo con **< 30 observaciones frescas**; frescura `fresh` ≤ 2 días, `aging` 3–14, `stale` > 14; banda de rechazo **p10/3 – p90×3**; marca `suspect` bajo **p10/2**; el índice no publica variación si `basketVersion` cambió o si los locales calificados cayeron **> 20 %** contra el día anterior.
- **`stale` y `suspect` nunca ganan un ranking de "más barato"** — ni en el job, ni en la API, ni en la página.
- Escribe en la Mongo del **root** (`cambio-uy`). No usa `APP_MONGO_URI`.
- `notifyAdmin` no llega a Telegram desde el VPS (`TELEGRAM_ADMIN_CHAT_ID` vacío): los veredictos van al log y a la respuesta de la API, nunca a un canal.
- Nada de cifras inventadas: si una línea no está medida, se declara estimación.

---

### Task 1: Tipos, HTTP y parseo

**Files:**
- Create: `classes/precios/types.ts`
- Create: `classes/precios/net.ts`
- Create: `classes/precios/parse.ts`
- Test: `tests/precios/parse.test.ts`

**Interfaces:**
- Consumes: nada.
- Produces:
  - `PrecioArticle { id: number; name: string; group: string; variant: string; unitRaw: string; qty: number | null; unit: PrecioUnit | null; image: string | null }`
  - `PrecioUnit = 'ml' | 'l' | 'g' | 'kg' | 'un'`
  - `PrecioStore { id: number; name: string; chain: string; branch: string; address: string; lat: number | null; lon: number | null; locality: string; department: string; phone: string; web: string }`
  - `PrecioObservation { articleId: number; storeId: number | null; declarationId: number; price: number; sourceDay: string; storeName: string; address: string; lat: number | null; lon: number | null }`
  - `PrecioRawRow` (la fila cruda de `compararArticulo`)
  - `parsePrice(raw: unknown): number | null`
  - `parseSourceDay(raw: unknown): string | null`
  - `parseUnit(raw: unknown): { qty: number | null; unit: PrecioUnit | null }`
  - `rejectionReason(row: PrecioRawRow): string | null`
  - `fetchJson<T>(url: string, init?: RequestInit): Promise<T | null>`
  - `SIPC_BASE`, `NATIONAL_BBOX`, `sleep(ms)`

- [ ] **Step 1: Write the failing test**

```ts
// tests/precios/parse.test.ts
import { describe, expect, it } from "vitest";
import { parsePrice, parseSourceDay, parseUnit, rejectionReason } from "../../classes/precios/parse";

describe("parsePrice", () => {
  it("lee el formato del SIPC", () => {
    expect(parsePrice("$92.0")).toBe(92);
    expect(parsePrice("$1099.99")).toBe(1099.99);
  });

  it("rechaza el precio imputado, que es la trampa central de esta fuente", () => {
    // Medido 2026-09-07: compararCanasta devuelve el mismo "$509.32 (*)" en 722
    // de 722 locales para un articulo con 28 observaciones reales.
    expect(parsePrice("$509.32 (*)")).toBeNull();
  });

  it("rechaza lo que no es un precio", () => {
    expect(parsePrice("N")).toBeNull();
    expect(parsePrice("")).toBeNull();
    expect(parsePrice(null)).toBeNull();
    expect(parsePrice("$0")).toBeNull();
    expect(parsePrice("$-5")).toBeNull();
  });
});

describe("parseSourceDay", () => {
  it("convierte dd/mm/yy a ISO", () => {
    expect(parseSourceDay("06/09/26")).toBe("2026-09-06");
    expect(parseSourceDay("31/12/25")).toBe("2025-12-31");
  });

  it("devuelve null cuando la fila no trae fecha", () => {
    expect(parseSourceDay("")).toBeNull();
    expect(parseSourceDay(undefined)).toBeNull();
    expect(parseSourceDay("06/13/26")).toBeNull();
  });
});

describe("parseUnit", () => {
  it("lee la unidad del catalogo", () => {
    expect(parseUnit(" 900.0 Mililitros")).toEqual({ qty: 900, unit: "ml" });
    expect(parseUnit(" 1.0 Kilogramo")).toEqual({ qty: 1, unit: "kg" });
    expect(parseUnit(" 500.0 gramos")).toEqual({ qty: 500, unit: "g" });
    expect(parseUnit(" 1.0 Unidad")).toEqual({ qty: 1, unit: "un" });
  });

  it("no adivina lo que no entiende", () => {
    expect(parseUnit("")).toEqual({ qty: null, unit: null });
    expect(parseUnit(" 8 unidades por caja de cartón")).toEqual({ qty: 8, unit: "un" });
  });
});

describe("rejectionReason", () => {
  const row = { id: 1, precio: "$92.0", fecha: "06/09/26", name: "X", direccion: "Y", x: -34.8, y: -56.1, localidad: "Montevideo, MONTEVIDEO " };

  it("acepta una observacion real", () => {
    expect(rejectionReason(row as any)).toBeNull();
  });

  it("rechaza precio imputado y fila sin fecha, con el motivo dicho", () => {
    expect(rejectionReason({ ...row, precio: "$509.32 (*)" } as any)).toMatch(/imputad/i);
    expect(rejectionReason({ ...row, fecha: "" } as any)).toMatch(/fecha/i);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/precios/parse.test.ts`
Expected: FAIL — `Cannot find module '../../classes/precios/parse'`

- [ ] **Step 3: Write minimal implementation**

```ts
// classes/precios/types.ts
export type PrecioUnit = "ml" | "l" | "g" | "kg" | "un";

/** Una fila tal como la devuelve `compararArticulo`. */
export interface PrecioRawRow {
  id: number;
  precio: string;
  fecha: string;
  name: string;
  direccion: string;
  x: number | null;
  y: number | null;
  localidad: string;
  tel?: string;
  web?: string;
  css?: string;
  marker?: string;
  imagen?: string | null;
}

export interface PrecioArticle {
  id: number;
  name: string;
  group: string;
  variant: string;
  unitRaw: string;
  qty: number | null;
  unit: PrecioUnit | null;
  image: string | null;
}

export interface PrecioStore {
  id: number;
  name: string;
  chain: string;
  branch: string;
  address: string;
  lat: number | null;
  lon: number | null;
  locality: string;
  department: string;
  phone: string;
  web: string;
}

export interface PrecioObservation {
  articleId: number;
  /** null cuando la fila no se pudo unir a ningún local del catálogo. */
  storeId: number | null;
  /** El `id` de la fila de precio, que es la clave de la DECLARACIÓN, no del local. */
  declarationId: number;
  price: number;
  /** Día que declara el origen, en ISO. Es el eje de frescura. */
  sourceDay: string;
  storeName: string;
  address: string;
  lat: number | null;
  lon: number | null;
}
```

```ts
// classes/precios/parse.ts
//
// El parseo es la primera guarda, no una conveniencia.
//
// `compararCanasta` rellena cada hueco de su matriz con un promedio nacional
// marcado `(*)` y sin fecha: medido el 2026-09-07, "Nalga vacuna con hueso"
// tiene 28 observaciones reales y la matriz muestra el mismo "$509.32 (*)" en
// 722 de 722 locales, con 694 celdas sin fecha. Cualquier ranking construido
// sobre eso ordena promedios, no góndolas.
//
// De ahí sale la regla que este módulo hace cumplir, y que vale para TODA fila
// que entre al pipeline, venga del endpoint que venga: sin precio numérico
// propio y sin fecha propia, no es una observación.
import type { PrecioRawRow, PrecioUnit } from "./types";

/** Precio numérico, o null si la celda no es una observación real. */
export function parsePrice(raw: unknown): number | null {
  if (typeof raw !== "string") return null;
  const text = raw.trim();
  if (!text) return null;
  // La marca de imputación del origen. Nunca se convierte en número.
  if (text.includes("(*)")) return null;
  if (!/^\$\s*\d/.test(text)) return null;
  const value = Number(text.replace(/[^0-9.]/g, ""));
  if (!Number.isFinite(value) || value <= 0) return null;
  return value;
}

const MONTHS = 12;

/** `"06/09/26"` -> `"2026-09-06"`, o null si no hay fecha propia. */
export function parseSourceDay(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const match = raw.trim().match(/^(\d{2})\/(\d{2})\/(\d{2})$/);
  if (!match) return null;
  const [, dd, mm, yy] = match;
  const month = Number(mm);
  const day = Number(dd);
  if (month < 1 || month > MONTHS || day < 1 || day > 31) return null;
  return `20${yy}-${mm}-${dd}`;
}

const UNIT_WORDS: ReadonlyArray<[RegExp, PrecioUnit]> = [
  [/mililitro/i, "ml"],
  [/litro/i, "l"],
  [/kilogramo|\bkg\b/i, "kg"],
  [/gramo|\bgrs?\b/i, "g"],
  [/unidad/i, "un"],
];

/** Cantidad y unidad del envase, para poder comparar precio por unidad. */
export function parseUnit(raw: unknown): { qty: number | null; unit: PrecioUnit | null } {
  if (typeof raw !== "string" || !raw.trim()) return { qty: null, unit: null };
  const qtyMatch = raw.match(/(\d+(?:[.,]\d+)?)/);
  const qty = qtyMatch ? Number(qtyMatch[1].replace(",", ".")) : null;
  const hit = UNIT_WORDS.find(([pattern]) => pattern.test(raw));
  return { qty: Number.isFinite(qty as number) ? (qty as number) : null, unit: hit ? hit[1] : null };
}

/** Motivo por el que la fila no es una observación, o null cuando lo es. */
export function rejectionReason(row: PrecioRawRow): string | null {
  if (typeof row?.precio === "string" && row.precio.includes("(*)")) {
    return "precio imputado por el origen (marca `(*)`): es un promedio nacional, no el precio de este local";
  }
  if (parsePrice(row?.precio) === null) return `precio ilegible: ${JSON.stringify(row?.precio)}`;
  if (parseSourceDay(row?.fecha) === null) return "la fila no trae fecha propia, así que no se puede medir su antigüedad";
  return null;
}
```

```ts
// classes/precios/net.ts
//
// El SIPC es una API pública del Estado, sin clave y sin Cloudflare. Acá
// identificarse no nos hace invisibles (que es lo que pasó con El País): nos
// hace ubicables. Una corrida son 217 peticiones al mismo host, así que la
// pausa entre pedidos existe por cortesía, no por bloqueo.
export const SIPC_BASE = process.env.PRECIOS_BASE_URL || "https://www.precios.uy/sipc2Web/recursos/sipc";

/** West, South, East, North: el bbox que cubre todo el país. */
export const NATIONAL_BBOX = Object.freeze({ v1: -58.5, v2: -35.2, v3: -53.0, v4: -30.0 });

const UA =
  process.env.PRECIOS_USER_AGENT ||
  "CambioUruguayBot/1.0 (+https://cambio-uruguay.com/precios-de-supermercado-uruguay; SIPC price index; contact via site)";
const GAP_MS = Number(process.env.PRECIOS_HOST_GAP_MS || 250);
const TIMEOUT_MS = Number(process.env.PRECIOS_HTTP_TIMEOUT_MS || 30_000);
const RETRIES = Number(process.env.PRECIOS_RETRIES || 2);

export const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

let lastHit = 0;

/** Una petición cortés con reintento. Devuelve null en vez de tirar. */
export async function fetchJson<T>(url: string, init?: RequestInit): Promise<T | null> {
  for (let attempt = 0; attempt <= RETRIES; attempt++) {
    const gap = Date.now() - lastHit;
    if (gap < GAP_MS) await sleep(GAP_MS - gap);
    try {
      const response = await fetch(url, {
        ...init,
        headers: { Accept: "application/json", "User-Agent": UA, ...(init?.headers || {}) },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      lastHit = Date.now();
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return (await response.json()) as T;
    } catch (error) {
      lastHit = Date.now();
      if (attempt === RETRIES) {
        console.error(`[precios] falló ${url}: ${(error as Error).message}`);
        return null;
      }
      await sleep(500 * (attempt + 1));
    }
  }
  return null;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/precios/parse.test.ts`
Expected: PASS (12 assertions)

- [ ] **Step 5: Commit**

```bash
git add classes/precios/types.ts classes/precios/net.ts classes/precios/parse.ts tests/precios/parse.test.ts
git commit -m "feat(precios): parseo del SIPC que rechaza el precio imputado"
```

---

### Task 2: Catálogo de artículos y locales

**Files:**
- Create: `classes/precios/catalog.ts`
- Test: `tests/precios/catalog.test.ts`

**Interfaces:**
- Consumes: `parseUnit`, `fetchJson`, `SIPC_BASE`, `PrecioArticle`, `PrecioStore` de Task 1.
- Produces:
  - `normalizeArticle(raw: any): PrecioArticle`
  - `normalizeStore(raw: any): PrecioStore`
  - `departmentOf(locality: string): string`
  - `chainOf(name: string): { chain: string; branch: string }`
  - `fetchCatalog(): Promise<{ articles: PrecioArticle[]; stores: PrecioStore[] }>`

- [ ] **Step 1: Write the failing test**

```ts
// tests/precios/catalog.test.ts
import { describe, expect, it } from "vitest";
import { chainOf, departmentOf, normalizeArticle, normalizeStore } from "../../classes/precios/catalog";

describe("departmentOf", () => {
  it("saca el departamento de la localidad del origen", () => {
    // Formato medido: "Montevideo, MONTEVIDEO " (con espacio final).
    expect(departmentOf("Montevideo, MONTEVIDEO ")).toBe("Montevideo");
    expect(departmentOf("Florida, FLORIDA ")).toBe("Florida");
    expect(departmentOf("Ciudad de la Costa, CANELONES")).toBe("Canelones");
    expect(departmentOf("Treinta y Tres, TREINTA Y TRES ")).toBe("Treinta y Tres");
    expect(departmentOf("Paysandu, PAYSANDU ")).toBe("Paysandú");
  });

  it("no inventa un departamento", () => {
    expect(departmentOf("")).toBe("");
    expect(departmentOf("Sin datos")).toBe("");
  });
});

describe("chainOf", () => {
  it("parte cadena y sucursal", () => {
    expect(chainOf("Ta - Ta - Suc. Cerro")).toEqual({ chain: "Ta - Ta", branch: "Cerro" });
    expect(chainOf("Red Market- Suc. Nº 11 - Los Bulevares")).toEqual({
      chain: "Red Market",
      branch: "Nº 11 - Los Bulevares",
    });
    expect(chainOf("SUPERMERCADO LA RANITA- Suc.")).toEqual({ chain: "SUPERMERCADO LA RANITA", branch: "" });
  });

  it("un local sin sucursal es su propia cadena", () => {
    expect(chainOf("Supermercado El Grillito")).toEqual({ chain: "Supermercado El Grillito", branch: "" });
  });
});

describe("normalizeArticle", () => {
  it("separa grupo y variante y parsea el envase", () => {
    const article = normalizeArticle({
      unidad: " 900.0 Mililitros",
      name: "Aceite de girasol - Óptimo",
      imagen: "7209.png",
      id: 1,
      cantidad: 1,
      desc: "",
    });
    expect(article).toMatchObject({ id: 1, group: "Aceite de girasol", variant: "Óptimo", qty: 900, unit: "ml" });
  });

  it("un nombre sin separador es su propio grupo", () => {
    const article = normalizeArticle({ unidad: " 1.0 Kilogramo", name: "Azúcar blanco Azucarlito", imagen: null, id: 24 });
    expect(article.group).toBe("Azúcar blanco Azucarlito");
    expect(article.variant).toBe("");
  });
});

describe("normalizeStore", () => {
  it("mapea x a latitud e y a longitud", () => {
    // El origen usa x = latitud, y = longitud. Invertirlo pone Uruguay en el mar.
    const store = normalizeStore({
      web: "",
      name: "EXPRES 2- Suc. 2",
      direccion: "Avda. Millán 2683",
      x: -34.87664031030553,
      y: -56.18753242466486,
      localidad: "Montevideo, MONTEVIDEO ",
      tel: "22040426",
      id: 1,
    });
    expect(store.lat).toBeLessThan(-30);
    expect(store.lat).toBeGreaterThan(-36);
    expect(store.lon).toBeLessThan(-53);
    expect(store.department).toBe("Montevideo");
    expect(store.chain).toBe("EXPRES 2");
  });

  it("un local sin coordenada queda con lat/lon en null", () => {
    // Medido: 18 de 749 locales no traen coordenada. Existen, pero no pueden
    // entrar en una consulta por radio.
    const store = normalizeStore({ name: "X", direccion: "Y", x: null, y: null, localidad: "Salto, SALTO ", id: 9 });
    expect(store.lat).toBeNull();
    expect(store.lon).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/precios/catalog.test.ts`
Expected: FAIL — módulo inexistente

- [ ] **Step 3: Write minimal implementation**

```ts
// classes/precios/catalog.ts
//
// Los dos GET del SIPC, normalizados.
//
// Dos detalles que cuestan sangre si se leen mal:
//   * el origen usa `x` = LATITUD e `y` = LONGITUD. Invertirlo pone al país en
//     el Atlántico y el radio de "cerca de mí" devuelve vacío.
//   * el `id` del catálogo de locales (1..749) NO es el `id` de las filas de
//     precio (medido: 217451), que es la clave de la declaración. La unión va
//     por coordenada exacta con respaldo nombre+dirección; ver `sweep.ts`.
import { fetchJson, SIPC_BASE } from "./net";
import { parseUnit } from "./parse";
import type { PrecioArticle, PrecioStore } from "./types";

/** Los 19 departamentos, con la tilde que el origen no manda. */
const DEPARTMENTS: ReadonlyArray<string> = Object.freeze([
  "Artigas", "Canelones", "Cerro Largo", "Colonia", "Durazno", "Flores", "Florida", "Lavalleja",
  "Maldonado", "Montevideo", "Paysandú", "Río Negro", "Rivera", "Rocha", "Salto", "San José",
  "Soriano", "Tacuarembó", "Treinta y Tres",
]);

const fold = (value: string): string =>
  value.normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase().replace(/\s+/g, " ").trim();

const DEPARTMENT_BY_FOLD = new Map(DEPARTMENTS.map((name) => [fold(name), name]));

/** `"Montevideo, MONTEVIDEO "` -> `"Montevideo"`; `""` cuando no se reconoce. */
export function departmentOf(locality: unknown): string {
  if (typeof locality !== "string") return "";
  const tail = locality.split(",").pop();
  if (!tail) return "";
  return DEPARTMENT_BY_FOLD.get(fold(tail)) || "";
}

/**
 * Cadena y sucursal. El separador del origen es `- Suc.`, y hay cadenas con
 * guiones propios ("Ta - Ta"), así que se corta en la PRIMERA aparición de
 * `- Suc` y no se toca el resto. Un local sin sucursal es su propia cadena: con
 * el mínimo de 5 locales calificados para rankear, los negocios de una sola
 * boca se filtran solos y no hace falta una lista de cadenas a mano.
 */
export function chainOf(name: unknown): { chain: string; branch: string } {
  const text = typeof name === "string" ? name.trim() : "";
  const index = text.indexOf("- Suc");
  if (index < 0) return { chain: text, branch: "" };
  const chain = text.slice(0, index).trim().replace(/[-\s]+$/, "").trim();
  const branch = text
    .slice(index)
    .replace(/^-\s*Suc\.?/i, "")
    .trim();
  return { chain, branch };
}

export function normalizeArticle(raw: any): PrecioArticle {
  const name = String(raw?.name ?? "").trim();
  const split = name.split(" - ");
  const { qty, unit } = parseUnit(raw?.unidad);
  return {
    id: Number(raw?.id),
    name,
    group: (split[0] || name).trim(),
    variant: split.length > 1 ? split.slice(1).join(" - ").trim() : "",
    unitRaw: String(raw?.unidad ?? "").trim(),
    qty,
    unit,
    image: raw?.imagen ? String(raw.imagen) : null,
  };
}

const coord = (value: unknown): number | null => {
  const number = Number(value);
  return Number.isFinite(number) && number !== 0 ? number : null;
};

export function normalizeStore(raw: any): PrecioStore {
  const name = String(raw?.name ?? "").trim();
  const { chain, branch } = chainOf(name);
  return {
    id: Number(raw?.id),
    name,
    chain,
    branch,
    address: String(raw?.direccion ?? "").trim(),
    lat: coord(raw?.x),
    lon: coord(raw?.y),
    locality: String(raw?.localidad ?? "").trim(),
    department: departmentOf(raw?.localidad),
    phone: String(raw?.tel ?? "").trim(),
    web: String(raw?.web ?? "").trim(),
  };
}

export async function fetchCatalog(): Promise<{ articles: PrecioArticle[]; stores: PrecioStore[] }> {
  const [rawArticles, rawStores] = await Promise.all([
    fetchJson<any[]>(`${SIPC_BASE}/obtenerArticulos`),
    fetchJson<any[]>(`${SIPC_BASE}/obtenerEstablecimientos`),
  ]);
  return {
    articles: (rawArticles || []).map(normalizeArticle).filter((article) => Number.isFinite(article.id)),
    stores: (rawStores || []).map(normalizeStore).filter((store) => Number.isFinite(store.id)),
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/precios/catalog.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add classes/precios/catalog.ts tests/precios/catalog.test.ts
git commit -m "feat(precios): catalogo de articulos y locales normalizado"
```

---

### Task 3: Barrido y unión de filas a locales

**Files:**
- Create: `classes/precios/sweep.ts`
- Test: `tests/precios/sweep.test.ts`

**Interfaces:**
- Consumes: `fetchJson`, `SIPC_BASE`, `NATIONAL_BBOX`, `parsePrice`, `parseSourceDay`, `rejectionReason`, `PrecioStore`, `PrecioObservation`, `PrecioRawRow`.
- Produces:
  - `storeIndex(stores: PrecioStore[]): StoreIndex`
  - `matchStore(index: StoreIndex, row: PrecioRawRow): PrecioStore | null`
  - `observationsFor(articleId: number, rows: PrecioRawRow[], index: StoreIndex): { observations: PrecioObservation[]; rejected: string[] }`
  - `sweepArticle(articleId: number): Promise<PrecioRawRow[] | null>`
  - `type StoreIndex = { byCoord: Map<string, PrecioStore>; byName: Map<string, PrecioStore> }`

- [ ] **Step 1: Write the failing test**

```ts
// tests/precios/sweep.test.ts
import { describe, expect, it } from "vitest";
import { normalizeStore } from "../../classes/precios/catalog";
import { matchStore, observationsFor, storeIndex } from "../../classes/precios/sweep";

const stores = [
  normalizeStore({ id: 1, name: "EXPRES 2- Suc. 2", direccion: "Avda. Millán 2683", x: -34.87664031030553, y: -56.18753242466486, localidad: "Montevideo, MONTEVIDEO " }),
  normalizeStore({ id: 2, name: "Autoservice Patricia- Suc. Autoservice Patricia", direccion: "Gral Flores  681", x: -34.104, y: -56.217, localidad: "Florida, FLORIDA " }),
  normalizeStore({ id: 3, name: "Sin Coordenada", direccion: "Calle 1", x: null, y: null, localidad: "Salto, SALTO " }),
];

const row = (over: Partial<any> = {}) => ({
  id: 217451,
  precio: "$92.0",
  fecha: "06/09/26",
  name: "EXPRES 2- Suc. 2",
  direccion: "Avda. Millán 2683",
  x: -34.87664031030553,
  y: -56.18753242466486,
  localidad: "Montevideo, MONTEVIDEO ",
  ...over,
});

describe("matchStore", () => {
  const index = storeIndex(stores);

  it("une por coordenada exacta", () => {
    expect(matchStore(index, row() as any)?.id).toBe(1);
  });

  it("cae a nombre+direccion cuando la coordenada no esta", () => {
    expect(matchStore(index, row({ x: null, y: null }) as any)?.id).toBe(1);
  });

  it("devuelve null cuando la fila no corresponde a ningun local del catalogo", () => {
    expect(matchStore(index, row({ x: -30.1, y: -55.1, name: "Otro", direccion: "Otra" }) as any)).toBeNull();
  });
});

describe("observationsFor", () => {
  const index = storeIndex(stores);

  it("convierte filas en observaciones con el dia del origen", () => {
    const { observations, rejected } = observationsFor(1, [row()] as any, index);
    expect(rejected).toHaveLength(0);
    expect(observations).toHaveLength(1);
    expect(observations[0]).toMatchObject({ articleId: 1, storeId: 1, declarationId: 217451, price: 92, sourceDay: "2026-09-06" });
  });

  it("descarta la fila imputada y la fila sin fecha, y dice por que", () => {
    const { observations, rejected } = observationsFor(
      1,
      [row({ precio: "$509.32 (*)" }), row({ fecha: "" })] as any,
      index
    );
    expect(observations).toHaveLength(0);
    expect(rejected).toHaveLength(2);
    expect(rejected.join(" ")).toMatch(/imputad/i);
    expect(rejected.join(" ")).toMatch(/fecha/i);
  });

  it("colapsa dos filas del mismo local para el mismo articulo quedandose con la mas fresca", () => {
    // Medido: 667 locales distintos en 670 filas -> hay coordenadas repetidas.
    const { observations } = observationsFor(
      1,
      [row({ fecha: "01/09/26", precio: "$80.0" }), row({ fecha: "06/09/26", precio: "$92.0" })] as any,
      index
    );
    expect(observations).toHaveLength(1);
    expect(observations[0].price).toBe(92);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/precios/sweep.test.ts`
Expected: FAIL — módulo inexistente

- [ ] **Step 3: Write minimal implementation**

```ts
// classes/precios/sweep.ts
//
// 215 llamadas a `compararArticulo` con el bbox nacional, y NO una sola a
// `compararCanasta`.
//
// La tentación es real: la canasta entera entra en una llamada de 65 s contra
// los ~2,3 min de este barrido. Pero imputa (ver `parse.ts`), su matriz tiene
// 6 claves de columna duplicadas y por lo tanto no se puede unir a locales de
// forma fiable. Este endpoint, en cambio, devuelve observaciones reales: para
// el artículo 1 volvieron 670 filas de 749 locales posibles, y la ausencia
// significa ausencia.
//
// La unión al catálogo se midió sobre esas 670 filas: coordenada exacta 100 %,
// nombre+dirección 100 %, cero huérfanas. Se usa la coordenada primero porque
// es la que no depende de espacios ni mayúsculas.
import { fetchJson, NATIONAL_BBOX, SIPC_BASE } from "./net";
import { parsePrice, parseSourceDay, rejectionReason } from "./parse";
import type { PrecioObservation, PrecioRawRow, PrecioStore } from "./types";

export type StoreIndex = { byCoord: Map<string, PrecioStore>; byName: Map<string, PrecioStore> };

const coordKey = (lat: unknown, lon: unknown): string | null => {
  const a = Number(lat);
  const b = Number(lon);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return `${a.toFixed(5)},${b.toFixed(5)}`;
};

const nameKey = (name: unknown, address: unknown): string =>
  `${String(name ?? "").trim().toLowerCase()}|${String(address ?? "").replace(/\s+/g, " ").trim().toLowerCase()}`;

export function storeIndex(stores: PrecioStore[]): StoreIndex {
  const byCoord = new Map<string, PrecioStore>();
  const byName = new Map<string, PrecioStore>();
  for (const store of stores) {
    const key = coordKey(store.lat, store.lon);
    if (key && !byCoord.has(key)) byCoord.set(key, store);
    const alias = nameKey(store.name, store.address);
    if (!byName.has(alias)) byName.set(alias, store);
  }
  return { byCoord, byName };
}

export function matchStore(index: StoreIndex, row: PrecioRawRow): PrecioStore | null {
  const key = coordKey(row?.x, row?.y);
  if (key) {
    const hit = index.byCoord.get(key);
    if (hit) return hit;
  }
  return index.byName.get(nameKey(row?.name, row?.direccion)) || null;
}

/**
 * Filas -> observaciones. Descarta lo que no es una observación y dice por qué;
 * cuando el mismo local aparece dos veces para el mismo artículo se conserva la
 * fila con fecha más reciente (medido: 3 coordenadas repetidas en 670 filas).
 */
export function observationsFor(
  articleId: number,
  rows: PrecioRawRow[],
  index: StoreIndex
): { observations: PrecioObservation[]; rejected: string[] } {
  const rejected: string[] = [];
  const best = new Map<string, PrecioObservation>();

  for (const row of rows || []) {
    const reason = rejectionReason(row);
    if (reason) {
      rejected.push(`${String(row?.name ?? "?").trim()}: ${reason}`);
      continue;
    }
    const store = matchStore(index, row);
    const observation: PrecioObservation = {
      articleId,
      storeId: store ? store.id : null,
      declarationId: Number(row.id),
      price: parsePrice(row.precio) as number,
      sourceDay: parseSourceDay(row.fecha) as string,
      storeName: String(row.name ?? "").trim(),
      address: String(row.direccion ?? "").trim(),
      lat: store ? store.lat : Number.isFinite(Number(row.x)) ? Number(row.x) : null,
      lon: store ? store.lon : Number.isFinite(Number(row.y)) ? Number(row.y) : null,
    };
    const key = store ? `s${store.id}` : `d${observation.declarationId}`;
    const previous = best.get(key);
    if (!previous || observation.sourceDay > previous.sourceDay) best.set(key, observation);
  }

  return { observations: [...best.values()], rejected };
}

/** Las filas de un artículo en todo el país, o null si el origen no contestó. */
export async function sweepArticle(articleId: number): Promise<PrecioRawRow[] | null> {
  return fetchJson<PrecioRawRow[]>(`${SIPC_BASE}/compararArticulo`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id_articulo: String(articleId), ...NATIONAL_BBOX }),
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/precios/sweep.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add classes/precios/sweep.ts tests/precios/sweep.test.ts
git commit -m "feat(precios): barrido por articulo y union al catalogo de locales"
```

---

### Task 4: Guardas de plausibilidad y frescura

**Files:**
- Create: `classes/precios/plausibility.ts`
- Create: `classes/precios/staleness.ts`
- Test: `tests/precios/guards.test.ts`

**Interfaces:**
- Consumes: `PrecioObservation` de Task 1.
- Produces:
  - `percentile(sorted: number[], q: number): number`
  - `articleBand(prices: number[]): PrecioBand | null` con `PrecioBand { p10: number; p50: number; p90: number; low: number; high: number; suspectBelow: number; n: number }`
  - `priceVerdict(price: number, band: PrecioBand | null): 'ok' | 'suspect' | 'reject'`
  - `PrecioFreshness = 'fresh' | 'aging' | 'stale'`
  - `freshnessOf(sourceDay: string, today: string): PrecioFreshness`
  - `daysBetween(from: string, to: string): number`
  - `rankable(row: { verdict: 'ok' | 'suspect' | 'reject'; freshness: PrecioFreshness }): boolean`

- [ ] **Step 1: Write the failing test**

```ts
// tests/precios/guards.test.ts
import { describe, expect, it } from "vitest";
import { articleBand, priceVerdict, rankable } from "../../classes/precios/plausibility";
import { daysBetween, freshnessOf } from "../../classes/precios/staleness";

describe("articleBand", () => {
  it("no arma banda con muestra insuficiente", () => {
    expect(articleBand([100, 105])).toBeNull();
  });

  it("la banda sale de los percentiles del propio articulo", () => {
    const band = articleBand(Array.from({ length: 100 }, (_, i) => 90 + i));
    expect(band!.p50).toBeGreaterThan(130);
    expect(band!.low).toBeCloseTo(band!.p10 / 3, 5);
    expect(band!.high).toBeCloseTo(band!.p90 * 3, 5);
  });
});

describe("priceVerdict", () => {
  // El spread real medido va de 1,58x (aceite) a 4,86x (cinta leuco). Un factor
  // fijo o borra la competencia real o deja pasar cualquier cosa: la banda es
  // por percentiles del propio articulo.
  const band = articleBand(Array.from({ length: 60 }, (_, i) => 50 + i))!; // 50..109

  it("acepta lo que esta dentro de la banda", () => {
    expect(priceVerdict(80, band)).toBe("ok");
  });

  it("rechaza lo absurdo", () => {
    expect(priceVerdict(2, band)).toBe("reject");
    expect(priceVerdict(9999, band)).toBe("reject");
  });

  it("marca suspect el barato que sobrevive a la banda", () => {
    // El caso "Cinta leuco Ready Plast": minimo $18,5 contra mediana $64.
    // Sobrevive a p10/3 y sin embargo encabezaria el ranking, asi que se
    // etiqueta sin borrarlo: podria ser un precio real.
    const verdict = priceVerdict(band.suspectBelow - 1, band);
    expect(verdict).toBe("suspect");
  });

  it("sin banda no se puede juzgar, y no se juzga", () => {
    expect(priceVerdict(80, null)).toBe("ok");
  });
});

describe("freshnessOf", () => {
  it("clasifica por la fecha que declara el origen", () => {
    expect(freshnessOf("2026-09-07", "2026-09-07")).toBe("fresh");
    expect(freshnessOf("2026-09-05", "2026-09-07")).toBe("fresh");
    expect(freshnessOf("2026-09-01", "2026-09-07")).toBe("aging");
    // Medido: 174 filas con fecha 27/08 en una corrida del 07/09.
    expect(freshnessOf("2026-08-27", "2026-09-07")).toBe("aging");
    expect(freshnessOf("2026-08-12", "2026-09-07")).toBe("stale");
  });

  it("cuenta dias calendario", () => {
    expect(daysBetween("2026-08-27", "2026-09-07")).toBe(11);
  });
});

describe("rankable", () => {
  it("una gondola vieja no gana un ranking de mas barato", () => {
    expect(rankable({ verdict: "ok", freshness: "stale" })).toBe(false);
  });

  it("una fila marcada suspect tampoco", () => {
    expect(rankable({ verdict: "suspect", freshness: "fresh" })).toBe(false);
  });

  it("una observacion fresca y plausible si", () => {
    expect(rankable({ verdict: "ok", freshness: "fresh" })).toBe(true);
    expect(rankable({ verdict: "ok", freshness: "aging" })).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/precios/guards.test.ts`
Expected: FAIL — módulos inexistentes

- [ ] **Step 3: Write minimal implementation**

```ts
// classes/precios/plausibility.ts
//
// La guarda por fila, al escribir.
//
// Se puede hacer bien porque las ~352 filas de un artículo llegan en UNA
// respuesta: la distribución del artículo se conoce antes de guardar nada.
//
// La banda es por percentiles del propio artículo y no un factor fijo, y eso se
// midió: el spread real del mismo artículo va de 1,58× (aceite de girasol) a
// 4,86× (cinta leuco). Un factor fijo borra al primero o deja pasar cualquier
// cosa en el segundo.
//
// Y hay una segunda etiqueta que NO borra. El mínimo de $18,5 contra una
// mediana de $64 sobrevive a p10/3 y sin embargo es exactamente la fila que
// gana un ranking de "más barato". Se marca `suspect`: sigue visible, dice por
// qué está marcada, y no encabeza. Borrarla sería afirmar que no puede ser un
// precio real, y eso no lo sabemos.
import type { PrecioFreshness } from "./staleness";

export interface PrecioBand {
  p10: number;
  p50: number;
  p90: number;
  low: number;
  high: number;
  suspectBelow: number;
  n: number;
}

/** Percentil por interpolación lineal sobre una lista YA ordenada. */
export function percentile(sorted: number[], q: number): number {
  if (!sorted.length) return NaN;
  if (sorted.length === 1) return sorted[0];
  const position = (sorted.length - 1) * q;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  if (lower === upper) return sorted[lower];
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (position - lower);
}

/** Mínimo de observaciones para que una banda signifique algo. */
export const MIN_BAND_SAMPLE = 8;

export function articleBand(prices: number[]): PrecioBand | null {
  const sorted = prices.filter((price) => Number.isFinite(price) && price > 0).sort((a, b) => a - b);
  if (sorted.length < MIN_BAND_SAMPLE) return null;
  const p10 = percentile(sorted, 0.1);
  const p50 = percentile(sorted, 0.5);
  const p90 = percentile(sorted, 0.9);
  return { p10, p50, p90, low: p10 / 3, high: p90 * 3, suspectBelow: p10 / 2, n: sorted.length };
}

export function priceVerdict(price: number, band: PrecioBand | null): "ok" | "suspect" | "reject" {
  if (!Number.isFinite(price) || price <= 0) return "reject";
  if (!band) return "ok";
  if (price < band.low || price > band.high) return "reject";
  if (price < band.suspectBelow) return "suspect";
  return "ok";
}

/**
 * Si la fila puede encabezar un ranking de "más barato".
 *
 * Es la regla que faltaba en las pizarras de cambio: el scraper anda, el origen
 * se congeló, y ordenar por "más barato" sube la fila más vieja al titular.
 */
export function rankable(row: { verdict: "ok" | "suspect" | "reject"; freshness: PrecioFreshness }): boolean {
  return row.verdict === "ok" && row.freshness !== "stale";
}
```

```ts
// classes/precios/staleness.ts
//
// El eje que las otras dos guardas no ven: cada local contra SU PROPIO pasado.
//
// Acá sale gratis, y eso es lo raro. Las pizarras de cambio obligan a comparar
// contra el histórico propio para saber si un origen se congeló; el SIPC manda
// la fecha en cada fila. Medido el 2026-09-07: 94 % de las filas son de hoy o
// ayer, pero había 174 con fecha 27/08 y algunas de 12–15/08.
//
// No se borra nada: una góndola quieta puede ser un precio real. Se publica el
// estado, y una fila `stale` no puede ganar un ranking (ver `plausibility.ts`).
export type PrecioFreshness = "fresh" | "aging" | "stale";

export const FRESH_DAYS = 2;
export const STALE_DAYS = 14;

const MS_PER_DAY = 86_400_000;

/** Días calendario entre dos ISO `YYYY-MM-DD`. */
export function daysBetween(from: string, to: string): number {
  const a = Date.parse(`${from}T00:00:00Z`);
  const b = Date.parse(`${to}T00:00:00Z`);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return NaN;
  return Math.round((b - a) / MS_PER_DAY);
}

export function freshnessOf(sourceDay: string, today: string): PrecioFreshness {
  const age = daysBetween(sourceDay, today);
  if (!Number.isFinite(age)) return "stale";
  if (age <= FRESH_DAYS) return "fresh";
  if (age <= STALE_DAYS) return "aging";
  return "stale";
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/precios/guards.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add classes/precios/plausibility.ts classes/precios/staleness.ts tests/precios/guards.test.ts
git commit -m "feat(precios): guardas de plausibilidad y frescura por fila"
```

---

### Task 5: Auditoría al cierre

**Files:**
- Create: `classes/precios/audit.ts`
- Test: `tests/precios/audit.test.ts`

**Interfaces:**
- Consumes: `percentile`, `PrecioBand` de Task 4; `PrecioObservation` de Task 1.
- Produces:
  - `PrecioScoredRow = PrecioObservation & { verdict: 'ok' | 'suspect' | 'reject'; freshness: PrecioFreshness }`
  - `auditShelves(rows: PrecioScoredRow[], medians: Map<number, number>): ShelfVerdict[]` con `ShelfVerdict { storeId: number; storeName: string; n: number; ratio: number; severity: 'ok' | 'warn' | 'grave'; note: string }`
  - `SHELF_MIN_ARTICLES`, `SHELF_WARN_RATIO`, `SHELF_GRAVE_RATIO`

- [ ] **Step 1: Write the failing test**

```ts
// tests/precios/audit.test.ts
import { describe, expect, it } from "vitest";
import { auditShelves } from "../../classes/precios/audit";

const medians = new Map<number, number>(Array.from({ length: 20 }, (_, i) => [i + 1, 100]));

const shelf = (storeId: number, factor: number, count = 20) =>
  Array.from({ length: count }, (_, i) => ({
    articleId: i + 1,
    storeId,
    declarationId: storeId * 1000 + i,
    price: 100 * factor,
    sourceDay: "2026-09-07",
    storeName: `Local ${storeId}`,
    address: "x",
    lat: -34.8,
    lon: -56.1,
    verdict: "ok" as const,
    freshness: "fresh" as const,
  }));

describe("auditShelves", () => {
  it("un local en linea con el pais no dispara nada", () => {
    const verdicts = auditShelves(shelf(1, 1.05), medians);
    expect(verdicts.find((v) => v.storeId === 1)?.severity).toBe("ok");
  });

  it("detecta la gondola ENTERA desplazada, que es lo que la guarda por fila no puede ver", () => {
    // Cada fila sola pasa la banda del articulo (3x cae dentro de p10/3-p90x3);
    // el error solo se ve mirando todas las filas del mismo local juntas.
    const verdicts = auditShelves(shelf(2, 3), medians);
    expect(verdicts.find((v) => v.storeId === 2)?.severity).toBe("grave");
  });

  it("no juzga un local con pocas observaciones", () => {
    const verdicts = auditShelves(shelf(3, 3, 4), medians);
    expect(verdicts.find((v) => v.storeId === 3)?.severity).toBe("ok");
    expect(verdicts.find((v) => v.storeId === 3)?.note).toMatch(/insuficiente/i);
  });

  it("avisa sin dictaminar cuando el desvio es intermedio", () => {
    const verdicts = auditShelves(shelf(4, 1.6), medians);
    expect(verdicts.find((v) => v.storeId === 4)?.severity).toBe("warn");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/precios/audit.test.ts`
Expected: FAIL — módulo inexistente

- [ ] **Step 3: Write minimal implementation**

```ts
// classes/precios/audit.ts
//
// La tercera guarda, y mira un eje que las otras dos NO PUEDEN ver.
//
// `plausibility.ts` juzga una fila contra las demás filas del mismo artículo, y
// `staleness.ts` juzga su antigüedad. Ninguna de las dos ve esto: un local cuyo
// GÓNDOLA ENTERA está 3× arriba de la mediana nacional. Fila por fila cada
// precio cae dentro de la banda del artículo, así que las dos primeras guardas
// lo dejan pasar en verde; el error sólo aparece mirando todas las filas de ese
// local juntas, y es un error de unidad o de carga, no un súper caro.
//
// Corre al cierre, con todo el país escrito, porque es el único momento en que
// existe la mediana nacional por artículo.
//
// No manda Telegram: `TELEGRAM_ADMIN_CHAT_ID` está vacío en el VPS y
// `notifyAdmin` no llega a nadie. El veredicto va al log y a la respuesta de la
// API de estado.
import type { PrecioFreshness } from "./staleness";
import type { PrecioObservation } from "./types";

export type PrecioScoredRow = PrecioObservation & {
  verdict: "ok" | "suspect" | "reject";
  freshness: PrecioFreshness;
};

export interface ShelfVerdict {
  storeId: number;
  storeName: string;
  n: number;
  ratio: number;
  severity: "ok" | "warn" | "grave";
  note: string;
}

/** Menos artículos que esto y el cociente es ruido. */
export const SHELF_MIN_ARTICLES = 8;
export const SHELF_WARN_RATIO = 1.5;
export const SHELF_GRAVE_RATIO = 2.5;

/**
 * Un veredicto por local: la mediana de (precio del local / mediana nacional
 * del artículo) sobre todos los artículos que ese local declara.
 */
export function auditShelves(rows: PrecioScoredRow[], medians: Map<number, number>): ShelfVerdict[] {
  const byStore = new Map<number, { name: string; ratios: number[] }>();

  for (const row of rows) {
    if (row.storeId === null || row.verdict === "reject") continue;
    const median = medians.get(row.articleId);
    if (!median || !Number.isFinite(median) || median <= 0) continue;
    const entry = byStore.get(row.storeId) || { name: row.storeName, ratios: [] };
    entry.ratios.push(row.price / median);
    byStore.set(row.storeId, entry);
  }

  const verdicts: ShelfVerdict[] = [];
  for (const [storeId, entry] of byStore) {
    const sorted = entry.ratios.sort((a, b) => a - b);
    const ratio = sorted[Math.floor(sorted.length / 2)];
    if (sorted.length < SHELF_MIN_ARTICLES) {
      verdicts.push({
        storeId,
        storeName: entry.name,
        n: sorted.length,
        ratio,
        severity: "ok",
        note: `muestra insuficiente para juzgar la góndola (${sorted.length} artículos)`,
      });
      continue;
    }
    const drift = Math.max(ratio, 1 / ratio);
    const severity = drift >= SHELF_GRAVE_RATIO ? "grave" : drift >= SHELF_WARN_RATIO ? "warn" : "ok";
    verdicts.push({
      storeId,
      storeName: entry.name,
      n: sorted.length,
      ratio,
      severity,
      note:
        severity === "ok"
          ? `góndola en línea con el país (×${ratio.toFixed(2)})`
          : `góndola entera desplazada ×${ratio.toFixed(2)} sobre ${sorted.length} artículos: probable error de unidad o de carga`,
    });
  }

  return verdicts.sort((a, b) => Math.abs(Math.log(b.ratio)) - Math.abs(Math.log(a.ratio)));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/precios/audit.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add classes/precios/audit.ts tests/precios/audit.test.ts
git commit -m "feat(precios): auditoria de gondola completa al cierre del barrido"
```

---

### Task 6: Canasta, cobertura e índice

**Files:**
- Create: `classes/precios/basket.ts`
- Create: `classes/precios/basket_v1.ts`
- Create: `scripts/oneoff/precios_pin_basket.ts`
- Modify: `package.json` (añadir script `precios_pin_basket`)
- Test: `tests/precios/basket.test.ts`

**Interfaces:**
- Consumes: `PrecioScoredRow` de Task 5; `rankable` de Task 4.
- Produces:
  - `BASKET_VERSION: 1`
  - `BASKET_ITEMS: ReadonlyArray<{ articleId: number; qty: number; need: string }>`
  - `BASKET_PINNED_AT: string`
  - `MIN_COVERAGE = 0.7`, `MIN_QUALIFIED_STORES = 5`, `INDEX_MAX_COVERAGE_DROP = 0.2`
  - `storeBasket(rows: PrecioScoredRow[]): { cost: number; coverage: number; items: number; qualified: boolean }`
  - `groupBaskets(baskets: Array<{ scope: string; cost: number; qualified: boolean }>): Array<{ scope: string; median: number; stores: number; qualified: boolean; note: string }>`
  - `indexDecision(today: { version: number; qualifiedStores: number }, previous: { version: number; qualifiedStores: number } | null): { publish: boolean; reason: string }`
  - `NEEDS: ReadonlyArray<{ need: string; pattern: RegExp; qty: number }>` (usado por el one-off)

- [ ] **Step 1: Write the failing test**

```ts
// tests/precios/basket.test.ts
import { describe, expect, it } from "vitest";
import {
  BASKET_ITEMS,
  BASKET_VERSION,
  groupBaskets,
  indexDecision,
  MIN_COVERAGE,
  storeBasket,
} from "../../classes/precios/basket";

const row = (articleId: number, price: number, over: Partial<any> = {}) => ({
  articleId,
  storeId: 1,
  declarationId: articleId,
  price,
  sourceDay: "2026-09-07",
  storeName: "Local 1",
  address: "x",
  lat: -34.8,
  lon: -56.1,
  verdict: "ok" as const,
  freshness: "fresh" as const,
  ...over,
});

describe("la canasta esta pinneada", () => {
  it("tiene version y una lista fija de articulos", () => {
    expect(BASKET_VERSION).toBe(1);
    expect(BASKET_ITEMS.length).toBeGreaterThanOrEqual(15);
    // Pinneada = ids concretos, no una regla que se recalcula sola cada dia.
    BASKET_ITEMS.forEach((item) => expect(Number.isInteger(item.articleId)).toBe(true));
  });
});

describe("storeBasket", () => {
  const full = BASKET_ITEMS.map((item) => row(item.articleId, 100));

  it("cuesta la suma de precio x cantidad, con cobertura 1", () => {
    const result = storeBasket(full);
    const expected = BASKET_ITEMS.reduce((sum, item) => sum + 100 * item.qty, 0);
    expect(result.cost).toBeCloseTo(expected, 5);
    expect(result.coverage).toBe(1);
    expect(result.qualified).toBe(true);
  });

  it("un local que declara la mitad de la canasta NO se rankea", () => {
    // Es exactamente el error del comparador oficial: imputa lo que falta y
    // publica un total que parece comparable.
    const half = full.slice(0, Math.floor(BASKET_ITEMS.length / 2));
    const result = storeBasket(half);
    expect(result.coverage).toBeLessThan(MIN_COVERAGE);
    expect(result.qualified).toBe(false);
  });

  it("no cuenta filas stale ni suspect como cobertura", () => {
    const tainted = full.map((r, i) => (i % 2 ? { ...r, freshness: "stale" as const } : r));
    expect(storeBasket(tainted).coverage).toBeLessThan(1);
  });
});

describe("groupBaskets", () => {
  const qualified = (n: number) => Array.from({ length: n }, () => ({ scope: "Artigas", cost: 1000, qualified: true }));

  it("un departamento con menos de 5 locales calificados no tiene ranking", () => {
    // Medido: Artigas tiene 2 locales en todo el catalogo, Treinta y Tres 5.
    const [group] = groupBaskets(qualified(2));
    expect(group.qualified).toBe(false);
    expect(group.note).toMatch(/insuficiente/i);
  });

  it("con 5 o mas, publica la mediana", () => {
    const [group] = groupBaskets(qualified(5));
    expect(group.qualified).toBe(true);
    expect(group.median).toBe(1000);
    expect(group.stores).toBe(5);
  });
});

describe("indexDecision", () => {
  it("no publica variacion cuando cambio la composicion de la canasta", () => {
    const decision = indexDecision({ version: 2, qualifiedStores: 400 }, { version: 1, qualifiedStores: 400 });
    expect(decision.publish).toBe(false);
    expect(decision.reason).toMatch(/versi/i);
  });

  it("no publica variacion cuando se cayo la cobertura", () => {
    const decision = indexDecision({ version: 1, qualifiedStores: 250 }, { version: 1, qualifiedStores: 400 });
    expect(decision.publish).toBe(false);
    expect(decision.reason).toMatch(/cobertura|locales/i);
  });

  it("publica cuando la canasta y la cobertura se sostienen", () => {
    expect(indexDecision({ version: 1, qualifiedStores: 395 }, { version: 1, qualifiedStores: 400 }).publish).toBe(true);
  });

  it("el primer dia publica nivel, sin variacion previa", () => {
    expect(indexDecision({ version: 1, qualifiedStores: 400 }, null).publish).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/precios/basket.test.ts`
Expected: FAIL — módulo inexistente

- [ ] **Step 3: Write minimal implementation**

Primero el one-off que pinnea la canasta, después el dato que produce, después el motor.

```ts
// scripts/oneoff/precios_pin_basket.ts
//
// Pinnea la canasta UNA VEZ y escribe `classes/precios/basket_v1.ts`.
//
// La selección NO es "la marca más barata": eso movería la composición todos
// los días y un índice cuya canasta se mueve sola no mide precios, mide la
// canasta. Para cada necesidad canónica se elige el artículo con MÁS
// OBSERVACIONES, que es lo que maximiza cuántos locales se pueden comparar
// entre sí, y el resultado queda escrito como dato con sus conteos y su fecha.
//
// Correr: npm run precios_pin_basket
import fs from "fs";
import path from "path";
import { fetchCatalog } from "../../classes/precios/catalog";
import { NEEDS } from "../../classes/precios/basket";
import { sweepArticle } from "../../classes/precios/sweep";

async function main(): Promise<void> {
  const { articles } = await fetchCatalog();
  const picks: Array<{ need: string; articleId: number; name: string; qty: number; observations: number }> = [];

  for (const need of NEEDS) {
    const candidates = articles.filter((article) => need.pattern.test(article.name));
    if (!candidates.length) {
      console.log(`[pin] sin candidatos para "${need.need}" — la necesidad queda fuera de la canasta`);
      continue;
    }
    let best: { articleId: number; name: string; observations: number } | null = null;
    for (const candidate of candidates) {
      const rows = await sweepArticle(candidate.id);
      const observations = (rows || []).filter((row) => !String(row.precio || "").includes("(*)") && row.fecha).length;
      console.log(`[pin] ${need.need.padEnd(28)} ${candidate.name.slice(0, 44).padEnd(44)} ${observations}`);
      if (!best || observations > best.observations) best = { articleId: candidate.id, name: candidate.name, observations };
    }
    if (best && best.observations > 0) picks.push({ need: need.need, qty: need.qty, ...best });
  }

  const today = new Date().toISOString().slice(0, 10);
  const body = `// GENERADO por scripts/oneoff/precios_pin_basket.ts el ${today}. NO editar a mano:
// cambiar la composición exige una versión nueva, y una versión nueva corta la
// serie del índice a propósito (ver classes/precios/basket.ts).
//
// Criterio: por cada necesidad canónica, el artículo con más observaciones
// reales ese día — el que permite comparar más locales entre sí.
import type { BasketItem } from "./basket";

export const BASKET_V1_PINNED_AT = ${JSON.stringify(today)};

export const BASKET_V1: ReadonlyArray<BasketItem> = Object.freeze([
${picks
  .map(
    (pick) =>
      `  // ${pick.name} — ${pick.observations} observaciones al pinnear\n  Object.freeze({ articleId: ${pick.articleId}, qty: ${pick.qty}, need: ${JSON.stringify(pick.need)} }),`
  )
  .join("\n")}
]);
`;
  const out = path.resolve(process.cwd(), "classes/precios/basket_v1.ts");
  fs.writeFileSync(out, body, "utf8");
  console.log(`[pin] escrito ${out} con ${picks.length} artículos`);
}

main().catch((error) => {
  console.error("[pin] falló:", error);
  process.exit(1);
});
```

```ts
// classes/precios/basket.ts
//
// La canasta propia, y las tres reglas que impiden publicarla mal.
//
// 1. Se calcula SÓLO con observaciones reales. El comparador oficial rellena
//    los huecos con un promedio nacional y publica un total que parece
//    comparable: para "Nalga vacuna con hueso" muestra el mismo `$509.32 (*)`
//    en 722 locales cuando hay 28 observaciones. Por eso los totales oficiales
//    por local se aplastan a 1,18× mientras los artículos sueltos se abren
//    hasta 4,86×.
// 2. Un local con cobertura bajo el 70 % NO se rankea. Dice "muestra
//    insuficiente", que es lo honesto y lo que el oficial no dice.
// 3. La composición está pinneada y versionada. El índice se niega a publicar
//    una variación si cambió la versión o si se derrumbó la cobertura: una
//    canasta que se mueve sola no mide precios, mide la canasta.
import { BASKET_V1, BASKET_V1_PINNED_AT } from "./basket_v1";
import { rankable } from "./plausibility";
import type { PrecioScoredRow } from "./audit";

export interface BasketItem {
  articleId: number;
  qty: number;
  need: string;
}

export const BASKET_VERSION = 1;
export const BASKET_ITEMS = BASKET_V1;
export const BASKET_PINNED_AT = BASKET_V1_PINNED_AT;

export const MIN_COVERAGE = 0.7;
export const MIN_QUALIFIED_STORES = 5;
export const INDEX_MAX_COVERAGE_DROP = 0.2;

/**
 * Las necesidades canónicas de la canasta. El one-off `precios_pin_basket`
 * elige, para cada una, el artículo con más observaciones; las cantidades son
 * mensuales para un hogar de dos personas y están acá porque son un supuesto
 * declarado, no una medición.
 */
export const NEEDS: ReadonlyArray<{ need: string; pattern: RegExp; qty: number }> = Object.freeze([
  Object.freeze({ need: "aceite", pattern: /^Aceite de girasol/i, qty: 2 }),
  Object.freeze({ need: "arroz", pattern: /^Arroz [Bb]lanco/i, qty: 3 }),
  Object.freeze({ need: "azúcar", pattern: /^Azúcar blanco/i, qty: 2 }),
  Object.freeze({ need: "fideos", pattern: /^Fideos secos semolados/i, qty: 4 }),
  Object.freeze({ need: "harina", pattern: /^Harina trigo (?:común )?0000/i, qty: 2 }),
  Object.freeze({ need: "polenta", pattern: /^Harina de maíz/i, qty: 1 }),
  Object.freeze({ need: "huevos", pattern: /^Huevos colorados/i, qty: 2 }),
  Object.freeze({ need: "carne picada", pattern: /^Carne picada vacuna Hasta 20/i, qty: 2 }),
  Object.freeze({ need: "carne con hueso", pattern: /^Paleta  vacuna con  hueso/i, qty: 2 }),
  Object.freeze({ need: "pollo", pattern: /^Pollo entero fresco/i, qty: 2 }),
  Object.freeze({ need: "leche en polvo o manteca", pattern: /^Manteca/i, qty: 1 }),
  Object.freeze({ need: "queso rallado", pattern: /^Queso rallado/i, qty: 1 }),
  Object.freeze({ need: "yogur", pattern: /^Yogur/i, qty: 4 }),
  Object.freeze({ need: "dulce de leche", pattern: /^Dulce de leche envasado/i, qty: 1 }),
  Object.freeze({ need: "yerba", pattern: /^Yerba mate común/i, qty: 2 }),
  Object.freeze({ need: "café", pattern: /^Café envasado/i, qty: 1 }),
  Object.freeze({ need: "té", pattern: /^Té negro en saquitos/i, qty: 1 }),
  Object.freeze({ need: "pan de molde", pattern: /^Pan de molde/i, qty: 2 }),
  Object.freeze({ need: "galletitas", pattern: /^Galletitas al agua/i, qty: 2 }),
  Object.freeze({ need: "pulpa de tomate", pattern: /^Pulpa de tomate/i, qty: 4 }),
  Object.freeze({ need: "arvejas", pattern: /^Arvejas en conserva/i, qty: 2 }),
  Object.freeze({ need: "sal", pattern: /^Sal fina yodada/i, qty: 1 }),
  Object.freeze({ need: "papa", pattern: /^Papa /i, qty: 4 }),
  Object.freeze({ need: "cebolla", pattern: /^Cebolla /i, qty: 2 }),
  Object.freeze({ need: "tomate", pattern: /^Tomate /i, qty: 3 }),
  Object.freeze({ need: "manzana", pattern: /^Manzana /i, qty: 3 }),
  Object.freeze({ need: "banana", pattern: /^Banana /i, qty: 3 }),
  Object.freeze({ need: "papel higiénico", pattern: /^Papel higiénico/i, qty: 2 }),
  Object.freeze({ need: "detergente", pattern: /^Detergente para vajilla/i, qty: 1 }),
  Object.freeze({ need: "jabón en polvo", pattern: /^Jabón en [Pp]olvo/i, qty: 1 }),
  Object.freeze({ need: "hipoclorito", pattern: /^Hipoclorito de sodio/i, qty: 2 }),
  Object.freeze({ need: "jabón de tocador", pattern: /^Jabón de [Tt]ocador/i, qty: 3 }),
  Object.freeze({ need: "pasta dental", pattern: /^Pasta dental/i, qty: 1 }),
  Object.freeze({ need: "shampoo", pattern: /^Shampoo/i, qty: 1 }),
]);

const BASKET_BY_ARTICLE = new Map(BASKET_ITEMS.map((item) => [item.articleId, item]));

/**
 * Costo de la canasta en un local, con su cobertura. Sólo cuenta filas que
 * pueden encabezar un ranking: una góndola vieja o una fila marcada `suspect`
 * no aporta cobertura, porque si aportara volveríamos a publicar un total que
 * parece comparable y no lo es.
 */
export function storeBasket(rows: PrecioScoredRow[]): {
  cost: number;
  coverage: number;
  items: number;
  qualified: boolean;
} {
  const cheapest = new Map<number, number>();
  for (const row of rows) {
    const item = BASKET_BY_ARTICLE.get(row.articleId);
    if (!item || !rankable(row)) continue;
    const current = cheapest.get(row.articleId);
    if (current === undefined || row.price < current) cheapest.set(row.articleId, row.price);
  }

  let cost = 0;
  for (const [articleId, price] of cheapest) {
    cost += price * (BASKET_BY_ARTICLE.get(articleId) as BasketItem).qty;
  }
  const coverage = BASKET_ITEMS.length ? cheapest.size / BASKET_ITEMS.length : 0;
  return { cost, coverage, items: cheapest.size, qualified: coverage >= MIN_COVERAGE };
}

/** Mediana del costo de canasta por ámbito (departamento o cadena). */
export function groupBaskets(
  baskets: Array<{ scope: string; cost: number; qualified: boolean }>
): Array<{ scope: string; median: number; stores: number; qualified: boolean; note: string }> {
  const byScope = new Map<string, number[]>();
  for (const basket of baskets) {
    if (!basket.qualified) continue;
    const list = byScope.get(basket.scope) || [];
    list.push(basket.cost);
    byScope.set(basket.scope, list);
  }

  return [...byScope.entries()].map(([scope, costs]) => {
    const sorted = costs.sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    const qualified = sorted.length >= MIN_QUALIFIED_STORES;
    return {
      scope,
      median,
      stores: sorted.length,
      qualified,
      note: qualified
        ? `${sorted.length} locales calificados`
        : `muestra insuficiente: ${sorted.length} locales calificados, se necesitan ${MIN_QUALIFIED_STORES}`,
    };
  });
}

/** Si el índice puede publicar una variación contra el día anterior. */
export function indexDecision(
  today: { version: number; qualifiedStores: number },
  previous: { version: number; qualifiedStores: number } | null
): { publish: boolean; reason: string } {
  if (!previous) return { publish: true, reason: "primer día: se publica el nivel, todavía no hay variación" };
  if (today.version !== previous.version) {
    return {
      publish: false,
      reason: `la versión de la canasta cambió (${previous.version} -> ${today.version}): la serie se corta a propósito`,
    };
  }
  if (previous.qualifiedStores > 0 && today.qualifiedStores < previous.qualifiedStores * (1 - INDEX_MAX_COVERAGE_DROP)) {
    return {
      publish: false,
      reason: `los locales calificados cayeron de ${previous.qualifiedStores} a ${today.qualifiedStores}: la variación mediría la cobertura, no los precios`,
    };
  }
  return { publish: true, reason: `${today.qualifiedStores} locales calificados` };
}
```

Y el archivo pinneado, que el one-off regenera pero que se commitea para que el
build no dependa de una corrida:

```ts
// classes/precios/basket_v1.ts
// GENERADO por scripts/oneoff/precios_pin_basket.ts. NO editar a mano.
import type { BasketItem } from "./basket";

export const BASKET_V1_PINNED_AT = "2026-09-07";

export const BASKET_V1: ReadonlyArray<BasketItem> = Object.freeze([
  // Aceite de girasol - Óptimo — 670 observaciones al pinnear
  Object.freeze({ articleId: 1, qty: 2, need: "aceite" }),
]);
```

- [ ] **Step 4: Generar la canasta real y correr los tests**

Run: `npm run precios_pin_basket` (sobrescribe `classes/precios/basket_v1.ts` con las ~34 necesidades y sus conteos reales)
Run: `npx vitest run tests/precios/basket.test.ts`
Expected: PASS, y `BASKET_ITEMS.length >= 15`

Añadir a `package.json` en `scripts`:

```json
"precios_pin_basket": "ts-node scripts/oneoff/precios_pin_basket.ts"
```

- [ ] **Step 5: Commit**

```bash
git add classes/precios/basket.ts classes/precios/basket_v1.ts scripts/oneoff/precios_pin_basket.ts package.json tests/precios/basket.test.ts
git commit -m "feat(precios): canasta pinneada con regla de cobertura e indice que se niega a mentir"
```

---

### Task 7: Persistencia

**Files:**
- Create: `classes/precios/store.ts`
- Test: `tests/precios/store.test.ts`

**Interfaces:**
- Consumes: `PrecioArticle`, `PrecioStore` (Task 1), `PrecioScoredRow` (Task 5).
- Produces:
  - `saveArticles(articles: PrecioArticle[]): Promise<number>`
  - `saveStores(stores: PrecioStore[]): Promise<number>`
  - `loadCurrentState(): Promise<Map<string, { price: number; sourceDay: string }>>`
  - `detectPriceChanges(rows: PrecioScoredRow[], previous: Map<string, { price: number; sourceDay: string }>, day: string): PrecioChange[]`
  - `PrecioChange { key: string; articleId: number; storeId: number; from: number; to: number; changePct: number; day: string; observedAt: Date }`
  - `saveCurrent(rows: PrecioScoredRow[], day: string): Promise<number>`
  - `saveChanges(changes: PrecioChange[]): Promise<number>`
  - `saveDailyStats(day: string, stats: PrecioDailyStat[]): Promise<number>`
  - `PrecioDailyStat { day: string; articleId: number; scope: string; n: number; min: number; p10: number; p50: number; p90: number; max: number }`
  - `saveBasketDaily(doc: PrecioBasketDaily): Promise<boolean>`
  - `loadBasketDaily(day: string): Promise<PrecioBasketDaily | null>`
  - `publishDecision(nextCount: number, previousCount: number): { saved: boolean; reason: string }`
  - `stateKey(articleId: number, storeId: number): string`

- [ ] **Step 1: Write the failing test**

```ts
// tests/precios/store.test.ts
import { describe, expect, it } from "vitest";
import { detectPriceChanges, publishDecision, stateKey } from "../../classes/precios/store";

const row = (articleId: number, storeId: number, price: number) => ({
  articleId,
  storeId,
  declarationId: 1,
  price,
  sourceDay: "2026-09-07",
  storeName: "Local",
  address: "x",
  lat: -34.8,
  lon: -56.1,
  verdict: "ok" as const,
  freshness: "fresh" as const,
});

describe("detectPriceChanges", () => {
  it("escribe UNA fila por cada cambio, sin umbral minimo", () => {
    // El ledger es lo unico irreconstruible: la fila diaria se sobrescribe.
    const previous = new Map([[stateKey(1, 1), { price: 100, sourceDay: "2026-09-06" }]]);
    const changes = detectPriceChanges([row(1, 1, 100.01)], previous, "2026-09-07");
    expect(changes).toHaveLength(1);
    expect(changes[0]).toMatchObject({ from: 100, to: 100.01, articleId: 1, storeId: 1 });
    expect(changes[0].changePct).toBeCloseTo(0.01, 4);
  });

  it("no escribe nada cuando el precio no se movio", () => {
    const previous = new Map([[stateKey(1, 1), { price: 100, sourceDay: "2026-09-06" }]]);
    expect(detectPriceChanges([row(1, 1, 100)], previous, "2026-09-07")).toHaveLength(0);
  });

  it("la primera aparicion de un par no es un cambio", () => {
    expect(detectPriceChanges([row(1, 1, 100)], new Map(), "2026-09-07")).toHaveLength(0);
  });

  it("ignora filas sin local o rechazadas", () => {
    const previous = new Map([[stateKey(1, 1), { price: 100, sourceDay: "2026-09-06" }]]);
    const orphan = { ...row(1, 1, 120), storeId: null as any };
    const rejected = { ...row(1, 1, 120), verdict: "reject" as const };
    expect(detectPriceChanges([orphan, rejected], previous, "2026-09-07")).toHaveLength(0);
  });
});

describe("publishDecision", () => {
  it("no reemplaza un dia bueno con una corrida flaca", () => {
    expect(publishDecision(5_000, 70_000).saved).toBe(false);
    expect(publishDecision(0, 0).saved).toBe(false);
  });

  it("publica una corrida normal", () => {
    expect(publishDecision(74_000, 75_000).saved).toBe(true);
  });

  it("publica la primera corrida, que no tiene con que compararse", () => {
    expect(publishDecision(70_000, 0).saved).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/precios/store.test.ts`
Expected: FAIL — módulo inexistente

- [ ] **Step 3: Write minimal implementation**

```ts
// classes/precios/store.ts
//
// Seis colecciones en la Mongo del BACKEND (`cambio-uy`, la que lee la API
// pública), nunca la del app: la de estado es la colección más grande del
// proyecto (~75.600 documentos) y el patrón de `regional` —snapshot + diario +
// ledger, servidos por la API del root y consumidos por la página Nuxt— ya está
// probado con esta forma.
//
//   * `precios_articles`      — 215, upsert
//   * `precios_stores`        — 749, upsert
//   * `precios_current`       — estado por (artículo, local), upsert
//   * `precios_changes`       — UNA fila por cambio de precio, sin umbral
//   * `precios_daily`         — agregados por (día, artículo, ámbito)
//   * `precios_basket_daily`  — canasta e índice por día
//
// El ledger es lo único irreconstruible: la fila diaria se sobrescribe, así que
// lo que pasó entre corridas sólo existe si se escribió cuando pasó.
import { MongooseServer, Schema } from "../database";
import type { PrecioScoredRow } from "./audit";
import type { PrecioArticle, PrecioStore } from "./types";

export interface PrecioChange {
  key: string;
  articleId: number;
  storeId: number;
  from: number;
  to: number;
  changePct: number;
  day: string;
  observedAt: Date;
}

export interface PrecioDailyStat {
  day: string;
  articleId: number;
  /** `nacional`, `dept:Montevideo`, `chain:Ta - Ta`. */
  scope: string;
  n: number;
  min: number;
  p10: number;
  p50: number;
  p90: number;
  max: number;
}

export interface PrecioBasketDaily {
  day: string;
  basketVersion: number;
  qualifiedStores: number;
  nationalMedian: number;
  indexPublished: boolean;
  indexReason: string;
  scopes: Array<{ scope: string; median: number; stores: number; qualified: boolean; note: string }>;
  cheapestStores: Array<{ storeId: number; storeName: string; department: string; cost: number; coverage: number }>;
  shelfVerdicts: Array<{ storeId: number; storeName: string; ratio: number; severity: string; note: string }>;
}

export const stateKey = (articleId: number, storeId: number): string => `${articleId}:${storeId}`;

const articleSchema = new Schema(
  {
    id: { type: Number, required: true, unique: true },
    name: String,
    group: String,
    variant: String,
    unitRaw: String,
    qty: { type: Number, default: null },
    unit: { type: String, default: null },
    image: { type: String, default: null },
  },
  { strict: true }
);

const storeSchema = new Schema(
  {
    id: { type: Number, required: true, unique: true },
    name: String,
    chain: String,
    branch: String,
    address: String,
    lat: { type: Number, default: null },
    lon: { type: Number, default: null },
    locality: String,
    department: String,
    phone: String,
    web: String,
  },
  { strict: true }
);
storeSchema.index({ department: 1 });
storeSchema.index({ chain: 1 });

const currentSchema = new Schema(
  {
    key: { type: String, required: true, unique: true },
    articleId: { type: Number, required: true },
    storeId: { type: Number, required: true },
    price: { type: Number, required: true },
    sourceDay: { type: String, required: true },
    freshness: { type: String, required: true },
    verdict: { type: String, required: true },
    seenDay: { type: String, required: true },
  },
  { strict: true }
);
currentSchema.index({ articleId: 1, price: 1 });
currentSchema.index({ storeId: 1 });

const changeSchema = new Schema(
  {
    key: { type: String, required: true },
    articleId: { type: Number, required: true },
    storeId: { type: Number, required: true },
    from: { type: Number, required: true },
    to: { type: Number, required: true },
    changePct: { type: Number, required: true },
    day: { type: String, required: true },
    observedAt: { type: Date, required: true },
  },
  { strict: true }
);
changeSchema.index({ key: 1, day: 1 }, { unique: true });
changeSchema.index({ articleId: 1, day: -1 });
changeSchema.index({ day: -1 });

const dailySchema = new Schema(
  {
    day: { type: String, required: true },
    articleId: { type: Number, required: true },
    scope: { type: String, required: true },
    n: Number,
    min: Number,
    p10: Number,
    p50: Number,
    p90: Number,
    max: Number,
  },
  { strict: true }
);
dailySchema.index({ day: 1, articleId: 1, scope: 1 }, { unique: true });
dailySchema.index({ articleId: 1, scope: 1, day: -1 });

const basketSchema = new Schema({ day: { type: String, required: true, unique: true }, doc: Schema.Types.Mixed }, { strict: false });

const articlesDb = (): MongooseServer => MongooseServer.getInstance("precios_article", articleSchema);
const storesDb = (): MongooseServer => MongooseServer.getInstance("precios_store", storeSchema);
const currentDb = (): MongooseServer => MongooseServer.getInstance("precios_current", currentSchema);
const changesDb = (): MongooseServer => MongooseServer.getInstance("precios_change", changeSchema);
const dailyDb = (): MongooseServer => MongooseServer.getInstance("precios_daily", dailySchema);
const basketDb = (): MongooseServer => MongooseServer.getInstance("precios_basket_daily", basketSchema);

/**
 * Una corrida que trae una fracción de lo guardado es una caída del origen, no
 * un país que dejó de publicar precios. Misma lección que enseñaron los jobs de
 * videos y bankos.
 */
export const COLLAPSE_RATIO = Number(process.env.PRECIOS_COLLAPSE_RATIO || 0.5);

export function publishDecision(nextCount: number, previousCount: number): { saved: boolean; reason: string } {
  if (nextCount <= 0) return { saved: false, reason: "la corrida no trajo ninguna observación — se conserva la anterior" };
  if (previousCount > 1000 && nextCount < previousCount * COLLAPSE_RATIO) {
    return {
      saved: false,
      reason: `la corrida trajo ${nextCount} observaciones contra ${previousCount} guardadas (< ${Math.round(
        COLLAPSE_RATIO * 100
      )} %) — se conserva la anterior`,
    };
  }
  return { saved: true, reason: `${nextCount} observaciones publicadas` };
}

/** Cada diferencia contra la última lectura, sin umbral mínimo. */
export function detectPriceChanges(
  rows: PrecioScoredRow[],
  previous: Map<string, { price: number; sourceDay: string }>,
  day: string
): PrecioChange[] {
  const observedAt = new Date();
  const changes: PrecioChange[] = [];
  for (const row of rows) {
    if (row.storeId === null || row.verdict === "reject") continue;
    const key = stateKey(row.articleId, row.storeId);
    const before = previous.get(key);
    if (!before || before.price === row.price) continue;
    changes.push({
      key,
      articleId: row.articleId,
      storeId: row.storeId,
      from: before.price,
      to: row.price,
      changePct: ((row.price - before.price) / before.price) * 100,
      day,
      observedAt,
    });
  }
  return changes;
}

// `bulkUpsert` y no un upsert por documento: una corrida escribe ~75.600 filas
// de estado, y `findOneAndUpdate` de a una son 75.600  idas y vueltas.
// `classes/database.ts:308` lo expone como bulkWrite con `upsert: true`, que es
// lo que usa `classes/regional/store.ts` para su ledger.
const CHUNK = 1000;

async function upsertAll(
  db: MongooseServer,
  operations: { filter: Record<string, any>; update: Record<string, any> }[]
): Promise<number> {
  for (let i = 0; i < operations.length; i += CHUNK) {
    await db.bulkUpsert(operations.slice(i, i + CHUNK));
  }
  return operations.length;
}

export async function saveArticles(articles: PrecioArticle[]): Promise<number> {
  return upsertAll(
    articlesDb(),
    articles.map((article) => ({ filter: { id: article.id }, update: article }))
  );
}

export async function saveStores(stores: PrecioStore[]): Promise<number> {
  return upsertAll(
    storesDb(),
    stores.map((store) => ({ filter: { id: store.id }, update: store }))
  );
}

export async function loadCurrentState(): Promise<Map<string, { price: number; sourceDay: string }>> {
  const rows = await currentDb().aggregate([{ $project: { key: 1, price: 1, sourceDay: 1 } }]);
  return new Map(rows.map((row: any) => [row.key, { price: row.price, sourceDay: row.sourceDay }]));
}

export async function saveCurrent(rows: PrecioScoredRow[], day: string): Promise<number> {
  const operations = rows
    .filter((row) => row.storeId !== null && row.verdict !== "reject")
    .map((row) => {
      const key = stateKey(row.articleId, row.storeId as number);
      return {
        filter: { key },
        update: {
          key,
          articleId: row.articleId,
          storeId: row.storeId,
          price: row.price,
          sourceDay: row.sourceDay,
          freshness: row.freshness,
          verdict: row.verdict,
          seenDay: day,
        },
      };
    });
  return upsertAll(currentDb(), operations);
}

export async function saveChanges(changes: PrecioChange[]): Promise<number> {
  return upsertAll(
    changesDb(),
    changes.map((change) => ({ filter: { key: change.key, day: change.day }, update: change }))
  );
}

export async function saveDailyStats(day: string, stats: PrecioDailyStat[]): Promise<number> {
  return upsertAll(
    dailyDb(),
    stats.map((stat) => ({ filter: { day, articleId: stat.articleId, scope: stat.scope }, update: stat }))
  );
}

export async function saveBasketDaily(doc: PrecioBasketDaily): Promise<boolean> {
  await basketDb().updateOne({ day: doc.day }, { day: doc.day, doc });
  return true;
}

export async function loadBasketDaily(day: string): Promise<PrecioBasketDaily | null> {
  const rows = await basketDb().aggregate([{ $match: { day } }, { $limit: 1 }]);
  return (rows[0]?.doc as PrecioBasketDaily | undefined) ?? null;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/precios/store.test.ts`
Expected: PASS

La API de `MongooseServer` usada acá está verificada contra
`classes/database.ts`: `bulkUpsert(operations)` en la línea 308, más `updateOne`
y `aggregate`. **No existe `updateOrCreate`** — no inventarlo.

- [ ] **Step 5: Commit**

```bash
git add classes/precios/store.ts tests/precios/store.test.ts
git commit -m "feat(precios): seis colecciones con ledger de cambios sin umbral"
```

---

### Task 8: Orquestación, entrypoint y pm2

**Files:**
- Create: `classes/precios/refresh.ts`
- Create: `sync_precios.ts`
- Modify: `ecosystem.config.js` (nuevo bloque al final de `apps`)
- Modify: `scripts/deploy-backend.sh:51` (añadir `currency-precios` a `OTHER_APPS`)
- Test: `tests/precios/refresh.test.ts`

**Interfaces:**
- Consumes: todo lo anterior.
- Produces:
  - `scoreObservations(observations: PrecioObservation[], today: string): PrecioScoredRow[]`
  - `dailyStatsFor(day: string, rows: PrecioScoredRow[], stores: Map<number, PrecioStore>): PrecioDailyStat[]`
  - `refreshPrecios(options?: { limit?: number }): Promise<PreciosRunReport>`
  - `PreciosRunReport { day: string; articles: number; observations: number; rejected: number; changes: number; qualifiedStores: number; indexReason: string; failures: number[] }`

- [ ] **Step 1: Write the failing test**

```ts
// tests/precios/refresh.test.ts
import { describe, expect, it } from "vitest";
import { normalizeStore } from "../../classes/precios/catalog";
import { dailyStatsFor, scoreObservations } from "../../classes/precios/refresh";

const observation = (articleId: number, storeId: number, price: number, sourceDay = "2026-09-07") => ({
  articleId,
  storeId,
  declarationId: storeId,
  price,
  sourceDay,
  storeName: `Local ${storeId}`,
  address: "x",
  lat: -34.8,
  lon: -56.1,
});

describe("scoreObservations", () => {
  it("etiqueta cada observacion con veredicto y frescura", () => {
    const rows = scoreObservations(
      Array.from({ length: 20 }, (_, i) => observation(1, i + 1, 100 + i)),
      "2026-09-07"
    );
    expect(rows).toHaveLength(20);
    rows.forEach((row) => {
      expect(row.verdict).toBe("ok");
      expect(row.freshness).toBe("fresh");
    });
  });

  it("marca stale la observacion vieja sin borrarla", () => {
    const rows = scoreObservations(
      [...Array.from({ length: 19 }, (_, i) => observation(1, i + 1, 100)), observation(1, 20, 100, "2026-08-12")],
      "2026-09-07"
    );
    expect(rows).toHaveLength(20);
    expect(rows.find((row) => row.storeId === 20)?.freshness).toBe("stale");
  });

  it("la banda se calcula por articulo, no sobre todo el barrido", () => {
    // Un articulo caro y uno barato en la misma corrida: mezclarlos borraria
    // el barato entero.
    const rows = scoreObservations(
      [
        ...Array.from({ length: 12 }, (_, i) => observation(1, i + 1, 50 + i)),
        ...Array.from({ length: 12 }, (_, i) => observation(2, i + 20, 5000 + i)),
      ],
      "2026-09-07"
    );
    expect(rows.filter((row) => row.verdict === "reject")).toHaveLength(0);
  });
});

describe("dailyStatsFor", () => {
  const stores = new Map([
    [1, normalizeStore({ id: 1, name: "Ta - Ta - Suc. A", direccion: "a", x: -34.8, y: -56.1, localidad: "Montevideo, MONTEVIDEO " })],
    [2, normalizeStore({ id: 2, name: "Ta - Ta - Suc. B", direccion: "b", x: -34.7, y: -56.2, localidad: "Salto, SALTO " })],
  ]);

  it("agrega por nacional, por departamento y por cadena", () => {
    const rows = scoreObservations([observation(1, 1, 100), observation(1, 2, 200)], "2026-09-07");
    const stats = dailyStatsFor("2026-09-07", rows, stores);
    const scopes = stats.map((stat) => stat.scope).sort();
    expect(scopes).toContain("nacional");
    expect(scopes).toContain("dept:Montevideo");
    expect(scopes).toContain("dept:Salto");
    expect(scopes).toContain("chain:Ta - Ta");
    expect(stats.find((stat) => stat.scope === "nacional")?.n).toBe(2);
  });

  it("no agrega filas rechazadas", () => {
    const rows = scoreObservations([observation(1, 1, 100), observation(1, 2, 200)], "2026-09-07").map((row) => ({
      ...row,
      verdict: "reject" as const,
    }));
    expect(dailyStatsFor("2026-09-07", rows, stores)).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/precios/refresh.test.ts`
Expected: FAIL — módulo inexistente

- [ ] **Step 3: Write minimal implementation**

```ts
// classes/precios/refresh.ts
//
// La corrida completa: catálogo, 215 barridos, tres guardas, seis escrituras.
//
// El orden importa. La banda de plausibilidad se calcula POR ARTÍCULO sobre las
// filas de ese artículo, no sobre todo el barrido: mezclar un aceite de $109 con
// un shampoo de $395 borraría uno de los dos enteros. Y la auditoría de góndola
// va al final, porque necesita la mediana nacional de cada artículo, que sólo
// existe cuando terminó todo.
import { auditShelves } from "./audit";
import type { PrecioScoredRow, ShelfVerdict } from "./audit";
import { BASKET_VERSION, groupBaskets, indexDecision, storeBasket } from "./basket";
import { fetchCatalog } from "./catalog";
import { articleBand, percentile, priceVerdict } from "./plausibility";
import { freshnessOf } from "./staleness";
import {
  detectPriceChanges,
  loadBasketDaily,
  loadCurrentState,
  publishDecision,
  saveArticles,
  saveBasketDaily,
  saveChanges,
  saveCurrent,
  saveDailyStats,
  saveStores,
  type PrecioDailyStat,
} from "./store";
import { observationsFor, storeIndex, sweepArticle } from "./sweep";
import type { PrecioObservation, PrecioStore } from "./types";

export interface PreciosRunReport {
  day: string;
  articles: number;
  observations: number;
  rejected: number;
  changes: number;
  qualifiedStores: number;
  indexReason: string;
  failures: number[];
}

/** Cada observación con su veredicto y su frescura. La banda es por artículo. */
export function scoreObservations(observations: PrecioObservation[], today: string): PrecioScoredRow[] {
  const byArticle = new Map<number, PrecioObservation[]>();
  for (const observation of observations) {
    const list = byArticle.get(observation.articleId) || [];
    list.push(observation);
    byArticle.set(observation.articleId, list);
  }

  const scored: PrecioScoredRow[] = [];
  for (const [, list] of byArticle) {
    const band = articleBand(list.map((observation) => observation.price));
    for (const observation of list) {
      scored.push({
        ...observation,
        verdict: priceVerdict(observation.price, band),
        freshness: freshnessOf(observation.sourceDay, today),
      });
    }
  }
  return scored;
}

const statFor = (day: string, articleId: number, scope: string, prices: number[]): PrecioDailyStat => {
  const sorted = prices.sort((a, b) => a - b);
  return {
    day,
    articleId,
    scope,
    n: sorted.length,
    min: sorted[0],
    p10: percentile(sorted, 0.1),
    p50: percentile(sorted, 0.5),
    p90: percentile(sorted, 0.9),
    max: sorted[sorted.length - 1],
  };
};

/** Agregados del día por artículo, en tres ámbitos. */
export function dailyStatsFor(
  day: string,
  rows: PrecioScoredRow[],
  stores: Map<number, PrecioStore>
): PrecioDailyStat[] {
  const buckets = new Map<string, { articleId: number; scope: string; prices: number[] }>();
  const push = (articleId: number, scope: string, price: number) => {
    const key = `${articleId}|${scope}`;
    const bucket = buckets.get(key) || { articleId, scope, prices: [] };
    bucket.prices.push(price);
    buckets.set(key, bucket);
  };

  for (const row of rows) {
    if (row.verdict === "reject") continue;
    push(row.articleId, "nacional", row.price);
    const store = row.storeId === null ? undefined : stores.get(row.storeId);
    if (store?.department) push(row.articleId, `dept:${store.department}`, row.price);
    if (store?.chain) push(row.articleId, `chain:${store.chain}`, row.price);
  }

  return [...buckets.values()].map((bucket) => statFor(day, bucket.articleId, bucket.scope, bucket.prices));
}

export async function refreshPrecios(options: { limit?: number } = {}): Promise<PreciosRunReport> {
  const day = new Date().toISOString().slice(0, 10);
  const { articles, stores } = await fetchCatalog();
  await Promise.all([saveArticles(articles), saveStores(stores)]);

  const index = storeIndex(stores);
  const storeById = new Map(stores.map((store) => [store.id, store]));
  const target = options.limit ? articles.slice(0, options.limit) : articles;

  const observations: PrecioObservation[] = [];
  const failures: number[] = [];
  let rejected = 0;

  for (const article of target) {
    const rows = await sweepArticle(article.id);
    if (rows === null) {
      failures.push(article.id);
      continue;
    }
    const result = observationsFor(article.id, rows, index);
    observations.push(...result.observations);
    rejected += result.rejected.length;
    for (const note of result.rejected.slice(0, 3)) console.log(`[precios] descartada ${article.name} :: ${note}`);
  }

  const scored = scoreObservations(observations, day);
  const previous = await loadCurrentState();
  const decision = publishDecision(scored.length, previous.size);
  console.log(`[precios] ${decision.reason}`);
  if (!decision.saved) {
    return {
      day,
      articles: target.length,
      observations: scored.length,
      rejected,
      changes: 0,
      qualifiedStores: 0,
      indexReason: decision.reason,
      failures,
    };
  }

  const changes = detectPriceChanges(scored, previous, day);
  await saveChanges(changes);
  await saveCurrent(scored, day);
  const stats = dailyStatsFor(day, scored, storeById);
  await saveDailyStats(day, stats);

  // La canasta y la auditoría, ahora que existe la mediana nacional.
  const nationalMedians = new Map(
    stats.filter((stat) => stat.scope === "nacional").map((stat) => [stat.articleId, stat.p50])
  );
  const shelfVerdicts: ShelfVerdict[] = auditShelves(scored, nationalMedians);
  for (const verdict of shelfVerdicts.filter((entry) => entry.severity !== "ok").slice(0, 10)) {
    console.log(`[precios] góndola ${verdict.severity}: ${verdict.storeName} :: ${verdict.note}`);
  }

  const byStore = new Map<number, PrecioScoredRow[]>();
  for (const row of scored) {
    if (row.storeId === null) continue;
    const list = byStore.get(row.storeId) || [];
    list.push(row);
    byStore.set(row.storeId, list);
  }

  const storeBaskets = [...byStore.entries()].map(([storeId, rows]) => {
    const store = storeById.get(storeId);
    return { storeId, store, ...storeBasket(rows) };
  });
  const qualified = storeBaskets.filter((entry) => entry.qualified);
  const nationalCosts = qualified.map((entry) => entry.cost).sort((a, b) => a - b);
  const nationalMedian = nationalCosts.length ? nationalCosts[Math.floor(nationalCosts.length / 2)] : 0;

  const yesterday = new Date(Date.parse(`${day}T00:00:00Z`) - 86_400_000).toISOString().slice(0, 10);
  const previousBasket = await loadBasketDaily(yesterday);
  const index_ = indexDecision(
    { version: BASKET_VERSION, qualifiedStores: qualified.length },
    previousBasket ? { version: previousBasket.basketVersion, qualifiedStores: previousBasket.qualifiedStores } : null
  );

  await saveBasketDaily({
    day,
    basketVersion: BASKET_VERSION,
    qualifiedStores: qualified.length,
    nationalMedian,
    indexPublished: index_.publish,
    indexReason: index_.reason,
    scopes: [
      ...groupBaskets(qualified.map((entry) => ({ scope: `dept:${entry.store?.department || ""}`, cost: entry.cost, qualified: true }))),
      ...groupBaskets(qualified.map((entry) => ({ scope: `chain:${entry.store?.chain || ""}`, cost: entry.cost, qualified: true }))),
    ],
    cheapestStores: qualified
      .sort((a, b) => a.cost - b.cost)
      .slice(0, 25)
      .map((entry) => ({
        storeId: entry.storeId,
        storeName: entry.store?.name || "",
        department: entry.store?.department || "",
        cost: entry.cost,
        coverage: entry.coverage,
      })),
    shelfVerdicts: shelfVerdicts
      .filter((entry) => entry.severity !== "ok")
      .map(({ storeId, storeName, ratio, severity, note }) => ({ storeId, storeName, ratio, severity, note })),
  });

  return {
    day,
    articles: target.length,
    observations: scored.length,
    rejected,
    changes: changes.length,
    qualifiedStores: qualified.length,
    indexReason: index_.reason,
    failures,
  };
}
```

```ts
// sync_precios.ts
// Los precios oficiales del SIPC, todos los días, con el histórico que el
// Estado no guarda.
//
// La API de `precios.uy` (que es el sitio oficial: `precios.gub.uy` responde
// 301 hacia ahí) devuelve sólo el precio de hoy con su fecha. No hay endpoint
// de serie. Este job es el archivo.
//
// Barre 215 × `compararArticulo` con bbox nacional. NO usa `compararCanasta`,
// que imputa: ver `classes/precios/parse.ts` y el tripwire en
// `tests/precios/no_imputed_endpoint.test.ts`.
import dotenv from "dotenv";
dotenv.config();

import { MongooseServer, withTimeout } from "./classes/database";
import { refreshPrecios } from "./classes/precios/refresh";

async function main(): Promise<void> {
  // Primero y obligatorio: `classes/precios/store.ts` se ata a la conexión
  // mongoose por defecto, que nadie abre solo. Sin esto cada escritura buffea
  // diez segundos y el job sale reportando éxito.
  try {
    await withTimeout(MongooseServer.startConnectionPromise(), 15_000);
  } catch (error) {
    console.error("[precios] sin conexión a Mongo:", error);
    process.exit(1);
  }

  const startedAt = Date.now();
  const limitArg = process.argv.find((arg) => arg.startsWith("--limit="));
  const limit = limitArg ? Number(limitArg.split("=")[1]) : undefined;

  const report = await refreshPrecios({ limit });

  console.log(
    `[precios] listo en ${Math.round((Date.now() - startedAt) / 1000)}s :: ` +
      `${report.articles} artículos, ${report.observations} observaciones, ${report.rejected} descartadas, ` +
      `${report.changes} cambios al ledger, ${report.qualifiedStores} locales con canasta calificada`
  );
  console.log(`[precios] índice :: ${report.indexReason}`);
  if (report.failures.length) console.log(`[precios] artículos sin respuesta: ${report.failures.join(", ")}`);

  // Una corrida que no pudo publicar es una corrida fallida aunque nada haya
  // tirado: pm2 no debe reportar éxito mientras el tablero envejece.
  process.exit(report.observations > 0 ? 0 : 1);
}

main().catch((error) => {
  console.error("[precios] falló:", error);
  process.exit(1);
});
```

Bloque nuevo al final del array `apps` de `ecosystem.config.js`:

```js
    {
      // Los precios oficiales del SIPC (MEF / Defensa del Consumidor), y el histórico que
      // el Estado no guarda: su API devuelve sólo el precio de hoy con su fecha, sin endpoint
      // de serie. 215 POST con bbox nacional, ~2,3 min medidos, ~75.600 observaciones por
      // corrida.
      // Diario y no más seguido a propósito: la `fecha` que declara el origen tiene
      // granularidad de día, así que correr cada hora no agregaría una sola fila al ledger.
      // 03:12 UTC ≈ 00:12 America/Montevideo: hueco libre, antes de rag-index (04:20) y del
      // barrido de alquileres (04:52).
      name: "currency-precios",
      autorestart: false,
      exec_mode: "fork",
      script: "dist/sync_precios.js",
      cron_restart: "12 3 * * *",
      log_date_format: "YYYY-MM-DD HH:mm Z",
    },
```

Y en `scripts/deploy-backend.sh:51`, añadir `currency-precios` al final de
`OTHER_APPS` (sin él el job nunca arranca en el VPS).

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/precios/refresh.test.ts`
Expected: PASS

Run: `npx tsc -p tsconfig.production.json --noEmit`
Expected: sin errores

Prueba de humo real contra el origen, con presupuesto chico:
Run: `npx ts-node sync_precios.ts --limit=3`
Expected: log con observaciones > 0 y `descartadas` contando las filas sin fecha

- [ ] **Step 5: Commit**

```bash
git add classes/precios/refresh.ts sync_precios.ts ecosystem.config.js scripts/deploy-backend.sh tests/precios/refresh.test.ts
git commit -m "feat(precios): job currency-precios con barrido diario y auditoria de cierre"
```

---

### Task 9: Tripwires

**Files:**
- Create: `tests/precios/no_imputed_endpoint.test.ts`
- Test: el archivo es el test

**Interfaces:**
- Consumes: nada (lee el árbol de archivos).
- Produces: nada.

- [ ] **Step 1: Write the failing test**

```ts
// tests/precios/no_imputed_endpoint.test.ts
//
// `compararCanasta` tienta: una llamada de 65 s contra los ~2,3 min del barrido
// por artículo. Y miente. Medido el 2026-09-07 para "Nalga vacuna con hueso"
// (id 114): 28 observaciones reales, y la matriz muestra el mismo "$509.32 (*)"
// en 722 de 722 locales, con 694 celdas sin fecha.
//
// Este test existe para que nadie lo reintroduzca por eficiencia.
import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

const ROOT = path.resolve(__dirname, "../..");

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (entry.name.endsWith(".ts")) out.push(full);
  }
  return out;
}

describe("el endpoint que imputa esta prohibido", () => {
  it("ningun modulo del pipeline lo llama", () => {
    const files = [
      ...walk(path.join(ROOT, "classes/precios")),
      path.join(ROOT, "sync_precios.ts"),
    ];
    const offenders = files.filter((file) => fs.readFileSync(file, "utf8").includes("compararCanasta"));
    expect(offenders).toEqual([]);
  });

  it("el parseo sigue rechazando la marca de imputacion", () => {
    const source = fs.readFileSync(path.join(ROOT, "classes/precios/parse.ts"), "utf8");
    expect(source).toContain('includes("(*)")');
  });
});
```

- [ ] **Step 2: Run test to verify it fails, then passes**

Run: `npx vitest run tests/precios/no_imputed_endpoint.test.ts`
Expected: PASS ya (el pipeline no lo usa). Para verificar que el tripwire
muerde: añadir temporalmente `// compararCanasta` a `classes/precios/net.ts`,
correr el test, confirmar FAIL, y quitarlo.

- [ ] **Step 3: Confirmar que el tripwire muerde**

```bash
printf '\n// compararCanasta\n' >> classes/precios/net.ts
npx vitest run tests/precios/no_imputed_endpoint.test.ts   # debe FALLAR
git checkout classes/precios/net.ts
npx vitest run tests/precios/no_imputed_endpoint.test.ts   # debe PASAR
```

- [ ] **Step 4: Correr la suite entera del pipeline**

Run: `npx vitest run tests/precios/`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add tests/precios/no_imputed_endpoint.test.ts
git commit -m "test(precios): tripwire contra el endpoint que imputa precios"
```

---

### Task 10: Endpoints de la API

**Files:**
- Modify: `index.ts` (imports + cinco `server.getJson` nuevos, junto a los de `regional`)
- Test: `tests/precios/api_contract.test.ts`

**Interfaces:**
- Consumes: `store.ts` de Task 7; `rankable` de Task 4.
- Produces:
  - `GET /precios/articles`
  - `GET /precios/article/:id`
  - `GET /precios/stores?near=lat,lon&r=km`
  - `GET /precios/basket?day=`
  - `GET /precios/changes?articleId=&day=&limit=`
  - En `classes/precios/store.ts`, además: `loadArticlesWithStats(day: string)`, `loadArticleDetail(articleId: number, day: string)`, `loadStoresNear(lat: number, lon: number, km: number)`, `loadChanges(filter)`, `loadArticleSeries(articleId: number, scope: string, from?: string, to?: string)`
  - `haversineKm(a: {lat:number;lon:number}, b: {lat:number;lon:number}): number` en `classes/precios/geo.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/precios/api_contract.test.ts
import { describe, expect, it } from "vitest";
import { haversineKm } from "../../classes/precios/geo";
import { cheapestRankable, coverageNote } from "../../classes/precios/present";

const row = (over: Partial<any> = {}) => ({
  storeId: 1,
  storeName: "Local",
  price: 100,
  sourceDay: "2026-09-07",
  freshness: "fresh",
  verdict: "ok",
  ...over,
});

describe("haversineKm", () => {
  it("mide la distancia entre dos puntos de Montevideo", () => {
    const km = haversineKm({ lat: -34.9011, lon: -56.1645 }, { lat: -34.8721, lon: -56.1668 });
    expect(km).toBeGreaterThan(3);
    expect(km).toBeLessThan(4);
  });
});

describe("cheapestRankable", () => {
  it("la fila mas barata NO puede ser una gondola vieja", () => {
    const rows = [row({ price: 50, freshness: "stale", storeId: 9 }), row({ price: 90, storeId: 1 })];
    expect(cheapestRankable(rows as any)?.storeId).toBe(1);
  });

  it("tampoco una fila marcada suspect", () => {
    const rows = [row({ price: 18.5, verdict: "suspect", storeId: 9 }), row({ price: 64, storeId: 1 })];
    expect(cheapestRankable(rows as any)?.storeId).toBe(1);
  });

  it("devuelve null cuando no queda ninguna fila rankeable", () => {
    expect(cheapestRankable([row({ freshness: "stale" })] as any)).toBeNull();
  });
});

describe("coverageNote", () => {
  it("dice muestra insuficiente en vez de publicar un total que parece comparable", () => {
    expect(coverageNote(0.4)).toMatch(/insuficiente/i);
    expect(coverageNote(0.95)).toMatch(/95/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/precios/api_contract.test.ts`
Expected: FAIL — módulos `geo` y `present` inexistentes

- [ ] **Step 3: Write minimal implementation**

```ts
// classes/precios/geo.ts
const EARTH_KM = 6371;
const rad = (deg: number): number => (deg * Math.PI) / 180;

/** Distancia en kilómetros entre dos coordenadas. */
export function haversineKm(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_KM * Math.asin(Math.sqrt(h));
}
```

```ts
// classes/precios/present.ts
//
// La capa que decide QUÉ se muestra como "más barato", y vive acá y no en la
// página porque la regla tiene que valer también para quien consuma la API.
//
// Una fila `stale` o `suspect` se muestra, pero no encabeza. Si encabezara
// volveríamos a la pizarra congelada: el scraper anda, el origen se congeló, y
// ordenar por "más barato" sube la fila más vieja al titular.
import { MIN_COVERAGE } from "./basket";
import { rankable } from "./plausibility";
import type { PrecioFreshness } from "./staleness";

export interface PresentableRow {
  storeId: number;
  storeName: string;
  price: number;
  sourceDay: string;
  freshness: PrecioFreshness;
  verdict: "ok" | "suspect" | "reject";
}

/** La fila más barata que puede encabezar, o null si no queda ninguna. */
export function cheapestRankable<T extends PresentableRow>(rows: T[]): T | null {
  const eligible = rows.filter((row) => rankable(row));
  if (!eligible.length) return null;
  return eligible.reduce((best, row) => (row.price < best.price ? row : best));
}

export function coverageNote(coverage: number): string {
  const pct = Math.round(coverage * 100);
  if (coverage < MIN_COVERAGE) {
    return `muestra insuficiente: el local declara ${pct} % de la canasta, y por debajo de ${Math.round(
      MIN_COVERAGE * 100
    )} % un total no es comparable`;
  }
  return `${pct} % de la canasta declarada por el local`;
}
```

En `classes/precios/store.ts`, añadir las lecturas (mismo patrón `aggregate`
que `loadCurrentState`):

```ts
export async function loadArticlesWithStats(day: string): Promise<any[]> {
  return dailyDb().aggregate([
    { $match: { day, scope: "nacional" } },
    { $lookup: { from: "precios_articles", localField: "articleId", foreignField: "id", as: "article" } },
    { $unwind: "$article" },
    { $project: { _id: 0, articleId: 1, n: 1, min: 1, p10: 1, p50: 1, p90: 1, max: 1, name: "$article.name", group: "$article.group", unitRaw: "$article.unitRaw", qty: "$article.qty", unit: "$article.unit", image: "$article.image" } },
    { $sort: { name: 1 } },
  ]);
}

export async function loadArticleDetail(articleId: number, day: string): Promise<any> {
  const [rows, stats, series] = await Promise.all([
    currentDb().aggregate([
      { $match: { articleId } },
      { $lookup: { from: "precios_stores", localField: "storeId", foreignField: "id", as: "store" } },
      { $unwind: "$store" },
      { $project: { _id: 0, storeId: 1, price: 1, sourceDay: 1, freshness: 1, verdict: 1, storeName: "$store.name", chain: "$store.chain", department: "$store.department", address: "$store.address", lat: "$store.lat", lon: "$store.lon" } },
      { $sort: { price: 1 } },
    ]),
    dailyDb().aggregate([{ $match: { day, articleId, scope: "nacional" } }, { $limit: 1 }]),
    dailyDb().aggregate([{ $match: { articleId, scope: "nacional" } }, { $sort: { day: -1 } }, { $limit: 180 }, { $project: { _id: 0, day: 1, min: 1, p50: 1, max: 1, n: 1 } }]),
  ]);
  return { rows, stats: stats[0] || null, series: series.reverse() };
}

export async function loadStoresNear(lat: number, lon: number, km: number): Promise<any[]> {
  const stores = await storesDb().aggregate([{ $match: { lat: { $ne: null }, lon: { $ne: null } } }]);
  const { haversineKm } = await import("./geo");
  return stores
    .map((store: any) => ({ ...store, km: haversineKm({ lat, lon }, { lat: store.lat, lon: store.lon }) }))
    .filter((store: any) => store.km <= km)
    .sort((a: any, b: any) => a.km - b.km);
}

export async function loadChanges(filter: { articleId?: number; storeId?: number; day?: string; limit: number }): Promise<any[]> {
  const match: Record<string, unknown> = {};
  if (filter.articleId !== undefined) match.articleId = filter.articleId;
  if (filter.storeId !== undefined) match.storeId = filter.storeId;
  if (filter.day) match.day = filter.day;
  return changesDb().aggregate([{ $match: match }, { $sort: { observedAt: -1 } }, { $limit: filter.limit }, { $project: { _id: 0 } }]);
}
```

En `index.ts`, junto a las rutas de `regional`:

```ts
  /**
   * @openapi
   * /precios/article/{id}:
   *   get:
   *     tags: [Precios]
   *     summary: Precio de un artículo local por local, con su antigüedad
   *     description: |
   *       Los precios son los del SIPC (MEF / Área Defensa del Consumidor), la
   *       fuente oficial. Cada fila trae la FECHA que declara el origen: 94 % de
   *       las filas son del día o del anterior, pero hay góndolas que no se
   *       actualizan desde hace semanas, así que `freshness` viene en cada fila y
   *       `cheapest` NUNCA es una fila `stale` ni una marcada `suspect`.
   *     responses:
   *       200:
   *         description: Detalle del artículo
   */
  server.getJson("precios/article/:id", async (req: Request): Promise<any> => {
    const articleId = Number(req.params.id);
    if (!Number.isInteger(articleId) || articleId < 1) {
      throw new ValidationError(
        "Invalid id parameter",
        createValidationError("id", String(req.params.id), [], "Use an article id from /precios/articles")
      );
    }
    const day = new Date().toISOString().slice(0, 10);
    return redisCache.getOrSet(
      `precios:article:${articleId}:${day}`,
      async () => {
        const detail = await loadArticleDetail(articleId, day);
        return { ...detail, cheapest: cheapestRankable(detail.rows) };
      },
      900
    );
  });
```

Las otras cuatro rutas siguen la misma forma: validar parámetros con
`ValidationError` / `createValidationError`, envolver en
`redisCache.getOrSet(clave, fn, ttl)` con TTL 900 s (el job corre una vez al
día, así que quince minutos no atrasa nada), y devolver `{}` de la forma
correcta cuando no hay datos en vez de un 500.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/precios/api_contract.test.ts`
Expected: PASS

Run: `npx vitest run tests/no_scheduler_in_api.test.ts`
Expected: PASS (las rutas nuevas no meten ningún `setInterval` en el proceso de
la API, que es cluster ×2)

Run: `npx tsc -p tsconfig.production.json --noEmit`

- [ ] **Step 5: Commit**

```bash
git add classes/precios/geo.ts classes/precios/present.ts classes/precios/store.ts index.ts tests/precios/api_contract.test.ts
git commit -m "feat(precios): cinco endpoints publicos donde el mas barato nunca es una gondola vieja"
```

---

### Task 11: Hub y familia de 215 páginas

**Files:**
- Create: `app/server/api/precios.get.ts`
- Create: `app/server/api/precios/article.get.ts`
- Create: `app/utils/preciosCatalog.ts`
- Create: `app/utils/preciosMessages.ts`
- Create: `app/pages/precios-de-supermercado-uruguay.vue`
- Create: `app/pages/precio/[slug].vue`
- Modify: `app/utils/siteNav.ts` (entrada del hub)
- Modify: `app/server/api/__sitemap__/urls.get.ts` (familia `/precio/<slug>`)
- Modify: `app/i18n/locales/json/{es,en,pt}.json`
- Test: `app/tests/unit/precios.test.ts`

**Interfaces:**
- Consumes: los endpoints de Task 10 vía `useRuntimeConfig().apiBaseServer`.
- Produces:
  - `preciosSlug(name: string): string`
  - `preciosArticleFromSlug(slug: string, articles: PreciosArticleRow[]): PreciosArticleRow | null`
  - `preciosIndexable(article: { freshObservations: number }): boolean`
  - `PRECIOS_MIN_OBSERVATIONS = 30`
  - `preciosFreshnessLabel(freshness: string): string`

- [ ] **Step 1: Write the failing test**

```ts
// app/tests/unit/precios.test.ts
import { describe, expect, it } from 'vitest'
import {
  PRECIOS_MIN_OBSERVATIONS,
  preciosArticleFromSlug,
  preciosIndexable,
  preciosSlug,
} from '../../utils/preciosCatalog'

describe('preciosSlug', () => {
  it('hace una URL estable del nombre del articulo', () => {
    expect(preciosSlug('Aceite de girasol - Óptimo')).toBe('aceite-de-girasol-optimo')
    expect(preciosSlug('Papel higiénico hoja simple Higienol Sin Fin')).toBe(
      'papel-higienico-hoja-simple-higienol-sin-fin'
    )
    expect(preciosSlug('Té negro en saquitos La Virginia')).toBe('te-negro-en-saquitos-la-virginia')
  })

  it('no deja separadores colgando', () => {
    expect(preciosSlug('  Gaseosa Coca Cola.  ')).toBe('gaseosa-coca-cola')
  })
})

describe('preciosArticleFromSlug', () => {
  const articles = [
    { articleId: 1, name: 'Aceite de girasol - Óptimo', freshObservations: 670 },
    { articleId: 114, name: 'Nalga vacuna con  hueso', freshObservations: 28 },
  ]

  it('resuelve el slug al articulo', () => {
    expect(preciosArticleFromSlug('aceite-de-girasol-optimo', articles as any)?.articleId).toBe(1)
  })

  it('devuelve null para un slug que no existe', () => {
    expect(preciosArticleFromSlug('no-existe', articles as any)).toBeNull()
  })
})

describe('preciosIndexable', () => {
  it('un articulo con muestra chica no entra al indice', () => {
    // Medido: "Nalga vacuna con hueso" tiene 28 observaciones en todo el pais.
    expect(PRECIOS_MIN_OBSERVATIONS).toBe(30)
    expect(preciosIndexable({ freshObservations: 28 })).toBe(false)
  })

  it('un articulo con muestra amplia si', () => {
    expect(preciosIndexable({ freshObservations: 670 })).toBe(true)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd app && npx vitest run tests/unit/precios.test.ts`
Expected: FAIL — módulo inexistente

- [ ] **Step 3: Write minimal implementation**

```ts
// app/utils/preciosCatalog.ts
//
// Nombres cuidados a propósito: `app/utils/` es un namespace plano de
// auto-imports, así que todo lo de acá lleva prefijo `precios`.
export interface PreciosArticleRow {
  articleId: number
  name: string
  group?: string
  unitRaw?: string
  qty?: number | null
  unit?: string | null
  image?: string | null
  n?: number
  min?: number
  p50?: number
  max?: number
  freshObservations: number
}

/**
 * Mínimo de observaciones frescas para que la página del artículo entre al
 * índice. Con menos, la página existe (alguien puede llegar por un enlace) pero
 * no promete una comparación que la muestra no sostiene: "Nalga vacuna con
 * hueso" tiene 28 filas en todo el país contra las 670 del aceite.
 */
export const PRECIOS_MIN_OBSERVATIONS = 30

export function preciosSlug(name: string): string {
  return String(name || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function preciosArticleFromSlug(
  slug: string,
  articles: PreciosArticleRow[]
): PreciosArticleRow | null {
  const target = preciosSlug(slug)
  return articles.find((article) => preciosSlug(article.name) === target) ?? null
}

export function preciosIndexable(article: { freshObservations: number }): boolean {
  return (article?.freshObservations ?? 0) >= PRECIOS_MIN_OBSERVATIONS
}
```

```ts
// app/server/api/precios.get.ts
// El catálogo con las estadísticas del día. Ruta de lectura del sitio, no una
// segunda API: quien integre debe llamar a la API pública.
export default defineCachedEventHandler(
  async () => {
    const base = useRuntimeConfig().apiBaseServer
    const payload = await $fetch<{ articles: unknown[] }>(`${base}/precios/articles`, {
      timeout: 9000,
    }).catch(() => null)
    // Un catálogo vacío de la forma correcta le gana a un 500: la página
    // renderiza su estado "sin datos" en vez de no renderizar.
    return payload ?? { articles: [] }
  },
  { maxAge: 60 * 30, staleMaxAge: 60 * 60 * 6, name: 'precios', getKey: () => 'all' }
)
```

Páginas: el hub `app/pages/precios-de-supermercado-uruguay.vue` y
`app/pages/precio/[slug].vue`, siguiendo los patrones ya establecidos en el
repo:

- tablas anchas con `class="cu-mobile-cards"` y `data-label` por `<td>`;
- `<FaqSection>` (no `FaqBlock`) para que el FAQ tome el ancho de la página;
- nada de `|` en los títulos i18n (separador de plurales de vue-i18n);
- `AdSlot` sólo donde `app/utils/ads.ts` lo declare para estas rutas;
- en `/precio/[slug]`, `useSeoMeta({ robots: 'noindex, follow' })` cuando
  `preciosIndexable()` sea falso;
- el bloque "dónde está más barato" consume `cheapest` de la API, que ya excluye
  `stale` y `suspect`; la tabla completa muestra todas las filas con su
  antigüedad y su etiqueta.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd app && npx vitest run tests/unit/precios.test.ts`
Expected: PASS

Run: `cd app && npm run lint`
Expected: sin errores (`npm run typecheck` está roto: vue-tsc crashea)

Run: `cd app && npx vitest run`
Expected: la suite entera del app en verde

- [ ] **Step 5: Commit**

```bash
git add app/server/api/precios.get.ts app/server/api/precios/ app/utils/preciosCatalog.ts app/utils/preciosMessages.ts app/pages/precios-de-supermercado-uruguay.vue app/pages/precio/ app/utils/siteNav.ts app/server/api/__sitemap__/urls.get.ts app/i18n/locales/json app/tests/unit/precios.test.ts
git commit -m "feat(app): precios de supermercado y 215 paginas por articulo"
```

---

### Task 12: Documentación y registro de faltantes

**Files:**
- Create: `docs/app/PRECIOS.md`
- Modify: `AGENTS.md` (fila de `currency-precios` en la tabla de pm2)

**Interfaces:**
- Consumes: nada.
- Produces: nada.

- [ ] **Step 1: Escribir `docs/app/PRECIOS.md`**

Tiene que contener, con fechas y números medidos:

- que `precios.gub.uy` responde 301 a `www.precios.uy` y por lo tanto la fuente
  es oficial; que `robots.txt` sólo excluye `/wp-admin/`;
- la tabla de endpoints con sus mediciones (215 artículos, 749 locales,
  ~75.600 filas/día, 352 por artículo);
- **por qué `compararCanasta` está prohibido**, con el caso del artículo 114:
  28 observaciones reales, `$509.32 (*)` en 722 de 722 locales, 694 celdas sin
  fecha, 6 claves de columna duplicadas, y el aplastamiento de los totales a
  1,18× contra el 4,86× de los artículos sueltos;
- las tres guardas y qué eje mira cada una;
- los umbrales exactos (0,70 de cobertura, 5 locales, 30 observaciones, 2/14
  días, p10/3–p90×3, p10/2, 20 % de caída);
- la cobertura departamental real (423 Montevideo … 2 Artigas) y que por eso
  varios departamentos no tienen ranking;
- el **registro de faltantes** con candidato de fuente por línea: tarifas
  UTE / OSE / Antel, combustible ANCAP, cuota de mutualista/FONASA, planes de
  datos y fibra, boleto del interior, educación. Todos hardcodeados hoy en
  `app/utils/costOfLiving.ts`, y todos habilitantes de los subproyectos B y C.

- [ ] **Step 2: Añadir la fila a `AGENTS.md`**

En la tabla de jobs pm2, después de `currency-regional-history`:

```
| currency-precios | dist/sync_precios.js | 12 3 * * * | los precios oficiales del SIPC (MEF/Defensa del Consumidor) y el histórico que el Estado NO guarda: su API devuelve sólo el precio de hoy con su fecha, sin endpoint de serie. 215 × `compararArticulo` con bbox nacional, ~75.600 observaciones. **`compararCanasta` está prohibido y hay tripwire**: imputa —para el artículo 114 hay 28 observaciones reales y la matriz muestra el mismo `$509.32 (*)` en 722 de 722 locales, 694 celdas sin fecha—, así que rankear supermercados con su total ordena promedios, no góndolas. De ahí la regla general: se rechaza toda fila con `(*)` o sin `fecha`. Tres guardas por ejes distintos: banda por percentiles del **propio artículo** (el spread real va de 1,58× a 4,86×, un factor fijo no sirve), frescura por la `fecha` del origen —que acá viene regalada— con `stale` que **nunca gana un ranking de "más barato"**, y auditoría al cierre que ve lo que las otras no: el local cuya **góndola entera** está 3× corrida es error de unidad. La canasta está **pinneada y versionada**, se calcula sólo con observaciones reales, exige 70 % de cobertura por local y 5 locales por ámbito, y el índice se niega a publicar variación si cambió la versión o cayó la cobertura |
```

- [ ] **Step 3: Verificar la suite completa**

Run: `npx vitest run`
Run: `cd app && npx vitest run && npm run lint`
Expected: todo en verde

- [ ] **Step 4: Commit**

```bash
git add docs/app/PRECIOS.md AGENTS.md
git commit -m "docs(precios): pipeline SIPC, guardas y registro de faltantes"
```

---

## Self-Review

**Cobertura del spec:**

| sección del spec | tarea |
|---|---|
| La fuente medida, endpoints, bbox | 1, 2, 3 |
| `compararCanasta` prohibido | 1 (parseo), 3 (barrido), 9 (tripwire), 12 (docs) |
| Unibilidad por coordenada / nombre+dirección | 3 |
| Guarda 1 plausibilidad + `suspect` | 4 |
| Guarda 2 frescura | 4 |
| Guarda 3 auditoría de góndola | 5 |
| Canasta pinneada, cobertura, índice | 6 |
| 6 colecciones + ledger sin umbral | 7 |
| Job pm2 + cron + `OTHER_APPS` | 8 |
| 5 endpoints + Redis | 10 |
| Hub + 215 páginas + `noindex` | 11 |
| Registro de faltantes | 12 |

**Consistencia de tipos:** `PrecioScoredRow` se define en `audit.ts` (Task 5) y
lo consumen `basket.ts`, `store.ts` y `refresh.ts` con ese nombre. `rankable()`
se define en `plausibility.ts` y se usa en `basket.ts` y `present.ts`.
`percentile()` se define en `plausibility.ts` y se reusa en `refresh.ts`.
`PrecioFreshness` vive en `staleness.ts` y lo importan `plausibility.ts`,
`audit.ts` y `present.ts`.

**Supuesto verificado durante la revisión:** la primera versión de Task 7
escribía con un `updateOrCreate` que **no existe**. `classes/database.ts` expone
`bulkUpsert(operations)` (línea 308), `updateOne` y `aggregate`, que es lo que
usa `classes/regional/store.ts`. Corregido, y de paso corregida la decisión de
fondo: con ~75.600 escrituras por corrida, un upsert por documento eran 75.600
idas y vueltas; ahora van en tandas de 1.000.

**Riesgo abierto, dicho y no tapado:** las cantidades de `NEEDS` en Task 6 son
un supuesto declarado (hogar de dos personas, consumo mensual), no una
medición. El costo de la canasta es por lo tanto comparable **entre locales** —
que es para lo que se usa— pero no es la canasta del INE ni pretende serlo. La
página tiene que decirlo, y `docs/app/PRECIOS.md` lo registra.
