// La ventana pasó de ocho horas a una semana, y eso rompe cosas que antes no podían romperse.
//
// Con ocho horas, una sola página de `/new` sobraba, un comentario por corrida era un techo alto, y
// el tope por sub sólo tenía que valer entre corridas porque una corrida escribía una vez. Con una
// semana ninguna de las tres sigue siendo cierta, y las tres fallan del mismo modo silencioso: el
// bot hace algo razonable con datos incompletos y el log se ve normal.
import { describe, expect, it } from "vitest";
import { botConfig, DEFAULT_SUBS } from "../../classes/redditbot/config";
import { runAllowed, subAllowed } from "../../classes/redditbot/limits";
import { screenPost } from "../../classes/redditbot/filter";
import type { LedgerSnapshot } from "../../classes/redditbot/ledger";
import type { RedditPostRaw } from "../../classes/reddit";

const emptySnapshot = (): LedgerSnapshot => ({
  postedLast24h: [],
  lastPostedAt: null,
  recentNegatives: 0,
  pausedUntil: null,
});

const post = (overrides: Partial<RedditPostRaw> = {}): RedditPostRaw =>
  ({
    id: "t3_x",
    sub: "uruguay",
    author: "alguien",
    title: "¿Conviene la cuenta remunerada de Prex o la de Mercado Pago?",
    selftext:
      "Tengo unos pesos parados en la billetera y quiero saber cuál rinde más y si el rendimiento baja.",
    permalink: "/r/uruguay/comments/x/",
    createdUtc: Math.floor(Date.now() / 1000) - 3600,
    locked: false,
    stickied: false,
    over18: false,
    linkFlair: "",
    imageUrl: "",
    ...overrides,
  }) as RedditPostRaw;

describe("ventana de una semana", () => {
  it("el defecto son 168 horas, no 8", () => {
    expect(botConfig().maxAgeHours).toBe(168);
  });

  it("un hilo de anteayer entra; uno de hace diez días no", () => {
    const cfg = botConfig();
    const hoursAgo = (h: number) => Math.floor(Date.now() / 1000) - h * 3600;

    expect(screenPost(post({ createdUtc: hoursAgo(48) }), cfg).ok).toBe(true);
    expect(screenPost(post({ createdUtc: hoursAgo(24 * 10) }), cfg).reason).toBe("too_old");
  });

  it("pide más de una página de /new, porque una semana de r/uruguay no entra en 100 hilos", () => {
    expect(botConfig().fetchPages).toBeGreaterThan(1);
  });

  it("una corrida puede contestar más de un hilo, pero no muchos", () => {
    const max = botConfig().maxRepliesPerRun;
    expect(max).toBeGreaterThan(1);
    // El argumento del radio de daño: el vigilante tiene que poder cortar antes de que una
    // calibración mala produzca un día entero de comentarios.
    expect(max).toBeLessThanOrEqual(5);
  });

  it("el tope por sub cuenta lo que ya se publicó, así que sirve dentro de una misma corrida", () => {
    const cfg = { ...botConfig(), maxPerSubPerDay: 2 };
    const snapshot = emptySnapshot();
    const row = { sub: "uruguay", author: "a", pagePath: "/x", postedAt: new Date() };

    expect(subAllowed(cfg, snapshot, "uruguay").ok).toBe(true);
    snapshot.postedLast24h.push({ ...row }, { ...row });
    expect(subAllowed(cfg, snapshot, "uruguay").reason).toBe("sub_cap");
    // Y es por sub: llenar r/uruguay no calla a r/Burises.
    expect(subAllowed(cfg, snapshot, "Burises").ok).toBe(true);
  });
});

describe("horas de silencio", () => {
  const at = (utcHour: number): number => Date.UTC(2026, 7, 19, utcHour, 30, 0);

  it("no publica de madrugada uruguaya", () => {
    const cfg = { ...botConfig(), enabled: true };
    // 05:30 UTC = 02:30 en Montevideo. Un comentario a esa hora no lo lee nadie y sí lo ve
    // cualquiera que abra el historial de la cuenta.
    expect(runAllowed(cfg, emptySnapshot(), at(5)).reason).toBe("quiet_hours");
    expect(runAllowed(cfg, emptySnapshot(), at(14)).ok).toBe(true);
  });

  it("se puede apagar la puerta con una variable vacía", () => {
    const cfg = { ...botConfig(), enabled: true, quietHoursUtc: [] };
    expect(runAllowed(cfg, emptySnapshot(), at(5)).ok).toBe(true);
  });

  it("el horario se mira antes que los cupos, para no gastar nada de madrugada", () => {
    const cfg = { ...botConfig(), enabled: true, maxPerDay: 0 };
    // Con el cupo diario en cero, ambos motivos aplican; el que contesta dice cuál se evaluó primero.
    expect(runAllowed(cfg, emptySnapshot(), at(5)).reason).toBe("quiet_hours");
  });
});

describe("los subs son los que son", () => {
  it("la lista por defecto es la de los subs uruguayos vivos", () => {
    // Medido contra la API el 2026-08-19: el resto de los candidatos o no existen, o contestan 403,
    // o tienen cero hilos en la semana. Este test es un recordatorio de que la lista corta es una
    // conclusión, no un pendiente.
    expect([...DEFAULT_SUBS]).toEqual([
      "uruguay",
      "Burises",
      "UruguayFinanzas",
      "LegalUruguay",
      "AskUruguayan",
      "monte_video",
      "CharruaDevs",
    ]);
  });
});
