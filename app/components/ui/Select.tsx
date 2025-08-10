import React, { useState } from "react";
import {
	View,
	Text,
	TouchableOpacity,
	Modal,
	FlatList,
	Platform,
	ActionSheetIOS,
	StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useColorScheme } from "@/lib/useColorScheme";
import { colors } from "@/constants/colors";

interface SelectProps {
	label?: string;
	value: string;
	options: string[];
	onChange: (value: string) => void;
	placeholder?: string;
	disabled?: boolean;
}

export const Select: React.FC<SelectProps> = ({
	label,
	value,
	options,
	onChange,
	placeholder = "Select an option",
	disabled = false,
}) => {
	const { colorScheme } = useColorScheme();
	const isDark = colorScheme === "dark";
	const [modalVisible, setModalVisible] = useState(false);

	const handleSelect = (option: string) => {
		onChange(option);
		setModalVisible(false);
	};

	const openSelector = () => {
		if (disabled) return;

		if (Platform.OS === "ios") {
			ActionSheetIOS.showActionSheetWithOptions(
				{
					options: [...options, "Cancel"],
					cancelButtonIndex: options.length,
					title: label,
					userInterfaceStyle: isDark ? "dark" : "light",
				},
				(buttonIndex) => {
					if (buttonIndex !== options.length) {
						onChange(options[buttonIndex]);
					}
				},
			);
		} else {
			setModalVisible(true);
		}
	};

	const displayValue = value || placeholder;

	return (
		<View style={styles.container}>
			{label && (
				<Text
					style={[
						styles.label,
						{
							color: isDark ? colors.dark.foreground : colors.light.foreground,
						},
						{ textTransform: "capitalize" },
					]}
				>
					{label}
				</Text>
			)}

			<TouchableOpacity
				onPress={openSelector}
				disabled={disabled}
				style={[
					styles.selectButton,
					{
						borderColor: isDark ? colors.dark.border : colors.light.border,
						backgroundColor: isDark ? colors.dark.card : colors.light.card,
						opacity: disabled ? 0.6 : 1,
					},
				]}
			>
				<Text
					style={[
						styles.selectText,
						{
							color: isDark ? colors.dark.foreground : colors.light.foreground,
							opacity: value ? 1 : 0.5,
						},
						{ textTransform: "capitalize" },
					]}
					numberOfLines={1}
					ellipsizeMode="tail"
				>
					{displayValue}
				</Text>
				<Ionicons
					name="chevron-down"
					size={16}
					color={isDark ? colors.dark.foreground : colors.light.foreground}
				/>
			</TouchableOpacity>

			{Platform.OS !== "ios" && (
				<Modal
					visible={modalVisible}
					transparent={true}
					animationType="slide"
					onRequestClose={() => setModalVisible(false)}
				>
					<View style={styles.modalOverlay}>
						<View
							style={[
								styles.modalContent,
								{
									backgroundColor: isDark
										? colors.dark.background
										: colors.light.background,
								},
							]}
						>
							{label && (
								<Text
									style={[
										styles.modalTitle,
										{
											color: isDark
												? colors.dark.foreground
												: colors.light.foreground,
										},
										{ textTransform: "capitalize" },
									]}
								>
									{label}
								</Text>
							)}

							<FlatList
								data={options}
								keyExtractor={(item) => item}
								renderItem={({ item }) => (
									<TouchableOpacity
										style={[
											styles.optionItem,
											{
												borderBottomColor: isDark
													? colors.dark.border
													: colors.light.border,
											},
										]}
										onPress={() => handleSelect(item)}
									>
										<Text
											style={[
												styles.optionText,
												{
													color: isDark
														? colors.dark.foreground
														: colors.light.foreground,
													fontWeight: item === value ? "700" : "400",
												},
												{ textTransform: "capitalize" },
											]}
										>
											{item}
										</Text>
										{item === value && (
											<Ionicons
												name="checkmark"
												size={18}
												color={
													isDark ? colors.dark.primary : colors.light.primary
												}
											/>
										)}
									</TouchableOpacity>
								)}
								style={styles.optionsList}
							/>

							<View style={styles.buttonRow}>
								<TouchableOpacity
									style={[
										styles.button,
										{
											backgroundColor: isDark
												? colors.dark.card
												: colors.light.card,
										},
									]}
									onPress={() => setModalVisible(false)}
								>
									<Text
										style={[
											styles.buttonText,
											{
												color: isDark
													? colors.dark.foreground
													: colors.light.foreground,
											},
											{ textTransform: "capitalize" },
										]}
									>
										Cancel
									</Text>
								</TouchableOpacity>
							</View>
						</View>
					</View>
				</Modal>
			)}
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		marginBottom: 16,
	},
	label: {
		marginBottom: 4,
		fontWeight: "500",
		fontSize: 14,
	},
	selectButton: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		padding: 12,
		borderRadius: 8,
		borderWidth: 1,
	},
	selectText: {
		flex: 1,
		fontSize: 14,
	},
	modalOverlay: {
		flex: 1,
		justifyContent: "flex-end",
		backgroundColor: "rgba(0,0,0,0.5)",
	},
	modalContent: {
		borderTopLeftRadius: 16,
		borderTopRightRadius: 16,
		padding: 16,
		maxHeight: "70%",
	},
	modalTitle: {
		fontSize: 18,
		fontWeight: "600",
		marginBottom: 16,
		textAlign: "center",
	},
	optionsList: {
		maxHeight: 300,
	},
	optionItem: {
		paddingVertical: 14,
		borderBottomWidth: 1,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
	},
	optionText: {
		fontSize: 16,
	},
	buttonRow: {
		marginTop: 16,
		flexDirection: "row",
	},
	button: {
		flex: 1,
		padding: 14,
		borderRadius: 8,
		alignItems: "center",
	},
	buttonText: {
		fontWeight: "600",
		fontSize: 16,
	},
});
