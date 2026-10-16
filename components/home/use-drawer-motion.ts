import { useCallback, useEffect, useRef } from "react";
import {
	Animated,
	Platform,
	useWindowDimensions,
	type GestureResponderEvent,
} from "react-native";

// Shared by job briefs and profile editors so animation and drag behavior stay identical.
export function useDrawerMotion({
	closing,
	onClose,
	onClosed,
	disabled = false,
}: {
	closing: boolean;
	onClose: () => void;
	onClosed: () => void;
	disabled?: boolean;
}) {
	const latest = useRef({ onClose, onClosed });
	latest.current = { onClose, onClosed };
	const { height } = useWindowDimensions();
	const translateY = useRef(new Animated.Value(height)).current;
	const position = useRef(height);
	const dragStart = useRef({ y: 0, offset: 0 });
	const touchStart = useRef({ x: 0, y: 0 });
	const samples = useRef<{ y: number; time: number }[]>([]);
	const dragging = useRef(false);
	const dismissThreshold = Math.min(180, height * 0.22);
	const springTo = useCallback(
		(toValue: number, done?: () => void) => {
			const animation = Animated.spring(translateY, {
				toValue,
				stiffness: 260,
				damping: 28,
				mass: 1,
				restDisplacementThreshold: 0.5,
				restSpeedThreshold: 0.5,
				useNativeDriver: Platform.OS !== "web",
			});
			animation.start(({ finished }) => {
				if (finished) done?.();
			});
			return animation;
		},
		[translateY],
	);
	useEffect(() => {
		const listener = translateY.addListener(({ value }) => {
			position.current = value;
		});
		return () => translateY.removeListener(listener);
	}, [translateY]);
	useEffect(() => {
		dragging.current = false;
		const animation = springTo(
			closing ? height : 0,
			closing ? () => latest.current.onClosed() : undefined,
		);
		return () => {
			animation.stop();
			translateY.stopAnimation();
		};
	}, [closing, height, springTo, translateY]);
	function moveDrag(pageY: number) {
		if (!dragging.current || closing || disabled) return;
		const now = Date.now();
		samples.current = [
			...samples.current.filter((sample) => now - sample.time <= 100),
			{ y: pageY, time: now },
		];
		translateY.setValue(
			Math.max(
				0,
				Math.min(
					height,
					dragStart.current.offset + pageY - dragStart.current.y,
				),
			),
		);
	}
	function endDrag(pageY: number, cancelled = false) {
		if (!dragging.current) return;
		dragging.current = false;
		const distance = pageY - dragStart.current.y;
		const offset = Math.max(0, dragStart.current.offset + distance);
		const now = Date.now();
		const recent = samples.current.filter((sample) => now - sample.time <= 100);
		const first = recent[0];
		const velocity =
			first && now > first.time ? (pageY - first.y) / (now - first.time) : 0;
		if (
			!cancelled &&
			(offset >= dismissThreshold || (distance > 16 && velocity > 0.7))
		)
			latest.current.onClose();
		else springTo(0);
	}

	return {
		height,
		translateY,
		springBack: () => springTo(0),
		backdropOpacity: translateY.interpolate({
			inputRange: [0, height],
			outputRange: [1, 0],
			extrapolate: "clamp",
		}),
		dragHandlers: {
			onStartShouldSetResponderCapture: (event: GestureResponderEvent) => {
				touchStart.current = {
					x: event.nativeEvent.pageX,
					y: event.nativeEvent.pageY,
				};
				return false;
			},
			onStartShouldSetResponder: () => !closing && !disabled,
			onMoveShouldSetResponderCapture: (event: GestureResponderEvent) => {
				if (dragging.current || closing || disabled) return false;
				const dy = event.nativeEvent.pageY - touchStart.current.y;
				const dx = event.nativeEvent.pageX - touchStart.current.x;
				return Math.abs(dy) > 6 && Math.abs(dy) > Math.abs(dx);
			},
			onResponderGrant: () => {
				dragging.current = true;
				dragStart.current = {
					y: touchStart.current.y,
					offset: position.current,
				};
				samples.current = [{ y: touchStart.current.y, time: Date.now() }];
				translateY.stopAnimation((value) => {
					if (dragging.current) dragStart.current.offset = value;
				});
			},
			onResponderMove: (event: GestureResponderEvent) =>
				moveDrag(event.nativeEvent.pageY),
			onResponderRelease: (event: GestureResponderEvent) =>
				endDrag(event.nativeEvent.pageY),
			onResponderTerminate: (event: GestureResponderEvent) =>
				endDrag(event.nativeEvent.pageY, true),
			onResponderTerminationRequest: () => false,
		},
	};
}
