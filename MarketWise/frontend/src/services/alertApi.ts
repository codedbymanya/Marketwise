import type { PriceAlert, AlertCreatePayload } from '../types/alert';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export async function fetchAlerts(token: string, statusFilter?: string): Promise<PriceAlert[]> {
  const url = statusFilter 
    ? `${API_BASE}/alerts?status_filter=${encodeURIComponent(statusFilter)}`
    : `${API_BASE}/alerts`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to load price alerts' }));
    throw new Error(err.detail || 'Failed to load price alerts');
  }

  return res.json();
}

export async function createAlert(token: string, payload: AlertCreatePayload): Promise<PriceAlert> {
  const res = await fetch(`${API_BASE}/alerts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to create price alert' }));
    throw new Error(err.detail || 'Failed to create price alert');
  }

  return res.json();
}

export async function deleteAlert(token: string, alertId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/alerts/${encodeURIComponent(alertId)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to delete alert' }));
    throw new Error(err.detail || 'Failed to delete alert');
  }
}

export async function disableAlert(token: string, alertId: string): Promise<PriceAlert> {
  const res = await fetch(`${API_BASE}/alerts/${encodeURIComponent(alertId)}/disable`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to disable alert' }));
    throw new Error(err.detail || 'Failed to disable alert');
  }

  return res.json();
}
