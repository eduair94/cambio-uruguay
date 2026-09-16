# Oportunidades de Trends, tercera tanda — diseño

Fecha: 2026-09-16. Sigue a `2026-09-15-trends-oportunidades-design.md` (ventana "ahora") y `2026-09-15-trends-tanda-2-design.md`, las dos ya desplegadas. Origen: las filas que quedaron sin hacer del informe `docs/seo/2026-09-15-google-trends-oportunidades.md` más la cola de demanda propia del 2026-09-13 (`searchdemandqueues`).

## Alcance

| # | entregable | tipo | señal medida |
|---|---|---|---|
| L | `/guias/credito-hipotecario-uruguay` → comparativa con fuentes | reescritura de guía | "prestamo hipotecario" 85 y "simulador prestamo hipotecario" 21 en el índice de "préstamo"; "prestamo soñado bhu" +90 % |
| M | `/guias/enviar-recibir-dinero-exterior` → cobrar del exterior, con costos reales | reescritura de guía | "payoneer" +1.150 % (90 d); "como transferir de brou a prex" +50 %; las páginas de Prex son las de mejor CTR del sitio |
| N | `/pension-a-la-vejez-uruguay` | página nueva | "pensión" 2.000+ dos veces en Trending Now (10 y 13/9); completa el racimo BPS |
| Ñ | `/cuando-me-puedo-jubilar-uruguay` + mínima, incapacidad y "mi jubilación estimada" | refresh | "jubilacion minima" 26; "jubilacion por enfermedad" +90 %, "por incapacidad" +50 %; "bps mi jubilacion estimada" breakout |
| O | `/cuando-se-cobra-el-aguinaldo-uruguay` + construcción, licencia y plazo legal | refresh | "aguinaldo de la construcción 2026" +950 %; 4 preguntas en la cola de demanda propia |
| P | `/multas-de-transito-y-patente-uruguay` + consulta de deuda, motos y medios de pago | refresh | SUCIVE = 48 % del volumen de "dólar"; 7 consultas con veredicto "escribir" en la cola propia |
| Q | `/declaracion-de-irpf-uruguay` + crédito fiscal por alquiler | refresh | "irpf alquiler" +120 % (90 d) |

**Por qué reescrituras y no páginas nuevas en L y M.** Las dos guías ya existen y ya rankean: 716 y 380 palabras, sin tabla, sin FAQ y sin una sola fuente, y ninguna nombra las condiciones de un prestamista concreto ni la comisión de un proveedor concreto. Es el mismo estado en el que estaba `garantias-de-alquiler-uruguay` antes de la tanda 2, y ahí la reescritura sobre el mismo slug funcionó sin canibalizar nada. Una página nueva al lado competiría con la guía por la misma consulta.

Fuera de alcance: patente 2027 (los valores no están publicados), aguinaldo de diciembre como página propia (es el refresh O), IRPF 2027 (mayo/julio), Limpia Sueldos y préstamo sin recibo de sueldo (piden un relevamiento del crédito informal que no cabe acá), calendario mensual de pagos del BPS (necesita un job).

**Regla de hechos.** Igual que en las dos tandas anteriores: ningún número entra sin fuente oficial fechada. Los dossiers viven en el scratchpad de la sesión (`dossier-hipotecario.md`, `dossier-cobrar-exterior.md`, `dossier-pension-jubilacion.md`, `dossier-aguinaldo-sucive-irpf.md`); el plan copia de ahí los valores verbatim con su URL y su etiqueta. Lo que un proveedor no publica se escribe "no publica la tasa: simulá"; lo secundario va como aproximación explícita. En dinero ajeno (una hipoteca a 25 años) esto importa más que en el resto: **ninguna cuota de ejemplo se publica como si fuera una cotización**.

## L. Guía de crédito hipotecario → comparativa

Archivo: `app/utils/guidesReddit.ts`, entrada `slug: 'credito-hipotecario-uruguay'`. Se conserva el slug y se reescribe:
- `title` ≤ 60 nombrando a los prestamistas, `updatedAt: '2026-09-16'`, descripción 100–190.
- Secciones (7–9): qué es y quién presta; **la moneda es la decisión** (UI se ajusta por inflación, UR por salarios, y la cuota en pesos de hoy no es la de dentro de diez años; enlaces a `/indicadores/unidad-indexada` y `/indicadores/unidad-reajustable`); **tabla comparativa** (`headers: ['Prestamista', 'Moneda', 'Tasa', 'Plazo máximo', 'Financia hasta', 'Cuota máxima sobre el ingreso']`, una fila por prestamista con lo que publica cada uno o "no publica"); una sección por bloque (BHU y ANV, con el subsidio del Ministerio si existe; los bancos); **lo que no entra en la cuota** (gastos de escrituración, ITP, tasación, seguros de vida e incendio, gastos comunes); cuánto tenés que ganar y cuánto podés pedir; qué mirar antes de firmar.
- `faqs` ≥ 6: ¿cuánto tengo que ganar para un préstamo hipotecario?; ¿conviene en UI o en UR?; ¿cuánto financian?; ¿qué gastos hay además de la cuota?; ¿el BHU sigue prestando?; ¿hay subsidio del Estado?; ¿puedo comprar con un préstamo estando en el clearing? (remitir a `/salir-del-clearing`).
- `sources` ≥ 6 oficiales. `related`: `/comprar-o-alquilar-uruguay`, `/herramientas/conversor-unidad-indexada`, `/indicadores/unidad-reajustable`, `/venta-viviendas-uruguay`, `/oportunidades-inmobiliarias-uruguay`, `/guias/costos-de-escrituracion-uruguay`.
- Test nuevo `app/tests/unit/guidesHipotecario.test.ts`: nombra a BHU y ANV y a por lo menos tres bancos; la tabla tiene 6 columnas y ≥ 5 filas del mismo largo; ninguna fila publica una tasa que el prestamista no publique; ≥ 6 FAQ; ≥ 6 fuentes https; `updatedAt` correcto; sin markdown; sin "septiembre".

## M. Guía de enviar/recibir → cobrar del exterior

Archivo: `app/utils/guides.ts`, entrada `slug: 'enviar-recibir-dinero-exterior'`. Mismo slug, reescritura con el caso del freelancer adelante (es el que buscan), sin perder el caso de la remesa familiar:
- `title` ≤ 60 del tipo "Cobrar del exterior: Payoneer, Wise, Prex o banco", `updatedAt: '2026-09-16'`.
- Secciones (7–9): las tres vías (plataforma, banco, billetera) y qué cambia entre ellas; **tabla** (`headers: ['Vía', 'Qué te cobran por recibir', 'Qué te cobran por sacarlo', 'En qué moneda te queda', 'Cuánto demora']`); una sección por vía con lo que publica cada proveedor; **el costo que no se ve**: el tipo de cambio con el que te convierten, que suele pesar más que la comisión (enlazar la pizarra del sitio y `/comparar-plataformas-dolar-uruguay`); qué pide el banco (justificación de origen de fondos); el lado tributario en una sección corta y sin asesorar (exportación de servicios, monotributo vs unipersonal, con la cita de DGI); remesas familiares.
- `faqs` ≥ 6: ¿cuál es la forma más barata de cobrar del exterior?; ¿Wise funciona en Uruguay?; ¿me conviene que me paguen a Payoneer o por SWIFT al banco?; ¿puedo dejar los dólares sin convertir?; ¿tengo que facturar?; ¿el banco me va a pedir papeles?
- `sources` ≥ 5 (páginas de tarifas de los proveedores + DGI). `related`: `/contractor-en-uruguay`, `/comisiones-de-transferencia-uruguay`, `/comparar-plataformas-dolar-uruguay`, `/facturar-en-monotributo-uruguay`, `/cobrar-en-dolares-gastar-en-pesos`, `/comisiones-mercado-pago-uruguay`.
- Si el dossier confirma que un proveedor **no** opera para residentes uruguayos, la guía lo dice con esas palabras: es la mitad del valor de la página.
- Test `app/tests/unit/guidesCobrarExterior.test.ts`, análogo al de L.

## N. `/pension-a-la-vejez-uruguay`

- `app/utils/pensionVejez.ts` (puro): `PENSION_VERIFIED_AT`, `AMOUNT_2026` (el sitio ya publica $ 18.575: confirmar contra BPS), `AGE_REQUIREMENT`, `RESIDENCY_RULE`, `MEANS_TEST` (carencia de recursos: qué ingresos del solicitante y del núcleo la bloquean), `INCOMPATIBILITIES`, `APPLY_STEPS`, `PENSION_INVALIDEZ` (la pata de invalidez, con su edad y su junta médica), `PENSION_FAQ` (≥ 6), `PENSION_SOURCES` (≥ 4 de bps.gub.uy/gub.uy/impo).
- `app/pages/pension-a-la-vejez-uruguay.vue`: `VContainer`, un `<h1>` "Pensión a la vejez del BPS: requisitos y monto"; tarjeta con el monto vigente y desde cuándo; "¿Te corresponde?" (edad, residencia, carencia de recursos) con la advertencia de que la evalúa el BPS; qué la bloquea; cómo se pide; la diferencia con la jubilación y con el suplemento solidario (tabla chica de tres columnas); `FaqSection`; fuentes; seguir leyendo: `/cuando-me-puedo-jubilar-uruguay`, `/suplemento-solidario-bps`, `/asignacion-familiar-uruguay`, `/devolucion-fonasa-uruguay`, `/plan-de-vida-uruguay`.
- SEO: base del `title` ≤ 43; descripción ≤ 160 con el monto y la edad; OG `tag: 'BPS'`; JSON-LD `BreadcrumbList` + `Article`. siteNav sección `invest` junto al suplemento: `labelKey: 'nav.pensionVejez'`, `icon: 'mdi-account-clock'`, keywords: pension a la vejez, pension vejez bps, pension por invalidez, requisitos pension a la vejez, monto pension a la vejez, pension no contributiva, carencia de recursos bps. i18n es/en/pt.
- Test `app/tests/unit/pensionVejez.test.ts`: monto y edad oficiales, fuentes https, FAQ ≥ 6, fecha ISO.

## Ñ. Jubilación: mínima, incapacidad y "mi jubilación estimada"

Archivo: `app/pages/cuando-me-puedo-jubilar-uruguay.vue` (+ su util de datos si lo tiene). Tres secciones nuevas, con los hechos del dossier:
- **La jubilación mínima y la máxima** (mínima 2026 confirmada, cómo juega con el suplemento solidario, enlace a `/suplemento-solidario-bps`).
- **Si no podés seguir trabajando por salud**: la diferencia entre jubilación por incapacidad total, subsidio transitorio por incapacidad parcial y pensión por invalidez; requisitos, duración y quién decide (junta médica).
- **Mirá tu jubilación estimada**: qué es el servicio del BPS, qué necesitás, qué muestra y qué no (si incluye o no la pata de AFAP), con la URL oficial.
Más dos FAQ y keywords nuevas (`jubilacion minima 2026, jubilacion por incapacidad, jubilacion por enfermedad, mi jubilacion estimada, bps jubilacion estimada`). Descripción ≤ 160 si hoy la excede.

## O. Aguinaldo: construcción, licencia y plazo legal

Archivo: `app/pages/cuando-se-cobra-el-aguinaldo-uruguay.vue` (+ la guía `/guias/como-se-calcula-el-aguinaldo-uruguay` si comparte util). Secciones/FAQ nuevas:
- **El plazo legal y qué hacer si no te lo pagan**: fecha límite de cada cuota, dónde se reclama (Inspección General del Trabajo) y qué pasa con el empleador.
- **Aguinaldo de la construcción**: el régimen propio (quién lo paga, cuándo y cómo se calcula), que es lo que explica el +950 % de la consulta.
- **Si estuviste de licencia, enfermo o en seguro de paro**: qué genera aguinaldo y qué no, y qué paga el BPS sobre los subsidios.
- Las cuatro preguntas de la cola de demanda propia como FAQ: *me corresponde si trabajé 3 meses*, *si estoy incapacitado*, *qué pasa si no pagan a tiempo*, *cuántos días*.
- Aclarar que los jubilados **no** cobran aguinaldo (lo que cobran en diciembre, si algo, es otra cosa) — el dossier lo confirma.
- Keywords nuevas y descripción ≤ 160. Publicar ahora: el pico de la consulta es el 7 de diciembre y el índice tiene que estar antes.

## P. SUCIVE: consulta, motos y medios de pago

Archivo: `app/pages/multas-de-transito-y-patente-uruguay.vue`. La página ya explica el convenio, la prescripción y qué pasa si no pagás. Falta lo que la cola de demanda propia marcó como "escribir":
- **Cuánto debo**: cómo consultar la deuda (URL, qué necesitás: matrícula o padrón), y que el número que muestra incluye multas.
- **Cuándo se paga**: calendario de cuotas 2026 y la bonificación por pago contado, si existe.
- **Cómo pagar**: los canales reales (SUCIVE en línea, redes de cobranza, OCA si corresponde).
- **Motos**: si pagan y cómo se calcula su patente.
- Las siete consultas de la cola como FAQ (cuánto debo, cuándo vence, cómo hacer convenio —ya está, sólo enlazar—, cómo pagar, cuándo se paga, cuánto debe mi moto, puedo pagar con OCA).
- Keywords nuevas (`sucive cuanto debo, consulta deuda sucive, sucive como pagar, patente moto, sucive cuando vence, pagar patente con oca`).

## Q. Crédito fiscal de IRPF por alquiler

Archivo: `app/pages/declaracion-de-irpf-uruguay.vue` (+ su util). Sección nueva "Si alquilás, el crédito fiscal por arrendamiento": el porcentaje exacto con su base legal, los requisitos (identificación del arrendador, cómo se paga el alquiler), cómo y cuándo se reclama, el tope si lo hay, y qué pasa si no presentás declaración por otra cosa. Dos FAQ y keywords (`credito fiscal alquiler, irpf alquiler, deducir alquiler irpf, 6 por ciento alquiler irpf`). Enlace cruzado desde `/alquilar-en-uruguay` y desde la guía de derechos del inquilino si existe el bloque.

## Integración y verificación

Igual que las dos tandas anteriores: los implementadores no tocan `siteNav.ts` ni i18n (lo hace la integración de una vez); suites completas de `app/` + lint; commit por frente; push; verificación en producción de las dos guías reescritas, la página nueva y los cuatro refrescos (título, descripción, un solo FAQPage).
