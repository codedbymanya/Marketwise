import React, { useState, useEffect, useCallback } from 'react';
import type { Stock, StockHistory } from '../types/api';
import type { User } from '../types/auth';
import { fetchStocks, fetchStockHistory } from '../services/api';
import { fetchCurrentUser } from '../services/authApi';
import { fetchWatchlist, addToWatchlist, removeFromWatchlist, syncWatchlist } from '../services/watchlistApi';
import { fetchAlerts } from '../services/alertApi';
import { Header } from '../components/Header';
import { MarketSummary } from '../components/MarketSummary';
import { StockCard } from '../components/StockCard';
import { StockList } from '../components/StockList';
import { StockAnalysis } from '../components/StockAnalysis';
import { PortfolioView } from '../components/PortfolioView';
import { AuthModal } from '../components/AuthModal';
import { AlertModal } from '../components/AlertModal';

const WATCHLIST_STORAGE_KEY = 'marketwise_watchlist';
const WAITLIST_STORAGE_KEY = 'marketwise_waitlist';
const TOKEN_STORAGE_KEY = 'marketwise_token';

export const Dashboard: React.FC = () => {
  const [activeView, setActiveView] = useState<'dashboard' | 'portfolio'>('dashboard');
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);
  const [history, setHistory] = useState<StockHistory[]>([]);
  
  // Authentication state
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_STORAGE_KEY));
  const [user, setUser] = useState<User | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Price Alerts Modal state
  const [isAlertModalOpen, setIsAlertModalOpen] = useState(false);
  const [alertModalStockSymbol, setAlertModalStockSymbol] = useState<string | null>(null);
  const [triggeredAlertCount, setTriggeredAlertCount] = useState<number>(0);

  // Database-backed Watchlist state (Set of symbols)
  const [watchlist, setWatchlist] = useState<Set<string>>(new Set<string>());

  // Waitlist (staged observations queue)
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

  // Validate authenticated session on load
  useEffect(() => {
    const verifySession = async () => {
      if (!token) {
        setUser(null);
        setWatchlist(new Set());
        setTriggeredAlertCount(0);
        return;
      }
      try {
        const profile = await fetchCurrentUser(token);
        setUser(profile);
      } catch {
        // Token invalid or expired
        localStorage.removeItem(TOKEN_STORAGE_KEY);
        setToken(null);
        setUser(null);
        setWatchlist(new Set());
        setTriggeredAlertCount(0);
      }
    };
    verifySession();
  }, [token]);

  // Load and Migrate Watchlist from Database
  useEffect(() => {
    const loadUserWatchlist = async () => {
      if (!token) {
        setWatchlist(new Set());
        return;
      }
      try {
        // Migration: If user previously had watchlist stored locally in localStorage, sync to DB
        const storedLocal = localStorage.getItem(WATCHLIST_STORAGE_KEY);
        if (storedLocal) {
          try {
            const localSymbols = JSON.parse(storedLocal) as string[];
            if (Array.isArray(localSymbols) && localSymbols.length > 0) {
              await syncWatchlist(token, localSymbols);
            }
          } catch {
            // ignore malformed local storage
          } finally {
            // Remove localStorage as primary source of truth
            localStorage.removeItem(WATCHLIST_STORAGE_KEY);
          }
        }

        const serverItems = await fetchWatchlist(token);
        setWatchlist(new Set(serverItems.map(item => item.symbol)));
      } catch (e) {
        console.error('Failed to load database watchlist:', e);
      }
    };

    loadUserWatchlist();
  }, [token]);

  // Load Alerts and calculate Triggered count
  const checkAlerts = useCallback(async () => {
    if (!token) {
      setTriggeredAlertCount(0);
      return;
    }
    try {
      const userAlerts = await fetchAlerts(token);
      const triggered = userAlerts.filter(a => a.status === 'TRIGGERED');
      setTriggeredAlertCount(triggered.length);
    } catch (e) {
      console.error('Failed to check alerts:', e);
    }
  }, [token]);

  useEffect(() => {
    let isMounted = true;
    if (!token) return;

    const pollAlerts = async () => {
      try {
        const userAlerts = await fetchAlerts(token);
        if (isMounted) {
          const triggered = userAlerts.filter(a => a.status === 'TRIGGERED');
          setTriggeredAlertCount(triggered.length);
        }
      } catch (e) {
        console.error('Failed to check alerts:', e);
      }
    };

    pollAlerts();
    const interval = setInterval(pollAlerts, 10000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [token]);

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
      } finally {
        setIsLoadingHistory(false);
      }
    };
    
    loadHistory();
  }, [selectedSymbol]);

  // Auth Handlers
  const handleAuthSuccess = (newToken: string, authenticatedUser: User) => {
    localStorage.setItem(TOKEN_STORAGE_KEY, newToken);
    setToken(newToken);
    setUser(authenticatedUser);
  };

  const handleLogout = () => {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    setToken(null);
    setUser(null);
    setWatchlist(new Set());
    setTriggeredAlertCount(0);
  };

  // Database-backed Watchlist & Waitlist toggles
  const handleToggleWatchlist = useCallback(async (symbol: string) => {
    if (!token) {
      setIsAuthModalOpen(true);
      return;
    }

    const isCurrentlyWatched = watchlist.has(symbol);

    // Optimistic update
    setWatchlist(prev => {
      const next = new Set(prev);
      if (isCurrentlyWatched) {
        next.delete(symbol);
      } else {
        next.add(symbol);
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

    try {
      if (isCurrentlyWatched) {
        await removeFromWatchlist(token, symbol);
      } else {
        await addToWatchlist(token, symbol);
      }
    } catch (err) {
      console.error('Failed to update watchlist in database:', err);
      // Revert optimistic update
      setWatchlist(prev => {
        const next = new Set(prev);
        if (isCurrentlyWatched) {
          next.add(symbol);
        } else {
          next.delete(symbol);
        }
        return next;
      });
      alert('Could not update watchlist. Please try again.');
    }
  }, [token, watchlist]);

  const handleToggleWaitlist = useCallback((symbol: string) => {
    setWaitlist(prev => {
      const next = new Set(prev);
      if (next.has(symbol)) {
        next.delete(symbol);
      } else {
        next.add(symbol);
        setWatchlist(w => {
          if (w.has(symbol)) {
            const nextW = new Set(w);
            nextW.delete(symbol);
            return nextW;
          }
          return w;
        });
        if (token && watchlist.has(symbol)) {
          removeFromWatchlist(token, symbol).catch(console.error);
        }
      }
      return next;
    });
  }, [token, watchlist]);

  const handleMoveToWatchlist = useCallback(async (symbol: string) => {
    if (!token) {
      setIsAuthModalOpen(true);
      return;
    }

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

    try {
      await addToWatchlist(token, symbol);
    } catch (e) {
      console.error('Failed to move to watchlist:', e);
    }
  }, [token]);

  const handleMoveToWaitlist = useCallback(async (symbol: string) => {
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

    if (token) {
      try {
        await removeFromWatchlist(token, symbol);
      } catch (e) {
        console.error('Failed to remove from watchlist:', e);
      }
    }
  }, [token]);

  const handleRemoveFromWatchlist = useCallback(async (symbol: string) => {
    setWatchlist(prev => {
      const next = new Set(prev);
      next.delete(symbol);
      return next;
    });

    if (token) {
      try {
        await removeFromWatchlist(token, symbol);
      } catch (e) {
        console.error('Failed to remove from watchlist:', e);
      }
    }
  }, [token]);

  const handleRemoveFromWaitlist = useCallback((symbol: string) => {
    setWaitlist(prev => {
      const next = new Set(prev);
      next.delete(symbol);
      return next;
    });
  }, []);

  const handleOpenAlertForStock = useCallback((sym: string) => {
    if (!token) {
      setIsAuthModalOpen(true);
      return;
    }
    setAlertModalStockSymbol(sym);
    setIsAlertModalOpen(true);
  }, [token]);

  const selectedStockData = stocks.find(s => s.symbol === selectedSymbol) || null;

  if (isLoadingStocks && stocks.length === 0) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
        Initializing MarketWise dashboard...
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
    <div style={{ minHeight: '100vh', padding: '24px' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <Header 
          stocks={stocks} 
          onSelectStock={setSelectedSymbol}
          activeView={activeView}
          onSelectView={setActiveView}
          user={user}
          onOpenAuthModal={() => setIsAuthModalOpen(true)}
          onLogout={handleLogout}
          triggeredAlertCount={triggeredAlertCount}
          onOpenAlertModal={() => {
            if (!token) {
              setIsAuthModalOpen(true);
            } else {
              setAlertModalStockSymbol(selectedSymbol);
              setIsAlertModalOpen(true);
            }
          }}
        />
        
        {activeView === 'dashboard' ? (
          <div className="bento-grid" style={{ padding: 0, margin: 0, maxWidth: '100%' }}>
            <MarketSummary stocks={stocks} />
            
            <StockCard 
              stock={selectedStockData} 
              history={history} 
              isMonitored={selectedSymbol ? watchlist.has(selectedSymbol) : false}
              isWaitlisted={selectedSymbol ? waitlist.has(selectedSymbol) : false}
              onToggleMonitor={handleToggleWatchlist}
              onToggleWaitlist={handleToggleWaitlist}
              isLoading={isLoadingHistory}
              onOpenAlertForStock={handleOpenAlertForStock}
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
        ) : (
          <PortfolioView
            token={token}
            user={user}
            stocks={stocks}
            onOpenAuthModal={() => setIsAuthModalOpen(true)}
          />
        )}
      </div>

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onAuthSuccess={handleAuthSuccess}
      />

      <AlertModal
        isOpen={isAlertModalOpen}
        onClose={() => setIsAlertModalOpen(false)}
        token={token}
        stocks={stocks}
        initialSymbol={alertModalStockSymbol}
        onAlertTriggeredOrChanged={checkAlerts}
      />
    </div>
  );
};
