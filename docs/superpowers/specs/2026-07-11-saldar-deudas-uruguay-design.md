# Diseño: `/saldar-deudas-uruguay` — guía para saldar deudas + comparativa honesta de ChauDeudas / MiDeuda

**Fecha:** 2026-07-11
**Estado:** aprobado el diseño; pendiente revisión de spec por el usuario antes del plan de implementación.

## 1. Problema y caso de uso

Un usuario de r/uruguay (hilo real del 2026-07-11, "Arreglar tu historial crediticio")
preguntó, textual:

> "Estoy con un trabajo que me permite saldar deudas que no podia, siempre pensado en
> mejor creditos y mejorar mi historial crediticio. alguien utilizo estas web para
> saldar esas deudas? [chaudeudas.com.uy] y [mideuda.com.uy]. Vale la pena?"

**Nadie en Reddit respondió con datos.** No hay un solo testimonio de primera mano de
ninguno de los dos servicios en todo Reddit. Es un vacío de contenido total y de alta
intención de búsqueda: la página apunta a ser la primera respuesta seria en la web a
"¿conviene ChauDeudas / MiDeuda? ¿cómo saldo deudas viejas en Uruguay?".

## 2. Tesis (respaldada por investigación verificada)

ChauDeudas y MiDeuda son, en la práctica, **fachadas B2B de empresas de cobranza**:
- **MiDeuda** = emprendimiento de **Requiro SRL** (cobranza/BPO, RUT 217697220017;
  fundadores Allan Barbachan y Carolina Bermúdez, cúpula de Requiro). Confirmado.
- **ChauDeudas** = "Chau Deudas SAS" (Ituzaingó 1324/501). Su propia API pública
  (`/api/proxy/unregistered-organizations`) expone 736 empresas y **12 entradas con
  prefijo "CREDITIA -"** (Creditia = compra/gestión de carteras en mora, origen
  argentino). Indicio fuerte —no confirmado societariamente— de que su base se sembró
  con carteras gestionadas por Creditia.

Ninguno le cobra al deudor: cobran al **acreedor** un % de lo recuperado (modelo
"Serasa/buró", no el modelo mexicano "Resuelve tu Deuda" donde paga el deudor).
Replican —cobrándole al acreedor— algo que el usuario puede hacer **gratis y directo**:
ver su situación (BCU + informe Clearing gratis cada 6 meses) y negociar la quita él
mismo. Aportan comodidad/agregación, pero a cambio el usuario entrega cédula + datos
financieros (MiDeuda escanea el documento con la cámara) a un intermediario nuevo, de
baja transparencia, **no regulado por el BCU**, que **no borra el Clearing**.

**Veredicto**: no son estafa, pero rara vez son la mejor opción; la línea base
"negociar directo" suele ganar. Framing editorial: **factual, fuenteado, crítico pero
justo** (nunca "estafa"; señalar riesgos reales con su fuente), y siempre "informativo,
no asesoramiento financiero".

## 3. Alcance (decisiones aprobadas por el usuario)

- **Página nueva `/saldar-deudas-uruguay` + refactor de `/salir-del-clearing`.** La
  página nueva es dueña de la NEGOCIACIÓN, la COMPARATIVA de servicios y el
  RECONSTRUIR HISTORIAL. `/salir-del-clearing` conserva el simulador de pago y la
  calculadora de TEA real; se le recorta el solapamiento y se cruza-enlaza.
- **Comparativa con veredicto honesto y rúbrica computada** (patrón de
  `/mejores-bancos-uruguay` y `/tarjetas-de-credito-uruguay`: criterios ponderados,
  puntajes 0-100 calculados en código, no a mano).
- **Auto-actualización MENSUAL con Gemini** (patrón `costOfLivingLive.ts`, guardarraíles
  por banda, fallback a baseline estático fechado) para topes de usura y tasas de refi.
- **Anécdotas reales de Reddit citadas** ("usuarios de r/uruguay reportan" + link al
  hilo, sin nombres de personas, con cifras concretas de quita).

## 4. Estructura de la página (10 secciones)

Sigue el patrón de la casa: back-link al hub, hero con gradiente + `<ShareButtons>`,
secciones con `.section-heading`, `VExpansionPanels` para detalle, `ClientOnly` +
`useLazyFetch(..., { server: false })` para lo async, card de `Fuentes`, `VAlert`
disclaimer, 3 cross-links.

1. **Hero** + ShareButtons. Título ~ "Saldar deudas en Uruguay: cómo negociar, y si
   conviene ChauDeudas o MiDeuda".
2. **Respuesta rápida (TL;DR)** — callout que contesta el caso exacto: qué son estos
   servicios, si valen la pena, y lo único gratis que hay que hacer primero
   (consultar deuda en BCU + informe Clearing).
3. **4 verdades antes de pagar un peso** (mitos que cuestan plata):
   - Pagar **no borra** el Clearing (queda "cancelada" hasta 5 años, no renovable;
     Equifax en la práctica ~3 años). Ley 18.331 art. 22.
   - La deuda no caduca sola, pero el registro en Clearing caduca (5 años + 5
     renovable una vez) y el derecho de cobro **prescribe** (10 años acción personal /
     5 vía ejecutiva / 4 pagaré / 6 meses cheque). Y hay que **oponerla** (CC 1191).
   - ⚠️ **Pagar una cuota, pagar intereses o firmar un "acuerdo"/pedir plazo puede
     RESUCITAR una deuda prescrita** (renuncia tácita, CC 1189 y 1234; CCom 1026).
     Verificá la prescripción antes de reconocer nada.
   - El sueldo es **inembargable** salvo 1/3 (tributos/alimentos) o 1/2 (alimentos a
     menores); mínimo intangible 35% del nominal líquido (Ley 17.829 art. 3;
     CGP art. 381). **No hay cárcel por deudas** (Const. art. 52).
4. **Herramienta interactiva: ¿tu deuda pudo prescribir?** — el usuario elige tipo de
   deuda (préstamo personal, tarjeta, pagaré/vale, cheque, factura de comercio,
   servicios) y la fecha del último movimiento/exigibilidad → devuelve el plazo legal
   aplicable y si *pudo* haber prescrito, con aviso fuerte: no es automático, hay que
   oponerla en juicio, **no reconozcas la deuda** (un pago la reactiva), consultá
   abogado. NUEVO — no existe en el sitio.
5. **Cómo negociar una quita vos mismo (paso a paso)** — playbook combinando Reddit +
   derecho:
   1. Diagnóstico gratis: `consultadeuda.bcu.gub.uy` (Central de Riesgos, categorías
      1A-5) + informe de Clearing gratis cada 6 meses.
   2. Entendé quién tiene tu deuda hoy: acreedor original vs. recuperadora que la
      compró a centavos (a veces ~10% del nominal).
   3. Anclá en el **capital original**, no en el número inflado con intereses.
   4. Ofrecé pago **contado** a cambio de quita; táctica "hasta acá llego, más no".
   5. Exigí el acuerdo **por escrito** y **carta de cancelación / finiquito** antes de
      pagar; nunca pagues por Abitab sin documento (fraude de doble cobro).
   6. Priorizá por **TEA más alta** → link al simulador de `/salir-del-clearing`.
   7. Guardá todos los comprobantes.
   Evidencia citada (framing "usuarios de r/uruguay reportan", con link al hilo):
   quitas de 54.000→12.000 (~78%) con financieras, 240.000→50.000 con Itaú vía estudio.
6. **Las plataformas, qué son en realidad** — comparativa con **rúbrica ponderada
   computada**. Dimensiones (peso, suman 100):
   - Transparencia (quién está detrás, RUT, prensa real vs. branded) — 20
   - Costo para vos — 15
   - Independencia (¿neutral, o brazo de cobranza/buró con conflicto de interés?) — 20
   - Privacidad de datos (qué piden, coherencia política/T&C) — 15
   - Utilidad / cobertura real — 15
   - ¿Te da constancia de cancelación / baja del registro? — 15
   Actores puntuados: ChauDeudas, MiDeuda (Requiro), Ponete al Día (Equifax+Alpréstamo),
   ZeroAtraso, BROU Autogestión, y **"Negociar directo con el acreedor"** como línea
   base de referencia (típicamente el mejor puntaje). Puntaje 0-100 calculado en código
   + tabla factual (operador, quién paga, ¿regulado BCU?, qué documenta, dato de
   transparencia). Cada fila con su nota fuenteada.
7. **Veredicto honesto por caso** — guía de decisión:
   - Deuda aún en el **acreedor original** (banco/financiera) → andá directo a su canal
     (p.ej. BROU Autogestión), no necesitás intermediario.
   - Ya la tiene una **recuperadora** → negociás con ellos igual; una plataforma puede
     agilizar, pero exigí acuerdo escrito + finiquito.
   - **No sabés qué tenés** → empezá GRATIS en BCU + informe Clearing, después decidís.
   - Te prometen **"borrarte del Clearing" por una tarifa** → 🚩 imposible/engañoso, no
     pagues.
8. **Reconstruir tu historial crediticio** (el objetivo real del usuario):
   - Pagar en tiempo y forma reconstruye, pero el antecedente "cancelada con atraso"
     queda ~3-5 años; cada banco guarda su lista negra interna (el banco donde fallaste
     puede no darte crédito aunque el Clearing esté limpio).
   - Camino: producto chico bien pagado (límite bajo / prepaga), consistencia, tiempo.
   - Refinanciación/consolidación como herramienta: **BBVA "Unificación de Deuda"**
     (único consolidador real de terceros, 24% en $ / 9% en UI, hasta 60 cuotas, exige
     NO estar en Clearing), **Itaú "Reorganizá"** (42% TEA, solo deuda propia),
     **OCA "Reorganización de préstamos"**, cooperativas (**ANDA** presta con Clearing
     activo, 27,4-32,2% + IVA). → link `/prestamos-uruguay`.
   - ⚠️ No saques préstamo caro para pagar préstamo (la "calesita"); solo sirve si baja
     tu TEA real.
9. **Tus derechos y dónde denunciar**:
   - **Usura** (Ley 18.212): se compara la TIR (no la tasa nominal); tope = tasa media
     BCU + 55% (compensatoria) / + 80% (mora) para créditos < 2.000.000 UI. Cobrar de
     más → caduca el derecho a intereses/comisiones (art. 21), relevable de oficio
     (art. 23). Topes vigentes mar-may 2026 (dato refrescable mensual).
   - **Cobranza abusiva** → Área de Defensa del Consumidor (MEF), 0800 7005; no pueden
     revelar tu deuda a terceros (Ley 18.331 art. 11).
   - **Datos / Clearing** → URCDP (rectificación/supresión de dato caduco).
10. **Fuentes** (todas las URLs oficiales) + **disclaimer** ("informativo, no
    asesoramiento") + **3 cross-links** (`/salir-del-clearing`, `/prestamos-uruguay`,
    `/salud-financiera`).

## 5. Arquitectura de código

### 5.1 `app/utils/debtRelief.ts` (módulo puro, sin Vue/Nuxt, testeable)
- **Prescripción**: `PRESCRIPTION_TYPES` (tipo → { plazo en meses, norma/artículo,
  nota }) y `checkPrescription(typeId, lastActionISO, todayISO)` →
  `{ plazoLabel, mayHaveExpired, monthsElapsed, monthsRemaining, caveat }`. Recibe
  `todayISO` como parámetro (no llama a `Date.now()` internamente) para ser
  determinística y testeable.
- **Rúbrica**: `RELIEF_RUBRIC` (dimensiones + pesos, `Object.freeze`, suman 100),
  `RELIEF_SERVICES` (array; cada servicio con scores por dimensión + campos factuales:
  operador, quienPaga, bcuRegulado, documenta, transparencia, sources),
  `computeReliefScore(scores)` y `rankedServices()` (best-first, 1-indexed).
- **Contenido estructurado**: `NEGOTIATION_STEPS`, `CREDIT_REBUILD_STEPS`, `DEBT_MYTHS`,
  `VERDICT_CASES`.
- **Baseline fechado**: `USURY_CAPS_BASELINE` (topes verificados mar-may 2026) y
  `REFI_RATES_BASELINE` (BBVA/Itaú/OCA/ANDA/BROU verificados) con `asOf`.

### 5.2 `app/server/utils/debtReliefLive.ts` (refresh mensual)
- Patrón `costOfLivingLive.ts`: `baselineDebtRelief()`, `refreshLiveDebtRelief()` con
  Gemini `gemini-2.5-flash` + `google_search`, prompt que pide topes de usura vigentes y
  tasas de refi, JSON estricto, **guardarraíles por banda** (cualquier número fuera de
  banda se descarta y se mantiene el baseline). Persistido en storage `debt-relief`,
  `getStoredDebtRelief()`, `ageInDays()`.

### 5.3 `app/server/api/debt-relief.get.ts`
- Devuelve `{ ...live-or-baseline, asOf, updated, sources }`. Sin bloquear SSR (la
  página lo consume con `useLazyFetch(..., { server: false })`).

### 5.4 `app/server/tasks/debt-relief/monthly.ts`
- Task programada que llama a `refreshLiveDebtRelief()`. Registrada en `nuxt.config.ts`
  `scheduledTasks` con cron **mensual** (p.ej. `'30 9 1 * *'` = 09:30 del día 1) y su
  entrada en `experimental.tasks` / storage `debt-relief` como hace `costs`.

### 5.5 Test `app/tests/unit/debtRelief.test.ts`
- `checkPrescription` (casos: expirada, no expirada, límites, cada tipo).
- `computeReliefScore` (pesos suman 100; promedio ponderado correcto).
- `rankedServices` (orden estable; "negociar directo" primero o entre los primeros).
- Integridad de datos: cada servicio tiene score en cada dimensión de la rúbrica; cada
  fuente tiene URL.

### 5.6 Refactor de páginas existentes
- **`app/pages/salir-del-clearing.vue`**: recortar la sección "Cómo salir, en concreto"
  (6 pasos) a un resumen corto + puntero al playbook de `/saldar-deudas-uruguay`; añadir
  cross-link.
- **`app/utils/personalFinanceFaq.ts`**: corregir la FAQ `salir-del-clearing` que dice
  "impagas 5 años / pagas 2 años" → alinear a lo verificado (impaga 5 años + 5
  renovable una vez; cancelada hasta 5 años no renovable, Equifax ~3 en la práctica).
- **`app/pages/salud-financiera.vue`**: agregar cross-links a ambas páginas de deuda
  (hoy no enlaza a `/salir-del-clearing`).

### 5.7 Registro obligatorio (o CI falla)
- **`app/utils/siteNav.ts`**: `NavEntry` en la sección `services`, `to:
  '/saldar-deudas-uruguay'`, `labelKey: 'nav.saldarDeudas'`, icono `mdi-` apropiado
  (p.ej. `mdi-handshake-outline` o `mdi-cash-refund`), `keywords` (chaudeudas, mideuda,
  negociar deuda, quita, saldar deudas, prescripción, recuperadora…), `priority: 0.7`,
  `changefreq: 'monthly'`.
- **`app/i18n/locales/json/{es,en,pt}.json`**: `nav.saldarDeudas` en los tres.

### 5.8 SEO
- Slug `/saldar-deudas-uruguay`. `defineOgImageComponent('Cambio', …)` + `useSeoMeta` +
  `useHead` con JSON-LD `@graph` = `BreadcrumbList` + `FAQPage` (las 4 verdades y el
  veredicto por caso como Q&A). Canonical `https://cambio-uruguay.com/saldar-deudas-uruguay`.
- Targets: "chaudeudas opiniones", "mideuda vale la pena", "negociar deuda uruguay",
  "saldar deudas uruguay", "quita de deuda", "salir de deudas uruguay".

## 6. Cuidado editorial / legal

- Cada afirmación sobre una empresa nombrada lleva su fuente y distingue AUTODECLARADO /
  VERIFICADO / NO VERIFICADO. No se afirma "estafa". Los indicios no confirmados (vínculo
  ChauDeudas-Creditia) se marcan como indicio, no como hecho.
- Los hechos legales que vinieron de Reddit se afirman **solo** con su fuente jurídica
  primaria (IMPO / BCU / Equifax), nunca con Reddit como autoridad legal.
- Disclaimer visible: informativo, no asesoramiento; los casos concretos requieren
  abogado.

## 7. YAGNI / fuera de alcance

- No se construye login ni scraping en vivo de las deudas del usuario (eso es
  justamente lo que hacen las plataformas; nosotros derivamos al canal gratis del BCU).
- No se duplica el simulador de pago ni la calculadora de TEA (ya en
  `/salir-del-clearing`; se enlaza).
- No trilingüe en el cuerpo (patrón del sitio: cuerpo en español, solo el label de nav
  es trilingüe).

## 8. Criterios de aceptación

- La página carga en dev, sin errores de hidratación, dark y light.
- `checkPrescription` y la rúbrica cubiertos por tests unitarios que pasan.
- `siteNav-coverage.test.ts` verde (entrada de nav + label en los 3 locales).
- `/api/debt-relief` responde baseline aunque Gemini no esté disponible.
- `/salir-del-clearing` sigue funcionando con el recorte + cross-link; FAQ corregida.
- `npm run lint` limpio.
