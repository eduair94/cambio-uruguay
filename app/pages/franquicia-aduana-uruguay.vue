<template>
  <VContainer class="page py-6 py-md-10">
    <!-- Hero -->
    <header class="hero mb-6">
      <p class="eyebrow">Compras en el exterior · Julio 2026</p>
      <h1 class="text-h4 text-md-h3 font-weight-bold mb-2">¿Tu compra del exterior paga IVA?</h1>
      <p class="text-body-1 text-medium-emphasis mb-4">
        El régimen cambió en 2026 y hay una fecha marcada en rojo: el
        <strong>1.º de octubre</strong>. Acá está la regla que rige hoy, la que va a regir después,
        y de dónde sale cada una — con el decreto y la resolución linkeados, para que no nos creas a
        nosotros.
      </p>
      <VAlert type="info" variant="tonal" density="comfortable" icon="mdi-scale-balance">
        Todo lo de esta página sale de la <strong>Ley 20.446 art. 627</strong>, el
        <strong>Decreto 50/026</strong> y las <strong>Resoluciones Generales 09 y 21/2026</strong>
        de la Aduana. Si algo no está en una norma, lo decimos.
      </VAlert>
      <p class="text-caption text-medium-emphasis mt-3 mb-0">
        <VIcon size="14" class="mr-1">mdi-bag-suitcase-outline</VIcon>
        ¿Es equipaje que vas a traer físicamente en la valija, no una compra online?
        <NuxtLink :to="localePath('/franquicia-viajero-uruguay')">
          Es otro régimen — ver franquicia de equipaje de viajero </NuxtLink
        >.
      </p>
    </header>

    <!-- The semáforo -->
    <section class="mb-8" aria-label="Calculadora: ¿tu envío paga IVA?">
      <h2 class="section-heading mb-4">Contame tu compra</h2>

      <VCard variant="flat" class="calc pa-4 pa-sm-6">
        <VRow>
          <VCol cols="12" sm="6">
            <div class="text-overline text-medium-emphasis mb-2">¿Dónde compraste?</div>
            <VBtnToggle
              v-model="origin"
              color="primary"
              mandatory
              divided
              variant="outlined"
              class="w-100 mb-4"
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

          <VCol cols="12">
            <div class="text-overline text-medium-emphasis mb-2">¿Cómo llega el paquete?</div>
            <VBtnToggle
              v-model="channel"
              color="primary"
              mandatory
              divided
              variant="outlined"
              class="w-100 mb-1 channel-toggle"
            >
              <VBtn value="courier" class="flex-grow-1">
                <VIcon start>mdi-truck-fast-outline</VIcon>
                Courier privado
              </VBtn>
              <VBtn value="postal-ems" class="flex-grow-1">
                <VIcon start>mdi-email-fast-outline</VIcon>
                Correo EMS <span class="d-none d-sm-inline">&nbsp;(exprés)</span>
              </VBtn>
              <VBtn value="postal-simple" class="flex-grow-1">
                <VIcon start>mdi-mailbox-outline</VIcon>
                Correo no exprés
              </VBtn>
            </VBtnToggle>
            <p class="text-caption text-medium-emphasis mb-4">
              {{ channelHint }}
            </p>
          </VCol>

          <VCol cols="12" sm="6">
            <VTextField
              v-model.number="invoiceTotal"
              type="number"
              min="0"
              label="Total de la factura"
              prefix="US$"
              variant="outlined"
              density="comfortable"
              hint="Precio + sales tax + el envío que te cobra el vendedor"
              persistent-hint
            />
          </VCol>

          <VCol cols="12" sm="6">
            <VTextField
              v-model.number="franchiseAvailable"
              type="number"
              min="0"
              max="800"
              label="Franquicia que te queda este año"
              prefix="US$"
              variant="outlined"
              density="comfortable"
              hint="Arrancás con US$ 800 el 1.º de enero"
              persistent-hint
            />
          </VCol>

          <VCol cols="12" sm="6">
            <VSelect
              v-model.number="shipmentsUsed"
              :items="[0, 1, 2, 3]"
              label="Envíos con franquicia ya usados"
              variant="outlined"
              density="comfortable"
              hint="Son 3 por año como máximo"
              persistent-hint
            />
          </VCol>

          <VCol v-if="showSellerQuestion" cols="12">
            <VSwitch
              v-model="sellerRegistered"
              color="primary"
              density="comfortable"
              hide-details
              :label="`¿El vendedor está registrado ante la Aduana? (obligatorio desde el ${ENFORCED_LABEL})`"
            />
          </VCol>
        </VRow>

        <!-- The verdict -->
        <VAlert :type="verdictTone" variant="tonal" class="mt-4" :icon="verdictIcon" border="start">
          <p class="text-subtitle-1 font-weight-bold mb-1">{{ verdictTitle }}</p>
          <ul class="verdict-reasons">
            <li v-for="(r, i) in decision.reasons" :key="i">{{ r }}</li>
          </ul>
          <p v-if="taxLine" class="mt-2 mb-0 text-body-2">
            <strong>{{ taxLine }}</strong>
          </p>
        </VAlert>

        <!-- The reader is entitled to the franquicia, but the Correo form may not offer it. -->
        <VAlert
          v-if="legacyCap"
          type="warning"
          variant="tonal"
          density="comfortable"
          class="mt-3"
          icon="mdi-alert-outline"
        >
          <strong>Puede que el Correo no te ofrezca la franquicia.</strong> Su página de declaración
          todavía dice que en {{ CHANNEL_LABEL[legacyCap.channel] }} la franquicia llega hasta US$
          {{ legacyCap.capUsd }} por envío. Ese tope está <strong>derogado</strong> desde el 1.º de
          mayo de 2026 (Decreto 356/014 arts. 3 y 4, derogados por el Decreto 50/026 art. 19). Si el
          formulario te lo niega, reclamalo: no es la norma vigente.
        </VAlert>

        <p class="text-caption text-medium-emphasis mt-3 mb-0">
          <VIcon size="14" class="mr-1">mdi-calculator-variant-outline</VIcon>
          ¿Querés el número final, con flete incluido?
          <NuxtLink :to="localePath('/herramientas/calculadora-impuestos-importacion')">
            Usá la calculadora
          </NuxtLink>
          o armá el
          <NuxtLink :to="localePath('/herramientas/carrito-importacion')">
            carrito de importación </NuxtLink
          >.
        </p>
      </VCard>
    </section>

    <!-- The two regimes -->
    <section class="mb-8">
      <h2 class="section-heading mb-1">Los dos regímenes (y por qué no se mezclan)</h2>
      <p class="text-body-2 text-medium-emphasis mb-4">
        Es la confusión más cara del régimen nuevo: un envío entra en
        <strong>uno o en el otro</strong>, nunca se parte entre los dos. Si te quedan US$ 100 de
        cupo y comprás por US$ 500, <em>no</em> pagás IVA por 100 y 60% por 400: pagás
        <strong>60% de los 500</strong> (se desprende del diseño de los arts. 2 y 3 del Decreto
        50/026, no de un artículo puntual).
      </p>

      <VRow>
        <VCol cols="12" md="6">
          <VCard variant="flat" class="regime pa-5 h-100">
            <div class="d-flex align-center ga-2 mb-2">
              <VIcon color="success">mdi-check-decagram-outline</VIcon>
              <span class="text-subtitle-1 font-weight-bold">Franquicia anual</span>
            </div>
            <ul class="regime-list">
              <li><strong>US$ 800 por año</strong>, acumulados — no por envío.</li>
              <li>
                Da igual si llega por <strong>Correo</strong> (exprés o no) o por
                <strong>courier</strong>: es un único régimen y un único contador.
              </li>
              <li>Hasta <strong>3 envíos</strong> por año civil, 20 kg cada uno.</li>
              <li>No paga <strong>aranceles</strong>… pero <strong>sí paga IVA</strong>.</li>
              <li>
                Única excepción: compras de <strong>EE.UU. de hasta US$ 200</strong> → sin IVA
                (acuerdo TIFA).
              </li>
            </ul>
          </VCard>
        </VCol>

        <VCol cols="12" md="6">
          <VCard variant="flat" class="regime pa-5 h-100">
            <div class="d-flex align-center ga-2 mb-2">
              <VIcon color="warning">mdi-percent-outline</VIcon>
              <span class="text-subtitle-1 font-weight-bold">Prestación única</span>
            </div>
            <ul class="regime-list">
              <li>
                Todo lo que <strong>no entra</strong> en la franquicia (ya usaste los 3 envíos, o el
                cupo no alcanza).
              </li>
              <li>
                <strong>60% del valor</strong> de la factura, con un
                <strong>mínimo de US$ 20</strong> por envío.
              </li>
              <li>Reemplaza todo: no se le suma IVA aparte.</li>
              <li>Se aplica al <strong>envío entero</strong>, no al "excedente".</li>
            </ul>
          </VCard>
        </VCol>
      </VRow>

      <VAlert type="warning" variant="tonal" density="comfortable" class="mt-4" icon="mdi-alert">
        Por encima de <strong>US$ 800</strong> el envío no entra en ninguno de los dos: pasa al
        <strong>régimen general</strong>. Ahí, en la práctica, la Aduana
        <a
          href="https://www.aduanas.gub.uy/innovaportal/v/28223/1/innova.front/"
          target="_blank"
          rel="noopener noreferrer"
          >te va a exigir un despachante</a
        >
        — así lo dice su propia página del régimen general. La norma dice lo contrario: la
        <strong>Ley 20.446 art. 627</strong>, el <strong>Decreto 50/026 art. 17</strong> y el
        <strong>CAROU art. 15 lit. A</strong> eximen de despachante a los envíos postales, sin tope
        de valor. Es un argumento real si querés discutirlo, pero en el mostrador decide la DNA, no
        la norma. Plan de acción completo en
        <NuxtLink :to="localePath('/problemas-con-la-aduana-uruguay')">
          qué hacer si tenés problemas con la Aduana </NuxtLink
        >.
      </VAlert>
    </section>

    <!-- The channel: express vs non-express, and the cap that no longer exists -->
    <section class="mb-8">
      <h2 class="section-heading mb-1">
        Correo exprés, no exprés y courier: qué cambió (y qué te van a seguir diciendo mal)
      </h2>
      <p class="text-body-2 text-medium-emphasis mb-4">
        Hasta el <strong>30 de abril de 2026</strong>, cuánto podías traer sin pagar dependía de
        <em>cómo</em> llegaba el paquete: US$ 50 si venía por correo no exprés y US$ 200 si venía
        exprés. Eso se terminó: hoy es <strong>un solo régimen</strong> para el Correo y para
        cualquier courier privado, con un <strong>tope anual de US$ 800</strong> y sin tope por
        envío. El problema es que hay páginas oficiales que todavía publican los números viejos.
      </p>

      <div class="table-scroll">
        <table class="channel-table cu-mobile-cards">
          <thead>
            <tr>
              <th>Cómo llega</th>
              <th>Cómo lo reconocés</th>
              <th>Hasta 30/4/2026</th>
              <th>Hoy</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Correo no exprés (PP, SIMPLE)</td>
              <td data-label="Cómo lo reconocés">
                Dos letras + nueve números + dos letras: RJ284204981CN. Es el "envío gratis" de
                AliExpress, Shein o Temu y el estándar de Etsy o eBay
              </td>
              <td data-label="Hasta 30/4/2026">Franquicia solo hasta US$ 50 por envío</td>
              <td data-label="Hoy">
                <strong>Sin tope por envío</strong> — US$ 800 al año, en 3 envíos
              </td>
            </tr>
            <tr>
              <td>Correo exprés (EMS)</td>
              <td data-label="Cómo lo reconocés">
                Tracking que empieza con E: EC123456789US. Solo EMS y Casilla Mía
              </td>
              <td data-label="Hasta 30/4/2026">Franquicia solo hasta US$ 200 por envío</td>
              <td data-label="Hoy"><strong>Sin tope por envío</strong> — el mismo régimen</td>
            </tr>
            <tr>
              <td>Courier privado</td>
              <td data-label="Cómo lo reconocés">
                Lo contratás vos: Tiendamia, Exur, USX, Gripper, Punto Mío, Aeropost, DHL, UPS,
                FedEx
              </td>
              <td data-label="Hasta 30/4/2026">Era la vía "exprés": US$ 200 por envío</td>
              <td data-label="Hoy"><strong>Sin tope por envío</strong> — el mismo régimen</td>
            </tr>
          </tbody>
        </table>
      </div>

      <VAlert type="warning" variant="tonal" density="comfortable" class="mt-4" icon="mdi-alert">
        <p class="mb-2">
          <strong>Dos páginas oficiales siguen publicando el régimen viejo.</strong> La del
          <a
            href="https://www.correo.com.uy/como-declarar-su-compra-u-obsequio"
            target="_blank"
            rel="noopener noreferrer"
            >Correo Uruguayo para declarar tu compra</a
          >
          dice, en el paso 3, que la franquicia llega hasta US$ 50 si el envío es no exprés y hasta
          US$ 200 si es EMS — y en el paso 4, dos párrafos después, que podés gestionar vos hasta
          US$ 800. Se contradice sola. La de "Encomiendas Postales" de la Aduana (21/10/2025) repite
          lo mismo y agrega el mínimo de US$ 10.
        </p>
        <p class="mb-0">
          Los dos topes son los <strong>artículos 3 y 4 del Decreto 356/014</strong>, derogado por
          el <strong>artículo 19 del Decreto 50/026</strong>. La tabla oficial del MEF los ubica en
          la columna "Régimen Actual (Hasta 30/04/2026)" y los reemplaza por el tope anual de US$
          800; su guía agrega, textual: <em>"No es un tope por compra"</em>.
        </p>
      </VAlert>

      <VAlert type="info" variant="tonal" density="comfortable" class="mt-3" icon="mdi-lifebuoy">
        <strong>Si el formulario del Correo igual te niega la franquicia</strong> por superar los
        US$ 50 en un envío no exprés: no lo pagues resignado. Reclamá citando el Decreto 50/026
        (arts. 1, 3 y 19) y la guía del MEF del 24/4/2026, ante la DNA (info@aduanas.gub.uy, 2915
        0007) y ante el Correo (0800 2108 o WhatsApp 098 01 2108). Y si ya te lo retuvieron, el paso
        a paso está en
        <NuxtLink :to="localePath('/problemas-con-la-aduana-uruguay')">
          problemas con la Aduana </NuxtLink
        >.
      </VAlert>

      <p class="text-caption text-medium-emphasis mt-3 mb-0">
        <VIcon size="14" class="mr-1">mdi-information-outline</VIcon>
        Lo que sí sigue dependiendo de la modalidad: el precio, el plazo y el seguimiento. Y una
        letra chica del acuerdo con EE.UU.: el texto del TIFA habla de "envíos de entrega rápida",
        aunque la Aduana aplica la exoneración a todo envío de origen estadounidense de hasta US$
        200. Si comprás en EE.UU. y te lo mandan por correo común, tenelo en el radar.
      </p>
    </section>

    <!-- The all-or-nothing trap -->
    <section class="mb-8">
      <h2 class="section-heading mb-1">Las tres trampas que le cuestan plata a la gente</h2>
      <p class="text-body-2 text-medium-emphasis mb-4">
        Las tres salen del texto del decreto, y las tres son contraintuitivas.
      </p>
      <VCard variant="flat" class="traps pa-5">
        <ol class="trap-list">
          <li>
            <strong>Los US$ 200 son todo o nada.</strong> Una compra de EE.UU. de US$ 200 no paga
            IVA; una de US$ 201 paga IVA <em>sobre los 201</em>, no sobre el dólar de más.
          </li>
          <li>
            <strong>El tope se mide sobre el total de la factura</strong>, no sobre el precio del
            producto: entra el <em>sales tax</em> y el envío que te cobra el vendedor (Decreto
            50/026, art. 5). Una compra de US$ 180 + US$ 25 de envío + US$ 10 de impuesto
            estadounidense son <strong>US$ 215</strong>: paga IVA.
          </li>
          <li>
            <strong>El envío exonerado igual te gasta cupo.</strong> Si traés US$ 198 de EE.UU. sin
            pagar IVA, te quedan US$ 602 y <strong>dos</strong> envíos — no tres (FAQ del MEF).
          </li>
        </ol>
      </VCard>
    </section>

    <!-- FAQ: coupons / discounts and the USD 200 line -->
    <section class="mb-8">
      <h2 class="section-heading mb-1">Preguntas frecuentes</h2>
      <p class="text-body-2 text-medium-emphasis mb-4">
        Las dudas que más se repiten sobre el valor que mira la Aduana.
      </p>

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
    </section>

    <!-- What changes on Oct 1 -->
    <section class="mb-8">
      <h2 class="section-heading mb-1">Qué cambia el 1.º de octubre de 2026</h2>
      <p class="text-body-2 text-medium-emphasis mb-4">
        Hoy, para no pagar IVA en una compra de EE.UU. de hasta US$ 200, alcanza con que la compra
        sea de EE.UU. Desde el 1/10/2026 va a hacer falta, además, que el
        <strong>vendedor</strong> —el que emite la factura, no el courier— esté
        <strong>registrado ante la Aduana</strong>, y el sistema LUCIA lo valida solo: si no figura,
        no hay exoneración.
      </p>

      <VCard variant="flat" class="timeline pa-5">
        <div v-for="(step, i) in timeline" :key="i" class="tl-row">
          <div class="tl-date">{{ step.date }}</div>
          <div class="tl-body">
            <p class="mb-1">{{ step.text }}</p>
            <a :href="step.url" target="_blank" rel="noopener noreferrer" class="tl-src">
              <VIcon size="13" class="mr-1">mdi-file-document-outline</VIcon>{{ step.norm }}
            </a>
          </div>
        </div>
      </VCard>

      <VAlert type="info" variant="tonal" density="comfortable" class="mt-4" icon="mdi-history">
        <strong>Puede volver a moverse.</strong> Esta fecha ya se corrió dos veces (primero al
        1/7/2026, después al 1/10/2026), y la propia resolución que la corrió admite que "resta aún
        cumplir con varias etapas ineludibles". Vamos a actualizar esta página si se vuelve a
        prorrogar.
      </VAlert>

      <VAlert
        type="warning"
        variant="tonal"
        density="comfortable"
        class="mt-3"
        icon="mdi-help-circle-outline"
      >
        <strong>Lo que todavía no sabemos:</strong> la resolución dice que el listado de vendedores
        registrados "será de carácter público", pero la Aduana
        <strong>todavía no lo publicó</strong>. Hasta que exista, nadie —nosotros tampoco— puede
        decirte con certeza si tu vendedor va a calificar en octubre. Preferimos decirte esto antes
        que inventarte una lista.
      </VAlert>
    </section>

    <!-- Sources -->
    <VCard variant="flat" class="sources-card pa-5 mb-6">
      <h2 class="text-subtitle-2 font-weight-bold mb-2">
        <VIcon start size="small" color="primary">mdi-link-variant</VIcon>
        Las normas, sin intermediarios
      </h2>
      <ul class="sources-list">
        <li v-for="(s, i) in sources" :key="i">
          <a :href="s.url" target="_blank" rel="noopener noreferrer">{{ s.label }}</a>
        </li>
      </ul>
      <p class="text-caption text-medium-emphasis mt-3 mb-0">
        Verificado contra fuente primaria el {{ LAST_RESEARCHED_LABEL }}. Ojo: la página
        "Encomiendas Postales" de la <strong>Aduana</strong> todavía describe el régimen
        <strong>derogado</strong> (mínimo de US$ 10, US$ 200 por envío) — si la leés, te va a
        confundir. Lo mismo el paso 3 de la página del <strong>Correo</strong> para declarar, con
        sus topes de US$ 50 y US$ 200 por envío: los citamos abajo justamente para que puedas
        verificar que ya no rigen.
      </p>
    </VCard>

    <VAlert type="warning" variant="tonal" density="comfortable" icon="mdi-alert-outline">
      Información <strong>de referencia</strong>, no asesoramiento profesional. El régimen tiene
      excepciones (libros, medicamentos, obsequios) y la Aduana resuelve caso a caso. Verificá con
      la Dirección Nacional de Aduanas antes de comprar.
    </VAlert>
  </VContainer>
</template>

<script setup lang="ts">
import {
  CHANNEL_LABEL,
  FRANCHISE_ANNUAL_USD,
  LAST_RESEARCHED,
  SIMPLIFIED_MIN_USD,
  SIMPLIFIED_RATE_PCT,
  USA_IVA_EXEMPTION_USD,
  isSellerRegistryEnforced,
  resolveRegime,
  type ArrivalChannel,
} from '~/utils/importRules'
import { regimeRulesFromPayload } from '~/utils/regimeOverlay'
import { URUGUAY } from '~/utils/calculators'

const localePath = useLocalePath()

// Live regime figures from /api/aduana (amounts + the Oct seller-registry date), deep-merged over
// the static baseline so a missing/garbage payload can never drop a rule. The semáforo, the verdict
// and the "desde X" label all read this, so a prórroga or amount change shows up without a redeploy.
const { data: aduanaData } = await useFetch('/api/aduana', { key: 'aduana-overlay' })
const overlay = computed(() => regimeRulesFromPayload(aduanaData.value))
const rules = computed(() => overlay.value.rules)

const origin = ref<'usa' | 'other'>('usa')
const channel = ref<ArrivalChannel>('courier')
const invoiceTotal = ref(150)
const franchiseAvailable = ref(FRANCHISE_ANNUAL_USD)
const shipmentsUsed = ref(0)
const sellerRegistered = ref(true)

/** Only ask about the seller once the answer can actually change the outcome (live date). */
const showSellerQuestion = computed(
  () => origin.value === 'usa' && isSellerRegistryEnforced(new Date(), rules.value)
)

const decision = computed(() =>
  resolveRegime(
    {
      valueUsd: invoiceTotal.value || 0,
      origin: origin.value,
      franchiseAvailableUsd: franchiseAvailable.value || 0,
      shipmentsUsed: shipmentsUsed.value || 0,
      useFranchise: true,
      sellerRegistered: sellerRegistered.value,
      channel: channel.value,
    },
    rules.value
  )
)

/**
 * What the chosen channel means. Since 1/5/2026 the modality has no fiscal effect (Decreto 50/026
 * art. 1: "operadores postales, públicos o privados"), so this only helps the reader identify the
 * channel — and warns them about the ceiling Correo's page still publishes.
 */
const channelHint = computed(() => {
  if (channel.value === 'courier') {
    return 'Lo contratás vos: Tiendamia, Exur, USX, Gripper, Punto Mío, Aeropost, DHL, UPS, FedEx.'
  }
  if (channel.value === 'postal-ems') {
    return 'Correo Uruguayo EMS / Casilla Mía: el tracking empieza con E (ej. EC123456789US).'
  }
  return 'Envío estándar del Correo (PP, SIMPLE): dos letras + nueve números + dos letras (ej. RJ284204981CN). Acá cae el "envío gratis" de AliExpress, Shein o Temu.'
})

/** The old per-modality ceiling this parcel would have blown, when Correo's page may still apply it. */
const legacyCap = computed(() => decision.value.legacyChannelCap)

const verdictTone = computed(() => {
  if (decision.value.regime === 'general') return 'warning'
  return decision.value.ivaExempt ? 'success' : 'info'
})
const verdictIcon = computed(() => {
  if (decision.value.regime === 'general') return 'mdi-alert-outline'
  return decision.value.ivaExempt ? 'mdi-check-circle-outline' : 'mdi-cash'
})
const verdictTitle = computed(() => {
  if (decision.value.regime === 'general') return 'Este envío no entra en el régimen simplificado'
  if (decision.value.ivaExempt) return 'No pagás IVA'
  if (decision.value.regime === 'franquicia') return 'Usás la franquicia, pero pagás IVA'
  return `Pagás la prestación única (${rules.value.simplifiedRatePct}%)`
})

/** The money line, computed from the same sourced rules the calculator uses. */
const taxLine = computed(() => {
  const v = invoiceTotal.value || 0
  const d = decision.value
  if (d.regime === 'general') return null
  if (d.regime === 'simplificado') {
    const tax = Math.max(
      (v * rules.value.simplifiedRatePct) / 100,
      v > 0 ? rules.value.simplifiedMinUsd : 0
    )
    return `Impuesto estimado: US$ ${tax.toFixed(2)}`
  }
  if (d.ivaExempt) return 'Impuesto estimado: US$ 0,00'
  const iva = (v * URUGUAY.iva.basica) / 100
  return `IVA estimado (${URUGUAY.iva.basica}%): US$ ${iva.toFixed(2)}`
})

// Reactive to the live overlay: a prórroga moves this "desde X" label without a redeploy.
const ENFORCED_LABEL = computed(() => formatDate(rules.value.sellerRegistryEnforcedFrom))
const LAST_RESEARCHED_LABEL = formatDate(LAST_RESEARCHED)

function formatDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`)
  return d.toLocaleDateString('es-UY', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

const timeline = [
  {
    date: 'Mayo 2026',
    text: `Arranca el régimen nuevo: franquicia de US$ ${FRANCHISE_ANNUAL_USD} al año en 3 envíos, y prestación única del ${SIMPLIFIED_RATE_PCT}% con mínimo de US$ ${SIMPLIFIED_MIN_USD} para todo lo demás. Los envíos que hiciste antes, en 2026, igual te consumieron cupo: el contador no se reinició.`,
    norm: 'Decreto 50/026',
    url: 'https://www.impo.com.uy/bases/decretos/50-2026',
  },
  {
    date: '20 de abril de 2026',
    text: `La Aduana crea el registro de vendedores extranjeros. Sin vendedor registrado no hay exoneración de IVA para las compras de EE.UU. de hasta US$ ${USA_IVA_EXEMPTION_USD}.`,
    norm: 'Resolución General 09/2026',
    url: 'https://www.aduanas.gub.uy/innovaportal/file/28428/1/resolucion-9_2026.pdf',
  },
  {
    date: '25 de junio de 2026',
    text: 'La Aduana prorroga —por segunda vez— la exigibilidad de ese requisito, ahora hasta el 1.º de octubre de 2026. Es la razón por la que hoy todavía no te preguntan por el vendedor.',
    norm: 'Resolución General 21/2026',
    url: 'https://www.aduanas.gub.uy/innovaportal/file/28613/1/rg-21-2026.pdf',
  },
  {
    date: '1.º de octubre de 2026',
    text: 'Empieza a exigirse. El sistema LUCIA valida automáticamente que el emisor de la factura esté registrado; si no figura, el envío pierde la exoneración y paga IVA.',
    norm: 'RG 09/2026, num. 13',
    url: 'https://www.aduanas.gub.uy/innovaportal/file/28428/1/resolucion-9_2026.pdf',
  },
]

const sources = [
  {
    label: 'Ley 20.446, art. 627 — prestación única del 60%, mínimo US$ 20 por envío',
    url: 'https://www.impo.com.uy/bases/leyes/20446-2025/627',
  },
  {
    label:
      'Decreto 50/026 — franquicia y valor de la factura (art. 5); los dos regímenes son alternativos (arts. 2 y 3); el art. 15 regula el incumplimiento',
    url: 'https://www.impo.com.uy/bases/decretos/50-2026',
  },
  {
    label: 'DNA — Valor en aduana: método del valor de transacción (precio realmente pagado)',
    url: 'https://www.aduanas.gub.uy/innovaportal/v/2806/8/innova.front/valor-en-aduana.html',
  },
  {
    label: 'OMC — Valoración en aduana (Acuerdo relativo al art. VII del GATT)',
    url: 'https://www.wto.org/spanish/tratop_s/cusval_s/cusval_info_s.htm',
  },
  {
    label: 'Resolución General 09/2026 (Aduana) — registro de vendedores y validación en LUCIA',
    url: 'https://www.aduanas.gub.uy/innovaportal/file/28428/1/resolucion-9_2026.pdf',
  },
  {
    label: 'Resolución General 21/2026 (Aduana) — prórroga al 1.º de octubre de 2026',
    url: 'https://www.aduanas.gub.uy/innovaportal/file/28613/1/rg-21-2026.pdf',
  },
  {
    label: 'Ley 18.761 — acuerdo TIFA con EE.UU. (art. 7, lit. g): envíos de hasta US$ 200',
    url: 'https://www.impo.com.uy/bases/leyes-internacional/18761-2011',
  },
  {
    label: 'MEF — guía de preguntas frecuentes del régimen de envíos postales',
    url: 'https://www.gub.uy/ministerio-economia-finanzas/comunicacion/noticias/guia-preguntas-frecuentes-sobre-regimen-envios-postales-franquicias',
  },
  {
    label:
      'Correo Uruguayo — «Cómo declarar su compra u obsequio»: cómo se declara, formato del tracking y medio de pago (ojo: su paso 3 todavía publica los topes derogados de US$ 50 / US$ 200 por envío)',
    url: 'https://www.correo.com.uy/como-declarar-su-compra-u-obsequio',
  },
  {
    label:
      'Decreto 356/014 (texto original) — arts. 3 y 4: de ahí salían los US$ 50 del correo no exprés y los US$ 200 del exprés, hoy derogados',
    url: 'https://www.impo.com.uy/bases/decretos-originales/356-2014',
  },
  {
    label:
      'MEF — el régimen nuevo explicado, con la tabla que ubica los US$ 50 / US$ 200 en «Hasta 30/04/2026»',
    url: 'https://www.gub.uy/ministerio-economia-finanzas/comunicacion/noticias/gobierno-reglamenta-regimen-para-envios-postales-internacionales',
  },
  {
    label:
      'Correo Uruguayo — preguntas frecuentes sobre encomiendas internacionales: obsequio familiar, IMESI, medio de pago, 20 kg, varios paquetes',
    url: 'https://www.correo.com.uy/sobre-encomiendas-internacionales',
  },
  {
    label: 'Correo Uruguayo — declarar el envío (plataforma Ahíva)',
    url: 'https://ahiva.correo.com.uy/aduanas-web/login',
  },
  {
    label: 'DNA — consultá cuánta franquicia te queda este año (requiere usuario gub.uy)',
    url: 'https://aplicaciones.aduanas.gub.uy/LuciapubX/DECLARACIONES.Cargas.HWCantEncPostales.aspx',
  },
]

// FAQ — the value Aduana actually looks at. `a` is HTML (rendered), `aText` is the plain-text twin
// used in the FAQPage schema. Every figure/claim is sourced above; verified against Decreto 50/026
// art. 5, la DNA (valor en aduana) y el Acuerdo de Valoración de la OMC.
const faqs = [
  {
    q: 'Uso un cupón de descuento en el carrito que deja el producto abajo de US$ 200. ¿Entra por franquicia o pago 60%?',
    a: 'Entra por franquicia y, si es una compra de <strong>EE.UU.</strong>, además queda <strong>sin IVA</strong> —siempre que el cupón esté realmente aplicado y el <strong>total de la factura</strong> no supere los US$ 200—. La Aduana mira el total de la factura de compra <em>ya con el descuento restado</em> (<a href="https://www.impo.com.uy/bases/decretos/50-2026/5" target="_blank" rel="noopener noreferrer">Decreto 50/026, art. 5</a>), no el precio de lista. Es el método de <strong>valor de transacción</strong> de la OMC: el valor es “el precio realmente pagado o por pagar”, así que un descuento genuino no se “vuelve a sumar” (<a href="https://www.aduanas.gub.uy/innovaportal/v/2806/8/innova.front/valor-en-aduana.html" target="_blank" rel="noopener noreferrer">DNA — valor en aduana</a>). <strong>Ojo con el malentendido más común:</strong> cruzar los US$ 200 <em>no</em> te lleva al 60% —te prende el <strong>IVA (~22%)</strong>—. El 60% (prestación única) es el régimen <em>alternativo</em>, para cuando NO usás la franquicia (agotaste los 3 envíos o el tope de US$ 800 del año).',
    aText:
      'Sí, entra por franquicia y, si es compra de EE.UU., queda sin IVA, siempre que el cupón esté realmente aplicado y el total de la factura no supere los US$ 200. La Aduana valora sobre el total de la factura de compra ya con el descuento restado (Decreto 50/026, art. 5), no sobre el precio de lista. Es el método de valor de transacción de la OMC: el valor es el precio realmente pagado, así que un descuento genuino no se vuelve a sumar. Importante: cruzar los US$ 200 no te lleva al 60%, te prende el IVA (~22%). El 60% (prestación única) es el régimen alternativo, para cuando no usás la franquicia (agotaste los 3 envíos o el tope de US$ 800 del año).',
  },
  {
    q: '¿La Aduana puede desconocer el descuento y cobrarme igual?',
    a: 'Si es un cupón <strong>real y reflejado en la factura o comprobante</strong>, se sostiene: guardá ese comprobante con el descuento ya aplicado. La Aduana puede exigir la factura o la declaración de valor (art. 5) y, ante una <em>“duda razonable”</em>, cuestionar y revaluar un valor artificialmente bajo (control antisubfacturación, previsto en el Acuerdo de Valoración de la OMC). Un descuento <strong>genuino</strong> —pactado al momento de la compra, no inventado ni fuera de la factura— se defiende sin problema.',
    aText:
      'Si el cupón es real y está reflejado en la factura o comprobante, se sostiene: guardá ese comprobante con el descuento ya aplicado. La Aduana puede exigir la factura o la declaración de valor (art. 5) y, ante una duda razonable, cuestionar y revaluar un valor artificialmente bajo (control antisubfacturación del Acuerdo de Valoración de la OMC). Un descuento genuino, pactado al momento de la compra y reflejado en la factura, se defiende sin problema.',
  },
  {
    q: 'Entonces, ¿los US$ 200 son el tope de la franquicia?',
    a: 'No, son dos límites distintos. El tope de la <strong>franquicia es US$ 800 al año</strong> (en un máximo de 3 envíos). Los <strong>US$ 200</strong> son la línea del <strong>IVA</strong> para compras de EE.UU. (acuerdo <strong>TIFA</strong>): hasta ahí, 0% de IVA; un dólar más y pagás IVA sobre el total. Y es el <strong>total final</strong>: precio − cupón + <em>sales tax</em> + el envío que te cobre el vendedor. Si el sales tax lo empuja de nuevo arriba de US$ 200, perdés la exoneración.',
    aText:
      'No, son dos límites distintos. El tope de la franquicia es US$ 800 al año (máximo 3 envíos). Los US$ 200 son la línea del IVA para compras de EE.UU. (acuerdo TIFA): hasta ahí 0% de IVA; un dólar más y pagás IVA sobre el total. Y es el total final: precio − cupón + sales tax + el envío que cobre el vendedor. Si el sales tax lo empuja de nuevo arriba de US$ 200, perdés la exoneración.',
  },
  {
    q: 'Mi envío llega por correo no exprés. ¿Puedo usar la franquicia igual?',
    a: 'Sí. Desde el 1.º de mayo de 2026 la modalidad <strong>ya no cambia nada</strong>: el Decreto 50/026 (art. 1) regula por igual los envíos de los <em>"operadores postales, públicos o privados"</em>, así que el Correo y un courier comparten régimen, tope anual y contador de franquicia. Los viejos límites por envío —<strong>US$ 50</strong> para el correo no exprés y <strong>US$ 200</strong> para el exprés— eran los arts. 3 y 4 del <strong>Decreto 356/014</strong>, <strong>derogado</strong> por el art. 19 del 50/026. La tabla del MEF los pone en la columna "Hasta 30/04/2026" y su guía dice, textual: <em>"No es un tope por compra"</em>. <strong>Pero ojo:</strong> la <a href="https://www.correo.com.uy/como-declarar-su-compra-u-obsequio" target="_blank" rel="noopener noreferrer">página del Correo para declarar</a> todavía publica los topes viejos en el paso 3 (y se contradice en el paso 4). Si el formulario te niega la franquicia, reclamá: no es la norma vigente. Igual te conviene saber cómo llega tu paquete: el exprés son <em>solo</em> los EMS (tracking que empieza con E, ej. <code>EC123456789US</code>); el no exprés es dos letras + nueve números + dos letras, como <code>RJ284204981CN</code>, y ahí caen el "envío gratis" de AliExpress, Shein o Temu.',
    aText:
      'Sí. Desde el 1 de mayo de 2026 la modalidad ya no cambia nada: el Decreto 50/026 art. 1 regula por igual a los operadores postales públicos o privados, así que el Correo y un courier comparten régimen, tope anual y contador de franquicia. Los viejos límites por envío (US$ 50 para correo no exprés y US$ 200 para exprés) eran los arts. 3 y 4 del Decreto 356/014, derogado por el art. 19 del 50/026; la tabla del MEF los ubica en la columna "Hasta 30/04/2026" y su guía dice "No es un tope por compra". Pero la página del Correo para declarar todavía publica los topes viejos en el paso 3 y se contradice en el paso 4: si el formulario te niega la franquicia, reclamá. Para identificar la modalidad: el exprés son solo los EMS (tracking que empieza con E, por ejemplo EC123456789US) y el no exprés es dos letras + nueve números + dos letras, como RJ284204981CN.',
  },
  {
    q: 'Me manda un regalo un familiar del exterior. ¿Paga impuestos?',
    a: 'No, si es un <strong>obsequio familiar</strong> genuino. El art. 3 del Decreto 50/026 exonera de <em>todo tributo</em> —incluido el IVA— a los envíos con obsequios familiares, y el Correo lo define así: envío <strong>no comercial entre las partes</strong>, remitido y consignado por <strong>personas físicas</strong>, con mercadería en <strong>cantidades razonables</strong>, nueva o usada, para uso o consumo personal del destinatario. Dos detalles que importan: el obsequio <strong>igual usa un envío de tu cupo de 3</strong> y sigue sujeto a los topes anuales, y para acreditar el valor no se presenta factura sino una <strong>declaración de valor</strong>. En los obsequios no te piden el medio de pago; en las compras sí.',
    aText:
      'No, si es un obsequio familiar genuino. El art. 3 del Decreto 50/026 exonera de todo tributo, incluido el IVA, a los envíos con obsequios familiares, y el Correo los define como envío no comercial entre las partes, remitido y consignado por personas físicas, con mercadería en cantidades razonables, nueva o usada, para uso o consumo personal del destinatario. El obsequio igual usa un envío del cupo de 3 y sigue sujeto a los topes anuales; el valor se acredita con una declaración de valor, no con factura. En los obsequios no se pide el medio de pago; en las compras sí.',
  },
  {
    q: '¿Qué no puedo traer nunca por este régimen?',
    a: 'Todo lo <strong>gravado por IMESI</strong> queda fuera de la franquicia y del régimen simplificado: bebidas alcohólicas y bebidas sin alcohol concentradas (incluidos suplementos nutricionales concentrados), tabaco y cigarrillos, aceites y grasas lubricantes, y <strong>perfumería y cosméticos</strong> —el que más sorprende—. Tampoco entran los productos de origen animal y vegetal no autorizados (listado del MGAP) ni lo prohibido por seguridad: inflamables, gases comprimidos, explosivos, corrosivos, armas, baterías de litio sueltas y líquidos. Los <strong>lentes de sol</strong> se pueden traer hasta <strong>dos unidades, una sola vez</strong>, y requieren certificado del Sector Óptico del MSP por VUCE antes de liberarse.',
    aText:
      'Todo lo gravado por IMESI queda fuera: bebidas alcohólicas, bebidas sin alcohol concentradas y suplementos concentrados, tabaco y cigarrillos, aceites y grasas lubricantes, y perfumería y cosméticos. Tampoco entran productos de origen animal y vegetal no autorizados (listado del MGAP) ni lo prohibido por seguridad: inflamables, gases comprimidos, explosivos, corrosivos, armas, baterías de litio sueltas y líquidos. Los lentes de sol se pueden traer hasta dos unidades, una sola vez, con certificado del Sector Óptico del MSP tramitado por VUCE.',
  },
  {
    q: 'El vendedor me mandó la compra en varios paquetes. ¿Qué hago?',
    a: 'Una <strong>declaración por cada paquete</strong>, aunque compartan la misma factura: así lo exige la Aduana y lo confirma el Correo. Y cada paquete se cuenta como un envío, así que una compra partida en tres te puede consumir <strong>los tres usos de franquicia del año</strong>. Si podés, pedile al vendedor que lo mande junto. Ojo también con el peso: por encima de <strong>20 kg</strong> el envío sale del régimen y necesita despachante.',
    aText:
      'Una declaración por cada paquete, aunque compartan la misma factura. Cada paquete cuenta como un envío, así que una compra partida en tres puede consumirte los tres usos de franquicia del año; conviene pedirle al vendedor que lo mande junto. Por encima de 20 kg el envío sale del régimen y necesita despachante.',
  },
  {
    q: '¿Qué datos de la tarjeta tengo que dar al declarar?',
    a: 'Los <strong>últimos cuatro números</strong> de la tarjeta de crédito o débito internacional, el <strong>nombre completo del titular tal como figura en el plástico</strong> y el <strong>emisor</strong> (Visa, Mastercard, Diners…). No hace falta el banco. Podés usar una <strong>extensión</strong> de la tarjeta de otra persona siempre que tu nombre completo figure en el plástico. Lo que no se puede es que el titular del pago, el de la compra y el destinatario sean personas distintas: ahí perdés la franquicia (Decreto 50/026, art. 4 lit. e). Y los datos personales tienen que coincidir <strong>letra por letra con la cédula</strong>: la DNA los cruza con Identificación Civil.',
    aText:
      'Los últimos cuatro números de la tarjeta, el nombre completo del titular tal como figura en el plástico y el emisor (Visa, Mastercard, Diners). No hace falta el banco. Se puede usar una extensión de la tarjeta de otra persona si tu nombre completo figura en el plástico. El titular del pago, el de la compra y el destinatario deben ser la misma persona (Decreto 50/026 art. 4 lit. e), y los datos deben coincidir exactamente con la cédula porque la DNA los cruza con Identificación Civil.',
  },
  {
    q: '¿Puedo traer mercadería para revender?',
    a: 'Con la <strong>franquicia no</strong>: es solo para uso o consumo personal, y el propio Correo pone el ejemplo —dos camisas se presumen personales; diez o veinte, comerciales—. Pero con el <strong>régimen de prestación única (60%) sí</strong>: el Correo confirma que se puede ingresar mercadería para vender en plaza pagando el 60% del valor, hasta US$ 800 y 20 kg, sin despachante. Tampoco podés recibir un envío <strong>a nombre de una empresa</strong> ni siendo <strong>menor de edad</strong>: el régimen es de personas físicas mayores de edad.',
    aText:
      'Con la franquicia no: es solo para uso o consumo personal (el Correo ejemplifica que dos camisas se presumen personales y diez o veinte, comerciales). Con el régimen de prestación única del 60% sí se puede ingresar mercadería para vender en plaza, hasta US$ 800 y 20 kg, sin despachante. No se puede recibir un envío a nombre de una empresa ni siendo menor de edad: el régimen es para personas físicas mayores de edad.',
  },
  {
    q: '¿Y si no declaro o no voy a pagar?',
    a: 'Si no declarás, el envío <strong>queda retenido</strong> por la Aduana y se te acumulan demoras y costos de depósito. Y hay un reloj: pasados <strong>30 días</strong> de retenido, el Correo avisa que el envío se declara <strong>en abandono</strong> (la Ley 20.446 art. 631 fija 30 días desde el ingreso cuando hubo incumplimiento y no pagaste los tributos, y 90 días si simplemente no lo retiraste). Perdido el plazo, perdiste la mercadería. Si tu paquete ya está trabado, tenemos el paso a paso.',
    aText:
      'Si no declarás, el envío queda retenido por la Aduana y se acumulan demoras y costos de depósito. Pasados 30 días de retenido el Correo avisa que el envío se declara en abandono; la Ley 20.446 art. 631 fija 30 días desde el ingreso cuando hubo incumplimiento y no se pagaron los tributos, y 90 días si simplemente no se retiró. Vencido el plazo se pierde la mercadería.',
  },
]

// --- SEO ---
const canonicalUrl = 'https://cambio-uruguay.com/franquicia-aduana-uruguay'
const title = 'Franquicia y aduana en Uruguay 2026: ¿tu compra del exterior paga IVA?'
const description =
  'Qué regla rige hoy y qué cambia el 1.º de octubre de 2026. Franquicia de US$ 800 en 3 envíos, prestación única del 60% (mínimo US$ 20), la exoneración de IVA para compras de EE.UU. de hasta US$ 200, y por qué los topes de US$ 50 (correo no exprés) y US$ 200 (EMS) que todavía publica el Correo están derogados desde mayo de 2026.'

defineOgImageComponent('Cambio', {
  title: '¿Tu compra del exterior paga IVA?',
  subtitle: 'Franquicia, aduana y el cambio del 1/10/2026',
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
        'franquicia aduana uruguay, comprar en el exterior uruguay, iva compras exterior, courier uruguay impuestos, decreto 50/026, us$ 800 franquicia, tiendamia iva, aduana 1 de octubre 2026, cupon descuento aduana, descuento valor factura aduana, us 200 iva ee.uu., envio no expreso correo uruguayo, franquicia 50 dolares correo, ems casilla mia franquicia, declarar compra correo uruguayo, obsequio familiar aduana uruguay',
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
.calc,
.regime,
.traps,
.timeline,
.sources-card {
  border: 1px solid rgba(var(--v-border-color), 0.14);
  border-radius: 14px;
}
.verdict-reasons {
  margin: 0;
  padding-left: 18px;
  font-size: 0.88rem;
  line-height: 1.6;
}
.channel-toggle .v-btn {
  font-size: 0.78rem;
}
.table-scroll {
  overflow-x: auto;
}
.channel-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.88rem;
}
.channel-table th,
.channel-table td {
  padding: 10px 12px;
  border-bottom: 1px solid rgba(var(--v-border-color), 0.14);
  text-align: left;
  vertical-align: top;
  line-height: 1.5;
}
.channel-table thead th {
  font-weight: 700;
  font-size: 0.74rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: rgba(var(--v-theme-on-surface), 0.6);
}
.channel-table tbody td:first-child {
  font-weight: 700;
}
.regime-list,
.trap-list {
  margin: 0;
  padding-left: 18px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 0.9rem;
  line-height: 1.6;
}
.tl-row {
  display: grid;
  grid-template-columns: 160px 1fr;
  gap: 14px;
  padding: 12px 0;
  border-bottom: 1px dashed rgba(var(--v-border-color), 0.18);
}
.tl-row:last-child {
  border-bottom: none;
}
.tl-date {
  font-size: 0.78rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: rgb(var(--v-theme-primary));
}
.tl-body p {
  font-size: 0.9rem;
  line-height: 1.6;
}
.tl-src {
  font-size: 0.76rem;
  display: inline-flex;
  align-items: center;
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
@media (max-width: 600px) {
  .tl-row {
    grid-template-columns: 1fr;
    gap: 4px;
  }
}
.faq {
  border: 1px solid rgba(var(--v-border-color), 0.14);
  border-radius: 14px;
}
.faq-q {
  font-weight: 700;
  font-size: 0.95rem;
}
.faq-a {
  font-size: 0.9rem;
  line-height: 1.65;
}
.faq-a :deep(a),
.faq-a a {
  color: rgb(var(--v-theme-link));
  font-weight: 600;
  text-decoration: none;
}
.faq-a :deep(a):hover,
.faq-a a:hover {
  text-decoration: underline;
}
</style>
