# Planificar el alquiler del hogar

`/alquiler-ideal-uruguay` compara casas y apartamentos del directorio con el presupuesto y los destinos que introduce el hogar. La persona elige cuánto quiere destinar a alquiler y gastos comunes; el resultado ayuda a revisar las diferencias entre viviendas. El nombre de la página no certifica que exista una opción ideal, disponible o asequible para todos.

## Entrada y experiencia

Se admiten entre una y ocho personas. Cada una puede indicar su ingreso líquido mensual en pesos uruguayos, días de trabajo remoto y hasta cuatro destinos de trabajo, estudio u otras actividades. Un destino necesita un punto confirmado, frecuencia de cero a siete días por semana, medio de transporte y una distancia objetivo elegida por el usuario. La dirección sugerida por el buscador no se aplica sin confirmación.

El hogar fija su presupuesto mensual de **alquiler más gastos comunes** y registra por separado transporte, otros gastos y ahorro. Los ingresos se suman para mostrar el remanente y la proporción destinada a vivienda, y para priorizar opciones cuyo costo permite cubrir las reservas declaradas. No determinan cuánto debe aportar cada persona ni qué traslado merece más prioridad. Los días remotos son contexto: no se restan automáticamente de las visitas declaradas, que pueden corresponder a estudio, cuidados u otras actividades además del trabajo.

Los filtros permiten acotar las viviendas; la comparación ofrece prioridad equilibrada, de presupuesto o de cercanía. La elección de transporte orienta al usuario al definir su distancia objetivo. No se transforma en una velocidad supuesta ni calcula el costo del pasaje o del combustible.

## Catálogo y evidencia

El cálculo recorre el catálogo vigente que puede leer la aplicación, no sólo la primera página de resultados. Aplica los filtros a casas y apartamentos y selecciona un aviso compatible de cada ficha. Exige evidencia propia de la oferta (`identity.version: 1`), tipo compatible y elegibilidad de vivienda: un aviso legacy sin esa evidencia puede aparecer en otras búsquedas del directorio y quedar fuera del planificador. Alquiler, gastos comunes y condiciones proceden del **mismo aviso**; no se arma una oferta ficticia mezclando el precio de un portal con los gastos de otro.

Sólo se consideran lecturas dentro de la ventana de vigencia del directorio (`RENTAL_STALE_DAYS`, diez días en esta versión). Una última lectura reciente no prueba que la propiedad siga disponible. Los reportes de posible alquiler conservan su carácter de advertencia y pueden excluirse opcionalmente. Se debe consultar la fuente original y confirmar precio, gastos, garantía, unidad y disponibilidad con el anunciante.

Las distancias exigen una coordenada publicada respaldada por evidencia propia del aviso. No se sustituyen ubicaciones ausentes u ocultas por centros de barrio. Los datos contradictorios se abstienen de producir una distancia. El índice es parcial: fuentes inaccesibles, avisos recientes todavía no leídos y publicaciones fuera de los portales consultados pueden faltar. «Catálogo completo» describe el conjunto disponible para esta aplicación, no todo el mercado uruguayo.

## Cómo se ordenan las opciones

El motor puro vive en `app/utils/rentalFit.ts`; los tipos de entrada y respuesta están en `app/utils/rentalFitTypes.ts`.

1. **Presupuesto.** Para un total mensual conocido, `budgetScore = 100 / (1 + totalMensual / presupuestoElegido)`. El valor disminuye al aumentar el gasto respecto del presupuesto. Un resultado de 50 significa que el total coincide con el presupuesto introducido; no es un porcentaje de asequibilidad ni un umbral recomendado para Uruguay.
2. **Cercanía de cada persona.** Se calcula `cargaPersonal = suma(distanciaEnLíneaRecta / distanciaObjetivo × díasDeVisita) / 7`. El siete sólo normaliza las visitas semanales a una escala diaria de calendario: no supone una semana laboral de cinco días. Así, un destino con cinco visitas pesa más que uno con dos, también entre personas. Un destino con cero días no incrementa la carga. La suma puede superar siete visitas si existen varios trabajos o destinos, porque se cuentan desplazamientos independientes y no se inventa un calendario.
3. **Equilibrio dentro del hogar.** Se combinan por mitades la media de esas cargas personales y la mayor carga personal. `commuteScore = 100 / (1 + cargaCombinada)`. La media incluye a todas las personas del hogar con el mismo peso, independientemente de sus ingresos; quienes no tienen visitas aportan carga cero. Mantener ese denominador evita que pasar de pocas visitas a trabajo remoto empeore artificialmente el puntaje. La peor carga evita ocultar un traslado muy desfavorable detrás de una buena media.
4. **Prioridad elegida.** El puntaje combina presupuesto y cercanía: 50/50 en modo equilibrado, 75/25 al priorizar presupuesto y 25/75 al priorizar cercanía. Son decisiones transparentes de diseño, no un modelo estadístico validado de preferencias. Si nadie tiene destinos activos, sólo se compara el presupuesto.

El orden aplica tres pasos: primero opciones con datos completos; entre ellas, cuando se informan ingresos positivos, las que dejan un remanente mayor o igual a cero van antes de las que dejan déficit; dentro de cada grupo se usa el puntaje comparativo y luego la clave de la ficha como desempate estable. El salario puede cambiar esa prioridad financiera, pero nunca el peso de la cercanía de una persona. Las opciones con déficit continúan visibles si cumplen el techo manual; por eso un puntaje mayor puede aparecer después de una opción con remanente suficiente. Si todos los resultados tienen déficit, el componente presupuesto sigue prefiriendo costos menores.

Los resultados que requieren confirmar gastos o ubicación quedan después de los completos. Gastos comunes desconocidos no equivalen a cero: el total, remanente y proporción sobre ingresos permanecen desconocidos. Si faltan coordenadas y hay traslados activos, la cercanía queda sin calcular; no se redistribuye su peso para premiar esa ausencia. En un hogar sin destinos activos, una ubicación ausente no impide comparar el costo completo. La opción de incluir viviendas que superan el presupuesto no borra su advertencia.

El remanente es `ingresosLíquidos − alquiler − gastosComunes − transporteDeclarado − otrosGastosDeclarados − ahorroDeclarado`. Sin ingresos positivos declarados, el remanente y la proporción sobre ingresos quedan sin calcular y el orden financiero no se aplica. Un ingreso omitido aporta cero a la suma: completar sólo parte de los ingresos puede mostrar un déficit que no refleje la situación real del hogar. Depende de lo que se ingresó: no incluye automáticamente servicios, tributos, mudanza, comisión, depósito ni costos de entrada. No se usa una regla genérica del 30 % para aprobar viviendas ni se ofrece una garantía financiera.

## Distancias y viajes reales

La distancia usa la fórmula de Haversine desde el punto publicado hasta cada destino. Es aproximada y en línea recta: no incorpora trazado de calles, accesos, horarios, transbordos, tránsito, barreras físicas ni seguridad del recorrido. La suma semanal considera viajes independientes de ida y vuelta (`2 × distancia × días`); no es un itinerario optimizado que encadene destinos. El indicador de la persona con mayor distancia es el máximo de sus promedios ponderados de ida por visita, no la duración del peor viaje.

Antes de decidir, el usuario puede comprobar recorridos mediante [Cómo ir de la Intendencia de Montevideo](https://comoir.montevideo.gub.uy/), que permite elegir origen, destino y opciones de ómnibus o caminata. Abrir un servicio externo es una acción voluntaria; el planificador no lo consulta en segundo plano para cada vivienda.

## Datos personales

La comparación se envía a `POST /api/rentals/fit` y responde con `Cache-Control: no-store`, también en los errores. Los ingresos, nombres, destinos y presupuesto del hogar no forman parte de la URL de comparación, del sitemap ni de los enlaces compartidos. El servidor no persiste el perfil personal ni lo usa para crear alertas, contactar inmobiliarias o enviar notificaciones. El caché que acelera la lectura puede contener datos públicos del catálogo, nunca criterios personales ni resultados asociados a un hogar.

Esta versión no promete guardar o recuperar el plan entre sesiones. No registra los cuerpos de estas solicitudes ni datos financieros o coordenadas personales en analítica o diagnósticos; los errores deben conservar mensajes genéricos. Buscar una dirección utiliza el geocodificador de IDE Uruguay ya empleado por el directorio, por lo que el texto consultado se envía a ese proveedor al buscar explícitamente.

## Límites operativos

`app/server/utils/rentalFit.ts` carga las filas por cursor en lotes de 500 y mantiene en caché sólo la proyección pública. Revalida los metadatos `generatedAt` y `usdUyu` cada 60 segundos: si la firma no cambia, puede reutilizar el catálogo hasta un máximo de diez minutos desde su lectura completa. Al cambiar la firma o alcanzar ese plazo vuelve a cargarlo; un error no sirve un catálogo anterior como respaldo. La lectura admite hasta 60.000 filas y 48 MiB serializados; superar un límite o fallar durante la carga devuelve indisponibilidad, no un ranking de una muestra truncada. La respuesta devuelve las primeras 24 opciones después de ordenar todo el conjunto elegible y comunica los conteos de evaluadas, coincidentes, completas e incompletas. La vigencia de ofertas, advertencias y evidencia del punto se revisa de nuevo antes de cada evaluación.

La ruta acepta JSON de hasta 24 KiB. La admisión por proceso permite cuatro evaluaciones simultáneas, 30 por minuto en total y diez por cliente por minuto; una saturación devuelve 429 con `Retry-After: 60`. El contador temporal usa un hash del identificador de cliente y no almacena su perfil doméstico. La validación descarta la entrada completa si algún integrante o destino es inválido, en vez de quitarlo silenciosamente y ordenar como si no existiera.

## Referencias y alcance

El enfoque de considerar vivienda y transporte juntos toma como referencia el [Location Affordability Index de HUD](https://www.huduser.gov/archives/healthycommunities/node/100748.html). Ese índice utiliza estimaciones para Estados Unidos: no se trasladan sus costos, regresiones ni porcentajes al mercado uruguayo.

El uso de gastos reales, ingresos líquidos, ahorro e imprevistos sigue el criterio de [evaluación de gastos del CFPB](https://www.consumerfinance.gov/owning-a-home/prepare/assess-your-spending/). La página original trata la preparación para comprar vivienda; aquí se adopta únicamente la práctica de elaborar un presupuesto propio, sin importar reglas hipotecarias estadounidenses.

## Navegación y mantenimiento

La ruta está registrada en `app/utils/siteNav.ts` con etiqueta en español, inglés y portugués. Se enlaza desde alquileres, inmobiliarias, herramientas, búsqueda y mapas del sitio. `toolPath()` resuelve la ruta independiente en tarjetas y enlaces; `toolSlugs()` sigue enumerando sólo páginas bajo `/herramientas/`, para no producir `/herramientas/alquiler-ideal-uruguay`, que no existe.

Toda modificación de pesos, definición de distancia, criterios de datos incompletos o tratamiento de ingresos debe actualizar esta documentación y las pruebas del motor. Las comprobaciones de navegación deben mantener una sola entrada de búsqueda y una URL canónica por idioma, sin introducir perfiles personales indexables.
