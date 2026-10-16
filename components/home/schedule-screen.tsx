import { useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppHeader } from "./app-header";
import { FrostedHeader } from "./frosted-header";
import { Icon } from "./icon";
import { LoadingSkeleton } from "./loading-skeleton";

import { useDotRefresh } from "@/components/haptic-refresh-control";
import { jobsForDay, type HomeJob, type HomeSchedule } from "@/lib/schedule";

export function ScheduleScreen({
	schedule,
	selectedDate,
	onSelectDate,
	onNotifications,
	unreadCount,
	loading,
	error,
	onRefresh,
	onOpenJob,
	bottomPadding,
}: {
	schedule: HomeSchedule;
	onNotifications: () => void;
	unreadCount: number;
	selectedDate: string;
	onSelectDate: (date: string) => void;
	loading: boolean;
	error: string | null;
	onRefresh: () => void;
	onOpenJob: (job: HomeJob) => void;
	bottomPadding: number;
}) {
	const insets = useSafeAreaInsets();
	const [headerHeight, setHeaderHeight] = useState(207 + insets.top);
	const scroll = useRef<ScrollView>(null);
	const dotRefresh = useDotRefresh(loading, onRefresh);
	const { jobs } = jobsForDay(schedule, selectedDate);
	const day = schedule.days.find((item) => item.date === selectedDate);
	const month = new Date(`${selectedDate}T00:00:00Z`).toLocaleDateString(
		"en-GB",
		{ month: "long", year: "numeric", timeZone: "UTC" },
	);
	const datesWithJobs = new Set(schedule.jobs.map((job) => job.date));
	function selectDate(date: string) {
		onSelectDate(date);
		scroll.current?.scrollTo({ y: 0, animated: false });
	}
	return (
		<View style={s.screen}>
			<View style={{ flex: 1 }}>
				<View pointerEvents="none" style={{ top: headerHeight, zIndex: 1 }}>
					{dotRefresh.indicator}
				</View>
				<ScrollView
					ref={scroll}
					contentContainerStyle={[
						s.content,
						{ paddingTop: headerHeight + 20, paddingBottom: bottomPadding },
					]}
					scrollIndicatorInsets={{ top: headerHeight }}
					refreshControl={dotRefresh.control}
					onScroll={dotRefresh.onScroll}
					scrollEventThrottle={16}
					alwaysBounceVertical
				>
					<View style={s.dayHeading}>
						<Text accessibilityRole="header" style={s.dateTitle}>
							{day?.label}
						</Text>
						{!loading && !error ? (
							<Text style={s.count}>
								{jobs.length} {jobs.length === 1 ? "job" : "jobs"}
							</Text>
						) : null}
					</View>
					{loading ? (
						<LoadingSkeleton label="Loading schedule" />
					) : error ? (
						<View style={s.empty}>
							<Text accessibilityRole="alert" style={s.detail}>
								{error}
							</Text>
							<Pressable
								accessibilityRole="button"
								onPress={onRefresh}
								style={s.todayButton}
							>
								<Text style={s.todayText}>Try again</Text>
							</Pressable>
						</View>
					) : jobs.length === 0 ? (
						<View style={s.empty}>
							<Icon name="calendar" size={32} color="#075ed2" />
							<Text style={s.emptyTitle}>No jobs scheduled</Text>
							<Text style={s.detail}>
								You have no assignments for this day.
							</Text>
						</View>
					) : (
						jobs.map((job) => (
							<Pressable
								key={job.id}
								accessibilityRole="button"
								accessibilityLabel={`${job.start} to ${job.end}, ${job.name}, ${job.survey}`}
								accessibilityHint="Opens job details and brief"
								onPress={() => onOpenJob(job)}
								style={({ pressed }) => [s.card, pressed && { opacity: 0.7 }]}
							>
								<View style={s.timeRail}>
									<Text style={s.startTime}>{job.start}</Text>
									<View style={s.timeLine} />
									<Text style={s.endTime}>{job.end}</Text>
								</View>
								<View style={s.cardBody}>
									<View style={s.titleRow}>
										<Text style={s.jobTitle}>{job.name}</Text>
										<Icon name="chevron" size={20} color="#e90087" />
									</View>
									<Text style={s.survey}>{job.survey}</Text>
									{job.status === "completed" ? (
										<Text style={s.completed}>Completed</Text>
									) : null}
									<View style={s.metadata}>
										<View style={s.row}>
											<Icon name="pin" size={16} color="#53647d" />
											<Text style={s.detail}>
												{job.address || "No site address recorded"}
											</Text>
										</View>
										<View style={s.row}>
											<Icon name="user" size={16} color="#53647d" />
											<Text style={s.detail}>{job.teammate}</Text>
										</View>
										<View style={s.row}>
											<Icon name="briefcase" size={16} color="#53647d" />
											<Text style={s.detail}>
												{job.equipment.join(" · ") || "No equipment assigned"}
											</Text>
										</View>
									</View>
								</View>
							</Pressable>
						))
					)}
				</ScrollView>
			</View>
			<FrostedHeader onHeightChange={setHeaderHeight}>
				<AppHeader
					onNotifications={onNotifications}
					unreadCount={unreadCount}
				/>
				<View style={s.fixedHeader}>
					<View style={s.monthRow}>
						<Text accessibilityRole="header" style={s.month}>
							{month}
						</Text>
						<Pressable
							accessibilityRole="button"
							accessibilityLabel="Show today's jobs"
							onPress={() => selectDate(schedule.today)}
							style={s.todayButton}
						>
							<Text style={s.todayText}>Today</Text>
						</Pressable>
					</View>
					<View style={s.week} accessibilityLabel="Choose a day">
						{schedule.days.map((item) => {
							const selected = item.date === selectedDate;
							return (
								<Pressable
									key={item.date}
									accessibilityRole="button"
									accessibilityLabel={`${item.label}${item.date === schedule.today ? ", today" : ""}`}
									accessibilityState={{ selected }}
									onPress={() => selectDate(item.date)}
									style={[
										s.day,
										item.date === schedule.today && s.today,
										selected && s.selectedDay,
									]}
								>
									<Text style={[s.dayLabel, selected && s.white]}>
										{item.shortLabel}
									</Text>
									<Text style={[s.dayNumber, selected && s.white]}>
										{item.day}
									</Text>
									<View
										style={[
											s.dot,
											{
												opacity:
													!loading && !error && datesWithJobs.has(item.date)
														? 1
														: 0,
											},
											selected && s.whiteDot,
										]}
									/>
								</Pressable>
							);
						})}
					</View>
				</View>
			</FrostedHeader>
		</View>
	);
}

const s = StyleSheet.create({
	screen: { flex: 1 },
	fixedHeader: {
		paddingHorizontal: 20,
		borderBottomWidth: 1,
		borderBottomColor: "#e7edf4",
		paddingBottom: 14,
	},
	monthRow: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		marginTop: 2,
		gap: 8,
	},
	month: { fontSize: 20, fontWeight: "700", color: "#10213b", flexShrink: 1 },
	todayButton: {
		minHeight: 44,
		paddingHorizontal: 8,
		justifyContent: "center",
	},
	todayText: { fontSize: 15, color: "#075ed2", fontWeight: "600" },
	week: { flexDirection: "row", gap: 4, marginTop: 8 },
	day: {
		flex: 1,
		minHeight: 72,
		paddingVertical: 7,
		alignItems: "center",
		justifyContent: "center",
		gap: 3,
		borderRadius: 10,
		borderWidth: 1,
		borderColor: "transparent",
	},
	today: { borderColor: "#448aff", backgroundColor: "#f1f6ff" },
	selectedDay: { backgroundColor: "#e90087", borderColor: "#e90087" },
	dayLabel: { fontSize: 12, color: "#53647d" },
	dayNumber: { fontSize: 18, fontWeight: "700", color: "#10213b" },
	dot: {
		width: 5,
		height: 5,
		borderRadius: 3,
		backgroundColor: "#075ed2",
		marginTop: 2,
	},
	white: { color: "#fff" },
	whiteDot: { backgroundColor: "#fff" },
	content: { paddingHorizontal: 16, paddingTop: 20 },
	dayHeading: {
		flexDirection: "row",
		alignItems: "center",
		gap: 12,
		marginBottom: 16,
	},
	dateTitle: { flex: 1, fontSize: 18, fontWeight: "700", color: "#10213b" },
	count: { fontSize: 13, color: "#53647d" },
	card: {
		flexDirection: "row",
		borderRadius: 14,
		borderWidth: 1,
		borderColor: "#d8e1eb",
		marginBottom: 12,
		backgroundColor: "#fff",
		overflow: "hidden",
	},
	timeRail: {
		width: "22%",
		minWidth: 72,
		backgroundColor: "#eaf4fd",
		paddingHorizontal: 6,
		paddingVertical: 22,
		alignItems: "center",
	},
	startTime: {
		fontSize: 16,
		fontWeight: "700",
		color: "#10213b",
		fontVariant: ["tabular-nums"],
	},
	endTime: { fontSize: 15, color: "#53647d", fontVariant: ["tabular-nums"] },
	timeLine: {
		width: 1,
		height: 38,
		backgroundColor: "#a1b5c9",
		marginVertical: 10,
	},
	cardBody: { flex: 1, minWidth: 0, padding: 14 },
	titleRow: { flexDirection: "row", alignItems: "flex-start", gap: 6 },
	jobTitle: {
		flex: 1,
		fontSize: 18,
		lineHeight: 23,
		fontWeight: "700",
		color: "#10213b",
	},
	survey: { fontSize: 14, lineHeight: 20, color: "#354b68", marginTop: 3 },
	completed: { fontSize: 12, color: "#53647d", marginTop: 6 },
	row: { flexDirection: "row", gap: 8, alignItems: "flex-start" },
	detail: { flexShrink: 1, fontSize: 13, lineHeight: 19, color: "#53647d" },
	metadata: { marginTop: 12, gap: 7 },
	empty: {
		paddingVertical: 32,
		paddingHorizontal: 20,
		alignItems: "center",
		gap: 12,
	},
	emptyTitle: { fontSize: 20, fontWeight: "700", color: "#10213b" },
});
