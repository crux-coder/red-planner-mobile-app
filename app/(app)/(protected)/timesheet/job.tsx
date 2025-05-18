import { useEffect, useState } from "react";
import { View, ScrollView, ActivityIndicator, Alert } from "react-native";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";

import { Text } from "@/components/ui/text";
import { supabase } from "@/config/supabase";
import { useColorScheme } from "@/lib/useColorScheme";
import { colors } from "@/constants/colors";
import { Job, JobStatus } from "../schedule/index";
import { useSupabase } from "@/context/supabase-provider";

// Import new components
import JobHeader from "@/app/components/job-details/JobHeader";
import JobDateTime from "@/app/components/job-details/JobDateTime";
import PeopleAssignments from "@/app/components/job-details/PeopleAssignments";
import EquipmentAssignments from "@/app/components/job-details/EquipmentAssignments";
import TransportationAssignments from "@/app/components/job-details/TransportationAssignments";
import JobNotes from "@/app/components/job-details/JobNotes";
import JobActions from "@/app/components/job-details/JobActions";
import Separator from "@/app/components/common/Separator";
import { toLocalTimestamp } from "@/lib/utils";

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
				.from("jobs")
				.select(
					`
          *,
          project:projects(*),
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
				.from("jobs")
				.update({ status: newStatus })
				.eq("id", job.id);

			if (error) {
				console.error("Error updating job status:", error);
				Alert.alert("Error", "Failed to update job status. Please try again.");
				return;
			}

			// Update local state
			setJob({ ...job, status: newStatus });
		} catch (error) {
			console.error("Error:", error);
			Alert.alert("Error", "An unexpected error occurred. Please try again.");
		} finally {
			setUpdatingStatus(false);
		}
	};

	// Handle start job
	const handleStartJob = async () => {
		if (!userProfile || !job) return;

		try {
			setUpdatingStatus(true);

			// 1. Update job status
			await updateJobStatus("in_progress");

			// 2. End current shift if active (find latest shift for this user with end_time null)
			const now = new Date();
			const nowFormatted = toLocalTimestamp(now);
			const { data: activeShifts, error: shiftError } = await supabase
				.from("time_blocks")
				.select("*")
				.eq("worker_id", userProfile.id)
				.is("end_time", null)
				.order("start_time", { ascending: false })
				.single();

			if (shiftError) {
				console.error("Error fetching current shift:", shiftError);
				Alert.alert("Error", "Could not check current shift.");
				return;
			}

			if (activeShifts) {
				const shiftId = activeShifts.id;
				const { error: endError } = await supabase
					.from("time_blocks")
					.update({ end_time: nowFormatted })
					.eq("id", shiftId);
				if (endError) {
					console.error("Error ending current shift:", endError);
					Alert.alert("Error", "Could not end current shift.");
					return;
				}
			}

			// 3. Start new job shift
			const { error: startError } = await supabase
				.from("time_blocks")
				.insert({
					worker_id: userProfile.id,
					category: "shift",
					type: "job",
					job_id: job.id,
					coefficient: 1,
					start_time: nowFormatted,
					end_time: null,
					notes: "",
				})
				.select()
				.single();

			if (startError) {
				console.error("Error starting job shift:", startError);
				Alert.alert("Error", "Could not start job shift.");
				return;
			}

			Alert.alert("Success", "Started job shift.");
		} catch (error) {
			console.error("Error in handleStartJob:", error);
			Alert.alert(
				"Error",
				"An unexpected error occurred while starting job shift.",
			);
		} finally {
			setUpdatingStatus(false);
		}
	};

	// Handle complete job
	const handleCompleteJob = async () => {
		if (!userProfile) return;

		try {
			setUpdatingStatus(true);

			// 1. Update job status
			await updateJobStatus("completed");

			// 2. End current shift if active
			const now = new Date();
			const nowFormatted = toLocalTimestamp(now);
			const { data: activeShift, error: shiftError } = await supabase
				.from("time_blocks")
				.select("*")
				.eq("worker_id", userProfile.id)
				.is("end_time", null)
				.order("start_time", { ascending: false })
				.single();

			if (shiftError) {
				console.error("Error fetching current shift:", shiftError);
				Alert.alert("Error", "Could not check current shift.");
				return;
			}

			if (activeShift) {
				const shiftId = activeShift.id;
				const { error: endError } = await supabase
					.from("time_blocks")
					.update({ end_time: nowFormatted })
					.eq("id", shiftId);
				if (endError) {
					console.error("Error ending current shift:", endError);
					Alert.alert("Error", "Could not end current shift.");
					return;
				}
			}

			// 3. Start new regular shift
			const { error: startError } = await supabase
				.from("time_blocks")
				.insert({
					worker_id: userProfile.id,
					category: "shift",
					type: "shift",
					coefficient: 1,
					start_time: nowFormatted,
					end_time: null,
					notes: "",
				})
				.select()
				.single();

			if (startError) {
				console.error("Error starting new shift:", startError);
				Alert.alert("Error", "Could not start new shift.");
				return;
			}

			Alert.alert("Success", "Job completed and new shift started.");
		} catch (error) {
			console.error("Error in handleCompleteJob:", error);
			Alert.alert(
				"Error",
				"An unexpected error occurred while completing job.",
			);
		} finally {
			setUpdatingStatus(false);
		}
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
							status={job.status}
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
