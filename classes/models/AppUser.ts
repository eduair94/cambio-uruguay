import { Schema } from "mongoose";
import { appModel } from "../appdb";

// Lectura mínima de las cuentas del app (colección `users`, `_id` = uid de Firebase): el job del
// monitor sólo necesita el chat de Telegram vinculado. Nunca escribe acá.
const AppUserSchema = new Schema({ _id: String, telegramChatId: { type: String, default: null } }, { strict: false });

export const AppUserModel = appModel<{ _id: string; telegramChatId: string | null }>("AppUser", AppUserSchema, "users");
