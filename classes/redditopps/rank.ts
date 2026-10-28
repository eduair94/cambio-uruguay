// El orden de la cola: qué hilo conviene contestar primero.
//
// Tres factores y ninguno manda solo:
//  - la CONFIANZA del juez, que es lo que dice que la página contesta;
//  - la FRESCURA: un hilo de hoy lo lee el que preguntó y los que vienen detrás; uno de hace tres
//    semanas, casi sólo Google. Cae con vida media de una semana pero nunca a cero, porque una buena
//    respuesta en un hilo viejo sigue apareciendo en búsquedas;
//  - la VISIBILIDAD: más votos es más gente mirando el hilo. Un hilo de más de 80 comentarios la
//    pierde un poco: la respuesta nueva queda enterrada abajo de todo.

const DAY_MS = 86_400_000;
const HALF_LIFE_DAYS = 7;
const CROWDED_COMMENTS = 80;

export interface RankInput {
  confidence: number;
  createdAt: Date;
  score: number;
  numComments: number;
}

export function rankOf(i: RankInput, now: number): number {
  const ageDays = Math.max(0, (now - i.createdAt.getTime()) / DAY_MS);
  const freshness = 0.35 + 0.65 * 0.5 ** (ageDays / HALF_LIFE_DAYS);
  const visibility = 1 + 0.12 * Math.log1p(Math.max(0, i.score));
  const crowd = i.numComments > CROWDED_COMMENTS ? 0.8 : 1;
  return Math.round(i.confidence * freshness * visibility * crowd * 10_000) / 10_000;
}
