# API Reference

Base URL:

`https://config.folian.app`

## `GET /v1/models`

Returns the AI model catalogue used by Folian clients.

Includes provider status, model metadata, recommendation flags, deprecation flags and capabilities.

The model catalogue response includes lifecycle and audit metadata for each model:

- `lifecycleStatus`: `stable`, `legacy_supported`, `preview`, `deprecated` or `unavailable`
- `providerDocumentationUrl`: official source used for the entry
- `lastVerifiedAt`: last catalogue verification time
- `minimumFolianVersion`: minimum client version expected to understand the entry
- `compatibilityStatus`: whether the current Folian adapter can call the model
- `recommendedFor`: Folian writing use cases such as `long_form_writing`, `structured_extraction` and `research`

`legacy_supported` models are older callable models that remain visible under Older supported models. Deprecated models are retained only when useful for migration metadata and should not be shown by default in model pickers.

## `GET /v1/providers`

Returns provider-level metadata such as display name, status, auth mode, endpoint type and whether custom model IDs are supported.

## `GET /v1/releases`

Returns release visibility and operational metadata for the stable and beta desktop channels:

- channel status, either `active` or `inactive`
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

Folian has not published a stable desktop release yet. Until stable is promoted, the stable channel is returned as `inactive` and does not include beta download assets.

## `GET /desktop/beta/darwin-arm64.json`

Returns the beta Squirrel.Mac JSON feed consumed by Electron `autoUpdater`.

This endpoint is intentionally not a `/v1` configuration document. It preserves the native updater format:

```json
{
  "url": "https://github.com/ABLint/folian-config/releases/download/v0.1.0-beta.5/Folian-0.1.0-beta.5-macos-arm64.zip",
  "name": "0.1.0-beta.5",
  "notes": "Writer-facing release notes",
  "pub_date": "2026-07-26T18:38:54.537Z"
}
```

## `GET /desktop/stable/darwin-arm64.json`

Returns `404` with a small JSON body while the stable channel is inactive:

```json
{
  "status": "inactive",
  "channel": "stable",
  "error": "Folian stable desktop updates are not published yet."
}
```

## `GET /desktop`

Compatibility alias for the active beta desktop feed.

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

`GET /v1/releases` uses the same short publication window as the model catalogue:

```http
Cache-Control: public, max-age=300, s-maxage=300, stale-while-revalidate=86400
```

Other versioned endpoints use:

```http
Cache-Control: public, max-age=300, s-maxage=86400, stale-while-revalidate=604800
```

Native desktop feed JSON uses:

```http
Cache-Control: public, max-age=60, s-maxage=60, stale-while-revalidate=300
```
