import React from "react";
import { View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "@/components/ui/text";
import { H3, H4 } from "@/components/ui/typography";
import { colors } from "@/constants/colors";
import { useColorScheme } from "@/lib/useColorScheme";

interface JobDateTimeProps {
	startDate: string | null;
	endDate: string | null;
}

export const JobDateTime: React.FC<JobDateTimeProps> = ({
	startDate,
	endDate,
}) => {
	const { colorScheme } = useColorScheme();
	const isDark = colorScheme === "dark";

	// Format full date with time
	const formatDateTime = (dateString: string | null) => {
		if (!dateString) return "Not set";
		const date = new Date(dateString);

		// Format date as DD/MM/YYYY
		const day = date.getDate().toString().padStart(2, "0");
		const month = (date.getMonth() + 1).toString().padStart(2, "0");
		const year = date.getFullYear();

		// Format time in 24-hour format (HH:MM)
		const hours = date.getHours().toString().padStart(2, "0");
		const minutes = date.getMinutes().toString().padStart(2, "0");

		return `${day}/${month}/${year} ${hours}:${minutes}`;
	};

	// Format date only
	const formatDate = (dateString: string | null) => {
		if (!dateString) return "Not set";
		const date = new Date(dateString);

		// Get day of week (3 letters)
		const dayOfWeek = date.toLocaleDateString("en-US", { weekday: "short" });

		// Get day number (with leading zero if needed)
		const day = date.getDate().toString().padStart(2, "0");

		// Get month name
		const month = date.toLocaleDateString("en-US", { month: "long" });

		// Get year
		const year = date.getFullYear();

		return `${dayOfWeek}, ${day} ${month} ${year}`;
	};

	// Format time only
	const formatTime = (dateString: string | null) => {
		if (!dateString) return "Not set";
		const date = new Date(dateString);

		// Format time in 24-hour format (HH:MM)
		const hours = date.getHours().toString().padStart(2, "0");
		const minutes = date.getMinutes().toString().padStart(2, "0");

		return `${hours}:${minutes}`;
	};

	return (
		<View>
			{/* Date and Time section */}
			<View className="flex-row items-center mb-2">
				<Ionicons
					name="calendar"
					size={20}
					color={isDark ? colors.dark.primary : colors.light.primary}
				/>
				<H4 className="ml-2">Date and Time</H4>
			</View>
			<View className="bg-card p-4 rounded-lg mb-4">
				{/* Combined date and time in a more compact layout */}
				<View className="flex-row items-center justify-between">
					<View className="flex-1">
						<Text className="text-muted-foreground mb-1">Date</Text>
						<Text className="text-lg font-medium">{formatDate(startDate)}</Text>
					</View>
					<View className="flex-row flex-1">
						<View className="flex-1 mr-2">
							<Text className="text-muted-foreground mb-1">Start</Text>
							<Text className="text-lg font-medium">{formatTime(startDate)}</Text>
						</View>
						<View className="flex-1">
							<Text className="text-muted-foreground mb-1">End</Text>
							<Text className="text-lg font-medium">{formatTime(endDate)}</Text>
						</View>
					</View>
				</View>
			</View>
		</View>
	);
};

export default JobDateTime;
