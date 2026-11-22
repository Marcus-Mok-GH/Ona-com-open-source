#!/usr/bin/env bash
#
# Sync ONA's database + auth configuration to Vercel using the Vercel CLI.
#
# Reads the values written by scripts/neon-setup.sh (.env.local) and pushes
# them as Vercel environment variables so preview and production deployments
# run against the same Neon database and Neon Auth instance.
#
# Usage:
#   bash scripts/vercel-setup.sh                 # sync env vars
#   bash scripts/vercel-setup.sh --deploy        # also deploy to production
#
# Required (one of):
#   - VERCEL_TOKEN env var (CI / headless), or
#   - an authenticated Vercel CLI (`vercel login`)
#
# Optional env:
#   VERCEL_SCOPE   Vercel team slug      (default: sjdjdiejdrirhdkjejs-projects)
#   VERCEL_PROJECT Vercel project name   (default: ona-com-open-source)
#   VERCEL_ENV_FILE env file to read     (default: .env.local)
#   VERCEL_DEPLOY  set to 1 to trigger a production deployment after sync

set -euo pipefail

log()  { printf '[vercel-setup] %s\n' "$*"; }
fail() { printf '[vercel-setup] ERROR: %s\n' "$*" >&2; exit 1; }

VERCEL_BIN="vercel"
command -v vercel >/dev/null 2>&1 || VERCEL_BIN="npx -y vercel@latest"

# ── 1. Identity ──────────────────────────────────────────────────────────────
if [ -n "${VERCEL_TOKEN:-}" ]; then
  AUTH_ARGS=(--token "$VERCEL_TOKEN")
  log "Using VERCEL_TOKEN from the environment"
else
  AUTH_ARGS=()
  who="$($VERCEL_BIN whoami 2>/dev/null | tail -1 | sed 's/^> //')"
  case "$who" in
    Logged*) fail "Not authenticated. Run 'vercel login' or set VERCEL_TOKEN." ;;
    *) log "Authenticated to Vercel as $who" ;;
  esac
fi

SCOPE="${VERCEL_SCOPE:-sjdjdiejdrirhdkjejs-projects}"
PROJECT="${VERCEL_PROJECT:-ona-com-open-source}"
ENV_FILE="${VERCEL_ENV_FILE:-.env.local}"

[ -f "$ENV_FILE" ] || fail "$ENV_FILE not found. Run scripts/neon-setup.sh first."

# ── 2. Link ──────────────────────────────────────────────────────────────────
$VERCEL_BIN "${AUTH_ARGS[@]}" link --yes --project "$PROJECT" --scope "$SCOPE" >/dev/null 2>&1 \
  || fail "Could not link $SCOPE/$PROJECT"
log "Linked to $SCOPE/$PROJECT"

# ── 3. Push database + auth env vars ────────────────────────────────────────
# Values are read, never printed.
get_env() { grep -m1 "^$1=" "$ENV_FILE" | cut -d= -f2-; }

push_env() {
  local key="$1" value="$2"
  [ -n "$value" ] || { log "SKIP $key (not set in $ENV_FILE)"; return 0; }
  for environment in production preview development; do
    $VERCEL_BIN "${AUTH_ARGS[@]}" env rm "$key" "$environment" -y >/dev/null 2>&1 || true
    printf '%s' "$value" | $VERCEL_BIN "${AUTH_ARGS[@]}" env add "$key" "$environment" >/dev/null 2>&1 \
      || fail "Could not set $key for $environment"
  done
  log "Synced $key -> production, preview, development"
}

POSTGRES_URL="$(get_env POSTGRES_URL)"
NON_POOLING="$(get_env POSTGRES_URL_NON_POOLING)"
AUTH_BASE_URL="$(get_env NEON_AUTH_BASE_URL)"
COOKIE_SECRET="$(get_env NEON_AUTH_COOKIE_SECRET)"

[ -n "$POSTGRES_URL" ] || fail "POSTGRES_URL missing in $ENV_FILE"
[ -n "$AUTH_BASE_URL" ] || fail "NEON_AUTH_BASE_URL missing in $ENV_FILE"
[ -n "$COOKIE_SECRET" ] || fail "NEON_AUTH_COOKIE_SECRET missing in $ENV_FILE"

# ── 3b. Super-agent heartbeat secret ────────────────────────────────────────
# Rotated value (the original was committed to git history and is burned).
# Reuse the local value if present so CI and production stay consistent;
# otherwise generate one and persist it locally.
HEARTBEAT_SECRET="$(grep -E '^SUPER_AGENT_HEARTBEAT_SECRET=' "$ENV_FILE" 2>/dev/null | head -1 | cut -d= -f2- || true)"
if [ -z "$HEARTBEAT_SECRET" ]; then
  HEARTBEAT_SECRET="$(openssl rand -hex 32)"
  printf 'SUPER_AGENT_HEARTBEAT_SECRET=%s\n' "$HEARTBEAT_SECRET" >> "$ENV_FILE"
  log "Generated SUPER_AGENT_HEARTBEAT_SECRET and appended to $ENV_FILE"
fi

push_env POSTGRES_URL "$POSTGRES_URL"
push_env POSTGRES_URL_NON_POOLING "$NON_POOLING"
push_env NEON_AUTH_BASE_URL "$AUTH_BASE_URL"
push_env NEON_AUTH_COOKIE_SECRET "$COOKIE_SECRET"
push_env SUPER_AGENT_HEARTBEAT_SECRET "$HEARTBEAT_SECRET"

# ── 4. Optional production deployment ────────────────────────────────────────
if [ "${VERCEL_DEPLOY:-0}" = "1" ] || [ "${1:-}" = "--deploy" ]; then
  log "Deploying to production (remote build)..."
  url="$($VERCEL_BIN "${AUTH_ARGS[@]}" deploy --prod --yes 2>/dev/null | tail -1)"
  log "Deployed: $url"
fi

log "Done. Vercel deployments now use Neon for database and auth."
