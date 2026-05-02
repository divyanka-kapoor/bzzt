"""
Bzzt — Daily District Risk Scan
=================================
Runs once daily via GitHub Actions at 2am UTC.
Fetches all districts from Supabase, scores dengue + malaria risk
for each using Open-Meteo climate data, and writes results to risk_scores.

Unlike the in-app real-time scan, this covers all 797 districts
across 26 endemic countries — not just hardcoded cities.
"""

import os, sys, json, time, math, urllib.request
from datetime import datetime, timedelta

# ── Config ────────────────────────────────────────────────────────────────────
SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")

if not SUPABASE_URL or not SUPABASE_KEY:
    env_path = os.path.join(os.path.dirname(__file__), "../.env.local")
    if os.path.exists(env_path):
        with open(env_path) as f:
            for line in f:
                if line.startswith("SUPABASE_URL="):
                    SUPABASE_URL = line.split("=",1)[1].strip().strip('"')
                elif line.startswith("SUPABASE_SERVICE_ROLE_KEY="):
                    SUPABASE_KEY = line.split("=",1)[1].strip().strip('"')

if not SUPABASE_URL or not SUPABASE_KEY:
    print("ERROR: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required")
    sys.exit(1)

MODEL_VERSION = "1.0"

# ── Risk model (identical to production) ─────────────────────────────────────
def score_dengue(temp, rain, lagged_rain, humidity):
    met = sum([temp > 26, 8 <= rain <= 60, lagged_rain >= 8, humidity >= 60])
    if met >= 3: return "HIGH", round(75 + met * 5)
    if met >= 2: return "WATCH", round(40 + met * 10)
    return "LOW", round(5 + met * 5)

def score_malaria(temp, rain, lagged_rain, humidity):
    met = sum([temp > 24, rain > 25, lagged_rain > 25, humidity > 65])
    if met >= 3: return "HIGH", round(75 + met * 5)
    if met >= 2: return "WATCH", round(40 + met * 10)
    return "LOW", round(5 + met * 5)

# ── Open-Meteo climate ────────────────────────────────────────────────────────
def fetch_climate(lat, lng):
    url = (f"https://archive-api.open-meteo.com/v1/archive"
           f"?latitude={lat}&longitude={lng}"
           f"&start_date={(datetime.utcnow()-timedelta(days=30)).strftime('%Y-%m-%d')}"
           f"&end_date={datetime.utcnow().strftime('%Y-%m-%d')}"
           f"&daily=temperature_2m_max,precipitation_sum,relative_humidity_2m_max"
           f"&timezone=auto")
    try:
        with urllib.request.urlopen(url, timeout=15) as r:
            d = json.loads(r.read())
        temps = [v for v in d["daily"].get("temperature_2m_max",[]) if v is not None]
        rains = [v for v in d["daily"].get("precipitation_sum",[]) if v is not None]
        hums  = [v for v in d["daily"].get("relative_humidity_2m_max",[]) if v is not None]
        if not temps: return None
        avg = lambda lst: sum(lst)/len(lst) if lst else 0
        return {
            "avg_temp":      round(avg(temps), 1),
            "avg_rainfall":  round(avg(rains), 2),
            "lagged_rainfall": round(avg(rains[-14:]), 2),
            "avg_humidity":  round(avg(hums), 1),
        }
    except Exception as e:
        return None

# ── Supabase helpers ──────────────────────────────────────────────────────────
def supabase_get(path, params=""):
    url = f"{SUPABASE_URL}/rest/v1/{path}?{params}"
    req = urllib.request.Request(url, headers={
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
    })
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read())

def supabase_insert(table, rows):
    url = f"{SUPABASE_URL}/rest/v1/{table}"
    body = json.dumps(rows).encode()
    req = urllib.request.Request(url, data=body, headers={
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal",
    }, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=30): return True
    except urllib.error.HTTPError as e:
        print(f"  insert error {e.code}: {e.read().decode()[:100]}")
        return False

# ── Main ──────────────────────────────────────────────────────────────────────
def main():
    now = datetime.utcnow().isoformat()
    print(f"Bzzt Daily Scan — {now}")

    # Load all districts
    print("Loading districts from Supabase...", end=" ", flush=True)
    districts = supabase_get("districts", "select=id,country,country_code,state,district,lat,lng,population&limit=1000")
    print(f"✓ {len(districts)} districts")

    high_count = watch_count = low_count = error_count = 0
    batch = []

    for i, d in enumerate(districts):
        lat, lng = d["lat"], d["lng"]

        climate = fetch_climate(lat, lng)
        if not climate:
            error_count += 1
            continue

        d_level, d_score = score_dengue(
            climate["avg_temp"], climate["avg_rainfall"],
            climate["lagged_rainfall"], climate["avg_humidity"]
        )
        m_level, m_score = score_malaria(
            climate["avg_temp"], climate["avg_rainfall"],
            climate["lagged_rainfall"], climate["avg_humidity"]
        )

        top = d_level if d_level == "HIGH" or m_level != "HIGH" else m_level
        if top == "HIGH": high_count += 1
        elif top == "WATCH": watch_count += 1
        else: low_count += 1

        batch.append({
            "district_id":        d["id"],
            "city_id":            d["id"],
            "city_name":          d["district"],
            "country":            d["country"],
            "computed_at":        now,
            "dengue_level":       d_level,
            "malaria_level":      m_level,
            "dengue_score":       d_score,
            "malaria_score":      m_score,
            "population_at_risk": d.get("population"),
            "avg_temp":           climate["avg_temp"],
            "avg_rainfall":       climate["avg_rainfall"],
            "lagged_rainfall":    climate["lagged_rainfall"],
            "avg_humidity":       climate["avg_humidity"],
            "lat":                lat,
            "lng":                lng,
            "model_version":      MODEL_VERSION,
        })

        # Insert in batches of 50
        if len(batch) >= 50:
            supabase_insert("risk_scores", batch)
            batch = []

        # Progress every 100 districts
        if (i + 1) % 100 == 0:
            print(f"  {i+1}/{len(districts)} districts scanned...")

        time.sleep(0.05)  # ~20 req/sec — stay within Open-Meteo free limits

    # Insert remaining
    if batch:
        supabase_insert("risk_scores", batch)

    total = len(districts) - error_count
    print(f"\nScan complete:")
    print(f"  Districts scanned: {total}")
    print(f"  HIGH:  {high_count} ({100*high_count//max(total,1)}%)")
    print(f"  WATCH: {watch_count} ({100*watch_count//max(total,1)}%)")
    print(f"  LOW:   {low_count} ({100*low_count//max(total,1)}%)")
    print(f"  Errors: {error_count}")

    # Summary for GitHub Actions log
    print(f"\n::notice::Bzzt scan: {high_count} HIGH, {watch_count} WATCH, {low_count} LOW across {total} districts")

if __name__ == "__main__":
    main()
