import { describe, expect, it } from "vitest";
import type { RedditPostRaw } from "../../classes/reddit";
import { screenForOpportunity } from "../../classes/redditopps/screen";
import { decodeEntities, excerptOf, langOf } from "../../classes/redditopps/text";

const post = (over: Partial<RedditPostRaw> = {}): RedditPostRaw => ({
  id: "abc123",
  sub: "uruguay",
  title: "Busco apartamento para alquilar en Pocitos, qué portales recomiendan?",
  selftext: "Somos dos, presupuesto de 30 mil pesos con gastos comunes incluidos.",
  author: "alguien",
  score: 3,
  numComments: 2,
  permalink: "https://reddit.com/r/uruguay/comments/abc123/x",
  createdUtc: 1_790_000_000,
  url: "",
  over18: false,
  locked: false,
  stickied: false,
  isSelf: true,
  linkFlair: "",
  ...over,
});

describe("redditopps/screen", () => {
  it("deja pasar un pedido con forma de pregunta", () => {
    expect(screenForOpportunity(post())).toEqual({ ok: true });
  });

  it("deja pasar un pedido sin signo de pregunta", () => {
    const p = post({ title: "Busco auto usado hasta 8 mil dólares", selftext: "Para ir a trabajar todos los días a Canelones." });
    expect(screenForOpportunity(p).ok).toBe(true);
  });

  it("descarta una afirmación que no pide nada", () => {
    const p = post({ title: "El dólar bajó hoy otra vez", selftext: "Lo vi en la pizarra del BROU esta mañana, sigue cayendo." });
    expect(screenForOpportunity(p).reason).toBe("not_a_request");
  });

  it("descarta un aviso de venta, pero no al que vende y pregunta cuánto pedir", () => {
    const aviso = post({ sub: "UruguayMarketplace", title: "Vendo heladera Samsung impecable", selftext: "15 mil pesos, retiro en el Prado." });
    expect(screenForOpportunity(aviso).reason).toBe("marketplace_offer");
    const pregunta = post({ title: "Vendo mi auto, ¿cuánto pido?", selftext: "Es un Onix 2019 con 60 mil kilómetros." });
    expect(screenForOpportunity(pregunta).ok).toBe(true);
  });

  it("descarta lo que no se contesta nunca", () => {
    expect(screenForOpportunity(post({ over18: true })).reason).toBe("nsfw");
    expect(screenForOpportunity(post({ stickied: true })).reason).toBe("stickied");
    expect(screenForOpportunity(post({ locked: true })).reason).toBe("locked");
    expect(screenForOpportunity(post({ removedBy: "moderator" })).reason).toBe("removed");
    expect(screenForOpportunity(post({ author: "[deleted]" })).reason).toBe("deleted_author");
    expect(screenForOpportunity(post({ linkFlair: "Política" })).reason).toBe("blocked_flair");
    expect(screenForOpportunity(post({ selftext: "Ya lo vi en cambio-uruguay.com pero no entiendo" })).reason).toBe(
      "already_linked"
    );
    expect(
      screenForOpportunity(
        post({ title: "Tips encomienda", selftext: "¿Cómo traer semillas de cannabis sin que se den cuenta en la aduana?" })
      ).reason
    ).toBe("evasion");
  });

  it("lee el título con las entidades de HTML resueltas", () => {
    const p = post({ title: "Vendo auto &amp; moto", selftext: "Impecables, papeles al día, 9 mil dólares los dos." });
    expect(screenForOpportunity(p).reason).toBe("marketplace_offer");
  });
});

describe("redditopps/text", () => {
  it("decodifica las entidades que escapa Reddit", () => {
    expect(decodeEntities("Autos &amp; motos &#x27;usados&#x27; &lt;3 &#39;ok&#39;")).toBe("Autos & motos 'usados' <3 'ok'");
    expect(decodeEntities("&noexiste; queda")).toBe("&noexiste; queda");
  });

  it("arma un extracto sin markdown y cortado en palabra", () => {
    expect(excerptOf("Mirá [esta guía](https://x.com) **ya**")).toBe("Mirá esta guía ya");
    const long = excerptOf("palabra ".repeat(200), 50);
    expect(long.length).toBeLessThanOrEqual(51);
    expect(long.endsWith("…")).toBe(true);
  });

  it("distingue inglés de español", () => {
    expect(langOf("Where is the best place to exchange dollars in Montevideo? Is there any fee for that?")).toBe("en");
    expect(langOf("¿Dónde conviene cambiar dólares en Montevideo? Alguien sabe si cobran comisión")).toBe("es");
    expect(langOf("hola")).toBe("es");
  });
});
