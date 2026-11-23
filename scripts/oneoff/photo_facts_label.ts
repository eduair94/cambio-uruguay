// La página para que una PERSONA etiquete lo que el modelo dijo de las fotos (docs/app/PHOTO_FACTS.md).
//
//   npm run photo_facts_label -- [--per=40] [--out=<archivo.html>]
//
// SÓLO LECTURA: el `.env` local apunta a la base de producción, y esto nunca escribe en ella. Arma una
// muestra estratificada de `photofacts` (para cada atributo, avisos donde el modelo lo afirmó y avisos
// donde no) y escribe un HTML autocontenido en docs/seo/data/fotos-etiquetado/, que está en
// .gitignore: el repo es público y la página enlaza fotos de avisos ajenos. Las fotos se cargan desde
// el portal; las etiquetas quedan en el navegador y se exportan a un JSON que lee photo_facts_eval.
import "dotenv/config";
import fs from "fs";
import path from "path";
import { appConnection, appDbConfigured } from "../../classes/appdb";
import { LABEL_ATTRIBUTES, claimsOf, stratifiedSample } from "../../classes/photofacts/evaluate";
import { PHOTO_FACTS_COLLECTION } from "../../classes/photofacts/store";

const NAMES: Record<string, string> = {
  balconyTerrace: "Balcón o terraza",
  patioGarden: "Patio o jardín",
  barbecue: "Parrillero",
  pool: "Piscina",
  acUnit: "Aire acondicionado",
  integratedKitchen: "Cocina integrada",
  furniture: "Mobiliario",
  render: "Hay algún render",
  watermark: "Hay marca de agua o texto",
};

const arg = (name: string): string | undefined => process.argv.find(a => a.startsWith(`--${name}=`))?.split("=")[1];

function claimText(doc: any, attribute: string): string {
  if (attribute === "furniture") {
    const value = doc.facts?.furniture;
    const photo = doc.facts?.furniturePhoto;
    return value === "si" ? `amueblada (foto ${photo})` : value === "no" ? `vacía (foto ${photo})` : "no se sabe";
  }
  if (attribute === "render" || attribute === "watermark") {
    const hits = (doc.photos ?? []).map((p: any, i: number) => (p?.[attribute] ? i : -1)).filter((i: number) => i >= 0);
    return hits.length ? `sí, foto ${hits.join(", ")}` : "no";
  }
  const photo = doc.facts?.seen?.[attribute];
  return typeof photo === "number" ? `se ve en la foto ${photo}` : "no se ve";
}

async function main(): Promise<void> {
  if (!appDbConfigured()) throw new Error("APP_MONGO_URI is required");
  const per = Math.max(1, Number(arg("per")) || 40);
  const connection = appConnection();
  await connection.asPromise();
  const docs = await connection
    .collection(PHOTO_FACTS_COLLECTION)
    .find({ ok: true }, { projection: { _id: 1, vertical: 1, source: 1, propertyKey: 1, photos: 1, facts: 1, note: 1, model: 1 } })
    .toArray();
  const sample = stratifiedSample(docs as any[], per);
  const items = sample.map((doc: any) => ({
    id: String(doc._id),
    vertical: doc.vertical,
    source: doc.source,
    link: doc.vertical === "venta" ? `https://cambio-uruguay.com/venta-viviendas-uruguay/${doc.propertyKey}` : `https://cambio-uruguay.com/alquileres/${doc.propertyKey}`,
    model: doc.model,
    note: doc.note,
    photos: (doc.photos ?? []).map((p: any) => ({ url: p.url, kind: p.kind })),
    claims: LABEL_ATTRIBUTES.map(attribute => ({ attribute, name: NAMES[attribute], positive: claimsOf(doc)[attribute], text: claimText(doc, attribute) })),
  }));
  const day = new Date().toISOString().slice(0, 10);
  const out = arg("out") ?? path.join("docs", "seo", "data", "fotos-etiquetado", `${day}.html`);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, page(items, day), "utf8");
  console.log(`[photo-facts-label] ${items.length} avisos de ${docs.length} → ${out}`);
  await connection.close();
}

function page(items: unknown[], day: string): string {
  const data = JSON.stringify(items).replace(/</g, "\\u003c");
  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="referrer" content="no-referrer"><title>Etiquetar fotos ${day}</title>
<style>
body{font:14px/1.4 system-ui,sans-serif;margin:0 auto;max-width:1100px;padding:16px;background:#fafafa;color:#222}
header{position:sticky;top:0;background:#fafafa;padding:8px 0;border-bottom:1px solid #ddd;z-index:2;display:flex;gap:12px;align-items:center;flex-wrap:wrap}
article{background:#fff;border:1px solid #ddd;border-radius:8px;margin:16px 0;padding:12px}
.photos{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:6px}
figure{margin:0;position:relative}figure img{width:100%;height:130px;object-fit:cover;border-radius:4px;cursor:zoom-in}
figcaption{position:absolute;left:4px;top:4px;background:#000a;color:#fff;padding:0 5px;border-radius:3px;font-size:12px}
table{width:100%;border-collapse:collapse;margin-top:8px}td{padding:4px;border-top:1px solid #eee}
button{border:1px solid #bbb;background:#fff;border-radius:4px;padding:3px 8px;cursor:pointer}
button.on[data-v=correcto]{background:#c8f0c8}button.on[data-v=incorrecto]{background:#f6c6c6}button.on[data-v=no_se_ve]{background:#ddd}
img.big{position:fixed;inset:5vh 5vw;width:90vw;height:90vh;object-fit:contain;background:#000d;z-index:9}
</style></head><body>
<header><strong>Etiquetado de fotos · ${day}</strong><span id="count"></span><button id="export">Exportar JSON</button>
<span>Marcá si lo que dice el modelo es correcto mirando las fotos. "No se ve" = las fotos no alcanzan para decidir.</span></header>
<main id="list"></main>
<script>
const ITEMS=${data};
const KEY="photofacts-labels-${day}";
let labels={};try{labels=JSON.parse(localStorage.getItem(KEY)||"{}")}catch(e){}
const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(labels))}catch(e){};count()};
const count=()=>{document.getElementById("count").textContent=Object.keys(labels).length+" etiquetas"};
const list=document.getElementById("list");
for(const item of ITEMS){
  const a=document.createElement("article");
  const photos=item.photos.map((p,i)=>'<figure><img loading="lazy" referrerpolicy="no-referrer" src="'+encodeURI(p.url)+'" alt="foto '+i+'"><figcaption>'+i+' · '+(p.kind||"")+'</figcaption></figure>').join("");
  const rows=item.claims.map(c=>{const k=item.id+"|"+c.attribute;return '<tr><td>'+c.name+'</td><td>el modelo: <b>'+c.text+'</b></td><td>'+["correcto","incorrecto","no_se_ve"].map(v=>'<button data-k="'+k+'" data-v="'+v+'" class="'+(labels[k]&&labels[k].verdict===v?"on":"")+'">'+v.replace(/_/g," ")+'</button>').join(" ")+'</td></tr>'}).join("");
  a.innerHTML='<div><b>'+item.id+'</b> · '+item.source+' · <a href="'+item.link+'" target="_blank" rel="noopener">ficha</a> · '+(item.note||"")+'</div><div class="photos">'+photos+'</div><table>'+rows+'</table>';
  list.appendChild(a);
}
const claimOf=k=>{const [id,attribute]=k.split("|");const item=ITEMS.find(i=>i.id===id);const c=item&&item.claims.find(x=>x.attribute===attribute);return {id,attribute,positive:!!(c&&c.positive)}};
list.addEventListener("click",e=>{
  const b=e.target.closest("button");
  if(b){const k=b.dataset.k;labels[k]={...claimOf(k),verdict:b.dataset.v};b.parentElement.querySelectorAll("button").forEach(x=>x.classList.toggle("on",x===b));save();return}
  const img=e.target.closest("img");if(img){img.classList.toggle("big")}
});
document.getElementById("export").addEventListener("click",()=>{
  const blob=new Blob([JSON.stringify(Object.values(labels),null,1)],{type:"application/json"});
  const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="etiquetas-${day}.json";a.click();
});
count();
</script></body></html>`;
}

main().catch(error => {
  console.error("[photo-facts-label] fallo", error instanceof Error ? error.message : error);
  process.exit(1);
});
