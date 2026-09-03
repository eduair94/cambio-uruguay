// Sonda de las dos etapas gratis: ¿el autocompletado contesta, y qué queda después de los filtros?
// Sin Mongo y sin SERP, para poder correrla en cualquier máquina antes de desplegar el job.
//
//   npm run probe_demand -- 40      (40 semillas; sin argumento, todas)
import { isUruguayan } from "../../classes/demand/classify";
import { buildSeeds, harvest } from "../../classes/demand/harvest";
import { topicFor } from "../../classes/demand/refresh";
import { SITE_TOPICS } from "../../classes/gaps/topics";

(async () => {
  const all = buildSeeds(SITE_TOPICS);
  const limit = Number(process.argv[2]) || all.length;
  const seeds = all.slice(0, limit);
  const out = await harvest(seeds);
  const local = out.filter((s) => isUruguayan(s.query));
  const scoped = local.map((s) => ({ ...s, topic: topicFor(s.query) })).filter((s) => s.topic);

  console.log(
    `semillas ${seeds.length} · sugerencias ${out.length} · uruguayas ${local.length} · en tema ${scoped.length}`
  );
  for (const s of scoped.slice(0, 40)) console.log(`  ${s.rank} [${s.topic}] ${s.query}`);
})();
