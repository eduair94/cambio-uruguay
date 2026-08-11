<template>
  <VContainer class="page py-6 py-md-10">
    <header class="hero mb-8">
      <p class="eyebrow">Compras en el exterior · Verificado en julio de 2026</p>
      <h1 class="text-h4 text-md-h3 font-weight-bold mb-3">
        Cómo declarar una compra del exterior en Uruguay
      </h1>
      <p class="text-body-1 text-medium-emphasis mb-4">
        El trámite cambia según quién trae el paquete: Correo Uruguayo, un courier privado o una
        plataforma con importación gestionada como Amazon Global o Temu.
      </p>
      <VAlert type="success" variant="tonal" icon="mdi-check-decagram-outline">
        <strong>Respuesta corta:</strong> si llega por correo internacional común, registrás la
        compra en <strong>Ahíva</strong>. Si llega por courier, declarás en el portal del courier.
        Si el checkout dice que la plataforma gestiona la importación, aportás allí tus datos y el
        transportista declara por vos. En todos los casos seguís siendo el destinatario/importador y
        se aplican los límites y permisos uruguayos.
      </VAlert>
    </header>

    <section class="mb-9" aria-labelledby="quien-declara">
      <h2 id="quien-declara" class="section-heading mb-2">
        Primero: identificá quién trae el paquete
      </h2>
      <p class="text-body-2 text-medium-emphasis mb-4">
        Desde el 1.º de mayo de 2026, el pago de tributos se gestiona obligatoriamente por el
        <strong>operador postal</strong>. Vos suministrás factura, identidad y demás datos; el
        operador presenta la información y paga a la DNA en tu nombre.
      </p>

      <div class="table-scroll">
        <table class="route-table cu-mobile-cards">
          <thead>
            <tr>
              <th>Cómo llega</th>
              <th>Dónde cargás los datos</th>
              <th>Quién gestiona ante Aduanas</th>
              <th>Qué tenés que mirar</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="route in routes" :key="route.name">
              <td data-label="Cómo llega">
                <strong>{{ route.name }}</strong>
              </td>
              <td data-label="Dónde cargás los datos">{{ route.form }}</td>
              <td data-label="Quién gestiona ante Aduanas">{{ route.operator }}</td>
              <td data-label="Qué tenés que mirar">{{ route.clue }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section id="correo-uruguayo" class="mb-9">
      <div class="section-kicker">SIN COURIER PRIVADO</div>
      <h2 class="section-heading mb-2">Si llega por Correo Uruguayo: lo declarás en Ahíva</h2>
      <p class="text-body-2 text-medium-emphasis mb-4">
        Esta es la ruta típica del envío estándar de AliExpress, eBay, Etsy, Shein o Temu cuando no
        contrataron un courier privado. También incluye EMS y paquetes enviados directamente por un
        comercio o una persona desde el exterior.
      </p>

      <VCard variant="flat" class="outlined-card pa-5 pa-md-6">
        <ol class="steps">
          <li v-for="step in postalSteps" :key="step.title">
            <div>
              <strong>{{ step.title }}</strong>
              <!-- Content is a static, source-controlled catalog; it never contains user input. -->
              <!-- eslint-disable-next-line vue/no-v-html -->
              <p v-html="step.text" />
            </div>
          </li>
        </ol>
      </VCard>

      <VRow class="mt-3">
        <VCol cols="12" md="6">
          <VCard variant="tonal" color="success" class="pa-4 h-100">
            <div class="text-subtitle-2 font-weight-bold mb-1">
              Conviene declarar antes de que llegue
            </div>
            <p class="text-body-2 mb-0">
              Correo publica un cargo administrativo de US$ 1,50 más 5% del impuesto si registrás
              antes del arribo. Si lo hacés después de la retención, el cargo base sube a US$ 5.
            </p>
          </VCard>
        </VCol>
        <VCol cols="12" md="6">
          <VCard variant="tonal" color="warning" class="pa-4 h-100">
            <div class="text-subtitle-2 font-weight-bold mb-1">No dejes vencer la notificación</div>
            <p class="text-body-2 mb-0">
              Sin declaración el paquete queda retenido, genera costos y puede terminar en abandono.
              Correo advierte un plazo de 30 días.
            </p>
          </VCard>
        </VCol>
      </VRow>

      <div class="actions mt-4">
        <VBtn
          color="primary"
          href="https://ahiva.correo.com.uy/aduanas-web/login"
          target="_blank"
          rel="noopener noreferrer"
          prepend-icon="mdi-open-in-new"
        >
          Declarar en Ahíva
        </VBtn>
        <VBtn
          variant="outlined"
          href="https://www.correo.com.uy/como-declarar-su-compra-u-obsequio"
          target="_blank"
          rel="noopener noreferrer"
          prepend-icon="mdi-book-open-variant-outline"
        >
          Instructivo oficial
        </VBtn>
      </div>

      <VAlert type="warning" variant="tonal" density="comfortable" class="mt-4">
        <strong>Hay una contradicción operativa pendiente.</strong> El instructivo de Correo aún
        muestra los antiguos topes por envío de US$ 50 para correo no expreso y US$ 200 para EMS,
        aunque el Decreto 50/026 los sustituyó por un cupo anual acumulado de US$ 800. Explicamos la
        diferencia y cómo reclamar en
        <NuxtLink :to="localePath('/franquicia-aduana-uruguay')">
          la guía de franquicia de Aduana </NuxtLink
        >.
      </VAlert>
    </section>

    <section id="plataformas" class="mb-9">
      <div class="section-kicker">IMPORTACIÓN GESTIONADA</div>
      <h2 class="section-heading mb-2">Amazon Global, Temu y servicios que “hacen todo por vos”</h2>
      <p class="text-body-2 text-medium-emphasis mb-4">
        “Gestionada” no significa que la compra quede fuera de Aduanas. Significa que autorizás a la
        plataforma a designar un transportista o agente para presentar la declaración y pagar los
        tributos en tu nombre.
      </p>

      <VRow>
        <VCol v-for="platform in platforms" :key="platform.title" cols="12" md="4">
          <VCard variant="flat" class="outlined-card pa-5 h-100">
            <div :class="['platform-icon', platform.tone]" class="mb-3">
              <VIcon>{{ platform.icon }}</VIcon>
            </div>
            <h3 class="text-subtitle-1 font-weight-bold mb-2">{{ platform.title }}</h3>
            <p v-for="paragraph in platform.paragraphs" :key="paragraph" class="text-body-2 mb-2">
              {{ paragraph }}
            </p>
          </VCard>
        </VCol>
      </VRow>

      <VAlert type="info" variant="tonal" density="comfortable" class="mt-4">
        <strong>¿Tengo que declarar de nuevo en Ahíva?</strong> En principio no, si un courier o
        agente designado ya capturó tus datos y gestiona el despacho. Sí tenés que usar Ahíva si el
        envío finalmente ingresa por Correo Uruguayo y Correo te pide registrarlo. Seguí siempre la
        notificación del operador que tenga el paquete en Uruguay.
      </VAlert>
    </section>

    <section id="regimen-general" class="mb-9">
      <div class="section-kicker">CUANDO EL ENVÍO POSTAL NO ALCANZA</div>
      <h2 class="section-heading mb-2">Cuándo necesitás una importación general</h2>
      <p class="text-body-2 text-medium-emphasis mb-4">
        El régimen postal simplificado llega hasta US$ 800 de valor y 20 kg. Si la operación queda
        fuera, Aduanas indica que debe tramitarse como importación general mediante DUA y con
        despachante.
      </p>

      <VCard variant="flat" class="outlined-card pa-5">
        <VRow>
          <VCol v-for="item in generalImportCases" :key="item.title" cols="12" sm="6">
            <div class="d-flex ga-3">
              <VIcon color="warning" class="mt-1">{{ item.icon }}</VIcon>
              <div>
                <div class="font-weight-bold">{{ item.title }}</div>
                <p class="text-body-2 text-medium-emphasis mb-0">{{ item.text }}</p>
              </div>
            </div>
          </VCol>
        </VRow>
      </VCard>

      <p class="text-body-2 mt-4 mb-0">
        Pedí una cotización <strong>antes de comprar</strong>: tributos, honorarios, depósito,
        certificados y flete pueden superar el valor del artículo. Aduanas informa que las personas
        físicas pueden realizar hasta dos DUA de importación por año.
      </p>
    </section>

    <section class="mb-9">
      <h2 class="section-heading mb-4">Checklist antes de pagar</h2>
      <VRow>
        <VCol v-for="item in checklist" :key="item" cols="12" sm="6">
          <div class="check-item">
            <VIcon color="success" size="20">mdi-check-circle-outline</VIcon>
            <span>{{ item }}</span>
          </div>
        </VCol>
      </VRow>
    </section>

    <section class="mb-9">
      <h2 class="section-heading mb-3">Preguntas frecuentes</h2>
      <VExpansionPanels variant="accordion">
        <VExpansionPanel v-for="faq in faqs" :key="faq.q">
          <VExpansionPanelTitle>{{ faq.q }}</VExpansionPanelTitle>
          <VExpansionPanelText>
            <!-- Content is a static, source-controlled catalog; it never contains user input. -->
            <!-- eslint-disable-next-line vue/no-v-html -->
            <span v-html="faq.a" />
          </VExpansionPanelText>
        </VExpansionPanel>
      </VExpansionPanels>
    </section>

    <section class="mb-9" aria-labelledby="fuentes">
      <h2 id="fuentes" class="section-heading mb-2">Fuentes y alcance</h2>
      <p class="text-body-2 text-medium-emphasis mb-3">
        Normativa y procedimientos revisados el 25 de julio de 2026. Las condiciones de checkout y
        disponibilidad de las plataformas pueden cambiar por producto, vendedor y destino.
      </p>
      <ul class="sources">
        <li v-for="source in sources" :key="source.url">
          <a :href="source.url" target="_blank" rel="noopener noreferrer">{{ source.label }}</a>
        </li>
      </ul>
    </section>

    <section aria-label="Guías relacionadas">
      <h2 class="section-heading mb-4">Seguí según tu caso</h2>
      <VRow>
        <VCol v-for="link in relatedLinks" :key="link.to" cols="12" sm="6" lg="3">
          <NuxtLink :to="localePath(link.to)" class="related-card">
            <VIcon color="primary" class="mb-2">{{ link.icon }}</VIcon>
            <span class="font-weight-bold">{{ link.title }}</span>
            <span class="text-caption text-medium-emphasis">{{ link.text }}</span>
          </NuxtLink>
        </VCol>
      </VRow>
    </section>
  </VContainer>
</template>

<script setup lang="ts">
const localePath = useLocalePath()

const routes = [
  {
    name: 'Correo común o EMS',
    form: 'Ahíva de Correo Uruguayo',
    operator: 'Correo Uruguayo',
    clue: 'Tracking postal: dos letras, nueve números y dos letras',
  },
  {
    name: 'Courier o casilla',
    form: 'Portal o formulario del courier',
    operator: 'El courier privado',
    clue: 'Qué operador trae el paquete y qué cargos cobra',
  },
  {
    name: 'Amazon Global',
    form: 'Checkout de Amazon y transportista',
    operator: 'Transportista designado por Amazon',
    clue: '“Import Fees Deposit” o “Import Charges” en el checkout',
  },
  {
    name: 'Temu con importación gestionada',
    form: 'App o web de Temu',
    operator: 'Agente de carga designado por Temu',
    clue: 'Cédula, titular del pago y cargos incluidos en el total',
  },
  {
    name: 'Importación general',
    form: 'Con un despachante de Aduana',
    operator: 'El despachante mediante DUA',
    clue: 'Más de US$ 800, más de 20 kg, IMESI o permisos',
  },
]

const postalSteps = [
  {
    title: 'Guardá factura, comprobante de pago y tracking.',
    text: 'No confundas el número de orden con el de envío. El tracking postal suele tener dos letras, nueve números y dos letras, por ejemplo <code>RJ284204981CN</code>. Si llega sin un código válido, Correo le asigna uno y te lo comunica.',
  },
  {
    title: 'Registrate con los datos exactos de tu cédula.',
    text: 'Nombre, apellido y documento deben coincidir con Identificación Civil. Si vas a usar franquicia, te conviene completar además el <a href="https://www.aduanas.gub.uy/innovaportal/v/28449/1/innova.front/" target="_blank" rel="noopener noreferrer">registro de identidad de Aduanas</a>: en julio de 2026 sigue en etapa voluntaria, se hace una sola vez y la DNA anunció que pasará a ser obligatorio.',
  },
  {
    title: 'Registrá cada paquete por separado.',
    text: 'Ingresá tracking, si es compra u obsequio, descripción, valor, origen y factura. Si una misma orden llega en tres paquetes, son tres declaraciones y pueden consumir tres usos de franquicia.',
  },
  {
    title: 'Elegí franquicia o prestación única.',
    text: 'La franquicia es para uso personal y exige que comprador, titular del medio de pago y destinatario sean la misma persona. Si no usás franquicia y el envío admite el régimen simplificado, paga 60% del valor con un mínimo de US$ 20.',
  },
  {
    title: 'Pagá a través de Correo y conservá el comprobante.',
    text: 'Desde mayo de 2026 no se paga el tributo directamente en VUCE: lo cobra el operador postal y lo vierte a la DNA. La declaración finaliza cuando se completan los pagos que correspondan.',
  },
]

const platforms = [
  {
    title: 'Amazon Global',
    tone: 'amazon',
    icon: 'mdi-package-variant',
    paragraphs: [
      'En productos y destinos elegibles, el checkout muestra “Import Fees Deposit” o “Import Charges”. Amazon cobra una estimación o cargo y designa al transportista para hacer el despacho.',
      'Vos seguís siendo el importador registrado. El transportista puede pedir cédula y la compra sigue sujeta a cupo, peso, prohibiciones y permisos. Si el concepto no aparece al pagar, no presupongas que Amazon gestionará la Aduana.',
    ],
  },
  {
    title: 'Temu',
    tone: 'temu',
    icon: 'mdi-shopping-outline',
    paragraphs: [
      'Los términos de Temu para Uruguay dicen que, cuando corresponde, el comprador actúa como importador y autoriza a Temu a nombrar un agente de carga que lo represente y pague IVA, aranceles y otros cargos.',
      'Usá los mismos datos del titular de la tarjeta y del destinatario. Si Temu divide la orden, revisá cuántos paquetes y declaraciones generó.',
    ],
  },
  {
    title: 'Tiendamia y otras plataformas',
    tone: 'managed',
    icon: 'mdi-truck-check-outline',
    paragraphs: [
      'Algunos servicios muestran un precio final con envío, manejo e impuestos y hacen el trámite mediante su courier. Otros solo venden y entregan al correo común.',
      'No decidas por el logo: mirá el transportista, si el checkout detalla impuestos de importación y quién responde si Aduanas exige documentación.',
    ],
  },
]

const generalImportCases = [
  {
    title: 'Valor superior a US$ 800',
    text: 'No entra en franquicia ni en la prestación única del 60%.',
    icon: 'mdi-cash-multiple',
  },
  {
    title: 'Peso superior a 20 kg',
    text: 'El límite se aplica a cada envío postal.',
    icon: 'mdi-weight-kilogram',
  },
  {
    title: 'Productos con IMESI',
    text: 'Quedan fuera del régimen postal del Decreto 50/026.',
    icon: 'mdi-receipt-text-outline',
  },
  {
    title: 'Mercadería controlada',
    text: 'Puede exigir autorización previa de MSP, URSEC, MGAP u otro organismo.',
    icon: 'mdi-file-certificate-outline',
  },
]

const checklist = [
  'El nombre del comprador, pagador y destinatario coincide con la cédula.',
  'El checkout dice quién transporta y si incluye cargos de importación.',
  'Guardaste factura final, comprobante de pago y captura del total.',
  'Sabés cuántos paquetes puede generar la orden.',
  'El valor y el peso entran en el régimen que querés usar.',
  'El producto no está prohibido ni requiere un permiso pendiente.',
  'Revisaste tu saldo de franquicia y la cantidad de envíos usados.',
  'Tenés claro quién responde si el paquete queda retenido.',
]

const faqs = [
  {
    q: '¿Quién hace legalmente la declaración ante Aduanas?',
    a: 'El <strong>operador postal</strong> presenta la información y paga los tributos a la DNA como responsable por obligaciones de terceros. El comprador aporta datos verdaderos, factura y documentación. En Correo se hace mediante Ahíva; en un courier o plataforma, mediante su portal o checkout.',
    aText:
      'El operador postal presenta la información y paga los tributos a la DNA. El comprador aporta datos verdaderos, factura y documentación. En Correo se hace mediante Ahíva; en un courier o plataforma, mediante su portal o checkout.',
  },
  {
    q: '¿Una compra de Amazon Global o Temu usa mi franquicia?',
    a: 'Sí, si se despacha bajo franquicia. Que la plataforma gestione la importación solo cambia <strong>quién completa el trámite</strong>; no crea una franquicia aparte ni evita el contador anual de tres envíos y US$ 800 acumulados.',
    aText:
      'Sí, si se despacha bajo franquicia. La importación gestionada solo cambia quién completa el trámite; no crea una franquicia aparte ni evita el contador anual.',
  },
  {
    q: '¿Qué pasa si Amazon o Temu divide mi orden en varios paquetes?',
    a: 'Revisá cada tracking. Aduanas y Correo trabajan por <strong>envío físico</strong>: varios paquetes pueden requerir varias declaraciones y consumir más de un uso de franquicia, aunque provengan de una sola orden.',
    aText:
      'Cada paquete físico puede requerir una declaración y consumir un uso de franquicia, aunque provenga de una sola orden.',
  },
  {
    q: '¿Puedo declarar después de que el paquete llegue?',
    a: 'Sí, pero el paquete queda retenido y Correo publica un cargo administrativo mayor. Declarar antes reduce costos y riesgo de que corran los plazos de abandono.',
    aText:
      'Sí, pero el paquete queda retenido y Correo cobra un cargo administrativo mayor. Declarar antes reduce costos y el riesgo de abandono.',
  },
  {
    q: '¿Tengo que usar un despachante para una compra común?',
    a: 'No, mientras el envío entre en franquicia o en el régimen simplificado postal. Aduanas exige importación general con despachante cuando supera US$ 800, pesa más de 20 kg, contiene mercadería con IMESI o no cumple otra condición.',
    aText:
      'No mientras el envío entre en franquicia o en el régimen simplificado. Aduanas exige importación general con despachante cuando supera 800 dólares, pesa más de 20 kg o incumple otra condición.',
  },
]

const sources = [
  {
    label: 'Decreto 50/026 — régimen postal, operadores responsables, datos y tributos',
    url: 'https://www.impo.com.uy/bases/decretos/50-2026',
  },
  {
    label: 'MEF — preguntas frecuentes del régimen vigente desde mayo de 2026',
    url: 'https://www.gub.uy/ministerio-economia-finanzas/comunicacion/noticias/guia-preguntas-frecuentes-sobre-regimen-envios-postales-franquicias',
  },
  {
    label: 'Aduanas — envíos postales internacionales',
    url: 'https://www.aduanas.gub.uy/innovaportal/v/28219/9/innova.front/compras-web-y-envios.html',
  },
  {
    label: 'Aduanas — importación general mediante DUA',
    url: 'https://www.aduanas.gub.uy/innovaportal/v/28223/1/innova.front/',
  },
  {
    label: 'Aduanas — registro de identidad para usuarios de franquicia',
    url: 'https://www.aduanas.gub.uy/innovaportal/v/28449/1/innova.front/',
  },
  {
    label: 'Correo Uruguayo — cómo declarar una compra u obsequio',
    url: 'https://www.correo.com.uy/como-declarar-su-compra-u-obsequio',
  },
  {
    label: 'Correo Uruguayo — cargos administrativos y plazos',
    url: 'https://www.correo.com.uy/gestiones-administrativas-envios-exterior',
  },
  {
    label: 'VUCE — pago de tributos mediante el operador postal',
    url: 'https://vuce.gub.uy/comunicado-no-26-2/',
  },
  {
    label: 'Amazon Global Store — depósito/cargos y transportista designado',
    url: 'https://digprjsurvey.amazon.co.uk/csad/help/node/G9UHGT37MYD2EJPL',
  },
  {
    label: 'Temu Uruguay — términos de uso, sección 10',
    url: 'https://www.temu.com/uy/terms-of-use.html',
  },
]

const relatedLinks = [
  {
    title: 'Preguntas de aduana',
    text: 'Buscá tu caso y abrí la fuente oficial de cada respuesta.',
    to: '/preguntas-frecuentes-aduana-uruguay',
    icon: 'mdi-comment-question-outline',
  },
  {
    title: 'Franquicia e IVA',
    text: 'Qué régimen te corresponde y cuánto paga.',
    to: '/franquicia-aduana-uruguay',
    icon: 'mdi-package-variant-closed-check',
  },
  {
    title: 'Comparar couriers',
    text: 'Costos, reputación y servicios puerta a puerta.',
    to: '/couriers-uruguay',
    icon: 'mdi-truck-fast-outline',
  },
  {
    title: 'Calcular impuestos',
    text: 'Estimá el costo final puesto en Uruguay.',
    to: '/herramientas/calculadora-impuestos-importacion',
    icon: 'mdi-calculator-variant-outline',
  },
  {
    title: 'Paquete retenido',
    text: 'Diagnóstico y pasos para destrabarlo.',
    to: '/problemas-con-la-aduana-uruguay',
    icon: 'mdi-clipboard-alert-outline',
  },
]

const canonicalUrl = 'https://cambio-uruguay.com/declarar-compra-exterior-uruguay'
const title = 'Cómo declarar una compra del exterior en Uruguay: correo, Amazon y Temu'
const description =
  'Paso a paso para declarar compras del exterior en Uruguay sin courier, por Correo Uruguayo, Amazon Global, Temu o courier. Quién hace el trámite y cuándo se necesita despachante.'

defineOgImageComponent('Cambio', {
  title: 'Cómo declarar una compra del exterior',
  subtitle: 'Correo, courier, Amazon Global, Temu y régimen general',
  tag: 'ADUANA',
})

useSeoMeta({
  title: () => `${title} | Cambio Uruguay`,
  description,
  ogTitle: title,
  ogDescription: description,
  ogType: 'article',
  ogUrl: canonicalUrl,
  twitterCard: 'summary_large_image',
})

useHead(() => ({
  link: [{ rel: 'canonical', href: canonicalUrl }],
  meta: [
    {
      name: 'keywords',
      content:
        'declarar compra exterior uruguay, compra exterior sin courier, declarar paquete correo uruguayo, ahiva aduana, amazon global uruguay, temu importacion gestionada uruguay, import fees deposit uruguay, despachante aduana compra exterior',
    },
  ],
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'BreadcrumbList',
            itemListElement: [
              {
                '@type': 'ListItem',
                position: 1,
                name: 'Cambio Uruguay',
                item: 'https://cambio-uruguay.com',
              },
              {
                '@type': 'ListItem',
                position: 2,
                name: 'Importaciones y aduana',
                item: 'https://cambio-uruguay.com/temas/importaciones-y-aduana-uruguay',
              },
              {
                '@type': 'ListItem',
                position: 3,
                name: title,
                item: canonicalUrl,
              },
            ],
          },
          {
            '@type': 'HowTo',
            name: 'Cómo declarar una compra que llega por Correo Uruguayo',
            description,
            step: postalSteps.map((step, index) => ({
              '@type': 'HowToStep',
              position: index + 1,
              name: step.title,
              text: step.title,
            })),
          },
          {
            '@type': 'FAQPage',
            mainEntity: faqs.map(faq => ({
              '@type': 'Question',
              name: faq.q,
              acceptedAnswer: { '@type': 'Answer', text: faq.aText },
            })),
          },
        ],
      }),
    },
  ],
}))
</script>

<style scoped>
.page {
  max-width: 1080px;
}

.hero {
  max-width: 900px;
}

.eyebrow,
.section-kicker {
  color: rgb(var(--v-theme-link));
  font-size: 0.75rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.section-heading {
  font-size: 1.25rem;
  font-weight: 800;
  line-height: 1.3;
}

.table-scroll {
  overflow-x: auto;
  border: 1px solid rgba(var(--v-border-color), 0.16);
  border-radius: 12px;
}

.route-table {
  width: 100%;
  min-width: 780px;
  border-collapse: collapse;
  font-size: 0.86rem;
}

.route-table th,
.route-table td {
  padding: 14px 16px;
  text-align: left;
  vertical-align: top;
  border-bottom: 1px solid rgba(var(--v-border-color), 0.12);
}

.route-table th {
  background: rgba(var(--v-theme-primary), 0.08);
  font-size: 0.75rem;
  letter-spacing: 0.03em;
  text-transform: uppercase;
}

.route-table tbody tr:last-child td {
  border-bottom: 0;
}

.outlined-card {
  border: 1px solid rgba(var(--v-border-color), 0.15);
  border-radius: 16px;
}

.steps {
  list-style: none;
  margin: 0;
  padding: 0;
  counter-reset: declaration-step;
  display: grid;
  gap: 20px;
}

.steps li {
  counter-increment: declaration-step;
  display: grid;
  grid-template-columns: 36px 1fr;
  gap: 14px;
}

.steps li::before {
  content: counter(declaration-step);
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: rgb(var(--v-theme-primary));
  color: rgb(var(--v-theme-on-primary));
  font-weight: 800;
}

.steps p {
  margin: 4px 0 0;
  color: rgba(var(--v-theme-on-surface), 0.76);
  font-size: 0.88rem;
  line-height: 1.65;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.platform-icon {
  display: grid;
  place-items: center;
  width: 42px;
  height: 42px;
  border-radius: 12px;
}

.platform-icon.amazon {
  color: #f59e0b;
  background: rgba(245, 158, 11, 0.12);
}

.platform-icon.temu {
  color: #ea580c;
  background: rgba(234, 88, 12, 0.12);
}

.platform-icon.managed {
  color: rgb(var(--v-theme-primary));
  background: rgba(var(--v-theme-primary), 0.1);
}

.check-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  height: 100%;
  padding: 12px 14px;
  border: 1px solid rgba(var(--v-border-color), 0.14);
  border-radius: 12px;
  font-size: 0.88rem;
}

.sources {
  display: grid;
  gap: 8px;
  margin: 0;
  padding-left: 20px;
  font-size: 0.875rem;
}

.related-card {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 16px;
  border: 1px solid rgba(var(--v-border-color), 0.14);
  border-radius: 12px;
  color: inherit;
  text-decoration: none;
  transition:
    border-color 0.15s ease,
    transform 0.15s ease;
}

.related-card:hover {
  border-color: rgba(var(--v-theme-primary), 0.55);
  transform: translateY(-2px);
}

@media (max-width: 599px) {
  .table-scroll {
    overflow: visible;
    border: 0;
  }

  .route-table {
    min-width: 0;
  }

  .actions :deep(.v-btn) {
    width: 100%;
  }
}
</style>
