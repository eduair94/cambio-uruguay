import type { RentalAlertKind } from '~/utils/rentalAlerts'

export interface FollowUpAlert {
  kind: RentalAlertKind
  filters: Record<string, unknown>
  /** La página ya pinta `<RentalAlertDialogHost />`: la invitación no agrega otro. */
  hasHost: boolean
}

/**
 * La alerta que corresponde a la página que se está mirando, para la invitación del final
 * (`ReaderFollowUp`, brazo `b` del experimento A/B `seguimiento`). La invitación vive en el layout,
 * que no ve los filtros de la página: la página los declara acá. Sólo se escribe en el navegador
 * (la invitación es `ClientOnly`) y cada página la limpia al salir, para que la siguiente no herede
 * los filtros de otra.
 */
export function useFollowUpAlert() {
  return useState<FollowUpAlert | null>('cu-followup-alert', () => null)
}

/** Para las páginas: declara su alerta mientras estén montadas. */
export function declareFollowUpAlert(source: () => FollowUpAlert | null) {
  const state = useFollowUpAlert()
  let stop: (() => void) | null = null
  onMounted(() => {
    stop = watchEffect(() => {
      state.value = source()
    })
  })
  onBeforeUnmount(() => {
    stop?.()
    state.value = null
  })
}
