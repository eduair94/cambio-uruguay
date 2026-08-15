<template>
  <VContainer class="page py-6 py-md-10">
    <!-- Hero -->
    <header class="hero mb-6">
      <p class="eyebrow">Compras y envíos del exterior · Verificado el 15 de agosto de 2026</p>
      <h1 class="page-title mb-3">Recibir regalos del exterior en Uruguay (y una carta adentro)</h1>
      <p class="lede text-medium-emphasis mb-4">
        Tu pareja, un amigo o un familiar te quiere mandar un regalo desde afuera —accesorios,
        llaveros, una caravana— y la duda es la de siempre: ¿me lo va a trabar la aduana? La
        respuesta corta es tranquilizadora. La larga es una lista de detalles que se deciden
        <em>antes</em> de que lo despachen, del otro lado del mundo.
      </p>
      <VAlert type="success" variant="tonal" density="comfortable" icon="mdi-gift-outline">
        <strong>Respuesta corta:</strong> un <strong>obsequio familiar</strong> genuino —de persona
        física a persona física, sin fin comercial y en cantidades razonables— está
        <strong>exento de todo tributo, IVA incluido</strong> (Decreto 50/026, art. 3). Y sí,
        <strong>podés incluir una carta o tarjeta personal adentro del paquete</strong>: la
        correspondencia entre remitente y destinatario está expresamente admitida.
      </VAlert>
      <p class="text-caption text-medium-emphasis mt-3 mb-0">
        <VIcon size="14" class="mr-1">mdi-cart-outline</VIcon>
        ¿No es un regalo sino una compra que te hacés vos?
        <NuxtLink :to="localePath('/franquicia-aduana-uruguay')"
          >Ahí cambia el régimen — mirá si tu compra paga IVA</NuxtLink
        >.
      </p>
    </header>

    <!-- Jump nav -->
    <nav class="toc mb-8" aria-label="Contenido de la página">
      <a v-for="item in toc" :key="item.href" :href="item.href" class="toc-link">
        <VIcon size="16">{{ item.icon }}</VIcon>
        <span>{{ item.label }}</span>
      </a>
    </nav>

    <!-- The three questions from the real-world case -->
    <section class="mb-10" aria-label="Las tres dudas típicas">
      <h2 class="section-heading mb-4">Las tres dudas, respondidas</h2>
      <VRow>
        <VCol v-for="card in answerCards" :key="card.q" cols="12" md="4">
          <VCard variant="flat" class="answer pa-5 h-100">
            <div class="answer-icon" :class="`answer-icon--${card.color}`">
              <VIcon :color="card.color" size="22">{{ card.icon }}</VIcon>
            </div>
            <p class="answer-q">{{ card.q }}</p>
            <p class="answer-body mb-0">
              <strong>{{ card.lead }}</strong> {{ card.body }}
            </p>
          </VCard>
        </VCol>
      </VRow>
    </section>

    <!-- What counts as an obsequio familiar -->
    <section id="obsequio" class="mb-10">
      <h2 class="section-heading mb-3">Qué cuenta como “obsequio familiar”</h2>
      <p class="text-body-2 text-medium-emphasis mb-4">
        No alcanza con decir “es un regalo”. Para que la exención del art. 3 se aplique, el envío
        tiene que cumplir estas condiciones. Si las cumple, no paga <em>ningún</em> tributo.
      </p>
      <VCard variant="flat" class="panel pa-5">
        <ul class="io-list">
          <li v-for="c in conditions" :key="c.lead">
            <VIcon size="18" color="success">mdi-check-circle-outline</VIcon>
            <span class="io-body">
              <strong>{{ c.lead }}</strong> {{ c.text }}
            </span>
          </li>
        </ul>
      </VCard>

      <VRow class="mt-1">
        <VCol cols="12" md="6">
          <VAlert
            type="info"
            variant="tonal"
            density="comfortable"
            class="h-100"
            icon="mdi-account-heart-outline"
          >
            Que sea de tu <strong>pareja</strong> no cambia nada: “familiar” acá se lee en sentido
            amplio —un envío no comercial entre personas físicas—. Lo que importa es que
            <strong>no haya una venta detrás</strong>: nadie te cobró la mercadería.
          </VAlert>
        </VCol>
        <VCol cols="12" md="6">
          <VAlert
            type="warning"
            variant="tonal"
            density="comfortable"
            class="h-100"
            icon="mdi-swap-horizontal"
          >
            Si el obsequio <strong>no califica</strong> —se pasó de los topes, trae algo excluido o
            el remitente es una tienda—, no se parte en dos: el envío <strong>entero</strong> deja
            de estar exento. Si lo mandó una tienda pero entra en tu cupo, sigue siendo franquicia y
            paga <strong>IVA</strong>, con un piso de US$ {{ POSTAL_IVA_MIN_USD }} por envío que ni
            el MEF ni la Aduana mencionan al explicar la franquicia. Y la
            <strong>prestación única</strong> —{{ SIMPLIFIED_RATE_PCT }}% del valor, mínimo US$
            {{ SIMPLIFIED_MIN_USD }}— es una <em>opción</em> que podés tomar, no un destino
            automático.
            <NuxtLink :to="localePath('/herramientas/calculadora-impuestos-importacion')"
              >Calculá cuánto quedaría</NuxtLink
            >.
          </VAlert>
        </VCol>
      </VRow>
    </section>

    <!-- Accessories: are they a problem? -->
    <section class="mb-10">
      <h2 class="section-heading mb-3">Accesorios, llaveros, caravanas: ¿algún problema?</h2>
      <p class="text-body-2 text-medium-emphasis mb-4">
        En general, no. Bijouterie, accesorios de ropa, llaveros y caravanas de fantasía son
        exactamente el tipo de “cositas livianas” que entran sin drama como obsequio. Livianos, de
        bajo valor y de uso personal: el perfil ideal. Pero hay una excepción que sorprende y una
        línea de valor que conviene no cruzar.
      </p>
      <VRow>
        <VCol cols="12" md="6">
          <VCard variant="flat" class="panel warn-card pa-5 h-100">
            <div class="card-head">
              <VIcon color="warning">mdi-spray</VIcon>
              <span class="card-head-title">Cuidado con la perfumería</span>
            </div>
            <p class="text-body-2 mb-0">
              Es la trampa menos intuitiva: el <strong>perfume y el maquillaje</strong> están
              gravados por <strong>IMESI</strong> y quedan <strong>fuera</strong> del régimen de
              obsequios y franquicia. Ojo, no toda la cosmética: el jabón de tocador, el dentífrico,
              el desodorante, el champú, el agua colonia y el protector solar registrado ante el MSP
              <strong>no</strong> pagan IMESI (Decreto 96/990, art. 27), así que no sacan al envío
              del régimen. Y el perfume, además, es un <strong>inflamable</strong> que el correo no
              transporta.
            </p>
          </VCard>
        </VCol>
        <VCol cols="12" md="6">
          <VCard variant="flat" class="panel warn-card pa-5 h-100">
            <div class="card-head">
              <VIcon color="warning">mdi-scale-balance</VIcon>
              <span class="card-head-title">El valor igual se declara</span>
            </div>
            <p class="text-body-2 mb-0">
              Aunque no pagues, hay que declarar el envío y estimar su valor (de mercadería idéntica
              o similar). El obsequio sigue sujeto a los topes: hasta
              <strong>US$ {{ FRANCHISE_ANNUAL_USD }}</strong> acumulados en el año y
              <strong>{{ MAX_WEIGHT_KG }} kg</strong> por envío, y consume uno de tus
              <strong>{{ FRANCHISE_MAX_SHIPMENTS }} envíos</strong>. Para regalos livianos nunca es
              el problema, pero es la regla.
            </p>
          </VCard>
        </VCol>
      </VRow>
    </section>

    <!-- What blocks a parcel -->
    <section id="que-no-mandar" class="mb-10">
      <h2 class="section-heading mb-3">Lo que traba un paquete</h2>
      <p class="text-body-2 text-medium-emphasis mb-5">
        Esta es la parte que conviene leer <strong>antes</strong> de que lo despachen: casi todo lo
        que retiene un regalo se decide en el mostrador del correo del otro país. Están ordenados
        por qué tan grave es: de lo que directamente no puede viajar, a lo que sólo es un dato mal
        puesto. La lista de la Aduana es <em>no taxativa</em> y todos los envíos quedan sujetos a
        control, documental o físico.
      </p>

      <div v-for="group in GIFT_BLOCKER_GROUPS" :key="group.tier" class="blocker-group mb-6">
        <div class="blocker-head" :class="`blocker-head--${group.color}`">
          <VIcon :color="group.color" size="20">{{ group.icon }}</VIcon>
          <div class="blocker-head-text">
            <p class="blocker-title">{{ group.label }}</p>
            <p class="blocker-intro mb-0">{{ group.intro }}</p>
          </div>
        </div>
        <VRow class="mt-0">
          <VCol v-for="item in group.items" :key="item.title" cols="12" md="6">
            <VCard variant="flat" class="panel blocker pa-4 h-100">
              <div class="card-head">
                <VIcon :color="group.color" size="20">{{ item.icon }}</VIcon>
                <span class="card-head-title">{{ item.title }}</span>
              </div>
              <p class="text-body-2 mb-2">{{ item.effect }}</p>
              <p class="blocker-fix mb-0">
                <VIcon size="15" color="success">mdi-arrow-right-bottom</VIcon>
                <span class="io-body">{{ item.fix }}</span>
              </p>
            </VCard>
          </VCol>
        </VRow>
      </div>

      <VAlert type="info" variant="tonal" density="comfortable" icon="mdi-airplane-takeoff">
        ¿Viene alguien de visita? Lo que trae una persona en la valija no es un envío postal: se
        rige por la
        <NuxtLink :to="localePath('/franquicia-viajero-uruguay')">franquicia del viajero</NuxtLink>,
        que es otro régimen, con otros topes y sin consumir tus envíos del año.
      </VAlert>
    </section>

    <!-- How the customs form must be filled -->
    <section id="declaracion" class="mb-10">
      <h2 class="section-heading mb-3">Cómo tiene que venir declarado el paquete</h2>
      <p class="text-body-2 text-medium-emphasis mb-4">
        El formulario CN22 (o CN23 para paquetes grandes) lo llena quien despacha, en origen, y es
        una <strong>declaración jurada</strong>. Es el documento que mira la Aduana antes de decidir
        si el envío pasa o va a verificación. Campo por campo:
      </p>
      <VRow>
        <VCol v-for="f in CUSTOMS_FORM_FIELDS" :key="f.field" cols="12" md="6">
          <VCard variant="flat" class="panel field-card pa-4 h-100">
            <p class="field-name">{{ f.field }}</p>
            <p class="text-body-2 mb-2">{{ f.how }}</p>
            <p v-if="f.bad" class="ex ex--bad mb-2">
              <VIcon size="15" color="error">mdi-close-circle-outline</VIcon>
              <span class="io-body">{{ f.bad }}</span>
            </p>
            <p v-if="f.good" class="ex ex--good mb-0">
              <VIcon size="15" color="success">mdi-check-circle-outline</VIcon>
              <span class="io-body">{{ f.good }}</span>
            </p>
          </VCard>
        </VCol>
      </VRow>
    </section>

    <!-- Sender instructions, ready to send -->
    <section id="remitente" class="mb-10">
      <h2 class="section-heading mb-3">Pasale esto a quien te lo manda</h2>
      <p class="text-body-2 text-medium-emphasis mb-4">
        Todo lo anterior, en diez líneas y en el idioma de quien va al correo del otro país. Copialo
        y mandáselo antes de que lo despache: después de despachado ya no se corrige.
      </p>
      <VCard variant="flat" class="panel instructions pa-4 pa-sm-5">
        <div class="instructions-bar">
          <VBtnToggle
            v-model="senderLang"
            mandatory
            density="comfortable"
            color="primary"
            variant="outlined"
            divided
          >
            <VBtn value="es" size="small" class="font-weight-bold">Español</VBtn>
            <VBtn value="en" size="small" class="font-weight-bold">English</VBtn>
          </VBtnToggle>
          <div class="instructions-actions">
            <VBtn
              size="small"
              variant="tonal"
              color="primary"
              :prepend-icon="copied ? 'mdi-check' : 'mdi-content-copy'"
              class="font-weight-bold"
              @click="copyInstructions"
            >
              {{ copied ? 'Copiado' : 'Copiar' }}
            </VBtn>
            <SendMessage
              :text="senderInstructions"
              :actions="sendActions"
              trigger-label="Enviar"
              dialog-title="Mandarle las instrucciones"
              intro="Elegí por dónde se lo mandás a quien despacha el regalo."
              trigger-variant="flat"
              size="small"
            />
          </div>
        </div>
        <!-- En escritorio el bloque scrollea: una región scrolleable tiene que ser
             alcanzable por teclado (WCAG 2.1.1). -->
        <pre
          class="instructions-text"
          tabindex="0"
          role="region"
          aria-label="Instrucciones para quien despacha el regalo"
          >{{ senderInstructions }}</pre
        >
      </VCard>
    </section>

    <!-- The letter -->
    <section id="carta" class="mb-10">
      <h2 class="section-heading mb-3">La carta adentro del paquete: ¿es permitido?</h2>
      <p class="text-body-2 text-medium-emphasis mb-4">
        Sí. Meter una <strong>carta o tarjeta personal</strong> dentro del paquete, junto con los
        regalos, es lo más común del mundo y no genera ningún problema aduanero.
      </p>
      <VCard variant="flat" class="panel pa-5">
        <ul class="io-list">
          <li v-for="l in letterPoints" :key="l.lead">
            <VIcon size="18" color="primary">{{ l.icon }}</VIcon>
            <span class="io-body">
              <strong>{{ l.lead }}</strong> {{ l.text }}
            </span>
          </li>
        </ul>
      </VCard>
    </section>

    <!-- How to declare a gift -->
    <section id="tramite" class="mb-10">
      <h2 class="section-heading mb-3">Cómo se declara un obsequio (paso a paso)</h2>
      <p class="text-body-2 text-medium-emphasis mb-4">
        El regalo lo recibís vos, y el trámite de declaración —cuando llega por Correo Uruguayo— lo
        hacés vos como destinatario. La diferencia con una compra es que
        <strong>no presentás factura</strong> ni medio de pago.
      </p>
      <VCard variant="flat" class="panel pa-5">
        <ol class="step-list">
          <li v-for="(s, i) in steps" :key="s.title">
            <span class="step-num">{{ i + 1 }}</span>
            <div class="step-body">
              <p class="font-weight-bold mb-2">{{ s.title }}</p>
              <p class="text-body-2 text-medium-emphasis mb-0">
                {{ s.text }}
                <a
                  v-if="s.link"
                  :href="s.link.url"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="step-link"
                  >{{ s.link.label }}
                  <VIcon size="13">mdi-open-in-new</VIcon>
                </a>
              </p>
            </div>
          </li>
        </ol>
      </VCard>
      <p class="text-caption text-medium-emphasis mt-3 mb-0">
        <VIcon size="14" class="mr-1">mdi-file-sign</VIcon>
        Si el paquete llega por un courier privado (DHL, UPS, Tiendamia…) el trámite lo hace el
        courier con tus datos, pero el régimen es el mismo.
        <NuxtLink :to="localePath('/declarar-compra-exterior-uruguay')"
          >Ver el paso a paso completo por cada vía</NuxtLink
        >.
      </p>
    </section>

    <!-- If it gets held -->
    <section id="retenido" class="mb-10">
      <h2 class="section-heading mb-3">Si igual te lo retienen</h2>
      <p class="text-body-2 text-medium-emphasis mb-4">
        Retención no es decomiso: la mayoría se destraba presentando lo que falta. Lo que sí corre
        es el reloj, y los costos de depósito los pagás vos.
      </p>
      <VRow>
        <VCol cols="12" md="6">
          <VCard variant="flat" class="panel pa-5 h-100">
            <div class="card-head">
              <VIcon color="primary">mdi-clipboard-list-outline</VIcon>
              <span class="card-head-title">Qué llevar a la verificación</span>
            </div>
            <ul class="io-list io-list--tight">
              <li v-for="d in retainedDocs" :key="d">
                <VIcon size="17" color="primary">mdi-file-outline</VIcon>
                <span class="io-body">{{ d }}</span>
              </li>
            </ul>
            <p class="text-caption text-medium-emphasis mt-3 mb-0">
              Todo en papel. Si va otra persona por vos, además carta poder y copia de tu cédula.
            </p>
          </VCard>
        </VCol>
        <VCol cols="12" md="6">
          <VCard variant="flat" class="panel pa-5 h-100">
            <div class="card-head">
              <VIcon color="primary">mdi-timer-sand</VIcon>
              <span class="card-head-title">Los plazos que no se negocian</span>
            </div>
            <ul class="io-list io-list--tight">
              <li v-for="d in retainedDeadlines" :key="d.lead">
                <VIcon size="17" color="warning">mdi-calendar-alert</VIcon>
                <span class="io-body">
                  <strong>{{ d.lead }}</strong> {{ d.text }}
                </span>
              </li>
            </ul>
          </VCard>
        </VCol>
      </VRow>
      <VAlert
        type="info"
        variant="tonal"
        density="comfortable"
        class="mt-4"
        icon="mdi-account-tie-outline"
      >
        La verificación de envíos retenidos se atiende <strong>con agenda previa</strong>. Si no
        podés ir, el Correo ofrece una <strong>gestoría</strong> que hace la verificación ocular y
        presenta la documentación por vos, por un cargo fijo y con un plazo de entre tres y seis
        días hábiles desde que el legajo está completo.
        <NuxtLink :to="localePath('/problemas-con-la-aduana-uruguay')"
          >Diagnóstico completo si tu paquete quedó trabado</NuxtLink
        >.
      </VAlert>
    </section>

    <!-- FAQ -->
    <section id="faq" class="mb-10">
      <h2 class="section-heading mb-3">Preguntas frecuentes</h2>
      <VCard variant="flat" class="panel faq pa-1 pa-sm-2">
        <VExpansionPanels variant="accordion" class="faq-panels">
          <VExpansionPanel v-for="f in faqs" :key="f.q">
            <VExpansionPanelTitle class="faq-q">{{ f.q }}</VExpansionPanelTitle>
            <VExpansionPanelText eager>
              <!-- Catálogo estático controlado por el repo; nunca contiene input del usuario. -->
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
        class="mt-3 wrap-btn"
      >
        Ver todas las preguntas de aduana, productos y viajeros
        <VIcon end>mdi-arrow-right</VIcon>
      </VBtn>
    </section>

    <!-- Related -->
    <section class="mb-10" aria-label="Guías relacionadas">
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

    <!-- Sources -->
    <section id="fuentes" class="mb-6">
      <VCard variant="flat" class="panel sources-card pa-5">
        <h2 class="sources-title">
          <VIcon start size="small" color="primary">mdi-link-variant</VIcon>
          De dónde sale cada dato
        </h2>
        <p class="text-caption text-medium-emphasis mb-4">
          Normativa y procedimientos contrastados con las fuentes primarias el
          {{ verifiedLabel }}. Las cifras del régimen se actualizan solas desde el seguimiento de la
          norma; los trámites de los operadores pueden cambiar sin aviso.
        </p>
        <ul class="sources-list">
          <li v-for="s in GIFT_SOURCES" :key="s.url">
            <span class="source-org">{{ s.org }}</span>
            <a :href="s.url" target="_blank" rel="noopener noreferrer">
              {{ s.label }}
              <VIcon size="13">mdi-open-in-new</VIcon>
            </a>
          </li>
        </ul>
      </VCard>
    </section>

    <VAlert
      type="warning"
      variant="tonal"
      density="comfortable"
      icon="mdi-alert-outline"
      class="mb-6"
    >
      Información <strong>de referencia</strong>, no asesoramiento profesional. La Aduana resuelve
      caso a caso y evalúa cantidad, naturaleza y finalidad de cada envío. Ante la duda, verificá
      con la Dirección Nacional de Aduanas antes de que te lo manden.
    </VAlert>

    <div class="d-flex justify-center">
      <ShareButtons text="Recibir regalos del exterior en Uruguay sin que los trabe la aduana" />
    </div>
  </VContainer>
</template>

<script setup lang="ts">
import {
  FRANCHISE_ANNUAL_USD,
  FRANCHISE_MAX_SHIPMENTS,
  MAX_WEIGHT_KG,
  POSTAL_IVA_MIN_USD,
  SIMPLIFIED_MIN_USD,
  SIMPLIFIED_RATE_PCT,
} from '~/utils/importRules'
import {
  buildSenderInstructions,
  CUSTOMS_FORM_FIELDS,
  GIFT_BLOCKER_GROUPS,
  GIFT_RULES_VERIFIED_AT,
  GIFT_SOURCES,
  type SenderInstructionsLang,
} from '~/utils/giftImports'
import type { SendAction } from '~/utils/messageChannels'

const localePath = useLocalePath()

const verifiedLabel = new Date(`${GIFT_RULES_VERIFIED_AT}T12:00:00Z`).toLocaleDateString('es-UY', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})

const toc = [
  { label: 'Qué cuenta como obsequio', href: '#obsequio', icon: 'mdi-gift-outline' },
  { label: 'Lo que traba el paquete', href: '#que-no-mandar', icon: 'mdi-alert-octagon-outline' },
  {
    label: 'Cómo declararlo en origen',
    href: '#declaracion',
    icon: 'mdi-file-document-edit-outline',
  },
  { label: 'Instrucciones para el remitente', href: '#remitente', icon: 'mdi-send-outline' },
  { label: 'La carta adentro', href: '#carta', icon: 'mdi-email-outline' },
  { label: 'El trámite acá', href: '#tramite', icon: 'mdi-clipboard-check-outline' },
  { label: 'Si te lo retienen', href: '#retenido', icon: 'mdi-package-variant-closed-remove' },
  { label: 'Preguntas frecuentes', href: '#faq', icon: 'mdi-comment-question-outline' },
  { label: 'Fuentes', href: '#fuentes', icon: 'mdi-link-variant' },
]

const answerCards = [
  {
    icon: 'mdi-diamond-stone',
    color: 'success',
    q: '¿Me hacen problema por accesorios y caravanas?',
    lead: 'En general, no.',
    body: 'Bijouterie, accesorios y llaveros son livianos, de bajo valor y de uso personal: entran como obsequio familiar, exentos de IVA y de todo tributo. La excepción a esquivar es el perfume y el maquillaje, gravados por IMESI.',
  },
  {
    icon: 'mdi-email-heart-outline',
    color: 'primary',
    q: '¿Puedo recibir una carta adentro del paquete?',
    lead: 'Sí.',
    body: 'La correspondencia entre remitente y destinatario es la excepción expresa de las prohibiciones postales. Metida entre los regalos no cambia nada: se declara el paquete, no la carta.',
  },
  {
    icon: 'mdi-check-decagram-outline',
    color: 'success',
    q: '¿Es permitido, entonces?',
    lead: 'Sí,',
    body: `mientras sea un envío no comercial entre personas físicas, en cantidades razonables y para tu uso personal. Igual usa uno de tus ${FRANCHISE_MAX_SHIPMENTS} envíos del año y se declara su valor.`,
  },
]

const conditions = [
  {
    lead: 'No comercial entre las partes:',
    text: 'nadie te vendió ni te cobró la mercadería.',
  },
  {
    lead: 'Remitido y consignado por personas físicas:',
    text: 'de una persona a otra, no de una empresa a un cliente.',
  },
  {
    lead: 'Cantidades razonables,',
    text: 'mercadería nueva o usada. Diez unidades del mismo accesorio ya no lo son.',
  },
  {
    lead: 'Para uso o consumo personal',
    text: 'del destinatario, sin fines comerciales.',
  },
  {
    lead: 'Destinatario mayor de edad',
    text: 'con documento de identidad uruguayo. Si el regalo es para un menor, va a nombre de un adulto.',
  },
  {
    lead: `Dentro de los topes: hasta US$ ${FRANCHISE_ANNUAL_USD} acumulados en el año civil y ${MAX_WEIGHT_KG} kg por envío,`,
    text: `y consume uno de tus ${FRANCHISE_MAX_SHIPMENTS} envíos con franquicia.`,
  },
  {
    lead: 'Sin bienes gravados por IMESI',
    text: '(perfume, maquillaje, alcohol, tabaco, lubricantes) ni mercadería prohibida o controlada. La higiene común —jabón, dentífrico, desodorante, champú— no está gravada y no molesta.',
  },
]

const letterPoints = [
  {
    icon: 'mdi-email-outline',
    lead: 'La correspondencia personal está expresamente admitida:',
    text: 'el Convenio Postal Universal sólo prohíbe la correspondencia intercambiada entre personas distintas del remitente y el destinatario. La carta que te escribe quien te manda el regalo es justamente el caso permitido, y no tiene valor comercial ni paga nada.',
  },
  {
    icon: 'mdi-package-variant-closed',
    lead: 'Va adentro y no cambia el trámite:',
    text: 'lo que se declara es el paquete, como obsequio; la carta viaja como parte del contenido personal.',
  },
  {
    icon: 'mdi-alert-circle-outline',
    lead: 'El único “no”:',
    text: 'que ese papel sea en realidad una factura, un ticket o un packing slip que contradiga la declaración de obsequio. Una carta de amor no es eso —mandala tranquila—.',
  },
]

const steps = [
  {
    title: 'Registrate una vez en la Aduana (y mirá tu saldo)',
    text: 'El registro de identidad digital para envíos postales se hace una sola vez, con tu identidad digital de nivel intermedio o avanzado. Al día de hoy es voluntario. En los obsequios no te piden datos del medio de pago, porque no hubo compra. En el mismo sitio consultás cuántos envíos y cuántos dólares te quedan.',
    link: {
      label: 'Registro y consulta de franquicias en aduanas.gub.uy',
      url: 'https://www.aduanas.gub.uy/innovaportal/v/28224/1/innova.front/',
    },
  },
  {
    title: 'Esperá el aviso de llegada (o adelantate)',
    text: 'El Correo te notifica cuando el envío ingresa. También podés declararlo apenas tenés el número de seguimiento, antes de que llegue: reduce costos y demoras.',
  },
  {
    title: 'Entrá a Ahíva, la plataforma del Correo Uruguayo',
    text: 'Es donde el destinatario declara los envíos que llegan por correo internacional. Ingresás el tracking (dos letras, nueve números y dos letras) y tus datos idénticos a como figuran en la cédula.',
    link: { label: 'ahiva.correo.com.uy', url: 'https://ahiva.correo.com.uy/aduanas-web/login' },
  },
  {
    title: 'Elegí la opción “Obsequio”',
    text: 'En lugar de factura hacés una declaración de valor —el valor de mercadería idéntica o similar— y podés adjuntar una imagen del contenido. Cuanto más precisa la descripción, menos chance de verificación física.',
  },
  {
    title: 'No te van a pedir el medio de pago',
    text: 'En los obsequios no se pide tarjeta ni comprobante de pago, justamente porque no hubo compra. En las compras sí, y tiene que coincidir el titular.',
  },
  {
    title: 'Retirá el paquete',
    text: 'Si es un obsequio genuino dentro de los topes, no pagás tributos; sólo puede aplicar un cargo administrativo del operador postal.',
  },
]

const retainedDocs = [
  'Cédula de identidad vigente y en buen estado.',
  'La guía del operador postal o el número de seguimiento.',
  'Declaración de valor del contenido, que en un obsequio reemplaza a la factura.',
  'Fotos del contenido o del envío, si las tenés: ayudan a describirlo.',
  'Certificados de otros organismos —el de la URSEC, o la autorización del MSP— cuando la mercadería los exige. Van en papel.',
]

const retainedDeadlines = [
  {
    lead: '30 días desde el ingreso del envío al país:',
    text: 'sin pagar los tributos que correspondan, la mercadería cae en abandono no infraccional.',
  },
  {
    lead: '90 días sin retirarlo del depósito:',
    text: 'también se considera abandonado, aun con el trámite hecho.',
  },
  {
    lead: 'Depósito y cargos del operador:',
    text: 'corren mientras el envío está retenido y los paga el destinatario.',
  },
  {
    lead: 'Devolución al remitente:',
    text: 'es posible, a tu costo, siempre que no haya habido infracción aduanera.',
  },
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
    a: 'Sí. El Convenio Postal Universal sólo prohíbe la correspondencia intercambiada entre personas <em>distintas</em> del remitente y el destinatario: la carta que te escribe quien te manda el regalo es exactamente el caso admitido. Metida entre los regalos no cambia el trámite: se declara el paquete como obsequio y la carta viaja como parte del contenido. El único caso a evitar es que ese papel sea en realidad una <strong>factura o documento comercial</strong> que contradiga la declaración de obsequio.',
    aText:
      'Sí. El Convenio Postal Universal sólo prohíbe la correspondencia intercambiada entre personas distintas del remitente y el destinatario, así que la carta que te escribe quien te manda el regalo está admitida. Metida entre los regalos no cambia el trámite: se declara el paquete como obsequio y la carta viaja como parte del contenido. Solo hay que evitar que ese papel sea en realidad una factura o documento comercial que contradiga la declaración de obsequio.',
  },
  {
    q: '¿Son un problema los accesorios, llaveros o caravanas?',
    a: 'No: son livianos, de bajo valor y de uso personal, el perfil ideal para un obsequio. La excepción que sorprende es el <strong>perfume y el maquillaje</strong>, gravados por IMESI y fuera del régimen. No toda la cosmética, ojo: el jabón de tocador, el dentífrico, el desodorante, el champú, el agua colonia y el protector solar registrado ante el MSP <strong>no</strong> pagan IMESI (Decreto 96/990, art. 27) y no sacan al envío del régimen. La bijouterie de fantasía no da problema; la joyería de oro o plata entra igual, pero se inspecciona más y conviene declararla con su valor real.',
    aText:
      'No: son livianos, de bajo valor y de uso personal, el perfil ideal para un obsequio. La excepción que sorprende es el perfume y el maquillaje, gravados por IMESI y fuera del régimen. No toda la cosmética: el jabón de tocador, el dentífrico, el desodorante, el champú, el agua colonia y el protector solar registrado ante el MSP no pagan IMESI, según el artículo 27 del Decreto 96/990, y no sacan al envío del régimen. La bijouterie de fantasía no da problema; la joyería de oro o plata entra igual pero se inspecciona más y conviene declararla con su valor real.',
  },
  {
    q: '¿Puede venir un regalo con batería, como auriculares o un smartwatch?',
    a: 'Por <strong>correo postal, no</strong>: el Correo Uruguayo no admite baterías de litio en envíos internacionales, y ahí entran auriculares, parlantes, relojes, celulares y power banks. No es una prohibición aduanera —es restricción de transporte aéreo y política del operador—, así que por <strong>courier privado sí</strong>, con su propio protocolo de mercancías peligrosas. El otro filtro es la <strong>URSEC</strong>, y muerde menos de lo que se cree: <strong>no interviene</strong> en los dispositivos que funcionan únicamente con Wi-Fi o Bluetooth en 2,4 y 5,8 GHz (Resoluciones 275/021 y 297/021), así que un auricular, un mouse o un smartwatch no necesitan certificado. Sí lo necesitan el celular, el router con módem celular, el GPS, el handy y la cámara con conexión celular.',
    aText:
      'Por correo postal no: el Correo Uruguayo no admite baterías de litio en envíos internacionales, lo que incluye auriculares, parlantes, relojes, celulares y power banks. No es prohibición aduanera sino restricción de transporte aéreo y política del operador, así que por courier privado sí. Con la URSEC, la regla es que no interviene en dispositivos que funcionan únicamente con Wi-Fi o Bluetooth en 2,4 y 5,8 GHz, según las Resoluciones 275/021 y 297/021: un auricular, un mouse o un smartwatch no necesitan certificado. Sí lo necesitan el celular, el router con módem celular, el GPS, el handy y la cámara con conexión celular.',
  },
  {
    q: 'Si es un regalo, ¿por qué igual tengo que declararlo?',
    a: 'Porque todo envío internacional —salvo la correspondencia— se declara ante la Aduana, aunque no pague. Al declarar un obsequio elegís la opción “Obsequio” y hacés una declaración de valor en lugar de presentar factura. La exención es del <em>pago</em>, no de la <em>declaración</em>. Y la declaración es jurada: describir mal el contenido o subvaluarlo es lo que dispara la verificación.',
    aText:
      'Porque todo envío internacional, salvo la correspondencia, se declara ante la Aduana, aunque no pague. Al declarar un obsequio se elige la opción Obsequio y se hace una declaración de valor en lugar de presentar factura. La exención es del pago, no de la declaración, y la declaración es jurada.',
  },
  {
    q: '¿Cuántos regalos me pueden mandar por año?',
    a: `El régimen postal permite hasta <strong>${FRANCHISE_MAX_SHIPMENTS} envíos</strong> con franquicia por año civil, con hasta <strong>US$ ${FRANCHISE_ANNUAL_USD}</strong> acumulados y <strong>${MAX_WEIGHT_KG} kg</strong> por envío. Cada obsequio consume uno de esos usos, así que para regalos livianos el límite real es la cantidad de envíos, no el valor. Si son varias cosas, conviene <strong>un solo paquete</strong>: dos paquetes son dos envíos. <strong>Los libros son la excepción</strong>: el Decreto 50/026, art. 4, los deja fuera del tope en dólares —sobre los 3 envíos su texto no dice nada—, y la RG DNA 11/2026, num. 26, los exceptúa de los dos límites a la vez, igual que a los medicamentos de uso personal cuando tienen autorización del MSP. Conviene saber que vas a tener que pelearla: una noticia posterior de la propia Aduana dice, sin mencionar la excepción, que todos los envíos consumen cupo.`,
    aText: `El régimen postal permite hasta ${FRANCHISE_MAX_SHIPMENTS} envíos con franquicia por año civil, con hasta US$ ${FRANCHISE_ANNUAL_USD} acumulados y ${MAX_WEIGHT_KG} kg por envío. Cada obsequio consume uno de esos usos. Si son varias cosas conviene un solo paquete, porque dos paquetes son dos envíos. Los libros son la excepción: el artículo 4 del Decreto 50/026 los deja fuera del tope en dólares, sin decir nada sobre los 3 envíos, y el numeral 26 de la RG DNA 11/2026 los exceptúa de los dos límites a la vez, igual que a los medicamentos de uso personal con autorización del MSP. Hay que saber que una noticia posterior de la propia Aduana dice, sin mencionar la excepción, que todos los envíos consumen cupo.`,
  },
  {
    q: '¿Le puedo pedir que declare menos valor para que no me cobren?',
    a: 'No conviene, y además no hace falta: el obsequio genuino <strong>no paga tributos</strong>, así que no hay nada que ahorrar. Lo que sí hace subvaluar es despertar la duda razonable: la Aduana puede <strong>ajustar el valor</strong> cuando lo declarado no cierra con la mercadería, y ahí el envío pasa a verificación con costos y demoras.',
    aText:
      'No conviene y no hace falta: el obsequio genuino no paga tributos. Subvaluar despierta la duda razonable, la Aduana puede ajustar el valor cuando lo declarado no cierra con la mercadería, y el envío pasa a verificación con costos y demoras.',
  },
  {
    q: 'El regalo es para mi hijo. ¿Puede venir a su nombre?',
    a: 'Mejor no. La franquicia exige un destinatario <strong>persona física mayor de edad</strong> con documento de identidad uruguayo, y un menor tampoco puede hacer el trámite ni retirar el envío. Que venga a nombre de un adulto de la casa; el regalo sigue siendo del chiquilín.',
    aText:
      'Mejor no. La franquicia exige un destinatario persona física mayor de edad con documento de identidad uruguayo, y un menor no puede hacer el trámite ni retirar el envío. Conviene que venga a nombre de un adulto.',
  },
  {
    q: '¿Y si el envío supera los topes o trae algo prohibido?',
    a: `Si se pasa de US$ ${FRANCHISE_ANNUAL_USD} acumulados, de ${MAX_WEIGHT_KG} kg o de los ${FRANCHISE_MAX_SHIPMENTS} envíos, deja de tener franquicia y el envío <strong>entero</strong> queda sin exención. Ahí podés <em>optar</em> por la prestación única —${SIMPLIFIED_RATE_PCT}% del valor con un mínimo de US$ ${SIMPLIFIED_MIN_USD} por envío—, que la ley plantea como una opción y no como un destino automático; la alternativa es liquidar por el régimen general. Si trae bienes gravados por IMESI queda fuera del régimen postal en cualquier caso, y si trae mercadería controlada sin su certificado, también. Si te lo retienen, hay un plan de acción: <a href="/problemas-con-la-aduana-uruguay">qué hacer si tenés problemas con la Aduana</a>.`,
    aText: `Si se pasa de los topes deja de tener franquicia y el envío entero queda sin exención. Ahí podés optar por la prestación única, ${SIMPLIFIED_RATE_PCT}% del valor con un mínimo de US$ ${SIMPLIFIED_MIN_USD} por envío, que la ley plantea como una opción y no como un destino automático; la alternativa es liquidar por el régimen general. Si trae bienes gravados por IMESI queda fuera del régimen postal, y lo mismo si trae mercadería controlada sin su certificado. Si te lo retienen, hay una guía de problemas con la Aduana.`,
  },
  {
    q: '¿Cuánto puede demorar si queda retenido?',
    a: 'Depende de qué falte. La verificación de envíos retenidos se atiende con <strong>agenda previa</strong>, y la gestoría del Correo —que hace la verificación ocular y presenta la documentación por vos— maneja plazos de entre <strong>tres y seis días hábiles</strong> desde que el legajo está completo. Lo que no espera son los plazos de abandono: <strong>30 días</strong> desde que el envío ingresó al país sin pagar los tributos, o <strong>90 días</strong> sin retirarlo del depósito.',
    aText:
      'Depende de qué falte. La verificación de envíos retenidos se atiende con agenda previa y la gestoría del Correo maneja plazos de entre tres y seis días hábiles desde que el legajo está completo. Los plazos de abandono son 30 días desde que el envío ingresó al país sin pagar los tributos, o 90 días sin retirarlo del depósito.',
  },
]

const relatedLinks = [
  {
    title: 'Franquicia e IVA',
    text: 'Qué régimen te toca y cuánto paga cada envío.',
    to: '/franquicia-aduana-uruguay',
    icon: 'mdi-package-variant-closed-check',
  },
  {
    title: 'Declarar el envío',
    text: 'Paso a paso por correo, courier, Amazon o Temu.',
    to: '/declarar-compra-exterior-uruguay',
    icon: 'mdi-file-document-edit-outline',
  },
  {
    title: 'Paquete retenido',
    text: 'Diagnóstico por síntoma y pasos para destrabarlo.',
    to: '/problemas-con-la-aduana-uruguay',
    icon: 'mdi-clipboard-alert-outline',
  },
  {
    title: 'Franquicia del viajero',
    text: 'Si alguien lo trae en la valija, es otro régimen.',
    to: '/franquicia-viajero-uruguay',
    icon: 'mdi-bag-suitcase-outline',
  },
]

// --- Instrucciones para el remitente ---
const senderLang = ref<SenderInstructionsLang>('es')
const copied = ref(false)

const senderInstructions = computed(() =>
  buildSenderInstructions({
    lang: senderLang.value,
    franchiseAnnualUsd: FRANCHISE_ANNUAL_USD,
    maxShipments: FRANCHISE_MAX_SHIPMENTS,
    maxWeightKg: MAX_WEIGHT_KG,
  })
)

watch(senderLang, () => {
  copied.value = false
})

async function copyInstructions() {
  try {
    await navigator.clipboard.writeText(senderInstructions.value)
    copied.value = true
    setTimeout(() => (copied.value = false), 2000)
  } catch {
    copied.value = false
  }
}

// El destinatario del texto es una persona concreta del exterior: el lector elige el canal.
const sendActions: SendAction[] = [
  {
    channel: 'whatsapp',
    label: 'WhatsApp',
    icon: 'mdi-whatsapp',
    color: 'success',
    note: 'Se abre WhatsApp con el texto listo para elegir el contacto.',
  },
  {
    channel: 'telegram',
    label: 'Telegram',
    icon: 'mdi-send-circle-outline',
    color: 'info',
  },
  {
    channel: 'email',
    label: 'Correo electrónico',
    to: '',
    subject: 'Cómo mandarme el regalo a Uruguay sin que lo trabe la aduana',
    icon: 'mdi-email-outline',
    note: 'Se abre tu cliente de correo con el texto en el cuerpo.',
  },
]

// --- SEO ---
const canonicalUrl = 'https://cambio-uruguay.com/recibir-regalos-del-exterior-uruguay'
const title = 'Recibir regalos del exterior en Uruguay: aduana, obsequios y la carta adentro'
const description =
  'Un regalo de tu pareja, amigo o familiar desde afuera no paga IVA si es un obsequio familiar genuino (Decreto 50/026, art. 3). Qué puede hacer que te lo retengan, cómo tiene que venir declarado el CN22, qué no puede ir adentro, por qué podés incluir una carta personal y qué hacer si igual queda retenido.'

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
        'recibir regalos del exterior uruguay, mandar regalo a uruguay desde el exterior, obsequio familiar aduana uruguay, regalo cumpleaños exterior aduana, carta dentro del paquete uruguay, correspondencia aduana uruguay, declarar obsequio correo uruguayo, cn22 regalo uruguay, paquete retenido aduana uruguay, baterias de litio correo uruguay, accesorios caravanas aduana uruguay, perfume cosmetico imesi importar, ahiva obsequio, decreto 50/026 obsequios',
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
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'HowTo',
        name: 'Cómo declarar y retirar un obsequio del exterior en Uruguay',
        description:
          'Pasos para declarar como obsequio familiar un envío postal internacional recibido en Uruguay y retirarlo sin pagar tributos.',
        totalTime: 'PT20M',
        step: steps.map((s, i) => ({
          '@type': 'HowToStep',
          position: i + 1,
          name: s.title,
          text: s.text,
        })),
      }),
    },
  ],
}))
</script>

<style scoped>
/* Sólo los pasos del ramp de DESIGN.md: label 0.75rem, body-2 0.875rem (el token de Vuetify),
   body 1rem, title 1.25rem, y los dos clamps documentados para display y headline. */
.page {
  --t-label: 0.75rem;
  --t-small: 0.875rem;
  --t-body: 1rem;
  --t-title: 1.25rem;
}

/* Todo el espaciado vertical de esta página está declarado acá o en una utilidad
   `mb-*`; ninguno viene del margen por defecto del navegador. Vuetify 4 no resetea
   los bloques de texto, así que su `margin-block: 1em` gana por colapso a cualquier
   gap más chico que pidamos: el cabezal de cada bloque terminaba con el título 16px
   por debajo de su icono y el intro a 14px cuando pedía 2. Ver DESIGN.md,
   “The Text Block Owns Its Top Margin Rule”. */
.page :is(p, h1, h2, h3, ul, ol, pre) {
  margin-top: 0;
}
.eyebrow {
  font-size: var(--t-label);
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgb(var(--v-theme-primary));
  margin-bottom: 10px;
}
.page-title {
  font-size: clamp(1.55rem, 4.4vw, 2.5rem);
  font-weight: 800;
  line-height: 1.1;
  letter-spacing: -0.02em;
}
.lede {
  font-size: var(--t-body);
  line-height: 1.6;
  max-width: 62ch;
}
/* El índice salta a la <section>, no al <h2>: el margen de scroll va en el ancla real. */
.page section[id] {
  scroll-margin-top: 84px;
}
.section-heading {
  font-size: clamp(1.35rem, 3vw, 1.75rem);
  font-weight: 800;
  line-height: 1.2;
  letter-spacing: -0.01em;
  scroll-margin-top: 84px;
}

/* Índice */
.toc {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.toc-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 34px;
  padding: 4px 12px;
  border: 1px solid rgba(var(--v-border-color), 0.18);
  border-radius: 999px;
  font-size: var(--t-small);
  font-weight: 600;
  color: inherit;
  text-decoration: none;
  transition:
    border-color 0.15s ease,
    background-color 0.15s ease;
}
.toc-link:hover,
.toc-link:focus-visible {
  border-color: rgba(var(--v-theme-primary), 0.6);
  background: rgba(var(--v-theme-primary), 0.06);
}

/* Superficies */
.panel {
  border: 1px solid rgba(var(--v-border-color), 0.14);
  border-radius: 12px;
}
.answer {
  border: 1px solid rgba(var(--v-border-color), 0.14);
  border-radius: 12px;
  display: flex;
  flex-direction: column;
}
.answer-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 12px;
  margin-bottom: 12px;
}
.answer-icon--success {
  background: rgba(var(--v-theme-success), 0.12);
}
.answer-icon--primary {
  background: rgba(var(--v-theme-primary), 0.12);
}
.answer-q {
  font-size: var(--t-body);
  font-weight: 700;
  line-height: 1.35;
  margin-bottom: 8px;
}
.answer-body {
  font-size: var(--t-small);
  line-height: 1.6;
}

/* Listas con icono: el <li> es grid, nunca flex sobre contenido en línea —
   un flex container convierte cada <strong> en su propio ítem y parte el texto. */
.io-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
  font-size: var(--t-small);
  line-height: 1.6;
}
.io-list--tight {
  gap: 10px;
  font-size: var(--t-small);
}
.io-list li {
  display: grid;
  grid-template-columns: 20px minmax(0, 1fr);
  gap: 10px;
  align-items: start;
}
.io-list li :deep(.v-icon) {
  margin-top: 3px;
}
.io-body {
  min-width: 0;
  overflow-wrap: anywhere;
}

/* Cabezal de tarjeta */
.card-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}
.card-head-title {
  font-size: var(--t-body);
  font-weight: 700;
  line-height: 1.3;
  min-width: 0;
}
.warn-card {
  border-color: rgba(var(--v-theme-warning), 0.35);
}

/* Bloqueos */
.blocker-head {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px 14px;
  border-radius: 12px;
  margin-bottom: 4px;
}
.blocker-head--error {
  background: rgba(var(--v-theme-error), 0.09);
}
.blocker-head--warning {
  background: rgba(var(--v-theme-warning), 0.11);
}
.blocker-head--info {
  background: rgba(var(--v-theme-info), 0.1);
}
.blocker-head--primary {
  background: rgba(var(--v-theme-primary), 0.09);
}
.blocker-head-text {
  min-width: 0;
}
.blocker-title {
  font-size: var(--t-body);
  font-weight: 800;
  letter-spacing: -0.01em;
  margin-bottom: 2px;
}
.blocker-intro {
  font-size: var(--t-small);
  line-height: 1.5;
  opacity: 0.85;
}
.blocker-fix {
  display: grid;
  grid-template-columns: 18px minmax(0, 1fr);
  gap: 8px;
  align-items: start;
  font-size: var(--t-small);
  line-height: 1.55;
  padding-top: 8px;
  border-top: 1px dashed rgba(var(--v-border-color), 0.2);
}
.blocker-fix :deep(.v-icon) {
  margin-top: 3px;
}

/* Declaración postal */
.field-name {
  font-size: var(--t-label);
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: rgb(var(--v-theme-primary));
  margin-bottom: 6px;
}
.ex {
  display: grid;
  grid-template-columns: 18px minmax(0, 1fr);
  gap: 8px;
  align-items: start;
  font-size: var(--t-small);
  line-height: 1.5;
}
.ex :deep(.v-icon) {
  margin-top: 2px;
}
.ex--bad .io-body {
  text-decoration: line-through;
  opacity: 0.72;
}

/* Instrucciones */
.instructions-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}
.instructions-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.instructions-text {
  margin: 0;
  padding: 14px;
  border-radius: 12px;
  background: rgba(var(--v-border-color), 0.06);
  font-family: inherit;
  font-size: var(--t-small);
  line-height: 1.65;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

/* Pasos */
.step-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.step-list li {
  display: grid;
  grid-template-columns: 28px minmax(0, 1fr);
  gap: 14px;
  align-items: start;
}
.step-body {
  min-width: 0;
}
.step-num {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: rgb(var(--v-theme-primary));
  color: rgb(var(--v-theme-on-primary));
  font-weight: 800;
  font-size: var(--t-small);
  display: flex;
  align-items: center;
  justify-content: center;
}
.step-link {
  color: rgb(var(--v-theme-link));
  font-weight: 600;
  text-decoration: none;
  white-space: nowrap;
}
.step-link:hover {
  text-decoration: underline;
}

/* FAQ */
.faq-q {
  font-weight: 700;
  font-size: var(--t-body);
}
.faq-a {
  font-size: var(--t-small);
  line-height: 1.65;
}
.faq-a :deep(a) {
  color: rgb(var(--v-theme-link));
  font-weight: 600;
  text-decoration: none;
}
.faq-a :deep(a):hover {
  text-decoration: underline;
}

/* Relacionadas */
.related-card {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 16px;
  border: 1px solid rgba(var(--v-border-color), 0.14);
  border-radius: 16px;
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

/* Fuentes */
.sources-title {
  font-size: var(--t-body);
  font-weight: 800;
  margin-bottom: 4px;
}
.sources-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
  font-size: var(--t-small);
}
.sources-list li {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 2px;
}
.source-org {
  font-size: var(--t-label);
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  opacity: 0.7;
}
.sources-list a {
  color: rgb(var(--v-theme-link));
  font-weight: 600;
  text-decoration: none;
  overflow-wrap: anywhere;
  line-height: 1.5;
}
.sources-list a:hover {
  text-decoration: underline;
}

/* Un botón de texto largo no puede empujar el ancho de la página en móvil. */
.wrap-btn {
  max-width: 100%;
  height: auto;
  min-height: 40px;
  padding-top: 8px;
  padding-bottom: 8px;
}
.wrap-btn :deep(.v-btn__content) {
  white-space: normal;
  text-align: left;
  line-height: 1.35;
}

@media (min-width: 600px) {
  .sources-list li {
    grid-template-columns: 120px minmax(0, 1fr);
    gap: 12px;
    align-items: baseline;
  }

  /* En pantalla grande el bloque se acota y scrollea solo; en el teléfono fluye,
     porque un scroll anidado dentro del scroll de la página es una trampa táctil. */
  .instructions-text {
    max-height: 420px;
    overflow-y: auto;
  }
}
</style>
