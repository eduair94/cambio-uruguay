interface CambioObj {
  bcu?: string;
  origin?: string;
  code: string;
  type: string;
  name: string;
  buy: number;
  sell: number;
  date?: Date;
}

export { CambioObj };
