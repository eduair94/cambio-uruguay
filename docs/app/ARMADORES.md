# Armadores de muebles en Montevideo

`/armadores-de-muebles-montevideo`: directorio por barrio de quien arma muebles en Montevideo y el
área metropolitana, con lo que cobra por mueble. Publicado el 12/11/2026. Diseño en
`docs/superpowers/specs/2026-11-11-armadores-de-muebles-design.md`.

## Por qué no alcanzaba `/fletes-mudanzas-uruguay`

Ese directorio (relevamiento manual del 14/9/2026) tenía 7 prestadores con tarifa de armado y dejó
los avisos de Marketplace y Mercado Libre como "pistas" sin publicar: buscaba empresas de mudanza.
Los armadores independientes anuncian casi todos ahí, y sus avisos duran días. Por eso éste lo
arma un job diario y no una lista a mano.

## El job: `currency-armadores` (`sync_armadores.ts`, `5 18 * * *`)

Un documento `armadorsnapshots{key:"mvd"}` en la APP DB, fusionado de cuatro fuentes
(`classes/armadores/`):

| Fuente | Qué aporta | Precio | Zona | Cadencia |
| --- | --- | --- | --- | --- |
| Relevamiento propio (`editorialData.json`) | empresas, independientes y tiendas con sitio, tarifa y contactos que ellos publican | tabla por mueble, con fuente y fecha | dirección o cobertura declarada | manual |
| Google Places (proxy `:2221`, `textsearch`) | negocios cuyo NOMBRE dice armado/armador | — | coordenada → barrio INE | cada 7 días |
| Facebook Marketplace (Chrome del perfil por CDP; puente `:9657` si no se alcanza) | avisos de independientes | precio de la tarjeta + lista de la descripción | barrios nombrados en el texto | diario |
| Mercado Libre Servicios (`MLU1540`, puente `:9656`) | avisos de servicio | casi nunca (ML no lo muestra) | filtro `city` de ML | diario |

Medido el 11/11/2026: Google 70 fichas → 20 armadores (las mueblerías y showrooms que aparecen en las
mismas búsquedas no entran); Facebook 48 tarjetas por el puente → 30 avisos; ML 27 → 22; relevamiento
48 prestadores, 17 con tarifa (317 filas). Total 110 filas, 43 con algún precio.

Trampas medidas, que explican el código:

- **El proxy de Google no reenvía `pagetoken`** (la página 2 vuelve `INVALID_REQUEST`). La cobertura
  sale de 5 formulaciones × 10 centros con `location` + `radius` (~50 llamadas por semana). Juntas
  devuelven siempre el mismo puñado: Google tiene pocos armadores con ficha, y ese es el dato.
- **La ficha de un aviso de ML Servicios redirige a `/gz/account-verification`**, con cualquier UA.
  Por eso el barrio sale del buscador: filtrar por departamento (`state`) devuelve el filtro `city`
  con los barrios y cuántos avisos hay en cada uno, y pedir cada barrio dice cuáles son.
- **El puente de ML no lee fichas de aviso** (`/product/<id>` sólo acepta productos de catálogo).
- **Las imágenes del CDN de Facebook vencen en días**: no se publican.
- Un negocio de Google "de área de servicio" (dirección `13000 Montevideo`, sin calle) publica una
  coordenada que no es un local: no recibe barrio.

Reglas (precisión antes que cobertura):

1. Entra lo que SE LLAMA armado/armador de muebles (`isAssemblyTitle`, `isAssemblyBusinessName`). Un
   mueble a la venta "armado gratis", herramientas, galpones o casitas de jardín no.
2. El precio de la tarjeta de un aviso es «precio del aviso»: no se atribuye a ningún mueble y no
   entra en la referencia. Menos de $ 150 es simbólico: «a consultar».
3. La lista de precios de una descripción se toma sólo de un segmento con UN mueble y UN monto (o un
   rango "de $ 800 a $ 1.500", "$ 800 - $ 1.200", "entre $ 900 y $ 1.500"); dos montos sueltos se
   abstienen, y una cuota no es una tarifa. **La etiqueta es lo que el aviso escribe ANTES del monto**,
   sin correos, @usuarios, enlaces ni números largos: lo de después ("consultas al 099…", "tel …
   Juan") es justo el contacto que no se publica. Los títulos de los avisos pasan por el mismo filtro.
4. Una fuente que no corrió conserva sus filas; un aviso que no se vio en 14 días sale, un negocio de
   Google a los 30. La guarda de corrida flaca juzga sólo las fuentes que CORRIERON (una que trae
   menos de la mitad de sus filas guardadas, si tenía ≥ 20, no escribe y sale con 1): contar los avisos
   que vencen de una fuente caída congelaba el snapshot para siempre. `sourcesAt` guarda la última
   lectura buena de cada fuente y la página la muestra.
5. Google se une a su prestador relevado por place id, por el nombre entero (sin espacios, o la parte
   antes del guion de la ficha) o porque la ficha lleva todas las palabras propias del prestador (de 3
   letras o más; una sola alcanza si es larga y no es común como "express"). Un nombre genérico nunca
   une. Lo que Google le dio (place id, puntuación, base) se conserva los seis días de la semana en
   que Google no se lee, hasta 30 días desde esa lectura.
6. Contactos: sólo los que el prestador (o la tienda que lo recomienda, con URL) publica. El teléfono
   de una ficha de Google se pide EN VIVO al tocar «Ver teléfono»
   (`/api/armadores/contacto/<placeId>`, `no-store`, sólo place ids del snapshot, 10 por IP por
   minuto) y no se guarda. Nada de Facebook ni de ML más allá del enlace al aviso.

`--dry-run` corre todo sin escribir (funciona sin `APP_MONGO_URI`); `--json=<archivo>` guarda el
snapshot para mirar la página en dev; `--google` fuerza la lectura de Google.

## Zonas

Cinco zonas sobre los 62 barrios INE más el área metropolitana (`classes/armadores/zones.ts`, espejo
en `app/utils/armadores.ts`, `app/tests/unit/armadoresZonesParity.test.ts`). Agrupación editorial, no
oficial. Filtrar una zona (o un barrio) muestra primero quien tiene la base ahí o la nombra; con un
barrio elegido, en otro grupo quien sólo está en la misma zona (no se le atribuye un barrio que no
nombró); y aparte quien dice cubrir todo Montevideo. Un aviso sin zona sólo aparece sin filtro. Un
nombre genérico ("Centro", "Unión", "Retiro") cuenta como barrio sólo detrás de "en", "zona" o
"barrio": un armador lista "mesas de centro" y "retiro de muebles".

## La página

- **Mapa-selector** (`components/armadores/ZoneMap.vue`): los 62 barrios pintados por cuántos
  prestadores tienen la base o lo nombran, con la rampa compartida de mapas y su leyenda en números;
  tocar un barrio filtra. El lienzo queda claro en los dos temas (la rampa está calibrada contra un
  fondo claro). Los trazos salen de `app/utils/armadoresMapData.ts`, generado por
  `node app/scripts/build-armadores-map.mjs` (`--check` para comparar) desde el INE.
- **Escalera de precios** (`PriceLadder.vue`): por mueble, mínimo–mediana–máximo del precio más bajo
  que publica cada prestador, sólo pesos, con al menos tres prestadores. Dos tiendas con la MISMA
  tarifa de referencia (Divino y El Emporio) cuentan una vez.
- **Filas** (`ProviderRow.vue`): mismo esqueleto que las de mudanzas. Estado en la URL (`zona`,
  `barrio`, `mueble`, `fuente`, `precio=1`, `q`, `orden`).

## Actualizar el relevamiento

1. Editar `docs/research/armadores/editorial.json` (y `notes.md`): cada precio con `sourceUrl`, cada
   fuente con `consultedAt`.
2. `node scripts/oneoff/build_armadores_editorial.mjs` copia al dato del job, saca lo que no es un
   servicio contratable (tiendas que arman gratis sólo lo suyo y no publican tarifa) y resuelve el
   place id de Google por el `googleName` exacto.
3. `npx vitest run tests/armadores` y desplegar: el job lo toma en la próxima corrida.

## Pendiente

- Sumarlo al hub `/directorios-uruguay` (tiene su propio contrato de cifras y tests de paridad).
- Nombres de departamento que también son calles de Montevideo ("Rivera", "Artigas", "Maldonado")
  pueden aparecer en «Dice cubrir» como lugares de afuera; es sólo texto, no mueve zonas.
- Las localidades metropolitanas de San José (Ciudad del Plata, Delta del Tigre) se rotulan
  Canelones en la base que viene de Google.
- El payload del servidor lleva el snapshot entero (~200 KB, sobre todo `conditions` de las tablas).
- Leer más hondo Marketplace con bandas de precio si la cola de avisos crece.
