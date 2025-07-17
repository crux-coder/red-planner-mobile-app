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
	Alert,
	ScrollView,
	Modal,
	SafeAreaView,
	Dimensions,
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
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";
import { useJobUpdate } from "@/app/hooks/useJobUpdateFunction";

// Define a type for selected images
interface SelectedImage {
	uri: string;
	name: string;
	type: string;
}

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
	imagePreviewContainer: {
		flexDirection: "row",
		flexWrap: "wrap",
		marginTop: 8,
		gap: 8,
	},
	imagePreview: {
		width: 80,
		height: 80,
		borderRadius: 4,
	},
	imagePreviewWrapper: {
		position: "relative",
	},
	imageRemoveButton: {
		position: "absolute",
		top: -8,
		right: -8,
		backgroundColor: "rgba(0,0,0,0.6)",
		borderRadius: 12,
		width: 24,
		height: 24,
		justifyContent: "center",
		alignItems: "center",
		zIndex: 10,
	},
	addImageButton: {
		width: 80,
		height: 80,
		borderRadius: 4,
		borderWidth: 1,
		borderStyle: "dashed",
		justifyContent: "center",
		alignItems: "center",
	},
	fullscreenContainer: {
		flex: 1,
		backgroundColor: "rgba(0, 0, 0, 0.9)",
		justifyContent: "center",
		alignItems: "center",
	},
	fullscreenImage: {
		width: Dimensions.get("window").width,
		height: Dimensions.get("window").height,
	},
	closeButton: {
		position: "absolute",
		top: 40,
		right: 20,
		zIndex: 10,
		width: 40,
		height: 40,
		borderRadius: 20,
		backgroundColor: "rgba(0, 0, 0, 0.5)",
		justifyContent: "center",
		alignItems: "center",
	},
	closeButtonText: {
		color: "white",
		fontSize: 20,
		fontWeight: "bold",
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
	const [selectedImages, setSelectedImages] = useState<SelectedImage[]>([]);
	const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
	const { userProfile } = useSupabase();
	const { colorScheme } = useColorScheme();
	const isDark = colorScheme === "dark";
	const jobUpdateMutation = useJobUpdate({
		onSuccess: () => {
			// Clear input and refresh updates
			setNewMessage("");
			setSelectedImages([]);
			fetchJobUpdates();
		},
		onError: (error: Error) => {
			Alert.alert("Error", error.message);
		},
	});

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
					id,
					job_id,
					project_id,
					author_id,
					message,
					image_urls,
					created_at,
					updated_at,
					author:users(id, first_name, last_name, photo)
					`,
				)
				.eq("job_id", jobId)
				.order("created_at", { ascending: false });

			if (error) {
				console.error("Error fetching job updates:", error);
				return;
			}

			console.log("Job updates:", data);
			setUpdates(data as unknown as JobUpdate[]);
		} catch (error) {
			console.error("Error:", error);
		} finally {
			setLoading(false);
		}
	};

	// Upload images to Supabase Storage and return image IDs
	const uploadImages = async (images: SelectedImage[]): Promise<string[]> => {
		if (images.length === 0) return [];

		const imageIds: string[] = [];

		try {
			// Upload each image to Supabase Storage
			for (const image of images) {
				console.log("Uploading image:", image.uri);

				// Generate a unique filename with extension
				const timestamp = new Date().getTime();
				const fileExt = image.uri.split(".").pop() || "jpg";
				const fileName = `job-updates/${jobId}/${timestamp}-${image.name || `image.${fileExt}`}`;

				try {
					// For React Native, we need to handle the file differently
					let fileUri = image.uri;

					// Check if we need to create a temporary file
					if (fileUri.startsWith("ph://") || fileUri.startsWith("content://")) {
						// For iOS photos or Android content URIs, we need to get a local file URI
						const tempUri =
							FileSystem.documentDirectory + `temp-${timestamp}.${fileExt}`;
						console.log("Downloading to temp file:", tempUri);
						await FileSystem.copyAsync({
							from: fileUri,
							to: tempUri,
						});
						fileUri = tempUri;
					}

					// Get file info to check if it exists and has content
					const fileInfo = await FileSystem.getInfoAsync(fileUri);
					console.log("File info:", fileInfo);

					if (!fileInfo.exists || fileInfo.size === 0) {
						throw new Error(`File does not exist or is empty: ${fileUri}`);
					}

					// Use fetch to get the file as a blob (more reliable for binary data)
					const response = await fetch(fileUri);
					const blob = await response.blob();
					console.log("Blob size:", blob.size);

					if (!blob || blob.size === 0) {
						throw new Error("Failed to create blob from file");
					}

					// Convert blob to ArrayBuffer for more reliable upload
					const arrayBuffer = await new Promise<ArrayBuffer>(
						(resolve, reject) => {
							const reader = new FileReader();
							reader.onload = () => resolve(reader.result as ArrayBuffer);
							reader.onerror = reject;
							reader.readAsArrayBuffer(blob);
						},
					);

					if (!arrayBuffer || arrayBuffer.byteLength === 0) {
						throw new Error("Failed to convert blob to ArrayBuffer");
					}

					console.log("ArrayBuffer length:", arrayBuffer.byteLength);

					// Upload using the Supabase SDK with binary data
					const { data, error } = await supabase.storage
						.from("job-updates")
						.upload(fileName, arrayBuffer, {
							contentType: image.type || "image/jpeg",
							upsert: true,
						});

					if (error) {
						console.error("Error uploading image:", error);
						throw error;
					}

					if (data) {
						// Generate the public URL for the image
						const { data: publicUrlData } = supabase.storage
							.from("job-updates")
							.getPublicUrl(fileName);

						if (publicUrlData && publicUrlData.publicUrl) {
							// Store the full public URL
							imageIds.push(publicUrlData.publicUrl);
							console.log(
								"Image uploaded successfully, public URL:",
								publicUrlData.publicUrl,
							);
						} else {
							console.warn("Could not generate public URL, using path instead");
							imageIds.push(data.fullPath);
							console.log(
								"Image uploaded successfully, using path:",
								data.fullPath,
							);
						}

						// Clean up temp file if we created one
						if (fileUri !== image.uri) {
							try {
								await FileSystem.deleteAsync(fileUri, { idempotent: true });
							} catch (cleanupError) {
								console.warn("Failed to clean up temp file:", cleanupError);
							}
						}
					}
				} catch (error) {
					console.error("Error uploading image:", error);
					throw error;
				}
			}

			return imageIds;
		} catch (error) {
			console.error("Error uploading images:", error);
			throw error;
		}
	};

	const handleSubmit = async () => {
		if (!newMessage.trim() || !userProfile) return;

		try {
			setSubmitting(true);

			// First upload images if any
			let imageIds: string[] = [];
			if (selectedImages.length > 0) {
				try {
					// Show loading toast
					imageIds = await uploadImages(selectedImages);
				} catch (uploadError) {
					console.error("Error uploading images:", uploadError);
					Alert.alert(
						"Upload Error",
						"Failed to upload one or more images. Do you want to continue with just the message?",
						[
							{ text: "Cancel", style: "cancel" },
							{
								text: "Continue",
								onPress: async () => {
									// Continue with just the message
									try {
										await jobUpdateMutation.mutateAsync({
											jobId,
											projectId,
											message: newMessage.trim(),
										});
									} catch (submitError) {
										console.error("Error submitting update:", submitError);
										Alert.alert(
											"Error",
											"Failed to submit update. Please try again.",
										);
									} finally {
										setSubmitting(false);
									}
								},
							},
						],
					);
					return; // Exit early
				}
			}

			// Then submit the job update with image IDs
			await jobUpdateMutation.mutateAsync({
				jobId,
				projectId,
				message: newMessage.trim(),
				image_urls: imageIds.length > 0 ? imageIds : undefined,
			});

			// The onSuccess callback will clear inputs and refresh updates
		} catch (error) {
			console.error("Error:", error);
			Alert.alert("Error", "Failed to submit update. Please try again.");
		} finally {
			setSubmitting(false);
		}
	};

	// Pick image from library
	const pickImage = async () => {
		// Request permission
		const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

		if (status !== "granted") {
			Alert.alert(
				"Permission Required",
				"Please grant permission to access your photos",
			);
			return;
		}

		try {
			const result = await ImagePicker.launchImageLibraryAsync({
				mediaTypes: ImagePicker.MediaTypeOptions.Images,
				allowsEditing: false, // Set to false to preserve original aspect ratio
				quality: 0.8,
			});

			if (!result.canceled && result.assets && result.assets.length > 0) {
				const selectedAsset = result.assets[0];

				// Get file name from URI
				const uriParts = selectedAsset.uri.split("/");
				const fileName = uriParts[uriParts.length - 1];

				// Add to selected images
				setSelectedImages([
					...selectedImages,
					{
						uri: selectedAsset.uri,
						name: fileName,
						type: `image/${fileName.split(".").pop()}`,
					},
				]);
			}
		} catch (error) {
			console.error("Error picking image:", error);
			Alert.alert("Error", "Failed to pick image");
		}
	};

	// Remove image from selected images
	const removeImage = (index: number) => {
		setSelectedImages(selectedImages.filter((_, i) => i !== index));
	};

	// Generate initials from name
	const getInitials = (firstName: string = "", lastName: string = "") => {
		const firstInitial = firstName ? firstName.charAt(0) : "";
		const lastInitial = lastName ? lastName.charAt(0) : "";
		return (firstInitial + lastInitial).toUpperCase();
	};

	const renderItem = ({ item }: { item: JobUpdate }) => {
		console.log("Item:", item);
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

				{/* Image attachments */}
				{item.image_urls && item.image_urls.length > 0 && (
					<View style={[styles.imagePreviewContainer, { marginLeft: 48 }]}>
						{item.image_urls.map((imageUrl, index) => (
							<TouchableOpacity
								key={index}
								onPress={() => setFullscreenImage(imageUrl)}
							>
								<Image
									source={{ uri: imageUrl }}
									style={[styles.imagePreview, { marginTop: 8 }]}
								/>
							</TouchableOpacity>
						))}
					</View>
				)}
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
						borderTopWidth: 1,
						borderTopColor: isDark ? colors.dark.border : colors.light.border,
						paddingTop: 8,
						paddingBottom: Platform.OS === "ios" ? 20 : 8,
						backgroundColor: isDark
							? colors.dark.background
							: colors.light.background,
					}}
				>
					{/* Image previews */}
					{selectedImages.length > 0 && (
						<View style={styles.imagePreviewContainer}>
							{selectedImages.map((image, index) => (
								<View key={index} style={styles.imagePreviewWrapper}>
									<Image
										source={{ uri: image.uri }}
										style={styles.imagePreview}
									/>
									<TouchableOpacity
										style={styles.imageRemoveButton}
										onPress={() => removeImage(index)}
									>
										<Ionicons name="close" size={16} color="white" />
									</TouchableOpacity>
								</View>
							))}
							{/* Add image button */}
							{selectedImages.length < 3 && (
								<TouchableOpacity
									style={[
										styles.addImageButton,
										{
											borderColor: isDark
												? colors.dark.border
												: colors.light.border,
										},
									]}
									onPress={pickImage}
								>
									<Ionicons
										name="add"
										size={24}
										color={isDark ? colors.dark.muted : colors.light.muted}
									/>
								</TouchableOpacity>
							)}
						</View>
					)}

					{/* Input and send button */}
					<View
						style={{ flexDirection: "row", alignItems: "center", marginTop: 8 }}
					>
						<TextInput
							placeholder="Add an update..."
							value={newMessage}
							onChangeText={setNewMessage}
							multiline
							numberOfLines={2}
							style={{ flex: 1, marginRight: 8 }}
						/>

						{/* Image picker button */}
						{selectedImages.length < 3 && (
							<TouchableOpacity
								onPress={pickImage}
								style={{
									width: 40,
									height: 40,
									borderRadius: 20,
									justifyContent: "center",
									alignItems: "center",
									marginRight: 8,
								}}
							>
								<Ionicons
									name="image-outline"
									size={24}
									color={isDark ? colors.dark.primary : colors.light.primary}
								/>
							</TouchableOpacity>
						)}

						{/* Send button */}
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
			</View>

			{/* Full-screen image viewer */}
			<Modal
				visible={fullscreenImage !== null}
				transparent={true}
				animationType="fade"
				onRequestClose={() => setFullscreenImage(null)}
			>
				<SafeAreaView style={styles.fullscreenContainer}>
					<TouchableOpacity
						style={styles.closeButton}
						onPress={() => setFullscreenImage(null)}
					>
						<Text style={styles.closeButtonText}>✕</Text>
					</TouchableOpacity>
					{fullscreenImage && (
						<Image
							source={{ uri: fullscreenImage }}
							style={styles.fullscreenImage}
							resizeMode="contain"
						/>
					)}
				</SafeAreaView>
			</Modal>
		</KeyboardAvoidingView>
	);
}
