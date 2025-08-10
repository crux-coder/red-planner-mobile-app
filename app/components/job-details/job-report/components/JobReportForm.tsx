import React from "react";
import {
	View,
	ScrollView,
	ActivityIndicator,
	TouchableOpacity,
	Text as RNText,
	Alert,
} from "react-native";
import { Text } from "@/components/ui/text";
import { useColorScheme } from "@/lib/useColorScheme";
import { colors } from "@/constants/colors";
import { JobReportData } from "../hooks/useJobReport";
import { BasicInfoSection } from "./BasicInfoSection";
import { SiteConditionsSection } from "./SiteConditionsSection";
import { DataControlSection } from "./DataControlSection";
import { EquipmentActionSection } from "./EquipmentActionSection";
import { DataHandlingSection } from "./DataHandlingSection";
import { SummaryCompletionSection } from "./SummaryCompletionSection";
import { supabase } from "@/config/supabase";
import * as FileSystem from "expo-file-system";
import AttachmentsSection from "./AttachmentsSection";

export interface JobReportFormProps {
	jobId: string;
	projectId: string;
	reportData: JobReportData;
	setReportData: React.Dispatch<React.SetStateAction<JobReportData | null>>;
	saving?: boolean;
	onCancel?: () => void;
	onSave: (payload: JobReportData) => Promise<void> | void;
}

export const JobReportForm: React.FC<JobReportFormProps> = ({
	jobId,
	projectId,
	reportData,
	setReportData,
	saving = false,
	onCancel,
	onSave,
}) => {
	const { colorScheme } = useColorScheme();
	const isDark = colorScheme === "dark";

	// Upload any local image/file URIs in reportData.files to Supabase Storage
	// and return an array of public URLs. Existing http(s) URLs are passed through.
	const uploadReportImages = async (files: string[]): Promise<string[]> => {
		if (!files || files.length === 0) return [];

		const uploadedUrls: string[] = [];
		for (let i = 0; i < files.length; i++) {
			const uri = files[i];
			try {
				if (uri.startsWith("http://") || uri.startsWith("https://")) {
					uploadedUrls.push(uri);
					continue;
				}

				let fileUri = uri;
				const timestamp = Date.now();
				const defaultExt = "jpg";
				let ext = uri.split(".").pop() || defaultExt;

				if (fileUri.startsWith("ph://") || fileUri.startsWith("content://")) {
					const tempUri = `${FileSystem.documentDirectory}jr-${timestamp}-${i}.${ext}`;
					await FileSystem.copyAsync({ from: fileUri, to: tempUri });
					fileUri = tempUri;
				}

				const fileInfo = await FileSystem.getInfoAsync(fileUri);
				if (!fileInfo.exists || !fileInfo.size) {
					throw new Error(`File does not exist or is empty: ${fileUri}`);
				}

				const response = await fetch(fileUri);
				const blob = await response.blob();
				if (!blob || blob.size === 0) {
					throw new Error("Failed to create blob from file");
				}
				const contentType = blob.type || "image/jpeg";
				if (!ext || ext.length > 5) {
					const guessExt = contentType.split("/").pop();
					if (guessExt) ext = guessExt;
				}

				const arrayBuffer: ArrayBuffer = await new Promise(
					(resolve, reject) => {
						const reader = new FileReader();
						reader.onload = () => resolve(reader.result as ArrayBuffer);
						reader.onerror = reject;
						reader.readAsArrayBuffer(blob);
					},
				);

				const fileName = `job-reports/${jobId}/${timestamp}-${i}.${ext}`;
				const { data, error } = await supabase.storage
					.from("job-reports")
					.upload(fileName, arrayBuffer, { contentType, upsert: true });

				if (error) throw error;

				const { data: publicUrlData } = supabase.storage
					.from("job-reports")
					.getPublicUrl(fileName);
				if (publicUrlData?.publicUrl) {
					uploadedUrls.push(publicUrlData.publicUrl);
				} else if (data?.fullPath) {
					uploadedUrls.push(data.fullPath);
				}

				if (
					fileUri !== uri &&
					fileUri.startsWith(FileSystem.documentDirectory || "")
				) {
					try {
						await FileSystem.deleteAsync(fileUri, { idempotent: true });
					} catch {
						// ignore
					}
				}
			} catch (e) {
				console.error("JobReport image upload failed:", e);
				throw e;
			}
		}

		return uploadedUrls;
	};

	const handleSave = async () => {
		try {
			let payload: JobReportData = reportData;
			if (reportData.files && reportData.files.length > 0) {
				const uploadedUrls = await uploadReportImages(reportData.files);
				payload = { ...reportData, files: uploadedUrls };
			}
			await onSave(payload);
		} catch (err) {
			console.error("Failed to save job report:", err);
			Alert.alert(
				"Upload Error",
				"Failed to upload one or more images. Please try again.",
			);
		}
	};

	return (
		<View style={{ flex: 1 }}>
			{/* Header */}
			<View
				style={{
					flexDirection: "row",
					justifyContent: "space-between",
					alignItems: "center",
					paddingHorizontal: 16,
					paddingVertical: 12,
					borderBottomWidth: 1,
					borderBottomColor: isDark ? colors.dark.border : colors.light.border,
				}}
			>
				<Text
					style={{
						color: isDark ? colors.dark.foreground : colors.light.foreground,
						fontWeight: "bold",
						fontSize: 20,
					}}
				>
					Job Report
				</Text>
				<View style={{ flexDirection: "row" }}>
					{onCancel && (
						<TouchableOpacity
							onPress={onCancel}
							style={{
								paddingVertical: 8,
								paddingHorizontal: 16,
								borderRadius: 8,
								marginRight: 8,
								backgroundColor: isDark ? colors.dark.card : colors.light.card,
							}}
						>
							<Text
								style={{
									color: isDark
										? colors.dark.foreground
										: colors.light.foreground,
								}}
							>
								Cancel
							</Text>
						</TouchableOpacity>
					)}
					<TouchableOpacity
						onPress={handleSave}
						disabled={!!saving}
						style={{
							paddingVertical: 8,
							paddingHorizontal: 16,
							borderRadius: 8,
							backgroundColor: isDark
								? colors.dark.primary
								: colors.light.primary,
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
								color: isDark
									? colors.dark.background
									: colors.light.background,
							}}
						>
							{saving ? "Saving..." : "Save"}
						</Text>
					</TouchableOpacity>
				</View>
			</View>

			{/* Form content */}
			<ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
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
			</ScrollView>
		</View>
	);
};
