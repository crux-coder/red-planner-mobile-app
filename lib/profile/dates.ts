// Date-only values must not shift when the device timezone changes.
export function parseProfileDate(value: string): Date | null {
	const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
	if (!match) return null;
	const [, y, m, d] = match.map(Number);
	const date = new Date(y, m - 1, d, 12);
	return date.getFullYear() === y &&
		date.getMonth() === m - 1 &&
		date.getDate() === d
		? date
		: null;
}
export function profileDateValue(date: Date): string {
	return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export function formatProfileDate(value: string): string {
	const date = parseProfileDate(value);
	return date
		? date.toLocaleDateString("en-GB", {
				day: "numeric",
				month: "long",
				year: "numeric",
			})
		: "Not provided";
}
