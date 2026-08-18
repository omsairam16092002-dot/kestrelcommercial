"use client";

import { FormEvent, Suspense, useCallback, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { GoogleSignIn } from "@/components/admin/GoogleSignIn";
import { googleDesk, loginDesk } from "@/lib/adminApi";

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-ink" />}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const next = useSearchParams().get("next") || "/admin";
  const [email, setEmail] = useState("jignesh@kestrelcommercial.com");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  const go = useCallback(
    (href: string) => {
      router.replace(href);
      router.refresh();
    },
    [router],
  );

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setPending(true);
    try {
      await loginDesk(email, password);
      go(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign in.");
    } finally {
      setPending(false);
    }
  }

  async function onGoogle(credential: string) {
    setError("");
    setPending(true);
    try {
      await googleDesk(credential);
      go(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Google sign-in failed.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink px-4 py-16 text-paper">
      <div className="w-full max-w-md bg-paper p-8 text-ink">
        <p className="t-caption text-oxblood">Kestrel desk</p>
        <h1 className="t-h2 mt-2">Sign in</h1>
        <p className="t-body mt-2 text-mauve">Email and password, or Google.</p>
        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">Email</span>
            <input
              className="kc-field w-full px-4 py-3"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">Password</span>
            <input
              className="kc-field w-full px-4 py-3"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </label>
          {error ? <p className="text-sm text-oxblood">{error}</p> : null}
          <button type="submit" disabled={pending} className="btn-sharp w-full bg-oxblood text-paper hover:bg-ink disabled:opacity-60">
            {pending ? "Signing in…" : "Sign in"}
          </button>
        </form>
        <div className="mt-6 border-t border-oxblood/10 pt-6">
          <GoogleSignIn onCredential={onGoogle} disabled={pending} />
        </div>
        <p className="mt-6 text-sm text-mauve">
          New desk user?{" "}
          <Link href="/admin/signup" className="font-semibold text-oxblood hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
