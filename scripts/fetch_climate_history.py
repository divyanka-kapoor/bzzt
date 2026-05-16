"""
For every district centroid in Supabase, fetch 10 years of monthly climate
from Open-Meteo archive and compute 5-year rolling baselines for anomaly scoring.

Stores results in climate_baselines table:
  (district_id, month, baseline_temp, baseline_rainfall, baseline_lagged_rain, baseline_humidity)

Run: python3 scripts/fetch_climate_history.py
"""

import os, sys, json, time, urllib.request, urllib.error
from datetime import datetime, timedelta
from collections import defaultdict

env_path = os.path.join(os.path.dirname(__file__), "../.env.local")
URL = KEY = ""
with open(env_path) as f:
    for line in f:
        if line.startswith("SUPABASE_URL="):   URL = line.split("=",1)[1].strip().strip('"')
        elif line.startswith("SUPABASE_SERVICE_ROLE_KEY="): KEY = line.split("=",1)[1].strip().strip('"')

# ── Supabase helpers ──────────────────────────────────────────────────────────

def sb_get(path, params=""):
    req = urllib.request.Request(
        f"{URL}/rest/v1/{path}?{params}",
        headers={"apikey": KEY, "Authorization": f"Bearer {KEY}"}
    )
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read())

def sb_upsert(table, rows, batch=200):
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
        try:
            with urllib.request.urlopen(req, timeout=30): inserted += len(chunk)
        except urllib.error.HTTPError as e:
            print(f"  upsert error {e.code}: {e.read().decode()[:120]}")
    return inserted

# ── Open-Meteo: 10 years of monthly climate ───────────────────────────────────

TODAY     = datetime.utcnow()
END_DATE  = TODAY.strftime('%Y-%m-%d')
START_DATE = (TODAY - timedelta(days=365*10)).strftime('%Y-%m-%d')  # 10 years back

def fetch_monthly_climate(lat, lng):
    """
    Returns dict: month (1-12) → {temp, rainfall, lagged_rain, humidity}
    averaged over all years in the 10-year window.
    lagged_rain = avg rainfall 70-84 days prior (true 10-12 week lag).
    """
    url = (
        f"https://archive-api.open-meteo.com/v1/archive"
        f"?latitude={lat}&longitude={lng}"
        f"&start_date={START_DATE}&end_date={END_DATE}"
        f"&daily=temperature_2m_max,precipitation_sum,relative_humidity_2m_max"
        f"&timezone=auto"
    )
    try:
        with urllib.request.urlopen(url, timeout=20) as r:
            d = json.loads(r.read())
        dates = d["daily"].get("time", [])
        temps = d["daily"].get("temperature_2m_max", [])
        rains = d["daily"].get("precipitation_sum", [])
        hums  = d["daily"].get("relative_humidity_2m_max", [])

        if not dates: return None

        # Group by calendar month across all years
        monthly: dict = defaultdict(lambda: {"temps":[], "rains":[], "hums":[], "lagged":[]})

        for i, date_str in enumerate(dates):
            month = int(date_str[5:7])
            if temps[i] is not None: monthly[month]["temps"].append(temps[i])
            if rains[i] is not None: monthly[month]["rains"].append(rains[i])
            if hums[i]  is not None: monthly[month]["hums"].append(hums[i])
            # Lagged rain: value 77 days ago (approx 11 weeks)
            lag_idx = i - 77
            if lag_idx >= 0 and rains[lag_idx] is not None:
                monthly[month]["lagged"].append(rains[lag_idx])

        avg = lambda lst: round(sum(lst)/len(lst), 3) if lst else None
        result = {}
        for m in range(1, 13):
            g = monthly[m]
            result[m] = {
                "baseline_temp":         avg(g["temps"]),
                "baseline_rainfall":     avg(g["rains"]),
                "baseline_lagged_rain":  avg(g["lagged"]),
                "baseline_humidity":     avg(g["hums"]),
            }
        return result
    except Exception as e:
        return None

# ── Main ──────────────────────────────────────────────────────────────────────

print("="*60)
print("Bzzt — Climate Baseline Fetcher (10 years, monthly)")
print("="*60)

# Load all districts (level-1 only — one per state, avoids duplicate centroid fetches)
print("Loading districts from Supabase...")
districts = []
offset = 0
while True:
    batch = sb_get(
        "districts",
        f"select=id,lat,lng,country&id=not.like.*_L2*&lat=not.is.null&limit=1000&offset={offset}"
    )
    if not batch: break
    districts.extend(batch)
    if len(batch) < 1000: break
    offset += 1000

# Deduplicate by rounded centroid — no point fetching same climate twice
seen_coords = {}
unique = []
for d in districts:
    if d.get("lat") is None or d.get("lng") is None: continue
    key = (round(d["lat"], 1), round(d["lng"], 1))
    if key not in seen_coords:
        seen_coords[key] = d["id"]
        unique.append(d)

print(f"  {len(districts)} districts → {len(unique)} unique centroid clusters to fetch")
print(f"  Date range: {START_DATE} → {END_DATE}")
print()

rows_to_insert = []
errors = 0

for i, dist in enumerate(unique):
    lat, lng, did = dist["lat"], dist["lng"], dist["id"]

    baselines = fetch_monthly_climate(lat, lng)
    if not baselines:
        errors += 1
        time.sleep(0.1)
        continue

    for month, vals in baselines.items():
        if any(v is None for v in vals.values()): continue
        rows_to_insert.append({
            "district_id":           did,
            "month":                 month,
            "baseline_temp":         vals["baseline_temp"],
            "baseline_rainfall":     vals["baseline_rainfall"],
            "baseline_lagged_rain":  vals["baseline_lagged_rain"],
            "baseline_humidity":     vals["baseline_humidity"],
        })

    # Flush every 50 districts
    if (i + 1) % 50 == 0:
        inserted = sb_upsert("climate_baselines", rows_to_insert)
        print(f"  {i+1}/{len(unique)} districts | {inserted} baseline rows written | errors: {errors}")
        rows_to_insert = []

    time.sleep(0.15)  # ~6 req/s, well within Open-Meteo free limits

# Final flush
if rows_to_insert:
    sb_upsert("climate_baselines", rows_to_insert)

print()
print(f"✓ Done. Errors: {errors}/{len(unique)}")
print("Next: python3 scripts/train_model.py")
