"use client";

import { useState } from "react";

export default function EnrollmentWidget() {
  const [step, setStep] = useState<"location" | "confirm" | "details" | "done">("location");
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [pincode, setPincode] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function requestLocation() {
    setLoading(true);
    setError("");
    if (!navigator.geolocation) {
      setError("Geolocation not supported. Please enter your pincode manually.");
      setStep("confirm");
      setLoading(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setLat(latitude);
        setLng(longitude);
        try {
          const res = await fetch("/api/enroll", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ lat: latitude, lng: longitude, phone: "", email: "" }),
          });
          const data = await res.json();
          if (data.pincode) setPincode(data.pincode);
        } catch {
          // ignore pre-check
        }
        setStep("confirm");
        setLoading(false);
      },
      () => {
        setError("Location access denied. Please enter your pincode manually.");
        setStep("confirm");
        setLoading(false);
      }
    );
  }

  async function submitEnrollment() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/enroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, email, pincode, lat, lng }),
      });
      const data = await res.json();
      if (data.success) {
        setStep("done");
      } else {
        setError(data.error || "Something went wrong");
      }
    } catch {
      setError("Network error");
    }
    setLoading(false);
  }

  return (
    <div className="w-full max-w-md mx-auto bg-card border border-border rounded-2xl p-6 md:p-8">
      {step === "location" && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white">Get alerts for your area</h3>
          <p className="text-sm text-muted">Allow location access so we can find your pincode automatically.</p>
          <button
            onClick={requestLocation}
            disabled={loading}
            className="w-full bg-accent hover:bg-accent/90 text-white font-medium py-3 px-4 rounded-lg transition-colors disabled:opacity-50"
          >
            {loading ? "Locating..." : "Share My Location"}
          </button>
          <button
            onClick={() => setStep("confirm")}
            className="w-full text-sm text-muted hover:text-white py-2 transition-colors"
          >
            Enter pincode manually
          </button>
          {error && <p className="text-sm text-red-400">{error}</p>}
        </div>
      )}

      {step === "confirm" && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white">Confirm your pincode</h3>
          <input
            type="text"
            value={pincode}
            onChange={(e) => setPincode(e.target.value)}
            placeholder="e.g. 411001"
            className="w-full bg-background border border-border rounded-lg px-4 py-3 text-white placeholder:text-muted focus:outline-none focus:border-accent"
          />
          <button
            onClick={() => pincode && setStep("details")}
            disabled={!pincode}
            className="w-full bg-accent hover:bg-accent/90 text-white font-medium py-3 px-4 rounded-lg transition-colors disabled:opacity-50"
          >
            Confirm
          </button>
        </div>
      )}

      {step === "details" && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white">Contact details</h3>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Phone number"
            className="w-full bg-background border border-border rounded-lg px-4 py-3 text-white placeholder:text-muted focus:outline-none focus:border-accent"
          />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email address"
            className="w-full bg-background border border-border rounded-lg px-4 py-3 text-white placeholder:text-muted focus:outline-none focus:border-accent"
          />
          <button
            onClick={submitEnrollment}
            disabled={loading || !phone || !email}
            className="w-full bg-accent hover:bg-accent/90 text-white font-medium py-3 px-4 rounded-lg transition-colors disabled:opacity-50"
          >
            {loading ? "Enrolling..." : "Enroll Now"}
          </button>
          {error && <p className="text-sm text-red-400">{error}</p>}
        </div>
      )}

      {step === "done" && (
        <div className="text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center mx-auto text-xl">&#10003;</div>
          <h3 className="text-lg font-semibold text-white">Enrolled successfully</h3>
          <p className="text-sm text-muted">Alerts will be sent to {phone} and {email} for pincode {pincode}.</p>
        </div>
      )}
    </div>
  );
}
