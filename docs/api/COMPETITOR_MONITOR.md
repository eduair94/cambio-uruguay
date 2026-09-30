# Monitor de competencia

Diseño: `docs/superpowers/specs/2026-09-29-monitor-competencia-design.md`. Código: `classes/monitor/`,
job `sync_competitor_monitor.ts` (pm2 `currency-competitor-monitor`, cada 5 minutos).

## Qué hace

Una cuenta del sitio arma su monitor en `/cuenta?tab=api`: su casa (opcional), hasta 12
competidores, monedas (USD, EUR, BRL, ARS), qué avisos quiere y por dónde. El job avisa:

- **Movimiento**: un competidor cambió su pizarra — sólo si el valor nuevo es el que publica hoy la
  foto (el ledger también registra cambios que la guarda de plausibilidad rechazó).
- **Posición**: la casa propia cambió de puesto en compra o venta — visto en dos corridas seguidas.
- **Pizarra quieta**: la propia no se movió en 3 h y se movieron ≥ 2 competidores (lunes a viernes,
  10:00–19:00, una vez por día por moneda).
- **Resumen**: desde las 18:30, una vez por día.

## Acceso

14 días de prueba desde el primer guardado (`trialStartedAt`, no se reinicia). Después sigue sólo
si la cuenta tiene una clave de la API activa con plan `business` (se asigna en el panel de
clientes de `/cuenta?tab=api`). Al vencer se manda un aviso y el monitor deja de evaluarse.

## Dónde vive cada cosa

| qué | dónde |
|---|---|
| configuración (la escribe el app) | base del app, `competitormonitors` |
| estado (lo escribe el job) | base del app, `competitormonitorstates` |
| cambios de pizarra | base del backend, `cambio_changes` |
| chat de Telegram | base del app, `users.telegramChatId` |

## Configuración

`.env` de la raíz: `APP_MONGO_URI`, `TELEGRAM_BOT_TOKEN` (el mismo bot del sitio) y `SMTP_*`
(copiadas de `app/.env`). Sin SMTP, sólo Telegram.
