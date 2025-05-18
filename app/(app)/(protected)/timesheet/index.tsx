import React, { useState, useEffect, useCallback } from "react";
import { useFocusEffect } from "@react-navigation/native";
import {
	View,
	TouchableOpacity,
	ActivityIndicator,
	ScrollView,
	Alert,
	FlatList,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text } from "@/components/ui/text";
import { CurrentShiftCard } from "../../../components/timesheet/CurrentShiftCard";
import { JobsList } from "../../../components/timesheet/JobsList";
import { TimesheetActions } from "../../../components/timesheet/TimesheetActions";
import { CoefficientInputDialog } from "../../../components/timesheet/CoefficientInputDialog";
import { Ionicons } from "@expo/vector-icons";
import { useColorScheme } from "@/lib/useColorScheme";
import { useSupabase } from "@/context/supabase-provider";
import { format } from "date-fns";
import { supabase } from "@/config/supabase";
import { toLocalTimestamp } from "@/lib/utils";
import { useRouter } from "expo-router";

// Define the Shift interface
interface Shift {
	id: string;
	worker_id: string;
	job_id: string;
	start_time: string;
	end_time: string | null;
	category: "shift" | "overtime" | "break";
	type: "regular" | "job";
	coefficient: number;
	notes: string | null;
	created_at: string;
}

// Define the Job interface
interface Project {
	id: string;
	name: string;
	description?: string;
}

interface UserProfile {
	id: string;
	first_name: string;
	last_name: string;
	photo?: string;
}

interface Job {
	id: string;
	title: string;
	description?: string;
	start_date: string;
	end_date: string;
	type: string;
	status: string;
	job_number?: string;
	project?: Project;
	notes?: string;
	people_assignments: {
		id: string;
		user: UserProfile;
	}[];
}

// Define action types
type ActionType =
	| "break"
	| "endbreak"
	| "overtime"
	| "job"
	| "clockout"
	| "completejob";

export default function Timesheet() {
	const [currentShift, setCurrentShift] = useState<Shift | null>(null);
	const [loading, setLoading] = useState(true);
	const [clockingIn, setClockingIn] = useState(false);
	const [clockingOut, setClockingOut] = useState(false);
	const [processingAction, setProcessingAction] = useState(false);
	const [elapsedTime, setElapsedTime] = useState<string>("00:00:00");
	const [userJobs, setUserJobs] = useState<Job[]>([]);
	const [loadingJobs, setLoadingJobs] = useState(false);
	const [showCoefficientDialog, setShowCoefficientDialog] = useState(false);
	const [pendingAction, setPendingAction] = useState<ActionType | null>(null);
	const [dialogTitle, setDialogTitle] = useState("");
	const [initialCoefficient, setInitialCoefficient] = useState(1.0);
	const [dialogActionType, setDialogActionType] = useState<
		"shift" | "overtime"
	>("shift");
	const { colorScheme } = useColorScheme();
	const isDark = colorScheme === "dark";
	const { userProfile } = useSupabase();
	const router = useRouter();

	// Function to fetch the current active shift
	const fetchCurrentShift = useCallback(async () => {
		if (!userProfile) return;

		try {
			setLoading(true);

			// Query for the most recent shift that doesn't have an end time
			const { data, error } = await supabase
				.from("time_blocks")
				.select("*, job:job_id(*)")
				.eq("worker_id", userProfile.id)
				.is("end_time", null)
				.order("start_time", { ascending: false })
				.limit(1)
				.single();

			if (error && error.code !== "PGRST116") {
				// PGRST116 is the error code for no rows returned
				console.error("Error fetching current shift:", error);
				return;
			}

			setCurrentShift(data || null);
		} catch (error) {
			console.error("Error:", error);
		} finally {
			setLoading(false);
		}
	}, [userProfile]);

	// Function to fetch jobs assigned to the current user
	const fetchUserJobs = useCallback(async () => {
		if (!userProfile) return;

		try {
			setLoadingJobs(true);

			// Get current date in YYYY-MM-DD format
			const now = new Date();
			now.setHours(0, 0, 0, 0);
			const todayStart = toLocalTimestamp(now);
			now.setHours(23, 59, 59, 999);
			const todayEnd = toLocalTimestamp(now);

			// Fetch jobs where this user is assigned
			const { data, error } = await supabase
				.from("jobs")
				.select(
					`
					*,
					project:projects(*),
					people_assignments:job_people_assignments!inner(
						*,
						user:users(*)
					)
				`,
				)
				.eq("job_people_assignments.user", userProfile.id)
				.gte("start_date", todayStart)
				.lte("end_date", todayEnd)
				.order("start_date", { ascending: true });

			if (error) {
				console.error("Error fetching jobs:", error);
				return;
			}

			setUserJobs(data || []);
		} catch (error) {
			console.error("Error fetching jobs:", error);
		} finally {
			setLoadingJobs(false);
		}
	}, [userProfile]);

	// Update elapsed time every second if there's an active shift
	useEffect(() => {
		if (!currentShift) {
			setElapsedTime("00:00:00");
			return;
		}

		const updateElapsedTime = () => {
			const startTime = new Date(currentShift.start_time);
			const now = new Date();
			const diffInSeconds = Math.floor(
				(now.getTime() - startTime.getTime()) / 1000,
			);

			const hours = Math.floor(diffInSeconds / 3600);
			const minutes = Math.floor((diffInSeconds % 3600) / 60);
			const seconds = diffInSeconds % 60;

			setElapsedTime(
				`${hours.toString().padStart(2, "0")}:${minutes
					.toString()
					.padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`,
			);
		};

		// Update immediately
		updateElapsedTime();

		// Then update every second
		const intervalId = setInterval(updateElapsedTime, 1000);

		return () => clearInterval(intervalId);
	}, [currentShift]);

	// Load current shift and jobs when component mounts
	useEffect(() => {
		fetchCurrentShift();
		fetchUserJobs();
	}, [fetchCurrentShift, fetchUserJobs]);

	// Function to show coefficient dialog before clocking in
	const handleClockIn = () => {
		if (!userProfile) return;

		// Show coefficient dialog for new shift
		setDialogTitle("Start New Shift");
		setInitialCoefficient(1.0);
		setDialogActionType("shift");
		setPendingAction(null); // Not an action type but we use null to indicate it's a new shift
		setShowCoefficientDialog(true);
	};

	// Function to actually clock in with the selected coefficient
	const performClockIn = async (coefficient: number) => {
		if (!userProfile) return;

		try {
			setClockingIn(true);

			// Create a new shift record
			const { data, error } = await supabase
				.from("time_blocks")
				.insert({
					worker_id: userProfile.id,
					category: "shift",
					type: "regular",
					coefficient: coefficient,
					start_time: toLocalTimestamp(new Date()),
					end_time: null,
					notes: "",
				})
				.select()
				.single();

			if (error) {
				console.error("Error clocking in:", error);
				return;
			}

			setCurrentShift(data);
		} catch (error) {
			console.error("Error:", error);
		} finally {
			setClockingIn(false);
		}
	};

	// Function to show confirmation alert before taking an action
	const confirmAction = (actionType: ActionType, callback: () => void) => {
		let title = "";
		let message = "";

		switch (actionType) {
			case "break":
				title = "Start Break";
				message =
					"Are you sure you want to start a break? This will end your current shift.";
				break;
			case "endbreak":
				title = "End Break";
				message =
					"Are you sure you want to end your break? This will start a new shift.";
				break;
			case "overtime":
				title = "Start Overtime";
				message =
					"Are you sure you want to start overtime? This will end your current shift.";
				break;
			case "job":
				title = "Start Job Shift";
				message =
					"Are you sure you want to start a job shift? This will end your current shift.";
				break;
			case "clockout":
				title = "Clock Out";
				message =
					"Are you sure you want to clock out? This will end your current shift.";
				break;
			case "completejob":
				title = "Complete Job";
				message =
					"Are you sure you want to complete this job? This will end your current job shift and start a new regular shift.";
				break;
		}

		Alert.alert(
			title,
			message,
			[
				{
					text: "Cancel",
					style: "cancel",
					onPress: () => setProcessingAction(false),
				},
				{
					text: "Yes",
					onPress: callback,
				},
			],
			{ cancelable: false },
		);
	};

	// Function to show coefficient dialog before performing an action
	const handleAction = (actionType: ActionType) => {
		if (!currentShift || !userProfile) return;

		// For overtime, show coefficient dialog
		if (actionType === "overtime") {
			setDialogTitle("Start Overtime");
			setInitialCoefficient(1.5);
			setDialogActionType("overtime");
			setPendingAction(actionType);
			setShowCoefficientDialog(true);
		} else {
			// For other actions, proceed with confirmation
			setProcessingAction(true);
			confirmAction(actionType, () => performAction(actionType, null));
		}
	};

	// Function to actually perform the action with the selected coefficient
	const performAction = async (
		actionType: ActionType,
		customCoefficient: number | null,
	) => {
		if (!currentShift || !userProfile) return;

		setProcessingAction(true);

		try {
			const now = toLocalTimestamp(new Date());

			// First, end the current shift
			const endCurrentShift = await supabase
				.from("time_blocks")
				.update({
					end_time: now,
				})
				.eq("id", currentShift.id);

			if (endCurrentShift.error) {
				console.error("Error ending current shift:", endCurrentShift.error);
				return;
			}

			// Then start a new shift based on the action type
			switch (actionType) {
				case "break":
					// Start a break
					const breakResult = await supabase
						.from("time_blocks")
						.insert({
							worker_id: userProfile.id,
							category: "break", // Maintain the same type
							coefficient: 0, // Set break coefficient
							status: "approved",
							start_time: now,
							end_time: null,
						})
						.select()
						.single();

					if (breakResult.error) {
						console.error("Error starting break:", breakResult.error);
						return;
					}

					setCurrentShift(breakResult.data);
					break;

				case "endbreak":
					// End the current break and start a new shift
					const now2 = toLocalTimestamp(new Date());
					const endBreak = await supabase
						.from("time_blocks")
						.update({ end_time: now2 })
						.eq("id", currentShift.id);
					if (endBreak.error) {
						console.error("Error ending break:", endBreak.error);
						return;
					}
					// Start a new shift
					const newShift = await supabase
						.from("time_blocks")
						.insert({
							worker_id: userProfile.id,
							category: "shift",
							type: "regular",
							coefficient: 1,
							start_time: now2,
							end_time: null,
						})
						.select()
						.single();
					if (newShift.error) {
						console.error(
							"Error starting new shift after break:",
							newShift.error,
						);
						return;
					}
					setCurrentShift(newShift.data);
					break;

				case "overtime":
					// Start a new shift with overtime coefficient
					const overtimeResult = await supabase
						.from("time_blocks")
						.insert({
							worker_id: userProfile.id,
							category: "overtime", // Maintain the same type
							type: currentShift.type,
							job_id: currentShift.job_id,
							coefficient: customCoefficient || 1.5, // Use custom coefficient if provided
							start_time: now,
							end_time: null,
							notes: "",
						})
						.select()
						.single();

					if (overtimeResult.error) {
						console.error(
							"Error starting overtime shift:",
							overtimeResult.error,
						);
						return;
					}

					setCurrentShift(overtimeResult.data);
					break;

				case "clockout":
					// Just end the current shift without starting a new one
					setCurrentShift(null);
					break;

				case "completejob": {
					// Complete job: end current shift, start new regular shift, update job status
					const endCurrentShift = await supabase
						.from("time_blocks")
						.update({ end_time: now })
						.eq("id", currentShift.id);

					if (endCurrentShift.error) {
						console.error("Error ending current shift:", endCurrentShift.error);
						return;
					}

					// Update job status to completed if job_id is present
					if (currentShift.job_id) {
						await supabase
							.from("jobs")
							.update({ status: "completed" })
							.eq("id", currentShift.job_id);
					}

					// Start new regular shift
					const { data: newShift, error: startError } = await supabase
						.from("time_blocks")
						.insert({
							worker_id: userProfile.id,
							category: "shift",
							type: "regular",
							coefficient: 1, // Default coefficient for new shift after job completion
							start_time: now,
							end_time: null,
							notes: "",
						})
						.select()
						.single();

					if (startError) {
						console.error("Error starting new shift:", startError);
						return;
					}

					setCurrentShift(newShift);
					break;
				}
			}
		} catch (error) {
			console.error("Error processing action:", error);
			// If there was an error, refresh the current shift to ensure UI is in sync
			await fetchCurrentShift();
		} finally {
			setProcessingAction(false);
			setClockingOut(false);
		}
	};

	// Pull fresh data every time the screen is focused
	useFocusEffect(
		useCallback(() => {
			fetchCurrentShift();
			fetchUserJobs();
		}, [fetchCurrentShift, fetchUserJobs]),
	);

	// Format the start time for display
	const formatStartTime = (startTime: string) => {
		const date = new Date(startTime);
		return format(date, "EEEE, MMMM d, yyyy 'at' h:mm a");
	};

	return (
		<SafeAreaView className="flex-1 bg-background" edges={["top"]}>
			<View className="flex-1 flex-col justify-between">
				<View className="px-4 pt-4 pb-2 border-b border-border">
					<View className="flex-row justify-between items-center">
						<Text className="text-lg font-bold text-center">
							{format(new Date(), "EEEE, MMMM d, yyyy")}
						</Text>
						<TouchableOpacity
							onPress={() => router.push("/timesheet/month")}
							className="p-2"
						>
							<Ionicons
								name="calendar"
								size={24}
								color={isDark ? "#fff" : "#000"}
							/>
						</TouchableOpacity>
					</View>
				</View>
				{/* Current Shift Card */}
				<View className="p-2 pb-0">
					<CurrentShiftCard
						loading={loading}
						currentShift={currentShift}
						elapsedTime={elapsedTime}
						isDark={isDark}
						formatStartTime={formatStartTime}
					/>
				</View>
				<View className="flex-1 mb-4 p-2">
					<JobsList
						loadingJobs={loadingJobs}
						userJobs={userJobs}
						isDark={isDark}
						refreshing={loadingJobs}
						onRefresh={fetchUserJobs}
						currentShiftJobId={currentShift?.job_id ?? null}
					/>
				</View>

				<View className="p-2 border-t border-border">
					<TimesheetActions
						loading={loading}
						currentShift={currentShift}
						clockingIn={clockingIn}
						clockingOut={clockingOut}
						processingAction={processingAction}
						handleClockIn={handleClockIn}
						handleAction={handleAction}
						isDark={isDark}
					/>
				</View>
			</View>

			{/* Coefficient Input Dialog */}
			<CoefficientInputDialog
				visible={showCoefficientDialog}
				onClose={() => setShowCoefficientDialog(false)}
				onSave={(coefficient) => {
					setShowCoefficientDialog(false);
					if (pendingAction === null) {
						// This is a new shift (clock in)
						performClockIn(coefficient);
					} else {
						// This is an action (overtime)
						confirmAction(pendingAction, () =>
							performAction(pendingAction, coefficient),
						);
					}
				}}
				title={dialogTitle}
				initialCoefficient={initialCoefficient}
				actionType={dialogActionType}
			/>
		</SafeAreaView>
	);
}
