import type { AppNotification } from "./notifications.ts";

export function notificationIcon(type: string = "") {
	if (type.startsWith("job_lead_")) return "user";
	if (type.startsWith("job_assignment_")) return "briefcase";
	if (type.startsWith("absence_request_")) return "calendar";
	if (type.startsWith("invoice_request_")) return "receipt";
	if (type.startsWith("project_manager_")) return "folder";
	if (type.startsWith("estimate_owner_")) return "clipboard";
	if (type === "hr_document_assigned") return "document";
	if (type === "onboarding_submission_ready") return "user";
	if (type === "update_mention_created") return "message";
	return "bell";
}

export function notificationSections(
	items: AppNotification[],
	now = new Date(),
) {
	const today = now.toDateString();
	const yesterday = new Date(now);
	yesterday.setDate(yesterday.getDate() - 1);
	const groups = new Map<string, { title: string; data: AppNotification[] }>();
	for (const item of items) {
		const date = new Date(item.created_at);
		const key = date.toDateString();
		const title =
			key === today
				? "Today"
				: key === yesterday.toDateString()
					? "Yesterday"
					: date.toLocaleDateString("en-GB", {
							day: "numeric",
							month: "long",
							...(date.getFullYear() !== now.getFullYear()
								? { year: "numeric" }
								: {}),
						});
		const group = groups.get(key) ?? { title, data: [] };
		group.data.push(item);
		groups.set(key, group);
	}
	return Array.from(groups.values());
}
