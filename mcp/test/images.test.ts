// A photo per advert in the structured payload, never in the text the model reads.
//
// cambio-uruguay.com's /asistente-ia draws its answers' listings as cards with photos, from each
// tool's `structuredContent`. The photo is there for a screen; the model gains nothing from a URL,
// so the text line must stay exactly as it was.

import { describe, expect, it } from "vitest";
import { compactCar, carLine } from "../src/cars/compact";
import { safeImage } from "../src/format";
import { categoryRows } from "../src/products/search";
import { compactRental, rentalLine } from "../src/rentals/compact";
import { rental } from "./fixtures";

const PHOTO = "https://cdn2.infocasas.com.uy/repo/img/abc.jpg";

describe("safeImage", () => {
  it("lets through an https photo and nothing else", () => {
    expect(safeImage(PHOTO)).toBe(PHOTO);
    expect(safeImage("http://inseguro.example/a.jpg")).toBeUndefined();
    expect(safeImage("https://user:pass@a.example/x.jpg")).toBeUndefined();
    expect(safeImage("javascript:alert(1)")).toBeUndefined();
    expect(safeImage(`https://a.example/${"x".repeat(1200)}`)).toBeUndefined();
    expect(safeImage(null)).toBeUndefined();
  });
});

describe("rentals", () => {
  it("the shown advert's cover, else the first photo of the card's gallery", () => {
    const own = compactRental(rental({ matchingOffer: { ...rental().matchingOffer, image: PHOTO } }) as never);
    expect(own.image).toBe(PHOTO);
    const gallery = compactRental(rental({ galleryPreview: [{ url: PHOTO }] }) as never);
    expect(gallery.image).toBe(PHOTO);
    expect(compactRental(rental() as never).image).toBeUndefined();
  });

  it("the text line does not change", () => {
    const withPhoto = compactRental(rental({ matchingOffer: { ...rental().matchingOffer, image: PHOTO } }) as never);
    const without = compactRental(rental() as never);
    expect(rentalLine(withPhoto)).toBe(rentalLine(without));
    expect(rentalLine(withPhoto)).not.toContain("infocasas.com.uy/repo");
  });
});

describe("cars", () => {
  const car = (picture?: string) => ({
    key: "ml-MLU1",
    title: "Peugeot 208",
    year: 2017,
    km: 112000,
    price: 7900,
    currency: "USD",
    priceUsd: 7900,
    picture,
  });

  it("the advert's picture, and the same line", () => {
    const c = compactCar(car("https://http2.mlstatic.com/D_1.webp") as never);
    expect(c.image).toBe("https://http2.mlstatic.com/D_1.webp");
    expect(carLine(c)).toBe(carLine(compactCar(car() as never)));
  });
});

describe("products", () => {
  it("the cheapest offer's photo, else any offer's", () => {
    const [row] = categoryRows(
      "hogar",
      [
        {
          key: "heladera",
          category: "heladera",
          categoryLabel: "Heladera",
          offers: [
            { seller: "A", priceUyu: 18000, condition: "new", image: null },
            { seller: "B", priceUyu: 21000, condition: "new", image: "https://f.fcdn.app/heladera.jpg" },
          ],
        },
      ],
      () => "/equipar-casa-uruguay/heladera"
    );
    expect(row!.bestOffer?.seller).toBe("A");
    expect(row!.image).toBe("https://f.fcdn.app/heladera.jpg");
  });
});
