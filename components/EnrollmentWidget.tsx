'use client';

import { useState } from 'react';

export default function EnrollmentWidget() {
  const [step, setStep] = useState<'location' | 'details' | 'done'>('location');
  const [cityName, setCityName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function submitEnrollment() {
    if (!cityName.trim()) { setError('Enter your city or location'); return; }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/enroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ location: cityName, phone, email }),
      });
      const data = await res.json();
      if (data.success) {
        setStep('done');
      } else {
        setError(data.error || 'Something went wrong');
      }
    } catch {
      setError('Network error');
    }
    setLoading(false);
  }

  const inputClass = 'w-full bg-[#0a0a0a] border border-white/10 rounded-lg px-4 py-3 text-white placeholder:text-white/25 focus:outline-none focus:border-white/30 text-sm';
  const btnClass   = 'w-full bg-white text-black font-medium py-3 px-4 rounded-lg transition hover:bg-white/90 disabled:opacity-40 text-sm';

  return (
    <div className="w-full max-w-md mx-auto bg-white/[0.03] border border-white/10 rounded-2xl p-6 md:p-8">
      {step === 'location' && (
        <div className="space-y-4">
          <div>
            <h3 className="text-base font-semibold text-white mb-1">Get alerts for your area</h3>
            <p className="text-sm text-white/40">Enter your city, district, or country.</p>
          </div>
          <input type="text" value={cityName} onChange={e => setCityName(e.target.value)}
            placeholder="e.g. Jakarta, Lagos, São Paulo…"
            className={inputClass}
            onKeyDown={e => e.key === 'Enter' && cityName && setStep('details')} />
          <button onClick={() => cityName && setStep('details')} disabled={!cityName}
            className={btnClass}>
            Continue
          </button>
          {error && <p className="text-sm text-white/40">{error}</p>}
        </div>
      )}

      {step === 'details' && (
        <div className="space-y-4">
          <div>
            <h3 className="text-base font-semibold text-white mb-1">How should we reach you?</h3>
            <p className="text-sm text-white/40">Alerts for <span className="text-white/70">{cityName}</span>.</p>
          </div>
          <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
            placeholder="Phone number (SMS)" className={inputClass} />
          <input type="email" value={email} onChange={e => setEmail(e.target.value)}
            placeholder="Email address" className={inputClass} />
          <button onClick={submitEnrollment} disabled={loading || (!phone && !email)}
            className={btnClass}>
            {loading ? 'Enrolling…' : 'Enroll'}
          </button>
          <button onClick={() => setStep('location')} className="w-full text-xs text-white/25 hover:text-white/40 py-1 transition">
            ← Back
          </button>
          {error && <p className="text-sm text-white/40">{error}</p>}
        </div>
      )}

      {step === 'done' && (
        <div className="text-center space-y-3 py-2">
          <div className="w-10 h-10 rounded-full border border-white/20 flex items-center justify-center mx-auto text-white/60 text-lg">✓</div>
          <h3 className="text-base font-semibold text-white">Enrolled</h3>
          <p className="text-sm text-white/40">
            You&apos;ll receive alerts for <span className="text-white/70">{cityName}</span> at {phone || email}.
          </p>
        </div>
      )}
    </div>
  );
}
