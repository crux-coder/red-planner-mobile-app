import { Stack } from "expo-router";

import { colors } from "@/constants/colors";
import { useColorScheme } from "@/lib/useColorScheme";

export const unstable_settings = {
	initialRouteName: "welcome",
};

export default function AppLayout() {
	const { colorScheme } = useColorScheme();
	const isDark = colorScheme === "dark";

	return (
		<Stack screenOptions={{ headerShown: false, gestureEnabled: false }}>
			<Stack.Screen name="index" />
			<Stack.Screen name="day" />
			<Stack.Screen
				name="job"
				options={{
					presentation: "modal",
					headerShown: true,
					headerStyle: {
						backgroundColor: isDark
							? colors.dark.background
							: colors.light.background,
					},
					headerTintColor: isDark
						? colors.dark.foreground
						: colors.light.foreground,
					gestureEnabled: true,
				}}
			/>
		</Stack>
	);
}
