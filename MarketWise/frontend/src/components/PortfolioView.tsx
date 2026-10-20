import React, { useState, useEffect, useCallback } from 'react';
import type { User } from '../types/auth';
import type { Stock } from '../types/api';
import type { PortfolioData, Transaction } from '../types/portfolio';
import { fetchPortfolio, fetchTransactions, createTransaction, deleteTransaction } from '../services/portfolioApi';
import { COMPANY_NAMES } from '../constants/stocks';
import { TrendingUp, TrendingDown, DollarSign, Wallet, ArrowDownRight, ArrowUpRight, Trash2, Loader2, PlusCircle, AlertCircle, CheckCircle2 } from 'lucide-react';

interface PortfolioViewProps {
  token: string | null;
  user: User | null;
  stocks: Stock[];
  onOpenAuthModal: () => void;
}

export const PortfolioView: React.FC<PortfolioViewProps> = ({
  token,
  user,
  stocks,
  onOpenAuthModal,
}) => {
  const [data, setData] = useState<PortfolioData | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Trade form state
  const [txType, setTxType] = useState<'BUY' | 'SELL'>('BUY');
  const [symbol, setSymbol] = useState<string>(stocks.length > 0 ? stocks[0].symbol : 'RELIANCE.NS');
  const [quantity, setQuantity] = useState<string>('10');
  const [price, setPrice] = useState<string>(() => {
    const defaultSym = stocks.length > 0 ? stocks[0].symbol : 'RELIANCE.NS';
    const found = stocks.find(s => s.symbol === defaultSym);
    return found ? found.price.toString() : '';
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [txMessage, setTxMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const formatCurrency = (val: number | null | undefined) => {
    if (val === null || val === undefined) return '—';
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(val);
  };

  const loadData = useCallback(async () => {
    if (!token) return;
    try {
      setIsLoading(true);
      setError(null);
      const [portRes, txRes] = await Promise.all([
        fetchPortfolio(token),
        fetchTransactions(token),
      ]);
      setData(portRes);
      setTransactions(txRes);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to load portfolio.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    let isMounted = true;
    if (token) {
      Promise.all([fetchPortfolio(token), fetchTransactions(token)])
        .then(([portRes, txRes]) => {
          if (isMounted) {
            setData(portRes);
            setTransactions(txRes);
          }
        })
        .catch(err => {
          if (isMounted) {
            setError(err instanceof Error ? err.message : 'Failed to load portfolio.');
          }
        });
    }
    return () => {
      isMounted = false;
    };
  }, [token]);

  const handleSymbolChange = (newSymbol: string) => {
    setSymbol(newSymbol);
    const liveStock = stocks.find(s => s.symbol === newSymbol);
    if (liveStock) {
      setPrice(liveStock.price.toString());
    }
    setTxMessage(null);
  };

  const handlePreFill = (targetSymbol: string, actionType: 'BUY' | 'SELL') => {
    setSymbol(targetSymbol);
    setTxType(actionType);
    const liveStock = stocks.find(s => s.symbol === targetSymbol);
    if (liveStock) {
      setPrice(liveStock.price.toString());
    }
    setTxMessage(null);
  };

  const handleRecordTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    setTxMessage(null);
    const qtyNum = parseFloat(quantity);
    const priceNum = parseFloat(price);

    if (isNaN(qtyNum) || qtyNum <= 0) {
      setTxMessage({ type: 'error', text: 'Quantity must be a positive number.' });
      return;
    }
    if (isNaN(priceNum) || priceNum <= 0) {
      setTxMessage({ type: 'error', text: 'Price must be a positive number.' });
      return;
    }

    try {
      setIsSubmitting(true);
      await createTransaction(token, {
        symbol,
        transaction_type: txType,
        quantity: qtyNum,
        price: priceNum,
      });

      setTxMessage({
        type: 'success',
        text: `Recorded ${txType} of ${qtyNum} shares of ${symbol} successfully!`,
      });

      // Reload portfolio data
      await loadData();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setTxMessage({ type: 'error', text: err.message });
      } else {
        setTxMessage({ type: 'error', text: 'Failed to record transaction.' });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTransaction = async (txId: string) => {
    if (!token) return;
    if (!window.confirm('Are you sure you want to delete this transaction?')) return;

    try {
      await deleteTransaction(token, txId);
      await loadData();
    } catch (err: unknown) {
      if (err instanceof Error) {
        alert(err.message);
      } else {
        alert('Failed to delete transaction.');
      }
    }
  };

  // Find currently held quantity for active symbol in form
  const currentHolding = data?.holdings.find(h => h.symbol === symbol);
  const currentHeldQty = currentHolding ? currentHolding.quantity : 0;

  // Unauthenticated Empty State
  if (!token || !user) {
    return (
      <div style={{ maxWidth: '800px', margin: '40px auto', padding: '0 20px' }}>
        <div className="card" style={{ padding: '48px 32px', textAlign: 'center', alignItems: 'center' }}>
          <div style={{ background: 'var(--surface-hover)', padding: '16px', borderRadius: '50%', marginBottom: '20px' }}>
            <Wallet size={36} color="var(--accent)" />
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '8px', color: 'var(--text-main)' }}>
            Sign In to Manage Your Portfolio
          </h2>
          <p style={{ color: 'var(--text-muted)', maxWidth: '480px', lineHeight: 1.6, marginBottom: '24px' }}>
            Track your real-time equity positions, calculate weighted average cost basis, and evaluate realized and unrealized profit &amp; loss against live market feeds.
          </p>
          <button
            onClick={onOpenAuthModal}
            style={{
              padding: '12px 28px',
              borderRadius: '8px',
              background: 'var(--accent)',
              color: 'white',
              fontWeight: 600,
              fontSize: '0.9rem',
              boxShadow: 'var(--shadow-md)',
              transition: 'background 0.2s'
            }}
          >
            Sign In or Create Account
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Portfolio Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
        {/* Total Value */}
        <div className="card" style={{ padding: '20px 24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Portfolio Valuation
            </span>
            <Wallet size={18} color="var(--accent)" />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-main)' }}>
            {formatCurrency(data?.portfolio.total_value)}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            {data?.portfolio.holdings_count || 0} Open Holdings
          </div>
        </div>

        {/* Total Invested */}
        <div className="card" style={{ padding: '20px 24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Total Invested Cost
            </span>
            <DollarSign size={18} color="var(--text-muted)" />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-main)' }}>
            {formatCurrency(data?.portfolio.total_invested)}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            Weighted Average Cost Basis
          </div>
        </div>

        {/* Unrealized P&L */}
        <div className="card" style={{ padding: '20px 24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Unrealized P&amp;L
            </span>
            {(data?.portfolio.total_unrealized_pnl || 0) >= 0 ? (
              <TrendingUp size={18} className="value-up" />
            ) : (
              <TrendingDown size={18} className="value-down" />
            )}
          </div>
          <div style={{
            fontSize: '1.75rem',
            fontWeight: 700,
            color: (data?.portfolio.total_unrealized_pnl || 0) >= 0 ? 'var(--success)' : 'var(--danger)'
          }}>
            {(data?.portfolio.total_unrealized_pnl || 0) >= 0 ? '+' : ''}
            {formatCurrency(data?.portfolio.total_unrealized_pnl)}
          </div>
          <div style={{
            fontSize: '0.8rem',
            fontWeight: 600,
            color: (data?.portfolio.total_unrealized_pnl || 0) >= 0 ? 'var(--success)' : 'var(--danger)',
            marginTop: '4px'
          }}>
            {(data?.portfolio.total_unrealized_pnl || 0) >= 0 ? '+' : ''}
            {data?.portfolio.total_unrealized_pnl_pct || 0}% overall return
          </div>
        </div>

        {/* Realized P&L */}
        <div className="card" style={{ padding: '20px 24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Realized P&amp;L
            </span>
            {(data?.portfolio.total_realized_pnl || 0) >= 0 ? (
              <ArrowUpRight size={18} className="value-up" />
            ) : (
              <ArrowDownRight size={18} className="value-down" />
            )}
          </div>
          <div style={{
            fontSize: '1.75rem',
            fontWeight: 700,
            color: (data?.portfolio.total_realized_pnl || 0) >= 0 ? 'var(--success)' : 'var(--danger)'
          }}>
            {(data?.portfolio.total_realized_pnl || 0) >= 0 ? '+' : ''}
            {formatCurrency(data?.portfolio.total_realized_pnl)}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            Booked from closed sales
          </div>
        </div>
      </div>

      {error && (
        <div style={{ padding: '12px 16px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: 'var(--danger)', fontSize: '0.875rem' }}>
          {error}
        </div>
      )}

      {/* Main Grid: Holdings Table & Trade Form */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '20px' }}>
        {/* Left Column: Holdings & History (span 8) */}
        <div style={{ gridColumn: 'span 8', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Holdings Card */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>Active Holdings</h3>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Live market valuations computed against latest tick prices
                </div>
              </div>
              {isLoading && <Loader2 size={16} style={{ animation: 'spin 1s linear infinite', color: 'var(--text-muted)' }} />}
            </div>

            <div style={{ overflowX: 'auto' }}>
              {!data || data.holdings.length === 0 ? (
                <div style={{ padding: '36px 24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <p style={{ fontWeight: 500, color: 'var(--text-main)', marginBottom: '4px' }}>No positions held currently.</p>
                  <p style={{ fontSize: '0.8rem' }}>Record a BUY transaction in the form to add shares to your portfolio.</p>
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                  <thead>
                    <tr style={{ background: 'var(--surface-hover)', borderBottom: '1px solid var(--border)', textAlign: 'left', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                      <th style={{ padding: '12px 20px', fontWeight: 600 }}>ASSET</th>
                      <th style={{ padding: '12px 16px', fontWeight: 600, textAlign: 'right' }}>SHARES</th>
                      <th style={{ padding: '12px 16px', fontWeight: 600, textAlign: 'right' }}>AVG COST</th>
                      <th style={{ padding: '12px 16px', fontWeight: 600, textAlign: 'right' }}>MARKET PRICE</th>
                      <th style={{ padding: '12px 16px', fontWeight: 600, textAlign: 'right' }}>VALUATION</th>
                      <th style={{ padding: '12px 16px', fontWeight: 600, textAlign: 'right' }}>P&amp;L</th>
                      <th style={{ padding: '12px 20px', fontWeight: 600, textAlign: 'center' }}>ACTION</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.holdings.map((h) => {
                      const isProfit = (h.unrealized_pnl || 0) >= 0;
                      return (
                        <tr key={h.symbol} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.15s' }}>
                          <td style={{ padding: '14px 20px' }}>
                            <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{h.symbol}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              {COMPANY_NAMES[h.symbol] || 'NIFTY 50'}
                            </div>
                          </td>
                          <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 600 }}>
                            {h.quantity}
                          </td>
                          <td style={{ padding: '14px 16px', textAlign: 'right', color: 'var(--text-muted)' }}>
                            {formatCurrency(h.avg_buy_price)}
                          </td>
                          <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 500 }}>
                            {formatCurrency(h.current_price)}
                          </td>
                          <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 600 }}>
                            {formatCurrency(h.current_value)}
                          </td>
                          <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                            <div style={{ fontWeight: 600, color: isProfit ? 'var(--success)' : 'var(--danger)' }}>
                              {isProfit ? '+' : ''}{formatCurrency(h.unrealized_pnl)}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: isProfit ? 'var(--success)' : 'var(--danger)' }}>
                              {isProfit ? '+' : ''}{h.unrealized_pnl_pct}%
                            </div>
                          </td>
                          <td style={{ padding: '14px 20px', textAlign: 'center' }}>
                            <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                              <button
                                onClick={() => handlePreFill(h.symbol, 'BUY')}
                                title="Buy more shares"
                                style={{
                                  padding: '4px 8px',
                                  fontSize: '0.75rem',
                                  borderRadius: '4px',
                                  background: '#eff6ff',
                                  color: 'var(--accent)',
                                  fontWeight: 600
                                }}
                              >
                                Buy
                              </button>
                              <button
                                onClick={() => handlePreFill(h.symbol, 'SELL')}
                                title="Sell shares"
                                style={{
                                  padding: '4px 8px',
                                  fontSize: '0.75rem',
                                  borderRadius: '4px',
                                  background: '#fef2f2',
                                  color: 'var(--danger)',
                                  fontWeight: 600
                                }}
                              >
                                Sell
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Transaction History Card */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border)' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>Transaction Ledger</h3>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                Auditable transaction history with relational referential integrity
              </div>
            </div>

            <div style={{ overflowX: 'auto', maxHeight: '360px' }}>
              {transactions.length === 0 ? (
                <div style={{ padding: '32px 24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No transaction records found.
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                  <thead>
                    <tr style={{ background: 'var(--surface-hover)', borderBottom: '1px solid var(--border)', textAlign: 'left', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                      <th style={{ padding: '10px 20px', fontWeight: 600 }}>DATE</th>
                      <th style={{ padding: '10px 16px', fontWeight: 600 }}>TYPE</th>
                      <th style={{ padding: '10px 16px', fontWeight: 600 }}>ASSET</th>
                      <th style={{ padding: '10px 16px', fontWeight: 600, textAlign: 'right' }}>SHARES</th>
                      <th style={{ padding: '10px 16px', fontWeight: 600, textAlign: 'right' }}>PRICE</th>
                      <th style={{ padding: '10px 16px', fontWeight: 600, textAlign: 'right' }}>TOTAL</th>
                      <th style={{ padding: '10px 20px', fontWeight: 600, textAlign: 'center' }}>DELETE</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((t) => (
                      <tr key={t.transaction_id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '12px 20px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                          {new Date(t.transaction_date).toLocaleDateString()} {new Date(t.transaction_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            padding: '3px 8px',
                            borderRadius: '4px',
                            background: t.transaction_type === 'BUY' ? '#dcfce7' : '#fee2e2',
                            color: t.transaction_type === 'BUY' ? 'var(--success)' : 'var(--danger)'
                          }}>
                            {t.transaction_type}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', fontWeight: 600 }}>
                          {t.symbol}
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                          {t.quantity}
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'right', color: 'var(--text-muted)' }}>
                          {formatCurrency(t.price)}
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600 }}>
                          {formatCurrency(t.total_amount)}
                        </td>
                        <td style={{ padding: '12px 20px', textAlign: 'center' }}>
                          <button
                            onClick={() => handleDeleteTransaction(t.transaction_id)}
                            title="Delete transaction"
                            style={{
                              padding: '6px',
                              borderRadius: '6px',
                              color: 'var(--danger)',
                              background: 'var(--surface-hover)',
                              display: 'inline-flex',
                              alignItems: 'center'
                            }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Trade Form (span 4) */}
        <div style={{ gridColumn: 'span 4' }}>
          <div className="card" style={{ padding: '24px', position: 'sticky', top: '24px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <PlusCircle size={18} color="var(--accent)" /> Record Transaction
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '20px' }}>
              Add a buy or sell trade to compute real-time cost basis and P&amp;L.
            </p>

            {/* Type selector */}
            <div style={{ display: 'flex', gap: '8px', background: 'var(--surface-hover)', padding: '4px', borderRadius: '8px', marginBottom: '16px' }}>
              <button
                type="button"
                onClick={() => { setTxType('BUY'); setTxMessage(null); }}
                style={{
                  flex: 1,
                  padding: '8px',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  borderRadius: '6px',
                  background: txType === 'BUY' ? 'var(--success)' : 'transparent',
                  color: txType === 'BUY' ? 'white' : 'var(--text-muted)',
                  transition: 'all 0.15s'
                }}
              >
                BUY
              </button>
              <button
                type="button"
                onClick={() => { setTxType('SELL'); setTxMessage(null); }}
                style={{
                  flex: 1,
                  padding: '8px',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  borderRadius: '6px',
                  background: txType === 'SELL' ? 'var(--danger)' : 'transparent',
                  color: txType === 'SELL' ? 'white' : 'var(--text-muted)',
                  transition: 'all 0.15s'
                }}
              >
                SELL
              </button>
            </div>

            {txMessage && (
              <div style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '8px',
                padding: '10px 12px',
                borderRadius: '8px',
                marginBottom: '16px',
                fontSize: '0.8rem',
                background: txMessage.type === 'success' ? '#f0fdf4' : '#fef2f2',
                border: `1px solid ${txMessage.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
                color: txMessage.type === 'success' ? 'var(--success)' : 'var(--danger)'
              }}>
                {txMessage.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                <span>{txMessage.text}</span>
              </div>
            )}

            <form onSubmit={handleRecordTransaction} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Asset Symbol */}
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase' }}>
                  Stock Asset
                </label>
                <select
                  value={symbol}
                  onChange={(e) => handleSymbolChange(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    background: 'var(--surface-hover)',
                    color: 'var(--text-main)',
                    fontSize: '0.875rem',
                    outline: 'none'
                  }}
                >
                  {stocks.map(s => (
                    <option key={s.symbol} value={s.symbol}>
                      {s.symbol} — {COMPANY_NAMES[s.symbol] || ''} ({formatCurrency(s.price)})
                    </option>
                  ))}
                </select>
                {txType === 'SELL' && (
                  <div style={{ fontSize: '0.75rem', color: currentHeldQty > 0 ? 'var(--accent)' : 'var(--danger)', marginTop: '4px' }}>
                    Available to sell: <strong>{currentHeldQty}</strong> shares
                  </div>
                )}
              </div>

              {/* Quantity */}
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase' }}>
                  Number of Shares
                </label>
                <input
                  type="number"
                  min="0.0001"
                  step="any"
                  placeholder="e.g. 10"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    background: 'var(--surface-hover)',
                    color: 'var(--text-main)',
                    fontSize: '0.875rem',
                    outline: 'none'
                  }}
                />
              </div>

              {/* Price per share */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    Price per Share (INR)
                  </label>
                  {stocks.find(s => s.symbol === symbol) && (
                    <button
                      type="button"
                      onClick={() => {
                        const cur = stocks.find(s => s.symbol === symbol);
                        if (cur) setPrice(cur.price.toString());
                      }}
                      style={{ fontSize: '0.7rem', color: 'var(--accent)', fontWeight: 600 }}
                    >
                      Use Live Price
                    </button>
                  )}
                </div>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  placeholder="e.g. 1174.60"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    background: 'var(--surface-hover)',
                    color: 'var(--text-main)',
                    fontSize: '0.875rem',
                    outline: 'none'
                  }}
                />
              </div>

              {/* Estimated Total */}
              <div style={{ background: 'var(--surface-hover)', padding: '12px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.875rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Estimated Amount:</span>
                <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>
                  {formatCurrency((parseFloat(quantity) || 0) * (parseFloat(price) || 0))}
                </span>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                style={{
                  marginTop: '8px',
                  padding: '12px',
                  borderRadius: '8px',
                  background: txType === 'BUY' ? 'var(--accent)' : 'var(--danger)',
                  color: 'white',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  opacity: isSubmitting ? 0.7 : 1,
                  boxShadow: 'var(--shadow-sm)',
                  transition: 'background 0.2s'
                }}
              >
                {isSubmitting && <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />}
                Record {txType} Trade
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
