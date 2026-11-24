<template>
  <VContainer class="sin-publicidad py-6">
    <header class="sin-publicidad__head">
      <h1 class="text-h4 font-weight-bold mb-3">Navegá sin anuncios</h1>
      <p class="text-body-1 sin-publicidad__lead">
        Con un aporte único, tu cuenta queda sin anuncios durante {{ AD_FREE_MONTHS }} meses, en
        todos los dispositivos donde inicies sesión. No es una suscripción: no se renueva sola y no
        te vamos a cobrar nada más.
      </p>
    </header>

    <!-- Back from the payment page -->
    <VAlert
      v-if="returnState === 'confirming'"
      type="info"
      variant="tonal"
      class="mb-6"
      role="status"
    >
      <div class="d-flex align-center ga-3">
        <VProgressCircular indeterminate size="20" width="2" />
        <span>Confirmando tu pago…</span>
      </div>
    </VAlert>
    <VAlert
      v-else-if="returnState === 'approved'"
      type="success"
      variant="tonal"
      class="mb-6"
      role="status"
    >
      <div class="font-weight-bold mb-1">¡Gracias por tu aporte!</div>
      <span v-if="summary?.until">
        Tu cuenta no tiene anuncios hasta el {{ formatDay(summary.until) }}.
      </span>
      <template v-if="store.user?.email">Te mandamos la confirmación por correo.</template>
    </VAlert>
    <VAlert
      v-else-if="returnState === 'pending'"
      type="info"
      variant="tonal"
      class="mb-6"
      role="status"
    >
      <div class="font-weight-bold mb-1">Tu pago está pendiente</div>
      Si pagaste en efectivo (Abitab o RedPagos) o el medio de pago lo está revisando, la cuenta
      queda sin anuncios sola apenas se acredite. No tenés que hacer nada más.
    </VAlert>
    <VAlert
      v-else-if="returnState === 'failed'"
      type="warning"
      variant="tonal"
      class="mb-6"
      role="status"
    >
      <div class="font-weight-bold mb-1">El pago no se completó</div>
      No se te cobró nada. Podés intentarlo de nuevo, con otro medio si querés.
    </VAlert>
    <VAlert
      v-else-if="returnState === 'unknown'"
      type="info"
      variant="tonal"
      class="mb-6"
      role="status"
    >
      Todavía no tenemos la confirmación {{ returnProviderName }}. Si el pago salió, la cuenta queda
      sin anuncios sola en unos minutos.
      <VBtn variant="text" size="small" class="ml-1" @click="confirmReturn">Volver a revisar</VBtn>
    </VAlert>

    <VAlert
      v-if="summary?.active && returnState !== 'approved'"
      type="success"
      variant="tonal"
      class="mb-6"
    >
      <template v-if="summary.complimentary">
        Tu cuenta es del equipo del sitio: no tiene anuncios.
      </template>
      <template v-else>
        Tu cuenta no tiene anuncios hasta el <strong>{{ formatDay(summary.until!) }}</strong
        >. Si aportás de nuevo, los {{ AD_FREE_MONTHS }} meses nuevos se suman al final.
      </template>
    </VAlert>

    <div class="sin-publicidad__grid">
      <!-- Spacing is owned here, not by utility classes: 8px inside a group, 24px between groups
           (DESIGN.md). A utility on an element whose class also sets that side loses silently;
           tests/unit/utilitySpacingConflict.test.ts catches it. -->
      <VCard variant="outlined" class="sin-publicidad__card">
        <h2 class="text-h6 font-weight-bold sin-publicidad__card-title">Elegí tu aporte</h2>

        <VAlert v-if="!providers.length" type="info" variant="tonal" density="compact">
          Los aportes todavía no están habilitados. Mientras tanto podés apoyar el sitio desde la
          portada, con una donación que no quita los anuncios.
        </VAlert>

        <div v-else class="sin-publicidad__form">
          <!-- Two payment media as two pressable tiles (currency + what each accepts): the choice
               reads at a glance and wraps on a phone, which a segmented toggle did not. -->
          <div
            v-if="providers.length > 1"
            class="sin-publicidad__providers"
            role="group"
            aria-label="Moneda y medio de pago"
          >
            <button
              v-for="p in providers"
              :key="p"
              type="button"
              class="sin-publicidad__provider"
              :class="{ 'is-active': provider === p }"
              :aria-pressed="provider === p"
              @click="provider = p"
            >
              <span class="sin-publicidad__provider-name">{{ PROVIDER_LABEL[p].toggle }}</span>
              <span class="sin-publicidad__provider-methods">{{ PROVIDER_LABEL[p].methods }}</span>
            </button>
          </div>
          <p v-else class="text-body-2 text-medium-emphasis">
            {{ PROVIDER_LABEL[provider].methods }}
          </p>

          <div class="sin-publicidad__group">
            <VChipGroup
              v-model="choice"
              mandatory
              column
              selected-class="text-primary"
              aria-label="Monto del aporte"
            >
              <VChip
                v-for="value in limits.suggested"
                :key="value"
                :value="value"
                variant="outlined"
                size="large"
                filter
              >
                {{ formatAdFreeAmount(value, limits.currency) }}
                <!-- The middle amount is the default and is labelled as the suggestion: the anchor
                     that most people keep. Never «el más elegido»: there is no data that says so. -->
                <span v-if="value === suggestedDefault" class="sin-publicidad__pill">sugerido</span>
              </VChip>
              <VChip value="other" variant="outlined" size="large" filter>Otro monto</VChip>
            </VChipGroup>

            <VTextField
              v-if="choice === 'other'"
              v-model="custom"
              type="number"
              inputmode="decimal"
              :min="limits.min"
              :max="limits.max"
              :step="limits.decimals ? '0.01' : '1'"
              :prefix="limits.currency === 'USD' ? 'US$' : '$'"
              :label="`Tu monto (mínimo ${formatAdFreeAmount(limits.min, limits.currency)})`"
              :error-messages="customError ? [customError] : []"
              hide-details="auto"
              density="comfortable"
              class="sin-publicidad__amount"
              @keydown.enter.prevent="start"
            />

            <p v-if="validAmount" class="text-body-2 text-medium-emphasis">
              Equivale a
              <strong>{{ monthlyEquivalent(validAmount, limits.currency) }} por mes</strong>
              sin anuncios, pagado una sola vez.
            </p>
          </div>

          <div class="sin-publicidad__group">
            <VAlert v-if="error" type="error" variant="tonal" density="compact">
              {{ error }}
            </VAlert>

            <!-- One button, signed in or not: the amount is chosen first and the sign-in comes only
                 when it is needed, then the checkout continues by itself (`continueAfterSignIn`). -->
            <VBtn
              color="primary"
              size="large"
              block
              class="text-none sin-publicidad__cta"
              :loading="starting"
              :disabled="!validAmount"
              @click="start"
            >
              {{
                validAmount
                  ? `Aportar ${formatAdFreeAmount(validAmount, limits.currency)} con ${PROVIDER_LABEL[provider].name}`
                  : 'Elegí un monto'
              }}
            </VBtn>
            <p v-if="!store.isLoggedIn" class="text-body-2 text-medium-emphasis">
              Te vamos a pedir que inicies sesión (Google, Discord o correo): el beneficio queda en
              tu cuenta y así funciona en el celular, la compu y donde entres.
            </p>
          </div>

          <ul class="sin-publicidad__trust" aria-label="Garantías del aporte">
            <li>
              <VIcon size="16">mdi-lock</VIcon>
              Pagás en la página de {{ PROVIDER_LABEL[provider].name }}: nunca vemos tu tarjeta.
            </li>
            <li>
              <VIcon size="16">mdi-calendar-check</VIcon>
              Pago único: sin renovación ni cobros automáticos.
            </li>
            <li>
              <VIcon size="16">mdi-cash-refund</VIcon>
              Si te arrepentís, te lo devolvemos dentro de los 5 días hábiles.
            </li>
          </ul>
        </div>
      </VCard>

      <section class="sin-publicidad__includes" aria-labelledby="sp-includes">
        <h2 id="sp-includes" class="text-h6 font-weight-bold mb-3">Qué incluye</h2>
        <ul class="sin-publicidad__list">
          <li>
            <VIcon color="success" size="20">mdi-check-circle</VIcon>
            <span
              ><strong>Sin anuncios en todo el sitio</strong>: ni los automáticos ni los de las
              páginas, tampoco la fila patrocinada.</span
            >
          </li>
          <li>
            <VIcon color="success" size="20">mdi-check-circle</VIcon>
            <span
              ><strong>En todos tus dispositivos</strong>: alcanza con iniciar sesión con la misma
              cuenta.</span
            >
          </li>
          <li>
            <VIcon color="success" size="20">mdi-check-circle</VIcon>
            <span
              ><strong>Todo lo demás sigue igual</strong>: cotizaciones, herramientas, alertas y
              directorios son gratis para todos, aportes o no.</span
            >
          </li>
          <li>
            <VIcon color="success" size="20">mdi-check-circle</VIcon>
            <span
              ><strong>Sostenés el sitio</strong>: el aporte paga los servidores y el tiempo de
              mantener más de 40 casas de cambio al día.</span
            >
          </li>
        </ul>
      </section>
    </div>

    <section v-if="summary?.donations.length" class="mt-10" aria-labelledby="sp-history">
      <h2 id="sp-history" class="text-h6 font-weight-bold mb-3">Tus aportes</h2>
      <div class="sin-publicidad__table-wrap">
        <VTable density="comfortable" class="sin-publicidad__table">
          <thead>
            <tr>
              <th scope="col">Fecha</th>
              <th scope="col">Monto</th>
              <th scope="col">Medio</th>
              <th scope="col">Estado</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(d, i) in summary.donations" :key="i">
              <td>{{ formatDay(d.approvedAt || d.createdAt) }}</td>
              <td>{{ formatAdFreeAmount(d.amount, d.currency) }}</td>
              <td>{{ PROVIDER_LABEL[d.provider].name }}</td>
              <td>{{ STATUS_LABEL[d.status] }}</td>
            </tr>
          </tbody>
        </VTable>
      </div>
    </section>

    <section class="mt-10 sin-publicidad__faq" aria-labelledby="sp-faq">
      <h2 id="sp-faq" class="text-h6 font-weight-bold mb-3">Preguntas</h2>
      <VExpansionPanels variant="accordion">
        <VExpansionPanel title="¿Es una suscripción?">
          <VExpansionPanelText>
            No. Pagás una vez y la cuenta queda sin anuncios {{ AD_FREE_MONTHS }} meses. No
            guardamos tu tarjeta y no hay cobros automáticos.
          </VExpansionPanelText>
        </VExpansionPanel>
        <VExpansionPanel :title="`¿Qué pasa cuando terminan los ${AD_FREE_MONTHS} meses?`">
          <VExpansionPanelText>
            Vuelven los anuncios. Si querés, podés aportar de nuevo; si lo hacés antes de que
            termine, los {{ AD_FREE_MONTHS }} meses nuevos se suman al final de los que te quedan.
          </VExpansionPanelText>
        </VExpansionPanel>
        <VExpansionPanel title="Pagué en Abitab o RedPagos, ¿cuándo se activa?">
          <VExpansionPanelText>
            Cuando Mercado Pago acredita el pago, en general en el mismo día. No tenés que hacer
            nada: la cuenta queda sin anuncios sola.
          </VExpansionPanelText>
        </VExpansionPanel>
        <VExpansionPanel title="Aporté y sigo viendo anuncios">
          <VExpansionPanelText>
            Fijate de haber iniciado sesión con la misma cuenta en ese dispositivo y recargá la
            página. Si el pago quedó pendiente, se activa cuando se acredite. Si sigue igual,
            <NuxtLink :to="localePath('/contacto')">escribinos</NuxtLink>.
          </VExpansionPanelText>
        </VExpansionPanel>
        <VExpansionPanel title="¿Me devuelven el aporte si me arrepiento?">
          <VExpansionPanelText>
            Sí. <NuxtLink :to="localePath('/contacto')">Escribinos</NuxtLink> dentro de los 5 días
            hábiles del pago y te lo devolvemos completo, como prevé la ley de relaciones de consumo
            (Ley 17.250, artículo 16). Al devolverlo, vuelven los anuncios.
          </VExpansionPanelText>
        </VExpansionPanel>
        <VExpansionPanel title="¿Qué datos guardan?">
          <VExpansionPanelText>
            El monto, la fecha, el medio de pago y el identificador del pago que nos da Mercado Pago
            o PayPal, asociados a tu cuenta. Los datos de la tarjeta los maneja el medio de pago:
            nosotros nunca los vemos. Más en la
            <NuxtLink :to="localePath('/privacidad')">política de privacidad</NuxtLink>.
          </VExpansionPanelText>
        </VExpansionPanel>
      </VExpansionPanels>
    </section>
  </VContainer>
</template>

<script setup lang="ts">
import type { AdFreeSummary } from '~/composables/useAdFree'
import { adFreeItems, monthlyEquivalent } from '~/utils/adFreeFunnel'
import {
  AD_FREE_AMOUNTS,
  AD_FREE_MONTHS,
  formatAdFreeAmount,
  validateAmount,
  type AdFreeCurrency,
  type AdFreeProvider,
  type DonationStatus,
} from '~/utils/adFree'

// Account plumbing under /cuenta: no ads, no edge cache, out of the sitemap and of Clarity by the
// /cuenta prefix (utils/ads.ts, utils/edgeCache.ts, utils/sitemapFilters.ts, utils/clarityPolicy.ts).
// No `auth` middleware on purpose: the offer is readable signed out, and the button asks to sign in.
useSeoMeta({
  title: 'Navegá sin anuncios',
  description:
    'Un aporte único deja tu cuenta de Cambio Uruguay sin anuncios durante 12 meses, en todos tus dispositivos.',
  robots: 'noindex, nofollow',
})

const PROVIDER_LABEL: Record<AdFreeProvider, { name: string; toggle: string; methods: string }> = {
  mercadopago: {
    name: 'Mercado Pago',
    toggle: 'Pesos · Mercado Pago',
    methods: 'Tarjetas uruguayas, saldo de Mercado Pago, Abitab o RedPagos.',
  },
  paypal: {
    name: 'PayPal',
    toggle: 'Dólares · PayPal',
    methods: 'Tarjetas del exterior o tu cuenta PayPal.',
  },
}

const STATUS_LABEL: Record<DonationStatus, string> = {
  approved: 'Acreditado',
  pending: 'Pendiente',
  rejected: 'Rechazado',
  cancelled: 'Cancelado',
  refunded: 'Devuelto',
  charged_back: 'Desconocido por el banco',
}

const store = useAuthStore()
const localePath = useLocalePath()
const route = useRoute()
const router = useRouter()
const track = useTrack()
const { authFetch } = useAuthFetch()
const { summary, refresh } = useAdFree()

const configured = (useRuntimeConfig().public.adFree ?? {}) as Partial<
  Record<AdFreeProvider, boolean>
>
const providers = computed(() => (['mercadopago', 'paypal'] as const).filter(p => configured[p]))
const provider = ref<AdFreeProvider>(providers.value[0] ?? 'mercadopago')
const limits = computed(() => AD_FREE_AMOUNTS[provider.value])

// The middle suggestion is the default (and labelled «sugerido»).
const suggestedDefault = computed(() => limits.value.suggested[1] ?? limits.value.suggested[0]!)
const choice = ref<number | 'other'>(suggestedDefault.value)
const custom = ref('')
watch(provider, () => {
  choice.value = suggestedDefault.value
  custom.value = ''
  error.value = ''
})

const customResult = computed(() =>
  choice.value === 'other' ? validateAmount(provider.value, custom.value.trim()) : null
)
const customError = computed(() =>
  custom.value.trim() && customResult.value && customResult.value.ok === false
    ? customResult.value.error
    : ''
)
const validAmount = computed<number | null>(() => {
  if (choice.value !== 'other') return choice.value
  return customResult.value?.ok ? customResult.value.amount : null
})

const starting = ref(false)
const error = ref('')
// Set when the button was pressed signed out: the checkout continues once the sign-in lands.
const continueAfterSignIn = ref(false)

/**
 * GA4 `begin_checkout`, then the provider's page. The navigation waits for the hit (capped):
 * leaving the page right after `gtag()` can drop it. Without gtag (consent, blocker) the cap
 * still lets the person go on.
 */
function beginCheckoutThenGo(url: string, amount: number) {
  const currency = limits.value.currency
  let gone = false
  const go = () => {
    if (gone) return
    gone = true
    window.location.assign(url)
  }
  track('begin_checkout', {
    currency,
    value: amount,
    payment_type: PROVIDER_LABEL[provider.value].name,
    items: adFreeItems(amount, currency),
    event_callback: go,
    event_timeout: 1200,
  })
  setTimeout(go, 1500)
}

async function start() {
  const amount = validAmount.value
  if (!amount || starting.value) return
  if (!store.isLoggedIn) {
    continueAfterSignIn.value = true
    track('ad_free_sign_in_prompt', { value: amount, currency: limits.value.currency })
    store.openDialog()
    return
  }
  starting.value = true
  error.value = ''
  try {
    const res = await authFetch<{ orderId: string; url: string }>('/api/me/ad-free/checkout', {
      method: 'POST',
      body: { provider: provider.value, amount },
    })
    beginCheckoutThenGo(res.url, amount)
  } catch (e: any) {
    error.value =
      e?.data?.statusMessage || e?.statusMessage || 'No pudimos abrir el pago. Probá de nuevo.'
    track('ad_free_checkout_error', { payment_type: PROVIDER_LABEL[provider.value].name })
    starting.value = false
  }
}

// Closing the dialog without signing in drops the pending checkout.
watch(
  () => store.dialogOpen,
  open => {
    if (!open && !store.isLoggedIn) continueAfterSignIn.value = false
  }
)

// ── Coming back from the provider ────────────────────────────────────────────────────────────
type ReturnState = 'idle' | 'confirming' | 'approved' | 'pending' | 'failed' | 'unknown'
const returnState = ref<ReturnState>('idle')
// Read once: the id leaves the address bar after the first check, and «Volver a revisar» still
// needs it.
const returnOrder = ref(
  typeof route.query.orden === 'string' && /^[a-f0-9]{24}$/.test(route.query.orden)
    ? route.query.orden
    : ''
)
const returnCancelled = route.query.cancelado === '1'
const returnProvider = ref<AdFreeProvider | null>(null)
const returnProviderName = computed(() =>
  returnProvider.value ? `de ${PROVIDER_LABEL[returnProvider.value].name}` : 'del medio de pago'
)

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

// One confirmation at a time: on a cold return the mount and the session restore both ask, and
// two loops meant two captures racing and two `purchase` hits.
let confirming: Promise<void> | null = null
function confirmReturn(): Promise<void> {
  confirming ??= runConfirm().finally(() => {
    confirming = null
    // The order id leaves the address bar once used: a reload must not confirm again.
    if (route.query.orden) void router.replace({ path: route.path, query: {} }).catch(() => {})
  })
  return confirming
}

async function runConfirm() {
  const orderId = returnOrder.value
  if (!orderId) return
  returnState.value = 'confirming'
  // PayPal sends a cancelled buyer back with our own flag: nothing was charged.
  if (returnCancelled) {
    returnProvider.value = 'paypal'
    returnState.value = 'failed'
    return
  }
  // Card payments settle in seconds; keep asking a little before calling it pending.
  for (let attempt = 0; attempt < 6; attempt++) {
    try {
      const res = await authFetch<{
        status: DonationStatus | 'none' | 'unknown'
        order: { amount: number; currency: AdFreeCurrency; provider: AdFreeProvider }
        summary: AdFreeSummary
      }>('/api/me/ad-free/confirm', { method: 'POST', body: { orderId } })
      summary.value = res.summary
      returnProvider.value = res.order.provider
      if (res.status === 'approved') {
        returnState.value = 'approved'
        trackPurchaseOnce(orderId, res.order)
        await refresh()
        return
      }
      if (res.status === 'rejected' || res.status === 'cancelled') {
        returnState.value = 'failed'
        return
      }
      if (res.status === 'pending' && attempt >= 2) {
        returnState.value = 'pending'
        return
      }
    } catch (e: any) {
      if (e?.statusCode === 404 || e?.status === 404) {
        returnState.value = 'idle'
        return
      }
    }
    await sleep(2500)
  }
  returnState.value = 'unknown'
}

/** GA4 `purchase` once per order in this browser, whatever path confirmed it. */
function trackPurchaseOnce(
  orderId: string,
  order: { amount: number; currency: AdFreeCurrency; provider: AdFreeProvider }
) {
  const key = `cu_adfree_purchase_${orderId}`
  try {
    if (window.sessionStorage.getItem(key)) return
    window.sessionStorage.setItem(key, '1')
  } catch {
    // Without storage GA4 still dedupes by transaction_id.
  }
  // GA4's recommended purchase: transaction_id dedupes a second confirmation of the same
  // order, value + currency make it revenue. Key event (utils/siteAnalytics.ts).
  track('purchase', {
    transaction_id: orderId,
    value: order.amount,
    currency: order.currency,
    payment_type: PROVIDER_LABEL[order.provider].name,
    items: adFreeItems(order.amount, order.currency),
  })
}

function formatDay(iso: string) {
  return new Date(iso).toLocaleDateString('es-UY', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'America/Montevideo',
  })
}

onMounted(async () => {
  // GA4 funnel step: the offer itself, at the amount it opens with.
  if (providers.value.length && !returnOrder.value) {
    track('view_item', {
      currency: limits.value.currency,
      value: suggestedDefault.value,
      items: adFreeItems(suggestedDefault.value, limits.value.currency),
    })
  }
  // Wait for the session (the return from the provider is a cold page load).
  await store.getToken()
  if (!store.isLoggedIn) return
  if (returnOrder.value) {
    await confirmReturn()
  } else {
    await refresh()
  }
})

watch(
  () => store.user?.uid,
  (uid, previous) => {
    if (uid && uid !== previous && returnState.value === 'idle') {
      // Back from the provider with the session gone: confirm once the person signs in again.
      if (returnOrder.value) void confirmReturn()
      else {
        void refresh()
        // Pressed «Aportar» signed out: the sign-in was the only step left, so go on to pay.
        if (continueAfterSignIn.value) {
          continueAfterSignIn.value = false
          void start()
        }
      }
    }
    if (!uid) summary.value = null
  }
)
</script>

<style scoped>
.sin-publicidad {
  max-width: 1040px;
}

.sin-publicidad__head {
  margin-bottom: 24px;
}

.sin-publicidad__lead {
  max-width: 62ch;
  line-height: 1.6;
}

.sin-publicidad__grid {
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr);
  gap: 40px;
  align-items: start;
}

/* The card's rhythm, owned in one place (DESIGN.md: 8px inside a group, 24px between groups):
   title → medium → amount → action → guarantees. */
.sin-publicidad__card {
  padding: 24px;
}

.sin-publicidad__card-title {
  margin-bottom: 16px;
}

.sin-publicidad__form {
  display: grid;
  gap: 24px;
}

.sin-publicidad__group {
  display: grid;
  gap: 8px;
}

@media (max-width: 760px) {
  .sin-publicidad__grid {
    grid-template-columns: minmax(0, 1fr);
    gap: 24px;
  }
}

.sin-publicidad__providers {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 8px;
}

.sin-publicidad__provider {
  display: grid;
  gap: 4px;
  padding: 12px 16px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 12px;
  background: transparent;
  color: rgb(var(--v-theme-on-surface));
  text-align: start;
  cursor: pointer;
  transition:
    border-color 0.15s ease,
    background-color 0.15s ease;
}

.sin-publicidad__provider:hover {
  border-color: rgba(var(--v-theme-primary), 0.6);
}

.sin-publicidad__provider.is-active {
  border-color: rgb(var(--v-theme-primary));
  background: rgba(var(--v-theme-primary), 0.08);
  box-shadow: inset 0 0 0 1px rgb(var(--v-theme-primary));
}

.sin-publicidad__provider:focus-visible {
  outline: 2px solid rgb(var(--v-theme-primary));
  outline-offset: 2px;
}

.sin-publicidad__provider-name {
  font-weight: 700;
  font-size: 0.95rem;
}

.sin-publicidad__provider-methods {
  font-size: 0.8rem;
  line-height: 1.4;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}

.sin-publicidad__amount {
  max-width: 260px;
}

.sin-publicidad__list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  gap: 16px;
}

.sin-publicidad__list li {
  display: flex;
  gap: 8px;
  align-items: flex-start;
  line-height: 1.5;
}

.sin-publicidad__list .v-icon {
  margin-top: 2px;
  flex: none;
}

.sin-publicidad__table-wrap {
  overflow-x: auto;
}

.sin-publicidad__pill {
  margin-left: 8px;
  padding: 0 8px;
  border-radius: 999px;
  background: rgba(var(--v-theme-primary), 0.12);
  color: rgb(var(--v-theme-primary));
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.0333em;
  text-transform: uppercase;
  line-height: 1.6;
}

.sin-publicidad__cta {
  font-weight: 700;
  letter-spacing: 0.01em;
}

/* The label carries the amount and the medium: on a phone it takes two lines, so the button
   grows instead of clipping it. */
.sin-publicidad__cta.v-btn {
  height: auto;
  min-height: 52px;
  padding-block: 10px;
  white-space: normal;
}

.sin-publicidad__cta :deep(.v-btn__content) {
  white-space: normal;
  line-height: 1.3;
}

.sin-publicidad__trust {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  gap: 8px;
  font-size: 0.875rem;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}

.sin-publicidad__trust li {
  display: flex;
  gap: 8px;
  align-items: flex-start;
  line-height: 1.45;
}

.sin-publicidad__trust .v-icon {
  margin-top: 2px;
  flex: none;
}

.sin-publicidad__faq {
  max-width: 760px;
}
</style>
