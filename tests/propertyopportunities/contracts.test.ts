import fs from "fs";
import path from "path";
import ts from "typescript";
import { describe, expect, it } from "vitest";

const contract = (file: string) => fs.readFileSync(path.join(__dirname, "../..", file), "utf8")
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/\/\/[^\n\r]*/g, "")
  .replace(/[\s;,]/g, "")
  .replace(/'/g, '"');

describe("property opportunity contract", () => {
  it("keeps the separately deployed advertiser fields structurally identical", () => {
    const normalized = (file: string, name: string) => {
      const source = ts.createSourceFile(file, fs.readFileSync(path.join(__dirname, "../..", file), "utf8"), ts.ScriptTarget.Latest, true);
      const declaration = source.statements.find(node => ts.isInterfaceDeclaration(node) && node.name.text === name) as ts.InterfaceDeclaration | undefined;
      expect(declaration, `${file}:${name}`).toBeDefined();
      return declaration!.members.map(member => member.getText(source).replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\r\n]*/g, "")
        .replace(/RentalAgency/g, "Agency").replace(/RentalPublicContact/g, "PublicContact").replace(/RentalOwnerDirect/g, "OwnerDirect")
        .replace(/[\s;,]/g, "").replace(/'/g, '"'));
    };
    for (const [backend, frontend] of [["RentalAgency", "Agency"], ["RentalPublicContact", "PublicContact"], ["RentalOwnerDirect", "OwnerDirect"], ["RentalAdvertiserFields", "AdvertiserMetadata"]]) {
      expect(normalized("classes/rentals/types.ts", backend)).toEqual(normalized("app/utils/propertyAdvertiser.ts", frontend));
    }
  });
  it("keeps the self-contained app's wire types identical to the backend's contract", () => {
    const advertiserImports = (value: string) => value
      .replace(/importtype\{RentalAdvertiserFieldsRentalSellerType\}from"\.\.\/rentals\/types"/, "")
      .replace(/importtype\{AdvertiserMetadata\}from"\.\/propertyAdvertiser"/, "")
      .replace(/importtype\{RentalSellerType\}from"\.\/rentals"/, "")
      .replace(/extendsAdvertiserMetadata/g, "extendsRentalAdvertiserFields");
    const backend = advertiserImports(contract("classes/propertyopportunities/types.ts"));
    expect(backend.length).toBeGreaterThan(1000);
    expect(advertiserImports(contract("app/utils/propertyOpportunities.ts"))).toBe(backend);
    const availabilityContract = (file: string) => contract(file)
      .match(/exportinterfaceRentalAvailabilitySummary\{[^}]+\}/)?.[0] || "";
    const availability = availabilityContract("classes/propertyopportunities/rentalAvailability.ts");
    expect(availability.length).toBeGreaterThan(80);
    expect(availabilityContract("app/utils/rentalAvailability.ts")).toBe(availability);
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
