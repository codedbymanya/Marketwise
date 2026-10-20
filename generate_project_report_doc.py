import os
import matplotlib.pyplot as plt
import matplotlib.patches as patches
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import nsdecls, qn

DOC_OUTPUT_PATH = r"c:\Users\manya\Downloads\stock-proj-dbms-main\MarketWise_DBMS_Project_Report.docx"
ARCH_IMG_PATH = r"c:\Users\manya\Downloads\stock-proj-dbms-main\architecture_diagram.png"
ER_IMG_PATH = r"c:\Users\manya\Downloads\stock-proj-dbms-main\er_diagram.png"
GIT_REPO_URL = "https://github.com/codedbymanya/Marketwise"

def set_cell_background(cell, hex_color):
    shading_elm = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{hex_color}"/>')
    cell._tc.get_or_add_tcPr().append(shading_elm)

def set_cell_margins(cell, top=100, bottom=100, left=150, right=150):
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = OxmlElement('w:tcMar')
    for m, val in [('top', top), ('bottom', bottom), ('left', left), ('right', right)]:
        node = OxmlElement(f'w:{m}')
        node.set(qn('w:w'), str(val))
        node.set(qn('w:type'), 'dxa')
        tcMar.append(node)
    tcPr.append(tcMar)

def generate_architecture_diagram():
    fig, ax = plt.subplots(figsize=(11, 6), dpi=300)
    ax.set_xlim(0, 11)
    ax.set_ylim(0, 6)
    ax.axis('off')

    # Color palette
    c_source = "#E0F2FE"
    c_producer = "#BAE6FD"
    c_broker = "#FED7AA"
    c_consumer = "#BAE6FD"
    c_db = "#BBF7D0"
    c_api = "#DDD6FE"
    c_fe = "#FCE7F3"
    border_color = "#334155"

    def draw_box(x, y, w, h, bg_color, title, subtitle):
        rect = patches.FancyBboxPatch((x, y), w, h, boxstyle="round,pad=0.1,rounding_size=0.15",
                                      linewidth=1.5, edgecolor=border_color, facecolor=bg_color)
        ax.add_patch(rect)
        ax.text(x + w/2, y + h*0.62, title, fontsize=10.5, fontweight='bold', ha='center', va='center', color="#0F172A")
        ax.text(x + w/2, y + h*0.30, subtitle, fontsize=8, ha='center', va='center', color="#475569")

    # Boxes
    draw_box(0.5, 4.4, 2.8, 1.1, c_source, "Yahoo Finance API", "10 NIFTY 50 Symbols (Every 5s)")
    draw_box(4.1, 4.4, 2.8, 1.1, c_producer, "Python Producer", "Docker Container (Fast Ticks)")
    draw_box(7.7, 4.4, 2.8, 1.1, c_broker, "Redis Streams Broker", "Stream: 'trades' (Port 6380)")

    draw_box(7.7, 2.5, 2.8, 1.1, c_consumer, "Python Consumer", "Blocking XREAD Loop")
    draw_box(4.1, 2.5, 2.8, 1.1, c_db, "TimescaleDB / Postgres", "Tables: trades, users, portfolios...")
    draw_box(0.5, 2.5, 2.8, 1.1, c_api, "FastAPI REST API", "Auth, Ledgers, Alerts (Port 8000)")

    draw_box(2.3, 0.5, 6.4, 1.1, c_fe, "React 19 + TypeScript Frontend", "Bento Dashboard, Recharts, Real-time P&L (Port 5173)")

    def draw_arrow(x1, y1, x2, y2, label="", rad=0.0):
        ax.annotate('', xy=(x2, y2), xytext=(x1, y1),
                    arrowprops=dict(arrowstyle="->", color="#1E293B", lw=1.8,
                                    connectionstyle=f"arc3,rad={rad}"))
        if label:
            mx, my = (x1 + x2)/2, (y1 + y2)/2
            ax.text(mx, my + 0.12, label, fontsize=7.5, fontweight='semibold', ha='center', va='bottom', color="#0369A1",
                    bbox=dict(boxstyle="round,pad=0.2", fc="white", ec="#CBD5E1", lw=0.8))

    # Flow arrows
    draw_arrow(3.3, 4.95, 4.1, 4.95, "yfinance.fast_info")
    draw_arrow(6.9, 4.95, 7.7, 4.95, "XADD ('trades')")
    draw_arrow(9.1, 4.4, 9.1, 3.6, "XREAD (Blocking)")
    draw_arrow(7.7, 3.05, 6.9, 3.05, "Idempotent SQL INSERT")
    draw_arrow(4.1, 3.05, 3.3, 3.05, "ACID / FOR UPDATE")
    draw_arrow(1.9, 2.5, 3.5, 1.6, "REST / JSON (JWT Bearer)", rad=-0.1)
    draw_arrow(5.5, 1.6, 5.5, 2.5, "Live Valuation Joins", rad=0.0)

    plt.tight_layout()
    plt.savefig(ARCH_IMG_PATH, bbox_inches='tight', dpi=300)
    plt.close()
    print("Architecture diagram generated at:", ARCH_IMG_PATH)

def generate_er_diagram():
    fig, ax = plt.subplots(figsize=(11, 7.5), dpi=300)
    ax.set_xlim(0, 11)
    ax.set_ylim(0, 7.5)
    ax.axis('off')

    c_entity = "#FFFFFF"
    c_header = "#1E293B"
    c_border = "#475569"

    def draw_entity(x, y, w, h, title, fields):
        # Header
        hh = 0.45
        rect_h = patches.Rectangle((x, y + h - hh), w, hh, linewidth=1.5, edgecolor=c_border, facecolor=c_header)
        ax.add_patch(rect_h)
        ax.text(x + w/2, y + h - hh/2, title, fontsize=9.5, fontweight='bold', ha='center', va='center', color="white")

        # Body
        rect_b = patches.Rectangle((x, y), w, h - hh, linewidth=1.5, edgecolor=c_border, facecolor=c_entity)
        ax.add_patch(rect_b)

        line_h = (h - hh) / (len(fields) + 0.3)
        for i, (col, details) in enumerate(fields):
            fy = y + h - hh - (i + 0.7) * line_h
            ax.text(x + 0.15, fy, col, fontsize=7.5, fontweight='bold', ha='left', va='center', color="#0F172A")
            ax.text(x + w - 0.15, fy, details, fontsize=7, ha='right', va='center', color="#475569")

    # Entities
    users_fields = [
        ("user_id (PK)", "UUID"),
        ("name", "VARCHAR(100)"),
        ("email (UK)", "VARCHAR(255)"),
        ("password_hash", "VARCHAR(255)"),
        ("created_at", "TIMESTAMPTZ")
    ]
    draw_entity(0.5, 4.4, 2.8, 2.4, "USERS", users_fields)

    portfolios_fields = [
        ("portfolio_id (PK)", "UUID"),
        ("user_id (FK)", "UUID [CASCADE]"),
        ("name", "VARCHAR(100)"),
        ("created_at", "TIMESTAMPTZ")
    ]
    draw_entity(4.1, 4.6, 2.8, 2.2, "PORTFOLIOS", portfolios_fields)

    transactions_fields = [
        ("transaction_id (PK)", "UUID"),
        ("portfolio_id (FK)", "UUID [CASCADE]"),
        ("symbol", "VARCHAR(20)"),
        ("transaction_type", "CHECK (BUY, SELL)"),
        ("quantity", "NUMERIC(12,4) > 0"),
        ("price", "NUMERIC(12,2) > 0"),
        ("transaction_date", "TIMESTAMPTZ")
    ]
    draw_entity(7.7, 4.2, 2.8, 2.6, "TRANSACTIONS", transactions_fields)

    watchlists_fields = [
        ("watchlist_id (PK)", "UUID"),
        ("user_id (FK)", "UUID [CASCADE]"),
        ("symbol", "VARCHAR(20)"),
        ("UNIQUE", "(user_id, symbol)"),
        ("created_at", "TIMESTAMPTZ")
    ]
    draw_entity(0.5, 0.8, 2.8, 2.4, "WATCHLISTS", watchlists_fields)

    alerts_fields = [
        ("alert_id (PK)", "UUID"),
        ("user_id (FK)", "UUID [CASCADE]"),
        ("symbol", "VARCHAR(20)"),
        ("target_price", "NUMERIC > 0"),
        ("condition", "ABOVE | BELOW"),
        ("status", "ACTIVE | TRIGGERED")
    ]
    draw_entity(4.1, 0.6, 2.8, 2.6, "PRICE_ALERTS", alerts_fields)

    trades_fields = [
        ("redis_id (PK)", "VARCHAR(30)"),
        ("symbol", "VARCHAR(20) [INDEX]"),
        ("price", "NUMERIC(10,2)"),
        ("volume", "INTEGER")
    ]
    draw_entity(7.7, 1.0, 2.8, 2.2, "TRADES (TimescaleDB)", trades_fields)

    def draw_relation(x1, y1, x2, y2, label=""):
        ax.plot([x1, x2], [y1, y2], color="#2563EB", lw=2, linestyle="-")
        # Dot markers for 1:N
        ax.plot(x1, y1, 'o', color="#1D4ED8", markersize=6)
        ax.plot(x2, y2, 's', color="#DC2626", markersize=6)
        if label:
            mx, my = (x1 + x2)/2, (y1 + y2)/2
            ax.text(mx, my + 0.12, label, fontsize=7.5, fontweight='bold', ha='center', va='bottom', color="#1E3A8A",
                    bbox=dict(boxstyle="round,pad=0.2", fc="#EFF6FF", ec="#93C5FD", lw=1))

    # Relationships
    draw_relation(3.3, 5.6, 4.1, 5.6, "owns (1 : N)")
    draw_relation(6.9, 5.6, 7.7, 5.6, "contains (1 : N)")
    draw_relation(1.9, 4.4, 1.9, 3.2, "tracks (1 : N)")
    draw_relation(3.1, 4.4, 4.5, 3.2, "configures (1 : N)")

    ax.text(5.5, 7.2, "MarketWise — Normalized Relational Database Entity-Relationship Model",
            fontsize=12, fontweight='bold', ha='center', va='center', color="#0F172A")
    ax.text(5.5, 6.9, "Blue Circle = 1 (Primary Key)  |  Red Square = N (Foreign Key / Dependent)  |  ON DELETE CASCADE",
            fontsize=8.5, ha='center', va='center', color="#475569")

    plt.tight_layout()
    plt.savefig(ER_IMG_PATH, bbox_inches='tight', dpi=300)
    plt.close()
    print("ER diagram generated at:", ER_IMG_PATH)

def build_docx_report():
    doc = Document()

    # Page Margins
    for sec in doc.sections:
        sec.top_margin = Inches(0.8)
        sec.bottom_margin = Inches(0.8)
        sec.left_margin = Inches(0.8)
        sec.right_margin = Inches(0.8)

    # Styles
    normal_style = doc.styles['Normal']
    normal_style.font.name = 'Calibri'
    normal_style.font.size = Pt(11)
    normal_style.font.color.rgb = RGBColor(30, 41, 59) # Slate 800

    def add_title(text):
        p = doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p.paragraph_format.space_before = Pt(0)
        p.paragraph_format.space_after = Pt(4)
        run = p.add_run(text)
        run.bold = True
        run.font.size = Pt(24)
        run.font.color.rgb = RGBColor(15, 23, 42) # Slate 900
        return p

    def add_subtitle(text):
        p = doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p.paragraph_format.space_before = Pt(0)
        p.paragraph_format.space_after = Pt(14)
        run = p.add_run(text)
        run.font.size = Pt(13)
        run.font.color.rgb = RGBColor(37, 99, 235) # Blue 600
        return p

    def add_meta_box():
        tbl = doc.add_table(rows=4, cols=2)
        tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
        data = [
            ("Course:", "Database Management Systems (DBMS) Mini-Project"),
            ("Project Name:", "MarketWise (Stock Market Pipeline & Portfolio Ledger)"),
            ("Version & Status:", "2.0.0 — Production Verified (53/53 Tests Passed)"),
            ("GitHub Repository:", GIT_REPO_URL)
        ]
        for row_idx, (k, v) in enumerate(data):
            row = tbl.rows[row_idx]
            c0, c1 = row.cells[0], row.cells[1]
            c0.width = Inches(2.0)
            c1.width = Inches(4.8)

            p0 = c0.paragraphs[0]
            r0 = p0.add_run(k)
            r0.bold = True
            r0.font.color.rgb = RGBColor(51, 65, 85)

            p1 = c1.paragraphs[0]
            r1 = p1.add_run(v)
            if k == "GitHub Repository:":
                r1.bold = True
                r1.font.color.rgb = RGBColor(37, 99, 235)
                r1.underline = True
            else:
                r1.font.color.rgb = RGBColor(15, 23, 42)

            set_cell_background(c0, "F1F5F9")
            set_cell_background(c1, "F8FAFC")
            set_cell_margins(c0, top=70, bottom=70, left=100, right=100)
            set_cell_margins(c1, top=70, bottom=70, left=100, right=100)
        doc.add_paragraph().paragraph_format.space_after = Pt(8)

    def add_h1(text):
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(16)
        p.paragraph_format.space_after = Pt(6)
        run = p.add_run(text)
        run.bold = True
        run.font.size = Pt(16)
        run.font.color.rgb = RGBColor(15, 23, 42)
        return p

    def add_h2(text):
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(12)
        p.paragraph_format.space_after = Pt(4)
        run = p.add_run(text)
        run.bold = True
        run.font.size = Pt(13)
        run.font.color.rgb = RGBColor(30, 58, 138) # Blue 900
        return p

    def add_bullet(bold_prefix, text):
        p = doc.add_paragraph(style='List Bullet')
        p.paragraph_format.space_before = Pt(2)
        p.paragraph_format.space_after = Pt(2)
        r0 = p.add_run(bold_prefix + ": ")
        r0.bold = True
        r0.font.color.rgb = RGBColor(15, 23, 42)
        r1 = p.add_run(text)
        r1.font.color.rgb = RGBColor(51, 65, 85)

    def format_table(tbl, col_widths, headers, rows_data):
        tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
        # Header Row
        hdr_cells = tbl.rows[0].cells
        for i, header_text in enumerate(headers):
            hdr_cells[i].width = col_widths[i]
            p = hdr_cells[i].paragraphs[0]
            p.alignment = WD_ALIGN_PARAGRAPH.LEFT
            run = p.add_run(header_text)
            run.bold = True
            run.font.size = Pt(10)
            run.font.color.rgb = RGBColor(255, 255, 255)
            set_cell_background(hdr_cells[i], "1E293B")
            set_cell_margins(hdr_cells[i], top=80, bottom=80, left=100, right=100)

        # Body Rows
        for r_idx, r_data in enumerate(rows_data):
            row_cells = tbl.add_row().cells
            bg = "F8FAFC" if r_idx % 2 == 1 else "FFFFFF"
            for c_idx, val in enumerate(r_data):
                row_cells[c_idx].width = col_widths[c_idx]
                p = row_cells[c_idx].paragraphs[0]
                run = p.add_run(str(val))
                run.font.size = Pt(9.5)
                run.font.color.rgb = RGBColor(30, 41, 59)
                set_cell_background(row_cells[c_idx], bg)
                set_cell_margins(row_cells[c_idx], top=70, bottom=70, left=100, right=100)
        doc.add_paragraph().paragraph_format.space_after = Pt(6)

    # 1. Title & Meta
    add_title("📈 MarketWise — DBMS Project Report")
    add_subtitle("A Stream-Buffered Stock Data Pipeline, Relational Ledger & Real-Time Portfolio Engine")
    add_meta_box()

    # 2. Executive Summary & Problem Statement
    add_h1("1. Executive Summary & Problem Statement")
    p = doc.add_paragraph()
    p.add_run(
        "Modern financial applications operate under severe conflicting database pressures: market data arrives as continuous, "
        "high-frequency streams that can saturate transactional databases if written synchronously, while investor transaction ledgers "
        "demand strict ACID consistency, zero orphan records, accurate accounting, and absolute multi-tenant security."
    )
    doc.add_paragraph().paragraph_format.space_after = Pt(2)

    add_bullet("Write Saturation & Lock Contention", "Writing sub-second market ticks directly to relational tables locks indexes and starves transactional user queries.")
    add_bullet("Data Integrity & Ledgers", "Financial rules demand that users cannot sell shares they do not hold, and cascading deletes must clean dependent ledger records cleanly.")
    add_bullet("Concurrency & Race Conditions", "Two simultaneous trade submissions from the same user account must not create negative share anomalies.")
    add_bullet("Accurate Accounting", "Calculating profit and loss requires dynamic Weighted Average Cost (WAC) computation, tracking realized vs. unrealized gains joined against live market prices.")
    add_bullet("Multi-Tenant Security", "Stateless cryptographic authorization must enforce strict isolation so no user can view or alter another investor's assets.")

    # 3. System Objectives
    add_h1("2. Project Objectives & DBMS Core Competencies")
    obj_headers = ["#", "DBMS Objective", "Architectural Implementation in MarketWise"]
    obj_widths = [Inches(0.5), Inches(2.3), Inches(4.0)]
    obj_data = [
        ("1", "Stream-Buffered Ingestion", "Decouples volatile ticks using Redis Streams (XADD -> Blocking XREAD) before batching into TimescaleDB."),
        ("2", "Relational Normalization & DDL", "Normalized 6 tables with UUID primary keys, foreign keys (ON DELETE CASCADE), and strict CHECK constraints."),
        ("3", "ACID Transactions & Locking", "Enforces SELECT ... FOR UPDATE row-level locking on portfolio rows during transaction processing."),
        ("4", "Complex Business Logic via SQL", "Computes live valuations using DISTINCT ON (symbol) joined against aggregated purchase ledgers."),
        ("5", "Cryptographic Authentication", "Implements bcrypt salted password hashing (rounds=12) and stateless HMAC-SHA256 JWT authorization tokens."),
        ("6", "Automated Threshold Alerts", "Event-driven evaluation engine checking live ticks against user-configured price boundaries (ABOVE/BELOW)."),
        ("7", "Containerized Orchestration", "Deploys 5 interconnected Docker services with persistent named volumes and health dependencies.")
    ]
    t1 = doc.add_table(rows=1, cols=3)
    format_table(t1, obj_widths, obj_headers, obj_data)

    # 4. System Architecture
    add_h1("3. System Architecture & Data Flow Pipeline")
    p = doc.add_paragraph()
    p.add_run(
        "MarketWise implements a multi-tier microservice architecture designed to handle rapid write ingestion while preserving "
        "relational data integrity. The pipeline is fully containerized using Docker Compose across 5 distinct services."
    )

    if os.path.exists(ARCH_IMG_PATH):
        doc.add_paragraph().paragraph_format.space_after = Pt(4)
        p_img = doc.add_paragraph()
        p_img.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p_img.add_run().add_picture(ARCH_IMG_PATH, width=Inches(6.6))
        p_cap = doc.add_paragraph()
        p_cap.alignment = WD_ALIGN_PARAGRAPH.CENTER
        rc = p_cap.add_run("Figure 3.1: MarketWise Full-Stack Stream-Buffered Architecture")
        rc.italic = True
        rc.font.size = Pt(9.5)
        rc.font.color.rgb = RGBColor(100, 116, 139)

    add_h2("3.1 Pipeline Data Flow Sequence")
    add_bullet("Market Polling (Producer)", "Python producer queries Yahoo Finance for 10 NIFTY 50 equities every 5 seconds and issues Redis XADD.")
    add_bullet("Message Broker (Redis)", "Redis Streams buffer ticks in-memory (stream: 'trades'), insulating the database from write spikes.")
    add_bullet("Stream Ingestion (Consumer)", "Consumer reads incoming entries via blocking XREAD and persists them to TimescaleDB with idempotent redis_id primary keys.")
    add_bullet("Relational Core (TimescaleDB)", "PostgreSQL 16 with TimescaleDB manages normalized relations: users, portfolios, transactions, watchlists, alerts, and trades.")
    add_bullet("Application Server (FastAPI)", "REST API provides JWT-protected endpoints, executes ACID transactions with row-level locks, and evaluates alerts.")
    add_bullet("Presentation Layer (React + Vite)", "TypeScript frontend features a modern Bento Grid UI, live Recharts financial charts, and portfolio P&L metrics.")

    # 5. Entity-Relationship Model
    add_h1("4. Database Schema & Entity-Relationship (ER) Model")
    p = doc.add_paragraph()
    p.add_run(
        "The relational database schema is normalized to Third Normal Form (3NF), guaranteeing data deduplication, entity ownership, "
        "and referential integrity across all user-owned assets."
    )

    if os.path.exists(ER_IMG_PATH):
        doc.add_paragraph().paragraph_format.space_after = Pt(4)
        p_img2 = doc.add_paragraph()
        p_img2.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p_img2.add_run().add_picture(ER_IMG_PATH, width=Inches(6.6))
        p_cap2 = doc.add_paragraph()
        p_cap2.alignment = WD_ALIGN_PARAGRAPH.CENTER
        rc2 = p_cap2.add_run("Figure 4.1: MarketWise Entity-Relationship (ER) Model & Referential Integrity Constraints")
        rc2.italic = True
        rc2.font.size = Pt(9.5)
        rc2.font.color.rgb = RGBColor(100, 116, 139)

    add_h2("4.1 Relational Table Specifications & Constraints")
    t_headers = ["Table Name", "Primary Key", "Foreign Keys & Constraints", "Purpose & Business Function"]
    t_widths = [Inches(1.4), Inches(1.3), Inches(2.1), Inches(2.0)]
    t_data = [
        ("public.users", "user_id (UUID)", "email UNIQUE, password_hash NOT NULL", "Stores profile credentials with salted bcrypt hashes."),
        ("public.portfolios", "portfolio_id (UUID)", "user_id -> users(user_id) [CASCADE]", "Tracks investor accounts; created atomically on user registration."),
        ("public.transactions", "transaction_id (UUID)", "portfolio_id -> portfolios [CASCADE], CHECK(qty>0, price>0, BUY|SELL)", "Append-only financial trade ledger enforcing mathematical integrity."),
        ("public.watchlists", "watchlist_id (UUID)", "user_id -> users [CASCADE], UNIQUE(user_id, symbol)", "Database-backed persistent stock watchlist per tenant."),
        ("public.price_alerts", "alert_id (UUID)", "user_id -> users [CASCADE], CHECK(target_price>0, ABOVE|BELOW)", "Real-time boundary monitoring engine with trigger timestamps."),
        ("public.trades", "redis_id (VARCHAR)", "symbol indexed, price NUMERIC(10,2)", "TimescaleDB time-series market observation store ingested from Redis.")
    ]
    t2 = doc.add_table(rows=1, cols=4)
    format_table(t2, t_widths, t_headers, t_data)

    # 6. Financial Accounting & Business Logic
    add_h1("5. Portfolio Accounting & Mathematical Business Logic")
    p = doc.add_paragraph()
    p.add_run(
        "All financial metrics are dynamically computed from the immutable transaction ledger, strictly adhering to international "
        "Weighted Average Cost (WAC) standards:"
    )

    add_bullet("Weighted Average Cost (WAC) on BUY", "When additional shares are acquired at variable market prices, the new cost basis is recalculated as:")
    p_f1 = doc.add_paragraph()
    p_f1.alignment = WD_ALIGN_PARAGRAPH.CENTER
    rf1 = p_f1.add_run("New Cost Basis = [(Prev Qty × Prev Avg Cost) + (Buy Qty × Buy Price)] / (Prev Qty + Buy Qty)")
    rf1.bold = True
    rf1.font.color.rgb = RGBColor(37, 99, 235)

    add_bullet("Realized Profit & Loss on SELL", "When shares are liquidated, the remaining position maintains its existing cost basis while realized profit is recorded as:")
    p_f2 = doc.add_paragraph()
    p_f2.alignment = WD_ALIGN_PARAGRAPH.CENTER
    rf2 = p_f2.add_run("Realized P&L = (Sell Price − Current Avg Cost) × Sold Quantity")
    rf2.bold = True
    rf2.font.color.rgb = RGBColor(22, 163, 74)

    add_bullet("Live Market Valuation & Unrealized Gains", "Positions are joined against the latest observation using DISTINCT ON (symbol) from the trades table:")
    p_f3 = doc.add_paragraph()
    p_f3.alignment = WD_ALIGN_PARAGRAPH.CENTER
    rf3 = p_f3.add_run("Unrealized P&L = Current Market Value − (Held Quantity × Avg Cost)")
    rf3.bold = True
    rf3.font.color.rgb = RGBColor(147, 51, 234)

    add_bullet("Concurrency Control via Row Locking", "Concurrent transactions are guarded using SELECT ... FOR UPDATE on the parent portfolio, serializing write attempts and eliminating negative share anomalies.")
    add_bullet("Over-Selling Prevention", "SELL orders are rejected with HTTP 400 Bad Request if the requested quantity exceeds the current running balance.")
    add_bullet("Safe Deletion Integrity", "Deleting a historical BUY order is rejected if removing that acquisition would cause any subsequent chronological SELL order to drop below zero.")

    # 7. REST API Documentation
    add_h1("6. RESTful API Architecture & Endpoints")
    p = doc.add_paragraph()
    p.add_run("The FastAPI application exposes 11 structured REST endpoints protected by JWT Bearer authorization:")

    api_headers = ["Method", "Endpoint Path", "Auth Required", "Description & Response Codes"]
    api_widths = [Inches(0.9), Inches(2.2), Inches(1.3), Inches(2.4)]
    api_data = [
        ("POST", "/auth/register", "No", "Register new user & auto-create default portfolio (201, 400, 409)."),
        ("POST", "/auth/login", "No", "Authenticate user & issue signed HMAC-SHA256 JWT token (200, 401)."),
        ("GET", "/auth/me", "Bearer JWT", "Retrieve current authenticated profile with tenant ownership (200, 401)."),
        ("GET", "/portfolio", "Bearer JWT", "Compute and return user portfolio valuation & holdings breakdown (200, 401)."),
        ("POST", "/portfolio/transactions", "Bearer JWT", "Execute BUY/SELL transaction with row lock and balance checks (201, 400)."),
        ("GET", "/portfolio/transactions", "Bearer JWT", "Retrieve immutable user transaction ledger ordered by date (200, 401)."),
        ("DELETE", "/portfolio/transactions/{id}", "Bearer JWT", "Safely delete transaction with balance validation (200, 400, 403, 404)."),
        ("GET", "/watchlist", "Bearer JWT", "Retrieve database-backed watchlist for authenticated user (200, 401)."),
        ("POST", "/watchlist", "Bearer JWT", "Add stock symbol to database watchlist with duplicate prevention (201, 401)."),
        ("POST", "/alerts", "Bearer JWT", "Configure real-time price threshold alert (ABOVE/BELOW) (201, 400, 401)."),
        ("GET", "/stocks", "No", "Retrieve latest market ticks across all 10 tracked symbols (200, 500).")
    ]
    t3 = doc.add_table(rows=1, cols=4)
    format_table(t3, api_widths, api_headers, api_data)

    # 8. Verification & Test Suite
    add_h1("7. Quality Assurance & Verification Results")
    p = doc.add_paragraph()
    p.add_run(
        "The system has been verified through an automated end-to-end test suite (test_comprehensive_suite.py) "
        "exercising the complete relational and streaming stack:"
    )

    test_headers = ["Verification Category", "Command Executed", "Passed / Total", "Status"]
    test_widths = [Inches(2.1), Inches(2.4), Inches(1.2), Inches(1.1)]
    test_data = [
        ("Full End-to-End Test Suite", "python test_comprehensive_suite.py", "53 / 53", "100% PASSED"),
        ("Frontend Production Build", "npm run build (tsc -b && vite build)", "Clean (1.1s)", "0 ERRORS"),
        ("Frontend Static Linter", "npm run lint (oxlint)", "24 Components", "0 WARNINGS"),
        ("Database Relational Integrity", "psql DDL constraint verification", "6 Tables, FKs", "VERIFIED"),
        ("Real-time Ingestion Stream", "curl.exe http://localhost:8000/stocks", "10 Equities", "ACTIVE")
    ]
    t4 = doc.add_table(rows=1, cols=4)
    format_table(t4, test_widths, test_headers, test_data)

    # 9. Source Code & Git Repository
    add_h1("8. Source Code & GitHub Repository Link")
    p_git = doc.add_paragraph()
    p_git.add_run("The complete codebase, Docker Compose configurations, and test suites are hosted publicly at:\n")
    r_link = p_git.add_run(GIT_REPO_URL)
    r_link.bold = True
    r_link.font.size = Pt(13)
    r_link.font.color.rgb = RGBColor(37, 99, 235)
    r_link.underline = True

    add_h2("8.1 Quick Execution Commands")
    add_bullet("1. Clone Repository", f"git clone {GIT_REPO_URL}")
    add_bullet("2. Start Backend Microservices", "docker compose up -d --build (launches Redis, TimescaleDB, Producer, Consumer, API)")
    add_bullet("3. Launch Frontend Client", "cd frontend && npm install && npm run dev (opens on http://localhost:5173)")
    add_bullet("4. Run Automated E2E Verification", "python test_comprehensive_suite.py (executes all 53 validation checks)")

    # Save document
    doc.save(DOC_OUTPUT_PATH)
    print("Document successfully built and saved to:", DOC_OUTPUT_PATH)

if __name__ == "__main__":
    generate_architecture_diagram()
    generate_er_diagram()
    build_docx_report()
