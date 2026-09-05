# Auditoría de agrupación de alquileres — 5 de septiembre de 2026

## Resultado y alcance

La muestra dirigida confirma grupos que contienen inmuebles distintos, además de un problema independiente de persistencia: un mismo aviso pertenece a varias propiedades. También encuentra alertas engañosas; diferencias de baños, superficie o título no equivalen por sí solas a un error de agrupación.

Se confirmaron **siete grupos conflictivos de la muestra**, sin afirmar que sean los únicos ni extrapolar una tasa al índice. El caso más pequeño reúne dos unidades distintas de Plutarco 3978. El mayor revisado reúne 35 ofertas bajo una propiedad de Cordón, con direcciones públicas incompatibles. Un grupo legado sin barrio conserva casas y apartamentos de Villa García, Goes y La Unión.

Trabajo exclusivamente de lectura. No se ejecutaron sincronizaciones, reparaciones, actualizaciones de Mongo ni modificaciones del runtime. Consulta a `rentallistings` y `rentalmetas` mediante una conexión independiente a **APP_MONGO_URI**, no a la base del backend de cotizaciones. Lectura pública adicional de fichas originales y tres detalles de la API del sitio. Sin contactos a anunciantes ni servicios de pago.

La captura se realizó a **2026-09-05 06:31:29 UTC**; el metadato de sincronización informaba **05:47:19 UTC**. Para este informe, «vigente» significa que tiene al menos una oferta con `lastSeen >= 2026-08-26` y `priceUyu > 0`, según la ventana pública de diez días. No significa disponibilidad confirmada por el propietario. Las fuentes públicas se consultaron entre aproximadamente 06:34 y 06:42 UTC.

## Métricas reproducibles

| Medida | Resultado |
|---|---:|
| Propiedades almacenadas, incluidas antiguas | 18.486 |
| Propiedades con alguna oferta vigente | 16.596 |
| Pertenencias de ofertas vigentes a propiedades | 23.197 |
| Identificadores de aviso vigentes distintos | 22.832 |
| Grupos vigentes con varias ofertas | 3.083 |
| Grupos vigentes con varios portales | 1.730 |
| `listingId` pertenecientes a varias keys, incluyendo antiguos | 425 |
| `listingId` pertenecientes a varias keys vigentes | 307 |
| Keys vigentes afectadas por esa pertenencia múltiple | 473 |
| Pertenencias vigentes adicionales del mismo aviso | 365 |
| Máximo de keys vigentes para un aviso | 5 |
| Grupos vigentes con antiguo `addressKey` por departamento | 699 |
| De ellos, grupos con varias ofertas | 48 |
| Ofertas vigentes en esos grupos por departamento | 844 |
| Grupos vigentes con antigua familia `vivienda` | 2.471 |

Las 23.197 pertenencias se reparten en InfoCasas 11.084, MercadoLibre 7.567, Casasweb 2.635 y Facebook 1.911. El mismo aviso se cuenta más de una vez cuando está guardado en varias propiedades; por eso no deben comunicarse como 23.197 anuncios únicos. Los 307 identificadores duplicados son 148 de MercadoLibre, 79 de Facebook, 78 de InfoCasas y 2 de Casasweb.

El legado de claves por departamento o de familia `vivienda` delimita una población que merece revisión. Su existencia no demuestra que cada propiedad esté mal: muchos grupos contienen un solo aviso. Tampoco se deben sumar los dos conjuntos, que se solapan.

### Detectores: colas de inspección, no veredictos

Aplicados a los 3.083 grupos multioferta vigentes, usando títulos completos y atributos agregados disponibles:

| Señal | Grupos |
|---|---:|
| Varias ofertas del mismo portal | 2.168 |
| Títulos que mencionan barrios diferentes del agregado | 426 |
| Cantidades de dormitorios distintas entre títulos | 68 |
| Dormitorios de algún título distintos del agregado | 127 |
| Baños distintos entre títulos | 9 |
| Baños de algún título distintos del agregado | 29 |
| Casa/apartamento distintos entre títulos explícitos | 39 |
| Tipo del título distinto del agregado | 61 |
| Unidades numeradas distintas entre títulos | 6 |
| Pisos numerados distintos entre títulos | 8 |
| Superficies mencionadas con razón mayor que 1,5 | 4 |
| Precios comparables con razón mayor que 1,2 | 4 |
| Precios comparables con razón mayor que 2 | 0 |
| Grupos con alguna señal, sin duplicar grupos | 2.299 |

Las señales se solapan. **2.299 no es una cantidad de errores.** Varias agencias pueden publicar correctamente un mismo inmueble dentro de un portal. Un título puede mencionar una zona cercana; un baño de servicio puede contarse de otro modo; patio, terreno y superficie construida no son la misma medida. Los patrones de títulos tampoco cubren toda la escritura humana: omiten algunos números expresados con palabras, referencias ambiguas y unidades sin prefijo.

### Límite crítico del historial

En las 23.197 ofertas vigentes, **ninguna conserva atributos propios de dirección, calle, número, barrio, departamento, dormitorios, baños, superficie, piso o unidad**. Estos campos existen únicamente en el objeto agregado de propiedad. Las ofertas sí conservan título, identidad, URL, precios, gastos y otros datos comerciales.

Por tanto, no es válido reconstruir cada anuncio antiguo asignándole la dirección o los dormitorios del grupo. Eso convertiría el resultado de una unión posiblemente errónea en evidencia para justificarla de nuevo. La ausencia de estos datos explica también por qué esta auditoría necesita volver a algunas fichas originales.

## Casos confirmados

«Confirmado» significa que hay evidencia suficiente para rechazar que **todo el grupo** sea un inmueble único. No implica conocer la partición completa ni que cada oferta del grupo deba ser una propiedad distinta. Se leyeron todos los títulos y atributos almacenados de cada grupo listado; la evidencia pública complementaria se indica en cada caso.

### C1. Gabriel Pereira 2976: unidades 603, 407 y 504

**Key:** `montevideo-pocitos-gabriel-pereira-1n3gkmn`. Tres ofertas de InfoCasas, agregado monoambiente, 30 m², alquileres UYU 22.000–22.500.

Las tres fichas corresponden al mismo edificio y presentan unidades individuales distintas. La 603 publica piso 6 y 28 m²; la 407, piso 4 y 30 m²; la 504, piso 5 y 28 m². Las descripciones repiten la unidad específica. Las similitudes de superficie, precio, agencia y dirección no justifican agruparlas.

Fuentes: [unidad 603, IC194066177](https://www.infocasas.com.uy/exclusivo-apartamento-moderno-en-alquiler-lujo-y-confort-en-ubicacion-privilegiada-unidad-603/194066177), [unidad 407, IC194059333](https://www.infocasas.com.uy/alquiler-exclusivo-monoambiente-moderno-en-pocitos-tu-nuevo-hogar-de-lujo-y-confort-unidad-407/194059333), [unidad 504, IC194066060](https://www.infocasas.com.uy/alquiler-exclusivo-monoambiente-moderno-en-pocitos-estilo-y-confort-unidad-504/194066060).

### C2. Plutarco 3978: unidades 405 y 103

**Key:** `montevideo-buceo-plutarco-cxyobj`. Dos ofertas de InfoCasas, ambas UYU 23.000 y GC UYU 3.000. La unidad 405 publica 29 m² y la 103, 31 m². Ambas identifican su unidad en título y descripción. El campo estructurado de piso de la fuente no coincide necesariamente con lo que sugeriría el número de unidad; no se debe deducir el piso dividiendo ese número.

Fuentes: [unidad 405, IC194129875](https://www.infocasas.com.uy/alquiler-exclusivo-monoambiente-a-estrenar-en-buceo-diseno-moderno-y-ubicacion-privilegiada-unidad-405/194129875), [unidad 103, IC194102925](https://www.infocasas.com.uy/alquiler-exclusivo-monoambiente-a-estrenar-en-buceo-diseno-moderno-y-ubicacion-privilegiada-unidad-103/194102925).

### C3. Ventura Tower, torre C: unidades 105 y 102

**Key:** `montevideo-parque-miramar-avenida-de-las-americas-1x4rkwq`. Tres ofertas de InfoCasas. Dos identifican expresamente las unidades 105 y 102 de la torre C, con igual alquiler de UYU 37.000, 50,60 m² construidos y 5,51 m² de terraza. Tienen referencias individuales ZN2D95A y AT2E2BE. La tercera oferta, IC193996351, describe un primer piso pero no identifica unidad: **su pertenencia a 102 o 105 queda sin resolver**.

La fuente ubica estas unidades en Parque Miramar, Canelones, mientras la propiedad agregada está bajo Montevideo. Es además un ejemplo de por qué el departamento agregado no debe heredarse a todas las ofertas.

Fuentes: [unidad 105](https://www.infocasas.com.uy/apartamento-de-1-dormitorio-en-alquiler-unidad-105-torre-c-ventura-tower-carrasco/194103037), [unidad 102](https://www.infocasas.com.uy/apartamento-de-1-dormitorio-en-alquiler-unidad-102-torre-c-ventura-tower-carrasco/194103272), [oferta sin unidad](https://www.infocasas.com.uy/apartamento-a-estrenar-de-1-dormitorio-a-estrenar-con-balcon-y-amenities-en-parque-miramar/193996351).

### C4. Ventura Tower: unidades 1407 y 605

**Key:** `montevideo-parque-miramar-avenida-de-las-americas-wi4vuf`. Tres ofertas de InfoCasas. IC194096563 corresponde a unidad 1407, piso 14, orientación sur, 56,60 m²; IC194096221 identifica unidad 605, piso 6, orientación norte, 66 m². Los alquileres son UYU 41.500 y 44.000. La descripción de 605 dice que la unidad está ocupada actualmente, aunque el registro público continúa activo: tampoco se debe equiparar `active` con disponibilidad para entrar.

La tercera oferta, IC194175189, no identifica unidad en el título. No se asigna automáticamente a ninguna de las dos.

Fuentes: [unidad 1407](https://www.infocasas.com.uy/apartamento-de-1-dormitorio-en-alquiler-unidad-1407-ventura-tower-carrasco/194096563), [unidad 605](https://www.infocasas.com.uy/apartamento-de-1-dormitorio-en-alquiler-unidad-605-ventura-tower-carrasco/194096221).

### C5. Cordón: 35 ofertas y direcciones incompatibles

**Key:** `montevideo-cordon-gaboto-1d2e458`. El agregado tiene dirección vacía, un dormitorio y 42 m². Sus 35 títulos incluyen edificios y calles distintos, además de referencias a Cordón, Palermo y Pocitos. El rango de precio es estrecho, con razón aproximada 1,06.

La comprobación pública distingue **Constituyente y Tacuarembó, unidad 701 de Lift Gaucho** de **Charrúa y Jackson, piso 10**. No son el mismo domicilio. Otros avisos dicen piso 2, piso 4, unidad 603 de Noi Trueba y distintas opciones de garaje. Se confirma que el grupo debe revisarse y dividirse, sin concluir que existan 35 viviendas diferentes: también hay pares de títulos iguales en distintos portales que podrían conservarse juntos.

Fuentes: [Lift Gaucho 701, IC193873743](https://www.infocasas.com.uy/lift-gaucho-701-alquiler-apartamento-1-dormitorio-en-cordon-piso-alto/193873743), [Charrúa y Jackson, IC193999061](https://www.infocasas.com.uy/exquisito-apartamento-de-1-dormitorio-impecable-y-listo-para-habitar-estrategicamente-ubicado-en-la-codiciada-interseccion-de-charrua-y-jackson/193999061). Las URLs verificadas exactas se conservan también en el manifiesto local.

### C6. Cordón: Guaná frente a Monterroso y Paullier

**Key:** `montevideo-cordon-18-de-julio-6r8gp0`. Diez ofertas. IC194176247 identifica Monterroso y Paullier, unidad 403A, piso 4; IC193991315 corresponde a Guaná, piso 8. La diferencia de localización confirma el conflicto.

Es un control importante del detector de dormitorios: el título de IC193991315 dice dos, pero su descripción afirma uno y su dato estructurado corresponde a uno. **Ese título no certifica un conflicto real de dormitorios**. La separación se fundamenta en la dirección y unidad, no en tratar automáticamente el título como más fiable que el cuerpo.

Fuentes: [Monterroso y Paullier](https://www.infocasas.com.uy/apartamento-de-1-dormitorio-en-alquiler-en-cordon/194176247), [Guaná](https://www.infocasas.com.uy/alquiler-apartamento-2-dormitorios-balcon-muy-luminoso-vista-despejada-en-cordon/193991315).

### C7. Legado por departamento: Villa García, Goes y La Unión

**Key:** `montevideo-casa-duof3m`; `addressKey: depto|montevideo|vivienda`. Nueve ofertas de Facebook, sin dirección ni barrio propios almacenados. Los títulos incluyen una casa de Villa García, varias publicaciones de casa en Goes y apartamentos en La Unión. Se confirma una representación geográfica y de tipo incompatible con un inmueble único a partir del material original conservado; no se certificó nuevamente el contenido completo de Facebook.

Identificadores ilustrativos: [Villa García 1051600157858939](https://www.facebook.com/marketplace/item/1051600157858939/), [Goes 1104398742024145](https://www.facebook.com/marketplace/item/1104398742024145/), [La Unión 1903878930997839](https://www.facebook.com/marketplace/item/1903878930997839/). Las cuatro publicaciones de Goes con título similar podrían ser duplicados legítimos entre sí; no procede convertir nueve ofertas en nueve propiedades afirmadas sin más evidencia.

## Persistencia: un aviso con varios propietarios

Aquí «propietario» significa **key dueña de un aviso en la base**, no titular legal del inmueble.

`facebook:1385131089662054` pertenece a cinco keys vigentes: `montevideo-apartamento-1mhhell`, `montevideo-apartamento-1mhhell-nbqjvf`, `montevideo-apartamento-ogh51m`, `montevideo-apartamento-11s6t82` y `montevideo-apartamento-11s6t82-72u92k`. Sus agregados presentan títulos tan diferentes como un apartamento de Tres Cruces y una casa de Lomas de Solymar. No se elige por esta auditoría cuál debe conservar el identificador.

`mercadolibre:MLU1475830560` pertenece a cuatro keys de Tres Cruces, con direcciones agregadas de Avenida 8 de Octubre/18 de Julio, 18 de Julio/Bulevar Artigas y Colonia entre Paullier y Beisso. `infocasas:194180854` pertenece a cuatro keys de Cordón con referencias agregadas de Canelones, Monterroso/Requena y Constituyente/Minas.

La unicidad de identidad de aviso se puede comprobar sin decidir todavía cuál es la partición física correcta. Pero resolverla copiando todas las ofertas hacia una key elegida arbitrariamente podría perpetuar la contaminación.

## Probables y no concluyentes

| Key / caso | Clasificación | Evidencia y límite |
|---|---|---|
| `montevideo-buceo-avenida-mariscal-francisco-solano-lopez-10vncam` | Probable unión incorrecta | Dos avisos ML de More Buceo, uno piso 4 y otro piso 9, ambos monoambientes amueblados. IDs MLU699623909/MLU698555429. Títulos compatibles con unidades distintas; no se recuperaron aquí sus detalles completos. |
| `montevideo-tres-cruces-doctor-mario-cassinoni-1ouw61w` | Probable unión incorrecta | Ocho ofertas; Casasweb CW251914 dice piso 4 y CW251911 piso 7, además de referencias Ventura GO/Torreseis. La lectura web de las URLs de Casasweb no estuvo disponible; no se certifica la partición. |
| `canelones-pando-danubio-no8o4r` | No concluyente | Dos galpones IC, UYU 48.000/65.000. Los detalles solicitados redirigen a otras propiedades, por lo que no permiten verificar el par original. |
| `montevideo-punta-carretas-avenida-sarmiento-1l05ip1` | No concluyente | MLU699641647 UYU68.000 frente a MLU1497623262 USD2.850; la segunda oferta explicita muebles. El precio puede reflejar condiciones distintas o unidades distintas; falta prueba de identidad. |
| `montevideo-pocitos-joy-montevideo-nthwox` | Control negativo: agrupación probablemente correcta | IC194170799/194170800 tienen descripción idéntica, piso8, 97m², USD1.500 y GC UYU20.000. «3 baños» frente a «2 baños y toilette» no demuestra diferencia física. Ambos datos estructurados declaran dos baños. |
| `montevideo-bella-vista-12-de-diciembre-1qeqkf1` | Control negativo del detector de área | Los títulos de tres ofertas distinguen 1.200m² construidos y terreno/explanada de 3.500m². No hay razón para separar automáticamente por esos números. Una ficha original redirige a otro inmueble; la identidad de todas las ofertas no queda certificada. |
| `montevideo-pocitos-pedro-fco-berro-1iup5ax` | Control negativo del detector de área; atributos pendientes | El título ML separa patio38m² de70m² totales. No es una discrepancia de área entre anuncios. Ambos títulos dicen monoambiente pero el agregado dice1dormitorio; puede ser normalización del origen. IC194052763 dio 404, por lo que no se cierra la identidad. |

Fuentes de los controles: [JOY 3 baños](https://www.infocasas.com.uy/alquiler-en-edificio-joy-montevideo-2-dormitorios-3-banos/194170799), [JOY 2 baños y toilette](https://www.infocasas.com.uy/alquiler-de-apartamento-en-joy-montevideo-2-dormitorios-2-banos-y-toilette-variedad-de-amenities/194170800), [Bella Vista, IC194027627](https://www.infocasas.com.uy/alquiler-local-explanada-3500m2-en-bella-vista/194027627), [Bella Vista, IC193744176](https://www.infocasas.com.uy/1200m2-contruidos-en-terreno-de-3500m2-en-bella-vista/193744176).

### Validación de identidad al releer fuentes

Se consultaron 24 URLs dirigidas de InfoCasas. Se obtuvo la identidad solicitada en 20; una respondió 404 y tres devolvieron otro inmueble. Los IDs 194147950 y 194165610 de Pando terminaron en 194176767 y 193809423 respectivamente. IC193744172 también terminó en 193809423. El HTTP 200, el dominio y el HTML válido no bastan: hay que exigir que el ID del payload coincida con el solicitado antes de usar sus atributos. No se utilizaron los inmuebles de reemplazo para decidir la agrupación original.

## Propuesta segura de reparación histórica

### Evidencia estructurada disponible en las fichas InfoCasas ya leídas

En el HTML de detalle, el objeto principal está en `__NEXT_DATA__.props.pageProps.data`. El campo `data.floor` proporciona piso; la tabla `data.technicalSheet` contiene elementos `{ field: 'floor', value: '6', text: 'Planta' }`. En el payload completo inspeccionado también existe `pageProps.technicalSheet`.

| Aviso | Unidad explícita | `data.floor` | Valor visible de `technicalSheet.floor` |
|---|---|---:|---|
| IC194066177 | 603 | 6 | `6` |
| IC194059333 | 407 | 4 | `4` |
| IC194066060 | 504 | 5 | `5` |
| IC194129875 | 405 | 1 | `1` |
| IC194102925 | 103 | 0 | vacío |
| IC194103037 | 105, torre C | 1 | `1` |
| IC194103272 | 102, torre C | 1 | `1` |
| IC194096563 | 1407 | 14 | `14` |
| IC194096221 | 605 | 6 | `6` |

**Cero no siempre significa planta baja:** la ficha 103 tiene `floor: 0`, pero su tabla lo deja vacío y la página invita a consultar. Tampoco se puede deducir piso 4 desde unidad 405: la propia fuente publica 1. `floorsCount` y la entrada `story` representan cantidad de plantas; `apartmentsPerFloor` cuenta apartamentos por planta. No son designaciones de unidad.

En el payload completo guardado de 102 no se encontró un campo estructurado con su designación: `isProjectUnit` es un booleano, `commercial_units` está vacío y `code`/`code2` son referencias comerciales. Esto no demuestra que todos los formatos de InfoCasas carezcan de un campo equivalente. En los ejemplos verificados, las unidades y torre figuran en `data.title`; 603/407/504 también en `data.description`; 403A aparece en `data.address` y descripción. Lift Gaucho 701 tiene `floor: null`, pero su descripción identifica piso 7. Conviene conservar sólo la designación extraída y su procedencia, sin arrastrar toda la descripción ni confundir las plantas del edificio con el piso del apartamento.

### Secuencia propuesta

1. **Cerrar primero las causas de nuevas uniones.** Conservar evidencia por oferta, distinguir unidad/torre/piso cuando estén explícitos y coherentes, exigir evidencia positiva para unir sin domicilio y garantizar que cada `source:listingId` tenga una sola key dueña. El mismo precio, la misma dirección del edificio o una coincidencia de barrio no bastan. La discrepancia aislada del título necesita contexto cuando contradice el propio detalle.
2. **Preparar una copia íntegra y un manifiesto antes de escribir.** Snapshot de propiedades/metadatos, versión del agrupador y corte de vigencia; por cada cambio propuesto: key anterior, ofertas originales, nuevas particiones, evidencia, nivel de certeza y motivo. Contar por separado avisos distintos, pertenencias, propiedades y casos sin prueba suficiente.
3. **No fabricar atributos de ofertas antiguas.** Releer fuentes públicas identificadas cuando sea necesario, comprobando ID final y guardando fecha/procedencia. Los grupos sin evidencia suficiente pueden necesitar separación conservadora o cuarentena de la afirmación «misma propiedad», sin eliminar anuncios ni presentarlos como unidades físicas confirmadas.
4. **Resolver primero los casos explícitos y los IDs multidueños.** Las unidades 603/407/504, 405/103 y 105/102 constituyen lotes de validación claros. Las ofertas genéricas de esos grupos no deben anexarse a una unidad por cercanía de precio. Resolver pertenencia múltiple mediante la evidencia propia del aviso y el nuevo agrupador; no elegir la key con más votos históricos de un grupo contaminado.
5. **Preservar identidad y enlaces con criterio.** Una partición puede conservar una key cuando existe una oferta ancla identificable. Si la antigua ficha mezclaba varios inmuebles, una redirección permanente a uno de ellos afirmaría una equivalencia falsa. Preparar un estado de ficha antigua con alternativas o una decisión explícita de retirada, manteniendo una tabla de migración para favoritos y enlaces internos.
6. **Aplicar un lote acotado con reversión verificable.** No mezclar la reparación con una poda por ausencia en una lectura parcial. Comprobar que los avisos válidos del manifiesto no se pierdan, que cada ID tenga una sola pertenencia, que ninguna partición contenga unidades incompatibles y que los campos agregados correspondan a sus ofertas. Recalcular cobertura, comparaciones de precio y similares a partir del resultado reparado.
7. **Comparar antes/después con la misma captura.** Volver a estos siete grupos, los controles negativos de baños/superficie y los 307 IDs multidueños. Una caída de alertas por borrar ofertas no constituye éxito. Los conteos pueden subir por separar propiedades y bajar por eliminar dobles pertenencias; no fijar de antemano una dirección esperada del total.

Esta propuesta no ejecuta la reparación. Los datos históricos incompletos impiden prometer una partición exhaustiva y automáticamente correcta de las 16.596 propiedades.

## Evidencia y reproducción local

Artefactos ignorados en la raíz del worktree, no publicados:

- `.sdd-rental-match-audit-read.cjs`: lectura de APP mediante conexión aislada, proyección explícita y cierre en `finally`.
- `.sdd-rental-match-audit-snapshot.json`: proyección de auditoría de 18.486 registros y metadato, aproximadamente 23,7MB; no contiene credenciales. No sustituye un respaldo íntegro para restauración.
- `.sdd-rental-match-audit-analyze.cjs`: detectores y definición del corte.
- `.sdd-rental-match-audit-findings.json`: todas las candidatas, títulos completos y pertenencias duplicadas.
- `.sdd-rental-match-audit-extra.json`: desglose adicional de legado y unicidad.
- `.sdd-rental-match-public-details.json`: 24 lecturas públicas con URL solicitada/final, ID y resultado de validación, descripción y atributos seleccionados.
- `.sdd-rental-match-public-api.json`: confirmación de tres grupos en la API pública a 06:41:50 UTC. Plutarco devuelve 2 ofertas, Cordón Gaboto 35 y el grupo legado 9.
- `.sdd-rental-confirmed-conflicts.json`: siete keys, 65 IDs vigentes completos y nueve pares negativos; especifica cuáles ofertas siguen sin asignación demostrada. Sólo los grupos de Gabriel Pereira y Plutarco tienen una partición completa demostrada. Incluye hash de la captura y no ejecuta cambios.
- `.sdd-rental-infocasas-unit-evidence.json`: valores exactos de piso y designaciones para las 20 fichas públicas cuya identidad se validó, reutilizando las lecturas anteriores.

La muestra es deliberada, dirigida por señales y gravedad, concentrada en Montevideo/Canelones. No es aleatoria ni representativa del mercado nacional. Los títulos y datos publicados pueden contener errores del anunciante; las contradicciones entre título y descripción se conservaron como tales. La confirmación alcanza la incompatibilidad del grupo o la identidad duplicada documentada, no la disponibilidad contractual, la titularidad ni la exactitud completa del inmueble.
