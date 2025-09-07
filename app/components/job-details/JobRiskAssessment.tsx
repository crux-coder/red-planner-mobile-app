import React, { useCallback, useMemo, useRef, useState, useEffect } from "react";
import {
	View,
	TouchableOpacity,
	ActivityIndicator,
	Alert,
	Modal,
	SafeAreaView,
	Platform,
	StyleSheet,
	ScrollView,
} from "react-native";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import Constants from "expo-constants";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { useColorScheme } from "@/lib/useColorScheme";
import { colors } from "@/constants/colors";
import { H4 } from "@/components/ui/typography";
import { supabase } from "@/config/supabase";
import { useSupabase } from "@/context/supabase-provider";
// WebView will be required dynamically to avoid compile-time errors if the dependency isn't installed yet.

interface JobRiskAssessmentProps {
	projectId: string;
	jobId: string;
	// If provided from parent (calendar entry query), indicates whether current user has signed already
	signedByCurrentUser?: boolean;
	// If user has signed and a URL was stored, provide it so we can open in preview-only mode
	signedPdfUrl?: string | null;
}

export const JobRiskAssessment: React.FC<JobRiskAssessmentProps> = ({
	projectId,
	jobId,
	signedByCurrentUser,
	signedPdfUrl,
}) => {
	const { colorScheme } = useColorScheme();
	const isDark = colorScheme === "dark";
	const { user, session } = useSupabase();
	const [loading, setLoading] = useState(false);
	const [modalVisible, setModalVisible] = useState(false);
	const [pdfUrl, setPdfUrl] = useState<string | null>(null);
	const [webViewLoading, setWebViewLoading] = useState(false);
	const [webViewError, setWebViewError] = useState<string | null>(null);
	const [signatureData, setSignatureData] = useState<string | null>(null);
	const [parentScrollEnabled, setParentScrollEnabled] = useState(true);
	const [riskAssessmentId, setRiskAssessmentId] = useState<string | null>(null);
	const [submitting, setSubmitting] = useState(false);
	const [pendingSubmit, setPendingSubmit] = useState(false);
	const [alreadySigned, setAlreadySigned] = useState(!!signedByCurrentUser);

	const backendBaseUrl = useMemo(() => {
		const fromEnv = process.env.EXPO_PUBLIC_BACKEND_URL?.trim();
		if (fromEnv) return fromEnv;

		// Infer host from Expo to make the backend reachable from device
		try {
			// Prefer expoConfig.hostUri (SDK 49+), fallback to manifest.debuggerHost
			const hostUri =
				(Constants as any)?.expoConfig?.hostUri ||
				(Constants as any)?.manifest2?.extra?.expoClient?.hostUri ||
				(Constants as any)?.manifest?.debuggerHost;
			if (hostUri) {
				const host = String(hostUri).split(":")[0];
				return `http://${host}:3000`;
			}
		} catch {}

		// Simulator/emulator-specific defaults
		if (Platform.OS === "android") return "http://10.0.2.2:3000"; // Android emulator maps host machine
		return "http://192.168.18.195:3000"; // iOS simulator maps localhost to host machine
	}, []);

	// Supabase Storage bucket for signatures
	const SIGNATURES_BUCKET = "signatures";

	// Dynamically load WebView so the app can compile even if the dep isn't installed yet.
	const WebView = useMemo(() => {
		try {
			// eslint-disable-next-line @typescript-eslint/no-var-requires
			const mod = require("react-native-webview");
			return mod?.WebView ?? null;
		} catch (e) {
			return null;
		}
	}, []);

	// Dynamically load Signature canvas to avoid compile-time errors if not installed yet.
	const SignatureCanvas = useMemo(() => {
		try {
			// eslint-disable-next-line @typescript-eslint/no-var-requires
			const mod = require("react-native-signature-canvas");
			return mod?.default ?? mod ?? null;
		} catch (e) {
			return null;
		}
	}, []);

	const signatureRef = useRef<any>(null);
	const [canvasSize, setCanvasSize] = useState<{
		width: number;
		height: number;
	}>({ width: 0, height: 150 });

	const signatureWebStyle = useMemo(() => {
		const borderColor = isDark ? colors.dark.border : colors.light.border;
		const width = canvasSize.width > 0 ? `${canvasSize.width}px` : "100%";
		const height = `${canvasSize.height}px`;
		return `
			.m-signature-pad { box-shadow: none; }
			.m-signature-pad--footer { position: static; display: flex; flex-direction: row; justify-content: space-between; }
			.m-signature-pad--body { border: 1px solid ${borderColor}; }
			body,html { background: transparent; }
			${
				canvasSize.width > 0
					? `
				.m-signature-pad, .m-signature-pad--body { width: ${width}; height: ${height}; }
				.m-signature-pad--body canvas { width: ${width} !important; height: ${height} !important; }
			`
					: ""
			}
		`;
	}, [isDark, canvasSize.width, canvasSize.height]);

	// Minimal base64 decoder to Uint8Array to avoid adding extra deps
	// Accepts a base64 string WITHOUT the data URL prefix
	const base64ToUint8Array = (base64: string): Uint8Array => {
		const chars =
			"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
		let padding = 0;
		if (base64.endsWith("==")) padding = 2;
		else if (base64.endsWith("=")) padding = 1;
		const length = base64.length;
		const bytes = new Uint8Array(((length * 3) >> 2) - padding);
		let p = 0;
		for (let i = 0; i < length; i += 4) {
			const e1 = chars.indexOf(base64[i] ?? "A");
			const e2 = chars.indexOf(base64[i + 1] ?? "A");
			const e3 = chars.indexOf(base64[i + 2] ?? "A");
			const e4 = chars.indexOf(base64[i + 3] ?? "A");
			bytes[p++] = (e1 << 2) | (e2 >> 4);
			if (p < bytes.length) bytes[p++] = ((e2 & 15) << 4) | (e3 >> 2);
			if (p < bytes.length) bytes[p++] = ((e3 & 3) << 6) | e4;
		}
		return bytes;
	};

	// Normalize PDF host: map localhost/127.0.0.1 to LAN IP so devices can load it
	const normalizePdfHost = useCallback((url: string): string => {
		try {
			const u = new URL(url);
			if (u.hostname === "localhost" || u.hostname === "127.0.0.1") {
				u.hostname = "192.168.18.195";
			}
			return u.toString();
		} catch {
			if (
				typeof url === "string" &&
				(url.includes("localhost") || url.includes("127.0.0.1"))
			) {
				return url
					.replace(/localhost/g, "192.168.18.195")
					.replace(/127\.0\.0\.1/g, "192.168.18.195");
			}
			return url;
		}
	}, []);

	const openRiskAssessment = useCallback(async () => {
		if (!projectId) {
			Alert.alert(
				"Missing project",
				"Project ID is not available for this job.",
			);
			return;
		}

		try {
			setLoading(true);

			const { data, error } = await supabase
				.from("risk_assessments")
				.select("id, created_at")
				.eq("project_id", projectId)
				.order("created_at", { ascending: false })
				.limit(1)
				.maybeSingle();

			if (error) {
				console.error("Error fetching risk assessment:", error);
				Alert.alert("Error", "Failed to fetch risk assessment.");
				return;
			}

			if (!data) {
				Alert.alert("Not found", "No risk assessment found for this project.");
				return;
			}

			const directUrl = `${backendBaseUrl}/api/risk-assessments/${data.id}/pdf`;
			setRiskAssessmentId(data.id);

			// Prefer pre-fetched state from parent. If user has already signed, open in preview-only.
			if (signedByCurrentUser) {
				setAlreadySigned(true);
				setPdfUrl(signedPdfUrl || directUrl);
			} else {
				// Fallback: check if there's a recent signature (covers cross-device signing without refresh)
				try {
					const { data: sig, error: sigError } = await supabase
						.from("risk_assessments_signatures")
						.select("id, url, created_at, user_id")
						.eq("job_id", jobId)
						.eq("risk_assessment_id", data.id)
						.order("created_at", { ascending: false })
						.limit(1)
						.maybeSingle();

					if (sigError) {
						console.warn("Error checking existing signature:", sigError);
					}

					setAlreadySigned(!!sig);
					setPdfUrl(sig?.url || directUrl);
				} catch (sigCheckErr) {
					console.warn("Unexpected error checking signature:", sigCheckErr);
					setAlreadySigned(false);
					setPdfUrl(directUrl);
				}
			}

			setModalVisible(true);
		} catch (e) {
			console.error("Unexpected error opening risk assessment:", e);
			Alert.alert("Error", "An unexpected error occurred.");
		} finally {
			setLoading(false);
		}
	}, [projectId, jobId, backendBaseUrl, signedByCurrentUser, signedPdfUrl]);

	// Keep tile state in sync if parent props change (e.g., after refetch)
	useEffect(() => {
		setAlreadySigned(!!signedByCurrentUser);
		if (signedByCurrentUser && signedPdfUrl) {
			setPdfUrl(signedPdfUrl);
		}
	}, [signedByCurrentUser, signedPdfUrl]);

	const displayUrl = useMemo(() => {
		if (!pdfUrl) return null;
		const normalized = normalizePdfHost(pdfUrl);
		const isLocal =
			/^https?:\/\/(localhost|127\.0\.0\.1|10\.0\.2\.2|10\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}|192\.168\.[0-9]{1,3}\.[0-9]{1,3}|172\.(1[6-9]|2[0-9]|3[0-1])\.[0-9]{1,3}\.[0-9]{1,3})/.test(
				normalized,
			);
		// If we have an access token, prefer the direct URL so we can send Authorization headers
		if (Platform.OS === "android" && !isLocal && !session?.access_token) {
			// Use Google Docs viewer for publicly accessible URLs on Android
			return `https://docs.google.com/gview?embedded=1&url=${encodeURIComponent(normalized)}`;
		}
		return normalized;
	}, [pdfUrl, session?.access_token, normalizePdfHost]);

	const webViewSource = useMemo(() => {
		if (!displayUrl) return null;
		const headers = session?.access_token
			? { Authorization: `Bearer ${session.access_token}` }
			: undefined;
		return headers ? { uri: displayUrl, headers } : { uri: displayUrl };
	}, [displayUrl, session?.access_token]);

	const uploadSignature = useCallback(
		async (signature: string) => {
			if (!riskAssessmentId) {
				Alert.alert("Error", "Risk assessment ID is not available.");
				return;
			}

			if (!user?.id) {
				Alert.alert("Error", "User is not available. Please sign in again.");
				return;
			}

			try {
				setSubmitting(true);

				// 1) Convert base64 data URL directly to bytes and upload
				const base64 = signature.replace(/^data:image\/(png|jpeg);base64,/, "");
				const bytes = base64ToUint8Array(base64);
				const tmpFileName = `signature-${riskAssessmentId}-${Date.now()}.png`;
				const storagePath = `${user.id}/${tmpFileName}`;
				const { error: uploadError } = await supabase.storage
					.from(SIGNATURES_BUCKET)
					.upload(storagePath, bytes, {
						upsert: true,
						contentType: "image/png",
					});

				if (uploadError) {
					console.error("Error uploading to storage:", uploadError);
					Alert.alert("Error", "Failed to upload signature to storage.");
					return;
				}

				// 3) Create a signed URL for the uploaded file (valid for 1 hour)
				const { data: signed, error: urlError } = await supabase.storage
					.from(SIGNATURES_BUCKET)
					.createSignedUrl(storagePath, 60 * 60);

				if (urlError || !signed?.signedUrl) {
					console.error("Error creating signed URL:", urlError);
					Alert.alert("Error", "Failed to generate signature URL.");
					return;
				}

				const signatureUrl = signed.signedUrl;
				// 4) Notify backend with the signature URL + risk assessment id and job id
				const res = await fetch(
					`${backendBaseUrl}/api/risk-assessments/${riskAssessmentId}/signature`,
					{
						method: "POST",
						headers: {
							"Content-Type": "application/json",
							Accept: "application/json",
							...(session?.access_token
								? { Authorization: `Bearer ${session.access_token}` }
								: {}),
						},
						body: JSON.stringify({
							signatureUrl,
							riskAssessmentId,
							jobId,
							job_id: jobId,
						}),
					},
				);

				if (!res.ok) {
					const text = await res.text().catch(() => "");
					console.error("Error notifying backend:", res.status, text);
					Alert.alert("Error", "Failed to submit signature to backend.");
					return;
				}

				// Switch to review mode (hide signature pad) and update PDF to the signed version
				setAlreadySigned(true);
				try {
					const payload = await res.json().catch(() => null);
					if (payload?.url && typeof payload.url === "string") {
						setPdfUrl(payload.url);
					} else {
						// Fallback: fetch the latest signature record and use its url
						const { data: latestSig } = await supabase
							.from("risk_assessments_signatures")
							.select("id, url, created_at")
							.eq("job_id", jobId)
							.eq("risk_assessment_id", riskAssessmentId)
							.order("created_at", { ascending: false })
							.limit(1)
							.maybeSingle();
						if (latestSig?.url) {
							setPdfUrl(latestSig.url);
						}
					}
				} catch {}

				Alert.alert("Success", "Signature submitted successfully.");
			} catch (e) {
				console.error("Unexpected error uploading signature:", e);
				Alert.alert("Error", "An unexpected error occurred.");
			} finally {
				setSubmitting(false);
			}
		},
		[riskAssessmentId, backendBaseUrl, user?.id, jobId, session?.access_token],
	);

	const handleSubmit = useCallback(async () => {
		if (submitting) return; // avoid duplicate submits

		if (!riskAssessmentId) {
			Alert.alert("Error", "Risk assessment ID is not available.");
			return;
		}

		if (signatureData) {
			await uploadSignature(signatureData);
			return;
		}

		// No local signature captured yet. Ask the canvas to produce one.
		setPendingSubmit(true);
		signatureRef.current?.readSignature?.();
	}, [signatureData, submitting, riskAssessmentId, uploadSignature]);

	return (
		<View className="mb-4">
			{/* Header */}
			<View className="flex-row items-center mb-2">
				<MaterialIcons
					name="policy"
					size={20}
					color={isDark ? colors.dark.primary : colors.light.primary}
				/>
				<H4 className="ml-2">Risk Assessment</H4>
			</View>

			<TouchableOpacity
				className="mb-3 p-4 rounded-lg flex-row items-center justify-between"
				style={{
					backgroundColor: isDark ? colors.dark.card : colors.light.card,
					borderColor: isDark ? colors.dark.border : colors.light.border,
					borderWidth: 1,
				}}
				onPress={openRiskAssessment}
				disabled={loading}
			>
				<View className="flex-1">
					<View className="flex-row items-center mb-1">
						<Text
							className="text-lg font-semibold"
							style={{
								color: isDark
									? colors.dark.foreground
									: colors.light.foreground,
							}}
						>
							Risk Assessment PDF
						</Text>
						{alreadySigned && (
							<Ionicons
								name="checkmark-circle"
								size={18}
								color="#22c55e"
								style={{ marginLeft: 6 }}
							/>
						)}
					</View>
					{!alreadySigned ? (
						<Text className="text-sm">Tap to sign risk assessment</Text>
					) : (
						<Text className="text-sm">Preview signed risk assessment</Text>
					)}
				</View>
				{loading ? (
					<ActivityIndicator size="small" />
				) : (
					<Ionicons name="chevron-forward" size={20} />
				)}
			</TouchableOpacity>

			{/* In-app PDF viewer modal */}
			<Modal
				visible={modalVisible}
				animationType="slide"
				onRequestClose={() => setModalVisible(false)}
			>
				<SafeAreaView
					style={[
						styles.modalContainerBase,
						{
							backgroundColor: isDark
								? colors.dark.background
								: colors.light.background,
						},
					]}
				>
					{/* Modal header */}
					<View
						style={[
							styles.modalHeader,
							{
								borderBottomColor: isDark
									? colors.dark.border
									: colors.light.border,
							},
						]}
					>
						<View style={styles.headerContainer}>
							<TouchableOpacity
								onPress={() => setModalVisible(false)}
								style={styles.backButton}
								accessibilityRole="button"
								accessibilityLabel="Go back"
							>
								<Ionicons
									name={Platform.OS === "ios" ? "chevron-back" : "arrow-back"}
									size={20}
									color={isDark ? colors.dark.primary : colors.light.primary}
								/>
								<Text
									style={{
										color: isDark ? colors.dark.primary : colors.light.primary,
										fontSize: 16,
										marginLeft: 4,
									}}
								>
									Back
								</Text>
							</TouchableOpacity>
							<Text
								className="text-lg font-semibold"
								style={{
									color: isDark
										? colors.dark.foreground
										: colors.light.foreground,
								}}
							>
								Risk Assessment
							</Text>
							<View style={{ width: 60 }} />
						</View>
					</View>

					{/* WebView + Signature content */}
					<View style={styles.flex1}>
						{displayUrl ? (
							alreadySigned ? (
								// Fullscreen PDF only (review mode)
								<View style={styles.flex1}>
									{webViewLoading && (
										<View style={styles.loadingOverlay}>
											<ActivityIndicator size="large" />
											<Text style={styles.loadingText}>Loading PDF...</Text>
										</View>
									)}
									{WebView ? (
										<WebView
											source={webViewSource as any}
											onLoadStart={() => {
												setWebViewError(null);
												setWebViewLoading(true);
											}}
											onLoadEnd={() => setWebViewLoading(false)}
											onError={(syntheticEvent: any) => {
												setWebViewLoading(false);
												setWebViewError(
													syntheticEvent?.nativeEvent?.description ||
														"Failed to load PDF.",
												);
											}}
											style={styles.pdfWebView}
											originWhitelist={["*"]}
											allowFileAccess
											allowUniversalAccessFromFileURLs
										/>
									) : (
										<View style={[styles.flex1, styles.centered, styles.p16]}>
											<Text className="text-center">
												PDF viewer is not available. Please install the
												dependency:
											</Text>
											<Text className="mt-2 text-center">
												npx expo install react-native-webview
											</Text>
										</View>
									)}
								</View>
							) : (
								// PDF + signature pad mode
								<ScrollView
									contentContainerStyle={styles.scrollContent}
									scrollEnabled={parentScrollEnabled}
								>
									{/* PDF section */}
									<View style={styles.pdfSection}>
										{webViewLoading && (
											<View style={styles.loadingOverlay}>
												<ActivityIndicator size="large" />
												<Text style={styles.loadingText}>Loading PDF...</Text>
											</View>
										)}
										{WebView ? (
											<WebView
												source={webViewSource as any}
												onLoadStart={() => {
													setWebViewError(null);
													setWebViewLoading(true);
												}}
												onLoadEnd={() => setWebViewLoading(false)}
												onError={(syntheticEvent: any) => {
													setWebViewLoading(false);
													setWebViewError(
														syntheticEvent?.nativeEvent?.description ||
															"Failed to load PDF.",
													);
												}}
												style={styles.pdfWebView}
												originWhitelist={["*"]}
												allowFileAccess
												allowUniversalAccessFromFileURLs
											/>
										) : (
											<View style={[styles.flex1, styles.centered, styles.p16]}>
												<Text className="text-center">
													PDF viewer is not available. Please install the
													dependency:
												</Text>
												<Text className="mt-2 text-center">
													npx expo install react-native-webview
												</Text>
											</View>
										)}
									</View>

									{/* Signature section */}
									<View
										style={[
											styles.signatureSection,
											{
												backgroundColor: isDark
													? colors.dark.card
													: colors.light.card,
												borderColor: isDark
													? colors.dark.border
													: colors.light.border,
											},
										]}
										onLayout={(e) => {
											const { width } = e.nativeEvent.layout;
											if (
												width &&
												Math.round(width) !== Math.round(canvasSize.width)
											) {
												setCanvasSize((prev) => ({
													width,
													height: prev.height,
												}));
											}
										}}
										onTouchStart={() => setParentScrollEnabled(false)}
										onTouchEnd={() => setParentScrollEnabled(true)}
										onTouchCancel={() => setParentScrollEnabled(true)}
									>
										<Text style={styles.sectionTitle}>Sign below</Text>

										<SignatureCanvas
											ref={signatureRef}
											onBegin={() => setParentScrollEnabled(false)}
											onEnd={() => setParentScrollEnabled(true)}
											onOK={async (sig: string) => {
												setParentScrollEnabled(true);
												setSignatureData(sig);
												if (pendingSubmit) {
													setPendingSubmit(false);
													await uploadSignature(sig);
												}
											}}
											onClear={() => setParentScrollEnabled(true)}
											onEmpty={() => {
												setParentScrollEnabled(true);
												setPendingSubmit(false);
												Alert.alert(
													"Signature",
													"Please provide a signature before confirming.",
												);
											}}
											descriptionText="Sign above"
											clearText="Clear"
											confirmText="Save Signature"
											autoClear={false}
											imageType="image/png"
											webStyle={signatureWebStyle}
											backgroundColor="transparent"
											style={[
												styles.signatureCanvas,
												{ height: canvasSize.height },
											]}
										/>
										<View style={styles.actionsRow}>
											<Button
												variant="outline"
												className="flex-1"
												disabled={submitting}
												onPress={() => {
													signatureRef.current?.clearSignature?.();
													setSignatureData(null);
													setParentScrollEnabled(true);
												}}
											>
												<Text>Clear</Text>
											</Button>
											<View style={{ width: 12 }} />
											<Button
												className="flex-1"
												disabled={submitting || !riskAssessmentId}
												onPress={async () => {
													await handleSubmit();
												}}
											>
												<Text>{submitting ? "Submitting..." : "Submit"}</Text>
											</Button>
										</View>
										{signatureData ? (
											<Text style={styles.signatureSavedText}>
												Signature captured.
											</Text>
										) : null}
									</View>
								</ScrollView>
							)
						) : (
							<View style={[styles.flex1, styles.centered]}>
								<Text>No PDF to display.</Text>
							</View>
						)}
						{webViewError && (
							<View style={styles.errorBanner}>
								<Text
									style={{
										color: isDark ? colors.dark.primary : colors.light.primary,
									}}
								>
									{webViewError}
								</Text>
							</View>
						)}
					</View>
				</SafeAreaView>
			</Modal>
		</View>
	);
};

const styles = StyleSheet.create({
	flex1: { flex: 1 },
	modalContainerBase: { flex: 1 },
	centered: { alignItems: "center", justifyContent: "center" },
	modalHeader: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		paddingHorizontal: 12,
		paddingVertical: 8,
		borderBottomWidth: 1,
	},
	headerContainer: {
		flex: 1,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
	},
	backButton: {
		flexDirection: "row",
		alignItems: "center",
	},
	loadingOverlay: {
		position: "absolute",
		left: 0,
		right: 0,
		top: 0,
		bottom: 0,
		alignItems: "center",
		justifyContent: "center",
		zIndex: 1,
	},
	loadingText: { marginTop: 8 },
	errorBanner: { position: "absolute", bottom: 12, left: 12, right: 12 },
	p16: { padding: 16 },
	scrollContent: { paddingBottom: 24 },
	pdfSection: { height: 450, position: "relative" },
	pdfWebView: { flex: 1 },
	signatureSection: {
		marginTop: 16,
		borderWidth: 1,
		borderRadius: 8,
		overflow: "hidden",
	},
	sectionTitle: { fontSize: 16, fontWeight: "600", padding: 8 },
	signatureCanvas: { height: 150, width: "100%" },
	signatureSavedText: { paddingHorizontal: 8, paddingBottom: 8 },
	actionsRow: {
		flexDirection: "row",
		paddingHorizontal: 8,
		paddingBottom: 8,
		marginTop: 8,
	},
});
