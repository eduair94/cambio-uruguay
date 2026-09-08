# Análisis de alquileres: validación de cobertura real

Lecturas del 7 de septiembre de 2026, entre las 21:42 y 21:52 UTC. Se consultó el
catálogo público y la APP DB de producción en modo de lectura. No se modificaron
conexiones, registros, fechas, archivos remotos ni despliegues.

## Catálogo público

Las respuestas de [Uruguay](https://cambio-uruguay.com/api/rentals?perPage=1) y
[Montevideo](https://cambio-uruguay.com/api/rentals?department=Montevideo&perPage=1)
fueron HTTP 200, con `generatedAt: 2026-09-07T20:48:30.161Z`.

| Dato | Valor observado |
|---|---:|
| Propiedades guardadas según el metadato | 53.593 |
| Propiedades vigentes del directorio, todos los tipos | 51.017 |
| Propiedades vigentes del directorio en Montevideo, todos los tipos | 35.613 |
| Apartamentos vigentes, Uruguay | 31.034 |
| Casas vigentes, Uruguay | 8.447 |
| Apartamentos vigentes, Montevideo | 23.763 |
| Casas vigentes, Montevideo | 3.112 |

Estos conteos no son el universo final del análisis: el directorio incluye avisos
sin la evidencia propia que requiere el nuevo estimador. Las ofertas públicas
no exponen `identity`; no se puede reconstruir esa evidencia desde sus atributos
canónicos. La comprobación de identidad se realizó por la conexión privada,
devolviendo únicamente agregados.

## Evidencia propia disponible

La fecha mínima del catálogo era `2026-08-28`, según la ventana de diez días.
La consulta exacta `lastSeen >= cutoff` de `rentallistings` encontró 51.017
propiedades: superaba el límite inicial de 40.000 del loader de análisis. Ese
límite hubiera rechazado la página completa en producción y debe corregirse
antes de desplegar. No debe resolverse publicando una muestra silenciosa.

Entre 51.018 ofertas vigentes había 47.336 con `identity.version: 1` y 3.682 sin
esa versión. La selección propia de casas y apartamentos produjo 36.576 ofertas
en 36.575 propiedades. Estos números son previos a `rentalEligibility`, a las
otras validaciones del proyector y a la deduplicación del estimador.

La validez del anunciante se evaluó ejecutando el código local de `safeAgency`
de `app/utils/propertyAdvertiser.ts` sobre campos explícitamente seleccionados,
incluyendo fuente, clave, URL de perfil y vigencia de la evidencia. Un vendedor
declarado particular no aporta una agencia. Para superficie se aplicaron los
límites de 20–450 m² y la misma exclusión por contradicción entre superficie
construida y total del proyector; la total sólo sirve para apartamentos.

| Departamento | Ofertas propias de viviendas | Agencia válida | Superficie propia utilizable | Ambas | Claves de agencia |
|---|---:|---:|---:|---:|---:|
| Montevideo | 25.476 | 7.440 | 7.391 | 6.942 | 548 |
| Maldonado | 6.216 | 2.618 | 1.650 | 1.519 | 146 |
| Canelones | 3.776 | 905 | 884 | 832 | 195 |
| Colonia | 525 | 168 | 89 | 89 | 12 |
| Paysandú | 161 | 37 | 20 | 18 | 4 |
| Rocha | 93 | 54 | 38 | 35 | 6 |

En todo el catálogo había 11.259 ofertas propias de viviendas con agencia válida,
10.102 con superficie utilizable y 9.461 con ambas. Las tres cifras correspondían
íntegramente a **InfoCasas** en esta captura. MercadoLibre, Facebook, Casasweb y
El País aportaban identidad de vivienda para el panorama, pero todavía no
superficie propia y agencia válida en los campos requeridos por el estimador.
Una cantidad elevada de agencias no demuestra diversidad de portales.

Se excluyeron 448 superficies contradictorias: 227 en Montevideo, 206 en
Maldonado, 12 en Canelones, 2 en Rocha y 1 en Paysandú.

## Cohortes candidatas en Montevideo

Antes de elegibilidad, tamaños comparables y deduplicación, las ofertas con
superficie propia y agencia válida incluían:

| Barrio / apartamento | Moneda | Ofertas | Claves de agencia |
|---|---|---:|---:|
| Cordón, 1 dormitorio | UYU | 400 | 123 |
| Centro, 1 dormitorio | UYU | 264 | 96 |
| Pocitos, 1 dormitorio | UYU | 262 | 134 |
| La Blanqueada, 1 dormitorio | UYU | 253 | 85 |
| Tres Cruces, 1 dormitorio | UYU | 253 | 110 |
| Pocitos, monoambiente | UYU | 195 | 99 |

Hay materia prima actual para evaluar el estimador en esos segmentos. Estos
conteos no certifican resultados del algoritmo ni cobertura en cada barrio,
tamaño o tipo de vivienda; tampoco son contratos cerrados o mediciones de demanda.

## Vía de lectura utilizada

El destino SSH está documentado en el repositorio y la conexión ya configurada
funcionó con autenticación no interactiva y verificación de host:

```powershell
ssh -o BatchMode=yes -o ConnectTimeout=10 -o StrictHostKeyChecking=yes -p 2223 root@104.234.204.107 "cd /root/cambio-uruguay && pwd"
```

Las consultas se enviaron por stdin a `node` dentro de ese directorio, usando
`require('./dist/classes/appdb').appConnection()` como puente a la APP DB.
Cada operación Mongo tenía `maxTimeMS` de 10–20 segundos; la lectura para la
validación de agencias estaba limitada a 100.001 ofertas y rechazaba excedentes.
La conexión se cerró en `finally`. No se imprimieron URI, credenciales, domicilios,
contactos ni objetos privados de identidad; sólo conteos agregados.

La conexión local desactualizada no se reemplazó ni se sembró con datos. La
validación de las funciones completas se realizó a continuación, una vez
corregido el límite del loader. No se realizó un despliegue.

## Funciones completas contra la APP DB actual

Entre las 21:51 y 21:52 UTC se ejecutaron las funciones locales nuevas
`loadRentalAnalysis` y `loadRentalEstimate` en dos procesos efímeros contra la
APP DB de producción. Se empaquetó el código local en memoria con esbuild y se
envió por stdin a Node; no se instaló ni guardó código remoto. Se conservó el
loader real de disponibilidad y sus consultas. El runtime fue Node 22.14.0 y
Mongoose 8.16.0, usando la dependencia de `app/` del servidor.

El puente `classes/appdb` proporcionó la conexión y `APP_MONGO_URI` se pasó a
`useRuntimeConfig` sólo dentro del proceso, sin imprimirlo o guardarlo. Se
desactivaron `autoCreate` y `autoIndex` antes de importar los modelos para evitar
escrituras implícitas de Mongoose. Ambas conexiones se cerraron al terminar.

El loader corregido recorrió las **51.056 propiedades** vigentes mediante cursor
de 500 filas, con un límite explícito de 100.000, y produjo **22.386 propiedades
elegibles** después de aplicar sus reglas. El metadato había avanzado a
`2026-09-07T21:48:31.102Z`: por eso el total difiere de la primera captura de
51.017. No había avisos excluidos por reportes activos de disponibilidad en
esta ejecución.

Consulta del panorama: Montevideo, apartamento, un dormitorio, UYU, sin barrio
seleccionado.

| Resultado real | Valor |
|---|---:|
| Viviendas analizadas | 7.889 |
| Mediana del alquiler | $27.500 |
| Rango central del alquiler, percentiles 25–75 | $24.800–$30.500 |
| Gastos comunes conocidos | 3.180 viviendas; 40,3 % |
| Mediana de gastos comunes en ese subconjunto | $4.300 |
| Mediana del total mensual donde se conocen los gastos | $32.085 |
| Superficie construida conocida | 2.350 viviendas |
| Mediana del alquiler por m² construido | $657,95 |
| Suma de frecuencias del histograma | 7.889 |

La mediana de alquiler más gastos se calcula vivienda por vivienda dentro del
subconjunto conocido; no se obtiene sumando las dos medianas de poblaciones
diferentes. La distribución y el resumen incluyeron el mismo número de viviendas.

El panorama reunió las cinco fuentes. Para la consulta seleccionada aportaron
3.808 ofertas normalizadas de MercadoLibre, 2.703 de InfoCasas, 976 de El País,
328 de Casasweb y 74 de Facebook; en esta captura sumaban las 7.889 viviendas
finales. La superficie y la identidad de agencia del estimador seguían siendo
evidencia de InfoCasas.

### Estimaciones reales de tres viviendas de referencia

Los tres sujetos fueron apartamentos con un dormitorio, un baño y **45 m²
construidos**, publicados en UYU, sin exigir cantidad de garajes. Se ingresaron
$30.000 como precio a comparar; no se utilizó ese valor para fijar la referencia.

| Barrio | Estado | Muestra | Identidades de agencia dentro del portal | Mediana | Percentiles 25–75 | Total mensual mediano conocido |
|---|---|---:|---:|---:|---|---:|
| Cordón | `supported` | 30 | 23 | $29.600 | $28.125–$30.800 | $33.000; 29 con gastos |
| Centro | `supported` | 30 | 21 | $27.000 | $26.000–$27.975 | $31.200; 26 con gastos |
| Pocitos | `supported` | 30 | 21 | $29.450 | $26.625–$33.350 | $34.000; 26 con gastos |

Las reglas efectivamente devueltas fueron ocho comparables mínimos, cuatro
identidades de anunciante dentro del mismo portal, ±15 % de superficie, hasta
tres ofertas por anunciante y treinta en la muestra. Las ofertas de la muestra
tenían última lectura del 7 de septiembre y los tres resultados tenían
`reason: null`. Cada respuesta pública mostraba doce comparables, todos con
claves de propiedad diferentes; las estadísticas se calcularon con los treinta
indicados. Los comparables visibles procedían de InfoCasas.

Estas son referencias de precios pedidos por viviendas comparables. El estado
`supported` confirma evidencia suficiente para esa comparación; no demuestra
el precio final de un contrato, el plazo para alquilar o un óptimo económico.

### Coste observado y privacidad

| Medición del proceso | Primera ejecución | Captura pública repetida |
|---|---:|---:|
| Primera carga del panorama | 9,78 s | 9,78 s |
| Repetición con catálogo en caché | 233 ms | 270 ms |
| RSS inicial | 66,0 MiB | 66,2 MiB |
| Pico RSS del proceso | 179,1 MiB | 169,2 MiB |
| Proceso completo con tres estimaciones | 10,38 s | 10,45 s |

Las tres estimaciones tardaron aproximadamente 100–123 ms cada una en la primera
ejecución. El pico RSS es `process.resourceUsage().maxRSS` del proceso efímero
completo, incluidas las dependencias y conexiones, y no una medición aislada del
loader. El tiempo tampoco incluye navegación HTTP o render de Nuxt. La caché
conservó exactamente el resumen y los conteos de cobertura entre lecturas.

Se verificaron recursivamente las respuestas públicas: no contenían claves de
identidad privada, `advertiserKey`, `advertId`, `uid`, evidencia privada, agencias
o contactos. Sólo las respuestas públicas completas quedaron en la captura
local ignorada `.artifacts/rental-analysis-production-public.json`, con fecha
`2026-09-07T21:52:36.333Z`; los agregados operativos quedaron en
`.artifacts/rental-analysis-production-metrics.json`. No se guardaron catálogos
privados. Esa captura sirve para verificar el render con datos reales fechados;
no es un flujo actualizado ni reemplaza la conexión de la página desplegada.
