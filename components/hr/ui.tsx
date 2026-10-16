import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import {
	Pressable,
	ScrollView,
	StyleSheet,
	Text,
	TextInput,
	View,
} from "react-native";

import { HrLoadingSkeleton, type HrSkeletonVariant } from "./loading-skeleton";

import { ContentDrawer } from "@/components/content-drawer";
import { Icon, type IconName } from "@/components/home/icon";
import { LoadingSkeleton } from "@/components/home/loading-skeleton";
import { label } from "@/lib/hr/domain";
export const pink = "#e90087";
export function Button({
	title,
	onPress,
	secondary = false,
	disabled = false,
	busy = false,
}: {
	title: string;
	onPress: () => void;
	secondary?: boolean;
	disabled?: boolean;
	busy?: boolean;
}) {
	return (
		<Pressable
			accessibilityRole="button"
			accessibilityLabel={title}
			accessibilityState={{ disabled: disabled || busy, busy }}
			disabled={disabled || busy}
			onPress={onPress}
			style={({ pressed }) => [
				s.button,
				secondary ? s.secondary : s.primary,
				{ opacity: pressed || disabled || busy ? 0.55 : 1 },
			]}
		>
			{busy ? (
				<LoadingSkeleton inline inverted={!secondary} label={title} />
			) : (
				<Text style={[s.buttonText, { color: secondary ? pink : "#fff" }]}>
					{title}
				</Text>
			)}
		</Pressable>
	);
}
export function NavigationButton({
	label,
	onPress,
	disabled = false,
	forward = false,
}: {
	label: string;
	onPress: () => void;
	disabled?: boolean;
	forward?: boolean;
}) {
	return (
		<Pressable
			accessibilityRole="button"
			accessibilityLabel={label}
			accessibilityState={{ disabled }}
			disabled={disabled}
			onPress={onPress}
			style={({ pressed }) => ({
				width: 44,
				height: 44,
				alignItems: "center",
				justifyContent: "center",
				opacity: disabled || pressed ? 0.4 : 1,
			})}
		>
			<View style={{ transform: [{ rotate: forward ? "0deg" : "180deg" }] }}>
				<Icon name="chevron" size={24} />
			</View>
		</Pressable>
	);
}
export function Section({ children }: { children: ReactNode }) {
	return <View style={s.section}>{children}</View>;
}
export function Badge({ value }: { value: string }) {
	const positive = [
		"approved",
		"signed",
		"acknowledged",
		"completed",
		"accepted",
		"submitted",
		"read",
	].includes(value);
	return (
		<View
			style={[s.badge, { backgroundColor: positive ? "#e6f6ed" : "#fff0cf" }]}
		>
			<Text
				style={{
					fontSize: 12,
					fontWeight: "600",
					color: positive ? "#227646" : "#805600",
				}}
			>
				{label(value)}
			</Text>
		</View>
	);
}
export function ErrorNotice({
	error,
	retry,
}: {
	error: string | null;
	retry?: () => void;
}) {
	return error ? (
		<View style={s.errorBox}>
			<Text accessibilityRole="alert" style={s.error}>
				{error}
			</Text>
			{retry ? <Button title="Try again" secondary onPress={retry} /> : null}
		</View>
	) : null;
}
export function Loading({
	variant = "content",
}: {
	variant?: HrSkeletonVariant;
}) {
	return <HrLoadingSkeleton variant={variant} />;
}
export function Empty({ text }: { text: string }) {
	return <Text style={[s.muted, { paddingVertical: 16 }]}>{text}</Text>;
}
export function Row({
	title,
	detail,
	icon = "document",
	onPress,
}: {
	title: string;
	detail?: string;
	icon?: IconName;
	onPress: () => void;
}) {
	return (
		<Pressable
			accessibilityRole="button"
			onPress={onPress}
			style={({ pressed }) => [s.row, { opacity: pressed ? 0.6 : 1 }]}
		>
			<View style={s.icon}>
				<Icon name={icon} color={pink} />
			</View>
			<View style={{ flex: 1, gap: 4 }}>
				<Text style={s.heading}>{title}</Text>
				{detail ? <Text style={s.muted}>{detail}</Text> : null}
			</View>
			<Icon name="chevron" size={18} />
		</Pressable>
	);
}
export function Input({
	autoFocus = false,
	compact = false,
	title,
	value,
	onChangeText,
	onBlur,
	multiline = false,
	placeholder,
	editable = true,
	keyboardType = "default",
}: {
	autoFocus?: boolean;
	compact?: boolean;
	title: string;
	value: string;
	onChangeText: (v: string) => void;
	onBlur?: () => void;
	multiline?: boolean;
	placeholder?: string;
	editable?: boolean;
	keyboardType?: "default" | "numeric" | "email-address" | "phone-pad";
}) {
	const inputRef = useRef<TextInput>(null);
	useEffect(() => {
		if (autoFocus) inputRef.current?.focus();
	}, [autoFocus]);
	const contents = (
		<>
			<Text style={compact ? s.compactLabel : s.label}>{title}</Text>
			<TextInput
				ref={inputRef}
				accessibilityLabel={title}
				style={[
					compact ? s.compactInput : s.input,
					multiline ? { minHeight: 100, textAlignVertical: "top" } : null,
				]}
				value={value}
				onChangeText={onChangeText}
				onBlur={onBlur}
				multiline={multiline}
				placeholder={placeholder ?? (compact ? "Not provided" : undefined)}
				placeholderTextColor="#7b8798"
				editable={editable}
				keyboardType={keyboardType}
				autoCapitalize={keyboardType === "email-address" ? "none" : "sentences"}
				autoCorrect={keyboardType !== "email-address"}
			/>
			{compact ? <Icon name="chevron" size={14} color="#a8b2bf" /> : null}
		</>
	);
	return compact ? (
		<Pressable
			accessible={false}
			focusable={false}
			disabled={!editable}
			onPress={() => inputRef.current?.focus()}
			style={s.compactRow}
		>
			{contents}
		</Pressable>
	) : (
		<View style={s.field}>{contents}</View>
	);
}
export function Select({
	compact = false,
	title,
	value,
	options,
	onChange,
	disabled = false,
	selectedColor,
	rowIcon,
	separator = true,
}: {
	compact?: boolean;
	title: string;
	value: string;
	options: { value: string; label: string }[];
	onChange: (v: string) => void;
	disabled?: boolean;
	selectedColor?: string;
	rowIcon?: IconName;
	separator?: boolean;
}) {
	const [open, setOpen] = useState(false);
	return (
		<View style={rowIcon || compact ? undefined : s.field}>
			{!rowIcon && !compact ? <Text style={s.label}>{title}</Text> : null}
			<Pressable
				accessibilityRole="button"
				accessibilityState={{ expanded: open, disabled }}
				accessibilityLabel={`${title}: ${options.find((o) => o.value === value)?.label ?? "Select"}`}
				disabled={disabled}
				onPress={() => setOpen(true)}
				style={[
					compact
						? s.compactRow
						: rowIcon
							? {
									minHeight: 62,
									paddingVertical: 14,
									borderBottomWidth: separator ? 1 : 0,
									borderBottomColor: "#e8edf2",
								}
							: s.input,
					{
						flexDirection: "row",
						alignItems: "center",
						gap: 12,
						opacity: disabled ? 0.5 : 1,
					},
				]}
			>
				{compact ? <Text style={s.compactLabel}>{title}</Text> : null}
				{rowIcon ? (
					<>
						<Icon name={rowIcon} size={26} color="#075ed2" />
						<Text
							style={{
								flex: 1,
								color: "#111111",
								fontSize: 15,
								lineHeight: 21,
							}}
						>
							{title}
						</Text>
					</>
				) : null}
				<Text
					style={[
						s.text,
						compact && { color: value ? "#111111" : "#7b8798", fontSize: 14 },
						rowIcon
							? {
									flexShrink: 0,
									maxWidth: "38%",
									textAlign: "right",
									fontSize: 14,
								}
							: { flex: 1 },
						value && selectedColor
							? { color: selectedColor, fontWeight: "700" }
							: null,
					]}
				>
					{options.find((o) => o.value === value)?.label ?? "Select…"}
				</Text>
				<Icon name="chevrons-up-down" size={18} color="#627189" />
			</Pressable>
			{open ? (
				<ContentDrawer title={title} onClose={() => setOpen(false)}>
					{options.map((o) => (
						<Pressable
							key={o.value}
							accessibilityRole="button"
							accessibilityLabel={o.label}
							accessibilityState={{ selected: value === o.value }}
							onPress={() => {
								setOpen(false);
								onChange(o.value);
							}}
							style={({ pressed }) => [
								s.button,
								{
									backgroundColor:
										value === o.value && !selectedColor ? pink : "#fff",
									borderWidth: 1,
									borderColor:
										value === o.value && !selectedColor ? pink : "#e0e6ed",
									opacity: pressed ? 0.6 : 1,
								},
							]}
						>
							<Text
								style={[
									s.buttonText,
									{
										color:
											value === o.value
												? (selectedColor ?? "white")
												: "#10213b",
										fontWeight: value === o.value ? "700" : "400",
									},
								]}
							>
								{o.label}
							</Text>
							{value === o.value ? (
								<Icon name="check" color={selectedColor ?? "white"} size={18} />
							) : null}
						</Pressable>
					))}
				</ContentDrawer>
			) : null}
		</View>
	);
}
export function Tabs({
	value,
	options,
	onChange,
}: {
	value: string;
	options: string[];
	onChange: (v: string) => void;
}) {
	return (
		<ScrollView
			horizontal
			showsHorizontalScrollIndicator={false}
			contentContainerStyle={s.tabs}
		>
			{options.map((o) => (
				<Pressable
					key={o}
					accessibilityRole="tab"
					accessibilityState={{ selected: value === o }}
					onPress={() => onChange(o)}
					style={[s.tab, value === o ? { backgroundColor: pink } : null]}
				>
					<Text
						style={{
							fontSize: 14,
							fontWeight: "600",
							color: value === o ? "#fff" : "#53647d",
						}}
					>
						{o}
					</Text>
				</Pressable>
			))}
		</ScrollView>
	);
}
export function Check({
	checked,
	onChange,
	title,
	disabled = false,
}: {
	checked: boolean;
	onChange: (v: boolean) => void;
	title: string;
	disabled?: boolean;
}) {
	return (
		<Pressable
			accessibilityRole="checkbox"
			accessibilityState={{ checked, disabled }}
			disabled={disabled}
			onPress={() => onChange(!checked)}
			style={s.row}
		>
			<View
				style={[
					s.checkbox,
					checked ? { backgroundColor: pink, borderColor: pink } : null,
				]}
			>
				{checked ? <Icon name="check" size={18} color="#fff" /> : null}
			</View>
			<Text style={[s.text, { flex: 1 }]}>{title}</Text>
		</Pressable>
	);
}
export const s = StyleSheet.create({
	compactRow: {
		minHeight: 50,
		flexDirection: "row",
		alignItems: "center",
		gap: 12,
		borderBottomWidth: StyleSheet.hairlineWidth,
		borderBottomColor: "#e0e6ed",
		paddingVertical: 8,
	},
	compactLabel: {
		width: "34%",
		fontSize: 14,
		lineHeight: 20,
		color: "#627189",
	},
	compactInput: {
		flex: 1,
		minWidth: 0,
		minHeight: 34,
		paddingVertical: 6,
		paddingHorizontal: 0,
		fontSize: 14,
		color: "#111111",
	},
	flex: { flex: 1, backgroundColor: "#fff" },
	content: { padding: 20, gap: 16 },
	title: { fontSize: 28, fontWeight: "700", color: "#10213b" },
	heading: { fontSize: 17, fontWeight: "600", color: "#10213b" },
	text: { fontSize: 15, lineHeight: 22, color: "#10213b" },
	muted: { fontSize: 13, lineHeight: 20, color: "#53647d" },
	label: { fontSize: 14, fontWeight: "600", color: "#10213b" },
	field: { gap: 8 },
	input: {
		minHeight: 48,
		borderWidth: 1,
		borderColor: "#d8e1eb",
		borderRadius: 12,
		padding: 13,
		fontSize: 16,
		color: "#10213b",
		backgroundColor: "#fff",
	},
	section: {
		gap: 12,
		paddingVertical: 16,
		borderBottomWidth: StyleSheet.hairlineWidth,
		borderBottomColor: "#e0e6ef",
	},
	button: {
		minHeight: 48,
		padding: 13,
		borderRadius: 14,
		alignItems: "center",
		justifyContent: "center",
		borderWidth: 1,
	},
	primary: { backgroundColor: pink, borderColor: pink },
	secondary: { backgroundColor: "#fff", borderColor: "#e0e6ef" },
	buttonText: { fontSize: 15, fontWeight: "600", textAlign: "center" },
	row: {
		flexDirection: "row",
		alignItems: "center",
		gap: 12,
		minHeight: 52,
		paddingVertical: 8,
	},
	icon: {
		width: 40,
		height: 40,
		borderRadius: 12,
		backgroundColor: "#fff0f8",
		alignItems: "center",
		justifyContent: "center",
	},
	badge: {
		alignSelf: "flex-start",
		borderRadius: 16,
		paddingHorizontal: 10,
		paddingVertical: 5,
	},
	errorBox: {
		padding: 14,
		gap: 12,
		borderRadius: 12,
		backgroundColor: "#fff0f3",
	},
	error: { fontSize: 14, lineHeight: 20, color: "#b91c1c" },
	tabs: { gap: 6, paddingVertical: 4 },
	tab: {
		minHeight: 44,
		paddingHorizontal: 16,
		paddingVertical: 12,
		borderRadius: 22,
		backgroundColor: "#f0f3f8",
	},
	checkbox: {
		width: 24,
		height: 24,
		borderWidth: 1,
		borderColor: "#a3afbf",
		borderRadius: 6,
		alignItems: "center",
		justifyContent: "center",
	},
});
