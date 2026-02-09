#!/bin/bash

##############################################################################
# Cloudflare Setup Verification Script
#
# This script validates that all Cloudflare infrastructure setup steps
# from docs/CLOUDFLARE_SETUP.md have been completed successfully.
#
# Usage:
#   ./scripts/verify-cloudflare-setup.sh [--env dev|prod|all]
#
# Options:
#   --env dev    Verify development environment only
#   --env prod   Verify production environment only
#   --env all    Verify both environments (default)
##############################################################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counters
PASSED=0
FAILED=0
WARNINGS=0

# Environment to check (default: all)
ENV_TO_CHECK="all"

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --env)
            ENV_TO_CHECK="$2"
            shift 2
            ;;
        *)
            echo "Unknown option: $1"
            echo "Usage: $0 [--env dev|prod|all]"
            exit 1
            ;;
    esac
done

# Validate env argument
if [[ "$ENV_TO_CHECK" != "dev" && "$ENV_TO_CHECK" != "prod" && "$ENV_TO_CHECK" != "all" ]]; then
    echo "Invalid environment: $ENV_TO_CHECK"
    echo "Must be one of: dev, prod, all"
    exit 1
fi

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  Cloudflare Setup Verification"
echo "  Environment: $ENV_TO_CHECK"
echo "═══════════════════════════════════════════════════════════"
echo ""

##############################################################################
# Helper Functions
##############################################################################

check_pass() {
    echo -e "${GREEN}✓${NC} $1"
    ((PASSED++))
}

check_fail() {
    echo -e "${RED}✗${NC} $1"
    ((FAILED++))
}

check_warn() {
    echo -e "${YELLOW}⚠${NC} $1"
    ((WARNINGS++))
}

section_header() {
    echo ""
    echo -e "${BLUE}$1${NC}"
    echo "───────────────────────────────────────────────────────────"
}

##############################################################################
# Verification Checks
##############################################################################

section_header "1. Wrangler CLI"

# Check if wrangler is installed
if command -v wrangler &> /dev/null; then
    WRANGLER_VERSION=$(wrangler --version 2>&1 | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1)
    check_pass "Wrangler CLI installed (v$WRANGLER_VERSION)"
else
    check_fail "Wrangler CLI not installed (run: npm install -g wrangler)"
    echo ""
    echo "Cannot proceed without Wrangler. Please install it first."
    exit 1
fi

# Check if wrangler is authenticated
if wrangler whoami &> /dev/null; then
    ACCOUNT_INFO=$(wrangler whoami 2>&1)
    if echo "$ACCOUNT_INFO" | grep -q "81f483e6767ea3194467ecef42840f79"; then
        check_pass "Wrangler authenticated with correct account (81f483e6767ea3194467ecef42840f79)"
    else
        check_warn "Wrangler authenticated, but account ID may not match (expected: 81f483e6767ea3194467ecef42840f79)"
    fi
else
    check_fail "Wrangler not authenticated (run: wrangler login)"
fi

section_header "2. Configuration Files"

# Check if wrangler.toml exists
if [ -f "wrangler.toml" ]; then
    check_pass "wrangler.toml exists"

    # Check if account_id is set
    if grep -q "account_id = \"81f483e6767ea3194467ecef42840f79\"" wrangler.toml; then
        check_pass "Account ID configured in wrangler.toml"
    else
        check_fail "Account ID not configured in wrangler.toml"
    fi
else
    check_fail "wrangler.toml not found"
fi

# Check if documentation exists
if [ -f "docs/CLOUDFLARE_SETUP.md" ]; then
    check_pass "CLOUDFLARE_SETUP.md documentation exists"
else
    check_warn "CLOUDFLARE_SETUP.md not found (expected in docs/)"
fi

##############################################################################
# D1 Database Verification
##############################################################################

section_header "3. D1 Databases"

# Get list of D1 databases
D1_LIST=$(wrangler d1 list 2>&1 || echo "")

verify_d1_database() {
    local env=$1
    local db_name=$2

    if echo "$D1_LIST" | grep -q "$db_name"; then
        # Database exists, get its ID
        DB_ID=$(echo "$D1_LIST" | grep "$db_name" | awk '{print $1}' | head -1)
        check_pass "D1 database '$db_name' exists (ID: $DB_ID)"

        # Check if database ID is in wrangler.toml
        if [ -f "wrangler.toml" ]; then
            if grep -q "database_name = \"$db_name\"" wrangler.toml; then
                # Check if it has a real database ID (not placeholder)
                TOML_ID=$(grep -A 1 "database_name = \"$db_name\"" wrangler.toml | grep "database_id" | sed 's/.*database_id = "\(.*\)".*/\1/')
                if [[ "$TOML_ID" == "REPLACE_WITH_ACTUAL_DATABASE_ID" ]]; then
                    check_fail "Database '$db_name' ID in wrangler.toml is placeholder (update with: $DB_ID)"
                elif [[ "$TOML_ID" == "$DB_ID" ]]; then
                    check_pass "Database '$db_name' ID matches in wrangler.toml"
                else
                    check_warn "Database '$db_name' ID in wrangler.toml ($TOML_ID) doesn't match actual ($DB_ID)"
                fi
            else
                check_warn "Database '$db_name' not configured in wrangler.toml"
            fi
        fi
    else
        check_fail "D1 database '$db_name' not found (run: wrangler d1 create $db_name)"
    fi
}

# Check databases based on environment
if [[ "$ENV_TO_CHECK" == "dev" || "$ENV_TO_CHECK" == "all" ]]; then
    verify_d1_database "dev" "happy-dev"
fi

if [[ "$ENV_TO_CHECK" == "prod" || "$ENV_TO_CHECK" == "all" ]]; then
    verify_d1_database "prod" "happy-prod"
fi

##############################################################################
# R2 Bucket Verification
##############################################################################

section_header "4. R2 Buckets"

# Get list of R2 buckets
R2_LIST=$(wrangler r2 bucket list 2>&1 || echo "")

verify_r2_bucket() {
    local env=$1
    local bucket_name=$2

    if echo "$R2_LIST" | grep -q "$bucket_name"; then
        check_pass "R2 bucket '$bucket_name' exists"

        # Check if bucket is configured in wrangler.toml
        if [ -f "wrangler.toml" ]; then
            if grep -q "bucket_name = \"$bucket_name\"" wrangler.toml; then
                check_pass "Bucket '$bucket_name' configured in wrangler.toml"
            else
                check_warn "Bucket '$bucket_name' not configured in wrangler.toml"
            fi
        fi
    else
        check_fail "R2 bucket '$bucket_name' not found (run: wrangler r2 bucket create $bucket_name)"
    fi
}

# Check buckets based on environment
if [[ "$ENV_TO_CHECK" == "dev" || "$ENV_TO_CHECK" == "all" ]]; then
    verify_r2_bucket "dev" "happy-dev-uploads"
fi

if [[ "$ENV_TO_CHECK" == "prod" || "$ENV_TO_CHECK" == "all" ]]; then
    verify_r2_bucket "prod" "happy-prod-uploads"
fi

##############################################################################
# Worker Deployment Verification
##############################################################################

section_header "5. Worker Deployment"

verify_worker_deployment() {
    local env=$1

    echo "Checking if Worker can be deployed to $env environment..."

    # Dry run deployment
    if wrangler deploy --dry-run --env "$env" &> /dev/null; then
        check_pass "Worker configuration valid for '$env' environment"
    else
        check_fail "Worker deployment validation failed for '$env' environment"
    fi
}

# Check deployments based on environment
if [[ "$ENV_TO_CHECK" == "dev" || "$ENV_TO_CHECK" == "all" ]]; then
    verify_worker_deployment "dev"
fi

if [[ "$ENV_TO_CHECK" == "prod" || "$ENV_TO_CHECK" == "all" ]]; then
    verify_worker_deployment "prod"
fi

##############################################################################
# Project Structure Verification
##############################################################################

section_header "6. Project Structure"

# Check essential directories
[ -d "src" ] && check_pass "src/ directory exists" || check_fail "src/ directory missing"
[ -d "docs" ] && check_pass "docs/ directory exists" || check_warn "docs/ directory missing"

# Check essential files
[ -f "package.json" ] && check_pass "package.json exists" || check_fail "package.json missing"
[ -f "tsconfig.json" ] && check_pass "tsconfig.json exists" || check_warn "tsconfig.json missing"
[ -f "src/index.ts" ] && check_pass "src/index.ts exists" || check_fail "src/index.ts missing"

##############################################################################
# Summary
##############################################################################

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  Verification Summary"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo -e "${GREEN}Passed:${NC}   $PASSED"
echo -e "${YELLOW}Warnings:${NC} $WARNINGS"
echo -e "${RED}Failed:${NC}   $FAILED"
echo ""

if [ $FAILED -eq 0 ]; then
    if [ $WARNINGS -eq 0 ]; then
        echo -e "${GREEN}✓ All checks passed!${NC}"
        echo ""
        echo "Your Cloudflare setup is complete and ready for development."
        echo ""
        echo "Next steps:"
        echo "  1. Review docs/CLOUDFLARE_SETUP.md for any manual steps"
        echo "  2. Deploy test Worker: wrangler deploy --env dev"
        echo "  3. Proceed to HAP-1 (Phase 1: Cloudflare Workers Foundation)"
        echo ""
        exit 0
    else
        echo -e "${YELLOW}⚠ All checks passed with $WARNINGS warning(s).${NC}"
        echo ""
        echo "Setup is functional but some items need attention."
        echo "Review warnings above before proceeding."
        echo ""
        exit 0
    fi
else
    echo -e "${RED}✗ $FAILED check(s) failed.${NC}"
    echo ""
    echo "Please fix the failed checks before proceeding:"
    echo "  1. Review error messages above"
    echo "  2. Follow steps in docs/CLOUDFLARE_SETUP.md"
    echo "  3. Run this script again to verify"
    echo ""
    exit 1
fi
