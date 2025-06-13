import React from "react";
import {
	View,
	StyleSheet,
	Image,
	TouchableOpacity,
	Linking,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { Text } from "@/components/ui/text";
import { H4 } from "@/components/ui/typography";
import { colors } from "@/constants/colors";
import { useColorScheme } from "@/lib/useColorScheme";
import { UserProfile } from "@/app/models/types";
import { useSupabase } from "@/context/supabase-provider";
import { Ionicons } from "@expo/vector-icons";

interface PeopleAssignmentItem {
	id: string;
	user: UserProfile;
	is_lead?: boolean;
}

interface PeopleAssignmentsProps {
	assignments: PeopleAssignmentItem[];
}

export const PeopleAssignments: React.FC<PeopleAssignmentsProps> = ({
	assignments,
}) => {
	const { colorScheme } = useColorScheme();
	const { userProfile } = useSupabase();
	const isDark = colorScheme === "dark";

	// Assume the first person in the list is the lead if assignments exist
	const leadId = assignments.length > 0 ? assignments[0].user.id : null;

	// Generate initials from name
	const getInitials = (firstName: string = "", lastName: string = "") => {
		const firstInitial = firstName ? firstName.charAt(0) : "";
		const lastInitial = lastName ? lastName.charAt(0) : "";
		return (firstInitial + lastInitial).toUpperCase();
	};

	return (
		<View>
			<View className="flex-row items-center mb-2">
				<MaterialIcons
					name="people"
					size={20}
					color={isDark ? colors.dark.primary : colors.light.primary}
				/>
				<H4 className="ml-2">People</H4>
			</View>
			{assignments.length > 0 ? (
				<View className="flex flex-col bg-card p-4 rounded-lg mb-2 gap-2">
					{assignments.map((assignment) => (
						<View
							key={assignment.id}
							className="flex-row items-center mb-2 last:mb-0"
						>
							{assignment.user.photo ? (
								<Image
									source={{ uri: assignment.user.photo }}
									style={styles.avatar}
								/>
							) : (
								<View style={styles.avatarPlaceholder}>
									<Text style={styles.avatarText}>
										{getInitials(
											assignment.user.first_name,
											assignment.user.last_name,
										)}
									</Text>
								</View>
							)}
							<View className="ml-3">
								<View className="flex-row items-center">
									<Text className="font-medium">
										{assignment.user.first_name} {assignment.user.last_name}
									</Text>
									{assignment.user.id === leadId && (
										<MaterialIcons
											name="stars"
											size={16}
											color="#FFD700"
											style={{ marginLeft: 4 }}
										/>
									)}
									{userProfile?.id === assignment.user.id && (
										<Text className="font-semibold text-muted-foreground ml-2">
											(You)
										</Text>
									)}
								</View>
								<Text className="text-muted-foreground text-sm">
									{assignment.user.email || ""}
								</Text>
							</View>
							{assignment.user.phone_number && (
								<TouchableOpacity
									className="ml-auto bg-primary/10 rounded-full p-2"
									onPress={() => {
										if (assignment.user.phone_number) {
											Linking.openURL(`tel:${assignment.user.phone_number}`);
										}
									}}
								>
									<Ionicons
										name="call-outline"
										size={16}
										color={isDark ? colors.dark.primary : colors.light.primary}
									/>
								</TouchableOpacity>
							)}
						</View>
					))}
				</View>
			) : (
				<View className="bg-card p-4 rounded-lg mb-2">
					<Text className="text-muted-foreground">No people assigned</Text>
				</View>
			)}
		</View>
	);
};

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
});

export default PeopleAssignments;
