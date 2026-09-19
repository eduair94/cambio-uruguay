# Servicios por barrio: luz, agua y reclamos urbanos en el análisis de alquileres

Fecha: 2026-09-19. Estado: aprobado (orden permanente de auto-aprobación).

## Pedido

"Agregar a los directorios de propiedades, análisis de la frecuencia de cortes de luz, suministro
de agua potable y otros atributos relevantes a la hora de decidir alquilar en determinada zona.
Que sea de fácil visualización, incluir en el análisis por zona y ver si tiene impacto en el precio
final del alquiler. Investiga." + "Hacer que sea posible filtrar propiedades por dichos atributos."

## Lo que se midió antes de diseñar (2026-09-19)

| Fuente | Qué da | Geografía | Historia | Decisión |
|---|---|---|---|---|
| UTE ECSE (`apps2.ute.com.uy/SioServEcse/api/Ecse/ObtenerAfectacionesUrbanas`), la API del mapa UTEi | clientes totales, afectados imprevistos/programados, incidencias activas | 63 barrios de Montevideo + 81 localidades | **ninguna**: foto cada 10 min; Wayback tiene 4 capturas | libro propio cada 10 min |
| URSEA, informe de calidad 2016-2025 | FMIK/TTIK | 42 agrupamientos por departamento y densidad, en gráficos PDF | sí | no sirve por barrio |
| OSE, `ose.com.uy/interrupciones/programados` | avisos de corte programado con zona en texto libre, desde/hasta, motivo | departamento + localidad; el barrio sólo si el texto lo nombra | 11.363 avisos, Montevideo desde 2019 | cosecha diaria + backfill |
| OSE datos abiertos, reclamos operativos | falta de agua / baja presión | sólo departamento | 2019-2024 | fuera de alcance (no es por zona) |
| IM, Sistema Único de Reclamos (CKAN, mensual) | reclamos con lat/lon: alumbrado, saneamiento, limpieza, viales | punto → barrio INE | desde 2010, 1,7 M filas | agregado anual por barrio |

Mediciones que deciden el diseño:

- **Los 63 barrios de UTE son los 62 del INE** (IoU ≥ 0,95 en 58; Cerro 0,85) más PUERTO, que UTE separa
  de Ciudad Vieja. Unión CIUDAD VIEJA + PUERTO = INE 1. Los clientes de UTE por barrio son un
  denominador vigente y de la misma geografía.
- **El nombre de barrio que publica el portal no alcanza para ubicar el aviso.** "Parque Batlle" (674
  avisos), "Prado" (267), "Pocitos Nuevo" (523) y "Puerto Buceo" (142) no coinciden con ningún nombre
  INE; "La Blanqueada" de los portales cae en tres barrios INE distintos según sus propias
  coordenadas. El 29 % de las viviendas de Montevideo tiene coordenada propia (InfoCasas y El País);
  1.199 comparten la misma coordenada con ≥ 4 otras (centroides) y no cuentan como coordenada.
- **OSE**: el 75 % de los avisos de Montevideo nombra al menos un barrio; el resto sólo lista calles.
- **Primera lectura del impacto** (41 barrios con ≥ 15 apartamentos geolocalizados, alquiler por m²):
  reclamos de saneamiento y de limpieza por 1.000 clientes ρ ≈ −0,49; denuncias por 1.000 clientes
  ρ −0,47; alumbrado ρ −0,24 (IC cruza 0); cortes de agua programados ρ −0,1 (nada). Juntos en un
  modelo, ninguno se separa (R² 0,31): se mueven todos con el mismo eje de "nivel del barrio".

## Alcance

Dentro: Montevideo por barrio INE para las cinco capas; luz también para las 81 localidades de UTE
(interior). Directorio de alquileres. Fuera: ventas, reclamos de OSE por departamento, geocodificar
calles de los avisos de OSE, un puntaje combinado de "calidad del barrio".

## Diseño

### 1. Luz — `currency-power-outages` (nuevo, cada 10 min)

`sync_power_outages.ts` → `classes/utilities/power/`. Pide las dos rutas de ECSE (barrios+localidades
y departamentos), valida forma (63 barrios, ≥ 60 localidades, enteros no negativos, `FECHA` parseable)
y **si la `FECHA` de UTE no cambió desde la última muestra, no escribe** (UTE refresca cada 10 min).

Libro en APP DB `poweroutagedays`, un documento por zona y día de Montevideo (`_id: "<zona>|<día>"`):
`coveredMinutes`, `unplannedCustomerMinutes`, `plannedCustomerMinutes`, `newIncidents`,
`customers` (máximo del día), `samples`. El intervalo entre dos muestras se integra por trapecio
con Δt tope de 20 min: un hueco más largo no se inventa, queda como tiempo no observado.
`newIncidents` suma los aumentos de `INCIDENCIAS_EN_ZONA` entre muestras (cota inferior de cortes
nuevos). Estado anterior en `poweroutagestate`. Poda a 400 días.

Métricas (las calcula el job de zonas, ventana de 90 días): **minutos sin luz por cliente por mes**
(imprevistos) y **cortes nuevos por mes por cada 1.000 clientes**. Se publican cuando la ventana
tiene ≥ 14 días observados con ≥ 85 % de cobertura; antes la capa dice "midiendo desde <fecha>".

### 2. Agua — `currency-water-interruptions` (nuevo, diario 08:29 UTC)

`sync_water_interruptions.ts` → `classes/utilities/water/`. Lee el listado de OSE (primeras 30
páginas por corrida, 1 s entre páginas; `--backfill` recorre todo). Parser puro del HTML: id (slug),
departamento, localidad, publicado, zona (texto), desde/hasta (hora de Montevideo), motivo. Upsert
en APP DB `waterinterruptions`.

Barrio: sólo mención explícita de un nombre INE o de una parte de un nombre compuesto que pertenece a
un único barrio ("Parque Guaraní" → 17), palabra completa, nunca precedida por un prefijo de calle
("Cno. Carrasco" no es Carrasco). Un nombre que abarca dos barrios INE ("Colón") no se asigna.
Métricas por barrio, ventana 24 meses: avisos y horas programadas (tope 72 h por aviso). Se publica
también cuántos avisos del período no nombraron barrio.

### 3. Reclamos urbanos — dentro de `currency-property-zones`

Lee la ficha CKAN del SUR; si `last_modified` no cambió reutiliza el agregado guardado. Si cambió,
baja el ZIP (44 MB), lo descomprime en streaming (lector ZIP mínimo propio sobre `zlib`, sin
dependencias nuevas) y agrega los últimos 12 meses completos por barrio INE: **alumbrado**,
**saneamiento** (área Saneamiento), **limpieza** (problema de limpieza + estado de contenedores),
**calles** (viales). Tasa por 1.000 clientes de UTE del mismo barrio. Son reclamos registrados, no
problemas ocurridos, y la página lo dice.

### 4. Barrio de cada vivienda — `officialZone`

`classes/propertyzones/assign.ts`, puro. Orden de evidencia:

1. **Coordenada propia** (numérica, no compartida por ≥ 5 propiedades del catálogo) dentro de un único
   polígono: INE si el departamento es Montevideo; zona urbana de UTE (ADT) si no.
2. **Nombre**: igualdad exacta normalizada con un nombre INE / localidad UTE del mismo departamento, o
   un **alias medido** en la misma corrida: nombre publicado con ≥ 10 viviendas geolocalizadas de las
   cuales ≥ 85 % caen en un único barrio.
3. Si no, `null`: la vivienda no entra en ningún filtro de barrio.

El job de zonas escribe `officialZone: { key, name, department, evidence }` con `$set` sólo donde
cambió (el store de alquileres usa `$set`, así que el campo sobrevive). Una corrida horaria nueva,
`currency-property-zones-hourly` (`--assign-only`, minuto 57), completa las viviendas que llegaron
en la hora. Índice `{ 'officialZone.key': 1, lastSeen: -1 }`.

### 5. Niveles y filtro

El job guarda por atributo y zona: valor, n y nivel (`low`/`mid`/`high`, terciles sobre las zonas con
dato de ese atributo). Filtro del directorio `servicios=luz,agua,alumbrado,saneamiento,limpieza`:
cada marcado exige que el barrio de la vivienda esté en el **tercio con menos** problemas de ese
atributo (AND entre marcados). El servidor traduce a `officialZone.key ∈ claves`, y si no puede leer
la foto de zonas responde sin resultados en vez de ignorar el filtro. Sin filtro de denuncias: la
página ya decidió no hacer puntaje de seguridad.

### 6. ¿Se paga en el alquiler? — análisis guardado

En el mismo job (diario, nunca por pedido): unidad = zona con ≥ 15 apartamentos con superficie
construida explícita (observaciones del motor de mercado existente, ubicadas por `officialZone`);
y = log de la mediana del alquiler por m² en UYU. Por atributo con ≥ 20 zonas: ρ de Spearman con IC
bootstrap 95 % (semilla fija), pendiente en unidades naturales y veredicto (`lower`, `higher`,
`inconclusive` si el IC cruza 0). Modelo conjunto con todos los atributos estandarizados (IC
HC1, R²). Guardado como documento `impact` en `propertyzonesnapshots` con los puntos del gráfico.

### 7. Frontend

- `/barrios-alquileres-uruguay` y el explorador: capas nuevas **Luz**, **Agua**, **Reclamos** (con
  sub-selector alumbrado/saneamiento/limpieza/calles) en el mismo mapa coroplético; detalle por barrio
  con valor, nivel, período y fuente.
- Componente **¿Se paga en el alquiler?**: dispersión por atributo (barrios, alquiler/m² vs atributo,
  recta), frase en llano y tabla resumen. En `/barrios-alquileres-uruguay` y en el análisis por zona
  de `/analisis-alquileres-uruguay`.
- `/alquileres-uruguay`: grupo de filtros "Datos del barrio" y panel del barrio en la ficha.

## Errores y vigencia

Cada capa conserva su fecha y cae sola: luz vence a los 2 días sin muestras, agua a los 7 días sin
cosecha, reclamos a los 120 días desde el último mes cubierto. Una fuente caída no borra las otras ni
el filtro de las otras. Un job que falla sale con 1 y no pisa lo último bueno.

## Pruebas

Unitarias (root `tests/`): parser de ECSE e integración del libro (trapecio, hueco, FECHA repetida,
aumentos de incidencias), parser y matcher de OSE con los textos reales medidos, lector ZIP y
agregado del SUR, asignación (coordenada, compartida, alias medido, nombre, null), niveles, impacto
(determinismo, veredicto). App (`app/tests/unit`): proyección de las capas nuevas, filtro
`servicios` en `buildRentalFilter` (sin claves → sin resultados), paridad de las claves de filtro.
