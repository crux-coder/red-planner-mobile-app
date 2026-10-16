import type { ReactNode } from "react";
import {
	Pressable,
	StyleSheet,
	Text,
	useColorScheme,
	View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { LoadingSkeleton } from "@/components/home/loading-skeleton";
import { useAuth } from "@/context/auth";

export function useColors() {
	const dark = useColorScheme() === "dark";
	return {
		background: dark ? "#111111" : "#ffffff",
		text: dark ? "#fafafa" : "#18181b",
		muted: dark ? "#a1a1aa" : "#52525b",
		border: dark ? "#3f3f46" : "#d4d4d8",
		error: dark ? "#fca5a5" : "#b91c1c",
	};
}

export function Screen({ children }: { children: ReactNode }) {
	const colors = useColors();
	return (
		<SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
			<View style={styles.content}>{children}</View>
		</SafeAreaView>
	);
}

export function ActionButton({
	title,
	onPress,
	busy = false,
}: {
	title: string;
	onPress: () => void;
	busy?: boolean;
}) {
	return (
		<Pressable
			accessibilityRole="button"
			accessibilityLabel={title}
			accessibilityState={{ disabled: busy, busy }}
			disabled={busy}
			onPress={onPress}
			style={({ pressed }) => [
				styles.button,
				{ opacity: pressed || busy ? 0.65 : 1 },
			]}
		>
			{busy ? (
				<LoadingSkeleton inline inverted label={title} />
			) : (
				<Text style={styles.buttonText}>{title}</Text>
			)}
		</Pressable>
	);
}

export function SessionStatus() {
	const { error, retry } = useAuth();
	const colors = useColors();
	return (
		<Screen>
			{error ? (
				<>
					<Text accessibilityRole="alert" style={{ color: colors.error }}>
						{error}
					</Text>
					<ActionButton title="Try again" onPress={retry} />
				</>
			) : (
				<LoadingSkeleton label="Restoring session" />
			)}
		</Screen>
	);
}

export const styles = StyleSheet.create({
	content: {
		flex: 1,
		justifyContent: "center",
		width: "100%",
		maxWidth: 480,
		alignSelf: "center",
		padding: 24,
		gap: 20,
	},
	title: { fontSize: 32, fontWeight: "700" },
	text: { fontSize: 16, lineHeight: 24 },
	input: {
		borderWidth: 1,
		borderRadius: 10,
		padding: 14,
		fontSize: 16,
		minHeight: 50,
	},
	button: {
		backgroundColor: "#b91c1c",
		borderRadius: 10,
		padding: 16,
		alignItems: "center",
		minHeight: 52,
	},
	buttonText: { color: "white", fontSize: 16, fontWeight: "600" },
});
