import * as Haptics from "expo-haptics";
import { useEffect, useRef, useState } from "react";
import {
	AccessibilityInfo,
	Animated,
	Platform,
	RefreshControl,
	StyleSheet,
	View,
	type NativeScrollEvent,
	type NativeSyntheticEvent,
} from "react-native";

function RefreshDots({ refreshing }: { refreshing: boolean }) {
	const values = useRef([
		new Animated.Value(0),
		new Animated.Value(0),
		new Animated.Value(0),
	]).current;
	const [reduceMotion, setReduceMotion] = useState(true);
	useEffect(() => {
		let mounted = true;
		AccessibilityInfo.isReduceMotionEnabled()
			.then((value) => {
				if (mounted) setReduceMotion(value);
			})
			.catch(() => {});
		const listener = AccessibilityInfo.addEventListener(
			"reduceMotionChanged",
			setReduceMotion,
		);
		return () => {
			mounted = false;
			listener.remove();
		};
	}, []);
	useEffect(() => {
		if (!refreshing || reduceMotion) return;
		const animations = values.map((value, index) =>
			Animated.loop(
				Animated.sequence([
					Animated.delay(index * 120),
					Animated.timing(value, {
						toValue: 1,
						duration: 260,
						useNativeDriver: true,
					}),
					Animated.timing(value, {
						toValue: 0,
						duration: 260,
						useNativeDriver: true,
					}),
					Animated.delay(360 - index * 120),
				]),
			),
		);
		animations.forEach((animation) => animation.start());
		return () => {
			animations.forEach((animation) => animation.stop());
			values.forEach((value) => value.setValue(0));
		};
	}, [refreshing, reduceMotion, values]);
	return (
		<View
			pointerEvents="none"
			style={s.indicator}
			accessible
			accessibilityRole="progressbar"
			accessibilityLabel={refreshing ? "Refreshing" : "Pull to refresh"}
			accessibilityState={{ busy: refreshing }}
		>
			<View style={s.dots}>
				{values.map((value, index) => (
					<Animated.View
						key={index}
						style={[
							s.dot,
							{
								opacity: value.interpolate({
									inputRange: [0, 1],
									outputRange: [0.4, 1],
								}),
								transform: [
									{
										translateY: value.interpolate({
											inputRange: [0, 1],
											outputRange: [0, -4],
										}),
									},
								],
							},
						]}
					/>
				))}
			</View>
		</View>
	);
}

// Keep the native pull gesture and scroll physics, replacing only its visual.
export function useDotRefresh(refreshing: boolean, onRefresh: () => void) {
	const [pulling, setPulling] = useState(false);
	const [requested, setRequested] = useState(false);
	useEffect(() => {
		if (!refreshing) {
			setRequested(false);
			setPulling(false);
		}
	}, [refreshing]);
	return {
		onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => {
			setPulling(event.nativeEvent.contentOffset.y < -12);
		},
		indicator:
			pulling || (requested && refreshing) ? (
				<RefreshDots refreshing={requested && refreshing} />
			) : null,
		control: (
			<RefreshControl
				refreshing={requested && refreshing}
				tintColor="transparent"
				colors={["transparent"]}
				progressBackgroundColor="transparent"
				style={s.nativeControl}
				onRefresh={() => {
					if (refreshing) return;
					setRequested(true);
					if (Platform.OS !== "web")
						Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(
							() => {},
						);
					onRefresh();
				}}
			/>
		),
	};
}
const s = StyleSheet.create({
	indicator: {
		position: "absolute",
		top: 0,
		left: 0,
		right: 0,
		height: 52,
		alignItems: "center",
		justifyContent: "center",
		zIndex: 1,
	},
	dots: { flexDirection: "row", gap: 6, alignItems: "center" },
	dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#e90087" },
	nativeControl: { elevation: 0 },
});
