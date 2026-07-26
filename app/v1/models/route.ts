import type { NextRequest } from 'next/server';
import { modelCatalogCacheControl, serveConfigDocument } from '../../../lib/config-response';
import { modelsDocument } from '../../../lib/documents';
import { modelsDocumentSchema } from '../../../lib/schemas';

export const dynamic = 'force-static';

export function GET(request: NextRequest) {
	return serveConfigDocument(request, modelsDocument, modelsDocumentSchema, {
		cacheControl: modelCatalogCacheControl,
	});
}
