# API Reference

Base URL:

`https://config.folian.app`

## `GET /v1/models`

Returns the AI model catalogue used by Folian clients.

Includes provider status, model metadata, recommendation flags, deprecation flags and capabilities.

## `GET /v1/providers`

Returns provider-level metadata such as display name, status, auth mode, endpoint type and whether custom model IDs are supported.

## `GET /v1/releases`

Returns desktop release metadata and manifest URLs.

## `GET /v1/features`

Returns public feature switches by channel.

## `GET /v1/release-notes`

Returns release-note summaries for client display.

## `GET /v1/capabilities`

Returns the capability registry used to explain model metadata.

## Response Headers

Versioned endpoints support:

- `Cache-Control: public, max-age=300, s-maxage=86400, stale-while-revalidate=604800`
- `ETag`
- `Access-Control-Allow-Origin: *`

Clients should use `If-None-Match` to avoid downloading unchanged configuration.
