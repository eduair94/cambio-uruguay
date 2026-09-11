// app/utils/cardSecurity.ts
// Datos + helpers puros de /clonacion-de-tarjetas-uruguay — el ANTES de que te
// clonen la tarjeta, que es la mitad que el sitio no tenía.
//
// POR QUÉ EXISTE. El sitio ya publica el DESPUÉS con fuente primaria:
// /estafas-uruguay dice quién paga según la Ley 19.731 y la RNRCSF, y
// /me-cobran-algo-que-no-autorice dice a quién reclamar. Lo que faltaba es la
// pregunta que la gente hace ANTES, y que en r/uruguay se contesta con folklore:
// "¿cómo clonan las tarjetas?", "¿sirve taparle los números con cinta?",
// "¿estoy expuesto si mi banco no tiene Apple Pay?" (hilo 1wd0ufw, 2026-09-11,
// sobre la BROU Recompensa como primera tarjeta de crédito).
//
// LO QUE ESTE MÓDULO MIDE, Y QUE NADIE PUBLICA JUNTO: qué controles te da de
// verdad cada emisor uruguayo. No la lista de consejos genéricos —esa la tienen
// todos— sino el inventario verificable: ¿avisa por cada compra?, ¿se bloquea y
// se desbloquea sola desde la app?, ¿se puede bajar el límite del canal por el
// que entra el fraude?, ¿hay número virtual?, ¿se puede tokenizar en una
// billetera? Cada casilla lleva la URL del propio emisor y la fecha en que se
// contrastó. Donde el emisor no lo publica, la casilla dice `sin-publicar`: no
// se rellena con la app de otro país ni con lo que cuenta un usuario.
//
// LOS TRES HALLAZGOS QUE ORDENAN LA PÁGINA:
//   1. La clonación que cuenta la gente casi nunca es la del chip. Es el número
//      viajando sin la tarjeta: lo anotan o lo fotografían en el mostrador y lo
//      usan por internet. Por eso el control que más sirve no es físico.
//   2. El aviso por compra del BROU es GRATIS y cubre justo ese vector, pero
//      tiene un hueco definido: la notificación sin costo (buzón de eBROU +
//      PUSH) deja afuera las compras que pidieron PIN y las de internet que
//      pasaron por Visa Secure o MCIDcheck. El servicio que avisa TODAS las
//      compras es el SMS, y cuesta $75 + IVA por 25 mensajes al mes.
//   3. Taparle los números con cinta no resuelve nada, y hay emisores que ya
//      resolvieron el problema de raíz: la prepaga de Mercado Pago se emite
//      "sin datos impresos".
//
// POR QUÉ EL HALLAZGO 2 ESTÁ REESCRITO (2026-09-11). La primera versión de esta
// página titulaba que "la alerta del BROU es paga", se publicó en el propio
// hilo 1wd0ufw y el autor del hilo contestó lo contrario desde su experiencia:
// "ahora el BROU anda mandando notificaciones con cada compra". Un segundo
// usuario lo confirmó para crédito, débito y extensión. Fuimos a la letra del
// BROU y el que estaba mal encuadrado era el titular: el servicio gratuito
// alcanza a Crédito, Débito y Prepaga, propias y de adicionales, y lo que deja
// afuera son exactamente las transacciones en las que alguien tuvo que probar
// que era el titular (PIN o segundo factor). O sea: contra el fraude que esta
// página documenta, el aviso gratis SÍ suena. La sección "Lo que discutieron en
// el hilo" (CARD_COMMUNITY_CLAIMS) publica esa corrección y las otras que
// dejaron los comentarios, cada una contra la fuente que la confirma o la
// desmiente.
//
// MÓDULO PURO (sin Vue/Nuxt) para que la página y su test compartan una sola
// fuente de verdad. Es información, no asesoramiento: no publica cómo se
// comete el fraude, publica qué defensa existe y cuál no.

// Se reusan los tipos de fuente de `parcelDelivery` en vez de redefinirlos: `utils/`
// es un namespace plano para el auto-import de Nuxt, y un segundo `DeliverySource`
// exportado desde acá competiría con el de allá (el aviso de "Duplicated imports"
// que ya arrastran `SourceLink` y `LegalFact`). Acá se importan y no se re-exportan.
import type { DeliverySource } from './parcelDelivery'

/** Fecha (YYYY-MM-DD) en que se contrastó cada casilla contra su fuente. */
export const CARD_SECURITY_LAST_REVIEWED = '2026-09-11'

/** El hilo que originó la página. Se cita porque la pregunta es textual. */
export const CARD_SECURITY_SOURCE_THREAD =
  'https://reddit.com/r/uruguay/comments/1wd0ufw/brou_recompensa_seguridad/'

// ---------------------------------------------------------------------------
// 1. Cómo se clona una tarjeta, de verdad
// ---------------------------------------------------------------------------

/**
 * Cuánto pesa el vector en lo que se reporta acá.
 *
 * No es una estadística: no existe una pública en Uruguay. Es el peso en el
 * corpus de r/uruguay más lo que el propio emisor describe de su operativa, y
 * la página lo dice así. `teorico` = se puede demostrar en un laboratorio y no
 * aparece en ningún relato local.
 */
export type VectorWeight = 'dominante' | 'frecuente' | 'residual' | 'teorico'

export interface CloningVector {
  id: string
  /** Cómo lo nombra la gente. */
  label: string
  icon: string
  weight: VectorWeight
  /** Qué datos necesita quien lo hace. Es la clave de todo el cuadro. */
  needs: string
  /** El mecanismo, en nuestras palabras. */
  how: string
  /** Lo que efectivamente lo corta. */
  stops: readonly string[]
  /** Lo que la gente cree que lo corta y no lo corta. */
  doesNotStop: readonly string[]
  sources: readonly DeliverySource[]
}

/**
 * American Express, sobre dónde imprime su código de seguridad. Se declara acá
 * arriba y no junto al resto de las fuentes de emisor porque la usan las dos
 * mitades del módulo: el vector del mostrador y la ficha de Scotiabank. Abajo
 * quedaría en zona muerta temporal cuando se evalúa `CLONING_VECTORS`.
 */
const AMEX_CID: DeliverySource = {
  label: 'American Express — el código de seguridad va al frente, 4 dígitos',
  url: 'https://www.americanexpress.com/ar/merchant/faqs.html',
  kind: 'operador',
}

export const CLONING_VECTORS: readonly CloningVector[] = Object.freeze([
  {
    id: 'datos-en-el-mostrador',
    label: 'Te copian los datos en el mostrador',
    icon: 'mdi-camera-outline',
    weight: 'dominante',
    needs:
      'El número, el vencimiento y los tres dígitos del dorso. La tarjeta no se va a ningún lado.',
    how: 'La tarjeta sale de tu vista unos segundos —se la llevan a la caja, al fondo, detrás de una vidriera— y eso alcanza para anotar o fotografiar las dos caras. Después las compras entran por internet, donde el plástico no hace falta. En los relatos locales el gasto aparece en compras web de comercios grandes y en apps de delivery, no en un POS. Cuánto tiene que durar ese descuido depende de la marca: en Visa y Mastercard hacen falta las dos caras, en American Express no, porque el código de seguridad son cuatro dígitos impresos al frente, arriba del número.',
    stops: [
      'Que la tarjeta no salga de tu vista: el POS se acerca a la tarjeta, no al revés.',
      'Un número que no sirva para una segunda compra: tarjeta virtual o prepaga con saldo acotado para lo de internet.',
      'El aviso por cada compra, que es lo que convierte tres días de gasto en diez minutos.',
    ],
    doesNotStop: [
      'Tapar los últimos cuatro dígitos con cinta: el que copia tiene la tarjeta en la mano.',
      'La billetera con bloqueo RFID: acá nadie leyó el chip.',
    ],
    sources: [
      {
        label: 'Reddit: compras web tras pasar la tarjeta en un local',
        url: 'https://reddit.com/r/uruguay/comments/1r5kpsd/me_copiaron_la_tarjeta_y_el_banco_se_dió_cuenta/',
        kind: 'practica',
      },
      {
        label: 'Reddit: "la tarjeta no puede salir de tu vista"',
        url: 'https://reddit.com/r/uruguay/comments/1nxf3at/me_clonaron_la_tarjeta_brou_recompensas/',
        kind: 'practica',
      },
      AMEX_CID,
    ],
  },
  {
    id: 'filtracion-del-comercio',
    label: 'El número se filtra donde lo dejaste guardado',
    icon: 'mdi-database-alert-outline',
    weight: 'dominante',
    needs:
      'Los mismos datos, pero los entrega un tercero: el comercio, la app donde quedó la tarjeta guardada, o la lista que se vende después.',
    how: 'La tarjeta nunca se tocó: aparece gastada una que está guardada en un cajón o que sólo se usó para una suscripción. Es el caso que desarma la teoría del contactless, porque no hubo contacto con nada.',
    stops: [
      'No dejar la tarjeta principal guardada en cada sitio: un número distinto por suscripción, si el emisor lo da.',
      'Revisar el resumen con el aviso prendido, no a fin de mes.',
      'Pagar lo de internet desde una prepaga que cargás al momento.',
    ],
    doesNotStop: [
      'Cambiar de plástico sin cambiar dónde está guardado el número.',
      'Cualquier cosa que protejas en tu billetera física.',
    ],
    sources: [
      {
        label: 'Reddit: tarjeta BROU que "no uso nunca", gastada igual',
        url: 'https://reddit.com/r/uruguay/comments/1hiv516/me_clonaron_la_tarjeta/',
        kind: 'practica',
      },
    ],
  },
  {
    id: 'el-codigo-que-dictaste',
    label: 'Te llaman "del banco" y les dictás el código',
    icon: 'mdi-phone-alert-outline',
    weight: 'frecuente',
    needs: 'Que vos le pases el código de un solo uso que te llega al celular, o la clave.',
    how: 'Con ese código se autentica una compra o se habilita el acceso. Es el único vector donde la autenticación funciona perfecto y el resultado igual es malo, porque el segundo factor lo entregó el titular. El BCU lo pone primero en su lista de recomendaciones, y tiene consecuencia concreta: una compra autenticada así es la más difícil de desconocer después.',
    stops: [
      'Cortar y llamar vos al número impreso en la tarjeta. Ningún emisor pide por teléfono el código que te acaba de llegar.',
      'Saber de antemano que ese código es la firma: si lo dictás, firmaste.',
    ],
    doesNotStop: [
      'Tener la tarjeta guardada, virtual o tokenizada: el problema no es el plástico.',
      'Que el número de quien llama parezca el del banco.',
    ],
    sources: [
      {
        label: 'BCU — Recomendaciones para la prevención de intentos de estafa (22/8/2022)',
        url: 'https://www.bcu.gub.uy/Comunicaciones/Paginas/Detalle-Noticia.aspx?noticia=152',
        kind: 'norma',
      },
      {
        label: 'Cuánto te devuelven según la ley, y cuándo no',
        url: 'https://cambio-uruguay.com/estafas-uruguay',
        kind: 'norma',
      },
    ],
  },
  {
    id: 'robo-y-contactless',
    label: 'Te roban la tarjeta y la usan sin PIN',
    icon: 'mdi-credit-card-clock-outline',
    weight: 'frecuente',
    needs:
      'El plástico en la mano. Nada más, mientras cada compra quede por debajo del monto que no pide PIN.',
    how: 'No es clonación: es tu tarjeta, funcionando. Importa porque el monto sin PIN está publicado y casi nadie lo sabe: en la MI BROU, las compras menores a $ 2.000 (o U$S 50) en modalidad sin contacto no piden el PIN; en la Tarjeta Joven, menores a $ 1.500 (o U$S 30). Varias compras chicas seguidas no piden nada.',
    stops: [
      'Bloquear desde la app en el minuto, no ir a la sucursal al otro día.',
      'El aviso por cada compra: es lo único que te avisa mientras pasa.',
      'Tener en la tarjeta del día a día saldo acotado, y no la cuenta entera.',
    ],
    doesNotStop: ['El PIN: por debajo de ese monto no se pide.', 'La firma en el dorso.'],
    sources: [
      {
        label:
          'BROU — MI BROU: "Las compras menores a $2.000 (o U$S 50) en modalidad sin contacto no necesitan el PIN"',
        url: 'https://www.brou.com.uy/personas/tarjetas/redbrou-visa/mi-brou',
        kind: 'operador',
      },
      {
        label: 'BROU — Tarjeta Joven Visa Débito: $1.500 o U$S 30 sin PIN',
        url: 'https://www.brou.com.uy/personas/tarjetas/redbrou-visa/tarjeta-joven-visa-debito',
        kind: 'operador',
      },
    ],
  },
  {
    id: 'banda-magnetica',
    label: 'Copian la banda magnética',
    icon: 'mdi-credit-card-wireless-off-outline',
    weight: 'residual',
    needs: 'Pasar la banda por un lector adulterado, y después un plástico en blanco.',
    how: 'Es la clonación en sentido literal: la banda es un archivo estático y copiarlo alcanza para rehacer la tarjeta. Por eso sobrevive donde todavía se acepta banda —cajeros viejos, comercios del exterior— y por eso los relatos de clonación "presencial" suelen venir de un viaje. El chip no se copia así: responde cada compra con un criptograma distinto, y el número que usó ayer no sirve hoy.',
    stops: [
      'Pagar con chip o sin contacto siempre que el comercio lo permita.',
      'Avisar el viaje antes de salir, para que el emisor corte lo que venga de otro lado.',
    ],
    doesNotStop: [
      'Pedir una tarjeta vieja "porque la de antes era más segura": la de antes es justamente la que se copia.',
    ],
    sources: [
      {
        label: 'Reddit: clonación presencial en el exterior, dos veces',
        url: 'https://reddit.com/r/uruguay/comments/1u0dr76/2da_vez_que_le_clonan_la_tdc_itaú_a_mi_vieja/',
        kind: 'practica',
      },
    ],
  },
  {
    id: 'lectura-nfc',
    label: 'Te leen el chip sin contacto desde el bolsillo',
    icon: 'mdi-nfc-variant',
    weight: 'teorico',
    needs:
      'Un lector a centímetros de la tarjeta, y además un sistema que acepte una compra sin criptograma válido.',
    how: 'Se puede leer el número y el vencimiento de algunas tarjetas sin contacto. Lo que no se obtiene es el código del dorso ni un criptograma reutilizable, que es lo que el emisor verifica en cada compra. Por eso sirve —si sirve— para lo mismo que una foto de la tarjeta: comprar por internet. No para fabricar una copia que funcione en un POS.',
    stops: [
      'Lo mismo que frena las compras por internet: número virtual, saldo acotado, aviso por compra.',
    ],
    doesNotStop: [
      'Nada que tenga que ver con la billetera: el problema no es la lectura, es el uso del número después.',
    ],
    sources: [
      {
        label: 'Reddit: la discusión local sobre Flipper Zero y contactless',
        url: 'https://reddit.com/r/uruguay/comments/1hiv516/me_clonaron_la_tarjeta/',
        kind: 'practica',
      },
    ],
  },
])

// ---------------------------------------------------------------------------
// 2. Qué control te da cada emisor
// ---------------------------------------------------------------------------

export type ControlId =
  /** Aviso por cada compra, sin tener que mirar el resumen. */
  | 'aviso'
  /** Apagar y volver a prender la tarjeta desde la app, sin llamar a nadie. */
  | 'bloqueoApp'
  /** Bajar el tope del canal por el que entra el fraude. */
  | 'limites'
  /** Un número distinto del de tu plástico para lo de internet. */
  | 'virtual'
  /** Pagar con el teléfono, sin entregar el número al comercio. */
  | 'billetera'

/**
 * El estado de la casilla.
 *
 * `sin-publicar` no es "no tiene": es "el emisor no lo publica", y se muestra
 * distinto a propósito. Rellenar esa casilla con la app de otro país es el error
 * que hace circular la mitad del folklore (la función de tarjeta virtual que se
 * le atribuye a Itaú en Uruguay está publicada por Itaú Brasil).
 */
export type ControlState = 'si' | 'pago' | 'parcial' | 'no' | 'sin-publicar'

export interface IssuerControl {
  state: ControlState
  /** Qué hace exactamente, en una línea. */
  detail: string
  /** El texto del propio emisor, cuando existe y conviene citarlo crudo. */
  quote?: string
  sources: readonly DeliverySource[]
}

export interface Issuer {
  id: string
  label: string
  /** Banco, emisora de dinero electrónico o administradora de crédito. */
  kind: 'banco' | 'iede' | 'administradora'
  controls: Record<ControlId, IssuerControl>
  /** Teléfono o canal para bloquear ya, tal como lo publica el emisor. */
  report: string
  reportSource: DeliverySource
  /**
   * Una advertencia que no entra en ninguna casilla porque no es un control:
   * algo del producto (cómo está impreso el plástico, qué producto queda
   * afuera del servicio, qué tope es fijo) que cambia la exposición y que sólo
   * se ve leyendo la letra chica del emisor. Nunca reemplaza una casilla: si
   * es un control, va al cuadro; si no, va acá y con su fuente igual.
   */
  note?: { text: string; sources: readonly DeliverySource[] }
}

const BROU_NOTIF: DeliverySource = {
  label: 'BROU — Notificación de Transacciones',
  url: 'https://www.brou.com.uy/personas/tarjetas/notificacion-de-transacciones',
  kind: 'operador',
}

const BROU_SMS: DeliverySource = {
  label: 'BROU — Alertas SMS Mastercard',
  url: 'https://www.brou.com.uy/personas/tarjetas/mastercard/alertas-sms-mastercard',
  kind: 'operador',
}

const BROU_FAQ: DeliverySource = {
  label: 'BROU — Asistencia: tarjetas',
  url: 'https://asistencia.brou.com.uy/preguntas/categoria/tarjetas',
  kind: 'operador',
}

const ITAU_CIBER: DeliverySource = {
  label: 'Itaú — Ciberseguridad',
  url: 'https://www.itau.com.uy/inst/ciberseguridad.html',
  kind: 'operador',
}

const SANTANDER_ROBO: DeliverySource = {
  label: 'Santander — Pérdida o robo de tarjeta',
  url: 'https://www.santander.com.uy/centro-de-ayuda/tarjetas/perdida-o-robo-de-tarjeta',
  kind: 'operador',
}

const SANTANDER_SEG: DeliverySource = {
  label: 'Santander — Tarjetas: seguridad',
  url: 'https://www.santander.com.uy/centro-de-ayuda/tarjetas/seguridad',
  kind: 'operador',
}

const SCOTIA_BLOQUEO: DeliverySource = {
  label: 'Scotiabank — Bloqueo temporal',
  url: 'https://www.scotiabank.com.uy/Personas/guia-banca-digital/funcionalidades-destacadas/bloqueo-temporal',
  kind: 'operador',
}

const BBVA_TC: DeliverySource = {
  label: 'BBVA — Tarjeta de crédito',
  url: 'https://www.bbva.com.uy/personas/productos/tarjetas/tarjeta-de-credito.html',
  kind: 'operador',
}

const OCA_CIBER: DeliverySource = {
  label: 'OCA — Ciberseguridad',
  url: 'https://oca.uy/ciber-seguridad/',
  kind: 'operador',
}

const OCA_BILLETERA: DeliverySource = {
  label: 'OCA — Billetera digital',
  url: 'https://oca.uy/billetera-digital.html',
  kind: 'operador',
}

const PREX_AYUDA: DeliverySource = {
  label: 'Prex — Ayuda',
  url: 'https://www.prexcard.com/ayuda/9',
  kind: 'operador',
}

/**
 * La cartilla oficial de OCA Blue, en PDF. Es la única pieza donde OCA publica
 * el tope diario de compras, y es el dato que discutía el hilo.
 */
const OCA_CARTILLA: DeliverySource = {
  label: 'OCA — Cartilla OCA Blue (PDF)',
  url: 'https://www.oca.com.uy/download/Cartilla_OCABlue.pdf',
  kind: 'operador',
}

const SCOTIA_AMEX: DeliverySource = {
  label: 'Scotiabank — Tarjeta American Express (ficha del producto)',
  url: 'https://www.scotiabank.com.uy/Personas/Tarjetas/Tipos-de-tarjetas/american-express/tarjeta-de-credito-american-express',
  kind: 'operador',
}

const SCOTIA_AMEX_GAVIOTAS: DeliverySource = {
  label: 'Scotiabank — Gaviotas American Express (ficha del producto)',
  url: 'https://www.scotiabank.com.uy/Personas/Tarjetas/Tipos-de-tarjetas/american-express/tarjeta-gaviotas-american-express',
  kind: 'operador',
}

/** El caso de prensa que sí existe sobre Prex, y que NO es clonación de plástico. */
const PREX_PHISHING: DeliverySource = {
  label: 'El Observador — phishing en Prex: US$ 3.000 en transferencias Prex a Prex',
  url: 'https://www.elobservador.com.uy/nota/exedil-fue-estafado-en-prex-y-le-robaron-us-3-mil-mira-como-fue-la-maniobra-2023210121659',
  kind: 'practica',
}

const MIDINERO_FUNC: DeliverySource = {
  label: 'Midinero — Funcionalidades',
  url: 'https://www.midinero.com.uy/preguntas-frecuentes/funcionalidades/',
  kind: 'operador',
}

const MP_CUENTA: DeliverySource = {
  label: 'Mercado Pago — Cuenta y tarjeta prepaga',
  url: 'https://www.mercadopago.com.uy/cuenta',
  kind: 'operador',
}

/** De dónde sale el estado de las billeteras, que el sitio ya mantiene fechado. */
const WALLET_SOURCE: DeliverySource = {
  label: 'Apple Pay — emisores de Uruguay (relevado 21/8/2026)',
  url: 'https://support.apple.com/en-us/109524',
  kind: 'operador',
}

const NO_PUBLICA = (what: string, source: DeliverySource): IssuerControl => ({
  state: 'sin-publicar',
  detail: `No figura publicado en ${what}. Puede existir dentro de la app; mientras el emisor no lo documente, acá no se cuenta.`,
  sources: [source],
})

export const ISSUERS: readonly Issuer[] = Object.freeze([
  {
    id: 'brou',
    label: 'BROU',
    kind: 'banco',
    report: 'FonoBROU (2) 1996, opción 1 para denunciar; opción 8 para bloquear el débito',
    reportSource: {
      label: 'BROU — Denuncia de tarjetas',
      url: 'https://www.brou.com.uy/institucional/denuncia-de-tarjetas',
      kind: 'operador',
    },
    note: {
      text: 'El aviso gratuito no hay que contratarlo: al buzón de eBROU llega solo, y el push del celular exige una sola configuración —App eBROU › Información Personal › Configurar dispositivos push— más tener las notificaciones habilitadas en el teléfono. Si creés que BROU no te avisa, mirá ahí antes de pagar el SMS. Dos cosas quedan afuera y conviene saberlas: el débito Maestro no tiene el servicio gratuito, y la notificación por correo electrónico no figura publicada en ningún lado (los canales gratis son buzón y push).',
      sources: [BROU_NOTIF],
    },
    controls: {
      aviso: {
        state: 'parcial',
        detail:
          'Hay dos servicios y conviene no confundirlos, pero el gratis alcanza más de lo que suele creerse: el push de la App eBROU más el buzón de eBROU avisan por cada compra presencial que no pidió PIN, por cada compra no presencial sin segundo factor y por TODA compra rechazada, en Crédito, Débito y Prepaga, propias y de tus adicionales. El hueco son las que sí pidieron PIN o pasaron por Visa Secure o MCIDcheck: para esas hay que contratar el SMS, $ 75 + IVA por un paquete de 25 mensajes al mes. Débito Maestro queda afuera del servicio gratuito, y las Mastercard procesadas por Fiserv no tienen el de SMS.',
        quote:
          '"Te brindamos la posibilidad de recibir notificaciones gratuitas vía medios electrónicos cada vez que realices una transacción de compra con tus Tarjetas Mastercard y Visa (Crédito, Débito y Prepaga), en los casos que no tienen un segundo factor de autenticación para validar al tarjetahabiente. […] Este servicio gratuito no sustituye el de Alerta SMS (con costo, que incluye todos los tipos de transacciones de compra que realices)."',
        sources: [BROU_NOTIF, BROU_SMS],
      },
      bloqueoApp: {
        state: 'parcial',
        detail:
          'El débito se bloquea solo desde eBROU (Operar › Tarjetas de débito › Bloquear Tarjeta) o por FonoBROU opción 8. Lo que no publica es el desbloqueo: el bloqueo por sospecha lo levanta el banco después de contactarte.',
        sources: [BROU_FAQ],
      },
      limites: {
        state: 'parcial',
        detail:
          'Publica topes de retiro del débito ($ 40.000 por día en Uruguay, U$S 500 en el exterior) y el aviso de viaje por eBROU, pero no un tope de compras por internet que el titular pueda bajar.',
        sources: [BROU_FAQ],
      },
      virtual: NO_PUBLICA('el sitio ni en la asistencia de BROU', BROU_FAQ),
      billetera: {
        state: 'parcial',
        detail:
          'Google Pay sí. Apple Pay no: BROU no figura entre los emisores uruguayos de Apple, así que en iPhone se paga con el plástico. Es exactamente el hueco que plantea el hilo de la BROU Recompensa.',
        sources: [WALLET_SOURCE],
      },
    },
  },
  {
    id: 'itau',
    label: 'Itaú',
    kind: 'banco',
    report: '1784 para denunciar; bloqueo temporal desde la web y la app',
    reportSource: ITAU_CIBER,
    controls: {
      aviso: {
        state: 'si',
        detail:
          'Alertas configurables por SMS y mail "apenas ocurren", más las push de la app. Es el titular el que elige qué movimientos quiere.',
        quote:
          '"Configurá tus alertas por SMS y mail para enterarte de los movimientos de tus cuentas y tarjetas, apenas ocurren."',
        sources: [ITAU_CIBER],
      },
      bloqueoApp: {
        state: 'si',
        detail:
          'Bloqueo temporal de crédito y débito desde la web y la app (Servicios › Tarjetas › Bloqueo y desbloqueo), eligiendo cuáles. Es apagar y prender, no dar de baja.',
        quote:
          '"Esta función te permite desactivar de manera temporal tus tarjetas de crédito y débito."',
        sources: [ITAU_CIBER],
      },
      limites: {
        state: 'parcial',
        detail:
          'Publica que se puede bajar a cero el límite de transferencias, que es la puerta de la cuenta, no la de la tarjeta. Un tope de compras por internet a medida no aparece.',
        sources: [ITAU_CIBER],
      },
      virtual: {
        state: 'sin-publicar',
        detail:
          'Acá hay una confusión que conviene cortar: la función de crear tarjeta virtual y deshabilitar la física para internet la publicó Itaú BRASIL en 2022. En el sitio uruguayo no figura, y no se cuenta como propia.',
        sources: [
          {
            label: 'PaymentMedia — Itaú (Brasil) suma la función, 1/9/2022',
            url: 'https://www.paymentmedia.com/news-6097-ita-suma-funcin-para-deshabilitar-compras-online-con-la-tarjeta-fsica.html',
            kind: 'operador',
          },
        ],
      },
      billetera: {
        state: 'si',
        detail: 'Apple Pay y Google Pay, los dos.',
        sources: [WALLET_SOURCE],
      },
    },
  },
  {
    id: 'santander',
    label: 'Santander',
    kind: 'banco',
    report: '132 (crédito) · Banred 2916 1234 (débito)',
    reportSource: SANTANDER_ROBO,
    controls: {
      aviso: {
        state: 'sin-publicar',
        detail:
          'Varios usuarios reportan SMS y push por cada compra, y que llegan en segundos. Pero no figura publicado en las páginas de tarjetas de Santander: su página de la app sólo promete notificaciones de vencimientos por mail. Queda como práctica reportada, no como servicio publicado.',
        sources: [
          {
            label:
              'Reddit: "Santander lo empezó a hacer… me llega un SMS y una notificación a la app"',
            url: 'https://reddit.com/r/uruguay/comments/1hiv516/me_clonaron_la_tarjeta/',
            kind: 'practica',
          },
        ],
      },
      bloqueoApp: {
        state: 'si',
        detail:
          'Bloqueo preventivo desde la app para que no entren compras, reversible en el momento si la tarjeta aparece. También por el 132.',
        sources: [SANTANDER_SEG, SANTANDER_ROBO],
      },
      limites: NO_PUBLICA('el centro de ayuda de Santander', SANTANDER_SEG),
      virtual: NO_PUBLICA('el centro de ayuda de Santander', SANTANDER_SEG),
      billetera: {
        state: 'si',
        detail: 'Apple Pay y Google Pay desde agosto de 2025.',
        sources: [WALLET_SOURCE],
      },
    },
  },
  {
    id: 'scotiabank',
    label: 'Scotiabank',
    kind: 'banco',
    report: 'Bloqueo desde Scotia Móvil; denuncia por el Centro de Contacto',
    reportSource: SCOTIA_BLOQUEO,
    note: {
      text: 'Es el único emisor del cuadro con American Express, y eso cambia la exposición física de la tarjeta: en una Amex el código de seguridad son cuatro dígitos impresos AL FRENTE, arriba del número, así que una sola foto de la cara de adelante trae número, vencimiento y código. En Visa y Mastercard hacen falta las dos caras. No es un defecto de Scotiabank —es el diseño de Amex en todo el mundo— pero si tu tarjeta es esa, «que no salga de tu vista» deja de ser un consejo genérico. Lo que sí varía por producto es el sin contacto: la ficha de la Amex Internacional lista «Pagos sin contactos» y la de Gaviotas American Express no lo menciona.',
      sources: [AMEX_CID, SCOTIA_AMEX, SCOTIA_AMEX_GAVIOTAS],
    },
    controls: {
      aviso: {
        state: 'parcial',
        detail:
          'La app anuncia aviso de compras con tarjeta de débito. Para crédito, lo que publica es el aviso de viaje, no la notificación por compra.',
        sources: [SCOTIA_BLOQUEO],
      },
      bloqueoApp: {
        state: 'si',
        detail:
          'Bloqueo temporal de la tarjeta de crédito y de las adicionales desde Scotia Móvil, y reactivación cuando quieras, sin cancelarla.',
        sources: [SCOTIA_BLOQUEO],
      },
      limites: NO_PUBLICA('la guía de banca digital de Scotiabank', SCOTIA_BLOQUEO),
      virtual: NO_PUBLICA('la guía de banca digital de Scotiabank', SCOTIA_BLOQUEO),
      billetera: {
        state: 'si',
        detail: 'Apple Pay y Google Pay.',
        sources: [WALLET_SOURCE],
      },
    },
  },
  {
    id: 'bbva',
    label: 'BBVA',
    kind: 'banco',
    report: 'Bloqueo por robo o extravío desde la App BBVA o BBVA Net',
    reportSource: BBVA_TC,
    controls: {
      aviso: {
        state: 'si',
        detail:
          'Alertas configurables que llegan con los datos de la transacción —comercio, horario, monto y aprobación— en cada compra.',
        sources: [BBVA_TC],
      },
      bloqueoApp: {
        state: 'si',
        detail: 'Bloqueo por robo o extravío desde la app o BBVA Net.',
        sources: [BBVA_TC],
      },
      limites: NO_PUBLICA('el sitio de BBVA Uruguay', BBVA_TC),
      virtual: NO_PUBLICA('el sitio de BBVA Uruguay', BBVA_TC),
      billetera: {
        state: 'parcial',
        detail:
          'Google Pay desde agosto de 2026 y sólo con tarjetas Visa. Apple Pay no: su propio FAQ contesta que están trabajando en la solución.',
        sources: [WALLET_SOURCE],
      },
    },
  },
  {
    id: 'oca',
    label: 'OCA',
    kind: 'administradora',
    report: 'Bloqueo desde OCA App o Mi Cuenta',
    reportSource: OCA_CIBER,
    controls: {
      aviso: {
        state: 'si',
        detail:
          'Alertas de movimientos activables por cada transacción, y la recomendación propia de contrastarlas contra lo que compraste.',
        sources: [OCA_CIBER],
      },
      bloqueoApp: {
        state: 'si',
        detail:
          'Bloqueo temporal desde la app o Mi Cuenta ante una duda sobre un movimiento, y rehabilitación después, sin reimpresión.',
        sources: [OCA_CIBER],
      },
      limites: {
        state: 'parcial',
        detail:
          'La cartilla de OCA Blue publica un tope diario fijo de compras locales e internacionales de $ 20.000 y U$S 500, que acota cuánto se puede gastar en un día si el número se escapa. Cuenta a medias porque es un techo del emisor, no un control tuyo: OCA no documenta forma de subirlo ni de bajarlo desde la app ni desde Mi Cuenta. El "aumento de límite" que sí documenta es otra cosa —el límite de crédito de la tarjeta de crédito, transitorio por 60 días—, no el tope diario del débito.',
        quote:
          '"Las compras locales e internacionales no podrán exceder los montos diarios de $20.000 y U$S500."',
        sources: [OCA_CARTILLA],
      },
      virtual: {
        state: 'parcial',
        detail:
          'No emite un número virtual para cargar en cualquier sitio, pero al sumar la tarjeta a la OCA App no guarda los datos reales: crea una tarjeta digital equivalente y el comercio no recibe tus números.',
        sources: [OCA_BILLETERA],
      },
      billetera: {
        state: 'si',
        detail: 'Apple Pay y Google Pay, más su propia app para pagar con el teléfono.',
        sources: [WALLET_SOURCE, OCA_BILLETERA],
      },
    },
  },
  {
    id: 'prex',
    label: 'Prex',
    kind: 'iede',
    report: 'Bloqueo desde la app (Mis tarjetas › Bloquear) o por el chat',
    reportSource: PREX_AYUDA,
    note: {
      text: 'Prex es la que más aparece nombrada cuando se habla de fraude, y conviene separar de qué fraude se habla: los casos que llegaron a la prensa no son clonaciones del plástico sino tomas de cuenta por phishing —a un exedil le sacaron US$ 3.000 en tres transferencias de Prex a Prex—. Eso no lo frena ningún control de este cuadro, porque el atacante no copia la tarjeta: consigue que le des el acceso. La defensa ahí es otra: no seguir enlaces, no dictar códigos, y que el segundo factor viva en un lado distinto del teléfono donde te escriben.',
      sources: [PREX_PHISHING],
    },
    controls: {
      aviso: {
        state: 'si',
        detail: 'Notificaciones de movimientos en tiempo real desde la app.',
        sources: [PREX_AYUDA],
      },
      bloqueoApp: {
        state: 'si',
        detail:
          'Bloqueo y desbloqueo de la cuenta y la tarjeta desde la app, las dos direcciones. La tarjeta nueva, de hecho, se entrega bloqueada y la desbloqueás vos.',
        sources: [PREX_AYUDA],
      },
      limites: {
        state: 'parcial',
        detail:
          'El control real acá es el saldo: es prepaga, así que lo que no cargaste no se puede gastar. Topes por canal que el titular ajuste no están publicados.',
        sources: [PREX_AYUDA],
      },
      virtual: {
        state: 'sin-publicar',
        detail:
          'Ojo con esto: el dato que circula —tarjeta virtual con código de seguridad que cambia cada dos minutos— está publicado por Prex PERÚ. En el sitio uruguayo no aparece, y por eso no se cuenta.',
        sources: [PREX_AYUDA],
      },
      billetera: {
        state: 'si',
        detail: 'Apple Pay y Google Pay.',
        sources: [WALLET_SOURCE],
      },
    },
  },
  {
    id: 'midinero',
    label: 'Midinero',
    kind: 'iede',
    report: 'Bloqueo desde la app o por el Centro de Atención al Cliente',
    reportSource: MIDINERO_FUNC,
    controls: {
      aviso: {
        state: 'si',
        detail:
          'Push de consumos y recargas, más alertas por saldo bajo. Requiere tener el acceso avanzado validado.',
        sources: [MIDINERO_FUNC],
      },
      bloqueoApp: {
        state: 'si',
        detail:
          'Bloqueo temporal desde la app cuando no encontrás la tarjeta pero no la diste por perdida, y desbloqueo después.',
        sources: [MIDINERO_FUNC],
      },
      limites: {
        state: 'si',
        detail:
          'El único emisor del cuadro que publica topes distintos por canal y deja moverlos: $ 30.000 o U$S 1.000 por día en compras presenciales y $ 15.000 o U$S 500 por internet, ampliables desde los parámetros de seguridad de la app. Bajar el de internet es, para el vector dominante, la defensa más directa que hay en plaza.',
        sources: [MIDINERO_FUNC],
      },
      virtual: NO_PUBLICA('el sitio de Midinero', MIDINERO_FUNC),
      billetera: {
        state: 'si',
        detail: 'Apple Pay y Google Pay.',
        sources: [WALLET_SOURCE],
      },
    },
  },
  {
    id: 'mercadopago',
    label: 'Mercado Pago',
    kind: 'iede',
    report: 'Gestión de la tarjeta desde la app',
    reportSource: MP_CUENTA,
    controls: {
      aviso: {
        state: 'si',
        detail: 'Notificaciones de la propia app por cada movimiento de la cuenta.',
        sources: [MP_CUENTA],
      },
      bloqueoApp: NO_PUBLICA('la página uruguaya de la cuenta', MP_CUENTA),
      limites: {
        state: 'parcial',
        detail: 'Prepaga: el tope es el saldo que le pasaste. No publica topes por canal.',
        sources: [MP_CUENTA],
      },
      virtual: {
        state: 'si',
        detail:
          'Emite tarjeta virtual y física, y la física viene "sin datos impresos": no hay número que fotografiar en el mostrador. Es la respuesta industrial a la pregunta de la cinta negra.',
        quote: '"Virtual y física. Sin datos impresos, 100% segura."',
        sources: [MP_CUENTA],
      },
      billetera: {
        state: 'parcial',
        detail:
          'Paga por QR y desde su propia app. No figura entre los emisores uruguayos de Apple Pay.',
        sources: [WALLET_SOURCE],
      },
    },
  },
])

// ---------------------------------------------------------------------------
// 3. El puntaje: para qué sirve y qué NO mide
// ---------------------------------------------------------------------------

/**
 * Peso de cada control, elegido por cuánto corta del vector DOMINANTE (el número
 * usado por internet sin la tarjeta), no por cuán vistoso es.
 *
 * El aviso pesa más que la billetera a propósito: la billetera protege la compra
 * presencial, que es justamente la que casi no aparece en los relatos locales,
 * mientras el aviso es lo único que acorta el tiempo entre la primera compra
 * ajena y el bloqueo.
 */
export const CONTROL_WEIGHTS: Readonly<Record<ControlId, number>> = Object.freeze({
  aviso: 30,
  bloqueoApp: 25,
  limites: 20,
  virtual: 15,
  billetera: 10,
})

/** Cuánto del peso cobra cada estado. `pago` no cobra entero: hay que pagarlo. */
export const STATE_FACTOR: Readonly<Record<ControlState, number>> = Object.freeze({
  si: 1,
  pago: 0.5,
  parcial: 0.5,
  no: 0,
  'sin-publicar': 0,
})

export const CONTROL_LABELS: Readonly<Record<ControlId, string>> = Object.freeze({
  aviso: 'Aviso por cada compra',
  bloqueoApp: 'Bloqueo y desbloqueo en la app',
  limites: 'Límites por canal',
  virtual: 'Número virtual',
  billetera: 'Billetera (Apple/Google Pay)',
})

export const STATE_LABELS: Readonly<Record<ControlState, string>> = Object.freeze({
  si: 'sí',
  pago: 'sí, pago',
  parcial: 'parcial',
  no: 'no',
  'sin-publicar': 'sin publicar',
})

export interface IssuerScore {
  id: string
  label: string
  /** 0 a 100, con los pesos de arriba. */
  score: number
  /** Cuántas casillas están sin publicar. El puntaje solo no lo dice. */
  unpublished: number
  /** El control que más le falta, para que el número no quede sin explicación. */
  weakest: ControlId | null
}

/**
 * El puntaje mide LO QUE EL EMISOR PUBLICA, no lo que su app hace.
 *
 * Es una limitación real y la página la dice en voz alta: un emisor que tiene el
 * control pero no lo documenta puntúa igual que uno que no lo tiene. Se eligió
 * así porque la alternativa —abrir nueve apps y creerle a la memoria— no es
 * verificable por el lector, y acá todo tiene que poder contrastarse contra una
 * URL.
 */
export function scoreIssuer(issuer: Issuer): IssuerScore {
  let score = 0
  let unpublished = 0
  let weakest: ControlId | null = null
  let worstLoss = 0

  for (const id of Object.keys(CONTROL_WEIGHTS) as ControlId[]) {
    const control = issuer.controls[id]
    const weight = CONTROL_WEIGHTS[id]
    const earned = weight * STATE_FACTOR[control.state]
    score += earned
    if (control.state === 'sin-publicar') unpublished += 1
    const loss = weight - earned
    if (loss > worstLoss) {
      worstLoss = loss
      weakest = id
    }
  }

  return {
    id: issuer.id,
    label: issuer.label,
    score: Math.round(score),
    unpublished,
    weakest,
  }
}

/** El cuadro ordenado. Empate: el que deja menos casillas sin publicar primero. */
export function rankIssuers(issuers: readonly Issuer[] = ISSUERS): IssuerScore[] {
  return issuers
    .map(scoreIssuer)
    .sort(
      (a, b) => b.score - a.score || a.unpublished - b.unpublished || a.label.localeCompare(b.label)
    )
}

/** Cuántos emisores tienen cada control resuelto, para el texto de arriba. */
export function controlCoverage(
  id: ControlId,
  issuers: readonly Issuer[] = ISSUERS
): { full: number; partial: number; unpublished: number; total: number } {
  let full = 0
  let partial = 0
  let unpublished = 0
  for (const issuer of issuers) {
    const state = issuer.controls[id].state
    if (state === 'si') full += 1
    else if (state === 'parcial' || state === 'pago') partial += 1
    else if (state === 'sin-publicar') unpublished += 1
  }
  return { full, partial, unpublished, total: issuers.length }
}

// ---------------------------------------------------------------------------
// 4. Mitos: lo que circula y lo que hace
// ---------------------------------------------------------------------------

export type MythVerdict = 'no-sirve' | 'a-medias' | 'sirve' | 'al-reves'

export interface CardMyth {
  id: string
  /** La frase tal como se dice. */
  claim: string
  verdict: MythVerdict
  /** Por qué, con el mecanismo adelante. */
  why: string
  /** Qué hacer en su lugar. Siempre hay algo. */
  instead: string
  sources: readonly DeliverySource[]
}

export const MYTH_LABELS: Readonly<Record<MythVerdict, string>> = Object.freeze({
  'no-sirve': 'no sirve',
  'a-medias': 'sirve a medias',
  sirve: 'sirve',
  'al-reves': 'es al revés',
})

export const CARD_MYTHS: readonly CardMyth[] = Object.freeze([
  {
    id: 'cinta-negra',
    claim: 'Taparle los números a la tarjeta con cinta negra.',
    verdict: 'no-sirve',
    why: 'Contra el vector dominante no hace nada: quien te copia los datos tiene la tarjeta en la mano y la cinta se levanta. Contra el resto tampoco, porque ahí el número no sale de tu plástico sino de un comercio o de una base filtrada. Y tiene costo propio: tapar el dorso esconde el código que TE piden a vos en cada compra legítima, y pegar cosas sobre la banda o el chip da fallas de lectura.',
    instead:
      'Si lo que te molesta es que el número esté a la vista, la solución existe y es del emisor: una prepaga sin datos impresos, o un número virtual distinto del de tu tarjeta principal.',
    sources: [MP_CUENTA],
  },
  {
    id: 'borrar-cvv',
    claim: 'Borrar con marcador los tres dígitos del dorso y aprendérselos.',
    verdict: 'a-medias',
    why: 'Es la única variante de la anterior con algo de lógica: el código del dorso es lo que convierte una foto de la cara frontal en una compra por internet. Pero el que fotografía las dos caras ya lo tiene, y vos te quedás sin poder pagar cuando el comercio lo pide.',
    instead:
      'Un número virtual para internet deja el código del plástico sin valor, sin tener que mutilar la tarjeta.',
    sources: [MP_CUENTA],
  },
  {
    id: 'dos-caras',
    claim: 'Para copiarla les hacen falta las dos caras de la tarjeta.',
    verdict: 'a-medias',
    why: 'En Visa y Mastercard sí: el número y el vencimiento están adelante y el código de tres dígitos atrás, así que hay que dar vuelta el plástico. En American Express no hay vuelta que dar: el código de seguridad son cuatro dígitos impresos al frente, arriba del número. Una sola foto de la cara de adelante ya trae todo lo que hace falta para comprar por internet. En Uruguay las Amex las emite Scotiabank.',
    instead:
      'Si tu tarjeta es Amex, el consejo de "que no salga de tu vista" pasa de recomendación a requisito, y el aviso por cada compra deja de ser opcional. Para lo de internet, mejor un número que no sea el de ese plástico.',
    sources: [AMEX_CID, SCOTIA_AMEX],
  },
  {
    id: 'brou-no-avisa',
    claim: 'El BROU no te avisa de las compras si no pagás el servicio de alertas.',
    verdict: 'no-sirve',
    why: 'Es media verdad que circula como verdad entera, y nos la marcaron en el propio hilo. BROU manda notificaciones gratis —al buzón de eBROU y como push en la App eBROU— por cada compra presencial que no pidió PIN, por cada compra de internet sin segundo factor y por toda compra rechazada, en crédito, débito y prepaga, incluidas las de tus adicionales. Lo pago es el SMS, y lo que agrega son justamente las compras en las que alguien tuvo que poner tu PIN o tu código de Visa Secure. Contra el fraude que cuenta la gente acá, el aviso gratis suena.',
    instead:
      'Antes de contratar el SMS, revisá que el push esté prendido: App eBROU › Información Personal › Configurar dispositivos push, y las notificaciones habilitadas en el teléfono. Si tu débito es Maestro, ahí sí el servicio gratuito no aplica.',
    sources: [BROU_NOTIF, BROU_SMS],
  },
  {
    id: 'billetera-rfid',
    claim: 'Comprar una billetera con bloqueo RFID.',
    verdict: 'no-sirve',
    why: 'Resuelve un problema que casi no existe acá: leer el chip a distancia sirve para obtener el número, no para fabricar una copia que funcione, porque el chip responde con un criptograma distinto en cada compra. Ninguno de los relatos locales empieza con un lector en el ómnibus.',
    instead:
      'Poné esa plata en bajar el tope de compras por internet o en activar el aviso por compra, que es donde pega el fraude real.',
    sources: [
      {
        label: 'Reddit: la propia discusión local ("lo de las billeteras es marketing")',
        url: 'https://reddit.com/r/uruguay/comments/1hiv516/me_clonaron_la_tarjeta/',
        kind: 'practica',
      },
    ],
  },
  {
    id: 'banda-vieja',
    claim: 'Quedarse con la tarjeta vieja de banda magnética, que era más segura.',
    verdict: 'al-reves',
    why: 'La banda es lo único que se clona en el sentido literal: es un dato fijo y copiarlo alcanza. El chip y el sin contacto no se copian así. Pedir la vieja es pedir la única que se puede duplicar.',
    instead: 'Usá chip o sin contacto, y avisá el viaje antes de salir del país.',
    sources: [BROU_FAQ],
  },
  {
    id: 'sin-apple-pay',
    claim: 'Si mi banco no tiene Apple Pay estoy expuesto.',
    verdict: 'a-medias',
    why: 'La billetera es un buen control —el comercio no recibe tu número y cada pago va tokenizado— pero protege la compra presencial, que es la que menos aparece en los relatos locales. En BROU hay Google Pay; el hueco es iPhone. Un emisor sin billetera y con aviso por compra te deja mejor parado que uno con billetera y sin aviso.',
    instead:
      'Mirá el cuadro: empezá por el aviso y el bloqueo desde la app. La billetera suma, pero es el control que menos pesa contra el fraude que efectivamente pasa.',
    sources: [WALLET_SOURCE],
  },
  {
    id: 'filtracion-del-banco',
    claim: 'Me la clonaron desde el propio banco, les filtraron los sistemas.',
    verdict: 'no-sirve',
    why: 'Es la explicación más citada y la que menos evidencia tiene: ninguna de las historias locales identifica una filtración del emisor, y varias se explican solas por un número que quedó guardado en un comercio. Importa porque la conclusión práctica cambia: si el problema fuera del banco, no habría nada que hacer de tu lado, y sí lo hay.',
    instead:
      'Asumí que el número circula y protegé el uso: aviso por compra, tope bajo de internet, número distinto para suscripciones.',
    sources: [
      {
        label: 'Reddit: "Tarjeta clonada desde el propio banco?"',
        url: 'https://reddit.com/r/uruguay/comments/1u46pgq/tarjeta_clonada_desde_el_propio_banco/',
        kind: 'practica',
      },
    ],
  },
])

// ---------------------------------------------------------------------------
// 5. Lo que discutieron en el hilo, contra la fuente
// ---------------------------------------------------------------------------

/**
 * La devolución de la comunidad, publicada con nombre y resultado.
 *
 * POR QUÉ ES UNA SECCIÓN Y NO UNA CORRECCIÓN SILENCIOSA. Esta página se publicó
 * en el hilo que le dio origen y la respuesta fue una corrección de fondo con
 * tres votos a favor: el autor decía que el BROU sí avisa por cada compra. Tenía
 * razón en lo que importa. Dejar eso en una edición invisible sería quedarse con
 * el dato y tirar la evidencia de cómo se consiguió; peor, sería no contestar a
 * quien se tomó el trabajo de contestarnos.
 *
 * LA REGLA DE ESTA SECCIÓN. Cada línea trae lo que se dijo y lo que encontramos
 * al ir a la fuente, con la fuente al lado. Un veredicto `sin-verificar` es un
 * resultado válido y frecuente: que una afirmación no se pueda contrastar no la
 * vuelve falsa, y decir "no lo pudimos comprobar" es más honesto que borrarla.
 * Lo que NO se hace acá es convertir un comentario en una casilla del cuadro: el
 * cuadro sigue midiendo sólo lo que el emisor publica.
 */
export type ClaimVerdict = 'confirmado' | 'matizado' | 'desmentido' | 'sin-verificar'

export interface CommunityClaim {
  id: string
  /** Lo que se dijo, lo más cerca posible de cómo se dijo. */
  said: string
  verdict: ClaimVerdict
  /** Qué encontramos al ir a buscarlo. */
  found: string
  sources: readonly DeliverySource[]
}

export const CLAIM_VERDICT_LABELS: Readonly<Record<ClaimVerdict, string>> = Object.freeze({
  confirmado: 'lo confirma la fuente',
  matizado: 'cierto con un matiz',
  desmentido: 'la fuente dice otra cosa',
  'sin-verificar': 'no lo pudimos verificar',
})

export const CARD_COMMUNITY_CLAIMS: readonly CommunityClaim[] = Object.freeze([
  {
    id: 'brou-avisa-todo',
    said: '«Ahora el BROU anda mandando notificaciones con cada compra.» Y un segundo usuario: «no sólo débito, a mí me notifica la app todas las compras, débito o crédito, tarjeta principal y extensión».',
    verdict: 'confirmado',
    found:
      'Lo dice el propio BROU y es gratis: el buzón de eBROU y el push de la App eBROU avisan por cada compra presencial sin PIN, por cada compra no presencial sin segundo factor y por toda compra rechazada, alcanzando Crédito, Débito y Prepaga, propias y de adicionales. Esta página titulaba antes que «la alerta del BROU es paga» y el encuadre estaba mal: lo pago es el SMS, que agrega las compras autenticadas con PIN o con Visa Secure / MCIDcheck. Corregido el 11/9/2026, que es de donde salió esta sección.',
    sources: [BROU_NOTIF, BROU_SMS],
  },
  {
    id: 'brou-mail-gratis',
    said: '«En el BROU es paga la notificación por celular, pero es gratis la notificación por mail.»',
    verdict: 'desmentido',
    found:
      'Está dado vuelta. El canal gratuito al celular existe y es el push de la App eBROU; el correo electrónico no figura en la letra del servicio, que nombra dos canales y ninguno es mail: «recibas una notificación de la transacción en el buzón de eBROU (aplica para versión Web y para App) y a su vez una PUSH en el celular». Si te llegan correos igual, es algo que BROU no documenta y por eso acá no se cuenta.',
    sources: [BROU_NOTIF],
  },
  {
    id: 'todas-igual-clonables',
    said: '«No creo que una tarjeta en sí sea más clonable que otra, o sea la tecnología que usan es la misma.» Fue el comentario más votado del hilo.',
    verdict: 'matizado',
    found:
      'Del plástico para adentro tiene razón: el chip EMV es el mismo en todas y ninguna se duplica leyéndola. Lo que cambia no es la tarjeta, es el emisor —qué te avisa, qué podés bloquear solo, qué tope podés bajar—, y eso es todo el cuadro de arriba. La única diferencia física que encontramos es de marca y no de banco: la American Express trae el código de seguridad al frente, así que una foto de una sola cara alcanza.',
    sources: [AMEX_CID],
  },
  {
    id: 'amex-un-lado',
    said: '«La Amex tiene todos los códigos del mismo lado de la tarjeta. Con eso te la clonan sacándote una foto al lado tuyo.»',
    verdict: 'confirmado',
    found:
      'American Express lo publica: «El Código de Seguridad de las Tarjetas American Express se encuentra al frente de la tarjeta, tiene 4 dígitos y está ubicado sobre el Número de Tarjeta». Es el diseño de la marca en todo el mundo, no una decisión del emisor local. En Uruguay las Amex las emite Scotiabank.',
    sources: [AMEX_CID, SCOTIA_AMEX],
  },
  {
    id: 'amex-sin-contacto',
    said: '«La Amex no se puede usar por contacto, sólo por chip o banda.»',
    verdict: 'desmentido',
    found:
      'Depende del producto, y en el principal no es así: la ficha de la Tarjeta American Express de Scotiabank lista «Pagos sin contactos» entre sus características. La de Gaviotas American Express no lo menciona, así que la observación puede ser cierta para una tarjeta concreta; como afirmación general sobre la marca, la propia ficha del emisor la contradice.',
    sources: [SCOTIA_AMEX, SCOTIA_AMEX_GAVIOTAS],
  },
  {
    id: 'oca-tope',
    said: '«OCA, al menos con la Blue, no te deja aumentar el tope de uso diario. Me hicieron ir como 3 veces y no pude hacerlo.»',
    verdict: 'confirmado',
    found:
      'Coincide con lo publicado: la cartilla de OCA Blue fija un tope diario de compras locales e internacionales de $ 20.000 y U$S 500, y OCA no documenta ninguna vía para moverlo desde la app ni desde Mi Cuenta. El «aumento de límite» que sí está documentado es el del límite de crédito de la tarjeta de crédito, transitorio por 60 días: otra cosa. Para el titular que quiere gastar más es una molestia; para esta página es un techo que acota cuánto se puede gastar en un día con un número robado, y por eso la casilla de límites pasó de «sin publicar» a «parcial».',
    sources: [OCA_CARTILLA],
  },
  {
    id: 'prex-lo-peor',
    said: '«Prex es de lo peor. Las clonan y hacen estafas a cada rato, al punto que si hacés una transferencia media grande a Prex desde un banco te piden algún tipo de confirmación.»',
    verdict: 'sin-verificar',
    found:
      'La frecuencia no se puede contrastar: no hay estadística pública de fraude por emisor en Uruguay, y tampoco encontramos publicado el requisito extra de confirmación para transferir a Prex. Lo que sí está documentado es de otro tipo: los casos de prensa son tomas de cuenta por phishing —a un exedil le sacaron US$ 3.000 en tres transferencias de Prex a Prex—, no copias del plástico. Importa porque la defensa es distinta: ahí no lo frena el tope ni la billetera, lo frena no entregar el acceso.',
    sources: [PREX_PHISHING],
  },
  {
    id: 'reposicion',
    said: '«Quizás con el BROU sea más tranza resolverlo; con otros bancos la das de baja por teléfono y te mandan la nueva.»',
    verdict: 'sin-verificar',
    found:
      'Es la dimensión que este cuadro no mide y no puede medir con lo publicado: ningún emisor uruguayo dice en cuánto tiempo repone el plástico, ni si el trámite de desconocimiento se hace por la app o en una sucursal. Queda anotado entre los huecos, no disfrazado de casilla.',
    sources: [BROU_FAQ],
  },
])

// ---------------------------------------------------------------------------
// 6. Qué hacer en la primera hora (y de qué depende la plata)
// ---------------------------------------------------------------------------

export interface FirstHourStep {
  id: string
  title: string
  detail: string
  sources: readonly DeliverySource[]
}

export const FIRST_HOUR: readonly FirstHourStep[] = Object.freeze([
  {
    id: 'bloquear',
    title: 'Bloqueá, por el canal más rápido que tengas',
    detail:
      'La app si tu emisor la tiene para eso; si no, el teléfono. El instante del aviso es el que parte la responsabilidad en dos según la Ley 19.731: lo posterior lo paga el emisor salvo que pruebe que fuiste vos.',
    sources: [
      {
        label: 'Ley 19.731, art. 16 — responsabilidad antes y después del aviso',
        url: 'https://www.impo.com.uy/bases/leyes/19731-2018',
        kind: 'norma',
      },
    ],
  },
  {
    id: 'constancia',
    title: 'Pedí la constancia del bloqueo con hora',
    detail:
      'Es el documento que fija ese instante. Sin él, la discusión sobre qué compra entró antes y qué después la gana quien tenga el registro, y ese es el emisor.',
    sources: [
      {
        label: 'RNRCSF art. 364 lit. h — el emisor debe probar la correcta autenticación',
        url: 'https://www.bcu.gub.uy/Servicios-Financieros-SSF/Paginas/Normativa.aspx',
        kind: 'norma',
      },
    ],
  },
  {
    id: 'desconocer',
    title: 'Desconocé cada compra por escrito, una por una',
    detail:
      'Por el canal que deje rastro (la app, el formulario, el correo del banco). El emisor tiene 15 días corridos para contestarte, y el reclamo escrito es lo que hace correr ese plazo.',
    sources: [
      {
        label: 'Qué te tienen que devolver, artículo por artículo',
        url: 'https://cambio-uruguay.com/estafas-uruguay',
        kind: 'norma',
      },
    ],
  },
  {
    id: 'denuncia',
    title: 'Hacé la denuncia, aunque la ley no te la exija para cobrar',
    detail:
      'Varios emisores la piden como condición de trámite: Santander dice que hasta que no la hagas te identifica como titular responsable de las compras. La ley no pone ese requisito para los casos en que el emisor responde, pero la denuncia le saca al trámite la excusa más fácil. Los delitos informáticos se denuncian en delitosinformaticos@policia.gub.uy o al 152 2296, y hay denuncia en línea del Ministerio del Interior.',
    sources: [
      {
        label:
          'Santander — "Hasta que no hagas la denuncia correspondiente el banco te identifica como titular responsable de las compras"',
        url: 'https://www.santander.com.uy/centro-de-ayuda/tarjetas/perdida-o-robo-de-tarjeta',
        kind: 'operador',
      },
      {
        label: 'Ministerio del Interior — Denuncia en línea',
        url: 'https://denuncia.minterior.gub.uy/',
        kind: 'norma',
      },
    ],
  },
  {
    id: 'cerrar-la-puerta',
    title: 'Cerrá la puerta por donde entró',
    detail:
      'El plástico nuevo no arregla nada si el número viejo quedó guardado en las suscripciones de siempre. Cambiá el número en cada servicio y, si tu emisor lo permite, dejá para eso un número que no sea el de tu tarjeta principal.',
    sources: [
      {
        label: 'Reddit: tarjeta nueva, compras ajenas en menos de 24 horas',
        url: 'https://reddit.com/r/uruguay/comments/1u46pgq/tarjeta_clonada_desde_el_propio_banco/',
        kind: 'practica',
      },
    ],
  },
])

// ---------------------------------------------------------------------------
// 7. Lo que no sabemos
// ---------------------------------------------------------------------------

/**
 * Los huecos, publicados. Una página de seguridad que no los declara está
 * vendiendo una sensación de cobertura que no tiene.
 */
export const CARD_SECURITY_GAPS: readonly string[] = Object.freeze([
  'No existe una estadística pública uruguaya de fraude con tarjeta: ni el BCU ni el Ministerio del Interior publican cuántos casos hay por año ni por canal. Todo lo que dice "dominante" o "frecuente" acá sale del corpus de r/uruguay cruzado con lo que el propio emisor describe, y eso son anécdotas ordenadas, no una medición.',
  'El monto que se puede gastar sin PIN en modalidad sin contacto sólo está publicado por BROU, y por producto. El resto de los emisores no lo dice, así que no se puede comparar cuánto expone cada tarjeta si te la roban.',
  'El cuadro mide lo que el emisor PUBLICA. Una app puede tener un control que su sitio no documenta; acá eso queda como "sin publicar" y no como "no tiene".',
  'Ningún emisor publica en cuánto tiempo corta una compra después del bloqueo, que es el dato que decidiría si conviene llamar o bloquear desde la app primero.',
  'Tampoco publican lo de después: en cuántos días llega el plástico nuevo, ni si el desconocimiento se tramita por la app o hay que ir a una sucursal. En el hilo lo plantearon como la diferencia práctica entre un emisor y otro —"con otros bancos la das de baja por teléfono y te mandan la nueva"— y es una dimensión que el cuadro no puede medir sin que el emisor la diga.',
  'No hay estadística pública de fraude POR EMISOR, así que "a este le pasa más" no se puede afirmar ni desmentir. Cuando alguien lo dice, acá queda como "no lo pudimos verificar", que es lo que es.',
])

// ---------------------------------------------------------------------------
// 8. Preguntas que se hacen, contestadas
// ---------------------------------------------------------------------------

export interface CardSecurityFaq {
  id: string
  question: string
  answer: string
}

export const CARD_SECURITY_FAQ: readonly CardSecurityFaq[] = Object.freeze([
  {
    id: 'sirve-la-cinta',
    question: '¿Sirve taparle los números a la tarjeta con cinta negra?',
    answer:
      'No. Quien copia los datos en un mostrador tiene la tarjeta en la mano y la cinta se levanta; y en el resto de los casos el número no sale de tu plástico sino de un comercio donde quedó guardado. Además te deja sin el código que te piden a vos en las compras legítimas y puede dar fallas de lectura. Si lo que te incomoda es el número a la vista, hay emisores que ya lo resolvieron: la prepaga de Mercado Pago se emite sin datos impresos.',
  },
  {
    id: 'como-clonan',
    question: '¿Cómo clonan las tarjetas en Uruguay?',
    answer:
      'En los relatos locales, casi siempre sin clonar nada: se llevan el número, el vencimiento y los tres dígitos del dorso —copiados en un mostrador o filtrados desde un comercio donde la tarjeta quedó guardada— y compran por internet, donde el plástico no hace falta. La copia literal, la de la banda magnética, sobrevive sobre todo en viajes. El chip no se duplica así: responde cada compra con un criptograma distinto.',
  },
  {
    id: 'filtracion-del-banco',
    question: '¿No será que le filtraron los sistemas al banco?',
    answer:
      'Es la explicación más repetida y la que menos respaldo tiene: ninguno de los casos locales identifica una filtración del emisor, y varios se explican con un número que quedó guardado en un comercio. La diferencia es práctica: si el problema fuera del banco no habría nada que hacer de tu lado, y sí lo hay.',
  },
  {
    id: 'sin-apple-pay',
    question: 'Mi banco no tiene Apple Pay. ¿Estoy más expuesto?',
    answer:
      'Un poco, y menos de lo que parece. La billetera evita entregarle el número al comercio en la compra presencial, que es justamente el canal que menos aparece en el fraude local. BROU tiene Google Pay; el hueco es iPhone. Pesa más tener aviso por cada compra y bloqueo desde la app que tener billetera: con esos dos, te enterás mientras pasa y lo cortás en el minuto.',
  },
  {
    id: 'contactless-inseguro',
    question: '¿El sin contacto es más riesgoso que meter la tarjeta?',
    answer:
      'No por la lectura, sí por el monto. Leer el chip a distancia no permite fabricar una copia que funcione. Lo que sí importa es que por debajo de cierto monto no se pide PIN: en la MI BROU, $ 2.000 o U$S 50; en la Tarjeta Joven, $ 1.500 o U$S 30. Si te roban la tarjeta, eso es lo que se puede gastar sin saber nada tuyo, varias veces.',
  },
  {
    id: 'primera-tarjeta',
    question: 'Es mi primera tarjeta de crédito. ¿Qué configuro el primer día?',
    answer:
      'Tres cosas, en este orden: el aviso por cada compra (si tu emisor sólo lo da pago, sabelo antes de decidir), el bloqueo y desbloqueo desde la app, y el tope más bajo que aguantes para compras por internet. Después, si hay billetera, cargala. Y dejá la tarjeta principal fuera de las suscripciones si tenés un número alternativo.',
  },
  {
    id: 'debito-o-credito',
    question: '¿Conviene pagar con débito o con crédito para estar más cubierto?',
    answer:
      'La ley uruguaya no los distingue: la Ley 19.731 pone al débito, al crédito y al dinero electrónico en el mismo pie. La diferencia es de caja, no de derecho: en débito la plata ya salió de tu cuenta mientras se resuelve el reclamo, y en crédito se discute sobre un saldo que todavía no pagaste. Por eso, para internet, una prepaga que cargás al momento acota el daño mejor que cualquiera de las dos.',
  },
  {
    id: 'alerta-paga',
    question: '¿El BROU me avisa de cada compra o hay que pagar por eso?',
    answer:
      'Te avisa gratis, y más de lo que suele creerse. Sin contratar nada llegan al buzón de eBROU y como push a la App eBROU las compras presenciales que no pidieron PIN, las de internet sin segundo factor y todas las rechazadas, en crédito, débito y prepaga, incluidas las de tus adicionales. Lo que agrega el servicio pago de SMS —$ 75 + IVA por 25 mensajes al mes— son justamente las compras autenticadas con tu PIN o con Visa Secure / MCIDcheck. Para que el push llegue hay que habilitarlo una vez: App eBROU › Información Personal › Configurar dispositivos push. El débito Maestro queda afuera del servicio gratuito.',
  },
  {
    id: 'mas-clonable',
    question: '¿Hay tarjetas más clonables que otras? ¿La BROU Recompensa es insegura?',
    answer:
      'El plástico no: el chip EMV es el mismo en todas y ninguna se duplica leyéndola. Lo que cambia es el emisor —si te avisa por cada compra, si la bloqueás y desbloqueás solo, qué tope podés bajar— y eso es lo que compara el cuadro de arriba. La única diferencia física que encontramos es de marca: la American Express lleva el código de seguridad al frente, así que le alcanza una foto de una sola cara. Que una tarjeta aparezca más en los relatos suele decir cuánta gente la usa, no cuán frágil es.',
  },
])
