import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { ActivityIndicator, View, SafeAreaView, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import * as z from "zod";
import { useState } from "react";

import { Image } from "@/components/image";
import { Button } from "@/components/ui/button";
import { Form, FormField, FormInput } from "@/components/ui/form";
import { Text } from "@/components/ui/text";
import { H1, Muted } from "@/components/ui/typography";
import { useSupabase } from "@/context/supabase-provider";
import { colors } from "@/constants/colors";
import { useColorScheme } from "@/lib/useColorScheme";

const formSchema = z.object({
	email: z.string().email("Please enter a valid email address."),
	password: z
		.string()
		.min(8, "Please enter at least 8 characters.")
		.max(64, "Please enter fewer than 64 characters."),
});

export default function WelcomeScreen() {
	const { signInWithPassword } = useSupabase();
	const [loginError, setLoginError] = useState<string | null>(null);
	const { colorScheme } = useColorScheme();
	const isDark = colorScheme === "dark";

	const form = useForm<z.infer<typeof formSchema>>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			email: "",
			password: "",
		},
	});

	async function onSubmit(data: z.infer<typeof formSchema>) {
		try {
			// Clear any previous errors
			setLoginError(null);

			// Attempt to sign in
			await signInWithPassword(data.email, data.password);

			// If we get here, sign in was successful
			form.reset();
		} catch (error: any) {
			console.error("Login error:", error.message);

			// Handle specific error types
			if (error.message.includes("Invalid login credentials")) {
				setLoginError("Incorrect email or password. Please try again.");
			} else if (error.message.includes("Email not confirmed")) {
				setLoginError("Please verify your email address before signing in.");
			} else {
				setLoginError(error.message || "An error occurred during sign in.");
			}
		}
	}

	return (
		<SafeAreaView className="flex-1 bg-background">
			<KeyboardAvoidingView
				behavior={Platform.OS === "ios" ? "padding" : "height"}
				className="flex-1"
				keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
			>
				<ScrollView
					contentContainerStyle={{ flexGrow: 1 }}
					keyboardShouldPersistTaps="handled"
					className="flex-1"
				>
					<View className="flex-1 items-center justify-center gap-y-4 web:m-4 p-4">
				<View className="flex flex-row w-full items-center justify-center">
					<Image
						source={require("@/assets/logo.png")}
						className="w-16 h-16 rounded-xl mb-2"
					/>
					<H1 className="text-center">Red Planner</H1>
				</View>
				<Muted className="text-center mb-4">
					Please sign in to access your planner
				</Muted>

				{loginError && (
					<View className="w-full bg-destructive/20 p-3 rounded-md mb-2">
						<Text
							style={{
								color: isDark
									? colors.dark.destructive
									: colors.light.destructive,
							}}
						>
							{loginError}
						</Text>
					</View>
				)}

				<Form {...form}>
					<View className="w-full gap-4">
						<FormField
							control={form.control}
							name="email"
							render={({ field }) => (
								<FormInput
									label="Email"
									placeholder="Email"
									autoCapitalize="none"
									autoComplete="email"
									autoCorrect={false}
									keyboardType="email-address"
									{...field}
								/>
							)}
						/>
						<FormField
							control={form.control}
							name="password"
							render={({ field }) => (
								<FormInput
									label="Password"
									placeholder="Password"
									autoCapitalize="none"
									autoCorrect={false}
									secureTextEntry
									{...field}
								/>
							)}
						/>
					</View>
				</Form>
				<Button
					size="default"
					variant="default"
					onPress={form.handleSubmit(onSubmit)}
					disabled={form.formState.isSubmitting}
					className="web:m-4 w-full"
				>
					{form.formState.isSubmitting ? (
						<ActivityIndicator size="small" />
					) : (
						<Text>Sign In</Text>
					)}
				</Button>
					</View>
				</ScrollView>
			</KeyboardAvoidingView>
		</SafeAreaView>
	);
}
