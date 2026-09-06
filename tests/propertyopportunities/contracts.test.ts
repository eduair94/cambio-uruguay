import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

const contract = (file: string) => fs.readFileSync(path.join(__dirname, "../..", file), "utf8")
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/\/\/[^\n\r]*/g, "")
  .replace(/[\s;,]/g, "")
  .replace(/'/g, '"');

describe("property opportunity contract", () => {
  it("keeps the self-contained app's wire types identical to the backend's contract", () => {
    const backend = contract("classes/propertyopportunities/types.ts");
    expect(backend.length).toBeGreaterThan(1000);
    expect(contract("app/utils/propertyOpportunities.ts")).toBe(backend);
  });
  it("starts both standalone jobs through the same exclusive wrapper and includes them in deploy", () => {
    const config = require("../../ecosystem.config.js");
    const jobs = config.apps.filter((app: { name: string }) => app.name.startsWith("currency-property-opportunities"));
    expect(jobs).toHaveLength(2);
    expect(jobs.every((app: { script: string; interpreter: string }) => app.script === "scripts/run-property-opportunities.sh" && app.interpreter === "bash")).toBe(true);
    const deploy = fs.readFileSync(path.join(__dirname, "../../scripts/deploy-backend.sh"), "utf8");
    for (const job of jobs) expect(deploy).toContain(job.name);
    const wrapper = fs.readFileSync(path.join(__dirname, "../../scripts/run-property-opportunities.sh"), "utf8");
    expect(wrapper).toContain("flock -n 9");
    expect(wrapper).toContain('exec node dist/sync_property_opportunities.js "$@"');
  });
})
