// Guías de la tanda del 2026-11-22 (verano 2026-2027), elegidas con los datos de Search Console,
// del autocompletado uruguayo (`searchdemandqueues`) y de GA4: cada una contesta una consulta donde
// el sitio no aparecía y cae en la familia de las guías, que es la que más rinde por visita. Cada
// guía la redactó un agente que verificó cada cifra en fuente primaria el mismo día; las fuentes van
// en `sources`, los datos en su propio módulo y cada una tiene su test.
//
// - /guias/aumento-de-jubilaciones-uruguay (datos en `aumentoJubilaciones.ts`): el ajuste anual de
//   pasividades se busca entre diciembre y marzo y el sitio no tenía página. La guía se arma sola
//   con el provisorio y el definitivo de 2027 cuando se cargan sus constantes.
// - /guias/cuanto-cuesta-un-sepelio-uruguay (datos en `costoSepelio.ts`): las tasas oficiales de
//   los cementerios y las coberturas; las empresas fúnebres no publican precios.
// - /guias/usuario-personal-bps-uruguay (datos en `usuarioBps.ts`): media docena de páginas del
//   sitio piden ese usuario y ninguna explicaba cómo se saca.
//
// Las tres tienen fila en `docs/seo/experiments.json` con el commit que las publica.

import { aumentoJubilacionesGuide } from './guideVeranoAumentoJubilaciones'
import { costoSepelioGuide } from './guideVeranoCostoSepelio'
import type { Guide } from './guides'
import { usuarioBpsGuide } from './guideVeranoUsuarioBps'

export const verano2027Guides: readonly Guide[] = [
  aumentoJubilacionesGuide,
  costoSepelioGuide,
  usuarioBpsGuide,
]
