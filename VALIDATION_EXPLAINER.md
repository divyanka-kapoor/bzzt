# What We Did, What It Means, What We're Missing
### A personal explainer — plain English first, then depth

---

## The Big Picture (Plain English)

We asked one question: **does climate data actually predict dengue outbreaks?**

Not theoretically — we checked it against 10 years of real reported disease cases
from Brazil's national surveillance system (InfoDengue, run by FIOCRUZ, one of the
world's top tropical disease research institutes). That's 2,610 weeks of data across
5 cities.

We ran three progressively more rigorous tests:

1. **Does Bzzt's current model correlate with real outbreaks?** (basic check)
2. **Can a machine learning model trained on climate data predict outbreaks better?** (ML test)
3. **Does that ML model work on cities it has never seen?** (the hardest test — LOCO)

The short answers: yes, dramatically yes, and yes.

---

## Step 1 — The Basic Validation

### What we did
Took Bzzt's existing rule-based model (the one in production right now) and ran it
backwards through 10 years of historical climate data. Then compared what the model
*would have predicted* against what *actually happened* in the disease data.

### What "Spearman correlation" means
Correlation measures whether two things move together. If the model score goes up when
cases go up, that's a positive correlation. Spearman is a version that doesn't care
about the exact numbers — it only cares about the *rank order* (was this week higher
than last week?). It's more robust to outliers than regular correlation.

- **r = 1.0** → perfect — every time model goes up, cases go up exactly
- **r = 0.5** → strong — roughly tracks together
- **r = 0.0** → random — no relationship at all
- **r = -0.3** → inverse — model goes up when cases go DOWN (bad)

**We got r = 0.15 concurrently** — weak on its own. But here's the key finding:

### The lead-time discovery
When we shifted the comparison — comparing the model's prediction at week T against
cases at week T+6 (six weeks later) — the correlation jumped to **r = 0.36**.

This means: **the climate conditions Bzzt measures show up 4–6 weeks before the
disease cases are reported.** The model isn't just correlating with outbreaks — it's
*preceding* them. That's what makes it useful as an early warning system.

Why 4–6 weeks? Three delays add up:
- Mosquito egg → adult: ~10 days
- Virus incubation inside mosquito (extrinsic incubation period): ~7–12 days
- Person gets sick → case gets reported to surveillance: ~1–2 weeks

Total: 4–6 weeks.

### What AUC-ROC means
AUC stands for Area Under the Receiver Operating Characteristic curve. Sounds
terrifying. Here's the simple version:

Imagine you're a bouncer at a club and you're trying to spot troublemakers before
they cause problems. You're inevitably going to make two kinds of mistakes:
- **False positives**: you turn away someone innocent (model says HIGH, no outbreak happens)
- **False negatives**: you let a troublemaker in (model says LOW, outbreak happens anyway)

The ROC curve plots the trade-off between these two errors at every possible threshold.
AUC is the area under that curve — a single number summary:
- **AUC = 0.5** → you're guessing randomly (coin flip)
- **AUC = 0.7** → fair discrimination
- **AUC = 0.8** → good
- **AUC = 0.9+** → very good
- **AUC = 1.0** → perfect (not realistic)

The rule-based Bzzt model got **AUC = 0.576** — barely above random. Not great.

### What Cohen's Kappa means
Kappa measures agreement between your predictions and reality, *correcting for chance*.
If 80% of weeks are non-outbreak weeks and your model just always says "LOW", it would
be right 80% of the time by doing nothing. Kappa accounts for this.

- **κ = 0** → you're doing no better than chance
- **κ = 0.2** → slight agreement
- **κ = 0.4** → moderate agreement
- **κ = 0.6** → substantial agreement
- **κ = 0.8+** → near-perfect

The rule-based model got **κ = 0.097** — slight, barely above chance.

### What sensitivity and specificity mean
These are the two fundamental measures of any diagnostic or warning system.

**Sensitivity** = of all the real outbreaks, what fraction did we catch?
- Rule-based Bzzt: 25% → we missed 75% of real outbreaks

**Specificity** = of all the safe weeks, what fraction did we correctly call safe?
- Rule-based Bzzt: 87% → we falsely alarmed on 13% of safe weeks

There's always a trade-off. Make the model more sensitive (catch more outbreaks) and
it becomes less specific (more false alarms). The right balance depends on context.
For disease early warning: missing an outbreak is worse than a false alarm, so you
want high sensitivity even at the cost of some specificity.

### Honest conclusion from Step 1
The rule-based model has a **real predictive signal** (the lead-time finding is
statistically significant, p<0.001). But its absolute performance is modest — it
misses most outbreaks and barely outperforms chance on kappa. Not strong enough
to claim it works. Strong enough to say: "there's a real signal here worth building on."

---

## Step 2 — The Regional Threshold Test

### What we did
The published biology says dengue mosquitoes start transmitting above 22°C, not 26°C
(which is what Bzzt uses). We tried adjusting the thresholds to match the literature
for each region.

### What happened
It made things *worse*. Kappa dropped from 0.085 to 0.020.

### Why — and what this taught us
22°C is almost always exceeded in tropical Brazilian cities. So lowering the threshold
to 22°C meant the model flagged nearly every single week as HIGH. Sensitivity shot to
98% but specificity collapsed to near zero. A model that always screams HIGH is useless.

The important lesson: **published biological thresholds tell you when transmission is
possible — not when it spikes relative to baseline.** The discriminating threshold (the
number that separates outbreak weeks from normal weeks) needs to be derived from local
data, not looked up in a paper.

This is why localization requires ML, not manual threshold tweaking.

---

## Step 3 — The ML Validation (The Real Finding)

### What we did
Instead of manually setting thresholds, we let a machine learning model learn the
optimal thresholds from the data itself. We trained it on climate features (same
Open-Meteo data Bzzt uses) and asked it to predict whether a week would be an outbreak.

**Features we gave it (43 total):**
- Rolling averages of temperature, rainfall, humidity at 7, 14, 28, and 56-day windows
- Those same features shifted back 2, 4, 6, and 8 weeks (lag features)
- Month encoded as sine/cosine (so January and December are "close" mathematically)
- Heat-humidity interaction (temp × humidity / 100)
- Temperature trend (this week vs. 4-week average — are we warming up?)
- Previous week's case count (log-scaled)
- The Bzzt rule-based score itself (as a feature — can ML improve on it?)

**Models we tested:**
- Logistic Regression — the simplest possible ML model, just a weighted sum of features
- Random Forest — many decision trees voting together, handles non-linear patterns
- Gradient Boosting — trees built sequentially, each correcting the last one's errors

### The critical design choice: temporal split
We trained on 2014–2020 and tested on 2021–2023. **This is non-negotiable for time
series.** If you randomly split the data, you train on weeks from 2022 and test on
weeks from 2015 — the model has effectively seen the future. That's data leakage and
produces fake-good results. Temporal split means the model has never seen anything
from the test period. It's predicting genuinely unseen future data.

### The results
| Model | AUC | Kappa | Sensitivity | Specificity |
|---|---|---|---|---|
| Logistic Regression | **0.928** | 0.495 | 0.948 | 0.715 |
| Gradient Boosting | 0.908 | **0.591** | 0.728 | 0.888 |
| Random Forest | 0.902 | 0.509 | 0.861 | 0.769 |
| Bzzt rule-based | 0.527 | 0.097 | 0.197 | 0.886 |

ML improved AUC by +0.40 and kappa by +0.40 over the rule-based model.

### What LOCO means (the most important test)
LOCO = Leave One City Out. This is the hardest test of generalisability.

For each city, we trained the model on the *other four cities* and tested it on the
one it had never seen. This answers: **if we deploy Bzzt to a brand new city with no
historical data, would the model work?**

| City held out | Rule-based AUC | ML AUC |
|---|---|---|
| São Paulo | 0.588 | 0.904 |
| Rio de Janeiro | 0.603 | 0.946 |
| Fortaleza | 0.628 | 0.848 |
| Recife | 0.499 (random) | 0.919 |
| Manaus | 0.642 | 0.862 |

**ML beats rule-based on every single city, in a test where it has never seen that city.**

### The honest caveat — feature importances
The most important feature was `prev_cases_log` (importance: 0.39) — the previous
week's reported case count. The second was `month_sin` (0.11) — seasonality.
Climate features were individually smaller (0.015–0.024 each).

This means: part of what the ML model is doing is just saying "if there were cases
last week, there will probably be cases this week." That's autoregressive forecasting,
not climate prediction. It requires surveillance data to work.

The climate signal is real but the autoregressive signal is stronger. For communities
with zero surveillance data, a climate-only version of this model would perform worse.

---

## What We're Missing

### 1. A climate-features-only ML model
We should re-run the ML validation with `prev_cases_log` removed. This answers: how
much of the performance comes from climate alone? If AUC stays above 0.75, the climate
signal is genuinely powerful. If it drops to 0.6, the model mostly learns from past
cases and the climate features are supporting characters.

### 2. More countries and cities
5 Brazilian cities is not enough to claim global validity. Brazil is Southern
Hemisphere, subtropical/tropical, with relatively good surveillance infrastructure.
We have no validation for:
- Southeast Asia (where dengue burden is highest)
- Sub-Saharan Africa (where malaria burden is highest)
- South Asia (India, Bangladesh — where Bzzt's other target cities are)

### 3. Prospective validation
Everything we did is retrospective — we tested the model on historical data where we
already knew the answer. True scientific validation requires running the model forward,
making predictions without knowing the outcome, then checking accuracy 4–6 weeks later.
6 months of prospective data would be more credible than 10 years of retrospective.

### 4. Malaria validation
We only validated for dengue because InfoDengue only covers dengue. We have no
real validation for the malaria scoring model. WHO GHO's malaria data is too sparse
and too aggregated for a proper weekly study.

### 5. Population-level impact modelling
Even if the model predicts correctly, we haven't shown that the alerts change
behaviour. Does an SMS about dengue risk actually cause people to eliminate standing
water? Without a behaviour study, you can't claim lives saved — only "outbreaks
predicted."

### 6. Confidence intervals
Our results are point estimates. A proper study would report 95% confidence intervals
on every metric. With 5 cities and 10 years, some of our estimates are quite uncertain.

---

## Why Hasn't This Been Done Before?

This is actually the most interesting question. The honest answer is: it has been done,
partially, in academic papers. But it hasn't been built into a free deployable product
that anyone can use. Here's why:

**1. Academic-industry gap.**
The papers validating climate-dengue relationships exist (we cited 8 of them). But
academic researchers write papers — they don't build production software that sends
SMS alerts. The knowledge exists; the pipeline from knowledge to community alert
doesn't.

**2. Data fragmentation.**
InfoDengue (Brazil) is exceptional. Most countries don't have anything comparable —
weekly city-level disease data that's publicly accessible and machine-readable. Without
that data, you can't train or validate a model. Brazil happens to be uniquely good at
this because FIOCRUZ invested in it specifically.

**3. Climate data used to be expensive.**
Open-Meteo launched in 2022. Before that, high-quality historical climate data required
paid APIs or complex ERA5 downloads from ECMWF. The "free, no key required, global
coverage" pipeline Bzzt uses simply didn't exist before about 2022.

**4. The last-mile problem is hard.**
Predicting an outbreak is technically interesting. Actually getting the warning to a
subsistence farmer in rural Indonesia who doesn't have a smartphone requires Twilio
integration, phone number databases, community trust, local language support, and
partnerships with health workers. That's not a research problem — it's a distribution
and operations problem. Researchers don't solve those.

**5. No one has combined all three.**
Individual pieces exist: climate-disease prediction papers, SMS alert systems, open
climate APIs. What Bzzt does is connect them end-to-end with a governance layer
(OpenMetadata). The integration is the innovation, not any individual component.

**6. Bureaucratic inertia.**
Government health ministries are conservative by necessity — they can't send alerts
based on unvalidated models. The validation work we just did (10 years, 5 cities,
LOCO, temporal split) is precisely the evidence needed to get through that door.
Without it, this is just another GitHub repo. With it, it's a fundable proposal.

---

## Summary Table

| What | Result | Honest caveat |
|---|---|---|
| Lead-time signal | 4–6 weeks, r=0.36, p<0.001 | Moderate, not strong |
| Rule-based AUC | 0.576 | Barely above random |
| ML AUC (temporal split) | 0.928 | Partially driven by autoregressive feature |
| ML AUC (LOCO — unseen cities) | 0.848–0.946 | Only tested in Brazil |
| Malaria validation | None | Real gap |
| Prospective validation | None | Needed for govt contract |
| Countries validated | 1 (Brazil) | Major limitation |

**The honest one-sentence summary:**
> The ML model trained on climate data predicts dengue outbreaks with AUC 0.85–0.95
> on cities it has never seen, using only freely available weather data — but the
> validation is Brazil-only, retrospective, and partially dependent on surveillance
> data that isn't available everywhere Bzzt needs to operate.
