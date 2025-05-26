import React from "react";
import {
	View,
	ActivityIndicator,
	FlatList,
	TouchableOpacity,
} from "react-native";
import { H2, Muted } from "@/components/ui/typography";
import { getJobStatusColor, getJobTypeColor } from "@/lib/colors";
import { Text } from "@/components/ui/text";
import { format } from "date-fns";
import { router } from "expo-router";
import { Job, JobStatus } from "@/app/models/types";

interface JobsListProps {
	loadingJobs: boolean;
	userJobs: Job[];
	isDark: boolean;
	refreshing: boolean;
	onRefresh: () => void;
	currentShiftJobId?: string | null;
}

export const JobsList: React.FC<JobsListProps> = ({
	loadingJobs,
	userJobs,
	isDark,
	refreshing,
	onRefresh,
	currentShiftJobId,
}) => {
	const formatStatus = (status: string) => {
		return status
			.split("_")
			.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
			.join(" ");
	};

	return (
		<View className="flex-1">
			<H2>Today's Jobs</H2>
			{loadingJobs ? (
				<View className="py-4 flex items-center justify-center">
					<ActivityIndicator
						size="large"
						color={isDark ? "#4ade80" : "#22c55e"}
					/>
				</View>
			) : (
				<FlatList
					data={userJobs}
					refreshing={refreshing}
					onRefresh={onRefresh}
					keyExtractor={(item) => item.id}
					contentContainerStyle={{ paddingVertical: 8 }}
					ListEmptyComponent={
						<View className="p-8">
							<Muted className="text-center">
								No jobs assigned to you for today.
							</Muted>
						</View>
					}
					renderItem={({ item }: { item: Job }) => {
						const isCurrentJob =
							currentShiftJobId && item.id === currentShiftJobId;
						return (
							<TouchableOpacity
								className={`mb-2 p-4 bg-card rounded-lg border ${isCurrentJob ? "border-green-500 bg-green-500/25" : "border-border"}`}
								onPress={() => router.push(`/tracker/job?id=${item.id}`)}
							>
								<View className="flex gap-2">
									<View className="flex-row flex-1 items-center justify-between">
										<Text className="font-semibold text-base">
											{item.job_number}
										</Text>

										<View
											className="px-2 py-1 rounded"
											style={{
												backgroundColor: getJobStatusColor(
													item.job_status as JobStatus,
													"bg",
													isDark,
												),
											}}
										>
											<Text
												className="text-xs font-medium"
												style={{
													color: getJobStatusColor(
														item.job_status as JobStatus,
														"text",
														isDark,
													),
												}}
											>
												{formatStatus(item.job_status)}
											</Text>
										</View>
									</View>
									<View>
										<View>
											{item.job_project && (
												<Muted>{item.job_project.name}</Muted>
											)}
										</View>
										<View>
											<Muted>
												{format(new Date(item.start_date), "HH:mm")} -{" "}
												{format(new Date(item.end_date), "HH:mm")}
											</Muted>
										</View>
									</View>
								</View>
							</TouchableOpacity>
						);
					}}
				/>
			)}
		</View>
	);
};
