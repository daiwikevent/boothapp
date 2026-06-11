"use client";

/**
 * app/(dashboard)/account/AccountClient.tsx
 * Interactive account settings: profile edit, countdown, plan/billing info.
 */

import { useState } from "react";
import { signOut } from "next-auth/react";
import type { CreditPack } from "@prisma/client";

interface Props {
  userId: string;
  email: string;
  credits: number;
  plan: string;
  displayName: string;
  companyName: string;
  countdownSecs: number;
  logoUrl: string | null;
  boothPin: string;
  isGDriveConnected: boolean;
  drive_folder_link: string | null;
  drive_folder_id: string | null;
  drive_enabled: boolean;
  features?: {
    hasCustomPresets: boolean;
    hasCustomLogo: boolean;
    hasNoWatermark: boolean;
    hasCsvReports: boolean;
    hasAttendantPin: boolean;
  };
  creditPacks: CreditPack[];
  isGDriveAllowedByAdmin: boolean;
}

const PLAN_LABELS: Record<string, string> = {
  TRIAL: "Trial (Free)",
  STARTER: "Starter",
  PRO: "Pro",
  BUSINESS: "Business",
};

const PLAN_CREDITS: Record<string, string> = {
  TRIAL: "9 free credits",
  STARTER: "54 credits",
  PRO: "120 credits",
  BUSINESS: "240 credits",
};

function creditColorVar(credits: number): string {
  if (credits < 6) return "var(--error)";
  if (credits < 15) return "var(--accent)";
  return "var(--success)";
}

export default function AccountClient({
  userId: _userId,
  email,
  credits,
  plan,
  displayName,
  companyName,
  countdownSecs,
  logoUrl: initialLogoUrl,
  boothPin: initialBoothPin,
  isGDriveConnected: _isGDriveConnected,
  drive_folder_link,
  drive_folder_id: _drive_folder_id,
  drive_enabled,
  features,
  creditPacks,
  isGDriveAllowedByAdmin,
}: Props) {
  const [name, setName] = useState(displayName);
  const [company, setCompany] = useState(companyName);
  const [countdown, setCountdown] = useState(countdownSecs);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [buyingPack, setBuyingPack] = useState<string | null>(null);
  // T19: Logo state
  const [logoUrl, setLogoUrl] = useState<string | null>(initialLogoUrl);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [logoError, setLogoError] = useState("");
  const [deletingLogo, setDeletingLogo] = useState(false);
  const isProPlus = features?.hasCustomLogo ?? ["PRO", "BUSINESS"].includes(plan);
  // T22: PIN state
  const [boothPin, setBoothPin] = useState(initialBoothPin);
  const [savingPin, setSavingPin] = useState(false);
  const [savedPin, setSavedPin] = useState(false);
  const [pinError, setPinError] = useState("");

  // Service Account Google Drive Integration state
  const [driveEnabled, setDriveEnabled] = useState(drive_enabled);
  const [driveFolderLink, setDriveFolderLink] = useState(drive_folder_link || "");
  const [savingGDrive, setSavingGDrive] = useState(false);
  const [savedGDrive, setSavedGDrive] = useState(false);
  const [gdriveError, setGdriveError] = useState("");

  async function handleSaveServiceAccountGDrive(e: React.FormEvent) {
    e.preventDefault();
    setSavingGDrive(true);
    setSavedGDrive(false);
    setGdriveError("");

    try {
      const res = await fetch("/api/user/settings/google-drive", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          folderLink: driveFolderLink,
          enabled: driveEnabled,
        }),
      });

      if (!res.ok) {
        const d = await res.json();
        setGdriveError(d.error || "Failed to save settings");
        return;
      }

      setSavedGDrive(true);
      setTimeout(() => setSavedGDrive(false), 3000);
    } catch {
      setGdriveError("Failed to save settings");
    } finally {
      setSavingGDrive(false);
    }
  }

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  async function handleBuyTopup(packId: string) {
    setBuyingPack(packId);
    try {
      const res = await fetch("/api/razorpay/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "topup", packId }),
      });

      if (!res.ok) {
        alert("Failed to initiate checkout");
        return;
      }

      const data = await res.json();

      if (data.mock) {
        // Mock webhook execution
        const mockWebhookRes = await fetch("/api/razorpay/webhook", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            event: "payment.captured",
            payload: {
              payment: {
                entity: {
                  id: data.orderId,
                  amount: data.amount,
                  currency: "INR",
                  status: "captured",
                  notes: {
                    userId: data.userId,
                    packCredits: data.credits.toString(),
                  },
                },
              },
            },
          }),
        });

        if (mockWebhookRes.ok) {
          alert(`Mock payment successful! Granted ${data.credits} credits.`);
          window.location.reload();
        } else {
          alert("Mock checkout failed.");
        }
      } else {
        const isScriptLoaded = await loadRazorpayScript();
        if (!isScriptLoaded) {
          alert("Razorpay Checkout failed to load. Check your internet connection.");
          return;
        }

        const options = {
          key: data.keyId,
          amount: data.amount,
          currency: data.currency,
          name: "BoothMagic AI",
          description: "Buy Credit Pack",
          order_id: data.orderId,
          handler: function () {
            alert("Payment successful! Your credits will land in a few moments.");
            window.location.reload();
          },
          prefill: {
            email,
          },
          theme: {
            color: "#7C5CFF",
          },
        };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const rzp = new (window as any).Razorpay(options);
        rzp.open();
      }
    } catch (e) {
      console.error(e);
      alert("Something went wrong during checkout.");
    } finally {
      setBuyingPack(null);
    }
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setSaved(false); setSaveError("");
    try {
      const res = await fetch("/api/account/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName: name, companyName: company, countdownSecs: countdown }),
      });
      if (!res.ok) { setSaveError("Failed to save"); return; }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  }

  async function handleSavePin(e: React.FormEvent) {
    e.preventDefault();
    if (!/^\d{4}$/.test(boothPin)) { setPinError("PIN must be exactly 4 digits"); return; }
    setSavingPin(true); setSavedPin(false); setPinError("");
    try {
      const res = await fetch("/api/account/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ boothPin }),
      });
      if (!res.ok) { const d = await res.json(); setPinError(d.error || "Failed to save PIN"); return; }
      setSavedPin(true);
      setTimeout(() => setSavedPin(false), 3000);
    } finally {
      setSavingPin(false);
    }
  }


  return (
    <div style={{ maxWidth: 720 }}>
      <div style={{ marginBottom: "var(--space-8)" }}>
        <h1 style={{ fontFamily: "var(--font-poppins), Poppins, sans-serif", fontSize: 24, fontWeight: 700, color: "var(--text)", marginBottom: 4 }}>
          Account
        </h1>
        <p style={{ color: "var(--text-muted)", fontSize: 14 }}>Manage your profile, plan, and booth settings.</p>
      </div>



      {/* Plan & Credits */}
      <div className="card" style={{ padding: "var(--space-6)", marginBottom: "var(--space-6)" }}>
        <h2 style={{ fontFamily: "var(--font-poppins), Poppins, sans-serif", fontSize: 16, fontWeight: 600, color: "var(--text)", marginBottom: "var(--space-4)" }}>
          Plan & Credits
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-6)" }}>
          <div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "var(--space-2)" }}>Current Plan</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: "var(--primary)", marginBottom: 4 }}>{PLAN_LABELS[plan] ?? plan}</div>
            <div style={{ fontSize: 13, color: "var(--text-muted)" }}>{PLAN_CREDITS[plan] ?? ""}</div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "var(--space-2)" }}>Credit Balance</div>
            <div style={{ fontSize: 32, fontWeight: 700, color: creditColorVar(credits), marginBottom: 4, fontVariantNumeric: "tabular-nums" }}>{credits}</div>
            <div style={{ fontSize: 13, color: "var(--text-muted)" }}>{Math.floor(credits / 3)} photos remaining</div>
          </div>
        </div>

        <div style={{ marginTop: "var(--space-6)", paddingTop: "var(--space-4)", borderTop: "1px solid var(--border)", display: "flex", gap: "var(--space-3)", flexWrap: "wrap" }}>
          {plan === "TRIAL" && (
            <>
              <a href="/pricing" className="btn btn-primary btn-sm">Upgrade Plan</a>
              <a href="#billing" className="btn btn-secondary btn-sm">Buy Credit Pack</a>
            </>
          )}
          {plan !== "TRIAL" && (
            <a href="#billing" className="btn btn-secondary btn-sm">Buy More Credits</a>
          )}
        </div>
      </div>

      {/* Profile form */}
      <div className="card" style={{ padding: "var(--space-6)", marginBottom: "var(--space-6)" }}>
        <h2 style={{ fontFamily: "var(--font-poppins), Poppins, sans-serif", fontSize: 16, fontWeight: 600, color: "var(--text)", marginBottom: "var(--space-4)" }}>
          Profile
        </h2>
        <form onSubmit={handleSaveProfile} style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
          <div style={{ fontSize: 13, color: "var(--text-muted)", padding: "var(--space-3) var(--space-4)", background: "var(--surface-2)", borderRadius: "var(--radius-sm)" }}>
            📧 {email}
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Display Name</label>
              <input className="form-input" value={name} onChange={e => setName(e.target.value)} placeholder="Your name" />
            </div>
            <div className="form-group">
              <label className="form-label">Company / Event Brand</label>
              <input className="form-input" value={company} onChange={e => setCompany(e.target.value)} placeholder="e.g. Sharma Events" />
            </div>
          </div>

          <div className="form-group" style={{ maxWidth: 240 }}>
            <label className="form-label">Booth Countdown (seconds)</label>
            <select className="form-input" value={countdown} onChange={e => setCountdown(Number(e.target.value))}>
              {[1,2,3,4,5,7,10].map(s => <option key={s} value={s}>{s} second{s !== 1 ? "s" : ""}</option>)}
            </select>
          </div>

          {saveError && <div className="auth-error">{saveError}</div>}

          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
            <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>
              {saving ? "Saving…" : "Save Profile"}
            </button>
            {saved && <span style={{ color: "var(--success)", fontSize: 14, fontWeight: 500 }}>✓ Saved</span>}
          </div>
        </form>
      </div>

      {/* T19: White-label Logo */}
      <div className="card" style={{ padding: "var(--space-6)", marginBottom: "var(--space-6)" }}>
        <h2 style={{ fontFamily: "var(--font-poppins), Poppins, sans-serif", fontSize: 16, fontWeight: 600, color: "var(--text)", marginBottom: "var(--space-2)" }}>
          White-label Logo
        </h2>
        <p style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: "var(--space-4)" }}>
          Your logo appears on the booth camera view and is stamped on generated photos.
        </p>

        {!isProPlus ? (
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", padding: "var(--space-4)", background: "rgba(255, 181, 71, 0.08)", border: "1px solid rgba(255, 181, 71, 0.3)", borderRadius: "var(--radius-md)" }}>
            <span style={{ fontSize: 20 }}>🔒</span>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "var(--accent)" }}>Pro plan required</div>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Upgrade to Pro or Business to upload your brand logo.</div>
            </div>
            <a href="/pricing" className="btn btn-secondary btn-sm" style={{ marginLeft: "auto", flexShrink: 0 }}>Upgrade</a>
          </div>
        ) : (
          <div style={{ display: "flex", gap: "var(--space-6)", alignItems: "flex-start", flexWrap: "wrap" }}>
            {/* Current logo preview */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "var(--space-3)" }}>
              <div style={{
                width: 120, height: 120, borderRadius: "var(--radius-md)",
                background: "var(--surface-2)", border: "2px dashed var(--border)",
                display: "flex", alignItems: "center", justifyContent: "center",
                overflow: "hidden",
              }}>
                {logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={logoUrl} alt="Logo" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
                ) : (
                  <span style={{ fontSize: 40, color: "var(--text-muted)" }}>🏢</span>
                )}
              </div>
              <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{logoUrl ? "Current logo" : "No logo set"}</div>
            </div>

            {/* Upload controls */}
            <div style={{ flex: 1, minWidth: 200, display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
              <label
                htmlFor="logo-upload"
                style={{
                  display: "flex", alignItems: "center", gap: "var(--space-3)",
                  padding: "var(--space-4)", background: "var(--surface-2)",
                  border: "1px solid var(--border)", borderRadius: "var(--radius-md)",
                  cursor: uploadingLogo ? "wait" : "pointer",
                  transition: "border-color 0.2s",
                }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = "var(--primary)")}
                onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--border)")}
              >
                <span style={{ fontSize: 24 }}>{uploadingLogo ? "⏳" : "📤"}</span>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>
                    {uploadingLogo ? "Uploading…" : "Upload Logo"}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>PNG, JPEG, or WebP · Max 2MB</div>
                </div>
              </label>
              <input
                id="logo-upload"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                style={{ display: "none" }}
                disabled={uploadingLogo}
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setLogoError("");
                  setUploadingLogo(true);
                  try {
                    const fd = new FormData();
                    fd.append("file", file);
                    const res = await fetch("/api/account/logo", { method: "POST", body: fd });
                    if (!res.ok) {
                      const d = await res.json();
                      setLogoError(d.error || "Upload failed");
                      return;
                    }
                    const { logoUrl: newUrl } = await res.json();
                    setLogoUrl(newUrl);
                  } catch {
                    setLogoError("Upload failed");
                  } finally {
                    setUploadingLogo(false);
                    e.target.value = "";
                  }
                }}
              />

              {logoUrl && (
                <button
                  className="btn btn-destructive btn-sm"
                  disabled={deletingLogo}
                  onClick={async () => {
                    if (!window.confirm("Remove your logo? It will be deleted from booth and generated photos.")) return;
                    setDeletingLogo(true);
                    try {
                      await fetch("/api/account/logo", { method: "DELETE" });
                      setLogoUrl(null);
                    } finally {
                      setDeletingLogo(false);
                    }
                  }}
                >
                  {deletingLogo ? "Removing…" : "🗑 Remove Logo"}
                </button>
              )}

              {logoError && <div className="auth-error">{logoError}</div>}
            </div>
          </div>
        )}
      </div>

      {/* Billing anchor */}
      <div id="billing" className="card" style={{ padding: "var(--space-6)", marginBottom: "var(--space-6)" }}>
        <h2 style={{ fontFamily: "var(--font-poppins), Poppins, sans-serif", fontSize: 16, fontWeight: 600, color: "var(--text)", marginBottom: "var(--space-2)" }}>
          Billing & Top-ups
        </h2>
        <p style={{ color: "var(--text-muted)", fontSize: 14, marginBottom: "var(--space-4)" }}>
          Need more credits? Buy a top-up pack. Credits never expire and carry over.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "var(--space-3)", marginBottom: "var(--space-6)" }}>
          {creditPacks.map((pack) => (
            <div key={pack.id} style={{ padding: "var(--space-4)", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "space-between", gap: 10, textAlign: "center" }}>
              <div style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 500 }}>{pack.label}</div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                <span style={{ fontSize: 22, fontWeight: 800, color: "var(--text)" }}>{pack.credits}</span>
                <span style={{ fontSize: 11, color: "var(--primary)", fontWeight: 600 }}>credits</span>
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>₹{pack.priceInr.toLocaleString("en-IN")}</div>
              <button
                onClick={() => handleBuyTopup(pack.id)}
                disabled={buyingPack !== null}
                className="btn btn-primary btn-sm"
                style={{ width: "100%", minHeight: 32, padding: "4px 8px", fontSize: 12 }}
              >
                {buyingPack === pack.id ? "Buying..." : "Buy Pack"}
              </button>
            </div>
          ))}
          {creditPacks.length === 0 && (
            <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: "var(--space-6)", color: "var(--text-muted)", fontSize: 14 }}>
              No credit packs available for purchase at the moment.
            </div>
          )}
        </div>

        <div style={{ borderTop: "1px solid var(--border)", paddingTop: "var(--space-4)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>Need to upgrade or change plans?</div>
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Switch tiers to get custom presets, watermarks removed, and logo overrides.</div>
          </div>
          <a href="/pricing" className="btn btn-secondary btn-sm">View Plans</a>
        </div>
      </div>



      {/* T22: Booth PIN Lock */}
      <div className="card" style={{ padding: "var(--space-6)", marginBottom: "var(--space-6)" }}>
        <h2 style={{ fontFamily: "var(--font-poppins), Poppins, sans-serif", fontSize: 16, fontWeight: 600, color: "var(--text)", marginBottom: "var(--space-2)" }}>
          Booth PIN Lock
        </h2>
        <p style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: "var(--space-4)" }}>
          4-digit PIN required to access the dashboard from the booth screen. Prevents guests from exiting the booth.
        </p>
        <form onSubmit={handleSavePin} style={{ display: "flex", alignItems: "flex-end", gap: "var(--space-4)", flexWrap: "wrap" }}>
          <div className="form-group" style={{ maxWidth: 140 }}>
            <label className="form-label">Booth PIN</label>
            <input
              id="booth-pin-input"
              className="form-input"
              type="text"
              inputMode="numeric"
              maxLength={4}
              pattern="\d{4}"
              value={boothPin}
              onChange={e => { setBoothPin(e.target.value.replace(/\D/g, "").slice(0, 4)); setPinError(""); }}
              placeholder="0000"
              style={{ letterSpacing: "0.3em", fontSize: 20, fontWeight: 700 }}
            />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", paddingBottom: 1 }}>
            <button type="submit" className="btn btn-primary btn-sm" disabled={savingPin}>
              {savingPin ? "Saving…" : "Save PIN"}
            </button>
            {savedPin && <span style={{ color: "var(--success)", fontSize: 14, fontWeight: 500 }}>✓ Saved</span>}
          </div>
          {pinError && <div className="auth-error" style={{ width: "100%" }}>{pinError}</div>}
        </form>
        <div style={{ marginTop: "var(--space-3)", fontSize: 12, color: "var(--text-muted)" }}>
          Default PIN is <strong>0000</strong>. Change it to something only you know.
        </div>
      </div>

      {/* Google Drive Integration */}
      {isGDriveAllowedByAdmin && (
        <div className="card" style={{ padding: "var(--space-6)", marginBottom: "var(--space-6)" }}>
        <h2 style={{ fontFamily: "var(--font-poppins), Poppins, sans-serif", fontSize: 16, fontWeight: 600, color: "var(--text)", marginBottom: "var(--space-2)" }}>
          ☁️ Google Drive Integration
        </h2>
        <p style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: "var(--space-4)" }}>
          Save a Google Drive folder link to upload generated images automatically.
        </p>

        <form onSubmit={handleSaveServiceAccountGDrive} style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
          {/* Toggle Switch */}
          <label className="toggle-switch" style={{ display: "inline-flex", alignItems: "center", cursor: "pointer", gap: 12, userSelect: "none" }}>
            <span style={{ fontSize: 13, fontWeight: 500, color: driveEnabled ? "var(--text)" : "var(--text-muted)" }}>
              {driveEnabled ? "Enabled" : "Disabled"}
            </span>
            <div style={{ position: "relative" }}>
              <input
                type="checkbox"
                checked={driveEnabled}
                onChange={(e) => setDriveEnabled(e.target.checked)}
                style={{ display: "none" }}
              />
              <div style={{
                width: 44, height: 22,
                background: driveEnabled ? "var(--success)" : "var(--border)",
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
                  left: driveEnabled ? 24 : 2,
                  transition: "left 0.2s"
                }} />
              </div>
            </div>
          </label>

          {/* Folder link input */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <label className="form-label">Google Drive Folder Link</label>
            <input
              type="text"
              className="form-input"
              placeholder="https://drive.google.com/drive/folders/1eyBjNpX-4DP4bxn4c7KRus_hhsMQDHpY?usp=sharing"
              value={driveFolderLink}
              onChange={(e) => setDriveFolderLink(e.target.value)}
              disabled={savingGDrive}
            />
            <p style={{ color: "var(--text-muted)", fontSize: 12, margin: 0 }}>
              Paste the shared folder link from Google Drive where images will be saved. The folder must be shared as &quot;Anyone with the link can edit&quot;.
            </p>
          </div>

          {gdriveError && <div className="auth-error">{gdriveError}</div>}

          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
            <button type="submit" className="btn btn-primary btn-sm" disabled={savingGDrive}>
              {savingGDrive ? "Saving…" : "Save Link"}
            </button>
            {savedGDrive && <span style={{ color: "var(--success)", fontSize: 14, fontWeight: 500 }}>✓ Saved</span>}
          </div>
        </form>
      </div>
      )}

      {/* Danger zone */}
      <div className="card" style={{ padding: "var(--space-6)", borderColor: "rgba(248, 113, 113, 0.3)" }}>
        <h2 style={{ fontFamily: "var(--font-poppins), Poppins, sans-serif", fontSize: 16, fontWeight: 600, color: "var(--error)", marginBottom: "var(--space-4)" }}>
          Danger Zone
        </h2>
        <button
          className="btn btn-destructive btn-sm"
          onClick={() => signOut({ callbackUrl: "/login" })}
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}
