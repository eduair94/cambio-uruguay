# Datos abiertos (`/api/datos/*`)

Página: `/datos-abiertos-uruguay`. Código: `app/utils/openData.ts` (contrato, mapeos, catálogo y
OpenAPI), `app/server/api/datos/*` (rutas) y `app/server/utils/openData.ts` (CORS + caché).

## Qué es

Una capa pública y ESTABLE sobre datos que el sitio ya calcula. Las rutas internas
(`/api/rentals`, `/api/cars`, `/api/market-series`) cambian cuando cambia la página; esta capa no.
Si una forma interna cambia, se arregla el mapeo en `utils/openData.ts` y el contrato sigue igual.
`tests/unit/openData.test.ts` exige que cada ruta de `server/api/datos/` esté en el catálogo, que el
OpenAPI tenga un path por ruta y que ninguna ficha deje salir fotos, contactos, coordenadas ni la URL
del portal de origen.

| ruta | qué | licencia |
|---|---|---|
| `/api/datos` | catálogo | — |
| `/api/datos/openapi.json` | OpenAPI 3.1 | — |
| `/api/datos/mercado?mercado=` | qué hay medido (índice de `marketseriesmetas`) | CC BY 4.0 |
| `/api/datos/mercado/actual?mercado=&moneda=&tipo=&dormitorios=&departamento=` | último punto de todas las cohortes (prefijo de clave, usa el índice de `key`) | CC BY 4.0 |
| `/api/datos/mercado/serie?…` o `?clave=` | serie diaria de una cohorte | CC BY 4.0 |
| `/api/datos/alquileres?…` | búsqueda de avisos (envuelve `/api/rentals`) | no se licencia |
| `/api/datos/autos?…` | búsqueda de avisos (envuelve `/api/cars`) | no se licencia |

## Dos decisiones que no hay que deshacer

- **Las estadísticas se licencian (CC BY 4.0), los avisos no.** Los avisos son de sus anunciantes y
  de los portales; El País se importa con un permiso fechado de su operador que no se extiende a
  terceros. La búsqueda devuelve una ficha mínima con el enlace a NUESTRA ficha.
- **El crédito se pide, no se impone.** La licencia pide citar con enlace y la página ofrece el
  snippet; ningún widget mete un enlace que el que publica no eligió (ver `utils/widgetEmbed.ts`).

Quién ya usa los datos se registra en `utils/pressMentions.ts` (Diario NORTE publica la pizarra del
BROU con «datos vía Cambio-Uruguay.com», verificado el 13/11/2026).
