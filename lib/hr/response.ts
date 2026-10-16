// Validate response envelopes before rendering. Invalid/mismatched deployments
// must surface an error instead of empty HR data or a render-time crash.
const object = (value: unknown): value is Record<string, unknown> =>
	Boolean(value) && typeof value === "object" && !Array.isArray(value);
const strings = (value: unknown, keys: string[]) =>
	object(value) && keys.every((key) => typeof value[key] === "string");
const rows = (value: unknown, keys: string[]) =>
	Array.isArray(value) && value.every((row) => strings(row, keys));
export function validHrResponse(
	path: string,
	method: string,
	value: unknown,
): boolean {
	if (!object(value)) return false;
	const endpoint = path.split("?")[0];
	if (endpoint === "/profile" && method === "GET")
		return (
			strings(value.employee, ["id", "user_id"]) &&
			object(value.employee) &&
			(value.employee.qualifications === undefined ||
				rows(value.employee.qualifications, ["id", "name"])) &&
			(value.employee.absence_policy_assignments === undefined ||
				rows(value.employee.absence_policy_assignments, [
					"id",
					"effective_from",
				]))
		);
	if (endpoint === "/profile/countries")
		return rows(value.countries, ["id", "name"]);
	if (endpoint === "/profile/emergency-contacts" && method === "GET")
		return rows(value.contacts, ["id", "first_name"]);
	if (endpoint === "/profile/clothing") return object(value.sizes);
	if (endpoint === "/profile/documents" && method === "GET")
		return (
			rows(value.documents, ["id", "original_filename"]) &&
			rows(value.requirements, ["id", "status"])
		);
	if (endpoint === "/profile/training" && method === "GET")
		return (
			rows(value.records, ["id", "kind"]) &&
			Array.isArray(value.records) &&
			value.records.every(
				(record) =>
					object(record) &&
					Array.isArray(record.attachments) &&
					record.attachments.every(
						(attachment) =>
							object(attachment) &&
							strings(attachment.document, ["id", "original_filename"]),
					),
			) &&
			rows(value.requirements, ["kind", "name"])
		);
	if (endpoint === "/profile/dbs-checks")
		return (
			rows(value.checks, ["id", "check_date"]) &&
			Array.isArray(value.checks) &&
			value.checks.every(
				(check) =>
					object(check) && strings(check.document, ["id", "original_filename"]),
			)
		);
	if (method !== "GET") return true; // Mutations have several documented outcome envelopes.
	if (endpoint === "/context")
		return value.employee === null || strings(value.employee, ["id"]);
	if (endpoint === "/hr/absence-summary")
		return ["allowance", "remaining", "used"].every(
			(key) => typeof value[key] === "number" && Number.isFinite(value[key]),
		);
	if (endpoint === "/hr/employee-absence-summary")
		return (
			strings(value.leave_year, ["start_date", "end_date"]) &&
			object(value.totals) &&
			["annual_leave", "sick_leave", "other_paid", "other_unpaid"].every(
				(key) => {
					const total = object(value.totals) ? value.totals[key] : null;
					return object(total) && typeof total.used === "number";
				},
			)
		);
	if (endpoint === "/hr/absence-history")
		return (
			rows(value.entries, [
				"id",
				"employee_id",
				"absence_type",
				"start_date",
				"end_date",
			]) &&
			object(value.public_holidays) &&
			rows(value.public_holidays.entries, ["date", "name"])
		);
	if (endpoint === "/hr-documents/packs")
		return rows(value.packs, ["id", "distributionTitle"]);
	if (/^\/hr-documents\/packs\/[^/]+$/.test(endpoint))
		return (
			strings(value.pack, ["id", "status"]) &&
			object(value.pack) &&
			rows(value.pack.steps, [
				"id",
				"title",
				"status",
				"behaviour",
				"captureMethod",
			])
		);
	if (endpoint === "/hr-documents/history")
		return rows(value.documents, ["id", "title", "status"]);
	if (/^\/hr-documents\/history\/[^/]+$/.test(endpoint))
		return strings(value.record, ["id", "title", "status"]);
	if (endpoint === "/my-forms")
		return rows(value.responses, ["id", "title", "status"]);
	if (endpoint === "/my-forms/available")
		return rows(value.templates, ["id", "title"]);
	if (endpoint === "/my-forms/reviewers")
		return rows(value.directors, ["id", "name"]);
	if (/^\/forms\/responses\/[^/]+$/.test(endpoint))
		return (
			strings(value.response, ["id", "title", "status"]) &&
			object(value.response) &&
			object(value.response.definition) &&
			rows(value.response.definition.blocks, ["id", "type", "label"]) &&
			object(value.response.answers)
		);
	return true;
}
