"use client";

/**
 * app/(dashboard)/reports/page.tsx
 * T20 — Usage Reports UI
 *
 * Features:
 * - Date range filter (from/to)
 * - Event filter dropdown
 * - Summary cards: total photos, done, failed, credits used, refunded
 * - Per-event breakdown table
 * - Detailed photo log table with CSV export
 * - Field checkboxes to control CSV columns
 */

import { useState, useEffect, useCallback } from "react";

interface ReportData {
  period: { from: string; to: string };
  summary: {
    totalPhotos: number;
    donePhotos: number;
    failedPhotos: number;
    processingPhotos: number;
    totalCreditsUsed: number;
    totalCreditsRefunded: number;
  };
  events: { id: string; name: string }[];
  perEvent: { eventId: string; name: string; total: number; done: number; failed: number; credits: number }[];
  photos: { id: string; eventId: string; eventName: string; status: string; credits: number; createdAt: string }[];
}

function formatDate(d: Date): string {
  return d.toISOString().split("T")[0];
}

const CSV_FIELDS = [
  { key: "id", label: "Photo ID" },
  { key: "eventName", label: "Event" },
  { key: "status", label: "Status" },
  { key: "credits", label: "Credits" },
  { key: "createdAt", label: "Date" },
] as const;

export default function ReportsPage() {
  const today = formatDate(new Date());
  const thirtyDaysAgo = formatDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));

  const [from, setFrom] = useState(thirtyDaysAgo);
  const [to, setTo] = useState(today);
  const [eventId, setEventId] = useState("");
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [csvFields, setCsvFields] = useState<Set<string>>(new Set(CSV_FIELDS.map(f => f.key)));

  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ from, to });
      if (eventId) params.set("eventId", eventId);
      const res = await fetch(`/api/reports?${params}`);
      if (res.ok) setData(await res.json());
    } catch { /* ignore */ }
    setLoading(false);
  }, [from, to, eventId]);

  useEffect(() => { fetchReport(); }, [fetchReport]);

  function toggleField(key: string) {
    setCsvFields(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  function exportCSV() {
    if (!data) return;
    const fields = CSV_FIELDS.filter(f => csvFields.has(f.key));
    const header = fields.map(f => f.label).join(",");
    const rows = data.photos.map(p =>
      fields.map(f => {
        const val = p[f.key as keyof typeof p];
        if (f.key === "createdAt") return new Date(val as string).toLocaleString("en-IN");
        return typeof val === "string" ? `"${val}"` : val;
      }).join(",")
    );
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `boothmagic-report-${from}-to-${to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const s = data?.summary;

  return (
    <div style={{ maxWidth: 1000 }}>
      <div style={{ marginBottom: "var(--space-6)" }}>
        <h1 style={{ fontFamily: "var(--font-poppins), Poppins, sans-serif", fontSize: 24, fontWeight: 700, color: "var(--text)", marginBottom: 4 }}>
          Usage Reports
        </h1>
        <p style={{ color: "var(--text-muted)", fontSize: 14 }}>Track credits, photos, and performance across your events.</p>
      </div>

      {/* Filters */}
      <div className="card" style={{ padding: "var(--space-4) var(--space-6)", marginBottom: "var(--space-6)", display: "flex", gap: "var(--space-4)", alignItems: "flex-end", flexWrap: "wrap" }}>
        <div className="form-group" style={{ minWidth: 140 }}>
          <label className="form-label">From</label>
          <input type="date" className="form-input" value={from} onChange={e => setFrom(e.target.value)} max={to} />
        </div>
        <div className="form-group" style={{ minWidth: 140 }}>
          <label className="form-label">To</label>
          <input type="date" className="form-input" value={to} onChange={e => setTo(e.target.value)} min={from} max={today} />
        </div>
        <div className="form-group" style={{ minWidth: 180, flex: 1 }}>
          <label className="form-label">Event</label>
          <select className="form-input" value={eventId} onChange={e => setEventId(e.target.value)}>
            <option value="">All Events</option>
            {data?.events.map(ev => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
          </select>
        </div>
        <button className="btn btn-primary btn-sm" onClick={fetchReport} disabled={loading} style={{ marginBottom: 0 }}>
          {loading ? "Loading…" : "Apply Filters"}
        </button>
      </div>

      {loading && !data && (
        <div style={{ textAlign: "center", padding: "var(--space-8)", color: "var(--text-muted)" }}>Loading report…</div>
      )}

      {data && s && (
        <>
          {/* Summary cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "var(--space-3)", marginBottom: "var(--space-6)" }}>
            {[
              { label: "Total Photos", value: s.totalPhotos, color: "var(--text)" },
              { label: "Completed", value: s.donePhotos, color: "var(--success)" },
              { label: "Failed", value: s.failedPhotos, color: "var(--error)" },
              { label: "Credits Used", value: `⚡ ${s.totalCreditsUsed}`, color: "var(--primary)" },
              { label: "Refunded", value: `+${s.totalCreditsRefunded}`, color: "var(--accent)" },
            ].map((card, i) => (
              <div key={i} className="card" style={{ padding: "var(--space-4)", textAlign: "center" }}>
                <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "var(--space-2)" }}>{card.label}</div>
                <div style={{ fontSize: 28, fontWeight: 800, color: card.color, fontVariantNumeric: "tabular-nums" }}>{card.value}</div>
              </div>
            ))}
          </div>

          {/* Per-event breakdown */}
          {data.perEvent.length > 0 && (
            <div className="card" style={{ padding: "var(--space-6)", marginBottom: "var(--space-6)" }}>
              <h2 style={{ fontFamily: "var(--font-poppins), Poppins, sans-serif", fontSize: 16, fontWeight: 600, color: "var(--text)", marginBottom: "var(--space-4)" }}>Per-Event Breakdown</h2>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--border)" }}>
                      {["Event", "Total", "Done", "Failed", "Credits"].map(h => (
                        <th key={h} style={{ padding: "var(--space-2) var(--space-3)", textAlign: "left", color: "var(--text-muted)", fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.perEvent.map(ev => (
                      <tr key={ev.eventId} style={{ borderBottom: "1px solid var(--border)" }}>
                        <td style={{ padding: "var(--space-3)", color: "var(--text)", fontWeight: 500 }}>{ev.name}</td>
                        <td style={{ padding: "var(--space-3)", color: "var(--text)", fontVariantNumeric: "tabular-nums" }}>{ev.total}</td>
                        <td style={{ padding: "var(--space-3)", color: "var(--success)", fontVariantNumeric: "tabular-nums" }}>{ev.done}</td>
                        <td style={{ padding: "var(--space-3)", color: ev.failed > 0 ? "var(--error)" : "var(--text-muted)", fontVariantNumeric: "tabular-nums" }}>{ev.failed}</td>
                        <td style={{ padding: "var(--space-3)", color: "var(--primary)", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>⚡ {ev.credits}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* CSV export controls */}
          <div className="card" style={{ padding: "var(--space-6)", marginBottom: "var(--space-6)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--space-4)", flexWrap: "wrap", gap: "var(--space-3)" }}>
              <h2 style={{ fontFamily: "var(--font-poppins), Poppins, sans-serif", fontSize: 16, fontWeight: 600, color: "var(--text)" }}>Photo Log</h2>
              <div style={{ display: "flex", alignItems: "center", gap: "var(--space-4)", flexWrap: "wrap" }}>
                {/* Field checkboxes */}
                <div style={{ display: "flex", gap: "var(--space-3)", flexWrap: "wrap" }}>
                  {CSV_FIELDS.map(f => (
                    <label key={f.key} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--text-muted)", cursor: "pointer" }}>
                      <input type="checkbox" checked={csvFields.has(f.key)} onChange={() => toggleField(f.key)} style={{ accentColor: "var(--primary)" }} />
                      {f.label}
                    </label>
                  ))}
                </div>
                <button className="btn btn-secondary btn-sm" onClick={exportCSV} disabled={data.photos.length === 0}>
                  📥 Export CSV
                </button>
              </div>
            </div>

            {data.photos.length === 0 ? (
              <div style={{ textAlign: "center", padding: "var(--space-6)", color: "var(--text-muted)", fontSize: 14 }}>
                No photos in this period.
              </div>
            ) : (
              <div style={{ overflowX: "auto", maxHeight: 400 }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--border)", position: "sticky", top: 0, background: "var(--surface)" }}>
                      {CSV_FIELDS.filter(f => csvFields.has(f.key)).map(f => (
                        <th key={f.key} style={{ padding: "var(--space-2) var(--space-3)", textAlign: "left", color: "var(--text-muted)", fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em" }}>{f.label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.photos.slice(0, 100).map(p => (
                      <tr key={p.id} style={{ borderBottom: "1px solid var(--border)" }}>
                        {csvFields.has("id") && <td style={{ padding: "var(--space-2) var(--space-3)", color: "var(--text-muted)", fontSize: 11, fontFamily: "monospace" }}>{p.id.slice(0, 12)}…</td>}
                        {csvFields.has("eventName") && <td style={{ padding: "var(--space-2) var(--space-3)", color: "var(--text)" }}>{p.eventName}</td>}
                        {csvFields.has("status") && (
                          <td style={{ padding: "var(--space-2) var(--space-3)" }}>
                            <span style={{
                              fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 999,
                              background: p.status === "DONE" ? "rgba(52,211,153,0.12)" : p.status === "FAILED" ? "rgba(248,113,113,0.12)" : "rgba(124,92,255,0.12)",
                              color: p.status === "DONE" ? "var(--success)" : p.status === "FAILED" ? "var(--error)" : "var(--primary)",
                            }}>{p.status}</span>
                          </td>
                        )}
                        {csvFields.has("credits") && <td style={{ padding: "var(--space-2) var(--space-3)", color: "var(--text)", fontVariantNumeric: "tabular-nums" }}>{p.credits}</td>}
                        {csvFields.has("createdAt") && <td style={{ padding: "var(--space-2) var(--space-3)", color: "var(--text-muted)", fontSize: 12 }}>{new Date(p.createdAt).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</td>}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {data.photos.length > 100 && (
                  <div style={{ textAlign: "center", padding: "var(--space-3)", fontSize: 12, color: "var(--text-muted)" }}>
                    Showing 100 of {data.photos.length} photos. Export CSV for full data.
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
