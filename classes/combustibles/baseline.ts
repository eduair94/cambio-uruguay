// classes/combustibles/baseline.ts
//
// Lo que sirve GET /combustibles si Mongo está vacío. Copia de la tabla de ANCAP leída el
// 2026-09-15; app/server/utils/combustiblesFallback.ts lleva la misma lista y
// tests/combustibles/baseline_parity.test.ts impide que se separen.
import type { FuelRow } from "./parse";

export const BASELINE_FUEL_SOURCE_URL = "https://www.ancap.com.uy/10564/5/historico-precios-combustibles.html";

export const BASELINE_FUEL_ROWS: readonly FuelRow[] = [
  { from: "2024-10-01", super95: 75.04, premium97: 77.58, gasoil50s: 49.92, gasoil10s: 58.1, queroseno: 52.13, supergas: 80.75 },
  { from: "2024-11-01", super95: 75.04, premium97: 77.58, gasoil50s: 49.92, gasoil10s: 58.1, queroseno: 52.13, supergas: 80.75 },
  { from: "2024-12-01", super95: 75.04, premium97: 77.58, gasoil50s: 49.92, gasoil10s: 58.1, queroseno: 52.13, supergas: 80.75 },
  { from: "2025-01-01", super95: 78.54, premium97: 81.08, gasoil50s: 49.92, gasoil10s: 58.1, queroseno: 55.8, supergas: 88.46 },
  { from: "2025-02-01", super95: 78.54, premium97: 81.08, gasoil50s: 50.92, gasoil10s: 58.1, queroseno: 55.8, supergas: 88.46 },
  { from: "2025-03-01", super95: 78.54, premium97: 81.08, gasoil50s: 50.92, gasoil10s: 58.1, queroseno: 55.8, supergas: 88.46 },
  { from: "2025-04-01", super95: 78.54, premium97: 81.08, gasoil50s: 50.17, gasoil10s: 58.1, queroseno: 54.63, supergas: 88.46 },
  { from: "2025-05-01", super95: 78.54, premium97: 81.08, gasoil50s: 49.42, gasoil10s: 57.23, queroseno: 54.55, supergas: 88.46 },
  { from: "2025-06-01", super95: 78.47, premium97: 80.87, gasoil50s: 47.03, gasoil10s: 54.03, queroseno: 52.4, supergas: 88.46 },
  { from: "2025-07-01", super95: 78.72, premium97: 81.13, gasoil50s: 48.08, gasoil10s: 55.08, queroseno: 53.34, supergas: 80.77 },
  { from: "2025-08-01", super95: 78.72, premium97: 81.13, gasoil50s: 48.08, gasoil10s: 55.08, queroseno: 54.18, supergas: 80.77 },
  { from: "2025-09-01", super95: 78.2, premium97: 80.61, gasoil50s: 50.14, gasoil10s: 57.14, queroseno: 53.13, supergas: 88.46 },
  { from: "2025-10-01", super95: 78.2, premium97: 80.61, gasoil50s: 50.14, gasoil10s: 57.14, queroseno: 53.63, supergas: 88.46 },
  { from: "2025-11-01", super95: 78.02, premium97: 80.48, gasoil50s: 49.77, gasoil10s: 56.77, queroseno: 53.95, supergas: 88.46 },
  { from: "2025-12-01", super95: 78.02, premium97: 80.48, gasoil50s: 49.77, gasoil10s: 56.77, queroseno: 55.19, supergas: 88.46 },
  { from: "2026-01-01", super95: 77.79, premium97: 80.3, gasoil50s: 48.9, gasoil10s: 55.9, queroseno: 52.16, supergas: 88.46 },
  { from: "2026-02-01", super95: 77.79, premium97: 80.3, gasoil50s: 48.9, gasoil10s: 55.9, queroseno: 52.27, supergas: 88.46 },
  { from: "2026-03-01", super95: 76.88, premium97: 79.4, gasoil50s: 47.32, gasoil10s: 54.32, queroseno: 55.24, supergas: 88.46 },
  { from: "2026-04-01", super95: 82.27, premium97: 84.95, gasoil50s: 50.63, gasoil10s: 58.13, queroseno: 74.68, supergas: 94.64 },
  { from: "2026-05-01", super95: 88.03, premium97: 90.9, gasoil50s: 57.72, gasoil10s: 66.27, queroseno: 74.68, supergas: 101.26 },
  { from: "2026-06-01", super95: 93.36, premium97: 96.0, gasoil50s: 61.76, gasoil10s: 70.91, queroseno: 74.68, supergas: 101.26 },
  { from: "2026-07-01", super95: 88.67, premium97: 91.19, gasoil50s: 58.68, gasoil10s: 67.33, queroseno: 67.19, supergas: 93.56 },
  { from: "2026-08-01", super95: 88.67, premium97: 91.19, gasoil50s: 58.68, gasoil10s: 67.33, queroseno: 67.5, supergas: 93.56 },
  { from: "2026-09-01", super95: 88.67, premium97: 91.19, gasoil50s: 58.68, gasoil10s: 67.33, queroseno: 67.5, supergas: 93.56 },
];
