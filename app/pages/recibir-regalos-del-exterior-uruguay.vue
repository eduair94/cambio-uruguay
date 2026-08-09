<template>
  <VContainer class="page py-6 py-md-10">
    <!-- Hero -->
    <header class="hero mb-6">
      <p class="eyebrow">Compras y envíos del exterior · Verificado en agosto de 2026</p>
      <h1 class="text-h4 text-md-h3 font-weight-bold mb-2">
        Recibir regalos del exterior en Uruguay (y una carta adentro)
      </h1>
      <p class="text-body-1 text-medium-emphasis mb-4">
        Tu pareja, un amigo o un familiar te quiere mandar un regalo desde afuera —accesorios,
        llaveros, una caravana— y la duda es la de siempre: ¿me lo va a trabar la aduana? La
        respuesta corta es tranquilizadora, pero hay tres detalles que conviene tener claros antes
        de que lo despache.
      </p>
      <VAlert type="success" variant="tonal" density="comfortable" icon="mdi-gift-outline">
        <strong>Respuesta corta:</strong> un <strong>obsequio familiar</strong> genuino —de persona
        física a persona física, sin fin comercial y en cantidades razonables— está
        <strong>exento de todo tributo, IVA incluido</strong> (Decreto 50/026, art. 3). Y sí,
        <strong>podés incluir una carta o tarjeta personal adentro del paquete</strong>: la
        correspondencia personal está permitida y ni siquiera se declara.
      </VAlert>
      <p class="text-caption text-medium-emphasis mt-3 mb-0">
        <VIcon size="14" class="mr-1">mdi-cart-outline</VIcon>
        ¿No es un regalo sino una compra que te hacés vos?
        <NuxtLink :to="localePath('/franquicia-aduana-uruguay')">
          Ahí cambia el régimen — mirá si tu compra paga IVA </NuxtLink
        >.
      </p>
    </header>

    <!-- The three questions from the real-world case -->
    <section class="mb-8" aria-label="Las tres dudas típicas">
      <h2 class="section-heading mb-4">Las tres dudas, respondidas</h2>
      <VRow>
        <VCol v-for="(card, i) in answerCards" :key="i" cols="12" md="4">
          <VCard variant="flat" class="answer pa-5 h-100">
            <VIcon :color="card.color" size="28" class="mb-2">{{ card.icon }}</VIcon>
            <p class="text-subtitle-1 font-weight-bold mb-2">{{ card.q }}</p>
            <!-- eslint-disable-next-line vue/no-v-html -->
            <div class="answer-body" v-html="card.a" />
          </VCard>
        </VCol>
      </VRow>
    </section>

    <!-- What counts as an obsequio familiar -->
    <section class="mb-8">
      <h2 class="section-heading mb-1">Qué cuenta como “obsequio familiar”</h2>
      <p class="text-body-2 text-medium-emphasis mb-4">
        No alcanza con decir “es un regalo”. Para que la exención del art. 3 se aplique, el envío
        tiene que cumplir estas condiciones, tal como las define el Correo Uruguayo. Si las cumple,
        no paga <em>ningún</em> tributo.
      </p>
      <VCard variant="flat" class="conditions pa-5">
        <ul class="cond-list">
          <li v-for="(c, i) in conditions" :key="i">
            <VIcon size="18" color="success" class="mr-2">mdi-check-circle-outline</VIcon>
            <span v-html="c" />
          </li>
        </ul>
      </VCard>
      <VAlert
        type="info"
        variant="tonal"
        density="comfortable"
        class="mt-4"
        icon="mdi-account-heart-outline"
      >
        Que sea de tu <strong>pareja</strong> no cambia nada: “familiar” acá se lee en sentido
        amplio —un envío no comercial entre personas físicas—. Lo que importa es que
        <strong>no haya una venta detrás</strong>: nadie te cobró la mercadería.
      </VAlert>
    </section>

    <!-- Accessories: are they a problem? -->
    <section class="mb-8">
      <h2 class="section-heading mb-1">Accesorios, llaveros, caravanas: ¿algún problema?</h2>
      <p class="text-body-2 text-medium-emphasis mb-4">
        En general, no. Bijouterie, accesorios de ropa, llaveros y caravanas de fantasía son
        exactamente el tipo de “cositas livianas” que entran sin drama como obsequio. Livianos, de
        bajo valor y de uso personal: el perfil ideal. Pero hay una excepción que sorprende y una
        línea de valor que conviene no cruzar.
      </p>
      <VRow>
        <VCol cols="12" md="6">
          <VCard variant="flat" class="warn-card pa-5 h-100">
            <div class="d-flex align-center ga-2 mb-2">
              <VIcon color="warning">mdi-spray</VIcon>
              <span class="text-subtitle-1 font-weight-bold"
                >Cuidado con perfumería y cosmética</span
              >
            </div>
            <p class="text-body-2 mb-0">
              Es la trampa menos intuitiva: <strong>perfumes y cosméticos</strong> están gravados
              por <strong>IMESI</strong> y quedan <strong>fuera</strong> del régimen de obsequios y
              franquicia. Si en el paquete van accesorios, sumar un perfumito o un maquillaje puede
              complicar todo el envío. Mejor que los regalos “de aduana fácil” no incluyan
              cosmética.
            </p>
          </VCard>
        </VCol>
        <VCol cols="12" md="6">
          <VCard variant="flat" class="warn-card pa-5 h-100">
            <div class="d-flex align-center ga-2 mb-2">
              <VIcon color="warning">mdi-scale-balance</VIcon>
              <span class="text-subtitle-1 font-weight-bold">El valor igual se declara</span>
            </div>
            <p class="text-body-2 mb-0">
              Aunque no pagues, hay que declarar el envío y estimar su valor (de mercadería idéntica
              o similar). El obsequio sigue sujeto a los topes anuales: hasta
              <strong>US$ {{ FRANCHISE_ANNUAL_USD }}</strong> y
              <strong>{{ MAX_WEIGHT_KG }} kg</strong>
              por envío. Para regalos livianos esto nunca es un problema, pero es la regla.
            </p>
          </VCard>
        </VCol>
      </VRow>
    </section>

    <!-- The letter -->
    <section class="mb-8">
      <h2 class="section-heading mb-1">La carta adentro del paquete: ¿es permitido?</h2>
      <p class="text-body-2 text-medium-emphasis mb-4">
        Sí. Meter una <strong>carta o tarjeta personal</strong> dentro del paquete, junto con los
        regalos, es lo más común del mundo y no genera ningún problema aduanero.
      </p>
      <VCard variant="flat" class="letter pa-5">
        <ul class="letter-list">
          <li>
            <VIcon size="18" color="primary" class="mr-2">mdi-email-outline</VIcon>
            La <strong>correspondencia personal</strong> es la única categoría de envío que
            <strong>no se declara</strong> ante la Aduana. Una carta manuscrita o una tarjeta de
            cumpleaños no tiene valor comercial ni paga nada.
          </li>
          <li>
            <VIcon size="18" color="primary" class="mr-2">mdi-package-variant-closed</VIcon>
            Cuando va <strong>adentro</strong> del paquete, lo que se declara es el
            <strong>paquete</strong> (como obsequio); la carta viaja como parte del contenido
            personal y no cambia nada del trámite.
          </li>
          <li>
            <VIcon size="18" color="primary" class="mr-2">mdi-alert-circle-outline</VIcon>
            El único “no”: que la carta sea en realidad una
            <strong>factura o documento comercial</strong>
            que contradiga la declaración de obsequio. Una carta de amor no es eso —mandala
            tranquila—.
          </li>
        </ul>
      </VCard>
    </section>

    <!-- How to declare a gift -->
    <section class="mb-8">
      <h2 class="section-heading mb-1">Cómo se declara un obsequio (paso a paso)</h2>
      <p class="text-body-2 text-medium-emphasis mb-4">
        El regalo lo recibís vos, y el trámite de declaración —cuando llega por Correo Uruguayo— lo
        hacés vos como destinatario. La diferencia con una compra es que
        <strong>no presentás factura</strong>.
      </p>
      <VCard variant="flat" class="steps pa-5">
        <ol class="step-list">
          <li v-for="(s, i) in steps" :key="i">
            <span class="step-num">{{ i + 1 }}</span>
            <div>
              <p class="font-weight-bold mb-1">{{ s.title }}</p>
              <p class="text-body-2 text-medium-emphasis mb-0" v-html="s.text" />
            </div>
          </li>
        </ol>
      </VCard>
      <p class="text-caption text-medium-emphasis mt-3 mb-0">
        <VIcon size="14" class="mr-1">mdi-file-sign</VIcon>
        Si el paquete llega por un courier privado (DHL, UPS, Tiendamia…) el trámite lo hace el
        courier con tus datos.
        <NuxtLink :to="localePath('/declarar-compra-exterior-uruguay')">
          Ver el paso a paso completo por cada vía </NuxtLink
        >.
      </p>
    </section>

    <!-- Checklist for the sender abroad -->
    <section class="mb-8">
      <h2 class="section-heading mb-1">Checklist para quien lo manda desde afuera</h2>
      <p class="text-body-2 text-medium-emphasis mb-4">
        Pasale esto a tu pareja, amigo o familiar antes de que vaya al correo del otro país.
      </p>
      <VCard variant="flat" class="checklist pa-5">
        <ul class="check-list">
          <li v-for="(item, i) in senderChecklist" :key="i">
            <VIcon size="18" color="success" class="mr-2">mdi-checkbox-marked-circle-outline</VIcon>
            <span v-html="item" />
          </li>
        </ul>
      </VCard>
    </section>

    <!-- FAQ -->
    <section class="mb-8">
      <h2 class="section-heading mb-1">Preguntas frecuentes</h2>
      <VCard variant="flat" class="faq pa-2 pa-sm-4">
        <VExpansionPanels variant="accordion" class="faq-panels">
          <VExpansionPanel v-for="(f, i) in faqs" :key="i">
            <VExpansionPanelTitle class="faq-q">{{ f.q }}</VExpansionPanelTitle>
            <VExpansionPanelText>
              <!-- eslint-disable-next-line vue/no-v-html -->
              <div class="faq-a" v-html="f.a" />
            </VExpansionPanelText>
          </VExpansionPanel>
        </VExpansionPanels>
      </VCard>
      <VBtn
        :to="localePath('/preguntas-frecuentes-aduana-uruguay')"
        variant="text"
        color="primary"
        class="mt-3 px-1"
      >
        Ver todas las preguntas de aduana, productos y viajeros
        <VIcon end>mdi-arrow-right</VIcon>
      </VBtn>
    </section>

    <!-- Sources -->
    <VCard variant="flat" class="sources-card pa-5 mb-6">
      <h2 class="text-subtitle-2 font-weight-bold mb-2">
        <VIcon start size="small" color="primary">mdi-link-variant</VIcon>
        De dónde sale cada dato
      </h2>
      <ul class="sources-list">
        <li v-for="(s, i) in sources" :key="i">
          <a :href="s.url" target="_blank" rel="noopener noreferrer">{{ s.label }}</a>
        </li>
      </ul>
    </VCard>

    <VAlert type="warning" variant="tonal" density="comfortable" icon="mdi-alert-outline">
      Información <strong>de referencia</strong>, no asesoramiento profesional. La Aduana resuelve
      caso a caso y evalúa cantidad, naturaleza y finalidad de cada envío. Ante la duda, verificá
      con la Dirección Nacional de Aduanas antes de que te lo manden.
    </VAlert>
  </VContainer>
</template>

<script setup lang="ts">
import { FRANCHISE_ANNUAL_USD, FRANCHISE_MAX_SHIPMENTS, MAX_WEIGHT_KG } from '~/utils/importRules'

const localePath = useLocalePath()

const answerCards = [
  {
    icon: 'mdi-diamond-stone',
    color: 'success',
    q: '¿Me hacen problema por accesorios y caravanas?',
    a: 'En general no. Bijouterie, accesorios y llaveros son livianos, de bajo valor y de uso personal: entran como obsequio familiar, <strong>exentos de IVA</strong> y de todo tributo. La excepción a esquivar es la <strong>perfumería y cosmética</strong> (IMESI).',
  },
  {
    icon: 'mdi-email-heart-outline',
    color: 'primary',
    q: '¿Puedo recibir una carta adentro del paquete?',
    a: 'Sí. La <strong>correspondencia personal</strong> está permitida y es la única categoría que ni siquiera se declara. Metida entre los regalos no cambia nada: se declara el paquete, no la carta.',
  },
  {
    icon: 'mdi-check-decagram-outline',
    color: 'success',
    q: '¿Es permitido, entonces?',
    a: 'Sí, mientras sea un envío <strong>no comercial entre personas físicas</strong>, en cantidades razonables y para tu uso personal. Igual usa <strong>uno de tus 3 envíos</strong> del año y se declara su valor.',
  },
]

const conditions = [
  '<strong>No comercial entre las partes</strong>: nadie te vendió ni te cobró la mercadería.',
  'Remitido y consignado por <strong>personas físicas</strong> (no una empresa a un cliente).',
  'Mercadería en <strong>cantidades razonables</strong>, nueva o usada.',
  'Para <strong>uso o consumo personal</strong> del destinatario.',
  `Dentro de los topes anuales: hasta <strong>US$ ${FRANCHISE_ANNUAL_USD}</strong> y <strong>${MAX_WEIGHT_KG} kg</strong> por envío, y consume uno de tus <strong>${FRANCHISE_MAX_SHIPMENTS} envíos</strong> del año.`,
  'No contiene bienes con <strong>IMESI</strong> (perfumes, cosméticos, alcohol, tabaco) ni mercadería prohibida o controlada.',
]

const steps = [
  {
    title: 'Esperá el aviso de llegada',
    text: 'El Correo te notifica cuando el envío ingresa. También podés declararlo antes de que llegue para reducir costos y demoras.',
  },
  {
    title: 'Entrá a Ahíva (plataforma del Correo Uruguayo)',
    text: 'Es donde el destinatario declara los envíos que llegan por correo internacional común, con tu usuario gub.uy.',
  },
  {
    title: 'Elegí la opción “Obsequio”',
    text: 'Al declarar, marcás que es un obsequio y no una compra. En lugar de factura, hacés una <strong>declaración de valor</strong> (valor de mercadería idéntica o similar) y podés adjuntar una imagen del contenido.',
  },
  {
    title: 'No te van a pedir el medio de pago',
    text: 'En los obsequios no se pide tarjeta ni comprobante de pago —justamente porque no hubo compra—. En las compras sí.',
  },
  {
    title: 'Retirá el paquete',
    text: 'Si es un obsequio genuino dentro de los topes, no pagás tributos; solo puede aplicar un cargo administrativo del operador postal.',
  },
]

const senderChecklist = [
  'Que <strong>remitente y destinatario sean personas físicas</strong> (nombres de personas, no de una tienda).',
  'Marcar el envío como <strong>“gift” / obsequio</strong> en la etiqueta y en la declaración postal (CN22/CN23).',
  'Declarar un <strong>valor realista</strong> del contenido: subvalorar puede dar “duda razonable” y trabar el envío.',
  '<strong>Evitar perfumes y cosméticos</strong> (IMESI): sacan al envío del régimen de obsequios.',
  'Que el peso quede <strong>bien por debajo de ' +
    MAX_WEIGHT_KG +
    ' kg</strong> —para regalos livianos, obvio—.',
  'Puede incluir una <strong>carta o tarjeta personal</strong> adentro: no es un problema.',
  'Si son varias cosas, mejor <strong>un solo paquete</strong>: cada paquete cuenta como un envío del cupo anual.',
]

const faqs = [
  {
    q: 'Me manda un regalo mi pareja desde el exterior. ¿Paga impuestos?',
    a: 'No, si es un <strong>obsequio familiar</strong> genuino. El art. 3 del Decreto 50/026 exonera de <em>todo tributo</em> —IVA incluido— a los envíos con obsequios entre personas físicas, sin fin comercial, en cantidades razonables y para uso personal del destinatario. Dos detalles: igual <strong>usa uno de tus 3 envíos</strong> del año y su valor se acredita con una <strong>declaración de valor</strong>, no con factura.',
    aText:
      'No, si es un obsequio familiar genuino. El art. 3 del Decreto 50/026 exonera de todo tributo, IVA incluido, a los envíos con obsequios entre personas físicas, sin fin comercial, en cantidades razonables y para uso personal del destinatario. Igual usa uno de tus 3 envíos del año y el valor se acredita con una declaración de valor, no con factura.',
  },
  {
    q: '¿Puedo recibir una carta dentro del paquete de regalos?',
    a: 'Sí. La correspondencia personal es la única categoría de envío que <strong>no se declara</strong> ante la Aduana, y una carta o tarjeta metida entre los regalos no cambia el trámite: se declara el paquete como obsequio y la carta viaja como parte del contenido. El único caso a evitar es que ese papel sea en realidad una <strong>factura o documento comercial</strong> que contradiga la declaración de obsequio.',
    aText:
      'Sí. La correspondencia personal es la única categoría de envío que no se declara ante la Aduana, y una carta o tarjeta metida entre los regalos no cambia el trámite: se declara el paquete como obsequio y la carta viaja como parte del contenido. Solo hay que evitar que ese papel sea en realidad una factura o documento comercial que contradiga la declaración de obsequio.',
  },
  {
    q: '¿Son un problema los accesorios, llaveros o caravanas?',
    a: 'No: son livianos, de bajo valor y de uso personal, el perfil ideal para un obsequio. La excepción que sorprende es la <strong>perfumería y cosmética</strong>, gravada por IMESI y fuera del régimen. Si en el mismo paquete metés accesorios y un perfume, podés complicar todo el envío; mejor dejá la cosmética afuera.',
    aText:
      'No: son livianos, de bajo valor y de uso personal, el perfil ideal para un obsequio. La excepción que sorprende es la perfumería y cosmética, gravada por IMESI y fuera del régimen. Si en el mismo paquete van accesorios y un perfume podés complicar todo el envío; mejor dejar la cosmética afuera.',
  },
  {
    q: 'Si es un regalo, ¿por qué igual tengo que declararlo?',
    a: 'Porque todo envío internacional —salvo la correspondencia— se declara ante la Aduana, aunque no pague. Al declarar un obsequio elegís la opción “Obsequio” y hacés una declaración de valor en lugar de presentar factura. La exención es del <em>pago</em>, no de la <em>declaración</em>.',
    aText:
      'Porque todo envío internacional, salvo la correspondencia, se declara ante la Aduana, aunque no pague. Al declarar un obsequio se elige la opción Obsequio y se hace una declaración de valor en lugar de presentar factura. La exención es del pago, no de la declaración.',
  },
  {
    q: '¿Cuántos regalos me pueden mandar por año?',
    a: `El régimen postal simplificado permite hasta <strong>${FRANCHISE_MAX_SHIPMENTS} envíos</strong> por año civil, de hasta <strong>US$ ${FRANCHISE_ANNUAL_USD}</strong> acumulados y <strong>${MAX_WEIGHT_KG} kg</strong> cada uno. Cada obsequio consume uno de esos usos. Para regalos livianos el límite real es la cantidad de envíos, no el valor.`,
    aText: `El régimen postal simplificado permite hasta ${FRANCHISE_MAX_SHIPMENTS} envíos por año civil, de hasta US$ ${FRANCHISE_ANNUAL_USD} acumulados y ${MAX_WEIGHT_KG} kg cada uno. Cada obsequio consume uno de esos usos. Para regalos livianos el límite real es la cantidad de envíos, no el valor.`,
  },
  {
    q: '¿Y si el envío supera los topes o trae algo prohibido?',
    a: 'Si supera los US$ 800, pesa más de 20 kg o trae bienes con IMESI o controlados, sale del régimen de obsequios y puede requerir despachante o un trámite mayor. Si te lo retienen, hay un plan de acción: <a href="/problemas-con-la-aduana-uruguay">qué hacer si tenés problemas con la Aduana</a>.',
    aText:
      'Si supera los US$ 800, pesa más de 20 kg o trae bienes con IMESI o controlados, sale del régimen de obsequios y puede requerir despachante o un trámite mayor. Si te lo retienen, hay un plan de acción en la guía de problemas con la Aduana.',
  },
]

const sources = [
  {
    label: 'Decreto 50/026, art. 3 — exención de todo tributo para envíos con obsequios familiares',
    url: 'https://www.impo.com.uy/bases/decretos/50-2026/3',
  },
  {
    label: 'Ley 20.446, art. 627 — régimen simplificado de envíos postales internacionales',
    url: 'https://www.impo.com.uy/bases/leyes/20446-2025/627',
  },
  {
    label:
      'Correo Uruguayo — «Cómo declarar su compra u obsequio»: sección Obsequio, declaración de valor e imagen del contenido',
    url: 'https://www.correo.com.uy/como-declarar-su-compra-u-obsequio',
  },
  {
    label:
      'Correo Uruguayo — preguntas frecuentes sobre encomiendas internacionales: obsequio familiar, IMESI, 20 kg, varios paquetes',
    url: 'https://www.correo.com.uy/sobre-encomiendas-internacionales',
  },
  {
    label:
      'Correo Uruguayo — «Se recuerda que es obligatoria la declaración de envíos» (todos los envíos salvo cartas)',
    url: 'https://www.correo.com.uy/noticias/-/asset_publisher/x68NfmqmDEKm/content/se-recuerda-que-es-obligatoria-la-declaracion-de-envios-provenientes-del-exterior',
  },
  {
    label: 'Correo Uruguayo — declarar el envío (plataforma Ahíva)',
    url: 'https://ahiva.correo.com.uy/aduanas-web/login',
  },
  {
    label: 'MEF — guía de preguntas frecuentes del régimen de envíos postales',
    url: 'https://www.gub.uy/ministerio-economia-finanzas/comunicacion/noticias/guia-preguntas-frecuentes-sobre-regimen-envios-postales-franquicias',
  },
]

// --- SEO ---
const canonicalUrl = 'https://cambio-uruguay.com/recibir-regalos-del-exterior-uruguay'
const title = 'Recibir regalos del exterior en Uruguay: aduana, obsequios y la carta adentro'
const description =
  'Un regalo de tu pareja, amigo o familiar desde afuera no paga IVA si es un obsequio familiar genuino (Decreto 50/026, art. 3): accesorios, llaveros y caravanas entran sin drama. Cómo se declara como obsequio, por qué podés incluir una carta personal adentro del paquete, y el detalle de la perfumería (IMESI) que sorprende.'

defineOgImageComponent('Cambio', {
  title: 'Recibir regalos del exterior',
  subtitle: 'Obsequios, aduana y la carta adentro del paquete',
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
        'recibir regalos del exterior uruguay, mandar regalo a uruguay desde el exterior, obsequio familiar aduana uruguay, regalo cumpleaños exterior aduana, carta dentro del paquete uruguay, correspondencia aduana uruguay, declarar obsequio correo uruguayo, accesorios caravanas aduana uruguay, perfume cosmetico imesi importar, ahiva obsequio, decreto 50/026 obsequios',
    },
  ],
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: faqs.map(f => ({
          '@type': 'Question',
          name: f.q,
          acceptedAnswer: { '@type': 'Answer', text: f.aText },
        })),
      }),
    },
  ],
}))
</script>

<style scoped>
.eyebrow {
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgb(var(--v-theme-primary));
  margin-bottom: 4px;
}
.section-heading {
  font-size: 1.25rem;
  font-weight: 800;
}
.answer,
.conditions,
.warn-card,
.letter,
.steps,
.checklist,
.faq,
.sources-card {
  border: 1px solid rgba(var(--v-border-color), 0.14);
  border-radius: 14px;
}
.answer-body {
  font-size: 0.9rem;
  line-height: 1.6;
}
.cond-list,
.letter-list,
.check-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
  font-size: 0.92rem;
  line-height: 1.6;
}
.cond-list li,
.letter-list li,
.check-list li {
  display: flex;
  align-items: flex-start;
}
.cond-list li :deep(.v-icon),
.letter-list li :deep(.v-icon),
.check-list li :deep(.v-icon) {
  flex-shrink: 0;
  margin-top: 2px;
}
.step-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.step-list li {
  display: flex;
  gap: 14px;
  align-items: flex-start;
}
.step-num {
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: rgb(var(--v-theme-primary));
  color: rgb(var(--v-theme-on-primary));
  font-weight: 800;
  font-size: 0.85rem;
  display: flex;
  align-items: center;
  justify-content: center;
}
.faq-q {
  font-weight: 700;
  font-size: 0.95rem;
}
.faq-a {
  font-size: 0.9rem;
  line-height: 1.65;
}
.answer-body :deep(a),
.faq-a :deep(a) {
  color: rgb(var(--v-theme-link));
  font-weight: 600;
  text-decoration: none;
}
.answer-body :deep(a):hover,
.faq-a :deep(a):hover {
  text-decoration: underline;
}
.sources-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 0.85rem;
}
</style>
