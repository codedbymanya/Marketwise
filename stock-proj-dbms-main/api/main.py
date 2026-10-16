from fastapi import FastAPI, HTTPException, status, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import psycopg2
import os
import datetime
import bcrypt
import jwt
from typing import Optional, List

app = FastAPI(title="StockSense API", version="2.0.0")

# Enable CORS for local frontend development
cors_origins_env = os.environ.get("CORS_ORIGINS", "")
allowed_origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5174",
    "http://localhost:5175",
    "http://127.0.0.1:5175",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]
if cors_origins_env:
    for orig in cors_origins_env.split(","):
        cleaned = orig.strip()
        if cleaned and cleaned not in allowed_origins:
            allowed_origins.append(cleaned)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# JWT Security Configuration
JWT_SECRET = os.environ.get("JWT_SECRET", "stocksense_jwt_secret_dev_key_change_in_prod_9918")
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

def get_db_connection():
    try:
        conn = psycopg2.connect(
            host=os.environ.get("POSTGRES_HOST", "timescaledb"),
            port=os.environ.get("POSTGRES_PORT", "5432"),
            database=os.environ.get("POSTGRES_DB", "postgres"),
            user=os.environ.get("POSTGRES_USER", "admin"),
            password=os.environ.get("POSTGRES_PASSWORD", "qwerty")
        )
        return conn
    except Exception as e:
        print(f"Database connection error: {e}")
        return None

def init_db():
    conn = get_db_connection()
    if not conn:
        print("Warning: Could not connect to database to verify schema.")
        return
    try:
        cursor = conn.cursor()
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS public.trades (
                redis_id VARCHAR(30) PRIMARY KEY,
                symbol VARCHAR(20),
                price NUMERIC(10,2),
                volume INTEGER
            );

            CREATE TABLE IF NOT EXISTS public.users (
                user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                name VARCHAR(100) NOT NULL,
                email VARCHAR(255) NOT NULL UNIQUE,
                password_hash VARCHAR(255) NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS public.portfolios (
                portfolio_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
                name VARCHAR(100) NOT NULL DEFAULT 'Default Portfolio',
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );

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

            CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
            CREATE INDEX IF NOT EXISTS idx_portfolios_user_id ON public.portfolios(user_id);
            CREATE INDEX IF NOT EXISTS idx_transactions_portfolio_id ON public.transactions(portfolio_id);
            CREATE INDEX IF NOT EXISTS idx_transactions_symbol ON public.transactions(symbol);
            CREATE INDEX IF NOT EXISTS idx_transactions_date ON public.transactions(portfolio_id, transaction_date ASC, created_at ASC);
        """)
        conn.commit()
        print("StockSense database schema verified successfully.")
    except Exception as e:
        conn.rollback()
        print(f"Schema initialization warning: {e}")
    finally:
        conn.close()

@app.on_event("startup")
def on_startup():
    init_db()

# -------------------------------------------------------------
# Security & JWT Helpers
# -------------------------------------------------------------

def hash_password(password: str) -> str:
    salt = bcrypt.gensalt(rounds=12)
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))
    except Exception:
        return False

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(hours=JWT_EXPIRATION_HOURS)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)

def get_current_user(authorization: Optional[str] = Header(None)) -> dict:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid Authorization header. Expected 'Bearer <token>'."
        )
    token = authorization.split(" ")[1]
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token subject.")
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication token has expired.")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid authentication token.")

    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="Database connection failed.")
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT user_id, name, email, created_at FROM public.users WHERE user_id = %s;", (user_id,))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User account not found.")
        return {
            "user_id": str(row[0]),
            "name": row[1],
            "email": row[2],
            "created_at": row[3].isoformat() if row[3] else None
        }
    finally:
        conn.close()

def parse_redis_timestamp(redis_id: str) -> str:
    try:
        timestamp_ms = int(redis_id.split('-')[0])
        dt = datetime.datetime.fromtimestamp(timestamp_ms / 1000.0, tz=datetime.timezone.utc)
        return dt.isoformat()
    except Exception:
        return ""

# -------------------------------------------------------------
# Pydantic Request Models
# -------------------------------------------------------------

class RegisterRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: str = Field(..., min_length=5, max_length=255)
    password: str = Field(..., min_length=6, max_length=128)

class LoginRequest(BaseModel):
    email: str = Field(...)
    password: str = Field(...)

class TransactionCreateRequest(BaseModel):
    symbol: str = Field(...)
    transaction_type: str = Field(...)
    quantity: float = Field(...)
    price: float = Field(...)
    transaction_date: Optional[str] = None

# -------------------------------------------------------------
# Existing Market Data Endpoints
# -------------------------------------------------------------

@app.get("/stocks")
def get_stocks():
    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="Database connection failed")
    
    try:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT DISTINCT ON (symbol) symbol, price, volume, redis_id 
            FROM trades 
            ORDER BY symbol, redis_id DESC;
        """)
        rows = cursor.fetchall()
        
        result = []
        for row in rows:
            symbol, price, volume, redis_id = row
            result.append({
                "symbol": symbol,
                "price": float(price),
                "volume": int(volume),
                "timestamp": parse_redis_timestamp(redis_id)
            })
            
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@app.get("/stocks/{symbol}/history")
def get_stock_history(symbol: str):
    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="Database connection failed")
    
    try:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT price, volume, redis_id 
            FROM trades 
            WHERE symbol = %s 
            ORDER BY redis_id DESC 
            LIMIT 100;
        """, (symbol,))
        
        rows = cursor.fetchall()
        if not rows:
            raise HTTPException(status_code=404, detail=f"No historical records found for symbol {symbol}")
            
        rows.reverse()
            
        result = []
        for row in rows:
            price, volume, redis_id = row
            result.append({
                "price": float(price),
                "volume": int(volume),
                "timestamp": parse_redis_timestamp(redis_id)
            })
            
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

# -------------------------------------------------------------
# Feature 7: Authentication Endpoints
# -------------------------------------------------------------

@app.post("/auth/register", status_code=status.HTTP_201_CREATED)
def register_user(payload: RegisterRequest):
    email = payload.email.strip().lower()
    name = payload.name.strip()
    
    if "@" not in email or "." not in email:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Please enter a valid email address.")
    
    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="Database connection failed.")
    
    try:
        cursor = conn.cursor()
        # Enforce unique email check
        cursor.execute("SELECT user_id FROM public.users WHERE email = %s;", (email,))
        if cursor.fetchone():
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="This email address is already registered.")
        
        pwd_hash = hash_password(payload.password)
        
        # Insert user and default portfolio in atomic transaction
        cursor.execute("""
            INSERT INTO public.users (name, email, password_hash)
            VALUES (%s, %s, %s)
            RETURNING user_id, name, email, created_at;
        """, (name, email, pwd_hash))
        new_user = cursor.fetchone()
        user_id = str(new_user[0])
        
        cursor.execute("""
            INSERT INTO public.portfolios (user_id, name)
            VALUES (%s, 'My Portfolio');
        """, (user_id,))
        
        conn.commit()
        
        token = create_access_token({"sub": user_id, "name": new_user[1], "email": new_user[2]})
        
        return {
            "access_token": token,
            "token_type": "bearer",
            "user": {
                "user_id": user_id,
                "name": new_user[1],
                "email": new_user[2],
                "created_at": new_user[3].isoformat() if new_user[3] else None
            }
        }
    except HTTPException:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Registration failed: {str(e)}")
    finally:
        conn.close()

@app.post("/auth/login")
def login_user(payload: LoginRequest):
    email = payload.email.strip().lower()
    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="Database connection failed.")
    
    try:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT user_id, name, email, password_hash, created_at 
            FROM public.users 
            WHERE email = %s;
        """, (email,))
        user_row = cursor.fetchone()
        
        if not user_row or not verify_password(payload.password, user_row[3]):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password."
            )
        
        user_id = str(user_row[0])
        token = create_access_token({"sub": user_id, "name": user_row[1], "email": user_row[2]})
        
        return {
            "access_token": token,
            "token_type": "bearer",
            "user": {
                "user_id": user_id,
                "name": user_row[1],
                "email": user_row[2],
                "created_at": user_row[4].isoformat() if user_row[4] else None
            }
        }
    finally:
        conn.close()

@app.get("/auth/me")
def get_profile(current_user: dict = Depends(get_current_user)):
    return current_user

# -------------------------------------------------------------
# Feature 8: Portfolio Tracking Endpoints
# -------------------------------------------------------------

def get_or_create_user_portfolio(cursor, user_id: str) -> tuple:
    cursor.execute("""
        SELECT portfolio_id, name, created_at 
        FROM public.portfolios 
        WHERE user_id = %s 
        ORDER BY created_at ASC 
        LIMIT 1;
    """, (user_id,))
    row = cursor.fetchone()
    if row:
        return str(row[0]), row[1]
    
    cursor.execute("""
        INSERT INTO public.portfolios (user_id, name)
        VALUES (%s, 'My Portfolio')
        RETURNING portfolio_id, name;
    """, (user_id,))
    new_row = cursor.fetchone()
    return str(new_row[0]), new_row[1]

@app.get("/portfolio")
def get_portfolio(current_user: dict = Depends(get_current_user)):
    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="Database connection failed.")
    
    try:
        cursor = conn.cursor()
        portfolio_id, portfolio_name = get_or_create_user_portfolio(cursor, current_user["user_id"])
        
        # Retrieve all historical transactions for this portfolio in chronological order
        cursor.execute("""
            SELECT transaction_id, symbol, transaction_type, quantity, price, transaction_date, created_at
            FROM public.transactions
            WHERE portfolio_id = %s
            ORDER BY transaction_date ASC, created_at ASC;
        """, (portfolio_id,))
        transactions = cursor.fetchall()
        
        # Calculate holdings using Weighted Average Cost (WAC) method
        holdings_map = {}
        total_realized_pnl = 0.0
        
        for tx in transactions:
            _, sym, tx_type, qty, price, _, _ = tx
            qty = float(qty)
            price = float(price)
            
            if sym not in holdings_map:
                holdings_map[sym] = {
                    "quantity": 0.0,
                    "avg_cost": 0.0,
                    "realized_pnl": 0.0
                }
            
            h = holdings_map[sym]
            if tx_type == "BUY":
                new_qty = h["quantity"] + qty
                if new_qty > 0:
                    h["avg_cost"] = ((h["quantity"] * h["avg_cost"]) + (qty * price)) / new_qty
                h["quantity"] = new_qty
            elif tx_type == "SELL":
                # Realized profit/loss = (sell_price - current_avg_cost) * sold_quantity
                pnl = (price - h["avg_cost"]) * qty
                h["realized_pnl"] += pnl
                total_realized_pnl += pnl
                h["quantity"] -= qty
                if h["quantity"] <= 0.0001:
                    h["quantity"] = 0.0
                    h["avg_cost"] = 0.0
        
        # Fetch latest prices for all active stocks from the trades table
        cursor.execute("""
            SELECT DISTINCT ON (symbol) symbol, price 
            FROM public.trades 
            ORDER BY symbol, redis_id DESC;
        """)
        market_rows = cursor.fetchall()
        latest_prices = {row[0]: float(row[1]) for row in market_rows}
        
        # Compute holding metrics
        holdings_list = []
        total_portfolio_value = 0.0
        total_invested = 0.0
        
        for sym, h in holdings_map.items():
            if h["quantity"] > 0.0001:
                cur_price = latest_prices.get(sym)
                inv = round(h["quantity"] * h["avg_cost"], 2)
                total_invested += inv
                
                if cur_price is not None:
                    cur_val = round(h["quantity"] * cur_price, 2)
                    unrealized_pnl = round(cur_val - inv, 2)
                    unrealized_pct = round((unrealized_pnl / inv * 100.0), 2) if inv > 0 else 0.0
                    total_portfolio_value += cur_val
                else:
                    cur_val = None
                    unrealized_pnl = None
                    unrealized_pct = None
                
                holdings_list.append({
                    "symbol": sym,
                    "quantity": round(h["quantity"], 4),
                    "avg_buy_price": round(h["avg_cost"], 2),
                    "total_invested": inv,
                    "current_price": cur_price,
                    "current_value": cur_val,
                    "unrealized_pnl": unrealized_pnl,
                    "unrealized_pnl_pct": unrealized_pct,
                    "realized_pnl": round(h["realized_pnl"], 2)
                })
        
        holdings_list.sort(key=lambda x: x["symbol"])
        
        total_portfolio_value = round(total_portfolio_value, 2)
        total_invested = round(total_invested, 2)
        total_unrealized_pnl = round(total_portfolio_value - total_invested, 2)
        total_unrealized_pnl_pct = round((total_unrealized_pnl / total_invested * 100.0), 2) if total_invested > 0 else 0.0
        
        return {
            "portfolio": {
                "portfolio_id": portfolio_id,
                "name": portfolio_name,
                "total_value": total_portfolio_value,
                "total_invested": total_invested,
                "total_unrealized_pnl": total_unrealized_pnl,
                "total_unrealized_pnl_pct": total_unrealized_pnl_pct,
                "total_realized_pnl": round(total_realized_pnl, 2),
                "holdings_count": len(holdings_list)
            },
            "holdings": holdings_list
        }
    finally:
        conn.close()

@app.post("/portfolio/transactions", status_code=status.HTTP_201_CREATED)
def create_transaction(payload: TransactionCreateRequest, current_user: dict = Depends(get_current_user)):
    symbol = payload.symbol.strip().upper()
    tx_type = payload.transaction_type.strip().upper()
    
    if tx_type not in ("BUY", "SELL"):
        raise HTTPException(status_code=400, detail="Transaction type must be 'BUY' or 'SELL'.")
    if payload.quantity <= 0:
        raise HTTPException(status_code=400, detail="Quantity must be greater than zero.")
    if payload.price <= 0:
        raise HTTPException(status_code=400, detail="Price must be greater than zero.")
    
    tx_date = datetime.datetime.now(datetime.timezone.utc)
    if payload.transaction_date:
        try:
            tx_date = datetime.datetime.fromisoformat(payload.transaction_date.replace("Z", "+00:00"))
        except Exception:
            pass
    
    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="Database connection failed.")
    
    try:
        cursor = conn.cursor()
        
        # Acquire portfolio ID with row-level lock for transactional consistency
        portfolio_id, _ = get_or_create_user_portfolio(cursor, current_user["user_id"])
        cursor.execute("SELECT portfolio_id FROM public.portfolios WHERE portfolio_id = %s FOR UPDATE;", (portfolio_id,))
        
        # Concurrency & balance control: Prevent over-selling
        if tx_type == "SELL":
            cursor.execute("""
                SELECT COALESCE(SUM(CASE WHEN transaction_type = 'BUY' THEN quantity ELSE -quantity END), 0)
                FROM public.transactions
                WHERE portfolio_id = %s AND symbol = %s;
            """, (portfolio_id, symbol))
            balance_row = cursor.fetchone()
            current_held = float(balance_row[0]) if balance_row else 0.0
            
            if current_held < payload.quantity:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Insufficient shares held for {symbol}. Currently available: {current_held:g}, requested to sell: {payload.quantity:g}."
                )
        
        cursor.execute("""
            INSERT INTO public.transactions (portfolio_id, symbol, transaction_type, quantity, price, transaction_date)
            VALUES (%s, %s, %s, %s, %s, %s)
            RETURNING transaction_id, portfolio_id, symbol, transaction_type, quantity, price, transaction_date, created_at;
        """, (portfolio_id, symbol, tx_type, payload.quantity, payload.price, tx_date))
        
        created = cursor.fetchone()
        conn.commit()
        
        return {
            "transaction_id": str(created[0]),
            "portfolio_id": str(created[1]),
            "symbol": created[2],
            "transaction_type": created[3],
            "quantity": float(created[4]),
            "price": float(created[5]),
            "transaction_date": created[6].isoformat() if created[6] else None,
            "created_at": created[7].isoformat() if created[7] else None
        }
    except HTTPException:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to record transaction: {str(e)}")
    finally:
        conn.close()

@app.get("/portfolio/transactions")
def get_transactions(current_user: dict = Depends(get_current_user)):
    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="Database connection failed.")
    
    try:
        cursor = conn.cursor()
        portfolio_id, _ = get_or_create_user_portfolio(cursor, current_user["user_id"])
        
        cursor.execute("""
            SELECT transaction_id, symbol, transaction_type, quantity, price, transaction_date, created_at
            FROM public.transactions
            WHERE portfolio_id = %s
            ORDER BY transaction_date DESC, created_at DESC;
        """, (portfolio_id,))
        rows = cursor.fetchall()
        
        result = []
        for r in rows:
            result.append({
                "transaction_id": str(r[0]),
                "symbol": r[1],
                "transaction_type": r[2],
                "quantity": float(r[3]),
                "price": float(r[4]),
                "total_amount": round(float(r[3]) * float(r[4]), 2),
                "transaction_date": r[5].isoformat() if r[5] else None,
                "created_at": r[6].isoformat() if r[6] else None
            })
            
        return result
    finally:
        conn.close()

@app.delete("/portfolio/transactions/{transaction_id}")
def delete_transaction(transaction_id: str, current_user: dict = Depends(get_current_user)):
    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="Database connection failed.")
    
    try:
        cursor = conn.cursor()
        portfolio_id, _ = get_or_create_user_portfolio(cursor, current_user["user_id"])
        
        # Verify transaction exists and belongs to the user's portfolio
        cursor.execute("""
            SELECT transaction_id, symbol, transaction_type, quantity, transaction_date, created_at
            FROM public.transactions
            WHERE transaction_id = %s AND portfolio_id = %s;
        """, (transaction_id, portfolio_id))
        target_tx = cursor.fetchone()
        
        if not target_tx:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transaction not found in your portfolio.")
        
        target_sym = target_tx[1]
        target_type = target_tx[2]
        
        # If deleting a BUY, ensure subsequent SELLs never cause a negative running balance
        if target_type == "BUY":
            cursor.execute("""
                SELECT transaction_id, transaction_type, quantity
                FROM public.transactions
                WHERE portfolio_id = %s AND symbol = %s
                ORDER BY transaction_date ASC, created_at ASC;
            """, (portfolio_id, target_sym))
            all_txs = cursor.fetchall()
            
            running_qty = 0.0
            for tx in all_txs:
                t_id, t_type, t_qty = str(tx[0]), tx[1], float(tx[2])
                if t_id == transaction_id:
                    continue  # Simulate removal
                if t_type == "BUY":
                    running_qty += t_qty
                elif t_type == "SELL":
                    running_qty -= t_qty
                    if running_qty < -0.0001:
                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail="Cannot delete this BUY transaction because subsequent SELL transactions depend on these shares."
                        )
        
        cursor.execute("""
            DELETE FROM public.transactions 
            WHERE transaction_id = %s AND portfolio_id = %s;
        """, (transaction_id, portfolio_id))
        conn.commit()
        
        return {
            "message": "Transaction deleted successfully.",
            "transaction_id": transaction_id
        }
    except HTTPException:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to delete transaction: {str(e)}")
    finally:
        conn.close()
