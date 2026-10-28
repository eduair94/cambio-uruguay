// Los subreddits que lee la cola de /oportunidades-reddit.
//
// MEDIDO el 2026-10-28 con la API (hilos publicados en 30 días): r/uruguay 767, r/monte_video ≥1000
// (el listado de Reddit corta en 1000, ≈28,6 días), r/Uruguay_nomas 439, r/Burises 321,
// r/CharruaDevs 177, r/AskUruguayan 101, r/AutosUy 81, r/Uruguay_Mujeres 75, r/LegalUruguay 64,
// r/UruguayMarketplace 22, r/MadeInUruguay 18.
//
// Más larga que `DEFAULT_SUBS` del bot (`classes/redditbot/config.ts`) a propósito: aquella lista es
// "dónde puede ESCRIBIR una cuenta automatizada"; ésta es "dónde hay alguien preguntando", y quien
// contesta es una persona. Las reglas de cada sub viajan en el aviso de la card, no acá.
//
// Afuera, medidos el mismo día: r/Montevideo y r/UruguayNomas contestan 403 (privados),
// r/UruguayFinanzas es `restricted` con cero hilos, y r/UruguayInversiones, r/inversiones_uy,
// r/UruguayCrypto, r/CryptoUruguay, r/PiquesUy y r/startupsUruguay tuvieron CERO hilos en 30 días.
// Agregarlos sólo suma llamadas que vuelven vacías.
import "dotenv/config";

export const OPPS_SUBS: readonly string[] = Object.freeze([
  "uruguay",
  "monte_video",
  "Uruguay_nomas",
  "Burises",
  "CharruaDevs",
  "AskUruguayan",
  "AutosUy",
  "Uruguay_Mujeres",
  "LegalUruguay",
  "UruguayMarketplace",
  "MadeInUruguay",
]);

/** Ventana de la cola: lo que pasa de acá no se sugiere. */
export const OPPS_WINDOW_DAYS = 30;
/** Lo que pasa de acá se borra de la base (un margen sobre la ventana para no re-juzgar el borde). */
export const OPPS_PRUNE_DAYS = 35;

/** `REDDIT_OPPS_SUBS=a,b,c` reemplaza la lista. Leído al llamar, nunca al importar. */
export function oppsSubs(): string[] {
  const raw = (process.env.REDDIT_OPPS_SUBS || "").trim();
  if (!raw) return [...OPPS_SUBS];
  return raw
    .split(",")
    .map((s) => s.trim().replace(/^r\//i, ""))
    .filter(Boolean);
}
