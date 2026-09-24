// La tabla por modelo que puntúa el asesor de compra (/que-auto-comprar-uruguay).
//
// Sale de los MISMOS avisos comparables que el informe del mercado (`reportable`) y se arma en la
// misma corrida, así que el asesor nunca dice un precio que el informe contradiga. Lo que agrega:
//
//  * VARIANTES combustible × caja. Un Corolla híbrido automático y uno a nafta manual no cuestan lo
//    mismo, no consumen lo mismo, y un eléctrico paga otra patente: promediarlos daría un auto que
//    no existe.
//  * Lo que la ficha técnica de los avisos dice del modelo: plazas, baúl, largo, potencia, tracción y
//    el equipamiento de seguridad como proporción de fichas que lo declaran (sí sobre sí+no). Lo que
//    la ficha no menciona no cuenta ni a favor ni en contra.
//  * La caída anual con la recta del informe, para TODOS los modelos que entran acá y no sólo los 40
//    del informe.
//  * El índice de repuestos del último relevamiento (classes/autos/repuestos.ts).
//
// La puntuación NO está acá: vive en `app/utils/carAdvisor.ts` y corre por pedido sobre esta tabla,
// porque depende de lo que cada persona contesta.
import { annualDropOf, depreciationOf, reportable } from "./report";
import { declaredRisks } from "./risk";
import { carSpecsOf } from "./specs";
import { quantile } from "./stats";
import { partsIndex, type CarPartsRecord } from "./repuestos";
import type { CarListing } from "./types";
import type {
  PublicCarAdvisorModel,
  PublicCarAdvisorShare,
  PublicCarAdvisorSnapshotData,
  PublicCarAdvisorVariant,
  PublicCarBodyType,
  PublicCarEquipment,
  PublicCarSpecs,
} from "./publicTypes";

export const CAR_ADVISOR_POLICY = {
  /** Un modelo entra con esto: debajo, cualquier consejo es anécdota. */
  minimumAdverts: 12,
  /** Una variante combustible × caja necesita esto para dar precios por año. */
  minimumVariantAdverts: 6,
  /** Y un año dentro de la variante, esto: el mismo mínimo que el tasador. */
  minimumYearAdverts: 3,
  /** Fichas que tienen que mencionar un equipamiento para publicar su proporción. */
  minimumShareN: 3,
} as const;

const round3 = (value: number): number => Math.round(value * 1000) / 1000;
const median = (values: readonly number[]): number | null => (values.length ? quantile(values, 0.5) : null);
const rounded = (value: number | null): number | null => (value === null ? null : Math.round(value));

function shareOf(specs: readonly PublicCarSpecs[], key: PublicCarEquipment): PublicCarAdvisorShare | null {
  const yes = specs.filter(spec => spec.equipment.includes(key)).length;
  const no = specs.filter(spec => spec.missing.includes(key)).length;
  return yes + no >= CAR_ADVISOR_POLICY.minimumShareN ? { share: round3(yes / (yes + no)), n: yes + no } : null;
}

function variantsOf(rows: readonly CarListing[]): PublicCarAdvisorVariant[] {
  const groups = new Map<string, CarListing[]>();
  for (const row of rows) {
    if (!row.fuel || !row.transmission || row.fuel === "gnc") continue;
    const key = `${row.fuel}|${row.transmission}`;
    groups.set(key, [...(groups.get(key) ?? []), row]);
  }
  return [...groups.values()]
    .filter(group => group.length >= CAR_ADVISOR_POLICY.minimumVariantAdverts)
    .map(group => {
      const byYear = new Map<number, CarListing[]>();
      for (const row of group) byYear.set(row.year, [...(byYear.get(row.year) ?? []), row]);
      const economy = group.filter(row => row.fuelEconomy && row.fuelEconomy.litersPer100Km > 0);
      const liters = median(economy.map(row => row.fuelEconomy!.litersPer100Km));
      return {
        fuel: group[0]!.fuel!,
        transmission: group[0]!.transmission!,
        adverts: group.length,
        litersPer100Km: liters === null ? null : Math.round(liters * 10) / 10,
        consumptionDeclaredShare: economy.length
          ? round3(economy.filter(row => row.fuelEconomy!.basis === "advert").length / economy.length)
          : null,
        years: [...byYear.entries()]
          .filter(([, cohort]) => cohort.length >= CAR_ADVISOR_POLICY.minimumYearAdverts)
          .sort(([a], [b]) => b - a)
          .map(([year, cohort]) => {
            const prices = cohort.map(row => row.priceUsd);
            const kms = cohort.filter(row => row.kmQuality === "ok" && row.km !== null).map(row => row.km!);
            return {
              year,
              n: cohort.length,
              p25: Math.round(quantile(prices, 0.25)),
              median: Math.round(quantile(prices, 0.5)),
              p75: Math.round(quantile(prices, 0.75)),
              kmMedian: rounded(median(kms)),
            };
          }),
      };
    })
    .filter(variant => variant.years.length > 0)
    .sort((a, b) => b.adverts - a.adverts);
}

function bodyOf(rows: readonly CarListing[]): { body: PublicCarBodyType | null; bodyShare: number | null } {
  const counts = new Map<PublicCarBodyType, number>();
  let known = 0;
  for (const row of rows) {
    if (!row.body) continue;
    known++;
    counts.set(row.body.type, (counts.get(row.body.type) ?? 0) + 1);
  }
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
  return top ? { body: top[0], bodyShare: round3(top[1] / known) } : { body: null, bodyShare: null };
}

export function buildCarAdvisor(
  listings: readonly CarListing[],
  options: { maxYear: number; parts: readonly CarPartsRecord[]; typicalDrop: number | null },
): PublicCarAdvisorSnapshotData {
  const byModel = new Map<string, CarListing[]>();
  for (const row of listings.filter(reportable)) byModel.set(row.marketSlug, [...(byModel.get(row.marketSlug) ?? []), row]);
  const { baseline, byModel: partsByModel } = partsIndex(options.parts);

  const models: PublicCarAdvisorModel[] = [];
  for (const [marketSlug, group] of byModel) {
    if (group.length < CAR_ADVISOR_POLICY.minimumAdverts) continue;
    const variants = variantsOf(group);
    if (!variants.length) continue;
    const specs = group.map(row => carSpecsOf(row.detail)).filter((spec): spec is PublicCarSpecs => !!spec);
    const drivetrains = specs.map(spec => spec.drivetrain).filter((value): value is NonNullable<typeof value> => !!value);
    const fourByFour = drivetrains.length >= CAR_ADVISOR_POLICY.minimumShareN
      ? { share: round3(drivetrains.filter(value => value === "4x4" || value === "integral").length / drivetrains.length), n: drivetrains.length }
      : null;
    const numbers = (pick: (spec: PublicCarSpecs) => number | null) =>
      rounded(median(specs.map(pick).filter((value): value is number => value !== null)));
    models.push({
      marketSlug,
      brand: group[0]!.brand,
      model: group[0]!.model,
      brandSlug: group[0]!.brandSlug,
      modelSlug: group[0]!.modelSlug,
      adverts: group.length,
      sellers: new Set(group.map(row => row.sellerId ?? row.key)).size,
      ...bodyOf(group),
      specsN: specs.length,
      seats: numbers(spec => spec.seats),
      trunkL: numbers(spec => spec.trunkL),
      lengthMm: numbers(spec => spec.lengthMm),
      powerHp: numbers(spec => spec.powerHp),
      fourByFour,
      abs: shareOf(specs, "abs"),
      airbags: shareOf(specs, "airbag_pasajero"),
      esc: shareOf(specs, "control_estabilidad"),
      isofix: shareOf(specs, "isofix"),
      annualDrop: annualDropOf(depreciationOf(group, options.maxYear)),
      dealerShare: round3(group.filter(row => row.sellerType === "dealer").length / group.length),
      declaredRiskShare: round3(group.filter(row => declaredRisks(row.title, row.detail?.description ?? "").length > 0).length / group.length),
      variants,
      parts: partsByModel.get(marketSlug) ?? null,
    });
  }
  models.sort((a, b) => b.adverts - a.adverts || a.marketSlug.localeCompare(b.marketSlug));
  return { typicalDrop: options.typicalDrop, partsBaseline: baseline, models };
}
