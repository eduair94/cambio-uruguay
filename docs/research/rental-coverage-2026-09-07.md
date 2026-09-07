# Cobertura de alquileres — 7 de septiembre de 2026

## Qué se está midiendo

El inventario visible no es el número leído por el último job. El modo horario sólo repasa una
parte de los avisos. Tampoco es el total publicado por cada portal: una búsqueda puede limitar
la paginación, repetir resultados, cambiar durante la lectura o incluir alquileres temporarios.

Antes de los cambios, a las 10:29 UTC, la auditoría de Mongo coincidió con `GET /api/rentals`
y su bloque `coverage`. No había anuncios con pertenencia duplicada entre propiedades.

| Fuente | Avisos almacenados | Avisos vigentes en el índice | Propiedades visibles |
|---|---:|---:|---:|
| Mercado Libre | 9.247 | 7.298 | 7.298 |
| InfoCasas | 17.512 | 16.468 | 16.468 |
| Facebook Marketplace | 2.251 | 1.911 | 1.911 |
| Casasweb | 2.649 | 2.649 | 2.649 |
| Inmuebles El País | 5.940 | 5.940 | 5.940 |
| Total | 37.599 | 34.266 | 34.266 |

“Vigente en el índice” significa precio positivo y última observación dentro de la ventana
pública de diez días; no confirma que siga disponible. No se renuevan fechas para aumentar
estas cifras. La poda histórica de 21 días es otra regla y no determina el inventario visible.

## Resultado en producción

El barrido desplegado (`7581e86`) terminó el 7 de septiembre a las 11:52 UTC, con salida 0,
44.638 anuncios aceptados y 44.636 propiedades escritas en 45 minutos. A las 16:36 UTC,
después de las actualizaciones horarias normales, el índice y la API coincidían:

| Fuente | Avisos visibles antes, 10:50 UTC | Avisos visibles después, 16:36 UTC | Variación |
|---|---:|---:|---:|
| Mercado Libre | 7.298 | 23.688 | +16.390 |
| InfoCasas | 16.468 | 16.494 | +26 |
| Facebook Marketplace | 1.912 | 1.968 | +56 |
| Casasweb | 2.649 | 2.660 | +11 |
| Inmuebles El País | 5.940 | 5.957 | +17 |
| Total de anuncios | 34.267 | 50.767 | +16.500 |

La web mostraba **50.765 fichas**, porque dos grupos reúnen un anuncio de cada fuente.
El inventario histórico almacenaba 53.344 anuncios. No había IDs de anuncios asignados a
múltiples propiedades; esto no acredita que todas las fichas sean viviendas físicas distintas.
Las variaciones incluyen la actividad del mercado y las actualizaciones horarias posteriores,
no sólo los anuncios incorporados durante el barrido manual.

La misma muestra de 684 IDs pasó de 302 a 679 visibles: se recuperaron los 365 faltantes de
Mercado Libre, sus siete avisos archivados, la chacra de Casasweb y cuatro de los nueve
candidatos faltantes de Facebook. Los cinco restantes de Facebook pasan el parser y la
agrupación con sus tarjetas capturadas a las 10:34 UTC; no se guardaron las tarjetas crudas
del barrido posterior, así que no se puede atribuir su ausencia con certeza a resultados
dinámicos, cambios de contenido o ausencia en la respuesta. No se importó esa captura antigua
como si fuera una lectura actual.

Las comprobaciones públicas adicionales verificaron 11 condiciones con 13 GET (filtros,
costos, mapa, fichas y campos permitidos) y tres GET de cobertura: todos devolvieron 200.
La cobertura global permanece igual al aplicar un filtro o buscar un texto sin resultados.
El último metadato `full` permaneció disponible después de las actualizaciones horarias.

### Segunda revisión de la partición de Mercado Libre

El primer barrido completó su cola principal: sus 1.430 solicitudes totales quedaron debajo
del límite principal de 1.500 y alcanzó la etapa posterior de mascotas/particulares. Por eso
el contador agregado de 70 tareas pendientes no representaba 70 segmentos principales sin
leer. El registro ahora distingue catálogo, particulares y mascotas.

Se detectó además una elección mejor de partición: los estados de casas explicaban 4.393 de
4.418 resultados, mientras sus tres franjas nativas de precio explicaban los 4.418, con un
máximo de 1.538 por franja. Se prefieren rangos completos y contiguos que caben en el límite
de páginas antes de una división geográfica con resto. Cada respuesta sigue validando sus
filtros y cada anuncio su categoría, operación y precio; `complete` permanece en `false`.

La comprobación posterior al despliegue `8e2671e` realizó siete GET: categoría de casas y
primera/última página de sus tres franjas. Todas conservaron los filtros y los offsets
pedidos. El total anunciado era 4.413; una franja cambió de 1.468 a 1.469 durante la lectura,
otro motivo para no prometer una fotografía exhaustiva de un catálogo dinámico.

### Comprobación de las dos uniones nuevas

La auditoría de las dos fichas con varias fuentes encontró evidencia suficiente en Aguada:
Yaguarón 1986, unidad 3 explícita en ambos anuncios, con atributos compatibles. En Cordón,
el título `Alquiler Apartamento 5 DOMITORIOS Cordon` hacía que el parser confundiera el
error ortográfico de “dormitorios” con la unidad 5. Coincidir en dirección, precio y ese
título no prueba identidad: esos avisos deben permanecer separados.

El veto de atributos ahora reconoce también `domitorio`, `dormtorio` y `dormitoiro`,
sin inventar dormitorios ni descartar un identificador de unidad independiente. La
reparación del grupo de Cordón debe preservar los dos IDs, todas sus fechas y sus datos;
como ambos títulos coinciden normalizados, la URL canónica anterior no es atribuible a
un único anuncio y no debe asignarse arbitrariamente a uno de ellos.

## Comprobaciones directas

- **Mercado Libre:** el breadcrumb del portal identifica `MLU1473` como
  `Inmuebles > Apartamentos > Alquiler`, no como todo alquiler. El adaptador usaba esta categoría
  fija para siete textos de búsqueda. Las consultas `alquiler` y `apartamento` devolvieron el
  mismo total (15.440) y los mismos 20 IDs iniciales. Casas es `MLU1467` (4.419 resultados
  anunciados en la comprobación). Es una omisión de recorrido, no una falla de la base.
  Los filtros actuales del puente sí funcionan: hoy 116, particulares 959 y mascotas 6.268
  frente a 15.440 sin esos filtros. Estos totales son de apartamentos, no de todo el mercado.
  Una muestra ampliada de 469 IDs encontró 365 ausentes y siete archivados fuera de la ventana
  pública. No es una muestra aleatoria para extrapolar porcentajes del mercado.
  La comprobación final del nuevo lector obtuvo 489 avisos en 45 consultas y 76 segundos,
  sin fallas de acceso, filtros perdidos ni páginas repetidas. El presupuesto acotado dejó
  tareas pendientes, señaladas como tales. El modo horario se comprobó por separado: 99 avisos
  en 12 consultas; una categoría no corroboró el filtro de novedades y fue descartada.
- **InfoCasas:** primeras páginas de las cinco franjas de precio y página 353 de la franja
  superior. Página, filtros y cola coinciden con la petición; las franjas anuncian 872 páginas,
  dentro del presupuesto global de 900. La muestra no acredita cobertura exhaustiva: el
  inventario cambia durante el recorrido y los IDs pueden desplazarse entre páginas/franjas.
- **Casasweb:** Montevideo/apartamentos, páginas 1, 2 y 23 final; 1.148 resultados anunciados
  y 52/52/4 tarjetas respectivamente. Se detectó una categoría que el recorrido no pedía:
  `f=Chacra`. Canelones devuelve el alquiler mensual `CW221797`, publicado a USD 3.500.
  Una comparación por ID de 102 avisos aceptados de InfoCasas y 104 de Casasweb encontró 205
  presentes y vigentes; el único ausente era `casasweb:CW221797`.
- **Facebook:** las dos consultas habituales de Montevideo devolvieron 58 candidatos aceptados,
  todos presentes. Una búsqueda en Colonia del Sacramento devolvió 23 tarjetas, 11 con esa
  ciudad expresamente publicada. El buscador también devuelve sugerencias lejanas: su parámetro
  `location` no prueba la ubicación de cada aviso. Los 12 candidatos ausentes de esa muestra
  no equivalen a 12 viviendas verificadas: hay títulos genéricos sin prueba de operación que
  deben quedar excluidos hasta contar con evidencia propia.
- **El País:** se valida el paginador (página pedida, total y total de páginas), la continuidad
  de los IDs originales y el total final. Una respuesta sin metadata o una página repetida
  ya no permiten declarar completa la lectura. Los avisos aceptados se conservan; una lectura
  parcial no habilita caducidad por ausencia.
- **Gallito:** la página pública puede aparecer en buscadores, pero la petición identificada
  a `https://www.gallito.com.uy/inmuebles/casas/alquiler` volvió HTTP 403. No se incorporó una
  integración ni se intentó sortear esa respuesta. No está incluido en las cifras anteriores.

## Directorios todavía no integrados

Una revisión adicional de doce peticiones identificadas (11:09–11:12 UTC) encontró dos
candidatos que merecen una evaluación propia. No se sumaron sus totales a la cobertura:

- [BuscandoCasa](https://www.buscandocasa.com/bc/0_promocion.asp?promo=1) devuelve 40 últimos
  ingresos y fichas propias en `ver.uy`, con alquiler mensual, gastos comunes y garantías.
  Las fechas de esa ventana van de septiembre de 2026 a julio de 2025. No se comprobó
  paginación nacional, actualización de cada ficha ni una señal fiable de baja.
- [GoPunta](https://www.gopunta.uy/alquileres/) devuelve dos páginas con 50 IDs distintos
  cada una y un total anunciado de 3.153. Tiene fichas de alquiler anual, pero también
  resultados con condiciones temporarias. Una ficha publica la vigencia inválida
  `30/11/-0001`: debe quedar desconocida, nunca convertirse en fecha de publicación.
  Sus enlaces se resuelven contra el `<base href>` del HTML. Falta comprobar la última
  página, las bajas y cuánto inventario aporta respecto de las fuentes ya integradas.
- [BienesOnline](https://www.bienesonline.uy/) redirige sus resultados a `bienesonline.ai`;
  no se validó el destino dentro de esta muestra. Properati falló por TLS desde este entorno,
  lo que no prueba que el portal haya cerrado. [Trovit](https://casas.trovit.com.uy/) agrega
  otros portales y su `robots.txt` excluye detalles, redirecciones y RSS; no se leyeron esas rutas.

No hay un feed estable ni un ciclo de bajas demostrado para estas candidatas. Una futura
integración debe conservar identidad por anuncio y última lectura propia, probar la elegibilidad
mensual y medir el aporte adicional antes de anunciar una ampliación de cobertura.

## Auditoría reproducible

`npx ts-node scripts/oneoff/rentals_coverage_audit.ts` consulta únicamente el índice y su
metadato. No lee portales, no escribe anuncios ni modifica fechas. Usa el mismo puente a la
base de la app que `sync_rentals.ts`.

`--ids-file=muestra.json` acepta un array JSON de IDs públicos con prefijo de fuente
(`mercadolibre:MLU…`, `infocasas:…`, `casasweb:CW…`, etc.). Separa los IDs presentes, ausentes y
fuera de la ventana pública. Un ausente sólo prueba un faltante dentro de esa muestra; antes
de importar hay que verificar que cumple los criterios del directorio.

El último barrido de alcance `full` se conserva también bajo la clave
`uy-rentals-last-full` de `rentalmetas`; una actualización horaria no lo pisa. Cada fuente
conserva `complete`, además de su estado y nota. `mode: full` indica el alcance solicitado;
sólo una fuente que termine y declare `complete: true` habilita caducidad por ausencia.
El documento es el último barrido guardado con éxito, no un registro de intentos fallidos
antes de guardar. No se ha añadido un endpoint público ni un proceso periódico adicional.

## Límites que permanecen

Mercado Libre recorre nueve categorías verificadas y sus particiones nativas. El presupuesto
global es 1.600 solicitudes / 40 minutos en full y 100 / 4 minutos en fast. Los reintentos
cuentan; hasta 100 solicitudes full se reservan para corroborar mascotas/particulares. Se conserva
una lectura adicional acotada del padre cuando las facetas no explican todos sus resultados.
No se declara cobertura exhaustiva. Las tarifas de UYU 3.000–7.999 con moneda o período dudosos
en la tarjeta no justificaron rebajar el piso de esa fuente: requieren comprobar la ficha propia.

Marketplace sigue limitado a tarjetas de búsqueda y sesión disponible, con sugerencias de otras
zonas. En la muestra nueva de Colonia, nueve candidatos cumplen la evidencia textual reforzada
y no estaban en el índice antes de desplegar. No se han inferido dueños, ubicación ni operación
desde el texto de la consulta. Las fuentes externas sin integración no están contadas como
cobertura del directorio.
