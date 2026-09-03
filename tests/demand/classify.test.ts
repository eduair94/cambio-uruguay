// El filtro que decide qué se escribe. Cada caso viene de un SERP uruguayo medido el 2026-09-03,
// no de un ejemplo inventado: son las tres formas que aparecieron escribiendo las dos primeras
// páginas a mano.
import { describe, expect, it } from "vitest";
import { assessSerp, buildQueue, scoreCandidate, type Candidate } from "../../classes/demand/classify";

describe("assessSerp", () => {
  it("no entra donde Google contesta solo, por más volumen que tenga", () => {
    const a = assessSerp({ domains: ["algo.com", "otro.com"], hasAnswerBox: true });
    expect(a.verdict).toBe("no-entrar");
    expect(a.reason).toMatch(/no existe/);
  });

  it("no entra en el nicho de las granjas de calculadoras", () => {
    // "cuánto me descuentan del sueldo uruguay", medido: siete dominios de calculadoras.
    const a = assessSerp({
      domains: [
        "salarioliquidouruguay.com/",
        "uy.talent.com/tax-calculator",
        "misalario.uy/",
        "toptrabajos.com/uy/blog/descuentos",
        "datosuruguay.com/calculadora-sueldo",
        "calcufacil.com.uy/",
      ],
      hasAnswerBox: false,
    });
    expect(a.verdict).toBe("no-entrar");
    expect(a.calculators).toBeGreaterThanOrEqual(2);
  });

  it("entra cuando arriba hay foros o redes: Google no encontró nada bueno", () => {
    // "preaviso renuncia uruguay días", medido: Reddit primero, Instagram tercero.
    const a = assessSerp({
      domains: [
        "reddit.com/r/uruguay/comments/18auin",
        "soslaboral.com.uy/la-renuncia",
        "instagram.com/p/DPLz5",
        "bizlatinhub.com/es/derecho-laboral",
      ],
      hasAnswerBox: false,
    });
    expect(a.verdict).toBe("escribir");
    expect(a.weak).toBe(2);
  });

  it("entra cuando el SERP es institucional e ilegible", () => {
    // "licencia por duelo uruguay", medido: BPS, IMPO, observatorio, PIT-CNT.
    const a = assessSerp({
      domains: [
        "www.bps.gub.uy/12395/ley18345",
        "www.impo.com.uy/bases/leyes/18345-2008/7",
        "observatorio.cuestaduarte.org.uy/sector",
        "pitcnt.uy/index.php/trabajadores",
      ],
      hasAnswerBox: false,
    });
    expect(a.verdict).toBe("escribir");
    expect(a.institutional).toBeGreaterThanOrEqual(2);
  });

  it("deja en dudoso lo que no es ninguna de las tres formas, en vez de adivinar", () => {
    const a = assessSerp({
      domains: ["unblog.com/x", "otroblog.com/y", "revista.com/z"],
      hasAnswerBox: false,
    });
    expect(a.verdict).toBe("dudoso");
    expect(a.reason).toMatch(/a mano/);
  });

  it("ignora el www y el protocolo al mirar el dominio", () => {
    const a = assessSerp({
      domains: ["https://www.bps.gub.uy/a", "https://impo.com.uy/b"],
      hasAnswerBox: false,
    });
    expect(a.institutional).toBe(2);
  });

  it("cuenta un subdominio de un organismo como institucional", () => {
    const a = assessSerp({ domains: ["servicios.gub.uy/x", "www.bps.gub.uy/y"], hasAnswerBox: false });
    expect(a.institutional).toBe(2);
  });
});

describe("scoreCandidate", () => {
  const base: Candidate = {
    query: "licencia por duelo uruguay",
    topic: "trabajo",
    rank: 0,
    coverage: 0,
    bestPath: null,
    serp: { verdict: "escribir", reason: "institucional", calculators: 0, institutional: 3, weak: 0 },
  };

  it("un hueco de la primera sugerencia con SERP flojo es lo mejor que hay", () => {
    expect(scoreCandidate(base).score).toBe(1);
  });

  it("baja cuando el sitio ya lo cubre, y dice cuál página", () => {
    const s = scoreCandidate({ ...base, coverage: 0.9, bestPath: "/licencias-especiales-uruguay" });
    expect(s.score).toBeCloseTo(0.1, 4);
    expect(s.why).toMatch(/\/licencias-especiales-uruguay/);
  });

  it("da cero si no se puede entrar, sin importar el resto", () => {
    const s = scoreCandidate({
      ...base,
      serp: { verdict: "no-entrar", reason: "caja de respuesta", calculators: 0, institutional: 0, weak: 0 },
    });
    expect(s.score).toBe(0);
    expect(s.why).toMatch(/caja de respuesta/);
  });

  it("lo que no se alcanzó a clasificar queda en la cola, no desaparece", () => {
    // El presupuesto de SERP es finito y el servidor de búsqueda a veces no contesta. Si un
    // candidato sin clasificar valiera cero, la cola escondería justo lo que nadie miró.
    const { serp, ...sinSerp } = base;
    const s = scoreCandidate(sinSerp);
    expect(s.score).toBeGreaterThan(0);
    expect(s.score).toBeLessThan(scoreCandidate(base).score);
    expect(s.why).toMatch(/a mano/);
  });

  // Search Console es la única señal que dice qué hace GOOGLE, no qué tenemos nosotros. Una
  // consulta donde el sitio ya aparece no es una página que falta: es una que hay que mejorar, y
  // escribir una segunda para la misma consulta fabrica la cannibalización que a este sitio le
  // costó 34.259 impresiones y 52 clics en el grupo de marca de BROU.
  it("baja mucho si Google ya nos muestra para esa consulta", () => {
    const s = scoreCandidate({
      ...base,
      known: { impressions: 900, clicks: 3, position: 11.4 },
    });
    expect(s.score).toBeLessThan(scoreCandidate(base).score);
    expect(s.why).toMatch(/ya aparecés en posición 11\.4/);
    expect(s.why).toMatch(/mejorar, no de escribir/);
  });

  it("no baja si aparecemos tan atrás que da igual", () => {
    // Posición 38 es la página cuatro: nadie la ve, y tratarla como cobertura esconde el hueco.
    const s = scoreCandidate({ ...base, known: { impressions: 40, clicks: 0, position: 38 } });
    expect(s.score).toBe(scoreCandidate(base).score);
  });

  it("una consulta que no está en el archivo se puntúa igual que antes", () => {
    expect(scoreCandidate({ ...base, known: undefined }).score).toBe(scoreCandidate(base).score);
  });

  it("sigue quedando en la cola, porque mejorar también es trabajo", () => {
    const out = buildQueue([{ ...base, known: { impressions: 900, clicks: 3, position: 11.4 } }]);
    expect(out).toHaveLength(1);
  });

  it("la sugerencia número ocho vale menos que la primera", () => {
    expect(scoreCandidate({ ...base, rank: 8 }).score).toBeLessThan(scoreCandidate(base).score);
  });
});

describe("buildQueue", () => {
  const c = (query: string, over: Partial<Candidate> = {}): Candidate => ({
    query,
    topic: "trabajo",
    rank: 0,
    coverage: 0,
    bestPath: null,
    serp: { verdict: "escribir", reason: "institucional", calculators: 0, institutional: 3, weak: 0 },
    ...over,
  });

  it("saca lo que está fuera de las temáticas del sitio", () => {
    const out = buildQueue([c("algo"), c("otra cosa", { topic: null })]);
    expect(out.map(x => x.query)).toEqual(["algo"]);
  });

  it("saca lo que no se puede ganar, para que la cola sea de trabajo y no de deseos", () => {
    const out = buildQueue([
      c("bueno"),
      c("perdido", {
        serp: { verdict: "no-entrar", reason: "calculadoras", calculators: 4, institutional: 0, weak: 0 },
      }),
    ]);
    expect(out.map(x => x.query)).toEqual(["bueno"]);
  });

  it("ordena por puntaje y desempata estable, para que la cola no baile entre corridas", () => {
    const out = buildQueue([c("zeta"), c("alfa"), c("media", { rank: 5 })]);
    expect(out.map(x => x.query)).toEqual(["alfa", "zeta", "media"]);
  });

  it("respeta el límite", () => {
    const many = Array.from({ length: 60 }, (_, i) => c(`consulta ${i}`));
    expect(buildQueue(many, 10)).toHaveLength(10);
  });
});
