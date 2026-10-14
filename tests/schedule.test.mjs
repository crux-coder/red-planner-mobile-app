import assert from "node:assert/strict";
import test from "node:test";
import { emptySchedule, mapHomeJobs, jobsForDay } from "../lib/schedule.ts";
import { loadSchedule } from "../lib/load-schedule.ts";

const now = new Date("2026-10-14T07:00:00Z");
const schedule = emptySchedule(now);
const person = (id, employeeId, start, end) => ({
	id,
	employee: { id: employeeId, first_name: employeeId, last_name: null },
	assigned_start_date: start,
	assigned_end_date: end,
});
function source(overrides = {}) {
	return {
		id: "job",
		job_number: "J-1",
		job_type: "survey",
		job_status: "booked",
		notes: "Brief",
		description: null,
		job_project: {
			name: "Project",
			address: "Site",
			site_access: "Reception",
			site_contact: null,
		},
		people_assignments: [
			person("a", "me", "2026-10-14T09:00:00", "2026-10-14T12:00:00"),
		],
		equipment_assignments: [],
		...overrides,
	};
}
test("London clock handles summer time and week crossing a year boundary", () => {
	assert.equal(schedule.currentTime, "08:00");
	assert.equal(schedule.days[0].date, "2026-10-12");
	const winter = emptySchedule(new Date("2027-01-01T23:30:00Z"));
	assert.equal(winter.currentTime, "23:30");
	assert.equal(winter.days[0].date, "2026-12-28");
	assert.equal(winter.days[6].date, "2027-01-03");
});
test("splits overnight assignments, includes only overlapping crew and equipment", () => {
	const jobs = mapHomeJobs(
		[
			source({
				people_assignments: [
					person("a", "me", "2026-10-14T23:00:00", "2026-10-15T02:00:00"),
					person("b", "Sam", "2026-10-15T01:00:00", "2026-10-15T02:00:00"),
				],
				equipment_assignments: [
					{
						assigned_start_date: "2026-10-15T00:00:00",
						assigned_end_date: "2026-10-15T03:00:00",
						equipment: { name: "Scanner", inventory_number: "1" },
					},
				],
			}),
		],
		"me",
		schedule.days,
		[],
	);
	assert.deepEqual(
		jobs.map((j) => [j.date, j.start, j.end]),
		[
			["2026-10-14", "23:00", "24:00"],
			["2026-10-15", "00:00", "02:00"],
		],
	);
	assert.equal(jobs[0].teammate, "No other colleagues assigned");
	assert.deepEqual(jobs[0].equipment, []);
	assert.equal(jobs[1].teammate, "Sam");
	assert.deepEqual(jobs[1].equipment, ["Scanner · 1"]);
});
test("excludes other employees, canceled work and invalid intervals", () => {
	const rows = [
		source({ job_status: "canceled" }),
		source({ job_status: "to_reschedule" }),
		source({
			people_assignments: [
				person("a", "other", "2026-10-14T09:00:00", "2026-10-14T12:00:00"),
			],
		}),
		source({ people_assignments: [person("a", "me", "bad", "bad")] }),
	];
	assert.deepEqual(mapHomeJobs(rows, "me", schedule.days, []), []);
});
test("completed and expired jobs remain in other jobs without becoming up next", () => {
	const mapped = mapHomeJobs([source()], "me", schedule.days, []);
	assert.equal(
		jobsForDay({ ...schedule, jobs: mapped }, schedule.today).nextJob.name,
		"Project",
	);
	const ended = jobsForDay(
		{ ...schedule, currentTime: "12:00", jobs: mapped },
		schedule.today,
	);
	assert.equal(ended.nextJob, undefined);
	assert.equal(ended.laterJobs.length, 1);
	const completed = jobsForDay(
		{ ...schedule, jobs: mapped.map((j) => ({ ...j, status: "completed" })) },
		schedule.today,
	);
	assert.equal(completed.nextJob, undefined);
});
test("marks restricted project details instead of fabricating a project", () => {
	const [job] = mapHomeJobs(
		[source({ job_project: null })],
		"me",
		schedule.days,
		[],
	);
	assert.equal(job.name, "J-1");
	assert.equal(job.detailsRestricted, true);
});

function fakeClient({
	user = { id: "user" },
	employee = { id: "me" },
	allowed = true,
	failTable,
	assignments = [],
	queryRows,
} = {}) {
	const calls = [];
	const client = {
		calls,
		auth: { getUser: async () => ({ data: { user }, error: null }) },
		rpc: async () => ({ data: allowed, error: null }),
		from(table) {
			const call = { table, filters: [] };
			calls.push(call);
			const builder = {};
			for (const method of [
				"select",
				"eq",
				"not",
				"lt",
				"gt",
				"order",
				"range",
				"in",
				"returns",
			])
				builder[method] = (...args) => {
					call.filters.push([method, ...args]);
					return builder;
				};
			builder.maybeSingle = async () => ({ data: employee, error: null });
			builder.then = (resolve, reject) =>
				Promise.resolve({
					data: queryRows
						? queryRows(call)
						: table === "job_people_assignments"
							? assignments
							: [],
					error:
						failTable === table ? { message: "Network unavailable" } : null,
				}).then(resolve, reject);
			return builder;
		},
	};
	return client;
}
test("loader requires authentication, permission and an employee link", async () => {
	for (const [options, message] of [
		[{ user: null }, /sign in/],
		[{ allowed: false }, /access to jobs/],
		[{ employee: null }, /not linked/],
	]) {
		const client = fakeClient(options);
		await assert.rejects(loadSchedule(client, now), message);
		assert.equal(
			client.calls.some((c) => c.table === "job_people_assignments"),
			false,
		);
	}
});
test("loader filters by own employee and overlapping week and does not fetch unrelated jobs", async () => {
	const client = fakeClient();
	const result = await loadSchedule(client, now);
	assert.deepEqual(result.jobs, []);
	const assignments = client.calls.find(
		(c) => c.table === "job_people_assignments",
	);
	assert.ok(
		assignments.filters.some(
			(f) => f[0] === "eq" && f[1] === "employee_id" && f[2] === "me",
		),
	);
	assert.ok(
		assignments.filters.some(
			(f) => f[0] === "lt" && f[2] === "2026-10-19T00:00:00",
		),
	);
	assert.ok(
		assignments.filters.some(
			(f) => f[0] === "gt" && f[2] === "2026-10-12T00:00:00",
		),
	);
	assert.equal(
		client.calls.some((c) => c.table === "jobs"),
		false,
	);
});
test("query failure rejects instead of becoming an empty schedule", async () => {
	await assert.rejects(
		loadSchedule(fakeClient({ failTable: "job_people_assignments" }), now),
		/Network unavailable/,
	);
});

test("loader assembles assigned job, brief, equipment and crew from query results", async () => {
	const original = source();
	const client = fakeClient({
		queryRows: (call) => {
			const selected = call.filters.find((f) => f[0] === "select")?.[1];
			if (call.table === "job_people_assignments")
				return selected === "job"
					? [{ job: "job" }]
					: original.people_assignments.map((p) => ({
							...p,
							job: "job",
							employee_id: p.employee.id,
						}));
			if (call.table === "jobs") return [original];
			if (call.table === "calendar_entries")
				return [{ id: "job", notes: "Actual job brief", description: null }];
			if (call.table === "job_equipment_assignments")
				return [
					{
						job: "job",
						assigned_start_date: "2026-10-14T09:00:00",
						assigned_end_date: "2026-10-14T12:00:00",
						equipment: { name: "Scanner", inventory_number: "KIT-1" },
					},
				];
			return [];
		},
	});
	const result = await loadSchedule(client, now);
	assert.equal(result.jobs.length, 1);
	assert.equal(result.jobs[0].name, "Project");
	assert.equal(result.jobs[0].brief, "Actual job brief");
	assert.deepEqual(result.jobs[0].equipment, ["Scanner · KIT-1"]);
	for (const call of client.calls.filter((c) =>
		["jobs", "calendar_entries", "job_equipment_assignments"].includes(c.table),
	)) {
		assert.ok(
			call.filters.some(
				(f) => f[0] === "in" && f[2].length === 1 && f[2][0] === "job",
			),
		);
	}
});
