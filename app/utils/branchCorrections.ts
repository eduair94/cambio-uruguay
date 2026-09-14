/** Field-level corrections: keep the source row intact and never mask an unseen update. */
export interface BranchFieldSource {
  publisher: string
  url: string
  verifiedAt: string
  note: 'phone-conflict' | 'hours-refresh'
}

export type BranchFieldSources = Partial<Record<'phone' | 'hours', BranchFieldSource>>

interface CorrectableBranch {
  origin: string
  id: string
  address: string
  dept: string
  phone: string
  hours: string
  fieldSources?: BranchFieldSources
}

const normalize = (value: string) => value.trim().replace(/\s+/g, ' ').toLowerCase()
const officialContact = 'https://cambioprincipal.com.uy/contacto/'

/**
 * Verified 2026-09-14: BCU institution 2456 and the casa's contact page agree on
 * 46224521; BCU branch 2456-1 still says 26224521. The fresh branch response and
 * the casa agree on weekdays 08–18, while our stored row has an older schedule.
 * Match identity AND the observed old value. A future different source value
 * must surface for review, rather than be hidden behind this dated correction.
 */
export function applyBranchCorrections<T extends CorrectableBranch>(
  branch: T
): T & { fieldSources?: BranchFieldSources } {
  if (
    branch.origin !== 'cambio_principal' ||
    branch.id !== '2456-1' ||
    normalize(branch.dept) !== 'rivera' ||
    normalize(branch.address) !== 'treinta y tres orientales 1146 - rivera'
  ) {
    return branch
  }

  const corrected = { ...branch, fieldSources: { ...branch.fieldSources } }
  if (branch.phone.replace(/\D/g, '') === '26224521') {
    corrected.phone = '4622 4521'
    corrected.fieldSources.phone = {
      publisher: 'Cambio Principal',
      url: officialContact,
      verifiedAt: '2026-09-14',
      note: 'phone-conflict',
    }
  }
  if (normalize(branch.hours) === 'lunes a viernes 8:30 a 17:30 y sábado de 08:00 a 12:00') {
    corrected.hours = 'Lunes a Viernes 8:00 a 18:00'
    corrected.fieldSources.hours = {
      publisher: 'Cambio Principal',
      url: officialContact,
      verifiedAt: '2026-09-14',
      note: 'hours-refresh',
    }
  }
  return corrected
}
