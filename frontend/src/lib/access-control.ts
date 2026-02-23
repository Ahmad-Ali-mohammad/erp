export type AccessArea = "projects" | "procurement" | "finance" | "real_estate" | "admin";

type RolePolicy = {
  areas: AccessArea[];
  manageAreas: AccessArea[];
  approveAreas: AccessArea[];
};

const allAreas: AccessArea[] = ["projects", "procurement", "finance", "real_estate", "admin"];

const fullAccessPolicy: RolePolicy = {
  areas: allAreas,
  manageAreas: allAreas,
  approveAreas: ["projects", "procurement", "finance"],
};

const noAccessPolicy: RolePolicy = {
  areas: [],
  manageAreas: [],
  approveAreas: [],
};

const rolePolicies: Record<string, RolePolicy> = {
  super_admin: fullAccessPolicy,
  admin: fullAccessPolicy,

  project_manager: {
    areas: ["projects", "real_estate"],
    manageAreas: ["projects", "real_estate"],
    approveAreas: ["projects"],
  },
  project_accountant: {
    areas: ["projects", "finance"],
    manageAreas: ["projects", "finance"],
    approveAreas: ["finance"],
  },
  site_supervisor: {
    areas: ["projects", "procurement"],
    manageAreas: ["projects", "procurement"],
    approveAreas: [],
  },

  procurement_manager: {
    areas: ["procurement", "projects"],
    manageAreas: ["procurement"],
    approveAreas: ["procurement"],
  },
  procurement_officer: {
    areas: ["procurement", "projects"],
    manageAreas: ["procurement"],
    approveAreas: [],
  },

  finance_manager: {
    areas: ["finance", "projects"],
    manageAreas: ["finance"],
    approveAreas: ["finance"],
  },
  accountant: {
    areas: ["finance", "projects", "real_estate"],
    manageAreas: ["finance", "real_estate"],
    approveAreas: ["finance"],
  },

  auditor: {
    areas: allAreas,
    manageAreas: [],
    approveAreas: [],
  },
  viewer: {
    areas: ["projects", "procurement", "finance", "real_estate"],
    manageAreas: [],
    approveAreas: [],
  },
};

const areaAliases: Record<AccessArea, string[]> = {
  projects: [
    "projects",
    "project",
    "phase",
    "phases",
    "boq",
    "boqitem",
    "costcode",
    "costrecord",
    "budgetline",
    "changeorder",
  ],
  procurement: [
    "procurement",
    "purchasing",
    "purchase",
    "supplier",
    "warehouse",
    "material",
    "stocktransaction",
    "purchaserequest",
    "purchaseorder",
  ],
  finance: [
    "finance",
    "financial",
    "account",
    "journalentry",
    "invoice",
    "payment",
    "progressbilling",
    "revenuerecognition",
  ],
  real_estate: [
    "real_estate",
    "realestate",
    "real",
    "estate",
    "reservation",
    "salescontract",
    "contract",
    "installment",
    "handover",
    "unit",
    "building",
  ],
  admin: ["admin", "administration", "core", "role", "user", "auditlog"],
};

const permissionLevelAliases = {
  view: ["view", "read", "list"],
  manage: ["manage", "write", "edit", "create", "update", "delete", "add", "change", "remove"],
  approve: ["approve", "approval", "reject", "confirm", "accept"],
} as const;

function normalizeRoleSlug(roleSlug?: string | null): string | null {
  if (!roleSlug) {
    return null;
  }
  const normalized = roleSlug.trim().toLowerCase().replace(/[-\s]+/g, "_");
  return normalized || null;
}

function getPolicy(roleSlug?: string | null): RolePolicy {
  const normalized = normalizeRoleSlug(roleSlug);
  if (!normalized) {
    return noAccessPolicy;
  }
  return rolePolicies[normalized] ?? noAccessPolicy;
}

export function normalizePermissionClaims(permissions?: string[] | null): string[] {
  if (!permissions || permissions.length === 0) {
    return [];
  }
  return Array.from(
    new Set(
      permissions
        .map((permission) => permission.trim().toLowerCase())
        .filter((permission) => permission.length > 0),
    ),
  );
}

function claimMatches(claim: string, area: AccessArea, level: "view" | "manage" | "approve"): boolean {
  if (claim === "*" || claim === "all" || claim === "full_access") {
    return true;
  }

  const areaTokens = areaAliases[area];
  const levelTokens = permissionLevelAliases[level];
  const normalized = claim.replace(/[^a-z0-9]+/g, " ").trim();
  const tokens = normalized ? normalized.split(/\s+/) : [];
  const hasAreaToken = areaTokens.some((token) => tokens.includes(token));
  const hasLevelToken = levelTokens.some((token) => tokens.includes(token));

  if (
    claim.includes(`${area}:*`) ||
    claim.includes(`${area}.*`) ||
    claim.includes(`${area}_all`) ||
    claim.includes(`${area}.all`) ||
    claim.includes(`${area}.full`)
  ) {
    return true;
  }
  if (claim.includes(`*:${area}`) || claim.includes(`*.${area}`)) {
    return true;
  }
  if (claim.includes(`${level}:*`) || claim.includes(`${level}.*`)) {
    return true;
  }
  if (hasAreaToken && hasLevelToken) {
    return true;
  }

  // Django-like permission codename examples:
  // finance.view_invoice, procurement.change_purchaseorder, projects.approve_changeorder
  if (claim.includes(".") && hasLevelToken && hasAreaToken) {
    return true;
  }

  return false;
}

function wildcardPatternToRegex(pattern: string): RegExp | null {
  if (!pattern.includes("*")) {
    return null;
  }
  const escaped = pattern
    .replace(/[.+?^${}()|[\]\\]/g, "\\$&")
    .replace(/\*/g, ".*");
  return new RegExp(`^${escaped}$`);
}

export function hasAnyPermissionClaim(permissions: string[] | null | undefined, candidates: string[]): boolean {
  const normalizedClaims = normalizePermissionClaims(permissions);
  if (normalizedClaims.length === 0 || candidates.length === 0) {
    return false;
  }

  const normalizedCandidates = Array.from(
    new Set(
      candidates
        .map((candidate) => candidate.trim().toLowerCase())
        .filter((candidate) => candidate.length > 0),
    ),
  );
  if (normalizedCandidates.length === 0) {
    return false;
  }

  return normalizedClaims.some((claim) => {
    if (claim === "*" || claim === "all" || claim === "full_access") {
      return true;
    }
    if (normalizedCandidates.includes(claim)) {
      return true;
    }
    const wildcardRegex = wildcardPatternToRegex(claim);
    if (wildcardRegex && normalizedCandidates.some((candidate) => wildcardRegex.test(candidate))) {
      return true;
    }
    return false;
  });
}

function hasPermissionClaimForAreaLevel(
  permissions: string[],
  area: AccessArea,
  level: "view" | "manage" | "approve",
): boolean {
  const normalized = normalizePermissionClaims(permissions);
  if (normalized.length === 0) {
    return false;
  }

  const levelsToCheck =
    level === "view" ? (["view", "manage", "approve"] as const) : level === "manage" ? (["manage", "approve"] as const) : (["approve"] as const);

  return normalized.some((claim) => levelsToCheck.some((levelToCheck) => claimMatches(claim, area, levelToCheck)));
}

function shouldUsePermissionClaims(permissions?: string[] | null): boolean {
  return normalizePermissionClaims(permissions).length > 0;
}

export function hasAreaAccess(roleSlug: string | null | undefined, area: AccessArea, permissions?: string[] | null): boolean {
  const roleAllows = getPolicy(roleSlug).areas.includes(area);
  if (!shouldUsePermissionClaims(permissions)) {
    return roleAllows;
  }
  return roleAllows || hasPermissionClaimForAreaLevel(permissions ?? [], area, "view");
}

export function canManageArea(roleSlug: string | null | undefined, area: AccessArea, permissions?: string[] | null): boolean {
  const roleAllows = getPolicy(roleSlug).manageAreas.includes(area);
  if (!shouldUsePermissionClaims(permissions)) {
    return roleAllows;
  }
  return roleAllows || hasPermissionClaimForAreaLevel(permissions ?? [], area, "manage");
}

export function canApproveArea(roleSlug: string | null | undefined, area: AccessArea, permissions?: string[] | null): boolean {
  const roleAllows = getPolicy(roleSlug).approveAreas.includes(area);
  if (!shouldUsePermissionClaims(permissions)) {
    return roleAllows;
  }
  return roleAllows || hasPermissionClaimForAreaLevel(permissions ?? [], area, "approve");
}

export function inferAccessAreaFromResourcePath(resourcePath: string): AccessArea | null {
  if (resourcePath.startsWith("/v1/projects/")) {
    return "projects";
  }
  if (resourcePath.startsWith("/v1/procurement/")) {
    return "procurement";
  }
  if (resourcePath.startsWith("/v1/finance/")) {
    return "finance";
  }
  if (resourcePath.startsWith("/v1/real-estate/")) {
    return "real_estate";
  }
  if (resourcePath.startsWith("/v1/core/")) {
    return "admin";
  }
  return null;
}
