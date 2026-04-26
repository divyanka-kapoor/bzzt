'use client';

import { useState, useId, useRef, useEffect } from 'react';

export default function EnrollmentWidget() {
  const [step, setStep] = useState<'location' | 'details' | 'done'>('location');
  const [cityName, setCityName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const cityId  = useId();
  const phoneId = useId();
  const emailId = useId();
  const errorId = useId();

  // Move focus to heading when step changes
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => { headingRef.current?.focus(); }, [step]);

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
      if (data.success) { setStep('done'); }
      else { setError(data.error || 'Something went wrong'); }
    } catch {
      setError('Network error — please try again');
    }
    setLoading(false);
  }

  const inputClass = 'w-full bg-[#0a0a0a] border border-white/20 rounded-lg px-4 py-3 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-white/40 focus:border-transparent text-sm';
  const btnClass   = 'w-full bg-white text-black font-semibold py-3 px-4 rounded-lg transition hover:bg-white/90 disabled:opacity-40 text-sm focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-black';
  const labelClass = 'block text-xs font-medium text-white/70 mb-1.5';

  return (
    <div className="w-full max-w-md mx-auto bg-white/[0.03] border border-white/10 rounded-2xl p-6 md:p-8">

      {step === 'location' && (
        <div className="space-y-4">
          <div>
            <h3 ref={headingRef} tabIndex={-1} className="text-base font-semibold text-white mb-1 focus:outline-none">
              Get alerts for your area
            </h3>
            <p className="text-sm text-white/60">Enter your city, district, or country.</p>
          </div>
          <div>
            <label htmlFor={cityId} className={labelClass}>Your location</label>
            <input
              id={cityId}
              type="text"
              value={cityName}
              onChange={e => setCityName(e.target.value)}
              placeholder="e.g. Jakarta, Lagos, São Paulo"
              className={inputClass}
              autoComplete="address-level2"
              aria-describedby={error ? errorId : undefined}
              onKeyDown={e => e.key === 'Enter' && cityName && setStep('details')}
            />
          </div>
          <button onClick={() => cityName && setStep('details')} disabled={!cityName} className={btnClass}>
            Continue
          </button>
          {error && (
            <p id={errorId} role="alert" className="text-sm text-white/70">
              {error}
            </p>
          )}
        </div>
      )}

      {step === 'details' && (
        <div className="space-y-4">
          <div>
            <h3 ref={headingRef} tabIndex={-1} className="text-base font-semibold text-white mb-1 focus:outline-none">
              How should we reach you?
            </h3>
            <p className="text-sm text-white/60">
              Alerts for <span className="text-white font-medium">{cityName}</span>.
            </p>
          </div>
          <div>
            <label htmlFor={phoneId} className={labelClass}>Phone number <span className="text-white/40 font-normal">(SMS)</span></label>
            <input
              id={phoneId}
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="+1 555 000 0000"
              className={inputClass}
              autoComplete="tel"
              aria-describedby={error ? errorId : undefined}
            />
          </div>
          <div>
            <label htmlFor={emailId} className={labelClass}>Email address</label>
            <input
              id={emailId}
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              className={inputClass}
              autoComplete="email"
              aria-describedby={error ? errorId : undefined}
            />
          </div>
          <p className="text-xs text-white/40">At least one contact method required.</p>
          <button onClick={submitEnrollment} disabled={loading || (!phone && !email)} className={btnClass}>
            {loading ? 'Enrolling…' : 'Enroll'}
          </button>
          <button
            onClick={() => setStep('location')}
            className="w-full text-sm text-white/50 hover:text-white/70 py-1 transition focus:outline-none focus:underline"
          >
            ← Back
          </button>
          {error && (
            <p id={errorId} role="alert" className="text-sm text-white/70">
              {error}
            </p>
          )}
        </div>
      )}

      {step === 'done' && (
        <div className="text-center space-y-3 py-2" role="status" aria-live="polite">
          <div
            className="w-10 h-10 rounded-full border border-white/30 flex items-center justify-center mx-auto text-white/80 text-lg"
            aria-hidden="true"
          >✓</div>
          <h3 ref={headingRef} tabIndex={-1} className="text-base font-semibold text-white focus:outline-none">
            Enrolled successfully
          </h3>
          <p className="text-sm text-white/60">
            You&apos;ll receive alerts for <span className="text-white font-medium">{cityName}</span> at {phone || email}.
          </p>
        </div>
      )}
    </div>
  );
}
