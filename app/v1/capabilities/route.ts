import type { NextRequest } from 'next/server';
import { serveConfigDocument } from '../../../lib/config-response';
import { capabilitiesDocument } from '../../../lib/documents';
import { capabilitiesDocumentSchema } from '../../../lib/schemas';

export const dynamic = 'force-static';

export function GET(request: NextRequest) {
	return serveConfigDocument(request, capabilitiesDocument, capabilitiesDocumentSchema);
}
