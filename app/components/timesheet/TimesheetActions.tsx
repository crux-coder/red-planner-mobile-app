import React from "react";
import { View, ActivityIndicator, TouchableOpacity } from "react-native";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { Ionicons } from "@expo/vector-icons";

type ActionType =
	| "break"
	| "endbreak"
	| "overtime"
	| "job"
	| "clockout"
	| "completejob";

interface TimesheetActionsProps {
	loading: boolean;
	currentShift: any;
	clockingIn: boolean;
	clockingOut: boolean;
	processingAction: boolean;
	handleClockIn: () => void;
	handleAction: (type: ActionType) => void;
	isDark: boolean;
}

interface ActionButtonProps {
	icon: keyof typeof Ionicons.glyphMap;
	text: string;
	onPress: () => void;
	disabled?: boolean;
	variant?: "outline" | "default";
	className?: string;
	isDark: boolean;
	processingAction: boolean;
}

// Action button component for consistent styling and behavior
const ActionButton: React.FC<ActionButtonProps> = ({
	icon,
	text,
	onPress,
	disabled = false,
	variant = "outline",
	className = "flex-1",
	isDark,
	processingAction,
}) => (
	<Button
		className={className}
		variant={variant}
		onPress={onPress}
		disabled={disabled || processingAction}
	>
		{processingAction ? (
			<ActivityIndicator size="small" color={isDark ? "#4ade80" : "#22c55e"} />
		) : (
			<View className="flex-row items-center justify-center">
				<Ionicons
					name={icon}
					size={18}
					color={isDark ? "#fff" : "#000"}
					style={{ marginRight: 8 }}
				/>
				<Text className="font-medium">{text}</Text>
			</View>
		)}
	</Button>
);

// Clock in/out button with rounded styling
const ClockButton: React.FC<{
	isClockIn: boolean;
	onPress: () => void;
	isLoading: boolean;
	isDark: boolean;
}> = ({ isClockIn, onPress, isLoading, isDark }) => {
	const icon = isClockIn
		? "timer-outline"
		: ("stop-outline" as keyof typeof Ionicons.glyphMap);
	const text = isClockIn ? "Clock In" : "Clock Out";

	// Define colors based on clock in/out state
	const colors = {
		background: isClockIn ? "bg-blue-200" : "bg-red-200",
		border: isClockIn ? "border-blue-500" : "border-red-500",
		icon: isClockIn ? "#2563eb" : "#dc2626",
	};

	return (
		<View className="items-center justify-center gap-2 flex">
			<TouchableOpacity
				activeOpacity={0.7}
				onPress={onPress}
				disabled={isLoading}
				className={`w-20 h-20 items-center justify-center rounded-full border-2 ${colors.background} ${colors.border}`}
				style={{
					borderColor: isClockIn ? "#3b82f6" : "#ef4444",
					backgroundColor: isClockIn ? "#bfdbfe" : "#fecaca",
				}}
			>
				{isLoading ? (
					<ActivityIndicator size="large" color={colors.icon} />
				) : (
					<Ionicons
						name={icon}
						size={32}
						color={isClockIn ? "#2563eb" : "#dc2626"}
					/>
				)}
			</TouchableOpacity>
			<Text
				className="text-lg font-semibold text-center"
				style={{ color: colors.icon }}
			>
				{text}
			</Text>
		</View>
	);
};

// Complete job button with green styling
const CompleteJobButton: React.FC<{
	onPress: () => void;
	isLoading: boolean;
}> = ({ onPress, isLoading }) => (
	<View className="items-center justify-center gap-2 flex">
		<TouchableOpacity
			activeOpacity={0.7}
			onPress={onPress}
			disabled={isLoading}
			className="w-20 h-20 items-center justify-center bg-green-200 border-2 border-green-500 rounded-full"
		>
			{isLoading ? (
				<ActivityIndicator size="large" color="#22c55e" />
			) : (
				<Ionicons name="checkmark-done-outline" size={32} color="#22c55e" />
			)}
		</TouchableOpacity>
		<Text className="text-green-600 text-lg font-semibold text-center">
			Complete Job
		</Text>
	</View>
);

export const TimesheetActions: React.FC<TimesheetActionsProps> = ({
	loading,
	currentShift,
	clockingIn,
	clockingOut,
	processingAction,
	handleClockIn,
	handleAction,
	isDark,
}) => {
	// Determine which action buttons to show based on current shift type
	const renderActionButtons = () => {
		if (!currentShift) return null;

		const isBreak = currentShift.category === "break";
		const isOvertime = currentShift.category === "overtime";
		const isRegularShift = currentShift.category === "shift";
		const isJobShift = isRegularShift && currentShift.type === "job";

		return (
			<View className="flex flex-row w-full gap-2">
				{/* Break/End Break Button - Always show */}
				<ActionButton
					icon="cafe-outline"
					text={isBreak ? "End Break" : "Break"}
					onPress={() => handleAction(isBreak ? "endbreak" : "break")}
					processingAction={processingAction}
					isDark={isDark}
					className={isBreak ? "flex-1" : "flex-1"}
				/>

				{/* Only show overtime button for regular shifts (not during break or already in overtime) */}
				{!isBreak && !isOvertime && (
					<ActionButton
						icon="time-outline"
						text="Overtime"
						onPress={() => handleAction("overtime")}
						disabled={currentShift.category === "overtime"}
						processingAction={processingAction}
						isDark={isDark}
					/>
				)}
			</View>
		);
	};

	// Render the main action button (clock in, clock out, or complete job)
	const renderMainButton = () => {
		if (loading) return null;

		// If no current shift, show clock in button
		if (!currentShift) {
			return (
				<ClockButton
					isClockIn={true}
					onPress={handleClockIn}
					isLoading={clockingIn}
					isDark={isDark}
				/>
			);
		}

		// If current shift is a job, show complete job button
		if (currentShift.category === "shift" && currentShift.type === "job") {
			return (
				<CompleteJobButton
					onPress={() => handleAction("completejob")}
					isLoading={clockingOut || processingAction}
				/>
			);
		}

		// For other shift types, show clock out button
		return (
			<ClockButton
				isClockIn={false}
				onPress={() => handleAction("clockout")}
				isLoading={clockingOut || processingAction}
				isDark={isDark}
			/>
		);
	};

	return (
		<View className="flex">
			{!loading && (
				<View className="items-center justify-center">
					<View className="flex gap-2 mb-2">{renderMainButton()}</View>
					{renderActionButtons()}
				</View>
			)}
		</View>
	);
};
