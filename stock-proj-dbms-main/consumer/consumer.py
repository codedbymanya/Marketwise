import redis
import psycopg2

# Connect to Redis
r = redis.Redis(
    host="redis",
    port=6379,
    decode_responses=True
)

conn = psycopg2.connect(
    host="timescaledb",
    port=5432,
    database="postgres",
    user="admin",
    password="qwerty"
)

cursor = conn.cursor()

cursor.execute("""
CREATE TABLE IF NOT EXISTS trades (
    redis_id VARCHAR(30) PRIMARY KEY,
    symbol VARCHAR(10),
    price DECIMAL(10,2),
    volume INT
)
""")

conn.commit()

print("Consumer started. Waiting for trades...")

# Start reading from the beginning of the stream
last_id = "0-0"

while True:
    # Wait until a new message is available
    messages = r.xread(
        {"trades": last_id},
        block=0
    )

    # Process every message that Redis returned
    for stream_name, stream_messages in messages:

        for message_id, trade in stream_messages:

            print(f"\nNew Trade Received!")
            print(f"ID: {message_id}")
            print(f"Trade: {trade}")

            cursor.execute(
                """
                INSERT INTO trades (redis_id, symbol, price, volume)
                VALUES (%s, %s, %s, %s)
                """,
                (
                    message_id,
                    trade["symbol"],
                    float(trade["price"]),
                    int(trade["volume"])
                )
            )

            conn.commit()

            # Remember this message so we don't read it again
            last_id = message_id