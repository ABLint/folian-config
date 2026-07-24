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
for (const provider of models.providers) {
	assert.equal(typeof provider.id, 'string', 'provider id');
	assert.equal(typeof provider.displayName, 'string', `${provider.id} displayName`);
	assert.ok(['available', 'degraded', 'deprecated', 'hidden'].includes(provider.status), `${provider.id} status`);
	assert.ok(Array.isArray(provider.models), `${provider.id} models array`);
	for (const model of provider.models) {
		assert.equal(model.provider, provider.id, `${model.id} provider matches parent`);
		assert.equal(typeof model.id, 'string', `${model.id} id`);
		assert.equal(typeof model.displayName, 'string', `${model.id} displayName`);
		assert.equal(typeof model.recommended, 'boolean', `${model.id} recommended`);
		assert.equal(typeof model.deprecated, 'boolean', `${model.id} deprecated`);
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

const responseHelper = readFileSync(join(root, 'lib/config-response.ts'), 'utf8');
assert.match(responseHelper, /Cache-Control/);
assert.match(responseHelper, /ETag/);
assert.match(responseHelper, /if-none-match/i);

for (const endpoint of ['models', 'providers', 'releases', 'features', 'release-notes', 'capabilities']) {
	const route = readFileSync(join(root, 'app/v1', endpoint, 'route.ts'), 'utf8');
	assert.match(route, /serveConfigDocument/, `${endpoint} route uses validated response helper`);
	assert.match(route, /force-static/, `${endpoint} route is static`);
}

console.log('Folian configuration documents validated.');
