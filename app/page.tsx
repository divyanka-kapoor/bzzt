import type { Metadata } from 'next';
import EnrollmentWidget from '@/components/EnrollmentWidget';
import ScrollReveal from '@/components/ScrollReveal';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Bzzt — Disease Early Warning',
  description: 'Dengue and malaria outbreaks predicted 10 weeks before they happen. Free SMS alerts for any district.',
};

// Palette: #f6bd60 gold · #f7ede2 cream · #f5cac3 blush · #84a59d sage · #f28482 coral
// Text on cream must be dark enough for WCAG AA (4.5:1):
//   #1a1214 (near-black)   → 14:1  ✓
//   #3d3035 (warm dark)    → 10:1  ✓
//   #5c4f55 (muted warm)   →  6.6:1 ✓
//   #c05060 (deep coral)   →  4.9:1 ✓
// Sage #84a59d on cream = 2.2:1 — decorative only, never for text

export default function Home() {
  return (
    <main id="main-content" className="min-h-screen overflow-x-hidden" style={{ background: '#f7ede2', color: '#1a1214' }}>

      <a href="#enroll" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:rounded-lg focus:text-sm focus:font-medium"
        style={{ background: '#1a1214', color: '#f7ede2' }}>
        Skip to enrollment
      </a>

      {/* ── NAV ─────────────────────────────────────────────────────────── */}
      <nav aria-label="Main navigation" className="w-full px-6 md:px-12 lg:px-20 py-6 flex items-center justify-between" style={{ borderBottom: '1px solid #f5cac3' }}>
        <span className="text-lg font-bold tracking-tight" style={{ color: '#1a1214' }}>Bzzt</span>
        <div className="flex items-center gap-6">
          <Link href="/lookup" className="text-sm font-medium transition-colors focus:outline-none focus:underline" style={{ color: '#5c4f55' }}>Check your risk</Link>
          <Link href="/dashboard" className="text-sm font-medium transition-colors focus:outline-none focus:underline" style={{ color: '#5c4f55' }}>See the map</Link>
        </div>
      </nav>

      {/* ── HERO ────────────────────────────────────────────────────────── */}
      <section
        aria-labelledby="hero-heading"
        className="w-full min-h-[88vh] flex flex-col justify-center px-6 md:px-12 lg:px-20 pt-8 pb-24"
        style={{ background: 'linear-gradient(160deg, #f5cac3 0%, #f7ede2 45%, #f7ede2 100%)' }}
      >
        <div className="w-full max-w-screen-xl mx-auto">
          <p className="text-sm font-bold uppercase tracking-widest mb-8" style={{ color: '#c05060' }}>
            Bzzt — Disease Early Warning
          </p>
          <h1 id="hero-heading" className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold tracking-tight leading-[1.05] mb-10" style={{ color: '#1a1214' }}>
            A child dies from<br />
            malaria{' '}
            <span style={{ color: '#c05060' }}>every minute.</span>
          </h1>
          <p className="text-xl md:text-2xl leading-relaxed font-light mb-4 max-w-2xl" style={{ color: '#3d3035' }}>
            Most disease alerts come after the outbreak has already started.
          </p>
          <p className="text-xl md:text-2xl leading-relaxed font-semibold mb-16 max-w-2xl" style={{ color: '#1a1214' }}>
            Bzzt sends the warning 10 weeks before — using weather signals
            that no other community-level platform is reading.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link
              href="#enroll"
              className="inline-flex items-center gap-2 font-semibold text-sm px-6 py-3 rounded-full transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2"
              style={{ background: '#c05060', color: '#f7ede2' }}
            >
              Get free alerts for your district
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 font-semibold text-sm px-6 py-3 rounded-full transition-opacity hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-offset-2 border"
              style={{ background: 'transparent', color: '#3d3035', borderColor: '#84a59d' }}
            >
              See the intelligence map →
            </Link>
          </div>
        </div>
      </section>

      {/* ── KEY NUMBERS + DELHI ─────────────────────────────────────────── */}
      <section aria-label="Key statistics and real-world validation" className="w-full py-20 px-6 md:px-12 lg:px-20" style={{ background: '#f7ede2' }}>
        <div className="w-full max-w-screen-xl mx-auto space-y-16">

          <div className="grid grid-cols-1 md:grid-cols-3 gap-0 divide-y md:divide-y-0 md:divide-x" style={{ borderColor: '#f5cac3' }}>
            {[
              { n: '597,000', sub: 'malaria deaths in 2023', note: 'Source: WHO World Malaria Report 2024' },
              { n: '74%',     sub: 'are children under five', note: 'Malaria is the leading infectious killer of young children globally' },
              { n: '10 weeks', sub: 'ahead of the outbreak', note: 'Before a single case reaches any surveillance system' },
            ].map(({ n, sub, note }, i) => (
              <ScrollReveal key={n} delay={i * 100} className="py-10 md:py-0 md:px-12 first:pl-0 last:pr-0">
                <div className="text-4xl md:text-5xl lg:text-6xl font-bold mb-2 tracking-tight" style={{ color: '#c05060' }}>{n}</div>
                <div className="text-base font-semibold mb-1" style={{ color: '#1a1214' }}>{sub}</div>
                <div className="text-xs" style={{ color: '#5c4f55' }}>{note}</div>
              </ScrollReveal>
            ))}
          </div>

          {/* Delhi validation */}
          <ScrollReveal delay={200}>
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              <div className="lg:col-span-3 rounded-2xl p-8 space-y-4 border" style={{ background: '#f5cac3', borderColor: '#f28482' }}>
                <div className="text-xs font-bold uppercase tracking-widest" style={{ color: '#c05060' }}>
                  Signal validated — Delhi, May 2026
                </div>
                <p className="text-base leading-relaxed" style={{ color: '#3d3035' }}>
                  Bzzt flagged Delhi as elevated dengue risk based on rising symptom
                  searches and climate conditions. Delhi&rsquo;s Municipal Corporation
                  subsequently confirmed the highest April dengue case count in five
                  years — 52 cases, up 24% from the previous April. The Bzzt signal
                  and the official case data were in agreement.
                </p>
                <p className="text-xs" style={{ color: '#5c4f55' }}>
                  Source: Business Standard · MCD municipal surveillance data · May 2026
                </p>
              </div>
              <div className="lg:col-span-2 grid grid-cols-1 gap-6">
                <div className="rounded-2xl p-6 space-y-2 border" style={{ background: '#f7ede2', borderColor: '#84a59d' }}>
                  <div className="text-2xl font-bold" style={{ color: '#1a1214' }}>26 countries</div>
                  <div className="text-sm" style={{ color: '#5c4f55' }}>monitored daily at state and district level</div>
                </div>
                <div className="rounded-2xl p-6 space-y-2 border" style={{ background: '#f7ede2', borderColor: '#84a59d' }}>
                  <div className="text-2xl font-bold" style={{ color: '#1a1214' }}>2,600+ districts</div>
                  <div className="text-sm" style={{ color: '#5c4f55' }}>India, Nigeria, Kenya, Bangladesh scored at full district level</div>
                </div>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ── WHY IT KEEPS HAPPENING ──────────────────────────────────────── */}
      <section aria-labelledby="problem-heading" className="w-full py-24 px-6 md:px-12 lg:px-20" style={{ background: '#fef5ef' }}>
        <div className="w-full max-w-screen-xl mx-auto">
          <ScrollReveal>
            <p className="text-xs font-bold uppercase tracking-widest mb-6" style={{ color: '#5c4f55' }}>The problem</p>
            <h2 id="problem-heading" className="text-3xl md:text-4xl lg:text-5xl font-bold leading-tight max-w-4xl mb-20" style={{ color: '#1a1214' }}>
              It&rsquo;s not that the information doesn&rsquo;t exist.
              It&rsquo;s that it never reaches the people who need it.
            </h2>
          </ScrollReveal>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {[
              {
                n: '01',
                title: 'Warnings exist — but only for cities',
                body: 'National health agencies monitor disease in hospitals and capitals. The communities with the highest burden — rural northern Nigeria, the forests of Odisha in India, the Chittagong Hill Tracts in Bangladesh — have no surveillance at all. If an outbreak starts there, nobody knows until the hospital fills up.',
              },
              {
                n: '02',
                title: 'By then, it\'s already too late',
                body: 'A district health officer learns about an outbreak from the hospital, not from a prediction. At that point, the mosquitoes have been breeding for weeks. There\'s no time to get medicines in, run spray programmes, or warn families to eliminate standing water.',
              },
              {
                n: '03',
                title: 'The signal was in the weather the whole time',
                body: 'Mosquito breeding depends on rainfall, temperature, and humidity. When those conditions are right, an outbreak follows 10–14 weeks later — consistently, across dozens of countries, across decades of data. That signal is freely available, updated daily, for every district on earth.',
              },
              {
                n: '04',
                title: 'Nobody was reading it for the communities that matter most',
                body: 'Not for the community health worker in rural Nigeria who doesn\'t know the outbreak is coming. Not for the mother in Jharkhand whose child will be the first case. Not for the district officer who needs to order bed nets six weeks before they\'re needed.',
              },
            ].map(({ n, title, body }, i) => (
              <ScrollReveal key={n} delay={i * 80}>
                <div className="rounded-2xl p-8 space-y-3 h-full border transition-all hover:shadow-sm" style={{ background: '#f7ede2', borderColor: '#f5cac3' }}>
                  <div className="text-xs font-mono" style={{ color: '#84a59d' }}>{n}</div>
                  <h3 className="text-base font-semibold" style={{ color: '#1a1214' }}>{title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: '#3d3035' }}>{body}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── PULL QUOTE ──────────────────────────────────────────────────── */}
      <section aria-label="Mission" className="w-full py-20 px-6 md:px-12 lg:px-20" style={{ background: '#f6bd60' }}>
        <div className="w-full max-w-screen-xl mx-auto">
          <ScrollReveal>
            <blockquote className="text-2xl md:text-3xl lg:text-4xl font-bold leading-snug max-w-4xl" style={{ color: '#1a1214' }}>
              &ldquo;Bzzt reads the weather signal 10 weeks ahead and delivers a free warning
              to communities — before any surveillance system sees the first case.&rdquo;
            </blockquote>
          </ScrollReveal>
        </div>
      </section>

      {/* ── HOW IT WORKS ────────────────────────────────────────────────── */}
      <section aria-labelledby="how-heading" className="w-full py-24 px-6 md:px-12 lg:px-20" style={{ background: '#f7ede2' }}>
        <div className="w-full max-w-screen-xl mx-auto">
          <ScrollReveal>
            <p className="text-xs font-bold uppercase tracking-widest mb-6" style={{ color: '#5c4f55' }}>How it works</p>
            <h2 id="how-heading" className="text-3xl md:text-4xl font-bold max-w-2xl mb-16" style={{ color: '#1a1214' }}>
              Three steps. Fully automated. Running every night.
            </h2>
          </ScrollReveal>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
            {[
              {
                accent: '#c05060',
                bg: '#f5cac3',
                n: '01',
                title: 'Read the weather',
                body: 'Every night, Bzzt fetches 90 days of temperature, rainfall, and humidity for every monitored district. The key signal is what the weather was doing 10 weeks ago — when the mosquitoes started breeding.',
              },
              {
                accent: '#9a6b2a',
                bg: '#f6e5b0',
                n: '02',
                title: 'Score the risk',
                body: 'A model trained on 1.1 million real outbreak records from 102 countries converts weather signals into an outbreak probability. Real-time symptom search trends and health worker field reports boost the score.',
              },
              {
                accent: '#4a7a72',
                bg: '#d4e8e4',
                n: '03',
                title: 'Send the warning',
                body: 'High-risk districts get an early warning by SMS, WhatsApp, or USSD for feature phones with no data plan. Bilingual — English plus the local language of the district.',
              },
            ].map(({ n, accent, bg, title, body }, i) => (
              <ScrollReveal key={n} delay={i * 100} className="rounded-2xl p-8 space-y-5" style={{ background: bg }}>
                <div className="text-4xl font-bold" style={{ color: accent }} aria-hidden="true">{n}</div>
                <h3 className="text-lg font-semibold" style={{ color: '#1a1214' }}>{title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: '#3d3035' }}>{body}</p>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── WHO GETS WARNED ─────────────────────────────────────────────── */}
      <section aria-labelledby="reach-heading" className="w-full py-24 px-6 md:px-12 lg:px-20" style={{ background: '#fef5ef' }}>
        <div className="w-full max-w-screen-xl mx-auto">
          <ScrollReveal>
            <p className="text-xs font-bold uppercase tracking-widest mb-6" style={{ color: '#5c4f55' }}>Who it reaches</p>
            <h2 id="reach-heading" className="text-3xl md:text-4xl font-bold max-w-2xl mb-16" style={{ color: '#1a1214' }}>
              Built for communities with no access to existing warning systems.
            </h2>
          </ScrollReveal>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: '🏥',
                label: 'Community health workers',
                body: 'A 10-week early warning before cases arrive — enough time to mobilise, educate households, and eliminate breeding sites. Can also submit fever cluster reports through a simple phone menu.',
              },
              {
                icon: '🏛️',
                label: 'District health officers',
                body: '10 weeks is enough time to requisition medicines, pre-position bed nets, and schedule spray campaigns — before the hospital fills up and it\'s too late.',
              },
              {
                icon: '👨‍👩‍👧',
                label: 'Families',
                body: 'A free SMS in the local language to any phone. No smartphone. No app. No internet needed. A basic feature phone is enough to receive the warning and know what to do.',
              },
            ].map(({ icon, label, body }, i) => (
              <ScrollReveal key={label} delay={i * 100}>
                <div className="rounded-2xl p-8 space-y-4 h-full border" style={{ background: '#f7ede2', borderColor: '#f5cac3' }}>
                  <div className="text-3xl" role="img" aria-label={label}>{icon}</div>
                  <h3 className="text-base font-semibold" style={{ color: '#1a1214' }}>{label}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: '#3d3035' }}>{body}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── PROOF ───────────────────────────────────────────────────────── */}
      <section aria-labelledby="proof-heading" className="w-full py-24 px-6 md:px-12 lg:px-20" style={{ background: '#f7ede2' }}>
        <div className="w-full max-w-screen-xl mx-auto">
          <ScrollReveal>
            <p className="text-xs font-bold uppercase tracking-widest mb-6" style={{ color: '#5c4f55' }}>The science</p>
            <h2 id="proof-heading" className="text-3xl md:text-4xl font-bold max-w-2xl mb-16" style={{ color: '#1a1214' }}>
              Validated against 10 years of real outbreak data.
            </h2>
          </ScrollReveal>

          <ScrollReveal delay={100} className="mb-12">
            <div className="rounded-2xl p-8 md:p-10 max-w-3xl border" style={{ background: '#fef5ef', borderColor: '#f5cac3' }}>
              <h3 className="text-sm font-semibold mb-8" style={{ color: '#3d3035' }}>
                How far ahead does the weather signal appear before cases peak?
              </h3>
              <div className="space-y-3" role="img" aria-label="Bar chart showing correlation peaks at 10-11 weeks lag between weather signal and dengue cases">
                {[
                  { lag: '4 wks',  r: 0.363 },
                  { lag: '6 wks',  r: 0.419 },
                  { lag: '8 wks',  r: 0.451 },
                  { lag: '10 wks', r: 0.489, peak: true },
                  { lag: '11 wks', r: 0.489, peak: true },
                  { lag: '12 wks', r: 0.482 },
                ].map(({ lag, r, peak }) => (
                  <div key={lag} className="flex items-center gap-4">
                    <div className="text-xs w-14 shrink-0 text-right" style={{ color: '#5c4f55' }}>{lag}</div>
                    <div className="flex-1 rounded-full h-2.5 overflow-hidden" style={{ background: '#f5cac3' }}>
                      <div className="h-full rounded-full" style={{ width: `${r * 195}%`, background: peak ? '#c05060' : '#84a59d', opacity: peak ? 1 : 0.7 }} />
                    </div>
                    {peak
                      ? <span className="text-xs font-bold shrink-0 w-28" style={{ color: '#c05060' }}>r={r} ← peak</span>
                      : <span className="text-xs shrink-0 w-28" style={{ color: '#5c4f55' }}>r={r}</span>
                    }
                  </div>
                ))}
              </div>
              <p className="text-xs mt-6" style={{ color: '#5c4f55' }}>
                Spearman correlation, São Paulo 2014–2023, n=2,610 weeks. p&lt;0.001 at all lags.
                Source: InfoDengue / FIOCRUZ (Brazil&rsquo;s national disease surveillance authority).
              </p>
            </div>
          </ScrollReveal>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { stat: 'r = 0.489', label: 'at 10–11 weeks lead time', body: 'Correlation between weather signal and dengue outbreaks. 2,610 weeks of real data from Brazil\'s FIOCRUZ. Statistically significant at p<0.001.', delay: 0 },
              { stat: 'AUC 0.75',  label: 'on held-out test data',    body: 'Climate-only model — no surveillance data needed. Proper temporal split: trained 2014–2020, tested 2021–2023.', delay: 100 },
              { stat: '11 of 14',  label: 'cities beat random chance', body: 'Cross-validated by leaving entire countries out. Signal generalises across Brazil, Peru, Colombia, Taiwan, and Philippines.', delay: 200 },
            ].map(({ stat, label, body, delay }) => (
              <ScrollReveal key={stat} delay={delay} className="rounded-2xl p-8 space-y-3 border" style={{ background: '#fef5ef', borderColor: '#f5cac3' }}>
                <div className="text-3xl font-bold" style={{ color: '#c05060' }}>{stat}</div>
                <div className="text-sm font-semibold" style={{ color: '#1a1214' }}>{label}</div>
                <div className="text-sm leading-relaxed" style={{ color: '#3d3035' }}>{body}</div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────────────────── */}
      <section id="enroll" aria-labelledby="enroll-heading" className="w-full py-24 px-6 md:px-12 lg:px-20" style={{ background: '#f5cac3' }}>
        <div className="w-full max-w-2xl mx-auto text-center space-y-8">
          <ScrollReveal>
            <h2 id="enroll-heading" className="text-3xl md:text-4xl font-bold" style={{ color: '#1a1214' }}>
              Get an early warning<br />for your district.
            </h2>
          </ScrollReveal>
          <ScrollReveal delay={100}>
            <p className="text-base leading-relaxed" style={{ color: '#3d3035' }}>
              Free. No app. Works on any phone — including basic feature phones.
              Enter any village, town, or district in the 26 monitored countries.
            </p>
          </ScrollReveal>
          <ScrollReveal delay={200}>
            <EnrollmentWidget />
          </ScrollReveal>
          <ScrollReveal delay={300}>
            <p className="text-xs" style={{ color: '#5c4f55' }}>
              Alerts arrive by SMS, WhatsApp, or USSD (*384#) — in English and your local language.
            </p>
          </ScrollReveal>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────────────── */}
      <footer className="w-full px-6 md:px-12 lg:px-20 py-10 border-t" style={{ background: '#f7ede2', borderColor: '#f5cac3' }}>
        <div className="w-full max-w-screen-xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-xs" style={{ color: '#5c4f55' }}>
          <span>© 2026 Bzzt — Autonomous mosquito-borne disease early warning</span>
          <div className="flex items-center gap-4 flex-wrap justify-center">
            <span>Open-Meteo · OpenDengue · WHO · GADM</span>
            <Link href="/dashboard" className="hover:underline focus:outline-none focus:underline" style={{ color: '#3d3035' }}>Intelligence map</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
