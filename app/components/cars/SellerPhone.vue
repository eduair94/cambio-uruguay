<!--
  El teléfono del vendedor de UN aviso. Nunca viene con la página: se pide con un clic a
  /api/cars/contact/<key>, así no queda en el HTML que lee un buscador ni en el payload del
  directorio. La procedencia y la fecha viajan con el número, y la baja está al lado.
  Política: docs/app/AUTOS_CONTACTOS.md.
-->
<template>
  <section
    v-if="car.hasContact"
    class="car-phone"
    aria-labelledby="car-phone-title"
    data-testid="car-seller-phone"
  >
    <h2 id="car-phone-title" class="text-subtitle-1 font-weight-bold mb-2">
      Contactar al vendedor
    </h2>

    <template v-if="state === 'shown' && contact">
      <ul class="car-phone__list">
        <li v-for="phone in contact.phones" :key="phone.value" class="car-phone__item">
          <a
            :href="`tel:${phone.value}`"
            class="car-phone__number"
            :aria-label="`Llamar al ${phone.display}`"
            @click="track('car_contact_channel', { channel: 'call' })"
          >
            <VIcon icon="mdi-phone-outline" size="20" aria-hidden="true" />
            {{ phone.display }}
          </a>
          <VBtn
            v-if="phone.mobile"
            :href="whatsappHref(phone.value)"
            target="_blank"
            rel="noopener noreferrer nofollow"
            variant="tonal"
            color="success"
            prepend-icon="mdi-whatsapp"
            class="car-phone__whatsapp"
            @click="track('car_contact_channel', { channel: 'whatsapp' })"
          >
            WhatsApp
          </VBtn>
        </li>
      </ul>
      <p class="text-body-2 mb-2">
        {{ provenance }}
        <a :href="contact.sourceUrl" target="_blank" rel="noopener noreferrer nofollow">{{
          provenanceLink
        }}</a
        >. Leído el {{ formatCarDate(contact.observedAt) }}.
      </p>
      <p class="text-body-2 mb-2">
        No señes ni transfieras plata sin ver el auto, la libreta y las deudas de la matrícula.
        <NuxtLink :to="localePath('/comprar-auto-con-deuda-uruguay')">Qué revisar antes</NuxtLink>.
      </p>
      <div class="car-phone__optout text-body-2">
        <template v-if="!confirming">
          ¿Es tu número?
          <button type="button" class="car-phone__link" @click="confirming = true">
            Sacalo de este sitio
          </button>
        </template>
        <template v-else>
          Lo dejamos de mostrar en este y en cualquier otro aviso del sitio.
          <span class="car-phone__confirm">
            <VBtn size="small" variant="tonal" color="error" :loading="removing" @click="optOut">
              Sí, sacarlo
            </VBtn>
            <VBtn size="small" variant="text" @click="confirming = false">Cancelar</VBtn>
          </span>
        </template>
      </div>
    </template>

    <p v-else-if="state === 'removed'" class="text-body-2 mb-0" role="status">
      Listo: ese número no se muestra más en este sitio.
    </p>
    <p v-else-if="state === 'gone'" class="text-body-2 mb-0" role="status">
      El teléfono de este aviso ya no está disponible. Podés escribirle al vendedor desde el aviso
      en
      {{ car.sourceName }}.
    </p>

    <template v-else>
      <p class="text-body-2 mb-3">
        {{
          car.sellerType === 'dealer'
            ? 'Es el número de la automotora, tomado de su propio aviso o de su web.'
            : 'Es el número que el vendedor escribió en su propio aviso.'
        }}
      </p>
      <VBtn
        color="primary"
        variant="tonal"
        prepend-icon="mdi-phone-outline"
        :loading="state === 'loading'"
        @click="reveal"
      >
        Ver teléfono del vendedor
      </VBtn>
      <p v-if="state === 'limited'" class="text-body-2 mt-2 mb-0" role="alert">
        Hiciste muchas consultas seguidas. Probá de nuevo en unos minutos.
      </p>
      <p v-else-if="state === 'error'" class="text-body-2 mt-2 mb-0" role="alert">
        No pudimos traer el teléfono. Probá de nuevo.
      </p>
    </template>
  </section>
</template>

<script setup lang="ts">
import { formatCarDate } from '~/utils/cars'
import type { PublicCarContact, PublicCarListing } from '~/utils/carsPublic'

const props = defineProps<{ car: PublicCarListing }>()
const localePath = useLocalePath()
const track = useTrack()

type State = 'idle' | 'loading' | 'shown' | 'gone' | 'limited' | 'error' | 'removed'
const state = ref<State>('idle')
const contact = ref<PublicCarContact | null>(null)
const confirming = ref(false)
const removing = ref(false)

const statusOf = (error: unknown): number | undefined => {
  const failure = error as { statusCode?: number; response?: { status?: number } }
  return failure?.statusCode ?? failure?.response?.status
}

async function reveal() {
  state.value = 'loading'
  try {
    contact.value = await $fetch<PublicCarContact>(
      `/api/cars/contact/${encodeURIComponent(props.car.key)}`
    )
    state.value = 'shown'
    track('car_contact_reveal', {
      car_source: props.car.source,
      contact_origin: contact.value.origin,
    })
  } catch (error) {
    const status = statusOf(error)
    state.value = status === 404 ? 'gone' : status === 429 ? 'limited' : 'error'
  }
}

async function optOut() {
  removing.value = true
  try {
    await $fetch(`/api/cars/contact/${encodeURIComponent(props.car.key)}/optout`, {
      method: 'POST',
    })
    contact.value = null
    state.value = 'removed'
    track('car_contact_optout', { car_source: props.car.source })
  } catch (error) {
    state.value = statusOf(error) === 404 ? 'removed' : 'error'
  } finally {
    removing.value = false
    confirming.value = false
  }
}

const whatsappHref = (value: string): string =>
  `https://wa.me/${value.replace(/^\+/, '')}?text=${encodeURIComponent(
    `Hola, te escribo por tu aviso: ${props.car.title}`
  )}`

const provenance = computed(() =>
  contact.value?.origin === 'dealer_site'
    ? `Número comercial que ${props.car.sourceName} publica en`
    : `Lo escribió el vendedor en`
)
const provenanceLink = computed(() =>
  contact.value?.origin === 'dealer_site'
    ? 'su página de contacto'
    : `su aviso de ${props.car.sourceName}`
)
</script>

<style scoped>
.car-phone {
  margin-top: 24px;
  padding: 16px;
  border-radius: 12px;
  background: rgba(var(--v-theme-on-surface), 0.04);
  overflow-wrap: anywhere;
}
:where(.car-phone) :where(p, ul) {
  margin-top: 0;
}
.car-phone__list {
  list-style: none;
  padding: 0;
  margin: 0 0 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.car-phone__item {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 16px;
}
.car-phone__number {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
  font-size: 1.25rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: rgb(var(--v-theme-link));
  text-underline-offset: 4px;
}
.car-phone__whatsapp {
  min-height: 44px;
}
.car-phone a {
  color: rgb(var(--v-theme-link));
}
.car-phone__optout {
  color: rgba(var(--v-theme-on-surface), 0.76);
}
.car-phone__link {
  min-height: 44px;
  padding: 0 4px;
  border: 0;
  background: none;
  font: inherit;
  color: rgb(var(--v-theme-link));
  text-decoration: underline;
  text-underline-offset: 3px;
  cursor: pointer;
}
.car-phone__confirm {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
}
.car-phone a:focus-visible,
.car-phone__link:focus-visible {
  outline: 2px solid rgb(var(--v-theme-primary));
  outline-offset: 3px;
}
</style>
