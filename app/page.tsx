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
      <nav aria-label="Main navigation" className="flex items-center justify-between px-6 md:px-12 py-6">
        <span className="text-xl font-bold tracking-tight text-white" aria-current="page">Bzzt</span>
        <div className="flex items-center gap-4">
          <Link href="/lookup" className="text-sm text-white/60 hover:text-white transition-colors focus:outline-none focus:underline">
            Check your risk →
          </Link>
          <Link href="/dashboard" className="text-sm text-white/60 hover:text-white transition-colors focus:outline-none focus:underline">
            Intelligence map →
          </Link>
        </div>
      </nav>

      <section aria-labelledby="hero-heading" className="relative px-6 md:px-12 pt-16 pb-16 md:pt-24 md:pb-24 overflow-hidden">
        <MosquitoWatermark />
        <div className="relative z-10 max-w-3xl mx-auto text-center space-y-6">
          <h1 id="hero-heading" className="text-4xl md:text-6xl font-bold tracking-tight text-white leading-tight">
            The mosquitoes that spread dengue and malaria are predictable.
          </h1>
          <p className="text-lg md:text-xl text-white/70 max-w-2xl mx-auto">
            Climate signals precede outbreaks by 10&ndash;11 weeks. Bzzt reads those signals across 797 districts in 26 countries and sends you a free warning before the outbreak arrives.
          </p>
          <div className="flex items-center justify-center gap-6 text-sm text-white/40 pt-2">
            <span>26 countries</span>
            <span className="text-white/20">·</span>
            <span>797 districts monitored</span>
            <span className="text-white/20">·</span>
            <span>SMS · WhatsApp · USSD</span>
          </div>
        </div>
      </section>

      {/* What we monitor */}
      <section className="px-6 md:px-12 pb-16">
        <div className="max-w-3xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
          {[
            { icon: '◉', label: 'Dengue fever', note: 'Aedes aegypti thresholds' },
            { icon: '◆', label: 'Malaria', note: 'Anopheles gambiae + stephensi' },
            { icon: '⚡', label: 'Early alert', note: '10–11 weeks ahead of peak' },
          ].map(({ icon, label, note }) => (
            <div key={label} className="bg-white/[0.03] border border-white/[0.06] rounded-xl px-5 py-4">
              <div className="text-2xl text-white/60 mb-2" aria-hidden="true">{icon}</div>
              <div className="text-sm font-medium text-white/80">{label}</div>
              <div className="text-xs text-white/40 mt-1">{note}</div>
            </div>
          ))}
        </div>
      </section>

      <section aria-labelledby="enroll-heading" className="px-6 md:px-12 pb-24">
        <div className="max-w-3xl mx-auto">
          <h2 id="enroll-heading" className="text-center text-white/60 text-sm mb-6 uppercase tracking-widest">
            Get alerts for your district
          </h2>
          <EnrollmentWidget />
          <p className="text-center text-xs text-white/30 mt-4">
            Enter any village, town, or district. Works anywhere in the 26 monitored countries.
            No app needed — alerts arrive by SMS or WhatsApp.
          </p>
        </div>
      </section>

      <footer className="border-t border-white/10 px-6 md:px-12 py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-white/40">
          <span>Bzzt — Autonomous mosquito-borne disease early warning</span>
          <div className="flex items-center gap-4">
            <span>Open-Meteo · WHO GHO · GADM · OpenMetadata</span>
            <Link href="/dashboard" className="text-white/50 hover:text-white/70 transition-colors">
              Intelligence map →
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
