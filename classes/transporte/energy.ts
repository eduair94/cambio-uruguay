// El precio del kilovatio hora que paga cargar un monopatín o una bicicleta eléctrica.
//
// ESPEJO DE `app/utils/householdBills.ts` (`UTE_TARIFFS`, escalón 101-600 kWh de la Tarifa
// Residencial Simple, más IVA). El backend no puede importar de `app/` —son dos paquetes, dos
// builds y dos tsconfig— así que la cifra se copia, y `tests/transporte/energy_parity.test.ts` la
// vigila: si alguien actualiza el pliego de UTE en el app y se olvida de acá, el test falla.
//
// POR QUÉ EL ESCALÓN 101-600 Y NO EL PRIMERO: lo que importa es el ÚLTIMO kWh de la factura, no el
// promedio. Un hogar que ya consume más de 100 kWh al mes —o sea, prácticamente cualquiera— paga
// cada kWh que agregue el monopatín al precio del segundo escalón. Usar el primero abarataría la
// carga a la mitad para un caso que casi no existe.

/** IVA de la energía. El cargo fijo mensual está exonerado; la energía no. */
export const UTE_IVA_RATE = 0.22;

/** Escalón 101-600 kWh de la Tarifa Residencial Simple, sin IVA, vigente desde el 1/1/2026. */
export const UTE_SIMPLE_101_600_NO_VAT = 8.452;

export const KWH_RESIDENTIAL_UYU = {
  value: Math.round(UTE_SIMPLE_101_600_NO_VAT * (1 + UTE_IVA_RATE) * 100) / 100,
  asOf: "2026-01-01",
  source: "UTE — pliego tarifario, Tarifa Residencial Simple, escalón 101-600 kWh, con IVA",
  sourceUrl: "https://www.ute.com.uy/clientes/tarifas",
} as const;
