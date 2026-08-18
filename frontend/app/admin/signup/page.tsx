"use client";

import { FormEvent, useCallback, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { GoogleSignIn } from "@/components/admin/GoogleSignIn";
import { googleDesk, registerDesk } from "@/lib/adminApi";

export default function AdminSignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  const go = useCallback(() => {
    router.replace("/admin");
    router.refresh();
  }, [router]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setPending(true);
    try {
      await registerDesk({ name, email, password, inviteCode: inviteCode || undefined });
      go();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create the account.");
    } finally {
      setPending(false);
    }
  }

  async function onGoogle(credential: string) {
    setError("");
    setPending(true);
    try {
      await googleDesk(credential, inviteCode || undefined);
      go();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Google sign-up failed.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink px-4 py-16 text-paper">
      <div className="w-full max-w-md bg-paper p-8 text-ink">
        <p className="t-caption text-oxblood">Kestrel desk</p>
        <h1 className="t-h2 mt-2">Create a desk login</h1>
        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">Name</span>
            <input className="kc-field w-full px-4 py-3" value={name} onChange={(e) => setName(e.target.value)} required />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">Email</span>
            <input
              className="kc-field w-full px-4 py-3"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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
              minLength={8}
              required
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">Invite code (if signup is locked)</span>
            <input className="kc-field w-full px-4 py-3" value={inviteCode} onChange={(e) => setInviteCode(e.target.value)} />
          </label>
          {error ? <p className="text-sm text-oxblood">{error}</p> : null}
          <button type="submit" disabled={pending} className="btn-sharp w-full bg-oxblood text-paper hover:bg-ink disabled:opacity-60">
            {pending ? "Creating…" : "Create account"}
          </button>
        </form>
        <div className="mt-6 border-t border-oxblood/10 pt-6">
          <GoogleSignIn onCredential={onGoogle} disabled={pending} />
        </div>
        <p className="mt-6 text-sm text-mauve">
          Already on the desk?{" "}
          <Link href="/admin/login" className="font-semibold text-oxblood hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
