// Re-checks every stored chair against the CURRENT rules and deletes the ones that would not be
// admitted today (casters, auditorium seating, junk identities left by an older, looser filter).
// Safe to run any time: it never touches a row that still passes.
import dotenv from "dotenv";
dotenv.config();
dotenv.config({ path: "app/.env" });

import { pruneRejectedChairs } from "../../classes/chairs/store";

async function main(): Promise<void> {
  process.env.APP_MONGO_URI = process.env.APP_MONGO_URI || process.env.MONGO_URI;
  const removed = await pruneRejectedChairs(new Set<string>());
  console.log(`[chairs] retiradas ${removed.length}:`, removed.slice(0, 40).join(", "));
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
