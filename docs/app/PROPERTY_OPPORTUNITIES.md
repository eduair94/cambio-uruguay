# Oportunidades inmobiliarias

Implementación del 2026-09-06. Página pública: `/oportunidades-inmobiliarias-uruguay`. API: `GET /api/property-opportunities?operation=rent|sale`.

## Qué significa un resultado

Es un anuncio cuyo precio pedido queda por debajo de una muestra de anuncios comparables recientes. No es una tasación, un precio de cierre ni una garantía de rentabilidad. La aplicación muestra los comparables y sus fuentes para que la persona pueda comprobar la evidencia. Los parámetros siguientes son decisiones conservadoras del producto, no umbrales de precisión certificados por una norma.

El motor exige la misma operación, departamento, localidad explícita, barrio, tipo de vivienda, dormitorios, baños y clase de superficie. La superficie admite una diferencia de hasta 15 %. Se separan los atributos publicados de garaje, mobiliario, estado nuevo/usado, acceso, disposición y amenities; lo desconocido no se convierte en ausencia. Para casas se exige superficie construida; un terreno conocido debe ser compatible. La antigüedad máxima de lectura es de tres días de calendario UTC.

La comparación tiene entre 8 y 24 anuncios independientes, al menos cuatro publicadores y como máximo dos anuncios por publicador. Se retiran posibles copias de la evidencia estadística sin modificar el agrupamiento ni las fichas del directorio de alquileres. Una dirección, imagen o descripción repetida no basta para afirmar que dos inmuebles sean el mismo.

El precio debe quedar al menos 15 % por debajo de la mediana, 5 % por debajo del primer cuartil y 10 % por debajo de la mediana por m². El rango intercuartílico no puede superar 30 % de la mediana. Diferencias superiores a 45 % se reservan para revisión y no se anuncian como oportunidades. En alquiler se compara renta más gastos comunes explícitos, convertido a UYU con una referencia única del ciclo; la renta sola también debe ser al menos 10 % menor. En venta se compara el precio pedido en USD.

Se excluyen datos insuficientes y contradicciones materiales, además de indicios explícitos de precio parcial, proyectos, varias unidades, ocupación, derechos restringidos, reformas, temporada y costos obligatorios omitidos. La ausencia de esos indicios no certifica el estado real. «Más sólida» significa al menos 12 comparables, seis publicadores y dispersión de hasta 20 %; describe evidencia relativa, no probabilidad de ganar dinero.

El rango P25–P75 describe los precios centrales de la muestra, no un intervalo de confianza. Los filtros y el presupuesto seleccionan resultados ya calculados: nunca alteran la mediana para fabricar un descuento. Cada operación conserva su muestra y moneda. El tamaño de una fuente cuenta identificadores de anuncios observados, no viviendas únicas ni la totalidad del mercado.

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

## Validación

Las pruebas del motor incluyen precios condicionados, GC inconsistentes, superficies incompatibles, contradicciones de atributos, copia de evidencia, independencia de publicadores y fechas. Las del servicio comprueban contratos entre paquetes, separación de operaciones, proyección pública, conservación de snapshots y estados 200 vacío/503. Las de interfaz verifican filtros con carga pendiente, moneda/presupuesto, evidencia y drawer a 320, 390 y 1440 px. Los fixtures no sustituyen la revisión de capturas reales y la comprobación pública después de desplegar.

Referencias profesionales y decisiones de interfaz: [investigación](../research/PROPERTY_OPPORTUNITIES.md). El método deberá volver a validarse al cambiar fuentes, campos, cohortes o umbrales.
