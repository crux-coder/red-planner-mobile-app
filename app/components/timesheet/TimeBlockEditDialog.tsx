import React, { useState, useRef, useEffect } from "react";
import {
	View,
	Modal,
	Platform,
	TouchableOpacity,
	TextInput,
	Keyboard,
	ScrollView,
	ActionSheetIOS,
	KeyboardAvoidingView,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { Text } from "@/components/ui/text";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { supabase } from "@/config/supabase";
import { format } from "date-fns";

interface TimeBlockEditDialogProps {
	visible: boolean;
	onClose: () => void;
	onSave: (
		start: Date,
		end: Date | null,
		coefficient: number,
		category: string,
		notes?: string,
	) => void;
	initialStart: string;
	initialEnd: string | null;
	category: string;
	initialCoefficient: number;
	initialNotes?: string;
	rejectionReason?: string | null;
	reviewedById?: string | null;
	reviewedAt?: string | null;
}

import { useColorScheme } from "@/lib/useColorScheme";

export const TimeBlockEditDialog: React.FC<TimeBlockEditDialogProps> = ({
	visible,
	onClose,
	onSave,
	initialStart,
	initialEnd,
	category: initialCategory,
	initialCoefficient,
	initialNotes = "",
	rejectionReason = null,
	reviewedById = null,
	reviewedAt = null,
}) => {
	const [startDate, setStartDate] = useState<Date>(
		initialStart ? new Date(initialStart) : new Date(),
	);
	const [endDate, setEndDate] = useState<Date | null>(
		initialEnd ? new Date(initialEnd) : null,
	);
	const [showStartPicker, setShowStartPicker] = useState(false);
	const [showEndPicker, setShowEndPicker] = useState(false);
	const [coefficient, setCoefficient] = useState<number>(
		initialCoefficient || 1,
	);
	const [isEditingCoefficient, setIsEditingCoefficient] = useState(false);
	const [coefficientText, setCoefficientText] = useState(
		(initialCoefficient || 1).toFixed(2),
	);
	const [category, setCategory] = useState<string>(initialCategory || "shift");
	const [notes, setNotes] = useState<string>(initialNotes || "");
	const [reviewer, setReviewer] = useState<{
		first_name: string;
		last_name: string;
	} | null>(null);
	const [isLoadingReviewer, setIsLoadingReviewer] = useState(false);

	const { colorScheme } = useColorScheme();
	const [showPicker, setShowPicker] = useState(false);
	const isDark = colorScheme === "dark";

	// Sync state with props when opening dialog
	React.useEffect(() => {
		if (visible) {
			setStartDate(initialStart ? new Date(initialStart) : new Date());
			setEndDate(initialEnd ? new Date(initialEnd) : null);
			setCoefficient(initialCoefficient || 1);
			setCoefficientText((initialCoefficient || 1).toFixed(2));
			setCategory(initialCategory || "shift");
			setNotes(initialNotes || "");
		}
	}, [
		visible,
		initialStart,
		initialEnd,
		initialCoefficient,
		initialCategory,
		initialNotes,
	]);

	// Fetch reviewer information if there's a reviewedById
	useEffect(() => {
		const fetchReviewer = async () => {
			if (!reviewedById) {
				setReviewer(null);
				return;
			}

			try {
				setIsLoadingReviewer(true);
				const { data, error } = await supabase
					.from("users")
					.select("first_name, last_name")
					.eq("id", reviewedById)
					.single();

				if (error) {
					console.error("Error fetching reviewer:", error);
					return;
				}

				setReviewer(data);
			} catch (err) {
				console.error("Error:", err);
			} finally {
				setIsLoadingReviewer(false);
			}
		};

		if (visible && reviewedById) {
			fetchReviewer();
		}
	}, [visible, reviewedById]);

	const handleSave = () => {
		onSave(startDate, endDate, coefficient, category, notes);
		onClose();
	};

	return (
		<Modal
			visible={visible}
			transparent
			animationType={Platform.OS === "ios" ? "fade" : "slide"}
			onRequestClose={onClose}
		>
			<KeyboardAvoidingView
				behavior={Platform.OS === "ios" ? "padding" : undefined}
				style={{ flex: 1 }}
				keyboardVerticalOffset={Platform.OS === "ios" ? 10 : 0}
			>
				<View className="flex-1 bg-black/25 justify-center items-center">
					<View className="bg-white dark:bg-zinc-800 rounded-2xl w-[90vw] shadow-lg max-h-[90vh]">
						<Text className="text-lg font-semibold p-4 text-zinc-900 dark:text-white">
							Edit {category.charAt(0).toUpperCase() + category.slice(1)}
						</Text>
						{/* Separator below title */}
						<View className="h-1 border-b border-border dark:border-zinc-700" />
						<ScrollView
							className="px-4 pb-4"
							keyboardShouldPersistTaps="handled"
							contentContainerStyle={{
								paddingBottom: Platform.OS === "ios" ? 80 : 0,
							}}
						>
							{/* Category dropdown */}
							<Text className="text-zinc-500 dark:text-zinc-400 mb-2">
								Category
							</Text>
							{Platform.OS === "android" ? (
								<View className="mb-4 border border-zinc-200 dark:border-zinc-600 rounded-lg overflow-hidden bg-white dark:bg-zinc-900">
									<View className="flex-row items-center">
										<Picker
											selectedValue={category}
											onValueChange={(itemValue) => setCategory(itemValue)}
											mode="dropdown"
											style={{
												flex: 1,
												color: isDark ? "#fff" : "#222",
												backgroundColor: "transparent",
											}}
											dropdownIconColor={isDark ? "#fff" : "#222"}
										>
											<Picker.Item label="Shift" value="shift" />
											<Picker.Item label="Break" value="break" />
											<Picker.Item label="Overtime" value="overtime" />
										</Picker>
									</View>
								</View>
							) : (
								<View className="mb-4 border border-zinc-200 dark:border-zinc-600 rounded-lg overflow-hidden bg-white dark:bg-zinc-900">
									<View className="flex-row items-center">
										{Platform.OS === "ios" ? (
											<TouchableOpacity
												className="flex-1 p-2.5 px-3"
												onPress={() => {
													// For iOS, use ActionSheet instead of the picker directly
													ActionSheetIOS.showActionSheetWithOptions(
														{
															options: ["Shift", "Break", "Overtime", "Cancel"],
															cancelButtonIndex: 3,
															title: "Select Category",
														},
														(buttonIndex) => {
															switch (buttonIndex as number) {
																case 0:
																	setCategory("shift");
																	break;
																case 1:
																	setCategory("break");
																	break;
																case 2:
																	setCategory("overtime");
																	break;
															}
														},
													);
												}}
												activeOpacity={0.7}
											>
												<View className="flex-row items-center justify-between">
													<Text className="text-zinc-900 dark:text-zinc-100 font-medium">
														{category.charAt(0).toUpperCase() +
															category.slice(1)}
													</Text>
													<Ionicons
														name="chevron-down"
														size={20}
														color={isDark ? "#fff" : "#222"}
													/>
												</View>
											</TouchableOpacity>
										) : !showPicker ? (
											<TouchableOpacity
												className="flex-1"
												onPress={() => setShowPicker(true)}
												activeOpacity={0.9}
											>
												<View className="rounded-lg p-2 py-2.5 flex-row flex-1 items-center justify-between">
													<View className="flex-1">
														<Text className="text-zinc-900 dark:text-zinc-100 font-medium">
															{category.charAt(0).toUpperCase() +
																category.slice(1)}
														</Text>
													</View>
													<View>
														<Ionicons
															name="chevron-down"
															size={20}
															color={isDark ? "#fff" : "#222"}
														/>
													</View>
												</View>
											</TouchableOpacity>
										) : (
											<Picker
												selectedValue={category}
												onValueChange={(itemValue) => {
													setCategory(itemValue);
													setShowPicker(false);
												}}
												mode="dropdown"
												style={{
													flex: 1,
													color: isDark ? "#fff" : "#222",
													backgroundColor: "transparent",
												}}
												dropdownIconColor={isDark ? "#fff" : "#222"}
											>
												<Picker.Item label="Shift" value="shift" />
												<Picker.Item label="Break" value="break" />
												<Picker.Item label="Overtime" value="overtime" />
											</Picker>
										)}
									</View>
								</View>
							)}
							<Text className="text-zinc-500 dark:text-zinc-400">
								Start Time
							</Text>
							<TouchableOpacity
								onPress={() => setShowStartPicker(true)}
								activeOpacity={0.7}
								className="mb-4 py-2.5 px-3 border border-border rounded-lg bg-white dark:bg-zinc-900"
							>
								<Text className="text-zinc-900 dark:text-zinc-100 font-medium">
									{startDate instanceof Date && !isNaN(startDate.getTime())
										? startDate.toLocaleTimeString([], {
												hour: "2-digit",
												minute: "2-digit",
											})
										: "--:--"}
								</Text>
							</TouchableOpacity>
							{showStartPicker && (
								<DateTimePicker
									value={
										startDate instanceof Date && !isNaN(startDate.getTime())
											? startDate
											: new Date()
									}
									mode="time"
									is24Hour
									display={Platform.OS === "ios" ? "spinner" : "default"}
									onChange={(_event: any, date?: Date | undefined) => {
										setShowStartPicker(false);
										if (date) setStartDate(date);
									}}
								/>
							)}

							<Text className="text-zinc-500 dark:text-zinc-400">End Time</Text>
							<TouchableOpacity
								onPress={() => setShowEndPicker(true)}
								activeOpacity={0.7}
								className="mb-4 py-2.5 px-3 border border-zinc-200 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-900"
							>
								<Text className="text-zinc-900 dark:text-zinc-100 font-medium">
									{endDate &&
									endDate instanceof Date &&
									!isNaN(endDate.getTime())
										? endDate.toLocaleTimeString([], {
												hour: "2-digit",
												minute: "2-digit",
											})
										: "Ongoing"}
								</Text>
							</TouchableOpacity>
							{showEndPicker && (
								<DateTimePicker
									value={
										endDate &&
										endDate instanceof Date &&
										!isNaN(endDate.getTime())
											? endDate
											: startDate
									}
									mode="time"
									is24Hour
									display={Platform.OS === "ios" ? "spinner" : "default"}
									onChange={(_event: any, date?: Date | undefined) => {
										setShowEndPicker(false);
										if (date) setEndDate(date);
									}}
								/>
							)}

							{/* Coefficient input */}
							<Text className="text-zinc-500 dark:text-zinc-400 mb-2">
								Coefficient
							</Text>
							<View className="flex flex-row items-center justify-between mb-4">
								<TouchableOpacity
									onPress={() => {
										// Round down to the nearest 0.1 increment
										const currentValue = parseFloat(coefficient.toFixed(2));
										const decrementedValue =
											Math.floor(currentValue * 10 - 1) / 10;
										const newValue = Math.max(0.5, decrementedValue);
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
										className="text-zinc-900 dark:text-zinc-100 font-medium w-20 text-center py-2 px-1 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-900"
										value={coefficientText}
										onChangeText={setCoefficientText}
										keyboardType="decimal-pad"
										selectTextOnFocus
										onBlur={() => {
											const newValue = parseFloat(coefficientText);
											if (
												!isNaN(newValue) &&
												newValue >= 0.5 &&
												newValue <= 10
											) {
												setCoefficient(newValue);
												setCoefficientText(newValue.toFixed(2));
											} else {
												setCoefficientText(coefficient.toFixed(2));
											}
											setIsEditingCoefficient(false);
										}}
										onSubmitEditing={() => {
											const newValue = parseFloat(coefficientText);
											if (
												!isNaN(newValue) &&
												newValue >= 0.5 &&
												newValue <= 10
											) {
												setCoefficient(newValue);
												setCoefficientText(newValue.toFixed(2));
											} else {
												setCoefficientText(coefficient.toFixed(2));
											}
											setIsEditingCoefficient(false);
											Keyboard.dismiss();
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
										const incrementedValue =
											Math.ceil(currentValue * 10 + 1) / 10;
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

							{/* Notes input */}
							<Text className="text-zinc-500 dark:text-zinc-400 mb-2 mt-4">
								Notes
							</Text>
							<View
								style={{
									borderWidth: 1,
									borderColor: isDark ? "#52525b" : "#d4d4d8",
									borderRadius: 8,
									backgroundColor: isDark ? "#18181b" : "#ffffff",
									overflow: "hidden",
									marginBottom: 16, // Add more bottom margin for better spacing
								}}
							>
								<TextInput
									style={{
										paddingHorizontal: 12,
										paddingVertical: 10,
										minHeight: 80,
										maxHeight: 150,
										color: isDark ? "#f4f4f5" : "#27272a",
										fontSize: 16,
										textAlignVertical: "top", // Important for Android
										...Platform.select({
											ios: {
												paddingTop: 10, // iOS needs padding adjustments
											},
											android: {
												paddingBottom: 6, // Android needs different padding
											},
										}),
									}}
									value={notes}
									onChangeText={setNotes}
									multiline
									numberOfLines={Platform.OS === "ios" ? undefined : 4} // Only specify for Android
									placeholder="Add notes about this time block"
									placeholderTextColor={isDark ? "#9ca3af" : "#6b7280"}
								/>
							</View>

							{/* Rejection information */}
							{rejectionReason && (
								<View className="mt-4 p-3 border border-red-300 dark:border-red-800 rounded-lg bg-red-50 dark:bg-red-900/20">
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
									{isLoadingReviewer && (
										<Text className="text-zinc-500 dark:text-zinc-400 text-sm">
											Loading reviewer information...
										</Text>
									)}
								</View>
							)}
						</ScrollView>
						{/* Separator above actions */}
						<View className="h-1 border-b border-border dark:border-zinc-700" />
						<View className="flex flex-row justify-end p-4">
							<TouchableOpacity
								onPress={onClose}
								activeOpacity={0.7}
								className="py-2.5 px-4 rounded-lg bg-zinc-100 dark:bg-zinc-700 mr-2"
							>
								<Text className="text-base font-semibold text-blue-600 dark:text-blue-400">
									Cancel
								</Text>
							</TouchableOpacity>
							<TouchableOpacity
								onPress={handleSave}
								activeOpacity={0.7}
								className="py-2.5 px-4 rounded-lg bg-blue-600 dark:bg-blue-700"
							>
								<Text className="text-base font-semibold text-white">Save</Text>
							</TouchableOpacity>
						</View>
					</View>
				</View>
			</KeyboardAvoidingView>
		</Modal>
	);
};
