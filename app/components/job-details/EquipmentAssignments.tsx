import React from "react";
import { View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { Text } from "@/components/ui/text";
import { H3, H4 } from "@/components/ui/typography";
import { colors } from "@/constants/colors";
import { useColorScheme } from "@/lib/useColorScheme";

interface Equipment {
	id: string;
	name: string;
	type?: string;
}

interface EquipmentAssignmentItem {
	id: string;
	equipment: Equipment;
}

interface EquipmentAssignmentsProps {
	assignments: EquipmentAssignmentItem[];
}

export const EquipmentAssignments: React.FC<EquipmentAssignmentsProps> = ({
	assignments,
}) => {
	const { colorScheme } = useColorScheme();
	const isDark = colorScheme === "dark";

	return (
		<View>
			<View className="flex-row items-center mb-2">
				<MaterialIcons
					name="build"
					size={20}
					color={isDark ? colors.dark.primary : colors.light.primary}
				/>
				<H4 className="ml-2">Equipment</H4>
			</View>
			{assignments.length > 0 ? (
				<View className="bg-card p-4 rounded-lg mb-2">
					{assignments.map((assignment) => (
						<View key={assignment.id} className="mb-3 last:mb-0">
							<View className="flex-row justify-between mb-1">
								<Text className="font-medium">
									{assignment.equipment?.name || "Unknown Equipment"}
								</Text>
								{assignment.equipment?.type && (
									<Text className="text-muted-foreground">
										{assignment.equipment.type}
									</Text>
								)}
							</View>
						</View>
					))}
				</View>
			) : (
				<View className="bg-card p-4 rounded-lg mb-2">
					<Text className="text-muted-foreground">No equipment assigned</Text>
				</View>
			)}
		</View>
	);
};

export default EquipmentAssignments;
