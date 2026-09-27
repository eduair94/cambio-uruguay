# API para empresas: claves, planes y uso medido — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que una empresa obtenga una clave de la API en un minuto desde el sitio, que la API la valide, cuente y limite por plan, y que el dueño vea quién usa la API (con y sin clave) y le cambie el plan a cualquiera.

**Architecture:** Módulos puros en `classes/apikeys/` (planes, ventanas, credencial, cliente, validación, agregación) con un middleware Express que se registra en `index.ts` antes de la primera ruta; Redis para contadores y medidor, Mongo del backend para claves (`api_keys`) y uso histórico (`api_usage_days`), un job pm2 horario que copia el medidor a Mongo. El app (Nuxt) es la ventanilla: rutas de servidor que llaman a `/admin/*` de la API con un token compartido, una pestaña `api` en `/cuenta` y la página pública `/empresas`.

**Tech Stack:** Express + TypeScript 4.9 (CommonJS), ioredis, mongoose, vitest (raíz); Nuxt 4 + Vuetify 4 + Pinia + vitest (app).

**Spec:** `docs/superpowers/specs/2026-09-27-api-empresas-claves-design.md`

## Global Constraints

- Worktree: `C:/Users/airau/Documents/GitHub/cambio-uruguay/.claude/worktrees/b2b-api-keys`, rama `feat/b2b-api-keys`. Nunca tocar el checkout principal (tiene trabajo sin commitear de otra sesión).
- Planes: `anonymous` 600/min y 20.000/día por IP; `free` 600/min y 20.000/día; `business` 3.000/min y 500.000/día; `internal` sin límite. Pisables por `API_LIMIT_<PLAN>_PER_MINUTE|PER_DAY`.
- Clave: `cu_` + 32 caracteres base62; se guarda sólo el SHA-256 y el prefijo de 8 caracteres. Se lee de `X-API-Key`, `Authorization: Bearer cu_…` o `?api_key=`.
- Tope de 3 claves activas por cuenta.
- El medidor nunca guarda IP. Las IP sólo viven en contadores de límite (TTL 3 días).
- Redis caído → el pedido pasa sin límite y sin medir. Mongo caído al validar una clave → pasa como anónimo. Nunca un 5xx por culpa del contador.
- Nada programado dentro de la API (`tests/no_scheduler_in_api.test.ts`): sin `setInterval` en nada que importe `index.ts`.
- Repo público: cero cifras de ingreso en código, comentarios, docs versionados y mensajes de commit.
- Gitleaks `generic-api-key`: en tests, ningún identificador llamado `key`/`token`/`secret`/`apiKey` con un valor de alta entropía; usar `"cu_" + "A".repeat(32)` y nombres como `sample`/`credential`.
- Estilo raíz: comillas dobles, punto y coma, comentarios de cabecera en español. Estilo app: comillas simples, sin punto y coma (prettier del app).
- Textos visibles en español rioplatense (vos), sin prometer cifras que no salen de una constante.
- Commits con la línea `Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>`.

## Review Focus

1. **Lectores del sitio detrás de un CGNAT** (cientos de navegadores con la misma IP pidiendo a `api.cambio-uruguay.com` con `Origin: https://cambio-uruguay.com`) no pueden recibir 429 → test "site no cuenta" en Task 4.
2. **Una clave inventada o con basura** (`X-API-Key: hola`) → 401 con mensaje, nunca 500 ni pasar como anónimo; y la misma clave inventada repetida no golpea Mongo cada vez → tests en Task 2 (formato) y Task 3 (caché negativa).
3. **Redis o Mongo caídos a mitad de día** → la API sigue respondiendo 200 → tests en Task 4 (Redis que tira, lookup que tira).
4. **Un usuario que intenta subirse de plan desde su propia cuenta** (PATCH con `ownerUid` + `plan: "business"`) → 400 → test en Task 5 y ruta del app que nunca reenvía `plan` (Task 7).
5. **Un User-Agent con `|` o saltos de línea** (rompería el campo `<cliente>|<ruta>` del medidor) → se sanea → test en Task 1; y el parseo usa el último `|` → test en Task 3.

---

## File Structure

Raíz (backend):
- `classes/apikeys/plans.ts` — tabla de planes, límites efectivos, JSON sin `Infinity`. Puro.
- `classes/apikeys/window.ts` — día de Montevideo, ventanas de minuto/día, decisión de límite. Puro.
- `classes/apikeys/normalize.ts` — ruta y User-Agent para el medidor. Puro.
- `classes/apikeys/credential.ts` — generar, validar forma, hashear y extraer la clave. Puro.
- `classes/apikeys/client.ts` — IP del cliente, IP internas, referencia del propio sitio. Puro.
- `classes/apikeys/validate.ts` — validación de alta y de cambios; `FIELD_LIMITS`, `MAX_ACTIVE_PER_OWNER`. Puro.
- `classes/apikeys/usage.ts` — filas del medidor, resúmenes por cliente, ranking de anónimos, `UsageDaysRepo`. Puro.
- `classes/apikeys/counters.ts` — operaciones Redis (contadores, medidor). Recibe el cliente inyectado.
- `classes/apikeys/store.ts` — store de claves sobre un modelo inyectado, con caché de 60 s.
- `classes/apikeys/mongo.ts` — esquemas y singletons de Mongo (`apiKeyStore()`, `usageDaysRepo()`).
- `classes/apikeys/middleware.ts` — middleware Express de clasificación, límite y medidor.
- `classes/apikeys/routes.ts` — `adminAuth`, rutas `/admin/*` y `GET /usage`.
- `classes/apikeys/persist.ts` — copia del medidor a Mongo (lo usa el job).
- `sync_api_usage.ts` — entrypoint del job `currency-api-usage`.
- Modificar: `classes/redis_cache.ts` (`getClient()`), `index.ts` (cableado + `/cache/flush` con token), `swagger/config.ts`, `ecosystem.config.js`, `scripts/deploy-backend.sh`, `.github/workflows/deploy.yml`, `AGENTS.md`.
- Docs: `docs/api/API_KEYS.md`.
- Tests: `tests/apikeys/*.test.ts` + `tests/apikeys/fakes.ts`.

App:
- `app/utils/apiKeys.ts` — espejo de planes y tipos, formato.
- `app/server/utils/apiAdmin.ts` — `apiAdminFetch` con token.
- `app/server/api/me/api-keys/index.get.ts`, `index.post.ts`, `[id].delete.ts`.
- `app/server/api/admin/api-clients.get.ts`, `app/server/api/admin/api-clients/[id].patch.ts`.
- `app/components/account/ApiKeysPanel.vue`, `app/components/account/ApiClientsAdminPanel.vue`.
- `app/pages/empresas.vue`.
- Modificar: `app/pages/cuenta/index.vue`, `app/nuxt.config.ts` (`apiAdminToken`), `app/utils/siteNav.ts`, `app/i18n/locales/json/{es,en,pt}.json`, `app/pages/desarrolladores.vue`, `app/pages/publicidad.vue`, `app/public/openapi.json`.
- Tests: `app/tests/unit/apiPlansParity.test.ts`, `app/tests/unit/apiKeysRoutes.test.ts`, `app/tests/unit/empresasPage.test.ts`.

---

### Task 1: Planes, ventanas y normalización (puros)

**Files:**
- Create: `classes/apikeys/plans.ts`, `classes/apikeys/window.ts`, `classes/apikeys/normalize.ts`
- Test: `tests/apikeys/plans.test.ts`, `tests/apikeys/window.test.ts`, `tests/apikeys/normalize.test.ts`

**Interfaces:**
- Produces:
  - `type PlanId = "anonymous" | "free" | "business" | "internal"`, `PLAN_IDS`, `interface Limits { perMinute: number; perDay: number }`, `DEFAULT_PLAN_LIMITS`, `isPlanId(v): v is PlanId`, `planLimits(plan, env?) : Limits`, `effectiveLimits(plan, custom?, env?) : Limits`, `limitsForJson(l) : { perMinute: number|null; perDay: number|null }`
  - `montevideoDay(now: Date): string`, `interface WindowKeys { minuteBucket: number; day: string; minuteResetsAt: Date; dayResetsAt: Date }`, `windowKeys(now: Date): WindowKeys`, `interface Decision { allowed; exceeded: "minute"|"day"|null; limit; remaining; resetAt: Date }`, `decide(counts: {minute; day}, limits: Limits, keys: WindowKeys): Decision`, `dayMinus(day: string, n: number): string`
  - `meterRoute(path: string, status: number): string`, `meterUserAgent(ua: string | string[] | undefined): string`

- [ ] **Step 1: Write the failing tests**

`tests/apikeys/plans.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { DEFAULT_PLAN_LIMITS, effectiveLimits, isPlanId, limitsForJson, planLimits } from "../../classes/apikeys/plans";

describe("planes de la API", () => {
  it("el techo anónimo queda por encima de lo medido (494 en un minuto, ~280 en un día)", () => {
    expect(DEFAULT_PLAN_LIMITS.anonymous.perMinute).toBeGreaterThan(494);
    expect(DEFAULT_PLAN_LIMITS.anonymous.perDay).toBeGreaterThan(280);
  });

  it("reconoce sólo los cuatro planes", () => {
    expect(isPlanId("business")).toBe(true);
    expect(isPlanId("gold")).toBe(false);
    expect(isPlanId(undefined)).toBe(false);
  });

  it("una variable de entorno pisa el límite, y una basura no", () => {
    const env = { API_LIMIT_FREE_PER_DAY: "50", API_LIMIT_FREE_PER_MINUTE: "cero" } as NodeJS.ProcessEnv;
    expect(planLimits("free", env)).toEqual({ perMinute: 600, perDay: 50 });
  });

  it("interno no tiene límite aunque el entorno diga otra cosa", () => {
    const env = { API_LIMIT_INTERNAL_PER_DAY: "5" } as NodeJS.ProcessEnv;
    expect(planLimits("internal", env).perDay).toBe(Infinity);
  });

  it("los límites propios de una clave pisan los del plan, uno por uno", () => {
    expect(effectiveLimits("business", { perDay: 1_000_000 }, {} as NodeJS.ProcessEnv)).toEqual({ perMinute: 3000, perDay: 1_000_000 });
    expect(effectiveLimits("free", { perMinute: -3 }, {} as NodeJS.ProcessEnv)).toEqual({ perMinute: 600, perDay: 20000 });
    expect(effectiveLimits("free", null, {} as NodeJS.ProcessEnv)).toEqual({ perMinute: 600, perDay: 20000 });
  });

  it("sin límite sale como null en JSON", () => {
    expect(limitsForJson({ perMinute: Infinity, perDay: 10 })).toEqual({ perMinute: null, perDay: 10 });
  });
});
```

`tests/apikeys/window.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { dayMinus, decide, montevideoDay, windowKeys } from "../../classes/apikeys/window";

const limits = { perMinute: 10, perDay: 100 };

describe("ventanas de límite", () => {
  it("el día es el de Montevideo, no el de UTC", () => {
    // 02:30 UTC del 28 = 23:30 del 27 en Montevideo (UTC-3).
    expect(montevideoDay(new Date("2026-09-28T02:30:00Z"))).toBe("2026-09-27");
    expect(montevideoDay(new Date("2026-09-28T03:00:00Z"))).toBe("2026-09-28");
  });

  it("el minuto se renueva en el minuto siguiente y el día a la medianoche de Montevideo", () => {
    const keys = windowKeys(new Date("2026-09-27T15:04:30Z"));
    expect(keys.minuteResetsAt.toISOString()).toBe("2026-09-27T15:05:00.000Z");
    expect(keys.dayResetsAt.toISOString()).toBe("2026-09-28T03:00:00.000Z");
    expect(keys.day).toBe("2026-09-27");
  });

  it("deja pasar hasta el límite inclusive y corta el siguiente", () => {
    const keys = windowKeys(new Date("2026-09-27T15:04:30Z"));
    expect(decide({ minute: 10, day: 10 }, limits, keys).allowed).toBe(true);
    const cut = decide({ minute: 11, day: 11 }, limits, keys);
    expect(cut).toMatchObject({ allowed: false, exceeded: "minute", limit: 10, remaining: 0 });
    expect(cut.resetAt).toEqual(keys.minuteResetsAt);
  });

  it("cuando corta el día, informa el día aunque el minuto también esté pasado", () => {
    const keys = windowKeys(new Date("2026-09-27T15:04:30Z"));
    const cut = decide({ minute: 50, day: 101 }, limits, keys);
    expect(cut).toMatchObject({ allowed: false, exceeded: "day", limit: 100 });
    expect(cut.resetAt).toEqual(keys.dayResetsAt);
  });

  it("las cabeceras hablan del límite más cercano", () => {
    const keys = windowKeys(new Date("2026-09-27T15:04:30Z"));
    expect(decide({ minute: 1, day: 98 }, limits, keys)).toMatchObject({ limit: 100, remaining: 2 });
    expect(decide({ minute: 9, day: 10 }, limits, keys)).toMatchObject({ limit: 10, remaining: 1 });
  });

  it("resta días en el calendario", () => {
    expect(dayMinus("2026-03-01", 1)).toBe("2026-02-28");
    expect(dayMinus("2026-09-27", 29)).toBe("2026-08-29");
  });
});
```

`tests/apikeys/normalize.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { meterRoute, meterUserAgent } from "../../classes/apikeys/normalize";

describe("ruta del medidor", () => {
  it("toma los dos primeros segmentos en minúsculas", () => {
    expect(meterRoute("/exchange/La_Favorita/USD", 200)).toBe("/exchange/la_favorita");
    expect(meterRoute("/", 200)).toBe("/");
    expect(meterRoute("/regional?x=1", 200)).toBe("/regional");
  });

  it("colapsa dígitos para que una fecha no abra una fila por día", () => {
    expect(meterRoute("/evolution/2026-09-01", 200)).toBe("/evolution/0-0-0");
  });

  it("un 404 y un 429 no inflan la tabla con rutas de escáneres", () => {
    expect(meterRoute("/.env", 404)).toBe("(no-encontrada)");
    expect(meterRoute("/exchange/brou", 429)).toBe("(limitada)");
  });

  it("nunca deja pasar el separador del campo ni espacios", () => {
    expect(meterRoute("/a|b/c d", 200)).toBe("/a_b/c_d");
    expect(meterRoute("/%E0%A4%A", 200)).toBe("/%e0%a0%a");
  });

  it("recorta a 60 caracteres", () => {
    expect(meterRoute(`/${"x".repeat(200)}`, 200).length).toBe(60);
  });
});

describe("User-Agent del medidor", () => {
  it("sanea el separador y los saltos de línea y recorta a 120", () => {
    expect(meterUserAgent("Panel|v1\r\nX")).toBe("Panel v1  X");
    expect(meterUserAgent("a".repeat(300)).length).toBe(120);
  });

  it("nombra la ausencia en vez de dejar un campo vacío", () => {
    expect(meterUserAgent(undefined)).toBe("(sin user-agent)");
    expect(meterUserAgent("   ")).toBe("(sin user-agent)");
    expect(meterUserAgent(["Uno", "Dos"])).toBe("Uno");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/apikeys/plans.test.ts tests/apikeys/window.test.ts tests/apikeys/normalize.test.ts`
Expected: FAIL — `Failed to resolve import "../../classes/apikeys/plans"` (and the other two).

- [ ] **Step 3: Implement `classes/apikeys/plans.ts`**

```ts
// Planes de la API pública y sus techos. Puro: sin Express, sin Redis, sin Mongo.
//
// Los números salen de lo medido en Cloudflare (24 h al 27/9/2026): el cliente anónimo que más pide
// en un día hace ~280 pedidos y la ráfaga más alta fue de 494 en un minuto. El techo anónimo queda
// por encima de las dos cosas: hoy es anti-abuso, no un muro. Una clave gratuita tiene la misma
// cuota; lo que gana es identidad, medición y el camino a un plan pago. Diseño:
// docs/superpowers/specs/2026-09-27-api-empresas-claves-design.md.
//
// app/utils/apiKeys.ts copia DEFAULT_PLAN_LIMITS para mostrarlos en /empresas, y
// app/tests/unit/apiPlansParity.test.ts es lo que mantiene las dos copias iguales.

export type PlanId = "anonymous" | "free" | "business" | "internal";

export const PLAN_IDS: readonly PlanId[] = ["anonymous", "free", "business", "internal"];

export interface Limits {
  perMinute: number;
  perDay: number;
}

export const DEFAULT_PLAN_LIMITS: Readonly<Record<PlanId, Readonly<Limits>>> = Object.freeze({
  anonymous: Object.freeze({ perMinute: 600, perDay: 20_000 }),
  free: Object.freeze({ perMinute: 600, perDay: 20_000 }),
  business: Object.freeze({ perMinute: 3_000, perDay: 500_000 }),
  internal: Object.freeze({ perMinute: Infinity, perDay: Infinity }),
});

export function isPlanId(value: unknown): value is PlanId {
  return typeof value === "string" && (PLAN_IDS as readonly string[]).includes(value);
}

function positiveInt(raw: unknown): number | null {
  const n = typeof raw === "number" ? raw : Number(String(raw ?? "").trim());
  return Number.isInteger(n) && n > 0 ? n : null;
}

/** Límites de un plan; `API_LIMIT_<PLAN>_PER_MINUTE|PER_DAY` los pisan sin desplegar código. */
export function planLimits(plan: PlanId, env: NodeJS.ProcessEnv = process.env): Limits {
  const base = DEFAULT_PLAN_LIMITS[plan];
  if (plan === "internal") return { ...base };
  const prefix = `API_LIMIT_${plan.toUpperCase()}`;
  return {
    perMinute: positiveInt(env[`${prefix}_PER_MINUTE`]) ?? base.perMinute,
    perDay: positiveInt(env[`${prefix}_PER_DAY`]) ?? base.perDay,
  };
}

/** Los límites propios de una clave (un acuerdo a medida) pisan los del plan, uno por uno. */
export function effectiveLimits(
  plan: PlanId,
  custom?: Partial<Limits> | null,
  env: NodeJS.ProcessEnv = process.env
): Limits {
  const base = planLimits(plan, env);
  if (plan === "internal" || !custom) return base;
  return {
    perMinute: positiveInt(custom.perMinute) ?? base.perMinute,
    perDay: positiveInt(custom.perDay) ?? base.perDay,
  };
}

/** `Infinity` no existe en JSON: sale como `null`, que se lee "sin límite". */
export function limitsForJson(limits: Limits): { perMinute: number | null; perDay: number | null } {
  return {
    perMinute: Number.isFinite(limits.perMinute) ? limits.perMinute : null,
    perDay: Number.isFinite(limits.perDay) ? limits.perDay : null,
  };
}
```

- [ ] **Step 4: Implement `classes/apikeys/window.ts`**

```ts
// Ventanas fijas de minuto y de día para el límite de la API, y la decisión de cortar o no.
// Puro: los contadores los trae counters.ts. El día es el de Montevideo porque es el día que
// entiende el cliente ("hoy") y el que usa el resto del sitio.
import moment from "moment-timezone";
import type { Limits } from "./plans";

const ZONE = "America/Montevideo";

export interface WindowKeys {
  /** Minutos desde el epoch: el sujeto del contador de minuto. */
  minuteBucket: number;
  /** YYYY-MM-DD en Montevideo. */
  day: string;
  minuteResetsAt: Date;
  dayResetsAt: Date;
}

export interface Decision {
  allowed: boolean;
  exceeded: "minute" | "day" | null;
  limit: number;
  remaining: number;
  resetAt: Date;
}

export function montevideoDay(now: Date): string {
  return moment.tz(now, ZONE).format("YYYY-MM-DD");
}

export function windowKeys(now: Date): WindowKeys {
  const minuteBucket = Math.floor(now.getTime() / 60_000);
  const local = moment.tz(now, ZONE);
  return {
    minuteBucket,
    day: local.format("YYYY-MM-DD"),
    minuteResetsAt: new Date((minuteBucket + 1) * 60_000),
    dayResetsAt: local.clone().startOf("day").add(1, "day").toDate(),
  };
}

/**
 * `counts` ya incluye el pedido actual (es lo que devuelve `INCR`). Si corta, informa la ventana
 * que cortó (el día manda sobre el minuto: es la espera más larga). Si no corta, las cabeceras
 * hablan de la ventana a la que le queda menos.
 */
export function decide(counts: { minute: number; day: number }, limits: Limits, keys: WindowKeys): Decision {
  const minuteLeft = limits.perMinute - counts.minute;
  const dayLeft = limits.perDay - counts.day;
  const exceeded: Decision["exceeded"] = dayLeft < 0 ? "day" : minuteLeft < 0 ? "minute" : null;
  const window = exceeded ?? (dayLeft <= minuteLeft ? "day" : "minute");
  return {
    allowed: exceeded === null,
    exceeded,
    limit: window === "day" ? limits.perDay : limits.perMinute,
    remaining: Math.max(0, window === "day" ? dayLeft : minuteLeft),
    resetAt: window === "day" ? keys.dayResetsAt : keys.minuteResetsAt,
  };
}

/** Resta días a un YYYY-MM-DD (aritmética de calendario, sin zona). */
export function dayMinus(day: string, n: number): string {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d - n)).toISOString().slice(0, 10);
}
```

- [ ] **Step 5: Implement `classes/apikeys/normalize.ts`**

```ts
// Cómo se anota un pedido en el medidor de uso: qué ruta y qué programa. Puro.
//
// El campo del hash de Redis es `<cliente>|<ruta>` y se parte por el ÚLTIMO `|`, así que ninguna
// de las dos mitades puede traer uno: se reemplaza. Un 404 se anota como una sola fila porque los
// escáneres que piden `/.env` o `/wp-admin` abrirían una fila por intento; un 429 también, para
// que el uso de un cliente no se confunda con lo que se le negó.
const MAX_ROUTE = 60;
const MAX_UA = 120;

export function meterRoute(path: string, status: number): string {
  if (status === 404) return "(no-encontrada)";
  if (status === 429) return "(limitada)";
  const clean = String(path || "/").split("?")[0];
  const segments = clean
    .split("/")
    .filter(Boolean)
    .slice(0, 2)
    .map((segment) => {
      let value = segment;
      try {
        value = decodeURIComponent(segment);
      } catch {
        // Un `%` suelto no es un error del cliente que valga la pena anotar: queda como vino.
      }
      return value.toLowerCase().replace(/\d+/g, "0").replace(/[|\s]/g, "_");
    });
  return `/${segments.join("/")}`.slice(0, MAX_ROUTE);
}

export function meterUserAgent(ua: string | string[] | undefined): string {
  const raw = Array.isArray(ua) ? ua[0] : ua;
  const clean = String(raw ?? "")
    .replace(/[|\r\n]/g, " ")
    .trim();
  return clean ? clean.slice(0, MAX_UA) : "(sin user-agent)";
}
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npx vitest run tests/apikeys/plans.test.ts tests/apikeys/window.test.ts tests/apikeys/normalize.test.ts`
Expected: PASS (17 tests). Note: `"Panel|v1\r\nX"` → `|`, `\r`, `\n` become three spaces → after trim `"Panel v1  X"`? `"Panel" + " " + "v1" + " " + " " + "X"` = `"Panel v1  X"` (two spaces between v1 and X). If the assertion text differs by spacing, fix the TEST expectation to the exact output, not the code.

- [ ] **Step 7: Commit**

```bash
git add classes/apikeys/plans.ts classes/apikeys/window.ts classes/apikeys/normalize.ts tests/apikeys/plans.test.ts tests/apikeys/window.test.ts tests/apikeys/normalize.test.ts
git commit -m "feat(apikeys): planes, ventanas de límite y normalización del medidor

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Credencial, cliente y validación (puros)

**Files:**
- Create: `classes/apikeys/credential.ts`, `classes/apikeys/client.ts`, `classes/apikeys/validate.ts`
- Test: `tests/apikeys/credential.test.ts`, `tests/apikeys/client.test.ts`, `tests/apikeys/validate.test.ts`

**Interfaces:**
- Consumes: `isPlanId`, `PlanId`, `Limits` (Task 1).
- Produces:
  - `CREDENTIAL_PREFIX`, `generateCredential(random?: (n: number) => Buffer): string`, `isWellFormed(raw: string): boolean`, `hashCredential(raw: string): string`, `displayPrefix(raw: string): string`, `type Extracted = { kind: "none" } | { kind: "malformed" } | { kind: "present"; value: string }`, `extractCredential(headers, query): Extracted`, `type HeaderBag = Record<string, string | string[] | undefined>`, `firstHeader(v: unknown): string | undefined`
  - `normalizeIp(ip?: string): string`, `clientIp(headers: HeaderBag, reqIp?: string): string`, `internalIps(env?): Set<string>`, `isSiteReferrer(origin?: string, referer?: string): boolean`
  - `FIELD_LIMITS`, `MAX_ACTIVE_PER_OWNER = 3`, `interface NewKeyInput { ownerUid: string; ownerEmail: string | null; label: string; company: string; useCase: string; website: string | null }`, `interface KeyPatch { plan?: PlanId; limits?: Partial<Limits> | null; status?: "active" | "revoked"; notes?: string | null; label?: string }`, `type Result<T> = { ok: true; value: T } | { ok: false; error: string }`, `validateNewKey(body: unknown): Result<NewKeyInput>`, `validatePatch(body: unknown, scoped: boolean): Result<KeyPatch>`

- [ ] **Step 1: Write the failing tests**

`tests/apikeys/credential.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import {
  displayPrefix,
  extractCredential,
  generateCredential,
  hashCredential,
  isWellFormed,
} from "../../classes/apikeys/credential";

// Valor de baja entropía a propósito: gitleaks marca los identificadores tipo "key" con valores aleatorios.
const sample = "cu_" + "A".repeat(32);

describe("credencial", () => {
  it("genera cu_ + 32 caracteres base62", () => {
    const made = generateCredential();
    expect(isWellFormed(made)).toBe(true);
    expect(made).toHaveLength(35);
    expect(generateCredential()).not.toBe(made);
  });

  it("descarta los bytes que sesgarían el alfabeto", () => {
    // 248..255 se descartan; 0 → "A". Con una fuente que sólo da 255 y 0 alternados, todo es "A".
    const fake = (n: number) => Buffer.from(Array.from({ length: n }, (_, i) => (i % 2 ? 0 : 255)));
    expect(generateCredential(fake)).toBe(sample);
  });

  it("guarda un hash estable y muestra 8 caracteres", () => {
    expect(hashCredential(sample)).toMatch(/^[a-f0-9]{64}$/);
    expect(hashCredential(sample)).toBe(hashCredential(sample));
    expect(displayPrefix(sample)).toBe("cu_AAAAA");
  });

  it("lee la clave de X-API-Key, de Bearer o de ?api_key=", () => {
    expect(extractCredential({ "x-api-key": sample }, {})).toEqual({ kind: "present", value: sample });
    expect(extractCredential({ authorization: `Bearer ${sample}` }, {})).toEqual({ kind: "present", value: sample });
    expect(extractCredential({}, { api_key: sample })).toEqual({ kind: "present", value: sample });
  });

  it("sin clave es anónimo, y un Authorization ajeno no cuenta como clave", () => {
    expect(extractCredential({}, {})).toEqual({ kind: "none" });
    expect(extractCredential({ authorization: "Basic dXNlcjpwYXNz" }, {})).toEqual({ kind: "none" });
  });

  it("una clave con otra forma es inválida, no anónima", () => {
    expect(extractCredential({ "x-api-key": "hola" }, {})).toEqual({ kind: "malformed" });
    expect(extractCredential({}, { api_key: "" })).toEqual({ kind: "malformed" });
    expect(extractCredential({ authorization: "Bearer cu_corta" }, {})).toEqual({ kind: "malformed" });
  });
});
```

`tests/apikeys/client.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { clientIp, internalIps, isSiteReferrer, normalizeIp } from "../../classes/apikeys/client";

describe("IP del cliente", () => {
  it("prefiere la que manda Cloudflare y saca el prefijo IPv4-en-IPv6", () => {
    expect(clientIp({ "cf-connecting-ip": "200.40.1.2" }, "::ffff:127.0.0.1")).toBe("200.40.1.2");
    expect(clientIp({}, "::ffff:104.234.204.107")).toBe("104.234.204.107");
    expect(normalizeIp(undefined)).toBe("unknown");
  });

  it("internas: loopback siempre, más las de API_INTERNAL_IPS", () => {
    const set = internalIps({ API_INTERNAL_IPS: "104.234.204.107, 10.0.0.2" } as NodeJS.ProcessEnv);
    expect([...set].sort()).toEqual(["10.0.0.2", "104.234.204.107", "127.0.0.1", "::1"]);
    expect(internalIps({} as NodeJS.ProcessEnv).has("127.0.0.1")).toBe(true);
  });
});

describe("pedido del propio sitio", () => {
  it("reconoce el dominio y sus subdominios por Origin o Referer", () => {
    expect(isSiteReferrer("https://cambio-uruguay.com")).toBe(true);
    expect(isSiteReferrer(undefined, "https://www.cambio-uruguay.com/historico/brou")).toBe(true);
  });

  it("no se deja engañar por un dominio que sólo contiene el nombre", () => {
    expect(isSiteReferrer("https://cambio-uruguay.com.evil.test")).toBe(false);
    expect(isSiteReferrer("https://notcambio-uruguay.com")).toBe(false);
    expect(isSiteReferrer("basura", undefined)).toBe(false);
    expect(isSiteReferrer(undefined, undefined)).toBe(false);
  });
});
```

`tests/apikeys/validate.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { validateNewKey, validatePatch } from "../../classes/apikeys/validate";

const good = {
  ownerUid: "uid-1",
  ownerEmail: "ana@empresa.uy",
  label: "Pantalla del local",
  company: "Cambio Ejemplo",
  useCase: "Mostrar la pizarra en una pantalla del local",
  website: "https://ejemplo.uy",
};

describe("alta de clave", () => {
  it("acepta y recorta un alta completa", () => {
    const r = validateNewKey({ ...good, label: "  Pantalla del local  " });
    expect(r).toEqual({ ok: true, value: { ...good } });
  });

  it("el sitio web es opcional, pero si viene tiene que ser http(s)", () => {
    expect(validateNewKey({ ...good, website: "" })).toMatchObject({ ok: true, value: { website: null } });
    expect(validateNewKey({ ...good, website: "javascript:alert(1)" })).toMatchObject({ ok: false });
  });

  it("rechaza con un mensaje en español lo que falta o sobra", () => {
    expect(validateNewKey({ ...good, useCase: "api" })).toEqual({
      ok: false,
      error: "Contanos para qué la vas a usar (entre 10 y 500 caracteres).",
    });
    expect(validateNewKey({ ...good, ownerUid: "" })).toMatchObject({ ok: false });
    expect(validateNewKey(null)).toMatchObject({ ok: false });
  });

  it("saca caracteres de control", () => {
    expect(validateNewKey({ ...good, company: "Cambio\u0000 Ejemplo" })).toMatchObject({
      ok: true,
      value: { company: "Cambio Ejemplo" },
    });
  });
});

describe("cambios a una clave", () => {
  it("el dueño de la clave sólo puede revocarla o renombrarla", () => {
    expect(validatePatch({ status: "revoked" }, true)).toEqual({ ok: true, value: { status: "revoked" } });
    expect(validatePatch({ label: "Planilla" }, true)).toEqual({ ok: true, value: { label: "Planilla" } });
    expect(validatePatch({ plan: "business" }, true)).toMatchObject({ ok: false });
    expect(validatePatch({ status: "active" }, true)).toMatchObject({ ok: false });
  });

  it("el administrador cambia plan, límites, estado y notas", () => {
    expect(validatePatch({ plan: "business", notes: "Factura mensual", limits: { perDay: 800000 } }, false)).toEqual({
      ok: true,
      value: { plan: "business", notes: "Factura mensual", limits: { perDay: 800000 } },
    });
    expect(validatePatch({ limits: null, notes: "" }, false)).toEqual({ ok: true, value: { limits: null, notes: null } });
  });

  it("nadie asigna el plan anónimo ni un plan que no existe, ni límites basura", () => {
    expect(validatePatch({ plan: "anonymous" }, false)).toMatchObject({ ok: false });
    expect(validatePatch({ plan: "gold" }, false)).toMatchObject({ ok: false });
    expect(validatePatch({ limits: { perDay: -1 } }, false)).toMatchObject({ ok: false });
  });

  it("un cambio vacío no es un cambio", () => {
    expect(validatePatch({}, false)).toMatchObject({ ok: false });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/apikeys/credential.test.ts tests/apikeys/client.test.ts tests/apikeys/validate.test.ts`
Expected: FAIL — cannot resolve the three modules.

- [ ] **Step 3: Implement `classes/apikeys/credential.ts`**

```ts
// La clave de la API: cómo se genera, cómo se guarda y de dónde se lee. Puro.
//
// Se guarda SÓLO el SHA-256: si la base se filtra, no se filtran claves que funcionen. El prefijo
// de 8 caracteres es lo que se le muestra al dueño para reconocerla. Se lee de tres lados porque
// hay clientes que no pueden poner cabeceras (una planilla, un widget): `?api_key=` existe para ellos.
import { createHash, randomBytes } from "crypto";

export const CREDENTIAL_PREFIX = "cu_";
const BODY_LENGTH = 32;
const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
const SHAPE = /^cu_[A-Za-z0-9]{32}$/;

export type HeaderBag = Record<string, string | string[] | undefined>;

export type Extracted = { kind: "none" } | { kind: "malformed" } | { kind: "present"; value: string };

export function generateCredential(random: (n: number) => Buffer = randomBytes): string {
  let body = "";
  while (body.length < BODY_LENGTH) {
    for (const byte of random(48)) {
      // 248 = 62 × 4: descartar lo que sobra evita que las primeras letras salgan más seguido.
      if (byte < 248) body += ALPHABET[byte % 62];
      if (body.length === BODY_LENGTH) break;
    }
  }
  return CREDENTIAL_PREFIX + body;
}

export function isWellFormed(raw: string): boolean {
  return SHAPE.test(raw);
}

export function hashCredential(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

export function displayPrefix(raw: string): string {
  return raw.slice(0, 8);
}

export function firstHeader(value: unknown): string | undefined {
  if (Array.isArray(value)) return value.length ? String(value[0]) : undefined;
  return value === undefined || value === null ? undefined : String(value);
}

/**
 * Orden: `X-API-Key`, `Authorization: Bearer cu_…`, `?api_key=`. Un `Authorization` que no es de
 * los nuestros (Basic, un JWT de otro servicio) se ignora: no es una clave mal escrita.
 */
export function extractCredential(headers: HeaderBag, query: Record<string, unknown>): Extracted {
  const candidates: string[] = [];
  const header = firstHeader(headers["x-api-key"]);
  if (header !== undefined) candidates.push(header.trim());
  const auth = firstHeader(headers["authorization"]);
  if (auth && /^bearer\s+cu_/i.test(auth.trim())) candidates.push(auth.trim().replace(/^bearer\s+/i, ""));
  const fromQuery = firstHeader(query["api_key"]);
  if (fromQuery !== undefined) candidates.push(fromQuery.trim());
  if (!candidates.length) return { kind: "none" };
  const value = candidates[0];
  return isWellFormed(value) ? { kind: "present", value } : { kind: "malformed" };
}
```

- [ ] **Step 4: Implement `classes/apikeys/client.ts`**

```ts
// Quién hace el pedido, en lo que depende de la red: su IP, si es de adentro del VPS y si es el
// navegador de un lector del propio sitio. Puro.
//
// La IP sale de `CF-Connecting-IP` si viene. Quien le pegue directo al origen puede falsificarla (o
// el Referer) y saltarse el techo anónimo: está aceptado en el diseño, porque antes no había techo
// alguno y lo que se vende —el plan de una clave— no depende de la IP.
import { firstHeader, type HeaderBag } from "./credential";

const LOOPBACK = ["127.0.0.1", "::1"];
const SITE_HOST = "cambio-uruguay.com";

export function normalizeIp(ip?: string): string {
  const raw = String(ip ?? "").trim();
  if (!raw) return "unknown";
  return raw.startsWith("::ffff:") ? raw.slice(7) : raw;
}

export function clientIp(headers: HeaderBag, reqIp?: string): string {
  const cf = firstHeader(headers["cf-connecting-ip"]);
  return normalizeIp(cf && cf.trim() ? cf : reqIp);
}

/** Loopback siempre (el SSR del sitio, el MCP y los bots viven en el VPS) más `API_INTERNAL_IPS`. */
export function internalIps(env: NodeJS.ProcessEnv = process.env): Set<string> {
  const extra = String(env.API_INTERNAL_IPS || "")
    .split(/[\s,;]+/)
    .map((ip) => normalizeIp(ip))
    .filter((ip) => ip !== "unknown");
  return new Set([...LOOPBACK, ...extra]);
}

/**
 * El navegador de un lector del sitio: detrás de un CGNAT comparten IP cientos de lectores, así que
 * no pueden contar contra el techo anónimo de esa IP. Se compara el HOST, nunca un "contiene".
 */
export function isSiteReferrer(origin?: string, referer?: string): boolean {
  for (const raw of [origin, referer]) {
    if (!raw) continue;
    try {
      const host = new URL(raw).hostname.toLowerCase();
      if (host === SITE_HOST || host.endsWith(`.${SITE_HOST}`)) return true;
    } catch {
      // Una cabecera que no es URL no prueba nada.
    }
  }
  return false;
}
```

- [ ] **Step 5: Implement `classes/apikeys/validate.ts`**

```ts
// Qué entra por las rutas de administración: un alta de clave y un cambio sobre una clave. Puro.
//
// `scoped` es el caso del dueño de la clave (el app manda su `ownerUid`): sólo puede revocarla o
// renombrarla. Cambiar de plan, de límites o reactivarla es del administrador. app/utils/apiKeys.ts
// copia FIELD_LIMITS y MAX_ACTIVE_PER_OWNER para el formulario; apiPlansParity.test.ts los ata.
import { isPlanId, type Limits, type PlanId } from "./plans";

export const MAX_ACTIVE_PER_OWNER = 3;

export const FIELD_LIMITS = Object.freeze({
  label: Object.freeze({ min: 1, max: 40 }),
  company: Object.freeze({ min: 2, max: 80 }),
  useCase: Object.freeze({ min: 10, max: 500 }),
  website: Object.freeze({ min: 0, max: 200 }),
  notes: Object.freeze({ min: 0, max: 500 }),
});

const MAX_CUSTOM_LIMIT = 10_000_000;

export interface NewKeyInput {
  ownerUid: string;
  ownerEmail: string | null;
  label: string;
  company: string;
  useCase: string;
  website: string | null;
}

export interface KeyPatch {
  plan?: PlanId;
  limits?: Partial<Limits> | null;
  status?: "active" | "revoked";
  notes?: string | null;
  label?: string;
}

export type Result<T> = { ok: true; value: T } | { ok: false; error: string };

function clean(value: unknown): string {
  // eslint-disable-next-line no-control-regex
  return typeof value === "string" ? value.replace(/[\u0000-\u001f\u007f]/g, "").trim() : "";
}

function bounded(value: unknown, min: number, max: number): string | null {
  const text = clean(value);
  return text.length >= min && text.length <= max ? text : null;
}

function website(value: unknown): string | null | false {
  const text = clean(value);
  if (!text) return null;
  if (text.length > FIELD_LIMITS.website.max) return false;
  try {
    const url = new URL(text);
    return url.protocol === "https:" || url.protocol === "http:" ? text : false;
  } catch {
    return false;
  }
}

export function validateNewKey(body: unknown): Result<NewKeyInput> {
  const b = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
  const ownerUid = bounded(b.ownerUid, 1, 128);
  if (!ownerUid) return { ok: false, error: "Falta la cuenta dueña de la clave." };
  const emailText = clean(b.ownerEmail);
  const ownerEmail = emailText && emailText.length <= 200 && emailText.includes("@") ? emailText : null;
  const label = bounded(b.label, FIELD_LIMITS.label.min, FIELD_LIMITS.label.max);
  if (!label) return { ok: false, error: "Poné un nombre para la clave (hasta 40 caracteres)." };
  const company = bounded(b.company, FIELD_LIMITS.company.min, FIELD_LIMITS.company.max);
  if (!company) return { ok: false, error: "Poné el nombre de la empresa o del proyecto (entre 2 y 80 caracteres)." };
  const useCase = bounded(b.useCase, FIELD_LIMITS.useCase.min, FIELD_LIMITS.useCase.max);
  if (!useCase) return { ok: false, error: "Contanos para qué la vas a usar (entre 10 y 500 caracteres)." };
  const site = website(b.website);
  if (site === false) return { ok: false, error: "El sitio web tiene que ser una dirección http o https." };
  return { ok: true, value: { ownerUid, ownerEmail, label, company, useCase, website: site } };
}

function customLimits(value: unknown): Partial<Limits> | null | false {
  if (value === null) return null;
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  const out: Partial<Limits> = {};
  for (const field of ["perMinute", "perDay"] as const) {
    if (v[field] === undefined || v[field] === null) continue;
    const n = Number(v[field]);
    if (!Number.isInteger(n) || n <= 0 || n > MAX_CUSTOM_LIMIT) return false;
    out[field] = n;
  }
  return Object.keys(out).length ? out : null;
}

export function validatePatch(body: unknown, scoped: boolean): Result<KeyPatch> {
  const b = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
  const patch: KeyPatch = {};

  if (b.label !== undefined) {
    const label = bounded(b.label, FIELD_LIMITS.label.min, FIELD_LIMITS.label.max);
    if (!label) return { ok: false, error: "El nombre de la clave va de 1 a 40 caracteres." };
    patch.label = label;
  }
  if (b.status !== undefined) {
    if (b.status !== "active" && b.status !== "revoked") return { ok: false, error: "Estado desconocido." };
    if (scoped && b.status !== "revoked") return { ok: false, error: "Sólo se puede revocar la clave o cambiarle el nombre." };
    patch.status = b.status;
  }

  const adminOnly = ["plan", "limits", "notes"].filter((field) => b[field] !== undefined);
  if (scoped && adminOnly.length) return { ok: false, error: "Sólo se puede revocar la clave o cambiarle el nombre." };

  if (b.plan !== undefined) {
    if (!isPlanId(b.plan) || b.plan === "anonymous") return { ok: false, error: "Plan desconocido." };
    patch.plan = b.plan;
  }
  if (b.limits !== undefined) {
    const limits = customLimits(b.limits);
    if (limits === false) return { ok: false, error: "Los límites propios tienen que ser enteros positivos." };
    patch.limits = limits;
  }
  if (b.notes !== undefined) {
    const notes = b.notes === null ? "" : clean(b.notes);
    if (notes.length > FIELD_LIMITS.notes.max) return { ok: false, error: "Las notas van hasta 500 caracteres." };
    patch.notes = notes || null;
  }

  if (!Object.keys(patch).length) return { ok: false, error: "No hay nada para cambiar." };
  return { ok: true, value: patch };
}
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npx vitest run tests/apikeys/credential.test.ts tests/apikeys/client.test.ts tests/apikeys/validate.test.ts`
Expected: PASS (21 tests).

- [ ] **Step 7: Commit**

```bash
git add classes/apikeys/credential.ts classes/apikeys/client.ts classes/apikeys/validate.ts tests/apikeys/credential.test.ts tests/apikeys/client.test.ts tests/apikeys/validate.test.ts
git commit -m "feat(apikeys): credencial, clasificación por red y validación de altas

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Redis, store de claves y agregación de uso

**Files:**
- Create: `classes/apikeys/counters.ts`, `classes/apikeys/store.ts`, `classes/apikeys/usage.ts`, `tests/apikeys/fakes.ts`
- Modify: `classes/redis_cache.ts` (add `getClient()` after `isEnabled()`)
- Test: `tests/apikeys/counters.test.ts`, `tests/apikeys/store.test.ts`, `tests/apikeys/usage.test.ts`

**Interfaces:**
- Consumes: `WindowKeys`, `dayMinus` (Task 1); `generateCredential`, `hashCredential`, `displayPrefix` (Task 2); `NewKeyInput`, `KeyPatch`, `MAX_ACTIVE_PER_OWNER` (Task 2); `PlanId`, `Limits`, `isPlanId` (Task 1).
- Produces:
  - `interface RedisLike`, `interface RedisMulti`, `minuteKey`, `dayKey`, `usageKey`, `USAGE_TTL`, `countRequest(redis, subject, keys): Promise<{minute; day} | null>`, `readCounts(redis, subject, keys): Promise<{minute; day} | null>`, `meter(redis, day, client, route): Promise<boolean>`, `readUsage(redis, day): Promise<Record<string, number>>`
  - `interface ApiKeyRecord { id; prefix; label; ownerUid; ownerEmail: string|null; company; useCase; website: string|null; plan: PlanId; limits: Partial<Limits>|null; status: "active"|"revoked"; createdAt: string; revokedAt: string|null; lastUsedAt: string|null; notes: string|null }`, `interface KeyModel`, `interface KeyStore { findActiveByHash; create; list; update; touchLastUsed }`, `class TooManyKeysError`, `createKeyStore(model, opts?)`, `toRecord(doc)`
  - `interface UsageRow { day; client; route; count }`, `interface UsageDaysRepo { upsertDay(day, rows): Promise<number>; readRange(from, to): Promise<UsageRow[]> }`, `splitField(field)`, `rowsFromHash(day, hash): UsageRow[]`, `interface ClientSummary { total; last7; routes: {route; count}[]; daily: {day; count}[] }`, `summarize(rows, today, topRoutes?): Record<string, ClientSummary>`, `interface AnonymousLead { userAgent; total; last7; routes }`, `rankAnonymous(summary, top?): AnonymousLead[]`
  - `redisCache.getClient(): Redis | null`

- [ ] **Step 1: Write the test fakes `tests/apikeys/fakes.ts`**

```ts
// Dobles en memoria para los tests de classes/apikeys/. No es un .test.ts: vitest no lo recoge solo.
import type { RedisLike, RedisMulti } from "../../classes/apikeys/counters";
import type { KeyModel } from "../../classes/apikeys/store";

export class FakeRedis implements RedisLike {
  strings = new Map<string, number>();
  hashes = new Map<string, Map<string, number>>();
  ttl = new Map<string, number>();
  fail = false;

  private guard() {
    if (this.fail) throw new Error("redis caído");
  }

  multi(): RedisMulti {
    const ops: Array<() => [Error | null, unknown]> = [];
    const chain: RedisMulti = {
      incr: (key: string) => {
        ops.push(() => {
          const next = (this.strings.get(key) ?? 0) + 1;
          this.strings.set(key, next);
          return [null, next];
        });
        return chain;
      },
      expire: (key: string, seconds: number) => {
        ops.push(() => {
          this.ttl.set(key, seconds);
          return [null, 1];
        });
        return chain;
      },
      exec: async () => {
        this.guard();
        return ops.map((op) => op());
      },
    };
    return chain;
  }

  async hincrby(key: string, field: string, increment: number): Promise<number> {
    this.guard();
    const hash = this.hashes.get(key) ?? new Map<string, number>();
    const next = (hash.get(field) ?? 0) + increment;
    hash.set(field, next);
    this.hashes.set(key, hash);
    return next;
  }

  async expire(key: string, seconds: number): Promise<number> {
    this.guard();
    this.ttl.set(key, seconds);
    return 1;
  }

  async hgetall(key: string): Promise<Record<string, string>> {
    this.guard();
    const hash = this.hashes.get(key) ?? new Map<string, number>();
    return Object.fromEntries([...hash].map(([f, v]) => [f, String(v)]));
  }

  async mget(...keys: string[]): Promise<(string | null)[]> {
    this.guard();
    return keys.map((k) => (this.strings.has(k) ? String(this.strings.get(k)) : null));
  }
}

type Doc = Record<string, any>;

function matches(doc: Doc, filter: Record<string, unknown>): boolean {
  return Object.entries(filter).every(([field, expected]) => {
    if (expected && typeof expected === "object" && "$in" in (expected as object)) {
      return ((expected as { $in: unknown[] }).$in).map(String).includes(String(doc[field]));
    }
    return String(doc[field]) === String(expected);
  });
}

/** Modelo de mongoose mínimo en memoria: lo justo para createKeyStore. */
export class FakeKeyModel implements KeyModel {
  docs: Doc[] = [];
  findOneCalls = 0;
  private seq = 0;

  findOne(filter: Record<string, unknown>) {
    this.findOneCalls++;
    return { lean: async () => this.docs.find((d) => matches(d, filter)) ?? null };
  }

  find(filter: Record<string, unknown>) {
    return {
      sort: (_s: Record<string, 1 | -1>) => ({
        lean: async () =>
          this.docs.filter((d) => matches(d, filter)).sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)),
      }),
    };
  }

  async countDocuments(filter: Record<string, unknown>) {
    return this.docs.filter((d) => matches(d, filter)).length;
  }

  async create(doc: Record<string, unknown>) {
    this.seq++;
    const stored = { _id: this.seq.toString(16).padStart(24, "0"), ...doc };
    this.docs.push(stored);
    return stored;
  }

  findOneAndUpdate(filter: Record<string, unknown>, update: { $set: Record<string, unknown> }) {
    return {
      lean: async () => {
        const doc = this.docs.find((d) => matches(d, filter));
        if (!doc) return null;
        Object.assign(doc, update.$set);
        return doc;
      },
    };
  }

  async updateMany(filter: Record<string, unknown>, update: { $set: Record<string, unknown> }) {
    for (const doc of this.docs.filter((d) => matches(d, filter))) Object.assign(doc, update.$set);
    return {};
  }
}
```

- [ ] **Step 2: Write the failing tests**

`tests/apikeys/counters.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { countRequest, meter, readCounts, readUsage, USAGE_TTL } from "../../classes/apikeys/counters";
import { windowKeys } from "../../classes/apikeys/window";
import { FakeRedis } from "./fakes";

const keys = windowKeys(new Date("2026-09-27T15:04:30Z"));

describe("contadores en Redis", () => {
  it("cuenta minuto y día del mismo sujeto y les pone vencimiento", async () => {
    const redis = new FakeRedis();
    await countRequest(redis, "ip:1.2.3.4", keys);
    const second = await countRequest(redis, "ip:1.2.3.4", keys);
    expect(second).toEqual({ minute: 2, day: 2 });
    expect(redis.ttl.get(`rl:m:ip:1.2.3.4:${keys.minuteBucket}`)).toBe(120);
    expect(redis.ttl.get("rl:d:ip:1.2.3.4:2026-09-27")).toBe(3 * 86400);
    expect(await readCounts(redis, "ip:1.2.3.4", keys)).toEqual({ minute: 2, day: 2 });
  });

  it("si Redis se cae devuelve null en vez de tirar", async () => {
    const redis = new FakeRedis();
    redis.fail = true;
    expect(await countRequest(redis, "ip:1.2.3.4", keys)).toBeNull();
    expect(await readCounts(redis, "ip:1.2.3.4", keys)).toBeNull();
    expect(await meter(redis, "2026-09-27", "site", "/")).toBe(false);
  });

  it("el medidor suma por cliente y ruta en el hash del día, con 40 días de vida", async () => {
    const redis = new FakeRedis();
    await meter(redis, "2026-09-27", "ua:ArboitePanel/1.0", "/exchange/la_favorita");
    await meter(redis, "2026-09-27", "ua:ArboitePanel/1.0", "/exchange/la_favorita");
    expect(await readUsage(redis, "2026-09-27")).toEqual({ "ua:ArboitePanel/1.0|/exchange/la_favorita": 2 });
    expect(redis.ttl.get("usage:2026-09-27")).toBe(USAGE_TTL);
  });
});
```

`tests/apikeys/store.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { hashCredential } from "../../classes/apikeys/credential";
import { createKeyStore, TooManyKeysError } from "../../classes/apikeys/store";
import { FakeKeyModel } from "./fakes";

const input = {
  ownerUid: "uid-1",
  ownerEmail: "ana@empresa.uy",
  label: "Pantalla",
  company: "Cambio Ejemplo",
  useCase: "Mostrar la pizarra en el local",
  website: null,
};

function setup(start = 1_000_000) {
  let clock = start;
  let n = 0;
  const model = new FakeKeyModel();
  const store = createKeyStore(model, {
    now: () => clock,
    generate: () => "cu_" + String(++n).padStart(32, "A"),
  });
  return { model, store, tick: (ms: number) => (clock += ms) };
}

describe("store de claves", () => {
  it("crea en plan gratuito, guarda sólo el hash y devuelve la clave una vez", async () => {
    const { model, store } = setup();
    const { record, plaintext } = await store.create(input);
    expect(record).toMatchObject({ plan: "free", status: "active", prefix: plaintext.slice(0, 8), label: "Pantalla" });
    expect(JSON.stringify(model.docs)).not.toContain(plaintext);
    expect(model.docs[0].keyHash).toBe(hashCredential(plaintext));
    expect(record).not.toHaveProperty("keyHash");
  });

  it("pone un tope de 3 claves activas por cuenta", async () => {
    const { store } = setup();
    for (let i = 0; i < 3; i++) await store.create(input);
    await expect(store.create(input)).rejects.toBeInstanceOf(TooManyKeysError);
    await expect(store.create({ ...input, ownerUid: "otra" })).resolves.toBeTruthy();
  });

  it("encuentra por hash y recuerda 60 s también la respuesta negativa", async () => {
    const { model, store, tick } = setup();
    const { plaintext } = await store.create(input);
    expect(await store.findActiveByHash(hashCredential(plaintext))).toMatchObject({ label: "Pantalla" });
    const invented = hashCredential("cu_" + "Z".repeat(32));
    expect(await store.findActiveByHash(invented)).toBeNull();
    const calls = model.findOneCalls;
    await store.findActiveByHash(invented);
    await store.findActiveByHash(invented);
    expect(model.findOneCalls).toBe(calls);
    tick(60_001);
    await store.findActiveByHash(invented);
    expect(model.findOneCalls).toBe(calls + 1);
  });

  it("revocar rige ya en este proceso y queda fechado", async () => {
    const { store } = setup();
    const { record, plaintext } = await store.create(input);
    await store.findActiveByHash(hashCredential(plaintext));
    const revoked = await store.update(record.id, { status: "revoked" }, "uid-1");
    expect(revoked).toMatchObject({ status: "revoked" });
    expect(revoked?.revokedAt).not.toBeNull();
    expect(await store.findActiveByHash(hashCredential(plaintext))).toBeNull();
  });

  it("el dueño sólo toca sus claves", async () => {
    const { store } = setup();
    const { record } = await store.create(input);
    expect(await store.update(record.id, { status: "revoked" }, "intruso")).toBeNull();
    expect(await store.update("no-es-un-id", { status: "revoked" })).toBeNull();
  });

  it("lista por dueño, más nueva primero", async () => {
    const { store, tick } = setup();
    await store.create({ ...input, label: "Primera" });
    tick(1000);
    await store.create({ ...input, label: "Segunda" });
    await store.create({ ...input, ownerUid: "otra", label: "Ajena" });
    expect((await store.list("uid-1")).map((r) => r.label)).toEqual(["Segunda", "Primera"]);
    expect(await store.list()).toHaveLength(3);
  });

  it("anota el último uso", async () => {
    const { store } = setup();
    const { record } = await store.create(input);
    await store.touchLastUsed([record.id, "basura"], new Date("2026-09-27T12:00:00Z"));
    expect((await store.list("uid-1"))[0].lastUsedAt).toBe("2026-09-27T12:00:00.000Z");
  });
});
```

`tests/apikeys/usage.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { rankAnonymous, rowsFromHash, splitField, summarize } from "../../classes/apikeys/usage";

describe("filas del medidor", () => {
  it("parte el campo por el último separador", () => {
    expect(splitField("ua:Panel v1|/exchange/brou")).toEqual({ client: "ua:Panel v1", route: "/exchange/brou" });
    expect(splitField("sin-separador")).toBeNull();
    expect(splitField("|/x")).toBeNull();
  });

  it("convierte el hash del día en filas y descarta basura", () => {
    expect(rowsFromHash("2026-09-27", { "site|/": 5, roto: 3, "key:abc|/usage": 0 })).toEqual([
      { day: "2026-09-27", client: "site", route: "/", count: 5 },
    ]);
  });
});

describe("resúmenes", () => {
  const rows = [
    { day: "2026-09-27", client: "key:k1", route: "/", count: 10 },
    { day: "2026-09-27", client: "key:k1", route: "/regional", count: 3 },
    { day: "2026-09-10", client: "key:k1", route: "/", count: 100 },
    { day: "2026-09-27", client: "ua:ArboitePanel/1.0", route: "/exchange/la_favorita", count: 280 },
    { day: "2026-09-26", client: "ua:ArboitePanel/1.0", route: "/exchange/la_favorita", count: 290 },
    { day: "2026-09-27", client: "ua:curl/8.0", route: "/", count: 4 },
    { day: "2026-09-27", client: "site", route: "/", count: 900 },
  ];

  it("suma total, últimos 7 días, rutas y serie diaria por cliente", () => {
    const s = summarize(rows, "2026-09-27");
    expect(s["key:k1"]).toMatchObject({ total: 113, last7: 13 });
    expect(s["key:k1"].routes[0]).toEqual({ route: "/", count: 110 });
    expect(s["key:k1"].daily).toEqual([
      { day: "2026-09-10", count: 100 },
      { day: "2026-09-27", count: 13 },
    ]);
  });

  it("ordena a los anónimos por volumen, sin los lectores del sitio ni las claves", () => {
    const leads = rankAnonymous(summarize(rows, "2026-09-27"));
    expect(leads.map((l) => l.userAgent)).toEqual(["ArboitePanel/1.0", "curl/8.0"]);
    expect(leads[0]).toMatchObject({ total: 570, last7: 570 });
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npx vitest run tests/apikeys/counters.test.ts tests/apikeys/store.test.ts tests/apikeys/usage.test.ts`
Expected: FAIL — cannot resolve `counters`, `store`, `usage`.

- [ ] **Step 4: Implement `classes/apikeys/counters.ts`**

```ts
// Las operaciones de Redis de las claves de API: contadores de límite y medidor de uso.
//
// Recibe el cliente inyectado (en producción, `redisCache.getClient()`, con su prefijo "cambio:").
// NUNCA tira: una falla devuelve null/false y quien llama deja pasar el pedido sin límite y sin
// medir. La API no se cae porque se cayó el contador.
import type { WindowKeys } from "./window";

export interface RedisMulti {
  incr(key: string): RedisMulti;
  expire(key: string, seconds: number): RedisMulti;
  exec(): Promise<Array<[Error | null, unknown]> | null>;
}

export interface RedisLike {
  multi(): RedisMulti;
  hincrby(key: string, field: string, increment: number): Promise<number>;
  expire(key: string, seconds: number): Promise<number>;
  hgetall(key: string): Promise<Record<string, string>>;
  mget(...keys: string[]): Promise<(string | null)[]>;
}

const MINUTE_TTL = 120;
const DAY_TTL = 3 * 86_400;
/** El medidor vive 40 días en Redis: un job caído varios días no pierde nada. */
export const USAGE_TTL = 40 * 86_400;

export const minuteKey = (subject: string, bucket: number): string => `rl:m:${subject}:${bucket}`;
export const dayKey = (subject: string, day: string): string => `rl:d:${subject}:${day}`;
export const usageKey = (day: string): string => `usage:${day}`;

export async function countRequest(
  redis: RedisLike,
  subject: string,
  keys: WindowKeys
): Promise<{ minute: number; day: number } | null> {
  try {
    const m = minuteKey(subject, keys.minuteBucket);
    const d = dayKey(subject, keys.day);
    const res = await redis.multi().incr(m).expire(m, MINUTE_TTL).incr(d).expire(d, DAY_TTL).exec();
    if (!res || res[0]?.[0] || res[2]?.[0]) return null;
    const minute = Number(res[0]?.[1]);
    const day = Number(res[2]?.[1]);
    return Number.isFinite(minute) && Number.isFinite(day) ? { minute, day } : null;
  } catch {
    return null;
  }
}

/** Lo consumido sin sumar un pedido (para `GET /usage`, que ya contó el middleware). */
export async function readCounts(
  redis: RedisLike,
  subject: string,
  keys: WindowKeys
): Promise<{ minute: number; day: number } | null> {
  try {
    const [m, d] = await redis.mget(minuteKey(subject, keys.minuteBucket), dayKey(subject, keys.day));
    return { minute: Number(m ?? 0) || 0, day: Number(d ?? 0) || 0 };
  } catch {
    return null;
  }
}

export async function meter(redis: RedisLike, day: string, client: string, route: string): Promise<boolean> {
  try {
    const key = usageKey(day);
    await redis.hincrby(key, `${client}|${route}`, 1);
    await redis.expire(key, USAGE_TTL);
    return true;
  } catch {
    return false;
  }
}

export async function readUsage(redis: RedisLike, day: string): Promise<Record<string, number>> {
  const raw = await redis.hgetall(usageKey(day));
  const out: Record<string, number> = {};
  for (const [field, value] of Object.entries(raw ?? {})) {
    const n = Number(value);
    if (Number.isFinite(n) && n > 0) out[field] = n;
  }
  return out;
}
```

- [ ] **Step 5: Implement `classes/apikeys/store.ts`**

```ts
// Las claves de la API sobre un modelo de Mongo inyectado (mongo.ts pone el de verdad; los tests,
// uno en memoria). Guarda el hash, nunca la clave.
//
// `findActiveByHash` es el camino caliente: lo llama el middleware en cada pedido con clave. Por eso
// recuerda 60 s la respuesta, también la NEGATIVA (una clave inventada repetida no golpea Mongo cada
// vez). Un cambio hecho en este proceso vacía la caché y rige ya; el de la otra instancia del
// cluster rige en ≤ 60 s. No hay timers: la caché vence por reloj al leerla.
import { displayPrefix, generateCredential, hashCredential } from "./credential";
import { isPlanId, type Limits, type PlanId } from "./plans";
import { MAX_ACTIVE_PER_OWNER, type KeyPatch, type NewKeyInput } from "./validate";

const CACHE_MS = 60_000;
const CACHE_MAX = 5_000;
const OBJECT_ID = /^[a-f0-9]{24}$/;

export interface ApiKeyRecord {
  id: string;
  prefix: string;
  label: string;
  ownerUid: string;
  ownerEmail: string | null;
  company: string;
  useCase: string;
  website: string | null;
  plan: PlanId;
  limits: Partial<Limits> | null;
  status: "active" | "revoked";
  createdAt: string;
  revokedAt: string | null;
  lastUsedAt: string | null;
  notes: string | null;
}

/** Lo mínimo del modelo de mongoose que usa el store. */
export interface KeyModel {
  findOne(filter: Record<string, unknown>): { lean(): Promise<any> };
  find(filter: Record<string, unknown>): { sort(s: Record<string, 1 | -1>): { lean(): Promise<any[]> } };
  countDocuments(filter: Record<string, unknown>): Promise<number>;
  create(doc: Record<string, unknown>): Promise<any>;
  findOneAndUpdate(
    filter: Record<string, unknown>,
    update: { $set: Record<string, unknown> },
    opts: { new: true }
  ): { lean(): Promise<any> };
  updateMany(filter: Record<string, unknown>, update: { $set: Record<string, unknown> }): Promise<unknown>;
}

export interface KeyStore {
  findActiveByHash(hash: string): Promise<ApiKeyRecord | null>;
  create(input: NewKeyInput): Promise<{ record: ApiKeyRecord; plaintext: string }>;
  list(ownerUid?: string): Promise<ApiKeyRecord[]>;
  update(id: string, patch: KeyPatch, ownerUid?: string): Promise<ApiKeyRecord | null>;
  touchLastUsed(ids: string[], at: Date): Promise<void>;
}

export class TooManyKeysError extends Error {
  constructor() {
    super("too_many_keys");
    this.name = "TooManyKeysError";
  }
}

function iso(value: unknown): string | null {
  if (!value) return null;
  const d = new Date(value as string | number | Date);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export function toRecord(doc: any): ApiKeyRecord {
  return {
    id: String(doc._id),
    prefix: String(doc.prefix ?? ""),
    label: String(doc.label ?? ""),
    ownerUid: String(doc.ownerUid ?? ""),
    ownerEmail: doc.ownerEmail ?? null,
    company: String(doc.company ?? ""),
    useCase: String(doc.useCase ?? ""),
    website: doc.website ?? null,
    plan: isPlanId(doc.plan) ? doc.plan : "free",
    limits: doc.limits ?? null,
    status: doc.status === "revoked" ? "revoked" : "active",
    createdAt: iso(doc.createdAt) ?? new Date(0).toISOString(),
    revokedAt: iso(doc.revokedAt),
    lastUsedAt: iso(doc.lastUsedAt),
    notes: doc.notes ?? null,
  };
}

export function createKeyStore(
  model: KeyModel,
  opts: { now?: () => number; generate?: () => string } = {}
): KeyStore {
  const now = opts.now ?? Date.now;
  const generate = opts.generate ?? (() => generateCredential());
  const cache = new Map<string, { at: number; record: ApiKeyRecord | null }>();

  return {
    async findActiveByHash(hash) {
      const hit = cache.get(hash);
      if (hit && now() - hit.at < CACHE_MS) return hit.record;
      const doc = await model.findOne({ keyHash: hash, status: "active" }).lean();
      const record = doc ? toRecord(doc) : null;
      if (cache.size >= CACHE_MAX) cache.clear();
      cache.set(hash, { at: now(), record });
      return record;
    },

    async create(input) {
      const active = await model.countDocuments({ ownerUid: input.ownerUid, status: "active" });
      if (active >= MAX_ACTIVE_PER_OWNER) throw new TooManyKeysError();
      const plaintext = generate();
      const doc = await model.create({
        keyHash: hashCredential(plaintext),
        prefix: displayPrefix(plaintext),
        label: input.label,
        ownerUid: input.ownerUid,
        ownerEmail: input.ownerEmail,
        company: input.company,
        useCase: input.useCase,
        website: input.website,
        plan: "free",
        limits: null,
        status: "active",
        createdAt: new Date(now()),
        revokedAt: null,
        lastUsedAt: null,
        notes: null,
      });
      const plain = typeof doc?.toObject === "function" ? doc.toObject() : doc;
      cache.clear();
      return { record: toRecord(plain), plaintext };
    },

    async list(ownerUid) {
      const docs = await model.find(ownerUid ? { ownerUid } : {}).sort({ createdAt: -1 }).lean();
      return docs.map(toRecord);
    },

    async update(id, patch, ownerUid) {
      if (!OBJECT_ID.test(id)) return null;
      const filter: Record<string, unknown> = { _id: id };
      if (ownerUid) filter.ownerUid = ownerUid;
      const set: Record<string, unknown> = {};
      if (patch.label !== undefined) set.label = patch.label;
      if (patch.plan !== undefined) set.plan = patch.plan;
      if (patch.limits !== undefined) set.limits = patch.limits;
      if (patch.notes !== undefined) set.notes = patch.notes;
      if (patch.status !== undefined) {
        set.status = patch.status;
        set.revokedAt = patch.status === "revoked" ? new Date(now()) : null;
      }
      if (!Object.keys(set).length) return null;
      const doc = await model.findOneAndUpdate(filter, { $set: set }, { new: true }).lean();
      cache.clear();
      return doc ? toRecord(doc) : null;
    },

    async touchLastUsed(ids, at) {
      const valid = ids.filter((id) => OBJECT_ID.test(id));
      if (!valid.length) return;
      await model.updateMany({ _id: { $in: valid } }, { $set: { lastUsedAt: at } });
    },
  };
}
```

- [ ] **Step 6: Implement `classes/apikeys/usage.ts`**

```ts
// El medidor de uso convertido en lo que lee una persona: filas por día × cliente × ruta, un
// resumen por cliente y el ranking de los que usan la API sin clave. Puro.
//
// Cliente = `key:<id>` (una clave), `ua:<User-Agent>` (anónimo) o `site` (lectores del sitio). El
// ranking de anónimos es la lista de a quién ofrecerle un plan: un programa que se identifica y pide
// todos los días. Nunca hay IP acá.
import { dayMinus } from "./window";

export interface UsageRow {
  day: string;
  client: string;
  route: string;
  count: number;
}

export interface UsageDaysRepo {
  upsertDay(day: string, rows: UsageRow[]): Promise<number>;
  readRange(from: string, to: string): Promise<UsageRow[]>;
}

export interface ClientSummary {
  total: number;
  last7: number;
  routes: { route: string; count: number }[];
  daily: { day: string; count: number }[];
}

export interface AnonymousLead {
  userAgent: string;
  total: number;
  last7: number;
  routes: { route: string; count: number }[];
}

export function splitField(field: string): { client: string; route: string } | null {
  const i = field.lastIndexOf("|");
  if (i <= 0 || i === field.length - 1) return null;
  return { client: field.slice(0, i), route: field.slice(i + 1) };
}

export function rowsFromHash(day: string, hash: Record<string, number>): UsageRow[] {
  const rows: UsageRow[] = [];
  for (const [field, count] of Object.entries(hash)) {
    const parts = splitField(field);
    if (!parts || !(count > 0)) continue;
    rows.push({ day, client: parts.client, route: parts.route, count });
  }
  return rows;
}

export function summarize(rows: UsageRow[], today: string, topRoutes = 10): Record<string, ClientSummary> {
  const weekStart = dayMinus(today, 6);
  const acc = new Map<string, { total: number; last7: number; routes: Map<string, number>; daily: Map<string, number> }>();
  for (const row of rows) {
    const entry = acc.get(row.client) ?? { total: 0, last7: 0, routes: new Map(), daily: new Map() };
    entry.total += row.count;
    if (row.day >= weekStart && row.day <= today) entry.last7 += row.count;
    entry.routes.set(row.route, (entry.routes.get(row.route) ?? 0) + row.count);
    entry.daily.set(row.day, (entry.daily.get(row.day) ?? 0) + row.count);
    acc.set(row.client, entry);
  }
  const out: Record<string, ClientSummary> = {};
  for (const [client, entry] of acc) {
    out[client] = {
      total: entry.total,
      last7: entry.last7,
      routes: [...entry.routes]
        .map(([route, count]) => ({ route, count }))
        .sort((a, b) => b.count - a.count || a.route.localeCompare(b.route))
        .slice(0, topRoutes),
      daily: [...entry.daily].map(([day, count]) => ({ day, count })).sort((a, b) => a.day.localeCompare(b.day)),
    };
  }
  return out;
}

export function rankAnonymous(summary: Record<string, ClientSummary>, top = 30): AnonymousLead[] {
  return Object.entries(summary)
    .filter(([client]) => client.startsWith("ua:"))
    .map(([client, s]) => ({ userAgent: client.slice(3), total: s.total, last7: s.last7, routes: s.routes.slice(0, 5) }))
    .sort((a, b) => b.total - a.total || a.userAgent.localeCompare(b.userAgent))
    .slice(0, top);
}
```

- [ ] **Step 7: Add `getClient()` to `classes/redis_cache.ts`**

Insert right after the `isEnabled()` method (the method that returns `this.enabled`):

```ts
  /**
   * Cliente crudo para los contadores de las claves de API (classes/apikeys/counters.ts). `null`
   * si Redis no está conectado: quien lo pide deja pasar el pedido sin límite y sin medir.
   */
  getClient(): Redis | null {
    return this.connected && this.client ? this.client : null;
  }
```

- [ ] **Step 8: Run tests to verify they pass**

Run: `npx vitest run tests/apikeys/`
Expected: PASS (all tests of Tasks 1–3).

- [ ] **Step 9: Commit**

```bash
git add classes/apikeys/counters.ts classes/apikeys/store.ts classes/apikeys/usage.ts classes/redis_cache.ts tests/apikeys/fakes.ts tests/apikeys/counters.test.ts tests/apikeys/store.test.ts tests/apikeys/usage.test.ts
git commit -m "feat(apikeys): contadores en Redis, store de claves con caché y resúmenes de uso

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: Middleware de clasificación, límite y medidor

**Files:**
- Create: `classes/apikeys/middleware.ts`
- Test: `tests/apikeys/middleware.test.ts`

**Interfaces:**
- Consumes: Tasks 1–3 (`extractCredential`, `hashCredential`, `clientIp`, `internalIps`, `isSiteReferrer`, `firstHeader`, `countRequest`, `meter`, `RedisLike`, `meterRoute`, `meterUserAgent`, `effectiveLimits`, `planLimits`, `Limits`, `PlanId`, `ApiKeyRecord`, `decide`, `windowKeys`).
- Produces: `type ClientKind`, `interface ApiClientInfo { kind: ClientKind; plan: PlanId | "site"; subject: string | null; meterId: string | null; keyId: string | null; keyPrefix: string | null; limits: Limits | null }`, `interface MiddlewareDeps { redis: () => RedisLike | null; lookup: (hash: string) => Promise<ApiKeyRecord | null>; env?: NodeJS.ProcessEnv; now?: () => Date; log?: (message: string) => void }`, `createApiKeyMiddleware(deps): RequestHandler`, `isExemptPath(path: string): boolean`, `DOCS_URL`. Sets `res.locals.apiClient: ApiClientInfo`.

- [ ] **Step 1: Write the failing test `tests/apikeys/middleware.test.ts`**

```ts
import { describe, expect, it, vi } from "vitest";
import { hashCredential } from "../../classes/apikeys/credential";
import { createApiKeyMiddleware, isExemptPath } from "../../classes/apikeys/middleware";
import type { ApiKeyRecord } from "../../classes/apikeys/store";
import { FakeRedis } from "./fakes";

const sample = "cu_" + "A".repeat(32);
const NOW = new Date("2026-09-27T15:04:30Z");

function record(over: Partial<ApiKeyRecord> = {}): ApiKeyRecord {
  return {
    id: "0".repeat(23) + "1",
    prefix: sample.slice(0, 8),
    label: "Pantalla",
    ownerUid: "uid-1",
    ownerEmail: null,
    company: "Cambio Ejemplo",
    useCase: "Pizarra en el local",
    website: null,
    plan: "free",
    limits: null,
    status: "active",
    createdAt: NOW.toISOString(),
    revokedAt: null,
    lastUsedAt: null,
    notes: null,
    ...over,
  };
}

function fakeReq(over: Record<string, unknown> = {}) {
  return { method: "GET", path: "/exchange/brou/USD", headers: { "user-agent": "Panel/1.0" }, query: {}, ip: "200.40.1.2", ...over } as any;
}

function fakeRes() {
  const listeners: Record<string, Array<() => void>> = {};
  const res: any = {
    statusCode: 200,
    headers: {} as Record<string, string>,
    locals: {},
    body: undefined,
    setHeader(name: string, value: string) {
      this.headers[name.toLowerCase()] = value;
    },
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(body: unknown) {
      this.body = body;
      (listeners.finish ?? []).forEach((fn) => fn());
      return this;
    },
    on(event: string, fn: () => void) {
      (listeners[event] ??= []).push(fn);
      return this;
    },
    finish() {
      (listeners.finish ?? []).forEach((fn) => fn());
    },
  };
  return res;
}

async function run(mw: any, req: any) {
  const res = fakeRes();
  const next = vi.fn();
  await mw(req, res, next);
  return { res, next };
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

function build(opts: { redis?: FakeRedis | null; lookup?: (h: string) => Promise<ApiKeyRecord | null>; env?: Record<string, string> } = {}) {
  const redis = opts.redis === undefined ? new FakeRedis() : opts.redis;
  const mw = createApiKeyMiddleware({
    redis: () => redis,
    lookup: opts.lookup ?? (async () => null),
    env: (opts.env ?? {}) as NodeJS.ProcessEnv,
    now: () => NOW,
    log: () => undefined,
  });
  return { mw, redis };
}

describe("middleware de claves", () => {
  it("anónimo: pasa, lleva cabeceras y se mide por User-Agent", async () => {
    const { mw, redis } = build();
    const { res, next } = await run(mw, fakeReq());
    expect(next).toHaveBeenCalledOnce();
    expect(res.headers["x-plan"]).toBe("anonymous");
    expect(res.headers["x-ratelimit-limit"]).toBe("600");
    expect(res.headers["x-ratelimit-remaining"]).toBe("599");
    expect(res.headers["access-control-expose-headers"]).toContain("X-RateLimit-Remaining");
    res.finish();
    await flush();
    expect(await redis!.hgetall("usage:2026-09-27")).toEqual({ "ua:Panel/1.0|/exchange/brou": "1" });
  });

  it("corta con 429 al pasar el techo, con Retry-After y enlace a /empresas", async () => {
    const { mw } = build({ env: { API_LIMIT_ANONYMOUS_PER_MINUTE: "2" } });
    await run(mw, fakeReq());
    await run(mw, fakeReq());
    const { res, next } = await run(mw, fakeReq());
    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(429);
    expect(res.body).toMatchObject({ error: "rate_limited", window: "minute", docs: "https://cambio-uruguay.com/empresas" });
    expect(Number(res.headers["retry-after"])).toBe(30);
  });

  it("los lectores del sitio no cuentan contra la IP compartida y se miden como site", async () => {
    const { mw, redis } = build({ env: { API_LIMIT_ANONYMOUS_PER_MINUTE: "1" } });
    for (let i = 0; i < 5; i++) {
      const { res, next } = await run(mw, fakeReq({ headers: { origin: "https://cambio-uruguay.com", "user-agent": "Mozilla" } }));
      expect(next).toHaveBeenCalledOnce();
      expect(res.headers["x-plan"]).toBe("site");
      expect(res.headers["x-ratelimit-limit"]).toBeUndefined();
      res.finish();
    }
    await flush();
    expect(await redis!.hgetall("usage:2026-09-27")).toEqual({ "site|/exchange/brou": "5" });
  });

  it("interno: ni cuenta ni mide ni pone cabeceras", async () => {
    const { mw, redis } = build({ env: { API_INTERNAL_IPS: "104.234.204.107" } });
    const { res, next } = await run(mw, fakeReq({ ip: "::ffff:104.234.204.107" }));
    expect(next).toHaveBeenCalledOnce();
    expect(res.headers["x-plan"]).toBeUndefined();
    expect(res.locals.apiClient.kind).toBe("internal");
    res.finish();
    await flush();
    expect(redis!.strings.size + redis!.hashes.size).toBe(0);
  });

  it("clave válida: su plan y sus límites propios, medida por id", async () => {
    const doc = record({ plan: "business", limits: { perMinute: 5 } });
    const { mw, redis } = build({ lookup: async (h) => (h === hashCredential(sample) ? doc : null) });
    const { res, next } = await run(mw, fakeReq({ headers: { "x-api-key": sample } }));
    expect(next).toHaveBeenCalledOnce();
    expect(res.headers["x-plan"]).toBe("business");
    expect(res.headers["x-ratelimit-limit"]).toBe("5");
    expect(res.locals.apiClient).toMatchObject({ kind: "key", keyId: doc.id, keyPrefix: "cu_AAAAA" });
    res.finish();
    await flush();
    expect(Object.keys(await redis!.hgetall("usage:2026-09-27"))).toEqual([`key:${doc.id}|/exchange/brou`]);
  });

  it("clave con otra forma o inexistente: 401 con el motivo", async () => {
    const { mw } = build();
    const bad = await run(mw, fakeReq({ headers: { "x-api-key": "hola" } }));
    expect(bad.res.statusCode).toBe(401);
    expect(bad.res.body.error).toBe("invalid_api_key");
    const unknown = await run(mw, fakeReq({ headers: { "x-api-key": sample } }));
    expect(unknown.res.statusCode).toBe(401);
    expect(unknown.res.body.message).toContain("no existe o fue revocada");
  });

  it("Mongo caído al validar: pasa como anónimo, nunca 401 por culpa nuestra", async () => {
    const { mw } = build({ lookup: async () => { throw new Error("mongo caído"); } });
    const { res, next } = await run(mw, fakeReq({ headers: { "x-api-key": sample } }));
    expect(next).toHaveBeenCalledOnce();
    expect(res.headers["x-plan"]).toBe("anonymous");
  });

  it("Redis caído o ausente: pasa sin límite y sin medir", async () => {
    const down = new FakeRedis();
    down.fail = true;
    for (const redis of [down, null]) {
      const { mw } = build({ redis });
      const { res, next } = await run(mw, fakeReq());
      expect(next).toHaveBeenCalledOnce();
      expect(res.headers["x-ratelimit-limit"]).toBeUndefined();
      res.finish();
    }
  });

  it("un 404 se mide como (no-encontrada)", async () => {
    const { mw, redis } = build();
    const { res } = await run(mw, fakeReq({ path: "/.env" }));
    res.statusCode = 404;
    res.finish();
    await flush();
    expect(await redis!.hgetall("usage:2026-09-27")).toEqual({ "ua:Panel/1.0|(no-encontrada)": "1" });
  });

  it("deja afuera salud, documentación, estáticos, administración y el preflight", async () => {
    for (const p of ["/health", "/ping", "/api-docs", "/api-docs.json", "/public/favicon.ico", "/admin/api-keys", "/robots.txt"]) {
      expect(isExemptPath(p), p).toBe(true);
    }
    expect(isExemptPath("/exchange/brou")).toBe(false);
    expect(isExemptPath("/administracion")).toBe(false);
    const { mw, redis } = build();
    const { next } = await run(mw, fakeReq({ method: "OPTIONS" }));
    expect(next).toHaveBeenCalledOnce();
    expect(redis!.strings.size).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/apikeys/middleware.test.ts`
Expected: FAIL — cannot resolve `../../classes/apikeys/middleware`.

- [ ] **Step 3: Implement `classes/apikeys/middleware.ts`**

```ts
// Middleware Express de las claves de API: quién pide, si le queda cuota y qué se anota.
//
// Se registra en index.ts DESPUÉS de CORS (el preflight OPTIONS nunca llega) y ANTES de la primera
// ruta. Orden de clasificación, del spec: clave (válida → su plan; inválida → 401), IP interna (el
// SSR del sitio, el MCP y los bots: ni cuenta ni mide), lector del sitio por Origin/Referer (sin
// límite, medido como `site`), y anónimo con techo por IP.
//
// Tres fallas que NO pueden tumbar un pedido: Redis caído (pasa sin límite y sin medir), Mongo
// caído al validar una clave (pasa como anónimo) y cualquier excepción propia (pasa). Se registra a
// lo sumo una vez por minuto. No hay timers: nada programado vive en la API (cluster ×2).
import type { NextFunction, Request, RequestHandler, Response } from "express";
import { clientIp, internalIps, isSiteReferrer } from "./client";
import { countRequest, meter, type RedisLike } from "./counters";
import { extractCredential, firstHeader, hashCredential } from "./credential";
import { meterRoute, meterUserAgent } from "./normalize";
import { effectiveLimits, planLimits, type Limits, type PlanId } from "./plans";
import type { ApiKeyRecord } from "./store";
import { decide, windowKeys } from "./window";

export type ClientKind = "key" | "internal" | "site" | "anonymous";

export interface ApiClientInfo {
  kind: ClientKind;
  plan: PlanId | "site";
  /** Sujeto de los contadores de límite (`key:<id>` o `ip:<ip>`); null = sin techo. */
  subject: string | null;
  /** Cliente del medidor (`key:<id>`, `ua:<User-Agent>` o `site`); null = no se mide. */
  meterId: string | null;
  keyId: string | null;
  keyPrefix: string | null;
  limits: Limits | null;
}

export interface MiddlewareDeps {
  redis: () => RedisLike | null;
  lookup: (hash: string) => Promise<ApiKeyRecord | null>;
  env?: NodeJS.ProcessEnv;
  now?: () => Date;
  log?: (message: string) => void;
}

export const DOCS_URL = "https://cambio-uruguay.com/empresas";
const EXPOSED = "X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset, X-Plan";
const EXEMPT_EXACT = new Set(["/health", "/ping", "/robots.txt", "/favicon.ico"]);
const EXEMPT_PREFIX = ["/api-docs", "/public/", "/admin/"];

export function isExemptPath(path: string): boolean {
  const p = String(path || "").toLowerCase();
  if (EXEMPT_EXACT.has(p)) return true;
  return EXEMPT_PREFIX.some((prefix) => p === prefix.replace(/\/$/, "") || p.startsWith(prefix));
}

function invalid(message: string) {
  return { error: "invalid_api_key", message, docs: DOCS_URL };
}

function classify(req: Request, record: ApiKeyRecord | null, internal: Set<string>, env: NodeJS.ProcessEnv): ApiClientInfo {
  if (record) {
    if (record.plan === "internal") {
      return { kind: "internal", plan: "internal", subject: null, meterId: null, keyId: record.id, keyPrefix: record.prefix, limits: null };
    }
    return {
      kind: "key",
      plan: record.plan,
      subject: `key:${record.id}`,
      meterId: `key:${record.id}`,
      keyId: record.id,
      keyPrefix: record.prefix,
      limits: effectiveLimits(record.plan, record.limits, env),
    };
  }
  const ip = clientIp(req.headers, req.ip);
  if (internal.has(ip)) {
    return { kind: "internal", plan: "internal", subject: null, meterId: null, keyId: null, keyPrefix: null, limits: null };
  }
  if (isSiteReferrer(firstHeader(req.headers.origin), firstHeader(req.headers.referer))) {
    return { kind: "site", plan: "site", subject: null, meterId: "site", keyId: null, keyPrefix: null, limits: null };
  }
  return {
    kind: "anonymous",
    plan: "anonymous",
    subject: `ip:${ip}`,
    meterId: `ua:${meterUserAgent(req.headers["user-agent"])}`,
    keyId: null,
    keyPrefix: null,
    limits: planLimits("anonymous", env),
  };
}

export function createApiKeyMiddleware(deps: MiddlewareDeps): RequestHandler {
  const env = deps.env ?? process.env;
  const now = deps.now ?? (() => new Date());
  const internal = internalIps(env);
  let lastLog = -Infinity;
  const logOnce = (message: string) => {
    const t = now().getTime();
    if (t - lastLog < 60_000) return;
    lastLog = t;
    (deps.log ?? console.warn)(`[apikeys] ${message}`);
  };

  return async (req: Request, res: Response, next: NextFunction) => {
    if (req.method === "OPTIONS" || isExemptPath(req.path)) return next();
    try {
      const credential = extractCredential(req.headers, req.query as Record<string, unknown>);
      if (credential.kind === "malformed") {
        return res
          .status(401)
          .json(invalid("La clave no tiene el formato de Cambio Uruguay: cu_ seguido de 32 letras y números."));
      }

      let record: ApiKeyRecord | null = null;
      if (credential.kind === "present") {
        let found: ApiKeyRecord | null | undefined;
        try {
          found = await deps.lookup(hashCredential(credential.value));
        } catch (e: any) {
          logOnce(`no se pudo validar una clave, el pedido pasa como anónimo: ${e?.message || e}`);
          found = undefined;
        }
        if (found === null) return res.status(401).json(invalid("La clave no existe o fue revocada."));
        record = found ?? null;
      }

      const client = classify(req, record, internal, env);
      res.locals.apiClient = client;
      if (client.kind === "internal") return next();

      res.setHeader("X-Plan", client.plan);
      res.setHeader("Access-Control-Expose-Headers", EXPOSED);

      const redis = deps.redis();
      const at = now();
      const keys = windowKeys(at);

      if (redis && client.meterId) {
        const meterId = client.meterId;
        res.on("finish", () => {
          void meter(redis, keys.day, meterId, meterRoute(req.path, res.statusCode));
        });
      }

      if (client.subject && client.limits) {
        const counts = redis ? await countRequest(redis, client.subject, keys) : null;
        if (!counts) {
          logOnce("Redis no respondió: el pedido pasa sin límite y sin medir");
        } else {
          const decision = decide(counts, client.limits, keys);
          res.setHeader("X-RateLimit-Limit", String(decision.limit));
          res.setHeader("X-RateLimit-Remaining", String(decision.remaining));
          res.setHeader("X-RateLimit-Reset", String(Math.ceil(decision.resetAt.getTime() / 1000)));
          if (!decision.allowed) {
            const wait = Math.max(1, Math.ceil((decision.resetAt.getTime() - at.getTime()) / 1000));
            res.setHeader("Retry-After", String(wait));
            return res.status(429).json({
              error: "rate_limited",
              window: decision.exceeded,
              limit: decision.limit,
              resetAt: decision.resetAt.toISOString(),
              message:
                decision.exceeded === "day"
                  ? `Llegaste a ${decision.limit} pedidos en el día. Se renueva a la medianoche de Montevideo.`
                  : `Llegaste a ${decision.limit} pedidos en un minuto. Probá de nuevo en ${wait} s.`,
              docs: DOCS_URL,
            });
          }
        }
      }
      return next();
    } catch (e: any) {
      logOnce(`falla del middleware, el pedido pasa: ${e?.message || e}`);
      return next();
    }
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/apikeys/middleware.test.ts`
Expected: PASS (10 tests). The "Redis caído" case: `redis.fail = true` makes `countRequest` return null (headers absent) and `meter` return false — no throw.

- [ ] **Step 5: Commit**

```bash
git add classes/apikeys/middleware.ts tests/apikeys/middleware.test.ts
git commit -m "feat(apikeys): middleware que clasifica, limita por plan y mide sin IP

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: Rutas de administración, `/usage`, Mongo y cableado en `index.ts`

**Files:**
- Create: `classes/apikeys/routes.ts`, `classes/apikeys/mongo.ts`
- Modify: `index.ts` (imports; wiring after the Redis connect block; `/cache/flush`), `swagger/config.ts` (`components.securitySchemes` + top-level `security`)
- Test: `tests/apikeys/routes.test.ts`

**Interfaces:**
- Consumes: `KeyStore`, `TooManyKeysError`, `ApiKeyRecord` (Task 3); `validateNewKey`, `validatePatch`, `MAX_ACTIVE_PER_OWNER` (Task 2); `UsageDaysRepo`, `rowsFromHash`, `summarize`, `rankAnonymous` (Task 3); `readUsage`, `readCounts`, `RedisLike` (Task 3); `montevideoDay`, `windowKeys`, `dayMinus` (Task 1); `limitsForJson` (Task 1); `ApiClientInfo`, `DOCS_URL`, `createApiKeyMiddleware` (Task 4).
- Produces: `adminAuth(env?): RequestHandler`, `interface RouteDeps { store: () => KeyStore; usageRepo: () => UsageDaysRepo; redis: () => RedisLike | null; notify: (text: string) => Promise<boolean>; env?; now? }`, `registerApiKeyRoutes(app, deps): void`, `escapeMarkdown(text): string`; HTTP: `POST /admin/api-keys` → `201 { key, apiKey }`, `GET /admin/api-keys?ownerUid=` → `{ keys }`, `PATCH /admin/api-keys/:id` → `{ apiKey }`, `GET /admin/api-usage?days=&ownerUid=` → `{ from, to, days, byClient, anonymous?, site? }`, `GET /usage`. `mongo.ts`: `apiKeyStore(): KeyStore`, `usageDaysRepo(): UsageDaysRepo`.

- [ ] **Step 1: Write the failing test `tests/apikeys/routes.test.ts`**

```ts
import express from "express";
import type { AddressInfo } from "net";
import { afterEach, describe, expect, it, vi } from "vitest";
import { registerApiKeyRoutes, escapeMarkdown } from "../../classes/apikeys/routes";
import { createKeyStore } from "../../classes/apikeys/store";
import type { UsageDaysRepo, UsageRow } from "../../classes/apikeys/usage";
import { FakeKeyModel, FakeRedis } from "./fakes";

const ADMIN = "x".repeat(40);
const NOW = new Date("2026-09-27T15:04:30Z");
let servers: Array<{ close: () => void }> = [];

afterEach(() => {
  servers.forEach((s) => s.close());
  servers = [];
});

function memoryRepo(rows: UsageRow[] = []): UsageDaysRepo {
  return {
    async upsertDay(_day, dayRows) {
      rows.push(...dayRows);
      return dayRows.length;
    },
    async readRange(from, to) {
      return rows.filter((r) => r.day >= from && r.day <= to);
    },
  };
}

async function start(opts: { env?: Record<string, string>; rows?: UsageRow[] } = {}) {
  const app = express();
  app.use(express.json());
  const store = createKeyStore(new FakeKeyModel());
  const redis = new FakeRedis();
  const notify = vi.fn(async () => true);
  registerApiKeyRoutes(app, {
    store: () => store,
    usageRepo: () => memoryRepo(opts.rows),
    redis: () => redis,
    notify,
    env: (opts.env ?? { API_ADMIN_TOKEN: ADMIN }) as NodeJS.ProcessEnv,
    now: () => NOW,
  });
  const server = app.listen(0);
  servers.push(server);
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const call = async (method: string, path: string, body?: unknown, headers: Record<string, string> = { "x-admin-token": ADMIN }) => {
    const res = await fetch(base + path, {
      method,
      headers: { "content-type": "application/json", ...headers },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return { status: res.status, body: await res.json().catch(() => null), headers: res.headers };
  };
  return { call, store, redis, notify };
}

const alta = {
  ownerUid: "uid-1",
  ownerEmail: "ana@empresa.uy",
  label: "Pantalla",
  company: "Cambio *Ejemplo*",
  useCase: "Mostrar la pizarra en el local",
  website: "https://ejemplo.uy",
};

describe("rutas de administración", () => {
  it("sin token 401, token errado 401, sin configurar 503", async () => {
    const { call } = await start();
    expect((await call("GET", "/admin/api-keys", undefined, {})).status).toBe(401);
    expect((await call("GET", "/admin/api-keys", undefined, { "x-admin-token": "y".repeat(40) })).status).toBe(401);
    const off = await start({ env: {} });
    expect((await off.call("GET", "/admin/api-keys")).status).toBe(503);
  });

  it("alta: 201 con la clave una vez, sin hash, y Telegram con la empresa escapada", async () => {
    const { call, notify } = await start();
    const res = await call("POST", "/admin/api-keys", alta);
    expect(res.status).toBe(201);
    expect(res.body.key).toMatch(/^cu_[A-Za-z0-9]{32}$/);
    expect(res.body.apiKey).toMatchObject({ plan: "free", company: "Cambio *Ejemplo*" });
    expect(res.body.apiKey.keyHash).toBeUndefined();
    expect(res.headers.get("cache-control")).toBe("private, no-store");
    expect(notify).toHaveBeenCalledOnce();
    expect(notify.mock.calls[0][0]).toContain("Cambio \\*Ejemplo\\*");
  });

  it("alta inválida 400 con el mensaje; cuarta clave activa 409", async () => {
    const { call } = await start();
    const bad = await call("POST", "/admin/api-keys", { ...alta, useCase: "x" });
    expect(bad.status).toBe(400);
    expect(bad.body.message).toContain("para qué");
    for (let i = 0; i < 3; i++) await call("POST", "/admin/api-keys", alta);
    const fourth = await call("POST", "/admin/api-keys", alta);
    expect(fourth.status).toBe(409);
    expect(fourth.body.error).toBe("too_many_keys");
  });

  it("el dueño revoca la suya pero no se sube de plan; el administrador sí", async () => {
    const { call } = await start();
    const { body } = await call("POST", "/admin/api-keys", alta);
    const id = body.apiKey.id;
    expect((await call("PATCH", `/admin/api-keys/${id}`, { ownerUid: "uid-1", plan: "business" })).status).toBe(400);
    expect((await call("PATCH", `/admin/api-keys/${id}`, { ownerUid: "intruso", status: "revoked" })).status).toBe(404);
    const up = await call("PATCH", `/admin/api-keys/${id}`, { plan: "business", notes: "Factura mensual" });
    expect(up.body.apiKey).toMatchObject({ plan: "business", notes: "Factura mensual" });
    const gone = await call("PATCH", `/admin/api-keys/${id}`, { ownerUid: "uid-1", status: "revoked" });
    expect(gone.body.apiKey.status).toBe("revoked");
  });

  it("lista por dueño", async () => {
    const { call } = await start();
    await call("POST", "/admin/api-keys", alta);
    await call("POST", "/admin/api-keys", { ...alta, ownerUid: "otra" });
    expect((await call("GET", "/admin/api-keys?ownerUid=uid-1")).body.keys).toHaveLength(1);
    expect((await call("GET", "/admin/api-keys")).body.keys).toHaveLength(2);
  });

  it("uso: días cerrados de Mongo + hoy de Redis; el dueño sólo ve lo suyo, el administrador ve anónimos", async () => {
    const rows: UsageRow[] = [{ day: "2026-09-26", client: "ua:ArboitePanel/1.0", route: "/exchange/la_favorita", count: 290 }];
    const { call, redis } = await start({ rows });
    const { body } = await call("POST", "/admin/api-keys", alta);
    const client = `key:${body.apiKey.id}`;
    await redis.hincrby("usage:2026-09-27", `${client}|/regional`, 7);
    await redis.hincrby("usage:2026-09-27", "ua:ArboitePanel/1.0|/exchange/la_favorita", 5);
    await redis.hincrby("usage:2026-09-27", "site|/", 50);

    const admin = await call("GET", "/admin/api-usage?days=30");
    expect(admin.body).toMatchObject({ from: "2026-08-29", to: "2026-09-27", days: 30 });
    expect(admin.body.byClient[client].total).toBe(7);
    expect(admin.body.anonymous[0]).toMatchObject({ userAgent: "ArboitePanel/1.0", total: 295 });
    expect(admin.body.site.total).toBe(50);

    const own = await call("GET", "/admin/api-usage?days=30&ownerUid=uid-1");
    expect(Object.keys(own.body.byClient)).toEqual([client]);
    expect(own.body.anonymous).toBeUndefined();
    expect(own.body.site).toBeUndefined();
  });

  it("GET /usage cuenta lo consumido sin sumar otro pedido", async () => {
    const { call, redis } = await start();
    await redis.multi().incr(`rl:m:ip:1.2.3.4:${Math.floor(NOW.getTime() / 60000)}`).incr("rl:d:ip:1.2.3.4:2026-09-27").exec();
    // Sin middleware delante, /usage contesta el plan anónimo sin contadores.
    const res = await call("GET", "/usage", undefined, {});
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ client: "anonymous", plan: "anonymous", used: null, docs: "https://cambio-uruguay.com/empresas" });
    expect(res.headers.get("cache-control")).toBe("private, no-store");
  });
});

describe("escapeMarkdown", () => {
  it("escapa los caracteres que rompen el Markdown de Telegram", () => {
    expect(escapeMarkdown("a_b*c`d[e")).toBe("a\\_b\\*c\\`d\\[e");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/apikeys/routes.test.ts`
Expected: FAIL — cannot resolve `../../classes/apikeys/routes`.

- [ ] **Step 3: Implement `classes/apikeys/routes.ts`**

```ts
// Rutas de las claves de API: administración (`/admin/*`, con token) y `GET /usage` (pública).
//
// Las de administración las llama SÓLO el servidor del app (app/server/utils/apiAdmin.ts) con
// `X-Admin-Token = API_ADMIN_TOKEN`; el navegador nunca ve el token. Cuando el app pide en nombre de
// un usuario manda su `ownerUid`, y eso ACOTA: sólo sus claves, sólo revocar o renombrar, sólo su
// uso. Sin `ownerUid` es el dueño del sitio: cambia planes y ve a los anónimos.
import { timingSafeEqual } from "crypto";
import type { Application, NextFunction, Request, RequestHandler, Response } from "express";
import { readCounts, readUsage, type RedisLike } from "./counters";
import { DOCS_URL, type ApiClientInfo } from "./middleware";
import { limitsForJson } from "./plans";
import { TooManyKeysError, type ApiKeyRecord, type KeyStore } from "./store";
import { rankAnonymous, rowsFromHash, summarize, type UsageDaysRepo, type UsageRow } from "./usage";
import { MAX_ACTIVE_PER_OWNER, validateNewKey, validatePatch } from "./validate";
import { dayMinus, montevideoDay, windowKeys } from "./window";

export interface RouteDeps {
  store: () => KeyStore;
  usageRepo: () => UsageDaysRepo;
  redis: () => RedisLike | null;
  notify: (text: string) => Promise<boolean>;
  env?: NodeJS.ProcessEnv;
  now?: () => Date;
}

export function escapeMarkdown(text: string): string {
  return String(text).replace(/[_*`[]/g, (c) => `\\${c}`);
}

export function adminAuth(env: NodeJS.ProcessEnv = process.env): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    const expected = String(env.API_ADMIN_TOKEN || "");
    if (!expected) {
      return res.status(503).json({ error: "admin_disabled", message: "API_ADMIN_TOKEN no está configurado." });
    }
    const given = Buffer.from(String(req.headers["x-admin-token"] || ""));
    const wanted = Buffer.from(expected);
    if (given.length !== wanted.length || !timingSafeEqual(given, wanted)) {
      return res.status(401).json({ error: "unauthorized" });
    }
    res.setHeader("Cache-Control", "private, no-store");
    return next();
  };
}

function newKeyMessage(record: ApiKeyRecord): string {
  const lines = [
    "*Nueva clave de la API*",
    `Empresa: ${escapeMarkdown(record.company)}`,
    `Uso: ${escapeMarkdown(record.useCase)}`,
    `Clave: ${escapeMarkdown(record.label)} (${escapeMarkdown(record.prefix)}…)`,
  ];
  if (record.website) lines.push(`Sitio: ${escapeMarkdown(record.website)}`);
  if (record.ownerEmail) lines.push(`Correo: ${escapeMarkdown(record.ownerEmail)}`);
  return lines.join("\n");
}

function fail(res: Response, e: unknown) {
  console.error("[apikeys] ruta de administración:", (e as Error)?.message || e);
  return res.status(500).json({ error: "internal", message: "No se pudo completar la operación." });
}

export function registerApiKeyRoutes(app: Application, deps: RouteDeps): void {
  const auth = adminAuth(deps.env ?? process.env);
  const now = deps.now ?? (() => new Date());

  app.post("/admin/api-keys", auth, async (req, res) => {
    const parsed = validateNewKey(req.body);
    if (!parsed.ok) return res.status(400).json({ error: "invalid_input", message: parsed.error });
    try {
      const { record, plaintext } = await deps.store().create(parsed.value);
      void deps.notify(newKeyMessage(record)).catch(() => false);
      return res.status(201).json({ key: plaintext, apiKey: record });
    } catch (e) {
      if (e instanceof TooManyKeysError) {
        return res.status(409).json({
          error: "too_many_keys",
          message: `Hay un tope de ${MAX_ACTIVE_PER_OWNER} claves activas por cuenta. Revocá una para crear otra.`,
        });
      }
      return fail(res, e);
    }
  });

  app.get("/admin/api-keys", auth, async (req, res) => {
    try {
      const ownerUid = typeof req.query.ownerUid === "string" && req.query.ownerUid ? req.query.ownerUid : undefined;
      return res.json({ keys: await deps.store().list(ownerUid) });
    } catch (e) {
      return fail(res, e);
    }
  });

  app.patch("/admin/api-keys/:id", auth, async (req, res) => {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const ownerUid = typeof body.ownerUid === "string" && body.ownerUid ? body.ownerUid : undefined;
    const { ownerUid: _ignored, ...rest } = body;
    const parsed = validatePatch(rest, Boolean(ownerUid));
    if (!parsed.ok) return res.status(400).json({ error: "invalid_input", message: parsed.error });
    try {
      const updated = await deps.store().update(String(req.params.id), parsed.value, ownerUid);
      if (!updated) return res.status(404).json({ error: "not_found", message: "No existe esa clave." });
      return res.json({ apiKey: updated });
    } catch (e) {
      return fail(res, e);
    }
  });

  app.get("/admin/api-usage", auth, async (req, res) => {
    try {
      const days = Math.min(40, Math.max(1, Number.parseInt(String(req.query.days ?? "30"), 10) || 30));
      const ownerUid = typeof req.query.ownerUid === "string" && req.query.ownerUid ? req.query.ownerUid : undefined;
      const today = montevideoDay(now());
      const from = dayMinus(today, days - 1);
      const repo = deps.usageRepo();
      const rows: UsageRow[] = days > 1 ? await repo.readRange(from, dayMinus(today, 1)) : [];
      const redis = deps.redis();
      let todayRows: UsageRow[] | null = null;
      if (redis) {
        try {
          todayRows = rowsFromHash(today, await readUsage(redis, today));
        } catch {
          todayRows = null;
        }
      }
      rows.push(...(todayRows ?? (await repo.readRange(today, today))));

      if (ownerUid) {
        const own = new Set((await deps.store().list(ownerUid)).map((r) => `key:${r.id}`));
        const summary = summarize(rows.filter((r) => own.has(r.client)), today);
        return res.json({ from, to: today, days, byClient: summary });
      }
      const summary = summarize(rows, today);
      return res.json({
        from,
        to: today,
        days,
        byClient: Object.fromEntries(Object.entries(summary).filter(([c]) => c.startsWith("key:"))),
        anonymous: rankAnonymous(summary),
        site: summary.site ?? null,
      });
    } catch (e) {
      return fail(res, e);
    }
  });

  app.get("/usage", async (_req, res) => {
    const client = res.locals.apiClient as ApiClientInfo | undefined;
    const keys = windowKeys(now());
    const redis = deps.redis();
    const used = client?.subject && redis ? await readCounts(redis, client.subject, keys) : null;
    res.setHeader("Cache-Control", "private, no-store");
    return res.json({
      client: client?.kind ?? "anonymous",
      plan: client?.plan ?? "anonymous",
      keyPrefix: client?.keyPrefix ?? null,
      limits: client?.limits ? limitsForJson(client.limits) : null,
      used,
      resetsAt: { minute: keys.minuteResetsAt.toISOString(), day: keys.dayResetsAt.toISOString() },
      docs: DOCS_URL,
    });
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/apikeys/routes.test.ts`
Expected: PASS (8 tests). If `fetch` is missing in the Node version (Node < 18), stop and report: the VPS runs Node 22 and the repo requires ≥ 18.

- [ ] **Step 5: Implement `classes/apikeys/mongo.ts`**

```ts
// Los modelos de Mongo (base del backend, `MONGODB_URI`) de las claves de API y del uso diario.
// Separado de store.ts para que los tests no importen mongoose: el store recibe el modelo.
import { MongooseServer, Schema } from "../database";
import { createKeyStore, type KeyModel, type KeyStore } from "./store";
import type { UsageDaysRepo, UsageRow } from "./usage";

const keySchema = new Schema(
  {
    keyHash: { type: String, required: true, unique: true },
    prefix: String,
    label: String,
    ownerUid: { type: String, index: true },
    ownerEmail: String,
    company: String,
    useCase: String,
    website: String,
    plan: String,
    limits: Schema.Types.Mixed,
    status: String,
    createdAt: Date,
    revokedAt: Date,
    lastUsedAt: Date,
    notes: String,
  },
  { collection: "api_keys", versionKey: false }
);

const usageSchema = new Schema(
  { day: String, client: String, route: String, count: Number },
  { collection: "api_usage_days", versionKey: false }
);
usageSchema.index({ day: 1, client: 1, route: 1 }, { unique: true });

let keyStore: KeyStore | null = null;

export function apiKeyStore(): KeyStore {
  if (!keyStore) {
    const model = MongooseServer.getInstance("api_keys", keySchema).getModel();
    keyStore = createKeyStore(model as unknown as KeyModel);
  }
  return keyStore;
}

export function usageDaysRepo(): UsageDaysRepo {
  const model = MongooseServer.getInstance("api_usage_days", usageSchema).getModel();
  return {
    async upsertDay(day: string, rows: UsageRow[]) {
      if (!rows.length) return 0;
      await model.bulkWrite(
        rows.map((r) => ({
          updateOne: {
            filter: { day, client: r.client, route: r.route },
            update: { $set: { count: r.count } },
            upsert: true,
          },
        })),
        { ordered: false }
      );
      return rows.length;
    },
    async readRange(from: string, to: string) {
      const docs = await model.find({ day: { $gte: from, $lte: to } }, { _id: 0, day: 1, client: 1, route: 1, count: 1 }).lean();
      return (docs as any[]).map((d) => ({ day: d.day, client: d.client, route: d.route, count: Number(d.count) || 0 }));
    },
  };
}
```

- [ ] **Step 6: Wire into `index.ts`**

Add imports next to the other `./classes/...` imports (after `import { redisCache } from "./classes/redis_cache";`):

```ts
import { createApiKeyMiddleware } from "./classes/apikeys/middleware";
import { apiKeyStore, usageDaysRepo } from "./classes/apikeys/mongo";
import { adminAuth, registerApiKeyRoutes } from "./classes/apikeys/routes";
import type { RedisLike } from "./classes/apikeys/counters";
import { notifyAdmin } from "./classes/notify";
```

If `notifyAdmin` is already imported in `index.ts`, do not import it twice (check with `grep -n "notifyAdmin" index.ts`).

Replace the line `  console.log("Start express");` (right after the Redis connect block inside `main`) with:

```ts
  console.log("Start express");

  // Claves de API, planes y medidor de uso (classes/apikeys/, docs/api/API_KEYS.md). Va antes de
  // la primera ruta y después de CORS, así el preflight nunca llega. La API no exige clave: la usa
  // para identificar, medir y dar el plan de cada cliente.
  const apiKeyRedis = () => redisCache.getClient() as unknown as RedisLike | null;
  server.getApp().use(
    createApiKeyMiddleware({ redis: apiKeyRedis, lookup: (hash) => apiKeyStore().findActiveByHash(hash) })
  );
  registerApiKeyRoutes(server.getApp(), {
    store: apiKeyStore,
    usageRepo: usageDaysRepo,
    redis: apiKeyRedis,
    notify: (text) => notifyAdmin(text),
  });

  /**
   * @openapi
   * /usage:
   *   get:
   *     tags:
   *       - Health
   *     summary: Tu plan y tu consumo
   *     description: |
   *       Con una clave (`X-API-Key`, `Authorization: Bearer cu_…` o `?api_key=`) devuelve su plan,
   *       sus límites y lo consumido en este minuto y en el día (Montevideo). Sin clave, el plan
   *       anónimo. Claves gratuitas en https://cambio-uruguay.com/empresas.
   *     responses:
   *       200:
   *         description: Plan, límites y consumo
   */
```

Replace the whole `server.postJson("cache/flush", ...)` block (keep its `@openapi` comment above it, and add one line to that comment's `description`: `Requiere la cabecera X-Admin-Token.`) with:

```ts
  server.getApp().post("/cache/flush", adminAuth(), async (_req: Request, res: Response) => {
    const deleted = await redisCache.flushAll();
    res.json({ flushed: true, keysDeleted: deleted });
  });
```

- [ ] **Step 7: Declare the optional key in `swagger/config.ts`**

Inside `components` (next to `schemas`, `parameters`, `responses`) add:

```ts
    securitySchemes: {
      ApiKeyAuth: {
        type: 'apiKey',
        in: 'header',
        name: 'X-API-Key',
        description:
          'Opcional. Sin clave la API funciona con el techo anónimo; con clave te identifica, mide tu uso y aplica tu plan. También se acepta `Authorization: Bearer cu_…` o `?api_key=`. Claves en https://cambio-uruguay.com/empresas.',
      },
    },
```

And at the top level of `swaggerDefinition` (next to `servers`), add — `{}` first means "sin clave también vale":

```ts
  security: [{}, { ApiKeyAuth: [] }],
```

Match the quote style already used in `swagger/config.ts` (single quotes if the file uses them).

- [ ] **Step 8: Type-check and run the backend suite**

Run: `npx tsc -p tsconfig.json --noEmit 2>&1 | grep -E "classes/apikeys|index.ts|sync_api_usage|swagger" ; echo done`
Expected: no lines before `done` (errors elsewhere in the repo, if any pre-exist, are not ours — compare with `git stash`-free check: run the same command on `origin/main` only if in doubt).

Run: `npx vitest run tests/apikeys/ tests/no_scheduler_in_api.test.ts`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add classes/apikeys/routes.ts classes/apikeys/mongo.ts index.ts swagger/config.ts tests/apikeys/routes.test.ts
git commit -m "feat(apikeys): rutas de administración, GET /usage y cableado en la API

POST /cache/flush pasa a exigir X-Admin-Token: hasta hoy cualquiera
podía vaciar la caché de Redis.

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 6: Job `currency-api-usage`, registro pm2 y documentación del backend

**Files:**
- Create: `classes/apikeys/persist.ts`, `sync_api_usage.ts`, `docs/api/API_KEYS.md`
- Modify: `ecosystem.config.js` (new app), `scripts/deploy-backend.sh` (`OTHER_APPS`), `AGENTS.md` (pm2 table row + key-files mention)
- Test: `tests/apikeys/persist.test.ts`

**Interfaces:**
- Consumes: `readUsage`, `RedisLike` (Task 3); `rowsFromHash`, `UsageDaysRepo` (Task 3); `KeyStore` (Task 3); `montevideoDay`, `dayMinus` (Task 1); `apiKeyStore`, `usageDaysRepo` (Task 5).
- Produces: `persistUsage(deps: { redis: RedisLike; repo: UsageDaysRepo; store: Pick<KeyStore, "touchLastUsed">; now: Date }): Promise<{ days: string[]; rows: number; keysTouched: number }>`; pm2 app `currency-api-usage` (`dist/sync_api_usage.js`, cron `7 * * * *`).

- [ ] **Step 1: Write the failing test `tests/apikeys/persist.test.ts`**

```ts
import { describe, expect, it, vi } from "vitest";
import { persistUsage } from "../../classes/apikeys/persist";
import type { UsageDaysRepo, UsageRow } from "../../classes/apikeys/usage";
import { FakeRedis } from "./fakes";

function repo() {
  const table = new Map<string, UsageRow>();
  const r: UsageDaysRepo & { table: Map<string, UsageRow> } = {
    table,
    async upsertDay(day, rows) {
      for (const row of rows) table.set(`${day}|${row.client}|${row.route}`, row);
      return rows.length;
    },
    async readRange() {
      return [...table.values()];
    },
  };
  return r;
}

describe("copia del medidor a Mongo", () => {
  it("copia ayer y hoy, y correrla dos veces no duplica", async () => {
    const redis = new FakeRedis();
    await redis.hincrby("usage:2026-09-26", "ua:ArboitePanel/1.0|/exchange/la_favorita", 290);
    await redis.hincrby("usage:2026-09-27", "key:000000000000000000000001|/regional", 7);
    const target = repo();
    const touchLastUsed = vi.fn(async () => undefined);
    const now = new Date("2026-09-27T15:07:00Z");

    const first = await persistUsage({ redis, repo: target, store: { touchLastUsed }, now });
    const second = await persistUsage({ redis, repo: target, store: { touchLastUsed }, now });

    expect(first).toEqual({ days: ["2026-09-26", "2026-09-27"], rows: 2, keysTouched: 1 });
    expect(second.rows).toBe(2);
    expect(target.table.size).toBe(2);
    expect(target.table.get("2026-09-26|ua:ArboitePanel/1.0|/exchange/la_favorita")?.count).toBe(290);
    expect(touchLastUsed).toHaveBeenCalledWith(["000000000000000000000001"], now);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/apikeys/persist.test.ts`
Expected: FAIL — cannot resolve `../../classes/apikeys/persist`.

- [ ] **Step 3: Implement `classes/apikeys/persist.ts`**

```ts
// Copia el medidor de uso de Redis (hash `usage:<día>`) a Mongo (`api_usage_days`). Lo corre el job
// `currency-api-usage` cada hora, fuera de la API (cluster ×2: nada programado vive ahí).
//
// Copia AYER y HOY con el valor completo del día (upsert con $set, no $inc), así que correrlo dos
// veces no duplica y una corrida perdida la completa la siguiente. Redis guarda 40 días.
import { readUsage, type RedisLike } from "./counters";
import type { KeyStore } from "./store";
import { rowsFromHash, type UsageDaysRepo } from "./usage";
import { dayMinus, montevideoDay } from "./window";

export async function persistUsage(deps: {
  redis: RedisLike;
  repo: UsageDaysRepo;
  store: Pick<KeyStore, "touchLastUsed">;
  now: Date;
}): Promise<{ days: string[]; rows: number; keysTouched: number }> {
  const today = montevideoDay(deps.now);
  const days = [dayMinus(today, 1), today];
  let rows = 0;
  const keyIds = new Set<string>();
  for (const day of days) {
    const dayRows = rowsFromHash(day, await readUsage(deps.redis, day));
    rows += await deps.repo.upsertDay(day, dayRows);
    if (day === today) {
      for (const row of dayRows) if (row.client.startsWith("key:")) keyIds.add(row.client.slice(4));
    }
  }
  await deps.store.touchLastUsed([...keyIds], deps.now);
  return { days, rows, keysTouched: keyIds.size };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/apikeys/persist.test.ts`
Expected: PASS.

- [ ] **Step 5: Create the entrypoint `sync_api_usage.ts`**

```ts
// Copia horaria del medidor de uso de la API (pm2 `currency-api-usage`, minuto 7 de cada hora):
// Redis `usage:<día>` → Mongo `api_usage_days`, y `lastUsedAt` de cada clave con uso hoy.
// Ver classes/apikeys/persist.ts y docs/api/API_KEYS.md.
import dotenv from "dotenv";
dotenv.config();

import type { RedisLike } from "./classes/apikeys/counters";
import { apiKeyStore, usageDaysRepo } from "./classes/apikeys/mongo";
import { persistUsage } from "./classes/apikeys/persist";
import { MongooseServer, withTimeout } from "./classes/database";
import { redisCache } from "./classes/redis_cache";

async function main(): Promise<void> {
  try {
    await withTimeout(MongooseServer.startConnectionPromise(), 15000);
  } catch (e: any) {
    console.error("[api-usage] no se pudo conectar a MongoDB:", e?.message || e);
    process.exit(1);
  }
  await redisCache.connect();
  const redis = redisCache.getClient() as unknown as RedisLike | null;
  if (!redis) {
    console.error("[api-usage] Redis no disponible: no hay medidor para copiar");
    process.exit(1);
  }
  const result = await persistUsage({ redis, repo: usageDaysRepo(), store: apiKeyStore(), now: new Date() });
  console.log(`[api-usage] ${result.days.join(" y ")}: ${result.rows} filas, ${result.keysTouched} claves con uso hoy`);
  await redisCache.disconnect();
  process.exit(0);
}

main().catch((e) => {
  console.error("[api-usage] falló la copia", e);
  process.exit(1);
});
```

- [ ] **Step 6: Register the pm2 app**

In `ecosystem.config.js`, add this object right after the `currency-motos-hourly` entry (before the next `{`):

```js
    {
      // Medidor de uso de la API (claves de empresas, classes/apikeys/): copia el hash de Redis de
      // ayer y de hoy a Mongo `api_usage_days` y anota el último uso de cada clave. Fuera de la API
      // porque currency-server es cluster ×2 y nada programado puede vivir adentro.
      name: "currency-api-usage",
      autorestart: false,
      exec_mode: "fork",
      script: "dist/sync_api_usage.js",
      cron_restart: "7 * * * *",
      log_date_format: "YYYY-MM-DD HH:mm Z",
    },
```

In `scripts/deploy-backend.sh` line 51, append ` currency-api-usage` right before the closing `)` of `OTHER_APPS=(...)`.

- [ ] **Step 7: Run the registration and scheduler tripwires**

Run: `npx vitest run tests/sync/pm2_registration.test.ts tests/no_scheduler_in_api.test.ts`
Expected: PASS.

- [ ] **Step 8: Write `docs/api/API_KEYS.md`**

```markdown
# Claves de la API para empresas

Diseño: `docs/superpowers/specs/2026-09-27-api-empresas-claves-design.md`. Código: `classes/apikeys/`.

## Qué hace

- La API **no exige clave**. Con clave (`X-API-Key`, `Authorization: Bearer cu_…` o `?api_key=`)
  identifica al cliente, mide su uso y le aplica su plan.
- Planes (`classes/apikeys/plans.ts`): sin clave 600/min y 20.000/día por IP; `free` igual;
  `business` 3.000/min y 500.000/día; `internal` sin límite. Cada número se pisa con
  `API_LIMIT_<PLAN>_PER_MINUTE|PER_DAY` en el `.env` de la raíz (y `pm2 reload currency-server
  --update-env`). Una clave puede tener límites propios (`limits`) que pisan los del plan.
- Nunca limitados: IP interna (`127.0.0.1`, `::1` y `API_INTERNAL_IPS`) y lectores del sitio
  (`Origin`/`Referer` de cambio-uruguay.com, medidos juntos como `site`).
- Cabeceras: `X-Plan`, `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`; 429 con
  `Retry-After`. `GET /usage` devuelve plan, límites y consumo.

## Dónde vive cada cosa

| qué | dónde |
|---|---|
| claves (sólo hash SHA-256 + prefijo) | Mongo del backend, `api_keys` |
| contadores de límite (con IP, 3 días) | Redis `cambio:rl:m:*`, `cambio:rl:d:*` |
| medidor por cliente y ruta (sin IP, 40 días) | Redis `cambio:usage:<día>` |
| uso histórico | Mongo del backend, `api_usage_days` (job `currency-api-usage`, minuto 7) |

## Configuración

- Raíz `.env`: `API_ADMIN_TOKEN` (32 bytes aleatorios), `API_INTERNAL_IPS=104.234.204.107`.
- `app/.env`: `NUXT_API_ADMIN_TOKEN` con el mismo valor. Se hornea en el build del app.
- Sin `API_ADMIN_TOKEN` las rutas `/admin/*` y `POST /cache/flush` responden 503; el resto de la
  API sigue igual.

## Operación

- Altas: cualquier cuenta del sitio en `/cuenta?tab=api` (tope de 3 activas). Llega un Telegram por
  cada alta (`TELEGRAM_ADMIN_CHAT_ID`).
- Cambiar el plan: `/cuenta?tab=api` con una cuenta de `NUXT_ADMIN_EMAILS` (panel "Clientes de la
  API"). O por consola:
  `curl -X PATCH -H "X-Admin-Token: $API_ADMIN_TOKEN" -H 'content-type: application/json' -d '{"plan":"business"}' http://127.0.0.1:3528/admin/api-keys/<id>`
- Quién usa la API sin clave: el mismo panel, tabla "Sin clave", o
  `curl -H "X-Admin-Token: $API_ADMIN_TOKEN" 'http://127.0.0.1:3528/admin/api-usage?days=7'`.
- Un cambio de plan rige ya en la instancia que lo recibe y en ≤ 60 s en la otra (caché por proceso).

## Qué no hace (todavía)

Cobrar, facturar, exigir clave o endurecer el techo anónimo. Endurecerlo se decide con los datos
de `api_usage_days` y se avisa en `/empresas` con 30 días.
```

- [ ] **Step 9: Add the pm2 row to `AGENTS.md`**

In the pm2 table of `AGENTS.md`, add a row right after the `currency-motos / -hourly` row:

```markdown
| currency-api-usage | dist/sync_api_usage.js | 7 * * * * | medidor de la API para empresas: copia el hash `usage:<día>` de Redis (ayer y hoy, upsert idempotente) a Mongo `api_usage_days` y anota `lastUsedAt` de cada clave. Las claves (`api_keys`, sólo hash SHA-256), los planes y el middleware viven en `classes/apikeys/`; el middleware se registra en `index.ts` antes de la primera ruta, **la API no exige clave** (la usa para identificar, medir y aplicar el plan) y nunca limita a IP internas ni a lectores del sitio. El medidor no guarda IP. Rutas `/admin/*` y `POST /cache/flush` con `X-Admin-Token` (`API_ADMIN_TOKEN`). Ver `docs/api/API_KEYS.md` |
```

And in the `classes/` key-files paragraph, add `apikeys` to the per-feature dirs list (alphabetical, before `autos`).

- [ ] **Step 10: Commit**

```bash
git add classes/apikeys/persist.ts sync_api_usage.ts ecosystem.config.js scripts/deploy-backend.sh docs/api/API_KEYS.md AGENTS.md tests/apikeys/persist.test.ts
git commit -m "feat(apikeys): job currency-api-usage que copia el medidor a Mongo

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 7: App — utilidades, token de administración y rutas de servidor

**Files:**
- Create: `app/utils/apiKeys.ts`, `app/server/utils/apiAdmin.ts`, `app/server/api/me/api-keys/index.get.ts`, `app/server/api/me/api-keys/index.post.ts`, `app/server/api/me/api-keys/[id].delete.ts`, `app/server/api/admin/api-clients.get.ts`, `app/server/api/admin/api-clients/[id].patch.ts`
- Modify: `app/nuxt.config.ts` (`runtimeConfig.apiAdminToken`), `.github/workflows/deploy.yml` (`appContracts` += `classes/apikeys/plans.ts`, `classes/apikeys/validate.ts`)
- Test: `app/tests/unit/apiPlansParity.test.ts`, `app/tests/unit/apiKeysRoutes.test.ts`

**Interfaces:**
- Consumes (HTTP, from Task 5): `GET /admin/api-keys?ownerUid=` → `{ keys: ApiKeyRecord[] }`; `POST /admin/api-keys` → `{ key, apiKey }`; `PATCH /admin/api-keys/:id` → `{ apiKey }`; `GET /admin/api-usage?days=&ownerUid=` → `ApiUsageResponse`.
- Produces:
  - `app/utils/apiKeys.ts`: `type ApiPlanId`, `API_PLAN_LIMITS`, `API_PLAN_LABELS`, `ASSIGNABLE_PLANS`, `MAX_KEYS_PER_ACCOUNT`, `FIELD_LIMITS`, `interface ApiKeyRecord`, `interface ClientSummary`, `interface AnonymousLead`, `interface ApiUsageResponse`, `formatCount(n)`, `formatDay(iso)`, `keyUsage(usage, id)`, `API_PUBLIC_BASE`, `curlExample(credential)`, `API_CONTACT_EMAIL`
  - `app/server/utils/apiAdmin.ts`: `apiAdminFetch<T>(path, opts?: { method?; body?; query? }): Promise<T>`
  - HTTP (app): `GET /api/me/api-keys` → `{ keys, usage }`; `POST /api/me/api-keys` → `{ key, apiKey }`; `DELETE /api/me/api-keys/:id` → `{ ok: true }`; `GET /api/admin/api-clients` → `{ keys, usage }`; `PATCH /api/admin/api-clients/:id` → `{ apiKey }`

- [ ] **Step 1: Write the failing parity test `app/tests/unit/apiPlansParity.test.ts`**

```ts
import { describe, expect, it } from 'vitest'
// Vive en la suite del APP a propósito: la raíz no puede importar app/ (ver storeConstantsParity).
import { DEFAULT_PLAN_LIMITS } from '../../../classes/apikeys/plans'
import { FIELD_LIMITS as API_FIELD_LIMITS, MAX_ACTIVE_PER_OWNER } from '../../../classes/apikeys/validate'
import { API_PLAN_LIMITS, FIELD_LIMITS, MAX_KEYS_PER_ACCOUNT } from '../../utils/apiKeys'

// /empresas y el formulario de alta muestran estos números; la API es la que los aplica. Si
// cambian de un lado y no del otro, la página promete una cuota que la API no da.
describe('planes de la API: la página y la API dicen lo mismo', () => {
  it('los techos de cada plan', () => {
    for (const plan of ['anonymous', 'free', 'business'] as const) {
      expect(API_PLAN_LIMITS[plan], plan).toEqual({ ...DEFAULT_PLAN_LIMITS[plan] })
    }
  })

  it('el tope de claves y los largos del formulario', () => {
    expect(MAX_KEYS_PER_ACCOUNT).toBe(MAX_ACTIVE_PER_OWNER)
    for (const field of ['label', 'company', 'useCase', 'website'] as const) {
      expect(FIELD_LIMITS[field], field).toEqual({ ...API_FIELD_LIMITS[field] })
    }
  })
})
```

- [ ] **Step 2: Write the failing routes test `app/tests/unit/apiKeysRoutes.test.ts`**

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { installNitroGlobals } from './helpers/nitro'

const requireUser = vi.fn()
const requireAdmin = vi.fn()
const fetchMock = vi.fn()
const setResponseHeader = vi.fn()
vi.mock('../../server/utils/auth', () => ({ requireUser }))
vi.mock('../../server/utils/requireAdmin', () => ({ requireAdmin }))
vi.stubGlobal('$fetch', fetchMock)
vi.stubGlobal('setResponseHeader', setResponseHeader)

const { readBody, getRouterParam, useRuntimeConfig } = installNitroGlobals()

const listH = (await import('../../server/api/me/api-keys/index.get')).default
const createH = (await import('../../server/api/me/api-keys/index.post')).default
const revokeH = (await import('../../server/api/me/api-keys/[id].delete')).default
const adminListH = (await import('../../server/api/admin/api-clients.get')).default
const adminPatchH = (await import('../../server/api/admin/api-clients/[id].patch')).default

const ADMIN = 'z'.repeat(40)
const ID = 'a'.repeat(24)

beforeEach(() => {
  ;[requireUser, requireAdmin, fetchMock, setResponseHeader, readBody, getRouterParam].forEach(m => m.mockReset())
  useRuntimeConfig.mockImplementation(() => ({ apiAdminToken: ADMIN, apiBaseServer: 'http://api.test' }))
  requireUser.mockResolvedValue({ uid: 'uid-1', email: 'ana@empresa.uy' })
  requireAdmin.mockResolvedValue({ uid: 'admin', email: 'admin@cambio-uruguay.com' })
})

describe('claves propias', () => {
  it('lista sólo las del usuario, con su uso, y nunca expone el token', async () => {
    fetchMock.mockResolvedValueOnce({ keys: [{ id: ID }] }).mockResolvedValueOnce({ byClient: {} })
    const res = await listH({} as any)
    expect(fetchMock).toHaveBeenNthCalledWith(1, 'http://api.test/admin/api-keys', expect.objectContaining({
      query: { ownerUid: 'uid-1' },
      headers: { 'x-admin-token': ADMIN },
    }))
    expect(fetchMock).toHaveBeenNthCalledWith(2, 'http://api.test/admin/api-usage', expect.objectContaining({
      query: { ownerUid: 'uid-1', days: 30 },
    }))
    expect(res).toEqual({ keys: [{ id: ID }], usage: { byClient: {} } })
    expect(JSON.stringify(res)).not.toContain(ADMIN)
    expect(setResponseHeader).toHaveBeenCalledWith({}, 'cache-control', 'private, no-store')
  })

  it('crea con el uid y el correo de la sesión, nunca los del cuerpo, y exige aceptar condiciones', async () => {
    readBody.mockResolvedValueOnce({ label: 'Pantalla', company: 'Cambio', useCase: 'Pizarra del local', acceptTerms: false })
    await expect(createH({} as any)).rejects.toMatchObject({ statusCode: 400 })

    readBody.mockResolvedValueOnce({
      label: 'Pantalla', company: 'Cambio', useCase: 'Pizarra del local', website: '', acceptTerms: true,
      ownerUid: 'otro', plan: 'business',
    })
    fetchMock.mockResolvedValueOnce({ key: 'cu_x', apiKey: { id: ID } })
    await createH({} as any)
    expect(fetchMock).toHaveBeenCalledWith('http://api.test/admin/api-keys', expect.objectContaining({
      method: 'POST',
      body: { ownerUid: 'uid-1', ownerEmail: 'ana@empresa.uy', label: 'Pantalla', company: 'Cambio', useCase: 'Pizarra del local', website: '' },
    }))
  })

  it('revoca con el uid de la sesión y sólo manda status', async () => {
    getRouterParam.mockReturnValueOnce(ID)
    fetchMock.mockResolvedValueOnce({ apiKey: { id: ID, status: 'revoked' } })
    expect(await revokeH({} as any)).toEqual({ ok: true })
    expect(fetchMock).toHaveBeenCalledWith(`http://api.test/admin/api-keys/${ID}`, expect.objectContaining({
      method: 'PATCH',
      body: { ownerUid: 'uid-1', status: 'revoked' },
    }))
    getRouterParam.mockReturnValueOnce('../../admin')
    await expect(revokeH({} as any)).rejects.toMatchObject({ statusCode: 400 })
  })

  it('traduce los errores de la API: 409 pasa con su mensaje, un 500 se vuelve 502', async () => {
    readBody.mockResolvedValue({ label: 'P', company: 'Cambio', useCase: 'Pizarra del local', acceptTerms: true })
    fetchMock.mockRejectedValueOnce(Object.assign(new Error('x'), { statusCode: 409, data: { error: 'too_many_keys', message: 'Hay un tope de 3 claves' } }))
    await expect(createH({} as any)).rejects.toMatchObject({ statusCode: 409, statusMessage: 'Hay un tope de 3 claves' })
    fetchMock.mockRejectedValueOnce(Object.assign(new Error('x'), { statusCode: 500 }))
    await expect(createH({} as any)).rejects.toMatchObject({ statusCode: 502 })
  })

  it('sin token configurado responde 503 sin llamar a la API', async () => {
    useRuntimeConfig.mockImplementation(() => ({ apiAdminToken: '', apiBaseServer: 'http://api.test' }))
    await expect(listH({} as any)).rejects.toMatchObject({ statusCode: 503 })
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

describe('administración', () => {
  it('exige requireAdmin antes de llamar a la API', async () => {
    requireAdmin.mockRejectedValueOnce(Object.assign(new Error('Forbidden'), { statusCode: 403 }))
    await expect(adminListH({} as any)).rejects.toMatchObject({ statusCode: 403 })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('lista todo sin ownerUid', async () => {
    fetchMock.mockResolvedValueOnce({ keys: [] }).mockResolvedValueOnce({ byClient: {}, anonymous: [] })
    await adminListH({} as any)
    expect(fetchMock).toHaveBeenNthCalledWith(1, 'http://api.test/admin/api-keys', expect.objectContaining({ query: {} }))
  })

  it('cambia plan y notas, y nunca reenvía ownerUid', async () => {
    getRouterParam.mockReturnValueOnce(ID)
    readBody.mockResolvedValueOnce({ plan: 'business', notes: 'Factura', ownerUid: 'uid-1' })
    fetchMock.mockResolvedValueOnce({ apiKey: { id: ID, plan: 'business' } })
    await adminPatchH({} as any)
    expect(fetchMock).toHaveBeenCalledWith(`http://api.test/admin/api-keys/${ID}`, expect.objectContaining({
      method: 'PATCH',
      body: { plan: 'business', notes: 'Factura' },
    }))
  })
})
```

- [ ] **Step 3: Run tests to verify they fail**

Run (from `app/`): `npx vitest run tests/unit/apiPlansParity.test.ts tests/unit/apiKeysRoutes.test.ts`
Expected: FAIL — cannot resolve `../../utils/apiKeys` and the route modules.

Note: the worktree's `app/` has no `node_modules`. Before the first app test run: `cd app && npm install --force` (never `--legacy-peer-deps`; see AGENTS.md) and `npx nuxi prepare`. This is the worktree's own install, not the shared root.

- [ ] **Step 4: Implement `app/utils/apiKeys.ts`**

```ts
// Espejo en el app de lo que decide la API en classes/apikeys/: los planes con sus techos (para
// /empresas), los largos del formulario de alta y los tipos que devuelven las rutas de
// administración. La API valida y cuenta; esto sólo dibuja. apiPlansParity.test.ts ata los números.

export type ApiPlanId = 'anonymous' | 'free' | 'business' | 'internal'

export const API_PLAN_LIMITS = {
  anonymous: { perMinute: 600, perDay: 20_000 },
  free: { perMinute: 600, perDay: 20_000 },
  business: { perMinute: 3_000, perDay: 500_000 },
} as const

export const API_PLAN_LABELS: Record<ApiPlanId, string> = {
  anonymous: 'Sin clave',
  free: 'Gratis',
  business: 'Empresa',
  internal: 'Interno',
}

/** Planes que el administrador puede asignar a una clave. */
export const ASSIGNABLE_PLANS: ApiPlanId[] = ['free', 'business', 'internal']

export const MAX_KEYS_PER_ACCOUNT = 3

export const FIELD_LIMITS = {
  label: { min: 1, max: 40 },
  company: { min: 2, max: 80 },
  useCase: { min: 10, max: 500 },
  website: { min: 0, max: 200 },
} as const

export const API_PUBLIC_BASE = 'https://api.cambio-uruguay.com'
export const API_CONTACT_EMAIL = 'admin@cambio-uruguay.com'

export interface ApiKeyRecord {
  id: string
  prefix: string
  label: string
  ownerUid: string
  ownerEmail: string | null
  company: string
  useCase: string
  website: string | null
  plan: ApiPlanId
  limits: { perMinute?: number; perDay?: number } | null
  status: 'active' | 'revoked'
  createdAt: string
  revokedAt: string | null
  lastUsedAt: string | null
  notes: string | null
}

export interface ClientSummary {
  total: number
  last7: number
  routes: { route: string; count: number }[]
  daily: { day: string; count: number }[]
}

export interface AnonymousLead {
  userAgent: string
  total: number
  last7: number
  routes: { route: string; count: number }[]
}

export interface ApiUsageResponse {
  from: string
  to: string
  days: number
  byClient: Record<string, ClientSummary>
  anonymous?: AnonymousLead[]
  site?: ClientSummary | null
}

export function formatCount(n: number): string {
  return Math.round(n).toLocaleString('es-UY')
}

/** Fecha corta en Montevideo. Sólo se usa en componentes que cargan en el cliente. */
export function formatDay(iso: string): string {
  return new Date(iso).toLocaleDateString('es-UY', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'America/Montevideo',
  })
}

export function keyUsage(usage: ApiUsageResponse | null | undefined, id: string): ClientSummary | null {
  return usage?.byClient?.[`key:${id}`] ?? null
}

export function curlExample(credential: string): string {
  return `curl -H "X-API-Key: ${credential}" ${API_PUBLIC_BASE}/usage`
}
```

- [ ] **Step 5: Implement `app/server/utils/apiAdmin.ts`**

```ts
// Llamadas del servidor del app a las rutas de administración de la API (`/admin/*`), con el token
// compartido `NUXT_API_ADMIN_TOKEN` (= `API_ADMIN_TOKEN` del backend). SÓLO servidor: el token
// nunca viaja al navegador ni sale en una respuesta. Los 4xx de la API pasan con su mensaje (son
// del usuario: tope de claves, datos inválidos); cualquier otra cosa es un 502 del servicio.

interface AdminFetchOptions {
  method?: 'GET' | 'POST' | 'PATCH'
  body?: Record<string, unknown>
  query?: Record<string, string | number>
}

export async function apiAdminFetch<T>(path: string, opts: AdminFetchOptions = {}): Promise<T> {
  const config = useRuntimeConfig()
  const token = String(config.apiAdminToken || '')
  if (!token) {
    throw createError({ statusCode: 503, statusMessage: 'El servicio de claves no está configurado.' })
  }
  try {
    return (await $fetch(`${config.apiBaseServer}${path}`, {
      method: opts.method ?? 'GET',
      body: opts.body,
      query: opts.query,
      headers: { 'x-admin-token': token },
      timeout: 10_000,
    })) as T
  } catch (e: any) {
    const status = Number(e?.statusCode ?? e?.response?.status ?? 0)
    if (status >= 400 && status < 500 && status !== 401) {
      throw createError({ statusCode: status, statusMessage: e?.data?.message || 'Pedido inválido.' })
    }
    throw createError({ statusCode: 502, statusMessage: 'El servicio de claves no respondió. Probá de nuevo en un rato.' })
  }
}
```

(A 401 from the API means our own token is wrong — a server misconfiguration, so it becomes 502, never a "your session expired" to the user.)

- [ ] **Step 6: Implement the five server routes**

`app/server/api/me/api-keys/index.get.ts`:
```ts
// Las claves de la API de la cuenta en sesión, con su uso de 30 días. Privado y sin caché.
import type { ApiKeyRecord, ApiUsageResponse } from '../../../../utils/apiKeys'
import { apiAdminFetch } from '../../../utils/apiAdmin'
import { requireUser } from '../../../utils/auth'

export default defineEventHandler(async event => {
  const { uid } = await requireUser(event)
  setResponseHeader(event, 'cache-control', 'private, no-store')
  const { keys } = await apiAdminFetch<{ keys: ApiKeyRecord[] }>('/admin/api-keys', { query: { ownerUid: uid } })
  const usage = await apiAdminFetch<ApiUsageResponse>('/admin/api-usage', { query: { ownerUid: uid, days: 30 } })
  return { keys, usage }
})
```

`app/server/api/me/api-keys/index.post.ts`:
```ts
// Alta de una clave de la API para la cuenta en sesión. El dueño sale de la SESIÓN, nunca del
// cuerpo: el formulario no puede crear claves a nombre de otro ni pedir un plan.
import type { ApiKeyRecord } from '../../../../utils/apiKeys'
import { apiAdminFetch } from '../../../utils/apiAdmin'
import { requireUser } from '../../../utils/auth'

export default defineEventHandler(async event => {
  const { uid, email } = await requireUser(event)
  setResponseHeader(event, 'cache-control', 'private, no-store')
  const b = ((await readBody(event)) ?? {}) as Record<string, unknown>
  if (b.acceptTerms !== true) {
    throw createError({ statusCode: 400, statusMessage: 'Para crear una clave hay que aceptar las condiciones de uso.' })
  }
  const text = (v: unknown) => (typeof v === 'string' ? v : '')
  return apiAdminFetch<{ key: string; apiKey: ApiKeyRecord }>('/admin/api-keys', {
    method: 'POST',
    body: {
      ownerUid: uid,
      ownerEmail: email,
      label: text(b.label),
      company: text(b.company),
      useCase: text(b.useCase),
      website: text(b.website),
    },
  })
})
```

`app/server/api/me/api-keys/[id].delete.ts`:
```ts
// Revocar una clave propia. La API sólo actúa sobre claves de este `ownerUid` y sólo acepta
// revocar o renombrar cuando viene uno.
import { apiAdminFetch } from '../../../utils/apiAdmin'
import { requireUser } from '../../../utils/auth'

export default defineEventHandler(async event => {
  const { uid } = await requireUser(event)
  setResponseHeader(event, 'cache-control', 'private, no-store')
  const id = String(getRouterParam(event, 'id') || '')
  if (!/^[a-f0-9]{24}$/.test(id)) throw createError({ statusCode: 400, statusMessage: 'Clave inválida.' })
  await apiAdminFetch(`/admin/api-keys/${id}`, { method: 'PATCH', body: { ownerUid: uid, status: 'revoked' } })
  return { ok: true }
})
```

`app/server/api/admin/api-clients.get.ts`:
```ts
// Panel privado de clientes de la API: todas las claves, su uso y quién usa la API sin clave (los
// candidatos a un plan). Sólo NUXT_ADMIN_EMAILS, nunca cacheado en el borde.
import type { ApiKeyRecord, ApiUsageResponse } from '../../../utils/apiKeys'
import { apiAdminFetch } from '../../utils/apiAdmin'
import { requireAdmin } from '../../utils/requireAdmin'

export default defineEventHandler(async event => {
  await requireAdmin(event)
  setResponseHeader(event, 'cache-control', 'private, no-store')
  const { keys } = await apiAdminFetch<{ keys: ApiKeyRecord[] }>('/admin/api-keys', { query: {} })
  const usage = await apiAdminFetch<ApiUsageResponse>('/admin/api-usage', { query: { days: 30 } })
  return { keys, usage }
})
```

`app/server/api/admin/api-clients/[id].patch.ts`:
```ts
// El dueño del sitio cambia plan, límites, estado o notas de una clave. Nunca reenvía un
// `ownerUid`: con él la API acotaría el cambio a revocar o renombrar.
import type { ApiKeyRecord } from '../../../../utils/apiKeys'
import { apiAdminFetch } from '../../../utils/apiAdmin'
import { requireAdmin } from '../../../utils/requireAdmin'

const FIELDS = ['plan', 'limits', 'status', 'notes', 'label'] as const

export default defineEventHandler(async event => {
  await requireAdmin(event)
  setResponseHeader(event, 'cache-control', 'private, no-store')
  const id = String(getRouterParam(event, 'id') || '')
  if (!/^[a-f0-9]{24}$/.test(id)) throw createError({ statusCode: 400, statusMessage: 'Clave inválida.' })
  const b = ((await readBody(event)) ?? {}) as Record<string, unknown>
  const body: Record<string, unknown> = {}
  for (const field of FIELDS) if (b[field] !== undefined) body[field] = b[field]
  return apiAdminFetch<{ apiKey: ApiKeyRecord }>(`/admin/api-keys/${id}`, { method: 'PATCH', body })
})
```

- [ ] **Step 7: Declare `apiAdminToken` in `app/nuxt.config.ts`**

Right after the line `    driversIngestToken: process.env.NUXT_DRIVERS_INGEST_TOKEN || '',` (≈ line 1383) add:

```ts
    // Token compartido con la API (`API_ADMIN_TOKEN` del backend) para las rutas /admin/* de las
    // claves de empresas (server/utils/apiAdmin.ts). Sólo servidor; se hornea en el build.
    apiAdminToken: process.env.NUXT_API_ADMIN_TOKEN || '',
```

- [ ] **Step 8: Add the root files the parity test reads to `appContracts` in `.github/workflows/deploy.yml`**

Under `appContracts:` (next to `- 'classes/stores/**'`) add:

```yaml
              - 'classes/apikeys/plans.ts'
              - 'classes/apikeys/validate.ts'
```

- [ ] **Step 9: Run tests to verify they pass**

Run (from `app/`): `npx vitest run tests/unit/apiPlansParity.test.ts tests/unit/apiKeysRoutes.test.ts`
Expected: PASS (11 tests).

- [ ] **Step 10: Commit**

```bash
git add app/utils/apiKeys.ts app/server/utils/apiAdmin.ts app/server/api/me/api-keys app/server/api/admin/api-clients.get.ts app/server/api/admin/api-clients app/nuxt.config.ts .github/workflows/deploy.yml app/tests/unit/apiPlansParity.test.ts app/tests/unit/apiKeysRoutes.test.ts
git commit -m "feat(app): rutas de servidor de las claves de la API, con token sólo del servidor

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 8: Pestaña `api` de `/cuenta` con los dos paneles

**Files:**
- Create: `app/components/account/ApiKeysPanel.vue`, `app/components/account/ApiClientsAdminPanel.vue`
- Modify: `app/pages/cuenta/index.vue` (tab list, `VTab`, `VTabsWindowItem`)
- Test: `app/tests/unit/cuentaApiTab.test.ts`

**Interfaces:**
- Consumes: `app/utils/apiKeys.ts` (Task 7); `GET|POST /api/me/api-keys`, `DELETE /api/me/api-keys/:id`, `GET /api/admin/api-clients`, `PATCH /api/admin/api-clients/:id` (Task 7); `useAuthFetch()` (existing composable).
- Produces: components auto-imported as `<AccountApiKeysPanel />` and `<AccountApiClientsAdminPanel />`; `/cuenta?tab=api`.

- [ ] **Step 1: Write the failing source-level test `app/tests/unit/cuentaApiTab.test.ts`**

```ts
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const APP = join(__dirname, '..', '..')
const read = (p: string) => readFileSync(join(APP, p), 'utf8')

describe('pestaña api de /cuenta', () => {
  const page = read('pages/cuenta/index.vue')

  it('acepta ?tab=api y monta los dos paneles', () => {
    expect(page).toContain("['saved', 'favorites', 'alerts', 'api']")
    expect(page).toContain('<VTab value="api">API</VTab>')
    expect(page).toContain('<AccountApiKeysPanel />')
    expect(page).toContain('<AccountApiClientsAdminPanel />')
  })

  it('la clave nueva se muestra una vez y nunca se guarda en el navegador', () => {
    const panel = read('components/account/ApiKeysPanel.vue')
    expect(panel).toContain('no se vuelve a mostrar')
    expect(panel).not.toMatch(/localStorage|sessionStorage/)
    expect(panel).toContain("'/api/me/api-keys'")
  })

  it('el panel de administración se esconde ante 401/403 en vez de mostrar un error', () => {
    const admin = read('components/account/ApiClientsAdminPanel.vue')
    expect(admin).toContain('v-if="!forbidden"')
    expect(admin).toMatch(/status === 403 \|\| status === 401/)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run (from `app/`): `npx vitest run tests/unit/cuentaApiTab.test.ts`
Expected: FAIL — `ENOENT` for the components / missing strings in the page.

- [ ] **Step 3: Create `app/components/account/ApiKeysPanel.vue`**

```vue
<template>
  <section class="api-keys-panel">
    <h2 class="text-h6 font-weight-bold mb-1">Claves de la API</h2>
    <p class="text-body-2 text-medium-emphasis mb-4 api-keys-panel__intro">
      Con una clave, la API te identifica, mide tu uso y aplica tu plan. Sin clave también funciona,
      con el techo anónimo. Planes y condiciones en
      <NuxtLink :to="localePath('/empresas')">Datos para empresas</NuxtLink>.
    </p>

    <VAlert v-if="loadError" type="error" variant="tonal" class="mb-4">{{ loadError }}</VAlert>

    <VAlert v-if="created" type="success" variant="tonal" class="mb-4">
      <div class="font-weight-bold mb-1">Tu clave nueva</div>
      <p class="text-body-2 mb-2">
        Copiala ahora: por seguridad guardamos sólo una huella y no se vuelve a mostrar.
      </p>
      <div class="d-flex flex-wrap align-center ga-2 mb-2">
        <code class="api-keys-panel__secret">{{ created }}</code>
        <VBtn
          size="small"
          variant="tonal"
          :prepend-icon="copied ? 'mdi-check' : 'mdi-content-copy'"
          @click="copy(created)"
        >
          {{ copied ? 'Copiada' : 'Copiar' }}
        </VBtn>
      </div>
      <pre class="api-keys-panel__code"><code>{{ curlExample(created) }}</code></pre>
    </VAlert>

    <VCard variant="outlined" class="pa-4 mb-6">
      <h3 class="text-subtitle-1 font-weight-bold mb-3">Crear una clave</h3>
      <VForm @submit.prevent="create">
        <VRow dense>
          <VCol cols="12" md="6">
            <VTextField
              v-model="form.label"
              label="Nombre de la clave"
              hint="Para reconocerla, por ejemplo «pantalla del local»"
              :maxlength="FIELD_LIMITS.label.max"
              density="comfortable"
            />
          </VCol>
          <VCol cols="12" md="6">
            <VTextField
              v-model="form.company"
              label="Empresa o proyecto"
              :maxlength="FIELD_LIMITS.company.max"
              density="comfortable"
            />
          </VCol>
          <VCol cols="12">
            <VTextarea
              v-model="form.useCase"
              label="¿Para qué la vas a usar?"
              hint="Por ejemplo: mostrar la pizarra en una pantalla, una planilla de costos, monitorear precios"
              :maxlength="FIELD_LIMITS.useCase.max"
              rows="2"
              auto-grow
              density="comfortable"
            />
          </VCol>
          <VCol cols="12" md="6">
            <VTextField
              v-model="form.website"
              label="Sitio web (opcional)"
              placeholder="https://"
              :maxlength="FIELD_LIMITS.website.max"
              density="comfortable"
            />
          </VCol>
          <VCol cols="12">
            <VCheckbox v-model="form.acceptTerms" density="compact" hide-details>
              <template #label>
                <span>
                  Acepto las
                  <NuxtLink :to="`${localePath('/empresas')}#condiciones`" target="_blank" @click.stop>
                    condiciones de uso de la API
                  </NuxtLink>
                </span>
              </template>
            </VCheckbox>
          </VCol>
        </VRow>
        <VAlert v-if="createError" type="error" variant="tonal" density="compact" class="my-3">
          {{ createError }}
        </VAlert>
        <div class="d-flex flex-wrap align-center ga-3 mt-3">
          <VBtn
            type="submit"
            color="primary"
            variant="flat"
            :loading="creating"
            :disabled="!canCreate"
            prepend-icon="mdi-key-plus"
          >
            Crear clave
          </VBtn>
          <span v-if="activeCount >= MAX_KEYS_PER_ACCOUNT" class="text-caption">
            Llegaste al tope de {{ MAX_KEYS_PER_ACCOUNT }} claves activas: revocá una para crear otra.
          </span>
        </div>
      </VForm>
    </VCard>

    <h3 class="text-subtitle-1 font-weight-bold mb-2">Tus claves</h3>
    <VProgressLinear v-if="loading" indeterminate class="mb-3" />
    <VAlert v-else-if="!keys.length && !loadError" type="info" variant="tonal">
      Todavía no creaste ninguna clave.
    </VAlert>
    <VRow v-else>
      <VCol v-for="k in keys" :key="k.id" cols="12" md="6">
        <VCard
          variant="outlined"
          class="pa-4 h-100"
          :class="{ 'api-keys-panel__revoked': k.status === 'revoked' }"
        >
          <div class="d-flex justify-space-between align-start ga-2">
            <div>
              <div class="text-subtitle-1 font-weight-bold">{{ k.label }}</div>
              <div class="text-caption">
                <code>{{ k.prefix }}…</code> · plan {{ API_PLAN_LABELS[k.plan] }} ·
                {{ k.status === 'active' ? 'activa' : 'revocada' }}
              </div>
            </div>
            <VBtn
              v-if="k.status === 'active'"
              size="small"
              variant="text"
              color="error"
              prepend-icon="mdi-key-remove"
              @click="askRevoke(k)"
            >
              Revocar
            </VBtn>
          </div>
          <VDivider class="my-3" />
          <dl class="api-keys-panel__facts text-body-2">
            <div>
              <dt>Creada</dt>
              <dd>{{ formatDay(k.createdAt) }}</dd>
            </div>
            <div>
              <dt>Último uso</dt>
              <dd>{{ k.lastUsedAt ? formatDay(k.lastUsedAt) : 'todavía no' }}</dd>
            </div>
            <div>
              <dt>Pedidos en 7 días</dt>
              <dd>{{ formatCount(keyUsage(usage, k.id)?.last7 ?? 0) }}</dd>
            </div>
            <div>
              <dt>Pedidos en 30 días</dt>
              <dd>{{ formatCount(keyUsage(usage, k.id)?.total ?? 0) }}</dd>
            </div>
          </dl>
        </VCard>
      </VCol>
    </VRow>

    <VDialog v-model="revokeOpen" max-width="440">
      <VCard class="pa-4">
        <h3 class="text-subtitle-1 font-weight-bold mb-2">¿Revocar «{{ revoking?.label }}»?</h3>
        <p class="text-body-2 mb-4">
          Deja de funcionar en menos de un minuto y no se puede reactivar desde acá.
        </p>
        <div class="d-flex justify-end ga-2">
          <VBtn variant="text" @click="revokeOpen = false">Cancelar</VBtn>
          <VBtn color="error" variant="flat" :loading="revokingBusy" @click="revoke">Revocar</VBtn>
        </div>
      </VCard>
    </VDialog>
  </section>
</template>

<script setup lang="ts">
import {
  API_PLAN_LABELS,
  FIELD_LIMITS,
  MAX_KEYS_PER_ACCOUNT,
  curlExample,
  formatCount,
  formatDay,
  keyUsage,
  type ApiKeyRecord,
  type ApiUsageResponse,
} from '~/utils/apiKeys'

const localePath = useLocalePath()
const { authFetch } = useAuthFetch()

const keys = ref<ApiKeyRecord[]>([])
const usage = ref<ApiUsageResponse | null>(null)
const loading = ref(true)
const loadError = ref('')
const form = reactive({ label: '', company: '', useCase: '', website: '', acceptTerms: false })
const creating = ref(false)
const createError = ref('')
const created = ref('')
const copied = ref(false)
const revokeOpen = ref(false)
const revoking = ref<ApiKeyRecord | null>(null)
const revokingBusy = ref(false)

const activeCount = computed(() => keys.value.filter(k => k.status === 'active').length)
const canCreate = computed(
  () =>
    !creating.value &&
    form.acceptTerms &&
    activeCount.value < MAX_KEYS_PER_ACCOUNT &&
    form.label.trim().length >= FIELD_LIMITS.label.min &&
    form.company.trim().length >= FIELD_LIMITS.company.min &&
    form.useCase.trim().length >= FIELD_LIMITS.useCase.min
)

function errorMessage(e: any, fallback: string): string {
  return e?.data?.statusMessage || e?.data?.message || e?.statusMessage || fallback
}

async function load() {
  loading.value = true
  loadError.value = ''
  try {
    const res = await authFetch<{ keys: ApiKeyRecord[]; usage: ApiUsageResponse | null }>('/api/me/api-keys')
    keys.value = res.keys
    usage.value = res.usage
  } catch (e) {
    loadError.value = errorMessage(e, 'No pudimos leer tus claves. Probá de nuevo en un rato.')
  } finally {
    loading.value = false
  }
}

async function create() {
  if (!canCreate.value) return
  creating.value = true
  createError.value = ''
  created.value = ''
  try {
    const res = await authFetch<{ key: string; apiKey: ApiKeyRecord }>('/api/me/api-keys', {
      method: 'POST',
      body: { ...form },
    })
    created.value = res.key
    form.label = ''
    form.useCase = ''
    form.acceptTerms = false
    await load()
  } catch (e) {
    createError.value = errorMessage(e, 'No se pudo crear la clave.')
  } finally {
    creating.value = false
  }
}

async function copy(text: string) {
  try {
    await navigator.clipboard.writeText(text)
    copied.value = true
    setTimeout(() => (copied.value = false), 2000)
  } catch {
    copied.value = false
  }
}

function askRevoke(k: ApiKeyRecord) {
  revoking.value = k
  revokeOpen.value = true
}

async function revoke() {
  if (!revoking.value) return
  revokingBusy.value = true
  try {
    await authFetch(`/api/me/api-keys/${revoking.value.id}`, { method: 'DELETE' })
    revokeOpen.value = false
    await load()
  } catch (e) {
    loadError.value = errorMessage(e, 'No se pudo revocar la clave.')
  } finally {
    revokingBusy.value = false
  }
}

onMounted(load)
</script>

<style scoped>
.api-keys-panel__intro {
  max-width: 760px;
}
.api-keys-panel__secret {
  font-size: 0.95rem;
  word-break: break-all;
}
.api-keys-panel__code {
  margin: 0;
  padding: 8px 12px;
  border-radius: 6px;
  background: rgba(var(--v-theme-on-surface), 0.06);
  font-size: 0.8rem;
  overflow-x: auto;
}
.api-keys-panel__revoked {
  opacity: 0.6;
}
.api-keys-panel__facts {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px 16px;
  margin: 0;
}
.api-keys-panel__facts dt {
  font-size: 0.75rem;
  opacity: 0.7;
}
.api-keys-panel__facts dd {
  margin: 0;
  font-weight: 600;
}
</style>
```

- [ ] **Step 4: Create `app/components/account/ApiClientsAdminPanel.vue`**

```vue
<template>
  <section v-if="!forbidden" class="api-admin-panel mt-10">
    <h2 class="text-h6 font-weight-bold mb-1">Clientes de la API</h2>
    <p class="text-body-2 text-medium-emphasis mb-4">
      Panel de administración (cuentas de NUXT_ADMIN_EMAILS). Uso de los últimos 30 días; el de hoy,
      en vivo.
    </p>
    <VAlert v-if="error" type="error" variant="tonal" class="mb-4">{{ error }}</VAlert>
    <VProgressLinear v-if="loading" indeterminate class="mb-3" />
    <template v-else-if="data">
      <h3 class="text-subtitle-1 font-weight-bold mb-2">Claves ({{ data.keys.length }})</h3>
      <VTable density="compact" class="mb-8">
        <thead>
          <tr>
            <th>Clave</th>
            <th>Empresa y uso</th>
            <th>Plan</th>
            <th class="text-end">7 días</th>
            <th class="text-end">30 días</th>
            <th>Rutas</th>
            <th>Notas</th>
            <th />
          </tr>
        </thead>
        <tbody>
          <tr v-for="k in data.keys" :key="k.id">
            <td>
              <div class="font-weight-bold">{{ k.label }}</div>
              <code>{{ k.prefix }}…</code>
              <div class="text-caption">
                {{ k.ownerEmail || k.ownerUid }} · {{ k.status === 'active' ? 'activa' : 'revocada' }}
              </div>
            </td>
            <td class="api-admin-panel__use">
              <div>{{ k.company }}</div>
              <div class="text-caption">{{ k.useCase }}</div>
              <a v-if="k.website" :href="k.website" target="_blank" rel="noopener noreferrer nofollow" class="text-caption">
                {{ k.website }}
              </a>
            </td>
            <td>
              <VSelect
                v-if="edits[k.id]"
                v-model="edits[k.id].plan"
                :items="planItems"
                density="compact"
                variant="outlined"
                hide-details
                class="api-admin-panel__plan"
              />
            </td>
            <td class="text-end">{{ formatCount(keyUsage(data.usage, k.id)?.last7 ?? 0) }}</td>
            <td class="text-end">{{ formatCount(keyUsage(data.usage, k.id)?.total ?? 0) }}</td>
            <td class="text-caption">{{ routesText(keyUsage(data.usage, k.id)?.routes) }}</td>
            <td>
              <VTextField v-if="edits[k.id]" v-model="edits[k.id].notes" density="compact" variant="outlined" hide-details />
            </td>
            <td>
              <VBtn size="small" variant="tonal" :loading="saving === k.id" :disabled="!dirty(k)" @click="save(k)">
                Guardar
              </VBtn>
            </td>
          </tr>
        </tbody>
      </VTable>

      <h3 class="text-subtitle-1 font-weight-bold mb-1">Sin clave: quién usa la API</h3>
      <p class="text-body-2 text-medium-emphasis mb-2">
        Por User-Agent (el programa que se identifica; nunca la IP). Los que piden todos los días son
        los candidatos a un plan. Lectores del sitio en 30 días:
        {{ formatCount(data.usage.site?.total ?? 0) }} pedidos.
      </p>
      <VTable density="compact">
        <thead>
          <tr>
            <th>User-Agent</th>
            <th class="text-end">7 días</th>
            <th class="text-end">30 días</th>
            <th>Rutas</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="lead in data.usage.anonymous ?? []" :key="lead.userAgent">
            <td class="api-admin-panel__ua">{{ lead.userAgent }}</td>
            <td class="text-end">{{ formatCount(lead.last7) }}</td>
            <td class="text-end">{{ formatCount(lead.total) }}</td>
            <td class="text-caption">{{ routesText(lead.routes) }}</td>
          </tr>
          <tr v-if="!(data.usage.anonymous ?? []).length">
            <td colspan="4" class="text-caption">Todavía no hay uso anónimo medido.</td>
          </tr>
        </tbody>
      </VTable>
    </template>
  </section>
</template>

<script setup lang="ts">
import {
  API_PLAN_LABELS,
  ASSIGNABLE_PLANS,
  formatCount,
  keyUsage,
  type ApiKeyRecord,
  type ApiPlanId,
  type ApiUsageResponse,
} from '~/utils/apiKeys'

const { authFetch } = useAuthFetch()

const data = ref<{ keys: ApiKeyRecord[]; usage: ApiUsageResponse } | null>(null)
const loading = ref(true)
const error = ref('')
const forbidden = ref(false)
const saving = ref('')
const edits = reactive<Record<string, { plan: ApiPlanId; notes: string }>>({})
const planItems = ASSIGNABLE_PLANS.map(plan => ({ title: API_PLAN_LABELS[plan], value: plan }))

function resetEdits(keys: ApiKeyRecord[]) {
  for (const k of keys) edits[k.id] = { plan: k.plan, notes: k.notes ?? '' }
}

function dirty(k: ApiKeyRecord): boolean {
  const e = edits[k.id]
  return !!e && (e.plan !== k.plan || e.notes.trim() !== (k.notes ?? ''))
}

function routesText(routes?: { route: string; count: number }[]): string {
  return (routes ?? [])
    .slice(0, 3)
    .map(r => `${r.route} (${formatCount(r.count)})`)
    .join(', ') || '—'
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const res = await authFetch<{ keys: ApiKeyRecord[]; usage: ApiUsageResponse }>('/api/admin/api-clients')
    resetEdits(res.keys)
    data.value = res
  } catch (e: any) {
    const status = Number(e?.statusCode ?? e?.response?.status ?? 0)
    if (status === 403 || status === 401) forbidden.value = true
    else error.value = e?.data?.statusMessage || `La ruta respondió ${status || 'sin respuesta'}.`
  } finally {
    loading.value = false
  }
}

async function save(k: ApiKeyRecord) {
  const e = edits[k.id]
  if (!e) return
  saving.value = k.id
  try {
    const res = await authFetch<{ apiKey: ApiKeyRecord }>(`/api/admin/api-clients/${k.id}`, {
      method: 'PATCH',
      body: { plan: e.plan, notes: e.notes.trim() || null },
    })
    if (data.value) data.value.keys = data.value.keys.map(x => (x.id === k.id ? res.apiKey : x))
    resetEdits([res.apiKey])
  } catch (err: any) {
    error.value = err?.data?.statusMessage || 'No se pudo guardar.'
  } finally {
    saving.value = ''
  }
}

onMounted(load)
</script>

<style scoped>
.api-admin-panel__plan {
  min-width: 130px;
}
.api-admin-panel__use {
  max-width: 280px;
}
.api-admin-panel__ua {
  max-width: 420px;
  word-break: break-all;
  font-size: 0.8rem;
}
</style>
```

- [ ] **Step 5: Add the tab to `app/pages/cuenta/index.vue`**

In the template, after `<VTab value="alerts">{{ $t('alerts.tab') }}</VTab>` add:
```vue
      <VTab value="api">API</VTab>
```

Inside `<VTabsWindow v-model="tab">`, after the closing `</VTabsWindowItem>` of the `alerts` item (the last one), add:
```vue
      <VTabsWindowItem value="api">
        <AccountApiKeysPanel />
        <AccountApiClientsAdminPanel />
      </VTabsWindowItem>
```

In the script, replace both occurrences of `['saved', 'favorites', 'alerts']` with `['saved', 'favorites', 'alerts', 'api']`.

- [ ] **Step 6: Run the tab test and the component-resolution tripwire**

Run (from `app/`): `npx vitest run tests/unit/cuentaApiTab.test.ts tests/unit/componentResolution.test.ts`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add app/components/account/ApiKeysPanel.vue app/components/account/ApiClientsAdminPanel.vue app/pages/cuenta/index.vue app/tests/unit/cuentaApiTab.test.ts
git commit -m "feat(app): pestaña API en /cuenta para crear y revocar claves, y panel de clientes

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 9: Página pública `/empresas`, navegación y enlaces

**Files:**
- Create: `app/pages/empresas.vue`
- Modify: `app/utils/siteNav.ts` (entry after `/desarrolladores`), `app/i18n/locales/json/es.json`, `en.json`, `pt.json` (`empresas.nav`, `dev.business*`, `publicidad.apiLink`), `app/pages/desarrolladores.vue` (card), `app/pages/publicidad.vue` (link), `app/public/openapi.json` (security scheme + `/usage`)
- Test: `app/tests/unit/empresasPage.test.ts`

**Interfaces:**
- Consumes: `API_PLAN_LIMITS`, `API_PLAN_LABELS`, `API_CONTACT_EMAIL`, `API_PUBLIC_BASE`, `MAX_KEYS_PER_ACCOUNT`, `formatCount` (Task 7); `useAuthStore()` (`isLoggedIn`, `openDialog()`); `/cuenta?tab=api` (Task 8).
- Produces: route `/empresas` (indexable, in nav/sitemap), anchor `#condiciones`.

- [ ] **Step 1: Write the failing test `app/tests/unit/empresasPage.test.ts`**

```ts
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { NAV_SECTIONS } from '../../utils/siteNav'
import es from '../../i18n/locales/json/es.json'
import en from '../../i18n/locales/json/en.json'
import pt from '../../i18n/locales/json/pt.json'

const APP = join(__dirname, '..', '..')
const page = readFileSync(join(APP, 'pages/empresas.vue'), 'utf8')

describe('/empresas', () => {
  it('está en la navegación con su etiqueta en los tres idiomas', () => {
    const entry = NAV_SECTIONS.flatMap(s => s.entries).find(i => i.to === '/empresas')
    expect(entry?.labelKey).toBe('empresas.nav')
    for (const locale of [es, en, pt] as any[]) expect(locale.empresas?.nav).toBeTruthy()
  })

  it('los techos salen de la constante, no de un número escrito a mano', () => {
    expect(page).toContain('API_PLAN_LIMITS')
    expect(page).not.toMatch(/20\.000|500\.000|3\.000 pedidos/)
  })

  it('no publica precios y deja el contacto', () => {
    expect(page).not.toMatch(/US\$|USD \d|\$ ?\d/)
    expect(page).toContain('API_CONTACT_EMAIL')
  })

  it('tiene condiciones con ancla y el botón lleva a la pestaña de claves', () => {
    expect(page).toContain('id="condiciones"')
    expect(page).toContain("query: { tab: 'api' }")
    expect(page).toContain('openDialog()')
  })

  it('las tarjetas de /desarrolladores y /publicidad enlazan a /empresas', () => {
    expect(readFileSync(join(APP, 'pages/desarrolladores.vue'), 'utf8')).toContain("localePath('/empresas')")
    expect(readFileSync(join(APP, 'pages/publicidad.vue'), 'utf8')).toContain("localePath('/empresas')")
  })

  it('la referencia pública declara la clave como opcional', () => {
    const spec = JSON.parse(readFileSync(join(APP, 'public/openapi.json'), 'utf8'))
    expect(spec.components.securitySchemes.ApiKeyAuth).toMatchObject({ type: 'apiKey', in: 'header', name: 'X-API-Key' })
    expect(spec.security).toEqual([{}, { ApiKeyAuth: [] }])
    expect(spec.paths['/usage']).toBeTruthy()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run (from `app/`): `npx vitest run tests/unit/empresasPage.test.ts`
Expected: FAIL — `ENOENT … pages/empresas.vue`.

- [ ] **Step 3: Create `app/pages/empresas.vue`**

```vue
<template>
  <div>
    <VContainer class="py-8 empresas-page">
      <div class="d-flex align-center ga-2 mb-2">
        <VIcon color="indigo" size="32">mdi-domain</VIcon>
        <h1 class="text-h4 font-weight-bold">Datos de cotizaciones para empresas</h1>
      </div>
      <p class="text-body-1 text-medium-emphasis mb-6 empresas-page__lead">
        Las cotizaciones de más de 40 casas de cambio de Uruguay, leídas cada cinco minutos, con su
        historial dentro del día y el de la región, por una API. Sin clave funciona; con una clave
        gratuita ves tu consumo, y un plan Empresa te da más capacidad y uso comercial.
      </p>
      <div class="d-flex flex-wrap ga-3 mb-10">
        <VBtn color="primary" variant="flat" size="large" prepend-icon="mdi-key-plus" data-cta="empresas-crear-clave" @click="startKey">
          Crear una clave gratis
        </VBtn>
        <VBtn :href="mailto" variant="tonal" size="large" prepend-icon="mdi-email-outline" data-cta="empresas-contacto">
          Escribinos por un plan Empresa
        </VBtn>
      </div>

      <h2 class="text-h5 font-weight-bold mb-3">Qué datos hay</h2>
      <VRow class="mb-8">
        <VCol v-for="item in DATA" :key="item.title" cols="12" sm="6" md="4">
          <VCard variant="outlined" class="pa-4 h-100">
            <div class="d-flex align-center ga-2 mb-2">
              <VIcon :color="item.color">{{ item.icon }}</VIcon>
              <h3 class="text-subtitle-1 font-weight-bold">{{ item.title }}</h3>
            </div>
            <p class="text-body-2 mb-2">{{ item.text }}</p>
            <code v-if="item.endpoint" class="text-caption">{{ item.endpoint }}</code>
          </VCard>
        </VCol>
      </VRow>

      <h2 class="text-h5 font-weight-bold mb-3">Qué se puede construir</h2>
      <ul class="empresas-page__list text-body-1 mb-8">
        <li v-for="use in USES" :key="use.title">
          <strong>{{ use.title }}.</strong> {{ use.text }}
        </li>
      </ul>

      <h2 class="text-h5 font-weight-bold mb-3">Planes</h2>
      <VRow class="mb-2">
        <VCol v-for="plan in PLANS" :key="plan.id" cols="12" md="4">
          <VCard :variant="plan.id === 'free' ? 'tonal' : 'outlined'" :color="plan.id === 'free' ? 'primary' : undefined" class="pa-4 h-100">
            <h3 class="text-h6 font-weight-bold mb-1">{{ plan.title }}</h3>
            <p class="text-body-2 mb-3">{{ plan.who }}</p>
            <ul class="empresas-page__list text-body-2">
              <li v-for="line in plan.lines" :key="line">{{ line }}</li>
            </ul>
          </VCard>
        </VCol>
      </VRow>
      <p class="text-caption text-medium-emphasis mb-8">
        Los techos se cuentan por minuto y por día (el día de Montevideo). Cada respuesta trae las
        cabeceras <code>X-Plan</code>, <code>X-RateLimit-Limit</code> y
        <code>X-RateLimit-Remaining</code>, y <code>/usage</code> te dice cuánto llevás.
      </p>

      <h2 class="text-h5 font-weight-bold mb-3">Cómo se usa la clave</h2>
      <p class="text-body-2 mb-2">
        En la cabecera <code>X-API-Key</code> (o <code>Authorization: Bearer</code>). Si tu herramienta
        no puede poner cabeceras, como una planilla, va en la dirección con <code>?api_key=</code>.
      </p>
      <pre class="empresas-page__code mb-8"><code>{{ CURL }}</code></pre>

      <h2 id="condiciones" class="text-h5 font-weight-bold mb-3">Condiciones de uso</h2>
      <ol class="empresas-page__list text-body-2 mb-8">
        <li v-for="rule in TERMS" :key="rule">{{ rule }}</li>
      </ol>

      <h2 class="text-h5 font-weight-bold mb-3">Preguntas frecuentes</h2>
      <div v-for="item in FAQ" :key="item.question" class="mb-4">
        <h3 class="text-subtitle-1 font-weight-bold">{{ item.question }}</h3>
        <p class="text-body-2">{{ item.answer }}</p>
      </div>

      <p class="text-body-2 mt-8">
        Más para desarrolladores —código abierto, referencia completa de la API y servidor MCP— en
        <NuxtLink :to="localePath('/desarrolladores')">Desarrolladores</NuxtLink>.
      </p>
    </VContainer>
  </div>
</template>

<script setup lang="ts">
import {
  API_CONTACT_EMAIL,
  API_PLAN_LABELS,
  API_PLAN_LIMITS,
  API_PUBLIC_BASE,
  MAX_KEYS_PER_ACCOUNT,
  formatCount,
} from '~/utils/apiKeys'

const localePath = useLocalePath()
const auth = useAuthStore()

// "Crear una clave": con sesión va directo a la pestaña; sin sesión abre el acceso y navega apenas
// la sesión existe, así nadie termina en la portada después de iniciar sesión.
const pendingKey = ref(false)
const keysPath = () => localePath({ path: '/cuenta', query: { tab: 'api' } })
function startKey() {
  if (auth.isLoggedIn) return navigateTo(keysPath())
  pendingKey.value = true
  auth.openDialog()
}
watch(
  () => auth.isLoggedIn,
  loggedIn => {
    if (loggedIn && pendingKey.value) {
      pendingKey.value = false
      navigateTo(keysPath())
    }
  }
)

const mailto = `mailto:${API_CONTACT_EMAIL}?subject=${encodeURIComponent('Plan Empresa de la API — Cambio Uruguay')}`

const perMin = (plan: keyof typeof API_PLAN_LIMITS) => formatCount(API_PLAN_LIMITS[plan].perMinute)
const perDay = (plan: keyof typeof API_PLAN_LIMITS) => formatCount(API_PLAN_LIMITS[plan].perDay)

const DATA = [
  {
    title: 'Cotizaciones',
    icon: 'mdi-cash-multiple',
    color: 'green',
    text: 'Compra y venta de más de 40 casas de cambio y bancos, con la cotización oficial del BCU, leídas cada cinco minutos.',
    endpoint: `${API_PUBLIC_BASE}/`,
  },
  {
    title: 'Intradía',
    icon: 'mdi-chart-timeline-variant',
    color: 'indigo',
    text: 'Cada cambio de pizarra del día con su hora exacta: cuántas veces se movió cada casa y cuándo.',
    endpoint: `${API_PUBLIC_BASE}/intraday?code=USD`,
  },
  {
    title: 'Histórico',
    icon: 'mdi-history',
    color: 'teal',
    text: 'La evolución de cada casa y moneda, día por día, para series y comparaciones.',
    endpoint: `${API_PUBLIC_BASE}/evolution/brou/USD`,
  },
  {
    title: 'Región',
    icon: 'mdi-earth-americas',
    color: 'orange',
    text: 'Los dólares de Argentina, Brasil, Paraguay, Chile y Bolivia, sin promediar mercados distintos.',
    endpoint: `${API_PUBLIC_BASE}/regional`,
  },
  {
    title: 'Indicadores',
    icon: 'mdi-finance',
    color: 'purple',
    text: 'Unidad Indexada, Unidad Reajustable y la cotización oficial del Banco Central.',
    endpoint: `${API_PUBLIC_BASE}/bcu`,
  },
  {
    title: 'Alquileres y autos',
    icon: 'mdi-file-chart-outline',
    color: 'brown',
    text: 'Precio del alquiler por barrio y del auto usado por modelo y año, como informe o extracción a pedido.',
    endpoint: '',
  },
]

const USES = [
  { title: 'Pantalla de pizarra', text: 'Mostrar en el local las cotizaciones propias o las de la competencia, actualizadas solas.' },
  { title: 'Planillas y costos', text: 'Traer el dólar del día a una planilla de costos o de precios sin copiarlo a mano.' },
  { title: 'Monitoreo de competencia', text: 'Saber cuándo y cuánto movió su pizarra cada casa, y dónde queda la tuya.' },
  { title: 'Productos financieros', text: 'Apps, bots y paneles que necesitan el precio real de cada casa y no sólo el oficial.' },
]

const PLANS = [
  {
    id: 'anonymous',
    title: API_PLAN_LABELS.anonymous,
    who: 'Para probar y para uso personal.',
    lines: [`${perMin('anonymous')} pedidos por minuto`, `${perDay('anonymous')} pedidos por día, por dirección IP`, 'Sin registro'],
  },
  {
    id: 'free',
    title: `${API_PLAN_LABELS.free}, con clave`,
    who: 'Para proyectos que quieren ver su consumo.',
    lines: [
      `${perMin('free')} pedidos por minuto`,
      `${perDay('free')} pedidos por día`,
      `Consumo medido en tu cuenta, hasta ${MAX_KEYS_PER_ACCOUNT} claves`,
    ],
  },
  {
    id: 'business',
    title: API_PLAN_LABELS.business,
    who: 'Para productos comerciales y para redistribuir el dato.',
    lines: [
      `Desde ${perMin('business')} pedidos por minuto`,
      `Desde ${perDay('business')} pedidos por día`,
      'Límites a medida, uso comercial y contacto directo',
    ],
  },
]

const CURL = `CLAVE=cu_tu_clave
curl -H "X-API-Key: $CLAVE" ${API_PUBLIC_BASE}/exchange/brou/USD
curl "${API_PUBLIC_BASE}/usage?api_key=$CLAVE"`

const TERMS = [
  'La clave es de tu cuenta: no la publiques en el código de una página web. Si se filtra, revocala y creá otra.',
  'Cuando muestres los datos, citá la fuente: «Fuente: Cambio Uruguay», con enlace a cambio-uruguay.com.',
  'Las cotizaciones son las que publica cada casa y pueden tener demoras o errores. No son una oferta de cambio: verificá con la casa antes de operar.',
  'Revender o redistribuir el dato crudo requiere un plan Empresa.',
  'Los techos pueden cambiar; lo avisamos en esta página con 30 días de anticipación.',
  'Medimos cuántos pedidos hace cada clave y a qué rutas, para los límites y el plan. El medidor no guarda direcciones IP.',
]

const FAQ = [
  {
    question: '¿Necesito una clave para usar la API?',
    answer: `No. Sin clave funciona con un techo de ${perMin('anonymous')} pedidos por minuto y ${perDay('anonymous')} por día por dirección IP. La clave te identifica, mide tu consumo y es el camino a un plan con más capacidad.`,
  },
  {
    question: '¿Cuánto cuesta?',
    answer: `La clave gratuita no cuesta nada. El plan Empresa se acuerda según el uso y el producto: escribinos a ${API_CONTACT_EMAIL}.`,
  },
  {
    question: '¿Cada cuánto se actualizan las cotizaciones?',
    answer: 'Cada casa se consulta cada cinco minutos, y el historial intradía guarda una fila sólo cuando el precio cambió.',
  },
  {
    question: '¿Puedo usarla desde una planilla de Google?',
    answer: 'Sí, con Apps Script: poné la clave en la dirección con ?api_key= y leé el JSON de la respuesta.',
  },
]

const canonicalUrl = 'https://cambio-uruguay.com/empresas'
const title = 'API y datos para empresas en Uruguay'
const description =
  'Cotizaciones de más de 40 casas de cambio cada 5 minutos, historial intradía y de la región, por API. Clave gratis en un minuto y planes para empresas.'

defineOgImageComponent('Cambio', {
  title: 'Datos para empresas',
  subtitle: 'Más de 40 casas de cambio cada 5 minutos, por API',
  tag: 'API',
})

useSeoMeta({
  title: () => `${title} | Cambio Uruguay`,
  description,
  ogTitle: title,
  ogDescription: description,
  ogType: 'website',
  ogUrl: canonicalUrl,
  twitterCard: 'summary_large_image',
  twitterTitle: title,
  twitterDescription: description,
})

useHead(() => ({
  link: [{ rel: 'canonical', href: canonicalUrl }],
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: 'Cambio Uruguay', item: 'https://cambio-uruguay.com' },
              { '@type': 'ListItem', position: 2, name: 'Datos para empresas', item: canonicalUrl },
            ],
          },
          {
            '@type': 'FAQPage',
            mainEntity: FAQ.map(item => ({
              '@type': 'Question',
              name: item.question,
              acceptedAnswer: { '@type': 'Answer', text: item.answer },
            })),
          },
        ],
      }),
    },
  ],
}))
</script>

<style scoped>
.empresas-page__lead {
  max-width: 760px;
}
.empresas-page__list {
  padding-left: 1.25rem;
  max-width: 820px;
}
.empresas-page__list li {
  margin-bottom: 6px;
}
.empresas-page__code {
  padding: 12px 16px;
  border-radius: 8px;
  background: rgba(var(--v-theme-on-surface), 0.06);
  font-size: 0.85rem;
  overflow-x: auto;
  max-width: 820px;
}
</style>
```

- [ ] **Step 4: Add the nav entry in `app/utils/siteNav.ts`**

Right after the `/desarrolladores` entry object (the one with `labelKey: 'dev.nav'`), add:

```ts
      {
        to: '/empresas',
        labelKey: 'empresas.nav',
        icon: 'mdi-domain',
        priority: 0.6,
        changefreq: 'monthly',
        keywords: ['api empresas', 'datos cotizaciones', 'clave api', 'plan comercial', 'pizarra', 'monitoreo competencia', 'b2b'],
      },
```

- [ ] **Step 5: Add the i18n keys (all three locale files)**

In each of `app/i18n/locales/json/es.json`, `en.json`, `pt.json`: add a top-level `"empresas"` object right before the `"dev": {` line, add three keys at the end of the `"dev"` object, and one key at the end of the `"publicidad"` object. Use the Edit tool anchored on the existing last key of each object (read the lines first; the file is JSON — keep the comma rules).

es:
```json
  "empresas": {
    "nav": "Datos para empresas"
  },
```
`dev`: `"business": "Datos para empresas"`, `"businessText": "¿Vas a usar la API en un producto? Creá una clave gratis para ver tu consumo, o escribinos por un plan con más capacidad y uso comercial."`, `"businessCta": "Planes y claves"`
`publicidad`: `"apiLink": "¿Buscás datos y no anuncios? Planes de la API para empresas"`

en:
`"empresas": { "nav": "Data for business" }`; `dev`: `"business": "Data for business"`, `"businessText": "Using the API in a product? Create a free key to see your usage, or write to us for a plan with more capacity and commercial use."`, `"businessCta": "Plans and keys"`; `publicidad`: `"apiLink": "Looking for data rather than ads? API plans for business"`

pt:
`"empresas": { "nav": "Dados para empresas" }`; `dev`: `"business": "Dados para empresas"`, `"businessText": "Vai usar a API em um produto? Crie uma chave grátis para ver seu consumo, ou escreva para nós por um plano com mais capacidade e uso comercial."`, `"businessCta": "Planos e chaves"`; `publicidad`: `"apiLink": "Procura dados e não anúncios? Planos da API para empresas"`

Validate each file parses: `node -e "for (const l of ['es','en','pt']) JSON.parse(require('fs').readFileSync('app/i18n/locales/json/'+l+'.json','utf8'))"` (from the worktree root). Expected: no output.

- [ ] **Step 6: Link from `/desarrolladores` and `/publicidad`**

`app/pages/desarrolladores.vue`: right before `<VCard variant="outlined" class="preferential-api-card pa-4 mt-6">`, add:

```vue
      <VCard variant="tonal" color="indigo" class="pa-4 mt-6">
        <div class="d-flex flex-column flex-md-row align-md-center ga-3">
          <div class="flex-grow-1">
            <div class="d-flex align-center ga-2 mb-1">
              <VIcon>mdi-domain</VIcon>
              <span class="text-subtitle-1 font-weight-bold">{{ t('dev.business') }}</span>
            </div>
            <p class="text-body-2 mb-0">{{ t('dev.businessText') }}</p>
          </div>
          <VBtn :to="localePath('/empresas')" color="indigo" variant="flat" prepend-icon="mdi-key-plus">
            {{ t('dev.businessCta') }}
          </VBtn>
        </div>
      </VCard>
```

If `desarrolladores.vue` has no `const localePath = useLocalePath()` in its script, add it next to `const { t } = useI18n()`.

`app/pages/publicidad.vue`: right after the `<p class="text-caption mt-3 mb-0 publicidad-contact__note">…</p>` inside the contact card, add:

```vue
            <p class="text-body-2 mt-4 mb-0">
              <NuxtLink :to="localePath('/empresas')">{{ t('publicidad.apiLink') }}</NuxtLink>
            </p>
```

Add `const localePath = useLocalePath()` to its script if missing.

- [ ] **Step 7: Declare the key in `app/public/openapi.json`**

Run from the worktree root (Node keeps valid JSON; the file is hand-maintained — keep 2-space indentation):

```bash
node -e "
const fs = require('fs');
const p = 'app/public/openapi.json';
const raw = fs.readFileSync(p, 'utf8');
const spec = JSON.parse(raw);
spec.components = spec.components || {};
spec.components.securitySchemes = {
  ApiKeyAuth: {
    type: 'apiKey', in: 'header', name: 'X-API-Key',
    description: 'Opcional. Sin clave la API funciona con el techo anónimo; con clave te identifica, mide tu uso y aplica tu plan. También Authorization: Bearer cu_… o ?api_key=. Claves en https://cambio-uruguay.com/empresas.'
  }
};
spec.security = [{}, { ApiKeyAuth: [] }];
spec.paths['/usage'] = { get: {
  summary: 'Tu plan y tu consumo',
  description: 'Con una clave devuelve su plan, sus límites y lo consumido en este minuto y en el día (Montevideo). Sin clave, el plan anónimo.',
  responses: { '200': { description: 'Plan, límites y consumo' } }
} };
fs.writeFileSync(p, JSON.stringify(spec, null, 2) + (raw.endsWith('\n') ? '\n' : ''));
"
```

Then `git diff --stat app/public/openapi.json`: if the diff shows the WHOLE file rewritten (different original formatting), revert with `git checkout -- app/public/openapi.json` and apply the three additions by hand with the Edit tool instead.

- [ ] **Step 8: Run the page test and the SEO/nav contract suites**

Run (from `app/`): `npx vitest run tests/unit/empresasPage.test.ts tests/unit/siteNav-coverage.test.ts tests/unit/seoContract.test.ts tests/unit/seoTitleBudget.test.ts tests/unit/seoDescriptionBudget.test.ts tests/unit/sitemap-urls.test.ts tests/unit/i18nMessagePipes.test.ts`
Expected: PASS. If `seoTitleBudget` reports `MEASURABLE` must increase by one (it is a floor that ratchets), raise it by exactly one as its message says. If `seoDescriptionBudget` flags the description, shorten it (keep the number first) — do not raise `OVER_BUDGET`.

- [ ] **Step 9: Commit**

```bash
git add app/pages/empresas.vue app/utils/siteNav.ts app/i18n/locales/json/es.json app/i18n/locales/json/en.json app/i18n/locales/json/pt.json app/pages/desarrolladores.vue app/pages/publicidad.vue app/public/openapi.json app/tests/unit/empresasPage.test.ts
git commit -m "feat(app): /empresas, planes de la API y alta de claves desde el sitio

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

(Add any test file whose ratchet you touched in Step 8 to the same commit.)

---

### Task 10: Verificación completa, integración, configuración del VPS y despliegue

**Files:** none new (config lives on the VPS; memory update outside the repo).

- [ ] **Step 1: Full backend suite + type check**

Run (worktree root): `npm install` (the worktree's own; root `package-lock.json` is gitignored) then `npx vitest run` and `npx tsc -p tsconfig.production.json --noEmit`.
Expected: vitest all green except known timing-flaky files named in memory (`mercadolibre.test.ts` gapMs, `propertyservices/download.test.ts`) — re-run those alone before blaming this change. tsc: zero errors.

- [ ] **Step 2: Full app suite + lint**

Run (from `app/`): `npx vitest run` and `npm run lint`.
Expected: all green; lint clean on the new/changed files (`npm run typecheck` is broken by design — do not use it).

- [ ] **Step 3: Gitleaks on tree and on the branch's commits**

Run: `/c/Users/airau/go/bin/gitleaks dir . --no-banner` and `/c/Users/airau/go/bin/gitleaks git . --log-opts="origin/main..HEAD" --no-banner`
Expected: `no leaks found` in both. If a test value is flagged, rename the identifier (never `key`/`token`) and rewrite the branch commits (`git reset --mixed origin/main` + re-add by pathspec) — the push scans every commit in the range.

- [ ] **Step 4: Configure the VPS BEFORE pushing (the app bakes env at build time)**

```bash
TOKEN=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
ssh -p 2223 root@104.234.204.107 "cd /root/cambio-uruguay && cp .env .env.bak-apikeys && cp app/.env app/.env.bak-apikeys && \
  grep -q '^API_ADMIN_TOKEN=' .env || echo 'API_ADMIN_TOKEN=$TOKEN' >> .env && \
  grep -q '^API_INTERNAL_IPS=' .env || echo 'API_INTERNAL_IPS=104.234.204.107' >> .env && \
  grep -q '^NUXT_API_ADMIN_TOKEN=' app/.env || echo 'NUXT_API_ADMIN_TOKEN=$TOKEN' >> app/.env && \
  grep -c 'API_ADMIN_TOKEN' .env app/.env"
```
Expected: `.env:1` and `app/.env:1`. Never print the token in the terminal output or commit it.

- [ ] **Step 5: Integrate and push from the worktree (never through the shared root)**

```bash
git fetch origin
git rebase origin/main
npx vitest run tests/apikeys/ && (cd app && npx vitest run tests/unit/apiPlansParity.test.ts tests/unit/apiKeysRoutes.test.ts tests/unit/empresasPage.test.ts tests/unit/cuentaApiTab.test.ts tests/unit/siteNav-coverage.test.ts)
git push origin HEAD:main
```
Expected: rebase clean (conflicts only if another session touched `siteNav.ts`/`nuxt.config.ts`/`AGENTS.md` — resolve keeping both sides), tests green, push accepted.

- [ ] **Step 6: Watch CI and the two deploys**

Run: `gh run list --branch main --limit 3` then `gh run watch <id> --exit-status`.
Expected: `backend-test`, `backend-deploy`, app `test` and `deploy` succeed. The backend deploy registers `currency-api-usage` (it re-reads `OTHER_APPS` from the pulled file).

- [ ] **Step 7: Verify in production**

```bash
# anónimo: cabeceras presentes, 200
curl -sI https://api.cambio-uruguay.com/exchange/brou/USD | grep -iE "^(HTTP|x-plan|x-ratelimit)"
# /usage anónimo
curl -s https://api.cambio-uruguay.com/usage
# admin sin token → 401 (via origin, from the VPS)
ssh -p 2223 root@104.234.204.107 "curl -s -o /dev/null -w '%{http_code}\n' -X POST http://127.0.0.1:3528/cache/flush"
# lector del sitio: X-Plan site, sin X-RateLimit
curl -sI -H "Origin: https://cambio-uruguay.com" https://api.cambio-uruguay.com/bcu | grep -iE "^(x-plan|x-ratelimit)"
# job
ssh -p 2223 root@104.234.204.107 "pm2 describe currency-api-usage | grep -E 'status|cron' ; cd /root/cambio-uruguay && node dist/sync_api_usage.js"
```
Expected: `x-plan: anonymous` + `x-ratelimit-limit: 600`; `/usage` JSON with `"plan":"anonymous"`; flush → `401`; site → `x-plan: site`, no ratelimit headers; job logs `[api-usage] … filas`.

Then, with a real browser session (Playwright or the owner's account): open `https://cambio-uruguay.com/cuenta?tab=api`, create a key labelled `prueba-despliegue`, call `curl -s -H "X-API-Key: <la clave>" https://api.cambio-uruguay.com/usage` (expect `"plan":"free"`, `"client":"key"`), confirm the Telegram arrived, set custom limits `{ "perMinute": 2 }` on it via the admin PATCH (from the VPS with the token), hit `/usage` three times fast (third → 429), then revoke it in the panel and confirm the next call → 401 within 60 s. Open `/empresas` and check the page renders with the plans and the "Crear una clave gratis" button, in desktop and at 390 px.

Also confirm nothing else broke: `https://cambio-uruguay.com/` shows rates, `curl -s https://mcp.cambio-uruguay.com/mcp -o /dev/null -w '%{http_code}'` unchanged, `/widget` renders.

- [ ] **Step 8: Clean up and record**

- Delete the test key's Mongo doc or leave it revoked (revoked is fine; note it in the report).
- Prune merged branches (standing order): `git branch --merged origin/main` → delete `feat/b2b-api-keys`; `git worktree remove .claude/worktrees/b2b-api-keys` after confirming nothing unpushed.
- Update the memory file `monetizacion-b2b-2026-09-27.md` with: what shipped (commit SHAs), the env names, and that subproject 2 (monitor de competencia) is next.
