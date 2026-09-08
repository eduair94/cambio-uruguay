# Análisis de alquileres de Uruguay

Implementación del 2026-09-07. Página pública: `/analisis-alquileres-uruguay`.
Lee el catálogo actual de alquileres en APP DB; no cosecha portales, no modifica avisos,
no publica mensajes y no crea un trabajo programado. El frontend conserva su propio
paquete y no importa código del backend raíz.

## Ampliación del 2026-09-08

- `details` agrega media, mínimo/máximo y P10/P25/P50/P75/P90 de la misma selección;
  bandas de superficie, baños, cochera y tipo de vivienda; cobertura de campos y portales.
  Los desgloses mantienen todos los filtros, salvo dormitorios/departamentos/barrios del
  análisis original, cuyo ámbito independiente queda indicado en la interfaz y el CSV.
- `rentalAnalysisDetails.ts` concentra las medidas y el resumen puro. La dispersión
  precio/superficie está limitada a 80 puntos por base (`built`/`total`), elegidos a
  intervalos de la lista ordenada por área. No es una muestra aleatoria, no permite
  estimar densidades y no publica identificadores. Incluye alternativa tabular.
- La descarga CSV local contiene agregados, moneda, fecha y filtros por fila. No
  descarga el catálogo ni datos de anunciantes y neutraliza fórmulas en celdas de texto.
- El presupuesto suma adicionales ingresados por el usuario a la mediana **del total
  por aviso**. Proyecta 12 meses constantes, calcula la renta del hogar compatible con
  el porcentaje elegido y muestra el remanente; no pronostica reajustes ni requisitos.
  Valores inválidos ocultan los resultados correspondientes, sin sustituirlos por cero.
  Ingreso y gastos adicionales sólo viven en el navegador, sin almacenamiento.
- `ZoneComparison.vue` contrasta hasta tres barrios con las métricas de esta API y
  adjunta servicios/denuncias del snapshot público `/api/rentals/zones`. **No utiliza
  sus precios convertidos**. Sólo une nombres y departamentos iguales tras normalizar
  espacios, mayúsculas y tildes; nunca alias comerciales ni proximidad. La geometría
  es INE2011, los servicios OSM/Geofabrik y las denuncias MI/AECA. Cada capa muestra su
  fecha y estado propios; un fallo contextual no retira el mercado. Los conteos de
  delitos no se normalizan por población ni generan clasificación de seguridad.
  Ver [PROPERTY_ZONES.md](./PROPERTY_ZONES.md) para fuentes, ventanas y cobertura.
- El estimador publica todas las observaciones seleccionadas (máximo 30), con seis
  visibles inicialmente. Expone `diagnostics` como conteos de viviendas de cada etapa,
  incluido `identifiedAdvertiserCount` (viviendas con anunciante identificable, **no**
  cantidad de anunciantes), y el portal elegido. `askingPosition` muestra cantidades
  por debajo/igual/encima y percentil de rango medio con empates; sólo se entrega con
  muestra respaldada y precio ingresado. Ninguna etapa selecciona por precio.

No se agregaron trabajos, nuevas cosechas, conversiones, series históricas inferidas
ni nuevas escrituras de base. El endpoint conserva su lectura normalizada acotada y
su caché existente; el contexto usa dos snapshots precalculados independientes.

Validación local de esta ampliación: 6.466 pruebas unitarias aprobadas (44 omitidas
por sus condiciones de entorno) y los siete recorridos E2E de la página verificados.
Incluyen descarga CSV, moneda/superficie, presupuesto con entradas inválidas, coincidencia
territorial exacta, fallo independiente de contexto y catálogo vencido recuperable.
Revisión visual ES1440/390, EN320 oscuro y PT320 claro, sin desbordamiento horizontal.
En esta máquina el precalentado inicial del servidor de desarrollo puede exceder el
chequeo de Playwright: si ya se inició manualmente, la configuración local de validación
omite `webServer` para impedir un segundo Nuxt que sobrescriba `.nuxt`.

## Qué se mide

El tablero describe **precios pedidos de anuncios residenciales observados**. Permite
comparar departamentos, barrios del departamento seleccionado, dormitorios, superficie
publicada y gastos comunes. La selección inicial de la interfaz es un apartamento de un
dormitorio en Montevideo, en UYU; la API admite el universo nacional sin esos filtros.

La mediana y P25–P75 describen la muestra. Los cuartiles usan interpolación lineal en
la posición `(n - 1) × p`. El rango contiene los precios centrales de la muestra; no es
un intervalo de confianza. Cada cifra publica su cantidad de observaciones, incluidos
los subconjuntos con gastos comunes o superficie utilizable.

- Se separa la moneda **publicada** UYU/USD. No hay conversión de precios ni de GC.
- El gasto común desconocido queda `null`. Un cero estructurado del portal necesita
  una declaración expresa del propio anuncio. Las contradicciones entre texto y campo
  estructurado invalidan el gasto común, sin inventar un importe corregido.
- Alquiler más GC se calcula exclusivamente con ambos datos del mismo aviso y en la
  misma moneda. Un cero expreso conserva su valor aunque el portal lo etiquete en otra
  moneda. `expensesCoveragePct` muestra qué proporción permite calcular el total.
- Los precios por m² de superficie construida (`built`) y total (`total`) se calculan
  por separado. Si un aviso publica ambas, aporta su campo propio a cada métrica y el
  estimador utiliza exactamente la clase ingresada, sin perder la total porque también
  exista construida. Se aceptan superficies etiquetadas de 20 a 450 m². Las casas requieren
  superficie construida: un terreno o unos m² sin etiqueta no se reinterpretan.
- El histograma usa diez tramos iguales entre mínimo y máximo, salvo una muestra de
  precio único. El último tramo incluye el máximo; cada anuncio cuenta una sola vez.
- Las tablas por departamento mantienen tipo, moneda y dormitorios. Las de barrio
  mantienen además departamento, pero permiten comparar con otros barrios aunque se
  seleccione uno. El desglose por dormitorios mantiene ubicación, tipo y moneda y
  retira únicamente el filtro de dormitorios para ofrecer esa comparación.

## Universo, vigencia y privacidad

`server/utils/rentalAnalysis.ts` lee `rentallistings` y `rentalmetas` con el conector
Mongo del frontend. Requiere `offers.identity.version: 1` para usar los atributos propios
de cada aviso; no completa huecos con dormitorio, zona o superficie de la propiedad
agrupada. El texto propio pasa por `rentalEligibility`: excluye usos no residenciales,
temporada, precios o unidades ambiguas y otras condiciones incompatibles con un alquiler
habitacional; los avisos en USD necesitan evidencia propia del período mensual/anual.

La ventana es la misma del directorio: `RENTAL_STALE_DAYS = 10`, por día de calendario
UTC. Se rechazan fechas inválidas y futuras. `lastSeen` significa última observación del
aviso, no fecha de publicación, renovación del contrato ni confirmación de disponibilidad.
El metadato `generatedAt` debe pertenecer también a esta ventana: un catálogo vencido
responde 503 aunque la consulta de avisos recientes devuelva cero. Ese estado no se
presenta como ausencia de alquileres en la zona. El día límite UTC sigue siendo admisible.
En cada consulta se aplica el índice comunitario `hide_any`: una señal activa basta para
retirar ese aviso de la muestra, aunque los datos de catálogo estén en caché.

Para cada selección estadística se usa una oferta propia por propiedad y moneda,
priorizando su observación más reciente y luego el ID de anuncio como desempate
determinista. Se deduplica también el ID de anuncio. Los grupos existentes conservan
sus limitaciones: **puede persistir una vivienda repetida en grupos separados**. No se
reconstruye identidad ni se fusionan direcciones, nombres o fotografías para esta página.

La proyección Mongo enumera campos necesarios. No lee teléfonos, correos, contactos,
direcciones, coordenadas ni galerías. La evidencia textual y la identidad original se
descartan después de normalizar; la caché sólo guarda campos de comparación y una clave
nativa de agencia usada internamente. Los comparables públicos tienen una segunda
proyección explícita que elimina esa clave y el ID interno de anuncio.

`coverage.catalogueProperties` es la cantidad de documentos recientes leídos, no una
estimación del parque inmobiliario. `eligibleProperties` cuenta grupos con al menos un
aviso propio elegible y sin reporte activo al consultar, antes de los filtros del usuario.
La diferencia se publica como `excludedProperties`; no representa propiedades alquiladas.

## Estimación por comparables

La persona ingresa departamento, barrio, tipo, dormitorios, baños, superficie y su clase,
moneda y, opcionalmente, cantidad explícita de plazas de garaje y precio pedido.
Los campos desconocidos obligatorios no reciben un valor por defecto en el servidor.
El precio pedido opcional se compara después de formar la muestra; nunca la selecciona.

Se requieren coincidencias exactas de departamento, barrio, tipo, dormitorios, baños,
moneda y clase de superficie. La superficie admite ±15 %. Si la persona especifica
garaje, debe coincidir con un conteo publicado por el aviso; desconocido no equivale a
cero. Si omite garaje, éste no filtra. No se imputan ajustes monetarios por atributos.

La cohorte tiene **al menos 8 anuncios y 4 anunciantes**, máximo 3 anuncios por
anunciante y 30 en total. La identidad de agencia se valida con `safeAgency`: identificador
nativo del portal, perfil propio y evidencia reciente, nunca su nombre. La clasificación
de particular no demuestra que sea un anunciante independiente.

Los identificadores de agencias de dos portales no prueban independencia entre ellos.
Por ello el motor forma cohortes por portal y utiliza una sola: primero una que cumpla
los mínimos, luego la de más comparables y anunciantes. No junta dos IDs de distintos
portales como dos agencias. Dentro de la cohorte prioriza cercanía de superficie, lectura
más reciente e ID determinista, aplicando los límites por anunciante. La selección se
hace antes de calcular los precios.

Si faltan comparables/anunciantes, la respuesta tiene estado `insufficient` y no entrega
una mediana como estimación. Si `(P75 - P25) / mediana > 0,5`, responde `dispersed` y
también se abstiene. Estos umbrales son decisiones conservadoras del producto, no una
precisión validada profesionalmente. Hasta 30 anuncios de la muestra se publican con
enlace propio para revisar la evidencia.

El resultado `supported` entrega mediana y cuartiles del alquiler pedido. Sólo muestra
una referencia mensual con GC si el subconjunto de GC conocidos conserva **8 anuncios
y 4 anunciantes**. `comparisonToAskingPct` positivo significa que el precio ingresado
supera la mediana; negativo significa que queda por debajo.

## Contrato HTTP

Tipos y funciones puras: `app/utils/rentalAnalysis.ts`.

### `GET /api/rentals/analysis`

Parámetros: `currency=UYU|USD`, `department`, `neighborhood`,
`type=all|apartamento|casa`, `bedrooms=0..10` (vacío = todos). Un barrio requiere
departamento. Valores inválidos se normalizan a los filtros amplios correspondientes.

Respuesta `RentalAnalysisResponse`:

- `methodologyVersion: 1`, `generatedAt` (metadato del catálogo), `analyzedAt`, `query`.
- `summary`: cantidad, medidas `rent`, `expenses`, `monthly`, cobertura de GC,
  `perM2.built`, `perM2.total`, fechas de observación mínima/máxima.
- `departments`, `neighborhoods`: las mismas medidas y `name` por zona.
- `bedrooms`: las mismas medidas por cantidad de dormitorios.
- `distribution`: tramos `{ min, max, count }`.
- `facets`: listas de departamentos y barrios presentes para la moneda seleccionada.
- `coverage`: universo reciente, universo elegible, excluidos y ventana de vigencia.

Cada medida es `{ count, median, p25, p75 }` o `null` si no hay observaciones.
Una consulta sin resultados responde 200 con cantidades cero, no precios simulados.

### `POST /api/rentals/estimate`

El POST sólo calcula: no persiste el inmueble, el precio ingresado ni una suscripción.
Ejemplo de cuerpo —ilustrativo, no promesa de que esa zona alcance muestra—:

```json
{
  "department": "Montevideo",
  "neighborhood": "Cordón",
  "type": "apartamento",
  "bedrooms": 1,
  "bathrooms": 1,
  "area": 45,
  "areaBasis": "built",
  "parkingSpaces": null,
  "currency": "UYU",
  "askingPrice": null
}
```

Respuesta `RentalEstimateResponse`: `generatedAt`, `query`, `status`, `reason`,
`sampleCount`, `advertiserCount`, `range`, `monthly`, `expensesKnownCount`,
`comparisonToAskingPct`, `comparables`, `criteria`, `oldestLastSeen`, `newestLastSeen`.
`reason` puede ser `insufficient_comparables`, `insufficient_advertisers`,
`high_dispersion` o `null`. `criteria.advertiserIdentityScope` es `same_source`.

Cuerpo inválido: 400. Fuente no disponible, metadato vencido o universo fuera del presupuesto:
503. Ambos endpoints señalan específicamente el vencimiento en
`data: { code: 'RENTAL_ANALYSIS_STALE', generatedAt }`, conservando el metadato real para
que la interfaz pueda mostrar su fecha. Otros fallos siguen siendo genéricos.
El POST y los errores usan `Cache-Control: no-store`. El GET correcto usa
`public, max-age=30, s-maxage=60`.

## Presupuesto operativo

La caché normalizada tiene una sola entrada durante 60 segundos y comparte una carga
en curso entre consultas. No crece por combinación de filtros. La lectura tiene un
máximo de 100.000 documentos, más un centinela: si lo supera responde 503, evitando
publicar estadísticas truncadas silenciosamente. El límite contempla los 51.017 documentos
recientes observados en producción el 2026-09-07; no es un tamaño de muestra ni habilita
recortar el universo. Primero se valida la vigencia del metadato. Después, un cursor Mongo
entrega lotes de 500 documentos y se normaliza cada propiedad al recibirla, sin retener
simultáneamente dos catálogos completos, crudo y normalizado. El cursor se cierra en
`finally`, también ante exceso de presupuesto o fallo de lectura/proyección. Sólo una
lectura completa y cerrada se incorpora a la caché; los errores permiten reintentar.
La agregación admite 15 segundos y la lectura de metadatos 10 segundos. El servicio de
disponibilidad conserva sus propios límites y vuelve a consultarse antes de cada cálculo.

No hay colección nueva, scheduler en el API, scraping por visitante ni llamadas a IA.
Despliega con los cambios de `app/`; no requiere desplegar el backend raíz.

## Límites de interpretación

La muestra no es un censo ni un muestreo probabilístico. La composición por portales,
agencias y datos disponibles puede sesgar las referencias, y los precios siguen siendo
pedidos. El motor no observa negociaciones, contratos firmados o precios de cierre.
No mide demanda, visitas, consultas, absorción, vacancia, tiempo hasta alquilar ni
probabilidad de colocación. La fecha de importación no se convierte en antigüedad comercial.

No hay serie histórica ni variación mensual: el catálogo actual no permite fabricarlas.
Tampoco se promete un precio óptimo, una tasación, rentabilidad o plazo para encontrar
inquilino. Estado de conservación, orientación, piso, mobiliario y servicios del edificio
pueden explicar diferencias y no tienen ajustes automáticos. La comparación geográfica
usa las zonas publicadas, sin afirmar equivalencia entre barrios vecinos.

## Validación

```sh
cd app
npx vitest run tests/unit/rentalAnalysis.test.ts tests/unit/rentalAnalysisProjection.test.ts tests/unit/rentalAnalysisApi.test.ts tests/unit/rentalBudget.test.ts
npx eslint utils/rentalAnalysis.ts server/utils/rentalAnalysis.ts server/api/rentals/analysis.get.ts server/api/rentals/estimate.post.ts tests/unit/rentalAnalysis.test.ts tests/unit/rentalAnalysisProjection.test.ts tests/unit/rentalAnalysisApi.test.ts
```

Verificación del 2026-09-07: 84 pruebas focalizadas aprobadas, incluidas 71 nuevas y 13 de regresión de
gastos comunes. Cubren moneda, grupos y filtros, superficies compatibles, GC desconocidos
y explícitos, identidad por oferta, fechas inválidas/futuras, deduplicación, mínimos y
concentración por anunciante, dispersión, entradas inválidas y proyección de privacidad.
La regresión de superficies confirma que un aviso con 40 m² construidos y 48 m² totales
participa usando 48 m² cuando ésa es la clase solicitada, sin duplicar viviendas. Las pruebas
del loader y ambos endpoints verifican que un metadato del 20 de agosto no produce un
tablero vacío del 7 de septiembre, que responde 503 sin caché y que se recupera al actualizar
la fuente.

La conexión local de `app/.env` tiene metadato del 2026-08-20 y no dispone de avisos dentro
de la ventana actual; ese estado comprueba el aviso de catálogo vencido. Para validar datos
vigentes se ejecutaron las funciones nuevas mediante el acceso SSH ya configurado y el puente
`classes/appdb` de producción, en modo de lectura y sin exportar credenciales. Se desactivaron
la creación automática de colecciones e índices en ese proceso de comprobación. No se
modificaron registros, fechas ni conexiones guardadas y no se sembraron comparables.

La comprobación del catálogo de las 21:48:31 UTC del 2026-09-07 leyó 51.056 propiedades
recientes y obtuvo 22.386 elegibles después de aplicar las reglas completas. La selección
inicial de Montevideo reunió 7.889 apartamentos de un dormitorio en UYU. Las consultas de
45 m² construidos y un baño alcanzaron 30 comparables en Cordón, Centro y Pocitos, con
23, 21 y 21 anunciantes respectivamente. Todos los comparables de estas consultas procedían
de **InfoCasas**: la cobertura por fuente sigue siendo una limitación real. El resultado
identifica el portal utilizado y no presenta la muestra como un censo del mercado.

La lectura inicial demoró 9,78 s y la repetición con caché 233 ms; el proceso de comprobación
alcanzó 179,1 MiB de RSS máximo. Son mediciones de una ejecución, no una prueba de carga ni
un compromiso de latencia. La validación detallada y las referencias observadas están en
[`rental-analysis-production-validation-2026-09-07.md`](../research/rental-analysis-production-validation-2026-09-07.md).

Validación de integración: 122 pruebas unitarias aprobadas (análisis, proyección, API,
gastos, navegación, búsqueda y presentación) y 5 pruebas de navegador. Las de navegador
usan datos sintéticos exclusivamente dentro del test: filtros y enlaces conservan moneda
y dormitorios exactos, el presupuesto es local, los resultados previos se retiran al editar,
la falta de comparables y los errores tienen estados distintos y el catálogo vencido puede
recuperarse tras una actualización. Se verificaron ES/EN/PT y anchos de 320, 390 y 1440 px.
Tras corregir los requisitos de datos estructurados y filtros no indexables, la suite completa
de la aplicación aprobó **5.986 pruebas**, con 37 omitidas por su configuración existente
(353 archivos aprobados, 4 omitidos). No se ejecutó un despliegue; la comprobación de las
funciones contra producción no sustituye verificar las rutas públicas tras publicarlas.

La compilación completa también terminó correctamente con
`NODE_OPTIONS=--max-old-space-size=8192`, el mismo límite que utiliza
`app/scripts/deploy.sh`. El primer intento con el límite predeterminado de Node (4 GiB)
agotó memoria al empaquetar Nitro; no fue un fallo de las consultas ni del estimador.

La pasada final de navegador aprobó las cinco pruebas en 39,7 s usando
`E2E_BASE_URL=http://127.0.0.1:3311`, con el servidor ya preparado. En esta máquina,
`localhost` había dejado la página sin hidratar. Además se renderizaron las respuestas
públicas reales de la captura del 7 de septiembre en escritorio y a 390 px: se verificaron
las cifras, el portal de la muestra, el formulario y la ausencia de desbordamiento horizontal.
Esa captura sólo se interceptó en el navegador de comprobación; no alimenta las APIs ni
reemplaza el catálogo local vencido. Las imágenes quedan en `.artifacts/rental-analysis-production-*.png`.
