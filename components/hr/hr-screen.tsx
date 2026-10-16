import { useCallback, useEffect, useState } from "react";
import {
	Alert,
	KeyboardAvoidingView,
	Modal,
	Platform,
	ScrollView,
	StyleSheet,
	Text,
	View,
} from "react-native";
import {
	SafeAreaProvider,
	SafeAreaView,
	useSafeAreaInsets,
} from "react-native-safe-area-context";

import { AbsenceForm, Absences } from "./absence";
import { DocumentPack, DocumentRecord, Documents } from "./documents";
import { Forms, FormResponse } from "./forms";
import { HrLoadingSkeleton } from "./loading-skeleton";
import {
	Badge,
	Button,
	ErrorNotice,
	Loading,
	NavigationButton,
	Row,
	s,
} from "./ui";
import { HrMutationContext, useResource } from "./use-hr";

import { useDotRefresh } from "@/components/haptic-refresh-control";
import { AppHeader } from "@/components/home/app-header";
import { FrostedHeader } from "@/components/home/frosted-header";
import { absenceLabels, dateKey, formatDate } from "@/lib/hr/domain";
import type {
	Absence,
	EmployeeContext,
	EmployeeSummary,
	History,
	PackSummary,
	Summary,
} from "@/lib/hr/types";
export type HrTarget = { kind: "pack" | "form"; id: string };
type Page =
	| { kind: "absences"; calendar?: boolean }
	| { kind: "request"; entry?: Absence }
	| { kind: "documents" }
	| { kind: "pack"; id: string }
	| { kind: "record"; id: string }
	| { kind: "forms" }
	| { kind: "form"; id: string };
const pageTitle = (page: Page) =>
	page.kind === "absences"
		? page.calendar
			? "Calendar"
			: "Absences"
		: page.kind === "request"
			? page.entry
				? "Edit absence"
				: "Request absence"
			: page.kind === "documents"
				? "Documents"
				: page.kind === "pack"
					? "Review documents"
					: page.kind === "record"
						? "Completion record"
						: page.kind === "forms"
							? "Forms"
							: "Complete form";
export function HrScreen({
	bottomPadding,
	onNotifications,
	unreadCount,
	onChanged,
	initialTarget,
}: {
	bottomPadding: number;
	onNotifications: () => void;
	unreadCount: number;
	onChanged: () => void;
	initialTarget?: HrTarget | null;
}) {
	const [operations, setOperations] = useState(0);
	const notifyBusy = useCallback(
		(busy: boolean) => setOperations((n) => Math.max(0, n + (busy ? 1 : -1))),
		[],
	);
	const [revision, setRevision] = useState(0);
	const context = useResource<EmployeeContext>("/context");
	const employee = context.data?.employee;
	const [pages, setPages] = useState<Page[]>([]);
	const insets = useSafeAreaInsets();
	const [headerHeight, setHeaderHeight] = useState(66 + insets.top);
	const summary = useResource<Summary>(
		employee ? "/hr/absence-summary" : null,
		revision,
	);
	const detail = useResource<EmployeeSummary>(
		employee ? `/hr/employee-absence-summary?employee_id=${employee.id}` : null,
		revision,
	);
	const packs = useResource<{ packs: PackSummary[] }>(
		employee ? "/hr-documents/packs" : null,
		revision,
	);
	const year = new Date().getFullYear();
	const history = useResource<History>(
		employee
			? `/hr/absence-history?from=${year}-01-01&to=${year + 1}-12-31&employee_id=${employee.id}`
			: null,
		revision,
	);
	const loading =
		context.loading ||
		summary.loading ||
		detail.loading ||
		packs.loading ||
		history.loading;
	const refresh = () => {
		context.refresh();
		setRevision((r) => r + 1);
	};
	const dot = useDotRefresh(loading, refresh);
	const changed = () => {
		setRevision((r) => r + 1);
		onChanged();
	};
	useEffect(() => {
		if (initialTarget) setPages([initialTarget]);
	}, [initialTarget]);
	const open = (page: Page) => setPages((previous) => [...previous, page]);
	const back = () => setPages((previous) => previous.slice(0, -1));
	const page = pages[pages.length - 1];
	const leave = () => {
		if (operations > 0) return;
		if (page?.kind === "request" || page?.kind === "form")
			Alert.alert("Leave this form?", "Unsaved changes will be lost.", [
				{ text: "Keep editing", style: "cancel" },
				{ text: "Leave", style: "destructive", onPress: back },
			]);
		else back();
	};
	const upcoming = (history.data?.entries ?? [])
		.filter(
			(a) =>
				!a.is_public_holiday &&
				a.end_date.slice(0, 10) >= dateKey() &&
				["pending", "approved"].includes(a.status ?? "pending"),
		)
		.sort((a, b) => a.start_date.localeCompare(b.start_date))
		.slice(0, 3);
	const pendingDocuments = (packs.data?.packs ?? []).reduce(
		(total, p) => total + p.documentCount - p.completedCount,
		0,
	);
	return (
		<HrMutationContext.Provider value={notifyBusy}>
			<View style={s.flex}>
				<View pointerEvents="none" style={{ top: headerHeight, zIndex: 1 }}>
					{dot.indicator}
				</View>
				<ScrollView
					contentContainerStyle={[
						layout.overview,
						{ paddingTop: headerHeight + 16, paddingBottom: bottomPadding },
					]}
					refreshControl={dot.control}
					onScroll={dot.onScroll}
					scrollEventThrottle={16}
					alwaysBounceVertical
					scrollIndicatorInsets={{ top: headerHeight }}
				>
					<ErrorNotice error={context.error} retry={context.refresh} />
					{context.loading && !employee ? (
						<HrLoadingSkeleton variant="overview" />
					) : null}
					{employee ? (
						<>
							<View style={{ gap: 12 }}>
								{summary.loading ? (
									<HrLoadingSkeleton variant="balance" />
								) : summary.data ? (
									<View style={layout.balancePanel}>
										<Text style={layout.balanceNumber}>
											{summary.data.remaining}
										</Text>
										<Text style={layout.balanceLabel}>days available</Text>
										<View
											style={layout.balanceTrack}
											accessible
											accessibilityRole="progressbar"
											accessibilityLabel="Available annual leave"
											accessibilityValue={{
												text: `${summary.data.remaining} of ${summary.data.allowance} days available`,
											}}
										>
											<View
												style={[
													layout.balanceFill,
													{
														width: `${Math.max(0, Math.min(100, summary.data.allowance > 0 ? (summary.data.remaining / summary.data.allowance) * 100 : 0))}%`,
													},
												]}
											/>
										</View>
										<Text style={layout.balanceTotal}>
											of {summary.data.allowance} days total
										</Text>
									</View>
								) : null}
								<ErrorNotice error={summary.error} retry={summary.refresh} />
								<ErrorNotice error={detail.error} retry={detail.refresh} />
								{detail.data ? (
									<View style={layout.leaveYear}>
										<Text style={layout.leaveHeading}>This leave year</Text>
										<View style={layout.leaveTotals}>
											{[
												{
													label: "Sick leave",
													days: detail.data.totals.sick_leave.used,
												},
												{
													label: "Other paid leave",
													days: detail.data.totals.other_paid.used,
												},
												{
													label: "Other unpaid leave",
													days: detail.data.totals.other_unpaid.used,
												},
											].map(({ label, days }) => (
												<View
													key={label}
													style={layout.leaveMetric}
													accessible
													accessibilityLabel={`${label}: ${days} days`}
												>
													<Text style={layout.leaveValue}>
														{days} <Text style={layout.leaveUnit}>days</Text>
													</Text>
													<Text style={layout.leaveLabel}>{label}</Text>
												</View>
											))}
										</View>
									</View>
								) : null}
								<Button
									title="Request absence"
									onPress={() => open({ kind: "request" })}
								/>
							</View>
							<ErrorNotice error={packs.error} retry={packs.refresh} />
							{pendingDocuments > 0 ? (
								<View style={layout.notice}>
									<Row
										title={`${pendingDocuments} ${pendingDocuments === 1 ? "document" : "documents"} to complete`}
										detail="Review your outstanding documents"
										icon="signature"
										onPress={() => open({ kind: "documents" })}
									/>
								</View>
							) : null}
							<View style={layout.navigation}>
								<Row
									title="Absences"
									detail="Requests, decisions and cancellations"
									icon="calendar"
									onPress={() => open({ kind: "absences" })}
								/>
								<View style={layout.navigationDivider} />
								<Row
									title="Calendar"
									detail="Your time off and public holidays"
									icon="calendar"
									onPress={() => open({ kind: "absences", calendar: true })}
								/>
								<View style={layout.navigationDivider} />
								<Row
									title="Documents"
									detail="Review, sign and download your documents"
									onPress={() => open({ kind: "documents" })}
								/>
								<View style={layout.navigationDivider} />
								<Row
									title="Forms"
									detail="Assigned forms, new forms and history"
									icon="clipboard"
									onPress={() => open({ kind: "forms" })}
								/>
							</View>
							<Text style={s.heading}>Upcoming absences</Text>
							<ErrorNotice error={history.error} retry={history.refresh} />
							{history.loading ? (
								<HrLoadingSkeleton variant="absence" />
							) : !history.error && !upcoming.length ? (
								<Text style={s.muted}>No upcoming absences.</Text>
							) : null}
							{!history.loading &&
								upcoming.map((a) => (
									<View key={a.id} style={layout.absence}>
										<Text style={s.heading}>
											{absenceLabels[a.absence_type]}
										</Text>
										<Badge value={a.status ?? "pending"} />
										<Text style={s.muted}>
											{formatDate(a.start_date)} – {formatDate(a.end_date)} ·{" "}
											{a.units} days
										</Text>
										<Button
											title="View request"
											secondary
											onPress={() => open({ kind: "absences" })}
										/>
									</View>
								))}
						</>
					) : null}
				</ScrollView>
				<FrostedHeader onHeightChange={setHeaderHeight}>
					<AppHeader
						onNotifications={onNotifications}
						unreadCount={unreadCount}
					>
						<Text style={[s.heading, { textAlign: "center" }]}>My HR</Text>
					</AppHeader>
				</FrostedHeader>
				<Modal
					visible={Boolean(page)}
					presentationStyle="fullScreen"
					animationType="slide"
					onRequestClose={leave}
				>
					<SafeAreaProvider>
						<SafeAreaView style={s.flex}>
							<KeyboardAvoidingView
								style={{ flex: 1 }}
								behavior={Platform.OS === "ios" ? "padding" : undefined}
							>
								<View style={layout.pageHeader}>
									<NavigationButton
										label="Back"
										disabled={operations > 0}
										onPress={leave}
									/>
									<Text
										accessibilityRole="header"
										style={[s.heading, layout.pageTitle]}
									>
										{page ? pageTitle(page) : ""}
									</Text>
									<View style={{ width: 44 }} />
								</View>
								<ScrollView
									key={
										page
											? `${page.kind}-${"id" in page ? page.id : ""}-${pages.length}`
											: "closed"
									}
									contentContainerStyle={[s.content, { paddingBottom: 40 }]}
									keyboardShouldPersistTaps="handled"
								>
									{page && employee ? (
										page.kind === "absences" ? (
											<Absences
												employeeId={employee.id}
												revision={revision}
												initialCalendar={page.calendar}
												onEdit={(entry) => open({ kind: "request", entry })}
												onChanged={changed}
											/>
										) : page.kind === "request" ? (
											<AbsenceForm
												employee={employee}
												entry={page.entry}
												onSaved={() => {
													changed();
													back();
												}}
											/>
										) : page.kind === "documents" ? (
											<Documents
												revision={revision}
												onPack={(id) => open({ kind: "pack", id })}
												onRecord={(id) => open({ kind: "record", id })}
												onForms={() => open({ kind: "forms" })}
											/>
										) : page.kind === "pack" ? (
											<DocumentPack id={page.id} onChanged={changed} />
										) : page.kind === "record" ? (
											<DocumentRecord id={page.id} onChanged={changed} />
										) : page.kind === "forms" ? (
											<Forms onOpen={(id) => open({ kind: "form", id })} />
										) : (
											<FormResponse id={page.id} onChanged={changed} />
										)
									) : (
										<>
											<ErrorNotice
												error={context.error}
												retry={context.refresh}
											/>
											{context.loading ? <Loading /> : null}
										</>
									)}
								</ScrollView>
							</KeyboardAvoidingView>
						</SafeAreaView>
					</SafeAreaProvider>
				</Modal>
			</View>
		</HrMutationContext.Provider>
	);
}

const layout = StyleSheet.create({
	pageHeader: {
		paddingHorizontal: 12,
		paddingVertical: 8,
		flexDirection: "row",
		alignItems: "center",
		gap: 8,
	},
	pageTitle: { flex: 1, textAlign: "center" },
	leaveYear: {
		backgroundColor: "#f5f7fa",
		borderRadius: 18,
		padding: 12,
		gap: 10,
	},
	leaveTotals: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
	leaveMetric: { flexGrow: 1, flexBasis: 80, minWidth: 80, gap: 2 },
	leaveValue: {
		fontSize: 22,
		lineHeight: 28,
		fontWeight: "700",
		color: "#10213b",
	},
	leaveHeading: { fontSize: 14, fontWeight: "600", color: "#10213b" },
	leaveUnit: { fontSize: 12, fontWeight: "400", color: "#53647d" },
	leaveLabel: { fontSize: 12, lineHeight: 16, color: "#53647d", marginTop: 2 },
	balanceTrack: {
		width: "100%",
		height: 7,
		borderRadius: 4,
		backgroundColor: "rgba(255,255,255,0.2)",
		overflow: "hidden",
		marginTop: 16,
	},
	balanceFill: { height: "100%", backgroundColor: "#e90087", borderRadius: 4 },
	balanceTotal: {
		fontSize: 13,
		lineHeight: 20,
		color: "#ffffff",
		marginTop: 4,
	},
	balancePanel: {
		backgroundColor: "#10213b",
		borderRadius: 20,
		padding: 24,
		alignItems: "center",
		gap: 4,
	},
	balanceNumber: {
		fontSize: 52,
		lineHeight: 60,
		fontWeight: "700",
		color: "#ffffff",
	},
	balanceLabel: {
		fontSize: 17,
		lineHeight: 24,
		fontWeight: "500",
		color: "#ffffff",
	},
	overview: { paddingHorizontal: 20, gap: 20 },
	section: {
		gap: 12,
		paddingBottom: 24,
		borderBottomWidth: StyleSheet.hairlineWidth,
		borderBottomColor: "#e0e6ef",
	},
	navigation: {
		backgroundColor: "#f5f7fa",
		borderRadius: 18,
		paddingHorizontal: 14,
		paddingVertical: 6,
	},
	navigationDivider: {
		height: StyleSheet.hairlineWidth,
		backgroundColor: "#e3e9f0",
		marginLeft: 52,
	},
	notice: {
		paddingHorizontal: 12,
		paddingVertical: 4,
		backgroundColor: "#fff0f8",
		borderRadius: 12,
	},
	absence: {
		gap: 10,
		paddingBottom: 20,
		borderBottomWidth: StyleSheet.hairlineWidth,
		borderBottomColor: "#e0e6ef",
	},
});
