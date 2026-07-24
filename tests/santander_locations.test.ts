import { describe, expect, it } from "vitest";
import { parseSantanderOfficialCoordinates } from "../classes/santander_locations";

describe("Santander official locations", () => {
  it("extracts branch numbers and coordinates from Drupal map settings", () => {
    const settings = {
      geofield_google_map: {
        map: {
          data: {
            features: [
              {
                geometry: {
                  type: "Point",
                  coordinates: [-56.187604, -34.905593],
                },
                properties: {
                  description:
                    '<article><h3> 02 - Sucursal individuos 18 de Julio </h3></article>',
                },
              },
              {
                geometry: {
                  type: "Point",
                  coordinates: [-56.173693, -34.869519],
                },
                properties: {
                  description:
                    "<article><h3>7- Bvar. Artigas</h3></article>",
                },
              },
            ],
          },
        },
      },
    };
    const html = `<script data-drupal-selector="drupal-settings-json" type="application/json">${JSON.stringify(
      settings
    )}</script>`;

    expect(parseSantanderOfficialCoordinates(html)).toEqual([
      {
        branchNumber: "2",
        name: "02 - Sucursal individuos 18 de Julio",
        latitude: -34.905593,
        longitude: -56.187604,
        sourceUrl: "https://www.santander.com.uy/puntos-de-atencion",
      },
      {
        branchNumber: "7",
        name: "7- Bvar. Artigas",
        latitude: -34.869519,
        longitude: -56.173693,
        sourceUrl: "https://www.santander.com.uy/puntos-de-atencion",
      },
    ]);
  });

  it("fails safely when the official settings disappear", () => {
    expect(() => parseSantanderOfficialCoordinates("<html></html>")).toThrow(
      "Santander location map settings were not found"
    );
  });
});
