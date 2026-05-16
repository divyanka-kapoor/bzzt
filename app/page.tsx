import type { Metadata } from 'next';
import MosquitoWatermark from '@/components/MosquitoWatermark';
import EnrollmentWidget from '@/components/EnrollmentWidget';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Bzzt — Disease Early Warning',
  description: 'Dengue and malaria outbreaks predicted weeks before they happen. Free SMS alerts for your district.',
};

export default function Home() {
  return (
    <main id="main-content" className="min-h-screen bg-background text-foreground">

      {/* Nav */}
      <nav aria-label="Main navigation" className="flex items-center justify-between px-6 md:px-12 py-6">
        <span className="text-xl font-bold tracking-tight text-white" aria-current="page">Bzzt</span>
        <div className="flex items-center gap-4">
          <Link href="/lookup" className="text-sm text-white/60 hover:text-white transition-colors">
            Check your risk →
          </Link>
          <Link href="/dashboard" className="text-sm text-white/60 hover:text-white transition-colors">
            Intelligence map →
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative px-6 md:px-12 pt-16 pb-20 overflow-hidden">
        <MosquitoWatermark />
        <div className="relative z-10 max-w-3xl mx-auto text-center space-y-6">
          <div className="inline-block text-xs font-semibold uppercase tracking-widest text-[#F87171]/80 bg-[#F87171]/10 border border-[#F87171]/20 rounded-full px-4 py-1.5 mb-2">
            Every 2 minutes, a child dies from malaria
          </div>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-white leading-tight">
            The outbreak was visible in the weather.<br />
            <span className="text-white/50">Nobody sent a warning.</span>
          </h1>
          <p className="text-lg md:text-xl text-white/60 max-w-2xl mx-auto leading-relaxed">
            Dengue, malaria, and chikungunya kill over 600,000 people every year.
            Almost half a million of them are children under five.
            Most of those deaths were preventable.
          </p>
        </div>
      </section>

      {/* The problem — in plain human terms */}
      <section className="px-6 md:px-12 pb-20">
        <div className="max-w-3xl mx-auto space-y-12">

          <div className="grid md:grid-cols-3 gap-6 text-center">
            {[
              { stat: '600k+', label: 'deaths per year', sub: 'from mosquito-borne disease' },
              { stat: '~75%', label: 'are children under 5', sub: 'mostly in sub-Saharan Africa and South Asia' },
              { stat: '10–14 wks', label: 'warning in the weather', sub: 'before the first child gets sick' },
            ].map(({ stat, label, sub }) => (
              <div key={label} className="bg-white/[0.03] border border-white/[0.06] rounded-xl px-5 py-6 space-y-1">
                <div className="text-3xl font-bold text-white">{stat}</div>
                <div className="text-sm font-medium text-white/70">{label}</div>
                <div className="text-xs text-white/40">{sub}</div>
              </div>
            ))}
          </div>

          {/* Why it keeps happening */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-white">Why it keeps happening</h2>
            <div className="grid md:grid-cols-2 gap-4">
              {[
                {
                  title: 'Warnings exist — but only for cities',
                  body: 'National disease agencies monitor dengue and malaria in capitals and major hospitals. The communities with the highest burden — rural Borno State, Odisha\'s forests, Chittagong Hill Tracts — have no surveillance at all.',
                },
                {
                  title: 'By the time cases are reported, it\'s too late',
                  body: 'A district health officer learns about an outbreak when the hospital fills up. At that point there\'s no time to pre-position medicines, run spray programmes, or warn families to eliminate standing water.',
                },
                {
                  title: 'The signal is in the weather, weeks earlier',
                  body: 'Mosquito breeding depends on rainfall, temperature, and humidity. When those conditions spike, an outbreak follows 8–14 weeks later — consistently, measurably, across dozens of countries.',
                },
                {
                  title: 'Nobody is reading that signal for rural communities',
                  body: 'Climate data is freely available, updated daily, covers every district on earth. It just isn\'t being translated into a warning that reaches a community health worker on a $15 phone in rural Nigeria.',
                },
              ].map(({ title, body }) => (
                <div key={title} className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-5 space-y-2">
                  <div className="text-sm font-semibold text-white/90">{title}</div>
                  <div className="text-sm text-white/50 leading-relaxed">{body}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* How Bzzt works */}
      <section className="px-6 md:px-12 pb-20 border-t border-white/[0.06] pt-16">
        <div className="max-w-3xl mx-auto space-y-8">
          <h2 className="text-xl font-semibold text-white text-center">What Bzzt does</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                step: '01',
                title: 'Reads the weather signal',
                body: 'Every day, Bzzt fetches 90 days of climate data for every district — temperature, rainfall, humidity — and computes a true 10–12 week lagged signal. This is the actual driver of mosquito breeding, not a proxy.',
              },
              {
                step: '02',
                title: 'Scores the risk',
                body: 'A logistic regression model trained on 1.1 million district-month observations from OpenDengue (102 countries, 2000–2023) converts climate signals into outbreak probability. Boosted in real-time by Google Trends symptom searches and community health worker reports.',
              },
              {
                step: '03',
                title: 'Sends the warning',
                body: 'High-risk districts trigger alerts via SMS, WhatsApp, and USSD — so a CHW with a $15 feature phone and no data plan can dial *384# and get the risk level for their region, or report fever clusters back.',
              },
            ].map(({ step, title, body }) => (
              <div key={step} className="space-y-3">
                <div className="text-3xl font-bold text-white/20">{step}</div>
                <div className="text-sm font-semibold text-white/90">{title}</div>
                <div className="text-sm text-white/50 leading-relaxed">{body}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* The last-mile reality */}
      <section className="px-6 md:px-12 pb-20">
        <div className="max-w-3xl mx-auto">
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-8 space-y-4">
            <h2 className="text-lg font-semibold text-white">The last-mile problem is real. We designed for it.</h2>
            <p className="text-sm text-white/55 leading-relaxed">
              The communities most at risk don&rsquo;t have smartphones, broadband, or functioning disease surveillance.
              A mother in rural Jharkhand whose child has a fever isn&rsquo;t checking a dashboard.
              A community health worker in Borno State isn&rsquo;t opening a web app.
            </p>
            <p className="text-sm text-white/55 leading-relaxed">
              Bzzt reaches them through channels they already use: SMS to any phone, WhatsApp where it&rsquo;s common,
              and USSD for feature phones with no data plan at all. Alerts are bilingual — English plus the local language
              of that district. The USSD menu works on a $15 phone with no internet, no app, no literacy requirement beyond knowing how to make a call.
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              {['SMS — any phone', 'WhatsApp', 'USSD *384# — no internet needed', 'Hausa · Bengali · Filipino · Swahili + more'].map(ch => (
                <span key={ch} className="text-xs bg-white/[0.04] border border-white/[0.08] rounded-full px-3 py-1.5 text-white/60">{ch}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Proof */}
      <section className="px-6 md:px-12 pb-20 border-t border-white/[0.06] pt-16">
        <div className="max-w-3xl mx-auto space-y-8">
          <h2 className="text-xl font-semibold text-white text-center">Does it actually work?</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-6 space-y-3">
              <div className="text-2xl font-bold text-white">r = 0.489</div>
              <div className="text-sm font-medium text-white/70">Climate predicts outbreaks 10–11 weeks ahead</div>
              <div className="text-xs text-white/40 leading-relaxed">
                Measured against 2,610 weeks of real dengue surveillance data from Brazil&rsquo;s national
                disease authority (FIOCRUZ/InfoDengue). Statistically significant at p&lt;0.001.
              </div>
            </div>
            <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-6 space-y-3">
              <div className="text-2xl font-bold text-white">AUC 0.77–0.95</div>
              <div className="text-sm font-medium text-white/70">On cities the model never trained on</div>
              <div className="text-xs text-white/40 leading-relaxed">
                LOCO cross-validation (Leave One Country Out) across 14 locations in Brazil, Peru,
                Colombia, Taiwan, and Philippines. Climate signal generalises across continents.
              </div>
            </div>
            <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-6 space-y-3 md:col-span-2">
              <div className="text-sm font-medium text-white/70">Real-world confirmation — Delhi, May 2026</div>
              <div className="text-xs text-white/40 leading-relaxed">
                Bzzt flagged Delhi as WATCH in early May based on Google Trends symptom searches.
                Three days later, Delhi&rsquo;s Municipal Corporation confirmed the highest April dengue case count
                in five years — 52 cases, up 24% year-on-year. The model caught it before the official report.
              </div>
            </div>
          </div>
          <p className="text-center text-xs text-white/30">
            Full methodology and honest limitations: <Link href="/dashboard" className="text-white/50 hover:text-white/70 underline underline-offset-2">see the intelligence map</Link>
          </p>
        </div>
      </section>

      {/* Enroll */}
      <section aria-labelledby="enroll-heading" className="px-6 md:px-12 pb-24 border-t border-white/[0.06] pt-16">
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="text-center space-y-2">
            <h2 id="enroll-heading" className="text-xl font-semibold text-white">
              Get an early warning for your district
            </h2>
            <p className="text-sm text-white/50">
              Free. No app. Works on any phone. Enter any village, town, or district name.
            </p>
          </div>
          <EnrollmentWidget />
          <div className="flex items-center justify-center gap-3 text-xs text-white/30 flex-wrap">
            <span>26 countries monitored</span>
            <span className="text-white/20">·</span>
            <span>797+ districts</span>
            <span className="text-white/20">·</span>
            <span>Scored every night at 2am UTC</span>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/10 px-6 md:px-12 py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-white/40">
          <span>Bzzt — Autonomous mosquito-borne disease early warning</span>
          <div className="flex items-center gap-4">
            <span>Open-Meteo · OpenDengue · WHO GHO · GADM</span>
            <Link href="/dashboard" className="text-white/50 hover:text-white/70 transition-colors">
              Intelligence map →
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
