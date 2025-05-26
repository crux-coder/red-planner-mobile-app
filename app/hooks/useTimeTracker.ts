import { useState } from "react";
import { useRouter } from "expo-router";
import { supabase } from "@/config/supabase";
import { toLocalTimestamp } from "@/lib/utils";
import { TimeBlock, UserProfile } from "@/app/models/types";

// Define TimeBlockType enum
export type TimeBlockType = "shift" | "break" | "job" | "overtime" | "regular";

// Define a fixed split point configuration
interface FixedSplitPoint {
	id: string;
	name: string;
	hour: number;
	minute: number;
	coefficient: number;
}

// Define fixed split points (night shift start/end)
const FIXED_SPLIT_POINTS: ReadonlyArray<FixedSplitPoint> = [
	{
		id: "night_shift_start",
		name: "Night Shift Start",
		hour: 22, // 10 PM
		minute: 0,
		coefficient: 1.5, // 25% premium for night shift
	},
	{
		id: "night_shift_end",
		name: "Night Shift End",
		hour: 6, // 6 AM
		minute: 0,
		coefficient: 1, // Regular rate after night shift ends
	},
];

export type ActionType =
	| "break"
	| "endbreak"
	| "overtime"
	| "job"
	| "clockout"
	| "completejob";

interface UseTimeTrackerProps {
	userProfile: UserProfile | null;
	currentShift: TimeBlock | null;
	onShiftChange: (newShift: TimeBlock | null) => void;
	onFetchCurrentShift: () => Promise<void>;
}

export const useTimeTracker = ({
	userProfile,
	currentShift,
	onShiftChange,
	onFetchCurrentShift,
}: UseTimeTrackerProps) => {
	const [processingAction, setProcessingAction] = useState(false);
	const [clockingOut, setClockingOut] = useState(false);
	const router = useRouter();

	// Helper function to create a timestamp at a specific hour and minute on a given date
	const createTimestampAt = (
		baseDate: Date,
		hour: number,
		minute: number,
	): Date => {
		const date = new Date(baseDate);
		date.setHours(hour, minute, 0, 0);
		return date;
	};

	// Helper function to create a new timeblock in the database
	const createTimeBlock = async (data: any) => {
		const { error } = await supabase.from("time_blocks").insert(data);
		if (error) {
			console.error("Error creating timeblock:", error);
			throw new Error(`Failed to create timeblock: ${error.message}`);
		}
	};

	// Check if two dates are on the same day
	const isSameDay = (date1: Date, date2: Date): boolean => {
		return (
			date1.getDate() === date2.getDate() &&
			date1.getMonth() === date2.getMonth() &&
			date1.getFullYear() === date2.getFullYear()
		);
	};

	// Define an interface for time segments with additional metadata
	interface TimeSegment {
		start: Date; // Start time of this segment
		end: Date; // End time of this segment
		type: "day_boundary" | "night_shift" | "regular"; // Type of segment
		day: number; // Day number (1 = first day, 2 = second day, etc.)
		name: string; // Name of the segment (for labeling)
		coefficient: number; // Pay rate coefficient
	}

	// We're using the createTimestampAt function defined above

	// Pure function to get all day boundary segments
	const getDayBoundarySegments = (
		startTime: Date,
		endTime: Date,
	): TimeSegment[] => {
		// If the shift is within the same day, return a single segment
		if (isSameDay(startTime, endTime)) {
			return [
				{
					day: 1,
					start: startTime,
					end: endTime,
					type: "regular",
					name: "Day 1",
					coefficient: 1,
				},
			];
		}

		const segments: TimeSegment[] = [];

		// First day (partial) - from start time to end of day
		const firstDayEnd = new Date(startTime);
		firstDayEnd.setHours(23, 59, 59, 999);

		segments.push({
			day: 1,
			start: startTime,
			end: firstDayEnd,
			type: "regular",
			name: "Day 1",
			coefficient: 1,
		});

		// Generate segments for all days between start and end
		const daysInBetween = getDaysInBetween(startTime, endTime);

		// Add segments for middle days (if any)
		daysInBetween.forEach((day, index) => {
			segments.push({
				day: index + 2, // Day 2, 3, etc.
				start: new Date(day), // 00:00:00
				end: setEndOfDay(new Date(day)), // 23:59:59.999
				type: "regular",
				name: `Day ${index + 2}`,
				coefficient: 1,
			});
		});

		// Last day (partial) - from start of day to end time
		if (!isSameDay(startTime, endTime)) {
			const lastDayStart = new Date(endTime);
			lastDayStart.setHours(0, 0, 0, 0);

			segments.push({
				day: segments.length + 1,
				start: lastDayStart,
				end: endTime,
				type: "regular",
				name: `Day ${segments.length + 1}`,
				coefficient: 1,
			});
		}

		return segments;
	};

	// Pure function to get array of dates between start and end dates (for days in between)
	const getDaysInBetween = (startDate: Date, endDate: Date): Date[] => {
		const dates: Date[] = [];

		// Start with day after start date
		const start = new Date(startDate);
		start.setDate(start.getDate() + 1);
		start.setHours(0, 0, 0, 0);

		// End with day before end date
		const end = new Date(endDate);
		end.setHours(0, 0, 0, 0);

		// Add each day in between
		let current = new Date(start);
		while (current < end) {
			dates.push(new Date(current));
			current.setDate(current.getDate() + 1);
		}

		return dates;
	};

	// Pure function to set a date to end of day (23:59:59.999)
	const setEndOfDay = (date: Date): Date => {
		const result = new Date(date);
		result.setHours(23, 59, 59, 999);
		return result;
	};

	// Pure function to check if a time falls within a night shift period on a specific day
	const isInNightShiftPeriod = (time: Date): boolean => {
		const hour = time.getHours();
		// Night shift is from 10 PM (22) to 6 AM (6)
		return hour >= 22 || hour < 6;
	};

	// Pure function to get fixed split points (night shift start/end) for a specific day
	const getFixedSplitPointsForDay = (
		day: Date,
		startTime: Date,
		endTime: Date,
	): TimeSegment[] => {
		const segments: TimeSegment[] = [];

		// Create bounds for this day
		const dayStart = new Date(day);
		dayStart.setHours(0, 0, 0, 0);

		const dayEnd = new Date(day);
		dayEnd.setHours(23, 59, 59, 999);

		// Create effective bounds (considering the actual shift start/end)
		const effectiveStart = startTime > dayStart ? startTime : dayStart;
		const effectiveEnd = endTime < dayEnd ? endTime : dayEnd;

		// Check each fixed split point
		FIXED_SPLIT_POINTS.forEach((splitPoint) => {
			const splitTime = createTimestampAt(
				day,
				splitPoint.hour,
				splitPoint.minute,
			);

			// Only consider split points that fall within the effective range
			if (splitTime > effectiveStart && splitTime < effectiveEnd) {
				// For now, just record the split point - we'll combine them into segments later
				segments.push({
					start: splitTime,
					end: splitTime, // Temporary - will be adjusted later
					type: "night_shift",
					day: getDayNumber(day, startTime),
					name: splitPoint.name,
					coefficient: splitPoint.coefficient,
				});
			}
		});

		return segments;
	};

	// Pure function to get day number relative to the start time
	const getDayNumber = (day: Date, startTime: Date): number => {
		const startDay = new Date(startTime);
		startDay.setHours(0, 0, 0, 0);

		const dayToCheck = new Date(day);
		dayToCheck.setHours(0, 0, 0, 0);

		const diffTime = dayToCheck.getTime() - startDay.getTime();
		const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

		return diffDays + 1; // Day 1, 2, 3, etc.
	};

	// Main function to get all time segments with proper splits
	const getAllTimeSegments = (
		startTime: Date,
		endTime: Date,
	): TimeSegment[] => {
		// First, get day boundary segments
		const daySegments = getDayBoundarySegments(startTime, endTime);
		const finalSegments: TimeSegment[] = [];

		// For each day segment, check if it needs to be split for night shift
		daySegments.forEach((segment) => {
			const segmentStart = segment.start;
			const segmentEnd = segment.end;
			const dayNumber = segment.day;

			// Check if this segment crosses any night shift boundaries
			const nightShiftStart = createTimestampAt(new Date(segmentStart), 22, 0); // 10 PM
			const nextDay = new Date(segmentStart);
			nextDay.setDate(nextDay.getDate() + 1);
			const nightShiftEnd = createTimestampAt(nextDay, 6, 0); // 6 AM next day

			// Adjust night shift timestamps if they fall outside the segment
			if (nightShiftStart < segmentStart) {
				// If segment starts after 10 PM, no need to adjust
			} else if (nightShiftStart > segmentEnd) {
				// Night shift start is after segment end, so only check night shift end
				if (nightShiftEnd > segmentStart && nightShiftEnd < segmentEnd) {
					// Night shift ends during this segment
					finalSegments.push({
						start: segmentStart,
						end: nightShiftEnd,
						type: "night_shift",
						day: dayNumber,
						name: "Night Shift",
						coefficient: 1.25,
					});

					finalSegments.push({
						start: nightShiftEnd,
						end: segmentEnd,
						type: "regular",
						day: dayNumber,
						name: `Day ${dayNumber}`,
						coefficient: 1,
					});
				} else {
					// Segment is entirely within night shift
					finalSegments.push({
						start: segmentStart,
						end: segmentEnd,
						type: "night_shift",
						day: dayNumber,
						name: "Night Shift",
						coefficient: 1.25,
					});
				}
			} else {
				// Night shift starts during this segment
				finalSegments.push({
					start: segmentStart,
					end: nightShiftStart,
					type: "regular",
					day: dayNumber,
					name: `Day ${dayNumber}`,
					coefficient: 1,
				});

				if (nightShiftEnd < segmentEnd) {
					// Night shift ends during this segment too
					finalSegments.push({
						start: nightShiftStart,
						end: nightShiftEnd,
						type: "night_shift",
						day: dayNumber,
						name: "Night Shift",
						coefficient: 1.25,
					});

					finalSegments.push({
						start: nightShiftEnd,
						end: segmentEnd,
						type: "regular",
						day: dayNumber,
						name: `Day ${dayNumber}`,
						coefficient: 1,
					});
				} else {
					// Night shift continues past segment end
					finalSegments.push({
						start: nightShiftStart,
						end: segmentEnd,
						type: "night_shift",
						day: dayNumber,
						name: "Night Shift",
						coefficient: 1.25,
					});
				}
			}
		});

		// If no segments were created (which should never happen), return the original day segments
		if (finalSegments.length === 0) {
			return daySegments;
		}

		return finalSegments;
	};

	// Update a timeblock in the database
	const updateTimeBlock = async (
		id: string,
		endTime: string,
	): Promise<void> => {
		const { error } = await supabase
			.from("time_blocks")
			.update({ end_time: endTime })
			.eq("id", id);

		if (error) {
			console.error("Error updating timeblock:", error);
			throw new Error(`Failed to update timeblock: ${error.message}`);
		}
	};

	// Pure function to create a timeblock segment with given start and end times
	const createTimeBlockSegment = async (
		segment: TimeSegment,
		shiftData: TimeBlock,
	): Promise<void> => {
		if (!userProfile) return;

		// Skip segments with zero duration (safety check)
		if (segment.start.getTime() >= segment.end.getTime()) return;

		// Build the note prefix based on segment type and name
		const notePrefix = `${segment.name} (${formatTimeRange(segment.start, segment.end)})`;

		// Create a new timeblock for this segment
		await createTimeBlock({
			worker_id: userProfile.id,
			category: shiftData.category,
			type: shiftData.type,
			coefficient: segment.coefficient,
			start_time: toLocalTimestamp(segment.start),
			end_time: toLocalTimestamp(segment.end),
			notes: `${notePrefix} - ${shiftData.notes || ""}`,
			job_id: shiftData.job_id,
		});
	};

	// Helper function to format a time range for notes
	const formatTimeRange = (start: Date, end: Date): string => {
		const formatTime = (date: Date): string => {
			return date.toLocaleTimeString([], {
				hour: "2-digit",
				minute: "2-digit",
			});
		};

		return `${formatTime(start)} - ${formatTime(end)}`;
	};

	// Main function to end the current shift, splitting at day boundaries and fixed points
	const endCurrentShift = async () => {
		if (!userProfile || !currentShift) return null;

		const now = new Date();
		const nowTimestamp = toLocalTimestamp(now);
		const startTime = new Date(currentShift.start_time);

		// Store a copy of the current shift data for use in creating segments
		const shiftData = { ...currentShift };

		try {
			// Get all time segments with proper splits
			const timeSegments = getAllTimeSegments(startTime, now);

			// No segments should never happen, but handle it anyway
			if (timeSegments.length === 0) {
				await updateTimeBlock(currentShift.id, nowTimestamp);
				return nowTimestamp;
			}

			// Update the original timeblock to end at the first segment's end
			const firstSegment = timeSegments[0];
			await updateTimeBlock(
				currentShift.id,
				toLocalTimestamp(firstSegment.end),
			);

			// Create timeblocks for all remaining segments
			for (let i = 1; i < timeSegments.length; i++) {
				await createTimeBlockSegment(timeSegments[i], shiftData);
			}

			return nowTimestamp;
		} catch (error) {
			console.error("Error during shift splitting:", error);
			throw error;
		}
	};

	// Utility function to start a new shift
	const startNewShift = async (
		category: string,
		type: string,
		coefficient: number,
		notes: string = "",
		jobId?: string,
	) => {
		if (!userProfile) return null;

		const now = toLocalTimestamp(new Date());
		const newShiftData: any = {
			worker_id: userProfile.id,
			category,
			type,
			coefficient,
			start_time: now,
			end_time: null,
			notes,
		};

		if (jobId) {
			newShiftData.related_job_id = jobId;
		}

		const { data, error } = await supabase
			.from("time_blocks")
			.insert(newShiftData)
			.select()
			.single();

		if (error) {
			console.error(`Error starting ${category} shift:`, error);
			throw new Error(`Failed to start ${category} shift: ${error.message}`);
		}

		return data;
	};

	// Update job status
	const updateJobStatus = async (jobId: string, status: string) => {
		if (!jobId) return;

		const { error } = await supabase
			.from("calendar_entries")
			.update({ job_status: status })
			.eq("id", jobId);

		if (error) {
			console.error("Error updating job status:", error);
			throw new Error(`Failed to update job status: ${error.message}`);
		}
	};

	// Action handlers
	const handleBreak = async () => {
		await endCurrentShift();
		const breakShift = await startNewShift("break", "regular", 0);
		onShiftChange(breakShift);
	};

	const handleEndBreak = async () => {
		await endCurrentShift();
		const newShift = await startNewShift("shift", "regular", 1);
		onShiftChange(newShift);
	};

	const handleOvertime = async (customCoefficient: number | null) => {
		await endCurrentShift();
		const coefficient = customCoefficient || 1.5;
		const overtimeShift = await startNewShift(
			"overtime",
			"regular",
			coefficient,
		);
		onShiftChange(overtimeShift);
	};

	const handleJob = async () => {
		router.push("/tracker/job");
	};

	const handleClockOut = async () => {
		await endCurrentShift();
		onShiftChange(null);
	};

	const handleCompleteJob = async () => {
		if (!currentShift) return;

		await endCurrentShift();

		// Update job status to completed if job_id is present
		if (currentShift.job_id) {
			await updateJobStatus(currentShift.job_id, "completed");
		}

		const newShift = await startNewShift("shift", "regular", 1);
		onShiftChange(newShift);
	};

	// Main function to perform actions
	const performAction = async (
		actionType: ActionType,
		customCoefficient: number | null = null,
	) => {
		if (!userProfile || !currentShift) return;

		try {
			setProcessingAction(true);
			if (actionType === "clockout") {
				setClockingOut(true);
			}

			switch (actionType) {
				case "break":
					await handleBreak();
					break;
				case "endbreak":
					await handleEndBreak();
					break;
				case "overtime":
					await handleOvertime(customCoefficient);
					break;
				case "job":
					await handleJob();
					break;
				case "clockout":
					await handleClockOut();
					break;
				case "completejob":
					await handleCompleteJob();
					break;
			}
		} catch (error) {
			console.error("Error processing action:", error);
			// If there was an error, refresh the current shift to ensure UI is in sync
			await onFetchCurrentShift();
		} finally {
			setProcessingAction(false);
			setClockingOut(false);
		}
	};

	return {
		performAction,
		processingAction,
		clockingOut,
		// Export utility functions for direct use if needed
		utils: {
			endCurrentShift,
			startNewShift,
			updateJobStatus,
		},
	};
};
