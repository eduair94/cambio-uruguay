import { warmRentalFitCatalogue } from '../utils/rentalFit'

// Arma el catálogo del ranking por hogar después del arranque, para que la primera búsqueda tras un
// deploy no espere los 50–60 s de la carga. Los dos workers del cluster, separados 90 s para no leer
// los 156 MB de Mongo y proyectarlos al mismo tiempo; después lo sostiene la tarea rentals:fit-warm.
// Nunca en dev, prerender ni tests: la .env local apunta a la base de producción.
export default defineNitroPlugin(() => {
  if (import.meta.dev || import.meta.prerender || process.env.NODE_ENV === 'test') return
  const instance = Number(process.env.NODE_APP_INSTANCE ?? 0) % 2
  const timer = setTimeout(
    () => {
      warmRentalFitCatalogue()
        .then(result => console.info('[rental-fit] boot', result))
        .catch(error => console.warn('[rental-fit] boot failed', (error as Error)?.name || 'Error'))
    },
    45_000 + instance * 90_000
  )
  timer.unref?.()
})
