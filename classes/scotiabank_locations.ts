import axios from "axios";
import { load } from "cheerio";
import { MongooseServer, Schema } from "./database";

export const SCOTIABANK_LOCATIONS_URL =
  "https://www1.scotiabank.com.uy/scotiaenlinea/geolocalization/branches";

export interface ScotiabankOfficialCoordinate {
  branchNumber: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  sourceUrl: string;
}

function readQuotedProperty(block: string, property: string): string {
  const match = block.match(
    new RegExp(`['"]${property}['"]\\s*:\\s*"([^"]*)"`)
  );
  if (!match) return "";
  return load(`<span>${match[1]}</span>`)("span").text().trim();
}

export function parseScotiabankOfficialCoordinates(
  html: string
): ScotiabankOfficialCoordinate[] {
  const mapMatch = html.match(
    /var\s+map_list\s*=\s*\{([\s\S]*?)\n\s*\};/
  );
  if (!mapMatch) {
    throw new Error("Scotiabank location map data was not found");
  }

  const coordinates: ScotiabankOfficialCoordinate[] = [];
  const entryPattern = /'(\d+)'\s*:\s*\{([\s\S]*?)\}\s*,?/g;
  for (const match of mapMatch[1].matchAll(entryPattern)) {
    const branchNumber = String(Number(match[1]));
    const latitude = Number(readQuotedProperty(match[2], "latitud"));
    const longitude = Number(readQuotedProperty(match[2], "longitud"));
    if (
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude) ||
      latitude < -36 ||
      latitude > -30 ||
      longitude < -59 ||
      longitude > -52
    ) {
      continue;
    }

    coordinates.push({
      branchNumber,
      name: readQuotedProperty(match[2], "nombre"),
      address: readQuotedProperty(match[2], "direccion"),
      latitude,
      longitude,
      sourceUrl: SCOTIABANK_LOCATIONS_URL,
    });
  }

  return coordinates.sort(
    (left, right) =>
      Number(left.branchNumber) - Number(right.branchNumber)
  );
}

export async function syncScotiabankOfficialCoordinates(): Promise<{
  officialCoordinates: number;
  matchedBranches: number;
  missingBranchIds: string[];
}> {
  const response = await axios.get(SCOTIABANK_LOCATIONS_URL, {
    headers: {
      Accept: "text/html,application/xhtml+xml",
      "User-Agent":
        "Mozilla/5.0 (compatible; cambio-uruguay.com location verifier)",
    },
    timeout: 20000,
  });
  const parsed = parseScotiabankOfficialCoordinates(
    String(response.data ?? "")
  );
  if (parsed.length < 20) {
    throw new Error(
      `Scotiabank published only ${parsed.length} mapped branches; refusing to update`
    );
  }

  const db = MongooseServer.getInstance(
    "bcu_suc",
    new Schema(
      {
        id: { type: String, unique: true },
        origin: { type: String },
      },
      { strict: false }
    )
  );
  const activeBranches = await db.allEntries({
    origin: "scotiabank",
    status: { $ne: 0 },
  });
  const activeIds = new Set(activeBranches.map((branch: any) => branch.id));
  const verifiedAt = new Date();
  const missingBranchIds: string[] = [];
  let matchedBranches = 0;

  for (const coordinate of parsed) {
    const id = `1128-${coordinate.branchNumber}`;
    if (!activeIds.has(id)) {
      missingBranchIds.push(id);
      continue;
    }
    await db.updateOneAlt(
      { id, origin: "scotiabank", status: { $ne: 0 } },
      {
        latitude: coordinate.latitude,
        longitude: coordinate.longitude,
        map: `https://www.google.com/maps/search/?api=1&query=${coordinate.latitude},${coordinate.longitude}`,
        coordinateSource: "scotiabank-official",
        coordinateSourceUrl: coordinate.sourceUrl,
        coordinateLastVerifiedAt: verifiedAt,
      }
    );
    matchedBranches++;
  }

  if (matchedBranches < 20) {
    throw new Error(
      `Only ${matchedBranches} Scotiabank branches matched the BCU records`
    );
  }

  return {
    officialCoordinates: parsed.length,
    matchedBranches,
    missingBranchIds,
  };
}
