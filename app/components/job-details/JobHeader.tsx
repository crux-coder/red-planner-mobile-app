import React from "react";
import { View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "@/components/ui/text";
import {
	Job,
	JobStatus,
	JobType,
} from "@/app/(app)/(protected)/schedule/index";
import { getJobStatusColor, getJobTypeColor } from "@/lib/colors";
import { useColorScheme } from "@/lib/useColorScheme";

interface JobHeaderProps {
	job: Job;
}

export const JobHeader: React.FC<JobHeaderProps> = ({ job }) => {
	const { colorScheme } = useColorScheme();
	const isDark = colorScheme === "dark";

	const getJobColor = (jobType: JobType) => {
		return isDark
			? getJobTypeColor(jobType, "bgDark")
			: getJobTypeColor(jobType, "bg");
	};

	const getStatusColor = (status: JobStatus) => {
		return getJobStatusColor(status, "border");
	};

	const getStatusBgColor = (status: JobStatus) => {
		return getJobStatusColor(status, isDark ? "bgDark" : "bg");
	};

	const getTextColor = (jobType: JobType) => {
		return getJobTypeColor(jobType, "text");
	};

	const formatStatus = (status: JobStatus) => {
		return status.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
	};

	return (
		<View
			className="p-4 mb-2 rounded-lg"
			style={{ backgroundColor: getStatusBgColor(job.status) }}
		>
			{/* First row: Job Number and Project Name */}
			<View className="flex-row justify-between items-center mb-2">
				<Text className="text-xl font-bold text-foreground">
					{job.job_number || "No Job Number"}
				</Text>
				{job.project && (
					<Text className="text-xl font-semibold text-foreground">
						{job.project.name}
					</Text>
				)}
			</View>

			{/* Second row: Job Type and Status */}
			<View className="flex-row justify-between items-center mt-2">
				<View className="flex-row items-center">
					<Ionicons
						name="briefcase-outline"
						size={16}
						color="text-foreground"
					/>
					<Text className="ml-1 text-base text-foreground">
						{job.type.toUpperCase()}
					</Text>
				</View>
				<View
					className="px-2.5 py-1 rounded-xl"
					style={{ backgroundColor: "rgba(255, 255, 255, 0.2)" }}
				>
					<Text className="text-base font-bold text-foreground">
						{formatStatus(job.status)}
					</Text>
				</View>
			</View>
		</View>
	);
};

export default JobHeader;
