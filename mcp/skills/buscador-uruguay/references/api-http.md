# API HTTP pública (cuando no hay MCP)

Base: `https://cambio-uruguay.com`. JSON, sólo GET salvo donde se indica. Sin clave. Sé moderado:
el ranking por hogar admite ~10 consultas por minuto.

## Alquileres

- `GET /api/rentals` — directorio. Parámetros: `department`, `neighborhood` o `neighborhoods`
  (coma), `types` (vivienda, apartamento, casa, habitacion, local, oficina…), `bedrooms` (+
  `bedroomsExact=1`), `bathrooms`, `areaMin`, `areaMax`, `priceMin`/`priceMax` (PESOS),
  `currency` (UYU/USD: moneda del aviso), `monthlyMax` (total con gastos comunes, pesos),
  `expensesMax`, `pets=1`, `parking=1`, `furnished=1`, `garantia` (anda, contaduria, aseguradora,
  propietaria, deposito, bhu, aConvenir), `comodidades`, `dueno=1`, `q` (texto),
  `refLat`/`refLng`/`refLabel` + `sort=distancia`, `servicios` (denuncias, agua, luz, saneamiento,
  limpieza, alumbrado), `availability` (hide_any, hide_multiple), `sort` (recientes, precio,
  precio-desc, total, precio-m2, metros, distancia), `page`, `perPage` (6–48).
  Respuesta: `items[]` (con `offers[]`, `matchingOffer`), `total`, `medianUyu`, `facets`, `meta.usdUyu`.
- `GET /api/rentals/ficha/<key>` — una vivienda: `property`, `market`, `similar`.
- `GET /api/rentals/zone-profile?zone=<officialZone.zone>&department=…` — servicios del barrio.
- `GET /api/rentals/geocode?q=<dirección>&department=…` — coordenadas (IDE Uruguay).
- `POST /api/rentals/fit` (JSON) — ranking por hogar. Cuerpo: `people[]` (`id`, `label`,
  `incomeUyu`, `remoteDays`, `destinations[]` con `id`, `label`, `kind` work|study|other, `lat`,
  `lng`, `days`, `mode` walking|bicycling|transit|driving, `targetKm`), `housingBudgetUyu`,
  `otherExpensesUyu`, `savingsUyu`, `transportUyu`, `department`, `types`, `minBedrooms`,
  `minArea`, `pets`, `parking`, `furnished`, `hideReported`, `includeOverBudget`,
  `priority` balanced|budget|commute, `zones` opcional `{mode: prefer|only, include:[{department,
  neighborhood}], exclude:[…]}`. Ids: letras, números, guiones.
- `GET /api/rentals/analysis?department=&neighborhood=&type=&bedrooms=&currency=` — estadísticas.
- `POST /api/rentals/estimate` (JSON) — tasador: `department`, `neighborhood`, `type`, `bedrooms`,
  `bathrooms`, `area`, `areaBasis` built|total, `currency`, `parkingSpaces`, `askingPrice`.
- `GET /api/rentals/zones?department=&propertyType=&bedrooms=` y `GET /api/rentals/zone-scores` — barrios.
- `GET /api/property-opportunities?operation=rent|sale&department=&neighborhood=&type=&bedrooms=&maxPrice=&sort=`.

## Autos

- `GET /api/cars` — `q`, `brand` (slug), `model` (slug marca-modelo), `yearMin`, `yearMax`, `kmMax`,
  `l100Max`, `priceMin`, `priceMax` (US$), `fuel`, `transmission`, `body`, `doors`, `color`,
  `department`, `seller` dealer|private, `source`, `priceDrop=1`, `opportunity=1`, `noRisk=1`,
  `sinceDays`, `sort` (recent, price_asc, price_desc, km_asc, year_desc, consumption_asc), `page`.
- `GET /api/cars/ficha/<key>`, `GET /api/cars/market/<marca-modelo>`.
- `GET /api/car-opportunities`, `GET /api/car-risks?category=`, `GET /api/car-report`.

## Productos

- `GET /api/phones`, `GET /api/chairs`, `GET /api/equipar`,
  `GET /api/movilidad/monopatin-electrico`, `GET /api/movilidad/bicicleta-electrica`.
- `GET /api/stores`, `GET /api/stores/<key>`, `GET /api/precios`, `GET /api/directorios`.

## Links para la persona

- Ficha de alquiler: `https://cambio-uruguay.com/alquileres/<key>`
- Búsqueda de alquiler: `https://cambio-uruguay.com/alquileres-uruguay?<mismos parámetros>`
- Ficha de auto: `https://cambio-uruguay.com/autos-usados-uruguay/<key>`
- Modelo: `https://cambio-uruguay.com/autos-usados-uruguay/precios/<marca-modelo>`
