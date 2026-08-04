import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = join(root, 'data');
const args = new Set(process.argv.slice(2));
const offline = args.has('--offline');
const liveWorkflows = args.has('--live-workflows');
const requireLive = args.has('--require-live') || process.env.FOLIAN_REQUIRE_LIVE_AI === '1';
const providerArgument = [...args].find((argument) => argument.startsWith('--provider='));
const selectedProvider = providerArgument?.slice('--provider='.length) ?? null;
const delayMs = Math.max(0, Number(process.env.FOLIAN_MODEL_AUDIT_DELAY_MS ?? '1250') || 0);
const anthropicCandidateModelIds = [...new Set(
	(process.env.FOLIAN_ANTHROPIC_CANDIDATE_MODELS ?? '')
		.split(',')
		.map((value) => value.trim())
		.filter(Boolean)
)];
const sleep = (duration) => new Promise((resolve) => setTimeout(resolve, duration));

const lifecycleStatuses = new Set(['stable', 'legacy_supported', 'preview', 'deprecated', 'unavailable']);
const compatibilityStatuses = new Set(['supported', 'adapter_limited', 'custom_model_required', 'unverified', 'unsupported']);
const verificationStatuses = new Set([
	'verified',
	'unavailable',
	'permission_required',
	'credentials_missing',
	'documentation_only',
	'failed_validation',
	// Legacy values remain valid until the next live-verified publication replaces them.
	'verification_skipped',
	'verification_failed',
	'unknown',
]);
const recommendedUseCases = new Set(['long_form_writing', 'manuscript_analysis', 'structured_extraction', 'research', 'low_cost_drafting', 'high_quality_reasoning']);
const capabilityKeys = ['streaming', 'vision', 'reasoning', 'toolCalling', 'jsonMode', 'promptCaching', 'temperature', 'mcpCompatible'];

class ProviderAuditError extends Error {
	constructor(outcome, message, details = {}) {
		super(message);
		this.name = 'ProviderAuditError';
		this.outcome = outcome;
		this.details = details;
	}
}

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
	for (const key of capabilityKeys) assert.equal(typeof capabilities[key], 'boolean', `${label} capability ${key}`);
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
			assert.ok(verificationStatuses.has(model.verificationStatus), `${model.id} verificationStatus`);
			assert.equal(typeof model.minimumFolianVersion, 'string', `${model.id} minimumFolianVersion`);
			assert.ok(compatibilityStatuses.has(model.compatibilityStatus), `${model.id} compatibilityStatus`);
			for (const useCase of model.recommendedFor ?? []) assert.ok(recommendedUseCases.has(useCase), `${model.id} recommendedFor ${useCase}`);
			assertCapabilities(model.capabilities, model.id);
			if (model.recommended) {
				assert.equal(model.deprecated, false, `${model.id} recommended model must not be deprecated`);
				assert.notEqual(model.lifecycleStatus, 'unavailable', `${model.id} recommended model must be available`);
				assert.ok(['supported', 'adapter_limited'].includes(model.compatibilityStatus), `${model.id} recommended model must be Folian-compatible`);
				assert.ok((model.recommendedFor ?? []).length > 0, `${model.id} recommended model has use cases`);
			}
			if (model.lifecycleStatus === 'legacy_supported') {
				assert.equal(model.deprecated, false, `${model.id} legacy-supported model must not be deprecated`);
				assert.notEqual(model.recommended, true, `${model.id} legacy-supported model should not be first-choice recommended`);
				assert.ok(['supported', 'adapter_limited'].includes(model.compatibilityStatus), `${model.id} legacy-supported model must remain Folian-compatible`);
			}
		}
	}

	for (const provider of models.providers) {
		for (const model of provider.models) {
			if (!model.replacementModelId) continue;
			assert.ok(allModelIds.has(`${provider.id}:${model.replacementModelId}`), `${model.id} replacement ${model.replacementModelId} exists for ${provider.id}`);
		}
	}

	const responseHelper = readFileSync(join(root, 'lib/config-response.ts'), 'utf8');
	assert.match(responseHelper, /ETag/, 'response helper sets ETag');
	assert.match(responseHelper, /Access-Control-Allow-Origin/, 'response helper sets CORS');
	assert.match(responseHelper, /status:\s*503/, 'invalid configuration returns safe 503');
	assert.match(responseHelper, /public, max-age=300, s-maxage=300, stale-while-revalidate=86400/, 'model catalogue cache policy supports fast publication');
	const modelsRoute = readFileSync(join(root, 'app/v1/models/route.ts'), 'utf8');
	assert.match(modelsRoute, /modelCatalogCacheControl/, 'models route uses model catalogue cache policy');
	return { models, providerCount: models.providers.length };
}

function providerCredential(provider) {
	return provider === 'anthropic' ? process.env.ANTHROPIC_API_KEY?.trim() || null : process.env.OPENAI_API_KEY?.trim() || null;
}

function mapHttpOutcome(status) {
	if (status === 401 || status === 403) return 'permission_required';
	if (status === 404) return 'unavailable';
	return 'failed_validation';
}

async function providerResponse(response, provider, stage) {
	const requestId = response.headers.get('request-id') ?? response.headers.get('x-request-id') ?? null;
	if (response.ok) return { payload: await response.json(), requestId };
	const detail = await response.text().catch(() => 'No provider response body.');
	throw new ProviderAuditError(mapHttpOutcome(response.status), `${provider} ${stage} returned HTTP ${response.status}.`, {
		status: response.status,
		requestId,
		detail: detail.slice(0, 500),
	});
}

async function listAnthropicModels(apiKey) {
	const models = [];
	let afterId = null;
	for (let page = 0; page < 20; page += 1) {
		const url = new URL('https://api.anthropic.com/v1/models');
		url.searchParams.set('limit', '100');
		if (afterId) url.searchParams.set('after_id', afterId);
		const response = await fetch(url, {
			headers: { 'anthropic-version': '2023-06-01', 'x-api-key': apiKey },
		});
		const { payload } = await providerResponse(response, 'Anthropic', 'Models API');
		models.push(...(Array.isArray(payload.data) ? payload.data : []));
		if (!payload.has_more) return models;
		afterId = payload.last_id;
		if (typeof afterId !== 'string' || !afterId) throw new ProviderAuditError('failed_validation', 'Anthropic Models API response reported more pages without a last_id.');
	}
	throw new ProviderAuditError('failed_validation', 'Anthropic Models API pagination exceeded the audit safety limit.');
}

async function listOpenAiModels(apiKey) {
	const response = await fetch('https://api.openai.com/v1/models', { headers: { Authorization: `Bearer ${apiKey}` } });
	const { payload } = await providerResponse(response, 'OpenAI', 'Models API');
	return Array.isArray(payload.data) ? payload.data : [];
}

function textFromAnthropicResponse(payload) {
	const content = Array.isArray(payload.content) ? payload.content : [];
	return content.flatMap((block) => block && typeof block === 'object' && block.type === 'text' && typeof block.text === 'string' ? [block.text] : []).join('\n').trim();
}

const basicReadySchema = {
	type: 'object',
	properties: { ready: { type: 'boolean' }, message: { type: 'string' } },
	required: ['ready', 'message'],
	additionalProperties: false,
};
const chapterBriefSchema = {
	type: 'object',
	properties: { content: { type: 'string' } },
	required: ['content'],
	additionalProperties: false,
};
const sceneNotesSchema = {
	type: 'object',
	properties: {
		sceneGoal: { anyOf: [{ type: 'string' }, { type: 'null' }] },
		revealBoundary: { anyOf: [{ type: 'string' }, { type: 'null' }] },
		charactersPresent: { type: 'array', items: { type: 'string' } },
		summary: { anyOf: [{ type: 'string' }, { type: 'null' }] },
		revisionNotes: { anyOf: [{ type: 'string' }, { type: 'null' }] },
		structuralRecommendation: { type: 'string', enum: ['continue_chapter', 'close_chapter', 'unclear'] },
		explanation: { type: 'string' },
	},
	required: ['sceneGoal', 'revealBoundary', 'charactersPresent', 'summary', 'revisionNotes', 'structuralRecommendation', 'explanation'],
	additionalProperties: false,
};

async function sendAnthropicMessage({ apiKey, model, stage, system, user, schema = null, expectedText = null }) {
	const startedAt = Date.now();
	const response = await fetch('https://api.anthropic.com/v1/messages', {
		method: 'POST',
		headers: {
			'x-api-key': apiKey,
			'anthropic-version': '2023-06-01',
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({
			model,
			max_tokens: 256,
			system,
			messages: [{ role: 'user', content: user }],
			...(schema ? { output_config: { format: { type: 'json_schema', schema } } } : {}),
		}),
	});
	const { payload, requestId } = await providerResponse(response, 'Anthropic', `${stage} request`);
	const text = textFromAnthropicResponse(payload);
	if (!text) throw new ProviderAuditError('failed_validation', `${model} returned no text for ${stage}.`, { requestId });
	if (expectedText && text !== expectedText) throw new ProviderAuditError('failed_validation', `${model} returned an unexpected ${stage} response.`, { requestId });
	if (schema) {
		try {
			JSON.parse(text);
		} catch {
			throw new ProviderAuditError('failed_validation', `${model} returned invalid JSON for ${stage}.`, { requestId });
		}
	}
	if (!payload.usage || typeof payload.usage.input_tokens !== 'number' || typeof payload.usage.output_tokens !== 'number') {
		throw new ProviderAuditError('failed_validation', `${model} did not return token usage for ${stage}.`, { requestId });
	}
	if (!requestId || typeof payload.stop_reason !== 'string') {
		throw new ProviderAuditError('failed_validation', `${model} did not return request metadata for ${stage}.`, { requestId });
	}
	return {
		stage,
		requestId,
		latencyMs: Date.now() - startedAt,
		inputTokens: payload.usage.input_tokens,
		outputTokens: payload.usage.output_tokens,
		stopReason: payload.stop_reason,
	};
}

async function validateAnthropicFolianWorkflows(apiKey, model) {
	const checks = [
		{
			stage: 'plain_completion',
			system: 'Perform a minimal Folian provider readiness check. Follow the response instruction exactly.',
			user: 'Reply with exactly: FOLIAN_COMPLETION_READY',
			expectedText: 'FOLIAN_COMPLETION_READY',
		},
		{
			stage: 'structured_output',
			system: 'Perform a minimal Folian structured-output readiness check.',
			user: 'Return ready true and message FOLIAN_STRUCTURED_READY in the required response object.',
			schema: basicReadySchema,
		},
		{
			stage: 'chapter_brief',
			system: 'Perform Folian’s production Chapter Brief contract readiness check.',
			user: 'Return a concise Chapter Brief response object. Its content must be a useful chapter brief.',
			schema: chapterBriefSchema,
		},
		{
			stage: 'manuscript_continuation',
			system: 'You are Folian. Write manuscript-ready prose only, without planning notes or Markdown headings.',
			user: 'Continue this synthetic scene in two concise paragraphs. Do not use real manuscript content.',
		},
		{
			stage: 'scene_notes',
			system: 'Perform Folian’s production Scene Notes contract readiness check.',
			user: 'Return a complete Scene Notes response object for a synthetic scene.',
			schema: sceneNotesSchema,
		},
	];
	const results = [];
	for (const check of checks) {
		results.push(await sendAnthropicMessage({ apiKey, model, ...check }));
		if (delayMs > 0) await sleep(delayMs);
	}
	return results;
}

async function auditProviderApi(modelDocument) {
	const rows = [];
	const providers = modelDocument.providers.filter((provider) => !selectedProvider || provider.id === selectedProvider);
	if (selectedProvider && !providers.length) throw new Error(`Unknown configured provider: ${selectedProvider}`);
	for (const provider of providers) {
		const credential = providerCredential(provider.id);
		const publishedModels = provider.models.filter((model) => !model.deprecated && model.compatibilityStatus === 'supported');
		const auditModels = provider.id === 'anthropic'
			? [
				...publishedModels,
				...anthropicCandidateModelIds
					.filter((candidate) => !publishedModels.some((model) => model.id === candidate))
					.map((id) => ({ id, candidate: true })),
			]
			: publishedModels;
		if (offline) {
			rows.push({ provider: provider.id, status: 'documentation_only', detail: 'Offline audit requested. No provider network calls were made.', models: [] });
			continue;
		}
		if (!credential) {
			const row = { provider: provider.id, status: 'credentials_missing', detail: 'No provider API key was supplied.', models: auditModels.map((model) => ({ model: model.id, status: 'credentials_missing', candidate: Boolean(model.candidate) })) };
			rows.push(row);
			continue;
		}
		try {
			const listed = provider.id === 'anthropic' ? await listAnthropicModels(credential) : await listOpenAiModels(credential);
			const listedIds = new Set(listed.map((model) => model.id).filter((id) => typeof id === 'string'));
			const availableModelIds = [...listedIds].sort();
			const modelRows = [];
			for (const model of auditModels) {
				if (!listedIds.has(model.id)) {
					modelRows.push({ model: model.id, status: 'unavailable', detail: 'The official Models API did not list this model for the supplied account.', candidate: Boolean(model.candidate) });
					continue;
				}
				const requireAnthropicWorkflowValidation = provider.id === 'anthropic' && (liveWorkflows || requireLive);
				if (!requireAnthropicWorkflowValidation) {
					modelRows.push({ model: model.id, status: 'verified', detail: 'Available through the official Models API.', candidate: Boolean(model.candidate) });
					continue;
				}
				try {
					const workflowResults = await validateAnthropicFolianWorkflows(credential, model.id);
					modelRows.push({ model: model.id, status: 'verified', detail: 'Models API and five Folian production-shaped request contracts passed.', workflowResults, candidate: Boolean(model.candidate) });
				} catch (error) {
					const auditError = error instanceof ProviderAuditError ? error : new ProviderAuditError('failed_validation', error instanceof Error ? error.message : 'Unknown workflow validation failure.');
					modelRows.push({ model: model.id, status: auditError.outcome, detail: auditError.message, candidate: Boolean(model.candidate), ...auditError.details });
				}
			}
			const failed = modelRows.filter((row) => row.status !== 'verified');
			rows.push({ provider: provider.id, status: failed.length ? 'failed_validation' : 'verified', detail: `${listedIds.size} model IDs returned by the official Models API.`, models: modelRows, availableModelIds });
		} catch (error) {
			const auditError = error instanceof ProviderAuditError ? error : new ProviderAuditError('failed_validation', error instanceof Error ? error.message : 'Unknown provider audit failure.');
			rows.push({ provider: provider.id, status: auditError.outcome, detail: auditError.message, models: [] });
		}
	}
	return rows;
}

const { models, providerCount } = auditLocalCatalogue();
const apiRows = await auditProviderApi(models);
const liveRows = apiRows.filter((row) => row.status === 'verified');
const verificationComplete = apiRows.length > 0 && liveRows.length === apiRows.length;

console.log('Folian model catalogue schema audit passed.');
console.log(`Live provider verification: ${verificationComplete ? 'verified' : 'incomplete'}`);
console.log(`Providers checked locally: ${providerCount}`);
for (const provider of models.providers) {
	const active = provider.models.filter((model) => !model.deprecated).length;
	const deprecated = provider.models.filter((model) => model.deprecated).length;
	console.log(`- ${provider.id}: ${active} active, ${deprecated} deprecated`);
}
console.log('Provider API checks:');
for (const row of apiRows) {
	console.log(`- ${row.provider}: ${row.status} (${row.detail})`);
	if (row.availableModelIds) console.log(`  - account models: ${row.availableModelIds.join(', ')}`);
	for (const model of row.models ?? []) console.log(`  - ${model.model}: ${model.status} (${model.detail ?? 'No live verification was performed.'})`);
}
if (!verificationComplete) {
	console.log('LIVE_PROVIDER_VERIFICATION_INCOMPLETE');
	if (requireLive) {
		const requiredProviders = selectedProvider ? [selectedProvider] : ['anthropic'];
		const failedProviders = apiRows.filter((row) => requiredProviders.includes(row.provider) && row.status !== 'verified');
		console.error(`LIVE_PROVIDER_VERIFICATION_FAILED: ${failedProviders.map((row) => `${row.provider} (${row.status})`).join(', ') || 'required provider did not complete verification'}`);
		process.exitCode = 1;
	}
} else {
	console.log('LIVE_PROVIDER_VERIFICATION_PASSED');
}
