import { useEffect, useState } from "react";
import {
	View,
	StyleSheet,
	ScrollView,
	ActivityIndicator,
	TouchableOpacity,
	Image,
} from "react-native";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { Ionicons, MaterialIcons, FontAwesome5 } from "@expo/vector-icons";

import { SafeAreaView } from "@/components/safe-area-view";
import { Text } from "@/components/ui/text";
import { H1, H2, H3, Muted } from "@/components/ui/typography";
import { supabase } from "@/config/supabase";
import { useColorScheme } from "@/lib/useColorScheme";
import { colors } from "@/constants/colors";
import { Job, JobStatus, JobType } from "../(protected)/index";
import { getJobStatusColor, getJobTypeColor } from "@/lib/colors";

export default function JobDetailScreen() {
	const { id } = useLocalSearchParams<{ id: string }>();
	const [job, setJob] = useState<Job | null>(null);
	const [loading, setLoading] = useState(true);
	const router = useRouter();
	const { colorScheme } = useColorScheme();
	const isDark = colorScheme === "dark";

	useEffect(() => {
		if (id) {
			fetchJobDetails();
		}
	}, [id]);

	const fetchJobDetails = async () => {
		try {
			setLoading(true);

			const { data, error } = await supabase
				.from("jobs")
				.select(
					`
          *,
          project:projects(*),
          people_assignments:job_people_assignments(
            *,
            user:users(*)
          ),
          equipment_assignments:job_equipment_assignments(
            *,
            equipment:equipment(*)
          ),
          transportation_assignments:job_transportation_assignments(
            *,
            transportation:transportation(*)
          )
        `,
				)
				.eq("id", id)
				.single();

			if (error) {
				console.error("Error fetching job details:", error);
				return;
			}

			setJob(data as Job);
		} catch (error) {
			console.error("Error:", error);
		} finally {
			setLoading(false);
		}
	};

	const getJobColor = (jobType: JobType) => {
		return isDark
			? getJobTypeColor(jobType, "bgDark")
			: getJobTypeColor(jobType, "bg");
	};

	const getStatusColor = (status: JobStatus) => {
		return getJobStatusColor(status, "border");
	};

	const getTextColor = (jobType: JobType) => {
		return getJobTypeColor(jobType, "text");
	};

	const formatStatus = (status: JobStatus) => {
		return status.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
	};

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

	// Generate initials from name
	const getInitials = (firstName: string = "", lastName: string = "") => {
		const firstInitial = firstName ? firstName.charAt(0) : "";
		const lastInitial = lastName ? lastName.charAt(0) : "";
		return (firstInitial + lastInitial).toUpperCase();
	};

	if (loading) {
		return (
			<SafeAreaView className="flex-1 bg-background">
				<Stack.Screen
					options={{
						headerTitle: "Job Details",
						headerShown: true,
						presentation: "modal",
						headerStyle: {
							backgroundColor: isDark
								? colors.dark.background
								: colors.light.background,
						},
						headerTintColor: isDark
							? colors.dark.foreground
							: colors.light.foreground,
					}}
				/>
				<View className="flex-1 items-center justify-center">
					<ActivityIndicator
						size="large"
						color={isDark ? colors.dark.primary : colors.light.primary}
					/>
					<Text className="mt-4">Loading job details...</Text>
				</View>
			</SafeAreaView>
		);
	}

	if (!job) {
		return (
			<SafeAreaView className="flex-1 bg-background">
				<Stack.Screen
					options={{
						headerTitle: "Job Details",
						headerShown: true,
						presentation: "modal",
						headerStyle: {
							backgroundColor: isDark
								? colors.dark.background
								: colors.light.background,
						},
						headerTintColor: isDark
							? colors.dark.foreground
							: colors.light.foreground,
					}}
				/>
				<View className="flex-1 items-center justify-center p-4">
					<Text className="text-lg text-center">Job not found</Text>
					<TouchableOpacity
						className="mt-4 bg-primary px-4 py-2 rounded-md"
						onPress={() => router.back()}
					>
						<Text className="text-white">Go Back</Text>
					</TouchableOpacity>
				</View>
			</SafeAreaView>
		);
	}

	const jobColor = getJobColor(job.type);
	const jobTextColor = getTextColor(job.type);
	const borderColor = getJobTypeColor(job.type, "border");
	const statusColor = getStatusColor(job.status);
	const startDate = job.start_date ? new Date(job.start_date) : null;
	const endDate = job.end_date ? new Date(job.end_date) : null;

	return (
		<SafeAreaView className="flex-1 bg-background">
			<Stack.Screen
				options={{
					headerTitle: `Job ${job.job_number}`,
					headerShown: true,
					presentation: "modal",
					headerStyle: {
						backgroundColor: isDark
							? colors.dark.background
							: colors.light.background,
					},
					headerTintColor: isDark
						? colors.dark.foreground
						: colors.light.foreground,
				}}
			/>
			<ScrollView className="flex-1">
				{/* Job header */}
				<View
					style={[
						styles.jobHeader,
						{
							backgroundColor: jobColor,
							borderLeftWidth: 4,
							borderLeftColor: borderColor,
						},
					]}
				>
					<View className="flex-row justify-between items-center">
						<Text style={[styles.jobNumber, { color: jobTextColor }]}>
							#{job.job_number}
						</Text>
						<View
							style={[styles.statusBadge, { backgroundColor: statusColor }]}
						>
							<Text style={styles.statusText}>{formatStatus(job.status)}</Text>
						</View>
					</View>

					<Text style={[styles.jobType, { color: jobTextColor }]}>
						{job.type.toUpperCase()} JOB
					</Text>

					{job.project && (
						<Text style={[styles.projectName, { color: jobTextColor }]}>
							{job.project.name}
						</Text>
					)}
				</View>

				{/* Job details */}
				<View className="p-4">
					{/* Schedule section */}
					<View className="flex-row items-center mb-2">
						<Ionicons
							name="calendar"
							size={20}
							color={isDark ? colors.dark.primary : colors.light.primary}
						/>
						<H3 className="ml-2">Schedule</H3>
					</View>
					<View className="bg-card p-4 rounded-lg mb-2">
						{job.start_date && job.end_date ? (
							<View>
								<Text style={styles.dateDisplay}>
									{formatDate(job.start_date)}
								</Text>
								<View className="flex-row justify-between mt-2">
									<View>
										<Text className="text-sm text-muted-foreground">
											Start Time
										</Text>
										<Text className="text-base font-medium">
											{formatTime(job.start_date)}
										</Text>
									</View>
									<View>
										<Text className="text-sm text-muted-foreground text-right">
											End Time
										</Text>
										<Text className="text-base font-medium text-right">
											{formatTime(job.end_date)}
										</Text>
									</View>
								</View>
							</View>
						) : (
							<Text className="text-muted-foreground">Not scheduled</Text>
						)}
					</View>

					{/* Separator */}
					<View className="h-px bg-border my-4" />

					{/* Assigned People section */}
					<View className="flex-row items-center mb-2">
						<MaterialIcons
							name="people"
							size={20}
							color={isDark ? colors.dark.primary : colors.light.primary}
						/>
						<H3 className="ml-2">Assigned People</H3>
					</View>
					{job.people_assignments && job.people_assignments.length > 0 ? (
						<View className="bg-card p-4 rounded-lg mb-2">
							{job.people_assignments.map((assignment) => (
								<View key={assignment.id} className="mb-3 last:mb-0">
									<View className="flex-row items-center mb-1">
										{assignment.user?.photo ? (
											<Image
												source={{ uri: assignment.user.photo }}
												style={styles.avatar}
												className="rounded-full border-2 border-primary"
											/>
										) : (
											<View
												style={styles.avatar}
												className="bg-primary rounded-full items-center justify-center border-2 border-primary"
											>
												<Text className="text-white font-bold">
													{getInitials(
														assignment.user?.first_name,
														assignment.user?.last_name,
													)}
												</Text>
											</View>
										)}
										<View className="ml-3 flex-1">
											<Text className="font-medium">
												{assignment.user
													? `${assignment.user.first_name || ""} ${
															assignment.user.last_name || ""
														}`.trim()
													: "Unknown User"}
											</Text>
										</View>
									</View>
								</View>
							))}
						</View>
					) : (
						<View className="bg-card p-4 rounded-lg mb-2">
							<Text className="text-muted-foreground">No people assigned</Text>
						</View>
					)}

					{/* Separator */}
					<View className="h-px bg-border my-4" />

					{/* Assigned Equipment section */}
					<View className="flex-row items-center mb-2">
						<FontAwesome5
							name="tools"
							size={18}
							color={isDark ? colors.dark.primary : colors.light.primary}
						/>
						<H3 className="ml-2">Assigned Equipment</H3>
					</View>
					{job.equipment_assignments.length > 0 ? (
						<View className="bg-card p-4 rounded-lg mb-2">
							{job.equipment_assignments.map((assignment) => (
								<View key={assignment.id} className="mb-3 last:mb-0">
									<View className="flex-row justify-between mb-1">
										<Text className="font-medium">
											{assignment.equipment?.name || "Unknown Equipment"}
										</Text>
									</View>
								</View>
							))}
						</View>
					) : (
						<View className="bg-card p-4 rounded-lg mb-2">
							<Text className="text-muted-foreground">
								No equipment assigned
							</Text>
						</View>
					)}

					{/* Separator */}
					<View className="h-px bg-border my-4" />

					{/* Assigned Transportation section */}
					<View className="flex-row items-center mb-2">
						<FontAwesome5
							name="truck"
							size={18}
							color={isDark ? colors.dark.primary : colors.light.primary}
						/>
						<H3 className="ml-2">Assigned Transportation</H3>
					</View>
					{job.transportation_assignments.length > 0 ? (
						<View className="bg-card p-4 rounded-lg mb-2">
							{job.transportation_assignments.map((assignment) => (
								<View key={assignment.id} className="mb-3 last:mb-0">
									<View className="flex-row justify-between mb-1">
										<Text className="font-medium">
											{assignment.transportation?.name ||
												"Unknown Transportation"}
										</Text>
									</View>
								</View>
							))}
						</View>
					) : (
						<View className="bg-card p-4 rounded-lg mb-2">
							<Text className="text-muted-foreground">
								No transportation assigned
							</Text>
						</View>
					)}

					{/* Separator */}
					<View className="h-px bg-border my-4" />

					{/* Notes section */}
					<View className="flex-row items-center mb-2">
						<MaterialIcons
							name="description"
							size={20}
							color={isDark ? colors.dark.primary : colors.light.primary}
						/>
						<H3 className="ml-2">Notes</H3>
					</View>
					<View className="bg-card p-4 rounded-lg mb-2">
						{job.notes ? (
							<Text>{job.notes}</Text>
						) : (
							<Text className="text-muted-foreground">No notes</Text>
						)}
					</View>
				</View>
			</ScrollView>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	jobHeader: {
		padding: 16,
		marginBottom: 8,
	},
	jobNumber: {
		fontSize: 18,
		fontWeight: "bold",
	},
	statusBadge: {
		paddingHorizontal: 10,
		paddingVertical: 4,
		borderRadius: 12,
	},
	statusText: {
		fontSize: 12,
		fontWeight: "bold",
	},
	jobType: {
		fontSize: 14,
		marginTop: 4,
	},
	projectName: {
		fontSize: 16,
		fontWeight: "500",
		marginTop: 8,
	},
	dateDisplay: {
		fontSize: 22,
		fontWeight: "bold",
		textAlign: "center",
		marginBottom: 8,
	},
	avatar: {
		width: 40,
		height: 40,
		borderRadius: 20,
		borderWidth: 1,
		borderColor: "#ccc",
	},
	avatarPlaceholder: {
		width: 40,
		height: 40,
		borderRadius: 20,
		backgroundColor: "#e0e0e0",
		justifyContent: "center",
		alignItems: "center",
		borderWidth: 1,
		borderColor: "#ccc",
	},
	avatarText: {
		fontSize: 16,
		fontWeight: "bold",
		color: "#757575",
	},
});
