import React, { useState, useRef, useEffect, useMemo } from 'react';
import { LineChart, Search, User, X } from 'lucide-react';
import type { Stock } from '../types/api';
import { COMPANY_NAMES } from '../constants/stocks';

interface HeaderProps {
  stocks: Stock[];
  onSelectStock: (symbol: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ stocks, onSelectStock }) => {
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const results = useMemo(() => {
    const cleanQuery = query.trim().toLowerCase();
    if (!cleanQuery) return [];

    return stocks.filter(stock => {
      const symbolMatch = stock.symbol.toLowerCase().includes(cleanQuery);
      const name = COMPANY_NAMES[stock.symbol] || '';
      const nameMatch = name.toLowerCase().includes(cleanQuery);
      return symbolMatch || nameMatch;
    });
  }, [stocks, query]);

  const handleSelect = (symbol: string) => {
    onSelectStock(symbol);
    setQuery('');
    setIsFocused(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsFocused(false);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(val);
  };

  return (
    <header className="card bento-header" style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', position: 'relative' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ background: 'var(--accent)', color: 'white', padding: '8px', borderRadius: '8px' }}>
          <LineChart size={20} />
        </div>
        <h1 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
          StockSense
        </h1>
      </div>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div ref={containerRef} style={{ position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--surface-hover)', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)' }}>
            <Search size={16} color="var(--text-muted)" />
            <input 
              type="text" 
              placeholder="Search stocks..." 
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setIsFocused(true);
              }}
              onFocus={() => setIsFocused(true)}
              onKeyDown={handleKeyDown}
              style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '0.875rem', width: '200px' }}
            />
            {query && (
              <button 
                onClick={() => setQuery('')}
                aria-label="Clear search"
                style={{ display: 'flex', alignItems: 'center', color: 'var(--text-muted)', padding: '2px' }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Search Results Dropdown */}
          {isFocused && query.trim() !== '' && (
            <div 
              style={{
                position: 'absolute',
                top: 'calc(100% + 6px)',
                right: 0,
                width: '320px',
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                boxShadow: 'var(--shadow-md)',
                zIndex: 100,
                maxHeight: '320px',
                overflowY: 'auto'
              }}
            >
              {results.length > 0 ? (
                <div>
                  <div style={{ padding: '8px 14px', fontSize: '0.75rem', color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' }}>
                    Matching Stocks ({results.length})
                  </div>
                  {results.map((stock) => (
                    <div
                      key={stock.symbol}
                      onClick={() => handleSelect(stock.symbol)}
                      style={{
                        padding: '10px 14px',
                        cursor: 'pointer',
                        borderBottom: '1px solid var(--border)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        transition: 'background 0.15s'
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-hover)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-main)' }}>
                          {stock.symbol}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {COMPANY_NAMES[stock.symbol] || 'NIFTY 50 Asset'}
                        </div>
                      </div>
                      <div style={{ fontWeight: 500, fontSize: '0.875rem' }}>
                        {formatCurrency(stock.price)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ padding: '20px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                  <div>No stocks found matching &ldquo;{query}&rdquo;</div>
                  <div style={{ fontSize: '0.75rem', marginTop: '4px' }}>Search by ticker (e.g. INFY) or company (e.g. Tata)</div>
                </div>
              )}
            </div>
          )}
        </div>

        <button 
          title="Account (Planned Feature)"
          style={{ padding: '8px', borderRadius: '50%', background: 'var(--surface-hover)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <User size={18} color="var(--text-muted)" />
        </button>
      </div>
    </header>
  );
};
