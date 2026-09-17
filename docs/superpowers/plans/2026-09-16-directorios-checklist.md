# Checklist: job del backend + familia de páginas del app (referencia para los planes de directorios)

Relevado del código el 16/9/2026. Cada plan de `2026-09-16-directorios-*` lo da por leído.

## 1. Job del backend
- Entrypoint en la raíz `sync_<nombre>.ts` (regex `^(sync_|import_)[a-z0-9_]*\.ts$`, lo vigila
  `tests/sync/connect_tripwire.test.ts`). Copiar `sync_equipar.ts`: `dotenv.config(); dotenv.config({ path: "app/.env" })`;
  en `main()` `process.env.APP_MONGO_URI = process.env.APP_MONGO_URI || process.env.MONGO_URI; if (!appDbConfigured()) exit(1)`;
  terminar con `process.exit(0)` y `main().catch(() => exit(1))`.
- `classes/appdb.ts`: `appDbConfigured()`, `appConnection()`, `appModel<T>(name, schema, collection)` (Proxy perezoso).
- Si el job toca la base del backend, `await withTimeout(MongooseServer.startConnectionPromise(), 15000)`.
- Dos copias de cada modelo: backend `classes/models/<X>.ts` con `appModel<T>("X", XSchema, "<coleccion>")`; app
  `app/server/models/<X>.ts` con `(mongoose.models.X as Model<T>) || mongoose.model<T>('X', XSchema, '<coleccion>')`.
  Siempre fijar el nombre de colección.
- `tests/appdb/schema_parity.test.ts`: importar el modelo backend, agregar
  `it("<X> declares exactly the app's top-level fields")` y `expect(XModel.collection.name).toBe("…")` en el bloque de
  nombres. **Trampa de formato:** el schema del app necesita segundo argumento (`{ timestamps: true }`) y campos a 4
  espacios exactos, o la regex de `appFields` no lo lee.
- `ecosystem.config.js`: `{ name, autorestart: false, exec_mode: "fork", script: "dist/sync_<x>.js", env, args?, cron_restart, log_date_format: "YYYY-MM-DD HH:mm Z" }`,
  minuto que no sea múltiplo de 5 y lejos de jobs que pegan a los mismos hosts.
- `scripts/deploy-backend.sh:51` → agregar a `OTHER_APPS`. Lo exige `tests/sync/pm2_registration.test.ts`.
- `tsconfig.production.json` compila todos los `sync_*.ts` de la raíz solo.
- `tests/no_scheduler_in_api.test.ts`: nada de `setInterval`/cron en lo alcanzable desde `index.ts`.
- `AGENTS.md`: fila en la tabla pm2 + entrypoint en la lista de la línea ~61 + carpeta en la línea de `classes/`.

## 2. Ruta de API del app
- `app/server/api/<familia>/index.get.ts` y `[slug].get.ts`, `defineEventHandler`,
  `setResponseHeader(event,'cache-control','public, max-age=900, s-maxage=900, stale-while-revalidate=86400')`,
  `await connectDb()` (`app/server/utils/db.ts`), filtro `lastSeen >= cutoff`, `.select()` explícito + `.lean()`,
  recortar arrays en el servidor, `try/catch` que devuelve forma vacía (nunca 500), ordenar en JS.
- Tipos y helpers puros en `app/utils/<familia>.ts`, importados de forma relativa.

## 3. Páginas
- **404 real** con `definePageMeta({ validate })` (un `createError` después de un `await` responde 200; lo vigila
  `app/tests/unit/soft404Guards.test.ts`). Patrón con API (`pages/descuentos-con-tarjeta-uruguay/marca/[marca].vue:207-219`):
  ```ts
  definePageMeta({
    validate: async route => {
      const slug = String(route.params.marca ?? '')
      if (!/^[a-z0-9][a-z0-9-]{0,80}$/.test(slug)) return false
      try { await $fetch(`/api/bankos/marca/${slug}`); return true } catch { return false }
    },
  })
  ```
  Para slugs de una lista estática, validar contra la lista importada (funciones importadas o código inline; no
  constantes de módulo). La ruta `[slug].get.ts` debe responder **404** (`throw createError({ statusCode: 404 })`) cuando
  no existe, para que `$fetch` falle. La ficha de sillas NO tiene validate: no copiar eso.
- Raíz del template: `<VContainer>` (`tests/unit/pageContainer.test.ts`).
- SEO: `defineOgImageComponent('Cambio', { title, subtitle, tag })`; `useSeoMeta({ title, description, ogTitle, ogDescription, ogType, ogUrl, twitterCard })`;
  `useHead(() => ({ link: [{ rel: 'canonical', href }], script: [{ type: 'application/ld+json', innerHTML: JSON.stringify(graph) }] }))`.
  Referencia `pages/equipar-casa-uruguay.vue:410-480`.
- **Familias sólo en español** (como comparativas y sucursal): canonical fijo sin prefijo de idioma
  (`https://cambio-uruguay.com/<ruta>`) y en el sitemap `urls.push({ loc, … })`, no `addUrlsForAllLocales`.
- JSON-LD a mano en `@graph` con `BreadcrumbList`. FAQ: `<FaqSection :items :heading />` emite `FAQPage`; no agregar otro.
- Datos: `await useFetch(url, { key, transform })` — recortar en `transform`, nunca en un `computed`, y meter el
  discriminante de ruta en la `key`.
- Gráfico de líneas: `<ChartsLineChart :data :options aria-label>` (`components/charts/LineChart.vue`, chart.js).

## 4. Sitemap (`app/server/api/__sitemap__/urls.get.ts`)
- Hubs salen solos de `NAV_SECTIONS`. Slugs dinámicos como sillas (líneas ~266-289) dentro de
  `try { await connectDb(); … } catch { console.warn } finally { await disconnectDbAfterPrerender() }` — el `finally` es
  obligatorio (`sitemap-urls.test.ts:179`).

## 5. Navegación (`app/utils/siteNav.ts`)
- Hub en `NAV_SECTIONS` (`to`, `labelKey`, `icon: 'mdi-…'`, `priority`, `changefreq`, `fresh`, `keywords`); `labelKey`
  en `i18n/locales/json/{es,en,pt}.json`; `'<dir>/[slug]': '<sectionId>'` en `DYNAMIC_ROUTE_KEYS`.
- `tests/unit/siteNav-coverage.test.ts` falla por página sin nav, bracket sin `DYNAMIC_ROUTE_KEYS`, clave vieja,
  sección inexistente, rutas duplicadas, sin `labelKey`/icono, o cambios en `EXCLUDED_ROUTES`.
- `tests/unit/internalLinks.test.ts` revisa todo `to: '/…'`, `href: '/…'`, `localePath('/…')` en pages, components,
  layouts **y utils**: cada literal debe resolver a un archivo de página.
- Recirculación opcional en `CURATED` de `utils/relatedPages.ts` (rutas reales de nav).

## 6. Contrato SEO (`app/tests/unit/seoContract.test.ts`)
- Registrar la familia en `PROGRAMMATIC_PAGES`: `{ file: '<dir>/index.vue', sitemapMarker: '/<dir>' }, { file: '<dir>/[slug].vue', sitemapMarker: '`/<dir>/${slug}`' }`
  (el marcador tiene que aparecer literal en `urls.get.ts`). Exige `useSeoMeta(` con `title`, `description`, `ogTitle:`,
  `ogDescription:`; `rel: 'canonical'` y `https://cambio-uruguay.com`; `application/ld+json`, `https://schema.org`,
  `BreadcrumbList`; exactamente un `<h1`; sin `noindex`.
- Trinquete global: toda página indexable necesita `useSeoMeta(`, `rel: 'canonical'`, `application/ld+json` y un H1.

## 7. Anuncios
- `app/utils/ads.ts`: nada que registrar (default `normal`).

## 8. Componentes
- Vuetify se registra a mano en `app/plugins/vuetify.ts`. Registrados: VAlert, VApp, VAppBar, VAppBarNavIcon,
  VAutocomplete, VAvatar, VBadge, VBanner, VBottomSheet, VBreadcrumbs(+Item/Divider), VBtn, VBtnToggle, VCard(+Actions/
  Item/Subtitle/Text/Title), VCheckbox, VChip, VChipGroup, VCol, VContainer, VDataTable, VDatePicker, VDialog, VDivider,
  VExpandTransition, VFadeTransition, VExpansionPanel(s/Text/Title), VFooter, VIcon, VImg, VList(+Group/Item/
  ItemSubtitle/ItemTitle/Subheader), VMain, VMenu, VNavigationDrawer, VOverlay, VPagination, VProgressCircular,
  VProgressLinear, VRadio, VRadioGroup, VRow, VSelect, VSheet, VSkeletonLoader, VSlider, VSnackbar, VSpacer, VSwitch,
  VTable, VTab, VTabs, VTabsWindow(+Item), VTextarea, VTextField, VTimeline(+Item), VToolbar(+Items/Title), VTooltip,
  VWindow(+Item).
- `components/<dir>/X.vue` se usa como `<DirX>` salvo que el archivo ya empiece con el nombre del directorio
  (`tests/unit/componentResolution.test.ts`). `useDisplay`/`useTheme` se importan de `'vuetify'`.

## 9. Utils del app
- Namespace plano de auto-import: prefijar todo export con el nombre de la familia. Utils puros, sin Vue/Nuxt,
  imports relativos.

## 10. Otros tripwires del app
- `dateLocale.test.ts` (usar `dateLocale()` de `utils/format.ts`, "setiembre"), `noChipInsideParagraph.test.ts`,
  `i18nMessagePipes.test.ts` (sin `|` crudo en JSON), `scopedStyles.test.ts`, `noGeminiInApp.test.ts`,
  `payloadTransforms.test.ts`. Texto azul chico: `rgb(var(--v-theme-link))`, nunca `--v-theme-primary`.

## 11. Correr
- App (en `app/`): `npm test`, `npm run lint` (`typecheck` está roto).
- Raíz: `npm test`, `npm run build`. Fallan en local y pasan en CI: `tests/gemini_key_ownership.test.ts` y
  `tests/claude_endpoint_ownership.test.ts` cuando hay copias del repo en `.artifacts/`/`.sdd-*` (en un worktree
  aparte no deberían fallar).
- **Nunca** correr un `sync_*` contra la base sin `--dry-run`: el `.env` local apunta a producción.

## 12. Docs
- `docs/app/<FAMILIA>.md` + fila en `AGENTS.md`.
