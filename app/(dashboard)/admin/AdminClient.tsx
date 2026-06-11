"use client";

import { useState, useEffect } from "react";
import type { PeopleTag, Plan } from "@prisma/client";

interface Preset {
  id: string;
  name: string;
  prompt: string;
  peopleTag: PeopleTag;
  thumbnailUrl: string | null;
  planRequired: Plan | null;
  sortOrder: number;
}

interface Operator {
  id: string;
  email: string;
  displayName: string;
  companyName: string;
  plan: Plan;
  createdAt: string;
  emailVerified: boolean;
  balance: number;
}

interface StatDetails {
  totalOperators: number;
  totalEvents: number;
  totalPhotos: number;
  totalCreditsSpent: number;
}

interface PaymentLogEntry {
  id: string;
  userEmail: string;
  userDisplayName: string;
  razorpayPaymentId: string;
  amountInr: number;
  creditsGranted: number;
  type: string;
  createdAt: string;
}

interface LedgerLogEntry {
  id: string;
  userEmail: string;
  userDisplayName: string;
  delta: number;
  reason: string;
  refId: string;
  createdAt: string;
}

interface Props {
  initialSystemPresets: Preset[];
  initialOperators: Operator[];
  stats: StatDetails;
  paymentsLog: PaymentLogEntry[];
  ledgerLog: LedgerLogEntry[];
}

export default function AdminClient({
  initialSystemPresets,
  initialOperators,
  stats,
  paymentsLog,
  ledgerLog,
}: Props) {
  const [activeTab, setActiveTab] = useState<"operators" | "stats" | "presets" | "settings">("operators");
  const [operators, setOperators] = useState<Operator[]>(initialOperators);
  const [presets, setPresets] = useState<Preset[]>(initialSystemPresets);

  // Search filter
  const [search, setSearch] = useState("");

  // Manage Operator Modal states
  const [selectedOperator, setSelectedOperator] = useState<Operator | null>(null);
  const [selectedOperatorPlan, setSelectedOperatorPlan] = useState<Plan>("TRIAL");
  const [selectedOperatorVerified, setSelectedOperatorVerified] = useState<boolean>(false);
  const [adjustAmount, setAdjustAmount] = useState<number>(0);
  const [updatingOperator, setUpdatingOperator] = useState(false);
  const [deletingOperator, setDeletingOperator] = useState(false);

  // Preset form states
  const [editingPreset, setEditingPreset] = useState<Partial<Preset> | null>(null);
  const [savingPreset, setSavingPreset] = useState(false);

  // Dynamic Settings (AI keys + Razorpay gateway settings)
  const [settings, setSettings] = useState<Record<string, string>>({
    gemini_api_key: "",
    openai_api_key: "",
    fal_api_key: "",
    replicate_api_key: "",
    ideogram_api_key: "",
    midjourney_api_key: "",
    razorpay_key_id: "",
    razorpay_key_secret: "",
    razorpay_webhook_secret: "",
    razorpay_plan_starter: "",
    razorpay_plan_pro: "",
    razorpay_plan_business: "",
    active_model: "gemini-2.5-flash-image",
  });
  const [savingSettings, setSavingSettings] = useState(false);
  const [savedSettings, setSavedSettings] = useState(false);
  const [settingsError, setSettingsError] = useState("");

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => (r.ok ? r.json() : []))
      .then((rows: { key: string; value: string }[]) => {
        const map: Record<string, string> = {};
        for (const row of rows) map[row.key] = row.value;
        setSettings((prev) => ({ ...prev, ...map }));
      });
  }, []);

  const filteredOperators = operators.filter(
    (op) =>
      op.email.toLowerCase().includes(search.toLowerCase()) ||
      op.displayName.toLowerCase().includes(search.toLowerCase()) ||
      op.companyName.toLowerCase().includes(search.toLowerCase())
  );

  // Update Operator Modal values when loaded
  function openManageOperator(op: Operator) {
    setSelectedOperator(op);
    setSelectedOperatorPlan(op.plan);
    setSelectedOperatorVerified(op.emailVerified);
    setAdjustAmount(0);
  }

  // PATCH operator properties
  async function handleSaveOperator(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedOperator) return;

    setUpdatingOperator(true);
    try {
      // 1. Update Profile (Plan & Verification status)
      const res = await fetch("/api/admin/operators", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          operatorId: selectedOperator.id,
          plan: selectedOperatorPlan,
          emailVerified: selectedOperatorVerified,
        }),
      });

      if (!res.ok) {
        alert("Failed to update operator details.");
        return;
      }

      const finalOperatorState = await res.json();

      // 2. Adjust credits if amount is non-zero
      if (adjustAmount !== 0) {
        const creditRes = await fetch("/api/admin/adjust-credits", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            targetUserId: selectedOperator.id,
            amount: adjustAmount,
          }),
        });

        if (creditRes.ok) {
          finalOperatorState.balance += adjustAmount;
        } else {
          alert("Operator updated, but credit adjustment failed.");
        }
      }

      setOperators((prev) =>
        prev.map((op) => (op.id === selectedOperator.id ? { ...op, ...finalOperatorState } : op))
      );
      setSelectedOperator(null);
    } catch (err) {
      console.error(err);
      alert("Error updating operator settings");
    } finally {
      setUpdatingOperator(false);
    }
  }

  // DELETE operator
  async function handleDeleteOperator(opId: string) {
    if (
      !window.confirm(
        "Are you sure you want to permanently delete this operator account? All their events, photos, and transaction logs will be permanently deleted from the database. This action cannot be undone."
      )
    ) {
      return;
    }

    setDeletingOperator(true);
    try {
      const res = await fetch(`/api/admin/operators?operatorId=${opId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setOperators((prev) => prev.filter((op) => op.id !== opId));
        setSelectedOperator(null);
        alert("Operator account deleted successfully.");
      } else {
        const d = await res.json();
        alert(d.error || "Failed to delete operator.");
      }
    } catch (err) {
      console.error(err);
      alert("Network error deleting operator.");
    } finally {
      setDeletingOperator(false);
    }
  }

  // System Presets Save
  async function handleSavePreset(e: React.FormEvent) {
    e.preventDefault();
    if (!editingPreset?.name || !editingPreset?.prompt) return;

    setSavingPreset(true);
    try {
      const res = await fetch("/api/admin/presets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingPreset.id,
          name: editingPreset.name,
          prompt: editingPreset.prompt,
          peopleTag: editingPreset.peopleTag ?? "SOLO",
          thumbnailUrl: editingPreset.thumbnailUrl || null,
          planRequired: editingPreset.planRequired || null,
          sortOrder: Number(editingPreset.sortOrder ?? 0),
        }),
      });

      if (res.ok) {
        const saved = await res.json();
        if (editingPreset.id) {
          setPresets((prev) => prev.map((p) => (p.id === saved.id ? saved : p)));
        } else {
          setPresets((prev) => [...prev, saved]);
        }
        setEditingPreset(null);
      } else {
        alert("Failed to save preset");
      }
    } catch (err) {
      console.error(err);
      alert("Network error saving preset");
    } finally {
      setSavingPreset(false);
    }
  }

  // Save Config Settings (AI keys + Razorpay settings)
  async function handleSaveSettings() {
    setSavingSettings(true);
    setSavedSettings(false);
    setSettingsError("");

    try {
      const payload = Object.entries(settings).map(([key, value]) => ({ key, value }));
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        setSettingsError("Failed to save configuration settings.");
        return;
      }

      setSavedSettings(true);
      setTimeout(() => setSavedSettings(false), 4000);

      // Re-fetch to populate updated values
      const rows: { key: string; value: string }[] = await fetch("/api/admin/settings").then((r) =>
        r.json()
      );
      const map: Record<string, string> = {};
      for (const row of rows) map[row.key] = row.value;
      setSettings((prev) => ({ ...prev, ...map }));
    } catch {
      setSettingsError("Network error saving settings.");
    } finally {
      setSavingSettings(false);
    }
  }

  return (
    <div>
      {/* Page Header */}
      <div style={{ marginBottom: "var(--space-8)" }}>
        <h1 style={{ fontFamily: "var(--font-poppins), Poppins, sans-serif", fontSize: 24, fontWeight: 700, color: "var(--text)" }}>
          Admin Panel
        </h1>
        <p style={{ color: "var(--text-muted)", fontSize: 14, marginTop: 4 }}>
          Monitor operator accounts, adjust credits, track billing status, and configure provider credentials.
        </p>
      </div>

      {/* Tabs */}
      <div
        style={{
          display: "flex",
          borderBottom: "1px solid var(--border)",
          marginBottom: "var(--space-6)",
          gap: "var(--space-1)",
          overflowX: "auto",
        }}
      >
        {(
          [
            { id: "operators", label: "👥 Operator Accounts" },
            { id: "stats", label: "📈 Stats & Transactions" },
            { id: "presets", label: "🎨 System Presets" },
            { id: "settings", label: "⚙️ App Settings" },
          ] as { id: "operators" | "stats" | "presets" | "settings"; label: string }[]
        ).map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`nav-link ${activeTab === t.id ? "active" : ""}`}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "12px 16px",
              whiteSpace: "nowrap",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* 1. Operator Accounts Tab */}
      {activeTab === "operators" && (
        <div>
          {/* Search bar */}
          <div style={{ marginBottom: "var(--space-6)" }}>
            <input
              type="text"
              className="input"
              placeholder="Search operators by email, brand name, or display name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ maxWidth: 480 }}
            />
          </div>

          {/* Accounts list */}
          <div className="card" style={{ padding: 0, overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, textAlign: "left" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)", color: "var(--text-muted)" }}>
                  <th style={{ padding: "12px 16px" }}>Operator</th>
                  <th style={{ padding: "12px 16px" }}>Company</th>
                  <th style={{ padding: "12px 16px" }}>Plan</th>
                  <th style={{ padding: "12px 16px" }}>Verification</th>
                  <th style={{ padding: "12px 16px" }}>Registered</th>
                  <th style={{ padding: "12px 16px", textAlign: "right" }}>Credits</th>
                  <th style={{ padding: "12px 16px", textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredOperators.map((op) => (
                  <tr key={op.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)", verticalAlign: "middle" }}>
                    <td style={{ padding: "16px" }}>
                      <div style={{ fontWeight: 600, color: "var(--text)" }}>{op.displayName || "No Name"}</div>
                      <div style={{ color: "var(--text-muted)", fontSize: 11 }}>{op.email}</div>
                    </td>
                    <td style={{ padding: "16px", color: "var(--text)" }}>{op.companyName || "—"}</td>
                    <td style={{ padding: "16px" }}>
                      <span className="dash-plan-badge">{op.plan}</span>
                    </td>
                    <td style={{ padding: "16px" }}>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          padding: "2px 8px",
                          borderRadius: 4,
                          background: op.emailVerified ? "rgba(52, 211, 153, 0.12)" : "rgba(248, 113, 113, 0.12)",
                          color: op.emailVerified ? "var(--success)" : "var(--error)",
                        }}
                      >
                        {op.emailVerified ? "Verified ✓" : "Unverified ✗"}
                      </span>
                    </td>
                    <td style={{ padding: "16px", color: "var(--text-muted)" }}>
                      {new Date(op.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </td>
                    <td style={{ padding: "16px", textAlign: "right", fontWeight: 700, color: op.balance < 6 ? "var(--error)" : op.balance < 15 ? "var(--accent)" : "var(--success)", fontVariantNumeric: "tabular-nums" }}>
                      {op.balance}
                    </td>
                    <td style={{ padding: "16px", textAlign: "right" }}>
                      <button onClick={() => openManageOperator(op)} className="btn btn-secondary btn-sm" style={{ minHeight: 32, padding: "4px 12px" }}>
                        ⚙️ Manage Operator
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 2. Stats & Transactions Tab */}
      {activeTab === "stats" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
          {/* Counters Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "var(--space-4)" }}>
            {[
              { label: "Total Operators", val: stats.totalOperators, icon: "👥", col: "var(--primary)" },
              { label: "Active Event Folders", val: stats.totalEvents, icon: "🎪", col: "var(--accent)" },
              { label: "Photos Generated", val: stats.totalPhotos, icon: "📸", col: "var(--success)" },
              { label: "Credits Burned", val: stats.totalCreditsSpent, icon: "⚡", col: "var(--error)" },
            ].map((card, i) => (
              <div key={i} className="card" style={{ padding: "var(--space-5)", display: "flex", alignItems: "center", gap: 16 }}>
                <div style={{ fontSize: 32 }}>{card.icon}</div>
                <div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600 }}>{card.label}</div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: card.col, marginTop: 2 }}>{card.val}</div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "var(--space-6)" }}>
            {/* Recent Payments logs */}
            <div className="card" style={{ padding: "var(--space-6)" }}>
              <h3 style={{ fontFamily: "var(--font-poppins), Poppins, sans-serif", fontSize: 15, fontWeight: 700, marginBottom: "var(--space-4)", display: "flex", alignItems: "center", gap: 8 }}>
                💳 Recent Razorpay Payments (Max 15)
              </h3>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, textAlign: "left" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--border)", color: "var(--text-muted)" }}>
                      <th style={{ padding: "8px 12px" }}>Operator Email</th>
                      <th style={{ padding: "8px 12px" }}>Razorpay Payment ID</th>
                      <th style={{ padding: "8px 12px" }}>Amount (INR)</th>
                      <th style={{ padding: "8px 12px" }}>Credits Granted</th>
                      <th style={{ padding: "8px 12px" }}>Type</th>
                      <th style={{ padding: "8px 12px" }}>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paymentsLog.map((log) => (
                      <tr key={log.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                        <td style={{ padding: "10px 12px" }}>
                          <span style={{ fontWeight: 600 }}>{log.userDisplayName || "—"}</span>
                          <div style={{ color: "var(--text-muted)", fontSize: 10 }}>{log.userEmail}</div>
                        </td>
                        <td style={{ padding: "10px 12px", fontFamily: "monospace" }}>{log.razorpayPaymentId}</td>
                        <td style={{ padding: "10px 12px", fontWeight: 700, color: "var(--success)" }}>₹{log.amountInr.toLocaleString("en-IN")}</td>
                        <td style={{ padding: "10px 12px", color: "var(--primary)", fontWeight: 600 }}>+{log.creditsGranted}</td>
                        <td style={{ padding: "10px 12px" }}>
                          <span style={{ fontSize: 10, padding: "2px 6px", borderRadius: 4, background: log.type === "TOPUP" ? "rgba(124, 92, 255, 0.15)" : "rgba(196, 77, 255, 0.15)", color: log.type === "TOPUP" ? "var(--primary)" : "var(--primary-2)", fontWeight: 700 }}>
                            {log.type}
                          </span>
                        </td>
                        <td style={{ padding: "10px 12px", color: "var(--text-muted)" }}>
                          {new Date(log.createdAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                        </td>
                      </tr>
                    ))}
                    {paymentsLog.length === 0 && (
                      <tr>
                        <td colSpan={6} style={{ padding: 24, textAlign: "center", color: "var(--text-muted)" }}>No payments recorded yet.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Credit Ledger logs */}
            <div className="card" style={{ padding: "var(--space-6)" }}>
              <h3 style={{ fontFamily: "var(--font-poppins), Poppins, sans-serif", fontSize: 15, fontWeight: 700, marginBottom: "var(--space-4)", display: "flex", alignItems: "center", gap: 8 }}>
                ⚡ Recent Credit Ledger History (Max 15)
              </h3>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, textAlign: "left" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--border)", color: "var(--text-muted)" }}>
                      <th style={{ padding: "8px 12px" }}>Operator</th>
                      <th style={{ padding: "8px 12px" }}>Change</th>
                      <th style={{ padding: "8px 12px" }}>Reason</th>
                      <th style={{ padding: "8px 12px" }}>Reference ID</th>
                      <th style={{ padding: "8px 12px" }}>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ledgerLog.map((log) => {
                      const isAddition = log.delta > 0;
                      return (
                        <tr key={log.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                          <td style={{ padding: "10px 12px" }}>
                            <span style={{ fontWeight: 600 }}>{log.userDisplayName || "—"}</span>
                            <div style={{ color: "var(--text-muted)", fontSize: 10 }}>{log.userEmail}</div>
                          </td>
                          <td style={{ padding: "10px 12px", fontWeight: 700, color: isAddition ? "var(--success)" : "var(--error)" }}>
                            {isAddition ? `+${log.delta}` : log.delta}
                          </td>
                          <td style={{ padding: "10px 12px", fontSize: 11, fontWeight: 600 }}>{log.reason}</td>
                          <td style={{ padding: "10px 12px", fontFamily: "monospace", color: "var(--text-muted)", fontSize: 11 }}>
                            {log.refId}
                          </td>
                          <td style={{ padding: "10px 12px", color: "var(--text-muted)" }}>
                            {new Date(log.createdAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                          </td>
                        </tr>
                      );
                    })}
                    {ledgerLog.length === 0 && (
                      <tr>
                        <td colSpan={5} style={{ padding: 24, textAlign: "center", color: "var(--text-muted)" }}>No ledger updates found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. System Presets Tab */}
      {activeTab === "presets" && (
        <div>
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "var(--space-6)" }}>
            <button
              onClick={() =>
                setEditingPreset({
                  name: "",
                  prompt: "",
                  peopleTag: "SOLO",
                  thumbnailUrl: "",
                  planRequired: null,
                  sortOrder: 0,
                })
              }
              className="btn btn-primary btn-sm"
            >
              + Add System Preset
            </button>
          </div>

          <div className="card" style={{ padding: 0, overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, textAlign: "left" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)", color: "var(--text-muted)" }}>
                  <th style={{ padding: "12px 16px" }}>Preview</th>
                  <th style={{ padding: "12px 16px" }}>Name</th>
                  <th style={{ padding: "12px 16px" }}>Tag</th>
                  <th style={{ padding: "12px 16px" }}>Plan Limit</th>
                  <th style={{ padding: "12px 16px" }}>Order</th>
                  <th style={{ padding: "12px 16px", textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {presets.map((preset) => (
                  <tr key={preset.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                    <td style={{ padding: "12px 16px" }}>
                      <div style={{ width: 44, height: 44, borderRadius: "var(--radius-sm)", background: "var(--surface-2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, overflow: "hidden" }}>
                        {preset.thumbnailUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={preset.thumbnailUrl} alt={preset.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        ) : (
                          "🎨"
                        )}
                      </div>
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <div style={{ fontWeight: 600, color: "var(--text)" }}>{preset.name}</div>
                      <div style={{ color: "var(--text-muted)", fontSize: 11, maxWidth: 360, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {preset.prompt}
                      </div>
                    </td>
                    <td style={{ padding: "12px 16px", color: "var(--text)" }}>{preset.peopleTag}</td>
                    <td style={{ padding: "12px 16px", color: "var(--accent)", fontWeight: 600 }}>
                      {preset.planRequired ? `${preset.planRequired}+` : "All"}
                    </td>
                    <td style={{ padding: "12px 16px", color: "var(--text)" }}>{preset.sortOrder}</td>
                    <td style={{ padding: "12px 16px", textAlign: "right" }}>
                      <button onClick={() => setEditingPreset(preset)} className="btn btn-secondary btn-sm" style={{ minHeight: 32, padding: "4px 12px" }}>
                        ✏️ Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. Configuration & App Settings Tab */}
      {activeTab === "settings" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
          {/* AI Settings Section */}
          <div className="card" style={{ padding: "var(--space-6)" }}>
            <h3 style={{ fontFamily: "var(--font-poppins), Poppins, sans-serif", fontSize: 16, fontWeight: 700, color: "var(--text)", marginBottom: "var(--space-4)", display: "flex", alignItems: "center", gap: 8 }}>
              🤖 AI Engine Configuration
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
              <div className="form-group">
                <label className="form-label">Active AI Model</label>
                <select
                  id="active-model-select"
                  className="form-input"
                  value={settings.active_model}
                  onChange={(e) => setSettings((prev) => ({ ...prev, active_model: e.target.value }))}
                >
                  <optgroup label="Google">
                    <option value="gemini-2.5-flash-image">Gemini 2.5 Flash (Image Gen) ← Default</option>
                    <option value="gemini-3.1-flash-image">Gemini 3.1 Flash (Image Gen)</option>
                    <option value="imagen-4.0-generate-001">Google Imagen 4</option>
                  </optgroup>
                  <optgroup label="OpenAI">
                    <option value="dall-e-3">DALL·E 3</option>
                  </optgroup>
                  <optgroup label="Black Forest Labs (fal.ai)">
                    <option value="fal-ai/flux/dev">FLUX.1 Dev</option>
                    <option value="fal-ai/bfl/flux-pro">Black Forest Labs FLUX Pro</option>
                  </optgroup>
                </select>
                <div style={{ marginTop: 6, fontSize: 12, color: "var(--accent)" }}>
                  ⚠️ Custom models require adapter code. Only Gemini (Google Studio) is built-in.
                </div>
              </div>

              {([
                { key: "gemini_api_key", label: "Google Gemini / Imagen API Key", placeholder: "AIzaSy…", hint: "aistudio.google.com" },
                { key: "openai_api_key", label: "OpenAI API Key (DALL·E)", placeholder: "sk-proj-…", hint: "platform.openai.com" },
                { key: "fal_api_key", label: "fal.ai API Key (FLUX Dev)", placeholder: "fal_…", hint: "fal.ai" },
                { key: "replicate_api_key", label: "Replicate API Key", placeholder: "r8_…", hint: "replicate.com" },
              ] as { key: string; label: string; placeholder: string; hint: string }[]).map((field) => (
                <div key={field.key} className="form-group">
                  <label className="form-label" style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>{field.label}</span>
                    <span style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 400 }}>{field.hint}</span>
                  </label>
                  <input
                    id={`api-key-${field.key}`}
                    type="password"
                    className="form-input"
                    value={settings[field.key] ?? ""}
                    onChange={(e) => setSettings((prev) => ({ ...prev, [field.key]: e.target.value }))}
                    placeholder={field.placeholder}
                    autoComplete="off"
                    style={{ fontFamily: "monospace", fontSize: 13 }}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Razorpay gateway Section */}
          <div className="card" style={{ padding: "var(--space-6)" }}>
            <h3 style={{ fontFamily: "var(--font-poppins), Poppins, sans-serif", fontSize: 16, fontWeight: 700, color: "var(--text)", marginBottom: "var(--space-4)", display: "flex", alignItems: "center", gap: 8 }}>
              💳 Razorpay Payment Gateway Settings
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
              <div className="form-group">
                <label className="form-label" style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Razorpay API Key ID</span>
                  <span style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 400 }}>rzp_test_... or rzp_live_...</span>
                </label>
                <input
                  id="razorpay-key-id"
                  type="password"
                  className="form-input"
                  value={settings.razorpay_key_id ?? ""}
                  onChange={(e) => setSettings((prev) => ({ ...prev, razorpay_key_id: e.target.value }))}
                  placeholder="rzp_test_SA2THcAuaIS3hP"
                  autoComplete="off"
                  style={{ fontFamily: "monospace", fontSize: 13 }}
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Razorpay Key Secret</span>
                  <span style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 400 }}>Private credential key</span>
                </label>
                <input
                  id="razorpay-key-secret"
                  type="password"
                  className="form-input"
                  value={settings.razorpay_key_secret ?? ""}
                  onChange={(e) => setSettings((prev) => ({ ...prev, razorpay_key_secret: e.target.value }))}
                  placeholder="••••••••••••••••"
                  autoComplete="off"
                  style={{ fontFamily: "monospace", fontSize: 13 }}
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Webhook Secret (optional)</span>
                  <span style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 400 }}>For signature verification</span>
                </label>
                <input
                  id="razorpay-webhook-secret"
                  type="password"
                  className="form-input"
                  value={settings.razorpay_webhook_secret ?? ""}
                  onChange={(e) => setSettings((prev) => ({ ...prev, razorpay_webhook_secret: e.target.value }))}
                  placeholder="Webhook secret token"
                  autoComplete="off"
                  style={{ fontFamily: "monospace", fontSize: 13 }}
                />
              </div>

              <div style={{ borderTop: "1px solid var(--border)", paddingTop: "var(--space-4)", marginTop: "var(--space-2)" }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 12 }}>
                  📦 Razorpay Subscription Plan IDs
                </div>
                
                <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
                  <div className="form-group">
                    <label className="form-label" style={{ display: "flex", justifyContent: "space-between" }}>
                      <span>Starter Plan ID</span>
                      <span style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 400 }}>Starter plan ID from Razorpay</span>
                    </label>
                    <input
                      id="razorpay-plan-starter"
                      type="text"
                      className="form-input"
                      value={settings.razorpay_plan_starter ?? ""}
                      onChange={(e) => setSettings((prev) => ({ ...prev, razorpay_plan_starter: e.target.value }))}
                      placeholder="e.g. plan_N3v8Y7mZk854N"
                      style={{ fontFamily: "monospace", fontSize: 13 }}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ display: "flex", justifyContent: "space-between" }}>
                      <span>Pro Plan ID</span>
                      <span style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 400 }}>Pro plan ID from Razorpay</span>
                    </label>
                    <input
                      id="razorpay-plan-pro"
                      type="text"
                      className="form-input"
                      value={settings.razorpay_plan_pro ?? ""}
                      onChange={(e) => setSettings((prev) => ({ ...prev, razorpay_plan_pro: e.target.value }))}
                      placeholder="e.g. plan_N3v9P9mZk854N"
                      style={{ fontFamily: "monospace", fontSize: 13 }}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ display: "flex", justifyContent: "space-between" }}>
                      <span>Business Plan ID</span>
                      <span style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 400 }}>Business plan ID from Razorpay</span>
                    </label>
                    <input
                      id="razorpay-plan-business"
                      type="text"
                      className="form-input"
                      value={settings.razorpay_plan_business ?? ""}
                      onChange={(e) => setSettings((prev) => ({ ...prev, razorpay_plan_business: e.target.value }))}
                      placeholder="e.g. plan_N3vA01mZk854N"
                      style={{ fontFamily: "monospace", fontSize: 13 }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {settingsError && <div className="auth-error">{settingsError}</div>}
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-4)" }}>
            <button
              id="save-settings-btn"
              className="btn btn-primary"
              disabled={savingSettings}
              onClick={handleSaveSettings}
            >
              {savingSettings ? "Saving…" : "💾 Save System Settings"}
            </button>
            {savedSettings && <span style={{ color: "var(--success)", fontWeight: 600 }}>✓ Saved — active immediately</span>}
          </div>
        </div>
      )}

      {/* ── Manage Operator Modal ── */}
      {selectedOperator && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 100,
            background: "rgba(0,0,0,0.7)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedOperator(null);
          }}
        >
          <div className="card" style={{ width: "100%", maxWidth: 480, padding: "var(--space-8)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "var(--space-4)" }}>
              <div>
                <h2 style={{ fontFamily: "var(--font-poppins), Poppins, sans-serif", fontSize: 18, fontWeight: 700 }}>
                  Manage Operator
                </h2>
                <div style={{ color: "var(--text-muted)", fontSize: 12, marginTop: 4 }}>
                  {selectedOperator.displayName || "No Display Name"} ({selectedOperator.email})
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOperator(null)}
                style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: 20, cursor: "pointer" }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveOperator} style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
              {/* Plan Tier selection */}
              <div className="form-group">
                <label className="form-label">Subscription Plan</label>
                <select
                  className="form-input"
                  value={selectedOperatorPlan}
                  onChange={(e) => setSelectedOperatorPlan(e.target.value as Plan)}
                >
                  <option value="TRIAL">Trial (Free)</option>
                  <option value="STARTER">Starter</option>
                  <option value="PRO">Pro</option>
                  <option value="BUSINESS">Business</option>
                </select>
              </div>

              {/* Email Verification status */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "10px 14px",
                  background: "var(--surface-2)",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid var(--border)",
                  marginTop: 4,
                }}
              >
                <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text-muted)" }}>Email Verified</span>
                <label className="toggle-switch" style={{ display: "inline-flex", alignItems: "center", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={selectedOperatorVerified}
                    onChange={(e) => setSelectedOperatorVerified(e.target.checked)}
                    style={{ display: "none" }}
                  />
                  <div
                    style={{
                      width: 40,
                      height: 20,
                      background: selectedOperatorVerified ? "var(--success)" : "var(--border)",
                      borderRadius: 999,
                      position: "relative",
                      transition: "background-color 0.2s",
                    }}
                  >
                    <div
                      style={{
                        width: 16,
                        height: 16,
                        background: "#fff",
                        borderRadius: "50%",
                        position: "absolute",
                        top: 2,
                        left: selectedOperatorVerified ? 22 : 2,
                        transition: "left 0.2s",
                      }}
                    />
                  </div>
                </label>
              </div>

              {/* Credits Adjustments (Delta change) */}
              <div style={{ borderTop: "1px solid var(--border)", paddingTop: "var(--space-4)", marginTop: "var(--space-2)" }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
                  ⚡ Credits Management
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>Adjustment delta (positive to grant, negative to deduct)</span>
                    <span style={{ fontWeight: 600, color: selectedOperator.balance < 6 ? "var(--error)" : "var(--success)" }}>
                      Current: {selectedOperator.balance}
                    </span>
                  </label>
                  <input
                    type="number"
                    className="form-input"
                    placeholder="e.g. 50 or -25 (0 to keep unchanged)"
                    value={adjustAmount === 0 ? "" : adjustAmount}
                    onChange={(e) => setAdjustAmount(Number(e.target.value))}
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  borderTop: "1px solid var(--border)",
                  paddingTop: "var(--space-4)",
                  marginTop: "var(--space-4)",
                }}
              >
                {/* Delete button (Danger Zone) */}
                <button
                  type="button"
                  className="btn btn-destructive btn-sm"
                  style={{ minHeight: 36 }}
                  disabled={deletingOperator || updatingOperator}
                  onClick={() => handleDeleteOperator(selectedOperator.id)}
                >
                  {deletingOperator ? "Deleting..." : "🗑 Suspend Account"}
                </button>

                <div style={{ display: "flex", gap: "var(--space-2)" }}>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    style={{ minHeight: 36 }}
                    onClick={() => setSelectedOperator(null)}
                    disabled={updatingOperator || deletingOperator}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary btn-sm"
                    style={{ minHeight: 36 }}
                    disabled={updatingOperator || deletingOperator}
                  >
                    {updatingOperator ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Preset edit/create Modal */}
      {editingPreset && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 100,
            background: "rgba(0,0,0,0.7)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setEditingPreset(null);
          }}
        >
          <div className="card" style={{ width: "100%", maxWidth: 520, padding: "var(--space-8)" }}>
            <h2 style={{ fontFamily: "var(--font-poppins), Poppins, sans-serif", fontSize: 18, fontWeight: 700, marginBottom: "var(--space-6)" }}>
              {editingPreset.id ? "Edit System Preset" : "Add System Preset"}
            </h2>
            <form onSubmit={handleSavePreset} style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
              <div className="form-group">
                <label className="form-label">Preset Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={editingPreset.name || ""}
                  onChange={(e) => setEditingPreset((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g. Cyber Neon"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Transformation Prompt</label>
                <textarea
                  className="form-input"
                  value={editingPreset.prompt || ""}
                  onChange={(e) => setEditingPreset((prev) => ({ ...prev, prompt: e.target.value }))}
                  placeholder="Attire/background description used for AI portrait rendering..."
                  style={{ minHeight: 80, resize: "vertical" }}
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">People Tag</label>
                  <select
                    className="form-input"
                    value={editingPreset.peopleTag || "SOLO"}
                    onChange={(e) => setEditingPreset((prev) => ({ ...prev, peopleTag: e.target.value as PeopleTag }))}
                  >
                    <option value="SOLO">Solo</option>
                    <option value="COUPLE">Couple</option>
                    <option value="GROUP">Group</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Required Plan</label>
                  <select
                    className="form-input"
                    value={editingPreset.planRequired || ""}
                    onChange={(e) =>
                      setEditingPreset((prev) => ({
                        ...prev,
                        planRequired: (e.target.value || null) as Plan | null,
                      }))
                    }
                  >
                    <option value="">All Tiers</option>
                    <option value="STARTER">Starter+</option>
                    <option value="PRO">Pro+</option>
                    <option value="BUSINESS">Business only</option>
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Thumbnail URL (optional)</label>
                  <input
                    type="text"
                    className="form-input"
                    value={editingPreset.thumbnailUrl || ""}
                    onChange={(e) => setEditingPreset((prev) => ({ ...prev, thumbnailUrl: e.target.value }))}
                    placeholder="https://..."
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Sort Order</label>
                  <input
                    type="number"
                    className="form-input"
                    value={editingPreset.sortOrder ?? 0}
                    onChange={(e) => setEditingPreset((prev) => ({ ...prev, sortOrder: Number(e.target.value) }))}
                  />
                </div>
              </div>

              <div style={{ display: "flex", gap: "var(--space-3)", justifyContent: "flex-end", marginTop: "var(--space-4)" }}>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setEditingPreset(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-sm" disabled={savingPreset}>
                  {savingPreset ? "Saving..." : "Save Preset"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
