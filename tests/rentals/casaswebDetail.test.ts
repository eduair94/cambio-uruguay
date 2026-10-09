import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  casaswebDetailIsCurrent,
  casaswebPhotoKey,
  parseCasaswebImages,
  parseCasaswebPin,
  prioritizeCasaswebDetailTargets,
  readCasaswebDetail,
  type CasaswebDetailTarget,
} from "../../classes/rentals/casaswebDetail";
import { applyGallery, galleryWithoutCover } from "../../classes/rentals/detailImages";
import { PIN_SOURCES, pinFor, type RentalPin } from "../../classes/rentals/detailPins";
import type { RawRental, RentalProperty } from "../../classes/rentals/types";

const fixture = (name: string): string => readFileSync(join(__dirname, "fixtures", name), "utf8");

// The map script of a Casasweb rental page, as served on 2026-10-08 (CW222638, Centro).
const page = (reference: string, script: string) =>
  `<html><head><title>Alquiler Apartamento Centro Montevideo - ${reference} | Casasweb</title></head><body>` +
  `<div id='mapid' class='map alturaViewer'></div><script>var map = L.map('mapid',{minZoom: 10, maxZoom: 18,scrollWheelZoom: false})` +
  `.setView([-34.910033, -56.198587], 14).addLayer(osm); var cwIcon = L.icon({ iconUrl: 'assets/img/icono-marker-casasweb.png', iconSize: [37, 42] }); ` +
  `${script}</script></body></html>`;
const marker = (lat: string, lng: string, label: string) =>
  `L.marker([${lat}, ${lng}], {icon: cwIcon}) .addTo(map) .bindTooltip('${label}', {permanent: true,direction: 'top'})`;

describe("the map pin of a Casasweb rental page", () => {
  it("reads the marker of the advert's own page", () => {
    expect(parseCasaswebPin(page("CW222638", marker("-34.910033", "-56.198587", "CW222638")), "casasweb:CW222638")).toEqual({
      latitude: -34.910033,
      longitude: -56.198587,
    });
    // Adverts imported from Tokko keep their own reference, on the page and on the marker.
    expect(parseCasaswebPin(page("TKA7919965", marker("-34.9054", "-56.1350", "TKA7919965")), "casasweb:TKA7919965")).toEqual({
      latitude: -34.9054,
      longitude: -56.135,
    });
  });

  it("concludes nothing from a page that is not this advert's", () => {
    expect(parseCasaswebPin(page("CW100001", marker("-34.910033", "-56.198587", "CW100001")), "casasweb:CW222638")).toBeUndefined();
    expect(parseCasaswebPin("<title>Casasweb</title><p>Error</p>", "casasweb:CW222638")).toBeUndefined();
  });

  it("refuses a missing marker, another advert's marker and a point outside Uruguay", () => {
    expect(parseCasaswebPin(page("CW222638", ""), "casasweb:CW222638")).toBeNull();
    expect(parseCasaswebPin(page("CW222638", marker("-34.910033", "-56.198587", "CW100001")), "casasweb:CW222638")).toBeNull();
    expect(parseCasaswebPin(page("CW222638", marker("-34.6037", "-58.3816", "CW222638")), "casasweb:CW222638")).toBeNull();
  });
});

// The data list of the same page (CW249120, Pocitos, 2026-10-08).
const facts = (expenses: string, bathrooms = "1", bedrooms = "1") =>
  `<ul class="cw-caracteristicas"><li title='Dormitorios'><img src='v26/dormitorio.svg' class='cw-ico' alt='' /><b>${bedrooms}</b> dorm.</li> ` +
  `<li title='Baños'><img src='v26/bano.svg' class='cw-ico' alt='' /><b>${bathrooms}</b> baño</li></ul>` +
  `<ul class="cw-detalles"><li><b>Estado : </b>A Estrenar</li> <li><b>Gastos Comunes : </b>${expenses}</li> <li><b>Dormitorios: </b>1</li></ul>`;

describe("the data list of a Casasweb rental page", () => {
  const own = (body: string) => page("CW249120", marker("-34.9104", "-56.1508", "CW249120")) + body;

  it("reads common expenses, bathrooms and bedrooms the card does not carry", () => {
    expect(readCasaswebDetail(own(facts("$6.000")), "casasweb:CW249120")).toEqual({
      pin: { latitude: -34.9104, longitude: -56.1508 },
      expenses: { amount: 6_000, currency: "UYU" },
      bathrooms: 1,
      bedrooms: 1,
      images: [],
    });
    expect(readCasaswebDetail(own(facts("U$S 150", "2", "3")), "casasweb:CW249120")).toMatchObject({
      expenses: { amount: 150, currency: "USD" },
      bathrooms: 2,
      bedrooms: 3,
    });
  });

  it("takes a zero as not stated, and concludes nothing from another advert's page", () => {
    expect(readCasaswebDetail(own(facts("$0")), "casasweb:CW249120")?.expenses).toBeNull();
    expect(readCasaswebDetail(own(""), "casasweb:CW249120")).toMatchObject({ expenses: null, bathrooms: null, bedrooms: null });
    expect(readCasaswebDetail(own(facts("$6.000")), "casasweb:CW100001")).toBeUndefined();
  });
});

describe("which Casasweb pages are read first", () => {
  const target = (listingId: string, department: string, propertyType: string, lastSeen = "2026-10-08"): CasaswebDetailTarget => ({
    key: listingId,
    listingId,
    url: `https://casasweb.com/${listingId}`,
    department,
    propertyType,
    lastSeen,
  });
  it("puts Montevideo homes first and respects the budget", () => {
    const rows = [
      target("casasweb:CW1", "Canelones", "local"),
      target("casasweb:CW2", "Montevideo", "apartamento"),
      target("casasweb:CW3", "Maldonado", "casa"),
    ];
    expect(prioritizeCasaswebDetailTargets(rows, 2).map(row => row.listingId)).toEqual(["casasweb:CW2", "casasweb:CW3"]);
  });

  it("reads the pages never read before the ones it only re-reads", () => {
    const rows = [{ ...target("casasweb:CW2", "Montevideo", "apartamento"), reread: true }, target("casasweb:CW1", "Canelones", "local")];
    expect(prioritizeCasaswebDetailTargets(rows, 2).map(row => row.listingId)).toEqual(["casasweb:CW1", "casasweb:CW2"]);
  });

  it("reads again, once, a page stored before its data list or its photos were kept", () => {
    const fresh = "2026-09-09T00:00:00.000Z";
    const row = { ok: true, readAt: "2026-10-08T12:00:00.000Z", bathrooms: null, images: [] as string[] };
    expect(casaswebDetailIsCurrent(row, fresh)).toBe(true);
    expect(casaswebDetailIsCurrent({ ...row, images: undefined }, fresh)).toBe(false);
    expect(casaswebDetailIsCurrent({ ...row, bathrooms: undefined }, fresh)).toBe(false);
    expect(casaswebDetailIsCurrent({ ...row, readAt: "2026-09-01T12:00:00.000Z" }, fresh)).toBe(false);
  });
});

// An agency's own advert (CW258458, Carrasco, 2026-10-09), trimmed to its gallery, data lists, map
// and the first "Propiedades similares" card. It has a video: the hero shows it, and the gallery
// links start at the second slot. The other advert's card names no agency in the fixture.
describe("the photos of a Casasweb rental page", () => {
  const html = fixture("casasweb-ficha.html");
  const ownPhotos = [3246176, 3246175, ...Array.from({ length: 15 }, (_, index) => 3246177 + index), 3246174]
    .map(n => `https://casasweb.com/fotos/${n}.jpg`);

  it("reads every photo of the advert's gallery, full size and in its order, hidden ones included", () => {
    expect(parseCasaswebImages(html)).toEqual(ownPhotos);
  });

  it("is read with the rest of the page, and never takes another advert's photo", () => {
    const facts = readCasaswebDetail(html, "casasweb:CW258458")!;
    expect(facts).toMatchObject({ pin: { latitude: -34.878679, longitude: -56.048427 }, bathrooms: 6, bedrooms: 4, expenses: null });
    expect(facts.images).toHaveLength(18);
    expect(facts.images.join(" ")).not.toContain("3194867");
    expect(readCasaswebDetail(html, "casasweb:CW254797")).toBeUndefined();
  });

  it("finds no gallery on an advert imported from Tokko, whose page draws none", () => {
    const tokko = fixture("casasweb-ficha-tokko.html");
    expect(parseCasaswebImages(tokko)).toEqual([]);
    expect(readCasaswebDetail(tokko, "casasweb:TKA7761606")?.images).toEqual([]);
  });

  it("takes only HTTPS photos of Casasweb or Tokko", () => {
    const links = [
      "http://casasweb.com/fotos/1.jpg",
      "https://www.youtube.com/watch?v=FlHwCzdrhfk",
      "https://example.com/fotos/2.jpg",
      "https://static.tokkobroker.com/pictures/7761606_8812.jpg",
      "https://casasweb.com/fotos/3.jpg",
    ];
    const page = `<div id="lightGallery">${links.map(href => `<a class="gallery-item2" href="${href}"><img src="x"/></a>`).join("")}</div>`;
    expect(parseCasaswebImages(page)).toEqual(["https://static.tokkobroker.com/pictures/7761606_8812.jpg", "https://casasweb.com/fotos/3.jpg"]);
  });

  it("does not repeat the card's cover, the same photo at a smaller size", () => {
    const cover = "https://casasweb.com/fotos/3246176s.jpg";
    expect(casaswebPhotoKey(cover)).toBe(casaswebPhotoKey(ownPhotos[0]!));
    expect(galleryWithoutCover(ownPhotos, cover, casaswebPhotoKey)).toEqual(ownPhotos.slice(1));
    const row = { image: cover } as Pick<RawRental, "image" | "details">;
    expect(applyGallery(row, ownPhotos, casaswebPhotoKey)).toBe(true);
    expect(row.details!.images).toEqual(ownPhotos.slice(1));
    expect(row.image).toBe(cover);
  });
});

describe("a property's pin from its Casasweb advert", () => {
  const property = (offers: Array<{ listingId: string; source: string }>) =>
    ({ department: "Montevideo", latitude: null, offers }) as unknown as Pick<RentalProperty, "department" | "latitude" | "offers">;
  const pins = new Map<string, RentalPin>([["casasweb:CW222638", { latitude: -34.910033, longitude: -56.198587 }]]);

  it("is read from the Casasweb collection, after Mercado Libre's", () => {
    expect(PIN_SOURCES.map(row => row.source)).toEqual(["mercadolibre", "casasweb"]);
    expect(pinFor(property([{ listingId: "casasweb:CW222638", source: "casasweb" }]), pins, "casasweb")).toEqual(pins.get("casasweb:CW222638"));
    expect(pinFor(property([{ listingId: "casasweb:CW222638", source: "casasweb" }]), pins, "mercadolibre")).toBeNull();
  });
});
