"use client";

import { useQuery } from "@tanstack/react-query";

import { getSession } from "@/lib/api-client";
import { canApproveArea, canManageArea, hasAreaAccess, type AccessArea } from "@/lib/access-control";

export function useAccessControl() {
  const sessionQuery = useQuery({
    queryKey: ["auth-session"],
    queryFn: getSession,
    staleTime: 60_000,
    retry: 0,
  });

  const roleSlug = sessionQuery.data?.roleSlug ?? sessionQuery.data?.role?.slug ?? null;
  const permissions = sessionQuery.data?.permissions ?? [];

  return {
    session: sessionQuery.data ?? null,
    roleSlug,
    permissions,
    isLoading: sessionQuery.isLoading,
    canViewArea: (area: AccessArea) => hasAreaAccess(roleSlug, area, permissions),
    canManageArea: (area: AccessArea) => canManageArea(roleSlug, area, permissions),
    canApproveArea: (area: AccessArea) => canApproveArea(roleSlug, area, permissions),
  };
}
