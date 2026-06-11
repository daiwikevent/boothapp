"use client";

import { useState, useEffect, type FormEvent, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (!token) {
      setError("Invalid link. The password reset token is missing.");
    }
  }, [token]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!token) {
      setError("Cannot reset password without a valid token.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to reset password.");
      } else {
        setSuccess("Password updated successfully! Redirecting to login...");
        setTimeout(() => {
          router.push("/login?success=password-reset");
        }, 3000);
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
            New <span className="text-gradient">Password</span>
          </h1>
          <p className="auth-subtitle">
            Enter your new secure password below
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
              <label htmlFor="new-password" className="form-label">
                New Password
              </label>
              <input
                id="new-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={8}
                className="form-input"
                disabled={loading || !token}
              />
            </div>

            <div className="form-group">
              <label htmlFor="confirm-password" className="form-label">
                Confirm New Password
              </label>
              <input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={8}
                className="form-input"
                disabled={loading || !token}
              />
            </div>

            <button
              type="submit"
              disabled={loading || !token}
              className="btn-primary auth-submit"
            >
              {loading ? (
                <span className="auth-spinner" />
              ) : (
                "Update Password"
              )}
            </button>
          </form>
        )}

        <div className="auth-footer">
          <p>
            Go back to{" "}
            <Link href="/login" className="auth-link">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="auth-page">
        <div className="auth-card" style={{ display: "flex", justifyContent: "center", padding: 48 }}>
          <div className="auth-spinner" />
        </div>
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}
