#!/usr/bin/env python3
"""
MarketWise Comprehensive Verification Test Suite
Tests:
1. Public stock endpoints
2. Authentication security (registration, duplicate rejection, login, token expiry, tampered tokens)
3. Unauthenticated rejection (401) on all protected endpoints
4. Portfolio accounting, WAC, realized P&L, oversell prevention, dependent deletion protection
5. Cross-user isolation (tampering with transaction IDs returns 403)
6. Database-backed watchlist persistence, isolation, add, delete, check, and sync
7. Price alert creation, threshold evaluation (ABOVE/BELOW), single-trigger idempotency, disable, delete, and isolation
"""

import urllib.request
import urllib.error
import json
import base64
import hmac
import hashlib
import time
import uuid
import sys

BASE_URL = "http://localhost:8000"
JWT_SECRET = "marketwise_jwt_secret_dev_key_change_in_prod_9918"

def make_request(method, path, body=None, token=None):
    url = f"{BASE_URL}{path}"
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    
    data = json.dumps(body).encode("utf-8") if body is not None else None
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    
    try:
        with urllib.request.urlopen(req) as resp:
            content = resp.read().decode("utf-8")
            return resp.status, json.loads(content) if content else {}
    except urllib.error.HTTPError as e:
        content = e.read().decode("utf-8")
        try:
            err_json = json.loads(content)
        except Exception:
            err_json = {"detail": content}
        return e.code, err_json
    except Exception as e:
        return 500, {"detail": str(e)}

def b64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b'=').decode('ascii')

def create_manual_jwt(payload: dict, secret: str = JWT_SECRET) -> str:
    header = {"alg": "HS256", "typ": "JWT"}
    h_b64 = b64url(json.dumps(header).encode('utf-8'))
    p_b64 = b64url(json.dumps(payload).encode('utf-8'))
    signing_input = f"{h_b64}.{p_b64}".encode('utf-8')
    sig = hmac.new(secret.encode('utf-8'), signing_input, hashlib.sha256).digest()
    sig_b64 = b64url(sig)
    return f"{h_b64}.{p_b64}.{sig_b64}"

def run_tests():
    passed = 0
    failed = 0

    def assert_eq(test_name, actual, expected):
        nonlocal passed, failed
        if actual == expected:
            print(f"  [PASS] {test_name}")
            passed += 1
        else:
            print(f"  [FAIL] {test_name} - Expected: {expected}, Got: {actual}")
            failed += 1

    print("\n--- 1. Testing Public Market Data Endpoints ---")
    st, stocks = make_request("GET", "/stocks")
    assert_eq("GET /stocks returns 200", st, 200)
    assert_eq("GET /stocks returns at least 1 stock", len(stocks) > 0, True)

    first_symbol = stocks[0]["symbol"] if stocks else "RELIANCE.NS"
    st, hist = make_request("GET", f"/stocks/{first_symbol}/history")
    assert_eq(f"GET /stocks/{first_symbol}/history returns 200", st, 200)

    print("\n--- 2. Testing Authentication & Security ---")
    uid_suffix = uuid.uuid4().hex[:6]
    email1 = f"trader1_{uid_suffix}@example.com"
    email2 = f"trader2_{uid_suffix}@example.com"
    password = "SecretPassword123"

    # Register User 1
    st, reg1 = make_request("POST", "/auth/register", {"name": "Alice Trader", "email": email1, "password": password})
    assert_eq("Register User 1 returns 201", st, 201)
    token1 = reg1.get("access_token")
    user1_id = reg1.get("user", {}).get("user_id")

    # Duplicate email registration
    st, _ = make_request("POST", "/auth/register", {"name": "Alice Dup", "email": email1, "password": password})
    assert_eq("Duplicate email returns 409 Conflict", st, 409)

    # Invalid login
    st, _ = make_request("POST", "/auth/login", {"email": email1, "password": "WrongPassword"})
    assert_eq("Invalid password returns 401 Unauthorized", st, 401)

    # Register User 2
    st, reg2 = make_request("POST", "/auth/register", {"name": "Bob Investor", "email": email2, "password": password})
    assert_eq("Register User 2 returns 201", st, 201)
    token2 = reg2.get("access_token")
    user2_id = reg2.get("user", {}).get("user_id")

    # Unauthenticated requests to protected endpoints
    for ep in ["/portfolio", "/portfolio/transactions", "/watchlist", "/alerts"]:
        st, _ = make_request("GET", ep)
        assert_eq(f"Unauthenticated GET {ep} returns 401", st, 401)

    # Tampered JWT
    tampered_token = token1[:-5] + "XXXXX"
    st, _ = make_request("GET", "/portfolio", token=tampered_token)
    assert_eq("Tampered token returns 401", st, 401)

    # Expired JWT
    expired_payload = {
        "sub": user1_id,
        "name": "Alice Trader",
        "email": email1,
        "exp": int(time.time()) - 3600  # 1 hour in the past
    }
    expired_token = create_manual_jwt(expired_payload)
    st, _ = make_request("GET", "/portfolio", token=expired_token)
    assert_eq("Expired token returns 401", st, 401)

    print("\n--- 3. Testing Portfolio & Multi-Tenant Transaction Isolation ---")
    # User 1 records BUY
    st, buy_tx = make_request("POST", "/portfolio/transactions", {
        "symbol": "RELIANCE.NS",
        "transaction_type": "BUY",
        "quantity": 10.0,
        "price": 1000.0
    }, token=token1)
    assert_eq("User 1 BUY transaction returns 201", st, 201)
    tx1_id = buy_tx.get("transaction_id")

    # User 1 portfolio
    st, port1 = make_request("GET", "/portfolio", token=token1)
    assert_eq("User 1 GET /portfolio returns 200", st, 200)
    assert_eq("User 1 holdings count is 1", port1.get("portfolio", {}).get("holdings_count"), 1)

    # Oversell prevention: User 1 attempts to sell 20 shares (only holds 10)
    st, oversell_err = make_request("POST", "/portfolio/transactions", {
        "symbol": "RELIANCE.NS",
        "transaction_type": "SELL",
        "quantity": 20.0,
        "price": 1100.0
    }, token=token1)
    assert_eq("Oversell returns 400 Bad Request", st, 400)

    # User 1 sells 5 shares
    st, sell_tx = make_request("POST", "/portfolio/transactions", {
        "symbol": "RELIANCE.NS",
        "transaction_type": "SELL",
        "quantity": 5.0,
        "price": 1200.0
    }, token=token1)
    assert_eq("User 1 valid SELL returns 201", st, 201)
    # Realized P&L should be (1200 - 1000) * 5 = 1000.0
    st, port1_updated = make_request("GET", "/portfolio", token=token1)
    assert_eq("User 1 realized P&L is 1000.0", port1_updated.get("portfolio", {}).get("total_realized_pnl"), 1000.0)

    # Multi-tenant isolation: User 2 attempts to delete User 1's transaction
    st, _ = make_request("DELETE", f"/portfolio/transactions/{tx1_id}", token=token2)
    assert_eq("User 2 deleting User 1's transaction returns 403 Forbidden", st, 403)

    # Non-existent transaction ID
    fake_uuid = str(uuid.uuid4())
    st, _ = make_request("DELETE", f"/portfolio/transactions/{fake_uuid}", token=token1)
    assert_eq("Deleting non-existent transaction returns 404 Not Found", st, 404)

    # Invalid UUID format handled cleanly (returns 400 instead of 500)
    st, _ = make_request("DELETE", "/portfolio/transactions/not-a-valid-uuid", token=token1)
    assert_eq("Invalid UUID parameter returns 400 Bad Request", st, 400)

    # Dependent delete blocking: Attempting to delete BUY tx1 while SELL depends on it
    st, dep_del = make_request("DELETE", f"/portfolio/transactions/{tx1_id}", token=token1)
    assert_eq("Deleting dependent BUY transaction returns 400", st, 400)

    print("\n--- 4. Testing Watchlist Persistence & Multi-Tenant Isolation ---")
    # User 1 adds TCS.NS to watchlist
    st, w_res = make_request("POST", "/watchlist", {"symbol": "TCS.NS"}, token=token1)
    assert_eq("User 1 adds TCS.NS to watchlist returns 201", st, 201)

    # Adding duplicate handles cleanly without crash
    st, w_dup = make_request("POST", "/watchlist", {"symbol": "TCS.NS"}, token=token1)
    assert_eq("User 1 duplicate watchlist entry handled cleanly (201)", st, 201)

    # User 1 syncs bulk symbols (migration test)
    st, sync_res = make_request("POST", "/watchlist/sync", {"symbols": ["INFY.NS", "RELIANCE.NS", "TCS.NS"]}, token=token1)
    assert_eq("Watchlist sync returns 200", st, 200)
    assert_eq("Synced symbols list contains at least 3 items", len(sync_res.get("symbols", [])) >= 3, True)

    # User 1 retrieves watchlist
    st, u1_watch = make_request("GET", "/watchlist", token=token1)
    assert_eq("User 1 GET /watchlist returns 200", st, 200)
    u1_symbols = [item["symbol"] for item in u1_watch]
    assert_eq("User 1 watchlist contains INFY.NS", "INFY.NS" in u1_symbols, True)

    # User 2 retrieves watchlist -> must be completely isolated (empty)
    st, u2_watch = make_request("GET", "/watchlist", token=token2)
    assert_eq("User 2 GET /watchlist returns 200", st, 200)
    assert_eq("User 2 watchlist is isolated and empty", len(u2_watch), 0)

    # Check endpoint
    st, check_res = make_request("GET", "/watchlist/INFY.NS/check", token=token1)
    assert_eq("User 1 /watchlist/INFY.NS/check returns true", check_res.get("is_in_watchlist"), True)

    st, check_res2 = make_request("GET", "/watchlist/INFY.NS/check", token=token2)
    assert_eq("User 2 /watchlist/INFY.NS/check returns false", check_res2.get("is_in_watchlist"), False)

    # Remove from watchlist
    st, del_watch = make_request("DELETE", "/watchlist/INFY.NS", token=token1)
    assert_eq("User 1 removes INFY.NS from watchlist returns 200", st, 200)

    st, check_res3 = make_request("GET", "/watchlist/INFY.NS/check", token=token1)
    assert_eq("User 1 /watchlist/INFY.NS/check now returns false", check_res3.get("is_in_watchlist"), False)

    print("\n--- 5. Testing Price Alerts & Trigger Behavior ---")
    # Active Alert (target price far away so it stays ACTIVE)
    st, alert_active = make_request("POST", "/alerts", {
        "symbol": "RELIANCE.NS",
        "target_price": 999999.0,
        "condition": "ABOVE"
    }, token=token1)
    assert_eq("Create ACTIVE alert returns 201", st, 201)
    assert_eq("Alert status is ACTIVE", alert_active.get("status"), "ACTIVE")
    active_alert_id = alert_active.get("alert_id")

    # Immediately Triggered ABOVE Alert (target price 10.0, current price > 1000)
    st, alert_trig_above = make_request("POST", "/alerts", {
        "symbol": "RELIANCE.NS",
        "target_price": 10.0,
        "condition": "ABOVE"
    }, token=token1)
    assert_eq("Create ABOVE alert threshold met returns 201", st, 201)
    assert_eq("ABOVE alert triggered immediately", alert_trig_above.get("status"), "TRIGGERED")
    assert_eq("ABOVE alert has triggered_price", alert_trig_above.get("triggered_price") is not None, True)
    assert_eq("ABOVE alert has triggered_at timestamp", alert_trig_above.get("triggered_at") is not None, True)
    trig_above_id = alert_trig_above.get("alert_id")
    orig_trig_at = alert_trig_above.get("triggered_at")

    # Immediately Triggered BELOW Alert (target price 50000.0, current price < 50000)
    st, alert_trig_below = make_request("POST", "/alerts", {
        "symbol": "TCS.NS",
        "target_price": 50000.0,
        "condition": "BELOW"
    }, token=token1)
    assert_eq("Create BELOW alert threshold met returns 201", st, 201)
    assert_eq("BELOW alert triggered immediately", alert_trig_below.get("status"), "TRIGGERED")

    # Fetch alerts for User 1
    st, u1_alerts = make_request("GET", "/alerts", token=token1)
    assert_eq("GET /alerts returns 200", st, 200)
    assert_eq("User 1 has 3 alerts", len(u1_alerts), 3)

    # Multi-tenant Alert Isolation: User 2 tries to view User 1's alert
    st, _ = make_request("GET", f"/alerts/{active_alert_id}", token=token2)
    assert_eq("User 2 viewing User 1's alert returns 403 Forbidden", st, 403)

    # User 2 tries to delete User 1's alert
    st, _ = make_request("DELETE", f"/alerts/{active_alert_id}", token=token2)
    assert_eq("User 2 deleting User 1's alert returns 403 Forbidden", st, 403)

    # Alert idempotency / single-trigger verification:
    # Query again and verify that triggered alert timestamp and price did not mutate
    st, alert_recheck = make_request("GET", f"/alerts/{trig_above_id}", token=token1)
    assert_eq("Recheck alert returns 200", st, 200)
    assert_eq("Recheck alert still TRIGGERED", alert_recheck.get("status"), "TRIGGERED")
    assert_eq("Trigger timestamp remains unchanged", alert_recheck.get("triggered_at"), orig_trig_at)

    # Disable Active Alert
    st, dis_res = make_request("PATCH", f"/alerts/{active_alert_id}/disable", token=token1)
    assert_eq("Disable alert returns 200", st, 200)
    assert_eq("Alert status changed to DISABLED", dis_res.get("status"), "DISABLED")

    # Delete Alert
    st, del_res = make_request("DELETE", f"/alerts/{active_alert_id}", token=token1)
    assert_eq("Delete alert returns 200", st, 200)

    # Summary
    print("\n==========================================")
    print(f"Test Suite Summary: {passed} PASSED, {failed} FAILED")
    print("==========================================")
    return failed == 0

if __name__ == "__main__":
    success = run_tests()
    sys.exit(0 if success else 1)
