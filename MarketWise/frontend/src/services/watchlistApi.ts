import type { WatchlistItem } from '../types/watchlist';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export async function fetchWatchlist(token: string): Promise<WatchlistItem[]> {
  const res = await fetch(`${API_BASE}/watchlist`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to load watchlist' }));
    throw new Error(err.detail || 'Failed to load watchlist');
  }

  return res.json();
}

export async function addToWatchlist(token: string, symbol: string): Promise<WatchlistItem> {
  const res = await fetch(`${API_BASE}/watchlist`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ symbol }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to add to watchlist' }));
    throw new Error(err.detail || 'Failed to add to watchlist');
  }

  return res.json();
}

export async function removeFromWatchlist(token: string, symbol: string): Promise<void> {
  const res = await fetch(`${API_BASE}/watchlist/${encodeURIComponent(symbol)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to remove from watchlist' }));
    throw new Error(err.detail || 'Failed to remove from watchlist');
  }
}

export async function syncWatchlist(token: string, symbols: string[]): Promise<string[]> {
  const res = await fetch(`${API_BASE}/watchlist/sync`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ symbols }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to sync watchlist' }));
    throw new Error(err.detail || 'Failed to sync watchlist');
  }

  const data = await res.json();
  return data.symbols || [];
}
