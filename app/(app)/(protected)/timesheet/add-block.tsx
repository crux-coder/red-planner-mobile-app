import React, { useState, useEffect } from "react";
import {
	View,
	Text,
	ScrollView,
	TouchableOpacity,
	Alert,
	Platform,
	TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useColorScheme } from "nativewind";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { format } from "date-fns";
import { router, useLocalSearchParams } from "expo-router";
import { supabase } from "@/config/supabase";
import { useSupabase } from "@/context/supabase-provider";
import { toLocalTimestamp } from "@/lib/utils";
import { useTimeBlockActions } from "@/app/hooks/useTimeBlockActions";

export default function TimeBlockSheet() {
	const { colorScheme } = useColorScheme();
	const isDark = colorScheme === "dark";
	const { userProfile } = useSupabase();
	const params = useLocalSearchParams();
	const timeBlockId = params.id as string;
	const { editTimeBlock, isEditingTimeBlock } = useTimeBlockActions();

	// State for form fields
	const [startDate, setStartDate] = useState(new Date());
	const [endDate, setEndDate] = useState(new Date());
	const [category, setCategory] = useState("shift"); // Default to shift
	const [coefficient, setCoefficient] = useState(1); // Default to regular rate
	const [isEditingCoefficient, setIsEditingCoefficient] = useState(false);
	const [coefficientText, setCoefficientText] = useState("1.00");
	const [notes, setNotes] = useState("");
	const [loading, setLoading] = useState(false);
	const [isEditing, setIsEditing] = useState(false);
	const [rejectionReason, setRejectionReason] = useState<string | null>(null);
	const [reviewedAt, setReviewedAt] = useState<string | null>(null);
	const [reviewer, setReviewer] = useState<any>(null);

	// Fetch time block data if editing
	useEffect(() => {
		const fetchTimeBlock = async () => {
			if (!timeBlockId) return;

			try {
				setLoading(true);
				setIsEditing(true);

				const { data: timeBlockData, error } = await supabase
					.from("time_blocks")
					.select("*")
					.eq("id", timeBlockId)
					.single();
				console.log(timeBlockData);
				if (error) {
					console.error("Error fetching time block:", error);
					Alert.alert("Error", "Failed to load time block data");
					router.back();
					return;
				}

				// Update form fields with time block data
				setStartDate(new Date(timeBlockData.start_time));
				if (timeBlockData.end_time) {
					setEndDate(new Date(timeBlockData.end_time));
				}
				setCategory(timeBlockData.category || "shift");
				setCoefficient(timeBlockData.coefficient || 1);
				setCoefficientText((timeBlockData.coefficient || 1).toFixed(2));
				setNotes(timeBlockData.notes || "");
				setRejectionReason(timeBlockData.rejection_reason || null);
				setReviewedAt(timeBlockData.reviewed_at || null);

				// Fetch reviewer information if available
				if (timeBlockData.reviewed_by_id) {
					const { data: reviewerData, error: reviewerError } = await supabase
						.from("users")
						.select("first_name, last_name")
						.eq("id", timeBlockData.reviewed_by_id)
						.single();

					if (!reviewerError) {
						setReviewer(reviewerData);
					}
				}
			} catch (error) {
				console.error("Error:", error);
				Alert.alert("Error", "An unexpected error occurred");
			} finally {
				setLoading(false);
			}
		};

		fetchTimeBlock();
	}, [timeBlockId]);

	// Handle category selection
	const handleCategoryChange = (newCategory: string) => {
		setCategory(newCategory);
	};

	const handleCoefficientTextChange = (text: string) => {
		setCoefficientText(text);
		const value = parseFloat(text);
		if (!isNaN(value)) {
			setCoefficient(Math.min(10, Math.max(0, value)));
		}
	};

	// Handle date/time changes
	const handleStartDateChange = (event: any, selectedDate?: Date) => {
		if (Platform.OS === "android" && event.type === "dismissed") {
			return;
		}

		if (selectedDate) {
			setStartDate(selectedDate);
		}
	};

	const handleStartTimeChange = (event: any, selectedTime?: Date) => {
		if (Platform.OS === "android" && event.type === "dismissed") {
			return;
		}

		if (selectedTime) {
			// Preserve the date part but update the time part
			const newDate = new Date(startDate);
			newDate.setHours(selectedTime.getHours());
			newDate.setMinutes(selectedTime.getMinutes());
			setStartDate(newDate);
		}
	};

	const handleEndDateChange = (event: any, selectedDate?: Date) => {
		if (Platform.OS === "android" && event.type === "dismissed") {
			return;
		}

		if (selectedDate) {
			setEndDate(selectedDate);
		}
	};

	const handleEndTimeChange = (event: any, selectedTime?: Date) => {
		if (Platform.OS === "android" && event.type === "dismissed") {
			return;
		}

		if (selectedTime) {
			// Preserve the date part but update the time part
			const newDate = new Date(endDate);
			newDate.setHours(selectedTime.getHours());
			newDate.setMinutes(selectedTime.getMinutes());
			setEndDate(newDate);
		}
	};

	// Save timeblock to database
	const handleSave = async () => {
		if (!userProfile) {
			Alert.alert("Error", "You must be logged in to add timeblocks");
			return;
		}

		// Validate inputs
		if (endDate < startDate) {
			Alert.alert("Error", "End time cannot be before start time");
			return;
		}

		try {
			if (isEditing && timeBlockId) {
				// Update existing time block using cloud function
				await editTimeBlock(
					timeBlockId,
					startDate,
					endDate,
					coefficient,
					category,
					notes
				);
				// Success - go back to timesheet (hook handles query invalidation)
				router.back();
			} else {
				// Create new time block (still using direct Supabase call)
				setLoading(true);
				const { data: newTimeBlock, error } = await supabase
					.from("time_blocks")
					.insert({
						worker_id: userProfile.id,
						start_time: toLocalTimestamp(startDate),
						end_time: toLocalTimestamp(endDate),
						category,
						coefficient,
						notes: notes || null,
						status: "pending", // Default status for new timeblocks
					})
					.select()
					.single();

				if (error) {
					console.error("Error saving timeblock:", error);
					Alert.alert("Error", "Failed to save timeblock. Please try again.");
					return;
				}
				setLoading(false);
				// Success - go back to timesheet
				router.back();
			}
		} catch (error) {
			// For editing, the hook handles error logging and display
			if (isEditing) {
				Alert.alert("Error", "Failed to update time block. Please try again.");
			} else {
				console.error("Error:", error);
				Alert.alert("Error", "An unexpected error occurred");
				setLoading(false);
			}
		}
	};

	// Get category color
	const getCategoryColor = (cat: string) => {
		switch (cat) {
			case "shift":
				return "#3b82f6"; // blue
			case "job":
				return "#10b981"; // green
			case "break":
				return "#f59e0b"; // amber
			default:
				return "#6b7280"; // gray
		}
	};



	return (
		<SafeAreaView className="flex-1 bg-white dark:bg-slate-900">
			{/* Header */}
			<View className="flex-row items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
				<TouchableOpacity onPress={() => router.back()} className="p-2">
					<Ionicons name="close" size={24} color={isDark ? "white" : "black"} />
				</TouchableOpacity>
				<Text className="text-lg font-semibold dark:text-white">
					Add Time Block
				</Text>
				<TouchableOpacity
					onPress={handleSave}
					disabled={loading || isEditingTimeBlock}
					className="p-2"
				>
					<Text className="text-blue-500 font-semibold">
						{(loading || isEditingTimeBlock) ? "Saving..." : "Save"}
					</Text>
				</TouchableOpacity>
			</View>

			<ScrollView className="flex-1 p-4">
				{/* Page Title */}
				<View className="mb-6">
					<Text className="text-2xl font-bold dark:text-white">
						{isEditing ? "Edit Time Block" : "Add Time Block"}
					</Text>
				</View>
				{/* Time Values Display Section */}

				{/* Date/Time Pickers at the top */}
				<View className="mb-6">
					<View className="mb-2">
						<Text className="text-base font-medium mb-2 dark:text-white">
							Start
						</Text>
						<View className="flex-row mb-2">
							<View className="flex-1 mr-2">
								<Text className="text-xs text-gray-500 dark:text-gray-400 mb-1">
									Date
								</Text>
								<DateTimePicker
									value={startDate}
									mode="date"
									display="compact"
									onChange={handleStartDateChange}
									style={{ width: "100%" }}
								/>
							</View>
							<View className="flex-1 ml-2">
								<Text className="text-xs text-gray-500 dark:text-gray-400 mb-1">
									Time
								</Text>
								<DateTimePicker
									value={startDate}
									mode="time"
									display="compact"
									onChange={handleStartTimeChange}
									style={{ width: "100%" }}
								/>
							</View>
						</View>
					</View>

					<View className="mb-2">
						<Text className="text-base font-medium mb-2 dark:text-white">
							End
						</Text>
						<View className="flex-row mb-2">
							<View className="flex-1 mr-2">
								<Text className="text-xs text-gray-500 dark:text-gray-400 mb-1">
									Date
								</Text>
								<DateTimePicker
									value={endDate}
									mode="date"
									display="compact"
									onChange={handleEndDateChange}
									style={{ width: "100%" }}
								/>
							</View>
							<View className="flex-1 ml-2">
								<Text className="text-xs text-gray-500 dark:text-gray-400 mb-1">
									Time
								</Text>
								<DateTimePicker
									value={endDate}
									mode="time"
									display="compact"
									onChange={handleEndTimeChange}
									style={{ width: "100%" }}
								/>
							</View>
						</View>
					</View>
				</View>

				{/* Category Section */}
				<View className="mb-6">
					<Text className="text-base font-medium mb-2 dark:text-white">
						Category
					</Text>
					<View className="flex-row justify-between">
						{["shift", "job", "break"].map((cat) => (
							<TouchableOpacity
								key={cat}
								onPress={() => handleCategoryChange(cat)}
								className={`flex-1 mx-1 py-2 rounded-full border items-center ${category === cat ? "border-blue-500" : "border-gray-300 dark:border-gray-700"}`}
								style={
									category === cat
										? { backgroundColor: getCategoryColor(cat) }
										: {}
								}
							>
								<Text
									className={`${category === cat ? "text-white" : "text-gray-700 dark:text-gray-300"}`}
									style={{ textTransform: "capitalize" }}
								>
									{cat}
								</Text>
							</TouchableOpacity>
						))}
					</View>
				</View>

				{/* Coefficient Section */}
				<View className="mb-6">
					<Text className="text-base font-medium mb-2 dark:text-white">
						Rate Multiplier
					</Text>
					<View className="flex-row items-center justify-between">
						<TouchableOpacity
							onPress={() => {
								// Round down to the nearest 0.1 decrement
								const currentValue = parseFloat(coefficient.toFixed(2));
								const decrementedValue = Math.floor(currentValue * 10 - 1) / 10;
								const newValue = Math.max(0, decrementedValue);
								setCoefficient(newValue);
								setCoefficientText(newValue.toFixed(2));
							}}
							className="p-4 rounded-lg bg-zinc-100 dark:bg-zinc-700"
						>
							<Text className="text-gray-800 dark:text-gray-200 font-medium">
								<Ionicons name="remove" size={24} />
							</Text>
						</TouchableOpacity>

						{isEditingCoefficient ? (
							<TextInput
								className="w-20 py-2 px-1 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-900 text-center text-zinc-900 dark:text-zinc-100"
								keyboardType="decimal-pad"
								value={coefficientText}
								onChangeText={handleCoefficientTextChange}
								onBlur={() => {
									setIsEditingCoefficient(false);
									// Format the coefficient to always show 2 decimal places
									setCoefficientText(coefficient.toFixed(2));
								}}
								autoFocus
							/>
						) : (
							<TouchableOpacity
								onPress={() => setIsEditingCoefficient(true)}
								className="w-20 py-2 px-1 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-900"
							>
								<Text className="text-zinc-900 dark:text-zinc-100 font-medium text-center">
									{coefficient.toFixed(2)}
								</Text>
							</TouchableOpacity>
						)}

						<TouchableOpacity
							onPress={() => {
								// Round up to the nearest 0.1 increment
								const currentValue = parseFloat(coefficient.toFixed(2));
								const incrementedValue = Math.ceil(currentValue * 10 + 1) / 10;
								const newValue = Math.min(10, incrementedValue);
								setCoefficient(newValue);
								setCoefficientText(newValue.toFixed(2));
							}}
							className="p-4 rounded-lg bg-zinc-100 dark:bg-zinc-700"
						>
							<Text className="text-gray-800 dark:text-gray-200 font-medium">
								<Ionicons name="add" size={24} />
							</Text>
						</TouchableOpacity>
					</View>
				</View>

				{/* Notes Section */}
				<View className="mb-6">
					<Text className="text-base font-medium mb-2 dark:text-white">
						Notes
					</Text>
					<View className="border border-gray-300 dark:border-gray-700 rounded-lg p-2 bg-white dark:bg-gray-800">
						<TextInput
							value={notes}
							onChangeText={setNotes}
							multiline
							numberOfLines={Platform.OS === "ios" ? undefined : 3}
							placeholder="Add any relevant notes here..."
							placeholderTextColor={isDark ? "#9ca3af" : "#9ca3af"}
							className="p-2 text-gray-800 dark:text-white"
							style={{
								textAlignVertical: "top",
								minHeight: Platform.OS === "ios" ? 80 : undefined,
							}}
						/>
					</View>
				</View>

				{/* Rejection information if available */}
				{rejectionReason && (
					<View className="mt-4 p-3 border border-red-300 dark:border-red-800 rounded-lg bg-red-50 dark:bg-red-900/20 mb-6">
						<Text className="text-red-700 dark:text-red-400 font-medium mb-1">
							Rejection Reason
						</Text>
						<Text className="text-red-600 dark:text-red-300 mb-2">
							{rejectionReason}
						</Text>
						{reviewer && reviewedAt && (
							<Text className="text-zinc-500 dark:text-zinc-400 text-sm">
								Reviewed by {reviewer.first_name} {reviewer.last_name} on{" "}
								{format(new Date(reviewedAt), "MMM d, yyyy h:mm a")}
							</Text>
						)}
					</View>
				)}

				{/* Action Buttons */}
				<View className="flex-row justify-end space-x-4 mt-4 mb-8">
					<TouchableOpacity
						onPress={() => router.back()}
						className="py-3 px-6 rounded-lg bg-zinc-100 dark:bg-zinc-800"
					>
						<Text className="text-zinc-900 dark:text-zinc-100 font-medium">
							Cancel
						</Text>
					</TouchableOpacity>
					<TouchableOpacity
						onPress={handleSave}
						disabled={loading || isEditingTimeBlock}
						className="py-3 px-6 rounded-lg bg-blue-500"
					>
						<Text className="text-white font-medium">
							{(loading || isEditingTimeBlock) ? "Saving..." : (isEditing ? "Update" : "Save")}
						</Text>
					</TouchableOpacity>
				</View>
			</ScrollView>

			{/* Date/Time Pickers are now at the top of the component */}
		</SafeAreaView>
	);
}
