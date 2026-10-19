# Opiniones de quienes usan los alquileres

Desde el 19/10/2026. Para qué existe: dejar de adivinar qué mejorar en `/alquileres-uruguay` y en la
ficha, y preguntarle a la gente que los usa. Diseño en
`docs/superpowers/specs/2026-10-19-rental-feedback-design.md`.

## Por dónde llegan las respuestas

| entrada | dónde | qué pregunta |
|---|---|---|
| **Pregunta** (`kind: micro`) | al final de los resultados de `/alquileres-uruguay` (lista y mapa) y al final de la ficha | «¿Encontraste lo que buscabas?» / «¿Te sirvió esta ficha?» Sí / En parte / No → qué faltó → comentario |
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

- **No mueve la página.** La pregunta se monta sólo en el cliente (`<ClientOnly>`) y debajo de lo que
  se está mirando: ni CLS ni peso en la carga. Llegar al final de los resultados ya es "uso con
  sentido": no hay otro disparador.
- **No insiste.** Respondida o cerrada, no vuelve por 30 días (la ficha, 14), con `localStorage`
  (`useRentalFeedback`). Si el almacenamiento está bloqueado, vuelve la próxima vez: es el
  comportamiento honesto.
- **Sin modal.** La sugerencia se despliega en la misma tarjeta.
- **Sólo español.** La encuesta y la pregunta: el público busca en Uruguay. En `/en/` y `/pt/` no se
  muestran.
- **Privacidad.** No se guarda la IP (el límite por IP vive en memoria: 5 por minuto, 30 por día). Se
  guarda un id aleatorio por navegador para leer en orden las respuestas de una misma persona, las
  **etiquetas** de los filtros activos (los chips, nunca la dirección de referencia), la ficha y,
  sólo si la persona lo deja para que le respondamos, el correo (`select: false`).
- **Listas cerradas.** Cada respuesta se valida contra `utils/rentalFeedback.ts` (el mismo módulo
  arma las preguntas en el cliente): lo que no está en la lista no se guarda. Cambiar una pregunta
  exige subir `SURVEY_VERSION`, así nunca se mezclan respuestas a dos redacciones.

## Dónde leerlas

- **`/opiniones-alquileres`**: panel privado (`requireAdmin`, `NUXT_ADMIN_EMAILS`), noindex, fuera
  del sitemap, de la navegación y de los anuncios. Totales, «¿encontraste?», qué faltó, qué venían a
  hacer, zonas de las alertas, cada pregunta de la encuesta, NPS y las últimas 200 respuestas con
  comentario y contexto. Lo sirve `GET /api/rental-feedback` (últimos 120 días).
- **Telegram**: cada respuesta con comentario avisa al chat admin (`TELEGRAM_ADMIN_CHAT_ID`), hasta
  10 por hora.
- **La base** (APP DB, colección `rentalfeedbacks`), para iterar con los datos crudos:

  ```js
  db.rentalfeedbacks.aggregate([
    { $match: { createdAt: { $gte: new Date(Date.now() - 30 * 864e5) } } },
    { $unwind: '$reasons' },
    { $group: { _id: { surface: '$surface', reason: '$reasons' }, n: { $sum: 1 } } },
    { $sort: { n: -1 } },
  ])
  ```

## Cómo se usa para mejorar

Leer cada semana lo que más se repite (motivos y comentarios), elegir el problema de más peso,
arreglarlo y anotarlo en `docs/app/RENTALS.md` con la cifra que lo motivó ("12 de 40 respuestas de la
ficha dicen avisos que ya no están"). La misma pregunta, leída después del arreglo, dice si sirvió.
