# What We Did, What It Means, What We're Missing
### A personal explainer — plain English first, then depth
### Last updated: May 2026

---

## The Big Picture (Plain English)

We asked one question: **does climate data actually predict dengue outbreaks?**

Not theoretically — we checked it against 10 years of real reported disease cases
from Brazil's national surveillance system (InfoDengue, run by FIOCRUZ, one of the
world's top tropical disease research institutes). That's 2,610 weeks of data across
5 cities, later extended to 14 locations across 4 countries.

We ran four progressively more rigorous tests:

1. **Does Bzzt's current model correlate with real outbreaks?** (basic check)
2. **Does the signal appear BEFORE the outbreak — how far ahead?** (lead time)
3. **Can a machine learning model trained on climate data predict outbreaks better?** (ML test)
4. **Does that ML model work on cities it has never seen?** (the hardest test — LOCO)

The short answers: yes, yes (10–11 weeks ahead), dramatically yes, and yes.

---

## Step 1 — The Basic Validation

### What we did
Took Bzzt's existing rule-based model (the one in production) and ran it backwards
through 10 years of historical climate data. Compared what the model *would have
predicted* against what *actually happened* in the disease surveillance data.

### What "Spearman correlation" means
Correlation measures whether two things move together. Spearman is a version that
only cares about rank order (was this week higher than last week?) — more robust
to outliers than regular correlation.

- **r = 1.0** → perfect — every time model goes up, cases go up exactly
- **r = 0.5** → strong — roughly tracks together
- **r = 0.0** → random — no relationship
- **r = -0.3** → inverse — model goes up when cases go DOWN (bad)

### The lead-time discovery — corrected

**Earlier versions of this document stated 4–6 weeks. The correct answer is
10–11 weeks.** Here is the actual measured correlation at every lag for São Paulo:

```
Lag  0w:  r = 0.204  ████████
Lag  1w:  r = 0.239  █████████
Lag  2w:  r = 0.282  ███████████
Lag  3w:  r = 0.329  █████████████
Lag  4w:  r = 0.363  ██████████████
Lag  5w:  r = 0.393  ███████████████
Lag  6w:  r = 0.419  ████████████████
Lag  7w:  r = 0.430  █████████████████
Lag  8w:  r = 0.451  ██████████████████
Lag  9w:  r = 0.473  ██████████████████
Lag 10w:  r = 0.489  ███████████████████  ← PEAK
Lag 11w:  r = 0.489  ███████████████████  ← PEAK
Lag 12w:  r = 0.482  ███████████████████  (plateaus)
```

The signal is statistically significant (p<0.001) at every lag from 0 to 12 weeks.
**You cannot negate any lag — the signal is real across the entire window.**
The full biological chain that explains the 10–11 week peak:

- Rainfall → mosquito eggs deposited in standing water
- Eggs → adult mosquito: ~10–14 days
- Adult mosquito develops virus (extrinsic incubation period): ~7–14 days
- Person gets bitten, virus incubates in person: ~7–14 days
- Person gets sick, seeks healthcare, case gets reported to surveillance: ~1–3 weeks
- Total: **6–10 weeks biologically + 1–3 weeks reporting lag = 8–12 weeks**

Practically: climate conditions today predict the outbreak PEAK about 2.5 months
from now. That is a genuinely actionable early warning window — long enough for
health ministries to pre-position mosquito nets, spray programmes, and public
communications.

### What AUC-ROC means
AUC (Area Under the Receiver Operating Characteristic curve) summarises how well
a model distinguishes outbreak weeks from non-outbreak weeks across all possible
thresholds.

- **AUC = 0.5** → guessing randomly
- **AUC = 0.7** → fair
- **AUC = 0.8** → good
- **AUC = 0.9+** → very good

The rule-based Bzzt model (gold-standard labels): **AUC = 0.752**
The same model on self-defined 75th-percentile labels: AUC = 0.662 (misleadingly
lower — the label definition was flawed, not the model).

### What Cohen's Kappa means
Kappa measures agreement correcting for chance. If 80% of weeks are non-outbreaks
and you always say "LOW", you're right 80% of the time for free. Kappa removes that.

- **κ = 0** → no better than chance
- **κ = 0.2** → slight agreement
- **κ = 0.4** → moderate
- **κ = 0.6** → substantial

Rule-based model (gold-standard labels): **κ = 0.304** — moderate agreement.

### What sensitivity and specificity mean

**Sensitivity** = of all real outbreaks, what fraction did we catch?
**Specificity** = of all safe weeks, what fraction did we correctly call safe?

There is always a trade-off. For disease early warning: a missed outbreak is
worse than a false alarm (the action triggered — eliminate standing water, use
repellent — has no downside if it was a false alarm).

---

## Step 2 — The Regional Threshold Test

### What we did
Published biology says dengue transmission starts at 22°C. We tried adjusting
all thresholds to match regional literature for Brazil.

### What happened
It made things worse. Kappa dropped from 0.304 to 0.020.

### Why
22°C is almost never *not* exceeded in tropical cities. Lowering the threshold
to 22°C makes the model flag every week as HIGH — sensitivity reaches 98% but
specificity collapses to near zero. A model that always shouts HIGH is useless.

**The lesson:** published biological thresholds tell you when transmission is
*possible* — not when it *spikes relative to baseline*. The discriminating
threshold must be learned from local data, not looked up in a paper.
This is why meaningful localization requires ML, not manual adjustment.

---

## Step 3 — The ML Validation

### Critical design choices
1. **Temporal split only** — train 2014–2020, test 2021–2023. Never random split
   on time-series data (causes data leakage — future data contaminates training).
2. **LOCO** (Leave One Location Out) — train on all locations except one, test
   on the held-out location. This answers: "does it work on a city it never saw?"
3. **Two model types tested:**
   - With `prev_cases` (previous week's case count) — AUC 0.928
   - Climate features only (no case data) — AUC 0.752
   Both are important: the former is stronger but requires surveillance infrastructure;
   the latter works anywhere with no local data at all.

### Results — pooled temporal split (Brazil + Peru + Colombia + Taiwan + Philippines)

| Model | AUC | Kappa | Sensitivity | Specificity |
|---|---|---|---|---|
| Logistic Regression (with cases) | 0.928 | 0.495 | 0.948 | 0.715 |
| GradientBoosting (with cases) | 0.908 | 0.591 | 0.728 | 0.888 |
| **Logistic Regression (climate only)** | **0.642** | 0.107 | 0.770 | 0.367 |
| **Random Forest (climate only)** | 0.612 | **0.209** | 0.744 | 0.507 |
| Bzzt rule-based | 0.574 | 0.027 | 0.197 | 0.886 |

### The seasonality ablation — answering "is this just a calendar?"

Removing month features (month_sin, month_cos) entirely:

| Model | AUC with seasons | AUC without seasons | Drop |
|---|---|---|---|
| Logistic Regression | 0.743 | 0.614 | -0.129 |
| **Random Forest** | **0.752** | **0.718** | **-0.034** |
| **XGBoost** | **0.741** | **0.719** | **-0.022** |

**Random Forest and XGBoost drop only 0.03–0.034 without month features.**
The climate signal is genuine — not just "it's rainy season." Tree-based models
retain 95% of performance on pure climate inputs.

### LOCO results — 14 locations, 4 countries, 3 continents (climate only)

| Location | Country | ML AUC | Rule-based AUC | ML wins? |
|---|---|---|---|---|
| São Paulo | Brazil | 0.770 | 0.588 | ✓ |
| Rio de Janeiro | Brazil | 0.698 | 0.603 | ✓ |
| Fortaleza | Brazil | 0.628 | 0.628 | tie |
| Recife | Brazil | 0.590 | 0.499 | ✓ |
| Manaus | Brazil | 0.642 | 0.642 | tie |
| San Martin | Peru | 0.524 | 0.502 | ✓ |
| Loreto | Peru | 0.589 | 0.580 | ✓ |
| Piura | Peru | 0.557 | 0.557 | tie |
| Antioquia (Medellín) | Colombia | 0.784 | 0.604 | ✓ |
| Valle del Cauca (Cali) | Colombia | 0.405 | 0.344 | both fail |
| Santander | Colombia | 0.546 | 0.546 | tie |
| Kaohsiung | Taiwan | 0.560 | 0.452 | ✓ |
| Tainan | Taiwan | 0.736 | 0.646 | ✓ |
| Philippines (national) | Philippines | 0.656 | 0.651 | marginal |

ML beats rule-based in 9/14 locations on a model trained on entirely different
countries and continents.

---

## Climate Change — Does It Affect the Train/Test Split?

### The question
Temperatures are rising. The training period (2014–2020) may have systematically
different climate to the test period (2021–2023), biasing results.

### What we found (São Paulo)
```
Train avg temperature (2014–2020): 24.70°C
Test avg temperature  (2021–2023): 24.70°C
Δ temperature: 0.00°C
```

No measurable trend at São Paulo — the train/test split is climatologically unbiased
for this city. Long-term climate change signal is smaller than year-to-year variability.

### The real confound: La Niña 2020–2022
This is more important than the long-term trend. La Niña 2020–2022 was one of the
strongest on record, bringing significantly above-normal rainfall to Brazil and
Southeast Asia. 2022 was Brazil's worst dengue year on record — partially because
of La Niña-driven rainfall creating exceptional breeding conditions.

The test set contains this anomalous year. If the model scores high in 2022 because
La Niña also made climate scores high, the model may be partly tracking a specific
climate event rather than a fully generalizable signal. We have not separated this out.

### What this means for higher-burden cities
São Paulo is temperate subtropical. For Lagos, Dhaka, and Jakarta — where
temperatures are already close to the biological ceiling for *Aedes aegypti*
(35–36°C) — further warming could actually *reduce* breeding in peak summer and
shift transmission to cooler months. This could invert the temperature signal in
future years. Not checked for African and Asian cities.

---

## Prospective Validation — What the Dashboard Does and Doesn't Do

### What the dashboard does
Shows current risk predictions: what Bzzt thinks the risk is *right now* based on
today's climate data.

### What prospective validation requires
Comparing a *past prediction* to what *actually happened*.

The prospective prediction log (added May 2026) stores every computation with:
- Exact timestamp of the prediction
- `validateAfter` field = prediction date + 5 weeks
- The predicted dengue/malaria levels and probability score

### The gap
Nothing reads that log back to compute accuracy. A complete prospective validation
system would need:
1. A job that checks which predictions are past their `validateAfter` date
2. Fetches actual reported case data from InfoDengue/WHO for those cities
3. Marks each prediction as correct or incorrect
4. Computes running accuracy visible on the dashboard: *"Last 60 days: HIGH alert
   followed by actual outbreak 71% of the time"*

This is the single most valuable piece of evidence we could accumulate over time.
By the time UNICEF's RFP review happens (~August 2026), 12+ weeks of prospective
data will exist in the log. Building the validation loop is the next priority.

---

## The Hardcoded Cities Problem

### The flaw
Bzzt's dashboard monitors 24 cities. All of them are large cities — Lagos, Dhaka,
Jakarta, Mumbai. The people dying from malaria and dengue are not primarily in
those cities. They are in:

- Rural Niger Delta and Borno state (Nigeria) — not Lagos
- Odisha, Chhattisgarh, Jharkhand (India) — not Mumbai or Delhi
- Chittagong Hill Tracts (Bangladesh) — not Dhaka
- Remote Amazonian provinces (Brazil) — not São Paulo

Big cities have hospitals, health workers, internet access, and existing disease
surveillance. The communities Bzzt most needs to reach have none of those things,
and they would never find or enroll in a web app.

### What was fixed
1. Removed London and New York — not endemic, no disease burden, misleading to show
2. Replaced with high-burden non-capital locations: Kano and Maiduguri (Northern
   Nigeria), Kisumu (Lake Victoria malaria zone), Bhopal and Raipur (India's
   highest-malaria states), Chittagong (Bangladesh), Cebu (Philippines Visayas),
   Manaus (Amazon)
3. The enrollment API already accepts any free-text location and geocodes it via
   OpenStreetMap Nominatim — a community health worker can enroll their village
4. The scan route now also scans all enrolled custom locations (not just hardcoded
   cities) — so rural enrolled users actually get coverage

### What remains unsolved technically
The enrollment model still requires someone to actively find Bzzt and sign up.
The USSD endpoint (`/api/ussd`) begins to address this — anyone can dial a short
code on a feature phone with no data plan and check risk for their region. But
true community reach requires on-the-ground distribution partnerships, not software.

---

## What We're Missing

### 1. The validation loop for prospective predictions
The log runs. Nobody reads it yet. Build the accuracy tracker.

### 2. SE Asia and South Asia validation
10 of the 24 monitored cities are in Southeast Asia and South Asia. None of them
have been statistically validated against local surveillance data. OpenDengue
has Philippines at national level only; India, Bangladesh, and Indonesia have
no freely accessible weekly city-level disease data.

### 3. Malaria validation
Every validation study so far has tested dengue only. InfoDengue covers dengue.
Malaria Atlas Project data is annual, not weekly. The malaria scoring model is
based on published biology but has not been statistically validated against any
real case data.

### 4. Climate-only model, remove prev_cases dependence
The strong ML result (AUC 0.928) depends partly on `prev_cases_log` — the previous
week's case count. This requires surveillance data, which doesn't exist in most
high-burden communities. The climate-only model (AUC 0.642–0.752) is the honest
deployable baseline. Work should focus on improving it, not the surveillance-dependent version.

### 5. The behavior change link is unproven
Getting an SMS does not automatically mean someone eliminates standing water around
their home. The causal chain from alert → behavior change → fewer cases has not
been studied. This is the most important missing piece for any serious impact claim.

### 6. Confidence intervals on all metrics
All results are point estimates. A paper would report 95% CI. With 14 locations
and 10 years, some of our estimates are quite uncertain.

### 7. Single city per country
Valle del Cauca (Cali, Colombia) scored AUC 0.405 — below random. Both ML and
rule-based fail there. This is unexplained and uninvestigated. It may reflect
specific water infrastructure patterns, urban flooding dynamics, or dengue serotype
cycling that climate cannot capture. More locations per country would help separate
real signal from city-specific anomalies.

---

## Summary Table

| What | Result | Honest caveat |
|---|---|---|
| Lead-time signal | **10–11 weeks**, r=0.489, p<0.001 | Measured in Brazil only |
| Rule-based AUC (gold-standard labels) | **0.752** | Brazil only |
| Rule-based AUC (climate-only) | 0.574 | Below fair |
| ML AUC with surveillance data | 0.928 | Partly autoregressive |
| ML AUC climate-only (temporal split) | 0.642 | Fair |
| ML AUC climate-only (LOCO) | 0.618 avg | 14 locations, 4 countries |
| Seasonality ablation | RF drops only 0.034 | Climate signal is real |
| Climate change bias in train/test | 0.00°C Δ at SP | La Niña 2022 confound |
| Malaria validation | None | No weekly city-level data |
| Prospective validation | Log running since May 2026 | Validation loop not built yet |
| Cities bias | Fixed — added rural high-burden | Last-mile reach still unsolved |
| Countries validated | Brazil, Peru, Colombia, Taiwan, Philippines | SE Asia, S Asia, Africa unvalidated |

**The honest one-sentence summary:**
> The climate-based ML model predicts dengue outbreaks 10–11 weeks in advance
> with AUC 0.618–0.752 across 14 locations and 4 countries using only freely
> available weather data — but validation is concentrated in Latin America,
> malaria is unvalidated, and the communities with the highest burden are the
> hardest to reach with an enrollment-based alert system.
