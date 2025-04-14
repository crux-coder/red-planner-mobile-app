import { View, TouchableOpacity, StyleSheet, ViewStyle } from "react-native";
import { Text } from "@/components/ui/text";
import { getJobStatusColor, getJobTypeColor } from "@/lib/colors";
import { Job, JobStatus } from "@/app/(app)/(protected)/schedule/index";
import { useRouter } from "expo-router";
import { useColorScheme } from "@/lib/useColorScheme";

interface JobCardProps {
	job: Job;
	positionStyle: ViewStyle;
}

export default function JobCard({ job, positionStyle }: JobCardProps) {
	const router = useRouter();
	const { colorScheme } = useColorScheme();
	const isDark = colorScheme === "dark";

	if (!job.start_date || !job.end_date) return null;

	// Only check height if it exists in positionStyle
	if (
		positionStyle.height !== undefined &&
		typeof positionStyle.height === "number" &&
		positionStyle.height <= 0
	)
		return null;

	const jobColor = isDark
		? getJobTypeColor(job.type, "bgDark")
		: getJobTypeColor(job.type, "bg");
	const statusColor = getJobStatusColor(job.status, "border");
	const jobTextColor = getJobTypeColor(job.type, "text");

	// Format start and end time
	const startTime = new Date(job.start_date).toLocaleTimeString("en-US", {
		hour: "2-digit",
		minute: "2-digit",
		hour12: true,
	});

	const endTime = new Date(job.end_date).toLocaleTimeString("en-US", {
		hour: "2-digit",
		minute: "2-digit",
		hour12: true,
	});

	// Get project name
	const projectName = job.project?.name || "No Project";

	// Format status for display
	const formatStatus = (status: JobStatus) => {
		return status
			.split("_")
			.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
			.join(" ");
	};

	return (
		<TouchableOpacity
			key={job.id}
			style={[
				styles.jobItem,
				{
					...positionStyle,
					backgroundColor: jobColor,
					borderLeftWidth: 4,
					borderLeftColor: getJobTypeColor(job.type, "border"),
					marginBottom: 4,
					marginLeft: 4,
				},
			]}
			activeOpacity={0.7}
			onPress={() =>
				router.push({
					pathname: "/(app)/(protected)/schedule/job",
					params: { id: job.id },
				})
			}
		>
			<View style={styles.jobHeader}>
				<Text style={[styles.jobNumber, { color: jobTextColor }]}>
					{job.job_number}
				</Text>
				<View
					style={[styles.statusIndicator, { backgroundColor: statusColor }]}
				>
					<Text style={styles.statusText}>{formatStatus(job.status)}</Text>
				</View>
			</View>

			<Text style={[styles.jobProject, { color: jobTextColor }]}>
				{projectName}
			</Text>

			<Text style={[styles.jobTimes, { color: jobTextColor }]}>
				{startTime} - {endTime}
			</Text>
		</TouchableOpacity>
	);
}

const styles = StyleSheet.create({
	jobItem: {
		position: "absolute",
		left: 70,
		right: 10,
		borderRadius: 4,
		padding: 8,
		overflow: "hidden",
	},
	jobHeader: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		marginBottom: 4,
	},
	jobNumber: {
		fontWeight: "bold",
		fontSize: 16, // Larger font
	},
	statusIndicator: {
		paddingHorizontal: 6,
		paddingVertical: 2,
		borderRadius: 10,
	},
	statusText: {
		color: "white",
		fontSize: 10,
		fontWeight: "bold",
	},
	jobProject: {
		fontSize: 14, // Larger font
		marginBottom: 4,
		fontWeight: "500",
	},
	jobTimes: {
		fontSize: 12,
		marginTop: 2,
	},
});
