import { Redirect, router } from "expo-router";
import { useRef, useState } from "react";

import {
	AuthButton,
	AuthScreen,
	AuthInput,
	AuthMessage,
} from "@/components/auth-card";
import { SessionStatus } from "@/components/ui";
import { supabase } from "@/config/supabase";
import { useAuth } from "@/context/auth";
import { authErrorMessage } from "@/lib/auth";

export default function ResetPassword() {
	const auth = useAuth();
	const [password, setPassword] = useState("");
	const [confirm, setConfirm] = useState("");
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const submitting = useRef(false);
	async function reset() {
		if (submitting.current) return;
		if (password.length < 8 || password !== confirm) {
			setError("Use at least 8 characters and make sure both passwords match.");
			return;
		}
		submitting.current = true;
		setBusy(true);
		setError(null);
		try {
			const { error: updateError } = await supabase.auth.updateUser({
				password,
			});
			if (updateError) throw updateError;
			router.replace("/");
		} catch (cause) {
			setError(authErrorMessage(cause));
		} finally {
			submitting.current = false;
			setBusy(false);
		}
	}
	if (auth.loading || auth.error) return <SessionStatus />;
	if (!auth.session) return <Redirect href="/login" />;
	return (
		<AuthScreen
			title="Reset Password"
			description="Enter your new password below."
		>
			<AuthMessage message={error} />
			<AuthInput
				label="New password"
				value={password}
				onChangeText={setPassword}
				secureTextEntry
				autoComplete="new-password"
				textContentType="newPassword"
				editable={!busy}
			/>
			<AuthInput
				label="Confirm password"
				value={confirm}
				onChangeText={setConfirm}
				secureTextEntry
				autoComplete="new-password"
				textContentType="newPassword"
				editable={!busy}
				returnKeyType="done"
				onSubmitEditing={reset}
			/>
			<AuthButton title="Reset Password" onPress={reset} busy={busy} />
		</AuthScreen>
	);
}
