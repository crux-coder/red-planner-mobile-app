import { useState } from "react";
import { Pressable, Text, View } from "react-native";

import type { DateFieldProps } from "./date-field";
import { Action, s } from "./ui";

import { ContentDrawer } from "@/components/content-drawer";
import { Icon } from "@/components/home/icon";
import { s as fieldStyles } from "@/components/hr/ui";
import { formatProfileDate, profileDateValue } from "@/lib/profile/dates";
export function DateField({
	compact = false,
	title,
	value,
	disabled,
	onChange,
}: DateFieldProps) {
	const [open, setOpen] = useState(false);
	const [selection, setSelection] = useState(value);
	return (
		<View style={compact ? undefined : fieldStyles.field}>
			{!compact ? <Text style={fieldStyles.label}>{title}</Text> : null}
			<Pressable
				accessibilityRole="button"
				accessibilityLabel={`${title}: ${formatProfileDate(value)}`}
				disabled={disabled}
				onPress={() => {
					setSelection(value);
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
			{open ? (
				<ContentDrawer title={title} onClose={() => setOpen(false)}>
					<input
						aria-label={title}
						type="date"
						value={selection}
						max={profileDateValue(new Date())}
						disabled={disabled}
						onChange={(event) => setSelection(event.target.value)}
						style={{
							minHeight: 48,
							boxSizing: "border-box",
							border: "1px solid #d8e0e9",
							borderRadius: 8,
							padding: 12,
							fontSize: 16,
							color: "#10213b",
							background: "#fff",
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
							disabled={!selection}
							primary
							onPress={() => {
								setOpen(false);
								onChange(selection);
							}}
						/>
					</View>
				</ContentDrawer>
			) : null}
		</View>
	);
}
