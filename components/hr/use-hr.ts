import {
	createContext,
	useContext,
	useCallback,
	useEffect,
	useRef,
	useState,
} from "react";
import { AppState } from "react-native";

import { supabase } from "@/config/supabase";
import { hrRequest } from "@/lib/hr/api";

export async function request<T>(
	path: string,
	options: { method?: string; body?: unknown; signal?: AbortSignal } = {},
) {
	const {
		data: { session },
		error,
	} = await supabase.auth.getSession();
	if (error || !session) throw new Error("Please sign in again.");
	const controller = new AbortController();
	const abort = () => controller.abort();
	options.signal?.addEventListener("abort", abort);
	if (options.signal?.aborted) controller.abort();
	const timer = setTimeout(abort, 90000);
	try {
		return await hrRequest<T>(
			process.env.EXPO_PUBLIC_WEB_API_ORIGIN,
			session.access_token,
			path,
			{ ...options, signal: controller.signal, development: __DEV__ },
		);
	} catch (cause) {
		if (controller.signal.aborted)
			throw new Error(
				"The request was interrupted. Refresh to check its status before retrying.",
			);
		throw cause;
	} finally {
		clearTimeout(timer);
		options.signal?.removeEventListener("abort", abort);
	}
}
export function useResource<T>(path: string | null, revision = 0) {
	const [data, setData] = useState<T | null>(null);
	const [loading, setLoading] = useState(Boolean(path));
	const [error, setError] = useState<string | null>(null);
	const current = useRef<AbortController | null>(null);
	const refresh = useCallback(async () => {
		current.current?.abort();
		const controller = new AbortController();
		current.current = controller;
		if (!path) {
			setData(null);
			setLoading(false);
			return;
		}
		setLoading(true);
		setError(null);
		try {
			const value = await request<T>(path, { signal: controller.signal });
			if (current.current === controller) setData(value);
		} catch (cause) {
			if (current.current === controller) {
				// Keep the current form/pack mounted if a foreground refresh fails.
				// Otherwise opening the file picker offline would discard the draft.
				setError(cause instanceof Error ? cause.message : "Unable to load HR.");
			}
		} finally {
			if (current.current === controller) setLoading(false);
		}
	}, [path]);
	useEffect(() => {
		setData(null);
		refresh();
		const subscription = AppState.addEventListener("change", (state) => {
			if (state === "active") refresh();
		});
		return () => {
			const previous = current.current;
			current.current = null;
			previous?.abort();
			subscription.remove();
		};
	}, [refresh, revision]);
	return { data, loading, error, refresh };
}
export const HrMutationContext = createContext<(busy: boolean) => void>(
	() => {},
);
export function useOperation() {
	const notifyBusy = useContext(HrMutationContext);
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const lock = useRef(false);
	const run = async (work: () => Promise<void>) => {
		if (lock.current) return;
		lock.current = true;
		notifyBusy(true);
		setBusy(true);
		setError(null);
		try {
			await work();
		} catch (cause) {
			setError(
				cause instanceof Error
					? cause.message
					: "Unable to save. Please try again.",
			);
		} finally {
			lock.current = false;
			notifyBusy(false);
			setBusy(false);
		}
	};
	return { busy, error, run, setError };
}
