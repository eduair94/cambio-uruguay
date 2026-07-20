// Verified official contact / reclamo channels for the Uruguayan authorities our generated
// letters are addressed to. Checked against official gub.uy / organism sources on 2026-07-20.
//
// THE LOAD-BEARING FACT: reclamos to these authorities are filed through LOGIN-GATED web forms
// (gub.uy identity) or by phone — NOT by email. There is no public reclamo inbox at Defensa del
// Consumidor, URSEC or the BCU. So a "send" button for those points at the form (open + paste the
// copied text), never a mailto. Email is only a viable *written backup* to the DNA and to a
// private courier. Keep this in mind before "simplifying" any of these to a mailto.
//
// PURE module (no runtime deps) so it is unit-tested and reused by pages + SendMessage actions.

export const OFFICIAL_CONTACTS_VERIFIED = '2026-07-20'

/** Dirección Nacional de Aduanas — general contact email. Written backup / exoneración-IVA only;
 *  a RETAINED parcel is released in person by prior appointment, not by email.
 *  Source: https://www.aduanas.gub.uy/innovaportal/v/4085/1/innova.front/contactenos.html */
export const DNA_EMAIL = 'info@aduanas.gub.uy'

/** DNA "Envíos retenidos" page with the cita-previa (appointment) links. Not prefillable.
 *  Source: https://www.aduanas.gub.uy/innovaportal/v/28225/1/innova.front/ (upd. 2026-01) */
export const DNA_RETENIDOS_PORTAL =
  'https://www.aduanas.gub.uy/innovaportal/v/28225/1/innova.front/'

/** MEF — Unidad de Defensa del Consumidor: reclamo web form (login-gated, gub.uy identity).
 *  Canonical slug (the "relaciones-consumo" one aliases here). Source verified 2026-07-20. */
export const DEFENSA_CONSUMIDOR_FORM =
  'https://www.gub.uy/tramites/consulta-reclamo-yo-denuncia-materia-defensa-consumidor'

/** Defensa del Consumidor toll-free line, L–V 9:30–16 h. */
export const DEFENSA_CONSUMIDOR_PHONE = '0800 7005'

/** BCU — denuncia de usuario del sistema financiero (online form). The BCU does NOT order refunds.
 *  Source: https://usuariofinanciero.bcu.gub.uy/reclamos-y-denuncias/ +
 *          https://www.gub.uy/tramites/denuncias-usuarios-sistema-financiero */
export const BCU_DENUNCIA_FORM = 'https://www.gub.uy/tramites/denuncias-usuarios-sistema-financiero'

/** URSEC — reclamo de servicios postales (online form; the FORMAL channel, not email).
 *  Source: https://www.gub.uy/tramites/reclamo-consumidores-servicios-telecomunicaciones-postales */
export const URSEC_POSTAL_FORM =
  'https://www.gub.uy/tramites/reclamo-consumidores-servicios-telecomunicaciones-postales'

/** URSEC — mesa de entrada / correspondencia general. The ONLY verified URSEC email; `info@ursec`
 *  is not published anywhere official. Backup only — the formal reclamo is the web form above.
 *  Source: https://www.gub.uy/unidad-reguladora-servicios-comunicaciones/institucional/contacto */
export const URSEC_EMAIL = 'entrada@ursec.gub.uy'
