import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildZip, SKILL_DIR, skillFiles, ZIP_PATH } from "../scripts/pack-skill.mjs";

describe("buscador-uruguay skill", () => {
  it("has the frontmatter Claude needs to load it", () => {
    const skill = readFileSync(`${SKILL_DIR}/SKILL.md`, "utf8").replace(/\r\n/g, "\n");
    const front = /^---\nname: ([a-z0-9-]+)\ndescription: (.+)\n---\n/.exec(skill);
    expect(front?.[1]).toBe("buscador-uruguay");
    expect(front![2]!.length).toBeGreaterThan(100);
    expect(front![2]!.length).toBeLessThan(1024);
  });

  it("links only reference files that exist", () => {
    const skill = readFileSync(`${SKILL_DIR}/SKILL.md`, "utf8");
    for (const ref of skill.match(/references\/[a-z-]+\.md/g) ?? []) expect(existsSync(`${SKILL_DIR}/${ref}`), ref).toBe(true);
  });

  it("the downloadable zip matches the folder (run npm run pack-skill after editing)", () => {
    expect(existsSync(ZIP_PATH)).toBe(true);
    const fresh = buildZip(skillFiles()) as Buffer;
    expect(Buffer.compare(fresh, readFileSync(ZIP_PATH))).toBe(0);
  });
});
