# Alertas de búsqueda (alquileres, viviendas en venta, autos y motos usados)

El motor nació para alquileres y conserva sus nombres (`rentalAlert*`, colecciones `rentalalert*`):
desde el 2026-10-17 atiende cinco tipos de suscripción en las mismas colecciones, la misma tarea y
los mismos leases. Renombrar colecciones con suscripciones vivas no compraba nada. Diseño de la
extensión: `docs/superpowers/specs/2026-10-17-alertas-de-busqueda-design.md`.

| tipo | página | identidad | catálogo leído | bajas |
|---|---|---|---|---|
| `rental-search` | `/alquileres-uruguay` | `rent:<fuente>:<id>` | `rentallistings` (meta `uy-rentals`) | sí |
| `rental-opportunity` | `/oportunidades-inmobiliarias-uruguay` | `rent:<fuente>:<id>` | `propertyopportunitysnapshots` | no |
| `car-search` | `/autos-usados-uruguay` | `car:<key>` | `carcatalog` (meta `uy-cars`) | sí |
| `moto-search` | `/motos-usadas-uruguay` | `moto:<key>` | `motocatalog` (meta `uy-motos`) | sí |
| `sale-search` | `/venta-viviendas-uruguay` | `sale:<key>` | `propertysalecatalog` (meta `uy-sales`) | sí |

Los filtros de autos, motos y ventas se normalizan con el normalizador y el serializador de la propia
página (`app/utils/listingAlerts.ts`) y se emparejan con su propio filtro de Mongo, ventana de
frescura incluida (`app/server/utils/listingAlertSources.ts`). Se descartan `sort`, `page`,
`perPage`, `view`, `keys` (favoritos), `sinceDays` (autos) y `recent` (ventas): una alerta sólo mira
lo nuevo. Una clave desconocida o un valor que la página descartaría rechaza el alta. El inventario de
estos catálogos se lee entre dos lecturas del `generatedAt` de su meta: los tres publicadores
escriben filas, podan y recién después actualizan la meta, así que un `generatedAt` que cambió durante
la lectura es una lectura mezclada y se descarta hasta la corrida siguiente. Las motos no tienen
ficha por aviso: el correo enlaza el aviso original sólo si es `https://…mercadolibre.com.uy/`, si no
la búsqueda.

## Bajas de precio

Opcionales por suscripción (`priceDrops`; las guardadas antes del 2026-10-17 no tienen el campo y
valen `false`; el diálogo la ofrece marcada; oportunidades nunca). El índice guarda por tipo y aviso
el último precio visto y el más bajo visto en esa moneda (`rentalalertprices`, sin TTL). Una baja es
un precio al menos 1 % por debajo del MÁS BAJO visto —no del anterior: subir 10 % y volver no es una
rebaja— y como mucho 50 % por debajo: una caída mayor se registra en silencio porque es mucho más
probable una moneda o un monto mal leído. Su espejo: un precio de más del DOBLE del más bajo también
reinicia en silencio, porque o el piso era un error de lectura (un dígito de menos) o lo es este; sin
esa regla un solo error dejaba al aviso sin bajas para siempre. Un cambio de moneda reinicia en
silencio, y los autos con moneda deducida (`currencyInferred`, Facebook) no entran al libro de
precios: una moneda deducida tampoco cuenta para las oportunidades. La baja es un evento más del libro `rentalalertevents`, con identificador
`<aviso>~drop~<moneda>~<precio>~<anterior>`, así que comparte cursor, base silenciosa, outbox y
reintentos con las novedades. Al enviar se exige que el aviso siga cumpliendo los filtros y que su
precio actual sea exactamente el de la baja; si en un mismo resumen el aviso es nuevo y bajó, va una
vez, como baja. El evento se escribe antes que el precio: un corte entre las dos escrituras vuelve a
detectar la baja en vez de perderla. Activar las bajas después guarda `priceDropsFrom` (la frontera
de ese momento) y sólo las bajas descubiertas después cuentan; el cursor no se toca, así que los
avisos nuevos todavía no leídos siguen llegando.

Cada tipo tiene su propio lock de índice (`index:<tipo>`): el evaluador recorre hasta cinco
catálogos cada 10 minutos y con un lock único cualquier alta de otro tipo esperaba o fallaba mientras
tanto.

**Filtros que la página ya no lee igual.** Si un directorio renombra o quita una opción (una
carrocería, un tramo de cilindrada, un departamento con tilde corregida), el normalizador la
descartaría en silencio y la alerta pasaría a mirar todo el catálogo. Antes de leer o enviar, el
evaluador comprueba que cada filtro guardado siga normalizándose a sí mismo
(`rentalAlertFiltersCurrent`); si no, la alerta no manda nada —tampoco lo pendiente— y la cuenta la
lista con lo guardado y un aviso para eliminarla y crearla de nuevo, en vez de fallar la lista entera.
Las claves que el normalizador agrega sólo pueden acotar y no cuentan.

**`filters` vacío.** Mongoose borra los objetos vacíos al guardar (`minimize`), así que una alerta sin
filtros quedaba guardada sin el campo, fallaba en cada corrida y rompía la lista de la cuenta (había
una así en producción el 2026-10-17). El esquema ahora usa `minimize: false` y la lectura trata un
campo ausente como `{}`.

## Alquileres

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

Todas exigen un token Firebase, respetan su revocación, limitan las operaciones al UID autenticado y devuelven `no-store`. Los documentos se proyectan explícitamente: no aparecen UID, email de entrega, token de baja, cursor, firma ni estado interno del envío. Máximo veinte suscripciones por cuenta, sumando todos los tipos. La firma canónica impide crear otra alerta cambiando solamente el orden de barrios/garantías, la página o el ordenamiento. Un límite adicional acota la creación repetida a diez intentos por minuto.

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
- `rentalalertprices`: último y menor precio visto por tipo y aviso, para las bajas.
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
