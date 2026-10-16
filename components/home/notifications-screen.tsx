import { SectionList, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Icon } from "./icon";
import type { useNotifications } from "./use-notifications";

import { useDotRefresh } from "@/components/haptic-refresh-control";
import { LoadingSkeleton } from "@/components/home/loading-skeleton";
import {
	notificationIcon,
	notificationSections,
} from "@/lib/notification-presentation";

export function NotificationsScreen({
	notifications,
	onClose,
}: {
	notifications: ReturnType<typeof useNotifications>;
	onClose: () => void;
}) {
	const dotRefresh = useDotRefresh(
		notifications.loading,
		notifications.refresh,
	);
	return (
		<SafeAreaView style={s.safe} edges={["top", "bottom", "left", "right"]}>
			<View style={s.surface}>
				<View style={s.header}>
					<View style={s.titleGroup}>
						<Text accessibilityRole="header" style={s.title}>
							Notifications
						</Text>
						<Text style={s.subtitle}>{notifications.unreadCount} unread</Text>
					</View>
					<Pressable
						accessibilityRole="button"
						accessibilityLabel="Close notifications"
						onPress={onClose}
						style={s.close}
					>
						<Icon name="close" />
					</Pressable>
				</View>
				{notifications.error ? (
					<View style={s.error}>
						<Text accessibilityRole="alert" style={s.body}>
							{notifications.error}
						</Text>
						<Pressable
							accessibilityRole="button"
							onPress={notifications.refresh}
							disabled={notifications.loading}
							style={s.action}
						>
							<Text style={s.link}>Try again</Text>
						</Pressable>
					</View>
				) : null}
				<View style={{ flex: 1 }}>
					{dotRefresh.indicator}
					<SectionList
						sections={notificationSections(notifications.items)}
						stickySectionHeadersEnabled={false}
						renderSectionHeader={({ section }) => (
							<Text accessibilityRole="header" style={s.sectionTitle}>
								{section.title}
							</Text>
						)}
						keyExtractor={(item) => item.id}
						contentContainerStyle={s.list}
						refreshControl={dotRefresh.control}
						onScroll={dotRefresh.onScroll}
						scrollEventThrottle={16}
						alwaysBounceVertical
						ListEmptyComponent={
							<View style={s.empty}>
								{notifications.loading ? (
									<View style={{ width: "100%" }}>
										<LoadingSkeleton label="Loading notifications" compact />
									</View>
								) : !notifications.error ? (
									<>
										<Icon name="bell" size={32} color="#53647d" />
										<Text style={[s.itemTitle, { flex: 0 }]}>
											No notifications yet
										</Text>
										<Text style={s.subtitle}>
											Your updates will appear here.
										</Text>
									</>
								) : null}
							</View>
						}
						renderItem={({ item, index, section }) => (
							<View
								style={[
									s.groupRow,
									index === 0 && s.groupFirst,
									index === section.data.length - 1 && s.groupLast,
								]}
							>
								<View style={s.item}>
									<View style={[s.iconCircle, !item.read_at && s.unreadIcon]}>
										<Icon
											name={notificationIcon(item.type)}
											size={21}
											color={!item.read_at ? "#e90087" : "#53647d"}
										/>
									</View>
									<View style={s.itemContent}>
										<View style={s.row}>
											<Text style={s.itemTitle}>{item.title}</Text>
											{!item.read_at ? (
												<View style={s.dot} accessibilityLabel="Unread" />
											) : null}
										</View>
										<Text style={s.body}>{item.body}</Text>
										<View style={s.footer}>
											<Text style={s.time}>
												{new Date(item.created_at).toLocaleTimeString("en-GB", {
													hour: "2-digit",
													minute: "2-digit",
												})}
											</Text>
											{!item.read_at ? (
												<Pressable
													accessibilityRole="button"
													accessibilityLabel={`Mark ${item.title} as read`}
													disabled={notifications.loading}
													accessibilityState={{
														disabled: notifications.loading,
													}}
													onPress={() => notifications.markRead(item)}
													hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
													style={s.readAction}
												>
													<Text style={s.markRead}>Mark as read</Text>
												</Pressable>
											) : null}
										</View>
									</View>
								</View>
								{index < section.data.length - 1 ? (
									<View style={s.separator} />
								) : null}
							</View>
						)}
						ListFooterComponent={
							notifications.hasMore ? (
								<Pressable
									accessibilityRole="button"
									disabled={notifications.loading}
									onPress={notifications.loadMore}
									style={s.more}
								>
									{notifications.loading ? (
										<LoadingSkeleton
											inline
											label="Loading older notifications"
										/>
									) : (
										<Text style={s.link}>Load older notifications</Text>
									)}
								</Pressable>
							) : null
						}
					/>
				</View>
			</View>
		</SafeAreaView>
	);
}
const s = StyleSheet.create({
	safe: { flex: 1, backgroundColor: "#f5f6f8" },
	surface: { flex: 1, width: "100%", maxWidth: 460, alignSelf: "center" },
	header: {
		flexDirection: "row",
		alignItems: "center",
		paddingHorizontal: 20,
		gap: 12,
		paddingTop: 16,
		paddingBottom: 14,
	},
	titleGroup: { flex: 1, minWidth: 0, gap: 6 },
	title: { fontSize: 28, fontWeight: "700", color: "#10213b" },
	subtitle: { fontSize: 14, color: "#53647d" },
	close: {
		width: 44,
		height: 44,
		flexShrink: 0,
		alignSelf: "flex-start",
		alignItems: "center",
		justifyContent: "center",
	},
	list: { paddingHorizontal: 20, paddingBottom: 30, flexGrow: 1 },
	sectionTitle: {
		fontSize: 12,
		fontWeight: "600",
		letterSpacing: 0.8,
		textTransform: "uppercase",
		color: "#53647d",
		paddingTop: 16,
		paddingBottom: 10,
	},
	groupRow: {
		backgroundColor: "#fff",
		borderLeftWidth: 1,
		borderRightWidth: 1,
		borderColor: "#e8ecf1",
		overflow: "hidden",
	},
	groupFirst: {
		borderTopWidth: 1,
		borderTopLeftRadius: 18,
		borderTopRightRadius: 18,
	},
	groupLast: {
		borderBottomWidth: 1,
		borderBottomLeftRadius: 18,
		borderBottomRightRadius: 18,
		marginBottom: 8,
	},
	separator: {
		height: StyleSheet.hairlineWidth,
		backgroundColor: "#e7edf4",
		marginLeft: 66,
		marginRight: 14,
	},
	item: {
		flexDirection: "row",
		paddingHorizontal: 14,
		paddingTop: 10,
		paddingBottom: 8,
		gap: 12,
	},
	iconCircle: {
		width: 40,
		height: 40,
		borderRadius: 12,
		alignItems: "center",
		justifyContent: "center",
		backgroundColor: "#f0f3f6",
	},
	unreadIcon: { backgroundColor: "#fce7f1" },
	itemContent: { flex: 1, gap: 3 },
	markRead: {
		fontSize: 12,
		color: "#53647d",
		borderWidth: 1,
		borderColor: "#dce3ea",
		borderRadius: 14,
		paddingHorizontal: 10,
		paddingVertical: 5,
		backgroundColor: "#fff",
	},
	footer: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		flexWrap: "wrap",
		columnGap: 12,
		minHeight: 20,
	},
	row: { flexDirection: "row", alignItems: "center", gap: 10 },
	itemTitle: {
		flex: 1,
		fontSize: 15,
		lineHeight: 22,
		fontWeight: "600",
		color: "#10213b",
	},
	body: { fontSize: 14, lineHeight: 21, color: "#53647d" },
	time: { fontSize: 12, color: "#53647d" },
	dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#e90087" },
	readAction: { minHeight: 32, justifyContent: "center" },
	action: { minHeight: 44, justifyContent: "center", alignSelf: "flex-start" },
	link: { fontSize: 13, fontWeight: "500", color: "#53647d" },
	empty: { paddingVertical: 64, alignItems: "center", gap: 12 },
	more: { minHeight: 44, alignItems: "center", justifyContent: "center" },
	error: { paddingHorizontal: 20, paddingTop: 16 },
});
