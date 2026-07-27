import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const publicDesktopDir = join(root, 'public', 'desktop');
const channels = ['beta', 'stable'];

for (const channel of channels) {
	const filePath = join(publicDesktopDir, channel, 'darwin-arm64.json');
	const feed = JSON.parse(readFileSync(filePath, 'utf8'));
	assert.equal(typeof feed.url, 'string', `${channel} feed URL`);
	assert.match(
		feed.url,
		/^https:\/\/github\.com\/ABLint\/folian-config\/releases\/download\//,
		`${channel} feed points at immutable release assets`
	);
	assert.equal(typeof feed.name, 'string', `${channel} feed version`);
	assert.match(feed.name, /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/, `${channel} feed semver`);
	assert.equal(typeof feed.notes, 'string', `${channel} feed notes`);
	assert.ok(feed.notes.length > 0, `${channel} feed notes populated`);
	assert.equal(Number.isNaN(Date.parse(feed.pub_date)), false, `${channel} feed pub_date`);
}

const nextConfig = readFileSync(join(root, 'next.config.ts'), 'utf8');
assert.match(nextConfig, /source:\s*'\/desktop'/, 'desktop compatibility route exists');
assert.match(
	nextConfig,
	/destination:\s*'\/desktop\/beta\/darwin-arm64\.json'/,
	'desktop compatibility route points to beta feed'
);
assert.match(nextConfig, /application\/json; charset=utf-8/, 'desktop JSON content type configured');
assert.match(nextConfig, /max-age=60, s-maxage=60, stale-while-revalidate=300/, 'channel JSON cache policy configured');

console.log('Folian native desktop feed validated.');
