import { useCallback, useEffect, useRef, useState } from "react";
import {
	Modal,
	Platform,
	Pressable,
	ScrollView,
	StatusBar,
	StyleSheet,
	Text,
	View,
} from "react-native";
import {
	SafeAreaProvider,
	SafeAreaView,
	useSafeAreaInsets,
} from "react-native-safe-area-context";

import { ActionRequiredSection } from "./action-required";
import { AppHeader } from "./app-header";
import { AppNavigation, type AppTab } from "./app-navigation";
import { FrostedHeader } from "./frosted-header";
import { Icon, type IconName } from "./icon";
import { JobSheet } from "./job-sheet";
import { LoadingSkeleton } from "./loading-skeleton";
import { NotificationsScreen } from "./notifications-screen";
import { ScheduleScreen } from "./schedule-screen";
import { FeaturedJob, TodayJobList } from "./today-jobs";
import { useActionRequired } from "./use-action-required";
import { useNotifications } from "./use-notifications";
import { useSchedule } from "./use-schedule";

import { useDotRefresh } from "@/components/haptic-refresh-control";
import { HrScreen, type HrTarget } from "@/components/hr/hr-screen";
import { ProfileScreen } from "@/components/profile/profile-screen";
import { jobsForDay, type HomeJob } from "@/lib/schedule";

type Panel =
	| { kind: "job" | "directions" | "contact"; job: HomeJob }
	| { kind: "jobs" | "more" };
const pink = "#e90087";

function Button({
	title,
	onPress,
	icon,
	primary = false,
}: {
	title: string;
	onPress?: () => void;
	icon?: IconName;
	primary?: boolean;
}) {
	return (
		<Pressable
			accessibilityRole="button"
			disabled={!onPress}
			accessibilityState={{ disabled: !onPress }}
			onPress={onPress}
			style={({ pressed }) => [
				s.button,
				primary ? s.primary : s.secondary,
				{ opacity: pressed ? 0.7 : 1 },
			]}
		>
			{icon ? (
				<Icon name={icon} size={18} color={primary ? "#fff" : "#075ed2"} />
			) : null}
			<Text
				style={[
					s.buttonText,
					{ color: primary ? "#fff" : "#075ed2", fontSize: primary ? 14 : 13 },
				]}
			>
				{title}
			</Text>
		</Pressable>
	);
}
function Address({ job }: { job: HomeJob }) {
	return (
		<View style={s.row}>
			<Icon name="pin" size={18} />
			<Text style={[s.text, s.flex]}>
				{job.address || "No site address recorded"}
			</Text>
		</View>
	);
}
function Section({ title, text }: { title: string; text: string }) {
	return (
		<View style={{ gap: 5 }}>
			<Text style={s.subheading}>{title}</Text>
			<Text style={s.text}>{text}</Text>
		</View>
	);
}

export function HomeScreen({
	onSignOut,
	signingOut,
	signOutError,
}: {
	onSignOut: () => void;
	signingOut: boolean;
	signOutError: string | null;
}) {
	const insets = useSafeAreaInsets();
	const [headerHeight, setHeaderHeight] = useState(66 + insets.top);
	const [dockHeight, setDockHeight] = useState(76);
	const bottomPadding = dockHeight + insets.bottom + 30;
	const { schedule, loading, error, refresh } = useSchedule();
	const actions = useActionRequired();
	const dotRefresh = useDotRefresh(loading || actions.loading, () => {
		refresh();
		actions.refresh();
	});
	const notifications = useNotifications();
	const [notificationsOpen, setNotificationsOpen] = useState(false);
	function openNotifications() {
		setNotificationsOpen(true);
		notifications.refresh();
	}
	const today = new Date(`${schedule.today}T12:00:00Z`);
	const [scheduleDate, setScheduleDate] = useState(schedule.today);
	const [hrTarget, setHrTarget] = useState<HrTarget | null>(null);
	const [activeTab, setActiveTab] = useState<AppTab>("Today");
	const [panel, setPanel] = useState<Panel | null>(null);
	const [jobClosing, setJobClosing] = useState(false);
	const finishJobClose = useCallback(() => {
		setPanel(null);
		setJobClosing(false);
	}, []);
	const scroll = useRef<ScrollView>(null);
	const { jobs, nextJob, laterJobs } = jobsForDay(schedule, schedule.today);
	useEffect(() => {
		setScheduleDate((date) =>
			schedule.days.some((day) => day.date === date) ? date : schedule.today,
		);
		setPanel((previous) => (previous && "job" in previous ? null : previous));
		setJobClosing(false);
	}, [schedule]);
	const title =
		panel?.kind === "job"
			? panel.job.name
			: panel?.kind === "directions"
				? "Site directions"
				: panel?.kind === "contact"
					? "Site contact"
					: panel?.kind === "jobs"
						? "This week's jobs"
						: "Your mobile workspace";
	return (
		<SafeAreaView style={s.safe} edges={["left", "right"]}>
			<StatusBar
				barStyle="dark-content"
				translucent
				backgroundColor="transparent"
			/>
			<View style={s.surface}>
				<View style={activeTab === "Today" ? s.flex : s.hidden}>
					<View style={{ flex: 1 }}>
						<View pointerEvents="none" style={{ top: headerHeight, zIndex: 1 }}>
							{dotRefresh.indicator}
						</View>
						<ScrollView
							ref={scroll}
							contentContainerStyle={{
								paddingTop: headerHeight,
								paddingBottom: bottomPadding,
							}}
							scrollIndicatorInsets={{ top: headerHeight }}
							refreshControl={dotRefresh.control}
							onScroll={dotRefresh.onScroll}
							scrollEventThrottle={16}
							alwaysBounceVertical
						>
							<View style={s.main}>
								<ActionRequiredSection
									data={actions.data}
									loading={actions.loading}
									error={actions.error}
									onRetry={actions.refresh}
									onOpen={(item) => {
										setHrTarget({
											kind: item.kind === "document" ? "pack" : "form",
											id: item.id,
										});
										setActiveTab("HR");
									}}
								/>
								{loading ? (
									<LoadingSkeleton label="Loading schedule" />
								) : error ? (
									<View style={s.empty}>
										<Text accessibilityRole="alert" style={s.text}>
											{error}
										</Text>
										<Button title="Try again" onPress={refresh} />
									</View>
								) : nextJob ? (
									<FeaturedJob
										job={nextJob}
										currentTime={schedule.currentTime}
										onOpen={(kind, job) => setPanel({ kind, job })}
									/>
								) : (
									<View style={s.empty}>
										<Icon name="calendar" size={32} color="#075ed2" />
										<Text style={s.emptyTitle}>
											{jobs.length ? "No more jobs today" : "No jobs scheduled"}
										</Text>
										<Text style={s.muted}>
											{jobs.length
												? "Your earlier assignments are listed below."
												: "You have no assignments for this day."}
										</Text>
										<View style={{ alignSelf: "stretch", marginTop: 8 }}>
											<Button
												title="View this week’s jobs"
												onPress={() => setActiveTab("Schedule")}
											/>
										</View>
									</View>
								)}
								{!loading && !error ? (
									<TodayJobList
										jobs={laterJobs}
										currentTime={schedule.currentTime}
										onOpen={(job) => setPanel({ kind: "job", job })}
										onViewSchedule={() => {
											setScheduleDate(schedule.today);
											setActiveTab("Schedule");
										}}
									/>
								) : null}
							</View>
						</ScrollView>
					</View>
					<FrostedHeader onHeightChange={setHeaderHeight}>
						<AppHeader
							onNotifications={openNotifications}
							unreadCount={notifications.unreadCount}
						>
							<View style={s.headerDate}>
								<Text style={s.headerWeekday}>
									{today.toLocaleDateString("en-GB", {
										weekday: "long",
										timeZone: "UTC",
									})}
								</Text>
								<Text style={s.headerDayMonth}>
									{today.toLocaleDateString("en-GB", {
										day: "numeric",
										month: "long",
										timeZone: "UTC",
									})}
								</Text>
							</View>
						</AppHeader>
					</FrostedHeader>
				</View>
				{activeTab === "Schedule" ? (
					<ScheduleScreen
						onNotifications={openNotifications}
						unreadCount={notifications.unreadCount}
						schedule={schedule}
						selectedDate={scheduleDate}
						onSelectDate={setScheduleDate}
						loading={loading}
						error={error}
						onRefresh={refresh}
						onOpenJob={(job) => setPanel({ kind: "job", job })}
						bottomPadding={bottomPadding}
					/>
				) : null}
				{activeTab === "HR" ? (
					<HrScreen
						bottomPadding={bottomPadding}
						onNotifications={openNotifications}
						unreadCount={notifications.unreadCount}
						onChanged={actions.refresh}
						initialTarget={hrTarget}
					/>
				) : null}
				{activeTab === "Profile" ? (
					<ProfileScreen
						onOpenHr={() => setActiveTab("HR")}
						onNotifications={openNotifications}
						unreadCount={notifications.unreadCount}
						bottomPadding={bottomPadding}
						onSignOut={onSignOut}
						signingOut={signingOut}
						signOutError={signOutError}
					/>
				) : null}
				<AppNavigation
					active={activeTab}
					onHeightChange={setDockHeight}
					onSelect={(tab) => {
						if (tab === "Today" && activeTab === "Today") {
							scroll.current?.scrollTo({ y: 0, animated: false });
						}
						setPanel(null);
						setHrTarget(null);
						setActiveTab(tab);
					}}
				/>
			</View>
			<Modal
				visible={notificationsOpen}
				presentationStyle="fullScreen"
				animationType="slide"
				onRequestClose={() => setNotificationsOpen(false)}
			>
				<SafeAreaProvider>
					<NotificationsScreen
						notifications={notifications}
						onClose={() => setNotificationsOpen(false)}
					/>
				</SafeAreaProvider>
			</Modal>
			<Modal
				visible={panel !== null}
				transparent
				animationType={panel && panel.kind !== "job" ? "fade" : "none"}
				onRequestClose={() =>
					panel?.kind === "job" ? setJobClosing(true) : setPanel(null)
				}
			>
				{panel?.kind === "job" ? (
					<JobSheet
						key={panel.job.id + panel.job.date}
						job={panel.job}
						closing={jobClosing}
						onClosed={finishJobClose}
						onClose={() => setJobClosing(true)}
					/>
				) : panel ? (
					<SafeAreaView style={s.overlay}>
						<Pressable
							style={StyleSheet.absoluteFill}
							accessibilityLabel="Dismiss panel"
							onPress={() => setPanel(null)}
						/>
						<View style={s.dialog} accessibilityViewIsModal>
							<ScrollView contentContainerStyle={s.dialogContent}>
								<Text accessibilityRole="header" style={s.dialogTitle}>
									{title}
								</Text>
								<Text style={s.dialogDescription}>
									Your schedule and site information
								</Text>
								<View style={s.panelBody}>
									{panel?.kind === "directions" ? (
										<>
											<Text style={s.subheading}>{panel.job.name}</Text>
											<Address job={panel.job} />
											<Section title="On arrival" text={panel.job.access} />
											{panel.job.address ? (
												<Button
													primary
													title="Open directions"
													icon="navigation"
												/>
											) : (
												<Text style={s.notice}>
													Add a site address to this project to enable
													directions.
												</Text>
											)}
										</>
									) : null}
									{panel?.kind === "contact" ? (
										<>
											<Text style={s.subheading}>
												{panel.job.contact || "No site contact recorded"}
											</Text>
											<Text style={s.text}>{panel.job.name}</Text>
											{panel.job.contactPhone ? (
												<Button
													primary
													title={panel.job.contactPhone}
													icon="phone"
												/>
											) : (
												<Text style={s.notice}>
													No phone number is recorded for this site contact.
												</Text>
											)}
										</>
									) : null}
									{panel?.kind === "jobs" ? (
										<>
											<Text style={s.text}>
												{schedule.days[0].label} – {schedule.days[6].label}
											</Text>
											{loading ? (
												<LoadingSkeleton label="Loading jobs" />
											) : error ? (
												<Text accessibilityRole="alert" style={s.text}>
													{error}
												</Text>
											) : schedule.jobs.length === 0 ? (
												<Text style={s.text}>No assignments this week.</Text>
											) : null}
											{!loading &&
												!error &&
												schedule.jobs.map((job) => (
													<Pressable
														key={job.id}
														accessibilityRole="button"
														style={s.menuRow}
														onPress={() => setPanel({ kind: "job", job })}
													>
														<Icon name="briefcase" />
														<View style={[s.flex, { gap: 5 }]}>
															<Text style={s.subheading}>{job.name}</Text>
															<Text style={s.note}>
																{
																	schedule.days.find(
																		(day) => day.date === job.date,
																	)?.shortLabel
																}{" "}
																· {job.start}–{job.end} · {job.survey}
															</Text>
														</View>
														<Icon name="chevron" size={18} />
													</Pressable>
												))}
										</>
									) : null}
									{panel?.kind === "more" ? (
										<>
											<Section
												title="Red Laser Mobile"
												text="A home for your schedule, site details and HR."
											/>
											<Text style={s.notice}>
												Your schedule shows your assigned jobs and equipment.
											</Text>
											<Button
												title={signingOut ? "Signing out…" : "Sign out"}
												onPress={signingOut ? undefined : onSignOut}
											/>
											{signOutError ? (
												<Text
													accessibilityRole="alert"
													style={{ color: "#b91c1c" }}
												>
													{signOutError}
												</Text>
											) : null}
										</>
									) : null}
								</View>
							</ScrollView>
							<Pressable
								accessibilityRole="button"
								accessibilityLabel="Close"
								style={s.close}
								onPress={() => setPanel(null)}
							>
								<Icon name="close" size={21} />
							</Pressable>
						</View>
					</SafeAreaView>
				) : null}
			</Modal>
		</SafeAreaView>
	);
}

const fontFamily = Platform.select({
	ios: "Arial",
	web: "Arial, Helvetica, sans-serif",
	default: "sans-serif",
});
const s = StyleSheet.create({
	safe: { flex: 1, backgroundColor: "#fff" },
	surface: {
		flex: 1,
		width: "100%",
		maxWidth: 460,
		alignSelf: "center",
		backgroundColor: "#fff",
	},
	flex: { flex: 1 },
	hidden: { display: "none" },
	text: { fontFamily, fontSize: 14, lineHeight: 20.3, color: "#10213b" },
	muted: { fontFamily, fontSize: 14, lineHeight: 20, color: "#52627a" },
	note: { fontFamily, fontSize: 12, lineHeight: 17.4, color: "#53647d" },
	headerDate: { alignItems: "center", gap: 2 },
	headerWeekday: {
		fontFamily,
		fontSize: 12,
		lineHeight: 17,
		color: "#53647d",
		textAlign: "center",
	},
	headerDayMonth: {
		fontFamily,
		fontSize: 16,
		lineHeight: 22,
		fontWeight: "700",
		color: "#10213b",
		textAlign: "center",
	},
	main: { paddingHorizontal: 16, paddingTop: 20 },
	row: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
	button: {
		minHeight: 44,
		borderRadius: 6,
		borderWidth: 1,
		paddingVertical: 10,
		paddingHorizontal: 8,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		gap: 7,
	},
	primary: { backgroundColor: pink, borderColor: pink },
	secondary: { backgroundColor: "#fff", borderColor: "#448aff" },
	buttonText: {
		fontFamily,
		fontSize: 13,
		fontWeight: "600",
		textAlign: "center",
		flexShrink: 1,
	},
	empty: {
		alignItems: "center",
		gap: 12,
		paddingVertical: 36,
		paddingHorizontal: 20,
		borderWidth: 1,
		borderColor: "#d8e1eb",
		borderRadius: 10,
	},
	emptyTitle: { fontFamily, fontSize: 20, fontWeight: "700", color: "#10213b" },
	overlay: {
		flex: 1,
		backgroundColor: "#0b193b70",
		alignItems: "center",
		justifyContent: "center",
		padding: 12,
	},
	dialog: {
		width: "100%",
		maxWidth: 440,
		maxHeight: "95%",
		backgroundColor: "#fff",
		borderRadius: 14,
		overflow: "hidden",
	},
	dialogContent: { paddingVertical: 25, paddingHorizontal: 22 },
	dialogTitle: {
		fontFamily,
		fontSize: 23,
		lineHeight: 33.35,
		fontWeight: "700",
		letterSpacing: -0.5,
		paddingRight: 28,
		color: "#10213b",
	},
	dialogDescription: {
		fontFamily,
		color: "#53647d",
		fontSize: 13,
		lineHeight: 18.85,
		marginTop: 5,
		marginBottom: 22,
		paddingRight: 12,
	},
	close: {
		position: "absolute",
		right: 8,
		top: 10,
		width: 44,
		height: 44,
		alignItems: "center",
		justifyContent: "center",
	},
	panelBody: { gap: 18 },
	subheading: {
		fontFamily,
		fontSize: 15,
		lineHeight: 21.75,
		fontWeight: "700",
		color: "#10213b",
	},
	notice: {
		fontFamily,
		padding: 14,
		backgroundColor: "#eff6ff",
		borderRadius: 8,
		fontSize: 13,
		lineHeight: 18.85,
		color: "#344d70",
	},
	menuRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: 13,
		paddingVertical: 12,
		borderBottomWidth: 1,
		borderBottomColor: "#e7edf4",
	},
});
