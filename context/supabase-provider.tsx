import { Session, User } from "@supabase/supabase-js";
import { useRouter, useSegments, SplashScreen } from "expo-router";
import {
	createContext,
	useContext,
	useEffect,
	useState,
	useCallback,
} from "react";

import { supabase } from "@/config/supabase";

SplashScreen.preventAutoHideAsync();

// Enhanced user type with profile data
export type UserProfile = {
	id: string;
	email: string | undefined;
	first_name?: string;
	last_name?: string;
	photo?: string;
	role?: string;
	created_at?: string;
};

type SupabaseContextProps = {
	user: User | null;
	session: Session | null;
	userProfile: UserProfile | null;
	initialized?: boolean;
	signUp: (email: string, password: string) => Promise<void>;
	signInWithPassword: (email: string, password: string) => Promise<void>;
	signOut: () => Promise<void>;
	refreshUserProfile: () => Promise<void>;
	onLayoutRootView: () => Promise<void>;
};

type SupabaseProviderProps = {
	children: React.ReactNode;
};

export const SupabaseContext = createContext<SupabaseContextProps>({
	user: null,
	session: null,
	userProfile: null,
	initialized: false,
	signUp: async () => {},
	signInWithPassword: async () => {},
	signOut: async () => {},
	refreshUserProfile: async () => {},
	onLayoutRootView: async () => {},
});

export const useSupabase = () => useContext(SupabaseContext);

export const SupabaseProvider = ({ children }: SupabaseProviderProps) => {
	const router = useRouter();
	const segments = useSegments();
	const [user, setUser] = useState<User | null>(null);
	const [session, setSession] = useState<Session | null>(null);
	const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
	const [initialized, setInitialized] = useState<boolean>(false);
	const [appIsReady, setAppIsReady] = useState<boolean>(false);

	// Fetch user profile data
	const fetchUserProfile = async (userId: string) => {
		try {
			const { data, error } = await supabase
				.from("users")
				.select("*")
				.eq("id", userId)
				.single();

			if (error) {
				console.error("Error fetching user profile:", error);
				return null;
			}

			return data;
		} catch (error) {
			console.error("Error in fetchUserProfile:", error);
			return null;
		}
	};

	// Update user profile state with user and profile data
	const updateUserProfile = async (authUser: User | null) => {
		if (!authUser) {
			setUserProfile(null);
			return;
		}

		const profile = await fetchUserProfile(authUser.id);

		setUserProfile({
			id: authUser.id,
			email: authUser.email,
			first_name: profile?.first_name,
			last_name: profile?.last_name,
			photo: profile?.photo,
			role: profile?.role,
			created_at: authUser.created_at,
		});
	};

	// Method to refresh user profile data
	const refreshUserProfile = async () => {
		if (!user) return;
		await updateUserProfile(user);
	};

	const signUp = async (email: string, password: string) => {
		const { error } = await supabase.auth.signUp({
			email,
			password,
		});
		if (error) {
			throw error;
		}
	};

	const signInWithPassword = async (email: string, password: string) => {
		const { data, error } = await supabase.auth.signInWithPassword({
			email,
			password,
		});
		if (error) {
			throw error;
		}
		if (data.user) {
			await updateUserProfile(data.user);
		}
	};

	const signOut = async () => {
		const { error } = await supabase.auth.signOut();
		if (error) {
			throw error;
		}
		setUserProfile(null);
	};

	useEffect(() => {
		async function prepare() {
			try {
				const {
					data: { session },
				} = await supabase.auth.getSession();
				setSession(session);
				setUser(session ? session.user : null);

				if (session?.user) {
					await updateUserProfile(session.user);
				}

				setInitialized(true);

				const {
					data: { subscription },
				} = supabase.auth.onAuthStateChange(async (_event, session) => {
					setSession(session);
					const authUser = session ? session.user : null;
					setUser(authUser);

					await updateUserProfile(authUser);
				});

				await new Promise((resolve) => setTimeout(resolve, 100));
			} catch (e) {
				console.warn(e);
			} finally {
				setAppIsReady(true);
			}
		}

		prepare();
	}, []);

	useEffect(() => {
		if (!initialized || !appIsReady) return;

		const inProtectedGroup = segments[1] === "(protected)";

		if (session && !inProtectedGroup) {
			router.replace("/(app)/(protected)/tracker");
		} else if (!session) {
			router.replace("/(app)/welcome");
		}
	}, [initialized, appIsReady, session]);

	const onLayoutRootView = useCallback(async () => {
		if (appIsReady) {
			await SplashScreen.hideAsync();
		}
	}, [appIsReady]);

	if (!initialized || !appIsReady) {
		return null;
	}

	return (
		<SupabaseContext.Provider
			value={{
				user,
				session,
				userProfile,
				initialized,
				signUp,
				signInWithPassword,
				signOut,
				refreshUserProfile,
				onLayoutRootView,
			}}
		>
			{children}
		</SupabaseContext.Provider>
	);
};
