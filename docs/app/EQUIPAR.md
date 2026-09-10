# Equipar una casa vacía (`/equipar-casa-uruguay`)

Cuánto sale llenar una vivienda sin amueblar en Uruguay: 38 categorías con precio vivo, ordenadas
por necesidad, con el mercado de usados al lado del nuevo y tres canastas ya sumadas.

Origen: el hilo https://www.reddit.com/r/uruguay/comments/1w9c2r6/independizarse/ (2026-09-06), que
pregunta qué comprar al independizarse y **no trae un solo precio**. Esa es la mitad que el sitio
puede medir. El hilo se cita, no se cosecha.

Llena el hueco del medio de una cadena que el sitio ya cubría por los dos extremos:
`/alquileres-uruguay` (encontrarlo) → `/primer-alquiler-uruguay` (firmarlo) → **equiparlo** →
`/plan-de-vida-uruguay` (vivir en él).

## `classes/retail`: el cosechador dejó de ser de sillas

`classes/chairs` ya era un lector de retail uruguayo con la palabra "silla" compilada en **un solo
punto por adaptador** (`isDeskChair`, llamado como predicado). Se extrajo:

```
classes/retail/
├── net.ts            throttle por host, timeout, reintentos (movido tal cual)
├── types.ts          RetailListing, RetailStore, CategorySpec
├── stores.ts         las 16 tiendas uruguayas y su adaptador
├── harvest.ts        corre todas las fuentes y reporta qué produjo cada una
└── sources/          fenicio · shopify · woocommerce · vtex · structured · mercadolibre · facebook
```

`classes/chairs/spec.ts` es ahora todo lo que "silla" significa para las cañerías, y
`classes/chairs/sources/*.ts` quedaron como shims que atan `CHAIR_SPEC` al adaptador compartido —
así los 11 archivos de `tests/chairs/` siguen importando las mismas rutas y siguen verdes (82/82),
que es la prueba de que la extracción no movió comportamiento.

**Una barrida por tienda, muchos clasificadores.** Leer un sitemap de 40k URLs cuesta lo mismo para
una categoría que para cuarenta, así que el adaptador recibe `CategorySpec[]` y la primera spec que
acepta el título se lo queda (`attributes.CATEGORY_SPEC`). MercadoLibre y Facebook son al revés —se
buscan por término— así que **sí** escalan con las categorías y toman presupuesto.

## El job

| app pm2 | script | cron UTC | qué hace |
|---|---|---|---|
| `currency-equipar` | `dist/sync_equipar.js` | `47 12 * * *` | corrida completa; `RETAIL_STORE_MAX_PDP=900` sólo acá |
| `currency-equipar-hourly` | `dist/sync_equipar.js --fast` | `53 * * * *` | sólo precios, sin las tiendas Fenicio, medio presupuesto |

12:47 UTC deja una hora limpia después de `currency-chairs` (11:41): pegan a los mismos hosts y a
los mismos dos puentes (`:9656` ML, `:9657` FB), y superponerlos duplicaría la carga sobre la tienda
chica de otro para nada.

`RETAIL_STORE_MAX_PDP` sube a 900 **sólo en este job**. El default de 260 páginas de producto por
tienda Fenicio es el correcto para una categoría y truncaría 38 en orden de sitemap, lo que sesga en
silencio todas las bandas hacia lo que la tienda lista primero.

Presupuestos: `EQUIPAR_ML_MAX_SCANS` (70) y `EQUIPAR_FB_MAX_QUERIES` (26). Los planes van
**intercalados por categoría**, así que un corte le cuesta a cada categoría su cola y no a una
categoría todo. El orden es el del registro, que pone heladera, colchón y lavarropas arriba: si se
corta, se cortan los repasadores.

APP DB (`APP_MONGO_URI`): `equiparitems` (un documento por categoría+variante, con historia diaria
de hasta un año) y `equiparmeta` (un documento: corrida, fuentes, las tres canastas, lo no cubierto).

## Dos regímenes, y por qué

`classes/equipar/registry.ts` declara, por categoría, cómo se puede publicar:

| régimen | quiénes | qué se publica |
|---|---|---|
| `modelo` | heladera, lavarropas, cocina, microondas, calefón, TV, aire, colchón, mixer, plancha, ventilador, estufa… | fila = producto `marca\|modelo` con sus ofertas y link |
| `commodity` | ollas, sartenes, cubiertos, vajilla, vasos, tabla, toallas, sábanas, limpieza, mesa, sofá, ropero… | fila = banda p25 / mediana / p75 de la categoría+variante |

Un juego de ollas se lista con doce títulos y sin modelo: agruparlos por texto inventaría un
producto que no existe. Lo que esa categoría **sí** puede afirmar es la distribución.

**La variante no es opcional.** Un frigobar y una side-by-side son las dos "heladera", con 5× de
varianza. El tier y el presupuesto cuelgan de categoría+variante, nunca de la categoría. La variante
sale de un `match` de texto o de un número con unidad (litros, pulgadas, cm, plazas, piezas, BTU), y
cuando el título no dice nada cae en la variante marcada `fallback` — que es lo que hace Marketplace
todo el tiempo.

**Facebook Marketplace nunca entra al régimen `modelo`.** "Heladera funcionando" no identifica nada,
y una descripción no prueba identidad (misma regla que en alquileres). FB alimenta siempre la banda
de **usados**.

## El orden es necesidad, no precio

El tier mide qué tan rápido la casa deja de funcionar sin eso, y **cada categoría escribe por qué**
(`reason`), texto que se publica al lado de la fila: un tier que no puede explicarse es una opinión
con una letra adelante. `tests/equipar/registry.test.ts` exige ese texto.

- **S (14)** heladera · colchón · cocina/anafe · calefón · olla · sartén · cuchillo · cubiertos ·
  platos · vasos · sábanas · toallas · kit de limpieza · tacho
- **A (11)** lavarropas · microondas · mesa+sillas · ropero · tabla de picar · escurridor · plancha ·
  estufa · ventilador · almohada · acolchado
- **B (8)** TV · sofá · mixer · pava · aspiradora · tostadora · aire acondicionado · cortina de baño
- **C (5)** secarropas · deshumidificador · impresora · horno eléctrico · cafetera

Los cuatro ítems que el hilo discute (secarropas, deshumidificador, impresora, tabla de picar) quedan
donde el hilo los deja, con el motivo citado.

**Fuera del catálogo a propósito:** la garrafa de supergas de 13 kg. Su precio está regulado y lo que
listan tiendas y ML mezcla envase con recarga, así que un precio cosechado ahí sería ruido. Se
menciona en la nota de cocina, sin cifra propia.

## Guardas

1. **La moneda nunca se asume** (heredado de chairs). Tienda cuya moneda no se puede establecer se
   saltea: USD publicado como UYU es un error de 40×.
2. **Banda por percentiles de la propia categoría+variante**, reusando `classes/precios/plausibility.ts`
   sin tocarlo. Bajo p10/3 se borra; entre p10/3 y p10/2 queda `suspect` — se ve, dice por qué, y no
   encabeza. Un factor fijo no sirve: el spread real de un sartén no es el de una heladera.
3. **Nuevo y usado jamás se promedian.** Dos bandas, siempre, y el cribado corre por condición —si no,
   el mercado de usados entero cae bajo la línea de sospecha del nuevo.
4. **El ahorro exige las dos patas**: nuevo ≥ 8 observaciones, usado ≥ 5. Si falta una, la fila dice
   que no hay datos, no un porcentaje inventado — y sería el titular.
5. **Canasta emparejada.** Es la lección de [PRECIOS.md](PRECIOS.md): un total baja por *faltarle*
   ítems. Si una categoría de la canasta no tiene banda, se publica el total **parcial** y qué falta,
   en la misma tarjeta. `tests/equipar/basket.test.ts` lo vigila.
6. **Nada sin fecha**: la API descarta lo que no se observó en 4 días. Una pizarra congelada no
   encabeza un ranking de "más barato".
7. **Una corrida flaca no pisa una buena**: si los ítems con precio caen por debajo del 40 % de lo
   guardado, el job aborta y conserva el catálogo anterior.
8. **Accesorios fuera antes de clasificar** (`NOT_A_PRODUCT`): fundas, repuestos, gomas de puerta,
   controles remotos y los "no funciona, para repuesto" de Marketplace, que entrarían derecho al
   fondo de la banda de usados.
9. **Una fila sin precio nunca encabeza su categoría.** Medido en la primera corrida de producción:
   ordenar variantes alfabéticamente puso una "Heladera / Frigobar" **vacía** en el primer renglón
   de "sin esto la casa no funciona", y listó el calefón como 100 L, 50 L, 80 L. El orden es
   tier → categoría → tiene precio → rango de la variante, que es el tamaño que el registro ya
   declaraba.

## Lo que encontró auditar la página en producción

Vale dejarlo escrito porque ninguno de los cuatro se veía en el código, sólo en la página real con
datos reales:

- **El texto de "no sé" era el menos legible de la página.** 53 nodos a 3,64:1 en claro (axe), y
  eran exactamente `sin precio esta semana` y `sin datos suficientes de usado`. La declaración de
  honestidad sobre la que se apoya todo el diseño resultaba ser el texto más difícil de leer.
  `opacity: 0.66` es donde ese mismo compuesto cruza 4,5:1.
- **El azul de texto chico no era del sistema.** `--v-theme-primary` (#1976d2) da 4,29:1 en claro y
  4,18:1 en oscuro. Medidas `/primer-alquiler-uruguay` y `/plan-de-vida-uruguay`: **cero**
  violaciones con ese color, así que lo había introducido esta página. Va `ink-blue` en claro.
- **Los cuatro colores de tier estaban fuera de la paleta.** Ahora salen de DESIGN.md, cada uno con
  el color de texto que realmente cruza 4,5:1 encima (el ámbar lleva tinta, los profundos blanco).
- **34 checkboxes de 13×13** contra el mínimo de 24 de WCAG 2.5.8. La etiqueta entera es el blanco.

## Las tres canastas

| canasta | tiers | variante | precio | usado |
|---|---|---|---|---|
| mínima | S | la más barata | mediana de usado, si no p25 nuevo | sí, donde la categoría lo tolera |
| decente | S+A | la típica | p25 nuevo | no |
| completa | S+A+B | la típica | mediana nueva | no |

El tier C nunca entra a una canasta. El colchón nunca se compra usado, ni siquiera en la mínima: es
la única categoría del catálogo donde la opción barata es el mal consejo, y el registro lo declara
(`usedOk: false`).

## La página

`app/pages/equipar-casa-uruguay.vue`, SSR, ES/EN/PT (`app/utils/equipar{Es,En,Pt}.ts`). Los tres
totales se renderizan en el servidor: son la cifra que Google puede citar y la respuesta que la
mayoría vino a buscar.

**Una tarjeta por categoría, con foto — no una tabla por variante.** La primera versión era una
tabla con una fila por categoría+variante, y eso repetía el mismo motivo de dos párrafos tres veces
para la heladera, tres para el colchón y tres para la olla: el argumento que justifica el tier —lo
único que esta página tiene y un comparador de precios no— se convertía en el muro de texto que uno
saltea. Ahora el motivo se dice una vez y las medidas van como lista compacta debajo.

La foto sale del propio relevamiento (`representativeImage` en `catalog.ts`) y **nunca de
Marketplace**: esa es la cocina del vendedor de noche y su URL caduca, así que la tarjeta se
rompería sola. Se toma la del aviso de precio **mediano**, no la del más barato — el más barato de
cualquier categoría es desproporcionadamente el accesorio o el mal titulado, y su foto
representaría mal a toda la categoría. Si igual devuelve 404, la tarjeta cae a un ícono por ambiente.

Debajo, la **calculadora**: "tengo $X", tilde de usado, tildes de lo que ya se tiene. Baja en orden
de necesidad y dice **dónde se corta la plata**. Estado de sesión, sin persistencia.

**El planificador ordena por el `rank` publicado**, no por precio. Es un campo guardado, no derivado:
el plan y la tabla TIENEN que coincidir, o la página se contradice. Ordenar por precio dentro del
tier parece razonable y no lo es —el más barato primero compra seis cosas chicas en vez de la
heladera; el más caro primero compra el colchón y deja la heladera afuera—, y en los dos casos el
planificador estaría eligiendo en silencio qué imprescindible sacrificar.

`GET /api/equipar` devuelve todo en un payload (menos de cien filas) sin la historia diaria, que la
página no dibuja.

## Tests

- `tests/retail/spec_injection.test.ts` — una barrida sirve a varias specs; el presupuesto de FB
  intercala categorías.
- `tests/equipar/registry.test.ts` — toda categoría con variante por defecto, motivo escrito y
  consultas para las tres fuentes.
- `tests/equipar/classify.test.ts` — acentos, exclusiones, variantes por número.
- `tests/equipar/bands.test.ts` — pisos de muestra, los dos veredictos, el ahorro que no se inventa.
- `tests/equipar/basket.test.ts` — **la guarda central**: total parcial + faltantes.
- `tests/equipar/catalog.test.ts` — nuevo y usado separados; FB no arma productos.
- `app/tests/unit/equiparPlan.test.ts` — el plan compra en el orden publicado.
- `tests/appdb/schema_parity.test.ts` — los dos lados declaran los mismos campos.

## Pendiente

- Subpáginas por categoría (`/equipar-casa-uruguay/heladera`). Salen casi gratis del mismo dato y son
  la familia programática natural.
- Facebook fuera de Montevideo (hoy `location=montevideo`; ampliar es más fan-out de consultas).
- La primera corrida real todavía no ocurrió: los números de cobertura por categoría hay que medirlos
  contra producción antes de citarlos afuera.
