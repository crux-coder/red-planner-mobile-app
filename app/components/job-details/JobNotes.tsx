import React from "react";
import { View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { Text } from "@/components/ui/text";
import { H4 } from "@/components/ui/typography";
import { colors } from "@/constants/colors";
import { useColorScheme } from "@/lib/useColorScheme";

interface JobNotesProps {
	notes?: string;
}

export const JobNotes: React.FC<JobNotesProps> = ({ notes }) => {
	const { colorScheme } = useColorScheme();
	const isDark = colorScheme === "dark";

	return (
		<View>
			<View className="flex-row items-center mb-2">
				<MaterialIcons
					name="description"
					size={20}
					color={isDark ? colors.dark.primary : colors.light.primary}
				/>
				<H4 className="ml-2">Notes</H4>
			</View>
			<View className="bg-card p-4 rounded-lg mb-2">
				{notes ? (
					<Text>{notes}</Text>
				) : (
					<Text className="text-muted-foreground">No notes</Text>
				)}
			</View>
		</View>
	);
};

export default JobNotes;
