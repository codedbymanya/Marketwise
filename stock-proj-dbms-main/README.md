# StockSense

A stream-oriented stock market tracking and analysis platform developed as a DBMS mini-project. StockSense demonstrates an end-to-end data engineering and web application pipeline: ingesting streaming market quotes via Yahoo Finance, queuing trades through Redis Streams, persisting historical tick records in TimescaleDB (PostgreSQL 16), exposing data via a FastAPI REST API, and rendering an interactive dark-themed fintech dashboard with React and TypeScript.

---

## Table of Contents

- [Overview & Problem Statement](#overview--problem-statement)
- [System Architecture & Data Flow](#system-architecture--data-flow)
- [Key Features](#key-features)
  - [Implemented Features](#implemented-features)
  - [Planned Features](#planned-features)
- [Technology Stack](#technology-stack)
- [Repository Directory Structure](#repository-directory-structure)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
  - [1. Backend Setup (Docker Compose)](#1-backend-setup-docker-compose)
  - [2. Frontend Setup (React + Vite)](#2-frontend-setup-react--vite)
- [REST API Documentation](#rest-api-documentation)
  - [GET /stocks](#get-stocks)
  - [GET /stocks/{symbol}/history](#get-stockssymbolhistory)
  - [Interactive Documentation](#interactive-documentation)
- [Database Schema & Data Pipeline Details](#database-schema--data-pipeline-details)
- [Configuration & Environment Variables](#configuration--environment-variables)
- [Known Limitations & Design Disclosures](#known-limitations--design-disclosures)
- [Future Enhancements](#future-enhancements)
- [Troubleshooting](#troubleshooting)

---

## Overview & Problem Statement

Financial data systems require robust data engineering pipelines capable of ingesting high-frequency price updates, buffering burst traffic, persisting chronological time-series points, and serving low-latency queries to client applications without locking database tables or causing client-side rendering bottlenecks.

**StockSense** solves this architectural challenge in a mini-project scope by:
1. Decoupling data ingestion from data storage using an in-memory stream buffer (Redis Streams).
2. Persisting streaming tick data into a relational time-series database (TimescaleDB / PostgreSQL).
3. Exposing structured REST endpoints for latest prices and chronological historical lookbacks via FastAPI.
4. Visualizing market movements and summary analytics in a modern, responsive React interface.

---

## System Architecture & Data Flow

```text
  ┌────────────────────────────────────────────────────────┐
  │                   External Market                      │
  │                 Yahoo Finance API                      │
  └───────────────────────────┬────────────────────────────┘
                              │ Polled every 5 seconds
                              ▼
  ┌────────────────────────────────────────────────────────┐
  │                 Python Producer Service                │
  │  - Queries yfinance for 10 tracked NIFTY 50 tickers    │
  │  - Appends trade payloads to Redis Stream ("trades")   │
  └───────────────────────────┬────────────────────────────┘
                              │ Redis XADD
                              ▼
  ┌────────────────────────────────────────────────────────┐
  │               Redis Streams Message Broker             │
  │  - In-memory event log / stream buffer: "trades"       │
  │  - Millisecond-sequenced stream IDs (<time_ms>-<seq>)  │
  └───────────────────────────┬────────────────────────────┘
                              │ Redis XREAD (blocking)
                              ▼
  ┌────────────────────────────────────────────────────────┐
  │                 Python Consumer Service                │
  │  - Listens continuously for new stream events          │
  │  - Batches / commits trade rows into PostgreSQL        │
  └───────────────────────────┬────────────────────────────┘
                              │ SQL INSERT
                              ▼
  ┌────────────────────────────────────────────────────────┐
  │         PostgreSQL / TimescaleDB (Time-Series)         │
  │  - Database: "postgres", Table: "trades"               │
  │  - Stores primary key redis_id, symbol, price, volume  │
  └───────────────────────────┬────────────────────────────┘
                              │ SQL SELECT (DISTINCT / DESC)
                              ▼
  ┌────────────────────────────────────────────────────────┐
  │                  FastAPI Backend Server                │
  │  - Port 8000, CORS enabled for local frontend          │
  │  - Endpoints: /stocks, /stocks/{symbol}/history        │
  │  - Converts Redis stream IDs to ISO 8601 UTC timestamps│
  └───────────────────────────┬────────────────────────────┘
                              │ HTTP / JSON
                              ▼
  ┌────────────────────────────────────────────────────────┐
  │            React + TypeScript Frontend Client          │
  │  - Vite dev server at port 5173                        │
  │  - Dark-mode fintech dashboard (Bento Grid layout)     │
  │  - Recharts area chart, dynamic stats & asset selector │
  └────────────────────────────────────────────────────────┘
```

---

## Key Features

### Implemented Features

- **Automated Market Ingestion**: Continual polling of 10 prominent Indian equities (NIFTY 50 constituents) via Yahoo Finance.
- **Stream Buffering**: Asynchronous ingestion using Redis Streams (`XADD` / `XREAD`) to eliminate direct database write contention.
- **Relational Time-Series Storage**: Automated table generation and transaction-safe insertion into PostgreSQL / TimescaleDB.
- **Efficient Query API**:
  - `GET /stocks`: Retrieves the most recent market price for all tracked equities using `DISTINCT ON (symbol)`.
  - `GET /stocks/{symbol}/history`: Retrieves the 100 most recent records ordered chronologically (oldest to newest) for chart plotting.
  - Parameterized queries to prevent SQL injection vulnerabilities.
- **Fintech Dashboard Interface**:
  - **Bento Grid Architecture**: Responsive layout with discrete summary, chart, asset list, and analysis modules.
  - **Asset Selector**: Clean list showing current INR prices, last update timestamps, and active asset highlighting.
  - **Dynamic Interactive Chart**: Area chart with gradient fill, crosshair tooltip, and automatic price-scale domain adjustment.
  - **Real-Time Statistical Analysis**: Client-side calculation of rolling session High, Low, Dynamic Spread (volatility), and Net Session Direction based on loaded history.
  - **Session Monitoring Toggles**: In-memory watch/flag state per asset within the dashboard session.

### Planned Features

The following capabilities are **not currently implemented** and represent roadmap items:
- **Persistent User Accounts & Authentication**: JWT-based login, role-based access control, and user profile persistence.
- **Persistent Watchlists & Portfolios**: Cloud-saved watchlists and multi-portfolio tracking across browser sessions.
- **Configurable Price Alerts**: Webhook, email, or browser push notifications triggered by price threshold breaches.
- **Exchange Order Placement**: Simulation or execution of limit/market buy and sell orders.
- **News Integration & Sentiment Analysis**: Real-time financial headlines or sentiment scoring using natural language models.

---

## Technology Stack

| Layer | Technology | Version / Base | Role / Purpose |
| :--- | :--- | :--- | :--- |
| **Ingestion Producer** | Python | `3.11-slim` | Fetches quotes via `yfinance` and pushes events to Redis Streams. |
| **Message Broker** | Redis | `7-alpine` | In-memory stream message broker (`trades` stream) buffering trades. |
| **Stream Consumer** | Python | `3.11-slim` | Consumes Redis stream entries and commits records to PostgreSQL. |
| **Database** | TimescaleDB / PostgreSQL | `latest-pg16` | Relational time-series database storing historical trade records. |
| **REST API Server** | FastAPI / Uvicorn | Python 3.11 / FastAPI | High-performance asynchronous HTTP REST API exposing DB records. |
| **Frontend Framework** | React | `19.2` | Component-based reactive user interface. |
| **Language & Tooling** | TypeScript & Vite | `TS ~6.0` / `Vite 8.3` | Strongly-typed frontend build toolchain with instant HMR. |
| **Data Visualization** | Recharts | `3.10` | Declarative SVG charting library for rendering historical price trends. |
| **Icons & Styling** | Lucide React & Vanilla CSS | `lucide 1.52` | Modern, dark-mode fintech aesthetics without third-party CSS overhead. |
| **Orchestration** | Docker Compose | Compose v2 | Multi-container orchestration of Redis, TimescaleDB, Producer, Consumer, and API. |

---

## Repository Directory Structure

```text
stock-proj-dbms-main/
├── .env.example              # Template environment configuration file
├── .gitignore                # Git ignore specifications (Python, node_modules, Docker)
├── docker-compose.yml        # Orchestration for redis, timescaledb, producer, consumer, api
├── LICENSE                   # Project license
├── README.md                 # Project documentation
│
├── api/                      # FastAPI REST Backend Service
│   ├── Dockerfile            # Container build recipe for FastAPI API server
│   ├── main.py               # FastAPI application, database pool, and REST endpoints
│   └── requirements.txt      # Python dependencies: fastapi, uvicorn, psycopg2-binary
│
├── consumer/                 # Redis Stream to PostgreSQL Consumer Service
│   ├── consumer.py           # Stream listener, table DDL creation, and database writer
│   ├── Dockerfile            # Container build recipe for stream consumer
│   └── requirements.txt      # Python dependencies: redis, psycopg2-binary
│
├── db/                       # Database Initialization Artifacts
│   └── init.sql              # Initialization SQL script mounted into TimescaleDB container
│
├── frontend/                 # React + TypeScript + Vite Dashboard Client
│   ├── index.html            # Vite entry HTML document
│   ├── package.json          # Node dependencies, scripts (dev, build, lint, preview)
│   ├── tsconfig.json         # Base TypeScript configuration
│   ├── tsconfig.app.json     # Application-specific TypeScript compiler options
│   ├── tsconfig.node.json    # Vite Node-environment TypeScript configuration
│   ├── vite.config.ts        # Vite build tool configuration
│   └── src/
│       ├── App.tsx           # Top-level application component
│       ├── main.tsx          # React application root DOM mount
│       ├── index.css         # Custom dark-theme fintech CSS design system
│       ├── components/       # Modular dashboard UI components
│       │   ├── Header.tsx        # System branding and operational status indicator
│       │   ├── MarketSummary.tsx # Active tracking metrics and system health card
│       │   ├── StockAnalysis.tsx # High/Low/Spread/Trend computed analytics card
│       │   ├── StockCard.tsx     # Primary selected asset view and Recharts area graph
│       │   └── StockList.tsx     # Scrollable tracked assets list with active selection
│       ├── pages/
│       │   └── Dashboard.tsx     # Main dashboard view orchestrating data loading effects
│       ├── services/
│       │   └── api.ts            # Client HTTP service communicating with FastAPI endpoints
│       └── types/
│           └── api.ts            # TypeScript interfaces for Stock and StockHistory models
│
└── producer/                 # Market Data Poller and Redis Producer Service
    ├── Dockerfile            # Container build recipe for producer worker
    ├── producer.py           # Polling loop fetching Yahoo Finance prices into Redis stream
    ├── requirements.txt      # Python dependencies: redis, yfinance
    └── symbols.py            # Constituent tracked stock ticker list (NIFTY 50 subset)
```

---

## Prerequisites

Before running the application, ensure the following software is installed on your workstation:

1. **Docker Desktop**:
   - On Windows: Docker Desktop with the **WSL 2 backend enabled** (Ubuntu or default WSL 2 distro).
   - Ensure Docker service is running (`docker --version` and `docker compose version`).
2. **Node.js & npm**:
   - Node.js version `18.x` or higher (`node -v`).
   - npm version `9.x` or higher (`npm -v`).
3. **Web Browser**: Any modern evergreen browser (Chrome, Edge, Firefox, Brave) supporting ES2020+.

---

## Getting Started

### 1. Backend Setup (Docker Compose)

The entire backend pipeline—including Redis, TimescaleDB, the market producer, the stream consumer, and the FastAPI service—is containerized.

1. Open a terminal in the project directory:
   ```bash
   cd stock-proj-dbms-main
   ```

2. Start all backend services in detached mode:
   ```bash
   docker compose up -d --build
   ```

3. Verify that all 5 containers are running:
   ```bash
   docker compose ps
   ```

   You should observe 5 healthy/running containers:
   - `stock-redis` (Ports: `6380->6379`)
   - `stock-timescaledb` (Ports: `5433->5432`)
   - `stock-producer` (Up)
   - `stock-consumer` (Up)
   - `stock-api` (Ports: `8000->8000`)

4. Inspect the streaming pipeline logs:
   ```bash
   # View producer polling activity:
   docker logs -f stock-producer

   # View consumer database write activity:
   docker logs -f stock-consumer

   # View REST API server requests:
   docker logs -f stock-api
   ```

---

### 2. Frontend Setup (React + Vite)

The frontend is run locally using Vite for hot module replacement during development.

1. Navigate to the `frontend` directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the Vite development server:
   ```bash
   npm run dev
   ```

4. Access the web dashboard by navigating to:
   ```text
   http://localhost:5173
   ```

5. (Optional) Run TypeScript checks, linting, and production builds:
   ```bash
   npm run lint     # Runs oxlint static analysis
   npm run build    # Compiles TypeScript (tsc -b) and bundles production assets via Vite
   npm run preview  # Previews the compiled production bundle locally
   ```

---

## REST API Documentation

The FastAPI service listens on `http://localhost:8000`. Cross-Origin Resource Sharing (CORS) is pre-configured to accept requests from `http://localhost:5173`.

### GET /stocks

Returns the most recently recorded market price, volume, and timestamp for all distinct tracked stock symbols.

- **URL**: `http://localhost:8000/stocks`
- **Method**: `GET`
- **Headers**: `Accept: application/json`
- **Query Parameters**: None

#### Representative Response (`200 OK`)
```json
[
  {
    "symbol": "BHARTIARTL.NS",
    "price": 1891.0,
    "volume": 100,
    "timestamp": "2026-10-14T16:06:16.437000+00:00"
  },
  {
    "symbol": "HDFCBANK.NS",
    "price": 1690.4,
    "volume": 100,
    "timestamp": "2026-10-14T16:06:14.200000+00:00"
  },
  {
    "symbol": "RELIANCE.NS",
    "price": 1174.6,
    "volume": 100,
    "timestamp": "2026-10-14T16:06:16.437000+00:00"
  },
  {
    "symbol": "TCS.NS",
    "price": 2845.5,
    "volume": 100,
    "timestamp": "2026-10-14T16:06:15.110000+00:00"
  }
]
```

---

### GET /stocks/{symbol}/history

Retrieves the 100 most recent tick records for the specified stock symbol, returned in **ascending chronological order (oldest to newest)** so that charting libraries plot sequentially from left to right.

- **URL**: `http://localhost:8000/stocks/{symbol}/history`
- **Method**: `GET`
- **Path Parameter**: `symbol` (e.g., `RELIANCE.NS`, `TCS.NS`, `INFY.NS`)

#### Example Request
```bash
curl -s http://localhost:8000/stocks/RELIANCE.NS/history
```

#### Representative Response (`200 OK`)
```json
[
  {
    "price": 1174.6,
    "volume": 100,
    "timestamp": "2026-10-14T15:56:20.084000+00:00"
  },
  {
    "price": 1174.6,
    "volume": 100,
    "timestamp": "2026-10-14T15:56:26.625000+00:00"
  },
  {
    "price": 1174.6,
    "volume": 100,
    "timestamp": "2026-10-14T16:06:16.437000+00:00"
  }
]
```

#### Error Response (`404 Not Found`)
If the requested symbol does not exist or has not accumulated records:
```json
{
  "detail": "No historical records found for symbol NONEXISTENT.NS"
}
```

---

### Interactive Documentation

FastAPI automatically serves interactive API specifications. Once the backend container is running:
- **Swagger UI**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **ReDoc UI**: [http://localhost:8000/redoc](http://localhost:8000/redoc)

---

## Database Schema & Data Pipeline Details

### PostgreSQL Schema Definition

The table `trades` is initialized dynamically upon startup by the consumer service (`consumer/consumer.py`):

```sql
CREATE TABLE IF NOT EXISTS trades (
    redis_id VARCHAR(30) PRIMARY KEY,
    symbol   VARCHAR(10),
    price    DECIMAL(10,2),
    volume   INT
);
```

#### Schema Fields Explained:
- `redis_id` (`VARCHAR(30)`): Primary key formatted as `<timestamp_ms>-<sequence>` (e.g., `1791993976437-0`). Assigned deterministically by Redis when the producer executes `XADD`. Because the prefix is the exact epoch millisecond when Redis buffered the trade, the API parses this string to construct standardized ISO 8601 UTC timestamps without needing an additional timestamp column.
- `symbol` (`VARCHAR(10)`): The equity ticker symbol (e.g., `RELIANCE.NS`, `TCS.NS`).
- `price` (`DECIMAL(10,2)`): Latest recorded price in Indian Rupees (INR) with two decimal precision.
- `volume` (`INT`): Transaction volume associated with the price tick (currently fixed at 100 by the producer).

### TimescaleDB Container Details
The container runs the official image `timescale/timescaledb:latest-pg16`. Data is persisted on the Docker host using the named volume `postgres-data`.

---

## Configuration & Environment Variables

### Docker Network Port Allocations

| Service | Internal Container Port | Host Port | Purpose |
| :--- | :--- | :--- | :--- |
| **stock-redis** | `6379` | `6380` | Redis Streams message broker (mapped to 6380 on host to avoid local Redis conflicts). |
| **stock-timescaledb** | `5432` | `5433` | PostgreSQL/TimescaleDB (mapped to 5433 on host to avoid local PostgreSQL conflicts). |
| **stock-api** | `8000` | `8000` | FastAPI HTTP REST server. |
| **frontend** | `5173` | `5173` | Vite local development server. |

### Environment Variables

Environment variables are passed to the containers in `docker-compose.yml`:

```env
# Database Credentials
POSTGRES_USER=admin
POSTGRES_PASSWORD=qwerty
POSTGRES_DB=postgres

# API Connection Settings (api container)
POSTGRES_HOST=timescaledb
POSTGRES_PORT=5432
```

---

## Known Limitations & Design Disclosures

1. **Static Volume Field**: The ingestion producer (`producer/producer.py`) currently inserts a static volume value of `"100"` for every trade event (`"volume": "100"`). Real-time exchange volume per tick is not currently queried from the Yahoo Finance ticker object.
2. **Polling Frequency vs. Market Updates**: Data is fetched by polling Yahoo Finance (`yfinance.Ticker.fast_info["lastPrice"]`) at a 5-second interval. This service **does not provide exchange-grade, sub-second tick-level market feeds**. Quote updates depend on Yahoo Finance server-side cache refresh rates and whether Indian equity markets (NSE/BSE) are currently open (09:15 to 15:30 IST). Polling every 5 seconds does not guarantee a new market trade price every cycle.
3. **Fixed Asset Portfolio**: The tracked universe is configured in `producer/symbols.py` and consists of 10 equities: `RELIANCE.NS`, `TCS.NS`, `HDFCBANK.NS`, `ICICIBANK.NS`, `INFY.NS`, `BHARTIARTL.NS`, `SBIN.NS`, `LT.NS`, `HINDUNILVR.NS`, and `ITC.NS`.
4. **Session-Level Monitoring**: Toggling the monitor button (star icon) on an asset marks it visually within the current React session state, but does not persist to a backend database or user profile.
5. **Single Consumer**: The consumer service listens to the stream sequentially from an offset (`xread`); consumer group partitioning (`xreadgroup`) is not yet configured.

---

## Future Enhancements

- **Hypertable Optimization**: Convert the `trades` table into a native TimescaleDB hypertable partitioned by time chunks to optimize high-volume queries.
- **WebSocket Streaming**: Introduce a WebSocket endpoint in FastAPI to broadcast trades to the React frontend in real-time without client polling.
- **Consumer Group Scaling**: Transition from single-worker `xread` to Redis consumer groups (`XGROUP`) for horizontal consumer scalability.
- **Dynamic Watchlist Management**: Allow users to search, add, and remove NSE/BSE ticker symbols dynamically through the API.
- **User Authentication**: Implement user registration and JWT authentication for personal portfolio tracking.

---

## Troubleshooting

### 1. Port Conflicts on Windows / macOS
- **Problem**: Error starting containers: `Bind for 0.0.0.0:5433 failed: port is already allocated` or similar for `6380` / `8000`.
- **Solution**: Check if a local PostgreSQL or Redis instance is running locally on your system, or update host ports in `docker-compose.yml` (e.g., change `"5433:5432"` to `"5434:5432"`).

### 2. Frontend Shows "Connection Error: Failed to load market data"
- **Problem**: The React dashboard displays the red connection error card.
- **Solution**:
  1. Confirm the API container is running: `docker compose ps`
  2. Verify that `http://localhost:8000/stocks` returns JSON in your browser or via curl:
     ```bash
     curl http://localhost:8000/stocks
     ```
  3. If newly started, allow 15–20 seconds for the producer and consumer to write initial records to the database.

### 3. Database Initializing or Waiting for Trades
- **Problem**: `/stocks` returns an empty array `[]`.
- **Solution**: The producer may still be performing its first poll loop. Run `docker compose logs -f producer` to confirm trades are being pushed to Redis.

### 4. Docker Desktop WSL 2 Issues (Windows)
- **Problem**: `docker` commands hang or return `error during connect: This error may indicate that the docker daemon is not running.`
- **Solution**:
  1. Open Docker Desktop settings.
  2. Ensure "Use the WSL 2 based engine" is enabled under **General**.
  3. Under **Resources > WSL Integration**, verify that your default WSL distribution is turned on.
  4. Restart Docker Desktop.
