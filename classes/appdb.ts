// A SECOND mongoose connection, to the NUXT APP's database — not the backend's.
//
// The prediction ledger (`pricepredictions`) and the move-explanation archive (`moveexplanations`)
// were written by the app for months and cannot be regenerated: nobody can tell you today what a
// grounded model would have forecast on 2026-03-04, and `moveexplanations` also holds rows a human
// researched by hand (POST /api/analysis/backfill). So they are NOT copied into cambio-uy. The
// backend's cron jobs write the very same collections the app already reads, and the app's
// /api/predictions/:currency and /api/analysis/:currency keep working with ZERO changes.
//
// MONGODB_URI (…/cambio-uy) and APP_MONGO_URI (the app's) are different databases — verified. Using
// mongoose.connect() here would hijack the default connection classes/database.ts owns; createConnection
// keeps them separate and lets a single process talk to both.
import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

let conn: mongoose.Connection | null = null;

export function appDbConfigured(): boolean {
  return !!process.env.APP_MONGO_URI;
}

export function appConnection(): mongoose.Connection {
  if (conn) return conn;
  const uri = process.env.APP_MONGO_URI;
  if (!uri) {
    throw new Error(
      "APP_MONGO_URI is not set. The prediction ledger and the move-explanation archive live in the " +
        "Nuxt app's database; without this the job would write them to the WRONG database. Copy the " +
        "value from app/.env's MONGO_URI."
    );
  }
  conn = mongoose.createConnection(uri, { maxPoolSize: 5 });
  return conn;
}

/**
 * A mongoose Model bound to {@link appConnection}, but resolved LAZILY — importing a
 * classes/models/*.ts file (and reading `.schema` / `.collection.name` off the result, as
 * tests/appdb/schema_parity.test.ts does) must never require APP_MONGO_URI to be set or a real
 * Mongo to be reachable. `.schema` and `.collection.name` are answered directly from the schema
 * definition and the pinned collection name (both known statically, no connection needed); every
 * other property/method (`.find`, `.updateOne`, ...) resolves the real connection-bound model on
 * first use, calling appConnection() (which throws loudly without APP_MONGO_URI) only then.
 */
export function appModel<T>(name: string, schema: mongoose.Schema, collection: string): mongoose.Model<T> {
  let cached: mongoose.Model<T> | null = null;
  const resolve = (): mongoose.Model<T> => {
    if (!cached) cached = appConnection().model<T>(name, schema, collection);
    return cached;
  };
  return new Proxy({} as mongoose.Model<T>, {
    get(_target, prop, receiver) {
      if (prop === "schema") return schema;
      if (prop === "collection") return { name: collection };
      const model = resolve();
      const value = Reflect.get(model, prop, receiver);
      return typeof value === "function" ? value.bind(model) : value;
    },
  });
}
