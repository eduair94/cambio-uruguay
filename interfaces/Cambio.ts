interface CambioObj {
  bcu?: string;
  origin?: string;
  code: string;
  type: string;
  name: string;
  buy: number;
  sell: number;
  date?: Date;
  /** Sólo en las filas de hoy: la pizarra lleva días sin cambiar (classes/frozen_marks.ts). */
  frozen?: boolean;
  frozenDays?: number;
}

export { CambioObj };
