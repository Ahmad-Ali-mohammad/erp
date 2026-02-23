"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import { logout } from "@/lib/api-client";

export function LogoutButton() {
  const router = useRouter();
  const mutation = useMutation({
    mutationFn: logout,
    onSuccess: () => {
      router.replace("/login");
      router.refresh();
    },
  });

  return (
    <button
      type="button"
      className="btn btn-outline"
      onClick={() => mutation.mutate()}
      disabled={mutation.isPending}
    >
      {mutation.isPending ? "جاري الخروج..." : "تسجيل الخروج"}
    </button>
  );
}
