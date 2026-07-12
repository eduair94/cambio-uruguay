# Diseño: `/franquicia-viajero-uruguay` — franquicia de equipaje de viajero (Carrasco)

**Fecha:** 2026-07-12
**Estado:** aprobado el diseño; pendiente revisión de spec por el usuario antes del plan de implementación.

## 1. Problema y caso de uso

Hilo real de r/uruguay ("Franquicia de viajero en Carrasco"): alguien necesita traer
equipamiento para su emprendimiento desde EE.UU., que no puede pasar desapercibido en
el escáner (a diferencia de una notebook). Pregunta textual: "Que ocurre al declararlo?
Podes pagar impuestos en el momento y llevarte tus cosas?" — cita "según Google" la
cifra de 50% sobre el excedente de 500 USD, sin confiar en la fuente.

**Esto NO es lo mismo que `/franquicia-aduana-uruguay`** (que cubre compras online con
courier/postal, régimen de la Ley 20.446/Decreto 50/026). Es un régimen distinto:
**equipaje físico que el viajero carga consigo** al entrar por el aeropuerto, regido
por el Código Aduanero (Ley 19.276) + Decreto 139/014. Vacío de contenido: nada en el
sitio cubre hoy esta pregunta.

## 2. Investigación verificada (deep-research, 101 agentes, 19 fuentes primarias, voto adversarial 3-0 en los hechos centrales)

**Confirmado (alta confianza):**
- **Franquicia = USD 500** para entrada aérea/marítima (Carrasco) — **igual para
  residentes que retornan y turistas**, no se diferencia por residencia (corrige un
  supuesto que traíamos del brainstorm inicial). Entrada terrestre = USD 300 (menor).
  Fuente vigente: gub.uy trámite (actualizado 26/06/2026). Aduanas.gub.uy tiene páginas
  propias de 2014 con la cifra vieja escalonada por origen — refutadas explícitamente
  en la verificación adversarial (mismo patrón de staleness que "Encomiendas Postales").
- **El reclamo de Reddit es CORRECTO**: 50% flat sobre el valor que excede la
  franquicia (Decreto 139/014, art. 13, texto literal "alícuota del 50% sobre el valor
  que exceda dichos límites").
- **Base legal**: Ley 19.276 (Código Aduanero) arts. 132-133 (declaración obligatoria,
  define equipaje acompañado/no acompañado) + Decreto 139/014 (incorpora MERCOSUR
  Decisión 53/08) como decreto reglamentario, modificado por un decreto de 2019
  (Decisión CMC 03/018, vigente desde 27/08/2021) que unificó la vieja franja
  300/500-por-origen en un USD 500 plano. **El número exacto de ese decreto aparece
  como "43/019" en una fuente y "49/019" en otra — se resuelve contra IMPO antes de
  escribir la página** (tarea del plan de implementación, no bloquea el diseño).
- **No hace falta despachante de aduana** — Ley 19.276 exime explícitamente "Equipajes
  de viajero" de esa exigencia. Dato tranquilizador directo para el caso de Reddit.
- **Sí se puede pagar en el momento y llevarse las cosas.** gub.uy: Carrasco acepta
  tarjeta (Visa/Amex); el excedente se retiene hasta el pago, se libera pagado. Si no
  se paga, se declara en abandono a los 5 días hábiles y la DNA puede rematarlo.
- **Contrabando NO es el resultado por defecto de exceder la franquicia.** Eso aplica
  específicamente a **ocultamiento** (dobles fondos, oculto entre la ropa) bajo art.
  211: comiso de la mercadería + comiso del medio de transporte + 2x los tributos +
  multa del 20% del valor en aduana — sanciones acumulativas. Declarar un excedente y
  pagar el 50% es el camino normal, no punitivo.
- **Documentación**: Declaración Jurada de equipaje + valores/facturas de compra
  ítem por ítem.

**Zona gris genuina (se presenta como tal, no como regla dura — mismo patrón editorial
que la sección de phishing en `/estafas-uruguay`):**
- **"Uso personal" no tiene test codificado.** Una afirmación que aseguraba que existía
  un criterio de cantidad/valor fue refutada 0-3 en la verificación adversarial. Es
  discreción real del funcionario al momento de la inspección — mayor riesgo cuanto
  más se parezca a equipamiento de negocio en cantidad/valor.
- **Equipaje no acompañado** (carga separada, relevante si el equipamiento no entra
  como equipaje de mano/despachado) está definido legalmente (art. 133-B) pero **no se
  confirmó si recibe la misma franquicia/tasa** que el acompañado — se marca como
  pregunta abierta, no se inventa una cifra.
- **Tope de uso** (una vez por mes vs. una vez por año) — fuentes en conflicto, a
  resolver contra el decreto vigente antes de publicar.
- **Terminología del canal en Carrasco** — un anuncio de Aduanas de 2016 describe un
  "corredor azul" para quienes declaran; existe además una página oficial separada que
  define "canal rojo" como el nivel de control más estricto. Se verifica cuál término
  usa Aduanas hoy antes de escribir copy que use uno u otro.

## 3. Alcance (decisiones aprobadas por el usuario)

- **Página nueva `/franquicia-viajero-uruguay`**, no una sección de la página de
  courier — régimen legal distinto, público distinto (viajero físico en el aeropuerto
  vs. comprador online).
- **Calculadora interactiva + FAQ**, mismo patrón de `/franquicia-aduana-uruguay`
  (declarás valor → veredicto en vivo), no un artículo estático.
- **Toggle por modo de entrada** (aéreo/marítimo USD 500 vs. terrestre USD 300), NO por
  residencia — corrección post-research del plan original.
- **Público: residentes que retornan Y turistas** — el texto dice explícitamente "da
  igual si sos residente o turista, la franquicia es la misma" porque corrige un
  supuesto común.
- **Cross-link bidireccional con `/franquicia-aduana-uruguay`**, aclarando arriba de
  todo la diferencia (equipaje físico vs. compra online con courier) para que no se
  confundan.

## 4. Estructura de la página

Sigue el patrón visual/estructural de `franquicia-aduana-uruguay.vue` (hero + alert de
fuentes, calculadora interactiva con veredicto, cards de régimen, trampas/FAQ, timeline
si aplica, card de fuentes, disclaimer).

1. **Hero**: "¿Tu equipaje paga impuesto al entrar a Uruguay?" + alert aclarando que
   esto es sobre lo que **cargás físicamente** al entrar por Carrasco (u otro punto),
   distinto de comprar online (link a `/franquicia-aduana-uruguay`).
2. **Calculadora**: toggle Aéreo/Marítimo (USD 500) vs. Terrestre (USD 300) + campo
   "Valor de lo que traés" → veredicto: dentro de franquicia / excedente + impuesto
   estimado (50% del excedente). Nota fija: "Es igual seas residente que retornás o
   turista — la franquicia no distingue por nacionalidad ni residencia."
3. **Cómo funciona en la práctica** (responde directo al caso de Reddit):
   - Declaración Jurada + facturas de lo que excede.
   - Pago en el momento con tarjeta en Carrasco → te llevás las cosas el mismo día.
   - No hace falta despachante de aduana.
   - Si no pagás: retienen, abandono a los 5 días hábiles, remate.
4. **FAQ** (con schema `FAQPage`, patrón `salir-del-clearing.vue`) — preguntas
   Reddit-style:
   - ¿Puedo pagar ahí mismo y llevarme mis cosas?
   - ¿Qué pasa si no declaro y me agarran?  (distingue: declarar tarde/al ser detectado
     → retención + 50%, no es delito; ocultar activamente → contrabando, art. 211,
     sanciones acumulativas)
   - ¿Qué es "uso personal" y por qué es zona gris? (honesto: no hay test codificado,
     es discreción del funcionario)
   - ¿Necesito un despachante de aduana? → No, están exentos.
   - ¿Es lo mismo para equipaje que llega por separado (no acompañado)? → zona gris
     marcada como no confirmada, no se inventa cifra.
5. **Fuentes** — Ley 19.276 arts. 132-133 y 211, Decreto 139/014 (+ el decreto de
   2019/2021 que unificó la cifra, número a confirmar), gub.uy trámite, con fecha de
   verificación visible (patrón `LAST_RESEARCHED`).
6. **Disclaimer** + cross-link a `/franquicia-aduana-uruguay` y a la calculadora de
   importación existente si aplica.

## 5. Arquitectura de código

### 5.1 `app/utils/travelerBaggageRules.ts` (módulo puro, testeable, patrón `importRules.ts`)
- Constantes fechadas/fuenteadas: `FRANCHISE_AIR_SEA_USD = 500`,
  `FRANCHISE_LAND_USD = 300`, `EXCESS_TAX_RATE_PCT = 50`, `LAST_RESEARCHED` (ISO).
- `resolveBaggageTax({ entryMode: 'air-sea' | 'land', valueUsd }): { franchiseUsd,
  withinFranchise, excessUsd, taxUsd }` — misma lógica de excedente que
  `importRules.ts` (excedente = max(0, valor - franquicia); impuesto = excedente *
  50%).
- Sin `Date.now()` interno; recibe lo que necesite como parámetro para ser
  determinístico/testeable.

### 5.2 `app/pages/franquicia-viajero-uruguay.vue`
- Calca la estructura Vue de `franquicia-aduana-uruguay.vue`: `VBtnToggle` para modo de
  entrada, `VTextField` para valor, `VAlert` de veredicto con `verdictTone`/`verdictIcon`
  computados. FAQ en `VExpansionPanels` o cards, con JSON-LD `FAQPage` +
  `BreadcrumbList` en `useHead` (patrón `salir-del-clearing.vue`).
- `defineOgImageComponent('Cambio', …)`, `useSeoMeta`, canonical
  `https://cambio-uruguay.com/franquicia-viajero-uruguay`.

### 5.3 Registro obligatorio (o CI falla)
- **`app/utils/siteNav.ts`**: nueva `NavEntry`, `to: '/franquicia-viajero-uruguay'`,
  `labelKey: 'nav.franquiciaViajero'`, icono (p.ej. `mdi-bag-suitcase-outline` o
  `mdi-airplane-check`), keywords (franquicia equipaje uruguay, franquicia viajero
  carrasco, equipaje aduana uruguay, cuanto puedo traer sin pagar impuesto, canal rojo
  aeropuerto uruguay, declaracion jurada equipaje), `priority: 0.8`,
  `changefreq: 'monthly'`.
- **`app/i18n/locales/json/{es,en,pt}.json`**: `nav.franquiciaViajero` en los tres.
- Cross-link agregado en `franquicia-aduana-uruguay.vue` (hero o fuentes) apuntando a
  la nueva página, y viceversa.

### 5.4 Test `app/tests/unit/travelerBaggageRules.test.ts`
- `resolveBaggageTax` — dentro de franquicia (impuesto 0), justo en el límite,
  excedente aéreo, excedente terrestre, valor 0.

## 6. Verificación previa a escribir copy (bloquea el plan, no el diseño)

Antes de redactar el contenido final de la página, el plan de implementación debe
incluir un paso de `WebFetch` directo (no memoria del research) contra:
- IMPO: texto del decreto que unificó la cifra a USD 500 (confirmar 43/019 vs 49/019).
- gub.uy trámite `equipaje-viajeros-gestion-franquicia-equipaje`: tope de uso (mes vs.
  año) y terminología de canal/corredor vigente hoy.
Si algo sigue sin resolverse tras ese fetch directo, se publica como pregunta abierta
(mismo estándar que `/franquicia-aduana-uruguay` con el registro de vendedores) — nunca
se inventa una cifra para rellenar el hueco.

## 7. Cuidado editorial / legal

- Nunca se afirma "esto es lo que te va a pasar" en la zona gris de "uso personal" —
  se presenta como discreción real, con la fuente que la refuta como test codificado.
- La distinción declarar-tarde vs. ocultar activamente (art. 211) se marca con
  precisión: exceder la franquicia y declararlo no es contrabando; ocultarlo si lo es,
  con sanciones acumulativas nombradas.
- Disclaimer visible: información de referencia, no asesoramiento profesional; casos de
  alto valor conviene consultar directo con la DNA antes de viajar.

## 8. YAGNI / fuera de alcance

- No se construye un formulario de Declaración Jurada descargable ni se replica el PDF
  oficial — se linkea.
- No hay auto-refresh con Gemini (a diferencia de `costOfLivingLive`/`debtReliefLive`):
  es texto legal estable, mismo patrón estático fechado que
  `/franquicia-aduana-uruguay`.
- No cubre el régimen de "extranjeros que vienen a radicarse al país" (beneficio de
  mudanza única, base legal distinta) — eso es otro caso de uso, no el de Reddit.

## 9. Criterios de aceptación

- La página carga en dev, sin errores de hidratación, dark y light.
- `resolveBaggageTax` cubierto por tests unitarios que pasan.
- `siteNav-coverage.test.ts` verde (entrada de nav + label en los 3 locales).
- Cross-links funcionando en ambas direcciones con `/franquicia-aduana-uruguay`.
- `npm run lint` limpio.
- Los tres hechos marcados "a confirmar" (número de decreto, tope mensual/anual,
  terminología de canal) están resueltos vía WebFetch directo antes del commit final,
  o explícitamente publicados como pregunta abierta si no se resuelven.
