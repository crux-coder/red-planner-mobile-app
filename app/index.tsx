import { Redirect } from "expo-router";
import { useRef, useState } from "react";

import { HomeScreen } from "@/components/home/home-screen";
import { SessionStatus } from "@/components/ui";
import { supabase } from "@/config/supabase";
import { useAuth } from "@/context/auth";

export default function Home() {
	const { session, loading, error: sessionError } = useAuth();
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const submitting = useRef(false);

	async function signOut() {
		if (submitting.current) return;
		submitting.current = true;
		setBusy(true);
		setError(null);
		try {
			const { error: signOutError } = await supabase.auth.signOut({
				scope: "local",
			});
			if (signOutError) throw signOutError;
		} catch (cause) {
			setError(
				cause instanceof Error
					? cause.message
					: "Unable to sign out. Please try again.",
			);
		} finally {
			submitting.current = false;
			setBusy(false);
		}
	}

	if (loading || sessionError) return <SessionStatus />;
	if (!session) return <Redirect href="/login" />;

	return (
		<HomeScreen
			key={session.user.id}
			onSignOut={signOut}
			signingOut={busy}
			signOutError={error}
		/>
	);
}
