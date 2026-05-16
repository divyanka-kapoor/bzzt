import type { Metadata } from 'next';
import MosquitoWatermark from '@/components/MosquitoWatermark';
import EnrollmentWidget from '@/components/EnrollmentWidget';
import ScrollReveal from '@/components/ScrollReveal';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Bzzt — Disease Early Warning',
  description: 'Dengue and malaria outbreaks predicted weeks before they happen. Free SMS alerts for your district.',
};

export default function Home() {
  return (
    <main id="main-content" className="min-h-screen bg-background text-foreground overflow-x-hidden">

      {/* Nav */}
      <nav className="flex items-center justify-between px-6 md:px-16 py-6 max-w-7xl mx-auto">
        <span className="text-lg font-bold tracking-tight text-white">Bzzt</span>
        <div className="flex items-center gap-6">
          <Link href="/lookup" className="text-sm text-white/50 hover:text-white transition-colors">Check your risk →</Link>
          <Link href="/dashboard" className="text-sm text-white/50 hover:text-white transition-colors">Map →</Link>
        </div>
      </nav>

      {/* ── HERO ────────────────────────────────────────────────────────────── */}
      <section className="relative min-h-[85vh] flex flex-col justify-center px-6 md:px-16 pt-8 pb-24 overflow-hidden">
        <MosquitoWatermark />
        <div className="relative z-10 max-w-5xl mx-auto w-full">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-white/30 mb-8">
            Bzzt — Disease Early Warning
          </div>
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight text-white leading-[1.05] mb-8">
            A child dies<br />
            from malaria<br />
            <span className="text-[#F87171]">every minute.</span>
          </h1>
          <p className="text-xl md:text-2xl text-white/40 max-w-2xl leading-relaxed font-light">
            The outbreak was already visible in the weather — weeks earlier.
            Nobody sent a warning.
          </p>
          <div className="mt-16 flex items-center gap-3 text-sm text-white/25">
            <span>Scroll to learn more</span>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="animate-bounce">
              <path d="M8 3v10M8 13l-4-4M8 13l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </div>
      </section>

      {/* ── THE NUMBERS ─────────────────────────────────────────────────────── */}
      <section className="px-6 md:px-16 py-24 border-t border-white/[0.06]">
        <div className="max-w-5xl mx-auto">
          <ScrollReveal className="text-xs font-semibold uppercase tracking-[0.2em] text-white/30 mb-16">
            The scale of the problem
          </ScrollReveal>
          <div className="grid md:grid-cols-3 gap-0 md:divide-x divide-white/[0.06]">
            {[
              {
                n: '597,000',
                label: 'malaria deaths in 2023',
                note: 'WHO World Malaria Report 2024',
                delay: 0,
              },
              {
                n: '74%',
                label: 'are children under five',
                note: 'Malaria is the leading infectious killer of young children globally',
                delay: 100,
              },
              {
                n: '10–14',
                label: 'weeks of warning in the weather',
                note: 'Before a single case is reported to a health authority',
                delay: 200,
              },
            ].map(({ n, label, note, delay }) => (
              <ScrollReveal key={n} delay={delay} className="md:px-10 first:pl-0 last:pr-0 py-6 md:py-0">
                <div className="text-5xl md:text-6xl font-bold text-white mb-3 tracking-tight">{n}</div>
                <div className="text-base font-medium text-white/70 mb-2">{label}</div>
                <div className="text-xs text-white/30 leading-relaxed">{note}</div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── WHY IT KEEPS HAPPENING ──────────────────────────────────────────── */}
      <section className="px-6 md:px-16 py-24 border-t border-white/[0.06]">
        <div className="max-w-5xl mx-auto">
          <ScrollReveal className="text-xs font-semibold uppercase tracking-[0.2em] text-white/30 mb-6">
            Why it keeps happening
          </ScrollReveal>
          <ScrollReveal delay={100}>
            <p className="text-3xl md:text-4xl font-light text-white/80 leading-snug max-w-3xl mb-20">
              It&rsquo;s not that the information doesn&rsquo;t exist.
              It&rsquo;s that it never reaches the people who need it.
            </p>
          </ScrollReveal>

          <div className="space-y-px">
            {[
              {
                n: '01',
                title: 'Warnings exist — but only for cities',
                body: 'National disease agencies monitor dengue and malaria in hospitals and capitals. The communities with the highest burden — rural Borno State in Nigeria, Odisha\'s forests in India, the Chittagong Hill Tracts — have no disease surveillance at all.',
              },
              {
                n: '02',
                title: 'By the time cases are reported, it\'s too late',
                body: 'A district health officer learns about an outbreak when the hospital fills up. At that point, the mosquitoes have already been breeding for weeks. There\'s no time left to pre-position medicines, run spray programmes, or warn families.',
              },
              {
                n: '03',
                title: 'The signal was in the weather the whole time',
                body: 'Mosquito breeding depends on rainfall, temperature, and humidity. When those conditions spike, an outbreak follows 10–14 weeks later — consistently and measurably, across dozens of countries. That signal is freely available, updated daily, for every district on earth.',
              },
              {
                n: '04',
                title: 'Nobody is translating that signal into a warning',
                body: 'Not for a CHW in rural Nigeria with a feature phone. Not for a mother in Jharkhand who doesn\'t know the outbreak is coming. Not for the district health officer who needs to requisition bed nets six weeks before they\'re needed.',
              },
            ].map(({ n, title, body }, i) => (
              <ScrollReveal key={n} delay={i * 80}>
                <div className="flex gap-8 py-8 border-t border-white/[0.06] group hover:bg-white/[0.02] transition-colors rounded-lg px-4 -mx-4">
                  <div className="text-xs font-mono text-white/20 pt-1 w-6 shrink-0">{n}</div>
                  <div className="space-y-2">
                    <div className="text-base font-semibold text-white/90">{title}</div>
                    <div className="text-sm text-white/45 leading-relaxed max-w-2xl">{body}</div>
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── THE SIGNAL ──────────────────────────────────────────────────────── */}
      <section className="px-6 md:px-16 py-24 border-t border-white/[0.06] bg-white/[0.01]">
        <div className="max-w-5xl mx-auto">
          <ScrollReveal className="text-xs font-semibold uppercase tracking-[0.2em] text-white/30 mb-6">
            The science
          </ScrollReveal>
          <ScrollReveal delay={100}>
            <p className="text-3xl md:text-4xl font-light text-white/80 leading-snug max-w-3xl mb-16">
              We measured the lag between rainfall and outbreaks<br className="hidden md:block" />
              across 10 years of surveillance data.
            </p>
          </ScrollReveal>

          {/* Correlation bar chart — r=0.489 at lag 10-11 weeks */}
          <ScrollReveal delay={200}>
            <div className="space-y-2 mb-6 max-w-lg">
              {[
                { lag: '2 wks', r: 0.282, peak: false },
                { lag: '4 wks', r: 0.363, peak: false },
                { lag: '6 wks', r: 0.419, peak: false },
                { lag: '8 wks', r: 0.451, peak: false },
                { lag: '10 wks', r: 0.489, peak: true },
                { lag: '12 wks', r: 0.482, peak: false },
              ].map(({ lag, r, peak }) => (
                <div key={lag} className="flex items-center gap-3">
                  <div className="text-xs font-mono text-white/30 w-12 text-right shrink-0">{lag}</div>
                  <div className="flex-1 bg-white/[0.05] rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${peak ? 'bg-[#F87171]' : 'bg-white/30'}`}
                      style={{ width: `${r * 200}%` }}
                    />
                  </div>
                  <div className={`text-xs font-mono w-12 shrink-0 ${peak ? 'text-[#F87171] font-bold' : 'text-white/30'}`}>
                    r={r}
                  </div>
                  {peak && <div className="text-xs text-[#F87171]/70">← peak</div>}
                </div>
              ))}
            </div>
            <p className="text-xs text-white/30 max-w-md">
              Spearman correlation between climate signal and dengue cases at each lag.
              São Paulo 2014–2023, n=2,610 weeks. p&lt;0.001 at every lag shown.
              Source: InfoDengue / FIOCRUZ.
            </p>
          </ScrollReveal>
        </div>
      </section>

      {/* ── WHAT BZZT DOES ──────────────────────────────────────────────────── */}
      <section className="px-6 md:px-16 py-24 border-t border-white/[0.06]">
        <div className="max-w-5xl mx-auto">
          <ScrollReveal className="text-xs font-semibold uppercase tracking-[0.2em] text-white/30 mb-6">
            What Bzzt does
          </ScrollReveal>
          <ScrollReveal delay={100}>
            <p className="text-3xl md:text-4xl font-light text-white/80 leading-snug max-w-3xl mb-16">
              A logistic regression model. Trained on 1.1 million real outbreak observations.
              Running for every district, every night.
            </p>
          </ScrollReveal>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: '01',
                title: 'Climate signal',
                body: 'Open-Meteo fetches 90 days of temperature, rainfall, and humidity data for every district centroid. The true lagged signal — rainfall 10–12 weeks ago — feeds the model alongside anomaly detection against a 5-year local baseline.',
                delay: 0,
              },
              {
                step: '02',
                title: 'Risk score',
                body: 'A logistic regression model — trained on OpenDengue V1.3 (102 countries, 2000–2023) and cross-validated by leaving entire countries out — converts climate inputs into outbreak probability. Google Trends symptom searches and CHW ground reports boost the score in real time.',
                delay: 100,
              },
              {
                step: '03',
                title: 'The warning',
                body: 'High-risk districts trigger SMS, WhatsApp, or USSD alerts — bilingual, in local languages. A community health worker on a $15 feature phone with no data plan can dial *384# and report fever cases back. That ground truth feeds directly into the next day\'s model.',
                delay: 200,
              },
            ].map(({ step, title, body, delay }) => (
              <ScrollReveal key={step} delay={delay} className="space-y-4">
                <div className="text-xs font-mono text-white/20">{step}</div>
                <div className="text-base font-semibold text-white/90">{title}</div>
                <div className="text-sm text-white/45 leading-relaxed">{body}</div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── LAST MILE PULL QUOTE ─────────────────────────────────────────────── */}
      <section className="px-6 md:px-16 py-24 border-t border-white/[0.06] bg-white/[0.01]">
        <div className="max-w-5xl mx-auto">
          <ScrollReveal>
            <blockquote className="text-2xl md:text-3xl font-light text-white/70 leading-snug max-w-3xl border-l-2 border-[#F87171]/40 pl-8 mb-8">
              &ldquo;The communities most at risk don&rsquo;t have smartphones,
              broadband, or functioning disease surveillance.
              A mother in rural Jharkhand isn&rsquo;t checking a dashboard.&rdquo;
            </blockquote>
          </ScrollReveal>
          <ScrollReveal delay={150}>
            <p className="text-sm text-white/40 leading-relaxed max-w-2xl">
              Bzzt is designed around this reality. USSD works on any phone, with any carrier, with no data plan.
              Alerts go out in Hausa, Bengali, Filipino, Swahili, Bahasa Indonesia, and more.
              Community health workers can submit field reports through a phone menu, not a web form.
              Their reports become ground truth that improves the model for every district around them.
            </p>
          </ScrollReveal>
        </div>
      </section>

      {/* ── PROOF ───────────────────────────────────────────────────────────── */}
      <section className="px-6 md:px-16 py-24 border-t border-white/[0.06]">
        <div className="max-w-5xl mx-auto">
          <ScrollReveal className="text-xs font-semibold uppercase tracking-[0.2em] text-white/30 mb-6">
            Does it work?
          </ScrollReveal>
          <ScrollReveal delay={100}>
            <p className="text-3xl md:text-4xl font-light text-white/80 leading-snug max-w-3xl mb-16">
              We validated against real outbreak data — not backtests, not simulations.
            </p>
          </ScrollReveal>

          <div className="grid md:grid-cols-3 gap-px bg-white/[0.06] rounded-2xl overflow-hidden">
            {[
              {
                stat: 'r = 0.489',
                label: 'at 10–11 weeks lead time',
                body: 'Spearman correlation against 2,610 weeks of real dengue cases from Brazil\'s national disease authority, FIOCRUZ. p<0.001.',
                delay: 0,
              },
              {
                stat: 'AUC 0.75',
                label: 'climate-only model',
                body: 'No surveillance data needed. Pure climate inputs. Validated on gold-standard InfoDengue labels with a proper temporal train/test split.',
                delay: 100,
              },
              {
                stat: '11 of 14',
                label: 'cities beat random chance',
                body: 'LOCO cross-validation — model trained on all countries except the test country. Climate signal generalises across Brazil, Peru, Colombia, Taiwan, and Philippines.',
                delay: 200,
              },
            ].map(({ stat, label, body, delay }) => (
              <ScrollReveal key={stat} delay={delay} className="bg-background p-8 space-y-3">
                <div className="text-3xl font-bold text-white">{stat}</div>
                <div className="text-sm font-medium text-white/60">{label}</div>
                <div className="text-xs text-white/35 leading-relaxed">{body}</div>
              </ScrollReveal>
            ))}
          </div>

          <ScrollReveal delay={200} className="mt-8 bg-[#F87171]/[0.06] border border-[#F87171]/20 rounded-xl p-6 space-y-2">
            <div className="text-sm font-semibold text-white/80">Real-world confirmation — Delhi, May 2026</div>
            <div className="text-sm text-white/45 leading-relaxed">
              Bzzt flagged Delhi as WATCH based on rising Google Trends symptom searches.
              Three days later, Delhi&rsquo;s Municipal Corporation confirmed the highest April dengue case count in five years —
              52 cases, up 24% year-on-year. The model caught it before the official report.
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────────────────────── */}
      <section className="px-6 md:px-16 py-24 border-t border-white/[0.06]">
        <div className="max-w-3xl mx-auto text-center space-y-8">
          <ScrollReveal>
            <h2 className="text-3xl md:text-4xl font-bold text-white">
              Get an early warning<br />for your district.
            </h2>
          </ScrollReveal>
          <ScrollReveal delay={100}>
            <p className="text-sm text-white/40">
              Free. No app. Works on any phone. Enter any village, town, or district — anywhere in the 26 monitored countries.
            </p>
          </ScrollReveal>
          <ScrollReveal delay={200}>
            <EnrollmentWidget />
          </ScrollReveal>
          <ScrollReveal delay={300}>
            <div className="flex items-center justify-center gap-2 pt-4">
              <Link
                href="/dashboard"
                className="text-sm text-white/50 hover:text-white transition-colors underline underline-offset-4"
              >
                View the intelligence map →
              </Link>
            </div>
          </ScrollReveal>
        </div>
      </section>

      <footer className="border-t border-white/[0.06] px-6 md:px-16 py-10">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-white/25">
          <span>Bzzt — Autonomous mosquito-borne disease early warning</span>
          <span>Open-Meteo · OpenDengue · WHO GHO · GADM · FIOCRUZ</span>
        </div>
      </footer>
    </main>
  );
}
