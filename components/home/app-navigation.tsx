import * as Haptics from "expo-haptics";
import { useEffect, useRef, useState } from "react";
import {
	AccessibilityInfo,
	Animated,
	Platform,
	Pressable,
	ScrollView,
	StyleSheet,
	Text,
	View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { FrostedBackground } from "./frosted-background";
import { Icon, type IconName } from "./icon";

const tabs = [
	{ title: "Today", icon: "home" },
	{ title: "Schedule", icon: "calendar" },
	{ title: "HR", icon: "clipboard" },
	{ title: "Profile", icon: "user" },
] as const;
export type AppTab = (typeof tabs)[number]["title"];

function NavigationTab({
	title,
	icon,
	selected,
	onSelect,
}: {
	title: AppTab;
	icon: IconName;
	selected: boolean;
	onSelect: (tab: AppTab) => void;
}) {
	return (
		<View style={s.tabSlot}>
			<Pressable
				accessibilityRole="tab"
				accessibilityState={{ selected }}
				onPress={() => {
					if (!selected && Platform.OS !== "web") {
						// Feedback is optional: unsupported hardware must not block navigation.
						Haptics.selectionAsync().catch(() => {});
					}
					onSelect(title);
				}}
				style={({ pressed }) => [s.tab, pressed && s.pressed]}
			>
				<Icon name={icon} size={23} color="#53647d" />
				<Text style={s.label}>{title}</Text>
			</Pressable>
		</View>
	);
}

export function AppNavigation({
	active,
	onSelect,
	onHeightChange,
}: {
	active: AppTab;
	onSelect: (tab: AppTab) => void;
	onHeightChange: (height: number) => void;
}) {
	const insets = useSafeAreaInsets();
	const [reduceMotion, setReduceMotion] = useState(true);
	const [trackWidth, setTrackWidth] = useState(0);
	const activeIndex = tabs.findIndex((tab) => tab.title === active);
	const slide = useRef(new Animated.Value(0)).current;
	const previousWidth = useRef(0);
	const tabWidth = Math.max(
		0,
		(trackWidth - 4 * (tabs.length - 1)) / tabs.length,
	);
	useEffect(() => {
		if (!trackWidth) return;
		const toValue = activeIndex * (tabWidth + 4);
		// Layout changes and reduced motion should place the pill immediately.
		if (reduceMotion || previousWidth.current !== trackWidth) {
			slide.stopAnimation();
			slide.setValue(toValue);
			previousWidth.current = trackWidth;
			return;
		}
		const animation = Animated.spring(slide, {
			toValue,
			speed: 24,
			bounciness: 7,
			useNativeDriver: true,
		});
		animation.start();
		return () => animation.stop();
	}, [activeIndex, reduceMotion, slide, tabWidth, trackWidth]);
	useEffect(() => {
		let active = true;
		let changed = false;
		const subscription = AccessibilityInfo.addEventListener(
			"reduceMotionChanged",
			(enabled) => {
				changed = true;
				setReduceMotion(enabled);
			},
		);
		AccessibilityInfo.isReduceMotionEnabled()
			.then((enabled) => {
				if (active && !changed) setReduceMotion(enabled);
			})
			.catch(() => {});
		return () => {
			active = false;
			subscription.remove();
		};
	}, []);
	return (
		<View
			style={[s.dock, { bottom: insets.bottom + 10 }]}
			onLayout={(event) => onHeightChange(event.nativeEvent.layout.height)}
			accessibilityRole="tablist"
		>
			<FrostedBackground borderRadius={32} />
			<View
				style={s.track}
				onLayout={(event) => setTrackWidth(event.nativeEvent.layout.width)}
			>
				{tabs.map(({ title, icon }) => (
					<NavigationTab
						key={title}
						title={title}
						icon={icon}
						selected={active === title}
						onSelect={onSelect}
					/>
				))}
				{trackWidth > 0 ? (
					<Animated.View
						pointerEvents="none"
						accessible={false}
						accessibilityElementsHidden
						importantForAccessibility="no-hide-descendants"
						style={[
							s.indicator,
							{ width: tabWidth, transform: [{ translateX: slide }] },
						]}
					>
						{/* Counter-translate the white content so only the pill moves. */}
						<Animated.View
							style={[
								s.highlightTrack,
								{
									width: trackWidth,
									transform: [{ translateX: Animated.multiply(slide, -1) }],
								},
							]}
						>
							{tabs.map(({ title, icon }) => (
								<View key={title} style={s.tab}>
									<Icon
										name={icon}
										size={23}
										color="#fff"
										filled={title === "Today"}
									/>
									<Text style={[s.label, s.activeLabel]}>{title}</Text>
								</View>
							))}
						</Animated.View>
					</Animated.View>
				) : null}
			</View>
		</View>
	);
}

const pages: Record<
	Exclude<AppTab, "Today" | "Schedule">,
	{
		subtitle: string;
		items: { icon: IconName; title: string; detail: string }[];
	}
> = {
	HR: {
		subtitle: "Your work essentials.",
		items: [
			{
				icon: "clipboard",
				title: "Documents",
				detail: "View your documents, policies and signatures.",
			},
			{
				icon: "calendar",
				title: "Absences",
				detail: "Request time off and view your leave balance.",
			},
			{
				icon: "check",
				title: "My requests",
				detail: "Follow the status of your absence requests.",
			},
		],
	},
	Profile: {
		subtitle: "Your details, kept up to date.",
		items: [
			{
				icon: "user",
				title: "Personal details",
				detail: "Manage your contact information and address.",
			},
			{
				icon: "phone",
				title: "Emergency contact",
				detail: "Keep your emergency contact details current.",
			},
			{
				icon: "shield",
				title: "Qualifications",
				detail: "View your training, certificates and expiry dates.",
			},
		],
	},
};

export function PlaceholderPage({
	page,
	bottomPadding,
	onSignOut,
	signingOut,
	signOutError,
}: {
	page: Exclude<AppTab, "Today" | "Schedule">;
	bottomPadding: number;
	onSignOut: () => void;
	signingOut: boolean;
	signOutError: string | null;
}) {
	const content = pages[page];
	return (
		<ScrollView
			contentContainerStyle={[s.page, { paddingBottom: bottomPadding }]}
		>
			<Text style={s.brand}>RED PLANNER</Text>
			<Text accessibilityRole="header" style={s.title}>
				{page}
			</Text>
			<Text style={s.subtitle}>{content.subtitle}</Text>
			<View style={s.notice}>
				<Text style={s.noticeText}>Coming soon — this page is a preview.</Text>
			</View>
			{content.items.map((item) => (
				<View key={item.title} style={s.card}>
					<View style={s.icon}>
						<Icon name={item.icon} color="#e90087" />
					</View>
					<View style={s.copy}>
						<Text style={s.cardTitle}>{item.title}</Text>
						<Text style={s.detail}>{item.detail}</Text>
					</View>
				</View>
			))}
			{page === "Profile" ? (
				<>
					<Pressable
						accessibilityRole="button"
						disabled={signingOut}
						accessibilityState={{ disabled: signingOut }}
						onPress={onSignOut}
						style={s.signOut}
					>
						<Text style={s.signOutText}>
							{signingOut ? "Signing out…" : "Sign out"}
						</Text>
					</Pressable>
					{signOutError ? (
						<Text accessibilityRole="alert" style={s.error}>
							{signOutError}
						</Text>
					) : null}
				</>
			) : null}
		</ScrollView>
	);
}

const s = StyleSheet.create({
	dock: {
		flexDirection: "row",
		position: "absolute",
		left: 16,
		right: 16,
		zIndex: 10,
		padding: 6,
		gap: 4,
		borderRadius: 32,
		borderWidth: 1,
		borderColor: "#d8e1eb",
		shadowColor: "#071727",
		shadowOffset: { width: 0, height: 5 },
		shadowOpacity: 0.1,
		shadowRadius: 12,
		elevation: 4,
	},
	tab: {
		flex: 1,
		minHeight: 62,
		paddingVertical: 8,
		paddingHorizontal: 2,
		borderRadius: 26,
		alignItems: "center",
		justifyContent: "center",
		gap: 4,
	},
	track: { flex: 1, flexDirection: "row", gap: 4 },
	highlightTrack: { flexDirection: "row", gap: 4, height: "100%" },
	tabSlot: { flex: 1 },
	indicator: {
		overflow: "hidden",
		position: "absolute",
		left: 0,
		top: 0,
		bottom: 0,
		borderRadius: 26,
		backgroundColor: "#e90087",
	},
	pressed: { opacity: 0.7 },
	label: { fontSize: 12, color: "#53647d", textAlign: "center" },
	activeLabel: { color: "#fff" },
	page: { padding: 24, paddingBottom: 30 },
	brand: {
		fontSize: 11,
		letterSpacing: 2,
		fontWeight: "700",
		color: "#e90087",
		marginTop: 12,
		marginBottom: 28,
	},
	title: { fontSize: 32, fontWeight: "700", color: "#10213b", marginBottom: 8 },
	subtitle: {
		fontSize: 15,
		lineHeight: 22,
		color: "#53647d",
		marginBottom: 24,
	},
	notice: {
		backgroundColor: "#fceaf4",
		padding: 12,
		borderRadius: 12,
		marginBottom: 20,
	},
	noticeText: { fontSize: 13, lineHeight: 19, color: "#9e005b" },
	card: {
		flexDirection: "row",
		alignItems: "center",
		gap: 14,
		padding: 16,
		borderWidth: 1,
		borderColor: "#e0e6ef",
		borderRadius: 16,
		marginBottom: 12,
	},
	icon: {
		width: 44,
		height: 44,
		borderRadius: 14,
		backgroundColor: "#fff0f8",
		alignItems: "center",
		justifyContent: "center",
	},
	copy: { flex: 1 },
	cardTitle: {
		fontSize: 16,
		fontWeight: "600",
		color: "#10213b",
		marginBottom: 5,
	},
	detail: { fontSize: 13, lineHeight: 19, color: "#53647d" },
	signOut: {
		alignItems: "center",
		padding: 15,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: "#d8e1eb",
		marginTop: 16,
	},
	signOutText: { color: "#10213b", fontSize: 14, fontWeight: "600" },
	error: { color: "#b91c1c", marginTop: 12 },
});
