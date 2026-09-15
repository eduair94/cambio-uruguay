import { describe, expect, it } from "vitest";
import {
  COMMENT_SCHEMA,
  normalizeLabel,
  POST_SCHEMA,
  renderCommentsPrompt,
  renderPostsPrompt,
} from "../../classes/charruadevs/rubric";

describe("charruadevs rubric", () => {
  it("keeps a valid post label", () => {
    expect(
      normalizeLabel(
        { id: "a", rel: true, stance: -1, themes: ["ia", "junior"], ai: "amenaza", event: "busca", persona: "junior" },
        "post"
      )
    ).toEqual({ rel: true, stance: -1, themes: ["ia", "junior"], ai: "amenaza", event: "busca", persona: "junior" });
  });

  it("clamps stance, drops unknown themes and caps them at three", () => {
    const out = normalizeLabel(
      { id: "a", rel: true, stance: -7, themes: ["ia", "x", "sueldos", "exterior", "junior"], ai: "nope", event: "?" },
      "comment"
    );
    expect(out).toEqual({ rel: true, stance: -2, themes: ["ia", "sueldos", "exterior"], ai: null, event: "ninguno" });
  });

  it("an off-topic label has no stance", () => {
    expect(normalizeLabel({ id: "a", rel: false, stance: 1, themes: [], ai: null, event: "ninguno" }, "comment")?.stance).toBeNull();
  });

  it("rejects garbage", () => {
    expect(normalizeLabel(null, "post")).toBeNull();
    expect(normalizeLabel({ id: "a", rel: "yes" }, "post")).toBeNull();
    expect(normalizeLabel({ id: "a", rel: true, stance: "muy mal" }, "post")).toBeNull();
  });

  it("renders one line per item with the id the model must echo", () => {
    const p = renderPostsPrompt([
      { id: "p1", created_utc: 1704067200, title: "No hay laburo", selftext: "[removed]", link_flair_text: "Pregunta" },
    ]);
    expect(p).toContain("id: p1");
    expect(p).toContain("2024-01");
    expect(p).not.toContain("[removed]");
    const c = renderCommentsPrompt(
      [{ id: "c1", link_id: "t3_p1", parent_id: "t1_c0", created_utc: 1704067200, body: "coincido" }],
      new Map([["p1", { title: "No hay laburo", month: "2024-01", flair: "Pregunta" }]]),
      new Map([["c0", "el mercado está muerto"]])
    );
    expect(c).toContain("HILO p1");
    expect(c).toContain('responde a: "el mercado está muerto"');
    expect(c).toContain("id: c1");
  });

  it("schemas require the id and the label fields", () => {
    expect(POST_SCHEMA.properties.items.items.required).toContain("persona");
    expect(COMMENT_SCHEMA.properties.items.items.required).toEqual(["id", "rel", "stance", "themes", "ai", "event"]);
  });
});
