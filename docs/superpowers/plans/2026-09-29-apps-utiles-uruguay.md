# Apps útiles en Uruguay (`/apps-utiles-uruguay`) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publicar un directorio de 118 apps útiles para quien vive en Uruguay —las del Estado que
todos deberían tener y las del día a día— con pestañas por categoría, filtros, un kit de
imprescindibles con casillas, y un job semanal que trae de las fichas de las tiendas el ícono, la nota
y la última versión de cada app.

**Architecture:** El contenido es un registro curado y verificado en `app/utils` (fuente de verdad),
servido por SSR en una sola página; las pestañas son enlaces `?categoria=` que funcionan antes de
hidratar y, ya hidratada, cambian en el cliente con `history.replaceState`. Un job pm2 de la raíz
(`currency-useful-apps`) lee las fichas públicas de Google Play y del App Store (rutas permitidas por
`robots.txt`) y escribe UN documento en la base del app; la página lo lee por
`/api/useful-apps/stores` y se ve entera aunque ese documento no exista.

**Tech Stack:** Nuxt 4 + Vuetify 4.1.5 (app, TS 5.7, vitest 2), Express/ts-node + mongoose (raíz, TS
4.9 CommonJS, vitest 4), pm2 cron.

**Spec:** `docs/superpowers/specs/2026-09-29-apps-utiles-uruguay-design.md`

**Worktree:** todo se hace en `C:/Users/airau/Documents/GitHub/cu-apps-uruguay` (rama
`feat/apps-utiles-uruguay`, con `npm install` propio en la raíz y en `app/`). Nunca en
`C:/Users/airau/Documents/GitHub/cambio-uruguay` (otra sesión tiene archivos sin commitear ahí).

## Global Constraints

- Ruta: `/apps-utiles-uruguay`. Título: `const title = 'Apps del Estado y apps útiles en Uruguay'`
  (40 caracteres; con ` | Cambio Uruguay` = 57 ≤ 60). Descripción literal ≤ 155 caracteres, única,
  que abre con el dato y NO con "Directorio de…".
- Todo lo exportado desde `app/utils` lleva prefijo `usefulApp`/`usefulApps`/`USEFUL_APP(S)`
  (espacio de nombres plano de auto-import; `moneyApps.ts` ya usa `APP_CATEGORIES`, `PLATFORM_META`,
  `appHaystack`, `Platform`, `MoneyApp`).
- Ningún campo ni constante se llama `key`/`*Key`/`*_KEY` con un valor que lleve dígitos (gitleaks
  `generic-api-key` escanea cada commit del push). Los ids de tienda van en campos `id`.
- App: comillas simples, sin punto y coma, `printWidth` 100, `arrowParens: avoid`, `trailingComma:
  es5` (prettier vía `npm run lint`). Raíz: comillas dobles y punto y coma, como `sync_videos.ts`.
- Copy en español de Uruguay con voseo ("Consultá", "Pagá"), sin superlativos ni promesas; meses con
  "setiembre".
- Enlaces a tiendas y webs externas: `target="_blank" rel="noopener noreferrer nofollow"`. Sin
  afiliados.
- La página nunca ramifica el HTML del servidor por UA, cookie ni sesión (caché de borde): la
  plataforma del lector se detecta en `onMounted`.
- Fechas: nunca `toLocaleDateString` con `locale.value`; los meses se escriben con la tabla propia de
  `usefulAppsStores.ts` (determinística en servidor y navegador).
- Ningún `VChip`, `VAlert`, `VCard`, `VRow`, `VCol`, `VTable` dentro de un `<p>` (rompe la
  hidratación).
- Sólo componentes de Vuetify registrados en `app/plugins/vuetify.ts` (`VSlideGroup`, `VItemGroup`,
  `VLazy`, `VHover` NO lo están).
- El job sólo pide `https://play.google.com/store/apps/details?id=…&hl=es_419&gl=UY` y
  `https://apps.apple.com/uy/app/id…`; nunca `itunes.apple.com` (Disallow en su `robots.txt`). UA
  honesta `cambio-uruguay.com apps bot (+https://cambio-uruguay.com)`, 1,5 s entre pedidos.
- Íconos: sólo hosts `play-lh.googleusercontent.com` y `*.mzstatic.com`, en 128 px.
- `docs/seo/experiments.json` recibe su fila en el MISMO commit que publica la página.
- Cero cifras de ingreso en nada versionado.

## Review Focus

1. **Un toque en una pestaña antes de hidratar** (celular lento): tiene que navegar a
   `?categoria=<id>` y el servidor devolver la pestaña ya filtrada — Task 1 prueba
   `usefulAppsStateFromQuery`/`usefulAppsHrefForTab`; Task 9 mide con JS apagado.
2. **Una URL compartida con basura** (`?categoria=xxx&depto=Narnia&q=<60+ chars>`): vuelve al default
   por campo, nunca una lista vacía sin explicación — Task 1, test "lista blanca".
3. **Búsquedas como las escribe la gente** ("app de la luz", "omnibus", "jubilación", "BPS"): las
   palabras vacías no pueden vaciar el resultado y las tildes no importan — Task 1, test de búsqueda
   con stopwords; Task 3 exige `keywords` en cada app.
4. **El job no corrió nunca, o hace dos meses que no corre**: la página se ve entera con monogramas y
   sin notas; una lectura de más de 60 días no se muestra como dato de hoy ni esconde un botón —
   Task 2, tests de `usefulAppsCompactStores` con fechas viejas; Task 9 renderiza con `null`.
5. **Recargar después de marcar "Ya la tengo"**: el kit no puede pisar lo guardado con el estado vacío
   del SSR (los controles de Vuetify emiten al montar) — Task 7, test de `usefulAppsKitSanitize` +
   composable que nunca escribe antes de leer.

---

## Mapa de archivos

**App (`app/`)**

| Archivo | Responsabilidad |
|---|---|
| `utils/usefulApps.ts` | Tipos, categorías, tipos de organización, departamentos, enlaces de tienda, búsqueda, estado ↔ URL, filtro/orden/agrupado, plataforma |
| `utils/usefulAppsStores.ts` | Tipos del snapshot, compactado para la API, íconos seguros, frescura, formato de fecha/nota/cantidad |
| `utils/usefulAppsCatalog.ts` | `USEFUL_APPS` (118 apps verificadas) + `USEFUL_APPS_VERIFIED_AT` — lo genera el orquestador |
| `utils/usefulAppsContent.ts` | Kit, "no es una app", criterios, consejos, FAQ, etiquetas de guías, saneo del kit guardado |
| `server/models/UsefulAppsSnapshot.ts` | Modelo de lectura (espejo del de la raíz) |
| `server/api/useful-apps/stores.get.ts` | `GET /api/useful-apps/stores` compactado, `null` si no hay documento |
| `composables/useUsefulAppsKit.ts` | Casillas del kit en `localStorage` (`cu_apps_kit`) |
| `components/usefulApps/UsefulAppsIcon.vue` | Ícono de tienda con monograma de respaldo |
| `components/usefulApps/UsefulAppsCard.vue` | La tarjeta de una app |
| `components/usefulApps/UsefulAppsCategoryNav.vue` | Pestañas: fila de pastillas (≥ 960 px) / `<details>` (celular) |
| `components/usefulApps/UsefulAppsFilters.vue` | Buscador, Tipo, Plataforma, Departamento, Orden |
| `components/usefulApps/UsefulAppsKit.vue` | El kit con casillas y progreso |
| `pages/apps-utiles-uruguay.vue` | La página: SEO, JSON-LD, secciones, estado ↔ URL |
| `tests/unit/usefulApps*.test.ts` | Unitarios de cada util + paridad con la raíz |

**Raíz**

| Archivo | Responsabilidad |
|---|---|
| `classes/usefulapps/catalog.ts` | `USEFUL_APP_STORE_IDS`: id + paquete + id App Store + desarrolladores esperados |
| `classes/usefulapps/types.ts` | Tipos del snapshot, `USEFUL_APPS_KEY = "uy"` |
| `classes/usefulapps/stores.ts` | Parsers de las dos fichas + lectura con timeout |
| `classes/usefulapps/refresh.ts` | Arma el snapshot con fusión por señal, corte temprano y guardas |
| `classes/usefulapps/store.ts` | Guardar/leer el documento |
| `classes/models/UsefulAppsSnapshot.ts` | Modelo de escritura en la base del app |
| `sync_useful_apps.ts` | Entrypoint del job `currency-useful-apps` |
| `tests/usefulapps/*.test.ts` + `tests/usefulapps/fixtures/*.html` | Parsers, fusión, guardas, catálogo |

**Integración:** `app/utils/siteNav.ts`, `app/i18n/locales/json/{es,en,pt}.json`,
`app/utils/guideHubs.ts`, `app/utils/temaIndex.json`, `app/utils/directorios.ts`,
`app/server/api/directorios.get.ts`, `app/tests/unit/directoriosApi.test.ts`,
`app/utils/relatedPages.ts`, `docs/seo/experiments.json`, `ecosystem.config.js`,
`scripts/deploy-backend.sh`, `.github/workflows/deploy.yml`, `AGENTS.md`, `classes/AGENTS.md`,
`tests/appdb/schema_parity.test.ts`, `docs/app/APPS_UTILES.md`.

---

### Task 1: Lógica pura del directorio (`app/utils/usefulApps.ts`)

**Files:**
- Create: `app/utils/usefulApps.ts`
- Test: `app/tests/unit/usefulApps.test.ts`

**Interfaces:**
- Produces (usado por Tasks 3–9): tipos `UsefulApp`, `UsefulAppCategoryId`, `UsefulAppKind`,
  `UsefulAppDepartment`, `UsefulAppStoreRef`, `UsefulAppsTab`, `UsefulAppsState`,
  `UsefulAppsKindFilter`, `UsefulAppsPlatform`, `UsefulAppsSort`; constantes
  `USEFUL_APP_CATEGORIES`, `USEFUL_APP_KIND_LABELS`, `USEFUL_APP_DEPARTMENTS`,
  `USEFUL_APPS_KIND_FILTERS`, `USEFUL_APPS_SORTS`, `USEFUL_APPS_DEFAULT_STATE`,
  `USEFUL_APPS_MAX_QUERY`; funciones `usefulAppIsPublic`, `usefulAppKindMatches`,
  `usefulAppPlayUrl`, `usefulAppAppStoreUrl`, `usefulAppNormalize`, `usefulAppMatches`,
  `usefulAppInitials`, `usefulAppsStateFromQuery`, `usefulAppsQueryFromState`,
  `usefulAppsActiveFilterCount`, `usefulAppsHrefForTab`, `usefulAppInTab`, `usefulAppsFilter`,
  `usefulAppsSort`, `usefulAppsGroup`, `usefulAppsTabCounts`, `usefulAppsDepartmentsIn`,
  `usefulAppsDetectPlatform`, `usefulAppsCountLabel`.

- [ ] **Step 1: Write the failing test** — `app/tests/unit/usefulApps.test.ts`

```ts
import { describe, expect, it } from 'vitest'
import {
  USEFUL_APP_CATEGORIES,
  USEFUL_APP_KIND_LABELS,
  USEFUL_APPS_DEFAULT_STATE,
  type UsefulApp,
  usefulAppAppStoreUrl,
  usefulAppInitials,
  usefulAppKindMatches,
  usefulAppMatches,
  usefulAppPlayUrl,
  usefulAppsActiveFilterCount,
  usefulAppsCountLabel,
  usefulAppsDepartmentsIn,
  usefulAppsDetectPlatform,
  usefulAppsFilter,
  usefulAppsGroup,
  usefulAppsHrefForTab,
  usefulAppsQueryFromState,
  usefulAppsSort,
  usefulAppsStateFromQuery,
  usefulAppsTabCounts,
} from '../../utils/usefulApps'

const app = (over: Partial<UsefulApp>): UsefulApp => ({
  id: 'x',
  name: 'X',
  organization: 'Org',
  kind: 'estado',
  category: 'tramites',
  summary: 'Resumen de prueba.',
  uses: ['Consultá algo'],
  source: 'https://www.gub.uy/',
  ...over,
})

const UTE = app({
  id: 'ute',
  name: 'UTE Clientes',
  organization: 'UTE',
  kind: 'empresa-publica',
  category: 'hogar',
  summary: 'Pagá la luz y avisá si te quedaste sin luz.',
  uses: ['Mirá tu consumo'],
  keywords: ['luz', 'electricidad'],
  android: { id: 'uy.com.ute.customers', developer: 'UTE Sistemas' },
  ios: { id: '6472210207', developer: 'UTE' },
})
const COMO_IR = app({
  id: 'como-ir',
  name: 'Cómo ir',
  organization: 'Intendencia de Montevideo',
  kind: 'intendencia',
  category: 'transporte',
  summary: 'Planificá tu viaje en ómnibus.',
  keywords: ['omnibus', 'bondi', 'stm'],
  departments: ['Montevideo'],
  android: { id: 'uy.gub.imm.stm.mobile.comoir', developer: 'Intendencia de Montevideo' },
})
const STM = app({
  id: 'stm-montevideo',
  name: 'STM Montevideo',
  organization: 'Desarrollador independiente',
  kind: 'comunidad',
  category: 'transporte',
  departments: ['Montevideo'],
  officialAlternative: 'como-ir',
  ios: { id: '938009980', developer: 'Gabriel Yordi' },
})
const PEDIDOS = app({
  id: 'pedidosya',
  name: 'PedidosYa',
  organization: 'PedidosYa',
  kind: 'privada',
  category: 'compras',
  also: ['ocio'],
  android: { id: 'com.pedidosya', developer: 'PedidosYa S.A' },
})
const ALL = [UTE, COMO_IR, STM, PEDIDOS]
const ctx = { essentialIds: ['como-ir', 'ute'] }

describe('usefulApps — categorías y tipos', () => {
  it('declara diez categorías con ícono mdi y sin repetir id', () => {
    expect(USEFUL_APP_CATEGORIES).toHaveLength(10)
    expect(new Set(USEFUL_APP_CATEGORIES.map(c => c.id)).size).toBe(10)
    for (const c of USEFUL_APP_CATEGORIES) {
      expect(c.icon).toMatch(/^mdi-/)
      expect(c.label.length).toBeGreaterThan(3)
      expect(c.blurb.endsWith('.')).toBe(true)
    }
  })

  it('agrupa los tipos como los distingue la gente', () => {
    expect(USEFUL_APP_KIND_LABELS.comunidad).toBe('No oficial')
    expect(usefulAppKindMatches(UTE, 'publicas')).toBe(true)
    expect(usefulAppKindMatches(COMO_IR, 'publicas')).toBe(true)
    expect(usefulAppKindMatches(PEDIDOS, 'publicas')).toBe(false)
    expect(usefulAppKindMatches(PEDIDOS, 'privadas')).toBe(true)
    expect(usefulAppKindMatches(STM, 'privadas')).toBe(false)
    expect(usefulAppKindMatches(STM, 'no-oficiales')).toBe(true)
    expect(usefulAppKindMatches(STM, 'todas')).toBe(true)
  })

  it('arma los enlaces a las fichas oficiales', () => {
    expect(usefulAppPlayUrl('uy.com.ute.customers')).toBe(
      'https://play.google.com/store/apps/details?id=uy.com.ute.customers'
    )
    expect(usefulAppAppStoreUrl('6472210207')).toBe('https://apps.apple.com/uy/app/id6472210207')
  })

  it('saca las iniciales para el monograma', () => {
    expect(usefulAppInitials('Cómo ir')).toBe('CI')
    expect(usefulAppInitials('gub.uy')).toBe('GU')
    expect(usefulAppInitials('Prex')).toBe('PR')
  })
})

describe('usefulApps — búsqueda', () => {
  it('ignora tildes, mayúsculas y el orden de las palabras', () => {
    expect(usefulAppMatches(COMO_IR, 'OMNIBUS')).toBe(true)
    expect(usefulAppMatches(COMO_IR, 'ómnibus montevideo')).toBe(true)
    expect(usefulAppMatches(COMO_IR, 'montevideo omnibus')).toBe(true)
  })

  it('no deja que las palabras vacías vacíen el resultado', () => {
    expect(usefulAppMatches(UTE, 'app de la luz')).toBe(true)
    expect(usefulAppMatches(UTE, 'aplicación para la luz en Uruguay')).toBe(true)
  })

  it('busca también en el desarrollador y la organización', () => {
    expect(usefulAppMatches(UTE, 'ute sistemas')).toBe(true)
    expect(usefulAppMatches(STM, 'yordi')).toBe(true)
  })

  it('una búsqueda vacía o de sólo palabras vacías deja pasar todo', () => {
    expect(usefulAppMatches(UTE, '')).toBe(true)
    expect(usefulAppMatches(UTE, '  la de  ')).toBe(true)
  })

  it('exige cada palabra con contenido', () => {
    expect(usefulAppMatches(UTE, 'luz agua')).toBe(false)
  })
})

describe('usefulApps — estado ↔ URL', () => {
  it('lee la URL con lista blanca, campo por campo', () => {
    const state = usefulAppsStateFromQuery({
      categoria: 'xxx',
      tipo: 'publicas',
      plataforma: 'blackberry',
      depto: 'Narnia',
      orden: 'az',
      q: 'a'.repeat(80),
    })
    expect(state.tab).toBe('todas')
    expect(state.tipo).toBe('publicas')
    expect(state.plataforma).toBe('todas')
    expect(state.depto).toBe('')
    expect(state.orden).toBe('az')
    expect(state.q).toHaveLength(60)
  })

  it('acepta arreglos (query repetida) tomando el primero', () => {
    expect(usefulAppsStateFromQuery({ categoria: ['salud', 'dinero'] }).tab).toBe('salud')
  })

  it('acepta un departamento con tilde', () => {
    expect(usefulAppsStateFromQuery({ depto: 'Paysandú' }).depto).toBe('Paysandú')
  })

  it('escribe sólo lo que difiere del default, así la URL limpia es la canónica', () => {
    expect(usefulAppsQueryFromState(USEFUL_APPS_DEFAULT_STATE)).toEqual({})
    expect(
      usefulAppsQueryFromState({ ...USEFUL_APPS_DEFAULT_STATE, tab: 'salud', q: '  asse ' })
    ).toEqual({ categoria: 'salud', q: 'asse' })
  })

  it('ida y vuelta sin pérdida', () => {
    const state = {
      tab: 'transporte',
      q: 'omnibus',
      tipo: 'publicas',
      plataforma: 'ios',
      depto: 'Montevideo',
      orden: 'recientes',
    } as const
    expect(usefulAppsStateFromQuery(usefulAppsQueryFromState(state))).toEqual(state)
  })

  it('cuenta los filtros activos sin contar la pestaña', () => {
    expect(usefulAppsActiveFilterCount({ ...USEFUL_APPS_DEFAULT_STATE, tab: 'salud' })).toBe(0)
    expect(
      usefulAppsActiveFilterCount({ ...USEFUL_APPS_DEFAULT_STATE, q: 'x', depto: 'Salto' })
    ).toBe(2)
  })

  it('arma el enlace de cada pestaña sobre la ruta base', () => {
    const base = '/apps-utiles-uruguay'
    expect(usefulAppsHrefForTab(base, USEFUL_APPS_DEFAULT_STATE, 'todas')).toBe(base)
    expect(usefulAppsHrefForTab(base, USEFUL_APPS_DEFAULT_STATE, 'salud')).toBe(
      `${base}?categoria=salud`
    )
  })
})

describe('usefulApps — filtro, orden y grupos', () => {
  it('la pestaña de categoría incluye las que la declaran en `also`', () => {
    const state = { ...USEFUL_APPS_DEFAULT_STATE, tab: 'ocio' as const }
    expect(usefulAppsFilter(ALL, state, ctx).map(a => a.id)).toEqual(['pedidosya'])
  })

  it('Imprescindibles sigue el orden del kit, no el del catálogo', () => {
    const state = { ...USEFUL_APPS_DEFAULT_STATE, tab: 'imprescindibles' as const }
    expect(usefulAppsFilter(ALL, state, ctx).map(a => a.id)).toEqual(['como-ir', 'ute'])
  })

  it('el departamento deja las nacionales y las de ese departamento', () => {
    const state = { ...USEFUL_APPS_DEFAULT_STATE, depto: 'Salto' as const }
    expect(usefulAppsFilter(ALL, state, ctx).map(a => a.id)).toEqual(['ute', 'pedidosya'])
  })

  it('la plataforma exige la ficha de esa tienda', () => {
    const state = { ...USEFUL_APPS_DEFAULT_STATE, plataforma: 'ios' as const }
    expect(usefulAppsFilter(ALL, state, ctx).map(a => a.id)).toEqual(['ute', 'stm-montevideo'])
  })

  it('ordena A–Z sin tildes y por actualización con las desconocidas al final', () => {
    expect(usefulAppsSort(ALL, 'az').map(a => a.id)).toEqual([
      'como-ir',
      'pedidosya',
      'stm-montevideo',
      'ute',
    ])
    const updated: Record<string, string> = { ute: '2026-06-04', 'como-ir': '2025-03-26' }
    expect(usefulAppsSort(ALL, 'recientes', a => updated[a.id] ?? null).map(a => a.id)).toEqual([
      'ute',
      'como-ir',
      'stm-montevideo',
      'pedidosya',
    ])
    expect(usefulAppsSort(ALL, 'utiles').map(a => a.id)).toEqual(ALL.map(a => a.id))
  })

  it('agrupa por categoría principal en el orden de las pestañas, sin repetir', () => {
    const groups = usefulAppsGroup(ALL)
    expect(groups.map(g => g.category.id)).toEqual(['transporte', 'hogar', 'compras'])
    expect(groups.reduce((n, g) => n + g.apps.length, 0)).toBe(ALL.length)
  })

  it('cuenta cada pestaña', () => {
    const counts = usefulAppsTabCounts(ALL, ctx)
    expect(counts.todas).toBe(4)
    expect(counts.imprescindibles).toBe(2)
    expect(counts.transporte).toBe(2)
    expect(counts.ocio).toBe(1)
    expect(counts.salud).toBe(0)
  })

  it('lista los departamentos presentes en el orden del país', () => {
    expect(usefulAppsDepartmentsIn(ALL)).toEqual(['Montevideo'])
  })
})

describe('usefulApps — plataforma y textos', () => {
  it('detecta Android, iPhone y iPad con escritorio', () => {
    expect(usefulAppsDetectPlatform('Mozilla/5.0 (Linux; Android 14; SM-A146M)')).toBe('android')
    expect(usefulAppsDetectPlatform('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)')).toBe(
      'ios'
    )
    expect(usefulAppsDetectPlatform('Mozilla/5.0 (Macintosh; Intel Mac OS X)', 'MacIntel', 5)).toBe(
      'ios'
    )
    expect(usefulAppsDetectPlatform('Mozilla/5.0 (Windows NT 10.0; Win64; x64)')).toBeNull()
  })

  it('pluraliza la cantidad', () => {
    expect(usefulAppsCountLabel(1)).toBe('1 app')
    expect(usefulAppsCountLabel(0)).toBe('0 apps')
    expect(usefulAppsCountLabel(118)).toBe('118 apps')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run (desde `app/`): `npx vitest run tests/unit/usefulApps.test.ts`
Expected: FAIL — `Failed to load url ../../utils/usefulApps`.

- [ ] **Step 3: Write the implementation** — `app/utils/usefulApps.ts`

```ts
// app/utils/usefulApps.ts
// El directorio /apps-utiles-uruguay: tipos, categorías y la lógica pura de pestañas, filtros,
// búsqueda y URL. MÓDULO PURO (sin Vue ni Nuxt): lo usan la página, sus componentes y los tests.
//
// utils/ es un espacio de nombres plano (auto-import de Nuxt) y moneyApps.ts ya exporta
// APP_CATEGORIES, PLATFORM_META, appHaystack…: todo lo de acá lleva el prefijo usefulApp(s).

export type UsefulAppCategoryId =
  | 'tramites'
  | 'salud'
  | 'transporte'
  | 'dinero'
  | 'hogar'
  | 'emergencias'
  | 'ciudad'
  | 'educacion'
  | 'compras'
  | 'ocio'

/** Quién está detrás. La tarjeta muestra la etiqueta exacta; el filtro "Tipo" los agrupa. */
export type UsefulAppKind =
  | 'estado'
  | 'intendencia'
  | 'empresa-publica'
  | 'organismo-publico'
  | 'privada'
  | 'comunidad'

/** Los diecinueve departamentos, en orden alfabético (el orden del selector). */
export const USEFUL_APP_DEPARTMENTS = [
  'Artigas',
  'Canelones',
  'Cerro Largo',
  'Colonia',
  'Durazno',
  'Flores',
  'Florida',
  'Lavalleja',
  'Maldonado',
  'Montevideo',
  'Paysandú',
  'Río Negro',
  'Rivera',
  'Rocha',
  'Salto',
  'San José',
  'Soriano',
  'Tacuarembó',
  'Treinta y Tres',
] as const

export type UsefulAppDepartment = (typeof USEFUL_APP_DEPARTMENTS)[number]

export interface UsefulAppStoreRef {
  /** Paquete de Google Play (`uy.gub.bps.movil.persona`) o id numérico del App Store. */
  id: string
  /** El desarrollador tal cual lo muestra esa tienda: lo que el lector compara antes de instalar. */
  developer: string
}

export interface UsefulApp {
  /** kebab-case, único; también es el ancla `#id` de la tarjeta. */
  id: string
  /** Como figura en la tienda, sin los agregados de posicionamiento ("PedidosYa", no "PedidosYa - Delivery Online"). */
  name: string
  /** Quién está detrás, para humanos: "Banco de Previsión Social (BPS)". */
  organization: string
  kind: UsefulAppKind
  category: UsefulAppCategoryId
  /** Aparece también en estas pestañas (no en el agrupado de "Todas"). */
  also?: readonly UsefulAppCategoryId[]
  /** Para qué sirve: una oración de ≤ 110 caracteres. */
  summary: string
  /** 2–4 cosas concretas, cada una verificada en la ficha de la tienda o en la página oficial. */
  uses: readonly string[]
  needs?: readonly string[]
  /** Departamentos donde sirve. Ausente = todo el país. */
  departments?: readonly UsefulAppDepartment[]
  android?: UsefulAppStoreRef
  ios?: UsefulAppStoreRef
  /** Versión web oficial, si existe. */
  web?: string
  /** Página del organismo (o prensa seria) que respalda la app y lo que hace. */
  source: string
  /** Advertencia de hecho: no oficial, sólo Android, reemplazó a otra… */
  note?: string
  /** Para las no oficiales: el id de la oficial. */
  officialAlternative?: string
  /** Sinónimos del buscador ("omnibus", "luz", "jubilacion"). */
  keywords?: readonly string[]
  /** 0–2 rutas propias que ayudan a usarla (etiquetas en usefulAppsContent.ts). */
  guides?: readonly string[]
}

export interface UsefulAppCategory {
  id: UsefulAppCategoryId
  label: string
  icon: string
  /** Una línea: qué hay en la pestaña. */
  blurb: string
}

export const USEFUL_APP_CATEGORIES: readonly UsefulAppCategory[] = Object.freeze([
  {
    id: 'tramites',
    label: 'Trámites e identidad',
    icon: 'mdi-card-account-details-outline',
    blurb: 'Tu usuario del Estado, la identidad digital, el BPS y la DGI.',
  },
  {
    id: 'salud',
    label: 'Salud',
    icon: 'mdi-medical-bag',
    blurb: 'ASSE, las mutualistas, las emergencias móviles y las farmacias.',
  },
  {
    id: 'transporte',
    label: 'Transporte y auto',
    icon: 'mdi-bus',
    blurb: 'El ómnibus, los pasajes, los peajes, la patente, el estacionamiento y los taxis.',
  },
  {
    id: 'dinero',
    label: 'Bancos, tarjetas y pagos',
    icon: 'mdi-credit-card-outline',
    blurb: 'Los bancos, las tarjetas, las billeteras y dónde pagar las cuentas.',
  },
  {
    id: 'hogar',
    label: 'Luz, teléfono y servicios',
    icon: 'mdi-home-lightning-bolt-outline',
    blurb: 'La luz, el celular, internet, el cable y el supergás.',
  },
  {
    id: 'emergencias',
    label: 'Emergencias y clima',
    icon: 'mdi-alarm-light-outline',
    blurb: 'El 9-1-1, los desfibriladores y el pronóstico oficial.',
  },
  {
    id: 'ciudad',
    label: 'Tu intendencia',
    icon: 'mdi-city-variant-outline',
    blurb: 'Reclamos, playas y turismo de cada departamento.',
  },
  {
    id: 'educacion',
    label: 'Educación y trabajo',
    icon: 'mdi-school-outline',
    blurb: 'La escuela, el liceo, la facultad, Ceibal y la búsqueda de empleo.',
  },
  {
    id: 'compras',
    label: 'Compras y delivery',
    icon: 'mdi-cart-outline',
    blurb: 'Delivery, supermercados, compras en el exterior y precios.',
  },
  {
    id: 'ocio',
    label: 'Cultura y entretenimiento',
    icon: 'mdi-ticket-outline',
    blurb: 'Entradas, fútbol, cine y la televisión pública.',
  },
])

export const USEFUL_APP_KIND_LABELS: Readonly<Record<UsefulAppKind, string>> = Object.freeze({
  estado: 'Estado',
  intendencia: 'Intendencia',
  'empresa-publica': 'Empresa pública',
  'organismo-publico': 'Organismo público',
  privada: 'Empresa privada',
  comunidad: 'No oficial',
})

const PUBLIC_KINDS: ReadonlySet<UsefulAppKind> = new Set<UsefulAppKind>([
  'estado',
  'intendencia',
  'empresa-publica',
  'organismo-publico',
])

export function usefulAppIsPublic(app: Pick<UsefulApp, 'kind'>): boolean {
  return PUBLIC_KINDS.has(app.kind)
}

export type UsefulAppsKindFilter = 'todas' | 'publicas' | 'privadas' | 'no-oficiales'

export const USEFUL_APPS_KIND_FILTERS: readonly { id: UsefulAppsKindFilter; label: string }[] =
  Object.freeze([
    { id: 'todas', label: 'Todas' },
    { id: 'publicas', label: 'Del Estado' },
    { id: 'privadas', label: 'Privadas' },
    { id: 'no-oficiales', label: 'No oficiales' },
  ])

export function usefulAppKindMatches(
  app: Pick<UsefulApp, 'kind'>,
  filter: UsefulAppsKindFilter
): boolean {
  if (filter === 'todas') return true
  if (filter === 'publicas') return usefulAppIsPublic(app)
  if (filter === 'privadas') return app.kind === 'privada'
  return app.kind === 'comunidad'
}

export function usefulAppPlayUrl(pkg: string): string {
  return `https://play.google.com/store/apps/details?id=${encodeURIComponent(pkg)}`
}

export function usefulAppAppStoreUrl(id: string): string {
  return `https://apps.apple.com/uy/app/id${encodeURIComponent(id)}`
}

/** Sin tildes, en minúsculas y con los espacios colapsados: "Cómo IR" = "como ir". */
export function usefulAppNormalize(text: unknown): string {
  return String(text ?? '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

// Palabras que la gente escribe y no dicen nada de la app ("la app de la luz"). Sin esto, una
// búsqueda natural exigiría "app" en cada tarjeta y no devolvería nada.
const STOPWORDS: ReadonlySet<string> = new Set([
  'a',
  'al',
  'app',
  'apps',
  'aplicacion',
  'aplicaciones',
  'con',
  'de',
  'del',
  'el',
  'en',
  'la',
  'las',
  'lo',
  'los',
  'mi',
  'o',
  'para',
  'por',
  'que',
  'un',
  'una',
  'uruguay',
  'y',
])

const CATEGORY_LABEL: Readonly<Record<string, string>> = Object.fromEntries(
  USEFUL_APP_CATEGORIES.map(category => [category.id, category.label])
)

const haystacks = new WeakMap<UsefulApp, string>()

function usefulAppHaystack(app: UsefulApp): string {
  const cached = haystacks.get(app)
  if (cached !== undefined) return cached
  const text = usefulAppNormalize(
    [
      app.name,
      app.organization,
      app.summary,
      ...app.uses,
      ...(app.keywords ?? []),
      CATEGORY_LABEL[app.category],
      USEFUL_APP_KIND_LABELS[app.kind],
      app.android?.developer,
      app.ios?.developer,
      ...(app.departments ?? []),
    ]
      .filter(Boolean)
      .join(' ')
  )
  haystacks.set(app, text)
  return text
}

/** Cada palabra con contenido tiene que aparecer, en cualquier orden. */
export function usefulAppMatches(app: UsefulApp, query: string): boolean {
  const tokens = usefulAppNormalize(query)
    .split(' ')
    .filter(token => token && !STOPWORDS.has(token))
  if (!tokens.length) return true
  const hay = usefulAppHaystack(app)
  return tokens.every(token => hay.includes(token))
}

/** Dos letras para el monograma cuando no hay ícono: "Cómo ir" → "CI", "Prex" → "PR". */
export function usefulAppInitials(name: string): string {
  const words = name
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .split(/[\s.\-:+/]+/)
    .filter(Boolean)
  const letters =
    words.length >= 2 ? `${words[0]!.charAt(0)}${words[1]!.charAt(0)}` : name.slice(0, 2)
  return letters.toUpperCase()
}

// ---------------------------------------------------------------------------
// Estado ↔ URL
// ---------------------------------------------------------------------------

export type UsefulAppsTab = 'todas' | 'imprescindibles' | UsefulAppCategoryId
export type UsefulAppsPlatform = 'android' | 'ios'
export type UsefulAppsSort = 'utiles' | 'az' | 'recientes'

export interface UsefulAppsState {
  tab: UsefulAppsTab
  q: string
  tipo: UsefulAppsKindFilter
  plataforma: UsefulAppsPlatform | 'todas'
  depto: UsefulAppDepartment | ''
  orden: UsefulAppsSort
}

export const USEFUL_APPS_DEFAULT_STATE: Readonly<UsefulAppsState> = Object.freeze({
  tab: 'todas',
  q: '',
  tipo: 'todas',
  plataforma: 'todas',
  depto: '',
  orden: 'utiles',
})

export const USEFUL_APPS_SORTS: readonly { id: UsefulAppsSort; label: string }[] = Object.freeze([
  { id: 'utiles', label: 'Más útiles primero' },
  { id: 'az', label: 'Nombre (A–Z)' },
  { id: 'recientes', label: 'Actualizadas hace poco' },
])

export const USEFUL_APPS_MAX_QUERY = 60

const TABS: readonly string[] = [
  'todas',
  'imprescindibles',
  ...USEFUL_APP_CATEGORIES.map(category => category.id),
]

const firstString = (value: unknown): string => {
  const raw = Array.isArray(value) ? value[0] : value
  return typeof raw === 'string' ? raw : ''
}

/**
 * Lee la URL con lista blanca, campo por campo: un valor que no se reconoce vuelve a su default en
 * lugar de producir una lista vacía que nadie sabe por qué está vacía. Corre también en el
 * servidor, así un enlace compartido llega ya filtrado.
 */
export function usefulAppsStateFromQuery(query: Record<string, unknown>): UsefulAppsState {
  const tab = firstString(query.categoria)
  const tipo = firstString(query.tipo)
  const plataforma = firstString(query.plataforma)
  const depto = firstString(query.depto)
  const orden = firstString(query.orden)
  return {
    tab: TABS.includes(tab) ? (tab as UsefulAppsTab) : 'todas',
    q: firstString(query.q).slice(0, USEFUL_APPS_MAX_QUERY),
    tipo: USEFUL_APPS_KIND_FILTERS.some(f => f.id === tipo) ? (tipo as UsefulAppsKindFilter) : 'todas',
    plataforma: plataforma === 'android' || plataforma === 'ios' ? plataforma : 'todas',
    depto: (USEFUL_APP_DEPARTMENTS as readonly string[]).includes(depto)
      ? (depto as UsefulAppDepartment)
      : '',
    orden: USEFUL_APPS_SORTS.some(s => s.id === orden) ? (orden as UsefulAppsSort) : 'utiles',
  }
}

/** Sólo lo que difiere del default, así la URL limpia sigue siendo la canónica. */
export function usefulAppsQueryFromState(state: UsefulAppsState): Record<string, string> {
  const out: Record<string, string> = {}
  if (state.tab !== 'todas') out.categoria = state.tab
  const q = state.q.trim()
  if (q) out.q = q.slice(0, USEFUL_APPS_MAX_QUERY)
  if (state.tipo !== 'todas') out.tipo = state.tipo
  if (state.plataforma !== 'todas') out.plataforma = state.plataforma
  if (state.depto) out.depto = state.depto
  if (state.orden !== 'utiles') out.orden = state.orden
  return out
}

/** Filtros activos sin contar la pestaña (la pestaña se ve siempre). */
export function usefulAppsActiveFilterCount(state: UsefulAppsState): number {
  return Object.keys(usefulAppsQueryFromState(state)).filter(name => name !== 'categoria').length
}

/** El `href` de una pestaña: funciona antes de hidratar y el servidor lo lee con la misma lista blanca. */
export function usefulAppsHrefForTab(
  basePath: string,
  state: UsefulAppsState,
  tab: UsefulAppsTab
): string {
  const params = new URLSearchParams(usefulAppsQueryFromState({ ...state, tab })).toString()
  return params ? `${basePath}?${params}` : basePath
}

// ---------------------------------------------------------------------------
// Filtro, orden y grupos
// ---------------------------------------------------------------------------

export interface UsefulAppsFilterContext {
  /** Ids del kit, en su orden: es la pestaña "Imprescindibles". */
  essentialIds: readonly string[]
}

export function usefulAppInTab(
  app: UsefulApp,
  tab: UsefulAppsTab,
  ctx: UsefulAppsFilterContext
): boolean {
  if (tab === 'todas') return true
  if (tab === 'imprescindibles') return ctx.essentialIds.includes(app.id)
  return app.category === tab || (app.also ?? []).includes(tab)
}

export function usefulAppsFilter(
  apps: readonly UsefulApp[],
  state: UsefulAppsState,
  ctx: UsefulAppsFilterContext
): UsefulApp[] {
  const list = apps.filter(
    app =>
      usefulAppInTab(app, state.tab, ctx) &&
      usefulAppKindMatches(app, state.tipo) &&
      (state.plataforma === 'todas' ||
        (state.plataforma === 'android' ? Boolean(app.android) : Boolean(app.ios))) &&
      (!state.depto || !app.departments?.length || app.departments.includes(state.depto)) &&
      usefulAppMatches(app, state.q)
  )
  if (state.tab === 'imprescindibles') {
    list.sort((a, b) => ctx.essentialIds.indexOf(a.id) - ctx.essentialIds.indexOf(b.id))
  }
  return list
}

const compareText = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0)

/**
 * "utiles" respeta el orden del catálogo (curado: lo más útil primero dentro de cada categoría).
 * Las comparaciones son de texto plano sobre nombres normalizados, sin `localeCompare`, para que el
 * servidor y el navegador ordenen igual.
 */
export function usefulAppsSort(
  apps: readonly UsefulApp[],
  orden: UsefulAppsSort,
  updatedOf: (app: UsefulApp) => string | null = () => null
): UsefulApp[] {
  const list = [...apps]
  if (orden === 'az') {
    return list.sort((a, b) => compareText(usefulAppNormalize(a.name), usefulAppNormalize(b.name)))
  }
  if (orden === 'recientes') {
    return list.sort((a, b) => compareText(updatedOf(b) ?? '', updatedOf(a) ?? ''))
  }
  return list
}

export function usefulAppsGroup(
  apps: readonly UsefulApp[]
): { category: UsefulAppCategory; apps: UsefulApp[] }[] {
  return USEFUL_APP_CATEGORIES.map(category => ({
    category,
    apps: apps.filter(app => app.category === category.id),
  })).filter(group => group.apps.length > 0)
}

export function usefulAppsTabCounts(
  apps: readonly UsefulApp[],
  ctx: UsefulAppsFilterContext
): Record<UsefulAppsTab, number> {
  const counts = {} as Record<UsefulAppsTab, number>
  for (const tab of TABS as UsefulAppsTab[]) {
    counts[tab] = apps.filter(app => usefulAppInTab(app, tab, ctx)).length
  }
  return counts
}

export function usefulAppsDepartmentsIn(apps: readonly UsefulApp[]): UsefulAppDepartment[] {
  const present = new Set(apps.flatMap(app => app.departments ?? []))
  return USEFUL_APP_DEPARTMENTS.filter(department => present.has(department))
}

/** Sólo en el cliente (onMounted): el HTML del servidor es el mismo para todos. */
export function usefulAppsDetectPlatform(
  userAgent: string,
  platform = '',
  maxTouchPoints = 0
): UsefulAppsPlatform | null {
  if (/android/i.test(userAgent)) return 'android'
  if (/iPad|iPhone|iPod/.test(userAgent) || (platform === 'MacIntel' && maxTouchPoints > 1)) {
    return 'ios'
  }
  return null
}

export function usefulAppsCountLabel(count: number): string {
  return count === 1 ? '1 app' : `${count} apps`
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/usefulApps.test.ts`
Expected: PASS (todos). Luego `npx eslint utils/usefulApps.ts tests/unit/usefulApps.test.ts` →
sin errores.

- [ ] **Step 5: Commit**

```bash
git add app/utils/usefulApps.ts app/tests/unit/usefulApps.test.ts
git commit -m "feat(apps-utiles): lógica pura de pestañas, filtros, búsqueda y URL"
```

---

### Task 2: Lectura de las tiendas en el app (`app/utils/usefulAppsStores.ts`)

**Files:**
- Create: `app/utils/usefulAppsStores.ts`
- Test: `app/tests/unit/usefulAppsStores.test.ts`

**Interfaces:**
- Produces: tipos `UsefulAppsStoreStatus`, `UsefulAppsStoreSignal`, `UsefulAppsSnapshotDoc`,
  `UsefulAppsStoreFacts`, `UsefulAppsAppFacts`, `UsefulAppsStoresPayload`; constantes
  `USEFUL_APPS_SIGNAL_MAX_AGE_DAYS = 60`, `USEFUL_APPS_STALE_MONTHS = 24`; funciones
  `usefulAppsSafeIcon(url)`, `usefulAppsIsoDay(value)`, `usefulAppsCompactStores(doc, today)`,
  `usefulAppsLatestUpdate(facts)`, `usefulAppsIconFor(facts)`, `usefulAppsMonthsBetween(from, to)`,
  `usefulAppsIsStale(updated, today)`, `usefulAppsMonthYear(day)`, `usefulAppsLongDate(day)`,
  `usefulAppsRating(value)`, `usefulAppsCount(value)`.
- Consumido por: Task 5 (ruta), Task 6 (tarjeta), Task 9 (página).

- [ ] **Step 1: Write the failing test** — `app/tests/unit/usefulAppsStores.test.ts`

```ts
import { describe, expect, it } from 'vitest'
import {
  type UsefulAppsSnapshotDoc,
  usefulAppsCompactStores,
  usefulAppsCount,
  usefulAppsIconFor,
  usefulAppsIsStale,
  usefulAppsLatestUpdate,
  usefulAppsLongDate,
  usefulAppsMonthYear,
  usefulAppsMonthsBetween,
  usefulAppsRating,
  usefulAppsSafeIcon,
} from '../../utils/usefulAppsStores'

const PLAY_ICON = 'https://play-lh.googleusercontent.com/HFIx72EXeTEvTtm2MBN9mA=s128'
const IOS_ICON =
  'https://is1-ssl.mzstatic.com/image/thumb/Purple221/v4/e6/b9/2a/AppIcon.png/128x128bb.png'

const doc = (apps: UsefulAppsSnapshotDoc['apps']): UsefulAppsSnapshotDoc => ({
  key: 'uy',
  capturedAt: '2026-10-01T01:40:00.000Z',
  apps,
})

describe('usefulAppsStores — íconos', () => {
  it('acepta sólo https de las dos CDN de las tiendas', () => {
    expect(usefulAppsSafeIcon(PLAY_ICON)).toBe(PLAY_ICON)
    expect(usefulAppsSafeIcon(IOS_ICON)).toBe(IOS_ICON)
    expect(usefulAppsSafeIcon('http://play-lh.googleusercontent.com/x')).toBeNull()
    expect(usefulAppsSafeIcon('https://evil.example/x.png')).toBeNull()
    expect(usefulAppsSafeIcon('https://mzstatic.com.evil.example/x.png')).toBeNull()
    expect(usefulAppsSafeIcon('https://user:pw@play-lh.googleusercontent.com/x')).toBeNull()
    expect(usefulAppsSafeIcon(42)).toBeNull()
  })
})

describe('usefulAppsStores — compactado para la página', () => {
  it('redondea la nota, valida cantidades y deja sólo lo que se muestra', () => {
    const out = usefulAppsCompactStores(
      doc({
        'bps-personas': {
          android: {
            status: 'ok',
            checkedAt: '2026-10-01',
            name: 'BPS Personas',
            developer: 'Banco de Prevision Social',
            updated: '2026-08-10',
            rating: 4.35915470123291,
            ratingCount: 1434,
            installs: '100 k+',
            icon: PLAY_ICON,
          },
          ios: {
            status: 'ok',
            checkedAt: '2026-10-01',
            updated: '2026-09-02',
            rating: 7,
            ratingCount: -3,
            installs: 'muchas',
            icon: 'https://evil.example/i.png',
          },
        },
      }),
      '2026-10-01'
    )
    expect(out).toEqual({
      capturedAt: '2026-10-01',
      apps: {
        'bps-personas': {
          android: {
            status: 'ok',
            checkedAt: '2026-10-01',
            updated: '2026-08-10',
            rating: 4.4,
            ratingCount: 1434,
            installs: '100 k+',
            icon: PLAY_ICON,
          },
          ios: {
            status: 'ok',
            checkedAt: '2026-10-01',
            updated: '2026-09-02',
            rating: null,
            ratingCount: null,
            installs: null,
            icon: null,
          },
        },
      },
    })
  })

  it('una ficha que no está en la tienda se informa mientras la lectura es reciente', () => {
    const out = usefulAppsCompactStores(
      doc({ cutcsa: { android: { status: 'missing', checkedAt: '2026-09-20' } } }),
      '2026-10-01'
    )
    expect(out?.apps.cutcsa?.android?.status).toBe('missing')
  })

  it('una lectura de más de 60 días no esconde un botón ni publica una nota vieja', () => {
    const out = usefulAppsCompactStores(
      doc({
        viejo: {
          android: { status: 'missing', checkedAt: '2026-07-01' },
          ios: {
            status: 'ok',
            checkedAt: '2026-07-01',
            updated: '2026-06-01',
            rating: 4,
            ratingCount: 10,
            icon: IOS_ICON,
          },
        },
      }),
      '2026-10-01'
    )
    expect(out?.apps.viejo?.android).toBeUndefined()
    expect(out?.apps.viejo?.ios).toEqual({
      status: 'ok',
      checkedAt: '2026-07-01',
      updated: null,
      rating: null,
      ratingCount: null,
      installs: null,
      icon: IOS_ICON,
    })
  })

  it('sin documento, o sin fecha de captura, no hay nada que mostrar', () => {
    expect(usefulAppsCompactStores(null, '2026-10-01')).toBeNull()
    expect(usefulAppsCompactStores({ key: 'uy', capturedAt: 'x', apps: {} }, '2026-10-01')).toBeNull()
  })

  it('acepta fechas que vuelven de Mongo como Date', () => {
    const out = usefulAppsCompactStores(
      {
        key: 'uy',
        capturedAt: new Date('2026-10-01T01:40:00Z'),
        apps: { x: { android: { status: 'ok', checkedAt: new Date('2026-10-01T01:41:00Z') } } },
      },
      '2026-10-01'
    )
    expect(out?.capturedAt).toBe('2026-10-01')
    expect(out?.apps.x?.android?.checkedAt).toBe('2026-10-01')
  })
})

describe('usefulAppsStores — frescura', () => {
  it('toma la versión más nueva de las dos tiendas', () => {
    expect(
      usefulAppsLatestUpdate({
        android: { status: 'ok', checkedAt: '2026-10-01', updated: '2023-11-03', rating: null, ratingCount: null, installs: null, icon: null },
        ios: { status: 'ok', checkedAt: '2026-10-01', updated: '2019-08-08', rating: null, ratingCount: null, installs: null, icon: null },
      })
    ).toBe('2023-11-03')
    expect(usefulAppsLatestUpdate(null)).toBeNull()
  })

  it('prefiere el ícono de Google Play y si no, el del App Store', () => {
    const base = { status: 'ok' as const, checkedAt: '2026-10-01', updated: null, rating: null, ratingCount: null, installs: null }
    expect(usefulAppsIconFor({ android: { ...base, icon: PLAY_ICON }, ios: { ...base, icon: IOS_ICON } })).toBe(PLAY_ICON)
    expect(usefulAppsIconFor({ ios: { ...base, icon: IOS_ICON } })).toBe(IOS_ICON)
    expect(usefulAppsIconFor(undefined)).toBeNull()
  })

  it('cuenta meses completos y marca como vieja a partir de 24', () => {
    expect(usefulAppsMonthsBetween('2024-10-01', '2026-09-30')).toBe(23)
    expect(usefulAppsMonthsBetween('2024-09-30', '2026-09-30')).toBe(24)
    expect(usefulAppsIsStale('2024-09-30', '2026-09-30')).toBe(true)
    expect(usefulAppsIsStale('2024-10-01', '2026-09-30')).toBe(false)
    expect(usefulAppsIsStale(null, '2026-09-30')).toBe(false)
  })
})

describe('usefulAppsStores — formato', () => {
  it('escribe los meses como en Uruguay', () => {
    expect(usefulAppsMonthYear('2026-09-17')).toBe('setiembre de 2026')
    expect(usefulAppsLongDate('2026-09-03')).toBe('3 de setiembre de 2026')
    expect(usefulAppsLongDate('2026-01-31')).toBe('31 de enero de 2026')
  })

  it('nota con coma decimal y cantidades con punto de miles', () => {
    expect(usefulAppsRating(4.35915)).toBe('4,4')
    expect(usefulAppsRating(5)).toBe('5,0')
    expect(usefulAppsCount(7)).toBe('7')
    expect(usefulAppsCount(1434)).toBe('1.434')
    expect(usefulAppsCount(19972844)).toBe('19.972.844')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run (desde `app/`): `npx vitest run tests/unit/usefulAppsStores.test.ts`
Expected: FAIL — no existe `utils/usefulAppsStores`.

- [ ] **Step 3: Write the implementation** — `app/utils/usefulAppsStores.ts`

```ts
// app/utils/usefulAppsStores.ts
// Lo que el job semanal `currency-useful-apps` lee de las fichas de Google Play y del App Store
// (colección `usefulappssnapshots` de la base del app) y cómo lo muestra /apps-utiles-uruguay.
// MÓDULO PURO: lo usan la ruta /api/useful-apps/stores, la página, la tarjeta y los tests.
//
// Las fechas se escriben con una tabla propia de meses y no con Intl: el servidor (ICU 76) y el
// navegador (ICU 78) no escriben igual, y "setiembre" es como se dice acá.

export type UsefulAppsStoreStatus = 'ok' | 'missing'

/** Una ficha tal como la guarda el job. `missing` = la tienda contestó 404 (no está en Uruguay). */
export interface UsefulAppsStoreSignal {
  status: UsefulAppsStoreStatus
  /** Día en que se leyó la ficha. Mongo lo devuelve como Date o como string. */
  checkedAt: string | Date
  name?: string | null
  developer?: string | null
  updated?: string | Date | null
  rating?: number | null
  ratingCount?: number | null
  installs?: string | null
  icon?: string | null
}

export interface UsefulAppsSnapshotDoc {
  key: string
  capturedAt: string | Date
  apps: Record<
    string,
    { android?: UsefulAppsStoreSignal | null; ios?: UsefulAppsStoreSignal | null } | null
  >
  counts?: { apps: number; fresh: number; missing: number; failed: number }
  developerChanges?: { id: string; store: 'android' | 'ios'; expected: string; found: string }[]
}

/** Lo que sale por /api/useful-apps/stores: sólo lo que la página muestra. */
export interface UsefulAppsStoreFacts {
  status: UsefulAppsStoreStatus
  checkedAt: string
  updated: string | null
  rating: number | null
  ratingCount: number | null
  installs: string | null
  icon: string | null
}

export interface UsefulAppsAppFacts {
  android?: UsefulAppsStoreFacts
  ios?: UsefulAppsStoreFacts
}

export interface UsefulAppsStoresPayload {
  /** Día (YYYY-MM-DD) de la última corrida del job. */
  capturedAt: string
  apps: Record<string, UsefulAppsAppFacts>
}

/** Una lectura de más de 60 días no se presenta como dato de hoy (mismo corte que tiendas online). */
export const USEFUL_APPS_SIGNAL_MAX_AGE_DAYS = 60
/** Sin versiones nuevas en 24 meses: la tarjeta avisa que puede no andar bien. */
export const USEFUL_APPS_STALE_MONTHS = 24

const ICON_HOSTS: readonly RegExp[] = [/^play-lh\.googleusercontent\.com$/, /(^|\.)mzstatic\.com$/]

/** Un ícono sólo si es https, sin credenciales y de una de las dos CDN de las tiendas. */
export function usefulAppsSafeIcon(url: unknown): string | null {
  if (typeof url !== 'string' || url.length > 600) return null
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== 'https:' || parsed.username || parsed.password) return null
    return ICON_HOSTS.some(host => host.test(parsed.hostname)) ? url : null
  } catch {
    return null
  }
}

const DAY = /^\d{4}-\d{2}-\d{2}$/

/** `YYYY-MM-DD` de un string ISO o un Date; `null` si no es una fecha. */
export function usefulAppsIsoDay(value: unknown): string | null {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString().slice(0, 10)
  }
  if (typeof value !== 'string') return null
  const day = value.slice(0, 10)
  return DAY.test(day) && !Number.isNaN(Date.parse(`${day}T00:00:00Z`)) ? day : null
}

function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000)
}

const INSTALLS = /^[0-9][0-9.,]*\s?(?:[kKmMbB]|mil)?\s?\+$/

function compactSignal(
  signal: UsefulAppsStoreSignal | null | undefined,
  today: string
): UsefulAppsStoreFacts | undefined {
  if (!signal || (signal.status !== 'ok' && signal.status !== 'missing')) return undefined
  const checkedAt = usefulAppsIsoDay(signal.checkedAt)
  if (!checkedAt) return undefined
  const icon = usefulAppsSafeIcon(signal.icon)
  const empty = { updated: null, rating: null, ratingCount: null, installs: null }
  if (daysBetween(checkedAt, today) > USEFUL_APPS_SIGNAL_MAX_AGE_DAYS) {
    // Vieja: el ícono sigue sirviendo para reconocerla; lo demás ya no es de hoy, y un "no está en
    // la tienda" de hace meses no alcanza para esconder un botón.
    return signal.status === 'ok' && icon ? { status: 'ok', checkedAt, ...empty, icon } : undefined
  }
  if (signal.status === 'missing') return { status: 'missing', checkedAt, ...empty, icon: null }
  const rating =
    typeof signal.rating === 'number' && signal.rating >= 0 && signal.rating <= 5
      ? Math.round(signal.rating * 10) / 10
      : null
  const ratingCount =
    typeof signal.ratingCount === 'number' &&
    Number.isInteger(signal.ratingCount) &&
    signal.ratingCount >= 0
      ? signal.ratingCount
      : null
  const installs =
    typeof signal.installs === 'string' &&
    signal.installs.length <= 16 &&
    INSTALLS.test(signal.installs.trim())
      ? signal.installs.trim()
      : null
  return {
    status: 'ok',
    checkedAt,
    updated: usefulAppsIsoDay(signal.updated),
    rating: ratingCount === null ? null : rating,
    ratingCount,
    installs,
    icon,
  }
}

/**
 * Lo que la ruta devuelve: sólo campos que la página muestra, validados. `today` es el día del
 * servidor que atiende (YYYY-MM-DD); el resultado viaja en el payload, así que el navegador no lo
 * recalcula y no hay diferencias de hidratación.
 */
export function usefulAppsCompactStores(
  doc: UsefulAppsSnapshotDoc | null | undefined,
  today: string
): UsefulAppsStoresPayload | null {
  if (!doc || !doc.apps) return null
  const capturedAt = usefulAppsIsoDay(doc.capturedAt)
  if (!capturedAt) return null
  const reference = usefulAppsIsoDay(today) ?? capturedAt
  const apps: Record<string, UsefulAppsAppFacts> = {}
  for (const [id, stores] of Object.entries(doc.apps)) {
    const out: UsefulAppsAppFacts = {}
    const android = compactSignal(stores?.android, reference)
    const ios = compactSignal(stores?.ios, reference)
    if (android) out.android = android
    if (ios) out.ios = ios
    if (out.android || out.ios) apps[id] = out
  }
  return { capturedAt, apps }
}

export function usefulAppsLatestUpdate(facts: UsefulAppsAppFacts | null | undefined): string | null {
  const days = [facts?.android?.updated, facts?.ios?.updated].filter(
    (day): day is string => typeof day === 'string'
  )
  return days.length ? days.sort()[days.length - 1]! : null
}

export function usefulAppsIconFor(facts: UsefulAppsAppFacts | null | undefined): string | null {
  return facts?.android?.icon ?? facts?.ios?.icon ?? null
}

/** Meses completos entre dos días `YYYY-MM-DD`. */
export function usefulAppsMonthsBetween(from: string, to: string): number {
  const [fy, fm, fd] = from.split('-').map(Number) as [number, number, number]
  const [ty, tm, td] = to.split('-').map(Number) as [number, number, number]
  return (ty - fy) * 12 + (tm - fm) - (td < fd ? 1 : 0)
}

export function usefulAppsIsStale(updated: string | null, today: string): boolean {
  if (!updated) return false
  return usefulAppsMonthsBetween(updated, today) >= USEFUL_APPS_STALE_MONTHS
}

const MONTHS = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'setiembre',
  'octubre',
  'noviembre',
  'diciembre',
] as const

/** "2026-09-17" → "setiembre de 2026". */
export function usefulAppsMonthYear(day: string): string {
  const [year, month] = day.split('-').map(Number) as [number, number]
  return `${MONTHS[month - 1]} de ${year}`
}

/** "2026-09-03" → "3 de setiembre de 2026". */
export function usefulAppsLongDate(day: string): string {
  const [year, month, date] = day.split('-').map(Number) as [number, number, number]
  return `${date} de ${MONTHS[month - 1]} de ${year}`
}

/** 4.35915 → "4,4". */
export function usefulAppsRating(value: number): string {
  return (Math.round(value * 10) / 10).toFixed(1).replace('.', ',')
}

/** 1434 → "1.434". */
export function usefulAppsCount(value: number): string {
  return String(Math.round(value)).replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/usefulAppsStores.test.ts tests/unit/siteTimeZone.test.ts tests/unit/dateLocale.test.ts`
Expected: PASS (el archivo no llama a `toLocaleDateString`, así que los dos tripwires de fechas
siguen verdes). `npx eslint utils/usefulAppsStores.ts tests/unit/usefulAppsStores.test.ts` limpio
(`npm run lintfix` si prettier reacomoda las líneas largas del test).

- [ ] **Step 5: Commit**

```bash
git add app/utils/usefulAppsStores.ts app/tests/unit/usefulAppsStores.test.ts
git commit -m "feat(apps-utiles): lectura y formato de los datos de las tiendas"
```

---

### Task 3: Catálogo verificado (`app/utils/usefulAppsCatalog.ts` + `classes/usefulapps/catalog.ts`)

**Lo ejecuta el orquestador, no un implementador:** el contenido sale de la investigación (9
agentes), de la verificación determinística de las 236 fichas (`scratchpad/final-stores.json`,
29–30/9/2026) y de la redacción verificada fuente por fuente (workflow `apps-copy-and-verify`,
`scratchpad/copy-out.json`). Nadie escribe una app a mano: se generan los dos archivos con
`scratchpad/gen-catalog.mjs` y se revisan.

**Files:**
- Create (generado): `app/utils/usefulAppsCatalog.ts`, `classes/usefulapps/catalog.ts`
- Test: `app/tests/unit/usefulAppsCatalog.test.ts`, `app/tests/unit/usefulAppsCatalogParity.test.ts`
- Modify: `.github/workflows/deploy.yml` (filtro `appContracts`)

**Interfaces:**
- Consumes: `UsefulApp`, `USEFUL_APP_CATEGORIES`, `USEFUL_APP_DEPARTMENTS`, `usefulAppIsPublic`
  (Task 1); `USEFUL_APPS_GUIDE_LABELS` (Task 4).
- Produces: `USEFUL_APPS: readonly UsefulApp[]` (orden = "más útiles primero" dentro de cada
  categoría), `USEFUL_APPS_VERIFIED_AT = '2026-09-30'`; en la raíz
  `USEFUL_APP_STORE_IDS: readonly UsefulAppStoreIds[]` con
  `interface UsefulAppStoreIds { id: string; android?: string; ios?: string; androidDeveloper?: string; iosDeveloper?: string }`.

- [ ] **Step 1: Write the failing tests**

`app/tests/unit/usefulAppsCatalog.test.ts`:

```ts
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  USEFUL_APP_CATEGORIES,
  USEFUL_APP_DEPARTMENTS,
  usefulAppIsPublic,
} from '../../utils/usefulApps'
import { USEFUL_APPS, USEFUL_APPS_VERIFIED_AT } from '../../utils/usefulAppsCatalog'
import { USEFUL_APPS_GUIDE_LABELS } from '../../utils/usefulAppsContent'

const PAGES = join(__dirname, '..', '..', 'pages')
const pageExists = (route: string) =>
  existsSync(join(PAGES, `${route.slice(1)}.vue`)) ||
  existsSync(join(PAGES, route.slice(1), 'index.vue'))
const TRACKING = /[?&](utm_[a-z]+|ref|referral|aff|fbclid|gclid)=/i
const CATEGORY_IDS = USEFUL_APP_CATEGORIES.map(c => c.id) as string[]

describe('catálogo de apps útiles', () => {
  it('tiene una fecha de verificación ISO y más de cien apps', () => {
    expect(USEFUL_APPS_VERIFIED_AT).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(USEFUL_APPS.length).toBeGreaterThanOrEqual(100)
  })

  it('usa ids kebab-case únicos (también son anclas)', () => {
    const ids = USEFUL_APPS.map(a => a.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const id of ids) expect(id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/)
  })

  it('no repite una ficha de tienda en dos apps', () => {
    const stores = USEFUL_APPS.flatMap(a =>
      [a.android && `a:${a.android.id}`, a.ios && `i:${a.ios.id}`].filter(Boolean)
    )
    expect(new Set(stores).size).toBe(stores.length)
  })

  it('cada pestaña tiene por lo menos tres apps', () => {
    for (const id of CATEGORY_IDS) {
      const n = USEFUL_APPS.filter(a => a.category === id || a.also?.includes(id as never)).length
      expect(n, id).toBeGreaterThanOrEqual(3)
    }
  })

  it('cada tarjeta cumple el formato de copy', () => {
    for (const a of USEFUL_APPS) {
      expect(a.name.trim(), a.id).not.toBe('')
      expect(a.name.length, a.id).toBeLessThanOrEqual(40)
      expect(a.organization.trim(), a.id).not.toBe('')
      expect(a.summary.length, a.id).toBeGreaterThanOrEqual(20)
      expect(a.summary.length, a.id).toBeLessThanOrEqual(120)
      expect(a.summary.endsWith('.'), a.id).toBe(true)
      expect(a.uses.length, a.id).toBeGreaterThanOrEqual(2)
      expect(a.uses.length, a.id).toBeLessThanOrEqual(4)
      for (const use of a.uses) {
        expect(use.length, `${a.id}: ${use}`).toBeGreaterThanOrEqual(8)
        expect(use.length, `${a.id}: ${use}`).toBeLessThanOrEqual(100)
        expect(use.endsWith('.'), `${a.id}: ${use}`).toBe(false)
      }
      expect((a.needs ?? []).length, a.id).toBeLessThanOrEqual(3)
      expect(CATEGORY_IDS, a.id).toContain(a.category)
      for (const extra of a.also ?? []) {
        expect(CATEGORY_IDS, a.id).toContain(extra)
        expect(extra, a.id).not.toBe(a.category)
      }
      if (a.note !== undefined) expect(a.note.length, a.id).toBeLessThanOrEqual(240)
    }
  })

  it('cada app tiene al menos una ficha de tienda bien formada, con su desarrollador', () => {
    for (const a of USEFUL_APPS) {
      expect(Boolean(a.android || a.ios), a.id).toBe(true)
      if (a.android) {
        expect(a.android.id, a.id).toMatch(/^[A-Za-z][A-Za-z0-9_]*(\.[A-Za-z0-9_]+)+$/)
        expect(a.android.developer.trim(), a.id).not.toBe('')
      }
      if (a.ios) {
        expect(a.ios.id, a.id).toMatch(/^\d{6,12}$/)
        expect(a.ios.developer.trim(), a.id).not.toBe('')
      }
    }
  })

  it('las fuentes y webs son https y sin parámetros de seguimiento', () => {
    for (const a of USEFUL_APPS) {
      for (const url of [a.source, a.web].filter(Boolean) as string[]) {
        expect(url, a.id).toMatch(/^https:\/\//)
        expect(TRACKING.test(url), `${a.id}: ${url}`).toBe(false)
      }
    }
  })

  it('una app no oficial lo dice y apunta a la oficial', () => {
    const community = USEFUL_APPS.filter(a => a.kind === 'comunidad')
    expect(community.length).toBeGreaterThan(0)
    for (const a of community) {
      expect(a.note, a.id).toMatch(/no es (de|oficial)/i)
      const official = USEFUL_APPS.find(o => o.id === a.officialAlternative)
      expect(official, a.id).toBeDefined()
      expect(usefulAppIsPublic(official!), a.id).toBe(true)
    }
  })

  it('los departamentos existen y no se repiten', () => {
    for (const a of USEFUL_APPS) {
      const list = a.departments ?? []
      expect(new Set(list).size, a.id).toBe(list.length)
      for (const d of list) expect(USEFUL_APP_DEPARTMENTS as readonly string[], a.id).toContain(d)
    }
  })

  it('las palabras del buscador están en minúsculas y cada app tiene alguna', () => {
    for (const a of USEFUL_APPS) {
      expect((a.keywords ?? []).length, a.id).toBeGreaterThanOrEqual(1)
      expect((a.keywords ?? []).length, a.id).toBeLessThanOrEqual(10)
      for (const k of a.keywords ?? []) expect(k, a.id).toBe(k.toLowerCase())
    }
  })

  it('cada guía enlazada tiene etiqueta y página', () => {
    for (const a of USEFUL_APPS) {
      expect((a.guides ?? []).length, a.id).toBeLessThanOrEqual(2)
      for (const route of a.guides ?? []) {
        expect(USEFUL_APPS_GUIDE_LABELS[route], `${a.id}: ${route}`).toBeTruthy()
        expect(pageExists(route), `${a.id}: ${route}`).toBe(true)
      }
    }
  })
})
```

`app/tests/unit/usefulAppsCatalogParity.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
// Vive en la suite del APP a propósito (ver storeConstantsParity.test.ts): la raíz no puede cargar
// app/, y el app sí puede importar la raíz. El job semanal lee sus fichas de
// classes/usefulapps/catalog.ts; este test es lo único que impide que el job mida otra app que la
// que la página muestra.
import { USEFUL_APP_STORE_IDS } from '../../../classes/usefulapps/catalog'
import { USEFUL_APPS } from '../../utils/usefulAppsCatalog'

describe('las fichas del job son las de la página', () => {
  it('mismos ids, mismos paquetes, mismos ids de App Store y mismos desarrolladores', () => {
    const fromApp = USEFUL_APPS.map(a => ({
      id: a.id,
      android: a.android?.id,
      ios: a.ios?.id,
      androidDeveloper: a.android?.developer,
      iosDeveloper: a.ios?.developer,
    }))
    const fromRoot = USEFUL_APP_STORE_IDS.map(s => ({
      id: s.id,
      android: s.android,
      ios: s.ios,
      androidDeveloper: s.androidDeveloper,
      iosDeveloper: s.iosDeveloper,
    }))
    expect(fromRoot).toEqual(fromApp)
  })
})
```

- [ ] **Step 2: Run to verify they fail**

Run (desde `app/`): `npx vitest run tests/unit/usefulAppsCatalog.test.ts tests/unit/usefulAppsCatalogParity.test.ts`
Expected: FAIL — faltan `usefulAppsCatalog`, `usefulAppsContent` y `classes/usefulapps/catalog`.

- [ ] **Step 3: Generar los dos archivos** (orquestador; Task 4 tiene que estar hecha antes para
  `USEFUL_APPS_GUIDE_LABELS`)

Run: `node C:/Users/airau/AppData/Local/Temp/claude/c--Users-airau-Documents-GitHub-cambio-uruguay/27430b7f-d7b3-4fbe-b4e6-2d7862dc63eb/scratchpad/gen-catalog.mjs`

El generador:
1. Toma cada entrada de `copy-out.json` con `include: true` y le aplica la decisión de
   `curation.mjs` (id, categoría, `also`, tipo; Telepeaje/CVU queda `empresa-publica`).
2. Toma de `final-stores.json` el paquete, el id de App Store y el **desarrollador tal cual la
   ficha** (nunca el de la investigación). Una ficha que dio error no entra.
3. `departments` = `scopeDepartments` del copy (vacío = nacional); `officialAlternative:
   'como-ir'` para `stm-montevideo`.
4. Ordena por categoría (orden de `USEFUL_APP_CATEGORIES`) y dentro de cada una por el orden
   curado del generador (las del kit primero, después por alcance y uso).
5. Escribe `app/utils/usefulAppsCatalog.ts` con este encabezado, y el arreglo:

```ts
// app/utils/usefulAppsCatalog.ts
// Las apps de /apps-utiles-uruguay. GENERADO desde la verificación del 29–30/9/2026: cada ficha de
// Google Play y del App Store se abrió (paquete, id y desarrollador salen de la ficha, no de la
// investigación) y cada "uso" se comprobó en la ficha o en la página del organismo. Para agregar o
// corregir una app: abrir las dos fichas y la fuente, y editar acá Y en
// classes/usefulapps/catalog.ts (usefulAppsCatalogParity.test.ts vigila que coincidan).
import type { UsefulApp } from './usefulApps'

/** Día en que se abrió cada ficha y cada fuente de este archivo. */
export const USEFUL_APPS_VERIFIED_AT = '2026-09-30'

export const USEFUL_APPS: readonly UsefulApp[] = Object.freeze([
  // … una entrada por app, en el orden de "Más útiles primero"
])
```

   y `classes/usefulapps/catalog.ts`:

```ts
// Las fichas de tienda de las apps de /apps-utiles-uruguay, para el job semanal
// `currency-useful-apps`. Es el espejo de app/utils/usefulAppsCatalog.ts (el job no puede importar
// app/ y el build del app no puede leer fuera de app/): la paridad la vigila
// app/tests/unit/usefulAppsCatalogParity.test.ts. Los desarrolladores esperados sirven para avisar
// si una ficha cambió de dueño.
export interface UsefulAppStoreIds {
  id: string;
  android?: string;
  ios?: string;
  androidDeveloper?: string;
  iosDeveloper?: string;
}

export const USEFUL_APP_STORE_IDS: readonly UsefulAppStoreIds[] = Object.freeze([
  // … una entrada por app, mismo orden
]);
```

6. Corre `npx eslint --fix utils/usefulAppsCatalog.ts` (desde `app/`) para el formato de prettier.

- [ ] **Step 4: Agregar el catálogo de la raíz al filtro `appContracts`** — `.github/workflows/deploy.yml`

En la lista `appContracts` (donde están `classes/stores/**`, `classes/equipar/registry.ts`…) agregar
la línea:

```yaml
              - 'classes/usefulapps/catalog.ts'
```

(misma indentación que sus vecinas), para que un cambio sólo en la raíz corra igual la suite del app
que contiene la paridad.

- [ ] **Step 5: Run to verify they pass**

Run: `npx vitest run tests/unit/usefulAppsCatalog.test.ts tests/unit/usefulAppsCatalogParity.test.ts tests/unit/noGeminiInApp.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add app/utils/usefulAppsCatalog.ts classes/usefulapps/catalog.ts app/tests/unit/usefulAppsCatalog.test.ts app/tests/unit/usefulAppsCatalogParity.test.ts .github/workflows/deploy.yml
git commit -m "feat(apps-utiles): catálogo de 118 apps verificado ficha por ficha"
```

---

### Task 4: Contenido: kit, "no es una app", criterios, consejos y FAQ (`app/utils/usefulAppsContent.ts`)

**Lo ejecuta el orquestador** (el texto sale de fuentes verificadas: la sección "no es una app" del
agente `verify:sin-app` de `copy-out.json`; el resto, de las fichas verificadas).

**Files:**
- Create: `app/utils/usefulAppsContent.ts`
- Test: `app/tests/unit/usefulAppsContent.test.ts`

**Interfaces:**
- Consumes: `UsefulAppCategoryId` (Task 1), `FaqItem` de `app/utils/faqAnswers.ts`
  (`{ id: string; question: string; answer: string; link?: { label: string; to: string } }`).
- Produces: `UsefulAppsKitItem`, `USEFUL_APPS_KIT`, `USEFUL_APPS_ESSENTIAL_IDS`,
  `USEFUL_APPS_KIT_STORAGE = 'cu_apps_kit'`, `USEFUL_APPS_KIT_MAX = 20`,
  `usefulAppsKitSanitize(raw): string[]`, `UsefulAppsNotApp`, `USEFUL_APPS_NOT_APPS`,
  `USEFUL_APPS_CRITERIA: readonly string[]`, `USEFUL_APPS_SAFETY: readonly string[]`,
  `USEFUL_APPS_FAQ: readonly FaqItem[]`, `USEFUL_APPS_GUIDE_LABELS: Readonly<Record<string, string>>`.

- [ ] **Step 1: Write the failing test** — `app/tests/unit/usefulAppsContent.test.ts`

```ts
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { usefulAppIsPublic } from '../../utils/usefulApps'
import { USEFUL_APPS } from '../../utils/usefulAppsCatalog'
import {
  USEFUL_APPS_CRITERIA,
  USEFUL_APPS_ESSENTIAL_IDS,
  USEFUL_APPS_FAQ,
  USEFUL_APPS_GUIDE_LABELS,
  USEFUL_APPS_KIT,
  USEFUL_APPS_KIT_MAX,
  USEFUL_APPS_NOT_APPS,
  USEFUL_APPS_SAFETY,
  usefulAppsKitSanitize,
} from '../../utils/usefulAppsContent'

const byId = new Map(USEFUL_APPS.map(a => [a.id, a]))
const PAGES = join(__dirname, '..', '..', 'pages')

describe('kit de imprescindibles', () => {
  it('tiene ids únicos, seis para todos y el resto según el caso', () => {
    const ids = USEFUL_APPS_KIT.map(i => i.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(USEFUL_APPS_KIT.filter(i => i.group === 'todos')).toHaveLength(6)
    for (const item of USEFUL_APPS_KIT.filter(i => i.group === 'caso')) {
      expect(item.when, item.id).toMatch(/^Si /)
    }
  })

  it('cada ítem apunta a apps del catálogo y la primera es del Estado', () => {
    for (const item of USEFUL_APPS_KIT) {
      expect(item.appIds.length, item.id).toBeGreaterThanOrEqual(1)
      for (const id of item.appIds) expect(byId.has(id), `${item.id}: ${id}`).toBe(true)
      expect(usefulAppIsPublic(byId.get(item.appIds[0]!)!), item.id).toBe(true)
      expect(item.why.endsWith('.'), item.id).toBe(true)
    }
  })

  it('la pestaña Imprescindibles son las apps del kit, sin repetir y en su orden', () => {
    expect(USEFUL_APPS_ESSENTIAL_IDS).toEqual([
      ...new Set(USEFUL_APPS_KIT.flatMap(i => [...i.appIds])),
    ])
  })

  it('INUMET no está en el kit: en iPhone no se actualiza desde 2019', () => {
    expect(USEFUL_APPS_ESSENTIAL_IDS).not.toContain('inumet')
  })
})

describe('lo guardado del kit', () => {
  it('se queda sólo con ítems "para todos" que existen, sin repetir', () => {
    const todos = USEFUL_APPS_KIT.filter(i => i.group === 'todos').map(i => i.id)
    const caso = USEFUL_APPS_KIT.find(i => i.group === 'caso')!.id
    expect(usefulAppsKitSanitize([todos[0], todos[0], 'inventado', 42, null, caso])).toEqual([
      todos[0],
    ])
  })

  it('cualquier cosa que no sea un arreglo es un kit vacío', () => {
    expect(usefulAppsKitSanitize('{"a":1}')).toEqual([])
    expect(usefulAppsKitSanitize(null)).toEqual([])
    expect(usefulAppsKitSanitize({ length: 3 })).toEqual([])
  })

  it('tiene un tope', () => {
    const many = Array.from({ length: 100 }, () => USEFUL_APPS_KIT[0]!.id)
    expect(usefulAppsKitSanitize(many).length).toBeLessThanOrEqual(USEFUL_APPS_KIT_MAX)
  })
})

describe('lo que no es una app', () => {
  it('cada servicio dice qué se busca, qué hacer en cambio y por dónde', () => {
    expect(USEFUL_APPS_NOT_APPS.length).toBeGreaterThanOrEqual(4)
    for (const s of USEFUL_APPS_NOT_APPS) {
      expect(s.name.trim(), s.id).not.toBe('')
      expect(s.lookingFor.trim(), s.id).not.toBe('')
      expect(s.instead.length, s.id).toBeLessThanOrEqual(170)
      expect(s.instead.endsWith('.'), s.id).toBe(true)
      expect(s.channels.length, s.id).toBeGreaterThanOrEqual(1)
      for (const c of s.channels) {
        expect(c.url, s.id).toMatch(/^(https:\/\/|tel:|https:\/\/wa\.me\/)/)
        expect(c.label.trim(), s.id).not.toBe('')
      }
      expect(s.source, s.id).toMatch(/^https:\/\//)
    }
  })
})

describe('textos de la página', () => {
  it('criterios y consejos son oraciones completas', () => {
    expect(USEFUL_APPS_CRITERIA.length).toBeGreaterThanOrEqual(4)
    expect(USEFUL_APPS_SAFETY.length).toBeGreaterThanOrEqual(4)
    for (const line of [...USEFUL_APPS_CRITERIA, ...USEFUL_APPS_SAFETY]) {
      expect(line.endsWith('.'), line).toBe(true)
    }
  })

  it('la FAQ tiene preguntas únicas que terminan en "?" y respuestas con contenido', () => {
    expect(USEFUL_APPS_FAQ.length).toBeGreaterThanOrEqual(5)
    const ids = USEFUL_APPS_FAQ.map(f => f.id)
    expect(new Set(ids).size).toBe(ids.length)
    const questions = USEFUL_APPS_FAQ.map(f => f.question)
    expect(new Set(questions).size).toBe(questions.length)
    for (const f of USEFUL_APPS_FAQ) {
      expect(f.question.endsWith('?'), f.id).toBe(true)
      expect(f.answer.length, f.id).toBeGreaterThan(40)
      if (f.link) expect(existsSync(join(PAGES, `${f.link.to.slice(1)}.vue`)), f.id).toBe(true)
    }
  })

  it('cada guía con etiqueta es una página que existe', () => {
    for (const route of Object.keys(USEFUL_APPS_GUIDE_LABELS)) {
      expect(
        existsSync(join(PAGES, `${route.slice(1)}.vue`)) ||
          existsSync(join(PAGES, route.slice(1), 'index.vue')),
        route
      ).toBe(true)
    }
  })
})
```

- [ ] **Step 2: Run to verify it fails** — `npx vitest run tests/unit/usefulAppsContent.test.ts` →
  FAIL (no existe el módulo).

- [ ] **Step 3: Write `app/utils/usefulAppsContent.ts`**

La estructura es fija; el texto de `USEFUL_APPS_NOT_APPS` y la respuesta de la FAQ `ose-app` se
completan con lo que el agente `verify:sin-app` vio en las páginas oficiales (sólo canales con
confianza alta o media; un canal no visto en la página oficial no se publica).

```ts
// app/utils/usefulAppsContent.ts
// Los textos de /apps-utiles-uruguay que no son una tarjeta: el kit de imprescindibles, lo que la
// gente busca en las tiendas y NO es una app, los criterios, los consejos contra apps falsas y la
// FAQ. MÓDULO PURO. Cada afirmación sale de una ficha o de una página oficial abierta el
// USEFUL_APPS_VERIFIED_AT (utils/usefulAppsCatalog.ts).
import type { FaqItem } from './faqAnswers'
import type { UsefulAppCategoryId } from './usefulApps'

export interface UsefulAppsKitItem {
  id: string
  /** `todos`: lleva casilla y cuenta para el progreso. `caso`: depende de tu situación. */
  group: 'todos' | 'caso'
  title: string
  why: string
  /** 1–2 apps del catálogo; la primera es del Estado. Con dos, alcanza con una. */
  appIds: readonly string[]
  /** Condición, sólo para `caso` ("Si tenés auto o moto"). */
  when?: string
  /** Pestaña donde hay más opciones (la de tu mutualista está en Salud). */
  tab?: UsefulAppCategoryId
}

export const USEFUL_APPS_KIT: readonly UsefulAppsKitItem[] = Object.freeze([
  {
    id: 'estado',
    group: 'todos',
    title: 'La app del Estado',
    why: 'Te avisa antes de que venzan la cédula, el pasaporte y la libreta, y ahí ves tu historia clínica digital.',
    appIds: ['gub-uy'],
  },
  {
    id: 'bps',
    group: 'todos',
    title: 'Tu historia laboral',
    why: 'Tu historia laboral, los recibos de cobro, los certificados y el cambio de mutualista, sin ir al BPS.',
    appIds: ['bps-personas'],
  },
  {
    id: 'identidad',
    group: 'todos',
    title: 'Tu identidad digital',
    why: 'Con una de las dos entrás sin contraseña a la DGI y a gub.uy, ves tu historia clínica y firmás documentos.',
    appIds: ['tuid-antel', 'identidad-digital-abitab'],
  },
  {
    id: 'emergencias',
    group: 'todos',
    title: 'Emergencias',
    why: 'Reportás una emergencia al 9-1-1 con tu ubicación sin tener que hablar, y recibís las Alertas AMBER.',
    appIds: ['emergencia-911'],
  },
  {
    id: 'luz',
    group: 'todos',
    title: 'La luz',
    why: 'Avisás que te quedaste sin luz, mirás tu consumo y pagás la factura de UTE.',
    appIds: ['ute'],
  },
  {
    id: 'salud',
    group: 'todos',
    title: 'Tu prestador de salud',
    why: 'ASSE tiene la suya, sólo para Android. Si sos de una mutualista, buscá la tuya en la pestaña Salud.',
    appIds: ['asse'],
    tab: 'salud',
  },
  {
    id: 'dgi',
    group: 'caso',
    when: 'Si declarás IRPF o esperás una devolución',
    title: 'Impuestos',
    why: 'Confirmás la declaración de IRPF y ves si te toca devolución, sin ir a la DGI.',
    appIds: ['dgi'],
  },
  {
    id: 'patente',
    group: 'caso',
    when: 'Si tenés auto o moto',
    title: 'Patente y multas',
    why: 'Consultás y pagás la patente, las multas y los convenios de tu vehículo, de cualquier departamento.',
    appIds: ['sucive'],
  },
  {
    id: 'peajes',
    group: 'caso',
    when: 'Si pasás peajes con TAG',
    title: 'Peajes',
    why: 'Ves tu saldo y tus pasadas por los peajes, y recargás desde el banco.',
    appIds: ['telepeaje'],
  },
  {
    id: 'omnibus',
    group: 'caso',
    when: 'Si te movés en ómnibus por Montevideo',
    title: 'El ómnibus',
    why: 'La app oficial de la Intendencia: cómo llegar y cuánto falta para que pase el ómnibus.',
    appIds: ['como-ir'],
  },
  {
    id: 'escuela',
    group: 'caso',
    when: 'Si tenés hijos en escuela pública',
    title: 'La escuela',
    why: 'Las faltas, las notas y quién es la maestra o el maestro de tu hijo.',
    appIds: ['guri-familia'],
  },
  {
    id: 'antel',
    group: 'caso',
    when: 'Si tenés celular, teléfono fijo o internet de Antel',
    title: 'Antel',
    why: 'El saldo, el consumo y las facturas de tus servicios de Antel.',
    appIds: ['mi-antel'],
  },
  {
    id: 'brou',
    group: 'caso',
    when: 'Si tenés cuenta en el BROU',
    title: 'El banco del Estado',
    why: 'Tus cuentas del BROU en el celular: saldos, transferencias y pago de cuentas.',
    appIds: ['ebrou'],
  },
])

/** La pestaña "Imprescindibles": las apps del kit, en su orden y sin repetir. */
export const USEFUL_APPS_ESSENTIAL_IDS: readonly string[] = Object.freeze([
  ...new Set(USEFUL_APPS_KIT.flatMap(item => [...item.appIds])),
])

/** Clave de `localStorage` de las casillas del kit (sin dígitos: gitleaks). */
export const USEFUL_APPS_KIT_STORAGE = 'cu_apps_kit'
export const USEFUL_APPS_KIT_MAX = 20

const KIT_TODOS: ReadonlySet<string> = new Set(
  USEFUL_APPS_KIT.filter(item => item.group === 'todos').map(item => item.id)
)

/** Lo guardado en el navegador puede ser cualquier cosa: sólo quedan ítems "para todos" reales. */
export function usefulAppsKitSanitize(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  const out: string[] = []
  for (const value of raw) {
    if (typeof value !== 'string' || !KIT_TODOS.has(value) || out.includes(value)) continue
    out.push(value)
    if (out.length >= USEFUL_APPS_KIT_MAX) break
  }
  return out
}

export interface UsefulAppsNotAppChannel {
  label: string
  value: string
  /** Enlace directo (https, `tel:` o `https://wa.me/...`). */
  url: string
}

export interface UsefulAppsNotApp {
  id: string
  name: string
  /** Lo que alguien quiere hacer cuando busca la app. */
  lookingFor: string
  /** Qué hacer en cambio, en una oración. */
  instead: string
  channels: readonly UsefulAppsNotAppChannel[]
  /** Página oficial donde se vieron los canales. */
  source: string
}

// Completado con la verificación del agente `verify:sin-app` (páginas oficiales abiertas el
// 29–30/9/2026). Orden: lo que más se busca primero.
export const USEFUL_APPS_NOT_APPS: readonly UsefulAppsNotApp[] = Object.freeze([
  // { id: 'ose', name: 'OSE', lookingFor: 'Pagar el agua o avisar una pérdida', instead: '…', channels: [...], source: 'https://www.ose.com.uy/…' },
])

export const USEFUL_APPS_CRITERIA: readonly string[] = Object.freeze([
  'Está hoy en Google Play o en el App Store de Uruguay: abrimos cada ficha.',
  'La publica la organización que presta el servicio. Si no, lo decimos arriba de todo y te mostramos la oficial.',
  'Le sirve a mucha gente que vive en Uruguay: quedan afuera las apps internas de funcionarios, los pilotos y las de nicho.',
  'Tiene mantenimiento: más de dos años sin una versión nueva la saca de la lista, salvo que sea la única oficial de su servicio, y entonces la tarjeta lo avisa.',
  'Nadie paga por aparecer ni hay enlaces de afiliados: cada botón lleva a la ficha oficial de la tienda.',
])

export const USEFUL_APPS_SAFETY: readonly string[] = Object.freeze([
  'Bajala desde el botón de la tarjeta o buscando el nombre exacto, y mirá el desarrollador: tiene que coincidir con el que ponemos en cada tarjeta.',
  'Desconfiá de las copias con nombres parecidos: en las tiendas hay apps llamadas «OSE» que no son de OSE y bancos de otros países con el nombre de uno de acá.',
  'Los bancos y los organismos no mandan apps por SMS, WhatsApp ni correo: instalá sólo desde Google Play o el App Store, nunca un archivo .apk.',
  'Todas las apps de este directorio se bajan gratis. Si una te pide pagar para instalarse, no es la oficial.',
  'Si ya instalaste una sospechosa y pusiste datos de tu banco, llamá al banco para bloquear el acceso y cambiá tus claves.',
])

/** Etiquetas de las guías propias que una tarjeta puede enlazar (`UsefulApp.guides`). */
export const USEFUL_APPS_GUIDE_LABELS: Readonly<Record<string, string>> = Object.freeze({
  '/factura-de-ute-uruguay': 'Cómo leer la factura de UTE',
  '/factura-de-ose-uruguay': 'Cómo leer la factura de OSE',
  '/que-pasa-si-no-pago-antel': 'Qué pasa si no pagás Antel',
  '/certificados-bps-uruguay': 'Certificados del BPS',
  '/fecha-de-cobro-bps-uruguay': 'Fechas de cobro del BPS',
  '/cuando-me-puedo-jubilar-uruguay': 'Cuándo te podés jubilar',
  '/suplemento-solidario-bps': 'Suplemento solidario del BPS',
  '/certificado-unico-dgi-uruguay': 'Certificado único de la DGI',
  '/declaracion-de-irpf-uruguay': 'Declaración de IRPF',
  '/devolucion-fonasa-uruguay': 'Devolución del FONASA',
  '/cuanto-sale-la-cedula-de-identidad-uruguaya': 'Cuánto sale la cédula',
  '/cuanto-sale-el-pasaporte-uruguayo': 'Cuánto sale el pasaporte',
  '/libreta-de-conducir-uruguay': 'Libreta de conducir',
  '/carne-de-salud-uruguay': 'Carné de salud',
  '/cambiar-de-mutualista-uruguay': 'Cambiar de mutualista',
  '/tickets-mutualistas-uruguay': 'Órdenes y tickets de las mutualistas',
  '/multas-de-transito-y-patente-uruguay': 'Multas de tránsito y patente',
  '/peajes-uruguay': 'Peajes: cuánto sale cada uno',
  '/precio-de-la-nafta-uruguay': 'Precio de la nafta',
  '/conviene-auto-moto-o-omnibus-uruguay': '¿Auto, moto u ómnibus?',
  '/mejores-bancos-uruguay': 'Los bancos, comparados',
  '/tarjetas-de-credito-uruguay': 'Tarjetas de crédito',
  '/tarjetas-de-debito-uruguay': 'Tarjetas de débito',
  '/descuentos-con-tarjeta-uruguay': 'Descuentos con tarjeta',
  '/descuento-de-iva-con-tarjeta-uruguay': 'Descuento de IVA con tarjeta',
  '/pagar-cuentas-con-tarjeta': 'Pagar cuentas con tarjeta',
  '/comisiones-mercado-pago-uruguay': 'Comisiones de Mercado Pago',
  '/cuenta-remunerada-uruguay': 'Cuentas que pagan interés',
  '/couriers-uruguay': 'Couriers: cuánto cobra cada uno',
  '/franquicia-aduana-uruguay': 'La franquicia de compras en el exterior',
  '/precios-de-supermercado-uruguay': 'Precios de supermercado',
  '/apps-economia-uruguay': 'Todas las apps de plata',
  '/apps-de-beneficios-uruguay': 'Apps y clubes de beneficios',
  '/estafas-uruguay': 'Estafas en Uruguay',
  '/clonacion-de-tarjetas-uruguay': 'Clonación de tarjetas',
  '/a-quien-le-reclamo-uruguay': 'A quién le reclamo',
  '/facturar-en-monotributo-uruguay': 'Facturar en monotributo',
})

export const USEFUL_APPS_FAQ: readonly FaqItem[] = Object.freeze([
  {
    id: 'apps-del-estado-que-tener',
    question: '¿Qué apps del Estado conviene tener en el celular?',
    answer:
      'Para casi todos: gub.uy (avisos antes de que venzan la cédula, el pasaporte y la libreta, y la historia clínica digital), BPS Personas (historia laboral, recibos y certificados), una identidad digital —TuID de Antel o Identidad Digital Abitab—, Emergencia 9-1-1 y UTE Clientes. Según tu caso suman la DGI, SUCIVE, Telepeaje, Cómo ir, GURÍ Familia, Mi Antel y la del BROU.',
  },
  {
    id: 'app-oficial-omnibus-montevideo',
    question: '¿Cuál es la app oficial del ómnibus en Montevideo?',
    answer:
      'Cómo ir, de la Intendencia de Montevideo: arma el viaje y muestra cuánto falta para que pase el ómnibus. La app «STM Montevideo», la más descargada, la hace un desarrollador independiente con los datos públicos del STM: sirve, pero no es de la Intendencia. La recarga oficial de la tarjeta STM es STM en línea, en la web de la Intendencia.',
  },
  {
    id: 'id-uruguay-app',
    question: '¿Hay una app de ID Uruguay?',
    answer:
      'No como app aparte: ID Uruguay es tu usuario de gub.uy y se gestiona en la web mi.iduruguay.gub.uy. En el celular lo usás con la app gub.uy. Para los trámites que piden más seguridad —la DGI o la historia clínica— hace falta una identidad digital: TuID de Antel o Identidad Digital Abitab.',
  },
  {
    id: 'como-saber-si-es-oficial',
    question: '¿Cómo sé si una app es la oficial?',
    answer:
      'Mirá quién la publica en la ficha de la tienda: en cada tarjeta ponemos el desarrollador tal cual figura en Google Play y en el App Store. A veces no es el nombre del organismo sino el de su área de sistemas: la Intendencia de Montevideo figura como «Montevideo DTI» en el App Store. Bajala desde el botón de la tarjeta, nunca desde un enlace que te llegó por mensaje.',
    link: { label: 'Estafas en Uruguay', to: '/estafas-uruguay' },
  },
  {
    id: 'apps-del-estado-son-gratis',
    question: '¿Las apps del Estado son gratis?',
    answer:
      'Sí: todas las apps de este directorio se bajan gratis, las del Estado y las privadas. Algunas sirven para pagar cosas —la factura de la luz, la patente, un pasaje—, pero instalarlas no cuesta nada.',
  },
  {
    id: 'ose-app',
    question: '¿OSE tiene app?',
    // Completado con la verificación del agente `verify:sin-app` (canales vistos en ose.com.uy).
    answer:
      'No. OSE no tiene app propia, y las que se llaman «OSE» en las tiendas no son de OSE. …',
  },
  {
    id: 'actualizacion',
    question: '¿Cada cuánto se revisa este directorio?',
    answer:
      'La lista la revisamos a mano, ficha por ficha, y la fecha de la última revisión está en «Cómo elegimos». La nota, la cantidad de opiniones y la fecha de la última versión de cada app las leemos de Google Play y del App Store una vez por semana.',
  },
])
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run tests/unit/usefulAppsContent.test.ts tests/unit/internalLinks.test.ts`
Expected: PASS (el test de enlaces internos lee `to: '/estafas-uruguay'` de la FAQ).

- [ ] **Step 5: Commit**

```bash
git add app/utils/usefulAppsContent.ts app/tests/unit/usefulAppsContent.test.ts
git commit -m "feat(apps-utiles): kit de imprescindibles, lo que no es una app y FAQ"
```

---

### Task 5: Modelo de lectura y ruta `GET /api/useful-apps/stores`

**Files:**
- Create: `app/server/models/UsefulAppsSnapshot.ts`
- Create: `app/server/api/useful-apps/stores.get.ts`

**Interfaces:**
- Consumes: `UsefulAppsSnapshotDoc`, `UsefulAppsStoresPayload`, `usefulAppsCompactStores` (Task 2);
  `connectDb` de `app/server/utils/db.ts`.
- Produces: `GET /api/useful-apps/stores` → `UsefulAppsStoresPayload | null`, cacheable
  (`public, max-age=1800, s-maxage=3600, stale-while-revalidate=86400`). La Task 14 escribe el
  mismo documento `{ key: 'uy' }` en la colección `usefulappssnapshots`.

- [ ] **Step 1: Write the model** — `app/server/models/UsefulAppsSnapshot.ts` (los campos van
  indentados con 4 espacios y el bloque cierra con `\n  },`: así lo lee
  `tests/appdb/schema_parity.test.ts`)

```ts
// Reads `usefulappssnapshots` — the single `key:"uy"` document the backend job
// `currency-useful-apps` upserts every week (classes/models/UsefulAppsSnapshot.ts is the writer,
// on the SAME app database). The app never writes here.
import mongoose, { Schema, type Model } from 'mongoose'
import type { UsefulAppsSnapshotDoc } from '../../utils/usefulAppsStores'

const UsefulAppsSnapshotSchema = new Schema(
  {
    key: { type: String, required: true, unique: true },
    capturedAt: { type: Date, required: true },
    apps: { type: Schema.Types.Mixed, default: {} },
    counts: { type: Schema.Types.Mixed, default: {} },
    developerChanges: { type: [Schema.Types.Mixed], default: [] },
  },
  { timestamps: true }
)

export const UsefulAppsSnapshotModel: Model<UsefulAppsSnapshotDoc> =
  (mongoose.models.UsefulAppsSnapshot as Model<UsefulAppsSnapshotDoc>) ||
  mongoose.model<UsefulAppsSnapshotDoc>(
    'UsefulAppsSnapshot',
    UsefulAppsSnapshotSchema,
    'usefulappssnapshots'
  )
```

- [ ] **Step 2: Write the route** — `app/server/api/useful-apps/stores.get.ts`

```ts
// What the weekly job `currency-useful-apps` read from the Google Play and App Store listings of
// the apps in /apps-utiles-uruguay: icon, rating, last version, availability in Uruguay.
//
// Public and unauthenticated: every field comes from a public store listing. Compacted to what
// the page shows (usefulAppsCompactStores), so the SSR payload carries no descriptions and no
// developer-change audit. A missing document returns null and the page renders without icons and
// ratings — a 500 would turn "the job has not run yet" into a broken page.
import { UsefulAppsSnapshotModel } from '../../models/UsefulAppsSnapshot'
import { connectDb } from '../../utils/db'
import { usefulAppsCompactStores } from '../../../utils/usefulAppsStores'

export default defineEventHandler(async event => {
  setResponseHeader(
    event,
    'cache-control',
    'public, max-age=1800, s-maxage=3600, stale-while-revalidate=86400'
  )

  try {
    await connectDb()
    const doc = await UsefulAppsSnapshotModel.findOne({ key: 'uy' })
      .select({ _id: 0, __v: 0, createdAt: 0, updatedAt: 0, developerChanges: 0, counts: 0 })
      .lean()
    return usefulAppsCompactStores(doc, new Date().toISOString().slice(0, 10))
  } catch {
    return null
  }
})
```

- [ ] **Step 3: Verify**

Run (desde `app/`): `npx eslint server/models/UsefulAppsSnapshot.ts server/api/useful-apps/stores.get.ts && npx vitest run tests/unit/siteRevenuePrivacy.test.ts`
Expected: sin errores; PASS.

- [ ] **Step 4: Commit**

```bash
git add app/server/models/UsefulAppsSnapshot.ts app/server/api/useful-apps/stores.get.ts
git commit -m "feat(apps-utiles): ruta de los datos de las tiendas, null sin documento"
```

---

### Task 6: La tarjeta (`usefulAppsView.ts` + `UsefulAppsIcon.vue` + `UsefulAppsCard.vue`)

La suite del app no monta componentes (vitest en `node`, sin `@vue/test-utils`): todo lo que la
tarjeta decide —botones, orden, avisos, líneas de tienda— vive en una función pura testeada, y el
componente sólo la dibuja.

**Files:**
- Create: `app/utils/usefulAppsView.ts`
- Test: `app/tests/unit/usefulAppsView.test.ts`
- Create: `app/components/usefulApps/UsefulAppsIcon.vue`
- Create: `app/components/usefulApps/UsefulAppsCard.vue`

**Interfaces:**
- Consumes: Task 1, Task 2, `USEFUL_APPS_GUIDE_LABELS` y `UsefulAppsKitItem` (Task 4).
- Produces: `UsefulAppButton`, `UsefulAppCardView`, `UsefulAppCardInput`,
  `usefulAppStoreButtons(app, facts, platform)`, `usefulAppCardView(app, input)`,
  `UsefulAppsTabLink`, `usefulAppsTabLinks(basePath, state, counts)`, `UsefulAppsKitRow`,
  `UsefulAppsKitView`, `usefulAppsKitView(items, appsById, checked)`; componentes
  `<UsefulAppsIcon :name :src :size>` y
  `<UsefulAppsCard :app :facts :platform :today :alternative :heading-level>`.

- [ ] **Step 1: Write the failing test** — `app/tests/unit/usefulAppsView.test.ts`

```ts
import { describe, expect, it } from 'vitest'
import { USEFUL_APPS_DEFAULT_STATE, type UsefulApp } from '../../utils/usefulApps'
import type { UsefulAppsKitItem } from '../../utils/usefulAppsContent'
import type { UsefulAppsStoreFacts } from '../../utils/usefulAppsStores'
import {
  usefulAppCardView,
  usefulAppStoreButtons,
  usefulAppsKitView,
  usefulAppsTabLinks,
} from '../../utils/usefulAppsView'

const facts = (over: Partial<UsefulAppsStoreFacts>): UsefulAppsStoreFacts => ({
  status: 'ok',
  checkedAt: '2026-09-30',
  updated: null,
  rating: null,
  ratingCount: null,
  installs: null,
  icon: null,
  ...over,
})

const COMO_IR: UsefulApp = {
  id: 'como-ir',
  name: 'Cómo ir',
  organization: 'Intendencia de Montevideo',
  kind: 'intendencia',
  category: 'transporte',
  summary: 'Planificá tu viaje en ómnibus por Montevideo.',
  uses: ['Mirá cuánto falta para que pase el ómnibus', 'Compará cómo llegar'],
  departments: ['Montevideo'],
  android: { id: 'uy.gub.imm.stm.mobile.comoir', developer: 'Intendencia de Montevideo' },
  ios: { id: '933271921', developer: 'Montevideo DTI' },
  source: 'https://montevideo.gub.uy/',
  guides: ['/conviene-auto-moto-o-omnibus-uruguay', '/no-existe'],
}
const STM: UsefulApp = {
  ...COMO_IR,
  id: 'stm-montevideo',
  name: 'STM Montevideo',
  organization: 'Desarrollador independiente',
  kind: 'comunidad',
  note: 'No es de la Intendencia: la hace un desarrollador independiente con los datos del STM.',
  officialAlternative: 'como-ir',
  guides: [],
}
const LABELS = { '/conviene-auto-moto-o-omnibus-uruguay': '¿Auto, moto u ómnibus?' }
const base = { today: '2026-09-30', guideLabels: LABELS }

describe('usefulAppStoreButtons', () => {
  it('Google Play primero, y el App Store primero en un iPhone', () => {
    expect(usefulAppStoreButtons(COMO_IR, null, null).buttons.map(b => b.store)).toEqual([
      'android',
      'ios',
    ])
    const ios = usefulAppStoreButtons(COMO_IR, null, 'ios').buttons
    expect(ios.map(b => b.store)).toEqual(['ios', 'android'])
    expect(ios.map(b => b.primary)).toEqual([true, false])
  })

  it('una ficha que no está en la tienda de Uruguay pierde el botón y lo dice con la fecha', () => {
    const out = usefulAppStoreButtons(
      COMO_IR,
      { android: facts({ status: 'missing', checkedAt: '2026-09-20' }) },
      null
    )
    expect(out.buttons.map(b => b.store)).toEqual(['ios'])
    expect(out.unavailable).toEqual([
      'No está en Google Play de Uruguay (revisado el 20 de setiembre de 2026).',
    ])
  })

  it('los enlaces van a la ficha oficial con una etiqueta accesible', () => {
    const [play] = usefulAppStoreButtons(COMO_IR, null, null).buttons
    expect(play!.href).toBe('https://play.google.com/store/apps/details?id=uy.gub.imm.stm.mobile.comoir')
    expect(play!.ariaLabel).toBe('Cómo ir en Google Play')
  })
})

describe('usefulAppCardView', () => {
  it('arma la línea de la tienda con la versión más nueva y la nota de la tienda preferida', () => {
    const view = usefulAppCardView(COMO_IR, {
      ...base,
      facts: {
        android: facts({ updated: '2025-03-26', rating: 2.8, ratingCount: 3065 }),
        ios: facts({ updated: '2025-03-26', rating: 2.2, ratingCount: 318 }),
      },
    })
    expect(view.storeLine).toBe(
      'Última versión: marzo de 2025 · 2,8 ★ en Google Play (3.065 opiniones)'
    )
    const onIphone = usefulAppCardView(COMO_IR, {
      ...base,
      platform: 'ios',
      facts: { ios: facts({ rating: 2.2, ratingCount: 1 }) },
    })
    expect(onIphone.storeLine).toBe('2,2 ★ en App Store (1 opinión)')
  })

  it('muestra los dos desarrolladores cuando cada tienda dice otro', () => {
    expect(usefulAppCardView(COMO_IR, base).developerLine).toBe(
      'En la tienda figura como «Intendencia de Montevideo» (Google Play) y «Montevideo DTI» (App Store).'
    )
  })

  it('avisa si no tiene versiones nuevas hace dos años', () => {
    const view = usefulAppCardView(COMO_IR, {
      ...base,
      facts: { android: facts({ updated: '2023-11-03' }) },
    })
    expect(view.warning).toBe(
      'Sin versiones nuevas desde noviembre de 2023: puede no andar bien en celulares nuevos.'
    )
  })

  it('una no oficial avisa con su nota y apunta a la oficial', () => {
    const view = usefulAppCardView(STM, { ...base, alternative: COMO_IR })
    expect(view.kindTone).toBe('comunidad')
    expect(view.kindLabel).toBe('No oficial')
    expect(view.warning).toBe(STM.note)
    expect(view.note).toBeNull()
    expect(view.alternative).toEqual({ id: 'como-ir', name: 'Cómo ir' })
  })

  it('metadatos, guías con etiqueta y sin datos de tienda no inventa nada', () => {
    const view = usefulAppCardView(COMO_IR, base)
    expect(view.meta).toEqual([{ icon: 'mdi-map-marker-outline', text: 'Sólo Montevideo' }])
    expect(view.guides).toEqual([
      { to: '/conviene-auto-moto-o-omnibus-uruguay', label: '¿Auto, moto u ómnibus?' },
    ])
    expect(view.storeLine).toBeNull()
    expect(view.iconSrc).toBeNull()
    expect(view.kindTone).toBe('publica')
  })
})

describe('usefulAppsTabLinks', () => {
  it('Todas e Imprescindibles primero, después las diez categorías, con su enlace', () => {
    const counts = {
      todas: 118, imprescindibles: 14, tramites: 9, salud: 26, transporte: 18, dinero: 20,
      hogar: 11, emergencias: 4, ciudad: 6, educacion: 8, compras: 16, ocio: 6,
    }
    const tabs = usefulAppsTabLinks('/apps-utiles-uruguay', USEFUL_APPS_DEFAULT_STATE, counts)
    expect(tabs.map(t => t.id).slice(0, 3)).toEqual(['todas', 'imprescindibles', 'tramites'])
    expect(tabs).toHaveLength(12)
    expect(tabs[2]!.href).toBe('/apps-utiles-uruguay?categoria=tramites')
    expect(tabs[0]!.href).toBe('/apps-utiles-uruguay')
    expect(tabs[3]!.count).toBe(26)
  })
})

describe('usefulAppsKitView', () => {
  const items: UsefulAppsKitItem[] = [
    { id: 'omnibus', group: 'todos', title: 'El ómnibus', why: 'x.', appIds: ['como-ir'] },
    { id: 'fantasma', group: 'todos', title: 'Nada', why: 'x.', appIds: ['no-existe'] },
    { id: 'otro', group: 'caso', when: 'Si x', title: 'Otro', why: 'x.', appIds: ['stm-montevideo'] },
  ]
  const byId = new Map([COMO_IR, STM].map(a => [a.id, a]))

  it('cuenta sólo "para todos" y descarta ítems sin apps', () => {
    const view = usefulAppsKitView(items, byId, ['omnibus', 'otro'])
    expect(view.todos.map(r => r.item.id)).toEqual(['omnibus'])
    expect(view.caso.map(r => r.item.id)).toEqual(['otro'])
    expect(view.done).toBe(1)
    expect(view.total).toBe(1)
    expect(view.caso[0]!.checked).toBe(false)
  })
})
```

- [ ] **Step 2: Run to verify it fails** — `npx vitest run tests/unit/usefulAppsView.test.ts` → FAIL.

- [ ] **Step 3: Write `app/utils/usefulAppsView.ts`**

```ts
// app/utils/usefulAppsView.ts
// Lo que dibujan la tarjeta, las pestañas y el kit de /apps-utiles-uruguay, calculado fuera de los
// componentes para testearlo sin montar Vue (la suite del app es de lógica pura). MÓDULO PURO.
import {
  USEFUL_APP_CATEGORIES,
  USEFUL_APP_KIND_LABELS,
  type UsefulApp,
  type UsefulAppsPlatform,
  type UsefulAppsState,
  type UsefulAppsTab,
  usefulAppAppStoreUrl,
  usefulAppIsPublic,
  usefulAppPlayUrl,
  usefulAppsHrefForTab,
} from './usefulApps'
import type { UsefulAppsKitItem } from './usefulAppsContent'
import {
  type UsefulAppsAppFacts,
  usefulAppsCount,
  usefulAppsIconFor,
  usefulAppsIsStale,
  usefulAppsLatestUpdate,
  usefulAppsLongDate,
  usefulAppsMonthYear,
  usefulAppsRating,
} from './usefulAppsStores'

export type UsefulAppStore = 'android' | 'ios' | 'web'

export interface UsefulAppButton {
  store: UsefulAppStore
  label: string
  icon: string
  href: string
  /** El de la tienda del propio celular va relleno. Sólo se sabe después de montar. */
  primary: boolean
  ariaLabel: string
}

const STORE_NAME = { android: 'Google Play', ios: 'App Store' } as const

export function usefulAppStoreButtons(
  app: UsefulApp,
  facts: UsefulAppsAppFacts | null | undefined,
  platform: UsefulAppsPlatform | null | undefined
): { buttons: UsefulAppButton[]; unavailable: string[] } {
  const buttons: UsefulAppButton[] = []
  const unavailable: string[] = []
  for (const store of ['android', 'ios'] as const) {
    const ref = app[store]
    if (!ref) continue
    const read = facts?.[store]
    if (read?.status === 'missing') {
      unavailable.push(
        `No está en ${STORE_NAME[store]} de Uruguay (revisado el ${usefulAppsLongDate(read.checkedAt)}).`
      )
      continue
    }
    buttons.push({
      store,
      label: STORE_NAME[store],
      icon: store === 'android' ? 'mdi-google-play' : 'mdi-apple',
      href: store === 'android' ? usefulAppPlayUrl(ref.id) : usefulAppAppStoreUrl(ref.id),
      primary: platform === store,
      ariaLabel: `${app.name} en ${STORE_NAME[store]}`,
    })
  }
  if (platform === 'ios') buttons.sort((a, b) => Number(b.store === 'ios') - Number(a.store === 'ios'))
  if (app.web) {
    buttons.push({
      store: 'web',
      label: 'Web',
      icon: 'mdi-open-in-new',
      href: app.web,
      primary: false,
      ariaLabel: `${app.name}: versión web`,
    })
  }
  return { buttons, unavailable }
}

export interface UsefulAppCardView {
  iconSrc: string | null
  kindLabel: string
  kindTone: 'publica' | 'privada' | 'comunidad'
  kindIcon: string
  meta: { icon: string; text: string }[]
  storeLine: string | null
  developerLine: string | null
  /** Advertencia visible: no oficial, o sin versiones nuevas hace dos años. */
  warning: string | null
  /** Nota neutra de las oficiales (sólo Android, reemplazó a otra…). */
  note: string | null
  alternative: { id: string; name: string } | null
  buttons: UsefulAppButton[]
  unavailable: string[]
  guides: { to: string; label: string }[]
}

export interface UsefulAppCardInput {
  facts?: UsefulAppsAppFacts | null
  platform?: UsefulAppsPlatform | null
  /** Día de referencia para "hace cuánto": la captura de las tiendas o la verificación. */
  today: string
  alternative?: UsefulApp | null
  guideLabels: Readonly<Record<string, string>>
}

export function usefulAppCardView(app: UsefulApp, input: UsefulAppCardInput): UsefulAppCardView {
  const facts = input.facts ?? null
  const kindTone =
    app.kind === 'comunidad' ? 'comunidad' : usefulAppIsPublic(app) ? 'publica' : 'privada'
  const kindIcon =
    kindTone === 'publica'
      ? 'mdi-check-decagram-outline'
      : kindTone === 'comunidad'
        ? 'mdi-account-alert-outline'
        : 'mdi-domain'

  const meta: { icon: string; text: string }[] = []
  if (app.departments?.length) {
    meta.push({
      icon: 'mdi-map-marker-outline',
      text:
        app.departments.length === 1 ? `Sólo ${app.departments[0]}` : app.departments.join(', '),
    })
  }
  for (const need of app.needs ?? []) meta.push({ icon: 'mdi-account-check-outline', text: need })

  const latest = usefulAppsLatestUpdate(facts)
  const preferred: UsefulAppsPlatform = input.platform ?? (app.android ? 'android' : 'ios')
  const order: UsefulAppsPlatform[] =
    preferred === 'android' ? ['android', 'ios'] : ['ios', 'android']
  const rated = order
    .map(store => ({ store, read: facts?.[store] }))
    .find(({ read }) => read?.status === 'ok' && read.rating !== null && Boolean(read.ratingCount))
  const parts: string[] = []
  if (latest) parts.push(`Última versión: ${usefulAppsMonthYear(latest)}`)
  if (rated?.read && rated.read.rating !== null && rated.read.ratingCount) {
    const n = rated.read.ratingCount
    parts.push(
      `${usefulAppsRating(rated.read.rating)} ★ en ${STORE_NAME[rated.store]} (${usefulAppsCount(n)} ${n === 1 ? 'opinión' : 'opiniones'})`
    )
  }

  const android = app.android?.developer
  const ios = app.ios?.developer
  const developerLine =
    android && ios && android !== ios
      ? `En la tienda figura como «${android}» (Google Play) y «${ios}» (App Store).`
      : android || ios
        ? `En la tienda figura como «${android ?? ios}».`
        : null

  const stale = usefulAppsIsStale(latest, input.today)
  const warning =
    kindTone === 'comunidad'
      ? (app.note ?? null)
      : stale && latest
        ? `Sin versiones nuevas desde ${usefulAppsMonthYear(latest)}: puede no andar bien en celulares nuevos.`
        : null

  const { buttons, unavailable } = usefulAppStoreButtons(app, facts, input.platform)

  return {
    iconSrc: usefulAppsIconFor(facts),
    kindLabel: USEFUL_APP_KIND_LABELS[app.kind],
    kindTone,
    kindIcon,
    meta,
    storeLine: parts.length ? parts.join(' · ') : null,
    developerLine,
    warning,
    note: kindTone === 'comunidad' ? null : (app.note ?? null),
    alternative: input.alternative
      ? { id: input.alternative.id, name: input.alternative.name }
      : null,
    buttons,
    unavailable,
    guides: (app.guides ?? [])
      .filter(to => Boolean(input.guideLabels[to]))
      .map(to => ({ to, label: input.guideLabels[to]! })),
  }
}

export interface UsefulAppsTabLink {
  id: UsefulAppsTab
  label: string
  icon: string
  count: number
  href: string
}

export function usefulAppsTabLinks(
  basePath: string,
  state: UsefulAppsState,
  counts: Record<UsefulAppsTab, number>
): UsefulAppsTabLink[] {
  const tabs: { id: UsefulAppsTab; label: string; icon: string }[] = [
    { id: 'todas', label: 'Todas', icon: 'mdi-view-grid-outline' },
    { id: 'imprescindibles', label: 'Imprescindibles', icon: 'mdi-star-outline' },
    ...USEFUL_APP_CATEGORIES.map(c => ({ id: c.id, label: c.label, icon: c.icon })),
  ]
  return tabs.map(tab => ({
    ...tab,
    count: counts[tab.id] ?? 0,
    href: usefulAppsHrefForTab(basePath, state, tab.id),
  }))
}

export interface UsefulAppsKitRow {
  item: UsefulAppsKitItem
  apps: UsefulApp[]
  /** Sólo los ítems "para todos" llevan casilla. */
  checked: boolean
}

export interface UsefulAppsKitView {
  todos: UsefulAppsKitRow[]
  caso: UsefulAppsKitRow[]
  done: number
  total: number
}

export function usefulAppsKitView(
  items: readonly UsefulAppsKitItem[],
  appsById: ReadonlyMap<string, UsefulApp>,
  checked: readonly string[]
): UsefulAppsKitView {
  const rows = items
    .map(item => ({
      item,
      apps: item.appIds
        .map(id => appsById.get(id))
        .filter((app): app is UsefulApp => Boolean(app)),
      checked: item.group === 'todos' && checked.includes(item.id),
    }))
    .filter(row => row.apps.length > 0)
  const todos = rows.filter(row => row.item.group === 'todos')
  return {
    todos,
    caso: rows.filter(row => row.item.group === 'caso'),
    done: todos.filter(row => row.checked).length,
    total: todos.length,
  }
}
```

- [ ] **Step 4: Run to verify it passes** — `npx vitest run tests/unit/usefulAppsView.test.ts` → PASS.

- [ ] **Step 5: Write `app/components/usefulApps/UsefulAppsIcon.vue`**

```vue
<template>
  <span class="ua-icon" :style="{ width: `${size}px`, height: `${size}px` }">
    <img
      v-if="src && !failed"
      ref="image"
      :src="src"
      alt=""
      :width="size"
      :height="size"
      loading="lazy"
      decoding="async"
      referrerpolicy="no-referrer"
      @error="failed = true"
    />
    <span v-else class="ua-icon__mono" aria-hidden="true">{{ initials }}</span>
  </span>
</template>

<script setup lang="ts">
// El ícono sale de la CDN de la tienda (lo trae el job semanal). Es decorativo: el nombre de la
// app está al lado, así que alt vacío. Si la imagen no carga —el desarrollador cambió el ícono y la
// URL vieja murió— queda un monograma. Un error ANTES de hidratar no dispara @error (el listener
// todavía no existe), por eso onMounted mira si la imagen quedó rota.
import { usefulAppInitials } from '~/utils/usefulApps'

const props = withDefaults(defineProps<{ name: string; src?: string | null; size?: number }>(), {
  src: null,
  size: 48,
})

const failed = ref(false)
const image = ref<HTMLImageElement | null>(null)
const initials = computed(() => usefulAppInitials(props.name))

watch(
  () => props.src,
  () => {
    failed.value = false
  }
)

onMounted(() => {
  const el = image.value
  if (el && el.complete && el.naturalWidth === 0) failed.value = true
})
</script>

<style scoped>
.ua-icon {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border: 1px solid rgba(var(--v-border-color), 0.12);
  border-radius: 12px;
  background: rgb(var(--v-theme-surface));
}
.ua-icon img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.ua-icon__mono {
  display: inline-flex;
  width: 100%;
  height: 100%;
  align-items: center;
  justify-content: center;
  background: rgba(var(--v-theme-primary), 0.12);
  color: rgb(var(--v-theme-on-surface));
  font-size: 0.875rem;
  font-weight: 700;
  letter-spacing: 0.02em;
}
</style>
```

- [ ] **Step 6: Write `app/components/usefulApps/UsefulAppsCard.vue`**

```vue
<template>
  <SurfaceCard :id="app.id" stretch class="ua-card">
    <div class="ua-card__head">
      <UsefulAppsIcon :name="app.name" :src="view.iconSrc" :size="48" />
      <div class="ua-card__title">
        <component :is="headingLevel" class="ua-card__name">{{ app.name }}</component>
        <div class="ua-card__org">
          <span class="ua-card__org-name">{{ app.organization }}</span>
          <span class="ua-kind" :class="`ua-kind--${view.kindTone}`">
            <VIcon size="14" aria-hidden="true">{{ view.kindIcon }}</VIcon>
            {{ view.kindLabel }}
          </span>
        </div>
      </div>
    </div>

    <p class="ua-card__summary">{{ app.summary }}</p>
    <ul class="ua-card__uses">
      <li v-for="use in app.uses" :key="use">{{ use }}</li>
    </ul>

    <div v-if="view.meta.length" class="ua-card__meta">
      <span v-for="item in view.meta" :key="item.text" class="ua-meta">
        <VIcon size="14" aria-hidden="true">{{ item.icon }}</VIcon>
        {{ item.text }}
      </span>
    </div>

    <p v-if="view.warning" class="ua-card__warning">
      <VIcon size="16" aria-hidden="true">mdi-alert-outline</VIcon>
      <span>
        {{ view.warning }}
        <template v-if="view.alternative">
          La oficial es <a :href="`#${view.alternative.id}`">{{ view.alternative.name }}</a>.
        </template>
      </span>
    </p>
    <p v-if="view.note" class="ua-card__note">{{ view.note }}</p>
    <p v-for="line in view.unavailable" :key="line" class="ua-card__note">{{ line }}</p>

    <p v-if="view.storeLine" class="ua-card__store">{{ view.storeLine }}</p>
    <p v-if="view.developerLine" class="ua-card__dev">{{ view.developerLine }}</p>

    <template #footer>
      <div class="ua-card__actions">
        <VBtn
          v-for="button in view.buttons"
          :key="button.store"
          :href="button.href"
          target="_blank"
          rel="noopener noreferrer nofollow"
          color="primary"
          :variant="button.primary ? 'flat' : button.store === 'web' ? 'text' : 'tonal'"
          :prepend-icon="button.icon"
          :aria-label="button.ariaLabel"
        >
          {{ button.label }}
        </VBtn>
      </div>
      <p v-if="view.guides.length" class="ua-card__guides">
        <span>Te sirve:</span>
        <NuxtLink v-for="guide in view.guides" :key="guide.to" :to="localePath(guide.to)">
          {{ guide.label }}
        </NuxtLink>
      </p>
    </template>
  </SurfaceCard>
</template>

<script setup lang="ts">
import type { UsefulApp, UsefulAppsPlatform } from '~/utils/usefulApps'
import { USEFUL_APPS_GUIDE_LABELS } from '~/utils/usefulAppsContent'
import type { UsefulAppsAppFacts } from '~/utils/usefulAppsStores'
import { usefulAppCardView } from '~/utils/usefulAppsView'

const props = withDefaults(
  defineProps<{
    app: UsefulApp
    facts?: UsefulAppsAppFacts | null
    platform?: UsefulAppsPlatform | null
    today: string
    alternative?: UsefulApp | null
    headingLevel?: 'h3' | 'h4'
  }>(),
  { facts: null, platform: null, alternative: null, headingLevel: 'h3' }
)

const localePath = useLocalePath()

const view = computed(() =>
  usefulAppCardView(props.app, {
    facts: props.facts,
    platform: props.platform,
    today: props.today,
    alternative: props.alternative,
    guideLabels: USEFUL_APPS_GUIDE_LABELS,
  })
)
</script>

<style scoped>
.ua-card {
  scroll-margin-top: 84px;
  min-width: 0;
}
.ua-card__head {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}
.ua-card__title {
  min-width: 0;
}
.ua-card__name {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 700;
  line-height: 1.3;
}
.ua-card__org {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 8px;
  align-items: center;
  margin-top: 4px;
  font-size: 0.875rem;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}
.ua-card__org-name {
  min-width: 0;
}
.ua-kind {
  display: inline-flex;
  gap: 4px;
  align-items: center;
  padding: 0 8px;
  border: 1px solid rgba(var(--v-border-color), 0.2);
  border-radius: 999px;
  color: rgb(var(--v-theme-on-surface));
  font-size: 0.75rem;
  font-weight: 700;
  line-height: 1.6;
}
.ua-kind--publica {
  background: rgba(var(--v-theme-info), 0.12);
}
.ua-kind--publica .v-icon {
  color: rgb(var(--v-theme-info));
}
.ua-kind--comunidad {
  background: rgba(var(--v-theme-warning), 0.16);
}
.ua-kind--comunidad .v-icon {
  color: rgb(var(--v-theme-warning));
}
.ua-kind--privada {
  background: rgba(var(--v-theme-on-surface), 0.06);
}
.ua-card__summary {
  margin-top: 12px;
  font-size: 0.95rem;
  line-height: 1.5;
}
.ua-card__uses {
  margin-top: 8px;
  padding-left: 20px;
  font-size: 0.875rem;
  line-height: 1.5;
}
.ua-card__uses li + li {
  margin-top: 4px;
}
.ua-card__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}
.ua-meta {
  display: inline-flex;
  gap: 4px;
  align-items: center;
  font-size: 0.8rem;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}
.ua-card__warning {
  display: flex;
  gap: 8px;
  align-items: flex-start;
  margin-top: 12px;
  padding: 8px 12px;
  border-radius: 8px;
  background: rgba(var(--v-theme-warning), 0.14);
  font-size: 0.875rem;
  line-height: 1.45;
}
.ua-card__warning a {
  color: rgb(var(--v-theme-link));
  font-weight: 600;
}
.ua-card__note,
.ua-card__store,
.ua-card__dev {
  margin-top: 8px;
  font-size: 0.8rem;
  line-height: 1.45;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}
.ua-card__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 16px;
}
.ua-card__actions .v-btn {
  min-height: 44px;
}
.ua-card__guides {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 12px;
  margin-top: 12px;
  font-size: 0.8rem;
}
.ua-card__guides a {
  color: rgb(var(--v-theme-link));
}
</style>
```

- [ ] **Step 7: Run the component tripwires**

Run: `npx vitest run tests/unit/usefulAppsView.test.ts tests/unit/componentResolution.test.ts tests/unit/noChipInsideParagraph.test.ts tests/unit/vuetifyComposableImports.test.ts && npx eslint utils/usefulAppsView.ts components/usefulApps`
Expected: PASS, sin errores de lint.

- [ ] **Step 8: Commit**

```bash
git add app/utils/usefulAppsView.ts app/tests/unit/usefulAppsView.test.ts app/components/usefulApps/UsefulAppsIcon.vue app/components/usefulApps/UsefulAppsCard.vue
git commit -m "feat(apps-utiles): tarjeta con la ficha oficial, el desarrollador y la frescura"
```

---

### Task 7: Pestañas, filtros y kit guardado (`UsefulAppsCategoryNav.vue`, `UsefulAppsFilters.vue`, `useUsefulAppsKit.ts`)

**Files:**
- Create: `app/components/usefulApps/UsefulAppsCategoryNav.vue`
- Create: `app/components/usefulApps/UsefulAppsFilters.vue`
- Create: `app/composables/useUsefulAppsKit.ts`

**Interfaces:**
- Consumes: `UsefulAppsTabLink` (Task 6), `UsefulAppsState`, `USEFUL_APPS_KIND_FILTERS`,
  `USEFUL_APPS_SORTS`, `UsefulAppDepartment`, `usefulAppsActiveFilterCount` (Task 1),
  `USEFUL_APPS_KIT_STORAGE`, `usefulAppsKitSanitize` (Task 4).
- Produces: `<UsefulAppsCategoryNav :tabs :current @select="(tab) => …">`;
  `<UsefulAppsFilters :state :departments @update="(patch: Partial<UsefulAppsState>) => …">`;
  `useUsefulAppsKit(): { checked: Ref<string[]>; ready: Ref<boolean>; storageFailed: Ref<boolean>; toggle(id: string): void }`.

- [ ] **Step 1: Write `app/components/usefulApps/UsefulAppsCategoryNav.vue`**

```vue
<template>
  <nav class="ua-tabs" aria-label="Categorías de apps">
    <!-- Pantalla ancha: todas las categorías a la vista, en pastillas que envuelven. -->
    <ul class="ua-tabs__list">
      <li v-for="tab in tabs" :key="tab.id">
        <a
          :href="tab.href"
          class="ua-tabs__pill"
          :class="{ 'ua-tabs__pill--current': tab.id === current }"
          :aria-current="tab.id === current ? 'true' : undefined"
          @click="onSelect($event, tab.id)"
        >
          <VIcon size="18" aria-hidden="true">{{ tab.icon }}</VIcon>
          <span>{{ tab.label }}</span>
          <span class="ua-tabs__count">{{ tab.count }}</span>
        </a>
      </li>
    </ul>

    <!-- Celular: la categoría actual y la lista entera hacia abajo, con filas de 48 px. -->
    <details ref="menu" class="ua-tabs__menu" @keydown.esc="close(true)">
      <summary class="ua-tabs__summary">
        <VIcon class="ua-tabs__summary-icon" size="22" aria-hidden="true">
          {{ currentTab.icon }}
        </VIcon>
        <span class="ua-tabs__summary-text">
          <span class="ua-tabs__overline">Categoría</span>
          <span class="ua-tabs__summary-current">
            {{ currentTab.label }} · {{ currentTab.count }}
          </span>
        </span>
        <VIcon class="ua-tabs__chevron" size="24" aria-hidden="true">mdi-chevron-down</VIcon>
      </summary>
      <ul class="ua-tabs__menu-list">
        <li v-for="tab in tabs" :key="tab.id">
          <a
            :href="tab.href"
            class="ua-tabs__row"
            :class="{ 'ua-tabs__row--current': tab.id === current }"
            :aria-current="tab.id === current ? 'true' : undefined"
            @click="onSelect($event, tab.id)"
          >
            <VIcon size="20" aria-hidden="true">{{ tab.icon }}</VIcon>
            <span class="ua-tabs__row-label">{{ tab.label }}</span>
            <span class="ua-tabs__count">{{ tab.count }}</span>
          </a>
        </li>
      </ul>
    </details>
  </nav>
</template>

<script setup lang="ts">
// Las pestañas del directorio son ENLACES (`?categoria=…`), no botones: este sitio pierde los toques
// previos a la hidratación, y un enlace que se toca antes navega a la pestaña ya filtrada por el
// servidor. Ya hidratado, el clic se resuelve en el cliente (la página reescribe la URL con
// history.replaceState). Ctrl/⌘-clic y el botón del medio siguen abriendo una pestaña nueva.
//
// Dos formas por ancho, cambiadas por CSS y no con useDisplay (el HTML del servidor es uno solo):
// ≥ 960 px una fila de pastillas que envuelve; debajo, un <details> nativo como FamiliaNav, porque
// una fila con scroll lateral en el celular muestra dos categorías y esconde ocho.
import type { UsefulAppsTab } from '~/utils/usefulApps'
import type { UsefulAppsTabLink } from '~/utils/usefulAppsView'

const props = defineProps<{ tabs: UsefulAppsTabLink[]; current: UsefulAppsTab }>()
const emit = defineEmits<{ select: [tab: UsefulAppsTab] }>()

const menu = ref<HTMLDetailsElement | null>(null)
const currentTab = computed(
  () => props.tabs.find(tab => tab.id === props.current) ?? props.tabs[0]!
)

function close(returnFocus: boolean) {
  if (!menu.value?.open) return
  menu.value.open = false
  if (returnFocus) menu.value.querySelector('summary')?.focus()
}

function onSelect(event: MouseEvent, tab: UsefulAppsTab) {
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
  event.preventDefault()
  emit('select', tab)
  close(false)
}
</script>

<style scoped>
.ua-tabs__list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.ua-tabs__pill {
  display: inline-flex;
  gap: 8px;
  align-items: center;
  min-height: 44px;
  padding: 8px 16px 8px 12px;
  border: 1px solid rgba(var(--v-border-color), 0.25);
  border-radius: 999px;
  background: rgb(var(--v-theme-surface));
  color: rgb(var(--v-theme-link));
  font-size: 0.875rem;
  font-weight: 600;
  line-height: 1.3;
  text-decoration: none;
  white-space: nowrap;
}
.ua-tabs__pill:hover {
  border-color: rgba(var(--v-theme-primary), 0.5);
}
.ua-tabs__pill--current {
  border-color: rgb(var(--v-theme-primary));
  background: rgb(var(--v-theme-primary));
  color: rgb(var(--v-theme-on-primary));
}
.ua-tabs__count {
  font-variant-numeric: tabular-nums;
  font-weight: 700;
  opacity: 0.8;
}
.ua-tabs__pill:focus-visible,
.ua-tabs__summary:focus-visible,
.ua-tabs__row:focus-visible {
  outline: 2px solid rgb(var(--v-theme-link));
  outline-offset: 2px;
}
.ua-tabs__menu {
  display: none;
  border: 1px solid rgba(var(--v-border-color), 0.25);
  border-radius: 12px;
  background: rgb(var(--v-theme-surface));
  overflow: hidden;
}
.ua-tabs__summary {
  display: flex;
  gap: 12px;
  align-items: center;
  min-height: 56px;
  padding: 8px 12px 8px 16px;
  cursor: pointer;
  list-style: none;
  user-select: none;
}
.ua-tabs__summary::-webkit-details-marker {
  display: none;
}
.ua-tabs__summary-icon {
  color: rgb(var(--v-theme-primary));
}
.ua-tabs__summary-text {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
}
.ua-tabs__overline {
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
  font-size: 0.75rem;
}
.ua-tabs__summary-current {
  overflow: hidden;
  font-size: 0.95rem;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ua-tabs__chevron {
  transition: transform 0.2s ease;
}
.ua-tabs__menu[open] .ua-tabs__chevron {
  transform: rotate(180deg);
}
.ua-tabs__menu-list {
  margin: 0;
  padding: 0;
  list-style: none;
  border-top: 1px solid rgba(var(--v-border-color), 0.15);
}
.ua-tabs__menu-list > li + li {
  border-top: 1px solid rgba(var(--v-border-color), 0.1);
}
.ua-tabs__row {
  display: flex;
  gap: 12px;
  align-items: center;
  min-height: 48px;
  padding: 8px 16px;
  color: rgb(var(--v-theme-link));
  font-size: 0.95rem;
  font-weight: 500;
  text-decoration: none;
}
.ua-tabs__row-label {
  flex: 1;
  min-width: 0;
}
.ua-tabs__row--current {
  background: rgba(var(--v-theme-primary), 0.1);
  color: rgb(var(--v-theme-on-surface));
  font-weight: 700;
}
@media (prefers-reduced-motion: reduce) {
  .ua-tabs__chevron {
    transition: none;
  }
}
@media (max-width: 959px) {
  .ua-tabs__list {
    display: none;
  }
  .ua-tabs__menu {
    display: block;
  }
}
</style>
```

- [ ] **Step 2: Write `app/components/usefulApps/UsefulAppsFilters.vue`**

```vue
<template>
  <section class="ua-filters" aria-label="Buscar y filtrar apps">
    <VTextField
      :model-value="state.q"
      label="Buscá una app o un trámite"
      placeholder="ómnibus, luz, BPS, cédula…"
      prepend-inner-icon="mdi-magnify"
      variant="outlined"
      density="comfortable"
      clearable
      hide-details
      class="ua-filters__search"
      :maxlength="USEFUL_APPS_MAX_QUERY"
      @update:model-value="onQuery"
    />

    <button
      type="button"
      class="ua-filters__toggle"
      :aria-expanded="open ? 'true' : 'false'"
      aria-controls="ua-more-filters"
      @click="open = !open"
    >
      <VIcon size="20" aria-hidden="true">mdi-tune-variant</VIcon>
      Más filtros<span v-if="moreCount"> ({{ moreCount }})</span>
      <VIcon class="ua-filters__chevron" size="20" aria-hidden="true">mdi-chevron-down</VIcon>
    </button>

    <div id="ua-more-filters" class="ua-filters__more" :class="{ 'ua-filters__more--open': open }">
      <div class="ua-filter">
        <span id="ua-filter-tipo" class="ua-filter__label">Quién la hace</span>
        <VBtnToggle
          :model-value="state.tipo"
          mandatory
          variant="outlined"
          color="primary"
          density="comfortable"
          class="cu-btn-grid"
          aria-labelledby="ua-filter-tipo"
          @update:model-value="onTipo"
        >
          <VBtn v-for="option in USEFUL_APPS_KIND_FILTERS" :key="option.id" :value="option.id">
            {{ option.label }}
          </VBtn>
        </VBtnToggle>
      </div>
      <div class="ua-filter">
        <span id="ua-filter-plataforma" class="ua-filter__label">Tu celular</span>
        <VBtnToggle
          :model-value="state.plataforma"
          mandatory
          variant="outlined"
          color="primary"
          density="comfortable"
          class="cu-btn-grid"
          aria-labelledby="ua-filter-plataforma"
          @update:model-value="onPlataforma"
        >
          <VBtn value="todas">Cualquiera</VBtn>
          <VBtn value="android" prepend-icon="mdi-android">Android</VBtn>
          <VBtn value="ios" prepend-icon="mdi-apple">iPhone</VBtn>
        </VBtnToggle>
      </div>
      <VSelect
        :model-value="state.depto || ALL_COUNTRY"
        :items="departmentItems"
        label="Dónde vivís"
        variant="outlined"
        density="comfortable"
        hide-details
        class="ua-filter__select"
        @update:model-value="onDepto"
      />
      <VSelect
        :model-value="state.orden"
        :items="sortItems"
        label="Ordenar"
        variant="outlined"
        density="comfortable"
        hide-details
        class="ua-filter__select"
        @update:model-value="onOrden"
      />
    </div>
  </section>
</template>

<script setup lang="ts">
// Los controles de Vuetify emiten al montar: cada handler compara con el estado actual y sólo
// avisa un cambio de verdad, así el eco del montaje no reescribe la URL ni resetea nada.
import {
  USEFUL_APPS_KIND_FILTERS,
  USEFUL_APPS_MAX_QUERY,
  USEFUL_APPS_SORTS,
  type UsefulAppDepartment,
  type UsefulAppsKindFilter,
  type UsefulAppsSort,
  type UsefulAppsState,
  usefulAppsActiveFilterCount,
} from '~/utils/usefulApps'

const props = defineProps<{ state: UsefulAppsState; departments: readonly UsefulAppDepartment[] }>()
const emit = defineEmits<{ update: [patch: Partial<UsefulAppsState>] }>()

const ALL_COUNTRY = 'todo-el-pais'
const open = ref(false)

const moreCount = computed(
  () => usefulAppsActiveFilterCount(props.state) - (props.state.q.trim() ? 1 : 0)
)
const departmentItems = computed(() => [
  { title: 'Todo el país', value: ALL_COUNTRY },
  ...props.departments.map(d => ({ title: d, value: d })),
])
const sortItems = USEFUL_APPS_SORTS.map(sort => ({ title: sort.label, value: sort.id }))

function onQuery(value: string | null) {
  const q = (value ?? '').slice(0, USEFUL_APPS_MAX_QUERY)
  if (q !== props.state.q) emit('update', { q })
}
function onTipo(value: unknown) {
  if (typeof value === 'string' && value !== props.state.tipo) {
    emit('update', { tipo: value as UsefulAppsKindFilter })
  }
}
function onPlataforma(value: unknown) {
  if ((value === 'todas' || value === 'android' || value === 'ios') && value !== props.state.plataforma) {
    emit('update', { plataforma: value })
  }
}
function onDepto(value: unknown) {
  const depto = value === ALL_COUNTRY || typeof value !== 'string' ? '' : (value as UsefulAppDepartment)
  if (depto !== props.state.depto) emit('update', { depto })
}
function onOrden(value: unknown) {
  if (typeof value === 'string' && value !== props.state.orden) {
    emit('update', { orden: value as UsefulAppsSort })
  }
}
</script>

<style scoped>
.ua-filters {
  display: grid;
  gap: 12px;
  margin-top: 16px;
}
.ua-filters__toggle {
  display: none;
  gap: 8px;
  align-items: center;
  justify-self: start;
  min-height: 44px;
  padding: 8px 12px;
  border: 1px solid rgba(var(--v-border-color), 0.25);
  border-radius: 8px;
  background: rgb(var(--v-theme-surface));
  color: rgb(var(--v-theme-link));
  font-size: 0.875rem;
  font-weight: 600;
}
.ua-filters__toggle[aria-expanded='true'] .ua-filters__chevron {
  transform: rotate(180deg);
}
.ua-filters__more {
  display: flex;
  flex-wrap: wrap;
  gap: 16px 24px;
  align-items: flex-end;
}
.ua-filter {
  display: grid;
  gap: 8px;
  min-width: 0;
}
.ua-filter__label {
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  opacity: 0.75;
}
.ua-filter__select {
  flex: 1 1 200px;
  max-width: 260px;
}
@media (max-width: 959px) {
  .ua-filters__toggle {
    display: inline-flex;
  }
  .ua-filters__more {
    display: none;
  }
  .ua-filters__more--open {
    display: grid;
    gap: 24px;
  }
  .ua-filter__select {
    max-width: none;
  }
}
</style>
```

- [ ] **Step 3: Write `app/composables/useUsefulAppsKit.ts`**

```ts
// Las casillas "Ya la tengo" del kit de /apps-utiles-uruguay, guardadas en ESTE navegador
// (localStorage `cu_apps_kit`). Nada llega a un servidor.
//
// El SSR dibuja el kit vacío y `ready` se prende recién después de leer lo guardado: así no hay
// diferencia de hidratación. Y nunca se escribe antes de leer: los controles de Vuetify emiten al
// montar, y un guardado temprano pisaba la lista real con la vacía (pasó con la watchlist y con
// los favoritos de Bankos). Todo acceso va en try/catch: el modo privado o la cuota llena
// degradan a "el kit se olvida", nunca a una página rota.
import { USEFUL_APPS_KIT_STORAGE, usefulAppsKitSanitize } from '~/utils/usefulAppsContent'

export function useUsefulAppsKit() {
  const checked = useState<string[]>('useful-apps-kit', () => [])
  const ready = useState('useful-apps-kit-ready', () => false)
  const storageFailed = ref(false)

  onMounted(() => {
    if (ready.value) return
    try {
      checked.value = usefulAppsKitSanitize(
        JSON.parse(localStorage.getItem(USEFUL_APPS_KIT_STORAGE) || '[]')
      )
    } catch {
      /* modo privado o dato corrupto: el kit arranca vacío */
    }
    ready.value = true
  })

  function toggle(id: string) {
    if (!ready.value) return
    const next = checked.value.includes(id)
      ? checked.value.filter(item => item !== id)
      : usefulAppsKitSanitize([...checked.value, id])
    checked.value = next
    try {
      localStorage.setItem(USEFUL_APPS_KIT_STORAGE, JSON.stringify(next))
      storageFailed.value = false
    } catch {
      storageFailed.value = true
    }
  }

  return { checked, ready, storageFailed, toggle }
}
```

- [ ] **Step 4: Verify**

Run: `npx vitest run tests/unit/componentResolution.test.ts tests/unit/noChipInsideParagraph.test.ts tests/unit/vuetifyComposableImports.test.ts tests/unit/ga4-key-events.test.ts && npx eslint components/usefulApps composables/useUsefulAppsKit.ts`
Expected: PASS; sin errores.

- [ ] **Step 5: Commit**

```bash
git add app/components/usefulApps/UsefulAppsCategoryNav.vue app/components/usefulApps/UsefulAppsFilters.vue app/composables/useUsefulAppsKit.ts
git commit -m "feat(apps-utiles): pestañas que andan antes de hidratar, filtros y kit guardado"
```

---

### Task 8: El kit (`UsefulAppsKit.vue`)

**Files:**
- Create: `app/components/usefulApps/UsefulAppsKit.vue`

**Interfaces:**
- Consumes: `useUsefulAppsKit` (Task 7), `usefulAppsKitView`, `usefulAppStoreButtons` (Task 6),
  `USEFUL_APPS_KIT` (Task 4), `<UsefulAppsIcon>`.
- Produces: `<UsefulAppsKit :apps :facts :platform @tab="(tab) => …" />` (emite `tab` con
  `'salud'` cuando se toca "Ver las mutualistas").

- [ ] **Step 1: Write `app/components/usefulApps/UsefulAppsKit.vue`**

```vue
<template>
  <section id="kit" class="ua-kit" aria-labelledby="ua-kit-title">
    <h2 id="ua-kit-title" class="ua-section-title">Las apps del Estado que todos deberían tener</h2>
    <p class="ua-kit__intro">
      Seis para casi cualquier persona que vive en Uruguay y otras que dependen de tu caso. Marcá
      las que ya tenés: queda guardado en este navegador, no en nuestros servidores.
    </p>

    <div class="ua-kit__progress">
      <VProgressLinear
        :model-value="percent"
        color="primary"
        height="8"
        rounded
        aria-hidden="true"
      />
      <p aria-live="polite">{{ progressText }}</p>
    </div>

    <h3 class="ua-kit__group">Para todos</h3>
    <ul class="ua-kit__list">
      <li
        v-for="row in view.todos"
        :key="row.item.id"
        class="ua-kit__row"
        :class="{ 'ua-kit__row--done': row.checked }"
      >
        <label class="ua-kit__check">
          <input
            type="checkbox"
            :checked="row.checked"
            :disabled="!kit.ready.value"
            @change="kit.toggle(row.item.id)"
          />
          <span class="ua-sr-only">Ya la tengo: {{ row.item.title }}</span>
        </label>
        <div class="ua-kit__body">
          <p class="ua-kit__title">{{ row.item.title }}</p>
          <p class="ua-kit__why">{{ row.item.why }}</p>
          <div v-for="app in row.apps" :key="app.id" class="ua-kit__app">
            <UsefulAppsIcon :name="app.name" :src="iconOf(app)" :size="32" />
            <a class="ua-kit__app-name" :href="`#${app.id}`">{{ app.name }}</a>
            <VBtn
              v-for="button in buttonsOf(app)"
              :key="button.store"
              :href="button.href"
              target="_blank"
              rel="noopener noreferrer nofollow"
              size="small"
              color="primary"
              :variant="button.primary ? 'flat' : 'tonal'"
              :prepend-icon="button.icon"
              :aria-label="button.ariaLabel"
            >
              {{ button.label }}
            </VBtn>
          </div>
          <a
            v-if="row.item.tab"
            class="ua-kit__more"
            :href="`?categoria=${row.item.tab}#explorar`"
            @click="onTab($event, row.item.tab)"
          >
            Ver las apps de las mutualistas
          </a>
        </div>
      </li>
    </ul>

    <h3 class="ua-kit__group">Según tu caso</h3>
    <ul class="ua-kit__list ua-kit__list--case">
      <li v-for="row in view.caso" :key="row.item.id" class="ua-kit__row">
        <div class="ua-kit__body">
          <p class="ua-kit__when">{{ row.item.when }}</p>
          <p class="ua-kit__title">{{ row.item.title }}</p>
          <p class="ua-kit__why">{{ row.item.why }}</p>
          <div v-for="app in row.apps" :key="app.id" class="ua-kit__app">
            <UsefulAppsIcon :name="app.name" :src="iconOf(app)" :size="32" />
            <a class="ua-kit__app-name" :href="`#${app.id}`">{{ app.name }}</a>
            <VBtn
              v-for="button in buttonsOf(app)"
              :key="button.store"
              :href="button.href"
              target="_blank"
              rel="noopener noreferrer nofollow"
              size="small"
              color="primary"
              :variant="button.primary ? 'flat' : 'tonal'"
              :prepend-icon="button.icon"
              :aria-label="button.ariaLabel"
            >
              {{ button.label }}
            </VBtn>
          </div>
        </div>
      </li>
    </ul>
    <p v-if="kit.storageFailed.value" class="ua-kit__warn">
      Este navegador no deja guardar datos (¿modo privado?): las marcas se van a perder al cerrar.
    </p>
  </section>
</template>

<script setup lang="ts">
import type { UsefulApp, UsefulAppCategoryId, UsefulAppsPlatform } from '~/utils/usefulApps'
import { USEFUL_APPS_KIT } from '~/utils/usefulAppsContent'
import { type UsefulAppsAppFacts, usefulAppsIconFor } from '~/utils/usefulAppsStores'
import { usefulAppStoreButtons, usefulAppsKitView } from '~/utils/usefulAppsView'

const props = defineProps<{
  apps: readonly UsefulApp[]
  facts: Readonly<Record<string, UsefulAppsAppFacts>>
  platform: UsefulAppsPlatform | null
}>()
const emit = defineEmits<{ tab: [tab: UsefulAppCategoryId] }>()

const kit = useUsefulAppsKit()
const appsById = computed(() => new Map(props.apps.map(app => [app.id, app])))
const view = computed(() => usefulAppsKitView(USEFUL_APPS_KIT, appsById.value, kit.checked.value))
const percent = computed(() =>
  view.value.total ? Math.round((view.value.done / view.value.total) * 100) : 0
)
const progressText = computed(() =>
  kit.ready.value
    ? `Tenés ${view.value.done} de ${view.value.total}.`
    : `Para todos: ${view.value.total} apps.`
)

const iconOf = (app: UsefulApp) => usefulAppsIconFor(props.facts[app.id])
const buttonsOf = (app: UsefulApp) =>
  usefulAppStoreButtons(app, props.facts[app.id], props.platform).buttons.filter(
    button => button.store !== 'web'
  )

function onTab(event: MouseEvent, tab: UsefulAppCategoryId) {
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
  event.preventDefault()
  emit('tab', tab)
}
</script>

<style scoped>
.ua-kit__intro {
  max-width: 68ch;
  margin-top: 8px;
}
.ua-kit__progress {
  display: grid;
  gap: 8px;
  max-width: 420px;
  margin-top: 16px;
}
.ua-kit__progress p {
  margin: 0;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}
.ua-kit__group {
  margin-top: 24px;
  font-size: 1.125rem;
  font-weight: 700;
}
.ua-kit__list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 340px), 1fr));
  gap: 12px;
  margin: 12px 0 0;
  padding: 0;
  list-style: none;
}
.ua-kit__row {
  display: flex;
  gap: 12px;
  min-width: 0;
  padding: 16px;
  border: 1px solid rgba(var(--v-border-color), 0.2);
  border-radius: 12px;
  background: rgb(var(--v-theme-surface));
}
.ua-kit__row--done {
  border-color: rgba(var(--v-theme-success), 0.6);
}
.ua-sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}
.ua-kit__check {
  position: relative;
  display: inline-flex;
  flex: 0 0 44px;
  align-items: flex-start;
  justify-content: center;
  min-height: 44px;
  cursor: pointer;
}
.ua-kit__check input {
  width: 24px;
  height: 24px;
  margin-top: 2px;
  accent-color: rgb(var(--v-theme-primary));
  cursor: pointer;
}
.ua-kit__body {
  display: grid;
  gap: 8px;
  min-width: 0;
}
.ua-kit__body p {
  margin: 0;
}
.ua-kit__when {
  color: rgb(var(--v-theme-link));
  font-size: 0.8rem;
  font-weight: 700;
}
.ua-kit__title {
  font-weight: 700;
}
.ua-kit__why {
  font-size: 0.875rem;
  line-height: 1.45;
}
.ua-kit__app {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}
.ua-kit__app-name {
  min-width: 0;
  margin-right: 4px;
  color: rgb(var(--v-theme-link));
  font-weight: 600;
}
.ua-kit__app .v-btn {
  min-height: 40px;
}
.ua-kit__more {
  color: rgb(var(--v-theme-link));
  font-size: 0.875rem;
  font-weight: 600;
}
.ua-kit__warn {
  margin-top: 12px;
  font-size: 0.875rem;
}
</style>
```

- [ ] **Step 2: Verify**

Run: `npx vitest run tests/unit/componentResolution.test.ts tests/unit/noChipInsideParagraph.test.ts && npx eslint components/usefulApps/UsefulAppsKit.vue`
Expected: PASS; sin errores.

- [ ] **Step 3: Commit**

```bash
git add app/components/usefulApps/UsefulAppsKit.vue
git commit -m "feat(apps-utiles): kit de las apps del Estado con casillas y progreso"
```

---

### Task 9: La página `/apps-utiles-uruguay`

**Files:**
- Create: `app/pages/apps-utiles-uruguay.vue`

**Interfaces:**
- Consumes: todo lo anterior + `DIRECTORIOS_HUB`, `directoriosHubListItem` de
  `app/utils/directorios.ts`, `usePreciosQuerySync` (auto-import), `<FaqSection>`,
  `<ContentTaskLinks>`, `<StatTile>`, `<SurfaceCard>`, `<ShareButtons>`.
- Produces: la ruta indexable `/apps-utiles-uruguay` (también `/en/…` y `/pt/…` por el sitemap,
  con la canonical literal en español).

- [ ] **Step 1: Write `app/pages/apps-utiles-uruguay.vue`**

```vue
<!--
THESIS: Alguien necesita la app para un trámite, el ómnibus o la luz. Que en medio minuto encuentre
la OFICIAL, sepa quién la publica en cada tienda y la instale desde el enlace correcto; y que vea de
un vistazo cuáles del Estado le conviene tener.
FIRST VIEWPORT: Migas, título, una línea con el dato y los atajos. El kit abajo; el explorador con
pestañas a un toque.
FORM: Lectura + filtro. Todo se dibuja en el servidor (las pestañas son enlaces `?categoria=` que el
servidor lee); después de hidratar, el filtro es del cliente y la URL se reescribe con
history.replaceState.
-->
<template>
  <VContainer class="ua-page py-6 py-md-10">
    <VBreadcrumbs
      :items="[
        { title: 'Inicio', to: localePath('/') },
        { title: DIRECTORIOS_HUB.label, to: localePath(DIRECTORIOS_HUB.path) },
        { title: 'Apps útiles', disabled: true },
      ]"
      class="px-0 pb-2"
    />

    <header class="ua-header">
      <p class="ua-eyebrow">Directorio</p>
      <h1 class="ua-title">Apps útiles en Uruguay: las del Estado y las del día a día</h1>
      <p class="ua-lead">
        {{ USEFUL_APPS.length }} apps que sirven para vivir en Uruguay —{{ publicCount }} son del
        Estado, de una intendencia o de una empresa pública—, con el desarrollador tal cual figura
        en cada tienda para que instales la oficial. Revisadas una por una el {{ verifiedLabel }}.
      </p>
      <div class="ua-stats">
        <StatTile label="Apps" :value="String(USEFUL_APPS.length)" note="en 10 categorías" />
        <StatTile label="Del Estado" :value="String(publicCount)" note="organismos, intendencias y empresas públicas" />
        <StatTile label="Revisado" :value="verifiedShort" :note="storesNote" />
      </div>
      <ContentTaskLinks
        label="En esta página"
        :items="[
          { label: 'Las imprescindibles', to: '#kit' },
          { label: 'Todas por categoría', to: '#explorar' },
          { label: 'Cómo reconocer la oficial', to: '#oficial' },
        ]"
      />
    </header>

    <UsefulAppsKit
      :apps="USEFUL_APPS"
      :facts="facts"
      :platform="platform"
      class="ua-block"
      @tab="openTab"
    />

    <section id="explorar" class="ua-block ua-explorer" aria-labelledby="ua-explorar-title">
      <h2 id="ua-explorar-title" class="ua-section-title">Todas las apps, por categoría</h2>
      <UsefulAppsCategoryNav :tabs="tabLinks" :current="state.tab" @select="selectTab" />
      <UsefulAppsFilters :state="state" :departments="departments" @update="update" />

      <div class="ua-results-head">
        <p class="ua-count" aria-live="polite">
          <strong>{{ usefulAppsCountLabel(results.length) }}</strong>
          <template v-if="currentCategory"> en {{ currentCategory.label }}</template>
          <template v-else-if="state.tab === 'imprescindibles'"> imprescindibles</template>
        </p>
        <VBtn
          v-if="filtersActive"
          variant="text"
          size="small"
          prepend-icon="mdi-filter-remove-outline"
          @click="clearFilters"
        >
          Limpiar filtros
        </VBtn>
      </div>
      <p v-if="currentCategory" class="ua-blurb">{{ currentCategory.blurb }}</p>
      <p v-if="state.tab === 'dinero'" class="ua-blurb">
        Acá están las principales. Inversión, cripto y el resto de las apps de plata están en el
        <NuxtLink :to="localePath('/apps-economia-uruguay')">directorio de apps de economía</NuxtLink>,
        y los clubes de puntos en
        <NuxtLink :to="localePath('/apps-de-beneficios-uruguay')">apps de beneficios</NuxtLink>.
      </p>

      <template v-if="results.length">
        <template v-if="grouped">
          <section
            v-for="group in grouped"
            :key="group.category.id"
            class="ua-group"
            :aria-labelledby="`ua-grupo-${group.category.id}`"
          >
            <h3 :id="`ua-grupo-${group.category.id}`" class="ua-group__title">
              <VIcon size="22" aria-hidden="true">{{ group.category.icon }}</VIcon>
              {{ group.category.label }}
              <span class="ua-group__count">{{ group.apps.length }}</span>
            </h3>
            <ul class="ua-grid">
              <li v-for="app in group.apps" :key="app.id">
                <UsefulAppsCard
                  :app="app"
                  :facts="facts[app.id] ?? null"
                  :platform="platform"
                  :today="today"
                  :alternative="alternativeOf(app)"
                  heading-level="h4"
                />
              </li>
            </ul>
            <a class="ua-back" href="#explorar">Volver a las categorías</a>
          </section>
        </template>
        <ul v-else class="ua-grid">
          <li v-for="app in results" :key="app.id">
            <UsefulAppsCard
              :app="app"
              :facts="facts[app.id] ?? null"
              :platform="platform"
              :today="today"
              :alternative="alternativeOf(app)"
              heading-level="h3"
            />
          </li>
        </ul>
      </template>
      <div v-else class="ua-empty">
        <VIcon size="48" aria-hidden="true">mdi-cellphone-remove</VIcon>
        <p class="ua-empty__title">Ninguna app coincide con esa búsqueda.</p>
        <p>Probá con otra palabra (por ejemplo "ómnibus" o "luz") o limpiá los filtros.</p>
        <VBtn color="primary" variant="tonal" @click="clearFilters">Limpiar filtros</VBtn>
      </div>
    </section>

    <section class="ua-block" aria-labelledby="ua-no-app-title">
      <h2 id="ua-no-app-title" class="ua-section-title">Lo que buscás y no es una app</h2>
      <p class="ua-section-intro">
        Estos servicios no tienen app oficial: lo que aparece en las tiendas con su nombre no es de
        ellos. Esto es lo que sí existe.
      </p>
      <ul class="ua-notapps">
        <li v-for="service in USEFUL_APPS_NOT_APPS" :key="service.id">
          <SurfaceCard padding="compact" stretch>
            <h3 class="ua-notapp__name">{{ service.name }}</h3>
            <p class="ua-notapp__looking">{{ service.lookingFor }}</p>
            <p>{{ service.instead }}</p>
            <ul class="ua-notapp__channels">
              <li v-for="channel in service.channels" :key="channel.url">
                {{ channel.label }}:
                <a :href="channel.url" target="_blank" rel="noopener noreferrer nofollow">
                  {{ channel.value }}
                </a>
              </li>
            </ul>
          </SurfaceCard>
        </li>
      </ul>
    </section>

    <section id="oficial" class="ua-block" aria-labelledby="ua-oficial-title">
      <h2 id="ua-oficial-title" class="ua-section-title">Cómo reconocer la app oficial</h2>
      <ol class="ua-steps">
        <li v-for="tip in USEFUL_APPS_SAFETY" :key="tip">{{ tip }}</li>
      </ol>
      <p class="ua-section-intro">
        Si ya te pasó, en
        <NuxtLink :to="localePath('/estafas-uruguay')">estafas en Uruguay</NuxtLink> está qué hacer y
        a quién avisarle.
      </p>
    </section>

    <section class="ua-block" aria-labelledby="ua-criterios-title">
      <h2 id="ua-criterios-title" class="ua-section-title">Cómo elegimos</h2>
      <ul class="ua-steps ua-steps--bullets">
        <li v-for="line in USEFUL_APPS_CRITERIA" :key="line">{{ line }}</li>
      </ul>
      <p class="ua-section-intro">
        La lista se revisó a mano el {{ verifiedLabel }}.
        <template v-if="storesLabel">
          Los íconos, las notas y las fechas de versión se leyeron de las tiendas el
          {{ storesLabel }}.
        </template>
        ¿Falta una app o cambió algo? Escribinos desde
        <NuxtLink :to="localePath('/contacto')">contacto</NuxtLink>.
      </p>
    </section>

    <FaqSection :items="faqItems" heading="Preguntas frecuentes" :expanded="true" />

    <div class="ua-share">
      <ShareButtons
        text="Las apps del Estado que todos deberían tener y las útiles del día a día"
        variant="tonal"
        color="primary"
      />
    </div>
  </VContainer>
</template>

<script setup lang="ts">
import { DIRECTORIOS_HUB, directoriosHubListItem } from '~/utils/directorios'
import type { FaqItem } from '~/utils/faqAnswers'
import {
  USEFUL_APP_CATEGORIES,
  USEFUL_APPS_DEFAULT_STATE,
  type UsefulApp,
  type UsefulAppCategoryId,
  type UsefulAppsPlatform,
  type UsefulAppsState,
  type UsefulAppsTab,
  usefulAppIsPublic,
  usefulAppsActiveFilterCount,
  usefulAppsCountLabel,
  usefulAppsDepartmentsIn,
  usefulAppsDetectPlatform,
  usefulAppsFilter,
  usefulAppsGroup,
  usefulAppsQueryFromState,
  usefulAppsSort,
  usefulAppsStateFromQuery,
  usefulAppsTabCounts,
} from '~/utils/usefulApps'
import { USEFUL_APPS, USEFUL_APPS_VERIFIED_AT } from '~/utils/usefulAppsCatalog'
import {
  USEFUL_APPS_CRITERIA,
  USEFUL_APPS_ESSENTIAL_IDS,
  USEFUL_APPS_FAQ,
  USEFUL_APPS_NOT_APPS,
  USEFUL_APPS_SAFETY,
} from '~/utils/usefulAppsContent'
import {
  type UsefulAppsAppFacts,
  type UsefulAppsStoresPayload,
  usefulAppsLatestUpdate,
  usefulAppsLongDate,
} from '~/utils/usefulAppsStores'
import { usefulAppsTabLinks } from '~/utils/usefulAppsView'

const localePath = useLocalePath()
const route = useRoute()
const BASE_PATH = '/apps-utiles-uruguay'
// Literal y absoluta, nunca armada con localePath: /en/ y /pt/ existen y tienen que apuntar a la
// misma canonical (ver tiendas-online-uruguay/index.vue).
const canonicalUrl = 'https://cambio-uruguay.com/apps-utiles-uruguay'

// El estado sale de la URL también en el servidor: un enlace compartido o una pestaña tocada antes
// de hidratar llega ya filtrada. Después se escribe con history.replaceState (router.replace haría
// saltar la página en cada tecla).
const state = reactive<UsefulAppsState>(
  usefulAppsStateFromQuery(route.query as Record<string, unknown>)
)
usePreciosQuerySync(() => usefulAppsQueryFromState(state))

const { data: stores } = await useFetch<UsefulAppsStoresPayload | null>(
  '/api/useful-apps/stores',
  { key: 'useful-apps-stores', default: () => null }
)
const facts = computed<Record<string, UsefulAppsAppFacts>>(() => stores.value?.apps ?? {})

// La tienda del lector sólo se sabe en el cliente: el HTML del servidor es el mismo para todos.
const platform = ref<UsefulAppsPlatform | null>(null)
onMounted(() => {
  platform.value = usefulAppsDetectPlatform(
    navigator.userAgent,
    navigator.platform,
    navigator.maxTouchPoints
  )
})

const ctx = { essentialIds: USEFUL_APPS_ESSENTIAL_IDS }
const appsById = new Map(USEFUL_APPS.map(app => [app.id, app]))
const counts = usefulAppsTabCounts(USEFUL_APPS, ctx)
const departments = usefulAppsDepartmentsIn(USEFUL_APPS)
const publicCount = USEFUL_APPS.filter(usefulAppIsPublic).length
const verifiedLabel = usefulAppsLongDate(USEFUL_APPS_VERIFIED_AT)
const verifiedShort = verifiedLabel.replace(/ de \d{4}$/, '')
const today = computed(() => stores.value?.capturedAt ?? USEFUL_APPS_VERIFIED_AT)
const storesLabel = computed(() =>
  stores.value ? usefulAppsLongDate(stores.value.capturedAt) : null
)
const storesNote = computed(() =>
  storesLabel.value ? `tiendas leídas el ${storesLabel.value}` : 'a mano, ficha por ficha'
)

const results = computed(() =>
  usefulAppsSort(usefulAppsFilter(USEFUL_APPS, state, ctx), state.orden, app =>
    usefulAppsLatestUpdate(facts.value[app.id])
  )
)
const grouped = computed(() =>
  state.tab === 'todas' && state.orden === 'utiles' ? usefulAppsGroup(results.value) : null
)
const tabLinks = computed(() => usefulAppsTabLinks(localePath(BASE_PATH), state, counts))
const currentCategory = computed(
  () => USEFUL_APP_CATEGORIES.find(category => category.id === state.tab) ?? null
)
const filtersActive = computed(() => usefulAppsActiveFilterCount(state) > 0)
const faqItems = USEFUL_APPS_FAQ as FaqItem[]

function alternativeOf(app: UsefulApp): UsefulApp | null {
  return app.officialAlternative ? (appsById.get(app.officialAlternative) ?? null) : null
}
function selectTab(tab: UsefulAppsTab) {
  state.tab = tab
}
function update(patch: Partial<UsefulAppsState>) {
  Object.assign(state, patch)
}
function clearFilters() {
  Object.assign(state, { ...USEFUL_APPS_DEFAULT_STATE, tab: state.tab })
}
function openTab(tab: UsefulAppCategoryId) {
  state.tab = tab
  nextTick(() => document.getElementById('explorar')?.scrollIntoView({ block: 'start' }))
}

const title = 'Apps del Estado y apps útiles en Uruguay'
// Abre con el dato que nadie publica junto (la oficial del ómnibus no es la más bajada) y no con lo
// que la página es: medido en este sitio, un snippet con el dato corre a ~1,4 % de CTR y uno
// genérico a 0,03–0,2 % desde la misma posición.
const description =
  'Cómo ir es la app oficial del ómnibus en Montevideo; STM Montevideo no es de la IM. BPS, ASSE, UTE, DGI y más, con el desarrollador de cada tienda.'

defineOgImageComponent('Cambio', {
  title: 'Apps útiles de Uruguay',
  subtitle: 'Las del Estado que todos deberían tener y las del día a día',
  tag: 'DIRECTORIO',
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

// El FAQPage lo emite FaqSection: no se repite acá.
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
              {
                '@type': 'ListItem',
                position: 1,
                name: 'Cambio Uruguay',
                item: 'https://cambio-uruguay.com/',
              },
              directoriosHubListItem(2),
              { '@type': 'ListItem', position: 3, name: 'Apps útiles', item: canonicalUrl },
            ],
          },
          {
            '@type': 'ItemList',
            name: 'Apps útiles en Uruguay',
            numberOfItems: USEFUL_APPS.length,
            itemListElement: USEFUL_APPS.map((app, index) => ({
              '@type': 'ListItem',
              position: index + 1,
              name: `${app.name} — ${app.organization}`,
              url: `${canonicalUrl}#${app.id}`,
            })),
          },
        ],
      }),
    },
  ],
}))
</script>

<style scoped>
/* Reset en :where() también para la raíz (especificidad 0): con :is() el reset le ganaba a los
   márgenes del propio autor (memoria reset-css-is-vs-where, docs/app/CSS_RESET_SPECIFICITY.md). */
:where(.ua-page) :where(p, h1, h2, h3, ul, ol) {
  margin-top: 0;
}
.ua-eyebrow {
  margin-bottom: 8px;
  color: rgb(var(--v-theme-link));
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}
.ua-title {
  margin-bottom: 16px;
  font-size: clamp(1.55rem, 4.4vw, 2.5rem);
  font-weight: 800;
  line-height: 1.1;
  letter-spacing: -0.02em;
  text-wrap: balance;
}
.ua-lead {
  max-width: 72ch;
  margin-bottom: 24px;
  font-size: 1.075rem;
  line-height: 1.65;
}
.ua-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 180px), 1fr));
  gap: 16px;
  max-width: 720px;
  margin-bottom: 24px;
}
.ua-block {
  margin-top: 40px;
}
.ua-section-title {
  margin-bottom: 8px;
  font-size: clamp(1.35rem, 3vw, 1.75rem);
  font-weight: 700;
  line-height: 1.2;
}
.ua-section-intro {
  max-width: 72ch;
  margin-top: 12px;
}
.ua-results-head {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 16px;
  align-items: center;
  margin-top: 16px;
}
.ua-count {
  margin-bottom: 0;
}
.ua-blurb {
  max-width: 72ch;
  margin-top: 4px;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}
.ua-blurb a,
.ua-section-intro a,
.ua-back,
.ua-notapp__channels a {
  color: rgb(var(--v-theme-link));
}
.ua-group {
  margin-top: 24px;
}
.ua-group__title {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-bottom: 12px;
  font-size: 1.25rem;
  font-weight: 700;
}
.ua-group__count {
  font-size: 0.875rem;
  font-weight: 600;
  opacity: 0.7;
}
.ua-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 12px;
  margin: 16px 0 0;
  padding: 0;
  list-style: none;
}
.ua-grid > li {
  min-width: 0;
}
.ua-grid > :deep(.google-auto-placed) {
  grid-column: 1 / -1;
}
@media (min-width: 600px) {
  .ua-grid {
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 16px;
  }
}
.ua-back {
  display: inline-block;
  margin-top: 12px;
  font-size: 0.875rem;
  font-weight: 600;
}
.ua-empty {
  display: grid;
  gap: 8px;
  justify-items: center;
  margin-top: 24px;
  padding: 32px 16px;
  border-radius: 12px;
  background: rgba(var(--v-theme-on-surface), 0.04);
  text-align: center;
}
.ua-empty__title {
  font-weight: 700;
}
.ua-notapps {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 260px), 1fr));
  gap: 12px;
  margin: 16px 0 0;
  padding: 0;
  list-style: none;
}
.ua-notapp__name {
  font-size: 1.125rem;
  font-weight: 700;
}
.ua-notapp__looking {
  margin-top: 4px;
  font-size: 0.875rem;
  font-weight: 600;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}
.ua-notapp__channels {
  margin-top: 8px;
  padding-left: 18px;
  font-size: 0.875rem;
}
.ua-steps {
  max-width: 72ch;
  margin-top: 12px;
  padding-left: 22px;
  line-height: 1.55;
}
.ua-steps li + li {
  margin-top: 8px;
}
.ua-share {
  margin-top: 32px;
}
</style>
```

- [ ] **Step 2: Run the page contracts**

Run (desde `app/`):
`npx vitest run tests/unit/seoContract.test.ts tests/unit/seoTitleBudget.test.ts tests/unit/seoDescriptionBudget.test.ts tests/unit/pageContainer.test.ts tests/unit/componentResolution.test.ts tests/unit/noChipInsideParagraph.test.ts tests/unit/dateLocale.test.ts tests/unit/siteTimeZone.test.ts tests/unit/internalLinks.test.ts tests/unit/directorios.test.ts`
Expected: `siteNav-coverage` y `temaHuerfanas` todavía fallan (la página no está en el menú ni en
un tema: Task 10); todo lo demás PASS. Si `seoDescriptionBudget` pide subir `RESOLVED`, subirlo al
número medido (es un piso, `>=`).

- [ ] **Step 3: Commit**

```bash
git add app/pages/apps-utiles-uruguay.vue
git commit -m "feat(apps-utiles): /apps-utiles-uruguay con pestañas, filtros y kit"
```

---

### Task 10: Integración: menú, temas, directorios, "Seguí leyendo" y libro de cambios

**Files:**
- Modify: `app/utils/siteNav.ts` (sección `tools`, después de `/apps-economia-uruguay`)
- Modify: `app/i18n/locales/json/es.json`, `en.json`, `pt.json` (objeto `nav`, después de `"apps"`)
- Modify: `app/utils/guideHubs.ts` (tema `tramites-y-documentos-uruguay`, al final de `resources`)
- Modify (regenerado): `app/utils/temaIndex.json`
- Modify: `app/utils/directorios.ts` (familia `dinero`, después de `tarjetas`)
- Modify: `app/server/api/directorios.get.ts` (`CURADOS`)
- Modify: `app/tests/unit/directoriosApi.test.ts` (claves fijadas + curados)
- Modify: `app/utils/relatedPages.ts` (`CURATED`)
- Modify: `docs/seo/experiments.json`

**Interfaces:**
- Consumes: `USEFUL_APPS`, `USEFUL_APPS_VERIFIED_AT` (Task 3).
- Produces: la página en el menú, el sitemap (es/en/pt), el buscador, `/directorios-uruguay`, el
  tema "Trámites y documentos" y el libro de experimentos.

- [ ] **Step 1: Menú** — en `app/utils/siteNav.ts`, dentro de la sección `tools`, inmediatamente
  después del objeto de `to: '/apps-economia-uruguay'`:

```ts
      {
        // Las apps del Estado que todos deberían tener y las del día a día, por categoría
        // (ómnibus, salud, trámites, luz, bancos). Las de plata siguen en /apps-economia-uruguay.
        to: '/apps-utiles-uruguay',
        labelKey: 'nav.appsUtiles',
        icon: 'mdi-cellphone-check',
        priority: 0.8,
        changefreq: 'weekly',
        fresh: true,
        keywords: [
          'apps utiles uruguay',
          'apps del estado uruguay',
          'aplicaciones del gobierno uruguay',
          'app gub.uy',
          'app bps personas',
          'app asse',
          'app como ir',
          'app stm montevideo',
          'app ute',
          'mi antel',
          'app 911 uruguay',
          'identidad digital tuid abitab',
          'app omnibus montevideo',
          'apps que todo uruguayo deberia tener',
        ],
      },
```

- [ ] **Step 2: Etiqueta en los tres idiomas** — en el objeto `"nav"` de cada archivo, después de
  la línea `"apps": …`:

`app/i18n/locales/json/es.json`: `    "appsUtiles": "Apps útiles",`
`app/i18n/locales/json/en.json`: `    "appsUtiles": "Useful apps",`
`app/i18n/locales/json/pt.json`: `    "appsUtiles": "Apps úteis",`

- [ ] **Step 3: Tema** — en `app/utils/guideHubs.ts`, tema `tramites-y-documentos-uruguay`, al
  final de `resources` (después de "A quién le reclamo"):

```ts
      {
        label: 'Apps útiles y del Estado',
        description: 'Las que todos deberían tener y cómo reconocer la oficial en cada tienda.',
        to: '/apps-utiles-uruguay',
      },
```

Regenerar el índice: `npx vitest run tests/unit/temaIndex.test.ts -u` (desde `app/`) y verificar
que `app/utils/temaIndex.json` cambió sólo en ese tema.

- [ ] **Step 4: Directorios** — en `app/utils/directorios.ts`, después de la entrada `tarjetas`
  (familia `dinero`):

```ts
  {
    id: 'apps',
    to: '/apps-utiles-uruguay',
    familia: 'dinero',
    titulo: 'Apps útiles',
    queCompara: 'Las apps del Estado y las del día a día, con el desarrollador que figura en cada tienda.',
    icon: 'mdi-cellphone-check',
    unidad: 'apps',
    fuente: 'curado',
  },
```

En `app/server/api/directorios.get.ts`: agregar el import
`import { USEFUL_APPS, USEFUL_APPS_VERIFIED_AT } from '../../utils/usefulAppsCatalog'` junto a los
otros y, en `CURADOS`, la línea `  apps: cifra(USEFUL_APPS.length, USEFUL_APPS_VERIFIED_AT),` (el
test busca literalmente `apps: cifra(`).

En `app/tests/unit/directoriosApi.test.ts`: importar
`import { USEFUL_APPS, USEFUL_APPS_VERIFIED_AT } from '../../utils/usefulAppsCatalog'`; en el test
"los curados son el largo…" agregar
`expect(cifras.apps).toEqual({ count: USEFUL_APPS.length, asOf: USEFUL_APPS_VERIFIED_AT })`; y en
"si no se pudo leer NINGUNA cifra relevada…" cambiar la lista fijada a
`['apps', 'casas', 'couriers', 'tarjetas']`.

- [ ] **Step 5: "Seguí leyendo"** — en `app/utils/relatedPages.ts`, dentro de `CURATED`, agregar:

```ts
  // Apps útiles: lo que sigue es plata (las de economía), trámites y el aviso de estafas.
  '/apps-utiles-uruguay': [
    '/apps-economia-uruguay',
    '/certificados-bps-uruguay',
    '/a-quien-le-reclamo-uruguay',
    '/estafas-uruguay',
  ],
  // Quien vino por las apps de plata casi siempre busca también las del Estado.
  '/apps-economia-uruguay': [
    '/apps-utiles-uruguay',
    '/apps-de-beneficios-uruguay',
    '/mejores-bancos-uruguay',
  ],
```

(si `'/apps-economia-uruguay'` ya tiene una lista en `CURATED`, anteponer `'/apps-utiles-uruguay'`
a esa lista en vez de crear otra clave).

- [ ] **Step 6: Libro de cambios** — `docs/seo/experiments.json`, al final de `experiments`
  (`shippedOn` = el día del despliegue en UTC; nunca uno futuro):

```json
    {
      "id": "apps-utiles-uruguay",
      "shippedOn": "2026-09-30",
      "routes": [
        "/apps-utiles-uruguay"
      ],
      "queries": [
        "apps del estado uruguay",
        "apps utiles uruguay",
        "app como ir",
        "app stm montevideo",
        "app bps personas",
        "aplicaciones del gobierno uruguay"
      ],
      "hypothesis": "El sitio no tenia pagina para las apps del Estado ni para las del dia a dia fuera de la plata. La apuesta es un dato que nadie publica junto con el enlace correcto: la app de omnibus mas bajada de Montevideo no es la oficial (Como ir es de la Intendencia y STM Montevideo de un desarrollador independiente), OSE y el Correo no tienen app, y cada tarjeta muestra el desarrollador tal cual figura en cada tienda. Consultas de marca de organismos con volumen estable y sin caja de respuesta."
    }
```

- [ ] **Step 7: Run the integration contracts**

Run (desde `app/`):
`npx vitest run tests/unit/siteNav-coverage.test.ts tests/unit/temaHuerfanas.test.ts tests/unit/temaIndex.test.ts tests/unit/temaVecinos.test.ts tests/unit/guideHubs.test.ts tests/unit/directorios.test.ts tests/unit/directoriosApi.test.ts tests/unit/relatedPages.test.ts tests/unit/searchIndex.test.ts tests/unit/sitemap-urls.test.ts tests/unit/i18nMessagePipes.test.ts tests/unit/familiaNav.test.ts tests/unit/familiaSinListasPropias.test.ts`
y desde la raíz:
`npx vitest run tests/revenueplan/experiments_routes.test.ts tests/revenueplan/experiments.test.ts`
Expected: todo PASS.

- [ ] **Step 8: Commit** (la fila de experimentos va en el mismo commit que publica la página:
  este commit y el de la página salen en el mismo push)

```bash
git add app/utils/siteNav.ts app/i18n/locales/json/es.json app/i18n/locales/json/en.json app/i18n/locales/json/pt.json app/utils/guideHubs.ts app/utils/temaIndex.json app/utils/directorios.ts app/server/api/directorios.get.ts app/tests/unit/directoriosApi.test.ts app/utils/relatedPages.ts docs/seo/experiments.json
git commit -m "feat(apps-utiles): menú, tema, directorios, Seguí leyendo y libro de cambios"
```

---

### Task 11: Corregir cuatro filas equivocadas de `/apps-economia-uruguay`

La investigación encontró filas de `app/utils/moneyApps.ts` que mandan a otra app o nombran un banco
que ya no está. No se toca el título ni la descripción de esa página (experimento abierto hasta
~22/10); sólo filas del cuerpo.

**Files:**
- Modify: `app/utils/moneyApps.ts`
- Test: `app/tests/unit/moneyApps.test.ts`

- [ ] **Step 1: Write the failing test** — agregar al final de `app/tests/unit/moneyApps.test.ts`:

```ts
describe('filas corregidas el 2026-09-30', () => {
  it('ninguna app enlaza el paquete de un banco de República Dominicana', () => {
    for (const a of MONEY_APPS) expect(a.androidUrl ?? '').not.toContain('com.popular.pinkapp')
  })

  it('HSBC ya no opera en Uruguay: toda mención lo dice junto a BTG Pactual', () => {
    for (const a of MONEY_APPS) {
      const text = `${a.name} ${a.description} ${a.note ?? ''}`
      if (/HSBC/.test(text)) expect(text, a.id).toMatch(/BTG/)
    }
  })
})
```

- [ ] **Step 2: Run to verify it fails** — `npx vitest run tests/unit/moneyApps.test.ts` → FAIL si
  la fila `toke` todavía apunta a `com.popular.pinkapp` o si alguna descripción nombra a HSBC sin
  BTG.

- [ ] **Step 3: Corregir las filas** (verificar cada cambio abriendo la ficha antes de escribirlo):
  - `toke`: sacar `androidUrl` con `com.popular.pinkapp` (es de Banco Popular Dominicano); si la
    app uruguaya de Toke tiene ficha propia en Google Play de Uruguay, poner esa; si no, dejar
    `platforms` sin `android`.
  - cualquier fila que nombre a HSBC Uruguay: BTG Pactual cerró la compra el 13/7/2026 y la app se
    llama "BTG Pactual - iBanca" (`uy.com.hsbc.hsbcuruguay`, iOS `1497854802`); en la descripción de
    Toke, reemplazar HSBC por BTG Pactual.
  - `brou-llave-digital`: la nota dice que el BROU hoy activa la Llave Digital dentro de App eBROU
    ("no se necesitan aplicaciones o dispositivos adicionales"); `verified` queda en `true` sólo si
    la ficha sigue publicada.
  - `takenos`: su nota ya dice "retirada de Google Play el 31/03/2026"; sacar `androidUrl` si todavía
    está.

- [ ] **Step 4: Run** — `npx vitest run tests/unit/moneyApps.test.ts tests/unit/guides.test.ts` →
  PASS.

- [ ] **Step 5: Commit**

```bash
git add app/utils/moneyApps.ts app/tests/unit/moneyApps.test.ts
git commit -m "fix(apps-economia): Toke enlazaba la app de un banco dominicano y HSBC ya es BTG"
```

---

### Task 12: Lectura de las fichas en la raíz (`classes/usefulapps/types.ts` + `stores.ts`)

**Files:**
- Create: `classes/usefulapps/types.ts`, `classes/usefulapps/stores.ts`
- Create (copiar tal cual): `tests/usefulapps/fixtures/play-bps-personas.html` y
  `tests/usefulapps/fixtures/appstore-bps-personas.html` desde
  `C:/Users/airau/AppData/Local/Temp/claude/c--Users-airau-Documents-GitHub-cambio-uruguay/27430b7f-d7b3-4fbe-b4e6-2d7862dc63eb/scratchpad/fixtures/`
  (recortes reales de las dos fichas de BPS Personas, 30/9/2026: el JSON-LD, el bloque de
  descargas, el de "Actualización", el `versionHistory` y el `<time>` de la versión).
- Test: `tests/usefulapps/stores.test.ts`

**Interfaces:**
- Produces: `USEFUL_APPS_KEY = "uy"`, tipos `StoreName`, `StoreListing`, `StoreSignal`,
  `AppSignals`, `DeveloperChange`, `UsefulAppsCounts`, `UsefulAppsSnapshot`; funciones
  `playListingUrl(pkg)`, `appStoreListingUrl(id)`, `parsePlayDate(text)`, `playIcon(raw)`,
  `appStoreIcon(raw)`, `parsePlayListing(html)`, `parseAppStoreListing(html)`,
  `readListing(store, id, fetchImpl?, timeoutMs?) → Promise<ReadOutcome>` con
  `ReadOutcome = { kind: "ok"; listing } | { kind: "missing" } | { kind: "error"; message }`,
  `USEFUL_APPS_UA`.

- [ ] **Step 1: Write the failing test** — `tests/usefulapps/stores.test.ts`

```ts
// Los parsers de las dos fichas contra recortes REALES (BPS Personas, 30/9/2026) y la lectura con
// un fetch falso: sin red.
import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import {
  appStoreIcon,
  parseAppStoreListing,
  parsePlayDate,
  parsePlayListing,
  playIcon,
  readListing,
} from "../../classes/usefulapps/stores";

const FIXTURES = path.join(__dirname, "fixtures");
const read = (name: string) => fs.readFileSync(path.join(FIXTURES, name), "utf8");

describe("parsePlayDate", () => {
  it("lee las fechas cortas de Play en español", () => {
    expect(parsePlayDate("10 ago 2026")).toBe("2026-08-10");
    expect(parsePlayDate("3 sept 2025")).toBe("2025-09-03");
    expect(parsePlayDate("3 sept. 2025")).toBe("2025-09-03");
    expect(parsePlayDate("1 ene 2024")).toBe("2024-01-01");
  });

  it("rechaza lo que no es una fecha", () => {
    expect(parsePlayDate("ayer")).toBeNull();
    expect(parsePlayDate("31 feb 2026")).toBeNull();
    expect(parsePlayDate("10 foo 2026")).toBeNull();
  });
});

describe("ficha de Google Play", () => {
  const listing = parsePlayListing(read("play-bps-personas.html"));

  it("lee nombre, desarrollador, nota, opiniones, descargas y fecha", () => {
    expect(listing).toMatchObject({
      name: "BPS Personas",
      developer: "Banco de Prevision Social",
      updated: "2026-08-10",
      ratingCount: 1434,
      installs: "100 k+",
    });
    expect(listing?.rating).toBeCloseTo(4.359, 2);
  });

  it("pide el ícono en 128 px", () => {
    expect(listing?.icon).toMatch(/^https:\/\/play-lh\.googleusercontent\.com\/.+=s128$/);
  });

  it("una página sin JSON-LD no es una ficha", () => {
    expect(parsePlayListing("<html><body>Captcha</body></html>")).toBeNull();
  });
});

describe("ficha del App Store", () => {
  const html = read("appstore-bps-personas.html");
  const listing = parseAppStoreListing(html);

  it("lee la fecha de la última versión del historial", () => {
    expect(listing).toMatchObject({
      name: "BPS Personas",
      developer: "Banco de Previsión Social",
      updated: "2026-09-02",
      rating: 3.6,
      ratingCount: 114,
      installs: null,
    });
  });

  it("pide el ícono cuadrado de 128 px, no la imagen para redes", () => {
    expect(listing?.icon).toMatch(/^https:\/\/is1-ssl\.mzstatic\.com\/.+\/128x128bb\.png$/);
  });

  it("sin versionHistory usa el <time> que acompaña al número de versión", () => {
    expect(parseAppStoreListing(html.replace('"versionHistory"', '"otraCosa"'))?.updated).toBe(
      "2026-09-02"
    );
  });
});

describe("íconos", () => {
  it("sólo acepta las CDN de las tiendas y normaliza el tamaño", () => {
    expect(playIcon("https://play-lh.googleusercontent.com/abc=w240-h480-rw")).toBe(
      "https://play-lh.googleusercontent.com/abc=s128"
    );
    expect(playIcon("https://play-lh.googleusercontent.com/abc")).toBe(
      "https://play-lh.googleusercontent.com/abc=s128"
    );
    expect(playIcon("https://evil.example/abc")).toBeNull();
    expect(
      appStoreIcon("https://is1-ssl.mzstatic.com/image/thumb/x/AppIcon.png/1200x630wa.png")
    ).toBe("https://is1-ssl.mzstatic.com/image/thumb/x/AppIcon.png/128x128bb.png");
    expect(appStoreIcon("https://mzstatic.com.evil.example/x/1200x630wa.png")).toBeNull();
  });
});

describe("readListing", () => {
  const html = read("play-bps-personas.html");
  const respond = (status: number, body = "") => async () => new Response(body, { status });

  it("un 404 es una ausencia explícita", async () => {
    expect(await readListing("android", "x.y", respond(404))).toEqual({ kind: "missing" });
  });

  it("un 5xx o una página sin JSON-LD son errores, no ausencias", async () => {
    expect((await readListing("android", "x.y", respond(503))).kind).toBe("error");
    expect((await readListing("android", "x.y", respond(200, "<html></html>"))).kind).toBe("error");
  });

  it("un fallo de red es un error y no tira", async () => {
    const boom = async (): Promise<Response> => {
      throw new Error("ECONNRESET");
    };
    expect(await readListing("ios", "123", boom)).toEqual({ kind: "error", message: "ECONNRESET" });
  });

  it("pide la ficha de Uruguay con la UA honesta del bot", async () => {
    const seen: { url: string; ua: string | null }[] = [];
    const spy = async (url: string, init?: RequestInit) => {
      seen.push({ url, ua: new Headers(init?.headers).get("user-agent") });
      return new Response(html, { status: 200 });
    };
    expect((await readListing("android", "uy.gub.bps.movil.persona", spy)).kind).toBe("ok");
    expect(seen).toEqual([
      {
        url: "https://play.google.com/store/apps/details?id=uy.gub.bps.movil.persona&hl=es_419&gl=UY",
        ua: "cambio-uruguay.com apps bot (+https://cambio-uruguay.com)",
      },
    ]);
  });
});
```

- [ ] **Step 2: Run to verify it fails** — desde la raíz: `npx vitest run tests/usefulapps/stores.test.ts` → FAIL (no existe el módulo).

- [ ] **Step 3: Write `classes/usefulapps/types.ts`**

```ts
// Tipos del snapshot semanal de /apps-utiles-uruguay (colección `usefulappssnapshots`, base del
// app). El lado que lee es app/utils/usefulAppsStores.ts (`UsefulAppsSnapshotDoc`).
export const USEFUL_APPS_KEY = "uy";

export type StoreName = "android" | "ios";

/** Lo que se lee de una ficha. Todo campo puede faltar: una ficha rara no rompe la corrida. */
export interface StoreListing {
  name: string | null;
  developer: string | null;
  /** Día (YYYY-MM-DD) de la última versión publicada. */
  updated: string | null;
  rating: number | null;
  ratingCount: number | null;
  /** Sólo Google Play ("100 k+"). */
  installs: string | null;
  icon: string | null;
}

export interface StoreSignal extends Partial<StoreListing> {
  /** `missing` = la tienda contestó 404: la app no está en la tienda de Uruguay. */
  status: "ok" | "missing";
  /** Día (YYYY-MM-DD) de la lectura. Una lectura fallida conserva la anterior con SU fecha. */
  checkedAt: string;
}

export interface AppSignals {
  android?: StoreSignal | null;
  ios?: StoreSignal | null;
}

/** Una ficha cuyo desarrollador ya no es el del catálogo: se revisa a mano, la página no lo muestra. */
export interface DeveloperChange {
  id: string;
  store: StoreName;
  expected: string;
  found: string;
}

export interface UsefulAppsCounts {
  apps: number;
  /** Fichas leídas bien en esta corrida. */
  fresh: number;
  /** Fichas que la tienda contestó con 404. */
  missing: number;
  /** Pedidos que fallaron (red, 5xx, página sin JSON-LD): conservan lo anterior. */
  failed: number;
}

export interface UsefulAppsSnapshot {
  key: string;
  capturedAt: Date;
  apps: Record<string, AppSignals>;
  counts: UsefulAppsCounts;
  developerChanges: DeveloperChange[];
}
```

- [ ] **Step 4: Write `classes/usefulapps/stores.ts`**

```ts
// Las dos fichas públicas que lee el job `currency-useful-apps`, y NADA más:
//   Google Play: https://play.google.com/store/apps/details?id=<paquete>&hl=es_419&gl=UY
//   App Store:   https://apps.apple.com/uy/app/id<id>
// Las dos rutas están permitidas por el robots.txt de cada tienda. itunes.apple.com (las API de
// búsqueda y de lookup) está en Disallow, así que no se usa aunque sería más cómoda: misma regla
// que classes/mercadopago/, no se hace un cron contra un Disallow.
//
// Qué se lee y de dónde (medido el 29–30/9/2026 con esta misma UA):
//   - las dos fichas traen JSON-LD `SoftwareApplication`: nombre, desarrollador (author.name),
//     nota (aggregateRating), cantidad de opiniones e ícono;
//   - la fecha de la última versión NO está en el JSON-LD: Play la rotula "Actualización" en el
//     HTML ("10 ago 2026"); el App Store la trae en el bloque `versionHistory`
//     (`secondarySubtitle`, fecha completa) y en un `<time datetime>` junto al número de versión;
//   - las descargas, sólo en Play ("100 k+", rotulado "Descargas").
// Un 404 es una ausencia EXPLÍCITA (la app no está en Uruguay). Cualquier otra cosa —red, 5xx, un
// 200 sin JSON-LD— es un error y la corrida conserva lo que ya sabía (refresh.ts).
import type { StoreListing, StoreName } from "./types";

export const USEFUL_APPS_UA = "cambio-uruguay.com apps bot (+https://cambio-uruguay.com)";

export function playListingUrl(pkg: string): string {
  return `https://play.google.com/store/apps/details?id=${encodeURIComponent(pkg)}&hl=es_419&gl=UY`;
}

export function appStoreListingUrl(id: string): string {
  return `https://apps.apple.com/uy/app/id${encodeURIComponent(id)}`;
}

const MONTHS: Record<string, number> = {
  ene: 0,
  feb: 1,
  mar: 2,
  abr: 3,
  may: 4,
  jun: 5,
  jul: 6,
  ago: 7,
  sep: 8,
  sept: 8,
  set: 8,
  oct: 9,
  nov: 10,
  dic: 11,
};

/** "10 ago 2026" / "3 sept. 2025" (es_419) → "2026-08-10"; `null` si no es una fecha real. */
export function parsePlayDate(text: string): string | null {
  const m = text
    .trim()
    .toLowerCase()
    .match(/^(\d{1,2})\s+([a-z]+)\.?\s+(\d{4})$/);
  if (!m) return null;
  const month = MONTHS[m[2]];
  if (month === undefined) return null;
  const day = Number(m[1]);
  const date = new Date(Date.UTC(Number(m[3]), month, day));
  if (date.getUTCDate() !== day) return null;
  return date.toISOString().slice(0, 10);
}

interface SoftwareApplicationLd {
  "@type"?: string;
  name?: string;
  image?: string;
  author?: { name?: string };
  aggregateRating?: {
    ratingValue?: string | number;
    ratingCount?: string | number;
    reviewCount?: string | number;
  };
}

function softwareApplication(html: string): SoftwareApplicationLd | null {
  const re = /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html))) {
    try {
      const data = JSON.parse(match[1]) as SoftwareApplicationLd;
      if (data && data["@type"] === "SoftwareApplication") return data;
    } catch {
      // Un bloque roto no invalida la ficha: puede haber otro.
    }
  }
  return null;
}

function num(value: unknown): number | null {
  const n = typeof value === "string" ? Number(value) : typeof value === "number" ? value : NaN;
  return Number.isFinite(n) ? n : null;
}

const ICON_PLAY = /^https:\/\/play-lh\.googleusercontent\.com\//;
const ICON_APPLE = /^https:\/\/[a-z0-9-]+\.mzstatic\.com\//;

/** Ícono de Play en 128 px: la URL acepta un sufijo de tamaño (`=s128`) que reemplaza al que traiga. */
export function playIcon(raw: string | null | undefined): string | null {
  if (!raw || !ICON_PLAY.test(raw)) return null;
  return `${raw.replace(/=[a-z0-9-]+$/i, "")}=s128`;
}

/** Ícono del App Store en 128 px: el último segmento es el tamaño (`1200x630wa.png` en el JSON-LD). */
export function appStoreIcon(raw: string | null | undefined): string | null {
  if (!raw || !ICON_APPLE.test(raw)) return null;
  return raw.replace(/\/[^/]+$/, "/128x128bb.png");
}

const PLAY_UPDATED = />(?:Actualización|Actualizado el|Updated on)<\/div>\s*<div[^>]*>([^<]+)<\/div>/;
const PLAY_INSTALLS = />([0-9][0-9.,]*\s?(?:[kKmMbB]|mil)?\s?\+)<\/div>\s*<div[^>]*>Descargas</;

export function parsePlayListing(html: string): StoreListing | null {
  const app = softwareApplication(html);
  if (!app) return null;
  const updated = html.match(PLAY_UPDATED);
  const installs = html.match(PLAY_INSTALLS);
  return {
    name: app.name ?? null,
    developer: app.author?.name ?? null,
    updated: updated ? parsePlayDate(updated[1]) : null,
    rating: num(app.aggregateRating?.ratingValue),
    ratingCount: num(app.aggregateRating?.ratingCount),
    installs: installs ? installs[1].replace(/\s+/g, " ").trim() : null,
    icon: playIcon(app.image),
  };
}

const APPLE_VERSION_TIME = /<span[^>]*>(?:Version |Versión )?\d+(?:\.\d+)+<\/span>\s*<time datetime="(\d{4}-\d{2}-\d{2})"/;

export function parseAppStoreListing(html: string): StoreListing | null {
  const app = softwareApplication(html);
  if (!app) return null;
  let updated: string | null = null;
  const history = html.indexOf('"versionHistory"');
  if (history >= 0) {
    const m = html.slice(history, history + 4000).match(/"secondarySubtitle":"([^"]+)"/);
    if (m) {
      const date = new Date(m[1].replace(/\s*\(.*\)$/, ""));
      if (!isNaN(date.getTime())) updated = date.toISOString().slice(0, 10);
    }
  }
  if (!updated) {
    const time = html.match(APPLE_VERSION_TIME);
    if (time) updated = time[1];
  }
  const rating = app.aggregateRating;
  return {
    name: app.name ?? null,
    developer: app.author?.name ?? null,
    updated,
    rating: num(rating?.ratingValue),
    ratingCount: num(rating?.reviewCount ?? rating?.ratingCount),
    installs: null,
    icon: appStoreIcon(app.image),
  };
}

export type ReadOutcome =
  | { kind: "ok"; listing: StoreListing }
  | { kind: "missing" }
  | { kind: "error"; message: string };

export type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

/**
 * Lee una ficha. Nunca tira: todo termina en ok, missing o error.
 *
 * `AbortSignal.timeout` y no un timeout estilo axios: un connect colgado nunca crea el socket y un
 * timer atado al socket no se dispara (la trampa del proxy que este repo ya pagó).
 */
export async function readListing(
  store: StoreName,
  id: string,
  fetchImpl: FetchLike = fetch,
  timeoutMs = 20000
): Promise<ReadOutcome> {
  const url = store === "android" ? playListingUrl(id) : appStoreListingUrl(id);
  let res: Response;
  try {
    res = await fetchImpl(url, {
      headers: {
        "user-agent": USEFUL_APPS_UA,
        accept: "text/html,application/xhtml+xml",
        "accept-language": "es-419,es;q=0.9",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (err) {
    return { kind: "error", message: err instanceof Error ? err.message : String(err) };
  }
  if (res.status === 404) return { kind: "missing" };
  if (!res.ok) return { kind: "error", message: `HTTP ${res.status}` };
  let html: string;
  try {
    html = await res.text();
  } catch (err) {
    return { kind: "error", message: err instanceof Error ? err.message : String(err) };
  }
  const listing = store === "android" ? parsePlayListing(html) : parseAppStoreListing(html);
  return listing ? { kind: "ok", listing } : { kind: "error", message: "la ficha no trae JSON-LD" };
}
```

- [ ] **Step 5: Run to verify it passes** — `npx vitest run tests/usefulapps/stores.test.ts` → PASS.
  Después `npx tsc -p tsconfig.production.json --noEmit --pretty false 2>&1 | grep -c "error TS"`
  → `0` (sin `--pretty false` el grep cuenta cero aunque haya errores).

- [ ] **Step 6: Commit**

```bash
git add classes/usefulapps/types.ts classes/usefulapps/stores.ts tests/usefulapps/stores.test.ts tests/usefulapps/fixtures/play-bps-personas.html tests/usefulapps/fixtures/appstore-bps-personas.html
git commit -m "feat(useful-apps): leer las fichas de Google Play y del App Store permitidas por robots"
```

---

### Task 13: Snapshot semanal: fusión, guardas, modelo y entrypoint

**Files:**
- Create: `classes/usefulapps/refresh.ts`, `classes/usefulapps/store.ts`,
  `classes/models/UsefulAppsSnapshot.ts`, `sync_useful_apps.ts`
- Test: `tests/usefulapps/refresh.test.ts`
- Modify: `tests/appdb/schema_parity.test.ts`

**Interfaces:**
- Consumes: `USEFUL_APP_STORE_IDS`/`UsefulAppStoreIds` (Task 3), `readListing`, `ReadOutcome`
  (Task 12), tipos de `types.ts`, `appModel` de `classes/appdb.ts`, `appDbConfigured`.
- Produces: `buildUsefulAppsSnapshot(options) → Promise<UsefulAppsSnapshot>`,
  `usefulAppsRunIsThin(next, previous) → string | null`, `EARLY_STOP_APPS = 10`,
  `REQUEST_GAP_MS = 1500`, `saveUsefulApps`, `loadUsefulApps`, `UsefulAppsSnapshotModel`,
  `dist/sync_useful_apps.js`.

- [ ] **Step 1: Write the failing test** — `tests/usefulapps/refresh.test.ts`

```ts
// La fusión por ficha y las guardas que impiden que una mala corrida pise un buen snapshot. Todo
// con un lector falso: sin red, sin Mongo.
import { describe, expect, it } from "vitest";
import {
  EARLY_STOP_APPS,
  buildUsefulAppsSnapshot,
  usefulAppsRunIsThin,
} from "../../classes/usefulapps/refresh";
import type { ReadOutcome } from "../../classes/usefulapps/stores";
import type { StoreListing, StoreName, UsefulAppsSnapshot } from "../../classes/usefulapps/types";

const NOW = new Date("2026-10-01T01:34:00Z");
const listing = (over: Partial<StoreListing> = {}): StoreListing => ({
  name: "X",
  developer: "Org",
  updated: "2026-09-01",
  rating: 4,
  ratingCount: 10,
  installs: null,
  icon: null,
  ...over,
});
const catalog = [
  { id: "a", android: "uy.a", ios: "111111", androidDeveloper: "Org", iosDeveloper: "Org" },
  { id: "b", android: "uy.b", androidDeveloper: "Org" },
];
const noSleep = async () => undefined;
const reader =
  (map: Record<string, ReadOutcome>) =>
  async (store: StoreName, id: string): Promise<ReadOutcome> =>
    map[`${store}:${id}`] ?? { kind: "error", message: "sin fixture" };

describe("buildUsefulAppsSnapshot", () => {
  it("guarda lo leído con la fecha del día y cuenta cada resultado", async () => {
    const snap = await buildUsefulAppsSnapshot({
      catalog,
      now: NOW,
      sleep: noSleep,
      read: reader({
        "android:uy.a": { kind: "ok", listing: listing() },
        "ios:111111": { kind: "missing" },
        "android:uy.b": { kind: "error", message: "HTTP 503" },
      }),
    });
    expect(snap.key).toBe("uy");
    expect(snap.apps.a.android).toMatchObject({ status: "ok", checkedAt: "2026-10-01", developer: "Org" });
    expect(snap.apps.a.ios).toEqual({ status: "missing", checkedAt: "2026-10-01" });
    expect(snap.apps.b.android).toBeNull();
    expect(snap.counts).toEqual({ apps: 2, fresh: 1, missing: 1, failed: 1 });
  });

  it("un error conserva la lectura anterior con SU fecha", async () => {
    const previous = {
      key: "uy",
      capturedAt: new Date("2026-09-24T01:34:00Z"),
      apps: { b: { android: { status: "ok", checkedAt: "2026-09-24", rating: 3 } } },
      counts: { apps: 2, fresh: 3, missing: 0, failed: 0 },
      developerChanges: [],
    } as UsefulAppsSnapshot;
    const snap = await buildUsefulAppsSnapshot({
      catalog,
      previous,
      now: NOW,
      sleep: noSleep,
      read: reader({
        "android:uy.a": { kind: "ok", listing: listing() },
        "ios:111111": { kind: "ok", listing: listing() },
      }),
    });
    expect(snap.apps.b.android).toEqual({ status: "ok", checkedAt: "2026-09-24", rating: 3 });
  });

  it("anota cuando una ficha ya no la publica el desarrollador esperado", async () => {
    const snap = await buildUsefulAppsSnapshot({
      catalog,
      now: NOW,
      sleep: noSleep,
      read: reader({
        "android:uy.a": { kind: "ok", listing: listing({ developer: "Otro Dueño" }) },
        "ios:111111": { kind: "ok", listing: listing({ developer: " org " }) },
        "android:uy.b": { kind: "ok", listing: listing() },
      }),
    });
    expect(snap.developerChanges).toEqual([
      { id: "a", store: "android", expected: "Org", found: "Otro Dueño" },
    ]);
  });

  it("espera entre pedido y pedido, no antes del primero", async () => {
    const waits: number[] = [];
    await buildUsefulAppsSnapshot({
      catalog,
      now: NOW,
      gapMs: 1500,
      sleep: async ms => {
        waits.push(ms);
      },
      read: reader({}),
    });
    expect(waits).toEqual([1500, 1500]);
  });

  it("corta sin escribir si las primeras apps no consiguieron ninguna respuesta", async () => {
    const many = Array.from({ length: EARLY_STOP_APPS + 5 }, (_, i) => ({
      id: `x${i}`,
      android: `uy.x${i}`,
    }));
    await expect(
      buildUsefulAppsSnapshot({ catalog: many, now: NOW, sleep: noSleep, read: reader({}) })
    ).rejects.toThrow(/no obtuvieron ninguna respuesta/);
  });
});

describe("usefulAppsRunIsThin", () => {
  const snap = (fresh: number, missing: number, failed: number) =>
    ({
      key: "uy",
      capturedAt: NOW,
      apps: {},
      developerChanges: [],
      counts: { apps: fresh + missing + failed, fresh, missing, failed },
    }) as UsefulAppsSnapshot;

  it("acepta una corrida sana, incluida la primera", () => {
    expect(usefulAppsRunIsThin(snap(200, 2, 10), null)).toBeNull();
    expect(usefulAppsRunIsThin(snap(200, 2, 10), snap(210, 1, 0))).toBeNull();
  });

  it("rechaza si falló más de la mitad de los pedidos", () => {
    expect(usefulAppsRunIsThin(snap(50, 0, 60), null)).toMatch(/fallaron 60 de 110/);
  });

  it("rechaza si contestaron menos de la mitad que la vez anterior", () => {
    expect(usefulAppsRunIsThin(snap(40, 0, 30), snap(200, 0, 0))).toMatch(/sólo 40 fichas/);
  });

  it("una corrida sin pedidos no escribe", () => {
    expect(usefulAppsRunIsThin(snap(0, 0, 0), null)).toMatch(/ninguna ficha/);
  });
});
```

- [ ] **Step 2: Run to verify it fails** — `npx vitest run tests/usefulapps/refresh.test.ts` → FAIL.

- [ ] **Step 3: Write `classes/usefulapps/refresh.ts`**

```ts
// Arma el snapshot semanal de /apps-utiles-uruguay: una lectura por ficha de tienda, en serie.
//
// La fusión es la de classes/stores/profile.ts (`mergeSignal`): un error conserva lo anterior CON
// SU FECHA VIEJA —la página decide si ya es demasiado viejo para mostrarlo—, y un 404 es una
// ausencia explícita que reemplaza lo que hubiera. Dos guardas, las dos con precedente en el repo:
// corte temprano si las primeras 10 apps no consiguieron ninguna respuesta (tiendas caídas o nos
// bloquearon: no se escribe nada), y `usefulAppsRunIsThin` para una corrida a medias.
import { USEFUL_APP_STORE_IDS, type UsefulAppStoreIds } from "./catalog";
import { readListing, type ReadOutcome } from "./stores";
import {
  USEFUL_APPS_KEY,
  type AppSignals,
  type DeveloperChange,
  type StoreName,
  type UsefulAppsCounts,
  type UsefulAppsSnapshot,
} from "./types";

export const EARLY_STOP_APPS = 10;
/** Entre pedido y pedido: son unos 230 por semana, no hay apuro. */
export const REQUEST_GAP_MS = 1500;

export type Reader = (store: StoreName, id: string) => Promise<ReadOutcome>;

export interface BuildOptions {
  catalog?: readonly UsefulAppStoreIds[];
  previous?: UsefulAppsSnapshot | null;
  now?: Date;
  read?: Reader;
  sleep?: (ms: number) => Promise<void>;
  gapMs?: number;
}

const tidy = (value: string) => value.trim().toLowerCase().replace(/\s+/g, " ");
const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export async function buildUsefulAppsSnapshot(options: BuildOptions = {}): Promise<UsefulAppsSnapshot> {
  const catalog = options.catalog ?? USEFUL_APP_STORE_IDS;
  const now = options.now ?? new Date();
  const today = now.toISOString().slice(0, 10);
  const read: Reader = options.read ?? ((store, id) => readListing(store, id));
  const sleep = options.sleep ?? delay;
  const gapMs = options.gapMs ?? REQUEST_GAP_MS;
  const previousApps = options.previous?.apps ?? {};

  const apps: Record<string, AppSignals> = {};
  const counts: UsefulAppsCounts = { apps: catalog.length, fresh: 0, missing: 0, failed: 0 };
  const developerChanges: DeveloperChange[] = [];
  let requests = 0;

  for (let index = 0; index < catalog.length; index++) {
    const entry = catalog[index];
    const signals: AppSignals = {};
    for (const store of ["android", "ios"] as const) {
      const id = store === "android" ? entry.android : entry.ios;
      if (!id) continue;
      if (requests > 0) await sleep(gapMs);
      requests++;
      const outcome = await read(store, id);
      if (outcome.kind === "ok") {
        counts.fresh++;
        signals[store] = { status: "ok", checkedAt: today, ...outcome.listing };
        const expected = store === "android" ? entry.androidDeveloper : entry.iosDeveloper;
        const found = outcome.listing.developer;
        if (expected && found && tidy(expected) !== tidy(found)) {
          developerChanges.push({ id: entry.id, store, expected, found });
        }
      } else if (outcome.kind === "missing") {
        counts.missing++;
        signals[store] = { status: "missing", checkedAt: today };
      } else {
        counts.failed++;
        // Lo anterior con su fecha, o null si nunca se leyó: la ausencia de dato no es una ausencia
        // de la app.
        signals[store] = previousApps[entry.id]?.[store] ?? null;
      }
    }
    apps[entry.id] = signals;
    if (index + 1 === EARLY_STOP_APPS && counts.fresh + counts.missing === 0) {
      throw new Error(
        `las primeras ${EARLY_STOP_APPS} apps no obtuvieron ninguna respuesta de las tiendas; no se escribe nada`
      );
    }
  }

  return { key: USEFUL_APPS_KEY, capturedAt: now, apps, counts, developerChanges };
}

/** Motivo para NO pisar el snapshot guardado, o `null` si la corrida está sana. */
export function usefulAppsRunIsThin(
  next: UsefulAppsSnapshot,
  previous: UsefulAppsSnapshot | null
): string | null {
  const answered = next.counts.fresh + next.counts.missing;
  const asked = answered + next.counts.failed;
  if (asked === 0) return "la corrida no pidió ninguna ficha";
  if (next.counts.failed * 2 > asked) return `fallaron ${next.counts.failed} de ${asked} fichas`;
  const before = previous ? previous.counts.fresh + previous.counts.missing : 0;
  if (before >= 20 && answered * 2 < before) {
    return `sólo ${answered} fichas contestaron contra ${before} de la corrida anterior`;
  }
  return null;
}
```

- [ ] **Step 4: Write `classes/models/UsefulAppsSnapshot.ts` and `classes/usefulapps/store.ts`**

```ts
// Mirror of app/server/models/UsefulAppsSnapshot.ts, bound to the APP's Mongo (classes/appdb.ts) —
// NOT the backend's. `sync_useful_apps.ts` upserts the single `key:"uy"` document;
// /api/useful-apps/stores serves it (compacted) to /apps-utiles-uruguay. Mixed on purpose: every
// field is re-readable from a public store listing next week.
import { Schema } from "mongoose";
import { appModel } from "../appdb";
import type { UsefulAppsSnapshot } from "../usefulapps/types";

const UsefulAppsSnapshotSchema = new Schema(
  {
    key: { type: String, required: true, unique: true },
    capturedAt: { type: Date, required: true },
    apps: { type: Schema.Types.Mixed, default: {} },
    counts: { type: Schema.Types.Mixed, default: {} },
    developerChanges: { type: [Schema.Types.Mixed], default: [] },
  },
  { timestamps: true }
);

export const UsefulAppsSnapshotModel = appModel<UsefulAppsSnapshot>(
  "UsefulAppsSnapshot",
  UsefulAppsSnapshotSchema,
  "usefulappssnapshots"
);
```

```ts
// One living document, upserted. No history: the stores ARE the archive, and every field can be
// re-read next week.
import { UsefulAppsSnapshotModel } from "../models/UsefulAppsSnapshot";
import { USEFUL_APPS_KEY, type UsefulAppsSnapshot } from "./types";

export async function saveUsefulApps(snapshot: UsefulAppsSnapshot): Promise<void> {
  await UsefulAppsSnapshotModel.updateOne(
    { key: USEFUL_APPS_KEY },
    { $set: { ...snapshot, key: USEFUL_APPS_KEY } },
    { upsert: true }
  );
}

/** El documento guardado, para fusionar y para comparar la corrida nueva. */
export async function loadUsefulApps(): Promise<UsefulAppsSnapshot | null> {
  return UsefulAppsSnapshotModel.findOne({ key: USEFUL_APPS_KEY }).lean<UsefulAppsSnapshot>().exec();
}
```

- [ ] **Step 5: Write `sync_useful_apps.ts`** (raíz)

```ts
// Weekly store snapshot (pm2 app `currency-useful-apps`) for /apps-utiles-uruguay. Reads the public
// Google Play and App Store listing of every app in classes/usefulapps/catalog.ts — icon, rating,
// number of ratings, last version and whether the listing still exists in Uruguay — and writes ONE
// document (`usefulappssnapshots`) into the NUXT APP's database, which /api/useful-apps/stores
// serves to the page.
//
// Only the two listing pages each store's robots.txt allows (classes/usefulapps/stores.ts).
// Never blanks the stored snapshot: if the first 10 apps get no answer the stores are down (or we
// are blocked) and nothing is written; a run where more than half the requests failed, or that got
// answers for less than half of the previous run, is refused too. A failed read keeps the previous
// value WITH ITS OLD DATE, and the page stops trusting it after 60 days.
import dotenv from "dotenv";
dotenv.config();

import { appDbConfigured } from "./classes/appdb";
import { buildUsefulAppsSnapshot, usefulAppsRunIsThin } from "./classes/usefulapps/refresh";
import { loadUsefulApps, saveUsefulApps } from "./classes/usefulapps/store";

async function main(): Promise<void> {
  if (!appDbConfigured()) {
    console.error(
      "[useful-apps] APP_MONGO_URI is not set — refusing to run. The snapshot lives in the Nuxt " +
        "app's database (copy the value from app/.env's MONGO_URI); writing it to the backend " +
        "database would leave /apps-utiles-uruguay without icons forever with no error anywhere."
    );
    process.exit(1);
  }

  try {
    const previous = await loadUsefulApps();
    const snapshot = await buildUsefulAppsSnapshot({ previous });
    const { apps, fresh, missing, failed } = snapshot.counts;
    console.log(
      `[useful-apps] ${apps} apps · ${fresh} fichas leídas · ${missing} ausentes (404) · ${failed} fallidas`
    );
    for (const [id, signals] of Object.entries(snapshot.apps)) {
      for (const store of ["android", "ios"] as const) {
        if (signals[store]?.status === "missing") {
          const name = store === "android" ? "Google Play" : "el App Store";
          console.warn(`[useful-apps] ${id}: ya no está en ${name} de Uruguay`);
        }
      }
    }
    for (const change of snapshot.developerChanges) {
      console.warn(
        `[useful-apps] ${change.id} (${change.store}): el desarrollador era «${change.expected}» ` +
          `y ahora es «${change.found}» — revisar el catálogo`
      );
    }

    const refusal = usefulAppsRunIsThin(snapshot, previous);
    if (refusal) {
      console.error(`[useful-apps] ${refusal}; no se pisa el snapshot anterior.`);
      process.exit(1);
    }

    await saveUsefulApps(snapshot);
    console.log(`[useful-apps] guardado ${snapshot.capturedAt.toISOString()}`);
    process.exit(0);
  } catch (err) {
    console.error("[useful-apps] falló:", err);
    process.exit(1);
  }
}

void main();
```

- [ ] **Step 6: Paridad de esquema** — en `tests/appdb/schema_parity.test.ts` agregar el import
  `import { UsefulAppsSnapshotModel } from "../../classes/models/UsefulAppsSnapshot";` junto a los
  otros y, dentro del `describe`, el caso:

```ts
  it("UsefulAppsSnapshot declares exactly the app's top-level fields", () => {
    // La foto semanal de las tiendas para /apps-utiles-uruguay: un campo que el job escriba y el app
    // no declare se guarda igual, pero la ruta no lo ve nunca.
    expect(Object.keys(UsefulAppsSnapshotModel.schema.obj).sort()).toEqual(
      appFields(appModel("UsefulAppsSnapshot")).sort()
    );
    expect(UsefulAppsSnapshotModel.collection.name).toBe("usefulappssnapshots");
  });
```

- [ ] **Step 7: Run** — `npx vitest run tests/usefulapps tests/appdb/schema_parity.test.ts` → PASS;
  `npx tsc -p tsconfig.production.json --noEmit --pretty false 2>&1 | grep -c "error TS"` → `0`.

- [ ] **Step 8: Commit**

```bash
git add classes/usefulapps/refresh.ts classes/usefulapps/store.ts classes/models/UsefulAppsSnapshot.ts sync_useful_apps.ts tests/usefulapps/refresh.test.ts tests/appdb/schema_parity.test.ts
git commit -m "feat(useful-apps): snapshot semanal con fusión por ficha y dos guardas"
```

---

### Task 14: Registrar el job y documentar

**Files:**
- Modify: `ecosystem.config.js`, `scripts/deploy-backend.sh`, `AGENTS.md`, `classes/AGENTS.md`
- Create: `docs/app/APPS_UTILES.md`

- [ ] **Step 1: pm2** — en `ecosystem.config.js`, después del objeto de `currency-videos`:

```js
    {
      // Apps útiles (/apps-utiles-uruguay). Reads the public Google Play and App Store listing of
      // every app in classes/usefulapps/catalog.ts (robots-allowed pages only, ~230 requests at
      // 1.5 s) and writes icon, rating, last version and availability into the Nuxt app's
      // database. Weekly: ratings and versions move in weeks. Thursday 01:34 UTC — a minute used by
      // no other job and a night with nothing else running. Needs APP_MONGO_URI.
      name: "currency-useful-apps",
      autorestart: false,
      exec_mode: "fork",
      script: "dist/sync_useful_apps.js",
      cron_restart: "34 1 * * 4",
      log_date_format: "YYYY-MM-DD HH:mm Z",
    },
```

- [ ] **Step 2: Deploy** — en `scripts/deploy-backend.sh`, agregar ` currency-useful-apps` al final
  del arreglo `OTHER_APPS=(…)` (antes del `)`), en la misma línea.

- [ ] **Step 3: Run the fleet tripwires** — `npx vitest run tests/sync/pm2_registration.test.ts tests/no_scheduler_in_api.test.ts` → PASS.

- [ ] **Step 4: AGENTS.md** — en la tabla de pm2, después de la fila de `currency-videos`:

```markdown
| currency-useful-apps | dist/sync_useful_apps.js | 34 1 * * 4 | `/apps-utiles-uruguay`: lee la ficha pública de Google Play (`/store/apps/details?…&gl=UY`) y del App Store (`apps.apple.com/uy/app/id…`) de cada app de `classes/usefulapps/catalog.ts` —ícono, nota, opiniones, última versión, si sigue en la tienda de Uruguay— y escribe UN documento en APP DB `usefulappssnapshots`. **Nunca `itunes.apple.com`**: sus `/lookup` y `/search` están en Disallow. Un 404 es ausencia explícita; un error conserva lo anterior con su fecha, y la página deja de mostrarlo a los 60 días. No escribe si las primeras 10 apps no consiguen respuesta, si falla más de la mitad de los pedidos o si contesta menos de la mitad que la corrida anterior. Avisa en el log si el desarrollador de una ficha ya no es el del catálogo. El catálogo es espejo de `app/utils/usefulAppsCatalog.ts` (paridad en `app/tests/unit/usefulAppsCatalogParity.test.ts`). Necesita `APP_MONGO_URI`. Ver `docs/app/APPS_UTILES.md` |
```

  y en la lista "Root pm2 entrypoints live at repo root" agregar `sync_useful_apps.ts` al final.

- [ ] **Step 5: classes/AGENTS.md** — en la tabla de carpetas, después de la fila de `videos/`:

```markdown
| `usefulapps/` | las fichas de tienda de /apps-utiles-uruguay. `catalog`(espejo de `app/utils/usefulAppsCatalog.ts`: id, paquete, id del App Store y desarrollador esperado),`stores`(parsers del JSON-LD de las dos fichas + la fecha de versión, que no está en el JSON-LD; sólo rutas permitidas por robots),`refresh`(fusión por ficha: error conserva lo anterior con su fecha, 404 es ausencia; corte temprano y `usefulAppsRunIsThin`),`store`,`types` |
```

- [ ] **Step 6: Write `docs/app/APPS_UTILES.md`**

```markdown
# Apps útiles (`/apps-utiles-uruguay`)

Directorio de las apps que sirven para vivir en Uruguay: las del Estado que todos deberían tener
(kit con casillas) y las del día a día, en 10 pestañas con filtros.

## De dónde sale cada cosa

| Qué | Dónde | Quién lo mantiene |
|---|---|---|
| Qué apps entran, qué hacen, a quién le sirven | `app/utils/usefulAppsCatalog.ts` | a mano, con la fecha `USEFUL_APPS_VERIFIED_AT` |
| Paquete, id del App Store, desarrollador | el mismo archivo + `classes/usefulapps/catalog.ts` (paridad testeada) | a mano, copiado de la ficha |
| Ícono, nota, opiniones, última versión, si sigue en la tienda | APP DB `usefulappssnapshots` | job semanal `currency-useful-apps` |
| Kit, "no es una app", criterios, FAQ | `app/utils/usefulAppsContent.ts` | a mano |

## Reglas

- Sólo apps que hoy están en Google Play o en el App Store de **Uruguay**, publicadas por la
  organización que presta el servicio. Una no oficial entra sólo si es muy usada, con `kind:
  'comunidad'`, una nota que lo dice y `officialAlternative`.
- Más de 24 meses sin versión nueva: afuera, salvo que sea la única oficial de su servicio (INUMET,
  la app de la IM, Consulta de Expedientes); la tarjeta lo avisa sola con el dato del job.
- El desarrollador se copia **de la ficha**, nunca de la investigación: es lo que el lector compara
  antes de instalar.
- Sin afiliados; `rel="noopener noreferrer nofollow"`.

## El job

Ver la fila `currency-useful-apps` en `AGENTS.md`. Sólo lee `play.google.com/store/apps/details` y
`apps.apple.com/uy/app/id…` (robots.txt las permite); `itunes.apple.com` está en Disallow. La fecha
de versión no viene en el JSON-LD: Play la rotula "Actualización" en el HTML y el App Store la
trae en `versionHistory`.

## Agregar o corregir una app

1. Abrir las dos fichas (Play con `&gl=UY`, App Store con `/uy/`) y la página del organismo.
2. Editar `app/utils/usefulAppsCatalog.ts` **y** `classes/usefulapps/catalog.ts`.
3. `cd app && npx vitest run tests/unit/usefulAppsCatalog.test.ts tests/unit/usefulAppsCatalogParity.test.ts`.
4. Actualizar `USEFUL_APPS_VERIFIED_AT` si se revisó todo el catálogo.
```

- [ ] **Step 7: Commit**

```bash
git add ecosystem.config.js scripts/deploy-backend.sh AGENTS.md classes/AGENTS.md docs/app/APPS_UTILES.md
git commit -m "chore(useful-apps): registrar currency-useful-apps y documentar el directorio"
```

---

### Task 15: Verificación completa

- [ ] **Step 1: Suites y lint**

Run (desde `app/`): `npm run lint` → 0 errores; `npm run test` → todo verde (re-correr solos los
tests de tiempo si fallan bajo carga: `sitemap-urls`, `llmsFull`, `deploySourceSync`).
Run (raíz): `npm test` → todo verde; `npx tsc -p tsconfig.production.json --noEmit --pretty false`
sin errores.

- [ ] **Step 2: gitleaks del rango** — con gitleaks 8.30.1:
`gitleaks git . --log-opts="origin/main..HEAD" --redact=100` → sin hallazgos (los ids de App Store
van en campos `id`, nunca `key`).

- [ ] **Step 3: La página de verdad** — dev server del worktree (`cd app && npm run dev`, puerto
libre) y Playwright:
  - 390 px y 1280 px, tema claro y oscuro: sin scroll horizontal, pastillas que envuelven en
    escritorio y `<details>` en celular, tarjetas de 44 px de alto mínimo en los botones.
  - JavaScript apagado: `?categoria=salud` llega filtrado del servidor; tocar una pestaña navega.
  - Con JavaScript: cambiar de pestaña no recarga, la URL cambia sin saltar el scroll; buscar
    "app de la luz" deja UTE; "omnibus" deja Cómo ir y STM Montevideo con su aviso; filtro
    Departamento = Salto deja las nacionales y la de Salto.
  - Kit: marcar dos casillas, recargar, siguen marcadas; en modo privado la página no se rompe.
  - Sin documento de tiendas (dev lee una base sin `usefulappssnapshots`): monogramas y ningún
    error en consola; sin mensajes de hidratación.
  - `app/scripts/lightmode-axe.mjs` sobre la ruta: sin fallas de contraste nuevas.

- [ ] **Step 4: Corrida del job local contra las tiendas (sin escribir)** — `npx ts-node -e` con
`buildUsefulAppsSnapshot({ catalog: USEFUL_APP_STORE_IDS.slice(0, 5) })` e imprimir el resultado:
las 5 fichas con `status: 'ok'`, fecha y desarrollador iguales a los del catálogo.

---

### Task 16: Integrar y desplegar

- [ ] **Step 1:** Revisión de toda la rama (workflow de revisión adversarial) y arreglos.
- [ ] **Step 2:** Integrar con `origin/main` desde un worktree temporal (memoria
  `push-desde-worktree-temporal`): `git fetch`, `git worktree add --detach <tmp> origin/main`,
  `git merge feat/apps-utiles-uruguay`, resolver, re-correr los contratos de la página y de
  experimentos, `git push origin HEAD:main`. Todos los cambios de `app/` en UN push (la cancelación
  por concurrencia deja app sin desplegar si el commit que sobrevive no toca `app/`).
- [ ] **Step 3:** `gh run watch` del run de CI/Deploy hasta verde (test, backend-test, deploy,
  backend-deploy).
- [ ] **Step 4:** Medir producción: `curl -s https://cambio-uruguay.com/apps-utiles-uruguay` →
  200, H1, canonical, JSON-LD con BreadcrumbList e ItemList; `?categoria=salud` filtrado;
  `/api/useful-apps/stores` → documento con `capturedAt` de hoy (el deploy arranca el job una vez) o
  `null` si todavía no corrió; `pm2 describe currency-useful-apps` en el VPS con el cron
  `34 1 * * 4` y el log de la primera corrida.
- [ ] **Step 5:** Podar ramas mergeadas (orden permanente) y sacar el worktree
  (`git worktree remove`), verificando antes que no queden junctions.
