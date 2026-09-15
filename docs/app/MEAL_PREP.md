# Meal prep semanal

Motor: `app/utils/mealprep/` (puro, sin Vue ni fetch). Precios: `app/server/api/mealprep-prices.get.ts`
proyecta `GET /precios/articles` del backend. Página: `/meal-prep-uruguay`.
Spec: `docs/superpowers/specs/2026-09-15-meal-prep-semanal-design.md`.

Todas las cifras de acá están medidas el 2026-09-15 contra el catálogo del SIPC del 2026-09-14
(`app/tests/unit/fixtures/precios-articles-2026-09-14.json`).

---

## 1. Qué hace y qué no

Le pedís siete días de desayuno, almuerzo, merienda y cena que se cocinen **un solo día** (el
domingo), se guarden en tuppers y se recalienten en el microondas, y la página los arma según tu
sexo, edad, altura, peso, actividad y objetivo, con la lista de compras valuada.

No es un plan clínico. No usa IA. No guarda nada en el servidor (perfil en `localStorage`,
`cu_mealprep_v1`). No promete que "la comida no se echa a perder": promete que el plan cumple las
reglas de conservación que declara, y la persona tiene que ejecutarlas (enfriar en <2 h, ≤4 °C,
−18 °C, recalentar a 74 °C una sola vez).

## 2. Por qué no hay job ni ruta nueva en el backend

Una calculadora es una función pura (`costOfLiving.ts`, `/plan-de-vida-uruguay`). Lo único externo
son los precios, y esos ya salen de `GET /precios/articles` (mediana nacional por artículo del
día, Redis 15 min). La ruta del app proyecta ese catálogo de 213 artículos a los ~50 ingredientes
con `priceIngredients()`, que es pura y está testeada contra el catálogo real —la lección de
`basketProjection.ts`: una proyección inline en la ruta ya perdió un campo en silencio una vez.

Consecuencia: cero pm2, cero `OTHER_APPS`, sólo deploy del app.

## 3. Los datos

### Ingredientes (`ingredients.ts`, 46)

Composición por 100 g **crudos** y comestibles (USDA / SARA), merma (`waste`: hueso, cáscara),
unidad de góndola y precio. El plan pesa crudo porque eso es lo que se compra.

| precio | cómo | cuántos |
|---|---|---|
| `sipc` | patrón contra el nombre del artículo; **mediana de las medianas** de todos los que matchean (5 marcas de arroz → un precio de arroz), pasadas a $/g con la presentación de cada uno | 28 patrones, 27 matchean hoy |
| `sipc` derivado | pechuga = 1,9 × pollo entero; pata-muslo = 1,15 ×. El factor y su nota se muestran | 2 |
| `estimado` | góndola de Montevideo relevada a mano, fechada `2026-09` | 18 |

**Lo que el SIPC no tiene** (memoria del subproyecto B de precios, verificado otra vez): leche
fluida, legumbres, avena, zanahoria, morrón, brócoli, acelga, boniato, atún, pan rallado, queso
de barra, maní, ajo, limón, especias. **Cebolla existe en el catálogo con cero observaciones**: es
el único patrón que cae al estimado hoy y el test lo exime a propósito.

Trampas de presentación, resueltas en `articleGrams()`:
- huevos "6 Unidades" y lechuga "1 Unidades" → `edibleGrams` (300 g);
- arvejas "300 g" brutos → 200 g escurridos (`edibleGrams`);
- kg/l → ×1000; g/ml → tal cual; unidades sin `edibleGrams` → **no se inventa denominador**, cae
  al estimado.

### Recetas (`recipes.ts`, 28)

16 principales (14 en tandas + 2 rápidas), 6 desayunos (2 en tandas), 5 meriendas. Despensa
uruguaya: guiso de lentejas, arroz con pollo, milanesas al airfryer, boloñesa, pata-muslo con
papa y zapallo, albóndigas, merluza con puré, polenta con salsa, ensalada de garbanzos, pastel de
carne, buñuelos de acelga, tortilla de papa, arroz salteado, pollo desmenuzado con boniato, guiso
de carne, fideos con atún; avena en microondas, yogur con avena, panqueques de avena, muffins de
banana, tostadas con huevo revuelto, leche con cocoa; fruta con maní, yogur con banana, galletitas
con queso, tostadas con dulce de leche, sándwich de jamón y queso.

Cada receta declara `storage.fridgeDays`, `storage.freezable`, `storage.reheat`, `quick` (≤20 min)
y `batch`. Las restricciones **no se declaran por receta**: se derivan del `kind` de sus
ingredientes (`carne-roja | ave | pescado | huevo | lacteo | vegetal`), así una receta no puede
decir "vegetariana" y llevar jamón.

## 4. Nutrición

- TMB por Mifflin–St Jeor; GET × factor de actividad (1,2 / 1,375 / 1,55 / 1,725 / 1,9).
- Objetivo: mantener = GET; bajar = −15 % con piso 1.200 (mujeres) / 1.500 (hombres); subir = +10 %.
- Proteína 1,6 g/kg (1,8 si bajar), **tope 30 % de las kcal**; grasa 28 %; carbohidratos el
  resto; fibra 25/30 g. El tope bajó de 35 % a 30 % al medir: una mujer de 85 kg con 1.525 kcal
  pedía 133 g y ninguna combinación de recetas llegaba; a 114 g llega.
- Reparto: desayuno 22 %, almuerzo 35 %, merienda 13 %, cena 30 %.
- Entradas acotadas a 18–80 años, 140–210 cm, 40–200 kg antes de calcular.

## 5. El planificador (`planner.ts`)

1. **Elegibles**: recetas que pasan restricciones y equipamiento (con reemplazos declarados:
   airfryer → horno, microondas → anafe).
2. **4 principales** (`pickMains`; **3 sin freezer**, sólo de ≥3 días de heladera): shuffle con
   semilla, primero uno por proteína, después se completa; con freezer a lo sumo uno no
   congelable. Si la proteína objetivo es ≥25 % de las kcal, los platos con ≥7 g de proteína por
   100 kcal van primero (orden estable: la variedad sigue viniendo de la semilla). Cualquier tanda
   que quede con una porción sale del pool y se reparte de nuevo.
3. **Asignación** (`assignMains`): 14 turnos en orden; cada uno va al principal con **menos
   porciones** que **puede** ocuparlo —heladera si `día ≤ fridgeDays`, freezer si `freezable` y hay
   freezer— sin repetir el del turno anterior. Si ninguno puede, entra una receta `quick` que se
   hace ese día. Reparte 3–4 porciones por plato, deja los no congelables (tortilla, ensalada) en
   los días 1–3, y sin freezer los días 4–7 salen `quick` solos.
4. **Desayunos y meriendas** (`assignPair`): dos por turno, alternados por día, con la misma regla
   de conservación (los panqueques en tandas aguantan 3 días y se freezan; lo demás se arma en el
   momento).
5. **Escala** (`factorsFor`): un factor por plato = promedio del objetivo de sus turnos ÷ kcal de
   la porción base, acotado a 0,6–1,8 en pasos de 0,05. Igual para todos los tuppers del plato.
6. **Refuerzos declarados**: si la proteína semanal < 90 % → atún 60 g / huevo duro / yogur (hasta
   3, filtrados por restricción); si las kcal < 92 % → maní / pan / banana / queso (hasta 4). Cada
   uno se lista en `adjustments` y entra en la lista de compras. El tope de factor subió de 1,6 a
   1,8 y los refuerzos de energía existen porque un hombre de 22 años con actividad alta y objetivo
   "subir" pide 3.290 kcal y una porción de guiso ×1,6 no llega: come guiso y algo más.
7. **Compras**: gramos usados × personas ÷ (1 − merma) → paquetes enteros (⌈⌉; los productos por
   peso van de a 100 g) → dos totales: **góndola** (paquetes) y **lo que se come** (proporcional),
   con la parte medida en el SIPC separada de la estimada. Por día y por comida son por persona.
8. **Día de cocina**: principales + desayunos en tandas, ordenados: lo que hierve solo primero,
   después airfryer, después lo corto; tiempo estimado = Σ manos + 0,6 × Σ cocción; tuppers =
   Σ porciones; etiqueta por plato (heladera hasta el día N / freezer, cómo recalentar).

## 6. Medido con el perfil de ejemplo (hombre, 30, 175 cm, 78 kg, ligero, mantener)

| | |
|---|---|
| objetivo | 2.380 kcal · 125 g proteína · 74 g grasa · 304 g carbohidratos |
| semana (semilla 1) | 2.392 kcal (100,5 %), 150 g de proteína (120 %), 33 g de fibra, sin refuerzos ni avisos |
| principales | pata-muslo con papa y zapallo ×4, guiso de carne ×4, fideos con atún ×4, ensalada de garbanzos ×2 (no se freeza: días 1 y 3) |
| día de cocina | 4 recetas, 14 tuppers (8 al freezer), ~2 h 40 min |
| compras | góndola $3.614 · lo que se come $3.136 · $448 por día y $112 por comida · 73 % del costo medido en el SIPC del 2026-09-14 |
| tests | 5 perfiles × 3 semillas: kcal en 88–112 % y proteína ≥90 % en todos |

**Sanidad del número:** $3.136 por semana son ~$13.600 por mes para una persona, contra la línea de
indigencia del INE (sólo comida) de $6.628 y los $13.533 de comida por adulto que usa
`/herramientas/costo-de-vida`. Un plan que cubre las kcal con proteína al 120 % cuesta lo que la
estimación de comida del sitio: las dos fuentes se sostienen entre sí.

**Lo que salió de correrlo, no de diseñarlo** (misma lección que `/plan-de-vida-uruguay`):
- La ensalada de garbanzos quedaba con **1 porción**: el reparto por "menos porciones" llenaba los 6
  turnos de heladera con los cuatro platos y al no congelable le tocaba uno. Ahora el desempate
  prefiere al que no se freeza (sólo puede vivir ahí) y con freezer se admite **a lo sumo un** no
  congelable; sin freezer se eligen **3** principales (6 turnos ÷ 2) y sólo de ≥3 días. Y hay una
  red: cualquier tanda que quede con una porción sale del pool y se reparte de nuevo.
- La lista decía **"31 × por kg"** para la papa: lo que se compra al peso no tiene paquetes.
- La cocoa entraba con **$316** por 69 g: la despensa (aceite, sal, especias, cocoa, harina, dulce
  de leche) se cobra ahora por lo que se usa y se lista aparte. El total bajó de $4.321 a $3.614.
- Un `VChip` adentro de un `<p>` rompía la hidratación de toda la página: la página se veía
  perfecta y **ningún control reaccionaba**. Tripwire: `tests/unit/noChipInsideParagraph.test.ts`.

## 7. Tests (`app/tests/unit/mealprep*.test.ts`, 39 + tripwire + e2e)

- Datos: ids únicos, Atwater ±15 % (exentas frutas/verduras <50 kcal), cada ingrediente de cada
  receta existe, quick ≤20 min, batch ≥2 días, pescado y arroz ≤2 días en heladera, tortilla y
  ensalada no congelables, cada patrón SIPC matchea el catálogo real (salvo cebolla), medido vs
  estimado dentro de ×/÷2,5, arroz = mediana de 5 marcas, pechuga = 1,9× con nota.
- Seguridad: 40 semillas × con/sin freezer: ningún tupper de heladera pasa `fridgeDays`, ninguno
  de freezer es no congelable, sin freezer los días 4–7 son `fresco`.
- Planificador: 28 turnos, determinista, 4 principales con ≥3 proteínas y ≥2 congelables, sin
  repetir seguidos, porciones iguales por plato, adherencia en 5 perfiles, vegetariano y sin
  lactosa no filtran nada prohibido ni en los refuerzos, airfryer → horno, sólo microondas no se
  cae.
- Compras: paquetes ⌈⌉, merma (banana ÷0,65), totales cierran, 2 personas duplica gramos y no
  precio, día de cocina lista todo lo batch.
- Planificador, además: sin freezer 3 principales para 6 turnos, ninguna tanda de 1 porción con
  40 semillas × freezer sí/no × 3 restricciones.
- Página: `siteNav-coverage`, `seoContract`, `ads` (LIGHT), `pageContainer`, `h1Contract`,
  `noChipInsideParagraph`.
- E2E (`tests/e2e/meal-prep.spec.ts`): SSR con 7 filas y precio; el peso mueve las kcal, la semilla
  mueve el plan y ambos sobreviven a una recarga; sin freezer no queda "Freezer" de jueves a domingo.

## 8. Lo que queda para después

- Cocción: los pesos son crudos y las kcal no descuentan pérdidas; para "gramos en el plato" haría
  falta rendimiento por receta.
- Precios por departamento: el SIPC tiene `dept:*` en `precios_stats`; hoy se usa el nacional.
- Un "modo dos perfiles" para hogares con objetivos muy distintos (hoy: personas × porciones del
  mismo tamaño).
- Exportar la lista de compras (texto/WhatsApp) y las etiquetas para imprimir.
