# Videos nuevos a X por IFTTT (`/feeds/videos.xml`)

Pedido (13/11/2026): "Publicar en IFTTT cuando sale un nuevo video relacionado en YouTube".

## Intención

Que la cuenta de X del sitio (@cambio_uruguay) avise sola cuando un canal uruguayo de la lista de
`/videos-de-economia-uruguay` sube un video sobre los temas del sitio, y que el clic caiga en el
sitio (la página del tema, con el video ahí), no en YouTube.

## Decisiones

- **Mismo camino que `/feeds/x.xml`**: feed RSS servido por el app + applet "RSS Feed → X: Post a
  tweet" con `{{EntryContent}}`. Sin job nuevo, sin credenciales de X, sin modelo de lenguaje.
- **Destino X, no LinkedIn**: LinkedIn es el perfil personal del dueño; varios videos ajenos por
  día ahí es ruido. X es la cuenta de la marca.
- **"Relacionado"** = canal uruguayo (`channelCountry === 'UY'`), clasificador de plata `money` y
  al menos un tema. Afuera los programas diarios que llevan la fecha completa en el título ("Hoy en
  el Diario Oficial • 13 de noviembre 2026"): saldrían todos los días.
- **Ritmo, sin estado**: un video entra al feed 90 min después de publicado (con el job cada hora,
  ya fue leído). Entre las 23:00 y las 8:30 de Montevideo no sale nada: lo de la noche espera a las
  8:30. Por día de Montevideo: máximo 4, uno por canal, 60 min entre uno y otro. El orden es por
  hora y desempata por fecha de publicación e id (nunca por puntaje, que cambia con las vistas y
  reordenaría lo ya publicado). Cada día se calcula solo, así que mover la ventana no reordena nada.
- **`guid` = id del video**: IFTTT no repite un ítem que ya vio.
- **Enlace**: `/videos-de-economia-uruguay/<primer tema>#video-<id>`; la tarjeta del video lleva
  ese `id` en la página del tema.
- **Texto**: tres redacciones fijas que rotan por id, con el título del canal sin hashtags (en X se
  volverían nuestros). Entra en 280 con la URL a 23; si no, se corta el título.
- **`currency-videos` pasa de cada 6 h a cada hora**: si no, "cuando sale" sería hasta 6 h tarde.
  El feed de YouTube es público, sin cuota. Se corrige el texto de la página que decía "cada 6 horas".
- **Caché**: `s-maxage` hasta el próximo video programado, entre 60 s y 15 min.

## Fuera de alcance

Canales extranjeros, videos "maybe", subir el video a X, LinkedIn.
