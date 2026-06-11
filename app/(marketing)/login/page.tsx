"use client";

/**
 * app/(marketing)/login/page.tsx
 * Login page — email + password form using Auth.js Credentials provider.
 */

import { signIn } from "next-auth/react";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
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
              Email
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
            <label htmlFor="login-password" className="form-label">
              Password
            </label>
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
