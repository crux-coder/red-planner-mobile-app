import React, { useState, useEffect, useCallback } from "react";
import {
	View,
	ScrollView,
	TouchableOpacity,
	ActivityIndicator,
	RefreshControl,
	Alert,
	Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text } from "@/components/ui/text";
import { H1, Muted } from "@/components/ui/typography";
import { supabase } from "@/config/supabase";
import { useColorScheme } from "@/lib/useColorScheme";
import { colors } from "@/constants/colors";
import { Ionicons } from "@expo/vector-icons";
import { ProjectTask } from "@/app/models/types";
import { format, parseISO, isToday, isPast, isFuture } from "date-fns";
import { useSupabase } from "@/context/supabase-provider";

type TabType = "todo" | "completed";

import { useFocusEffect } from "@react-navigation/native";

export default function Tasks() {
	const [tasks, setTasks] = useState<ProjectTask[]>([]);
	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);
	const [activeTab, setActiveTab] = useState<TabType>("todo");
	const { colorScheme } = useColorScheme();
	const isDark = colorScheme === "dark";
	const { userProfile } = useSupabase();

	// Fetch tasks based on the active tab
	const fetchTasks = useCallback(async () => {
		try {
			setLoading(true);

			// Only fetch tasks matching the current tab's completion status
			const isCompleted = activeTab === "completed";

			let query = supabase
				.from("project_tasks")
				.select(
					`
          *,
          project:projects(*),
          assigned_to:users(*)
        `,
				)
				.eq("completed", isCompleted);

			// Filter tasks based on user ID
			if (userProfile) {
				console.log("Filtering tasks for user ID:", userProfile.id);
				query = query.eq("assigned_to", userProfile.id);
			}

			// Add ordering
			query = query
				.order("due_at", { ascending: true })
				.order("created_at", { ascending: false });

			const { data, error } = await query;

			if (error) {
				console.error("Error fetching tasks:", error);
				return;
			}

			// Sort tasks: null due dates at the end, then by due date, then by creation date
			const sortedTasks = [...(data || [])].sort((a, b) => {
				// If both have due dates, sort by due date
				if (a.due_at && b.due_at) {
					return new Date(a.due_at).getTime() - new Date(b.due_at).getTime();
				}
				// If only a has due date, a comes first
				if (a.due_at && !b.due_at) return -1;
				// If only b has due date, b comes first
				if (!a.due_at && b.due_at) return 1;
				// If neither has due date, sort by created_at (newest first)
				return (
					new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
				);
			});

			setTasks(sortedTasks);
		} catch (error) {
			console.error("Error:", error);
		} finally {
			setLoading(false);
			setRefreshing(false);
		}
	}, [activeTab, userProfile]);

	// Refresh tasks when navigating to this tab
	useFocusEffect(
		useCallback(() => {
			fetchTasks();
		}, [activeTab]),
	);

	const toggleTaskCompletion = async (task: ProjectTask) => {
		try {
			const newCompletedStatus = !task.completed;
			const completedAt = newCompletedStatus ? new Date().toISOString() : null;

			const { error } = await supabase
				.from("project_tasks")
				.update({
					completed: newCompletedStatus,
					completed_at: completedAt,
				})
				.eq("id", task.id);

			if (error) {
				console.error("Error updating task:", error);
				Alert.alert("Error", "Failed to update task status");
				return;
			}

			// After updating, refresh the tasks to reflect the changes
			fetchTasks();
		} catch (error) {
			console.error("Error:", error);
			Alert.alert("Error", "An unexpected error occurred");
		}
	};

	const onRefresh = async () => {
		setRefreshing(true);
		await fetchTasks();
	};

	const formatDueDate = (dueAt: string | null) => {
		if (!dueAt) return "No due date";

		const date = parseISO(dueAt);

		if (isToday(date)) {
			return `Today, ${format(date, "h:mm a")}`;
		} else if (isPast(date)) {
			return `Overdue: ${format(date, "MMM d, yyyy")}`;
		} else {
			return format(date, "MMM d, yyyy");
		}
	};

	const getDueDateColor = (dueAt: string | null, completed: boolean) => {
		if (completed) return isDark ? "#6B7280" : "#9CA3AF"; // Gray for completed tasks
		if (!dueAt) return isDark ? "#6B7280" : "#9CA3AF"; // Gray for no due date

		const date = parseISO(dueAt);

		if (isPast(date)) {
			return "#EF4444"; // Red for overdue
		} else if (isToday(date)) {
			return "#F59E0B"; // Amber for today
		} else {
			return isDark ? "#D1D5DB" : "#4B5563"; // Default text color
		}
	};

	// Render tab button
	const TabButton = ({
		title,
		tabKey,
		count,
	}: {
		title: string;
		tabKey: TabType;
		count?: number;
	}) => (
		<Pressable
			onPress={() => setActiveTab(tabKey)}
			className={`flex-1 py-2 border-b-2 ${
				activeTab === tabKey ? "border-primary" : "border-transparent"
			}`}
		>
			<Text
				className={`text-center font-medium ${
					activeTab === tabKey ? "text-primary" : "text-muted-foreground"
				}`}
			>
				{title} {count !== undefined ? `(${count})` : ""}
			</Text>
		</Pressable>
	);

	// Render task item
	const renderTaskItem = (task: ProjectTask) => (
		<TouchableOpacity
			key={task.id}
			className="flex-row items-center bg-card p-4 rounded-lg mb-3 border border-border"
			onPress={() => toggleTaskCompletion(task)}
		>
			<TouchableOpacity
				className="mr-3 p-1"
				onPress={() => toggleTaskCompletion(task)}
				hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
			>
				<View
					className={`w-6 h-6 rounded-full border-2 ${
						task.completed
							? "bg-primary border-primary"
							: "border-muted-foreground"
					} items-center justify-center`}
				>
					{task.completed && (
						<Ionicons name="checkmark" size={16} color="#fff" />
					)}
				</View>
			</TouchableOpacity>
			<View className="flex-1">
				<Text
					className={`font-medium text-foreground ${task.completed ? "line-through" : ""}`}
				>
					{task.description}
				</Text>
				<Text className="text-muted-foreground text-sm">
					{task.project?.name || "No project"}
				</Text>
				{task.completed ? (
					<Text className="text-muted-foreground text-xs mt-1">
						Completed{" "}
						{task.completed_at
							? format(parseISO(task.completed_at), "MMM d, yyyy")
							: ""}
					</Text>
				) : (
					<Text
						style={{
							color: getDueDateColor(task.due_at, task.completed),
							fontSize: 12,
							marginTop: 4,
						}}
					>
						{formatDueDate(task.due_at)}
					</Text>
				)}
			</View>
			{task.assigned_to && (
				<View
					className={`ml-2 items-center justify-center w-8 h-8 bg-primary rounded-full ${task.completed ? "opacity-70" : ""}`}
				>
					<Text className={`${isDark ? "text-black" : "text-white"} font-bold`}>
						{`${task.assigned_to.first_name?.[0] || ""}${
							task.assigned_to.last_name?.[0] || ""
						}`}
					</Text>
				</View>
			)}
		</TouchableOpacity>
	);

	return (
		<SafeAreaView className="flex-1 bg-background" edges={["top"]}>
			<View className="p-4">
				<H1>Tasks</H1>
			</View>

			{/* Tab Navigation */}
			<View className="flex-row border-b border-border">
				<TabButton title="To Do" tabKey="todo" />
				<TabButton title="Completed" tabKey="completed" />
			</View>

			{loading && !refreshing ? (
				<View className="flex-1 items-center justify-center">
					<ActivityIndicator
						size="large"
						color={isDark ? colors.dark.primary : colors.light.primary}
					/>
					<Text className="mt-4">Loading tasks...</Text>
				</View>
			) : tasks.length === 0 ? (
				<View className="flex-1 items-center justify-center p-4">
					<Muted className="text-center">
						{activeTab === "todo" ? "No tasks to do" : "No completed tasks"}
					</Muted>
				</View>
			) : (
				<ScrollView
					className="flex-1"
					contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12 }}
					refreshControl={
						<RefreshControl
							refreshing={refreshing}
							onRefresh={onRefresh}
							colors={[isDark ? colors.light.primary : colors.dark.primary]}
							tintColor={isDark ? colors.dark.primary : colors.light.primary}
						/>
					}
				>
					{tasks.map(renderTaskItem)}
				</ScrollView>
			)}
		</SafeAreaView>
	);
}
