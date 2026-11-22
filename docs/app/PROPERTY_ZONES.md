# Comparar zonas para alquilar

La página `/barrios-alquileres-uruguay` permite comparar barrios y localidades antes de buscar vivienda. Está enlazada con alquileres, ventas, oportunidades, inmobiliarias y el planificador `/alquiler-ideal-uruguay`.

## Selección personal

El planificador admite hasta veinte zonas por conjunto, con departamento explícito: priorizar, buscar sólo allí o excluir. La preferencia utiliza el 10 % del puntaje entre opciones compatibles; no transforma una vivienda fuera de presupuesto en una opción viable. Un barrio desconocido no satisface una restricción positiva. Precio, zona y atributos siempre deben proceder del mismo anuncio. El directorio mantiene su selección múltiple dentro de un departamento; abrir, editar y cancelar el panel no modifica los filtros aplicados.

## Precios publicados

`classes/propertyzones/market.ts` es el motor único del agregado. Recibe observaciones de avisos residenciales con identidad propia, no datos prestados del grupo canónico. Sólo considera lecturas de los últimos diez días. Excluye ofertas no elegibles por las reglas vigentes del directorio, incluidos alquileres temporales y contradicciones de precio.

Una propiedad aporta una observación. Los identificadores de anuncios compartidos también se deduplican de forma transitiva. Se elige el aviso más reciente y luego su identificador estable; elegir el más barato sesgaría el resultado. No se deduce identidad por fotos, barrio ni precio.

Cada comparación conserva tipo de vivienda y dormitorios. Hay apartamentos y casas; dormitorios 0, 1, 2, 3, 4 o más y todos. Cambiar el presupuesto del usuario no recalcula la muestra. Se publican media, mediana, cuartiles y tamaño de muestra; cada indicador necesita ocho observaciones para mostrar una cifra. Es un umbral de producto, no una garantía de representatividad estadística. La media puede ser sensible a valores extremos; la mediana ofrece otra referencia.

El alquiler se convierte a pesos con el tipo de cambio del snapshot de alquileres. Gastos comunes desconocidos nunca equivalen a cero. Cero exige texto propio expreso, no una promoción temporal. Alquiler más gastos usa ambos datos del mismo aviso. El precio por metro cuadrado usa exclusivamente superficie construida explícita. Son precios pedidos, no contratos cerrados ni tasaciones. Véase [PROPERTY_ZONE_MARKET.md](PROPERTY_ZONE_MARKET.md).

## Geografías, servicios y denuncias

Los precios usan el barrio publicado por el anunciante. Para adjuntar límites oficiales se exige coincidencia del nombre y departamento, admitiendo únicamente diferencias de mayúsculas, tildes y espacios. No se fusionan nombres comerciales o barrios compuestos. Las zonas sin correspondencia conservan sus precios en la lista; no reciben un polígono inferido.

El mapa dispone de los 62 barrios de Montevideo definidos por INE 2011, compatibles con la geografía nativa del registro del Ministerio del Interior. Los servicios se cuentan dentro de esos polígonos desde el índice local OpenStreetMap. Son registros parciales: no son distancias a una vivienda, ni prueban que todos los comercios o recorridos estén presentes. No se publican distancias desde centroides de barrios.

Las denuncias corresponden a doce meses completos, incluyen tentativas y cinco categorías: hurto, rapiña, lesiones, violencia doméstica y abigeato. No incluyen homicidios, cuyo conjunto tiene otra unidad de observación y no identifica barrio. Para otras zonas sólo puede presentarse contexto departamental expresamente rotulado; no se colorean barrios con un total departamental. No hay tasas por población sin un denominador compatible verificado, ni puntaje de seguridad, ni predicción de riesgo personal. Ausencia de dato nunca significa cero. Fechas, licencias, cobertura y validación de las fuentes: [PROPERTY_ZONES_SOURCES.md](PROPERTY_ZONES_SOURCES.md).

## Luz, agua y reclamos

Las denuncias también se publican cada 1.000 clientes de UTE del mismo barrio (denominador de suministros, no de población) en las tarjetas y el filtro del directorio, por decisión del usuario del 2026-09-19; sigue sin haber puntaje de seguridad combinado. Capas propias de cortes de luz (libro de UTE que guardamos cada 10 minutos), cortes de agua programados de OSE y reclamos a la Intendencia de Montevideo, el barrio oficial de cada vivienda (`officialZone`), el filtro «Datos del barrio» del directorio y el análisis «¿Se paga en el alquiler?»: [PROPERTY_ZONE_SERVICES.md](PROPERTY_ZONE_SERVICES.md). A diferencia de los precios por barrio publicado, estas capas se vinculan también por alias medidos desde las coordenadas propias de los avisos, y lo dicen en cada zona.

## Actualización y publicación

Job `currency-property-zones`, `dist/sync_property_zones.js`, diario 06:53 UTC, un proceso con heap de 512 MiB y límite total de 25 minutos. Está registrado en `OTHER_APPS`. Nunca se ejecuta desde el servidor Express en cluster ni durante una visita.

La única conexión es `classes/appdb.ts` (`APP_MONGO_URI`). Colección `propertyzonesnapshots`, cuatro documentos por `_id`: `market`, `context`, `source-cache` y un bloqueo temporal `refresh-lock`. Cada documento publicado está limitado a 8 MiB. No se almacenan ingresos, destinos personales, direcciones de viviendas, contactos, descripciones ni microdatos de delitos en estos snapshots.

El mercado lee un cursor proyectado con límite de 100.000 propiedades, 200.000 observaciones y 128 MiB de observaciones compactas. Superar cualquier límite cancela la captura; nunca se publica una muestra truncada. Rechaza capturas inferiores a 200 viviendas, con menos de diez cohortes o una caída a menos del 40 % del volumen anterior. La lectura de servicios exige la cantidad exacta de puntos de la generación activa.

La fuente de delitos consulta primero metadatos oficiales. Si no cambió la versión, reutiliza el agregado validado. Si cambió, procesa el CSV completo en streaming y conserva sólo agregados anuales. Las fuentes se actualizan de forma independiente: un fallo de delitos no impide actualizar precios; una nueva lectura de precios no renueva el período de delitos. Cambiar la versión geométrica impide reutilizar conteos incompatibles. Los fallos devuelven salida no exitosa para que el operador los pueda detectar, conservando la última lectura válida.

La API Nuxt lee exclusivamente `market` y `context`, con caché corta compartida y proyección pública. No consulta portales, no recorre el catálogo ni descarga fuentes externas. Mercado: vigente hasta 36 horas, advertencia entre 36 y 72; después oculta cifras. Servicios: vigente hasta 14 días, advertencia hasta 45; después sin dato. Denuncias: período terminado hace hasta 180 días vigente, hasta 365 con advertencia; después sin dato. El período histórico siempre se muestra. Una capa ausente no oculta las otras.

Comandos operativos: `npm run sync_property_zones`; `--dry-run` lee y valida sin escribir; `--force-sources` vuelve a leer la fuente oficial. No ejecutar dos refrescos simultáneos: el bloqueo de APP DB vence a los 30 minutos y sólo su propietario lo libera.

### Delitos: el CSV se baja desde Uruguay (2026-11-22)

El catálogo (catalogodatos.gub.uy) le sirve el CSV de denuncias al VPS a ~80 KB/s y corta la conexión a los ~225 s: de 383 MB llegan 18. Desde Uruguay baja a 3,7 MB/s. Por eso el import también lee el archivo desde disco: `~/.cache/cambio-uruguay/crime/<id del recurso>.csv` en el VPS (`PROPERTY_ZONES_CRIME_DIR` cambia la carpeta), y sólo si pesa EXACTAMENTE lo que el catálogo declara para ese recurso. El nombre lleva el id, así que un archivo de una subida vieja nunca se lee como la nueva, y el contenido se valida igual que una descarga (encabezado, 12 meses, mínimo de eventos, ≤ 10 % sin barrio).

Cuando el Ministerio sube una versión nueva, el job falla con exit 1 (Sentry, «currency-property-zones exited with code 1») y deja en el log, y en Sentry Logs, la línea `[property-zones] crime CSV not imported (...): download <url> from Uruguay and copy it to <ruta> (exactly <N> bytes)`. Desde una máquina en Uruguay:

```sh
curl -fo <id>.csv '<url de esa línea>'          # verificar que pese <N> bytes
gzip -k <id>.csv
scp -P 2223 <id>.csv.gz root@104.234.204.107:/root/.cache/cambio-uruguay/crime/
ssh -p 2223 root@104.234.204.107 'cd /root/.cache/cambio-uruguay/crime && gunzip -f <id>.csv.gz'
ssh -p 2223 root@104.234.204.107 'pm2 restart currency-property-zones'   # o esperar a las 06:53 UTC
```

**La cobertura declarada puede ir un mes adelante del archivo**: la subida del 2026-10-20 dice «2013-01 – 2026-10» y su último evento es de 2026-09, así que la ventana declarada tiene 11 meses y se rechaza bien. El import prueba entonces la ventana que termina un mes antes (`previousCrimePeriod`), en la misma pasada; la ventana publicada es la que el archivo prueba completa, y `dataAsOf` la sigue. Dos meses adelante sigue fallando. El 2026-11-22 quedó Oct 2025 – Sep 2026: 84.985 denuncias en Montevideo, 874 sin barrio (1 %).

La subida del 2026-10-20 además cambió el id del recurso (`c8c4cc18…` → `4d76b716…`): el recurso se busca por su nombre publicado («Denuncias de otros delitos») bajo la ruta del propio dataset (`findCrimeResource`), con un único candidato o nada.
