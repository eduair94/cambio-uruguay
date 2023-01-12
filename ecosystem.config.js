module.exports = {
  apps: [
    {
      name: "currency-sync",
      autorestart: false,
      exec_mode: "fork",
      script: "dist/sync.js",
      cron_restart: "*/10 * * * *",
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
  ],
};
