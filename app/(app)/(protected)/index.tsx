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
import { GestureHandlerRootView } from "react-native-gesture-handler";

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
import SwipeableDateView from "@/app/components/home/SwipeableDateView";

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
	const [jobsCache, setJobsCache] = useState<Record<string, Job[]>>({});
	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);
	const [currentDate, setCurrentDate] = useState(new Date());
	const { colorScheme } = useColorScheme();
	const isDark = colorScheme === "dark";
	const router = useRouter();

	// Calculate the height for each hour slot (60px per hour)
	const HOUR_HEIGHT = 60;

	// Helper function to format date as YYYY-MM-DD for cache keys
	const formatDateKey = useCallback((date: Date) => {
		return date.toISOString().split("T")[0];
	}, []);

	// Get adjacent dates for prefetching
	const getPrevDate = useCallback((date: Date) => {
		const prevDate = new Date(date);
		prevDate.setDate(prevDate.getDate() - 1);
		return prevDate;
	}, []);

	const getNextDate = useCallback((date: Date) => {
		const nextDate = new Date(date);
		nextDate.setDate(nextDate.getDate() + 1);
		return nextDate;
	}, []);

	// Initial data loading
	useEffect(() => {
		const loadInitialData = async () => {
			setLoading(true);

			// Fetch data for yesterday, today, and tomorrow on initial load
			const today = new Date();
			const yesterday = getPrevDate(today);
			const tomorrow = getNextDate(today);

			try {
				await Promise.all([
					fetchJobsForDate(yesterday),
					fetchJobsForDate(today),
					fetchJobsForDate(tomorrow),
				]);
			} catch (error) {
				console.error("Error loading initial data:", error);
			} finally {
				setLoading(false);
			}
		};

		loadInitialData();
	}, []);

	// Effect to fetch data when current date changes
	useEffect(() => {
		// Fetch jobs for current date and adjacent dates
		const fetchAllNeededDates = async () => {
			const prevDate = getPrevDate(currentDate);
			const nextDate = getNextDate(currentDate);

			const currentDateKey = formatDateKey(currentDate);
			const prevDateKey = formatDateKey(prevDate);
			const nextDateKey = formatDateKey(nextDate);

			// Check which dates we need to fetch
			const datesToFetch = [
				{ date: currentDate, key: currentDateKey },
				{ date: prevDate, key: prevDateKey },
				{ date: nextDate, key: nextDateKey },
			].filter(({ key }) => !jobsCache[key]);

			if (datesToFetch.length > 0) {
				setLoading(true);
				await Promise.all(
					datesToFetch.map(({ date }) => fetchJobsForDate(date)),
				);
				setLoading(false);
			}
		};

		fetchAllNeededDates();
	}, [currentDate]);

	// Prefetch additional days when we navigate to ensure smooth experience
	useEffect(() => {
		// Prefetch two days ahead and two days behind for smoother navigation
		const prefetchAdditionalDays = async () => {
			const twoDaysBefore = new Date(currentDate);
			twoDaysBefore.setDate(currentDate.getDate() - 2);

			const twoDaysAfter = new Date(currentDate);
			twoDaysAfter.setDate(currentDate.getDate() + 2);

			const twoDaysBeforeKey = formatDateKey(twoDaysBefore);
			const twoDaysAfterKey = formatDateKey(twoDaysAfter);

			// Only fetch if not already in cache
			const additionalFetches = [];

			if (!jobsCache[twoDaysBeforeKey]) {
				additionalFetches.push(fetchJobsForDate(twoDaysBefore));
			}

			if (!jobsCache[twoDaysAfterKey]) {
				additionalFetches.push(fetchJobsForDate(twoDaysAfter));
			}

			if (additionalFetches.length > 0) {
				// No need to set loading state for these additional prefetches
				await Promise.all(additionalFetches);
			}
		};

		// Run the prefetch after a short delay to prioritize the main view
		const timeoutId = setTimeout(() => {
			prefetchAdditionalDays();
		}, 1000);

		return () => clearTimeout(timeoutId);
	}, [currentDate, jobsCache]);

	const fetchJobsForDate = useCallback(
		async (date: Date) => {
			try {
				// Format the date for query (YYYY-MM-DD)
				const dateStr = date.toISOString().split("T")[0];
				const dateKey = formatDateKey(date);

				// Fetch jobs for the specified date with all related data
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

				// Update the jobs cache with the fetched data
				setJobsCache((prevCache) => ({
					...prevCache,
					[dateKey]: data || [],
				}));
			} catch (error) {
				console.error("Error:", error);
			}
		},
		[formatDateKey],
	);

	// Function to navigate to previous day
	const goToPreviousDay = useCallback(() => {
		const prevDay = getPrevDate(currentDate);
		setCurrentDate(prevDay);
	}, [currentDate, getPrevDate]);

	// Function to navigate to next day
	const goToNextDay = useCallback(() => {
		const nextDay = getNextDate(currentDate);
		setCurrentDate(nextDay);
	}, [currentDate, getNextDate]);

	// Function to go to today
	const goToToday = useCallback(() => {
		setCurrentDate(new Date());
	}, []);

	// Handle pull-to-refresh
	const onRefresh = useCallback(async () => {
		setRefreshing(true);

		// Clear cache for current date and fetch fresh data
		const currentDateKey = formatDateKey(currentDate);
		const prevDateKey = formatDateKey(getPrevDate(currentDate));
		const nextDateKey = formatDateKey(getNextDate(currentDate));

		// Remove these dates from cache to force a refresh
		setJobsCache((prevCache) => {
			const newCache = { ...prevCache };
			delete newCache[currentDateKey];
			delete newCache[prevDateKey];
			delete newCache[nextDateKey];
			return newCache;
		});

		// Fetch fresh data for current date
		await fetchJobsForDate(currentDate);

		// Also prefetch adjacent dates
		await Promise.all([
			fetchJobsForDate(getPrevDate(currentDate)),
			fetchJobsForDate(getNextDate(currentDate)),
		]);

		setRefreshing(false);
	}, [currentDate, formatDateKey, getPrevDate, getNextDate, fetchJobsForDate]);

	return (
		<SafeAreaView className="flex-1 bg-background">
			<DateNavigator
				currentDate={currentDate}
				onPreviousDay={goToPreviousDay}
				onNextDay={goToNextDay}
				onToday={goToToday}
			/>

			<GestureHandlerRootView style={{ flex: 1 }}>
				{loading && !refreshing ? (
					<View className="flex-1 items-center justify-center">
						<Text>Loading jobs...</Text>
					</View>
				) : (
					<SwipeableDateView
						jobs={jobsCache}
						currentDate={currentDate}
						onChangeDate={setCurrentDate}
						onRefresh={onRefresh}
						refreshing={refreshing}
						hourHeight={HOUR_HEIGHT}
						isDark={isDark}
						primaryColor={isDark ? colors.dark.primary : colors.light.primary}
					/>
				)}
			</GestureHandlerRootView>
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
