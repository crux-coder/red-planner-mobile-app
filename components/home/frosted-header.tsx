import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { FrostedBackground } from "./frosted-background";

/** Render after scroll content so the blur captures updates underneath it. */
export function FrostedHeader({
	children,
	onHeightChange,
}: {
	children: ReactNode;
	onHeightChange: (height: number) => void;
}) {
	const insets = useSafeAreaInsets();
	return (
		<View
			style={s.header}
			onLayout={(event) => onHeightChange(event.nativeEvent.layout.height)}
		>
			<FrostedBackground />
			<View style={{ paddingTop: insets.top }}>{children}</View>
		</View>
	);
}

const s = StyleSheet.create({
	header: {
		position: "absolute",
		top: 0,
		left: 0,
		right: 0,
		zIndex: 2,
		overflow: "hidden",
	},
});
