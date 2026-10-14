import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";

import { supabase } from "@/config/supabase";
import { loadActionRequired, type ActionRequired } from "@/lib/action-required";

export function useActionRequired() {
	const [data, setData] = useState<ActionRequired>({
		items: [],
		unavailable: [],
	});
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const request = useRef<AbortController | null>(null);
	const refresh = useCallback(async () => {
		request.current?.abort();
		const controller = new AbortController();
		request.current = controller;
		const timeout = setTimeout(() => controller.abort(), 20000);
		setLoading(true);
		setError(null);
		try {
			const {
				data: { session },
				error: sessionError,
			} = await supabase.auth.getSession();
			if (sessionError || !session)
				throw new Error("Please sign in to view pending actions.");
			const result = await loadActionRequired(
				process.env.EXPO_PUBLIC_WEB_API_ORIGIN,
				session.access_token,
				controller.signal,
			);
			if (request.current === controller) setData(result);
		} catch (cause) {
			if (request.current === controller) {
				setData({ items: [], unavailable: [] });
				setError(
					controller.signal.aborted
						? "Couldn’t check pending actions. Please try again."
						: cause instanceof Error
							? cause.message
							: "Couldn’t check pending actions. Please try again.",
				);
			}
		} finally {
			clearTimeout(timeout);
			if (request.current === controller) setLoading(false);
		}
	}, []);
	useEffect(() => {
		refresh();
		const listener = AppState.addEventListener("change", (state) => {
			if (state === "active") refresh();
		});
		return () => {
			const current = request.current;
			request.current = null;
			current?.abort();
			listener.remove();
		};
	}, [refresh]);
	return { data, loading, error, refresh };
}
