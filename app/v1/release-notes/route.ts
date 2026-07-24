import type { NextRequest } from 'next/server';
import { serveConfigDocument } from '../../../lib/config-response';
import { releaseNotesDocument } from '../../../lib/documents';
import { releaseNotesDocumentSchema } from '../../../lib/schemas';

export const dynamic = 'force-static';

export function GET(request: NextRequest) {
	return serveConfigDocument(request, releaseNotesDocument, releaseNotesDocumentSchema);
}
