-- MarketWise Database Schema Initialization
-- Defines tables for market ticks, user authentication, and portfolio management.

-- 1. Ingestion Table: Market trades buffered from Redis Streams
CREATE TABLE IF NOT EXISTS public.trades (
    redis_id VARCHAR(30) PRIMARY KEY,
    symbol   VARCHAR(20),
    price    NUMERIC(10,2),
    volume   INTEGER
);

-- 2. User Authentication Table
CREATE TABLE IF NOT EXISTS public.users (
    user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Portfolios Table
CREATE TABLE IF NOT EXISTS public.portfolios (
    portfolio_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL DEFAULT 'Default Portfolio',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Transactions Table (User Buy / Sell Ledger)
CREATE TABLE IF NOT EXISTS public.transactions (
    transaction_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    portfolio_id UUID NOT NULL REFERENCES public.portfolios(portfolio_id) ON DELETE CASCADE,
    symbol VARCHAR(20) NOT NULL,
    transaction_type VARCHAR(4) NOT NULL CHECK (transaction_type IN ('BUY', 'SELL')),
    quantity NUMERIC(12, 4) NOT NULL CHECK (quantity > 0),
    price NUMERIC(12, 2) NOT NULL CHECK (price > 0),
    transaction_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance & relational queries
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_portfolios_user_id ON public.portfolios(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_portfolio_id ON public.transactions(portfolio_id);
CREATE INDEX IF NOT EXISTS idx_transactions_symbol ON public.transactions(symbol);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON public.transactions(portfolio_id, transaction_date ASC, created_at ASC);

-- 5. User Watchlists Table (Database-backed persistent watchlists)
CREATE TABLE IF NOT EXISTS public.watchlists (
    watchlist_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
    symbol VARCHAR(20) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_user_watchlist_symbol UNIQUE (user_id, symbol)
);

CREATE INDEX IF NOT EXISTS idx_watchlists_user_id ON public.watchlists(user_id);
CREATE INDEX IF NOT EXISTS idx_watchlists_user_symbol ON public.watchlists(user_id, symbol);

-- 6. Price Alerts Table (Database-backed real-time price alerts)
CREATE TABLE IF NOT EXISTS public.price_alerts (
    alert_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
    symbol VARCHAR(20) NOT NULL,
    target_price NUMERIC(12, 2) NOT NULL CHECK (target_price > 0),
    condition VARCHAR(10) NOT NULL CHECK (condition IN ('ABOVE', 'BELOW')),
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'TRIGGERED', 'DISABLED')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    triggered_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    triggered_price NUMERIC(12, 2) DEFAULT NULL
);

CREATE INDEX IF NOT EXISTS idx_price_alerts_user_id ON public.price_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_price_alerts_symbol_status ON public.price_alerts(symbol, status);
CREATE INDEX IF NOT EXISTS idx_price_alerts_user_status ON public.price_alerts(user_id, status);

