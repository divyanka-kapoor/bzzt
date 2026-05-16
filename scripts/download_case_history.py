"""
Download OpenDengue V1.3 Spatial extract + WHO GHO malaria data.
Aggregates to country/state/month level and loads into Supabase case_history table.

Run: python3 scripts/download_case_history.py
"""

import os, sys, json, csv, io, zipfile, urllib.request, urllib.error, math, time
from datetime import datetime

env_path = os.path.join(os.path.dirname(__file__), "../.env.local")
URL = KEY = ""
with open(env_path) as f:
    for line in f:
        if line.startswith("SUPABASE_URL="):   URL = line.split("=",1)[1].strip().strip('"')
        elif line.startswith("SUPABASE_SERVICE_ROLE_KEY="): KEY = line.split("=",1)[1].strip().strip('"')

if not URL or not KEY:
    print("ERROR: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required")
    sys.exit(1)

# ── Supabase helpers ──────────────────────────────────────────────────────────

def sb_upsert(table, rows, batch=50):
    if not rows: return 0
    inserted = 0
    for i in range(0, len(rows), batch):
        chunk = rows[i:i+batch]
        body  = json.dumps(chunk).encode()
        req   = urllib.request.Request(
            f"{URL}/rest/v1/{table}",
            data=body,
            headers={
                "apikey": KEY, "Authorization": f"Bearer {KEY}",
                "Content-Type": "application/json",
                "Prefer": "resolution=merge-duplicates,return=minimal",
            },
            method="POST"
        )
        # Retry up to 3 times on connection errors
        for attempt in range(3):
            try:
                with urllib.request.urlopen(req, timeout=30):
                    inserted += len(chunk)
                break
            except urllib.error.HTTPError as e:
                print(f"  upsert error {e.code}: {e.read().decode()[:120]}")
                break
            except Exception as e:
                if attempt < 2:
                    time.sleep(2 ** attempt)
                else:
                    print(f"  upsert failed after 3 attempts: {e}")
        time.sleep(0.05)
    return inserted

def sb_exec(sql):
    """Run a SQL statement via Supabase REST RPC."""
    req = urllib.request.Request(
        f"{URL}/rest/v1/rpc/exec_sql",
        data=json.dumps({"query": sql}).encode(),
        headers={
            "apikey": KEY, "Authorization": f"Bearer {KEY}",
            "Content-Type": "application/json",
        },
        method="POST"
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return r.status
    except:
        return None

# ── Create table ──────────────────────────────────────────────────────────────

CREATE_SQL = """
CREATE TABLE IF NOT EXISTS case_history (
    id              BIGSERIAL PRIMARY KEY,
    iso3            TEXT NOT NULL,
    country         TEXT NOT NULL,
    adm1_name       TEXT,
    adm2_name       TEXT,
    disease         TEXT NOT NULL,   -- 'dengue' | 'malaria' | 'chikungunya'
    year            INTEGER NOT NULL,
    month           INTEGER,         -- 1-12, NULL for annual records
    cases           FLOAT,
    source          TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (iso3, adm1_name, adm2_name, disease, year, month)
);
CREATE INDEX IF NOT EXISTS case_history_iso3_idx     ON case_history(iso3);
CREATE INDEX IF NOT EXISTS case_history_disease_idx  ON case_history(disease);
CREATE INDEX IF NOT EXISTS case_history_adm1_idx     ON case_history(adm1_name);
"""

print("Creating case_history table...")
# Use Supabase SQL editor approach — try direct table creation via upsert with dummy
# Actually we'll just do it manually in Supabase and skip if exists
# Print the SQL for the user to run if needed
print("Run this in Supabase SQL editor if table doesn't exist:")
print(CREATE_SQL)
print()

# ── 1. OpenDengue V1.3 — Dengue cases ────────────────────────────────────────

print("="*60)
print("Step 1: Downloading OpenDengue V1.3 Spatial extract...")
print("="*60)

OD_URL = "https://raw.githubusercontent.com/OpenDengue/master-repo/main/data/releases/V1.3/Spatial_extract_V1_3.zip"

try:
    print("  Fetching zip...", end=" ", flush=True)
    with urllib.request.urlopen(OD_URL, timeout=120) as r:
        zip_bytes = r.read()
    print(f"✓ ({len(zip_bytes)//1024}KB)")
except Exception as e:
    print(f"✗ {e}")
    sys.exit(1)

# Parse CSV from zip
print("  Parsing CSV...", end=" ", flush=True)
with zipfile.ZipFile(io.BytesIO(zip_bytes)) as z:
    with z.open(z.namelist()[0]) as f:
        content = f.read().decode('utf-8', errors='replace')

reader = csv.DictReader(io.StringIO(content))
rows   = list(reader)
print(f"✓ ({len(rows):,} rows)")

# Filter and aggregate to country+adm1+year+month
# Only use Admin1 or Admin2 spatial resolution records
print("  Aggregating to monthly state level...", end=" ", flush=True)

from collections import defaultdict

# Key: (iso3, country, adm1, adm2, year, month)
agg = defaultdict(float)
meta = {}  # key → (iso3, country, adm1, adm2)

skipped = 0
for row in rows:
    s_res = row.get('S_res', '')
    if s_res not in ('Admin1', 'Admin2'):
        skipped += 1
        continue

    iso3    = (row.get('ISO_A0') or '').strip().upper()
    country = (row.get('adm_0_name') or '').strip().title()
    adm1    = (row.get('adm_1_name') or '').strip()
    adm2    = (row.get('adm_2_name') or '').strip()
    if adm1 in ('NA', 'N/A', ''): adm1 = None
    if adm2 in ('NA', 'N/A', ''): adm2 = None

    year_str = row.get('Year', '')
    try: year = int(year_str)
    except: continue

    # Parse month from start date
    start = row.get('calendar_start_date', '')
    try: month = datetime.strptime(start[:10], '%Y-%m-%d').month
    except: month = None

    try: cases = float(row.get('dengue_total') or 0)
    except: cases = 0.0

    if not iso3 or year < 2000: continue

    key = (iso3, country, adm1 or '', adm2 or '', year, month)
    agg[key] += cases
    meta[key] = (iso3, country, adm1, adm2)

print(f"✓ ({len(agg):,} district-months, {skipped:,} national-only skipped)")

# Build rows for Supabase
dengue_rows = []
for key, cases in agg.items():
    iso3, country, adm1, adm2, year, month = key
    dengue_rows.append({
        "iso3":     iso3,
        "country":  country,
        "adm1_name": adm1 or None,
        "adm2_name": adm2 or None,
        "disease":  "dengue",
        "year":     year,
        "month":    month,
        "cases":    round(cases, 1),
        "source":   "OpenDengue_V1.3",
    })

print(f"  Loading {len(dengue_rows):,} dengue records into Supabase...")
inserted = sb_upsert("case_history", dengue_rows)
print(f"  ✓ {inserted:,} dengue records loaded")

# ── 2. WHO GHO — Malaria estimated cases ─────────────────────────────────────

print()
print("="*60)
print("Step 2: Fetching WHO GHO malaria data...")
print("="*60)

# WHO GHO OData API — estimated malaria cases by country and year
# Indicator: MALARIA_ESTIMATED_CASES
GHO_URL = "https://ghoapi.azureedge.net/api/MALARIA_ESTIMATED_CASES?%24filter=TimeDimensionBegin%20ge%20'2000-01-01'&%24top=5000"

try:
    print("  Fetching WHO GHO API...", end=" ", flush=True)
    req = urllib.request.Request(GHO_URL, headers={"Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=60) as r:
        gho = json.loads(r.read())
    values = gho.get("value", [])
    print(f"✓ ({len(values):,} records)")
except Exception as e:
    print(f"✗ {e} — skipping malaria GHO data")
    values = []

malaria_rows = []
for v in values:
    iso3    = v.get("SpatialDim", "")
    year    = v.get("TimeDim")
    numeric = v.get("NumericValue")
    if not iso3 or not year or numeric is None: continue
    try:
        cases = float(numeric)
        year  = int(year)
    except: continue
    if year < 2000: continue

    # Country name from WHO dim — use iso3 as fallback
    country = v.get("SpatialDimType", iso3)

    malaria_rows.append({
        "iso3":      iso3,
        "country":   iso3,   # we only have ISO3 from GHO; country name not in this endpoint
        "adm1_name": None,   # country-level only from GHO
        "adm2_name": None,
        "disease":   "malaria",
        "year":      year,
        "month":     None,   # annual estimates
        "cases":     round(cases),
        "source":    "WHO_GHO",
    })

if malaria_rows:
    print(f"  Loading {len(malaria_rows):,} malaria records into Supabase...")
    inserted = sb_upsert("case_history", malaria_rows)
    print(f"  ✓ {inserted:,} malaria records loaded")
else:
    print("  No malaria records to load")

# ── 3. Summary ────────────────────────────────────────────────────────────────

print()
print("="*60)
print("Summary")
print("="*60)
print(f"  Dengue records:  {len(dengue_rows):,}")
print(f"  Malaria records: {len(malaria_rows):,}")
print(f"  Total:           {len(dengue_rows)+len(malaria_rows):,}")
print()
print("Next: python3 scripts/fetch_climate_history.py")
