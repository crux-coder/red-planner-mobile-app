import React, { useState } from "react";
import {
	View,
	Text,
	TouchableOpacity,
	Modal,
	FlatList,
	StyleSheet,
	ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useColorScheme } from "@/lib/useColorScheme";
import { colors } from "@/constants/colors";

interface MultiSelectProps {
	label?: string;
	values: string[];
	options: string[];
	onChange: (values: string[]) => void;
	placeholder?: string;
	disabled?: boolean;
}

export const MultiSelect: React.FC<MultiSelectProps> = ({
	label,
	values = [],
	options,
	onChange,
	placeholder = "Select options",
	disabled = false,
}) => {
	const { colorScheme } = useColorScheme();
	const isDark = colorScheme === "dark";
	const [modalVisible, setModalVisible] = useState(false);

	const toggleOption = (option: string) => {
		if (values.includes(option)) {
			onChange(values.filter((v) => v !== option));
		} else {
			onChange([...values, option]);
		}
	};

	const handleSelectAll = () => {
		if (values.length === options.length) {
			onChange([]);
		} else {
			onChange([...options]);
		}
	};

	return (
		<View style={styles.container}>
			{label && (
				<Text
					style={[
						styles.label,
						{
							color: isDark ? colors.dark.foreground : colors.light.foreground,
						},
					]}
				>
					{label}
				</Text>
			)}

			<TouchableOpacity
				onPress={() => !disabled && setModalVisible(true)}
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
				{values.length > 0 ? (
					<ScrollView
						horizontal
						showsHorizontalScrollIndicator={false}
						style={styles.selectedItemsContainer}
					>
						{values.length <= 3 ? (
							values.map((item, index) => (
								<View
									key={item}
									style={[
										styles.selectedItem,
										{
											backgroundColor: isDark
												? colors.dark.muted
												: colors.light.muted,
										},
									]}
								>
									<Text
										style={[
											styles.selectedItemText,
											{
												color: isDark
													? colors.dark.foreground
													: colors.light.foreground,
											},
										]}
										numberOfLines={1}
									>
										{item}
									</Text>
								</View>
							))
						) : (
							<Text
								style={[
									styles.selectText,
									{
										color: isDark
											? colors.dark.foreground
											: colors.light.foreground,
									},
								]}
							>
								{`${values.length} options selected`}
							</Text>
						)}
					</ScrollView>
				) : (
					<Text
						style={[
							styles.selectText,
							{
								color: isDark
									? colors.dark.foreground
									: colors.light.foreground,
								opacity: 0.5,
							},
						]}
						numberOfLines={1}
					>
						{placeholder}
					</Text>
				)}
				<Ionicons
					name="chevron-down"
					size={16}
					color={isDark ? colors.dark.foreground : colors.light.foreground}
				/>
			</TouchableOpacity>

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
								]}
							>
								{label}
							</Text>
						)}

						<TouchableOpacity
							style={styles.selectAllButton}
							onPress={handleSelectAll}
						>
							<Text
								style={[
									styles.selectAllText,
									{
										color: isDark ? colors.dark.primary : colors.light.primary,
									},
								]}
							>
								{values.length === options.length
									? "Deselect All"
									: "Select All"}
							</Text>
						</TouchableOpacity>

						<FlatList
							data={options}
							keyExtractor={(item) => item}
							renderItem={({ item }) => {
								const isSelected = values.includes(item);
								return (
									<TouchableOpacity
										style={[
											styles.optionItem,
											{
												borderBottomColor: isDark
													? colors.dark.border
													: colors.light.border,
											},
										]}
										onPress={() => toggleOption(item)}
									>
										<Text
											style={[
												styles.optionText,
												{
													color: isDark
														? colors.dark.foreground
														: colors.light.foreground,
												},
											]}
										>
											{item}
										</Text>
										<View
											style={[
												styles.checkbox,
												{
													borderColor: isSelected
														? isDark
															? colors.dark.primary
															: colors.light.primary
														: isDark
															? colors.dark.border
															: colors.light.border,
													backgroundColor: isSelected
														? isDark
															? colors.dark.primary
															: colors.light.primary
														: "transparent",
												},
											]}
										>
											{isSelected && (
												<Ionicons
													name="checkmark"
													size={14}
													color={
														isDark
															? colors.dark.background
															: colors.light.background
													}
												/>
											)}
										</View>
									</TouchableOpacity>
								);
							}}
							style={styles.optionsList}
						/>

						<View style={styles.buttonRow}>
							<TouchableOpacity
								style={[
									styles.button,
									styles.cancelButton,
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
									]}
								>
									Cancel
								</Text>
							</TouchableOpacity>
							<TouchableOpacity
								style={[
									styles.button,
									styles.applyButton,
									{
										backgroundColor: isDark
											? colors.dark.primary
											: colors.light.primary,
									},
								]}
								onPress={() => setModalVisible(false)}
							>
								<Text style={[styles.buttonText, { color: "#fff" }]}>
									Apply
								</Text>
							</TouchableOpacity>
						</View>
					</View>
				</View>
			</Modal>
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
		minHeight: 48,
	},
	selectText: {
		flex: 1,
		fontSize: 14,
	},
	selectedItemsContainer: {
		flex: 1,
		flexDirection: "row",
		marginRight: 8,
	},
	selectedItem: {
		borderRadius: 4,
		paddingHorizontal: 8,
		paddingVertical: 4,
		marginRight: 6,
		flexDirection: "row",
		alignItems: "center",
	},
	selectedItemText: {
		fontSize: 12,
		fontWeight: "500",
	},
	modalOverlay: {
		flex: 1,
		justifyContent: "flex-end",
		backgroundColor: "rgba(0,0,0,0.2)",
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
		marginBottom: 8,
		textAlign: "center",
	},
	selectAllButton: {
		alignSelf: "flex-end",
		paddingVertical: 8,
		paddingHorizontal: 4,
		marginBottom: 8,
	},
	selectAllText: {
		fontWeight: "600",
		fontSize: 14,
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
		flex: 1,
	},
	checkbox: {
		width: 22,
		height: 22,
		borderRadius: 4,
		borderWidth: 2,
		alignItems: "center",
		justifyContent: "center",
	},
	buttonRow: {
		marginTop: 16,
		flexDirection: "row",
		justifyContent: "space-between",
		gap: 12,
	},
	button: {
		flex: 1,
		padding: 14,
		borderRadius: 8,
		alignItems: "center",
	},
	cancelButton: {
		flex: 1,
	},
	applyButton: {
		flex: 1,
	},
	buttonText: {
		fontWeight: "600",
		fontSize: 16,
	},
});
