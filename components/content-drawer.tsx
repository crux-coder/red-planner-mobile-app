import { useState, type ReactNode } from "react";
import {
	Animated,
	Modal,
	Pressable,
	ScrollView,
	StyleSheet,
	Text,
	View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useDrawerMotion } from "@/components/home/use-drawer-motion";

// Mount only while open so each presentation starts with a fresh entrance animation.
export function ContentDrawer({
	title,
	onClose,
	children,
}: {
	title: string;
	onClose: () => void;
	children: ReactNode;
}) {
	const insets = useSafeAreaInsets();
	const [closing, setClosing] = useState(false);
	const close = () => setClosing(true);
	const { translateY, backdropOpacity, dragHandlers } = useDrawerMotion({
		closing,
		onClose: close,
		onClosed: onClose,
	});
	return (
		<Modal
			visible
			transparent
			animationType="none"
			statusBarTranslucent
			onRequestClose={close}
		>
			<View style={{ flex: 1 }}>
				<Animated.View
					style={[
						StyleSheet.absoluteFill,
						{ backgroundColor: "#101b2b80", opacity: backdropOpacity },
					]}
				>
					<Pressable
						accessibilityRole="button"
						accessibilityLabel={`Dismiss ${title}`}
						onPress={close}
						style={StyleSheet.absoluteFill}
					/>
				</Animated.View>
				<View
					pointerEvents="box-none"
					style={{
						flex: 1,
						justifyContent: "flex-end",
						paddingTop: insets.top + 16,
						paddingLeft: insets.left,
						paddingRight: insets.right,
					}}
				>
					<Animated.View
						accessibilityViewIsModal
						onAccessibilityEscape={close}
						style={{
							maxHeight: "100%",
							flexShrink: 1,
							width: "100%",
							maxWidth: 540,
							alignSelf: "center",
							backgroundColor: "white",
							borderTopLeftRadius: 24,
							borderTopRightRadius: 24,
							overflow: "hidden",
							paddingBottom: insets.bottom,
							transform: [{ translateY }],
						}}
					>
						<View
							{...dragHandlers}
							collapsable={false}
							style={{ flexShrink: 0 }}
						>
							<View
								style={{
									height: 28,
									alignItems: "center",
									justifyContent: "center",
								}}
							>
								<View
									style={{
										width: 38,
										height: 4,
										borderRadius: 3,
										backgroundColor: "#bdc5d0",
									}}
								/>
							</View>
							<View
								style={{
									paddingHorizontal: 20,
									paddingBottom: 8,
									flexDirection: "row",
									alignItems: "center",
									gap: 12,
								}}
							>
								<Text
									accessibilityRole="header"
									style={{
										flex: 1,
										fontSize: 18,
										fontWeight: "700",
										color: "#10213b",
									}}
								>
									{title}
								</Text>
								<Pressable
									accessibilityRole="button"
									onPress={close}
									style={{
										minHeight: 44,
										justifyContent: "center",
										paddingHorizontal: 8,
									}}
								>
									<Text
										style={{
											color: "#e90087",
											fontSize: 14,
											fontWeight: "600",
										}}
									>
										Close
									</Text>
								</Pressable>
							</View>
						</View>
						<ScrollView
							style={{ flexGrow: 0, flexShrink: 1 }}
							keyboardShouldPersistTaps="handled"
							contentContainerStyle={{ padding: 20, paddingTop: 8, gap: 12 }}
						>
							{children}
						</ScrollView>
					</Animated.View>
				</View>
			</View>
		</Modal>
	);
}
