export interface HomeJob {
	id: string;
	date: string;
	name: string;
	survey: string;
	status: string;
	detailsRestricted: boolean;
	contactUnavailable?: boolean;
	address: string | null;
	start: string;
	end: string;
	teammate: string;
	equipment: string[];
	access: string;
	brief: string;
	contact: string | null;
	contactPhone: string | null;
}
export interface HomeSchedule {
	today: string;
	currentTime: string;
	days: { date: string; shortLabel: string; label: string; day: number }[];
	jobs: HomeJob[];
}
export interface ScheduleSourceJob {
	operationalContact?: { name: string | null; phone: string | null } | null;
	contactUnavailable?: boolean;
	id: string;
	job_number: string | null;
	job_type: string;
	job_status: string;
	notes: string | null;
	description: string | null;
	job_project: {
		name: string | null;
		address: string | null;
		site_access: string | null;
		site_contact: string | null;
	} | null;
	people_assignments: {
		id: string;
		assigned_start_date: string;
		assigned_end_date: string;
		employee: {
			id: string;
			first_name: string | null;
			last_name: string | null;
		};
	}[];
	equipment_assignments: {
		assigned_start_date: string;
		assigned_end_date: string;
		equipment: { name: string | null; inventory_number: string | null };
	}[];
}
export type ScheduleContact = {
	id: string;
	first_name: string;
	last_name: string;
	phone: string | null;
	work_phone: string | null;
};

const BUSINESS_TIME_ZONE = "Europe/London";
const DAY_MS = 86_400_000;
const typeLabels: Record<string, string> = {
	survey: "Survey",
	data: "Data processing",
	cad: "CAD",
	qa: "Quality assurance",
};

export function scheduleClock(now: Date) {
	const parts = Object.fromEntries(
		new Intl.DateTimeFormat("en-GB", {
			timeZone: BUSINESS_TIME_ZONE,
			year: "numeric",
			month: "2-digit",
			day: "2-digit",
			hour: "2-digit",
			minute: "2-digit",
			hourCycle: "h23",
		})
			.formatToParts(now)
			.map(({ type, value }) => [type, value]),
	);
	return {
		today: `${parts["year"]}-${parts["month"]}-${parts["day"]}`,
		currentTime: `${parts["hour"]}:${parts["minute"]}`,
	};
}

export function scheduleWeek(today: string): HomeSchedule["days"] {
	const date = new Date(`${today}T00:00:00Z`);
	const monday = date.getTime() - ((date.getUTCDay() + 6) % 7) * DAY_MS;
	return Array.from({ length: 7 }, (_, offset) => {
		const day = new Date(monday + offset * DAY_MS);
		return {
			date: day.toISOString().slice(0, 10),
			shortLabel: day.toLocaleDateString("en-GB", {
				weekday: "short",
				timeZone: "UTC",
			}),
			label: day.toLocaleDateString("en-GB", {
				weekday: "long",
				day: "numeric",
				month: "long",
				timeZone: "UTC",
			}),
			day: day.getUTCDate(),
		};
	});
}

// Assignment columns are timestamp WITHOUT time zone (20250424125047).
// Compare their wall-clock values without applying the server/browser's timezone.
function wallTime(value: string): number {
	if (!/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}/.test(value ?? "")) return NaN;
	return Date.parse(`${value.replace(" ", "T").slice(0, 19)}Z`);
}

export function mapHomeJobs(
	source: ScheduleSourceJob[],
	employeeId: string,
	days: HomeSchedule["days"],
	contacts: ScheduleContact[],
): HomeJob[] {
	const contactById = new Map(contacts.map((contact) => [contact.id, contact]));
	const result: HomeJob[] = [];
	for (const job of source) {
		if (
			job.job_status === "canceled" ||
			job.job_status === "to_reschedule" ||
			job.job_status === "unscheduled"
		)
			continue;
		for (const assignment of job.people_assignments.filter(
			(item) => item.employee.id === employeeId,
		)) {
			const start = wallTime(assignment.assigned_start_date);
			const end = wallTime(assignment.assigned_end_date);
			if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start)
				continue;
			for (const day of days) {
				const dayStart = Date.parse(`${day.date}T00:00:00Z`);
				const dayEnd = dayStart + DAY_MS;
				if (start >= dayEnd || end <= dayStart) continue;
				const segmentStart = Math.max(start, dayStart);
				const segmentEnd = Math.min(end, dayEnd);
				const overlaps = (item: {
					assigned_start_date: string;
					assigned_end_date: string;
				}) =>
					wallTime(item.assigned_start_date) < segmentEnd &&
					wallTime(item.assigned_end_date) > segmentStart;
				const project = job.job_project;
				const contact = project?.site_contact
					? contactById.get(project.site_contact)
					: undefined;
				const isContactId = /^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(
					project?.site_contact ?? "",
				);
				result.push({
					id: `${assignment.id}:${day.date}`,
					date: day.date,
					name: project?.name?.trim() || job.job_number || "Untitled job",
					survey: typeLabels[job.job_type] ?? job.job_type,
					status: job.job_status,
					detailsRestricted: !project || (isContactId && !contact),
					contactUnavailable: job.contactUnavailable,
					address: project?.address?.trim() || null,
					start: new Date(segmentStart).toISOString().slice(11, 16),
					end:
						segmentEnd === dayEnd
							? "24:00"
							: new Date(segmentEnd).toISOString().slice(11, 16),
					teammate:
						[
							...new Set(
								job.people_assignments
									.filter(
										(item) => item.employee.id !== employeeId && overlaps(item),
									)
									.map(
										(item) =>
											[item.employee.first_name, item.employee.last_name]
												.filter(Boolean)
												.join(" ")
												.trim() || "Unnamed colleague",
									),
							),
						].join(", ") || "No other colleagues assigned",
					equipment: [
						...new Set(
							job.equipment_assignments
								.filter(overlaps)
								.map((item) =>
									[item.equipment.name, item.equipment.inventory_number]
										.filter(Boolean)
										.join(" · "),
								)
								.filter(Boolean),
						),
					],
					access:
						project?.site_access?.trim() ||
						"No site access instructions recorded",
					brief:
						job.notes?.trim() ||
						job.description?.trim() ||
						"No job brief recorded",
					contact:
						job.operationalContact !== undefined
							? (job.operationalContact?.name ?? null)
							: contact
								? [contact.first_name, contact.last_name]
										.filter(Boolean)
										.join(" ")
								: isContactId
									? null
									: project?.site_contact?.trim() || null,
					contactPhone:
						job.operationalContact !== undefined
							? (job.operationalContact?.phone ?? null)
							: contact?.phone || contact?.work_phone || null,
				});
			}
		}
	}
	return result.sort(
		(a, b) =>
			a.date.localeCompare(b.date) ||
			a.start.localeCompare(b.start) ||
			a.name.localeCompare(b.name),
	);
}

export function emptySchedule(now = new Date()): HomeSchedule {
	const clock = scheduleClock(now);
	return { ...clock, days: scheduleWeek(clock.today), jobs: [] };
}
export function jobsForDay(schedule: HomeSchedule, selectedDate: string) {
	const jobs = schedule.jobs.filter((job) => job.date === selectedDate);
	const nextJob =
		selectedDate === schedule.today
			? jobs.find(
					(job) => job.status !== "completed" && job.end > schedule.currentTime,
				)
			: jobs[0];
	return {
		jobs,
		nextJob,
		laterJobs: jobs.filter((job) => job.id !== nextJob?.id),
	};
}
