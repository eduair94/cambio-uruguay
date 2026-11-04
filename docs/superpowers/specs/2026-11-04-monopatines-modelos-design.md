# Monopatines: una página por modelo, y un comparador

Fecha: 2026-11-04. Sigue a `monopatines-ficha-tecnica` (PR #232/#233, 3/11/2026).
Pedido del dueño: "Mejorar página de monopatín eléctrico (…) imitando páginas de venta de monopatines
eléctricos populares" → "Keep improving". Spec y plan auto-aprobados (orden permanente).

## Por qué

1. **La tabla de modelos no agrupa.** En producción (4/11, 05:10 UTC) `/api/movilidad/monopatin-electrico`
   publica 23 "productos" y cada uno tiene UN aviso: "Xiaomi 5 Max" aparece tres veces separado. El
   régimen `modelo` de equipar identifica por texto del título y no cruza vendedores.
2. **Medido sobre los 774 avisos vivos** con la marca/modelo que trae la ficha de ML: 190 grupos, 54 con
   ≥2 avisos, 37 con ≥2 vendedores, 18 con ≥3 (Xiaomi 6 Max: 14 avisos, 6 vendedores, $ 32.726–53.844).
   Además 26 ids de catálogo de ML (`/p/MLU…`) ya juntan 62 avisos de vendedores distintos.
3. **La ficha de entidad rankea, el hub no** (memoria `directorios-ficha-rankea-hub-no`, medido en
   sillas, celulares y autos). Las tiendas de monopatines populares tienen página de producto con la
   ficha completa y comparador; acá además se puede decir lo que ninguna tienda dice: **en cuántos
   vendedores uruguayos está y cuánto sale en cada uno**.
4. Diciembre (regalos + verano) es la temporada del monopatín: conviene que las fichas estén indexadas
   antes.

## Qué se construye

### A. Identidad de modelo (backend, puro)
`classes/movilidad/models/identify.ts`: de cada aviso (título, marca, modelo de la ficha, URL) sale
`{ brandKey, brandLabel, tokens, key, label } | null`. **Precisión sobre recall**: un aviso sin marca
conocida, sin tokens de modelo o de Facebook no tiene modelo (queda en el directorio, sin página).

- Marca: la `brandKey` ya enriquecida del aviso (ficha → título, `brands.ts`); genérica → null.
- Modelo: los tokens que siguen a la marca en el título (primera aparición), salteando palabras
  genéricas al principio (monopatín, scooter, eléctrico, electric, la marca repetida, "modelo", "mi");
  junta hasta 3 tokens y corta en la primera palabra genérica, color, conector, medida (`350w`, `25 km`,
  `km/h`, `48v`, `10ah`, `120kg`, `10"`) o número pelado > 99. Un token alfanumérico que termina en
  `pro|max|lite|plus|ultra|mini` se parte (`e9pro` → `e9 pro`, `t1max` → `t1 max`); el guion separa
  (`habit-pro` → `habit pro`). Región/versión (`us`, `eu`, `global`, `version`) corta.
- Si el título no da tokens, se prueba con el modelo de la ficha con la misma limpieza, salvo que
  parezca un código de pieza (letras+dígitos de 7+ caracteres sin vocal separada, p. ej. `BHR08KTGL`).
- `key` = `<brandKey>-<tokens unidos por guion>` (`xiaomi-6-pro`, `luxor-e9-pro`, `atom-kaizen-pro`).
  Es también el slug de la página: estable mientras el título diga lo mismo.
- **Catálogo de ML manda**: los avisos con el mismo id `/p/MLU…` toman el `key` mayoritario del grupo
  (también los que no tenían modelo). Nunca se une por precio, foto ni parecido de texto.

### B. Catálogo de modelos (backend, job existente)
`classes/movilidad/models/build.ts` + escritura en `sync_movilidad_specs.ts` (pm2
`currency-movilidad-specs`, `:01`), después del re-enriquecimiento. APP DB **`movilidadmodels`**, un
documento por `slug`:

- `name` (`Xiaomi 6 Pro`), `brandKey`, `brandLabel`, `modelLabel`, `variant` (mayoritaria), `image`
  (la de la oferta nueva más barata que no sea de Facebook).
- `offers`: todas las del modelo, una por aviso, ordenadas por `priceUyu`, tope 40; campos del aviso
  (listingId, title, sellerName, sellerKey, url, price, currency, priceUyu, condition, source, image,
  observedAt, freeShipping, officialStore).
- `newBand`/`usedBand`: `{ min, median, max, n, sellers }` o null; nunca se mezclan.
- `specs`: **consenso de la ficha** — por campo numérico la mediana de los valores leídos de ficha o
  descripción (nunca del título), por booleano la mayoría, por texto el más repetido; y `agree[field] =
  { n, of }` (cuántas fichas dicen eso de cuántas lo dicen). `fichas` = avisos con ficha.
- `listings`, `sellers`, `firstSeen` (del más viejo), `lastSeen` (hoy), `generatedAt`.
- `history`: un punto por día `{ day, newMin, newMedian, n }`, tope 400. Se guarda desde hoy porque no
  se reconstruye hacia atrás; **la página todavía no lo dibuja** (hace falta serie).
- `indexable` = `sellers >= 2` y al menos 3 campos numéricos de consenso. Una página no indexable se
  sirve con `noindex, follow` y no entra al sitemap.
- Sólo se escriben modelos con **≥ 2 avisos**: uno solo es el aviso, no un modelo.
- Guarda de corrida flaca: si los modelos de esta corrida son < 40 % de los frescos guardados, no se
  escribe. Un modelo que deja de verse conserva su documento; la API sólo sirve `lastSeen` de los
  últimos 7 días (después, 404).
- Los avisos guardan `modelSlug` (en el mismo `$set` que specs/brand) para enlazar tarjeta → modelo; y
  cada candidato del asesor también lo lleva.

### C. Página por modelo `/monopatines-electricos-uruguay/<modelo>`
SSR. El hub pasa de `pages/monopatines-electricos-uruguay.vue` a `.../index.vue` (misma URL).
- H1 `<name>: precio en Uruguay`; bajada "nuevo desde $ X en N vendedores · usado desde $ Y", fecha.
- Franja de ficha grande (autonomía, velocidad, potencia, peso, carga máxima, rueda, carga, batería).
- **Dónde comprarlo**: todas las ofertas, nuevo y usado separados, la más barata primero; vendedor
  (con su ficha de tienda si existe), precio en pesos y en la moneda original, envío gratis, fecha, y
  "Ver aviso" (`nofollow noopener`, pestaña nueva).
- **Ficha técnica** completa, cada fila con "N de M avisos" cuando hay más de una ficha.
- **Autonomía real y costo de carga**: la misma regla del asesor (65 % de lo declarado), costo de una
  carga y de 100 km con la tarifa UTE de `monopatinFicha.ts`. Sólo con autonomía y batería leídas.
- **Normativa**: si la velocidad declarada supera 25 km/h, el aviso de Montevideo/San José (mismos
  datos que el hub).
- **Comparalo con**: hasta 4 modelos del mismo tipo y precio cercano, con su franja y enlace a
  `comparar?m=<este>,<otro>`.
- FAQ con lo que haya: cuánto sale, autonomía, tiempo de carga, peso/carga, si sirve en Montevideo.
- JSON-LD: BreadcrumbList; `Product` con `additionalProperty` y `AggregateOffer` (sólo ofertas nuevas)
  cuando hay oferta nueva. Nunca calificación.
- Título `<name>: desde $ X` si entra en 60 con la marca; si no, `<name>: precio en Uruguay`.

### D. Comparador `/monopatines-electricos-uruguay/comparar?m=a,b,c`
`noindex, follow`, fuera del sitemap. 2 a 3 modelos; selector para agregar/cambiar. Filas: precio
desde, vendedores, autonomía declarada y estimada, velocidad, potencia nominal y pico, batería (V, Ah,
Wh), tiempo de carga, peso, carga máxima, rueda, plegable, suspensión, frenos, app, IP. Se marca el
mejor de cada fila (más autonomía, menos peso, más carga, menor precio…) sólo cuando al menos dos
modelos tienen el dato. En el hub, cada fila de la tabla de modelos tiene "Comparar" y aparece una
bandeja fija "Comparar (n)".

### E. Hub
- "Modelos y sus mejores ofertas" pasa a leer `movilidadmodels` (modelos agrupados, ordenados por
  vendedores y avisos), con enlace a la página del modelo, desde, vendedores y franja de ficha. Si el
  catálogo nuevo está vacío o falla, cae a la tabla vieja (`items[].products`).
- Tarjetas del directorio y picks del asesor: "Ver el modelo" cuando el aviso tiene `modelSlug`.

### F. Correcciones de la ficha que la página de modelo haría visibles
Diferidas del 3/11: "Freno de disco: No" / "Sin app" / "Bluetooth: No" se leen como sí; "4 a 6 h" en una
tabla da 4 (debe dar 6, el lado conservador del tiempo de carga). Con TDD.

## No-objetivos
- No se toca la identidad de equipar/celulares ni `classes/equipar/catalog.ts`.
- No se unen avisos de Facebook a modelos.
- No hay calificaciones, reseñas ni "el mejor monopatín" editorial.
- No se dibuja la serie de precio todavía (se guarda).
- Bicicletas: fuera de esta iteración.

## Anti-objetivos (sería un fracaso aunque funcione)
- Unir dos modelos distintos (6 con 6 Lite, T1 con T1 Max, E9 con E9 Pro).
- Publicar una ficha de consenso armada con lo que dice el título.
- Cientos de páginas finas indexadas: sólo ≥2 vendedores y ficha.

## Medición
Fila en `docs/seo/experiments.json` con ruta `/monopatines-electricos-uruguay/*` (las fichas; el hub
ya tiene su fila del 3/11).
