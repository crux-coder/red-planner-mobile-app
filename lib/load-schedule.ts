import type { SupabaseClient } from "@supabase/supabase-js";

import {
	emptySchedule,
	mapHomeJobs,
	type ScheduleContact,
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
	job_project: ScheduleSourceJob["job_project"];
};
type PersonRow = { job: string; employee_id: string } & Omit<
	ScheduleSourceJob["people_assignments"][number],
	"employee"
> & {
		employee:
			| ScheduleSourceJob["people_assignments"][number]["employee"]
			| null;
	};
type EquipmentRow = { job: string } & Omit<
	ScheduleSourceJob["equipment_assignments"][number],
	"equipment"
> & {
		equipment:
			| ScheduleSourceJob["equipment_assignments"][number]["equipment"]
			| null;
	};
type EntryRow = {
	id: string;
	notes: string | null;
	description: string | null;
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
		const [jobs, entries, people, equipment] = await Promise.all([
			allRows<JobRow>((start, end) =>
				client
					.from("jobs")
					.select(
						"id, job_number, job_type, job_status, job_project:projects(name, address, site_access, site_contact)",
					)
					.in("id", batch)
					.order("id")
					.range(start, end)
					.returns<JobRow[]>(),
			),
			allRows<EntryRow>((start, end) =>
				client
					.from("calendar_entries")
					.select("id, notes, description")
					.in("id", batch)
					.eq("kind", "job")
					.order("id")
					.range(start, end),
			),
			allRows<PersonRow>((start, end) =>
				client
					.from("job_people_assignments")
					.select(
						"id, job, employee_id, assigned_start_date, assigned_end_date, employee:employee_directory(id, first_name, last_name)",
					)
					.in("job", batch)
					.lt("assigned_start_date", to)
					.gt("assigned_end_date", from)
					.order("id")
					.range(start, end)
					.returns<PersonRow[]>(),
			),
			allRows<EquipmentRow>((start, end) =>
				client
					.from("job_equipment_assignments")
					.select(
						"job, assigned_start_date, assigned_end_date, equipment:equipment(name, inventory_number)",
					)
					.in("job", batch)
					.lt("assigned_start_date", to)
					.gt("assigned_end_date", from)
					.order("id")
					.range(start, end)
					.returns<EquipmentRow[]>(),
			),
		]);
		for (const job of jobs) {
			const entry = entries.find((row) => row.id === job.id);
			if (!entry)
				throw new Error(
					"Some assigned job details could not be loaded. Please try again.",
				);
			sources.push({
				...job,
				notes: entry.notes,
				description: entry.description,
				people_assignments: people
					.filter((row) => row.job === job.id)
					.map((row) => ({
						...row,
						employee: row.employee ?? {
							id: row.employee_id,
							first_name: null,
							last_name: null,
						},
					})),
				equipment_assignments: equipment
					.filter((row) => row.job === job.id)
					.flatMap((row) =>
						row.equipment ? [{ ...row, equipment: row.equipment }] : [],
					),
			});
		}
	}
	const contactIds = [
		...new Set(
			sources
				.map((job) => job.job_project?.site_contact)
				.filter(
					(id): id is string => !!id && /^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(id),
				),
		),
	];
	const contacts: ScheduleContact[] = [];
	for (let offset = 0; offset < contactIds.length; offset += 50) {
		contacts.push(
			...(await allRows<ScheduleContact>((start, end) =>
				client
					.from("contacts")
					.select("id, first_name, last_name, phone, work_phone")
					.in("id", contactIds.slice(offset, offset + 50))
					.order("id")
					.range(start, end),
			)),
		);
	}
	return {
		...schedule,
		jobs: mapHomeJobs(sources, employee.id, schedule.days, contacts),
	};
}
