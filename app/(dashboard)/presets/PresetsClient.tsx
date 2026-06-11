"use client";

import { useState } from "react";
import type { Preset, PeopleTag } from "@prisma/client";
import type { Plan } from "@/lib/db-scoped";

interface Props {
  initialPresets: Preset[];
  currentPlan: Plan;
  features?: {
    hasCustomPresets: boolean;
    hasCustomLogo: boolean;
    hasNoWatermark: boolean;
    hasCsvReports: boolean;
    hasAttendantPin: boolean;
  };
}

const TAG_LABELS: Record<string, string> = { SOLO: "Solo", COUPLE: "Couple", GROUP: "Group" };
const TAG_COLORS: Record<string, string> = {
  SOLO: "rgba(124, 92, 255, 0.85)",
  COUPLE: "rgba(196, 77, 255, 0.85)",
  GROUP: "rgba(52, 211, 153, 0.85)",
};

const PRESET_EMOJIS: Record<string, string> = {
  "Royal Rajasthan": "👑",
  "Mehandi Garden": "🌿",
  "Sangeet Glam": "✨",
  "Haldi Glow": "💛",
  "South Indian Temple Classic": "🛕",
  "Vintage Mumbai Retro": "📽️",
  "Classic Studio B&W": "⚫",
  "Executive Headshot Pro": "💼",
  "Cyber Neon Night": "🌃",
  "Royal Oil Painting": "🖼️",
  "Little Astronaut": "🚀",
  "Jungle Explorer": "🦁",
  "Cricket Star": "🏏",
  "Bollywood Retro Poster": "🎬",
  "Monsoon Romance": "🌧️",
};

export default function PresetsClient({ initialPresets, currentPlan, features }: Props) {
  const [presets, setPresets] = useState<Preset[]>(initialPresets);
  const [editingPreset, setEditingPreset] = useState<Partial<Preset> | null>(null);
  const [savingPreset, setSavingPreset] = useState(false);
  const [saveError, setSaveError] = useState("");
  
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  const isProOrPlus = features?.hasCustomPresets ?? (currentPlan === "PRO" || currentPlan === "BUSINESS");

  // Group by people tag
  const grouped = presets.reduce<Record<string, Preset[]>>((acc, p) => {
    const key = p.peopleTag;
    if (!acc[key]) acc[key] = [];
    acc[key].push(p);
    return acc;
  }, {});

  const systemPresets = presets.filter((p) => !p.ownerId);
  const customPresets = presets.filter((p) => p.ownerId);

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadError("");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/files/upload", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        setEditingPreset((prev) => prev ? { ...prev, thumbnailUrl: data.url } : null);
      } else {
        const errData = await res.json();
        setUploadError(errData.error || "Failed to upload image.");
      }
    } catch (err) {
      console.error(err);
      setUploadError("Network error uploading image.");
    } finally {
      setUploading(false);
    }
  }

  async function handleSavePreset(e: React.FormEvent) {
    e.preventDefault();
    if (!editingPreset?.name || !editingPreset?.prompt) return;

    setSavingPreset(true);
    setSaveError("");

    const method = editingPreset.id ? "PATCH" : "POST";
    const endpoint = editingPreset.id ? `/api/presets/${editingPreset.id}` : "/api/presets";

    try {
      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editingPreset.name,
          prompt: editingPreset.prompt,
          peopleTag: editingPreset.peopleTag ?? "SOLO",
          thumbnailUrl: editingPreset.thumbnailUrl || null,
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
        const errData = await res.json();
        setSaveError(errData.error || "Failed to save preset.");
      }
    } catch (err) {
      console.error(err);
      setSaveError("Network error saving preset.");
    } finally {
      setSavingPreset(false);
    }
  }

  async function handleDeletePreset(presetId: string) {
    if (!confirm("Are you sure you want to delete this custom preset?")) return;

    try {
      const res = await fetch(`/api/presets/${presetId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setPresets((prev) => prev.filter((p) => p.id !== presetId));
      } else {
        alert("Failed to delete preset.");
      }
    } catch (err) {
      console.error(err);
      alert("Network error deleting preset.");
    }
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "var(--space-8)", flexWrap: "wrap", gap: 16 }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-poppins), Poppins, sans-serif", fontSize: 24, fontWeight: 700, color: "var(--text)", marginBottom: 4 }}>
            Preset Library
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: 14 }}>
            {systemPresets.length} system presets
            {customPresets.length > 0 ? ` · ${customPresets.length} custom` : ""} — assign them to events in the Events section.
          </p>
        </div>
        {isProOrPlus && (
          <button
            onClick={() =>
              setEditingPreset({
                name: "",
                prompt: "",
                peopleTag: "SOLO",
                thumbnailUrl: "",
              })
            }
            className="btn btn-primary"
            style={{ display: "flex", alignItems: "center", gap: 6 }}
          >
            <span>+</span> Add Custom Preset
          </button>
        )}
      </div>

      {/* Stats row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "var(--space-4)",
          marginBottom: "var(--space-8)",
        }}
      >
        {["SOLO", "COUPLE", "GROUP"].map((tag) => {
          const count = (grouped[tag] || []).length;
          return (
            <div key={tag} className="card" style={{ padding: "var(--space-4) var(--space-6)", display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
              <span
                style={{
                  fontSize: 11, fontWeight: 700, padding: "3px 10px",
                  background: TAG_COLORS[tag], color: "#fff",
                  borderRadius: 999, textTransform: "uppercase", letterSpacing: "0.06em", flexShrink: 0,
                }}
              >
                {TAG_LABELS[tag]}
              </span>
              <span style={{ fontSize: 22, fontWeight: 700, color: "var(--text)", fontVariantNumeric: "tabular-nums" }}>{count}</span>
              <span style={{ fontSize: 13, color: "var(--text-muted)" }}>presets</span>
            </div>
          );
        })}
      </div>

      {/* Preset grid grouped by tag */}
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-10)" }}>
        {["SOLO", "COUPLE", "GROUP"].map((tag) => {
          const tagPresets = grouped[tag] || [];
          if (tagPresets.length === 0) return null;
          return (
            <section key={tag}>
              <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", marginBottom: "var(--space-4)" }}>
                <span
                  style={{
                    fontSize: 12, fontWeight: 700, padding: "3px 12px",
                    background: TAG_COLORS[tag], color: "#fff",
                    borderRadius: 999, textTransform: "uppercase", letterSpacing: "0.06em",
                  }}
                >
                  {TAG_LABELS[tag]}
                </span>
                <h2 style={{ fontFamily: "var(--font-poppins), Poppins, sans-serif", fontSize: 16, fontWeight: 600, color: "var(--text)" }}>
                  {tag === "SOLO" ? "Solo Shots" : tag === "COUPLE" ? "Couple Portraits" : "Group Photos"}
                </h2>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
                  gap: "var(--space-4)",
                }}
              >
                {tagPresets.map((preset) => (
                  <div
                    key={preset.id}
                    className="preset-card"
                    style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}
                  >
                    <div>
                      {/* Thumbnail */}
                      <div
                        style={{
                          height: 160, background: "var(--surface-2)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 56, position: "relative", overflow: "hidden",
                        }}
                      >
                        {preset.thumbnailUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={preset.thumbnailUrl}
                            alt={preset.name}
                            style={{ width: "100%", height: "100%", objectFit: "cover" }}
                          />
                        ) : (
                          <span>{PRESET_EMOJIS[preset.name] ?? "🎨"}</span>
                        )}

                        {/* People tag chip */}
                        <span
                          style={{
                            position: "absolute", top: 8, left: 8,
                            fontSize: 10, fontWeight: 700, padding: "2px 8px",
                            background: TAG_COLORS[preset.peopleTag], color: "#fff",
                            borderRadius: 999, textTransform: "uppercase", letterSpacing: "0.05em",
                          }}
                        >
                          {TAG_LABELS[preset.peopleTag]}
                        </span>

                        {/* System badge */}
                        {!preset.ownerId && (
                          <span
                            style={{
                              position: "absolute", top: 8, right: 8,
                              fontSize: 9, fontWeight: 700, padding: "2px 6px",
                              background: "rgba(0,0,0,0.6)", color: "rgba(255,255,255,0.7)",
                              borderRadius: 4, textTransform: "uppercase",
                            }}
                          >
                            System
                          </span>
                        )}
                        
                        {/* Custom label */}
                        {preset.ownerId && (
                          <span
                            style={{
                              position: "absolute", top: 8, right: 8,
                              fontSize: 9, fontWeight: 700, padding: "2px 6px",
                              background: "var(--primary)", color: "#fff",
                              borderRadius: 4, textTransform: "uppercase",
                            }}
                          >
                            Custom
                          </span>
                        )}
                      </div>

                      {/* Info details */}
                      <div style={{ padding: "var(--space-3) var(--space-4)" }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", lineHeight: 1.3 }}>
                          {preset.name}
                        </div>
                        {preset.ownerId && (
                          <div style={{ color: "var(--text-muted)", fontSize: 11, marginTop: 4, fontStyle: "italic", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={preset.prompt}>
                            {preset.prompt}
                          </div>
                        )}
                        {preset.planRequired && (
                          <div style={{ marginTop: 4, fontSize: 11, color: "var(--accent)", fontWeight: 600 }}>
                            🔒 {preset.planRequired}+
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action buttons (only for owner) */}
                    {preset.ownerId && (
                      <div style={{ borderTop: "1px solid var(--border)", display: "flex", padding: "8px" }}>
                        <button
                          onClick={() => setEditingPreset(preset)}
                          style={{
                            flex: 1, background: "none", border: "none", cursor: "pointer", 
                            color: "var(--text-muted)", fontSize: 12, padding: "4px 0", 
                            fontWeight: 500, transition: "color 0.2s"
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text)")}
                          onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
                        >
                          ✏️ Edit
                        </button>
                        <button
                          onClick={() => handleDeletePreset(preset.id)}
                          style={{
                            flex: 1, background: "none", border: "none", cursor: "pointer", 
                            color: "var(--error)", fontSize: 12, padding: "4px 0", 
                            fontWeight: 500, opacity: 0.85, transition: "opacity 0.2s"
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
                          onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.85")}
                        >
                          🗑️ Delete
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </div>

      {/* Locked plan gate banner */}
      {!isProOrPlus && (
        <div
          className="plan-gate"
          style={{ marginTop: "var(--space-8)" }}
        >
          <span>🔒</span>
          <span>
            <strong>Custom Presets (Pro+)</strong> — Upgrade to Pro or Business to create your own AI style presets with custom prompts and thumbnails.
          </span>
        </div>
      )}

      {/* Preset Create / Edit Modal */}
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
              {editingPreset.id ? "Edit Custom Preset" : "Add Custom Preset"}
            </h2>
            <form onSubmit={handleSavePreset} style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
              {saveError && (
                <div style={{ padding: "var(--space-3) var(--space-4)", background: "rgba(248, 113, 113, 0.15)", border: "1px solid var(--error)", borderRadius: "var(--radius-sm)", color: "var(--error)", fontSize: 13, fontWeight: 500 }}>
                  ⚠️ {saveError}
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Preset Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={editingPreset.name || ""}
                  onChange={(e) => setEditingPreset((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g. Cyber Punk Wedding"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">AI Transformation Prompt</label>
                <textarea
                  className="form-input"
                  value={editingPreset.prompt || ""}
                  onChange={(e) => setEditingPreset((prev) => ({ ...prev, prompt: e.target.value }))}
                  placeholder="Attire/background description used for AI portrait rendering..."
                  style={{ minHeight: 80, resize: "vertical" }}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">People Tag</label>
                <select
                  className="form-input"
                  value={editingPreset.peopleTag || "SOLO"}
                  onChange={(e) => setEditingPreset((prev) => ({ ...prev, peopleTag: e.target.value as PeopleTag }))}
                >
                  <option value="SOLO">Solo (1 Person)</option>
                  <option value="COUPLE">Couple (2 People)</option>
                  <option value="GROUP">Group (3+ People)</option>
                </select>
              </div>

              {/* Upload Thumbnail Field */}
              <div className="form-group">
                <label className="form-label">Preset Thumbnail Image</label>
                <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 4 }}>
                  <div style={{ width: 64, height: 64, borderRadius: "var(--radius-sm)", background: "var(--surface-2)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", fontSize: 24, flexShrink: 0 }}>
                    {editingPreset.thumbnailUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={editingPreset.thumbnailUrl} alt="Thumbnail preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      "🎨"
                    )}
                  </div>
                  <div style={{ flex: 1 }}>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      style={{ fontSize: 12, width: "100%" }}
                      disabled={uploading}
                    />
                    {uploading && <div style={{ fontSize: 11, color: "var(--accent)", marginTop: 4 }}>Uploading style image...</div>}
                    {uploadError && <div style={{ fontSize: 11, color: "var(--error)", marginTop: 4 }}>{uploadError}</div>}
                    <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>Square aspect-ratio PNG/JPEG/WebP under 2MB recommended.</div>
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", gap: "var(--space-3)", justifyContent: "flex-end", marginTop: "var(--space-4)" }}>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setEditingPreset(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-sm" disabled={savingPreset || uploading}>
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
