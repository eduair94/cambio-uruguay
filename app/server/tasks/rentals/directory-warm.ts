import { runRentalDirectoryWarm } from '../../utils/rentalDirectoryWarm'

// Recalienta el memo de /api/rentals (ver server/utils/rentalDirectoryWarm.ts) a los :51 y :56 de
// cada hora: justo después de que el backend escribe la horaria de alquileres (pm2
// currency-rentals-hourly, :47 UTC) y lejos de `rentals:alerts` (:52). Ambos workers del cluster lo
// disparan y ESO es lo deseado: cada uno calienta su propia memoria. Ver el comentario del util.
export default defineTask({
  meta: {
    name: 'rentals:directory-warm',
    description: 'Warm the cached rental directory responses after the hourly harvest',
  },
  async run() {
    // En dev el handler no guarda nada (`shouldBypassCache`), así que calentar sería pagar por nada
    // contra la Mongo de producción a la que apunta el .env local.
    if (import.meta.dev || process.env.NODE_ENV === 'test') return { result: { status: 'skipped' } }
    const result = await runRentalDirectoryWarm(query => $fetch('/api/rentals', { query }))
    console.info('[rental-directory] warm', result)
    return { result }
  },
})
