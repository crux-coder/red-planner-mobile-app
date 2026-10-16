import assert from "node:assert/strict";
import test from "node:test";
import {
	loadActionRequired,
	parseActionRequired,
} from "../lib/action-required.ts";
const action = {
	id: "pack",
	kind: "document",
	title: "Contract",
	description: "Documents to review and sign",
};
test("accepts partial results and excludes web destinations", () => {
	assert.deepEqual(
		parseActionRequired({
			items: [{ ...action, href: "/dashboard/my-documents/pack" }],
			unavailable: ["form", "risk"],
		}),
		{ items: [action], unavailable: ["form", "risk"] },
	);
	assert.deepEqual(parseActionRequired({ items: [], unavailable: [] }), {
		items: [],
		unavailable: [],
	});
});
test("rejects malformed responses instead of silently hiding outstanding actions", () => {
	for (const data of [
		null,
		{},
		{ items: [{ ...action, kind: "unknown" }], unavailable: [] },
		{ items: [], unavailable: ["unknown"] },
	])
		assert.throws(() => parseActionRequired(data));
});
test("sends only bearer auth to the configured HTTPS endpoint", async () => {
	let call;
	const result = await loadActionRequired(
		"https://stage.example",
		"access-token",
		undefined,
		async (url, options) => {
			call = { url, options };
			return Response.json({ items: [action], unavailable: [] });
		},
	);
	assert.deepEqual(result.items, [action]);
	assert.equal(call.url, "https://stage.example/api/mobile/action-required");
	assert.equal(call.options.headers.Authorization, "Bearer access-token");
	assert.equal(call.options.credentials, "omit");
	assert.equal(call.options.redirect, "error");
});
test("never sends credentials to an insecure or malformed origin", async () => {
	for (const origin of [
		undefined,
		"http://example.com",
		"https://user:pass@example.com",
		"https://example.com/path",
		"https://example.com?url=other",
	])
		await assert.rejects(
			loadActionRequired(origin, "token", undefined, () => {
				assert.fail("must not fetch");
			}),
		);
});
test("HTTP and invalid JSON failures remain errors, not empty lists", async () => {
	for (const status of [401, 403, 500])
		await assert.rejects(
			loadActionRequired(
				"https://stage.example",
				"token",
				undefined,
				async () => new Response("", { status }),
			),
		);
	await assert.rejects(
		loadActionRequired("https://stage.example", "token", undefined, async () =>
			Response.json({ items: null }),
		),
	);
});
test("a missing endpoint explains that the service is unavailable", async () => {
	await assert.rejects(
		loadActionRequired(
			"https://stage.example",
			"token",
			undefined,
			async () => new Response("Not Found", { status: 404 }),
		),
		{
			message:
				"Pending actions are not available on this server yet. Please contact your administrator.",
		},
	);
});

test("local HTTP is allowed only for private addresses in development", async () => {
	const previous = globalThis.__DEV__;
	try {
		globalThis.__DEV__ = true;
		for (const host of [
			"192.168.0.174",
			"10.0.0.2",
			"172.16.0.2",
			"localhost",
			"127.0.0.1",
		]) {
			let called = false;
			await loadActionRequired(
				`http://${host}:3000`,
				"token",
				undefined,
				async (url) => {
					called = true;
					assert.equal(url, `http://${host}:3000/api/mobile/action-required`);
					return Response.json({ items: [], unavailable: [] });
				},
			);
			assert.equal(called, true);
		}
		for (const origin of [
			"http://example.com",
			"http://172.32.0.2",
			"http://192.168.0.174/path",
			"http://user:pass@192.168.0.174",
		]) {
			await assert.rejects(
				loadActionRequired(origin, "token", undefined, () =>
					assert.fail("must not fetch"),
				),
			);
		}
		globalThis.__DEV__ = false;
		await assert.rejects(
			loadActionRequired("http://192.168.0.174:3000", "token", undefined, () =>
				assert.fail("must not fetch in release"),
			),
		);
	} finally {
		if (previous === undefined) delete globalThis.__DEV__;
		else globalThis.__DEV__ = previous;
	}
});
