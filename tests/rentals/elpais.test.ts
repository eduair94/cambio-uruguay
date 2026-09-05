import { describe, expect, it } from "vitest";
import { elpaisToRawRental } from "../../classes/rentals/sources/elpais";

const base = {
  _id: "6a42b0f33b79e8db94e28523", title: "Apartamento en alquiler", transactionType: "rental",
  status: "active", province: "Maldonado", price: { amount: 550, currency: "USD" },
};

describe("El País offline period and metadata checks", () => {
  // Minimal period excerpts observed 2026-09-05; no full descriptions or contact records.
  it.each([
    ["6a41db4c3b79e8db94dc3ac7", "ALQUILER APTO PUNTA DEL ESTE", "Disponible a la fecha, segunda quincena de Enero 2026"],
    ["6a41f4373b79e8db94dcb41d", "mansa primera linea", "Disponible en alquiler en febrero 2023"],
    ["6a42b0f33b79e8db94e28523", "Apartamento en alquiler c/ cochera en Playa Mansa", "Disponible en alquiler invernal desde el 6 de abril al 30 de noviembre"],
  ])("rejects an explicitly bounded stay despite active rental classification: %s", (_id, title, description) => {
    expect(elpaisToRawRental({ ...base, _id, title, description })).toBeNull();
  });

  it.each([
    ["Alquiler anual", "Disponible en alquiler desde febrero de 2027"],
    ["Apartamento en alquiler", "Disponible desde febrero. Comedor diario y jardín de invierno."],
    ["Alquiler anual", "Disponible en alquiler en febrero 2027. Contrato de dos años."],
    ["Alquiler anual", "También se ofrece una opción para la segunda quincena de enero."],
  ])("keeps annual options and dates that describe the start of a tenancy: %s", (title, description) => {
    expect(elpaisToRawRental({ ...base, title, description })).toMatchObject({ price: 550, currency: "USD" });
  });

  it("does not turn the portal's import snapshot into a publication date or ignore withdrawal", () => {
    const row = { ...base, createdAt: "2026-09-05T06:00:00Z", snapshotDate: "2026-08-31" };
    expect(elpaisToRawRental(row)?.publishedAt).toBeNull();
    expect(elpaisToRawRental({ ...row, trashedAt: "2026-07-06T20:08:30.486Z" })).toBeNull();
    expect(elpaisToRawRental({ ...row, pausedByAdmin: true })).toBeNull();
  });

  it("reads only the public agency name and tolerates malformed image arrays", () => {
    expect(elpaisToRawRental({ ...base, sourceAgency: { provider: "elpais", id: "internal", raw: "ABATE" }, images: {} }))
      .toMatchObject({ sellerName: "ABATE", sellerType: "inmobiliaria", image: null });
    expect(elpaisToRawRental({ ...base, sourceAgency: { provider: "elpais" }, images: [null] }))
      .toMatchObject({ sellerName: "Inmuebles El País", sellerType: "desconocido", image: null });
  });
});
