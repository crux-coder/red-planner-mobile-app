import test from "node:test";
import assert from "node:assert/strict";
import {
	absenceActions,
	validateAbsence,
	validDate,
	monthDays,
} from "../lib/hr/domain.ts";
import { hrOrigin, hrRequest } from "../lib/hr/api.ts";
import { validateAnswers } from "../lib/hr/forms.ts";
const own = {
	id: "request",
	employee_id: "me",
	absence_type: "annual_leave",
	start_date: "2026-11-01",
	end_date: "2026-11-02",
	status: "pending",
	units: 2,
	request_notes: null,
};
test("employees can edit only their own pending non-holiday requests", () => {
	assert.deepEqual(absenceActions(own, "me", "2026-10-15"), {
		edit: true,
		cancel: false,
	});
	assert.deepEqual(absenceActions(own, "someone-else", "2026-10-15"), {
		edit: false,
		cancel: false,
	});
	assert.equal(
		absenceActions({ ...own, is_public_holiday: true }, "me").edit,
		false,
	);
	assert.equal(
		absenceActions({ ...own, status: "approved" }, "me").edit,
		false,
	);
});
test("cancellation is available only for future approved requests without pending cancellation", () => {
	const approved = { ...own, status: "approved" };
	assert.equal(absenceActions(approved, "me", "2026-10-15").cancel, true);
	assert.equal(absenceActions(approved, "me", "2026-11-03").cancel, false);
	assert.equal(
		absenceActions(
			{ ...approved, cancellation_status: "pending" },
			"me",
			"2026-10-15",
		).cancel,
		false,
	);
	assert.equal(
		absenceActions(
			{ ...approved, cancellation_status: "declined" },
			"me",
			"2026-10-15",
		).cancel,
		true,
	);
});
test("date validation rejects overflow, retrospective, employment and half-day errors", () => {
	assert.equal(validDate("2026-02-30"), false);
	assert.equal(validDate("2028-02-29"), true);
	const input = {
		...own,
		start_day_type: "full_day",
		end_day_type: "full_day",
	};
	assert.equal(validateAbsence(input, undefined, "2026-10-15"), null);
	assert.match(
		validateAbsence(input, undefined, "2026-11-02"),
		/retrospective/,
	);
	assert.match(
		validateAbsence(
			{ ...input, end_date: "2026-10-01" },
			undefined,
			"2026-10-15",
		),
		/End date/,
	);
	assert.match(
		validateAbsence(
			{ ...input, start_day_type: "first_half" },
			undefined,
			"2026-10-15",
		),
		/Multi-day/,
	);
	assert.match(
		validateAbsence(
			input,
			{ employment_start_date: "2026-12-01", termination_date: null },
			"2026-10-15",
		),
		/employment start/,
	);
	assert.match(
		validateAbsence(
			input,
			{ employment_start_date: null, termination_date: "2026-11-01" },
			"2026-10-15",
		),
		/employment end/,
	);
});
test("calendar pads complete Monday-first weeks and preserves leap days", () => {
	assert.equal(monthDays("2026-06")[0], "2026-06-01");
	assert.equal(monthDays("2028-02").filter(Boolean).length, 29);
	assert.equal(monthDays("2026-02").length % 7, 0);
});
test("HR transport rejects unsafe origins and path traversal before sending credentials", async () => {
	for (const url of [
		"http://example.com",
		"https://user:pass@example.com",
		"https://example.com/path",
		"https://example.com?x=1",
		"https://example.com#x",
	])
		assert.throws(() => hrOrigin(url));
	assert.equal(
		hrOrigin("http://192.168.1.2:3000", true),
		"http://192.168.1.2:3000",
	);
	assert.throws(() => hrOrigin("http://192.168.1.2:3000", false));
	let called = false;
	await assert.rejects(() =>
		hrRequest("https://example.com", "token", "/hr/../admin", {
			fetcher: async () => {
				called = true;
			},
		}),
	);
	assert.equal(called, false);
});
test("HR transport uses bearer auth without cookies or redirects and preserves server validation", async () => {
	await hrRequest("https://example.com", "test-token", "/hr/request-absence", {
		method: "POST",
		body: { start_date: "2026-11-01" },
		fetcher: async (url, init) => {
			assert.equal(
				url,
				"https://example.com/api/mobile/employee/hr/request-absence",
			);
			assert.equal(init.credentials, "omit");
			assert.equal(init.redirect, "error");
			assert.equal(init.headers.Authorization, "Bearer test-token");
			assert.deepEqual(JSON.parse(init.body), { start_date: "2026-11-01" });
			return Response.json({ absence_request: own });
		},
	});
	await assert.rejects(
		() =>
			hrRequest("https://example.com", "token", "/hr/request-absence", {
				fetcher: async () =>
					Response.json({ error: "Overlapping absence" }, { status: 409 }),
			}),
		/Overlapping/,
	);
	await assert.rejects(
		() =>
			hrRequest("https://example.com", "token", "/hr-documents/packs", {
				fetcher: async () =>
					Response.json(
						{ error: { message: "Document withdrawn" } },
						{ status: 409 },
					),
			}),
		/Document withdrawn/,
	);
});
test("multipart forms preserve file boundaries and session failures are explicit", async () => {
	const form = new FormData();
	form.append("answers", "{}");
	await hrRequest(
		"https://example.com",
		"token",
		"/forms/responses/id/submit",
		{
			method: "POST",
			body: form,
			fetcher: async (_, init) => {
				assert.equal(init.body, form);
				assert.equal(init.headers["Content-Type"], undefined);
				return Response.json({ response: {} });
			},
		},
	);
	await assert.rejects(
		() =>
			hrRequest("https://example.com", "token", "/context", {
				fetcher: async () => Response.json({}, { status: 401 }),
			}),
		/session expired/,
	);
	await assert.rejects(
		() =>
			hrRequest("https://example.com", "token", "/context", {
				fetcher: async () => new Response("html"),
			}),
		/invalid response/,
	);
});
test("form validation checks required declarations and attachment limits", () => {
	const declaration = {
		id: "d",
		type: "declaration",
		label: "Declaration",
		required: true,
	};
	assert.match(
		validateAnswers([declaration], { d: false }, {}),
		/Complete Declaration/,
	);
	assert.equal(validateAnswers([declaration], { d: true }, {}), null);
	const attachment = {
		id: "a",
		type: "attachment",
		label: "Evidence",
		required: true,
		attachments: { maxFiles: 1 },
	};
	assert.match(validateAnswers([attachment], {}, {}), /Attach/);
	assert.match(validateAnswers([attachment], {}, { a: [{}, {}] }), /Too many/);
	assert.match(
		validateAnswers([], {}, { a: [{ size: 51 * 1024 * 1024 }] }),
		/50 MB/,
	);
});

test("malformed response envelopes fail before rendering sensitive screens", async () => {
	for (const path of [
		"/context",
		"/hr/absence-history",
		"/hr/employee-absence-summary",
		"/hr-documents/packs",
		"/my-forms",
	]) {
		await assert.rejects(
			() =>
				hrRequest("https://example.com", "token", path, {
					fetcher: async () => Response.json({ ok: true }),
				}),
			/invalid response/,
		);
	}
});
