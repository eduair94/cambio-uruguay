# Iteración de tráfico e ingresos

Inicio: 14 de septiembre de 2026. El propietario autorizó mejorar y desplegar el sitio y continuar periódicamente hasta alcanzar un mínimo de USD 30 diarios en AdSense.

## Medición y criterio de cierre

La fuente del objetivo es **AdSense**, filtrado por `cambio-uruguay.com`. Registrar ingresos estimados, moneda, período, zona horaria y fecha de extracción. La cuenta paga en UYU; el informe permite mostrar USD y advierte que la conversión es aproximada. No confundir ingreso estimado con pago liquidado.

Informar cuando un día cerrado alcance USD 30. Para dar por alcanzado un nivel sostenible y pausar la iteración, verificar siete días cerrados consecutivos con al menos USD 30 cada uno. Nunca usar proyecciones, el día abierto, una lectura antigua o la suma de otros sitios como prueba.

GA4 sirve para atribuir rendimiento a páginas, dispositivos y canales; no sustituye al total de AdSense. Las dos cuentas cortan el día de forma diferente: AdSense usa Montevideo y GA4 devuelve America/Los_Angeles. El enlace AdSense–GA4 comenzó el 2/9/2026 y no rellena el pasado; ese día también cambió la medición por consentimiento. Las comparaciones que cruzan esa fecha no son homogéneas.

Search Console se consulta con totales sin dimensiones y `dataState: final`. Detectar el primer día incompleto antes de construir ventanas de 7 y 28 días. Agrupar URL canónica y variantes cuando corresponda. Un cambio semanal no demuestra causalidad.

Los ingresos, consultas y capturas de cuentas se conservan **únicamente en `docs/seo/data/`**, excluido de Git. La base y los colectores iniciales están en `data/revenue-2026-09-14/`. Este documento registra cambios y criterios sin publicar métricas competitivas.

## Cadencia

Automatización de este hilo: `crecer-hasta-usd-30-diarios-en-adsense`, diariamente a las 09:30 de Uruguay. Es una tarea local: necesita el equipo encendido y la aplicación abierta. Mantener una sola automatización para este objetivo.

Cada ejecución:

1. Leer este registro, `AGENTS.md`, el estado de Git y los despliegues en curso. Preservar trabajo ajeno. Actualizar desde remoto sólo cuando sea seguro.
2. Obtener datos nuevos y guardar una extracción fechada. Revisar tanto `asOf` como el fin del período; el snapshot de ingresos puede conservar datos anteriores cuando el enlace falla. Un snapshot conservado no certifica ingresos actuales.
3. Contrastar ingresos/día, RPM, impresiones por vista y visibilidad de AdSense; sesiones con interacción, regreso y navegación útil de GA4; clics, impresiones y CTR de GSC. Separar anuncios manuales de automáticos.
4. Elegir una mejora concreta usando demanda y uso demostrados. Anotar hipótesis, páginas, fecha y criterio de evaluación antes de ampliarla.
5. Implementar, revisar y ejecutar controles pertinentes. Desplegar por el flujo existente; verificar el resultado público y registrar el commit y el run. No editar `app/` durante su build.
6. Revisar efectos operativos enseguida, ingresos en ventanas cerradas de siete días y SEO a 28 días. No retocar diariamente títulos o ubicaciones sólo por ruido. Si falta evidencia nueva, avanzar el siguiente trabajo útil sin repetir diagnósticos enteros.

## Primera iteración: 14/9/2026

| Cambio | Motivo verificable | Evaluación |
| --- | --- | --- |
| Nuevo montaje lazy del anuncio del layout al cambiar `route.path` | El layout persiste y el observer sólo nacía al montar. Entrar desde una página sin anuncios podía dejar la siguiente sin solicitud; otra página conservaba una respuesta vacía anterior. | Pruebas con anuncios simulados: página excluida → artículo, artículo → artículo, respuesta vacía, limpieza. Query/hash no hacen otra solicitud. |
| Observar `data-ad-status` antes de solicitar | Una respuesta inmediata podía llegar antes de registrar el observer. | Respuestas vacías inmediatas y diferidas cierran el espacio reservado. |
| Un anuncio editorial y el cierre en efectivo y sala VIP | Había dos unidades internas más el cierre, por encima del máximo previsto. Las internas usaban el identificador del cierre. | Dos ubicaciones manuales, con `in-article` explícito; contenido y calculadora conservados. |
| Cinco enlaces contextuales desde multas, compra de auto y clearing | Las nuevas guías ya estaban en sus hubs, pero faltaba conectarlas con preguntas relacionadas en páginas existentes. | Destinos verificados y etiquetas ES/EN/PT. Evento existente `content_navigation`, `placement: guide_context`; sin UTM internos. |

Validación local: 7.378 pruebas del frontend aprobadas (44 omitidas), incluidas siete nuevas de ciclo de vida de anuncios; lint dirigido sin errores y revisión independiente de ambas partes. El backend aprobó 2.656 pruebas, pero su barrido de archivos encontró clones temporales preexistentes `.sdd-*` y una prueba agotó el tiempo al ejecutar las dos suites a la vez. La prueba de descarga y las de privacidad de ingresos pasaron al repetirlas con dos workers (37/37). Las suites completas de frontend y backend aprobaron luego en el checkout limpio de CI. No se borraron esos archivos ajenos ni se modificaron las guardas para ocultarlos.

Desplegado: commit `d2e7bc28e6950216151365f139c6b96e2e28df21`, [run 34805651137](https://github.com/eduair94/cambio-uruguay/actions/runs/34805651137), finalizado correctamente el 14/9/2026 a las 04:29 UTC. Aprobaron las suites de ambos paquetes, el control de secretos y el despliegue sin interrupción. Las nueve rutas públicas (tres páginas por tres idiomas) respondieron 200 con los enlaces previstos y un único H1. La lectura anónima de ingresos respondió 401. La inspección visual confirmó el bloque de enlaces publicado en compra de auto. Ningún aumento de ingresos se atribuye al parche antes de medirlo.

Primera revisión de siete días: desde el 21/9, sólo con días cerrados y procesados. Revisión SEO de 28 días: desde el 12/10, ajustada al último día final de GSC. Conservar el 14/9 como día de transición del despliegue. El análisis privado `data/revenue-2026-09-14/next-experiment-itau.md` prepara una posible diferenciación del histórico Itaú; su caída semanal aún no prueba un título defectuoso y no justifica cambiarlo diariamente.

## Segunda iteración: 14/9/2026

- **Indexación:** Search Console aceptó una solicitud para cada una de las cuatro guías enlazadas en la primera iteración, después de comprobar su disponibilidad en vivo. La aceptación no prueba indexación. Registro privado: `data/revenue-2026-09-14/guide-indexation-requests.json`. Revisar el estado posteriormente sin repetir solicitudes para intentar acelerar la cola.
- **Medición de navegación:** se registraron en GA4 las dimensiones de evento `content_path`, `destination_path` y `placement`. `RelatedPages` conserva `related_click` y ahora usa esos mismos parámetros, sin queries y omitiendo rutas con middleware `auth`. El colector privado `collect-navigation.cjs` comprueba disponibilidad de metadata antes de consultar. Primera lectura desde el 16/9; primer día completo de esta configuración: 14/9 en horario de la propiedad. No atribuir ingresos a un clic interno sólo por tener ambos datos.
- **Contenido nuevo:** `/tickets-mutualistas-uruguay` convierte la planilla pública IAMC del MSP de julio de 2026 en una consulta por institución, afiliación y prestación. Son 34 instituciones y cinco conceptos exactos; conserva las 422 columnas, sus condiciones, vacíos, ceros y referencias. Los máximos autorizados se muestran separados del precio aplicable a una persona. Una contradicción de CAMEDUR se conserva y señala. Fuente, vigencia y límites visibles; no se infieren convenios ni se suman cargos de análisis a consultas.
- **Hipótesis:** una consulta útil sobre costos de mutualistas complementa la página existente de movilidad BPS y responde a una demanda aún no cubierta por el sitio. Se enlaza desde esa página, la navegación, el catálogo de herramientas y los sitemaps. La interfaz y explicación están en ES/EN/PT. No se agregan unidades manuales dentro de los controles. Los filtros se mantienen en memoria local, sin URL, eventos propios ni almacenamiento; el contenido interactivo tiene máscara para Clarity.
- **Mantenimiento:** [extractor reproducible y procedimiento](../app/MUTUALISTA_COSTS.md). Una nueva edición exige revisión de fuentes y guardas antes de reemplazar datos; no extrapolar aumentos. En cada revisión periódica comprobar si el MSP publicó otra edición.

Evaluación: comprobar primero publicación, rastreo e interacciones; revisar consultas, clics y navegación útil a los 28 días. Medir ingresos observados sin atribuir causalidad a una URL recién publicada. Investigación y extracción privadas en `data/organic-iteration-2026-09-14/`; contraste independiente de los 2.110 importes y 170 máximos sin diferencias.

Validación local: 368 pruebas pertinentes aprobadas, lint dirigido limpio y reproducción idéntica del catálogo desde el XLSX. ES/EN/PT respondieron 200 con 34 instituciones, un H1, canonical propio, OG y enlaces a fuentes. La revisión independiente observó escritorio claro y móvil sin desbordamiento; se corrigió la disposición de las condiciones y notas móviles. Interacciones verificadas: anomalía CAMEDUR, afiliación sin columnas y salto desde la comparación con foco en el resultado; la selección no cambia la URL.

Desplegado: commit `23933db9ae3d463b8547674353dbc1ebe78dcdbf`, [run 34808670562](https://github.com/eduair94/cambio-uruguay/actions/runs/34808670562), finalizado correctamente el 14/9/2026 a las 05:20:17 UTC. Aprobaron ambas suites, el control de secretos y el despliegue. La comprobación pública de las tres versiones aprobó los controles de contenido, canonical, datos estructurados y fuentes. Se completó la inspección visual en oscuro sobre producción y se comprobó el salto a Asociación Española con foco en el resultado y URL sin filtros. Registro privado: `data/organic-iteration-2026-09-14/production-validation.json` y `ui-validation.md`.

Search Console aprobó la prueba en vivo de la nueva página en español y aceptó una única solicitud de indexación a las 05:23:25 UTC. Esto no confirma indexación ni tráfico. Registro privado: `data/organic-iteration-2026-09-14/mutualista-indexation-request.json`.

## Tercera iteración: 14/9/2026

La calculadora de plazo fijo se actualiza a las medias del BCU de julio de 2026, última fila disponible en las tres hojas de tasas pasivas. Se conservan los datos sin operaciones, la separación por moneda y plazo y los promedios generales. Las tasas comerciales y las fechas por moneda de BROU siguen coincidiendo con su pizarra vigente y no se sustituyen.

La interpretación también cambia: personas físicas pueden quedar por debajo, por encima o igual al total del sistema. La página muestra las cifras de las excepciones sin atribuir a las empresas mejores condiciones por una media agregada. Ahorro en Sueldo se presenta como aportes mensuales, con capital disponible al vencimiento; las primas de permanencia se aplican sobre la pizarra vigente en cada renovación, sin garantizar hoy los porcentajes de años futuros. La fecha de comprobación se limita a tasas BROU/BCU, sin insinuar una nueva revisión de IRPF.

Hipótesis y evaluación: conservar exactitud y utilidad de una página con demanda observada. No se presume que el dato anterior explicara una caída de clics. Comprobar publicación y cálculos enseguida; revisar el tráfico con 28 días finales de GSC. Evidencia y celdas privadas en `data/revenue-2026-09-14/plazo-fijo-freshness.md`; registro de esta iteración en `plazo-fijo-iteration.md` de la misma carpeta.

Validación local: 118 pruebas aprobadas, lint dirigido limpio, las 38 celdas BCU contrastadas y revisión independiente del texto. Se ejercitaron los controles en las tres monedas, la ausencia de operaciones en UI y el cambio de capitalización mensual a anual al aplicar una referencia. Las tasas y funciones de cálculo de BROU se conservaron.

Desplegado: commit `018343215ec527657392a5d4bd53d3e553dc7920`, [run 34810416357](https://github.com/eduair94/cambio-uruguay/actions/runs/34810416357), finalizado correctamente el 14/9/2026 a las 05:49:07 UTC. Ambas suites completas y el despliegue aprobaron. La comprobación pública de las tres rutas aprobó a las 05:50:05 UTC, conservando su canonical español existente; no se afirma que el contenido de esta herramienta esté traducido. En producción, aplicar la referencia BCU cambió la tasa a 5,12% y produjo el resultado esperado. Registro privado: `plazo-fijo-production-validation.json` de la carpeta de esta iteración.

También se completaron dos lecturas nuevas para priorizar el crecimiento. El cruce AdSense de plataforma/formato/emplazamiento identifica la mayor superficie automática y separa cobertura de visibilidad; el editor confirmó sus controles actuales, pero la vista previa falló. No se inició un experimento sin acreditar posiciones problemáticas. El cruce GA4 de entradas Google/Bing, contrastado con GSC, selecciona históricos existentes como candidato para un piloto de adquisición. No son aumentos de ingresos obtenidos. Evidencia privada: `adsense-format-platform.md`, `auto-ads-controls-audit.md`, `next-experiment-priority-after-formats.md` y `organic-entrypoints-decision.md`, bajo `data/revenue-2026-09-14/`.

## Cuarta iteración: 14/9/2026

La revisión del piloto de históricos encontró un problema concreto en BCU: el dato publicado coincide con la última referencia oficial disponible, pero la plantilla lo presenta con compra/venta, spread, un distintivo de institución regulada y enlaces a sucursales y opiniones. La portada de su histórico lista las unidades indexadas actuales y no ofrece el acceso a su archivo del dólar. La corrección se limita a la presentación y el recorrido de las páginas existentes.

La variante BCU distingue valor de referencia, tipo de serie y fecha de la observación. Sólo muestra una columna o curva cuando todos los valores de ambas puntas del conjunto mostrado son válidos e idénticos; conserva ambos campos cuando difieren. No se mezclan BILLETE, CABLE y PROMED.FONDO por compartir una cotización en un día. El acceso a la fuente y a la explicación existente de `/cotizacion-del-bcu` sustituye la presentación como casa de cambio.

Hipótesis: responder con precisión a la intención de consultar referencias históricas y facilitar su recorrido desde el hub existente. Los canales observados son búsqueda orgánica de Google y Bing. Una búsqueda pública puntual ya muestra las dos URLs BCU, por lo que no se presenta una solicitud de indexación ni IndexNow como solución probada de tráfico. La consulta privada de Bing Webmaster requiere un nuevo consentimiento de identidad; queda pendiente de autorización sin impedir esta corrección.

Evaluación: publicación y controles primero; comparar entradas orgánicas, interacción y consultas con 28 días completos después del cambio, conservando BROU y Prex como páginas sin intervención para contexto, no como un experimento aleatorio. El título BCU cambiará para corregir una afirmación temporal y de mercado, no por una caída de CTR demostrada. No se atribuirá un aumento de ingresos antes de medirlo. Evidencia privada: `data/revenue-2026-09-14/bing-public-historicals.md`, `bing-webmaster-audit.md` y archivos `pilot-*` de la misma carpeta.

Validación local: 84 pruebas pertinentes aprobadas, lint dirigido limpio y revisión independiente de las condiciones para mostrar una referencia única. Doce rutas respondieron 200 y conservaron sus canonical: portada y dólar en ES/EN/PT, variantes BILLETE/CABLE/PROMED.FONDO, UI y las páginas comerciales de BROU y Prex. La comprobación móvil ejercitó el cambio de seis a tres meses y los enlaces entre portada y dólar. Los períodos, fechas y conteos corresponden al tipo graficado; la tabla conserva los registros originales. No se modifican el scraper ni la serie almacenada.

El primer [run 34813559422](https://github.com/eduair94/cambio-uruguay/actions/runs/34813559422), del commit `f00a7db6e41439ad96ed02d295fbbf93f04310e7`, detuvo el despliegue: el comprobador de enlaces internos no reconocía `[[type]]` como segmento opcional de Nuxt y rechazaba el enlace válido al dólar BCU. Se corrigió el matcher por segmentos y se verificaron las formas con/sin opcional, los segmentos requeridos y el rechazo de rutas demasiado largas; cinco pruebas y lint dirigidos aprobaron. No se cambió el enlace para eludir el control.

Desplegado: commit `44d6dc920e7ede68da96e1e73aa19116c96639af`, que incluye la corrección BCU de `f00a7db6`, [run 34813903013](https://github.com/eduair94/cambio-uruguay/actions/runs/34813903013), finalizado correctamente el 14/9/2026 a las 06:42:04 UTC. Aprobaron 7.407 pruebas del frontend (41 omitidas), el control de secretos, la comprobación SSR y el despliegue. El backend no cambió en el segundo commit y sus 2.661 pruebas habían aprobado en el run anterior.

Las doce rutas públicas aprobaron a las 06:43:09 UTC, conservando sus canonical, la distinción de tipos y la presentación comercial de BROU/Prex. La inspección visual de producción confirmó la portada y el enlace al archivo del dólar: última referencia BILLETE de 40,20 UYU/USD del 11/9, diferenciada de UI/UP/UR del 14/9. Evidencia privada: `bcu-local-validation.json`, `bcu-production-validation.json`, `bcu-reference-review.md` y `bcu-ui-validation.md` de la carpeta de esta iteración. No se atribuye a esta publicación ningún ingreso adicional antes de medirlo.

## Quinta iteración: 14/9/2026

La guía existente `/declaracion-de-irpf-uruguay` incorpora una sección para ejercicios anteriores: consultar una devolución registrada y sus observaciones, revisar declaraciones pendientes y corregir una declaración de rentas de trabajo mediante el formulario 1102 del período correspondiente. Los accesos y explicaciones se contrastaron con las páginas oficiales DGI. La disponibilidad de una aplicación antigua no se presenta como prueba de que un crédito siga cobrable.

La sección nueva tiene texto ES/EN/PT y fecha propia de consulta de fuentes. Se mantienen la campaña, las reglas sancionatorias, su fecha anterior y la metadata existente; no se afirma una traducción completa de la página. La verificación de fuentes no implica haber ejecutado trámites autenticados ni comprobado controles detrás del login.

Durante la verificación se encontró una condición concreta que afecta la calidad de medición: `nuxt-gtag` podía inicializar los destinos reales en desarrollo. Se habilita el módulo sólo con `NODE_ENV=production`; en desarrollo y pruebas instala los composables vacíos previstos por el paquete. Los identificadores, el consentimiento, la inicialización manual y las rutas sin etiquetas se mantienen en producción. La prueba ejecuta el módulo instalado y los composables seleccionados sin solicitudes a Google. No se atribuye a esta condición una cantidad de sesiones ni se afirma que explique las anomalías históricas de atribución. Evidencia privada: `data/revenue-2026-09-14/development-analytics-audit.md`.

Hipótesis: cubrir una intención detectada en la cola de demanda que la guía aún no resolvía, utilizando la página existente y sus enlaces oficiales. La cola no proporciona un volumen de adquisición demostrado. Evaluar consultas y entradas orgánicas con 28 días finales después del cambio, junto con interacción e ingresos observados, sin atribuir causalidad a una variación diaria.

Validación local: 19 pruebas DGI y 12 de etiquetas/rutas sin etiquetas aprobadas, lint dirigido limpio y compilación/ejecución del componente con ES/EN/PT. Las tres rutas respondieron 200 y conservaron su canonical español existente, los tres casos y cinco fuentes. El nuevo bloque fecha sus fuentes al 14/9; la verificación anterior sigue en 10/8. La revisión factual independiente no encontró fallas materiales. Investigación y registros privados: `data/revenue-2026-09-14/next-demand-candidate.md`, `irpf-extension-draft.md`, `irpf-extension-review.md` e `irpf-local-validation.json`.

La revisión visual confirmó ES/PT móviles sin desbordamiento y EN en escritorio oscuro. Se corrigió el margen del ancla nueva para dejar su título visible bajo la barra fija. En desarrollo no se observaron scripts de etiquetas de Google tras navegar por las variantes. Registro privado: `irpf-ui-validation.md`.

Desplegado: `2e630ec3` y `e3c224f8baf458a65b2c1b58284a73e804219588`, enviados juntos. CI `34817102567` aprobó a las 07:26:56 UTC: 7.430 pruebas app y 2.661 backend, build y controles de salud correctos. Las tres rutas públicas aprobaron a las 07:27:46 UTC (`irpf-production-validation.json`). El navegador confirmó el bloque y su título bajo la barra fija; las etiquetas Google de producción siguen cargando. No hay aún una ventana posterior de ingresos atribuible al cambio.

## Sexta iteración: 14/9/2026

Durante la revisión se comprobó que el encabezado a 1280 px superponía búsqueda y Más y recortaba el selector de idioma en ES/EN/PT. La suma de los controles requería más ancho que la barra. Se ocultan únicamente los siete iconos decorativos de los enlaces primarios entre los breakpoints lg y xl (1280–1919 px), donde liberan 133 px; los textos, destinos, áreas de interacción y el menú Más se conservan. Desde 1920 px los iconos vuelven a aparecer mediante las utilidades CSS existentes, con el mismo árbol SSR/cliente.

La geometría local no presenta recortes ni intersecciones en los tres idiomas a 1280 px ni en los controles adicionales ES a 360, 1279, 1440, 1919 y 1920 px. Menú móvil, Más, selector de idioma y búsqueda comprobados, con cierre por teclado y retorno del foco de búsqueda. Lint limpio y tres pruebas SSR de navegación aprobadas. La sesión autenticada no se ensayó; su botón existente es más pequeño que la variante desconectada medida. Evidencia privada: `header-overlap-followup.md`, `header-overlap-review.md` y `header-ui-validation.md`.

Desplegado: `d8c42582ef3535da941a2b93972a00fb0fe67207`, CI `34818214977` aprobado a las 07:40:58 UTC con 7.430 pruebas app, build de 409 s, SSR y dos comprobaciones de salud correctas. La revisión pública posterior confirmó los trece controles contenidos y sin superposiciones en ES/EN/PT a 1280 px. Más e idioma abren con teclado; el cambio de idioma conserva el apartado y la búsqueda devuelve el foco al cerrarse. No se atribuye a la corrección un aumento de tráfico o ingresos.

El colector privado de entradas orgánicas ahora exige ventanas explícitas, ofrece plan sin conexión por defecto y reserva una salida fechada exclusiva para cada ejecución real. Conserva la consulta y el TOTAL del API; se comprobó con 26 pruebas locales sin extraer datos nuevos. El uso anterior por stdin remoto queda retirado. `data/revenue-2026-09-14/measurement-runner-handoff.md` documenta el contrato y la limitación del analizador anterior.

## Séptima iteración: 14/9/2026

Las fichas `/casa/:origin` ofrecen accesos a horarios, teléfonos y reputación que ya existían, según la disponibilidad del mismo directorio que valida los destinos. Se serializan sólo los slugs disponibles; si el enriquecimiento falla, las cotizaciones siguen funcionando. Los enlaces nuevos tienen etiquetas ES/EN/PT y avisan a lectores EN/PT que los destinos están en español. No se crean nuevas páginas ni se cambian los títulos del histórico.

El contraste de Cambio Principal encontró un conflicto entre fuentes del propio BCU: la lista y el detalle de la sucursal 2456-1 informan 2622 4521, mientras la ficha institucional y el [contacto oficial de la casa](https://cambioprincipal.com.uy/contacto/) coinciden en 4622 4521. El detalle actualizado del BCU y la casa también coinciden en lunes a viernes de 08:00 a 18:00; nuestra copia conservaba otro horario, incluido un sábado que las fuentes actuales no informan.

Se aplica una corrección fechada por campo, limitada a identidad, dirección, departamento y valores antiguos observados. El dato bruto del backend se conserva y un valor futuro diferente no se reemplaza. La procedencia y fecha acompañan los datos corregidos en fichas, tabla de sucursales y mapas. La tabla semanal distingue días sin informar de cierres explícitos, y el schema conserva sólo ventanas de apertura publicadas. El filtro de teléfonos ahora exige dígitos suficientes para coincidir con la guarda del destino.

Hipótesis: facilitar la resolución de una búsqueda de marca existente con información coherente y enlaces utilizables. La observación puntual del buscador ya mostraba nuestro histórico; no demuestra una necesidad de cambiar títulos, crear otra URL ni solicitar indexación. Las impresiones de consultas registradas no son volumen de mercado. Evaluar entradas y recorridos con la ventana posterior acordada, sin atribuir ingresos al mero despliegue. Evidencia privada: `data/revenue-2026-09-14/principal-*` y `branch-correction-review.md`.

Validación previa a publicación: 112 pruebas pertinentes y lint dirigido aprobados; revisión independiente sin hallazgos materiales. Las dos APIs y doce páginas de la comprobación HTTP respondieron 200 y aprobaron 178 controles de datos, enlaces, fuentes, payload y schema. El nuevo bloque no ofrece intenciones comerciales para BCU. La revisión del navegador confirma los enlaces móviles, su tamaño mínimo de 44 px, las fuentes y el teléfono `tel:+59846224521`. La fuente propia se volvió a leer con HTTP 200 el 14/9 a las 08:06:47 UTC. Una vista desactualizada durante HMR no se reprodujo desde una carga nueva; se conserva el manejo reactivo existente.

El primer run `34821819857` de `52b466ed` no desplegó: la suite completa encontró una expectativa anterior en `openingHoursReales.test.ts` que interpretaba un lunes omitido como cierre confirmado. Se actualiza a «Sin informar», manteniendo los horarios de los días expresos y las pruebas de cierre explícito. Las otras 7.444 pruebas app y el backend aprobaron en esa ejecución.

Desplegado: `52b466ed` y su ajuste de prueba `61116caa`, mediante [CI 34822183720](https://github.com/eduair94/cambio-uruguay/actions/runs/34822183720), aprobado a las 08:30:17 UTC. La suite app completó 7.445 pruebas (41 omitidas), la compilación tomó 403 s y los controles SSR y de salud aprobaron. El script desplegó `dc3a708`, revisión de main que también incluía el directorio de fletes de otra intervención. La validación pública terminó a las 08:32:23 UTC: 181 controles sobre dos APIs y doce HTML en 200, fuentes fechadas, teléfono y schema correctos, enlaces disponibles y BCU excluido. El navegador confirmó el recorrido hub → teléfonos → horarios y el fin de semana sin información. Evidencia privada: `principal-production-validation-dc3a7085.json` y `principal-ui-validation.md`. Esta publicación no constituye evidencia de un aumento de ingresos.

## Octava iteración: 16/9/2026

Lectura nueva de sólo lectura (GA4 por país, fuente y página desde el 3/9; snapshot de oportunidades de `currency-gsc`; SERP uruguayo por `google_search_server`). Evidencia privada en `data/revenue-2026-09-16/`. Tres conclusiones que cambian la priorización:

1. **El rendimiento por vista depende del tipo de página, no del país.** Las guías de problemas de dinero, vivienda, deudas e importación rinden varias veces más por vista que cotizaciones, históricos, alquileres u oportunidades. Los visitantes de fuera de Uruguay no rinden más: una estrategia en otro idioma por RPM no tiene respaldo en estos datos.
2. **La curva de CTR del propio sitio es plana arriba.** Mejorar posición en consultas de cotización rinde poco aunque se gane; donde sí existe el clic es en consultas sin caja de respuesta de Google.
3. **El cluster UR/UI es la mayor demanda ganable fuera del pozo de cero clic**: posiciones orgánicas quinta y sexta, detrás de organismos públicos y de dos sitios de datos que muestran el valor vivo.

Cambio publicado: el conversor de Unidad Indexada traía un valor fijo de junio y no mostraba cifra en el snippet; ahora lee el valor del BCU, lo publica en título y descripción sólo si la lectura fue viva y suma una tabla de equivalencias. Las páginas de indicadores tenían una guarda de "valor vivo" que nunca se activaba (el helper caía al valor de referencia); se reemplazó por una lectura que devuelve `null`, y se agregaron tabla de equivalencias con los montos que aparecen en las consultas, UR/UI mes a mes con variación a 12 meses (serie del BCU reducida en el servidor) y enlaces de contexto a las guías de alquiler e hipotecario.

Hipótesis: responder mejor que los competidores directos la intención "valor de hoy / N unidades en pesos" mejora CTR y, con el tiempo, posición; el enlace de contexto lleva parte de ese tráfico a páginas de mayor rendimiento. Evaluación: GSC con 28 días finales posteriores al despliegue sobre las tres URLs y las consultas "valor de la ur hoy", "unidad reajustable" y "ui a pesos uruguayos", contra 15/8–11/9. No atribuir ingresos antes de esa ventana.

Validación local: 7.997 pruebas del app aprobadas (27 de indicadores, 12 nuevas), lint limpio, SSR verificado en las cuatro rutas (título, descripción, tablas, payload de ~3 KB) y revisión visual en 390 px y escritorio sin desbordes.

Descartado en esta iteración: medir si Auto Ads vuelve a ubicar anuncios después de una navegación SPA. Bloquear las solicitudes publicitarias también impide que Auto Ads baje su configuración, y medirlo con solicitudes reales generaría impresiones propias automatizadas. Queda como hipótesis sin evidencia.

## Novena iteración: 16/9/2026

Lectura nueva: Search Console página×consulta de 90 días (17/6–14/9, sólo lectura, privado en `data/revenue-2026-09-16/page-query-90d.json`). Fuera de cotizaciones, la demanda revelada es chica y el techo es de autoridad: en temas comerciales caros el sitio aparece muy lejos del primer resultado. En paralelo hay páginas en posiciones 5 a 13 con cero clics cuyo título no responde la consulta.

Cambios:

1. **`/prestamo-sin-recibo-de-sueldo-uruguay`** (nueva). "Préstamo sin recibo de sueldo" figuraba en el informe de Trends del 15/9 como hueco sin cobertura, en la categoría de mayor rendimiento por vista del sitio. El SERP uruguayo son landings de prestamistas y un blog de afiliados sin tasas. La página filtra el catálogo de `/mejores-prestamos-uruguay` (mismo fetch y refresh semanal: tasa publicada, clearing, supervisión BCU), toma el tope de usura de `/api/bcu-rates` y explica tres vías con citas fechadas de la página de cada institución (BROU, OCA, Pronto!). Sin acuerdos comerciales.
2. **Títulos que responden**: salario mínimo con la cifra vigente desde julio (el primer resultado oficial todavía muestra la de enero) y un test que la ata al catálogo; descripción de cambio de mutualista con la respuesta primero (antes eran 450 caracteres); título de propinas que entra en el SERP. No se tocaron cédula ni asignación familiar: sus títulos con cifras son del 1 y el 8/9 y la ventana medida es anterior.

Descartado con evidencia: calendario mensual de pagos BPS (SERP de BPS y prensa), calculadora de aguinaldo (granjas de calculadoras), snippet de sucursales (título y descripción ya correctos; Google elige horarios por la intención) y más actividad del bot de Reddit (cuenta con shadowban).

Evaluación: indexación y consultas de la página nueva a 28 días; clics de las tres páginas retituladas con 28 días finales posteriores contra 17/6–14/9.

## Décima iteración: 22/9/2026

Lectura previa (octava iteración): el rendimiento por vista depende del tipo de página, y las guías son la familia que más rinde. Sin embargo la plantilla genérica `/guias/*` no llevaba ninguna unidad manual propia: en la enorme mayoría de las lecturas largas la única unidad manual era el cierre del layout, debajo de ampliaciones, "Seguí leyendo" y el newsletter, es decir lo último antes del pie, donde el lector que ya tiene su respuesta nunca llega. Dos cambios de colocación, ambos inertes hasta que exista el identificador de unidad correspondiente en el `.env` del servidor al momento del build:

1. **Riel de escritorio** (`placement="sidebar"`, `NUXT_PUBLIC_ADSENSE_SLOT_SIDEBAR`): una unidad fija de 300x600 a la DERECHA de la columna de lectura, desde 1280 px, sólo en rutas de densidad normal y sólo si el identificador existe. Sale del tope de 1280 y no lo ensancha (`DESIGN.md` → "The Rail Is Not The Column Rule"): la columna cede 300 px más el hueco, el texto no se interrumpe y nada se desplaza. Es fija (`sticky`) y ésa es la única excepción al contrato anterior de "sin formatos fijos", admitida porque el riel no cubre contenido: vive en una columna propia. Bajo 1280 px no existe (CSS, sin JS): una caja oculta nunca intersecta, así que desde un teléfono no sale ningún pedido. Todo lo que no es el riel —incluida la unidad que Auto Ads inserte— queda anclado a la columna de lectura, y el tope manual por ruta no cambia porque el riel no gasta el presupuesto de la columna.
2. **Unidad editorial en las guías** (`pages/guias/[slug].vue`): una unidad `in-article` después de la PRIMERA sección de cada guía, entre secciones y nunca adentro de una, sólo en cliente. Con el cierre del layout, cada guía llega exactamente al tope de dos unidades manuales de una lectura larga; el mismo idioma de gating que usan las dos páginas editoriales anteriores.

Hipótesis: la visibilidad medida (Active View) y el rendimiento por mil vistas del nivel de contenido suben porque la impresión pasa a ocurrir donde el lector está —al lado del texto en escritorio y después de la respuesta en las guías— y no al final de una página que la mayoría no recorre entera. Riesgo vigilado: la columna de lectura a 1280 px queda más angosta (932 px) sólo cuando el riel renderiza; sesiones, páginas por sesión y CLS de campo son la guarda.

Medición: informe de AdSense **por unidad** (el riel y la unidad de guías tienen identificadores propios, así que se separan del cierre y de los anuncios automáticos), comparando siete días cerrados antes y siete después de la activación, con visibilidad, impresiones por vista y rendimiento por unidad; GA4 para sesiones con interacción y páginas por sesión en escritorio; CrUX para CLS. **No va en `experiments.json`**: la unidad de guías toca todas las guías y el riel toca toda página de densidad normal en escritorio, o sea sin control interno; el veredicto por porción de clics siempre daría "sin cambio", y además el efecto buscado es de ingreso por vista, no de tráfico. La fecha de activación es la del build con el identificador en el `.env` del servidor, no la del despliegue del código: registrarla el día que se complete.

Validación local: lectura del código fuente por `tests/unit/adRail.test.ts` (guarda, orden en el layout, grilla sin scope con la unidad automática anclada a la columna 1, reserva 300x600 y ocultamiento bajo 1280, unidad de guías y tope), más las suites existentes de anuncios y de layout (ciclo de vida, política de rutas, loader, aire de arriba, cola del layout, filas partidas por Auto Ads, contenedor por página). Pendiente de producción con el identificador activo: `npm run audit:gutters` y `npm run audit:margins` sobre una guía a 1280, 1440 y 1920 px, y la comprobación de que ninguna unidad automática cae en la columna del riel.

## Undécima iteración: 22/9/2026 (infraestructura del plan de tráfico)

Lectura nueva, con el GraphQL de Cloudflare (`npm run cf_traffic`, token con Zone Analytics: Read): más de la mitad de los pedidos de la semana venían de un solo cliente headless desde Estados Unidos, y el tráfico que GA4 atribuía a Singapur era una granja que rota User-Agents, ejecuta JavaScript y recorre el directorio de alquileres. Se le atribuyeron entonces los 504 de esas páginas; la revisión del 24/9, documentada debajo, retira esa atribución al distinguir los sondeos internos de Early Hints. Descartado que fuera un proceso propio (el VPS está en Montreal; el índice RAG no ejecuta JavaScript). Dos reglas WAF de desafío gestionado, por User-Agent headless y por país sólo sobre rutas dinámicas: reversibles y medidas, no un bloqueo por suposición.

Cambios publicados en un solo push (commit `79f21ec5` y siguientes):

1. **Caché de borde por familia**: `s-maxage` en guías, comparativas, glosario e importar (24 h), fichas de casas y sucursales (1 h), histórico y cotización (10 min) y 23 páginas de pregunta (6 h); la cookie de idioma deja de emitirse cuando la URL ya trae el prefijo, que era lo que volvía no cacheable a todo /en y /pt; el deploy purga el borde tras el segundo control de salud. La Cache Rule de Cloudflare se habilita después de comprobar la cabecera en producción.
2. **Alquileres**: el directorio se sirve desde memoria con recalentamiento horario; los espejos /en y /pt de la ficha dejan de existir; las URL malformadas son 404 antes de tocar la base.
3. **OG**: la ficha de autos deja de responder 500 con avisos vencidos y usa una tarjeta estática.
4. **Anuncios**: ver la décima iteración (riel y unidad de guías).
5. **Medición**: RPM sólo Uruguay al lado del RPM del sitio, para que una granja no deforme el multiplicador por familia.
6. **Distribución**: «Guía del día» en el reporte diario de Telegram y Discord; `/llms-full.txt` e IndexNow (inerte hasta `INDEXNOW_ENABLED=1`); `/publicidad` y el plumbing de patrocinios y afiliados, que con la configuración vacía no dibuja nada.

Hipótesis: el tráfico automatizado deja de deformar GA4 y de saturar el SSR; el tiempo hasta el primer byte de las familias cacheadas baja al del borde; la parte de la audiencia real que ve la impresión sube. Evaluación: respuestas 5xx de clientes en Cloudflare (ver corrección del 24/9 debajo), TTFB por familia con `cf-cache-status`, RPM sólo Uruguay en el tablero privado y AdSense por unidad, siempre con siete días cerrados. Ningún cambio de esta iteración se declara en `experiments.json` salvo la cesión del glosario de la UR, que sí tiene control.

## Corrección de la medición de disponibilidad: 24/9/2026

La atribución anterior de los 504 a caídas del origen era incorrecta: la consulta sumaba también subrequests internos de Cloudflare. La comprobación por `requestSource` de los días completos 21 y 23 y de una hora del 24 encontró que todos esos 504 eran `earlyHintsCache`; ninguno llegaba a una petición de cliente (`eyeball`). [Cloudflare documenta](https://developers.cloudflare.com/cache/advanced-configuration/early-hints/#emit-early-hints) que ese 504 señala ausencia de pistas en la caché de Early Hints y no un error del origen. Las cifras agregadas anteriores no sirven para cuantificar una caída ni el efecto del WAF.

`npm run cf_traffic` ahora filtra `requestSource: "eyeball"` y el host `cambio-uruguay.com`. El segundo argumento permite otro host o `'*'` para toda la zona; ese último modo añade el desglose por host. La salida explicita el alcance y que «clientes» incluye bots. El control de disponibilidad usa todos los 5xx, sin inferir humanidad por país ni confundir la zona completa con la web principal. Las reglas WAF no se modificaron: esta corrección afecta a la medición, y no reemplaza la evidencia por ruta y User-Agent que las motivó.

Las colocaciones manuales del riel y editorial están presentes en la configuración del build y del SSR comprobados el 24/9. El registro privado del 22/9 ya informaba su activación, pero aún no se acredita la primera impresión. La unidad editorial se comparte con otras páginas, por lo que su informe por unidad no aísla sólo las guías. No atribuir ingresos ni visibilidad a la presencia de un identificador. Evidencia privada y controles de esta revisión en `data/revenue-2026-09-24/`.

## Próximas decisiones

- Verificar las fuentes de la excepción Cambio Principal cuando cambien los datos de origen y, como máximo, en la revisión mensual siguiente. La fecha del 14/9 es una comprobación puntual, no una vigilancia automática de la web propia. La tabla semanal no interpreta ausencia de horario como cierre.

- Medir la ampliación IRPF con la ventana prevista y conservar sus límites sobre créditos antiguos. Reutilizar la investigación ya guardada antes de ampliar el alcance; la cola propone una hipótesis editorial y no demuestra volumen de adquisición.
- Dejar los títulos y series BCU estables durante la ventana de evaluación. La revisión pública no acreditó un canal adicional de adquisición a escala: no construir otro exportador, catálogo o URL por fecha por esa sola hipótesis. Si se autoriza Bing Webmaster, obtener las consultas que faltan antes de ampliar el piloto.
- La lectura publicitaria y de controles ya está completada. Una futura prueba de colocación requiere una alternativa observable y un control; no repetir el diagnóstico general ni aumentar densidad por baja cobertura. El límite del componente manual no es un límite global de anuncios automáticos.
- AdSense confirma anuncios automáticos activos, optimización automática desactivada y cero exclusiones de páginas en la cuenta. El límite de `utils/ads.ts` regula las unidades manuales: **no certifica un límite global de anuncios automáticos**. No interpretar el código como prueba de la configuración de la cuenta.
- Reutilizar la comparación de formatos y ubicaciones ya guardada antes de otro experimento de visibilidad. El informe por bloque manual no suma todo el ingreso de la cuenta.
- Revisar pérdidas de clics sobre páginas con demanda comprobada y el rendimiento de las guías/fichas publicadas el 13/9. Verificar indexación y enlaces antes de crear más URL.
- Revisar atribuciones anómalas y separar uso propio/pruebas de audiencia real antes de invertir por volumen bruto de vistas. No bloquear países por suposición.
- Mantener la utilidad de herramientas y contenido verificable. No comprar tráfico, generar visitas/clics artificiales, incentivar clics en anuncios, publicar contenido masivo sin fuentes o enviar mensajes a terceros sin autorización específica.

## Referencias operativas

- [Lectura GA4 y separación de ingresos privados](../analytics/GA4_DATA_API.md)
- [Lectura y archivo de Search Console](../analytics/SEARCH_CONSOLE_API.md)
- [Google: prácticas de colocación](https://support.google.com/adsense/answer/1346295?hl=es)
- [Google: prácticas de visibilidad](https://support.google.com/adsense/answer/6219980?hl=es)
- [Tareas programadas locales](https://learn.chatgpt.com/docs/automations?surface=app)
