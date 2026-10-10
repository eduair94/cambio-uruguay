import { warmRentalFitCatalogue } from '../../utils/rentalFit'

// Mantiene armado el catálogo del ranking por hogar (/alquiler-ideal-uruguay, POST /api/rentals/fit,
// rank_rentals_for_household del MCP): rearmarlo tarda 50–60 s en producción (medido 2026-10-09), y
// así lo paga esta tarea y no la primera persona que busca. Cada 5 minutos revalida (lectura de la
// meta, barata) y rearma sólo si cambió la cosecha o el catálogo cumplió sus 10 minutos. Los dos
// workers la disparan y ESO es lo deseado: cada uno tiene su catálogo en memoria. Sólo mientras haya
// demanda en las últimas horas (o el proceso recién arrancó): un sitio sin búsquedas no relee 156 MB.
export default defineTask({
  meta: {
    name: 'rentals:fit-warm',
    description: 'Keep the household-ranking catalogue loaded while people use it',
  },
  async run() {
    // La .env local apunta a la base de producción: en dev no se carga nada por adelantado.
    if (import.meta.dev || process.env.NODE_ENV === 'test') return { result: { status: 'skipped' } }
    try {
      const result = await warmRentalFitCatalogue()
      if (result.status === 'warm') console.info('[rental-fit] warm', result)
      return { result }
    } catch (error) {
      // The next request sees the failure (a failed refresh drops the catalogue); never a cause here.
      console.warn('[rental-fit] warm failed', (error as Error)?.name || 'Error')
      return { result: { status: 'failed' } }
    }
  },
})
