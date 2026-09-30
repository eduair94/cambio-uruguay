import express from "express";
import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

// Express 5 (router 2 / path-to-regexp 8) THROWS on v4 path syntax — `:param?`, a bare `*`,
// regex characters `( ) [ ] ? + !` — at the moment a route is registered. index.ts registers
// every route inside main(), after the server is already listening, so a single v4-style path
// means an API that boots and then 404s every route declared after it. Nothing else loads
// index.ts in the suite, so this reads its route strings and registers each on a throwaway app.
// Optional segments are written `{/:x}`.
const ENTRY = path.resolve(__dirname, "..", "index.ts");

// `server.getJson("x")` & co. prefix the base url "/"; `server.getApp().post("/x")` takes it as is.
const WRAPPED = /server\.(?:getJson|get|postJson)\(\s*(["'`])([^"'`]*)\1/g;
const DIRECT = /getApp\(\)\.(?:get|post|put|patch|delete|all)\(\s*(["'`])([^"'`]*)\1/g;

function routePaths(): string[] {
  const source = fs.readFileSync(ENTRY, "utf8");
  return [
    ...[...source.matchAll(WRAPPED)].map((m) => `/${m[2]}`),
    ...[...source.matchAll(DIRECT)].map((m) => m[2]),
  ];
}

describe("index.ts route paths are valid Express 5 syntax", () => {
  const paths = routePaths();

  it("finds the routes (vacuity guard)", () => {
    expect(paths.length).toBeGreaterThan(40);
  });

  it.each(paths)("%s", (routePath) => {
    const app = express();
    expect(() => app.get(routePath, (_req, res) => void res.end())).not.toThrow();
  });
});
