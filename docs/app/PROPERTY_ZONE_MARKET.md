# Precios de alquiler publicados por zona

El mapa de zonas resume precios pedidos de casas y apartamentos del directorio. Describe la muestra disponible, no precios de contratos firmados, tasaciones, disponibilidad confirmada ni cobertura de todo el mercado. Sus estadísticas se calculan antes de servir la página; mover el mapa no calcula medianas sobre los puntos visibles.

## Contrato entre los dos paquetes

El motor canónico vive en `classes/propertyzones/market.ts`, dentro del backend raíz. No importa código de `app/`, módulos de base de datos ni servicios de red. `app/utils/rentalZoneTypes.ts` declara el contrato público estructural que consume el frontend; la aplicación no incorpora una segunda implementación estadística.

`buildRentalZoneMarket(observations, { usdUyu, now })` acepta todo el iterable de observaciones y devuelve `{ sampleMinimum, observations, buckets }`. Cada bucket tiene `department`, `neighborhood`, `propertyType`, `bedrooms` y `prices`. Las observaciones aceptadas contienen:

- `propertyKey`, `advertId` y `source`: identidad del grupo almacenado e identidad nativa del aviso.
- `department`, `neighborhood`, `propertyType`, `bedrooms`: evidencia propia del aviso; no valores heredados de otra oferta del grupo.
- `price` y `currency`: precio nativo vigente, en UYU o USD. No se usa una conversión guardada `priceUyu`.
- `commonExpenses` y `commonExpensesCurrency`: gastos previamente validados contra la evidencia del mismo aviso por el lector. Cero requiere evidencia expresa; un cero crudo del portal no basta. Ausencia o contradicción se representa con `null`.
- `areaBuilt`: superficie construida explícita, o `null`. La superficie de terreno no la sustituye.
- `lastSeen`: fecha de lectura propia. El lector debe comprobar antes la identidad v1 y elegibilidad residencial del aviso; el motor vuelve a validar ámbito, tipo, moneda, precio y vigencia.

La función pura `normalizeRentalZoneMarketObservation(row, now)` produce una proyección nueva, sin contactos, descripción ni identidad privada. El caller conserva la responsabilidad de validar los gastos y la evidencia física antes de construir esta entrada compacta. No existe una afirmación de identidad basada sólo en coordenadas, similitud de texto, precio, barrio o fotografía.

## Unidad de observación y vigencia

Se consideran lecturas cuya fecha UTC está dentro de los diez días del directorio. Fechas inválidas, imposibles o futuras se excluyen. La fecha de lectura no se interpreta como fecha de publicación ni confirma que el inmueble continúe libre.

La unidad estadística es una vivienda del catálogo, no una tarjeta por portal. Se deduplican claves de propiedad y el mismo identificador nativo de aviso dentro de la misma fuente. Si un aviso nativo aparece en dos claves, esos vínculos exactos se resuelven transitivamente antes de elegir representante; esto elimina duplicados técnicos sin agregar una inferencia nueva de identidad entre avisos distintos. Dos propiedades parecidas con identificadores distintos siguen siendo dos observaciones.

Se elige un único aviso representativo por vivienda: el de lectura más reciente; en igualdad, identificador nativo, fuente y clave estables. La selección ocurre antes de formar cohortes. No se elige el precio mínimo, ni se toma el gasto de una oferta anterior cuando la elegida lo desconoce. Así se evita sesgar sistemáticamente la media hacia la oferta más barata de cada grupo.

## Comparabilidad y denominadores

Cada cohorte exige departamento y barrio publicado exactos, permitiendo únicamente diferencias de mayúsculas, acentos y espacios. «Centro» de departamentos distintos nunca se mezcla. Un nombre comercial como «Cordón Sur» no se equipara a «Cordón». No se asigna al aviso el barrio de una coordenada de otra fuente ni se supone que el nombre comercial coincide con un polígono oficial.

Casas y apartamentos se separan. Los buckets de dormitorios son `any`, `0`, `1`, `2`, `3` y `4plus`; cero significa monoambiente declarado. Dormitorios desconocidos participan sólo en `any`. Este agregado se calcula desde todas las observaciones, nunca como una media o mediana de los subgrupos de dormitorios. No se aplica el límite de puntos del mapa ni el de resultados de una búsqueda antes de agregar.

Todas las distribuciones monetarias se publican en UYU usando la cotización `usdUyu` del snapshot. Alquiler y gastos se convierten independientemente desde sus monedas nativas. Un cambio de cotización vuelve a calcular la conversión; no recicla valores UYU anteriores.

- `rent`: alquiler mensual propio.
- `commonExpenses`: sólo gastos conocidos, incluidos ceros previamente corroborados.
- `monthlyTotal`: alquiler más gastos del mismo aviso, sólo si ambos son conocidos.
- `builtSquareMeter`: alquiler dividido por superficie construida explícita; no incluye gastos comunes.

Cada indicador expone su propio `count`. Por debajo de **ocho** observaciones, `mean`, `median`, `p25` y `p75` son `null`, aunque el conteo real continúa visible. Tener ocho alquileres con sólo siete gastos conocidos permite resumir alquileres, pero no el costo mensual total. No se imputan gastos ausentes, metros ni dormitorios, y tampoco se eliminan extremos mediante una banda arbitraria.

La media es aritmética; los cuantiles interpolan linealmente entre las posiciones `(n − 1) × p`, con `p` de 0,25, 0,5 y 0,75. Los importes finales se redondean a dos decimales. `sources` cuenta plataformas entre representantes, no cantidad de anunciantes. `lastSeenFrom` y `lastSeenTo` indican las lecturas extremas de la cohorte; no son un período de contratos observados.

## Preferencias de barrio del hogar

El planificador acepta `zones: { mode: 'prefer' | 'only', include, exclude }`. Cada lista admite hasta veinte referencias explícitas `{ department, neighborhood }`; una entrada inválida o un conflicto entre inclusión y exclusión invalida la solicitud completa. Las solicitudes anteriores sin `zones` se normalizan a listas vacías.

Los criterios se evalúan contra la zona **del aviso seleccionado**. Se conservan ofertas alternativas válidas de la misma propiedad. El modo `only` con inclusiones rechaza zonas desconocidas; una exclusión elimina sólo coincidencias expresas y conserva las zonas desconocidas con advertencia. Una zona ausente nunca hereda el barrio canónico del grupo para superar estos filtros.

En modo `prefer`, cuando hay barrios incluidos, `score = puntajeBase × 0,9 + 10` para una coincidencia y `score = puntajeBase × 0,9` para otras zonas o zonas desconocidas. Son diez puntos explícitos de preferencia, no una valoración de seguridad. La prioridad previa de datos completos y remanente financiero suficiente permanece intacta. Sin inclusiones de preferencia, el puntaje previo permanece idéntico. `zoneMatch` identifica `preferred`, `neutral` o `unknown`; los motivos y advertencias explican preferencia o falta de dato.

Servicios y registros de delitos son capas de contexto con sus propios ámbitos, fechas y límites. No modifican automáticamente el ranking del hogar. El barrio publicado por un portal y la división oficial de un conjunto de datos pueden diferir; un enlace entre ellos exige correspondencia explícita, nunca parecido de nombres.

## Verificación

`tests/propertyzones/market.test.ts` cubre monedas, vigencia, ámbitos, cohortes, muestras insuficientes por indicador, gastos desconocidos, deduplicación nativa transitiva, ausencia de sesgo por mínimo, determinismo y catálogo mayor que el límite del mapa. Las pruebas de `app/tests/unit/rentalFit*.test.ts` cubren la proyección pública de zonas, criterios del mismo aviso, ofertas alternativas, límites de entrada, prioridad financiera y cálculo anterior intacto sin preferencias.
