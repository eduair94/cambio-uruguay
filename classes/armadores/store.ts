// Un documento vivo (`armadorsnapshots{key:"mvd"}`), reescrito cada día, y la colección privada
// de descripciones de Facebook ya leídas.
import { ArmadorFacebookDetailModel, type ArmadorFacebookDetailDocument } from "../models/ArmadorFacebookDetail";
import { ArmadorSnapshotModel } from "../models/ArmadorSnapshot";
import { ARMADORES_KEY, type ArmadorSnapshot } from "./types";

export async function loadArmadores(): Promise<ArmadorSnapshot | null> {
  return ArmadorSnapshotModel.findOne({ key: ARMADORES_KEY }).lean<ArmadorSnapshot>().exec();
}

export async function saveArmadores(snapshot: ArmadorSnapshot): Promise<void> {
  await ArmadorSnapshotModel.updateOne({ key: ARMADORES_KEY }, { $set: { ...snapshot, key: ARMADORES_KEY } }, { upsert: true });
}

/** Días tras los que una ficha ya leída se vuelve a leer (el anunciante edita su lista de precios). */
export const FACEBOOK_DETAIL_REREAD_DAYS = 60;

export async function loadFacebookDetails(ids: readonly string[]): Promise<Map<string, ArmadorFacebookDetailDocument>> {
  if (!ids.length) return new Map();
  const rows = await ArmadorFacebookDetailModel.find({ id: { $in: [...ids] } }).lean<ArmadorFacebookDetailDocument[]>().exec();
  return new Map(rows.map(row => [row.id, row]));
}

export async function saveFacebookDetails(rows: readonly ArmadorFacebookDetailDocument[]): Promise<void> {
  if (!rows.length) return;
  await ArmadorFacebookDetailModel.bulkWrite(rows.map(row => ({
    updateOne: { filter: { id: row.id }, update: { $set: row }, upsert: true },
  })));
}
