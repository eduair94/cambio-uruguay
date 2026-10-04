// app/utils/boletoMontevideo.ts
// Datos de /precio-del-boleto-montevideo: lo que sale cada viaje en el transporte colectivo
// urbano de Montevideo, según la tabla que publica la Intendencia.
//
// POR QUÉ EXISTE: el sitio ya tenía página propia para cada costo de ANDAR EN AUTO —la nafta, la
// patente, las multas, los peajes, el IMESI de los eléctricos, el costo por mes de cada modo— y
// ninguna para el costo de NO tener auto, que es el que paga la mayoría. El boleto aparecía sólo
// como insumo de otras cuentas: `lowWage.ts` lo usa para «dos boletos por día, veintidós días»,
// `costOfLiving.ts` para el transporte del hogar y `transportAssumptions.ts` como una línea del
// comparador de modos. La pregunta que llega —cuánto sale el boleto, cuánto el de dos horas, qué
// paga un jubilado o un estudiante, cuánto más sale pagar en efectivo— no la contestaba ninguna.
//
// LO QUE DELIBERADAMENTE NO SE PUBLICA:
//
//   1. NINGUNA TARIFA DEL INTERIOR NI INTERDEPARTAMENTAL. El STM es el sistema de Montevideo y
//      esta tabla es la de la Intendencia de Montevideo. Las tarifas interdepartamentales las fija
//      el MTOP y las urbanas de cada departamento su propia intendencia: son otras fuentes y
//      otra página. Acá se dice Montevideo en el título y no se insinúa cobertura nacional.
//
//   2. NINGÚN PRECIO PROYECTADO NI «TARIFA 2027». El ajuste rige desde el 5 de enero de 2026 y la
//      Intendencia no publica el siguiente hasta que lo resuelve. Multiplicar por la inflación
//      daría una tabla verosímil y sería una cifra nuestra con cara de dato oficial.
//
//   3. NINGUNA ARMONIZACIÓN DE LA LÍNEA «DIFERENCIAL». La propia página oficial enumera dos
//      conjuntos de líneas distintos para el mismo boleto según cómo se pague (ver
//      `DIFERENCIAL_DISCREPANCIA`). Se reproducen los dos tal como están publicados y se dice que
//      no coinciden. Elegir uno "porque seguro es el bueno" sería inventar la respuesta a algo que
//      la fuente no responde.
//
// FUENTE PRIMARIA, verificada el 2026-10-04 (ver `BOLETO_SOURCES`):
//   - Intendencia de Montevideo — «Tarifas del transporte colectivo urbano». Tarifas con tarjeta
//     STM y en efectivo, costo de las tarjetas, devolución al usuario frecuente, mínimo de recarga
//     y la tabla del boleto TUS del MIDES. La página declara «Última actualización: 31/08/2026» y
//     el ajuste vigente «a partir de la hora 00:00 del lunes 5 de enero de 2026».

export interface BoletoSource {
  readonly label: string
  readonly url: string
}

/** Fecha en la que se contrastó todo este archivo contra la tabla oficial. */
export const BOLETO_VERIFIED_AT = '2026-10-04'

/** Desde cuándo rige el ajuste que publica la tabla, en palabras de la propia Intendencia. */
export const BOLETO_VIGENTE_DESDE = '2026-01-05'

/** «Última actualización» que declara la página oficial. No es lo mismo que la vigencia. */
export const BOLETO_FUENTE_ACTUALIZADA = '2026-08-31'

export const BOLETO_SOURCE_URL =
  'https://montevideo.gub.uy/tipo/area-tematica/sistema-de-transporte-metropolitano/tarifas-del-transporte-colectivo-urbano'

export const BOLETO_SOURCES: readonly BoletoSource[] = Object.freeze([
  {
    label:
      'Intendencia de Montevideo — Tarifas del transporte colectivo urbano (vigentes desde el 5 de enero de 2026)',
    url: BOLETO_SOURCE_URL,
  },
  {
    label: 'Intendencia de Montevideo — Locales de atención a usuarios STM',
    url: 'https://montevideo.gub.uy/areas-tematicas/movilidad/sistema-de-transporte-metropolitano/locales-de-atencion-usuarios-stm',
  },
])

/** Un renglón de la tabla oficial. `id` se comparte entre las dos formas de pago cuando existe en ambas. */
export interface Tarifa {
  readonly id: string
  /** El nombre tal como lo publica la Intendencia. */
  readonly label: string
  /** Pesos uruguayos. Puede tener centésimos: el estudiante y el prepago los tienen. */
  readonly precio: number
  /** Aclaración publicada en la propia tabla, cuando la trae. */
  readonly nota?: string
}

/**
 * Viajes abonados con tarjeta STM (dinero electrónico o pospago).
 *
 * El orden es el de la página oficial, no de menor a mayor: así la tabla del sitio se puede
 * cotejar renglón a renglón contra la fuente sin reordenar nada mentalmente.
 */
export const TARIFAS_CON_TARJETA: readonly Tarifa[] = Object.freeze([
  {
    id: 'una-hora',
    label: '1 hora',
    precio: 52,
    nota: 'Habilita dos ómnibus urbanos, tres en los puntos de intercambio.',
  },
  { id: 'dos-horas', label: '2 horas', precio: 78 },
  { id: 'jubilado-a', label: 'Jubilado categoría A', precio: 14 },
  { id: 'jubilado-b', label: 'Jubilado categoría B', precio: 23 },
  { id: 'estudiante-a', label: 'Estudiante categoría A', precio: 28.5 },
  { id: 'estudiante-b', label: 'Estudiante categoría B', precio: 39.9 },
  { id: 'zonal', label: 'Zonal', precio: 27 },
  { id: 'centrico', label: 'Céntrico', precio: 38 },
  {
    id: 'prepago-nominado',
    label: 'Prepago nominado (abono institucional)',
    precio: 46.8,
  },
  {
    id: 'diferencial',
    label: 'Diferencial',
    precio: 78,
    nota: 'Líneas D 1, 5, 8, 9, 10 y 11.',
  },
  { id: 'combinacion-metropolitana', label: 'Combinación metropolitana', precio: 80 },
])

/** Viajes abonados en efectivo. No incluye estudiante ni prepago: la tabla oficial no los lista. */
export const TARIFAS_EN_EFECTIVO: readonly Tarifa[] = Object.freeze([
  { id: 'una-hora', label: 'Común y 1 hora', precio: 64 },
  { id: 'dos-horas', label: '2 horas', precio: 97 },
  { id: 'jubilado-a', label: 'Jubilado categoría A', precio: 17 },
  { id: 'jubilado-b', label: 'Jubilado categoría B', precio: 26 },
  { id: 'zonal', label: 'Zonal', precio: 34 },
  { id: 'centrico', label: 'Céntrico', precio: 48 },
  {
    id: 'diferencial',
    label: 'Diferencial',
    precio: 97,
    nota: 'Líneas D 1, 2, 3, 5, 8, 9, 10 y 11.',
  },
  { id: 'combinacion-metropolitana', label: 'Combinación Metropolitana', precio: 80 },
])

/**
 * La página oficial enumera DOS conjuntos de líneas para el boleto diferencial, uno en la tabla de
 * tarjeta y otro en la de efectivo, y la de efectivo incluye dos líneas más (D 2 y D 3). No es un
 * error de lectura ni algo que esta página pueda resolver: son los dos textos publicados.
 */
export const DIFERENCIAL_DISCREPANCIA = Object.freeze({
  conTarjeta: 'D 1, 5, 8, 9, 10 y 11',
  enEfectivo: 'D 1, 2, 3, 5, 8, 9, 10 y 11',
  soloEnEfectivo: Object.freeze(['D 2', 'D 3']),
})

/** Lo que cuesta la tarjeta, en viajes comunes, según cuántas veces la pediste. */
export const COSTO_TARJETAS = Object.freeze({
  corriente: Object.freeze([
    { vez: 'Primera vez', costo: 'Gratuita' },
    { vez: 'Segunda vez o más', costo: 'El precio de dos viajes comunes' },
  ]),
  especiales: Object.freeze([
    { vez: 'Primera vez', costo: 'El precio de un viaje común' },
    { vez: 'Segunda y tercera', costo: 'El precio de dos viajes comunes' },
    { vez: 'Cuarta y quinta', costo: 'El precio de cuatro viajes comunes' },
    { vez: 'Sexta y sucesivas', costo: 'El precio de seis viajes comunes' },
  ]),
  /** A qué tarjetas aplica la escala de arriba, en palabras de la Intendencia. */
  especialesAplicaA:
    'Estudiante, Jubilado, Gestión Social, Prepago Nominado, Organismo y Transporte',
})

/** Devolución al usuario o usuaria frecuente, a mes vencido, por cada boleto. */
export const DEVOLUCION_FRECUENTE = 2

/** Mínimo de recarga de la tarjeta común, en pesos. */
export const RECARGA_MINIMA = 100

/** Un renglón de la tabla del boleto TUS (Tarjeta Uruguay Social, MIDES). */
export interface TarifaTus {
  readonly id: string
  readonly label: string
  readonly valorABordo: number
  readonly valorTus: number
  readonly devolucion: number
}

/**
 * El boleto TUS: la devolución a mes vencido para beneficiarias y beneficiarios de la Tarjeta
 * Uruguay Social del MIDES. Los tres números van juntos porque la tabla oficial los publica juntos,
 * y porque `devolucion` NO siempre es la resta de los otros dos: en el metropolitano saliente la
 * fuente publica $80, $59 y $21, y en el 2 horas $78, $55 y $23 (ahí sí cierra). Se transcriben
 * los tres valores publicados en vez de calcular uno a partir de los otros.
 */
export const TARIFAS_TUS: readonly TarifaTus[] = Object.freeze([
  { id: 'zonal', label: 'Zonal electrónico', valorABordo: 27, valorTus: 21, devolucion: 6 },
  { id: 'centrico', label: 'Céntrico electrónico', valorABordo: 38, valorTus: 25, devolucion: 13 },
  {
    id: 'una-hora',
    label: '1 hora electrónico (MVD)',
    valorABordo: 52,
    valorTus: 36,
    devolucion: 16,
  },
  {
    id: 'dos-horas',
    label: '2 horas electrónico (MVD)',
    valorABordo: 78,
    valorTus: 55,
    devolucion: 23,
  },
  {
    id: 'metropolitano-saliente',
    label: 'Metropolitano saliente electrónico',
    valorABordo: 80,
    valorTus: 59,
    devolucion: 21,
  },
])

/** El supuesto declarado del costo mensual: ida y vuelta, cinco días por semana. */
export const VIAJES_POR_DIA = 2
export const DIAS_POR_MES = 22

/** Lo que sale un mes de ir y volver, al precio unitario que se le pase. */
export function costoMensual(
  precioUnitario: number,
  viajesPorDia: number = VIAJES_POR_DIA,
  diasPorMes: number = DIAS_POR_MES
): number {
  return Math.round(precioUnitario * viajesPorDia * diasPorMes * 100) / 100
}

export interface SobreprecioEfectivo {
  readonly id: string
  readonly label: string
  readonly conTarjeta: number
  readonly enEfectivo: number
  /** Pesos de diferencia por viaje. Cero cuando la tarifa es la misma. */
  readonly diferencia: number
  /** Proporción sobre el precio con tarjeta: 0,2308 es «23 % más caro». */
  readonly ratio: number
}

/**
 * Cuánto más sale pagar el mismo boleto en efectivo.
 *
 * Es el único cálculo propio de esta página y está hecho SÓLO con los dos números publicados de
 * cada renglón: ninguna tarifa sale de acá. Se comparan únicamente los `id` que existen en las dos
 * tablas —el estudiante y el prepago no tienen precio en efectivo publicado, así que no aparecen—,
 * y el orden es de mayor a menor sobreprecio relativo, que es lo que la pregunta quiere saber.
 */
export function sobrepreciosEfectivo(): SobreprecioEfectivo[] {
  const porTarjeta = new Map(TARIFAS_CON_TARJETA.map(t => [t.id, t]))
  return TARIFAS_EN_EFECTIVO.flatMap(efectivo => {
    const tarjeta = porTarjeta.get(efectivo.id)
    if (!tarjeta) return []
    const diferencia = Math.round((efectivo.precio - tarjeta.precio) * 100) / 100
    return [
      {
        id: efectivo.id,
        label: tarjeta.label,
        conTarjeta: tarjeta.precio,
        enEfectivo: efectivo.precio,
        diferencia,
        ratio: diferencia / tarjeta.precio,
      },
    ]
  }).sort((a, b) => b.ratio - a.ratio || a.id.localeCompare(b.id))
}

/** Las tarifas con tarjeta que la tabla de efectivo no publica. */
export function soloConTarjeta(): Tarifa[] {
  const enEfectivo = new Set(TARIFAS_EN_EFECTIVO.map(t => t.id))
  return TARIFAS_CON_TARJETA.filter(t => !enEfectivo.has(t.id))
}
