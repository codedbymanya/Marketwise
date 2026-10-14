import React from 'react';
import { LineChart, Search, User } from 'lucide-react';

export const Header: React.FC = () => {
  return (
    <header className="card bento-header" style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ background: 'var(--accent)', color: 'white', padding: '8px', borderRadius: '8px' }}>
          <LineChart size={20} />
        </div>
        <h1 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
          StockSense
        </h1>
      </div>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--surface-hover)', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)' }}>
          <Search size={16} color="var(--text-muted)" />
          <input 
            type="text" 
            placeholder="Search stocks..." 
            style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '0.875rem', width: '200px' }}
          />
        </div>
        <button style={{ padding: '8px', borderRadius: '50%', background: 'var(--surface-hover)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <User size={18} color="var(--text-muted)" />
        </button>
      </div>
    </header>
  );
};
