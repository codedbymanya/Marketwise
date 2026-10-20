import React, { useState } from 'react';
import type { Stock } from '../types/api';
import { ArrowRightLeft, Trash2, Clock, Bookmark } from 'lucide-react';
import { COMPANY_NAMES } from '../constants/stocks';

interface StockListProps {
  stocks: Stock[];
  selectedSymbol: string | null;
  onSelectStock: (symbol: string) => void;
  watchlist: Set<string>;
  waitlist: Set<string>;
  onMoveToWaitlist: (symbol: string) => void;
  onMoveToWatchlist: (symbol: string) => void;
  onRemoveFromWatchlist: (symbol: string) => void;
  onRemoveFromWaitlist: (symbol: string) => void;
}

export const StockList: React.FC<StockListProps> = ({ 
  stocks, 
  selectedSymbol, 
  onSelectStock, 
  watchlist, 
  waitlist,
  onMoveToWaitlist,
  onMoveToWatchlist,
  onRemoveFromWatchlist,
  onRemoveFromWaitlist
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'watchlist' | 'waitlist'>('all');

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(value);
  };

  const displayedStocks = stocks.filter(stock => {
    if (activeTab === 'watchlist') return watchlist.has(stock.symbol);
    if (activeTab === 'waitlist') return waitlist.has(stock.symbol);
    return true;
  });

  return (
    <div className="card bento-list" style={{ overflow: 'hidden', padding: 0 }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h2 className="card-title" style={{ margin: 0 }}>Tracked Assets</h2>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            {displayedStocks.length} {activeTab === 'all' ? 'Total' : activeTab === 'watchlist' ? 'Watched' : 'Queued'}
          </span>
        </div>

        {/* View Switcher Tabs */}
        <div style={{ display: 'flex', gap: '4px', background: 'var(--surface-hover)', padding: '4px', borderRadius: '8px' }}>
          <button
            onClick={() => setActiveTab('all')}
            style={{
              flex: 1,
              padding: '6px 8px',
              fontSize: '0.75rem',
              fontWeight: activeTab === 'all' ? 600 : 500,
              background: activeTab === 'all' ? 'var(--surface)' : 'transparent',
              color: activeTab === 'all' ? 'var(--text-main)' : 'var(--text-muted)',
              borderRadius: '6px',
              boxShadow: activeTab === 'all' ? 'var(--shadow-sm)' : 'none',
              transition: 'all 0.15s'
            }}
          >
            All ({stocks.length})
          </button>
          <button
            onClick={() => setActiveTab('watchlist')}
            style={{
              flex: 1,
              padding: '6px 8px',
              fontSize: '0.75rem',
              fontWeight: activeTab === 'watchlist' ? 600 : 500,
              background: activeTab === 'watchlist' ? 'var(--surface)' : 'transparent',
              color: activeTab === 'watchlist' ? 'var(--accent)' : 'var(--text-muted)',
              borderRadius: '6px',
              boxShadow: activeTab === 'watchlist' ? 'var(--shadow-sm)' : 'none',
              transition: 'all 0.15s'
            }}
          >
            Watchlist ({watchlist.size})
          </button>
          <button
            onClick={() => setActiveTab('waitlist')}
            style={{
              flex: 1,
              padding: '6px 8px',
              fontSize: '0.75rem',
              fontWeight: activeTab === 'waitlist' ? 600 : 500,
              background: activeTab === 'waitlist' ? 'var(--surface)' : 'transparent',
              color: activeTab === 'waitlist' ? '#b45309' : 'var(--text-muted)',
              borderRadius: '6px',
              boxShadow: activeTab === 'waitlist' ? 'var(--shadow-sm)' : 'none',
              transition: 'all 0.15s'
            }}
          >
            Waitlist ({waitlist.size})
          </button>
        </div>
      </div>
      
      <div style={{ overflowY: 'auto', flex: 1, maxHeight: '560px' }}>
        {displayedStocks.length === 0 ? (
          <div style={{ padding: '32px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            {activeTab === 'watchlist' && (
              <>
                <Bookmark size={28} color="var(--border)" style={{ margin: '0 auto 8px' }} />
                <div style={{ fontWeight: 500, color: 'var(--text-main)', marginBottom: '4px' }}>Watchlist is empty</div>
                <div style={{ fontSize: '0.75rem' }}>Click &ldquo;Watch&rdquo; on any stock to track it here.</div>
              </>
            )}
            {activeTab === 'waitlist' && (
              <>
                <Clock size={28} color="var(--border)" style={{ margin: '0 auto 8px' }} />
                <div style={{ fontWeight: 500, color: 'var(--text-main)', marginBottom: '4px' }}>Waitlist is empty</div>
                <div style={{ fontSize: '0.75rem' }}>Click &ldquo;Waitlist&rdquo; to queue stocks under observation.</div>
              </>
            )}
            {activeTab === 'all' && 'No stocks available.'}
          </div>
        ) : (
          displayedStocks.map((stock) => {
            const isSelected = stock.symbol === selectedSymbol;
            const isWatched = watchlist.has(stock.symbol);
            const isQueued = waitlist.has(stock.symbol);
            const companyName = COMPANY_NAMES[stock.symbol] || '';
            
            return (
              <div 
                key={stock.symbol}
                onClick={() => onSelectStock(stock.symbol)}
                style={{
                  padding: '14px 20px',
                  borderBottom: '1px solid var(--border)',
                  cursor: 'pointer',
                  background: isSelected ? 'var(--surface-hover)' : 'transparent',
                  borderLeft: isSelected ? '3px solid var(--accent)' : '3px solid transparent',
                  transition: 'background 0.15s',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '12px'
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{stock.symbol}</span>
                    {/* Blue dot indicator for Watchlist */}
                    {isWatched && (
                      <span 
                        title="In Watchlist" 
                        style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent)', flexShrink: 0 }}
                      />
                    )}
                    {/* Amber dot indicator for Waitlist */}
                    {isQueued && (
                      <span 
                        title="In Waitlist" 
                        style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#f59e0b', flexShrink: 0 }}
                      />
                    )}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {companyName ? `${companyName} • ` : ''}
                    {new Date(stock.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ fontWeight: 500, fontSize: '0.9rem', textAlign: 'right' }}>
                    {formatCurrency(stock.price)}
                  </div>

                  {/* Contextual Action Buttons in Watchlist and Waitlist views */}
                  {activeTab === 'watchlist' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginLeft: '4px' }}>
                      <button
                        title="Move to Waitlist"
                        onClick={(e) => {
                          e.stopPropagation();
                          onMoveToWaitlist(stock.symbol);
                        }}
                        style={{
                          padding: '6px',
                          borderRadius: '6px',
                          color: '#b45309',
                          background: '#fef3c7',
                          display: 'flex',
                          alignItems: 'center'
                        }}
                      >
                        <ArrowRightLeft size={14} />
                      </button>
                      <button
                        title="Remove from Watchlist"
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemoveFromWatchlist(stock.symbol);
                        }}
                        style={{
                          padding: '6px',
                          borderRadius: '6px',
                          color: 'var(--danger)',
                          background: 'var(--surface-hover)',
                          display: 'flex',
                          alignItems: 'center'
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}

                  {activeTab === 'waitlist' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginLeft: '4px' }}>
                      <button
                        title="Move to Watchlist"
                        onClick={(e) => {
                          e.stopPropagation();
                          onMoveToWatchlist(stock.symbol);
                        }}
                        style={{
                          padding: '6px',
                          borderRadius: '6px',
                          color: 'var(--accent)',
                          background: '#eff6ff',
                          display: 'flex',
                          alignItems: 'center'
                        }}
                      >
                        <ArrowRightLeft size={14} />
                      </button>
                      <button
                        title="Remove from Waitlist"
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemoveFromWaitlist(stock.symbol);
                        }}
                        style={{
                          padding: '6px',
                          borderRadius: '6px',
                          color: 'var(--danger)',
                          background: 'var(--surface-hover)',
                          display: 'flex',
                          alignItems: 'center'
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
