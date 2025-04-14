import React from "react";
import { View, TouchableOpacity, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "@/components/ui/text";
import { JobStatus } from "@/app/(app)/(protected)/schedule/index";

interface JobActionsProps {
	status: JobStatus;
	updatingStatus: boolean;
	onStartJob: () => void;
	onCompleteJob: () => void;
}

export const JobActions: React.FC<JobActionsProps> = ({
	status,
	updatingStatus,
	onStartJob,
	onCompleteJob,
}) => {
	return (
		<View className="mb-4">
			{status === "booked" && (
				<TouchableOpacity
					className="bg-blue-500 py-3 rounded-lg mb-2 flex-row justify-center items-center"
					onPress={onStartJob}
					disabled={updatingStatus}
				>
					{updatingStatus ? (
						<ActivityIndicator size="small" color="white" />
					) : (
						<Ionicons name="play" size={20} color="white" />
					)}
					<Text className="text-white font-medium ml-2">
						{updatingStatus ? "Updating..." : "Start Work"}
					</Text>
				</TouchableOpacity>
			)}

			{status === "in_progress" && (
				<TouchableOpacity
					className="bg-green-500 py-3 rounded-lg mb-2 flex-row justify-center items-center"
					onPress={onCompleteJob}
					disabled={updatingStatus}
				>
					{updatingStatus ? (
						<ActivityIndicator size="small" color="white" />
					) : (
						<Ionicons name="checkmark-circle" size={20} color="white" />
					)}
					<Text className="text-white font-medium ml-2">
						{updatingStatus ? "Updating..." : "Complete Job"}
					</Text>
				</TouchableOpacity>
			)}

			{status === "completed" && (
				<View className="bg-gray-200 py-3 rounded-lg mb-2 flex-row justify-center items-center">
					<Ionicons name="checkmark-done-circle" size={20} color="green" />
					<Text className="text-gray-700 font-medium ml-2">Job Completed</Text>
				</View>
			)}
		</View>
	);
};

export default JobActions;
