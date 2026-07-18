// Daily runner for the Oct-decree window ONLY (pm2 `currency-aduana-daily`). Outside
// 2026-09-01..2026-11-01 it is a deliberate no-op, so the weekly `currency-aduana` stays the baseline
// cadence and nothing has to be turned off after November. Inside the window it runs the exact same
// sync every day, because a prórroga (or a new condition) can land on any date and a week of
// staleness right before 1/10 is too long. Idempotent with the Monday run: the guardrail dedupes
// overrides by id and re-confirms unchanged values, so a second same-day pass changes nothing.
import { inDecreeWindow } from "./classes/aduana/window";

if (!inDecreeWindow(new Date())) {
  console.log("[aduana-daily] fuera de la ventana del decreto (2026-09-01..2026-11-01) — no-op");
  process.exit(0);
} else {
  console.log("[aduana-daily] dentro de la ventana — corriendo el sync diario");
  // Importing sync_aduana runs its main() (which calls process.exit itself).
  import("./sync_aduana");
}
