"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to initiate password reset.");
      } else {
        setSuccess(data.message || "Reset link sent successfully! Please check your inbox.");
      }
    } catch {
      setError("Something went wrong. Please try again later.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <h1 className="auth-title">
            Reset <span className="text-gradient">Password</span>
          </h1>
          <p className="auth-subtitle">
            Enter your email address to receive a password reset link
          </p>
        </div>

        {error && (
          <div className="auth-error" role="alert">
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <circle cx="8" cy="8" r="7" />
              <path d="M8 5v3M8 10.5v.5" />
            </svg>
            {error}
          </div>
        )}

        {success && (
          <div
            style={{
              padding: "var(--space-3) var(--space-4)",
              background: "rgba(52, 211, 153, 0.08)",
              border: "1px solid var(--success)",
              borderRadius: "var(--radius-sm)",
              color: "var(--success)",
              fontSize: 14,
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: "var(--space-4)",
            }}
            role="alert"
          >
            <span>✅</span>
            <span>{success}</span>
          </div>
        )}

        {!success && (
          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label htmlFor="reset-email" className="form-label">
                Email Address
              </label>
              <input
                id="reset-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                required
                className="form-input"
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary auth-submit"
            >
              {loading ? (
                <span className="auth-spinner" />
              ) : (
                "Send Reset Link"
              )}
            </button>
          </form>
        )}

        <div className="auth-footer">
          <p>
            Remembered your password?{" "}
            <Link href="/login" className="auth-link">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
