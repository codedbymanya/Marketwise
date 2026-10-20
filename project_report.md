# 📈 MarketWise — DBMS Project Report
**Course:** Database Management Systems (DBMS) Mini-Project  
**Project Name:** MarketWise (Stream-Buffered Stock Pipeline & Portfolio Ledger)  
**Version:** 2.0.0  
**GitHub Repository:** [https://github.com/codedbymanya/Marketwise](https://github.com/codedbymanya/Marketwise)  
**Generated Word Document:** [MarketWise_DBMS_Project_Report.docx](file:///c:/Users/manya/Downloads/stock-proj-dbms-main/MarketWise_DBMS_Project_Report.docx)  

---

## 1. Problem Statement

Financial markets generate continuous, high-frequency data streams — prices, volumes, and trades — at a rate that can overwhelm traditional transactional databases if ingested synchronously. Simultaneously, investors need a reliable, consistent platform to track their personal portfolios, record buy/sell decisions, and measure performance in real time against live market prices.

The core challenges addressed by this project are:

1. **Write Saturation**: High-frequency market tick data written directly to a relational DB causes lock contention and write starvation under load.
2. **Data Integrity**: Financial ledgers demand strict transactional guarantees — a user must never be allowed to sell more shares than they hold, and partial failures must be rolled back atomically.
3. **Consistency & Isolation**: In a multi-user system, two concurrent requests from the same user must not produce race conditions (e.g., double-selling the same shares).
4. **Accurate Financial Accounting**: Computing portfolio performance requires calculating weighted average cost (WAC) across variable buy prices over time, tracking realized vs. unrealized P&L, and keeping figures in sync with live market prices.
5. **Secure Multi-Tenancy**: User data — portfolio holdings and transactions — must be strictly isolated so that one user can never access another's data.

---

## 2. Objectives

The project targets the following learning and engineering objectives:

| # | Objective | Demonstrated In |
|---|---|---|
| 1 | **Stream-Buffered Ingestion**: Decouple high-frequency writes using an in-memory message broker to prevent database overload | Redis Streams → Consumer → PostgreSQL pipeline |
| 2 | **Relational Schema Design**: Normalize data across entities (`users`, `portfolios`, `transactions`, `trades`) with proper primary keys, foreign keys, and check constraints | `db/init.sql`, `api/main.py:init_db()` |
| 3 | **Referential Integrity**: Enforce cascading deletes and constraint violations at the database level | `ON DELETE CASCADE` on `portfolios → users` and `transactions → portfolios` |
| 4 | **ACID Transactions & Concurrency Control**: Use row-level locking to safely handle concurrent writes and prevent negative balance anomalies | `SELECT ... FOR UPDATE` in `/portfolio/transactions` |
| 5 | **Complex Business Logic via SQL**: Compute real-time portfolio valuation using `DISTINCT ON`, aggregation, and WAC accounting entirely through SQL + application logic | `GET /portfolio` endpoint |
| 6 | **Secure Authentication**: Implement user registration and login with industry-standard password hashing and stateless authorization tokens | bcrypt + JWT HS256 |
| 7 | **RESTful API Design**: Expose all database interactions through a well-structured REST API with proper status codes, input validation, and error handling | FastAPI `api/main.py` |
| 8 | **Containerized Deployment**: Orchestrate all services using Docker Compose for reproducible local development | `docker-compose.yml` |

---

## 3. Technology Stack

### 3.1 Backend & Data Pipeline

| Layer | Technology | Version |
|---|---|---|
| REST API Framework | **FastAPI** (Python) | Latest |
| ASGI Server | **Uvicorn** | Latest |
| Message Broker | **Redis Streams** | 7 (Alpine) |
| Primary Database | **TimescaleDB** (PostgreSQL 16) | `latest-pg16` |
| PostgreSQL Driver | **psycopg2-binary** | Latest |
| Market Data Feed | **yfinance** (Yahoo Finance) | Latest |
| Password Hashing | **bcrypt** | rounds=12 |
| Authorization | **PyJWT** (HS256) | Latest |
| Request Validation | **Pydantic v2** | Latest |

### 3.2 Frontend

| Layer | Technology | Version |
|---|---|---|
| UI Framework | **React** | ^19.2.8 |
| Language | **TypeScript** | ~6.0.2 |
| Build Tool / Dev Server | **Vite** | ^8.3.0 |
| Charting Library | **Recharts** | ^3.10.1 |
| Icon Library | **Lucide React** | ^1.52.0 |
| Linter | **Oxlint** | ^1.81.0 |

### 3.3 Infrastructure & DevOps

| Layer | Technology |
|---|---|
| Containerization | **Docker** + **Docker Compose** |
| Data Persistence | Docker Named Volume (`postgres-data`) |
| Environment Config | `.env` file + Docker Compose `environment` |

```

![MarketWise Architecture Diagram](file:///c:/Users/manya/Downloads/stock-proj-dbms-main/architecture_diagram.png)

---

## 4. Why This Technology Stack?

### 🔴 Redis Streams — *as the Message Broker*
> **Why not write directly to PostgreSQL from the producer?**

Market ticks arrive every 5 seconds across 10 symbols simultaneously. Direct synchronous writes would create sequential lock contention on the `trades` table. Redis Streams act as a **durable, ordered, in-memory queue** — the producer appends ticks instantly via `XADD`, and the consumer drains them at its own pace via blocking `XREAD`. This decoupling prevents write starvation and gives the system natural backpressure handling. Redis's persistence and stream ID system also provides **idempotent replay** — if the consumer crashes and restarts, it resumes from the last processed ID.

### 🐘 TimescaleDB / PostgreSQL 16 — *as the Relational Store*
> **Why not a pure NoSQL database like MongoDB or Cassandra?**

StockSense's data has strong relational requirements: users *own* portfolios, portfolios *contain* transactions, and financial correctness demands foreign key constraints, check constraints (`BUY/SELL`, `quantity > 0`), and ACID-compliant multi-statement transactions. **TimescaleDB** is chosen over plain PostgreSQL because it is purpose-built for time-series financial data — it offers hypertable partitioning and efficient time-range queries while being 100% PostgreSQL-compatible, requiring no application code changes.

### ⚡ FastAPI (Python) — *as the REST API Layer*
> **Why not Flask, Django, or Express?**

FastAPI provides **automatic OpenAPI/Swagger documentation** (accessible at `/docs`), native **async support** via ASGI, and **Pydantic-based validation** out of the box — all with near-zero boilerplate. For a data-heavy project that requires quick API prototyping and self-documenting endpoints, FastAPI is the most productive choice. It also shares the Python ecosystem with `yfinance`, `psycopg2`, and `bcrypt`, keeping the entire backend in one language.

### ⚛️ React + TypeScript (Vite) — *as the Frontend*
> **Why TypeScript over plain JavaScript?**

The frontend consumes multiple complex API response shapes (portfolio summaries, holdings arrays, transaction ledgers). TypeScript's **static typing catches contract mismatches at compile time**, preventing runtime errors when the API response shape changes. React's component model maps naturally to the domain (one component per data entity: `StockCard`, `PortfolioView`, `AuthModal`). Vite is chosen for its **sub-second HMR and build speeds** compared to Create React App.

### 🔐 bcrypt + JWT — *for Authentication*
> **Why bcrypt over MD5/SHA?**

bcrypt is specifically designed to be computationally slow (cost factor = 12), making brute-force and rainbow table attacks impractical. **Plaintext passwords are never stored** — only the salted hash. JWT (HS256) enables **stateless, scalable authorization** — the server does not need to maintain a session store, and each token carries the user identity needed for multi-tenant isolation. Tokens expire after 24 hours, limiting the blast radius of a leaked token.

### 🐳 Docker Compose — *for Orchestration*
> **Why containerize rather than install locally?**

Docker Compose provides **reproducible, one-command setup** (`docker compose up -d --build`) regardless of the host OS. Each service (Redis, TimescaleDB, Producer, Consumer, API) runs in an isolated container with declared dependencies (`depends_on`), named volumes for data persistence, and environment-variable-based configuration — matching how real production microservices are deployed.

---

## 5. Entity-Relationship (ER) Model & Database Schema

The database follows a normalized relational model (3NF) ensuring ACID transactional guarantees, cascading deletes (`ON DELETE CASCADE`), and check constraints.

![MarketWise ER Diagram](file:///c:/Users/manya/Downloads/stock-proj-dbms-main/er_diagram.png)

### Table Specifications:
1. **`users`**: `user_id` (PK UUID), `name`, `email` (UK), `password_hash` (bcrypt), `created_at`.
2. **`portfolios`**: `portfolio_id` (PK UUID), `user_id` (FK `users` ON DELETE CASCADE), `name`, `created_at`.
3. **`transactions`**: `transaction_id` (PK UUID), `portfolio_id` (FK `portfolios` ON DELETE CASCADE), `symbol`, `transaction_type` (`BUY`/`SELL`), `quantity` (> 0), `price` (> 0), `transaction_date`.
4. **`watchlists`**: `watchlist_id` (PK UUID), `user_id` (FK `users` ON DELETE CASCADE), `symbol`, `UNIQUE(user_id, symbol)`.
5. **`price_alerts`**: `alert_id` (PK UUID), `user_id` (FK `users` ON DELETE CASCADE), `symbol`, `target_price`, `condition` (`ABOVE`/`BELOW`), `status` (`ACTIVE`/`TRIGGERED`).
6. **`trades`**: `redis_id` (PK), `symbol` (Indexed), `price`, `volume`.

---

## 6. Features

### 5.1 Real-Time Market Data Feed
- **Live price ingestion** from Yahoo Finance for **10 NIFTY 50 stocks** (RELIANCE.NS, TCS.NS, HDFCBANK.NS, ICICIBANK.NS, INFY.NS, BHARTIARTL.NS, SBIN.NS, LT.NS, HINDUNILVR.NS, ITC.NS)
- Data is polled every **5 seconds** and streamed through Redis into TimescaleDB
- **Market Dashboard** displays live prices, percentage changes, and price history charts

### 5.2 Historical Price Charts
- Per-symbol **line chart** of up to 100 latest price observations
- Built with **Recharts** for smooth, interactive visualization
- Timestamps parsed from Redis stream IDs for accurate time-axis plotting

### 5.3 Stock Watchlist & Waitlist
- Users can **add stocks to a personal Watchlist** for quick monitoring
- **Waitlist** feature acts as a buy queue — stocks staged for future purchase
- State persisted in browser `localStorage` (no login required)

### 5.4 User Authentication (Register / Login)
- **Secure registration** with name, email, and password (min 6 chars)
- Duplicate email detection with HTTP 409 Conflict
- **bcrypt password hashing** (cost factor 12) — plaintext never stored
- **JWT token issuance** on login (HS256, 24-hour expiry)
- `AuthModal` component with seamless Login ↔ Register tab switching

### 5.5 Automatic Portfolio Creation
- On registration, a **default "My Portfolio"** is atomically created in the same DB transaction — the user is always portfolio-ready from first login

### 5.6 Portfolio Management
- **Record BUY and SELL transactions** with symbol, quantity, price, and optional custom date
- **Over-sell protection**: SELL is rejected (HTTP 400) if quantity exceeds available balance
- **Safe transaction deletion**: Deleting a BUY is blocked if it would make a subsequent SELL mathematically invalid (i.e., would cause running balance to go negative)
- Full **transaction history** sorted by date, viewable in a ledger table

### 5.7 Weighted Average Cost (WAC) Portfolio Accounting
- Holdings computed dynamically from the full transaction ledger:
  - **Average Buy Price** updated on each BUY using the WAC formula
  - **Realized P&L** calculated per SELL: `(sell_price − avg_cost) × qty`
  - **Unrealized P&L** calculated as `current_market_value − invested_cost` joined against live `trades` data
  - **Return %** computed for each holding and portfolio total

### 5.8 Live Portfolio Valuation Dashboard
- **Total Portfolio Value** — sum of all holdings at current market prices
- **Total Invested** — sum of all BUY cost basis
- **Total Unrealized P&L** and **% Return**
- **Total Realized P&L** — aggregate profit/loss from completed sales
- Per-holding breakdown table with symbol, qty, avg cost, current price, and P&L columns

### 5.9 Concurrency Control
- **Row-level locking** (`SELECT ... FOR UPDATE`) on the portfolio record during transaction creation
- Prevents race conditions in concurrent BUY/SELL requests from the same user

### 5.10 Technical Insights Panel
- **StockAnalysis** component providing insights and market context per selected stock

### 5.11 Containerized Full-Stack Deployment
- **Single command** brings up all 5 services: Redis, TimescaleDB, Producer, Consumer, API
- Named Docker volume ensures **data persists across container restarts**
- Swagger UI available at `http://localhost:8000/docs` for live API exploration

---

## 6. Summary Table

| Category | Detail |
|---|---|
| **Domain** | Financial Markets / Portfolio Management |
| **Architecture** | Event-driven microservices (Redis Streams pipeline) |
| **Data Model** | Relational (6 tables: users, portfolios, transactions, watchlists, alerts, trades) |
| **API** | REST (11 endpoints, JWT-protected) |
| **Auth** | bcrypt (cost=12) + HS256 JWT |
| **Business Logic** | WAC accounting, real-time P&L, concurrency-safe transactions (`FOR UPDATE`) |
| **Frontend** | React 19 + TypeScript 6 + Vite 8 + Recharts |
| **Infrastructure** | Docker Compose (5 services) |
| **Test Coverage** | 53/53 E2E tests passing (`test_comprehensive_suite.py`) |
| **GitHub Repo** | [https://github.com/codedbymanya/Marketwise](https://github.com/codedbymanya/Marketwise) |
| **Word Document** | [MarketWise_DBMS_Project_Report.docx](file:///c:/Users/manya/Downloads/stock-proj-dbms-main/MarketWise_DBMS_Project_Report.docx) |

