import assert from "node:assert/strict";
import test from "node:test";
import {
	notificationIcon,
	notificationSections,
} from "../lib/notification-presentation.ts";

test("notification icons distinguish event categories with a safe fallback", () => {
	for (const [type, icon] of Object.entries({
		job_assignment_added: "briefcase",
		job_lead_assigned: "user",
		hr_document_assigned: "document",
		absence_request_denied: "calendar",
		project_manager_removed: "folder",
		estimate_owner_assigned: "clipboard",
		invoice_request_approved: "receipt",
		update_mention_created: "message",
		system: "bell",
		future_type: "bell",
	})) {
		assert.equal(notificationIcon(type), icon);
	}
	assert.equal(notificationIcon(undefined), "bell");
});

test("groups by local calendar day across month and year boundaries", () => {
	const now = new Date(2026, 0, 1, 12);
	const items = [
		{ id: "today", created_at: new Date(2026, 0, 1, 8).toISOString() },
		{ id: "yesterday1", created_at: new Date(2025, 11, 31, 22).toISOString() },
		{ id: "yesterday2", created_at: new Date(2025, 11, 31, 9).toISOString() },
		{ id: "older", created_at: new Date(2025, 11, 30, 9).toISOString() },
	];
	const groups = notificationSections(items, now);
	assert.deepEqual(
		groups.map((group) => group.title),
		["Today", "Yesterday", "30 December 2025"],
	);
	assert.deepEqual(
		groups[1].data.map((item) => item.id),
		["yesterday1", "yesterday2"],
	);
	assert.deepEqual(notificationSections([], now), []);
});
