<!-- app/pages/privacidad.vue -->
<template>
  <div class="legal-page">
    <VContainer>
      <header class="text-center pt-2 pb-6 py-md-12">
        <VChip class="mb-4" color="primary" size="small" variant="tonal">
          <VIcon start size="small">mdi-shield-lock-outline</VIcon>
          {{ t('legal.privacyNav') }}
        </VChip>
        <h1 class="text-h4 text-md-h3 font-weight-bold mb-4">{{ t('legal.privacy.h1') }}</h1>
        <p class="text-caption text-grey-darken-1">
          {{ t('legal.lastUpdated') }}: {{ lastUpdatedDisplay }}
        </p>
        <p v-if="locale !== 'es'" class="text-caption text-grey-darken-1 mt-1">
          {{ t('legal.machineTranslated') }}
        </p>
      </header>

      <VRow justify="center">
        <VCol cols="12" md="9" lg="8">
          <section class="mb-8">
            <p class="legal-prose text-body-1 text-grey-lighten-1">
              En Cambio Uruguay respetamos tu privacidad. Esta política explica qué datos
              recopilamos, con qué fin, con quién los compartimos y qué opciones tenés sobre ellos.
              Cambio Uruguay es un servicio informativo, gratuito para quien lo visita; a empresas
              les ofrecemos además una API y un monitor de precios, con planes propios. No vendemos
              divisas ni operamos cuentas bancarias.
            </p>
          </section>

          <section class="mb-8">
            <h2 class="text-h5 font-weight-bold mb-3">1. Responsable</h2>
            <p class="legal-prose text-body-1 text-grey-lighten-1">
              El responsable del sitio es el equipo de Cambio Uruguay. Para cualquier consulta sobre
              privacidad, o para ejercer los derechos de la sección 6, escribinos por correo:
              <!-- eslint-disable-next-line vue/max-attributes-per-line -->
              <a class="legal-link" href="mailto:admin@cambio-uruguay.com"
                >admin@cambio-uruguay.com</a
              >.
            </p>
          </section>

          <section class="mb-8">
            <h2 class="text-h5 font-weight-bold mb-3">2. Datos que recopilamos</h2>
            <ul class="legal-list text-body-1 text-grey-lighten-1">
              <li>
                <strong>Datos de uso y dispositivo:</strong> qué páginas visitás (con su dirección
                completa), desde qué página llegaste, cuánto tiempo te quedás y qué hacés en ellas
                (los enlaces y botones que tocás, lo que buscás en el sitio, cuánto leíste de una
                guía), el tipo de navegador y de dispositivo, el sistema operativo, el idioma y el
                país o la ciudad aproximados, que Google deduce de tu IP. Con las cookies de
                analítica activas, Google Analytics une esos datos a un identificador al azar de tu
                navegador (la cookie <code>_ga</code>) para contar visitantes distintos. No los
                cruzamos con tu cuenta ni con tu correo.
              </li>
              <li><strong>Cookies y tecnologías similares:</strong> ver la sección 4.</li>
              <li>
                <strong>Datos de cuenta (opcional):</strong> podés entrar con Google, con correo y
                contraseña, con un enlace por correo, con Discord o como invitado (sin correo). La
                cuenta la gestiona Firebase (Google), que guarda tu correo, tu nombre y tu foto si
                vienen de Google o de Discord, y cómo y cuándo entraste. Nosotros guardamos con tu
                cuenta tu correo, tu idioma y lo que guardás o configurás en el sitio: favoritos,
                conversiones guardadas, tu lista, el carrito de importación, tus tarjetas y
                descuentos favoritos, tus alertas, el Telegram que vincules y, si pedís una clave de
                la API o activás el monitor de competencia, esos datos.
              </li>
              <li>
                <strong>Newsletter (opcional):</strong> tu correo, la fecha en que lo confirmaste y
                el idioma en que lo querés recibir. Si te suscribís desde el formulario, te pedimos
                que lo confirmes desde el correo que te mandamos; desde tu cuenta, sólo si tu correo
                ya está verificado. Cada envío trae un enlace para darte de baja: al darte de baja
                dejamos de escribirte y guardamos la dirección marcada como dada de baja, para no
                volver a suscribirla sin que lo pidas.
              </li>
              <li>
                <strong>Alertas de cotización (opcional):</strong> la moneda, la casa, el precio que
                esperás y los canales que elegís (notificación, correo o Telegram), hasta que borres
                la alerta. Por correo sólo te escribimos si tu dirección está verificada.
              </li>
              <li>
                <strong>Tu lista (opcional):</strong> la zona, las casas, las tarjetas y las monedas
                que elegís quedan en tu navegador y, si tenés cuenta, también en ella. Si usás «Mi
                ubicación», guardamos esa coordenada; el enlace para compartir la lista lleva la
                zona redondeada a un kilómetro, nunca tu posición exacta.
              </li>
              <li>
                <strong>Búsquedas en el sitio:</strong> lo que escribís en el buscador se envía a
                Google Analytics y a Google Ads, para saber qué se busca y qué no encuentra nada, y
                la página de resultados lleva la búsqueda en su dirección. No escribas ahí datos
                personales.
              </li>
              <li>
                <strong>Tu ubicación (opcional, sólo si le das permiso al navegador):</strong> en
                «Cerca de mí», el mapa y las páginas de precios se usa en tu navegador para ordenar
                por distancia. En el buscador de descuentos cerca tuyo y en la búsqueda avanzada, tu
                coordenada va a nuestro servidor para devolverte los lugares cercanos, y en la
                búsqueda avanzada también para mostrarte tu dirección aproximada; si ahí escribís
                una dirección, la buscamos en OpenStreetMap. Los mapas se dibujan con imágenes de
                OpenStreetMap (y de MapTiler en la búsqueda avanzada), que reciben qué zona está en
                pantalla.
              </li>
              <li>
                <strong>Calculadoras:</strong> en el buscador de alquiler ideal, los ingresos, los
                gastos y los lugares de trabajo o estudio que cargás viajan a nuestro servidor para
                elegir las viviendas y no se guardan. En el comparador de transporte, las dos
                direcciones se ubican con Google Maps y sus coordenadas van al ruteador de
                OpenStreetMap (FOSSGIS) para medir el trayecto; tampoco las guardamos.
              </li>
              <li>
                <strong>Asistente con IA (opcional):</strong> la página del asistente carga el
                programa de Puter apenas la abrís. Si tocás «Empezar», entrás a Puter y lo que
                escribís, con lo que el asistente encuentra en el sitio, va a Puter y al proveedor
                del modelo que responda (Google Gemini u OpenAI). Con tu propia clave de Gemini, la
                conversación va directo de tu navegador a Google, y la clave queda en tu navegador
                si elegís recordarla. Las búsquedas que el asistente hace en el sitio pasan por
                nuestro servidor. Aparte, las preguntas que escribís a la IA en la portada o en la
                calculadora de importación van a nuestro servidor y de ahí a un servicio de IA; la
                pregunta y la respuesta se guardan para no repetirla.
              </li>
              <li>
                <strong>Empresas (opcional):</strong> si pedís una clave de la API, guardamos el
                nombre de la empresa, el uso que le vas a dar, el sitio y tu correo, y nos llega un
                aviso privado por Telegram con esos datos. De cada clave contamos los pedidos y a
                qué rutas; si usás la API sin clave, contamos tus pedidos por IP durante unos días,
                sólo para aplicar los límites. Si activás el monitor de competencia, guardamos tu
                correo, tu casa, las que comparás y los canales de aviso.
              </li>
              <li>{{ rentalAlertPrivacy }}</li>
              <li>
                <strong>Opiniones y encuestas sobre los alquileres (opcional):</strong> tus
                respuestas, el comentario que escribas, la página desde la que respondiste, los
                filtros que tenías aplicados y un identificador aleatorio que se guarda en tu
                navegador, para leer en orden varias respuestas de una misma persona. Si respondés
                desde un correo de alerta, también esa alerta y su zona. Tu dirección IP no se
                guarda en nuestra base de datos: el servidor la usa solo en su memoria, para limitar
                cuántas respuestas pueden llegar desde una misma conexión. Tu correo, solo si lo
                dejás para que te respondamos. Los comentarios nos llegan además como un aviso
                privado por Telegram.
              </li>
              <li>
                <strong>Punto de referencia del directorio de alquileres:</strong> el punto desde el
                que ordenás por distancia, sea una dirección que escribiste o un lugar que marcaste
                en el mapa, queda en tu navegador solo mientras esa pestaña siga abierta. Para
                calcular las distancias, la página le envía a nuestro servidor solo sus coordenadas,
                no la dirección. Mientras escribís una dirección, el texto va a nuestro servidor,
                que lo busca en los mapas de Google para ubicarla: Google recibe ese texto, pero no
                tu IP ni tus cookies, y nosotros no lo guardamos en ninguna base de datos (el texto
                y su resultado quedan unos minutos en la memoria del servidor, para no repetir la
                misma búsqueda). El punto no va en la dirección de la página, que leen las
                herramientas de analítica y publicidad, ni en los enlaces que compartís ni en las
                búsquedas que guardás; si llegás por un enlace viejo que lo traía, lo sacamos de la
                dirección apenas carga la página, y Google Analytics no arranca hasta que lo
                sacamos.
              </li>
              <li>
                <strong>Datos que nos envías:</strong> si nos escribís por correo, conservamos tu
                mensaje para responderte.
              </li>
            </ul>
          </section>

          <section class="mb-8">
            <h2 class="text-h5 font-weight-bold mb-3">3. Cómo usamos los datos</h2>
            <p class="legal-prose text-body-1 text-grey-lighten-1">
              Usamos la información para operar y mejorar el sitio, medir qué se usa, mostrar
              publicidad (personalizada, salvo que la rechaces o estés en Europa sin haberla
              aceptado), recordar tu elección de cookies y, si tenés cuenta, darte favoritos y
              alertas.
            </p>
          </section>

          <section class="mb-8">
            <h2 class="text-h5 font-weight-bold mb-3">4. Cookies y servicios de terceros</h2>
            <p class="legal-prose text-body-1 text-grey-lighten-1 mb-3">
              Usamos dos cookies propias: <code>cu_consent</code>, que guarda tu decisión sobre
              cookies durante un año, y <code>dc_state</code>, que dura diez minutos y sólo existe
              mientras entrás con Discord, para comprobar que la vuelta desde Discord es tuya. El
              idioma no va en una cookie: lo decide la dirección de la página. Los terceros que
              reciben datos son:
            </p>
            <ul class="legal-list text-body-1 text-grey-lighten-1">
              <li>
                <strong>Google Analytics (GA4):</strong> mide qué páginas se visitan y qué se hace
                en ellas (ver la sección 2).
              </li>
              <li>
                <strong>Google AdSense:</strong> publicidad. Proveedores externos, incluido Google,
                usan cookies para mostrar anuncios según tus visitas a este y otros sitios.
              </li>
              <li>
                <strong>Google Ads:</strong> mide las visitas que llegan desde nuestros anuncios en
                Google y, con las cookies de publicidad activas, puede sumar tu navegador a listas
                para mostrarte anuncios de Cambio Uruguay en otros sitios (remarketing).
              </li>
              <li>
                <strong>Firebase (Google):</strong> autenticación y notificaciones, si usás esas
                funciones. El service worker del sitio carga además un script de Firebase desde
                www.gstatic.com en los navegadores que lo instalan.
              </li>
              <li>
                <strong>Google Maps (Google):</strong> ubica las direcciones que escribís en el
                directorio de alquileres, el mapa, el buscador de alquiler ideal y el comparador de
                transporte. Le llega solo ese texto, desde nuestro servidor.
              </li>
              <li>
                <strong>Sentry:</strong> registro de errores técnicos. Si algo falla, recibe el tipo
                y un resumen del error, en qué parte del código y en qué sección del sitio pasó, y
                la familia y versión de tu navegador; como cualquier servidor, ve la IP desde la que
                llega el aviso. No le enviamos lo que escribiste en formularios, lo que buscaste ni
                tus cookies.
              </li>
              <li>
                <strong>Cloudflare:</strong> todo el tráfico del sitio y de su API pasa por la red
                de Cloudflare, que lo protege de ataques y guarda en caché las páginas públicas; por
                eso ve tu IP y las direcciones que pedís, y guarda estadísticas de cada pedido
                (país, página y navegador) que podemos consultar hasta 30 días. Cloudflare Web
                Analytics mide además cuánto tardan en cargar las páginas, sin cookies ni
                identificadores en tu navegador.
              </li>
              <li>
                <strong>Telegram:</strong> si vinculás tu cuenta, usamos el botón oficial de
                Telegram y guardamos tu identificador de chat; por ahí te mandamos tus alertas y, si
                lo pediste, el newsletter. Si te suscribís al reporte diario desde nuestro bot de
                Telegram o de Discord, guardamos ese chat y el idioma hasta que te des de baja. A
                nosotros nos llegan por Telegram, en privado, los comentarios de las encuestas de
                alquileres y los pedidos de claves de la API.
              </li>
              <li>
                <strong>Discord:</strong> si entrás con Discord, nos da tu identificador, tu nombre,
                tu foto y tu correo, que usamos para crear tu cuenta.
              </li>
              <li>
                <strong>Contenido de otros sitios:</strong> las fotos de los avisos se cargan desde
                los servidores de cada portal (Mercado Libre, Meta, TikTok, InfoCasas y las
                tiendas); las miniaturas de los videos, desde YouTube, y su reproductor
                (youtube-nocookie.com) recién cuando le das reproducir; las opiniones de la portada
                vienen en un recuadro que carga fotos de Trustpilot; y la documentación de la API
                usa tipografías de Scalar. Tu navegador les pide ese contenido directamente, así que
                reciben tu IP.
              </li>
            </ul>
            <p class="legal-prose text-body-1 text-grey-lighten-1 mt-3">
              Las cookies de Google que pueden quedar en tu navegador son, entre otras,
              <code>_ga</code> y <code>_ga_F97PNVRMRF</code> (Google Analytics, 2 años),
              <code>_gcl_au</code> (Google Ads, 90 días), <code>__gads</code> y
              <code>__gpi</code> (AdSense, 13 meses) y, en el dominio doubleclick.net,
              <code>IDE</code> (publicidad); la lista completa la publica Google en
              business.safety.google/adscookies. Además, el sitio guarda en tu navegador
              (almacenamiento local) lo que configurás para no pedírtelo de nuevo: el tema claro u
              oscuro, tus listas y favoritos, las tarjetas que elegiste, el carrito de importación,
              las páginas que abriste desde el buscador y, si la cargás, tu clave de Gemini. Eso
              queda en tu navegador; si tenés cuenta, tu lista, tus favoritos y tus tarjetas se
              guardan también en ella.
            </p>
            <VAlert type="info" variant="tonal" density="comfortable" class="mt-3 legal-prose">
              Aplicamos el Modo de Consentimiento de Google (Consent Mode v2), con una regla que
              depende de dónde estés. En el Espacio Económico Europeo, el Reino Unido y Suiza, las
              cookies de analítica y de publicidad quedan desactivadas hasta que tocás «Aceptar». En
              el resto de los países, incluido Uruguay, están activas desde la primera visita. Estés
              donde estés, podés rechazarlas con «Rechazar» en el aviso de cookies o desde el enlace
              «Configurar cookies» del pie de página: tu elección se guarda en una cookie propia
              durante un año y se aplica en cada visita. Mientras estén desactivadas, le indicamos a
              Google que no guarde cookies de analítica ni de publicidad en tu navegador y que no
              personalice los anuncios: Google Analytics y Google Ads reciben solo señales sin
              cookies, que no llevan un identificador tuyo. Rechazar no borra las cookies que ya se
              hubieran guardado antes: esas podés borrarlas desde la configuración de tu navegador.
            </VAlert>
            <p class="legal-prose text-body-1 text-grey-lighten-1 mt-3">
              Más información sobre cómo Google usa los datos:
              <a
                class="legal-link"
                href="https://policies.google.com/technologies/partner-sites"
                target="_blank"
                rel="noopener noreferrer"
              >
                policies.google.com/technologies/partner-sites </a
              >. Podés gestionar la personalización de anuncios en
              <a
                class="legal-link"
                href="https://www.google.com/settings/ads"
                target="_blank"
                rel="noopener noreferrer"
              >
                google.com/settings/ads </a
              >.
            </p>
          </section>

          <section id="microsoft-clarity" class="mb-8">
            <h3 class="text-h6 font-weight-bold mb-3">
              Microsoft Clarity: mapas de calor y grabaciones
            </h3>
            <p class="legal-prose text-body-1 text-grey-lighten-1 mb-3">
              Hoy Microsoft Clarity no está activo en el sitio: esta sección explica cómo va a
              funcionar cuando lo activemos, y ese día cambiamos la fecha de esta política. Para ver
              qué partes del sitio se entienden y cuáles traban, usamos Microsoft Clarity. Registra
              clics, toques, desplazamiento y movimientos del cursor, y con eso arma mapas de calor
              y reproducciones de la navegación; también marca clics repetidos o sin respuesta y
              errores de la página.
            </p>
            <ul class="legal-list text-body-1 text-grey-lighten-1">
              <li>
                <strong>Qué se oculta:</strong> los campos de formularios, los números y los correos
                se ocultan en tu navegador, antes de enviar nada. Además ocultamos los mapas y las
                listas que muestran tu ubicación o el punto de referencia que elegiste, las
                direcciones que escribís para calcular un trayecto, las cartas y denuncias que el
                sitio arma con tus datos, las claves de la API y la foto y las iniciales de tu
                cuenta.
              </li>
              <li>
                <strong>Dónde no graba:</strong> tu cuenta, el inicio de sesión, el asistente con
                IA, la página de la encuesta de alquileres y su panel, los paneles internos y de
                estadísticas, la guía sobre grabaciones sin consentimiento y el buscador de
                descuentos cerca tuyo. Tampoco una página cuya dirección lleva un enlace de inicio
                de sesión o el punto de referencia de una búsqueda, ni una pestaña que abriste desde
                una de ellas; y si una dirección así le llega igual (por ejemplo, al volver atrás),
                esos datos van borrados. Y no graba todas las visitas: en los alquileres, sí; en el
                resto del sitio, una de cada dos.
              </li>
              <li>
                <strong>Las preguntas de los alquileres:</strong> la tarjeta «¿Te sirvió esta
                ficha?» o «¿Encontraste lo que buscabas?» queda en la grabación de la página donde
                aparece. Si respondés, marcamos tu respuesta en esa grabación, para encontrar qué
                trabó a quien contestó «No». Para responder con un toque no te pedimos nombre ni
                correo; el correo aparece sólo en la caja de sugerencias, es opcional y Clarity lo
                oculta.
              </li>
              <li>
                <strong>Cookies:</strong> <code>_clck</code> (un identificador al azar de tu
                navegador, un año) y <code>_clsk</code> (une las páginas de una misma visita, un
                día), del propio sitio; y, de Microsoft, <code>CLID</code> (un identificador común a
                los sitios que usan Clarity) y <code>MUID</code>, <code>ANONCHK</code>,
                <code>MR</code> y <code>SM</code>, que Microsoft usa en sus servicios, también para
                publicidad. Nosotros no usamos Microsoft Advertising.
              </li>
              <li>
                <strong>Quién responde por esos datos:</strong> Microsoft los trata como
                responsable, según su
                <a
                  class="legal-link"
                  href="https://www.microsoft.com/privacy/privacystatement"
                  target="_blank"
                  rel="noopener noreferrer"
                  >declaración de privacidad</a
                >. Las grabaciones se conservan 30 días, salvo las que marquemos y una muestra al
                azar, que Microsoft guarda hasta 9 meses. Clarity no permite borrar los datos de una
                sola persona sin borrar el proyecto entero, así que los pedidos de acceso o
                eliminación de esos datos van a Microsoft, por esa misma declaración.
              </li>
              <li>
                <strong>Cómo evitarlo:</strong> en el Espacio Económico Europeo, el Reino Unido y
                Suiza (y cuando no podemos saber desde qué país nos visitás) no se carga hasta que
                tocás «Aceptar». En el resto de los países, incluido Uruguay, puede grabar desde la
                primera visita, y lo apagás con «Rechazar» en el aviso de cookies o en «Configurar
                cookies», al pie de cada página: si ya estaba grabando, se detiene y borramos sus
                cookies. Si tu navegador envía la señal Global Privacy Control, no se carga.
              </li>
            </ul>
          </section>

          <section class="mb-8">
            <h2 class="text-h5 font-weight-bold mb-3">5. Base legal y conservación</h2>
            <p class="legal-prose text-body-1 text-grey-lighten-1">
              En el Espacio Económico Europeo, el Reino Unido y Suiza, usamos las cookies de
              analítica y de publicidad sobre la base de tu consentimiento, que das con «Aceptar» y
              podés retirar cuando quieras. En el resto de los países, incluido Uruguay, las
              activamos desde la primera visita y te lo decimos en el aviso de cookies: si tocás
              «Rechazar», se apagan en ese momento y en cada visita siguiente, y el sitio sigue
              funcionando igual. Los demás datos (cuenta, alertas, opiniones y errores técnicos) los
              tratamos para darte las funciones que usás y para operar el sitio.
            </p>
            <p class="legal-prose text-body-1 text-grey-lighten-1 mt-3">
              Cuánto los guardamos: tu cuenta y lo que guardás en ella, mientras exista; cada
              alerta, hasta que la borres, y con ella su historial de envíos; tu decisión sobre
              cookies, un año; las cookies de Google, lo que dice la sección 4. El resto, sólo el
              tiempo necesario para los fines descritos o el que exija la ley. Como cualquier
              servidor, el nuestro anota los pedidos que recibe para diagnosticar fallas y frenar
              abusos; esos registros técnicos rotan y se borran solos.
            </p>
            <p class="legal-prose text-body-1 text-grey-lighten-1 mt-3">
              En los directorios de alquileres y de viviendas en venta mostramos el nombre del
              anunciante tal como figura en el aviso público (una inmobiliaria, o una persona en
              Facebook Marketplace, TikTok o Instagram) y, cuando la inmobiliaria lo publica en su
              propio aviso o perfil, su contacto comercial. En el análisis de r/CharruaDevs
              mostramos nombres de usuario de Reddit junto a la orientación de lo que publicaron,
              sólo con mensajes públicos. Si sos una de esas personas y querés que saquemos tu
              nombre o tu cuenta, escribinos y lo sacamos de todo el sitio.
            </p>
            <p class="legal-prose text-body-1 text-grey-lighten-1 mt-3">
              En el directorio de autos usados mostramos, junto a un aviso y sólo a quien lo pide
              con un clic, el teléfono que el vendedor escribió en el texto público de ese mismo
              aviso o el número comercial que una automotora publica en su propia web, con su
              procedencia y la fecha en que lo leímos. No lo tomamos de lo que un portal reserva a
              usuarios con cuenta, no lo dejamos disponible para buscadores y lo borramos cuando el
              aviso deja de estar publicado o a los 21 días de haberlo leído.
            </p>
          </section>

          <section class="mb-8">
            <h2 class="text-h5 font-weight-bold mb-3">6. Tus derechos y opciones</h2>
            <ul class="legal-list text-body-1 text-grey-lighten-1">
              <li>Aceptar o rechazar cookies desde el banner o el enlace «Configurar cookies».</li>
              <li>Bloquear o borrar cookies desde la configuración de tu navegador.</li>
              <li>
                Pedirnos acceso a tus datos, que los corrijamos, actualicemos o completemos, o que
                los borremos (incluida tu cuenta entera). Si el pedido es sobre tu cuenta,
                escribinos desde el correo con el que entrás, así comprobamos que es tuya:
                <!-- eslint-disable-next-line vue/max-attributes-per-line -->
                <a class="legal-link" href="mailto:admin@cambio-uruguay.com"
                  >admin@cambio-uruguay.com</a
                >. Te respondemos dentro de los cinco días hábiles que fija la Ley 18.331.
              </li>
              <li>
                Oponerte a un uso de tus datos, o pedirnos que lo limitemos mientras revisamos tu
                pedido; y, si estás en el Espacio Económico Europeo, el Reino Unido o Suiza, recibir
                en un archivo los datos que guardaste en tu cuenta.
              </li>
              <li>
                Si no te respondemos o la respuesta no te conforma, podés reclamar ante la Unidad
                Reguladora y de Control de Datos Personales (URCDP) o iniciar la acción de habeas
                data; en Europa, ante la autoridad de protección de datos de tu país.
              </li>
              <li>
                Si junto a un aviso de auto aparece tu número, podés sacarlo con «Sacalo de este
                sitio» en ese mismo aviso o escribiéndonos: no se vuelve a mostrar en ningún aviso
                del sitio.
              </li>
            </ul>
          </section>

          <section class="mb-8">
            <h2 class="text-h5 font-weight-bold mb-3">7. Dónde se procesan tus datos</h2>
            <p class="legal-prose text-body-1 text-grey-lighten-1">
              Nuestro servidor y la base de datos de las cuentas están en Canadá; la de cotizaciones
              y la de las claves de la API, en Estados Unidos. Varios de los servicios de la sección
              4 procesan datos fuera de Uruguay: la mayoría en Estados Unidos (Google, Cloudflare,
              Sentry, Discord, Puter, OpenAI, Meta y, cuando lo activemos, Microsoft) y otros en sus
              propios países (Telegram, OpenStreetMap y MapTiler). Cuando usás una función opcional
              que depende de uno de ellos (entrar con Discord, vincular Telegram, el asistente con
              IA), el envío es el necesario para darte esa función, que pediste vos.
            </p>
          </section>

          <section class="mb-8">
            <h2 class="text-h5 font-weight-bold mb-3">8. Menores</h2>
            <p class="legal-prose text-body-1 text-grey-lighten-1">
              El sitio no está dirigido a menores de 13 años y no recopilamos datos de ellos de
              forma consciente.
            </p>
          </section>

          <section class="mb-8">
            <h2 class="text-h5 font-weight-bold mb-3">9. Cambios</h2>
            <p class="legal-prose text-body-1 text-grey-lighten-1">
              Podemos actualizar esta política. Publicaremos los cambios en esta página con su nueva
              fecha de actualización.
            </p>
          </section>

          <VCard class="legal-cta pa-6 text-center" variant="flat">
            <p class="text-body-2 text-grey-lighten-1 mb-4">
              ¿Dudas sobre tus datos? Escribinos y te respondemos.
            </p>
            <VBtn :to="localePath('/contacto')" color="primary" variant="elevated">
              <VIcon start>mdi-email-outline</VIcon>
              {{ t('legal.contactNav') }}
            </VBtn>
          </VCard>
        </VCol>
      </VRow>
    </VContainer>
  </div>
</template>

<script setup lang="ts">
const { t, locale } = useI18n()
const localePath = useLocalePath()

const LAST_UPDATED = '2026-11-08'
const rentalAlertPrivacy = computed(() => {
  if (locale.value.startsWith('en'))
    return 'Search alerts (rentals, homes for sale, used cars and motorcycles) are optional. We store your chosen filters, frequency, channels, whether you want price drops, your verified email address and delivery records to avoid repeating notifications. To detect price drops we keep the last and lowest price of each public listing, with no data about you. Push uses a device registration identifier. You can pause or delete an alert in your account; deleting it also removes its delivery history. Each email includes a link to unsubscribe from that alert’s emails independently of push notifications.'
  if (locale.value.startsWith('pt'))
    return 'Os alertas de busca (aluguéis, imóveis à venda, carros e motos usados) são opcionais. Guardamos os filtros, a frequência, os canais escolhidos, se você quer reduções de preço, o email verificado e o histórico de envios para evitar notificações repetidas. Para detectar reduções de preço guardamos o último e o menor preço de cada anúncio público, sem dados seus. O push usa um identificador de registro do dispositivo. Você pode pausar ou excluir um alerta na sua conta; a exclusão também remove seu histórico de envios. Cada email inclui um link para cancelar os emails daquele alerta, independentemente das notificações push.'
  return 'Las alertas de búsqueda (alquileres, viviendas en venta, autos y motos usados) son opcionales. Guardamos los filtros, la frecuencia, los canales y la opción de avisos de bajas de precio que elegiste; además, tu correo verificado y el registro de lo que te mandamos, para no repetir avisos. Para detectar bajas de precio guardamos el último precio y el más bajo de cada aviso público, que no tienen datos tuyos. Push utiliza un identificador de registro del dispositivo. Podés pausar o eliminar una alerta desde tu cuenta; al eliminarla también se borra su historial de envíos. Cada correo incluye un enlace para cancelar los emails de esa alerta, de forma independiente de las notificaciones push.'
})
const lastUpdatedDisplay = computed(() =>
  new Date(LAST_UPDATED).toLocaleDateString(dateLocale(locale.value), {
    timeZone: 'UTC',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
)

const canonicalUrl = 'https://cambio-uruguay.com/privacidad'

defineOgImageComponent('Cambio', {
  title: () => t('legal.privacy.h1'),
  subtitle: 'Cambio Uruguay',
  tag: 'PRIVACIDAD',
  locale: locale.value as 'es' | 'en' | 'pt',
})

useSeoMeta({
  title: () => t('legal.privacy.metaTitle'),
  description: () => t('legal.privacy.metaDescription'),
  ogTitle: () => t('legal.privacy.metaTitle'),
  ogDescription: () => t('legal.privacy.metaDescription'),
  ogType: 'website',
  ogUrl: canonicalUrl,
  twitterCard: 'summary_large_image',
})

// The legal pages had a canonical but shipped no structured data at all, so the
// crawler had no trail back to the home page and no signal of when the policy
// last changed — the one fact a privacy page is judged on.
useHead(() => ({
  link: [{ rel: 'canonical', href: canonicalUrl }],
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'WebPage',
            '@id': canonicalUrl,
            url: canonicalUrl,
            name: t('legal.privacy.h1'),
            description: t('legal.privacy.metaDescription'),
            dateModified: LAST_UPDATED,
            inLanguage: locale.value,
            isPartOf: { '@type': 'WebSite', url: 'https://cambio-uruguay.com' },
          },
          {
            '@type': 'BreadcrumbList',
            itemListElement: [
              {
                '@type': 'ListItem',
                position: 1,
                name: 'Cambio Uruguay',
                item: 'https://cambio-uruguay.com',
              },
              { '@type': 'ListItem', position: 2, name: t('legal.privacy.h1'), item: canonicalUrl },
            ],
          },
        ],
      }),
    },
  ],
}))
</script>

<style scoped>
.legal-prose {
  line-height: 1.75;
}
.legal-list {
  line-height: 1.8;
  padding-left: 1.2rem;
}
.legal-list li {
  margin: 0.5rem 0;
}
.legal-link {
  color: rgb(var(--v-theme-link));
  text-decoration: none;
  font-weight: 600;
}
.legal-link:hover {
  text-decoration: underline;
}
.legal-cta {
  background: rgba(var(--v-theme-primary), 0.1);
  border: 1px solid rgba(var(--v-theme-primary), 0.28);
  border-radius: 12px;
}
</style>
