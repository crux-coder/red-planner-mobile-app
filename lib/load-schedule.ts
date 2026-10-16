import type { SupabaseClient } from "@supabase/supabase-js";

import {
	emptySchedule,
	mapHomeJobs,
	type ScheduleSourceJob,
} from "./schedule.ts";

// Queries use the signed-in client: RLS remains the authorization boundary.
// Page every collection so the server's row cap cannot silently truncate a week.
async function allRows<T>(
	page: (
		from: number,
		to: number,
	) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
): Promise<T[]> {
	const result: T[] = [];
	for (let offset = 0; ; offset += 100) {
		const { data, error } = await page(offset, offset + 99);
		if (error) throw new Error(error.message);
		const rows = data ?? [];
		result.push(...rows);
		if (rows.length < 100) return result;
	}
}

type JobRow = {
	id: string;
	job_number: string | null;
	job_type: string;
	job_status: string;
};
type OperationalDetails = {
	job_id: string;
	project_name: string | null;
	address: string | null;
	site_access: string | null;
	site_contact: { name: string | null; phone: string | null } | null;
	site_contact_status:
		| "resolved"
		| "free_text"
		| "not_recorded"
		| "unavailable";
	notes: string | null;
	description: string | null;
	equipment_assignments: {
		name: string | null;
		inventory_number: string | null;
		assigned_start_date: string | null;
		assigned_end_date: string | null;
	}[];
	people_assignments: {
		id: string;
		employee_id: string;
		first_name: string | null;
		last_name: string | null;
		assigned_start_date: string | null;
		assigned_end_date: string | null;
	}[];
};
export async function loadSchedule(client: SupabaseClient, now = new Date()) {
	const {
		data: { user },
		error: authError,
	} = await client.auth.getUser();
	if (authError || !user)
		throw new Error("Please sign in again to load your schedule.");
	const [employeeResult, readOwn, readAny] = await Promise.all([
		client
			.from("employees")
			.select("id")
			.eq("user_id", user.id)
			.maybeSingle<{ id: string }>(),
		client.rpc("authorize_job_permission", {
			requested_permission: "jobs.readOwn",
		}),
		client.rpc("authorize_job_permission", {
			requested_permission: "jobs.readAny",
		}),
	]);
	if (employeeResult.error || readOwn.error || readAny.error)
		throw new Error("Unable to verify your schedule access. Please try again.");
	if (!readOwn.data && !readAny.data)
		throw new Error("Your account does not have access to jobs.");
	const employee = employeeResult.data;
	if (!employee)
		throw new Error(
			"Your account is not linked to an employee record. Ask an administrator to link it before viewing your schedule.",
		);
	const schedule = emptySchedule(now);
	const from = `${schedule.days[0].date}T00:00:00`;
	const last = new Date(`${schedule.days[6].date}T00:00:00Z`);
	last.setUTCDate(last.getUTCDate() + 1);
	const to = `${last.toISOString().slice(0, 10)}T00:00:00`;
	const ownAssignments = await allRows<{ job: string }>((start, end) =>
		client
			.from("job_people_assignments")
			.select("job")
			.eq("employee_id", employee.id)
			.not("job", "is", null)
			.lt("assigned_start_date", to)
			.gt("assigned_end_date", from)
			.order("id")
			.range(start, end),
	);
	const ids = [...new Set(ownAssignments.map((row) => row.job))];
	const sources: ScheduleSourceJob[] = [];
	// Bound URL lengths when an employee has many assignments.
	for (let offset = 0; offset < ids.length; offset += 50) {
		const batch = ids.slice(offset, offset + 50);
		const [jobs, detailsResult] = await Promise.all([
			allRows<JobRow>((start, end) =>
				client
					.from("jobs")
					.select("id, job_number, job_type, job_status")
					.in("id", batch)
					.order("id")
					.range(start, end)
					.returns<JobRow[]>(),
			),
			client.rpc("get_job_operational_details", { p_job_ids: batch }),
		]);
		if (detailsResult.error) throw new Error(detailsResult.error.message);
		const details = (detailsResult.data ?? []) as OperationalDetails[];
		for (const job of jobs) {
			const entry = details.find((row) => row.job_id === job.id);
			if (!entry)
				throw new Error(
					"Some assigned job details could not be loaded. Please try again.",
				);
			if (!Array.isArray(entry.equipment_assignments))
				throw new Error(
					"Assigned equipment could not be loaded. Please try again or contact support.",
				);
			sources.push({
				...job,
				notes: entry.notes,
				description: entry.description,
				job_project: {
					name: entry.project_name,
					address: entry.address,
					site_access: entry.site_access,
					site_contact: null,
				},
				operationalContact: entry.site_contact,
				contactUnavailable: entry.site_contact_status === "unavailable",
				people_assignments: entry.people_assignments.map((row) => ({
					id: row.id,
					assigned_start_date: row.assigned_start_date ?? "",
					assigned_end_date: row.assigned_end_date ?? "",
					employee: {
						id: row.employee_id,
						first_name: row.first_name,
						last_name: row.last_name,
					},
				})),
				equipment_assignments: entry.equipment_assignments.map((row) => ({
					assigned_start_date: row.assigned_start_date ?? "",
					assigned_end_date: row.assigned_end_date ?? "",
					equipment: { name: row.name, inventory_number: row.inventory_number },
				})),
			});
		}
	}
	return {
		...schedule,
		jobs: mapHomeJobs(sources, employee.id, schedule.days, []),
	};
}
