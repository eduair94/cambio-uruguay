"""Build classes/utilities/power/ute_zones.json from UTE's public UTEi map files.

The ECSE service reports power cuts for 63 Montevideo "barrios" and ~81 interior "localidades".
This script pins, once, how those zones relate to the geography the site already uses:

* each UTE barrio polygon is matched to the INE 2011 barrio with the largest overlap and its IoU is
  recorded (PUERTO is carved out of INE's Ciudad Vieja, so it maps to code 1 with a low IoU);
* each interior locality gets UTE's own urban-area polygon (ADT, whose name starts with the ECSE
  locality id) and its department from the point ECSE publishes, tested against UTE's department
  outlines.

Requires shapely 2. Usage: python scripts/oneoff/build_ute_zones.py [--cache DIR]
"""
import json, re, sys, os, datetime, unicodedata, urllib.request
from shapely.geometry import shape, Point, Polygon, mapping

BASE = "https://apps2.ute.com.uy/SioEcseNew/Prod/Ecse"
FILES = {
    "zones": BASE + "/data/ZonasUrbanas.json",
    "departments": BASE + "/js/geomdeptos.js",
    "urban": "https://apps2.ute.com.uy/SioServEcse/api/Ecse/ObtenerAfectacionesUrbanas",
}
DEPARTMENTS = ["Montevideo", "Artigas", "Canelones", "Cerro Largo", "Colonia", "Durazno", "Flores", "Florida",
               "Lavalleja", "Maldonado", "Paysandú", "Río Negro", "Rivera", "Rocha", "Salto", "San José", "Soriano",
               "Tacuarembó", "Treinta y Tres"]
# ECSE's reference point for Florencio Sánchez falls a few hundred metres inside Soriano; the town is
# in Colonia. Nothing else is overridden.
DEPARTMENT_OVERRIDES = {"4304": "Colonia"}
# UTE's label differs from how the town is written everywhere else. Explicit, reviewed one by one.
NAME_ALIASES = {
    "3205": ["Maldonado"], "3308": ["La Paloma"], "4201": ["Delta del Tigre"], "3116": ["José Pedro Varela"],
    "3102": ["José Batlle y Ordóñez"],
}
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


def fetch(name, cache):
    path = os.path.join(cache, name) if cache else None
    if path and os.path.exists(path):
        return open(path, "rb").read()
    request = urllib.request.Request(FILES[name], headers={"User-Agent": "Mozilla/5.0"})
    body = urllib.request.urlopen(request, timeout=60).read()
    if path:
        open(path, "wb").write(body)
    return body


def rounded(geometry):
    def walk(value):
        if isinstance(value, (list, tuple)) and value and isinstance(value[0], (int, float)):
            return [round(value[0], 6), round(value[1], 6)]
        return [walk(item) for item in value]
    return {"type": geometry["type"], "coordinates": walk(geometry["coordinates"])}


def main():
    cache = sys.argv[sys.argv.index("--cache") + 1] if "--cache" in sys.argv else None
    zones = json.loads(fetch("zones", cache).decode("utf-8-sig"))
    script = fetch("departments", cache).decode("utf-8-sig")
    urban = json.loads(fetch("urban", cache).decode("utf-8-sig"))
    ine = json.load(open(os.path.join(ROOT, "classes/propertyzones/sources/ine2011.json"), encoding="utf-8"))

    outlines = {}
    for match in re.finditer(r"GEOM_DEPTOS\[(\d+)\]\s*=\s*(\[.*?\])\s*;?\s*(?=(?:\s*//[^\n]*\n)?\s*GEOM_DEPTOS\[|\s*$)", script, re.S):
        outlines[int(match.group(1))] = Polygon(json.loads(match.group(2)))
    if sorted(outlines) != list(range(1, 20)):
        raise SystemExit("unexpected department outlines: %s" % sorted(outlines))
    comments = re.findall(r"//\s*(\d+)\s*-\s*([A-Z ]+)", script)
    for number, label in comments:
        expected = DEPARTMENTS[int(number) - 1]
        folded = "".join(c for c in unicodedata.normalize("NFD", expected.upper()) if unicodedata.category(c) != "Mn")
        if not label.strip().startswith(folded):
            raise SystemExit("department order changed: %s %s" % (number, label))

    official = [(z["officialCode"], shape(z["geometry"])) for z in ine["zones"]]
    barrios = []
    for feature in zones["features"]:
        props = feature["properties"]
        if "codigo" not in props:
            continue
        polygon = shape(feature["geometry"]).buffer(0)
        code, target = max(official, key=lambda item: item[1].intersection(polygon).area)
        iou = target.intersection(polygon).area / target.union(polygon).area
        barrios.append({"code": props["codigo"], "name": props["descripcion"], "ineCode": code, "iou": round(iou, 3)})
    if len(barrios) != 63 or sorted({b["ineCode"] for b in barrios}, key=int) != [str(i) for i in range(1, 63)]:
        raise SystemExit("UTE barrios no longer cover the 62 INE barrios")

    adt = {}
    for feature in zones["features"]:
        props = feature["properties"]
        if props.get("nombre"):
            adt[props["nombre"].split(" ")[0]] = feature["geometry"]
    localities = []
    for row in urban:
        if row.get("TIPO_ZONA") != "Localidad":
            continue
        point = Point(row["LONGITUD"], row["LATITUD"])
        departments = [DEPARTMENTS[number - 1] for number, outline in outlines.items() if outline.contains(point)]
        if len(departments) != 1:
            nearest = min(outlines.items(), key=lambda item: item[1].distance(point))
            departments = [DEPARTMENTS[nearest[0] - 1]]
        departments = [DEPARTMENT_OVERRIDES.get(str(row["ID_ZONA"]), departments[0])]
        geometry = adt.get(str(row["ID_ZONA"]))
        localities.append({
            "id": str(row["ID_ZONA"]), "name": re.sub(r"\s+", " ", row["NOMBRE_ZONA"]).strip(),
            "department": departments[0], "aliases": NAME_ALIASES.get(str(row["ID_ZONA"]), []),
            "lat": row["LATITUD"], "lng": row["LONGITUD"],
            "geometry": rounded(mapping(shape(geometry).buffer(0))) if geometry else None,
        })
    localities.sort(key=lambda item: int(item["id"]))
    out = {
        "version": 1,
        "measuredAt": datetime.date.today().isoformat(),
        "sources": FILES,
        "barrios": sorted(barrios, key=lambda item: item["code"]),
        "localities": localities,
    }
    target = os.path.join(ROOT, "classes/utilities/power/ute_zones.json")
    json.dump(out, open(target, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
    print("barrios", len(barrios), "localities", len(localities),
          "with polygon", sum(1 for item in localities if item["geometry"]), "->", target)


if __name__ == "__main__":
    main()
