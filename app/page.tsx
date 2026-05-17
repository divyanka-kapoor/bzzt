import type { Metadata } from 'next';
import EnrollmentWidget from '@/components/EnrollmentWidget';
import ScrollReveal from '@/components/ScrollReveal';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Bzzt — Disease Early Warning',
  description: 'Dengue, malaria, and chikungunya outbreaks predicted 10 weeks before they happen. Free alerts for any district.',
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
        <span className="text-base font-bold tracking-tight text-white">Bzzt</span>
        <div className="flex items-center gap-8">
          <Link href="/lookup" className="text-sm font-medium focus:outline-none focus:underline" style={{ color: 'rgba(255,255,255,0.6)' }}>Check your risk</Link>
          <Link href="/dashboard" className="text-sm font-medium focus:outline-none focus:underline" style={{ color: 'rgba(255,255,255,0.6)' }}>Intelligence map</Link>
        </div>
      </nav>

      {/* ── HERO ────────────────────────────────────────────────────────── */}
      <section aria-labelledby="hero-heading"
        className="relative min-h-screen flex flex-col justify-center px-8 md:px-16 lg:px-24 pt-32 pb-24 overflow-hidden"
        style={{ background: '#1d3d35' }}>
        <div className="absolute inset-0 flex items-center justify-end pointer-events-none select-none" aria-hidden="true">
          <img src="/mosquito.png" alt="" className="w-[55%] max-w-3xl opacity-15 object-contain"
            style={{ mixBlendMode: 'screen', filter: 'brightness(1.5)' }} />
        </div>
        <div className="relative z-10 max-w-screen-xl mx-auto w-full">
          <ScrollReveal>
            <p className="text-xs font-bold uppercase tracking-[0.25em] mb-10" style={{ color: 'rgba(255,255,255,0.35)' }}>
              Bzzt — Mosquito-borne Disease Early Warning
            </p>
          </ScrollReveal>
          <ScrollReveal delay={100}>
            <h1 id="hero-heading" className="text-[clamp(3rem,8vw,7rem)] font-bold tracking-tight leading-[1.02] mb-12" style={{ color: '#ffffff' }}>
              A child dies<br />from malaria<br />
              <span style={{ color: '#e85045' }}>every minute.</span>
            </h1>
          </ScrollReveal>
          <ScrollReveal delay={200}>
            <p className="text-xl md:text-2xl leading-relaxed max-w-2xl mb-4" style={{ color: 'rgba(255,255,255,0.6)', fontWeight: 300 }}>
              Dengue. Malaria. Chikungunya. Most alerts come after the outbreak has already started.
            </p>
            <p className="text-xl md:text-2xl leading-relaxed max-w-2xl mb-16 font-semibold" style={{ color: '#ffffff' }}>
              Bzzt sends the warning 10 weeks before — the first free, open-source system
              to do this at district level, anywhere in the world.
            </p>
          </ScrollReveal>
          <ScrollReveal delay={300}>
            <div className="flex flex-wrap gap-4">
              <Link href="#enroll"
                className="inline-flex items-center font-semibold text-sm px-7 py-3.5 rounded-full transition-opacity hover:opacity-90 focus:outline-none focus:ring-2"
                style={{ background: '#2d6b5a', color: '#ffffff' }}>
                Get free alerts for your district
              </Link>
              <Link href="/dashboard"
                className="inline-flex items-center font-semibold text-sm px-7 py-3.5 rounded-full transition-opacity hover:opacity-80 focus:outline-none focus:ring-2 border"
                style={{ background: 'transparent', color: 'rgba(255,255,255,0.85)', borderColor: 'rgba(255,255,255,0.35)' }}>
                See the live map →
              </Link>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ── THE NUMBERS ─────────────────────────────────────────────────── */}
      <section aria-label="Key statistics" className="min-h-[85vh] flex flex-col justify-center px-8 md:px-16 lg:px-24 py-32"
        style={{ background: '#0f2420', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="max-w-screen-xl mx-auto w-full">
          <ScrollReveal>
            <p className="text-xs font-bold uppercase tracking-[0.25em] mb-20" style={{ color: 'rgba(255,255,255,0.35)' }}>The scale of the problem</p>
          </ScrollReveal>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-16 md:gap-8 mb-24">
            {[
              { n: '700k+',    sub: 'deaths every year', note: 'Malaria, dengue, and chikungunya combined — WHO 2024', delay: 0 },
              { n: '74%',      sub: 'are children under five', note: 'Malaria alone is the leading infectious killer of young children globally', delay: 150 },
              { n: '10 weeks', sub: 'warning already in the data', note: 'The climate signal that predicts the outbreak — going unread, every day', delay: 300 },
            ].map(({ n, sub, note, delay }) => (
              <ScrollReveal key={n} delay={delay}>
                <div className="text-[clamp(2.5rem,5vw,4.5rem)] font-bold tracking-tight mb-4" style={{ color: '#e85045' }}>{n}</div>
                <div className="text-lg font-semibold mb-3" style={{ color: '#ffffff' }}>{sub}</div>
                <div className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.55)' }}>{note}</div>
              </ScrollReveal>
            ))}
          </div>
          <ScrollReveal delay={300}>
            <div className="rounded-3xl p-10 md:p-12 w-full" style={{ background: '#2a5248' }}>
              <p className="text-xs font-bold uppercase tracking-[0.25em] mb-5" style={{ color: '#e85045' }}>
                Signal validated — Delhi, May 2026
              </p>
              <p className="text-lg leading-relaxed mb-4" style={{ color: 'rgba(255,255,255,0.85)' }}>
                Bzzt flagged Delhi as elevated dengue risk based on climate conditions and rising symptom searches.
                Delhi&rsquo;s Municipal Corporation confirmed the highest April dengue case count in five years —
                52 cases, up 24% year-on-year — consistent with the Bzzt signal that week.
              </p>
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>
                Source: Business Standard · MCD surveillance data · May 2026
              </p>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ── THE PROBLEM ─────────────────────────────────────────────────── */}
      <section aria-labelledby="problem-heading" className="min-h-[90vh] flex flex-col justify-center px-8 md:px-16 lg:px-24 py-32"
        style={{ background: '#152e28' }}>
        <div className="max-w-screen-xl mx-auto w-full">
          <ScrollReveal>
            <p className="text-xs font-bold uppercase tracking-[0.25em] mb-12" style={{ color: 'rgba(255,255,255,0.35)' }}>The gap</p>
            <h2 id="problem-heading" className="text-[clamp(2rem,4.5vw,3.5rem)] font-bold leading-tight mb-20 max-w-3xl" style={{ color: '#ffffff' }}>
              The warning exists. It&rsquo;s in the weather data, updated daily, free for anyone to read. Nobody is sending it.
            </h2>
          </ScrollReveal>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[
              { n: '01', title: 'Disease surveillance is reactive by design', body: 'Every existing system — national health agencies, WHO EIOS, HealthMap — detects outbreaks after cases are reported. By the time a district health officer receives an alert, the mosquitoes responsible have been breeding for weeks.' },
              { n: '02', title: 'Rural communities receive nothing', body: 'Urban hospitals and capitals have surveillance. The communities with the highest disease burden — rural endemic zones across Africa and Asia — have no warning infrastructure whatsoever. An outbreak arrives the same way it always has: as a surprise.' },
              { n: '03', title: 'The climate signal is there, going unread', body: 'Rainfall, temperature, and humidity reliably precede outbreak peaks by 10–14 weeks. This data is free, globally available, updated daily. No accessible platform converts it into district-level predictions for community health workers.' },
              { n: '04', title: 'The last mile has no last-minute warning', body: 'A community health worker cannot pre-position medicines they were never warned to request. A family cannot eliminate breeding sites around their home if no alert ever reached them. A district officer cannot order bed nets six weeks ahead of a surge nobody predicted.' },
            ].map(({ n, title, body }, i) => (
              <ScrollReveal key={n} delay={i * 80}>
                <div className="rounded-2xl p-8 h-full border" style={{ background: '#1d3d35', borderColor: 'rgba(255,255,255,0.08)' }}>
                  <div className="text-xs font-mono mb-4" style={{ color: 'rgba(255,255,255,0.3)' }}>{n}</div>
                  <h3 className="text-base font-semibold mb-3" style={{ color: '#ffffff' }}>{title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.6)' }}>{body}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── PULL QUOTE ──────────────────────────────────────────────────── */}
      <section aria-label="Mission" className="w-full px-8 md:px-16 lg:px-24 py-20"
        style={{ background: '#152e28', borderTop: '1px solid rgba(255,255,255,0.06)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="max-w-screen-xl mx-auto w-full">
          <ScrollReveal>
            <div className="flex items-start gap-6 max-w-3xl">
              <div className="shrink-0 w-1 h-16 rounded-full mt-1" style={{ background: '#e85045' }} aria-hidden="true" />
              <blockquote className="text-xl md:text-2xl font-light leading-relaxed" style={{ color: 'rgba(255,255,255,0.85)' }}>
                The first free, open-source system to predict dengue, malaria, and chikungunya
                at district level — 10 weeks before outbreak peaks — for any community in the world.
              </blockquote>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ── THE PRODUCT ─────────────────────────────────────────────────── */}
      <section aria-labelledby="product-heading" className="min-h-screen flex flex-col justify-center px-8 md:px-16 lg:px-24 py-32"
        style={{ background: '#1d3d35' }}>
        <div className="max-w-screen-xl mx-auto w-full">
          <ScrollReveal>
            <p className="text-xs font-bold uppercase tracking-[0.25em] mb-12" style={{ color: 'rgba(255,255,255,0.35)' }}>What we built</p>
            <h2 id="product-heading" className="text-[clamp(2rem,4vw,3rem)] font-bold mb-6 max-w-3xl" style={{ color: '#ffffff' }}>
              A live intelligence system. Running every night. Free for every country.
            </h2>
            <p className="text-lg mb-20 max-w-2xl" style={{ color: 'rgba(255,255,255,0.6)' }}>
              Not a prototype. Not a research project. A deployed system scoring 2,610+ districts across 26 countries, every night, automatically.
            </p>
          </ScrollReveal>

          {/* Product features */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-16">
            {[
              {
                icon: '🗺',
                title: 'Live intelligence map',
                body: 'A real-time choropleth map showing outbreak risk by district — HIGH, ALERT, or WATCH — with climate drivers, population at risk, and the predicted outbreak window for every monitored district. Updated every night.',
                delay: 0,
              },
              {
                icon: '📱',
                title: 'Alerts on any phone',
                body: 'Community health workers and families receive early warnings 10 weeks ahead via SMS, WhatsApp, or USSD. USSD requires no internet, no smartphone, no data plan — it works on a basic feature phone with a simple dial code.',
                delay: 100,
              },
              {
                icon: '🔬',
                title: 'ML model trained on real outbreaks',
                body: 'Not rules. Not thresholds. A logistic regression trained on 1.1 million real outbreak observations from 102 countries — improving accuracy 31% over rule-based approaches and validated by leaving entire countries out of training.',
                delay: 200,
              },
            ].map(({ icon, title, body, delay }) => (
              <ScrollReveal key={title} delay={delay}>
                <div className="rounded-2xl p-8 h-full border" style={{ background: '#0f2420', borderColor: 'rgba(255,255,255,0.08)' }}>
                  <div className="text-3xl mb-5" aria-hidden="true">{icon}</div>
                  <h3 className="text-base font-bold mb-3" style={{ color: '#ffffff' }}>{title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.6)' }}>{body}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>

          {/* Three signal types */}
          <ScrollReveal delay={200}>
            <div className="rounded-2xl p-10 border" style={{ background: '#152e28', borderColor: 'rgba(255,255,255,0.08)' }}>
              <p className="text-xs font-bold uppercase tracking-[0.25em] mb-8" style={{ color: 'rgba(255,255,255,0.35)' }}>Three signals. One score. No other platform combines them.</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {[
                  { label: 'Climate signal', sub: '10-week lagged rainfall + temperature + humidity anomaly vs each district\'s own 5-year baseline', color: '#52b8a8' },
                  { label: 'Search trends', sub: 'Real-time Google Trends symptom searches in local languages — the earliest sign the virus is already circulating', color: '#f6bd60' },
                  { label: 'CHW ground reports', sub: 'Community health workers submit weekly fever counts via USSD — ground truth that overrides the model when cases are already present', color: '#e85045' },
                ].map(({ label, sub, color }) => (
                  <div key={label}>
                    <div className="text-sm font-bold mb-2" style={{ color }}>{label}</div>
                    <div className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.55)' }}>{sub}</div>
                  </div>
                ))}
              </div>
            </div>
          </ScrollReveal>

          <ScrollReveal delay={300} className="mt-10">
            <div className="flex flex-wrap gap-4">
              <Link href="/dashboard"
                className="inline-flex items-center font-semibold text-sm px-7 py-3.5 rounded-full transition-opacity hover:opacity-90 focus:outline-none focus:ring-2"
                style={{ background: '#2d6b5a', color: '#ffffff' }}>
                Explore the live map →
              </Link>
              <Link href="https://github.com/divyanka-kapoor/bzzt" target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center font-semibold text-sm px-7 py-3.5 rounded-full transition-opacity hover:opacity-80 focus:outline-none focus:ring-2 border"
                style={{ background: 'transparent', color: 'rgba(255,255,255,0.85)', borderColor: 'rgba(255,255,255,0.25)' }}>
                View open-source code ↗
              </Link>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ── WHO IT REACHES ──────────────────────────────────────────────── */}
      <section aria-labelledby="reach-heading" className="min-h-[80vh] flex flex-col justify-center px-8 md:px-16 lg:px-24 py-32"
        style={{ background: '#0f2420' }}>
        <div className="max-w-screen-xl mx-auto w-full">
          <ScrollReveal>
            <p className="text-xs font-bold uppercase tracking-[0.25em] mb-12" style={{ color: 'rgba(255,255,255,0.35)' }}>Who it reaches</p>
            <h2 id="reach-heading" className="text-[clamp(2rem,4vw,3rem)] font-bold mb-16 max-w-2xl" style={{ color: '#ffffff' }}>
              Built for the communities that existing systems cannot reach.
            </h2>
          </ScrollReveal>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { icon: '🏥', who: 'Community health workers', body: '10 weeks of lead time before cases arrive — enough to mobilise, educate households, and eliminate breeding sites. Field reports submitted via phone menu feed directly back into the risk model.' },
              { icon: '🏛️', who: 'District health officers', body: '10 weeks is enough to requisition medicines, pre-position bed nets, and schedule spray campaigns before the hospital fills up. The intelligence map shows every district ranked by risk.' },
              { icon: '👨‍👩‍👧', who: 'Families', body: 'A free alert in the local language on any phone — Hausa, Bengali, Swahili, Filipino, and more. No smartphone. No app. No internet. A basic feature phone and a dial code is enough.' },
            ].map(({ icon, who, body }, i) => (
              <ScrollReveal key={who} delay={i * 100}>
                <div className="rounded-2xl p-8 h-full border" style={{ background: '#1d3d35', borderColor: 'rgba(255,255,255,0.08)' }}>
                  <div className="text-3xl mb-5" role="img" aria-label={who}>{icon}</div>
                  <h3 className="text-base font-bold mb-3" style={{ color: '#ffffff' }}>{who}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.6)' }}>{body}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── PROOF ───────────────────────────────────────────────────────── */}
      <section aria-labelledby="proof-heading" className="min-h-[90vh] flex flex-col justify-center px-8 md:px-16 lg:px-24 py-32"
        style={{ background: '#152e28' }}>
        <div className="max-w-screen-xl mx-auto w-full">
          <ScrollReveal>
            <p className="text-xs font-bold uppercase tracking-[0.25em] mb-12" style={{ color: 'rgba(255,255,255,0.35)' }}>Validated</p>
            <h2 id="proof-heading" className="text-[clamp(2rem,4vw,3rem)] font-bold mb-20 max-w-2xl" style={{ color: '#ffffff' }}>
              10 years of real outbreak data. 102 countries of training. Running live tonight.
            </h2>
          </ScrollReveal>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
            <ScrollReveal delay={100}>
              <div className="rounded-2xl p-10" style={{ background: '#1d3d35' }}>
                <h3 className="text-sm font-semibold mb-8" style={{ color: 'rgba(255,255,255,0.6)' }}>
                  Climate signal correlation at each lag — when does it peak?
                </h3>
                <div className="space-y-4" role="img" aria-label="Bar chart: correlation peaks at 10-11 weeks">
                  {[
                    { lag: '4 wks',  r: 0.363 },
                    { lag: '6 wks',  r: 0.419 },
                    { lag: '8 wks',  r: 0.451 },
                    { lag: '10 wks', r: 0.489, peak: true },
                    { lag: '11 wks', r: 0.489, peak: true },
                    { lag: '12 wks', r: 0.482 },
                  ].map(({ lag, r, peak }) => (
                    <div key={lag} className="flex items-center gap-5">
                      <div className="text-xs w-14 text-right shrink-0" style={{ color: 'rgba(255,255,255,0.4)' }}>{lag}</div>
                      <div className="flex-1 rounded-full h-3 overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                        <div className="h-full rounded-full" style={{ width: `${r * 195}%`, background: peak ? '#e85045' : '#52b8a8', opacity: peak ? 1 : 0.6 }} />
                      </div>
                      <div className="text-xs w-28 shrink-0 font-semibold" style={{ color: peak ? '#e85045' : 'rgba(255,255,255,0.4)' }}>
                        r = {r}{peak ? ' ← peak' : ''}
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-xs mt-8" style={{ color: 'rgba(255,255,255,0.35)' }}>
                  Spearman correlation · São Paulo 2014–2023 · n=2,610 weeks · p&lt;0.001
                  Source: InfoDengue / FIOCRUZ
                </p>
              </div>
            </ScrollReveal>
            <div className="space-y-6">
              {[
                { stat: 'AUC 0.752', label: '31% more accurate than rule-based approaches', body: 'ML model on held-out 2021–2023 data. Baseline rule-based AUC was 0.574. The trained model closes the gap — and it uses only freely available climate data, no surveillance infrastructure.', delay: 100 },
                { stat: 'r = 0.489', label: '10–11 weeks before outbreak peaks', body: 'Spearman correlation against 2,610 weeks of confirmed surveillance data from FIOCRUZ, Brazil\'s national disease authority. Statistically significant at p<0.001.', delay: 150 },
                { stat: '11 of 14', label: 'Cities beat random chance on countries never trained on', body: 'Leave One Country Out cross-validation across Brazil, Peru, Colombia, Taiwan, Philippines. The signal generalises across continents. This is not overfitting to one geography.', delay: 200 },
              ].map(({ stat, label, body, delay }) => (
                <ScrollReveal key={stat} delay={delay}>
                  <div className="rounded-2xl p-8 border" style={{ background: '#1d3d35', borderColor: 'rgba(255,255,255,0.08)' }}>
                    <div className="text-3xl font-bold mb-2" style={{ color: '#e85045' }}>{stat}</div>
                    <div className="text-sm font-semibold mb-2" style={{ color: '#ffffff' }}>{label}</div>
                    <div className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.6)' }}>{body}</div>
                  </div>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── ENROLL ──────────────────────────────────────────────────────── */}
      <section id="enroll" aria-labelledby="enroll-heading"
        className="min-h-[80vh] flex flex-col justify-center px-8 md:px-16 lg:px-24 py-32"
        style={{ background: '#0f2420' }}>
        <div className="max-w-screen-xl mx-auto w-full">
          <div className="max-w-2xl">
            <ScrollReveal>
              <p className="text-xs font-bold uppercase tracking-[0.25em] mb-10" style={{ color: 'rgba(255,255,255,0.35)' }}>Get protected</p>
              <h2 id="enroll-heading" className="text-[clamp(2rem,4.5vw,3.5rem)] font-bold leading-tight mb-8" style={{ color: '#ffffff' }}>
                Get an early warning for your district. Free.
              </h2>
            </ScrollReveal>
            <ScrollReveal delay={100}>
              <p className="text-lg leading-relaxed mb-12" style={{ color: 'rgba(255,255,255,0.6)' }}>
                Works on any phone. No app, no smartphone, no internet required.
                Enter any village, town, or district in the 26 monitored countries.
                Alerts arrive in English and your local language.
              </p>
            </ScrollReveal>
            <ScrollReveal delay={200}>
              <EnrollmentWidget />
            </ScrollReveal>
            <ScrollReveal delay={300}>
              <p className="text-sm mt-8" style={{ color: 'rgba(255,255,255,0.4)' }}>
                SMS · WhatsApp · USSD (*384#) · Dengue · Malaria · Chikungunya
              </p>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────────────── */}
      <footer className="px-8 md:px-16 lg:px-24 py-12 border-t" style={{ background: '#1d3d35', borderColor: 'rgba(255,255,255,0.08)' }}>
        <div className="max-w-screen-xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-6 text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
          <div className="space-y-1">
            <div className="font-bold text-white">Bzzt</div>
            <div>Autonomous mosquito-borne disease early warning · Open-source · © 2026</div>
          </div>
          <div className="flex items-center gap-6 flex-wrap">
            <span>Open-Meteo · OpenDengue · WHO · GADM</span>
            <Link href="/dashboard" className="hover:text-white transition-colors focus:outline-none focus:underline">Intelligence map</Link>
            <Link href="https://github.com/divyanka-kapoor/bzzt" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors focus:outline-none focus:underline">GitHub ↗</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
