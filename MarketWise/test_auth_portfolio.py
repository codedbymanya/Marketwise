"""
MarketWise Test Runner - Runs the comprehensive authentication, portfolio, watchlist, and alert tests.
"""
from test_comprehensive_suite import run_tests
import sys

if __name__ == "__main__":
    success = run_tests()
    sys.exit(0 if success else 1)
