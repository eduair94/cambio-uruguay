# Fletes y servicios de mudanza

Directorio editorial en `/fletes-mudanzas-uruguay`, complementario al hub de alquileres. Investigación
de fuentes públicas del **14 de septiembre de 2026**. La primera versión consolidada contiene
**80 proveedores o servicios**, **381 tarifas**, **19 fichas con precios** y **94 URLs de fuentes**.
Las tarifas son variantes de trabajo: 132 son rutas de Transportes Sánchez y 128 son artículos de
DePunta. No son 381 empresas ni 381 cotizaciones de mudanzas completas.

**Estado del 14 de septiembre de 2026:** la entrega inicial `dc3a708` está desplegada y tiene cinco
casos E2E aprobados contra producción. La ampliación de URLs compartibles, orden por precio y
referencias/reseñas descrita abajo está implementada localmente; su despliegue sigue pendiente.

## Superficies

- `app/utils/movingServicesData.json`: snapshot público autosuficiente, incluido sólo en la ruta.
- `app/utils/movingServices.ts`: contrato, filtros puros, lectura/escritura de URL, orden por precio,
  pertenencia territorial, selección de tarifas por servicio y validación del formato de contactos.
- `app/utils/movingServicesCopy.ts`: interfaz y guía en español, inglés y portugués. Los datos
  comerciales se conservan en español y las fichas llevan `lang="es"`.
- `app/components/moving/ProviderRow.vue`: servicios, precios, condiciones, vehículos, contactos
  etiquetados por sucursal/canal y fuentes de cada dato.
- `app/utils/movingReviewSourcesData.json` y `movingReviewSources.ts`: proyección pública de vínculos
  comprobados; contiene perfiles e identificadores, sin puntuaciones ni opiniones almacenadas.
- `app/utils/movingReviews.ts` y `app/server/utils/movingReviews.ts`: validación de identidad y
  proyección efímera de puntuación/recuento; límites de consultas al proxy configurado.
- `app/components/moving/ProviderReviews.vue` y `app/utils/movingReviewsCopy.ts`: referencias externas,
  consulta al abrir, estados de error y atribución de Google Maps en los tres idiomas.
- `app/server/api/moving-reviews/[provider].get.ts`: lectura bajo demanda de un perfil permitido,
  mediante `profileKey`; no acepta un Place ID o una URL arbitrarios del visitante.
- `app/pages/fletes-mudanzas-uruguay.vue`: búsqueda, filtros, fuentes, metodología y guía para pedir
  presupuestos comparables. OG y CollectionPage; no inventa Offer de un comercio del que no somos dueños.
- `docs/research/moving/README.md`: informe y directorio legible; archivos regionales conservan la
  investigación y sus límites. `*-discovery.json` son pistas de marketplaces, no tarifas publicables.

La ruta está registrada en `siteNav.ts` (menús, buscador y sitemaps), enlazada desde el buscador de
alquileres, la etapa «Mudarte y equipar» de `rentalJourney.ts` y recomendaciones explícitas de
`relatedPages.ts`. Se conserva el destino principal del catálogo de equipamiento en esa etapa.

## Reglas editoriales

1. Cada tarifa, vehículo y contacto tiene `sourceUrl` presente en `sources`. Cada fuente conserva
   fecha de consulta; `publishedAt` sólo se usa si la fuente fecha el precio. No renovar vigencia
   por volver a importar un archivo.
2. Cada precio lleva `category`: al filtrar armado se muestran importes de armado. Dante puede
   prestar armado pero su precio de guardamuebles no lo convierte en un armador con tarifa pública.
   `additional` identifica recargos: no encabezan el precio de un servicio base.
3. `amount` conserva moneda y unidad originales. Bloques de 30 minutos, paquetes de dos horas y
   tarifas por artículo no se transforman en precios horarios. El m² por mes se conserva en la
   etiqueta y las condiciones. No hay promedio ni ranking global entre monedas/unidades distintas;
   el orden por precio se aplica dentro de grupos explícitos, con las condiciones a la vista.
4. `prices: []` es presupuesto desconocido. Cero sólo está probado para los servicios municipales
   gratuitos. No usar importes simbólicos de tarjetas de Mercado Libre/Marketplace como tarifas.
5. Dimensiones, volumen y carga se almacenan por separado. «Camión grande» sin números no pasa el
   filtro de medidas/capacidad. No calcular volumen útil desde toneladas, fotos o modelo del camión.
6. `nationwide` significa anuncio explícito de cobertura nacional, no bases locales ni disponibilidad
   en todos los trayectos. La correspondencia localidad/departamento permite encontrar Costa de Oro
   bajo Canelones sin afirmar que el prestador atiende todo el departamento. Topónimos ambiguos no
   se resuelven automáticamente. `localOnly` exige base identificada.
7. Contactos: sólo publicaciones comerciales visibles o referencias públicas de tiendas, con URL.
   No mensajes, reservas, login, datos ocultos, textos de opiniones personales ni extracción de contactos de
   avisos inmobiliarios. `contact.label` preserva sucursales y contradicciones del origen.
8. Deduplicar identidad y teléfonos normalizados. SOSE/Fletes Montevideo comparten ficha. El
   Sánchez del directorio de Colonia usa el mismo celular de Sánchez Montevideo: una sola ficha,
   sin presumir una segunda sede. Nombres parecidos solos no prueban identidad.
9. Armado de tienda, combos dentro de una mudanza y recambio de artefactos en un domicilio conservan
   su condición. No atribuir tarifas del comercio a sus armadores externos ni vender un recambio
   como traslado e instalación entre dos viviendas. El plan mensual de CleanFach se excluyó de
   tarifas por no representar limpieza de mudanza.
10. Directorios secundarios e información histórica se identifican en las fichas. Estar listado no
    acredita calidad, habilitación, póliza, disponibilidad ni que el servicio haya sido contratado.

## URL compartible y orden

`readMovingQuery` y `buildMovingQuery` usan este contrato, independiente del idioma de la interfaz:

| Parámetro      | Valor                                                                                        | Ausencia o valor inválido                     |
| -------------- | -------------------------------------------------------------------------------------------- | --------------------------------------------- |
| `servicio`     | `moving`, `freight`, `assembly`, `packing`, `storage`, `cleaning`, `removal`, `installation` | Todos los servicios                           |
| `departamento` | Nombre de uno de los 19 departamentos; se normalizan mayúsculas y tildes                     | Todo Uruguay                                  |
| `q`            | Empresa, localidad, servicio o etiqueta de tarifa; espacios normalizados                     | Sin búsqueda                                  |
| `precios`      | `1`                                                                                          | No exigir tarifa pública del servicio elegido |
| `camion`       | `1`                                                                                          | No exigir medidas/capacidad documentadas      |
| `local`        | `1`, sólo con departamento válido                                                            | Incluir también cobertura declarada           |
| `orden`        | `precio-asc` o `precio-desc`                                                                 | Nombre del prestador                          |

Los valores predeterminados se omiten y los parámetros repetidos toman su primer valor. Ejemplo:

```text
/fletes-mudanzas-uruguay?servicio=assembly&departamento=Canelones&q=ropero&precios=1&orden=precio-asc
```

La ruta es la fuente del estado confirmado: recarga y atrás/adelante restauran filtros y orden. Los
selectores y casillas crean entradas de historial; el texto actualiza la entrada tras 300 ms sin
escribir. Cualquier navegación cancela el texto pendiente. Limpiar filtros retira sólo estos siete
parámetros y conserva los ajenos. «Copiar búsqueda» confirma el texto pendiente y genera un enlace
con los filtros del directorio, sin parámetros de seguimiento; si falla el portapapeles, muestra la
URL para copiarla manualmente.

`sortMovingProviders` trabaja sobre los resultados filtrados. `movingPriceForSort` selecciona una
tarifa principal del servicio pedido, priorizando la etiqueta pertinente a la búsqueda y excluyendo
`additional`. Esa misma referencia se pasa a `ProviderRow` como `comparisonPrice`: el importe
destacado es el que determina la posición. No se toma el mínimo de otros artículos o servicios de
una empresa. `movingPriceGroupKey` produce grupos por categoría, moneda y unidad; dentro de cada
grupo se ordena el importe, con empate por nombre e identificador. Los grupos conservan su orden al
invertir ascendente/descendente y los prestadores sin tarifa pertinente van al final.

Un rango o «desde» se ordena por su importe inicial y mantiene su calificador. Paquetes, bloques,
impuestos, mínimos y personal permanecen como se publicaron; agrupar por unidad no afirma que dos
servicios tengan el mismo alcance. La búsqueda también indexa etiquetas de tarifas y cada ficha con
más de ocho importes tiene un buscador propio.

## Referencias externas y puntuaciones bajo demanda

La evidencia manual de `docs/research/moving/review-sources.json` cubre 80 prestadores y 123
comprobaciones de fuentes. La proyección contiene **48 referencias de 38 prestadores**: 16 Google,
12 Facebook, 19 fichas 1122 y una HomeSolution. Las diez asociaciones ambiguas y tres rechazadas no
se publican. «Verificado» califica el vínculo de identidad, no la calidad o existencia de opiniones.

Hay **16 Place IDs de Google asociados a diez prestadores**, elegibles para consulta en vivo cuando
el entorno está configurado. Son perfiles/sucursales, no 16 empresas distintas. Facebook, 1122 y
HomeSolution se ofrecen como enlaces; no se trasladan sus puntuaciones al directorio. Las opiniones
del perfil pueden referirse a otros trabajos de una tienda o sucursal. Sin vínculo no significa sin
reputación; no se fabrica una coincidencia por nombre ni proximidad.

Al abrir «Reseñas y referencias externas», el componente consulta secuencialmente hasta tres perfiles
Google de ese prestador; los demás quedan disponibles mediante su botón de consulta. Cerrar o
desmontar cancela solicitudes y borra resultados. No hay consultas al cargar la página, precarga de
todo el catálogo, cron, MongoDB, Redis ni persistencia de puntuaciones. La API devuelve `no-store`
para navegador y CDN. La fecha mostrada es la de consulta, no la de la última opinión.

El servicio solicita sólo identidad, puntuación, recuento y atribuciones del proxy compatible con
Place Details Legacy. No pide textos, autores, fotos ni resúmenes de opiniones. Exige el Place ID y
nombre esperados; contradicciones de país o teléfono, cuando el origen los entrega, ocultan la
puntuación. Falta de configuración, indisponibilidad y límites se muestran como tales, sin conservar
una puntuación anterior como si fuera actual. La atribución de Google Maps y las atribuciones
adicionales se muestran junto al resultado; las estrellas no ordenan este directorio.

Configuración privada en `nuxt.config.ts` y `.env.example`:

- `MOVING_REVIEWS_GMAPS_URL`: base del proxy, con fallback a `CASAS_REVIEWS_GMAPS_URL`; se incorpora
  a `runtimeConfig` en el build. No se publica la URL interna ni credenciales al cliente.
- `MOVING_REVIEWS_ENABLED`: `0`, `false` u `off` deshabilitan las consultas. El endpoint también
  comprueba este interruptor en runtime; sin base utilizable responde `not_configured`.
- Límites por worker: 12 consultas por IP/minuto, 120 globales/minuto y tres simultáneas globales;
  hasta 2.000 contadores, sin contenido Google. Se reinician con el proceso y no son un límite
  compartido entre workers. Timeout al proxy de 15 s, sin reintentos; cliente 18 s.

Fuentes oficiales consultadas el 2026-09-14: las [políticas de Places API](https://developers.google.com/maps/documentation/places/web-service/policies)
restringen precarga/almacenamiento salvo excepciones y exigen atribución visible. La [guía de Place
IDs](https://developers.google.com/maps/documentation/places/web-service/place-id) permite conservar
identificadores y recomienda revisarlos cuando superan doce meses. [Place Details Legacy](https://developers.google.com/maps/documentation/places/web-service/legacy/details)
documenta campos y selección de respuesta del adaptador actual. Estos enlaces sirven para revisar
la configuración y sus obligaciones; guardar un identificador no autoriza a archivar puntuaciones
ni demuestra que el proxy de un entorno esté operativo.

## Actualizar

El catálogo de servicios y los vínculos de perfiles son relevamientos manuales fechados, sin cron
ni DB de alquileres. El navegador filtra snapshots locales. La consulta opcional de puntuaciones
es una ruta separada bajo demanda, con la configuración privada descrita arriba; no modifica esos
snapshots ni sus fechas de revisión.

1. Abrir las fuentes, contrastar cambios y corregir la evidencia en `docs/research/moving/*.json`.
2. Completar la categoría de cada tarifa y revisar unidades, límites, impuestos, contactos y
   duplicados. Un recargo nuevo nunca debe convertirse en precio base.
3. Ejecutar `node app/scripts/build-moving-directory.mjs` desde la raíz. Sólo esta importación
   editorial lee `docs/`; el build de Nuxt sigue siendo autosuficiente dentro de `app/`.
4. Revisar el diff del snapshot y ejecutar las pruebas indicadas abajo. Si se revisa todo el
   directorio, actualizar de forma consciente `MOVING_REVIEWED` y las fechas de fuentes. Una
   consulta parcial requiere conservar la antigüedad individual del resto; no desplazar todas las
   fechas con una sustitución masiva.
5. Para referencias, revisar `docs/research/moving/review-sources.json`: vínculo desde fuente
   comercial, identidad de destino, sede, estado y Place ID cuando esté documentado. No incluir
   ratings, recuentos, textos, autores ni payloads de Maps en ese archivo.
6. Ejecutar `node app/scripts/build-moving-review-sources.mjs` desde raíz. Sólo proyecta perfiles
   verificados hacia `app/utils/movingReviewSourcesData.json`; el build de Nuxt no lee `docs/`.

El aviso de antigüedad se activa a los 90 días del relevamiento. No confirma vigencia de precios
antes de ese plazo ni elimina el recordatorio de confirmar la cotización. La fecha se comparte entre
SSR e hidratación para evitar diferencias al cambiar el día.

## Verificación

Desde `app/`:

```sh
npx vitest run tests/unit/movingServices.test.ts tests/unit/movingServicesQuerySort.test.ts tests/unit/movingReviews.test.ts tests/unit/movingReviewsService.test.ts tests/unit/siteNav-coverage.test.ts tests/unit/pageContainer.test.ts tests/unit/rentalJourney.test.ts tests/unit/relatedPages.test.ts
npx playwright test tests/e2e/moving-directory.spec.ts tests/e2e/moving-directory-sharing.spec.ts
npx eslint utils/movingServices.ts utils/movingServicesCopy.ts utils/movingReviewSources.ts utils/movingReviews.ts utils/movingReviewsCopy.ts components/moving/ProviderRow.vue components/moving/ProviderReviews.vue pages/fletes-mudanzas-uruguay.vue server/utils/movingReviews.ts "server/api/moving-reviews/[provider].get.ts" tests/unit/movingServices.test.ts tests/unit/movingServicesQuerySort.test.ts tests/unit/movingReviews.test.ts tests/unit/movingReviewsService.test.ts tests/e2e/moving-directory.spec.ts tests/e2e/moving-directory-sharing.spec.ts scripts/build-moving-directory.mjs scripts/build-moving-review-sources.mjs
```

Desde raíz, ambos comandos `--check` comprueban proyecciones sin escribir:

```sh
node app/scripts/build-moving-directory.mjs --check
node app/scripts/build-moving-review-sources.mjs --check
```

La suite original cubre búsqueda por artículo, tarifa del servicio elegido, condiciones, localidades,
contactos, idiomas y móvil en ambos temas con consentimiento de primera visita sin predismiss. La
suite de ampliación cubre URL completa, recarga, atrás/adelante con texto pendiente, parámetros
ajenos, copia, reset y correspondencia entre grupos/importe destacado. Las respuestas de reseñas
se simulan para probar éxito, identidad contradictoria, límites, consulta sólo al abrir, limpieza
al cerrar y atribución en claro/oscuro: pasar estos casos no acredita conectividad real del proxy.

Validación registrada del 2026-09-14: entrega inicial con 288 unitarias locales y cinco E2E aprobados;
despliegue `dc3a708` exitoso y cinco E2E aprobados en producción. La ampliación tiene **346 unitarias
locales en ocho archivos aprobadas**, ESLint limpio y el nuevo E2E integrado aprobado, con capturas
revisadas en claro y oscuro. Tres lecturas reales de Google (Furniture Home Canelones, Naterial
Punta Carretas y All Box) pasaron el parser y la verificación de identidad sin almacenar sus
puntuaciones. Su despliegue y la comprobación de la API pública siguen pendientes.
