// Validación ciega del clasificador (2026-09-15): 60 posts y 60 comentarios al azar leídos por
// Claude SIN ver la etiqueta del modelo, comparados después. Se rehace a mano si cambia la rúbrica o
// el modelo; el número va a la página tal cual, con fecha.
export interface ValidationRow {
  n: number;
  relAgreement: number;
  signAgreement: number;
  within1: number;
  kappa4: number;
  bias: number;
}

export interface ValidationSet {
  date: string;
  reader: string;
  posts: ValidationRow;
  comments: ValidationRow;
}

export const VALIDATION: ValidationSet = {
  date: "2026-09-15",
  reader: "Claude (lectura ciega)",
  posts: { n: 60, relAgreement: 0.783, signAgreement: 0.69, within1: 1, kappa4: 0.333, bias: -0.119 },
  comments: { n: 60, relAgreement: 0.667, signAgreement: 0.611, within1: 1, kappa4: 0.249, bias: -0.056 },
};
