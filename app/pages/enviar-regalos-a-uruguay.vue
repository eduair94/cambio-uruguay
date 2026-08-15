<template>
  <VContainer class="page py-6 py-md-10">
    <!-- Hero -->
    <header class="hero mb-6">
      <p class="eyebrow">Regalos desde el exterior · Agosto 2026</p>
      <h1 class="text-h4 text-md-h3 font-weight-bold mb-2">
        Cómo enviar un regalo desde el exterior a alguien en Uruguay
      </h1>
      <p class="text-body-1 text-medium-emphasis mb-4">
        La clave que casi nadie te dice:
        <strong>Uruguay no tiene un régimen aparte para regalos</strong>. Un obsequio que cruza la
        frontera paga (o no) exactamente igual que una compra online — y la franquicia que se gasta
        es la de <strong>quien lo recibe</strong>, no la tuya. Acá está cada forma de mandarlo, cuál
        conviene, y de dónde sale cada regla.
      </p>
      <VAlert type="info" variant="tonal" density="comfortable" icon="mdi-scale-balance">
        Las cifras del régimen salen de la <strong>Ley 20.446 art. 627</strong>, el
        <strong>Decreto 50/026</strong> y las resoluciones de la Aduana; lo de regalos y valoración,
        del propio formulario del <strong>Correo Uruguayo</strong> ("Cómo declarar su compra u
        obsequio"). Si algo no está en una norma, lo decimos.
      </VAlert>
      <p class="text-caption text-medium-emphasis mt-3 mb-0">
        <VIcon size="14" class="mr-1">mdi-package-variant-closed-check</VIcon>
        ¿Sos vos quien va a recibir la compra y querés saber si paga IVA?
        <NuxtLink :to="localePath('/franquicia-aduana-uruguay')">
          Ver franquicia y aduana para compras del exterior </NuxtLink
        >.
      </p>
    </header>

    <!-- The chooser -->
    <section class="mb-8" aria-label="¿Cómo conviene mandar el regalo?">
      <h2 class="section-heading mb-4">¿Cómo conviene mandarlo?</h2>

      <VCard variant="flat" class="calc pa-4 pa-sm-6">
        <VRow>
          <VCol cols="12" sm="6">
            <div class="text-overline text-medium-emphasis mb-2">
              ¿El regalo tiene que ser un objeto?
            </div>
            <VBtnToggle
              v-model="mustBePhysical"
              color="primary"
              mandatory
              divided
              variant="outlined"
              class="w-100 mb-4"
            >
              <VBtn :value="false" class="flex-grow-1">
                <VIcon start>mdi-gift-outline</VIcon>
                Da igual / puede ser digital
              </VBtn>
              <VBtn :value="true" class="flex-grow-1">
                <VIcon start>mdi-package-variant-closed</VIcon>
                Sí, un objeto físico
              </VBtn>
            </VBtnToggle>
          </VCol>

          <VCol cols="12" sm="6">
            <div class="text-overline text-medium-emphasis mb-2">Valor aproximado del regalo</div>
            <VTextField
              v-model.number="valueUsd"
              type="number"
              min="0"
              prefix="US$"
              variant="outlined"
              density="comfortable"
              hint="Su valor real: es lo que se declara, con o sin factura"
              persistent-hint
            />
          </VCol>
        </VRow>

        <VAlert
          :type="topAdvice.customs === 'none' ? 'success' : 'info'"
          variant="tonal"
          class="mt-4"
          :icon="getGiftMethod(topAdvice.methodId).icon"
          border="start"
        >
          <p class="text-subtitle-1 font-weight-bold mb-1">
            Recomendado: {{ getGiftMethod(topAdvice.methodId).name }}
          </p>
          <p class="mb-0 text-body-2">{{ topAdvice.reason }}</p>
        </VAlert>

        <div v-if="advice.length > 1" class="advice-rest mt-3">
          <p class="text-caption text-medium-emphasis mb-2">Otras opciones para este caso:</p>
          <VChipGroup column>
            <VChip
              v-for="a in advice.slice(1)"
              :key="a.methodId"
              size="small"
              variant="outlined"
              :prepend-icon="getGiftMethod(a.methodId).icon"
            >
              {{ getGiftMethod(a.methodId).name }}
            </VChip>
          </VChipGroup>
        </div>
      </VCard>
    </section>

    <!-- Physical-gift tax estimate -->
    <section v-if="mustBePhysical" class="mb-8">
      <h2 class="section-heading mb-1">Si va un objeto físico: ¿cuánto paga quien lo recibe?</h2>
      <p class="text-body-2 text-medium-emphasis mb-4">
        La franquicia es del destinatario. Contá su situación para estimar lo que pagaría al
        recibirlo.
      </p>

      <VCard variant="flat" class="calc pa-4 pa-sm-6">
        <VRow>
          <VCol cols="12" sm="4">
            <div class="text-overline text-medium-emphasis mb-2">¿Desde dónde lo mandás?</div>
            <VBtnToggle
              v-model="origin"
              color="primary"
              mandatory
              divided
              variant="outlined"
              class="w-100"
            >
              <VBtn value="usa" class="flex-grow-1">
                <VIcon start>mdi-flag-variant</VIcon>
                EE.UU.
              </VBtn>
              <VBtn value="other" class="flex-grow-1">
                <VIcon start>mdi-earth</VIcon>
                Otro país
              </VBtn>
            </VBtnToggle>
          </VCol>

          <VCol cols="12" sm="4">
            <VTextField
              v-model.number="recipientFranchiseAvailableUsd"
              type="number"
              min="0"
              max="800"
              label="Franquicia que le queda"
              prefix="US$"
              variant="outlined"
              density="comfortable"
              hint="Arranca con US$ 800 el 1.º de enero"
              persistent-hint
            />
          </VCol>

          <VCol cols="12" sm="4">
            <VTextField
              v-model.number="recipientShipmentsUsed"
              type="number"
              min="0"
              max="3"
              label="Envíos con franquicia usados"
              variant="outlined"
              density="comfortable"
              hint="Máximo 3 por año"
              persistent-hint
            />
          </VCol>
        </VRow>

        <VAlert
          :type="outlook.taxFree ? 'success' : 'info'"
          variant="tonal"
          class="mt-4"
          :icon="outlook.taxFree ? 'mdi-check-circle-outline' : 'mdi-cash'"
          border="start"
        >
          <p class="text-subtitle-1 font-weight-bold mb-1">
            <template v-if="outlook.taxFree">Le llegaría sin pagar impuestos</template>
            <template v-else-if="outlook.regime === 'general'">
              Supera la franquicia: régimen general (importación formal)
            </template>
            <template v-else>Pagaría aprox. US$ {{ outlook.estimatedTaxUsd.toFixed(2) }}</template>
          </p>
          <ul class="reasons-list mb-0">
            <li v-for="(r, i) in outlook.reasons" :key="i">{{ r }}</li>
          </ul>
        </VAlert>

        <p class="text-caption text-medium-emphasis mt-3 mb-0">
          <VIcon size="14" class="mr-1">mdi-information-outline</VIcon>
          Es una estimación del régimen de courier/postal. El flete que cobra el courier va aparte y
          no paga impuesto.
          <NuxtLink :to="localePath('/herramientas/calculadora-impuestos-importacion')">
            Calcular el costo puesto en Uruguay </NuxtLink
          >.
        </p>
      </VCard>
    </section>

    <!-- All the ways -->
    <section class="mb-8">
      <h2 class="section-heading mb-4">Todas las formas de mandar un regalo</h2>
      <VRow>
        <VCol v-for="m in GIFT_METHODS" :key="m.id" cols="12" md="6">
          <VCard variant="flat" class="method h-100 pa-5">
            <div class="d-flex align-center mb-2">
              <VIcon :icon="m.icon" color="primary" class="mr-2" />
              <h3 class="text-subtitle-1 font-weight-bold mb-0">{{ m.name }}</h3>
              <VChip
                :color="m.customs === 'none' ? 'success' : 'default'"
                size="x-small"
                variant="tonal"
                class="ml-auto"
              >
                {{ m.customs === 'none' ? 'Sin aduana' : 'Régimen de importación' }}
              </VChip>
            </div>
            <p class="text-caption text-medium-emphasis mb-2">
              <VIcon size="14" class="mr-1">mdi-clock-outline</VIcon>{{ m.speed }} ·
              {{ m.taxNote }}
            </p>
            <p class="text-body-2 mb-2"><strong>Cuándo:</strong> {{ m.bestFor }}</p>
            <ol class="steps-list mb-2">
              <li v-for="(s, i) in m.steps" :key="i">{{ s }}</li>
            </ol>
            <VAlert
              v-if="m.caveat"
              type="warning"
              variant="tonal"
              density="compact"
              class="mt-2 text-caption"
              icon="mdi-alert-outline"
            >
              {{ m.caveat }}
            </VAlert>
          </VCard>
        </VCol>
      </VRow>
    </section>

    <!-- FAQ -->
    <section class="mb-8" aria-label="Preguntas frecuentes">
      <h2 class="section-heading mb-4">Lo que más se pregunta</h2>
      <VExpansionPanels variant="accordion" class="faq-panels">
        <VExpansionPanel v-for="f in faqs" :key="f.q">
          <VExpansionPanelTitle>{{ f.q }}</VExpansionPanelTitle>
          <VExpansionPanelText>
            <p class="mb-0" v-html="f.a" />
          </VExpansionPanelText>
        </VExpansionPanel>
      </VExpansionPanels>
      <VBtn
        :to="localePath('/preguntas-frecuentes-aduana-uruguay')"
        variant="text"
        color="primary"
        class="mt-3 px-1"
      >
        Ver también preguntas de compras, productos y envíos retenidos
        <VIcon end>mdi-arrow-right</VIcon>
      </VBtn>
    </section>

    <!-- Sources -->
    <VCard variant="flat" class="sources-card pa-5 mb-6">
      <h2 class="text-subtitle-2 font-weight-bold mb-2">
        <VIcon start size="small" color="primary">mdi-link-variant</VIcon>
        Las fuentes, sin intermediarios
      </h2>
      <ul class="sources-list">
        <li v-for="(s, i) in sources" :key="i">
          <a :href="s.url" target="_blank" rel="noopener noreferrer">{{ s.label }}</a>
        </li>
      </ul>
      <p class="text-caption text-medium-emphasis mt-3 mb-0">
        Verificado el {{ LAST_RESEARCHED_LABEL }}. Ojo: la página de "Encomiendas Postales" de la
        DNA y el paso 3 del formulario del Correo todavía muestran topes viejos por modalidad (US$
        50 / US$ 200) del Decreto 356/014, derogado por el Decreto 50/026 desde el 1.º de mayo de
        2026. El tope que rige hoy es el anual acumulado de US$ 800.
      </p>
    </VCard>

    <VAlert type="warning" variant="tonal" density="comfortable" icon="mdi-alert-outline">
      Información <strong>de referencia</strong>, no asesoramiento profesional. La exoneración de
      IVA para envíos de EE.UU. de hasta US$ 200 está atada a que el vendedor esté registrado ante
      la Aduana (exigible desde el 1.º de octubre de 2026); un regalo de un particular no tiene
      vendedor registrado, y las fuentes oficiales no aclaran cómo se aplica ese caso. Para un
      regalo de valor alto, consultá con la Dirección Nacional de Aduanas antes de enviarlo.
    </VAlert>
  </VContainer>
</template>

<script setup lang="ts">
import {
  GIFT_METHODS,
  GIFT_LAST_RESEARCHED,
  getGiftMethod,
  giftTaxOutlook,
  recommendGiftMethods,
} from '~/utils/giftShipping'
import type { ImportOrigin } from '~/utils/importRules'

const localePath = useLocalePath()

const mustBePhysical = ref(false)
const valueUsd = ref(120)
const origin = ref<ImportOrigin>('usa')
const recipientFranchiseAvailableUsd = ref(800)
const recipientShipmentsUsed = ref(0)

const advice = computed(() =>
  recommendGiftMethods({ mustBePhysical: mustBePhysical.value, valueUsd: valueUsd.value || 0 })
)
const topAdvice = computed(() => ({
  ...advice.value[0]!,
  customs: getGiftMethod(advice.value[0]!.methodId).customs,
}))

const outlook = computed(() =>
  giftTaxOutlook({
    valueUsd: valueUsd.value || 0,
    origin: origin.value,
    useRecipientFranchise: true,
    recipientFranchiseAvailableUsd: recipientFranchiseAvailableUsd.value || 0,
    recipientShipmentsUsed: recipientShipmentsUsed.value || 0,
  })
)

const LAST_RESEARCHED_LABEL = formatDate(GIFT_LAST_RESEARCHED)

function formatDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`)
  return d.toLocaleDateString('es-UY', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

const faqs = [
  {
    q: '¿Un regalo paga menos impuesto que una compra?',
    a: 'No. Uruguay no tiene un régimen tributario aparte para obsequios: un regalo que cruza la frontera pasa por el mismo régimen de courier / encomiendas postales que cualquier compra online. El propio formulario del Correo Uruguayo se llama "Cómo declarar su compra u obsequio" y trata a ambos igual. La ventaja de que sea "regalo" es cero a efectos de la aduana.',
  },
  {
    q: '¿De quién es la franquicia que se usa, mía o de quien recibe?',
    a: 'De quien recibe. La franquicia anual (US$ 800 y hasta 3 envíos por año, hasta 20 kg por envío) está asociada al <strong>destinatario</strong> en Uruguay, identificado por su cédula. Mandarle un regalo le consume a esa persona uno de sus tres envíos y parte de sus US$ 800. Conviene coordinar para no dejarla sin franquicia si esperaba usarla en otra compra.',
  },
  {
    q: '¿Cuánto se paga si el regalo no entra en la franquicia?',
    a: 'Si no se usa (o no alcanza) la franquicia, se paga la <strong>prestación única</strong>: 60% del valor del envío, con un mínimo de US$ 20 (Ley 20.446 art. 627). Ese 60% reemplaza a todos los demás impuestos del envío. Por encima de US$ 800 el envío ya no entra en ningún régimen simplificado: pasa a importación formal (régimen general), que es otro trámite.',
  },
  {
    q: '¿Cómo mando un regalo sin pagar nada de aduana?',
    a: 'Con algo que no cruce la frontera física: una <strong>gift card o saldo digital</strong> (MercadoLibre, PedidosYa, Netflix, Steam, App Store…) o directamente <strong>enviando dinero</strong> para que compre el regalo en Uruguay. Ninguna de las dos pasa por Aduana, así que no hay impuesto de importación — solo mirá la comisión del servicio de envío de dinero.',
  },
  {
    q: 'Es un regalo de un particular y no tengo factura. ¿Qué valor pongo?',
    a: 'El valor real del bien. En un regalo sin factura comercial es el <strong>destinatario</strong> quien declara el valor al recibirlo (formulario del Correo, con su cédula). Si Aduana considera que está subvaluado, puede aplicar su propia valoración. No conviene declarar de menos: si el envío queda retenido por diferencias de valor, el trámite se complica más de lo que se ahorra.',
  },
  {
    q: '¿La exoneración de IVA de hasta US$ 200 aplica a un regalo desde EE.UU.?',
    a: 'Con matices. La exoneración de IVA para envíos de EE.UU. de hasta US$ 200 (TIFA) está pensada para <strong>compras con factura</strong>, y desde el 1.º de octubre de 2026 exige además que el <strong>vendedor esté registrado ante la Aduana</strong>. Un regalo enviado por un particular no tiene un vendedor registrado, y las fuentes oficiales no aclaran ese caso puntual. Si querés maximizar la chance de que quede sin IVA, comprá el regalo en una tienda de EE.UU. que envíe a Uruguay (con factura) por hasta US$ 200, en vez de mandar un paquete a título personal.',
  },
  {
    q: '¿Y si mejor le mando el regalo comprándolo en una tienda que envía a Uruguay?',
    a: 'Es una muy buena opción: comprás en Amazon Global, Tiendamia, AliExpress u otra tienda poniendo a tu amigo o familiar como destinatario. La factura viaja con el paquete (simplifica la valoración) y, si es de EE.UU. y de hasta US$ 200, tenés la mejor chance de que quede sin IVA. El régimen que paga al llegar es el mismo de cualquier compra online, a nombre del destinatario.',
  },
]

const sources = [
  {
    label: 'Ley 20.446 art. 627 — prestación única del 60%, mínimo US$ 20 por envío',
    url: 'https://www.impo.com.uy/bases/leyes/20446-2025/627',
  },
  {
    label: 'Decreto 50/026 — régimen de envíos postales: franquicia anual US$ 800, 3 envíos, 20 kg',
    url: 'https://www.impo.com.uy/bases/decretos/50-2026',
  },
  {
    label:
      'Correo Uruguayo — "Cómo declarar su compra u obsequio" (los regalos se declaran con la cédula del destinatario)',
    url: 'https://www.correo.com.uy/como-declarar-su-compra-u-obsequio',
  },
  {
    label: 'MEF — Guía de preguntas frecuentes sobre el régimen de envíos postales y franquicias',
    url: 'https://www.gub.uy/ministerio-economia-finanzas/comunicacion/noticias/guia-preguntas-frecuentes-sobre-regimen-envios-postales-franquicias',
  },
  {
    label:
      'TIFA — Ley 18.761 art. 7 lit. g: exoneración de IVA para envíos de EE.UU. de hasta US$ 200',
    url: 'https://www.impo.com.uy/bases/leyes-internacional/18761-2011',
  },
]

// --- SEO ---
const canonicalUrl = 'https://cambio-uruguay.com/enviar-regalos-a-uruguay'
const title =
  'Cómo enviar un regalo desde el exterior a Uruguay 2026: aduana, franquicia y las formas sin impuesto'
const description =
  'Uruguay no tiene régimen aparte para regalos: un obsequio paga igual que una compra y gasta la franquicia de quien lo recibe. Gift cards, dinero, courier o correo — cuál conviene, cuánto paga el destinatario y de dónde sale cada regla.'

defineOgImageComponent('Cambio', {
  title: 'Enviar un regalo desde el exterior a Uruguay',
  subtitle: 'Aduana, franquicia del destinatario y las formas sin impuesto',
  tag: 'REGALOS',
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
        'enviar regalo a uruguay, mandar regalo desde el exterior uruguay, regalo desde estados unidos a uruguay, obsequio aduana uruguay, gift card uruguay, enviar dinero a uruguay, franquicia envios uruguay, courier regalo uruguay, correo uruguayo declarar obsequio, cuanto paga un regalo en la aduana uruguay',
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
                name: 'Enviar un regalo a Uruguay',
                item: canonicalUrl,
              },
            ],
          },
          {
            '@type': 'FAQPage',
            mainEntity: faqs.map(f => ({
              '@type': 'Question',
              name: f.q,
              acceptedAnswer: { '@type': 'Answer', text: f.a.replace(/<[^>]+>/g, '') },
            })),
          },
        ],
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
.calc,
.method,
.sources-card {
  border: 1px solid rgba(var(--v-border-color), 0.14);
  border-radius: 14px;
}
.steps-list {
  margin: 0;
  padding-left: 18px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 0.85rem;
  line-height: 1.55;
}
.reasons-list {
  margin: 0;
  padding-left: 18px;
  font-size: 0.85rem;
  line-height: 1.5;
}
.faq-panels {
  border: 1px solid rgba(var(--v-border-color), 0.14);
  border-radius: 14px;
  overflow: hidden;
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
