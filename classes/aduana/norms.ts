// The weekly legal-fact re-check. The AI's job here is to NOTICE a change, not to make one.
//
// THE INVARIANT: no code path in this file ever assigns a proposal's `value` to a fact. Not when
// the proposal is officially sourced, not when it is in range, not when the model insists. The
// only field the refresh can write is `aiCheckedAt`. A proposal's value is *compared*, never
// *copied* — so the worst a hallucination can do is nag us. It cannot put a wrong number in front
// of somebody about to pay it. We have shipped wrong import figures once; not twice.
//
// Four deterministic gates, all of which a proposal must clear before it may even re-stamp a date:
//   1. GROUNDED  — the model must have actually retrieved the page it cites (its sourceUrl host
//      must appear among the URIs Google's grounding metadata says it fetched). A citation to a
//      page it never opened is a hallucinated citation. Host-only matching is coarse (see
//      isGrounded's doc), so two more checks ride along with this gate: the citation may not be a
//      bare homepage, and it must be on THIS fact's own `sources[].url` host — "an official
//      domain" is not "the right official page".
//   2. OFFICIAL  — that source must be an official domain. A newspaper is not the law.
//   3. IN RANGE  — the value must be inside the declared plausible range for that fact, and a fact
//      with NO declared range (the two unsourceable DNA assertions) can never take a number at all.
//   4. UNCHANGED — if it DIFFERS from what we publish, it is not published: the last-good value
//      stays and the fact id goes to pendingReview for a human.
//
// pendingReview discharges: a fact flagged in an earlier run whose dispute is resolved THIS run
// (grounded, own source, in range, unchanged) is removed from pendingReview when `refreshNorms`
// rebuilds it — see refreshNorms's doc. Everything else a human hasn't looked at yet stays flagged.
//
// And `verifiedAt` is HUMAN-ONLY. A machine's re-read is not a human's verification: a confirmation
// from the AI sets `aiCheckedAt`, which the page renders as "último control automático", never as
// "verificado contra la norma".
import { FACT_RANGES, OFFICIAL_HOSTS } from "./baseline";
import { askGrounded, geminiConfigured } from "./gemini";
import type { AduanaDoc, AduanaFact, Source } from "./types";

/** Facts per AI call. One call for all 52 is ~2.5k tokens of reply — one truncation loses them all. */
const BATCH_SIZE = 10;

interface Proposal {
  id: string;
  value: number | string;
  sourceUrl: string;
  article?: string;
}

const hostOf = (url: string): string | null => {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
};

const safeUrl = (url: string): URL | null => {
  try {
    return new URL(url);
  } catch {
    return null;
  }
};

const isOfficial = (url: string): boolean => {
  const host = hostOf(url);
  if (!host) return false;
  return OFFICIAL_HOSTS.some((h) => host === h || host.endsWith(`.${h}`));
};

/**
 * Did the model actually open the page it is citing?
 *
 * `groundingUris` are the pages Gemini's grounding metadata says it retrieved (see gemini.ts,
 * which resolves Google's redirect wrappers back into real URLs). No grounding at all ⇒ nothing is
 * admissible: an ungrounded reply is the model answering from memory, which is precisely the
 * "everything confirmed, nothing read" failure this gate exists to stop.
 *
 * Matching is by HOST, not by full URL: Google's grounding chunks frequently only survive as the
 * source domain, and an official norm on impo.com.uy routinely lives behind several equivalent
 * paths. Host-level is the honest precision the API gives us — combined with gate 2 it asserts
 * "the model really did fetch a page on the official host it cites", and gate 4 still means the
 * number itself can never move.
 *
 * Host-only matching has a hole this function does not close on its own: EVERY page on `gub.uy`
 * shares a host, so a citation to the bare homepage `https://www.gub.uy/` — never opened for any
 * specific norm — grounds just as well as a citation to the actual decree, as long as the model
 * retrieved *some* gub.uy page in the same call. `applyProposals` closes that hole with two more
 * checks run after this one: a citation whose path is just `/` (a homepage, never a real page of
 * law) is refused outright, and a citation on an official host that is not THIS fact's own
 * `sources[].url` host is refused too — "official" is necessary but not sufficient; it has to be
 * the right official page.
 */
const isGrounded = (sourceUrl: string, groundingUris: string[]): boolean => {
  const host = hostOf(sourceUrl);
  if (!host) return false;
  return groundingUris.some((u) => hostOf(u) === host);
};

/**
 * A proposal is in range when its value sits inside the fact's declared band.
 *
 * Two deliberate behaviours:
 *  - THE DNA LOCK. A fact with no `FACT_RANGES` entry is not a numeric fact (see the orphan-range
 *    test in tests/aduana/baseline.test.ts): it is one of the two unsourceable DNA assertions
 *    (`general.dua_por_persona_por_anio`, `despachante.dna_lo_exige_sobre_800`), whose value is a
 *    quotation. A *number* proposed for one of those has nothing to be checked against, so it is
 *    refused outright — the AI may not re-number an assertion nobody can source.
 *  - A numeric string ("800") for a numeric fact (800) is coerced and range-checked instead of
 *    being rejected on its type. Rejecting it would defer the id to pendingReview EVERY week, and
 *    an id that cries wolf weekly is how a human stops reading the list at all. Safe by
 *    construction: nothing downstream ever writes the proposal's value.
 */
const inRange = (id: string, value: number | string): boolean => {
  const range = FACT_RANGES[id];
  if (!range) return typeof value !== "number"; // the DNA lock
  const n = typeof value === "number" ? value : Number(String(value).trim());
  if (!Number.isFinite(n)) return false;
  return n >= range[0] && n <= range[1];
};

function parseProposals(raw: unknown): Proposal[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (p): p is Proposal =>
      !!p &&
      typeof (p as Proposal).id === "string" &&
      typeof (p as Proposal).sourceUrl === "string" &&
      ["number", "string"].includes(typeof (p as Proposal).value)
  );
}

/**
 * The gate. Pure and synchronous — every test in tests/aduana/norms.test.ts hits this function
 * directly, because this is the whole thing that stands between an AI proposal and the page.
 *
 * `current` and the returned facts share the same ids and order. **`value` is never written, and
 * neither is `verifiedAt`**: the only field this function can change is `aiCheckedAt`, and only on
 * a proposal that is grounded, on its OWN source's host (not merely some official host — see the
 * two checks right after the grounding gate below), in range, AND equal to what we already
 * publish. A fact object is returned by reference unless it was confirmed, which is what lets the
 * caller count confirmations by identity — and, in `refreshNorms`, discharge a stale
 * `pendingReview` flag once the same identity-diff shows the fact was actually reconfirmed.
 */
export function applyProposals(
  current: AduanaFact[],
  raw: unknown,
  groundingUris: string[],
  sources: Source[]
): { facts: AduanaFact[]; pendingReview: string[] } {
  const proposals = parseProposals(raw);
  const pendingReview: string[] = [];
  const today = new Date().toISOString().slice(0, 10);

  // Two proposals for the same id contradict each other, and `.find()` would silently obey the
  // first and drop the second — value-safe, but alarm-unsafe. Neither is trusted; the human looks.
  const occurrences = new Map<string, number>();
  for (const p of proposals) occurrences.set(p.id, (occurrences.get(p.id) ?? 0) + 1);

  const facts = current.map((fact) => {
    const seen = occurrences.get(fact.id) ?? 0;
    if (seen === 0) return fact; // the model said nothing about this fact — nothing happens
    if (seen > 1) {
      pendingReview.push(fact.id); // contradictory proposals for one fact
      return fact;
    }

    const p = proposals.find((x) => x.id === fact.id)!;

    if (!isGrounded(p.sourceUrl, groundingUris)) {
      pendingReview.push(fact.id); // cited a page it never retrieved
      return fact;
    }

    // GATE 1b/1c — a citation being on SOME official host is not enough (see isGrounded's doc):
    // it has to be a real page (not a bare homepage) on THIS fact's own source host.
    const own = sources.find((s) => s.id === fact.sourceId);
    const u = safeUrl(p.sourceUrl);
    if (!u || u.pathname.length <= 1) {
      pendingReview.push(fact.id); // a homepage is not a citation
      return fact;
    }
    if (own && hostOf(p.sourceUrl) !== hostOf(own.url)) {
      pendingReview.push(fact.id); // grounded on an official host, but not this fact's own source
      return fact;
    }

    if (!isOfficial(p.sourceUrl) || !inRange(fact.id, p.value)) {
      pendingReview.push(fact.id);
      return fact;
    }
    if (String(p.value) !== String(fact.value)) {
      pendingReview.push(fact.id); // a real change of law is confirmed by a human, never by us
      return fact;
    }

    // Confirmed: same value, read off the norm. NOT verifiedAt — a machine's re-read is not a
    // human's verification.
    return { ...fact, aiCheckedAt: today };
  });

  return { facts, pendingReview };
}

/** A model that has been told "no markdown" still fences its JSON often enough to matter. */
function stripFence(text: string): string {
  const t = text.trim();
  if (!t.startsWith("```")) return t;
  return t
    .replace(/^```[a-zA-Z]*\s*/, "")
    .replace(/\s*```$/, "")
    .trim();
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

/**
 * Ask a GROUNDED model, in batches, whether each norm still says what we publish — and run every
 * answer through applyProposals before any of it can touch the page.
 *
 * No-op without a GEMINI_API_KEY (the doc comes back by reference) — but NOT a silent one: a
 * skipped safety check must say so out loud, or everyone keeps assuming the gate is running. Every
 * other failure — no reply, a reply that doesn't parse, a reply that parses into something that
 * isn't an array — is logged and skipped: that batch simply produces no update. Never hand-repairs
 * malformed model output.
 *
 * `pendingReview` starts as a UNION with what the doc already carried, never a recomputation of
 * it — a human's open TODO from three weeks ago does not disappear because this week's reply was
 * junk. But it is not a pure ratchet either: an id whose fact was actually reconfirmed THIS run
 * (grounded, on its own source, in range, unchanged — see `applyProposals`) is discharged from the
 * union at the end, because a dispute that is resolved is not a dispute anymore, and a list that
 * only ever grows is a list a human eventually stops reading.
 */
export async function refreshNorms(doc: AduanaDoc): Promise<AduanaDoc> {
  if (!geminiConfigured()) {
    console.warn("[aduana] norms: no GEMINI_API_KEY — se omite el control de normas");
    return doc;
  }

  try {
    const batches = chunk(doc.facts, BATCH_SIZE);
    let facts = doc.facts;
    const flagged: string[] = [];
    let checked = 0;
    let confirmed = 0;

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      const tag = `batch ${i + 1}/${batches.length}`;

      const reply = await askGrounded(buildPrompt(batch, doc.sources));
      if (!reply) {
        console.warn(`[aduana] norms: no grounded reply for ${tag} — skipped`);
        continue;
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(stripFence(reply.text));
      } catch {
        console.warn(`[aduana] norms: ${tag} reply did not parse as JSON — skipped. Raw:`, reply.text.slice(0, 200));
        continue;
      }
      if (!Array.isArray(parsed)) {
        // Parsed, but it is not proposals: `{"error":"no encontré la norma"}`, `null`, `123`.
        // No update at all — and crucially, no wipe of anything already flagged.
        console.warn(`[aduana] norms: ${tag} reply is not an array — no update. Raw:`, reply.text.slice(0, 200));
        continue;
      }

      const before = facts;
      const result = applyProposals(before, parsed, reply.sourceUris, doc.sources);
      facts = result.facts;
      flagged.push(...result.pendingReview);
      checked += batch.length;
      // applyProposals returns a fact by reference unless it was confirmed, so identity counts it.
      confirmed += facts.filter((f, idx) => f !== before[idx]).length;
    }

    // Same identity trick as the confirmed-count above, but against the ORIGINAL doc.facts: any
    // fact whose reference changed across the whole run was confirmed this run, so its flag (if
    // it had one) is stale and gets discharged. Everything not confirmed — including ids flagged
    // just now — stays in the union.
    const confirmedIds = new Set(facts.filter((f, i) => f !== doc.facts[i]).map((f) => f.id));
    const pendingReview = [...new Set([...doc.pendingReview, ...flagged])].filter(
      (id) => !confirmedIds.has(id)
    );
    console.log(
      `[aduana] norms: ${checked}/${doc.facts.length} facts checked, ${confirmed} confirmed by the AI, ${flagged.length} flagged this run (${pendingReview.length} open in total)`
    );
    if (pendingReview.length > 0) {
      console.warn("[aduana] norms NEEDS A HUMAN — pendingReview:", pendingReview);
    }

    return { ...doc, facts, pendingReview };
  } catch (error: any) {
    console.warn("[aduana] norms: refreshNorms error:", error?.message || error);
    return doc;
  }
}

/**
 * The prompt for one batch: re-check the facts we already publish, against the norm we already
 * cite, by actually opening the official page.
 *
 * What is NOT in here, deliberately: the old "if you can't find the norm, repeat the currentValue
 * with the url already provided". That instruction described the guaranteed path — the model echoes
 * everything, every gate passes, and every date on the page gets re-stamped by a shrug. Omission is
 * now the honest answer: a fact the model could not verify is simply left out of the array, and an
 * omitted fact gets no aiCheckedAt, so its timestamp visibly goes stale instead of silently
 * refreshing.
 */
function buildPrompt(facts: AduanaFact[], sources: Source[]): string {
  const sourceById = new Map(sources.map((s) => [s.id, s]));
  const rows = facts.map((f) => {
    const src = sourceById.get(f.sourceId);
    return {
      id: f.id,
      currentValue: f.value,
      norm: src?.norm ?? "",
      article: f.article ?? "",
      url: src?.url ?? "",
    };
  });

  return `Sos un verificador de normas aduaneras uruguayas. Para cada hecho de la lista, BUSCÁ la norma citada en su fuente oficial (impo.com.uy o gub.uy), ABRÍ la página, leela, y confirmá si el valor que publicamos sigue vigente.
Devolvé SOLO un JSON array (sin markdown, sin \`\`\`, sin explicación), con un objeto por cada hecho que hayas podido verificar leyendo la norma:
[{"id":"<id>","value":<mismo tipo que currentValue>,"sourceUrl":"<url exacta de la página oficial que leíste>","article":"<articulo>"}]
REGLAS:
- Si NO encontraste la norma, no pudiste abrir la página, o no estás seguro: OMITÍ ese hecho, no lo incluyas en el array. Omitir es la respuesta correcta cuando no verificaste. Repetir el valor sin haberlo leído NO lo es.
- "sourceUrl" tiene que ser la página oficial que efectivamente abriste en esta búsqueda, no la que te pasamos de memoria.
- No inventes ids nuevos. No devuelvas texto fuera del JSON.

HECHOS:
${JSON.stringify(rows, null, 2)}`;
}
