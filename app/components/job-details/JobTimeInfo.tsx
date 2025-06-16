import React, { useState, useEffect } from "react";
import { View, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "@/components/ui/text";
import { H4 } from "@/components/ui/typography";
import { colors } from "@/constants/colors";
import { useColorScheme } from "@/lib/useColorScheme";
import { supabase } from "@/config/supabase";
import { TimeBlock } from "@/app/models/types";

interface JobTimeInfoProps {
	jobId: string;
	startDate: string | null;
	endDate: string | null;
}

export const JobTimeInfo: React.FC<JobTimeInfoProps> = ({
	jobId,
	startDate,
	endDate,
}) => {
	const [timeBlocks, setTimeBlocks] = useState<TimeBlock[]>([]);
	const [loading, setLoading] = useState(true);
	const { colorScheme } = useColorScheme();
	const isDark = colorScheme === "dark";

	useEffect(() => {
		fetchTimeBlocks();
	}, [jobId]);

	const fetchTimeBlocks = async () => {
		try {
			setLoading(true);
			const { data, error } = await supabase
				.from("time_blocks")
				.select(
					`
          *,
          worker:worker_id(id, first_name, last_name, photo)
        `,
				)
				.eq("job_id", jobId)
				.eq("category", "shift")
				.order("start_time", { ascending: true });

			if (error) {
				console.error("Error fetching time blocks:", error);
				return;
			}

			setTimeBlocks(data as TimeBlock[]);
		} catch (error) {
			console.error("Error:", error);
		} finally {
			setLoading(false);
		}
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

	// Calculate total hours from time blocks
	const calculateTotalHours = () => {
		if (!timeBlocks.length) return "No time recorded";

		let totalMs = 0;
		let completedBlocks = 0;

		timeBlocks.forEach((block) => {
			if (block.start_time && block.end_time) {
				const start = new Date(block.start_time);
				const end = new Date(block.end_time);
				totalMs += end.getTime() - start.getTime();
				completedBlocks++;
			}
		});

		if (completedBlocks === 0) return "In progress";

		// Convert to hours and minutes
		const totalHours = Math.floor(totalMs / (1000 * 60 * 60));
		const totalMinutes = Math.floor((totalMs % (1000 * 60 * 60)) / (1000 * 60));

		return `${totalHours}h ${totalMinutes}m`;
	};

	return (
		<View>
			{/* Date and Time section */}
			<View className="flex-row items-center mb-2">
				<Ionicons
					name="time"
					size={20}
					color={isDark ? colors.dark.primary : colors.light.primary}
				/>
				<H4 className="ml-2">Time Information</H4>
			</View>
			<View className="bg-card p-4 rounded-lg mb-4">
				{/* Scheduled Time */}
				<View className="mb-4">
					<Text className="text-muted-foreground mb-1 font-medium">
						Scheduled Time
					</Text>
					<View className="flex-row items-center justify-between">
						<View className="flex-1">
							<Text className="text-muted-foreground mb-1">Date</Text>
							<Text className="text-lg font-medium">
								{formatDate(startDate)}
							</Text>
						</View>
						<View className="flex-row flex-1">
							<View className="flex-1 mr-2">
								<Text className="text-muted-foreground mb-1">Start</Text>
								<Text className="text-lg font-medium">
									{formatTime(startDate)}
								</Text>
							</View>
							<View className="flex-1">
								<Text className="text-muted-foreground mb-1">End</Text>
								<Text className="text-lg font-medium">
									{formatTime(endDate)}
								</Text>
							</View>
						</View>
					</View>
				</View>

				{/* Actual Time */}
				<View>
					<Text className="text-muted-foreground mb-1 font-medium">
						Actual Time
					</Text>
					{loading ? (
						<View className="py-2 items-center">
							<ActivityIndicator
								size="small"
								color={isDark ? colors.dark.primary : colors.light.primary}
							/>
						</View>
					) : timeBlocks.length > 0 ? (
						<View className="flex-row items-center justify-between">
							<View className="flex-1">
								<Text className="text-muted-foreground mb-1">Actual Start</Text>
								<Text className="text-lg font-medium">
									{formatTime(timeBlocks[0]?.start_time)}
								</Text>
							</View>
							<View className="flex-row flex-1">
								<View className="flex-1 mr-2">
									<Text className="text-muted-foreground mb-1">Actual End</Text>
									<Text className="text-lg font-medium">
										{formatTime(timeBlocks[timeBlocks.length - 1]?.end_time)}
									</Text>
								</View>
								<View className="flex-1">
									<Text className="text-muted-foreground mb-1">Total</Text>
									<Text className="text-lg font-medium">
										{calculateTotalHours()}
									</Text>
								</View>
							</View>
						</View>
					) : (
						<Text className="text-muted-foreground py-2">
							No time records available
						</Text>
					)}
				</View>
			</View>
		</View>
	);
};

export default JobTimeInfo;
