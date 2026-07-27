import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = join(root, 'data');
const offline = process.argv.includes('--offline');

const lifecycleStatuses = new Set([
	'stable',
	'legacy_supported',
	'preview',
	'deprecated',
	'unavailable',
]);
const compatibilityStatuses = new Set([
	'supported',
	'adapter_limited',
	'custom_model_required',
	'unverified',
	'unsupported',
]);
const recommendedUseCases = new Set([
	'long_form_writing',
	'manuscript_analysis',
	'structured_extraction',
	'research',
	'low_cost_drafting',
	'high_quality_reasoning',
]);
const capabilityKeys = [
	'streaming',
	'vision',
	'reasoning',
	'toolCalling',
	'jsonMode',
	'promptCaching',
	'temperature',
	'mcpCompatible',
];

const providerApiChecks = [
	{
		id: 'openai',
		enabled: Boolean(process.env.OPENAI_API_KEY) && !offline,
		async listModels() {
			const response = await fetch('https://api.openai.com/v1/models', {
				headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
			});
			if (!response.ok) throw new Error(`OpenAI model list returned ${response.status}`);
			const payload = await response.json();
			return new Set((payload.data ?? []).map((model) => model.id));
		},
	},
	{
		id: 'anthropic',
		enabled: Boolean(process.env.ANTHROPIC_API_KEY) && !offline,
		async listModels() {
			const response = await fetch('https://api.anthropic.com/v1/models', {
				headers: {
					'anthropic-version': '2023-06-01',
					'x-api-key': process.env.ANTHROPIC_API_KEY,
				},
			});
			if (!response.ok) throw new Error(`Anthropic model list returned ${response.status}`);
			const payload = await response.json();
			return new Set((payload.data ?? []).map((model) => model.id));
		},
	},
	{
		id: 'gemini',
		enabled: Boolean(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY) && !offline,
		async listModels() {
			const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
			const response = await fetch(
				`https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`
			);
			if (!response.ok) throw new Error(`Gemini model list returned ${response.status}`);
			const payload = await response.json();
			return new Set(
				(payload.models ?? []).map((model) => String(model.name ?? '').replace(/^models\//, ''))
			);
		},
	},
	{
		id: 'openrouter',
		enabled: (Boolean(process.env.OPENROUTER_API_KEY) || process.env.FOLIAN_AUDIT_OPENROUTER === '1') && !offline,
		async listModels() {
			const headers = process.env.OPENROUTER_API_KEY
				? { Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}` }
				: {};
			const response = await fetch('https://openrouter.ai/api/v1/models', { headers });
			if (!response.ok) throw new Error(`OpenRouter model list returned ${response.status}`);
			const payload = await response.json();
			return new Set((payload.data ?? []).map((model) => model.id));
		},
	},
];

function readJson(fileName) {
	return JSON.parse(readFileSync(join(dataDir, fileName), 'utf8'));
}

function assertIsoDateTime(value, label) {
	assert.equal(typeof value, 'string', `${label} must be a string`);
	assert.doesNotThrow(() => new Date(value).toISOString(), `${label} must be ISO-8601`);
	assert.equal(new Date(value).toISOString(), value, `${label} must be normalized ISO-8601`);
}

function assertDate(value, label) {
	assert.equal(typeof value, 'string', `${label} must be a string`);
	assert.match(value, /^\d{4}-\d{2}-\d{2}$/, `${label} must be YYYY-MM-DD`);
	assert.doesNotThrow(() => new Date(`${value}T00:00:00.000Z`).toISOString(), `${label} must be valid`);
}

function assertCapabilities(capabilities, label) {
	assert.equal(typeof capabilities, 'object', `${label} capabilities`);
	for (const key of capabilityKeys) {
		assert.equal(typeof capabilities[key], 'boolean', `${label} capability ${key}`);
	}
	assert.ok(Number.isInteger(capabilities.contextWindow), `${label} contextWindow integer`);
	assert.ok(capabilities.contextWindow > 0, `${label} contextWindow positive`);
	assert.ok(Number.isInteger(capabilities.maxOutputTokens), `${label} maxOutputTokens integer`);
	assert.ok(capabilities.maxOutputTokens > 0, `${label} maxOutputTokens positive`);
}

function auditLocalCatalogue() {
	const models = readJson('models.json');
	const providers = readJson('providers.json');
	assert.ok(Number.isInteger(models.configurationVersion), 'models configurationVersion integer');
	assert.ok(models.configurationVersion > 0, 'models configurationVersion positive');
	assertIsoDateTime(models.publishedAt, 'models publishedAt');
	assert.equal(typeof models.schemaVersion, 'string', 'models schemaVersion');
	assert.ok(models.schemaVersion.length > 0, 'models schemaVersion populated');

	const providerIds = new Set(providers.providers.map((provider) => provider.id));
	const allModelIds = new Map();
	for (const provider of models.providers) {
		assert.ok(providerIds.has(provider.id), `${provider.id} exists in providers.json`);
		assert.ok(['available', 'degraded', 'deprecated', 'hidden'].includes(provider.status), `${provider.id} status`);
		const idsForProvider = new Set();
		for (const model of provider.models) {
			assert.equal(model.provider, provider.id, `${model.id} provider matches parent`);
			assert.ok(!idsForProvider.has(model.id), `${provider.id} duplicate model id ${model.id}`);
			idsForProvider.add(model.id);
			allModelIds.set(`${provider.id}:${model.id}`, model);
			assert.equal(typeof model.displayName, 'string', `${model.id} displayName`);
			assert.equal(typeof model.recommended, 'boolean', `${model.id} recommended`);
			assert.equal(typeof model.deprecated, 'boolean', `${model.id} deprecated`);
			assert.ok(lifecycleStatuses.has(model.lifecycleStatus), `${model.id} lifecycleStatus`);
			assert.equal(model.deprecated, model.lifecycleStatus === 'deprecated', `${model.id} deprecated flag matches lifecycle`);
			if (model.releasedAt) assertDate(model.releasedAt, `${model.id} releasedAt`);
			if (model.deprecatedAt) assertDate(model.deprecatedAt, `${model.id} deprecatedAt`);
			assert.match(model.providerDocumentationUrl, /^https:\/\//, `${model.id} providerDocumentationUrl`);
			assertIsoDateTime(model.lastVerifiedAt, `${model.id} lastVerifiedAt`);
			assert.equal(typeof model.minimumFolianVersion, 'string', `${model.id} minimumFolianVersion`);
			assert.ok(compatibilityStatuses.has(model.compatibilityStatus), `${model.id} compatibilityStatus`);
			for (const useCase of model.recommendedFor ?? []) {
				assert.ok(recommendedUseCases.has(useCase), `${model.id} recommendedFor ${useCase}`);
			}
			assertCapabilities(model.capabilities, model.id);
			if (model.recommended) {
				assert.equal(model.deprecated, false, `${model.id} recommended model must not be deprecated`);
				assert.notEqual(model.lifecycleStatus, 'unavailable', `${model.id} recommended model must be available`);
				assert.ok(
					['supported', 'adapter_limited'].includes(model.compatibilityStatus),
					`${model.id} recommended model must be Folian-compatible`
				);
				assert.ok((model.recommendedFor ?? []).length > 0, `${model.id} recommended model has use cases`);
			}
			if (model.lifecycleStatus === 'legacy_supported') {
				assert.equal(model.deprecated, false, `${model.id} legacy-supported model must not be deprecated`);
				assert.notEqual(model.recommended, true, `${model.id} legacy-supported model should not be first-choice recommended`);
				assert.ok(
					model.compatibilityStatus === 'supported' || model.compatibilityStatus === 'adapter_limited',
					`${model.id} legacy-supported model must remain Folian-compatible`
				);
			}
		}
	}

	for (const provider of models.providers) {
		for (const model of provider.models) {
			if (!model.replacementModelId) continue;
			assert.ok(
				allModelIds.has(`${provider.id}:${model.replacementModelId}`),
				`${model.id} replacement ${model.replacementModelId} exists for ${provider.id}`
			);
		}
	}

	const responseHelper = readFileSync(join(root, 'lib/config-response.ts'), 'utf8');
	assert.match(responseHelper, /ETag/, 'response helper sets ETag');
	assert.match(responseHelper, /Access-Control-Allow-Origin/, 'response helper sets CORS');
	assert.match(responseHelper, /status:\s*503/, 'invalid configuration returns safe 503');
	assert.match(
		responseHelper,
		/public, max-age=300, s-maxage=300, stale-while-revalidate=86400/,
		'model catalogue cache policy supports fast publication'
	);
	const modelsRoute = readFileSync(join(root, 'app/v1/models/route.ts'), 'utf8');
	assert.match(modelsRoute, /modelCatalogCacheControl/, 'models route uses model catalogue cache policy');

	return { models, providerCount: models.providers.length };
}

async function auditProviderApi(modelDocument) {
	const rows = [];
	for (const check of providerApiChecks) {
		if (!check.enabled) {
			rows.push({ provider: check.id, status: 'skipped', detail: 'No credential or explicit audit flag supplied.' });
			continue;
		}
		try {
			const listedIds = await check.listModels();
			const provider = modelDocument.providers.find((entry) => entry.id === check.id);
			const missing = (provider?.models ?? [])
				.filter((model) => !model.deprecated && model.compatibilityStatus !== 'custom_model_required')
				.filter((model) => !listedIds.has(model.id))
				.map((model) => model.id);
			assert.deepEqual(missing, [], `${check.id} official API missing catalogue IDs: ${missing.join(', ')}`);
			rows.push({ provider: check.id, status: 'verified', detail: `${listedIds.size} model IDs returned.` });
		} catch (error) {
			rows.push({ provider: check.id, status: 'failed', detail: error.message });
			throw error;
		}
	}
	return rows;
}

const { models, providerCount } = auditLocalCatalogue();
const apiRows = await auditProviderApi(models);

console.log('Folian model catalogue audit passed.');
console.log(`Providers checked locally: ${providerCount}`);
for (const provider of models.providers) {
	const active = provider.models.filter((model) => !model.deprecated).length;
	const deprecated = provider.models.filter((model) => model.deprecated).length;
	console.log(`- ${provider.id}: ${active} active, ${deprecated} deprecated`);
}
console.log('Provider API checks:');
for (const row of apiRows) {
	console.log(`- ${row.provider}: ${row.status} (${row.detail})`);
}
