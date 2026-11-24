<template>
  <!--
    El desglose pieza por pieza de una valuación: qué sale hoy cada pieza nueva y usada, y los dos
    totales SÓLO si existen enteros. La tabla vive en su propio contenedor con scroll horizontal:
    en 390 px cuatro columnas de montos no entran, y la página nunca puede scrollear de costado.
  -->
  <div class="pc-parts" data-testid="pc-parts">
    <div class="pc-parts__scroll">
      <table class="pc-parts__table">
        <caption class="pc-parts__caption">
          {{
            caption
          }}
        </caption>
        <thead>
          <tr>
            <th scope="col">Pieza</th>
            <th scope="col" class="num">Nueva hoy</th>
            <th scope="col" class="num">Usada hoy</th>
            <th scope="col" class="num">Ofertas</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(part, index) in valuation.parts" :key="`${part.role}-${part.slug ?? index}`">
            <th scope="row">
              <span class="pc-parts__role">{{ COMPUTER_ROLE_LABEL[part.role] ?? part.role }}</span>
              <NuxtLink v-if="part.slug" :to="localePath(computerPartLink(part.slug))">
                {{ part.label }}
              </NuxtLink>
              <template v-else>{{ part.label }}</template>
              <span v-if="part.estimated && !saysEstimated(part.label)" class="pc-parts__estimated">
                supuesta: el aviso no la dice
              </span>
              <span v-else-if="!part.slug" class="pc-parts__estimated">
                sin modelo exacto: no se le pone precio
              </span>
            </th>
            <td class="num">
              <template v-if="part.newUsd != null">
                {{ computerUsd(part.newUsd) }}
                <a
                  v-if="cheapest(part.slug)"
                  :href="cheapest(part.slug)!.url"
                  target="_blank"
                  rel="nofollow noopener"
                  class="pc-parts__cheapest"
                >
                  la más barata: {{ computerUsd(cheapest(part.slug)!.priceUsd) }}
                </a>
              </template>
              <span v-else class="pc-parts__none">sin precio</span>
            </td>
            <td class="num">
              <template v-if="part.usedUsd != null && part.usedFromNew">
                ≈ {{ computerUsd(part.usedUsd) }}
                <span class="pc-parts__estimated">(nueva más barata)</span>
              </template>
              <template v-else-if="part.usedUsd != null">{{ computerUsd(part.usedUsd) }}</template>
              <span v-else class="pc-parts__none">sin precio</span>
            </td>
            <td class="num pc-parts__n">{{ part.newN }} nuevas · {{ part.usedN }} usadas</td>
          </tr>
        </tbody>
        <tfoot v-if="totals">
          <tr data-testid="pc-parts-new-total">
            <th scope="row">Armarla con piezas nuevas</th>
            <td colspan="3">
              <strong v-if="valuation.newTotalUsd != null">
                {{ computerUsd(valuation.newTotalUsd) }}
              </strong>
              <span v-else>
                Sin total.
                {{ computerMissingLine(valuation.missingNew, 'nuevo') }}
              </span>
            </td>
          </tr>
          <tr data-testid="pc-parts-used-total">
            <th scope="row">Juntar las mismas piezas usadas</th>
            <td colspan="3">
              <template v-if="valuation.usedTotalUsd != null">
                <strong>{{ computerUsd(valuation.usedTotalUsd) }}</strong>
                <span
                  v-if="usesNewForUsed"
                  class="pc-parts__estimated"
                  data-testid="pc-used-from-new"
                >
                  {{ COMPUTER_USED_FROM_NEW_NOTE }}
                </span>
              </template>
              <span v-else>
                Sin total.
                {{ computerMissingLine(valuation.missingUsed, 'usado') }}
              </span>
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
    <p class="pc-parts__note">
      Cada precio es la mediana de hoy: nueva, de las ofertas de Mercado Libre Uruguay y de tiendas
      de informática uruguayas que nombran exactamente esa pieza; usada, de las piezas sueltas
      usadas de Facebook Marketplace y Mercado Libre.
      <template v-if="totals">
        Un total sólo se publica si TODAS las piezas tienen precio: sumar las que lo tienen daría un
        número más bajo que el real.
      </template>
    </p>
  </div>
</template>

<script setup lang="ts">
import {
  COMPUTER_ROLE_LABEL,
  COMPUTER_USED_FROM_NEW_NOTE,
  computerMissingLine,
  computerPartLink,
  computerSafeOfferUrl,
  computerUsd,
  computerUsesNewForUsed,
} from '~/utils/computadoras'
import type { ComputerPublicPart, ComputerPublicValuation } from '~/utils/computadorasPublic'

const props = withDefaults(
  defineProps<{
    valuation: ComputerPublicValuation
    /** Las filas de `computerparts` de esas piezas: traen la oferta nueva más barata. */
    parts?: readonly ComputerPublicPart[]
    caption?: string
    /** Los dos totales al pie. Una pieza suelta no se «arma»: su ficha los apaga. */
    totals?: boolean
  }>(),
  { parts: () => [], caption: 'Lo que sale hoy cada pieza', totals: true }
)
const localePath = useLocalePath()

const usesNewForUsed = computed(() => computerUsesNewForUsed(props.valuation))
/** El job ya escribe «(supuesta: …)» en la etiqueta de algunas piezas: no se repite la aclaración. */
const saysEstimated = (label: string) => /supuest/i.test(label)
const bySlug = computed(() => new Map((props.parts ?? []).map(part => [part.slug, part])))
/** La oferta nueva más barata, sólo con una URL que se pueda enlazar (`computerSafeOfferUrl`). */
function cheapest(slug: string | null) {
  if (!slug) return null
  const offer = bySlug.value.get(slug)?.new?.cheapest
  const url = computerSafeOfferUrl(offer?.url)
  return offer && url ? { url, priceUsd: offer.priceUsd } : null
}
</script>

<style scoped>
.pc-parts__scroll {
  overflow-x: auto;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 12px;
}
.pc-parts__table {
  width: 100%;
  min-width: 560px;
  border-collapse: collapse;
  font-size: 0.875rem;
}
.pc-parts__caption {
  text-align: left;
  padding: 12px 12px 4px;
  font-weight: 700;
}
.pc-parts__table th,
.pc-parts__table td {
  padding: 8px 12px;
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  text-align: left;
  vertical-align: top;
}
.pc-parts__table thead th {
  font-size: 0.75rem;
  font-weight: 600;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}
.pc-parts__table tbody th {
  font-weight: 500;
}
.pc-parts__table .num {
  text-align: right;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.pc-parts__table tfoot th,
.pc-parts__table tfoot td {
  background: rgba(var(--v-theme-on-surface), 0.04);
}
.pc-parts__role {
  display: block;
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}
.pc-parts__estimated,
.pc-parts__cheapest {
  display: block;
  font-size: 0.75rem;
  font-weight: 400;
}
.pc-parts__estimated {
  font-style: italic;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}
.pc-parts__none,
.pc-parts__n {
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}
.pc-parts__n {
  font-size: 0.75rem;
}
.pc-parts__note {
  margin: 8px 0 0;
  font-size: 0.8rem;
  max-width: 76ch;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}
</style>
