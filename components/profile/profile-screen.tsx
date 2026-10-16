import { useFocusEffect, usePreventRemove } from "@react-navigation/native";
import {
	createNativeStackNavigator,
	type NativeStackScreenProps,
} from "@react-navigation/native-stack";
import {
	createContext,
	useContext,
	useCallback,
	useEffect,
	useRef,
	useState,
} from "react";
import {
	ActivityIndicator,
	Alert,
	Platform,
	Image,
	Pressable,
	ScrollView,
	Text,
	View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { toast } from "sonner-native";

import {
	ProfileMenu,
	profileDestinations,
	type ProfileDestination,
} from "./menu";
import { PersonalDetails, PersonalSkeleton } from "./personal-details";
import { ProfileRecords } from "./records";
import {
	Action,
	ClothingSkeleton,
	Detail,
	ProfileSkeleton,
	Section,
	s,
} from "./ui";

import { useDotRefresh } from "@/components/haptic-refresh-control";
import { AppHeader } from "@/components/home/app-header";
import { FrostedHeader } from "@/components/home/frosted-header";
import { Icon, type IconName } from "@/components/home/icon";
import { Select } from "@/components/hr/ui";
import { request, useResource } from "@/components/hr/use-hr";
import { useAuth } from "@/context/auth";
import {
	clothingFields,
	groups,
	readable,
	optionLabel,
	type Field,
	type Profile,
} from "@/lib/profile/model";

type ProfileScreenProps = {
	bottomPadding: number;
	onNotifications: () => void;
	unreadCount: number;
	onSignOut: () => void;
	signingOut: boolean;
	signOutError: string | null;
	onOpenHr?: () => void;
};
type ProfileStackParams = { menu: undefined } & Record<
	ProfileDestination,
	undefined
>;
const Stack = createNativeStackNavigator<ProfileStackParams>();
const ProfileContext = createContext<ProfileScreenProps | null>(null);

export function ProfileScreen(props: ProfileScreenProps) {
	return (
		<ProfileContext.Provider value={props}>
			<Stack.Navigator
				initialRouteName="menu"
				screenOptions={{
					headerShown: false,
					gestureEnabled: true,
					fullScreenGestureEnabled: false,
					contentStyle: { backgroundColor: "#fff" },
				}}
			>
				<Stack.Screen name="menu" component={ProfileRoute} />
				{profileDestinations.map((item) => (
					<Stack.Screen key={item.id} name={item.id} component={ProfileRoute} />
				))}
			</Stack.Navigator>
		</ProfileContext.Provider>
	);
}

function ProfileRoute({
	route,
	navigation,
}: NativeStackScreenProps<ProfileStackParams>) {
	const props = useContext(ProfileContext);
	if (!props) throw new Error("Profile routes require ProfileContext");
	return <ProfilePage {...props} route={route} navigation={navigation} />;
}

function ProfilePage({
	bottomPadding,
	onNotifications,
	unreadCount,
	onSignOut,
	signingOut,
	signOutError,
	onOpenHr,
	route,
	navigation,
}: ProfileScreenProps & NativeStackScreenProps<ProfileStackParams>) {
	function confirmSignOut() {
		if (signingOut) return;
		if (Platform.OS === "web") {
			if (window.confirm("Sign out of Red Planner?")) onSignOut();
			return;
		}
		Alert.alert(
			"Sign out?",
			"Are you sure you want to sign out of Red Planner?",
			[
				{ text: "Cancel", style: "cancel" },
				{ text: "Sign out", style: "destructive", onPress: onSignOut },
			],
		);
	}
	const { session } = useAuth();
	const insets = useSafeAreaInsets();
	const [headerHeight, setHeaderHeight] = useState(66 + insets.top);
	const destination = route.name === "menu" ? null : route.name;
	const [recordsBusy, setRecordsBusy] = useState(false);
	const [clothingDraft, setClothingDraft] = useState<Record<
		string,
		string
	> | null>(null);
	const [clothingSaving, setClothingSaving] = useState(false);
	const clothingLock = useRef(false);
	function navigate(next: ProfileDestination | null) {
		if (recordsBusy || clothingLock.current) return;
		setNotice(null);
		if (next) navigation.navigate(next);
		else navigation.goBack();
	}

	const navigationBlocked = recordsBusy || clothingSaving;
	usePreventRemove(navigationBlocked, () => {});
	useEffect(() => {
		navigation.setOptions({
			gestureEnabled: Boolean(destination) && !navigationBlocked,
		});
	}, [navigation, destination, navigationBlocked]);

	const [revision, setRevision] = useState(0);
	const [notice, setNotice] = useState<string | null>(null);
	const [photoFailed, setPhotoFailed] = useState(false);
	const profile = useResource<{ employee: Profile }>("/profile");
	const hasFocused = useRef(false);
	useFocusEffect(
		useCallback(() => {
			if (destination) return;
			if (hasFocused.current) profile.refresh();
			hasFocused.current = true;
		}, [destination, profile.refresh]),
	);
	const countries = useResource<{ countries: { id: string; name: string }[] }>(
		"/profile/countries",
	);
	const emergency = useResource<{ contacts: Record<string, unknown>[] }>(
		"/profile/emergency-contacts",
	);
	const clothing = useResource<{
		sizes: Record<string, string>;
		confirmedAt: string | null;
	}>("/profile/clothing");
	useEffect(() => {
		if (destination === "clothing" && clothing.error) {
			toast.error("Could not load clothing sizes", {
				id: "clothing-load-error",
				description: clothing.error,
				duration: 8000,
			});
		}
	}, [destination, clothing.error]);
	const refresh = () => {
		setRevision((v) => v + 1);
		profile.refresh();
		emergency.refresh();
		clothing.refresh();
		countries.refresh();
	};
	const dots = useDotRefresh(profile.loading, refresh);
	const employee = profile.data?.employee;
	function display(field: Field) {
		const value = employee?.[field.key];
		return field.type === "country"
			? (countries.data?.countries.find((c) => c.id === value)?.name ??
					(value ? "Country unavailable" : null))
			: field.options && typeof value === "string"
				? optionLabel(value)
				: value;
	}
	async function saveClothing(key: string, value: string) {
		if (clothingLock.current || !clothing.data) return;
		const previous = clothingDraft ?? clothing.data.sizes;
		if (previous[key] === value) return;
		clothingLock.current = true;
		setClothingDraft({ ...previous, [key]: value });
		setClothingSaving(true);
		const toastId = toast.loading("Saving size…");
		setNotice(null);
		try {
			const saved = await request<{
				sizes: Record<string, string>;
				confirmedAt: string | null;
			}>("/profile/clothing", {
				method: "PATCH",
				body: { sizes: { [key]: value } },
			});
			setClothingDraft(saved.sizes);
			toast.success("Size updated", { id: toastId, duration: 2200 });
		} catch (error) {
			setClothingDraft(previous);
			toast.error("Size not saved", {
				id: toastId,
				description:
					(error instanceof Error ? error.message : "Unable to save.") +
					" Choose the size again to retry.",
				duration: 8000,
			});
		} finally {
			clothingLock.current = false;
			setClothingSaving(false);
		}
	}

	const name = employee
		? [employee.first_name, employee.middle_name, employee.last_name]
				.filter(Boolean)
				.join(" ") || "Your profile"
		: "";
	const initials = name
		.split(" ")
		.map((v) => v[0])
		.slice(0, 2)
		.join("")
		.toUpperCase();
	return (
		<View style={s.flex}>
			<View
				pointerEvents="none"
				style={{
					top: headerHeight,
					zIndex: 1,
				}}
			>
				{dots.indicator}
			</View>
			<ScrollView
				key={destination ?? "menu"}
				contentContainerStyle={{
					paddingTop:
						headerHeight +
						(destination === "personal"
							? 0
							: destination === "clothing"
								? 8
								: 16),
					paddingHorizontal: 20,
					paddingBottom: bottomPadding,
				}}
				refreshControl={dots.control}
				onScroll={dots.onScroll}
				scrollEventThrottle={16}
				keyboardShouldPersistTaps="handled"
			>
				{profile.loading && !employee ? (
					destination === "clothing" ? (
						<ClothingSkeleton />
					) : destination === "personal" ? (
						<PersonalSkeleton />
					) : (
						<ProfileSkeleton
							menu={!destination}
							compact={Boolean(destination)}
						/>
					)
				) : null}
				{profile.error ? (
					<View style={{ gap: 8, paddingVertical: 20 }}>
						<Text accessibilityRole="alert" style={s.error}>
							{profile.error}
						</Text>
						<Action title="Retry profile" onPress={profile.refresh} />
					</View>
				) : null}
				{employee ? (
					<>
						{!destination ? (
							<>
								<View
									style={{
										backgroundColor: "#10213b",
										borderRadius: 16,
										padding: 20,
										gap: 16,
										flexDirection: "row",
										alignItems: "center",
									}}
								>
									{typeof employee.photo === "string" &&
									/^https:\/\//.test(employee.photo) &&
									!photoFailed ? (
										<Image
											source={{ uri: employee.photo }}
											accessibilityLabel="Profile photo"
											onError={() => setPhotoFailed(true)}
											style={{ width: 68, height: 68, borderRadius: 34 }}
										/>
									) : (
										<View
											style={{
												width: 68,
												height: 68,
												borderRadius: 34,
												backgroundColor: "#314762",
												alignItems: "center",
												justifyContent: "center",
											}}
										>
											<Text
												style={{
													color: "white",
													fontSize: 24,
													fontWeight: "700",
												}}
											>
												{initials || "?"}
											</Text>
										</View>
									)}
									<View style={{ flex: 1, gap: 6 }}>
										<Text
											style={{
												color: "white",
												fontSize: 22,
												fontWeight: "700",
											}}
										>
											{name}
										</Text>
										<Text style={{ color: "#c2cfe0", fontSize: 14 }}>
											{readable(employee.job_title)}
										</Text>
										<Text
											selectable
											style={{ color: "white", fontSize: 13, lineHeight: 19 }}
										>
											{String(
												employee.email ||
													session?.user.email ||
													"No email recorded",
											)}
										</Text>
										<Text selectable style={{ color: "white", fontSize: 13 }}>
											{String(employee.phone_number || "No phone recorded")}
										</Text>
									</View>
								</View>
								<ProfileMenu onSelect={navigate} />
							</>
						) : null}
						{notice ? (
							<Text
								accessibilityLiveRegion="polite"
								style={{ color: "#227646", paddingVertical: 14 }}
							>
								{notice}
							</Text>
						) : null}
						{destination === "personal" && countries.error ? (
							<Text accessibilityRole="alert" style={s.error}>
								Country choices could not load.{" "}
								<Text onPress={countries.refresh}>Retry</Text>
							</Text>
						) : null}
						{destination === "personal" ? (
							<PersonalDetails
								employee={employee}
								countries={countries.data?.countries ?? null}
								contacts={emergency.data?.contacts ?? null}
								contactsLoading={emergency.loading}
								contactsError={emergency.error}
								onRefreshContacts={emergency.refresh}
								onRefreshProfile={profile.refresh}
								onBusyChange={setRecordsBusy}
							/>
						) : null}
						{destination === "clothing" ? (
							<View>
								{clothing.loading && !clothing.data ? (
									<ClothingSkeleton />
								) : null}
								{clothing.error ? (
									<Action title="Retry clothing" onPress={clothing.refresh} />
								) : null}
								{clothing.data ? (
									<View>
										{clothingFields.map((f, index) => (
											<Select
												key={f.key}
												title={f.label}
												selectedColor="#111111"
												separator={index < clothingFields.length - 1}
												rowIcon={
													(
														{
															red_jacket: "jacket",
															polo: "clothing",
															fleece: "jacket",
															yellow_hi_vis: "vest",
															orange_hi_vis: "vest",
															orange_coverall: "coverall",
															orange_long_sleeve: "long-sleeve",
															orange_trousers: "trousers",
														} as Record<string, IconName>
													)[f.key]
												}
												value={
													(clothingDraft ?? clothing.data?.sizes)?.[f.key] ?? ""
												}
												disabled={clothingSaving}
												options={[
													...f.options.map((value) => ({
														value,
														label:
															value === "not_required" ? "Not required" : value,
													})),
												]}
												onChange={(value) => saveClothing(f.key, value)}
											/>
										))}
									</View>
								) : null}
							</View>
						) : null}
						{destination === "work" ? (
							<>
								{groups.slice(3).map((g) => (
									<Section key={g.title} title={g.title} managed>
										{g.fields.map((f) => (
											<Detail key={f.key} label={f.label} value={display(f)} />
										))}
									</Section>
								))}
								{employee.payroll_profile &&
								typeof employee.payroll_profile === "object" ? (
									<Section title="Country payroll details" managed>
										{Object.entries(employee.payroll_profile)
											.filter(([k]) => k !== "id")
											.map(([key, value]) => (
												<Detail
													key={key}
													label={optionLabel(key)}
													value={value}
												/>
											))}
									</Section>
								) : null}
								{Array.isArray(employee.absence_policy_assignments) ? (
									<Section title="Leave entitlement" managed>
										{employee.absence_policy_assignments.length === 0 ? (
											<Text style={s.label}>No leave policy assigned.</Text>
										) : (
											employee.absence_policy_assignments.map(
												(a: {
													id: string;
													effective_from: string;
													effective_to: string | null;
													entitlement_units: number;
													carry_over_units: number;
												}) => (
													<View key={a.id} style={{ paddingBottom: 12 }}>
														<Detail
															label="Effective from"
															value={a.effective_from}
														/>
														<Detail
															label="Effective to"
															value={a.effective_to}
														/>
														<Detail
															label="Entitlement (units)"
															value={a.entitlement_units}
														/>
														<Detail
															label="Carry-over (units)"
															value={a.carry_over_units}
														/>
													</View>
												),
											)
										)}
										<Detail
											label="Additional leave days"
											value={employee.additional_annual_leave_days}
										/>
									</Section>
								) : null}
							</>
						) : null}
						{destination === "training" || destination === "documents" ? (
							<ProfileRecords
								section={destination}
								onBusyChange={setRecordsBusy}
								revision={revision}
								qualifications={
									Array.isArray(employee.qualifications)
										? employee.qualifications
										: []
								}
							/>
						) : null}
					</>
				) : null}
				{(destination === "documents" || destination === "work") && onOpenHr ? (
					<Section title="HR documents & leave">
						<Text style={s.label}>
							Review assigned documents, signed records and leave requests.
						</Text>
						<Action title="Open HR" onPress={onOpenHr} />
					</Section>
				) : null}
				{!destination ? (
					<View style={{ paddingTop: 24, gap: 8 }}>
						{signOutError ? (
							<Text accessibilityRole="alert" style={s.error}>
								{signOutError}
							</Text>
						) : null}
						<Pressable
							accessibilityRole="button"
							accessibilityState={{ disabled: signingOut, busy: signingOut }}
							disabled={signingOut}
							onPress={confirmSignOut}
							style={({ pressed }) => ({
								minHeight: 48,
								borderRadius: 10,
								backgroundColor: "#e90087",
								flexDirection: "row",
								alignItems: "center",
								justifyContent: "center",
								gap: 10,
								opacity: pressed || signingOut ? 0.6 : 1,
							})}
						>
							{signingOut ? (
								<ActivityIndicator
									accessibilityLabel="Signing out"
									color="white"
								/>
							) : null}
							<Text style={{ color: "white", fontSize: 16, fontWeight: "600" }}>
								{signingOut ? "Signing out…" : "Sign out"}
							</Text>
						</Pressable>
					</View>
				) : null}
			</ScrollView>
			<FrostedHeader onHeightChange={setHeaderHeight}>
				<AppHeader
					onNotifications={onNotifications}
					unreadCount={unreadCount}
					leading={
						destination ? (
							<Pressable
								accessibilityRole="button"
								accessibilityLabel="Back to profile"
								disabled={recordsBusy || clothingSaving}
								onPress={() => navigate(null)}
								style={{
									width: 44,
									height: 44,
									justifyContent: "center",
									alignItems: "center",
									opacity: recordsBusy || clothingSaving ? 0.4 : 1,
								}}
							>
								<View style={{ transform: [{ rotate: "180deg" }] }}>
									<Icon name="chevron" color="#075ed2" />
								</View>
							</Pressable>
						) : undefined
					}
				>
					<View
						style={{
							flexDirection: "row",
							justifyContent: "center",
							alignItems: "center",
							gap: 8,
						}}
					>
						{destination === "clothing" ? (
							<Icon name="clothing" size={21} color="#075ed2" />
						) : null}
						<Text style={[s.heading, { textAlign: "center" }]}>
							{destination
								? profileDestinations.find((item) => item.id === destination)
										?.title
								: "Profile"}
						</Text>
					</View>
				</AppHeader>
			</FrostedHeader>
		</View>
	);
}
