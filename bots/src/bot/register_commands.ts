// One-off: registers the slash commands globally. Run after changing commands:
//   npm run register:discord
import "dotenv/config";
import { REST, Routes } from "discord.js";
import { loadConfig } from "../config.js";
import { slashCommands } from "./discord_commands.js";

async function main(): Promise<void> {
  const cfg = loadConfig();
  if (!cfg.discord) {
    console.log("Discord not configured (DISCORD_BOT_TOKEN/APP_ID missing); exiting.");
    return;
  }
  const rest = new REST({ version: "10" }).setToken(cfg.discord.botToken);
  await rest.put(Routes.applicationCommands(cfg.discord.appId), { body: slashCommands });
  console.log(`Registered ${slashCommands.length} slash commands.`);
}

main().catch((err) => {
  console.error("register commands failed:", err);
  process.exit(1);
});
