"""
Bzzt — Localized Regional Model Validation
===========================================
Tests region-specific climate thresholds derived from published epidemiology,
vs. the original global model. Re-runs validation for Brazil cities.

Regional thresholds are sourced from:
  [1] PMC10552155 — Temperature effects on DENV transmission, Ae. aegypti/albopictus
  [2] PLOS One 0251403 — Rio de Janeiro dengue-climate analysis (1-2 month lag)
  [3] PMC6518529 — Lag effects India (2-5 months; optimal rainfall 40-80mm/week cumulative)
  [4] PMC12063067 — Bangladesh dengue prediction (optimal 10mm/week, 25-34°C)
  [5] PNTD 0013175 — Regional Brazil outbreak patterns (Northeast = water-storage model)
  [6] Frontiers fpubh 2024 1456043 — Recife rainfall negative correlation confirmed
  [7] PMC9357211 — Anopheles gambiae 19-30°C, stephensi 15-37°C thermal limits
  [8] PMC9884660 — Malaria Africa rainfall >80mm/month minimum
"""

import json, time, math, os
import urllib.request
from datetime import datetime, timedelta

# ── Regional threshold profiles ───────────────────────────────────────────────
# Each profile defines dengue and malaria scoring for a geographic region.
# Sources cited inline.

REGIONAL_PROFILES = {
    "southeast_asia": {
        "description": "Indonesia, Thailand, Philippines, Vietnam, Malaysia",
        "dengue": {
            "temp_min": 22,          # [1] Ae. aegypti transmits 22-32°C
            "temp_max": 36,          # [1] survival limit
            "rain_28d_min": 5,       # weekly avg converted: 20mm/month ÷ 4
            "rain_28d_max": 25,      # [3] washout above ~100mm/month ÷ 4
            "rain_lag_days": 21,     # [1] EIP 8-12d + breeding 10d = ~21d
            "humidity_min": 60,      # [1] standard
        },
        "malaria": {
            "temp_min": 16,          # [7] Anopheles stephensi lower limit 15.3°C
            "temp_max": 37,          # [7] stephensi upper limit 37.2°C
            "rain_min": 6,           # >25mm/month ÷ 4 weeks
            "humidity_min": 60,
        },
    },
    "south_asia": {
        "description": "India, Bangladesh, Pakistan, Sri Lanka",
        "dengue": {
            "temp_min": 22,          # [4] Bangladesh optimal min 25°C, active above 22°C
            "temp_max": 34,          # [4] Bangladesh optimal max 32-34°C
            "rain_28d_min": 3,       # [4] Bangladesh optimal 10mm/week
            "rain_28d_max": 20,      # [3] India optimal cumulative 40-80mm/week → daily avg
            "rain_lag_days": 42,     # [3] India 2-5 month lag; use conservative 6-week
            "humidity_min": 60,
        },
        "malaria": {
            "temp_min": 16,          # [7] stephensi lower limit 15.3°C
            "temp_max": 37,          # [7] stephensi upper limit 37.2°C
            "rain_min": 5,
            "humidity_min": 60,
        },
    },
    "brazil_southeast": {
        "description": "São Paulo, Rio de Janeiro, Belo Horizonte (temperate subtropical)",
        "dengue": {
            "temp_min": 22,          # [2] Honorio 2009: Ae. aegypti population high above 22-24°C
            "temp_max": 36,
            "rain_28d_min": 5,       # [2] positive correlation with moderate rainfall
            "rain_28d_max": 20,      # washout above ~80mm/month ÷ 4
            "rain_lag_days": 42,     # [2] PLOS One RJ: lag 1-2 months; use 6 weeks
            "humidity_min": 60,
            "hemisphere": "south",   # flip season — peak Jan-Mar
        },
        "malaria": None,             # not endemic in urban SE Brazil
    },
    "brazil_north": {
        "description": "Manaus, Belém — Amazonian, year-round high risk",
        "dengue": {
            "temp_min": 22,
            "temp_max": 36,
            "rain_28d_min": 3,       # Amazon: year-round rainfall
            "rain_28d_max": 30,
            "rain_lag_days": 28,     # shorter lag in equatorial climate
            "humidity_min": 70,      # Amazon: always humid
            "hemisphere": "south",
        },
        "malaria": {
            "temp_min": 16,
            "temp_max": 35,
            "rain_min": 5,
            "humidity_min": 70,
        },
    },
    "brazil_northeast": {
        "description": "Recife, Fortaleza — semi-arid, water-storage model",
        # [5][6]: Recife dengue peaks in DRY months due to water storage behaviour.
        # High rainfall WASHES OUT breeding sites. Model is INVERTED vs. standard.
        # Outbreak signal = high temp + LOW rainfall (triggering water storage).
        "dengue": {
            "temp_min": 22,
            "temp_max": 36,
            "rain_28d_min": 0,       # LOW rainfall is the risk signal
            "rain_28d_max": 5,       # [6] <5mm/day avg = dry enough to store water
            "rain_lag_days": 28,
            "humidity_min": 55,      # semi-arid: lower humidity threshold
            "invert_rainfall": True, # outbreak risk when rainfall IS LOW
            "hemisphere": "south",
        },
        "malaria": None,
    },
    "sub_saharan_africa": {
        "description": "Nigeria, Kenya, Tanzania, DRC, Ghana",
        "dengue": {
            "temp_min": 22,          # [1] Ae. aegypti transmits 22-32°C
            "temp_max": 36,
            "rain_28d_min": 5,       # >20mm/month ÷ 4
            "rain_28d_max": 20,      # washout above ~80mm/month
            "rain_lag_days": 21,
            "humidity_min": 60,
        },
        "malaria": {
            "temp_min": 19,          # [7] Anopheles gambiae lower limit 19.1°C
            "temp_max": 30,          # [7] gambiae upper limit 30.1°C (P.falciparum)
            "rain_min": 20,          # [8] minimum 80mm/month ÷ 4 weeks
            "humidity_min": 65,
        },
    },
    "east_africa_highland": {
        "description": "Nairobi, Addis Ababa — highland, altitude-sensitive",
        "dengue": {
            "temp_min": 18,          # cooler at altitude
            "temp_max": 32,
            "rain_28d_min": 5,
            "rain_28d_max": 20,
            "rain_lag_days": 21,
            "humidity_min": 55,
        },
        "malaria": {
            "temp_min": 18,          # highland: warmer threshold needed for transmission
            "temp_max": 28,
            "rain_min": 15,
            "humidity_min": 60,
        },
    },
}

# City → regional profile mapping
CITY_PROFILES = {
    "sao-paulo":       "brazil_southeast",
    "rio-de-janeiro":  "brazil_southeast",
    "fortaleza":       "brazil_northeast",
    "recife":          "brazil_northeast",
    "manaus":          "brazil_north",
    "jakarta":         "southeast_asia",
    "bangkok":         "southeast_asia",
    "manila":          "southeast_asia",
    "ho-chi-minh":     "southeast_asia",
    "kuala-lumpur":    "southeast_asia",
    "dhaka":           "south_asia",
    "mumbai":          "south_asia",
    "delhi":           "south_asia",
    "karachi":         "south_asia",
    "lagos":           "sub_saharan_africa",
    "nairobi":         "east_africa_highland",
    "dar-es-salaam":   "sub_saharan_africa",
    "accra":           "sub_saharan_africa",
}

# ── Localized risk model ──────────────────────────────────────────────────────
def score_dengue_regional(temp, rain_28d, rain_lag, humidity, profile_name):
    profile = REGIONAL_PROFILES[profile_name]["dengue"]
    invert  = profile.get("invert_rainfall", False)

    conditions = [
        profile["temp_min"] <= temp <= profile["temp_max"],
        # For inverted rainfall (NE Brazil): LOW rain = risk
        (rain_28d <= profile["rain_28d_max"]) if invert
            else (profile["rain_28d_min"] <= rain_28d <= profile["rain_28d_max"]),
        rain_lag >= profile.get("rain_lag_min", 0),
        humidity >= profile["humidity_min"],
    ]
    met = sum(conditions)
    if met >= 3: return "HIGH",  3
    if met >= 2: return "WATCH", 2
    return "LOW", 1

def score_dengue_global(temp, rain_28d, rain_lag, humidity):
    """Original Bzzt model — for comparison."""
    conditions = [temp > 26, 8 <= rain_28d <= 60, rain_lag >= 8, humidity >= 60]
    met = sum(conditions)
    if met >= 3: return "HIGH",  3
    if met >= 2: return "WATCH", 2
    return "LOW", 1

# ── Stat helpers (same as validation_study.py) ────────────────────────────────
def spearman_r(xs, ys):
    n = len(xs)
    if n < 5: return None, None
    def rank(lst):
        s = sorted(range(n), key=lambda i: lst[i])
        r = [0]*n
        for rv, idx in enumerate(s): r[idx] = rv+1
        return r
    rx, ry = rank(xs), rank(ys)
    mx, my = sum(rx)/n, sum(ry)/n
    num = sum((rx[i]-mx)*(ry[i]-my) for i in range(n))
    den = math.sqrt(sum((rx[i]-mx)**2 for i in range(n))*sum((ry[i]-my)**2 for i in range(n)))
    if den == 0: return None, None
    r = num/den
    t = r*math.sqrt((n-2)/(1-r**2)) if abs(r)<1 else float('inf')
    p = 2*(1-_ncdf(abs(t)*math.sqrt((n-2)/(n-2+t**2))))
    return round(r,4), round(p,4)

def _ncdf(x): return 0.5*(1+math.erf(x/math.sqrt(2)))

def confusion(preds, actuals, pos_pred="HIGH", threshold=3):
    tp=fp=tn=fn=0
    for p,a in zip(preds,actuals):
        pp = p==pos_pred; ap = a>=threshold
        if pp and ap:   tp+=1
        if pp and not ap: fp+=1
        if not pp and not ap: tn+=1
        if not pp and ap: fn+=1
    sens = tp/(tp+fn) if tp+fn else 0
    spec = tn/(tn+fp) if tn+fp else 0
    ppv  = tp/(tp+fp) if tp+fp else 0
    acc  = (tp+tn)/(tp+fp+tn+fn) if tp+fp+tn+fn else 0
    n    = tp+fp+tn+fn
    po   = acc
    pe   = ((tp+fp)/n*(tp+fn)/n)+((tn+fn)/n*(tn+fp)/n) if n else 0
    kappa= (po-pe)/(1-pe) if 1-pe else 0
    return {"sensitivity":round(sens,3),"specificity":round(spec,3),
            "ppv":round(ppv,3),"accuracy":round(acc,3),"kappa":round(kappa,3),
            "tp":tp,"fp":fp,"tn":tn,"fn":fn}

def auc(scores, actuals, threshold=3):
    labels = [1 if a>=threshold else 0 for a in actuals]
    if not any(labels) or all(labels): return None
    threshs = sorted(set(scores), reverse=True)
    pts = [(0,0)]
    for th in threshs:
        preds = [1 if s>=th else 0 for s in scores]
        tp=sum(p and l for p,l in zip(preds,labels))
        fp=sum(p and not l for p,l in zip(preds,labels))
        fn=sum(not p and l for p,l in zip(preds,labels))
        tn=sum(not p and not l for p,l in zip(preds,labels))
        tpr=tp/(tp+fn) if tp+fn else 0
        fpr=fp/(fp+tn) if fp+tn else 0
        pts.append((fpr,tpr))
    pts.append((1,1)); pts.sort()
    return round(sum((pts[i][0]-pts[i-1][0])*(pts[i][1]+pts[i-1][1])/2 for i in range(1,len(pts))),3)

def cross_corr(model_scores, actual_cases, max_lag=8):
    n = len(model_scores)
    results = {}
    for lag in range(0, max_lag+1):
        xs = model_scores[:n-lag]; ys = actual_cases[lag:]
        if len(xs) < 10: continue
        r, p = spearman_r(xs, ys)
        if r is not None: results[lag] = (r, p)
    return results

# ── Data fetching ─────────────────────────────────────────────────────────────
def fetch_json(url, retries=3):
    for i in range(retries):
        try:
            with urllib.request.urlopen(url, timeout=30) as r:
                return json.loads(r.read())
        except Exception as e:
            if i == retries-1: print(f"    WARN: {e}")
            else: time.sleep(2)
    return None

def fetch_climate(lat, lng, year):
    url = (f"https://archive-api.open-meteo.com/v1/archive"
           f"?latitude={lat}&longitude={lng}"
           f"&start_date={year}-01-01&end_date={year}-12-31"
           f"&daily=temperature_2m_max,precipitation_sum,relative_humidity_2m_max&timezone=auto")
    d = fetch_json(url)
    if not d or "daily" not in d: return None
    return {"dates":d["daily"].get("time",[]),
            "temps":d["daily"].get("temperature_2m_max",[]),
            "rains":d["daily"].get("precipitation_sum",[]),
            "hums": d["daily"].get("relative_humidity_2m_max",[])}

def fetch_infodengue(geocode, year):
    url = (f"https://info.dengue.mat.br/api/alertcity"
           f"?geocode={geocode}&disease=dengue&format=json"
           f"&ew_start=1&ew_end=53&ey_start={year}&ey_end={year}")
    data = fetch_json(url)
    if not data: return []
    rows = []
    for row in data:
        try:
            date = datetime.utcfromtimestamp(row["data_iniSE"]/1000)
            rows.append({"week_start":date,"cases":int(row.get("casos",0) or 0),
                         "nivel":int(row.get("nivel",1) or 1)})
        except: pass
    return sorted(rows, key=lambda r: r["week_start"])

def window_avg(by_date, end_date, days, field):
    vals = [(by_date.get((end_date-timedelta(days=d)).strftime("%Y-%m-%d")) or {}).get(field)
            for d in range(days)]
    vals = [v for v in vals if v is not None]
    return sum(vals)/len(vals) if vals else None

# ── Cities to test ────────────────────────────────────────────────────────────
CITIES = [
    {"name":"São Paulo",     "id":"sao-paulo",      "geocode":3550308, "lat":-23.5505,"lng":-46.6333},
    {"name":"Rio de Janeiro","id":"rio-de-janeiro",  "geocode":3304557, "lat":-22.9068,"lng":-43.1729},
    {"name":"Fortaleza",     "id":"fortaleza",       "geocode":2304400, "lat":-3.7172, "lng":-38.5433},
    {"name":"Recife",        "id":"recife",          "geocode":2611606, "lat":-8.0476, "lng":-34.8770},
    {"name":"Manaus",        "id":"manaus",          "geocode":1302603, "lat":-3.1190, "lng":-60.0217},
]

START_YEAR, END_YEAR = 2014, 2023

def run():
    print("="*65)
    print("BZZT — LOCALIZED vs. GLOBAL MODEL COMPARISON")
    print("Brazil · 5 cities · 2014-2023 · InfoDengue / Open-Meteo")
    print("="*65)

    summary_rows = []

    for city in CITIES:
        profile_name = CITY_PROFILES[city["id"]]
        print(f"\n{'─'*65}")
        print(f"{city['name']}  [profile: {profile_name}]")
        print(f"{'─'*65}")

        # Build climate lookup
        climate_by_date = {}
        for year in range(START_YEAR-1, END_YEAR+1):
            c = fetch_climate(city["lat"], city["lng"], year)
            if c:
                for i, ds in enumerate(c["dates"]):
                    climate_by_date[ds] = {"temp":c["temps"][i],"rain":c["rains"][i],"hum":c["hums"][i]}

        # Fetch InfoDengue
        all_epi = []
        for year in range(START_YEAR, END_YEAR+1):
            rows = fetch_infodengue(city["geocode"], year)
            all_epi.extend(rows)
            time.sleep(0.3)

        if len(all_epi) < 20:
            print("  ⚠ insufficient data"); continue

        profile   = REGIONAL_PROFILES[profile_name]["dengue"]
        lag_days  = profile["rain_lag_days"]

        matched = []
        for rec in all_epi:
            ws = rec["week_start"]
            temp     = window_avg(climate_by_date, ws, 7,       "temp")
            rain_28d = window_avg(climate_by_date, ws, 28,      "rain")
            rain_lag = window_avg(climate_by_date, ws, lag_days,"rain")
            hum      = window_avg(climate_by_date, ws, 7,       "hum")
            if any(v is None for v in [temp,rain_28d,rain_lag,hum]): continue

            gl, gs = score_dengue_global(temp, rain_28d, rain_lag, hum)
            rl, rs = score_dengue_regional(temp, rain_28d, rain_lag, hum, profile_name)

            matched.append({**rec,
                "global_level":gl,"global_score":gs,
                "regional_level":rl,"regional_score":rs,
                "temp":temp,"rain_28d":rain_28d,"rain_lag":rain_lag,"hum":hum})

        n = len(matched)
        if n < 20:
            print("  ⚠ insufficient matched weeks"); continue

        gs  = [w["global_score"]   for w in matched]
        rs  = [w["regional_score"] for w in matched]
        gl  = [w["global_level"]   for w in matched]
        rl  = [w["regional_level"] for w in matched]
        cas = [w["cases"]          for w in matched]
        niv = [w["nivel"]          for w in matched]

        # Concurrent Spearman
        gr, gp = spearman_r(gs, cas)
        rr, rp = spearman_r(rs, cas)

        # Best lead-time
        g_lag = cross_corr(gs, cas, 8)
        r_lag = cross_corr(rs, cas, 8)
        best_g = max(g_lag, key=lambda l: g_lag[l][0] if g_lag[l][0] else -1) if g_lag else 0
        best_r = max(r_lag, key=lambda l: r_lag[l][0] if r_lag[l][0] else -1) if r_lag else 0

        # Confusion
        gcm = confusion(gl, niv)
        rcm = confusion(rl, niv)

        # AUC
        gauc = auc(gs, niv)
        rauc = auc(rs, niv)

        n_out = gcm["tp"]+gcm["fn"]
        print(f"  n_weeks={n}  outbreak_weeks={n_out} ({100*n_out//n}%)")
        print(f"\n  {'Metric':<28} {'Global model':>14}  {'Regional model':>14}  {'Δ':>6}")
        print(f"  {'─'*64}")

        def fmt(v): return f"{v:>14.3f}" if v is not None else f"{'N/A':>14}"
        def delta(a,b):
            if a is None or b is None: return f"{'N/A':>6}"
            d = b-a; sign = "+" if d>=0 else ""
            return f"{sign}{d:>5.3f}"

        rows = [
            ("Spearman r (lag=0)",    gr,                       rr),
            (f"Best lag r (G={best_g}w/R={best_r}w)",
                                      g_lag.get(best_g,(None,))[0],
                                      r_lag.get(best_r,(None,))[0]),
            ("Sensitivity",           gcm["sensitivity"],       rcm["sensitivity"]),
            ("Specificity",           gcm["specificity"],       rcm["specificity"]),
            ("PPV",                   gcm["ppv"],               rcm["ppv"]),
            ("Cohen kappa",           gcm["kappa"],             rcm["kappa"]),
            ("AUC-ROC",               gauc,                     rauc),
        ]
        for label, gv, rv in rows:
            print(f"  {label:<28}{fmt(gv)}  {fmt(rv)}  {delta(gv,rv)}")

        improved = sum(1 for _,gv,rv in rows
                       if gv is not None and rv is not None and rv > gv)
        print(f"\n  → Regional model improved {improved}/{len(rows)} metrics")
        print(f"  → Profile used: {REGIONAL_PROFILES[profile_name]['description']}")
        print(f"  → Rainfall inverted: {profile.get('invert_rainfall',False)}")
        print(f"  → Lag window: {lag_days}d (regional) vs 14d (global)")
        print(f"  → Temp threshold: {profile['temp_min']}°C (regional) vs 26°C (global)")

        summary_rows.append({
            "city": city["name"],
            "profile": profile_name,
            "global_r": gr, "regional_r": rr,
            "global_kappa": gcm["kappa"], "regional_kappa": rcm["kappa"],
            "global_sens": gcm["sensitivity"], "regional_sens": rcm["sensitivity"],
            "global_spec": gcm["specificity"], "regional_spec": rcm["specificity"],
            "global_auc": gauc, "regional_auc": rauc,
            "metrics_improved": improved, "total_metrics": len(rows),
        })

    # Summary
    print(f"\n{'='*65}")
    print("OVERALL COMPARISON SUMMARY")
    print(f"{'='*65}")
    print(f"\n  {'City':<22} {'Global κ':>9} {'Regional κ':>11} {'Δκ':>7} {'Improved':>9}")
    print(f"  {'─'*60}")
    for r in summary_rows:
        dk = (r["regional_kappa"] or 0)-(r["global_kappa"] or 0)
        print(f"  {r['city']:<22} {r['global_kappa']:>9.3f} {r['regional_kappa']:>11.3f} "
              f"{'+' if dk>=0 else ''}{dk:>6.3f} "
              f"  {r['metrics_improved']}/{r['total_metrics']}")

    avg_g_k = sum(r["global_kappa"] for r in summary_rows)/len(summary_rows) if summary_rows else 0
    avg_r_k = sum(r["regional_kappa"] for r in summary_rows)/len(summary_rows) if summary_rows else 0
    avg_g_s = sum(r["global_sens"] for r in summary_rows)/len(summary_rows) if summary_rows else 0
    avg_r_s = sum(r["regional_sens"] for r in summary_rows)/len(summary_rows) if summary_rows else 0
    avg_g_auc = sum(r["global_auc"] for r in summary_rows if r["global_auc"])/len(summary_rows) if summary_rows else 0
    avg_r_auc = sum(r["regional_auc"] for r in summary_rows if r["regional_auc"])/len(summary_rows) if summary_rows else 0

    print(f"\n  Avg Cohen kappa:   global={avg_g_k:.3f}  regional={avg_r_k:.3f}  Δ={avg_r_k-avg_g_k:+.3f}")
    print(f"  Avg sensitivity:   global={avg_g_s:.3f}  regional={avg_r_s:.3f}  Δ={avg_r_s-avg_g_s:+.3f}")
    print(f"  Avg AUC-ROC:       global={avg_g_auc:.3f}  regional={avg_r_auc:.3f}  Δ={avg_r_auc-avg_g_auc:+.3f}")

    print("""
CITATIONS FOR REGIONAL THRESHOLDS:
  [1] PMC10552155 — Ae. aegypti/albopictus temp range 22-32°C
  [2] PLOS One 0251403 — Rio de Janeiro 1-2 month rainfall lag
  [3] PMC6518529 — India lag 2-5 months, rainfall 40-80mm optimal
  [4] PMC12063067 — Bangladesh optimal temp 25-34°C, 10mm/week
  [5] PNTD 0013175 — Brazil regional outbreak patterns
  [6] Frontiers fpubh.2024.1456043 — Recife rainfall negative correlation
  [7] PMC9357211 — Anopheles gambiae 19-30°C, stephensi 15-37°C
  [8] PMC9884660 — Africa malaria rainfall minimum 80mm/month
""")

    out = os.path.join(os.path.dirname(__file__), "regional-validation-results.json")
    with open(out,"w") as f: json.dump(summary_rows, f, indent=2, default=str)
    print(f"Results saved to: {out}")

if __name__ == "__main__":
    run()
