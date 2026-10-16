import { useState } from "react";
import { Alert, Modal, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
	Badge,
	Button,
	Section,
	NavigationButton,
	Empty,
	ErrorNotice,
	Input,
	Loading,
	Select,
	Tabs,
	s,
	pink,
} from "./ui";
import { request, useOperation, useResource } from "./use-hr";

import {
	absenceActions,
	absenceLabels,
	dateKey,
	formatDate,
	label,
	monthDays,
	portionLabels,
	validateAbsence,
} from "@/lib/hr/domain";
import type {
	Absence,
	AbsenceInput,
	EmployeeContext,
	History,
	DayPortion,
	AbsenceType,
} from "@/lib/hr/types";
export function Month({
	month,
	onMonth,
	selected,
	onSelect,
	marked = [],
}: {
	month: string;
	onMonth: (v: string) => void;
	selected?: string;
	onSelect: (v: string) => void;
	marked?: string[];
}) {
	const change = (amount: number) => {
		const d = new Date(`${month}-15T12:00:00Z`);
		d.setUTCMonth(d.getUTCMonth() + amount);
		onMonth(d.toISOString().slice(0, 7));
	};
	return (
		<View style={{ gap: 12 }}>
			<View
				style={{
					flexDirection: "row",
					alignItems: "center",
					justifyContent: "space-between",
				}}
			>
				<NavigationButton label="Previous month" onPress={() => change(-1)} />
				<Text style={s.heading}>
					{new Date(`${month}-15T12:00:00Z`).toLocaleDateString("en-GB", {
						month: "long",
						year: "numeric",
						timeZone: "UTC",
					})}
				</Text>
				<NavigationButton
					label="Next month"
					forward
					onPress={() => change(1)}
				/>
			</View>
			<View style={{ flexDirection: "row" }}>
				{["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
					<Text
						key={i}
						style={[s.muted, { width: "14.2857%", textAlign: "center" }]}
					>
						{d}
					</Text>
				))}
			</View>
			<View style={{ flexDirection: "row", flexWrap: "wrap" }}>
				{monthDays(month).map((d, i) => (
					<View key={d ?? i} style={{ width: "14.2857%", padding: 2 }}>
						{d ? (
							<Pressable
								accessibilityRole="button"
								accessibilityLabel={formatDate(d)}
								accessibilityState={{ selected: d === selected }}
								onPress={() => onSelect(d)}
								style={{
									minHeight: 44,
									borderRadius: 12,
									backgroundColor: d === selected ? pink : "transparent",
									alignItems: "center",
									justifyContent: "center",
									gap: 3,
								}}
							>
								<Text
									style={[
										s.text,
										{ color: d === selected ? "white" : "#10213b" },
									]}
								>
									{Number(d.slice(-2))}
								</Text>
								{marked.includes(d) ? (
									<View
										style={{
											width: 4,
											height: 4,
											borderRadius: 2,
											backgroundColor: d === selected ? "white" : pink,
										}}
									/>
								) : null}
							</Pressable>
						) : null}
					</View>
				))}
			</View>
		</View>
	);
}
export function DateField({
	title,
	value,
	onChange,
	disabled = false,
}: {
	title: string;
	value: string;
	onChange: (v: string) => void;
	disabled?: boolean;
}) {
	const [open, setOpen] = useState(false);
	const [month, setMonth] = useState(
		value.slice(0, 7) || dateKey().slice(0, 7),
	);
	return (
		<View style={s.field}>
			<Text style={s.label}>{title}</Text>
			<Button
				title={value ? formatDate(value) : "Choose date"}
				secondary
				disabled={disabled}
				onPress={() => {
					setMonth(value.slice(0, 7) || dateKey().slice(0, 7));
					setOpen(true);
				}}
			/>
			<Modal
				visible={open}
				animationType="slide"
				presentationStyle="pageSheet"
				onRequestClose={() => setOpen(false)}
			>
				<SafeAreaView style={s.flex}>
					<View style={s.content}>
						<Text style={s.title}>{title}</Text>
						<Month
							month={month}
							onMonth={setMonth}
							selected={value}
							onSelect={(v) => {
								onChange(v);
								setOpen(false);
							}}
						/>
						<Button title="Close" secondary onPress={() => setOpen(false)} />
					</View>
				</SafeAreaView>
			</Modal>
		</View>
	);
}
export function AbsenceForm({
	employee,
	entry,
	onSaved,
}: {
	employee: NonNullable<EmployeeContext["employee"]>;
	entry?: Absence;
	onSaved: () => void;
}) {
	const [input, setInput] = useState<AbsenceInput>({
		absence_type: entry?.absence_type ?? "annual_leave",
		start_date: entry?.start_date.slice(0, 10) ?? "",
		end_date: entry?.end_date.slice(0, 10) ?? "",
		start_day_type: entry?.start_day_type ?? "full_day",
		end_day_type: entry?.end_day_type ?? "full_day",
		request_notes: entry?.request_notes ?? "",
	});
	const op = useOperation();
	const multi = input.start_date !== input.end_date;
	const update = (values: Partial<AbsenceInput>) =>
		setInput((old) => {
			const next = { ...old, ...values };
			if (next.start_date !== next.end_date) {
				if (next.start_day_type === "first_half")
					next.start_day_type = "full_day";
				if (next.end_day_type === "second_half") next.end_day_type = "full_day";
			} else next.end_day_type = next.start_day_type;
			return next;
		});
	const submit = () =>
		op.run(async () => {
			const error = validateAbsence(input, employee);
			if (error) throw new Error(error);
			await request(
				entry ? `/hr/absence-requests/${entry.id}` : "/hr/request-absence",
				{ method: entry ? "PUT" : "POST", body: input },
			);
			onSaved();
		});
	return (
		<>
			<Select
				title="Type of absence"
				value={input.absence_type}
				options={Object.entries(absenceLabels).map(([value, label]) => ({
					value,
					label,
				}))}
				onChange={(v) => update({ absence_type: v as AbsenceType })}
				disabled={op.busy}
			/>
			<DateField
				title="Start date"
				value={input.start_date}
				disabled={op.busy}
				onChange={(v) =>
					update({
						start_date: v,
						...(!input.end_date || v > input.end_date ? { end_date: v } : {}),
					})
				}
			/>
			<Select
				title={multi ? "Start day" : "Day portion"}
				value={input.start_day_type ?? "full_day"}
				options={Object.entries(portionLabels)
					.filter(([v]) => !multi || v !== "first_half")
					.map(([value, label]) => ({ value, label }))}
				onChange={(v) => update({ start_day_type: v as DayPortion })}
				disabled={op.busy}
			/>
			<DateField
				title="End date"
				value={input.end_date}
				onChange={(v) => update({ end_date: v })}
				disabled={op.busy}
			/>
			{multi ? (
				<Select
					title="End day"
					value={input.end_day_type ?? "full_day"}
					options={Object.entries(portionLabels)
						.filter(([v]) => v !== "second_half")
						.map(([value, label]) => ({ value, label }))}
					onChange={(v) => update({ end_day_type: v as DayPortion })}
					disabled={op.busy}
				/>
			) : null}
			<Section>
				<Text style={s.muted}>
					Your working days, public holidays and leave entitlement are checked
					when you submit. Requests are subject to approval.
				</Text>
			</Section>
			<Input
				title="Notes (optional)"
				value={input.request_notes ?? ""}
				onChangeText={(v) => update({ request_notes: v })}
				multiline
				editable={!op.busy}
			/>
			<ErrorNotice error={op.error} />
			<Button
				title={entry ? "Save changes" : "Submit request"}
				busy={op.busy}
				onPress={submit}
			/>
		</>
	);
}
export function AbsenceCard({
	entry,
	employeeId,
	onEdit,
	onCancel,
	onDelete,
}: {
	entry: Absence;
	employeeId: string;
	onEdit: (a: Absence) => void;
	onCancel: (a: Absence) => void;
	onDelete: (a: Absence) => void;
}) {
	const actions = absenceActions(entry, employeeId);
	return (
		<Section>
			<View
				style={{
					flexDirection: "row",
					justifyContent: "space-between",
					gap: 8,
				}}
			>
				<Text style={[s.heading, { flex: 1 }]}>
					{absenceLabels[entry.absence_type]}
				</Text>
				<Badge value={entry.status ?? "pending"} />
			</View>
			<Text style={s.text}>
				{formatDate(entry.start_date)}
				{entry.start_date.slice(0, 10) !== entry.end_date.slice(0, 10)
					? ` – ${formatDate(entry.end_date)}`
					: ""}
			</Text>
			<Text style={s.muted}>
				{entry.units} {entry.units === 1 ? "day" : "days"}
				{entry.start_day_type && entry.start_day_type !== "full_day"
					? ` · Starts ${portionLabels[entry.start_day_type].toLowerCase()}`
					: ""}
				{entry.end_day_type &&
				entry.end_day_type !== "full_day" &&
				entry.start_date !== entry.end_date
					? ` · Ends ${portionLabels[entry.end_day_type].toLowerCase()}`
					: ""}
			</Text>
			{entry.request_notes ? (
				<Text style={s.text}>{entry.request_notes}</Text>
			) : null}
			{entry.resolve_notes ? (
				<Text style={s.muted}>Decision: {entry.resolve_notes}</Text>
			) : null}
			{entry.resolved_at ? (
				<Text style={s.muted}>
					Resolved {formatDate(entry.resolved_at)}
					{entry.resolver
						? ` · ${[entry.resolver.first_name, entry.resolver.last_name].filter(Boolean).join(" ")}`
						: ""}
				</Text>
			) : null}
			{entry.cancellation_status ? (
				<View style={{ gap: 6 }}>
					<Text style={s.label}>
						Cancellation {label(entry.cancellation_status).toLowerCase()}
					</Text>
					{entry.cancellation_request_notes ? (
						<Text style={s.muted}>{entry.cancellation_request_notes}</Text>
					) : null}
					{entry.cancellation_resolve_notes ? (
						<Text style={s.muted}>
							Decision: {entry.cancellation_resolve_notes}
						</Text>
					) : null}
					{entry.cancellation_resolved_at ? (
						<Text style={s.muted}>
							{formatDate(entry.cancellation_resolved_at)}
						</Text>
					) : null}
				</View>
			) : null}
			{actions.edit ? (
				<View style={{ flexDirection: "row", gap: 8 }}>
					<View style={{ flex: 1 }}>
						<Button title="Edit" secondary onPress={() => onEdit(entry)} />
					</View>
					<View style={{ flex: 1 }}>
						<Button title="Delete" secondary onPress={() => onDelete(entry)} />
					</View>
				</View>
			) : null}
			{actions.cancel ? (
				<Button
					title={
						entry.cancellation_status === "declined"
							? "Re-request cancellation"
							: "Request cancellation"
					}
					secondary
					onPress={() => onCancel(entry)}
				/>
			) : null}
		</Section>
	);
}
export function Absences({
	employeeId,
	revision,
	onEdit,
	onChanged,
	initialCalendar = false,
}: {
	employeeId: string;
	revision: number;
	onEdit: (a: Absence) => void;
	onChanged: () => void;
	initialCalendar?: boolean;
}) {
	const [mode, setMode] = useState(initialCalendar ? "Calendar" : "List");
	const [year, setYear] = useState(String(new Date().getFullYear()));
	const [month, setMonth] = useState(dateKey().slice(0, 7));
	const [selected, setSelected] = useState(dateKey());
	const [filter, setFilter] = useState("All");
	const [cancel, setCancel] = useState<Absence | null>(null);
	const [reason, setReason] = useState("");
	const op = useOperation();
	const queryYear = mode === "Calendar" ? month.slice(0, 4) : year;
	const result = useResource<History>(
		`/hr/absence-history?from=${queryYear}-01-01&to=${queryYear}-12-31&employee_id=${employeeId}`,
		revision,
	);
	const entries = (result.data?.entries ?? [])
		.filter((a) => !a.is_public_holiday)
		.sort((a, b) => b.start_date.localeCompare(a.start_date));
	const filtered = entries
		.filter(
			(a) =>
				filter === "All" ||
				(filter === "Declined"
					? ["declined", "denied"].includes(a.status ?? "")
					: a.status === filter.toLowerCase()),
		)
		.filter(
			(a) =>
				mode !== "Calendar" ||
				(a.start_date.slice(0, 10) <= selected &&
					a.end_date.slice(0, 10) >= selected),
		);
	const marked = monthDays(month)
		.filter((d): d is string => Boolean(d))
		.filter(
			(d) =>
				entries.some(
					(a) => a.start_date.slice(0, 10) <= d && a.end_date.slice(0, 10) >= d,
				) || result.data?.public_holidays.entries.some((h) => h.date === d),
		);
	const remove = (entry: Absence) =>
		Alert.alert(
			"Delete absence request?",
			"Your pending request will be removed.",
			[
				{ text: "Keep request", style: "cancel" },
				{
					text: "Delete",
					style: "destructive",
					onPress: () =>
						op.run(async () => {
							await request(`/hr/absence-requests/${entry.id}`, {
								method: "DELETE",
							});
							onChanged();
							await result.refresh();
						}),
				},
			],
		);
	return (
		<>
			<Tabs value={mode} options={["List", "Calendar"]} onChange={setMode} />
			{mode === "List" ? (
				<Select
					title="Year"
					value={year}
					onChange={setYear}
					options={Array.from({ length: 12 }, (_, i) =>
						String(new Date().getFullYear() + 2 - i),
					).map((value) => ({ value, label: value }))}
				/>
			) : (
				<Month
					month={month}
					onMonth={(m) => {
						setMonth(m);
						setSelected(`${m}-01`);
					}}
					selected={selected}
					onSelect={setSelected}
					marked={marked}
				/>
			)}
			<Tabs
				value={filter}
				options={["All", "Pending", "Approved", "Declined", "Cancelled"]}
				onChange={setFilter}
			/>
			<ErrorNotice error={result.error} retry={result.refresh} />
			<ErrorNotice error={op.error} />
			{result.loading ? (
				<Loading variant="list" />
			) : !result.error && !filtered.length ? (
				<Empty
					text={
						mode === "Calendar"
							? `No absences on ${formatDate(selected)}.`
							: "No absences match this filter."
					}
				/>
			) : null}
			{!result.loading
				? filtered.map((entry) => (
						<AbsenceCard
							key={entry.id}
							entry={entry}
							employeeId={employeeId}
							onEdit={onEdit}
							onCancel={(e) => {
								setCancel(e);
								setReason(e.cancellation_request_notes ?? "");
								op.setError(null);
							}}
							onDelete={remove}
						/>
					))
				: null}
			{result.data ? (
				<Section>
					<Text style={s.heading}>
						Public holidays
						{result.data.public_holidays.country_name
							? ` · ${result.data.public_holidays.country_name}`
							: ""}
					</Text>
					{result.data.public_holidays.entries
						.filter((h) => mode !== "Calendar" || h.date === selected)
						.map((h) => (
							<Text key={`${h.date}-${h.name}`} style={s.muted}>
								{formatDate(h.date)} · {h.name}
							</Text>
						))}
					{!result.data.public_holidays.entries.length ? (
						<Text style={s.muted}>No public holidays in this period.</Text>
					) : null}
				</Section>
			) : null}
			<Modal
				visible={Boolean(cancel)}
				presentationStyle="pageSheet"
				animationType="slide"
				onRequestClose={() => {
					if (!op.busy) setCancel(null);
				}}
			>
				<SafeAreaView style={s.flex}>
					<ScrollView
						keyboardShouldPersistTaps="handled"
						contentContainerStyle={s.content}
					>
						<Text style={s.title}>Request cancellation</Text>
						<Text style={s.muted}>
							Your approved leave remains in place until the cancellation is
							approved.
						</Text>
						<Input
							title="Reason (optional)"
							value={reason}
							onChangeText={setReason}
							multiline
							editable={!op.busy}
						/>
						<ErrorNotice error={op.error} />
						<Button
							title="Submit cancellation request"
							busy={op.busy}
							onPress={() =>
								op.run(async () => {
									if (!cancel) return;
									await request("/hr/request-absence-cancellation", {
										method: "POST",
										body: {
											absence_request_id: cancel.id,
											cancellation_request_notes: reason.trim() || null,
										},
									});
									setCancel(null);
									onChanged();
									await result.refresh();
								})
							}
						/>
						<Button
							title="Back"
							secondary
							disabled={op.busy}
							onPress={() => setCancel(null)}
						/>
					</ScrollView>
				</SafeAreaView>
			</Modal>
		</>
	);
}
