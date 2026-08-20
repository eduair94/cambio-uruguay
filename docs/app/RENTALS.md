# Directorio de alquileres (`/alquileres-uruguay`)

Una fila por **propiedad**, no por aviso. El mismo apartamento publicado por dos inmobiliarias en
InfoCasas y de nuevo en Mercado Libre es una sola tarjeta con tres enlaces.

```
sync_rentals.ts ──> classes/rentals/sources/*  ──> dedupe.ts ──> store.ts ──> APP Mongo
   (pm2)              ML :9656 / InfoCasas /         │            (upsert)     rentallistings
                      FB :9657                       │                          rentalmetas
                                                      └── una propiedad = N ofertas
                                                                 │
app/pages/alquileres-uruguay.vue <── app/server/api/rentals <────┘
```

## Fuentes

| fuente | cómo se lee | qué trae | qué NO trae |
|---|---|---|---|
| **Mercado Libre** | bridge propio en `:9656` (`pm2 mercadolibre`), `?raw=true` | dirección con calle+número, barrio, dormitorios/baños/m², precio, foto | gastos comunes, fecha de publicación, lat/lon, nombre del vendedor |
| **InfoCasas** | `__NEXT_DATA__` de sus páginas de listado | todo lo anterior **más** lat/lon, gastos comunes, inmobiliaria y fecha de publicación | — |
| **Facebook Marketplace** | bridge propio en `:9657` (`pm2 facebook_marketplace`) | precio, título, ciudad, foto | dirección, barrio, m², dormitorios (salvo que estén en el título) |

**Gallito no está.** Sus listados se arman con un postback de ASP.NET WebForms del lado del
cliente: la página que sirve el servidor no tiene ninguna tarjeta, y lo único que quedaría es
reproducir una secuencia de `__doPostBack` que se rompe con su próximo deploy. Está documentado
acá en vez de medio implementado.

### La trampa de Mercado Libre

La respuesta **recortada** del bridge (la que usa el directorio de sillas) deja afuera justo lo que
un alquiler necesita: dirección, dormitorios y metros. Esos datos sólo están en la respuesta
**cruda**, dentro del layout de "polycards" de la búsqueda de ML: 20 tarjetas por request pase lo
que pase el `limit`. De ahí que el harvester pida `raw=true`, camine el árbol buscando `polycard` y
lea `attributes_list` (`"2 dormitorios | 1 baño | 40 m² cubiertos"`) y `location`
(`"Av. Garzón 1975 Bis, Colón, Montevideo"`).

### Buenos modales

- UA propia e identificable (`CambioUruguayBot/1.0 (+https://cambio-uruguay.com/alquileres-uruguay)`).
  Probada contra los tres sitios: responden 200.
- Un request por host a la vez, con 1,2 s de separación (`RENTALS_HOST_GAP_MS`). El barrido completo
  de InfoCasas son ~900 páginas contra un solo host: va a las 04:52 UTC (01:52 de Montevideo).
- `robots.txt` de InfoCasas prohíbe `/alquiler/*-y-*`. Sólo construimos `/alquiler/pagina<N>`, y
  `assertAllowed()` rechaza cualquier ruta con `-y-` para que un futuro slug tipo
  `treinta-y-tres` no se cuele.
- Gallito publica `Content-Signal: search=yes, ai-train=no, use=reference`. Lo que hacemos es
  justamente el uso `search` (indexar y enlazar de vuelta), no entrenamiento — y por eso no está
  scrapeado igual: la razón para dejarlo afuera es técnica.
- Guardamos metadatos y el enlace, nunca la descripción del aviso.

## Cómo se unifica (lo importante)

`classes/rentals/dedupe.ts`. La regla es **evidencia**, no parecido:

| nivel | condición | por qué |
|---|---|---|
| fuerte | misma calle **y** número, mismos dormitorios, m² ±15 %, precio ±7 % | un edificio de ocho apartamentos son ocho avisos en la misma dirección: la dirección sola es el EDIFICIO, no la unidad |
| medio | sin calle de ninguno de los dos, mismo barrio, mismos dormitorios (los dos publicados), m² ±8 %, precio ±5 % | es lo único que se puede pedir en Marketplace, que casi nunca da dirección |
| ninguno | el resto | un duplicado visible molesta; un aviso tragado es mentir sobre lo que hay en el mercado |

Antes de comparar, todo pasa por `normalize.ts`:

- **El número de puerta es el último, no el primero.** Media Montevideo son calles que empiezan con
  número (18 de Julio, 25 de Mayo, 8 de Octubre, 33 Orientales). Leer el primero dejaba esas
  direcciones sin nombre de calle y partía un edificio en dos propiedades.
- Abreviaturas expandidas (`Av.` → `avenida`, `Cno.` → `camino`, `Dr.` → `doctor`), rangos al valor
  bajo (`1500 - 1800` → `1500`), Plus Codes de Google descartados, esquinas cortadas en la primera
  calle (`Sena esq. 20 de Febrero` → `sena`).
- Un barrio que repite el departamento (`Montevideo, Montevideo`) no es un barrio: dejarlo partía la
  misma oficina de 25 de Mayo 500 en dos filas.
- Precios: **manda el último separador**. `$ 4.500` es 4500, nunca 4,50.
- Se descartan ventas, "busco alquiler", alquileres por día/temporada y cualquier precio que no
  pueda ser una mensualidad (`isPlausibleRent`: $3.000 a $900.000).

Todo en pesos con **una sola** cotización por corrida (mediana de venta de las casas de cambio, ni
BCU ni interbancario): dos harvesters con dos dólares distintos discreparían sobre el mismo aviso.

## Corridas

| pm2 | cron (UTC) | qué hace |
|---|---|---|
| `currency-rentals` | `52 4 * * *` | barrido completo + poda de lo que nadie publica hace 21 días |
| `currency-rentals-hourly` | `47 * * * *` | sólo lo más nuevo (`order=3` en InfoCasas, `since=today` en ML). **Nunca poda** |

Tres propiedades que el job mantiene:

1. Un portal que falla **degrada** la corrida, no la voltea: la página dice cuál falta y las filas de
   ese portal se conservan en vez de borrarse como "ya no está".
2. Se niega a publicar un directorio derrumbado sobre uno sano (`RENTALS_COLLAPSE_RATIO`, 50 %).
3. `mergeOffers` conserva las ofertas que la corrida no vio: sin eso, el repaso horario —que lee una
   franja del mercado— borraría los otros portales de cada propiedad que toca.

## Variables de entorno

| var | default | para qué |
|---|---|---|
| `APP_MONGO_URI` | — | **obligatoria**: sin ella el job se niega a correr (escribiría la DB equivocada) |
| `RENTALS_IC_MAX_PAGES` / `RENTALS_IC_FAST_PAGES` | 900 / 10 | tope de páginas de InfoCasas |
| `RENTALS_ML_MAX_PAGES` / `RENTALS_ML_FAST_PAGES` | 120 / 12 | tope de páginas por consulta en ML |
| `RENTALS_FB_ENABLED` | — | `0` apaga Marketplace |
| `RENTALS_FB_LOCATIONS` | montevideo,ciudad-de-la-costa,maldonado,salto,paysandu | ciudades que se consultan en Marketplace |
| `RENTALS_HOST_GAP_MS` | 1200 | separación mínima entre dos requests al mismo host |
| `RENTALS_PRUNE_DAYS` | 21 | días sin publicarse antes de salir del directorio |
| `RENTALS_STALE_OFFER_DAYS` | 4 | días que un aviso sobrevive sin que su portal (sano) lo vuelva a mostrar |
| `RENTALS_USD_UYU` | — | fija la cotización (útil para probar) |

## La página

`app/pages/alquileres-uruguay.vue` + `app/server/api/rentals/index.get.ts`.

A diferencia de `/api/chairs` —unos cientos de filas que viajan enteras y se filtran en el
navegador—, acá son decenas de miles: **todo** el filtrado, el orden, las facetas y la mediana se
resuelven en Mongo contra los índices compuestos del modelo. Las filas cuyos avisos dejaron de
aparecer se excluyen por `lastSeen` (10 días) aunque el documento siga existiendo.

Las búsquedas con filtro y las páginas 2+ salen `noindex, follow`: las facetas se multiplican en
millones de URLs y cada una es una copia delgada de la misma página.

## Probarlo

```bash
npx ts-node scripts/oneoff/rentals_probe.ts   # 3 páginas por fuente, imprime qué unificó
npx vitest run tests/rentals/                 # normalize + dedupe + store
cd app && npx vitest run tests/unit/rentals.test.ts
```
