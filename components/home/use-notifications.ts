import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";

import { supabase } from "@/config/supabase";
import {
	loadNotifications,
	loadUnreadCount,
	markNotificationRead,
	type AppNotification,
} from "@/lib/notifications";

export function useNotifications() {
	const [items, setItems] = useState<AppNotification[]>([]);
	const [unreadCount, setUnreadCount] = useState(0);
	const [hasMore, setHasMore] = useState(false);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const busy = useRef(false);
	const mounted = useRef(true);
	const countVersion = useRef(0);
	const checkUnread = useCallback(async () => {
		const version = ++countVersion.current;
		try {
			const count = await loadUnreadCount(supabase);
			if (mounted.current && version === countVersion.current)
				setUnreadCount(count);
		} catch {
			/* Preserve the last known indicator; the page reports loading errors. */
		}
	}, []);
	const refresh = useCallback(async () => {
		if (busy.current) return;
		busy.current = true;
		setLoading(true);
		setError(null);
		try {
			const page = await loadNotifications(supabase);
			if (mounted.current) {
				setItems(page.items);
				setHasMore(page.hasMore);
			}
			await checkUnread();
		} catch (cause) {
			if (mounted.current)
				setError(
					cause instanceof Error
						? cause.message
						: "Unable to load notifications.",
				);
		} finally {
			busy.current = false;
			if (mounted.current) setLoading(false);
		}
	}, [checkUnread]);
	async function loadMore() {
		if (busy.current || !hasMore) return;
		busy.current = true;
		setLoading(true);
		setError(null);
		try {
			const page = await loadNotifications(supabase, items.length);
			if (mounted.current) {
				setItems((current) => [
					...current,
					...page.items.filter(
						(item) => !current.some((existing) => existing.id === item.id),
					),
				]);
				setHasMore(page.hasMore);
			}
		} catch (cause) {
			if (mounted.current)
				setError(
					cause instanceof Error
						? cause.message
						: "Unable to load notifications.",
				);
		} finally {
			busy.current = false;
			if (mounted.current) setLoading(false);
		}
	}
	async function markRead(item: AppNotification) {
		if (busy.current || item.read_at) return;
		busy.current = true;
		++countVersion.current;
		setLoading(true);
		setError(null);
		try {
			const updated = await markNotificationRead(supabase, item.id);
			if (mounted.current) {
				setItems((current) =>
					current.map((row) => (row.id === item.id ? updated : row)),
				);
				setUnreadCount((count) => Math.max(0, count - 1));
			}
			await checkUnread();
		} catch (cause) {
			if (mounted.current)
				setError(
					cause instanceof Error
						? cause.message
						: "Unable to mark notification as read.",
				);
		} finally {
			busy.current = false;
			if (mounted.current) setLoading(false);
		}
	}
	useEffect(() => {
		mounted.current = true;
		checkUnread();
		const listener = AppState.addEventListener("change", (state) => {
			if (state === "active") refresh();
		});
		const timer = setInterval(() => {
			if (AppState.currentState === "active" && !busy.current) checkUnread();
		}, 30000);
		return () => {
			mounted.current = false;
			++countVersion.current;
			listener.remove();
			clearInterval(timer);
		};
	}, [checkUnread, refresh]);
	return {
		items,
		unreadCount,
		hasMore,
		loading,
		error,
		refresh,
		loadMore,
		markRead,
	};
}
