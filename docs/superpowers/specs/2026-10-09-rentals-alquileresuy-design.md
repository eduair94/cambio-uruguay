# Las páginas del hilo de r/uruguay en /alquileres-uruguay — diseño

2026-10-09. Pedido del usuario: "Revisar que se estén indexando todas las páginas respectivas para
alquiler: https://www.reddit.com/r/uruguay/comments/qoou5v/paginas_para_buscar_alquileres/ — caso
no sea así agregar respectivamente; la idea es tener en consideración todo lo que sea posible".
Spec y plan aprobados por la orden permanente de auto-aprobación.

## Problema

El hilo nombra seis portales, siete webs de inmobiliarias y tres recursos más. El directorio leía
InfoCasas, Mercado Libre, Facebook Marketplace, Casasweb, El País y tres redes sociales. Había que
saber, sitio por sitio, si su inventario ya estaba en el índice y, si no, sumarlo.

## Decisión (medida)

Auditoría completa en `docs/research/rental-sources-reddit-thread-2026-10-09.md`.

- **Se agrega alquileres.uy** (red BuscandoCasa): 131 viviendas sin reservar, 26 de 40 sorteadas
  ausentes del índice, sobre todo en la costa de Canelones y Piriápolis.
- **No se agregan las webs de inmobiliarias** (Remax, ACSA, Braglia, Kosak, Lars, Campiglia): entre
  el 76 % y el 97 % de lo suyo ya está en los portales, y sin número de puerta con unidad cada una
  sólo agregaría tarjetas duplicadas.
- **No se agrega Dueño Directo**: archivo congelado (aviso más nuevo ~agosto de 2024, sin fechas,
  nada vence); importarlo publicaría precios viejos como nuevos.
- **Gallito ya está** vía El País; **Baldovino** no tiene sitio; **la ANV** no publica avisos; los
  **grupos de Facebook** exigen sesión.
- **GoPunta** (fuera del hilo) aporta más pero limita la búsqueda automatizada a propósito: queda
  documentado con la recomendación de pedir permiso a la Cámara.
- **`/comparar-portales-de-alquiler-uruguay`** decía "No leemos Gallito ni las webs propias de cada
  inmobiliaria" y "cinco portales": se corrige con lo medido.

## Diseño de la fuente `alquileresuy`

- `classes/rentals/sources/alquileresuy.ts`, puro salvo `harvestAlquileresUy` (dependencias
  inyectables: `fetchBuffer`, `now`, `env`, como TikTok).
- **Búsqueda**: una POST por categoría (`ap ca lo of te ga ch`) con los radios por defecto y
  `nresultados=500`; respuesta `total||tarjetas||ref||[pines]` en ISO-8859-1.
- **Tarjeta → `RawRental`**: precio/moneda (CONSULTAR = sin precio), zona → departamento y
  localidad (tabla propia; `canonicalDepartment` de respaldo), barrio, dormitorios ("1 amb." =
  monoambiente), baños, m² edificados y de terreno, gastos comunes ("NO" = 0, "?" = null), garaje,
  foto por HTTPS, pin (bbox de Uruguay; un pin compartido por 3 avisos se descarta). Título armado con
  lo que dice la tarjeta. Número de puerta sólo si la línea es calle + puerta de 3–5 dígitos.
- **Rechazos**: reservado, sin precio, **sin actualizar en 180 días** (`RENTALS_AU_MAX_AGE_DAYS`),
  zona desconocida, precio inverosímil (`isPlausibleRent`), estadía de verano (`looksLikeRentalAdvert`;
  el invernal se publica).
- **Ficha** `https://<ref>.ver.uy/` (tope `RENTALS_AU_MAX_DETAILS`/`RENTALS_AU_DETAIL_MINUTES`,
  viviendas primero, `throttleKey: "ver.uy"`): descripción, garantías (`guaranteesFromField`),
  superficies, comodidades tildadas, `furnishedPortal`, traspaso al título. "No existe" retira; ficha
  de otra referencia no enriquece. Nunca el bloque de contacto.
- **Corrida**: sólo la completa (la horaria devuelve "sólo en la corrida completa"). `complete` si
  las siete categorías contestaron enteras. Todo descartado con ≥20 tarjetas = página cambiada →
  `ok: false`, se conserva lo anterior. `RENTALS_AU_ENABLED=0` la apaga.
- **Espejos del enum** (patrón de `88cab5e9`): `types.ts`, `dedupe.ts` (rango 2), `advertiser.ts`,
  `marketLog.ts`, `propertyopportunities/{analyze,types}.ts` (hosts `ver.uy` / `buscandocasa.com`),
  `propertyzones/project.ts`, `app/utils/{rentals,rentalAvailability,propertyOpportunities}.ts`,
  `mcp/src/rentals/types.ts`, tests de cobertura y e2e.

## Pruebas

- `tests/rentals/alquileresuy.test.ts` con capturas recortadas del 9/10/2026 (UTF-8; los bytes
  Latin-1 se rehacen en el test; ningún dato de contacto, el teléfono de la ficha es falso).
- Suite de alquileres completa, `tsc -p tsconfig.production.json`, tests y lint del app.
- Lectura en vivo sin base (`harvestAlquileresUy("full")`): 7 búsquedas, 191 avisos, 99 publicables,
  99 fichas, `complete: true`, sin teléfonos ni correos en las descripciones.

## Plan

1. Auditoría por sitio y cruce contra el índice publicado. ✔
2. `throttleKey` en `net.ts`. ✔
3. Adaptador + tests con capturas reales (TDD). ✔
4. Registro en `sources/index.ts` y espejos del enum. ✔
5. Corrida en vivo sin base y control de calidad de las filas. ✔
6. Documentación: research, `RENTALS.md`, `AGENTS.md`; corrección de la página comparativa. ✔
7. PR → CI → auto-merge → deploy del backend (la corrida diaria de las 04:52 UTC la puebla) y del
   app; medir en producción la primera corrida completa (`rentalmetas`, fuente `alquileresuy`).
