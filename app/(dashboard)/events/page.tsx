"use client";

/**
 * app/(dashboard)/events/page.tsx
 * T05 — Events CRUD UI
 *
 * Features:
 * - List all events with active badge
 * - Create event (modal)
 * - Rename event (inline)
 * - Toggle active (exactly one active per user)
 * - Delete event (with confirm)
 * - Link to event presets (T07)
 */

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

const APP_URL =
  typeof window !== "undefined"
    ? window.location.origin
    : process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";


interface Event {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  gdriveFolderId: string | null;
  createdAt: string;
}

// Metadata can't be exported from "use client" — defined in layout or separate file

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  
  // Create state
  const [newName, setNewName] = useState("");
  const [gdriveFolderId, setGdriveFolderId] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  // Edit state
  const [editEvent, setEditEvent] = useState<Event | null>(null);
  const [editName, setEditName] = useState("");
  const [editGDriveFolderId, setEditGDriveFolderId] = useState("");
  const [updating, setUpdating] = useState(false);
  const [updateError, setUpdateError] = useState("");

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [activatingId, setActivatingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  function getSlideshowUrl(slug: string) {
    return `${APP_URL}/s/${slug}`;
  }

  async function handleCopyLink(slug: string, id: string) {
    try {
      await navigator.clipboard.writeText(getSlideshowUrl(slug));
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // fallback: prompt
      window.prompt("Copy slideshow link:", getSlideshowUrl(slug));
    }
  }

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/events");
      const data = await res.json();
      setEvents(Array.isArray(data) ? data : []);
    } catch {
      setError("Failed to load events");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    setCreateError("");
    try {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim(), gdriveFolderId: gdriveFolderId.trim() }),
      });
      if (!res.ok) {
        const d = await res.json();
        setCreateError(d.error || "Failed to create event");
        return;
      }
      setNewName("");
      setGdriveFolderId("");
      setShowCreate(false);
      await fetchEvents();
    } catch {
      setCreateError("Failed to create event");
    } finally {
      setCreating(false);
    }
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!editEvent || !editName.trim()) return;
    setUpdating(true);
    setUpdateError("");
    try {
      const res = await fetch(`/api/events/${editEvent.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName.trim(), gdriveFolderId: editGDriveFolderId.trim() }),
      });
      if (!res.ok) {
        const d = await res.json();
        setUpdateError(d.error || "Failed to update event");
        return;
      }
      setEditEvent(null);
      await fetchEvents();
    } catch {
      setUpdateError("Failed to update event");
    } finally {
      setUpdating(false);
    }
  }

  async function handleActivate(id: string) {
    setActivatingId(id);
    await fetch(`/api/events/${id}/activate`, { method: "POST" });
    setActivatingId(null);
    await fetchEvents();
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Delete this event? All associated photos will be removed.")) return;
    setDeletingId(id);
    await fetch(`/api/events/${id}`, { method: "DELETE" });
    setDeletingId(null);
    await fetchEvents();
  }

  return (
    <div style={{ maxWidth: 900 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--space-8)" }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-poppins), Poppins, sans-serif", fontSize: 24, fontWeight: 700, color: "var(--text)", marginBottom: 4 }}>
            Events
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: 14 }}>
            Each event has its own gallery, QR links, and preset configuration.
          </p>
        </div>
        <button
          id="create-event-btn"
          className="btn btn-primary btn-sm"
          onClick={() => { setShowCreate(true); setCreateError(""); }}
        >
          + New Event
        </button>
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 50,
            background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowCreate(false); }}
        >
          <div className="card" style={{ width: "100%", maxWidth: 440, padding: "var(--space-8)" }}>
            <h2 style={{ fontFamily: "var(--font-poppins), Poppins, sans-serif", fontSize: 20, fontWeight: 700, marginBottom: "var(--space-6)" }}>
              New Event
            </h2>
            <form onSubmit={handleCreate} style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
              {createError && (
                <div className="auth-error">{createError}</div>
              )}
              <div className="form-group">
                <label className="form-label">Event Name</label>
                <input
                  id="event-name-input"
                  className="form-input"
                  placeholder="e.g. Sharma Wedding – June 2025"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  autoFocus
                  disabled={creating}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Google Drive Folder Share Link (Must be shared with Editor access)</label>
                <input
                  id="event-gdrive-input"
                  className="form-input"
                  placeholder="https://drive.google.com/drive/folders/1TF03no5XY...?usp=sharing"
                  value={gdriveFolderId}
                  onChange={(e) => setGdriveFolderId(e.target.value)}
                  disabled={creating}
                />
              </div>
              <div style={{ display: "flex", gap: "var(--space-3)", justifyContent: "flex-end" }}>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowCreate(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-sm" disabled={creating || !newName.trim()}>
                  {creating ? "Creating…" : "Create Event"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editEvent && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 50,
            background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setEditEvent(null); }}
        >
          <div className="card" style={{ width: "100%", maxWidth: 440, padding: "var(--space-8)" }}>
            <h2 style={{ fontFamily: "var(--font-poppins), Poppins, sans-serif", fontSize: 20, fontWeight: 700, marginBottom: "var(--space-6)" }}>
              Event Settings
            </h2>
            <form onSubmit={handleUpdate} style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
              {updateError && (
                <div className="auth-error">{updateError}</div>
              )}
              <div className="form-group">
                <label className="form-label">Event Name</label>
                <input
                  id="edit-event-name-input"
                  className="form-input"
                  placeholder="e.g. Sharma Wedding – June 2025"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  autoFocus
                  disabled={updating}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Google Drive Folder Share Link (Must be shared with Editor access)</label>
                <input
                  id="edit-event-gdrive-input"
                  className="form-input"
                  placeholder="https://drive.google.com/drive/folders/1TF03no5XY...?usp=sharing"
                  value={editGDriveFolderId}
                  onChange={(e) => setEditGDriveFolderId(e.target.value)}
                  disabled={updating}
                />
              </div>
              <div style={{ display: "flex", gap: "var(--space-3)", justifyContent: "flex-end" }}>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setEditEvent(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-sm" disabled={updating || !editName.trim()}>
                  {updating ? "Saving…" : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Error */}
      {error && <div className="auth-error" style={{ marginBottom: "var(--space-4)" }}>{error}</div>}

      {/* Loading */}
      {loading && (
        <div style={{ textAlign: "center", padding: "var(--space-8)", color: "var(--text-muted)" }}>
          Loading events…
        </div>
      )}

      {/* Empty state */}
      {!loading && events.length === 0 && (
        <div className="card" style={{ textAlign: "center", padding: "var(--space-8) var(--space-6)" }}>
          <div style={{ fontSize: 40, marginBottom: "var(--space-4)" }}>🎪</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: "var(--text)", marginBottom: "var(--space-2)" }}>
            No events yet
          </div>
          <div style={{ color: "var(--text-muted)", fontSize: 14, marginBottom: "var(--space-6)" }}>
            Create your first event to get started. Each event gets its own booth configuration and photo gallery.
          </div>
          <button className="btn btn-primary btn-sm" onClick={() => setShowCreate(true)}>
            + Create First Event
          </button>
        </div>
      )}

      {/* Events list */}
      {!loading && events.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
          {events.map((ev) => (
            <div
              key={ev.id}
              className={`card${ev.isActive ? " card-active" : ""}`}
              style={{ padding: "var(--space-5) var(--space-6)", display: "flex", alignItems: "center", gap: "var(--space-4)", flexWrap: "wrap" }}
            >
              {/* Left: name + active badge */}
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
                  <span style={{ fontWeight: 600, fontSize: 15, color: "var(--text)" }}>{ev.name}</span>
                  {ev.isActive && (
                    <span style={{
                      fontSize: 11, fontWeight: 700, padding: "2px 10px",
                      background: "rgba(52, 211, 153, 0.15)", color: "var(--success)",
                      borderRadius: 999, border: "1px solid rgba(52, 211, 153, 0.3)",
                      textTransform: "uppercase", letterSpacing: "0.05em",
                    }}>
                      Active
                    </span>
                  )}
                </div>
                {ev.gdriveFolderId && (
                  <div style={{ fontSize: 12, color: "var(--primary)", marginTop: 2, display: "flex", alignItems: "center", gap: 4 }}>
                    📁 GDrive Shared Folder Linked ({ev.gdriveFolderId.length > 15 ? `${ev.gdriveFolderId.slice(0, 8)}...${ev.gdriveFolderId.slice(-6)}` : ev.gdriveFolderId})
                  </div>
                )}
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
                  Created {new Date(ev.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                </div>
              </div>

              {/* Right: actions */}
              <div style={{ display: "flex", gap: "var(--space-2)", alignItems: "center", flexWrap: "wrap" }}>
                {!ev.isActive && (
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleActivate(ev.id)}
                    disabled={activatingId === ev.id}
                    title="Set as active event for the booth"
                  >
                    {activatingId === ev.id ? "Activating…" : "Set Active"}
                  </button>
                )}
                <Link
                  href={`/events/${ev.id}`}
                  className="btn btn-secondary btn-sm"
                  title="View photo gallery for this event"
                  style={{ background: "rgba(124, 92, 255, 0.1)", borderColor: "rgba(124, 92, 255, 0.25)" }}
                >
                  📸 Gallery
                </Link>
                {/* T18: Slideshow buttons */}
                <Link
                  href={`/s/${ev.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-secondary btn-sm"
                  title="Open live slideshow for venue screens"
                  style={{ background: "rgba(196, 77, 255, 0.08)", borderColor: "rgba(196, 77, 255, 0.25)" }}
                >
                  📺 Slideshow
                </Link>
                <button
                  id={`copy-slideshow-${ev.id}`}
                  className="btn btn-secondary btn-sm"
                  onClick={() => handleCopyLink(ev.slug, ev.id)}
                  title="Copy slideshow link to clipboard"
                  style={copiedId === ev.id ? { borderColor: "var(--success)", color: "var(--success)" } : {}}
                >
                  {copiedId === ev.id ? "✓ Copied!" : "🔗 Copy Link"}
                </button>
                <Link
                  href={`/events/${ev.id}/presets`}
                  className="btn btn-secondary btn-sm"
                  title="Configure which presets are enabled for this event"
                >
                  Presets
                </Link>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    setEditEvent(ev);
                    setEditName(ev.name);
                    setEditGDriveFolderId(ev.gdriveFolderId || "");
                    setUpdateError("");
                  }}
                  title="Configure event settings"
                >
                  Edit ⚙️
                </button>
                <button
                  className="btn btn-destructive btn-sm"
                  onClick={() => handleDelete(ev.id)}
                  disabled={deletingId === ev.id}
                  title="Delete event"
                >
                  {deletingId === ev.id ? "Deleting…" : "Delete"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Info */}
      {!loading && events.length > 0 && (
        <div style={{ marginTop: "var(--space-6)", padding: "var(--space-4)", background: "rgba(124, 92, 255, 0.06)", border: "1px solid rgba(124, 92, 255, 0.15)", borderRadius: "var(--radius-sm)", fontSize: 13, color: "var(--text-muted)" }}>
          💡 Only one event can be active at a time. The active event&apos;s presets appear in the booth.
        </div>
      )}
    </div>
  );
}
