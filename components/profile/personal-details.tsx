import { usePreventRemove, useNavigation } from "@react-navigation/native";
import { useEffect, useRef, useState } from "react";
import {
	Alert,
	Platform,
	Pressable,
	StyleSheet,
	Text,
	View,
} from "react-native";
import { toast } from "sonner-native";

import { DateField } from "./date-field";
import { Action, Editor, s } from "./ui";

import { Icon } from "@/components/home/icon";
import { Select, s as fieldStyles } from "@/components/hr/ui";
import { request } from "@/components/hr/use-hr";
import {
	draftFor,
	editPayload,
	emergencyFields,
	groups,
	optionLabel,
	validateDraft,
	type Field,
	type Group,
	type Profile,
} from "@/lib/profile/model";

type Country = { id: string; name: string };
type FormProps = {
	sections: Group[];
	source: Record<string, unknown>;
	countries: Country[] | null;
	onSaved: () => Promise<void>;
	onBusyChange: (busy: boolean) => void;
};
function DetailFields({
	sections,
	source,
	countries,
	onSaved,
	onBusyChange,
}: FormProps) {
	const fields = sections.flatMap((section) => section.fields);
	const initial: Record<string, string> = {
		...draftFor(fields, source),
	};
	const [draft, setDraft] = useState(initial);
	const [editingField, setEditingField] = useState<Field | null>(null);
	const draftRef = useRef(draft);
	const saved = useRef(initial);
	const [busy, setBusy] = useState(false);
	const lock = useRef(false);
	const dirty = JSON.stringify(draft) !== JSON.stringify(saved.current);
	const sourceKey = JSON.stringify(initial);
	const navigation = useNavigation();
	useEffect(() => {
		// Refresh server values only if no draft or request would be overwritten.
		if (
			!lock.current &&
			JSON.stringify(draftRef.current) === JSON.stringify(saved.current)
		) {
			const next = JSON.parse(sourceKey) as Record<string, string>;
			saved.current = next;
			draftRef.current = next;
			setDraft(next);
		}
	}, [sourceKey]);
	usePreventRemove(busy || dirty, ({ data }) => {
		if (lock.current) return;
		const discard = () => {
			draftRef.current = saved.current;
			setDraft(saved.current);
			navigation.dispatch(data.action);
		};
		if (Platform.OS === "web") {
			if (window.confirm("Discard your unsaved changes?")) discard();
		} else
			Alert.alert(
				"Discard unsaved changes?",
				"Some changes have not been saved.",
				[
					{ text: "Keep editing", style: "cancel" },
					{ text: "Discard", style: "destructive", onPress: discard },
				],
			);
	});
	function change(key: string, value: string, immediate = false) {
		const next = { ...draftRef.current, [key]: value };
		draftRef.current = next;
		setDraft(next);
		if (immediate) save(next);
	}
	async function save(next = draftRef.current) {
		if (lock.current || JSON.stringify(next) === JSON.stringify(saved.current))
			return;
		const error = validateDraft(fields, next);
		if (error) {
			toast.error("Check your details", { description: error });
			return;
		}
		lock.current = true;
		setBusy(true);
		onBusyChange(true);
		const id = toast.loading("Saving details…");
		try {
			const changed = fields.filter(
				(field) => next[field.key] !== saved.current[field.key],
			);
			await request("/profile", {
				method: "PATCH",
				body: editPayload(changed, next),
			});
			saved.current = { ...next };
			setDraft({ ...next });
			draftRef.current = { ...next };
			toast.success("Details updated", { id, duration: 2200 });
			await onSaved();
		} catch (cause) {
			toast.error("Details not saved", {
				id,
				description:
					cause instanceof Error ? cause.message : "Please try again.",
				duration: 8000,
				action: { label: "Retry", onClick: () => save() },
			});
		} finally {
			lock.current = false;
			setBusy(false);
			onBusyChange(false);
		}
	}
	function fieldInput(field: Field) {
		const value = draft[field.key] ?? "";
		if (field.type === "date")
			return (
				<DateField
					compact
					key={field.key}
					title={field.label}
					value={value}
					disabled={busy}
					onChange={(value) => change(field.key, value, true)}
				/>
			);
		if (field.options || field.type === "country")
			return (
				<Select
					compact
					key={field.key}
					title={field.label}
					value={value}
					disabled={busy || (field.type === "country" && !countries)}
					selectedColor="#111111"
					options={[
						{ value: "", label: "Not provided" },
						...(field.type === "country"
							? (countries ?? []).map((c) => ({ value: c.id, label: c.name }))
							: (field.options ?? []).map((value) => ({
									value,
									label: optionLabel(value),
								}))),
					]}
					onChange={(value) => change(field.key, value, true)}
				/>
			);
		return (
			<Pressable
				key={field.key}
				accessibilityRole="button"
				accessibilityLabel={`Edit ${field.label}: ${value || "Not provided"}`}
				disabled={busy}
				onPress={() => {
					setEditingField(field);
					onBusyChange(true);
				}}
				style={fieldStyles.compactRow}
			>
				<Text style={fieldStyles.compactLabel}>{field.label}</Text>
				<Text
					style={{
						flex: 1,
						fontSize: 14,
						lineHeight: 20,
						color: value ? "#111111" : "#7b8798",
					}}
				>
					{value || "Not provided"}
				</Text>
				<Icon name="chevron" size={14} color="#a8b2bf" />
			</Pressable>
		);
	}
	return (
		<>
			{sections.map((section) => (
				<View key={section.title} style={styles.sectionGroup}>
					<Text
						accessibilityRole="header"
						style={[s.heading, { color: "#111111", marginBottom: 12 }]}
					>
						{section.title}
					</Text>
					<View>{section.fields.map(fieldInput)}</View>
				</View>
			))}
			{editingField ? (
				<Editor
					title={`Edit ${editingField.label.toLowerCase()}`}
					fields={[editingField]}
					source={{ [editingField.key]: saved.current[editingField.key] }}
					countries={countries ?? []}
					onClose={() => {
						setEditingField(null);
						onBusyChange(false);
					}}
					onSave={async (body) => {
						const id = toast.loading("Saving details…");
						try {
							await request("/profile", { method: "PATCH", body });
							const value = String(body[editingField.key] ?? "");
							saved.current = { ...saved.current, [editingField.key]: value };
							draftRef.current = {
								...draftRef.current,
								[editingField.key]: value,
							};
							setDraft(draftRef.current);
							toast.success("Details updated", { id, duration: 2200 });
							await onSaved();
						} catch (error) {
							toast.error("Details not saved", {
								id,
								description:
									error instanceof Error ? error.message : "Please try again.",
							});
							throw error;
						}
					}}
				/>
			) : null}
		</>
	);
}

export function PersonalDetails({
	employee,
	countries,
	contacts,
	contactsLoading,
	contactsError,
	onRefreshContacts,
	onRefreshProfile,
	onBusyChange,
}: {
	employee: Profile;
	countries: Country[] | null;
	contacts: Record<string, unknown>[] | null;
	contactsLoading: boolean;
	contactsError: string | null;
	onRefreshContacts: () => Promise<void>;
	onRefreshProfile: () => Promise<void>;
	onBusyChange: (busy: boolean) => void;
}) {
	const [editingContact, setEditingContact] = useState<Record<
		string,
		unknown
	> | null>(null);
	const pending = useRef(new Set<string>());
	function busyFor(key: string, busy: boolean) {
		if (busy) pending.current.add(key);
		else pending.current.delete(key);
		onBusyChange(pending.current.size > 0);
	}
	return (
		<View>
			<DetailFields
				sections={groups.slice(0, 3)}
				source={employee}
				countries={countries}
				onSaved={onRefreshProfile}
				onBusyChange={(busy) => busyFor("profile", busy)}
			/>
			<View style={[styles.sectionGroup, { gap: 8 }]}>
				<Text
					accessibilityRole="header"
					style={[s.heading, { color: "#111111", marginBottom: 8 }]}
				>
					Emergency contacts
				</Text>
				{contactsLoading && !contacts ? (
					<View
						accessibilityRole="progressbar"
						accessibilityLabel="Loading emergency contacts"
						accessibilityState={{ busy: true }}
						style={{ gap: 8 }}
					>
						{[0, 1].map((index) => (
							<View
								key={index}
								style={{
									padding: 16,
									gap: 8,
									borderWidth: 1,
									borderColor: "#e0e6ed",
									borderRadius: 12,
								}}
							>
								<View style={[s.bone, { width: 150, height: 18 }]} />
								<View style={[s.bone, { width: 80 }]} />
								<View style={[s.bone, { width: 120 }]} />
							</View>
						))}
					</View>
				) : null}
				{contactsError ? (
					<>
						<Text style={s.error} accessibilityRole="alert">
							{contactsError}
						</Text>
						<Action title="Retry contacts" onPress={onRefreshContacts} />
					</>
				) : null}
				{contacts?.map((contact) => {
					const name =
						[contact.first_name, contact.last_name].filter(Boolean).join(" ") ||
						"Emergency contact";
					return (
						<Pressable
							key={String(contact.id)}
							accessibilityRole="button"
							accessibilityLabel={`Edit ${name}`}
							onPress={() => {
								setEditingContact(contact);
								busyFor("contact-drawer", true);
							}}
							style={({ pressed }) => ({
								padding: 16,
								borderWidth: 1,
								borderColor: "#e0e6ed",
								borderRadius: 12,
								flexDirection: "row",
								alignItems: "center",
								gap: 12,
								backgroundColor: pressed ? "#f5f7fa" : "white",
							})}
						>
							<View style={{ flex: 1, gap: 4 }}>
								<Text
									style={{ fontSize: 16, fontWeight: "600", color: "#10213b" }}
								>
									{name}
								</Text>
								<Text style={{ fontSize: 14, color: "#627189" }}>
									{typeof contact.relationship === "string" &&
									contact.relationship
										? optionLabel(contact.relationship)
										: "Relationship not provided"}
								</Text>
								<Text style={{ fontSize: 14, color: "#10213b" }}>
									{typeof contact.mobile_phone === "string" &&
									contact.mobile_phone
										? contact.mobile_phone
										: "Mobile phone not provided"}
								</Text>
							</View>
							<Icon name="chevron" size={18} color="#627189" />
						</Pressable>
					);
				})}
				{contacts?.length === 0 ? (
					<Text style={s.label}>No emergency contacts recorded.</Text>
				) : null}
				<Action
					title="Add emergency contact"
					disabled={!contacts}
					onPress={() => {
						setEditingContact({});
						busyFor("contact-drawer", true);
					}}
				/>
			</View>
			{editingContact ? (
				<Editor
					title={
						editingContact.id
							? "Edit emergency contact"
							: "Add emergency contact"
					}
					fields={emergencyFields}
					source={{ ...editingContact, home_phone: editingContact.phone }}
					countries={countries ?? []}
					emergency
					onClose={() => {
						setEditingContact(null);
						busyFor("contact-drawer", false);
					}}
					onSave={async (body) => {
						const id = toast.loading("Saving contact…");
						try {
							await request(
								`/profile/emergency-contacts${editingContact.id ? `/${editingContact.id}` : ""}`,
								{ method: editingContact.id ? "PATCH" : "POST", body },
							);
							toast.success("Contact saved", { id, duration: 2200 });
							await onRefreshContacts();
						} catch (error) {
							toast.error("Contact not saved", {
								id,
								description:
									error instanceof Error ? error.message : "Please try again.",
							});
							throw error;
						}
					}}
				/>
			) : null}
		</View>
	);
}
export function PersonalSkeleton() {
	return (
		<View
			accessible
			accessibilityRole="progressbar"
			accessibilityLabel="Loading personal details"
			accessibilityState={{ busy: true }}
		>
			{[8, 5, 7].map((count, section) => (
				<View key={section} style={styles.sectionGroup}>
					<View
						style={[s.bone, { width: 180, height: 20, marginBottom: 12 }]}
					/>
					{Array.from({ length: count }, (_, index) => (
						<View
							key={index}
							style={{
								minHeight: 50,
								flexDirection: "row",
								alignItems: "center",
								gap: 12,
								borderBottomWidth: 1,
								borderBottomColor: "#e0e6ed",
							}}
						>
							<View style={{ width: "34%" }}>
								<View style={[s.bone, { width: index % 2 ? 80 : 100 }]} />
							</View>
							<View style={[s.bone, { width: index % 2 ? 120 : 145 }]} />
						</View>
					))}
				</View>
			))}
		</View>
	);
}

const styles = StyleSheet.create({
	sectionGroup: {
		marginTop: 16,
		marginHorizontal: -8,
		paddingHorizontal: 16,
		paddingTop: 18,
		paddingBottom: 12,
		borderRadius: 16,
		borderWidth: 1,
		borderColor: "#e8edf2",
		backgroundColor: "#f8fafc",
	},
});
