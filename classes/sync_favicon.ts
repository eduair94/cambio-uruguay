import { Cambio } from "./cambio";
import { cambio_info } from "./cambioInfo";
import CambioBCU from "./cambios/bcu";
import CambioBrou from "./cambios/brou";
import CambioCambilex from "./cambios/cambilex";
import Cambio18 from "./cambios/cambio18";
import CambioAspen from "./cambios/cambio_aspen";
import CambioIngles from "./cambios/cambio_ingles";
import CambioMatriz from "./cambios/cambio_matriz";
import CambioSir from "./cambios/cambio_sir";
import CambioFortex from "./cambios/fortex";
import CambioGales from "./cambios/gales";
import CambioIndumex from "./cambios/indumex";
import CambioLaFavorita from "./cambios/lafavorita";
import CambioPrex from "./cambios/prex";
import CambioSuizo from "./cambios/suizo";
import CambioVarlix from "./cambios/varlix";

const sync_favicon = async () => {
  const origins = {
    suizo: CambioSuizo,
    cambio_sir: CambioSir,
    cambio_ingles: CambioIngles,
    la_favorita: CambioLaFavorita,
    bcu: CambioBCU,
    brou: CambioBrou,
    cambilex: CambioCambilex,
    aspen: CambioAspen,
    matriz: CambioMatriz,
    cambio18: Cambio18,
    fortex: CambioFortex,
    indumex: CambioIndumex,
    prex: CambioPrex,
    varlix: CambioVarlix,
  };
  await cambio_info.clearDB();
  for (let origin in origins) {
    try {
      const cambio: Cambio = new origins[origin](origin);
      await cambio.sync_favicon();
    } catch (e) {
      console.log(origin, e.message);
      process.exit(1);
    }
  }
  console.log("Finish");
};

export { sync_favicon };
