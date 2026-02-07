import type { TrackingStatus, PurchaseAlert } from "../types";

const API_BASE = "/api";

export async function fetchTrackingData(): Promise<{
  status: TrackingStatus;
  alerts: PurchaseAlert[];
}> {
  const [statusRes, alertsRes] = await Promise.all([
    fetch(`${API_BASE}/tracking/status`).then((r) => r.json()),
    fetch(`${API_BASE}/tracking/purchase-alerts`).then((r) => r.json()),
  ]);
  return {
    status: statusRes,
    alerts: alertsRes.alerts || [],
  };
}

export async function sendHeartbeat() {
  await fetch(`${API_BASE}/tracking/heartbeat`, { method: "POST" }).catch(() => {});
}
