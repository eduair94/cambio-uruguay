// 2026-09-30: the 104 box came back from a crash with no network for ~2.5h.
// Mongoose never retries a failed INITIAL connect, and connectWithRetry
// swallowed that rejection, so long-running apps (currency-sheet) ran DB-less
// until a manual restart even after the network returned.
import { afterEach, describe, expect, it } from "vitest";
import { MongooseServer, mongoose } from "../../classes/database";

const realConnect = mongoose.connect;

describe("MongooseServer initial connect", () => {
  afterEach(() => {
    (mongoose as any).connect = realConnect;
  });

  it("keeps retrying a failed initial connect until it opens", async () => {
    let calls = 0;
    (mongoose as any).connect = async () => {
      calls++;
      if (calls < 3) throw new Error("Socket 'connect' timed out");
      setImmediate(() => mongoose.connection.emit("open"));
      return mongoose;
    };
    (MongooseServer as any).retryBaseMs = 5;

    const outcome = await Promise.race([
      MongooseServer.startConnectionPromise(),
      new Promise((resolve) => setTimeout(() => resolve("hung"), 2000).unref()),
    ]);

    expect(outcome).toBe(true);
    expect(calls).toBe(3);
  });
});
