import React, { useState, useEffect, useCallback } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { View, Alert, Button } from "react-native";
import { useAppState } from "@/context/app-state-provider";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text } from "@/components/ui/text";
import { CurrentShiftCard } from "@/app/components/timesheet/CurrentShiftCard";
import { JobsList } from "@/app/components/timesheet/JobsList";
import { TimesheetActions } from "@/app/components/timesheet/TimesheetActions";
import { CoefficientInputDialog } from "@/app/components/timesheet/CoefficientInputDialog";
import { TimeBlockEditDialog } from "@/app/components/timesheet/TimeBlockEditDialog";
import { useColorScheme } from "@/lib/useColorScheme";
import { useSupabase } from "@/context/supabase-provider";
import { format } from "date-fns";
import { supabase } from "@/config/supabase";
import { toLocalTimestamp } from "@/lib/utils";
import { Job, TimeBlock } from "@/app/models/types";
import { useTimeTracker, ActionType } from "@/app/hooks/useTimeTracker";

export default function TimeTracker() {
	const [currentShift, setCurrentShift] = useState<TimeBlock | null>(null);
	const [loading, setLoading] = useState(true);
	const [clockingIn, setClockingIn] = useState(false);
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
	// State for TimeBlockEditDialog
	const [showEditDialog, setShowEditDialog] = useState(false);
	const [shiftToEdit, setShiftToEdit] = useState<TimeBlock | null>(null);
	const { colorScheme } = useColorScheme();
	const isDark = colorScheme === "dark";
	const { userProfile } = useSupabase();

	// Function to fetch the current active shift
	const fetchCurrentShift = useCallback(async () => {
		console.log("Fetching current shift for user:", userProfile?.id);
		if (!userProfile) return;

		try {
			setLoading(true);
			console.log("Fetching current shift for user:", userProfile.id);
			// Query for the most recent shift that doesn't have an end time
			const { data, error } = await supabase
				.from("time_blocks")
				.select("*, job:job_id(*)")
				.eq("worker_id", userProfile.id)
				.is("end_time", null)
				.order("start_time", { ascending: false })
				.limit(1)
				.single();
			console.log("Current shift:", data);
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

	// Function to fetch jobs assigned to the current user for today
	const fetchUserJobs = useCallback(async () => {
		console.log("Fetching user jobs for user:", userProfile?.id);
		if (!userProfile) return;

		try {
			setLoadingJobs(true);
			console.log("Fetching user jobs for user:", userProfile.id);

			// Get current date in YYYY-MM-DD format
			const now = new Date();
			now.setHours(0, 0, 0, 0);
			const todayStart = toLocalTimestamp(now);
			now.setHours(23, 59, 59, 999);
			const todayEnd = toLocalTimestamp(now);

			// Query for jobs assigned to the user that are scheduled for today
			const { data, error } = await supabase
				.from("calendar_entries")
				.select(
					`
					*,
					job_project:projects(*),
					people_assignments:job_people_assignments!inner(
						id,
						user:user(
						id,
						first_name,
						last_name,
						photo
						)
					)
					`,
				)
				.eq("people_assignments.user", userProfile.id)
				.lte("start_date", todayEnd)
				.gte("end_date", todayStart)
				.order("start_date", { ascending: true });

			console.log("User jobs:", data);
			if (error) {
				console.error("Error fetching jobs:", error);
				return;
			}

			setUserJobs(data || []);
		} catch (error) {
			console.error("Error:", error);
		} finally {
			setLoadingJobs(false);
		}
	}, [userProfile]);

	// Update elapsed time every second
	useFocusEffect(
		useCallback(() => {
			let intervalId: ReturnType<typeof setInterval>;

			if (currentShift && currentShift.start_time) {
				intervalId = setInterval(() => {
					updateElapsedTime();
				}, 1000);
			}

			return () => {
				if (intervalId) {
					clearInterval(intervalId);
				}
			};
		}, [currentShift]),
	);

	// Function to update elapsed time
	const updateElapsedTime = () => {
		if (!currentShift || !currentShift.start_time) {
			setElapsedTime("00:00:00");
			return;
		}

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

	// Function to show coefficient dialog before clocking in
	const handleClockIn = () => {
		setDialogTitle("Set Shift Coefficient");
		setInitialCoefficient(1.0);
		setDialogActionType("shift");
		setPendingAction(null);
		setShowCoefficientDialog(true);
	};

	// Function to actually clock in with the selected coefficient
	const performClockIn = async (coefficient: number) => {
		if (!userProfile) return;

		try {
			setClockingIn(true);

			const now = toLocalTimestamp(new Date());

			const { data, error } = await supabase
				.from("time_blocks")
				.insert({
					worker_id: userProfile.id,
					category: "shift",
					type: "regular",
					coefficient: coefficient,
					start_time: now,
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
		let confirmText = "Confirm";

		switch (actionType) {
			case "break":
				title = "Take a Break";
				message =
					"This will end your current shift and start a break. You won't be on the clock during your break.";
				confirmText = "Start Break";
				break;
			case "endbreak":
				title = "End Break";
				message =
					"This will end your break and start a new shift. You'll be back on the clock.";
				confirmText = "End Break";
				break;
			case "overtime":
				title = "Request Overtime";
				message =
					"This will end your current shift and start a new overtime shift with a higher coefficient.";
				confirmText = "Start Overtime";
				break;
			case "job":
				title = "Start Job";
				message =
					"This will end your current shift and start a new job-specific shift.";
				confirmText = "Start Job";
				break;
			case "clockout":
				title = "Clock Out";
				message = "This will end your current shift. You'll be off the clock.";
				confirmText = "Clock Out";
				break;
			case "completejob":
				title = "Complete Job";
				message =
					"This will end your current job shift, mark the job as completed, and start a new regular shift.";
				confirmText = "Complete Job";
				break;
		}

		Alert.alert(title, message, [
			{
				text: "Cancel",
				style: "cancel",
			},
			{
				text: confirmText,
				onPress: callback,
			},
		]);
	};

	// Function to show coefficient dialog before performing an action
	const handleAction = (actionType: ActionType) => {
		if (actionType === "overtime") {
			setDialogTitle("Set Overtime Coefficient");
			setInitialCoefficient(1.5);
			setDialogActionType("overtime");
			setPendingAction(actionType);
			setShowCoefficientDialog(true);
		} else {
			confirmAction(actionType, () => performAction(actionType, null));
		}
	};

	// Function to actually perform the action with the selected coefficient
	// Import our custom hook
	// Initialize the timeTracker hook
	// We'll initialize the useTimeTracker hook after defining fetchCurrentShift

	// Now we can initialize our useTimeTracker hook
	const { performAction, processingAction, clockingOut } = useTimeTracker({
		userProfile,
		currentShift,
		onShiftChange: setCurrentShift,
		onFetchCurrentShift: fetchCurrentShift,
	});

	// Get app state for background/foreground transitions
	const { appState, lastActiveAt } = useAppState();

	// Pull fresh data every time the screen is focused
	useFocusEffect(
		useCallback(() => {
			fetchCurrentShift();
			fetchUserJobs();
		}, [fetchCurrentShift, fetchUserJobs]),
	);

	// Refresh data when app comes back from background
	useEffect(() => {
		if (appState === "active" && lastActiveAt) {
			fetchCurrentShift();
			fetchUserJobs();
		}
	}, [appState, lastActiveAt, fetchCurrentShift, fetchUserJobs]);

	// Format the start time for display
	const formatStartTime = (startTime: string) => {
		const date = new Date(startTime);
		return format(date, "EEEE, MMMM d, yyyy 'at' h:mm a");
	};

	// Handle opening the edit dialog for a shift
	const handleEditShift = (shift: TimeBlock) => {
		setShiftToEdit(shift);
		setShowEditDialog(true);
	};

	// Handle saving edited shift
	const handleSaveEditedShift = async (
		start: Date,
		end: Date | null,
		coefficient: number,
		category: string,
		notes?: string,
	) => {
		if (!shiftToEdit || !userProfile) return;

		try {
			// Update the time block in the database
			const { data, error } = await supabase
				.from("time_blocks")
				.update({
					start_time: toLocalTimestamp(start),
					end_time: end ? toLocalTimestamp(end) : null,
					coefficient: coefficient,
					category: category,
					notes: notes || "",
				})
				.eq("id", shiftToEdit.id)
				.select()
				.single();

			if (error) {
				console.error("Error updating time block:", error);
				Alert.alert("Error", "Failed to update time block");
				return;
			}

			// Update the current shift in state
			setCurrentShift(data);
			Alert.alert("Success", "Time block updated successfully");
		} catch (error) {
			console.error("Error:", error);
			Alert.alert("Error", "An unexpected error occurred");
		} finally {
			setShowEditDialog(false);
			setShiftToEdit(null);
		}
	};

	return (
		<SafeAreaView className="flex-1 bg-background" edges={["top"]}>
			<View className="flex-1 flex-col justify-between">
				<View className="px-4 pt-4 pb-2 border-b border-border">
					<View className="flex-row justify-between items-center">
						<Text className="text-lg font-bold text-center">
							{format(new Date(), "EEEE, MMMM d, yyyy")}
						</Text>
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
						onEdit={handleEditShift}
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

			{/* Time Block Edit Dialog */}
			{shiftToEdit && (
				<TimeBlockEditDialog
					visible={showEditDialog}
					onClose={() => {
						setShowEditDialog(false);
						setShiftToEdit(null);
					}}
					onSave={handleSaveEditedShift}
					initialStart={shiftToEdit.start_time}
					initialEnd={shiftToEdit.end_time}
					category={shiftToEdit.category}
					initialCoefficient={shiftToEdit.coefficient}
					initialNotes={shiftToEdit.notes || ""}
				/>
			)}
		</SafeAreaView>
	);
}
