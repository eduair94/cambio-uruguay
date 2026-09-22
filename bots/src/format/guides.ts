// La "guía del día" del resumen diario de Telegram/Discord.
//
// POR QUÉ ES UN CATÁLOGO APARTE Y NO `CONTENT_PROMOS`: son dos canales con dos
// presupuestos y dos colas. El tuit tiene 280 caracteres con el link a costo fijo
// de t.co; acá el bloque entra en el CAPTION de una foto de Telegram, que
// termina en 1024 y ya lo comparten el titular, las monedas, el resumen de la IA
// y las noticias. Y si los dos trabajos marcaran la misma colección de "último
// posteo", el que sale por Telegram empujaría al fondo de la cola de X la página
// que acaba de usar, y al revés (ver `store/guide_state.ts`).
//
// REGLA PARA AGREGAR UN GANCHO (la misma de `promos.ts`, más corta): tiene que
// ser un MECANISMO que la guía realmente explica, y estable — sin cifras, sin
// nombres de mes, sin artículos de ley con número. Esto sale todos los días bajo
// el nombre del sitio y no se puede editar después; un número que envejece es
// un número público equivocado. Entre 60 y 140 caracteres, y en el peor idioma
// (la etiqueta inglesa es la más larga) el bloque entero con la URL tiene que
// caber en `TG_GUIDE_RESERVE`: los tests lo miden entrada por entrada, así que
// un slug largo obliga a un gancho más corto.
//
// Las 25 entradas cubren deudas, vivienda, trabajo, importación y pagos, que
// son las familias de guías que la gente comparte; las guías de cotización ya
// las cubre el propio resumen.

export interface DailyGuide {
  /** Ruta del sitio, sin prefijo de idioma ni barra final. Tiene que existir en `app/utils/guides*.ts`. */
  slug: string;
  /** El gancho: una o dos frases en español rioplatense, sin hype ni cifras. */
  hook: string;
}

export const DAILY_GUIDES: readonly DailyGuide[] = Object.freeze([
  // --- deudas ---
  {
    slug: "/guias/cuando-prescribe-una-deuda-uruguay",
    hook: "Una deuda prescripta no se borra sola: hay que oponerla, y pagar una cuota vieja reinicia el reloj.",
  },
  {
    slug: "/guias/cancelar-prestamo-antes-de-tiempo-uruguay",
    hook: "Cancelar un préstamo antes no es un derecho: manda tu contrato, salvo el hipotecario de vivienda.",
  },
  {
    slug: "/guias/me-compraron-la-deuda-uruguay",
    hook: "Vender tu deuda no necesita tu permiso, pero sí notificarte con el título: hasta entonces le pagás al banco.",
  },
  {
    slug: "/guias/saldo-a-favor-tarjeta-de-credito-uruguay",
    hook: "Pagar la tarjeta antes del cierre queda a favor: el débito automático cobra igual lo del cierre.",
  },
  {
    slug: "/guias/estudio-de-cobranza-uruguay",
    hook: "Un estudio de cobranza no puede retenerte el sueldo por su cuenta: las retenciones están tasadas por ley.",
  },
  {
    slug: "/guias/ser-garante-o-codeudor-riesgos-uruguay",
    hook: "Fiador solidario es renunciar a que le cobren primero al deudor: te pueden reclamar el total a vos.",
  },
  {
    slug: "/guias/las-deudas-se-heredan-uruguay",
    hook: "Se hereda el patrimonio entero, deudas incluidas: el beneficio de inventario limita tu respuesta a los bienes.",
  },
  {
    slug: "/guias/entender-tea-tna-y-cft",
    hook: "La cuota chica casi siempre esconde un plazo largo: comparás créditos por costo total y monto final, no por la cuota.",
  },
  // --- vivienda ---
  {
    slug: "/guias/garantias-de-alquiler-uruguay",
    hook: "Garantía y depósito no son lo mismo: una la emite un tercero que cobra por el riesgo; el otro es plata tuya.",
  },
  {
    slug: "/guias/deposito-de-alquiler-uruguay",
    hook: "El depósito es tuyo: sólo se descuentan deudas y daños más allá del desgaste normal; el inventario es tu defensa.",
  },
  {
    slug: "/guias/como-rescindir-contrato-alquiler-uruguay",
    hook: "Rescindir un alquiler por WhatsApp no prueba nada: el preaviso corre desde el telegrama colacionado.",
  },
  {
    slug: "/guias/comision-inmobiliaria-uruguay",
    hook: "Ninguna ley fija la comisión inmobiliaria: el porcentaje que todos repiten es un arancel privado, y se negocia.",
  },
  {
    slug: "/guias/costos-de-escrituracion-uruguay",
    hook: "El ITP no se calcula sobre el precio de venta sino sobre el valor real de Catastro, y lo pagan las dos partes.",
  },
  {
    slug: "/guias/promesa-de-compraventa-uruguay",
    hook: "Pagar la seña sin promesa ni estudio de título es el error más caro: inscribir la promesa te protege.",
  },
  {
    slug: "/guias/derechos-posesorios-uruguay",
    hook: "Comprar derechos posesorios no te hace dueño: podés sumar los años de quien te cede, pero titulás sólo por juicio.",
  },
  // --- trabajo ---
  {
    slug: "/guias/despido-y-liquidacion-uruguay",
    hook: "La base del despido no es el nominal a secas: entran todas las partidas salariales habituales, promediadas.",
  },
  {
    slug: "/guias/horas-extra-en-uruguay",
    hook: "Las horas extra se pagan aunque nadie las autorizara por escrito: alcanza con que la empresa las tolerara.",
  },
  {
    slug: "/guias/me-certifique-subsidio-por-enfermedad-uruguay",
    hook: "Certificado te paga el BPS, no la empresa, y recién desde el cuarto día salvo internación.",
  },
  {
    slug: "/guias/feriados-en-uruguay-como-se-pagan",
    hook: "Sólo cinco feriados se pagan doble: Carnaval y Semana de Turismo son comunes y trabajarlos no suma nada.",
  },
  {
    slug: "/guias/me-quede-sin-trabajo-mutualista-fonasa-uruguay",
    hook: "Sin trabajo no perdés el Fonasa ese día: llega a fin de mes, y tus hijos lo conservan un año.",
  },
  {
    slug: "/guias/pedir-que-me-despidan-uruguay",
    hook: "El seguro de paro exige desocupación forzosa: un despido arreglado con la empresa puede dejarte sin subsidio.",
  },
  {
    slug: "/guias/me-deben-el-sueldo-uruguay",
    hook: "El sueldo impago genera un recargo automático sin intimar, y la conciliación en el MTSS frena la prescripción.",
  },
  // --- importación ---
  {
    slug: "/guias/impuesto-temu-uruguay",
    hook: "El impuesto Temu no lo cobra Temu: lo liquida el correo o el courier, que retiene el paquete hasta que pagues el IVA.",
  },
  {
    slug: "/guias/importar-de-aliexpress-a-uruguay",
    hook: "AliExpress parte tu carrito en varios paquetes, y cada tracking es una declaración con su propio mínimo.",
  },
  // --- pagos ---
  {
    slug: "/guias/transferencia-a-cuenta-equivocada-uruguay",
    hook: "El banco no revierte la transferencia solo: le pide al receptor que autorice; si no, va a juicio.",
  },
]);

/** URL canónica de la guía. Tolera la barra final de `SITE_BASE_URL`, como `promos.ts`. */
export function guideUrl(guide: DailyGuide, siteBaseUrl: string): string {
  return `${siteBaseUrl.replace(/\/+$/, "")}${guide.slug}`;
}

/**
 * El bloque que se pega al cuerpo del resumen diario, con el salto de línea
 * doble que lo separa del párrafo anterior incluido, para que `formatDailyTelegram`
 * reste su largo REAL del presupuesto. Va con Markdown legado de Telegram (`*…*`),
 * así que el gancho no puede traer `* _ [ ] ( )` sin balancear: el catálogo se
 * testea por eso, porque un delimitador suelto devuelve 400 y tumba el posteo.
 */
export function formatDailyGuide(guide: DailyGuide, siteBaseUrl: string, label: string): string {
  return `\n\n📘 *${label}*: ${guide.hook}\n${guideUrl(guide, siteBaseUrl)}`;
}
