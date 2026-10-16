import type { SupabaseClient } from "@supabase/supabase-js";

export interface AppNotification {
	id: string;
	type: string;
	title: string;
	body: string;
	created_at: string;
	read_at: string | null;
}
type NotificationRow = {
	id: string;
	type: string;
	context: Record<string, unknown> | null;
	created_at: string;
	read_at: string | null;
	actor:
		| { first_name: string | null; last_name: string | null }
		| { first_name: string | null; last_name: string | null }[]
		| null;
};
const columns =
	"id,type,context,created_at,read_at,actor:actor_employee_id(first_name,last_name)";

// Copy follows the event templates in the main app's lib/notifications/server.ts.
const first = <T>(value: T | T[] | null | undefined): T | null =>
	Array.isArray(value) ? (value[0] ?? null) : (value ?? null);

const displayName = (
	person: {
		first_name: string | null;
		last_name: string | null;
		email?: string | null;
	} | null,
) => {
	const name = `${person?.first_name ?? ""} ${person?.last_name ?? ""}`.trim();
	return name || person?.email || "Someone";
};

const contextText = (
	context: Record<string, unknown>,
	key: string,
	fallback: string,
) => {
	const value = context[key];
	return typeof value === "string" && value.trim() ? value.trim() : fallback;
};

const renderNotificationCopy = (
	type: string,
	actor: NotificationRow["actor"],
	context: Record<string, unknown>,
): { title: string; body: string } => {
	const actorName = displayName(first(actor));
	const actorDisplayName = contextText(context, "actor_name", actorName);
	const jobLabel = contextText(context, "job_label", "a job");
	const estimateLabel = contextText(context, "estimate_label", "an estimate");
	const projectLabel = contextText(context, "project_label", "a project");
	const updateLabel = contextText(context, "update_label", "an update");
	const invoiceRequestLabel = contextText(
		context,
		"invoice_request_label",
		contextText(context, "project_label", "an Invoice Request"),
	);
	const onboardingEmployeeName = contextText(
		context,
		"employee_name",
		"a new employee",
	);
	const documentDistributionTitle = contextText(
		context,
		"distribution_title",
		"HR documents",
	);
	const systemTitle = contextText(context, "title", "System notification");
	const systemBody = contextText(
		context,
		"body",
		"There is a new system notification.",
	);

	switch (type) {
		case "absence_request_approved":
			return {
				title: "Absence request approved",
				body: `${actorDisplayName} approved your absence request.`,
			};
		case "absence_request_denied":
			return {
				title: "Absence request denied",
				body: `${actorDisplayName} denied your absence request.`,
			};
		case "job_assignment_added":
			return {
				title: "Added to job",
				body: `${actorDisplayName} added you to ${jobLabel}.`,
			};
		case "job_assignment_removed":
			return {
				title: "Removed from job",
				body: `${actorDisplayName} removed you from ${jobLabel}.`,
			};
		case "job_lead_assigned":
			return {
				title: "Made Job Lead",
				body: `${actorDisplayName} made you Job Lead for ${jobLabel}.`,
			};
		case "job_lead_removed":
			return {
				title: "Job Lead removed",
				body: `${actorDisplayName} removed you as Job Lead for ${jobLabel}.`,
			};
		case "estimate_owner_assigned":
			return {
				title: "Estimate Owner assigned",
				body: `${actorDisplayName} assigned you as owner of ${estimateLabel}.`,
			};
		case "estimate_owner_removed":
			return {
				title: "Estimate Owner removed",
				body: `${actorDisplayName} removed you as owner of ${estimateLabel}.`,
			};
		case "project_manager_assigned":
			return {
				title: "Project Manager assigned",
				body: `${actorDisplayName} assigned you as Project Manager for ${projectLabel}.`,
			};
		case "project_manager_removed":
			return {
				title: "Project Manager removed",
				body: `${actorDisplayName} removed you as Project Manager for ${projectLabel}.`,
			};
		case "invoice_request_submitted":
			return {
				title: "Invoice Request submitted",
				body: `${actorDisplayName} submitted ${invoiceRequestLabel}.`,
			};
		case "invoice_request_updated":
			return {
				title: "Invoice Request updated",
				body: `${actorDisplayName} updated ${invoiceRequestLabel}.`,
			};
		case "invoice_request_resubmitted":
			return {
				title: "Invoice Request resubmitted",
				body: `${actorDisplayName} resubmitted ${invoiceRequestLabel}.`,
			};
		case "invoice_request_cancelled":
			return {
				title: "Invoice Request cancelled",
				body: `${actorDisplayName} cancelled ${invoiceRequestLabel}: ${contextText(context, "reason", "No reason supplied")}.`,
			};
		case "invoice_request_needs_information":
			return {
				title: "Invoice Request needs information",
				body: `${actorDisplayName} returned ${invoiceRequestLabel}: ${contextText(context, "reason", "More information is required")}.`,
			};
		case "invoice_request_message_added":
			return {
				title: "New Invoice Request message",
				body: `${actorDisplayName} added a message to ${invoiceRequestLabel}: ${contextText(context, "message", "Open the conversation to read it")}`,
			};
		case "invoice_request_approved":
			return {
				title: "Invoice Request approved",
				body: `${actorDisplayName} approved ${invoiceRequestLabel}.`,
			};
		case "invoice_request_converted":
			return {
				title: "Invoice prepared",
				body: `${actorDisplayName} created a To Issue Invoice from ${invoiceRequestLabel}.`,
			};
		case "invoice_request_billing_details_completed":
			return {
				title: "Billing Details received",
				body: `The client completed Billing Details for ${invoiceRequestLabel}.`,
			};
		case "onboarding_submission_ready":
			return {
				title: "Employee onboarding ready for review",
				body: `${onboardingEmployeeName} submitted their onboarding information.`,
			};
		case "hr_document_assigned":
			return {
				title: "HR documents require your action",
				body: `${documentDistributionTitle} is ready for you to review.`,
			};
		case "update_mention_created":
			return {
				title: "Mentioned in an update",
				body: `${actorDisplayName} mentioned you in ${updateLabel}.`,
			};
		default:
		case "system":
			return {
				title: systemTitle,
				body: systemBody,
			};
	}
};

function normalizeNotification(row: NotificationRow): AppNotification {
	return {
		id: row.id,
		type: row.type,
		created_at: row.created_at,
		read_at: row.read_at,
		...renderNotificationCopy(row.type, row.actor, row.context ?? {}),
	};
}

export const notificationPageSize = 25;

// The signed-in client uses the existing recipient-only RLS policies.
export async function loadNotifications(client: SupabaseClient, offset = 0) {
	const { data, error } = await client
		.from("notifications")
		.select(columns)
		.order("created_at", { ascending: false })
		.order("id", { ascending: false })
		.range(offset, offset + notificationPageSize);
	if (error) throw new Error("Unable to load notifications. Please try again.");
	const rows = (data ?? []) as unknown as NotificationRow[];
	return {
		items: rows.slice(0, notificationPageSize).map(normalizeNotification),
		hasMore: rows.length > notificationPageSize,
	};
}
export async function loadUnreadCount(client: SupabaseClient) {
	const { count, error } = await client
		.from("notifications")
		.select("id", { count: "exact", head: true })
		.is("read_at", null);
	if (error) throw new Error("Unable to check unread notifications.");
	return count ?? 0;
}
export async function markNotificationRead(client: SupabaseClient, id: string) {
	const { data, error } = await client
		.from("notifications")
		.update({ read_at: new Date().toISOString() })
		.eq("id", id)
		.select(columns)
		.single();
	if (error || !data)
		throw new Error(
			"Unable to mark this notification as read. Please try again.",
		);
	return normalizeNotification(data as unknown as NotificationRow);
}
