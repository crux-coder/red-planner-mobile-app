import React, { useRef } from "react";
import {
	View,
	StyleSheet,
	ScrollView,
	RefreshControl,
	Dimensions,
} from "react-native";
import { GestureDetector, Gesture } from "react-native-gesture-handler";
import Animated, {
	useSharedValue,
	useAnimatedStyle,
	withTiming,
	runOnJS,
} from "react-native-reanimated";

import HourMarkers from "./HourMarkers";
import CurrentTimeIndicator from "./CurrentTimeIndicator";
import JobCard from "./JobCard";
import { Job } from "@/app/(app)/(protected)/index";

interface SwipeableDateViewProps {
	jobs: Record<string, Job[]>;
	currentDate: Date;
	onChangeDate: (date: Date) => void;
	onRefresh: () => Promise<void>;
	refreshing: boolean;
	hourHeight: number;
	isDark: boolean;
	primaryColor: string;
}

// Helper function to format date as YYYY-MM-DD
const formatDateKey = (date: Date) => {
	return date.toISOString().split("T")[0];
};

// Helper function to check if two dates are the same day
const isSameDay = (date1: Date, date2: Date) => {
	return (
		date1.getFullYear() === date2.getFullYear() &&
		date1.getMonth() === date2.getMonth() &&
		date1.getDate() === date2.getDate()
	);
};

// Helper function to create a new date for the previous or next day
const getAdjacentDate = (date: Date, direction: -1 | 1): Date => {
	const newDate = new Date(date);
	newDate.setDate(newDate.getDate() + direction);
	return newDate;
};

export default function SwipeableDateView({
	jobs,
	currentDate,
	onChangeDate,
	onRefresh,
	refreshing,
	hourHeight,
	isDark,
	primaryColor,
}: SwipeableDateViewProps) {
	const TOTAL_HEIGHT = hourHeight * 24;
	const { width } = Dimensions.get("window");

	// Animation values
	const translateX = useSharedValue(-width); // Start at the middle screen (current day)

	// Scroll view refs for each day
	const prevDayScrollRef = useRef<ScrollView>(null);
	const currentDayScrollRef = useRef<ScrollView>(null);
	const nextDayScrollRef = useRef<ScrollView>(null);

	// Calculate position and height for a job based on its start and end times
	const getJobPosition = (job: Job) => {
		if (!job.start_date || !job.end_date) return { top: 0, height: 0 };

		const startDate = new Date(job.start_date);
		const endDate = new Date(job.end_date);

		// Calculate hours since midnight with precise time calculations
		// This ensures times like 8:30 appear exactly halfway between 8:00 and 9:00
		const startHours =
			startDate.getHours() +
			startDate.getMinutes() / 60 +
			startDate.getSeconds() / 3600;

		const endHours =
			endDate.getHours() +
			endDate.getMinutes() / 60 +
			endDate.getSeconds() / 3600;

		// Calculate position and height based on hourHeight
		// TODO: Figure out where the magic 11 comes from
		const top = startHours * hourHeight + 11;

		const height = Math.max((endHours - startHours) * hourHeight, 1); // Ensure minimum height of 1px

		return { top, height };
	};

	// Get date keys for current, previous and next day
	const prevDate = getAdjacentDate(currentDate, -1);
	const nextDate = getAdjacentDate(currentDate, 1);
	const currentDateKey = formatDateKey(currentDate);
	const prevDateKey = formatDateKey(prevDate);
	const nextDateKey = formatDateKey(nextDate);

	// Render jobs for a specific date
	const renderJobs = (dateKey: string) => {
		const dateJobs = jobs[dateKey] || [];

		return dateJobs.map((job) => {
			if (!job.start_date || !job.end_date) return null;

			const { top, height } = getJobPosition(job);
			if (height <= 0) return null;

			return <JobCard key={job.id} job={job} top={top} height={height} />;
		});
	};

	// Handle date change
	const handleDateChange = (direction: -1 | 1) => {
		const newDate = getAdjacentDate(currentDate, direction);
		onChangeDate(newDate);
	};

	// Gesture for horizontal swipe
	const panGesture = Gesture.Pan()
		.activeOffsetX([-20, 20])
		.onUpdate((event) => {
			translateX.value = -width + event.translationX;
		})
		.onEnd((event) => {
			if (
				Math.abs(event.velocityX) < 50 &&
				Math.abs(event.translationX) < width / 3
			) {
				// If velocity is too low or distance is too short, reset position
				translateX.value = withTiming(-width, { duration: 200 });
				return;
			}

			// Determine direction based on velocity or translation
			const direction = event.velocityX > 0 ? -1 : 1;

			// Animate to the next screen
			translateX.value = withTiming(
				-width + direction * -width,
				{ duration: 200 },
				() => {
					// Update date without immediately resetting position
					// This prevents the screen from blinking
					runOnJS(handleDateChange)(direction);

					// Reset position without animation
					translateX.value = -width;
				},
			);
		});

	// Animated styles for the swipeable view
	const animatedStyle = useAnimatedStyle(() => {
		return {
			transform: [{ translateX: translateX.value }],
		};
	});

	// Create a day view component
	const DayView = ({
		dateKey,
		date,
		scrollRef,
	}: {
		dateKey: string;
		date: Date;
		scrollRef: React.RefObject<ScrollView>;
	}) => (
		<View style={[styles.dayContainer, { width }]}>
			<ScrollView
				ref={scrollRef}
				style={styles.scrollView}
				contentContainerStyle={{ paddingBottom: 20 }}
				refreshControl={
					<RefreshControl
						refreshing={refreshing}
						onRefresh={onRefresh}
						colors={[primaryColor]}
						tintColor={primaryColor}
					/>
				}
			>
				<View style={{ height: TOTAL_HEIGHT, position: "relative" }}>
					<HourMarkers hourHeight={hourHeight} />
					{renderJobs(dateKey)}
					<CurrentTimeIndicator
						hourHeight={hourHeight}
						visible={isSameDay(date, new Date())}
					/>
				</View>
			</ScrollView>
		</View>
	);

	return (
		<GestureDetector gesture={panGesture}>
			<View style={[styles.container, { height: TOTAL_HEIGHT }]}>
				<Animated.View
					className="flex-1"
					style={[styles.daysContainer, animatedStyle]}
				>
					{/* Previous Day */}
					<DayView
						dateKey={prevDateKey}
						date={prevDate}
						scrollRef={prevDayScrollRef}
					/>

					{/* Current Day */}
					<DayView
						dateKey={currentDateKey}
						date={currentDate}
						scrollRef={currentDayScrollRef}
					/>

					{/* Next Day */}
					<DayView
						dateKey={nextDateKey}
						date={nextDate}
						scrollRef={nextDayScrollRef}
					/>
				</Animated.View>
			</View>
		</GestureDetector>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		overflow: "hidden",
	},
	daysContainer: {
		flexDirection: "row",
		width: Dimensions.get("window").width * 3,
	},
	dayContainer: {
		flex: 1,
	},
	scrollView: {
		flex: 1,
	},
});
