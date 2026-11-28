# Engagement A/B Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tres experimentos A/B (jubilaciones, invitación por tema, tarjeta de alquileres), el bloque de siguiente paso en las páginas sueltas y los pasos de consola documentados.

**Architecture:** Asignación antes de pintar (script literal en el `<head>`) + CSS por atributo de `<html>`; registro puro en `utils/abTests.ts`; medición por propiedades de usuario de GA4 y etiquetas de Clarity; aviso por tema con modelo, tres rutas y una tarea Nitro con reclamo único.

**Tech Stack:** Nuxt 4.4, Vuetify 4.2, mongoose, vitest, nuxt-gtag.

**Spec:** `docs/superpowers/specs/2026-11-28-engagement-ab-design.md`

## Global Constraints

- HTML del servidor idéntico para todos; ninguna variante después de pintar en la primera pantalla.
- `navigator.webdriver` → sin marca (control). Fuera de `startsOn..endsOn` → sin marca.
- Atributos: `data-ab-jubilaciones`, `data-ab-seguimiento`, `data-ab-alquiler-tarjeta`, valores `a|b`.
- Propiedades de usuario GA4: `ab_jubilaciones`, `ab_seguimiento`, `ab_alquiler_tarjeta`.
- Ventanas: jubilaciones 2026-11-29..2027-02-15, seguimiento 2026-11-29..2027-01-31, alquiler-tarjeta 2026-11-29..2027-01-15.
- Tema de aviso: `aumento-jubilaciones-2027` (lista blanca). Doble confirmación. Sin cifras de ingreso en el repo.
- No tocar anuncios ni el loader (lectura del bucle de AdSense hasta 2026-12-02).

## Review Focus

- Visitante con `localStorage` bloqueado: el script no tira, no marca (control) y la página se ve igual.
- Dos workers corren `topics:notify` a la vez: un solo correo por suscriptor y estado.
- Suscribirse dos veces al mismo tema: no duplica, reenvía confirmación sólo si está pendiente.
- Calculadora con entrada vacía, negativa o con separadores uruguayos ("25.000,50"): sin NaN en pantalla.
- e2e de alquileres a 320/390 px: sin marca → tarjeta de siempre.

---

### Task 1: Asignación y medición

**Files:** Create `app/utils/abTests.ts`, `app/composables/useAbVariant.ts`, `app/plugins/ab-tests.client.ts`, `app/tests/unit/abTests.test.ts`. Modify `app/nuxt.config.ts` (`PREPAINT_AB_SCRIPT` + `app.head.script`), `app/tests/unit/prepaint.test.ts` (o test propio que corre el string).

**Interfaces — Produces:**
- `AB_TESTS: readonly AbTest[]` con `{ id: 'jubilaciones'|'seguimiento'|'alquiler-tarjeta', param: string, startsOn: string, endsOn: string }`
- `abHash(s: string): number` (FNV-1a 32 bits), `abVariant(visitor: string, id: string): 'a'|'b'` (`abHash(visitor+':'+id) % 2 === 1 ? 'b' : 'a'`), `abActive(test, todayIso): boolean`
- `useAbVariant(id): Ref<'a'|'b'|null>` (null en SSR/antes de montar; lee `document.documentElement.dataset`)

- [ ] Test: el string del script, corrido con `localStorage` falso con `cu_ab=v1` y fecha dentro de la ventana, marca los tres atributos con lo mismo que `abVariant('v1', id)`; sin id lo crea; con `navigator.webdriver` no marca; fuera de ventana no marca; con `localStorage` que tira, no tira.
- [ ] Test: la lista de ids/ventanas del literal coincide con `AB_TESTS`.
- [ ] Implementar, correr, commit.

### Task 2: Aviso por tema (backend)

**Files:** Create `app/server/models/TopicSubscription.ts`, `app/server/utils/topics.ts`, `app/server/api/topics/subscribe.post.ts`, `confirm.get.ts`, `unsubscribe.get.ts`, `app/server/tasks/topics/notify.ts`, `app/tests/unit/topics.test.ts`. Modify `nuxt.config.ts` (`scheduledTasks` `'25 * * * *': ['topics:notify']`), página de privacidad (una línea).

**Interfaces — Produces:** `TOPICS = { 'aumento-jubilaciones-2027': { path, stateOf(): 'pendiente'|'provisorio'|'definitivo', message(state, lang) } }`, `isTopic(x)`, `buildTopicConfirmEmail`, `buildTopicNoticeEmail`, `topicStatesToNotify(current, notified): string[]` (pendiente nunca se avisa).

- [ ] Tests puros de `topicStatesToNotify` y de los constructores de correo (enlaces de confirmar/baja, sin HTML del usuario).
- [ ] Implementar endpoints con el patrón de `newsletter/subscribe.post.ts` (honeypot, límite por IP, 503 sin SMTP) y la tarea con reclamo único `TopicNotifyRun{key unique}`.
- [ ] Commit.

### Task 3: Calculadora + formulario en la guía (`jub`)

**Files:** Create `app/components/guides/JubilacionesEstimator.vue`, `app/components/TopicSubscribe.vue`, `app/utils/jubilacionesEstimator.ts`, `app/tests/unit/jubilacionesEstimator.test.ts`. Modify `app/utils/guides.ts` (`widget?: 'aumento-jubilaciones'`), el catálogo de la guía, `app/pages/guias/[slug].vue`, `app/assets/css/critical.css`.

**Interfaces — Produces:** `parseUyuAmount(text): number|null`, `jubilacionScenarios(amount, state): { label, pct, result }[]`; `<TopicSubscribe topic="…" />` emite `subscribed`; eventos `estimator_use`, `topic_subscribe_submit`, `topic_subscribe`.

- [ ] Tests: "25.000,50" → 25000.5; vacío/negativo → null; pendiente → 2 escenarios; provisorio/definitivo → 1 con la cifra oficial.
- [ ] Componente bajo el encabezado, `.ab-jubilaciones` oculto por CSS salvo `html[data-ab-jubilaciones="b"]`.
- [ ] Commit.

### Task 4: Invitación por tema (`seg`)

**Files:** Create `app/composables/useFollowUpAlert.ts`, `app/utils/followUpTopic.ts`, test. Modify `app/components/ReaderFollowUp.vue`, `pages/alquileres-uruguay.vue`, `pages/autos-usados-uruguay/index.vue`, la ficha de alquiler.

**Interfaces — Produces:** `useFollowUpAlert(): Ref<{ kind: RentalAlertKind, filters: Record<string, unknown> } | null>` (useState, escrito sólo en cliente); `followUpTopicForPath(path): 'aumento-jubilaciones-2027' | null`.

- [ ] Test de `followUpTopicForPath`.
- [ ] En `b`: alerta si hay contexto, aviso si hay tema, si no lo de hoy. En `a`: lo de hoy.
- [ ] Commit.

### Task 5: Siguiente paso en páginas sueltas

**Files:** Modify `app/utils/relatedInline.ts` (`RELATED_INLINE_ROUTES`) y ~20 páginas sueltas (insertar `<RelatedInline />` después de la primera respuesta).

- [ ] `relatedInlineParity.test.ts` en verde; cada página medida en el celular con el bloque antes de la pantalla 4.
- [ ] Commit.

### Task 6: Tarjeta compacta (`alq`)

**Files:** Modify `pages/alquileres-uruguay.vue` (CSS bajo 600 px con el atributo).

- [ ] Medir alto de tarjeta con y sin atributo (Playwright, 390 px). Commit.

### Task 7: Lectura y documentación

**Files:** Create `scripts/oneoff/ab_report.ts` (+ `npm run ab_report`), `docs/analytics/AB_TESTS.md` (experimentos, cómo leer, pasos de AdSense y GA4). Modify `AGENTS.md`/`app/AGENTS.md` si corresponde.

- [ ] `npx tsc -p tsconfig.production.json --noEmit` limpio salvo `sheet_key.json`. Commit.

### Task 8: Verificación y publicación

- [ ] Suite completa del app, lint, build; prueba en `nuxi preview` local de las tres variantes forzando `cu_ab`; PR no-borrador; vigilar deploy; medir en producción.
