// app/utils/giftImports.ts
// Catálogo de la guía /recibir-regalos-del-exterior-uruguay: qué traba un obsequio en la Aduana,
// cómo tiene que venir declarado, y las instrucciones bilingües que el lector le pasa a quien se
// lo manda desde afuera.
//
// POR QUÉ VIVE ACÁ: la página sólo renderiza. Las listas son datos con fuente, y el generador de
// instrucciones es una función pura testeable (`app/tests/unit/giftImports.test.ts`).
//
// LAS CIFRAS DEL RÉGIMEN NO SE DUPLICAN ACÁ: salen de `~/utils/importRules` (efectivo-fechadas y
// alimentadas por `/api/aduana`). Este módulo describe conductas y trámites, no montos.
//
// FUENTES PRIMARIAS re-verificadas el 2026-08-09:
//   - Decreto 50/026 art. 3 (obsequios familiares) https://www.impo.com.uy/bases/decretos/50-2026/3
//   - Decreto 50/026 art. 4 (condiciones de la franquicia) https://www.impo.com.uy/bases/decretos/50-2026/4
//   - Ley 20.446 art. 627 https://www.impo.com.uy/bases/leyes/20446-2025/627
//   - DNA, preguntas frecuentes EPI https://www.aduanas.gub.uy/innovaportal/v/28231/1/innova.front/
//   - DNA, mercadería que no puede venir por encomienda
//     https://www.aduanas.gub.uy/innovaportal/v/25107/3/innova.front/que-mercaderia-no-puedo-traer-bajo-el-regimen-de-encomiendas-postales-internacionales.html
//   - DNA, documentación para un envío retenido
//     https://www.aduanas.gub.uy/innovaportal/v/25088/15/innova.front/que-documentacion-debo-presentar-ante-aduana-para-tramitar-un-envio-retenido.html
//   - DNA, registro de identidad digital (RG DNA 10/026) https://www.aduanas.gub.uy/innovaportal/v/28449/1/innova.front/
//   - Correo Uruguayo, objetos prohibidos y restringidos
//     https://www.correo.com.uy/preguntas-frecuentes/-/asset_publisher/ZuxsE4WytQ4A/content/-que-objetos-no-se-pueden-enviar-a-traves-de-correo-uruguayo-
//   - Correo Uruguayo, cómo declarar su compra u obsequio https://www.correo.com.uy/como-declarar-su-compra-u-obsequio
//   - Convenio de la UPU, art. 19 (prohibiciones; la correspondencia entre remitente y destinatario
//     es la excepción admitida) https://www.upu.int/UPU/media/upu/files/aboutUpu/acts/03-actsConventionAndFinalProtocol/conventionAndFinalProtocolAdoptedAtAbidjanEn.pdf

/** Fecha en que las conductas y trámites de este módulo se contrastaron con las fuentes de arriba. */
export const GIFT_RULES_VERIFIED_AT = '2026-08-09'

/**
 * Por qué se traba un paquete. `tier` no es cosmético: ordena la respuesta del lector.
 *  - `prohibido`      no puede viajar / no puede ingresar. No hay trámite que lo arregle.
 *  - `fuera-regimen`  viaja, pero saca al envío del régimen de obsequios y franquicia (IMESI).
 *  - `permiso`        entra, pero necesita un certificado de otro organismo ANTES de retirarlo.
 *  - `tramite`        la mercadería está bien; lo que falla es el dato, el valor o el plazo.
 */
export type GiftBlockerTier = 'prohibido' | 'fuera-regimen' | 'permiso' | 'tramite'

export interface GiftBlocker {
  /** Título corto: el disparador, en las palabras del lector. */
  title: string
  tier: GiftBlockerTier
  /** Qué pasa concretamente si viene así. */
  effect: string
  /** Qué hacer en su lugar. */
  fix: string
  icon: string
}

export interface GiftBlockerGroup {
  tier: GiftBlockerTier
  label: string
  /** Una línea que explica el criterio del grupo. */
  intro: string
  color: string
  icon: string
  items: GiftBlocker[]
}

/**
 * El listado completo. Es deliberadamente exhaustivo: la pregunta que responde la página es "qué
 * puede hacer que me lo retengan", y omitir una categoría es exactamente el daño a evitar.
 *
 * NO ES TAXATIVO, y la página lo dice: la propia DNA aclara que su lista "es de carácter no
 * taxativo" y que todo envío queda sujeto a control aduanero, documental o físico.
 */
export const GIFT_BLOCKER_GROUPS: GiftBlockerGroup[] = [
  {
    tier: 'prohibido',
    label: 'No puede viajar por correo',
    intro:
      'Si va esto adentro, el problema no es el impuesto: el envío puede ser rechazado en origen, devuelto o decomisado.',
    color: 'error',
    icon: 'mdi-close-octagon-outline',
    items: [
      {
        title: 'Baterías de litio',
        tier: 'prohibido',
        effect:
          'El Correo Uruguayo las prohíbe expresamente en envíos internacionales: celulares, notebooks, parlantes inalámbricos, relojes, auriculares, power banks. Es la trampa más común de un regalo tecnológico.',
        fix: 'Si el regalo tiene batería, que vaya por un courier privado, que las transporta con su propio protocolo de mercancías peligrosas — no por correo postal.',
        icon: 'mdi-battery-alert-variant-outline',
      },
      {
        title: 'Aerosoles, inflamables y gases a presión',
        tier: 'prohibido',
        effect:
          'Desodorante en spray, perfume, encendedores, pintura, diluyente, extintores: prohibidos por seguridad aérea, aunque el envase esté vacío.',
        fix: 'Sacalos del paquete. El perfume además está gravado por IMESI, así que acumula dos motivos de rechazo.',
        icon: 'mdi-spray',
      },
      {
        title: 'Vaporizadores y cigarrillos electrónicos',
        tier: 'prohibido',
        effect:
          'Figuran en la lista de mercadería prohibida de la Aduana para encomiendas postales, junto con sus repuestos y líquidos.',
        fix: 'No hay vía postal para esto. Ni como regalo.',
        icon: 'mdi-smoking-off',
      },
      {
        title: 'Armas, municiones, explosivos y pirotecnia',
        tier: 'prohibido',
        effect:
          'Prohibidos, incluidas réplicas y bengalas. Un cuchillo de colección o una navaja también pueden ser rechazados por el operador de origen.',
        fix: 'Descartalo del envío.',
        icon: 'mdi-pistol',
      },
      {
        title: 'Dinero en efectivo, drogas y pornografía',
        tier: 'prohibido',
        effect:
          'Están en la lista de prohibiciones de la Aduana. El efectivo, además, se pierde: no hay reclamo postal que lo cubra.',
        fix: 'Para plata, una transferencia o remesa. Nunca billetes dentro de un paquete.',
        icon: 'mdi-cash-remove',
      },
      {
        title: 'Réplicas y falsificaciones de marca',
        tier: 'prohibido',
        effect:
          'Una cartera o un reloj “réplica” es infracción a la propiedad intelectual: se retiene y no se libera, sea regalo o no.',
        fix: 'Que el regalo sea genuino, aunque sea más barato.',
        icon: 'mdi-shield-alert-outline',
      },
      {
        title: 'Semillas, plantas, flores y alimentos frescos',
        tier: 'prohibido',
        effect:
          'Prohibidos por medidas fitosanitarias. Es el clásico “te mando semillas de la huerta de la abuela” que termina destruido.',
        fix: 'Nada vivo, nada fresco. Los alimentos secos o envasados también pueden requerir permiso del MGAP.',
        icon: 'mdi-sprout-outline',
      },
    ],
  },
  {
    tier: 'fuera-regimen',
    label: 'Saca el envío del régimen de obsequios',
    intro:
      'La mercadería gravada por IMESI está excluida del régimen de envíos postales. Un solo ítem así contamina todo el paquete.',
    color: 'warning',
    icon: 'mdi-alert-outline',
    items: [
      {
        title: 'Perfumería y cosmética',
        tier: 'fuera-regimen',
        effect:
          'Perfumes, maquillaje, cremas: gravados por IMESI y expresamente fuera del régimen. Es la excepción menos intuitiva y la que más regalos traba.',
        fix: 'Si querés que el paquete pase liso, que no lleve cosmética. Ni de muestra.',
        icon: 'mdi-bottle-tonic-outline',
      },
      {
        title: 'Suplementos, vitaminas y bebidas concentradas',
        tier: 'fuera-regimen',
        effect:
          'La Aduana los trata como “bebidas concentradas sin alcohol” gravadas por IMESI: proteína, colágeno, multivitamínicos. Además pueden requerir certificado sanitario.',
        fix: 'Comprarlos acá sale más barato que destrabar el paquete.',
        icon: 'mdi-pill-multiple',
      },
      {
        title: 'Bebidas alcohólicas y tabaco',
        tier: 'fuera-regimen',
        effect: 'IMESI puro. Un vino de regalo no entra por esta vía.',
        fix: 'Si viene alguien de visita, va en la valija bajo la franquicia del viajero, que es otro régimen.',
        icon: 'mdi-glass-wine',
      },
      {
        title: 'Aceites y grasas lubricantes',
        tier: 'fuera-regimen',
        effect: 'También listados como IMESI en la exclusión del régimen postal.',
        fix: 'Fuera del paquete.',
        icon: 'mdi-oil',
      },
    ],
  },
  {
    tier: 'permiso',
    label: 'Entra, pero con permiso de otro organismo',
    intro:
      'La Aduana no libera estas cosas sin el certificado del organismo que las controla. El trámite se hace en la VUCE y lo tenés que iniciar vos, como destinatario.',
    color: 'info',
    icon: 'mdi-file-certificate-outline',
    items: [
      {
        title: 'Equipos con radio: celular, GPS, monitor de bebé, repetidor WiFi',
        tier: 'permiso',
        effect:
          'La URSEC exige certificado de aptitud técnica para equipos de telecomunicaciones: celulares, terminales satelitales, navegadores GPS, teléfonos inalámbricos, equipos de control remoto y monitores de bebés están en su lista.',
        fix: 'Consultá antes en la URSEC. Un regalo tecnológico es el caso donde más conviene preguntar primero.',
        icon: 'mdi-router-wireless',
      },
      {
        title: 'Medicamentos',
        tier: 'permiso',
        effect:
          'Necesitan autorización del MSP para ingresar al país. Sin ese certificado, la encomienda no se libera aunque sea para uso personal.',
        fix: 'Pedí el certificado antes de hacer cualquier trámite en la Aduana; si es un tratamiento, que venga con receta y prospecto.',
        icon: 'mdi-medical-bag',
      },
      {
        title: 'Productos de origen animal o vegetal',
        tier: 'permiso',
        effect:
          'Miel, quesos, embutidos, madera, cuero sin curtir, alimentos: los controla el MGAP y sólo entran los autorizados.',
        fix: 'Mirá la lista del MGAP de qué se puede y qué no se puede traer antes de que lo despachen.',
        icon: 'mdi-leaf',
      },
      {
        title: 'Joyería de oro, plata o piedras',
        tier: 'permiso',
        effect:
          'No está prohibida —se admite con declaración de valor— pero pasa a inspección con mucha más frecuencia que la bijouterie, y su valor pesa contra el tope anual.',
        fix: 'Que venga declarada con su valor real y descripción precisa (metal, peso, piedras). La bijouterie de fantasía no tiene este problema.',
        icon: 'mdi-diamond-stone',
      },
    ],
  },
  {
    tier: 'tramite',
    label: 'La mercadería está bien; falla el dato',
    intro:
      'Estos son los motivos más frecuentes, y los más evitables: la declaración es jurada y la Aduana la contrasta.',
    color: 'primary',
    icon: 'mdi-clipboard-text-outline',
    items: [
      {
        title: 'Descripción genérica del contenido',
        tier: 'tramite',
        effect:
          '“Gift”, “accesorios”, “varios” o “muestra sin valor” no identifican la mercadería. La Aduana pide ampliación o manda el envío a verificación física.',
        fix: 'Detalle por ítem: qué es, de qué material, cuántos y cuánto vale cada uno.',
        icon: 'mdi-text-box-remove-outline',
      },
      {
        title: 'Valor subdeclarado o en cero',
        tier: 'tramite',
        effect:
          'La Aduana puede ajustar el valor cuando hay incoherencia entre lo declarado y la mercadería. Poner “USD 1” para “que no cobren” es lo que dispara la duda razonable.',
        fix: 'Valor realista en dólares, el de mercadería idéntica o similar. El obsequio no paga: no hay nada que ahorrar mintiendo.',
        icon: 'mdi-scale-balance',
      },
      {
        title: 'Nombre o dirección que no coinciden con tu cédula',
        tier: 'tramite',
        effect:
          'Los datos se ingresan tal cual figuran en la cédula. Un apodo, un apellido faltante o la dirección del trabajo dejan el envío sin liberar hasta corregirlo.',
        fix: 'Pasale a quien te lo manda tu nombre completo exacto, la dirección con departamento y código postal, teléfono y correo.',
        icon: 'mdi-card-account-details-outline',
      },
      {
        title: 'Destinatario menor de edad',
        tier: 'tramite',
        effect:
          'La franquicia exige persona física mayor de edad con documento de identidad uruguayo. Un regalo dirigido a un niño no puede usarla, y un menor tampoco puede hacer el trámite.',
        fix: 'Que venga a nombre de un adulto de la casa. El regalo sigue siendo del chiquilín.',
        icon: 'mdi-account-child-outline',
      },
      {
        title: 'Empresa como remitente o destinatario',
        tier: 'tramite',
        effect:
          'El obsequio familiar exige personas físicas de las dos puntas. Si el remitente figura como tienda —porque lo compraron online y lo mandan directo—, no es obsequio: es una compra.',
        fix: 'Que lo despache la persona a su nombre. Si lo manda la tienda, se declara como compra y se rige por la franquicia o el 60%.',
        icon: 'mdi-store-off-outline',
      },
      {
        title: 'Factura comercial adentro del paquete',
        tier: 'tramite',
        effect:
          'Un papel que dice “invoice” contradice la declaración de obsequio y convierte el envío en compra a los ojos del verificador.',
        fix: 'Carta o tarjeta personal, sí. Factura, packing slip o comprobante de compra, no.',
        icon: 'mdi-receipt-text-remove-outline',
      },
      {
        title: 'No declararlo (o declararlo tarde)',
        tier: 'tramite',
        effect:
          'Todo envío salvo la correspondencia se declara. Si no lo hacés, queda retenido y corren costos de depósito y demoras.',
        fix: 'Podés declararlo apenas tenés el tracking, incluso antes de que llegue al país.',
        icon: 'mdi-clock-alert-outline',
      },
      {
        title: 'Pasarte de los topes',
        tier: 'tramite',
        effect:
          'Más de 20 kg, más del tope anual acumulado o un cuarto envío en el año: el obsequio deja de tener franquicia y el envío entero pasa al régimen simplificado.',
        fix: 'Un solo paquete por ocasión y valor declarado dentro del cupo. Consultá tu saldo de franquicias antes.',
        icon: 'mdi-counter',
      },
    ],
  },
]

/** Los campos de la declaración postal (CN22/CN23) que decide el remitente, y cómo llenarlos. */
export interface CustomsFormField {
  field: string
  how: string
  /** Ejemplo de lo que NO sirve. */
  bad?: string
  /** Ejemplo de lo que sí sirve. */
  good?: string
}

export const CUSTOMS_FORM_FIELDS: CustomsFormField[] = [
  {
    field: 'Categoría del envío',
    how: 'Tildar “Regalo / Gift”. Es la casilla que activa el tratamiento de obsequio; si queda en “Venta de mercancías”, es una compra.',
    bad: 'Sale of goods / Commercial sample',
    good: 'Gift',
  },
  {
    field: 'Descripción detallada del contenido',
    how: 'Un renglón por ítem, con material y cantidad. La descripción tiene que permitir identificar la mercadería sin abrir el paquete.',
    bad: 'Gift — accesorios varios',
    good: '2 pares de caravanas de bijouterie (acero) · 1 llavero de metal · 1 tarjeta de cumpleaños',
  },
  {
    field: 'Cantidad y peso por ítem',
    how: 'Unidades y peso neto de cada renglón; el peso total del envío no puede pasar el tope por envío.',
    good: '2 u. — 0,05 kg · 1 u. — 0,03 kg',
  },
  {
    field: 'Valor por ítem y total, en dólares',
    how: 'Valor real de mercadería idéntica o similar. La declaración es jurada y la Aduana puede ajustarla si no cierra.',
    bad: 'USD 1 · “No commercial value”',
    good: 'USD 12 · USD 5 · Total USD 17',
  },
  {
    field: 'País de origen y código SA',
    how: 'Opcional en el CN22, pero acelera la clasificación cuando el operador lo pide.',
    good: 'ES — 7117.19',
  },
  {
    field: 'Remitente',
    how: 'Nombre y apellido de la persona, con su dirección completa. Nunca el nombre de una tienda ni de una empresa.',
    bad: 'AccesoriosOnline S.L.',
    good: 'María Fernández — Calle …, Madrid, España',
  },
  {
    field: 'Destinatario',
    how: 'Tu nombre completo idéntico a la cédula, dirección con departamento y código postal, teléfono y correo electrónico.',
    bad: 'Flor — Pocitos, Mvdeo',
    good: 'Florencia Rodríguez Pérez — Av. …, Montevideo 11300, +598 …',
  },
  {
    field: 'Firma y fecha',
    how: 'Sin firma, el operador de origen puede rechazar el envío en el mostrador.',
  },
]

/** Idiomas en que la página entrega las instrucciones para el remitente. */
export type SenderInstructionsLang = 'es' | 'en'

export interface SenderInstructionsInput {
  lang: SenderInstructionsLang
  /** Tope anual acumulado en dólares (viene de importRules / la API de aduana). */
  franchiseAnnualUsd: number
  /** Máximo de envíos con franquicia por año civil. */
  maxShipments: number
  /** Tope de peso por envío, en kg. */
  maxWeightKg: number
}

/**
 * El texto que el lector le manda a quien le va a despachar el regalo. Es el entregable de la
 * página: quien lo despacha está en otro país, no lee normativa uruguaya y muchas veces no habla
 * español. Todo lo que puede trabar el paquete tiene que estar acá adentro, en diez líneas.
 */
export function buildSenderInstructions(input: SenderInstructionsInput): string {
  const { lang, franchiseAnnualUsd, maxShipments, maxWeightKg } = input

  if (lang === 'en') {
    return [
      'How to send me a gift to Uruguay so customs does not hold it:',
      '',
      '1. Send it as a personal gift, person to person. Sender must be your own full name and home address — never a shop or company name.',
      '2. On the customs form (CN22/CN23), tick "Gift" as the category. Sign and date it.',
      '3. Describe every item in detail, one line each, with material, quantity and value in US dollars. Example: "2 pairs of costume-jewellery earrings (steel) — USD 12", "1 metal keyring — USD 5". Never write only "gift", "accessories" or "no commercial value".',
      `4. Declare a realistic value. Under-declaring is the single most common reason a parcel gets held — and a genuine gift pays no tax anyway, so there is nothing to save.`,
      `5. Keep the parcel under USD ${franchiseAnnualUsd} and under ${maxWeightKg} kg. Send everything in ONE parcel: each parcel uses one of my ${maxShipments} duty-free shipments per calendar year.`,
      '6. Do NOT include: perfume, make-up or any cosmetics; alcohol, tobacco, vitamins or food supplements; food, seeds or plants; anything with a lithium battery (headphones, smartwatch, speakers, power banks); aerosols, lighters or flammable liquids; replicas of branded goods; cash.',
      '7. A handwritten letter or a birthday card inside the parcel is perfectly fine. A commercial invoice or a shop receipt inside is not — it contradicts the gift declaration.',
      '8. Write my details exactly as they appear on my ID document: full name, street address, city, postcode, phone and e-mail.',
      '9. If the gift is for a child, still address it to an adult — a minor cannot clear it.',
      '10. Send me a photo of the customs form and the tracking number as soon as you have them.',
    ].join('\n')
  }

  return [
    'Cómo mandarme un regalo a Uruguay para que la aduana no lo trabe:',
    '',
    '1. Mandalo como obsequio personal, de persona a persona. El remitente tiene que ser tu nombre completo y tu domicilio — nunca el nombre de una tienda ni de una empresa.',
    '2. En la declaración postal (CN22/CN23), tildá la categoría “Regalo / Gift”. Firmala y fechala.',
    '3. Describí cada cosa en detalle, un renglón por ítem, con material, cantidad y valor en dólares. Ejemplo: “2 pares de caravanas de bijouterie (acero) — USD 12”, “1 llavero de metal — USD 5”. Nunca pongas sólo “regalo”, “accesorios” o “sin valor comercial”.',
    '4. Declará un valor realista. Subdeclarar es el motivo más común de retención — y un obsequio genuino no paga tributos, así que no hay nada que ahorrar.',
    `5. Que el paquete quede por debajo de USD ${franchiseAnnualUsd} y de ${maxWeightKg} kg. Mandá todo en UN solo paquete: cada paquete consume uno de mis ${maxShipments} envíos con franquicia del año.`,
    '6. NO incluyas: perfume, maquillaje ni cosmética; alcohol, tabaco, vitaminas ni suplementos; alimentos, semillas ni plantas; nada con batería de litio (auriculares, smartwatch, parlantes, power banks); aerosoles, encendedores ni líquidos inflamables; réplicas de marcas; dinero en efectivo.',
    '7. Una carta manuscrita o una tarjeta adentro del paquete no es problema. Una factura o un ticket de compra adentro sí lo es: contradice la declaración de obsequio.',
    '8. Poné mis datos exactamente como figuran en mi cédula: nombre completo, dirección, ciudad, código postal, teléfono y correo.',
    '9. Si el regalo es para un niño, mandalo igual a nombre de un adulto — un menor no puede hacer el trámite.',
    '10. Mandame una foto de la declaración postal y el número de seguimiento apenas los tengas.',
  ].join('\n')
}

export interface GiftSource {
  /** Organismo o norma, para que la lista se lea por autoridad y no por URL. */
  org: string
  label: string
  url: string
}

export const GIFT_SOURCES: GiftSource[] = [
  {
    org: 'IMPO',
    label:
      'Decreto 50/026, art. 3 — los envíos con obsequios familiares cuentan con franquicia y quedan exentos de todo tributo',
    url: 'https://www.impo.com.uy/bases/decretos/50-2026/3',
  },
  {
    org: 'IMPO',
    label:
      'Decreto 50/026, art. 4 — condiciones de la franquicia: mayor de edad con documento uruguayo, uso personal, tres veces por año civil',
    url: 'https://www.impo.com.uy/bases/decretos/50-2026/4',
  },
  {
    org: 'IMPO',
    label:
      'Ley 20.446, art. 627 — régimen simplificado: 60% del valor con un mínimo de USD 20 por envío',
    url: 'https://www.impo.com.uy/bases/leyes/20446-2025/627',
  },
  {
    org: 'Aduana (DNA)',
    label:
      'Preguntas frecuentes de envíos postales internacionales — declaración jurada, control documental o físico, plazos de abandono',
    url: 'https://www.aduanas.gub.uy/innovaportal/v/28231/1/innova.front/',
  },
  {
    org: 'Aduana (DNA)',
    label:
      'Qué mercadería no puede venir por encomienda postal — IMESI y mercadería prohibida (lista no taxativa)',
    url: 'https://www.aduanas.gub.uy/innovaportal/v/25107/3/innova.front/que-mercaderia-no-puedo-traer-bajo-el-regimen-de-encomiendas-postales-internacionales.html',
  },
  {
    org: 'Aduana (DNA)',
    label:
      'Qué documentación presentar por un envío retenido — incluye la declaración de valor cuando se trata de un obsequio',
    url: 'https://www.aduanas.gub.uy/innovaportal/v/25088/15/innova.front/que-documentacion-debo-presentar-ante-aduana-para-tramitar-un-envio-retenido.html',
  },
  {
    org: 'Aduana (DNA)',
    label: 'Registro de identidad digital para envíos postales (RG DNA 10/026) y formulario',
    url: 'https://www.aduanas.gub.uy/innovaportal/v/28449/1/innova.front/',
  },
  {
    org: 'Aduana (DNA)',
    label:
      'Consulta de franquicias utilizadas — cuántos envíos y cuántos dólares te quedan en el año',
    url: 'https://www.aduanas.gub.uy/innovaportal/v/28224/1/innova.front/',
  },
  {
    org: 'Correo Uruguayo',
    label:
      'Cómo declarar su compra u obsequio — plataforma Ahíva, declaración de valor e imagen del contenido',
    url: 'https://www.correo.com.uy/como-declarar-su-compra-u-obsequio',
  },
  {
    org: 'Correo Uruguayo',
    label:
      'Qué objetos y productos se prohíbe enviar por correo — baterías de litio, aerosoles, IMESI, productos de origen animal y vegetal',
    url: 'https://www.correo.com.uy/preguntas-frecuentes/-/asset_publisher/ZuxsE4WytQ4A/content/-que-objetos-no-se-pueden-enviar-a-traves-de-correo-uruguayo-',
  },
  {
    org: 'Correo Uruguayo',
    label:
      'En qué casos se recibe un envío postal sin pagar IVA — acuerdo comercial y obsequio familiar',
    url: 'https://www.correo.com.uy/sobre-encomiendas-internacionales/-/asset_publisher/aA3CAHonsnAs/content/-cuantos-envios-postales-internacionales-puedo-recibir-sin-pagar-impuestos-franquicia-',
  },
  {
    org: 'Correo Uruguayo',
    label: 'Gestoría para envíos que requieren verificación ante Aduana — costo, agenda y plazos',
    url: 'https://www.correo.com.uy/noticias/-/asset_publisher/x68NfmqmDEKm/content/correo-uruguayo-servicio-gestoria-envios-internacionales-verificacion-aduanas',
  },
  {
    org: 'MEF',
    label: 'Guía de preguntas frecuentes del régimen de envíos postales y franquicias',
    url: 'https://www.gub.uy/ministerio-economia-finanzas/comunicacion/noticias/guia-preguntas-frecuentes-sobre-regimen-envios-postales-franquicias',
  },
  {
    org: 'MGAP',
    label:
      'Qué se puede y qué no se puede traer a Uruguay — control de productos de origen animal y vegetal',
    url: 'https://www.gub.uy/ministerio-ganaderia-agricultura-pesca/politicas-y-gestion/se-puede-no-se-puede-traer-uruguay',
  },
  {
    org: 'VUCE',
    label:
      'Ventanilla Única de Comercio Exterior — donde se piden los certificados de MSP, MGAP y URSEC',
    url: 'https://vuce.gub.uy/',
  },
  {
    org: 'UPU',
    label:
      'Convenio Postal Universal, art. 19 — sólo se prohíbe la correspondencia entre personas distintas del remitente y el destinatario: la carta para vos está admitida',
    url: 'https://www.upu.int/UPU/media/upu/files/aboutUpu/acts/03-actsConventionAndFinalProtocol/conventionAndFinalProtocolAdoptedAtAbidjanEn.pdf',
  },
]
