import redis
import time
import os
import yfinance as yf
from symbols import NIFTY_50

redis_host = os.environ.get("REDIS_HOST", "redis")
redis_port = int(os.environ.get("REDIS_PORT", "6379"))

r = redis.Redis(
    host=redis_host,
    port=redis_port,
    decode_responses=True
)

print(f"Producer connecting to Redis at {redis_host}:{redis_port}...")
print(f"Redis Ping: {r.ping()}")

while True:
    for symbol in NIFTY_50:
        try:
            stock = yf.Ticker(symbol)
            price = stock.fast_info["lastPrice"]
            if price is not None and price > 0:
                r.xadd(
                    "trades",
                    {
                        "symbol": symbol,
                        "price": str(price),
                        "volume": "100"
                    }
                )
                print(f"Trade added! {symbol} - {price}")
        except Exception as e:
            print(f"Error processing {symbol}: {e}")

    time.sleep(5)