import type { RentalZoneScores } from '~/utils/rentalZoneTypes'

/**
 * The neighbourhood bars' data, fetched once per page in the browser and shared by every card.
 * Nothing is rendered from it during SSR, so hydration never sees a state the server did not.
 */
export function useRentalZoneScores() {
  const scores = useState<RentalZoneScores | null>('rental-zone-scores', () => null)
  const status = useState<'idle' | 'loading' | 'ready' | 'error'>(
    'rental-zone-scores-status',
    () => 'idle'
  )
  onMounted(() => {
    if (status.value !== 'idle') return
    status.value = 'loading'
    $fetch<RentalZoneScores>('/api/rentals/zone-scores', { retry: 0, timeout: 15_000 })
      .then(value => {
        scores.value = value
        status.value = 'ready'
      })
      .catch(() => {
        status.value = 'error'
      })
  })
  return { scores, status }
}
