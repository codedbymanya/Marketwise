import type { Stock, StockHistory } from '../types/api';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const fetchStocks = async (): Promise<Stock[]> => {
  const response = await fetch(`${API_BASE_URL}/stocks`);
  if (!response.ok) {
    throw new Error('Failed to fetch stocks');
  }
  return response.json();
};

export const fetchStockHistory = async (symbol: string): Promise<StockHistory[]> => {
  const response = await fetch(`${API_BASE_URL}/stocks/${symbol}/history`);
  if (!response.ok) {
    throw new Error(`Failed to fetch history for ${symbol}`);
  }
  return response.json();
};
