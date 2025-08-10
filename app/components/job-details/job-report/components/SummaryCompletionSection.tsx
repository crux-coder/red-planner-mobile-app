import React from "react";
import { View, TouchableOpacity, Text, TextInput } from "react-native";
import { useColorScheme } from "@/lib/useColorScheme";
import { colors } from "@/constants/colors";
import { JobReportData } from "../hooks/useJobReport";

interface SummaryCompletionSectionProps {
	reportData: JobReportData;
	setReportData: React.Dispatch<React.SetStateAction<JobReportData | null>>;
}

export const SummaryCompletionSection: React.FC<
	SummaryCompletionSectionProps
> = ({ reportData, setReportData }) => {
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
				Summary and Completion
			</Text>

			{/* Summary of Work */}
			<View className="mb-4">
				<Text
					className="mb-1 font-medium"
					style={{
						color: isDark ? colors.dark.foreground : colors.light.foreground,
					}}
				>
					Summary of Work
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
					value={reportData.summary_of_work || ""}
					onChangeText={(text) =>
						setReportData({ ...reportData, summary_of_work: text })
					}
					placeholder="Enter summary of work completed"
					placeholderTextColor={isDark ? colors.dark.muted : colors.light.muted}
					multiline={true}
					numberOfLines={4}
				/>
			</View>

			{/* Problems Encountered */}
			<View className="mb-4">
				<Text
					className="mb-1 font-medium"
					style={{
						color: isDark ? colors.dark.foreground : colors.light.foreground,
					}}
				>
					Problems Encountered
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
					value={reportData.problems || ""}
					onChangeText={(text) =>
						setReportData({ ...reportData, problems: text })
					}
					placeholder="Describe any problems encountered"
					placeholderTextColor={isDark ? colors.dark.muted : colors.light.muted}
					multiline={true}
					numberOfLines={3}
				/>
			</View>

			{/* Handover Notes */}
			<View className="mb-4">
				<Text
					className="mb-1 font-medium"
					style={{
						color: isDark ? colors.dark.foreground : colors.light.foreground,
					}}
				>
					Handover Notes
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
					value={reportData.handover || ""}
					onChangeText={(text) =>
						setReportData({ ...reportData, handover: text })
					}
					placeholder="Enter handover notes"
					placeholderTextColor={isDark ? colors.dark.muted : colors.light.muted}
					multiline={true}
					numberOfLines={3}
				/>
			</View>

			{/* Completion Date */}
			<View className="mb-4">
				<Text
					className="mb-1 font-medium"
					style={{
						color: isDark ? colors.dark.foreground : colors.light.foreground,
					}}
				>
					Completion Date
				</Text>
				<TouchableOpacity
					className="p-3 rounded-md border"
					style={{
						borderColor: isDark ? colors.dark.border : colors.light.border,
					}}
					onPress={() => {
						// Date picker would be implemented here
						// For now, we'll just use a placeholder
						const newDate = new Date().toISOString().split("T")[0];
						setReportData((prev) =>
							prev ? { ...prev, completion_date: newDate } : null,
						);
					}}
				>
					<Text>{reportData.completion_date || "Select completion date"}</Text>
				</TouchableOpacity>
			</View>
		</View>
	);
};
