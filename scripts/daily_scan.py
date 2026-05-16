"""
Bzzt — Daily District Risk Scan
=================================
Runs once daily via GitHub Actions at 2am UTC.

Scoring pipeline (in order):
  1. Fetch climate (Open-Meteo, 90 days)
  2. Score via trained logistic regression if models/dengue_model.pkl exists,
     else fall back to rule-based thresholds
  3. Apply Google Trends real-time booster (multiplies probability if spike detected)
  4. Apply CHW report booster (fever cluster in district last 14 days)
  5. Map probability to three-tier alert: WATCH / ALERT / HIGH

Output: risk_scores table + predictions table in Supabase
"""

import os, sys, json, time, math, urllib.request, urllib.error, urllib.parse, pickle
from datetime import datetime, timedelta
import uuid

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

MODELS_DIR   = os.path.join(os.path.dirname(__file__), "../models")
MODEL_VERSION = "2.0-logistic-regression"

# ── Load trained models (if available) ───────────────────────────────────────
dengue_model  = None
malaria_model = None

try:
    with open(f"{MODELS_DIR}/dengue_model.pkl", "rb") as f:
        dengue_model = pickle.load(f)
    with open(f"{MODELS_DIR}/malaria_model.pkl", "rb") as f:
        malaria_model = pickle.load(f)
    print(f"✓ Loaded trained models from {MODELS_DIR}")
except FileNotFoundError:
    print("⚠ Trained models not found — using rule-based fallback scorer")
    MODEL_VERSION = "1.0-rule-based"

# ── Climate feature builder (shared by model + fallback) ──────────────────────

def build_features(avg_temp, avg_rain, lagged_rain, avg_humidity, month, lat,
                   baseline_temp=None, baseline_rain=None,
                   baseline_lagged=None, baseline_hum=None):
    """12-feature vector matching train_model.py FEATURE_NAMES."""
    def anomaly(val, base):
        if val is None or base is None or base == 0: return 0.0
        return (val or 0) - base

    rain_capped   = min(avg_rain   or 0, 150)  # cap at 150mm — floods flush larvae
    lagged_capped = min(lagged_rain or 0, 150)
    angle = 2 * math.pi * month / 12

    return [
        avg_temp       or 0,
        rain_capped,
        lagged_capped,
        avg_humidity   or 0,
        anomaly(avg_temp,    baseline_temp),
        anomaly(rain_capped, baseline_rain),
        anomaly(lagged_capped, baseline_lagged),
        anomaly(avg_humidity,  baseline_hum),
        math.sin(angle),
        math.cos(angle),
        lat            or 0,
        abs(lat        or 0),
    ]

# ── Fallback rule-based scorer (used if models not trained yet) ───────────────

def rule_score_dengue(temp, rain, lagged_rain, humidity):
    met = sum([temp > 26, 8 <= rain <= 60, lagged_rain >= 8, humidity >= 60])
    if met >= 3: return 0.82  # maps to HIGH
    if met >= 2: return 0.50  # maps to ALERT
    if met >= 1: return 0.35  # maps to WATCH
    return 0.10               # LOW

def rule_score_malaria(temp, rain, lagged_rain, humidity):
    met = sum([temp > 24, rain > 25, lagged_rain > 25, humidity > 65])
    if met >= 3: return 0.82
    if met >= 2: return 0.50
    if met >= 1: return 0.35
    return 0.10

def prob_to_tier(p):
    """Map probability to alert tier string."""
    if p >= 0.80: return "HIGH"
    if p >= 0.60: return "ALERT"
    if p >= 0.35: return "WATCH"
    return "LOW"

def prob_to_score(p):
    return round(p * 100)

# ── Open-Meteo climate fetch ──────────────────────────────────────────────────

def fetch_climate(lat, lng):
    url = (f"https://archive-api.open-meteo.com/v1/archive"
           f"?latitude={lat}&longitude={lng}"
           f"&start_date={(datetime.utcnow()-timedelta(days=90)).strftime('%Y-%m-%d')}"
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
        recent_temps = temps[-30:] if len(temps) >= 30 else temps
        recent_rains = rains[-30:] if len(rains) >= 30 else rains
        recent_hums  = hums[-30:]  if len(hums)  >= 30 else hums
        lagged_window = rains[6:21] if len(rains) >= 21 else rains[:14]
        return {
            "avg_temp":        round(avg(recent_temps), 1),
            "avg_rainfall":    round(avg(recent_rains), 2),
            "lagged_rainfall": round(avg(lagged_window), 2),
            "avg_humidity":    round(avg(recent_hums), 1),
            "month":           datetime.utcnow().month,
        }
    except:
        return None

# ── Supabase helpers ──────────────────────────────────────────────────────────

def supabase_get(path, params=""):
    req = urllib.request.Request(
        f"{SUPABASE_URL}/rest/v1/{path}?{params}",
        headers={"apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}"}
    )
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read())

def supabase_insert(table, rows):
    if not rows: return True
    body = json.dumps(rows).encode()
    req  = urllib.request.Request(
        f"{SUPABASE_URL}/rest/v1/{table}",
        data=body,
        headers={
            "apikey": SUPABASE_KEY,
            "Authorization": f"Bearer {SUPABASE_KEY}",
            "Content-Type": "application/json",
            "Prefer": "return=minimal",
        },
        method="POST"
    )
    try:
        with urllib.request.urlopen(req, timeout=30): return True
    except urllib.error.HTTPError as e:
        print(f"  insert error {e.code}: {e.read().decode()[:100]}")
        return False

# ── Google Trends booster (real-time symptom signal) ─────────────────────────
# Fetches the Trends signal for a country and returns a probability multiplier.
# Rising searches = virus already circulating → boost confidence.

TRENDS_CACHE: dict = {}  # iso3 → multiplier, cached for the run

# Country iso3 → Google Trends geo code + local search terms
TRENDS_CONFIG = {
    "NGA": ("NG", ["malaria symptoms", "fever treatment"]),
    "IND": ("IN", ["dengue bukhar", "malaria lakshan"]),
    "BGD": ("BD", ["dengue jor", "malaria"]),
    "PHL": ("PH", ["dengue sintomas", "dengue fever"]),
    "BRA": ("BR", ["dengue sintomas", "febre dengue"]),
    "THA": ("TH", ["ไข้เลือดออก", "dengue"]),
    "IDN": ("ID", ["gejala demam berdarah", "dengue"]),
    "VNM": ("VN", ["sốt xuất huyết", "dengue"]),
    "KEN": ("KE", ["malaria symptoms", "dengue fever"]),
    "COL": ("CO", ["síntomas dengue", "malaria"]),
}

# Correct timezone offsets (minutes west of UTC) per country
COUNTRY_TZ = {
    "NGA": -60, "GHA": -60, "KEN": -180, "IND": -330, "BGD": -360,
    "PHL": -480, "BRA": 180, "THA": -420, "IDN": -420, "VNM": -420, "COL": 300,
}

def get_trends_multiplier(iso3: str) -> float:
    """Returns 1.0 (neutral), 1.4 (rising), or 0.9 (falling)."""
    if iso3 in TRENDS_CACHE:
        return TRENDS_CACHE[iso3]

    config = TRENDS_CONFIG.get(iso3)
    if not config:
        TRENDS_CACHE[iso3] = 1.0
        return 1.0

    geo, terms = config
    tz = COUNTRY_TZ.get(iso3, 0)

    try:
        keyword = urllib.parse.quote(terms[0])
        url = (f"https://trends.google.com/trends/api/explore"
               f"?hl=en&tz={tz}"
               f'&req={{"comparisonItem":[{{"keyword":"{terms[0]}","geo":"{geo}","time":"today 3-m"}}],"category":0,"property":""}}')

        req = urllib.request.Request(url, headers={
            "User-Agent": "Mozilla/5.0 (compatible; BzztHealthBot/1.0)"
        })
        with urllib.request.urlopen(req, timeout=10) as r:
            text = r.read().decode()

        text = text[text.index('\n')+1:]  # strip )]}', prefix
        data = json.loads(text)
        widget = next((w for w in data.get("widgets", []) if w.get("id") == "TIMESERIES"), None)
        if not widget:
            TRENDS_CACHE[iso3] = 1.0
            return 1.0

        token  = widget["token"]
        reqstr = urllib.parse.quote(json.dumps(widget["request"]))
        ts_url = (f"https://trends.google.com/trends/api/widgetdata/multiline"
                  f"?hl=en&tz={tz}&req={reqstr}&token={token}&geo={geo}")

        req2 = urllib.request.Request(ts_url, headers={
            "User-Agent": "Mozilla/5.0 (compatible; BzztHealthBot/1.0)"
        })
        with urllib.request.urlopen(req2, timeout=10) as r2:
            ts_text = r2.read().decode()

        ts_text = ts_text[ts_text.index('\n')+1:]
        ts_data = json.loads(ts_text)
        values  = [d["value"][0] for d in ts_data.get("default", {}).get("timelineData", []) if d.get("value")]

        if len(values) >= 8:
            last4 = sum(values[-4:]) / 4
            prev4 = sum(values[-8:-4]) / 4
            if prev4 > 0 and last4 > prev4 * 1.15:
                multiplier = 1.4  # rising searches → boost
            elif prev4 > 0 and last4 < prev4 * 0.85:
                multiplier = 0.9  # falling → slight reduction
            else:
                multiplier = 1.0
        else:
            multiplier = 1.0

    except:
        multiplier = 1.0

    TRENDS_CACHE[iso3] = multiplier
    return multiplier

# ── CHW report booster ────────────────────────────────────────────────────────

def get_chw_multiplier(district_id: str, chw_reports: dict) -> float:
    """1.8 if district has ≥3 CHW fever reports in last 14 days, else 1.0."""
    count = chw_reports.get(district_id, 0)
    return 1.8 if count >= 3 else 1.0

# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    now = datetime.utcnow().isoformat()
    print(f"Bzzt Daily Scan — {now}")
    print(f"Model: {MODEL_VERSION}")

    # Load all districts — paginate to avoid Supabase row limits
    print("Loading districts...", end=" ", flush=True)
    districts = []
    offset = 0
    while True:
        page = supabase_get(
            "districts",
            f"select=id,country,country_code,state,district,lat,lng,population&limit=1000&offset={offset}"
        )
        districts.extend(page)
        if len(page) < 1000: break
        offset += 1000
    print(f"✓ {len(districts)} districts")

    # Load climate baselines for anomaly scoring
    print("Loading climate baselines...", end=" ", flush=True)
    try:
        baselines_raw = supabase_get("climate_baselines", "select=district_id,month,baseline_temp,baseline_rainfall,baseline_lagged_rain,baseline_humidity&limit=20000")
        baselines = {}
        for b in baselines_raw:
            baselines.setdefault(b["district_id"], {})[b["month"]] = b
        print(f"✓ {len(baselines)} districts with baselines")
    except:
        baselines = {}
        print("⚠ No baselines loaded — anomaly features will be zero")

    # Load recent CHW reports (last 14 days) — count per district
    print("Loading CHW reports...", end=" ", flush=True)
    cutoff_chw = (datetime.utcnow() - timedelta(days=14)).isoformat()
    try:
        chw_raw = supabase_get(
            "chw_reports",
            f"select=district_id,fever_cases&created_at=gte.{cutoff_chw}&limit=500"
        )
        chw_reports: dict = {}
        for c in chw_raw:
            did = c.get("district_id") or ""
            chw_reports[did] = chw_reports.get(did, 0) + 1
        print(f"✓ {len(chw_reports)} districts with recent CHW activity")
    except:
        chw_reports = {}
        print("⚠ CHW reports unavailable")

    # Pre-fetch Google Trends for all unique country codes in one pass
    print("Fetching Google Trends signals...", end=" ", flush=True)
    unique_iso3 = set(d.get("country_code", "") for d in districts if d.get("country_code"))
    for iso3 in unique_iso3:
        get_trends_multiplier(iso3)
        time.sleep(0.3)
    active_trends = sum(1 for v in TRENDS_CACHE.values() if v > 1.0)
    print(f"✓ {active_trends}/{len(TRENDS_CACHE)} countries with rising trends signal")

    high_count = watch_count = alert_count = low_count = error_count = 0
    batch = []
    pred_batch = []

    for i, d in enumerate(districts):
        lat, lng = d.get("lat"), d.get("lng")
        if lat is None or lng is None:
            error_count += 1
            continue

        climate = fetch_climate(lat, lng)
        if not climate:
            error_count += 1
            continue

        month     = climate["month"]
        iso3      = d.get("country_code", "")
        did       = d["id"]
        b         = baselines.get(did, {}).get(month, {})

        avg_temp     = climate["avg_temp"]
        avg_rain     = climate["avg_rainfall"]
        lagged_rain  = climate["lagged_rainfall"]
        avg_humidity = climate["avg_humidity"]

        # ── Score dengue ───────────────────────────────────────────────────────
        if dengue_model:
            feats = build_features(
                avg_temp, avg_rain, lagged_rain, avg_humidity, month, lat,
                b.get("baseline_temp"), b.get("baseline_rainfall"),
                b.get("baseline_lagged_rain"), b.get("baseline_humidity")
            )
            d_prob = float(dengue_model.predict_proba([feats])[0][1])
        else:
            d_prob = rule_score_dengue(avg_temp, avg_rain, lagged_rain, avg_humidity)

        # ── Score malaria ──────────────────────────────────────────────────────
        if malaria_model:
            feats = build_features(
                avg_temp, avg_rain, lagged_rain, avg_humidity, month, lat,
                b.get("baseline_temp"), b.get("baseline_rainfall"),
                b.get("baseline_lagged_rain"), b.get("baseline_humidity")
            )
            m_prob = float(malaria_model.predict_proba([feats])[0][1])
        else:
            m_prob = rule_score_malaria(avg_temp, avg_rain, lagged_rain, avg_humidity)

        # ── Apply real-time boosters ───────────────────────────────────────────
        trends_mult = get_trends_multiplier(iso3)
        chw_mult    = get_chw_multiplier(did, chw_reports)
        # Cap boosted probability at 0.97 to avoid overconfident alerts
        d_prob_boosted = min(d_prob * trends_mult * chw_mult, 0.97)
        m_prob_boosted = min(m_prob * trends_mult * chw_mult, 0.97)

        d_level = prob_to_tier(d_prob_boosted)
        m_level = prob_to_tier(m_prob_boosted)
        d_score = prob_to_score(d_prob_boosted)
        m_score = prob_to_score(m_prob_boosted)

        top = d_level if d_prob_boosted >= m_prob_boosted else m_level
        if top == "HIGH":  high_count  += 1
        elif top == "ALERT": alert_count += 1
        elif top == "WATCH": watch_count += 1
        else: low_count += 1

        batch.append({
            "district_id":        did,
            "city_id":            did,
            "city_name":          d.get("district"),
            "country":            d.get("country"),
            "computed_at":        now,
            "dengue_level":       d_level,
            "malaria_level":      m_level,
            "dengue_score":       d_score,
            "malaria_score":      m_score,
            "population_at_risk": d.get("population"),
            "avg_temp":           avg_temp,
            "avg_rainfall":       avg_rain,
            "lagged_rainfall":    lagged_rain,
            "avg_humidity":       avg_humidity,
            "lat":                lat,
            "lng":                lng,
            "model_version":      MODEL_VERSION,
        })

        pred_batch.append({
            "id":               str(uuid.uuid4()),
            "city_id":          did,
            "city_name":        d.get("district"),
            "country":          d.get("country"),
            "predicted_at":     now,
            "validate_after":   (datetime.utcnow() + timedelta(days=35)).isoformat(),
            "dengue_level":     d_level,
            "malaria_level":    m_level,
            "probability_score": round(max(d_prob_boosted, m_prob_boosted) * 100),
            "avg_temp":         avg_temp,
            "avg_rainfall":     avg_rain,
            "lagged_rainfall":  lagged_rain,
            "avg_humidity":     avg_humidity,
        })

        if len(batch) >= 50:
            supabase_insert("risk_scores", batch)
            batch = []
        if len(pred_batch) >= 50:
            supabase_insert("predictions", pred_batch)
            pred_batch = []

        if (i + 1) % 100 == 0:
            print(f"  {i+1}/{len(districts)} districts scanned...")

        time.sleep(0.05)

    # Final flush
    if batch:      supabase_insert("risk_scores", batch)
    if pred_batch: supabase_insert("predictions", pred_batch)

    print(f"\nScan complete:")
    print(f"  Districts scanned: {len(districts) - error_count}")
    print(f"  HIGH:  {high_count}")
    print(f"  ALERT: {alert_count}")
    print(f"  WATCH: {watch_count}")
    print(f"  LOW:   {low_count}")
    print(f"  Errors: {error_count}")

    # Prune old risk_scores — keep only last 90 days
    cutoff = (datetime.utcnow() - timedelta(days=90)).isoformat()
    prune_url = f"{SUPABASE_URL}/rest/v1/risk_scores?computed_at=lt.{cutoff}"
    req = urllib.request.Request(prune_url, headers={
        "apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}",
        "Prefer": "return=minimal",
    }, method="DELETE")
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            print(f"Pruned risk_scores older than 90 days (status {r.status})")
    except: pass

    summary = f"Bzzt scan: {high_count} HIGH, {alert_count} ALERT, {watch_count} WATCH across {len(districts)-error_count} districts"
    print(f"\n::notice::{summary}")

if __name__ == "__main__":
    main()
