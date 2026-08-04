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
5. Run `npm run test`, `npm run lint`, `npm run typecheck` and `npm run build`.
6. Commit and deploy.
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

Provider API checks are optional diagnostics. `npm run audit:models` reports `credentials_missing` or `documentation_only` when no provider check has run; it does not claim live verification. During Folian Beta, officially released models that have not passed manual Studio QA are published with `verificationStatus: "beta_candidate"` and appear under **Beta Candidates** in the picker.

The catalogue covers released text-generation models that Folian's existing OpenAI Responses and Anthropic Messages adapters can call. It deliberately excludes audio, realtime, image-only, embedding, moderation, and invitation-only models because they require different product workflows or transport adapters.

```bash
ANTHROPIC_API_KEY='...' FOLIAN_REQUIRE_LIVE_AI=1 npm run audit:anthropic:live
```

The strict command checks Anthropic's official Models API, then tests each supplied model sequentially using Folian's native Messages request shape. It is useful for engineering diagnostics, but it does not block Beta publication. Human verification inside Studio is the acceptance test: promote a passing candidate to `verified` and the appropriate picker group, or remove a failed candidate and publish a new configuration version.

To assess an exact candidate ID returned by the supplied account, without publishing it, provide a comma-separated candidate list. Candidate IDs are first checked against the account's Models API and then run through the same live workflow contract:

```bash
ANTHROPIC_API_KEY='...' FOLIAN_REQUIRE_LIVE_AI=1 \
FOLIAN_ANTHROPIC_CANDIDATE_MODELS='exact-id-from-models-api' \
npm run audit:anthropic:live
```

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
