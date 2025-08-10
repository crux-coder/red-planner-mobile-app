import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useColorScheme } from "@/lib/useColorScheme";
import { colors } from "@/constants/colors";
import { JobReportData } from "../hooks/useJobReport";
import {
	DISRUPTION_OPTIONS,
	BRIEFINGS_OPTIONS,
	PERMITS_OPTIONS,
	REPORTING_ISSUES_OPTIONS,
	WEATHER_CONDITIONS,
} from "../constants";
// Using relative path to avoid import issues
import { MultiSelect } from "../../../../components/ui/MultiSelect";
import { Select } from "../../../../components/ui/Select";

interface SiteConditionsSectionProps {
	reportData: JobReportData;
	setReportData: React.Dispatch<React.SetStateAction<JobReportData | null>>;
}

export const SiteConditionsSection: React.FC<SiteConditionsSectionProps> = ({
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
				Site Conditions
			</Text>

			{/* Weather Conditions */}
			<View>
				<Select
					label="Weather Conditions"
					options={WEATHER_CONDITIONS}
					value={reportData.weather_conditions || ""}
					onChange={(value: string) => {
						setReportData({
							...reportData,
							weather_conditions: value,
						});
					}}
					placeholder="Select weather condition"
				/>
			</View>

			{/* Disruptions */}
			<View>
				<MultiSelect
					label="Variation/Delay/Disruption"
					options={DISRUPTION_OPTIONS}
					values={reportData.disruption || []}
					onChange={(values: string[]) => {
						setReportData({ ...reportData, disruption: values });
					}}
					placeholder="Select disruptions"
				/>
			</View>

			{/* Briefings */}
			<View>
				<MultiSelect
					label="Briefings"
					options={BRIEFINGS_OPTIONS}
					values={reportData.briefings || []}
					onChange={(values: string[]) => {
						setReportData({ ...reportData, briefings: values });
					}}
					placeholder="Select briefings"
				/>
			</View>

			{/* Permits */}
			<View>
				<MultiSelect
					label="Permits"
					options={PERMITS_OPTIONS}
					values={reportData.permits || []}
					onChange={(values: string[]) => {
						setReportData({ ...reportData, permits: values });
					}}
					placeholder="Select permits"
				/>
			</View>

			{/* Reporting Issues */}
			<View>
				<MultiSelect
					label="Reporting Issues"
					options={REPORTING_ISSUES_OPTIONS}
					values={reportData.reporting_issues || []}
					onChange={(values: string[]) => {
						setReportData({ ...reportData, reporting_issues: values });
					}}
					placeholder="Select reporting issues"
				/>
			</View>
		</View>
	);
};
