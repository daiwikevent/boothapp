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
  plan: string;
  createdAt: string;
  balance: number;
}

interface Props {
  initialSystemPresets: Preset[];
  initialOperators: Operator[];
}

export default function AdminClient({ initialSystemPresets, initialOperators }: Props) {
  const [activeTab, setActiveTab] = useState<"operators" | "presets" | "ai-settings">("operators");
  const [operators, setOperators] = useState<Operator[]>(initialOperators);
  const [presets, setPresets] = useState<Preset[]>(initialSystemPresets);

  // Search filter
  const [search, setSearch] = useState("");

  // Credit adjustment states
  const [selectedOperator, setSelectedOperator] = useState<Operator | null>(null);
  const [adjustAmount, setAdjustAmount] = useState<number>(0);
  const [adjusting, setAdjusting] = useState(false);

  // Preset form states
  const [editingPreset, setEditingPreset] = useState<Partial<Preset> | null>(null);
  const [savingPreset, setSavingPreset] = useState(false);

  // AI Settings state
  const [aiSettings, setAiSettings] = useState<Record<string, string>>({
    gemini_api_key: "",
    openai_api_key: "",
    fal_api_key: "",
    replicate_api_key: "",
    ideogram_api_key: "",
    midjourney_api_key: "",
    active_model: "gemini-2.5-flash-image",
  });
  const [savingAi, setSavingAi] = useState(false);
  const [savedAi, setSavedAi] = useState(false);
  const [aiError, setAiError] = useState("");

  useEffect(() => {
    fetch("/api/admin/settings")
      .then(r => r.ok ? r.json() : [])
      .then((rows: { key: string; value: string }[]) => {
        const map: Record<string, string> = {};
        for (const row of rows) map[row.key] = row.value;
        setAiSettings(prev => ({ ...prev, ...map }));
      });
  }, []);

  const filteredOperators = operators.filter(
    (op) =>
      op.email.toLowerCase().includes(search.toLowerCase()) ||
      op.displayName.toLowerCase().includes(search.toLowerCase()) ||
      op.companyName.toLowerCase().includes(search.toLowerCase())
  );

  async function handleAdjustCredits(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedOperator || adjustAmount === 0) return;

    setAdjusting(true);
    try {
      const res = await fetch("/api/admin/adjust-credits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetUserId: selectedOperator.id,
          amount: adjustAmount,
        }),
      });

      if (res.ok) {
        setOperators((prev) =>
          prev.map((op) =>
            op.id === selectedOperator.id ? { ...op, balance: op.balance + adjustAmount } : op
          )
        );
        alert(`Successfully adjusted credits for ${selectedOperator.email}`);
        setSelectedOperator(null);
        setAdjustAmount(0);
      } else {
        alert("Failed to adjust credits");
      }
    } catch (err) {
      console.error(err);
      alert("Network error adjusting credits");
    } finally {
      setAdjusting(false);
    }
  }

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

  return (
    <div>
      {/* Page Header */}
      <div style={{ marginBottom: "var(--space-8)" }}>
        <h1 style={{ fontFamily: "var(--font-poppins), Poppins, sans-serif", fontSize: 24, fontWeight: 700, color: "var(--text)" }}>
          Admin Panel
        </h1>
        <p style={{ color: "var(--text-muted)", fontSize: 14, marginTop: 4 }}>
          Adjust operator credits, monitor user accounts, and update system style libraries.
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", borderBottom: "1px solid var(--border)", marginBottom: "var(--space-6)", gap: "var(--space-1)" }}>
        <button onClick={() => setActiveTab("operators")} className={`nav-link ${activeTab === "operators" ? "active" : ""}`} style={{ background: "none", border: "none", cursor: "pointer", padding: "12px 16px" }}>👥 Operator Accounts</button>
        <button onClick={() => setActiveTab("presets")} className={`nav-link ${activeTab === "presets" ? "active" : ""}`} style={{ background: "none", border: "none", cursor: "pointer", padding: "12px 16px" }}>🎨 System Presets</button>
        <button onClick={() => setActiveTab("ai-settings")} className={`nav-link ${activeTab === "ai-settings" ? "active" : ""}`} style={{ background: "none", border: "none", cursor: "pointer", padding: "12px 16px" }}>🤖 AI Settings</button>
      </div>

      {/* Operator Accounts Tab */}
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
                    <td style={{ padding: "16px", color: "var(--text-muted)" }}>
                      {new Date(op.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </td>
                    <td style={{ padding: "16px", textAlign: "right", fontWeight: 700, color: op.balance < 6 ? "var(--error)" : op.balance < 15 ? "var(--accent)" : "var(--success)", fontVariantNumeric: "tabular-nums" }}>
                      {op.balance}
                    </td>
                    <td style={{ padding: "16px", textAlign: "right" }}>
                      <button onClick={() => setSelectedOperator(op)} className="btn btn-secondary btn-sm" style={{ minHeight: 32, padding: "4px 12px" }}>
                        ⚡ Adjust Credits
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* System Presets Tab */}
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

      {/* ── AI Settings Tab ── */}
      {activeTab === "ai-settings" && (
        <div style={{ maxWidth: 720 }}>
          <p style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: "var(--space-6)" }}>
            Configure the active AI model and provider API keys. Changes take effect within 60 seconds. Masked values (••••) are preserved on save.
          </p>
          <div className="card" style={{ padding: "var(--space-6)", marginBottom: "var(--space-6)" }}>
            <h3 style={{ fontFamily: "var(--font-poppins), Poppins, sans-serif", fontSize: 15, fontWeight: 700, color: "var(--text)", marginBottom: "var(--space-4)" }}>🤖 Active AI Model</h3>
            <div className="form-group">
              <label className="form-label">Model</label>
              <select id="active-model-select" className="form-input" value={aiSettings.active_model} onChange={e => setAiSettings(prev => ({ ...prev, active_model: e.target.value }))}>
                <optgroup label="Google">
                  <option value="gemini-2.5-flash-image">Gemini 2.5 Flash (Image Gen) ← Default</option>
                  <option value="gemini-3.1-flash-image">Gemini 3.1 Flash (Image Gen)</option>
                  <option value="imagen-4.0-generate-001">Google Imagen 4</option>
                </optgroup>
                <optgroup label="OpenAI">
                  <option value="gpt-image-1">GPT Image 1</option>
                  <option value="dall-e-3">DALL·E 3</option>
                </optgroup>
                <optgroup label="Black Forest Labs (fal.ai)">
                  <option value="fal-ai/flux/kontext-max">FLUX.1 Kontext Max</option>
                  <option value="fal-ai/flux/kontext-pro">FLUX.1 Kontext Pro</option>
                  <option value="fal-ai/flux/dev">FLUX.1 Dev</option>
                  <option value="fal-ai/bfl/flux-pro">Black Forest Labs FLUX Pro</option>
                </optgroup>
                <optgroup label="Ideogram">
                  <option value="ideogram-v3">Ideogram 3.0</option>
                </optgroup>
                <optgroup label="Recraft">
                  <option value="recraft-v4">Recraft V4</option>
                </optgroup>
                <optgroup label="Stability AI">
                  <option value="stable-diffusion-3.5-large">Stable Diffusion 3.5 Large</option>
                </optgroup>
                <optgroup label="Midjourney">
                  <option value="midjourney-v8">Midjourney V8</option>
                </optgroup>
                <optgroup label="HiDream">
                  <option value="hidream-i1">HiDream-I1</option>
                </optgroup>
                <optgroup label="Reve">
                  <option value="reve-image-1">Reve Image</option>
                </optgroup>
                <optgroup label="Identity-preserving">
                  <option value="instantid">InstantID (face consistency)</option>
                  <option value="pulid">PuLID (identity preservation)</option>
                  <option value="omnigen">OmniGen</option>
                </optgroup>
              </select>
              <div style={{ marginTop: 8, fontSize: 12, color: "var(--accent)" }}>⚠️ Non-Gemini models require matching API key + adapter code. Only Gemini is currently implemented.</div>
            </div>
          </div>

          <div className="card" style={{ padding: "var(--space-6)", marginBottom: "var(--space-6)" }}>
            <h3 style={{ fontFamily: "var(--font-poppins), Poppins, sans-serif", fontSize: 15, fontWeight: 700, color: "var(--text)", marginBottom: "var(--space-4)" }}>🔑 Provider API Keys</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
              {([
                { key: "gemini_api_key", label: "Google Gemini / Imagen", placeholder: "AIzaSy…", hint: "aistudio.google.com" },
                { key: "openai_api_key", label: "OpenAI (GPT Image / DALL·E)", placeholder: "sk-proj-…", hint: "platform.openai.com" },
                { key: "fal_api_key", label: "fal.ai (FLUX, HiDream, Reve, InstantID)", placeholder: "fal_…", hint: "fal.ai" },
                { key: "replicate_api_key", label: "Replicate (Midjourney, SD 3.5, PuLID, OmniGen)", placeholder: "r8_…", hint: "replicate.com" },
                { key: "ideogram_api_key", label: "Ideogram 3.0", placeholder: "ideo_…", hint: "ideogram.ai" },
                { key: "midjourney_api_key", label: "Midjourney (direct API)", placeholder: "mj_…", hint: "docs.midjourney.com" },
              ] as { key: string; label: string; placeholder: string; hint: string }[]).map(field => (
                <div key={field.key} className="form-group">
                  <label className="form-label" style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>{field.label}</span>
                    <span style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 400 }}>{field.hint}</span>
                  </label>
                  <input
                    id={`api-key-${field.key}`}
                    type="password"
                    className="form-input"
                    value={aiSettings[field.key] ?? ""}
                    onChange={e => setAiSettings(prev => ({ ...prev, [field.key]: e.target.value }))}
                    placeholder={field.placeholder}
                    autoComplete="off"
                    style={{ fontFamily: "monospace", fontSize: 13 }}
                  />
                </div>
              ))}
            </div>
          </div>

          {aiError && <div className="auth-error" style={{ marginBottom: "var(--space-4)" }}>{aiError}</div>}
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-4)" }}>
            <button id="save-ai-settings-btn" className="btn btn-primary" disabled={savingAi}
              onClick={async () => {
                setSavingAi(true); setSavedAi(false); setAiError("");
                try {
                  const payload = Object.entries(aiSettings).map(([key, value]) => ({ key, value }));
                  const res = await fetch("/api/admin/settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
                  if (!res.ok) { setAiError("Failed to save"); return; }
                  setSavedAi(true);
                  setTimeout(() => setSavedAi(false), 4000);
                  const rows: { key: string; value: string }[] = await fetch("/api/admin/settings").then(r => r.json());
                  const map: Record<string, string> = {};
                  for (const row of rows) map[row.key] = row.value;
                  setAiSettings(prev => ({ ...prev, ...map }));
                } catch { setAiError("Network error"); }
                finally { setSavingAi(false); }
              }}>
              {savingAi ? "Saving…" : "💾 Save AI Settings"}
            </button>
            {savedAi && <span style={{ color: "var(--success)", fontWeight: 600 }}>✓ Saved — active within 60s</span>}
          </div>
        </div>
      )}

      {/* Credit adjustment Modal */}

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
          <div className="card" style={{ width: "100%", maxWidth: 400, padding: "var(--space-8)" }}>
            <h2 style={{ fontFamily: "var(--font-poppins), Poppins, sans-serif", fontSize: 18, fontWeight: 700, marginBottom: "var(--space-2)" }}>
              Adjust Credits
            </h2>
            <p style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: "var(--space-4)" }}>
              Deduct or grant credits for <strong style={{ color: "var(--text)" }}>{selectedOperator.email}</strong>.
            </p>
            <form onSubmit={handleAdjustCredits} style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
              <div className="form-group">
                <label className="form-label">Adjustment Delta (positive to grant, negative to deduct)</label>
                <input
                  type="number"
                  className="form-input"
                  placeholder="e.g. 30 or -15"
                  value={adjustAmount === 0 ? "" : adjustAmount}
                  onChange={(e) => setAdjustAmount(Number(e.target.value))}
                  autoFocus
                  required
                />
              </div>

              <div style={{ display: "flex", gap: "var(--space-3)", justifyContent: "flex-end", marginTop: "var(--space-2)" }}>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setSelectedOperator(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-sm" disabled={adjusting || adjustAmount === 0}>
                  {adjusting ? "Adjusting..." : "Confirm"}
                </button>
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
