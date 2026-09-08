---
version: 1
slug: "app-pages-analisis-alquileres-uruguay-vue"
primary_target: "app/pages/analisis-alquileres-uruguay.vue"
related_targets: ["app/components/rentals/PriceEstimator.vue", "app/utils/rentalAnalysisMessages.ts", "app/utils/rentalEstimateMessages.ts"]
---

# Análisis de alquileres: explorar y estimar

Modo Operate con lectura de contexto. Personas que buscan o publican un alquiler en Uruguay,
especialmente en barrios de Montevideo, desde el celular o comparando en escritorio.

Extiende la identidad existente. Un explorador de rangos por zona precede a una hoja de estimación
de la vivienda. Filtros explícitos conservan tipo, dormitorios y moneda; las filas muestran valores
y tamaño de muestra junto a sus gráficas. Se ofrece el costo mensual sólo donde se conocen gastos.
La relación con ingresos es una simulación local con proporción elegida por la persona.

La estimación contrasta una vivienda con avisos de características compatibles y expone las fuentes.
Se abstiene ante una muestra insuficiente o dispersa. Cambiar datos elimina un resultado anterior;
ninguna cifra representa contratos cerrados, vacancia, demanda ni un precio óptimo garantizado.

Primera visita clara; se conserva la preferencia oscura. Las gráficas tienen valores legibles sin
color ni tooltips; en móvil se recomponen sus filas. Carga, error y ausencia de evidencia son estados
distintos. No se ilustran resultados reales con datos de demostración.

Ampliación 2026-09-08: navegación por secciones, percentiles y media, dispersión con alternativa
tabular, bandas de superficie y cobertura de atributos/fuentes. El usuario descarga agregados CSV
y revisa hasta treinta comparables, seis visibles inicialmente. El presupuesto agrega costos
ingresados localmente y escenarios mensuales/anuales constantes. Hasta tres barrios se contrastan
con precios de la misma moneda y contexto independiente INE/OSM/MI, con fechas y cobertura al lado;
no se infieren alias, distancias, efectos causales ni puntajes de seguridad.

Mapa integrado 2026-09-08: acceso principal junto al estimador y enlace directo #mapa-alquileres.
Se abre bajo los filtros y descarga geometrías y Leaflet sólo al solicitarlo. La media y mediana
usan la misma moneda y selección del análisis; denuncias MI y servicios OSM son capas separadas,
con período/fecha propios y lista accesible equivalente. Sólo se unen nombres oficiales exactos;
menos de ocho viviendas o datos ausentes se muestran neutros. El mapa sigue disponible aunque la
selección no tenga alquileres. El estimador reutiliza las zonas recibidas y los formatos de cifras
se crean una vez por moneda e idioma. Los catálogos de otras rutas no bloquean esta pantalla.
