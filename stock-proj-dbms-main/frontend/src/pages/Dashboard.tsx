import React, { useState, useEffect, useCallback } from 'react';
import type{ Stock, StockHistory } from '../types/api';
import { fetchStocks, fetchStockHistory } from '../services/api';
import { Header } from '../components/Header';
import { MarketSummary } from '../components/MarketSummary';
import { StockCard } from '../components/StockCard';
import { StockList } from '../components/StockList';
import { StockAnalysis } from '../components/StockAnalysis';

export const Dashboard: React.FC = () => {
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);
  const [history, setHistory] = useState<StockHistory[]>([]);
  const [monitoredStocks, setMonitoredStocks] = useState<Set<string>>(new Set());
  
  const [isLoadingStocks, setIsLoadingStocks] = useState(true);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        console.error('Failed to load history for', selectedSymbol);
        // We don't set global error here to not break the whole UI
      } finally {
        setIsLoadingHistory(false);
      }
    };
    
    loadHistory();
  }, [selectedSymbol]);

  const handleToggleMonitor = useCallback((symbol: string) => {
    setMonitoredStocks(prev => {
      const next = new Set(prev);
      if (next.has(symbol)) {
        next.delete(symbol);
      } else {
        next.add(symbol);
      }
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
      <Header />
      
      <MarketSummary stocks={stocks} />
      
      <StockCard 
        stock={selectedStockData} 
        history={history} 
        isMonitored={selectedSymbol ? monitoredStocks.has(selectedSymbol) : false}
        onToggleMonitor={handleToggleMonitor}
        isLoading={isLoadingHistory}
      />
      
      <StockList 
        stocks={stocks} 
        selectedSymbol={selectedSymbol} 
        onSelectStock={setSelectedSymbol}
        monitoredStocks={monitoredStocks}
      />
      
      {selectedStockData && history.length > 0 && (
        <StockAnalysis history={history} />
      )}
    </div>
  );
};
