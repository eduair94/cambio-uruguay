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
mes cada 1.000 clientes. Con ≥ 3 días observados y ≥ 85 % de cobertura la capa se publica como
**`preliminary`** (2026-09-21, a pedido del usuario: "incluir la frecuencia de cortes en los filtros"):
entra a `levels.values.luz`, al filtro y a las tarjetas, siempre con la etiqueta "provisorio · N días
medidos" (`POWER_PRELIMINARY_DAYS`, espejado en `RENTAL_POWER_PRELIMINARY_DAYS`). Con ≥ 14 días pasa a
`ready` y la etiqueta desaparece. Antes de los 3 días la capa dice «midiendo desde…» y el filtro de luz
queda deshabilitado. Una capa provisoria envejece igual que una definitiva: 2 días sin datos nuevos la
vuelven `stale`, 7 la sacan.

### Lo que se buscó afuera antes de publicar provisorio (2026-09-21)

Nadie publica frecuencia de cortes por barrio; por eso la provisoria sale de nuestro libro y no de una
fuente externa:

- **URSEA, Informe de Calidad 2016-2025** (`gub.uy/unidad-reguladora-servicios-energia-agua/…/2026-07/Informe de Calidad 2016-2025.pdf`,
  60 páginas): los consumidores de baja tensión se agrupan en **42 agrupamientos por distrito de UTE
  × densidad** (ADT1 urbano alta densidad, ADT3 urbano baja densidad, ADT4/5 rural); **Montevideo son
  dos agrupamientos**, no 62 barrios. Los valores por agrupamiento están sólo en gráficos (figuras 1-10,
  país y urbano/rural); el texto sólo trae las **metas** por tipo (Tabla 1: urbano alta densidad BT
  Tca 3,6 h y Fca 1,8 por semestre; media densidad 9,9 h / 4,5; baja densidad 18 h / 8; rural 36 h /
  14) y los incumplimientos narrados (2018-II: ADT1 y ADT3 de Montevideo incumplieron Tca por el
  incendio de la estación Montevideo G). La meta urbana densa, 3,6 h por semestre, equivale a **≈ 36
  min por mes**: es la referencia que el filtro imprime al lado del tope de luz
  (`URSEA_URBAN_DENSE_MINUTES_PER_MONTH`). Ojo con la comparación: Tca cuenta todas las
  interrupciones ≥ 3 min salvo fuerza mayor; nuestra cifra es sólo imprevistos.
- **RCSDEE** (reglamento compilado 2013, Anexo II): confirma que los agrupamientos T3 son por distrito
  administrativo de UTE y ADT; no hay geografía menor.
- **UTE**: la "consulta geográfica por barrios de Montevideo" del mapa del sitio es el mismo mapa ECSE
  en vivo que ya leemos, sin historia. Cifras nacionales publicadas: 2006 FC 7 cortes / TC 10 h por
  cliente y año; 2017 FC ≈ 7 / TC 12 h; 2018 (proyección) FC 4 / TC 8 h; el interior rural tiene un TC
  5× y una FC 3× la urbana (`portal.ute.com.uy/noticias/los-cortes-de-luz-mitos-y-realidades`, 2018).
  El Observador (2022-09, datos de UTE): 2021 4,9 cortes y 7,6 h por cliente; ene-ago 2022 3,5 cortes y
  6 h; metas 2022 5,5 cortes y 9,8 h.
- **Catálogo Nacional de Datos Abiertos**: ningún dataset de UTE sobre interrupciones o calidad
  (`package_search` por "UTE", "interrupciones", "calidad servicio eléctrico").
- Pedido de informes parlamentario 11127 (2024): PDF escaneado, sin texto extraíble.

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
`servicios=` lleva una selección por atributo, en dos formas que conviven: `denuncias:120` exige
que el valor del barrio sea **como máximo** ese número (es lo que mueve el slider, 2026-09-21), y
el atributo a secas (`luz,agua`) sigue exigiendo `low`, que es lo que mandan los enlaces viejos y el
MCP (`neighborhoodQuality`). Varias selecciones se intersecan. El servidor lo traduce a
`officialZone.zone ∈ …` leyendo `levels.values` (los mismos valores de los que salen los terciles);
un snapshot sin `values` no puede evaluar un tope y **responde sin resultados**, igual que una capa
que no se puede usar, en vez de ignorar el filtro. La ficha y las alertas no lo aplican.

`GET /api/rentals/service-filters` publica por atributo `low`/`high` (bordes de los terciles) y
`values` (los 62 valores ordenados), para que el slider diga en vivo "deja X de 62 barrios" con la
misma cuenta que va a hacer el servidor. Parado en el máximo, el control no filtra y sale de la URL;
un enlace viejo con el atributo a secas aparece con el tope en el borde del tercio. El tope de luz
queda deshabilitado mientras el libro dice `collecting`, con "N de 14 días" (`RENTAL_POWER_MIN_DAYS`
espeja `POWER_MIN_DAYS`).

Impacto (`classes/propertyzones/impact.ts`, documento `impact`): zonas con ≥ 15 apartamentos con
superficie construida explícita (los mismos representantes que el motor de mercado); y = log de la
mediana del alquiler por m². Por atributo con ≥ 20 zonas: ρ de Spearman con IC bootstrap 95 %
(semilla fija), efecto del cuartil 25 al 75 y veredicto; modelo conjunto con IC HC1. Primera lectura
(31 zonas, 2026-09-19): limpieza ρ −0,42 [−0,70; −0,09], −7,9 %; denuncias por 1.000 clientes ρ −0,46,
−8,9 %; saneamiento ρ −0,36 (IC cruza 0); alumbrado y calles sin diferencia. Son asociaciones: todo se
mueve con el nivel del barrio.

## Denuncias, comercios y tarjetas (2026-09-19, segunda iteración)

A pedido del usuario las tarjetas de `/alquileres-uruguay` y `/oportunidades-inmobiliarias-uruguay`
muestran **"Frente a los demás barrios"** (`components/rentals/ZoneBars.vue`): una fila por dato con
una barra donde **llena siempre es mejor** (menos denuncias, cortes o reclamos; más comercios) y el
texto "mejor que X %": la parte de las demás zonas con dato que está peor. El valor exacto, su unidad
y su período van en el `title` y en texto para lectores de pantalla. **No hay puntaje combinado**:
cada fila conserva su fuente. Los datos vienen de `GET /api/rentals/zone-scores` (una vez por
página, sólo en el navegador, calculado desde la foto guardada; nunca desde los avisos).

- **Denuncias** = denuncias registradas del Ministerio del Interior (12 meses, con tentativas) cada
  1.000 clientes de UTE del mismo barrio INE. Es un denominador de suministros, no de habitantes, y
  la página lo dice; mide hechos registrados, no riesgo personal. Entra también al filtro
  «Datos del barrio» (tercio con menos), decisión del usuario del 2026-09-19.
- **Comercios** = puntos de servicios cotidianos de OpenStreetMap (supermercados, almacenes,
  farmacias, salud, paradas, educación) por km² del polígono INE. Cobertura parcial de OSM.
- Una vivienda se ubica por su `officialZone`; una oportunidad, por su barrio publicado (nombre
  oficial exacto, localidad de UTE o alias medido). Sin vínculo, la tarjeta no muestra el bloque.

El filtro enumera el límite exacto de cada opción ("Hasta 102 cada 1.000 clientes en 12 meses",
"Hasta 2 en 24 meses") en vez de "pocos". El riel de filtros crece con la pantalla
(`clamp(304px, 20vw, 400px)`). Desde el 2026-09-21 las opciones son **sliders** (un máximo por
atributo, ver arriba) y cada fila de la tarjeta muestra **el valor medido con su unidad** ("96,9
cada 1.000 clientes · 12 meses") además de "mejor que X %": el porcentaje dice dónde queda el barrio
y el valor dice qué se midió, que es lo único que un lector puede contrastar con su experiencia. La
fila de luz, mientras el libro junta días, dice "N de 14 días".

**Por qué el bloque "desaparece" fuera de Montevideo.** Las series del ranking exigen ≥ 9 zonas con
dato y hoy sólo las tienen los 62 barrios INE (denuncias, reclamos, agua por barrio); una localidad
del interior (`ute:*`) no tiene filas y la tarjeta no muestra nada. `?departamento=montevideo` (la
clave en español, sin mayúscula ni tilde, que se escribe a mano) se ignoraba y listaba todo el país:
desde el 2026-09-21 `normalizeRentalQuery` acepta `departamento` y mapea cualquier grafía a los 19
nombres canónicos (`RENTAL_DEPARTMENTS`).

**Cobertura del libro de luz.** `buildPowerLayer` medía la cobertura sobre días calendario enteros,
así que el primer día (arrancó a las 14:00) y el día en curso contaban como 1.440 min cada uno: 53 %
con un poller que no había perdido una muestra. Ahora el primer día cuenta lo que cubrió, los
intermedios enteros y el último hasta `now`; un poller muerto ayer sigue mostrando el hueco.

## Vigencia

Luz vence a los 2 días sin datos nuevos (7 con aviso), agua a los 7 (21), reclamos a los 75 días desde el
fin del período (120). Cada capa cae sola y conserva su fecha. Comandos: `npm run sync_power_outages`,
`npm run sync_water_interruptions [-- --backfill]`, `npm run sync_property_zones [-- --dry-run | --assign-only]`.
