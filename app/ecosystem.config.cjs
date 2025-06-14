module.exports = {
  apps: [
    {
      name: 'cambio-uruguay',
      port: '3311',
      exec_mode: 'cluster',
      instances: '2', // Or a number of instances
      script: './.output/server/index.mjs',
    },
  ],
}
