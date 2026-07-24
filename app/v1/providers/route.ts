import type { NextRequest } from 'next/server';
import { serveConfigDocument } from '../../../lib/config-response';
import { providersDocument } from '../../../lib/documents';
import { providersDocumentSchema } from '../../../lib/schemas';

export const dynamic = 'force-static';

export function GET(request: NextRequest) {
	return serveConfigDocument(request, providersDocument, providersDocumentSchema);
}
