# Oportunidades inmobiliarias: evidencia y diseño

Revisión del 6 de septiembre de 2026. Extensión operativa de Cambio Uruguay; no una tasación ni una predicción de rentabilidad.

## Evidencia primaria

- [Mercado Libre Uruguay: inmuebles](https://www.mercadolibre.com.uy/c/inmuebles) separa operación, tipo y ubicación, incorpora mapa y novedades. Su [buscador de venta](https://listado.mercadolibre.com.uy/inmuebles/venta/) distingue propiedades individuales de emprendimientos. La recuperación directa del listado recibió 403 en esta revisión; se contrastó el contenido indexado y la página principal. Sus cantidades no prueban viviendas únicas ni cobertura completa.
- [InfoCasas: venta](https://www.infocasas.com.uy/venta) publica precios «desde», desarrollos y unidades individuales juntos. Se observaron anuncios con precio sujeto a adelantos, garaje y conexiones aparte, fotos de showroom, superficie construida y superficie exterior distintas, y venta con inmueble ocupado. También hay textos que mencionan alquiler y venta simultáneamente. Por eso un número bajo no basta para destacar un aviso.
- [Zillow: explicación de Zestimate](https://www.zillow.com/zestimate/) expone fuentes, rango e incertidumbre; reconoce que datos incompletos pueden impedir publicar una estimación. Se toma la transparencia como referencia de interfaz. No se traslada su modelo ni su precisión estadounidense a Uruguay.
- [Redfin: explicación del estimador](https://www.redfin.com/redfin-estimate) diferencia precio estimado de tasación profesional y explica selección de comparables próximos con características similares. Usa ventas efectivas y MLS, datos que nuestro índice de anuncios no sustituye.
- [IAAO: Standard on Automated Valuation Models, revisión de julio de 2018](https://www.iaao.org/wp-content/uploads/Standard_on_Automated_Valuation_Models.pdf) distingue calidad y representatividad de datos, control de muestras, valores atípicos, validación y documentación. Es una referencia profesional para separar comparación descriptiva y valoración validada; esta página no afirma ser un AVM certificado ni cumplir una norma de tasación uruguaya.

## Necesidades y decisiones

La necesidad explícita del usuario es encontrar alquileres y compras con precios bajos frente a comparables, y poder modificar filtros sin volver arriba. Las siguientes son inferencias de producto, no resultados de entrevistas: comprender el costo relevante; verificar por qué se destaca una vivienda; detectar condiciones que explican el precio; abrir la evidencia; compartir una búsqueda reproducible.

- Ruta `/oportunidades-inmobiliarias-uruguay`, operación Alquiler/Venta siempre visible. Se mantienen superficies, tipografía y controles del sitio.
- Sidebar de filtros en escritorio. En móvil, botón persistente y drawer lateral con cierre, foco contenido, scroll independiente y acciones fijas. Una columna evita cortar etiquetas a 320 px; campos de 16 px y acciones de al menos 44 px.
- Filtros por operación, departamento, barrio, tipo, dormitorios, presupuesto y calidad de comparación; orden y página en URL. El alquiler usa costo mensual con gastos comunes explícitos; venta, precio publicado en USD. Cambiar operación limpia un presupuesto incompatible.
- Resultado: foto real atribuida, ubicación, características, precio publicado, porcentaje frente a la mediana, cantidad de comparables, rango central P25–P75, fecha de lectura y motivos. La mediana significa el precio central de los anuncios comparados, no valor de mercado certificado.
- Desplegable dentro del resultado para revisar anuncios comparables con precio, superficie, características, fuente, lectura y enlace. No se oculta la evidencia en un modal. Ficha propia para alquiler; aviso original para compra.
- Estados de carga, error recuperable, sin resultados con filtros y sin base suficiente. No llenar una búsqueda vacía con «oportunidades» que incumplen el método.

## Método acordado para la primera versión

Misma operación, tipo, dormitorios, baños, localidad y barrio; misma clase de superficie y diferencia de área de hasta 15 %. Mínimo ocho comparables, dispersión intercuartílica/mediana de hasta 30 %. Candidato al menos 15 % por debajo de la mediana y 5 % por debajo de P25. Diferencia superior a 45 % queda como anomalía a revisar, no destacada. No se ajustan valores mediante coeficientes inventados de precio/m².

Separar el candidato de su cohorte y evitar repeticiones como evidencia independiente. Rechazar contradicciones materiales, precios condicionados, proyectos sin unidad determinada y operaciones/derechos incompatibles cuando hay evidencia explícita. Ausencia de una condición no demuestra su ausencia real: conservar limitaciones visibles y enlaces para revisar estado, ocupación, precio final, gastos de compra/entrada y disponibilidad.

«Confianza» describe solidez de la comparación (muestra, similitud, frescura y dispersión), no probabilidad calibrada de beneficio. El rango central describe anuncios observados; no es un intervalo de confianza estadístico ni garantiza precio de cierre. Las cantidades de fuente cuentan avisos leídos, no todo el mercado. La última lectura no certifica disponibilidad.

## Integración y verificación

### Ampliación solicitada el mismo día

El usuario señaló que cuatro resultados no satisfacían la necesidad de explorar el mercado. La revisión separó ventajas de precio total y por m², y añadió un nivel exploratorio con una muestra menor claramente identificada. La selección física de la cohorte precede al precio; se conserva el mismo grupo para ambas métricas y se mide la sensibilidad al retirar cada anunciante. No se amplían barrios ni se asignan primas monetarias inventadas a amenities.

Las guías de [comparables de Fannie Mae](https://selling-guide.fanniemae.com/sel/b4-1.3-08/comparable-sales) priorizan características físicas y ubicación, mientras que las [instrucciones de ajustes](https://guide-selling.fanniemae.com/sel/b4-1.3-09/adjustments-comparable-sales) requieren justificación de mercado. Esas guías trabajan con tasaciones y transacciones: no validan nuestros umbrales de anuncios. Aquí sirven para mantener visible la similitud, abstenerse ante contradicciones y explicar qué desconocemos. La política de cinco anuncios exploratorios es propia, no un mínimo profesional trasladado a Uruguay.

Los contrafactuales se evaluaron sobre capturas reales y luego se revisaron los textos de candidatos. Se encontraron falsos atractivos que no podían resolverse bajando un umbral: anuncios ocupados, unidades de referencia, costos aparte y superficies incompatibles. Se añadieron regresiones sobre esas variantes antes de publicar el método ampliado. Los resultados describen precios pedidos; aun una diferencia estable puede deberse al estado, exterior u otras características no disponibles.

API con snapshot fechado, cobertura por operación, filtros disponibles, resultados y paginación. La UI consume el resultado del motor; no recalcula descuentos con otro universo. Se preservan fuente, moneda, clase de superficie y costos de cada aviso. Sin datos de contacto privados ni inferencias demográficas.

Raíz mantiene API, navegación, catálogo de herramientas y metadatos. Esta tarea implementa página, componentes y mensajes dedicados. Verificar URL compartible, limpieza de presupuesto al cambiar operación, drawer tras scroll, Escape/foco, comparables sin desbordamiento, estados vacíos/error y temas claro/oscuro en 320/390/1440 px. Separar pruebas sintéticas de la verificación pública posterior al despliegue.
