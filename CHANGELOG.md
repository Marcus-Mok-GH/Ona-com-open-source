# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]
### Added
- 2026-11-23 — New chats now require a linked GitHub account. Signed-in users without a GitHub connection (legacy device-flow token or an active Composio connection) are blocked from creating chats by a gate: the "New chat" actions in the task page open a `GithubLinkGate` modal that starts a Composio Connect Link flow (`POST /api/composio/github/link` → hosted auth page → `?composio_connected=1` callback), and the server enforces the same rule in `POST /api/conversations` with `403 GITHUB_LINK_REQUIRED`. API-key callers are exempt so automations keep working. New files: `src/libs/Composio.ts`, `src/app/api/composio/github/{link,status}/route.ts`, `src/components/GithubLinkGate.tsx`, `src/libs/Composio.test.ts`. Requires the `COMPOSIO_API_KEY` environment variable (optionally `COMPOSIO_GITHUB_AUTH_CONFIG_ID` to pin an existing Composio GitHub auth config, or `COMPOSIO_BASE_URL` to override the API host).

### Removed
- 2026-07-16 — Removed the failing `Crowdin Action` GitHub Actions workflow (`.github/workflows/crowdin.yml`). It was failing on every scheduled run (daily ~5am UTC) because the required secrets `CROWDIN_PROJECT_ID` and `CROWDIN_PERSONAL_TOKEN` were never configured, causing Crowdin to reject all jobs with "Required option 'api_token'/'project_id' is missing". In-app i18n via `next-intl` and the checked-in locale files (`src/locales/en.json`, `src/locales/fr.json`) are unchanged and continue to work. The Crowdin sync can be re-enabled later by re-adding the workflow and setting the two secrets in repo Settings → Secrets → Actions.
- 2026-07-16 — Removed the `synchronize-with-crowdin` job from `.github/workflows/CI.yml`. Same root cause: it called `crowdin/github-action@v2` with the missing `CROWDIN_PROJECT_ID`/`CROWDIN_PERSONAL_TOKEN` secrets, so it failed (or was skipped via the `needs:` chain) on every PR. CI now runs `build`, `static`, `unit`, `storybook`, `e2e`, and `lighthouse` only.
