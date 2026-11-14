# Mejoras competitivas de experiencia para Cambio Uruguay

Relevamiento del 3 de noviembre de 2026. Alcance: cotizaciones y cambio de moneda, alquileres, precios de supermercado y descuentos con tarjetas.

La prioridad es que cada persona encuentre una respuesta consistente para su monto, su zona y sus condiciones, y pueda actuar desde esa misma pantalla. Cambio Uruguay ya tiene conversores, históricos, mapas, favoritos, alertas y filtros especializados. La ventaja de varios referentes está en cómo presentan y conectan esas capacidades: el importe que recibe la persona, el costo mensual de una vivienda o el beneficio que corresponde a su tarjeta.

Las observaciones de la tabla describen funciones visibles en páginas públicas. Las adaptaciones y la valoración de impacto son decisiones propuestas para nuestro producto, no efectos demostrados sobre tráfico o preferencia. Algunas respuestas públicas contienen capturas de fechas anteriores: sirven para comparar recorridos y presentación, pero no para comparar cotizaciones o inventarios simultáneos.

## Atributos útiles observados

| Referente | Observación | Adaptación para Cambio Uruguay |
| --- | --- | --- |
| [Dólar Claro](https://dolarclaro.com/uy/casas-de-cambio/) | Explica las puntas como lo que pagás y lo que te pagan. Incluye canal o ciudad, hora por fila y enlace a la fuente. Declara retirar de la tabla fuentes con más de 48 horas sin lectura. | Usar lenguaje según la operación y hacer trazable cada resultado. Distinguir una lectura vieja de una pizarra que no cambia: son situaciones diferentes. |
| [DólarAhora](https://www.dolarahora.uy/) | Muestra compra, venta, spread y punto medio. Separa el momento de lectura del último cambio de cada punta. | Mantener visibles ambas fechas cuando se disponga de ellas; una consulta reciente no demuestra que la fuente haya actualizado su precio. |
| [PesosSabios](https://pesossabios.com/) | Ofrece monto editable y selección Comprar o Vender. Cada alternativa muestra el importe completo y su diferencia respecto de la primera. Aparta del ranking una institución sin datos recientes. | Traducir las tasas a resultados para el monto elegido y mostrar cuánto cuesta elegir otra alternativa. Respetar canal, departamento y moneda del cálculo. |
| [Dólar Uruguay](https://dolaruruguay.uy/comprar-dolares) | La página para comprar explica qué punta mirar y ordena las alternativas para esa intención. El [registro de cambios](https://dolaruruguay.uy/cambios) presenta valores anteriores y nuevos. | Ordenar la información según la intención. Aprovechar nuestros históricos y últimos cambios, sin crear una segunda herramienta equivalente. |
| [Wise](https://wise.com/es/currency-converter/usd-to-uyu-rate) | Coloca el seguimiento del tipo de cambio junto al conversor; ofrece gráfico por período y estadísticas. Identifica su tasa como tipo medio de mercado. | Conectar el resultado con una alerta preseleccionada y su histórico. El tipo medio sirve como referencia y no debe presentarse como una cotización obtenible en una casa local. |
| [InfoCasas](https://www.infocasas.com.uy/alquiler/inmuebles/montevideo) | Las tarjetas presentan alquiler, gastos comunes cuando están informados, dormitorios, baños y superficie. Algunas llevan la etiqueta de baja de precio. | Dar prioridad visual al costo mensual conocido y a los atributos decisivos. Toda baja debe surgir del historial de la misma oferta; un precio desconocido no equivale a cero. |
| [Casasweb](https://casasweb.com/) | Organiza la entrada por alquileres, ventas y alojamientos temporales. Su buscador permite elegir zona, barrio, ciudad o departamento y ofrece accesos por tipo de inmueble. | Hacer explícita la intención residencial o comercial antes de recorrer resultados. Mantener la búsqueda amplia disponible y respetar filtros guardados. |
| [Gallito](https://www.gallito.com.uy/inmuebles/apartamentos/alquiler) | Permite guardar búsquedas y activar novedades por correo. Expone filtros de zonas, precio, dormitorios y características del inmueble. | Mejorar el descubrimiento de nuestras búsquedas guardadas y alertas existentes. Guardar una búsqueda y suscribirse a novedades deben seguir siendo acciones distintas. |
| [SIPC](https://www.precios.uy/preguntas-frecuentes/) | Su documentación describe una canasta elegida por la persona, con cantidades por producto y consulta por dirección o departamento. Presenta precios y total por establecimiento. | Añadir una comparación de la lista personal que preserve cobertura, fechas y unidades. El subtotal de un comercio al que le faltan productos no puede competir como si fuera una canasta completa. |
| [Bankos](https://bankos.uy/) | Presenta un recorrido de elegir tarjetas, ver lo que sirve hoy y encontrar comercios en el mapa. La selección no pide el número de tarjeta. | Permitir elegir las tarjetas en la misma página donde se consulta el beneficio cercano. La disponibilidad efectiva para hoy requiere condiciones verificadas. |
| [Tarjetazo](https://tarjetazo.uy/) | Parte de buscar el comercio y elegir tarjetas. Sus beneficios muestran restricciones por productos concretos, como Platinum, Black o Infinite; permite guardar preferencias en el navegador. | Separar emisor, crédito o débito y producto concreto cuando la fuente lo identifique. No prometer un descuento por compartir banco si sólo corresponde a ciertas tarjetas. |

## Capacidades propias que conviene aprovechar

- **Cambio de moneda.** La [portada](https://cambio-uruguay.com/) ya ofrece monto, monedas, casa elegida, filtros online o presencial y por departamento, ahorro contra el promedio e históricos. El [código de la portada](../../app/pages/index.vue) permite reutilizar ese estado para calcular el resultado de cada alternativa. [Mi lista](../../app/pages/mi-lista.vue) ya conserva preferencias de zona, casas y tarjetas y ofrece seguimiento; la mejora es conectar esos recorridos.
- **Alquileres.** El [directorio](../../app/pages/alquileres-uruguay.vue) contiene búsquedas guardadas, favoritos, mapa, alertas y cálculo del total mensual cuando la oferta aporta los datos necesarios. Los [filtros](../../app/components/rentals/SearchFilters.vue) incluyen tipos residenciales y comerciales. No hace falta reconstruir estas funciones: corresponde aclarar la intención inicial y revisar su visibilidad en móvil.
- **Supermercados.** La [página de precios](https://cambio-uruguay.com/precios-de-supermercado-uruguay) ya distingue fechas, precios por unidad y cobertura. Su [canasta de comparación](../../app/pages/precios-de-supermercado-uruguay.vue) es fija y evita favorecer locales por productos faltantes. La lista de compras de meal prep es otra capacidad existente: una canasta personal debería conectarse con ella cuando corresponda, sin confundir un plan de comidas con una compra libre.
- **Descuentos.** El [mapa actual](https://cambio-uruguay.com/descuentos-con-tarjeta-uruguay) permite seleccionar varias tarjetas, diferencia crédito y débito y guarda la elección en el navegador. Atribuye los datos a Bankos y advierte sobre días y topes. La consulta [¿Tengo descuento acá?](https://cambio-uruguay.com/descuentos-con-tarjeta-uruguay/cerca-de-mi), en la versión pública relevada, obliga a quien llega sin tarjetas a ir al mapa, elegirlas y volver: esa interrupción es corregible con el estado existente.

## Cambios implementados localmente

Estas tres mejoras están implementadas en el árbol local, sin publicación. Pasaron 148 pruebas de cotizaciones y conversión, 8 del importe por alternativa y 26 de descuentos y preferencias, además de la revisión de estilo de los archivos modificados. Los cuatro recorridos nuevos de navegador quedaron preparados, pero no pudieron completarse: el servidor local respondió `503 Dev server is unavailable` incluso después de compilar Nitro y reiniciar con conexión TCP. No se ejecutó una compilación de producción ni un despliegue; queda pendiente verificar esos recorridos en un entorno funcional antes de publicar.

Los dos componentes nuevos de comparación se revisaron además en una vista aislada con Vue, Vuetify y datos demostrativos: 390 y 1440 píxeles, temas claro y oscuro, sin errores ni desbordes. La prueba de una columna de 87 píxeles detectó un corte dentro del importe; se corrigió separando la indicación de moneda de la cifra y ajustando la tipografía. Esta revisión visual usa los componentes reales, pero no sustituye la comprobación del recorrido completo en Nuxt.

| Cambio | Problema concreto | Criterio de aceptación |
| --- | --- | --- |
| Coherencia de las cotizaciones recomendadas | La portada pública relevada anunciaba un dólar desde $40,63, pero premiaba a Baluma a $39,55 en otra sección y calculaba $3.955 para obtener USD100. La cotización llevaba una advertencia de 118 días sin movimiento. | Titular, recomendación, ranking y conversor comparten la elegibilidad de las cotizaciones. Una fila descartada del premio puede seguir visible con explicación. No se elimina una pizarra sólo por permanecer inmóvil. |
| Importe por alternativa en la portada | Las tarjetas de mejores precios obligan a transformar mentalmente la tasa al monto propio. | Cada alternativa elegible muestra cuánto se paga o recibe y la diferencia respecto de la mejor del mismo conjunto. El resultado conserva la moneda, la dirección y los filtros; no se llama neto si no incluye comisiones. |
| Selección de tarjetas dentro de la consulta cercana | La primera visita exige abandonar la página para completar una preferencia necesaria. | Se pueden elegir o modificar tarjetas allí mismo, conservando la selección compartida. La ubicación se solicita al usar la acción correspondiente y la selección no exige datos bancarios sensibles. |

La inconsistencia de cotizaciones tiene una causa identificada en el estado inicial del código: el titular usa `rankUsableQuotes` de [currencyPages.ts](../../app/utils/currencyPages.ts), mientras algunos cálculos y listas de la portada partían de las filas públicas sin esa evaluación. La corrección debe reutilizar la política existente y mantener la distinción entre un precio fuera del mercado y uno sin cambios recientes.

## Prioridades por impacto y esfuerzo

El impacto expresa qué problema del recorrido se espera resolver. El esfuerzo es relativo a la infraestructura ya disponible, sin estimar días ni aumentos de visitas.

| Orden | Trabajo | Impacto esperado y fundamento | Esfuerzo | Estado |
| --- | --- | --- | --- | --- |
| P0 | Unificar elegibilidad de cotizaciones | Alto sobre confianza: evita que dos resultados de la misma página se contradigan. | Medio: afecta varios consumidores del mismo dato. | Implementado localmente. |
| P1 | Mostrar importes y diferencias por alternativa | Alto sobre comprensión: permite elegir con el monto real, aprovechando el conversor actual. | Bajo a medio. | Implementado localmente. |
| P1 | Elegir tarjetas en la página de cercanía | Alto sobre completar la consulta inicial: elimina la ida y vuelta obligatoria. | Bajo: reutiliza preferencias y catálogo. | Implementado localmente. |
| P1 | Aclarar vivienda frente a local u oficina | Alto para quien busca hogar: reduce resultados ajenos a su intención. | Medio: exige coherencia entre lista, mapa, URL y búsquedas guardadas. | Propuesto. |
| P2 | Unir resultado de cambio con fuente, sucursal y alerta | Medio sobre acción y retorno: conecta funciones que ya existen. | Medio. | Propuesto. |
| P2 | Canasta personal con cantidades y cobertura comparable | Alto para compras recurrentes: responde cuánto cuesta la compra propia. | Alto: requiere contrato de cantidades, cobertura y precios por local. | Propuesto. |
| P2 | Beneficios por tarjeta concreta, día y tope | Alto sobre exactitud cuando las condiciones se conocen; evita falsas expectativas. | Alto: depende de información verificable y mantenimiento. | Propuesto. |

## Condiciones para las siguientes etapas

**Alquiler residencial.** Dar una entrada explícita para vivienda y otra para local u oficina, conservando la consulta general. Un enlace compartido o una búsqueda guardada debe conservar su intención. Revisar que lista, mapa y alertas recuperen los mismos filtros. Mantener el total de alquiler más gastos comunes junto a su alcance: no incluye automáticamente servicios ni gastos de entrada, y un gasto desconocido no cuenta como cero.

**Resultado de cambio que permite actuar.** Mostrar qué institución y canal sostienen el importe, enlazar la fuente o las sucursales y ofrecer el histórico y una alerta con la operación elegida. Conservar una vía alternativa cuando no hay sucursal conocida o no se dispone de una cotización elegible. No prometer disponibilidad física por una lectura reciente de la pizarra.

**Canasta personal.** Permitir productos y cantidades, guardar la lista en el dispositivo y comparar por zona. Separar canastas completas de subtotales y mostrar los faltantes. Para comparar locales con cobertura parcial, usar el mismo conjunto de productos y cantidades o declarar que no son comparables. Mostrar antigüedad y presentación del producto; un precio por kilo no sustituye el precio del envase que efectivamente se compra.

**Tarjeta y beneficio efectivos.** Mantener la selección simple por emisor y tipo donde eso es todo lo que la fuente permite. Cuando exista evidencia, añadir producto, vigencia, días, porcentaje, tope y canal de pago. Si falta una condición decisiva, ofrecer el texto original y la verificación en la fuente, sin afirmar que el beneficio aplica hoy. Bankos continúa siendo una fuente atribuida, no una marca propia.

## Cómo medir si la experiencia mejora

La pregunta medible es si más personas completan la tarea que iniciaron. Más páginas vistas o más tiempo dentro del sitio no demuestran por sí solos una mejora: un recorrido más corto puede ser mejor. Los eventos siguientes son una propuesta de medición, salvo las capacidades que ya estén instrumentadas; hay que contrastarlos con [useTrack](../../app/composables/useTrack.ts) antes de agregarlos.

| Mejora | Indicador principal | Comprobación de calidad |
| --- | --- | --- |
| Cotizaciones coherentes | Discrepancias entre resultados para el mismo conjunto de datos, moneda, canal y operación. | Ninguna discrepancia en los casos de prueba; incluir extremos, datos insuficientes y precio inmóvil que sigue siendo válido. |
| Importes por alternativa | Proporción de sesiones que pasan de una conversión válida a abrir una casa, fuente o sucursal. | Revisar importes y moneda con compra, venta, cambio de dirección y filtros. Un clic no prueba que se haya realizado una operación. |
| Tarjetas en la consulta cercana | Proporción de primeras visitas sin selección que llegan a una consulta de beneficios completada. | Separar consulta con coincidencias, sin coincidencias, permiso de ubicación rechazado y error. Un resultado vacío correcto también completa la consulta. |
| Intención de alquiler | Proporción de búsquedas residenciales que llevan a abrir o guardar una vivienda compatible. | Comprobar tipos mostrados y equivalencia de lista, mapa y alertas. Una preferencia guardada no debe desaparecer al volver. |
| Canasta personal | Proporción de listas válidas que alcanzan una comparación entre locales; reutilización posterior de listas guardadas. | Informar cobertura y faltantes; medir comparaciones completas y parciales por separado. |
| Beneficios específicos | Proporción de consultas que llegan al detalle de un beneficio con condiciones suficientes para la selección. | Revisar falsos positivos por producto, día, vigencia o tope y la proporción de condiciones desconocidas. |

Registrar una línea de base antes de publicar y comparar ventanas equivalentes por dispositivo, origen de llegada y tarea. En métricas de uso, contar sólo las sesiones cuya medición esté permitida y no extrapolarlas a toda la audiencia. No enviar montos personales, correos, números de tarjeta, búsquedas libres ni coordenadas precisas para medir estos pasos.

La medición de adquisición es complementaria. Los cambios orientados a tráfico deben registrarse en [experiments.json](../seo/experiments.json) en el mismo commit que se publique y seguir la evaluación definida en [REVENUE_PLAN.md](../analytics/REVENUE_PLAN.md). No asignar un resultado a una variación cruda de clics sin considerar el crecimiento general del sitio, ni prometer aumentos antes de medirlos.
