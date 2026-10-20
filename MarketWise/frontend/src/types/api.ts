export interface Stock {
  symbol: string;
  price: number;
  volume: number;
  timestamp: string;
}

export interface StockHistory {
  price: number;
  volume: number;
  timestamp: string;
}
