# Teléfonos de vendedores de autos — plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publicar, con un clic y por aviso, el teléfono que el vendedor escribió en su propio aviso o
el número comercial de la automotora, guardado en una base privada `carcontacts` que se reescribe
con el catálogo.

**Architecture:** Módulos puros en `classes/autos/contacts/` (extracción, automotoras, armado, hash de
bajas); `sync_autos.ts` los arma y publica junto al catálogo; `carcatalog` sólo lleva `hasContact`.
La app sirve el número por `GET /api/cars/contact/[key]` (no-store, noindex, límite por IP) y un
componente lo pide al hacer clic.

**Tech Stack:** TypeScript 4.9 (raíz, CommonJS, vitest), Nuxt 4 + Vuetify 4 (app, vitest), MongoDB
(APP DB vía `classes/appdb.ts`).

**Spec:** `docs/superpowers/specs/2026-09-21-autos-contactos-design.md`

## Global Constraints

- Nunca: login, captcha, "Ver teléfono", formularios, chat, JSON interno, Facebook.
- Vencimiento: 21 días desde la lectura PROPIA (`CAR_CONTACT_MAX_AGE_DAYS = 21`).
- Relectura de fichas de ML: `AUTOS_DETAIL_REFRESH_DAYS` por defecto 14.
- Máximo 3 números por aviso, 4 por automotora; más de 5 distintos en un texto = lista = ninguno.
- Formato guardado: `+598…` (celular `+5989[1-9]xxxxxx`, fijo `+598[24]xxxxxxx`) o `0800xxxx`.
- Hash de bajas: SHA-256 hex de `car-contact:` + valor.
- Respuesta de la API: `cache-control: private, no-store`, `x-robots-tag: noindex, nofollow`.
- Límite por IP: 30 lecturas / 10 min; 5 bajas / 10 min (en memoria, por proceso).
- Repo público: ningún número real en tests ni docs (los tests usan 099 123 456 y similares).
- La app no corre `npm run typecheck` (roto): `npm run lint` + vitest.

---

### Task 1: Extracción de teléfonos

**Files:**
- Create: `classes/autos/contacts/phones.ts`
- Test: `tests/autos/phones.test.ts`

**Interfaces:**
- Produces: `interface CarPhone { value: string; mobile: boolean }`,
  `normalizeCarPhone(raw: string): CarPhone | null`, `displayCarPhone(value: string): string`,
  `validCarPhone(value: string): boolean`, `phonesInLinks(html: string): CarPhone[]`,
  `phonesInText(text: string, options?: { contactPage?: boolean; max?: number }): CarPhone[]`.

- [ ] **Step 1: tests**

```ts
import { describe, expect, it } from "vitest";
import { displayCarPhone, normalizeCarPhone, phonesInLinks, phonesInText, validCarPhone } from "../../classes/autos/contacts/phones";

const values = (text: string, options?: Parameters<typeof phonesInText>[1]) => phonesInText(text, options).map(phone => phone.value);

describe("phonesInText", () => {
  it("reads mobiles written with the 0 or the country code, any grouping", () => {
    expect(values("Llamar al 099 123 456")).toEqual(["+59899123456"]);
    expect(values("cel 099123456 o 098.765.432")).toEqual(["+59899123456", "+59898765432"]);
    expect(values("(094) 44 22 99")).toEqual(["+59894442299"]);
    expect(values("+598 99 123 456")).toEqual(["+59899123456"]);
    expect(values("59891234567")).toEqual(["+59891234567"]);
  });
  it("needs a contact word for a bare mobile or a landline", () => {
    expect(values("vendo 99123456")).toEqual([]);
    expect(values("whatsapp 99123456")).toEqual(["+59899123456"]);
    expect(values("oficina 2901 2345")).toEqual([]);
    expect(values("tel 2901 2345")).toEqual(["+59829012345"]);
    expect(values("2901 2345", { contactPage: true })).toEqual(["+59829012345"]);
  });
  it("never reads a price, a year pair, km or a padrón", () => {
    expect(values("consultas precio $ 2.450.000")).toEqual([]);
    expect(values("tel. modelo 2019 2020")).toEqual([]);
    expect(values("contacto 120.000 km, año 2015")).toEqual([]);
    expect(values("consultas: U$S 91500000")).toEqual([]);
  });
  it("reads toll-free 0800 numbers anywhere", () => {
    expect(values("Atención 0800 2525")).toEqual(["08002525"]);
    expect(values("0800-1105")).toEqual(["08001105"]);
  });
  it("reads WhatsApp links inside the text", () => {
    expect(values("escribime wa.me/59899123456")).toEqual(["+59899123456"]);
  });
  it("dedupes, caps and refuses lists", () => {
    expect(values("099 123 456 / 099123456")).toEqual(["+59899123456"]);
    expect(values("099 111 111 099 222 222 099 333 333 099 444 444")).toHaveLength(3);
    expect(values("099 111 111 099 222 222 099 333 333 099 444 444 099 555 555 099 666 666")).toEqual([]);
  });
  it("marks mobiles", () => {
    expect(phonesInText("tel 099 123 456 y 2901 2345")).toEqual([
      { value: "+59899123456", mobile: true },
      { value: "+59829012345", mobile: false },
    ]);
  });
});

describe("normalize / display / links", () => {
  it("normalizes and validates", () => {
    expect(normalizeCarPhone("+59808002525")).toEqual({ value: "08002525", mobile: false });
    expect(normalizeCarPhone("08003451473")).toBeNull();
    expect(normalizeCarPhone("099 123 45")).toBeNull();
    expect(validCarPhone("+59899123456")).toBe(true);
    expect(validCarPhone("+59890123456")).toBe(false);
    expect(validCarPhone("08002525")).toBe(true);
  });
  it("displays the Uruguayan way", () => {
    expect(displayCarPhone("+59899123456")).toBe("099 123 456");
    expect(displayCarPhone("+59829012345")).toBe("2901 2345");
    expect(displayCarPhone("08002525")).toBe("0800 2525");
  });
  it("reads tel: and WhatsApp hrefs", () => {
    const html = '<a href="https://wa.me/+59899123456">wa</a><a href="tel:0800 2525">x</a><a href="tel:+59829012345">y</a>' +
      '<a href="https://api.whatsapp.com/send?phone=59898765432">z</a>';
    expect(phonesInLinks(html)).toEqual([
      { value: "+59899123456", mobile: true },
      { value: "+59898765432", mobile: true },
      { value: "08002525", mobile: false },
      { value: "+59829012345", mobile: false },
    ]);
  });
});
```

- [ ] **Step 2:** `npx vitest run tests/autos/phones.test.ts` → FAIL (módulo inexistente).
- [ ] **Step 3: implementación**

```ts
// Teléfonos uruguayos que el propio vendedor escribió. Precisión antes que cobertura: ocho dígitos
// pelados también son un precio en pesos, así que un celular sin el 0 ni el 598, o un fijo, sólo
// cuentan con una palabra de contacto cerca (en la página de contacto de una automotora el contexto
// ya es de contacto). Ver docs/app/AUTOS_CONTACTOS.md.
import { fold } from "../normalize";

export interface CarPhone {
  /** "+59899123456", "+59829012345" o "08002525" (el 0800 no tiene forma internacional). */
  value: string;
  /** Celular: además de llamar se ofrece WhatsApp. */
  mobile: boolean;
}

const VALID = /^(?:\+598(?:9[1-9]\d{6}|[24]\d{7})|0800\d{4})$/;
export const validCarPhone = (value: string): boolean => VALID.test(String(value || ""));

export function normalizeCarPhone(raw: string): CarPhone | null {
  let digits = String(raw || "").replace(/\D/g, "");
  if (digits.startsWith("598")) digits = digits.slice(3);
  if (/^0?800\d{4}$/.test(digits)) return { value: `0${digits.replace(/^0/, "")}`, mobile: false };
  if (digits.startsWith("0")) digits = digits.slice(1);
  if (/^9[1-9]\d{6}$/.test(digits)) return { value: `+598${digits}`, mobile: true };
  if (/^[24]\d{7}$/.test(digits)) return { value: `+598${digits}`, mobile: false };
  return null;
}

export function displayCarPhone(value: string): string {
  if (/^0800\d{4}$/.test(value)) return `0800 ${value.slice(4)}`;
  const national = value.replace(/^\+598/, "");
  if (/^9\d{7}$/.test(national)) return `0${national.slice(0, 2)} ${national.slice(2, 5)} ${national.slice(5)}`;
  if (/^[24]\d{7}$/.test(national)) return `${national.slice(0, 4)} ${national.slice(4)}`;
  return value;
}

const WHATSAPP_LINK = /(?:wa\.me\/|api\.whatsapp\.com\/send\/?\?phone=|whatsapp:\/\/send\?phone=)\+?(\d{8,13})/gi;
const TEL_LINK = /href=["']tel:([^"']+)["']/gi;

/** `tel:` y enlaces de WhatsApp de una página: WhatsApp primero, que es como se contacta acá. */
export function phonesInLinks(html: string): CarPhone[] {
  const found: CarPhone[] = [];
  for (const match of String(html || "").matchAll(WHATSAPP_LINK)) {
    const phone = normalizeCarPhone(match[1]!);
    if (phone?.mobile) found.push(phone);
  }
  for (const match of String(html || "").matchAll(TEL_LINK)) {
    const phone = normalizeCarPhone(match[1]!);
    if (phone) found.push(phone);
  }
  return dedupe(found);
}

const CONTACT_WORD = /\b(?:cel(?:ular)?|tel(?:efono|ef)?|whats?app|whats|wsp|wpp|llam(?:ar|en|a|ame)|contacto|contactar(?:se)?|consultas?|comunicarse|comunicate|escribime|escribir|numero|nro)\b/;
const MONEY_BEFORE = /(?:\$|u\$s|us\$|usd|u\$d|precio|pesos)\s*[:.]?\s*$/;
// Celular con el 0 o el 598, cualquier agrupación de a un separador: "099 123 456", "(094) 44 22 99".
const MOBILE = /(?<!\d)(\+?\s?598[\s.-]*)?\(?(0)?9[1-9]\)?(?:[\s.-]?\d){6}(?!\d)/g;
// Fijo: agrupación estricta, porque "2.450.000" con agrupación libre también son ocho dígitos.
const LANDLINE = /(?<!\d)(?:\+?\s?598[\s.-]*)?([24]\d{3})[\s.-]?(\d{4})(?!\d)/g;
const TOLL_FREE = /(?<!\d)0800[\s.-]?\d{4}(?!\d)/g;
const YEAR = /^(?:19|20)\d{2}$/;

const dedupe = (phones: readonly CarPhone[]): CarPhone[] => [...new Map(phones.map(phone => [phone.value, phone])).values()];

export function phonesInText(text: string, options: { contactPage?: boolean; max?: number } = {}): CarPhone[] {
  const source = String(text || "");
  const max = options.max ?? 3;
  const hits: Array<{ index: number; phone: CarPhone }> = [];
  const nearContact = (start: number, end: number): boolean =>
    !!options.contactPage || CONTACT_WORD.test(fold(source.slice(Math.max(0, start - 40), end + 20)));
  const afterMoney = (start: number): boolean => MONEY_BEFORE.test(fold(source.slice(Math.max(0, start - 12), start)));
  for (const match of source.matchAll(WHATSAPP_LINK)) {
    const phone = normalizeCarPhone(match[1]!);
    if (phone?.mobile) hits.push({ index: match.index!, phone });
  }
  for (const match of source.matchAll(TOLL_FREE)) {
    const phone = normalizeCarPhone(match[0]);
    if (phone) hits.push({ index: match.index!, phone });
  }
  for (const match of source.matchAll(MOBILE)) {
    const start = match.index!;
    const bare = !match[1] && !match[2];
    if (bare && (!nearContact(start, start + match[0].length) || afterMoney(start))) continue;
    const phone = normalizeCarPhone(match[0]);
    if (phone) hits.push({ index: start, phone });
  }
  for (const match of source.matchAll(LANDLINE)) {
    const start = match.index!;
    if (YEAR.test(match[1]!) && YEAR.test(match[2]!)) continue;
    if (!nearContact(start, start + match[0].length) || afterMoney(start)) continue;
    const phone = normalizeCarPhone(match[0]);
    if (phone) hits.push({ index: start, phone });
  }
  const phones = dedupe(hits.sort((a, b) => a.index - b.index).map(hit => hit.phone));
  // Más de cinco números distintos no es un vendedor: es una lista (una agencia, un grupo, un spam).
  if (phones.length > 5) return [];
  return phones.slice(0, max);
}
```

- [ ] **Step 4:** `npx vitest run tests/autos/phones.test.ts` → PASS. Ajustar regex si algún caso falla, sin
  aflojar los casos negativos.
- [ ] **Step 5:** commit `feat(autos): leer teléfonos uruguayos del texto de un aviso`.

### Task 2: Hash de bajas + contacto de automotoras + registro

**Files:**
- Create: `classes/autos/contacts/optout.ts`, `classes/autos/contacts/dealers.ts`
- Modify: `classes/autos/sources/registry.ts` (campo `contactPage`), `app/utils/cars.ts`
  (`CAR_SOURCE_RULES[*].contactPage`), `app/tests/unit/carSourcesParity.test.ts`
- Test: `tests/autos/dealerContacts.test.ts`

**Interfaces:**
- Consumes: `CarPhone`, `phonesInLinks`, `phonesInText` (Task 1); `autosFetchText`, `htmlText` (`sources/common.ts`).
- Produces: `carContactHash(value: string): string`;
  `interface DealerContactRecord { source: CarSource; phones: CarPhone[]; sourceUrl: string; observedAt: string | null; lastAttemptAt: string; ok: boolean; note: string | null; failingSince: string | null }`;
  `DEALER_CONTACT_SOURCES: CarSource[]`; `dealerPagePhones(html: string): CarPhone[]`;
  `nextDealerContact(previous, read: { phones: CarPhone[]; failure: string | null }, source, at): DealerContactRecord`;
  `readDealerContacts(previous: ReadonlyMap<CarSource, DealerContactRecord>, options?: { fetchPage?: (url: string, source: CarSource) => Promise<string | null>; now?: () => Date; gapMs?: number }): Promise<DealerContactRecord[]>`;
  `CarSourceInfo.contactPage: string | null`.

- [ ] **Step 1: tests** (`tests/autos/dealerContacts.test.ts`)

```ts
import { describe, expect, it } from "vitest";
import { carContactHash } from "../../classes/autos/contacts/optout";
import { dealerPagePhones, DEALER_CONTACT_SOURCES, nextDealerContact, readDealerContacts } from "../../classes/autos/contacts/dealers";
import { CAR_SOURCES } from "../../classes/autos/sources/registry";

const AT = "2026-09-21T10:00:00.000Z";

describe("dealer contact pages", () => {
  it("reads WhatsApp, tel: and printed numbers, links first, up to four", () => {
    const html = '<header>Salir 093 111 222 - 094 333 444</header><a href="https://wa.me/59891000111">wa</a>' +
      '<a href="tel:0800 2525">0800 2525</a><footer>RUT 217322040016 SA 2605 3290</footer><script>var x="099 999 999"</script>';
    expect(dealerPagePhones(html).map(phone => phone.value)).toEqual(["+59891000111", "08002525", "+59893111222", "+59894333444"]);
  });
  it("only dealer websites have a contact page, and it is on their own host", () => {
    expect(DEALER_CONTACT_SOURCES.sort()).toEqual(["carone", "carper", "fidocar", "julio", "motorlider", "shoppingdeautos"]);
    for (const source of DEALER_CONTACT_SOURCES) {
      const page = new URL(CAR_SOURCES[source].contactPage!);
      expect(page.protocol).toBe("https:");
      expect(CAR_SOURCES[source].dealerName).not.toBeNull();
    }
    expect(CAR_SOURCES.mercadolibre.contactPage).toBeNull();
    expect(CAR_SOURCES.facebook.contactPage).toBeNull();
  });
  it("keeps the previous numbers WITH their old date when a read fails or finds nothing", () => {
    const good = nextDealerContact(null, { phones: [{ value: "+59891000111", mobile: true }], failure: null }, "julio", AT);
    expect(good).toMatchObject({ ok: true, observedAt: AT, failingSince: null });
    const later = "2026-09-22T10:00:00.000Z";
    const failed = nextDealerContact(good, { phones: [], failure: "HTTP 503" }, "julio", later);
    expect(failed).toMatchObject({ ok: false, observedAt: AT, phones: good.phones, note: "HTTP 503", failingSince: later, lastAttemptAt: later });
    const empty = nextDealerContact(good, { phones: [], failure: null }, "julio", later);
    expect(empty).toMatchObject({ ok: false, observedAt: AT, note: "sin números" });
  });
  it("reads every dealer page once", async () => {
    const asked: string[] = [];
    const records = await readDealerContacts(new Map(), {
      fetchPage: async url => { asked.push(url); return '<a href="tel:+59829012345">x</a>'; },
      now: () => new Date(AT), gapMs: 0,
    });
    expect(asked.sort()).toEqual(DEALER_CONTACT_SOURCES.map(source => CAR_SOURCES[source].contactPage!).sort());
    expect(records.every(record => record.ok && record.phones[0]!.value === "+59829012345")).toBe(true);
  });
});

describe("opt-out hash", () => {
  it("is a stable sha-256 of the prefixed value", () => {
    expect(carContactHash("+59899123456")).toMatch(/^[0-9a-f]{64}$/);
    expect(carContactHash("+59899123456")).toBe(carContactHash("+59899123456"));
    expect(carContactHash("+59899123456")).not.toBe(carContactHash("+59899123457"));
  });
});
```

- [ ] **Step 2:** correr → FAIL.
- [ ] **Step 3: implementación**

`classes/autos/contacts/optout.ts`:
```ts
// El pedido de baja de un número. El hash no es secreto —un celular uruguayo se recupera por fuerza
// bruta—: sólo evita que la lista de bajas sea un directorio legible. app/server/utils/carContacts.ts
// tiene la misma función y un test compara las dos.
import { createHash } from "crypto";

export const carContactHash = (value: string): string => createHash("sha256").update(`car-contact:${value}`).digest("hex");
```

`registry.ts`: agregar a `CarSourceInfo`
```ts
  /** La página de contacto de la automotora en SU web: única fuente del número comercial. */
  contactPage: string | null;
```
y los valores: julio `https://julioautomoviles.com.uy/contacto/`, shoppingdeautos
`https://shoppingdeautos.uy/contacto/`, carper `https://usados.carper.com.uy/contacto/`, fidocar
`https://www.usadosfidocar.com.uy/contacto`, carone `https://carone.com.uy/contacto`, motorlider
`https://motorlider.com.uy/contacto`; el resto `null`. Mismo campo en `app/utils/cars.ts`
(`CAR_SOURCE_RULES`, tipo `{ name; permalink; pictureHost; contactPage: string | null }`) y en el test
de paridad: `expect(CAR_SOURCE_RULES[source].contactPage).toBe(CAR_SOURCES[source].contactPage)`.

`classes/autos/contacts/dealers.ts`:
```ts
// El número comercial de una automotora, leído de la página de contacto de SU propia web (una URL
// fija por fuente en el registro). Una lectura por corrida diaria. Una lectura fallida o vacía
// conserva lo anterior con su fecha vieja, que vence sola (CAR_CONTACT_MAX_AGE_DAYS).
import { autosFetchText, htmlText } from "../sources/common";
import { CAR_SOURCES, CAR_SOURCE_LIST } from "../sources/registry";
import type { CarSource } from "../types";
import { phonesInLinks, phonesInText, type CarPhone } from "./phones";

export interface DealerContactRecord {
  source: CarSource;
  phones: CarPhone[];
  sourceUrl: string;
  /** La última lectura que encontró números. */
  observedAt: string | null;
  lastAttemptAt: string;
  ok: boolean;
  note: string | null;
  failingSince: string | null;
}

export const DEALER_CONTACT_SOURCES: CarSource[] = CAR_SOURCE_LIST.filter(source => !!CAR_SOURCES[source].contactPage);
const MAX_DEALER_PHONES = 4;

export function dealerPagePhones(html: string): CarPhone[] {
  const phones = [...phonesInLinks(html), ...phonesInText(htmlText(html), { contactPage: true, max: 10 })];
  return [...new Map(phones.map(phone => [phone.value, phone])).values()].slice(0, MAX_DEALER_PHONES);
}

export function nextDealerContact(
  previous: DealerContactRecord | null,
  read: { phones: CarPhone[]; failure: string | null },
  source: CarSource,
  at: string,
): DealerContactRecord {
  const sourceUrl = CAR_SOURCES[source].contactPage!;
  if (!read.failure && read.phones.length) {
    return { source, phones: read.phones, sourceUrl, observedAt: at, lastAttemptAt: at, ok: true, note: null, failingSince: null };
  }
  return {
    source,
    phones: previous?.phones ?? [],
    sourceUrl,
    observedAt: previous?.observedAt ?? null,
    lastAttemptAt: at,
    ok: false,
    note: read.failure ?? "sin números",
    failingSince: previous?.failingSince ?? at,
  };
}

export async function readDealerContacts(
  previous: ReadonlyMap<CarSource, DealerContactRecord>,
  options: { fetchPage?: (url: string, source: CarSource) => Promise<string | null>; now?: () => Date; gapMs?: number } = {},
): Promise<DealerContactRecord[]> {
  const clock = options.now ?? (() => new Date());
  const gapMs = options.gapMs ?? 1_500;
  const records: DealerContactRecord[] = [];
  for (const [index, source] of DEALER_CONTACT_SOURCES.entries()) {
    if (index && gapMs) await new Promise(resolve => setTimeout(resolve, gapMs));
    const url = CAR_SOURCES[source].contactPage!;
    let html: string | null = null;
    let failure: string | null = null;
    if (options.fetchPage) html = await options.fetchPage(url, source);
    else {
      const fetched = await autosFetchText(url, 30_000, source);
      html = fetched.body;
      failure = fetched.failure;
    }
    if (html === null) failure = failure ?? "sin respuesta";
    records.push(nextDealerContact(previous.get(source) ?? null, { phones: html ? dealerPagePhones(html) : [], failure }, source, clock().toISOString()));
  }
  return records;
}
```

- [ ] **Step 4:** `npx vitest run tests/autos/dealerContacts.test.ts tests/autos/registry.test.ts` y
  `cd app && npx vitest run tests/unit/carSourcesParity.test.ts` → PASS.
- [ ] **Step 5:** commit `feat(autos): número comercial de cada automotora desde su página de contacto`.

### Task 3: Armado de la base + contrato público + `hasContact` en el catálogo

**Files:**
- Create: `classes/autos/contacts/build.ts`
- Modify: `classes/autos/publicTypes.ts`, `app/utils/carsPublic.ts`, `classes/autos/project.ts`
- Test: `tests/autos/contacts.test.ts`, `tests/autos/project.test.ts`

**Interfaces:**
- Consumes: Tasks 1–2.
- Produces: `CAR_CONTACT_MAX_AGE_DAYS = 21`;
  `interface CarContactRecord { key: string; source: CarSource; sellerType: CarSellerType | null; origin: "advert_text" | "dealer_site"; phones: CarPhone[]; sourceUrl: string; observedAt: string }`;
  `carContactFor(listing: CarListing, options: ContactOptions): CarContactRecord | null`;
  `buildCarContacts(listings: readonly CarListing[], options: ContactOptions): CarContactRecord[]`;
  `interface ContactOptions { now: Date; dealers: ReadonlyMap<CarSource, DealerContactRecord>; optOuts: ReadonlySet<string> }`;
  `PublicCarContactPhone`, `PublicCarContact` en el contrato; `PublicCarListing.hasContact?: boolean`;
  `publicCarListing(listing, opportunity, hasContact = false)`; `CatalogContext.contactKeys?: ReadonlySet<string>`.

- [ ] **Step 1: tests** (`tests/autos/contacts.test.ts`; `car()` copia el helper de `project.test.ts`)

Casos:
1. ML con `detail.description` "Llamar al 099 123 456" leída hoy → `origin: "advert_text"`,
   `sourceUrl` = permalink, `observedAt` = `detail.readAt`, un teléfono.
2. Ficha leída hace 22 días → sin teléfono del texto (y ML no tiene automotora) → `null`.
3. Título con "wsp 099 123 456" sin ficha → toma el título con `observedAt = listing.observedAt`.
4. Facebook con número en la descripción → `null`.
5. `julio` sin número en el texto, dealer record ok de hace 2 días → `dealer_site`, `sourceUrl` =
   contactPage, `observedAt` del record; con record de hace 30 días → `null`; con `sellerType: "private"` → `null`.
6. Bajas: el hash de "+59899123456" en `optOuts` saca ese número; si no queda ninguno → `null`.
7. `buildCarContacts` descarta permalinks que no son de la fuente y ordena por key.

`project.test.ts`: agregar `"hasContact"` a la lista de claves del primer test y un caso
`buildCarCatalog(..., { ...context, contactKeys: new Set(["ml-MLU1"]) })` → `hasContact: true` sólo en ese.

- [ ] **Step 2:** correr → FAIL.
- [ ] **Step 3: implementación** (`classes/autos/contacts/build.ts`)

```ts
// La base de teléfonos: un registro por AVISO publicado, nunca por persona. Qué entra:
//   * "advert_text": lo que el vendedor escribió en el título o la descripción pública de SU aviso;
//   * "dealer_site": el número comercial de la automotora, sólo si el aviso no trae uno propio.
// Facebook nunca (su texto se lee con sesión). Vence a los 21 días de su propia lectura, como en
// viviendas (docs/app/PROPERTY_ADVERTISERS.md). Ver docs/app/AUTOS_CONTACTOS.md.
import { safeSourcePermalink } from "../sources/registry";
import type { CarListing, CarSellerType, CarSource } from "../types";
import type { DealerContactRecord } from "./dealers";
import { carContactHash } from "./optout";
import { phonesInText, type CarPhone } from "./phones";

export const CAR_CONTACT_MAX_AGE_DAYS = 21;

export interface CarContactRecord {
  key: string;
  source: CarSource;
  sellerType: CarSellerType | null;
  origin: "advert_text" | "dealer_site";
  phones: CarPhone[];
  sourceUrl: string;
  observedAt: string;
}

export interface ContactOptions {
  now: Date;
  dealers: ReadonlyMap<CarSource, DealerContactRecord>;
  optOuts: ReadonlySet<string>;
}

const fresh = (at: string | null | undefined, now: Date): at is string =>
  !!at && Number.isFinite(Date.parse(at)) && now.getTime() - Date.parse(at) <= CAR_CONTACT_MAX_AGE_DAYS * 86_400_000;

export function carContactFor(listing: CarListing, options: ContactOptions): CarContactRecord | null {
  if (listing.source === "facebook") return null;
  const permalink = safeSourcePermalink(listing.source, listing.permalink);
  if (!permalink) return null;
  const allowed = (phones: readonly CarPhone[]) => phones.filter(phone => !options.optOuts.has(carContactHash(phone.value)));
  const detail = listing.detail;
  const fromDescription = detail && fresh(detail.readAt, options.now) ? phonesInText(detail.description) : [];
  const fromTitle = fresh(listing.observedAt, options.now) ? phonesInText(listing.title) : [];
  const own = allowed([...new Map([...fromDescription, ...fromTitle].map(phone => [phone.value, phone])).values()]).slice(0, 3);
  const base = { key: listing.key, source: listing.source, sellerType: listing.sellerType };
  if (own.length) {
    return { ...base, origin: "advert_text", phones: own, sourceUrl: permalink, observedAt: fromDescription.length ? detail!.readAt : listing.observedAt };
  }
  const dealer = options.dealers.get(listing.source);
  if (listing.sellerType !== "dealer" || !dealer || !fresh(dealer.observedAt, options.now)) return null;
  const phones = allowed(dealer.phones);
  return phones.length ? { ...base, origin: "dealer_site", phones, sourceUrl: dealer.sourceUrl, observedAt: dealer.observedAt } : null;
}

export function buildCarContacts(listings: readonly CarListing[], options: ContactOptions): CarContactRecord[] {
  return listings
    .map(listing => carContactFor(listing, options))
    .filter((record): record is CarContactRecord => !!record)
    .sort((a, b) => a.key.localeCompare(b.key));
}
```

Contrato (`publicTypes.ts`, y la copia con el formato de la app en `app/utils/carsPublic.ts`):
```ts
/** Un teléfono del vendedor: `value` se marca ("+59899123456", "08002525"), `display` se lee. */
export interface PublicCarContactPhone {
  value: string;
  display: string;
  mobile: boolean;
}
/**
 * Cómo contactar al vendedor de UN aviso, pedido aparte y con un clic: nunca viaja con el catálogo.
 * "advert_text" = lo escribió el vendedor en el texto público de su aviso (`sourceUrl` es el aviso);
 * "dealer_site" = el número comercial de la automotora en su propia web (`sourceUrl` es esa página).
 */
export interface PublicCarContact {
  key: string;
  origin: "advert_text" | "dealer_site";
  phones: PublicCarContactPhone[];
  sourceUrl: string;
  observedAt: string;
}
```
y en `PublicCarListing`, después de `reference`:
```ts
  /** Hay un teléfono publicable para este aviso (se pide a /api/cars/contact/<key>). */
  hasContact?: boolean;
```

`project.ts`: `publicCarListing(listing, opportunity, hasContact = false)` agrega `hasContact`;
`CatalogContext` suma `contactKeys?: ReadonlySet<string>` y `buildCarCatalog` pasa
`!!context.contactKeys?.has(listing.key)`.

- [ ] **Step 4:** `npx vitest run tests/autos/contacts.test.ts tests/autos/project.test.ts tests/autos/contracts.test.ts` → PASS.
- [ ] **Step 5:** commit `feat(autos): la base de teléfonos, un registro por aviso publicado`.

### Task 4: Persistencia + orquestación + relectura de fichas

**Files:**
- Modify: `classes/autos/store.ts`, `sync_autos.ts`, `sync_autos_detail.ts`
- Test: `tests/autos/store.test.ts`

**Interfaces:**
- Produces (store): `CAR_CONTACTS_COLLECTION = "carcontacts"`, `CAR_CONTACT_OPTOUTS_COLLECTION = "carcontactoptouts"`,
  `publishCarContacts(records: readonly CarContactRecord[], updatedAt: string): Promise<{ written: number; removed: number }>`,
  `loadContactOptOuts(): Promise<Set<string>>`, `loadDealerContacts(): Promise<Map<CarSource, DealerContactRecord>>`,
  `saveDealerContacts(records: readonly DealerContactRecord[]): Promise<void>`.

- [ ] **Step 1: test** en `store.test.ts` con el doble de `appConnection` que ya usa el archivo:
  `publishCarContacts` hace `replaceOne` upsert por key y `deleteMany({ key: { $nin: keys } })`, y con
  cero registros borra todo.
- [ ] **Step 2:** correr → FAIL.
- [ ] **Step 3: implementación**

```ts
export const CAR_CONTACTS_COLLECTION = "carcontacts";
export const CAR_CONTACT_OPTOUTS_COLLECTION = "carcontactoptouts";
const dealerContactKey = (source: CarSource): string => `uy-cars-dealer-contact-${source}`;

/**
 * La base de teléfonos se reescribe ENTERA con cada catálogo publicado: lo que salió del catálogo
 * (vendido, retirado, no visto en 4 días) se borra acá, así la base nunca guarda el número de un
 * aviso que ya no existe.
 */
export async function publishCarContacts(records: readonly CarContactRecord[], updatedAt: string): Promise<{ written: number; removed: number }> {
  await nativeReady();
  const collection = appConnection().collection(CAR_CONTACTS_COLLECTION);
  await collection.createIndex({ key: 1 }, { unique: true });
  for (let index = 0; index < records.length; index += CHUNK) {
    await collection.bulkWrite(records.slice(index, index + CHUNK).map(record => ({
      replaceOne: { filter: { key: record.key }, replacement: { ...record, updatedAt }, upsert: true },
    })), { ordered: false });
  }
  const removed = await collection.deleteMany({ key: { $nin: records.map(record => record.key) } });
  return { written: records.length, removed: removed.deletedCount ?? 0 };
}

export async function loadContactOptOuts(): Promise<Set<string>> {
  await nativeReady();
  const rows = await appConnection().collection(CAR_CONTACT_OPTOUTS_COLLECTION).find({}, { projection: { _id: 1 } }).toArray();
  return new Set(rows.map(row => String(row._id)));
}

export async function loadDealerContacts(): Promise<Map<CarSource, DealerContactRecord>> {
  const docs = await CarHarvestMetaModel.find({ key: { $regex: "^uy-cars-dealer-contact-" } }).lean();
  const records = new Map<CarSource, DealerContactRecord>();
  for (const doc of docs) {
    const data = doc.data as DealerContactRecord | undefined;
    if (data?.source && Array.isArray(data.phones)) records.set(data.source, data);
  }
  return records;
}

export async function saveDealerContacts(records: readonly DealerContactRecord[]): Promise<void> {
  for (const record of records) {
    await CarHarvestMetaModel.updateOne({ key: dealerContactKey(record.source) }, { $set: { updatedAt: record.lastAttemptAt, data: record } }, { upsert: true });
  }
}
```

`sync_autos.ts`:
- Después del bucle de webs (dentro de `if (!analyzeOnly && !fast)`), leer automotoras:
  `const dealerRecords = await readDealerContacts(dryRun ? new Map() : await loadDealerContacts());`
  loguear `[autos] contacto de automotoras: julio=1 carper=1 … (fallas: …)` (sólo cantidades) y,
  si no es dry-run, `saveDealerContacts(dealerRecords)`. Guardar `dealerRecords` en una variable
  para el dry-run.
- Antes de `buildCarCatalog`:
  ```ts
  const dealers = dryRun ? new Map(dryDealerRecords.map(record => [record.source, record] as const)) : await loadDealerContacts();
  const optOuts = dryRun ? new Set<string>() : await loadContactOptOuts();
  const freshCutoff = now.getTime() - CAR_CATALOG_FRESH_DAYS * 86_400_000;
  const contacts = buildCarContacts(listings.filter(listing => Date.parse(listing.lastSeen) >= freshCutoff), { now, dealers, optOuts });
  const contactKeys = new Set(contacts.map(contact => contact.key));
  ```
  y pasar `contactKeys` al contexto de `buildCarCatalog`. Log:
  `[autos] teléfonos: N avisos (texto X, automotora Y) ${porFuente}`.
- En `--report`: `contacts: { total, byOrigin, bySource }` (sin números).
- Publicación: dentro del `else` que publica el catálogo, después de `publishCarCatalog`:
  ```ts
  const catalogKeys = new Set(catalog.listings.map(row => row.key));
  const published = await publishCarContacts(contacts.filter(contact => catalogKeys.has(contact.key)), generatedAt);
  console.log(`[autos] teléfonos publicados ${published.written}, borrados ${published.removed}`);
  ```

`sync_autos_detail.ts`: `refreshDays: number("AUTOS_DETAIL_REFRESH_DAYS", 14)` con el comentario de por
qué (la ficha es la lectura propia del teléfono del texto y vence a los 21 días).

- [ ] **Step 4:** `npx vitest run tests/autos` + `npx tsc -p tsconfig.production.json --noEmit` → verde.
- [ ] **Step 5:** commit `feat(autos): sync_autos publica la base de teléfonos junto al catálogo`.

### Task 5: API de la app (lectura + baja)

**Files:**
- Create: `app/server/models/CarContact.ts`, `app/server/models/CarContactOptOut.ts`,
  `app/server/utils/carContacts.ts`, `app/server/api/cars/contact/[key].get.ts`,
  `app/server/api/cars/contact/[key]/optout.post.ts`
- Modify: `app/server/utils/cars.ts` (`hasContact` en `CAR_FIELDS` y `publicCarRow`), `app/nuxt.config.ts`
  (robots `disallow` `/api/cars/contact`)
- Test: `app/tests/unit/carContacts.test.ts`

**Interfaces:**
- Produces: `publicCarContact(doc, row, { now, optedOut }): PublicCarContact | null`,
  `carContactHash(value)`, `displayCarPhone(value)`, `carContactRateOk(bucket: Map, ip, limit, windowMs, now): boolean`.

- [ ] **Step 1: tests** (`app/tests/unit/carContacts.test.ts`)

```ts
import { describe, expect, it } from 'vitest'
import { carContactHash as backendHash } from '../../../classes/autos/contacts/optout'
import {
  carContactHash,
  carContactRateOk,
  displayCarPhone,
  publicCarContact,
} from '../../server/utils/carContacts'

const NOW = new Date('2026-09-21T12:00:00.000Z')
const row = {
  key: 'ml-MLU1',
  source: 'mercadolibre',
  permalink: 'https://auto.mercadolibre.com.uy/MLU-1-peugeot-_JM',
}
const doc = {
  key: 'ml-MLU1',
  origin: 'advert_text',
  phones: [
    { value: '+59899123456', mobile: true },
    { value: '+59829012345', mobile: false },
  ],
  sourceUrl: row.permalink,
  observedAt: '2026-09-20T12:00:00.000Z',
}
const opts = { now: NOW, optedOut: new Set<string>() }

describe('publicCarContact', () => {
  it('rebuilds the answer field by field', () => {
    expect(publicCarContact(doc, row, opts)).toEqual({
      key: 'ml-MLU1',
      origin: 'advert_text',
      phones: [
        { value: '+59899123456', display: '099 123 456', mobile: true },
        { value: '+59829012345', display: '2901 2345', mobile: false },
      ],
      sourceUrl: row.permalink,
      observedAt: doc.observedAt,
    })
  })
  it('refuses facebook, foreign urls, stale reads and junk numbers', () => {
    expect(publicCarContact(doc, { ...row, source: 'facebook' }, opts)).toBeNull()
    expect(publicCarContact({ ...doc, sourceUrl: 'https://evil.example/' }, row, opts)).toBeNull()
    expect(publicCarContact({ ...doc, observedAt: '2026-08-20T12:00:00.000Z' }, row, opts)).toBeNull()
    expect(publicCarContact({ ...doc, phones: [{ value: 'javascript:x', mobile: true }] }, row, opts)).toBeNull()
  })
  it('accepts a dealer page only if it is the source contact page', () => {
    const dealerRow = { key: 'julio-1', source: 'julio', permalink: 'https://julioautomoviles.com.uy/vehiculo/x/' }
    const dealerDoc = { ...doc, key: 'julio-1', origin: 'dealer_site', sourceUrl: 'https://julioautomoviles.com.uy/contacto/' }
    expect(publicCarContact(dealerDoc, dealerRow, opts)?.sourceUrl).toBe('https://julioautomoviles.com.uy/contacto/')
    expect(publicCarContact({ ...dealerDoc, sourceUrl: dealerRow.permalink }, dealerRow, opts)).toBeNull()
  })
  it('drops opted-out numbers', () => {
    const optedOut = new Set([carContactHash('+59899123456')])
    expect(publicCarContact(doc, row, { now: NOW, optedOut })?.phones.map(p => p.value)).toEqual(['+59829012345'])
  })
  it('hashes exactly like the backend and formats like it', () => {
    expect(carContactHash('+59899123456')).toBe(backendHash('+59899123456'))
    expect(displayCarPhone('08002525')).toBe('0800 2525')
  })
  it('rate-limits per ip and window', () => {
    const bucket = new Map()
    for (let i = 0; i < 3; i++) expect(carContactRateOk(bucket, 'ip', 3, 1000, 0)).toBe(true)
    expect(carContactRateOk(bucket, 'ip', 3, 1000, 10)).toBe(false)
    expect(carContactRateOk(bucket, 'ip', 3, 1000, 2000)).toBe(true)
  })
})
```

- [ ] **Step 2:** `cd app && npx vitest run tests/unit/carContacts.test.ts` → FAIL.
- [ ] **Step 3: implementación**

`app/server/utils/carContacts.ts`:
```ts
// La frontera pública del teléfono de un aviso de autos. Se rearma campo por campo y se revalida
// todo (número, URL de procedencia, antigüedad, bajas): no se confía en lo que quedó en la base.
// Política: docs/app/AUTOS_CONTACTOS.md.
import { createHash } from 'node:crypto'
import { CAR_SOURCE_RULES, CAR_SOURCES_PUBLIC, carSafePermalink } from '../../utils/cars'
import type { PublicCarContact, PublicCarSource } from '../../utils/carsPublic'

export const CAR_CONTACT_MAX_AGE_DAYS = 21
const VALID = /^(?:\+598(?:9[1-9]\d{6}|[24]\d{7})|0800\d{4})$/

/** Igual que classes/autos/contacts/optout.ts; un test compara las dos. */
export const carContactHash = (value: string): string =>
  createHash('sha256').update(`car-contact:${value}`).digest('hex')

export function displayCarPhone(value: string): string {
  if (/^0800\d{4}$/.test(value)) return `0800 ${value.slice(4)}`
  const national = value.replace(/^\+598/, '')
  if (/^9\d{7}$/.test(national))
    return `0${national.slice(0, 2)} ${national.slice(2, 5)} ${national.slice(5)}`
  if (/^[24]\d{7}$/.test(national)) return `${national.slice(0, 4)} ${national.slice(4)}`
  return value
}

export function publicCarContact(
  doc: Record<string, any> | null,
  row: Record<string, any> | null,
  options: { now: Date; optedOut: ReadonlySet<string> }
): PublicCarContact | null {
  if (!doc || !row || doc.key !== row.key) return null
  const source = row.source as PublicCarSource
  if (!CAR_SOURCES_PUBLIC.includes(source) || source === 'facebook') return null
  const observed = Date.parse(String(doc.observedAt ?? ''))
  if (!Number.isFinite(observed) || options.now.getTime() - observed > CAR_CONTACT_MAX_AGE_DAYS * 86_400_000)
    return null
  const origin = doc.origin === 'dealer_site' ? 'dealer_site' : doc.origin === 'advert_text' ? 'advert_text' : null
  const expectedUrl =
    origin === 'advert_text' ? carSafePermalink(source, row.permalink) : CAR_SOURCE_RULES[source].contactPage
  if (!origin || !expectedUrl || doc.sourceUrl !== expectedUrl) return null
  const phones = (Array.isArray(doc.phones) ? doc.phones : [])
    .filter((phone: any) => typeof phone?.value === 'string' && VALID.test(phone.value))
    .filter((phone: any) => !options.optedOut.has(carContactHash(phone.value)))
    .slice(0, 4)
    .map((phone: any) => ({
      value: phone.value as string,
      display: displayCarPhone(phone.value),
      mobile: phone.mobile === true && phone.value.startsWith('+5989'),
    }))
  if (!phones.length) return null
  return { key: String(doc.key), origin, phones, sourceUrl: expectedUrl, observedAt: new Date(observed).toISOString() }
}

/** Límite por IP en memoria (por proceso de pm2: aproximado a propósito, no es una garantía). */
export function carContactRateOk(
  bucket: Map<string, { count: number; resetAt: number }>,
  ip: string,
  limit: number,
  windowMs: number,
  now = Date.now()
): boolean {
  const record = bucket.get(ip)
  if (!record || record.resetAt <= now) {
    bucket.set(ip, { count: 1, resetAt: now + windowMs })
    if (bucket.size > 5_000) for (const [key, value] of bucket) if (value.resetAt <= now) bucket.delete(key)
    return true
  }
  record.count++
  return record.count <= limit
}
```

(Nota: `observedAt` se devuelve normalizado con `toISOString()`; el test compara con
`doc.observedAt`, que ya está en ese formato.)

Modelos (mismo patrón que `CarCatalogMeta.ts`, `autoCreate: false, autoIndex: false`):
`CarContact` → colección `carcontacts` con `key`, `source`, `sellerType`, `origin`, `phones`
(Mixed), `sourceUrl`, `observedAt`, `updatedAt`; `CarContactOptOut` → `carcontactoptouts` con
`_id: String`, `createdAt: String`, `key: String` (`_id: false` en el schema no: `_id` es el hash).

`[key].get.ts`:
```ts
import { carKeyValid } from '../../../../utils/cars'
import { CarCatalogModel } from '../../../models/CarCatalog'
import { CarContactModel } from '../../../models/CarContact'
import { CarContactOptOutModel } from '../../../models/CarContactOptOut'
import { loadCarCatalogMeta } from '../../../utils/cars'
import { carContactHash, carContactRateOk, publicCarContact } from '../../../utils/carContacts'
import { connectDb } from '../../../utils/db'

const reads = new Map<string, { count: number; resetAt: number }>()

export default defineEventHandler(async event => {
  setResponseHeader(event, 'cache-control', 'private, no-store')
  setResponseHeader(event, 'x-robots-tag', 'noindex, nofollow')
  const key = String(getRouterParam(event, 'key') || '')
  if (!carKeyValid(key)) throw createError({ statusCode: 404, statusMessage: 'Contact not found' })
  const ip = getRequestIP(event, { xForwardedFor: true }) || 'unknown'
  if (!carContactRateOk(reads, ip, 30, 10 * 60_000)) {
    setResponseHeader(event, 'retry-after', '600')
    throw createError({ statusCode: 429, statusMessage: 'Too many requests' })
  }
  await connectDb()
  const freshDays = (await loadCarCatalogMeta())?.freshDays ?? 4
  const [row, doc] = await Promise.all([
    CarCatalogModel.findOne({ key, lastSeen: { $gte: new Date(Date.now() - freshDays * 86_400_000).toISOString() } })
      .select({ _id: 0, key: 1, source: 1, permalink: 1 }).maxTimeMS(3_000).lean(),
    CarContactModel.findOne({ key }).select({ _id: 0 }).maxTimeMS(3_000).lean(),
  ])
  const values = Array.isArray((doc as any)?.phones) ? (doc as any).phones.map((p: any) => String(p?.value ?? '')) : []
  const optedOut = new Set(
    (await CarContactOptOutModel.find({ _id: { $in: values.map(carContactHash) } }).select({ _id: 1 }).lean())
      .map(item => String(item._id))
  )
  const contact = publicCarContact(doc as any, row as any, { now: new Date(), optedOut })
  if (!contact) throw createError({ statusCode: 404, statusMessage: 'Contact not found' })
  return contact
})
```

`[key]/optout.post.ts`: mismo encabezado (`no-store`), límite 5/10 min con su propio `Map`, busca el
`CarContactModel` por key (404 si no hay), `bulkWrite` de `updateOne({ _id: hash }, { $setOnInsert: { createdAt, key } }, upsert)`
por número, `CarContactModel.deleteOne({ key })`, responde `{ removed: n }`.

`app/server/utils/cars.ts`: `'hasContact'` en `CAR_FIELDS` y `hasContact: row.hasContact === true` en `publicCarRow`.

- [ ] **Step 4:** `cd app && npx vitest run tests/unit/carContacts.test.ts tests/unit/cars.test.ts tests/unit/carsApi.test.ts` → PASS.
- [ ] **Step 5:** commit `feat(autos): API del teléfono del vendedor, con un clic y con baja`.

### Task 6: UI

**Files:**
- Create: `app/components/cars/SellerPhone.vue`
- Modify: `app/pages/autos-usados-uruguay/[key].vue`, `app/components/cars/ListingCard.vue`, `app/pages/privacidad.vue`

- [ ] **Step 1:** `SellerPhone.vue` (props `car: PublicCarListing`; `v-if="car.hasContact"`):
  estado `idle | loading | shown | gone | limited | error | removed`. Botón tonal "Ver teléfono del
  vendedor" (`mdi-phone-outline`). Al mostrar: lista de números (enlace `tel:` con el `display` y, si
  `mobile`, botón "WhatsApp" a `https://wa.me/<value sin +>`), procedencia ("Lo escribió el vendedor
  en su aviso de {sourceName}" con enlace al aviso / "Número comercial que {sourceName} publica en su
  web" con enlace a la página), "Leído el {fecha}", aviso de seguridad con enlace a
  `/comprar-auto-con-deuda-uruguay`, y "¿Es tu número? Sacalo de este sitio" que confirma y hace
  `POST …/optout`. `useTrack()('car_contact_reveal', { car_source, contact_origin })` sin número.
  Áreas táctiles ≥ 44 px, espaciado en la grilla de 4 px.
- [ ] **Step 2:** en `[key].vue`, `<CarsSellerPhone :car="car" class="mt-4" />` debajo de los botones.
- [ ] **Step 3:** en `ListingCard.vue`, `· con teléfono` en la línea de la fuente cuando `car.hasContact`.
- [ ] **Step 4:** párrafo en `/privacidad`: qué número se muestra, de dónde, cuándo se borra, cómo pedir la baja.
- [ ] **Step 5:** `cd app && npm run lint` + vitest de autos; verificación en navegador (dev en el worktree,
  API de prod interceptada o datos sembrados); commit `feat(autos): ver el teléfono del vendedor en la ficha`.

### Task 7: Documentación + cierre

**Files:**
- Create: `docs/app/AUTOS_CONTACTOS.md`
- Modify: `AGENTS.md` (fila `currency-autos`), `docs/app/AUTOS.md` (enlace), comentarios de
  `classes/autos/sources/duenodirecto.ts` y `fenicio.ts`.

- [ ] **Step 1:** doc con la tabla medida, reglas, colecciones, vencimiento, bajas, límites.
- [ ] **Step 2:** `npm test` (raíz) + `cd app && npx vitest run` de autos + lint + build de raíz.
- [ ] **Step 3:** commit, merge a `main`, push, mirar el deploy y medir en producción.
