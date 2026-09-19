# Luz, agua y reclamos por barrio

Capas de `/barrios-alquileres-uruguay`, del análisis por zona de `/analisis-alquileres-uruguay`, del
filtro «Datos del barrio» de `/alquileres-uruguay` y del panel del barrio en cada ficha. Todo se calcula
en jobs y se guarda; una visita sólo lee. Diseño: `docs/superpowers/specs/2026-09-19-servicios-por-barrio-design.md`.

## Fuentes (medidas el 2026-09-19)

| Capa | Fuente | Geografía | Historia |
|---|---|---|---|
| Luz | UTE, API del mapa UTEi (`apps2.ute.com.uy/SioServEcse/api/Ecse/ObtenerAfectacionesUrbanas`) | 63 barrios de Montevideo + 81 localidades | **ninguna**: foto cada 10 min, la guardamos nosotros |
| Agua | OSE, `ose.com.uy/interrupciones/programados` | departamento + localidad; el barrio sólo si el texto lo nombra | archivo de 11.363 avisos (Montevideo desde 2019) |
| Reclamos | Intendencia de Montevideo, Sistema Único de Reclamos (CKAN, ZIP mensual) | punto → barrio INE | desde 2010 |

Descartadas: URSEA publica FMIK/TTIK sólo en 42 agrupamientos y en gráficos PDF; los reclamos
operativos de OSE (falta de agua, baja presión) son por departamento. Wayback tiene 4 capturas de la
API de UTE: no hay historia que recuperar.

**Los 63 barrios de UTE son los 62 del INE** (IoU ≥ 0,95 en 58; Cerro 0,85) más PUERTO, que UTE separa
de Ciudad Vieja: CIUDAD VIEJA + PUERTO = INE 1. Por eso los clientes de UTE sirven de denominador
vigente para la misma geografía. La tabla se fija con `scripts/oneoff/build_ute_zones.py`
(`classes/utilities/power/ute_zones.json`, con el IoU de cada barrio, el polígono ADT de cada localidad
y su departamento; Florencio Sánchez va a Colonia a mano porque el punto de ECSE cae en Soriano).

## Luz — `currency-power-outages` (cada 10 min, minuto 3)

`classes/utilities/power/`. ECSE contesta `Accept: application/json` con el JSON **codificado dos
veces** (un string que contiene el array): `decodeEcseBody` lo desenvuelve. Se valida la carga entera
(63 barrios, ≥ 60 localidades, 19 departamentos); si cambió la forma, no se escribe nada. Si la
`FECHA` de UTE no avanzó, se saltea.

Libro `poweroutagedays` (APP DB): un documento por zona y día de Montevideo con `coveredMinutes`,
`unplannedCustomerMinutes`, `plannedCustomerMinutes`, `newIncidents`, `customers`. Integración por
trapecio entre fotos; un hueco de más de 20 min acredita sólo 10 min con los valores actuales (un
poller caído nunca fabrica horas sin luz). `newIncidents` suma las subas de incidencias abiertas:
es un mínimo de cortes nuevos. El estado va en `poweroutagestate` y se escribe **antes** que los
incrementos: un corte entre las dos escrituras pierde un intervalo, nunca lo cuenta dos veces. Poda a
400 días.

Métrica (ventana 90 días): minutos sin luz por cliente cada 30 días (imprevistos) y cortes nuevos por
mes cada 1.000 clientes. Se publica con ≥ 14 días observados y ≥ 85 % de cobertura; antes la capa dice
«midiendo desde…» y el filtro de luz queda deshabilitado.

## Agua — `currency-water-interruptions` (diario 08:29 UTC)

`classes/utilities/water/`. 30 páginas por corrida, 1 s entre páginas; `--backfill` recorre el
archivo entero (~20 min). Un aviso sin «Desde» (emergencias, ~22 %) toma la publicación como inicio
(`startEstimated`). Colección `waterinterruptions`.

El barrio se deriva **al leer**, no se guarda: `ineCodesInText` (`match.ts`) sólo acepta menciones
explícitas de una tabla revisada a mano, palabra completa, la más larga primero ("Malvín Norte" no es
también "Malvín"), y corta cada cláusula donde empiezan las calles ("calles", "entre", "Av.",
"Cno."…), salvo "Barrio X" explícito. "Colón" solo abarca dos barrios INE y no se asigna. Medido: 70 %
de los avisos de Montevideo nombran un barrio (61 % en los últimos 24 meses); la página publica
cuántos no. Ventana 24 meses, tope 72 h por aviso. Son cortes **programados**: OSE no archiva roturas.

## Reclamos — dentro de `currency-property-zones`

`classes/utilities/claims/`. Se relee la ficha CKAN; si `last_modified` no cambió se reutiliza
`propertyzonesnapshots/claims-cache`. Si cambió: ZIP de 44 MB a un temporal, lector ZIP propio sobre
`zlib` (sin dependencias), CSV de 300 MB en streaming. Medido: 1,7 M filas en 26 s. Familias:
alumbrado, saneamiento (área Saneamiento), limpieza (problema de limpieza + estado de contenedores),
calles (viales). Últimos 12 meses completos. Tasa por 1.000 clientes de UTE del mismo barrio. Son
reclamos registrados, no problemas: la página lo dice.

## Barrio de cada vivienda — `officialZone`

`classes/propertyzones/assign.ts`. Coordenada propia dentro de un único polígono (INE en Montevideo,
ADT de UTE en el interior), salvo que ≥ 5 propiedades compartan el punto (centroide); si no, nombre
oficial exacto (INE, rótulos de UTE, localidades) del mismo departamento; si no, **alias medido**:
nombre publicado con ≥ 10 viviendas geolocalizadas y ≥ 85 % en un mismo barrio. Primera corrida real:
48.365 de 59.623 viviendas (81 %): 12.294 por coordenada, 32.566 por nombre, 3.505 por alias; 24
alias (Puerto Buceo → Buceo 86 %, Playa Brava → Punta del Este 100 %…). "Parque Batlle", "Prado" y
"Pocitos Nuevo" reparten sus coordenadas entre barrios INE y quedan sin alias: sin coordenada, no
entran al filtro.

El job escribe `officialZone` en `rentallistings` con `$set` sólo donde cambió (el store de alquileres
usa `$set`, así que el campo sobrevive). `currency-property-zones-hourly` (`--assign-only`, minuto 57)
asigna lo que llegó en la hora y cede ante la corrida diaria. Índice `{ 'officialZone.zone': 1, lastSeen: -1 }`.

## Niveles, filtro e impacto

Terciles por atributo entre las zonas con dato (`low` = el tercio con menos problemas). El filtro
`servicios=luz,agua,alumbrado,saneamiento,limpieza` exige `low` en cada marcado; el servidor lo
traduce a `officialZone.zone ∈ …`. Si la capa pedida no se puede evaluar, responde **sin resultados**
en vez de ignorar el filtro. La ficha y las alertas no lo aplican. Sin filtro de denuncias.

Impacto (`classes/propertyzones/impact.ts`, documento `impact`): zonas con ≥ 15 apartamentos con
superficie construida explícita (los mismos representantes que el motor de mercado); y = log de la
mediana del alquiler por m². Por atributo con ≥ 20 zonas: ρ de Spearman con IC bootstrap 95 %
(semilla fija), efecto del cuartil 25 al 75 y veredicto; modelo conjunto con IC HC1. Primera lectura
(31 zonas, 2026-09-19): limpieza ρ −0,42 [−0,70; −0,09], −7,9 %; denuncias por 1.000 clientes ρ −0,46,
−8,9 %; saneamiento ρ −0,36 (IC cruza 0); alumbrado y calles sin diferencia. Son asociaciones: todo se
mueve con el nivel del barrio.

## Vigencia

Luz vence a los 2 días sin datos nuevos (7 con aviso), agua a los 7 (21), reclamos a los 75 días desde el
fin del período (120). Cada capa cae sola y conserva su fecha. Comandos: `npm run sync_power_outages`,
`npm run sync_water_interruptions [-- --backfill]`, `npm run sync_property_zones [-- --dry-run | --assign-only]`.
