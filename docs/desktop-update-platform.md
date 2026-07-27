# Desktop Update Platform

Folian Desktop uses `config.folian.app` as the long-term source of truth for shared release and AI configuration. The model catalogue lives outside the desktop binaries so new provider models can appear in macOS and Windows clients without a desktop release.

Release visibility is published at:

```http
GET https://config.folian.app/v1/releases
```

The release document records DMG downloads, checksums, release notes, architecture and minimum operating-system support for stable and beta. Native application updates are served by the same configuration platform under `/desktop/*`, but remain a separate native Electron/Squirrel feed contract rather than a `/v1` configuration document.

## Native Desktop Feed

Folian Desktop uses Electron `autoUpdater` with the Squirrel.Mac JSON feed format:

```http
GET https://config.folian.app/desktop/beta/darwin-arm64.json
GET https://config.folian.app/desktop/stable/darwin-arm64.json
```

`/desktop` is a compatibility alias for the current beta feed.

The feed files live in:

```text
public/desktop/beta/darwin-arm64.json
```

The stable channel is intentionally inactive until Folian promotes a real stable desktop release. While inactive, `/desktop/stable/darwin-arm64.json` is served by an application route that returns a cacheable `404` JSON response rather than advertising an old beta release.

These files must stay in native updater format:

```json
{
  "url": "https://github.com/ABLint/folian-config/releases/download/v0.1.0-beta.5/Folian-0.1.0-beta.5-macos-arm64.zip",
  "name": "0.1.0-beta.5",
  "notes": "Writer-facing release notes",
  "pub_date": "2026-07-27T08:37:12.074Z"
}
```

Do not wrap these files in `configurationVersion`, `publishedAt` or `schemaVersion`. Those envelope fields belong to `/v1/*` configuration APIs.

Channel JSON uses:

```http
Cache-Control: public, max-age=60, s-maxage=60, stale-while-revalidate=300
```

Signed ZIP and DMG artifacts remain immutable GitHub release assets. Previous release assets must remain available so installed clients can update safely.

`/v1/releases` uses:

```http
Cache-Control: public, max-age=300, s-maxage=300, stale-while-revalidate=86400
```

The shorter release metadata window allows urgent visibility, rollback and download-link corrections to publish quickly.

## Remote Catalogue

The canonical AI model endpoint is:

```http
GET https://config.folian.app/v1/models
```

The response contains:

- `configurationVersion`
- `publishedAt`
- `schemaVersion`
- provider status
- model IDs and display names
- lifecycle metadata
- model capabilities
- Folian compatibility metadata
- writing-specific recommendation categories
- deprecation and replacement metadata

## Refresh Lifecycle

Desktop clients should refresh automatically once every 24 hours.

Manual refresh from Settings or Updates should:

1. Skip the local 24-hour freshness gate.
2. Request `GET /v1/models`.
3. Send `If-None-Match` when the cached ETag is known.
4. Accept `304 Not Modified` as a successful refresh.
5. Replace the local catalogue only after the downloaded document validates.

Clients may send `Cache-Control: no-cache` on manual refresh if they need to force CDN revalidation while still preserving ETag behaviour.

## Offline Behaviour

Desktop clients must never leave the model selector empty.

Fallback order:

1. Valid remote catalogue.
2. Valid locally cached catalogue.
3. Built-in fallback catalogue shipped with the app.

If a download fails, Folian should log `MODEL_CATALOG_DOWNLOAD_FAILED` and continue with the previous valid catalogue.

If validation fails, Folian should log `MODEL_CATALOG_VALIDATION_FAILED`, discard the downloaded response and keep using the previous valid catalogue.

## Cache Behaviour

`/v1/models` and `/v1/releases` use:

```http
Cache-Control: public, max-age=300, s-maxage=300, stale-while-revalidate=86400
```

The shorter CDN freshness window allows urgent model catalogue and release visibility corrections to publish quickly without disabling caching.

## Provider Metadata

The catalogue only lists providers Folian can currently route through:

- Anthropic
- OpenAI
- Google Gemini
- OpenRouter
- OpenAI-compatible custom endpoints

OpenAI-compatible custom endpoints intentionally have no global default model list. Users supply their own model ID because compatible endpoints vary by server.

## Model Lifecycle Policy

Folian separates model availability from model age. A model is not deprecated merely because a newer generation exists.

Supported lifecycle values:

| Status | Meaning | Default picker behavior |
| --- | --- | --- |
| `stable` | Current callable model supported by Folian adapters. | Visible. Recommended models appear first. |
| `legacy_supported` | Older callable model that remains useful and provider-supported. | Visible under Older supported models. |
| `preview` | Callable preview model with provider caveats. | Visible only when compatible and intentionally listed. |
| `deprecated` | Still useful for migration metadata, but not recommended for new selections. | Hidden for new choices unless already saved. |
| `unavailable` | Not callable through Folian or no longer provider-supported. | Not selectable. |

Deprecated and unavailable models must not be marked `recommended`.

Each major direct provider should expose at least one current model and, where a genuine verified model remains available, one older supported model. Do not fabricate older IDs to satisfy the picker policy.

## Publishing Workflow

1. Review official provider documentation or official model-list APIs.
2. Update `data/models.json`.
3. Increment `configurationVersion`.
4. Update `publishedAt`.
5. Run `npm run audit:models`.
6. Run `npm run test`, `npm run lint`, `npm run typecheck` and `npm run build`.
7. Commit and deploy.
8. Verify `https://config.folian.app/v1/models`.
9. Verify Folian Studio and Folian Desktop clients refresh successfully.

Provider API verification is optional and local-only. Set provider keys in the environment before running `npm run audit:models` when a live verification pass is needed.
