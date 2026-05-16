# Bzzt — Mosquito-borne Disease Early Warning

> **Climate signals precede outbreaks by 8–14 weeks. Bzzt reads those signals across thousands of districts and sends free warnings before the outbreak arrives.**

[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Live Demo](https://img.shields.io/badge/demo-live-green.svg)](https://bzzt-sigma.vercel.app)
[![Digital Public Good](https://img.shields.io/badge/DPG-applying-orange.svg)](https://digitalpublicgoods.net)

---

## The Problem

Dengue and malaria kill over **600,000 people every year** — almost all in low-income countries where health warnings arrive too late, or not at all.

The climate conditions that drive outbreaks are measurable weeks before the first person gets sick. That data exists, it's free, and it's updated daily. But it never reaches the people who need it — district health officers, community health workers, or the families themselves.

Bzzt closes that gap.

---

## What Bzzt Does

Bzzt is an autonomous, district-level disease early warning system that:

1. **Scores disease risk daily** for every district using a trained logistic regression model (OpenDengue V1.3 × Open-Meteo climate, 1.1M training observations)
2. **Outputs a three-tier alert** — WATCH / ALERT / HIGH — with calibrated probability and explicit confidence per tier
3. **Boosts scores in real-time** using Google Trends symptom searches (per-country, correct local timezone) and CHW ground reports
4. **Maps every district** on a choropleth with dynamic peak window calculation, per-disease scores, climate drivers, and honest limitation flags
5. **Sends bilingual alerts** (local language + English) via SMS, WhatsApp, and USSD to enrolled residents 8–14 weeks before outbreaks peak
6. **Covers all endemic countries** — state-level globally, district-level for highest-burden countries (India: 676 districts, Nigeria: 775 LGAs, Kenya: 300 districts, Bangladesh: 64 districts)

---

## Disease Coverage

| Disease | Vector | Training data | Lead time |
|---|---|---|---|
| Dengue | Aedes aegypti | OpenDengue V1.3 — 1.1M district-months, 102 countries | 8–10 weeks |
| Malaria | Anopheles | WHO GHO estimated cases | 10–14 weeks |
| Chikungunya | Aedes aegypti | Same model as dengue | 8–10 weeks |

**Honest limitations documented in every popup:**
- P. vivax reactivation not predictable from climate signals
- Urban stored-water dengue partially captured via Google Trends boost
- Intervention coverage (IRS, nets, larviciding) not included
- District climate sampled at centroid — large districts may be heterogeneous

---

## Scoring Model

```
Final Risk Score =
  Logistic regression (climate absolute + anomaly + seasonal + geographic)
  × Google Trends booster  (1.4× if symptom searches rising in country)
  × CHW report booster     (1.8× if ≥3 fever reports in district last 14 days)

Output tiers:
  P < 0.35   → LOW    (not shown on map)
  P 0.35–0.6 → WATCH  (climate favorable — act preventively)
  P 0.6–0.8  → ALERT  (climate + real-time signal converging)
  P > 0.8    → HIGH   (mobilise now)
```

**Model features (12 total):**
- Absolute: avg_temp, avg_rainfall, lagged_rainfall (true 10–12 week lag), avg_humidity
- Anomaly: each vs 5-year rolling same-month baseline (adapts to local norms)
- Seasonal: month encoded cyclically — captures within-year patterns
- Geographic: latitude, distance from equator

**Validation:** LOCO cross-validation — model trained on all countries except holdout, tested on countries it never saw.

---

## Validated Science

Retrospective validation against **2,610 weeks of real dengue surveillance data**:

| Study | Result |
|---|---|
| Lead-time signal (São Paulo 2014–2023) | **r = 0.489 at 10–11 weeks** (p<0.001) |
| ML model AUC (climate-only, temporal split) | **0.752** |
| LOCO generalisation (14 locations, 4 countries) | **AUC 0.77–0.95** |
| Logistic regression LOCO | See `models/accuracy_report.json` |

Real-world confirmation: Delhi May 2026 → model showed WATCH via Google Trends spike → confirmed by MCD data showing highest April dengue count in 5 years.

Full methodology: [`VALIDATION_EXPLAINER.md`](VALIDATION_EXPLAINER.md)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14, TypeScript, Tailwind CSS |
| Map | Leaflet — choropleth, GeoJSON, dynamic popup |
| Database | Supabase (PostgreSQL + JSONB geometry) |
| Climate data | Open-Meteo Archive API (free, global, 1940–present) |
| Case history | OpenDengue V1.3, WHO GHO |
| Boundaries | GADM v4.1 (level-1 + level-2) |
| ML model | scikit-learn LogisticRegression (LOCO cross-validated) |
| Seasonal forecast | ECMWF via Open-Meteo seasonal API |
| Real-time signal | Google Trends (per-country, local timezone) |
| Alerts | Africa's Talking (SMS/USSD), Meta WhatsApp Business API, Twilio |
| Alert language | Claude Haiku (bilingual local + English) |
| Daily scan | GitHub Actions cron (2am UTC) |
| Hosting | Vercel (CDN, ISR caching) |

---

## Architecture

```
Open-Meteo Archive ──┐
OpenDengue V1.3    ──┤  train_model.py  →  dengue_model.pkl
WHO GHO Malaria    ──┘                     malaria_model.pkl
                                                  │
                              daily_scan.py ───────┤
                    ┌── Climate (90 days)          │
                    ├── Climate baselines (anomaly)│
                    ├── Google Trends boost        │
                    └── CHW report boost           │
                                                  ↓
                         Supabase: risk_scores + predictions
                                                  │
                   ┌──────────────────────────────┤
                   │                              │
             Next.js API                   GitHub Actions
        (district-risks,             (daily re-score, 2am UTC)
         country-bounds,
         insights, accuracy)
                   │
             Leaflet map
        (choropleth, 3-tier,
         dynamic peak window)
                   │
           SMS / WhatsApp / USSD
        (Africa's Talking, Twilio,
         Meta — bilingual alerts)
```

---

## Running Locally

```bash
npm install
cp .env.example .env.local
# Add: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY
#      ANTHROPIC_API_KEY, AFRICAS_TALKING_API_KEY, TWILIO_*, WHATSAPP_*

npm run dev

# One-time data setup
python3 scripts/load_districts.py
python3 scripts/load_districts_l2.py
python3 scripts/download_case_history.py
python3 scripts/fetch_climate_history.py
python3 scripts/train_model.py

# Daily scan (runs automatically via GitHub Actions)
python3 scripts/daily_scan.py
```

---

## Data Sources

| Source | Use | License |
|---|---|---|
| [Open-Meteo](https://open-meteo.com) | Climate archive + forecast | CC BY 4.0 |
| [OpenDengue V1.3](https://opendengue.org) | Dengue case history | CC BY 4.0 |
| [WHO GHO](https://www.who.int/data/gho) | Malaria estimates | CC BY-NC-SA |
| [GADM v4.1](https://gadm.org) | Administrative boundaries | Academic use |

---

## License

MIT — see [LICENSE](LICENSE)

Built for the UNICEF Venture Fund Climate and Health 2026 call.
