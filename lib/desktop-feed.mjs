const VERSION_PATTERN = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/;

export function parseFolianVersionFromUserAgent(userAgent) {
	const match = String(userAgent || '').match(/(?:^|\s)Folian\/([^\s]+)/);
	return match?.[1] || null;
}

function parseVersion(value) {
	const match = String(value || '').match(VERSION_PATTERN);
	if (!match) return null;
	return {
		core: [Number(match[1]), Number(match[2]), Number(match[3])],
		// Folian's historical beta.N-rc.M form means a candidate for beta.N.
		// Split only that legacy spelling; preserve ordinary SemVer identifiers.
		prerelease: match[4]?.replace(/^(beta\.\d+)-rc(?=\.|$)/i, '$1.rc').split('.') || [],
	};
}

function comparePrerelease(left, right) {
	if (!left.length && !right.length) return 0;
	if (!left.length) return 1;
	if (!right.length) return -1;
	// A Folian beta.N-rc.M precedes the corresponding beta.N release.
	if (left[0] === 'beta' && right[0] === 'beta' && left[1] === right[1] && /^\d+$/.test(left[1] || '')) {
		if (left.length === 2 && right[2] === 'rc') return 1;
		if (right.length === 2 && left[2] === 'rc') return -1;
	}
	const length = Math.max(left.length, right.length);
	for (let index = 0; index < length; index += 1) {
		const leftPart = left[index];
		const rightPart = right[index];
		if (leftPart === undefined) return -1;
		if (rightPart === undefined) return 1;
		if (leftPart === rightPart) continue;
		const leftNumber = /^\d+$/.test(leftPart) ? Number(leftPart) : null;
		const rightNumber = /^\d+$/.test(rightPart) ? Number(rightPart) : null;
		if (leftNumber !== null && rightNumber !== null) return leftNumber < rightNumber ? -1 : 1;
		if (leftNumber !== null) return -1;
		if (rightNumber !== null) return 1;
		return leftPart < rightPart ? -1 : 1;
	}
	return 0;
}

export function compareVersions(leftValue, rightValue) {
	const left = parseVersion(leftValue);
	const right = parseVersion(rightValue);
	if (!left || !right) return null;
	for (let index = 0; index < left.core.length; index += 1) {
		if (left.core[index] !== right.core[index]) {
			return left.core[index] < right.core[index] ? -1 : 1;
		}
	}
	return comparePrerelease(left.prerelease, right.prerelease);
}

export function shouldOfferDesktopUpdate(installedVersion, availableVersion) {
	if (!installedVersion) return true;
	const comparison = compareVersions(installedVersion, availableVersion);
	return comparison === null ? true : comparison < 0;
}
