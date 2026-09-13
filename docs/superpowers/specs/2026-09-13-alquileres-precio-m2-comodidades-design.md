# /alquileres-uruguay: ordenar por precio por m² y filtrar por comodidades

Fecha: 2026-09-13. Pedido: "ordenar en alquileres por precio por m² y poder elegir si dispone de
gimnasio / otros servicios relevantes".

Todo lo que sigue se midió contra la colección `rentallistings` de producción el 2026-09-13
(58.265 propiedades públicas, ventana de 10 días).

## A. Orden "Menor precio por m²" (`sort=precio-m2`)

### Por qué no alcanza con `precio / área`

Ordenar de menor a mayor sube al primer lugar los errores de carga, no las gangas. Los 20 primeros
de `priceUyu / area` eran todos superficies imposibles: un apartamento de 1 dormitorio con
55.000 m², otro con 34.455 m², casas de balneario con la superficie del terreno cargada como
construida (400–700 m² a $10.000–25.000). En el otro extremo, avisos de temporada con 1 m².
Es la misma trampa que la pizarra congelada: ordenar por "más barato" premia el dato roto.

### Regla (una sola función, dos formas)

`rentalPricePerM2({ propertyType, area, bedrooms, priceUyu })` devuelve un número o `null`:

- `habitacion` → siempre `null`: el precio es por cama y el área es la de toda la residencia
  (72 de 160 habitaciones daban menos de $100/m²).
- `area` tiene que ser número finito y **≥ 15 m²**.
- `apartamento` y `casa`: `area ≤ 100 + 80 × dormitorios` (sin dormitorios publicados: 400 m²),
  y el resultado tiene que superar un piso: **$150/m² en apartamentos, $100/m² en casas**.
- Resto de tipos (oficina, local, garaje, terreno, otro): sólo el mínimo de 15 m². Un galpón a
  $75/m² es real.

Efecto medido con la regla final (función y expresión dieron el mismo valor en las 58.276 filas
públicas): quedan rankeados 30.801 de 34.916 apartamentos y 7.200 de 9.665 casas; las 644
habitaciones quedan fuera. El primer apartamento del orden pasa de "$0/m²" (1 dormitorio con
55.000 m²) a $150/m² (2 dormitorios, 100 m², Cerro, $15.000).

`null` NO oculta la propiedad: va al final del orden, igual que el total mensual desconocido en
`sort=total`. La guarda decide qué número se muestra y se ordena, no qué existe.

La misma regla vive como expresión de agregación (`rentalPricePerM2Expression()`), generada desde
las mismas constantes. La paridad se verifica contra la Mongo real (ver Verificación).

### Dónde

- `app/utils/rentals.ts`: `RentalSort` + `RENTAL_SORTS`, la función pura, la expresión, las
  constantes y `RENTAL_PRICE_PER_M2_SORT_FIELDS`; `rentalMongoSort('precio-m2')` =
  `{ _rentalPricePerM2Unknown: 1, _rentalPricePerM2: 1, priceUyu: 1, key: 1 }`.
- `app/server/api/rentals/index.get.ts`: calcula los dos campos temporales DESPUÉS de las etapas de
  oferta (el precio es el del aviso que cumple los filtros), los proyecta antes del `$sort` (regla
  de memoria de `rentalsSortMemory.test.ts`) y los quita al final.
- Página: opción de orden, pista bajo el conteo ("…las superficies incompatibles y las habitaciones
  quedan al final") y `≈ $ 446/m²` en la línea de datos de la tarjeta cuando la función no da
  `null` (el número que se ve es el que se ordena).

## B. Filtro "Comodidades" (`comodidades=gimnasio,piscina`)

### De dónde sale el dato

Sólo InfoCasas publica comodidades como dato estructurado (`facilities`), y el barrido ya las guarda
en `offers[].details.amenities` sin pedir nada extra: 13.341 propiedades las traen. El País trae
`details` pero sus amenities se excluyen a propósito (generadas, ver `elpais.ts`). MercadoLibre sólo
expone seis filtros de búsqueda (amoblado, aire, jardín, ascensor, piscina, terraza) y **ninguno es
gimnasio**. Facebook y Casasweb no publican nada.

Por eso el filtro no toca el crawler en esta versión: lee lo que ya está guardado. La ausencia no es
negativa: un aviso sin la marca puede tener gimnasio, y la interfaz lo dice.

### Lista (conteo = propiedades públicas que el filtro devuelve, 2026-09-13)

| clave | etiquetas de InfoCasas | propiedades |
|---|---|---|
| gimnasio | Gym | 2.214 |
| piscina | Piscina | 1.678 |
| parrillero | Parrillero / Barbacoa, Barbacoa | 5.278 |
| ascensor | Ascensor | 3.081 |
| aire | Aire acondicionado (NO "Previsión A.A.") | 5.162 |
| balcon | Balcón / Terraza, Balcón, Terraza (NO "Terraza lavadero") | 6.076 |
| lavadero | Lavadero, Terraza lavadero, Lavandería | 4.969 |
| calefaccion | Calefacción, Calefacción individual/central, Losa radiante | 4.235 |
| jardin | Jardín / Patio, Patio | 2.734 |
| sauna | Sauna, Spa | 1.015 |
| salon | Salón de uso común, Playroom | 2.107 |

Gimnasio y piscina a la vez: 859. Cada conteo del filtro coincidió exactamente con uno independiente
hecho en JavaScript sobre los avisos vigentes (ver Verificación).

Seguridad/portería no existe en las etiquetas de alquiler: no se ofrece un filtro que siempre
devolvería cero.

### Semántica

- **Todas** las elegidas (AND): quien pide gimnasio y piscina quiere las dos.
- Nivel **propiedad**, con la evidencia de sus avisos VIGENTES: el `$match` corre antes de derivar
  (prefiltro, superconjunto barato) y otra vez después de que `rentalPublicStages` descarta los
  avisos vencidos (exacto). Un aviso viejo no puede aportar un gimnasio.
- Cada etiqueta se compara entera (`^…$`, sin distinguir mayúsculas), no por substring: "Terraza
  lavadero" no es una terraza.
- No entra en `rentalOfferMatchesQuery`: ese matcher evalúa condiciones comerciales de UN aviso con
  la proyección pública, que no trae `details`. Si entrara, rechazaría todo.
- Condiciones en `$and` con `$regex` en JSON plano (como `propertySalesQuery.ts`), no `RegExp`.

### Dónde

- `app/utils/rentalAmenities.ts` (nuevo): claves, patrones, orden de presentación.
- `app/utils/rentals.ts`: `RentalQuery.amenities`, lectura de `comodidades` (desconocidas se
  descartan, orden estable), escritura en `rentalQueryToParams`, condición en `buildRentalFilter`.
  Lista, mapa, facetas, ficha y alertas usan esa misma función: no hay segunda copia del filtro.
- `app/utils/rentalAlerts.ts`: `comodidades` entra a la lista blanca como arreglo y una clave
  desconocida es `unsupported_filter` (una alerta nunca se ensancha en silencio).
- UI: selector múltiple en "Características", resumen del grupo, chip de filtro activo, resumen de
  la alerta; textos en es/en/pt.

## Costo medido

Sobre producción: el conteo base tarda ~700 ms; con gimnasio ~330 ms y con gimnasio+piscina
~325 ms (el prefiltro achica el conjunto). El orden por $/m² de una página ~840 ms, en línea con
los órdenes actuales.

## Fuera de alcance (siguiente paso posible)

- Pasadas de MercadoLibre por `HAS_SWIMMING_POOL`, `HAS_LIFT`, `HAS_AIR_CONDITIONING`,
  `HAS_TERRACE`, `HAS_GARDEN` (como la de mascotas): sumarían ML a 5 de las 11 comodidades, pero
  compiten por el presupuesto de solicitudes que ya dejó a mascotas en 20 de 602. No gimnasio.
- Orden de mayor a menor por m².

## Verificación

- vitest del app: regla (casos medidos), expresión (estructura + mismas constantes), query
  (ida y vuelta de `comodidades`), `buildRentalFilter` (composición con `q` y `sedes`), endpoint
  (proyección antes del sort, campos temporales fuera), alertas (acepta conocidas, rechaza
  desconocidas), patrones contra las etiquetas reales.
- Paridad en Mongo real: se empaqueta `utils/rentals.ts` con esbuild y en el VPS se compara, para
  las 58k propiedades, la función contra la expresión, y el conteo del filtro contra un conteo
  independiente de etiquetas. Sólo lectura.
- Después del deploy: la API y la página en producción con `sort=precio-m2` y `comodidades=gimnasio`.
