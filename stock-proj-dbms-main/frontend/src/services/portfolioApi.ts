import type { PortfolioData, Transaction, TransactionCreatePayload } from '../types/portfolio';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export async function fetchPortfolio(token: string): Promise<PortfolioData> {
  const res = await fetch(`${API_BASE}/portfolio`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to load portfolio' }));
    throw new Error(err.detail || 'Failed to load portfolio');
  }

  return res.json();
}

export async function fetchTransactions(token: string): Promise<Transaction[]> {
  const res = await fetch(`${API_BASE}/portfolio/transactions`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to load transactions' }));
    throw new Error(err.detail || 'Failed to load transactions');
  }

  return res.json();
}

export async function createTransaction(token: string, payload: TransactionCreatePayload): Promise<Transaction> {
  const res = await fetch(`${API_BASE}/portfolio/transactions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to record transaction' }));
    throw new Error(err.detail || 'Failed to record transaction');
  }

  return res.json();
}

export async function deleteTransaction(token: string, transactionId: string): Promise<{ message: string; transaction_id: string }> {
  const res = await fetch(`${API_BASE}/portfolio/transactions/${transactionId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to delete transaction' }));
    throw new Error(err.detail || 'Failed to delete transaction');
  }

  return res.json();
}
