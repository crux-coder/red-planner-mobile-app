import React, { useState, useEffect } from "react";
import {
	View,
	ScrollView,
	Image,
	TouchableOpacity,
	ActivityIndicator,
	Alert,
	Platform,
} from "react-native";
import { useForm } from "react-hook-form";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { H1, H3, Muted } from "@/components/ui/typography";
import { useSupabase } from "@/context/supabase-provider";
import { Form, FormField, FormInput } from "@/components/ui/form";
import { SafeAreaView } from "@/components/safe-area-view";
import { colors } from "@/constants/colors";
import { supabase } from "@/config/supabase";
import { useColorScheme } from "@/lib/useColorScheme";

// Define the form schema using Zod
const profileSchema = z.object({
	first_name: z.string().min(1, "First name is required"),
	last_name: z.string().min(1, "Last name is required"),
	email: z.string().email("Invalid email address"),
	title: z.string().optional().nullable(),
	photo: z.string().optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export default function Settings() {
	const { user, signOut } = useSupabase();
	const [loading, setLoading] = useState(false);
	const [photoLoading, setPhotoLoading] = useState(false);
	const [profileData, setProfileData] = useState<ProfileFormValues | null>(
		null,
	);
	const [photoUrl, setPhotoUrl] = useState<string | null>(null);
	const { colorScheme } = useColorScheme();
	const isDark = colorScheme === "dark";

	const form = useForm<ProfileFormValues>({
		resolver: zodResolver(profileSchema),
		defaultValues: {
			first_name: "",
			last_name: "",
			email: user?.email || "",
			title: null,
			photo: undefined,
		},
	});

	// Fetch user profile data
	useEffect(() => {
		if (!user) return;

		const fetchUserProfile = async () => {
			setLoading(true);
			try {
				const { data, error } = await supabase
					.from("users")
					.select("*")
					.eq("id", user.id)
					.single();

				if (error) {
					throw error;
				}

				if (data) {
					setProfileData({
						first_name: data.first_name || "",
						last_name: data.last_name || "",
						email: data.email || user.email || "",
						title: data.title,
						photo: data.photo,
					});

					// Set form values
					form.reset({
						first_name: data.first_name || "",
						last_name: data.last_name || "",
						email: data.email || user.email || "",
						title: data.title,
						photo: data.photo,
					});

					// Get photo URL if it exists
					if (data.photo) {
						setPhotoUrl(data.photo);
					}
				}
			} catch (error) {
				console.error("Error fetching profile:", error);
				Alert.alert("Error", "Failed to load profile data");
			} finally {
				setLoading(false);
			}
		};

		fetchUserProfile();
	}, [user]);

	const onSubmit = async (data: ProfileFormValues) => {
		if (!user) return;

		setLoading(true);
		try {
			// Update user profile in Supabase
			const { error } = await supabase
				.from("users")
				.update({
					first_name: data.first_name,
					last_name: data.last_name,
					email: data.email,
					title: data.title,
					photo: data.photo,
					updated_at: new Date().toISOString(),
				})
				.eq("id", user.id);

			if (error) {
				throw error;
			}

			Alert.alert("Success", "Profile updated successfully");
		} catch (error) {
			console.error("Error updating profile:", error);
			Alert.alert("Error", "Failed to update profile");
		} finally {
			setLoading(false);
		}
	};

	const pickImage = async () => {
		if (!user) return;

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
				allowsEditing: true,
				aspect: [1, 1],
				quality: 0.8,
			});

			if (!result.canceled && result.assets && result.assets.length > 0) {
				const selectedAsset = result.assets[0];
				await uploadImage(selectedAsset.uri);
			}
		} catch (error) {
			console.error("Error picking image:", error);
			Alert.alert("Error", "Failed to pick image");
		}
	};

	const uploadImage = async (uri: string) => {
		if (!user) return;

		setPhotoLoading(true);
		try {
			// Convert URI to Blob
			const response = await fetch(uri);
			const blob = await response.blob();

			// Upload to Supabase Storage
			const fileExt = uri.split(".").pop();
			const fileName = `${user.id}`;

			const { error: uploadError } = await supabase.storage
				.from("avatars")
				.upload(fileName, blob, {
					upsert: true,
					contentType: `image/${fileExt}`,
				});

			if (uploadError) {
				throw uploadError;
			}

			// Get the public URL
			const { data } = await supabase.storage
				.from("avatars")
				.getPublicUrl(fileName);

			if (data?.publicUrl) {
				setPhotoUrl(data.publicUrl);

				// Update user record with photo URL
				await supabase
					.from("users")
					.update({
						photo: data.publicUrl,
						updated_at: new Date().toISOString(),
					})
					.eq("id", user.id);
			}

			Alert.alert("Success", "Profile photo updated successfully");
		} catch (error) {
			console.error("Error uploading image:", error);
			Alert.alert("Error", "Failed to upload image");
		} finally {
			setPhotoLoading(false);
		}
	};

	const getInitials = (firstName?: string, lastName?: string) => {
		const first = firstName ? firstName.charAt(0).toUpperCase() : "";
		const last = lastName ? lastName.charAt(0).toUpperCase() : "";
		return `${first}${last}`;
	};

	if (loading && !profileData) {
		return (
			<View className="flex-1 items-center justify-center bg-background">
				<ActivityIndicator
					size="large"
					color={isDark ? colors.dark.primary : colors.light.primary}
				/>
				<Text className="mt-4">Loading profile...</Text>
			</View>
		);
	}

	return (
		<SafeAreaView className="flex-1 bg-background">
			<View className="flex-1 flex-col justify-between">
				<ScrollView className="p-4">
					<H1 className="text-center mb-6">My Account</H1>

					{/* Profile Photo Section */}
					<View className="items-center mb-8">
						<TouchableOpacity onPress={pickImage} disabled={photoLoading}>
							{photoUrl ? (
								<Image
									source={{ uri: photoUrl }}
									style={{ width: 120, height: 120, borderRadius: 60 }}
									className="border-2 border-primary"
								/>
							) : (
								<View
									style={{ width: 120, height: 120, borderRadius: 60 }}
									className="bg-primary items-center justify-center"
								>
									<Text className="text-white text-3xl font-bold">
										{getInitials(
											form.watch("first_name"),
											form.watch("last_name"),
										)}
									</Text>
								</View>
							)}

							{photoLoading ? (
								<View className="absolute inset-0 items-center justify-center bg-black/30 rounded-full">
									<ActivityIndicator
										color={isDark ? colors.light.primary : colors.dark.primary}
									/>
								</View>
							) : (
								<View className="absolute bottom-0 right-0 bg-primary rounded-full p-2">
									<Ionicons
										name="camera"
										size={20}
										color={isDark ? colors.light.primary : colors.dark.primary}
									/>
								</View>
							)}
						</TouchableOpacity>
						<Text className="text-muted-foreground mt-2">
							Tap to change photo
						</Text>
					</View>

					{/* Profile Form */}
					<View className="space-y-4 mb-8">
						<Form {...form}>
							<FormField
								control={form.control}
								name="first_name"
								render={({ field }) => (
									<FormInput
										label="First Name"
										placeholder="Enter your first name"
										autoCapitalize="words"
										{...field}
									/>
								)}
							/>

							<FormField
								control={form.control}
								name="last_name"
								render={({ field }) => (
									<FormInput
										label="Last Name"
										placeholder="Enter your last name"
										autoCapitalize="words"
										{...field}
									/>
								)}
							/>

							<FormField
								control={form.control}
								name="email"
								render={({ field }) => (
									<FormInput
										label="Email"
										disabled={true}
										editable={false}
										placeholder="Enter your email"
										keyboardType="email-address"
										autoCapitalize="none"
										{...field}
									/>
								)}
							/>

							<FormField
								control={form.control}
								name="title"
								render={({ field }) => (
									<FormInput
										label="Job Title"
										placeholder="Enter your job title"
										autoCapitalize="words"
										value={field.value || ""}
										onChange={field.onChange}
										onBlur={field.onBlur}
										name={field.name}
									/>
								)}
							/>

							<Button
								className="w-full mt-4"
								size="default"
								variant="default"
								onPress={form.handleSubmit(onSubmit)}
								disabled={loading}
							>
								{loading ? (
									<ActivityIndicator
										size="small"
										color={isDark ? colors.dark.primary : colors.light.primary}
									/>
								) : (
									<Text
										className={
											isDark ? colors.dark.primary : colors.light.primary
										}
									>
										Save Changes
									</Text>
								)}
							</Button>
						</Form>
					</View>
				</ScrollView>

				{/* Sign Out Section - Fixed at bottom */}
				<View className="p-4 border-t border-border">
					<Button
						className="w-full"
						size="default"
						variant="destructive"
						onPress={signOut}
					>
						<Text className="text-white">Sign Out</Text>
					</Button>
				</View>
			</View>
		</SafeAreaView>
	);
}
