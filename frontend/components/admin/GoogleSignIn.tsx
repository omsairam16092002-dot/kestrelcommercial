"use client";

import { useEffect, useRef } from "react";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (opts: { client_id: string; callback: (res: { credential: string }) => void }) => void;
          renderButton: (el: HTMLElement, opts: Record<string, unknown>) => void;
        };
      };
    };
  }
}

export function GoogleSignIn({
  onCredential,
  disabled,
}: {
  onCredential: (credential: string) => void;
  disabled?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  useEffect(() => {
    if (!clientId || disabled || !ref.current) return;
    const existing = document.querySelector("script[data-google-gsi]");
    const boot = () => {
      if (!window.google || !ref.current) return;
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: (res) => onCredential(res.credential),
      });
      window.google.accounts.id.renderButton(ref.current, {
        theme: "outline",
        size: "large",
        width: 320,
        text: "continue_with",
      });
    };
    if (existing) {
      boot();
      return;
    }
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.dataset.googleGsi = "true";
    script.onload = boot;
    document.head.appendChild(script);
  }, [clientId, disabled, onCredential]);

  if (!clientId) {
    return <p className="text-sm text-mauve">Google sign-in is off until NEXT_PUBLIC_GOOGLE_CLIENT_ID is set.</p>;
  }

  return <div ref={ref} className={disabled ? "pointer-events-none opacity-50" : ""} />;
}
