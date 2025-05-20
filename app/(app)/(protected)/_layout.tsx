import { Tabs } from "expo-router";
import React from "react";
import { Ionicons } from "@expo/vector-icons";

import { colors } from "@/constants/colors";
import { useColorScheme } from "@/lib/useColorScheme";

export default function ProtectedLayout() {
	const { colorScheme } = useColorScheme();
	const isDark = colorScheme === "dark";

	return (
		<Tabs
			screenOptions={{
				headerShown: false,
				tabBarStyle: {
					backgroundColor: isDark
						? colors.dark.background
						: colors.light.background,
				},
				tabBarActiveTintColor: isDark
					? colors.dark.foreground
					: colors.light.foreground,
				tabBarInactiveTintColor: isDark
					? "rgba(255, 255, 255, 0.5)"
					: "rgba(0, 0, 0, 0.5)",
				tabBarShowLabel: true,
				tabBarLabelStyle: {
					fontSize: 12,
					marginBottom: 4,
				},
			}}
		>
			<Tabs.Screen
				name="timesheet"
				options={{
					title: "Timesheet",
					tabBarIcon: ({ color, size }) => (
						<Ionicons name="calendar-outline" size={size} color={color} />
					),
					tabBarLabel: "Timesheet",
				}}
			/>
			<Tabs.Screen
				name="schedule"
				options={{
					title: "Schedule",
					tabBarIcon: ({ color, size }) => (
						<Ionicons name="calendar" size={size} color={color} />
					),
					tabBarLabel: "Schedule",
				}}
			/>
			<Tabs.Screen
				name="tracker"
				options={{
					title: "Time Tracker",
					tabBarIcon: ({ color, size }) => (
						<Ionicons name="stopwatch-outline" size={size} color={color} />
					),
					tabBarLabel: "Tracker",
				}}
			/>
			<Tabs.Screen
				name="tasks"
				options={{
					title: "Tasks",
					tabBarIcon: ({ color, size }) => (
						<Ionicons name="checkbox-outline" size={size} color={color} />
					),
					tabBarLabel: "Tasks",
				}}
			/>
			<Tabs.Screen
				name="settings"
				options={{
					title: "Account",
					tabBarIcon: ({ color, size }) => (
						<Ionicons name="person-outline" size={size} color={color} />
					),
					tabBarLabel: "Account",
				}}
			/>
		</Tabs>
	);
}
