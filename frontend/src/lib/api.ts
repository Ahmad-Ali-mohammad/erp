import { API_BASE_URL } from "@/lib/config";

export type HealthResponse = {
  status: string;
  service: string;
  timestamp: string;
};

export async function getHealthStatus(): Promise<HealthResponse | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/core/health/`, {
      cache: "no-store",
    });
    if (!response.ok) {
      return null;
    }
    return (await response.json()) as HealthResponse;
  } catch {
    return null;
  }
}
