import { JWT } from "google-auth-library";
import { GoogleSpreadsheet } from "google-spreadsheet";

/** The fields of the service-account key (sheet_key.json) that authenticate against Sheets. */
export interface ServiceAccountKey {
  client_email: string;
  private_key: string;
}

/**
 * A spreadsheet opened as the service account in sheet_key.json. Since google-spreadsheet 4 the
 * auth client goes into the constructor (the old `useServiceAccountAuth()` is gone); call
 * `loadInfo()` on the result before reading its sheets.
 */
export function openSpreadsheet(id: string, key: ServiceAccountKey): GoogleSpreadsheet {
  const auth = new JWT({
    email: key.client_email,
    key: key.private_key,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  return new GoogleSpreadsheet(id, auth);
}
