# `/que-empresa-abrir-uruguay` — Diseño

**Fecha:** 2026-07-13
**Estado:** spec aprobado, pendiente plan de implementación
**Ruta:** `/que-empresa-abrir-uruguay`
**Tipo:** página de contenido (guía) con herramienta interactiva embebida — NO va bajo `/herramientas`

---

## 1. Qué es y por qué

Una persona con un emprendimiento (o a punto de arrancar uno) necesita decidir **bajo qué figura legal operar** en Uruguay: monotributo, monotributo social MIDES, unipersonal Literal E, unipersonal IRAE, SAS, SRL. La decisión tiene consecuencias tributarias, previsionales y **patrimoniales personales** (responsabilidad ilimitada vs. limitada), y equivocarse tiene costos reales — incluido un **cerrojo de 3 años** para volver a entrar a los regímenes simplificados.

El SERP en español sobre este tema está **fuertemente contaminado por content farms con IA** (`cuantomecuesta.com`, `ahorrin.app`, `calculame.uy`, `sociedadesanonimas.uy`, `elchusmero.com`). Fechan mal la Ley 19.820, inventan aranceles notariales y reciclan cifras de 2024 como si fueran de 2026. La ventaja competitiva de esta página **es ser exacta y citar la norma**, no ser más larga.

**Ángulo/keyword:** "qué empresa abrir uruguay", "monotributo o unipersonal", "conviene SAS o unipersonal", "cómo formalizar mi emprendimiento".

### Principio rector

> Esta página informa; no asesora. Toda cifra lleva fuente primaria (BPS / DGI / IMPO / gub.uy) y fecha de verificación. **Ninguna cifra sin fuente primaria se publica.** Donde la norma es ambigua, se dice que es ambigua.

---

## 2. Decisiones de diseño ya tomadas

| Decisión | Elegido |
|---|---|
| Forma de la página | **Recomendador (wizard) + guía completa debajo** |
| Alcance | **Completo**, incluido el camino informal → formal y Monotributo Social MIDES |
| Manejo de cifras | **Baseline verificado a mano + auto-refresh guardado** (patrón `costOfLivingLive.ts` / `uyFiguresLive.ts`) |
| Slug | **`/que-empresa-abrir-uruguay`** |
| Zona gris freelance/Literal E | **Exponer la tensión, no resolverla.** Recomendar el camino sólido (IRPF Cat. II) y marcar Literal E como "consultá contador" |
| Datos no verificables | **Omitir, y decirlo.** Recuadro "Lo que no podemos afirmar" |

---

## 3. Arquitectura

```
app/pages/que-empresa-abrir-uruguay.vue     ← página (Spanish-only inline, como el resto de las guías)
app/utils/companyTypes.ts                   ← módulo PURO: catálogo de regímenes + compuertas + motor de costo
app/tests/unit/companyTypes.test.ts         ← vitest (node env)
app/utils/siteNav.ts                        ← + 1 NavEntry (OBLIGATORIO: si no, falla siteNav-coverage.test.ts)
app/i18n/locales/json/{es,en,pt}.json       ← + nav.queEmpresaAbrir (SOLO la etiqueta de nav)
app/server/utils/companyFiguresLive.ts      ← refresher guardarraileado (Gemini grounded)
app/server/api/company-figures.get.ts       ← handler cacheado, se auto-sana si está viejo
app/server/tasks/company/daily.ts           ← tarea programada
app/nuxt.config.ts                          ← + storage namespace + cron
```

`companyTypes.ts` es un **módulo puro** (sin imports de Vue/Nuxt, solo imports relativos) para poder testearlo en Node puro. Sigue el patrón de `personalFinance.ts` / `bankTierlist.ts` / `costOfLiving.ts`.

### El valor de la UI: dos valores distintos, y confundirlos es un bug

- **UI de HOY** (≈ $6,6150 al 13/07/2026): se lee **en vivo** del BCU, código de moneda `9800`, vía la API que el sitio ya consume. Se usa **solo** para mostrar "cuánto vale la UI hoy" y para conversiones informativas.
- **UI al CIERRE DEL EJERCICIO ANTERIOR** ($6,4237 al 01/01/2026): es la que la ley usa para fijar los topes del ejercicio en curso. **Los topes en pesos se calculan con ESTA**, y son fijos durante todo 2026.

> 🐛 **Bug a evitar:** calcular el tope de monotributo como `183.000 × UI_de_hoy`. Da $1.210.545 en vez de **$1.175.537**. Los topes en pesos son **constantes anuales publicadas por BPS/DGI**, no un cálculo en vivo. Se guardan como constante verificada y se refrescan una vez por año.

---

## 4. El motor del veredicto: compuertas legales, después costo

**No es un score ponderado.** Un régimen para el que no calificás no es "peor": es **ilegal**. El algoritmo es:

1. **Aplicar compuertas de elegibilidad** → cada régimen queda `elegible` | `excluido(razón, norma)` | `dudoso(razón, norma)`.
2. **Entre los elegibles**, calcular el costo anual total (BPS del titular + impuesto + contador estimado).
3. **Ordenar por costo**, pero **sobreescribir** con avisos de responsabilidad y de cerrojo cuando corresponda.
4. Mostrar **por qué se descartó cada uno**, con la norma citada. Eso es lo que hace la página auditable.

### 4.1 Inputs del wizard (6 preguntas)

| # | Pregunta | Valores |
|---|---|---|
| 1 | Facturación anual estimada | monto en UYU o USD (con toggle) |
| 2 | ¿Qué vendés? | bienes / servicios personales (profesional u oficio) / ambos |
| 3 | ¿Quiénes son tus clientes? | consumidor final / empresas / exterior / mixto |
| 4 | ¿Cuántos son? | solo / con cónyuge o concubino / 2+ socios |
| 5 | ¿Empleados? | ninguno / 1 / 2+ |
| 6 | Riesgo: ¿empleados, deuda, inventario a crédito, contratos con penalidades, o daño posible a terceros? | sí / no |

Adicional (opcional, colapsado): ¿ya sos socio de otra sociedad o director de una SA, aunque esté inactiva? — porque **eso solo mata el monotributo**.

### 4.2 Las compuertas (todas verificadas contra norma)

| Condición del usuario | Régimen que MATA | Norma |
|---|---|---|
| Presta **servicios personales** fuera de relación de dependencia | **Monotributo** | Ley 18.083 art. 72 lit. C |
| Presta servicios personales puros (renta de trabajo, no empresarial) | **Literal E → DUDOSO**, no excluido | Título 4 art. 66 lit. E + [Consulta DGI 4761](https://www.impo.com.uy/bases/consultas-tributarias/4761-2008) |
| Es socio de cualquier sociedad personal o director de SA, **aun inactivo** | **Monotributo** | Ley 18.083 art. 72 lit. A |
| Vende a **no consumidores finales** (empresas) | **Monotributo** | Ley 18.083 art. 71 lit. D |
| Tiene **más de 1 dependiente** (unipersonal) o **cualquiera** (soc. de hecho) | **Monotributo** | Ley 18.083 art. 70; Dto. 199/007 art. 2 |
| Local **> 15 m²**, o local en shopping/centro comercial | **Monotributo** | Dto. 199/007 arts. 5 y 6 |
| Más de **un** puesto/local simultáneo | **Monotributo** | Dto. 199/007 art. 3 |
| Activos **> 152.500 UI** ($979.614) en cualquier momento del ejercicio | **Monotributo** | Dto. 199/007 art. 4 |
| Ingresos **> 183.000 UI** ($1.175.537) — unipersonal | **Monotributo** | Ley 18.083 art. 71 lit. A |
| Ingresos **> 305.000 UI** ($1.959.229) — soc. de hecho, o Literal E | **Monotributo soc. hecho / Literal E** | ídem + Título 4 art. 66 lit. E |
| Ingresos > 305.000 UI | **Literal E** | Título 4 art. 66 lit. E |
| Optó por IRAE | **Literal E** | Título 4 art. 66 lit. E |
| Transportista terrestre de carga, óptica, o giro exclusivo venta de libros | **Literal E** | Título 4 art. 66 lit. E |
| Rentas agropecuarias | **Literal E** | ídem |
| **2 o más socios** | **Unipersonal** (quedan soc. de hecho / SRL / SAS) | naturaleza de la figura |
| **1 solo socio** | **SRL** (mínimo legal: 2 socios) | Ley 16.060 art. 1 y art. 223 |
| Necesita **responsabilidad limitada** | **Unipersonal, monotributo y soc. de hecho** (todas tienen responsabilidad ILIMITADA) | Ley 16.060 art. 39; *prenda general* |
| Cualquier forma societaria (SAS/SRL/SA/civil) | **Monotributo** — es taxativo: solo unipersonal y soc. de hecho | Ley 18.083 art. 70 |

### 4.3 Los cerrojos de salida — se muestran EN el veredicto, no en el FAQ

Estos cambian la decisión y ninguna otra página los explica bien:

- **Monotributo:** al incumplir *cualquier* condición (ingresos, activos, segundo local, venta a empresa) salís **de pleno derecho e inmediato** — no "el año que viene". Y **no podés volver hasta que finalice el tercer año civil posterior** al de la exclusión. **Aplica incluso si te vas voluntariamente.** (Dto. 199/007 arts. 13 y 14.)
- **Literal E:** al superar el tope liquidás IRAE **sobre las rentas devengadas correspondientes al excedente, en ese mismo ejercicio** (no es retroactivo al año entero, pero tampoco es un cambio "desde enero"). Y quedás obligado a liquidar IRAE por **un mínimo de 3 ejercicios**. Lo mismo si optás por salir voluntariamente.
- **Opción IRAE (servicios personales):** una vez ejercida, **mínimo 3 ejercicios**. IRAE pasa a ser **preceptivo** (no opcional) si los ingresos superan **4.000.000 UI**.

Regla de UI del veredicto: si la facturación declarada está a **menos del 15% del tope**, el veredicto muestra un aviso destacado de cerrojo antes de recomendar el régimen simplificado.

---

## 5. Cifras verificadas (baseline 2026)

Toda cifra abajo tiene fuente primaria. Van a `companyTypes.ts` como constantes con `source` y `verifiedAt`.

### 5.1 Índices base

| Valor | Monto | Fuente |
|---|---|---|
| UI (hoy, 13/07/2026) | $6,6150 | BCU (live, código 9800) / [DGI](https://www.gub.uy/direccion-general-impositiva/datos-y-estadisticas/datos/unidad-indexada) |
| UI al 01/01/2026 (fija los topes 2026) | $6,4237 | [INE](https://www5.ine.gub.uy) |
| BPC 2026 | $6.864 | [Decreto 11/026](https://www.impo.com.uy/bases/decretos/11-2026) |
| BFC 2026 | $1.847,96 | [BPS Valores actuales](https://www.bps.gub.uy/5478/valores-actuales.html) |
| UR (julio 2026) | $1.922,68 | ídem |
| Salario mínimo (desde 01/07/2026) | $25.383 | [MTSS](https://www.gub.uy/ministerio-trabajo-seguridad-social) |

> ⚠️ **BFC ≠ BPC.** Varios estudios contables (incl. Forvis Mazars) dicen que el ficto de la unipersonal es "11 BPC". **Es 11 BFC = $20.328.** Confundirlos multiplica el ficto por 3,7.

### 5.2 Topes 2026 (constantes anuales, NO calculadas en vivo)

| Tope | UI | UYU 2026 | Fuente |
|---|---|---|---|
| Monotributo — unipersonal | 183.000 | **$1.175.537** | [BPS](https://www.bps.gub.uy/23987/tope-de-ingresos-y-capital-de-la-empresa.html) |
| Monotributo — soc. de hecho | 305.000 | **$1.959.229** | ídem |
| Monotributo — activos | 152.500 | **$979.614** | ídem |
| Literal E (pequeña empresa) | 305.000 | **$1.959.229** | [DGI, 09/01/2026](https://www.gub.uy/direccion-general-impositiva/comunicacion/publicaciones/tope-ingresos-anuales-para-pequenas-empresas-iva-minimo) |
| IRAE preceptivo / contabilidad suficiente | 4.000.000 | ≈ $25,7 M | Dto. 150/007 art. 168 |
| Dividendos exentos (SAS/SRL) — ver §5.6 | 4.000.000 | ≈ $25,7 M | Título 7 art. 38 lit. C + Dto. 148/007 |

### 5.3 Monotributo — costo mensual 2026

Ficto: **5 BFC = $9.240**. No hay categorías ni escalas (a diferencia de Argentina).
Fuente: [BPS Ley 18.083](https://www.bps.gub.uy/6668/monotributo-ley-18083.html) y [BPS Ley 19.942](https://www.bps.gub.uy/18051/monotributo-ley-19942.html), vigencia enero 2026 (últ. act. 03/02/2026).

**Unipersonal sin dependientes — régimen pleno (empresas pre-2021, o desde el mes 25):**

| | Sin FONASA | Con FONASA (sin cónyuge, sin hijos) | Con FONASA (sin cónyuge, con hijos) | Con FONASA (con cónyuge, sin hijos) | Con FONASA (con cónyuge, con hijos) |
|---|---|---|---|---|---|
| Total mensual | **$2.637** | **$6.327** | **$6.996** | **$7.219** | **$7.888** |

**Gradualidad Ley 19.942** (empresas que inician desde 01/01/2021):

| Período | Sin FONASA | Con FONASA (sin cónyuge, sin hijos) |
|---|---|---|
| Meses 1–12 (25%) | **$1.071** | **$4.761** |
| Meses 13–24 (50%) | **$1.594** | **$5.284** |
| Desde mes 25 (100%) | $2.637 | $6.327 |

> La reducción del 25%/50% aplica **solo al componente jubilatorio + FRL**. La prima de seguro de enfermedad de $549 (8% sobre 1 BPC) **no se reduce**, y el aporte FONASA **tampoco**. Por eso $1.071 = $522 + $549.

**Sociedad de hecho** (jubilatorio + FRL, régimen pleno): $2.088 por socio → 2 socios $4.176 · 3 socios $6.265.

### 5.4 Monotributo Social MIDES

Ley 18.874, reglamentada por Dto. 220/012. Requiere **calificación previa de MIDES** (hogar bajo la línea de pobreza o en vulnerabilidad socioeconómica), se **revisa anualmente**, y **no admite ningún dependiente**. Hasta **5 socios**. **No tiene tope de activos.**

Escala 25% → 50% → 75% → 100% a lo largo de **36 meses** (a diferencia de la Ley 19.942, acá **sí** se reduce la prima de $549):

| Período | Sin FONASA | Con FONASA (sin cónyuge, sin hijos) |
|---|---|---|
| Meses 1–12 (25%) | **$659** | $4.761 |
| Meses 13–24 (50%) | **$1.320** | $5.284 |
| Meses 25–36 (75%) | **$1.979** | $5.806 |
| Desde mes 37 (100%) | **$2.637** | $6.327 |

Excluye servicio doméstico y construcción (salvo pequeñas obras de mantenimiento). Es **compatible con tener un empleo, una jubilación o una pensión** (art. 12), siempre que el hogar siga calificando.
Fuente: [BPS](https://www.bps.gub.uy/6667/monotributo-social-mides-ley-18874.html).

### 5.5 Unipersonal — BPS del titular + Literal E

**BPS del titular** (ficto = 11 BFC = $20.328, Categoría 1ª). Fuente: [BPS Industria y Comercio](https://www.bps.gub.uy/6665/industria-y-comercio.html), vigencia enero 2026.

| Situación del titular | Total mensual |
|---|---|
| Beneficiario FONASA, sin cónyuge ni hijos | **$8.833** ← el piso realista |
| FONASA, sin cónyuge, con hijos | $9.502 |
| FONASA, con cónyuge, sin hijos | $9.725 |
| FONASA, con cónyuge e hijos | $10.394 |
| Ya aporta a FONASA por un empleo en relación de dependencia | **$5.143** |

> ⚠️ La columna "$4.594 sin FONASA" que publica BPS **solo aplica a quien ya tiene cobertura FONASA por aportación de Servicios Personales**. Un titular común **no puede elegirla**.

**Gradualidad Ley 19.889 (LUC) art. 229** — exonera **solo el 7,5% patronal jubilatorio**: 75% el 1er año, 50% el 2º, 25% el 3º:
$7.689 (año 1) → $8.070 (año 2) → $8.451 (año 3) → $8.833 (año 4+).

**IVA mínimo (Literal E)** — [Decreto 310/025](https://www.gub.uy/direccion-general-impositiva/comunicacion/publicaciones/cuota-iva-minimo-valores-vigentes):
- Cuota 2026: **$5.910/mes**
- Gradualidad empresa nueva: **$1.478** (meses 1–12) · **$2.955** (meses 13–24) · $5.910 (desde mes 25)
- 🌟 **Tope del 3,3% con e-factura** (Decreto 351/020, art. 1, que modifica el art. 106 del Dto. 220/998): quien documenta sus operaciones **exclusivamente por CFE** paga **el menor entre la cuota mensual y el 3,3% de los ingresos del mes**. **No hay piso: si un mes no facturás, no pagás.** Confirmado por [DGI, publicado 09/07/2026](https://www.gub.uy/direccion-general-impositiva/comunicacion/publicaciones/beneficios-tributarios-para-contribuyentes-iva-minimo). Excluye giro taxímetro.

**Piso mensual Literal E (régimen pleno, titular soltero con FONASA):** $8.833 + $5.910 = **$14.743**. Con e-factura: **desde $8.833** (el IVA mínimo se vuelve variable).

**Otros dos beneficios de e-factura poco conocidos:**
- La empresa que **le compra a un Literal E puede deducir ese gasto del IRAE**, si paga con e-factura y transferencia electrónica. → Desarma parcialmente el mito de "no te van a comprar porque no das crédito fiscal": para **IRAE** sí sirve; para **IVA** no.
- Subsidio de hasta **UI 80/mes** (tope $514 en 2026) sobre el costo del servicio de facturación electrónica, vigente hasta el 31/12/2026.

**E-factura obligatoria:** desde el **01/01/2025**, TODO contribuyente de IVA —**incluido Literal E**— debe ser emisor electrónico desde que se inscribe (Res. DGI 2389/023 y 2548/023). **Monotributo y Monotributo Social están expresamente exceptuados.**
> ⚠️ La página `efactura.dgi.gub.uy/.../factura-electronica-iva-minimo` **está desactualizada** (dice que es voluntario desde 2019). No citarla.

### 5.5-bis Servicios personales: IRPF Categoría II vs. IRAE

Es el camino del freelance profesional (dev, diseñador, consultor), y el **único verificado sin ambigüedad** para servicios personales puros.

**Por defecto: IRPF Cat. II.** Cálculo: ingresos (sin IVA) − **30% ficto de gastos** − aportes (BPS / CJPPU / Caja Notarial / Fondo de Solidaridad) → renta computable → escala progresiva → menos el crédito por deducciones (14% si el ingreso anual nominal ≤ 180 BPC; 8% si no). Anticipos **bimensuales**, código 114.

**Escala mensual IRPF Cat. II 2026** (BPC = $6.864) — [BPS Comunicado R 5/2026](https://www.bps.gub.uy/bps/file/23860/3/2026---comunicado-r-5---valores-escalas-irpf-2026.pdf):

| Franja | Desde | Hasta | Tasa |
|---|---|---|---|
| hasta 7 BPC | $0 | $48.048 | **0%** |
| > 7 a 10 BPC | $48.049 | $68.640 | 10% |
| > 10 a 15 BPC | $68.641 | $102.960 | 15% |
| > 15 a 30 BPC | $102.961 | $205.920 | 24% |
| > 30 a 50 BPC | $205.921 | $343.200 | 25% |
| > 50 a 75 BPC | $343.201 | $514.800 | 27% |
| > 75 a 115 BPC | $514.801 | $789.360 | 31% |
| > 115 BPC | $789.361 | — | **36%** |

**Mínimo no imponible: $48.048/mes.** Es la razón por la que IRPF suele ganarle a IRAE al principio: hay una franja grande sin gravar.

**La opción IRAE** (art. 5 Título 4): voluntaria, pero **te ata 3 ejercicios mínimo**, y es **preceptiva** (obligatoria) si los ingresos por servicios superan **4.000.000 UI**.

> ⚠️ **Trampa:** quien opta por IRAE **no usa la escala ficta empresarial del 12%/14%**. Los contribuyentes de **Categoría II** que optan por IRAE tienen una **escala ficta propia y obligatoria** (Dto. 150/007 art. 64): **48%** hasta UI 2.000.000 · **60%** hasta UI 3.000.000 · **72%** en adelante → **IRAE efectivo ≈ 12% del bruto** en el primer tramo. Ese —y no el 3%— es el número que hay que comparar contra IRPF.

**Cuándo conviene IRAE:** solo cuando los gastos deducibles reales son **mucho mayores** que el 30% ficto (equipo pesado, personal, alquiler, subcontratos), porque IRPF Cat. II **no admite gastos reales**, únicamente el 30% plano. La página lo explica cualitativamente y **no publica un break-even numérico** (depende de la estructura de gastos de cada uno).

**Exportación de servicios: IVA tasa 0%** (no exento — conservás el crédito de IVA de tus compras). Pero la definición es una **lista taxativa** (Dto. 220/998 art. 34): entran asesoramiento técnico, consultoría, **desarrollo de software a medida**, licencias de software, diseño, ingeniería, traducción, capacitación, auditoría y procesamiento de datos, **siempre que se aprovechen exclusivamente en el exterior**. Un servicio que no esté en la lista, aunque el cliente sea extranjero, **se grava al 22%** (el IVA uruguayo es territorial).

> El ingreso por exportación **sí computa** para el tope del Literal E. No existe norma que lo excluya; tratá como falsa cualquier afirmación de que "las exportaciones no cuentan".

### 5.6 Sociedades — el hallazgo principal

**IRAE 25% · IVA 22%/10% · Impuesto al Patrimonio 1,5%** (sin mínimo no imponible para personas jurídicas — pero con **abatimiento**: se descuenta el IRAE del ejercicio hasta el 50% del IP, así que una empresa chica rentable suele pagar IP ≈ 0).

🌟 **Dividendos — lo que casi ninguna guía dice bien:**

| Situación | IRAE | IRPF dividendos | **Total efectivo** |
|---|---|---|---|
| **SAS / SRL con ingresos ≤ 4.000.000 UI (≈ $25,7 M ≈ USD 640k)** | 25% | **0% — EXENTO** | **25%** |
| SAS / SRL con ingresos > 4.000.000 UI | 25% | 7% sobre el 75% restante | 30,25% |
| **SA — siempre, sin importar el tamaño** | 25% | 7% sobre el 75% | **30,25%** |

Base: Título 7 **art. 38 lit. C** (exonera utilidades distribuidas por *empresas unipersonales y sociedades personales* bajo el límite reglamentario) + **Dto. 148/007 art. 20-TER** (fija el límite en 4.000.000 UI). Aplica a la SAS porque **Ley 19.820 art. 42** la asimila **a todos los efectos tributarios, incluida la distribución de utilidades, a las sociedades personales** — y DGI lo confirmó en la **Consulta 6306** (06/05/2020).

**Dividendos fictos** (Título 7 **art. 19**, no art. 16): la renta neta fiscal con antigüedad **mayor a 3 ejercicios** se imputa como dividendo ficto al 7%. **PERO se deducen las inversiones en activo fijo, intangibles y el incremento del capital de trabajo** — o sea, **si reinvertís, no pagás fictos**. Y el **Dto. 148/007 art. 15-TER exceptúa** de los fictos a las sociedades personales (y a la SAS) por debajo de los mismos **4.000.000 UI**.

> El "30,25% para todos" que repiten las guías **es falso para la enorme mayoría de las SAS y SRL uruguayas.**

**ICOSA** (solo SA): **$55.732 a la constitución + $27.866/año, para siempre.** SAS y SRL: **$0.** ([DGI, 12/01/2026](https://www.gub.uy/direccion-general-impositiva/comunicacion/publicaciones/impuesto-control-sociedades-anonimas-icosa-valores-2026))

**¿Puede una SAS ser Literal E?** **Sí.** Las exclusiones del Literal E son **cuatro y ninguna es por forma jurídica**, y DGI describe el régimen como aplicable a *"pequeños contribuyentes de cualquier forma jurídica"*. (Muchos estudios dicen que la SA está excluida; no encontramos esa exclusión en norma vigente → va a "Lo que no podemos afirmar".)

**¿Puede una SAS/SRL ser monotributista?** **NO.** Ley 18.083 art. 70 es taxativo: **solo** empresa unipersonal y sociedad de hecho.

### 5.7 BPS de los dueños de sociedades

| Quién | Ficto | FONASA | **Costo mensual mínimo 2026** |
|---|---|---|---|
| Titular unipersonal / socio soc. de hecho | 11 BFC = $20.328 | opcional | $8.833 (con FONASA, soltero) |
| **Socio de SRL** con actividad | 15 BFC = $27.719 | **no comprendido** | **$6.265** |
| **Administrador / representante legal de SAS** | 15 BFC = $27.719 | **obligatorio** | **$10.504** (soltero) |
| Director de SA **remunerado** | 30 BFC = $55.439 | no | $12.529 |
| Director de SA **NO remunerado** | — | — | **$0 — EXENTO** (Ley 16.713 art. 171 lit. A) |
| Director de SAS **no remunerado** | 15 BFC | sí | **al menos uno paga $10.504** — *"En ningún caso regirá la exoneración del art. 171"* |

> 🌟 **El trade-off SA vs SAS que nadie cuenta:** en una SA, el director que no cobra **no aporta nada**. En una SAS, el administrador **nunca** se exonera y **no puede declararse "sin actividad"**. A cambio, el de la SAS obtiene FONASA; el de la SA, no.
> **Una SAS unipersonal (accionista único = administrador) paga como mínimo $10.504/mes aunque no facture un peso.**
> **El mero accionista de una SAS que no administra ni representa NO aporta a BPS.**

Fuente: [BPS Industria y Comercio](https://www.bps.gub.uy/6665/industria-y-comercio.html) + [BPS — Aportación de administradores y representantes legales SAS](https://www.bps.gub.uy/17795/aportacion-de-administradores-y-representantes-legales-sas.html) (act. 28/01/2026).

### 5.8 Costo y tiempo de constitución

| Forma | Costo estatal | Escribano | Publicaciones | Tiempo |
|---|---|---|---|---|
| **Unipersonal** | **$270** (timbre profesional) | no | no | online, mismo día (SLA no publicado) |
| **SAS (flujo digital)** | **$2.530** — incluye DGR + RUT (DGI) + nº de empresa (BPS) | **NO** (firma electrónica avanzada) | **NO** | 5–15 días hábiles |
| **SRL** | ~$540 + publicaciones | sí (certificación de firmas) | **sí** (~$20.675–33.080 solo Diario Oficial, a $82,70/palabra) | 15–30 días |
| **SA** | ~$135.000+ (incl. ICOSA $55.732 + AIN + arancel notarial mín. 40 UR) | **sí (escritura pública)** | sí | 30–60 días |

**Límites duros del flujo digital de la SAS** (fuera de esto volvés al escribano): todos los socios/administradores deben ser **personas físicas**; máx. **6 socios** y **3** administradores; administración **no colegiada**; sin agropecuarias.

> ⚠️ **El cuello de botella real de la SAS no es legal, es bancario.** Puede nacer en una semana y aun así **no poder facturar ni cobrar durante ~2 meses**: el RUT tarda 15–20 días y **la cuenta bancaria 30–40 días**. Ninguna norma regula al banco. Esto va en la página: es la diferencia entre "24 horas" (marketing) y la realidad.

### 5.9 Registro de Beneficiario Final (Ley 19.484) — obligación con dientes

Beneficiario final = persona física con **≥15%** del capital/votos, o que ejerce el control final. **Plazo: 45 días** desde que tenés RUT.

**La SAS está expresamente incluida** (Ley 19.820 art. 16) y **NO cae en la excepción** del art. 31 — esa excepción es para sociedades cuya totalidad de **cuotas** pertenezca a personas físicas (SRL), y la SAS tiene **acciones**.

Multas (referidas a la multa máxima del art. 95 del Código Tributario, **$13.220 en 2026**):
- No identificar al BF / no presentar la DJ: **hasta 100× = $1.322.000**
- Distribuir utilidades sin identificar al BF: **multa por el monto íntegro distribuido**
- Formas jurídicas inadecuadas: **hasta 1.000× = $13.220.000**
- Y lo que más duele: **suspensión del certificado único de DGI** (no podés operar) y **congelamiento registral**.

### 5.10 Registro de Estados Contables — es un UMBRAL, no una forma jurídica

Hay que registrar solo si los ingresos superan **26.300.000 UI** (≈ $169 M), o superan 4.000.000 UI y ≥90% son de fuente no uruguaya.
> **Por debajo de eso, NINGUNA forma (SAS, SRL, SA) tiene que registrar estados contables.** Esto contradice a muchas guías que afirman que "la SAS debe registrar EECC".

---

## 6. Sociedad de hecho — la sección de advertencia

Se configura **por los hechos**, sin querer crearla: dos personas que empiezan a operar juntas ya son una (Ley 16.060 art. 36). Se prueba por cualquier medio (art. 41).

- **Responsabilidad solidaria e ilimitada, sin beneficio de excusión** (art. 39): un acreedor puede ir por el **100%** de la deuda contra el socio que tenga bienes, **directamente**, sin pasar antes por la sociedad, **sin importar el % pactado**.
- Los pactos internos **no son oponibles a terceros** (art. 37).
- 💣 **Art. 43:** *cualquier* socio puede exigir la disolución con solo notificar a los demás. **Tu socio puede volar la empresa un martes cualquiera.**
- Regularizarla después **no limpia la responsabilidad anterior** (art. 42).

Es barata solo hasta el día que algo sale mal.

---

## 7. Trámites: obligatorio vs. condicional

**Las 3 cosas que los blogs uruguayos dicen mal** (las tres verificadas contra la norma primaria):

1. ❌ **"El BSE es obligatorio siempre."** **Falso sin empleados.** La Ley 16.074 obliga al *patrono*, definido como quien *"utilice el trabajo de otra"* (art. 3), y la sanción del art. 56 castiga a quien no aseguró *"a su personal"*. Sin personal dependiente **no hay obligación**. BSE vende un seguro **voluntario** (ADT-SV) justamente para eso.
   *(Novedad 2025: Ley 20.396 art. 17 — los trabajadores autónomos de plataformas digitales SÍ quedan cubiertos, con la plataforma como patrono.)*
2. ❌ **"Hay que presentar la planilla de trabajo del MTSS."** **Falso sin empleados.** El Decreto 278/017 (que **derogó** el 108/007, que muchos blogs siguen citando) ata la obligación al empleador *"que tenga personal dependiente"*. Y hoy la planilla es un **reporte que se genera de los datos de BPS**, no un trámite aparte.
3. ❌ **"Abrí tu unipersonal con Empresa en el Día."** **No aplica.** "Empresa en el Día" es para **constituir personas jurídicas** (SRL/SA). Una unipersonal se abre con el **formulario 0351 conjunto DGI+BPS**, online, y no necesita nada de eso.

| Organismo | ¿Obligatorio? | Cuándo |
|---|---|---|
| DGI (RUT) + BPS | **SIEMPRE** — un solo trámite (form. 0351) | al iniciar actividad |
| Aportes BPS del titular | **SIEMPRE** — cero empleados NO exime al dueño | mensual |
| MTSS (planilla) | condicional | solo con ≥1 dependiente |
| BSE (seguro accidentes) | condicional | solo con ≥1 dependiente |
| Intendencia (habilitación) | condicional | solo con local comercial/industrial |
| Bomberos | condicional | construcciones no destinadas a vivienda |
| Bromatología / RUNAEV | condicional | rubro alimentos (4 UR por local) |
| Carné de salud | para quien trabaja | gratis en tu prestador, vale 2 años |

---

## 8. Apoyos disponibles (con fecha real de cierre)

Solo lo verificado contra las bases oficiales. **No se publica ninguna TEA de BROU** — BROU no publica tasas para empresas, y cualquier cifra que circule es inventada.

| Programa | Qué da | Estado |
|---|---|---|
| **ANDE Semilla 2026** | hasta **$1.000.000** no reembolsable (hasta $400.000 sin rendición) | **abierta**, cierra **06/10/2026** |
| **Validación de Ideas (VIN) 2026** | hasta **$200.000** no reembolsable, 90% adelantado | **abierta**, cierra **21/07/2026** |
| **ANII Emprendimientos Innovadores** | hasta **80%** del proyecto, tope **$3.000.000** | ventanilla permanente |
| **SiGa** (garantía) | cubre hasta **70%** del crédito; se pide **en el banco**, no en SiGa | permanente |
| **INEFOP Capacitación Estándar** | subsidio **85% micro / 75% pequeña / 60% mediana** (requiere Certificado PYME) | permanente |
| **Certificado PYME** (DINAPYME) | **gratis**; desbloquea INEFOP, Prodiseño, PIADE | permanente |
| **Compras públicas MiPyme** | margen de preferencia **8–16%** + reserva del **10%** del llamado | permanente |

> ⚠️ INEFOP: los porcentajes **80/70/50** que copian todas las consultoras son de un PDF de **2019**. Los vigentes son **85/75/60/40/50**.
> ⚠️ Semilla ANDE exige facturación ≤ **$2.000.000 en 6 meses**; ANII exige ≤ **$2.400.000**. **No son el mismo número.**

---

## 9. "Lo que no podemos afirmar" — el recuadro de honestidad

Es contraintuitivo pero es **la mejor señal E-E-A-T de la página**: decir explícitamente dónde termina lo que se puede verificar.

1. **¿Puede un freelance de servicios puros estar en Literal E?** La norma excluye las *rentas no empresariales* y la Consulta DGI 4761 apunta en contra; en la práctica se hace masivamente. **Consultá contador.** Camino sólido y verificado: **IRPF Cat. II** (con mínimo no imponible de **$48.048/mes**) + IVA régimen general, con **exportación de servicios a tasa 0%** si el servicio se aprovecha exclusivamente en el exterior (Dto. 220/998 art. 34 — es una **lista taxativa**: desarrollo de software a medida, consultoría, diseño, asesoramiento técnico y traducción **sí** entran).
2. **¿La SA está excluida del Literal E?** Muchos estudios lo afirman; **no encontramos la exclusión en norma vigente** y DGI habla de "cualquier forma jurídica". (Es académico: la SA paga ICOSA igual.)
3. **¿Puede una SA ser *una de varias* accionistas de una SAS?** La letra del art. 11 solo lo prohíbe para el accionista **único**. Doctrina dividida.
4. **Estado real de "Empresa en el Día":** páginas de catálogo despublicadas (HTTP 403), aplicación viva, **sin anuncio oficial**. No afirmamos ni que se discontinuó ni que funciona.
5. **Precio de una "SA ya hecha"**, **honorarios de escribano llave en mano**, **tasas de BROU a empresas**, **costo de la segunda publicación en diario privado**: **nadie publica precio.** Son a cotización.
6. **Vigencia del Certificado PYME**, **tasas de Bomberos**: no publicadas oficialmente.

---

## 10. Datos y auto-actualización

**`app/utils/companyTypes.ts`** — baseline verificado, módulo puro:
```ts
export interface Regime {
  id: 'monotributo' | 'monotributo-social' | 'unipersonal-literal-e' | 'unipersonal-irae'
     | 'irpf-servicios' | 'sas' | 'srl' | 'sociedad-hecho' | 'sa'
  name: string
  liability: 'ilimitada' | 'limitada'
  gates: Gate[]              // compuertas legales, cada una con { norm, url, reason }
  monthlyCost: CostModel     // función pura de (facturación, situación) → UYU
  setupCost: number
  lockout?: { years: number; norm: string; url: string }
  sources: Source[]          // { label, url, verifiedAt }
}
export function evaluate(input: WizardInput): Verdict  // compuertas → costo → orden
```
Cada constante numérica lleva `{ value, source, verifiedAt }`. Nada sin fuente.

**Auto-refresh** (`server/utils/companyFiguresLive.ts`, patrón `uyFiguresLive.ts`): Gemini con búsqueda web + **bandas de plausibilidad estrictas**; un valor fuera de banda se descarta y queda el baseline. Si ningún valor pasa, se devuelve el baseline puro. **Nunca puede publicar un número alucinado.**

Bandas propuestas: `ivaMinimo [4000, 9000]` · `monotributoPleno [2000, 4000]` · `bpsUnipersonal [7000, 12000]` · `topeMonotributo [1_000_000, 1_500_000]` · `topeLiteralE [1_700_000, 2_500_000]` · `icosaAnual [20000, 40000]`.

**Watchdog de deriva:** se extiende el `WATCHED[]` de `uyFiguresLive.ts` con las constantes nuevas (IVA mínimo, aportes monotributo, BFC), de modo que cuando cambien, **llega un Telegram al admin** avisando qué hay que actualizar a mano. Ya existe la infraestructura.

**Refresco anual manual obligatorio (enero):** los topes en pesos (§5.2) y las tablas de BPS (§5.3, §5.5, §5.7) se fijan por decreto cada enero. El watchdog avisa; la actualización es a mano.

---

## 11. SEO y accesibilidad

- `useSeoMeta` + `useHead` con `@graph`: **BreadcrumbList** + **FAQPage** + **HowTo** (los pasos para formalizarse).
- `defineOgImageComponent('Cambio', { title: 'Qué empresa abrir en Uruguay', tag: 'GUÍA' })`.
- Copy **inline en español** (convención del repo: las guías no se i18n-izan). A `i18n/locales/json/{es,en,pt}.json` va **solo** `nav.queEmpresaAbrir`.
- `siteNav.ts`: nueva `NavEntry` con `priority: 0.8`, `changefreq: 'monthly'`, keywords (`que empresa abrir uruguay`, `monotributo o unipersonal`, `abrir sas uruguay`, `literal e`, `formalizar emprendimiento`). **Obligatorio** — sin esto falla `siteNav-coverage.test.ts` y no entra al sitemap.
- Componentes Vuetify PascalCase, clases theme-aware (`rgba(var(--v-theme-*))`), overrides `.v-theme--light` donde el primario no pasa contraste. Verificar con `app/scripts/lightmode-axe.mjs`.
- Cross-links: `/herramientas/calculadora-irpf`, `/salud-financiera`, `/inversiones-uruguay`, `/indicadores/unidad-indexada`.
- **Disclaimer legal obligatorio** (`VAlert type="warning"`), visible, no al pie: *información general, no asesoramiento legal ni contable; verificá con BPS/DGI y consultá un profesional antes de decidir.*

---

## 12. Tests

| Test | Qué asegura |
|---|---|
| `tests/unit/companyTypes.test.ts` | (a) toda compuerta que excluye cita norma + URL; (b) monotributo se excluye ante servicios personales, cliente empresa, >1 empleado, socio de otra sociedad; (c) SRL se excluye con 1 solo socio; (d) los regímenes de responsabilidad ilimitada se excluyen si el usuario pide limitada; (e) el costo es monotónico no decreciente en la facturación; (f) **ninguna constante numérica sin `source` + `verifiedAt`** (test estructural); (g) el tope en pesos NO se recalcula con la UI viva |
| `tests/unit/companyFiguresLive.test.ts` | valores fuera de banda se rechazan; sin API key → baseline; error de red → baseline |
| `tests/unit/siteNav-coverage.test.ts` | (ya existe) la página nueva está registrada |
| e2e (local) | el wizard produce veredicto tras hidratación (usar `toPass` retries — la hidratación es la causa conocida de flakes en este repo) |

Comando que corre CI: `cd app && npm run test`.

---

## 13. Fuera de alcance (YAGNI)

- Cooperativas, sociedad civil, sucursal de sociedad extranjera, zonas francas.
- Régimen agropecuario.
- Cálculo de IRAE real (requiere estructura de gastos; la página lo dice y deriva a contador).
- Un "break-even numérico IRPF vs IRAE": depende de la estructura de gastos de cada uno. Se explica **cuándo** conviene cada uno, sin inventar un número.
