import { useEffect, useState, useCallback, useRef } from "react";
import {
	View,
	ScrollView,
	RefreshControl,
	TouchableOpacity,
	Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text } from "@/components/ui/text";
import { supabase } from "@/config/supabase";
import { useColorScheme } from "@/lib/useColorScheme";
import { colors } from "@/constants/colors";
import { Ionicons } from "@expo/vector-icons";
import { useSupabase } from "@/context/supabase-provider";
import HourMarkers from "@/app/components/home/HourMarkers";
import CurrentTimeIndicator from "@/app/components/home/CurrentTimeIndicator";
import JobCard from "@/app/components/home/JobCard";
import { useFocusEffect } from "@react-navigation/native";

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

// Define Project interface
export interface Project {
	id: string;
	name: string;
	client?: string;
	description?: string;
}

// Define UserProfile interface
export interface UserProfile {
	id: string;
	first_name?: string;
	last_name?: string;
	email?: string;
	photo?: string;
	role?: string;
	title?: string;
	phone_number?: string;
}

export interface Job {
	id: string;
	title: string;
	description?: string;
	start_date: string;
	end_date: string;
	type: JobType;
	status: JobStatus;
	job_number?: string;
	project?: Project;
	notes?: string;
	people_assignments: {
		id: string;
		user: UserProfile;
	}[];
	equipment_assignments: {
		id: string;
		equipment: {
			id: string;
			name: string;
			type?: string;
		};
	}[];
	transportation_assignments: {
		id: string;
		transportation: {
			id: string;
			name: string;
			type?: string;
		};
	}[];
}

export default function Home() {
	const [jobsCache, setJobsCache] = useState<Record<string, Job[]>>({});
	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);
	const [currentDate, setCurrentDate] = useState(new Date());
	const { colorScheme } = useColorScheme();
	const isDark = colorScheme === "dark";
	const { userProfile } = useSupabase();
	const scrollViewRef = useRef<ScrollView>(null);

	// Calculate the height for each hour slot (60px per hour)
	const HOUR_HEIGHT = 60;

	// Function to scroll to current time
	const scrollToCurrentTime = useCallback(() => {
		if (!scrollViewRef.current) return;
		
		const currentHour = new Date().getHours();
		const currentMinute = new Date().getMinutes();
		
		// Calculate position based on current time
		const currentTimePosition = (currentHour + currentMinute / 60) * HOUR_HEIGHT + 11;
		
		// Get screen height to center the current time line
		const screenHeight = Dimensions.get('window').height;
		const headerHeight = 100; // Approximate height of the header
		const scrollPosition = Math.max(0, currentTimePosition - (screenHeight - headerHeight) / 2);
		
		// Scroll to the calculated position
		scrollViewRef.current.scrollTo({ y: scrollPosition, animated: true });
	}, [HOUR_HEIGHT]);

	// Helper function to format date as YYYY-MM-DD for cache keys
	const formatDateKey = useCallback((date: Date) => {
		return date.toISOString().split("T")[0];
	}, []);

	// Get adjacent dates for navigation
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

	const loadInitialData = async () => {
		setLoading(true);

		// Fetch data for today
		const today = new Date();

		try {
			await fetchJobsForDate(today);
		} catch (error) {
			console.error("Error loading initial data:", error);
		} finally {
			setLoading(false);
		}
	};

	// Initial data loading
	useFocusEffect(
		useCallback(() => {
			loadInitialData();
			
			// Scroll to current time after data is loaded
			setTimeout(() => {
				scrollToCurrentTime();
			}, 300); // Small delay to ensure component is fully rendered
		}, [scrollToCurrentTime]),
	);

	// Refresh data for the current date
	const handleRefresh = useCallback(async () => {
		setRefreshing(true);
		try {
			await fetchJobsForDate(currentDate);
		} catch (error) {
			console.error("Error refreshing data:", error);
		} finally {
			setRefreshing(false);
		}
	}, [currentDate]);

	const fetchJobsForDate = useCallback(
		async (date: Date) => {
			if (!userProfile) return;

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
					people_assignments:job_people_assignments!inner(
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
					// Filter jobs where this user is assigned
					.eq("job_people_assignments.user", userProfile?.id || "")
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
		[formatDateKey, userProfile?.id],
	);

	// Function to navigate to previous day
	const goToPreviousDay = useCallback(() => {
		const prevDate = getPrevDate(currentDate);
		setCurrentDate(prevDate);

		// Fetch data for the previous day if not in cache
		const prevDateKey = formatDateKey(prevDate);
		if (!jobsCache[prevDateKey]) {
			fetchJobsForDate(prevDate);
		}
	}, [currentDate, jobsCache, getPrevDate, formatDateKey, fetchJobsForDate]);

	// Function to navigate to next day
	const goToNextDay = useCallback(() => {
		const nextDate = getNextDate(currentDate);
		setCurrentDate(nextDate);

		// Fetch data for the next day if not in cache
		const nextDateKey = formatDateKey(nextDate);
		if (!jobsCache[nextDateKey]) {
			fetchJobsForDate(nextDate);
		}
	}, [currentDate, jobsCache, getNextDate, formatDateKey, fetchJobsForDate]);

	const goToToday = useCallback(() => {
		const today = new Date();
		setCurrentDate(today);

		// Fetch data for today if not in cache
		const todayKey = formatDateKey(today);
		if (!jobsCache[todayKey]) {
			fetchJobsForDate(today);
		}
		
		// Scroll to current time after navigating to today
		setTimeout(() => {
			scrollToCurrentTime();
		}, 300);
	}, [currentDate, jobsCache, formatDateKey, fetchJobsForDate, scrollToCurrentTime]);

	// Format the current date for display
	const formattedDate = new Intl.DateTimeFormat("en-US", {
		weekday: "long",
		year: "numeric",
		month: "long",
		day: "numeric",
	}).format(currentDate);



	// Get jobs for the current date
	const currentDateKey = formatDateKey(currentDate);
	const currentJobs = jobsCache[currentDateKey] || [];

	return (
		<SafeAreaView className="flex-1 bg-background" edges={["top"]}>
			{/* Date Navigation Header */}
			<View className="flex-row items-center justify-between p-4 border-b border-border">
				<TouchableOpacity onPress={goToPreviousDay}>
					<Ionicons
						name="chevron-back"
						size={24}
						color={isDark ? colors.dark.foreground : colors.light.foreground}
					/>
				</TouchableOpacity>

				<TouchableOpacity onPress={goToToday}>
					<Text
						className="text-lg font-semibold"
						style={[
							{
								color: isDark
									? colors.dark.foreground
									: colors.light.foreground,
							},
						]}
					>
						{formattedDate}
					</Text>
				</TouchableOpacity>

				<TouchableOpacity onPress={goToNextDay}>
					<Ionicons
						name="chevron-forward"
						size={24}
						color={isDark ? colors.dark.foreground : colors.light.foreground}
					/>
				</TouchableOpacity>
			</View>
		<View className="flex-1 bg-background">
			{/* Schedule View */}
			<ScrollView
				ref={scrollViewRef}
				className="flex-1 bg-background"
				contentContainerStyle={{ minHeight: 24 * HOUR_HEIGHT }}
				refreshControl={
					<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
				}
				onContentSizeChange={() => {
					// Scroll to current time when content size changes (e.g., after initial render)
					if (currentDateKey === formatDateKey(new Date())) {
						scrollToCurrentTime();
					}
				}}
			>
				{/* Hour markers */}
				<HourMarkers hourHeight={HOUR_HEIGHT} />

				{/* Current time indicator */}
				<CurrentTimeIndicator hourHeight={HOUR_HEIGHT} visible={true} />
					{/* Job cards */}
					{currentJobs.map((job) => {
						// Parse job start and end times
						const startDate = new Date(job.start_date);
						const endDate = new Date(job.end_date);

						// Calculate position and height based on start/end times
						const startHour = startDate.getHours();
						const startMinute = startDate.getMinutes();
						const endHour = endDate.getHours();
						const endMinute = endDate.getMinutes();

						// Calculate position (in pixels) from the top
						const startPosition = (startHour + startMinute / 60) * HOUR_HEIGHT;

						// Calculate height based on duration
						const durationHours =
							endHour - startHour + (endMinute - startMinute) / 60;
						const height = Math.max(durationHours * HOUR_HEIGHT, 50); // Minimum height of 50px

						// Create a position style object for the job card
						const positionStyle = {
							position: "absolute" as const,
							top: startPosition + 11, // Add 11px offset to align with hour markers
							height,
							left: 60, // Leave space for hour markers
							right: 10,
						};

						return (
							<JobCard key={job.id} job={job} positionStyle={positionStyle} />
						);
					})}
				</ScrollView>
			</View>
		</SafeAreaView>
	);
}
