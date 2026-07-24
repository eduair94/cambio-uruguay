import { describe, expect, it } from "vitest";
import { parseScotiabankOfficialCoordinates } from "../classes/scotiabank_locations";

describe("Scotiabank official locations", () => {
  it("extracts branch numbers and coordinates from the official map", () => {
    const html = `
      <script>
        var map_list = {
          '1': {
            'latitud': "-34.907046",
            'longitud': "-56.206344",
            'nombre': "Sucursal Casa Central",
            'direccion': "Misiones 1399",
          },
          '6': {
            'latitud': "-32.3714364",
            'longitud': "-54.1688902",
            'nombre': "Sucursal Melo",
            'direccion': "Aparicio Saravia 599",
          }
        };
      </script>
    `;

    expect(parseScotiabankOfficialCoordinates(html)).toEqual([
      {
        branchNumber: "1",
        name: "Sucursal Casa Central",
        address: "Misiones 1399",
        latitude: -34.907046,
        longitude: -56.206344,
        sourceUrl:
          "https://www1.scotiabank.com.uy/scotiaenlinea/geolocalization/branches",
      },
      {
        branchNumber: "6",
        name: "Sucursal Melo",
        address: "Aparicio Saravia 599",
        latitude: -32.3714364,
        longitude: -54.1688902,
        sourceUrl:
          "https://www1.scotiabank.com.uy/scotiaenlinea/geolocalization/branches",
      },
    ]);
  });

  it("rejects a page without the official map payload", () => {
    expect(() =>
      parseScotiabankOfficialCoordinates("<html></html>")
    ).toThrow("Scotiabank location map data was not found");
  });

  it("drops coordinates outside Uruguay", () => {
    const html = `
      <script>
        var map_list = {
          '1': {
            'latitud': "40.7128",
            'longitud': "-74.0060",
            'nombre': "Invalid",
            'direccion': "Invalid",
          }
        };
      </script>
    `;

    expect(parseScotiabankOfficialCoordinates(html)).toEqual([]);
  });
});
