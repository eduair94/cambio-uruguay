# Presentación en video de cada aviso (autos, alquileres, ventas)

Fecha: 2026-10-26. Pedido: "agregar video automatizado / presentación a los vehículos / casas,
generado en un flujo automatizado y ágil sin usar tokens de IA, con la información disponible del
producto, para mejorar la experiencia del usuario".

## Intención

Una ficha hoy es una galería + una tabla. Quien está decidiendo entre veinte avisos quiere el
resumen en 30–45 segundos: las fotos grandes y, encima, lo que importa (precio, año/km o
dormitorios/m², zona, cómo está el precio contra los comparables, qué declara el aviso). Y quiere
poder **mandárselo a alguien** (pareja, socio, mecánico) por WhatsApp.

## Decisión de cómo (mía)

**Se arma en el navegador, no en el servidor.** Un MP4 por aviso en el VPS serían ~45.000 videos
(20k autos + 25k alquileres + ventas), con CPU, disco y cola de regeneración cada vez que cambia un
precio. En cambio:

- El guion (escenas) es una **función pura** de los datos que la ficha ya trae
  (`utils/listingPresentation.ts`): cero pedidos nuevos, cero tokens, cero costo de servidor, y se
  "genera" en el acto para cualquier aviso, incluido el que entró hace cinco minutos.
- Un solo renderizador `<canvas>` dibuja las escenas (efecto Ken Burns sobre las fotos, rótulos,
  tarjeta de precio contra comparables). El **mismo** canvas sirve para reproducir y para
  **descargar el video** (`canvas.captureStream` + `MediaRecorder`, MP4 si el navegador lo graba,
  si no WebM) y compartirlo con `navigator.share({ files })`.
- **Narración opcional** con la voz del sistema (`speechSynthesis`, es-UY/es-*): gratis, local, sin
  tokens. No entra en el archivo descargado (la API no expone el audio); el video lleva los rótulos
  quemados, que es lo que se ve sin sonido en WhatsApp de todos modos.

Medido el 26/10/2026: las fotos de Mercado Libre (`http2.mlstatic.com`), InfoCasas
(`cdn*.infocasas.com.uy`) y Facebook (`*.fbcdn.net`) responden `Access-Control-Allow-Origin: *`, así
que se cargan con `crossOrigin="anonymous"` y el canvas no queda "manchado". Una foto de otro origen
que no manda CORS simplemente no se usa (la escena se salta); nunca se agrega un proxy de imágenes.

## Alcance

- `/autos-usados-uruguay/<key>`, `/alquileres/<key>`, `/venta-viviendas-uruguay/<key>`.
- Motos queda afuera: su ficha es de MODELO (rango de precios), no de un aviso con fotos.

## Guion (lo que dice cada escena)

1. **Portada**: primera foto, título, precio grande, zona.
2. **Fotos** (hasta 7 más): cada una con un rótulo tomado de una cola de datos en orden de interés.
   - Auto: año · km; versión/motor; caja · combustible; carrocería; consumo; color · puertas;
     vendedor (automotora/particular); potencia; equipamiento destacado.
   - Vivienda: dormitorios · baños · m²; tipo; gastos comunes; garaje; garantías (alquiler);
     mascotas/amueblado sólo si el aviso lo afirma; amenities.
3. **Precio contra comparables** (sólo si hay muestra): barra p25–p75 con la mediana y el marcador
   del aviso. Auto: cohorte modelo+año(+versión). Alquiler: mercado de la zona (`market`). Venta: no
   hay mediana en la respuesta de la ficha → la escena no existe.
4. **Bajó de precio** (si `priceDrop` / historia muestra baja).
5. **Lo que declara el aviso** (autos con `risks`): la categoría y la cita, atribuida al vendedor.
6. **Cierre**: "Ver aviso en <fuente>", `cambio-uruguay.com`, "Precio pedido, no tasación".

Reglas heredadas del sitio: nunca afirmar lo que el aviso no dice (ausencia ≠ negativa: sin
garantías publicadas no se dice "sin garantía"); el precio se escribe con los formateadores de cada
ficha; ninguna cifra inventada; sin datos de contacto.

## Interfaz

- Botón "Ver presentación" (con la duración, p. ej. "· 38 s") junto a la galería de cada ficha.
  Sólo aparece si hay al menos una foto.
- Abre un diálogo (pantalla completa en móvil) con el canvas, barra segmentada por escena,
  reproducir/pausa, anterior/siguiente, narración on/off, formato **horizontal 16:9 / vertical
  9:16** (historias de WhatsApp/Instagram), **Descargar video** y **Compartir** (si el navegador
  puede compartir archivos).
- La grabación corre en tiempo real (dura lo que dura el video) con barra de progreso y cancelar.
- `prefers-reduced-motion`: sin zoom/paneo, sólo fundidos.
- Accesible: el canvas lleva `aria-label`, y debajo hay una transcripción de las escenas (`<ol>`)
  que es además lo que lee la narración.
- Componente cargado perezoso (`Lazy…`): la ficha no paga el peso hasta que alguien lo abre.
- GA4: `listing_presentation` con `action` = open / complete / download / share y `kind`.

## No-objetivos y anti-objetivos

- Nada de IA, TTS pago ni servicios externos; nada en el servidor.
- No es contenido indexable (las fichas son `noindex`): no hay fila en `experiments.json`.
- Fracaso aunque "funcione": una escena que afirme algo que el aviso no dice, un video con fotos
  rotas, o que la ficha cargue más lento.

## Lo que queda al implementador

Duraciones (≈4 s por escena, más si el texto narrado es largo), tipografía del canvas (la del sitio),
paleta (marino/papel del directorio), y el orden exacto de la cola de rótulos.

## Segunda tanda (27/10/2026)

- **El MP4 se arma con WebCodecs** (`utils/presentationExport.ts`, muxer `mediabunny` cargado al
  primer uso): cuadro por cuadro en un canvas fuera de pantalla, a la velocidad de la máquina.
  Medido en el Onix: 7 s para un video de 39 s, H.264 + AAC, 12 MB. No depende de que la pestaña
  esté a la vista. Sin WebCodecs (o sin H.264) se vuelve a grabar el canvas en tiempo real.
- **Música de fondo sintetizada** (`utils/presentationMusic.ts`): acordes, bajo y arpegio armados
  con un `OfflineAudioContext`. No hay archivo ni licencia. Entra en el archivo (AAC) y se puede
  apagar; debajo de la voz baja de volumen. La voz sigue sin poder grabarse.
- **Escenas con datos que la ficha pide aparte**: lo que hay cerca (`/api/property-nearby`), los
  datos del barrio (`/api/rentals/zone-profile`, sólo cifras del propio barrio y lo provisorio
  dicho) y la comparación de la venta (`/api/property-insight`, la misma cuenta del bloque de la
  ficha). Se piden al abrir el reproductor con 3,5 s de tope; si no llegan, la escena no existe.
- **Foto que no llena el cuadro + texto**: se corre (derecha en horizontal, arriba en vertical) y
  el texto va al lado, sin sombra encima de la foto.
- **Imagen de portada** (JPG de la portada ya entera) para descargar o compartir sin grabar nada.
- **Botón con miniatura**: la primera foto con un play, la duración y "se puede mandar por WhatsApp".
- **CORS del CDN de InfoCasas**: manda `Access-Control-Allow-Origin` sólo si el pedido trae
  `Origin` (`Vary: Origin`). La galería ya bajó la foto sin CORS y Chrome le da esa copia al
  canvas. Si la carga falla, se pide otra vez con `?cu-cors=1`.
- GA4: `record` lleva `method` (`fast`/`realtime`) y `audio`; nuevas `poster_download` y
  `poster_share`.
