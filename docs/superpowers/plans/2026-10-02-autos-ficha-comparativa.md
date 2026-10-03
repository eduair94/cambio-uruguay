# Ficha de autos: comparativa y modelo explicado — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans (native; orden permanente
> del usuario: spec y plan auto-aprobados). Steps use checkbox (`- [ ]`) syntax.

**Goal:** que la ficha de cada auto diga dónde cae su precio, qué conviene más por la misma plata,
cuánto cuesta tenerlo y qué es el modelo (Wikipedia + videos).

**Architecture:** función pura `buildCarInsight` en `app/utils/carInsight.ts` alimentada por el
endpoint de la ficha (pares, alternativas y snapshots ya existentes); job nuevo
`currency-autos-models` que escribe `carmodelinfos` (Wikipedia REST + Gemini grounded → oEmbed);
tres componentes Vue nuevos.

**Tech Stack:** Nuxt 4 / Vuetify 4, Mongoose, vitest; root TS4.9 CommonJS + axios.

**Spec:** `docs/superpowers/specs/2026-10-02-autos-ficha-comparativa-design.md`

## Global Constraints

- Cohorte mínima para veredicto: 5 pares. Umbrales de veredicto: −15 / −5 / +5 / +15 %.
- Elecciones excluyen: el propio aviso, `risks.length > 0`, `flags.length > 0`, `currencyInferred`.
- Costos con 12.000 km/año (`CAR_ADVISOR_DEFAULT_KM`).
- Videos: ids SÓLO de chunks de grounding resueltos; verificados por oEmbed; máx 4.
- Fuente caída conserva lo anterior; nada de cifras de ingreso en el repo (público).
- Toda pieza nueva del endpoint es opcional (`.catch(() => null)`), nunca esconde el aviso.

## Review Focus

- Aviso sin km (`km: null`): sin "por km" para el aviso, pero las elecciones siguen. Test en Task 1.
- Aviso en UYU convertido: comparar siempre `priceUsd`. Test en Task 1.
- Modelo con 1–4 pares: `position: null`, la página dice que no alcanza. Test en Task 1.
- Aviso vencido (`car === null`): los componentes nuevos no rompen el 404. Cubierto por
  `carsDetailPageStatus.test.ts` (Task 4 lo corre).
- Título de video que nombra otro modelo de la marca ("Gol" para Saveiro): se descarta. Test Task 2.

---

### Task 1: `buildCarInsight` (pura) + costos compartidos

**Files:** Create `app/utils/carInsight.ts`, `app/tests/unit/carInsight.test.ts`; Modify
`app/utils/carAdvisor.ts` (exportar `carOwnershipCosts`, `costsOf` delega).

**Produces:** `buildCarInsight(input: CarInsightInput): CarInsight`, tipos `CarInsight`,
`CarInsightPosition`, `CarInsightPick`, `CarInsightModelOption`, `CarInsightCosts`;
`carOwnershipCosts(args)` en carAdvisor.

- [ ] Tests: veredictos por brecha; percentil; cohorte por versión ≥ 5 si no año, si no año ±1;
  < 5 → null; elecciones excluyen propio/riesgo/flags/moneda deducida; "más barato por km" elige el
  menor precio/esperado; "menos km por esta plata" respeta ≤ 105 %; alternativas agrupan por modelo
  y excluyen el propio modelo; km null; costos suman y usan consumo del aviso.
- [ ] Correr (falla), implementar, correr (pasa), `carAdvisor.test.ts` sigue verde. Commit.

### Task 2: Backend `carmodelinfos` (Wikipedia + YouTube) + job

**Files:** Create `classes/autos/modelInfo/{types,wikipedia,youtube,refresh}.ts`,
`classes/models/CarModelInfo.ts`, `sync_car_models.ts`, `tests/autos/modelInfo.test.ts`; Modify
`ecosystem.config.js`, `scripts/deploy-backend.sh` (OTHER_APPS), `AGENTS.md` (tabla pm2).

**Produces:** documento `{ marketSlug, brand, model, readAt, wiki: CarModelWiki|null,
videos: CarModelVideo[], wikiReadAt, videosReadAt, failures }` en `carmodelinfos`.

- [ ] Tests: `wikiLooksLikeVehicle`, `youtubeIdFromUrl`, `videoTitleMatches` (acepta "Prueba VW
  Saveiro", rechaza "Gol", "Hot Wheels", "vendo"), `rankVideos`, `planModelInfoTargets` (nuevos y
  vencidos primero, presupuesto), `mergeModelInfo` (undefined conserva, null limpia).
- [ ] Implementar, `npx tsc -p tsconfig.production.json --noEmit`, `tests/autos/deploy.test.ts`.
- [ ] Dry-run real en el VPS para 3 modelos antes del deploy (`--dry-run --only=<slugs>`). Commit.

### Task 3: App: endpoint de ficha y de modelo

**Files:** Create `app/server/utils/carInsight.ts` (lecturas), `app/server/models/CarModelInfo.ts`,
`app/utils/carModelInfo.ts` (tipo público + `validCarModelInfo`), `app/tests/unit/carModelInfo.test.ts`;
Modify `app/server/api/cars/ficha/[key].get.ts`, `app/server/api/cars/market/[slug].get.ts`,
`app/utils/cars.ts` (`CarDetailResponse.insight`, `.modelInfo`; `CarMarketResponse.modelInfo`).

- [ ] Test de validación; implementar; `carsApi.test.ts` verde. Commit.

### Task 4: UI

**Files:** Create `app/components/cars/PriceInsight.vue`, `app/components/cars/OwnershipInsight.vue`,
`app/components/cars/ModelInfo.vue`; Modify `app/pages/autos-usados-uruguay/[key].vue`,
`app/pages/autos-usados-uruguay/precios/[slug].vue`.

- [ ] Reemplazar la sección "¿Cómo está el precio?" por `CarsPriceInsight`; agregar
  `CarsOwnershipInsight` y `CarsModelInfo`; `CarsModelInfo` también en la página del modelo.
- [ ] `npm run lint`, tests unitarios de autos, dev server contra datos de prod (Playwright),
  capturas desktop + móvil, modo oscuro. Commit.

### Task 5: Docs, experimento, merge y deploy

- [ ] `docs/app/AUTOS.md` sección nueva; fila en `docs/seo/experiments.json` para
  `/autos-usados-uruguay/precios/` (modelo explicado en páginas indexables).
- [ ] Suite completa de autos (root + app), review final, merge a main, push, mirar CI y medir la
  ficha en producción.
