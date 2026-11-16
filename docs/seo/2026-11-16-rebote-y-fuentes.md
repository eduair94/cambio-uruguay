# Fuentes de tráfico y rebote — 16/11/2026

Lectura de GA4, Search Console y Cloudflare (ventana 18/10–14/11/2026 contra los 28 días
anteriores, sólo el host propio) y de la página publicada en un teléfono de 390 px. Los datos
crudos y los scripts quedan en `docs/seo/data/rebote-2026-11-16/`, fuera de Git. Sin cifras de
ingreso: este documento es público.

## Qué dicen los números

- **El rebote de la propiedad entera (79 %) no describe a ningún lector.** El 73 % de las sesiones
  llegó desde fuera de Uruguay por el canal Directo: una página, cero segundos, un Chrome de
  escritorio a 1280x1200 que rota por decenas de países, desde el 21/10. Quitando eso, **Uruguay
  rebota 33,4 %** (35,8 % en la ventana anterior), 31,5 % sin el aterrizaje `(not set)`, y 24,9 % en
  quien llega por primera vez desde un buscador.
- **Fuera de Uruguay también hay lectores**: 1.091 sesiones que no son Directo, con 38 % de rebote.
  Brasil por buscadores navega 2,7 páginas por sesión, casi todo en `/pt`.
- **De dónde llega Uruguay**: buscadores 68 %, asistentes de IA 17,5 % (ChatGPT es la segunda fuente
  y casi se triplicó en 28 días), directo 13 %, redes 0,6 %, sitios que enlazan 0,2 %, correo 0.
- **El problema no es el rebote sino lo que pasa después de la respuesta**: 1,65 páginas por sesión.
  Las guías se leen (18 % de rebote, 107 s) y se dejan (1,22); una calculadora, 1,03–1,30; un
  indicador, 1,07.
- **iOS aparece con 42 % de rebote contra 30 % de Android y la mitad del tiempo, en las mismas
  páginas.** Una parte es medición: el evento de salida (`user_engagement`) llega 33 veces cada 100
  vistas en iOS y 61 en Android. Otra parte es real (menos hitos de lectura y menos anuncios por
  vista). En WebKit de escritorio emulando un iPhone las páginas hidratan, miden y cargan anuncios
  igual que en Chromium: no hay un defecto del sitio que lo explique, y cerrarlo pide un teléfono.

## Qué mostró la página publicada

1. **Los mensajes de vue-i18n se pedían al origen en cada carga**: 127 KB, sin caché en el navegador
   ni en el borde, 57.000 pedidos por semana y 4,5 % abortados. Cuando el pedido fallaba, la
   hidratación reemplazaba el texto del servidor por las claves crudas (`CONSENT.REJECT`).
2. **Auto Ads metía un bloque de enlaces dentro de la respuesta** de `/indicadores/unidad-reajustable`,
   entre «1 UR equivale a» y el número: el valor quedaba al borde del pliegue. Rebote ahí, 64 % en el
   teléfono y 25 % en escritorio.
3. **La recirculación está donde nadie llega**: en una guía, «Para seguir con este tema» cae en la
   pantalla 17 y «Seguí leyendo» en la 19. La primera rinde 17 % de clics por exposición pero se
   vio 196 veces; la segunda sumó 34 clics en 28 días. El 72 % de la navegación interna sale de
   enlaces dentro del contenido.
4. **El pie medía 7.290 px** de los 12.153 de una página de indicador.
5. **La tarjeta del newsletter**: 403 vistas reales y un alta. Ofrecía «el resumen del dólar» con un
   «¿Te sirvió?» al final de guías que no hablan del dólar.
6. **`/estadisticas-del-sitio` publicaba los totales con el tráfico automatizado adentro.**

## Qué cambió

- La ruta de mensajes lleva una versión de su contenido y se guarda un año (`i18n/messagesVersion.ts`,
  `server/plugins/i18n-messages-cache.ts`); una versión vieja se redirige a la vigente.
- `.cu-keep-together` (critical.css): una unidad de Auto Ads insertada dentro de una respuesta pasa
  al final del bloque, entera y visible. En el indicador y en el conversor de UI.
- Las dos primeras recomendaciones de una guía larga se repiten después de su segunda sección
  (`guideInlineNext`), y las tres primeras de «Seguí leyendo» van debajo del resultado en las 17
  calculadoras y en los indicadores (`RelatedInline`); el bloque del pie no las repite.
- El directorio del pie se pliega por sección bajo 600 px. Los enlaces siguen en el HTML.
- El newsletter se ofrece por lo que es («¿Seguís el dólar? Te lo mandamos cada mañana»).
- `/estadisticas-del-sitio` muestra Uruguay por defecto y dice cuánto agrega «todos los países».
- Quien tiene el navegador en español y cae en otra versión ve un enlace a la misma página en
  español. Nadie es redirigido.
- GA no arranca en un navegador automatizado (`navigator.webdriver`, o el User-Agent de las
  herramientas propias): 388 de las 1.190 sesiones directas de Uruguay duraban cero segundos y
  eran las auditorías del sitio contra producción. Una prueba que necesita ver los eventos lo pide
  con `localStorage.cu_measure_automation = '1'`.

## Cómo evaluarlo

Ninguno de estos cambios tiene fila en `experiments.json`: tocan plantillas enteras, sin control.
Se miden en GA4, Uruguay con Uruguay y teléfono con teléfono, a 28 días completos:

1. `recommendation_view` e `internal_navigation` por `link_area`: `guide_inline_next` contra
   `guide_next_steps`, y `related_inline` contra `related_pages` (que recién ahora tiene exposición).
   Lo que se espera es más exposiciones arriba; el cociente de clics dirá si además se elige.
2. Páginas por sesión en `/guias/*`, `/herramientas/*` e `/indicadores/*`.
3. `/_i18n/*` en Cloudflare: proporción servida desde el borde y pedidos abortados.
4. Rebote de `/indicadores/unidad-reajustable` en el teléfono contra el de escritorio.
5. `newsletter_capture_view` → `newsletter_submit`. Con una muestra así de chica, meses.

## Lo que queda afuera del repo

- **La consola de AdSense.** En un teléfono Auto Ads puso 12–15 unidades en una sola página, y los
  enlaces de intención son un formato que se apaga ahí.
- **La etiqueta de Google Ads** que carga el sitio responde 404: un pedido muerto por vista.
- **El origen de la ola automatizada.** GA4 la reconoce por resolución de pantalla. En Cloudflare,
  quienes hidratan desde fuera de Uruguay son rastreadores declarados (Ahrefs, Applebot, Baidu) y
  una rotación pareja de User-Agents de teléfono, casi toda desde Estados Unidos: no hay una firma
  única que una regla de borde pueda desafiar sin tocar lectores. Si esos navegadores declaran
  `navigator.webdriver`, dejan de contarse con el cambio de arriba; se sabrá en GA4 en unos días.
