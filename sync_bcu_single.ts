import { GoogleSpreadsheet } from "google-spreadsheet";
import BCU_Details from "./classes/bcu_details";
import { cambio_info } from "./classes/cambioInfo";
import { MongooseServer } from "./classes/database";
import { origins } from "./classes/origins";
import * as credentials from "./sheet_key.json";

const origin = process.argv[2];
const find = origins[origin];
if (!find) {
    throw new Error("Origin not found: " + origin);
}

async function main() {
    await MongooseServer.startConnectionPromise();
    const b = new BCU_Details();
    const res_sync = await b.sync_single(origins, origin, 0, 1);
    console.log("Response sync", res_sync);
    // Add Rows to Sheet.
    const info = await cambio_info.getMarkets({origin: origin});
    const document = new GoogleSpreadsheet("1yKfUC3EZbpiFD-6yJuoUewgjjzA2yv9zhy7a0G2zD30");
    await document.useServiceAccountAuth(credentials);
    await document.loadInfo();
    const sheet = document.sheetsByIndex[0];
    const data = info.map((el) => {
        return {
            ID: el.id,
            Local: el.origin.toUpperCase(),
            Departamento: el.Departamento,
            Localidad: el.Localidad,
            Dirección: el.Direccion,
            Telefono: el.Telefono,
            Nombre: el.Nombre,
            Status: 1
        };
    });
    const res_sheet = await sheet.addRows(data);

    console.log("Response finish", res_sheet);
    process.exit(1);
}

main();