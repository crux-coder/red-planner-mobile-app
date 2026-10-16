import { Stack } from "expo-router";
import { StatusBar, useColorScheme } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Toaster } from "sonner-native";

import { AuthProvider } from "@/context/auth";

export default function RootLayout() {
	const dark = useColorScheme() === "dark";
	return (
		<GestureHandlerRootView style={{ flex: 1 }}>
			<SafeAreaProvider>
				<StatusBar barStyle={dark ? "light-content" : "dark-content"} />
				<AuthProvider>
					<Stack screenOptions={{ headerShown: false }} />
				</AuthProvider>
				<Toaster position="bottom-center" offset={110} richColors />
			</SafeAreaProvider>
		</GestureHandlerRootView>
	);
}
