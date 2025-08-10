import React from "react";
import { View, Text, TextInput, StyleSheet } from "react-native";
import { useColorScheme } from "@/lib/useColorScheme";
import { colors } from "@/constants/colors";
import { JobReportData } from "../hooks/useJobReport";
import { Select } from "../../../../components/ui/Select";

interface EquipmentActionSectionProps {
	reportData: JobReportData;
	setReportData: React.Dispatch<React.SetStateAction<JobReportData | null>>;
}

const styles = StyleSheet.create({
	fieldContainer: {
		marginBottom: 16,
	},
});

export const EquipmentActionSection: React.FC<EquipmentActionSectionProps> = ({
	reportData,
	setReportData,
}) => {
	const { colorScheme } = useColorScheme();
	const isDark = colorScheme === "dark";

	return (
		<View
			className="mb-6 p-4 rounded-lg"
			style={{
				backgroundColor: isDark ? colors.dark.card : colors.light.card,
				borderColor: isDark ? colors.dark.border : colors.light.border,
				borderWidth: 1,
			}}
		>
			<Text
				className="text-lg font-semibold mb-3"
				style={{
					color: isDark ? colors.dark.foreground : colors.light.foreground,
				}}
			>
				Equipment and Action Items
			</Text>

			{/* No Further Actions */}
			<View style={styles.fieldContainer}>
				<Select
					label="Action Status"
					value={
						reportData.no_further_actions
							? "No further actions required"
							: "Actions required"
					}
					options={["No further actions required", "Actions required"]}
					onChange={(value) => {
						setReportData({
							...reportData,
							no_further_actions: value === "No further actions required",
						});
					}}
					placeholder="Select action status"
				/>
			</View>

			{/* Equipment Problems Input (conditional) */}
			{!reportData.no_equipment_problems && (
				<View className="mb-4 mt-2">
					<Text
						className="font-medium"
						style={{
							color: isDark ? colors.dark.foreground : colors.light.foreground,
						}}
					>
						Problems with Equipment
					</Text>
					<Text
						className="mb-1 text-xs"
						style={{
							color: isDark ? colors.dark.foreground : colors.light.foreground,
						}}
					>
						Only fill in this column if you experienced problem with equipment
						(lost, misplaced, broken, not working properly etc)
					</Text>
					<TextInput
						className="p-3 rounded-md border"
						style={{
							borderColor: isDark ? colors.dark.border : colors.light.border,
							color: isDark ? colors.dark.foreground : colors.light.foreground,
							backgroundColor: isDark
								? colors.dark.background
								: colors.light.background,
							height: 100,
							textAlignVertical: "top",
						}}
						value={reportData.equipment_problems || ""}
						onChangeText={(text) =>
							setReportData({ ...reportData, equipment_problems: text })
						}
						placeholder="Describe equipment problems"
						placeholderTextColor={
							isDark ? colors.dark.muted : colors.light.muted
						}
						multiline={true}
						numberOfLines={3}
					/>
				</View>
			)}
		</View>
	);
};
