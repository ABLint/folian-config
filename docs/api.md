# API Reference

Base URL:

`https://config.folian.app`

## `GET /v1/models`

Returns the AI model catalogue used by Folian clients.

Includes provider status, model metadata, recommendation flags, deprecation flags and capabilities.

The model catalogue response includes lifecycle and audit metadata for each model:

- `lifecycleStatus`: `stable`, `preview`, `experimental`, `deprecated` or `unavailable`
- `providerDocumentationUrl`: official source used for the entry
- `lastVerifiedAt`: last catalogue verification time
- `minimumFolianVersion`: minimum client version expected to understand the entry
- `compatibilityStatus`: whether the current Folian adapter can call the model
- `recommendedFor`: Folian writing use cases such as `long_form_writing`, `structured_extraction` and `research`

Deprecated models are retained only when useful for migration metadata and should not be shown by default in model pickers.

## `GET /v1/providers`

Returns provider-level metadata such as display name, status, auth mode, endpoint type and whether custom model IDs are supported.

## `GET /v1/releases`

Returns release visibility and operational metadata for the stable and beta desktop channels:

- version and minimum version
- publication date
- DMG download URL
- release notes URL
- SHA-256 checksum and file size
- supported architecture
- minimum macOS version
- mandatory update flag
- native updater feed URL

The native Electron updater continues to use the channel-specific Squirrel.Mac JSON feed. This endpoint is for release visibility, website integration and operational control, not as a replacement for native updater metadata.

## `GET /v1/features`

Returns public feature switches by channel.

## `GET /v1/release-notes`

Returns release-note summaries for client display.

## `GET /v1/capabilities`

Returns the capability registry used to explain model metadata.

## Response Headers

Versioned endpoints support:

- `Cache-Control`
- `ETag`
- `Access-Control-Allow-Origin: *`

Clients should use `If-None-Match` to avoid downloading unchanged configuration.

`GET /v1/models` uses:

```http
Cache-Control: public, max-age=300, s-maxage=300, stale-while-revalidate=86400
```

Other versioned endpoints use:

```http
Cache-Control: public, max-age=300, s-maxage=86400, stale-while-revalidate=604800
```
