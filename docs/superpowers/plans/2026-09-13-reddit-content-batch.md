# Plan — tanda de contenido minado de Reddit (2026-09-13)

Spec: `docs/superpowers/specs/2026-09-13-reddit-content-batch-design.md`.
Worktree aislado: `.claude/worktrees/reddit-content`, rama `feat/reddit-content-sep2026` desde
`origin/main` (8996dca6), con su propio `npm install`.

## Tareas

1. **Redacción en paralelo (6 agentes)** — un módulo cada uno, reglas en el brief compartido:
   `guidesPagos.ts` (6), `guidesDeudas.ts` (4), `guidesTrabajoBps.ts` (6), `guidesVivienda.ts` (4),
   `guidesTramites.ts` (5), `guidesConsumo.ts` (5). Cada agente lee los hilos de Reddit de su tema,
   verifica cada cifra abriendo la fuente primaria y deja el archivo sin errores de eslint.
2. **Familias programáticas (1 agente)** — `/couriers-uruguay/[courier]`,
   `/tarjetas-de-credito-uruguay/[programa]`, `/tarjetas-de-debito-uruguay/[tarjeta]`: módulo puro +
   tests por familia, índice movido a `index.vue`, sitemap, siteNav, contrato SEO, 404 real.
3. **Verificación adversarial (6 agentes)** — un verificador distinto por módulo de guías: abre
   cada fuente, corrige o saca lo que no se sostiene, busca contradicciones con el resto del sitio.
4. **Integración (yo)** — esparcir los seis módulos en `guides.ts`; dos hubs nuevos
   (`bancos-y-pagos-uruguay`, `tramites-y-documentos-uruguay`) y las guías restantes en hubs
   existentes; `guideHubs.test.ts` exige que cada guía nueva esté en exactamente un hub; test de
   integridad de los módulos nuevos (slugs únicos, títulos ≤ 60, fuentes https, rutas internas
   existentes).
5. **Verificación** — suite unit completa del app + `npm run lint`; revisión de SSR si el dev
   server levanta; revisión manual de una muestra de guías.
6. **Entrega** — commit en la rama, merge a `main` desde worktree temporal, push (dispara el deploy
   del app por el filtro `app/**`), medir en producción: URLs nuevas en 200 y en el sitemap.
