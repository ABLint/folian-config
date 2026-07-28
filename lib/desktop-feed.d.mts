export function parseFolianVersionFromUserAgent(userAgent: string | null): string | null;
export function compareVersions(leftValue: string, rightValue: string): number | null;
export function shouldOfferDesktopUpdate(
	installedVersion: string | null,
	availableVersion: string
): boolean;
