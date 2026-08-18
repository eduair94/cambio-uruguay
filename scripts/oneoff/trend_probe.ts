// Reads the three trend feeds and prints the snapshot WITHOUT writing anything.
//
// This is how you check the classifier after touching the keyword table: the false positives it
// produces are only visible against the live listings, not against the unit test. Run it with
// `npm run trend_probe`.
//
// Needs no APP_MONGO_URI (it never saves). Reddit rows come back empty without Reddit credentials,
// and that shows up as `"reddit":{"ok":true,"count":0}` rather than as an error.
import { buildTrendsSnapshot } from "../../classes/trends/refresh";

async function main(): Promise<void> {
  const snapshot = await buildTrendsSnapshot();

  console.log("fuentes:", JSON.stringify(snapshot.sources));
  console.log("counts: ", JSON.stringify(snapshot.counts));

  console.log("\n--- búsquedas del día (orden de Google) ---");
  for (const t of snapshot.searches) {
    const why = t.matchedOn.length ? ` ← ${t.matchedOn.join(", ")}` : "";
    console.log(`${String(t.rank).padStart(2)}. [${t.money.padEnd(5)}] ${t.term} (${t.approxTraffic})${why}`);
  }

  console.log("\n--- hilos de foros ---");
  for (const r of snapshot.reddit) {
    console.log(`[${r.money.padEnd(5)}] r/${r.subreddit.padEnd(14)} ${String(r.comments).padStart(3)}c — ${r.title.slice(0, 78)}`);
  }

  console.log("\n--- titulares de economía ---");
  for (const n of snapshot.news) {
    console.log(`${n.source} — ${n.title.slice(0, 90)}`);
  }
}

void main();
