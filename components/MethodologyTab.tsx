'use client';

const FEATURES = [
  { name: 'Avg temperature (30d)', why: 'Mosquito breeding rate peaks at 26–32°C' },
  { name: 'Recent rainfall (30d)', why: 'Standing water creates larval habitat' },
  { name: 'Lagged rainfall (6–8 wks)', why: 'Primary outbreak trigger — breeding event to case peak' },
  { name: 'Humidity (30d)', why: 'Mosquito survival rate above 60%' },
  { name: 'Temperature anomaly', why: 'Deviation from 5-year baseline — detects unusual heat' },
  { name: 'Rainfall anomaly', why: 'Deviation from baseline — detects unusual wet season' },
  { name: 'Lagged rainfall anomaly', why: 'Anomaly in the triggering window' },
  { name: 'Humidity anomaly', why: 'Deviation from seasonal norm' },
  { name: 'sin(month)', why: 'Seasonal cycle encoding' },
  { name: 'cos(month)', why: 'Seasonal cycle encoding' },
  { name: 'Latitude', why: 'Tropical zone proximity' },
  { name: '|Latitude|', why: 'Distance from equator regardless of hemisphere' },
];

const SOURCES = [
  { name: 'Open-Meteo', role: 'Climate data', detail: 'Historical archive API · free · CC BY 4.0 · no key required', color: '#60A5FA' },
  { name: 'OpenDengue V1.3', role: 'ML training data', detail: '1.1M outbreak observations · 102 countries · 2000–2023 · CC BY 4.0', color: '#A78BFA' },
  { name: 'GADM v4.1', role: 'District boundaries', detail: 'GeoJSON polygons for 2,610 districts across 26 countries', color: '#34D399' },
  { name: 'Google Trends', role: 'Real-time signal booster', detail: 'Symptom search spikes in local languages · 1.4× multiplier on probability', color: '#FCD34D' },
  { name: 'Africa\'s Talking', role: 'SMS & USSD delivery', detail: 'Feature phone alerts · USSD CHW reporting · no smartphone required', color: '#F97316' },
  { name: 'Twilio / WhatsApp', role: 'Alert delivery', detail: 'WhatsApp Business API for smartphone users · remaining markets', color: '#22C55E' },
];

const VALIDATION = [
  {
    title: 'Retrospective — FIOCRUZ Brazil',
    badge: 'AUC 0.752',
    badgeColor: '#34D399',
    detail: 'Validated against InfoDengue surveillance data (FIOCRUZ, Brazil\'s national disease authority) across five cities — São Paulo, Rio de Janeiro, Fortaleza, Recife, Manaus — covering 2014–2023.',
    stats: [
      { label: 'Spearman r', value: '0.489' },
      { label: 'p-value', value: '<0.001' },
      { label: 'Improvement vs rule-based', value: '+31%' },
      { label: 'Rule-based baseline AUC', value: '0.574' },
    ],
  },
  {
    title: 'Cross-country — Leave One Country Out',
    badge: 'AUC 0.603',
    badgeColor: '#FCD34D',
    detail: 'LOCO cross-validation tests whether the model generalises to countries it was never trained on — the hardest possible test for geographic overfitting.',
    stats: [
      { label: 'Cities tested', value: '14' },
      { label: 'Countries', value: '5' },
      { label: 'Beat random chance', value: '11 of 14' },
      { label: 'Median AUC', value: '0.603' },
    ],
  },
  {
    title: 'Real-world — Delhi-NCR, April 2026',
    badge: 'Live signal',
    badgeColor: '#F87171',
    detail: 'In April 2026, Bzzt flagged Haryana (Delhi-NCR) as HIGH risk based on anomalous rainfall — 30mm in April, the highest in 18 years. Delhi\'s Municipal Corporation subsequently confirmed 52 dengue cases in April 2026, the highest April count in five years.',
    stats: [
      { label: 'Signal', value: 'HIGH (Haryana)' },
      { label: 'Confirmed cases', value: '52 in April' },
      { label: 'vs 5-year April avg', value: 'Highest on record' },
      { label: 'Source', value: 'MCD / Business Standard' },
    ],
  },
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <h2 className="text-xs text-white/50 uppercase tracking-wider border-b border-white/[0.06] pb-2">{title}</h2>
      {children}
    </div>
  );
}

export default function MethodologyTab() {
  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-10 w-full">

      {/* Pipeline */}
      <Section title="Data pipeline">
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-6">
          <div className="grid gap-4 w-full" style={{ gridTemplateColumns: '1fr 40px 2fr 40px 1fr' }}>
            {/* Sources */}
            <div className="flex flex-col gap-2">
              <p className="text-xs text-white/40 uppercase tracking-wider mb-1">Sources</p>
              {[
                { label: 'Open-Meteo API', sub: 'climate · free · no key', color: '#60A5FA' },
                { label: 'Google Trends',  sub: 'real-time symptom signal', color: '#FCD34D' },
                { label: 'CHW reports',    sub: 'USSD field reports',        color: '#34D399' },
              ].map(s => (
                <div key={s.label} className="rounded-lg border px-3 py-2.5 text-xs"
                  style={{ borderColor: `${s.color}30`, background: `${s.color}08` }}>
                  <p className="font-semibold" style={{ color: s.color }}>{s.label}</p>
                  <p className="text-white/50 mt-0.5">{s.sub}</p>
                </div>
              ))}
            </div>

            {/* Arrow 1 */}
            <div className="flex flex-col items-center justify-center gap-1 text-white/40">
              <span className="text-lg">→</span>
            </div>

            {/* Scorer */}
            <div className="rounded-xl border border-white/10 bg-white/[0.03] px-5 py-4 text-xs">
              <p className="font-bold text-white mb-2">bzzt-risk-scorer</p>
              <p className="text-white/60 mb-1">Logistic regression · 12 features</p>
              <p className="text-white/60 mb-1">5-year district baseline comparison</p>
              <p className="text-white/60 mb-1">Google Trends 1.4× booster</p>
              <p className="text-white/60 mb-1">CHW report 1.8× booster</p>
              <p className="text-white/60 mb-3">7 QC checks per run</p>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                <span className="text-white/40 text-[10px]">Runs nightly · 2am UTC</span>
              </div>
            </div>

            {/* Arrow 2 */}
            <div className="flex items-center justify-center text-white/40 text-lg">→</div>

            {/* Outputs */}
            <div className="flex flex-col gap-2">
              <p className="text-xs text-white/40 uppercase tracking-wider mb-1">Outputs</p>
              {[
                { label: '2,610 district scores', sub: 'HIGH · WATCH · LOW', color: '#F87171' },
                { label: 'SMS / WhatsApp / USSD', sub: 'alert delivery',      color: '#FCD34D' },
                { label: 'Intelligence dashboard', sub: 'health officer view', color: '#60A5FA' },
              ].map(s => (
                <div key={s.label} className="rounded-lg border px-3 py-2.5 text-xs"
                  style={{ borderColor: `${s.color}30`, background: `${s.color}08` }}>
                  <p className="font-semibold" style={{ color: s.color }}>{s.label}</p>
                  <p className="text-white/50 mt-0.5">{s.sub}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Section>

      {/* Model */}
      <Section title="Machine learning model">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-5 space-y-3">
            <p className="text-sm font-semibold text-white">Architecture</p>
            <div className="space-y-1.5 text-xs text-white/60">
              <p>Algorithm: <span className="text-white/80">Logistic regression (scikit-learn)</span></p>
              <p>Training data: <span className="text-white/80">OpenDengue V1.3 — 1.1M records, 102 countries, 2000–2023</span></p>
              <p>Input features: <span className="text-white/80">12 climate + seasonal + geographic</span></p>
              <p>Output: <span className="text-white/80">Outbreak probability 0–1 → LOW / WATCH / HIGH</span></p>
              <p>Threshold HIGH: <span className="text-white/80">≥ 60% probability</span></p>
              <p>Threshold WATCH: <span className="text-white/80">35–60% probability</span></p>
              <p>Licence: <span className="text-white/80">MIT — model weights open-source</span></p>
            </div>
          </div>
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-5 space-y-3">
            <p className="text-sm font-semibold text-white">Why logistic regression?</p>
            <p className="text-xs text-white/60 leading-relaxed">
              Interpretable by health officers and epidemiologists. Each feature has a signed coefficient — a district health officer can see exactly why a region scored HIGH. Deployable on any hardware without GPU. Calibrated probabilities (not just rankings). Appropriate for the training data size and the low-frequency outcome (outbreaks are rare events).
            </p>
          </div>
        </div>

        {/* Features table */}
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-white/[0.06]">
            <p className="text-sm font-semibold text-white">12 input features</p>
          </div>
          <div className="divide-y divide-white/[0.04]">
            {FEATURES.map((f, i) => (
              <div key={i} className="flex items-start justify-between px-5 py-2.5 text-xs gap-4">
                <span className="text-white/80 font-medium min-w-[200px]">{f.name}</span>
                <span className="text-white/45 text-right">{f.why}</span>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* Validation */}
      <Section title="Validation results">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {VALIDATION.map(v => (
            <div key={v.title} className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-5 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-semibold text-white leading-tight">{v.title}</p>
                <span className="text-xs font-bold px-2 py-0.5 rounded shrink-0"
                  style={{ color: v.badgeColor, background: `${v.badgeColor}15`, border: `1px solid ${v.badgeColor}30` }}>
                  {v.badge}
                </span>
              </div>
              <p className="text-xs text-white/50 leading-relaxed">{v.detail}</p>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 pt-1 border-t border-white/[0.05]">
                {v.stats.map(s => (
                  <div key={s.label}>
                    <p className="text-[10px] text-white/40 uppercase tracking-wide">{s.label}</p>
                    <p className="text-xs text-white/80 font-medium">{s.value}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* Data sources */}
      <Section title="Data sources">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {SOURCES.map(s => (
            <div key={s.name} className="flex items-start gap-3 bg-white/[0.02] border border-white/[0.06] rounded-xl p-4">
              <div className="w-2 h-2 rounded-full mt-1 shrink-0" style={{ background: s.color }} />
              <div>
                <p className="text-sm font-semibold text-white/90">{s.name}
                  <span className="text-xs font-normal text-white/45 ml-2">{s.role}</span>
                </p>
                <p className="text-xs text-white/45 mt-0.5">{s.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* Open source */}
      <Section title="Open source">
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-5 flex items-center justify-between gap-4">
          <div className="space-y-1">
            <p className="text-sm font-semibold text-white">MIT Licence — fully open source</p>
            <p className="text-xs text-white/50">Model weights, training code, pipeline, district boundaries, and this dashboard are all publicly available. Any government or NGO can deploy Bzzt at zero cost.</p>
          </div>
          <a
            href="https://github.com/divyanka-kapoor/bzzt"
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 px-4 py-2 rounded-lg border border-white/20 text-xs text-white/70 hover:text-white hover:border-white/40 transition-colors"
          >
            View on GitHub →
          </a>
        </div>
      </Section>

    </div>
  );
}
