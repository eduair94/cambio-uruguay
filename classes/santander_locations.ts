import axios from "axios";
import { load } from "cheerio";
import { MongooseServer, Schema } from "./database";

export const SANTANDER_LOCATIONS_URL =
  "https://www.santander.com.uy/puntos-de-atencion";

const SANTANDER_OMBU_URL =
  "https://www.santander.com.uy/puntos-de-atencion/pocitos-santander-ombu";

export interface SantanderOfficialCoordinate {
  branchNumber: string;
  name: string;
  latitude: number;
  longitude: number;
  sourceUrl: string;
}

interface SantanderMapFeature {
  geometry?: {
    coordinates?: unknown[];
  };
  properties?: {
    description?: string;
  };
}

const ombuCoordinate: SantanderOfficialCoordinate = {
  branchNumber: "5",
  name: "Ombú",
  latitude: -34.913268,
  longitude: -56.156689,
  sourceUrl: SANTANDER_OMBU_URL,
};

export function parseSantanderOfficialCoordinates(
  html: string
): SantanderOfficialCoordinate[] {
  const $ = load(html);
  const settingsText = $(
    'script[data-drupal-selector="drupal-settings-json"]'
  )
    .first()
    .text()
    .trim();
  if (!settingsText) {
    throw new Error("Santander location map settings were not found");
  }

  let settings: any;
  try {
    settings = JSON.parse(settingsText);
  } catch {
    throw new Error("Santander location map settings are not valid JSON");
  }

  const coordinates = new Map<string, SantanderOfficialCoordinate>();
  for (const map of Object.values<any>(
    settings?.geofield_google_map ?? {}
  )) {
    const features: SantanderMapFeature[] = map?.data?.features ?? [];
    for (const feature of features) {
      const description = String(feature?.properties?.description ?? "");
      const title = load(description)("h3")
        .first()
        .text()
        .replace(/\s+/g, " ")
        .trim();
      const branchMatch = title.match(/^0*(\d+)\s*-/);
      const rawCoordinates = feature?.geometry?.coordinates;
      if (!branchMatch || !Array.isArray(rawCoordinates)) continue;

      const longitude = Number(rawCoordinates[0]);
      const latitude = Number(rawCoordinates[1]);
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) continue;

      const branchNumber = String(Number(branchMatch[1]));
      coordinates.set(branchNumber, {
        branchNumber,
        name: title,
        latitude,
        longitude,
        sourceUrl: SANTANDER_LOCATIONS_URL,
      });
    }
  }

  return Array.from(coordinates.values()).sort(
    (left, right) => Number(left.branchNumber) - Number(right.branchNumber)
  );
}

export async function syncSantanderOfficialCoordinates(): Promise<{
  officialCoordinates: number;
  matchedBranches: number;
  missingBranchIds: string[];
}> {
  const response = await axios.get(SANTANDER_LOCATIONS_URL, {
    headers: {
      Accept: "text/html,application/xhtml+xml",
      "User-Agent":
        "Mozilla/5.0 (compatible; cambio-uruguay.com location verifier)",
    },
    timeout: 20000,
  });
  const parsed = parseSantanderOfficialCoordinates(String(response.data ?? ""));
  if (parsed.length < 20) {
    throw new Error(
      `Santander published only ${parsed.length} mapped branches; refusing to update`
    );
  }

  const byBranch = new Map(
    [...parsed, ombuCoordinate].map((coordinate) => [
      coordinate.branchNumber,
      coordinate,
    ])
  );
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
    origin: "santander",
    status: { $ne: 0 },
  });
  const activeIds = new Set(activeBranches.map((branch: any) => branch.id));
  const verifiedAt = new Date();
  const missingBranchIds: string[] = [];
  let matchedBranches = 0;

  for (const coordinate of byBranch.values()) {
    const id = `1137-${coordinate.branchNumber}`;
    if (!activeIds.has(id)) {
      missingBranchIds.push(id);
      continue;
    }
    await db.updateOneAlt(
      { id, origin: "santander", status: { $ne: 0 } },
      {
        latitude: coordinate.latitude,
        longitude: coordinate.longitude,
        map: `https://www.google.com/maps/search/?api=1&query=${coordinate.latitude},${coordinate.longitude}`,
        coordinateSource: "santander-official",
        coordinateSourceUrl: coordinate.sourceUrl,
        coordinateLastVerifiedAt: verifiedAt,
      }
    );
    matchedBranches++;
  }

  if (matchedBranches < 20) {
    throw new Error(
      `Only ${matchedBranches} Santander branches matched the BCU records`
    );
  }

  return {
    officialCoordinates: byBranch.size,
    matchedBranches,
    missingBranchIds,
  };
}
