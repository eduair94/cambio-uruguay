// One row per source: how its keys look and which of its URLs may ever be published. A permalink
// or picture that does not match its own source's row never reaches a public collection.
import type { CarSource } from "../types";

export interface CarSourceInfo {
  source: CarSource;
  name: string;
  prefix: string;
  permalink: RegExp;
  pictureHost: RegExp;
  /** Lower wins a cross-source duplicate: dealers republish the same car everywhere. */
  priority: number;
  /** Commercial name shown as the seller for a dealer's own website. */
  dealerName: string | null;
}

export const CAR_SOURCES: Readonly<Record<CarSource, CarSourceInfo>> = {
  mercadolibre: {
    source: "mercadolibre", name: "Mercado Libre", prefix: "ml",
    permalink: /^https:\/\/auto\.mercadolibre\.com\.uy\/MLU-/, pictureHost: /^http2\.mlstatic\.com$/, priority: 0, dealerName: null,
  },
  clasiautos: {
    source: "clasiautos", name: "Clasiautos", prefix: "clasiautos",
    permalink: /^https:\/\/clasiautos\.uy\/avisos\/[\w%-]+\/?$/, pictureHost: /^clasiautos\.uy$/, priority: 1, dealerName: null,
  },
  julio: {
    source: "julio", name: "Julio Automóviles", prefix: "julio",
    permalink: /^https:\/\/julioautomoviles\.com\.uy\/vehiculo\/[\w%-]+\/?$/, pictureHost: /^julioautomoviles\.com\.uy$/, priority: 1,
    dealerName: "Julio Automóviles",
  },
  shoppingdeautos: {
    source: "shoppingdeautos", name: "Shopping de Autos", prefix: "sda",
    permalink: /^https:\/\/shoppingdeautos\.uy\/producto\/[\w%-]+\/?$/, pictureHost: /^shoppingdeautos\.uy$/, priority: 1,
    dealerName: "Shopping de Autos",
  },
  carper: {
    source: "carper", name: "Carper", prefix: "carper",
    permalink: /^https:\/\/usados\.carper\.com\.uy\/[\w%/-]+$/, pictureHost: /^usados\.carper\.com\.uy$/, priority: 1, dealerName: "Carper",
  },
  fidocar: {
    source: "fidocar", name: "Usados Fidocar", prefix: "fidocar",
    permalink: /^https:\/\/www\.usadosfidocar\.com\.uy\/modelo\/[\w%-]+$/, pictureHost: /^f\.fcdn\.app$/, priority: 1,
    dealerName: "Usados Fidocar",
  },
  carone: {
    source: "carone", name: "Car One", prefix: "carone",
    permalink: /^https:\/\/carone\.com\.uy\/[\w%-]+$/, pictureHost: /^cdn\.impel\.io$/, priority: 1, dealerName: "Car One",
  },
  facebook: {
    source: "facebook", name: "Facebook Marketplace", prefix: "fb",
    permalink: /^https:\/\/www\.facebook\.com\/marketplace\/item\/\d{6,20}\/$/, pictureHost: /^scontent[\w.-]*\.fbcdn\.net$/, priority: 2,
    dealerName: null,
  },
};

export const CAR_SOURCE_LIST = Object.keys(CAR_SOURCES) as CarSource[];

export const carKeyFor = (source: CarSource, id: string): string => `${CAR_SOURCES[source].prefix}-${id}`;

export function safeSourcePermalink(source: CarSource, url: string): string | null {
  const info = CAR_SOURCES[source];
  return info && info.permalink.test(String(url || "")) ? url : null;
}

export function safeSourcePicture(source: CarSource, url: string | null): string | null {
  const info = CAR_SOURCES[source];
  if (!info || !url) return null;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" && !parsed.username && !parsed.password && info.pictureHost.test(parsed.host)
      ? parsed.toString()
      : null;
  } catch {
    return null;
  }
}
