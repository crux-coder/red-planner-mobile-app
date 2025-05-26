import { useEffect, useState } from "react";
import {
	View,
	ScrollView,
	ActivityIndicator,
	Alert,
	Text as RNText,
	TouchableOpacity,
	SafeAreaView,
} from "react-native";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";

import { Text } from "@/components/ui/text";
import { supabase } from "@/config/supabase";
import { useColorScheme } from "@/lib/useColorScheme";
import { colors } from "@/constants/colors";
import { Job, JobStatus } from "@/app/models/types";
import { useSupabase } from "@/context/supabase-provider";

// Import new components
import JobHeader from "@/app/components/job-details/JobHeader";
import JobDateTime from "@/app/components/job-details/JobDateTime";
import PeopleAssignments from "@/app/components/job-details/PeopleAssignments";
import EquipmentAssignments from "@/app/components/job-details/EquipmentAssignments";
import TransportationAssignments from "@/app/components/job-details/TransportationAssignments";
import JobNotes from "@/app/components/job-details/JobNotes";
import JobActions from "@/app/components/job-details/JobActions";
import { Ionicons } from "@expo/vector-icons";
import Separator from "@/app/components/common/Separator";

export default function JobDetailScreen() {
	const { id } = useLocalSearchParams<{ id: string }>();
	const [job, setJob] = useState<Job | null>(null);
	const [loading, setLoading] = useState(true);
	const [updatingStatus, setUpdatingStatus] = useState(false);
	const router = useRouter();
	const { colorScheme } = useColorScheme();
	const isDark = colorScheme === "dark";
	const { userProfile } = useSupabase();

	useEffect(() => {
		// Check if userProfile exists
		if (!userProfile) {
			console.log("No user profile, redirecting to welcome");
			// Redirect to login if userProfile is null
			router.replace("/(app)/welcome");
			return; // Early return to prevent fetchJobDetails from being called
		}

		// Only fetch job details if we have both a user profile and job ID
		if (id) {
			fetchJobDetails();
		}
	}, [id, userProfile, router]);

	const fetchJobDetails = async () => {
		// Double-check that userProfile is not null before proceeding
		if (!userProfile) {
			console.log("fetchJobDetails called with null userProfile");
			return;
		}

		try {
			setLoading(true);

			const { data, error } = await supabase
				.from("calendar_entries")
				.select(
					`
          *,
          job_project:projects(*),
          people_assignments:job_people_assignments(
            *,
            user:users(*)
          ),
          equipment_assignments:job_equipment_assignments(
            *,
            equipment:equipment(*)
          ),
          transportation_assignments:job_transportation_assignments(
            *,
            transportation:transportation(*)
          )
        `,
				)
				.eq("id", id)
				.single();

			if (error) {
				console.error("Error fetching job details:", error);
				return;
			}

			setJob(data as Job);
		} catch (error) {
			console.error("Error:", error);
		} finally {
			setLoading(false);
		}
	};

	// Update job status
	const updateJobStatus = async (newStatus: JobStatus) => {
		if (!job || !userProfile) return;

		try {
			setUpdatingStatus(true);

			const { error } = await supabase
				.from("calendar_entries")
				.update({ job_status: newStatus })
				.eq("id", job.id);

			if (error) {
				console.error("Error updating job status:", error);
				Alert.alert("Error", "Failed to update job status. Please try again.");
				return;
			}

			// Update local state
			setJob({ ...job, job_status: newStatus });
			Alert.alert(
				"Success",
				`Job status updated to ${newStatus.replace(/_/g, " ")}`,
			);
		} catch (error) {
			console.error("Error:", error);
			Alert.alert("Error", "An unexpected error occurred. Please try again.");
		} finally {
			setUpdatingStatus(false);
		}
	};

	// Handle start job
	const handleStartJob = () => {
		updateJobStatus("in_progress");
	};

	// Handle complete job
	const handleCompleteJob = () => {
		updateJobStatus("completed");
	};

	return (
		<View
			className="flex"
			style={{
				flex: 1,
				backgroundColor: isDark
					? colors.dark.background
					: colors.light.background,
			}}
		>
			<Stack.Screen
				options={{
					title: job ? `${job.job_number}` : "Job Details",
					presentation: "modal",
					headerShown: true,
					headerBackVisible: true,
					headerStyle: {
						backgroundColor: isDark
							? colors.dark.background
							: colors.light.background,
					},
				}}
			/>
			{loading ? (
				<View className="flex-1 justify-center items-center">
					<ActivityIndicator
						size="large"
						color={isDark ? colors.dark.primary : colors.light.primary}
					/>
				</View>
			) : job ? (
				<ScrollView style={{ flex: 1, flexGrow: 1 }}>
					<View className="p-2">
						{/* Job Header */}
						<JobHeader job={job} />
						{/* Date and Time */}
						<JobDateTime startDate={job.start_date} endDate={job.end_date} />

						<Separator />

						{/* Assigned People */}
						<PeopleAssignments assignments={job.people_assignments || []} />

						<Separator />

						{/* Assigned Equipment */}
						<EquipmentAssignments
							assignments={job.equipment_assignments || []}
						/>

						<Separator />

						{/* Assigned Transportation */}
						<TransportationAssignments
							assignments={job.transportation_assignments || []}
						/>

						<Separator />

						{/* Notes */}
						<JobNotes notes={job.notes} />

						<Separator />

						{/* Action buttons */}
						<JobActions
							status={job.job_status}
							updatingStatus={updatingStatus}
							onStartJob={handleStartJob}
							onCompleteJob={handleCompleteJob}
						/>
					</View>
				</ScrollView>
			) : (
				<View className="flex-1 justify-center items-center">
					<Text className="text-foreground">Job not found</Text>
				</View>
			)}
		</View>
	);
}
