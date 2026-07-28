// Caso Sodimac Uruguay, julio de 2026: compras online confirmadas y luego canceladas por un
// precio publicado erróneamente. Mantiene separados los hechos reportados, el criterio oficial
// aplicable y el texto que cada comprador puede presentar con su propia prueba.
//
// PURO (sin Vue/Nuxt) para compartir la lógica entre la página y los tests.

export type SodimacActionId = 'cumplimiento' | 'alternativa' | 'denuncia'
export type SodimacPriceAssessment = 'plausible' | 'dudoso' | 'evidente'
export type SodimacConfirmationStatus = 'confirmado' | 'solo-orden' | 'no-se'

export interface SodimacComplaintInput {
  action: SodimacActionId | ''
  orderNumber: string
  invoiceNumber: string
  purchaseDate: string
  cancellationDate: string
  product: string
  quantity: string
  advertisedPrice: string
  amountPaid: string
  usualPrice: string
  paymentMethod: string
  confirmationStatus: SodimacConfirmationStatus | ''
  priceAssessment: SodimacPriceAssessment | ''
  cancellationReason: string
  extraFacts: string
}

export interface SodimacSource {
  label: string
  url: string
  publisher: string
  kind: 'oficial' | 'sodimac' | 'comunidad'
}

export interface SodimacFaq {
  q: string
  a: string
}

export const SODIMAC_ACTIONS: ReadonlyArray<{
  id: SodimacActionId
  label: string
  short: string
}> = Object.freeze([
  {
    id: 'cumplimiento',
    label: 'Reclamo: que entreguen la compra',
    short: 'Pedís el cumplimiento al precio aceptado, si todavía es posible.',
  },
  {
    id: 'alternativa',
    label: 'Reclamo: una solución equivalente',
    short: 'Pedís una propuesta concreta si no pueden entregar exactamente lo comprado.',
  },
  {
    id: 'denuncia',
    label: 'Denuncia: que investiguen la conducta',
    short: 'Ponés el caso en conocimiento del MEF para una eventual sanción.',
  },
])

export const SODIMAC_EVIDENCE: readonly string[] = Object.freeze([
  'Captura completa de la publicación, con producto, precio, fecha y URL.',
  'Orden de compra y correo de confirmación posterior a la validación.',
  'Factura o e-ticket emitido por Sodimac.',
  'Comprobante del cargo en la tarjeta o medio de pago.',
  'Correo de cancelación y texto exacto de la “inconsistencia técnica”.',
  'Precio habitual del producto y contexto de la oferta o promoción.',
])

export const SODIMAC_SOURCES: readonly SodimacSource[] = Object.freeze([
  {
    label: 'Error de precio en un portal de ventas: cuándo debe respetarse y excepción de buena fe',
    url: 'https://www.gub.uy/ministerio-economia-finanzas/comunicacion/publicaciones/me-equivoque-precio-informe-mailing-mi-portal-ventas-estoy-obligado',
    publisher: 'MEF — Unidad Defensa del Consumidor',
    kind: 'oficial',
  },
  {
    label: 'Ley 17.250 art. 12 — la oferta precisa vincula a quien la emite',
    url: 'https://www.impo.com.uy/bases/leyes/17250-2000/12',
    publisher: 'IMPO',
    kind: 'oficial',
  },
  {
    label: 'Ley 17.250 art. 14 — la información publicada integra el contrato',
    url: 'https://www.impo.com.uy/bases/leyes/17250-2000/14',
    publisher: 'IMPO',
    kind: 'oficial',
  },
  {
    label: 'Ley 17.250 art. 33 — opciones ante el incumplimiento del proveedor',
    url: 'https://www.impo.com.uy/bases/leyes/17250-2000/33',
    publisher: 'IMPO',
    kind: 'oficial',
  },
  {
    label: 'Código Civil art. 1291 — fuerza del contrato y ejecución de buena fe',
    url: 'https://www.impo.com.uy/bases/codigo-civil/16603-1994/1291',
    publisher: 'IMPO',
    kind: 'oficial',
  },
  {
    label: 'Decreto 244/000 art. 1 — la factura como prueba de la relación de consumo',
    url: 'https://www.impo.com.uy/bases/decretos/244-2000/1',
    publisher: 'IMPO',
    kind: 'oficial',
  },
  {
    label: 'Consulta, reclamo o denuncia: diferencias, requisitos y trámite en línea',
    url: 'https://www.gub.uy/tramites/consulta-yo-reclamo-materia-relaciones-consumo',
    publisher: 'gub.uy — MEF',
    kind: 'oficial',
  },
  {
    label: 'Términos y condiciones: confirmación, factura y perfeccionamiento del contrato',
    url: 'https://assets.contentstack.io/v3/assets/blt859cb831115f9ca8/blt82ad052bdbefc36d/TerminosyCondicionesSODIMACUY.pdf',
    publisher: 'Sodimac Uruguay',
    kind: 'sodimac',
  },
  {
    label: 'Publicación que reporta las compras anuladas',
    url: 'https://www.reddit.com/r/uruguay/comments/1v91hhj/compras_del_sodimac_anuladas/',
    publisher: 'r/uruguay — 28/07/2026',
    kind: 'comunidad',
  },
  {
    label: 'Publicación previa con los productos y reportes de cancelación',
    url: 'https://www.reddit.com/r/uruguay/comments/1v6ec69/gente_si_necesitan_algun_electrodomestico_estan/',
    publisher: 'r/uruguay — 25/07/2026',
    kind: 'comunidad',
  },
])

export const SODIMAC_FAQS: readonly SodimacFaq[] = Object.freeze([
  {
    q: '¿La factura obliga por sí sola a que entreguen el producto?',
    a:
      'No decide el caso por sí sola, pero es una prueba importante. El Decreto 244/000 admite la ' +
      'factura para probar una relación de consumo perfeccionada. Además, los términos de Sodimac ' +
      'separan el correo que confirma el pedido validado del correo que remite la factura. Guardá ambos.',
  },
  {
    q: '¿Qué considera el MEF un error de precio fácilmente advertible?',
    a:
      'Depende de las circunstancias. La guía oficial contrapone un descuento plausible con un valor ' +
      'que, por el precio de mercado, muestra un cero faltante o una confusión entre dólares y pesos. ' +
      'También menciona como indicio la compra de varias unidades al advertir el error.',
  },
  {
    q: '¿Conviene presentar reclamo o denuncia?',
    a:
      'Si querés entrega, una alternativa o resolver un problema individual, elegí reclamo: abre una ' +
      'mediación. La denuncia busca que el organismo investigue y eventualmente sancione; no está ' +
      'diseñada para darte una compensación. El formulario oficial permite elegir.',
  },
  {
    q: '¿Sirve organizarse con otros compradores?',
    a:
      'Sirve para conservar capturas, comparar comunicaciones y evitar que se pierda evidencia. Pero ' +
      'cada compra puede tener precio, cantidad, confirmación y factura distintos: cada persona debería ' +
      'presentar su propio trámite con su documentación, sin copiar hechos que no pueda probar.',
  },
  {
    q: '¿Puedo reclamar aunque ya hayan iniciado el reembolso?',
    a:
      'Sí, podés cuestionar la cancelación y pedir mediación si entendés que el precio no era un error ' +
      'evidente y querés el cumplimiento o una solución equivalente. El reintegro no garantiza que el ' +
      'MEF comparta esa posición; el resultado depende del precio, la confirmación y el resto de la prueba.',
  },
])

const CONFIRMATION_TEXT: Record<SodimacConfirmationStatus, string> = {
  confirmado:
    'Recibí el correo escrito que confirmó el pedido después de la validación de la transacción.',
  'solo-orden':
    'Recibí una orden de compra, pero no puedo afirmar que haya recibido un correo posterior de validación.',
  'no-se':
    'No pude distinguir si el correo recibido era solo la orden o la confirmación posterior a la validación.',
}

const PRICE_ASSESSMENT_TEXT: Record<SodimacPriceAssessment, string> = {
  plausible:
    'El precio podía razonablemente interpretarse como una oferta o descuento real y no como un error evidente.',
  dudoso:
    'No puedo determinar por mí mismo si la diferencia permitía advertir claramente un error; solicito que se valore el contexto completo.',
  evidente:
    'La diferencia de precio era muy significativa. Dejo expresamente planteado este dato para que el caso se analice con el principio de buena fe.',
}

function valueOr(value: string, placeholder: string): string {
  const trimmed = value.trim()
  return trimmed || `[${placeholder}]`
}

function selectedAction(action: SodimacActionId | '') {
  return SODIMAC_ACTIONS.find(item => item.id === action)
}

export function buildSodimacComplaint(input: SodimacComplaintInput): string {
  const action = selectedAction(input.action)
  const isDenuncia = action?.id === 'denuncia'
  const heading = isDenuncia
    ? 'DENUNCIA ANTE LA UNIDAD DEFENSA DEL CONSUMIDOR — MEF'
    : 'RELATO PARA RECLAMO EN MATERIA DE RELACIONES DE CONSUMO'
  const subject = isDenuncia
    ? 'Denuncia por cancelación de compra online atribuida a un error de precio'
    : 'Reclamo por cancelación unilateral de compra online'

  const request =
    action?.id === 'cumplimiento'
      ? 'Solicito el cumplimiento de la compra y la entrega del producto al precio aceptado, siempre que ello sea posible, conforme al artículo 33 literal A de la Ley 17.250.'
      : action?.id === 'alternativa'
        ? 'Solicito una propuesta equivalente, concreta y sin costo adicional que resuelva el incumplimiento, conforme al artículo 33 literal B de la Ley 17.250.'
        : action?.id === 'denuncia'
          ? 'Solicito que se investiguen los hechos y, si se constata una infracción a la normativa de relaciones de consumo, se adopten las medidas que correspondan. Comprendo que la denuncia persigue una eventual sanción y no una compensación individual.'
          : '[Elegí si querés pedir cumplimiento, una solución equivalente o presentar una denuncia.]'

  return `${heading}

Asunto: ${subject}

HECHOS

1. El ${valueOr(input.purchaseDate, 'fecha de compra')} realicé una compra en sodimac.com.uy:
   - Producto: ${valueOr(input.product, 'producto y modelo')}
   - Cantidad: ${valueOr(input.quantity, 'cantidad')}
   - Precio publicado: ${valueOr(input.advertisedPrice, 'precio publicado')}
   - Importe efectivamente abonado: ${valueOr(input.amountPaid, 'importe total')}
   - Medio de pago: ${valueOr(input.paymentMethod, 'tarjeta o medio de pago')}
   - Orden de compra: ${valueOr(input.orderNumber, 'número de orden')}
   - Factura o e-ticket: ${valueOr(input.invoiceNumber, 'número de factura')}

2. ${
    input.confirmationStatus
      ? CONFIRMATION_TEXT[input.confirmationStatus]
      : '[Indicá si recibiste una confirmación posterior a la validación, solo una orden o si no podés distinguirlas.]'
  }

3. El ${valueOr(input.cancellationDate, 'fecha de cancelación')} Sodimac comunicó la anulación y el reembolso, invocando: ${valueOr(input.cancellationReason, 'texto exacto o resumen del correo')}.

4. Como referencia, el precio habitual o comparable que pude verificar era: ${valueOr(input.usualPrice, 'precio habitual y fuente')}.

5. ${
    input.priceAssessment
      ? PRICE_ASSESSMENT_TEXT[input.priceAssessment]
      : '[Indicá si el precio parecía plausible, dudoso o un error evidente.]'
  }

6. Otros hechos relevantes: ${valueOr(input.extraFacts, 'promoción, stock, entrega prometida o reclamos previos')}.

FUNDAMENTO

La guía oficial de la Unidad Defensa del Consumidor sobre errores de precio señala que una oferta aceptada es, en principio, de cumplimiento obligatorio y que la negligencia del vendedor no se traslada al consumidor. También establece una excepción cuando el error era fácilmente advertible, por aplicación de la buena fe.

Los artículos 12 y 14 de la Ley 17.250 disponen que la oferta suficientemente precisa vincula a quien la emite y que la información difundida integra el contrato. El artículo 33 prevé, ante el incumplimiento imputable al proveedor, cumplimiento si fuera posible, una prestación equivalente o resolución, a elección del consumidor. El artículo 1291 del Código Civil exige que los contratos se ejecuten de buena fe.

Los propios términos de Sodimac indican que el contrato se perfecciona al enviarse la confirmación escrita posterior a la validación y que la factura se remite en un correo distinto. Adjunto la documentación que recibí para que se valore su alcance en este caso.

SOLICITUD

${request}

Solicito respuesta escrita y fundada dentro de 5 días hábiles. Acompaño la documentación que tengo disponible para respaldar los hechos relatados.

Nombre: [nombre completo]
Cédula: [número]
Teléfono: [teléfono]
Correo: [correo electrónico]
Fecha: [fecha de presentación]`
}
