import React, { useState, useEffect, useCallback } from 'react';
import { X, Bell, Trash2, CheckCircle2, AlertCircle, Loader2, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import type { Stock } from '../types/api';
import type { PriceAlert } from '../types/alert';
import { fetchAlerts, createAlert, deleteAlert, disableAlert } from '../services/alertApi';
import { COMPANY_NAMES } from '../constants/stocks';

interface AlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  token: string | null;
  stocks: Stock[];
  initialSymbol?: string | null;
  onAlertTriggeredOrChanged?: () => void;
}

export const AlertModal: React.FC<AlertModalProps> = ({
  isOpen,
  onClose,
  token,
  stocks,
  initialSymbol,
  onAlertTriggeredOrChanged,
}) => {
  const [activeTab, setActiveTab] = useState<'create' | 'list'>('create');
  const defaultSym = initialSymbol || (stocks[0] ? stocks[0].symbol : 'RELIANCE.NS');
  const [symbol, setSymbol] = useState<string>(defaultSym);
  const [condition, setCondition] = useState<'ABOVE' | 'BELOW'>('ABOVE');
  const [targetPrice, setTargetPrice] = useState<string>(() => {
    const cur = stocks.find(s => s.symbol === defaultSym);
    return cur ? cur.price.toString() : '';
  });
  
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [isLoadingAlerts, setIsLoadingAlerts] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadAlerts = useCallback(async () => {
    if (!token) return;
    try {
      setIsLoadingAlerts(true);
      const data = await fetchAlerts(token);
      setAlerts(data);
    } catch {
      // ignore
    } finally {
      setIsLoadingAlerts(false);
    }
  }, [token]);

  useEffect(() => {
    let isMounted = true;
    if (!token) return;

    const timer = setTimeout(async () => {
      if (!isMounted) return;
      setIsLoadingAlerts(true);
      try {
        const data = await fetchAlerts(token);
        if (isMounted) setAlerts(data);
      } catch {
        // ignore
      } finally {
        if (isMounted) setIsLoadingAlerts(false);
      }
    }, 0);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [token]);

  if (!isOpen) return null;

  const currentStock = stocks.find(s => s.symbol === symbol);

  const formatCurrency = (val: number | null | undefined) => {
    if (val === null || val === undefined) return '—';
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(val);
  };

  const handleCreateAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    setMessage(null);
    const priceNum = parseFloat(targetPrice);
    if (isNaN(priceNum) || priceNum <= 0) {
      setMessage({ type: 'error', text: 'Target price must be greater than zero.' });
      return;
    }

    try {
      setIsSubmitting(true);
      const created = await createAlert(token, {
        symbol,
        condition,
        target_price: priceNum,
      });

      if (created.status === 'TRIGGERED') {
        setMessage({
          type: 'success',
          text: `Alert created and TRIGGERED! Current price ${formatCurrency(created.triggered_price)} met condition ${condition} ₹${priceNum}.`,
        });
      } else {
        setMessage({
          type: 'success',
          text: `Alert set for ${symbol} when price reaches ${condition} ${formatCurrency(priceNum)}.`,
        });
      }

      await loadAlerts();
      if (onAlertTriggeredOrChanged) onAlertTriggeredOrChanged();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setMessage({ type: 'error', text: err.message });
      } else {
        setMessage({ type: 'error', text: 'Failed to create alert.' });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteAlert = async (alertId: string) => {
    if (!token) return;
    try {
      await deleteAlert(token, alertId);
      setAlerts(prev => prev.filter(a => a.alert_id !== alertId));
      if (onAlertTriggeredOrChanged) onAlertTriggeredOrChanged();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to delete alert');
    }
  };

  const handleDisableAlert = async (alertId: string) => {
    if (!token) return;
    try {
      const updated = await disableAlert(token, alertId);
      setAlerts(prev => prev.map(a => (a.alert_id === alertId ? updated : a)));
      if (onAlertTriggeredOrChanged) onAlertTriggeredOrChanged();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to disable alert');
    }
  };

  const triggeredAlerts = alerts.filter(a => a.status === 'TRIGGERED');
  const activeAlerts = alerts.filter(a => a.status === 'ACTIVE');

  return (
    <div 
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.6)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '20px'
      }}
      onClick={onClose}
    >
      <div 
        style={{
          background: 'var(--surface)',
          borderRadius: 'var(--radius)',
          border: '1px solid var(--border)',
          width: '100%',
          maxWidth: '520px',
          boxShadow: 'var(--shadow-md)',
          padding: '28px',
          position: 'relative',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            color: 'var(--text-muted)',
            padding: '4px',
            borderRadius: '6px'
          }}
          aria-label="Close dialog"
        >
          <X size={18} />
        </button>

        {/* Header Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          <div style={{ background: '#eff6ff', color: 'var(--accent)', padding: '8px', borderRadius: '8px', display: 'flex', alignItems: 'center' }}>
            <Bell size={20} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
              Price Alerts &amp; Notifications
            </h2>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Real-time server-evaluated thresholds powered by TimescaleDB
            </div>
          </div>
        </div>

        {/* Tab switchers */}
        <div style={{ display: 'flex', gap: '8px', background: 'var(--surface-hover)', padding: '4px', borderRadius: '8px', marginBottom: '20px' }}>
          <button
            type="button"
            onClick={() => { setActiveTab('create'); setMessage(null); }}
            style={{
              flex: 1,
              padding: '8px',
              fontSize: '0.875rem',
              fontWeight: activeTab === 'create' ? 600 : 500,
              background: activeTab === 'create' ? 'var(--surface)' : 'transparent',
              color: activeTab === 'create' ? 'var(--text-main)' : 'var(--text-muted)',
              borderRadius: '6px',
              boxShadow: activeTab === 'create' ? 'var(--shadow-sm)' : 'none',
              transition: 'all 0.15s'
            }}
          >
            Create Alert
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('list'); setMessage(null); loadAlerts(); }}
            style={{
              flex: 1,
              padding: '8px',
              fontSize: '0.875rem',
              fontWeight: activeTab === 'list' ? 600 : 500,
              background: activeTab === 'list' ? 'var(--surface)' : 'transparent',
              color: activeTab === 'list' ? 'var(--text-main)' : 'var(--text-muted)',
              borderRadius: '6px',
              boxShadow: activeTab === 'list' ? 'var(--shadow-sm)' : 'none',
              transition: 'all 0.15s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
          >
            My Alerts ({alerts.length})
            {triggeredAlerts.length > 0 && (
              <span style={{
                background: 'var(--danger)',
                color: 'white',
                fontSize: '0.7rem',
                padding: '2px 6px',
                borderRadius: '10px',
                fontWeight: 700
              }}>
                {triggeredAlerts.length}
              </span>
            )}
          </button>
        </div>

        {/* Tab 1: Create Alert */}
        {activeTab === 'create' && (
          <form onSubmit={handleCreateAlert} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {message && (
              <div style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '8px',
                padding: '10px 12px',
                borderRadius: '8px',
                fontSize: '0.8rem',
                background: message.type === 'success' ? '#f0fdf4' : '#fef2f2',
                border: `1px solid ${message.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
                color: message.type === 'success' ? 'var(--success)' : 'var(--danger)'
              }}>
                {message.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                <span>{message.text}</span>
              </div>
            )}

            {/* Asset Selection */}
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase' }}>
                Tracked Stock
              </label>
              <select
                value={symbol}
                onChange={(e) => {
                  setSymbol(e.target.value);
                  const found = stocks.find(s => s.symbol === e.target.value);
                  if (found) setTargetPrice(found.price.toString());
                  setMessage(null);
                }}
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
            </div>

            {/* Condition: ABOVE or BELOW */}
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase' }}>
                Trigger Condition
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setCondition('ABOVE')}
                  style={{
                    padding: '10px',
                    borderRadius: '8px',
                    border: `1px solid ${condition === 'ABOVE' ? 'var(--success)' : 'var(--border)'}`,
                    background: condition === 'ABOVE' ? '#f0fdf4' : 'var(--surface-hover)',
                    color: condition === 'ABOVE' ? 'var(--success)' : 'var(--text-muted)',
                    fontWeight: 600,
                    fontSize: '0.85rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                >
                  <ArrowUpRight size={16} /> Price Rises ABOVE
                </button>
                <button
                  type="button"
                  onClick={() => setCondition('BELOW')}
                  style={{
                    padding: '10px',
                    borderRadius: '8px',
                    border: `1px solid ${condition === 'BELOW' ? 'var(--danger)' : 'var(--border)'}`,
                    background: condition === 'BELOW' ? '#fef2f2' : 'var(--surface-hover)',
                    color: condition === 'BELOW' ? 'var(--danger)' : 'var(--text-muted)',
                    fontWeight: 600,
                    fontSize: '0.85rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                >
                  <ArrowDownRight size={16} /> Price Falls BELOW
                </button>
              </div>
            </div>

            {/* Target Price */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Target Price (₹ INR)
                </label>
                {currentStock && (
                  <button
                    type="button"
                    onClick={() => setTargetPrice(currentStock.price.toString())}
                    style={{ fontSize: '0.75rem', color: 'var(--accent)', fontWeight: 600 }}
                  >
                    Current: {formatCurrency(currentStock.price)}
                  </button>
                )}
              </div>
              <input
                type="number"
                min="0.01"
                step="any"
                placeholder="e.g. 1250.00"
                value={targetPrice}
                onChange={(e) => setTargetPrice(e.target.value)}
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

            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                marginTop: '8px',
                padding: '12px',
                borderRadius: '8px',
                background: 'var(--accent)',
                color: 'white',
                fontWeight: 600,
                fontSize: '0.875rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                opacity: isSubmitting ? 0.7 : 1,
                boxShadow: 'var(--shadow-sm)'
              }}
            >
              {isSubmitting && <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />}
              Set Price Alert
            </button>
          </form>
        )}

        {/* Tab 2: Alerts List & In-App Notification Indicators */}
        {activeTab === 'list' && (
          <div style={{ overflowY: 'auto', maxHeight: '50vh', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {isLoadingAlerts ? (
              <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
                <Loader2 size={24} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 8px' }} />
                Loading alerts...
              </div>
            ) : alerts.length === 0 ? (
              <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                <Bell size={32} color="var(--border)" style={{ margin: '0 auto 8px' }} />
                <div style={{ fontWeight: 600, color: 'var(--text-main)', marginBottom: '4px' }}>No alerts configured</div>
                <div>Set price triggers to receive notifications when market thresholds are crossed.</div>
              </div>
            ) : (
              <>
                {/* Triggered Section */}
                {triggeredAlerts.length > 0 && (
                  <div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--danger)', textTransform: 'uppercase', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <AlertCircle size={14} /> Triggered Alerts ({triggeredAlerts.length})
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {triggeredAlerts.map(a => (
                        <div
                          key={a.alert_id}
                          style={{
                            background: '#fef2f2',
                            border: '1px solid #fecaca',
                            borderRadius: '8px',
                            padding: '12px 14px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            gap: '12px'
                          }}
                        >
                          <div>
                            <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.875rem' }}>
                              {a.symbol}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#991b1b', marginTop: '2px' }}>
                              Triggered at <strong>{formatCurrency(a.triggered_price)}</strong> (Target: {a.condition} {formatCurrency(a.target_price)})
                            </div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                              {a.triggered_at ? new Date(a.triggered_at).toLocaleString() : ''}
                            </div>
                          </div>
                          <button
                            onClick={() => handleDeleteAlert(a.alert_id)}
                            title="Dismiss Alert"
                            style={{
                              padding: '6px',
                              borderRadius: '6px',
                              color: 'var(--danger)',
                              background: 'var(--surface)'
                            }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Active Section */}
                {activeAlerts.length > 0 && (
                  <div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>
                      Active Alerts ({activeAlerts.length})
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {activeAlerts.map(a => (
                        <div
                          key={a.alert_id}
                          style={{
                            background: 'var(--surface-hover)',
                            border: '1px solid var(--border)',
                            borderRadius: '8px',
                            padding: '12px 14px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            gap: '12px'
                          }}
                        >
                          <div>
                            <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.875rem' }}>
                              {a.symbol}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                              Alert when price is <strong>{a.condition}</strong> {formatCurrency(a.target_price)}
                            </div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                              Created: {new Date(a.created_at).toLocaleDateString()}
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <button
                              onClick={() => handleDisableAlert(a.alert_id)}
                              title="Disable Alert"
                              style={{
                                padding: '6px 8px',
                                fontSize: '0.75rem',
                                borderRadius: '6px',
                                color: 'var(--text-muted)',
                                background: 'var(--surface)'
                              }}
                            >
                              Pause
                            </button>
                            <button
                              onClick={() => handleDeleteAlert(a.alert_id)}
                              title="Delete Alert"
                              style={{
                                padding: '6px',
                                borderRadius: '6px',
                                color: 'var(--danger)',
                                background: 'var(--surface)'
                              }}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
