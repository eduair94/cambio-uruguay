// pm2 app `currency-bankos` (daily). Snapshots the whole Bankos discount map into the NUXT APP's
// database (classes/appdb.ts, APP_MONGO_URI) as the collection `bankossnapshots`, which
// app/server/api/bankos/discounts.get.ts reads when the live Bankos API is unreachable.
//
// Not a ledger — it is a single upserted row (`key:"latest"`), a durable fallback. buildSnapshot()
// throws on a thin/empty pull, so a bad Bankos day leaves the previous good snapshot in place rather
// than blanking the page. Refuses to run without APP_MONGO_URI (writing to the wrong DB would make
// the fallback invisible to the app).
import dotenv from "dotenv";
dotenv.config();

import { appDbConfigured } from "./classes/appdb";
import { buildSnapshot } from "./classes/bankos/refresh";
import { BankosSnapshotModel } from "./classes/models/BankosSnapshot";

async function main(): Promise<void> {
  if (!appDbConfigured()) {
    console.error(
      "[bankos] APP_MONGO_URI is not set — refusing to run. The Bankos fallback lives in the Nuxt " +
        "app's database; without this it would be written where the app can't read it. Set " +
        "APP_MONGO_URI (copy from app/.env's MONGO_URI)."
    );
    process.exit(1);
  }

  try {
    const snap = await buildSnapshot();
    await BankosSnapshotModel.updateOne(
      { key: "latest" },
      {
        $set: {
          key: "latest",
          generatedAt: new Date(),
          banks: snap.banks,
          counts: snap.counts,
          data: snap.data,
        },
      },
      { upsert: true }
    );
    console.log(
      `[bankos] snapshot stored: brands=${snap.counts.brands} locations=${snap.counts.locations} banks=${snap.counts.banksWithDiscounts}`
    );
    process.exit(0);
  } catch (e: any) {
    console.error(
      "[bankos] refresh failed — keeping the previous snapshot as the fallback:",
      e?.message || e
    );
    process.exit(1);
  }
}

main();
