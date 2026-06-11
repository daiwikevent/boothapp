"use client";

/**
 * app/booth/page.tsx
 * T08 — Booth camera screen (fullscreen PWA)
 * T09 — Preset picker overlay
 * T11 — Processing animation + result screen
 *
 * Features:
 * - getUserMedia live preview, front/back camera toggle, mirror toggle
 * - 3s countdown
 * - Capture to canvas → JPEG (max 1280px) → /api/generate
 * - Preset picker modal grouped by people tag
 * - Processing animation → result with QR code
 * - Out-of-credits + no-active-event block screens
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import QRCode from "qrcode";

interface Preset {
  id: string;
  name: string;
  peopleTag: "SOLO" | "COUPLE" | "GROUP";
  thumbnailUrl: string | null;
}

interface Event {
  id: string;
  name: string;
  isActive: boolean;
}

type BoothState = "loading" | "no-event" | "no-permission" | "camera" | "countdown" | "processing" | "result" | "no-credits";

const PRESET_EMOJIS: Record<string, string> = {
  "Royal Rajasthan": "👑", "Mehandi Garden": "🌿", "Sangeet Glam": "✨",
  "Haldi Glow": "💛", "South Indian Temple Classic": "🛕", "Vintage Mumbai Retro": "📽️",
  "Classic Studio B&W": "⚫", "Executive Headshot Pro": "💼", "Cyber Neon Night": "🌃",
  "Royal Oil Painting": "🖼️", "Little Astronaut": "🚀", "Jungle Explorer": "🦁",
  "Cricket Star": "🏏", "Bollywood Retro Poster": "🎬", "Monsoon Romance": "🌧️",
};

export default function BoothPage() {
  const router = useRouter();

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [state, setState] = useState<BoothState>("loading");
  const [mirrored, setMirrored] = useState(true);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [activeEvent, setActiveEvent] = useState<Event | null>(null);
  const [presets, setPresets] = useState<Preset[]>([]);
  const [selectedPreset, setSelectedPreset] = useState<Preset | null>(null);
  const [showPresetPicker, setShowPresetPicker] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [resultShortCode, setResultShortCode] = useState<string | null>(null);
  const [resultPhotoId, setResultPhotoId] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [operatorLogo, setOperatorLogo] = useState<string | null>(null);
  // T22: PIN lock state
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState(false);
  const [boothPin, setBoothPin] = useState("0000"); // default PIN

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const startCamera = useCallback(async (facing: "user" | "environment" = "user") => {
    stopCamera();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 960 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setState("camera");
    } catch {
      setState("no-permission");
    }
  }, [stopCamera]);

  useEffect(() => {
    async function init() {
      try {
        const res = await fetch("/api/events");
        const events: Event[] = await res.json();
        const active = events.find((e) => e.isActive) ?? null;
        setActiveEvent(active);
        if (!active) { setState("no-event"); return; }

        const presetsRes = await fetch(`/api/events/${active.id}/presets`);
        const eventPresets: Preset[] = await presetsRes.json();
        setPresets(Array.isArray(eventPresets) ? eventPresets : []);
        if (eventPresets.length > 0) setSelectedPreset(eventPresets[0]);

        // T19: Fetch operator logo + T22: PIN
        try {
          const profileRes = await fetch("/api/account/profile");
          if (profileRes.ok) {
            const profile = await profileRes.json();
            if (profile.logoUrl) setOperatorLogo(profile.logoUrl);
            if (profile.boothPin) setBoothPin(profile.boothPin);
          }
        } catch { /* non-critical */ }

        await startCamera();
      } catch {
        setState("no-event");
      }
    }
    init();
    return () => stopCamera();
  }, [startCamera, stopCamera]);

  function toggleCamera() {
    const next = facingMode === "user" ? "environment" : "user";
    setFacingMode(next);
    startCamera(next);
  }

  function captureToBase64(): string | null {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return null;
    const maxEdge = 1280;
    let w = video.videoWidth, h = video.videoHeight;
    if (w > maxEdge || h > maxEdge) {
      const scale = maxEdge / Math.max(w, h);
      w = Math.round(w * scale); h = Math.round(h * scale);
    }
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext("2d")!;
    if (mirrored) { ctx.translate(w, 0); ctx.scale(-1, 1); }
    ctx.drawImage(video, 0, 0, w, h);
    return canvas.toDataURL("image/jpeg", 0.9).split(",")[1];
  }

  async function startCountdown() {
    setState("countdown");
    for (let i = 3; i >= 1; i--) {
      setCountdown(i);
      await new Promise((r) => setTimeout(r, 1000));
    }
    setCountdown(0);
    await triggerCapture();
  }

  async function triggerCapture() {
    const imageBase64 = captureToBase64();
    if (!imageBase64 || !activeEvent) { setState("camera"); return; }
    setCapturedImage(`data:image/jpeg;base64,${imageBase64}`);
    setState("processing");

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64, eventId: activeEvent.id, presetId: selectedPreset?.id }),
      });
      if (res.status === 402) { setState("no-credits"); return; }
      if (!res.ok) {
        const d = await res.json();
        setErrorMsg(d.error || "Generation failed");
        setState("camera"); return;
      }
      const { shortCode, photoId } = await res.json();
      setResultShortCode(shortCode);
      setResultPhotoId(photoId);
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? window.location.origin;
      const qr = await QRCode.toDataURL(`${appUrl}/g/${shortCode}`, {
        width: 300, margin: 2,
        color: { dark: "#F4F4F8", light: "#14141F" },
      });
      setQrDataUrl(qr);
      setState("result");
    } catch {
      setErrorMsg("Network error. Please try again.");
      setState("camera");
    }
  }

  function handleRetake() {
    setCapturedImage(null); setResultShortCode(null); setResultPhotoId(null); setQrDataUrl(null); setErrorMsg("");
    setState("camera");
  }

  // ── Block screens ─────────────────────────────────────────────

  if (state === "loading") return (
    <div className="booth-screen" style={{ display:"flex", alignItems:"center", justifyContent:"center", background:"var(--bg)" }}>
      <div style={{ color:"var(--text-muted)", fontSize:16 }}>Starting camera…</div>
    </div>
  );

  if (state === "no-event") return (
    <div className="booth-screen" style={{ display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", gap:"var(--space-6)", background:"var(--bg)", padding:"var(--space-8)", textAlign:"center" }}>
      <div style={{ fontSize:64 }}>📋</div>
      <h1 style={{ fontFamily:"var(--font-poppins), Poppins, sans-serif", fontSize:28, fontWeight:700, color:"var(--text)" }}>No Active Event</h1>
      <p style={{ color:"var(--text-muted)", fontSize:16, maxWidth:400 }}>Create and activate an event in the dashboard first.</p>
      <button className="btn btn-primary" onClick={() => router.push("/events")}>Go to Events</button>
    </div>
  );

  if (state === "no-permission") return (
    <div className="booth-screen" style={{ display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", gap:"var(--space-6)", background:"var(--bg)", padding:"var(--space-8)", textAlign:"center" }}>
      <div style={{ fontSize:64 }}>📷</div>
      <h1 style={{ fontFamily:"var(--font-poppins), Poppins, sans-serif", fontSize:28, fontWeight:700, color:"var(--text)" }}>Camera Access Needed</h1>
      <p style={{ color:"var(--text-muted)", fontSize:16, maxWidth:400 }}>Allow camera access in your browser settings, then try again.</p>
      <button className="btn btn-primary" onClick={() => startCamera(facingMode)}>Try Again</button>
    </div>
  );

  if (state === "no-credits") return (
    <div className="booth-screen" style={{ display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", gap:"var(--space-6)", background:"var(--bg)", padding:"var(--space-8)", textAlign:"center" }}>
      <div style={{ fontSize:64 }}>⚡</div>
      <h1 style={{ fontFamily:"var(--font-poppins), Poppins, sans-serif", fontSize:28, fontWeight:700, color:"var(--error)" }}>Out of Credits</h1>
      <p style={{ color:"var(--text-muted)", fontSize:16, maxWidth:400 }}>Purchase a credit pack to continue.</p>
      <div style={{ display:"flex", gap:"var(--space-3)" }}>
        <button className="btn btn-secondary" onClick={handleRetake}>Continue</button>
        <button className="btn btn-primary" onClick={() => router.push("/account#billing")}>Top Up →</button>
      </div>
    </div>
  );

  if (state === "result") return (
    <div className="booth-screen" style={{ display:"flex", background:"var(--bg)", overflow:"hidden" }}>
      {/* Left: captured preview */}
      <div style={{ flex:"0 0 60%", background:"#000", display:"flex", position:"relative", overflow:"hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2px", width: "100%", height: "100%" }}>
          <div style={{ position: "relative", width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#050508" }}>
            {capturedImage && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={capturedImage} alt="Original" style={{ maxWidth:"100%", maxHeight:"100%", objectFit:"contain" }} />
            )}
            <div style={{ position: "absolute", bottom: 12, left: 12, background: "rgba(0,0,0,0.6)", padding: "4px 10px", borderRadius: 4, fontSize: 12, color: "#fff", fontWeight: 500 }}>
              Original
            </div>
          </div>
          <div style={{ position: "relative", width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#050508" }}>
            {resultPhotoId && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={`/api/files/photo/${resultPhotoId}`} alt="AI Portrait" style={{ maxWidth:"100%", maxHeight:"100%", objectFit:"contain" }} />
            )}
            <div style={{ position: "absolute", bottom: 12, left: 12, background: "var(--gradient-primary)", padding: "4px 10px", borderRadius: 4, fontSize: 12, color: "#fff", fontWeight: 500 }}>
              AI Portrait
            </div>
          </div>
        </div>
      </div>
      {/* Right: QR + actions */}
      <div style={{ flex:"0 0 40%", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"var(--space-8)", gap:"var(--space-6)", background:"var(--surface)" }}>
        <div style={{ textAlign:"center" }}>
          <div style={{ fontSize:26, fontWeight:700, color:"var(--text)", fontFamily:"var(--font-poppins), Poppins, sans-serif", marginBottom:"var(--space-2)" }}>Your photo is ready! 🎉</div>
          <div style={{ fontSize:20, color:"var(--text-muted)" }}>Scan to download</div>
        </div>
        {qrDataUrl && (
          <div style={{ padding:"var(--space-4)", background:"#14141F", borderRadius:"var(--radius-lg)", border:"1px solid var(--border)" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrDataUrl} alt="QR Code" style={{ width:240, height:240, display:"block" }} />
          </div>
        )}
        {resultShortCode && (
          <div style={{ fontSize:13, color:"var(--text-muted)", textAlign:"center" }}>
            Available for 3 days<br />
            <span style={{ color:"var(--primary)", fontWeight:600 }}>/g/{resultShortCode}</span>
          </div>
        )}
        <div style={{ display:"flex", gap:"var(--space-3)", width:"100%", maxWidth:300, flexWrap:"wrap" }}>
          <button className="btn btn-secondary" style={{ flex:1 }} onClick={handleRetake}>🔄 Retake</button>
          <button id="new-photo-btn" className="btn btn-primary" style={{ flex:1 }} onClick={handleRetake}>📸 New Photo</button>
        </div>
        {/* T21: Print button */}
        {resultPhotoId && (
          <button
            className="btn btn-secondary btn-sm"
            style={{ width: "100%", maxWidth: 300 }}
            onClick={() => {
              const printWin = window.open("", "_blank", "width=800,height=600");
              if (!printWin) return;
              printWin.document.write(`
                <html><head><title>Print Photo</title>
                <style>
                  body { margin: 0; display: flex; align-items: center; justify-content: center; min-height: 100vh; background: #fff; }
                  img { max-width: 100%; max-height: 100vh; object-fit: contain; }
                  @media print { body { margin: 0; } img { width: 4in; height: 6in; object-fit: contain; } }
                </style></head><body>
                <img src="/api/files/photo/${resultPhotoId}" onload="setTimeout(()=>{window.print();window.close()},500)" />
                </body></html>
              `);
              printWin.document.close();
            }}
          >
            🖨️ Print (4×6)
          </button>
        )}
      </div>
    </div>
  );

  // ── Main camera view ──────────────────────────────────────────
  return (
    <div className="booth-screen" style={{ background:"#000", position:"relative" }}>
      <video ref={videoRef} autoPlay playsInline muted
        style={{ width:"100%", height:"100%", objectFit:"cover", transform: mirrored ? "scaleX(-1)" : "none", pointerEvents:"none" }} />
      <canvas ref={canvasRef} style={{ display:"none" }} />

      {/* Countdown */}
      {state === "countdown" && countdown > 0 && (
        <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", background:"rgba(0,0,0,0.3)", fontSize:160, fontWeight:900, color:"#fff", fontFamily:"var(--font-poppins), Poppins, sans-serif", textShadow:"0 0 40px rgba(124,92,255,0.8)" }}>
          {countdown}
        </div>
      )}

      {/* Processing overlay */}
      {state === "processing" && (
        <div style={{ position:"absolute", inset:0, background:"rgba(11,11,20,0.92)", backdropFilter:"blur(8px)", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:"var(--space-6)" }}>
          <div style={{ width:100, height:100, borderRadius:"50%", border:"4px solid var(--border)", borderTopColor:"var(--primary)", animation:"spin 1s linear infinite" }} />
          <div style={{ textAlign:"center" }}>
            <div style={{ fontSize:22, fontWeight:700, color:"var(--text)", fontFamily:"var(--font-poppins), Poppins, sans-serif" }}>Creating your AI photo…</div>
            <div style={{ fontSize:14, color:"var(--text-muted)", marginTop:"var(--space-2)" }}>{selectedPreset?.name ? `Applying ${selectedPreset.name}` : "Transforming your photo"}</div>
          </div>
        </div>
      )}

      {/* Top bar */}
      {(state === "camera" || state === "countdown") && (
        <div style={{ position:"absolute", top:0, left:0, right:0, display:"flex", alignItems:"center", justifyContent:"space-between", padding:"var(--space-4) var(--space-6)", background:"linear-gradient(to bottom, rgba(0,0,0,0.7), transparent)" }}>
          <div style={{ fontFamily:"var(--font-poppins), Poppins, sans-serif", fontWeight:700, fontSize:18, display:"flex", alignItems:"center", gap: 8 }}>
            {operatorLogo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={operatorLogo} alt="Logo" style={{ height: 36, maxWidth: 140, objectFit: "contain", filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.5))" }} />
            ) : (
              <span style={{ background:"linear-gradient(135deg, #7C5CFF, #C44DFF)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>BoothMagic</span>
            )}
          </div>
          <div style={{ display:"flex", gap:"var(--space-3)", alignItems:"center" }}>
            {selectedPreset && (
              <button onClick={() => setShowPresetPicker(true)} style={{ display:"flex", alignItems:"center", gap:"var(--space-2)", padding:"6px 14px", background:"rgba(124,92,255,0.2)", backdropFilter:"blur(8px)", border:"1px solid rgba(124,92,255,0.4)", borderRadius:999, color:"#fff", fontSize:13, fontWeight:600, cursor:"pointer" }}>
                🎨 {selectedPreset.name}
              </button>
            )}
            {[
              { icon:"🔄", action: toggleCamera, title:"Flip camera" },
              { icon:"↔️", action: () => setMirrored(m => !m), title:"Mirror", active: mirrored },
              { icon:"⚙️", action: () => { setShowPinModal(true); setPinInput(""); setPinError(false); }, title:"Dashboard" },
            ].map((btn, i) => (
              <button key={i} onClick={btn.action} title={btn.title} style={{ width:44, height:44, borderRadius:"50%", background: btn.active ? "rgba(124,92,255,0.4)" : "rgba(255,255,255,0.15)", backdropFilter:"blur(8px)", border:`1px solid ${btn.active ? "rgba(124,92,255,0.6)" : "rgba(255,255,255,0.2)"}`, color:"#fff", fontSize:18, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
                {btn.icon}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Error */}
      {errorMsg && state === "camera" && (
        <div style={{ position:"absolute", top:80, left:"50%", transform:"translateX(-50%)", background:"rgba(248,113,113,0.15)", border:"1px solid var(--error)", borderRadius:"var(--radius-sm)", padding:"var(--space-3) var(--space-6)", color:"var(--error)", fontSize:14 }}>
          {errorMsg} <button onClick={() => setErrorMsg("")} style={{ background:"none", border:"none", color:"inherit", cursor:"pointer", marginLeft:8 }}>✕</button>
        </div>
      )}

      {/* Capture button */}
      {state === "camera" && (
        <div style={{ position:"absolute", bottom:0, left:0, right:0, display:"flex", flexDirection:"column", alignItems:"center", padding:"var(--space-6) var(--space-6) var(--space-8)", background:"linear-gradient(to top, rgba(0,0,0,0.7), transparent)", gap:"var(--space-4)" }}>
          {activeEvent && <div style={{ fontSize:13, color:"rgba(255,255,255,0.6)", fontWeight:500 }}>📋 {activeEvent.name}</div>}
          <button id="capture-btn" onClick={startCountdown} className="touch-target"
            style={{ width:88, height:88, borderRadius:"50%", background:"var(--gradient-primary)", border:"4px solid rgba(255,255,255,0.8)", boxShadow:"0 0 0 4px rgba(124,92,255,0.4), 0 8px 32px rgba(124,92,255,0.5)", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", fontSize:32 }}
            onMouseDown={e => (e.currentTarget.style.transform="scale(0.93)")}
            onMouseUp={e => (e.currentTarget.style.transform="")}>
            📸
          </button>
          <div style={{ fontSize:12, color:"rgba(255,255,255,0.5)" }}>Tap to capture • 3-second countdown</div>
        </div>
      )}

      {/* Preset Picker Modal (T09) */}
      {showPresetPicker && (
        <div style={{ position:"absolute", inset:0, zIndex:50, background:"rgba(0,0,0,0.85)", backdropFilter:"blur(8px)", display:"flex", alignItems:"center", justifyContent:"center", padding:"var(--space-6)" }}
          onClick={e => { if (e.target === e.currentTarget) setShowPresetPicker(false); }}>
          <div style={{ width:"100%", maxWidth:560, maxHeight:"85vh", overflowY:"auto", background:"var(--surface)", borderRadius:"var(--radius-xl)", border:"1px solid var(--border)", padding:"var(--space-6)" }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"var(--space-6)" }}>
              <h2 style={{ fontFamily:"var(--font-poppins), Poppins, sans-serif", fontSize:20, fontWeight:700, color:"var(--text)" }}>Choose Style</h2>
              <button onClick={() => setShowPresetPicker(false)} style={{ background:"none", border:"none", color:"var(--text-muted)", fontSize:24, cursor:"pointer" }}>✕</button>
            </div>
            {(["SOLO","COUPLE","GROUP"] as const).map(tag => {
              const tagPresets = presets.filter(p => p.peopleTag === tag);
              if (!tagPresets.length) return null;
              return (
                <div key={tag} style={{ marginBottom:"var(--space-6)" }}>
                  <div style={{ fontSize:11, fontWeight:700, color:"var(--text-muted)", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:"var(--space-3)" }}>
                    {tag === "SOLO" ? "Solo" : tag === "COUPLE" ? "Couple" : "Group"}
                  </div>
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(120px,1fr))", gap:"var(--space-3)" }}>
                    {tagPresets.map(preset => {
                      const active = selectedPreset?.id === preset.id;
                      return (
                        <button key={preset.id} onClick={() => { setSelectedPreset(preset); setShowPresetPicker(false); }}
                          style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:"var(--space-2)", padding:"var(--space-3)", background: active ? "rgba(124,92,255,0.15)" : "var(--surface-2)", border:`2px solid ${active ? "var(--primary)" : "var(--border)"}`, borderRadius:"var(--radius-md)", cursor:"pointer", transition:"all 100ms ease" }}>
                          <div style={{ width:56, height:56, borderRadius:"var(--radius-sm)", background:"var(--bg)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:28, overflow:"hidden" }}>
                            {preset.thumbnailUrl
                              // eslint-disable-next-line @next/next/no-img-element
                              ? <img src={preset.thumbnailUrl} alt={preset.name} style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                              : (PRESET_EMOJIS[preset.name] ?? "🎨")}
                          </div>
                          <span style={{ fontSize:11, fontWeight:600, color: active ? "var(--primary)" : "var(--text)", textAlign:"center", lineHeight:1.3 }}>{preset.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      {/* T22: PIN Lock Modal */}
      {showPinModal && (
        <div
          style={{ position:"absolute", inset:0, zIndex:60, background:"rgba(0,0,0,0.85)", backdropFilter:"blur(8px)", display:"flex", alignItems:"center", justifyContent:"center" }}
          onClick={e => { if (e.target === e.currentTarget) setShowPinModal(false); }}
        >
          <div style={{ background:"var(--surface)", borderRadius:"var(--radius-xl)", border:"1px solid var(--border)", padding:"var(--space-8)", width:320, textAlign:"center" }}>
            <div style={{ fontSize:40, marginBottom:"var(--space-4)" }}>🔒</div>
            <h3 style={{ fontFamily:"var(--font-poppins), Poppins, sans-serif", fontSize:18, fontWeight:700, color:"var(--text)", marginBottom:"var(--space-2)" }}>Enter PIN</h3>
            <p style={{ fontSize:13, color:"var(--text-muted)", marginBottom:"var(--space-6)" }}>Enter your 4-digit booth PIN to access settings</p>
            <div style={{ display:"flex", gap:8, justifyContent:"center", marginBottom:"var(--space-4)" }}>
              {[0,1,2,3].map(i => (
                <div key={i} style={{
                  width:48, height:56, borderRadius:"var(--radius-md)",
                  background:"var(--surface-2)", border: pinError ? "2px solid var(--error)" : `2px solid ${pinInput.length > i ? "var(--primary)" : "var(--border)"}`,
                  display:"flex", alignItems:"center", justifyContent:"center",
                  fontSize:24, fontWeight:700, color:"var(--text)",
                  transition:"border-color 0.2s",
                }}>
                  {pinInput[i] ? "•" : ""}
                </div>
              ))}
            </div>
            <input
              type="tel"
              maxLength={4}
              value={pinInput}
              onChange={e => {
                const v = e.target.value.replace(/\D/g, "").slice(0, 4);
                setPinInput(v);
                setPinError(false);
                if (v.length === 4) {
                  if (v === boothPin) {
                    setShowPinModal(false);
                    router.push("/dashboard");
                  } else {
                    setPinError(true);
                    setTimeout(() => { setPinInput(""); setPinError(false); }, 800);
                  }
                }
              }}
              autoFocus
              style={{ position:"absolute", opacity:0, pointerEvents:"none" }}
            />
            {/* Number pad */}
            <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8, maxWidth:240, margin:"0 auto" }}>
              {[1,2,3,4,5,6,7,8,9,null,0,"⌫"].map((key, idx) => (
                key === null ? <div key={idx} /> : (
                  <button
                    key={idx}
                    onClick={() => {
                      if (key === "⌫") { setPinInput(p => p.slice(0,-1)); setPinError(false); return; }
                      const next = pinInput + key;
                      if (next.length > 4) return;
                      setPinInput(next);
                      setPinError(false);
                      if (next.length === 4) {
                        if (next === boothPin) {
                          setShowPinModal(false);
                          router.push("/dashboard");
                        } else {
                          setPinError(true);
                          setTimeout(() => { setPinInput(""); setPinError(false); }, 800);
                        }
                      }
                    }}
                    style={{
                      width:"100%", height:52, borderRadius:"var(--radius-md)",
                      background:"var(--surface-2)", border:"1px solid var(--border)",
                      color:"var(--text)", fontSize: key === "⌫" ? 20 : 22, fontWeight:600,
                      cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center",
                    }}
                  >
                    {key}
                  </button>
                )
              ))}
            </div>
            <button
              onClick={() => setShowPinModal(false)}
              style={{ marginTop:"var(--space-4)", background:"none", border:"none", color:"var(--text-muted)", fontSize:13, cursor:"pointer" }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
