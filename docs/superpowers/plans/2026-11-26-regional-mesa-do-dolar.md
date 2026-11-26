# Mesa do Dólar en el tablero regional — plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** sumar `br_mesadodolar` como fuente en vivo del tablero regional (PTAX, comercial B3, cripto USDT/BRL) con su atribución.

**Architecture:** un módulo de fuente con tres parsers puros y un `fetch` que llama a los tres endpoints por `fetchJson`; una entrada en `LIVE_SOURCES`. Dedupe, validación, ledger e historia lo absorben sin cambios.

**Tech Stack:** TypeScript (CommonJS), vitest; Nuxt 4 para las dos páginas.

**Spec:** `docs/superpowers/specs/2026-11-26-regional-mesa-do-dolar-design.md`

## Global Constraints

- id `br_mesadodolar`, name `Mesa do Dólar`, url `https://mesadodolar.com.br/es/api-publica`, access `api`, publisher `market-data`, country `BR`.
- Base `https://mesadodolar.com.br/api/v1`; números JSON (`dot`).
- Ids de fila: `BR:ptax:USDBRL`, `BR:comercial:USDBRL`, `BR:cripto:USDBRL`.
- Atribución literal en la página de Brasil: "Fuente: Mesa do Dólar", enlazada a mesadodolar.com.br.
- Cero cifras de ingreso en nada versionado.

## Review Focus

1. Una respuesta sin `dados` o con `erro` → `[]` sin tirar (cada parser recibe `null`/objeto vacío).
2. `/ptax` con `houve_pregao: false` (feriado) → igual devuelve la última PTAX con SU fecha, nunca la de hoy.
3. `/cotacao` con mercado cerrado → `updatedAt` = `momento` (el cierre), no la hora de la consulta.
4. `/digital` sin `compra`/`venda` pero con `preco` → fila con `avg` sola.
5. El dedupe deja ganar al BCB en `ptax` y a AwesomeAPI en `comercial`, y la fila de Mesa queda en `corroboratedBy`.

---

### Task 1: fuente `br_mesadodolar`

**Files:**
- Create: `classes/regional/sources/br_mesadodolar.ts`
- Modify: `classes/regional/catalog.ts` (import + entrada en el bloque Brasil de `LIVE_SOURCES`)
- Test: `tests/regional/sources_extra.test.ts` (nuevo `describe("Mesa do Dólar (Brasil)")`)

**Interfaces:**
- Produces: `meta: RegionalSourceMeta`; `parseMesaPtax(payload): RegionalQuote[]`; `parseMesaCotacao(payload): RegionalQuote[]`; `parseMesaDigital(payload): RegionalQuote[]`; `fetchBrMesaDoDolar(): Promise<RegionalQuote[]>`.

- [ ] **Step 1: tests con fixtures de las respuestas reales del 26/11/2026**
  - `parseMesaPtax` → una fila `BR:ptax:USDBRL`, kind `official`, buy 5.744, sell 5.7446, `updatedAt` = `2026-11-26T16:00:00.000Z` (13:00 BRT del día `data`); con `data_pedida`/`houve_pregao:false` usa `data`.
  - `parseMesaCotacao` → `BR:comercial:USDBRL`, kind `wholesale`, avg 5.7447, buy/sell null, variationPct −1.28, updatedAt `2026-11-26T20:13:55.000Z`.
  - `parseMesaDigital` → `BR:cripto:USDBRL`, kind `financial`, buy 5.6563, sell 5.6564, variationPct −3.2; con sólo `preco` → avg sin puntas.
  - Los tres con `null`, `{}` y `{ erro: { mensagem } }` → `[]`.
  - `dedupeQuotes` con la fila PTAX de `br_bcb` + la de Mesa → gana `br_bcb`, `corroboratedBy` = `["br_mesadodolar"]`.
- [ ] **Step 2:** `npx vitest run tests/regional/sources_extra.test.ts` → FAIL (módulo inexistente).
- [ ] **Step 3:** implementar el módulo siguiendo `br_awesomeapi.ts` (comentario de cabecera con el porqué, `makeQuote`, `fetchJson`); `fetch` pide los tres endpoints en paralelo (el host queda en fila por `net.ts`) y concatena; registrar en `catalog.ts`.
- [ ] **Step 4:** `npx vitest run tests/regional` → PASS.
- [ ] **Step 5:** commit.

### Task 2: atribución y cuentas

**Files:**
- Modify: `app/pages/llevar-dolares-o-reales-a-brasil.vue` (sección 8, un `<li>` con "Fuente: Mesa do Dólar")
- Modify: `app/pages/cotizaciones-de-la-region.vue` (FAQ "veintiuna" → "veintidós", fallback `|| 21` → `|| 22`)
- Modify: `docs/api/REGIONAL.md` (título 24/22, fila de la tabla, cobertura de Brasil), `AGENTS.md` (fila `currency-regional`: 22 fuentes), comentarios "veintiuna" en `classes/regional/sources_report.ts` y `tests/regional/sources_report.test.ts`.

- [ ] **Step 1:** editar; `cd app && npx vitest run` de los tests que lean esas páginas (grep por el nombre del archivo en `app/tests`) → PASS.
- [ ] **Step 2:** `npx tsc -p tsconfig.production.json --noEmit` en la raíz → sólo el error esperado de `sync_sheet.ts`.
- [ ] **Step 3:** commit, PR no-borrador, vigilar automerge y deploy; medir `/regional/sources` en producción.
