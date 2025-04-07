import { useEffect, useState } from "react";
import {
	ScrollView,
	View,
	StyleSheet,
	Dimensions,
	TouchableOpacity,
	RefreshControl,
} from "react-native";
import { SafeAreaView } from "@/components/safe-area-view";
import { useRouter } from "expo-router";

import { Text } from "@/components/ui/text";
import { H1, Muted } from "@/components/ui/typography";
import { supabase } from "@/config/supabase";
import { useColorScheme } from "@/lib/useColorScheme";
import { colors } from "@/constants/colors";
import { getJobStatusColor, getJobTypeColor } from "@/lib/colors";

// Define job related types
export type JobType = "survey" | "data" | "cad" | "qa";

export type JobStatus =
	| "unscheduled"
	| "pre_booked"
	| "booked"
	| "completed"
	| "canceled"
	| "to_reschedule"
	| "in_progress";

export interface UserProfile {
	id: string;
	first_name?: string;
	last_name?: string;
	email?: string;
	photo?: string;
}

export interface Equipment {
	id: string;
	name?: string;
}

export interface Transportation {
	id: string;
	name?: string;
}

export interface Project {
	id: string;
	name?: string;
}

export type JobPeopleAssignment = {
	id: string;
	job: Job;
	user: UserProfile;
	is_lead: boolean;
	assigned_start_date: string;
	assigned_end_date: string;
	conflict: boolean;
};

export type JobEquipmentAssignment = {
	id: string;
	job: Job;
	equipment: Equipment;
	assigned_start_date: string;
	assigned_end_date: string;
	conflict: boolean;
};

export type JobTransportationAssignment = {
	id: string;
	job: Job;
	transportation: Transportation;
	assigned_start_date: string;
	assigned_end_date: string;
	conflict: boolean;
};

export interface Job {
	id: string;
	job_number: string;
	type: JobType;
	status: JobStatus;
	project: Project | null;
	start_date: string | null;
	end_date: string | null;
	notes: string | null;
	created_at: string | null;
	updated_at: string | null;
	people_assignments: JobPeopleAssignment[];
	equipment_assignments: JobEquipmentAssignment[];
	transportation_assignments: JobTransportationAssignment[];
}

export default function Home() {
	const [jobs, setJobs] = useState<Job[]>([]);
	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);
	const [currentDate, setCurrentDate] = useState(new Date());
	const { colorScheme } = useColorScheme();
	const isDark = colorScheme === "dark";
	const router = useRouter();

	// Calculate the height for each hour slot (60px per hour)
	const HOUR_HEIGHT = 60;
	const TOTAL_HEIGHT = HOUR_HEIGHT * 24;

	// Format date for display
	const formattedDate = currentDate.toLocaleDateString("en-US", {
		weekday: "long",
		year: "numeric",
		month: "long",
		day: "numeric",
	});

	useEffect(() => {
		fetchJobs();
	}, [currentDate]);

	const fetchJobs = async () => {
		try {
			setLoading(true);

			// Format the date for query (YYYY-MM-DD)
			const dateStr = currentDate.toISOString().split("T")[0];

			// Fetch jobs for the current date with all related data
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
				.gte("start_date", `${dateStr}T00:00:00`)
				.lt("end_date", `${dateStr}T23:59:59`)
				.order("start_date", { ascending: true });

			if (error) {
				console.error("Error fetching jobs:", error);
				return;
			}

			setJobs(data || []);
		} catch (error) {
			console.error("Error:", error);
		} finally {
			setLoading(false);
			setRefreshing(false);
		}
	};

	// Calculate position and height for a job based on its start and end times
	const getJobPosition = (job: Job) => {
		if (!job.start_date || !job.end_date) return { top: 0, height: 0 };

		const startDate = new Date(job.start_date);
		const endDate = new Date(job.end_date);

		// Calculate hours from midnight for positioning
		const startHours = startDate.getHours() + startDate.getMinutes() / 60;
		const endHours = endDate.getHours() + endDate.getMinutes() / 60;

		// Calculate top position and height
		const top = startHours * HOUR_HEIGHT;
		const height = (endHours - startHours) * HOUR_HEIGHT;

		return { top, height };
	};

	// Get color based on job type
	const getJobColor = (jobType: JobType) => {
		return isDark
			? getJobTypeColor(jobType, "bgDark")
			: getJobTypeColor(jobType, "bg");
	};

	// Get status indicator color
	const getStatusColor = (status: JobStatus) => {
		return getJobStatusColor(status, "border");
	};

	// Format status for display
	const formatStatus = (status: JobStatus) => {
		return status
			.split("_")
			.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
			.join(" ");
	};

	// Generate hour markers for the day
	const renderHourMarkers = () => {
		const hours = [];
		for (let i = 0; i < 24; i++) {
			const formattedHour = `${i.toString().padStart(2, "0")}:00`;
			hours.push(
				<View key={i} style={[styles.hourMarker, { top: i * HOUR_HEIGHT }]}>
					<Text style={[styles.hourText, isDark && styles.hourTextDark]}>
						{formattedHour}
					</Text>
					<View style={[styles.hourLine, isDark && styles.hourLineDark]} />
				</View>,
			);
		}
		return hours;
	};

	// Render jobs as positioned elements on the timeline
	const renderJobs = () => {
		return jobs.map((job) => {
			if (!job.start_date || !job.end_date) return null;

			const { top, height } = getJobPosition(job);
			if (height <= 0) return null;

			const jobColor = getJobColor(job.type);
			const statusColor = getStatusColor(job.status);
			const jobTextColor = getJobTypeColor(job.type, "text");

			// Get assigned people names
			const assignedPeople = job.people_assignments
				?.map((assignment) =>
					assignment.user
						? `${assignment.user.first_name || ""} ${assignment.user.last_name || ""}`.trim()
						: null,
				)
				.filter(Boolean)
				.join(", ");

			// Get project name
			const projectName = job.project?.name || "No Project";

			return (
				<TouchableOpacity
					key={job.id}
					style={[
						styles.jobItem,
						{
							top,
							height: height - 4, // Reduce height slightly to create space between jobs
							backgroundColor: jobColor,
							borderLeftWidth: 4,
							borderLeftColor: getJobTypeColor(job.type, "border"),
							marginBottom: 4, // Add margin between jobs
						},
					]}
					activeOpacity={0.7} // Increase active opacity (lower value = more opacity change)
					onPress={() =>
						router.push({
							pathname: "/modal/job",
							params: { id: job.id },
						})
					}
				>
					<View style={styles.jobHeader}>
						<Text style={[styles.jobTitle, { color: jobTextColor }]}>
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

					{height > 50 && (
						<>
							{assignedPeople && (
								<Text
									style={[styles.jobPeople, { color: jobTextColor }]}
									numberOfLines={1}
								>
									People: {assignedPeople}
								</Text>
							)}

							{job.notes && (
								<Text
									style={[styles.jobDescription, { color: jobTextColor }]}
									numberOfLines={Math.floor(height / 20) - 3}
								>
									{job.notes}
								</Text>
							)}
						</>
					)}
				</TouchableOpacity>
			);
		});
	};

	// Function to navigate to previous day
	const goToPreviousDay = () => {
		const prevDay = new Date(currentDate);
		prevDay.setDate(prevDay.getDate() - 1);
		setCurrentDate(prevDay);
	};

	// Function to navigate to next day
	const goToNextDay = () => {
		const nextDay = new Date(currentDate);
		nextDay.setDate(nextDay.getDate() + 1);
		setCurrentDate(nextDay);
	};

	// Function to go to today
	const goToToday = () => {
		setCurrentDate(new Date());
	};

	// Handle pull-to-refresh
	const onRefresh = async () => {
		setRefreshing(true);
		await fetchJobs();
	};

	return (
		<SafeAreaView className="flex-1 bg-background">
			<View className="p-4">
				<View className="flex-row justify-between items-center mb-2">
					<H1>{formattedDate}</H1>
				</View>

				<View className="flex-row justify-between items-center mb-4">
					<Text className="text-primary font-medium" onPress={goToPreviousDay}>
						Previous Day
					</Text>
					<Text className="text-primary font-medium" onPress={goToToday}>
						Today
					</Text>
					<Text className="text-primary font-medium" onPress={goToNextDay}>
						Next Day
					</Text>
				</View>
			</View>

			{loading && !refreshing ? (
				<View className="flex-1 items-center justify-center">
					<Text>Loading jobs...</Text>
				</View>
			) : jobs.length === 0 ? (
				<View className="flex-1 items-center justify-center p-4">
					<Muted className="text-center">No jobs scheduled for this day</Muted>
				</View>
			) : (
				<ScrollView
					className="flex-1"
					contentContainerStyle={{ paddingBottom: 20 }}
					refreshControl={
						<RefreshControl
							refreshing={refreshing}
							onRefresh={onRefresh}
							colors={[isDark ? colors.light.primary : colors.dark.primary]}
							tintColor={isDark ? colors.dark.primary : colors.light.primary}
						/>
					}
				>
					<View style={{ height: TOTAL_HEIGHT, position: "relative" }}>
						{renderHourMarkers()}
						{renderJobs()}

						{/* Current time indicator */}
						<View
							style={[
								styles.currentTimeIndicator,
								{
									top:
										(new Date().getHours() + new Date().getMinutes() / 60) *
										HOUR_HEIGHT,
									display: isSameDay(currentDate, new Date()) ? "flex" : "none",
								},
								isDark && styles.currentTimeIndicatorDark,
							]}
						/>
					</View>
				</ScrollView>
			)}
		</SafeAreaView>
	);
}

// Helper function to check if two dates are the same day
function isSameDay(date1: Date, date2: Date) {
	return (
		date1.getFullYear() === date2.getFullYear() &&
		date1.getMonth() === date2.getMonth() &&
		date1.getDate() === date2.getDate()
	);
}

const styles = StyleSheet.create({
	hourMarker: {
		position: "absolute",
		left: 0,
		right: 0,
		flexDirection: "row",
		alignItems: "center",
		paddingLeft: 10,
	},
	hourText: {
		width: 50,
		fontSize: 12,
		color: "#666",
	},
	hourTextDark: {
		color: "#aaa",
	},
	hourLine: {
		flex: 1,
		height: 1,
		backgroundColor: "#e0e0e0",
	},
	hourLineDark: {
		backgroundColor: "#333",
	},
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
		marginBottom: 2,
	},
	jobTitle: {
		fontWeight: "bold",
		color: "white",
		fontSize: 14,
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
		color: "white",
		fontSize: 12,
		marginBottom: 2,
	},
	jobPeople: {
		color: "white",
		fontSize: 12,
		marginTop: 2,
	},
	jobDescription: {
		color: "white",
		fontSize: 12,
		marginTop: 4,
	},
	currentTimeIndicator: {
		position: "absolute",
		left: 0,
		right: 0,
		height: 2,
		backgroundColor: "red",
		zIndex: 10,
	},
	currentTimeIndicatorDark: {
		backgroundColor: "#ff6b6b",
	},
});
