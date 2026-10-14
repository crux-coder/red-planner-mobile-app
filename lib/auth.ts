import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { Platform } from "react-native";

import { supabase } from "@/config/supabase";
import { createAuthCallbackHandler } from "@/lib/auth-callback";

WebBrowser.maybeCompleteAuthSession();
export const authRedirectUri =
	Platform.OS === "web"
		? Linking.createURL("auth/callback")
		: "red-planner://auth/callback";
export const completeAuthCallback = createAuthCallbackHandler(
	(code) => supabase.auth.exchangeCodeForSession(code),
	authRedirectUri,
);

export async function signInWithMicrosoft(): Promise<boolean> {
	const { data, error } = await supabase.auth.signInWithOAuth({
		provider: "azure",
		options: {
			redirectTo: authRedirectUri,
			scopes: "email profile",
			skipBrowserRedirect: true,
		},
	});
	if (error) throw error;
	if (!data.url)
		throw new Error("Unable to start Microsoft sign-in right now.");
	const result = await WebBrowser.openAuthSessionAsync(
		data.url,
		authRedirectUri,
	);
	if (result.type !== "success") return false;
	await completeAuthCallback(result.url);
	return true;
}

export async function sendMagicLink(email: string) {
	const { error } = await supabase.auth.signInWithOtp({
		email: email.trim(),
		options: { emailRedirectTo: authRedirectUri, shouldCreateUser: false },
	});
	if (error) throw error;
}

export async function sendPasswordReset(email: string) {
	const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
		redirectTo: authRedirectUri,
	});
	if (error) throw error;
}

export function authErrorMessage(cause: unknown) {
	const message =
		cause instanceof Error
			? cause.message
			: "Unable to sign in. Please try again.";
	if (/unsupported provider|provider.*not enabled/i.test(message))
		return "Microsoft sign-in is not enabled in Supabase yet. Ask an admin to enable the Azure provider.";
	return message;
}
