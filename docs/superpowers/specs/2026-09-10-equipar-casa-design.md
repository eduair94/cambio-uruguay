# Equipar una casa vacía en Uruguay — diseño

Página: `/equipar-casa-uruguay`. Cuánto sale llenar una vivienda sin amueblar, con precios vivos,
ranking por necesidad y el mercado de usados al lado del nuevo.

Origen: https://www.reddit.com/r/uruguay/comments/1w9c2r6/independizarse/ (2026-09-06). El hilo
pregunta qué comprar y qué es una porquería; no trae un solo precio. Esa es la mitad que falta y la
que el sitio puede medir.

## Por qué esta página existe

La cadena que el sitio ya cubre tiene un hueco en el medio:

| paso | página |
|---|---|
| encontrar el alquiler | `/alquileres-uruguay` |
| firmarlo | `/primer-alquiler-uruguay` |
| **equiparlo** | **no existe** |
| vivir en él | `/plan-de-vida-uruguay` |

Cero páginas del sitio tocan electrodomésticos, muebles o utensilios hoy.

## Decisiones tomadas (2026-09-10)

1. **Catálogo vivo completo por categoría**, no dataset curado. El sitio ya tiene la cicatriz de
   publicar una cifra vieja durante meses (la BPC de 2024); acá serían 38 cifras envejeciendo juntas.
2. **El tier mide necesidad**, no precio ni popularidad: S = la casa no funciona sin eso,
   C = puede esperar meses. Cada tier declara su criterio por escrito.
3. **Canastas fijas + calculadora.** Los totales se publican en HTML plano e indexable; la
   calculadora es la capa opcional encima.
4. **El usado entra como columna propia.** Equipar una casa vacía en Uruguay es sobre todo comprar
   usado; una canasta "mínima" de retail formal es irreal.
5. **Identidad en dos regímenes + buckets.** Ver abajo.

## El refactor previo: `classes/retail/`

`classes/chairs/` ya es un cosechador de retail uruguayo con la palabra "silla" clavada en un solo
punto por adaptador (`isDeskChair`, llamado como predicado y nada más). Se extrae:

```
classes/retail/
├── net.ts          ← movido tal cual desde chairs (throttle por host, timeout, reintentos)
├── types.ts        ← RetailListing, RetailStore, RetailSourceResult, CategorySpec
└── sources/
    ├── fenicio.ts      ← harvestFenicioStore(store, spec)
    ├── shopify.ts      ← harvestShopifyStore(store, spec)
    ├── woocommerce.ts  ← harvestWooStore(store, spec)
    ├── vtex.ts         ← harvestVtexStore(store, spec)
    ├── structured.ts   ← parser schema.org compartido
    ├── mercadolibre.ts ← harvestMercadoLibre(spec)
    └── facebook.ts     ← harvestFacebookMarketplace(spec)
```

`CategorySpec` es lo único nuevo: `{ accept(title, ctx), urlHint?, mlQueries, mlCategories?, fbQueries }`.

`classes/chairs/` pasa a ser **el primer consumidor**: construye su `CategorySpec` con `isDeskChair`
y las consultas de silla, y no cambia de comportamiento. Los 11 archivos de `tests/chairs/` —con
casos por adaptador (facebook, structured, vtex, woocommerce)— son la red que prueba que la
extracción no movió nada.

Sin esta extracción habría que duplicar ~600 líneas de código vivo.

## Cosecha: una barrida por tienda, muchos clasificadores

Diferencia central contra chairs, y la razón de que 38 categorías no cuesten 38×:

- **Tiendas** (16, por contrato publicado — fenicio / shopify / woocommerce / vtex): **una sola
  barrida del catálogo por tienda**, y cada producto se clasifica contra las ~90 categorías+variantes
  en una pasada. Sale más barato que chairs, no más caro. El `urlHint` de fenicio pasa a ser la
  unión de las pistas de todas las categorías.
- **MercadoLibre y Facebook Marketplace**: son por consulta, así que sí escalan con las categorías.
  Van con **presupuesto por corrida** y las categorías **ordenadas por peso en el presupuesto**
  (heladera, lavarropas, colchón primero). Si el presupuesto se corta, se cortan los repasadores,
  nunca la heladera. La corrida reporta cobertura por categoría en vez de callarse.

FB hoy sólo consulta `location=montevideo`. Ampliar al interior es un fan-out más de consultas y
queda fuera de la primera vuelta, declarado en la página.

## Modelo de datos

`classes/equipar/registry.ts` declara cada categoría: régimen, variantes, tier, orden dentro del
tier, si el usado es sano, y **el motivo escrito del tier**.

| régimen | categorías | qué se publica |
|---|---|---|
| `modelo` | heladera, lavarropas, cocina, microondas, calefón, TV, aire, colchón, mixer, plancha… | fila = producto `marca\|modelo` con sus ofertas y link, como chairs |
| `commodity` | ollas, sartenes, cubiertos, vajilla, vasos, tabla, toallas, sábanas, balde, mesa… | fila = **banda** p25 / mediana / p75 de la categoría+variante |

La variante (bucket) no es opcional: un frigobar y un side-by-side son los dos "heladera", con 5× de
varianza. El tier y el presupuesto cuelgan de **categoría+variante**, nunca de la categoría.

**Facebook Marketplace nunca entra al régimen `modelo`.** Sus títulos ("heladera funcionando", "juego
de ollas") no identifican nada, y una descripción no prueba identidad — la misma regla que ya rige en
alquileres. FB alimenta siempre la banda de **usados** de categoría+variante.

### Categorías (38)

**S — sin esto la casa no funciona** (14): heladera · colchón · cocina/anafe · calefón · olla ·
sartén · cuchillo de cocina · cubiertos · platos · vasos · sábanas · toallas · kit de limpieza
(balde/escoba/trapo) · tacho de basura.

**A — primeras semanas** (11): lavarropas · microondas · mesa+sillas · ropero · tabla de picar ·
escurridor · plancha · estufa/calefactor · ventilador · almohada · acolchado.

**B — cuando hay resto** (8): TV · sofá · mixer/licuadora · pava eléctrica · aspiradora · tostadora ·
aire acondicionado · cortina de baño.

**C — puede esperar meses** (5): secarropas · deshumidificador · impresora · horno eléctrico ·
cafetera.

Los cuatro ítems que el hilo discute explícitamente (secarropas, deshumidificador, impresora, tabla
de picar) quedan donde el hilo los deja, con la razón citada.

**Fuera del catálogo a propósito:** la garrafa de supergas de 13 kg. Su precio está regulado y lo que
se lista en tiendas y ML mezcla envase con recarga, así que un precio cosechado ahí sería ruido. Se
menciona en la nota editorial de cocina, sin cifra propia.

### Persistencia

APP DB (`APP_MONGO_URI`, igual que chairs): `equiparitems` (un documento por categoría+variante, con
banda nueva, banda usada, ofertas destacadas, historia de precio) y `equiparmeta` (snapshot: fecha,
corridas por fuente, cobertura por categoría, totales de las tres canastas).

## Guardas

Cada una viene de una cicatriz del propio sitio:

1. **La moneda nunca se asume.** Heredado de chairs: la tienda cuya moneda no se puede establecer se
   saltea. Un precio USD publicado como UYU es un error de 40×.
2. **Banda por percentiles de la propia categoría+variante**, no factor fijo. Reusa
   `classes/precios/plausibility.ts` sin tocarlo: el spread real de un sartén no es el de una
   heladera. Bajo p10/2 la fila queda `suspect` — se ve, dice por qué, y no encabeza.
3. **Nuevo y usado jamás se promedian.** Dos bandas separadas, siempre.
4. **El ahorro de usado sólo se publica con N≥5 en las dos patas.** Si falta una, la fila dice que no
   hay datos suficientes de usado; no inventa un porcentaje.
5. **Canasta emparejada, nunca total crudo.** Es la lección de `docs/app/PRECIOS.md`: un total baja
   por *faltarle* ítems. Si una categoría S no tiene banda, la canasta publica el total parcial **y
   qué falta**, explícito. Nunca un total silenciosamente incompleto.
6. **Nada sin fecha de observación**, y lo viejo no encabeza un ranking de "más barato" — la cicatriz
   de la pizarra congelada.
7. **La corrida no publica un catálogo vacío sobre uno bueno.** Una caída total conserva el último
   mercado conocido y la página dice qué fuente falta.

## El job

`sync_equipar.ts` → pm2 `currency-equipar`, diario. `--fast` horario: sólo precios, sin LLM ni
clasificación por imagen, igual que `currency-chairs-hourly`. Ambos comparten `flock`.

Entrada en `OTHER_APPS` de `scripts/deploy-backend.sh`, o no arranca nunca en el VPS.

## La página

`/equipar-casa-uruguay`, SSR, ES/EN/PT.

1. **Respuesta arriba, en HTML plano**: las tres canastas totalizadas con precio vivo.
   - **mínima** — sólo tier S, variante más barata, precio usado donde el usado es sano
   - **decente** — S+A, variante base, p25 nuevo
   - **completa** — S+A+B, variante media, mediana nueva

   El tier C nunca entra a una canasta: aparece aparte como "esto puede esperar", con su precio.
   Totales en UYU y USD, con fecha y número de observaciones.

2. **La tier list** S/A/B/C: ítem, variante, nuevo (p25–mediana), usado (mediana, N), ahorro %, y el
   motivo del tier al lado.

3. **La calculadora**: "tengo $X", tilde de "acepto usado", tildes de "esto ya lo tengo". Baja en
   orden de necesidad y muestra **dónde se corta la plata y qué queda afuera**. Sin persistencia,
   igual que `/primer-alquiler-uruguay`.

4. **Notas editoriales** — lo que ningún precio te dice, cada una citada a su comentario del hilo:
   tabla de madera y no de metal (el metal come el filo), pocas ollas buenas antes que muchas malas,
   el aire acondicionado ya deshumidifica. Y la advertencia donde el usado sí es mala idea: colchón.

5. **Enlaces**: primer alquiler, alquileres, plan de vida, sillas de escritorio, precios de
   supermercado, comprar en cuotas, descuentos con tarjeta.

JSON-LD Article + FAQPage + BreadcrumbList + ItemList. Nav, buscador y sitemap derivan de
`app/utils/siteNav.ts`.

## Fuera de alcance (declarado)

- Subpáginas por categoría (`/equipar-casa-uruguay/heladera`). Salen casi gratis del mismo dato y son
  la familia programática natural, pero no en la primera vuelta.
- FB fuera de Montevideo.
- Garrafa de supergas (precio regulado, ver arriba).
- Cualquier enlace de afiliado: el sitio no tiene ninguno y esta página no lo estrena.

## Tests

- `tests/retail/` — la extracción no cambió comportamiento: los adaptadores aceptan el predicado
  inyectado y filtran igual (los casos existentes de chairs, re-apuntados).
- `tests/equipar/registry.test.ts` — toda categoría declara régimen, variantes, tier, orden y motivo;
  ninguna variante huérfana.
- `tests/equipar/bands.test.ts` — nuevo y usado no se mezclan; el ahorro exige N≥5 en ambas patas.
- `tests/equipar/basket.test.ts` — **la guarda central**: una canasta a la que le falta una categoría
  S publica total parcial + faltantes, y nunca un total crudo.
- `tests/equipar/store.test.ts` — una corrida vacía no pisa un catálogo bueno.
- `app/tests/unit/equiparBasket.test.ts` — la calculadora corta donde se acaba la plata y lista lo
  que queda afuera.
