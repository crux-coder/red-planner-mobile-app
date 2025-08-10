import { useState, useEffect } from "react";
import { supabase } from "@/config/supabase";
import { useSupabase } from "@/context/supabase-provider";
import * as FileSystem from "expo-file-system";
import { JOB_REPORT_FILES_BUCKET } from "../constants";

// Define the job report data structure based on the schema
export interface JobReportData {
	id?: string;
	job_id: string;
	user_id: string;
	project_id: string;
	date_of_work: string; // ISO date string
	weather_conditions: string | null;
	disruption: string[] | null;
	briefings: string[] | null;
	permits: string[] | null;
	reporting_issues: string[] | null;
	data_control: string | null;
	measurements_taken_accurately: boolean;
	collected_data_met_project_requirements: boolean;
	no_discrepancies_detected: boolean;
	control_points_established: boolean;
	no_further_actions: boolean;
	no_equipment_problems: boolean;
	scope_change_notes: string | null;
	all_data_registered: boolean;
	all_links_completed: boolean;
	corrupted_scans: number;
	data_sent_via: string[] | null;
	data_type_sent: string[] | null;
	marks_picked_up: string[] | null;
	need_post_processing: boolean;
	summary_of_work: string | null;
	problems: string | null;
	equipment_problems: string | null;
	files: string[] | null;
	handover: string | null;
	completion_date: string | null; // ISO date string
}

export const useJobReport = (jobId: string, projectId: string) => {
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [reportData, setReportData] = useState<JobReportData | null>(null);
	const { userProfile } = useSupabase();

	// Initialize or fetch existing report data
	useEffect(() => {
		if (jobId && userProfile) {
			fetchReportData();
		}
	}, [jobId, userProfile]);

	const fetchReportData = async () => {
		try {
			setLoading(true);
			const { data, error } = await supabase
				.from("job_reports")
				.select("*")
				.eq("job_id", jobId)
				.limit(1)
				.maybeSingle();

			if (error) {
				console.error("Error fetching report data:", error);
				return;
			}

			if (data) {
				setReportData(data);
			} else {
				// Initialize with default values if no report exists
				setReportData({
					job_id: jobId,
					user_id: userProfile?.id || "",
					project_id: projectId,
					date_of_work: new Date().toISOString().split("T")[0],
					weather_conditions: null,
					disruption: [],
					briefings: [],
					permits: [],
					reporting_issues: [],
					data_control: null,
					measurements_taken_accurately: false,
					collected_data_met_project_requirements: false,
					no_discrepancies_detected: false,
					control_points_established: false,
					no_further_actions: false,
					no_equipment_problems: false,
					scope_change_notes: null,
					all_data_registered: false,
					all_links_completed: false,
					corrupted_scans: 0,
					data_sent_via: [],
					data_type_sent: [],
					marks_picked_up: [],
					need_post_processing: false,
					summary_of_work: null,
					problems: null,
					equipment_problems: null,
					files: [],
					handover: null,
					completion_date: null,
				});
			}
		} catch (error) {
			console.error("Error:", error);
		} finally {
			setLoading(false);
		}
	};

	// Initialize a new in-memory report with default values to avoid empty UI when creating
	const initNewReport = () => {
		const defaults: JobReportData = {
			job_id: jobId,
			user_id: userProfile?.id || "",
			project_id: projectId,
			date_of_work: new Date().toISOString().split("T")[0],
			weather_conditions: null,
			disruption: [],
			briefings: [],
			permits: [],
			reporting_issues: [],
			data_control: null,
			measurements_taken_accurately: false,
			collected_data_met_project_requirements: false,
			no_discrepancies_detected: false,
			control_points_established: false,
			no_further_actions: false,
			no_equipment_problems: false,
			scope_change_notes: null,
			all_data_registered: false,
			all_links_completed: false,
			corrupted_scans: 0,
			data_sent_via: [],
			data_type_sent: [],
			marks_picked_up: [],
			need_post_processing: false,
			summary_of_work: null,
			problems: null,
			equipment_problems: null,
			files: [],
			handover: null,
			completion_date: null,
		};
		setReportData(defaults);
		return defaults;
	};

	// Upload any local image/file URIs to Supabase Storage and return public URLs.
	// Existing http(s) URLs are preserved as-is.
	const uploadReportImages = async (
		files: string[],
		jobIdForPath: string,
	): Promise<string[]> => {
		if (!files || files.length === 0) return [];

		const uploadedUrls: string[] = [];
		for (let i = 0; i < files.length; i++) {
			const uri = files[i];
			try {
				// Preserve existing remote URLs
				if (uri.startsWith("http://") || uri.startsWith("https://")) {
					uploadedUrls.push(uri);
					continue;
				}

				let fileUri = uri;
				const timestamp = Date.now();
				const defaultExt = "jpg";
				let ext = uri.split(".").pop() || defaultExt;

				// Handle iOS "ph://" and Android "content://" URIs by copying to a temp file first
				if (fileUri.startsWith("ph://") || fileUri.startsWith("content://")) {
					const tempUri = `${FileSystem.documentDirectory}jr-${timestamp}-${i}.${ext}`;
					await FileSystem.copyAsync({ from: fileUri, to: tempUri });
					fileUri = tempUri;
				}

				// Validate file exists
				const fileInfo = await FileSystem.getInfoAsync(fileUri);
				if (!fileInfo.exists || !fileInfo.size) {
					throw new Error(`File does not exist or is empty: ${fileUri}`);
				}

				// Read binary via fetch -> blob -> ArrayBuffer
				const response = await fetch(fileUri);
				const blob = await response.blob();
				if (!blob || blob.size === 0) {
					throw new Error("Failed to create blob from file");
				}
				const contentType = (blob as any).type || "image/jpeg";
				if (!ext || ext.length > 5) {
					const guessExt = contentType.split("/").pop();
					if (guessExt) ext = guessExt;
				}

				const arrayBuffer: ArrayBuffer = await new Promise((resolve, reject) => {
					const reader = new FileReader();
					reader.onload = () => resolve(reader.result as ArrayBuffer);
					reader.onerror = reject;
					reader.readAsArrayBuffer(blob);
				});

				const fileName = `job-reports/${jobIdForPath}/${timestamp}-${i}.${ext}`;
				const { data, error } = await supabase.storage
					.from(JOB_REPORT_FILES_BUCKET)
					.upload(fileName, arrayBuffer, { contentType, upsert: true });

				if (error) throw error;

				const { data: publicUrlData } = supabase.storage
					.from(JOB_REPORT_FILES_BUCKET)
					.getPublicUrl(fileName);

				if (publicUrlData?.publicUrl) {
					uploadedUrls.push(publicUrlData.publicUrl);
				} else if (data?.fullPath) {
					uploadedUrls.push(data.fullPath);
				}

				// Cleanup temp file if created
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
				console.error("useJobReport image upload failed:", e);
				throw e;
			}
		}

		return uploadedUrls;
	};

	const saveReport = async (reportToSave: JobReportData) => {
		try {
			setSaving(true);

			// If there are local files (non-http URIs), upload them first and replace with public URLs
			let payload = reportToSave;
			const files = Array.isArray(reportToSave.files) ? reportToSave.files : [];
			const locals = files.filter((u) => !(u.startsWith("http://") || u.startsWith("https://")));
			if (locals.length > 0) {
				const uploaded = await uploadReportImages(locals, reportToSave.job_id);
				const preserved = files.filter((u) => u.startsWith("http://") || u.startsWith("https://"));
				payload = { ...reportToSave, files: [...preserved, ...uploaded] };
			}

			const { data, error } = payload.id
				? await supabase
						.from("job_reports")
						.update(payload)
						.eq("id", payload.id)
						.select()
				: await supabase.from("job_reports").insert(payload).select();

			if (error) {
				console.error("Error saving report:", error);
				throw new Error("Failed to save report");
			}

			// Update with the returned data
			if (data && data.length > 0) {
				setReportData(data[0]);
			}

			return { success: true, data };
		} catch (error) {
			console.error("Error:", error);
			return { success: false, error };
		} finally {
			setSaving(false);
		}
	};

	return {
		reportData,
		setReportData,
		loading,
		saving,
		initNewReport,
		fetchReportData,
		saveReport,
	};
};
