// app/composables/useSponsorships.ts
import { resolveSponsoredRow, type SponsoredRowModel } from '~/utils/sponsorships'
import { viewerShowsAds } from '~/utils/adFree'

/**
 * La mitad Nuxt de los patrocinios: lee `runtimeConfig.public.sponsorships.homeRow` y deja que el
 * módulo puro decida si hay algo que dibujar. Mismo contrato que `useAds().canRender`: con la
 * clave vacía (el default), `homeRow` es null y `SponsoredCasaRow` no deja ni un nodo en el DOM.
 */
export function useSponsorships() {
  const publicConfig = useRuntimeConfig().public
  const config = (publicConfig.sponsorships ?? {}) as { homeRow?: unknown }

  const homeRow = computed<SponsoredRowModel | null>(() =>
    resolveSponsoredRow(config.homeRow, 'home-after-rates')
  )
  // The ad-free donation removes the sponsored row too: «sin anuncios» has to mean all of them.
  const adFreeViewer = useAdFreeViewer()
  const canRender = (placement: 'home-after-rates') =>
    placement === 'home-after-rates' && homeRow.value !== null && viewerShowsAds(adFreeViewer.value)

  return { homeRow, canRender }
}
