<script setup lang="ts">
/**
 * DiscountFinders — "ya tengo la tarjeta, ¿dónde tengo descuento HOY?".
 *
 * POR QUÉ EXISTE: el ranking de las páginas de tarjetas mide el programa (cuánto
 * acumulás, qué canjeás, cuánto cuesta). Pero el ahorro que la gente pierde de verdad
 * no es por elegir mal la tarjeta: es por no saber que el local de enfrente tenía 25%
 * con la tarjeta que ya lleva en el bolsillo. Ese hueco lo tapan buscadores de
 * beneficios de terceros, y conviene decirlo aunque no sean nuestros.
 *
 * Reglas de la ficha: sin links de referido ni afiliación, cada dato con su origen
 * (oficial / tienda / prensa / autodeclarado) y las contras a la vista —incluido cómo
 * se financia la app, que es lo que más condiciona qué te muestra—.
 */
import {
  DISCOUNT_FINDERS,
  DISCOUNT_FINDERS_LAST_REVIEWED,
  DISCOUNT_FINDER_SOURCES,
  OFFICIAL_BENEFIT_PAGES,
  type FinderFact,
} from '~/utils/discountApps'

withDefaults(
  defineProps<{
    /** Ajusta la bajada según la página que lo monta. */
    context?: 'credito' | 'debito'
  }>(),
  { context: 'credito' }
)

const [primary, ...others] = DISCOUNT_FINDERS

const SOURCE_LABELS: Record<FinderFact['source'], string> = {
  oficial: 'fuente oficial',
  tienda: 'App Store / Google Play',
  prensa: 'prensa',
  autodeclarado: 'autodeclarado',
}
</script>

<template>
  <section class="discount-finders mb-6" aria-labelledby="discount-finders-title">
    <h2 id="discount-finders-title" class="text-h6 font-weight-bold mb-1">
      ¿Dónde tengo descuento con esta tarjeta?
    </h2>
    <p class="text-body-2 text-medium-emphasis mb-3">
      <template v-if="context === 'debito'">
        Comprar afuera es una parte del costo; la otra es el descuento que ya tenés acá y no usás.
      </template>
      <template v-else>
        El ranking de arriba compara programas. Esto es el otro problema: el descuento ya existe y
        no te enterás.
      </template>
      Los bancos publican sus beneficios, pero nadie entra a la web de cada banco antes de sentarse
      a comer. Hay herramientas de terceros que juntan todo eso. No tenemos afiliación con ninguna:
      ni link de referido ni comisión.
    </p>

    <SurfaceCard v-if="primary" accent class="mb-3">
      <div class="d-flex align-center flex-wrap ga-2 mb-2">
        <h3 class="text-subtitle-1 font-weight-bold mb-0">{{ primary.name }}</h3>
        <VChip v-if="primary.free" size="x-small" color="success" variant="tonal">Gratis</VChip>
        <VChip size="x-small" variant="outlined">
          {{ primary.kind === 'app' ? 'App iOS y Android' : 'Web' }}
        </VChip>
        <VChip v-if="primary.verified" size="x-small" color="success" variant="tonal">
          <VIcon start size="11">mdi-check-decagram-outline</VIcon>
          Datos verificados
        </VChip>
      </div>

      <p class="text-body-2">{{ primary.tagline }}</p>
      <p class="text-body-2">{{ primary.how }}</p>

      <div class="mb-3">
        <p class="finder-label">Bancos y emisores que declara cubrir</p>
        <div class="d-flex flex-wrap ga-1">
          <VChip v-for="c in primary.covers" :key="c" size="x-small" variant="tonal">
            {{ c }}
          </VChip>
        </div>
      </div>

      <dl class="finder-facts mb-3">
        <div v-for="(f, i) in primary.facts" :key="i">
          <dt>{{ f.label }}</dt>
          <dd>
            {{ f.value }}
            <VChip size="x-small" variant="outlined" class="ml-1">{{
              SOURCE_LABELS[f.source]
            }}</VChip>
          </dd>
        </div>
      </dl>

      <VRow>
        <VCol cols="12" sm="6">
          <p class="finder-label">
            <VIcon size="14" color="success" class="mr-1">mdi-check-circle-outline</VIcon>
            Para qué sirve
          </p>
          <ul class="finder-list">
            <li v-for="(x, i) in primary.strengths" :key="i">{{ x }}</li>
          </ul>
        </VCol>
        <VCol cols="12" sm="6">
          <p class="finder-label">
            <VIcon size="14" color="warning" class="mr-1">mdi-alert-circle-outline</VIcon>
            Qué mirar con lupa
          </p>
          <ul class="finder-list">
            <li v-for="(x, i) in primary.caveats" :key="i">{{ x }}</li>
          </ul>
        </VCol>
      </VRow>

      <div class="d-flex flex-wrap ga-2 mt-2">
        <VBtn
          :href="primary.siteUrl"
          target="_blank"
          rel="noopener noreferrer nofollow"
          variant="tonal"
          size="small"
        >
          <VIcon start size="small">mdi-open-in-new</VIcon>
          Sitio oficial
        </VBtn>
        <VBtn
          v-if="primary.iosUrl"
          :href="primary.iosUrl"
          target="_blank"
          rel="noopener noreferrer nofollow"
          variant="text"
          size="small"
        >
          <VIcon start size="small">mdi-apple</VIcon>
          App Store
        </VBtn>
        <VBtn
          v-if="primary.androidUrl"
          :href="primary.androidUrl"
          target="_blank"
          rel="noopener noreferrer nofollow"
          variant="text"
          size="small"
        >
          <VIcon start size="small">mdi-google-play</VIcon>
          Google Play
        </VBtn>
      </div>
    </SurfaceCard>

    <SurfaceCard v-for="f in others" :key="f.id" padding="compact" class="mb-3">
      <div class="d-flex align-center flex-wrap ga-2 mb-2">
        <h3 class="text-subtitle-2 font-weight-bold mb-0">{{ f.name }}</h3>
        <VChip size="x-small" variant="outlined">{{ f.kind === 'app' ? 'App' : 'Web' }}</VChip>
        <VChip v-if="f.free" size="x-small" color="success" variant="tonal">Gratis</VChip>
      </div>
      <p class="text-body-2">{{ f.tagline }}</p>
      <p class="text-body-2 text-medium-emphasis">
        <strong>Limitación:</strong> {{ f.caveats[0] }}
      </p>
      <VBtn
        :href="f.siteUrl"
        target="_blank"
        rel="noopener noreferrer nofollow"
        variant="text"
        size="small"
        class="px-1"
      >
        <VIcon start size="small">mdi-open-in-new</VIcon>
        Abrir {{ f.name }}
      </VBtn>
    </SurfaceCard>

    <VAlert type="info" variant="tonal" density="comfortable" icon="mdi-information-outline">
      <p class="text-body-2 mb-2">
        Ante una diferencia manda el emisor: el agregador puede atrasarse, la base y condiciones del
        banco no. Antes de contar con un descuento grande, chequealo en la fuente:
      </p>
      <ul class="finder-sources mb-0">
        <li v-for="(s, i) in OFFICIAL_BENEFIT_PAGES" :key="i">
          <a :href="s.url" target="_blank" rel="noopener noreferrer">{{ s.label }}</a>
        </li>
      </ul>
    </VAlert>

    <p class="text-caption text-medium-emphasis mt-3 mb-0">
      Datos verificados el {{ DISCOUNT_FINDERS_LAST_REVIEWED }} contra
      <template v-for="(s, i) in DISCOUNT_FINDER_SOURCES" :key="i">
        <a :href="s.url" target="_blank" rel="noopener noreferrer nofollow">{{ s.label }}</a
        ><span v-if="i < DISCOUNT_FINDER_SOURCES.length - 1">, </span>
      </template>
      .
    </p>
  </section>
</template>

<style scoped>
.finder-label {
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  margin-bottom: 6px;
  color: rgba(var(--v-theme-on-surface), 0.7);
}
.finder-facts {
  display: grid;
  gap: 8px;
}
.finder-facts > div {
  display: grid;
  grid-template-columns: 1fr;
  gap: 2px;
}
@media (min-width: 720px) {
  .finder-facts > div {
    grid-template-columns: 180px 1fr;
    gap: 12px;
  }
}
.finder-facts dt {
  font-weight: 700;
  font-size: 0.85rem;
}
.finder-facts dd {
  margin: 0;
  font-size: 0.9rem;
  line-height: 1.5;
  min-width: 0;
}

.finder-list {
  margin: 0;
  padding-left: 18px;
  font-size: 0.9rem;
  line-height: 1.55;
}
.finder-list li {
  margin-bottom: 6px;
}
.finder-list li:last-child {
  margin-bottom: 0;
}

.finder-sources {
  margin: 0;
  padding-left: 18px;
  font-size: 0.85rem;
}
.finder-sources li {
  margin-bottom: 4px;
}
</style>
