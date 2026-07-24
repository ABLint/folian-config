import { NextResponse } from 'next/server';

export const dynamic = 'force-static';

export function GET() {
	return NextResponse.json({
		service: 'Folian Configuration Platform',
		status: 'ok',
		configurationVersion: 1,
		publishedAt: '2026-07-23T00:00:00.000Z',
		schemaVersion: '2026-07-23.v1',
		endpoints: [
			'/v1/models',
			'/v1/providers',
			'/v1/releases',
			'/v1/features',
			'/v1/release-notes',
			'/v1/capabilities',
		],
	});
}
