import React from 'react';
import type{ Stock } from '../types/api';

interface StockListProps {
  stocks: Stock[];
  selectedSymbol: string | null;
  onSelectStock: (symbol: string) => void;
  monitoredStocks: Set<string>;
}

export const StockList: React.FC<StockListProps> = ({ stocks, selectedSymbol, onSelectStock, monitoredStocks }) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(value);
  };

  return (
    <div className="card bento-list" style={{ overflow: 'hidden', padding: 0 }}>
      <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)' }}>
        <h2 className="card-title" style={{ margin: 0 }}>Tracked Assets</h2>
      </div>
      
      <div style={{ overflowY: 'auto', flex: 1, maxHeight: '600px' }}>
        {stocks.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
            No stocks found
          </div>
        ) : (
          stocks.map((stock) => {
            const isSelected = stock.symbol === selectedSymbol;
            const isMonitored = monitoredStocks.has(stock.symbol);
            
            return (
              <div 
                key={stock.symbol}
                onClick={() => onSelectStock(stock.symbol)}
                style={{
                  padding: '16px 24px',
                  borderBottom: '1px solid var(--border)',
                  cursor: 'pointer',
                  background: isSelected ? 'var(--surface-hover)' : 'transparent',
                  borderLeft: isSelected ? '3px solid var(--accent)' : '3px solid transparent',
                  transition: 'background 0.2s',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{stock.symbol}</span>
                    {isMonitored && <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent)' }}></span>}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                    {new Date(stock.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
                
                <div style={{ fontWeight: 500 }}>
                  {formatCurrency(stock.price)}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
