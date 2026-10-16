import type { ReactNode } from "react";
import { Image, Pressable, StyleSheet, View } from "react-native";

import { Icon } from "./icon";

export function AppHeader({
	children,
	leading,
	onNotifications,
	unreadCount,
}: {
	children?: ReactNode;
	leading?: ReactNode;
	onNotifications: () => void;
	unreadCount: number;
}) {
	return (
		<View style={s.header}>
			{leading ?? (
				<View style={s.iconSlot}>
					<Image
						source={require("../../assets/logo.png")}
						style={s.logo}
						accessibilityLabel="Red Laser"
					/>
				</View>
			)}
			<View style={s.center}>{children}</View>
			<Pressable
				accessibilityRole="button"
				accessibilityLabel={
					unreadCount > 0
						? `Notifications, ${unreadCount} unread`
						: "Notifications"
				}
				onPress={onNotifications}
				style={s.iconSlot}
			>
				<Icon name="bell" size={23} />
				{unreadCount > 0 ? <View style={s.badge} /> : null}
			</Pressable>
		</View>
	);
}

const s = StyleSheet.create({
	header: {
		flexDirection: "row",
		alignItems: "center",
		paddingTop: 12,
		paddingHorizontal: 24,
		paddingBottom: 10,
	},
	center: { flex: 1 },
	iconSlot: {
		width: 44,
		height: 44,
		alignItems: "center",
		justifyContent: "center",
	},
	badge: {
		position: "absolute",
		top: 7,
		right: 8,
		width: 10,
		height: 10,
		borderRadius: 5,
		backgroundColor: "#e90087",
		borderWidth: 2,
		borderColor: "#fff",
	},
	logo: { width: 36, height: 36 },
});
