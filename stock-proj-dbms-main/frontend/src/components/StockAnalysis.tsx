import React, { useMemo } from 'react';
import type{ StockHistory } from '../types/api';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface StockAnalysisProps {
  history: StockHistory[];
}

export const StockAnalysis: React.FC<StockAnalysisProps> = ({ history }) => {
  const analysis = useMemo(() => {
    if (history.length < 2) return null;
    
    // Sort chronologically just in case
    const sorted = [...history].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    
    const oldest = sorted[0].price;
    const newest = sorted[sorted.length - 1].price;
    
    const change = newest - oldest;
    const percentChange = (change / oldest) * 100;
    
    let trend: 'up' | 'down' | 'stable' = 'stable';
    if (percentChange > 0.1) trend = 'up';
    else if (percentChange < -0.1) trend = 'down';
    
    return {
      change,
      percentChange,
      trend,
      oldest,
      newest
    };
  }, [history]);

  if (!analysis) {
    return (
      <div className="card bento-analysis">
        <h2 className="card-title">Trend Analysis</h2>
        <div style={{ color: 'var(--text-muted)' }}>Not enough data for trend analysis.</div>
      </div>
    );
  }

  const isUp = analysis.trend === 'up';
  const isDown = analysis.trend === 'down';
  
  return (
    <div className="card bento-analysis">
      <h2 className="card-title">Trend Analysis</h2>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', background: 'var(--surface-hover)', padding: '16px', borderRadius: '12px', flex: 1, minWidth: '200px' }}>
          <div style={{ 
            background: isUp ? 'rgba(22, 163, 74, 0.1)' : isDown ? 'rgba(220, 38, 38, 0.1)' : 'var(--border)',
            color: isUp ? 'var(--success)' : isDown ? 'var(--danger)' : 'var(--text-muted)',
            padding: '12px',
            borderRadius: '50%'
          }}>
            {isUp ? <TrendingUp size={24} /> : isDown ? <TrendingDown size={24} /> : <Minus size={24} />}
          </div>
          
          <div>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Session Trend</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 600, textTransform: 'capitalize' }}>
              {analysis.trend}
            </div>
          </div>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', background: 'var(--surface-hover)', padding: '16px', borderRadius: '12px', flex: 1, minWidth: '200px' }}>
          <div>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Percentage Change</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 600, color: isUp ? 'var(--success)' : isDown ? 'var(--danger)' : 'var(--text-main)' }}>
              {isUp ? '+' : ''}{analysis.percentChange.toFixed(2)}%
            </div>
          </div>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', background: 'var(--surface-hover)', padding: '16px', borderRadius: '12px', flex: 1, minWidth: '200px' }}>
          <div>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Absolute Change</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 600, color: isUp ? 'var(--success)' : isDown ? 'var(--danger)' : 'var(--text-main)' }}>
              {isUp ? '+' : ''}₹{Math.abs(analysis.change).toFixed(2)}
            </div>
          </div>
        </div>
      </div>
      
      <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '16px' }}>
        * Note: This is a frontend calculation based strictly on the available historical price data for this session.
      </p>
    </div>
  );
};
