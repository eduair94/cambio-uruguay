# Plan de vida por ingreso

Motor: `app/utils/lifePlan.ts` (puro). Sobre de tasas:
`app/server/utils/lifePlanRates.ts` + `app/server/api/life-plan-rates.get.ts`.
Página: `/plan-de-vida-uruguay`.

Tercero de los tres subproyectos del pedido "un plan de vida según los
ingresos". A dejó los precios de góndola medidos, B puso la comida a precios de
hoy, C dice **en qué orden va cada peso**.

Spec: `docs/superpowers/specs/2026-09-08-plan-de-vida-design.md`.
Plan: `docs/superpowers/plans/2026-09-08-plan-de-vida.md`.

Todas las cifras de acá están **medidas el 2026-09-08** contra los endpoints de
producción.

---

## 1. C no tiene motor propio

Compone tres que ya existían, probados y en producción:

| pieza | qué da | dónde |
|---|---|---|
| `estimateBudget` | `essentials`, `savingsMax`, `deficit`, `verdict` | `app/utils/costOfLiving.ts` |
| `payoffPlan` | meses, interés total, orden de pago, `neverPaysOff` | `app/utils/debt.ts` |
| `netOfIrpf` | tasa neta de IRPF con la cita de la ley | `app/utils/investments.ts` |

No hay job nuevo y no se ingiere nada. C sólo ordena lo que ya se mide.

## 2. Lo único que autoriza a ordenar

| dato | valor | fuente | job | cadencia |
|---|---|---|---|---|
| deuda de consumo **sin** autorización de descuento | **80,72 %** media | `GET /debt-relief` | `currency-debt-relief` | **mensual**, día 1 |
| tope de usura de ese segmento | 122,23 % | ídem, Ley 18.212 | ídem | ídem |
| deuda de consumo **con** descuento del sueldo | 21,16 % media | ídem | ídem | ídem |
| plazo fijo en pesos | 5,50 % | `GET /financing-rates` | `currency-financing` | **semanal**, lunes |
| fondo en pesos | 7,37 % | ídem | ídem | ídem |
| inflación interanual | 4,27 % | ídem | ídem | ídem |

Con eso, el mejor rendimiento real neto accesible es **2,58 %** (fondo en pesos:
7,37 % bruto → 6,97 % neto de IRPF al 5,5 % del Título 7 art. 37 lit. A → 2,58 %
real descontando 4,27 % de inflación).

**80,72 % contra 2,58 %.** Pagar esa deuda rinde treinta veces lo que colocar la
plata. Eso no es una opinión sobre el riesgo: es una resta entre dos números
públicos, y los dos llevan su fecha en la página.

**Donde la resta no alcanza para decidir, C no ordena.** Un paso sin evidencia
va con `unresolved: true` y el plan declara qué comparación no pudo hacer.

### La media, no el tope

El tope es el **máximo que la Ley 18.212 permite cobrar** (122,23 % en ese
segmento); la media es lo que se cobra en promedio (80,72 %). Usar el tope
exageraría el caso de casi todo el mundo. `projectLifePlanRates` lee `tasaMedia`
y hay un test que verifica que **no** devuelva `topeTasa`.

### El umbral se calcula, no se escribe

```
bestRealNet = max(realNet) sobre los destinos con tasa viva
deudaCara   = deuda cuya tasa > bestRealNet
```

Un umbral escrito a mano ("todo lo que pase el 30 %") envejece igual que la BPC
de 2024: pasa la banda de plausibilidad y sigue estando mal. Este se mueve con
las tasas.

Y `lifePlanBestRealNet` devuelve **null y no cero** cuando no hay ningún destino
con tasa: cero haría que toda deuda pareciera cara por comparación contra nada,
que es exactamente afirmar un orden sin evidencia.

## 3. La cascada

1. **Esenciales** — obligación. De `estimateBudget`, ya con la comida reexpresada
   a precios de hoy (subproyecto B) y el alquiler de la zona.
2. **Mínimos de las deudas** — obligación, no decisión.
3. **Un mes de colchón** — antes de la deuda cara. Ver §4.
4. **Deuda cara** — orden avalancha, con la resta a la vista.
5. **Resto del colchón** — hasta los meses elegidos (1 a 12, por defecto 3).
6. **Deuda barata** — la que rinde menos que el colchón va después.
7. **Excedente** — destinos ordenados por rendimiento real neto, **sin nombrar
   producto ni institución**.

El pote que se reparte es `savingsMax − mínimos`. Un paso con **$0** igual se
muestra: que le toque cero este mes es parte de la respuesta.

## 4. El colchón mínimo, que salió de correrlo

El diseño original ponía el colchón entero **después** de la deuda cara, por pura
comparación de tasas. Correr la cascada con datos reales mostró el problema:

```
ingreso 90.000 -> esenciales 50.500 | minimos 4.000 | pote 35.500
  deuda-cara  35.500
  colchon          0     <-- todo el excedente a la deuda, colchon en cero
```

Eso está mal **por la misma aritmética que justifica el orden**: sin nada
guardado, la próxima urgencia vuelve a la tarjeta. O sea que el rendimiento del
primer mes de colchón no es el 2,58 % del depósito — es **evitar el 80,72 %**.
Medido contra esa tasa, el primer mes gana.

Sólo el primer mes. El resto del colchón sí rinde 2,58 % y por eso sigue después
de la deuda. Resultado tras el arreglo:

```
ingreso  15.000 -> no-alcanza: esenciales 50.500, faltan 35.500, no se reparte nada
ingreso  90.000 -> colchon-minimo 35.500 | deuda-cara 0 | colchon 0
ingreso 200.000 -> colchon-minimo 50.500 | deuda-cara 95.000 | colchon 0
```

## 5. Las cuatro guardas

1. **Sin ingreso suficiente no hay plan.** Con `budget.deficit > 0` el veredicto
   es `no-alcanza`, se muestra el faltante y se apunta a
   `/vivir-con-25000-pesos-uruguay` y `/asignacion-familiar-uruguay`. **No se
   inventa una asignación**, que es lo que hace una regla 50/30/20 aplicada sin
   mirar el piso.
2. **Sin evidencia no se afirma un orden.** Cada paso sabe si su evidencia llegó.
3. **`neverPaysOff` se propaga.** Si los mínimos no cubren el interés, se dice,
   en vez de imprimir una fecha imposible. La guarda ya existía en `debt.ts`; C
   no la puede tragar.
4. **Nada se proyecta.** Los únicos plazos publicados son los meses que
   `payoffPlan` calcula sobre los saldos cargados, y se presentan como "si le
   dedicaras **todo** el excedente" — no como el plazo de este reparto, porque
   parte del excedente va al colchón.

## 6. Tipo de deuda → tasa

Casi nadie sabe su TEA, así que se pregunta el tipo:

| tipo | de dónde sale la tasa |
|---|---|
| tarjeta o préstamo sin descuento del sueldo | media del segmento sin autorización (BCU) |
| préstamo con descuento del sueldo | media del segmento con autorización (BCU) |
| gastos comunes | **no tiene segmento propio**: la carga el usuario |
| deuda con el Estado | ídem, y puede además estar prescripta |
| otra | la carga el usuario |

Lo que el usuario carga a mano **gana** sobre la media. Los dos tipos sin
segmento **no reciben una tasa inventada**: inventarla sería peor que pedirla.

Confundir los dos segmentos invertiría la cascada (21,16 % contra 80,72 %), así
que `projectLifePlanRates` los distingue por patrón y hay un test que lo fija.

## 7. Lo que C NO hace

- **No recomienda productos ni instituciones.** Ordena destinos, no vendedores.
  Hay un test que verifica que ninguna etiqueta de destino nombre un banco.
- **No proyecta a varios años.** Descartado al elegir el alcance: una proyección
  a cinco años con tasas de hace semanas y una inflación supuesta se lee como
  promesa.
- **No cubre jubilación, compra de vivienda ni costo de un hijo.** Necesitan
  datos que el sitio no tiene medidos (AFAP, cuota hipotecaria BHU).
- **No es asesoramiento financiero.** Es aritmética sobre tasas públicas y
  fechadas, y la página lo dice al pie.

## 8. Lo que queda para después

- Cuando el índice de góndola de A tenga meses de historia, reemplazar el IPC
  general por el movimiento medido de los alimentos en la reexpresión de B, que
  es más fino para esa línea.
- Los destinos del excedente son dos (plazo fijo y fondo en pesos) porque son las
  dos tasas que `/financing-rates` publica. Sumar UI o dólares exige una fuente
  viva para esas tasas; hoy las de `investments.ts` están hardcodeadas con fecha
  de verificación (2026-08-10) y no se usan acá para no mezclar cifras vivas con
  cifras congeladas en la misma comparación.
