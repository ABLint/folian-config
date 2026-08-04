# Folian Configuration Platform

`config.folian.app` is the public configuration backend for Folian clients. It is independent from Folian Studio, does not use Supabase and does not require authentication.

## Architecture

```text
Folian Desktop
  -> config.folian.app
  -> validated JSON configuration
  -> local cache

Folian Studio
  -> config.folian.app
  -> shared configuration
```

The service is a lightweight stateless Next.js app deployed directly to Vercel.

Native desktop updater feeds are served under `/desktop/*`. They deliberately keep Electron/Squirrel.Mac JSON format and are not wrapped in the versioned `/v1/*` configuration envelope.

## Versioning

Every document includes:

- `configurationVersion`
- `publishedAt`
- `schemaVersion`

Clients should use `configurationVersion` and `ETag` to decide whether to replace local cache.

## Cache Strategy

All endpoints return `ETag` and `Access-Control-Allow-Origin: *`.

`/v1/models` uses a short CDN freshness window so urgent model catalogue updates can publish quickly:

```http
Cache-Control: public, max-age=300, s-maxage=300, stale-while-revalidate=86400
```

Other slower-moving configuration may use longer CDN freshness.

## Validation

All JSON documents are validated before serving. Invalid configuration returns a safe `503` response and logs a validation failure without exposing internals to clients.

Run:

```bash
npm run audit:models
npm run test
npm run lint
npm run typecheck
npm run build
```

For an Anthropic Beta model publication, run the additional release gate with a locally supplied key:

```bash
ANTHROPIC_API_KEY='...' FOLIAN_REQUIRE_LIVE_AI=1 npm run audit:anthropic:live
```

This checks the official Models API and validates each published Anthropic model sequentially using the provider-native Folian request shape for plain completion, structured output, Chapter Brief, manuscript continuation, and scene notes. Missing credentials, unavailable models, permissions failures, and response-validation failures are explicit outcomes and fail the strict gate.

To audit an unpublished exact model ID returned by that account, set `FOLIAN_ANTHROPIC_CANDIDATE_MODELS` to a comma-separated list. Candidate models are never added to the served catalogue automatically.

## Deployment

- Vercel project root: `/`
- Framework: Next.js
- Production domain: `config.folian.app`
- Runtime secrets: none required

Provider API keys may be supplied locally or in CI for audit-only verification. They are not required by the production service and must never be committed.

## Future Expansion

The same versioned endpoint pattern should be used for future configuration:

- Desktop update manifests
- Release notes
- Feature flags
- AI capability registry
- Plugin registry
- Pricing metadata
- Experimental feature switches
