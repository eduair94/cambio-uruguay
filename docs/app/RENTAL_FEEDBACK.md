# Opiniones de quienes usan los alquileres

Desde el 19/10/2026. Para qué existe: dejar de adivinar qué mejorar en `/alquileres-uruguay` y en la
ficha, y preguntarle a la gente que los usa. Diseño en
`docs/superpowers/specs/2026-10-19-rental-feedback-design.md`.

## Por dónde llegan las respuestas

| entrada | dónde | qué pregunta |
|---|---|---|
| **Pregunta** (`kind: micro`) | al final de los resultados de `/alquileres-uruguay` (lista y mapa) y al final de la ficha | «¿Encontraste lo que buscabas?» / «¿Te sirvió esta ficha?» Sí / En parte / No, **guardado en el toque** → después, opcional, qué faltó y un comentario sobre la misma fila |
| **Sugerencia** (`kind: box`) | «Dejar una sugerencia», en la misma tarjeta | qué venías a hacer, qué faltó, comentario, correo opcional |
| **Encuesta** (`kind: survey`) | `/opinion-alquileres` | cinco preguntas: uso, cómo va la búsqueda, recomendación 0–10 (NPS), qué importa (hasta 3), qué mejorar, comentario |

La encuesta se abre desde:

- **los correos de alertas de alquiler** (`rentalAlertEmail`, `server/utils/rentalAlertDelivery.ts`):
  un bloque «¿Te están sirviendo estas alertas?» antes del enlace de baja, sólo en español y sólo en
  alertas de alquiler (no autos, motos ni ventas). El enlace lleva el id de la alerta
  (`?origen=alerta&a=<id>`): el servidor guarda la **zona** de esa alerta (barrios y departamento) y
  una respuesta por alerta y versión de la encuesta se **actualiza** en vez de duplicarse. El id no da
  acceso a nada; la baja sigue exigiendo su token. No hay un correo aparte: va dentro del que la
  persona ya recibe.
- **el newsletter diario** (`buildDailyEmail`, `server/utils/newsletter.ts`): «¿Buscás alquiler?
  Ayudanos a mejorar el buscador en un minuto», sólo en la edición en español, con la misma atribución
  `utm_*` que el resto de los enlaces editoriales.
- **la pregunta**, después de responderla («respondé la encuesta de cinco preguntas»).

## Reglas

- **El toque es la respuesta** (desde el 8/11/2026). Tocar Sí / En parte / No manda el
  `POST /api/rental-feedback` en ese momento y la tarjeta dice «Gracias»; qué faltó (con «En parte» o
  «No») y el comentario quedan abajo, opcionales, y completan **la misma fila**: el POST devuelve
  `{ ok, id }` y el seguimiento es `PATCH /api/rental-feedback/:id` con los motivos y el comentario.
  Antes el toque sólo mostraba «Enviar» y no guardaba nada: `rentalfeedbacks` llegó a 20 días con 0
  filas mientras al menos 150 personas de Uruguay con consentimiento pasaban por la tarjeta (evento
  `scroll` de GA4, 28 días) y ninguna tocó el campo de texto (0 `form_start` en fichas). Por eso una
  fila `micro` **sin motivos ni comentario es una respuesta completa de un toque**, no una a medias.
- **El seguimiento es de quien tocó.** El PATCH escribe sólo si el `clientId` del navegador coincide
  con el de la fila, la fila es `micro` y tiene menos de 30 minutos
  (`FEEDBACK_FOLLOW_UP_MINUTES`); cualquier otra cosa responde 404, igual que un id inexistente. Con
  el almacenamiento bloqueado el navegador usa un id de esa sola vista, así el toque y su seguimiento
  igual coinciden. Mismo honeypot y mismos límites por IP que el POST, cada ruta con los suyos.
- **Un seguimiento tardío no se pierde.** Ante un 404 (la persona volvió a la pestaña pasada la media
  hora, o el navegador perdió su id) reintentar no sirve nunca, así que la tarjeta no muestra un
  error: manda los motivos y el comentario como una fila `box` aparte (`found: null`, mismo
  `clientId`, misma superficie y ficha). Un fallo del momento (sin red, el límite por IP) sí dice
  «No pudimos enviarlo» y deja reintentar.
- **No mueve la página.** La pregunta se monta sólo en el cliente (`<ClientOnly>`) y debajo de lo que
  se está mirando: ni CLS ni peso en la carga. Llegar al final de los resultados ya es "uso con
  sentido": no hay otro disparador.
- **No insiste.** Respondida o cerrada, no vuelve por 30 días (la ficha, 14), con `localStorage`
  (`useRentalFeedback`). Si el almacenamiento está bloqueado, vuelve la próxima vez: es el
  comportamiento honesto.
- **Sin modal.** La sugerencia se despliega en la misma tarjeta.
- **Sólo español.** La encuesta y la pregunta: el público busca en Uruguay. En `/en/` y `/pt/` no se
  muestran.
- **Privacidad.** No se guarda la IP (el límite por IP vive en memoria, por proceso: 5 por minuto,
  30 por día, en cada ruta). Se guarda un id aleatorio por navegador para leer en orden las
  respuestas de una misma persona, las **etiquetas** de los filtros activos (los chips, nunca la
  dirección de referencia), la ficha y, sólo si la persona lo deja para que le respondamos, el
  correo (`select: false`).
- **Listas cerradas.** Cada respuesta se valida contra `utils/rentalFeedback.ts` (el mismo módulo
  arma las preguntas en el cliente): lo que no está en la lista no se guarda. Cambiar una pregunta
  exige subir `SURVEY_VERSION`, así nunca se mezclan respuestas a dos redacciones.

## Dónde leerlas

- **`/opiniones-alquileres`**: panel privado (`requireAdmin`, `NUXT_ADMIN_EMAILS`), noindex, fuera
  del sitemap, de la navegación y de los anuncios. Totales, «¿encontraste?», qué faltó, qué venían a
  hacer, zonas de las alertas, cada pregunta de la encuesta, NPS y las últimas 200 respuestas con
  comentario y contexto. Lo sirve `GET /api/rental-feedback` (últimos 120 días).
- **Telegram**: cada respuesta con comentario avisa al chat admin (`TELEGRAM_ADMIN_CHAT_ID`), hasta
  10 por hora entre las dos rutas (`server/utils/rentalFeedbackNotice.ts`). En la pregunta el
  comentario llega con el seguimiento, así que el aviso sale del PATCH (con los motivos marcados), y
  un comentario reenviado igual no avisa dos veces.
- **La base** (APP DB, colección `rentalfeedbacks`), para iterar con los datos crudos:

  ```js
  db.rentalfeedbacks.aggregate([
    { $match: { createdAt: { $gte: new Date(Date.now() - 30 * 864e5) } } },
    { $unwind: '$reasons' },
    { $group: { _id: { surface: '$surface', reason: '$reasons' }, n: { $sum: 1 } } },
    { $sort: { n: -1 } },
  ])
  ```

## Cómo se mide el embudo

Vista → toque → seguimiento, cada paso por su lado:

- **Vista**: `feedback_view` (GA4, por `useTrack`, con `surface`), una vez por tarjeta cuando se ve la
  mitad.
- **Toque**: `data-cta` `rental-feedback-si`, `rental-feedback-en-parte`, `rental-feedback-no` y
  `rental-feedback-box` («Dejar una sugerencia»), y `rental-feedback-follow-up` en el «Enviar» del
  seguimiento: llegan a GA4 como `cta_click` (`plugins/track-clicks.client.ts`). La dimensión
  `cta` tiene que estar registrada en GA4 (Admin → Definiciones personalizadas, de evento): no es
  retroactiva. Las mismas etiquetas llevan el botón de alertas (`rental-alert-open`, y
  `car-alert-open`, `moto-alert-open`, `sale-alert-open`, `rental-opportunity-alert-open` en los otros
  directorios), el «Iniciar sesión» del diálogo de alertas (`rental-alert-login` y sus pares) y el
  aviso de no disponible (`rental-report-unavailable`).
- **Seguimiento**: en la base, las filas `micro` con motivos o comentario (el panel las cuenta como
  «preguntas con qué faltó o comentario»).
- **Microsoft Clarity**, cuando esté activo: cada respuesta deja la etiqueta `feedback` (`si`,
  `en-parte`, `no`, `sugerencia`), el evento `feedback_<respuesta>` y un `upgrade`, para ver la
  grabación de quien contestó «No». Los `data-cta` llegan como eventos `cta_<valor>`.
  - **Línea de base antes de prenderlo** (Cloudflare Web Analytics, `rumWebVitalsEventsAdaptiveGroups`,
    1–8/11/2026, p75, eventos muestreados): `/` móvil CLS 0,716 · INP 552 ms · LCP 1,9 s (n=280);
    `/` escritorio CLS 0,155 · INP 80 ms · LCP 2,4 s; `/alquileres-uruguay` móvil CLS 0 · INP 104 ms ·
    LCP 2,0 s; `/autos-usados-uruguay` móvil CLS 0,228 · INP 352 ms · LCP 1,6 s. Una semana después de
    prenderlo se vuelve a leer la misma consulta (la corre el token de caché del VPS: el análisis de
    cuenta está permitido, `rum/site_info` no): si el INP móvil p75 sube más de 10 %, se baja el
    muestreo en `utils/clarityPolicy.ts`. El CLS de la home no es de la página: es la unidad
    automática *in-page* de AdSense que entra arriba del H1 (reproducido el 8/11 a 390 px: 300 px a
    los 5,5 s, el hero baja 308 px) — ver `auto-ads` en la consola, no código.

```js
db.rentalfeedbacks.aggregate([
  { $match: { kind: 'micro', createdAt: { $gte: new Date(Date.now() - 28 * 864e5) } } },
  {
    $group: {
      _id: { surface: '$surface', found: '$found' },
      n: { $sum: 1 },
      conDetalle: {
        $sum: { $cond: [{ $or: [{ $gt: [{ $size: '$reasons' }, 0] }, { $ne: ['$comment', ''] }] }, 1, 0] },
      },
    },
  },
])
```

## Cómo se usa para mejorar

Leer cada semana lo que más se repite (motivos y comentarios), elegir el problema de más peso,
arreglarlo y anotarlo en `docs/app/RENTALS.md` con la cifra que lo motivó ("12 de 40 respuestas de la
ficha dicen avisos que ya no están"). La misma pregunta, leída después del arreglo, dice si sirvió.
