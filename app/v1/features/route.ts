import type { NextRequest } from 'next/server';
import { serveConfigDocument } from '../../../lib/config-response';
import { featuresDocument } from '../../../lib/documents';
import { featuresDocumentSchema } from '../../../lib/schemas';

export const dynamic = 'force-static';

export function GET(request: NextRequest) {
	return serveConfigDocument(request, featuresDocument, featuresDocumentSchema);
}
