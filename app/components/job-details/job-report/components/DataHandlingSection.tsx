import React from "react";
import {
	View,
	Text,
	TextInput,
	StyleSheet,
	TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useColorScheme } from "@/lib/useColorScheme";
import { colors } from "@/constants/colors";
import { JobReportData } from "../hooks/useJobReport";
import {
	DATA_SENT_VIA_OPTIONS,
	DATA_TYPE_SENT_OPTIONS,
	MARKS_PICKED_UP_OPTIONS,
} from "../constants";
import { Select } from "../../../../components/ui/Select";
import { MultiSelect } from "../../../../components/ui/MultiSelect";

interface DataHandlingSectionProps {
	reportData: JobReportData;
	setReportData: React.Dispatch<React.SetStateAction<JobReportData | null>>;
}

const styles = StyleSheet.create({
	fieldContainer: {
		marginBottom: 0,
	},
	numberInputContainer: {
		flexDirection: "row",
		alignItems: "center",
		marginTop: 8,
		flexGrow: 1,
	},
	numberButton: {
		width: 40,
		height: 40,
		alignItems: "center",
		justifyContent: "center",
		borderWidth: 1,
	},
	numberInput: {
		height: 40,
		paddingHorizontal: 16,
		textAlign: "center",
		borderTopWidth: 1,
		borderBottomWidth: 1,
		minWidth: 50,
	},
});

export const DataHandlingSection: React.FC<DataHandlingSectionProps> = ({
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
				Data Handling
			</Text>

			{/* All Data Registered */}
			<View className="mb-4">
				<View className="flex flex-wrap">
					<TouchableOpacity
						className="flex-row items-center py-2 pr-4"
						onPress={() => {
							if (!reportData) return;
							setReportData({
								...reportData,
								all_data_registered: !reportData.all_data_registered,
							});
						}}
					>
						<View
							className="w-5 h-5 rounded mr-2 items-center justify-center"
							style={{
								borderWidth: 2,
								borderColor: isDark ? colors.dark.border : colors.light.border,
								backgroundColor: reportData.all_data_registered
									? isDark
										? colors.dark.primary
										: colors.light.primary
									: "transparent",
							}}
						>
							{reportData.all_data_registered && (
								<Ionicons name="checkmark" size={14} color="#fff" />
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
							All data requested in the specs is in the registered data
						</Text>
					</TouchableOpacity>
				</View>
				<View className="flex flex-wrap">
					<TouchableOpacity
						className="flex-row items-center py-2 pr-4"
						onPress={() => {
							if (!reportData) return;
							setReportData({
								...reportData,
								all_links_completed: !reportData.all_links_completed,
							});
						}}
					>
						<View
							className="w-5 h-5 rounded mr-2 items-center justify-center"
							style={{
								borderWidth: 2,
								borderColor: isDark ? colors.dark.border : colors.light.border,
								backgroundColor: reportData.all_links_completed
									? isDark
										? colors.dark.primary
										: colors.light.primary
									: "transparent",
							}}
						>
							{reportData.all_links_completed && (
								<Ionicons name="checkmark" size={14} color="#fff" />
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
							All links completed and loop closed
						</Text>
					</TouchableOpacity>
				</View>
			</View>

			{/* Corrupted Scans */}
			<View style={[styles.fieldContainer, { marginBottom: 16 }]}>
				<Text
					style={{
						color: isDark ? colors.dark.foreground : colors.light.foreground,
						fontWeight: "500",
						marginBottom: 4,
					}}
				>
					Corrupted Scans
				</Text>
				<View style={styles.numberInputContainer}>
					<TouchableOpacity
						style={[
							styles.numberButton,
							{
								borderColor: isDark ? colors.dark.border : colors.light.border,
								backgroundColor: isDark
									? colors.dark.background
									: colors.light.background,
								borderTopLeftRadius: 6,
								borderBottomLeftRadius: 6,
							},
						]}
						onPress={() => {
							if (!reportData) return;
							const newValue = Math.max(0, reportData.corrupted_scans - 1);
							setReportData({ ...reportData, corrupted_scans: newValue });
						}}
					>
						<Ionicons
							name="remove"
							size={24}
							color={isDark ? colors.dark.foreground : colors.light.foreground}
						/>
					</TouchableOpacity>
					<TextInput
						style={[
							styles.numberInput,
							{
								borderColor: isDark ? colors.dark.border : colors.light.border,
								color: isDark
									? colors.dark.foreground
									: colors.light.foreground,
								backgroundColor: isDark
									? colors.dark.background
									: colors.light.background,
							},
						]}
						value={reportData.corrupted_scans.toString()}
						onChangeText={(text) => {
							const value = parseInt(text) || 0;
							setReportData({ ...reportData, corrupted_scans: value });
						}}
						keyboardType="numeric"
					/>
					<TouchableOpacity
						style={[
							styles.numberButton,
							{
								borderColor: isDark ? colors.dark.border : colors.light.border,
								backgroundColor: isDark
									? colors.dark.background
									: colors.light.background,
								borderTopRightRadius: 6,
								borderBottomRightRadius: 6,
							},
						]}
						onPress={() => {
							if (!reportData) return;
							setReportData({
								...reportData,
								corrupted_scans: reportData.corrupted_scans + 1,
							});
						}}
					>
						<Ionicons
							name="add"
							size={24}
							color={isDark ? colors.dark.foreground : colors.light.foreground}
						/>
					</TouchableOpacity>
				</View>
			</View>

			{/* Data Sent Via */}
			<View style={styles.fieldContainer}>
				<MultiSelect
					label="Data collected on the site were sent to the RLS server via"
					options={DATA_SENT_VIA_OPTIONS}
					values={reportData.data_sent_via || []}
					onChange={(values: string[]) => {
						setReportData({ ...reportData, data_sent_via: values });
					}}
					placeholder="Select data transmission methods"
				/>
			</View>

			{/* Data Type Sent */}
			<View style={styles.fieldContainer}>
				<MultiSelect
					label="Type of the Data sent"
					options={DATA_TYPE_SENT_OPTIONS}
					values={reportData.data_type_sent || []}
					onChange={(values: string[]) => {
						setReportData({ ...reportData, data_type_sent: values });
					}}
					placeholder="Select data types"
				/>
			</View>

			{/* Marks Picked Up */}
			<View style={styles.fieldContainer}>
				<MultiSelect
					label="How the marks were picked up"
					options={MARKS_PICKED_UP_OPTIONS}
					values={reportData.marks_picked_up || []}
					onChange={(values: string[]) => {
						setReportData({ ...reportData, marks_picked_up: values });
					}}
					placeholder="Select marks picked up"
				/>
			</View>

			{/* Need Post Processing */}
			<View style={styles.fieldContainer}>
				<Select
					label="Does GPR need to be post processed?"
					options={["Yes", "No"]}
					value={reportData.need_post_processing ? "Yes" : "No"}
					onChange={(value: string) => {
						setReportData({
							...reportData,
							need_post_processing: value === "Yes",
						});
					}}
					placeholder="Select option"
				/>
			</View>
		</View>
	);
};
