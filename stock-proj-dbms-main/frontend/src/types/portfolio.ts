export interface PortfolioSummary {
  portfolio_id: string;
  name: string;
  total_value: number;
  total_invested: number;
  total_unrealized_pnl: number;
  total_unrealized_pnl_pct: number;
  total_realized_pnl: number;
  holdings_count: number;
}

export interface Holding {
  symbol: string;
  quantity: number;
  avg_buy_price: number;
  total_invested: number;
  current_price: number | null;
  current_value: number | null;
  unrealized_pnl: number | null;
  unrealized_pnl_pct: number | null;
  realized_pnl: number;
}

export interface Transaction {
  transaction_id: string;
  symbol: string;
  transaction_type: 'BUY' | 'SELL';
  quantity: number;
  price: number;
  total_amount?: number;
  transaction_date: string;
  created_at?: string;
}

export interface PortfolioData {
  portfolio: PortfolioSummary;
  holdings: Holding[];
}

export interface TransactionCreatePayload {
  symbol: string;
  transaction_type: 'BUY' | 'SELL';
  quantity: number;
  price: number;
  transaction_date?: string;
}
