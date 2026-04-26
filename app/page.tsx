import type { Metadata } from 'next';
import MosquitoWatermark from '@/components/MosquitoWatermark';
import EnrollmentWidget from '@/components/EnrollmentWidget';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Bzzt — Disease Early Warning',
  description: 'Climate data predicts dengue and malaria outbreaks weeks before they happen. Get SMS alerts for your area.',
};

export default function Home() {
  return (
    <main id="main-content" className="min-h-screen bg-background text-foreground">
      <nav aria-label="Main navigation" className="flex items-center justify-between px-6 md:px-12 py-6">
        <span className="text-xl font-bold tracking-tight text-white" aria-current="page">Bzzt</span>
        <div className="flex items-center gap-4">
          <Link href="/lookup" className="text-sm text-white/60 hover:text-white transition-colors focus:outline-none focus:underline">
            Check risk →
          </Link>
          <Link href="/dashboard" className="text-sm text-white/60 hover:text-white transition-colors focus:outline-none focus:underline">
            Dashboard →
          </Link>
        </div>
      </nav>

      <section aria-labelledby="hero-heading" className="relative px-6 md:px-12 pt-16 pb-24 md:pt-24 md:pb-32 overflow-hidden">
        <MosquitoWatermark />
        <div className="relative z-10 max-w-3xl mx-auto text-center space-y-6">
          <h1 id="hero-heading" className="text-4xl md:text-6xl font-bold tracking-tight text-white leading-tight">
            Climate data predicts disease outbreaks weeks before they happen.
          </h1>
          <p className="text-lg md:text-xl text-white/70 max-w-2xl mx-auto">
            Bzzt makes sure the warning reaches you.
          </p>
        </div>
      </section>

      <section aria-labelledby="enroll-heading" className="px-6 md:px-12 pb-24">
        <h2 id="enroll-heading" className="sr-only">Enroll for alerts</h2>
        <EnrollmentWidget />
      </section>

      <footer className="border-t border-white/10 px-6 md:px-12 py-8 text-center text-sm text-white/50">
        Bzzt — Autonomous mosquito-borne disease early warning. Built for public health.
      </footer>
    </main>
  );
}
