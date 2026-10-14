import { useState } from "react";
import {
	ActivityIndicator,
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
}: {
	data: ActionRequired;
	loading: boolean;
	error: string | null;
	onRetry: () => void;
}) {
	const [selected, setSelected] = useState<PendingAction | null>(null);
	// Derive the open item from fresh data so completed/removed actions cannot remain open.
	const current =
		selected && !loading && !error
			? data.items.find(
					(item) => item.id === selected.id && item.kind === selected.kind,
				)
			: null;
	if (!loading && !error && !data.items.length && !data.unavailable.length)
		return null;
	return (
		<View style={s.card}>
			<Text accessibilityRole="header" style={s.heading}>
				Action required
			</Text>
			{loading ? (
				<View style={s.loading}>
					<ActivityIndicator color="#e90087" />
					<Text style={s.description}>Checking pending actions…</Text>
				</View>
			) : (
				<>
					{data.items.map((item, index) => (
						<Pressable
							key={`${item.kind}:${item.id}`}
							accessibilityRole="button"
							onPress={() => setSelected(item)}
							style={({ pressed }) => [
								s.row,
								index === data.items.length - 1 && { borderBottomWidth: 0 },
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
			)}
			<Modal
				visible={!!current}
				transparent
				animationType="fade"
				onRequestClose={() => setSelected(null)}
			>
				<SafeAreaView style={s.overlay}>
					<Pressable
						style={StyleSheet.absoluteFill}
						accessibilityLabel="Dismiss pending action"
						onPress={() => setSelected(null)}
					/>
					<View accessibilityViewIsModal style={s.dialog}>
						<ScrollView contentContainerStyle={{ gap: 18 }}>
							<Text accessibilityRole="header" style={s.dialogTitle}>
								{current?.title}
							</Text>
							<Text style={s.description}>{current?.description}</Text>
							<Text style={s.noticeText}>
								This action is still pending. Reviewing and completing it in the
								mobile app is not available yet.
							</Text>
						</ScrollView>
						<Pressable
							accessibilityRole="button"
							accessibilityLabel="Close pending action"
							style={s.close}
							onPress={() => setSelected(null)}
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
		padding: 14,
		backgroundColor: "#fff0f8",
		borderWidth: 2,
		borderColor: "#e90087",
		borderRadius: 10,
	},
	heading: {
		fontFamily,
		color: "#a60060",
		fontSize: 18,
		lineHeight: 26.1,
		fontWeight: "700",
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
	loading: {
		flexDirection: "row",
		gap: 10,
		alignItems: "center",
		paddingTop: 12,
	},
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
