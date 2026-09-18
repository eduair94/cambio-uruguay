# E1 — Monopatines y bicicletas eléctricas — plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/monopatines-electricos-uruguay` y `/bicicletas-electricas-uruguay`: precios observados (nuevo y usado, por variante), ofertas más baratas con su tienda y la normativa vigente por departamento con su fuente.

**Architecture:** se reutiliza la maquinaria de equipar (`classes/equipar/`: clasificador, regímenes `modelo`/`commodity`, bandas, guardas, foto de tiendas) haciéndola recibir un registro de categorías; un registro propio `classes/movilidad/`; un job `sync_movilidad.ts` que escribe APP DB `movilidaditems`/`movilidadmeta`/`movilidadstoresnapshots` y el historial `pricewatchoffers` (vertical `movilidad`); normativa como dato en el app; dos páginas SSR sólo en español.

**Tech Stack:** TypeScript 4.9 (raíz, vitest), Nuxt 4 + Vuetify 4 (app), MongoDB APP DB.

**Spec:** `docs/superpowers/specs/2026-09-17-movilidad-electrica-design.md`. Lecciones vigentes: `docs/superpowers/plans/2026-09-16-directorios-checklist.md`.

## Global Constraints

- Worktree `C:/Users/airau/Documents/GitHub/cu-dir-e`, rama `feat/directorios-e-movilidad`; el primer comando de cada tarea verifica la rama (si no, BLOCKED).
- Nunca correr un `sync_*` sin `--dry-run`. El `.env` local apunta a la Mongo de producción; `app/.env` a una Mongo local vacía.
- Build de producción: `npx tsc -p tsconfig.production.json --noEmit --pretty false` con exactamente UN error (`sync_sheet.ts`/`sheet_key.json`).
- **Un test de la raíz nunca importa un archivo de `app/`** (rompe el job de backend del CI). Las paridades raíz↔app viven en `app/tests/unit/` (que sí puede importar `../../../classes/...`).
- **Escaneo de secretos:** ninguna línea commiteada puede tener la forma `key: "<valor con dígitos>"` (Gitleaks `generic-api-key` frenó un despliegue el 17/9). Para identificadores públicos usar `id`/`slug`. Antes de cerrar cada tarea: worktree limpio con `git worktree add --detach <dir> HEAD` y `C:/Users/airau/AppData/Local/Temp/claude/c--Users-airau-Documents-GitHub-cambio-uruguay/f15740aa-0a3b-4f4f-ab8a-0827536e1ad8/scratchpad/gitleaks/gitleaks.exe dir . --redact=100 --no-banner --no-color --max-decode-depth=2 --max-archive-depth=2` → "no leaks found"; después `git worktree remove --force <dir>`.
- **Puente de ML** (`:9656`, compartido con producción): cualquier corrida en seco que lo use va con `--fast` (≤ 8 búsquedas), sólo en minutos UTC :00–:18 o :33–:43, nunca entre 07:35 y 10:00 UTC; ante 403/429 se corta y se informa.
- Nada de veredictos ni recomendaciones de marca; normativa sólo con fuente; lo no confirmado se dice como no confirmado.
- Vendedores sin identificar de ML (`ml:unknown` / nombre "Mercado Libre") se muestran como "Vendedor sin identificar (Mercado Libre)", nunca como la tienda Mercado Libre.
- Copy en español de Uruguay ("setiembre", `dateLocale()`), fechas con los helpers del repo, montos es-UY; exports del app con prefijo `movilidad`/`MOVILIDAD_`; componentes Vuetify registrados a mano en `app/plugins/vuetify.ts`.
- Commits en español terminados en `Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>`; no commitear `app/package-lock.json`; sin bytes de control.

---

### Task 1: Catálogo de equipar con registro inyectable

**Files:** Modify `classes/equipar/classify.ts`, `classes/equipar/catalog.ts` (y lo que haga falta en `classes/equipar/types.ts`); Test `tests/equipar/registry_injection.test.ts`

- [ ] Tests primero: `buildEquiparCatalog({ listings, usdUyu })` sin registro devuelve exactamente lo mismo que hoy (usar fixtures existentes de `tests/equipar`); con `{ registry: [unaCategoriaDePrueba] }` clasifica sólo contra ese registro y el `categoryOrder` sale de él; un aviso etiquetado con `CATEGORY_SPEC` de una categoría que no está en el registro inyectado no entra; `specsFor(registry)` (nuevo, genérico) produce los mismos specs que `equiparSpecs()` para el registro de equipar.
- [ ] Implementación mínima: `categoryFor(title, context, registry = EQUIPAR_CATEGORIES)`, `specsFor(registry)` con `equiparSpecs = () => specsFor(EQUIPAR_CATEGORIES)`, `BuildCatalogInput.registry?`. Si `EquiparCategory` exige campos propios de la casa (ambiente, tier, cantidad), definir cómo los completa una categoría de otro dominio sin tocar la canasta de equipar (p. ej. `room` admite `"movilidad"` y la canasta filtra por las categorías de equipar) — y decirlo.
- [ ] `npx vitest run tests/equipar tests/retail tests/chairs` verde (equipar no cambia), tsc, gitleaks. Commit — `refactor(equipar): el catálogo acepta un registro de categorías`.

### Task 2: Registro de movilidad, tiendas y corrida en seco

**Files:** Create `classes/movilidad/registry.ts`, `scripts/oneoff/movilidad_dry_run.ts`; Modify `classes/retail/stores.ts`; Test `tests/movilidad/registry.test.ts`

- [ ] Registro con `monopatin-electrico` (régimen `modelo`) y `bicicleta-electrica` (régimen `commodity`) y sus variantes (spec §2.2); `include`/`exclude` con fixtures reales tomadas de las tiendas y de ML (positivos y negativos: repuestos, baterías, cargadores, cascos, cubiertas, juguetes sin motor, motos eléctricas E-Yumbo, "monopatín" sin motor), `storeQueries`, `mlQueries` (≤ 6 por categoría), `fbQueries`, `urlHint`. `MOVILIDAD_STORE_KEYS` = tiendas nuevas + las registradas que venden monopatines (medir antes de incluir: una tienda sin productos de estas categorías no entra).
- [ ] Tiendas nuevas en `stores.ts` con comentario de lo medido (fecha, plataforma, moneda, cantidad): `delcar` (`https://delcar.com.uy`, WooCommerce, USD), `superbikers` (`https://superbikers.uy`, WooCommerce, USD), `voltbike` (`https://voltbike.uy`, Shopify), `loopbikes` (`https://shop.loop-bikes.com`, Shopify). Sillas y equipar tienen listas explícitas de tiendas: comprobar que no las toman.
- [ ] `scripts/oneoff/movilidad_dry_run.ts` (sin Mongo, patrón de `scripts/oneoff/phones_dry_run.ts`): por tienda/ML imprime aceptados por categoría y variante y los rechazos más frecuentes. Correrlo sobre las cuatro tiendas nuevas y sobre `ml` (con las reglas del puente) y pegar el resultado; si entran accesorios o motos, ajustar reglas y sumar fixtures.
- [ ] Tests + tsc + gitleaks. Commit — `feat(movilidad): registro de monopatines y bicicletas eléctricas y cuatro tiendas`.

### Task 3: Modelos, job e historial

**Files:** Create `classes/models/MovilidadItem.ts`, `classes/models/MovilidadMeta.ts`, `classes/models/MovilidadStoreSnapshot.ts`, `app/server/models/MovilidadItem.ts`, `app/server/models/MovilidadMeta.ts`, `classes/movilidad/store.ts`, `sync_movilidad.ts`; Modify `tests/appdb/schema_parity.test.ts`, `ecosystem.config.js`, `scripts/deploy-backend.sh`; Test `tests/movilidad/store.test.ts`, `tests/movilidad/dry_run.test.ts`

- [ ] Copiar el patrón de `sync_equipar.ts` + `sync_phones.ts` (en la rama de celulares; si no está en `main`, el de equipar alcanza): `--fast`/`--dry-run`; `--dry-run` sin APP DB no conecta; sin `--dry-run` se niega sin APP DB; `harvestRetail({ stores: retailStores(MOVILIDAD_STORE_KEYS), specs: specsFor(MOVILIDAD_CATEGORIES), fast, maxMlScans: fast ? 6 : 16, maxFbQueries: fast ? 2 : 6, maxStoreQueries: fast ? 6 : 16 })`; `applyUnitGuard`; foto de tiendas diaria que la horaria mezcla (36 h); `buildEquiparCatalog({ ..., registry: MOVILIDAD_CATEGORIES })`; corrida flaca (si había ítems y los que tienen banda nueva caen por debajo del 40 %, no escribe y sale 1); guarda; `recordPricewatch(listings, "movilidad")` en su propio try/catch; log por fuente. Un solo `process.exit` al final con la conexión cerrada.
- [ ] Modelos backend + espejo del app (campos a 4 espacios) + paridad; comentario de que las rutas de lista excluyen `history`.
- [ ] pm2: `currency-movilidad` (`dist/sync_movilidad.js`, `cron_restart: "33 15 * * *"`) y `currency-movilidad-hourly` (`args: "--fast"`, `cron_restart: "7 * * * *"`), `autorestart: false`, fork, `log_date_format`; comentario con los horarios de los otros consumidores del puente; ambos en `OTHER_APPS`.
- [ ] Tests (dry-run nunca escribe; la horaria conserva las ofertas de tiendas de la foto; corrida flaca) + `npx vitest run tests/movilidad tests/equipar tests/pricewatch tests/appdb tests/sync` + tsc + gitleaks + corrida en seco `npx ts-node sync_movilidad.ts --fast --dry-run` sin APP DB (reglas del puente) con el log pegado. Commit — `feat(movilidad): modelos, historial y job currency-movilidad`.

### Task 4: Normativa como dato

**Files:** Create `app/utils/movilidadNormativa.ts`; Test `app/tests/unit/movilidadNormativa.test.ts`

- [ ] `MOVILIDAD_NORMATIVA_REVISADA = '2026-09-17'`; una fila por departamento (los 19): `{ departamento, estado: 'vigente' | 'en-estudio' | 'sin-norma-encontrada', norma: string | null, reglas: { edadMinima, velocidadMaxKmh, casco, alta visibilidad/reflectivos, seguro, registro, dondeNo, donde } (cada una `null` si la norma no lo dice), fuentes: [{ titulo, url, fecha }], nota }` con los datos del spec §1 (Montevideo, San José, Durazno, Maldonado, Canelones; el resto `sin-norma-encontrada` sin reglas). Helpers `movilidadNormativaDe(departamento)` y `movilidadResumenNormativa()`.
- [ ] Tests: 19 departamentos exactos (usar la lista de departamentos que ya tenga el app — cuidado con los acentos, ver la memoria del repo sobre departamentos escritos con y sin tilde); ninguna fila `vigente` sin fuente; ninguna regla no nula en una fila `sin-norma-encontrada`; San José sin fecha de vigencia; ningún texto dice "es ilegal"/"está prohibido usar" de forma general.
- [ ] `cd app && npm test` + lint + gitleaks. Commit — `feat(movilidad): normativa por departamento con su fuente`.

### Task 5: API y páginas

**Files:** Create `app/server/api/movilidad/[categoria].get.ts`, `app/utils/movilidad.ts`, `app/pages/monopatines-electricos-uruguay.vue`, `app/pages/bicicletas-electricas-uruguay.vue`; Modify `app/utils/siteNav.ts`, `app/i18n/locales/json/{es,en,pt}.json`, `app/tests/unit/seoContract.test.ts` (si corresponde); Test `app/tests/unit/movilidad.test.ts`, `app/tests/unit/movilidadApi.test.ts`, `app/tests/unit/movilidadPages.test.ts`

- [ ] API por categoría (`monopatin-electrico` | `bicicleta-electrica`; otra → 404): ítems de esa categoría sin `history`, meta (fecha de relevamiento, fuentes y su estado), caché 600 s, forma vacía ante error (`no-store`).
- [ ] Páginas (canonical literal sin prefijo de idioma, un H1, `useSeoMeta`, JSON-LD `BreadcrumbList` + `ItemList` de modelos cuando hay, `FaqSection`, `defineOgImageComponent`): H1 "Precio de monopatines eléctricos en Uruguay" / "Precio de bicicletas eléctricas en Uruguay"; bandas por variante (nuevo y usado, nunca promediadas; "sin datos suficientes" cuando no llega la muestra); modelos con ofertas (monopatines); las ofertas más baratas con tienda (enlace a `/tiendas-online-uruguay/<clave>` sólo si la ficha existe, con `useStoreProfileKeys()`; vendedores sin identificar de ML rotulados); tabla de normativa (Task 4) con fuente y "revisado el"; "cómo elegir" sin marcas; garantía y enlace a `/derechos-consumidor-compras-online`; enlaces cruzados entre las dos páginas, a `/equipar-casa-uruguay` y a `/ciberlunes-y-black-friday-uruguay`; FAQ (precio típico con la cifra de la banda, si se necesita licencia/registro según departamento, dónde se puede circular, si conviene usado).
- [ ] Nav (sección de consumo o la que corresponda, `fresh: true`), i18n `nav.monopatines` y `nav.bicicletasElectricas`, sitemap (páginas estáticas vía `siteNav`), presupuesto de títulos (`seoTitleBudget`).
- [ ] Tests (texto de las páginas, derivaciones, API con modelos mockeados) + `npm test` + lint + dev en este worktree (puerto 3221) con `curl` a las dos páginas (200, H1, tabla de normativa, sin etiquetas Vuetify sin resolver) y `wc -c`; apagar el dev; gitleaks. Commit — `feat(movilidad): páginas de monopatines y bicicletas eléctricas`.

### Task 6: Documentación

- [ ] `docs/app/MOVILIDAD.md` (fuentes y su contrato, categorías y variantes, qué no se publica, normativa y cómo actualizarla con fecha, recordatorio: revisar Maldonado/Canelones/norma nacional y la vigencia de San José antes del 1/11/2026, jobs y horarios, cómo diagnosticar), `AGENTS.md` (filas pm2, entrypoint, carpeta `movilidad`), `docs/app/PRICEWATCH.md` (vertical `movilidad`), `docs/app/EQUIPAR.md` (el registro es inyectable).
- [ ] Raíz `npx vitest run` + tsc; app `npm test` + lint; gitleaks. Commit — `docs(movilidad): monopatines y bicicletas eléctricas`.
