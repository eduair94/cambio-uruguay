# Alquiler por barrio y autos usados por presupuesto — diseño

Fecha: 2026-10-04. Pedido: "generar contenido relevante para incrementar el tráfico orgánico de las
secciones de alquileres, autos, etc." Spec y plan auto-aprobados (orden vigente del dueño).

## Por qué estas dos familias (lo medido)

Search Console, 3/7–1/10/2026, consulta × página (54.613 filas):

- Los directorios no compiten en la consulta genérica: "alquileres uruguay" / "autos usados uruguay"
  rankean en posición 40–60 con 10 y 130 impresiones en tres meses. Ahí mandan ML, InfoCasas y
  Gallito, y una página más no lo cambia.
- Lo que sí rankea es la cola larga con dato propio: `/autos-usados-uruguay/precios/<modelo>` en
  posición 9–12 para "suzuki alto 800 usado precio uruguay", "vw up usados", "peugeot 208 usado"
  (17 de 411 fichas ya tienen impresiones, y la familia existe desde el 17/9), y las páginas de
  problema (`/alquilar-estando-en-clearing`: 734 impresiones, 40 clics, posición 3–5).
- El autocompletado uruguayo muestra dos intenciones que hoy no tienen página:
  - **barrio + dormitorios**: "alquiler pocitos 1/2/3 dormitorios", "alquiler cordon 2 dormitorios",
    "alquiler 1 dormitorio buceo/malvin/centro/tres cruces", "alquileres en ciudad vieja 2
    dormitorios garantia anda", "cuanto cuesta alquilar un apartamento en montevideo".
  - **presupuesto**: "autos usados hasta 4000/5000/6000/10000 dolares", "que auto usado comprar en
    uruguay".

Los dos datos ya se calculan y nadie los publica por URL propia:

- `propertyzonesnapshots` `_id: market`: 2.027 cohortes (departamento × barrio × tipo × dormitorios)
  con renta, gastos comunes, total mensual y $/m² (p25/mediana/p75, n ≥ 8). 178 barrios/localidades
  tienen al menos una mediana publicable.
- `carreportsnapshots` `key: used`: `budgets[]` con topes fijos 6.000 / 10.000 / 15.000 / 20.000 /
  30.000 USD (`classes/autos/report.ts:62`; banda 80–100 % del tope, modelos con ≥ 8 avisos).

## Familia A — `/alquiler/<departamento>/<barrio>`

**Ruta.** `app/pages/alquiler/[departamento]/[barrio].vue`. No se mueve
`alquileres-uruguay.vue` (2.556 líneas, cinco tests lo leen por ruta). `/alquiler/` es un árbol
nuevo, distinto de `/alquileres/` (fichas). Sólo español (`defineI18nRoute({ locales: ['es'] })`,
como la ficha): el cuerpo son precios pedidos en Uruguay y un espejo /en|/pt sería contenido
duplicado.

**Slugs.** `slugifyDepartment` para el departamento y `slugifyText(rentalZoneName(barrio))` para el
barrio. El barrio se identifica por el nombre normalizado (`rentalZoneName`, el mismo plegado de
acentos y mayúsculas que usa el job), así "POCITOS" y "Pocitos" son una sola página. La etiqueta
visible sale de `rentalZoneLabel`.

**Datos.** Endpoint nuevo `GET /api/rentals/barrio?department=<slug>&barrio=<slug>` que reusa el
loader de `server/utils/rentalZones.ts` y la proyección pura `projectRentalZoneSnapshots` (que ya
anula estadísticas con n < 8 y exige p25 ≤ mediana ≤ p75). Devuelve:

- `zone`: departamento, barrio (etiqueta), slugs.
- `cells`: por tipo (`apartamento`, `casa`) × dormitorios (`any`, `0`, `1`, `2`, `3`, `4plus`) la
  renta, gastos comunes, total mensual y $/m², con `count`, fuentes y `lastSeenFrom/To`.
- `rank`: posición del barrio entre los del mismo departamento por mediana de apartamento de 2
  dormitorios (y por `any` si 2 no alcanza), con el total de barrios comparados. Es una comparación
  de medianas entre barrios, nunca una mediana de medianas.
- `similar`: hasta 6 barrios del mismo departamento con la mediana más cercana en la misma celda, y
  `largest`: los 6 con más avisos (enlazado interno entre fichas de barrio).
- `listings`: hasta 6 avisos vigentes del barrio (los mismos que devuelve `/api/rentals` con el
  filtro de barrio), con título, precio, dormitorios y enlace a la ficha.
- `generatedAt`, `rentalDataAsOf`, `indexable`.

`cache-control: public, max-age=120, s-maxage=300`. Error de base → 503 `no-store`; barrio
desconocido → 404.

**Indexación.** `indexable` = al menos **2 celdas publicables** (mediana no nula) entre apartamento
y casa. Medido: 122 barrios cumplen. Un barrio conocido con menos se sirve con
`robots: noindex, follow` y un aviso de "pocos avisos todavía"; no entra al sitemap. Un snapshot
de más de 7 días también vale noindex (no publicar como "hoy" un precio viejo).

**Contenido de la página** (todo calculado, nada inventado):

1. H1 "Alquiler en {Barrio}: cuánto cuesta hoy". Párrafo con la mediana de 1, 2 y 3 dormitorios
   (lo que exista) y la fecha del dato.
2. Tabla por tipo × dormitorios: mediana, rango p25–p75, gastos comunes, total mensual, $/m², n de
   avisos. Cada fila enlaza al directorio filtrado
   (`/alquileres-uruguay?department=…&neighborhood=…&bedrooms=…`, que ya es noindex).
3. "Comparado con el resto de {Departamento}": la posición del `rank`.
4. Avisos vigentes (hasta 6 tarjetas simples) + enlace al directorio filtrado.
5. Para los 62 barrios oficiales de Montevideo, `ZoneServicesPanel` (luz, agua, reclamos) si el
   perfil existe; si no, nada.
6. Barrios con precio parecido + los más buscados (enlaces internos).
7. Guías relacionadas: garantías, depósito, primer alquiler, qué revisar antes de firmar.
8. FAQ desde los datos (`FaqSection`, que ya emite `FAQPage`): "¿Cuánto cuesta alquilar un
   apartamento de N dormitorios en {Barrio}?", "¿Cuánto son los gastos comunes en {Barrio}?",
   "¿{Barrio} es caro comparado con el resto de {Departamento}?", más una genérica de garantías
   que enlaza a `/garantia-de-alquiler-uruguay`. Una pregunta sin dato no se publica.

SEO: `useSeoMeta` (title ≤ 60 con marca, description única por barrio con la mediana), canonical
absoluto, `BreadcrumbList` (Inicio › Alquileres › {Barrio}). Entra en `NOINDEXED` de
`seoContract` porque el noindex es condicional.

**Enlazado.**
- `/barrios-alquileres-uruguay`: lista SSR de los barrios indexables por departamento (hoy la
  página monta todo del lado del cliente: Google no ve ningún enlace).
- Ficha `/alquileres/<key>`: "Precios de alquiler en {Barrio}" cuando el barrio de la ficha tiene
  página indexable. Son ~9.600 fichas en el sitemap.
- Sitemap: un bloque más en `server/api/__sitemap__/urls.get.ts`, sólo indexables.

## Familia B — `/autos-usados-uruguay/hasta-<monto>-dolares`

**Ruta.** `app/pages/autos-usados-uruguay/hasta-[monto]-dolares.vue` (segmento mixto; el prefijo
estático le gana a `[key].vue`). `validate`: `monto` ∈ topes del informe (6000, 10000, 15000,
20000, 30000), en una constante del app con test de paridad contra `classes/autos/report.ts`.
Cualquier otro monto → 404. Sólo español.

**Datos.** `loadCarReport()` (ya existe, caché de 10 min) para el tramo, más hasta 12 avisos
vigentes de `CarCatalog` con `priceUsd ≤ tope` (los más recientes), por un endpoint nuevo
`GET /api/cars/budget/:monto`.

**Contenido.**
1. H1 "Autos usados hasta US$ {monto} en Uruguay". Párrafo: cuántos avisos hay en la banda, la
   mediana de año y km del tramo, y la fecha.
2. Tabla de modelos del tramo: modelo, mediana de precio, año y km, n de avisos. Enlaza a
   `/autos-usados-uruguay/precios/<slug>` cuando el modelo tiene ficha indexable.
3. Aclaración explícita: la banda es lo que se pide **cerca** del tope (80–100 %), no todo lo que
   hay debajo.
4. Avisos vigentes ≤ tope + enlace al directorio con `priceMax`.
5. Qué revisar antes de comprar: deuda de patente (`/comprar-auto-con-deuda-uruguay`), título
   (`/guias/titulo-del-auto-uruguay`), transferencia (`/guias/transferir-un-auto-uruguay`),
   riesgos declarados (`/autos-chocados-y-con-deuda-uruguay`).
6. Los otros presupuestos (enlaces entre los cinco) y `/que-auto-comprar-uruguay`.
7. FAQ desde los datos: "¿Qué auto usado comprar con US$ {monto}?", "¿Cuántos autos usados hay
   hasta US$ {monto}?", "¿De qué año es un auto de US$ {monto}?".

Indexable si el tramo tiene ≥ 3 modelos; si no, noindex. Las cinco rutas van al sitemap.

**Enlazado.** `/mercado-de-autos-usados-uruguay` (bloque de presupuestos) enlaza cada tramo a su
página.

## Convenciones del repo que se cumplen

- `routeRules` con `s-maxage` por familia (formato literal que exige
  `tests/unit/routeRules-browser-cache.test.ts`); OG de autos para la familia B.
- `siteNav.ts`: `DYNAMIC_ROUTE_KEYS` para las dos rutas con corchetes.
- `docs/seo/experiments.json`: dos filas en el mismo commit (`/alquiler/` y
  `/autos-usados-uruguay/hasta-`), validadas por `tests/revenueplan/experiments_routes.test.ts`.
- Cero cifras de ingreso en nada versionado.
- Ningún cálculo pesado por pedido: todo sale de snapshots precalculados.

## Fuera de alcance (YAGNI)

- Páginas separadas por dormitorio (`/alquiler/montevideo/pocitos/2-dormitorios`): son secciones
  con ancla dentro de la página del barrio. Se reconsidera si Search Console muestra impresiones
  por dormitorio que la página no capta.
- Topes nuevos (4.000/5.000 USD): cambian el job del informe. Siguiente iteración si la familia
  rinde.
- Páginas modelo + año.
- Series históricas por barrio dentro de la página (ya están en
  `/evolucion-precio-alquileres-uruguay`; se enlaza).

## Pruebas

- Unit: armado de la respuesta del barrio (celdas, rank, similares, gate de indexación, snapshot
  viejo), slugs (ida y vuelta, colisiones de acentos y mayúsculas), validate y paridad de topes.
- `seoContract`, `seoTitleBudget`, `seoDescriptionBudget`, `siteNav-coverage`,
  `routeRules-browser-cache`, `experiments_routes`.
- `npm run lint` del app (CI lo exige).
- Después del deploy, medir en producción: status 200, robots, canonical, H1, JSON-LD, presencia
  en el sitemap, y que una ficha de alquiler muestre el enlace a su barrio.
