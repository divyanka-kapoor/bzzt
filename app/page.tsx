import type { Metadata } from 'next';
import EnrollmentWidget from '@/components/EnrollmentWidget';
import ScrollReveal from '@/components/ScrollReveal';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Bzzt — Disease Early Warning',
  description: 'Dengue and malaria outbreaks predicted 10 weeks before they happen. Free SMS alerts for any district.',
};

export default function Home() {
  return (
    <main id="main-content" className="overflow-x-hidden" style={{ background: '#1d3d35', color: '#ffffff' }}>

      <a href="#enroll"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:rounded-lg focus:text-sm focus:font-medium"
        style={{ background: '#ffffff', color: '#1d3d35' }}>
        Skip to enrollment
      </a>

      {/* ── NAV ─────────────────────────────────────────────────────────── */}
      <nav aria-label="Main navigation"
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 md:px-16 py-5"
        style={{ background: 'rgba(29,61,53,0.92)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <span className="text-base font-bold tracking-tight" style={{ color: '#ffffff' }}>Bzzt</span>
        <div className="flex items-center gap-8">
          <Link href="/lookup" className="text-sm font-medium focus:outline-none focus:underline" style={{ color: 'rgba(255,255,255,0.6)' }}>Check your risk</Link>
          <Link href="/dashboard" className="text-sm font-medium focus:outline-none focus:underline" style={{ color: 'rgba(255,255,255,0.6)' }}>See the map</Link>
        </div>
      </nav>

      {/* ── SECTION 1: HERO ─────────────────────────────────────────────── */}
      <section
        aria-labelledby="hero-heading"
        className="relative min-h-screen flex flex-col justify-center px-8 md:px-16 lg:px-24 pt-32 pb-24 overflow-hidden"
        style={{ background: '#1d3d35' }}
      >
        {/* Mosquito illustration — white line art, screen blend removes black bg */}
        <div className="absolute inset-0 flex items-center justify-end pointer-events-none select-none" aria-hidden="true">
          <img
            src="/mosquito.png"
            alt=""
            className="w-[55%] max-w-3xl opacity-15 object-contain"
            style={{ mixBlendMode: 'screen', filter: 'brightness(1.5)' }}
          />
        </div>

        <div className="relative z-10 max-w-screen-xl mx-auto w-full">
          <ScrollReveal>
            <p className="text-xs font-bold uppercase tracking-[0.25em] mb-10" style={{ color: 'rgba(255,255,255,0.35)' }}>
              Bzzt — Disease Early Warning
            </p>
          </ScrollReveal>
          <ScrollReveal delay={100}>
            <h1 id="hero-heading"
              className="text-[clamp(3rem,8vw,7rem)] font-bold tracking-tight leading-[1.02] mb-12"
              style={{ color: '#ffffff' }}>
              A child dies<br />
              from malaria<br />
              <span style={{ color: '#e85045' }}>every minute.</span>
            </h1>
          </ScrollReveal>
          <ScrollReveal delay={200}>
            <p className="text-xl md:text-2xl leading-relaxed max-w-xl mb-4" style={{ color: 'rgba(255,255,255,0.6)', fontWeight: 300 }}>
              Most disease alerts come after the outbreak has already started.
            </p>
            <p className="text-xl md:text-2xl leading-relaxed max-w-xl mb-16 font-semibold" style={{ color: '#ffffff' }}>
              Bzzt sends the warning 10 weeks before — using weather signals
              that no other community-level platform is reading.
            </p>
          </ScrollReveal>
          <ScrollReveal delay={300}>
            <div className="flex flex-wrap gap-4">
              <Link href="#enroll"
                className="inline-flex items-center font-semibold text-sm px-7 py-3.5 rounded-full hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-transparent transition-opacity"
                style={{ background: '#2d6b5a', color: '#ffffff' }}>
                Get free alerts for your district
              </Link>
              <Link href="/dashboard"
                className="inline-flex items-center font-semibold text-sm px-7 py-3.5 rounded-full hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-offset-2 transition-opacity border"
                style={{ background: 'transparent', color: 'rgba(255,255,255,0.85)', borderColor: 'rgba(255,255,255,0.35)' }}>
                See the intelligence map →
              </Link>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ── SECTION 2: THE NUMBERS ──────────────────────────────────────── */}
      <section aria-label="Key statistics" className="min-h-[85vh] flex flex-col justify-center px-8 md:px-16 lg:px-24 py-32"
        style={{ background: '#0f2420', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="max-w-screen-xl mx-auto w-full">
          <ScrollReveal>
            <p className="text-xs font-bold uppercase tracking-[0.25em] mb-20" style={{ color: 'rgba(255,255,255,0.35)' }}>The scale</p>
          </ScrollReveal>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-16 md:gap-8">
            {[
              { n: '597,000', sub: 'malaria deaths in 2023', note: 'WHO World Malaria Report 2024', delay: 0 },
              { n: '74%',     sub: 'are children under five', note: 'Malaria is the leading infectious killer of young children globally', delay: 150 },
              { n: '10 weeks', sub: 'ahead — in the weather', note: 'Before a single case reaches any health authority', delay: 300 },
            ].map(({ n, sub, note, delay }) => (
              <ScrollReveal key={n} delay={delay}>
                <div className="text-[clamp(2.5rem,5vw,4.5rem)] font-bold tracking-tight mb-4" style={{ color: '#e85045' }}>{n}</div>
                <div className="text-lg font-semibold mb-3" style={{ color: '#ffffff' }}>{sub}</div>
                <div className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.6)' }}>{note}</div>
              </ScrollReveal>
            ))}
          </div>

          {/* Delhi validation */}
          <ScrollReveal delay={200} className="mt-24">
            <div className="rounded-3xl p-10 md:p-12 max-w-3xl" style={{ background: '#2a5248' }}>
              <p className="text-xs font-bold uppercase tracking-[0.25em] mb-5" style={{ color: '#e85045' }}>
                Signal validated — Delhi, May 2026
              </p>
              <p className="text-lg leading-relaxed mb-4" style={{ color: 'rgba(255,255,255,0.85)' }}>
                Bzzt flagged Delhi as elevated dengue risk based on rising symptom searches
                and climate conditions. Delhi&rsquo;s Municipal Corporation subsequently
                confirmed the highest April dengue case count in five years —
                52 cases, up 24% year-on-year. The Bzzt signal and official case data were in agreement.
              </p>
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.6)' }}>
                Source: Business Standard · MCD surveillance data · May 2026
              </p>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ── SECTION 3: THE PROBLEM ──────────────────────────────────────── */}
      <section aria-labelledby="problem-heading" className="min-h-[90vh] flex flex-col justify-center px-8 md:px-16 lg:px-24 py-32"
        style={{ background: '#152e28' }}>
        <div className="max-w-screen-xl mx-auto w-full">
          <ScrollReveal>
            <p className="text-xs font-bold uppercase tracking-[0.25em] mb-12" style={{ color: 'rgba(255,255,255,0.35)' }}>The problem</p>
            <h2 id="problem-heading" className="text-[clamp(2rem,4.5vw,3.5rem)] font-bold leading-tight mb-20 max-w-3xl" style={{ color: '#ffffff' }}>
              It&rsquo;s not that the information doesn&rsquo;t exist. It&rsquo;s that it never reaches the people who need it.
            </h2>
          </ScrollReveal>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[
              { n: '01', title: 'Warnings exist — but only for cities', body: 'National health agencies monitor disease in hospitals and capitals. The communities with the highest burden — rural northern Nigeria, Odisha\'s forests in India, the Chittagong Hill Tracts in Bangladesh — have no surveillance at all.' },
              { n: '02', title: 'By the time they\'re reported, it\'s too late', body: 'A district health officer learns about an outbreak from the hospital, not a prediction. By then, the mosquitoes have been breeding for weeks. There\'s no time to get medicines in, run spray programmes, or warn families.' },
              { n: '03', title: 'The signal is in the weather — weeks earlier', body: 'Mosquito breeding depends on rainfall, temperature, and humidity. When those conditions are right, an outbreak follows 10–14 weeks later — consistently, across dozens of countries, across decades of data.' },
              { n: '04', title: 'Nobody is acting on it for the communities that matter', body: 'Not for the CHW in rural Nigeria. Not for the mother in Jharkhand whose child will be the first case. Not for the district officer who needs to order bed nets six weeks before they\'re needed.' },
            ].map(({ n, title, body }, i) => (
              <ScrollReveal key={n} delay={i * 80}>
                <div className="rounded-2xl p-8 h-full border" style={{ background: '#1d3d35', borderColor: 'rgba(255,255,255,0.08)' }}>
                  <div className="text-xs font-mono mb-4" style={{ color: 'rgba(255,255,255,0.35)' }}>{n}</div>
                  <h3 className="text-base font-semibold mb-3" style={{ color: '#ffffff' }}>{title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.85)' }}>{body}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTION 4: PULL QUOTE (full-bleed gold) ─────────────────────── */}
      <section aria-label="Mission statement" className="min-h-[50vh] flex items-center px-8 md:px-16 lg:px-24 py-32"
        style={{ background: '#e85045' }}>
        <div className="max-w-screen-xl mx-auto w-full">
          <ScrollReveal>
            <blockquote className="text-[clamp(1.75rem,3.5vw,3rem)] font-bold leading-snug max-w-4xl" style={{ color: '#ffffff' }}>
              &ldquo;Bzzt reads that signal 10 weeks ahead and delivers a free
              warning to communities — before any surveillance system sees
              the first case.&rdquo;
            </blockquote>
          </ScrollReveal>
        </div>
      </section>

      {/* ── SECTION 5: HOW IT WORKS ─────────────────────────────────────── */}
      <section aria-labelledby="how-heading" className="min-h-[90vh] flex flex-col justify-center px-8 md:px-16 lg:px-24 py-32"
        style={{ background: '#1d3d35' }}>
        <div className="max-w-screen-xl mx-auto w-full">
          <ScrollReveal>
            <p className="text-xs font-bold uppercase tracking-[0.25em] mb-12" style={{ color: 'rgba(255,255,255,0.35)' }}>How it works</p>
            <h2 id="how-heading" className="text-[clamp(2rem,4vw,3rem)] font-bold mb-20 max-w-2xl" style={{ color: '#ffffff' }}>
              Three steps. Fully automated. Running every night.
            </h2>
          </ScrollReveal>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
            {[
              { accent: '#e85045', bg: '#2a5248', n: '01', title: 'Read the weather', body: 'Every night, Bzzt fetches 90 days of temperature, rainfall, and humidity for every monitored district. The key signal is what the weather was doing 10 weeks ago — when the mosquitoes started breeding.' },
              { accent: '#c0963a', bg: '#2a4035', n: '02', title: 'Score the risk', body: 'A model trained on 1.1 million real outbreak records from 102 countries converts weather signals into an outbreak probability. Rising symptom search trends and CHW field reports boost the score.' },
              { accent: '#52b8a8', bg: '#1a3530', n: '03', title: 'Send the warning', body: 'High-risk districts get an early warning by SMS, WhatsApp, or USSD for feature phones with no data plan. Bilingual — English plus the local language of that district.' },
            ].map(({ n, accent, bg, title, body }, i) => (
              <ScrollReveal key={n} delay={i * 120} className="rounded-2xl p-10" style={{ background: bg }}>
                <div className="text-5xl font-bold mb-8" style={{ color: accent }}>{n}</div>
                <h3 className="text-lg font-bold mb-4" style={{ color: '#ffffff' }}>{title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.85)' }}>{body}</p>
              </ScrollReveal>
            ))}
          </div>

          {/* Who it reaches */}
          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { icon: '🏥', who: 'Community health workers', note: '10-week early warning — enough time to mobilise before cases arrive' },
              { icon: '🏛️', who: 'District health officers', note: 'Intelligence map showing every district, ranked by outbreak risk' },
              { icon: '👨‍👩‍👧', who: 'Families', note: 'Free SMS in local language — no smartphone, no app, no internet needed' },
            ].map(({ icon, who, note }, i) => (
              <ScrollReveal key={who} delay={i * 80}>
                <div className="rounded-xl p-6 flex gap-4 items-start border" style={{ background: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.08)' }}>
                  <span className="text-2xl shrink-0" role="img" aria-label={who}>{icon}</span>
                  <div>
                    <div className="text-sm font-semibold mb-1" style={{ color: '#ffffff' }}>{who}</div>
                    <div className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.6)' }}>{note}</div>
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTION 6: PROOF ────────────────────────────────────────────── */}
      <section aria-labelledby="proof-heading" className="min-h-[90vh] flex flex-col justify-center px-8 md:px-16 lg:px-24 py-32"
        style={{ background: '#152e28' }}>
        <div className="max-w-screen-xl mx-auto w-full">
          <ScrollReveal>
            <p className="text-xs font-bold uppercase tracking-[0.25em] mb-12" style={{ color: 'rgba(255,255,255,0.35)' }}>The science</p>
            <h2 id="proof-heading" className="text-[clamp(2rem,4vw,3rem)] font-bold mb-20 max-w-2xl" style={{ color: '#ffffff' }}>
              Validated against 10 years of real outbreak data. Not simulations.
            </h2>
          </ScrollReveal>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
            {/* Lag chart */}
            <ScrollReveal delay={100}>
              <div className="rounded-2xl p-10" style={{ background: '#1d3d35' }}>
                <h3 className="text-sm font-semibold mb-8" style={{ color: 'rgba(255,255,255,0.85)' }}>
                  How far ahead does the weather signal peak before cases do?
                </h3>
                <div className="space-y-4"
                  role="img"
                  aria-label="Bar chart: correlation between weather signal and dengue cases peaks at 10-11 weeks">
                  {[
                    { lag: '4 wks',  r: 0.363 },
                    { lag: '6 wks',  r: 0.419 },
                    { lag: '8 wks',  r: 0.451 },
                    { lag: '10 wks', r: 0.489, peak: true },
                    { lag: '11 wks', r: 0.489, peak: true },
                    { lag: '12 wks', r: 0.482 },
                  ].map(({ lag, r, peak }) => (
                    <div key={lag} className="flex items-center gap-5">
                      <div className="text-xs w-14 text-right shrink-0" style={{ color: 'rgba(255,255,255,0.6)' }}>{lag}</div>
                      <div className="flex-1 rounded-full h-3 overflow-hidden" style={{ background: '#2a5248' }}>
                        <div className="h-full rounded-full" style={{ width: `${r * 195}%`, background: peak ? '#e85045' : 'rgba(255,255,255,0.35)', opacity: peak ? 1 : 0.6 }} />
                      </div>
                      <div className="text-xs w-32 shrink-0 font-semibold" style={{ color: peak ? '#e85045' : 'rgba(255,255,255,0.6)' }}>
                        r = {r}{peak ? ' ← peak' : ''}
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-xs mt-8 leading-relaxed" style={{ color: 'rgba(255,255,255,0.6)' }}>
                  Spearman correlation, São Paulo 2014–2023, n = 2,610 weeks. p &lt; 0.001 at all lags shown.
                  Source: InfoDengue / FIOCRUZ — Brazil&rsquo;s national disease surveillance authority.
                </p>
              </div>
            </ScrollReveal>

            {/* Proof stats */}
            <div className="space-y-6">
              {[
                { stat: 'r = 0.489', label: 'Signal strength at 10–11 weeks', body: 'Correlation between climate conditions and dengue outbreaks, 10 weeks later. Statistically significant at p<0.001.', delay: 100 },
                { stat: 'AUC 0.75',  label: 'Model accuracy on test data', body: 'Climate-only model, trained 2014–2020, tested 2021–2023. No surveillance data needed anywhere in the world.', delay: 200 },
                { stat: '11 of 14',  label: 'Cities beat random chance', body: 'Cross-validated by holding out entire countries the model never trained on — across Brazil, Peru, Colombia, Taiwan, Philippines.', delay: 300 },
              ].map(({ stat, label, body, delay }) => (
                <ScrollReveal key={stat} delay={delay}>
                  <div className="rounded-2xl p-8 border" style={{ background: '#1d3d35', borderColor: 'rgba(255,255,255,0.08)' }}>
                    <div className="text-3xl font-bold mb-2" style={{ color: '#e85045' }}>{stat}</div>
                    <div className="text-sm font-semibold mb-2" style={{ color: '#ffffff' }}>{label}</div>
                    <div className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.85)' }}>{body}</div>
                  </div>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── SECTION 7: ENROLL ───────────────────────────────────────────── */}
      <section id="enroll" aria-labelledby="enroll-heading"
        className="min-h-[80vh] flex flex-col justify-center px-8 md:px-16 lg:px-24 py-32"
        style={{ background: '#2a5248' }}>
        <div className="max-w-screen-xl mx-auto w-full">
          <div className="max-w-2xl">
            <ScrollReveal>
              <p className="text-xs font-bold uppercase tracking-[0.25em] mb-10" style={{ color: '#e85045' }}>Get protected</p>
              <h2 id="enroll-heading" className="text-[clamp(2rem,4.5vw,3.5rem)] font-bold leading-tight mb-8" style={{ color: '#ffffff' }}>
                Get an early warning<br />for your district.
              </h2>
            </ScrollReveal>
            <ScrollReveal delay={100}>
              <p className="text-lg leading-relaxed mb-12" style={{ color: 'rgba(255,255,255,0.85)' }}>
                Free. No app. Works on any phone — including basic feature phones.
                Enter any village, town, or district in the 26 monitored countries.
              </p>
            </ScrollReveal>
            <ScrollReveal delay={200}>
              <EnrollmentWidget />
            </ScrollReveal>
            <ScrollReveal delay={300}>
              <p className="text-sm mt-8" style={{ color: 'rgba(255,255,255,0.6)' }}>
                Alerts by SMS, WhatsApp, or USSD (*384#) — in English and your local language.
              </p>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────────────── */}
      <footer className="px-8 md:px-16 lg:px-24 py-12 border-t" style={{ background: '#1d3d35', borderColor: '#2a5248' }}>
        <div className="max-w-screen-xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-6 text-xs" style={{ color: 'rgba(255,255,255,0.6)' }}>
          <div className="space-y-1">
            <div className="font-bold" style={{ color: '#ffffff' }}>Bzzt</div>
            <div>Autonomous mosquito-borne disease early warning · © 2026</div>
          </div>
          <div className="flex items-center gap-6 flex-wrap">
            <span>Data: Open-Meteo · OpenDengue · WHO · GADM</span>
            <Link href="/dashboard" className="font-medium hover:underline focus:outline-none focus:underline" style={{ color: 'rgba(255,255,255,0.85)' }}>Intelligence map</Link>
            <Link href="/lookup" className="font-medium hover:underline focus:outline-none focus:underline" style={{ color: 'rgba(255,255,255,0.85)' }}>Risk lookup</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
