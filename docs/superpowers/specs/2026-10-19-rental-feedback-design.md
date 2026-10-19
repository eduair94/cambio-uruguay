# Opiniones de quienes usan los alquileres — diseño

2026-10-19. Pedido del usuario: "seguir iterando y mejorando las páginas de alquiler tomando feedback
de usuarios: una caja de sugerencias o algo optimizado para obtener retroalimentación, encuestas o
cuestionarios que puedas usar para ir mejorando", y "enviar encuestas al correo (o un botón en el
newsletter) a quienes se suscribieron a las alertas de alquiler de su zona". Spec y plan aprobados por
la orden permanente de auto-aprobación.

## Lo que había

Ningún widget de opinión en el sitio (`/contacto` es un `mailto:`). Sí: alertas de alquiler con correo
(`rentalAlertEmail`, `utils/rentalAlertDelivery.ts`), newsletter diario (`buildDailyEmail`,
`utils/newsletter.ts`), páginas privadas con `requireAdmin`, el patrón anónimo del alta al newsletter
(honeypot `website` + límite por IP en memoria, ninguna IP guardada) y `sendTelegram` al chat admin.

## Diseño

Un solo destino: la colección `rentalfeedbacks` (base del app), un documento por respuesta.

1. **Micro-encuesta** (`components/rentals/feedback/MicroSurvey.vue`) al final de los resultados de
   `/alquileres-uruguay` y al final de la ficha `/alquileres/<key>`: "¿Encontraste lo que buscabas?"
   (en la ficha: "¿Te sirvió esta ficha?") Sí / En parte / No. Con "En parte" o "No" se abren los
   motivos (chips) y un comentario opcional; con "Sí", un comentario opcional. Se monta sólo en el
   cliente y queda debajo del pliegue, así que no mueve el contenido que se está mirando (CLS) ni pesa
   en la carga. Llegar hasta el final de los resultados ya es el "uso con sentido": no hace falta otro
   disparador. Cerrada o respondida, no vuelve por 30 días (la ficha, 14), por `localStorage`.
2. **Sugerencias** (`SuggestionDialog.vue`): un botón de texto junto a la micro-encuesta y en la nota
   de metodología que abre un formulario corto: qué estabas buscando hacer, si lo encontraste, qué
   faltó (chips), comentario, y un correo opcional sólo si querés respuesta.
3. **Encuesta** (`pages/opinion-alquileres.vue`, noindex, sin anuncios, sólo español): cinco preguntas
   y un comentario (para qué lo usás, cómo va tu búsqueda, recomendación 0–10, qué te importa más —hasta tres—, qué
   mejorarías, comentario y correo opcional). Llega desde:
   - **los correos de alertas de alquiler** (en español): un bloque al pie con
     `/opinion-alquileres?origen=alerta&a=<id de la alerta>`. El servidor busca la alerta para guardar
     su zona (departamento, barrios) y su tipo, y una respuesta por alerta y versión de la encuesta
     se actualiza en vez de duplicarse. El id no da acceso a nada: la baja sigue exigiendo su token.
     No se manda un correo aparte: va dentro del que la persona ya recibe, sin sumar envíos.
   - **el newsletter** (en español): un botón "¿Buscás alquiler? Contanos en 1 minuto"
     (`?origen=newsletter`).
4. **Lectura**: `GET /api/rental-feedback` (`requireAdmin`) devuelve totales, distribución de
   "encontraste", motivos, NPS de la encuesta y las últimas respuestas; la página privada
   `/opiniones-alquileres` (noindex, fuera del sitemap, la navegación y los anuncios) las muestra.
   Cada respuesta con comentario avisa al chat admin de Telegram (tope en memoria). Y la base se lee
   directo para iterar.

## Datos y abuso

`POST /api/rental-feedback`, anónimo: honeypot, 5 envíos por minuto y 30 por día por IP en memoria,
validación contra listas cerradas (`utils/rentalFeedback.ts`, compartido con el cliente), comentario
hasta 1.000 caracteres, correo opcional validado y `select: false`. No se guarda la IP. Sí un
identificador aleatorio por navegador (`localStorage`) para ordenar respuestas de una misma persona,
la ruta, las etiquetas de los filtros activos (los chips de la página, que nunca incluyen la
dirección de referencia) y la propiedad de la ficha.

## Pruebas

Unitarias: validación (listas cerradas, recortes, correo), contexto de búsqueda saneado, el bloque en
el correo de alertas (sólo español, sólo alquiler, id de la alerta en el enlace) y en el newsletter,
y las exclusiones de las dos páginas nuevas. Visual en dev: micro-encuesta, diálogo y encuesta en
320/390/1440, claro/oscuro, teclado.
