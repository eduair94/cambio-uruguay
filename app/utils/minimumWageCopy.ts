// Los textos de /vivir-con-el-salario-minimo-uruguay que llevan cifras: qué hace cada palanca,
// qué pide cada garantía, las preguntas frecuentes y las fuentes.
//
// Cada cifra se calcula con la cuenta de `minimumWage.ts` y los módulos que ya la mantienen; acá
// no se escribe ningún número a mano. Si cambia el salario mínimo, cambia todo el texto solo.

import type { FaqItem } from './faqAnswers'
import { COST_MODEL } from './costOfLiving'
import { SMN_2026, SMN_VIGENTE, TRANSPORTE_MES, alquilerNuevoRegion } from './lowWage'
import {
  AGUINALDO_MENSUAL,
  LIQUIDO_SMN,
  PALANCAS_NINGUNA,
  PALANCAS_TODAS,
  SERVICIOS_DESGLOSE,
  VACACIONAL_MENSUAL,
  minimoFga,
  planDelMes,
  topeAnda,
  topeFgaJovenes,
  type Palancas,
  type PuertaId,
  type SmnRegion,
} from './minimumWage'

/** Espacio duro: que el signo y la cifra no queden en renglones distintos. */
const NBSP = String.fromCharCode(160)

/** Pesos con punto de miles, igual en el servidor y en el navegador (sin depender de ICU). */
export const pesos = (value: number): string =>
  `$${NBSP}${Math.round(value)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`

export interface SmnFuente {
  label: string
  url: string
}

const ASSE: SmnFuente = {
  label: 'Afiliación a ASSE — trámite en gub.uy',
  url: 'https://www.gub.uy/tramites/afiliacion-asse',
}
const BOLETO: SmnFuente = {
  label: 'Tarifas del transporte colectivo urbano — Intendencia de Montevideo',
  url: 'https://montevideo.gub.uy/areas-tematicas/sistema-de-transporte-metropolitano/tarifas-del-transporte-colectivo-urbano',
}
const LEY_AGUINALDO: SmnFuente = {
  label: 'Ley N.º 12.840 — sueldo anual complementario (IMPO)',
  url: 'https://www.impo.com.uy/bases/leyes/12840-1960',
}
const LEY_VACACIONAL: SmnFuente = {
  label: 'Ley N.º 16.101 — salario vacacional (IMPO)',
  url: 'https://www.impo.com.uy/bases/leyes/16101-1989',
}
const COSTO_DE_VIDA: SmnFuente = {
  label: 'Modelo de costo de vida del sitio',
  url: 'https://cambio-uruguay.com/herramientas/costo-de-vida',
}
const ANDA: SmnFuente = {
  label: 'Garantía de alquiler, requisitos del inquilino — ANDA',
  url: 'https://anda.com.uy/garantia-de-alquiler/inquilino/',
}
const FGA: SmnFuente = {
  label: 'Fondo de Garantía de Alquiler — Agencia Nacional de Vivienda',
  url: 'https://www.anv.gub.uy/fondo-de-garantia-de-alquiler',
}
const FGA_JOVENES: SmnFuente = {
  label: 'Fondo de Garantía de Alquiler para Jóvenes — Agencia Nacional de Vivienda',
  url: 'https://www.anv.gub.uy/fondo-de-garantia-de-alquiler-para-jovenes',
}
const LEY_SIN_GARANTIA: SmnFuente = {
  label: 'Ley N.º 19.889, artículo 421 — alquiler sin garantía (IMPO)',
  url: 'https://www.impo.com.uy/bases/leyes/19889-2020/421',
}
const DECRETO_SMN: SmnFuente = {
  label: 'Decreto 319/025 — salario mínimo nacional 2026 (IMPO)',
  url: 'https://www.impo.com.uy/bases/decretos/319-2025',
}
const INE_POBREZA: SmnFuente = {
  label: 'INE — Estimación de la pobreza por el método del ingreso (canastas básicas)',
  url: 'https://www.gub.uy/instituto-nacional-estadistica/datos-y-estadisticas/estadisticas/estimacion-pobreza-metodo-ingreso',
}
const INE_ALQUILERES: SmnFuente = {
  label: 'INE — Indicadores de actividad inmobiliaria, alquileres',
  url: 'https://www.gub.uy/instituto-nacional-estadistica/datos-y-estadisticas/estadisticas/series-historicas-indicadores-actividad-inmobiliaria-iai-alquileres',
}

const transporteRegion = (region: SmnRegion): number =>
  Math.round(TRANSPORTE_MES * (region === 'interior' ? COST_MODEL.interiorTransportFactor : 1))

export interface PalancaInfo {
  titulo: string
  detalle: string
  /** Cuánto sube el techo por mes, por persona. */
  valor: (region: SmnRegion) => number
  fuente: SmnFuente
}

export const PALANCAS_INFO: Record<keyof Palancas, PalancaInfo> = {
  caminar: {
    titulo: 'Ir a trabajar a pie o en bici',
    detalle: `Dos boletos por día, veintidós días por mes, son ${pesos(TRANSPORTE_MES)} en Montevideo con tarjeta STM. A pie o en bici el modelo del sitio cuenta ${pesos(COST_MODEL.aPieBiciMonthly)} de mantenimiento. Sirve si vivís a una distancia que se camina, y por eso la pieza céntrica y el trabajo cerca van juntos.`,
    valor: region => transporteRegion(region) - COST_MODEL.aPieBiciMonthly,
    fuente: BOLETO,
  },
  asse: {
    titulo: 'Atenderte en ASSE',
    detalle: `Con FONASA elegís prestador, y en ASSE quienes están afiliados por FONASA «no pagan órdenes ni tickets, por ningún concepto de su atención». En una mutualista el modelo del sitio cuenta ${pesos(COST_MODEL.healthPerPerson)} por mes de órdenes y tickets. Si ya estás en una mutualista, cambiarte tiene reglas: consultá tu habilitación antes.`,
    valor: () => COST_MODEL.healthPerPerson,
    fuente: ASSE,
  },
  aguinaldo: {
    titulo: 'Apartar el aguinaldo',
    detalle: `El aguinaldo es un sueldo más por año, en dos cobros (junio y diciembre). Repartido en doce meses da ${pesos(AGUINALDO_MENSUAL)} por mes, pero sólo si lo guardás cuando llega y lo usás de a poco.`,
    valor: () => AGUINALDO_MENSUAL,
    fuente: LEY_AGUINALDO,
  },
  vacacional: {
    titulo: 'Apartar el salario vacacional',
    detalle: `Antes de la licencia se cobran 20 jornales líquidos más, sin aportes: ${pesos(VACACIONAL_MENSUAL)} por mes si los repartís en el año. El primer año de trabajo todavía no lo generaste.`,
    valor: () => VACACIONAL_MENSUAL,
    fuente: LEY_VACACIONAL,
  },
  sinInternet: {
    titulo: 'Sin internet en la casa',
    detalle: `Arreglarte con los datos del celular ahorra ${pesos(SERVICIOS_DESGLOSE.internet)} por mes, la cuota de internet del modelo del sitio. En una pieza no cambia la cuenta: lo que se cobre aparte por servicios es lo que el aviso tiene que confirmar.`,
    valor: () => SERVICIOS_DESGLOSE.internet,
    fuente: COSTO_DE_VIDA,
  },
}

export interface PuertaInfo {
  titulo: string
  regla: string
  /** Fuente externa (https) o página del sitio (/…). */
  url: string
}

export const PUERTAS_INFO: Record<PuertaId, PuertaInfo> = {
  hospedaje: {
    titulo: 'Pensión, sin garantía',
    regla:
      'Una pensión o una residencia es hospedaje, no un alquiler: no te piden garantía de alquiler. Lo habitual es pagar el mes por adelantado.',
    url: '/pensiones-estudiantiles-uruguay',
  },
  anda: {
    titulo: 'ANDA',
    regla: `Garantiza un alquiler de hasta el 40 % del ingreso nominal: con un sueldo mínimo, hasta ${pesos(topeAnda(1))}; con dos, hasta ${pesos(topeAnda(2))}. Hay que ser socio y tener 4 meses de antigüedad en el trabajo.`,
    url: ANDA.url,
  },
  fga: {
    titulo: 'Fondo de Garantía de Alquiler',
    regla: `Pide un líquido del núcleo de al menos 15 UR (${pesos(minimoFga())}): un sueldo mínimo solo no llega, dos sí. Cubre alquileres de hasta 18 UR.`,
    url: FGA.url,
  },
  'fga-jovenes': {
    titulo: 'FGA Jóvenes (18 a 29 años)',
    regla: `Si alquilás solo no pide un ingreso mínimo, pero el alquiler no puede pasar del 40 % de tus ingresos: con el mínimo, hasta ${pesos(topeFgaJovenes())}. Se deja un depósito del 12 % de la garantía, una sola vez.`,
    url: FGA_JOVENES.url,
  },
  'sin-garantia': {
    titulo: 'Sin garantía (Ley 19.889)',
    regla:
      'Es legal alquilar sin ninguna garantía si el dueño acepta y el contrato lo dice por escrito. No te pueden pedir más de un mes por adelantado.',
    url: LEY_SIN_GARANTIA.url,
  },
}

const piezaSin = planDelMes('pieza', 'montevideo', PALANCAS_NINGUNA)
const piezaCon = planDelMes('pieza', 'montevideo', PALANCAS_TODAS)

export const MINIMUM_WAGE_FAQ: FaqItem[] = [
  {
    id: 'salario-minimo-se-puede',
    question: '¿Se puede vivir con el salario mínimo en Uruguay?',
    answer: `Solo y alquilando al precio promedio, no: el líquido del mínimo es ${pesos(LIQUIDO_SMN)} y el alquiler promedio de un contrato nuevo en Montevideo es ${pesos(alquilerNuevoRegion('montevideo'))}. Las cuentas que sí cierran son las de una pieza en una pensión o residencia, una casa chica en el interior o una vivienda entre dos personas que cobran el mínimo. Todas piden decisiones —ir a pie, atenderse en ASSE, apartar el aguinaldo— y lo que sobra, cuando sobra, es poco.`,
  },
  {
    id: 'salario-minimo-liquido',
    question: '¿Cuánto cobra en la mano quien gana el salario mínimo?',
    answer: `El salario mínimo nacional es ${pesos(SMN_VIGENTE)} por mes desde el 1.º de julio de 2026 (${SMN_2026.decreto}). Descontados el aporte jubilatorio, FONASA y el FRL quedan ${pesos(LIQUIDO_SMN)} líquidos. Con el aguinaldo y el salario vacacional repartidos en el año, el equivalente mensual es ${pesos(LIQUIDO_SMN + AGUINALDO_MENSUAL + VACACIONAL_MENSUAL)}.`,
  },
  {
    id: 'salario-minimo-alquiler',
    question: '¿Cuánto puedo pagar de alquiler con el sueldo mínimo?',
    answer: `Depende de lo demás. Con el presupuesto austero del sitio, en Montevideo y sin cambiar nada, para una pieza quedan ${pesos(piezaSin.techoPieza)} por mes. Yendo a pie, atendiéndote en ASSE y apartando el aguinaldo y el salario vacacional, ${pesos(piezaCon.techoPieza)}. Para una casa o un apartamento hay que restar además la luz y el agua (${pesos(piezaCon.servicio)}).`,
  },
  {
    id: 'salario-minimo-garantia',
    question: '¿Me dan garantía de alquiler con el sueldo mínimo?',
    answer: `ANDA garantiza hasta el 40 % del nominal: ${pesos(topeAnda(1))} con un sueldo mínimo. El Fondo de Garantía de Alquiler pide 15 UR de líquido del núcleo (${pesos(minimoFga())}): con un solo mínimo no se llega, con dos sí. Entre 18 y 29 años, el FGA Jóvenes no pide un mínimo si alquilás solo, pero el alquiler no puede pasar del 40 % de tus ingresos (${pesos(topeFgaJovenes())}). Una pensión no pide garantía.`,
  },
  {
    id: 'salario-minimo-asse',
    question: '¿Por qué la cuenta pone la salud en cero?',
    answer: `Porque en ASSE quienes se atienden por FONASA no pagan órdenes ni tickets. En una mutualista, el modelo del sitio cuenta ${pesos(COST_MODEL.healthPerPerson)} por mes. Lo que no cambia es el descuento de FONASA del recibo, que ya está restado en el líquido.`,
  },
  {
    id: 'salario-minimo-aguinaldo',
    question: '¿Es realista contar el aguinaldo todos los meses?',
    answer: `Sólo si lo apartás: el aguinaldo se cobra en junio y en diciembre, y el salario vacacional antes de la licencia. Hasta el primer cobro la cuenta arranca ${pesos(AGUINALDO_MENSUAL + VACACIONAL_MENSUAL)} más abajo, y el primer año de trabajo no trae salario vacacional.`,
  },
  {
    id: 'salario-minimo-hijos',
    question: '¿Y si tengo hijos a cargo?',
    answer:
      'Esta cuenta es para personas sin hijos a cargo. Con hijos cambian dos cosas: los gastos y lo que pone el Estado —asignaciones familiares, tarifas sociales—, y eso se calcula aparte.',
    link: {
      label: 'Lo que el Estado pone con un sueldo bajo',
      to: '/vivir-con-25000-pesos-uruguay',
    },
  },
]

export const MINIMUM_WAGE_SOURCES: SmnFuente[] = [
  DECRETO_SMN,
  INE_ALQUILERES,
  INE_POBREZA,
  BOLETO,
  ASSE,
  LEY_AGUINALDO,
  LEY_VACACIONAL,
  ANDA,
  FGA,
  FGA_JOVENES,
  LEY_SIN_GARANTIA,
]
