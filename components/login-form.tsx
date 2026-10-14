import { Redirect, router } from "expo-router";
import { useRef, useState } from "react";

import {
	AuthButton,
	AuthScreen,
	AuthDivider,
	AuthInput,
	AuthMessage,
	AuthTextButton,
} from "@/components/auth-card";
import { SessionStatus } from "@/components/ui";
import { supabase } from "@/config/supabase";
import { useAuth } from "@/context/auth";
import {
	authErrorMessage,
	sendMagicLink,
	sendPasswordReset,
	signInWithMicrosoft,
} from "@/lib/auth";

type Mode = "password" | "magic" | "forgot";
export function LoginForm({ mode }: { mode: Mode }) {
	const auth = useAuth();
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState<string | null>(null);
	const [busy, setBusy] = useState<"email" | "microsoft" | null>(null);
	const submitting = useRef(false);

	async function submit(method: "email" | "microsoft") {
		if (submitting.current) return;
		setError(null);
		setSuccess(null);
		if (
			method === "email" &&
			(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ||
				(mode === "password" && !password))
		) {
			setError(
				mode === "password"
					? "Enter a valid email address and your password."
					: "Enter a valid email address.",
			);
			return;
		}
		submitting.current = true;
		setBusy(method);
		try {
			if (method === "microsoft") {
				if (await signInWithMicrosoft()) router.replace("/");
			} else if (mode === "magic") {
				await sendMagicLink(email);
				setSuccess("Check your email for a magic link to sign in.");
			} else if (mode === "forgot") {
				await sendPasswordReset(email);
				setSuccess("Check your email for a link to reset your password.");
			} else {
				const { error: signInError } = await supabase.auth.signInWithPassword({
					email: email.trim(),
					password,
				});
				if (signInError) throw signInError;
			}
		} catch (cause) {
			setError(authErrorMessage(cause));
		} finally {
			submitting.current = false;
			setBusy(null);
		}
	}

	if (auth.loading || auth.error) return <SessionStatus />;
	if (auth.session) return <Redirect href="/" />;
	const title =
		mode === "password"
			? "Login"
			: mode === "magic"
				? "Login via magic link"
				: "Reset Password";
	const description =
		mode === "password"
			? "Enter your email below to login to your account"
			: mode === "magic"
				? "Enter your email and we will send you a secure sign-in link."
				: "Enter your email below to reset your password";
	return (
		<AuthScreen title={title} description={description}>
			<AuthMessage message={error} />
			<AuthMessage message={success} success />
			<AuthInput
				label="Email"
				placeholder="you@example.com"
				value={email}
				onChangeText={setEmail}
				editable={!busy}
				keyboardType="email-address"
				autoComplete="email"
				textContentType="emailAddress"
				returnKeyType="done"
				onSubmitEditing={() => {
					if (mode !== "password") submit("email");
				}}
			/>
			{mode === "password" ? (
				<AuthInput
					label="Password"
					placeholder="●●●●●●●●"
					value={password}
					onChangeText={setPassword}
					editable={!busy}
					secureTextEntry
					autoComplete="current-password"
					textContentType="password"
					returnKeyType="go"
					onSubmitEditing={() => submit("email")}
					trailing={
						<AuthTextButton
							title="Forgot your password?"
							disabled={!!busy}
							onPress={() => router.push("/forgot-password")}
						/>
					}
				/>
			) : null}
			<AuthButton
				title={
					mode === "password"
						? "Login"
						: mode === "magic"
							? "Send magic link"
							: "Reset Password"
				}
				icon={
					mode === "password" ? "login" : mode === "magic" ? "mail" : undefined
				}
				onPress={() => submit("email")}
				busy={busy === "email"}
				disabled={!!busy}
			/>
			{mode === "password" ? (
				<>
					<AuthDivider />
					<AuthButton
						title="Continue with Microsoft"
						icon="microsoft"
						outline
						onPress={() => submit("microsoft")}
						busy={busy === "microsoft"}
						disabled={!!busy}
					/>
					<AuthButton
						title="Login via magic link"
						icon="mail"
						outline
						onPress={() => router.push("/magic-link")}
						disabled={!!busy}
					/>
				</>
			) : (
				<AuthTextButton
					title="Back to password login"
					disabled={!!busy}
					onPress={() => router.replace("/login")}
				/>
			)}
		</AuthScreen>
	);
}
