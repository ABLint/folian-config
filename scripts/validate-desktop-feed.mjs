import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const desktopDataDir = join(root, 'data', 'desktop');
const channels = ['beta'];

for (const channel of channels) {
	const filePath = join(desktopDataDir, channel, 'darwin-arm64.json');
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

const betaPublicFilePath = join(root, 'public', 'desktop', 'beta', 'darwin-arm64.json');
assert.equal(
	existsSync(betaPublicFilePath),
	false,
	'beta feed has one canonical source under data/desktop'
);
const stableFilePath = join(root, 'public', 'desktop', 'stable', 'darwin-arm64.json');
assert.equal(existsSync(stableFilePath), false, 'stable channel does not publish a beta feed file');
const stableRoute = readFileSync(
	join(root, 'app/desktop/stable/darwin-arm64.json/route.ts'),
	'utf8'
);
assert.match(stableRoute, /status:\s*'inactive'/, 'stable native feed returns inactive status');
assert.match(stableRoute, /status:\s*404/, 'stable native feed returns 404 until stable release exists');
assert.match(
	stableRoute,
	/max-age=60, s-maxage=60, stale-while-revalidate=300/,
	'stable inactive route uses short cache policy'
);

const betaRoute = readFileSync(
	join(root, 'app/desktop/beta/darwin-arm64.json/route.ts'),
	'utf8'
);
assert.match(betaRoute, /status:\s*204/, 'current beta client receives no-update response');
assert.match(betaRoute, /shouldOfferDesktopUpdate/, 'beta route compares installed and available versions');
assert.match(betaRoute, /private, no-store/, 'version-aware beta responses are not shared across clients');
assert.match(betaRoute, /Vary:\s*'User-Agent'/, 'version-aware beta response varies by app version header');

const nextConfig = readFileSync(join(root, 'next.config.ts'), 'utf8');
assert.match(nextConfig, /source:\s*'\/desktop'/, 'desktop compatibility route exists');
assert.match(
	nextConfig,
	/destination:\s*'\/desktop\/beta\/darwin-arm64\.json'/,
	'desktop compatibility route points to beta feed'
);
assert.match(nextConfig, /application\/json; charset=utf-8/, 'desktop JSON content type configured');
assert.match(nextConfig, /max-age=60, s-maxage=60, stale-while-revalidate=300/, 'inactive channel cache policy configured');
assert.match(nextConfig, /source:\s*'\/desktop\/beta\/:feed\*\.json'/, 'beta feed has a dedicated header policy');
assert.match(nextConfig, /private, no-store/, 'version-aware beta feed is not stored in shared caches');

console.log('Folian native desktop feed validated.');
