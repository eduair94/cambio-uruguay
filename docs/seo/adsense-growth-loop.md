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

Estado: pendiente de despliegue y comprobación pública del commit que corrige el comprobador. Evidencia local privada: `bcu-local-validation.json`, `bcu-reference-review.md` y `bcu-ui-validation.md` de la carpeta de esta iteración.

## Próximas decisiones

- Tras publicar la corrección BCU, dejar sus títulos y series estables durante la ventana de evaluación. La revisión pública no acreditó un canal adicional de adquisición a escala: no construir otro exportador, catálogo o URL por fecha por esa sola hipótesis. Si se autoriza Bing Webmaster, obtener las consultas que faltan antes de ampliar el piloto.
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
