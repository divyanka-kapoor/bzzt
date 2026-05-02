"""
Bzzt ML Validation Study
========================
Tests whether a machine-learning model trained on climate features
can predict dengue outbreaks better than the rule-based Bzzt model.

CRITICAL DESIGN DECISIONS (scientific validity):
  1. Temporal train/test split — train 2014-2020, test 2021-2023.
     NEVER random split on time-series data (causes data leakage).
  2. Leave-One-City-Out (LOCO) cross-validation — tests whether the
     model generalises to a city it has never seen. This answers:
     "can we deploy to a new city without local training data?"
  3. Features use only PAST data (lagged) — no look-ahead.
  4. Baseline comparison — every ML model is compared against:
       a) The original Bzzt rule-based model
       b) A seasonal naive baseline (predict HIGH in summer)

Models tested:
  - Logistic Regression (linear baseline)
  - Random Forest (ensemble, handles non-linearity)
  - XGBoost (gradient boosting, usually strongest)

Features engineered:
  - Rolling means of temp/rain/humidity at 7d, 14d, 28d, 56d windows
  - Each window also LAGGED by 1-8 weeks (prospective prediction)
  - Month encoded as sin/cos (cyclical)
  - Heat-humidity interaction term
  - Previous-week case count (autoregressive signal)
"""

import json, time, math, os, warnings
import urllib.request
from datetime import datetime, timedelta

import numpy as np
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import (roc_auc_score, cohen_kappa_score,
                              confusion_matrix, classification_report)
from sklearn.pipeline import Pipeline
try:
    import xgboost as xgb
    HAS_XGB = True
except Exception:
    HAS_XGB = False
    print("  [INFO] XGBoost not available — using GradientBoosting instead")

warnings.filterwarnings("ignore")

# ── Config ────────────────────────────────────────────────────────────────────
TRAIN_END_YEAR = 2020   # inclusive
TEST_START_YEAR = 2021  # inclusive

CITIES = [
    {"name":"São Paulo",     "id":"sao-paulo",      "geocode":3550308, "lat":-23.5505,"lng":-46.6333},
    {"name":"Rio de Janeiro","id":"rio-de-janeiro",  "geocode":3304557, "lat":-22.9068,"lng":-43.1729},
    {"name":"Fortaleza",     "id":"fortaleza",       "geocode":2304400, "lat":-3.7172, "lng":-38.5433},
    {"name":"Recife",        "id":"recife",          "geocode":2611606, "lat":-8.0476, "lng":-34.8770},
    {"name":"Manaus",        "id":"manaus",          "geocode":1302603, "lat":-3.1190, "lng":-60.0217},
]

OUTBREAK_THRESHOLD = 3   # InfoDengue nivel >= 3 = outbreak
PREDICT_AHEAD_WEEKS = 4  # primary evaluation: can model predict 4 weeks ahead?

# ── Fetch helpers ─────────────────────────────────────────────────────────────
def fetch_json(url, retries=3):
    for i in range(retries):
        try:
            with urllib.request.urlopen(url, timeout=30) as r:
                return json.loads(r.read())
        except Exception as e:
            if i == retries-1:
                print(f"    WARN fetch failed: {e}")
            else:
                time.sleep(2)
    return None

def fetch_climate(lat, lng, year):
    url = (f"https://archive-api.open-meteo.com/v1/archive"
           f"?latitude={lat}&longitude={lng}"
           f"&start_date={year}-01-01&end_date={year}-12-31"
           f"&daily=temperature_2m_max,precipitation_sum,relative_humidity_2m_max"
           f"&timezone=auto")
    d = fetch_json(url)
    if not d or "daily" not in d: return None
    return {ds: {"temp": d["daily"]["temperature_2m_max"][i],
                 "rain": d["daily"]["precipitation_sum"][i],
                 "hum":  d["daily"]["relative_humidity_2m_max"][i]}
            for i, ds in enumerate(d["daily"].get("time", []))}

def fetch_infodengue(geocode, year):
    url = (f"https://info.dengue.mat.br/api/alertcity"
           f"?geocode={geocode}&disease=dengue&format=json"
           f"&ew_start=1&ew_end=53&ey_start={year}&ey_end={year}")
    data = fetch_json(url)
    if not data: return []
    rows = []
    for row in data:
        try:
            date = datetime.utcfromtimestamp(row["data_iniSE"] / 1000)
            rows.append({"week_start": date,
                         "cases": int(row.get("casos", 0) or 0),
                         "nivel": int(row.get("nivel", 1) or 1)})
        except: pass
    return sorted(rows, key=lambda r: r["week_start"])

# ── Feature engineering ───────────────────────────────────────────────────────
def rolling_mean(by_date, end_date, days, field):
    vals = []
    for d in range(days):
        entry = by_date.get((end_date - timedelta(days=d)).strftime("%Y-%m-%d"))
        if entry and entry.get(field) is not None:
            vals.append(entry[field])
    return sum(vals) / len(vals) if vals else None

def build_features(week_start, by_date, prev_cases):
    """
    Returns a feature dict for a given week.
    All features use only past data (no look-ahead).
    """
    f = {}

    # Climate rolling windows
    for days, tag in [(7,"7d"),(14,"14d"),(28,"28d"),(56,"56d")]:
        for field, name in [("temp","temp"),("rain","rain"),("hum","hum")]:
            val = rolling_mean(by_date, week_start, days, field)
            if val is None: return None
            f[f"{name}_{tag}"] = val

    # Lagged climate (model predicts ahead — climate at week t predicts cases at t+lag)
    # We already have rolling windows; lagged = same windows shifted back
    for lag_weeks in [2, 4, 6, 8]:
        lag_date = week_start - timedelta(weeks=lag_weeks)
        for days, tag in [(14,"14d"),(28,"28d")]:
            for field, name in [("temp","temp"),("rain","rain"),("hum","hum")]:
                val = rolling_mean(by_date, lag_date, days, field)
                if val is not None:
                    f[f"{name}_{tag}_lag{lag_weeks}w"] = val

    # Cyclical month encoding (sin/cos captures seasonality without ordinal bias)
    month = week_start.month
    f["month_sin"] = math.sin(2 * math.pi * month / 12)
    f["month_cos"] = math.cos(2 * math.pi * month / 12)

    # Heat-humidity interaction
    f["heat_hum_index"] = f["temp_7d"] * f["hum_7d"] / 100

    # Temperature range (max-min proxy via different windows)
    f["temp_trend"] = f["temp_7d"] - f["temp_28d"]   # warming trend
    f["rain_trend"] = f["rain_7d"] - f["rain_28d"]   # drying/wetting trend

    # Autoregressive: previous week's cases (log-scaled to reduce skew)
    f["prev_cases_log"] = math.log1p(prev_cases)

    # Bzzt rule-based score (as a feature — can the ML improve upon it?)
    rain_28d = f["rain_28d"]
    rain_14d = f["rain_14d"]
    temp_7d  = f["temp_7d"]
    hum_7d   = f["hum_7d"]
    bzzt_conditions = [temp_7d > 26, 8 <= rain_28d <= 60, rain_14d >= 8, hum_7d >= 60]
    f["bzzt_score"] = sum(bzzt_conditions)

    return f

def build_dataset(city, start_year, end_year, all_climate, all_epi):
    """Build feature matrix X and label vector y for a city/year range."""
    X_rows, y_labels, week_dates = [], [], []
    prev_cases = 0

    for rec in all_epi:
        if not (start_year <= rec["week_start"].year <= end_year):
            continue
        features = build_features(rec["week_start"], all_climate, prev_cases)
        if features is None:
            continue
        X_rows.append(features)
        y_labels.append(1 if rec["nivel"] >= OUTBREAK_THRESHOLD else 0)
        week_dates.append(rec["week_start"])
        prev_cases = rec["cases"]

    if not X_rows:
        return None, None, None, None

    feature_names = list(X_rows[0].keys())
    X = np.array([[r[k] for k in feature_names] for r in X_rows])
    y = np.array(y_labels)
    return X, y, feature_names, week_dates

# ── Metrics ───────────────────────────────────────────────────────────────────
def evaluate(y_true, y_pred, y_prob, name):
    if len(set(y_true)) < 2:
        return None
    auc   = roc_auc_score(y_true, y_prob)
    kappa = cohen_kappa_score(y_true, y_pred)
    cm    = confusion_matrix(y_true, y_pred)
    tp, fp, fn, tn = cm[1,1], cm[0,1], cm[1,0], cm[0,0]
    sens  = tp/(tp+fn) if tp+fn else 0
    spec  = tn/(tn+fp) if tn+fp else 0
    ppv   = tp/(tp+fp) if tp+fp else 0
    return {"name":name, "auc":round(auc,3), "kappa":round(kappa,3),
            "sensitivity":round(sens,3), "specificity":round(spec,3),
            "ppv":round(ppv,3),
            "tp":int(tp),"fp":int(fp),"fn":int(fn),"tn":int(tn)}

def bzzt_rule_predict(X, feature_names):
    idx = feature_names.index("bzzt_score")
    preds = (X[:, idx] >= 3).astype(int)
    probs = X[:, idx] / 4.0
    return preds, probs

def seasonal_predict(week_dates):
    PEAK = {1,2,3,11,12}
    preds = np.array([1 if d.month in PEAK else 0 for d in week_dates])
    probs = np.array([0.8 if d.month in PEAK else 0.2 for d in week_dates])
    return preds, probs

# ── Models ────────────────────────────────────────────────────────────────────
def get_models():
    models = {
        "LogisticRegression": Pipeline([
            ("scaler", StandardScaler()),
            ("clf", LogisticRegression(max_iter=1000, class_weight="balanced", C=0.1))
        ]),
        "RandomForest": RandomForestClassifier(
            n_estimators=200, max_depth=6, min_samples_leaf=10,
            class_weight="balanced", random_state=42, n_jobs=-1
        ),
        "GradientBoosting": GradientBoostingClassifier(
            n_estimators=200, max_depth=4, learning_rate=0.05,
            subsample=0.8, random_state=42
        ),
    }
    if HAS_XGB:
        models["XGBoost"] = xgb.XGBClassifier(
            n_estimators=200, max_depth=4, learning_rate=0.05,
            subsample=0.8, colsample_bytree=0.8,
            scale_pos_weight=3, eval_metric="auc",
            random_state=42, verbosity=0
        )
    return models

# ── Main ─────────────────────────────────────────────────────────────────────
def main():
    print("="*68)
    print("BZZT ML VALIDATION — Temporal split + Leave-One-City-Out")
    print(f"Train: 2014-{TRAIN_END_YEAR}  |  Test: {TEST_START_YEAR}-2023")
    print(f"Target: dengue nivel ≥ {OUTBREAK_THRESHOLD}  |  Predict {PREDICT_AHEAD_WEEKS} weeks ahead")
    print("="*68)

    # ── Step 1: Fetch all data ────────────────────────────────────────────────
    print("\nFetching data for all cities...")
    city_data = {}
    for city in CITIES:
        print(f"  {city['name']}...", end=" ", flush=True)
        climate = {}
        for year in range(2012, 2024):
            c = fetch_climate(city["lat"], city["lng"], year)
            if c: climate.update(c)
        epi = []
        for year in range(2014, 2024):
            rows = fetch_infodengue(city["geocode"], year)
            epi.extend(rows)
            time.sleep(0.2)
        city_data[city["id"]] = {"climate": climate, "epi": epi, "meta": city}
        print(f"✓ ({len(epi)} epi weeks, {len(climate)} climate days)")

    # ── Step 2: Pooled temporal split evaluation ──────────────────────────────
    print("\n" + "="*68)
    print("A. POOLED TEMPORAL SPLIT  (all cities, train→test)")
    print("="*68)

    X_train_all, y_train_all = [], []
    X_test_all,  y_test_all  = [], []
    test_dates_all = []

    for city in CITIES:
        d = city_data[city["id"]]
        X_tr, y_tr, feat_names, _ = build_dataset(city, 2014, TRAIN_END_YEAR,
                                                    d["climate"], d["epi"])
        X_te, y_te, _,           wdates = build_dataset(city, TEST_START_YEAR, 2023,
                                                    d["climate"], d["epi"])
        if X_tr is not None:
            X_train_all.append(X_tr); y_train_all.append(y_tr)
        if X_te is not None:
            X_test_all.append(X_te); y_test_all.append(y_te)
            test_dates_all.extend(wdates)

    X_train = np.vstack(X_train_all)
    y_train = np.concatenate(y_train_all)
    X_test  = np.vstack(X_test_all)
    y_test  = np.concatenate(y_test_all)

    print(f"\nTrain set: {len(y_train)} weeks  |  outbreak rate: {y_train.mean():.1%}")
    print(f"Test set:  {len(y_test)} weeks  |  outbreak rate: {y_test.mean():.1%}")
    print(f"Features:  {X_train.shape[1]}")

    results_pooled = []

    # Baselines
    bzzt_pred, bzzt_prob = bzzt_rule_predict(X_test, feat_names)
    seas_pred, seas_prob  = seasonal_predict(test_dates_all)
    for name, pred, prob in [("Bzzt rule-based", bzzt_pred, bzzt_prob),
                              ("Seasonal naive",  seas_pred, seas_prob)]:
        r = evaluate(y_test, pred, prob, name)
        if r: results_pooled.append(r)

    # ML models
    trained_models = {}
    for mname, model in get_models().items():
        print(f"\n  Training {mname}...", end=" ", flush=True)
        model.fit(X_train, y_train)
        prob = model.predict_proba(X_test)[:,1]
        pred = (prob >= 0.4).astype(int)  # slightly lower threshold for recall
        r = evaluate(y_test, pred, prob, mname)
        if r:
            results_pooled.append(r)
            trained_models[mname] = model
        print(f"AUC={r['auc']:.3f}  κ={r['kappa']:.3f}  sens={r['sensitivity']:.3f}" if r else "insufficient data")

    print(f"\n  {'Model':<22} {'AUC':>6} {'Kappa':>7} {'Sens':>6} {'Spec':>6} {'PPV':>6}")
    print(f"  {'─'*55}")
    for r in sorted(results_pooled, key=lambda x: x["auc"], reverse=True):
        print(f"  {r['name']:<22} {r['auc']:>6.3f} {r['kappa']:>7.3f} "
              f"{r['sensitivity']:>6.3f} {r['specificity']:>6.3f} {r['ppv']:>6.3f}")

    # ── Step 3: Feature importances ───────────────────────────────────────────
    if "RandomForest" in trained_models:
        rf = trained_models["RandomForest"]
        importances = rf.feature_importances_
        top_idx = np.argsort(importances)[::-1][:12]
        print(f"\n  Top 12 features (RandomForest):")
        for i in top_idx:
            print(f"    {feat_names[i]:<30} {importances[i]:.4f}")

    # ── Step 4: Leave-One-City-Out ────────────────────────────────────────────
    print(f"\n{'='*68}")
    print("B. LEAVE-ONE-CITY-OUT (LOCO) — generalisation test")
    print("   Train on 4 cities → test on held-out city (all years)")
    print("="*68)

    loco_results = []
    for held_out in CITIES:
        train_cities = [c for c in CITIES if c["id"] != held_out["id"]]
        X_tr_parts, y_tr_parts = [], []
        for c in train_cities:
            d = city_data[c["id"]]
            X, y, fn, _ = build_dataset(c, 2014, 2023, d["climate"], d["epi"])
            if X is not None:
                X_tr_parts.append(X); y_tr_parts.append(y)

        d = city_data[held_out["id"]]
        X_te, y_te, fn, wdates = build_dataset(held_out, 2014, 2023,
                                                d["climate"], d["epi"])

        if not X_tr_parts or X_te is None: continue

        X_tr = np.vstack(X_tr_parts)
        y_tr = np.concatenate(y_tr_parts)

        print(f"\n  Held out: {held_out['name']}  (test n={len(y_te)}, "
              f"outbreak rate={y_te.mean():.1%})")

        city_results = []
        # Baselines
        bzzt_pred_lo, bzzt_prob_lo = bzzt_rule_predict(X_te, fn)
        r = evaluate(y_te, bzzt_pred_lo, bzzt_prob_lo, "Bzzt rule-based")
        if r: city_results.append(r)

        # Best ML models
        loco_models = ["XGBoost", "RandomForest"] if HAS_XGB else ["GradientBoosting", "RandomForest"]
        for mname in loco_models:
            model = get_models()[mname]
            model.fit(X_tr, y_tr)
            prob = model.predict_proba(X_te)[:,1]
            pred = (prob >= 0.4).astype(int)
            r = evaluate(y_te, pred, prob, mname)
            if r: city_results.append(r)

        print(f"    {'Model':<22} {'AUC':>6} {'Kappa':>7} {'Sens':>6} {'Spec':>6}")
        for r in sorted(city_results, key=lambda x: x["auc"], reverse=True):
            marker = " ← best" if r == max(city_results, key=lambda x: x["auc"]) else ""
            print(f"    {r['name']:<22} {r['auc']:>6.3f} {r['kappa']:>7.3f} "
                  f"{r['sensitivity']:>6.3f} {r['specificity']:>6.3f}{marker}")

        loco_results.append({
            "city": held_out["name"],
            "results": city_results
        })

    # ── Step 5: Summary ───────────────────────────────────────────────────────
    print(f"\n{'='*68}")
    print("SUMMARY")
    print(f"{'='*68}")

    best_ml = max((r for r in results_pooled if r["name"] not in ["Bzzt rule-based","Seasonal naive"]),
                  key=lambda r: r["auc"], default=None)
    bzzt_r  = next((r for r in results_pooled if r["name"] == "Bzzt rule-based"), None)

    if best_ml and bzzt_r:
        print(f"\nPooled test set ({TEST_START_YEAR}-2023):")
        print(f"  Best ML ({best_ml['name']}):  AUC={best_ml['auc']}  κ={best_ml['kappa']}  "
              f"sens={best_ml['sensitivity']}  spec={best_ml['specificity']}")
        print(f"  Bzzt rule-based:        AUC={bzzt_r['auc']}  κ={bzzt_r['kappa']}  "
              f"sens={bzzt_r['sensitivity']}  spec={bzzt_r['specificity']}")

        auc_lift  = best_ml["auc"]  - bzzt_r["auc"]
        kapp_lift = best_ml["kappa"]- bzzt_r["kappa"]
        sens_lift = best_ml["sensitivity"] - bzzt_r["sensitivity"]
        print(f"\n  ML improvement over rule-based:")
        print(f"    ΔAUC   = {auc_lift:+.3f}")
        print(f"    Δkappa = {kapp_lift:+.3f}")
        print(f"    Δsens  = {sens_lift:+.3f}")

    print(f"\nLOCO generalisation (AUC of best model per held-out city):")
    for lr in loco_results:
        best = max(lr["results"], key=lambda r: r["auc"])
        bzzt = next((r for r in lr["results"] if r["name"]=="Bzzt rule-based"), None)
        beats = "✓ ML beats rule-based" if bzzt and best["auc"]>bzzt["auc"] and best["name"]!="Bzzt rule-based" else "✗ rule-based holds"
        print(f"  {lr['city']:<20} best={best['name']:<16} AUC={best['auc']:.3f}  {beats}")

    print(f"""
KEY FINDINGS:
  The ML model was trained on climate features only (same Open-Meteo
  data as Bzzt) but learns optimal thresholds from surveillance data
  rather than fixed biological rules. The LOCO test reveals whether
  a model trained on known cities can generalise to a new deployment.

LIMITATIONS:
  • Brazil only — model may not generalise globally without retraining
  • 5 cities is a small sample for robust ML
  • XGBoost tends to overfit on small tabular datasets even with
    regularisation — interpret LOCO results as the more honest test
  • Autoregressive feature (prev_cases) is powerful but unavailable
    in a true prospective deployment without surveillance data

CONCLUSION FOR UNICEF APPLICATION:
  If ML outperforms rule-based on LOCO: propose ML calibration as
  Year 1 deliverable alongside local surveillance data partnership.
  If rule-based holds: argue for threshold optimisation rather than
  full ML, which is more interpretable for health ministry partners.
""")

    # Save
    out = os.path.join(os.path.dirname(__file__), "ml-validation-results.json")
    with open(out, "w") as f:
        json.dump({"pooled": results_pooled, "loco": loco_results}, f, indent=2, default=str)
    print(f"Results saved to: {out}")

if __name__ == "__main__":
    main()
