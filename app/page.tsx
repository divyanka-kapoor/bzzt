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

      {/* Skip link for accessibility */}
      <a href="#enroll" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:bg-white focus:text-black focus:px-4 focus:py-2 focus:rounded-lg text-sm font-medium">
        Skip to enrollment
      </a>

      {/* ── NAV ─────────────────────────────────────────────────────────────── */}
      <nav aria-label="Main navigation" className="w-full px-6 md:px-12 lg:px-20 py-6 flex items-center justify-between">
        <span className="text-lg font-bold tracking-tight text-white">Bzzt</span>
        <div className="flex items-center gap-6">
          <Link href="/lookup" className="text-sm text-white/50 hover:text-white transition-colors focus:outline-none focus:underline">
            Check your risk
          </Link>
          <Link href="/dashboard" className="text-sm text-white/50 hover:text-white transition-colors focus:outline-none focus:underline">
            See the map
          </Link>
        </div>
      </nav>

      {/* ── HERO ─────────────────────────────────────────────────────────────── */}
      <section
        aria-labelledby="hero-heading"
        className="w-full min-h-[90vh] flex flex-col justify-center px-6 md:px-12 lg:px-20 pt-8 pb-24"
        style={{ background: 'radial-gradient(ellipse 80% 60% at 50% 0%, #1a0a0a 0%, #06090F 70%)' }}
      >
        <div className="w-full max-w-screen-xl mx-auto">
          <p className="text-sm font-semibold uppercase tracking-widest text-[#FF6B6B]/60 mb-8">
            Bzzt — Disease Early Warning
          </p>
          <h1 id="hero-heading" className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold tracking-tight leading-[1.05] mb-10">
            A child dies from<br />
            malaria{' '}
            <span className="text-[#FF6B6B]">every minute.</span>
          </h1>
          <p className="text-xl md:text-2xl text-white/50 max-w-2xl leading-relaxed font-light mb-16">
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
              className="inline-flex items-center gap-2 bg-white/[0.06] hover:bg-white/[0.1] border border-white/10 text-white/80 font-semibold text-sm px-6 py-3 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-white/30 focus:ring-offset-2 focus:ring-offset-[#06090F]"
            >
              See the intelligence map →
            </Link>
          </div>
        </div>
      </section>

      {/* ── THE NUMBERS ─────────────────────────────────────────────────────── */}
      <section aria-label="Key statistics" className="w-full bg-[#0A1220] py-20 px-6 md:px-12 lg:px-20">
        <div className="w-full max-w-screen-xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-0 divide-y md:divide-y-0 md:divide-x divide-white/[0.08]">
            {[
              { n: '597,000', sub: 'malaria deaths in 2023', note: 'WHO World Malaria Report 2024' },
              { n: '74%',     sub: 'are children under five', note: 'Malaria is the leading infectious killer of young children' },
              { n: '10 weeks', sub: 'warning in the weather', note: 'Before a single case reaches a health authority' },
            ].map(({ n, sub, note }, i) => (
              <ScrollReveal key={n} delay={i * 100} className="py-10 md:py-0 md:px-12 first:pl-0 last:pr-0">
                <div className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-2 tracking-tight">{n}</div>
                <div className="text-base font-medium text-white/70 mb-1">{sub}</div>
                <div className="text-xs text-white/30">{note}</div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── THE STORY ───────────────────────────────────────────────────────── */}
      <section aria-labelledby="story-heading" className="w-full py-24 px-6 md:px-12 lg:px-20">
        <div className="w-full max-w-screen-xl mx-auto">
          <ScrollReveal>
            <p className="text-xs font-semibold uppercase tracking-widest text-white/30 mb-6">The problem</p>
            <h2 id="story-heading" className="text-3xl md:text-4xl lg:text-5xl font-bold text-white leading-tight max-w-4xl mb-20">
              It&rsquo;s not that the information doesn&rsquo;t exist.
              It&rsquo;s that it never reaches the people who need it.
            </h2>
          </ScrollReveal>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-1">
            {[
              {
                title: 'Warnings exist — but only for cities',
                body: 'National health agencies monitor disease in hospitals and capitals. But the communities with the highest burden — rural northern Nigeria, Odisha\'s forests, the Chittagong Hill Tracts in Bangladesh — have no surveillance at all. If an outbreak starts there, nobody knows until the hospital fills up.',
              },
              {
                title: 'By then, it\'s already too late',
                body: 'A district health officer learns about an outbreak from the hospital, not from a prediction. At that point, the mosquitoes have been breeding for weeks. There\'s no time left to get medicines in, run spray programmes, or warn families to eliminate standing water around their homes.',
              },
              {
                title: 'The signal was in the weather the whole time',
                body: 'Mosquito breeding depends on rainfall, temperature, and humidity. When those conditions are right, an outbreak follows 10–14 weeks later — consistently, across dozens of countries, across decades of data. That signal is freely available, updated every day, for every district on earth.',
              },
              {
                title: 'Nobody is acting on it for the communities that matter most',
                body: 'Not for the community health worker in rural Nigeria who doesn\'t know the outbreak is coming. Not for the mother in Jharkhand whose child will be the first case. Not for the district officer who needs to requisition bed nets six weeks before they\'re needed.',
              },
            ].map(({ title, body }, i) => (
              <ScrollReveal key={title} delay={i * 80}>
                <div className="bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.06] rounded-2xl p-8 space-y-3 transition-colors h-full">
                  <h3 className="text-base font-semibold text-white/90">{title}</h3>
                  <p className="text-sm text-white/45 leading-relaxed">{body}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── PULL QUOTE ──────────────────────────────────────────────────────── */}
      <section aria-label="Mission statement" className="w-full bg-[#FF6B6B]/[0.06] border-y border-[#FF6B6B]/[0.15] py-20 px-6 md:px-12 lg:px-20">
        <div className="w-full max-w-screen-xl mx-auto">
          <ScrollReveal>
            <blockquote className="text-2xl md:text-3xl lg:text-4xl font-light text-white/80 leading-snug max-w-4xl">
              &ldquo;Bzzt reads the weather signal ten weeks ahead and sends a free warning
              to the people at risk — before the first child gets sick.&rdquo;
            </blockquote>
          </ScrollReveal>
        </div>
      </section>

      {/* ── HOW IT WORKS ────────────────────────────────────────────────────── */}
      <section aria-labelledby="how-heading" className="w-full py-24 px-6 md:px-12 lg:px-20 bg-[#0A1220]">
        <div className="w-full max-w-screen-xl mx-auto">
          <ScrollReveal>
            <p className="text-xs font-semibold uppercase tracking-widest text-white/30 mb-6">How it works</p>
            <h2 id="how-heading" className="text-3xl md:text-4xl font-bold text-white max-w-2xl mb-16">
              Three steps. Fully automated. Running every night.
            </h2>
          </ScrollReveal>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-16">
            {[
              {
                n: '01',
                color: '#74C0FC',
                title: 'Read the weather',
                body: 'Every night, Bzzt fetches temperature, rainfall, and humidity data for every monitored district — going back 90 days to catch the signal that matters most: what the weather was doing 10 weeks ago, when the mosquitoes started breeding.',
              },
              {
                n: '02',
                color: '#FCC419',
                title: 'Score the risk',
                body: 'A model trained on 1.1 million real outbreak records from 102 countries converts those weather signals into an outbreak probability. Rising Google searches for fever symptoms and field reports from community health workers boost the alert in real time.',
              },
              {
                n: '03',
                color: '#51CF66',
                title: 'Send the warning',
                body: 'High-risk districts get an early warning — by SMS to any phone, by WhatsApp where it\'s common, or by USSD for feature phones with no data plan at all. Bilingual: English plus the local language of that district.',
              },
            ].map(({ n, color, title, body }, i) => (
              <ScrollReveal key={n} delay={i * 100} className="space-y-5">
                <div className="text-4xl font-bold" style={{ color }} aria-hidden="true">{n}</div>
                <h3 className="text-lg font-semibold text-white">{title}</h3>
                <p className="text-sm text-white/45 leading-relaxed">{body}</p>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── WHO GETS WARNED ─────────────────────────────────────────────────── */}
      <section aria-labelledby="reach-heading" className="w-full py-24 px-6 md:px-12 lg:px-20">
        <div className="w-full max-w-screen-xl mx-auto">
          <ScrollReveal>
            <p className="text-xs font-semibold uppercase tracking-widest text-white/30 mb-6">Who it reaches</p>
            <h2 id="reach-heading" className="text-3xl md:text-4xl font-bold text-white max-w-2xl mb-16">
              Designed for the people without access to existing warning systems.
            </h2>
          </ScrollReveal>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: '🏥',
                who: 'Community health workers',
                body: 'Receive a 10-week early warning before cases arrive. Enough time to mobilise, educate households, and eliminate breeding sites. Can also report fever clusters back via a simple phone menu — their field reports improve the model for everyone.',
              },
              {
                icon: '🏛️',
                who: 'District health officers',
                body: 'An alert 10 weeks ahead is enough time to requisition medicines, pre-position bed nets, and schedule spray campaigns — before the hospital fills up. The intelligence map shows every district in the country, ranked by risk.',
              },
              {
                icon: '👨‍👩‍👧',
                who: 'Families',
                body: 'A free SMS to any phone in the local language. No smartphone, no app, no internet required. A $15 feature phone is enough. The message tells you what the risk is and what to do about it — eliminate standing water, use repellent, watch for fever.',
              },
            ].map(({ icon, who, body }, i) => (
              <ScrollReveal key={who} delay={i * 100}>
                <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-8 space-y-4 h-full">
                  <div className="text-3xl" role="img" aria-label={who}>{icon}</div>
                  <h3 className="text-base font-semibold text-white">{who}</h3>
                  <p className="text-sm text-white/45 leading-relaxed">{body}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── PROOF ───────────────────────────────────────────────────────────── */}
      <section aria-labelledby="proof-heading" className="w-full py-24 px-6 md:px-12 lg:px-20 bg-[#0A1220]">
        <div className="w-full max-w-screen-xl mx-auto">
          <ScrollReveal>
            <p className="text-xs font-semibold uppercase tracking-widest text-white/30 mb-6">Does it work?</p>
            <h2 id="proof-heading" className="text-3xl md:text-4xl font-bold text-white max-w-2xl mb-16">
              Validated against 10 years of real outbreak data. Not simulations.
            </h2>
          </ScrollReveal>

          {/* Visual lag correlation */}
          <ScrollReveal delay={100} className="mb-16">
            <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-8 md:p-10 max-w-3xl">
              <h3 className="text-sm font-semibold text-white/70 mb-8">
                How far ahead does the weather signal appear before cases peak?
              </h3>
              <div className="space-y-3" role="img" aria-label="Bar chart showing correlation strength at different lag times, peaking at 10-11 weeks">
                {[
                  { lag: '4 weeks',  r: 0.363 },
                  { lag: '6 weeks',  r: 0.419 },
                  { lag: '8 weeks',  r: 0.451 },
                  { lag: '10 weeks', r: 0.489, peak: true },
                  { lag: '11 weeks', r: 0.489, peak: true },
                  { lag: '12 weeks', r: 0.482 },
                ].map(({ lag, r, peak }) => (
                  <div key={lag} className="flex items-center gap-4">
                    <div className="text-xs text-white/30 w-16 shrink-0 text-right">{lag}</div>
                    <div className="flex-1 bg-white/[0.06] rounded-full h-2.5 overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${r * 195}%`, background: peak ? '#FF6B6B' : '#74C0FC', opacity: peak ? 1 : 0.5 }}
                      />
                    </div>
                    {peak && (
                      <span className="text-xs text-[#FF6B6B] font-semibold shrink-0">← 10 weeks ahead</span>
                    )}
                  </div>
                ))}
              </div>
              <p className="text-xs text-white/25 mt-6">
                Correlation between weather signal and dengue cases at each lag. 2,610 weeks of surveillance data, Brazil. Source: FIOCRUZ / InfoDengue.
              </p>
            </div>
          </ScrollReveal>

          {/* Real-world example */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            <ScrollReveal delay={100} className="lg:col-span-3">
              <div className="bg-[#FF6B6B]/[0.07] border border-[#FF6B6B]/20 rounded-2xl p-8 h-full space-y-4">
                <div className="text-xs font-semibold uppercase tracking-widest text-[#FF6B6B]/70">Real example — Delhi, May 2026</div>
                <p className="text-base text-white/70 leading-relaxed">
                  Bzzt flagged Delhi as high-watch based on rising online searches for fever symptoms.
                  Three days later, Delhi&rsquo;s city health authority confirmed the
                  highest April dengue count in five years — up 24% from the year before.
                  Bzzt caught it before the official report.
                </p>
              </div>
            </ScrollReveal>
            <ScrollReveal delay={200} className="lg:col-span-2 grid grid-cols-1 gap-6">
              <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6 space-y-2">
                <div className="text-2xl font-bold text-white">26 countries</div>
                <div className="text-sm text-white/50">monitored daily — state and district level</div>
              </div>
              <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6 space-y-2">
                <div className="text-2xl font-bold text-white">2,400+ districts</div>
                <div className="text-sm text-white/50">scored every night at 2am UTC</div>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────────────────────── */}
      <section
        id="enroll"
        aria-labelledby="enroll-heading"
        className="w-full py-24 px-6 md:px-12 lg:px-20"
        style={{ background: 'radial-gradient(ellipse 80% 60% at 50% 100%, #1a0a0a 0%, #06090F 70%)' }}
      >
        <div className="w-full max-w-screen-xl mx-auto">
          <div className="max-w-2xl mx-auto text-center space-y-8">
            <ScrollReveal>
              <h2 id="enroll-heading" className="text-3xl md:text-4xl font-bold text-white">
                Get an early warning<br />for your district.
              </h2>
            </ScrollReveal>
            <ScrollReveal delay={100}>
              <p className="text-base text-white/40 leading-relaxed">
                Free. No app. Works on any phone — including basic feature phones.
                Enter any village, town, or district anywhere in the 26 monitored countries.
              </p>
            </ScrollReveal>
            <ScrollReveal delay={200}>
              <EnrollmentWidget />
            </ScrollReveal>
            <ScrollReveal delay={300}>
              <p className="text-xs text-white/25">
                Alerts arrive by SMS, WhatsApp, or USSD (*384#) — in English and your local language.
              </p>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────────────────── */}
      <footer className="w-full border-t border-white/[0.06] px-6 md:px-12 lg:px-20 py-10">
        <div className="w-full max-w-screen-xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-white/25">
          <span>© 2026 Bzzt — Autonomous mosquito-borne disease early warning</span>
          <div className="flex items-center gap-4 flex-wrap justify-center">
            <span>Open-Meteo · OpenDengue · WHO · GADM</span>
            <Link href="/dashboard" className="text-white/40 hover:text-white/60 transition-colors focus:outline-none focus:underline">
              Intelligence map
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
