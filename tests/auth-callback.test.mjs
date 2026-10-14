import assert from "node:assert/strict";
import { test } from "node:test";
import {
	createAuthCallbackHandler,
	readAuthCode,
} from "../lib/auth-callback.ts";

const redirect = "red-planner://auth/callback";
test("accepts the registered PKCE callback and decodes its code", () => {
	assert.equal(readAuthCode(`${redirect}?code=one%2Btwo`, redirect), "one+two");
});
test("rejects unrelated URLs, implicit tokens, missing and ambiguous codes", () => {
	for (const url of [
		"invalid",
		"https://example.com/auth/callback?code=x",
		"red-planner://evil/callback?code=x",
		"red-planner://auth/other?code=x",
		`${redirect}?code=`,
		`${redirect}?code=a&code=b`,
		`${redirect}#access_token=x`,
		`${redirect}?code=x#access_token=x`,
	]) {
		assert.throws(() => readAuthCode(url, redirect));
	}
});
test("handles provider cancellation without echoing arbitrary URL error descriptions", () => {
	assert.throws(
		() => readAuthCode(`${redirect}?error=access_denied`, redirect),
		/cancelled/,
	);
	assert.throws(
		() => readAuthCode(`${redirect}?error_description=untrusted`, redirect),
		/invalid or has expired/,
	);
});
test("exchanges a callback only once when router and auth browser both deliver it", async () => {
	let calls = 0;
	const complete = createAuthCallbackHandler(async (code) => {
		calls++;
		assert.equal(code, "single-use");
		return { data: { session: {} }, error: null };
	}, redirect);
	const results = await Promise.all([
		complete(`${redirect}?code=single-use`),
		complete(`${redirect}?code=single-use`),
	]);
	assert.deepEqual(results, [false, false]);
	assert.equal(calls, 1);
	await complete(`${redirect}?code=single-use`);
	assert.equal(calls, 1);
});
test("routes a password recovery exchange separately from regular login", async () => {
	const complete = createAuthCallbackHandler(
		async () => ({
			data: { session: {}, redirectType: "PASSWORD_RECOVERY" },
			error: null,
		}),
		redirect,
	);
	assert.equal(await complete(`${redirect}?code=recovery`), true);
});
test("rejects failed exchanges and empty sessions", async () => {
	for (const response of [
		{ data: { session: null }, error: null },
		{ data: { session: null }, error: { message: "expired" } },
	]) {
		const complete = createAuthCallbackHandler(async () => response, redirect);
		await assert.rejects(
			complete(`${redirect}?code=expired`),
			/invalid or has expired/,
		);
	}
});
test("does not call Supabase for untrusted callback destinations", () => {
	const complete = createAuthCallbackHandler(async () => {
		assert.fail("must not exchange");
	}, redirect);
	assert.throws(() => complete("red-planner://other?code=x"));
});
