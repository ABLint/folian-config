import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = join(root, 'data');
const requiredDocuments = [
	'models.json',
	'providers.json',
	'releases.json',
	'features.json',
	'release-notes.json',
	'capabilities.json',
];

function readJson(fileName) {
	return JSON.parse(readFileSync(join(dataDir, fileName), 'utf8'));
}

function assertEnvelope(document, name) {
	assert.equal(typeof document.configurationVersion, 'number', `${name} configurationVersion`);
	assert.ok(Number.isInteger(document.configurationVersion), `${name} configurationVersion integer`);
	assert.ok(document.configurationVersion > 0, `${name} configurationVersion positive`);
	assert.equal(typeof document.publishedAt, 'string', `${name} publishedAt`);
	assert.doesNotThrow(() => new Date(document.publishedAt).toISOString(), `${name} publishedAt date`);
	assert.equal(typeof document.schemaVersion, 'string', `${name} schemaVersion`);
	assert.ok(document.schemaVersion.length > 0, `${name} schemaVersion populated`);
}

function assertCapabilityShape(capabilities, name) {
	for (const key of [
		'streaming',
		'vision',
		'reasoning',
		'toolCalling',
		'jsonMode',
		'promptCaching',
		'temperature',
		'mcpCompatible',
	]) {
		assert.equal(typeof capabilities[key], 'boolean', `${name} capability ${key}`);
	}
	assert.equal(typeof capabilities.contextWindow, 'number', `${name} contextWindow`);
	assert.equal(typeof capabilities.maxOutputTokens, 'number', `${name} maxOutputTokens`);
	assert.ok(capabilities.contextWindow > 0, `${name} positive contextWindow`);
	assert.ok(capabilities.maxOutputTokens > 0, `${name} positive maxOutputTokens`);
}

const seenFiles = new Set(readdirSync(dataDir));
for (const documentName of requiredDocuments) {
	assert.ok(seenFiles.has(documentName), `missing ${documentName}`);
	assertEnvelope(readJson(documentName), documentName);
}

const models = readJson('models.json');
assert.ok(Array.isArray(models.providers), 'models providers array');
assert.ok(models.providers.length > 0, 'models providers populated');
const providerIds = new Set(readJson('providers.json').providers.map((provider) => provider.id));
for (const provider of models.providers) {
	assert.equal(typeof provider.id, 'string', 'provider id');
	assert.ok(providerIds.has(provider.id), `${provider.id} provider exists`);
	assert.equal(typeof provider.displayName, 'string', `${provider.id} displayName`);
	assert.ok(['available', 'degraded', 'deprecated', 'hidden'].includes(provider.status), `${provider.id} status`);
	assert.ok(Array.isArray(provider.models), `${provider.id} models array`);
	const providerModelIds = new Set();
	for (const model of provider.models) {
		assert.equal(model.provider, provider.id, `${model.id} provider matches parent`);
		assert.ok(!providerModelIds.has(model.id), `${provider.id} duplicate model id ${model.id}`);
		providerModelIds.add(model.id);
		assert.equal(typeof model.id, 'string', `${model.id} id`);
		assert.equal(typeof model.displayName, 'string', `${model.id} displayName`);
		assert.equal(typeof model.recommended, 'boolean', `${model.id} recommended`);
		assert.equal(typeof model.deprecated, 'boolean', `${model.id} deprecated`);
		assert.ok(
			[
				'stable',
				'legacy_supported',
				'preview',
				'deprecated',
				'unavailable',
			].includes(model.lifecycleStatus),
			`${model.id} lifecycleStatus`
		);
		assert.equal(typeof model.providerDocumentationUrl, 'string', `${model.id} providerDocumentationUrl`);
		assert.match(model.providerDocumentationUrl, /^https:\/\//, `${model.id} provider docs URL`);
			assert.equal(typeof model.lastVerifiedAt, 'string', `${model.id} lastVerifiedAt`);
			assert.ok(
				[
					'verified',
					'unavailable',
					'permission_required',
					'credentials_missing',
					'documentation_only',
					'failed_validation',
					'verification_skipped',
					'verification_failed',
					'unknown',
				].includes(model.verificationStatus),
				`${model.id} verificationStatus`
			);
		assert.equal(typeof model.minimumFolianVersion, 'string', `${model.id} minimumFolianVersion`);
		assert.ok(
			['supported', 'adapter_limited', 'custom_model_required', 'unverified', 'unsupported'].includes(
				model.compatibilityStatus
			),
			`${model.id} compatibilityStatus`
		);
		assert.ok(Array.isArray(model.recommendedFor), `${model.id} recommendedFor`);
		if (model.recommended) {
			assert.equal(model.deprecated, false, `${model.id} recommended model is not deprecated`);
			assert.ok(['supported', 'adapter_limited'].includes(model.compatibilityStatus), `${model.id} compatible`);
		}
		if (model.lifecycleStatus === 'legacy_supported') {
			assert.equal(model.deprecated, false, `${model.id} legacy-supported model is not deprecated`);
			assert.ok(['supported', 'adapter_limited'].includes(model.compatibilityStatus), `${model.id} legacy-supported compatible`);
		}
		assertCapabilityShape(model.capabilities, model.id);
	}
}

const providers = readJson('providers.json');
assert.ok(Array.isArray(providers.providers), 'providers providers array');
for (const provider of providers.providers) {
	assert.ok(models.providers.some((modelProvider) => modelProvider.id === provider.id), `${provider.id} exists in models`);
	assert.ok(['api_key', 'optional_api_key', 'none'].includes(provider.authMode), `${provider.id} authMode`);
	assert.ok(['hosted', 'aggregator', 'custom', 'local'].includes(provider.endpointType), `${provider.id} endpointType`);
	assert.equal(typeof provider.supportsCustomModelId, 'boolean', `${provider.id} supportsCustomModelId`);
}

const releases = readJson('releases.json');
for (const channel of ['stable', 'beta']) {
	const release = releases.desktop[channel];
	assert.equal(release.channel, channel, `${channel} channel`);
	assert.doesNotThrow(
		() => new Date(release.publishedAt).toISOString(),
		`${channel} publishedAt`
	);
	assert.equal(typeof release.mandatory, 'boolean', `${channel} mandatory`);
	assert.equal(release.manifestUrl, 'https://config.folian.app/v1/releases');
	if (release.status === 'inactive') {
		assert.equal(typeof release.reason, 'string', `${channel} inactive reason`);
		assert.ok(release.reason.length > 0, `${channel} inactive reason populated`);
		assert.match(
			release.nativeFeedUrl,
			new RegExp(`/desktop/${channel}/darwin-arm64\\.json$`),
			`${channel} inactive native feed`
		);
		continue;
	}
	assert.equal(release.status, 'active', `${channel} active release status`);
	assert.match(release.version, /^\d+\.\d+\.\d+/, `${channel} version`);
	assert.match(release.minimumVersion, /^\d+\.\d+\.\d+/, `${channel} minimumVersion`);
	assert.ok(['arm64', 'x64', 'universal'].includes(release.architecture), `${channel} architecture`);
	assert.match(release.minimumMacOSVersion, /^\d+\.\d+/, `${channel} minimum macOS`);
	assert.match(release.dmgUrl, /^https:\/\//, `${channel} DMG URL`);
	assert.match(release.releaseNotesUrl, /^https:\/\//, `${channel} release notes URL`);
	assert.match(release.sha256, /^[a-f0-9]{64}$/, `${channel} SHA-256`);
	assert.ok(Number.isInteger(release.fileSize) && release.fileSize > 0, `${channel} file size`);
	assert.match(
		release.nativeFeedUrl,
		new RegExp(`/desktop/${channel}/darwin-${release.architecture}\\.json$`),
		`${channel} native feed`
	);
}

const responseHelper = readFileSync(join(root, 'lib/config-response.ts'), 'utf8');
assert.match(responseHelper, /Cache-Control/);
assert.match(responseHelper, /ETag/);
assert.match(responseHelper, /Access-Control-Allow-Origin/);
assert.match(responseHelper, /status:\s*503/);
assert.match(responseHelper, /if-none-match/i);
assert.match(responseHelper, /s-maxage=300, stale-while-revalidate=86400/);

for (const endpoint of ['models', 'providers', 'releases', 'features', 'release-notes', 'capabilities']) {
	const route = readFileSync(join(root, 'app/v1', endpoint, 'route.ts'), 'utf8');
	assert.match(route, /serveConfigDocument/, `${endpoint} route uses validated response helper`);
	assert.match(route, /force-static/, `${endpoint} route is static`);
}

const releasesRoute = readFileSync(join(root, 'app/v1/releases/route.ts'), 'utf8');
assert.match(releasesRoute, /releaseConfigCacheControl/, 'releases route uses short release cache policy');

console.log('Folian configuration documents validated.');
