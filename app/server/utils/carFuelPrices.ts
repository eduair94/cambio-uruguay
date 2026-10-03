// Los precios de la nafta y el gasoil con que el asesor de compra y la ficha de cada auto calculan
// cuánto sale tenerlo. Si /api/combustibles no contesta, la tabla verificada a mano: un número de
// hace un mes es mejor que una ficha sin costos.
import type { FuelResponse } from '../../utils/fuelPrices'
import { FUEL_FALLBACK } from './combustiblesFallback'

export async function loadCarFuelPrices(): Promise<FuelResponse> {
  try {
    const response = await $fetch<FuelResponse>('/api/combustibles')
    return response?.latest?.super95 != null && response.latest.gasoil50s != null
      ? response
      : FUEL_FALLBACK
  } catch {
    return FUEL_FALLBACK
  }
}
