import React, { useState } from "react";
import { View, Modal, Platform, TouchableOpacity } from "react-native";
import { Picker } from "@react-native-picker/picker";
import { Text } from "@/components/ui/text";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";

interface TimeBlockEditDialogProps {
	visible: boolean;
	onClose: () => void;
	onSave: (
		start: Date,
		end: Date | null,
		coefficient: number,
		category: string,
	) => void;
	initialStart: string;
	initialEnd: string | null;
	category: string;
	initialCoefficient: number;
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
	const [category, setCategory] = useState<string>(initialCategory || "shift");

	const { colorScheme } = useColorScheme();
	const [showPicker, setShowPicker] = useState(false);
	const isDark = colorScheme === "dark";

	// Sync state with props when opening dialog
	React.useEffect(() => {
		if (visible) {
			setStartDate(initialStart ? new Date(initialStart) : new Date());
			setEndDate(initialEnd ? new Date(initialEnd) : null);
			setCoefficient(initialCoefficient || 1);
			setCategory(initialCategory || "shift");
		}
	}, [visible, initialStart, initialEnd, initialCoefficient, initialCategory]);

	const handleSave = () => {
		onSave(startDate, endDate, coefficient, category);
		onClose();
	};

	return (
		<Modal
			visible={visible}
			transparent
			animationType={Platform.OS === "ios" ? "fade" : "slide"}
			onRequestClose={onClose}
		>
			<View className="flex-1 bg-black/25 justify-center items-center">
				<View className="bg-white dark:bg-zinc-800 rounded-2xl w-[90vw] shadow-lg">
					<Text className="text-lg font-semibold p-4 text-zinc-900 dark:text-white">
						Edit {category.charAt(0).toUpperCase() + category.slice(1)}
					</Text>
					{/* Separator below title */}
					<View className="h-1 border-b border-border dark:border-zinc-700" />
					<View className="p-4">
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
									{!showPicker ? (
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
						<Text className="text-zinc-500 dark:text-zinc-400">Start Time</Text>
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
								{endDate && endDate instanceof Date && !isNaN(endDate.getTime())
									? endDate.toLocaleTimeString([], {
											hour: "2-digit",
											minute: "2-digit",
										})
									: "Ongoing (no end)"}
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

						<TouchableOpacity
							onPress={() => setEndDate(null)}
							activeOpacity={0.7}
							className="mb-4 py-2.5 px-3 rounded-lg bg-zinc-100 dark:bg-zinc-700"
						>
							<Text className="text-gray-800 dark:text-gray-200 font-medium">
								Set as Ongoing
							</Text>
						</TouchableOpacity>

						{/* Coefficient input */}
						<Text className="text-zinc-500 dark:text-zinc-400 mb-2">
							Coefficient
						</Text>
						<View className="flex flex-row items-center justify-between mb-4">
							<TouchableOpacity
								onPress={() => setCoefficient(Math.max(0.5, coefficient - 0.1))}
								className="p-4 rounded-lg bg-zinc-100 dark:bg-zinc-700"
							>
								<Text className="text-gray-800 dark:text-gray-200 font-medium">
									<Ionicons name="remove" size={24} />
								</Text>
							</TouchableOpacity>
							<Text className="text-zinc-900 dark:text-zinc-100 font-medium w-10 text-center">
								{coefficient.toFixed(2)}
							</Text>
							<TouchableOpacity
								onPress={() => setCoefficient(Math.min(10, coefficient + 0.1))}
								className="p-4 rounded-lg bg-zinc-100 dark:bg-zinc-700"
							>
								<Text className="text-gray-800 dark:text-gray-200 font-medium">
									<Ionicons name="add" size={24} />
								</Text>
							</TouchableOpacity>
						</View>
					</View>
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
		</Modal>
	);
};
