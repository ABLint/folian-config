import type { NextRequest } from 'next/server';
import { serveConfigDocument } from '../../../lib/config-response';
import { releasesDocument } from '../../../lib/documents';
import { releasesDocumentSchema } from '../../../lib/schemas';

export const dynamic = 'force-static';

export function GET(request: NextRequest) {
	return serveConfigDocument(request, releasesDocument, releasesDocumentSchema);
}
