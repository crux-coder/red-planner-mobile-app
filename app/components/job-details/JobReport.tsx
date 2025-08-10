import React, { useState } from "react";
import {
	View,
	TouchableOpacity,
	Modal,
	ScrollView,
	ActivityIndicator,
	SafeAreaView,
	KeyboardAvoidingView,
	Platform,
} from "react-native";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { Text } from "@/components/ui/text";
import { useColorScheme } from "@/lib/useColorScheme";
import { colors } from "@/constants/colors";
import { H4 } from "@/components/ui/typography";
import {
	useJobReport,
	BasicInfoSection,
	SiteConditionsSection,
	DataControlSection,
	EquipmentActionSection,
	DataHandlingSection,
	SummaryCompletionSection,
	JobReportData,
} from "./job-report";
import AttachmentsSection from "./job-report/components/AttachmentsSection";
import { format } from "date-fns";

// Define interface for database record which includes timestamps
interface JobReportRecord extends JobReportData {
	created_at?: string;
}

interface JobReportProps {
	jobId: string;
	projectId: string;
}

export const JobReport: React.FC<JobReportProps> = ({ jobId, projectId }) => {
	const { colorScheme } = useColorScheme();
	const isDark = colorScheme === "dark";
	const [modalVisible, setModalVisible] = useState(false);

	// Use custom hooks for data fetching and state management
	const {
		reportData,
		setReportData,
		loading,
		saving,
		saveReport,
		fetchReportData,
		initNewReport,
	} = useJobReport(jobId, projectId);

	const openReportModal = () => {
		// Ensure we have default data to render when no report exists yet
		if (!reportData) {
			initNewReport();
		}
		setModalVisible(true);
	};

	const handleSave = async () => {
		if (!reportData) return;

		const result = await saveReport(reportData);
		if (result.success) {
			setModalVisible(false);
		}
	};

	const handleCancel = () => {
		// Revert any unsaved changes
		fetchReportData();
		setModalVisible(false);
	};

	if (loading) {
		return (
			<View className="mb-4">
				<Text
					style={{
						color: isDark ? colors.dark.foreground : colors.light.foreground,
					}}
				>
					Loading report...
				</Text>
			</View>
		);
	}

	return (
		<View className="mb-4">
			{/* Report header with icon and title */}
			<View className="flex-row items-center mb-2">
				<MaterialIcons
					name="description"
					size={20}
					color={isDark ? colors.dark.primary : colors.light.primary}
				/>
				<H4 className="ml-2">Job Report</H4>
			</View>

			{reportData ? (
				<TouchableOpacity
					className="mb-3 p-4 rounded-lg flex-row items-center justify-between"
					style={{
						backgroundColor: isDark ? colors.dark.card : colors.light.card,
						borderColor: isDark ? colors.dark.border : colors.light.border,
						borderWidth: 1,
					}}
					onPress={openReportModal}
				>
					<View className="flex-1">
						<Text
							className="text-lg font-semibold mb-1"
							style={{
								color: isDark
									? colors.dark.foreground
									: colors.light.foreground,
							}}
						>
							Job Report
						</Text>
						<Text className="text-sm">
							Created on:{" "}
							{(reportData as JobReportRecord)?.created_at
								? format(
										new Date((reportData as JobReportRecord).created_at!),
										"dd MMM yyyy, HH:mm",
									)
								: "Not available"}
						</Text>
					</View>
					<Ionicons name="chevron-forward" size={20} />
				</TouchableOpacity>
			) : (
				<TouchableOpacity
					className="mb-3 p-4 rounded-lg flex-row items-center justify-between"
					style={{
						backgroundColor: isDark ? colors.dark.card : colors.light.card,
						borderColor: isDark ? colors.dark.border : colors.light.border,
						borderWidth: 1,
					}}
					onPress={openReportModal}
				>
					<View className="flex-1">
						<Text
							className="text-lg font-semibold"
							style={{
								color: isDark
									? colors.dark.foreground
									: colors.light.foreground,
							}}
						>
							No job report available
						</Text>
					</View>
					<View
						className="px-3 py-2 rounded-md flex-row items-center"
						style={{
							backgroundColor: isDark
								? colors.dark.primary
								: colors.light.primary,
						}}
					>
						<Text
							style={{
								color: isDark
									? colors.dark.background
									: colors.light.background,
								fontWeight: "500",
							}}
						>
							Create Report
						</Text>
					</View>
				</TouchableOpacity>
			)}

			{/* Modal for report form */}
			<Modal
				visible={modalVisible}
				animationType="slide"
				presentationStyle="pageSheet"
				onRequestClose={handleCancel}
			>
				<SafeAreaView
					style={{
						flex: 1,
						backgroundColor: isDark
							? colors.dark.background
							: colors.light.background,
					}}
				>
					{/* Modal header */}
					<View
						style={{
							paddingHorizontal: 16,
							paddingVertical: 12,
							borderBottomWidth: 1,
							borderBottomColor: isDark
								? colors.dark.border
								: colors.light.border,
						}}
					>
						<View
							style={{
								position: "relative",
								alignItems: "center",
								justifyContent: "center",
								minHeight: 28,
							}}
						>
							<TouchableOpacity
								onPress={handleCancel}
								style={{ position: "absolute", left: 0 }}
							>
								<Text
									style={{
										color: isDark ? colors.dark.primary : colors.light.primary,
										fontSize: 16,
									}}
								>
									Cancel
								</Text>
							</TouchableOpacity>
							<Text
								className="text-lg font-semibold"
								style={{
									color: isDark
										? colors.dark.foreground
										: colors.light.foreground,
								}}
							>
								Job Report
							</Text>
							<TouchableOpacity
								onPress={handleSave}
								disabled={saving}
								style={{
									position: "absolute",
									right: 0,
									flexDirection: "row",
									alignItems: "center",
								}}
							>
								{saving && (
									<ActivityIndicator
										size="small"
										color={
											isDark ? colors.dark.background : colors.light.background
										}
										style={{ marginRight: 8 }}
									/>
								)}
								<Text
									style={{
										color: isDark ? colors.dark.primary : colors.light.primary,
										fontSize: 16,
										fontWeight: "600",
									}}
								>
									{saving ? "Saving..." : "Save"}
								</Text>
							</TouchableOpacity>
						</View>
					</View>

					{/* Form content */}
					<KeyboardAvoidingView
						style={{ flex: 1 }}
						behavior={Platform.OS === "ios" ? "padding" : undefined}
						keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
					>
						<ScrollView
							style={{ flex: 1 }}
							contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
							keyboardDismissMode="interactive"
							keyboardShouldPersistTaps="handled"
						>
							{/* Subcomponents for each section */}
							{reportData ? (
								<>
									<BasicInfoSection
										reportData={reportData}
										setReportData={setReportData}
									/>

									<SiteConditionsSection
										reportData={reportData}
										setReportData={setReportData}
									/>

									<DataControlSection
										reportData={reportData}
										setReportData={setReportData}
									/>

									<DataHandlingSection
										reportData={reportData}
										setReportData={setReportData}
									/>

									<EquipmentActionSection
										reportData={reportData}
										setReportData={setReportData}
									/>

									<AttachmentsSection
										reportData={reportData}
										setReportData={setReportData}
									/>

									<SummaryCompletionSection
										reportData={reportData}
										setReportData={setReportData}
									/>
								</>
							) : (
								<View style={{ paddingVertical: 24, alignItems: "center" }}>
									<ActivityIndicator size="small" />
									<Text style={{ marginTop: 8 }}>Preparing report...</Text>
								</View>
							)}
						</ScrollView>
					</KeyboardAvoidingView>
				</SafeAreaView>
			</Modal>
		</View>
	);
};
