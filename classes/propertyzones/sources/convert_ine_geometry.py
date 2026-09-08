"""Reproduce the pinned INE 2011 geometry, offline; no database/network access.

python -m pip install --target .sdd-geo-libs pyshp==2.3.1 pyproj==3.7.2 shapely==2.0.7
PYTHONPATH=.sdd-geo-libs python classes/propertyzones/sources/convert_ine_geometry.py ZIP OUTPUT
The ZIP is the original linked by INE's Mapas Vectoriales año 2011 page.
"""
import hashlib
import io
import json
import sys
import zipfile
from pathlib import Path

import shapefile
from pyproj import Transformer
from shapely.geometry import shape


archive = Path(sys.argv[1]).read_bytes()
assert len(archive) < 64 * 1024 * 1024
transformer = Transformer.from_crs("EPSG:32721", "EPSG:4326", always_xy=True)
with zipfile.ZipFile(io.BytesIO(archive)) as bundle:
    shp = bundle.read("ine_barrios_mvd_nbi85.shp")
    dbf = bundle.read("ine_barrios_mvd_nbi85.dbf")
    reader = shapefile.Reader(shp=io.BytesIO(shp), dbf=io.BytesIO(dbf), encoding="cp1252")
    features = []
    for record in reader.iterShapeRecords():
        properties = record.record.as_dict()
        geometry = record.shape.__geo_interface__

        def convert(value):
            if len(value) >= 2 and isinstance(value[0], (float, int)):
                lng, lat = transformer.transform(*value[:2])
                assert -56.6 < lng < -55.9 and -35 < lat < -34.6
                # Keep narrow source features intact: 6 decimals caused intersections
                # in three otherwise valid native polygons; 9 decimals preserves them.
                return [round(lng, 9), round(lat, 9)]
            return [convert(child) for child in value]

        assert geometry["type"] in ("Polygon", "MultiPolygon")
        converted = {"type": geometry["type"], "coordinates": convert(geometry["coordinates"])}
        assert shape(converted).is_valid, "Invalid reprojected neighborhood polygon"
        features.append({
            "officialCode": str(properties["NROBARRIO"]),
            "name": properties["NOMBBARR"],
            "geometry": converted,
        })
    features.sort(key=lambda item: int(item["officialCode"]))
    assert [int(item["officialCode"]) for item in features] == list(range(1, 63))
    result = {
        "version": 1,
        "archiveSha256": hashlib.sha256(archive).hexdigest(),
        "shapeSha256": hashlib.sha256(shp).hexdigest(),
        "tableSha256": hashlib.sha256(dbf).hexdigest(),
        "sourceCrs": "EPSG:32721",
        "outputCrs": "EPSG:4326",
        "dataAsOf": "2011-12-31",
        "zones": features,
    }
    Path(sys.argv[2]).write_text(json.dumps(result, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    print(json.dumps({"zones": len(features), "archiveSha256": result["archiveSha256"]}))
