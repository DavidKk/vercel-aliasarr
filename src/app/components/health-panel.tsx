"use client";

import { useEffect, useState } from "react";

type Health = {
  status: string;
  prowlarr: string;
  database: string;
  version: string;
  runtime?: string;
};

export function HealthPanel() {
  const [health, setHealth] = useState<Health | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/health")
      .then(async (res) => {
        if (!res.ok) throw new Error(`health ${res.status}`);
        return (await res.json()) as Health;
      })
      .then((data) => {
        if (!cancelled) setHealth(data);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "health failed");
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="panel">
      <h2>运行状态</h2>
      {error ? <p className="error">{error}</p> : null}
      <div className="status-grid">
        <div className="status-item">
          <span className="label">Service</span>
          <span className={`value ${health?.status === "ok" ? "ok" : ""}`}>
            {health?.status ?? "loading…"}
          </span>
        </div>
        <div className="status-item">
          <span className="label">Prowlarr</span>
          <span
            className={`value ${
              health?.prowlarr === "reachable"
                ? "ok"
                : health
                  ? "bad"
                  : ""
            }`}
          >
            {health?.prowlarr ?? "loading…"}
          </span>
        </div>
        <div className="status-item">
          <span className="label">Runtime</span>
          <span className="value">{health?.runtime ?? "vercel"}</span>
        </div>
        <div className="status-item">
          <span className="label">Version</span>
          <span className="value">{health?.version ?? "0.1.0"}</span>
        </div>
      </div>
    </section>
  );
}
