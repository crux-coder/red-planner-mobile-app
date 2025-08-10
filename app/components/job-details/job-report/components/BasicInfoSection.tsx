import React from "react";
import { View, TouchableOpacity, Text, StyleSheet } from "react-native";
import { useColorScheme } from "@/lib/useColorScheme";
import { colors } from "@/constants/colors";
import { JobReportData } from "../hooks/useJobReport";
import { Select } from "../../../../components/ui/Select";

interface BasicInfoSectionProps {
	reportData: JobReportData;
	setReportData: React.Dispatch<React.SetStateAction<JobReportData | null>>;
}

const styles = StyleSheet.create({
	fieldContainer: {
		marginBottom: 16,
	},
	sectionContainer: {
		marginBottom: 24,
		padding: 16,
		borderRadius: 8,
		borderWidth: 1,
	},
	sectionTitle: {
		fontSize: 18,
		fontWeight: "600",
		marginBottom: 12,
	},
	datePicker: {
		padding: 12,
		borderWidth: 1,
		borderRadius: 6,
	},
	dateText: {
		fontSize: 14,
	},
	labelText: {
		fontWeight: "500",
		marginBottom: 4,
	},
});

export const BasicInfoSection: React.FC<BasicInfoSectionProps> = ({
	reportData,
	setReportData,
}) => {
	const { colorScheme } = useColorScheme();
	const isDark = colorScheme === "dark";

	return (
		<View
			style={[
				styles.sectionContainer,
				{
					backgroundColor: isDark ? colors.dark.card : colors.light.card,
					borderColor: isDark ? colors.dark.border : colors.light.border,
				},
			]}
		>
			<Text
				style={[
					styles.sectionTitle,
					{
						color: isDark ? colors.dark.foreground : colors.light.foreground,
					},
				]}
			>
				Basic Information
			</Text>

			{/* Date of Work */}
			<View style={styles.fieldContainer}>
				<Text
					style={[
						styles.labelText,
						{
							color: isDark ? colors.dark.foreground : colors.light.foreground,
						},
					]}
				>
					Date of Work
				</Text>
				<TouchableOpacity
					style={[
						styles.datePicker,
						{
							borderColor: isDark ? colors.dark.border : colors.light.border,
						},
					]}
					onPress={() => {
						// Date picker would be implemented here
						// For now, we'll just use a placeholder
						const newDate = new Date().toISOString().split("T")[0];
						setReportData((prev) =>
							prev ? { ...prev, date_of_work: newDate } : null,
						);
					}}
				>
					<Text style={styles.dateText}>
						{reportData.date_of_work || "Select date"}
					</Text>
				</TouchableOpacity>
			</View>


		</View>
	);
};
