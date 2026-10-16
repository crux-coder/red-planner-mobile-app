import { BlurView } from "expo-blur";
import { StyleSheet, View } from "react-native";

/** Shared material for overlays; keep the content beneath it transparent. */
export function FrostedBackground({
	borderRadius = 0,
}: {
	borderRadius?: number;
}) {
	return (
		<View
			pointerEvents="none"
			style={[StyleSheet.absoluteFill, { borderRadius, overflow: "hidden" }]}
		>
			<BlurView
				tint="default"
				intensity={90}
				experimentalBlurMethod="dimezisBlurView"
				style={StyleSheet.absoluteFill}
			/>
			<View style={[StyleSheet.absoluteFill, s.tint]} />
		</View>
	);
}

const s = StyleSheet.create({
	tint: { backgroundColor: "rgba(255, 255, 255, 0.9)" },
});
