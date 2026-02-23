"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { GOOGLE_CLIENT_ID } from "@/lib/config";
import { ApiError, googleLogin } from "@/lib/api-client";

type GoogleLoginButtonProps = {
  userType: "customer" | "employee";
  nextPath: string;
  label?: string;
};

declare global {
  interface Window {
    google?: {
      accounts?: {
        id?: {
          initialize: (config: { client_id: string; callback: (response: { credential: string }) => void }) => void;
          renderButton: (element: HTMLElement, options: Record<string, string>) => void;
        };
      };
    };
  }
}

export function GoogleLoginButton({ userType, nextPath, label }: GoogleLoginButtonProps) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || !containerRef.current) {
      return;
    }

    const container = containerRef.current;

    const initialize = () => {
      if (!window.google?.accounts?.id) {
        return;
      }
      container.innerHTML = "";
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: async (response) => {
          try {
            setError("");
            await googleLogin(response.credential, userType);
            router.replace(nextPath);
            router.refresh();
          } catch (err) {
            const message = err instanceof ApiError ? err.message : "فشل تسجيل الدخول عبر Google.";
            setError(message);
          }
        },
      });
      window.google.accounts.id.renderButton(container, {
        theme: "outline",
        size: "large",
        shape: "pill",
        text: label ?? "continue_with",
      });
    };

    if (window.google?.accounts?.id) {
      initialize();
      return;
    }

    const scriptId = "google-gsi";
    if (document.getElementById(scriptId)) {
      const listener = () => initialize();
      window.addEventListener("google-gsi-loaded", listener, { once: true });
      return () => window.removeEventListener("google-gsi-loaded", listener);
    }

    const script = document.createElement("script");
    script.id = scriptId;
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => {
      window.dispatchEvent(new Event("google-gsi-loaded"));
      initialize();
    };
    document.head.appendChild(script);

    return () => {
      container.innerHTML = "";
    };
  }, [label, nextPath, router, userType]);

  if (!GOOGLE_CLIENT_ID) {
    return null;
  }

  return (
    <div className="google-login-block">
      <div ref={containerRef} />
      {error ? <p className="error-banner">{error}</p> : null}
    </div>
  );
}
