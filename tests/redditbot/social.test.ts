// El pase de comentarios comunes: a qué hilo entra y qué texto se deja publicar.
//
// Las dos listas que importan acá no son de estilo. `screenSocialPost` decide dónde NO se hace un
// chiste, y `validateSocial` decide qué no sale nunca de la cuenta. Un error en cualquiera de las
// dos no se ve en un log: se ve en el hilo de alguien que acaba de perder a un familiar.
import { describe, expect, it } from "vitest";
import type { RedditPostRaw } from "../../classes/reddit";
import { socialConfig } from "../../classes/redditbot/social/config";
import { newestFirst, screenSocialPost } from "../../classes/redditbot/social/pick";
import { socialRetryHint, validateSocial } from "../../classes/redditbot/social/validate";
import { authorAllowed, runAllowed, subAllowed } from "../../classes/redditbot/social/limits";

const NOW = Date.UTC(2026, 7, 18, 12, 0, 0);
const cfg = { ...socialConfig(), minAgeMinutes: 12, maxAgeMinutes: 240 };

const post = (over: Partial<RedditPostRaw> = {}): RedditPostRaw => ({
  id: "abc123",
  sub: "uruguay",
  title: "¿Cuál es el mejor lugar para ver el atardecer en Montevideo?",
  selftext: "Vienen unos amigos de afuera el finde y quiero llevarlos a algún lado que valga la pena.",
  author: "alguien",
  score: 8,
  numComments: 4,
  permalink: "https://reddit.com/r/uruguay/comments/abc123/x",
  createdUtc: (NOW - 40 * 60 * 1000) / 1000,
  url: "",
  over18: false,
  locked: false,
  stickied: false,
  isSelf: true,
  linkFlair: "",
  ...over,
});

describe("social/pick — dónde se puede comentar", () => {
  it("entra en un hilo liviano y nuevo", () => {
    expect(screenSocialPost(post(), cfg, NOW).ok).toBe(true);
  });

  it("no toca un hilo de plata: es material del bot de respuestas", () => {
    // Comentar un chiste acá significa que cuando exista la página para contestarlo, el hilo ya
    // tiene nuestro comentario tonto arriba y la cuenta no puede volver a hablar.
    const money = post({
      title: "¿Cuánto se paga de aduana por una notebook?",
      selftext: "Quiero traer una de Estados Unidos y no sé cuánto termino pagando de impuestos.",
    });
    expect(screenSocialPost(money, cfg, NOW).reason).toBe("our_topic");
  });

  it("reconoce el tema de plata aunque el otro bot descarte el hilo por otro motivo", () => {
    // El bug que este test previene: screenPost devuelve UN motivo, y para un desahogo sobre el
    // dólar devuelve "not_a_question" — no "off_topic". Preguntarle a él si el hilo es nuestro y
    // leer cualquier rechazo como "no es nuestro tema" deja un chiste sobre un hilo de plata, que
    // es donde después queremos contestar en serio.
    const desahogo = post({
      title: "El dólar subió otra vez y ya no se puede vivir",
      selftext: "Nada, era eso. Cada vez que voy al súper con pesos me alcanza para menos.",
    });
    expect(screenSocialPost(desahogo, cfg, NOW).reason).toBe("our_topic");
  });

  it("se calla en hilos donde una ocurrencia es una falta de respeto", () => {
    for (const [title, body] of [
      ["Falleció mi abuela y no sé cómo seguir", "Estoy muy mal, era la persona que me crió."],
      ["Me diagnosticaron algo serio", "Mañana entro al hospital y tengo miedo."],
      ["Denuncia por acoso en el trabajo", "Quiero contar lo que me pasó a ver si le sirve a alguien."],
      ["¿Qué opinan de las elecciones?", "Me parece que la campaña se está poniendo pesada, opiniones."],
    ] as const) {
      expect(screenSocialPost(post({ title, selftext: body }), cfg, NOW).reason, title).toBe("no_jokes");
    }
  });

  it("tampoco opina de seguridad pública, que acá no es un tema sino una grieta", () => {
    // Del primer ensayo real: eligió un hilo sobre 100 policías más y escribió algo sobrio que
    // igual era una opinión sobre política de seguridad. Sobrio no alcanza cuando el tema divide.
    const seguridad = post({
      title: "Mandan 100 policías más a la zona",
      selftext: "Lo anunciaron ayer, veremos si se nota en el barrio o queda en la nada.",
    });
    expect(screenSocialPost(seguridad, cfg, NOW).reason).toBe("no_jokes");
  });

  it("respeta la ventana: ni recién publicado ni de anteayer", () => {
    expect(screenSocialPost(post({ createdUtc: (NOW - 60 * 1000) / 1000 }), cfg, NOW).reason).toBe("too_new");
    expect(screenSocialPost(post({ createdUtc: (NOW - 20 * 60 * 60 * 1000) / 1000 }), cfg, NOW).reason).toBe("too_old");
  });

  it("no se suma a un hilo lleno ni a uno que el sub está enterrando", () => {
    expect(screenSocialPost(post({ numComments: 90 }), cfg, NOW).reason).toBe("crowded");
    expect(screenSocialPost(post({ score: 0 }), cfg, NOW).reason).toBe("downvoted");
  });

  it("no comenta links externos, que es por donde entra la política", () => {
    expect(screenSocialPost(post({ isSelf: false }), cfg, NOW).reason).toBe("link_post");
    // Una foto sí: hay algo de la persona a lo que responder.
    expect(screenSocialPost(post({ isSelf: false, imageUrl: "https://i.redd.it/x.png" }), cfg, NOW).ok).toBe(true);
  });

  it("salta lo bloqueado, lo fijado y lo NSFW", () => {
    expect(screenSocialPost(post({ locked: true }), cfg, NOW).reason).toBe("locked");
    expect(screenSocialPost(post({ stickied: true }), cfg, NOW).reason).toBe("stickied");
    expect(screenSocialPost(post({ over18: true }), cfg, NOW).reason).toBe("nsfw");
    expect(screenSocialPost(post({ author: "AutoModerator" }), cfg, NOW).reason).toBe("deleted_author");
  });

  it("ordena por reloj, más nuevo primero", () => {
    const viejo = post({ id: "viejo", createdUtc: 1000 });
    const nuevo = post({ id: "nuevo", createdUtc: 9000 });
    expect(newestFirst([viejo, nuevo]).map((p) => p.id)).toEqual(["nuevo", "viejo"]);
  });
});

describe("social/validate — qué texto sale de la cuenta", () => {
  const contexto = "¿Cuál es el mejor lugar para ver el atardecer en Montevideo? Vienen amigos el finde.";

  it("deja pasar un comentario corto y de vos", () => {
    expect(validateSocial("Llevalos al Cerro un rato antes de que baje el sol, la vista de la bahía los mata.", contexto).ok).toBe(true);
  });

  it("rechaza cualquier enlace, que es el punto entero de este pase", () => {
    const con = validateSocial("Mirá la rambla de Punta Carretas, tenés todo acá https://cambio-uruguay.com", contexto);
    expect(con.reason).toBe("has_link");
  });

  it("rechaza mencionar el sitio aunque no haya enlace", () => {
    expect(validateSocial("Fijate que en cambio uruguay tienen una nota sobre eso, está buena.", contexto).reason).toBe("mentions_site");
  });

  it("rechaza el tuteo, que es el delator más confiable", () => {
    expect(validateSocial("Puedes ir a la rambla de Malvín, a esa hora queda preciosa la vista.", contexto).reason).toBe("tuteo");
  });

  it("rechaza las muletillas de manual", () => {
    expect(validateSocial("Buena pregunta, andá a la rambla de Malvín que a esa hora queda linda.", contexto).reason).toBe("banned_phrase");
  });

  it("rechaza el párrafo bien armado: tres opciones ordenadas no las escribe nadie de paso", () => {
    const largo =
      "Te recomiendo la rambla de Malvín porque a esa hora el sol pega de costado. " +
      "También podés ir al Cerro, que tiene una vista panorámica de toda la bahía. " +
      "Y si preferís algo más tranquilo, la playa Verde suele estar vacía a esa hora.";
    expect(validateSocial(largo, contexto, "liviano").reason).toBe("too_many_sentences");
  });

  it("rechaza la oración interminable, que delata lo mismo por otro lado", () => {
    const largo =
      "Andá a la rambla de Malvín tipo siete y media que a esa hora el sol pega de costado y queda " +
      "todo dorado, y si te queda lejos el Cerro también sirve porque tenés la bahía entera de " +
      "frente y encima podés volver caminando por la costa sin apuro y sin gastar un peso en nada.";
    expect(validateSocial(largo, contexto, "liviano").reason).toBe("too_long");
  });

  it("deja contestar en serio cuando alguien preguntó en serio", () => {
    // El pedido que este test fija: en r/AskUruguayan la gente pregunta de verdad, y el techo de
    // dos oraciones convertía cualquier respuesta honesta en un chiste a medias. Las mismas tres
    // oraciones que se rechazan como charla se aceptan como respuesta.
    const respuesta =
      "Te recomiendo la rambla de Malvín porque a esa hora el sol pega de costado. " +
      "También podés ir al Cerro, que tiene una vista panorámica de toda la bahía. " +
      "Y si preferís algo más tranquilo, la playa Verde suele estar vacía a esa hora.";
    expect(validateSocial(respuesta, contexto, "util").ok).toBe(true);
    expect(validateSocial(respuesta, contexto, "liviano").ok).toBe(false);
  });

  it("el registro afloja el largo pero no afloja nada más", () => {
    // Aflojar el techo no puede ser una puerta lateral: un enlace sigue siendo un enlace, y una
    // cifra inventada en una respuesta útil es peor que en un chiste, porque se le va a creer.
    expect(validateSocial("Fijate en la web de la intendencia, tenés todo en https://montevideo.gub.uy ahí.", contexto, "util").reason).toBe("has_link");
    expect(validateSocial("Andá tipo 19:40 al Cerro, que el sol baja a los 340 metros exactos y queda bárbaro.", contexto, "util").reason).toBe("invented_number");
    expect(validateSocial("Puedes ir a la rambla de Malvín, que a esa hora queda realmente preciosa la vista.", contexto, "util").reason).toBe("tuteo");
  });

  it("por defecto usa el techo de charla, que es el más estricto", () => {
    const tres =
      "Te recomiendo la rambla de Malvín porque el sol pega de costado. " +
      "También podés ir al Cerro, que tiene vista a la bahía. " +
      "Y la playa Verde suele estar vacía a esa hora.";
    expect(validateSocial(tres, contexto).reason).toBe("too_many_sentences");
  });

  it("rechaza emojis y viñetas", () => {
    expect(validateSocial("Andá al Cerro que la vista es una locura 🌅", contexto).reason).toBe("emoji");
    expect(validateSocial("- El Cerro\n- La rambla de Malvín, que a esa hora queda linda", contexto).reason).toBe("markdown");
  });

  it("rechaza cifras que no dijo nadie", () => {
    // Un chiste no necesita datos, y una cifra suelta en un comentario casual no la verifica nadie.
    const inventado = validateSocial("Andá al Cerro tipo 19:40 que el sol baja a los 340 metros exactos.", contexto);
    expect(inventado.reason).toBe("invented_number");
  });

  it("rechaza declararse bot: eso va en la bio, no en cada comentario", () => {
    expect(validateSocial("Soy un bot pero igual te digo que el Cerro a esa hora está bárbaro.", contexto).reason).toBe("self_disclosure");
  });

  it("le explica al modelo qué corregir", () => {
    expect(socialRetryHint({ ok: false, reason: "tuteo", detail: "puedes" })).toContain("puedes");
    expect(socialRetryHint({ ok: false, reason: "has_link" })).toContain("enlace");
  });
});

describe("social/limits — los frenos", () => {
  const snap = (over: Partial<{ postedLast24h: Array<{ sub: string; author: string; postedAt: Date }>; lastPostedAt: Date | null }> = {}) => ({
    postedLast24h: [],
    lastPostedAt: null,
    ...over,
  });

  it("corta al llegar al tope diario", () => {
    const lleno = Array.from({ length: cfg.maxPerDay }, () => ({ sub: "uruguay", author: "x", postedAt: new Date(NOW - 3_600_000) }));
    expect(runAllowed(cfg, snap({ postedLast24h: lleno }), NOW).ok).toBe(false);
  });

  it("respeta el espacio entre comentarios", () => {
    const recien = snap({ postedLast24h: [], lastPostedAt: new Date(NOW - 5 * 60_000) });
    expect(runAllowed(cfg, recien, NOW).ok).toBe(false);
  });

  it("no habla dos veces seguidas en el mismo sub", () => {
    const dos = Array.from({ length: cfg.maxPerSubPerDay }, () => ({ sub: "uruguay", author: "x", postedAt: new Date(NOW) }));
    expect(subAllowed(cfg, snap({ postedLast24h: dos }), "uruguay").ok).toBe(false);
    expect(subAllowed(cfg, snap({ postedLast24h: dos }), "CharruaDevs").ok).toBe(true);
  });

  it("no persigue a la misma persona", () => {
    const mismo = snap({ postedLast24h: [{ sub: "uruguay", author: "Pepe", postedAt: new Date(NOW - 3_600_000) }] });
    expect(authorAllowed(cfg, mismo, "pepe", NOW).ok).toBe(false);
    expect(authorAllowed(cfg, mismo, "otro", NOW).ok).toBe(true);
  });
});
