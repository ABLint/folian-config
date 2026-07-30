import assert from 'node:assert/strict';
import {
	compareVersions,
	parseFolianVersionFromUserAgent,
	shouldOfferDesktopUpdate,
} from '../lib/desktop-feed.mjs';

assert.equal(
	parseFolianVersionFromUserAgent(
		'Folian/0.1.0-beta.7 CFNetwork/3860.600.21 Darwin/25.5.0'
	),
	'0.1.0-beta.7'
);
assert.equal(parseFolianVersionFromUserAgent('curl/8.7.1'), null);
assert.equal(compareVersions('0.1.0-beta.5', '0.1.0-beta.7'), -1);
assert.equal(compareVersions('0.1.0-beta.7', '0.1.0-beta.7'), 0);
assert.equal(compareVersions('0.1.0-beta.8', '0.1.0-beta.7'), 1);
assert.equal(compareVersions('0.1.0-beta.10', '0.1.0-beta.7'), 1);
assert.equal(compareVersions('0.1.0-beta.9', '0.1.0-beta.10'), -1);
assert.equal(compareVersions('0.1.0', '0.1.0-beta.7'), 1);
assert.equal(shouldOfferDesktopUpdate('0.1.0-beta.5', '0.1.0-beta.7'), true);
assert.equal(shouldOfferDesktopUpdate('0.1.0-beta.7', '0.1.0-beta.7'), false);
assert.equal(shouldOfferDesktopUpdate('0.1.0-beta.8', '0.1.0-beta.7'), false);
assert.equal(shouldOfferDesktopUpdate('0.1.0-beta.9', '0.1.0-beta.10'), true);
assert.equal(shouldOfferDesktopUpdate('0.1.0-beta.10', '0.1.0-beta.10'), false);
assert.equal(shouldOfferDesktopUpdate(null, '0.1.0-beta.7'), true);

console.log('Folian version-aware desktop feed tests passed.');
