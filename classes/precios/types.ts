// El dominio del pipeline de precios del SIPC.
export type PrecioUnit = "ml" | "l" | "g" | "kg" | "un";

/** Una fila tal como la devuelve `compararArticulo`. */
export interface PrecioRawRow {
  id: number;
  precio: string;
  fecha: string;
  name: string;
  direccion: string;
  x: number | null;
  y: number | null;
  localidad: string;
  tel?: string;
  web?: string;
  css?: string;
  marker?: string;
  imagen?: string | null;
}

export interface PrecioArticle {
  id: number;
  name: string;
  group: string;
  variant: string;
  unitRaw: string;
  qty: number | null;
  unit: PrecioUnit | null;
  image: string | null;
}

export interface PrecioStore {
  id: number;
  name: string;
  chain: string;
  branch: string;
  address: string;
  lat: number | null;
  lon: number | null;
  locality: string;
  department: string;
  phone: string;
  web: string;
}

export interface PrecioObservation {
  articleId: number;
  /** null cuando la fila no se pudo unir a ningún local del catálogo. */
  storeId: number | null;
  /** El `id` de la fila de precio, que es la clave de la DECLARACIÓN, no del local. */
  declarationId: number;
  price: number;
  /** Día que declara el origen, en ISO. Es el eje de frescura. */
  sourceDay: string;
  storeName: string;
  address: string;
  lat: number | null;
  lon: number | null;
}
