import { useEffect, useState, useCallback } from "react";
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

// Import new components
import JobCard from "@/app/components/home/JobCard";
import HourMarkers from "@/app/components/home/HourMarkers";
import CurrentTimeIndicator from "@/app/components/home/CurrentTimeIndicator";
import DateNavigator from "@/app/components/home/DateNavigator";

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

	useEffect(() => {
		fetchJobs();
	}, [currentDate]);

	const fetchJobs = useCallback(async () => {
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
	}, [currentDate]);

	// Calculate position and height for a job based on its start and end times
	const getJobPosition = useCallback(
		(job: Job) => {
			if (!job.start_date || !job.end_date) return { top: 0, height: 0 };

			const startDate = new Date(job.start_date);
			const endDate = new Date(job.end_date);

			// Calculate hours since midnight
			const startHours = startDate.getHours() + startDate.getMinutes() / 60;
			const endHours = endDate.getHours() + endDate.getMinutes() / 60;

			// Calculate position and height
			const top = startHours * HOUR_HEIGHT;
			const height = (endHours - startHours) * HOUR_HEIGHT;

			return { top, height };
		},
		[HOUR_HEIGHT],
	);

	// Render jobs as positioned elements on the timeline
	const renderJobs = useCallback(() => {
		return jobs.map((job) => {
			if (!job.start_date || !job.end_date) return null;

			const { top, height } = getJobPosition(job);
			if (height <= 0) return null;

			return <JobCard key={job.id} job={job} top={top} height={height} />;
		});
	}, [jobs, getJobPosition]);

	// Function to navigate to previous day
	const goToPreviousDay = useCallback(() => {
		const prevDay = new Date(currentDate);
		prevDay.setDate(prevDay.getDate() - 1);
		setCurrentDate(prevDay);
	}, [currentDate]);

	// Function to navigate to next day
	const goToNextDay = useCallback(() => {
		const nextDay = new Date(currentDate);
		nextDay.setDate(nextDay.getDate() + 1);
		setCurrentDate(nextDay);
	}, [currentDate]);

	// Function to go to today
	const goToToday = useCallback(() => {
		setCurrentDate(new Date());
	}, []);

	// Handle pull-to-refresh
	const onRefresh = useCallback(async () => {
		setRefreshing(true);
		await fetchJobs();
	}, [fetchJobs]);

	return (
		<SafeAreaView className="flex-1 bg-background">
			<DateNavigator
				currentDate={currentDate}
				onPreviousDay={goToPreviousDay}
				onNextDay={goToNextDay}
				onToday={goToToday}
			/>

			{loading && !refreshing ? (
				<View className="flex-1 items-center justify-center">
					<Text>Loading jobs...</Text>
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
						<HourMarkers hourHeight={HOUR_HEIGHT} />
						{renderJobs()}
						<CurrentTimeIndicator
							hourHeight={HOUR_HEIGHT}
							visible={isSameDay(currentDate, new Date())}
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

const styles = StyleSheet.create({});
