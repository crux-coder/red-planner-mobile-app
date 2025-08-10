import React, { useState, useEffect } from "react";
import { View, TouchableOpacity, Alert, Modal, ScrollView } from "react-native";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { Text } from "@/components/ui/text";
import { useColorScheme } from "@/lib/useColorScheme";
import { colors } from "@/constants/colors";
import {
	useJobChecklist,
	JobChecklistData,
} from "@/app/hooks/useSupabaseFunction";
import { supabase } from "@/config/supabase";
import { SafeAreaView } from "react-native-safe-area-context";
import { H4 } from "@/components/ui/typography";

interface JobChecklistsProps {
	jobId: string;
	jobStatus: string;
}

interface ChecklistItem {
	key: string;
	label: string;
	type: "start" | "end";
}

const CHECKLIST_ITEMS: ChecklistItem[] = [
	// Start checklist items
	{
		key: "scopeReviewed",
		label: "Scope reviewed and confirmed",
		type: "start",
	},
	{
		key: "siteWalkover",
		label: "Site walkover done and hazards identified",
		type: "start",
	},
	{
		key: "raUpdated",
		label: "RA updated and signed. Team briefed (if applicable)",
		type: "start",
	},
	{
		key: "equipmentChecked",
		label: "Equipment checked (all missing parts reported)",
		type: "start",
	},
	// End checklist items
	{
		key: "equipmentCollected",
		label: "All equipment collected and checked",
		type: "end",
	},
	{
		key: "dataDownloaded",
		label: "Data from equipment downloaded",
		type: "end",
	},
];

export const JobChecklists: React.FC<JobChecklistsProps> = ({
	jobId,
	jobStatus,
}) => {
	const { colorScheme } = useColorScheme();
	const isDark = colorScheme === "dark";
	const [checklistData, setChecklistData] = useState<
		Record<string, boolean | null>
	>({});
	const [tempChecklistData, setTempChecklistData] = useState<
		Record<string, boolean | null>
	>({});
	const [loading, setLoading] = useState(true);
	const [modalVisible, setModalVisible] = useState(false);
	const [activeChecklistType, setActiveChecklistType] = useState<
		"start" | "end"
	>("start");

	// Use the job checklist cloud function
	const jobChecklistMutation = useJobChecklist({
		onSuccess: (data) => {
			console.log("Checklist saved successfully:", data);
			Alert.alert("Success", "Checklist updated successfully");
			setModalVisible(false);
			// Update the main checklist data with saved changes
			setChecklistData(tempChecklistData);
		},
		onError: (error) => {
			console.error("Error saving checklist:", error);
			Alert.alert("Error", "Failed to save checklist. Please try again.");
		},
	});

	// Fetch existing checklist data
	useEffect(() => {
		fetchChecklistData();
	}, [jobId]);

	const fetchChecklistData = async () => {
		try {
			setLoading(true);
			const { data, error } = await supabase
				.from("job_checklists")
				.select("checklist_data")
				.eq("job_id", jobId)
				.eq("type", activeChecklistType)
				.order("created_at", { ascending: false })
				.limit(1)
				.maybeSingle();

			if (error) {
				console.error("Error fetching checklist data:", error);
				return;
			}

			if (data?.checklist_data) {
				setChecklistData(data.checklist_data);
			}
		} catch (error) {
			console.error("Error:", error);
		} finally {
			setLoading(false);
		}
	};

	const openChecklist = (type: "start" | "end") => {
		setActiveChecklistType(type);
		setTempChecklistData({ ...checklistData });
		setModalVisible(true);
	};

	const handleChecklistItemToggle = (itemKey: string) => {
		const currentValue = tempChecklistData[itemKey];
		const newValue = currentValue === true ? null : true;
		setTempChecklistData((prev) => ({ ...prev, [itemKey]: newValue }));
	};

	const handleSave = async () => {
		// Get only the items that belong to the current checklist type
		const relevantItems = CHECKLIST_ITEMS.filter(
			(item) => item.type === activeChecklistType,
		);
		const checklistDataToSave: Record<string, boolean | null> = {};

		relevantItems.forEach((item) => {
			checklistDataToSave[item.key] = tempChecklistData[item.key] || null;
		});

		// Prepare data for cloud function
		const checklistPayload: JobChecklistData = {
			jobId,
			checklistType: activeChecklistType,
			checklistData: checklistDataToSave,
		};

		try {
			await jobChecklistMutation.mutateAsync(checklistPayload);
		} catch (error) {
			// Error is handled by the mutation's onError callback
		}
	};

	const handleCancel = () => {
		setTempChecklistData({ ...checklistData });
		setModalVisible(false);
	};

	const renderChecklistItem = (item: ChecklistItem) => {
		const isChecked = tempChecklistData[item.key] === true;

		return (
			<TouchableOpacity
				key={item.key}
				className="flex-row items-center py-3 px-2"
				onPress={() => handleChecklistItemToggle(item.key)}
			>
				<View
					className="w-6 h-6 rounded border-2 mr-3 items-center justify-center"
					style={{
						borderColor: isChecked
							? isDark
								? colors.dark.primary
								: colors.light.primary
							: isDark
								? colors.dark.border
								: colors.light.border,
						backgroundColor: isChecked
							? isDark
								? colors.dark.primary
								: colors.light.primary
							: "transparent",
					}}
				>
					{isChecked && (
						<Ionicons
							name="checkmark"
							size={16}
							color={isDark ? colors.dark.background : colors.light.background}
						/>
					)}
				</View>
				<Text
					className="flex-1"
					style={{
						color: isDark ? colors.dark.foreground : colors.light.foreground,
						textDecorationLine: isChecked ? "line-through" : "none",
						opacity: isChecked ? 0.7 : 1,
					}}
				>
					{item.label}
				</Text>
			</TouchableOpacity>
		);
	};
	const startItems = CHECKLIST_ITEMS.filter((item) => item.type === "start");
	const endItems = CHECKLIST_ITEMS.filter((item) => item.type === "end");

	if (loading) {
		return (
			<View className="mb-4">
				<Text
					style={{
						color: isDark ? colors.dark.foreground : colors.light.foreground,
					}}
				>
					Loading checklists...
				</Text>
			</View>
		);
	}

	const getChecklistProgress = (items: ChecklistItem[]) => {
		const completed = items.filter(
			(item) => checklistData[item.key] === true,
		).length;
		return `${completed}/${items.length}`;
	};

	return (
		<View className="mb-4">
			<View className="flex-row items-center mb-2">
				<MaterialIcons
					name="checklist"
					size={20}
					color={isDark ? colors.dark.primary : colors.light.primary}
				/>
				<H4 className="ml-2">Checklists</H4>
			</View>
			<TouchableOpacity
				className="mb-3 p-4 rounded-lg flex-row items-center justify-between"
				style={{
					backgroundColor: isDark ? colors.dark.card : colors.light.card,
					borderColor: isDark ? colors.dark.border : colors.light.border,
					borderWidth: 1,
				}}
				onPress={() => openChecklist("start")}
			>
				<View className="flex-1">
					<Text
						className="text-lg font-semibold mb-1"
						style={{
							color: isDark ? colors.dark.foreground : colors.light.foreground,
						}}
					>
						Job Start Checklist
					</Text>
					<Text className="text-sm">
						Progress: {getChecklistProgress(startItems)} completed
					</Text>
				</View>
				<Ionicons name="chevron-forward" size={20} />
			</TouchableOpacity>

			<TouchableOpacity
				className="mb-3 p-4 rounded-lg flex-row items-center justify-between"
				style={{
					backgroundColor: isDark ? colors.dark.card : colors.light.card,
					borderColor: isDark ? colors.dark.border : colors.light.border,
					borderWidth: 1,
				}}
				onPress={() => openChecklist("end")}
			>
				<View className="flex-1">
					<Text
						className="text-lg font-semibold mb-1"
						style={{
							color: isDark ? colors.dark.foreground : colors.light.foreground,
						}}
					>
						Job End Checklist
					</Text>
					<Text className="text-sm">
						Progress: {getChecklistProgress(endItems)} completed
					</Text>
				</View>
				<Ionicons name="chevron-forward" size={20} />
			</TouchableOpacity>

			{/* Checklist Modal */}
			<Modal
				visible={modalVisible}
				animationType="slide"
				presentationStyle="pageSheet"
				onRequestClose={handleCancel}
			>
				<SafeAreaView
					className="flex-1"
					style={{
						backgroundColor: isDark
							? colors.dark.background
							: colors.light.background,
					}}
				>
					{/* Header */}
					<View
						className="p-4 border-b"
						style={{
							borderBottomColor: isDark
								? colors.dark.border
								: colors.light.border,
						}}
					>
						<View
							style={{
								position: "relative",
								alignItems: "center",
								justifyContent: "center",
								minHeight: 28,
							}}
						>
							<TouchableOpacity onPress={handleCancel} style={{ position: "absolute", left: 0 }}>
								<Text
									className="text-lg"
									style={{
										color: isDark ? colors.dark.primary : colors.light.primary,
									}}
								>
									Cancel
								</Text>
							</TouchableOpacity>
							<Text
								className="text-lg font-semibold"
								style={{
									color: isDark
										? colors.dark.foreground
										: colors.light.foreground,
								}}
							>
								{activeChecklistType === "start" ? "Job Start Checklist" : "Job End Checklist"}
							</Text>
							<TouchableOpacity
								onPress={handleSave}
								disabled={jobChecklistMutation.isPending}
								style={{ position: "absolute", right: 0 }}
							>
								<Text
									className="text-lg font-semibold"
									style={{
										color: jobChecklistMutation.isPending
											? isDark
												? colors.dark.muted
												: colors.light.muted
											: isDark
												? colors.dark.primary
												: colors.light.primary,
									}}
								>
									{jobChecklistMutation.isPending ? "Saving..." : "Save"}
								</Text>
							</TouchableOpacity>
						</View>
					</View>

					{/* Checklist Content */}
					<ScrollView className="flex-1 p-4">
						<View
							className="rounded-lg p-2"
							style={{
								backgroundColor: isDark ? colors.dark.card : colors.light.card,
								borderColor: isDark ? colors.dark.border : colors.light.border,
								borderWidth: 1,
							}}
						>
							{(activeChecklistType === "start" ? startItems : endItems).map(
								renderChecklistItem,
							)}
						</View>
					</ScrollView>
				</SafeAreaView>
			</Modal>
		</View>
	);
};

export default JobChecklists;
