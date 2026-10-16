import type { ReactNode } from "react";
import {
	KeyboardAvoidingView,
	Platform,
	Pressable,
	ScrollView,
	StyleSheet,
	Text,
	TextInput,
	type TextInputProps,
	useColorScheme,
	View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Path, Rect, SvgXml } from "react-native-svg";

import logo from "@/assets/web-logo";
import { LoadingSkeleton } from "@/components/home/loading-skeleton";

export function useAuthColors() {
	const dark = useColorScheme() === "dark";
	return {
		background: dark ? "#09090b" : "#ffffff",
		text: dark ? "#fafafa" : "#09090b",
		muted: dark ? "#a1a1aa" : "#71717a",
		border: dark ? "#27272a" : "#e4e4e7",
		primary: "#e90c86",
		error: dark ? "#fca5a5" : "#b91c1c",
		success: dark ? "#86efac" : "#15803d",
	};
}

export function AuthScreen({
	title,
	description,
	children,
}: {
	title: string;
	description: string;
	children: ReactNode;
}) {
	const colors = useAuthColors();
	return (
		<SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
			<KeyboardAvoidingView
				style={{ flex: 1 }}
				behavior={Platform.OS === "ios" ? "padding" : undefined}
			>
				<ScrollView
					keyboardShouldPersistTaps="handled"
					contentContainerStyle={s.page}
				>
					<View style={s.content}>
						<View style={s.logo}>
							<SvgXml
								xml={logo}
								width={168}
								height={96}
								accessibilityLabel="Red Laser Scanning"
							/>
						</View>
						<View style={s.header}>
							<Text
								accessibilityRole="header"
								style={[s.title, { color: colors.text }]}
							>
								{title}
							</Text>
							<Text style={[s.description, { color: colors.muted }]}>
								{description}
							</Text>
						</View>
						<View style={s.body}>{children}</View>
					</View>
				</ScrollView>
			</KeyboardAvoidingView>
		</SafeAreaView>
	);
}

export function AuthIcon({
	kind,
	color,
}: {
	kind: "microsoft" | "mail" | "login";
	color: string;
}) {
	if (kind === "microsoft")
		return (
			<Svg width={16} height={16} viewBox="0 0 24 24">
				<Rect x="2" y="2" width="9" height="9" fill="#f25022" />
				<Rect x="13" y="2" width="9" height="9" fill="#7fba00" />
				<Rect x="2" y="13" width="9" height="9" fill="#00a4ef" />
				<Rect x="13" y="13" width="9" height="9" fill="#ffb900" />
			</Svg>
		);
	return (
		<Svg
			width={18}
			height={18}
			viewBox="0 0 24 24"
			fill="none"
			stroke={color}
			strokeWidth={2}
			strokeLinecap="round"
			strokeLinejoin="round"
		>
			{kind === "mail" ? (
				<>
					<Rect x="2" y="4" width="20" height="16" rx="2" />
					<Path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
				</>
			) : (
				<>
					<Path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
				</>
			)}
		</Svg>
	);
}

export function AuthButton({
	title,
	onPress,
	outline = false,
	busy = false,
	disabled = false,
	icon,
}: {
	title: string;
	onPress: () => void;
	outline?: boolean;
	busy?: boolean;
	disabled?: boolean;
	icon?: "microsoft" | "mail" | "login";
}) {
	const c = useAuthColors();
	const color = outline ? c.primary : "white";
	return (
		<Pressable
			accessibilityRole="button"
			accessibilityLabel={title}
			accessibilityState={{ disabled: disabled || busy, busy }}
			disabled={disabled || busy}
			onPress={onPress}
			style={({ pressed }) => [
				s.button,
				{
					borderColor: c.primary,
					borderWidth: outline ? 2 : 0,
					backgroundColor: outline ? c.background : c.primary,
					opacity: pressed || disabled || busy ? 0.5 : 1,
				},
			]}
		>
			{busy ? (
				<LoadingSkeleton inline inverted={!outline} label={title} />
			) : (
				<>
					{icon ? <AuthIcon kind={icon} color={color} /> : null}
					<Text
						style={{
							color,
							fontSize: 16,
							fontWeight: "600",
							flexShrink: 1,
							textAlign: "center",
						}}
					>
						{title}
					</Text>
				</>
			)}
		</Pressable>
	);
}

export function AuthInput({
	label,
	trailing,
	...props
}: TextInputProps & { label: string; trailing?: ReactNode }) {
	const c = useAuthColors();
	return (
		<View style={{ gap: 8 }}>
			<View
				style={{
					flexDirection: "row",
					alignItems: "center",
					justifyContent: "space-between",
					gap: 8,
				}}
			>
				<Text style={{ color: c.text, fontSize: 14, fontWeight: "500" }}>
					{label}
				</Text>
				{trailing}
			</View>
			<TextInput
				accessibilityLabel={label}
				placeholderTextColor={c.muted}
				autoCapitalize="none"
				autoCorrect={false}
				{...props}
				style={[s.input, { color: c.text, borderColor: c.border }, props.style]}
			/>
		</View>
	);
}

export function AuthMessage({
	message,
	success = false,
}: {
	message: string | null;
	success?: boolean;
}) {
	const c = useAuthColors();
	if (!message) return null;
	const color = success ? c.success : c.error;
	return (
		<View
			accessibilityRole="alert"
			style={{
				padding: 16,
				gap: 4,
				borderWidth: 1,
				borderColor: color,
				borderRadius: 8,
			}}
		>
			<Text style={{ color, fontWeight: "600" }}>
				{success ? "Success" : "Error"}
			</Text>
			<Text style={{ color, fontSize: 14, lineHeight: 20 }}>{message}</Text>
		</View>
	);
}

export function AuthTextButton({
	title,
	onPress,
	disabled,
}: {
	title: string;
	onPress: () => void;
	disabled?: boolean;
}) {
	const c = useAuthColors();
	return (
		<Pressable
			accessibilityRole="button"
			disabled={disabled}
			onPress={onPress}
			hitSlop={8}
			style={{
				alignSelf: "center",
				minHeight: 44,
				justifyContent: "center",
				opacity: disabled ? 0.5 : 1,
			}}
		>
			<Text style={{ color: c.text, fontSize: 14, textAlign: "center" }}>
				{title}
			</Text>
		</Pressable>
	);
}

export function AuthDivider() {
	const c = useAuthColors();
	return (
		<View
			style={{ height: 16, justifyContent: "center", alignItems: "center" }}
		>
			<View
				style={{
					position: "absolute",
					width: "100%",
					height: 1,
					backgroundColor: c.border,
				}}
			/>
			<Text
				style={{
					paddingHorizontal: 8,
					backgroundColor: c.background,
					color: c.muted,
					fontSize: 12,
				}}
			>
				OR
			</Text>
		</View>
	);
}

const s = StyleSheet.create({
	page: {
		flexGrow: 1,
		justifyContent: "center",
		alignItems: "center",
		padding: 24,
	},
	content: {
		width: "100%",
		maxWidth: 560,
	},
	logo: { alignItems: "center", marginBottom: 28 },
	header: { gap: 8, marginBottom: 32 },
	title: { fontSize: 30, fontWeight: "600", letterSpacing: -0.7 },
	description: { fontSize: 16, lineHeight: 24 },
	body: { gap: 20 },
	input: {
		minHeight: 56,
		borderWidth: 1,
		borderRadius: 10,
		paddingHorizontal: 16,
		paddingVertical: 14,
		fontSize: 16,
	},
	button: {
		minHeight: 56,
		borderRadius: 10,
		paddingHorizontal: 16,
		paddingVertical: 14,
		alignItems: "center",
		justifyContent: "center",
		flexDirection: "row",
		gap: 8,
	},
});
