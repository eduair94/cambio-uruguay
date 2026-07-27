<!--
THESIS: Importar durante una estadía temporal se decide por documento y canal, no por nacionalidad; evita la guía genérica que obliga a leer antes de responder.
OWN-WORLD: Un escritorio aduanero azul noche con ruta Documento → Origen → Régimen, controles Vuetify y señales ámbar/teal reservadas para costos y contexto.
STORY: La persona identifica si tendrá documento uruguayo, ve el costo probable y sale con una ruta concreta para comprar, recibir o traer sus bienes.
FIRST VIEWPORT: Respuesta corta y principio decisivo a la izquierda; simulador con documento, origen, valor y veredicto a la derecha; CTA a la calculadora detallada.
FORM: Mesa de decisión editorial, extensión Read/Operate de “La Mesa de Mercado”; composición partida en desktop y apilada en mobile.
-->
<template>
  <VContainer class="foreign-import-page py-6 py-md-10">
    <header class="hero-grid mb-10">
      <div class="hero-copy">
        <p class="eyebrow">Vivir en Uruguay · Guía para extranjeros · Julio 2026</p>
        <h1 class="hero-title mb-4">Importar a Uruguay durante una estadía de seis meses</h1>
        <p class="hero-lede text-medium-emphasis mb-5">
          Sí, podés recibir compras de Amazon, China o tu país. La diferencia decisiva no es ser
          extranjero: es <strong>tener o no documento de identidad uruguayo</strong>. Sin él podés
          recibir envíos, pero no usar la franquicia personal.
        </p>

        <div class="answer-slab on-dark">
          <div class="answer-mark" aria-hidden="true">
            <VIcon size="24">mdi-card-account-details-outline</VIcon>
          </div>
          <div>
            <p class="answer-label mb-1">La respuesta corta</p>
            <p class="answer-copy mb-0">
              <strong>Solo con documento de tu país:</strong> dirección local + operador postal +
              tributos; normalmente 60% hasta US$ 800. <strong>Con cédula uruguaya:</strong> podés
              usar la franquicia anual; Mercosur y China pagan IVA, mientras que EE.UU. puede quedar
              exonerado hasta US$ 200.
            </p>
          </div>
        </div>

        <ol class="route-strip mt-5" aria-label="Cómo se determina el régimen">
          <li>
            <span>1</span>
            Documento
          </li>
          <li>
            <span>2</span>
            Origen
          </li>
          <li>
            <span>3</span>
            Régimen
          </li>
        </ol>
      </div>

      <VCard variant="flat" class="decision-panel pa-4 pa-sm-5">
        <div class="d-flex align-start justify-space-between ga-3 mb-5">
          <div>
            <p class="panel-kicker mb-1">Orientación rápida</p>
            <h2 class="text-h6 font-weight-bold mb-1">Probá tu caso</h2>
            <p class="text-body-2 text-medium-emphasis mb-0">
              Asume uso personal, hasta 20 kg y cupo anual disponible.
            </p>
          </div>
          <VIcon color="primary" size="28">mdi-routes</VIcon>
        </div>

        <fieldset class="control-group">
          <legend>¿Qué documento vas a tener?</legend>
          <VBtnToggle
            v-model="documentStatus"
            color="primary"
            mandatory
            divided
            variant="outlined"
            class="choice-toggle document-toggle"
            aria-label="Documento disponible"
          >
            <VBtn value="foreign" class="flex-grow-1">
              <VIcon start>mdi-passport</VIcon>
              Solo el de mi país
            </VBtn>
            <VBtn value="uruguayan" class="flex-grow-1">
              <VIcon start>mdi-card-account-details</VIcon>
              Cédula uruguaya
            </VBtn>
          </VBtnToggle>
        </fieldset>

        <fieldset class="control-group">
          <legend>¿Dónde se origina la compra?</legend>
          <VBtnToggle
            v-model="purchaseOrigin"
            color="primary"
            mandatory
            divided
            variant="outlined"
            class="choice-toggle origin-toggle"
            aria-label="País o región de origen de la compra"
          >
            <VBtn value="mercosur">Mercosur</VBtn>
            <VBtn value="usa">EE.UU.</VBtn>
            <VBtn value="other">China / otro</VBtn>
          </VBtnToggle>
        </fieldset>

        <VTextField
          v-model.number="invoiceTotal"
          type="number"
          min="0"
          label="Total de la factura"
          prefix="US$"
          variant="outlined"
          density="comfortable"
          hint="Precio y todo cargo que figure en la factura del vendedor"
          persistent-hint
          class="mb-4"
        />

        <VSwitch
          v-if="showSellerQuestion"
          v-model="sellerRegistered"
          color="primary"
          density="comfortable"
          :label="`El vendedor está registrado ante Aduana desde el ${sellerRegistryLabel}`"
          class="mb-3"
        />

        <VAlert
          :type="verdictTone"
          variant="tonal"
          density="comfortable"
          :icon="verdictIcon"
          class="verdict"
        >
          <p class="text-subtitle-1 font-weight-bold mb-1">{{ verdictTitle }}</p>
          <p class="text-body-2 mb-2">{{ verdictExplanation }}</p>
          <p v-if="estimatedTax !== null" class="verdict-amount mb-1">
            Impuesto estimado: <strong>US$ {{ estimatedTax.toFixed(2) }}</strong>
          </p>
          <p class="text-caption text-medium-emphasis mb-0">
            No incluye flete, manejo ni otros cargos del operador.
          </p>
        </VAlert>

        <VBtn
          :to="localePath('/herramientas/calculadora-impuestos-importacion')"
          color="primary"
          block
          class="mt-4"
        >
          Calcular el costo completo
          <VIcon end>mdi-arrow-right</VIcon>
        </VBtn>
      </VCard>
    </header>

    <main>
      <section class="section-block" aria-labelledby="situaciones-title">
        <div class="section-intro">
          <p class="section-kicker">Tu situación jurídica cambia la ruta</p>
          <h2 id="situaciones-title" class="section-heading">Tres casos que no conviene mezclar</h2>
          <p class="text-medium-emphasis">
            “Extranjero”, “turista” y “persona sin cédula uruguaya” no significan exactamente lo
            mismo. Para encomiendas postales, la norma mira el documento uruguayo.
          </p>
        </div>

        <div class="scenario-table" role="list">
          <article role="listitem" class="scenario-row">
            <div class="scenario-status">
              <span class="status-dot status-dot--amber" aria-hidden="true" />
              <span>Sin cédula uruguaya</span>
            </div>
            <div>
              <h3>Podés recibir, pero no usar la franquicia</h3>
              <p>
                Necesitás una dirección en Uruguay y contratar un operador postal. Para un envío de
                hasta US$ 800 y 20 kg, la alternativa usual es la prestación única del
                <strong>60%</strong>, con un mínimo de US$ 20.
              </p>
            </div>
          </article>

          <article role="listitem" class="scenario-row">
            <div class="scenario-status">
              <span class="status-dot status-dot--green" aria-hidden="true" />
              <span>Con cédula uruguaya</span>
            </div>
            <div>
              <h3>La franquicia sí puede estar disponible</h3>
              <p>
                Hasta <strong>3 envíos</strong> y <strong>US$ 800 acumulados</strong> por año civil.
                Exonera aranceles, no siempre impuestos: compras de Mercosur, China y otros orígenes
                pagan IVA; las de EE.UU. pueden quedar sin IVA hasta US$ 200.
              </p>
            </div>
          </article>

          <article role="listitem" class="scenario-row">
            <div class="scenario-status">
              <span class="status-dot status-dot--blue" aria-hidden="true" />
              <span>Lo traés con vos</span>
            </div>
            <div>
              <h3>Equipaje de viajero: es otro régimen</h3>
              <p>
                Tus efectos personales y las compras que entran en tu valija no usan la franquicia
                postal. Hay una franquicia de equipaje y, sobre el excedente, un impuesto del 50%.
                <NuxtLink :to="localePath('/franquicia-viajero-uruguay')">
                  Ver la guía de equipaje de viajero
                </NuxtLink>
                .
              </p>
            </div>
          </article>
        </div>
      </section>

      <section class="mercosur-section section-block" aria-labelledby="mercosur-title">
        <div class="mercosur-copy">
          <p class="section-kicker">La confusión más común</p>
          <h2 id="mercosur-title" class="section-heading">
            Mercosur no convierte el paquete en correo doméstico
          </h2>
          <p>
            Una compra enviada desde Brasil, Argentina, Paraguay u otro país del bloque sigue
            cruzando una frontera y se declara como envío postal internacional. Para la franquicia
            personal vigente,
            <strong>no existe una exoneración especial por venir del Mercosur</strong>.
          </p>
          <p class="text-medium-emphasis mb-0">
            Los acuerdos de origen del Mercosur pueden importar en una importación comercial formal
            con documentación de origen, pero no vuelven automáticamente libre de impuestos una
            compra personal que llega por correo o courier.
          </p>
        </div>

        <div class="route-visual" aria-label="Ruta de una compra desde Mercosur">
          <div class="route-node">
            <VIcon size="24">mdi-storefront-outline</VIcon>
            <span>Vendedor<br />Mercosur</span>
          </div>
          <div class="route-line" aria-hidden="true">
            <VIcon size="18">mdi-chevron-right</VIcon>
          </div>
          <div class="route-node route-node--focus">
            <VIcon size="24">mdi-shield-search-outline</VIcon>
            <span>Aduana<br />uruguaya</span>
          </div>
          <div class="route-line" aria-hidden="true">
            <VIcon size="18">mdi-chevron-right</VIcon>
          </div>
          <div class="route-node">
            <VIcon size="24">mdi-home-map-marker</VIcon>
            <span>Dirección<br />en Uruguay</span>
          </div>
          <p class="route-caption">Con franquicia: sin aranceles, con IVA del 22%.</p>
        </div>
      </section>

      <section class="section-block" aria-labelledby="canales-title">
        <div class="section-intro">
          <p class="section-kicker">Elegí el canal antes de pagar</p>
          <h2 id="canales-title" class="section-heading">
            Amazon, sitios chinos y cosas de tu país
          </h2>
        </div>

        <div class="channel-list">
          <article class="channel-row">
            <div class="channel-label">
              <VIcon aria-hidden="true">mdi-package-variant-closed</VIcon>
              <h3>Amazon directo</h3>
            </div>
            <div>
              <p>
                Si el producto ofrece envío internacional, Amazon o el transportista suele gestionar
                el despacho y puede cobrar un depósito de importación en el checkout. Sigue siendo
                una importación: revisá quién declara y qué incluye ese depósito.
              </p>
              <NuxtLink :to="localePath('/declarar-compra-exterior-uruguay')">
                Ver cómo se declara Amazon Global
              </NuxtLink>
            </div>
          </article>

          <article class="channel-row">
            <div class="channel-label">
              <VIcon aria-hidden="true">mdi-airplane-marker</VIcon>
              <h3>Amazon vía Miami</h3>
            </div>
            <div>
              <p>
                Comprás con dirección de casillero y el courier consolida o reenvía a Uruguay.
                Compará el flete por peso, manejo y demora aparte del impuesto.
              </p>
              <NuxtLink :to="localePath('/couriers-uruguay')">
                Comparar couriers de Miami a Uruguay
              </NuxtLink>
            </div>
          </article>

          <article class="channel-row">
            <div class="channel-label">
              <VIcon aria-hidden="true">mdi-mailbox-outline</VIcon>
              <h3>AliExpress, Temu o Shein</h3>
            </div>
            <div>
              <p>
                El envío estándar suele terminar en Correo Uruguayo. Guardá factura y tracking y
                declaralo cuando corresponda. Si usás franquicia, el origen China u “otro país” paga
                IVA del 22%.
              </p>
              <NuxtLink :to="localePath('/guias/importar-de-aliexpress-a-uruguay')">
                Ver la guía para AliExpress
              </NuxtLink>
            </div>
          </article>

          <article class="channel-row">
            <div class="channel-label">
              <VIcon aria-hidden="true">mdi-package-variant</VIcon>
              <h3>Tus cosas usadas</h3>
            </div>
            <div>
              <p>
                Si alguien de tu familia te manda un obsequio genuino, persona a persona y sin fin
                comercial, puede quedar exonerado de todo tributo, aunque consume cupo. Una compra
                propia no se vuelve regalo por declararla así.
              </p>
              <p class="text-medium-emphasis mb-0">
                Si realmente trasladás tu residencia y menaje, existe un trámite separado de mudanza
                Mercosur. Una visita de seis meses no lo habilita automáticamente.
              </p>
            </div>
          </article>
        </div>
      </section>

      <section class="plan-section section-block" aria-labelledby="plan-title">
        <div class="section-intro">
          <p class="section-kicker">Plan razonable para seis meses</p>
          <h2 id="plan-title" class="section-heading">
            Qué resolver antes de hacer la primera compra
          </h2>
        </div>

        <ol class="plan-list">
          <li>
            <span class="plan-index">1</span>
            <div>
              <h3>Definí si vas a tramitar residencia</h3>
              <p>
                Las personas de países Mercosur y asociados pueden solicitar residencia temporaria
                por hasta dos años y luego obtener documento uruguayo. Es una decisión migratoria,
                no un atajo aduanero: evaluá costos, agenda y documentación para tu estadía.
              </p>
            </div>
          </li>
          <li>
            <span class="plan-index">2</span>
            <div>
              <h3>Usá siempre tus propios datos</h3>
              <p>
                Para la franquicia deben coincidir titular de la compra, medio de pago y
                destinatario. No uses la cédula o franquicia de un amigo: el paquete puede quedar
                retenido o perder el beneficio.
              </p>
            </div>
          </li>
          <li>
            <span class="plan-index">3</span>
            <div>
              <h3>Confirmá producto, operador y costo total</h3>
              <p>
                Verificá que el producto no esté prohibido, gravado por IMESI o sujeto a un permiso
                especial. Después sumá factura, impuesto, flete y cargos de manejo antes de comparar
                con el precio local.
              </p>
            </div>
          </li>
        </ol>

        <div class="action-row">
          <VBtn
            :to="localePath('/herramientas/carrito-importacion')"
            color="primary"
            variant="flat"
          >
            Armar un carrito de importación
          </VBtn>
          <VBtn :to="localePath('/problemas-con-la-aduana-uruguay')" variant="text">
            Qué hacer si queda retenido
          </VBtn>
        </div>
      </section>

      <section class="section-block" aria-labelledby="faq-title">
        <div class="section-intro">
          <p class="section-kicker">Dudas de una estadía temporal</p>
          <h2 id="faq-title" class="section-heading">Preguntas frecuentes</h2>
        </div>

        <VExpansionPanels variant="accordion" class="faq-panels">
          <VExpansionPanel v-for="faq in faqs" :key="faq.q">
            <VExpansionPanelTitle>{{ faq.q }}</VExpansionPanelTitle>
            <VExpansionPanelText>
              <p class="faq-answer mb-0">{{ faq.a }}</p>
            </VExpansionPanelText>
          </VExpansionPanel>
        </VExpansionPanels>
      </section>

      <VCard variant="flat" class="sources-card pa-5 pa-sm-6 mb-4">
        <div class="d-flex align-center ga-2 mb-3">
          <VIcon color="primary">mdi-source-branch</VIcon>
          <h2 class="text-h6 font-weight-bold">Fuentes oficiales</h2>
        </div>
        <ul class="sources-list">
          <li v-for="source in sources" :key="source.url">
            <a :href="source.url" target="_blank" rel="noopener noreferrer">{{ source.label }}</a>
          </li>
        </ul>
        <p class="text-caption text-medium-emphasis mt-4 mb-0">
          Verificado el 26 de julio de 2026. Las reglas pueden cambiar; confirmá el caso concreto
          con tu operador postal o la Dirección Nacional de Aduanas antes de comprar.
        </p>
      </VCard>

      <VAlert
        type="warning"
        variant="tonal"
        density="comfortable"
        icon="mdi-scale-balance"
        class="legal-notice"
      >
        Esta página brinda orientación general y no sustituye asesoramiento migratorio o aduanero.
        La Aduana puede pedir documentación adicional y resuelve cada operación según la mercadería
        y sus antecedentes.
      </VAlert>
    </main>
  </VContainer>
</template>

<script setup lang="ts">
import { isSellerRegistryEnforced, resolveRegime } from '~/utils/importRules'
import { regimeRulesFromPayload } from '~/utils/regimeOverlay'
import { URUGUAY } from '~/utils/calculators'

type DocumentStatus = 'foreign' | 'uruguayan'
type PurchaseOrigin = 'mercosur' | 'usa' | 'other'

const localePath = useLocalePath()

const { data: aduanaData } = await useFetch('/api/aduana', {
  key: 'foreign-import-aduana-overlay',
})
const overlay = computed(() => regimeRulesFromPayload(aduanaData.value))
const rules = computed(() => overlay.value.rules)

const documentStatus = ref<DocumentStatus>('foreign')
const purchaseOrigin = ref<PurchaseOrigin>('mercosur')
const invoiceTotal = ref(150)
const sellerRegistered = ref(true)

const showSellerQuestion = computed(
  () =>
    documentStatus.value === 'uruguayan' &&
    purchaseOrigin.value === 'usa' &&
    isSellerRegistryEnforced(new Date(), rules.value)
)

const decision = computed(() =>
  resolveRegime(
    {
      valueUsd: invoiceTotal.value || 0,
      origin: purchaseOrigin.value === 'usa' ? 'usa' : 'other',
      franchiseAvailableUsd: rules.value.franchiseAnnualUsd,
      shipmentsUsed: 0,
      useFranchise: documentStatus.value === 'uruguayan',
      sellerRegistered: sellerRegistered.value,
    },
    rules.value
  )
)

const estimatedTax = computed<number | null>(() => {
  const value = Math.max(invoiceTotal.value || 0, 0)
  if (decision.value.regime === 'general') return null
  if (decision.value.regime === 'simplificado') {
    return Math.max(
      (value * rules.value.simplifiedRatePct) / 100,
      value > 0 ? rules.value.simplifiedMinUsd : 0
    )
  }
  if (decision.value.ivaExempt) return 0
  return (value * URUGUAY.iva.basica) / 100
})

const verdictTone = computed(() => {
  if (decision.value.regime === 'general') return 'warning'
  if (documentStatus.value === 'foreign') return 'warning'
  return decision.value.ivaExempt ? 'success' : 'info'
})

const verdictIcon = computed(() => {
  if (decision.value.regime === 'general') return 'mdi-alert-outline'
  if (documentStatus.value === 'foreign') return 'mdi-passport'
  return decision.value.ivaExempt ? 'mdi-check-circle-outline' : 'mdi-receipt-text-outline'
})

const verdictTitle = computed(() => {
  if (decision.value.regime === 'general') {
    return `Supera US$ ${rules.value.franchiseAnnualUsd}: importación general`
  }
  if (documentStatus.value === 'foreign') return 'Podés recibirlo, pero sin franquicia'
  if (decision.value.ivaExempt) return 'Con franquicia: sin IVA'
  return `Con franquicia: paga IVA del ${URUGUAY.iva.basica}%`
})

const verdictExplanation = computed(() => {
  if (decision.value.regime === 'general') {
    return 'No entra en la franquicia ni en la prestación única. Consultá a un despachante antes de comprar.'
  }
  if (documentStatus.value === 'foreign') {
    return `Sin documento uruguayo, la vía simplificada aplica ${rules.value.simplifiedRatePct}% sobre la factura, con mínimo de US$ ${rules.value.simplifiedMinUsd}.`
  }
  if (decision.value.ivaExempt) {
    return `Compra originada en EE.UU. dentro del límite vigente y con cupo disponible.`
  }
  if (purchaseOrigin.value === 'mercosur') {
    return 'El origen Mercosur no exonera el IVA de una encomienda personal. La franquicia sí exonera aranceles.'
  }
  return 'La franquicia exonera aranceles, pero este origen no tiene exoneración de IVA.'
})

const sellerRegistryLabel = computed(() => formatDate(rules.value.sellerRegistryEnforcedFrom))

function formatDate(iso: string): string {
  const date = new Date(`${iso}T00:00:00Z`)
  return date.toLocaleDateString('es-UY', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

const faqs = [
  {
    q: '¿Puedo usar mi DNI, CPF o documento de mi país para la franquicia?',
    a: 'No. El Decreto 50/026 exige un documento nacional de identidad uruguayo. Tu documento extranjero sirve para identificarte ante el operador según su procedimiento, pero no habilita la franquicia. Sin cédula uruguaya podés recibir el envío en una dirección local pagando los tributos correspondientes.',
  },
  {
    q: '¿Ser ciudadano de un país del Mercosur cambia el impuesto?',
    a: 'No en el régimen postal personal. La nacionalidad Mercosur puede facilitar el trámite de residencia temporaria y, luego, la obtención de documento uruguayo. El paquete enviado desde otro país del bloque sigue siendo una importación y, bajo franquicia, paga IVA del 22%.',
  },
  {
    q: '¿Puedo usar la cédula y la franquicia de un amigo uruguayo?',
    a: 'No deberías. En una compra con franquicia deben coincidir el titular del medio de pago, el comprador y el destinatario. Usar datos de otra persona puede hacer que el envío pierda la franquicia o quede retenido.',
  },
  {
    q: '¿Amazon o Temu evitan el trámite por enviarlo directo?',
    a: 'No. Pueden simplificar la gestión porque el vendedor o transportista recauda cargos y declara el paquete, pero el envío sigue sujeto a control aduanero. Revisá en el checkout quién actúa como operador y si el monto cobrado incluye impuestos o solo flete.',
  },
  {
    q: '¿Conviene tramitar residencia solo para importar durante seis meses?',
    a: 'No es una decisión aduanera. La residencia temporaria Mercosur puede durar hasta dos años y permite tramitar documento uruguayo, pero tiene requisitos, costos y tiempos propios. Evaluála por tu situación migratoria completa; no des por hecho que obtendrás la cédula antes de necesitar el primer paquete.',
  },
  {
    q: '¿Y si mando desde mi país ropa, libros o una computadora que ya son míos?',
    a: 'Si llegan por correo, siguen necesitando una declaración y un valor. Un obsequio familiar genuino puede estar exento de tributos, pero consume cupo y debe ser realmente persona a persona. Si te mudás para establecer residencia, existe un régimen separado para menaje; una estadía de seis meses no lo activa automáticamente. Si los traés con vos, consultá la guía de equipaje de viajero.',
  },
]

const sources = [
  {
    label:
      'IMPO — Decreto 50/026, arts. 2 a 5: prestación única, franquicia, documento uruguayo y valor de factura',
    url: 'https://www.impo.com.uy/bases/decretos/50-2026',
  },
  {
    label:
      'Dirección Nacional de Aduanas — extranjero sin franquicia: dirección local, operador postal y tributos',
    url: 'https://www.aduanas.gub.uy/innovaportal/v/25064/1/innova.front/si-soy-extranjero-como-puedo-hacer-para-recibir-mis-envios-en-uruguay-desde-el-exterior.html',
  },
  {
    label:
      'Dirección Nacional de Aduanas — sin cédula de identidad uruguaya no se puede usar la franquicia',
    url: 'https://www.aduanas.gub.uy/innovaportal/v/25063/15/innova.front/sin-cedula-de-identidad-uruguaya-puedo-hacer-uso-de-la-franquicia.html',
  },
  {
    label:
      'Dirección Nacional de Aduanas — régimen vigente desde mayo de 2026: US$ 800, 3 envíos e IVA',
    url: 'https://www.aduanas.gub.uy/innovaportal/v/28455/9/innova.front/desde-el-1%C2%BA-de-mayo-comienza-a-regir-el-nuevo-regimen-de-franquicias-de-envios-postales-internacionales.html',
  },
  {
    label: 'Correo Uruguayo — requisitos de franquicia, medio de pago, 20 kg y productos excluidos',
    url: 'https://www.correo.com.uy/preguntas-frecuentes/-/asset_publisher/ZuxsE4WytQ4A/content/-que-requisitos-debo-cumplir-para-poder-utilizar-los-cuatro-envios-postales-exonerados-de-impuestos-franquicia-',
  },
  {
    label: 'gub.uy — residencia legal temporaria Mercosur: hasta 2 años y certificado para cédula',
    url: 'https://www.gub.uy/tramites/residencia-legal-temporaria-mercosur',
  },
  {
    label: 'gub.uy — documento de identidad para personas nacidas en el exterior con residencia',
    url: 'https://www.gub.uy/tramites/cedula-identidad-primera-vez-personas-extranjeras-residencia-tramite-legal-definitiva-definitiva-mercosur',
  },
  {
    label:
      'gub.uy — ingreso de equipajes y mudanzas en régimen Mercosur para quienes se establecen',
    url: 'https://www.gub.uy/tramites/solicitud-ingreso-equipajes-viajeros-mudanzas-regimen-mercosur',
  },
]

const canonicalUrl = 'https://cambio-uruguay.com/importar-a-uruguay-siendo-extranjero'
const title = 'Importar a Uruguay siendo extranjero: Amazon, China y Mercosur'
const description =
  'Guía 2026 para recibir compras en Uruguay durante una estadía temporal: qué cambia con o sin cédula uruguaya, impuestos desde Mercosur, Amazon y China, y cómo elegir courier.'

defineOgImageComponent('Cambio', {
  title: '¿Podés importar a Uruguay siendo extranjero?',
  subtitle: 'Cédula, Mercosur, Amazon, China e impuestos en una sola guía',
  tag: 'IMPORTAR',
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
        'importar a uruguay siendo extranjero, compras exterior uruguay turista, importar mercosur uruguay, amazon uruguay extranjero, aliexpress uruguay, franquicia sin cedula uruguaya, courier uruguay extranjero, vivir seis meses en uruguay',
    },
  ],
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'Article',
            headline: title,
            description,
            mainEntityOfPage: canonicalUrl,
            dateModified: '2026-07-26',
            author: {
              '@type': 'Organization',
              name: 'Cambio Uruguay',
              url: 'https://cambio-uruguay.com',
            },
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
              {
                '@type': 'ListItem',
                position: 2,
                name: 'Importar a Uruguay siendo extranjero',
                item: canonicalUrl,
              },
            ],
          },
          {
            '@type': 'FAQPage',
            mainEntity: faqs.map(faq => ({
              '@type': 'Question',
              name: faq.q,
              acceptedAnswer: {
                '@type': 'Answer',
                text: faq.a,
              },
            })),
          },
        ],
      }),
    },
  ],
}))
</script>

<style scoped>
.foreign-import-page {
  max-width: 1180px;
}

.hero-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.08fr) minmax(380px, 0.92fr);
  gap: 40px;
  align-items: center;
}

.hero-copy,
.decision-panel,
.mercosur-copy,
.route-visual,
.scenario-row > *,
.channel-row > * {
  min-width: 0;
}

.eyebrow,
.section-kicker,
.panel-kicker,
.answer-label {
  font-size: 0.75rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.eyebrow,
.section-kicker,
.panel-kicker {
  color: rgb(var(--v-theme-link));
}

.hero-title {
  max-width: 19ch;
  font-size: clamp(2rem, 5vw, 3.5rem);
  font-weight: 800;
  line-height: 1.06;
  letter-spacing: -0.03em;
  text-wrap: balance;
}

.hero-lede {
  max-width: 67ch;
  font-size: 1.05rem;
  line-height: 1.7;
}

.answer-slab {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 16px;
  align-items: start;
  padding: 20px;
  color: #fff;
  background: #101a31;
  border-radius: 16px;
  box-shadow: 12px 18px 36px rgba(0, 0, 0, 0.24);
}

.answer-mark {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  color: #fff;
  background: #1976d2;
  border-radius: 12px;
}

.answer-label {
  color: #90caf9;
}

.answer-copy {
  max-width: 64ch;
  color: #e8edf7;
  line-height: 1.65;
}

.route-strip {
  display: flex;
  align-items: center;
  gap: 0;
  padding: 0;
  margin: 0;
  list-style: none;
}

.route-strip li {
  display: flex;
  align-items: center;
  gap: 8px;
  color: rgb(var(--v-theme-on-surface));
  font-size: 0.82rem;
  font-weight: 700;
}

.route-strip li:not(:last-child)::after {
  width: clamp(24px, 5vw, 64px);
  height: 1px;
  margin: 0 12px;
  content: '';
  background: rgba(var(--v-theme-on-surface), 0.25);
}

.route-strip span {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  color: rgb(var(--v-theme-on-primary));
  background: rgb(var(--v-theme-primary));
  border-radius: 50%;
}

.decision-panel,
.sources-card {
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 16px;
}

.decision-panel {
  background:
    linear-gradient(145deg, rgba(var(--v-theme-primary), 0.08), transparent 42%),
    rgb(var(--v-theme-surface));
  box-shadow: 14px 20px 42px rgba(0, 0, 0, 0.2);
}

.control-group {
  padding: 0;
  margin: 0 0 24px;
  border: 0;
}

.control-group legend {
  margin-bottom: 8px;
  font-size: 0.82rem;
  font-weight: 800;
}

.choice-toggle {
  display: grid;
  width: 100%;
  height: auto;
}

.document-toggle {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.origin-toggle {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.choice-toggle :deep(.v-btn) {
  min-width: 0;
  min-height: 48px;
  padding-inline: 10px;
  white-space: normal;
}

.verdict {
  border-radius: 12px;
}

.verdict :deep(.v-alert__content),
.legal-notice :deep(.v-alert__content) {
  color: rgb(var(--v-theme-on-surface));
}

.verdict-amount {
  font-size: 1rem;
  font-variant-numeric: tabular-nums;
}

.section-block {
  margin-top: 64px;
}

.section-intro {
  max-width: 72ch;
  margin-bottom: 24px;
}

.section-kicker {
  margin-bottom: 6px;
}

.section-heading {
  margin-bottom: 10px;
  font-size: clamp(1.55rem, 3vw, 2.125rem);
  font-weight: 800;
  line-height: 1.15;
  letter-spacing: -0.02em;
  text-wrap: balance;
}

.scenario-table {
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.scenario-row {
  display: grid;
  grid-template-columns: minmax(190px, 0.34fr) minmax(0, 1fr);
  gap: 32px;
  padding: 24px 4px;
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.scenario-row h3,
.channel-row h3,
.plan-list h3 {
  margin-bottom: 6px;
  font-size: 1.05rem;
  font-weight: 800;
}

.scenario-row p,
.channel-row p,
.plan-list p {
  max-width: 72ch;
  margin-bottom: 0;
  line-height: 1.65;
}

.scenario-status {
  display: flex;
  align-items: center;
  gap: 10px;
  align-self: center;
  font-size: 0.86rem;
  font-weight: 800;
}

.status-dot {
  width: 11px;
  height: 11px;
  border-radius: 50%;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.28);
}

.status-dot--amber {
  background: #ffb300;
}

.status-dot--green {
  background: #35d07f;
}

.status-dot--blue {
  background: #64b5f6;
}

.mercosur-section {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(360px, 0.82fr);
  gap: 48px;
  align-items: center;
  padding: 40px;
  background: rgba(var(--v-theme-info), 0.09);
  border-radius: 16px;
}

.mercosur-copy p {
  max-width: 68ch;
  line-height: 1.68;
}

.route-visual {
  display: grid;
  grid-template-columns: 1fr auto 1fr auto 1fr;
  gap: 10px;
  align-items: center;
  padding: 24px 20px;
  background: rgb(var(--v-theme-surface));
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 12px;
}

.route-node {
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: center;
  color: rgb(var(--v-theme-on-surface));
  font-size: 0.78rem;
  font-weight: 700;
  line-height: 1.35;
  text-align: center;
}

.route-node--focus {
  color: rgb(var(--v-theme-link));
}

.route-line {
  color: rgba(var(--v-theme-on-surface), 0.42);
}

.route-caption {
  grid-column: 1 / -1;
  padding-top: 16px;
  margin: 8px 0 0;
  color: rgb(var(--v-theme-on-surface));
  font-size: 0.78rem;
  font-weight: 800;
  text-align: center;
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.channel-list {
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.channel-row {
  display: grid;
  grid-template-columns: minmax(210px, 0.34fr) minmax(0, 1fr);
  gap: 32px;
  padding: 28px 4px;
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.channel-label {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  color: rgb(var(--v-theme-link));
}

.channel-label h3 {
  color: rgb(var(--v-theme-on-surface));
}

.plan-section {
  padding: 40px;
  background: rgba(var(--v-theme-secondary), 0.08);
  border-radius: 16px;
}

.plan-list {
  display: grid;
  gap: 24px;
  padding: 0;
  margin: 0;
  list-style: none;
}

.plan-list li {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 18px;
  align-items: start;
}

.plan-index {
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  color: #fff;
  font-weight: 800;
  background: #1565c0;
  border-radius: 12px;
  box-shadow: 4px 6px 14px rgba(0, 0, 0, 0.2);
}

.action-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 32px;
}

.faq-panels {
  overflow: hidden;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 14px;
}

.faq-answer {
  max-width: 75ch;
  line-height: 1.7;
}

.sources-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-left: 18px;
  margin: 0;
  font-size: 0.88rem;
  line-height: 1.55;
}

@media (max-width: 959px) {
  .hero-grid,
  .mercosur-section {
    grid-template-columns: 1fr;
  }

  .hero-title {
    max-width: 22ch;
  }

  .mercosur-section {
    gap: 32px;
  }
}

@media (max-width: 599px) {
  .foreign-import-page {
    padding-inline: 16px;
  }

  .hero-grid {
    gap: 28px;
  }

  .hero-title {
    font-size: clamp(2rem, 10vw, 2.6rem);
  }

  .answer-slab {
    grid-template-columns: 1fr;
  }

  .answer-mark {
    width: 40px;
    height: 40px;
  }

  .route-strip {
    justify-content: space-between;
  }

  .route-strip li {
    flex-direction: column;
    gap: 6px;
    text-align: center;
  }

  .route-strip li:not(:last-child)::after {
    position: absolute;
    display: none;
  }

  .document-toggle,
  .origin-toggle {
    grid-template-columns: 1fr;
  }

  .choice-toggle :deep(.v-btn) {
    justify-content: flex-start;
    padding-inline: 16px;
  }

  .section-block {
    margin-top: 48px;
  }

  .scenario-row,
  .channel-row {
    grid-template-columns: 1fr;
    gap: 12px;
    padding: 22px 0;
  }

  .mercosur-section,
  .plan-section {
    padding: 24px 18px;
    margin-inline: -4px;
  }

  .route-visual {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .route-line {
    transform: rotate(90deg);
  }

  .route-caption {
    grid-column: 1;
  }

  .action-row {
    display: grid;
  }

  .action-row :deep(.v-btn) {
    width: 100%;
  }
}

@media (prefers-reduced-motion: no-preference) {
  .decision-panel {
    animation: decision-arrival 520ms cubic-bezier(0.16, 1, 0.3, 1) both;
  }
}

@keyframes decision-arrival {
  from {
    clip-path: inset(0 0 12% 0 round 16px);
    box-shadow: 6px 10px 24px rgba(0, 0, 0, 0.14);
    transform: translateY(10px);
  }

  to {
    clip-path: inset(0 0 0 0 round 16px);
    box-shadow: 14px 20px 42px rgba(0, 0, 0, 0.2);
    transform: translateY(0);
  }
}
</style>
