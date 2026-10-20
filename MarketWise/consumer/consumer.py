import redis
import psycopg2
import os
import time

redis_host = os.environ.get("REDIS_HOST", "redis")
redis_port = int(os.environ.get("REDIS_PORT", "6379"))

def get_redis_connection():
    while True:
        try:
            r = redis.Redis(
                host=redis_host,
                port=redis_port,
                decode_responses=True,
                socket_timeout=15,
                retry_on_timeout=True
            )
            r.ping()
            print(f"Connected to Redis at {redis_host}:{redis_port}")
            return r
        except Exception as e:
            print(f"Waiting for Redis at {redis_host}:{redis_port} ({e})...")
            time.sleep(2)

def get_db_connection():
    while True:
        try:
            conn = psycopg2.connect(
                host=os.environ.get("POSTGRES_HOST", "timescaledb"),
                port=os.environ.get("POSTGRES_PORT", "5432"),
                database=os.environ.get("POSTGRES_DB", "postgres"),
                user=os.environ.get("POSTGRES_USER", "admin"),
                password=os.environ.get("POSTGRES_PASSWORD", "qwerty")
            )
            print("Connected to PostgreSQL/TimescaleDB")
            return conn
        except Exception as e:
            print(f"Waiting for database connection ({e})...")
            time.sleep(2)

r = get_redis_connection()
conn = get_db_connection()
cursor = conn.cursor()

cursor.execute("""
CREATE TABLE IF NOT EXISTS trades (
    redis_id VARCHAR(30) PRIMARY KEY,
    symbol VARCHAR(20),
    price DECIMAL(10,2),
    volume INT
)
""")
conn.commit()

print("Consumer started. Waiting for trades...")

# Start reading from latest recorded trade or beginning of the stream
cursor.execute("SELECT redis_id FROM trades ORDER BY redis_id DESC LIMIT 1;")
latest_trade = cursor.fetchone()
last_id = latest_trade[0] if latest_trade else "0-0"
print(f"Resuming consumer from stream ID: {last_id}")

while True:
    try:
        messages = r.xread(
            {"trades": last_id},
            block=5000
        )

        if not messages:
            continue

        for stream_name, stream_messages in messages:
            for message_id, trade in stream_messages:
                price_val = float(trade["price"])
                vol_val = int(trade.get("volume", 100))
                symbol_val = trade["symbol"]

                cursor.execute(
                    """
                    INSERT INTO trades (redis_id, symbol, price, volume)
                    VALUES (%s, %s, %s, %s)
                    ON CONFLICT (redis_id) DO NOTHING
                    """,
                    (
                        message_id,
                        symbol_val,
                        price_val,
                        vol_val
                    )
                )

                # Atomically evaluate active price alerts for this symbol
                cursor.execute(
                    """
                    UPDATE public.price_alerts
                    SET status = 'TRIGGERED',
                        triggered_at = CURRENT_TIMESTAMP,
                        triggered_price = %s
                    WHERE symbol = %s
                      AND status = 'ACTIVE'
                      AND (
                        (condition = 'ABOVE' AND %s >= target_price) OR
                        (condition = 'BELOW' AND %s <= target_price)
                      )
                    RETURNING alert_id, user_id, symbol, target_price, condition;
                    """,
                    (price_val, symbol_val, price_val, price_val)
                )
                triggered = cursor.fetchall()
                if triggered:
                    print(f"Triggered {len(triggered)} alert(s) for {symbol_val} at price {price_val}")

                conn.commit()
                last_id = message_id

    except (redis.exceptions.TimeoutError, redis.exceptions.ConnectionError) as e:
        print(f"Redis stream wait timeout or reconnect: {e}")
        time.sleep(1)
        r = get_redis_connection()
    except (psycopg2.OperationalError, psycopg2.InterfaceError) as e:
        print(f"PostgreSQL connection lost ({e}), reconnecting...")
        time.sleep(2)
        conn = get_db_connection()
        cursor = conn.cursor()
    except Exception as e:
        print(f"Consumer unexpected error: {e}")
        time.sleep(2)