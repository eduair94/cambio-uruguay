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
/**
 * Google refused the service account: it can read the file but was not given edit rights (or none
 * at all). google-spreadsheet surfaces it as ky's HTTPError, "Google API error - [403] The caller
 * does not have permission". It is a sharing setting on the file, not a bug any retry can fix.
 */
export function isSheetPermissionError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const { response, message } = error as { response?: { status?: unknown }; message?: unknown };
  return (
    response?.status === 403 ||
    (typeof message === "string" && /\[403\]|caller does not have permission/i.test(message))
  );
}

/** What the owner has to do, with the identity Google needs on the share dialog. */
export function sheetPermissionHelp(sheetId: string, key: Pick<ServiceAccountKey, "client_email">) {
  return (
    `The service account ${key.client_email} cannot edit spreadsheet ${sheetId} ` +
    `(Google answered 403). Share https://docs.google.com/spreadsheets/d/${sheetId} with that ` +
    `address as Editor, or stop this job if nobody reads the sheet any more. This run was skipped.`
  );
}

export function openSpreadsheet(id: string, key: ServiceAccountKey): GoogleSpreadsheet {
  const auth = new JWT({
    email: key.client_email,
    key: key.private_key,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  return new GoogleSpreadsheet(id, auth);
}
