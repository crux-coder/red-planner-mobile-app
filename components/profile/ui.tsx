import { useRef, useState, type ReactNode } from "react";
import {
	ActivityIndicator,
	Animated,
	Keyboard,
	KeyboardAvoidingView,
	Modal,
	Platform,
	Pressable,
	ScrollView,
	StyleSheet,
	Switch,
	Text,
	View,
	useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Icon, type IconName } from "@/components/home/icon";
import { useDrawerMotion } from "@/components/home/use-drawer-motion";
import { Input, Select } from "@/components/hr/ui";
import {
	draftFor,
	editPayload,
	readable,
	optionLabel,
	validateDraft,
	type Field,
} from "@/lib/profile/model";

export function Action({
	title,
	onPress,
	busy = false,
	disabled = false,
	primary = false,
}: {
	title: string;
	onPress: () => void;
	busy?: boolean;
	disabled?: boolean;
	primary?: boolean;
}) {
	return (
		<Pressable
			accessibilityRole="button"
			accessibilityState={{ disabled: disabled || busy, busy }}
			disabled={disabled || busy}
			onPress={onPress}
			style={({ pressed }) => [
				s.action,
				primary && s.primary,
				{ opacity: disabled || pressed ? 0.5 : 1 },
			]}
		>
			{busy ? (
				<ActivityIndicator size="small" color={primary ? "white" : "#e90087"} />
			) : null}
			<Text style={[s.actionText, primary && { color: "white" }]}>
				{busy ? "Saving…" : title}
			</Text>
		</Pressable>
	);
}
export function Section({
	title,
	children,
	onEdit,
	managed = false,
	separator = true,
}: {
	title: string;
	children: ReactNode;
	onEdit?: () => void;
	managed?: boolean;
	separator?: boolean;
}) {
	return (
		<View style={[s.section, !separator && { borderBottomWidth: 0 }]}>
			<View style={s.sectionHeader}>
				<View
					style={{
						flexDirection: "row",
						gap: 10,
						alignItems: "center",
						flex: 1,
					}}
				>
					<Icon
						name={
							(
								{
									"Personal information": "user",
									"Contact details": "phone",
									"Home address": "home",
									"Emergency contacts": "phone",
									"Employment details": "briefcase",
									"Salary & payroll": "receipt",
									"Bank details": "receipt",
									"Identity & right to work": "shield",
									"Clothing sizes": "clothing",
									"Personal documents": "document",
									"Training & certificates": "clipboard",
									"DBS checks": "shield",
									Account: "user",
								} as Record<string, IconName>
							)[title] || "document"
						}
						color="#075ed2"
						size={22}
					/>
					<Text accessibilityRole="header" style={[s.heading, { flex: 1 }]}>
						{title}
					</Text>
				</View>
				{onEdit ? (
					<Action title="Edit" onPress={onEdit} />
				) : managed ? (
					<Text style={s.hint}>Managed by HR</Text>
				) : null}
			</View>
			{children}
		</View>
	);
}
export function Detail({ label, value }: { label: string; value: unknown }) {
	return (
		<View style={s.detail}>
			<Text style={s.label}>{label}</Text>
			<Text selectable style={s.value}>
				{readable(value)}
			</Text>
		</View>
	);
}
export function ProfileSkeleton({
	compact = false,
	menu = false,
}: {
	compact?: boolean;
	menu?: boolean;
}) {
	return (
		<View
			accessible
			accessibilityRole="progressbar"
			accessibilityLabel="Loading profile"
			accessibilityState={{ busy: true }}
		>
			{!compact ? (
				<View style={s.heroSkeleton}>
					<View
						style={[
							s.bone,
							{
								height: 68,
								width: 68,
								borderRadius: 34,
								backgroundColor: "#42536c",
							},
						]}
					/>
					<View style={{ flex: 1, gap: 12 }}>
						{[80, 60, 95, 65].map((w, i) => (
							<View
								key={i}
								style={[s.bone, { width: `${w}%`, backgroundColor: "#42536c" }]}
							/>
						))}
					</View>
				</View>
			) : null}
			{menu ? (
				<View style={{ marginTop: 20 }}>
					<View style={[s.bone, { width: 85, height: 11, marginBottom: 6 }]} />
					{[125, 170, 95, 145, 110].map((width, index) => (
						<View
							key={index}
							style={{
								minHeight: 58,
								paddingVertical: 12,
								flexDirection: "row",
								alignItems: "center",
								gap: 14,
								borderBottomWidth: 1,
								borderBottomColor: "#e8edf2",
							}}
						>
							<View style={[s.bone, { width: 23, height: 23 }]} />
							<View style={{ flex: 1, gap: 6 }}>
								<View style={[s.bone, { width, height: 16 }]} />
								{index === 0 || index === 3 ? (
									<View
										style={[
											s.bone,
											{ width: index === 0 ? "92%" : "75%", height: 12 },
										]}
									/>
								) : null}
							</View>
							<View style={[s.bone, { width: 10, height: 14 }]} />
						</View>
					))}
				</View>
			) : (
				(compact ? [3] : [8, 5, 7]).map((count, k) => (
					<View key={k} style={s.section}>
						<View
							style={[s.bone, { width: "55%", height: 20, marginBottom: 20 }]}
						/>
						{Array.from({ length: count }, (_, i) => (
							<View key={i} style={[s.detail, { paddingVertical: 9 }]}>
								<View style={[s.bone, { width: "35%" }]} />
								<View style={[s.bone, { width: "48%" }]} />
							</View>
						))}
					</View>
				))
			)}
		</View>
	);
}
export function ClothingSkeleton() {
	return (
		<View
			accessible
			accessibilityRole="progressbar"
			accessibilityLabel="Loading clothing sizes"
			accessibilityState={{ busy: true }}
		>
			{[100, 90, 65, 115, 120, 140, 155, 130].map((width, index) => (
				<View
					key={index}
					style={{
						minHeight: 62,
						paddingVertical: 14,
						flexDirection: "row",
						alignItems: "center",
						gap: 12,
						borderBottomWidth: index < 7 ? 1 : 0,
						borderBottomColor: "#e8edf2",
					}}
				>
					<View style={[s.bone, { width: 26, height: 26 }]} />
					<View style={{ flex: 1 }}>
						<View style={[s.bone, { width, maxWidth: "100%", height: 15 }]} />
					</View>
					<View
						style={[s.bone, { width: index === 4 ? 70 : 20, height: 14 }]}
					/>
					<View style={[s.bone, { width: 12, height: 18 }]} />
				</View>
			))}
		</View>
	);
}

export function Editor({
	title,
	fields,
	source,
	countries,
	onClose,
	onSave,
	emergency = false,
	clothing = false,
}: {
	title: string;
	fields: Field[];
	source: Record<string, unknown>;
	countries: { id: string; name: string }[];
	onClose: () => void;
	onSave: (payload: Record<string, unknown>) => Promise<void>;
	emergency?: boolean;
	clothing?: boolean;
}) {
	const insets = useSafeAreaInsets();
	const { height: screenHeight } = useWindowDimensions();
	const [draft, setDraft] = useState(() => draftFor(fields, source));
	const [primary, setPrimary] = useState(Boolean(source.is_primary));
	const [busy, setBusy] = useState(false);
	const lock = useRef(false);
	const [error, setError] = useState<string | null>(null);
	const [discard, setDiscard] = useState(false);
	const dirty =
		JSON.stringify(draft) !== JSON.stringify(draftFor(fields, source)) ||
		primary !== Boolean(source.is_primary);
	const [closing, setClosing] = useState(false);
	const [focusReady, setFocusReady] = useState(false);
	const { translateY, backdropOpacity, dragHandlers, springBack } =
		useDrawerMotion({
			closing,
			onClosed: onClose,
			onClose: close,
			disabled: busy || discard,
		});
	function dismiss() {
		if (lock.current || closing) return;
		Keyboard.dismiss();
		setClosing(true);
	}
	function close() {
		if (lock.current || closing) return;
		Keyboard.dismiss();
		if (dirty) {
			springBack();
			setDiscard(true);
		} else dismiss();
	}
	async function save() {
		if (lock.current) return;
		let problem = validateDraft(fields, draft);
		if (
			emergency &&
			(!draft.first_name.trim() ||
				![draft.home_phone, draft.mobile_phone, draft.work_phone].some((v) =>
					v.trim(),
				))
		)
			problem = "Enter a first name and at least one phone number.";
		if (clothing && fields.some((f) => !draft[f.key]))
			problem = "Choose a size or Not required for every item.";
		if (problem) {
			setError(problem);
			return;
		}
		lock.current = true;
		setBusy(true);
		setError(null);
		try {
			const body: Record<string, unknown> = editPayload(fields, draft);
			if (emergency) {
				body.is_primary = primary;
				body.last_name = draft.last_name.trim();
			}
			await onSave(body);
			Keyboard.dismiss();
			setClosing(true);
		} catch (e) {
			setError(
				e instanceof Error ? e.message : "Unable to save. Please try again.",
			);
		} finally {
			lock.current = false;
			setBusy(false);
		}
	}
	return (
		<Modal
			visible
			onShow={() => setFocusReady(true)}
			animationType="none"
			transparent
			statusBarTranslucent
			onRequestClose={close}
		>
			<View style={{ flex: 1 }}>
				<Animated.View
					style={[
						StyleSheet.absoluteFill,
						{ backgroundColor: "#101b2b80", opacity: backdropOpacity },
					]}
				>
					<Pressable
						accessibilityRole="button"
						accessibilityLabel="Dismiss profile editor"
						disabled={busy || closing}
						onPress={close}
						style={StyleSheet.absoluteFill}
					/>
				</Animated.View>
				<KeyboardAvoidingView
					pointerEvents="box-none"
					style={{
						flex: 1,
						paddingTop: insets.top + 16,
						justifyContent: "flex-end",
						paddingLeft: insets.left,
						paddingRight: insets.right,
					}}
					behavior={Platform.OS === "ios" ? "padding" : undefined}
				>
					<Animated.View
						style={[s.editorSheet, { transform: [{ translateY }] }]}
						accessibilityViewIsModal
						onAccessibilityEscape={close}
					>
						{/* Keep a continuous sheet surface behind the keyboard's rounded corners. */}
						<View
							pointerEvents="none"
							style={{
								position: "absolute",
								top: "100%",
								left: 0,
								right: 0,
								height: screenHeight,
								backgroundColor: "#fff",
							}}
						/>
						<View
							accessibilityLabel="Drag profile drawer"
							collapsable={false}
							{...dragHandlers}
						>
							<View style={s.handleArea}>
								<View style={s.handle} />
							</View>
							<View style={s.editorHeader}>
								<Text style={[s.heading, { flex: 1 }]}>{title}</Text>
								<Action
									title="Cancel"
									disabled={busy || closing}
									onPress={close}
								/>
							</View>
						</View>
						<ScrollView
							style={{ flexGrow: 0, flexShrink: 1 }}
							keyboardShouldPersistTaps="handled"
							contentContainerStyle={{ padding: 20, gap: 20 }}
						>
							{fields.map((f, index) =>
								f.options || f.type === "country" ? (
									<Select
										key={f.key}
										title={f.label}
										disabled={busy}
										value={draft[f.key]}
										options={[
											{ value: "", label: "Not provided" },
											...(f.type === "country"
												? countries.map((c) => ({ value: c.id, label: c.name }))
												: (f.options ?? []).map((v) => ({
														value: v,
														label: optionLabel(v),
													}))),
											...(draft[f.key] &&
											f.options &&
											!f.options.includes(draft[f.key])
												? [
														{
															value: draft[f.key],
															label: optionLabel(draft[f.key]),
														},
													]
												: []),
										]}
										onChange={(v) => setDraft((d) => ({ ...d, [f.key]: v }))}
									/>
								) : (
									<Input
										autoFocus={focusReady && index === 0}
										key={f.key}
										title={f.label}
										value={draft[f.key]}
										editable={!busy}
										placeholder={f.type === "date" ? "YYYY-MM-DD" : undefined}
										keyboardType={
											f.type === "phone"
												? "phone-pad"
												: f.type === "email"
													? "email-address"
													: "default"
										}
										onChangeText={(v) =>
											setDraft((d) => ({ ...d, [f.key]: v }))
										}
									/>
								),
							)}
							{emergency ? (
								<View style={s.detail}>
									<Text style={s.value}>Primary contact</Text>
									<Switch
										accessibilityLabel="Primary contact"
										disabled={busy}
										value={primary}
										onValueChange={setPrimary}
									/>
								</View>
							) : null}
							{error ? (
								<Text accessibilityRole="alert" style={s.error}>
									{error}
								</Text>
							) : null}
						</ScrollView>
						<View
							style={[
								s.editorFooter,
								{ paddingBottom: Math.max(insets.bottom, 14) },
							]}
						>
							{discard ? (
								<View style={{ gap: 10 }}>
									<Text style={s.value}>Discard your unsaved changes?</Text>
									<Action
										title="Keep editing"
										onPress={() => setDiscard(false)}
									/>
									<Action title="Discard changes" onPress={dismiss} />
								</View>
							) : null}
							<Action
								title="Save changes"
								primary
								busy={busy}
								disabled={closing || discard || (!dirty && !clothing)}
								onPress={save}
							/>
						</View>
					</Animated.View>
				</KeyboardAvoidingView>
			</View>
		</Modal>
	);
}
export const s = StyleSheet.create({
	flex: { flex: 1, backgroundColor: "#fff" },
	heading: { fontSize: 18, fontWeight: "700", color: "#10213b" },
	section: {
		paddingVertical: 22,
		borderBottomWidth: 1,
		borderBottomColor: "#e0e6ed",
		gap: 8,
	},
	sectionHeader: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		gap: 12,
		marginBottom: 8,
	},
	hint: { fontSize: 11, color: "#65738a", maxWidth: 95 },
	detail: {
		flexDirection: "row",
		alignItems: "flex-start",
		gap: 14,
		paddingVertical: 5,
	},
	label: { fontSize: 14, lineHeight: 21, color: "#627189", flex: 0.9 },
	value: { fontSize: 14, lineHeight: 21, color: "#10213b", flex: 1.2 },
	action: {
		minHeight: 44,
		paddingHorizontal: 10,
		flexDirection: "row",
		gap: 8,
		alignItems: "center",
		justifyContent: "center",
	},
	actionText: { fontSize: 14, fontWeight: "600", color: "#e90087" },
	primary: { backgroundColor: "#e90087", borderRadius: 8, minHeight: 48 },
	error: { color: "#b91c1c", fontSize: 14, lineHeight: 21 },
	bone: { height: 14, borderRadius: 5, backgroundColor: "#e5e9ef" },
	heroSkeleton: {
		padding: 20,
		backgroundColor: "#10213b",
		borderRadius: 16,
		flexDirection: "row",
		gap: 16,
		alignItems: "center",
	},
	editorSheet: {
		flexShrink: 1,
		maxHeight: "100%",
		width: "100%",
		maxWidth: 540,
		alignSelf: "center",
		backgroundColor: "#fff",
		borderTopLeftRadius: 24,
		borderTopRightRadius: 24,
		overflow: "visible",
	},
	handleArea: { height: 44, alignItems: "center", justifyContent: "center" },
	handle: { width: 38, height: 4, borderRadius: 3, backgroundColor: "#bdc5d0" },
	editorHeader: {
		padding: 16,
		flexDirection: "row",
		alignItems: "center",
		borderBottomWidth: 1,
		borderBottomColor: "#e0e6ed",
	},
	editorFooter: { padding: 16, borderTopWidth: 1, borderTopColor: "#e0e6ed" },
});
