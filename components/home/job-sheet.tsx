import { useState, type ReactNode } from "react";
import {
	Animated,
	Linking,
	Pressable,
	ScrollView,
	StyleSheet,
	Text,
	View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Icon, type IconName } from "./icon";
import { useDrawerMotion } from "./use-drawer-motion";

import type { HomeJob } from "@/lib/schedule";

function ExpandableSection({
	title,
	icon,
	summary,
	children,
}: {
	title: string;
	icon: IconName;
	summary?: string;
	children: ReactNode;
}) {
	const [expanded, setExpanded] = useState(true);
	return (
		<View style={s.section}>
			<Pressable
				accessibilityRole="button"
				accessibilityLabel={title}
				accessibilityState={{ expanded }}
				onPress={() => setExpanded((value) => !value)}
				style={({ pressed }) => [s.sectionHeader, pressed && s.pressed]}
			>
				<Icon name={icon} size={21} />
				<Text style={[s.heading, s.flex]}>{title}</Text>
				{summary ? <Text style={s.caption}>{summary}</Text> : null}
				<View
					style={{ transform: [{ rotate: expanded ? "-90deg" : "90deg" }] }}
				>
					<Icon name="chevron" size={18} />
				</View>
			</Pressable>
			{expanded ? <View style={s.sectionBody}>{children}</View> : null}
		</View>
	);
}

export function JobSheet({
	job,
	onClose,
	closing = false,
	onClosed,
}: {
	job: HomeJob;
	onClose: () => void;
	closing?: boolean;
	onClosed: () => void;
}) {
	const insets = useSafeAreaInsets();
	const { translateY, backdropOpacity, dragHandlers } = useDrawerMotion({
		closing,
		onClose,
		onClosed,
	});
	const [actionError, setActionError] = useState<string | null>(null);
	const date = new Date(`${job.date}T12:00:00Z`).toLocaleDateString("en-GB", {
		weekday: "short",
		day: "numeric",
		month: "short",
		timeZone: "UTC",
	});
	const phone = job.contactPhone?.replace(/[^+\d]/g, "");
	async function openLink(url: string, failure: string) {
		setActionError(null);
		try {
			await Linking.openURL(url);
		} catch {
			setActionError(failure);
		}
	}
	return (
		<View
			style={[
				s.overlay,
				{
					paddingTop: insets.top + 16,
					paddingLeft: insets.left,
					paddingRight: insets.right,
				},
			]}
		>
			<Animated.View
				style={[
					StyleSheet.absoluteFill,
					{
						backgroundColor: "#101b2b80",
						opacity: backdropOpacity,
					},
				]}
			>
				<Pressable
					style={StyleSheet.absoluteFill}
					accessibilityRole="button"
					accessibilityLabel="Dismiss job details"
					onPress={onClose}
				/>
			</Animated.View>
			<Animated.View
				style={[
					s.sheet,
					{
						transform: [{ translateY }],
					},
				]}
				accessibilityViewIsModal
				onAccessibilityEscape={onClose}
			>
				<View
					style={s.header}
					accessibilityLabel="Drag job drawer"
					collapsable={false}
					{...dragHandlers}
				>
					<View style={s.handleArea}>
						<View style={s.handle} />
					</View>
					<View style={s.titleRow}>
						<View style={s.flex}>
							<Text accessibilityRole="header" style={s.title}>
								{job.name}
							</Text>
							<Text style={s.subtitle}>{job.survey}</Text>
						</View>
						<Pressable
							accessibilityRole="button"
							accessibilityLabel="Close job details"
							onPress={onClose}
							style={({ pressed }) => [s.close, pressed && s.pressed]}
						>
							<Icon name="close" />
						</Pressable>
					</View>
					{job.status ? (
						<View style={s.badge}>
							<Text style={s.status}>{job.status.replace(/_/g, " ")}</Text>
						</View>
					) : null}
				</View>
				<ScrollView
					style={s.scroll}
					contentContainerStyle={s.content}
					showsVerticalScrollIndicator
				>
					{job.detailsRestricted ? (
						<Text style={s.notice}>
							Some site details are unavailable with your current access.
						</Text>
					) : null}
					<View style={s.fact}>
						<Icon name="calendar" />
						<View style={s.flex}>
							<Text style={s.heading}>{date}</Text>
							<Text style={s.body}>
								{job.start}–{job.end}
							</Text>
						</View>
					</View>
					<View style={s.fact}>
						<Icon name="pin" />
						<Text selectable style={[s.body, s.flex]}>
							{job.address || "No site address recorded"}
						</Text>
					</View>
					<View style={s.access}>
						<Icon name="door" color="#966019" />
						<View style={s.flex}>
							<Text style={s.heading}>Site access</Text>
							<Text selectable style={s.body}>
								{job.access}
							</Text>
						</View>
					</View>
					<ExpandableSection title="Job brief" icon="document">
						<Text selectable style={s.body}>
							{job.brief}
						</Text>
					</ExpandableSection>
					<ExpandableSection title="Team & site contact" icon="user">
						<View style={s.person}>
							<Text style={s.caption}>Assigned colleagues</Text>
							<Text selectable style={s.body}>
								{job.teammate}
							</Text>
						</View>
						<View style={[s.person, s.contact]}>
							<Text style={s.caption}>Site contact</Text>
							<Text selectable style={s.body}>
								{job.contact ||
									(job.contactUnavailable
										? "Site contact unavailable"
										: "No site contact recorded")}
							</Text>
							<Text selectable style={s.caption}>
								{job.contactPhone || "No phone number recorded"}
							</Text>
						</View>
					</ExpandableSection>
					<ExpandableSection
						title="Assigned equipment"
						icon="briefcase"
						summary={`${job.equipment.length} ${job.equipment.length === 1 ? "item" : "items"}`}
					>
						{job.equipment.length ? (
							job.equipment.map((item, index) => (
								<View
									key={`${index}:${item}`}
									style={[s.equipment, index > 0 && s.equipmentBorder]}
								>
									<Icon name="briefcase" size={17} color="#65748a" />
									<Text selectable style={[s.body, s.flex]}>
										{item}
									</Text>
								</View>
							))
						) : (
							<Text style={s.body}>No equipment assigned.</Text>
						)}
					</ExpandableSection>
				</ScrollView>
				<View
					style={[s.footer, { paddingBottom: Math.max(insets.bottom, 14) }]}
				>
					{actionError ? (
						<Text accessibilityRole="alert" style={s.error}>
							{actionError}
						</Text>
					) : null}
					<View style={s.actions}>
						<Pressable
							accessibilityRole="button"
							accessibilityLabel={
								job.address
									? "Directions"
									: "Directions unavailable: no site address"
							}
							accessibilityState={{ disabled: !job.address }}
							disabled={!job.address}
							onPress={() => {
								if (job.address)
									openLink(
										`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(job.address)}`,
										"Unable to open maps. Please try again.",
									);
							}}
							style={({ pressed }) => [
								s.button,
								(!job.address || pressed) && s.pressed,
							]}
						>
							<Icon name="navigation" size={20} />
							<Text style={s.buttonText}>Directions</Text>
						</Pressable>
						<Pressable
							accessibilityRole="button"
							accessibilityLabel={
								phone ? "Call contact" : "Call unavailable: no phone number"
							}
							accessibilityState={{ disabled: !phone }}
							disabled={!phone}
							onPress={() => {
								if (phone)
									openLink(
										`tel:${phone}`,
										"Unable to start a call on this device.",
									);
							}}
							style={({ pressed }) => [
								s.button,
								s.primary,
								(!phone || pressed) && s.pressed,
							]}
						>
							<Icon name="phone" size={20} color="#fff" />
							<Text style={[s.buttonText, s.white]}>Call contact</Text>
						</Pressable>
					</View>
				</View>
			</Animated.View>
		</View>
	);
}

const s = StyleSheet.create({
	overlay: {
		flex: 1,
		justifyContent: "flex-end",
	},
	sheet: {
		width: "100%",
		maxWidth: 540,
		height: "100%",
		alignSelf: "center",
		backgroundColor: "#fff",
		borderTopLeftRadius: 24,
		borderTopRightRadius: 24,
		overflow: "hidden",
	},
	header: {
		paddingHorizontal: 20,
		paddingBottom: 16,
		borderBottomWidth: 1,
		borderColor: "#e6ebf1",
	},
	handleArea: { height: 44, alignItems: "center", justifyContent: "center" },
	handle: { width: 38, height: 4, borderRadius: 3, backgroundColor: "#bdc5d0" },
	titleRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
	flex: { flex: 1 },
	title: { fontSize: 23, lineHeight: 29, fontWeight: "700", color: "#10213b" },
	subtitle: { fontSize: 15, lineHeight: 22, color: "#53647d", marginTop: 4 },
	close: {
		minHeight: 44,
		width: 44,
		alignItems: "center",
		justifyContent: "center",
		marginRight: -10,
		marginTop: -6,
	},
	badge: {
		alignSelf: "flex-start",
		backgroundColor: "#eef2f7",
		borderRadius: 20,
		paddingHorizontal: 12,
		paddingVertical: 5,
		marginTop: 12,
	},
	status: {
		fontSize: 13,
		fontWeight: "600",
		color: "#344d70",
		textTransform: "capitalize",
	},
	scroll: { flex: 1 },
	content: { padding: 16, gap: 12 },
	fact: {
		flexDirection: "row",
		alignItems: "flex-start",
		gap: 14,
		padding: 8,
		paddingBottom: 16,
		borderBottomWidth: 1,
		borderColor: "#e6ebf1",
	},
	heading: {
		fontSize: 15,
		lineHeight: 22,
		color: "#10213b",
		fontWeight: "700",
	},
	body: { fontSize: 15, lineHeight: 23, color: "#34465f" },
	caption: { fontSize: 13, lineHeight: 20, color: "#65748a" },
	access: {
		padding: 14,
		flexDirection: "row",
		gap: 12,
		backgroundColor: "#fff7e6",
		borderWidth: 1,
		borderColor: "#f3d79d",
		borderRadius: 12,
	},
	section: {
		borderWidth: 1,
		borderColor: "#dfe6ef",
		borderRadius: 12,
		overflow: "hidden",
	},
	sectionHeader: {
		flexDirection: "row",
		alignItems: "center",
		gap: 10,
		padding: 14,
		minHeight: 56,
	},
	sectionBody: { paddingHorizontal: 14, paddingBottom: 16, gap: 10 },
	person: { gap: 2 },
	contact: { borderTopWidth: 1, borderColor: "#e6ebf1", paddingTop: 12 },
	equipment: {
		flexDirection: "row",
		gap: 12,
		alignItems: "flex-start",
		paddingVertical: 6,
	},
	equipmentBorder: {
		borderTopWidth: 1,
		borderColor: "#e6ebf1",
		paddingTop: 12,
	},
	notice: {
		padding: 12,
		borderRadius: 8,
		backgroundColor: "#eff6ff",
		color: "#344d70",
		fontSize: 14,
		lineHeight: 21,
	},
	footer: {
		padding: 16,
		borderTopWidth: 1,
		borderColor: "#e6ebf1",
		backgroundColor: "#fff",
		gap: 10,
	},
	actions: { flexDirection: "row", gap: 10 },
	button: {
		flex: 1,
		minHeight: 48,
		paddingVertical: 12,
		paddingHorizontal: 8,
		borderRadius: 9,
		borderWidth: 1,
		borderColor: "#cbd4e0",
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		gap: 8,
	},
	primary: { backgroundColor: "#d41469", borderColor: "#d41469" },
	buttonText: {
		fontSize: 14,
		lineHeight: 20,
		fontWeight: "700",
		color: "#10213b",
		flexShrink: 1,
	},
	white: { color: "#fff" },
	pressed: { opacity: 0.45 },
	error: { color: "#b42318", fontSize: 13, lineHeight: 18 },
});
