import type { Session } from "@supabase/supabase-js";
import {
	createContext,
	useContext,
	useEffect,
	useState,
	type ReactNode,
} from "react";
import { AppState, Platform } from "react-native";

import { supabase } from "@/config/supabase";

const AuthContext = createContext<{
	session: Session | null;
	loading: boolean;
	error: string | null;
	retry: () => void;
} | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
	const [session, setSession] = useState<Session | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [attempt, setAttempt] = useState(0);

	useEffect(() => {
		let active = true;
		let authChanged = false;
		setLoading(true);
		setError(null);
		const {
			data: { subscription },
		} = supabase.auth.onAuthStateChange((_event, nextSession) => {
			if (!active) return;
			authChanged = true;
			setSession(nextSession);
		});
		supabase.auth
			.getSession()
			.then(({ data, error: sessionError }) => {
				if (!active) return;
				if (sessionError) throw sessionError;
				if (!authChanged) setSession(data.session);
			})
			.catch(() => {
				if (active)
					setError("Could not restore your session. Please try again.");
			})
			.finally(() => {
				if (active) setLoading(false);
			});
		const updateRefresh = (state: string) => {
			if (state === "active") supabase.auth.startAutoRefresh();
			else supabase.auth.stopAutoRefresh();
		};
		const appStateSubscription =
			Platform.OS !== "web"
				? AppState.addEventListener("change", updateRefresh)
				: null;
		if (Platform.OS !== "web") updateRefresh(AppState.currentState);
		return () => {
			active = false;
			subscription.unsubscribe();
			appStateSubscription?.remove();
			if (Platform.OS !== "web") supabase.auth.stopAutoRefresh();
		};
	}, [attempt]);

	return (
		<AuthContext.Provider
			value={{
				session,
				loading,
				error,
				retry: () => setAttempt((value) => value + 1),
			}}
		>
			{children}
		</AuthContext.Provider>
	);
}

export function useAuth() {
	const value = useContext(AuthContext);
	if (!value) throw new Error("useAuth must be used within AuthProvider");
	return value;
}
