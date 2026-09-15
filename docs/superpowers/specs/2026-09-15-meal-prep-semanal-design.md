# Meal prep semanal en Uruguay — diseño

Página: `/meal-prep-uruguay`. Un planificador de viandas: la persona dice cuánto mide, cuánto pesa,
qué hace y qué quiere, y la página le devuelve **siete días de desayuno, almuerzo, merienda y cena**
que se cocinan **un solo día**, se guardan en tuppers en la heladera o el freezer, y se recalientan
en el microondas. Con la lista de compras **valuada con los precios del SIPC** que el sitio ya mide
todos los días (`/precios-de-supermercado-uruguay`).

Pedido original (2026-09-15): "app interna con recetas para desayuno, almuerzo, merienda y cena,
usando air fryer, microondas, anafe; productos uruguayos; base de datos de supermercados para los
cálculos; comida que se guarda en tuppers y se recalienta; dieta balanceada según altura y peso;
recetas fáciles; que no se eche a perder; cocinar un día y comer toda la semana".

## Decisiones tomadas (2026-09-15)

1. **Motor puro en `app/utils/mealprep/`, sin job nuevo y sin ruta nueva en el backend.** El
   precedente es `costOfLiving.ts` y `/plan-de-vida-uruguay`: una calculadora es una función pura
   que corre en el navegador (y en SSR para el perfil de referencia). Lo único externo son los
   precios, y esos ya salen de `GET /precios/articles` (mediana nacional por artículo, Redis 15 min).
   Consecuencias: cero pm2, cero `OTHER_APPS`, deploy sólo del app, tests en `app/tests/unit/`.
2. **Los precios del SIPC se usan donde existen y se dice dónde no.** Memoria del subproyecto B de
   precios: el catálogo del SIPC **no tiene leche fluida, ni pan fresco, ni legumbres, ni cebolla,
   ni zanahoria**. Cada ingrediente declara o bien un patrón contra el nombre del artículo del SIPC
   (y toma la **mediana de las medianas** de los artículos que matchean, con el día de medición) o
   bien un **precio estimado fechado** marcado `estimado` en la UI. El total de la lista dice
   cuántos pesos son medidos y cuántos estimados. Nunca un "$3.200" liso.
3. **Las cantidades nutricionales se calculan con el peso CRUDO del ingrediente**, que es lo que
   se compra y se pesa. Las tablas (kcal, proteína, carbohidrato, grasa, fibra por 100 g) son de
   composición estándar (USDA / tablas argentinas) y se declaran en `ingredients.ts` con la fuente.
   La página lo dice: son valores aproximados, no un plan clínico.
4. **La seguridad alimentaria es una restricción del planificador, no un párrafo.** Cada receta
   declara `fridgeDays` (máximo de días en heladera a ≤4 °C) y `freezable`. El día de cocina es el
   día 0. Un tupper que se come el día N tiene que cumplir `N ≤ fridgeDays` **o** ir al freezer, y
   sólo puede ir al freezer si la receta es congelable. Lo que no cumple ninguna de las dos no se
   asigna a ese día: se reemplaza por una receta `quick` (≤15 min, se hace ese día). Reglas base:
   comidas cocidas 3 días en heladera (USDA: 3–4; se toma 3), pescado 2, arroz cocido 2 (Bacillus
   cereus), ensaladas sin aderezar 2; freezer hasta 60 días (calidad), descongelar en heladera la
   noche anterior, recalentar hasta que humee (74 °C), **recalentar una sola vez**.
5. **Un solo día de cocina, pocas recetas repetidas.** El plan elige **4 platos principales** para
   los 14 almuerzos y cenas (3–4 porciones cada uno), **2 desayunos** y **2 meriendas**. Repetir es
   la esencia del meal prep; la variedad se garantiza exigiendo **proteínas distintas** entre los
   principales (pollo / carne / huevo / pescado / legumbre / lácteo) y no repitiendo el mismo plato
   en dos comidas seguidas.
6. **Determinista con semilla.** Mismos datos → mismo plan. El botón "otra combinación" cambia la
   semilla. Sin IA: el plan tiene que ser explicable línea por línea.
7. **La porción se escala, no la receta.** Cada receta declara una porción base; el planificador
   calcula un factor por plato (objetivo del turno ÷ kcal de la porción base, acotado a 0,6–1,6),
   igual para todas las porciones de ese plato, porque los tuppers se llenan iguales. El día puede
   quedar ±10 % del objetivo y se muestra el número real.

## Nutrición: lo que se calcula y con qué

- **TMB** (tasa metabólica basal) por Mifflin–St Jeor: hombres `10·kg + 6,25·cm − 5·edad + 5`;
  mujeres `… − 161`.
- **GET** (gasto energético total) = TMB × factor de actividad: sedentario 1,2 · ligero 1,375 ·
  moderado 1,55 · alto 1,725 · muy alto 1,9.
- **Objetivo**: mantener = GET; bajar = GET − 15 % con piso 1.200 (mujeres) / 1.500 (hombres);
  subir = GET + 10 %.
- **Macros**: proteína 1,6 g/kg (1,8 g/kg si el objetivo es bajar; nunca más del 35 % de las kcal);
  grasa 28 % de las kcal; carbohidratos el resto; fibra 25 g (mujeres) / 30 g (hombres). Se muestra
  el IMC con su categoría OMS, sólo informativo.
- **Reparto por turno**: desayuno 22 %, almuerzo 35 %, merienda 13 %, cena 30 %.
- **Ajuste de proteína**: si el promedio semanal queda bajo el 90 % del objetivo, el plan agrega un
  "refuerzo" declarado (yogur 200 g en la merienda o un huevo duro en el desayuno) y lo cuenta.

## Datos

`app/utils/mealprep/ingredients.ts` — ~55 ingredientes. Cada uno:

```ts
{ id, name, category: 'carniceria'|'verduleria'|'almacen'|'lacteos'|'despensa',
  per100: { kcal, protein, carbs, fat, fiber },      // crudo, comestible
  waste: 0.30,                                         // hueso/cáscara: compra = uso / (1 − waste)
  pack: { grams: 1000, label: '1 kg' },                // unidad de góndola
  price: { sipc: /^Pollo entero/i, factor?: 1.9, note?: '…' } | { estimateUyu: 52, asOf: '2026-09' } }
```

`app/utils/mealprep/recipes.ts` — ~30 recetas. Cada una:

```ts
{ id, name, slot: 'desayuno'|'principal'|'merienda', appliances: ['airfryer'|'microondas'|'anafe'|'horno'|'sin-coccion'],
  alternatives?: { airfryer: 'horno' }, protein: 'pollo'|'carne'|'huevo'|'pescado'|'legumbre'|'lacteo'|'ninguna',
  tags: ['vegetariano','sin-lactosa','sin-gluten'], quick: boolean, batch: boolean,
  servings: 4, ingredients: [{ id, grams }], steps: string[], prepMinutes, cookMinutes,
  storage: { fridgeDays: 3, freezable: true, reheat: 'Microondas 3 min a máxima potencia, revolver a la mitad' } }
```

Las recetas son de despensa uruguaya: guiso de lentejas, arroz con pollo, milanesas de pollo al
airfryer, boloñesa con fideos, pollo con zapallo y papa al airfryer, albóndigas en salsa, merluza
al airfryer con puré de zapallo, polenta con salsa y queso, ensalada de garbanzos, pastel de carne,
buñuelos de acelga al airfryer, tortilla de papa en microondas, wok de arroz con huevo y verduras;
avena en microondas, panqueques de avena, muffins de banana, yogur con avena y fruta, tostadas con
huevo revuelto; fruta con maní, galletitas con queso, tostadas con dulce de leche.

## Motor (`app/utils/mealprep/`)

| archivo | qué hace |
|---|---|
| `nutrition.ts` | `bodyTargets(profile)` → TMB, GET, kcal objetivo, macros, IMC, reparto por turno |
| `pricing.ts` | `priceIngredients(articles, day)` → mapa ingrediente → `{ pricePerPack, source: 'sipc'\|'estimado', articleName?, day? }` |
| `planner.ts` | `buildWeekPlan(profile, options, prices, seed)` → plan de 7×4, día de cocina, tuppers, lista de compras, costos, avisos |
| `safety.ts` | `slotStorage(day, recipe, hasFreezer)` → `'heladera'\|'freezer'\|'fresco'\|null` y las constantes de conservación |
| `rng.ts` | mulberry32 para la semilla |

Opciones del usuario: sexo, edad, altura, peso, actividad, objetivo, personas (1–6; escala
porciones y compras), restricciones (vegetariano, sin pescado, sin carne roja, sin lactosa),
equipamiento (airfryer, microondas, anafe, horno), freezer sí/no. Se guardan en `localStorage`
(`cu_mealprep_v1`).

### Asignación de principales

Turnos ordenados (día 1 almuerzo, día 1 cena, …, día 7 cena). Para cada turno se elige, entre los
4 principales, el que **menos porciones** lleva asignadas y que **puede** ocupar ese turno (heladera
si `día ≤ fridgeDays`, freezer si `freezable` y hay freezer), sin repetir el plato del turno
anterior. Empate → orden de la semilla. Si ningún principal puede, entra una receta `quick` y se
marca "se cocina ese día, 10 min". Esto reparte 3–4 porciones por plato, deja los no congelables
en los primeros días y funciona igual sin freezer (los días 4–7 pasan a `quick`).

### Lista de compras

Gramos usados por ingrediente × personas → gramos a comprar = usados ÷ (1 − waste) → paquetes =
⌈comprar ÷ pack⌉ → costo de góndola = paquetes × precio. Se muestran **dos totales**: lo que se
paga en la góndola y lo que cuesta lo que realmente se come (proporcional), con la diferencia
etiquetada "queda en la despensa". Costo por día y por comida sobre el proporcional. La despensa
(sal, aceite, especias) se lista aparte y se cobra proporcional.

### Día de cocina

Las recetas principales y los desayunos `batch`, ordenados: primero lo que hierve solo (legumbres,
guisos), después el airfryer (lotes), después lo rápido. Tiempo estimado = Σ prep + 0,6 × Σ cocción
(hay superposición). Etiquetas para tuppers: plato, gramos, "heladera hasta <fecha>" o "freezer:
pasar a heladera la noche anterior", cómo recalentar.

## Página (`app/pages/meal-prep-uruguay.vue`)

Secciones, en orden: formulario · tus números (IMC, GET, objetivo, macros) · plan de 7 días (tabla
`cu-mobile-cards`, con origen heladera/freezer/fresco por celda) · día de cocina (por
electrodoméstico, tiempos, etiquetas) · lista de compras (por rubro, paquetes, precio medido o
estimado, totales) · recetas (paneles con ingredientes por porción ya escalados, pasos, conservación)
· seguridad alimentaria · FAQ (`FaqSection`, schema FAQPage) · relacionados.

SSR renderiza el plan del **perfil de referencia** (mujer/hombre 30 años, 170 cm, 70 kg, actividad
ligera, mantener) con los precios del día, para que la página tenga contenido indexable; el cliente
recalcula con el perfil guardado al hidratar.

Ruta de lectura: `app/server/api/mealprep-prices.get.ts` proyecta `GET /precios/articles` a
`{ day, prices: Record<ingredientId, …> }` con `defineCachedEventHandler` (30 min). Proyección como
función pura testeada (lección de `basketProjection.ts`).

## Tests (`app/tests/unit/mealprep*.test.ts`)

- Nutrición: TMB/GET/macros contra valores calculados a mano; pisos de kcal; proteína ≤35 %.
- Seguridad: ningún tupper de heladera supera `fridgeDays`; ningún tupper de freezer es de receta
  no congelable; pescado nunca pasa del día 2 en heladera; sin freezer, días 4–7 sólo `quick`.
- Planificador: determinista con la misma semilla; 4 principales con ≥3 proteínas distintas; ningún
  plato dos turnos seguidos; restricciones (vegetariano → ninguna receta con carne/pollo/pescado;
  sin airfryer → ninguna receta que lo exija sin alternativa).
- Compras: paquetes = ceil; waste aplicado; totales medido/estimado suman el total; personas escala.
- Datos: todo ingrediente de toda receta existe; toda receta tiene pasos, conservación y
  recalentado; los patrones SIPC matchean ≥1 artículo del catálogo fixture de 2026-09-14.
- Página: `siteNav-coverage`, contrato de anuncios y SEO existentes.

## Lo que NO hace

- No es asesoramiento médico ni nutricional; lo dice arriba y en el FAQ. Sin embarazo, lactancia,
  menores ni patologías: el formulario limita edad a 18–80.
- No guarda nada en el servidor: perfil en `localStorage`.
- No usa IA para nada.
- No promete que la comida "no se echa a perder": promete que el plan cumple las reglas de
  conservación declaradas, que la persona tiene que ejecutar (enfriar en menos de 2 h, heladera a
  ≤4 °C, freezer a −18 °C).
