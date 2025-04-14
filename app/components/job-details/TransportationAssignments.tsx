import React from "react";
import { View } from "react-native";
import { FontAwesome5, MaterialIcons } from "@expo/vector-icons";
import { Text } from "@/components/ui/text";
import { H4 } from "@/components/ui/typography";
import { colors } from "@/constants/colors";
import { useColorScheme } from "@/lib/useColorScheme";

interface Transportation {
	id: string;
	name: string;
	type?: string;
}

interface TransportationAssignmentItem {
	id: string;
	transportation: Transportation;
}

interface TransportationAssignmentsProps {
	assignments: TransportationAssignmentItem[];
}

export const TransportationAssignments: React.FC<
	TransportationAssignmentsProps
> = ({ assignments }) => {
	const { colorScheme } = useColorScheme();
	const isDark = colorScheme === "dark";

	return (
		<View>
			<View className="flex-row items-center mb-2">
				<MaterialIcons
					name="local-shipping"
					size={20}
					color={isDark ? colors.dark.primary : colors.light.primary}
				/>
				<H4 className="ml-2">Transportation</H4>
			</View>
			{assignments.length > 0 ? (
				<View className="bg-card p-4 rounded-lg mb-2">
					{assignments.map((assignment) => (
						<View key={assignment.id} className="mb-3 last:mb-0">
							<View className="flex-row justify-between mb-1">
								<Text className="font-medium">
									{assignment.transportation?.name || "Unknown Transportation"}
								</Text>
							</View>
						</View>
					))}
				</View>
			) : (
				<View className="bg-card p-4 rounded-lg mb-2">
					<Text className="text-muted-foreground">
						No transportation assigned
					</Text>
				</View>
			)}
		</View>
	);
};

export default TransportationAssignments;
