import { useState } from "react";
import {
	Modal,
	Platform,
	Pressable,
	ScrollView,
	StyleSheet,
	Text,
	View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Icon } from "./icon";
import { LoadingSkeleton } from "./loading-skeleton";

import {
	actionLabels,
	type ActionRequired,
	type PendingAction,
} from "@/lib/action-required";

export function ActionRequiredSection({
	data,
	loading,
	error,
	onRetry,
	onOpen,
}: {
	data: ActionRequired;
	loading: boolean;
	error: string | null;
	onRetry: () => void;
	onOpen?: (item: PendingAction) => void;
}) {
	const [reviewing, setReviewing] = useState(false);
	const [selected, setSelected] = useState<PendingAction | null>(null);
	// Derive the open item from fresh data so completed/removed actions cannot remain open.
	const current =
		selected && !loading && !error
			? data.items.find(
					(item) => item.id === selected.id && item.kind === selected.kind,
				)
			: null;
	const documentsOnly =
		data.items.length > 0 &&
		data.items.every((item) => item.kind === "document");
	const summary = documentsOnly
		? `${data.items.length} ${data.items.length === 1 ? "document" : "documents"} to sign`
		: `${data.items.length} ${data.items.length === 1 ? "action needs" : "actions need"} your attention`;
	function closeReview() {
		setReviewing(false);
		setSelected(null);
	}
	if (loading)
		return <LoadingSkeleton label="Loading pending actions" compact />;
	if (!loading && !error && !data.items.length && !data.unavailable.length)
		return null;
	return (
		<View style={s.card}>
			<View style={s.summaryRow}>
				<Icon name="signature" size={32} color="#fff" />
				<View style={s.words}>
					<Text accessibilityRole="header" style={s.heading}>
						ACTION REQUIRED
					</Text>
					{!loading && !error && data.items.length > 0 ? (
						<>
							<Text style={s.summary}>{summary}</Text>
							<Text style={s.summaryDescription}>
								{documentsOnly
									? "Review and sign your documents"
									: "Review your outstanding items"}
							</Text>
						</>
					) : null}
				</View>
			</View>

			<>
				{!error && data.items.length > 0 ? (
					<Pressable
						accessibilityRole="button"
						onPress={() => setReviewing(true)}
						style={({ pressed }) => [
							s.reviewButton,
							pressed && { opacity: 0.8 },
						]}
					>
						<Text style={s.reviewText}>
							{documentsOnly ? "Review documents" : "Review actions"}
						</Text>
						<Icon name="chevron" size={20} color="#c40071" />
					</Pressable>
				) : null}
				{error || data.unavailable.length ? (
					<View style={s.notice}>
						<Text accessibilityRole="alert" style={s.noticeText}>
							{error ||
								`Couldn’t check ${data.unavailable.map((kind) => actionLabels[kind]).join(", ")}. Please try again.`}
						</Text>
						<Pressable
							accessibilityRole="button"
							onPress={onRetry}
							style={s.button}
						>
							<Text style={s.buttonText}>Retry action required</Text>
						</Pressable>
					</View>
				) : null}
			</>
			<Modal
				visible={reviewing && !loading && !error}
				transparent
				animationType="fade"
				onRequestClose={closeReview}
			>
				<SafeAreaView style={s.overlay}>
					<Pressable
						style={StyleSheet.absoluteFill}
						accessibilityLabel="Dismiss pending action"
						onPress={closeReview}
					/>
					<View accessibilityViewIsModal style={s.dialog}>
						<ScrollView contentContainerStyle={{ gap: 18 }}>
							<Text accessibilityRole="header" style={s.dialogTitle}>
								{current?.title ||
									(documentsOnly ? "Documents to review" : "Pending actions")}
							</Text>
							{current ? (
								<>
									<Text style={s.description}>{current.description}</Text>
									<Text style={s.noticeText}>
										This action is still pending. Reviewing and completing it in
										the mobile app is not available yet.
									</Text>
									<Pressable
										accessibilityRole="button"
										onPress={() => setSelected(null)}
										style={s.button}
									>
										<Text style={s.buttonText}>Back to all actions</Text>
									</Pressable>
								</>
							) : (
								<>
									{" "}
									{data.items.map((item, index) => (
										<Pressable
											key={`${item.kind}:${item.id}`}
											accessibilityRole="button"
											onPress={() => {
												if (
													onOpen &&
													(item.kind === "document" || item.kind === "form")
												) {
													closeReview();
													onOpen(item);
												} else setSelected(item);
											}}
											style={({ pressed }) => [
												s.row,
												index === data.items.length - 1 && {
													borderBottomWidth: 0,
												},
												pressed && { backgroundColor: "#ffe1f2" },
											]}
										>
											<Icon
												name={
													item.kind === "document"
														? "signature"
														: item.kind === "form"
															? "clipboard"
															: "shield"
												}
												color="#e90087"
												size={22}
											/>
											<View style={s.words}>
												<Text style={s.title}>{item.title}</Text>
												<Text style={s.description}>{item.description}</Text>
											</View>
											<Icon name="chevron" size={18} />
										</Pressable>
									))}
								</>
							)}
						</ScrollView>
						<Pressable
							accessibilityRole="button"
							accessibilityLabel="Close pending action"
							style={s.close}
							onPress={closeReview}
						>
							<Icon name="close" size={21} />
						</Pressable>
					</View>
				</SafeAreaView>
			</Modal>
		</View>
	);
}
const fontFamily = Platform.select({
	ios: "Arial",
	web: "Arial, Helvetica, sans-serif",
	default: "sans-serif",
});
const s = StyleSheet.create({
	card: {
		marginBottom: 14,
		padding: 18,
		backgroundColor: "#e90087",
		borderWidth: 2,
		borderColor: "#e90087",
		borderRadius: 18,
	},
	heading: {
		fontFamily,
		color: "#fff",
		fontSize: 11,
		lineHeight: 16,
		letterSpacing: 0.7,
		fontWeight: "700",
	},
	summaryRow: { flexDirection: "row", alignItems: "flex-start", gap: 14 },
	summary: { fontSize: 20, lineHeight: 26, fontWeight: "700", color: "#fff" },
	summaryDescription: { fontSize: 13, lineHeight: 19, color: "#fff" },
	reviewButton: {
		minHeight: 46,
		marginTop: 16,
		backgroundColor: "#fff",
		borderRadius: 12,
		paddingHorizontal: 16,
		paddingVertical: 10,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		gap: 10,
	},
	reviewText: {
		flexShrink: 1,
		fontSize: 15,
		fontWeight: "700",
		color: "#c40071",
	},
	row: {
		flexDirection: "row",
		alignItems: "center",
		gap: 13,
		paddingVertical: 12,
		borderBottomWidth: 1,
		borderBottomColor: "#f4c6e1",
	},
	words: { flex: 1, gap: 5 },
	title: {
		fontFamily,
		fontSize: 15,
		lineHeight: 21.75,
		fontWeight: "700",
		color: "#10213b",
	},
	description: { fontFamily, fontSize: 12, lineHeight: 17.4, color: "#53647d" },
	notice: {
		padding: 14,
		backgroundColor: "#eff6ff",
		borderRadius: 8,
		gap: 12,
		marginTop: 8,
	},
	noticeText: { fontFamily, fontSize: 13, lineHeight: 18.85, color: "#344d70" },
	button: {
		minHeight: 44,
		paddingVertical: 10,
		paddingHorizontal: 8,
		borderWidth: 1,
		borderColor: "#448aff",
		borderRadius: 6,
		alignItems: "center",
		justifyContent: "center",
		backgroundColor: "#fff",
	},
	buttonText: {
		fontFamily,
		fontSize: 14,
		fontWeight: "600",
		color: "#075ed2",
		textAlign: "center",
	},
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
		paddingVertical: 25,
		paddingHorizontal: 22,
		borderRadius: 14,
		backgroundColor: "#fff",
	},
	dialogTitle: {
		fontFamily,
		fontSize: 23,
		lineHeight: 33.35,
		fontWeight: "700",
		letterSpacing: -0.5,
		color: "#10213b",
		paddingRight: 28,
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
});
