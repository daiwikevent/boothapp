"use client";

/**
 * app/(marketing)/login/page.tsx
 * Login page — email + password form using Auth.js Credentials provider.
 */

import { signIn } from "next-auth/react";
import Link from "next/link";
import { useState, type FormEvent, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const errorQuery = searchParams.get("error");
  const successQuery = searchParams.get("success");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (errorQuery === "verify") {
      setError("Please verify your email address to access the dashboard. Check your inbox for the link.");
    } else if (errorQuery === "expired-token") {
      setError("Your verification link has expired. Please sign up again.");
    } else if (errorQuery === "invalid-token") {
      setError("The verification link is invalid or has already been used.");
    } else if (errorQuery === "verify-failed") {
      setError("Email verification failed. Please try again.");
    }

    if (successQuery === "verified") {
      setSuccessMsg("Email verified successfully! You can now sign in.");
    } else if (successQuery === "password-reset") {
      setSuccessMsg("Password reset successfully! Please log in with your new password.");
    }
  }, [errorQuery, successQuery]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSuccessMsg("");
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        email: email.toLowerCase().trim(),
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Invalid email or password");
      } else {
        router.push("/dashboard");
        router.refresh();
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        {/* Logo / Title */}
        <div className="auth-header">
          <h1 className="auth-title">
            Welcome back to <span className="text-gradient">BoothMagic</span>
          </h1>
          <p className="auth-subtitle">
            Sign in to manage your AI photobooth events
          </p>
        </div>

        {/* Success banner */}
        {successMsg && (
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
            <span>{successMsg}</span>
          </div>
        )}

        {/* Error banner */}
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

        {/* Login form */}
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="login-email" className="form-label">
              Email Address
            </label>
            <input
              id="login-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              required
              autoComplete="email"
              className="form-input"
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-2)" }}>
              <label htmlFor="login-password" className="form-label" style={{ margin: 0 }}>
                Password
              </label>
              <Link href="/forgot-password" style={{ fontSize: 12, color: "var(--primary)", textDecoration: "none" }}>
                Forgot Password?
              </Link>
            </div>
            <input
              id="login-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="current-password"
              minLength={8}
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
              "Sign In"
            )}
          </button>
        </form>

        {/* Footer links */}
        <div className="auth-footer">
          <p>
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="auth-link">
              Sign up free
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="auth-page">
        <div className="auth-card" style={{ display: "flex", justifyContent: "center", padding: 48 }}>
          <div className="auth-spinner" />
        </div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
