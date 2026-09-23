// Los supuestos del comparador de transporte: todo lo que NO publica ningún catálogo del sitio.
//
// Cada cifra viaja con su valor, su fecha de vigencia, quién la publica y el enlace. La página las
// imprime al lado del número y deja cambiarlas. Es el mismo patrón que `UTE_TARIFFS` y que las
// promociones de Mercado Pago: una tabla curada a mano, fechada, que se revisa una vez por año.
//
// TRES CATEGORÍAS, Y LA DIFERENCIA IMPORTA MÁS QUE LOS NÚMEROS:
//
//  1. **Cifra oficial.** Sale de una norma o de un organismo, con su URL. El SOA, la patente, el
//     empadronamiento, la libreta, los fallecidos de UNASEV, los hurtos del Ministerio del Interior.
//  2. **Cruce propio.** Dos cifras oficiales divididas una por otra porque ninguna fuente publica el
//     cociente. La tasa de fallecidos por vehículo es esto, y va marcada como tal, con el
//     denominador escrito: entre el parque "activo" del MIEM y el parque crudo del SUCIVE hay casi
//     un factor dos, así que la misma división da dos resultados distintos según qué se use.
//  3. **Supuesto del sitio.** No existe fuente uruguaya. El consumo de una moto por cilindrada, la
//     vida de una batería, cuántos días de lluvia se resuelven en ómnibus. Van con
//     `SITE_ASSUMPTION` como fuente, se pueden cambiar en la página y NO se presentan como dato.
//
// LO QUE SE VERIFICÓ Y NO SE PUDO PUBLICAR, que es parte del trabajo (22/9/2026):
//
//  * **El BSE no publica tarifario del SOA.** Su página del Plan SOA no tiene un solo precio: hay que
//    cotizar. Lo único oficial es el "Importe Promedio del Costo del SOA" que publica la
//    Superintendencia de Servicios Financieros del BCU, y hay que publicarlo POR LO QUE ES: un
//    promedio de mercado cuya función legal es calcular la multa por circular sin seguro
//    (Decreto 381/2009 art. 18), no una tarifa que alguien vaya a pagar exactamente.
//  * **No existe tabla nacional de patente para motos de menos de 500 cc.** El Texto Ordenado del
//    SUCIVE 2026 las manda a "la patente de 2025 ajustada por IPC", que fija la intendencia del
//    primer empadronamiento. Por eso `roadTaxUyu` de la moto es `null` y la página enlaza la consulta
//    por matrícula en vez de inventar un rango.
//  * **INUMET no publica días de lluvia de Montevideo.** Toda su sección de estadísticas
//    climatológicas se sirve vacía y no hay copia en Wayback. Lo único publicable es el promedio
//    NACIONAL del Boletín Anual 2025 (74 días en 2025, media 80), y está rotulado como nacional,
//    porque escribir "en Montevideo llueve 80 días" a partir de eso sería falso.
//  * **No hay tasa de siniestralidad por kilómetro.** Uruguay no publica recorrido vehicular por
//    modo. Ninguna cifra "por km" tendría respaldo.
import type {
  TransportAssumptions,
  TransportFigure,
  TransportGlobalAssumptions,
  TransportMode,
  TransportModeAssumptions,
} from './transportModel'

/** La fuente de un supuesto que no tiene fuente: el sitio lo eligió y se puede cambiar en pantalla. */
export const SITE_ASSUMPTION = 'Supuesto del sitio — sin fuente oficial uruguaya'
const SITE_ASSUMPTION_URL = 'https://cambio-uruguay.com/conviene-auto-moto-o-omnibus-uruguay'

const figure = (
  value: number,
  asOf: string,
  source: string,
  sourceUrl: string,
  note?: string
): TransportFigure => ({ value, asOf, source, sourceUrl, ...(note ? { note } : {}) })

const assumed = (value: number, note: string): TransportFigure =>
  figure(value, '2026-09-22', SITE_ASSUMPTION, SITE_ASSUMPTION_URL, note)

// ---------------------------------------------------------------------------------------------
// Fuentes oficiales, con su URL y su fecha de vigencia
// ---------------------------------------------------------------------------------------------

const SOA_URL =
  'https://www.bcu.gub.uy/Servicios-Financieros-SSF/Seguros/SOA/SOA_Prima_Promedio_2026_2027.pdf'
const SOA_SOURCE =
  'BCU — Superintendencia de Servicios Financieros, prima promedio del SOA 2026-2027'
const SOA_NOTE =
  'Es el promedio del mercado que publica el BCU, no una tarifa: la ley lo usa para calcular la multa por circular sin seguro. Lo que vas a pagar sale de cotizar.'

const SUCIVE_URL =
  'https://tramites.montevideo.gub.uy/sites/tramites.montevideo.gub.uy/files/tramites/documentos/TOS%202026.pdf'
const PATENTE_IM_URL = 'https://montevideo.gub.uy/areas-tematicas/movilidad/patente-de-rodados'

const EMPADRONAMIENTO_URL =
  'https://tramites.montevideo.gub.uy/tramites-y-tributos/solicitud/empadronamiento-de-vehiculos-nacionales'

const UNASEV_URL =
  'https://www.gub.uy/unidad-nacional-seguridad-vial/sites/unidad-nacional-seguridad-vial/files/documentos/noticias/2025%20-%20Informe%20Anual%20de%20Seguridad%20Vial_.pdf'
const UNASEV_SOURCE = 'UNASEV — Informe Anual de Siniestralidad Vial 2025'

const AECA_URL =
  'https://www.gub.uy/ministerio-interior/sites/ministerio-interior/files/documentos/publicaciones/Aeca%20Anuario%20FC.pdf'
const MIEM_URL =
  'https://www.gub.uy/ministerio-industria-energia-mineria/datos-y-estadisticas/estadisticas/parque-automotor'

const CROSS_NOTE =
  'Cruce propio entre UNASEV 2025 y el parque vehicular activo del MIEM 2025 (motos 490.340; autos, SUV, pick up y utilitarios 1.096.973). Ninguna de las dos fuentes publica el cociente, y con el parque crudo del SUCIVE la tasa da casi la mitad.'

// ---------------------------------------------------------------------------------------------
// Supuestos globales
// ---------------------------------------------------------------------------------------------

export const TRANSPORT_GLOBAL_ASSUMPTIONS: TransportGlobalAssumptions = {
  rainDaysPerYear: figure(
    80,
    '2025-12-31',
    'INUMET — Boletín Climático Anual 2025',
    'https://www.inumet.gub.uy/sites/default/files/2026-02/Boletin_Anual_2025.pdf',
    'Promedio A ESCALA PAÍS, no de Montevideo: en 2025 se registraron 74 días con precipitación contra una media esperada de 80. INUMET no publica hoy la serie por estación.'
  ),
  parkingPerHourUyu: figure(
    52,
    '2025-01-09',
    'Intendencia de Montevideo — estacionamiento tarifado',
    'https://montevideo.gub.uy/areas-tematicas/movilidad/estacionamiento-tarifado/precio-del-ticket-y-como-pagarlo-0',
    'Ciudad Vieja, Centro y Cordón, lunes a viernes de 10 a 18 h. La página oficial lleva sello de enero de 2025 y la tarifa se ajusta por IPC una vez al año: puede estar desactualizada.'
  ),
  parkingSearchMinutes: assumed(
    5,
    'Cuánto se tarda en encontrar lugar en zona tarifada. Nadie lo mide.'
  ),
}

// ---------------------------------------------------------------------------------------------
// Por modo
// ---------------------------------------------------------------------------------------------

const OMNIBUS: TransportModeAssumptions = {
  mode: 'omnibus',
  label: 'Ómnibus',
  equipmentUyu: figure(
    0,
    '2026-01-05',
    'Intendencia de Montevideo — STM',
    'https://montevideo.gub.uy/tipo/area-tematica/sistema-de-transporte-metropolitano/tarifas-del-transporte-colectivo-urbano',
    'La tarjeta STM es gratis la primera vez.'
  ),
  paperworkUyu: figure(
    0,
    '2026-01-05',
    'Intendencia de Montevideo — STM',
    'https://montevideo.gub.uy/tipo/area-tematica/sistema-de-transporte-metropolitano/tarifas-del-transporte-colectivo-urbano'
  ),
  insuranceUyu: null,
  roadTaxUyu: null,
  roadTaxRateOfPrice: null,
  fixedMaintenanceUyu: figure(
    0,
    '2026-01-05',
    'Intendencia de Montevideo — STM',
    'https://montevideo.gub.uy/tipo/area-tematica/sistema-de-transporte-metropolitano/tarifas-del-transporte-colectivo-urbano'
  ),
  maintenancePerKmUyu: figure(
    0,
    '2026-01-05',
    'Intendencia de Montevideo — STM',
    'https://montevideo.gub.uy/tipo/area-tematica/sistema-de-transporte-metropolitano/tarifas-del-transporte-colectivo-urbano'
  ),
  energyKind: 'ninguna',
  consumptionPer100Km: figure(
    0,
    '2026-01-05',
    'Intendencia de Montevideo — STM',
    'https://montevideo.gub.uy/tipo/area-tematica/sistema-de-transporte-metropolitano/tarifas-del-transporte-colectivo-urbano'
  ),
  annualDepreciation: figure(
    0,
    '2026-01-05',
    'Intendencia de Montevideo — STM',
    'https://montevideo.gub.uy/tipo/area-tematica/sistema-de-transporte-metropolitano/tarifas-del-transporte-colectivo-urbano'
  ),
  rainFallbackShare: figure(
    0,
    '2026-01-05',
    'Intendencia de Montevideo — STM',
    'https://montevideo.gub.uy/tipo/area-tematica/sistema-de-transporte-metropolitano/tarifas-del-transporte-colectivo-urbano'
  ),
  theftAnnualProbability: figure(
    0,
    '2026-01-05',
    'Intendencia de Montevideo — STM',
    'https://montevideo.gub.uy/tipo/area-tematica/sistema-de-transporte-metropolitano/tarifas-del-transporte-colectivo-urbano'
  ),
  theftRecoveryShare: figure(
    0,
    '2026-01-05',
    'Intendencia de Montevideo — STM',
    'https://montevideo.gub.uy/tipo/area-tematica/sistema-de-transporte-metropolitano/tarifas-del-transporte-colectivo-urbano'
  ),
  // El tiempo del ómnibus ya trae caminata y espera calculadas con los horarios del STM
  // (`classes/transporte/transit.ts`), así que acá no se le suma nada: sumar otra vez sería contar
  // dos veces lo mismo.
  accessMinutes: figure(
    0,
    '2026-09-22',
    'Horarios del STM procesados por el sitio',
    'https://catalogodatos.gub.uy/dataset/horarios-de-omnibus-urbanos-por-parada-stm',
    'La caminata y la espera ya están adentro del tiempo del viaje.'
  ),
  cruiseSpeedKmh: figure(
    16,
    '2026-09-22',
    'Medido sobre los horarios del STM',
    'https://catalogodatos.gub.uy/dataset/horarios-de-omnibus-urbanos-por-parada-stm',
    'Velocidad comercial promedio, sólo como respaldo cuando un par no tiene recorrido relevado.'
  ),
  storageMonthlyUyu: figure(
    0,
    '2026-01-05',
    'Intendencia de Montevideo — STM',
    'https://montevideo.gub.uy/tipo/area-tematica/sistema-de-transporte-metropolitano/tarifas-del-transporte-colectivo-urbano'
  ),
  fatalities: figure(
    5,
    '2025-12-31',
    UNASEV_SOURCE,
    UNASEV_URL,
    'Fallecidos en ómnibus en 2025, sobre 471 en total.'
  ),
  fatalityPer100kVehicles: null,
}

const PIE: TransportModeAssumptions = {
  ...OMNIBUS,
  mode: 'pie',
  label: 'A pie',
  accessMinutes: figure(
    0,
    '2026-09-22',
    'Ruta peatonal de OpenStreetMap',
    'https://routing.openstreetmap.de/'
  ),
  cruiseSpeedKmh: figure(
    4.5,
    '2026-09-22',
    'Medido con el ruteador peatonal de OSM',
    'https://routing.openstreetmap.de/',
    'Pocitos–Ciudad Vieja: 6,06 km en 81 minutos.'
  ),
  fatalities: figure(74, '2025-12-31', UNASEV_SOURCE, UNASEV_URL, 'Peatones fallecidos en 2025.'),
  fatalityPer100kVehicles: null,
}

const MONOPATIN: TransportModeAssumptions = {
  mode: 'monopatin',
  label: 'Monopatín eléctrico',
  equipmentUyu: assumed(
    3000,
    'Casco y candado. El casco medido (mediana $3.490) es de moto; uno de monopatín sale menos.'
  ),
  paperworkUyu: figure(
    0,
    '2026-09-22',
    'Decretos departamentales de movilidad personal',
    'https://cambio-uruguay.com/monopatines-electricos-uruguay',
    'Un monopatín eléctrico no se empadrona ni lleva matrícula.'
  ),
  insuranceUyu: null,
  roadTaxUyu: null,
  roadTaxRateOfPrice: null,
  fixedMaintenanceUyu: assumed(
    2500,
    'Frenos, cubiertas y ajustes por año. No hay tarifario publicado.'
  ),
  maintenancePerKmUyu: assumed(0.6, 'Desgaste por kilómetro, sin contar la batería.'),
  energyKind: 'electrica',
  consumptionPer100Km: assumed(
    1.5,
    'kWh cada 100 km. Uruguay no publica etiquetado de eficiencia para movilidad personal; es el orden de magnitud de las fichas de fabricante.'
  ),
  annualDepreciation: assumed(
    0.25,
    'La batería es la pieza que decide el valor de reventa y se degrada con los ciclos.'
  ),
  rainFallbackShare: assumed(
    0.85,
    'Qué parte de los días de lluvia se termina resolviendo en ómnibus.'
  ),
  theftAnnualProbability: assumed(
    0.05,
    'El Ministerio del Interior publica hurtos de motos y autos, no de monopatines.'
  ),
  theftRecoveryShare: assumed(0, 'Sin seguro obligatorio ni registro, lo robado no vuelve.'),
  accessMinutes: assumed(3, 'Candado, plegado y dónde dejarlo.'),
  cruiseSpeedKmh: assumed(
    20,
    'Velocidad de crucero urbana, dentro de lo que permiten los decretos departamentales.'
  ),
  storageMonthlyUyu: figure(
    0,
    '2026-09-22',
    'Sin costo de guardado',
    SITE_ASSUMPTION_URL,
    'Entra en casa.'
  ),
  fatalities: null,
  fatalityPer100kVehicles: null,
}

const BICI: TransportModeAssumptions = {
  ...MONOPATIN,
  mode: 'bici',
  label: 'Bicicleta eléctrica',
  equipmentUyu: assumed(
    3500,
    'Casco y candado; una e-bike pide un candado más serio que un monopatín.'
  ),
  fixedMaintenanceUyu: assumed(3500, 'Service de transmisión, frenos y cubiertas por año.'),
  maintenancePerKmUyu: assumed(0.8, 'Cadena, pastillas y cubiertas por kilómetro.'),
  consumptionPer100Km: assumed(1.2, 'kWh cada 100 km, pedaleo asistido.'),
  annualDepreciation: assumed(0.2, 'Igual que el monopatín, la batería manda.'),
  rainFallbackShare: assumed(0.8, 'Algo más usable que el monopatín bajo lluvia, no mucho.'),
  theftAnnualProbability: assumed(0.04, 'Sin serie oficial de hurto de bicicletas en Uruguay.'),
  accessMinutes: assumed(3, 'Candado y estacionamiento.'),
  cruiseSpeedKmh: assumed(22, 'Con asistencia, en ciudad.'),
  fatalities: figure(
    23,
    '2025-12-31',
    UNASEV_SOURCE,
    UNASEV_URL,
    'Ciclistas fallecidos en 2025. UNASEV no separa bicicleta común de eléctrica.'
  ),
  fatalityPer100kVehicles: null,
}

const MOTO: TransportModeAssumptions = {
  mode: 'moto',
  label: 'Moto',
  equipmentUyu: figure(
    3490,
    '2026-09-22',
    'Medición propia sobre avisos de MercadoLibre Uruguay',
    'https://listado.mercadolibre.com.uy/casco-moto-homologado',
    'Mediana de 43 avisos de casco homologado (p25 $2.777, p75 $7.800). Precio de mercado, no oficial.'
  ),
  paperworkUyu: figure(
    3304.82,
    '2026-01-09',
    'Intendencia de Montevideo — empadronamiento de vehículos',
    EMPADRONAMIENTO_URL,
    'Una chapa matrícula más libreta de circulación. La libreta de conducir G1/G2 va aparte ($2.393 la primera vez).'
  ),
  insuranceUyu: figure(2886, '2026-09-01', SOA_SOURCE, SOA_URL, SOA_NOTE),
  roadTaxUyu: null,
  roadTaxRateOfPrice: null,
  fixedMaintenanceUyu: assumed(
    6000,
    'Service, aceite y ajustes por año. No hay tarifario publicado.'
  ),
  maintenancePerKmUyu: assumed(1.5, 'Cubiertas, cadena y frenos por kilómetro.'),
  energyKind: 'nafta',
  consumptionPer100Km: assumed(
    2.5,
    'L/100 km de una moto de ciudad. Uruguay no publica etiquetado de eficiencia para motos.'
  ),
  annualDepreciation: assumed(
    0.15,
    'Se reemplaza por la caída medida sobre el catálogo de motos cuando exista.'
  ),
  rainFallbackShare: assumed(0.5, 'Se puede andar bajo lluvia; mucha gente no lo hace.'),
  theftAnnualProbability: figure(
    0.0188,
    '2025-12-31',
    'Cruce propio: Ministerio del Interior (AECA 2025) sobre parque MIEM 2025',
    AECA_URL,
    `${CROSS_NOTE} 9.202 motos hurtadas en 2025 sobre 490.340 motos activas.`
  ),
  theftRecoveryShare: assumed(0, 'El SOA no cubre el hurto: cubre daños a terceros.'),
  accessMinutes: assumed(2, 'Ponerse el casco y estacionar.'),
  cruiseSpeedKmh: assumed(32, 'Sólo como respaldo: cuando hay ruta medida, manda la ruta.'),
  storageMonthlyUyu: figure(
    0,
    '2026-09-22',
    'Sin costo de guardado',
    SITE_ASSUMPTION_URL,
    'Entra en casa o en el garaje del trabajo.'
  ),
  fatalities: figure(
    236,
    '2025-12-31',
    UNASEV_SOURCE,
    UNASEV_URL,
    'La mitad de los 471 fallecidos de 2025. En calles departamentales son el 61 %, y el 75 % de los lesionados graves.'
  ),
  fatalityPer100kVehicles: figure(
    48.1,
    '2025-12-31',
    'Cruce propio: UNASEV 2025 sobre parque MIEM 2025',
    MIEM_URL,
    CROSS_NOTE
  ),
}

const AUTO: TransportModeAssumptions = {
  mode: 'auto',
  label: 'Auto usado',
  equipmentUyu: figure(
    0,
    '2026-09-22',
    'Sin equipamiento obligatorio adicional',
    SITE_ASSUMPTION_URL
  ),
  paperworkUyu: figure(
    5084.34,
    '2026-01-09',
    'Intendencia de Montevideo — empadronamiento de vehículos',
    EMPADRONAMIENTO_URL,
    'Dos chapas matrícula más libreta de circulación. La libreta de conducir categoría A va aparte ($2.393 la primera vez).'
  ),
  insuranceUyu: figure(7238, '2026-09-01', SOA_SOURCE, SOA_URL, SOA_NOTE),
  roadTaxUyu: figure(
    8770.1,
    '2026-01-01',
    'Intendencia de Montevideo — patente de rodados 2026',
    PATENTE_IM_URL,
    'Piso: ningún vehículo modelo 1992 o posterior tributa menos que la banda 1986-1991.'
  ),
  roadTaxRateOfPrice: figure(
    0.045,
    '2026-01-01',
    'SUCIVE — Texto Ordenado 2026, categoría A',
    SUCIVE_URL,
    'El 4,5 % se aplica sobre el valor de mercado OFICIAL (aforo), que no es el precio del aviso: acá se estima sobre el precio y el número exacto se consulta por matrícula.'
  ),
  fixedMaintenanceUyu: assumed(
    12000,
    'Service anual más la inspección técnica que el auto sí paga y la moto no (trienal de 5 a 15 años en Montevideo; las motos están excluidas).'
  ),
  maintenancePerKmUyu: assumed(2, 'Cubiertas, frenos y correa por kilómetro.'),
  energyKind: 'nafta',
  consumptionPer100Km: assumed(
    9,
    'L/100 km. Se reemplaza por el consumo mediano medido sobre el catálogo de autos cuando está disponible.'
  ),
  annualDepreciation: assumed(
    0.12,
    'Se reemplaza por la caída medida sobre el catálogo con la misma recta que el informe de autos.'
  ),
  rainFallbackShare: figure(0, '2026-09-22', 'El auto anda con lluvia', SITE_ASSUMPTION_URL),
  theftAnnualProbability: figure(
    0.0034,
    '2025-12-31',
    'Cruce propio: Ministerio del Interior (AECA 2025) sobre parque MIEM 2025',
    AECA_URL,
    `${CROSS_NOTE} 3.730 autos y camionetas hurtados en 2025 sobre 1.096.973 activos.`
  ),
  theftRecoveryShare: assumed(
    0,
    'El SOA no cubre el hurto. Con póliza contra todo riesgo, subí este valor.'
  ),
  accessMinutes: assumed(3, 'Sacar el auto, estacionar y caminar hasta la puerta.'),
  cruiseSpeedKmh: assumed(28, 'Sólo como respaldo: cuando hay ruta medida, manda la ruta.'),
  storageMonthlyUyu: figure(
    0,
    '2026-09-22',
    'Sin costo de garaje',
    SITE_ASSUMPTION_URL,
    'Subilo si pagás cochera.'
  ),
  fatalities: figure(
    124,
    '2025-12-31',
    UNASEV_SOURCE,
    UNASEV_URL,
    'Fallecidos en auto y camioneta en 2025, el 26 % del total.'
  ),
  fatalityPer100kVehicles: figure(
    11.3,
    '2025-12-31',
    'Cruce propio: UNASEV 2025 sobre parque MIEM 2025',
    MIEM_URL,
    CROSS_NOTE
  ),
}

export const TRANSPORT_MODE_ASSUMPTIONS: Record<TransportMode, TransportModeAssumptions> = {
  omnibus: OMNIBUS,
  pie: PIE,
  monopatin: MONOPATIN,
  bici: BICI,
  moto: MOTO,
  auto: AUTO,
}

export const TRANSPORT_ASSUMPTIONS: TransportAssumptions = {
  global: TRANSPORT_GLOBAL_ASSUMPTIONS,
  byMode: TRANSPORT_MODE_ASSUMPTIONS,
}

/**
 * Datos de contexto que la página muestra al lado de la comparación y que NO entran en ninguna
 * cuenta. Están acá, y no sueltos en el `.vue`, para que tengan la misma exigencia de fuente y fecha
 * que el resto.
 */
export const TRANSPORT_CONTEXT_FIGURES = {
  licenciaPrimeraVez: figure(
    2393,
    '2026-09-18',
    'Intendencia de Montevideo — licencia de conducir',
    'https://tramites.montevideo.gub.uy/tramites-y-tributos/solicitud/licencia-de-conducir-por-primera-vez-hasta-79-anos-categoria-a',
    'Mismo precio para categoría A (auto) y G1/G2 (moto hasta 200 cc). Renovación: $1.082 hasta 5 años, $3.032 hasta 10.'
  ),
  licenciaG3: figure(
    21,
    '2026-09-18',
    'Intendencia de Montevideo — categorías de licencia',
    'https://montevideo.gub.uy/sites/default/files/documentos/categoriaslicenciasconducir.pdf',
    'Para una moto de más de 200 cc hace falta la categoría G3: 21 años cumplidos y tres años de antigüedad de licencia previa.'
  ),
  itvExoneracionMoto: figure(
    0,
    '2026-09-22',
    'Digesto Departamental de Montevideo, art. R.424.156.5',
    'https://normativa.montevideo.gub.uy/articulos/65183',
    'Las motocicletas y ciclomotores están excluidos de la inspección técnica vehicular. El auto particular la paga trienal de 5 a 15 años, bienal de 15 a 25 y anual pasados los 25.'
  ),
  boletoDosHoras: figure(
    78,
    '2026-01-05',
    'Intendencia de Montevideo — tarifas del transporte colectivo',
    'https://montevideo.gub.uy/tipo/area-tematica/sistema-de-transporte-metropolitano/tarifas-del-transporte-colectivo-urbano',
    'Con tarjeta STM. El boleto de 1 hora ($52) habilita dos ómnibus urbanos, tres en los puntos de intercambio.'
  ),
  hurtoVehiculos: figure(
    13071,
    '2025-12-31',
    'Ministerio del Interior — Anuario AECA 2025',
    AECA_URL,
    'Vehículos hurtados en 2025 en todo el país: 9.202 motos, 2.623 autos y 1.107 camionetas. La moto es el 70 % del total.'
  ),
  lesionadosGravesMoto: figure(
    3015,
    '2025-12-31',
    UNASEV_SOURCE,
    UNASEV_URL,
    'El 75 % de los lesionados graves de 2025 iban en moto, contra el 10 % en auto o camioneta.'
  ),
} as const

/** Toda cifra curada, aplanada, para que un test pueda exigirle fecha y fuente a cada una. */
export function transportAllFigures(): { path: string; figure: TransportFigure }[] {
  const out: { path: string; figure: TransportFigure }[] = []
  for (const [key, value] of Object.entries(TRANSPORT_GLOBAL_ASSUMPTIONS)) {
    out.push({ path: `global.${key}`, figure: value as TransportFigure })
  }
  for (const [mode, assumptions] of Object.entries(TRANSPORT_MODE_ASSUMPTIONS)) {
    for (const [key, value] of Object.entries(assumptions)) {
      if (!value || typeof value !== 'object' || !('value' in value)) continue
      out.push({ path: `${mode}.${key}`, figure: value as TransportFigure })
    }
  }
  for (const [key, value] of Object.entries(TRANSPORT_CONTEXT_FIGURES)) {
    out.push({ path: `context.${key}`, figure: value as TransportFigure })
  }
  return out
}
