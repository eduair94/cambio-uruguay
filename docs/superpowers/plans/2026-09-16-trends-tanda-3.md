# Oportunidades de Trends, tercera tanda — plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publicar la página de pensión a la vejez y refrescar jubilación, aguinaldo, SUCIVE e IRPF por alquiler; después, reescribir las guías de crédito hipotecario y de cobrar del exterior como comparativas con fuentes.

**Architecture:** Sólo app Nuxt 4: catálogos puros en `app/utils/*.ts` + páginas `.vue` + tests vitest-node, mismo patrón que las tandas 1 y 2.

**Tech Stack:** Nuxt 4 + Vuetify 4, vitest, eslint/prettier.

**Spec:** `docs/superpowers/specs/2026-09-16-trends-tanda-3-design.md`

## Global Constraints

- App utils puros: sin imports de Vue/Nuxt, **imports relativos**. Páginas: raíz `VContainer`, un solo `<h1>`, `useSeoMeta` + canonical + `application/ld+json` con `BreadcrumbList` (+ `Article`); `<FaqSection :items="faq" heading="Preguntas frecuentes" expanded />` emite el FAQPage solo (no duplicar); `defineOgImageComponent('Cambio', { title, subtitle, tag })`; base del `title` ≤ 43 caracteres; `description` ≤ 160; tablas anchas con `cu-mobile-cards` + `data-label` en cada `<td>` y `scope="col"` en cada `<th>`; radios sólo 4/8/12/16 px; **nunca un `VChip` dentro de un `<p>`** (tripwire `noChipInsideParagraph`); "setiembre" nunca "septiembre"; sin `|` en mensajes i18n.
- Guías (`Guide` en `app/utils/guides.ts:25-118`): prosa plana sin markdown, `faqs` `{ q, a }`, `sources` https, tablas con filas del mismo largo, `related[].to` con `/`; regla `TOOL_MENTIONS`.
- **Hechos.** Cada número sale del dossier correspondiente en `C:\Users\airau\AppData\Local\Temp\claude\c--Users-airau-Documents-GitHub-cambio-uruguay\108f6a94-a224-402a-adf2-225218438b9d\scratchpad\`, respetando sus etiquetas: lo marcado **no confirmado / secundario** no se publica como hecho duro — o se omite, o se escribe con su reserva ("según el trámite del BPS", "verificalo en…"). Nunca se inventa una cifra ni se rellena un hueco con lógica.
- Prettier vía eslint (sin punto y coma, comillas simples, `arrowParens: avoid`, printWidth 100, trailingComma es5). `npm run typecheck` está roto.
- Los implementadores **no** editan `siteNav.ts` ni `app/i18n/**`, y **no** commitean. Fecha de hoy: 2026-09-16; `*_VERIFIED_AT` y `updatedAt` = `'2026-09-16'`.

---

### Task 1 (N): `/pension-a-la-vejez-uruguay`

**Files:** Create `app/utils/pensionVejez.ts`, `app/pages/pension-a-la-vejez-uruguay.vue`, `app/tests/unit/pensionVejez.test.ts`.
**Dossier:** `dossier-pension-jubilacion.md`, sección A (y la nota sobre "asistencia a la vejez").

Hechos confirmados (BPS, fetch 2026-09-16) que la página publica:
- Monto 2026: **$ 18.575** ("Pensión vejez e invalidez", `https://www.bps.gub.uy/6182/montos-y-aumentos-de-pasividades.html`, última actualización 09/02/2026). Ajuste 2026: **5,97 %**.
- Edad: **más de 70 años**; excepción desde los **65** con al menos **7 años de dedicación al cuidado directo y no remunerado** de hijos, hermanos, cónyuge/concubino o padres con discapacidad severa (`https://www.bps.gub.uy/20540/pension-por-vejez.html`).
- Residencia: **10 de los últimos 20 años** en el país; también califican uruguayos que viven en Argentina o Brasil a menos de 5 km de la frontera.
- Carencia de recursos: del monto se descuenta el **50 % de los ingresos propios**; si el ingreso propio supera **dos pensiones por vejez**, se pierde el derecho. Núcleo conviviente obligado a dar alimentos: los ingresos líquidos promedio deben ser **menores a 4 BPC por persona** y el excedente se descuenta al **33 %**. Familiares obligados no convivientes: umbrales de **10 a 13 BPC** según estado civil y personas a cargo.
- Incompatibilidad: hay que **no configurar causal jubilatoria** en el BPS ni en ningún otro organismo previsional. Es el piso de quien no tiene otra pasividad.
- Caducidad: si no se cobra durante **tres meses consecutivos** los recibos caducan y hay que acreditar existencia y permanencia en el país.
- **Distinguir de "Asistencia a la vejez"**, que es un programa **del MIDES** para personas mayores en situación de vulnerabilidad, no la pensión del BPS. Es la confusión más común y le da valor propio a la página.
- La revisión periódica y el detalle documental del trámite **no están confirmados**: la página remite al trámite (`https://www.bps.gub.uy/11430/`) sin afirmar requisitos que el dossier no verificó.

- [ ] **Step 1: test (falla)** — `app/tests/unit/pensionVejez.test.ts`: `AMOUNT_2026 === 18575`; `AGE_REQUIREMENT.base === 70` y `AGE_REQUIREMENT.caregiverFrom === 65` con `caregiverYears === 7`; `RESIDENCY_RULE` menciona "10" y "20"; `MEANS_TEST` tiene entradas para ingreso propio (50 %, dos pensiones), núcleo conviviente (4 BPC, 33 %) y no convivientes (10 a 13 BPC); `INCOMPATIBILITIES` menciona causal jubilatoria; `VS_OTHERS` distingue pensión a la vejez, asistencia a la vejez (MIDES) y jubilación; `PENSION_FAQ.length >= 6` con respuestas > 40 caracteres; `PENSION_SOURCES.length >= 4` todas `https://` y al menos dos de `bps.gub.uy`; `PENSION_VERIFIED_AT === '2026-09-16'`.
- [ ] **Step 2: correr y ver que falla** — desde `app/`: `npx vitest run tests/unit/pensionVejez.test.ts`.
- [ ] **Step 3: util** — `app/utils/pensionVejez.ts` con esas constantes (tipos `readonly`, `import type { FaqItem } from './faqAnswers'`), comentario de cabecera citando BPS y la fecha, y las 6+ FAQ: qué es; a quién le corresponde; cuánto es en 2026; qué pasa si tengo otros ingresos; ¿puedo cobrarla si tengo jubilación? (no); ¿es lo mismo que la asistencia a la vejez del MIDES? (no); cómo se pide; qué pasa si no la cobro tres meses.
- [ ] **Step 4: página** — estructura de `app/pages/suplemento-solidario-bps.vue`: `<h1>` "Pensión a la vejez del BPS: requisitos y monto"; tarjeta con el monto y la fecha; "¿Te corresponde?"; "Qué mira el BPS de tus ingresos" (las tres reglas de carencia, con la advertencia de que la evalúa el BPS y esto no es una calculadora); "No la confundas con…" (tabla de tres filas: pensión a la vejez BPS / asistencia a la vejez MIDES / jubilación); "Cómo se pide"; `FaqSection`; fuentes; seguir leyendo: `/suplemento-solidario-bps`, `/cuando-me-puedo-jubilar-uruguay`, `/asignacion-familiar-uruguay`, `/devolucion-fonasa-uruguay`, `/plan-de-vida-uruguay`. SEO: `title` `'Pensión a la vejez del BPS: requisitos'` (39); `description` ≤ 160 con el monto y la edad; OG `tag: 'BPS'`; canonical `https://cambio-uruguay.com/pension-a-la-vejez-uruguay`; keywords `pension a la vejez, pension vejez bps, pension por invalidez bps, requisitos pension a la vejez, monto pension a la vejez 2026, pension no contributiva uruguay, carencia de recursos bps, asistencia a la vejez mides`; JSON-LD `BreadcrumbList` + `Article`.
- [ ] **Step 5: verde y lint** — `npx vitest run tests/unit/pensionVejez.test.ts tests/unit/seoContract.test.ts tests/unit/pageContainer.test.ts tests/unit/noChipInsideParagraph.test.ts tests/unit/componentResolution.test.ts`; eslint sobre los tres archivos. Reportar la entrada de nav (`invest`, `nav.pensionVejez`, `mdi-account-clock`, priority 0.7, weekly, fresh) y los textos i18n ("Pensión a la vejez" / "Old-age pension (BPS)" / "Pensão por velhice do BPS").

---

### Task 2 (Ñ): jubilación — mínima, incapacidad y "mi jubilación estimada"

**Files:** Modify `app/pages/cuando-me-puedo-jubilar-uruguay.vue` y, si hace falta, `app/utils/retirementAge.ts` (sólo para **agregar** constantes nuevas: no tocar `NEW_SYSTEM_NORMAL`, `REDUCED_SERVICE_SCALE` ni `EXTENDED_CARRERA`, que tienen test propio). Test: extender `app/tests/unit/retirementAge.test.ts` o crear `app/tests/unit/retirementFigures.test.ts`.
**Dossier:** `dossier-pension-jubilacion.md`, secciones B, C y D.

Hechos confirmados a publicar: jubilación **mínima general $ 20.935**, y por edad de inicio **$ 10.795 (60 años)** y **$ 23.749 (70 o más)**; **dos topes máximos según régimen**: $ 79.430 (solidaridad intergeneracional) y $ 117.460 (transición), con tope de acumulación $ 166.080 sólo en transición; ajuste 2026 **5,97 %**; **jubilación por incapacidad total** es vitalicia y **subsidio transitorio por incapacidad parcial** dura **3 años o hasta configurar causal jubilatoria**, con **+20 %** por hijos a cargo; el **suplemento solidario** alcanza a la jubilación por incapacidad total y a la anticipada por puestos exigentes; las primeras jubilaciones por causal normal del sistema nuevo recién se otorgan **desde 2033**.
**No publicar** (el dossier lo marca sin confirmar): el tope de SBJ de $ 288.288, la renovación "180 días antes", y cualquier tasa de reemplazo del 65/66 % para incapacidad total.
"Mi jubilación estimada": describir el servicio del BPS y enlazarlo; decir qué necesita (usuario BPS) y qué no garantiza, sin afirmar detalles que el dossier no verificó.

- [ ] **Step 1** — leer la página entera y ubicar dónde viven sus cifras y su FAQ.
- [ ] **Step 2** — tres secciones nuevas con los hechos de arriba: "Cuánto es la mínima y cuál es el tope"; "Si no podés seguir trabajando por salud" (las tres figuras y quién decide); "Mirá tu jubilación estimada". Tabla chica para mínimas y topes (`cu-mobile-cards`, `scope="col"`).
- [ ] **Step 3** — dos FAQ nuevas ("¿Cuál es la jubilación mínima en 2026?", "¿Qué diferencia hay entre jubilación por incapacidad y pensión por invalidez?"), keywords nuevas (`jubilacion minima 2026, jubilacion por incapacidad, jubilacion por enfermedad, mi jubilacion estimada, bps jubilacion estimada, tope jubilacion`), `description` ≤ 160 (hoy son 269 caracteres) conservando la regla por año de nacimiento, y enlace a `/suplemento-solidario-bps` y `/pension-a-la-vejez-uruguay`.
- [ ] **Step 4** — test que fije las cifras nuevas y el texto de las dos FAQ; `npx vitest run` de ese test + `seoContract` + `pageContainer` + `noChipInsideParagraph` + `retirementAge`; eslint.

---

### Task 3 (O): aguinaldo — plazo legal, construcción y licencias

**Files:** Modify `app/pages/cuando-se-cobra-el-aguinaldo-uruguay.vue` y su util de datos si lo tiene (ubicarlo; si las cifras están inline, quedan inline). Test: el del util si existe; si no, agregar aserciones de FAQ en el test de la página si lo hay.
**Dossier:** `dossier-aguinaldo-sucive-irpf.md`, sección A.

Confirmado (impo.com.uy y gub.uy, fetch 2026-09-16): **Ley 12.840** fija el aguinaldo y su plazo — la cuota de fin de año se paga **antes del 24 de diciembre** (la ley lo expresa como "10 días antes"; usar la redacción del dossier, no una paráfrasis propia); el artículo de la misma ley prevé **multa del doble** para el empleador que no paga; la **Ley 18.572 art. 29** agrega un **recargo del 10 %** sobre créditos laborales impagos; el decreto del MTSS de 2026 fija los pagos de **junio** y del **20 de diciembre de 2026**; la proporcionalidad para quien trabajó menos de un año está en la propia ley (quien trabajó 3 meses cobra la parte proporcional); el **Fondo Social de la Construcción** (Decreto 466/008) es el que paga en la construcción, con fechas propias del BPS en 2026; el BPS paga a fin de año una **partida especial de $ 3.151** a pasivos de menores ingresos, que **no es un aguinaldo** (los jubilados no cobran aguinaldo).
**Corrección a arrastrar:** la Ley 16.101 rige el **salario vacacional**, no el aguinaldo; si la página o la guía dicen lo contrario, corregirlo.
**No publicar como hecho duro:** que el subsidio por enfermedad pague aguinaldo en junio y diciembre, que el seguro de paro no genere aguinaldo, ni la fórmula exacta del aguinaldo de la construcción — el dossier los marca sin confirmar. Se puede decir qué organismo lo paga y remitir a su página.

- [ ] **Step 1** — leer la página y su guía hermana `/guias/como-se-calcula-el-aguinaldo-uruguay` (no reescribirla; sólo corregir si contradice).
- [ ] **Step 2** — secciones/FAQ nuevas: "El plazo y qué hacer si no te lo pagan" (fecha límite, multa del doble, recargo del 10 %, dónde se reclama: Inspección General del Trabajo con sus datos del dossier); "En la construcción lo paga el Fondo Social" (qué organismo, cuándo, y el enlace); "Si estuviste de licencia o enfermo" (sólo lo confirmado); "Los jubilados no cobran aguinaldo" (con la partida especial de $ 3.151 como lo que sí existe).
- [ ] **Step 3** — las cuatro preguntas de la cola de demanda como FAQ: *¿Me corresponde aguinaldo si trabajé 3 meses?*, *¿y si estoy incapacitado?*, *¿qué pasa si no me lo pagan a tiempo?*, *¿cuántos días de aguinaldo me corresponden?*.
- [ ] **Step 4** — keywords (`aguinaldo de la construccion, cuando pagan el aguinaldo 2026, no me pagaron el aguinaldo, aguinaldo proporcional 3 meses, aguinaldo jubilados`), `description` ≤ 160, fuentes nuevas.
- [ ] **Step 5** — tests de contrato + los del util tocado; eslint.

---

### Task 4 (P): SUCIVE — consulta, calendario, motos y medios de pago

**Files:** Modify `app/pages/multas-de-transito-y-patente-uruguay.vue` (+ su util si lo tiene). Test: el del util, o aserciones nuevas donde vivan las FAQ.
**Dossier:** `dossier-aguinaldo-sucive-irpf.md`, sección B.

Confirmado: **calendario 2026** de seis cuotas — 20 de enero, 20 de marzo, 20 de mayo, 20 de julio, **21 de setiembre** (porque el 20 cae en día no hábil) y 20 de noviembre; **bonificación del 20 % por pago contado y 10 % en cuotas**; **convenio de pago**: la entrega inicial se paga **dentro de las 72 horas** o el convenio se cancela solo, hasta **36 cuotas en UR** o **60 en UI**, cuota mínima **1 UR**, y no se puede firmar uno nuevo con convenios previos impagos con **más de 60 días de atraso**; **motos** de 500 cc o más: **5 % del valor de mercado menos IVA** si son 0 km y **4,5 %** si son usadas empadronadas 2024–2025; los valores de **2027 todavía no están publicados** (el patrón es que el Congreso de Intendentes los aprueba en noviembre del año anterior) — decirlo así, como estado a la fecha.
**No publicar:** que OCA sea un canal de pago (las fuentes se contradicen: una nota dice que habilitó pago en cuotas con tarjeta, no hay página oficial que lo liste) — la FAQ "¿puedo pagar con OCA?" se contesta con lo que sí está confirmado (SUCIVE en línea, Abitab, Redpagos, Correo Uruguayo) y diciendo que conviene confirmarlo en el canal antes de ir. Tampoco publicar el paso a paso exacto del formulario de consulta (no se pudo verificar); sí el dónde y el qué necesitás (matrícula y padrón).

- [ ] **Step 1** — leer la página (ya cubre convenio, prescripción y qué pasa si no pagás: no duplicar, enlazar).
- [ ] **Step 2** — secciones nuevas: "Cuánto debo y dónde se consulta"; "Cuándo vence cada cuota" (tabla del calendario 2026 + bonificaciones); "Cómo se paga" (canales confirmados); "Motos".
- [ ] **Step 3** — FAQ con las siete consultas de la cola de demanda propia.
- [ ] **Step 4** — keywords (`sucive cuanto debo, consulta deuda sucive, sucive como pagar, sucive cuando vence, patente moto, convenio sucive, bonificacion pago contado patente`), `description` ≤ 160 si hace falta, fuentes nuevas.
- [ ] **Step 5** — tests de contrato + eslint.

---

### Task 5 (Q): crédito fiscal de IRPF por alquiler

**Files:** Modify `app/pages/declaracion-de-irpf-uruguay.vue` (+ su util de datos). Test: el del util si existe.
**Dossier:** `dossier-aguinaldo-sucive-irpf.md`, sección C.

**El hallazgo que justifica la sección:** el porcentaje vigente es el **8 %** del precio del arrendamiento, no el 6 % que circula. Cita verbatim del Texto Ordenado 2023 de DGI, art. 51-T7 (impo.com.uy): *"arrendatarios de inmuebles con destino a vivienda permanente podrán imputar el pago de este impuesto hasta el monto equivalente al 8% (ocho por ciento) del precio del arrendamiento, siempre que se identifique el arrendador"*. El 6 % es el porcentaje histórico (ejercicios cerrados antes del 31/12/2023) **y además** es el tope de un régimen distinto en el mismo artículo: los arrendamientos turísticos temporarios. La sección tiene que decir las tres cosas, porque el lector llega con el 6 % en la cabeza.
Confirmado además: la identificación del arrendador es condición explícita del texto legal.
**No publicar como hecho duro** (el dossier los marca sin verificar): el requisito de contrato escrito de un año o más, que no haga falta registrar el contrato, los formularios 1102/1103, el tope contra el impuesto de las rentas del trabajo y el orden IRPF→IASS. Se pueden mencionar como "lo que hay que confirmar en DGI antes de presentar", con enlace, pero no afirmados.

- [ ] **Step 1** — leer la página y su util; ubicar dónde encaja la sección (después del bloque de deducciones, si existe).
- [ ] **Step 2** — sección "Si alquilás: el crédito del 8 %" con la cita legal, la aclaración del 6 %, la condición de identificar al arrendador y el enlace a DGI; dos FAQ (*¿Cuánto puedo descontar del IRPF por el alquiler?*, *¿Es 6 % u 8 %?*).
- [ ] **Step 3** — keywords (`credito fiscal alquiler, irpf alquiler, deducir alquiler irpf, 8 por ciento alquiler irpf, arrendamiento irpf`), enlace cruzado desde `/alquilar-en-uruguay`.
- [ ] **Step 4** — tests de contrato + del util; eslint.

---

### Task 6 (L): guía de crédito hipotecario → comparativa con fuentes

**Files:** Modify `app/utils/guidesReddit.ts` (sólo la entrada `slug: 'credito-hipotecario-uruguay'`). Create `app/tests/unit/guidesHipotecario.test.ts`.
**Dossier:** `dossier-hipotecario.md` — leerlo entero, incluidas las "Dudas abiertas".

La guía de hoy tiene 716 palabras, sin tabla, sin FAQ y sin una sola fuente, y no nombra las condiciones de ningún prestamista. Se conserva el slug y se reescribe con lo que cada uno publica.

**La tabla** (`headers: ['Prestamista', 'Moneda', 'Tasa (TEA)', 'Plazo máximo', 'Financia hasta', 'Cuota máxima sobre el ingreso']`), con estos valores del dossier (todos [OFICIAL] salvo donde diga lo contrario):
- **BHU** — UI exclusivamente | desde 4,50 % ("Préstamo Soñado", variable según plazo, monto y perfil) | 25 años (reforma 20) | 90 % del valor (la línea Soñado cita hasta 100 %: escribirlo como lo publica el banco) | 25 % del ingreso
- **ANV / Fondo de Garantía (FGCH)** — UI o pesos según el banco adherido | no publica tasa: la fija el banco | 25 años | 95 % (ahorro previo mínimo del 5 %) | menos del 35 %, con ingreso del núcleo que no supere 100 UR
- **BROU** — no da préstamo hipotecario de compra; deriva al BHU con descuento de gastos (su "Renová tu Casa" es consumo, no hipotecario). Es un hallazgo del relevamiento y va en la tabla como fila propia.
- **Itaú** — UI | desde 3,75 % con paquete Personal Bank/Full | 30 años | 80 % del valor de mercado según zona | 35 %, con ingreso familiar mínimo de UI 10.000
- **Santander** — UI o USD | UI hasta 10 años 4,00 %, de 11 a 30 años 4,75 % | 30 años en UI | 85 % del valor de compraventa | 35 % en UI y hasta 20 % en USD, ingreso mínimo UI 10.000
- **BBVA** — UI o USD | desde USD 100.000: UI hasta 25 años 3,75 %; USD hasta 25 años 6,50 % | 25 años (300 cuotas) | 80 %, y 90 % en propiedades de más de USD 150.000 | 30 % en UI, con ingreso mínimo de $ 30.000 del titular
- **Scotiabank** — UI o USD | 4,50 % y 4,65 % según segmento (cartilla oficial) | 25 años | 90 % primera vivienda, 75 % segunda | ingresos líquidos mínimos desde $ 50.000 (UI)
- **BTG Pactual (ex HSBC)** — UI o USD | 3,75 % de USD 99.999 a 500.000 a 25 años; 4,75 % de USD 30.000 a 99.999 | 25 años en UI, 20 en USD | 90 % primera vivienda (80 % por encima de USD 150.000) | ingreso mínimo del núcleo $ 60.000 nominales
Scotiabank tiene una **discrepancia declarada** (su página comercial dice "desde 3,80 %" y su cartilla vigente publica 4,50/4,65 %): la guía publica la cartilla y menciona la diferencia en la sección del banco, no en la tabla.

**Secciones (8–9).** Qué es y quién presta (con el hallazgo del BROU); **la moneda es la decisión** (UI se ajusta por inflación y UR por salarios; una cuota en UI sube con los precios aunque tu sueldo no; enlazar `/indicadores/unidad-indexada`, `/indicadores/unidad-reajustable` y `/herramientas/conversor-unidad-indexada` para el valor vivo en vez de hornear una cifra); la tabla; el BHU y el Fondo de Garantía; los bancos; **lo que no entra en la cuota** (ITP del 2 % + 2 % sobre el valor catastral [OFICIAL DGI]; escrituración en torno al 3–5 % del precio, que el dossier marca [SECUNDARIA] y va como "en torno a", no como dato; tasación, seguros de vida e incendio, gastos comunes); cuánto tenés que ganar (la regla de cuota/ingreso de cada uno y el tope de 100 UR del FGCH); qué mirar antes de firmar.

`faqs` ≥ 6: ¿cuánto tengo que ganar?; ¿conviene en UI o en dólares?; ¿cuánto financian?; ¿qué gastos hay además de la cuota?; ¿el BROU da préstamos hipotecarios? (no, deriva al BHU); ¿qué es el Fondo de Garantía y para quién es?; ¿puedo pedirlo estando en el clearing? (remitir a `/salir-del-clearing`).
`sources` ≥ 6 oficiales (bhu.com.uy, anv.gub.uy o la página del FGCH, itau.com.uy, santander.com.uy, bbva.com.uy, scotiabank.com.uy, btgpactual, DGI para el ITP). `related`: `/comprar-o-alquilar-uruguay`, `/herramientas/conversor-unidad-indexada`, `/indicadores/unidad-reajustable`, `/venta-viviendas-uruguay`, `/oportunidades-inmobiliarias-uruguay`, `/guias/costos-de-escrituracion-uruguay`.
**Nada de cuotas de ejemplo**: es dinero a 25 años y una cuota calculada acá se leería como cotización.

- [ ] **Step 1: test (falla)** — `app/tests/unit/guidesHipotecario.test.ts`: la guía existe con el mismo slug y `updatedAt === '2026-09-16'`; título ≤ 60 y descripción 100–190; nombra BHU, ANV o Fondo de Garantía, BROU, Itaú, Santander, BBVA, Scotiabank y BTG; la tabla tiene exactamente esos 6 encabezados y ≥ 7 filas de 6 celdas; la fila del BROU dice que no da hipotecario; ninguna celda de tasa está vacía (usa "no publica" cuando corresponde); ≥ 6 FAQ; ≥ 6 fuentes https; `related` incluye `/comprar-o-alquilar-uruguay` y `/herramientas/conversor-unidad-indexada`; sin markdown; sin "septiembre"; ninguna sección contiene "cuota de $" (guarda contra el ejemplo de cuota).
- [ ] **Step 2: correr y ver que falla** — `npx vitest run tests/unit/guidesHipotecario.test.ts` desde `app/`.
- [ ] **Step 3: reescribir la entrada** con la estructura de arriba, prosa plana en "vos", secciones de 90–180 palabras y FAQ de 30–80.
- [ ] **Step 4: verde y lint** — `npx vitest run tests/unit/guidesHipotecario.test.ts tests/unit/guides.test.ts tests/unit/guideHubs.test.ts tests/unit/guidesRedditSep2026.test.ts`; eslint sobre los dos archivos.

---

### Task 7 (M)

Se agrega cuando llegue `dossier-cobrar-exterior.md`.

---

### Task 8: integración

Entradas de `siteNav` (la nueva página en `invest`) + keywords nuevas en las entradas existentes de jubilación, aguinaldo, SUCIVE e IRPF; `nav.pensionVejez` en es/en/pt; `npm run test:unit` + `npm run lint` en `app/`; commits por frente; push; verificación en producción.
