// Las guías que contestan "qué revisar antes de comprar un auto usado", en una sola lista.
//
// Vivía como constante local de `/autos-usados-uruguay/hasta-<monto>-dolares` y ninguna otra página
// de autos la tenía. Medido el 22/11/2026 (GA4, 28 días): ChatGPT ya manda más visitas que nunca y
// la familia de autos es la que más recibe, casi todas a `/autos-usados-uruguay/precios/<modelo>`,
// una página de tablas que no enlazaba a ninguna de las guías de auto (título, crédito prendario,
// costos de tenerlo). Esas guías son el tipo de página donde el sitio muestra más anuncios por
// visita; la tabla de precios, de las que menos. El bloque es el mismo en las tres plantillas (el
// tramo de presupuesto, la página de modelo y la ficha del aviso) para que una guía nueva se agregue
// una sola vez.
//
// Todas las rutas existen en español, inglés y portugués (verificado el 22/11/2026), así que el
// componente las pasa por `localePath` también desde las plantillas trilingües.

export interface CarBuyerGuide {
  /** Ruta interna, sin prefijo de idioma. */
  to: string
  /** Texto del enlace: la pregunta o el dato que contesta la guía. */
  label: string
}

export const CAR_BUYER_GUIDES: readonly CarBuyerGuide[] = [
  { to: '/comprar-auto-con-deuda-uruguay', label: 'Auto usado con deuda: qué se hereda' },
  {
    to: '/guias/pagar-patente-sucive-uruguay',
    label: 'Patente: cómo consultar en el SUCIVE cuánto debe el auto',
  },
  {
    to: '/guias/titulo-del-auto-uruguay',
    label: 'Título del auto: ¿hace falta o alcanza la libreta?',
  },
  { to: '/guias/transferir-un-auto-uruguay', label: 'Cómo transferir un auto' },
  { to: '/cuanto-sale-transferir-un-auto-uruguay', label: 'Cuánto sale la transferencia' },
  {
    to: '/guias/credito-prendario-auto-uruguay',
    label: 'Crédito prendario: cuánto pagás de más si lo financiás',
  },
  {
    to: '/guias/costos-de-tener-auto-uruguay',
    label: 'Cuánto cuesta tener un auto por mes',
  },
  {
    to: '/autos-chocados-y-con-deuda-uruguay',
    label: 'Autos chocados y con deuda: lo que declaran los avisos',
  },
] as const
