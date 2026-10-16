import { forwardRef, useImperativeHandle, useRef, useState } from "react";
import { Platform, Text, View } from "react-native";
import Svg, { Path, Rect, Text as SvgText } from "react-native-svg";

import { Button, Input, Tabs, s } from "./ui";
export type SignatureHandle = {
	capture: () => Promise<{
		signatureDataUrl: string;
		signatureInputMethod: "drawn" | "typed_name";
		typedName?: string;
	}>;
};
export const Signature = forwardRef<
	SignatureHandle,
	{ typedOnly: boolean; disabled: boolean }
>(function Signature({ typedOnly, disabled }, ref) {
	const [mode, setMode] = useState("Type name");
	const [name, setName] = useState("");
	const [paths, setPaths] = useState<string[]>([]);
	const active = useRef("");
	const svg = useRef<Svg>(null);
	const width = useRef(300);
	useImperativeHandle(
		ref,
		() => ({
			capture: async () => {
				if (mode === "Type name" && name.trim().length < 2)
					throw new Error("Enter your full name.");
				if (mode === "Draw" && !paths.length)
					throw new Error("Draw your signature.");
				const data = await new Promise<string>((resolve, reject) => {
					const timer = setTimeout(
						() =>
							reject(
								new Error(
									"Unable to capture your signature. Please try again.",
								),
							),
						5000,
					);
					try {
						svg.current?.toDataURL(
							(value) => {
								clearTimeout(timer);
								resolve(value);
							},
							{ width: 600, height: 240 },
						);
					} catch (error) {
						clearTimeout(timer);
						reject(error);
					}
				});
				return {
					signatureDataUrl: `data:image/png;base64,${data}`,
					signatureInputMethod: mode === "Draw" ? "drawn" : "typed_name",
					...(mode === "Type name" ? { typedName: name.trim() } : {}),
				};
			},
		}),
		[mode, name, paths],
	);
	return (
		<View style={{ gap: 12 }}>
			{!typedOnly ? (
				<Tabs
					value={mode}
					options={["Type name", "Draw"]}
					onChange={(v) => {
						if (!disabled) setMode(v);
					}}
				/>
			) : null}
			{mode === "Type name" ? (
				<Input
					title="Full name for signature"
					value={name}
					onChangeText={setName}
					editable={!disabled}
				/>
			) : (
				<Text style={s.muted}>Draw your signature below.</Text>
			)}
			<View
				onLayout={(e) => {
					width.current = e.nativeEvent.layout.width;
				}}
				style={{
					height: 120,
					borderWidth: 1,
					borderColor: "#d8e1eb",
					borderRadius: 12,
					overflow: "hidden",
				}}
				onStartShouldSetResponder={() => mode === "Draw" && !disabled}
				onMoveShouldSetResponder={() => mode === "Draw" && !disabled}
				onResponderGrant={(e) => {
					active.current = `M ${(e.nativeEvent.locationX * 600) / width.current} ${e.nativeEvent.locationY * 2}`;
					setPaths((p) => [...p, active.current]);
				}}
				onResponderMove={(e) => {
					active.current += ` L ${(e.nativeEvent.locationX * 600) / width.current} ${e.nativeEvent.locationY * 2}`;
					setPaths((p) => [...p.slice(0, -1), active.current]);
				}}
			>
				<Svg ref={svg} width="100%" height="100%" viewBox="0 0 600 240">
					<Rect width="600" height="240" fill="white" />
					{mode === "Type name" ? (
						<SvgText
							x="24"
							y="140"
							fill="#10213b"
							fontFamily={Platform.OS === "ios" ? "Georgia" : "serif"}
							fontSize="38"
						>
							{name.trim()}
						</SvgText>
					) : (
						paths.map((d, i) => (
							<Path
								key={i}
								d={d}
								stroke="#10213b"
								strokeWidth={4}
								strokeLinecap="round"
								fill="none"
							/>
						))
					)}
				</Svg>
			</View>
			{mode === "Draw" ? (
				<Button
					title="Clear signature"
					secondary
					disabled={disabled}
					onPress={() => setPaths([])}
				/>
			) : null}
		</View>
	);
});
