"""
Bzzt — GADM District Pipeline
==============================
Downloads GADM level-1 (state/province) boundaries for all endemic countries,
extracts district centroids + GeoJSON polygons, and loads them into Supabase.

Run once: python3 scripts/load_districts.py

Requirements:
  pip3 install requests supabase --break-system-packages

GADM data: https://gadm.org (free, no API key)
WorldPop population: UN WUP 2024 metro estimates (hardcoded approximations)
"""

import os, json, time, math, sys
import urllib.request
import zipfile
import tempfile

# ── Config ─────────────────────────────────────────────────────────────────────
SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")

if not SUPABASE_URL or not SUPABASE_KEY:
    # Try reading from .env.local
    env_path = os.path.join(os.path.dirname(__file__), "../.env.local")
    if os.path.exists(env_path):
        with open(env_path) as f:
            for line in f:
                line = line.strip()
                if line.startswith("SUPABASE_URL="):
                    SUPABASE_URL = line.split("=", 1)[1].strip('"')
                elif line.startswith("SUPABASE_SERVICE_ROLE_KEY="):
                    SUPABASE_KEY = line.split("=", 1)[1].strip('"')

if not SUPABASE_URL or not SUPABASE_KEY:
    print("ERROR: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set")
    sys.exit(1)

# ── Endemic countries with GADM country codes ──────────────────────────────────
# Selected for highest dengue + malaria burden globally
COUNTRIES = [
    # Sub-Saharan Africa — malaria dominant
    {"code": "NGA", "iso3": "NGA", "name": "Nigeria"},
    {"code": "COD", "iso3": "COD", "name": "Democratic Republic of Congo"},
    {"code": "TZA", "iso3": "TZA", "name": "Tanzania"},
    {"code": "KEN", "iso3": "KEN", "name": "Kenya"},
    {"code": "GHA", "iso3": "GHA", "name": "Ghana"},
    {"code": "MOZ", "iso3": "MOZ", "name": "Mozambique"},
    {"code": "UGA", "iso3": "UGA", "name": "Uganda"},
    {"code": "ETH", "iso3": "ETH", "name": "Ethiopia"},
    # South Asia — dengue + malaria
    {"code": "IND", "iso3": "IND", "name": "India"},
    {"code": "BGD", "iso3": "BGD", "name": "Bangladesh"},
    {"code": "PAK", "iso3": "PAK", "name": "Pakistan"},
    {"code": "LKA", "iso3": "LKA", "name": "Sri Lanka"},
    # Southeast Asia — dengue dominant
    {"code": "IDN", "iso3": "IDN", "name": "Indonesia"},
    {"code": "PHL", "iso3": "PHL", "name": "Philippines"},
    {"code": "THA", "iso3": "THA", "name": "Thailand"},
    {"code": "VNM", "iso3": "VNM", "name": "Vietnam"},
    {"code": "MYS", "iso3": "MYS", "name": "Malaysia"},
    {"code": "MMR", "iso3": "MMR", "name": "Myanmar"},
    # Latin America — dengue dominant
    {"code": "BRA", "iso3": "BRA", "name": "Brazil"},
    {"code": "COL", "iso3": "COL", "name": "Colombia"},
    {"code": "PER", "iso3": "PER", "name": "Peru"},
    {"code": "BOL", "iso3": "BOL", "name": "Bolivia"},
    {"code": "ECU", "iso3": "ECU", "name": "Ecuador"},
    {"code": "VEN", "iso3": "VEN", "name": "Venezuela"},
    # Middle East / North Africa
    {"code": "EGY", "iso3": "EGY", "name": "Egypt"},
    {"code": "YEM", "iso3": "YEM", "name": "Yemen"},
]

def centroid(coordinates):
    """Compute centroid of a GeoJSON polygon or multipolygon."""
    try:
        if isinstance(coordinates[0][0][0], list):
            # MultiPolygon — use largest ring
            coords = max(coordinates, key=lambda p: len(p[0]))[0]
        else:
            coords = coordinates[0]
        lats = [c[1] for c in coords]
        lngs = [c[0] for c in coords]
        return sum(lats)/len(lats), sum(lngs)/len(lngs)
    except Exception:
        return None, None

def fetch_gadm(country_code):
    """Download GADM level-1 GeoJSON for a country."""
    # GADM v4.1 GeoJSON via gadm.org
    url = f"https://geodata.ucdavis.edu/gadm/gadm4.1/json/gadm41_{country_code}_1.json.zip"
    print(f"  Downloading {url}...", end=" ", flush=True)
    try:
        with tempfile.TemporaryDirectory() as tmp:
            zip_path = os.path.join(tmp, "gadm.zip")
            urllib.request.urlretrieve(url, zip_path)
            with zipfile.ZipFile(zip_path) as z:
                names = [n for n in z.namelist() if n.endswith(".json")]
                if not names:
                    print("✗ no JSON in zip")
                    return None
                with z.open(names[0]) as f:
                    data = json.load(f)
            print(f"✓ ({len(data.get('features', []))} features)")
            return data
    except Exception as e:
        print(f"✗ {e}")
        return None

def upsert_districts(rows):
    """Upsert district rows into Supabase."""
    import urllib.parse
    url = f"{SUPABASE_URL}/rest/v1/districts"
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates",
    }
    body = json.dumps(rows).encode()
    req = urllib.request.Request(url, data=body, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return r.status in (200, 201)
    except urllib.error.HTTPError as e:
        print(f"    DB error {e.code}: {e.read().decode()[:200]}")
        return False

def process_country(country):
    geojson = fetch_gadm(country["code"])
    if not geojson:
        return 0

    rows = []
    for feat in geojson.get("features", []):
        props = feat.get("properties", {})
        geom  = feat.get("geometry", {})

        # Extract names (GADM uses NAME_1 for level-1 admin)
        state    = props.get("NAME_1", "")
        district = props.get("NAME_1", "")  # level-1 is state/province

        # Compute centroid
        lat, lng = centroid(geom.get("coordinates", []))
        if lat is None:
            continue

        district_id = f"{country['iso3']}-{state}".replace(" ", "_").replace("/", "_")

        # Simplify geometry to reduce storage (keep every 5th point)
        simplified_geom = simplify_geometry(geom)

        rows.append({
            "id":           district_id,
            "country":      country["name"],
            "country_code": country["iso3"],
            "state":        state,
            "district":     district,
            "lat":          round(lat, 4),
            "lng":          round(lng, 4),
            "geometry":     simplified_geom,
        })

    if not rows:
        return 0

    # Upsert in batches of 50
    total = 0
    for i in range(0, len(rows), 50):
        batch = rows[i:i+50]
        if upsert_districts(batch):
            total += len(batch)
        time.sleep(0.2)

    return total

def simplify_geometry(geom, keep_every=5):
    """Reduce polygon point count for storage efficiency."""
    try:
        def simplify_ring(ring):
            return ring[::keep_every] + [ring[-1]]

        if geom["type"] == "Polygon":
            return {
                "type": "Polygon",
                "coordinates": [simplify_ring(ring) for ring in geom["coordinates"]]
            }
        elif geom["type"] == "MultiPolygon":
            return {
                "type": "MultiPolygon",
                "coordinates": [
                    [simplify_ring(ring) for ring in poly]
                    for poly in geom["coordinates"]
                ]
            }
        return geom
    except Exception:
        return geom

def main():
    print("="*60)
    print("Bzzt — GADM District Loader")
    print(f"Loading {len(COUNTRIES)} countries into Supabase")
    print("="*60)

    total_districts = 0
    failed = []

    for country in COUNTRIES:
        print(f"\n{country['name']} ({country['code']})")
        count = process_country(country)
        if count > 0:
            print(f"  → {count} districts loaded")
            total_districts += count
        else:
            failed.append(country["name"])
            print(f"  → skipped (no data)")
        time.sleep(1)  # be polite to GADM server

    print(f"\n{'='*60}")
    print(f"Done. {total_districts} districts loaded across {len(COUNTRIES)-len(failed)} countries.")
    if failed:
        print(f"Failed: {', '.join(failed)}")
    print("\nNext: run the daily batch scan to populate risk_scores for each district.")

if __name__ == "__main__":
    main()
