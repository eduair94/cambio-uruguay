// Always-on Discord bot (discord.js gateway). Handles slash-command interactions;
// daily/alert pushes come from the cron entries via the channel webhook. Exits
// cleanly when DISCORD_BOT_TOKEN is absent.
import "dotenv/config";
import { Client, Events, GatewayIntentBits, type ChatInputCommandInteraction } from "discord.js";
import { httpCambioApi } from "cambio-uruguay-mcp/api";
import { loadConfig } from "../config.js";
import { handleCommand, type CommandCtx } from "../commands/router.js";
import { normalizeLang } from "../format/i18n.js";
import { connectMongo } from "../store/mongo.js";
import { getLanguage } from "../store/subscribers.js";
import { mongoStore } from "../store/store_adapter.js";
import { optionsToArgs } from "../bot/discord_commands.js";

async function main(): Promise<void> {
  const cfg = loadConfig();
  if (!cfg.discord) {
    console.log("Discord not configured (DISCORD_BOT_TOKEN/APP_ID missing); exiting.");
    return;
  }
  await connectMongo(cfg.mongoUri).catch((e) => console.error("mongo connect failed:", e));

  const api = httpCambioApi(cfg.apiBaseUrl);
  const client = new Client({ intents: [GatewayIntentBits.Guilds] });

  client.once(Events.ClientReady, (c) => console.log(`Discord bot ready as ${c.user.tag}`));

  client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) return;
    const i = interaction as ChatInputCommandInteraction;
    const chatId = i.user.id;
    const stored = await getLanguage("discord", chatId).catch(() => null);
    const lang = normalizeLang(stored ?? i.locale);
    const args = optionsToArgs(i.commandName, (name) => {
      const v = i.options.get(name)?.value;
      return v === undefined || v === null ? null : typeof v === "boolean" ? String(v) : v;
    });

    const ctx: CommandCtx = { cmd: i.commandName, args, lang, platform: "discord", chatId };
    await i.deferReply().catch(() => undefined);
    const reply = await handleCommand(api, cfg, ctx, mongoStore);
    await i.editReply(reply.text.slice(0, 2000)).catch((e) => console.error("discord reply failed:", e));
  });

  await client.login(cfg.discord.botToken);
}

main().catch((err) => {
  console.error("discord bot fatal:", err);
  process.exit(1);
});
