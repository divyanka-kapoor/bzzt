"""
Load GADM level-2 (actual districts/LGAs) for high-burden countries.

Countries:
  India   — 766 districts (health ministry operates at district level)
  Nigeria — 774 LGAs (highest malaria burden globally)

IDs use prefix to distinguish from level-1:
  IND_L2-Maharashtra-Pune
  NGA_L2-Lagos-Ikeja

Run: python3 scripts/load_districts_l2.py
"""

import os, sys, json, time, math, urllib.request, urllib.error, zipfile, tempfile

env_path = os.path.join(os.path.dirname(__file__), "../.env.local")
URL = KEY = ""
with open(env_path) as f:
    for line in f:
        if line.startswith("SUPABASE_URL="): URL = line.split("=",1)[1].strip().strip('"')
        elif line.startswith("SUPABASE_SERVICE_ROLE_KEY="): KEY = line.split("=",1)[1].strip().strip('"')

if not URL or not KEY:
    print("ERROR: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required")
    sys.exit(1)

COUNTRIES_L2 = [
    {"code": "IND", "iso3": "IND", "name": "India"},
    {"code": "NGA", "iso3": "NGA", "name": "Nigeria"},
    {"code": "KEN", "iso3": "KEN", "name": "Kenya"},
    {"code": "BGD", "iso3": "BGD", "name": "Bangladesh"},
]

def centroid(coordinates):
    try:
        if isinstance(coordinates[0][0][0], list):
            coords = max(coordinates, key=lambda p: len(p[0]))[0]
        else:
            coords = coordinates[0]
        lats = [c[1] for c in coords]
        lngs = [c[0] for c in coords]
        return sum(lats)/len(lats), sum(lngs)/len(lngs)
    except:
        return None, None

def simplify(geom, keep=15):
    def sr(ring):
        if len(ring) <= keep * 2: return ring
        step = max(1, len(ring) // keep)
        out = ring[::step]
        if out[-1] != ring[-1]: out.append(ring[-1])
        return out
    try:
        if geom["type"] == "Polygon":
            return {"type": "Polygon", "coordinates": [sr(r) for r in geom["coordinates"]]}
        elif geom["type"] == "MultiPolygon":
            # Keep only the largest ring for world zoom
            polys = geom["coordinates"]
            largest = max(polys, key=lambda p: len(p[0]))
            return {"type": "Polygon", "coordinates": [sr(r) for r in largest]}
    except:
        pass
    return geom

def upsert_one(row):
    body = json.dumps([row]).encode()
    req = urllib.request.Request(
        f"{URL}/rest/v1/districts",
        data=body,
        headers={"apikey": KEY, "Authorization": f"Bearer {KEY}",
                 "Content-Type": "application/json",
                 "Prefer": "resolution=merge-duplicates"},
        method="POST"
    )
    try:
        with urllib.request.urlopen(req, timeout=15):
            return True
    except urllib.error.HTTPError as e:
        print(f"    error {e.code}: {e.read().decode()[:100]}")
        return False

def load_country_l2(country):
    print(f"\n── {country['name']} (level-2) ──")
    url = f"https://geodata.ucdavis.edu/gadm/gadm4.1/json/gadm41_{country['code']}_2.json.zip"
    print(f"  Downloading...", end=" ", flush=True)
    try:
        with tempfile.TemporaryDirectory() as tmp:
            zip_path = os.path.join(tmp, "gadm.zip")
            urllib.request.urlretrieve(url, zip_path)
            with zipfile.ZipFile(zip_path) as z:
                names = [n for n in z.namelist() if n.endswith(".json")]
                with z.open(names[0]) as f:
                    data = json.load(f)
        features = data.get("features", [])
        print(f"✓ ({len(features)} features)")
    except Exception as e:
        print(f"✗ {e}")
        return 0

    seen = set()
    loaded = 0

    for feat in features:
        props = feat.get("properties", {})
        geom  = feat.get("geometry", {})

        state    = props.get("NAME_1", "").replace(" ", "_").replace("/", "_")
        district = props.get("NAME_2", "").replace(" ", "_").replace("/", "_")

        if not district:
            continue

        base_id = f"{country['iso3']}_L2-{state}-{district}"
        uid = base_id
        counter = 2
        while uid in seen:
            uid = f"{base_id}_{counter}"
            counter += 1
        seen.add(uid)

        lat, lng = centroid(geom.get("coordinates", []))
        if lat is None:
            continue

        row = {
            "id":          uid,
            "country":     country["name"],
            "country_code": country["iso3"],
            "state":       props.get("NAME_1", ""),
            "district":    props.get("NAME_2", ""),
            "lat":         round(lat, 4),
            "lng":         round(lng, 4),
            "geometry":    simplify(geom),
            "admin_level": 2,
        }

        if upsert_one(row):
            loaded += 1
            if loaded % 50 == 0:
                print(f"  {loaded}/{len(features)} loaded...")

        time.sleep(0.05)

    print(f"  ✓ {loaded}/{len(features)} districts loaded")
    return loaded

def main():
    print("="*55)
    print("Bzzt — GADM Level-2 District Loader")
    print("="*55)

    total = 0
    for country in COUNTRIES_L2:
        count = load_country_l2(country)
        total += count
        time.sleep(2)

    print(f"\n{'='*55}")
    print(f"Total level-2 districts loaded: {total}")
    print("\nNext: re-run daily scan to score level-2 districts")

if __name__ == "__main__":
    main()
