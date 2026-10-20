export interface PriceAlert {
  alert_id: string;
  symbol: string;
  target_price: number;
  condition: 'ABOVE' | 'BELOW';
  status: 'ACTIVE' | 'TRIGGERED' | 'DISABLED';
  created_at: string;
  triggered_at: string | null;
  triggered_price: number | null;
}

export interface AlertCreatePayload {
  symbol: string;
  target_price: number;
  condition: 'ABOVE' | 'BELOW';
}
