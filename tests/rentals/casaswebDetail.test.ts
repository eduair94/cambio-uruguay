import { describe, expect, it } from "vitest";
import { parseCasaswebPin, prioritizeCasaswebDetailTargets, type CasaswebDetailTarget } from "../../classes/rentals/casaswebDetail";
import { PIN_SOURCES, pinFor, type RentalPin } from "../../classes/rentals/detailPins";
import type { RentalProperty } from "../../classes/rentals/types";

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
