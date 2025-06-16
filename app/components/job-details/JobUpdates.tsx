import { useState, useEffect } from "react";
import {
	View,
	ActivityIndicator,
	FlatList,
	TouchableOpacity,
	KeyboardAvoidingView,
	Platform,
	Image,
	StyleSheet,
} from "react-native";
import { Text } from "@/components/ui/text";
import { TextInput } from "@/components/ui/text-input";
import { supabase } from "@/config/supabase";
import { useSupabase } from "@/context/supabase-provider";
import { JobUpdate } from "@/app/models/types";
import { colors } from "@/constants/colors";
import { useColorScheme } from "@/lib/useColorScheme";
import { formatDistanceToNow } from "date-fns";
import { Ionicons } from "@expo/vector-icons";

const styles = StyleSheet.create({
	avatar: {
		width: 40,
		height: 40,
		borderRadius: 20,
		borderWidth: 1,
		borderColor: "#ccc",
	},
	avatarPlaceholder: {
		width: 40,
		height: 40,
		borderRadius: 20,
		backgroundColor: "#e0e0e0",
		justifyContent: "center",
		alignItems: "center",
		borderWidth: 1,
		borderColor: "#ccc",
	},
	avatarText: {
		fontSize: 16,
		fontWeight: "bold",
		color: "#757575",
	},
	separator: {
		height: 1,
		marginVertical: 8,
		opacity: 0.2,
	},
});

interface JobUpdatesProps {
	jobId: string;
	projectId: string;
}

export default function JobUpdates({ jobId, projectId }: JobUpdatesProps) {
	const [updates, setUpdates] = useState<JobUpdate[]>([]);
	const [loading, setLoading] = useState(true);
	const [newMessage, setNewMessage] = useState("");
	const [submitting, setSubmitting] = useState(false);
	const { userProfile } = useSupabase();
	const { colorScheme } = useColorScheme();
	const isDark = colorScheme === "dark";

	useEffect(() => {
		fetchJobUpdates();
	}, [jobId]);

	const fetchJobUpdates = async () => {
		try {
			setLoading(true);
			const { data, error } = await supabase
				.from("job_updates")
				.select(
					`
          *,
          author:users(id, first_name, last_name, photo)
        `,
				)
				.eq("job_id", jobId)
				.order("created_at", { ascending: false });

			if (error) {
				console.error("Error fetching job updates:", error);
				return;
			}

			setUpdates(data as JobUpdate[]);
		} catch (error) {
			console.error("Error:", error);
		} finally {
			setLoading(false);
		}
	};

	const handleSubmit = async () => {
		if (!newMessage.trim() || !userProfile) return;

		try {
			setSubmitting(true);

			const { error } = await supabase.from("job_updates").insert({
				job_id: jobId,
				project_id: projectId,
				author_id: userProfile.id,
				message: newMessage.trim(),
			});

			if (error) {
				console.error("Error adding job update:", error);
				return;
			}

			// Clear input and refresh updates
			setNewMessage("");
			fetchJobUpdates();
		} catch (error) {
			console.error("Error:", error);
		} finally {
			setSubmitting(false);
		}
	};

	// Generate initials from name
	const getInitials = (firstName: string = "", lastName: string = "") => {
		const firstInitial = firstName ? firstName.charAt(0) : "";
		const lastInitial = lastName ? lastName.charAt(0) : "";
		return (firstInitial + lastInitial).toUpperCase();
	};

	const renderItem = ({ item }: { item: JobUpdate }) => {
		const authorName = item.author
			? `${item.author.first_name || ""} ${item.author.last_name || ""}`.trim()
			: "Unknown";

		const timeAgo = formatDistanceToNow(new Date(item.created_at), {
			addSuffix: true,
		});

		return (
			<View
				className="mb-3 p-3 rounded-lg"
				style={{
					backgroundColor: isDark ? colors.dark.card : colors.light.card,
				}}
			>
				<View className="flex-row items-center mb-2">
					{/* Avatar */}
					{item.author?.photo ? (
						<Image source={{ uri: item.author.photo }} style={styles.avatar} />
					) : (
						<View style={styles.avatarPlaceholder}>
							<Text style={styles.avatarText}>
								{getInitials(item.author?.first_name, item.author?.last_name)}
							</Text>
						</View>
					)}

					{/* Author name and time */}
					<View className="flex-1 ml-2">
						<Text className="font-medium">{authorName}</Text>
						<Text className="text-xs text-muted-foreground">{timeAgo}</Text>
					</View>
				</View>

				{/* Message content */}
				<Text className="text-foreground pl-12">{item.message}</Text>
			</View>
		);
	};

	return (
		<KeyboardAvoidingView
			behavior={Platform.OS === "ios" ? "padding" : "height"}
			style={{ flex: 1 }}
			keyboardVerticalOffset={Platform.OS === "ios" ? 150 : 20}
		>
			<View style={{ flex: 1, display: "flex", flexDirection: "column" }}>
				<View style={{ paddingBottom: 8 }}>
					<Text className="text-lg font-semibold mb-2">Job Updates</Text>
				</View>

				{/* Updates list - scrollable */}
				{loading ? (
					<View className="py-4 items-center" style={{ flex: 1 }}>
						<ActivityIndicator
							size="small"
							color={isDark ? colors.dark.primary : colors.light.primary}
						/>
					</View>
				) : updates.length > 0 ? (
					<FlatList
						data={updates}
						renderItem={renderItem}
						keyExtractor={(item) => item.id}
						style={{ flex: 1 }}
						contentContainerStyle={{ paddingBottom: 16 }}
						inverted={false}
						keyboardShouldPersistTaps="handled"
						keyboardDismissMode="on-drag"
						ItemSeparatorComponent={() => (
							<View
								style={[
									styles.separator,
									{
										backgroundColor: isDark
											? colors.dark.border
											: colors.light.border,
									},
								]}
							/>
						)}
					/>
				) : (
					<View className="py-4 items-center" style={{ flex: 1 }}>
						<Text className="text-muted-foreground">No updates yet</Text>
					</View>
				)}

				{/* Add new update - fixed at bottom */}
				<View
					style={{
						flexDirection: "row",
						alignItems: "center",
						borderTopWidth: 1,
						borderTopColor: isDark ? colors.dark.border : colors.light.border,
						paddingTop: 8,
						paddingBottom: Platform.OS === "ios" ? 20 : 8,
						backgroundColor: isDark
							? colors.dark.background
							: colors.light.background,
					}}
				>
					<TextInput
						placeholder="Add an update..."
						value={newMessage}
						onChangeText={setNewMessage}
						multiline
						numberOfLines={2}
						style={{ flex: 1, marginRight: 8 }}
					/>
					<TouchableOpacity
						onPress={handleSubmit}
						disabled={!newMessage.trim() || submitting}
						style={{
							backgroundColor:
								!newMessage.trim() || submitting
									? isDark
										? colors.dark.muted
										: colors.light.muted
									: isDark
										? colors.dark.primary
										: colors.light.primary,
							width: 40,
							height: 40,
							borderRadius: 20,
							justifyContent: "center",
							alignItems: "center",
						}}
					>
						{submitting ? (
							<ActivityIndicator size="small" color="white" />
						) : (
							<Ionicons name="send" size={18} color="white" />
						)}
					</TouchableOpacity>
				</View>
			</View>
		</KeyboardAvoidingView>
	);
}
