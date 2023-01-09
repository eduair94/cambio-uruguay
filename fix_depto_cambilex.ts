import { cambio_info } from "./classes/cambioInfo";
import { MongooseServer } from "./classes/database";

const main = async () => {
  await MongooseServer.startConnectionPromise();
  const info = await cambio_info.getMarkets({ origin: { $in: ["cambilex"] } });
  let departments = [];
  info.forEach((el) => {
    if (el.Departamento && !departments.includes(el.Departamento)) {
      departments.push(el.Departamento);
    }
  });
  await cambio_info.updateOne("cambilex", { departments });
  console.log(departments);
};

main();
