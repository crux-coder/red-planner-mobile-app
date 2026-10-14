export const actionKinds = ["document", "form", "risk"] as const;
export type ActionKind = (typeof actionKinds)[number];
export interface PendingAction {
	id: string;
	kind: ActionKind;
	title: string;
	description: string;
}
export interface ActionRequired {
	items: PendingAction[];
	unavailable: ActionKind[];
}
export const actionLabels: Record<ActionKind, string> = {
	document: "documents",
	form: "forms",
	risk: "risk assessments",
};
const isKind = (value: unknown): value is ActionKind =>
	actionKinds.some((kind) => kind === value);
export function parseActionRequired(value: unknown): ActionRequired {
	if (
		!value ||
		typeof value !== "object" ||
		!("items" in value) ||
		!("unavailable" in value) ||
		!Array.isArray(value.items) ||
		!Array.isArray(value.unavailable)
	)
		throw new Error("Invalid pending-action response.");
	const items = value.items.map((item: unknown) => {
		if (
			!item ||
			typeof item !== "object" ||
			!("id" in item) ||
			typeof item.id !== "string" ||
			!("kind" in item) ||
			!isKind(item.kind) ||
			!("title" in item) ||
			typeof item.title !== "string" ||
			!("description" in item) ||
			typeof item.description !== "string"
		)
			throw new Error("Invalid pending-action response.");
		return {
			id: item.id,
			kind: item.kind,
			title: item.title,
			description: item.description,
		};
	});
	if (!value.unavailable.every(isKind))
		throw new Error("Invalid pending-action response.");
	return { items, unavailable: value.unavailable };
}
export async function loadActionRequired(
	origin: string | undefined,
	token: string,
	signal?: AbortSignal,
	fetcher: typeof fetch = fetch,
): Promise<ActionRequired> {
	if (!origin) throw new Error("The pending-action API is not configured.");
	const url = new URL(origin);
	if (
		url.protocol !== "https:" ||
		url.username ||
		url.password ||
		url.search ||
		url.hash ||
		url.pathname !== "/"
	)
		throw new Error("The pending-action API must use an HTTPS origin.");
	const response = await fetcher(
		new URL("/api/mobile/action-required", url).toString(),
		{
			method: "GET",
			headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
			credentials: "omit",
			redirect: "error",
			signal,
		},
	);
	if (response.status === 401)
		throw new Error(
			"Your session could not be verified. Please sign in again.",
		);
	if (response.status === 403)
		throw new Error("Your account does not have access to pending actions.");
	if (!response.ok)
		throw new Error("Couldn’t check pending actions. Please try again.");
	return parseActionRequired(await response.json());
}
