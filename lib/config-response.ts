import { createHash } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import type { ZodType } from 'zod';

export const defaultConfigCacheControl =
	'public, max-age=300, s-maxage=86400, stale-while-revalidate=604800';
export const modelCatalogCacheControl =
	'public, max-age=300, s-maxage=300, stale-while-revalidate=86400';
export const releaseConfigCacheControl =
	'public, max-age=300, s-maxage=300, stale-while-revalidate=86400';

export function serveConfigDocument<T>(
	request: NextRequest,
	document: T,
	schema: ZodType,
	options: { cacheControl?: string } = {}
) {
	const cacheControl = options.cacheControl ?? defaultConfigCacheControl;
	const parsed = schema.safeParse(document);
	if (!parsed.success) {
		console.error('CONFIG_DOCUMENT_VALIDATION_FAILED', {
			timestamp: new Date().toISOString(),
			error: parsed.error.issues.map((issue) => issue.path.join('.')).slice(0, 12),
		});
		return NextResponse.json(
			{ error: 'Folian configuration is temporarily unavailable.' },
			{ status: 503 }
		);
	}

	const body = JSON.stringify(parsed.data);
	const etag = `"${createHash('sha256').update(body).digest('hex')}"`;
	if (request.headers.get('if-none-match') === etag) {
		return new NextResponse(null, {
			status: 304,
			headers: {
				'Cache-Control': cacheControl,
				ETag: etag,
				'Access-Control-Allow-Origin': '*',
			},
		});
	}

	return new NextResponse(body, {
		status: 200,
		headers: {
			'Content-Type': 'application/json; charset=utf-8',
			'Cache-Control': cacheControl,
			ETag: etag,
			'Access-Control-Allow-Origin': '*',
		},
	});
}
