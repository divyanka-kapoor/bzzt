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
    <main id="main-content" className="min-h-screen bg-[#06090F] text-white overflow-x-hidden">

      <a href="#enroll" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:bg-white focus:text-black focus:px-4 focus:py-2 focus:rounded-lg text-sm font-medium">
        Skip to enrollment
      </a>

      {/* ── NAV ─────────────────────────────────────────────────────────── */}
      <nav aria-label="Main navigation" className="w-full px-6 md:px-12 lg:px-20 py-6 flex items-center justify-between">
        <span className="text-lg font-bold tracking-tight text-white">Bzzt</span>
        <div className="flex items-center gap-6">
          <Link href="/lookup" className="text-sm text-white/70 hover:text-white transition-colors focus:outline-none focus:underline">Check your risk</Link>
          <Link href="/dashboard" className="text-sm text-white/70 hover:text-white transition-colors focus:outline-none focus:underline">See the map</Link>
        </div>
      </nav>

      {/* ── HERO ────────────────────────────────────────────────────────── */}
      <section
        aria-labelledby="hero-heading"
        className="w-full min-h-[90vh] flex flex-col justify-center px-6 md:px-12 lg:px-20 pt-8 pb-24"
        style={{ background: 'radial-gradient(ellipse 80% 60% at 50% 0%, #1a0a0a 0%, #06090F 70%)' }}
      >
        <div className="w-full max-w-screen-xl mx-auto">
          <p className="text-sm font-semibold uppercase tracking-widest text-[#FF6B6B] mb-8">
            Bzzt — Disease Early Warning
          </p>
          <h1 id="hero-heading" className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold tracking-tight leading-[1.05] mb-10">
            A child dies from<br />
            malaria{' '}
            <span className="text-[#FF6B6B]">every minute.</span>
          </h1>
          <p className="text-xl md:text-2xl text-white/75 max-w-2xl leading-relaxed font-light mb-16">
            The conditions that cause that outbreak were visible in the weather
            ten weeks earlier. Nobody sent a warning.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link
              href="#enroll"
              className="inline-flex items-center gap-2 bg-[#FF6B6B] hover:bg-[#ff5252] text-white font-semibold text-sm px-6 py-3 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#FF6B6B] focus:ring-offset-2 focus:ring-offset-[#06090F]"
            >
              Get free alerts for your district
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 bg-white/[0.08] hover:bg-white/[0.12] border border-white/20 text-white font-semibold text-sm px-6 py-3 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-white/30 focus:ring-offset-2 focus:ring-offset-[#06090F]"
            >
              See the intelligence map →
            </Link>
          </div>
        </div>
      </section>

      {/* ── KEY NUMBERS + DELHI EXAMPLE ─────────────────────────────────── */}
      <section aria-label="Key statistics and real-world validation" className="w-full bg-[#0A1220] py-20 px-6 md:px-12 lg:px-20">
        <div className="w-full max-w-screen-xl mx-auto space-y-16">

          {/* Stats row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-0 divide-y md:divide-y-0 md:divide-x divide-white/[0.08]">
            {[
              { n: '597,000', sub: 'malaria deaths in 2023', note: 'Source: WHO World Malaria Report 2024' },
              { n: '74%',     sub: 'are children under five', note: 'Malaria is the leading infectious killer of young children globally' },
              { n: '10 weeks', sub: 'warning in the weather', note: 'Before a single case is reported to a health authority' },
            ].map(({ n, sub, note }, i) => (
              <ScrollReveal key={n} delay={i * 100} className="py-10 md:py-0 md:px-12 first:pl-0 last:pr-0">
                <div className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-2 tracking-tight">{n}</div>
                <div className="text-base font-semibold text-white/80 mb-1">{sub}</div>
                <div className="text-xs text-white/55">{note}</div>
              </ScrollReveal>
            ))}
          </div>

          {/* Delhi real-world example — honest version */}
          <ScrollReveal delay={200}>
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              <div className="lg:col-span-3 bg-[#FF6B6B]/[0.08] border border-[#FF6B6B]/25 rounded-2xl p-8 space-y-4">
                <div className="text-xs font-bold uppercase tracking-widest text-[#FF6B6B]">
                  Signal validated — Delhi, May 2026
                </div>
                <p className="text-base text-white/85 leading-relaxed">
                  Bzzt flagged Delhi as elevated dengue risk based on rising symptom searches
                  and climate conditions. Delhi&rsquo;s Municipal Corporation subsequently
                  confirmed the highest April dengue case count in five years —
                  52 cases, up 24% from the previous April. The Bzzt signal and the
                  official case report were in agreement.
                </p>
                <p className="text-xs text-white/55">
                  Source: Business Standard · MCD municipal surveillance data · May 2026
                </p>
              </div>
              <div className="lg:col-span-2 grid grid-cols-1 gap-6">
                <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-6 space-y-2">
                  <div className="text-2xl font-bold text-white">26 countries</div>
                  <div className="text-sm text-white/70">monitored daily at state and district level</div>
                </div>
                <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-6 space-y-2">
                  <div className="text-2xl font-bold text-white">2,600+ districts</div>
                  <div className="text-sm text-white/70">in the database — India, Nigeria, Kenya, Bangladesh at full district level</div>
                </div>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ── WHY IT KEEPS HAPPENING ──────────────────────────────────────── */}
      <section aria-labelledby="problem-heading" className="w-full py-24 px-6 md:px-12 lg:px-20">
        <div className="w-full max-w-screen-xl mx-auto">
          <ScrollReveal>
            <p className="text-xs font-bold uppercase tracking-widest text-white/55 mb-6">The problem</p>
            <h2 id="problem-heading" className="text-3xl md:text-4xl lg:text-5xl font-bold text-white leading-tight max-w-4xl mb-20">
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
                body: 'A district health officer learns about an outbreak from the hospital, not from a prediction. At that point, the mosquitoes have been breeding for weeks. There\'s no time to get medicines in, run spray programmes, or warn families to eliminate standing water around their homes.',
              },
              {
                n: '03',
                title: 'The signal was in the weather the whole time',
                body: 'Mosquito breeding depends on rainfall, temperature, and humidity. When those conditions are right, an outbreak follows 10–14 weeks later — consistently, across dozens of countries, across decades of data. That signal is freely available, updated daily, for every district on earth.',
              },
              {
                n: '04',
                title: 'Nobody is acting on it for the communities that matter most',
                body: 'Not for the community health worker in rural Nigeria who doesn\'t know the outbreak is coming. Not for the mother in Jharkhand whose child will be the first case. Not for the district officer who needs to order bed nets six weeks before they\'re needed.',
              },
            ].map(({ n, title, body }, i) => (
              <ScrollReveal key={n} delay={i * 80}>
                <div className="bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.08] rounded-2xl p-8 space-y-3 transition-colors h-full">
                  <div className="text-xs font-mono text-white/40">{n}</div>
                  <h3 className="text-base font-semibold text-white">{title}</h3>
                  <p className="text-sm text-white/70 leading-relaxed">{body}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── PULL QUOTE ──────────────────────────────────────────────────── */}
      <section aria-label="Mission" className="w-full bg-[#FF6B6B]/[0.06] border-y border-[#FF6B6B]/[0.15] py-20 px-6 md:px-12 lg:px-20">
        <div className="w-full max-w-screen-xl mx-auto">
          <ScrollReveal>
            <blockquote className="text-2xl md:text-3xl lg:text-4xl font-light text-white leading-snug max-w-4xl">
              &ldquo;Bzzt reads the weather signal ten weeks ahead and sends a free warning
              to the people at risk — before the first child gets sick.&rdquo;
            </blockquote>
          </ScrollReveal>
        </div>
      </section>

      {/* ── HOW IT WORKS ────────────────────────────────────────────────── */}
      <section aria-labelledby="how-heading" className="w-full py-24 px-6 md:px-12 lg:px-20 bg-[#0A1220]">
        <div className="w-full max-w-screen-xl mx-auto">
          <ScrollReveal>
            <p className="text-xs font-bold uppercase tracking-widest text-white/55 mb-6">How it works</p>
            <h2 id="how-heading" className="text-3xl md:text-4xl font-bold text-white max-w-2xl mb-16">
              Three steps. Fully automated. Running every night.
            </h2>
          </ScrollReveal>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-16">
            {[
              {
                color: '#74C0FC',
                n: '01',
                title: 'Read the weather',
                body: 'Every night, Bzzt fetches temperature, rainfall, and humidity data for every monitored district. The key signal is what the weather was doing 10 weeks ago — when the mosquitoes started breeding.',
              },
              {
                color: '#FCC419',
                n: '02',
                title: 'Score the risk',
                body: 'A model trained on 1.1 million real outbreak records from 102 countries turns those weather signals into an outbreak probability. Real-time search trends and field reports from community health workers boost the alert.',
              },
              {
                color: '#51CF66',
                n: '03',
                title: 'Send the warning',
                body: 'High-risk districts get an early warning — by SMS, WhatsApp, or USSD for feature phones with no data plan. Bilingual: English plus the local language of the district.',
              },
            ].map(({ n, color, title, body }, i) => (
              <ScrollReveal key={n} delay={i * 100} className="space-y-5">
                <div className="text-4xl font-bold" style={{ color }} aria-hidden="true">{n}</div>
                <h3 className="text-lg font-semibold text-white">{title}</h3>
                <p className="text-sm text-white/70 leading-relaxed">{body}</p>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── WHO GETS WARNED ─────────────────────────────────────────────── */}
      <section aria-labelledby="reach-heading" className="w-full py-24 px-6 md:px-12 lg:px-20">
        <div className="w-full max-w-screen-xl mx-auto">
          <ScrollReveal>
            <p className="text-xs font-bold uppercase tracking-widest text-white/55 mb-6">Who it reaches</p>
            <h2 id="reach-heading" className="text-3xl md:text-4xl font-bold text-white max-w-2xl mb-16">
              Designed for the people without access to existing warning systems.
            </h2>
          </ScrollReveal>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: '🏥',
                label: 'Community health workers',
                body: 'Receive a 10-week early warning before cases arrive — enough time to mobilise, educate households, and eliminate breeding sites. Can submit fever cluster reports via a simple phone menu.',
              },
              {
                icon: '🏛️',
                label: 'District health officers',
                body: 'An alert 10 weeks ahead is enough time to requisition medicines, pre-position bed nets, and schedule spray campaigns — before the hospital fills up.',
              },
              {
                icon: '👨‍👩‍👧',
                label: 'Families',
                body: 'A free SMS in the local language to any phone. No smartphone needed. No app. No internet. A basic phone is enough. The message tells you the risk level and what to do.',
              },
            ].map(({ icon, label, body }, i) => (
              <ScrollReveal key={label} delay={i * 100}>
                <div className="bg-white/[0.02] border border-white/[0.08] rounded-2xl p-8 space-y-4 h-full">
                  <div className="text-3xl" role="img" aria-label="">{icon}</div>
                  <h3 className="text-base font-semibold text-white">{label}</h3>
                  <p className="text-sm text-white/70 leading-relaxed">{body}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── PROOF ───────────────────────────────────────────────────────── */}
      <section aria-labelledby="proof-heading" className="w-full py-24 px-6 md:px-12 lg:px-20 bg-[#0A1220]">
        <div className="w-full max-w-screen-xl mx-auto">
          <ScrollReveal>
            <p className="text-xs font-bold uppercase tracking-widest text-white/55 mb-6">The science</p>
            <h2 id="proof-heading" className="text-3xl md:text-4xl font-bold text-white max-w-2xl mb-16">
              Validated against 10 years of real outbreak data — not simulations.
            </h2>
          </ScrollReveal>

          <ScrollReveal delay={100} className="mb-12">
            <div className="bg-white/[0.02] border border-white/[0.08] rounded-2xl p-8 md:p-10 max-w-3xl">
              <h3 className="text-sm font-semibold text-white/80 mb-8">
                How far ahead does the weather signal appear before cases peak?
              </h3>
              <div className="space-y-3" role="img" aria-label="Bar chart: correlation between weather signal and dengue cases at 4, 6, 8, 10, 11, and 12 weeks lag. Peaks at 10-11 weeks.">
                {[
                  { lag: '4 wks',  r: 0.363 },
                  { lag: '6 wks',  r: 0.419 },
                  { lag: '8 wks',  r: 0.451 },
                  { lag: '10 wks', r: 0.489, peak: true },
                  { lag: '11 wks', r: 0.489, peak: true },
                  { lag: '12 wks', r: 0.482 },
                ].map(({ lag, r, peak }) => (
                  <div key={lag} className="flex items-center gap-4">
                    <div className="text-xs text-white/55 w-14 shrink-0 text-right">{lag}</div>
                    <div className="flex-1 bg-white/[0.06] rounded-full h-2.5 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${r * 195}%`, background: peak ? '#FF6B6B' : '#74C0FC', opacity: peak ? 1 : 0.6 }}
                      />
                    </div>
                    {peak
                      ? <span className="text-xs text-[#FF6B6B] font-bold shrink-0 w-28">r={r} ← peak</span>
                      : <span className="text-xs text-white/40 shrink-0 w-28">r={r}</span>
                    }
                  </div>
                ))}
              </div>
              <p className="text-xs text-white/50 mt-6">
                Spearman correlation, São Paulo 2014–2023, n=2,610 weeks. p&lt;0.001 at all lags shown.
                Source: InfoDengue / FIOCRUZ (Brazil&rsquo;s national disease surveillance authority).
              </p>
            </div>
          </ScrollReveal>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                stat: 'r = 0.489',
                label: 'at 10–11 weeks lead time',
                body: 'Correlation between weather signal and dengue outbreaks, validated against Brazil\'s national disease authority data.',
                delay: 0,
              },
              {
                stat: 'AUC 0.75',
                label: 'on held-out test data',
                body: 'Climate-only model — no surveillance data required. Proper temporal split: trained on 2014–2020, tested on 2021–2023.',
                delay: 100,
              },
              {
                stat: '11 of 14',
                label: 'cities beat random chance',
                body: 'Cross-validated by leaving entire countries out. Climate signal generalises across Brazil, Peru, Colombia, Taiwan, and Philippines.',
                delay: 200,
              },
            ].map(({ stat, label, body, delay }) => (
              <ScrollReveal key={stat} delay={delay} className="bg-white/[0.02] border border-white/[0.08] rounded-2xl p-8 space-y-3">
                <div className="text-3xl font-bold text-white">{stat}</div>
                <div className="text-sm font-semibold text-white/80">{label}</div>
                <div className="text-sm text-white/65 leading-relaxed">{body}</div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────────────────── */}
      <section
        id="enroll"
        aria-labelledby="enroll-heading"
        className="w-full py-24 px-6 md:px-12 lg:px-20"
        style={{ background: 'radial-gradient(ellipse 80% 60% at 50% 100%, #1a0a0a 0%, #06090F 70%)' }}
      >
        <div className="w-full max-w-2xl mx-auto text-center space-y-8">
          <ScrollReveal>
            <h2 id="enroll-heading" className="text-3xl md:text-4xl font-bold text-white">
              Get an early warning<br />for your district.
            </h2>
          </ScrollReveal>
          <ScrollReveal delay={100}>
            <p className="text-base text-white/70 leading-relaxed">
              Free. No app. Works on any phone — including basic feature phones.
              Enter any village, town, or district in the 26 monitored countries.
            </p>
          </ScrollReveal>
          <ScrollReveal delay={200}>
            <EnrollmentWidget />
          </ScrollReveal>
          <ScrollReveal delay={300}>
            <p className="text-xs text-white/55">
              Alerts arrive by SMS, WhatsApp, or USSD (*384#) — in English and your local language.
            </p>
          </ScrollReveal>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────────────── */}
      <footer className="w-full border-t border-white/[0.08] px-6 md:px-12 lg:px-20 py-10">
        <div className="w-full max-w-screen-xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-white/55">
          <span>© 2026 Bzzt — Autonomous mosquito-borne disease early warning</span>
          <div className="flex items-center gap-4 flex-wrap justify-center">
            <span>Open-Meteo · OpenDengue · WHO · GADM</span>
            <Link href="/dashboard" className="text-white/70 hover:text-white transition-colors focus:outline-none focus:underline">
              Intelligence map
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
