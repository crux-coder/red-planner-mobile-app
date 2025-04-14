import { View, StyleSheet } from "react-native";
import { useColorScheme } from "@/lib/useColorScheme";

interface CurrentTimeIndicatorProps {
	hourHeight: number;
	visible: boolean;
}

export default function CurrentTimeIndicator({
	hourHeight,
	visible,
}: CurrentTimeIndicatorProps) {
	const { colorScheme } = useColorScheme();
	const isDark = colorScheme === "dark";

	if (!visible) return null;

	const currentHour = new Date().getHours();
	const currentMinute = new Date().getMinutes();
	const position = (currentHour + currentMinute / 60) * hourHeight + 11;

	return (
		<View
			style={[
				styles.currentTimeIndicator,
				{ top: position },
				isDark && styles.currentTimeIndicatorDark,
			]}
		/>
	);
}

const styles = StyleSheet.create({
	currentTimeIndicator: {
		position: "absolute",
		left: 0,
		right: 0,
		height: 2,
		backgroundColor: "red",
		zIndex: 10,
	},
	currentTimeIndicatorDark: {
		backgroundColor: "#ff6b6b",
	},
});
