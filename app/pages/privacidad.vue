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
          Última actualización: {{ lastUpdatedDisplay }}
        </p>
      </header>

      <VRow justify="center">
        <VCol cols="12" md="9" lg="8">
          <section class="mb-8">
            <p class="legal-prose text-body-1 text-grey-lighten-1">
              En Cambio Uruguay respetamos tu privacidad. Esta política explica qué datos
              recopilamos, con qué fin, con quién los compartimos y qué opciones tenés sobre ellos.
              Cambio Uruguay es un servicio informativo y gratuito; no vendemos divisas ni operamos
              cuentas bancarias.
            </p>
          </section>

          <section class="mb-8">
            <h2 class="text-h5 font-weight-bold mb-3">1. Responsable</h2>
            <p class="legal-prose text-body-1 text-grey-lighten-1">
              El responsable del sitio es el equipo de Cambio Uruguay. Para cualquier consulta sobre
              privacidad podés escribirnos a
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
                <strong>Datos de uso y dispositivo:</strong> páginas visitadas, tiempo en el sitio,
                tipo de navegador, sistema operativo, idioma y país aproximado, recogidos de forma
                agregada mediante herramientas de analítica.
              </li>
              <li><strong>Cookies y tecnologías similares:</strong> ver la sección 4.</li>
              <li>
                <strong>Datos de cuenta (opcional):</strong> si iniciás sesión (Google, correo,
                enlace mágico o Discord), guardamos un identificador y los datos mínimos para
                ofrecerte favoritos y alertas de cotización y alquileres. La autenticación se
                gestiona con Firebase (Google).
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
                dirección apenas carga la página.
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
              Usamos la información para operar y mejorar el sitio, medir su audiencia de forma
              agregada, personalizar contenido y mostrar publicidad, recordar tus preferencias (como
              el idioma y tu elección de cookies) y, si tenés cuenta, brindarte favoritos y alertas.
            </p>
          </section>

          <section class="mb-8">
            <h2 class="text-h5 font-weight-bold mb-3">4. Cookies y servicios de terceros</h2>
            <p class="legal-prose text-body-1 text-grey-lighten-1 mb-3">
              Usamos cookies propias (por ejemplo, para recordar tu idioma y tu decisión sobre
              cookies) y de terceros con fines de analítica y publicidad. Los principales terceros
              son:
            </p>
            <ul class="legal-list text-body-1 text-grey-lighten-1">
              <li><strong>Google Analytics (GA4):</strong> métricas de audiencia agregadas.</li>
              <li>
                <strong>Google AdSense:</strong> publicidad. Proveedores externos, incluido Google,
                usan cookies para mostrar anuncios según tus visitas a este y otros sitios.
              </li>
              <li><strong>Google Ads:</strong> medición de campañas y conversiones.</li>
              <li>
                <strong>Firebase (Google):</strong> autenticación y notificaciones, solo si usás
                esas funciones.
              </li>
              <li>
                <strong>Google Maps (Google):</strong> ubica la dirección que escribís en el
                directorio de alquileres. Le llega solo ese texto, desde nuestro servidor.
              </li>
              <li>
                <strong>Sentry:</strong> registro de errores técnicos. Si algo falla, recibe el tipo
                de error, la sección del sitio donde pasó y la familia y versión de tu navegador; no
                le enviamos lo que escribiste en formularios, lo que buscaste ni tus cookies.
              </li>
              <li>
                <strong>Cloudflare Web Analytics:</strong> mide cuánto tardan en cargar las páginas
                y cuántas visitas reciben, sin cookies ni otros identificadores en tu navegador.
              </li>
            </ul>
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
              Para ver qué partes del sitio se entienden y cuáles traban, usamos Microsoft Clarity.
              Registra clics, toques, desplazamiento y movimientos del cursor, y con eso arma mapas
              de calor y reproducciones de la navegación; también marca clics repetidos o sin
              respuesta y errores de la página.
            </p>
            <ul class="legal-list text-body-1 text-grey-lighten-1">
              <li>
                <strong>Qué se oculta:</strong> los campos de formularios, los números y los correos
                se ocultan en tu navegador, antes de enviar nada. Además ocultamos los mapas y las
                listas que muestran tu ubicación o el punto de referencia que elegiste, las cartas y
                denuncias que el sitio arma con tus datos, y las claves de la API.
              </li>
              <li>
                <strong>Dónde no graba:</strong> tu cuenta, el inicio de sesión, el asistente con
                IA, las encuestas de alquileres, los paneles internos y de estadísticas, la guía
                sobre grabaciones sin consentimiento y el buscador de descuentos cerca tuyo; tampoco
                una página cuya dirección lleva un enlace de inicio de sesión o el punto de
                referencia de una búsqueda. Y no graba todas las visitas, sólo una parte.
              </li>
              <li>
                <strong>Cookies:</strong> <code>_clck</code> (un identificador al azar de tu
                navegador, un año) y <code>_clsk</code> (une las páginas de una misma visita, un
                día), del propio sitio; y <code>CLID</code>, de clarity.ms: un identificador de
                Microsoft común a los sitios que usan Clarity. No usamos Microsoft Advertising.
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
              podés retirar cuando quieras. En el resto de los países, incluido Uruguay, las usamos
              desde la primera visita por nuestro interés legítimo en medir la audiencia y financiar
              con publicidad un sitio gratuito, y podés oponerte en cualquier momento con
              «Rechazar». Los demás datos (cuenta, alertas, opiniones y errores técnicos) los
              tratamos para darte las funciones que usás y para operar el sitio. Conservamos los
              datos solo el tiempo necesario para los fines descritos o el que exija la ley.
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
                Solicitar acceso, rectificación o eliminación de tus datos escribiendo a
                <!-- eslint-disable-next-line vue/max-attributes-per-line -->
                <a class="legal-link" href="mailto:admin@cambio-uruguay.com"
                  >admin@cambio-uruguay.com</a
                >.
              </li>
              <li>
                Si junto a un aviso de auto aparece tu número, podés sacarlo con «Sacalo de este
                sitio» en ese mismo aviso o escribiéndonos: no se vuelve a mostrar en ningún aviso
                del sitio.
              </li>
            </ul>
          </section>

          <section class="mb-8">
            <h2 class="text-h5 font-weight-bold mb-3">7. Menores</h2>
            <p class="legal-prose text-body-1 text-grey-lighten-1">
              El sitio no está dirigido a menores de 13 años y no recopilamos datos de ellos de
              forma consciente.
            </p>
          </section>

          <section class="mb-8">
            <h2 class="text-h5 font-weight-bold mb-3">8. Cambios</h2>
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
  return 'Las alertas de búsqueda (alquileres, viviendas en venta, autos y motos usados) son opcionales. Guardamos los filtros, la frecuencia y los canales elegidos, si querés recibir bajas de precio, el correo verificado y el registro de envíos para evitar notificaciones repetidas. Para detectar bajas de precio guardamos el último precio y el más bajo de cada aviso público, sin datos tuyos. Push utiliza un identificador de registro del dispositivo. Podés pausar o eliminar una alerta desde tu cuenta; al eliminarla también se borra su historial de envíos. Cada correo incluye un enlace para cancelar los emails de esa alerta, de forma independiente de las notificaciones push.'
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
  background: rgba(33, 150, 243, 0.1);
  border: 1px solid rgba(33, 150, 243, 0.28);
  border-radius: 12px;
}
</style>
