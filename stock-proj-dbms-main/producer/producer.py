import redis
import time
import yfinance as yf
from symbols import NIFTY_50

r = redis.Redis(
    host="redis",
    port=6379,
    decode_responses=True
)

print(r.ping())

while True:

    for symbol in NIFTY_50:

        stock = yf.Ticker(symbol)

        price = stock.fast_info["lastPrice"]

        r.xadd(
            "trades",
            {
                "symbol": symbol,
                "price": str(price),
                "volume": "100"
            }
        )

        print(f"Trade added! {symbol} - {price}")

    time.sleep(5)