// La línea que viaja cuando alguien comparte una ficha de alquiler desde el teléfono
// (`navigator.share`): lo que cuesta por mes, alquiler + gastos comunes = total, porque en WhatsApp
// el título se pierde y el texto es lo único que se lee antes de abrir el enlace.
//
// Mismas reglas que la tarjeta de decisión de la ficha: el total suma el alquiler y los gastos
// comunes DEL MISMO aviso (`totalMonthlyUyu`), y un gasto que el aviso no publica se dice, nunca se
// estima. Lo que decide el texto es si el aviso PUBLICA los gastos, no si hay total: con un alquiler
// o unos gastos en dólares y sin cotización no hay suma, pero los gastos siguen siendo conocidos, y
// decir "no informados" sería falso.
import { rentalMoney } from './rentalPresentation'
import { totalMonthlyUyu, type RentalOffer } from './rentals'

type Translate = (key: string, values?: Record<string, unknown>) => string

export function rentalShareText(
  offer: Pick<
    RentalOffer,
    'price' | 'currency' | 'priceUyu' | 'commonExpenses' | 'commonExpensesCurrency'
  >,
  usdUyu: number,
  locale: string,
  t: Translate
): string {
  const rent = rentalMoney(offer.price, offer.currency, locale)
  if (offer.commonExpenses === 0) return t('shareNoExpenses', { rent })
  const amount = offer.commonExpenses
  const currency = offer.commonExpensesCurrency
  if (
    typeof amount !== 'number' ||
    !Number.isFinite(amount) ||
    amount < 0 ||
    (currency !== 'UYU' && currency !== 'USD')
  )
    return t('shareExpensesUnknown', { rent })
  const expenses = rentalMoney(amount, currency, locale)
  const total = totalMonthlyUyu(offer, usdUyu)
  return total === null
    ? t('shareNoTotal', { rent, expenses })
    : t('shareTotal', { rent, expenses, total: rentalMoney(total, 'UYU', locale) })
}
