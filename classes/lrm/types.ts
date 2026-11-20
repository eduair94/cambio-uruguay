// Letras de Regulación Monetaria (LRM) del BCU: la foto que lee
// /letras-de-regulacion-monetaria-uruguay.
//
// Todo sale de dos archivos OFICIALES del BCU, ninguno de ellos una noticia ni una búsqueda:
//
//   1. «Operaciones BCU y MEF local.xlsx» — la planilla con TODAS las licitaciones de LRM desde el
//      1/1/2019 (hoja «LRM») y las de Notas del Tesoro del MEF (hoja «NT MEF»), una fila por
//      licitación, con su tasa de corte. La sirve la biblioteca «Emisiones BCU» de la página
//      «Instrumentos emitidos por el BCU y el Gobierno Central».
//   2. «calendario_deuda.pdf» — el calendario TENTATIVO de las licitaciones de las próximas dos
//      semanas, que el BCU reemplaza cada viernes.
//
// Es un CACHÉ y no un archivo: la planilla trae la historia entera en cada descarga, así que una
// corrida fallida puede dejar servir la foto anterior sin perder nada.

/** Las dos URL oficiales. Si el BCU las mueve, el job falla fuerte y la foto anterior sigue. */
export const LRM_OPERATIONS_URL =
  "https://www.bcu.gub.uy/Politica-Economica-y-Mercados/Emisiones%20BCU/Operaciones%20BCU%20y%20MEF%20local.xlsx";
export const LRM_CALENDAR_URL =
  "https://www.bcu.gub.uy/Politica-Economica-y-Mercados/Calendario%20Deuda/calendario_deuda.pdf";
/** La página que enlaza las dos, para que el lector pueda ir a mirar la fuente con sus ojos. */
export const LRM_SOURCE_PAGE_URL =
  "https://www.bcu.gub.uy/Politica-Economica-y-Mercados/Paginas/Instrumentos-emitidos-por-el-BCU-y-el-Gobierno-Central.aspx";

/** El único documento de la colección `lrmsnapshots`. */
export const LRM_KEY = "uy";

/** Plazos de referencia con los que el BCU agrupa sus licitaciones (columna «Plazo ref.»). */
export const LRM_TERM_REFS = [30, 90, 180, 360, 720] as const;
export type LrmTermRef = (typeof LRM_TERM_REFS)[number];

/** Una licitación de LRM, tal como la publica la hoja «LRM» de la planilla. */
export interface LrmAuction {
  /** Fecha de la licitación (ISO, día de calendario). */
  date: string;
  /** Fecha de liquidación: el día que se paga y empieza a correr el plazo. */
  settlement: string;
  /** Vencimiento. */
  maturity: string;
  /** «Serie/Venta» tal cual, p. ej. "13842-2" (serie 13842, segunda venta). */
  series: string;
  /** Plazo REAL en días (la columna «Plazo»). */
  days: number;
  /** Plazo de referencia (30/90/180/360/720), la columna «Plazo ref.». */
  termRef: LrmTermRef;
  /** Monto licitado en total, en millones de pesos. */
  auctioned: number;
  /** Monto adjudicado en total, en millones de pesos. */
  awarded: number;
  /** Tasa de corte en porcentaje efectivo anual, dos decimales (6.2 = 6,20 %). */
  cutRate: number;
}

/** Una licitación de Notas del Tesoro (MEF) en el mercado local, de la hoja «NT MEF». */
export interface TreasuryAuction {
  date: string;
  /** «Serie» y «Venta» unidas, p. ej. "13-10". */
  series: string;
  currency: "UYU" | "UI" | "UP";
  /** Cupón anual en porcentaje. */
  coupon: number;
  maturity: string;
  /** «Plazo original (años)», un decimal. */
  years: number;
  /** Adjudicado en millones de la moneda de origen. */
  awarded: number;
  /** TIR de corte en porcentaje, dos decimales. En UI/UP es tasa REAL (por encima de la inflación). */
  yield: number;
}

/** Una licitación anunciada en el calendario tentativo. */
export interface LrmUpcoming {
  date: string;
  settlement: string;
  maturity: string;
  /** "13846-1". */
  series: string;
  days: number;
  /** Monto a licitar en el tramo competitivo, millones de pesos. */
  amount: number;
  /** Monto del tramo no competitivo, millones de pesos. */
  nonCompetitive: number;
  /** Hora de cierre, "14:00". */
  hour: string;
}

export interface LrmCalendar {
  /** Primer y último día que cubre el calendario. */
  from: string;
  to: string;
  /** Día en que el BCU lo publicó (pie del PDF), si se pudo leer. */
  publishedOn: string | null;
  items: LrmUpcoming[];
}

export interface LrmSnapshot {
  key: string;
  /** Cuándo corrió el job que escribió esta foto. */
  capturedAt: Date;
  sources: {
    operationsUrl: string;
    /** Cabecera Last-Modified de la planilla, si vino. */
    operationsModified: string | null;
    calendarUrl: string;
    pageUrl: string;
  };
  /** La licitación más reciente de cada plazo de referencia que tuvo alguna en el último año. */
  latest: LrmAuction[];
  /** Todas las licitaciones de los últimos 400 días, de la más nueva a la más vieja. */
  recent: LrmAuction[];
  /** La última licitación de Notas del Tesoro en cada moneda (pesos, UI, UP). */
  treasury: TreasuryAuction[];
  /** El calendario tentativo vigente, o el de la foto anterior si esta vez no se pudo leer. */
  calendar: LrmCalendar | null;
  counts: {
    /** Licitaciones de LRM con tasa de corte válida en toda la planilla. */
    auctions: number;
    /** Filas descartadas por la guarda de plausibilidad. */
    rejected: number;
  };
}
