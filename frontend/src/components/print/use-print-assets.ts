"use client";

import { useQuery } from "@tanstack/react-query";

import { request } from "@/lib/api-client";
import type { CompanyProfile, PrintSettings } from "@/lib/entities";

export function usePrintAssets() {
  const settingsQuery = useQuery({
    queryKey: ["print-settings"],
    queryFn: () => request<PrintSettings>("/v1/finance/print-settings/"),
  });

  const profileQuery = useQuery({
    queryKey: ["company-profile"],
    queryFn: () => request<CompanyProfile>("/v1/core/company-profile/"),
  });

  const errorMessage =
    settingsQuery.error instanceof Error
      ? settingsQuery.error.message
      : profileQuery.error instanceof Error
        ? profileQuery.error.message
        : "";

  return {
    settings: settingsQuery.data,
    profile: profileQuery.data,
    isLoading: settingsQuery.isLoading || profileQuery.isLoading,
    errorMessage,
  };
}
