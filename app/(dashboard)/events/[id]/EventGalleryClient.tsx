"use client";

import { useState, useEffect } from "react";
import JSZip from "jszip";
import { useSearchParams, useRouter, usePathname } from "next/navigation";

interface Photo {
  id: string;
  shortCode: string;
  status: "PROCESSING" | "DONE" | "FAILED";
  originalPath: string | null;
  outputPath: string | null;
  errorMsg: string | null;
  createdAt: string;
  expiresAt: string;
  preset?: {
    id: string;
    name: string;
  } | null;
}

interface Event {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  gdriveFolderId: string | null;
}

interface Props {
  event: Event;
  initialPhotos: Photo[];
}

interface Preset {
  id: string;
  name: string;
  peopleTag: "SOLO" | "COUPLE" | "GROUP";
  thumbnailUrl: string | null;
  ownerId: string | null;
}

const TAG_LABELS: Record<string, string> = { SOLO: "Solo", COUPLE: "Couple", GROUP: "Group" };
const TAG_COLORS: Record<string, string> = {
  SOLO: "rgba(124, 92, 255, 0.85)",
  COUPLE: "rgba(196, 77, 255, 0.85)",
  GROUP: "rgba(52, 211, 153, 0.85)",
};

export default function EventGalleryClient({ event, initialPhotos }: Props) {
  const [photos, setPhotos] = useState<Photo[]>(initialPhotos);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [zippingProgress, setZippingProgress] = useState<string | null>(null);

  // Next.js Navigation hooks
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const currentTab = searchParams.get("tab") || "gallery";

  function setActiveTab(tab: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    router.push(`${pathname}?${params.toString()}`);
  }

  // Presets state
  const [allPresets, setAllPresets] = useState<Preset[]>([]);
  const [selectedPresetIds, setSelectedPresetIds] = useState<Set<string>>(new Set());
  const [presetsLoading, setPresetsLoading] = useState(false);
  const [savingPresets, setSavingPresets] = useState(false);
  const [savedPresets, setSavedPresets] = useState(false);

  // Google Drive state
  const [gdriveLink, setGdriveLink] = useState(event.gdriveFolderId || "");
  const [gdriveEnabled, setGdriveEnabled] = useState(!!event.gdriveFolderId);
  const [savingGDrive, setSavingGDrive] = useState(false);
  const [savedGDrive, setSavedGDrive] = useState(false);
  const [gdriveError, setGdriveError] = useState("");

  async function handleRefresh() {
    setRefreshing(true);
    try {
      const res = await fetch(`/api/events/${event.id}/photos`);
      if (res.ok) {
        const data = await res.json();
        setPhotos(data);
      }
    } catch (e) {
      console.error("Failed to refresh photos:", e);
    } finally {
      setRefreshing(false);
    }
  }

  // Poll processing photos
  useEffect(() => {
    const hasProcessing = photos.some((p) => p.status === "PROCESSING");
    if (!hasProcessing) return;

    const interval = setInterval(async () => {
      const res = await fetch(`/api/events/${event.id}/photos`);
      if (res.ok) {
        const data = await res.json();
        setPhotos(data);
        const stillProcessing = data.some((p: Photo) => p.status === "PROCESSING");
        if (!stillProcessing) clearInterval(interval);
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [photos, event.id]);

  // Load presets when presets tab is open
  useEffect(() => {
    if (currentTab !== "presets") return;
    async function loadPresets() {
      setPresetsLoading(true);
      try {
        const [presetsRes, eventPresetsRes] = await Promise.all([
          fetch("/api/presets"),
          fetch(`/api/events/${event.id}/presets`),
        ]);
        const presets = await presetsRes.json();
        const linked = await eventPresetsRes.json();

        setAllPresets(Array.isArray(presets) ? presets : []);
        if (Array.isArray(linked) && linked.length > 0) {
          setSelectedPresetIds(new Set(linked.map((p: Preset) => p.id)));
        } else {
          // Default: select all system presets
          const sysIds = (Array.isArray(presets) ? presets : [])
            .filter((p: Preset) => !p.ownerId)
            .map((p: Preset) => p.id);
          setSelectedPresetIds(new Set(sysIds));
        }
      } catch (e) {
        console.error(e);
      } finally {
        setPresetsLoading(false);
      }
    }
    loadPresets();
  }, [currentTab, event.id]);

  async function handleSavePresets() {
    setSavingPresets(true);
    setSavedPresets(false);
    try {
      const res = await fetch(`/api/events/${event.id}/presets`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ presetIds: Array.from(selectedPresetIds) }),
      });
      if (res.ok) {
        setSavedPresets(true);
        setTimeout(() => setSavedPresets(false), 2500);
      } else {
        alert("Failed to save preset selection");
      }
    } catch (e) {
      console.error(e);
      alert("Error saving preset selection");
    } finally {
      setSavingPresets(false);
    }
  }

  function togglePresetId(id: string) {
    setSelectedPresetIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  async function handleSaveGDrive(e: React.FormEvent) {
    e.preventDefault();
    setSavingGDrive(true);
    setSavedGDrive(false);
    setGdriveError("");

    const folderIdToSave = gdriveEnabled ? gdriveLink.trim() : "";

    try {
      const res = await fetch(`/api/events/${event.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gdriveFolderId: folderIdToSave }),
      });

      if (!res.ok) {
        const d = await res.json();
        setGdriveError(d.error || "Failed to save Google Drive settings");
        return;
      }

      setSavedGDrive(true);
      setTimeout(() => setSavedGDrive(false), 3000);
    } catch (err) {
      console.error(err);
      setGdriveError("Failed to save Google Drive settings");
    } finally {
      setSavingGDrive(false);
    }
  }

  async function handleDelete(photoId: string) {
    if (!window.confirm("Are you sure you want to delete this photo? This will remove the files from the server permanently.")) return;
    setDeletingId(photoId);
    try {
      const res = await fetch(`/api/files/photo/${photoId}`, { method: "DELETE" });
      if (res.ok) {
        setPhotos((prev) => prev.filter((p) => p.id !== photoId));
        if (selectedPhoto?.id === photoId) setSelectedPhoto(null);
      } else {
        alert("Failed to delete photo");
      }
    } catch (e) {
      console.error(e);
      alert("Error deleting photo");
    } finally {
      setDeletingId(null);
    }
  }

  async function handleBulkDownload() {
    const donePhotos = photos.filter((p) => p.status === "DONE");
    if (donePhotos.length === 0) {
      alert("No completed photos available for download.");
      return;
    }

    setZippingProgress("Initializing zip archive...");
    const zip = new JSZip();

    try {
      for (let i = 0; i < donePhotos.length; i++) {
        const photo = donePhotos[i];
        setZippingProgress(`Downloading photo ${i + 1} of ${donePhotos.length}...`);
        
        const fileRes = await fetch(`/api/files/photo/${photo.id}`);
        if (!fileRes.ok) continue;

        const blob = await fileRes.blob();
        zip.file(`boothmagic-${photo.shortCode}.jpg`, blob);
      }

      setZippingProgress("Compressing files...");
      const content = await zip.generateAsync({ type: "blob" });
      
      const link = document.createElement("a");
      link.href = URL.createObjectURL(content);
      link.download = `boothmagic-gallery-${event.slug}-${Date.now()}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.error(e);
      alert("Failed to compile ZIP file.");
    } finally {
      setZippingProgress(null);
    }
  }

  function getExpiryLabel(expiresAtStr: string) {
    const expiresAt = new Date(expiresAtStr).getTime();
    const now = Date.now();
    const diffMs = expiresAt - now;
    if (diffMs <= 0) return "Expired";
    const hours = Math.max(0, Math.round(diffMs / (1000 * 60 * 60)));
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days}d left`;
    }
    return `${hours}h left`;
  }

  return (
    <div style={{ marginTop: "var(--space-6)" }}>
      {/* Tab navigation */}
      <div style={{ display: "flex", gap: "var(--space-4)", borderBottom: "1px solid var(--border)", marginBottom: "var(--space-6)" }}>
        {[
          { id: "gallery", label: "📸 Gallery" },
          { id: "presets", label: "🎨 Presets" },
          { id: "gdrive", label: "☁️ Google Drive" }
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            style={{
              background: "none", border: "none",
              color: currentTab === t.id ? "var(--primary)" : "var(--text-muted)",
              fontWeight: 600, fontSize: 14, cursor: "pointer",
              padding: "8px 16px 12px", position: "relative",
              transition: "color 0.2s",
            }}
          >
            {t.label}
            {currentTab === t.id && (
              <div style={{
                position: "absolute", bottom: -1, left: 0, right: 0,
                height: 2, background: "var(--primary)",
                borderRadius: "2px 2px 0 0"
              }} />
            )}
          </button>
        ))}
      </div>

      {currentTab === "gallery" && (
        <>
          {/* Header controls */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-8)", flexWrap: "wrap", gap: "var(--space-4)" }}>
            <div>
              <h1 style={{ fontFamily: "var(--font-poppins), Poppins, sans-serif", fontSize: 24, fontWeight: 700, color: "var(--text)" }}>
                {event.name}
              </h1>
              <p style={{ color: "var(--text-muted)", fontSize: 14, marginTop: 4 }}>
                {photos.length} photo{photos.length !== 1 ? "s" : ""} generated
              </p>
            </div>

            <div style={{ display: "flex", gap: "var(--space-3)" }}>
              <button onClick={handleRefresh} disabled={refreshing} className="btn btn-secondary btn-sm">
                {refreshing ? "Refreshing..." : "🔄 Refresh"}
              </button>
              <button onClick={handleBulkDownload} disabled={zippingProgress !== null || photos.filter(p => p.status === "DONE").length === 0} className="btn btn-primary btn-sm">
                {zippingProgress ? zippingProgress : "⬇️ Download All (.ZIP)"}
              </button>
            </div>
          </div>

          {/* Grid gallery */}
          {photos.length === 0 ? (
            <div className="card" style={{ padding: "var(--space-8)", textAlign: "center" }}>
              <div style={{ fontSize: 48, marginBottom: "var(--space-3)" }}>📸</div>
              <h3 style={{ fontSize: 16, color: "var(--text)", fontWeight: 600 }}>No photos captured yet</h3>
              <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 4, maxWidth: 360, margin: "4px auto 0" }}>
                Launch the booth and take some AI portraits. They will show up here instantly.
              </p>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "var(--space-4)" }}>
              {photos.map((photo) => {
                const isProcessing = photo.status === "PROCESSING";
                const isFailed = photo.status === "FAILED";
                return (
                  <div
                    key={photo.id}
                    className="preset-card"
                    style={{
                      position: "relative",
                      cursor: isProcessing ? "wait" : "pointer",
                    }}
                    onClick={() => {
                      if (!isProcessing) setSelectedPhoto(photo);
                    }}
                  >
                    {/* Image / State Overlay */}
                    <div style={{ height: 180, position: "relative", background: "var(--surface-2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {photo.status === "DONE" && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={`/api/files/photo/${photo.id}`}
                          alt={`Photo ${photo.shortCode}`}
                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                          loading="lazy"
                        />
                      )}

                      {isProcessing && (
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
                          <div style={{ width: 24, height: 24, borderRadius: "50%", border: "2px solid var(--border)", borderTopColor: "var(--primary)", animation: "spin 0.8s linear infinite" }} />
                          <span style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 500 }}>AI Processing...</span>
                        </div>
                      )}

                      {isFailed && (
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, padding: 12, textAlign: "center" }}>
                          <span style={{ fontSize: 24 }}>⚠️</span>
                          <span style={{ fontSize: 11, color: "var(--error)", fontWeight: 600 }}>Generation Failed</span>
                        </div>
                      )}

                      {/* Expiry label */}
                      {!isFailed && (
                        <span
                          style={{
                            position: "absolute",
                            top: 8,
                            left: 8,
                            fontSize: 9,
                            fontWeight: 700,
                            padding: "2px 6px",
                            background: "rgba(0,0,0,0.65)",
                            color: "var(--text-muted)",
                            borderRadius: 4,
                          }}
                        >
                          ⏱️ {getExpiryLabel(photo.expiresAt)}
                        </span>
                      )}

                      {/* Short code label */}
                      <span
                        style={{
                          position: "absolute",
                          bottom: 8,
                          right: 8,
                          fontSize: 10,
                          fontWeight: 700,
                          padding: "2px 8px",
                          background: "rgba(124, 92, 255, 0.9)",
                          color: "#fff",
                          borderRadius: 4,
                          fontFamily: "monospace",
                        }}
                      >
                        {photo.shortCode}
                      </span>

                      {/* Theme label */}
                      {photo.preset?.name && (
                        <span
                          style={{
                            position: "absolute",
                            bottom: 8,
                            left: 8,
                            fontSize: 10,
                            fontWeight: 600,
                            padding: "2px 8px",
                            background: "rgba(0, 0, 0, 0.75)",
                            color: "var(--text)",
                            borderRadius: 4,
                            border: "1px solid var(--border)",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            maxWidth: "95px",
                          }}
                          title={photo.preset.name}
                        >
                          🎨 {photo.preset.name}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {currentTab === "presets" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-4)" }}>
            <p style={{ color: "var(--text-muted)", fontSize: 14, margin: 0 }}>
              Choose which AI styles are available in the booth for this event.
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
              {savedPresets && (
                <span style={{ color: "var(--success)", fontSize: 14, fontWeight: 500 }}>✓ Saved</span>
              )}
              <button
                className="btn btn-primary btn-sm"
                onClick={handleSavePresets}
                disabled={savingPresets}
              >
                {savingPresets ? "Saving…" : "Save Selection"}
              </button>
            </div>
          </div>

          {presetsLoading ? (
            <div style={{ color: "var(--text-muted)", textAlign: "center", padding: "var(--space-8)" }}>Loading presets…</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
              {["SOLO", "COUPLE", "GROUP"].map((tag) => {
                // Group by people tag
                const grouped = allPresets.reduce<Record<string, Preset[]>>((acc, p) => {
                  const key = p.peopleTag;
                  if (!acc[key]) acc[key] = [];
                  acc[key].push(p);
                  return acc;
                }, {});

                const presets = grouped[tag] || [];
                if (presets.length === 0) return null;
                return (
                  <div key={tag} className="card" style={{ padding: "var(--space-5)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", marginBottom: "var(--space-4)" }}>
                      <span
                        style={{
                          fontSize: 11, fontWeight: 700, padding: "3px 10px",
                          background: TAG_COLORS[tag], color: "#fff",
                          borderRadius: 999, textTransform: "uppercase", letterSpacing: "0.06em",
                        }}
                      >
                        {TAG_LABELS[tag]}
                      </span>
                      <span style={{ fontSize: 13, color: "var(--text-muted)" }}>
                        {presets.filter((p) => selectedPresetIds.has(p.id)).length}/{presets.length} selected
                      </span>
                    </div>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
                        gap: "var(--space-3)",
                      }}
                    >
                      {presets.map((preset) => {
                        const selected = selectedPresetIds.has(preset.id);
                        return (
                          <button
                            key={preset.id}
                            onClick={() => togglePresetId(preset.id)}
                            style={{
                              display: "flex", flexDirection: "column", alignItems: "center",
                              gap: "var(--space-2)", padding: "var(--space-4)",
                              background: selected ? "rgba(124, 92, 255, 0.12)" : "var(--surface-2)",
                              border: `2px solid ${selected ? "var(--primary)" : "var(--border)"}`,
                              borderRadius: "var(--radius-md)",
                              cursor: "pointer",
                              transition: "all 150ms ease",
                              boxShadow: selected ? "0 0 0 1px var(--primary), 0 0 12px rgba(124,92,255,0.2)" : "none",
                              width: "100%"
                            }}
                          >
                            <div
                              style={{
                                width: 64, height: 64, borderRadius: "var(--radius-sm)",
                                background: "var(--surface-2)",
                                display: "flex", alignItems: "center", justifyContent: "center",
                                fontSize: 28, overflow: "hidden",
                              }}
                            >
                              {preset.thumbnailUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={preset.thumbnailUrl} alt={preset.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                              ) : "🎨"}
                            </div>
                            <span style={{ fontSize: 12, fontWeight: 600, color: selected ? "var(--primary)" : "var(--text)", textAlign: "center", lineHeight: 1.3 }}>
                              {preset.name}
                            </span>
                            {selected && (
                              <span style={{ fontSize: 10, color: "var(--primary)", fontWeight: 700 }}>✓ ON</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {currentTab === "gdrive" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
          <form onSubmit={handleSaveGDrive} className="card" style={{ maxWidth: 720, padding: "var(--space-6)" }}>
            {/* Header row */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, marginBottom: "var(--space-6)" }}>
              <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 10,
                  background: "rgba(52, 211, 153, 0.1)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: "var(--success)", flexShrink: 0
                }}>
                  <span style={{ fontSize: 24 }}>☁️</span>
                </div>
                <div>
                  <h2 style={{ fontSize: 16, fontWeight: 600, color: "var(--text)", margin: 0 }}>
                    Google Drive Integration
                  </h2>
                  <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 4, lineHeight: 1.4 }}>
                    Save a Google Drive folder link to upload generated images automatically
                  </p>
                </div>
              </div>

              {/* Toggle switch */}
              <label className="toggle-switch" style={{ display: "inline-flex", alignItems: "center", cursor: "pointer", gap: 12, userSelect: "none" }}>
                <span style={{ fontSize: 13, fontWeight: 500, color: gdriveEnabled ? "var(--text)" : "var(--text-muted)" }}>
                  {gdriveEnabled ? "Enabled" : "Disabled"}
                </span>
                <div style={{ position: "relative" }}>
                  <input
                    type="checkbox"
                    checked={gdriveEnabled}
                    onChange={(e) => setGdriveEnabled(e.target.checked)}
                    style={{ display: "none" }}
                  />
                  <div style={{
                    width: 44, height: 22,
                    background: gdriveEnabled ? "var(--success)" : "var(--border)",
                    borderRadius: 999,
                    transition: "background-color 0.2s",
                    position: "relative"
                  }}>
                    <div style={{
                      width: 18, height: 18,
                      background: "#fff",
                      borderRadius: "50%",
                      position: "absolute",
                      top: 2,
                      left: gdriveEnabled ? 24 : 2,
                      transition: "left 0.2s"
                    }} />
                  </div>
                </div>
              </label>
            </div>

            {/* Input folder link */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: "var(--space-4)" }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.05em" }}>
                GOOGLE DRIVE FOLDER LINK
              </label>
              <div style={{ position: "relative" }}>
                <span style={{ position: "absolute", left: 14, top: 12, color: "var(--text-muted)" }}>🔗</span>
                <input
                  type="text"
                  className="form-input"
                  style={{
                    paddingLeft: 40,
                    background: gdriveEnabled ? "var(--surface-2)" : "rgba(28, 28, 43, 0.4)",
                    borderColor: gdriveEnabled ? "var(--border)" : "transparent",
                    color: gdriveEnabled ? "var(--text)" : "var(--text-muted)",
                    cursor: gdriveEnabled ? "text" : "not-allowed"
                  }}
                  placeholder="https://drive.google.com/drive/folders/1-bao5ky38-psKqQPhg5jbAEWfoCYAEwT"
                  value={gdriveLink}
                  onChange={(e) => setGdriveLink(e.target.value)}
                  disabled={!gdriveEnabled}
                />
              </div>
              <p style={{ color: "var(--text-muted)", fontSize: 12, margin: 0, marginTop: 4 }}>
                Paste the shared folder link from Google Drive where images will be saved
              </p>
            </div>

            {gdriveError && (
              <div className="auth-error" style={{ marginTop: "var(--space-4)" }}>
                {gdriveError}
              </div>
            )}

            {/* Save button */}
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "var(--space-6)" }}>
              <button
                type="submit"
                className="btn btn-sm"
                style={{
                  background: "var(--success)",
                  color: "#0B0B14",
                  fontWeight: 700,
                  padding: "8px 24px",
                  minHeight: 40,
                  boxShadow: "0 4px 14px rgba(52, 211, 153, 0.35)",
                  border: "none",
                  borderRadius: "var(--radius-md)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 6
                }}
                disabled={savingGDrive}
              >
                {savingGDrive ? "Saving..." : savedGDrive ? "✓ Saved" : "Save Link"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Before / After Detail Modal */}
      {selectedPhoto && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 100,
            background: "rgba(0,0,0,0.85)",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "var(--space-6)",
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedPhoto(null);
          }}
        >
          <div
            className="card"
            style={{
              width: "100%",
              maxWidth: 900,
              padding: "var(--space-6)",
              display: "flex",
              flexDirection: "column",
              gap: "var(--space-6)",
            }}
          >
            {/* Modal Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h2 style={{ fontFamily: "var(--font-poppins), Poppins, sans-serif", fontSize: 18, fontWeight: 700 }}>
                  Photo Details
                </h2>
                <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 2 }}>
                  Shortcode: <span style={{ color: "var(--primary)", fontWeight: 600 }}>{selectedPhoto.shortCode}</span> ·{" "}
                  Expires {new Date(selectedPhoto.expiresAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                  {selectedPhoto.preset?.name && (
                    <>
                      {" "}· Theme: <span style={{ color: "var(--success)", fontWeight: 600 }}>{selectedPhoto.preset.name}</span>
                    </>
                  )}
                </div>
              </div>
              <button
                onClick={() => setSelectedPhoto(null)}
                style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: 24, cursor: "pointer" }}
              >
                ✕
              </button>
            </div>

            {/* Before / After Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-4)", background: "#050508", padding: 12, borderRadius: "var(--radius-lg)" }}>
              {/* Before */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                <div style={{ width: "100%", height: 360, display: "flex", alignItems: "center", justifyContent: "center", background: "#000", borderRadius: "var(--radius-sm)", overflow: "hidden" }}>
                  {selectedPhoto.originalPath ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={`/api/files/photo/${selectedPhoto.id}?variant=original`}
                      alt="Before"
                      style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
                    />
                  ) : (
                    <span style={{ fontSize: 13, color: "var(--text-muted)" }}>Original not available</span>
                  )}
                </div>
                <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)" }}>Original Capture</span>
              </div>

              {/* After */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                <div style={{ width: "100%", height: 360, display: "flex", alignItems: "center", justifyContent: "center", background: "#000", borderRadius: "var(--radius-sm)", overflow: "hidden" }}>
                  {selectedPhoto.status === "DONE" && selectedPhoto.outputPath ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={`/api/files/photo/${selectedPhoto.id}`}
                      alt="After"
                      style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
                    />
                  ) : selectedPhoto.status === "FAILED" ? (
                    <div style={{ padding: 16, textAlign: "center" }}>
                      <div style={{ fontSize: 32, marginBottom: 8 }}>⚠️</div>
                      <div style={{ color: "var(--error)", fontSize: 12, fontWeight: 600 }}>{selectedPhoto.errorMsg || "AI Generation Failed"}</div>
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 24, height: 24, borderRadius: "50%", border: "2px solid var(--border)", borderTopColor: "var(--primary)", animation: "spin 0.8s linear infinite" }} />
                      <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Processing...</span>
                    </div>
                  )}
                </div>
                <span style={{ fontSize: 12, fontWeight: 600, color: "var(--primary)" }}>AI Portrait</span>
              </div>
            </div>

            {/* Modal Actions */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid var(--border)", paddingTop: "var(--space-4)" }}>
              <button
                onClick={() => handleDelete(selectedPhoto.id)}
                disabled={deletingId === selectedPhoto.id}
                className="btn btn-destructive btn-sm"
              >
                {deletingId === selectedPhoto.id ? "Deleting..." : "🗑️ Delete Photo"}
              </button>

              <div style={{ display: "flex", gap: "var(--space-3)" }}>
                <button onClick={() => setSelectedPhoto(null)} className="btn btn-secondary btn-sm">
                  Close
                </button>
                {selectedPhoto.status === "DONE" && (
                  <a
                    href={`/api/files/photo/${selectedPhoto.id}`}
                    download={`boothmagic-${selectedPhoto.shortCode}.jpg`}
                    className="btn btn-primary btn-sm"
                    style={{ textDecoration: "none" }}
                  >
                    ⬇️ Download Output
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
