import React, { useState, useEffect, useCallback } from "react";
import {
	View,
	ScrollView,
	RefreshControl,
	StyleSheet,
	TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text } from "@/components/ui/text";
import { useColorScheme } from "@/lib/useColorScheme";
import { useSupabase } from "@/context/supabase-provider";
import { useLocalSearchParams } from "expo-router";
import HourMarkers from "@/app/components/home/HourMarkers";
import CurrentTimeIndicator from "@/app/components/home/CurrentTimeIndicator";
import { supabase } from "@/config/supabase";

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
	job?: {
		id: string;
		job_number?: string;
		title?: string;
	};
}

const HOUR_HEIGHT = 60;

import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { TimeBlockEditDialog } from "../../../components/timesheet/TimeBlockEditDialog";
import { toLocalTimestamp } from "@/lib/utils";

export default function TimesheetDay() {
	const { colorScheme } = useColorScheme();
	const isDark = colorScheme === "dark";
	const { userProfile } = useSupabase();
	const { date } = useLocalSearchParams();
	const [shifts, setShifts] = useState<Shift[]>([]);
	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);
	const [editDialogVisible, setEditDialogVisible] = useState(false);
	const [editingShift, setEditingShift] = useState<Shift | null>(null);

	const fetchShiftsForDay = useCallback(async () => {
		if (!userProfile || !date) return;
		setLoading(true);
		try {
			// Fetch all time_blocks for the user for the selected day
			const { data, error } = await supabase
				.from("time_blocks")
				.select("*, job:job_id(*)")
				.eq("worker_id", userProfile.id)
				.gte("start_time", `${date} 00:00:00`)
				.lt("start_time", `${date} 23:59:59.999`)
				.order("start_time", { ascending: true });
			if (error) {
				console.error("Error fetching shifts for day:", error);
				setShifts([]);
			} else {
				setShifts(data || []);
			}
		} catch (err) {
			setShifts([]);
		} finally {
			setLoading(false);
			setRefreshing(false);
		}
	}, [userProfile, date]);

	useEffect(() => {
		fetchShiftsForDay();
	}, [fetchShiftsForDay]);

	const handleRefresh = useCallback(() => {
		setRefreshing(true);
		fetchShiftsForDay();
	}, [fetchShiftsForDay]);

	// Helper to get position and height for a time block
	const getBlockStyle = (shift: Shift) => {
		const startDate = new Date(shift.start_time);
		const endDate = shift.end_time ? new Date(shift.end_time) : new Date();
		const startHour = startDate.getHours();
		const startMinute = startDate.getMinutes();
		const startPosition = (startHour + startMinute / 60) * HOUR_HEIGHT;
		const durationHours =
			(endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60);
		const height = Math.max(durationHours * HOUR_HEIGHT, 25); // Minimum height

		let backgroundColor = isDark ? "#2563eb" : "#93c5fd";
		let borderColor = isDark ? "#1e40af" : "#2563eb";

		if (shift.category === "shift" && shift.type === "job") {
			backgroundColor = isDark ? "#166534" : "#bbf7d0"; // green-900 / green-100
			borderColor = isDark ? "#22c55e" : "#4ade80"; // green-700 / green-300
		} else if (shift.category === "shift") {
			backgroundColor = isDark ? "#1e40af" : "#dbeafe"; // blue-900 / blue-100
			borderColor = isDark ? "#2563eb" : "#60a5fa"; // blue-700 / blue-300
		} else if (shift.category === "break") {
			backgroundColor = isDark ? "#334155" : "#e2e8f0"; // slate-800 / slate-200
			borderColor = isDark ? "#64748b" : "#cbd5e1"; // slate-700 / slate-300
		} else if (shift.category === "overtime") {
			backgroundColor = isDark ? "#7f1d1d" : "#fee2e2"; // red-900 / red-100
			borderColor = isDark ? "#b91c1c" : "#fca5a5"; // red-700 / red-300
		}

		return {
			position: "absolute" as const,
			top: startPosition + 11, // 11px offset for hour markers
			height,
			left: 60,
			right: 10,
			borderRadius: 8,
			backgroundColor,
			borderWidth: 2,
			borderColor,
			padding: 8,
			justifyContent: "center" as const,
			shadowColor: "#000",
			shadowOpacity: 0.1,
			shadowRadius: 4,
			elevation: 2,
		};
	};

	const router = useRouter();
	// Format date for display
	let formattedDate = "";
	if (typeof date === "string") {
		const d = new Date(date);
		formattedDate = d.toLocaleDateString(undefined, {
			weekday: "long",
			year: "numeric",
			month: "long",
			day: "numeric",
		});
	}

	const handleEditBlock = (shift: Shift) => {
		setEditingShift(shift);
		setEditDialogVisible(true);
	};

	const handleSaveEdit = async (
		start: Date,
		end: Date | null,
		coefficient: number,
	) => {
		if (!editingShift) return;
		const startDate = new Date(editingShift.start_time);
		const newStart = new Date(startDate);
		newStart.setHours(start.getHours(), start.getMinutes(), 0, 0);
		let newEnd = null;
		if (end) {
			const endDate = new Date(
				editingShift.end_time || editingShift.start_time,
			);
			newEnd = new Date(endDate);
			newEnd.setHours(end.getHours(), end.getMinutes(), 0, 0);
		}
		await supabase
			.from("time_blocks")
			.update({
				start_time: toLocalTimestamp(newStart),
				end_time: newEnd ? toLocalTimestamp(newEnd) : null,
				coefficient: coefficient,
			})
			.eq("id", editingShift.id);
		setEditDialogVisible(false);
		setEditingShift(null);
		await fetchShiftsForDay();
	};

	return (
		<SafeAreaView className="flex-1 bg-background" edges={["top"]}>
			{/* Header with back button and date */}
			<View
				style={{
					flexDirection: "row",
					alignItems: "center",
					padding: 16,
					borderBottomWidth: 1,
					borderBottomColor: isDark ? "#222" : "#eee",
					backgroundColor: isDark ? "#18181b" : "#fff",
					zIndex: 20,
				}}
			>
				<Ionicons
					name="chevron-back"
					size={28}
					color={isDark ? "#fff" : "#222"}
					onPress={() => router.back()}
					style={{ marginRight: 8 }}
				/>
				<Text
					className="text-lg font-semibold"
					style={{ color: isDark ? "#fff" : "#222" }}
				>
					{formattedDate}
				</Text>
			</View>
			<View className="flex-1 bg-background">
				<ScrollView
					className="flex-1 bg-background"
					contentContainerStyle={{ minHeight: 24 * HOUR_HEIGHT }}
					refreshControl={
						<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
					}
				>
					{/* Hour markers */}
					<HourMarkers hourHeight={HOUR_HEIGHT} />
					{/* Current time indicator */}
					<CurrentTimeIndicator hourHeight={HOUR_HEIGHT} visible={true} />
					{/* Time blocks */}
					{shifts.map((shift) => {
						const style = getBlockStyle(shift);

						// Determine text colors based on shift type/category
						let timeColor = isDark ? "#2563eb" : "#1e40af";
						let titleColor = isDark ? "#2563eb" : "#1e40af";
						let infoColor = isDark ? "#2563eb" : "#1e40af";

						if (shift.category === "shift" && shift.type === "job") {
							timeColor = isDark ? "#bbf7d0" : "#166534";
							titleColor = isDark ? "#bbf7d0" : "#166534";
							infoColor = isDark ? "#bbf7d0" : "#166534";
						} else if (shift.category === "shift") {
							timeColor = isDark ? "#dbeafe" : "#1e40af";
							titleColor = isDark ? "#dbeafe" : "#1e40af";
							infoColor = isDark ? "#dbeafe" : "#1e40af";
						} else if (shift.category === "break") {
							timeColor = isDark ? "#e2e8f0" : "#334155";
							titleColor = isDark ? "#e2e8f0" : "#334155";
							infoColor = isDark ? "#cbd5e1" : "#64748b";
						} else if (shift.category === "overtime") {
							timeColor = isDark ? "#fee2e2" : "#7f1d1d";
							titleColor = isDark ? "#fee2e2" : "#7f1d1d";
							infoColor = isDark ? "#fca5a5" : "#b91c1c";
						}

						return (
							<View key={shift.id} style={style}>
								{/* Overlay for editing */}
								<View
									style={{
										position: "absolute",
										top: 0,
										left: 0,
										right: 0,
										bottom: 0,
										zIndex: 10,
									}}
								>
									{/* Transparent button to open edit */}
									<TouchableOpacity
										activeOpacity={1}
										style={{
											width: "100%",
											height: "100%",
											position: "absolute",
											top: 0,
											left: 0,
											backgroundColor: "transparent",
											zIndex: 20,
										}}
										onPress={() => handleEditBlock(shift)}
										accessibilityLabel="Edit Time Block"
									/>
								</View>
								<Text
									style={{
										fontWeight: "600",
										fontSize: 12,
										marginBottom: 4,
										color: titleColor,
									}}
								>
									{shift.category.toUpperCase()}{" "}
									{shift.type === "job" && shift.job?.job_number
										? `- ${shift.job.job_number}`
										: ""}
								</Text>
								<Text style={{ fontSize: 12, color: timeColor }}>
									{new Date(shift.start_time).toLocaleTimeString([], {
										hour: "2-digit",
										minute: "2-digit",
									})}
									{shift.end_time
										? ` - ${new Date(shift.end_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
										: " - ..."}
								</Text>
							</View>
						);
					})}
				</ScrollView>
				{/* Edit Dialog */}
				<TimeBlockEditDialog
					visible={editDialogVisible}
					onClose={() => {
						setEditDialogVisible(false);
						setEditingShift(null);
					}}
					onSave={handleSaveEdit}
					initialStart={editingShift?.start_time || ""}
					initialEnd={editingShift?.end_time || null}
					category={editingShift?.category || "shift"}
					initialCoefficient={editingShift?.coefficient || 1}
				/>
			</View>
		</SafeAreaView>
	);
}
