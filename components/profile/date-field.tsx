import DateTimePicker from "@react-native-community/datetimepicker";
import { useState } from "react";
import { Platform, Pressable, Text, View } from "react-native";

import { Action, s } from "./ui";

import { ContentDrawer } from "@/components/content-drawer";
import { Icon } from "@/components/home/icon";
import { s as fieldStyles } from "@/components/hr/ui";
import {
	formatProfileDate,
	parseProfileDate,
	profileDateValue,
} from "@/lib/profile/dates";
export type DateFieldProps = {
	title: string;
	compact?: boolean;
	value: string;
	disabled?: boolean;
	onChange: (value: string) => void;
};
export function DateField({
	compact = false,
	title,
	value,
	disabled,
	onChange,
}: DateFieldProps) {
	const [open, setOpen] = useState(false);
	const [selection, setSelection] = useState(new Date());
	return (
		<View style={compact ? undefined : fieldStyles.field}>
			{!compact ? <Text style={fieldStyles.label}>{title}</Text> : null}
			<Pressable
				accessibilityRole="button"
				accessibilityLabel={`${title}: ${formatProfileDate(value)}`}
				disabled={disabled}
				onPress={() => {
					setSelection(parseProfileDate(value) ?? new Date(1990, 0, 1, 12));
					setOpen(true);
				}}
				style={
					compact
						? fieldStyles.compactRow
						: {
								minHeight: 48,
								borderWidth: 1,
								borderColor: "#d8e0e9",
								borderRadius: 8,
								padding: 12,
								flexDirection: "row",
								alignItems: "center",
								gap: 12,
							}
				}
			>
				{compact ? <Text style={fieldStyles.compactLabel}>{title}</Text> : null}
				<Text
					style={[
						s.value,
						{ flex: 1 },
						compact && { color: value ? "#111111" : "#7b8798" },
					]}
				>
					{formatProfileDate(value)}
				</Text>
				<Icon name="calendar" size={20} color="#075ed2" />
			</Pressable>
			{open && Platform.OS === "android" ? (
				<View>
					<DateTimePicker
						value={selection}
						mode="date"
						maximumDate={new Date()}
						display="default"
						onChange={(event, date) => {
							setOpen(false);
							if (event.type === "set" && date) {
								setSelection(date);
								onChange(profileDateValue(date));
							}
						}}
					/>
				</View>
			) : null}
			{open && Platform.OS !== "android" ? (
				<ContentDrawer title={title} onClose={() => setOpen(false)}>
					<DateTimePicker
						value={selection}
						mode="date"
						maximumDate={new Date()}
						display="spinner"
						themeVariant="light"
						onChange={(event, date) => {
							if (event.type === "set" && date) setSelection(date);
						}}
					/>
					<View
						style={{
							flexDirection: "row",
							justifyContent: "space-between",
							gap: 12,
						}}
					>
						<Action title="Cancel" onPress={() => setOpen(false)} />
						<Action
							title="Done"
							primary
							onPress={() => {
								setOpen(false);
								onChange(profileDateValue(selection));
							}}
						/>
					</View>
				</ContentDrawer>
			) : null}
		</View>
	);
}
