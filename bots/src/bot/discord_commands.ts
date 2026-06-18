// Slash-command definitions shared by the registration script and the gateway
// entry. Option order matches what the router expects as positional args.
import { SlashCommandBuilder } from "discord.js";

export const slashCommands = [
  new SlashCommandBuilder().setName("dolar").setDescription("Cotización del dólar (USD)"),
  new SlashCommandBuilder()
    .setName("cotizacion")
    .setDescription("Cotización de una moneda")
    .addStringOption((o) => o.setName("moneda").setDescription("p.ej. USD, EUR, ARS").setRequired(true)),
  new SlashCommandBuilder()
    .setName("mejor")
    .setDescription("Mejor casa para comprar/vender")
    .addStringOption((o) => o.setName("moneda").setDescription("p.ej. USD").setRequired(true))
    .addStringOption((o) =>
      o
        .setName("lado")
        .setDescription("comprar o vender")
        .addChoices({ name: "comprar", value: "compra" }, { name: "vender", value: "venta" })
    ),
  new SlashCommandBuilder()
    .setName("convertir")
    .setDescription("Conversor de monedas")
    .addNumberOption((o) => o.setName("monto").setDescription("monto").setRequired(true))
    .addStringOption((o) => o.setName("de").setDescription("moneda origen (p.ej. USD)").setRequired(true))
    .addStringOption((o) => o.setName("a").setDescription("moneda destino (p.ej. UYU)").setRequired(true)),
  new SlashCommandBuilder().setName("resumen").setDescription("Resumen IA del mercado"),
  new SlashCommandBuilder()
    .setName("historico")
    .setDescription("Análisis de tendencia de una moneda")
    .addStringOption((o) => o.setName("moneda").setDescription("p.ej. USD").setRequired(true)),
  new SlashCommandBuilder().setName("noticias").setDescription("Últimas noticias del dólar/economía"),
  new SlashCommandBuilder().setName("suscribir").setDescription("Recibir el resumen diario por DM"),
  new SlashCommandBuilder().setName("desuscribir").setDescription("Cancelar la suscripción"),
  new SlashCommandBuilder()
    .setName("idioma")
    .setDescription("Cambiar idioma")
    .addStringOption((o) =>
      o
        .setName("codigo")
        .setDescription("es, en o pt")
        .setRequired(true)
        .addChoices({ name: "Español", value: "es" }, { name: "English", value: "en" }, { name: "Português", value: "pt" })
    ),
].map((c) => c.toJSON());

/** Maps a slash command's options to the positional args the router expects. */
export function optionsToArgs(commandName: string, get: (name: string) => string | number | null): string[] {
  switch (commandName) {
    case "cotizacion":
    case "historico":
      return [String(get("moneda") ?? "")];
    case "mejor":
      return [String(get("moneda") ?? ""), String(get("lado") ?? "")].filter(Boolean);
    case "convertir":
      return [String(get("monto") ?? ""), String(get("de") ?? ""), String(get("a") ?? "")];
    case "idioma":
      return [String(get("codigo") ?? "")];
    default:
      return [];
  }
}
