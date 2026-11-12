<script setup lang="ts">
/**
 * Una fila del directorio de armadores, con el mismo esqueleto que las filas de
 * /fletes-mudanzas-uruguay (resumen a la izquierda, panel de precio a la derecha) para que los dos
 * directorios hermanos se lean igual.
 *
 * Lo que cada fuente puede afirmar se dice tal cual: una tarifa relevada tiene mueble, fuente y
 * fecha; el precio de un aviso es "el que puso el anunciante"; un negocio de Google trae su
 * puntuación con la fecha de lectura. El teléfono de Google se pide al tocar "Ver teléfono" y no
 * se guarda (server/utils/armadorContact.ts).
 */
import {
  ARMADOR_ITEM_LABEL,
  ARMADOR_SOURCES,
  ARMADOR_ZONES,
  type ArmadorEntry,
  type ArmadorItem,
  armadorFromPrice,
  armadorPriceText,
} from '~/utils/armadores'

const props = defineProps<{
  entry: ArmadorEntry
  mueble: ArmadorItem | null
  headingLevel?: 'h3' | 'h4'
}>()

const SERVICE_LABEL: Record<string, string> = {
  armado: 'Armado',
  desarmado: 'Desarmado',
  traslado: 'Traslado',
  colgado: 'Colgado en pared',
  instalacion: 'Instalación',
  reparacion: 'Reparaciones',
}
const KIND_LABEL: Record<ArmadorEntry['kind'], string> = {
  empresa: 'Empresa',
  independiente: 'Independiente',
  tienda: 'Tienda',
  plataforma: 'Plataforma',
  aviso: 'Aviso',
}
const LONG_DATE = new Intl.DateTimeFormat('es-UY', {
  day: 'numeric',
  month: 'long',
  timeZone: 'UTC',
})
const day = (iso: string): string => {
  const value = /^\d{4}-\d{2}$/.test(iso) ? `${iso}-01` : iso
  const date = new Date(`${value.slice(0, 10)}T12:00:00Z`)
  if (Number.isNaN(date.getTime())) return iso
  return /^\d{4}-\d{2}$/.test(iso)
    ? new Intl.DateTimeFormat('es-UY', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(
        date
      )
    : LONG_DATE.format(date)
}

const source = computed(() => ARMADOR_SOURCES.find(s => s.id === props.entry.source)!)
// Relevado a mano no es lo mismo que tarifa publicada: sin precios, sólo se relevó que existe.
const sourceLabel = computed(() =>
  props.entry.source === 'editorial'
    ? props.entry.prices.length
      ? 'Tarifa publicada'
      : 'Relevado'
    : source.value.label
)
/** "Ver teléfono" en vivo: fichas de Google, o un relevado con ficha que no publica teléfono propio. */
const canLookupPhone = computed(
  () =>
    !!props.entry.placeId &&
    (props.entry.source === 'google' ||
      !props.entry.contacts.some(c => c.type === 'phone' || c.type === 'whatsapp'))
)
/** Ni tarifa, ni lista, ni precio de aviso, ni monto simbólico: no hay panel de precio. */
const noPrice = computed(() => !props.entry.prices.length && !props.entry.symbolicPrice)
const zoneLabel = (zone: string | null) => ARMADOR_ZONES.find(z => z.id === zone)?.label ?? null
const baseLine = computed(() => {
  const { barrio, zone } = props.entry.base
  if (!barrio) return null
  const label = zoneLabel(zone)
  // "Centro (centro)" no dice nada: la zona sólo se agrega cuando no es el mismo nombre.
  const same = label?.toLowerCase() === barrio.toLowerCase()
  return label && zone !== 'metropolitana' && !same ? `${barrio} (${label.toLowerCase()})` : barrio
})
const coverageLine = computed(() => {
  const { allMontevideo, barrios, outside } = props.entry.coverage
  const named = barrios.filter(name => name !== props.entry.base.barrio)
  const parts: string[] = []
  if (allMontevideo) parts.push('todo Montevideo')
  if (named.length)
    parts.push(
      named.slice(0, 6).join(', ') + (named.length > 6 ? ` y ${named.length - 6} más` : '')
    )
  if (outside.length) parts.push(outside.slice(0, 3).join(', '))
  return parts.length ? parts.join(' · ') : null
})

const headline = computed(() => armadorFromPrice(props.entry, props.mueble))
const headlineLabel = computed(() => {
  const price = headline.value
  if (!price) return null
  if (price.origin === 'ad-card') return 'Precio del aviso'
  return price.item ? ARMADOR_ITEM_LABEL[price.item] : price.label
})
const otherPrices = computed(() =>
  props.entry.prices.filter(price => price !== headline.value && price.origin !== 'ad-card')
)
const visiblePrices = computed(() => otherPrices.value.slice(0, 4))
const morePrices = computed(() => otherPrices.value.slice(4))
const missingForMueble = computed(
  () => !!props.mueble && !headline.value && props.entry.prices.length > 0
)

const primaryAction = computed(() => {
  const e = props.entry
  if (e.source === 'facebook')
    return { href: e.url, label: 'Ver aviso en Marketplace', icon: 'mdi-open-in-new' }
  if (e.source === 'mercadolibre')
    return { href: e.url, label: 'Ver aviso en Mercado Libre', icon: 'mdi-open-in-new' }
  if (e.source === 'google')
    return { href: e.url, label: 'Ver en Google Maps', icon: 'mdi-map-marker-outline' }
  if (e.website) return { href: e.website, label: 'Ir al sitio', icon: 'mdi-open-in-new' }
  return { href: e.url, label: 'Ver la fuente', icon: 'mdi-open-in-new' }
})

const waHref = (value: string): string => {
  let digits = value.replace(/\D/g, '')
  if (digits.startsWith('0')) digits = `598${digits.slice(1)}`
  return `https://wa.me/${digits}`
}
const telHref = (value: string): string => `tel:${value.replace(/[^\d+]/g, '')}`

// Teléfono de Google, en vivo.
type ContactState = 'idle' | 'loading' | 'done' | 'error' | 'limited'
const contactState = ref<ContactState>('idle')
const contact = ref<{
  phone: string | null
  internationalPhone: string | null
  website: string | null
} | null>(null)
const NO_PHONE = 'Google no publica un teléfono para este negocio.'
const AD_NOTE = 'Lo que puso el anunciante; no dice de qué mueble.'
const SYMBOLIC_NOTE = 'El aviso muestra un monto simbólico.'
const tariffSource = computed(() => props.entry.prices[0]?.sourceUrl ?? props.entry.url)
const contactTel = computed(() =>
  contact.value?.phone ? telHref(contact.value.internationalPhone ?? contact.value.phone) : ''
)
const contactMessage = computed(() =>
  contactState.value === 'error'
    ? 'No pudimos consultar a Google ahora; abrí la ficha en Maps.'
    : contactState.value === 'limited'
      ? 'Muchas consultas seguidas: probá en un minuto.'
      : ''
)

async function loadContact() {
  if (!props.entry.placeId || contactState.value === 'loading') return
  contactState.value = 'loading'
  try {
    const body = await $fetch<{
      ok: boolean
      phone: string | null
      internationalPhone: string | null
      website: string | null
    }>(`/api/armadores/contacto/${encodeURIComponent(props.entry.placeId)}`)
    contact.value = body
    contactState.value = body.ok ? 'done' : 'error'
  } catch (error) {
    contactState.value =
      (error as { statusCode?: number })?.statusCode === 429 ? 'limited' : 'error'
  }
}
</script>

<template>
  <article
    :id="entry.id.replace(/[^a-z0-9-]/gi, '-')"
    class="ar-row"
    :class="{ 'ar-row--no-price': noPrice }"
  >
    <div class="ar-row__overview">
      <p class="ar-row__kicker">
        <span>{{ sourceLabel }}</span>
        <span aria-hidden="true">·</span>
        <span
          >{{ KIND_LABEL[entry.kind]
          }}<template v-if="entry.storeOnly"> (sólo lo comprado ahí)</template></span
        >
      </p>
      <component
        :is="headingLevel ?? 'h3'"
        class="ar-row__name"
        :lang="entry.source === 'editorial' ? undefined : 'es'"
      >
        {{ entry.name }}
      </component>
      <p v-if="entry.summary" class="ar-row__summary">{{ entry.summary }}</p>

      <dl class="ar-row__facts">
        <div v-if="baseLine">
          <dt>Base</dt>
          <dd>{{ baseLine }}</dd>
        </div>
        <div v-if="coverageLine">
          <dt>Dice cubrir</dt>
          <dd>{{ coverageLine }}</dd>
        </div>
        <div v-if="!baseLine && !coverageLine">
          <dt>Zona</dt>
          <dd class="ar-row__muted">sin informar</dd>
        </div>
        <div v-if="entry.services.length > 1">
          <dt>Hace</dt>
          <dd>{{ entry.services.map(s => SERVICE_LABEL[s] ?? s).join(' · ') }}</dd>
        </div>
        <div v-if="noPrice">
          <dt>Precio</dt>
          <dd class="ar-row__muted">no lo publica: hay que consultar</dd>
        </div>
        <div v-if="entry.rating">
          <dt>Google</dt>
          <dd>
            <VIcon size="16" class="ar-row__star" aria-hidden="true">mdi-star</VIcon>
            {{ entry.rating.value.toLocaleString('es-UY', { maximumFractionDigits: 1 }) }}
            · {{ entry.rating.count.toLocaleString('es-UY') }}
            {{ entry.rating.count === 1 ? 'reseña' : 'reseñas' }}
            <span class="ar-row__muted">(leído el {{ day(entry.rating.observedAt) }})</span>
          </dd>
        </div>
      </dl>

      <div class="ar-row__actions">
        <a :href="primaryAction.href" target="_blank" rel="noopener nofollow" class="ar-row__link">
          <VIcon size="18" aria-hidden="true">{{ primaryAction.icon }}</VIcon>
          {{ primaryAction.label }}
        </a>
        <a
          v-if="
            entry.source === 'editorial' && entry.website && entry.website !== primaryAction.href
          "
          :href="entry.website"
          target="_blank"
          rel="noopener nofollow"
          class="ar-row__link"
        >
          Sitio
        </a>
        <template v-for="c in entry.contacts" :key="c.type + c.value">
          <a
            v-if="c.type === 'whatsapp'"
            :href="waHref(c.value)"
            target="_blank"
            rel="noopener nofollow"
            class="ar-row__link"
          >
            <VIcon size="18" aria-hidden="true">mdi-whatsapp</VIcon> WhatsApp {{ c.value }}
          </a>
          <a v-else-if="c.type === 'phone'" :href="telHref(c.value)" class="ar-row__link">
            <VIcon size="18" aria-hidden="true">mdi-phone-outline</VIcon> {{ c.value }}
          </a>
          <a v-else-if="c.type === 'email'" :href="`mailto:${c.value}`" class="ar-row__link">
            <VIcon size="18" aria-hidden="true">mdi-email-outline</VIcon> {{ c.value }}
          </a>
          <a
            v-else-if="c.type === 'instagram'"
            :href="
              c.value.startsWith('http')
                ? c.value
                : `https://www.instagram.com/${c.value.replace(/^@/, '')}/`
            "
            target="_blank"
            rel="noopener nofollow"
            class="ar-row__link"
          >
            <VIcon size="18" aria-hidden="true">mdi-instagram</VIcon> Instagram
          </a>
        </template>
        <template v-if="canLookupPhone">
          <VBtn
            v-if="contactState !== 'done'"
            variant="text"
            size="small"
            color="primary"
            class="cu-btn-flush"
            :loading="contactState === 'loading'"
            prepend-icon="mdi-phone-outline"
            @click="loadContact"
          >
            Ver teléfono
          </VBtn>
          <span v-else-if="contact" class="ar-row__contact">
            <a v-if="contact.phone" :href="contactTel" class="ar-row__link">
              <VIcon size="18" aria-hidden="true">mdi-phone-outline</VIcon> {{ contact.phone }}
            </a>
            <a
              v-if="contact.website"
              :href="contact.website"
              target="_blank"
              rel="noopener nofollow"
              class="ar-row__link"
            >
              Sitio
            </a>
            <span v-if="!contact.phone && !contact.website" class="ar-row__muted">{{
              NO_PHONE
            }}</span>
            <span class="ar-row__attribution">Datos de Google Maps</span>
          </span>
          <span v-if="contactMessage" class="ar-row__muted" role="status">{{
            contactMessage
          }}</span>
        </template>
      </div>
    </div>

    <div v-if="!noPrice" class="ar-row__price">
      <template v-if="headline">
        <span class="ar-row__price-label">{{ headlineLabel }}</span>
        <strong class="ar-row__price-number">{{ armadorPriceText(headline) }}</strong>
        <span v-if="headline.origin === 'ad-card'" class="ar-row__price-note">{{ AD_NOTE }}</span>
        <span v-else-if="headline.conditions" class="ar-row__price-note">{{
          headline.conditions
        }}</span>
      </template>
      <template v-else>
        <span class="ar-row__price-label">{{
          mueble ? ARMADOR_ITEM_LABEL[mueble] : 'Precio'
        }}</span>
        <strong class="ar-row__price-none">{{
          entry.symbolicPrice
            ? 'A consultar'
            : missingForMueble
              ? 'No lo publica'
              : 'Sin precio publicado'
        }}</strong>
        <span v-if="entry.symbolicPrice" class="ar-row__price-note">{{ SYMBOLIC_NOTE }}</span>
      </template>

      <ul v-if="visiblePrices.length" class="ar-row__prices">
        <li v-for="(price, index) in visiblePrices" :key="index">
          <span>{{ price.label }}</span>
          <span class="ar-row__amount">{{ armadorPriceText(price) }}</span>
        </li>
      </ul>
      <details v-if="morePrices.length" class="ar-row__more">
        <summary>
          {{ morePrices.length }} {{ morePrices.length === 1 ? 'precio más' : 'precios más' }}
        </summary>
        <ul class="ar-row__prices">
          <li v-for="(price, index) in morePrices" :key="index">
            <span>{{ price.label }}</span>
            <span class="ar-row__amount">{{ armadorPriceText(price) }}</span>
          </li>
        </ul>
      </details>

      <span class="ar-row__date">
        <template v-if="entry.source === 'editorial'">
          <template v-if="entry.prices[0]"
            >Tarifa de {{ day(entry.prices[0].observedAt) }} ·
          </template>
          <a :href="tariffSource" target="_blank" rel="noopener nofollow">fuente</a>
        </template>
        <template v-else-if="entry.source === 'google'"
          >Ficha leída el {{ day(entry.lastSeen) }}</template
        >
        <template v-else>Aviso visto el {{ day(entry.lastSeen) }}</template>
      </span>
    </div>
  </article>
</template>

<style scoped>
:where(.ar-row) :where(p, h3, h4, dl, dd, ul) {
  margin-top: 0;
}
.ar-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 16px;
  padding: 24px 0;
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  scroll-margin-top: 90px;
}
@media (min-width: 760px) {
  .ar-row {
    grid-template-columns: minmax(0, 1fr) minmax(220px, 0.4fr);
    gap: 24px;
  }
  .ar-row--no-price {
    grid-template-columns: minmax(0, 1fr);
  }
}
.ar-row__overview {
  display: grid;
  gap: 8px;
  align-content: start;
  min-width: 0;
}
.ar-row__kicker {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 8px;
  margin-bottom: 0;
  color: rgb(var(--v-theme-link));
  font-size: 0.8rem;
  font-weight: 700;
}
.ar-row__name {
  margin-bottom: 0;
  font-size: 1.25rem;
  font-weight: 700;
  line-height: 1.4;
  overflow-wrap: anywhere;
}
.ar-row__summary {
  max-width: 72ch;
  margin-bottom: 0;
  font-size: 0.95rem;
}
.ar-row__facts {
  display: grid;
  gap: 4px;
  margin-bottom: 0;
  font-size: 0.875rem;
}
.ar-row__facts > div {
  display: flex;
  flex-wrap: wrap;
  gap: 0 8px;
}
.ar-row__facts dt {
  min-width: 88px;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
  font-weight: 600;
}
.ar-row__facts dd {
  min-width: 0;
  margin: 0;
  overflow-wrap: anywhere;
}
.ar-row__star {
  margin-top: -2px;
  color: rgb(var(--v-theme-secondary));
}
.ar-row__muted {
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}
.ar-row__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0 24px;
  align-items: center;
  margin-top: 8px;
  font-size: 0.875rem;
}
.ar-row__link,
.ar-row__date a {
  display: inline-flex;
  gap: 4px;
  align-items: center;
  min-height: 44px;
  color: rgb(var(--v-theme-link));
  font-weight: 600;
  text-underline-offset: 3px;
  overflow-wrap: anywhere;
}
.ar-row__contact {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 0 16px;
  align-items: center;
}
.ar-row__attribution {
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
  font-size: 0.75rem;
}
.ar-row__price {
  display: grid;
  gap: 4px;
  align-content: start;
  padding: 16px;
  border-radius: 12px;
  background: rgba(var(--v-theme-on-surface), 0.04);
}
.ar-row__price-label {
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.0333em;
}
.ar-row__price-number {
  font-size: 1.5rem;
  font-weight: 700;
  line-height: 1.2;
  font-variant-numeric: tabular-nums;
}
.ar-row__price-none {
  font-size: 1.25rem;
  font-weight: 700;
  line-height: 1.4;
}
.ar-row__price-note {
  font-size: 0.8rem;
  line-height: 1.4;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}
.ar-row__prices {
  display: grid;
  gap: 4px;
  margin: 8px 0 0;
  padding: 8px 0 0;
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  list-style: none;
  font-size: 0.875rem;
}
.ar-row__prices li {
  display: flex;
  gap: 8px;
  justify-content: space-between;
}
.ar-row__prices li > span:first-child {
  min-width: 0;
  overflow-wrap: anywhere;
}
.ar-row__amount {
  flex: none;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}
.ar-row__more summary {
  min-height: 44px;
  padding-top: 12px;
  color: rgb(var(--v-theme-link));
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
}
.ar-row__more summary:focus-visible,
.ar-row__link:focus-visible {
  outline: 2px solid rgb(var(--v-theme-primary));
  outline-offset: 2px;
}
.ar-row__date {
  margin-top: 4px;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
  font-size: 0.8rem;
}
.ar-row__date a {
  display: inline;
  min-height: 0;
}
</style>
