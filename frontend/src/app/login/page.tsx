"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { ApiError, login } from "@/lib/api-client";

const ADMIN_USERNAME = "admin";

export default function LoginPage() {
  const router = useRouter();
  const [nextPath] = useState(() => {
    if (typeof window === "undefined") {
      return "/dashboard";
    }
    const params = new URLSearchParams(window.location.search);
    const nextValue = params.get("next");
    return nextValue && nextValue.startsWith("/") ? nextValue : "/dashboard";
  });
  const [password, setPassword] = useState("");

  const mutation = useMutation({
    mutationFn: async () => login(ADMIN_USERNAME, password),
    onSuccess: () => {
      router.replace(nextPath);
      router.refresh();
    },
  });

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    mutation.mutate();
  };

  const errorMessage = mutation.error instanceof ApiError ? mutation.error.message : "";

  return (
    <div className="auth-wrap">
      <section className="auth-card">
        <h1>تسجيل الدخول</h1>
        <p>الدخول متاح حاليًا عبر حساب المدير فقط.</p>

        <form className="auth-form" onSubmit={submit}>
          <label>
            اسم المستخدم
            <input className="field-control" value={ADMIN_USERNAME} readOnly />
          </label>

          <label>
            كلمة المرور
            <input
              className="field-control"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              required
            />
          </label>

          {errorMessage ? <p className="error-banner">{errorMessage}</p> : null}

          <div className="auth-actions">
            <button type="submit" className="btn btn-primary" disabled={mutation.isPending}>
              {mutation.isPending ? "جاري التحقق..." : "دخول بحساب المدير"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
