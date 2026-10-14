import "react-native-url-polyfill/auto";
import "./crypto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import { Platform } from "react-native";

const url = process.env.EXPO_PUBLIC_API_URL;
const key = process.env.EXPO_PUBLIC_API_KEY;
if (!url || !key)
	throw new Error(
		"Set EXPO_PUBLIC_API_URL and EXPO_PUBLIC_API_KEY in .env before starting RedPlanner.",
	);

export const supabase = createClient(url, key, {
	auth: {
		...(Platform.OS !== "web" ? { storage: AsyncStorage } : {}),
		autoRefreshToken: true,
		persistSession: true,
		detectSessionInUrl: false,
		flowType: "pkce",
	},
});
