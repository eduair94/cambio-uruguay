# Fuentes territoriales para alquileres

Verificación e ingesta inicial: 8 de septiembre de 2026. Este documento describe las fuentes y el contrato de `classes/propertyzones/sources/`; la publicación, los precios y los servicios se construyen por separado.

## Contrato y actualización

`loadPropertyZoneSources({ previous?, force?, now?, signal? })` devuelve:

```ts
{
  geometry: { zones: [{ id, officialCode, name, department, geometry }], source },
  crime: {
    periodFrom, periodTo, countsByOfficialCode, countsByDepartment,
    unassignedCount, includesAttempts: true, source
  }
}
```

Cada grupo de conteos tiene `total` y `byOffense`: `hurto`, `rapina`, `lesiones`, `violencia-domestica`, `abigeato`. Las fechas del período son inclusivas. No incluye identificadores de eventos, características de víctimas, domicilios, coordenadas delictivas ni una estimación de riesgo personal. `unassignedCount` es exclusivamente el total de Montevideo cuyo barrio no pudo asignarse; no incluye los demás departamentos.

El llamador puede persistir **este agregado** y pasarlo en `previous`. Se consulta primero la pequeña metadata oficial; una firma de versión del parser/geometría + recurso + modificación + tamaño + período permite reutilizar los conteos sin descargar nuevamente el CSV. Se validan y proyectan los agregados reutilizados; campos adicionales no se publican. Si cambia la firma, el archivo completo se procesa otra vez. Una falla de metadata o de la descarga nueva se propaga; el loader no devuelve silenciosamente cifras anteriores. `force` permite una verificación explícita. El job debe conservar la última publicación válida ante un fallo y mostrar su antigüedad; no debe convertir un fallo en ceros.

## Delitos registrados: Ministerio del Interior / AECA

- [Conjunto oficial y metadata CKAN](https://catalogodatos.gub.uy/dataset/ministerio-del-interior-delitos_denunciados_en_el_uruguay), licencia DAG Uruguay, actualización trimestral.
- [CSV original «otros-delitos»](https://catalogodatos.gub.uy/dataset/999f2edc-5ef5-4d41-bed7-824a5635ea8d/resource/c8c4cc18-57cf-448b-9c68-901b3752fc11/download/otros-delitos.csv).
- [Definición de campos](https://catalogodatos.gub.uy/dataset/999f2edc-5ef5-4d41-bed7-824a5635ea8d/resource/13285391-71b7-4cf3-bec8-26031275aca4/download/metadatos_otrosdelitos.json).
- [Manual de procesamiento de enero de 2026](https://www.gub.uy/ministerio-interior/comunicacion/publicaciones/manual-general-procesamientos-estadisticos-enero-2026).

La metadata consultada publica enero de 2013 a junio de 2026, recurso modificado el 24 de julio de 2026. Se toman los últimos doce meses completos **del período declarado**, no del día de descarga: 1 de julio de 2025 a 30 de junio de 2026. Se cuenta cada evento una vez, tanto consumado como tentativa, según su fecha de ocurrencia y categoría publicada. No se suman víctimas y no se intenta reclasificar hechos: el organismo ya aplica sus reglas para acontecimientos con múltiples delitos. Homicidios es otra base, con unidad de conteo por víctima y sin barrio publicado; no se mezcla ni se infiere desde seccionales.

`BARRIO_MONTEVIDEO` corresponde al cruce oficial con cartografía INE 2011. Para otros departamentos se publican únicamente agregados departamentales propios del CSV. No se extrapolan a barrios o localidades. Los límites policiales variaron durante la serie: el loader no los utiliza como equivalentes a barrios.

La primera lectura completa verificó 376.534.969 bytes y 2.508.780 filas. El período seleccionado contiene 167.035 eventos nacionales y 81.249 de Montevideo; 690 de estos últimos son `SIN CLASIFICAR`. Todos los restantes nombres de barrio coinciden con la tabla oficial tras normalizar acentos, mayúsculas y puntuación, y aplicar la única expansión documentada abajo. Son conteos de hechos registrados, no todos los hechos ocurridos, ni probabilidades de victimización. No se calculan tasas: no se ha validado una población actual con exactamente esta geografía y período. La población residente tampoco sustituye la exposición de visitantes o trabajadores.

**No usar CKAN DataStore para este recurso.** Aunque `datastore_active` es verdadero, la comprobación de `datastore_search` devolvió una sola fila y dos columnas mal interpretadas. La descarga nativa es la fuente del importador.

El CSV es UTF-8 con separador `;`, fechas `dd.mm.yyyy`, meses escritos en español (incluido `SETIEMBRE`) e IDs anonimizados alfanuméricos. Se procesa como stream, máximo 512 MiB, 32 KiB por fila, diez millones de filas y un millón de eventos dentro de la ventana. Los IDs se conservan solamente en memoria durante ese recorrido para detectar duplicados y luego se descartan; no se escriben a la base ni a logs. Se valida UTF-8, cabecera, forma de filas, fechas, categorías, los doce meses presentes, tamaño completo y correspondencia territorial. Se rechaza una unión territorial con más del 10% de Montevideo sin asignación. Descarga: plazo total de 240 s; metadata: 20 s; sin reintentos automáticos ni destinos derivados arbitrariamente de metadata. No se descarga ni conserva el CSV desde una visita web.

## Geometrías: INE, archivo cerrado del Censo 2011

[Página oficial](https://www.gub.uy/instituto-nacional-estadistica/datos-y-estadisticas/estadisticas/mapas-vectoriales-ano-2011) y [ZIP original](https://www5.ine.gub.uy/documents/Cartograf%C3%ADa/Vectoriales/2011/mapas%20vectoriales%202011.zip). El ZIP mide 44.922.380 bytes y tiene SHA-256 `e4cc9f5abc5baee44c43fa54077d540241457186fdbb19a02a93149d403c51c6`.

Se usa `ine_barrios_mvd_nbi85.shp` junto con su DBF y metadata. El documento incluido identifica 62 aproximaciones a barrios de Montevideo, actualización diciembre de 2011, estado cerrado, WGS84/UTM21S y uso libre citando al INE. Los campos `NROBARRIO` y `NOMBBARR` son el código y el nombre nativos. Es una división estadística aproximada, no un límite legal ni necesariamente el barrio que escribe una inmobiliaria. La diferente capa catastral de 63 áreas, incluido Puerto, **no** se usa como sustituto.

`ine2011.json` conserva códigos, nombres, anillos y vértices; sólo reproyecta de EPSG:32721 a EPSG:4326 y redondea a nueve decimales. El conversor reproducible `convert_ine_geometry.py` requiere pyshp 2.3.1, pyproj 3.7.2 y Shapely 2.0.7. La validación topológica pasó para los 62 polígonos. Redondear a seis decimales produjo tres autocruces que no existían en el original; por eso no se empleó esa reducción. No se aplicaron simplificaciones o reparaciones que alteraran límites. La fuente histórica queda fijada y no necesita consultas de red diarias.

El DBF limita el nombre a 25 caracteres y publica el código 61 como `Villa Garcia, Manga Rur.`; la tabla del MI lo publica `VILLA GARCIA, MANGA RURAL`. Ésta es la única expansión explícita del importador. No se equipara «Manga Rural», «Parque Batlle» u otra parte de un nombre compuesto con el área entera mediante coincidencia aproximada. Las etiquetas anunciadas por portales deben conservarse como tales si no coinciden con un nombre oficial.

## Servicios y otras coberturas

El índice nacional de servicios existente se documenta en [PROPERTY_NEARBY.md](PROPERTY_NEARBY.md). Un conteo de puntos dentro de un polígono describe ese índice parcial; no demuestra horarios, cupos, acceso peatonal o que una familia pueda prescindir de vehículo. No tener puntos indexados no equivale a no tener servicios. Conservar la fecha propia del snapshot y atribución OpenStreetMap/ODbL.

Fuentes oficiales adicionales comprobadas para futuras ampliaciones, sin promesa de integración en este importador:

- [ANEP: centros educativos](https://catalogodatos.gub.uy/dataset/anep-centros-anep), SHP/RAR, metadata abril de 2026, licencia CC0. Cobertura de los centros de ANEP, no de toda la oferta educativa.
- [Policlínicas de la Intendencia de Montevideo](https://catalogodatos.gub.uy/dataset/ubicacion-de-policlinicas), CSV y metadata; no equivale al sistema de salud completo.
- [Horarios interdepartamentales y metropolitanos del MTOP](https://catalogodatos.gub.uy/dataset/ministerio-de-transporte-y-obras-publicas-horarios-de-omnibus-en-lineas-interdepartamentales), CSV, metadata junio de 2026. Requiere validar paradas, calendarios y vigencia antes de calcular viajes.
- [Accesibilidad de veredas de Montevideo](https://catalogodatos.gub.uy/dataset/datos-de-accesibilidad-de-veredas): geometría lineal y valores de diciembre de **2021**, aunque la ficha haya sido modificada en 2024; `null` significa sin relevar. No presentar esa fecha de ficha como una inspección actual de toda la ciudad.

Las capas de precios, servicios y delitos deben mantener sus fechas, escalas y limitaciones visibles por separado. Este módulo no deriva una puntuación de «seguridad», no ordena hogares por características demográficas y no utiliza precios como sustituto de delitos.
