// El pedido de baja de un número. El hash no es secreto —un celular uruguayo se recupera por fuerza
// bruta—: sólo evita que la lista de bajas sea un directorio legible. app/server/utils/carContacts.ts
// tiene la misma función y un test compara las dos.
import { createHash } from "crypto";

export const carContactHash = (value: string): string => createHash("sha256").update(`car-contact:${value}`).digest("hex");
