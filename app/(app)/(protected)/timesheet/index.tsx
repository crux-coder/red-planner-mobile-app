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
	eachDayOfInterval,
	isSameDay,
	isSameMonth,
	getYear,
	setMonth,
	setYear,
} from "date-fns";
import { useRouter, useFocusEffect } from "expo-router";
import { TimeBlockEditDialog } from "@/app/components/timesheet/TimeBlockEditDialog";
import { toLocalTimestamp } from "@/lib/utils";
import { TimeBlock } from "@/app/models/types";

// Group timeblocks by date
interface GroupedTimeBlocks {
	[date: string]: TimeBlock[];
}

export default function MonthlyTimesheet() {
	const router = useRouter();
	const { colorScheme } = useColorScheme();
	const isDark = colorScheme === "dark";
	const { userProfile } = useSupabase();
	const scrollViewRef = React.useRef<ScrollView>(null);

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

			// Only set default selected date on initial load, not on month changes
			if (Object.keys(groupedTimeBlocks).length === 0) {
				// This is the initial load, so we can set default selections
				const today = new Date();

				if (isSameMonth(today, currentMonth)) {
					// Select today if we're viewing the current month
					setSelectedDate(today);
					setCurrentWeek(startOfWeek(today, { weekStartsOn: 1 }));
				} else if (Object.keys(grouped).length > 0) {
					// If we're viewing a different month, select the first day with timeblocks
					const firstDate = parseISO(Object.keys(grouped)[0]);
					setSelectedDate(firstDate);
					setCurrentWeek(startOfWeek(firstDate, { weekStartsOn: 1 }));
				}
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

	// Sync week view with selected date, but only when explicitly changing the date
	// This prevents the circular dependency that was causing the date to revert
	useEffect(() => {
		// We only want to update the current week when the selected date changes
		// due to user interaction, not due to other effects
		const newWeekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });

		// Only update if the week has actually changed
		if (!isSameDay(newWeekStart, currentWeek)) {
			setCurrentWeek(newWeekStart);
		}
	}, [selectedDate]);

	// Function to scroll to today's date
	const scrollToToday = useCallback(() => {
		if (scrollViewRef.current) {
			// Find index of today's date
			const today = new Date();
			const allDays = getDaysOfMonth();
			const todayIndex = allDays.findIndex((day) => isSameDay(day, today));

			if (todayIndex !== -1) {
				// Calculate offset - each item is approximately 60px wide (48px + margins)
				const itemWidth = 48;
				const offset = Math.max(0, todayIndex * itemWidth - 100); // Center it with some left padding

				setTimeout(() => {
					scrollViewRef.current?.scrollTo({
						x: offset,
						animated: true,
					});
				}, 300); // Small delay to ensure component is fully rendered
			}
		}
	}, [currentMonth]);

	// Use useFocusEffect to scroll to today when screen comes into focus
	useFocusEffect(
		useCallback(() => {
			scrollToToday();
		}, [scrollToToday]),
	);

	// Month selection
	const [showMonthPicker, setShowMonthPicker] = useState(false);

	// Handle month selection
	const handleMonthChange = (month: number) => {
		const newDate = setMonth(currentMonth, month);
		setCurrentMonth(newDate);
		// Update the week view to include the selected month
		setCurrentWeek(startOfWeek(newDate, { weekStartsOn: 1 }));
	};

	// Handle year selection
	const handleYearChange = (year: number) => {
		const newDate = setYear(currentMonth, year);
		setCurrentMonth(newDate);
		// Update the week view to include the selected year
		setCurrentWeek(startOfWeek(newDate, { weekStartsOn: 1 }));
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

	// Get all days of current month
	const getDaysOfMonth = () => {
		return eachDayOfInterval({
			start: startOfMonth(currentMonth),
			end: endOfMonth(currentMonth),
		});
	};

	// Select a date to view timeblocks
	const handleSelectDate = (date: Date) => {
		setSelectedDate(date);
		// If the selected date is not in the current month, update the current month
		if (!isSameMonth(date, currentMonth)) {
			setCurrentMonth(date);
		}
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
		return format(new Date(timeString), "HH:mm");
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
				<View className="flex-1 items-center">
					{/* Month and year selection in header */}
					<View className="flex-row justify-center items-center py-3 bg-card">
						<TouchableOpacity
							onPress={showMonthYearPicker}
							className="flex-row items-center justify-center px-4 py-2"
						>
							<Text className="text-base text-gray-900 dark:text-white font-medium mr-2">
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
									setSelectedDate(selectedDate);
									setCurrentWeek(
										startOfWeek(selectedDate, { weekStartsOn: 1 }),
									);
								}
							}}
						/>
					)}
				</View>
			</View>

			{/* All days of month (scrollable) */}
			<View className="bg-card border-b border-border">
				<ScrollView
					ref={scrollViewRef}
					horizontal
					showsHorizontalScrollIndicator={false}
					contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 8 }}
					style={{ height: 70 }} // Fixed height for the scrollview
				>
					{getDaysOfMonth().map((day: Date) => {
						const isSelected = isSameDay(day, selectedDate);
						const isToday = isSameDay(day, new Date());
						return (
							<TouchableOpacity
								key={day.toISOString()}
								onPress={() => handleSelectDate(day)}
								style={{
									alignItems: "center",
									paddingHorizontal: 8,
									paddingVertical: 4,
									marginHorizontal: 4,
									borderRadius: 8,
									borderWidth: isSelected || (isToday && !isSelected) ? 1 : 0,
									borderColor: isSelected ? "#3b82f6" : "#d1d5db",
									backgroundColor: isSelected
										? "rgba(59, 130, 246, 0.1)"
										: "transparent",
								}}
							>
								<Text
									className={`text-xs ${isSelected ? "text-primary dark:text-white" : "text-gray-500 dark:text-gray-400"}`}
								>
									{format(day, "EEE")}
								</Text>
								<Text
									className={`text-base font-medium ${isSelected ? "text-primary dark:text-white" : "text-gray-700 dark:text-gray-400"}`}
								>
									{format(day, "d")}
								</Text>
							</TouchableOpacity>
						);
					})}
				</ScrollView>
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
