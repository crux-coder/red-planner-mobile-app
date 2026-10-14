import { useEffect, useRef, useState } from "react";
import {
	ActivityIndicator,
	Image,
	Modal,
	Platform,
	Pressable,
	RefreshControl,
	ScrollView,
	StatusBar,
	StyleSheet,
	Text,
	View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ActionRequiredSection } from "./action-required";
import { Icon, type IconName } from "./icon";
import { useActionRequired } from "./use-action-required";
import { useSchedule } from "./use-schedule";

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
function Time({ job }: { job: HomeJob }) {
	return (
		<Text style={s.time}>
			{job.start}–{job.end}
		</Text>
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
	const { schedule, loading, error, refresh } = useSchedule();
	const actions = useActionRequired();
	const [selectedDate, setSelectedDate] = useState(schedule.today);
	const [panel, setPanel] = useState<Panel | null>(null);
	const [checked, setChecked] = useState<Record<string, boolean>>({});
	const scroll = useRef<ScrollView>(null);
	const { jobs, nextJob, laterJobs } = jobsForDay(schedule, selectedDate);
	useEffect(() => {
		setSelectedDate((date) =>
			schedule.days.some((day) => day.date === date) ? date : schedule.today,
		);
		setPanel((previous) => (previous && "job" in previous ? null : previous));
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
		<SafeAreaView style={s.safe}>
			<StatusBar barStyle="dark-content" backgroundColor="#fff" />
			<View style={s.surface}>
				<ScrollView
					ref={scroll}
					contentContainerStyle={s.scroll}
					refreshControl={
						<RefreshControl
							refreshing={loading || actions.loading}
							onRefresh={() => {
								refresh();
								actions.refresh();
							}}
							tintColor={pink}
						/>
					}
				>
					<View style={s.header}>
						<Image
							source={require("../../assets/logo.png")}
							style={{ width: 36, height: 36 }}
							accessibilityLabel="Red Laser"
						/>
						<Pressable
							accessibilityRole="button"
							accessibilityLabel="Notifications"
							accessibilityHint="Not connected in this preview"
							accessibilityState={{ disabled: true }}
							disabled
							style={s.iconButton}
						>
							<Icon name="bell" size={23} />
						</Pressable>
					</View>
					<View style={s.main}>
						<View style={s.week} accessibilityLabel="Choose a day">
							{schedule.days.map((day) => (
								<Pressable
									key={day.date}
									accessibilityRole="button"
									accessibilityLabel={`${day.label}${day.date === schedule.today ? ", today" : ""}`}
									accessibilityState={{ selected: selectedDate === day.date }}
									onPress={() => setSelectedDate(day.date)}
									style={[
										s.day,
										day.date === schedule.today && s.today,
										selectedDate === day.date && s.selectedDay,
									]}
								>
									<Text
										style={[s.dayLabel, selectedDate === day.date && s.white]}
									>
										{day.shortLabel}
									</Text>
									<Text
										style={[s.dayNumber, selectedDate === day.date && s.white]}
									>
										{day.day}
									</Text>
								</Pressable>
							))}
						</View>
						<ActionRequiredSection
							data={actions.data}
							loading={actions.loading}
							error={actions.error}
							onRetry={actions.refresh}
						/>
						{loading ? (
							<View style={s.empty}>
								<ActivityIndicator
									color={pink}
									accessibilityLabel="Loading schedule"
								/>
								<Text style={s.muted}>Loading your schedule…</Text>
							</View>
						) : error ? (
							<View style={s.empty}>
								<Text accessibilityRole="alert" style={s.text}>
									{error}
								</Text>
								<Button title="Try again" onPress={refresh} />
							</View>
						) : nextJob ? (
							<View style={s.jobCard}>
								<View style={s.cardTop}>
									<Text style={s.eyebrow}>
										{nextJob.status === "completed"
											? "COMPLETED"
											: selectedDate !== schedule.today
												? "SCHEDULED"
												: nextJob.start <= schedule.currentTime
													? "CURRENT JOB"
													: "UP NEXT"}
									</Text>
									<Time job={nextJob} />
								</View>
								<Text accessibilityRole="header" style={s.jobTitle}>
									{nextJob.name}
								</Text>
								<Text style={s.survey}>{nextJob.survey}</Text>
								{nextJob.detailsRestricted ? (
									<Text style={[s.notice, { marginBottom: 8 }]}>
										Some site details are unavailable with your current access.
									</Text>
								) : null}
								<Address job={nextJob} />
								<View style={s.facts}>
									{(
										[
											{ icon: "user", label: "With", value: nextJob.teammate },
											{
												icon: "briefcase",
												label: "Bring",
												value:
													nextJob.equipment.join(" · ") ||
													"No equipment assigned",
											},
											{ icon: "door", label: "Access", value: nextJob.access },
										] as const
									).map((fact) => (
										<View key={fact.label} style={s.fact}>
											<View style={s.factLabel}>
												<Icon name={fact.icon} size={18} />
												<Text style={s.small}>{fact.label}</Text>
											</View>
											<Text style={[s.small, s.flex]}>{fact.value}</Text>
										</View>
									))}
								</View>
								<Button
									primary
									title="View job & brief"
									onPress={() => setPanel({ kind: "job", job: nextJob })}
								/>
								<View style={s.actions}>
									<View style={s.flex}>
										<Button
											title="Directions"
											icon="navigation"
											onPress={() =>
												setPanel({ kind: "directions", job: nextJob })
											}
										/>
									</View>
									<View style={s.flex}>
										<Button
											title="Call site contact"
											icon="phone"
											onPress={() =>
												setPanel({ kind: "contact", job: nextJob })
											}
										/>
									</View>
								</View>
							</View>
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
										title={
											selectedDate === schedule.today
												? "View this week’s jobs"
												: "Back to today"
										}
										onPress={() =>
											selectedDate === schedule.today
												? setPanel({ kind: "jobs" })
												: setSelectedDate(schedule.today)
										}
									/>
								</View>
							</View>
						)}
						{!loading && !error ? (
							<View style={s.later}>
								<Text accessibilityRole="header" style={s.heading}>
									{selectedDate === schedule.today
										? "Other jobs today"
										: "Other jobs"}
								</Text>
								{laterJobs.length === 0 ? (
									<View style={s.laterCard}>
										<Text style={s.text}>
											No other jobs scheduled for this day.
										</Text>
									</View>
								) : (
									laterJobs.map((job) => (
										<Pressable
											key={job.id}
											accessibilityRole="button"
											onPress={() => setPanel({ kind: "job", job })}
											style={s.laterCard}
										>
											<Time job={job} />
											<View style={[s.flex, { gap: 3 }]}>
												<Text style={s.laterTitle}>{job.name}</Text>
												<Text style={s.small}>{job.survey}</Text>
												<View style={[s.row, { marginTop: 3, gap: 7 }]}>
													<Icon name="briefcase" size={17} />
													<Text style={[s.note, s.flex, { color: "#10213b" }]}>
														{job.equipment.join(" · ")}
													</Text>
												</View>
											</View>
											<View style={{ alignSelf: "center" }}>
												<Icon name="chevron" size={19} />
											</View>
										</Pressable>
									))
								)}
							</View>
						) : null}
					</View>
				</ScrollView>
				<View style={s.nav}>
					{(
						[
							{
								title: "Today",
								icon: "home",
								action: () => {
									setSelectedDate(schedule.today);
									setPanel(null);
									scroll.current?.scrollTo({ y: 0, animated: false });
								},
							},
							{
								title: "Jobs",
								icon: "briefcase",
								action: () => setPanel({ kind: "jobs" }),
							},
							{ title: "HR", icon: "clipboard", action: undefined },
							{
								title: "More",
								icon: "more",
								action: () => setPanel({ kind: "more" }),
							},
						] as const
					).map((item) => (
						<Pressable
							key={item.title}
							accessibilityRole="button"
							accessibilityState={{
								selected: item.title === "Today",
								disabled: !item.action,
							}}
							disabled={!item.action}
							onPress={item.action}
							style={s.navItem}
						>
							<Icon
								name={item.icon}
								size={23}
								color={item.title === "Today" ? pink : "#455b77"}
								filled={item.title === "Today"}
							/>
							<Text
								style={[s.navLabel, item.title === "Today" && { color: pink }]}
							>
								{item.title}
							</Text>
							{item.title === "Today" ? <View style={s.navIndicator} /> : null}
						</Pressable>
					))}
				</View>
			</View>
			<Modal
				visible={panel !== null}
				transparent
				animationType="fade"
				onRequestClose={() => setPanel(null)}
			>
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
								{panel?.kind === "job"
									? `${panel.job.survey} · ${panel.job.start}–${panel.job.end}`
									: "Your schedule and site information"}
							</Text>
							<View style={s.panelBody}>
								{panel?.kind === "job" ? (
									<>
										<Address job={panel.job} />
										<Section title="What to do" text={panel.job.brief} />
										<Section title="Site access" text={panel.job.access} />
										<View>
											<Text style={s.subheading}>What to bring</Text>
											<Text style={[s.note, { marginTop: 6 }]}>
												Personal checklist — checks stay in this screen and are
												not saved to the job.
											</Text>
											<View style={s.checklist}>
												{panel.job.equipment.map((item) => {
													const key = `${panel.job.id}:${item}`;
													return (
														<Pressable
															key={key}
															accessibilityRole="checkbox"
															aria-checked={!!checked[key]}
															accessibilityState={{ checked: !!checked[key] }}
															onPress={() =>
																setChecked((previous) => ({
																	...previous,
																	[key]: !previous[key],
																}))
															}
															style={s.checkRow}
														>
															<View
																style={[
																	s.checkbox,
																	checked[key] && {
																		backgroundColor: pink,
																		borderColor: pink,
																	},
																]}
															>
																{checked[key] ? (
																	<Icon name="check" size={15} color="#fff" />
																) : null}
															</View>
															<Text style={[s.text, s.flex]}>{item}</Text>
														</Pressable>
													);
												})}
											</View>
										</View>
										<View style={s.row}>
											<Icon name="user" size={18} />
											<Text style={[s.text, s.flex]}>{panel.job.teammate}</Text>
										</View>
									</>
								) : null}
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
												Add a site address to this project to enable directions.
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
											<ActivityIndicator color={pink} />
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
											Your schedule shows your assigned jobs. Personal equipment
											checks reset when you leave the screen.
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
	scroll: { paddingBottom: 30 },
	text: { fontFamily, fontSize: 14, lineHeight: 20.3, color: "#10213b" },
	small: { fontFamily, fontSize: 13, lineHeight: 19, color: "#10213b" },
	muted: { fontFamily, fontSize: 14, lineHeight: 20, color: "#52627a" },
	note: { fontFamily, fontSize: 12, lineHeight: 17.4, color: "#53647d" },
	white: { color: "#fff" },
	header: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		paddingTop: 12,
		paddingHorizontal: 24,
		paddingBottom: 2,
	},
	iconButton: {
		width: 44,
		height: 44,
		alignItems: "center",
		justifyContent: "center",
	},
	main: { paddingHorizontal: 12 },
	week: {
		flexDirection: "row",
		gap: 4,
		paddingTop: 14,
		paddingBottom: 12,
		marginHorizontal: 12,
	},
	day: {
		flex: 1,
		minHeight: 52,
		borderRadius: 8,
		alignItems: "center",
		justifyContent: "center",
		gap: 1,
		borderWidth: 2,
		borderColor: "transparent",
	},
	today: { borderColor: pink },
	selectedDay: { backgroundColor: pink, borderColor: pink },
	dayLabel: { fontFamily, fontSize: 12, lineHeight: 17.4, color: "#354b68" },
	dayNumber: {
		fontFamily,
		fontSize: 16,
		lineHeight: 23.2,
		fontWeight: "700",
		color: "#10213b",
	},
	jobCard: {
		borderWidth: 1,
		borderColor: "#d8e1eb",
		borderRadius: 10,
		padding: 14,
		paddingBottom: 16,
	},
	cardTop: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		gap: 12,
		marginBottom: 4,
	},
	eyebrow: { fontFamily, fontSize: 12, fontWeight: "700", color: "#cf0074" },
	time: {
		fontFamily,
		color: "#0756bf",
		backgroundColor: "#eaf2ff",
		paddingVertical: 3,
		paddingHorizontal: 8,
		borderRadius: 5,
		fontSize: 13,
		lineHeight: 18.2,
		overflow: "hidden",
	},
	jobTitle: {
		fontFamily,
		fontSize: 26,
		lineHeight: 31.2,
		letterSpacing: -0.55,
		fontWeight: "700",
		color: "#10213b",
		marginTop: 3,
		marginBottom: 2,
	},
	survey: {
		fontFamily,
		color: "#354b68",
		fontSize: 17,
		lineHeight: 24.65,
		marginBottom: 5,
	},
	row: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
	facts: { marginTop: 20, marginBottom: 16, gap: 9 },
	fact: { flexDirection: "row", gap: 4 },
	factLabel: { flexDirection: "row", gap: 12, width: 88 },
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
	actions: { flexDirection: "row", gap: 8, marginTop: 9 },
	later: { marginTop: 17, gap: 7 },
	heading: {
		fontFamily,
		fontSize: 18,
		lineHeight: 26.1,
		fontWeight: "700",
		color: "#10213b",
	},
	laterCard: {
		flexDirection: "row",
		alignItems: "flex-start",
		gap: 13,
		paddingVertical: 14,
		paddingHorizontal: 12,
		borderWidth: 1,
		borderColor: "#d8e1eb",
		borderRadius: 9,
	},
	laterTitle: {
		fontFamily,
		fontSize: 17,
		lineHeight: 22.1,
		fontWeight: "700",
		color: "#10213b",
	},
	nav: {
		flexDirection: "row",
		paddingTop: 5,
		paddingBottom: 6,
		paddingHorizontal: 12,
		borderTopWidth: 1,
		borderTopColor: "#e0e6ef",
		backgroundColor: "#fff",
	},
	navItem: {
		flex: 1,
		minHeight: 65,
		alignItems: "center",
		justifyContent: "center",
		gap: 5,
	},
	navLabel: { fontFamily, fontSize: 12, lineHeight: 17.4, color: "#455b77" },
	navIndicator: {
		position: "absolute",
		bottom: 0,
		width: "66%",
		height: 2,
		backgroundColor: pink,
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
	checklist: {
		marginTop: 8,
		borderWidth: 1,
		borderColor: "#d8e1eb",
		borderRadius: 8,
		overflow: "hidden",
	},
	checkRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: 12,
		padding: 12,
		minHeight: 46,
	},
	checkbox: {
		width: 18,
		height: 18,
		borderWidth: 1,
		borderColor: "#8c96a4",
		borderRadius: 3,
		alignItems: "center",
		justifyContent: "center",
	},
});
