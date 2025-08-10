import { useState, useEffect } from "react";
import { supabase } from "@/config/supabase";
import { useSupabase } from "@/context/supabase-provider";

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

	const saveReport = async (reportToSave: JobReportData) => {
		try {
			setSaving(true);

			const { data, error } = reportToSave.id
				? await supabase
						.from("job_reports")
						.update(reportToSave)
						.eq("id", reportToSave.id)
						.select()
				: await supabase.from("job_reports").insert(reportToSave).select();

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
		fetchReportData,
		saveReport,
	};
};
