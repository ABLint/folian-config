import { NextResponse } from 'next/server';

export const dynamic = 'force-static';

export function GET() {
	return NextResponse.json(
		{
			status: 'inactive',
			channel: 'stable',
			error: 'Folian stable desktop updates are not published yet.',
		},
		{
			status: 404,
			headers: {
				'Access-Control-Allow-Origin': '*',
				'Cache-Control': 'public, max-age=60, s-maxage=60, stale-while-revalidate=300',
			},
		}
	);
}
