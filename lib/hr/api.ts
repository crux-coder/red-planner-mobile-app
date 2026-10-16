import { validHrResponse } from "./response.ts";
export function hrOrigin(origin: string | undefined, development = false) {
	if (!origin) throw new Error("The HR service is not configured.");
	const url = new URL(origin);
	const octets = url.hostname.split(".").map(Number);
	const privateIP =
		octets.length === 4 &&
		octets.every((n) => Number.isInteger(n) && n >= 0 && n <= 255) &&
		(octets[0] === 10 ||
			(octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) ||
			(octets[0] === 192 && octets[1] === 168));
	const local =
		development &&
		url.protocol === "http:" &&
		(privateIP || ["localhost", "127.0.0.1"].includes(url.hostname));
	if (
		(!local && url.protocol !== "https:") ||
		url.username ||
		url.password ||
		url.search ||
		url.hash ||
		url.pathname !== "/"
	)
		throw new Error("The HR service must use an HTTPS origin.");
	return url.origin;
}
export async function hrRequest<T>(
	origin: string | undefined,
	token: string,
	path: string,
	options: {
		method?: string;
		body?: unknown;
		signal?: AbortSignal;
		development?: boolean;
		fetcher?: typeof fetch;
	} = {},
): Promise<T> {
	if (
		!/^\/(context|hr|hr-documents|my-forms|forms|profile)(\/|\?|$)/.test(
			path,
		) ||
		path.includes("..") ||
		path.includes("#") ||
		path.includes("\\")
	)
		throw new Error("Invalid HR endpoint.");
	if (!token) throw new Error("Please sign in again.");
	const multipart =
		typeof FormData !== "undefined" && options.body instanceof FormData;
	const response = await (options.fetcher ?? fetch)(
		`${hrOrigin(origin, options.development)}/api/mobile/employee${path}`,
		{
			method: options.method ?? "GET",
			headers: {
				Authorization: `Bearer ${token}`,
				Accept: "application/json",
				...(options.body !== undefined && !multipart
					? { "Content-Type": "application/json" }
					: {}),
			},
			body: multipart
				? (options.body as FormData)
				: options.body === undefined
					? undefined
					: JSON.stringify(options.body),
			credentials: "omit",
			redirect: "error",
			signal: options.signal,
		},
	);
	const payload = await response.json().catch(() => null);
	if (response.status === 401)
		throw new Error("Your session expired. Please sign in again.");
	if (response.status === 404 && !payload)
		throw new Error("Employee HR is not available on this server yet.");
	if (!response.ok)
		throw new Error(
			typeof payload?.error === "string"
				? payload.error
				: payload?.error?.message ||
					"Unable to complete this HR request. Please try again.",
		);
	if (!validHrResponse(path, options.method ?? "GET", payload))
		throw new Error("The HR service returned an invalid response.");
	return payload as T;
}
