import type { Absence, AbsenceInput } from "./types";
export const absenceLabels = {
	annual_leave: "Annual leave",
	sick_leave: "Sick leave",
	other_paid: "Other paid leave",
	other_unpaid: "Other unpaid leave",
};
export const portionLabels = {
	full_day: "Full day",
	first_half: "First half",
	second_half: "Second half",
};
export function dateKey(date = new Date()) {
	return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export function validDate(value: string) {
	if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
	const d = new Date(`${value}T12:00:00Z`);
	return Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === value;
}
export function formatDate(value: string | null | undefined) {
	if (!value) return "—";
	const d = new Date(`${value.slice(0, 10)}T12:00:00Z`);
	return Number.isFinite(d.getTime())
		? d.toLocaleDateString("en-GB", {
				day: "numeric",
				month: "short",
				year: "numeric",
				timeZone: "UTC",
			})
		: value;
}
export function label(value: string | null | undefined) {
	return (value || "pending")
		.replace(/_/g, " ")
		.replace(/^./, (c) => c.toUpperCase());
}
export function absenceActions(
	entry: Absence,
	employeeId: string,
	today = dateKey(),
) {
	const own = entry.employee_id === employeeId && !entry.is_public_holiday;
	return {
		edit: own && (entry.status ?? "pending") === "pending",
		cancel:
			own &&
			entry.status === "approved" &&
			entry.start_date.slice(0, 10) >= today &&
			entry.cancellation_status !== "pending",
	};
}
export function validateAbsence(
	input: AbsenceInput,
	employment?: {
		employment_start_date: string | null;
		termination_date: string | null;
	},
	today = dateKey(),
) {
	if (!validDate(input.start_date) || !validDate(input.end_date))
		return "Enter valid dates in YYYY-MM-DD format.";
	if (input.start_date > input.end_date)
		return "End date must be on or after the start date.";
	if (input.start_date < today)
		return "Employees cannot request retrospective absence.";
	if (
		employment?.employment_start_date &&
		input.start_date < employment.employment_start_date
	)
		return "Absence cannot start before your employment start date.";
	if (
		employment?.termination_date &&
		input.end_date > employment.termination_date
	)
		return "Absence cannot end after your employment end date.";
	if (
		input.start_date !== input.end_date &&
		(input.start_day_type === "first_half" ||
			input.end_day_type === "second_half")
	)
		return "Multi-day leave can start in the second half and end in the first half.";
	return null;
}
export function monthDays(month: string) {
	const date = new Date(`${month}-01T12:00:00Z`);
	const offset = (date.getUTCDay() + 6) % 7;
	const count = new Date(
		Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0),
	).getUTCDate();
	return Array.from({ length: Math.ceil((offset + count) / 7) * 7 }, (_, i) =>
		i >= offset && i < offset + count
			? `${month}-${String(i - offset + 1).padStart(2, "0")}`
			: null,
	);
}
