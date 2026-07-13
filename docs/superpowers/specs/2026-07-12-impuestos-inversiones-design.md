# Impuestos sobre inversiones en Uruguay — diseño

Fecha: 2026-07-12
Estado: aprobado (pendiente de revisión del usuario)

## Problema

Los usuarios buscan "impuesto a las ganancias Uruguay". Ese impuesto **no existe con ese nombre**: lo que grava las rentas de inversión es el **IRPF Categoría I** (residentes), el **IRNR** (no residentes) y el **IRAE** (empresas). Hoy el sitio:

1. No tiene una página que responda esa búsqueda ni una calculadora de rentas de capital (la `/herramientas/calculadora-irpf` existente es **Categoría II**, sueldo).
2. **Publica información incorrecta** en `/inversiones-uruguay` y en los `taxNote` de `utils/investments.ts`.

La investigación (2026-07-12, contra fuentes primarias) encontró siete problemas en lo que publicamos. Están listados en "Correcciones obligatorias" más abajo. Dos de ellos pueden llevar a un usuario a **subdeclarar** (el ficto del 20% y el 8%), lo que es peor que no decir nada.

## Alcance

- Página nueva `/impuestos-inversiones-uruguay`.
- Calculadora nueva `/herramientas/calculadora-impuestos-inversiones` (dos modos).
- Módulo de datos `app/utils/capitalTax.ts` con las tasas legales verificadas y las funciones de cálculo puras.
- Correcciones a `/inversiones-uruguay` y `utils/investments.ts`.
- Integraciones: glosario, FAQs de economía personal, cross-links desde las calculadoras de sueldo, sección de residencia fiscal, `/mejores-bancos-uruguay`, `/salud-financiera`, `/invertir-en-proyectos-uruguayos`, `siteNav.ts`, `tools.ts`.

Fuera de alcance: IVA, IMESI, IRAE en detalle, monotributo, liquidación de IRPF Cat. II (ya existe).

## Principio rector: las tasas son ley, no las toca un modelo

Las tasas de impuesto se hardcodean, con fuente y fecha de verificación por dato. **Ningún refresh automático (Gemini u otro) puede reescribir una tasa tributaria** — el riesgo de publicar una tasa alucinada es inaceptable en contenido fiscal. Lo único que se lee en vivo es lo que ya leemos hoy:

- **BPC** → `/api/uy-figures` (ya existe, `uyFiguresLive.ts`).
- **UI** → API de cotizaciones, `code: 'UI'` (ya existe, patrón de `utils/indicators.ts`).

Los umbrales legales están expresados en BPC o en UI en la propia ley, así que el valor en pesos se **calcula** a partir del valor vivo, en vez de hardcodearse. Eso los mantiene correctos solos.

## Arquitectura

### `app/utils/capitalTax.ts` (nuevo)

Un módulo, dos responsabilidades separadas:

**(a) Catálogo de reglas.** Cada regla es un objeto con procedencia:

```ts
interface TaxRule {
  rate: number            // 0.12
  label: string
  law: string             // 'Título 7, art. 37 lit. B'
  sourceUrl: string
  verifiedOn: string      // '2026-07-12'
  confidence: 'confirmado' | 'no-resuelto'
}
```

`confidence: 'no-resuelto'` existe para **cripto**, que se renderiza como advertencia y sin número. Es un estado de primera clase, no un caso especial en la vista.

**(b) Funciones puras de cálculo**, sin dependencias de Vue ni de red:

- `taxOnDeposit({ amount, rate, currency, termMonths })` → resuelve la celda de la matriz de 9 tasas.
- `taxOnCapitalGain({ salePrice, cost, method: 'real' | 'ficto20' | 'ficto15' })`.
- `taxOnRent({ grossRent, deductions })` → 12% sobre neta, más el dato de la retención del 10,5%.
- `taxOnDividends`, `taxOnForeignIncome({ amount, withholdingAgent: 'custodio-local' | 'otro' | 'ninguno', foreignTaxPaid })`.
- `annualIrpfCatI(rentas[])` → total anual, con crédito por impuesto pagado en el exterior (topeado al IRPF de esas mismas rentas).

Las funciones reciben el valor de BPC/UI como parámetro. No lo buscan ellas. Así son testeables sin red y la página decide de dónde sale el valor.

### `app/pages/impuestos-inversiones-uruguay.vue` (nuevo)

Página editorial. Estructura de `/inversiones-uruguay` (VCard por sección, `officialSources`, disclaimer, FAQPage schema).

### `app/pages/herramientas/calculadora-impuestos-inversiones.vue` (nuevo)

`ToolShell`, como el resto de las herramientas. Dos modos en tabs:

- **Por instrumento**: instrumento + monto + plazo + tasa nominal → impuesto, tasa efectiva, **rendimiento neto**, y comparación contra una Letra del BCU (exenta). El valor de la calculadora está acá: un plazo fijo en pesos a 3 años paga 0,5% de IRPF y puede ganarle en neto a uno con tasa nominal más alta.
- **Declaración anual**: filas de rentas del año (depósitos, dividendos, alquiler, ganancias locales, ganancias del exterior) → IRPF Cat. I total, crédito por impuesto del exterior, y aviso de anticipos semestrales si no hay agente de retención.

Registrar en `utils/tools.ts` (categoría `impuestos`, ya existe) y en `utils/siteNav.ts` (si no, falla el test de cobertura).

## Datos verificados (2026-07-12)

Todo lo de abajo se leyó en fuente primaria. Es la entrada del módulo de datos; la implementación no debe re-investigar.

### Depósitos bancarios y ONs — matriz de 9 celdas
`Título 7 art. 37 lit. A` · [DGI](https://www.gub.uy/direccion-general-impositiva/comunicacion/publicaciones/irpf-rendimientos-capital-mobiliario)

| Moneda | ≤ 1 año | > 1 y ≤ 3 años | > 3 años |
|---|---|---|---|
| Pesos, tasa fija nominal | 5,5% | 2,5% | 0,5% |
| Pesos con reajuste (UI) | 10% | 7% | 5% |
| Moneda extranjera (USD) | 12% | **12%** | 7% |

Trampa: en el HTML de DGI la celda "USD / 1–3 años" es un `rowspan` del 12%. Quien copia la tabla visualmente deja un hueco. **No dejar esa celda vacía.**

### Resto de las tasas
- General ("restantes rentas"): **12%** — T7 art. 37 lit. B.
- Dividendos y utilidades de contribuyentes de IRAE, **y dividendos fictos del art. 19** (siguen vigentes en 2026): **7%** — **T7 art. 37 lit. B**.
  ⚠️ El art. 37 **lit. B** se titula *"Otras Rentas"* y contiene **las dos filas**: la de dividendos y utilidades al **7%** *y* la de "restantes rentas" al **12%**. No es "el artículo del 12%": es el de ambos. Citar el 7% con `Título 7, art. 37 lit. B` es correcto, y ya hizo tropezar a más de un revisor.
  El 7% es **solo de fuente uruguaya** (dividendos distribuidos por **contribuyentes de IRAE**). Los dividendos de una empresa **del exterior** son renta de fuente extranjera y pagan **12%** (ver más abajo): toda etiqueta de UI que ofrezca "dividendo" debe dejar eso fuera de toda duda.
- Exoneración de dividendos de unipersonales/sociedades personales con ingresos ≤ 4.000.000 UI.
- **Deuda pública uruguaya (Bonos del Tesoro, Letras de Tesorería, LRM del BCU, Globales en UI): EXENTA** de IRPF — y no solo el interés: T7 art. 38 lit. A exonera *"cualquier otro rendimiento de capital o incremento patrimonial derivado de la tenencia o transferencia"*. También **no computable** en Impuesto al Patrimonio (T14 art. 23). Idéntico para IRNR (T8 art. 19 lit. A).
- **FCI locales**: exentos **solo si** invierten en valores públicos o privados con oferta pública (T7 art. 38 lit. P). Si invierten en otra cosa, no aplica.

### Alquileres
- Tasa: **12% sobre la renta NETA** (T7 art. 37 lit. B + art. 35 lit. A).
- **El 10,5% es la RETENCIÓN, no la tasa** (Dec. 148/007 art. 37, redacción del Dec. 95/026 art. 25). ≈ 12% × 87,5%, asume ~12,5% de gastos. El contribuyente puede dejarla como definitiva o liquidar por lo real.
- Deducciones (T7 art. 16): comisión de la **administradora de propiedades** (no "comisión inmobiliaria" genérica), honorarios por contrato, IVA de esos servicios, **Contribución Inmobiliaria**, **Impuesto de Enseñanza Primaria**, arrendamiento pagado por el subarrendador, incobrables.
- **Exoneración pequeños arrendadores (T7 art. 38 lit. J): la condición NO es identificar al inquilino.** Es: rentas ≤ **40 BPC anuales** **y** autorizar expresamente el **levantamiento del secreto bancario**. No opera si tiene otros rendimientos de capital > 3 BPC anuales.
- Lo de "identificar" es otra cosa: el art. 51 da al **inquilino** un crédito de hasta 8% del alquiler si identifica al **arrendador**.

### Incrementos patrimoniales
Regla general: **(precio − costo fiscal actualizado por UI/IPC) × 12%** (T7 arts. 29 y 32).

| Caso | Base ficta | Efectiva | Naturaleza |
|---|---|---|---|
| Inmuebles no rurales pre-1/7/2007 | 15% del precio | 1,8% | **opción** |
| Inmuebles rurales pre-2007 | 15% del valor en plaza al 1/7/2007 + diferencia de precio | ≠ 1,8% | fórmula distinta |
| Valores/muebles, **sin costo probable** | 20% del precio | 2,4% | **obligatorio** |
| Bienes pre-Ley 18.083 | 20% del precio | 2,4% | **opción** |
| Bienes en el **exterior** (2026) | 20% del precio | 2,4% | **opción anual** vía DJ |
| Inmuebles en el exterior (2026) | 15% del precio | 1,8% | **opción anual** |

**El 20%/2,4% no es el régimen por defecto de "venta de valores".** Con costo documentado la regla es la real, al 12%.

Exoneraciones (T7 art. 38):
- lit. I) Operaciones ≤ **30.000 UI** cada una **y** suma anual de esas operaciones < **90.000 UI**.
- lit. E) Acciones/ONs/valores de fideicomisos con oferta pública y cotización bursátil.
- lit. L) Vivienda permanente: ≤ 1.200.000 UI, ≥50% reinvertido en nueva vivienda permanente dentro de 12 meses, nueva ≤ 1.800.000 UI.
- **lit. G) y H) La diferencia de cambio por tenencia de moneda extranjera está EXENTA.** Tener dólares y que suba el dólar no genera IRPF.
- art. 27 lit. B) **La herencia no paga IRPF** (transferencia por el modo sucesión no es alteración patrimonial). Uruguay no tiene impuesto sucesorio.

### Cripto — no resuelto, y así hay que decirlo
- No hay norma tributaria específica. La única posición oficial conocida es la Consulta DGI Nº 6.419 (2021): cripto = bien mueble incorporal / intangible. **No accedimos al texto primario de esa consulta** — citarla como "según fuentes secundarias".
- **La Ley 20.345 (activos virtuales) NO cambió la tributación** — regula a los PSAV y su supervisión por BCU.
- Post-2026 la **fuente** (uruguaya vs extranjera) de la cripto **sigue sin definirse**. Ni el Decreto 95/026 ni la Resolución DGI 1517/2026 mencionan cripto.
- **No publicar un número.** La página dice: no está resuelto, estas son las dos lecturas posibles, consultá un contador.

### Reforma 2026 — rentas de fuente extranjera (bloque destacado)
Ley **20.446** (Presupuesto), D.Of. 08/01/2026, **vigencia 1/1/2026**. Reglamentada por **Decreto 95/026** (06/05/2026) y **Resolución DGI 1517/2026**.

Antes (Ley 18.718, 2011–2025): solo se gravaban los **rendimientos** de capital **mobiliario** del exterior (intereses, dividendos) al 12%. **Las ganancias de capital del exterior no estaban gravadas.**

Qué cambió (**T7 art. 6 num. 2, sustituido por la Ley 20.446 art. 653**; el mismo art. 653, en su **num. 9**, sustituyó el **T7 art. 52 lit. A**):
1. Se amplía a **todos los rendimientos de capital**, incluido el **inmobiliario** (alquiler de inmueble en el exterior).
2. Se gravan por primera vez los **incrementos patrimoniales** del exterior (vender acciones, ETFs, bonos extranjeros).
3. **Excepciones** (art. 18 lit. A, C, D): regalías, marcas, patentes, llaves, derechos de autor, arrendamiento de bienes muebles, cesión de imagen e **instrumentos financieros derivados**.

**Tasa: 12%.** Quién la fija: la **fuente** de la renta la trae al IRPF el **T7 art. 6 num. 2** (sustituido por la **Ley 20.446 art. 653**), y la **alícuota** es la de "restantes rentas" del **T7 art. 37 lit. B**. El **art. 52 lit. A NO es la norma de la tasa**: es la de la retención.

El **8% es una retención reducida, no una tasa** (**T7 art. 52 lit. A** —sustituido por la **Ley 20.446 art. 653 num. 9**— + **Dec. 148/007 arts. 44 quinquies y sexies**, redacción del Dec. 95/026):
- Solo puede retener al 8% una **entidad residente que intermedie profesional y habitualmente activos mobiliarios en entidades no residentes Y EJERZA LA CUSTODIA** de esos activos. Es decir, un **bróker/custodio uruguayo**. No "cualquier agente residente", no un banco cualquiera.
- Es **definitiva solo si el contribuyente OPTA** por tomarla como tal (y así se libera de la DJ).
- Otros agentes (bancos, corredores de bolsa, fondos, fideicomisos que actúan por cuenta y orden de terceros — art. 44 quater) retienen **12%**, y solo por incrementos patrimoniales.

**Sin agente de retención (ej. Interactive Brokers directo): anticipos semestrales obligatorios al 12%** (Dec. 95/026 arts. 44 duodecies y terdecies), que pueden hacerse definitivos y liberar de la DJ.

**Step-up al 31/12/2025 — el dato más valioso y menos difundido.** Para activos que coticen en **bolsas de reconocido prestigio** adquiridos antes del 31/12/2025, el **costo fiscal es la cotización al 31/12/2025** (T7 art. 32 + Dec. 95/026 art. 18). **Toda la apreciación anterior a 2026 queda fuera del impuesto.** Si la renta así calculada da negativa, no puede compensarse con otras rentas.

**Fin del diferimiento vía offshore.** El art. 21 imputa las rentas del art. 6 num. 2 obtenidas por entidades no residentes **directamente al beneficiario final con participación ≥ 5%**, se distribuyan o no. El art. 22, que limitaba esto a jurisdicciones de baja tributación (BONT), **fue derogado** (Ley 20.446 art. 655). Interponer una sociedad ya no difiere el impuesto.

**Crédito por impuesto pagado en el exterior: SIGUE VIGENTE** (T7 art. 25 + Dec. 95/026 art. 30). Topeado al IRPF de esas mismas rentas. El propio agente de retención puede computarlo con los estados de cuenta del exterior.

Tasas reducidas para impatriados dentro del régimen: art. 24-Bis sub-apartado i) → **6%**; art. 24 lit. b) (viejo "7% para siempre") → **7%**.

Calendario real: las retenciones **se empiezan a verter a DGI recién en julio de 2026** (Dec. 95/026 art. 44 nonies).

### Residencia fiscal
Basta **cualquiera** de (T7 art. 2): **>183 días** en el año civil; o radicar el **núcleo principal de actividades o intereses económicos/vitales**. Presunción: si cónyuge e hijos menores dependientes residen habitualmente acá.

Reglamento (Dec. 148/007 art. 5-BIS): cuentan todos los días con presencia física efectiva. **Las ausencias esporádicas ≤ 30 días corridos cuentan como presencia**, salvo certificado de residencia fiscal de otro país. Obtener **solo rentas puras de capital NO configura** base de actividades.

Residencia por inversión (usar UI viva para el equivalente en $):

| Vía | Umbral | Condición extra |
|---|---|---|
| Inmuebles | UI 15.000.000 | — |
| Empresa | UI 45.000.000 | Proyecto declarado de interés nacional (Ley 16.906) |
| **Inmuebles (la vía usada)** | **UI 3.500.000** | Desde 1/7/2020 + **≥ 60 días** de presencia efectiva |
| Empresa | UI 15.000.000 | Desde 1/7/2020 + **≥ 15 puestos** de trabajo nuevos, dependientes, full time |

(El umbral es UI 3.500.000, no 3.700.000.)

### Tax holiday — el régimen viejo CERRÓ
- **La opción del art. 24 (incluido el "7% para siempre") solo podía ejercerse hasta el 31/12/2025.** Quedó grandfathered para quien ya la eligió; **no está disponible para quien se hace residente desde 2026**.
- **Nuevos residentes desde el 1/1/2026 → art. 24-Bis** (Ley 20.446 art. 648): tributar **IRNR por el ejercicio del cambio + 10 siguientes (11 en total)**, por única vez, solo sobre las rentas del art. 6 num. 2. Requiere no haber sido residente en los 2 ejercicios anteriores, y cumplir **una** de:
  - Inmuebles > **UI 12.500.000**
  - Fondos de inversión para proyectos productivos/investigación/innovación ≥ **UI 625.000 anuales**
  - **> 183 días en cada ejercicio fiscal → sin inversión**
- Al vencer los 11 años, por hasta 20 ejercicios: (i) IRPF al **6%** (50% de la tasa) por 5 ejercicios si mantiene la condición de inversión o compra inmuebles > UI 6.250.000; o (ii) **monto fijo de UI 1.875.000/año** (baja a UI 1.250.000 si configura >183 días o invierte > UI 45.000.000 en capacidad productiva). Cónyuges: 15% de esos montos fijos.
- ⚠️ Hay un "Proyecto de Ley de Competitividad" que podría volver a modificar el régimen de impatriados. **No verificamos su contenido ni su estado parlamentario.** La sección debe llevar fecha visible.

### IRNR (no residentes)
Misma matriz de 9 tasas para depósitos. Dividendos y dividendos fictos **7%**. Entidades de países de baja o nula tributación (BONT), salvo dividendos de contribuyentes de IRAE: **25%**. Restantes rentas **12%**. Deuda pública **exenta**.

### Impuesto al Patrimonio — personas físicas
- **Es TERRITORIAL** (T14 art. 10): solo bienes situados, colocados o utilizados económicamente en la República. ⇒ **Tu cartera en un bróker del exterior y tu inmueble en el exterior NO pagan Impuesto al Patrimonio uruguayo**, aunque desde 2026 sus rentas sí paguen IRPF. Son dos impuestos distintos.
- **Residentes: 0,10% PLANO.** No es una escala progresiva. La escala del T14 art. 53 fue abatida 0,10 puntos por año desde 2016 con piso de 0,10% y **ya convergió**.
- La escala 0,70 / 1,10 / 1,40 / 1,50% que circula en guías es la de **no residentes que no tributan IRNR**. Confundirlas es el error más común.
- MNI del ejercicio 2025 (que se declara en 2026, Dec. 334/025): **$6.653.000** personas físicas · **$13.306.000** núcleo familiar. **El MNI de 2026 todavía no existe** — lo fija un decreto a fines de 2026. Mostrar el dato con su año explícito.
- No computables: deuda pública, valores del BHU y del BCU (→ LRM), Bonos y Letras de Tesorería, acciones de la CND; **fondos acumulados en AFAP**; ONs de empresas que cotizan en bolsa.
- Depósitos bancarios de personas físicas: el art. 23 los lista *"al solo efecto de la determinación ficta del valor del ajuar"*. La lectura estándar es que **no están en la base gravada pero sí suman para el ajuar ficto**. La redacción es oblicua: publicarlo con esa salvedad, no como afirmación categórica.

### IASS 2026 — corrección importante
[BPS](https://www.bps.gub.uy/18002/el-impuesto-de-asistencia-a-la-seguridad-social-iass.html), con BPC 2026 = $6.864.

| Ingresos anuales | Tasa |
|---|---|
| Hasta **108 BPC** | Exento |
| 108 – 180 BPC | **6%** |
| 180 – 600 BPC | 24% |
| > 600 BPC | 30% |

MNI mensualizado: **9 BPC**. Las calculadoras uruguayas que salen primero en Google **siguen publicando 96 BPC y primera franja del 10%** — obsoleto. Si copiamos de ahí, publicamos un error. Los montos en pesos se calculan con el BPC vivo.

### Cumplimiento
- **Formulario 1101** = IRPF Categoría I. (1102/1103 = Categoría II.)
- **Campaña 2026 (ejercicio 2025): 29 de junio – 31 de agosto de 2026**, ventana única. **No hay escalonamiento por terminación de RUT/CI para la DJ anual** — eso aplica a obligaciones mensuales. No publicar fechas por dígito.
- En Uruguay **retienen automáticamente** (bancos, sujetos pasivos de IRAE, organismos públicos). El contribuyente puede darles carácter definitivo y quedar liberado de la DJ. Alquileres: retiene la administradora al 10,5%.
- **Brókers del exterior: no hay retención uruguaya** ⇒ anticipos semestrales al 12% o DJ.
- Multas por mora (Código Tributario art. 94): **5%** dentro de 5 días hábiles · **10%** hasta 90 días corridos · **20%** después · más recargo mensual. DJ fuera de plazo: **$910**, monto uniforme sin importar el atraso (Res. DGI 097/026).

### CRS — ¿la DGI ya ve tu cuenta del exterior?
- **Uruguay aplica CRS desde 2017** (Ley 19.484). Informa y **recibe** información automáticamente de las jurisdicciones socias. Alcanza cuentas de depósito, **de custodia**, participaciones de capital/deuda, seguros con valor de rescate y rentas vitalicias.
- 🚨 **EE.UU. no está en CRS.** Uruguay no figura en la lista de acuerdos FATCA del US Treasury. Con EE.UU. hay un acuerdo de intercambio **a requerimiento**, caso por caso — no automático, no "al barrer".
- ⚠️ Matiz **no verificado**: los clientes no estadounidenses de brókers como Interactive Brokers suelen ser onboardeados a entidades en Irlanda/Reino Unido/Hungría, que **sí** son CRS. No verificamos a qué entidad se asigna a los residentes uruguayos. **No afirmarlo.**

## Correcciones obligatorias a lo ya publicado

1. **`/inversiones-uruguay`, sección "Impuestos"** — reescribir. Hoy dice que el 8% es una "retención definitiva reducida … si un agente residente actúa como retentor" (mal: el 8% no es tasa, exige custodio local, y es definitiva solo por opción) y que la venta de valores tributa sobre base ficta del 20% ≈ 2,4% (mal: el ficto no es el default; con costo probado es 12% sobre la ganancia real).
2. **`utils/investments.ts`** — los 12 `taxNote` repiten la fórmula genérica "IRPF 12% general … con tasas reducidas según instrumento (consultar contador)", que no dice nada útil, y varios repiten el error del 8%. Reescribir uno por uno con la tasa concreta que le corresponde a ese instrumento, y enlazar a la página nueva.
3. **FAQ "¿Cómo se pagan impuestos por invertir en Uruguay?"** en `/inversiones-uruguay` — revisar contra lo de arriba.
4. Auditar el resto del sitio por: IASS con 96 BPC / 10%; Impuesto al Patrimonio con escala progresiva para residentes; "7% para siempre" como opción vigente; cualquier número dado para cripto; fechas de DJ por terminación de cédula.

## Integraciones

- **Glosario** (`utils/glossary.ts`): IRPF Categoría I, IRPF Categoría II, IRNR, IRAE, IASS, incremento patrimonial, renta de fuente extranjera, residencia fiscal, CRS, step-up, dividendo ficto, ficto del 20%.
- **FAQs** (`utils/personalFinanceFaq.ts`, categoría `ahorro_inversion`): ¿pago impuestos por mi cuenta en eToro / IBKR? ¿y por cripto? ¿me retiene el banco? tengo dólares y subió el dólar, ¿pago? ¿tengo que declarar si ya me retuvieron? heredé, ¿pago?
- **Cross-links**: `/herramientas/calculadora-irpf` y `/herramientas/calculadora-sueldo-liquido` son Cat. II — aclararlo y enlazar a la nueva.
- **`/mejores-bancos-uruguay`**: quién retiene IRPF automáticamente.
- **`/salud-financiera`** y **`/invertir-en-proyectos-uruguayos`**: mención + enlace.
- **`utils/siteNav.ts`**: registrar ambas rutas con keywords (`impuesto a las ganancias`, `irpf inversiones`, `impuestos cripto uruguay`, `impuestos broker exterior`, `residencia fiscal`, `tax holiday`). Sin esto **falla el test de cobertura de nav**.
- **`utils/tools.ts`**: registrar la calculadora en la categoría `impuestos`.

## Tests

- **TDD en `capitalTax.ts`** (`tests/unit/capitalTax.test.ts`): las 9 celdas de la matriz de depósitos (incluida la de USD 1–3 años, que es la que se copia mal); ficto vs real en incrementos patrimoniales; exoneración de 30.000/90.000 UI; crédito por impuesto del exterior con su tope; renta neta de alquiler con deducciones; que cripto devuelva `no-resuelto` y no un número.
- Test de cobertura de `siteNav` (ya existe, hay que registrar las rutas).
- E2E smoke de la calculadora, con gate de hidratación (`toPass` con reintentos — patrón ya conocido del repo).

## Riesgos

- **Riesgo principal: publicar un número tributario incorrecto.** Mitigación: cada tasa lleva `law` + `sourceUrl` + `verifiedOn` en el código; ningún proceso automático las reescribe; cripto es explícitamente `no-resuelto`.
- **Contenido perecedero**: el MNI del Impuesto al Patrimonio 2026 aún no existe, y hay un proyecto de ley que podría cambiar el régimen de impatriados. Toda sección con esas cifras lleva **fecha visible** y la fuente.
- **Responsabilidad**: la página no es asesoramiento fiscal. Disclaimer visible, como en `/inversiones-uruguay`.
