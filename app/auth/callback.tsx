import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";

import { AuthButton, AuthScreen, AuthMessage } from "@/components/auth-card";
import { LoadingSkeleton } from "@/components/home/loading-skeleton";
import { authRedirectUri, completeAuthCallback } from "@/lib/auth";
import { INVALID_LINK } from "@/lib/auth-callback";

export default function AuthCallback() {
	const params = useLocalSearchParams<{
		code?: string;
		error?: string;
		error_code?: string;
		error_description?: string;
	}>();
	const [error, setError] = useState<string | null>(null);
	const query = new URLSearchParams();
	for (const key of [
		"code",
		"error",
		"error_code",
		"error_description",
	] as const) {
		const value = params[key];
		if (typeof value === "string") query.set(key, value);
		else if (value) query.set("error", "invalid_callback");
	}
	const callbackUrl = `${authRedirectUri}?${query.toString()}`;
	useEffect(() => {
		let active = true;
		setError(null);
		Promise.resolve()
			.then(() => completeAuthCallback(callbackUrl))
			.then((recovery) => {
				if (active) router.replace(recovery ? "/reset-password" : "/");
			})
			.catch((cause) => {
				if (active)
					setError(cause instanceof Error ? cause.message : INVALID_LINK);
			});
		return () => {
			active = false;
		};
	}, [callbackUrl]);
	return (
		<AuthScreen
			title={error ? "Unable to sign in" : "Signing you in"}
			description={
				error
					? "Return to login and try again."
					: "Please wait while we complete your sign-in."
			}
		>
			{error ? (
				<>
					<AuthMessage message={error} />
					<AuthButton
						title="Back to login"
						onPress={() => router.replace("/login")}
					/>
				</>
			) : (
				<LoadingSkeleton label="Completing sign-in" compact />
			)}
		</AuthScreen>
	);
}
