# Instagram Reels y Facebook Reels como fuentes del directorio de alquileres — diseño (2026-09-24)

## Qué se pide

"Implementar para TikTok, Instagram reels, Facebook reels, etc." TikTok ya es fuente desde el
2026-09-23 (`classes/rentals/sources/tiktok/`, 47 avisos en el barrido de anoche). Falta el resto de
las redes de video corto donde las inmobiliarias uruguayas publican el mismo tipo de aviso: una
leyenda con precio, gastos comunes, dormitorios, esquina y barrio.

## Lo medido (2026-09-24)

| red | descubrimiento sin sesión | de dónde sale la leyenda | medido |
|---|---|---|---|
| TikTok | hashtags + cuentas (por proxy) | respuesta de lista | 47 avisos anoche |
| Instagram | **sólo cuentas**: `/explore/tags/…` redirige a login; `/api/v1/users/web_profile_info` da 429 hasta desde IP residencial | la página del post, un Chrome real, ~6 s cada una: el JSON embebido trae el nodo con `code`, `caption.text`, `taken_at`, `user.username`, `product_type`, `image_versions2` | 12 de 12 posts de `@inmobiliariaalquilar` leídos **desde la IP del VPS**, todos recientes y con precio; cada vivienda aparece **dos veces** (carrusel + reel con la leyenda idéntica) |
| Facebook Reels | **búsqueda de videos** (`/watch/search/?q=…`) y `/hashtag/…` sin sesión | la página misma: cada resultado trae el `Story` completo (`message.text`, `post_id`, `actors[0]`, `attachments[0].styles.attachment.media.{videoId, publish_time, thumbnailImage}`, permalink `/reel/<id>/`) | 8 páginas desde el VPS en 80 s: 24 historias únicas, 23 reels, 6 de los últimos 45 días, 4 con precio; aparecen avisos de República Dominicana y Colombia |
| YouTube | búsqueda y `/hashtag/…` con `yt-dlp` | una lectura por video | 49 videos: sólo 3 de los últimos 45 días y **ninguno con precio**; los de inmobiliarias tienen 1–4 años. **No se construye** |

Otros hechos que deciden el diseño:

- **La misma inmobiliaria publica la misma vivienda en TikTok, Instagram y Facebook** ("Gaboto y
  La Paz, $22.000, 2 dormitorios" está en las tres), a veces con leyendas distintas. Sin una guarda,
  el directorio la mostraría tres o cuatro veces.
- **Un handle de TikTok no es una cuenta de Instagram**: `habitarte.inmobiliaria` es una
  inmobiliaria mexicana en Instagram; `cap.propiedades` y `zamar.inmo` no existen ahí;
  `inmobiliariaalquilar` sí es la misma de Montevideo. Los handles de TikTok sirven como
  **candidatos**, que se verifican por su contenido.
- Instagram, logged out, sirve **los 12 posts más recientes** de un perfil. Una cuenta que publica
  dos veces por día muestra una semana.
- La sesión del Chrome de Facebook (`facebook_profile_browser`, CDP :9224) está en error desde el
  2026-09-24 07:31 UTC (`FB_PROFILE_BROWSER_MONITOR_INVALID_RESPONSE`); los jobs de ficha de
  Marketplace y autos se saltean. **Estas fuentes no la usan**: un Chrome headless propio, sin
  sesión, como TikTok. El Chrome del perfil no tiene sesión de Instagram.
- `robots.txt` de facebook.com e instagram.com: `User-agent: *` / `Disallow: /`. Igual que con
  TikTok, la decisión de leer páginas públicas la toma el dueño del sitio (pedido del
  2026-09-23/24), con un interruptor por red y sin tomar contactos.

## Alcance

**Entra**

1. `classes/rentals/sources/social/`: lo que no depende de la red, extraído de `tiktok/`:
   `caption.ts` (sin cambios), `post.ts` (`SocialPost` con `source` y `url`), `process.ts` (ventana,
   leyenda → hechos, geocodificación una vez por post, fila de memoria), `store.ts` (memoria por
   colección), `copies.ts` (la guarda de copias), `chrome.ts` (lanzar el Chrome headless, que hoy
   vive en `tiktok/browser.ts`) e `index.ts` (`harvestSocial`, que corre las tres redes en
   secuencia, un Chrome a la vez, y aplica la guarda).
2. **Instagram** (`source: "instagram"`, etiqueta "Instagram", `listingId = instagram:<code>`):
   registro de cuentas `rentalinstagramaccounts` (semillas `RENTALS_INSTAGRAM_ACCOUNTS`, por defecto
   `inmobiliariaalquilar`, más los handles del registro de TikTok como candidatos), perfil → 12
   códigos → sólo los códigos **nuevos** se leen (los conocidos se reconstruyen de la memoria
   `rentalinstagramposts`), cada post por su página. Carruseles y reels: los dos son avisos, y la
   guarda deja uno.
3. **Facebook Reels** (`source: "facebookreels"`, etiqueta "Facebook Reels", `listingId =
   facebookreels:<post_id>`): búsquedas de video y hashtags configurables, sólo historias con video
   (`videoId`), memoria `rentalfacebookreelsposts`.
4. **Guarda de copias** con reclamos estables en `rentalsocialclaims` (abajo).
5. Espejos de las dos claves nuevas (los mismos doce lugares que agregó TikTok, `tsc` es el
   tripwire de los mapas tipados), docs, `AGENTS.md`, memoria.

**No entra**

- YouTube (medido: cero avisos recientes con precio), Threads y X (la búsqueda exige sesión),
  Kwai (sin presencia medible en Uruguay).
- Contactos: el teléfono vive en la leyenda y `rentalDescription` lo borra, como en TikTok.
- Sesiones: ni de Instagram ni de Facebook. Si la de Facebook vuelve, no cambia nada acá.
- Unir copias como ofertas de una misma propiedad: el directorio exige dirección exacta para unir
  avisos (`dedupe.ts`), y una esquina no lo es. La guarda **deja uno** y cuenta el resto.

## La guarda de copias

Cada aviso aceptado lleva hasta dos claves:

- **huella de hechos**: la primera esquina/dirección candidata normalizada (calles ordenadas: "La
  Paz y Gaboto" = "Gaboto y La Paz") + moneda + precio + dormitorios. Sólo existe si están las tres
  cosas; si falta una, el aviso no se une con nadie por hechos.
- **gemelo de texto**: `red:autor:hash(leyenda normalizada)` — el carrusel y el reel de Instagram
  con la misma leyenda, aunque no traigan esquina.

Dos avisos que comparten una clave son la misma vivienda. En cada corrida:

1. Se cargan los reclamos vivos (`lastSeenAt` en los últimos `RENTALS_PRUNE_DAYS`, 21).
2. Se agrupan los avisos del día que comparten alguna clave (unión de conjuntos).
3. El canónico del grupo es, en orden: el que ya tenía un reclamo vivo y se vio hoy (el de
   `firstPublishedAt` más viejo); si el reclamante vivo NO se vio hoy, **ninguno** del grupo se
   publica (su oferta sigue en el directorio hasta que caduque o se pode, y cuando el reclamo
   vence a los 21 días una copia puede tomar el lugar); si no hay reclamo, el de la red de mayor
   prioridad (TikTok, Instagram, Facebook Reels) y, dentro de la red, el más viejo.
4. Se publica sólo el canónico; las copias se cuentan en la nota de su red ("N copias de avisos
   ya publicados").
5. Se reclaman todas las claves del grupo para el canónico (`lastSeenAt = ahora`,
   `firstPublishedAt` sólo la primera vez).

Estable a propósito: si el canónico cambiara de red entre corridas, la oferta vieja seguiría
publicada (ninguna de estas fuentes es `complete`, así que nada caduca por ausencia) y la vivienda
aparecería dos veces hasta la poda.

## Instagram, paso a paso

1. `RENTALS_INSTAGRAM_ENABLED=0` → deshabilitado. Horaria → no lee.
2. Cuentas: el registro + semillas + candidatos del registro de TikTok que no estén en el
   registro. Estados: `semilla`, `activa` (publicó algún aviso aceptado), `candidata`, `no existe`
   (el perfil dice "no está disponible"), `descartada` (≥3 posts leídos y ninguno aceptado, como la
   mexicana). `no existe` y `descartada` se vuelven a mirar a los 30 días. Orden: semillas y activas
   por `lastReadAt` más viejo, después candidatas; tope `RENTALS_INSTAGRAM_MAX_ACCOUNTS` (40).
3. Un Chrome (sin proxy por defecto: desde el proxy Instagram devolvió error de red; desde la IP
   del VPS contestó; `RENTALS_INSTAGRAM_PROXY` lo cambia), presupuesto
   `RENTALS_INSTAGRAM_BUDGET_MS` (12 min), pausa `RENTALS_INSTAGRAM_GAP_MS` (2,5 s): perfil → códigos
   → cada código que la memoria no tiene → página del post → nodo con ese `code`.
4. Posts: los leídos hoy + los conocidos que el perfil sigue listando (reconstruidos de la memoria).
   Lo que el perfil ya no lista no se emite y no caduca: `complete` es siempre `false` (12 posts no
   son el catálogo).
5. `process.ts` → avisos; registro actualizado; la guarda decide qué se publica.

## Facebook Reels, paso a paso

1. `RENTALS_FBREELS_ENABLED=0` → deshabilitado. Horaria → no lee.
2. Un Chrome sin sesión (sin proxy por defecto; `RENTALS_FBREELS_PROXY`), páginas
   `RENTALS_FBREELS_QUERIES` (búsquedas de video: alquiler montevideo, alquiler apartamento
   montevideo, alquilo apartamento, alquiler casa montevideo, alquiler canelones, alquiler
   maldonado, alquiler pocitos, alquiler cordon, alquiler centro montevideo, alquiler buceo,
   alquiler malvin, alquiler punta del este) y `RENTALS_FBREELS_TAGS` (alquilermontevideo,
   alquileruruguay), presupuesto `RENTALS_FBREELS_BUDGET_MS` (6 min), pausa 2,5 s.
3. De cada página, los `Story` con `message.text`, `post_id`, `actors` y un video: leyenda,
   autor (nombre y URL), `/reel/<videoId>/`, `publish_time`, miniatura.
4. `process.ts` → avisos, la guarda decide. `complete` siempre `false`.

## Pruebas

- `social/copies.ts`: huella con calles en cualquier orden, sin huella sin esquina o dormitorios,
  gemelo de texto, prioridad de red, reclamante vivo visto y no visto, reclamo vencido.
- Instagram: parser de perfil (códigos, "no disponible"), parser de post (el nodo con ESE code, no
  el primero de la página: la página trae varios), reconstrucción desde memoria, estados del
  registro, deshabilitado/horaria.
- Facebook Reels: parser de historias (sólo con video, autor, permalink, fecha), deshabilitado.
- TikTok: la suite actual pasa sin cambios de comportamiento después de la extracción.
- `harvestSocial`: tres redes, copias entre redes, notas.
- App: largo de la cobertura (6 → 8), fila en la tabla de cobertura del e2e.
- Medición real en el VPS antes del merge y después del despliegue.
