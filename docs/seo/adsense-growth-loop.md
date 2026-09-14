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

## Próximas decisiones

- AdSense confirma anuncios automáticos activos, optimización automática desactivada y cero exclusiones de páginas en la cuenta. El límite de `utils/ads.ts` regula las unidades manuales: **no certifica un límite global de anuncios automáticos**. No interpretar el código como prueba de la configuración de la cuenta.
- Comparar formatos automáticos, ubicaciones manuales y páginas antes de otro experimento de visibilidad. El informe por bloque manual no suma todo el ingreso de la cuenta.
- Revisar pérdidas de clics sobre páginas con demanda comprobada y el rendimiento de las guías/fichas publicadas el 13/9. Verificar indexación y enlaces antes de crear más URL.
- Revisar atribuciones anómalas y separar uso propio/pruebas de audiencia real antes de invertir por volumen bruto de vistas. No bloquear países por suposición.
- Mantener la utilidad de herramientas y contenido verificable. No comprar tráfico, generar visitas/clics artificiales, incentivar clics en anuncios, publicar contenido masivo sin fuentes o enviar mensajes a terceros sin autorización específica.

## Referencias operativas

- [Lectura GA4 y separación de ingresos privados](../analytics/GA4_DATA_API.md)
- [Lectura y archivo de Search Console](../analytics/SEARCH_CONSOLE_API.md)
- [Google: prácticas de colocación](https://support.google.com/adsense/answer/1346295?hl=es)
- [Google: prácticas de visibilidad](https://support.google.com/adsense/answer/6219980?hl=es)
- [Tareas programadas locales](https://learn.chatgpt.com/docs/automations?surface=app)
