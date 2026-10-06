import moment from "moment";
import { cambio_info } from "./classes/cambioInfo";
import { MongooseServer } from "./classes/database";
import { isSheetPermissionError, openSpreadsheet, sheetPermissionHelp } from "./classes/sheets";
import sentryInit from "./sentry";
import * as credentials from "./sheet_key.json";

const SHEET_ID = "1rnP2b0TT-cqDzP0nrJSU1BVCJx6eynJuuQx-ZIFuWCo";

const main = async () => {
  sentryInit();
  await MongooseServer.startConnectionPromise();
  const info = await cambio_info.get_data();
  const document = openSpreadsheet(SHEET_ID, credentials);
  try {
    await document.loadInfo();
    const sheet = document.sheetsByIndex[0];
    // The first write: a sheet the account may only read fails here, before any row is cleared.
    await sheet.setHeaderRow(["Local", "Moneda", "Compra", "Venta", "Tipo", "Fecha"]);
    await sheet.clearRows();
    const data = info.map((el) => {
      return {
        Local: el.origin.toUpperCase(),
        Moneda: el.code,
        Compra: el.buy,
        Venta: el.sell,
        Tipo: el.type,
        Fecha: moment(el.date).format("DD/MM/YYYY"),
      };
    });
    await sheet.addRows(data);
    console.log(`[sync_sheet] ${data.length} rows written`);
  } catch (error) {
    // Measured 2026-10-05 (Sentry CAMBIO-URUGUAY-BACKEND-15): the account reads the file but has
    // no edit rights (Drive `capabilities.canEdit: false`), and the sheet was last modified in May
    // 2023. That is a sharing setting only the file's owner can change, so it is logged with the
    // exact fix instead of reported as a crash on every deploy restart.
    if (isSheetPermissionError(error)) {
      console.error(`[sync_sheet] ${sheetPermissionHelp(SHEET_ID, credentials)}`);
      return;
    }
    throw error;
  }
};

main();
