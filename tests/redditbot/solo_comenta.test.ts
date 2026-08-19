// SOLO COMENTA. Los tres candados que lo sostienen, y por qué son tres y no uno.
//
// La cuenta anterior abría un hilo por día en r/AskUruguayan y terminó baneada permanentemente de
// ahí, con el moderador nombrando primero el nombre de la cuenta. Un hilo es la cara de la cuenta en
// el sub: lo ve muchísima más gente que cualquier comentario y es lo que hace que alguien abra el
// historial. Un comentario útil dentro del hilo de otro no dispara nada de eso.
//
// De ahí que "solo comenta" no pueda ser una convención. Un cron apagado se enciende agregando otro
// cron; una variable de entorno se pone en 1 sin querer. Lo que este archivo fija es que la negativa
// vive en la función que habla con `/api/submit`, que el cron que abría hilos ya no existe, y que el
// bot no le escribe a los subs donde no puede escribir.
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { postsAllowed } from "../../classes/redditbot/post";
import { BANNED_SUBS } from "../../classes/redditbot/subrules";

const repoFile = (...parts: string[]): string => readFileSync(join(__dirname, "..", "..", ...parts), "utf8");

describe("la cuenta solo comenta", () => {
  it("abrir hilos está cerrado salvo que alguien lo abra a mano", () => {
    const before = process.env.REDDIT_BOT_ALLOW_POSTS;
    try {
      delete process.env.REDDIT_BOT_ALLOW_POSTS;
      expect(postsAllowed()).toBe(false);

      // Y ni siquiera cualquier valor sirve: tiene que ser exactamente "1".
      process.env.REDDIT_BOT_ALLOW_POSTS = "true";
      expect(postsAllowed()).toBe(false);
      process.env.REDDIT_BOT_ALLOW_POSTS = "1";
      expect(postsAllowed()).toBe(true);
    } finally {
      if (before === undefined) delete process.env.REDDIT_BOT_ALLOW_POSTS;
      else process.env.REDDIT_BOT_ALLOW_POSTS = before;
    }
  });

  it("la negativa vive en submitPost, no en el trabajo que la llama", () => {
    // Si esta comprobación se mudara al entrypoint, cualquier otro llamador la saltearía.
    const source = repoFile("classes", "redditbot", "post.ts");
    const submitIndex = source.indexOf("export async function submitPost");
    expect(submitIndex).toBeGreaterThan(-1);
    const guardIndex = source.indexOf("if (!postsAllowed())");
    expect(guardIndex).toBeGreaterThan(submitIndex);
    // Antes de pedir el token: no se autentica para algo que no se va a hacer.
    expect(guardIndex).toBeLessThan(source.indexOf("await userToken(cfg)", submitIndex));
  });

  it("no queda ningún cron que abra hilos", () => {
    const ecosystem = repoFile("ecosystem.config.js");
    const appNames = [...ecosystem.matchAll(/name:\s*"([^"]+)"/g)].map((m) => m[1]);
    expect(appNames).toContain("currency-reddit-bot");
    expect(appNames).not.toContain("currency-reddit-ask");
    expect(appNames).not.toContain("currency-reddit-social");
  });

  it("el deploy no arranca las apps que se sacaron", () => {
    // Una app que quedó en OTHER_APPS y ya no está en ecosystem.config.js hace fallar el deploy —
    // o peor, resucita en el VPS lo que se decidió apagar.
    const deploy = repoFile("scripts", "deploy-backend.sh");
    expect(deploy).not.toContain("currency-reddit-ask");
    expect(deploy).not.toContain("currency-reddit-social");
    expect(deploy).toContain("currency-reddit-bot");
  });

  it("el sub que baneó a la cuenta sigue cerrado aunque la cuenta haya cambiado", () => {
    // Tentación concreta: la cuenta nueva no está baneada de r/AskUruguayan, así que "se puede".
    // No se puede. El moderador dijo por escrito que ahí los bots no están permitidos, y volver con
    // otra cuenta a un sub que te echó es evasión de ban, que Reddit sanciona a nivel de CUENTA y de
    // DOMINIO — o sea, arriesgando el dominio del sitio, no sólo esta cuenta.
    expect(BANNED_SUBS.has("askuruguayan")).toBe(true);
  });
});
