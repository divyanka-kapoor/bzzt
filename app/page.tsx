import MosquitoWatermark from "@/components/MosquitoWatermark";
import EnrollmentWidget from "@/components/EnrollmentWidget";
import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      {/* Navbar */}
      <nav className="flex items-center justify-between px-6 md:px-12 py-6">
        <div className="text-xl font-bold tracking-tight text-white">
          Bzzt
        </div>
        <Link
          href="/dashboard"
          className="text-sm text-muted hover:text-white transition-colors"
        >
          Operator Dashboard →
        </Link>
      </nav>

      {/* Hero */}
      <section className="relative px-6 md:px-12 pt-16 pb-24 md:pt-24 md:pb-32 overflow-hidden">
        <MosquitoWatermark />
        <div className="relative z-10 max-w-3xl mx-auto text-center space-y-6">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-white leading-tight">
            Climate data predicts disease outbreaks weeks before they happen.
          </h1>
          <p className="text-lg md:text-xl text-muted max-w-2xl mx-auto">
            Bzzt makes sure the warning reaches you.
          </p>
        </div>
      </section>

      {/* Enrollment */}
      <section className="px-6 md:px-12 pb-24">
        <EnrollmentWidget />
      </section>

      {/* Footer */}
      <footer className="border-t border-border px-6 md:px-12 py-8 text-center text-sm text-muted">
        Bzzt — Autonomous mosquito-borne disease early warning. Built for public health.
      </footer>
    </main>
  );
}
