import React from 'react';
import type{ Stock } from '../types/api';
import { Activity, TrendingUp } from 'lucide-react';

interface MarketSummaryProps {
  stocks: Stock[];
}

export const MarketSummary: React.FC<MarketSummaryProps> = ({ stocks }) => {
  const activeCount = stocks.length;
  
  return (
    <div className="card bento-market" style={{ flexDirection: 'row', gap: '32px', alignItems: 'center' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{ background: 'var(--surface-hover)', padding: '12px', borderRadius: '10px' }}>
          <Activity size={24} color="var(--accent)" />
        </div>
        <div>
          <h2 className="card-title" style={{ marginBottom: '4px' }}>Market Overview</h2>
          <div style={{ fontSize: '1.5rem', fontWeight: 600 }}>{activeCount} Tracked Stocks</div>
        </div>
      </div>
      
      <div style={{ height: '40px', width: '1px', background: 'var(--border)' }}></div>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <TrendingUp size={20} className="value-up" />
        <div>
          <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Status</div>
          <div style={{ fontWeight: 500, color: 'var(--success)' }}>Systems Operational</div>
        </div>
      </div>
    </div>
  );
};
