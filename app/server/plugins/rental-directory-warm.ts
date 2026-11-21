import { rentalDirectoryData } from '../utils/rentalDirectoryData'
import {
  rentalDirectoryBootWarmDelay,
  rentalDirectoryWarmFetcher,
  runRentalDirectoryWarm,
} from '../utils/rentalDirectoryWarm'

// Calienta los memos de /api/rentals UNA vez después del arranque, para que un `pm2 reload` no deje
// a los primeros visitantes sobre workers fríos; después los sostiene la tarea
// rentals:directory-warm (:51 y :56). Un temporizador de un disparo, `unref`, nunca un intervalo.
// Nunca en dev, prerender, tests ni en la verificación previa al deploy: ver
// rentalDirectoryBootWarmDelay en server/utils/rentalDirectoryWarm.ts.
export default defineNitroPlugin(() => {
  const delay = rentalDirectoryBootWarmDelay({
    dev: import.meta.dev,
    prerender: import.meta.prerender,
    env: process.env,
  })
  if (delay === null) return
  const timer = setTimeout(() => {
    runRentalDirectoryWarm(
      rentalDirectoryWarmFetcher(rentalDirectoryData.warm, query =>
        $fetch('/api/rentals', { query })
      )
    )
      .then(result => console.info('[rental-directory] boot warm', result))
      .catch(error =>
        console.warn('[rental-directory] boot warm failed', (error as Error)?.name || 'Error')
      )
  }, delay)
  timer.unref?.()
})
