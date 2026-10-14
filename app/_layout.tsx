import { Stack } from "expo-router";
import { StatusBar, useColorScheme } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AuthProvider } from "@/context/auth";

export default function RootLayout() {
	const dark = useColorScheme() === "dark";
	return (
		<SafeAreaProvider>
			<StatusBar barStyle={dark ? "light-content" : "dark-content"} />
			<AuthProvider>
				<Stack screenOptions={{ headerShown: false }} />
			</AuthProvider>
		</SafeAreaProvider>
	);
}
