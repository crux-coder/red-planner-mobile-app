import { Stack } from "expo-router";

export const unstable_settings = {
	initialRouteName: "index",
};

export default function AppLayout() {
	return (
		<Stack screenOptions={{ headerShown: false, gestureEnabled: false }}>
			<Stack.Screen name="index" />
			<Stack.Screen
				name="add-block"
				options={{
					presentation: "modal",
					animationTypeForReplace: "push",
					gestureEnabled: true,
					animation: "slide_from_bottom",
				}}
			/>
		</Stack>
	);
}
