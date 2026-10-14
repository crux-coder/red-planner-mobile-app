export const INVALID_LINK =
	"This sign-in link is invalid or has expired. Please request a new link.";

type Exchange = (code: string) => Promise<{
	data: { session: unknown; redirectType?: string | null };
	error: { message: string } | null;
}>;

export function readAuthCode(value: string, redirectUri: string): string {
	let url: URL;
	try {
		url = new URL(value);
	} catch {
		throw new Error(INVALID_LINK);
	}
	const expected = new URL(redirectUri);
	if (
		url.protocol !== expected.protocol ||
		url.host !== expected.host ||
		url.pathname !== expected.pathname ||
		url.username ||
		url.password
	) {
		throw new Error(INVALID_LINK);
	}
	if (
		url.searchParams.has("error") ||
		url.searchParams.has("error_code") ||
		url.searchParams.has("error_description")
	) {
		if (url.searchParams.get("error") === "access_denied")
			throw new Error(
				"Sign-in was cancelled or access was denied. Please try again.",
			);
		throw new Error(INVALID_LINK);
	}
	const codes = url.searchParams.getAll("code");
	if (codes.length !== 1 || !codes[0].trim() || url.hash)
		throw new Error(INVALID_LINK);
	return codes[0];
}

// iOS can deliver the same OAuth return to both Expo Router and the browser.
// Share the exchange so a single-use code is never submitted twice.
export function createAuthCallbackHandler(
	exchange: Exchange,
	redirectUri: string,
) {
	let lastCode: string | undefined;
	let lastResult: Promise<boolean> | undefined;
	return (url: string): Promise<boolean> => {
		const code = readAuthCode(url, redirectUri);
		if (lastCode === code && lastResult) return lastResult;
		lastCode = code;
		lastResult = (async () => {
			const { data, error } = await exchange(code);
			if (error || !data.session) throw new Error(INVALID_LINK);
			return data.redirectType === "PASSWORD_RECOVERY";
		})();
		return lastResult;
	};
}
