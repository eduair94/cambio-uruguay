// GET /api/bankos/discounts?cards=brou_debit,itau_credit  (o ?banks=itau,brou)
//
// Los comercios con descuento para lo que el visitante tiene en el bolsillo — en vivo desde
// Bankos, o del snapshot del backend si Bankos está caído. Todo el trabajo pesado (fetch, caché,
// fallback, aplanado) vive en server/utils/bankos.
//
// `cards` es el parámetro correcto y `banks` quedó por compatibilidad. La diferencia no es
// cosmética: el emisor descuenta con crédito y con débito, y filtrar por emisor le devolvía a
// quien eligió "BROU Débito" los 1.224 locales de BROU cuando sólo 193 dan beneficio con débito
// (medido contra la API viva el 2026-09-02). El 84 % de lo que veía no le servía.
import {
  getRawCatalog,
  flattenForBanks,
  flattenForCards,
  brandCountForBanks,
} from '../../utils/bankos'
import { BANKOS_BANKS, BANKOS_CARDS, type BankosDiscountsResponse } from '../../../utils/bankos'

const VALID = new Set(BANKOS_BANKS.map(b => b.id))
const VALID_CARDS = new Set(BANKOS_CARDS.map(c => c.id))

export default defineEventHandler(async (event): Promise<BankosDiscountsResponse> => {
  const q = getQuery(event)
  const cards = [
    ...new Set(
      String(q.cards ?? '')
        .trim()
        .split(',')
        .map(s => s.trim().toLowerCase())
        .filter(c => VALID_CARDS.has(c))
    ),
  ]
  const banks = cards.length
    ? [...new Set(BANKOS_CARDS.filter(c => cards.includes(c.id)).map(c => c.bankId))]
    : [
        ...new Set(
          String(q.banks ?? '')
            .trim()
            .split(',')
            .map(s => s.trim().toLowerCase())
            .filter(b => VALID.has(b))
        ),
      ]

  // No card selected yet: don't wake the (cold-starting) upstream just to return nothing.
  if (banks.length === 0) {
    return {
      source: 'cache',
      generatedAt: null,
      banks: [],
      brandsCount: 0,
      locationsCount: 0,
      items: [],
    }
  }

  const { catalog, source } = await getRawCatalog()
  const items = cards.length
    ? flattenForCards(catalog.data, cards)
    : flattenForBanks(catalog.data, banks)

  // 30 min at the edge — matches the in-process catalog TTL; discounts change ~daily.
  setResponseHeader(event, 'Cache-Control', 'public, max-age=300, s-maxage=1800')

  return {
    source,
    generatedAt: catalog.generatedAt,
    banks,
    // Contado sobre lo que de verdad se devuelve: con tarjetas elegidas, las marcas alcanzables
    // con ESAS tarjetas, no todas las del emisor.
    brandsCount: cards.length
      ? new Set(items.map(i => i.brandId)).size
      : brandCountForBanks(catalog.data, banks),
    locationsCount: items.length,
    items,
  }
})
