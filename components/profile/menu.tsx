import { Pressable, Text, View } from "react-native";

import { Icon, type IconName } from "@/components/home/icon";

export const profileDestinations = [
	{
		id: "personal",
		title: "Personal details",
		subtitle: "Contact, address & emergency contacts",
		icon: "user",
	},
	{ id: "training", title: "Training & certificates", icon: "clipboard" },
	{ id: "documents", title: "Documents", icon: "document" },
	{
		id: "work",
		title: "Employment & pay",
		subtitle: "Job, payroll & bank details",
		icon: "briefcase",
	},
	{ id: "clothing", title: "Clothing sizes", icon: "clothing" },
] as const;
export type ProfileDestination = (typeof profileDestinations)[number]["id"];

export function ProfileMenu({
	onSelect,
}: {
	onSelect: (destination: ProfileDestination) => void;
}) {
	return (
		<View style={{ marginTop: 20 }}>
			<Text
				style={{
					color: "#607087",
					fontSize: 11,
					letterSpacing: 1,
					marginBottom: 6,
				}}
			>
				YOUR PROFILE
			</Text>
			{profileDestinations.map((item) => (
				<Pressable
					key={item.id}
					accessibilityRole="button"
					accessibilityLabel={item.title}
					onPress={() => onSelect(item.id)}
					style={({ pressed }) => ({
						minHeight: 58,
						paddingVertical: 12,
						flexDirection: "row",
						alignItems: "center",
						gap: 14,
						borderBottomWidth: 1,
						borderBottomColor: "#e8edf2",
						opacity: pressed ? 0.55 : 1,
					})}
				>
					<Icon name={item.icon as IconName} color="#075ed2" size={23} />
					<View style={{ flex: 1, gap: 4 }}>
						<Text style={{ color: "#10213b", fontSize: 16, fontWeight: "600" }}>
							{item.title}
						</Text>
						{"subtitle" in item ? (
							<Text style={{ color: "#607087", fontSize: 12 }}>
								{item.subtitle}
							</Text>
						) : null}
					</View>
					<Icon name="chevron" size={18} color="#607087" />
				</Pressable>
			))}
		</View>
	);
}
