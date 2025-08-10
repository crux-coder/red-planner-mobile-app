import React from "react";
import {
	View,
	TouchableOpacity,
	Text,
	Platform,
	TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useColorScheme } from "@/lib/useColorScheme";
import { colors } from "@/constants/colors";
import { JobReportData } from "../hooks/useJobReport";
import { DATA_CONTROL_OPTIONS } from "../constants";
import { Select } from "../../../../components/ui/Select";

interface DataControlSectionProps {
	reportData: JobReportData;
	setReportData: React.Dispatch<React.SetStateAction<JobReportData | null>>;
}

export const DataControlSection: React.FC<DataControlSectionProps> = ({
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
				Data Control
			</Text>

			{/* Data Control Method */}
			<View className="mb-4">
				<Select
					label="Data Control Method"
					options={DATA_CONTROL_OPTIONS}
					value={reportData.data_control || ""}
					onChange={(value: string) => {
						if (!reportData) return;
						setReportData({ ...reportData, data_control: value });
					}}
					placeholder="Select data control method"
				/>
			</View>

			{/* Quality Assurance Checkboxes */}
			<View className="mb-4">
				<Text
					className="mb-2 font-medium"
					style={{
						color: isDark ? colors.dark.foreground : colors.light.foreground,
					}}
				>
					Quality Assurance
				</Text>

				<View className="flex flex-wrap">
					{/* Measurements Taken Accurately */}
					<TouchableOpacity
						className="flex-row items-center py-2 pr-4"
						onPress={() => {
							if (!reportData) return;
							setReportData({
								...reportData,
								measurements_taken_accurately:
									!reportData.measurements_taken_accurately,
							});
						}}
					>
						<View
							className="w-5 h-5 rounded border-2 mr-2 items-center justify-center"
							style={{
								borderColor: reportData.measurements_taken_accurately
									? isDark
										? colors.dark.primary
										: colors.light.primary
									: isDark
										? colors.dark.border
										: colors.light.border,
								backgroundColor: reportData.measurements_taken_accurately
									? isDark
										? colors.dark.primary
										: colors.light.primary
									: "transparent",
							}}
						>
							{reportData.measurements_taken_accurately && (
								<Ionicons
									name="checkmark"
									size={14}
									color={
										isDark ? colors.dark.background : colors.light.background
									}
								/>
							)}
						</View>
						<Text
							style={{
								color: isDark
									? colors.dark.foreground
									: colors.light.foreground,
								fontSize: 13,
							}}
						>
							All measurements were taken accurately and without any issues
						</Text>
					</TouchableOpacity>

					{/* Collected Data Met Project Requirements */}
					<TouchableOpacity
						className="flex-row items-center py-2"
						onPress={() => {
							if (!reportData) return;
							setReportData({
								...reportData,
								collected_data_met_project_requirements:
									!reportData.collected_data_met_project_requirements,
							});
						}}
					>
						<View
							className="w-5 h-5 rounded border-2 mr-2 items-center justify-center"
							style={{
								borderColor: reportData.collected_data_met_project_requirements
									? isDark
										? colors.dark.primary
										: colors.light.primary
									: isDark
										? colors.dark.border
										: colors.light.border,
								backgroundColor:
									reportData.collected_data_met_project_requirements
										? isDark
											? colors.dark.primary
											: colors.light.primary
										: "transparent",
							}}
						>
							{reportData.collected_data_met_project_requirements && (
								<Ionicons
									name="checkmark"
									size={14}
									color={
										isDark ? colors.dark.background : colors.light.background
									}
								/>
							)}
						</View>
						<Text
							style={{
								color: isDark
									? colors.dark.foreground
									: colors.light.foreground,
								fontSize: 13,
							}}
						>
							The collected data was consistent and met the project requirements
						</Text>
					</TouchableOpacity>

					{/* No Discrepancies Detected */}
					<TouchableOpacity
						className="flex-row items-center py-2 pr-4"
						onPress={() => {
							if (!reportData) return;
							setReportData({
								...reportData,
								no_discrepancies_detected:
									!reportData.no_discrepancies_detected,
							});
						}}
					>
						<View
							className="w-5 h-5 rounded border-2 mr-2 items-center justify-center"
							style={{
								borderColor: reportData.no_discrepancies_detected
									? isDark
										? colors.dark.primary
										: colors.light.primary
									: isDark
										? colors.dark.border
										: colors.light.border,
								backgroundColor: reportData.no_discrepancies_detected
									? isDark
										? colors.dark.primary
										: colors.light.primary
									: "transparent",
							}}
						>
							{reportData.no_discrepancies_detected && (
								<Ionicons
									name="checkmark"
									size={14}
									color={
										isDark ? colors.dark.background : colors.light.background
									}
								/>
							)}
						</View>
						<Text
							style={{
								color: isDark
									? colors.dark.foreground
									: colors.light.foreground,
								fontSize: 13,
							}}
						>
							No significant discrepancies or abnormalities were detected during
							the fieldwork
						</Text>
					</TouchableOpacity>

					{/* Control Points Established */}
					<TouchableOpacity
						className="flex-row items-center py-2 pr-4"
						onPress={() => {
							if (!reportData) return;
							setReportData({
								...reportData,
								control_points_established:
									!reportData.control_points_established,
							});
						}}
					>
						<View
							className="w-5 h-5 rounded border-2 mr-2 items-center justify-center"
							style={{
								borderColor: reportData.control_points_established
									? isDark
										? colors.dark.primary
										: colors.light.primary
									: isDark
										? colors.dark.border
										: colors.light.border,
								backgroundColor: reportData.control_points_established
									? isDark
										? colors.dark.primary
										: colors.light.primary
									: "transparent",
							}}
						>
							{reportData.control_points_established && (
								<Ionicons
									name="checkmark"
									size={14}
									color={
										isDark ? colors.dark.background : colors.light.background
									}
								/>
							)}
						</View>
						<Text
							style={{
								color: isDark
									? colors.dark.foreground
									: colors.light.foreground,
								fontSize: 13,
							}}
						>
							All control points were properly established and verified
						</Text>
					</TouchableOpacity>
				</View>
			</View>

			{/* Additional Controls Section */}
			<View className="mb-4">
				<Text
					className="mb-2 font-medium"
					style={{
						color: isDark ? colors.dark.foreground : colors.light.foreground,
					}}
				>
					Additional Controls
				</Text>

				<View className="flex flex-wrap">
					{/* No Further Actions */}
					<TouchableOpacity
						className="flex-row items-center py-2 pr-4"
						onPress={() => {
							if (!reportData) return;
							setReportData({
								...reportData,
								no_further_actions: !reportData.no_further_actions,
							});
						}}
					>
						<View
							className="w-5 h-5 rounded border-2 mr-2 items-center justify-center"
							style={{
								borderColor: reportData.no_further_actions
									? isDark
										? colors.dark.primary
										: colors.light.primary
									: isDark
										? colors.dark.border
										: colors.light.border,
								backgroundColor: reportData.no_further_actions
									? isDark
										? colors.dark.primary
										: colors.light.primary
									: "transparent",
							}}
						>
							{reportData.no_further_actions && (
								<Ionicons
									name="checkmark"
									size={14}
									color={
										isDark ? colors.dark.background : colors.light.background
									}
								/>
							)}
						</View>
						<Text
							style={{
								color: isDark
									? colors.dark.foreground
									: colors.light.foreground,
								fontSize: 13,
							}}
						>
							All activities were completed successfully, no further actions
							required
						</Text>
					</TouchableOpacity>

					{/* No Equipment Problems */}
					<TouchableOpacity
						className="flex-row items-center py-2 pr-4"
						onPress={() => {
							if (!reportData) return;
							setReportData({
								...reportData,
								no_equipment_problems: !reportData.no_equipment_problems,
							});
						}}
					>
						<View
							className="w-5 h-5 rounded border-2 mr-2 items-center justify-center"
							style={{
								borderColor: reportData.no_equipment_problems
									? isDark
										? colors.dark.primary
										: colors.light.primary
									: isDark
										? colors.dark.border
										: colors.light.border,
								backgroundColor: reportData.no_equipment_problems
									? isDark
										? colors.dark.primary
										: colors.light.primary
									: "transparent",
							}}
						>
							{reportData.no_equipment_problems && (
								<Ionicons
									name="checkmark"
									size={14}
									color={
										isDark ? colors.dark.background : colors.light.background
									}
								/>
							)}
						</View>
						<Text
							style={{
								color: isDark
									? colors.dark.foreground
									: colors.light.foreground,
								fontSize: 13,
							}}
						>
							There were no problems with the equipment used
						</Text>
					</TouchableOpacity>
				</View>
			</View>
			{/* Scope Change Notes */}
			<View className="mb-4 mt-2">
				<Text
					className="mb-1 font-medium"
					style={{
						color: isDark ? colors.dark.foreground : colors.light.foreground,
					}}
				>
					Was there any change of scope? If yes please explain.
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
					value={reportData.scope_change_notes || ""}
					onChangeText={(text) =>
						setReportData({ ...reportData, scope_change_notes: text })
					}
					placeholder="Enter any scope change notes"
					placeholderTextColor={isDark ? colors.dark.muted : colors.light.muted}
					multiline={true}
					numberOfLines={3}
				/>
			</View>
		</View>
	);
};
