import React from "react";
import { View, ActivityIndicator } from "react-native";
import { H1, H3, Muted } from "@/components/ui/typography";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Text } from "@/components/ui/text";

interface CurrentShiftCardProps {
	loading: boolean;
	currentShift: any;
	elapsedTime: string;
	isDark: boolean;
	formatStartTime: (start: string) => string;
	onEdit?: (shift: any) => void; // Optional callback for edit action
}

export const CurrentShiftCard: React.FC<CurrentShiftCardProps> = ({
	loading,
	currentShift,
	elapsedTime,
	isDark,
	formatStartTime,
	onEdit,
}) => {
	// Helper to return 'Today' or 'Yesterday' with time
	const getRelativeStartedText = (start: string) => {
		if (!start) return "";
		const startDate = new Date(start);
		const now = new Date();
		const isToday = startDate.toDateString() === now.toDateString();
		const yesterday = new Date(now);
		yesterday.setDate(now.getDate() - 1);
		const isYesterday = startDate.toDateString() === yesterday.toDateString();
		const pad = (n: number) => n.toString().padStart(2, "0");
		const time = `${pad(startDate.getHours())}:${pad(startDate.getMinutes())}`;
		if (isToday) return `Today, ${time}`;
		if (isYesterday) return `Yesterday, ${time}`;
		return `${startDate.toLocaleDateString()}, ${time}`;
	};
	// Determine background and text color based on category/type
	let bgClass = "bg-card";
	let borderClass = "border border-border";
	let timeColor = "text-primary";
	let titleColor = "text-foreground";
	let infoColor = "text-muted-foreground";

	const getCurrentShiftTitle = () => {
		if (!currentShift) return "";

		// If it's a shift with type job, treat as shift-job
		if (currentShift.category === "shift" && currentShift.type === "job") {
			return currentShift.job?.job_number || "Job Shift";
		}
		if (currentShift.category === "shift") {
			return "Shift";
		}
		if (currentShift.category === "break") {
			return "Break";
		}
		if (currentShift.category === "overtime") {
			return "Overtime";
		}
		return "";
	};

	if (currentShift) {
		if (currentShift.category === "shift" && currentShift.type === "job") {
			bgClass = isDark ? "bg-green-900" : "bg-green-100";
			borderClass = isDark ? "border-green-700" : "border-green-300";
			timeColor = isDark ? "text-green-300" : "text-green-700";
			titleColor = isDark ? "text-green-200" : "text-green-800";
			infoColor = isDark ? "text-green-200" : "text-green-700";
		} else if (currentShift.category === "shift") {
			bgClass = isDark ? "bg-blue-900" : "bg-blue-100";
			borderClass = isDark ? "border-blue-700" : "border-blue-300";
			timeColor = isDark ? "text-blue-300" : "text-blue-700";
			titleColor = isDark ? "text-blue-200" : "text-blue-800";
			infoColor = isDark ? "text-blue-200" : "text-blue-700";
		} else if (currentShift.category === "break") {
			bgClass = isDark ? "bg-slate-800" : "bg-slate-200";
			borderClass = isDark ? "border-slate-700" : "border-slate-300";
			timeColor = isDark ? "text-slate-200" : "text-slate-800";
			titleColor = isDark ? "text-slate-200" : "text-slate-800";
			infoColor = isDark ? "text-slate-300" : "text-slate-600";
		} else if (currentShift.category === "overtime") {
			bgClass = isDark ? "bg-red-900" : "bg-red-100";
			borderClass = isDark ? "border-red-700" : "border-red-300";
			timeColor = isDark ? "text-red-300" : "text-red-700";
			titleColor = isDark ? "text-red-200" : "text-red-800";
			infoColor = isDark ? "text-red-200" : "text-red-700";
		}
	}

	const router = useRouter();

	return (
		<View className={`${bgClass} p-2 rounded-lg ${borderClass} mb-2 shadow-sm`}>
			{currentShift && onEdit && (
				<View style={{ position: "absolute", top: 8, right: 8, zIndex: 10 }}>
					<Ionicons
						name="create-outline"
						size={22}
						color={isDark ? "#fff" : "#222"}
						onPress={() => {
							// Call the onEdit callback with the current shift
							if (onEdit && currentShift) {
								onEdit(currentShift);
							}
						}}
						style={{ padding: 4 }}
					/>
				</View>
			)}
			<H3 className={`text-center font-semibold uppercase ${titleColor}`}>
				{getCurrentShiftTitle()}
			</H3>
			{loading ? (
				<View className="items-center py-4">
					<ActivityIndicator
						size="large"
						color={isDark ? "#4ade80" : "#22c55e"}
					/>
					<Text className="mt-2">Loading...</Text>
				</View>
			) : (
				<View className="items-center py-4">
					<H1 className={`font-bold mb-2 ${timeColor}`}>
						{currentShift ? elapsedTime : "00:00:00"}
					</H1>
					{currentShift ? (
						<View className="items-center">
							<Text className={`${infoColor}`}>
								Started {getRelativeStartedText(currentShift.start_time ?? "")}
							</Text>
						</View>
					) : (
						<Muted className="text-center">
							You are not currently clocked in.
						</Muted>
					)}
				</View>
			)}
		</View>
	);
};
