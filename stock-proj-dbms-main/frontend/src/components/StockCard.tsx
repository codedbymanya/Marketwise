import React, { useMemo } from 'react';
import type { Stock, StockHistory } from '../types/api';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Bookmark, BookmarkCheck, Clock } from 'lucide-react';
import { COMPANY_NAMES } from '../constants/stocks';

interface StockCardProps {
  stock: Stock | null;
  history: StockHistory[];
  isMonitored: boolean;
  isWaitlisted: boolean;
  onToggleMonitor: (symbol: string) => void;
  onToggleWaitlist: (symbol: string) => void;
  isLoading: boolean;
}

export const StockCard: React.FC<StockCardProps> = ({ 
  stock, 
  history, 
  isMonitored, 
  isWaitlisted, 
  onToggleMonitor, 
  onToggleWaitlist, 
  isLoading 
}) => {
  const chartData = useMemo(() => {
    return history.map(item => ({
      time: new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      price: item.price
    }));
  }, [history]);

  if (!stock) {
    return (
      <div className="card bento-main" style={{ justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ color: 'var(--text-muted)' }}>Select a stock to view details</div>
      </div>
    );
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(value);
  };

  return (
    <div className="card bento-main">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '2px' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 600 }}>{stock.symbol}</h2>
            <span style={{ fontSize: '0.75rem', padding: '4px 8px', background: 'var(--surface-hover)', borderRadius: '4px', color: 'var(--text-muted)' }}>NSE</span>
          </div>
          <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
            {COMPANY_NAMES[stock.symbol] || 'NIFTY 50 Constituent'}
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
            {formatCurrency(stock.price)}
          </div>
          <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            Last updated: {new Date(stock.timestamp).toLocaleString()}
          </div>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button 
            onClick={() => onToggleMonitor(stock.symbol)}
            title={isMonitored ? "Remove from Watchlist" : "Add to Watchlist"}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px', 
              padding: '8px 14px', 
              borderRadius: '8px', 
              border: `1px solid ${isMonitored ? 'var(--accent)' : 'var(--border)'}`,
              background: isMonitored ? '#eff6ff' : 'transparent',
              color: isMonitored ? 'var(--accent)' : 'var(--text-main)',
              fontWeight: 500,
              fontSize: '0.875rem',
              transition: 'all 0.2s'
            }}
          >
            {isMonitored ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
            {isMonitored ? 'Watching' : 'Watch'}
          </button>

          <button 
            onClick={() => onToggleWaitlist(stock.symbol)}
            title={isWaitlisted ? "Remove from Waitlist" : "Add to Waitlist"}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px', 
              padding: '8px 14px', 
              borderRadius: '8px', 
              border: `1px solid ${isWaitlisted ? '#f59e0b' : 'var(--border)'}`,
              background: isWaitlisted ? '#fef3c7' : 'transparent',
              color: isWaitlisted ? '#b45309' : 'var(--text-main)',
              fontWeight: 500,
              fontSize: '0.875rem',
              transition: 'all 0.2s'
            }}
          >
            <Clock size={16} />
            {isWaitlisted ? 'Waitlisted' : 'Waitlist'}
          </button>
        </div>
      </div>

      <div style={{ flex: 1, minHeight: '300px', width: '100%', position: 'relative' }}>
        {isLoading ? (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.7)', zIndex: 10 }}>
            <div style={{ color: 'var(--text-muted)' }}>Loading chart data...</div>
          </div>
        ) : null}
        
        {history.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="var(--accent)" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.5} />
              <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 12 }} dy={10} minTickGap={30} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 12 }} domain={['auto', 'auto']} tickFormatter={(val) => `₹${val}`} />
              <Tooltip 
                contentStyle={{ borderRadius: '8px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-md)', padding: '12px' }}
                itemStyle={{ color: 'var(--text-main)', fontWeight: 600 }}
                labelStyle={{ color: 'var(--text-muted)', marginBottom: '4px' }}
              />
              <Area type="monotone" dataKey="price" stroke="var(--accent)" strokeWidth={2} fillOpacity={1} fill="url(#colorPrice)" isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          !isLoading && <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>No historical data available</div>
        )}
      </div>
    </div>
  );
};
