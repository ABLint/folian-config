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
  -> local cache
  -> model selector

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

## Publishing Workflow

Configuration changes should not require application code changes.

1. Edit the relevant JSON file in `data/`.
2. Increment `configurationVersion`.
3. Update `publishedAt`.
4. Run `npm run test`.
5. Commit.
6. Deploy.

If Anthropic or OpenAI releases a new model, add it to `data/models.json`, validate, and deploy this repository. Desktop clients with remote catalogue support will see the model after their next refresh.

## Validation

Run:

```bash
npm run test
npm run lint
npm run typecheck
npm run build
```

Invalid configuration should never be deployed. API routes also validate documents before serving them and return a safe unavailable response if validation fails.

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
