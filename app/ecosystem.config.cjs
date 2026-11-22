module.exports = {
  apps: [
    {
      name: 'cambio-uruguay',
      port: '3311',
      exec_mode: 'cluster',
      instances: '2', // Or a number of instances
      script: './.output/server/index.mjs',
      // External Vue modules select their runtime at process start, even for a
      // production Nuxt build. Development SSR exhausted the worker memory limit.
      env: { NODE_ENV: 'production' },
      // Collect short-lived SSR allocations before PM2's 1400 MiB RSS cutoff.
      // Leave headroom for native buffers and the rest of the process.
      //
      // 2026-10-04: 512 MB de heap dejaba ~250 MB libres sobre un estado estable de ~250 MB
      // (caché de Nitro en memoria ~38 MB, snapshot de alquileres ~20 MB, catálogo de propiedades
      // ~19 MB). Regenerar varios chunks de /__sitemap__/rentals-N.xml a la vez parseaba cada vez
      // /api/__sitemap__/rentals (11 MB, 10.4k URLs) y tiraba "JavaScript heap out of memory"
      // (67 veces entre el 2 y el 4 de octubre). Ese día se subió a mano en el servidor y no se
      // commiteó: el repo decía 512 y producción corría 1024 hasta el 2026-11-22, cuando se trajo
      // acá. Medido ese día: 780–880 MB de RSS por worker y ningún reinicio fuera de los deploys.
      node_args: '--max-old-space-size=1024',
      // Listening only proves the socket exists. Keep the previous worker until
      // server/entry.ts has rendered a real page before opening its replacement's socket.
      wait_ready: true,
      listen_timeout: 10 * 60 * 1000,
      // Let Nitro drain pending requests for its 30s grace period before SIGKILL.
      kill_timeout: 35000,
      // 500M era el techo anterior y las instancias lo tocaban seguido: 2.189 reinicios
      // acumulados al 2026-08-19, con un estado estable de 170-500 MB. Ese ciclado es el que
      // habilita la falla real — un `pm2 reload` que agarra una instancia reiniciándose sola
      // imprime "Process N not found", sale 1, y deja workers huérfanos que pm2 ya no conoce
      // pero que siguen recibiendo tráfico con el build viejo en memoria (500 intermitentes,
      // sólo en las rutas que cambiaron). Ver el barrido de huérfanos en scripts/deploy.sh.
      //
      // Subirlo no arregla un leak: reduce la frecuencia del ciclado, que es lo que rompe el
      // deploy. El box tiene 64 GB con ~17 GB disponibles, así que 1400M x 2 instancias entra
      // holgado. Si hiciera falta volver atrás, es esta línea y un redeploy. 900M dejaba un worker
      // de 1024 MB de heap a ~20 MB del corte (ver node_args): 1400M acompaña al heap.
      max_memory_restart: '1400M',
    },
  ],
}
