#!/usr/bin/env bash
#
# Provision Neon (database + Managed Neon Auth) for ONA using the Neon CLI.
#
# Authentication: NEON_API_KEY env var (non-interactive; no `neon login` browser
# flow). The Neon API does not support any other non-interactive auth for CLI.
#
# What it does (idempotent):
#   1. Finds a Neon project named $ONA_NEON_PROJECT_NAME (default: ona-com-open-source).
#   2. If absent, tries to create it; if the org blocks project creation
#      (e.g. Vercel-managed orgs), falls back to a dedicated `ona` branch
#      inside an existing project ($ONA_NEON_PARENT_PROJECT, default: oldest project).
#   3. Enables Neon Auth (Managed Better Auth) on the target branch.
#   4. Fetches pooled + direct connection strings for the target branch.
#   5. Writes missing variables to .env.local:
#        POSTGRES_URL, POSTGRES_URL_NON_POOLING,
#        NEON_AUTH_BASE_URL, NEON_AUTH_COOKIE_SECRET
#   6. Verifies connectivity (SELECT 1) and the auth endpoint.
#
# Variables already present in .env.local are never overwritten.
#
# Usage: scripts/neon-setup.sh
# Env:
#   NEON_API_KEY              (required) Neon API key
#   ONA_NEON_PROJECT_NAME     project name to look up/create (default ona-com-open-source)
#   ONA_NEON_PARENT_PROJECT   fallback parent project id/name for the branch strategy
#   ONA_ENV_FILE              env file to update (default .env.local)
#   ONA_NEON_DOMAIN           app origin to trust for browser sign-in (default NEXT_PUBLIC_APP_URL)

set -euo pipefail

PROJECT_NAME="${ONA_NEON_PROJECT_NAME:-ona-com-open-source}"
BRANCH_NAME="ona"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${ONA_ENV_FILE:-$ROOT_DIR/.env.local}"

log() { printf '[neon-setup] %s\n' "$*"; }
fail() { printf '[neon-setup] ERROR: %s\n' "$*" >&2; exit 1; }

# ── CLI ──────────────────────────────────────────────────────────────────────
if command -v neon >/dev/null 2>&1; then
  NEON="neon"
else
  log "neon CLI not found; using npx neon@latest"
  NEON="npx -y neon@latest"
fi

if [ -z "${NEON_API_KEY:-}" ]; then
  fail "NEON_API_KEY is not set. Create one in Neon Console (or \`neon api-keys create\`) and export it."
fi

neon_cli() { $NEON "$@"; }

# ── 1. Verify authentication ─────────────────────────────────────────────────
neon_cli me >/dev/null 2>&1 || fail "NEON_API_KEY rejected by Neon. Check the key and try again."
log "Authenticated to Neon via NEON_API_KEY"

# ── 2. Resolve project and branch ────────────────────────────────────────────
PROJECT_ID="$(neon_cli projects list -o json 2>/dev/null | jq -r --arg name "$PROJECT_NAME" '.projects[] | select(.name == $name) | .id' | head -n1)"

if [ -n "$PROJECT_ID" ]; then
  log "Found project '$PROJECT_NAME' ($PROJECT_ID)"
  BRANCH_ID="$(neon_cli branches list --project-id "$PROJECT_ID" -o json 2>/dev/null | jq -r --arg name "$BRANCH_NAME" '(if type=="array" then . else .branches end)[] | select(.name == $name) | .id' | head -n1)"
  if [ -n "$BRANCH_ID" ]; then
    log "Reusing existing branch '$BRANCH_NAME' ($BRANCH_ID)"
  else
    BRANCH_ID="$(neon_cli branches create --project-id "$PROJECT_ID" --name "$BRANCH_NAME" -o json | jq -r '.branch.id // .id')"
    log "Created branch '$BRANCH_NAME' ($BRANCH_ID)"
  fi
else
  log "No project named '$PROJECT_NAME' found; attempting to create it"
  CREATE_ERR="$(mktemp)"
  if PROJECT_ID="$(neon_cli projects create --name "$PROJECT_NAME" -o json 2>"$CREATE_ERR" | jq -r '.project.id // .id' 2>/dev/null)" && [ -n "$PROJECT_ID" ] && [ "$PROJECT_ID" != "null" ]; then
    log "Created project '$PROJECT_NAME' ($PROJECT_ID)"
    BRANCH_ID="$(neon_cli branches list --project-id "$PROJECT_ID" -o json 2>/dev/null | jq -r '(if type=="array" then . else .branches end)[0].id')"
  else
    REASON="$(head -c 200 "$CREATE_ERR" | tr '\n' ' ')"
    log "Project creation blocked ($REASON)"
    log "Falling back to a dedicated '$BRANCH_NAME' branch inside an existing project"

    PARENT_ID="${ONA_NEON_PARENT_PROJECT:-}"
    if [ -z "$PARENT_ID" ]; then
      PARENT_ID="$(neon_cli projects list -o json 2>/dev/null | jq -r '.projects | sort_by(.created_at) | .[0].id')"
    fi
    [ -n "$PARENT_ID" ] || fail "No existing Neon projects available to host the '$BRANCH_NAME' branch. Create a project (or set ONA_NEON_PARENT_PROJECT) and re-run."
    log "Using parent project $PARENT_ID"

    BRANCH_ID="$(neon_cli branches list --project-id "$PARENT_ID" -o json 2>/dev/null | jq -r --arg name "$BRANCH_NAME" '(if type=="array" then . else .branches end)[] | select(.name == $name) | .id' | head -n1)"
    if [ -z "$BRANCH_ID" ]; then
      BRANCH_ID="$(neon_cli branches create --project-id "$PARENT_ID" --name "$BRANCH_NAME" -o json | jq -r '.branch.id // .id')"
      log "Created branch '$BRANCH_NAME' ($BRANCH_ID)"
    else
      log "Reusing existing branch '$BRANCH_NAME' ($BRANCH_ID)"
    fi
    PROJECT_ID="$PARENT_ID"
  fi
fi

# ── 3. Enable Neon Auth on the branch ────────────────────────────────────────
AUTH_STATUS="$(neon_cli neon-auth status --project-id "$PROJECT_ID" --branch "$BRANCH_ID" -o json 2>/dev/null | jq -c . 2>/dev/null || echo '{}')"
AUTH_ENABLED="$(printf '%s' "$AUTH_STATUS" | jq -r '.enabled // .auth_provider // empty' | head -n1)"

if [ -n "$AUTH_ENABLED" ] && [ "$AUTH_ENABLED" != "null" ]; then
  log "Neon Auth already enabled on branch"
  AUTH_BASE_URL="$(printf '%s' "$AUTH_STATUS" | jq -r '.base_url // .config.base_url // empty' | head -n1)"
else
  AUTH_JSON="$(neon_cli neon-auth enable --project-id "$PROJECT_ID" --branch "$BRANCH_ID" -o json 2>/tmp/ona-neon-auth-keys.json)"
  AUTH_BASE_URL="$(printf '%s' "$AUTH_JSON" | jq -r '.base_url // empty')"
  log "Neon Auth enabled on branch"
fi

if [ -z "$AUTH_BASE_URL" ]; then
  AUTH_BASE_URL="$(neon_cli neon-auth status --project-id "$PROJECT_ID" --branch "$BRANCH_ID" -o json 2>/dev/null | jq -r '.base_url // .config.base_url // empty' | head -n1)"
fi
[ -n "$AUTH_BASE_URL" ] || fail "Could not determine the Neon Auth base URL."
log "Neon Auth base URL: $AUTH_BASE_URL"
# Allow the auth service to accept sign-in requests from the app's origins.
add_domain() {
  local domain="$1"
  if [ -z "$domain" ]; then return 0; fi
  if neon_cli neon-auth domain add "$domain" --project-id "$PROJECT_ID" --branch "$BRANCH_ID" >/dev/null 2>&1; then
    log "Neon Auth domain allowed: $domain"
  fi
}
add_domain "${ONA_NEON_APP_DOMAIN:-}"
add_domain "http://localhost:5000"
add_domain "http://localhost:3000"

# ── 4. Connection strings ────────────────────────────────────────────────────
POOLED_URL="$(neon_cli connection-string "$BRANCH_ID" --project-id "$PROJECT_ID" --pooled 2>/dev/null | grep -m1 '^postgresql://')"
DIRECT_URL="$(neon_cli connection-string "$BRANCH_ID" --project-id "$PROJECT_ID" 2>/dev/null | grep -m1 '^postgresql://')"
[ -n "$POOLED_URL" ] || fail "Could not obtain the pooled connection string."
log "Connection strings retrieved (not printed)"

# ── 5. Write .env.local (never overwrite existing values) ───────────────────
touch "$ENV_FILE"
set_env_var() {
  local key="$1" value="$2"
  if grep -qE "^${key}=" "$ENV_FILE"; then
    log "$key already set in $ENV_FILE — keeping existing value"
  else
    printf '%s=%s\n' "$key" "$value" >> "$ENV_FILE"
    log "Wrote $key to $ENV_FILE"
  fi
}

set_env_var "POSTGRES_URL" "$POOLED_URL"
set_env_var "POSTGRES_URL_NON_POOLING" "${DIRECT_URL:-$POOLED_URL}"
set_env_var "NEON_AUTH_BASE_URL" "$AUTH_BASE_URL"
COOKIE_SECRET="$(openssl rand -base64 32 2>/dev/null || head -c 48 /dev/urandom | base64)"
set_env_var "NEON_AUTH_COOKIE_SECRET" "$COOKIE_SECRET"

# ── 6. Smoke checks ──────────────────────────────────────────────────────────
if command -v psql >/dev/null 2>&1; then
  if psql "$POOLED_URL" -c 'SELECT 1' >/dev/null 2>&1; then
    log "Database connectivity verified"
  else
    fail "Could not connect to the Neon database with the pooled connection string."
  fi
fi

HTTP_CODE="$(curl -s -o /dev/null -w '%{http_code}' "$AUTH_BASE_URL/ok" || true)"
if [ "$HTTP_CODE" != "200" ] && [ "$HTTP_CODE" != "404" ]; then
  fail "Neon Auth endpoint check failed (HTTP $HTTP_CODE) for $AUTH_BASE_URL"
fi
log "Neon Auth endpoint reachable (HTTP $HTTP_CODE)"

# ── 7. Trust the deployed domain (for browser sign-in from production) ───────
APP_ORIGIN="${ONA_NEON_DOMAIN:-${NEXT_PUBLIC_APP_URL:-}}"
if [ -n "$APP_ORIGIN" ]; then
  case "$APP_ORIGIN" in
    http://*|https://*) ;;
    *) APP_ORIGIN="https://$APP_ORIGIN" ;;
  esac
  ALREADY_TRUSTED="$(neon_cli neon-auth domain list --project-id "$PROJECT_ID" --branch "$BRANCH_ID" -o json 2>/dev/null | jq -r --arg d "$APP_ORIGIN" '(if type=="array" then . else (.domains // []) end)[]? | select(((.domain // .) // "") == $d) | .domain // .' 2>/dev/null | head -n1)"
  if [ -n "$ALREADY_TRUSTED" ]; then
    log "Domain already trusted: $APP_ORIGIN"
  else
    neon_cli neon-auth domain add --project-id "$PROJECT_ID" --branch "$BRANCH_ID" "$APP_ORIGIN" >/dev/null 2>&1 \
      && log "Added trusted domain: $APP_ORIGIN" \
      || log "WARNING: could not add trusted domain $APP_ORIGIN (add it via the Neon console)"
  fi
fi

log "Done. Environment written to $ENV_FILE (migrations run automatically on app start)."
