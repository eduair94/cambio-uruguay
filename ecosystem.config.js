module.exports = {
  apps: [
    {
      name: "currency-sync",
      autorestart: false,
      exec_mode: "fork",
      script: "dist/sync.js",
      cron_restart: "*/5 * * * *",
      log_date_format: "YYYY-MM-DD HH:mm Z",
    },
    // {
    //   name: "currency-bcu-sync",
    //   autorestart: false,
    //   exec_mode: "fork",
    //   script: "dist/get_bcu_details.js",
    //   cron_restart: "0 0 * * *",
    //   log_date_format: "YYYY-MM-DD HH:mm Z",
    // },
    {
      name: "currency-server",
      autorestart: true,
      exec_mode: "fork",
      script: "dist/index.js",
    },
    {
      name: "currency-sheet",
      autorestart: true,
      exec_mode: "fork",
      script: "dist/sync_sheet.js",
    },
    {
      // Open-source MCP server (Streamable-HTTP). Build first: `cd mcp && npm ci && npm run build`.
      name: "currency-mcp",
      autorestart: true,
      exec_mode: "fork",
      cwd: "./mcp",
      script: "dist/index.js",
      env: {
        MCP_TRANSPORT: "http",
        MCP_HTTP_PORT: "8788",
        API_BASE_URL: "https://api.cambio-uruguay.com",
      },
    },
    // Social bots. Build first: `cd mcp && npm ci && npm run build && cd ../bots && npm ci && npm run build`.
    // All read env from bots/.env (see bots/.env.example); each process is a no-op without its creds.
    {
      // Telegram interactive bot (long-poll). Single instance only.
      name: "currency-bot-telegram",
      autorestart: true,
      exec_mode: "fork",
      cwd: "./bots",
      script: "dist/entries/telegram.js",
    },
    {
      // Discord interactive bot (gateway). Register slash commands once: `npm run register:discord`.
      name: "currency-bot-discord",
      autorestart: true,
      exec_mode: "fork",
      cwd: "./bots",
      script: "dist/entries/discord.js",
    },
    {
      // Daily report — 09:00 America/Montevideo (12:00 UTC).
      name: "currency-daily",
      autorestart: false,
      exec_mode: "fork",
      cwd: "./bots",
      script: "dist/entries/daily_report.js",
      cron_restart: "0 12 * * *",
      log_date_format: "YYYY-MM-DD HH:mm Z",
    },
    {
      // Intraday big-move alerts — every 15 min, ~08:00–18:00 America/Montevideo.
      name: "currency-alerts",
      autorestart: false,
      exec_mode: "fork",
      cwd: "./bots",
      script: "dist/entries/alert_check.js",
      cron_restart: "*/15 11-21 * * *",
      log_date_format: "YYYY-MM-DD HH:mm Z",
    },
  ],
};
