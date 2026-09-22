<!--
  SponsoredCasaRow — la fila patrocinada de la home, calcada de ConLaTuyaBanner.

  THESIS: un espacio pago que se ve como espacio pago: etiqueta "Publicidad", el nombre del
  patrocinador, una línea de oferta, un botón y el dominio de destino a la vista.
  FORM: un bloque APARTE del ranking de casas, en el flujo del documento, sin nada fijo ni flotante.
  NUNCA entra a `topExchanges` ni lo reordena: "el orden lo determina siempre el precio" (/acerca).
  Con `sponsorships.homeRow` vacío en runtimeConfig no deja ni un nodo en el DOM.
-->
<template>
  <aside
    v-if="row"
    ref="banner"
    class="sponsored-row on-dark"
    :aria-label="$t('ads.label')"
    :data-sponsor="row.id"
  >
    <div class="sponsored-row__identity">
      <span class="sponsored-row__label">{{ $t('ads.label') }}</span>
      <span class="sponsored-row__brand">{{ row.name }}</span>
    </div>

    <div class="sponsored-row__copy">
      <h2>{{ row.tagline }}</h2>
      <p>
        {{ $t('sponsoredRow.notice') }}
        <NuxtLink :to="localePath('/publicidad')" class="sponsored-row__policy">
          {{ $t('sponsoredRow.policy') }}
        </NuxtLink>
      </p>
    </div>

    <div class="sponsored-row__action">
      <a
        :href="row.href"
        target="_blank"
        rel="noopener noreferrer sponsored"
        class="sponsored-row__link"
        data-cta="sponsored-home"
        :aria-label="$t('sponsoredRow.ctaLabel', { name: row.name })"
      >
        {{ $t('sponsoredRow.cta') }}
        <VIcon size="18" aria-hidden="true">mdi-open-in-new</VIcon>
      </a>
      <span class="sponsored-row__destination">{{ row.host }}</span>
      <span class="sponsored-row__external">{{ $t('sponsoredRow.external') }}</span>
    </div>
  </aside>
</template>

<script setup lang="ts">
const banner = ref<HTMLElement | null>(null)
const route = useRoute()
const localePath = useLocalePath()
const track = useTrack()
const { homeRow: row } = useSponsorships()
let observer: IntersectionObserver | undefined

onMounted(() => {
  if (!row.value || !banner.value || typeof IntersectionObserver === 'undefined') return
  observer = new IntersectionObserver(
    entries => {
      if (!entries.some(entry => entry.isIntersecting && entry.intersectionRatio >= 0.5)) return
      observer?.disconnect()
      // Metadatos de interacción con nombres propios: la atribución (utm_*) va en la URL saliente,
      // nunca en este evento (ver useTrack).
      track('sponsored_row_view', {
        content_path: route.path,
        promo_placement: 'home-after-rates',
        sponsor_id: row.value?.id,
      })
    },
    { threshold: 0.5 }
  )
  observer.observe(banner.value)
})

onBeforeUnmount(() => observer?.disconnect())
</script>

<style scoped>
.sponsored-row {
  display: flex;
  align-items: center;
  gap: 24px;
  padding: 24px;
  border-radius: 12px;
  background: #121a2e;
  color: #fff;
}

.sponsored-row__identity {
  flex: 0 0 150px;
  min-width: 0;
}

.sponsored-row__label {
  display: block;
  margin-bottom: 8px;
  color: #b3bdcc;
  font-size: 0.75rem;
  line-height: 1.4;
}

.sponsored-row__brand {
  display: block;
  font-size: 1.5rem;
  font-weight: 800;
  line-height: 1.1;
  letter-spacing: -0.02em;
  overflow-wrap: anywhere;
}

.sponsored-row__copy {
  flex: 1 1 auto;
  min-width: 0;
}

.sponsored-row__copy h2 {
  margin: 0;
  color: inherit;
  font-size: clamp(1.25rem, 2vw, 1.5rem);
  font-weight: 700;
  line-height: 1.3;
  letter-spacing: -0.01em;
  text-wrap: balance;
}

.sponsored-row__copy p {
  margin: 8px 0 0;
  max-width: 65ch;
  color: #b3bdcc;
  font-size: 0.85rem;
  line-height: 1.5;
}

.sponsored-row__policy {
  color: #b3bdcc;
  text-decoration: underline;
}

.sponsored-row__action {
  display: flex;
  flex: 0 0 auto;
  flex-direction: column;
  align-items: center;
  min-width: 0;
}

.sponsored-row__link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 44px;
  padding: 12px 20px;
  border-radius: 4px;
  background: #1976d2;
  color: #fff;
  font-size: 0.875rem;
  font-weight: 700;
  line-height: 1.4;
  text-align: center;
  text-decoration: none;
}

.sponsored-row__link:hover {
  background: #1565c0;
}

.sponsored-row__link:focus-visible {
  outline: 2px solid #fff;
  outline-offset: 4px;
}

.sponsored-row__destination,
.sponsored-row__external {
  color: #b3bdcc;
  font-size: 0.75rem;
  line-height: 1.4;
  text-align: center;
  overflow-wrap: anywhere;
}

.sponsored-row__destination {
  margin-top: 8px;
}

.sponsored-row__external {
  margin-top: 4px;
}

@media (max-width: 959.98px) {
  .sponsored-row {
    flex-wrap: wrap;
    gap: 16px 24px;
  }

  .sponsored-row__identity {
    display: flex;
    flex-basis: 100%;
    align-items: baseline;
    justify-content: space-between;
    gap: 16px;
  }

  .sponsored-row__brand {
    font-size: 1.25rem;
  }

  .sponsored-row__label {
    margin-bottom: 0;
  }

  .sponsored-row__copy {
    flex-basis: 300px;
  }
}

@media (max-width: 599.98px) {
  .sponsored-row {
    padding: 20px;
  }

  .sponsored-row__action,
  .sponsored-row__link {
    width: 100%;
  }
}

@media print {
  .sponsored-row {
    display: none;
  }
}
</style>
