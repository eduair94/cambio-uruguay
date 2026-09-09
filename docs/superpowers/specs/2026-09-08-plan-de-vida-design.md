# Plan de vida por ingreso (subproyecto C)

Fecha: 2026-09-08
Estado: aprobado (orden permanente de auto-aprobación)

Tercero y último de los tres subproyectos del pedido original ("un plan de vida
según los ingresos"). A dejó los precios de góndola medidos; B puso la comida a
precios de hoy y la canasta medida al lado de la estimación. C es lo que se pidió:
**en qué orden va cada peso**.

Specs previos: `2026-09-07-precios-sipc-pipeline-design.md` (A). B se hizo sin
spec propio, documentado en `docs/app/PRECIOS.md`, sección "Subproyecto B".

---

## 1. Lo que ya existe, y por qué C no es un motor nuevo

C **compone**. Todo lo que sigue está en el repo, probado y en producción:

| pieza | qué da | dónde |
|---|---|---|
| `estimateBudget` | `essentials`, `savingsMax`, `deficit`, `verdict` | `app/utils/costOfLiving.ts` |
| `payoffPlan`, `compareStrategies` | meses, interés total, orden de pago, `neverPaysOff` | `app/utils/debt.ts` |
| `netOfIrpf` | tasa neta de IRPF con la cita de la ley | `app/utils/investments.ts` |
| canasta medida | precios de góndola reales | `GET /precios/basket` |
| alquiler medido | medianas por zona y tipo | `rentallistings` |

Y ya existen dos autoevaluaciones que C **no** duplica: el chequeo de salud
financiera (`personalFinance.ts`, `scoreHealth`) y el de supervivencia
(`lowWage.ts`, `survivalCheck`).

Lo único que falta es la **asignación**: el orden.

## 2. El único orden que es aritmética y no consejo

Medido el 2026-09-08, con fuente y fecha en cada lado:

| dato | valor | fuente |
|---|---|---|
| deuda de consumo **sin** autorización de descuento, < 10.000 UI | **80,72 %** tasa media | `GET /debt-relief`, vigente 2026-09-01 |
| tope de usura de ese segmento | 122,23 % | BCU, Ley 18.212 |
| deuda de consumo **con** descuento del sueldo | 21,16 % media | ídem |
| plazo fijo BROU en pesos | 5,50 % | `GET /financing-rates`, 2026-08-31 |
| fondo en pesos | 7,37 % | ídem |
| inflación interanual | 4,27 % | ídem |

Pagar la primera rinde **~80 %**; la mejor colocación accesible rinde **~7 %
nominal**, que después de IRPF e inflación queda en **~3 % real**. La diferencia
no es una opinión sobre el riesgo: es una resta entre dos números públicos y
fechados.

**Eso, y sólo eso, es lo que autoriza a C a ordenar.** Donde la resta no alcanza
para decidir —dos destinos con rendimientos parecidos, o una tasa que no llegó—
C **no ordena**: muestra los dos y dice que la diferencia no es medible con lo que
tiene.

## 3. La cascada

`buildLifePlan(budget, debts, options, rates)` devuelve pasos ordenados. Cada
paso trae `monthly`, `reason` y `evidence` (valor, fuente, fecha).

1. **Esenciales.** De `estimateBudget`. Ya incluyen la comida reexpresada a
   precios de hoy (B) y el alquiler de la zona.
2. **Deuda cara.** Las deudas cuyo costo real neto **supera el mejor rendimiento
   real neto disponible**. Orden avalancha (tasa más alta primero), que es el que
   minimiza el interés total y el que `payoffPlan` ya implementa.
3. **Colchón.** `emergencyMonths × essentials − savingsNow`. Por defecto **3
   meses**, ajustable entre 1 y 12.
4. **Deuda barata.** La que rinde menos que tener el colchón va **después** del
   colchón, no antes. Un préstamo con descuento del sueldo al 21 % sigue siendo
   caro; uno subsidiado por debajo del rendimiento del colchón, no.
5. **Excedente.** Destinos ordenados por rendimiento real neto. **Sin nombrar
   producto ni institución.**

### Qué se reparte, y qué no es repartible

El pote que la cascada reparte es **`budget.savingsMax`** (ingreso − esenciales),
no `budget.savingsSuggested`: ese último es la sugerencia del 10 % que trae el
presupuesto, y acá el reparto lo decide la cascada, no una tasa fija.

Los **pagos mínimos de las deudas son obligación, no decisión**: salen antes del
colchón y antes de cualquier destino, y se muestran como una línea comprometida.
Lo que la cascada reparte es lo que queda **después** de los mínimos. Si los
mínimos ya se comen el pote, no hay excedente que ordenar y el plan lo dice.

### El umbral se calcula, no se escribe

```
bestRealNet = max(realNetReturn(destino)) sobre los destinos con tasa viva
deudaCara   = deuda cuyo annualRatePct real neto > bestRealNet
```

Un umbral escrito a mano ("todo lo que pase el 30 %") envejece igual que la BPC
de 2024: pasa la banda de plausibilidad y sigue estando mal. Este se mueve con
las tasas.

### Rendimiento real neto

```
realNet = (1 + netOfIrpf(gross, moneda, plazo)/100) / (1 + inflacion/100) − 1
```

La inflación sale de `/financing-rates`, no de un supuesto. Si no llega, el paso
publica el rendimiento **nominal neto** y dice que no pudo descontar inflación.

## 4. Las cuatro guardas

1. **Si el ingreso no alcanza, no hay plan.** Con `budget.deficit > 0` el
   resultado es `verdict: 'no-alcanza'`, con el faltante mensual y un puntero a
   `/vivir-con-25000-pesos-uruguay` y `/asignacion-familiar-uruguay`. **No se
   inventa una asignación de un ingreso que no cubre lo esencial**, que es
   exactamente lo que hace una regla como 50/30/20 aplicada sin mirar el piso.
2. **Sin tasas vivas no se afirma un orden.** Cada paso sabe si su evidencia
   llegó. Los pasos sin evidencia se muestran con `unresolved: true` y el plan
   declara qué comparación no pudo hacer.
3. **`neverPaysOff` se propaga.** Si los mínimos no cubren el interés, el plan lo
   dice en la cara en vez de imprimir una fecha imposible. La guarda ya existe en
   `debt.ts`; C no la puede tragar.
4. **Nada se proyecta.** Los únicos plazos que se publican son los meses que
   `payoffPlan` calcula sobre los saldos que el usuario cargó, y los meses de
   colchón. No hay "en 5 años tendrías X".

## 5. Tipo de deuda → tasa medida

Casi nadie sabe su TEA. El usuario elige el tipo y C pone la **tasa media** del
segmento del BCU —no el tope—, con la fecha a la vista y un campo para
corregirla:

| tipo | segmento del BCU | por qué la media y no el tope |
|---|---|---|
| tarjeta / préstamo sin descuento del sueldo | consumo sin autorización, < 10.000 UI | el tope es el máximo legal, no lo que se paga |
| préstamo con descuento del sueldo | consumo con autorización, < 10.000 UI | ídem |
| préstamo grande (> 10.000 UI) | el tramo mayor de la grilla | ídem |
| gastos comunes | sin segmento propio: el usuario carga la tasa | inventarla sería peor que pedirla |
| deuda con el Estado | sin segmento propio: idem, y se enlaza la prescripción | ídem |

Las tasas se leen **vivas**; los valores de respaldo quedan declarados con su
fecha.

## 6. Arquitectura

| archivo | responsabilidad |
|---|---|
| `app/utils/lifePlan.ts` | motor puro: tipos, umbral, cascada, guardas |
| `app/server/api/life-plan-rates.get.ts` | junta `/financing-rates` + `/debt-relief` en un sobre con fechas |
| `app/pages/plan-de-vida-uruguay.vue` | la página; consume `/api/cost-of-living` (que ya trae B) y el sobre de tasas |
| `app/tests/unit/lifePlan.test.ts` | el orden, el "no alcanza", las tasas ausentes, `neverPaysOff`, el colchón |

Módulo puro y sin Vue, como `costOfLiving.ts`: la página y los tests comparten
una sola fuente de verdad. La prosa de cada `reason` vive en el motor, igual que
`CITY_PROSE` y `regionalNotes` viven en `costOfLiving.ts`.

`app/utils/` es un namespace plano de auto-imports: todo lo exportado lleva
prefijo `lifePlan`/`LIFE_PLAN` salvo los tipos del dominio.

## 7. La página

`/plan-de-vida-uruguay`. Entradas: las mismas de costo de vida (ingreso,
convivencia, ciudad, vivienda, zona, transporte, estilo) más deudas (tipo, saldo,
mínimo) y ahorro actual. Salida: la cascada, con el monto y la evidencia de cada
paso, y el veredicto arriba.

Consultas que apunta: "cómo distribuir mi sueldo", "en qué gastar el sueldo",
"cuánto ahorrar por mes", "pagar deuda o ahorrar".

Cruces: costo de vida, saldar deudas, inversiones, alquileres, precios de
supermercado, sueldo líquido.

Obligaciones del repo que la página tiene que cumplir, todas verificadas por
tests que ya existen: JSON-LD propio, canonical, un solo `<h1>`, título de 60
caracteres o menos con el sufijo, entrada en `siteNav`, `data-label` por `<td>`
en las tablas anchas, `<FaqSection>` con `id` en cada ítem, y nada de `|` en los
títulos i18n.

## 8. Lo que C NO hace

- **No recomienda productos ni instituciones.** Ordena destinos, no vendedores.
- **No proyecta a varios años.** Descartado al elegir el alcance.
- **No cubre jubilación, compra de vivienda ni costo de un hijo.** Necesitan datos
  que el sitio no tiene medidos (AFAP, cuota hipotecaria BHU) y serían otro
  subproyecto.
- **No es asesoramiento financiero.** Es aritmética sobre tasas públicas y
  fechadas, y la página lo dice.
