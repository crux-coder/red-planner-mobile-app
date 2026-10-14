import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";

import { supabase } from "@/config/supabase";
import { loadSchedule } from "@/lib/load-schedule";
import { emptySchedule } from "@/lib/schedule";

export function useSchedule() {
	const [schedule, setSchedule] = useState(emptySchedule);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const request = useRef(0);
	const refresh = useCallback(async () => {
		const version = ++request.current;
		setLoading(true);
		setError(null);
		try {
			const next = await loadSchedule(supabase);
			if (request.current === version) setSchedule(next);
		} catch (cause) {
			if (request.current === version) {
				setSchedule(emptySchedule());
				setError(
					cause instanceof Error
						? cause.message
						: "Unable to load your schedule. Please try again.",
				);
			}
		} finally {
			if (request.current === version) setLoading(false);
		}
	}, []);
	useEffect(() => {
		refresh();
		const listener = AppState.addEventListener("change", (state) => {
			if (state === "active") refresh();
		});
		return () => {
			++request.current;
			listener.remove();
		};
	}, [refresh]);
	return { schedule, loading, error, refresh };
}
