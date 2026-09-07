# Oportunidades inmobiliarias

Implementación del 2026-09-06. Página pública: `/oportunidades-inmobiliarias-uruguay`. API: `GET /api/property-opportunities?operation=rent|sale`.

## Qué significa un resultado

Es un anuncio cuyo precio pedido queda por debajo de una muestra de anuncios comparables recientes. No es una tasación, un precio de cierre ni una garantía de rentabilidad. La aplicación muestra los comparables y sus fuentes para que la persona pueda comprobar la evidencia. Los parámetros siguientes son decisiones conservadoras del producto, no umbrales de precisión certificados por una norma.

El motor exige la misma operación, departamento, localidad explícita, barrio, tipo de vivienda, dormitorios, baños y clase de superficie. La muestra habitual admite hasta 15 % de diferencia de superficie. Se separan los atributos publicados de garaje, mobiliario, estado nuevo/usado, acceso, disposición y amenities; lo desconocido no se convierte en ausencia. Para casas se exige superficie construida; un terreno conocido debe ser compatible. La antigüedad máxima de lectura es de tres días de calendario UTC.

La comparación estricta tiene entre 8 y 24 anuncios independientes, al menos cuatro publicadores y como máximo dos anuncios por publicador. La versión 2 también muestra candidatos exploratorios desde cinco comparables y tres publicadores, con controles adicionales de estabilidad. Se retiran posibles copias de la evidencia estadística sin modificar el agrupamiento ni las fichas del directorio de alquileres. Una dirección, imagen o descripción repetida no basta para afirmar que dos inmuebles sean el mismo.

Para el nivel estricto, el precio debe quedar al menos 15 % por debajo de la mediana, 5 % por debajo del primer cuartil y 10 % por debajo de la mediana por m². El rango intercuartílico no puede superar 30 % de la mediana. Diferencias de precio total superiores a 45 % se reservan para revisión y no se anuncian como oportunidades. En alquiler se compara renta más gastos comunes explícitos, convertido a UYU con una referencia única del ciclo; la renta sola también debe ser al menos 10 % menor. En venta se compara el precio pedido en USD.

### Comparaciones exploratorias de la versión 2

La cohorte se elige **antes de mirar los precios**: primero atributos publicados compatibles y superficie ±15 % con al menos cinco comparables y tres publicadores; si no alcanza, superficie ±25 % con esos mismos mínimos; sólo si tampoco alcanza se permite una referencia contextual ±15 % con al menos ocho comparables y cuatro publicadores. No se cambia de cohorte porque una mediana dé poco descuento o mucha dispersión.

- **Menor precio total:** al menos 10 % menos que la mediana, no más que P25 y costo por m² no mayor; en alquiler la renta base también debe ser al menos 5 % menor. Al omitir sucesivamente los avisos de cada publicador, la diferencia debe seguir siendo al menos 5 % y el precio no puede superar el P25 de ninguna muestra resultante.
- **Menor precio por m²:** al menos 20 % menos que la mediana por m² y 10 % menos que su P25. El precio total y la renta base no pueden superar sus medianas. En alquiler también se exige una ventaja en la renta base por m², para que los gastos comunes de otros anuncios no fabriquen la señal. Al retirar cada publicador, la diferencia por m² debe seguir siendo al menos 15 % y el total no puede superar la mediana. Es el único criterio permitido cuando se amplía la superficie a ±25 %.
- **Referencia contextual:** conserva coincidencia de garaje, estado nuevo, acceso, disposición y planta baja. Sólo admite diferencias de información no publicada en mobiliario, piscina o gimnasio, que se muestran en cada comparable. Requiere los descuentos de precio total del nivel estricto y una diferencia de al menos 10 % al retirar cada publicador; siempre se presenta como exploratoria.

Una tarjeta puede tener ambas señales, calculadas con una única cohorte; no se duplica el anuncio. El rango por m² tiene su propia mediana y cuartiles: no se divide la mediana del precio total para inventar esa referencia. La retirada de publicadores mide sensibilidad, no una probabilidad ni un intervalo de confianza. La interfaz permite filtrar por criterio y por nivel de evidencia y ordena primero el nivel estricto. Los criterios nuevos son decisiones de producto que requieren seguimiento con lecturas posteriores; no se atribuyen a una certificación profesional.

Se excluyen datos insuficientes y contradicciones materiales, además de indicios explícitos de precio parcial, proyectos, varias unidades, ocupación, reserva/venta ya declarada, derechos restringidos, reformas, temporada y costos obligatorios omitidos. La revisión ampliada incorpora unidades de referencia usadas para captar consultas, garajes opcionales, costos de conexiones, superficies privadas incompatibles y precios propios contradictorios de más de 1 %. La ausencia de esos indicios no certifica el estado real. «Más sólida» significa que se cumple el nivel estricto, con al menos 12 comparables, seis publicadores y dispersión de hasta 20 %; describe evidencia relativa, no probabilidad de ganar dinero.

El rango P25–P75 describe los precios centrales de la muestra, no un intervalo de confianza. Los filtros y el presupuesto seleccionan resultados ya calculados: nunca alteran la mediana para fabricar un descuento. Cada operación conserva su muestra y moneda. El tamaño de una fuente cuenta identificadores de anuncios observados, no viviendas únicas ni la totalidad del mercado.

Los gastos comunes propios exactos deben concordar con el campo estructurado dentro de 1 %; un importe expresamente aproximado, estimado o variable admite 10 %. Un intervalo publicado conserva los valores dentro de sus extremos. No se compara una superficie construida con otra total para declarar una contradicción; sí se retiran tamaños incompatibles cuando el texto identifica la superficie del inmueble sin referirse a patio, terraza o garaje.

## Datos y privacidad

- Alquiler: lectura de `rentallistings` en APP DB; únicamente hechos propios de cada oferta con `identity.version: 1`. No se reconstruyen atributos desde una ficha legacy. El trabajo no escribe en el directorio de alquileres.
- Cobertura de alquiler: cuenta identificadores únicos y recientes del universo enviado al motor, por fuente, conservando la última fecha propia observada. `RentalMeta.sources` describe la última corrida (puede ser un repaso horario pequeño), por lo que sus cantidades no representan ese universo y no deben publicarse como tamaño del análisis.
- Venta: lectura pública de InfoCasas, separada de alquileres. Recorrido estratificado por departamento y tipo, con posiciones distribuidas por fecha, nunca ordenado por precio bajo. Hasta 150 de las 500 páginas diarias profundizan apartamentos de Pocitos, Cordón, Centro, Tres Cruces y Parque Rodó: la muestra nacional inicial concentraba sus cohortes en pocas agencias. No se reetiqueta Pocitos Nuevo como Pocitos. Se verifican página efectiva, redirecciones, IDs únicos y colas que repiten contenido. El recorrido es parcial y se identifica como tal. La autorización de El País documentada para alquileres no se extiende automáticamente a ventas.
- `propertysalelistings` y `propertysalemetas`: datos privados de lectura de ventas. Las capturas parciales no permiten caducar anuncios por ausencia.
- `propertyopportunitysnapshots`: un documento público atómico por operación. Hasta 2.000 resultados y presupuesto de tamaño. La API hace una proyección explícita y no expone descripción privada, dirección, identidad, contactos ni metadatos internos.
- Los resultados con sujeto o comparables fuera de la ventana reciente se retiran también al consultar la API, aunque falle el trabajo de actualización. Una caída de más de 60 % del universo de entrada conserva el análisis anterior; una lista vacía con entrada saludable sí es válida.

## Ejecución y despliegue

Requiere `APP_MONGO_URI` explícita. No usa la base de la API ni la configuración local del frontend como alternativa. El puente es `classes/appdb.ts`.

- `currency-property-opportunities`: diario a las 06:21 UTC. `scripts/run-property-opportunities.sh` → `dist/sync_property_opportunities.js`. Venta: 500 páginas por defecto y límite de 20 minutos; `PROPERTY_OPPORTUNITIES_SALE_PAGES` ajusta el presupuesto. Una captura menor de 20 horas evita descargar de nuevo al registrar PM2.
- `currency-property-opportunities-hourly`: minuto 17, `--analyze-only`; recalcula con lecturas existentes sin cosechar portales.
- Ambos procesos comparten un `flock` propio; si está ocupado omiten la ejecución. No hay programación dentro del API en clúster. Ambos están registrados en `OTHER_APPS` del despliegue backend y el wrapper tiene filtro de cambios en CI.

Para inspeccionar sin escribir, ejecutar el entrypoint con `--dry-run --report=<archivo>`. `--sales-snapshot=<archivo>` usa una captura revisada de menos de 24 horas; conserva las fechas reales de cada anuncio. `--force-sales` fuerza nueva lectura. Un informe público contiene los snapshots por operación; una captura de fuente permanece privada y fuera de git.

El frontend utiliza caché por operación, después filtra y pagina en memoria. La página base es canónica y entra en navegación/búsqueda/sitemap; las variantes con parámetros son `noindex,follow`. La UI admite escritorio con sidebar y móvil con drawer lateral, botón persistente, foco contenido y restauración del scroll.

### Jerarquía y selección visible (2026-09-07)

Una única navegación ofrece alquiler, compra y alquileres económicos. Conserva ubicación, tipo, dormitorios y preferencia de disponibilidad entre modos; conserva los criterios de comparación entre alquiler y compra. No transfiere importes entre monedas ni arrastra la página anterior. Las consultas pendientes de barrios se invalidan al cambiar de modo.

El enlace para explorar el catálogo completo permanece visible en la cabecera a todos los anchos: alquileres para alquiler y presupuesto, viviendas en venta para compra. Comparación mantiene además el acceso a «Cómo funciona». Compactar el móvil nunca debe ocultar estas salidas. El bloque global de páginas relacionadas adapta sus destinos a la operación y ofrece recorridos hacia catálogos, guías y alternativas de presupuesto.

Las tarjetas priorizan motivo de selección, ubicación, costo mensual o precio pedido, título y características. El reporte comunitario permanece antes de las acciones. Los comparables y fundamentos completos se abren con un control nativo `details` que funciona con teclado, sin depender de hover. Las etiquetas se proyectan desde las señales existentes mediante `propertyOpportunityLabels`; no modifican cálculos, cohortes ni umbrales.

- «Menor costo mensual» / «Menor precio»: señal de precio total.
- «Menor precio por m²»: señal propia por superficie; su explicación conserva la mediana por m².
- «Comparación exploratoria»: siempre visible cuando corresponde, incluso si hay dos señales de precio.

El alquiler y los gastos comunes propios se desglosan como importes debajo de la comparación, sin añadir una etiqueta repetida.

Se muestran hasta tres etiquetas, con el criterio filtrado como principal. Cada explicación identifica diferencia, muestra y fuentes. Los análisis vencidos no muestran etiquetas favorables ni el descuento destacado. No se presentan exclusividad, demanda elevada ni historial de rebajas porque los datos actuales no los acreditan. Las etiquetas están traducidas a español, inglés y portugués.

La primera visita usa tema claro, incluso si el dispositivo está en oscuro. Una preferencia guardada de oscuro o sistema se conserva. El menú global tiene ancho definido desde SSR y permanece oculto hasta la hidratación; después conserva los gestos nativos. El monitoreo de errores se documenta en [SENTRY_ERRORS.md](SENTRY_ERRORS.md).

## Validación

Las pruebas del motor incluyen precios condicionados, GC inconsistentes, superficies incompatibles, contradicciones de atributos, copia de evidencia, independencia de publicadores y fechas. Las del servicio comprueban contratos entre paquetes, separación de operaciones, proyección pública, conservación de snapshots y estados 200 vacío/503. Las de interfaz verifican filtros con carga pendiente, moneda/presupuesto, evidencia y drawer a 320, 390 y 1440 px. Los fixtures no sustituyen la revisión de capturas reales y la comprobación pública después de desplegar.

Referencias profesionales y decisiones de interfaz: [investigación](../research/PROPERTY_OPPORTUNITIES.md). El método deberá volver a validarse al cambiar fuentes, campos, cohortes o umbrales.
