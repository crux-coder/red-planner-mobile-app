import React, { useCallback, useEffect, useState } from "react";
import {
	ActivityIndicator,
	ScrollView,
	TouchableOpacity,
	Modal,
	Platform,
	ActionSheetIOS,
	View,
	Text,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useColorScheme } from "nativewind";
import { supabase } from "@/config/supabase";
import { useSupabase } from "@/context/supabase-provider";
import DateTimePicker from "@react-native-community/datetimepicker";
import {
	format,
	parseISO,
	startOfMonth,
	endOfMonth,
	startOfWeek,
	endOfWeek,
	addWeeks,
	subWeeks,
	eachDayOfInterval,
	isSameDay,
	isSameMonth,
	getYear,
	setMonth,
	setYear,
} from "date-fns";
import { useRouter } from "expo-router";
import { TimeBlockEditDialog } from "../../../components/timesheet/TimeBlockEditDialog";
import { toLocalTimestamp } from "@/lib/utils";

// Define the TimeBlock interface
export interface TimeBlock {
	id: string;
	worker_id: string;
	job_id?: string;
	start_time: string;
	end_time: string | null;
	category: "shift" | "overtime" | "break";
	type: "regular" | "job";
	status: "pending" | "approved" | "rejected";
	coefficient: number;
	notes: string | null;
	created_at: string;
	job?: {
		id: string;
		job_number: string;
	};
	rejection_reason: string | null;
	reviewed_by_id: string | null;
	reviewed_at: string | null;
}

// Group timeblocks by date
interface GroupedTimeBlocks {
	[date: string]: TimeBlock[];
}

export default function MonthlyTimesheet() {
	const router = useRouter();
	const { colorScheme } = useColorScheme();
	const isDark = colorScheme === "dark";
	const { userProfile } = useSupabase();

	const [loading, setLoading] = useState(true);
	const [currentMonth, setCurrentMonth] = useState(new Date());
	const [currentWeek, setCurrentWeek] = useState(
		startOfWeek(new Date(), { weekStartsOn: 1 }),
	);
	const [selectedDate, setSelectedDate] = useState(new Date());
	const [groupedTimeBlocks, setGroupedTimeBlocks] = useState<GroupedTimeBlocks>(
		{},
	);
	const [editDialogVisible, setEditDialogVisible] = useState(false);
	const [editingTimeBlock, setEditingTimeBlock] = useState<TimeBlock | null>(
		null,
	);

	// Fetch timeblocks for the current month
	const fetchTimeBlocksForMonth = useCallback(async () => {
		if (!userProfile) return;

		try {
			setLoading(true);

			const firstDay = startOfMonth(currentMonth);
			const lastDay = endOfMonth(currentMonth);

			const { data, error } = await supabase
				.from("time_blocks")
				.select("*, job:job_id(*)")
				.eq("worker_id", userProfile.id)
				.gte("start_time", toLocalTimestamp(firstDay))
				.lte("start_time", toLocalTimestamp(lastDay))
				.order("start_time", { ascending: true });

			if (error) {
				console.error("Error fetching timeblocks:", error);
				return;
			}

			// Group timeblocks by date
			const grouped: GroupedTimeBlocks = {};
			let totalHoursWorked = 0;
			let totalEarned = 0;

			(data || []).forEach((block: TimeBlock) => {
				const date = format(parseISO(block.start_time), "yyyy-MM-dd");

				if (!grouped[date]) {
					grouped[date] = [];
				}

				grouped[date].push(block);

				// Calculate hours and earnings
				if (block.end_time && block.category !== "break") {
					const startTime = new Date(block.start_time);
					const endTime = new Date(block.end_time);
					const hoursWorked =
						(endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);

					totalHoursWorked += hoursWorked;
					totalEarned += hoursWorked * block.coefficient;
				}
			});

			setGroupedTimeBlocks(grouped);

			// Always prioritize the current date if it's in the current month
			// If not, then check for days with timeblocks
			const today = new Date();
			if (isSameMonth(today, currentMonth)) {
				// Always select today if we're viewing the current month
				setSelectedDate(today);
			} else if (Object.keys(grouped).length > 0) {
				// If we're viewing a different month, select the first day with timeblocks
				setSelectedDate(parseISO(Object.keys(grouped)[0]));
			}
		} catch (error) {
			console.error("Error:", error);
		} finally {
			setLoading(false);
		}
	}, [userProfile, currentMonth]);

	// Initial fetch
	useEffect(() => {
		fetchTimeBlocksForMonth();
	}, [fetchTimeBlocksForMonth]);

	// Update current week when selected date changes
	useEffect(() => {
		setCurrentWeek(startOfWeek(selectedDate, { weekStartsOn: 1 }));
	}, [selectedDate]);

	// Update selected date when current week changes
	useEffect(() => {
		// If the selected date is not in the current week, select the first day of the week
		const daysOfWeek = getDaysOfWeek();
		if (!daysOfWeek.some((day) => isSameDay(day, selectedDate))) {
			setSelectedDate(currentWeek);
		}
	}, [currentWeek]);

	// Month selection
	const [showMonthPicker, setShowMonthPicker] = useState(false);

	// Handle month selection
	const handleMonthChange = (month: number) => {
		setCurrentMonth((prev) => setMonth(prev, month));
	};

	// Handle year selection
	const handleYearChange = (year: number) => {
		setCurrentMonth((prev) => setYear(prev, year));
	};

	// Show month/year picker options
	const showMonthYearPicker = () => {
		if (Platform.OS === "ios") {
			// For iOS, use ActionSheet to choose between month or year selection
			ActionSheetIOS.showActionSheetWithOptions(
				{
					options: ["Select Month", "Select Year", "Cancel"],
					cancelButtonIndex: 2,
					title: "Choose Option",
				},
				(buttonIndex: number) => {
					if (buttonIndex === 0) {
						showMonthSelector();
					} else if (buttonIndex === 1) {
						showYearSelector();
					}
				},
			);
		} else {
			// For Android, toggle the picker visibility
			setShowMonthPicker(true);
		}
	};

	// Show month selector
	const showMonthSelector = () => {
		const months = [
			"January",
			"February",
			"March",
			"April",
			"May",
			"June",
			"July",
			"August",
			"September",
			"October",
			"November",
			"December",
		];
		ActionSheetIOS.showActionSheetWithOptions(
			{
				options: [...months, "Cancel"],
				cancelButtonIndex: 12,
				title: "Select Month",
			},
			(buttonIndex: number) => {
				if (buttonIndex !== 12) {
					handleMonthChange(buttonIndex);
				}
			},
		);
	};

	// Show year selector
	const showYearSelector = () => {
		const currentYear = getYear(new Date());
		const years = Array.from({ length: 10 }, (_, i) => currentYear - 5 + i);
		ActionSheetIOS.showActionSheetWithOptions(
			{
				options: [...years.map((y) => y.toString()), "Cancel"],
				cancelButtonIndex: 10,
				title: "Select Year",
			},
			(buttonIndex: number) => {
				if (buttonIndex !== 10) {
					handleYearChange(years[buttonIndex]);
				}
			},
		);
	};

	// Navigate to previous week
	const goToPreviousWeek = () => {
		setCurrentWeek((prev) => subWeeks(prev, 1));
	};

	// Navigate to next week
	const goToNextWeek = () => {
		setCurrentWeek((prev) => addWeeks(prev, 1));
	};

	// Get days of current week
	const getDaysOfWeek = () => {
		const start = currentWeek;
		const end = endOfWeek(currentWeek, { weekStartsOn: 1 });
		return eachDayOfInterval({ start, end });
	};

	// Select a date to view timeblocks
	const handleSelectDate = (date: Date) => {
		setSelectedDate(date);
	};

	// Format time duration
	const formatDuration = (startTime: string, endTime: string | null) => {
		if (!endTime) return "Ongoing";

		const start = new Date(startTime);
		const end = new Date(endTime);
		const durationMs = end.getTime() - start.getTime();
		const hours = Math.floor(durationMs / (1000 * 60 * 60));
		const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));

		return `${hours}h ${minutes}m`;
	};

	// Format time for display
	const formatTime = (timeString: string) => {
		return format(new Date(timeString), "h:mm a");
	};

	// Handle editing a timeblock
	const handleEditTimeBlock = (timeBlock: TimeBlock) => {
		setEditingTimeBlock(timeBlock);
		setEditDialogVisible(true);
	};

	// Save edited timeblock
	const handleSaveTimeBlock = async (
		start: Date,
		end: Date | null,
		coefficient: number,
		category: string,
	) => {
		if (!editingTimeBlock) return;

		try {
			await supabase
				.from("time_blocks")
				.update({
					start_time: toLocalTimestamp(start),
					end_time: end ? toLocalTimestamp(end) : null,
					coefficient,
					category: category as "shift" | "overtime" | "break",
				})
				.eq("id", editingTimeBlock.id);

			setEditDialogVisible(false);
			setEditingTimeBlock(null);
			await fetchTimeBlocksForMonth();
		} catch (error) {
			console.error("Error updating timeblock:", error);
		}
	};

	// Get category color
	const getCategoryColor = (timeblock: TimeBlock) => {
		if (timeblock.category === "shift" && timeblock.type === "job") {
			return isDark ? "#22c55e" : "#16a34a";
		}
		switch (timeblock.category) {
			case "shift":
				return isDark ? "#3b82f6" : "#2563eb";
			case "overtime":
				return isDark ? "#f59e0b" : "#d97706";
			case "break":
				return isDark ? "#6b7280" : "#4b5563";
			default:
				return isDark ? "#6b7280" : "#4b5563";
		}
	};

	// Get category label
	const getCategoryLabel = (category: string) => {
		switch (category) {
			case "shift":
				return "Shift";
			case "overtime":
				return "Overtime";
			case "break":
				return "Break";
			default:
				return "Unknown";
		}
	};

	// Get status label
	const getStatusLabel = (status: string) => {
		switch (status) {
			case "pending":
				return "Pending";
			case "approved":
				return "Approved";
			case "rejected":
				return "Rejected";
			default:
				return "Pending";
		}
	};

	// Get status color
	const getStatusColor = (status: string) => {
		switch (status) {
			case "pending":
				return isDark ? "#f59e0b" : "#d97706"; // Amber
			case "approved":
				return isDark ? "#22c55e" : "#16a34a"; // Green
			case "rejected":
				return isDark ? "#ef4444" : "#dc2626"; // Red
			default:
				return isDark ? "#f59e0b" : "#d97706"; // Default to Amber
		}
	};

	return (
		<SafeAreaView className="flex-1 bg-background" edges={["top"]}>
			{/* Header with back button */}
			<View className="flex-row justify-between items-center border-b border-border bg-card z-20">
				<Ionicons
					name="chevron-back"
					size={28}
					color={isDark ? "#fff" : "#222"}
					onPress={() => router.back()}
					style={{ marginRight: 8 }}
				/>
				<View className="flex-1 items-center">
					{/* Month and year selection in header */}
					<View className="flex-row justify-center items-center py-2 bg-card">
						<TouchableOpacity
							onPress={showMonthYearPicker}
							className="flex-row items-center justify-center px-4 py-2"
						>
							<Text className="text-base text-white font-medium mr-2">
								{format(currentMonth, "MMMM yyyy")}
							</Text>
							<Ionicons
								name="caret-down"
								size={16}
								color={isDark ? "#fff" : "#222"}
							/>
						</TouchableOpacity>
					</View>

					{/* Month Picker for Android */}
					{showMonthPicker && (
						<DateTimePicker
							value={currentMonth}
							mode="date"
							display="calendar"
							onChange={(event: any, selectedDate?: Date) => {
								setShowMonthPicker(false);
								if (selectedDate) {
									setCurrentMonth(selectedDate);
								}
							}}
						/>
					)}
				</View>
			</View>

			{/* Days of week */}
			<View className="flex-row justify-between items-center px-2 py-3 bg-card border-b border-border">
				<TouchableOpacity onPress={goToPreviousWeek} style={{ padding: 8 }}>
					<Ionicons
						name="chevron-back"
						size={24}
						color={isDark ? "#fff" : "#222"}
					/>
				</TouchableOpacity>
				{getDaysOfWeek().map((day) => {
					const isSelected = isSameDay(day, selectedDate);
					const isCurrentMonth = isSameMonth(day, currentMonth);
					return (
						<TouchableOpacity
							key={day.toISOString()}
							onPress={() => handleSelectDate(day)}
							className={`items-center p-2 rounded-lg ${isSelected ? "border border-primary" : ""} ${!isCurrentMonth ? "opacity-50" : ""}`}
						>
							<Text
								className={`text-xs ${isSelected ? "text-white" : "text-gray-400"}`}
							>
								{format(day, "EEE")}
							</Text>
							<Text
								className={`text-base font-medium ${isSelected ? "text-white" : "text-gray-400"}`}
							>
								{format(day, "d")}
							</Text>
						</TouchableOpacity>
					);
				})}
				<TouchableOpacity onPress={goToNextWeek} style={{ padding: 8 }}>
					<Ionicons
						name="chevron-forward"
						size={24}
						color={isDark ? "#fff" : "#222"}
					/>
				</TouchableOpacity>
			</View>

			{/* Selected date header */}
			<View className="bg-card px-4 py-3 border-b border-border">
				<View className="flex-row justify-between items-center">
					<Text className="text-base font-semibold dark:text-white">
						{format(selectedDate, "EEEE, MMMM d, yyyy")}
					</Text>
				</View>
			</View>

			{/* Timeblocks list */}
			{loading ? (
				<View className="flex-1 justify-center items-center">
					<ActivityIndicator
						size="large"
						color={isDark ? "#3b82f6" : "#2563eb"}
					/>
				</View>
			) : (
				<ScrollView className="flex-1">
					{Object.keys(groupedTimeBlocks).length === 0 ? (
						<View className="p-8 items-center justify-center">
							<Text className="text-center dark:text-white">
								No timesheet entries found for this month.
							</Text>
						</View>
					) : (
						<View>
							{/* Show timeblocks for selected date */}
							{(() => {
								const dateKey = format(selectedDate, "yyyy-MM-dd");
								const blocks = groupedTimeBlocks[dateKey] || [];

								if (blocks.length === 0) {
									return (
										<View className="p-8 items-center justify-center">
											<Text className="text-center dark:text-white">
												No timesheet entries found for this date.
											</Text>
										</View>
									);
								}

								return blocks.map((block) => (
									<TouchableOpacity
										key={block.id}
										onPress={() => handleEditTimeBlock(block)}
										className="flex-row items-center p-4 border-b border-border"
									>
										<View
											style={{
												width: 12,
												height: "100%",
												borderRadius: 4,
												backgroundColor: getCategoryColor(block),
												marginRight: 12,
											}}
										/>
										<View style={{ flex: 1 }}>
											<View className="flex-row justify-between items-center">
												<View className="flex-row w-full items-center justify-between">
													<Text className="font-medium dark:text-white">
														{getCategoryLabel(block.category)}
														{block.job ? ` - ${block.job.job_number}` : ""}
													</Text>
													<View
														style={{
															backgroundColor: getStatusColor(
																block.status || "pending",
															),
															paddingHorizontal: 8,
															paddingVertical: 2,
															borderRadius: 12,
															marginLeft: 8,
														}}
													>
														<Text
															style={{
																color: "white",
																fontSize: 10,
																fontWeight: "500",
															}}
														>
															{getStatusLabel(block.status || "pending")}
														</Text>
													</View>
												</View>
											</View>
											<View className="flex-row justify-between mt-1 items-center">
												<Text className="text-sm dark:text-white">
													{formatTime(block.start_time)} -{" "}
													{block.end_time
														? formatTime(block.end_time)
														: "Ongoing"}
												</Text>
												<View className="flex-row items-center">
													<Text className="text-sm dark:text-white mr-3">
														{formatDuration(block.start_time, block.end_time)}
													</Text>
													<Text className="text-sm dark:text-white">
														x{block.coefficient}
													</Text>
												</View>
											</View>
										</View>
									</TouchableOpacity>
								));
							})()}
						</View>
					)}
				</ScrollView>
			)}

			{/* Edit dialog */}
			{editingTimeBlock && (
				<TimeBlockEditDialog
					visible={editDialogVisible}
					onClose={() => {
						setEditDialogVisible(false);
						setEditingTimeBlock(null);
					}}
					onSave={handleSaveTimeBlock}
					initialStart={editingTimeBlock.start_time}
					initialEnd={editingTimeBlock.end_time}
					category={editingTimeBlock.category}
					initialCoefficient={editingTimeBlock.coefficient}
					initialNotes={editingTimeBlock.notes || ""}
					rejectionReason={editingTimeBlock.rejection_reason || null}
					reviewedById={editingTimeBlock.reviewed_by_id || null}
					reviewedAt={editingTimeBlock.reviewed_at || null}
				/>
			)}
		</SafeAreaView>
	);
}
