import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

const ROOT = path.join(__dirname, "..", "..");
const read = (file: string) => fs.readFileSync(path.join(ROOT, file), "utf8");

describe("currency-photo-facts wiring", () => {
  it("runs hourly at :12 as a single fork, started on deploy", () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const app = require(path.join(ROOT, "ecosystem.config.js")).apps.find((entry: { name: string }) => entry.name === "currency-photo-facts");
    expect(app).toMatchObject({ script: "dist/sync_photo_facts.js", cron_restart: "12 * * * *", autorestart: false, exec_mode: "fork" });
    expect(read("scripts/deploy-backend.sh")).toMatch(/OTHER_APPS=\([^)]*\bcurrency-photo-facts\b[^)]*\)/);
  });

  it("reports to Sentry and never falls back to Gemini", () => {
    const src = read("sync_photo_facts.ts");
    expect(src.split("\n").find(line => line.startsWith("import "))).toBe('import "./sentry_job";');
    expect(src).not.toMatch(/from\s+["'][^"']*(gemini|classes\/llm)["']/i);
    expect(src).toMatch(/from\s+["']\.\/classes\/anthropic["']/);
  });

  it("writes nothing an API serves: only photofacts and photofactsmetas", () => {
    const sources = ["classes/photofacts/store.ts", "classes/photofacts/scan.ts", "classes/photofacts/run.ts", "sync_photo_facts.ts"].map(read).join("\n");
    expect(sources).not.toMatch(/\.(updateOne|updateMany|bulkWrite|insertOne|insertMany|replaceOne|deleteMany|deleteOne)\([^)]*\b(rentallistings|propertysalecatalog)/);
    expect(sources).not.toMatch(/collection\((["'])(rentallistings|propertysalecatalog)\1\)\.(update|bulk|insert|replace|delete)/);
  });
});
