import assert from "node:assert/strict";
import test from "node:test";
import {
	loadNotifications,
	loadUnreadCount,
	markNotificationRead,
} from "../lib/notifications.ts";

function clientWith(result) {
	const calls = [];
	const query = {
		then(resolve, reject) {
			return Promise.resolve(result).then(resolve, reject);
		},
	};
	for (const method of [
		"select",
		"order",
		"range",
		"is",
		"update",
		"eq",
		"single",
	]) {
		query[method] = (...args) => {
			calls.push([method, ...args]);
			return query;
		};
	}
	return {
		client: {
			from(table) {
				calls.push(["from", table]);
				return query;
			},
		},
		calls,
	};
}
test("notification pages use a stable newest-first order and a lookahead row", async () => {
	const rows = Array.from({ length: 26 }, (_, i) => ({ id: String(i) }));
	const { client, calls } = clientWith({ data: rows, error: null });
	const result = await loadNotifications(client, 25);
	assert.equal(result.items.length, 25);
	assert.equal(result.hasMore, true);
	assert.deepEqual(
		calls.filter((call) => call[0] === "order"),
		[
			["order", "created_at", { ascending: false }],
			["order", "id", { ascending: false }],
		],
	);
	assert.deepEqual(calls.at(-1), ["range", 25, 50]);
});
test("unread count includes notifications beyond the displayed page", async () => {
	const { client, calls } = clientWith({ count: 78, error: null });
	assert.equal(await loadUnreadCount(client), 78);
	assert.deepEqual(calls, [
		["from", "notifications"],
		["select", "id", { count: "exact", head: true }],
		["is", "read_at", null],
	]);
});
test("mark read only updates read_at for the selected notification", async () => {
	const row = { id: "own-notification", read_at: "2026-10-15T10:00:00Z" };
	const { client, calls } = clientWith({ data: row, error: null });
	assert.deepEqual(await markNotificationRead(client, row.id), {
		...row,
		created_at: undefined,
		type: undefined,
		title: "System notification",
		body: "There is a new system notification.",
	});
	assert.deepEqual(Object.keys(calls.find((call) => call[0] === "update")[1]), [
		"read_at",
	]);
	assert.deepEqual(
		calls.find((call) => call[0] === "eq"),
		["eq", "id", row.id],
	);
	assert.deepEqual(calls.at(-1), ["single"]);
});
test("failed loads and forbidden updates report errors rather than success", async () => {
	const { client } = clientWith({
		error: { message: "permission denied" },
		data: null,
	});
	await assert.rejects(loadNotifications(client));
	await assert.rejects(loadUnreadCount(client));
	await assert.rejects(markNotificationRead(client, "other-user-notification"));
	const missing = clientWith({ data: null, error: null }).client;
	await assert.rejects(markNotificationRead(missing, "missing"));
});

test("loads stored events without requesting nonexistent title/body columns", async () => {
	const event = {
		id: "event",
		type: "job_assignment_added",
		context: { job_label: "Site survey", actor_name: "Alex" },
		actor: null,
		created_at: "2026-10-15T10:00:00Z",
		read_at: null,
	};
	const { client } = clientWith({ data: [event], error: null });
	const from = client.from;
	client.from = (table) => {
		const query = from(table);
		const select = query.select;
		query.select = (columns) => {
			assert.ok(
				!columns
					.split(",")
					.some((column) => ["title", "body"].includes(column.trim())),
				"database has event context, not title/body columns",
			);
			return select(columns);
		};
		return query;
	};
	const result = await loadNotifications(client);
	assert.equal(result.items[0].type, "job_assignment_added");
	assert.equal(result.items[0].title, "Added to job");
	assert.equal(result.items[0].body, "Alex added you to Site survey.");
});
