import React, { useState, useEffect, useCallback } from 'react';
import type { Stock, StockHistory } from '../types/api';
import { fetchStocks, fetchStockHistory } from '../services/api';
import { Header } from '../components/Header';
import { MarketSummary } from '../components/MarketSummary';
import { StockCard } from '../components/StockCard';
import { StockList } from '../components/StockList';
import { StockAnalysis } from '../components/StockAnalysis';

const WATCHLIST_STORAGE_KEY = 'stocksense_watchlist';
const WAITLIST_STORAGE_KEY = 'stocksense_waitlist';

export const Dashboard: React.FC = () => {
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);
  const [history, setHistory] = useState<StockHistory[]>([]);
  
  // Watchlist & Waitlist backed by localStorage for client-side persistence
  const [watchlist, setWatchlist] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem(WATCHLIST_STORAGE_KEY);
      return stored ? new Set<string>(JSON.parse(stored)) : new Set<string>();
    } catch {
      return new Set<string>();
    }
  });

  const [waitlist, setWaitlist] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem(WAITLIST_STORAGE_KEY);
      return stored ? new Set<string>(JSON.parse(stored)) : new Set<string>();
    } catch {
      return new Set<string>();
    }
  });

  const [isLoadingStocks, setIsLoadingStocks] = useState(true);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync Watchlist to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify(Array.from(watchlist)));
    } catch (e) {
      console.error('Failed to sync watchlist to localStorage', e);
    }
  }, [watchlist]);

  // Sync Waitlist to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(WAITLIST_STORAGE_KEY, JSON.stringify(Array.from(waitlist)));
    } catch (e) {
      console.error('Failed to sync waitlist to localStorage', e);
    }
  }, [waitlist]);

  // Initial fetch of all stocks on mount
  useEffect(() => {
    const loadStocks = async () => {
      try {
        setIsLoadingStocks(true);
        const data = await fetchStocks();
        setStocks(data);
        
        // Select sensible default (first stock) if none selected yet
        if (data.length > 0) {
          setSelectedSymbol(prev => prev ?? data[0].symbol);
        }
        setError(null);
      } catch (err) {
        setError('Failed to load market data. Please ensure the backend is running.');
        console.error(err);
      } finally {
        setIsLoadingStocks(false);
      }
    };
    
    loadStocks();
  }, []);

  // Fetch history when selected stock changes
  useEffect(() => {
    if (!selectedSymbol) return;
    
    const loadHistory = async () => {
      try {
        setIsLoadingHistory(true);
        const data = await fetchStockHistory(selectedSymbol);
        setHistory(data);
      } catch (err) {
        console.error('Failed to load history for', selectedSymbol, err);
        // Do not break the UI if individual history query fails
      } finally {
        setIsLoadingHistory(false);
      }
    };
    
    loadHistory();
  }, [selectedSymbol]);

  // Toggle stock in Watchlist
  const handleToggleWatchlist = useCallback((symbol: string) => {
    setWatchlist(prev => {
      const next = new Set(prev);
      if (next.has(symbol)) {
        next.delete(symbol);
      } else {
        next.add(symbol);
        // Automatically remove from waitlist if added to watchlist
        setWaitlist(w => {
          if (w.has(symbol)) {
            const nextW = new Set(w);
            nextW.delete(symbol);
            return nextW;
          }
          return w;
        });
      }
      return next;
    });
  }, []);

  // Toggle stock in Waitlist
  const handleToggleWaitlist = useCallback((symbol: string) => {
    setWaitlist(prev => {
      const next = new Set(prev);
      if (next.has(symbol)) {
        next.delete(symbol);
      } else {
        next.add(symbol);
        // Automatically remove from watchlist if added to waitlist
        setWatchlist(w => {
          if (w.has(symbol)) {
            const nextW = new Set(w);
            nextW.delete(symbol);
            return nextW;
          }
          return w;
        });
      }
      return next;
    });
  }, []);

  // Move stock from Waitlist to Watchlist
  const handleMoveToWatchlist = useCallback((symbol: string) => {
    setWaitlist(prev => {
      const next = new Set(prev);
      next.delete(symbol);
      return next;
    });
    setWatchlist(prev => {
      const next = new Set(prev);
      next.add(symbol);
      return next;
    });
  }, []);

  // Move stock from Watchlist to Waitlist
  const handleMoveToWaitlist = useCallback((symbol: string) => {
    setWatchlist(prev => {
      const next = new Set(prev);
      next.delete(symbol);
      return next;
    });
    setWaitlist(prev => {
      const next = new Set(prev);
      next.add(symbol);
      return next;
    });
  }, []);

  // Remove from Watchlist
  const handleRemoveFromWatchlist = useCallback((symbol: string) => {
    setWatchlist(prev => {
      const next = new Set(prev);
      next.delete(symbol);
      return next;
    });
  }, []);

  // Remove from Waitlist
  const handleRemoveFromWaitlist = useCallback((symbol: string) => {
    setWaitlist(prev => {
      const next = new Set(prev);
      next.delete(symbol);
      return next;
    });
  }, []);

  const selectedStockData = stocks.find(s => s.symbol === selectedSymbol) || null;

  if (isLoadingStocks && stocks.length === 0) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
        Initializing StockSense dashboard...
      </div>
    );
  }

  if (error && stocks.length === 0) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ background: 'var(--surface)', padding: '32px', borderRadius: 'var(--radius)', border: '1px solid var(--danger)', color: 'var(--danger)', maxWidth: '400px', textAlign: 'center' }}>
          <h2 style={{ marginBottom: '16px' }}>Connection Error</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bento-grid">
      <Header 
        stocks={stocks} 
        onSelectStock={setSelectedSymbol} 
      />
      
      <MarketSummary stocks={stocks} />
      
      <StockCard 
        stock={selectedStockData} 
        history={history} 
        isMonitored={selectedSymbol ? watchlist.has(selectedSymbol) : false}
        isWaitlisted={selectedSymbol ? waitlist.has(selectedSymbol) : false}
        onToggleMonitor={handleToggleWatchlist}
        onToggleWaitlist={handleToggleWaitlist}
        isLoading={isLoadingHistory}
      />
      
      <StockList 
        stocks={stocks} 
        selectedSymbol={selectedSymbol} 
        onSelectStock={setSelectedSymbol}
        watchlist={watchlist}
        waitlist={waitlist}
        onMoveToWaitlist={handleMoveToWaitlist}
        onMoveToWatchlist={handleMoveToWatchlist}
        onRemoveFromWatchlist={handleRemoveFromWatchlist}
        onRemoveFromWaitlist={handleRemoveFromWaitlist}
      />
      
      {selectedStockData && history.length > 0 && (
        <StockAnalysis history={history} />
      )}
    </div>
  );
};
