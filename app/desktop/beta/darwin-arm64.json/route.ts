import { NextRequest, NextResponse } from 'next/server';
import feed from '../../../../data/desktop/beta/darwin-arm64.json';
import {
	parseFolianVersionFromUserAgent,
	shouldOfferDesktopUpdate,
} from '../../../../lib/desktop-feed.mjs';

const feedHeaders = {
	'Access-Control-Allow-Origin': '*',
	'Cache-Control': 'private, no-store',
	Vary: 'User-Agent',
};

export const dynamic = 'force-dynamic';

export function GET(request: NextRequest) {
	const installedVersion = parseFolianVersionFromUserAgent(request.headers.get('user-agent'));
	if (!shouldOfferDesktopUpdate(installedVersion, feed.name)) {
		return new NextResponse(null, {
			status: 204,
			headers: feedHeaders,
		});
	}

	return NextResponse.json(feed, {
		status: 200,
		headers: feedHeaders,
	});
}
