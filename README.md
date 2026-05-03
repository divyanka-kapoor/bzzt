# Bzzt — Mosquito-borne Disease Early Warning

> **Climate data predicts dengue and malaria outbreaks weeks before they happen. Bzzt makes sure the warning reaches you.**

[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Live Demo](https://img.shields.io/badge/demo-live-green.svg)](https://bzzt-sigma.vercel.app)
[![Digital Public Good](https://img.shields.io/badge/DPG-applying-orange.svg)](https://digitalpublicgoods.net)

---

## The Problem

Dengue and malaria kill over **600,000 people every year** — almost all in low-income countries where health warnings arrive too late, or not at all.

The climate conditions that drive outbreaks (temperature, rainfall, humidity) are measurable days or weeks before the first person gets sick. That data exists, it's free, and it's updated hourly. But it never reaches the people who need it.

Bzzt closes that gap.

---

## What Bzzt Does

Bzzt is an autonomous disease intelligence platform that:

1. **Scans 797 districts across 26 endemic countries daily** using real-time climate data from Open-Meteo
2. **Scores dengue and malaria risk** using WHO-aligned mosquito biology thresholds (Aedes aegypti, Anopheles gambiae, Plasmodium)
3. **Sends bilingual alerts** (local language + English) via SMS, WhatsApp, and email to enrolled residents — 4–11 weeks before outbreaks peak
4. **Tracks every computation** through OpenMetadata — full data lineage, 7 quality checks per run, auditable pipeline
5. **Shows government officials** a choropleth map of district-level risk across all endemic countries, with population-at-risk counts

---

## Validated Science

Retrospective validation against **2,610 weeks of real dengue surveillance data** (InfoDengue/FIOCRUZ + OpenDengue):

| Study | Result |
|---|---|
| Lead-time signal (São Paulo, 2014–2023) | **r = 0.489 at 10–11 weeks** (p<0.001) — climate predicts outbreak peak 2.5 months ahead |
| ML model AUC (climate-only, temporal split) | **0.752** on gold-standard InfoDengue labels |
| LOCO generalisation (14 locations, 4 countries) | **AUC 0.77–0.95** on cities the model never saw |
| Countries validated | Brazil, Peru, Colombia, Taiwan, Philippines |

Full methodology: [`VALIDATION_EXPLAINER.md`](VALIDATION_EXPLAINER.md)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router), TypeScript |
| Database | Supabase (Postgres) — 797 districts, risk scores, enrollments, predictions |
| Climate data | Open-Meteo Archive + Forecast API (free, no key) |
| Disease data | InfoDengue (FIOCRUZ), OpenDengue, WHO GHO |
| Boundaries | GADM v4.1 (26 endemic countries, 797 districts) |
| Messaging | Twilio SMS, Africa's Talking (Africa), Meta WhatsApp Business API |
| AI | Claude (Anthropic) — bilingual alert composition in 15 languages |
| Data governance | OpenMetadata — catalog, column-level lineage, pipeline observability |
| Map | Leaflet + GeoJSON choropleth |
| Batch jobs | GitHub Actions (daily scan at 2am UTC) |
| Deployment | Vercel |

---

## OpenMetadata Integration

Bzzt treats disease risk predictions as first-class data assets with full governance:

- **3 data source services** registered: Open-Meteo, WHO GHO, UN Population
- **4 table entities** with full column schemas
- **Column-level lineage**: `climate_observations.{temperature, precipitation, humidity}` → `disease_risk_scores.{dengue_score, malaria_score}`
- **Pipeline status** per run with per-task state (fetch-climate, score-risk, send-alert)
- **7 automated quality checks** per computation — runs marked Failed if any check fails
- **Prospective prediction log** — every computation timestamped for 5-week validation

---

## Geographic Coverage

797 districts across 26 countries covering the highest-burden regions globally:

| Region | Countries |
|---|---|
| Sub-Saharan Africa | Nigeria, DRC, Tanzania, Kenya, Ghana, Mozambique, Uganda, Ethiopia |
| South Asia | India, Bangladesh, Pakistan, Sri Lanka |
| Southeast Asia | Indonesia, Philippines, Thailand, Vietnam, Malaysia, Myanmar |
| Latin America | Brazil, Colombia, Peru, Bolivia, Ecuador, Venezuela |
| MENA | Egypt, Yemen |

---

## Alert Channels

| Channel | Coverage | Cost at scale |
|---|---|---|
| WhatsApp Business API | Smartphone users globally | ~$0.004/conversation |
| Africa's Talking SMS | Feature phones in Africa | ~$0.008/SMS |
| Twilio SMS | All other regions | ~$0.04/SMS |
| USSD (`/api/ussd`) | Any phone, no data needed | ~$0.001/session |

**Languages supported:** Hausa, Bengali, Filipino, Hindi, Swahili, Bahasa Indonesia, Thai, Vietnamese, Malay, French, Urdu (+ English)

---

## Running Locally

```bash
git clone https://github.com/divyanka-kapoor/bzzt
cd bzzt
npm install

# Copy env template and fill in your keys
cp .env.local.example .env.local

npm run dev
```

### Required environment variables

```
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ANTHROPIC_API_KEY=         # for bilingual alert composition
AGENTMAIL_API_KEY=         # for email alerts
```

### Optional (alerts won't send without these)
```
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=
AFRICAS_TALKING_API_KEY=
AFRICAS_TALKING_USERNAME=
WHATSAPP_API_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=
```

### Load districts and run first scan

```bash
# Load 797 GADM districts into Supabase (one-time)
python3 scripts/load_districts.py

# Run risk scan manually
python3 scripts/daily_scan.py
```

---

## Validation Studies

All validation scripts are in [`scripts/`](scripts/):

| Script | What it does |
|---|---|
| `validation_study.py` | Retrospective study — 5 Brazilian cities, 2014–2023, InfoDengue |
| `regional_validation.py` | Localized thresholds vs. global model comparison |
| `ml_validation.py` | ML model with temporal split + LOCO cross-validation |
| `ml_global_climate_only.py` | Climate-only ML across 13 locations, 4 countries |
| `backtest.mjs` | Original rule-based model backtest |

Results saved as JSON in `scripts/` for reproducibility.

---

## Architecture

```
Open-Meteo API ─┐
WHO GHO API    ─┼─→ daily_scan.py (GitHub Actions, 2am UTC)
UN Population  ─┘         │
                           ▼
                    Supabase Postgres
                    ┌──────────────────┐
                    │ districts (797)  │
                    │ risk_scores      │
                    │ enrollments      │
                    │ alert_logs       │
                    │ predictions      │
                    │ chw_reports      │
                    └──────┬───────────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
         Dashboard    /api/alert    OpenMetadata
         (choropleth  (bilingual    (lineage +
          map,         SMS/WA/       quality
          filters)     email)        checks)
```

---

## Live Demo

**[bzzt-sigma.vercel.app](https://bzzt-sigma.vercel.app)**

- `/` — Enrollment landing page
- `/dashboard` — Live choropleth map + Intelligence tab
- `/lookup` — Check risk for any location

---

## License

MIT — see [LICENSE](LICENSE)

---

## Built for

- [UNICEF Venture Fund — Climate and Health 2026](https://www.unicef.org/innovation/call-for-application-climate-and-health-2026)
- Children in the highest-burden communities who receive no advance warning today
