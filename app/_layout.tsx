import "../global.css";

import { Slot } from "expo-router";
import { View } from "react-native";

import { SupabaseProvider, useSupabase } from "@/context/supabase-provider";
import * as Sentry from "@sentry/react-native";

Sentry.init({
	dsn: "https://c179fdb880640f9efc422a1a4ad1c68f@o4508434425184256.ingest.de.sentry.io/4509452272205904",

	// Adds more context data to events (IP address, cookies, user, etc.)
	// For more information, visit: https://docs.sentry.io/platforms/react-native/data-management/data-collected/
	sendDefaultPii: true,

	// Configure Session Replay
	replaysSessionSampleRate: 0.1,
	replaysOnErrorSampleRate: 1,
	integrations: [
		Sentry.mobileReplayIntegration(),
		Sentry.feedbackIntegration(),
	],

	// uncomment the line below to enable Spotlight (https://spotlightjs.com)
	// spotlight: __DEV__,
});

function RootLayoutNav() {
	const { onLayoutRootView } = useSupabase();

	return (
		<View style={{ flex: 1 }} onLayout={onLayoutRootView}>
			<Slot />
		</View>
	);
}

export default Sentry.wrap(function AppLayout() {
	return (
		<SupabaseProvider>
			<RootLayoutNav />
		</SupabaseProvider>
	);
});
