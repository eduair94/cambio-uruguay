module.exports = {
  apps: [
    {
      name: 'cambio-uruguay',
      port: '3311',
      exec_mode: 'cluster',
      instances: '2', // Or a number of instances
      script: './.output/server/index.mjs',
      // 500M era el techo anterior y las instancias lo tocaban seguido: 2.189 reinicios
      // acumulados al 2026-08-19, con un estado estable de 170-500 MB. Ese ciclado es el que
      // habilita la falla real — un `pm2 reload` que agarra una instancia reiniciándose sola
      // imprime "Process N not found", sale 1, y deja workers huérfanos que pm2 ya no conoce
      // pero que siguen recibiendo tráfico con el build viejo en memoria (500 intermitentes,
      // sólo en las rutas que cambiaron). Ver el barrido de huérfanos en scripts/deploy.sh.
      //
      // Subirlo no arregla un leak: reduce la frecuencia del ciclado, que es lo que rompe el
      // deploy. El box tiene 64 GB con ~17 GB disponibles, así que 900M x 2 instancias entra
      // holgado. Si hiciera falta volver atrás, es esta línea y un redeploy.
      max_memory_restart: '900M',
    },
  ],
}
