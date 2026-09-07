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
