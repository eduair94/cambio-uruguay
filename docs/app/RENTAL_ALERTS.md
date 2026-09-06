# Suscripciones a novedades de alquiler

La búsqueda `/alquileres-uruguay` permite crear una alerta con los filtros aplicados. Las búsquedas guardadas en el dispositivo también tienen una entrada «Avisarme». La operación alquiler de `/oportunidades-inmobiliarias-uruguay` permite suscribirse a sus propios filtros de comparación. Se administran en `/cuenta?tab=alerts`, separadas de las alertas de divisas y del newsletter.

## Consentimiento y alcance

Cada persona activa explícitamente email, push o ambos y elige como máximo un resumen por hora o por día. No se premarca ningún canal ni se solicita permiso de notificaciones al abrir la página. La cuenta debe ser recuperable, no una sesión anónima de invitado. El email es el de Firebase, verificado en servidor; no se admite un destinatario arbitrario en la petición. Los inicios de sesión por proveedor personalizado pueden utilizar push. El borrador conserva los filtros durante el login, pero no crea una suscripción automáticamente.

El plazo entre novedades depende de las lecturas del catálogo. «Nuevo» significa un identificador de aviso detectado por primera vez después de activar la suscripción; una relectura o un cambio de agrupación no es una novedad. Para oportunidades significa la primera inclusión del identificador del aviso en un análisis vigente. Un cambio de orden, mediana o fecha de cálculo no vuelve a anunciarlo. Cambiar el algoritmo establece una nueva base silenciosa.

Los filtros de alquiler se normalizan con las mismas funciones y se ejecutan con los mismos stages Mongo que lista y mapa, incluida la ventana pública `RENTAL_STALE_DAYS`. Se conservan barrios y garantías como alternativas, sedes/radio, superficie, moneda, dueño, mascotas, dormitorios mínimos/exactos y presupuestos satisfechos por una misma oferta. Los filtros de oportunidades conservan su semántica: dormitorios exactos y costo mensual analizado. No se recalcula una mediana a partir del presupuesto elegido por el usuario.

## API privada

- `GET /api/me/rental-alerts`: preferencias propias y disponibilidad de canales.
- `POST /api/me/rental-alerts`: tipo, filtros, canales, frecuencia, idioma y nombre opcional.
- `PATCH /api/me/rental-alerts/:id`: pausa/reanudación, canales, frecuencia o nombre.
- `DELETE /api/me/rental-alerts/:id`: elimina la suscripción y su historial privado de envíos.

Todas exigen un token Firebase, respetan su revocación, limitan las operaciones al UID autenticado y devuelven `no-store`. Los documentos se proyectan explícitamente: no aparecen UID, email de entrega, token de baja, cursor, firma ni estado interno del envío. Máximo diez suscripciones por cuenta. La firma canónica impide crear otra alerta cambiando solamente el orden de barrios/garantías, la página o el ordenamiento. Un límite adicional acota la creación repetida a diez intentos por minuto.

El alta y la reanudación establecen su base sincrónicamente, antes de devolver éxito. Cambiar a otro canal también comienza desde una frontera nueva. Reducir consentimiento se permite aunque el otro canal esté temporalmente indisponible; conserva su trabajo pendiente. El enlace de baja anterior sigue siendo válido al modificar sólo push.

`GET /api/rental-alerts/unsubscribe?token=…` muestra una confirmación y no cambia datos: los escáneres de correo no cancelan preferencias. El `POST` cancela sólo el canal email, sin login, y es idempotente para los clientes de correo que implementan `List-Unsubscribe-Post`. Si era el único canal, la suscripción queda pausada. El token aleatorio de 32 bytes vive sólo en el documento privado y en los correos; las respuestas usan `no-store` y `no-referrer`.

## Persistencia y ejecución

La implementación vive completa en `app/` y usa su MongoDB, sin imports desde el backend raíz ni nuevas tareas en `currency-server`.

- `rentalalerts`: suscripciones, frontera de activación, cursor, revisión y secretos privados.
- `rentalalertevents`: identidad duradera de avisos observados; sobrevive a la poda del catálogo.
- `rentalalertindexes`: frontera del último inventario completado y versión del análisis.
- `rentalalertoutbox`: lotes con progreso independiente para email y push.
- `rentalalertleases`: exclusión entre los workers de Nuxt, con dueño y vencimiento.
- `rentalalertquotas`: límites efímeros de altas.
- `pushregistrations`: propiedad única de cada dispositivo por hash de token.

Nitro ejecuta `rentals:alerts` a los minutos 2, 12, 22, 32, 42 y 52 de cada hora. Los leases se comparten entre el evaluador, altas, modificaciones y bajas. El índice se lee con paginación y genera fechas UTC con precisión de milisegundos; no usa `firstSeen` diario como cursor. El mismo aviso conserva su evento cuando cambia la URL interna, se separa un grupo o reaparece.

El evaluador pagina eventos sin perder los que quedan después de un lote. Agrupa hasta 200 identificadores por lote y muestra hasta diez fichas en un correo, con enlace a la búsqueda. Vuelve a comprobar frescura, filtros y revisión antes de enviar. Las oportunidades también contrastan que el precio y los gastos del aviso no hayan cambiado desde el análisis. Una pausa, eliminación o revisión incompatible cancela el trabajo pendiente.

Cada canal guarda la intención antes del transporte y su resultado después. Un email exitoso no se repite si push falla. Los rechazos claros tienen reintentos acotados; una aceptación incierta no se reintenta automáticamente. SMTP no garantiza exactamente una entrega: un cierre de conexión después de aceptar el mensaje puede dejar ese resultado indeterminado. La interfaz no certifica recepción en una bandeja de entrada o dispositivo.

## Canales y operación

Email reutiliza `SMTP_HOST/PORT/SECURE/USER/PASS/FROM`, con HTML escapado, texto plano, `Message-ID` estable y enlace de baja. Push reutiliza Firebase Admin y `NUXT_PUBLIC_FCM_VAPID_KEY`; usa HTTP v1 por dispositivo, resultados individuales y un plazo acotado. Los tokens inválidos se retiran sin confundir un error del payload con un dispositivo inválido.

El único service worker Workbox recibe los mensajes. Los mensajes inmobiliarios llevan datos y se muestran una vez con enlace interno; los mensajes antiguos de tipo `notification` conservan la visualización automática de Firebase. Al salir se revoca el dispositivo; si esa operación falla, se conserva la sesión y se ofrece reintentar. Cambiar de cuenta transfiere explícitamente la propiedad del token al registrarlo de nuevo.

La ejecución real está deshabilitada en desarrollo, prerender y fuera de `NODE_ENV=production`. `RENTAL_ALERTS_ENABLED=0` o `NUXT_RENTAL_ALERTS_ENABLED=false` permiten detener entregas conservando la gestión de preferencias. `runRentalAlerts({dryRun:true})` utiliza el matcher real y no modifica índice, cursor, outbox ni llama a los transportes.

## Validación del 2026-09-06

La revisión incluye consentimiento/verificación, filtros compartidos, cursores y paginación, baseline silencioso, concurrencia de leases, cambios de cuenta, revocación de dispositivos, baja independiente de email y resultados inciertos. El proveedor SMTP aprobó autenticación y conexión mediante `verify()` sin enviar correos. FCM respondió a una validación HTTP v1 con token ficticio y sin entrega real; esto comprueba acceso al servicio, no recepción en un dispositivo.

La suite completa de la app pasó 5.567 pruebas (diez omitidas por sus condiciones existentes). Una base MongoDB local aislada validó ocho escenarios con 411 avisos, incluida paginación de 401 coincidencias sin duplicados, dos novedades en el mismo día, relecturas, separación de propiedades, gastos desconocidos/cero/en dólares, cambio de precio y exclusión entre workers. Esta prueba no creó envíos y la instancia local se detuvo al terminar.

Ocho escenarios de navegador validaron pantallas de 320 y 390 px, login con filtros intactos, verificación de correo, canales explícitos, gestión de cuenta, conservación de preferencias ante errores y oportunidades sólo de alquiler. Ocho pruebas adicionales del cliente cubren cambios de cuenta durante peticiones. El lint completo terminó sin errores; conserva siete advertencias previas de otras páginas. La ayuda de instalación para iPhone/iPad sigue el requisito de Web Push de [WebKit](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/).
