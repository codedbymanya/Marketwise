from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
import psycopg2
import os
import datetime

app = FastAPI()

# Enable CORS for local frontend development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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

def parse_redis_timestamp(redis_id: str) -> str:
    try:
        # Extract milliseconds before '-'
        timestamp_ms = int(redis_id.split('-')[0])
        # Convert to datetime (Unix timestamp is in seconds, so divide by 1000)
        dt = datetime.datetime.fromtimestamp(timestamp_ms / 1000.0, tz=datetime.timezone.utc)
        # Format as ISO 8601
        return dt.isoformat()
    except Exception:
        return ""

@app.get("/stocks")
def get_stocks():
    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="Database connection failed")
    
    try:
        cursor = conn.cursor()
        # Get the latest record for each symbol
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
