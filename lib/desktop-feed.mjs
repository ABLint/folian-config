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
		prerelease: match[4]?.split('.') || [],
	};
}

function comparePrerelease(left, right) {
	if (!left.length && !right.length) return 0;
	if (!left.length) return 1;
	if (!right.length) return -1;
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
