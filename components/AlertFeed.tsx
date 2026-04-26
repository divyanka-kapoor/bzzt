"use client";

import { useEffect, useState } from "react";

interface AlertItem {
  id: string;
  pincode: string;
  message: string;
  recipients: number;
  sentAt: string;
  type: "sms" | "email";
}

export default function AlertFeed() {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);

  async function load() {
    try {
      const res = await fetch("/api/alerts");
      const data = await res.json();
      setAlerts(data.alerts || []);
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col h-full">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-muted mb-4">
        Live Alert Feed
      </h2>
      <div className="flex-1 overflow-y-auto space-y-3 pr-2">
        {alerts.length === 0 && (
          <p className="text-sm text-muted">No alerts sent yet.</p>
        )}
        {alerts.map((a) => (
          <div
            key={a.id}
            className="bg-card border border-border rounded-lg p-3 space-y-1"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-accent uppercase">
                {a.type}
              </span>
              <span className="text-xs text-muted">
                {new Date(a.sentAt).toLocaleTimeString()}
              </span>
            </div>
            <div className="text-sm text-white line-clamp-2">{a.message}</div>
            <div className="text-xs text-muted">
              PIN {a.pincode} • {a.recipients} recipient{a.recipients === 1 ? "" : "s"}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
