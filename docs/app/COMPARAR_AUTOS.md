# Comparar autos usados

`/autos-usados-uruguay/comparar` permite elegir hasta tres avisos del catálogo y compartir la selección.
El directorio, sus tarjetas y cada ficha enlazan al comparador. La página reutiliza los datos
publicados: no inventa puntajes ni declara ganador por precio o kilómetros.

- `?autos=carone-1,ml-MLU123456` conserva orden e identidad de los avisos. La selección vive en
  la URL, sin cuenta ni almacenamiento local. Sólo se aceptan claves públicas válidas, sin
  duplicados y hasta tres. La página es siempre `noindex, follow` y está fuera del menú y del sitemap
  (`EXCLUDED_ROUTES`): el hub indexable de "comparar autos usados" es `/comparar-autos-usados-uruguay`
  (compara MODELOS, #190), y la página de avisos lo enlaza arriba. Se llega desde el directorio, sus
  tarjetas y cada ficha.
- `GET /api/cars/compare-listings?autos=…` (no `/api/cars/compare`, que es la de modelos) hace una lectura acotada y usa la proyección y el saneamiento
  públicos existentes. Nunca expone teléfono, descripción privada, vendedor interno ni identidad.
  Una baja aparece como aviso faltante; un error de base devuelve 503, nunca una falsa baja.
- La tabla conserva precio y moneda publicados, notas de contado/entrega, advertencias y fecha
  de lectura. Distingue consumo declarado/estimado y equipamiento sí/no/desconocido. La ausencia
  de un equipo en la ficha no se interpreta como «no». Una lectura anterior a `freshDays` aparece
  como desactualizada, sin afirmar que el auto ya se vendió.
- `ShareButtons` recibe URL, título y resumen factual para el enlace corto y la tarjeta. El
  resumen omite montos con moneda inferida o advertencias de entrega/precio contradictorio. El
  enlace conserva los autos pero vuelve a consultar sus datos; la tarjeta es una captura y pide
  confirmar vigencia.

Lógica pura: `app/utils/carComparison.ts`. Texto en español, inglés y portugués:
`app/utils/carComparisonMessages.ts`. Pruebas: `carComparison.test.ts` y
`carComparisonApi.test.ts` (selección, faltantes, antigüedad, equipamiento, privacidad y fallos).
