import React, { useRef, useState, useEffect } from "react";
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
  const translateX = useSharedValue(0);
  const scrollViewRef = useRef<ScrollView>(null);
  
  // Calculate position and height for a job based on its start and end times
  const getJobPosition = (job: Job) => {
    if (!job.start_date || !job.end_date) return { top: 0, height: 0 };

    const startDate = new Date(job.start_date);
    const endDate = new Date(job.end_date);

    // Calculate hours since midnight
    const startHours = startDate.getHours() + startDate.getMinutes() / 60;
    const endHours = endDate.getHours() + endDate.getMinutes() / 60;

    // Calculate position and height
    const top = startHours * hourHeight;
    const height = (endHours - startHours) * hourHeight;

    return { top, height };
  };

  // Get current date's jobs
  const currentDateKey = formatDateKey(currentDate);
  const currentJobs = jobs[currentDateKey] || [];

  // Render jobs for the current date
  const renderJobs = () => {
    return currentJobs.map((job) => {
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
      translateX.value = event.translationX;
    })
    .onEnd((event) => {
      if (Math.abs(event.velocityX) < 50 && Math.abs(event.translationX) < width / 3) {
        // If velocity is too low or distance is too short, reset position
        translateX.value = withTiming(0, { duration: 200 });
        return;
      }
      
      // Determine direction based on velocity or translation
      const direction = event.velocityX > 0 ? -1 : 1;
      
      // Animate to the next screen
      translateX.value = withTiming(direction * -width, { duration: 200 }, () => {
        // Reset position and update date
        runOnJS(handleDateChange)(direction);
        translateX.value = 0;
      });
    });

  // Animated styles for the swipeable view
  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateX.value }],
    };
  });

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View style={[styles.container, animatedStyle]}>
        <ScrollView
          ref={scrollViewRef}
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
            {renderJobs()}
            <CurrentTimeIndicator
              hourHeight={hourHeight}
              visible={isSameDay(currentDate, new Date())}
            />
          </View>
        </ScrollView>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
});
