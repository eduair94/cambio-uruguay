import Aeromar from "./cambios/aeromar";
import AlterCambio from "./cambios/alter_cambio";
import BalumaCambio from "./cambios/baluma_cambio";
import CambioBCU from "./cambios/bcu";
import CambioBrou from "./cambios/brou";
import Cambial from "./cambios/cambial";
import Cambistar from "./cambios/cambistar";
import CambioCambilex from "./cambios/cambilex";
import Cambio18 from "./cambios/cambio18";
import Cambio3 from "./cambios/cambio_3";
import CambioAguerrebere from "./cambios/cambio_aguerrebere";
import CambioArgentino from "./cambios/cambio_argentino";
import CambioAspen from "./cambios/cambio_aspen";
import CambioFederal from "./cambios/cambio_federal";
import CambioFenix from "./cambios/cambio_fenix";
import CambioIngles from "./cambios/cambio_ingles";
import CambioMaiorano from "./cambios/cambio_maiorano";
import CambioMatriz from "./cambios/cambio_matriz";
import CambioMinas from "./cambios/cambio_minas";
import CambioMisiones from "./cambios/cambio_misiones";
import CambioObelisco from "./cambios/cambio_obelisco";
import CambioOpenn from "./cambios/cambio_openn";
import CambioOriental from "./cambios/cambio_oriental";
import CambioPando from "./cambios/cambio_pando";
import CambioPernas from "./cambios/cambio_pernas";
import CambioPrincipal from "./cambios/cambio_principal";
import CambioRegul from "./cambios/cambio_regul";
import CambioRomantico from "./cambios/cambio_romantico";
import CambioSaltoGrande from "./cambios/cambio_salto_grande";
import CambioSicurezza from "./cambios/cambio_sicurezza";
import CambioSir from "./cambios/cambio_sir";
import CambioVarzy from "./cambios/cambio_varzy";
import CambioVelso from "./cambios/cambio_velso";
import CambioVexel from "./cambios/cambio_vexel";
import CambioYoung from "./cambios/cambio_young";
import Eurodracma from "./cambios/eurodracma";
import CambioFortex from "./cambios/fortex";
import CambioGales from "./cambios/gales";
import CambioIndumex from "./cambios/indumex";
import Itau from "./cambios/itau";
import CambioLaFavorita from "./cambios/lafavorita";
import MasCambio from "./cambios/mas_cambio";
import Nonica from "./cambios/nonica";
import CambioOca from "./cambios/oca";
import CambioPrex from "./cambios/prex";
import Rynder from "./cambios/rynder";
import CambioScotiabank from "./cambios/scotiabank";
import CambioSantander from "./cambios/santander";
import CambioSuizo from "./cambios/suizo";
import Tradelix from "./cambios/tradelix";
import CambioVarlix from "./cambios/varlix";

export const origins = {
  cambio_aguerrebere: CambioAguerrebere,
  la_favorita: CambioLaFavorita,
  cambio_minas: CambioMinas,
  cambio_regul: CambioRegul,
  cambio_maiorano: CambioMaiorano,
  oca: CambioOca,
  prex: CambioPrex,
  scotiabank: CambioScotiabank,
  santander: CambioSantander,
  alter_cambio: AlterCambio,
  cambio_rynder: Rynder,
  cambio_sir: CambioSir,
  aeromar: Aeromar,
  brou: CambioBrou,
  fortex: CambioFortex,
  cambio_argentino: CambioArgentino,
  cambio_federal: CambioFederal,
  cambio_romantico: CambioRomantico,
  itau: Itau,
  cambio_principal: CambioPrincipal,
  cambio_young: CambioYoung,
  //cambio_salto_grande: CambioSaltoGrande,
  cambio_3: Cambio3,
  cambio_openn: CambioOpenn,
  cambial: Cambial,
  cambistar: Cambistar,
  cambio_pando: CambioPando,
  //mas_cambio: MasCambio,
  cambio_fenix: CambioFenix,
  cambio_oriental: CambioOriental,
  baluma_cambio: BalumaCambio, // 2026-07: re-verified live, rate table working again
  cambio_varzy: CambioVarzy,
  eurodracma: Eurodracma,
  nonica: Nonica,
  gales: CambioGales,
  // cambio_vexel: CambioVexel, // 2026-06: web server down (DNS resolves, no HTTP response). Re-enable when site is back.
  // cambio_velso: CambioVelso, // 2026-06: published rate table abandoned (last modified 12/02/2025). Re-enable when site updates again.
  tradelix: Tradelix,
  cambio_sicurezza: CambioSicurezza,
  cambio_pernas: CambioPernas,
  cambio_misiones: CambioMisiones,
  cambio_obelisco: CambioObelisco,
  suizo: CambioSuizo,
  cambio_ingles: CambioIngles,
  bcu: CambioBCU,
  cambilex: CambioCambilex,
  // aspen: CambioAspen, // 2026-06: site misconfigured (root 301 -> broken path, /sitio returns 503). Re-enable when fixed.
  matriz: CambioMatriz,
  cambio18: Cambio18,
  indumex: CambioIndumex,
  varlix: CambioVarlix,
};

/**
 * Location auditing also covers casas whose quotation scraper is temporarily
 * disabled. Their physical branches can remain open even when their online
 * rate table is unavailable.
 */
export const locationOrigins = {
  ...origins,
  cambio_salto_grande: CambioSaltoGrande,
  mas_cambio: MasCambio,
  cambio_vexel: CambioVexel,
  cambio_velso: CambioVelso,
  aspen: CambioAspen,
};
