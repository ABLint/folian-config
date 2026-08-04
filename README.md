# Folian Configuration Platform

Folian Configuration Platform is the public, stateless configuration backend for Folian clients.

Production domain:

`https://config.folian.app`

The service is intentionally separate from Folian Studio. It does not use Supabase, authentication, sessions, or project data. It serves validated JSON documents for desktop and cloud clients.

## Purpose

This repository is the single source of truth for shared Folian configuration:

- AI model catalogue
- AI provider metadata
- Desktop release manifests
- Release notes
- Feature flags
- AI capability registry
- Future plugin registry
- Future pricing metadata
- Future experimental switches

## Architecture

Folian clients read public configuration directly from `config.folian.app`.

```text
Folian Desktop macOS/Windows
  -> https://config.folian.app/v1/models
  -> https://config.folian.app/desktop/beta/darwin-arm64.json
  -> local cache
  -> model selector and native updater

Folian Studio
  -> https://config.folian.app/v1/models
  -> shared model/provider metadata
```

The platform is a lightweight Next.js app with static route handlers and CDN-friendly JSON responses.

## API

Versioned endpoints:

- `GET /v1/models`
- `GET /v1/providers`
- `GET /v1/releases`
- `GET /v1/features`
- `GET /v1/release-notes`
- `GET /v1/capabilities`

Native desktop updater endpoints:

- `GET /desktop`
- `GET /desktop/beta/darwin-arm64.json`
- `GET /desktop/stable/darwin-arm64.json`

The `/desktop/*` endpoints preserve Electron/Squirrel.Mac feed format. They are intentionally not wrapped in the `/v1` configuration envelope.

Every document includes:

```json
{
  "configurationVersion": 1,
  "publishedAt": "2026-07-23T00:00:00.000Z",
  "schemaVersion": "2026-07-23.v1"
}
```

## Cache Strategy

All versioned endpoints return:

- `Cache-Control`
- `ETag`
- `Access-Control-Allow-Origin: *`

Clients should send `If-None-Match` and reuse their local cache when the platform returns `304 Not Modified`.

The model catalogue uses a faster publication policy than slower-moving configuration:

```http
Cache-Control: public, max-age=300, s-maxage=300, stale-while-revalidate=86400
```

This keeps model updates responsive while preserving ETag-based revalidation. Manual client refresh should bypass the local client cache, send `If-None-Match` when an ETag is known, and replace the local catalogue only when the service returns validated new data.

## Publishing Workflow

Configuration changes should not require application code changes.

1. Edit the relevant JSON file in `data/`.
2. Increment `configurationVersion`.
3. Update `publishedAt`.
4. Run `npm run audit:models` for local model catalogue checks.
5. For any Anthropic Beta model change, run `npm run audit:anthropic:live` with `ANTHROPIC_API_KEY` supplied outside the repository.
6. Run `npm run test`, `npm run lint`, `npm run typecheck` and `npm run build`.
7. Commit.
8. Deploy.
9. Verify the production endpoint.
10. Verify Folian Studio and Folian Desktop clients refresh the catalogue.

If Anthropic or OpenAI releases a new model, add it to `data/models.json`, validate, and deploy this repository. Desktop clients with remote catalogue support will see the model after their next refresh.

Native desktop update feeds live under `data/desktop/` and are served by
version-aware route handlers. The Folian desktop release workflow stages
accepted Squirrel.Mac feed JSON into this repository:

```bash
cd /Users/chrispascoe/Projects/novel-studio
node scripts/stage-mac-update-feed.cjs beta
cd ../folian-config
npm test
npm run build
```

Signed ZIP and DMG artifacts remain immutable GitHub Release assets. Do not replace published assets in place.

## Validation

Run:

```bash
npm run audit:models
npm run test
npm run lint
npm run typecheck
npm run build
```

Invalid configuration should never be deployed. API routes also validate documents before serving them and return a safe unavailable response if validation fails.

Provider API checks are optional for routine local validation. `npm run audit:models` reports `credentials_missing` or `documentation_only` when no provider check has run; it does not claim live verification. A model catalogue publication that changes Anthropic Beta models requires the strict live gate:

```bash
ANTHROPIC_API_KEY='...' FOLIAN_REQUIRE_LIVE_AI=1 npm run audit:anthropic:live
```

The strict command checks Anthropic's official Models API, then tests each published Anthropic Beta model sequentially using Folian's native Messages request shape: plain completion, structured output, Chapter Brief, manuscript continuation, and scene notes. It makes no automatic retries. Do not increment `configurationVersion` or mark a model `verified` until this command passes.

Routine provider API checks can use:

- `OPENAI_API_KEY`
- `ANTHROPIC_API_KEY`
- `GEMINI_API_KEY` or `GOOGLE_API_KEY`
- `OPENROUTER_API_KEY` or `FOLIAN_AUDIT_OPENROUTER=1`

Secrets are used only for the audit process and are not required for Vercel runtime.

## Deployment

Deploy this repository directly to Vercel.

- Framework: Next.js
- Root directory: `/`
- Production domain: `config.folian.app`
- Build command: `npm run build`
- Install command: `npm install`

No environment variables are required for Phase 1.

## Versioning

- `configurationVersion`: increment when a document changes.
- `publishedAt`: ISO timestamp for the publication time.
- `schemaVersion`: semantic configuration schema identifier.

Clients should compare versions and ETags before replacing their local cache.

## Future Roadmap

- Signed configuration documents.
- Separate stable/beta channels.
- Desktop update manifest expansion.
- Plugin registry.
- Provider pricing metadata.
- Capability-aware task routing metadata.
- Optional operational health endpoint if uptime monitoring needs one later.
